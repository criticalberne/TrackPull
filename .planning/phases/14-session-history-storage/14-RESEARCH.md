# Phase 14: Session History Storage - Research

**Researched:** 2026-03-05
**Domain:** Chrome Extension Storage (chrome.storage.local), Service Worker Data Persistence
**Confidence:** HIGH

## Summary

Phase 14 adds automatic session history persistence to chrome.storage.local. The extension already uses chrome.storage.local extensively for session data (`TRACKMAN_DATA`), unit preferences, and prompt selections, so this phase extends an established pattern rather than introducing new technology. The core work is: (1) define a `SessionSnapshot` type that strips `raw_api_data`, (2) add a history save step after the existing `SAVE_DATA` handler succeeds, (3) implement deduplication by `report_id` and 20-session rolling eviction by `captured_at`, and (4) send error messages to the popup for toast display on failure.

The existing codebase already has a toast system (`showToast()` in popup.ts, CSS in popup.html, `#toast-container` element), a `chrome.runtime.sendMessage` pattern for service-worker-to-popup communication, and an error-mapping pattern (`getDownloadErrorMessage()`). All of these are directly reusable.

**Primary recommendation:** Create a dedicated `src/shared/history.ts` module containing the history save logic (snapshot creation, deduplication, eviction, error mapping). Keep the service worker handler thin -- it calls the history module after the primary `TRACKMAN_DATA` write succeeds.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Deduplication key: `report_id` only -- same report_id = same session regardless of url_type or date
- On duplicate: full replace (overwrite stored snapshot with new capture entirely)
- Eviction ordering: by `captured_at` timestamp -- oldest captured session is evicted first
- Re-capture of existing report_id refreshes `captured_at` (bumps to newest position, won't be evicted soon)
- Single array key in chrome.storage.local (e.g., `sessionHistory`) holding all snapshots
- Entire array read/written on each save operation
- Wrapper metadata: `captured_at` timestamp only -- report_id and date already live on SessionData
- `SessionSnapshot` type defined as `Omit<SessionData, 'raw_api_data'>` in `src/models/types.ts` alongside SessionData
- History storage key added to existing `STORAGE_KEYS` constant in `src/shared/constants.ts`
- Hook into existing `SAVE_DATA` handler in serviceWorker.ts -- after TRACKMAN_DATA write succeeds, save to history
- History save happens after (not in parallel with) the primary TRACKMAN_DATA write
- Every SAVE_DATA call updates history (multi-page merges naturally overwrite same report_id; final merged result wins)
- No user feedback on successful save -- history just works silently in the background
- History failure never blocks the primary session flow -- graceful degradation
- On storage write failure: send a message to popup; if popup is open, show a red-tinted toast bar
- Toast auto-dismisses after 5 seconds
- Error messages are specific (map chrome.runtime.lastError to user-friendly text)
- If popup is closed when error occurs: log to console only

### Claude's Discretion
- Exact toast CSS styling and positioning within popup
- Whether to create a dedicated history module (src/shared/history.ts) or keep logic in serviceWorker.ts
- Array sorting/insertion strategy for the history array
- How to strip raw_api_data (shallow copy vs. destructure)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| HIST-01 | Sessions are automatically saved to local storage when captured from a Trackman report | Hook into SAVE_DATA handler after TRACKMAN_DATA write succeeds; save SessionSnapshot to `sessionHistory` array |
| HIST-02 | Duplicate sessions (same report_id) update in place rather than creating new entries | Find-by-report_id in history array, replace entry and refresh captured_at; if not found, append |
| HIST-07 | Oldest sessions are evicted when storage cap is reached (20 sessions max) | Sort by captured_at, slice to keep newest 20 before writing back |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| chrome.storage.local | MV3 | Persistent key-value storage | Already used throughout the extension; 10 MB quota (MV3 default) |
| chrome.runtime.sendMessage | MV3 | Service worker to popup messaging | Already used for DATA_UPDATED broadcasts |
| chrome.runtime.lastError | MV3 | Error detection on storage writes | Already used in SAVE_DATA handler |

### Supporting
No additional libraries needed. This phase uses only Chrome Extension APIs already in use.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Single array key | Individual keys per session | Individual keys avoid read-all-write-all but complicate eviction ordering and require key enumeration; single array is simpler for 20 items |
| chrome.storage.local | IndexedDB | IndexedDB offers more storage but adds complexity; 20 sessions at ~90 KB each = ~1.8 MB is well within 10 MB local quota |

## Architecture Patterns

### Recommended Project Structure
```
src/
  shared/
    history.ts         # NEW: saveSessionToHistory(), getHistoryErrorMessage()
  models/
    types.ts           # MODIFY: add SessionSnapshot, HistoryEntry types
  shared/
    constants.ts       # MODIFY: add SESSION_HISTORY to STORAGE_KEYS
  background/
    serviceWorker.ts   # MODIFY: call saveSessionToHistory() after SAVE_DATA succeeds
  popup/
    popup.ts           # MODIFY: add listener for HISTORY_ERROR messages, show toast
```

### Pattern 1: Dedicated History Module
**What:** Extract history logic into `src/shared/history.ts` to keep serviceWorker.ts thin.
**When to use:** Always -- the history logic (snapshot creation, dedup, eviction, error mapping) is ~50-70 lines and has clear boundaries.
**Example:**
```typescript
// src/shared/history.ts
import { STORAGE_KEYS } from "./constants";
import type { SessionData } from "../models/types";
import type { SessionSnapshot, HistoryEntry } from "../models/types";

const MAX_SESSIONS = 20;

function createSnapshot(session: SessionData): SessionSnapshot {
  const { raw_api_data, ...snapshot } = session;
  return snapshot;
}

export function saveSessionToHistory(session: SessionData): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([STORAGE_KEYS.SESSION_HISTORY], (result) => {
      const history: HistoryEntry[] = result[STORAGE_KEYS.SESSION_HISTORY] || [];
      const snapshot = createSnapshot(session);
      const now = Date.now();

      // Dedup: find existing entry by report_id
      const existingIndex = history.findIndex(
        (entry) => entry.snapshot.report_id === session.report_id
      );

      const entry: HistoryEntry = { captured_at: now, snapshot };

      if (existingIndex >= 0) {
        history[existingIndex] = entry; // full replace
      } else {
        history.push(entry);
      }

      // Sort newest first, then evict beyond cap
      history.sort((a, b) => b.captured_at - a.captured_at);
      const trimmed = history.slice(0, MAX_SESSIONS);

      chrome.storage.local.set(
        { [STORAGE_KEYS.SESSION_HISTORY]: trimmed },
        () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        }
      );
    });
  });
}

export function getHistoryErrorMessage(error: string): string {
  if (error.includes("QUOTA_BYTES") || error.includes("quota")) {
    return "Storage full -- oldest sessions will be cleared";
  }
  return "Could not save to session history";
}
```

### Pattern 2: Service Worker Integration Point
**What:** Call history save in the SAVE_DATA handler's success callback.
**When to use:** The history save must happen after TRACKMAN_DATA write succeeds, never in parallel.
**Example:**
```typescript
// In serviceWorker.ts SAVE_DATA handler, after the success branch:
if (message.type === "SAVE_DATA") {
  const sessionData = (message as SaveDataRequest).data;
  chrome.storage.local.set({ [STORAGE_KEYS.TRACKMAN_DATA]: sessionData }, () => {
    if (chrome.runtime.lastError) {
      sendResponse({ success: false, error: chrome.runtime.lastError.message });
    } else {
      sendResponse({ success: true });
      // History save -- fire and forget, never blocks primary flow
      saveSessionToHistory(sessionData).catch((err) => {
        console.error("TrackPull: History save failed:", err);
        const msg = getHistoryErrorMessage(err.message);
        chrome.runtime.sendMessage({ type: "HISTORY_ERROR", error: msg }).catch(() => {
          // Popup not open -- already logged to console
        });
      });
    }
  });
  return true;
}
```

### Pattern 3: Popup Error Listener
**What:** Listen for `HISTORY_ERROR` messages and display a toast.
**When to use:** Popup already has an `onMessage` listener for `DATA_UPDATED`; extend it.
**Example:**
```typescript
// In popup.ts onMessage listener:
if (message.type === 'HISTORY_ERROR') {
  showToast(message.error as string, "error");
}
```

### Anti-Patterns to Avoid
- **Parallel writes:** Never write to `sessionHistory` in parallel with `TRACKMAN_DATA`. The CONTEXT.md explicitly requires sequential writes.
- **Blocking primary flow:** Never let a history write failure propagate to the `sendResponse`. The primary SAVE_DATA response must already be sent before history save starts.
- **Storing raw_api_data:** A single session with raw payload can reach 700+ KB. The `SessionSnapshot` type explicitly excludes it via `Omit<SessionData, 'raw_api_data'>`.
- **Manual JSON serialization:** chrome.storage.local handles serialization automatically. Do not JSON.stringify/parse manually.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Storage serialization | Custom JSON encode/decode | chrome.storage.local (built-in structured clone) | Chrome handles serialization; manual JSON adds bugs |
| Toast notifications | New toast system | Existing `showToast()` in popup.ts | Already has CSS, animations, auto-dismiss, error/success types |
| Error message mapping | Ad-hoc error strings | Pattern from `getDownloadErrorMessage()` | Consistent UX; centralized error text |
| Service worker messaging | Custom messaging protocol | Existing `chrome.runtime.sendMessage` pattern | Already used for `DATA_UPDATED` broadcasts |

**Key insight:** This phase reuses four existing patterns (storage writes, messaging, toast, error mapping). The only new code is the history-specific logic (snapshot, dedup, eviction).

## Common Pitfalls

### Pitfall 1: Race Condition on Concurrent SAVE_DATA Calls
**What goes wrong:** Multi-page merges send multiple SAVE_DATA messages in quick succession. If two history saves overlap (read-modify-write), one can overwrite the other's changes.
**Why it happens:** The history array is read, modified, then written back. Two concurrent reads see the same array state.
**How to avoid:** Since each SAVE_DATA for the same report_id replaces the entry anyway, and the CONTEXT.md says "final merged result wins," the natural ordering of the chrome.storage.local callback queue prevents true data loss. The last write wins, which is the desired behavior. No explicit lock needed for 20-item arrays.
**Warning signs:** Lost history entries after multi-page captures.

### Pitfall 2: sendResponse Timing with Async History Save
**What goes wrong:** Calling `sendResponse` after an async history save causes "The message port closed before a response was received" errors.
**Why it happens:** The SAVE_DATA handler must return `true` to keep the message channel open, but if `sendResponse` is called after the history save (which is async), the channel may have already closed.
**How to avoid:** Call `sendResponse({ success: true })` immediately after the primary TRACKMAN_DATA write succeeds, BEFORE starting the history save. The history save is fire-and-forget from the SAVE_DATA handler's perspective.
**Warning signs:** Console errors about closed message ports.

### Pitfall 3: Forgetting to Strip raw_api_data
**What goes wrong:** Storing full SessionData including `raw_api_data` (~700 KB per session) hits the 10 MB quota after ~14 sessions instead of the expected 20.
**Why it happens:** Passing `session` directly instead of creating a snapshot.
**How to avoid:** Use destructuring (`const { raw_api_data, ...snapshot } = session`) to create the snapshot. The TypeScript type system enforces this if `HistoryEntry.snapshot` is typed as `SessionSnapshot` (which is `Omit<SessionData, 'raw_api_data'>`).
**Warning signs:** Storage quota errors appearing much earlier than expected.

### Pitfall 4: Toast Not Showing Because Popup Is Closed
**What goes wrong:** `chrome.runtime.sendMessage` with `HISTORY_ERROR` type fails silently when popup is not open; developer thinks toast system is broken.
**Why it happens:** No popup listener exists when popup is closed. The `.catch(() => {})` pattern (already used for DATA_UPDATED) handles this correctly.
**How to avoid:** Already handled by design -- if popup is closed, log to console only. The `.catch()` on `sendMessage` prevents unhandled rejection errors.
**Warning signs:** No error feedback visible despite failed history saves; check service worker console for the `console.error` log.

## Code Examples

### Type Definitions
```typescript
// src/models/types.ts -- add after SessionData interface

/** SessionData without raw_api_data, for history storage efficiency */
export type SessionSnapshot = Omit<SessionData, 'raw_api_data'>;

/** Wrapper for a stored history entry */
export interface HistoryEntry {
  captured_at: number;  // Date.now() timestamp
  snapshot: SessionSnapshot;
}
```

### Storage Key Addition
```typescript
// src/shared/constants.ts -- add to STORAGE_KEYS object
export const STORAGE_KEYS = {
  TRACKMAN_DATA: "trackmanData",
  SPEED_UNIT: "speedUnit",
  DISTANCE_UNIT: "distanceUnit",
  SELECTED_PROMPT_ID: "selectedPromptId",
  AI_SERVICE: "aiService",
  HITTING_SURFACE: "hittingSurface",
  INCLUDE_AVERAGES: "includeAverages",
  SESSION_HISTORY: "sessionHistory",  // NEW
} as const;
```

### Stripping raw_api_data via Destructuring
```typescript
function createSnapshot(session: SessionData): SessionSnapshot {
  // Destructure to exclude raw_api_data; rest contains all other fields
  const { raw_api_data, ...snapshot } = session;
  return snapshot;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| chrome.storage.local 5 MB limit | 10 MB limit (QUOTA_BYTES = 10485760) | Chrome 114 | 20 sessions at ~90 KB = 1.8 MB is well within limit |
| Callback-only chrome.storage API | Callbacks still required in MV3 service workers | Current | Use callback style with Promise wrappers where convenient |

**Deprecated/outdated:**
- `chrome.storage.local` 5 MB limit is pre-Chrome 114. Current limit is 10 MB. The `unlimitedStorage` permission exists but is unnecessary for this use case.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 1.1.1 |
| Config file | vitest.config.ts |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HIST-01 | Session saved to history after capture | unit | `npx vitest run tests/test_history.ts -t "saves session"` | No -- Wave 0 |
| HIST-02 | Duplicate report_id updates in place | unit | `npx vitest run tests/test_history.ts -t "dedup"` | No -- Wave 0 |
| HIST-07 | Oldest session evicted at 20-session cap | unit | `npx vitest run tests/test_history.ts -t "evict"` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/test_history.ts` -- covers HIST-01, HIST-02, HIST-07 (snapshot creation, dedup logic, eviction logic)
- [ ] Chrome storage mock setup -- need to mock `chrome.storage.local.get/set` and `chrome.runtime.lastError` for unit tests

Note: The history module (`src/shared/history.ts`) can be tested by mocking chrome APIs. The core logic (dedup by report_id, sort by captured_at, slice to 20) is pure array manipulation once the chrome.storage read is mocked.

## Open Questions

1. **Error message text for quota exceeded**
   - What we know: `chrome.runtime.lastError.message` will contain something about quota/bytes when storage is full
   - What's unclear: The exact error string Chrome produces (may vary by Chrome version)
   - Recommendation: Check for substrings "QUOTA" or "quota" in the error message; provide a fallback generic message. Test with real Chrome if possible.

## Sources

### Primary (HIGH confidence)
- [Chrome Storage API docs](https://developer.chrome.com/docs/extensions/reference/api/storage) - QUOTA_BYTES = 10485760 (10 MB), lastError on quota exceeded
- Existing codebase: serviceWorker.ts, types.ts, constants.ts, popup.ts, popup.html -- all patterns verified by reading source

### Secondary (MEDIUM confidence)
- [MDN storage.local](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage/local) - cross-reference on storage behavior

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - uses only existing Chrome APIs already in the codebase
- Architecture: HIGH - all integration points verified by reading source code; patterns are direct extensions of existing code
- Pitfalls: HIGH - identified from code review and Chrome API documentation

**Research date:** 2026-03-05
**Valid until:** 2026-04-05 (stable Chrome APIs, unlikely to change)
