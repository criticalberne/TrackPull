# Pitfalls Research

**Domain:** Chrome Extension (MV3) — Session History, Cross-Session Comparison, Visual Stat Cards, Smart Prompt Matching
**Researched:** 2026-03-03
**Confidence:** HIGH for chrome.storage quota math (verified via official docs + empirical size estimates from actual SessionData shape); HIGH for MV3 service worker pitfalls (official docs verified); HIGH for popup UI constraints (Chromium source confirmed 800x600 cap); MEDIUM for session comparison UX patterns (reasoning from existing code + known domain patterns); MEDIUM for smart matching implementation risks (first-principles reasoning from codebase inspection)

---

## Critical Pitfalls

### Pitfall C1: raw_api_data Stored in Session History Blows Storage Quota

**What goes wrong:**
Each `SessionData` object has an optional `raw_api_data?: unknown` field that holds the raw Trackman API JSON payload. If session history is implemented by saving `SessionData` objects verbatim, this field is included in every stored session. A large Trackman session (14 clubs, 30 shots, 29 metrics) serializes to ~700 KB. With `raw_api_data` included, that climbs further. `chrome.storage.local` defaults to 10 MB (5 MB before Chrome 114). At 10 MB, the quota accommodates only ~14 large sessions before writes fail silently via `chrome.runtime.lastError`.

**Why it happens:**
The current flow saves the entire `SessionData` object to storage as-is. When session history is added, the naive approach is to push each captured session into a history array and store the array. This doubles storage consumption because `raw_api_data` is a second copy of the raw shot data alongside the already-parsed `club_groups`.

**How to avoid:**
Strip `raw_api_data` before saving to session history. Create a `SessionSnapshot` type derived from `SessionData` with `raw_api_data` omitted. Store only `SessionSnapshot` objects in history. Verify by calculating the serialized byte size of the snapshot before every write. Size estimates from this codebase's actual `SessionData` shape:

| Session Size | Typical (8 clubs, 15 shots, 15 metrics) | Large (14 clubs, 30 shots, 29 metrics) |
|---|---|---|
| With raw_api_data | ~108 KB | ~720+ KB |
| Without raw_api_data | ~89 KB | ~708 KB |
| Sessions before 10 MB limit (no raw_api_data) | ~112 typical | ~14 large |

Even without `raw_api_data`, large sessions constrain how many can be stored. Cap history at a reasonable count (10–20 sessions) and implement eviction (drop oldest when limit is reached).

**Warning signs:**
- History works for the first few sessions, then silently stops saving
- `chrome.runtime.lastError` is set but no visible error is surfaced to the user
- Session count does not increment after saves succeed

**Phase to address:**
Session history storage design phase — before implementing the history write path.

---

### Pitfall C2: Single Large History Array Exceeds chrome.storage.sync Per-Item Quota

**What goes wrong:**
`chrome.storage.sync` enforces an 8,192-byte per-item limit. If session history is accidentally stored in `chrome.storage.sync` (rather than `chrome.storage.local`) as a single array, any session exceeding 8 KB causes an immediate, silent write failure. A single typical session (~89 KB) is 10x this limit. The extension already uses sync for `customPrompt_*` keys, so there is a pattern precedent developers may incorrectly follow.

**Why it happens:**
The existing codebase mixes sync and local storage: unit preferences and AI service preference use `chrome.storage.local`, but custom prompts use `chrome.storage.sync`. A developer adding session history may look at `custom_prompts.ts` as a reference and accidentally copy the `.sync` storage pattern instead of `.local`.

**How to avoid:**
Session history belongs exclusively in `chrome.storage.local`. The session index (list of session IDs + metadata) can be a single key. Each full session snapshot stored under a separate key (e.g., `session_{id}`) — this mirrors the existing `customPrompt_{id}` pattern already used for custom prompts, which avoids the 8 KB per-item limit.

Storage layout for session history:

| Key | Store | Content |
|---|---|---|
| `sessionHistoryIndex` | local | `string[]` — ordered list of session IDs |
| `session_{id}` | local | `SessionSnapshot` — full data for one session |

**Warning signs:**
- Session saves appear to succeed but data is not retrievable
- `chrome.runtime.lastError: "QUOTA_BYTES_PER_ITEM quota exceeded"` visible in background console
- History works for small sessions but fails for full-bag sessions

**Phase to address:**
Session history storage design phase — storage key selection must be explicit and documented.

---

### Pitfall C3: Session Comparison Breaks When Clubs Don't Match Across Sessions

**What goes wrong:**
Session comparison computes delta columns between club averages. If session A has "7 Iron" and session B has "7-Iron" (with a hyphen), or session A has "7 Iron" and session B does not include that club at all, the comparison produces either wrong deltas or crashes attempting to access undefined averages.

**Why it happens:**
Club names come from the Trackman DOM (`CSS_CLUB_TAG = "group-tag"`). Trackman may render club names differently across report types (report vs. activity), or a user may hit different clubs across sessions. The comparison logic must reconcile club lists that are not identical.

**How to avoid:**
Normalize club names before comparison (trim whitespace, lowercase, collapse hyphens/spaces). Handle the missing-club case explicitly: if a club exists in one session but not the other, show the delta as "N/A" rather than 0 or undefined. Design the comparison UI to show a union of clubs from both sessions, with missing values clearly marked.

Test cases to write before implementing:
- Clubs with extra whitespace in names
- Clubs present in session A but absent in session B (and vice versa)
- Both sessions have the same clubs — standard delta case
- Both sessions have zero clubs in common — show "no comparable clubs" state

**Warning signs:**
- Delta columns show `NaN` or `undefined` instead of a value or "N/A"
- Comparison crashes when one session has clubs the other does not
- Club names that "look the same" appear as separate rows in the comparison

**Phase to address:**
Session comparison implementation phase — normalization utility must be written before the comparison function.

---

### Pitfall C4: No Storage Quota Guard Means History Silently Stops Saving

**What goes wrong:**
`chrome.storage.local` write failures do not throw. They set `chrome.runtime.lastError` (in callback style) or reject the promise (in async style) — but only if the caller checks. If session history writes ignore errors, the user sees no indication that saving failed. New sessions appear to be saved, but the history list does not grow.

**Why it happens:**
The existing `SAVE_DATA` handler in `serviceWorker.ts` already checks `chrome.runtime.lastError` for the current-session save. But when session history save logic is added, developers often write the first working version, see it work in testing (small sessions, empty history), and ship without verifying the failure path.

**How to avoid:**
Every `chrome.storage.local.set()` call in the history write path must check for errors. On quota error specifically:
1. Log the error
2. Attempt to evict the oldest session and retry the save
3. If retry also fails, surface a toast warning to the user: "Session history full — oldest session removed to make room"

Implement a `getStorageUsage()` check before each history write using `chrome.storage.local.getBytesInUse()`. If projected write would exceed a safe threshold (e.g., 8 MB out of 10 MB), evict proactively rather than reactively.

**Warning signs:**
- History list does not grow after several sessions
- No error shown in UI despite saves "completing"
- Background console shows `runtime.lastError` but popup shows no feedback

**Phase to address:**
Session history storage design phase — the write path and error handling must be implemented together, not as a later addition.

---

### Pitfall C5: Popup Grows to Unusable Height With Session History List

**What goes wrong:**
The Chrome extension popup maximum height is 600px (800px max width). The current popup already has significant vertical content: shot count, export controls, AI prompt selector, prompt preview. Adding a session history list — even 3–5 rows — pushes the popup past 600px, causing Chrome to clip the bottom content and making some controls unreachable without scrolling. Chrome's popup auto-sizes to content height, but clamps at 600px without showing a scrollbar by default.

**Why it happens:**
Session history UI is typically designed like a web page with a natural height. In an extension popup, height is a hard constraint. Developers test with few sessions (list is short) and miss the overflow case until a user reports it.

**How to avoid:**
Session history UI does not belong in the popup. Use the existing `options.html` page (accessible via the existing options UI) for session browsing and re-export. The popup shows at most a summary indicator: "3 sessions saved" with a link to the options page. This is the correct split:

- **Popup:** current session status, quick export, AI launch. Session count badge only.
- **Options page:** full session history list, per-session re-export, comparison trigger.

If a session list must appear in the popup, constrain it to a fixed-height scrollable container (max-height: 120px, overflow-y: auto) showing only 2–3 rows with "View all" link to options.

**Warning signs:**
- "View all" button or bottom controls are cut off when more than 3 sessions are saved
- Popup body requires scrolling to reach export button
- Chrome Task Manager shows popup DOM height > 600px

**Phase to address:**
Session history UI design phase — decide popup vs. options page placement before writing any HTML.

---

## Moderate Pitfalls

### Pitfall M1: Smart Prompt Matching Uses Stale Cached Data

**What goes wrong:**
Smart prompt matching highlights a prompt in the dropdown based on the current session's data characteristics (e.g., high spin rate → "Launch & Spin Optimization"). If the matching runs at popup DOMContentLoaded using `cachedData`, it uses the data captured at that moment. If `DATA_UPDATED` fires after DOMContentLoaded (because the user loaded a new report after opening the popup), the highlighted prompt is not re-evaluated. The user sees a suggestion based on old data.

**Why it happens:**
The existing `DATA_UPDATED` message handler in `popup.ts` updates `cachedData` and calls `updateShotCount()`, `updateExportButtonVisibility()`, and `updatePreview()`. A developer adding smart matching will wire it in the same handler but may only call the match function on initial load, not on subsequent data updates.

**How to avoid:**
Wherever `cachedData` is updated, re-run the smart matching function. Extract matching into a single `updateSmartPromptSuggestion()` function, and call it in:
1. The DOMContentLoaded initialization block (after cachedData is populated)
2. The `DATA_UPDATED` message handler

**Warning signs:**
- Highlighted prompt does not change after navigating to a different Trackman report while popup is open
- Prompt highlight reflects the previous session's characteristics

**Phase to address:**
Smart prompt matching implementation phase — ensure the DATA_UPDATED handler is extended before shipping.

---

### Pitfall M2: Visual Stat Cards Compute Averages Twice (Once for Display, Once for CSV)

**What goes wrong:**
The visual stat cards display average carry, average club speed, and shot count by club. The CSV export already computes and includes these averages via `writeCsv()`. If the stat card implementation computes averages independently in the popup, there are now two averaging code paths that can diverge — different rounding, different handling of missing values, different units.

**Why it happens:**
The popup currently displays only shot count. A developer adding stat cards writes a quick averaging function directly in `popup.ts` using `cachedData.club_groups`, without recognizing that `ClubGroup.averages` already contains pre-computed averages from the scraper/parser.

**How to avoid:**
Do not re-compute averages in the popup. Read them from `cachedData.club_groups[i].averages` directly — these are already computed by the interceptor and parser. Apply the existing `cachedUnitChoice` unit conversion to display values. The same `MetricValue` object that flows through `csv_writer.ts` is the source of truth. Consistency is guaranteed because both the CSV and the stat card use the same pre-computed averages.

**Warning signs:**
- Stat card shows "245 yards avg carry" but the CSV exports "246 yards" for the same club
- Averages look wrong for clubs with few shots (the scraper averages and a simple mean of filtered `shot.metrics` values may differ)

**Phase to address:**
Visual stat card implementation phase — use the already-present `ClubGroup.averages` as the data source from the start.

---

### Pitfall M3: Session History Index Key Grows Without Bound

**What goes wrong:**
The `sessionHistoryIndex` key stores an array of session IDs. If there is no eviction policy, the array grows with every session. After 50 sessions, the index array itself is ~5 KB (within storage limits). But more importantly: orphaned session keys (`session_{id}`) accumulate if a session write fails after the index is updated, or if the index update fails after the session write succeeds. These orphaned keys are invisible to the user and consume quota silently.

**Why it happens:**
The existing custom prompts pattern uses a similar index-per-key approach (`customPromptIds` + `customPrompt_{id}`). That pattern works correctly for prompts because prompts are individually managed and deleted by the user. Sessions are written automatically — the window for partial-write failure is narrower but still real, especially on first-time quota saturation.

**How to avoid:**
Write the session data and the index update in a single `chrome.storage.local.set()` call when possible (batch both the session snapshot key and the updated index array in one object). If storage fails, neither is written. For cleanup, add a garbage collection pass on startup: load the index, enumerate all `session_*` keys in storage, remove any keys that are not referenced in the index.

**Warning signs:**
- `chrome.storage.local.getBytesInUse()` is higher than the sum of known session sizes
- Session count from the index does not match the count of `session_*` keys in DevTools Storage inspector
- History list renders fewer sessions than the raw storage shows

**Phase to address:**
Session history storage design phase — atomic write pattern and startup GC should be designed upfront.

---

### Pitfall M4: Comparison Delta Is Meaningless Across Different Surface Conditions

**What goes wrong:**
Session comparison shows a delta column: "Carry: +12 yards" between session A and session B. But session A was on Grass and session B was on Mat. Mat sessions produce significantly different ball flight characteristics (lower spin, different launch conditions) compared to Grass. The delta is technically correct arithmetic but is misleading — the user may interpret carry improvement as swing progress when it is actually surface artifact.

**Why it happens:**
The `hittingSurface` field is stored in `metadata_params` of `SessionData`. Comparison logic that focuses on metric deltas will likely skip this contextual field.

**How to avoid:**
Show the hitting surface for each session in the comparison header. When the surfaces differ, add a visual indicator ("Mixed surfaces — comparison may not reflect swing changes"). This does not block the comparison, but it warns the user. Store `hittingSurface` in the `SessionSnapshot` metadata and make it visible in the comparison view.

**Phase to address:**
Session comparison UI implementation phase — add surface mismatch indicator before shipping.

---

### Pitfall M5: Stat Card Renders Stale Data if Popup Stays Open Across Report Loads

**What goes wrong:**
The popup can stay open while the user navigates to a different Trackman report. The `DATA_UPDATED` message fires and `cachedData` is updated. If the stat cards render on DOMContentLoaded only and are not wired to the `DATA_UPDATED` handler, the cards show the first session's data for the entire popup session.

**Why it happens:**
Same root cause as Pitfall M1. Any new UI element that reads `cachedData` must be updated in the `DATA_UPDATED` handler.

**How to avoid:**
Extract stat card rendering into a `renderStatCards()` function. Call it in both:
1. DOMContentLoaded initialization (after cachedData is loaded)
2. DATA_UPDATED handler (alongside existing `updateShotCount()` calls)

This is the same pattern already established for `updatePreview()`.

**Phase to address:**
Visual stat card implementation phase — wire DATA_UPDATED update from the start.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Store full `SessionData` in history (including `raw_api_data`) | No extra type needed | Quota fills at ~14 large sessions; data duplication | Never — strip `raw_api_data` before storing |
| Put session history UI inside the popup | Faster to build, one file to edit | Popup height overflow at 3+ sessions; poor UX | Never for a full list; a count badge is acceptable |
| Re-compute averages in popup for stat cards | Simple inline code | Two averaging paths that can diverge from CSV | Never — use `ClubGroup.averages` directly |
| No session cap / no eviction policy | Simpler write path | Silent failures after 10–14 large sessions | Never — always enforce a max (recommend 20) |
| Store session index in `chrome.storage.sync` | Index syncs across devices | sync per-item limit is 8 KB; even the index grows beyond that at 50+ sessions | Never — use `chrome.storage.local` for all session data |
| Match smart prompt on first load only | Simpler code | Stale suggestion when user browses multiple reports with popup open | Acceptable for v1 if documented as a known limitation; fix in follow-up |

---

## Integration Gotchas

Common mistakes when connecting the new features to the existing extension system.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Session save on `SAVE_DATA` handler | Add history write inside existing `SAVE_DATA` handler in `serviceWorker.ts` without error handling | Check `chrome.runtime.lastError` on every history write; implement quota guard before write |
| Session index update | Update index before saving session data | Save session data first; update index second; batch in single `chrome.storage.local.set()` call where possible |
| Stat card unit display | Display raw metric values from `ClubGroup.averages` directly | Apply `cachedUnitChoice` conversion (same conversion used in `writeTsv()`) to display values |
| Smart matching trigger | Wire only to `promptSelect` change events | Wire to `promptSelect` change AND to `DATA_UPDATED` handler in popup |
| Options page session browser | Open full session list in popup inline | Open options page from popup link; options page has no height constraint |
| Session comparison Club matching | Exact string match on `club_name` | Normalize names (trim, lowercase, collapse separators) before comparison |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Load all session snapshots from storage on every popup open | Popup takes 1–2 seconds to open when 15+ sessions are stored | Store only the index at load time; lazy-load individual sessions on demand | At 10+ large sessions (10 × 708 KB = 7 MB storage read on every popup open) |
| Render full session list in popup DOM | Popup height clips at 600px; rendering slow for 20+ sessions | Paginate or limit list to 3–5 rows in popup; full list in options page | At 5+ sessions in popup, or 20+ in options page without virtualization |
| Re-run smart match on every prompt dropdown render | Matching stalls popup open when session is large | Run matching once when data is cached; store result; re-run only on data update | At sessions with 300+ shots (assemblePrompt + metric scan on every render) |
| Include raw_api_data in every session write | 14th large session fails to save | Strip raw_api_data from SessionSnapshot type | At first large session if raw_api_data is included |

---

## Security Mistakes

Domain-specific security issues for this extension.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Store session history in `chrome.storage.sync` | Session data (shot metrics, dates, venue patterns) syncs to Google's servers unencrypted | All session data in `chrome.storage.local` only; sync only for preferences |
| Render session labels from storage with `innerHTML` | If a future feature allows user-edited session labels, XSS via crafted label text | Use `textContent` not `innerHTML` for any user-derived session display strings (consistent with existing `textContent` XSS prevention in prompt preview) |

---

## UX Pitfalls

Common user experience mistakes for these specific features.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No indication that a session was saved to history | User does not know history is accumulating; may be surprised to find old sessions later | Show a brief "Saved to history" toast on successful session capture (1-2 seconds, non-blocking) |
| Session history replaces current session export | User expects the current session to remain primary in the popup | Current session is always the primary view; history is secondary (options page or compact list) |
| Smart prompt highlight changes without explanation | User sees a badge appear on a prompt but does not know why | Add a tooltip or subtitle: "Suggested based on your spin data" — make the reasoning visible |
| Comparison shows delta without context sign convention | "+12" on Carry could mean good or bad depending on context | Show directional arrow icons; indicate whether higher is better per metric (Carry: higher = better; Side: lower = better) |
| Visual stat cards show metrics the current session does not have | Card shows "Avg Club Speed: —" when ClubSpeed was not captured | Only render stat cards for metrics present in the current session's `metric_names`; hide cards for absent metrics |
| Session labels are raw dates only | "2026-03-03" is not meaningful when a user has 3 sessions in one week | Show date + session number + shot count: "March 3 · Session #2 · 47 shots" |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Session history save:** Verify error handling — does the history write path check `chrome.runtime.lastError` and surface a toast on quota failure?
- [ ] **Session history save:** Verify `raw_api_data` is stripped — serialize a `SessionSnapshot` and confirm `raw_api_data` is not present.
- [ ] **Session comparison:** Test with non-matching club sets — session A has "Driver", session B does not. Does the UI show "N/A" cleanly?
- [ ] **Session comparison:** Test with surface mismatch — does the comparison header show the surface mismatch warning?
- [ ] **Visual stat cards:** Verify unit conversion — does "Avg Carry" show yards or meters per the user's `distanceUnit` preference?
- [ ] **Visual stat cards:** Test with a session that has no `Carry` metric — does the card hide gracefully or show an error state?
- [ ] **Smart prompt matching:** Open popup, load session, note highlighted prompt. Then navigate to a different Trackman report while popup is open. Does the highlight update on `DATA_UPDATED`?
- [ ] **Storage quota guard:** Manually set storage to near-full using DevTools Storage inspector. Verify that a session save attempt fails gracefully with a user-visible toast rather than silently dropping the session.
- [ ] **Session index cleanup:** Simulate a failed session write (write index but not data). Verify startup GC removes the orphaned index entry.
- [ ] **Options page session browser:** Verify it opens in a full tab (`open_in_tab: true` is already in manifest). Verify it loads all session snapshots from `chrome.storage.local`.

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Quota exceeded, sessions stopped saving | LOW | Add eviction logic; run GC to clear orphaned keys; users lose oldest sessions (acceptable tradeoff) |
| raw_api_data stored in all history sessions | HIGH | Requires storage migration on extension update: read existing sessions, strip raw_api_data, re-write; implement in `chrome.runtime.onInstalled` handler |
| Session index and session data are out of sync | MEDIUM | Add startup GC routine to reconcile; remove orphaned keys; rebuild index from remaining session keys |
| Comparison crashes on club name mismatch | LOW | Add normalization utility; existing comparison tests will catch regressions |
| Stat cards show wrong values due to double-computation | MEDIUM | Replace with `ClubGroup.averages` source; existing CSV snapshot tests serve as the averages source of truth |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| raw_api_data in history blows quota (C1) | Session history — storage design | Serialize a `SessionSnapshot` and assert `raw_api_data` key is absent |
| Wrong storage area for history (C2) | Session history — storage design | Inspect DevTools > Application > Extension Storage; confirm all `session_*` keys are in `local` not `sync` |
| Club name mismatch in comparison (C3) | Session comparison — implementation | Unit test: compare sessions with "7 Iron" vs "7-Iron" and assert deltas are computed, not undefined |
| No quota guard on history writes (C4) | Session history — storage design | Integration test: fill storage to 9 MB manually; verify next save produces visible toast |
| Popup height overflow from history list (C5) | Session history — UI design | Visual test: save 10 sessions; open popup; verify all controls are accessible without scrolling |
| Smart matching uses stale data (M1) | Smart prompt matching — wiring | Test: open popup, capture session A, note highlighted prompt, navigate to session B, verify highlight updates |
| Double-computation of averages (M2) | Visual stat cards — implementation | Assert `renderStatCards()` reads `cachedData.club_groups[i].averages` and does not call a separate averaging function |
| Index grows without GC (M3) | Session history — storage design | Simulate orphaned key (write index entry without writing session); verify startup GC removes it |
| Surface mismatch in comparison (M4) | Session comparison — UI | Test: compare a Mat session with a Grass session; verify surface mismatch indicator appears |
| Stat cards stale after DATA_UPDATED (M5) | Visual stat cards — wiring | Test: open popup with session A loaded; navigate to session B; verify stat cards update |

---

## Sources

- [chrome.storage API — official quotas and limits](https://developer.chrome.com/docs/extensions/reference/api/storage) — 10 MB local limit (5 MB pre-Chrome 114), 8 KB sync per-item limit, no per-item local limit, `chrome.runtime.lastError` on write failure (HIGH confidence)
- [unlimitedStorage permission](https://chrome-stats.com/permission/unlimitedStorage) — removes local quota; does not affect sync; requires manifest declaration (MEDIUM confidence)
- [w3c/webextensions issue #351 — storage.local limits discussion](https://github.com/w3c/webextensions/issues/351) — confirms 10 MB default, IndexedDB as alternative for large data (MEDIUM confidence)
- [Chrome extension service worker lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle) — service workers terminate after 30s inactivity; state must be in storage not globals; event listeners must be top-level (HIGH confidence)
- [Chrome popup size constraints — Chromium source](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/3A8d3oiOV_E) — max 800x600px, min 25x25px, hardcoded in Chromium source (HIGH confidence)
- Direct source code inspection: `/Users/kylelunter/claudeprojects/trackv3/src/` — `SessionData` type shape, `raw_api_data` field, existing storage patterns, `STORAGE_KEYS` constants, `ClubGroup.averages` structure (HIGH confidence)
- Empirical storage size estimates: node.js serialization of realistic `SessionData` instances from actual type shape (HIGH confidence — methodology is direct)
- [HackerNoon — State Storage in Chrome Extensions](https://hackernoon.com/state-storage-in-chrome-extensions-options-limits-and-best-practices) — storage area comparison and best practices (MEDIUM confidence)

---
*Pitfalls research for: TrackPull v1.6 — Session History, Session Comparison, Visual Stat Cards, Smart Prompt Matching*
*Researched: 2026-03-03*
*Supersedes v1.5 PITFALLS.md for this milestone's scope*
