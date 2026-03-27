# Phase 25: Activity Browser UI - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning

<domain>
## Phase Boundary

The popup gains an inline activity browser panel that replaces the current single "Import from Portal" button. Users can browse their Trackman activities grouped by time period, filter by activity type, and import individual sessions — all without leaving the popup. Auth/error states (denied, not logged in, error) continue to replace the portal section content. No pagination, no bulk import, no session comparison — those are future scope.

</domain>

<decisions>
## Implementation Decisions

### Panel Integration
- **D-01:** Inline replacement — the current `portal-ready` div with a single "Import from Portal" button is replaced by the activity browser. When portal auth is ready, the list loads automatically (per Phase 24 D-05: always re-fetch on open).
- **D-02:** Auth/error states (denied, not-logged-in, error) replace the entire portal section content — same as current behavior. No activity list shown until portal is ready.
- **D-03:** Scrollable container with fixed max-height (~300px) and overflow scroll. Keeps the popup compact so export/AI sections remain accessible below.

### Activity List Layout
- **D-04:** Compact single-line rows — date, stroke count, and activity type on one line with an Import button right-aligned. Matches the dense stat-card-row pattern.
- **D-05:** Short month + day date format ("Mar 26"). Add year only for activities older than the current year.
- **D-06:** Show "Imported" label (muted text/badge) instead of the Import button for activities already in history. Prevents accidental re-imports and signals completion.

### Time-Period Grouping
- **D-07:** Flat section headers — small, muted text labels (Today / This Week / This Month / Older) between activity rows. Not collapsible, always visible.
- **D-08:** Hide empty time periods entirely. If no activities in "Today", skip that header.

### Filter UI
- **D-09:** Dropdown selector above the activity list — "All Types" default, consistent with existing unit-selector and AI-service-select dropdown patterns in the popup.
- **D-10:** Filter options dynamically populated from fetched activities — "All Types" plus only the types present in the data. Avoids showing options that return zero results.
- **D-11:** Client-side filtering — fetch all activities once, filter in JS. Instant filtering with no extra network calls. Works with the 20-item page size from Phase 24.

### Loading & State Display
- **D-12:** The browser panel displays idle, loading, loaded, importing, and error states — carried from success criteria. Import feedback continues to use `showToast` (Phase 24 decision).

### Claude's Discretion
- CSS styling details for activity rows, section headers, and scrollable container
- How to detect which activities are already in history (comparison logic)
- GraphQL query field expansion to include stroke count and activity type (current FETCH_ACTIVITIES_QUERY only has id and date)
- Loading spinner/skeleton design during fetch
- How to wire the filter dropdown change handler

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Popup UI
- `src/popup/popup.html` — Current popup HTML with portal-section div (lines 559-585), dark mode tokens, existing UI patterns (unit selectors, stat card, toast)
- `src/popup/popup.ts` — Popup logic, `showToast()`, `showImportStatus()`, portal auth state handling, cached data patterns

### Import Types & Queries
- `src/shared/import_types.ts` — `ImportStatus` type, `ActivitySummary` interface, `FETCH_ACTIVITIES_QUERY` (needs expansion for stroke count and activity type), `IMPORT_SESSION_QUERY`

### Service Worker & Message Handling
- `src/background/serviceWorker.ts` — FETCH_ACTIVITIES and IMPORT_SESSION message handlers (Phase 24 output)
- `src/shared/constants.ts` — `STORAGE_KEYS` including `IMPORT_STATUS`

### GraphQL Client & Auth
- `src/shared/graphql_client.ts` — `executeQuery()`, `classifyAuthResult()`, `AuthStatus`
- `src/shared/portalPermissions.ts` — `hasPortalPermission()`, portal state detection

### History (for "Imported" badge detection)
- `src/shared/history.ts` — `saveSessionToHistory()`, history storage patterns, dedup by `report_id`

### Requirements
- `.planning/REQUIREMENTS.md` §BROWSE-01 — User can view activity list with date, stroke count, activity type
- `.planning/REQUIREMENTS.md` §BROWSE-03 — Activities grouped by time period
- `.planning/REQUIREMENTS.md` §BROWSE-04 — User can filter activities by type

### Prior Phase Context
- `.planning/phases/24-service-worker-import-flow/24-CONTEXT.md` — Import status model (D-01 through D-09), always re-fetch (D-05), one import at a time (D-04)
- `.planning/phases/22-graphql-client-cookie-auth/22-CONTEXT.md` — Auth state handling, PortalState union, inline error messaging

### Architecture & Conventions
- `.planning/codebase/CONVENTIONS.md` — Naming patterns, code style
- `.planning/codebase/ARCHITECTURE.md` — Extension architecture, message-based IPC

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `showToast()` in popup.ts — Toast notification system for import success/error feedback, dark mode safe
- `showImportStatus()` in popup.ts — Reads ImportStatus and dispatches to showToast, handles auto-clear
- Portal auth state handling (portal-denied, portal-not-logged-in, portal-error, portal-ready divs) — existing show/hide logic
- Dark mode CSS custom property tokens — full token set for backgrounds, text, borders, accents
- `stat-card-row` grid pattern — compact data display with tabular-nums, reusable for activity rows
- `unit-selectors` dropdown styling — reusable for the activity type filter dropdown

### Established Patterns
- `details/summary` for collapsible sections (stat card, prompt preview) — not used here but available
- Dropdown selectors styled with `--color-accent` border, `--color-bg-card` background
- Button patterns: `.btn-primary` (solid accent), `.btn-outline` (bordered), `.export-row button`
- Pre-fetch data at DOMContentLoaded for synchronous access

### Integration Points
- `portal-section` div in popup.html — current single-button layout to be replaced with activity browser
- `portal-ready` div — currently contains just the Import button, will become the browser container
- FETCH_ACTIVITIES message to service worker — already wired, returns activity list
- IMPORT_SESSION message to service worker — already wired, handles single-session import
- `IMPORT_STATUS` storage key — read on popup open for status display

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 25-activity-browser-ui*
*Context gathered: 2026-03-26*
