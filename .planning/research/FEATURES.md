# Feature Research

**Domain:** Golf data Chrome extension — Trackman portal activity browser and GraphQL session import
**Researched:** 2026-03-26
**Confidence:** HIGH for codebase constraints (verified by code); MEDIUM for Trackman portal UX (official docs partially accessible); MEDIUM for activity browser UX patterns (analogous domain: Garmin Connect, Strava activity lists, golf performance apps)

---

## Milestone Scope

This document covers **v1.6 Trackman Portal Integration features only**: browsing a user's Trackman activity list from the popup, pulling any session's full shot data via GraphQL, and mapping GraphQL `Measurement` fields into the existing `SessionData` pipeline so imported sessions flow through CSV export and AI analysis unchanged.

Prior v1.6 Data Intelligence features (session history storage, visual stat card, session history UI) are partially shipped (Phases 13–15). This milestone is a *new* v1.6 scope replacing the remaining deferred features (Phase 15 UI completion, Phase 16 smart prompts) as the active milestone. The GraphQL integration unlocks historical sessions that have no report URL — the primary unresolved access gap in the current system.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users consider obvious given the milestone goal. Missing these makes the portal browser feel incomplete or untrustworthy.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Activity list with date, shot count, and session type | The Trackman portal's own "My Activities" view shows a list of sessions with date and type. Users opening an in-extension activity browser expect at minimum the same fields the portal shows them. Missing shot count forces a second click to evaluate whether a session is worth importing. | MEDIUM | GraphQL `me.activities` query returns activities. Shot count is derived from the Strokes sub-query or stored in the activity node. Date is `createdAt`. Session type (Practice, Round, Combine) maps to the GraphQL `kind` or `type` field. All three fields must display in a single list row. |
| Import a session into the existing export/AI pipeline | The entire value proposition of portal integration is recovering old sessions that have no report URL. If importing a session doesn't result in the same CSV/TSV/AI actions available for live-captured sessions, the feature is a dead end. | HIGH | Parser must map GraphQL `Stroke.measurement` fields to `SessionData` (`ClubGroup`/`Shot` structure). Imported session must be stored via `saveSessionToHistory()` so it appears in history and the existing export path (`EXPORT_CSV_REQUEST` / `EXPORT_CSV_FROM_DATA`) handles it identically. |
| Cookie-based auth with no login UI | Users are already logged into portal.trackmangolf.com in their browser. They should not be prompted for credentials inside the extension. If the extension asks for a username/password, the UX is broken. | LOW | `credentials: "include"` on fetch requests to `api.trackmangolf.com/graphql` passes the browser's existing Trackman session cookie automatically. Extension needs `host_permissions` for `api.trackmangolf.com`. No login flow, no token storage. |
| Authenticated state feedback | Users need to know whether they are logged in or not before attempting to browse activities. A fetch that silently fails because cookies are expired is confusing — the extension appears broken. | LOW | On activity list load, if the GraphQL response returns a 401 or an `unauthenticated` error, show a clear "Log into Trackman Portal first" message with a link to `portal.trackmangolf.com`. This is a display-only concern, not a new auth layer. |
| Loading state during fetch | GraphQL activity list fetches are network calls — they take time. No loading indicator means the UI appears frozen. | LOW | Show a spinner or "Loading activities..." text while awaiting `me.activities` response. Show per-session loading state when pulling shot data for a selected activity. These are standard async UX patterns already established in the popup via status messages. |
| Error feedback for failed pulls | Network errors, GraphQL errors, and partial data are real scenarios. Users need a clear message when a pull fails — not a silent empty state. | LOW | Surface GraphQL `errors[]` array to the user. Map common error reasons (auth failure, activity not found, network timeout) to human-readable messages using the existing `getDownloadErrorMessage()` pattern in `serviceWorker.ts`. |
| Clubs visible in the activity list | Garmin Connect, the Trackman Golf App, and every comparable tool show which equipment was used in a session at the list level. Users scan their activity list looking for "the session where I hit driver" — without clubs, they must open each session to identify it. | MEDIUM | GraphQL `me.activities` may or may not return club groupings at the list level — this needs verification in the GraphQL research. If clubs are available in the list query, show them (truncated: first 3 + "+N more"). If only available via session detail query, clubs are shown only after import completes, and the list row shows a placeholder. |

---

### Differentiators (Competitive Advantage)

Features that go beyond expected behavior and are not natively available in the Trackman portal or any existing export tool.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Import directly into history + full action parity (CSV/TSV/AI) | The Trackman Golf App and portal lock your data. TrackPull's differentiator is always "open data." Imported portal sessions feeding the same CSV export and AI analysis pipeline — not just storage — is what makes this milestone meaningfully different from "we just show you a list." | HIGH | Imported `SessionData` is written to `chrome.storage.local` via `saveSessionToHistory()`. Service worker's `EXPORT_CSV_FROM_DATA` handler already supports inline session data — no protocol change needed. AI launch via `assemblePrompt()` works on any `SessionData`. The new work is the GraphQL parser producing a conformant `SessionData`, not changes to downstream pipeline. |
| Browse and import without navigating to portal first | Users currently must find a session's report URL in the Trackman portal, open it, then wait for the extension to capture the API response. Portal integration eliminates this navigation entirely — the extension fetches directly. This makes the extension self-sufficient rather than a passive scraper. | MEDIUM | Popup shows "Import from Portal" entry point. Activity list loads via `chrome.runtime.sendMessage` to background (which calls `api.trackmangolf.com/graphql`). Background has network access; popup does not need additional permissions. |
| Surface 60+ measurement fields not in the report UI | Trackman's report web interface shows a curated subset of metrics. The GraphQL `Stroke.measurement` object contains 60+ fields including fields unavailable in the HTML report view. Importing via GraphQL may give users richer data than the report page interception path provides. | MEDIUM | Parser must map all available `Measurement` fields to metric key names in `ALL_METRICS` (from `constants.ts`) where equivalents exist, and pass through additional fields under their raw field names. Users do not see this directly, but the CSV export will contain more columns for GraphQL-imported sessions. Flag this as a potential user-facing differentiator in the UI ("Full data: 60+ metrics"). |

---

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Filter/search activity list by club, date range, or session type | Garmin Connect and Strava users expect rich filter sidebars for their activity lists. Power users with years of Trackman sessions will request filtering immediately. | The popup is 320–400px wide. A filter sidebar doubles the interaction complexity for a narrow surface. The `me.activities` GraphQL query returns sessions newest-first — in practice, the user wants their recent sessions (the top of the list), not historical archaeology. Filtering requires server-side pagination or loading all activities and filtering client-side (expensive memory for large accounts). | Ship date-grouped list (Today, This Week, This Month, Older) with a scroll-to-load pattern. Add a "Load more" option at bottom of list. Simple enough for popup width; covers 95% of real-world use. Defer filter UI to a future extension page if demand is high. |
| Sync all historical sessions on extension install | First-time import of all available sessions makes the history feel "complete" from day one. | `chrome.storage.local` is capped at 10 MB. A large Trackman account with hundreds of sessions would overflow the cap immediately, evicting all sessions during the bulk import. Fetching hundreds of sessions also creates a noticeable performance spike on install. | Import on demand only — user selects sessions to import from the activity list one at a time (or a small batch). Auto-import is limited to the most recent session only, matching the existing capture-on-report-visit behavior. |
| Real-time streaming of new sessions from the portal | Appealing as a "live sync" feature. | GraphQL polling or WebSocket subscription would require the service worker to maintain a persistent background loop, which conflicts with MV3's event-driven service worker lifecycle (workers terminate when idle). Background polling is not reliable in MV3. | Import is user-initiated. The "Import from Portal" button in the popup loads fresh data on demand. This is consistent with the existing report-page interception model — data is captured when the user takes an action. |
| Full session history UI built inside the portal activity browser | Users want one place that shows both report-captured sessions and portal-imported sessions in a unified list. | This conflates two separate features: portal browsing (needs network access to GraphQL) and history browsing (reads from `chrome.storage.local`). Building them as one view creates a hard dependency between GraphQL readiness and the history UI — history UI (Phase 15) is partially shipped and working; it must not regress. | Keep portal browser and history browser as separate UI panels in the popup. Portal browser is a "fetch new" surface; history browser is a "view saved" surface. They are linked only by the import action (portal import writes to history). |
| Batch export: import all activities matching a date range as one CSV | Seems powerful for trend analysis. | Multi-session batch pulls require sequential GraphQL requests, merging 20+ session datasets, handling partial failures, and producing a CSV that is potentially thousands of rows. The import pipeline was designed for single-session use. | Provide individual session import. Users wanting multi-session data can import sessions one at a time into history, then use the CSV writer per session. Multi-session batch CSV is a future consideration only if demand is demonstrated. |

---

## Feature Dependencies

```
[Cookie Auth Validation]
    └──required by──> [Activity List Fetch]
    └──required by──> [Session Shot Pull]

[Activity List Fetch]
    └──requires──> [GraphQL client in service worker] (new)
    └──requires──> [host_permissions: api.trackmangolf.com] (manifest change)
    └──feeds──> [Activity Browser UI]

[Activity Browser UI]
    └──requires──> [Activity List Fetch]
    └──requires──> [Popup view-switching logic] (second panel pattern, partially built in Phase 15)
    └──enables──> [Session Shot Pull]

[Session Shot Pull]
    └──requires──> [Activity Browser UI] (user must select a session)
    └──requires──> [GraphQL node(id) query] (new)
    └──feeds──> [GraphQL-to-SessionData Parser]

[GraphQL-to-SessionData Parser]
    └──requires──> [Session Shot Pull]
    └──produces──> [SessionData conformant with existing types.ts]
    └──feeds──> [saveSessionToHistory] (already exists)
    └──feeds──> [EXPORT_CSV_FROM_DATA handler] (already exists)
    └──feeds──> [AI prompt assembly via assemblePrompt()] (already exists)

[saveSessionToHistory]
    └──already exists from Phase 14──>
    └──used unchanged for portal-imported sessions

[EXPORT_CSV_FROM_DATA]
    └──already exists from Phase 15 Plan 01──>
    └──used unchanged for portal-imported sessions
```

### Dependency Notes

- **GraphQL client is the single new infrastructure piece.** Everything downstream (storage, export, AI launch) already exists and needs no changes — the entire new work is the GraphQL fetch layer and the `Measurement`-to-`SessionData` parser.
- **Activity Browser UI can reuse the show/hide panel pattern** established in Phase 15 Plan 02 (popup history panel). Portal browser is a sibling panel, not a new pattern.
- **Cookie auth has no code dependency** — it is a `credentials: "include"` flag on the fetch call plus `host_permissions` in `manifest.json`. It is a configuration concern, not a new module.
- **Parser is the highest complexity item.** GraphQL `Stroke.measurement` field names are not guaranteed to be identical to `ALL_METRICS` keys (e.g., `"BallSpeed"` vs `"ballSpeed"` or `"ball_speed"`). The mapping table must be verified against the actual GraphQL schema before the parser can be written with confidence.
- **Phase 15 Plan 02 (popup history UI)** remains a dependency for user-visible session loading and delete actions. If Phase 15 Plan 02 is still pending at portal integration time, the portal browser UI must implement its own load/display path or Phase 15 must complete first.

---

## MVP Definition

### Launch With (portal integration v1 — build in this order)

- [ ] **GraphQL client in service worker** — `fetch("https://api.trackmangolf.com/graphql", { credentials: "include" })` with `me.activities` query; manifest `host_permissions` for `api.trackmangolf.com`. This is the foundation everything else depends on.
- [ ] **Cookie auth validation and unauthenticated state** — On activity list load, detect auth failure and show clear "Log in to Trackman Portal first" message. Prevents user confusion when the cookie is expired or not present.
- [ ] **Activity list display in popup** — Show list of sessions from `me.activities`: date (formatted relative: "Today", "3 days ago", etc.), shot count, session type, clubs (first 3 + "+N more"). Load newest 20 sessions. "Load more" at bottom.
- [ ] **Session shot pull via `node(id)` query** — On user selecting an activity, fetch full `Stroke.measurement` data for that session. Show loading indicator.
- [ ] **GraphQL Measurement-to-SessionData parser** — Map GraphQL field names to `ALL_METRICS` keys; build `ClubGroup`/`Shot` structure conformant with `types.ts`. This is the highest complexity task.
- [ ] **Import into history and pipeline** — Write parsed session to `saveSessionToHistory()`; surface CSV/TSV/AI action buttons identically to a live-captured session.

### Add After Validation (v1 follow-on)

- [ ] **Date grouping in activity list** — Group entries under "Today", "This Week", "This Month", "Older" headers. Validates only after the flat list works and users report navigation friction on long lists.
- [ ] **"Full data" indicator** — Badge on GraphQL-imported sessions in history indicating richer metric set than report-captured sessions. Add only if parser confirms additional fields are present.

### Future Consideration (v2+)

- [ ] **Filter/search activity list** — Defer until flat list with date grouping is validated and demand for filtering is demonstrated.
- [ ] **Batch import** — Defer until single-session import is stable and users explicitly request bulk historical import.
- [ ] **Unified portal + history browser** — Merge portal browser and history browser into one panel. Defer until both panels are independently proven.

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| GraphQL client + auth | HIGH (foundation) | LOW | P1 |
| Auth failure feedback | HIGH (prevents confusion) | LOW | P1 |
| Activity list display | HIGH (core browsing UX) | MEDIUM | P1 |
| Session shot pull | HIGH (retrieves the data) | MEDIUM | P1 |
| Measurement-to-SessionData parser | HIGH (unlocks pipeline reuse) | HIGH | P1 |
| Import into history + export/AI parity | HIGH (the actual value delivery) | LOW (pipeline exists) | P1 |
| Date grouping in list | MEDIUM (UX polish) | LOW | P2 |
| "Full data" indicator | LOW (informational) | LOW | P2 |
| Filter/search activity list | MEDIUM | HIGH | P3 |
| Batch import | LOW | HIGH | P3 |

**Priority key:**
- P1: Required to ship the milestone
- P2: Add when P1 items are validated
- P3: Defer until demand is demonstrated

---

## Competitor Feature Analysis

| Feature | Trackman Golf App | Trackman Portal (web) | TrackPull v1.6 Portal Integration |
|---------|-------------------|-----------------------|-----------------------------------|
| Activity list with date, type, shots | Yes — Activities tab, cloud-backed, full history | Yes — "My Activities" list view | In-popup panel, newest 20, load more |
| Per-session shot data | Yes — full measurement breakdown in app | Yes — view only, no export | GraphQL pull, full 60+ field Measurement object |
| Export to CSV | No (data locked to ecosystem) | No | Yes — imported sessions flow through existing CSV writer |
| AI analysis | No | No | Yes — imported sessions flow through existing AI prompt assembly |
| Filter by date / type / club | Yes (in app) | Partial (in portal) | Not in MVP — date grouping as follow-on |
| Access to old sessions without report URL | Yes (all cloud-synced) | Yes (all cloud-synced) | Yes — this is the primary unblocked use case |
| No login friction | N/A (app handles auth) | N/A (portal IS the login) | Cookie passthrough — no new credentials |

TrackPull's differentiation remains the open-data export path and AI analysis integration. The portal activity browser closes the gap on historical sessions without compromising the "zero backend, local-only" design principle.

---

## Sources

- Codebase analysis: `src/models/types.ts`, `src/shared/constants.ts`, `src/shared/history.ts`, `src/background/serviceWorker.ts`, `src/popup/popup.ts` — confirmed existing data models, storage keys, pipeline entry points, and popup architecture (HIGH confidence)
- [Trackman Help Center — Portal: My Activities](https://support.trackmangolf.com/hc/en-us/articles/28111485485083-Portal-Player-My-Activities-Within-The-Golf-Portal) — portal activity list fields and session types (MEDIUM confidence — page returned 403 on direct fetch; summary from search result snippet)
- [Trackman Range API Docs — Activity Management](https://docs.trackmanrange.com/activities/activity-management/) — activity object fields including id, kind, type, createdAt, players (MEDIUM confidence — Range API, not Player API; schema may differ; returned 404 on direct fetch)
- [Awesome Golf Insights — Session Review UX](https://insights.awesome-golf.com/docs/guides/stats/review-sessions) — session list with date filter, pagination at 10/page, column sort (MEDIUM confidence — analogous domain)
- [Garmin Connect forum — Activity sorting patterns](https://forums.garmin.com/apps-software/mobile-apps-web/f/garmin-connect-web/250855/garmin-connect-activity-sorting) — column-based sorting, date-range filter, user expectations for activity lists (MEDIUM confidence — analogous domain)
- [Chrome Extension Popup Size Constraints](https://developer.chrome.com/docs/extensions/develop/ui/add-popup) — 25x25 to 800x600 px; vertical scrollbar widens popup (HIGH confidence — authoritative Chrome docs)
- PROJECT.md — confirmed milestone goals, active requirements, constraints, and key decisions for portal integration (HIGH confidence)
- ROADMAP.md + REQUIREMENTS.md — confirmed which phases are complete vs. pending; dependency on Phase 15 Plan 02 for popup panel UI (HIGH confidence)

---

*Feature research for: TrackPull v1.6 — Trackman Portal Integration (GraphQL activity browser and session import)*
*Researched: 2026-03-26*
*Supersedes v1.6 Data Intelligence scope; prior FEATURES.md content for v1.6 Data Intelligence preserved in git history.*
