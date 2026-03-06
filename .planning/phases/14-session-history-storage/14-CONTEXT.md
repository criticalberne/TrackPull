# Phase 14: Session History Storage - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Automatically persist every captured Trackman session to chrome.storage.local with deduplication by report_id and rolling 20-session eviction. This is a pure service worker change — no UI, no browsing, no re-export. Phase 15 handles the history UI; Phase 14 just stores and evicts.

</domain>

<decisions>
## Implementation Decisions

### Session identity
- Deduplication key: `report_id` only — same report_id = same session regardless of url_type or date
- On duplicate: full replace (overwrite stored snapshot with new capture entirely)
- Eviction ordering: by `captured_at` timestamp — oldest captured session is evicted first
- Re-capture of existing report_id refreshes `captured_at` (bumps to newest position, won't be evicted soon)

### Storage shape
- Single array key in chrome.storage.local (e.g., `sessionHistory`) holding all snapshots
- Entire array read/written on each save operation
- Wrapper metadata: `captured_at` timestamp only — report_id and date already live on SessionData
- `SessionSnapshot` type defined as `Omit<SessionData, 'raw_api_data'>` in `src/models/types.ts` alongside SessionData
- History storage key added to existing `STORAGE_KEYS` constant in `src/shared/constants.ts`

### Save trigger & timing
- Hook into existing `SAVE_DATA` handler in serviceWorker.ts — after TRACKMAN_DATA write succeeds, save to history
- History save happens after (not in parallel with) the primary TRACKMAN_DATA write
- Every SAVE_DATA call updates history (multi-page merges naturally overwrite same report_id; final merged result wins)
- No user feedback on successful save — history just works silently in the background

### Error handling
- History failure never blocks the primary session flow — graceful degradation
- On storage write failure: send a message to popup; if popup is open, show a red-tinted toast bar (top or bottom of popup)
- Toast auto-dismisses after 5 seconds
- Error messages are specific (map chrome.runtime.lastError to user-friendly text, e.g., "Storage full" not generic "save failed")
- If popup is closed when error occurs: log to console only

### Claude's Discretion
- Exact toast CSS styling and positioning within popup
- Whether to create a dedicated history module (src/shared/history.ts) or keep logic in serviceWorker.ts
- Array sorting/insertion strategy for the history array
- How to strip raw_api_data (shallow copy vs. destructure)

</decisions>

<specifics>
## Specific Ideas

- 20-session cap is confirmed safe: ~90 KB per session without raw_api_data, 20 sessions = ~1.8 MB, well under 10 MB chrome.storage.local quota
- raw_api_data must be stripped before saving — a single session with raw payload can reach 700+ KB
- The existing `getDownloadErrorMessage()` in serviceWorker.ts is a pattern for mapping chrome errors to user-friendly messages — reuse this approach for history errors

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SessionData` interface (types.ts:20-28): source type; SessionSnapshot derives from it
- `STORAGE_KEYS` (constants.ts:143-151): centralized storage key registry
- `getDownloadErrorMessage()` (serviceWorker.ts:27-38): error message mapping pattern
- CSS custom property tokens (popup.html:9-58): dark mode support via `var(--color-*)` for toast styling

### Established Patterns
- `SAVE_DATA` handler (serviceWorker.ts:50-62): writes to chrome.storage.local with lastError checking — history save hooks in after this succeeds
- `chrome.storage.onChanged` listener (serviceWorker.ts:115-122): broadcasts DATA_UPDATED to popup — same pattern can broadcast history errors
- `chrome.runtime.sendMessage` for popup communication (serviceWorker.ts:118): service worker already sends messages to popup

### Integration Points
- serviceWorker.ts SAVE_DATA handler: add history save after TRACKMAN_DATA write callback
- constants.ts STORAGE_KEYS: add SESSION_HISTORY key
- types.ts: add SessionSnapshot type and HistoryEntry wrapper type
- popup.ts: add listener for history error messages, render toast
- popup.html: add toast container element (hidden by default)

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 14-session-history-storage*
*Context gathered: 2026-03-06*
