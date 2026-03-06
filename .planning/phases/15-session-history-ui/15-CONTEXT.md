# Phase 15: Session History UI - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning

<domain>
## Phase Boundary

User can browse saved sessions, load any past session to re-export (CSV, TSV, AI analysis), and delete individual sessions or clear all history. All actions happen within the popup. No new data capture logic, no cross-session comparison, no options page routing.

</domain>

<decisions>
## Implementation Decisions

### History list placement
- Collapsible `<details>/<summary>` section in the popup (consistent with stat card and prompt preview patterns)
- Positioned after AI section, before Clear Session Data button
- Max-height with internal scroll (~200px) to prevent hitting Chrome's 600px popup height limit
- Hidden entirely when zero saved sessions exist (consistent with stat card, export row, AI section)
- Summary label: "Session History"

### Session loading flow
- Clicking a session row loads its data into cachedData, updating shot count, stat card, and enabling export/AI buttons as if it were the live session
- A persistent banner appears at top: "Viewing: [date] session [x]" with dismiss button
- Clicking dismiss or closing/reopening the popup restores the live session
- Clear Session Data button is hidden while viewing a historical session
- If DATA_UPDATED fires while viewing a historical session, auto-switch to the new live session (banner disappears)

### List item display
- Single-line rows: date, shot count, clubs used
- Date format: relative for recent ("Today", "Yesterday"), then short date ("Mar 5") for older
- Club list truncated to first 3 clubs, then "+N more" for sessions with 6+ clubs
- Whole row is clickable (cursor: pointer) to load that session -- no explicit "Load" button

### Delete & clear
- Trash icon on the right side of each session row for individual delete
- No confirmation for individual delete (sessions are auto-captured, low risk)
- "Clear All History" text button at the bottom of the history list, inside the collapsible section
- Clear All requires browser confirm() dialog: "Delete all saved sessions? This cannot be undone."

### Claude's Discretion
- Exact CSS styling for history rows, banner, and scroll container
- How to implement the "viewing historical session" state in popup.ts (flag variable, separate render path, etc.)
- Whether delete operations use chrome.storage.local.set or a dedicated history module function
- Toast feedback wording on individual delete (if any)

</decisions>

<specifics>
## Specific Ideas

- Row format: `Today -- 24 shots -- 7i, PW, 9i` with trash icon at far right
- Banner at top when viewing historical session: subtle background color, dismiss [x] button
- History list starts collapsed (consistent with stat card default behavior)

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `HistoryEntry` type (types.ts:34-36): `{ captured_at: number, snapshot: SessionSnapshot }`
- `SessionSnapshot` type (types.ts:31): `Omit<SessionData, 'raw_api_data'>`
- `STORAGE_KEYS.SESSION_HISTORY` (constants.ts:151): storage key for history array
- `saveSessionToHistory()` (history.ts:24-66): existing save/dedup/evict logic
- `getHistoryErrorMessage()` (history.ts:71-76): error message mapping
- Toast system (popup.html:128-175, popup.ts): existing slide-in/slide-out toast with error/success variants
- CSS custom property tokens (popup.html:9-58): dark mode handled automatically
- `computeClubAverage()` (popup.ts:15-27): reusable for stat card rendering on historical data
- `renderStatCard()` (popup.ts:41+): can be called with any session data in cachedData

### Established Patterns
- `<details>/<summary>` for collapsible content: stat card (popup.html:497-500), prompt preview (popup.html:554-557)
- `updateExportButtonVisibility()` pattern: show/hide sections based on data presence
- `cachedData` / `cachedUnitChoice` globals: popup.ts already uses these for all rendering
- DATA_UPDATED listener: already calls multiple update functions; history refresh hooks in here

### Integration Points
- popup.html: new `<details>` section between AI section and Clear button
- popup.html: new banner element (hidden by default) at top of body
- popup.ts: `chrome.storage.local.get(SESSION_HISTORY)` to load history list on DOMContentLoaded
- popup.ts: click handlers on history rows to swap cachedData and re-render
- popup.ts: delete handlers calling `chrome.storage.local.set` to update history array
- popup.ts: DATA_UPDATED handler needs to refresh the history list and clear "viewing historical" state
- history.ts: may need new exported functions for delete-one and clear-all operations

</code_context>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 15-session-history-ui*
*Context gathered: 2026-03-06*
