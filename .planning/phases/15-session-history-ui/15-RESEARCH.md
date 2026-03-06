# Phase 15: Session History UI - Research

**Researched:** 2026-03-06
**Domain:** Chrome extension popup UI, chrome.storage.local, session data rendering
**Confidence:** HIGH

## Summary

Phase 15 adds a browsable session history list to the popup, enabling users to load past sessions and perform all existing export/AI actions on them. The entire implementation is popup-side UI work with chrome.storage.local reads and writes -- no new background script logic, no new content script logic, no new libraries.

The core technical challenge is managing two "modes" in the popup: live session vs. historical session. The popup already has a clean pattern of caching data in `cachedData` and re-rendering all sections when it changes. Loading a historical session means swapping `cachedData` with a `SessionSnapshot` (which is type-compatible with `SessionData` minus `raw_api_data`), re-rendering, and tracking a boolean flag to show the "viewing historical" banner. All export paths (CSV, TSV, AI) already operate on `cachedData`, so they work automatically once the swap happens.

**Primary recommendation:** Implement history as a thin UI layer on top of existing rendering and export infrastructure. Add `deleteSessionFromHistory()` and `clearAllHistory()` functions to `history.ts`, build the list/banner HTML in `popup.html`, and wire up event handlers in `popup.ts`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Collapsible `<details>/<summary>` section in the popup, positioned after AI section, before Clear Session Data button
- Max-height with internal scroll (~200px) to prevent hitting Chrome's 600px popup height limit
- Hidden entirely when zero saved sessions exist
- Summary label: "Session History"
- Clicking a session row loads its data into cachedData, updating shot count, stat card, and enabling export/AI buttons
- A persistent banner appears at top: "Viewing: [date] session [x]" with dismiss button
- Clicking dismiss or closing/reopening the popup restores the live session
- Clear Session Data button is hidden while viewing a historical session
- If DATA_UPDATED fires while viewing a historical session, auto-switch to the new live session
- Single-line rows: date, shot count, clubs used
- Date format: relative for recent ("Today", "Yesterday"), then short date ("Mar 5") for older
- Club list truncated to first 3 clubs, then "+N more" for sessions with 6+ clubs
- Whole row is clickable (cursor: pointer) to load that session
- Trash icon on the right side of each session row for individual delete
- No confirmation for individual delete
- "Clear All History" text button at the bottom of the history list, inside the collapsible section
- Clear All requires browser confirm() dialog: "Delete all saved sessions? This cannot be undone."

### Claude's Discretion
- Exact CSS styling for history rows, banner, and scroll container
- How to implement the "viewing historical session" state in popup.ts (flag variable, separate render path, etc.)
- Whether delete operations use chrome.storage.local.set or a dedicated history module function
- Toast feedback wording on individual delete (if any)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| HIST-03 | User can browse a list of saved sessions showing date, shot count, and clubs used | History list rendering from `SESSION_HISTORY` storage key; `HistoryEntry.snapshot` has `club_groups` for shot count and club names |
| HIST-04 | User can load a past session and re-export it as CSV | Swap `cachedData` with snapshot; existing `EXPORT_CSV_REQUEST` handler reads from `TRACKMAN_DATA` storage -- need to either temporarily write snapshot there or add a new message type that accepts inline data |
| HIST-05 | User can load a past session and copy it as TSV to clipboard | TSV copy handler already uses `cachedData` directly in popup.ts -- works automatically after cachedData swap |
| HIST-06 | User can load a past session and send it to AI analysis | AI handlers (Open in AI, Copy Prompt + Data) already use `cachedData` directly -- works automatically after cachedData swap |
| HIST-08 | User can delete individual sessions from history | Remove entry from `SESSION_HISTORY` array by index or report_id, write back to storage |
| HIST-09 | User can clear all session history | Set `SESSION_HISTORY` to empty array in storage |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| chrome.storage.local | MV3 | Read/write session history | Already used for all storage; `SESSION_HISTORY` key already exists |
| TypeScript | Project standard | Type safety | Project convention |

### Supporting
No new libraries needed. All functionality is built on existing popup infrastructure.

## Architecture Patterns

### Critical Design Decision: CSV Export Path

The current `EXPORT_CSV_REQUEST` handler in `serviceWorker.ts` reads data from `chrome.storage.local[TRACKMAN_DATA]`. When viewing a historical session, `cachedData` holds the snapshot but `TRACKMAN_DATA` still holds the live session.

**Two approaches:**

1. **Temporarily write snapshot to TRACKMAN_DATA** -- Simple but risks data corruption if popup closes mid-operation. Also creates a confusing side effect where "Clear Session Data" would clear the historical data that was temporarily stored.

2. **Add EXPORT_CSV_FROM_DATA message type** (recommended) -- Send the session data inline with the export request. The service worker generates CSV from the provided data instead of reading storage. This is clean, stateless, and avoids any storage mutation.

**Recommendation:** Add a new `EXPORT_CSV_FROM_DATA` message type that accepts `SessionData` inline. The popup sends this when `cachedData` is a historical snapshot. For live sessions, the existing `EXPORT_CSV_REQUEST` continues to work as-is.

**Alternative (simpler):** Since `writeCsv()` is a pure function importable from `shared/csv_writer.ts`, the popup could generate the CSV directly and trigger the download via a data URL blob. However, `chrome.downloads.download()` requires the background service worker context. So the message-passing approach is necessary.

**Simplest viable approach:** Have the popup always send data inline via a unified message. Or, more conservatively, keep the existing path for live and add the inline path for historical only.

### Recommended State Management

```typescript
// popup.ts -- new state variables
let viewingHistoricalSession: boolean = false;
let liveSessionData: SessionData | null = null;  // stashed live data

// When loading historical session:
liveSessionData = cachedData;       // stash live
cachedData = snapshot as SessionData; // swap in historical (type-compatible)
viewingHistoricalSession = true;
// re-render everything: updateShotCount, updateExportButtonVisibility, renderStatCard, updatePreview
// show banner, hide Clear Session Data button

// When dismissing or DATA_UPDATED:
cachedData = liveSessionData;       // restore live
liveSessionData = null;
viewingHistoricalSession = false;
// re-render everything, hide banner, show Clear Session Data button
```

### SessionSnapshot vs SessionData Type Compatibility

`SessionSnapshot = Omit<SessionData, 'raw_api_data'>`. Since `raw_api_data` is optional (`raw_api_data?: unknown`) in `SessionData`, a `SessionSnapshot` object satisfies the `SessionData` type. All rendering and export functions that take `SessionData` will accept a snapshot without casting -- the `raw_api_data` field will simply be `undefined`.

**Verification:** `writeCsv()` never reads `raw_api_data`. `writeTsv()` never reads `raw_api_data`. `assemblePrompt()` never reads `raw_api_data`. `computeClubAverage()` only reads `shots[].metrics`. All safe.

### History List Rendering

```typescript
function renderHistoryList(entries: HistoryEntry[]): void {
  const container = document.getElementById("history-list-content");
  const section = document.getElementById("history-section");
  if (!container || !section) return;

  section.style.display = entries.length > 0 ? "" : "none";
  if (entries.length === 0) return;

  let html = "";
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const dateStr = formatRelativeDate(entry.captured_at);
    const shotCount = countSnapshotShots(entry.snapshot);
    const clubSummary = formatClubSummary(entry.snapshot.club_groups);
    html += `<div class="history-row" data-index="${i}">
      <span class="history-info">${dateStr} -- ${shotCount} shots -- ${clubSummary}</span>
      <button class="history-delete-btn" data-index="${i}" title="Delete session">&#128465;</button>
    </div>`;
  }
  html += `<button id="clear-all-history-btn" class="history-clear-all">Clear All History</button>`;
  container.innerHTML = html;
}
```

### Date Formatting Logic

```typescript
function formatRelativeDate(timestamp: number): string {
  const now = new Date();
  const date = new Date(timestamp);

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86400000;

  if (timestamp >= todayStart) return "Today";
  if (timestamp >= yesterdayStart) return "Yesterday";

  // Short date: "Mar 5"
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
```

### Club Summary Formatting

```typescript
function formatClubSummary(clubGroups: ClubGroup[]): string {
  const names = clubGroups.map(c => c.club_name);
  if (names.length <= 3) return names.join(", ");
  return names.slice(0, 3).join(", ") + ` +${names.length - 3} more`;
}
```

Note: The CONTEXT.md says "+N more" for sessions with 6+ clubs, but the truncation at 3 clubs with "+N more" suffix applies regardless of total count when > 3. The 6+ threshold in the context appears to be an example, not a hard rule -- the actual rule is "first 3 clubs, then +N more."

### HTML Structure

```html
<!-- After AI section, before clear-btn -->
<details id="history-section" style="display:none;">
  <summary>Session History</summary>
  <div id="history-list-content" style="max-height: 200px; overflow-y: auto;">
    <!-- Rendered dynamically -->
  </div>
</details>

<!-- Banner at top of body (hidden by default) -->
<div id="history-banner" style="display:none;">
  <span id="history-banner-text"></span>
  <button id="history-banner-dismiss" title="Return to live session">&times;</button>
</div>
```

### Anti-Patterns to Avoid
- **Mutating TRACKMAN_DATA storage for historical sessions:** This creates race conditions and confuses the Clear Session Data flow. Keep storage as source of truth for the live session only.
- **Deep-cloning snapshots before rendering:** `SessionSnapshot` objects are read-only for rendering purposes. No need to clone.
- **Using setTimeout for list refresh after delete:** Use the synchronous callback from `chrome.storage.local.set` to re-render immediately.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date formatting | Custom month name arrays | `toLocaleDateString("en-US", { month: "short", day: "numeric" })` | Handles locale edge cases |
| Shot counting | Manual loop over club_groups | Reuse pattern from `countSessionShots()` in prompt_builder.ts | Already exists, consistent |
| Toast notifications | New notification system | Existing `showToast()` in popup.ts | Already styled, animated, accessible |

## Common Pitfalls

### Pitfall 1: EXPORT_CSV_REQUEST reads from storage, not cachedData
**What goes wrong:** User loads historical session, clicks Export CSV, gets the live session's CSV instead of the historical one.
**Why it happens:** The background service worker reads `TRACKMAN_DATA` from storage, which is always the live session.
**How to avoid:** Either (a) add `EXPORT_CSV_FROM_DATA` message type that accepts data inline, or (b) generate CSV in popup and send a download-only message.
**Warning signs:** CSV export works for live session but exports wrong data for historical sessions.

### Pitfall 2: Popup height exceeding 600px Chrome limit
**What goes wrong:** Chrome clips the popup, content becomes inaccessible.
**Why it happens:** History list adds vertical height to an already tall popup.
**How to avoid:** Use `max-height: 200px; overflow-y: auto` on the history list content container. Keep the `<details>` collapsed by default.
**Warning signs:** Scroll bar not visible, bottom buttons cut off.

### Pitfall 3: Stale history list after DATA_UPDATED
**What goes wrong:** New session saved in background, but history list in popup still shows old entries.
**Why it happens:** `DATA_UPDATED` listener updates `cachedData` but doesn't refresh the history list.
**How to avoid:** Re-read `SESSION_HISTORY` from storage and re-render the history list inside the `DATA_UPDATED` handler.
**Warning signs:** History list doesn't show "Today" entry for current session until popup is reopened.

### Pitfall 4: Event delegation vs. per-row handlers
**What goes wrong:** Delete button click also triggers the row click (loads the session).
**Why it happens:** Click event bubbles from delete button to parent row.
**How to avoid:** Use `event.stopPropagation()` on delete button handlers, or use event delegation on the container and check `event.target` for the delete button class.
**Warning signs:** Clicking delete loads the session and then deletes it.

### Pitfall 5: SessionSnapshot missing raw_api_data field
**What goes wrong:** Code that checks `if (cachedData.raw_api_data)` behaves differently for snapshots.
**Why it happens:** Snapshots omit `raw_api_data` entirely.
**How to avoid:** Verified that no rendering or export code checks `raw_api_data`. The field is only used for debugging. Safe to ignore.
**Warning signs:** None expected -- this is a non-issue after verification.

## Code Examples

### History Module Functions to Add

```typescript
// src/shared/history.ts -- new exports

/** Delete a single session from history by report_id. */
export function deleteSessionFromHistory(reportId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(
      [STORAGE_KEYS.SESSION_HISTORY],
      (result: Record<string, unknown>) => {
        if (chrome.runtime.lastError) {
          return reject(new Error(chrome.runtime.lastError.message));
        }
        const existing = (result[STORAGE_KEYS.SESSION_HISTORY] as HistoryEntry[] | undefined) ?? [];
        const filtered = existing.filter(
          (entry) => entry.snapshot.report_id !== reportId
        );
        chrome.storage.local.set(
          { [STORAGE_KEYS.SESSION_HISTORY]: filtered },
          () => {
            if (chrome.runtime.lastError) {
              return reject(new Error(chrome.runtime.lastError.message));
            }
            resolve();
          }
        );
      }
    );
  });
}

/** Clear all session history. */
export function clearAllHistory(): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(
      { [STORAGE_KEYS.SESSION_HISTORY]: [] },
      () => {
        if (chrome.runtime.lastError) {
          return reject(new Error(chrome.runtime.lastError.message));
        }
        resolve();
      }
    );
  });
}
```

### Loading a Historical Session

```typescript
// popup.ts -- inside click handler for history row
async function loadHistoricalSession(entry: HistoryEntry): void {
  liveSessionData = cachedData;
  cachedData = entry.snapshot as SessionData;
  viewingHistoricalSession = true;

  const dateStr = formatRelativeDate(entry.captured_at);
  const shotCount = countSnapshotShots(entry.snapshot);
  showHistoryBanner(`Viewing: ${dateStr} session (${shotCount} shots)`);

  updateShotCount(cachedData);
  updateExportButtonVisibility(cachedData);
  renderStatCard();
  updatePreview();

  // Hide Clear Session Data button while viewing historical
  const clearBtn = document.getElementById("clear-btn");
  if (clearBtn) clearBtn.style.display = "none";
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No session persistence | Sessions saved to history on capture (Phase 14) | 2026-03-06 | History entries now available in `SESSION_HISTORY` storage key |
| Single cachedData source | Need dual-mode: live vs. historical | Phase 15 | Popup must track which mode it's in |

## Open Questions

1. **Should CSV export for historical sessions use a new message type or reuse existing?**
   - What we know: Current `EXPORT_CSV_REQUEST` reads from storage. Historical data is only in `cachedData`.
   - What's unclear: Whether adding a new message type is cleaner than modifying the existing one.
   - Recommendation: Add `EXPORT_CSV_FROM_DATA` message type. Keep existing path unchanged for live sessions. This avoids any risk to the working export flow.

2. **Should the trash icon be a Unicode character or an SVG?**
   - What we know: The settings gear icon uses Unicode (&#9881;). Consistent approach would use Unicode trash (&#128465; or &#x1F5D1;).
   - Recommendation: Use Unicode wastebasket character (&#128465;) styled with the existing `.icon-btn` class for consistency.

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
| HIST-03 | History list renders entries with date, shot count, clubs | unit | `npx vitest run tests/test_history_ui.ts -t "renders history list"` | No -- Wave 0 |
| HIST-04 | Load historical session, export CSV matches format | unit | `npx vitest run tests/test_history_ui.ts -t "export csv"` | No -- Wave 0 |
| HIST-05 | Load historical session, TSV copy uses snapshot data | unit | `npx vitest run tests/test_history_ui.ts -t "tsv copy"` | No -- Wave 0 |
| HIST-06 | Load historical session, AI prompt uses snapshot data | unit | `npx vitest run tests/test_history_ui.ts -t "ai prompt"` | No -- Wave 0 |
| HIST-08 | Delete individual session removes from storage | unit | `npx vitest run tests/test_history.ts -t "delete"` | No -- Wave 0 |
| HIST-09 | Clear all history empties storage | unit | `npx vitest run tests/test_history.ts -t "clear"` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/test_history.ts` -- add tests for `deleteSessionFromHistory()` and `clearAllHistory()`
- [ ] `tests/test_history_ui.ts` -- new file for history list rendering, date formatting, club summary formatting
- [ ] Date formatting helper: `formatRelativeDate()` -- pure function, easily testable
- [ ] Club summary helper: `formatClubSummary()` -- pure function, easily testable

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection: `popup.html`, `popup.ts`, `history.ts`, `types.ts`, `constants.ts`, `csv_writer.ts`, `serviceWorker.ts`
- Existing test patterns: `tests/test_history.ts`, `vitest.config.ts`
- Phase 14 implementation: `saveSessionToHistory()`, `HistoryEntry` type, `SessionSnapshot` type

### Secondary (MEDIUM confidence)
- Chrome extension popup height limit (600px) -- documented in STATE.md as a known concern

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new dependencies, all existing infrastructure
- Architecture: HIGH - direct inspection of all integration points, type compatibility verified
- Pitfalls: HIGH - identified through tracing actual code paths (especially EXPORT_CSV_REQUEST reading from storage)

**Research date:** 2026-03-06
**Valid until:** 2026-04-06 (stable -- all internal codebase patterns)
