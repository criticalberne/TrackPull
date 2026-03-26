# Project Research Summary

**Project:** TrackPull v1.6 — Trackman Portal GraphQL Integration
**Domain:** Chrome Extension (MV3) — GraphQL API integration with cookie-based auth
**Researched:** 2026-03-26
**Confidence:** MEDIUM-HIGH (stack and architecture verified against official Chrome docs and codebase; Trackman API schema unconfirmed — no official docs available)

## Executive Summary

TrackPull v1.6 adds a portal activity browser and session import pipeline that allows users to pull historical Trackman sessions via GraphQL — sessions that have no report URL and were previously inaccessible to the extension. The recommended approach is a zero-new-dependency implementation: a 15-line `fetch` wrapper in a new `graphql_client.ts` module handles all GraphQL communication, cookie authentication is handled by the browser when `host_permissions` includes `api.trackmangolf.com`, and imported sessions flow through the existing `SAVE_DATA` → `saveSessionToHistory` → `EXPORT_CSV_FROM_DATA` pipeline without modification. The new work is strictly additive: three new shared modules, two new service worker message handlers, and a new popup UI panel.

The critical technical insight is that GraphQL requests must originate from the service worker, not from a content script. The service worker's `host_permissions`-granted access enables cookie forwarding — but community-verified reports indicate that `credentials: 'include'` is unreliable in MV3 service workers, and the safer implementation reads cookies explicitly via `chrome.cookies.getAll()` and attaches them as a `Cookie` header. This diverges from the STACK.md recommendation and requires adding the `"cookies"` permission to the manifest. Validate the simpler `credentials: 'include'` approach first; fall back to explicit cookie injection if it fails during Phase 2 verification.

The most consequential non-technical risk is distribution: adding new `host_permissions` entries disables the extension for all existing users during an update. This must be mitigated by using `optional_host_permissions` for the two new API domains and requesting them at runtime via `chrome.permissions.request()` when the user first initiates a portal import. This decision must be made before any code is written — it affects the entire manifest structure and runtime permission flow.

## Key Findings

### Recommended Stack

TrackPull has a zero-production-dependency constraint enforced by design. All new v1.6 functionality follows this constraint with no exceptions. GraphQL communication is implemented as a plain HTTP POST using the native `fetch` API — no library (`graphql-request`, `urql`, Apollo) is appropriate for two known, fixed queries. Cookie authentication uses `credentials: 'include'` in the fetch call backed by `host_permissions`, with a fallback to explicit `chrome.cookies.getAll()` if automatic forwarding proves unreliable in the service worker context.

**Core technologies (new for v1.6):**
- `fetch` with `credentials: 'include'` (native browser API): GraphQL POST to `api.trackmangolf.com/graphql` — zero new production dependencies
- Chrome `optional_host_permissions` (manifest field): grants service worker CORS-exempt access to `api.trackmangolf.com` without disabling the extension for existing users on update
- `chrome.cookies` API (manifest permission, fallback path): explicit cookie attachment if automatic forwarding is unreliable in service worker context
- Three new pure TypeScript modules: `graphql_client.ts`, `portal_types.ts`, `portal_parser.ts` — no new build configuration needed

### Expected Features

The primary value proposition is historical session recovery: users can browse their Trackman activity list from the popup and import any session into the existing CSV export and AI analysis pipeline. All six P1 features are strictly necessary to deliver this value.

**Must have (table stakes — P1):**
- GraphQL client with cookie auth in service worker — foundation all other features depend on
- Unauthenticated state detection and feedback — "Log into portal.trackmangolf.com" with a link; prevents silent empty-list confusion
- Activity list display: date, shot count, session type per row — minimum viable browsing
- Session shot pull via `node(id)` query — retrieves the full session the user selected
- `Measurement`-to-`SessionData` parser — highest complexity; maps 60+ GraphQL fields to existing pipeline types
- Import into history and pipeline — write parsed session via `saveSessionToHistory()`; CSV/TSV/AI parity with live-captured sessions

**Should have (competitive — P2, add after P1 validates):**
- Date grouping in activity list (Today / This Week / This Month / Older) — UX polish for long lists
- "Full data" indicator on portal-imported sessions — surfaces richer metric coverage vs. interceptor path

**Defer (v2+):**
- Filter/search activity list — popup width constraints make this impractical; most users want recent sessions
- Batch import — requires sequential GraphQL requests, merge logic, and partial-failure handling
- Unified portal + history browser — keep separate panels until both are independently proven

### Architecture Approach

All GraphQL requests originate from the service worker via the existing `chrome.runtime.sendMessage` channel. The popup sends `FETCH_ACTIVITIES` or `IMPORT_SESSION` messages; the service worker executes the network calls; the parsed `SessionData` flows through the existing `SAVE_DATA` handler to `chrome.storage.local`. This reuses every downstream component (history, CSV writer, TSV writer, AI prompt assembly) without modification. The activity browser in the popup is a new collapsible section with a `data-state` attribute state machine (idle → loading → loaded → importing → error) and no JavaScript state management library.

**Major components:**
1. `src/shared/graphql_client.ts` (new) — `graphqlFetch<T>()`: plain `fetch` POST wrapper; no Chrome API dependency; accepts query string + variables; returns parsed `data` or throws typed errors
2. `src/shared/portal_types.ts` (new) — TypeScript interfaces for GraphQL activity list and single-session node response shapes; field names must be verified against live API before implementation
3. `src/shared/portal_parser.ts` (new) — pure function `parsePortalSession(session, activityId): SessionData | null`; maps `Stroke.measurement` fields to `Shot.metrics`; sets `url_type: "activity"` and `report_id: activityId`; defensive field mapping with `??` fallbacks
4. `src/background/serviceWorker.ts` (modified) — add `FETCH_ACTIVITIES` and `IMPORT_SESSION` handlers following the existing `return true` async pattern; import state stored in `chrome.storage.local` (fire-and-forget, not `sendResponse`)
5. `src/popup/popup.ts` + `popup.html` (modified) — add collapsible "Import from Portal" section; activity list rendering; per-state display; reads `importStatus` from storage on open

**Build order (hard dependencies dictate this sequence):** manifest → `portal_types.ts` + `graphql_client.ts` (verify against live API) → `portal_parser.ts` (with test fixtures) → service worker handlers → popup UI

### Critical Pitfalls

1. **Permission escalation disables existing users (C1)** — Adding new entries to `host_permissions` in a manifest update disables the extension for every existing user. Prevent by declaring new API domains in `optional_host_permissions` and requesting them at runtime via `chrome.permissions.request()` on first portal import action. Must be decided before writing any fetch code.

2. **Cookies not automatically attached in service worker (C2)** — `credentials: 'include'` is unreliable for cookie forwarding in MV3 service workers despite `host_permissions` being set. Community-confirmed workaround: read cookies explicitly with `chrome.cookies.getAll({ domain: 'trackmangolf.com' })` and attach as a `Cookie` request header. Requires `"cookies"` permission. Verify `credentials: 'include'` first with a health-check query; fall back to explicit injection if it fails.

3. **Popup closes before import completes, silently orphaning the operation (C4)** — The popup context is destroyed when the user clicks away. `sendResponse` callbacks are never delivered to a dead popup context. Prevent by designing the import as fire-and-forget: the service worker writes `importStatus` to `chrome.storage.local`; the popup reads this key on open and on `DATA_UPDATED` events. Never rely on `sendResponse` for operations longer than 1 second.

4. **Service worker terminated mid-import on large sessions (C3)** — MV3 service workers terminate after 30 seconds of fetch response inactivity. Large sessions (300+ shots) on poor connections can exceed this. Prevent by adding `AbortController` with a 20-second timeout on all GraphQL fetches and using cursor-based pagination (20–50 activities per page) for the activity list.

5. **GraphQL schema changes break field mapping silently (C5)** — Trackman does not publish an API changelog. `Measurement` field renames produce `undefined` values in exports with no visible error. Prevent by mapping defensively with `??` fallbacks for known field variants, validating `metric_names` accurately reflects only populated fields, and storing the query string as a versioned constant.

## Implications for Roadmap

Based on research, the v1.6 portal integration decomposes into five phases. The ordering is dictated by hard dependencies: manifest must be correct before any fetch works; parser field names must be verified against the live API before the parser can be written; parser must exist before service worker handlers can call it; service worker handlers must exist before the popup can call them.

### Phase 1: Manifest and Permissions Foundation

**Rationale:** Permission strategy must be decided and implemented before any code is written. The `optional_host_permissions` approach affects the entire runtime request flow. An incorrect permission strategy cannot be patched in a later phase without re-testing the update experience against an installed build.
**Delivers:** Manifest updated with `optional_host_permissions` for `api.trackmangolf.com`; optional `"cookies"` permission scoped appropriately; runtime permission request flow triggered on first portal import action.
**Addresses:** Cookie auth with no login UI (table stakes); authenticated access prerequisite
**Avoids:** C1 (permission escalation disabling existing users), M5 (cookies permission warning on update)

### Phase 2: GraphQL Client and Cookie Auth Verification

**Rationale:** This is the single new infrastructure piece. Everything downstream depends on a working, authenticated GraphQL connection. Verify authentication end-to-end before building anything on top of it. GraphQL field names in `portal_types.ts` must be confirmed against a live API response before the parser can be implemented.
**Delivers:** `graphql_client.ts` with verified cookie auth; `portal_types.ts` interfaces confirmed against live API via DevTools Network capture; health-check query `{ me { id } }` confirming authenticated responses from the service worker
**Uses:** Raw `fetch`, optional `chrome.cookies` API, zero new production dependencies (STACK.md)
**Implements:** `graphql_client.ts` + `portal_types.ts` components (ARCHITECTURE.md)
**Avoids:** C2 (cookies not attached in service worker), M1 (unauthenticated state surfaced as empty list)

### Phase 3: GraphQL-to-SessionData Parser

**Rationale:** Parser is the highest-risk item due to unconfirmed field names and schema uncertainty. Must be built before service worker handlers that call it. Writing tests against real API response fixtures before implementing the mapper catches field name mismatches at the earliest possible point.
**Delivers:** `portal_parser.ts` with defensive field mapping; `tests/test_portal_parser.ts` using captured API response fixtures; `url_type: "activity"` and accurate `metric_names` population in output `SessionData`
**Implements:** `portal_parser.ts` component (ARCHITECTURE.md)
**Avoids:** C5 (schema changes break field mapping silently), M2 (API vs. interceptor field availability mismatch in export pipeline)

### Phase 4: Service Worker Handlers and Import Flow

**Rationale:** With the GraphQL client and parser ready, service worker handlers follow the established message pattern. The import flow must be designed as fire-and-forget with storage-based status tracking from the start — retrofitting this after the fact requires re-testing the popup lifecycle edge case.
**Delivers:** `FETCH_ACTIVITIES` handler returning paginated activity list (first 20 with cursor); `IMPORT_SESSION` handler parsing and routing through existing `SAVE_DATA` path; `importStatus` storage key for popup lifecycle decoupling; session deduplication check on import
**Implements:** Service worker message handler pattern (ARCHITECTURE.md)
**Avoids:** C3 (service worker termination via AbortController timeout), C4 (popup closes before import completes), M3 (no pagination causes slow activity list), M4 (duplicate sessions from both data sources)

### Phase 5: Activity Browser UI

**Rationale:** UI is the last step because all data logic is complete by Phase 4. The popup only needs to send messages and render responses from storage state. Building UI before the backend is testable requires mocking the entire service worker layer.
**Delivers:** Collapsible "Import from Portal" section; activity list with date, shot count, session type per row; idle/loading/loaded/importing/error state display; unauthenticated state with portal link; CSV/TSV/AI action parity immediately after import completes
**Addresses:** All P1 FEATURES.md table stakes — activity list display, authenticated state feedback, loading states, error feedback, import into history and pipeline
**Avoids:** UX pitfalls — no auth feedback, raw timestamps, silent import orphaning, no progress on large sessions

### Phase Ordering Rationale

- Manifest first because the `optional_host_permissions` vs. `host_permissions` decision cannot be changed after fetch code assumes a specific manifest structure without retesting the full update experience
- GraphQL client before parser because `portal_types.ts` field names must be verified against the live API before the parser can correctly map them
- Parser before service worker handlers because the handlers call the parser directly — a hard code dependency
- Service worker before popup because the popup has nothing to call until handlers exist
- No phase can be parallelized with the one before it; all dependencies are strictly sequential

### Research Flags

Phases needing explicit verification during implementation (not standard patterns):

- **Phase 2 (GraphQL Client):** Cookie forwarding behavior in the service worker must be tested against the live Trackman API before building the activity list. The community-documented `credentials: 'include'` unreliability is the highest-probability failure point. Also: `portal_types.ts` field names cannot be written with confidence until a live API response is captured via DevTools.
- **Phase 3 (Parser):** Trackman `Measurement` field names are unconfirmed (official API docs returned 404). Field name verification via DevTools Network capture on `portal.trackmangolf.com` is mandatory before implementing the field mapping table.
- **Phase 1 (Permissions):** The `optional_host_permissions` update experience must be tested against an installed v1.5.x build before releasing. This cannot be verified in isolation; requires a real installed extension update scenario.

Phases with standard patterns (lower research risk):

- **Phase 4 (Service Worker Handlers):** Follows the existing `return true` async message handler pattern already established in `serviceWorker.ts`. The handlers are additive copies of the existing pattern.
- **Phase 5 (Popup UI):** Collapsible panel pattern is already established in Phase 15 popup history work. The activity browser is a sibling panel using the same show/hide mechanism and CSS custom property tokens.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Zero-dependency constraint verified against codebase; `fetch` + `credentials: 'include'` pattern confirmed by official Chrome docs; GraphQL-over-HTTP spec authoritative; graphql_client.ts complete implementation provided |
| Features | HIGH (scope) / MEDIUM (field availability) | P1 feature set verified against codebase pipeline; Trackman portal field availability at the activity list level (shot count, clubs) is MEDIUM — official Trackman Portal docs returned 403/404 |
| Architecture | HIGH | Based on direct source code inspection of all existing modules; service worker message pattern is established and verified; component boundaries are clear; build order is deterministic |
| Pitfalls | HIGH (Chrome behavior) / MEDIUM (Trackman-specific) | Service worker lifecycle, permission escalation, and popup lifecycle pitfalls all verified against official Chrome docs and community sources; Trackman schema stability is LOW — no official versioning docs |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **Trackman GraphQL field names (`Measurement` type):** No official schema available (docs returned 404). Must be resolved during Phase 2 by capturing a live API response via DevTools Network tab on `portal.trackmangolf.com` before implementing `portal_types.ts` and `portal_parser.ts`. This is the single most important implementation prerequisite.
- **Cookie forwarding reliability in service worker:** STACK.md recommends `credentials: 'include'`; PITFALLS.md documents community-confirmed unreliability. Test the simpler approach first during Phase 2 health-check verification; adopt `chrome.cookies.getAll()` explicit injection if it fails. This affects whether `"cookies"` permission is required.
- **Activity list field availability:** Whether `strokeCount`, `type`, and club information are available in the `me.activities` list-level query (vs. requiring a per-session `node(id)` detail query) is unknown. Affects activity list rendering strategy and number of GraphQL round trips.
- **Session deduplication identity:** The mapping between interceptor `report_id` values and GraphQL activity IDs is unknown. A same-day/same-shot-count heuristic is fragile; determine whether Trackman exposes a stable cross-path session identifier during Phase 2 API inspection.

## Sources

### Primary (HIGH confidence)
- [Chrome Extensions: Cross-origin network requests](https://developer.chrome.com/docs/extensions/develop/concepts/network-requests) — service worker fetch + `host_permissions`; CORS exemption behavior
- [Chrome Extensions: Declare permissions](https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions) — `optional_host_permissions` syntax; permission escalation behavior on update
- [Chrome Extensions: Permission warnings](https://developer.chrome.com/docs/extensions/develop/concepts/permission-warnings) — Chrome compares warning message sets before/after update to determine privilege escalation
- [Longer extension service worker lifetimes — Chrome 110+](https://developer.chrome.com/blog/longer-esw-lifetimes) — 30s idle timer reset via extension API calls; event-driven lifetime behavior
- [GraphQL over HTTP specification](https://graphql.org/learn/serving-over-http/) — POST body shape; HTTP 200 returned for application-level errors
- [Relay Global Object Identification Spec](https://relay.dev/graphql/objectidentification.htm) — IDs are opaque; base64 encoding is a convention, not a contract
- Existing codebase (`serviceWorker.ts`, `manifest.json`, `models/types.ts`, `shared/constants.ts`) — confirmed message patterns, `SessionData` shape, storage keys, pipeline entry points (HIGH confidence, source reviewed directly)

### Secondary (MEDIUM confidence)
- [Cookie-based Authentication for MV3 extensions — Borys Melnyk](https://boryssey.medium.com/cookie-based-authentication-for-your-browser-extension-and-web-app-mv3-4837d7603f54) — `credentials: 'include'` + `host_permissions` sends domain cookies from background script
- [Cookies in Service Worker — chromium-extensions Google Group](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/RMUtNEhR0R8) — community-confirmed: cookies not automatically attached in service worker fetch; `chrome.cookies.getAll()` workaround
- [Message port closed before response — chromium-extensions community](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/alX5FusNQMI) — popup closing destroys message channel; `sendResponse` fails silently
- [Optional Host Permissions in MV3 — chromium-extensions Google Group](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/EnUmtHWOI9o) — `optional_host_permissions` do not trigger extension disable on update
- [Trackman Help Center — Portal: My Activities](https://support.trackmangolf.com/hc/en-us/articles/28111485485083-Portal-Player-My-Activities-Within-The-Golf-Portal) — activity list fields (returned 403 on direct fetch; summary from search snippet only)

### Tertiary (LOW confidence — needs validation during implementation)
- [Trackman Cloud API docs](https://dr-cloud-api-docs-dev.trackmangolfdev.com/graphql/graphql/) — returned 404; Trackman does not publish an open API schema; absence of documentation is itself a finding regarding schema stability
- [Trackman Range API — Activity Management](https://docs.trackmanrange.com/activities/activity-management/) — Range API, not Player API; schema may differ; returned 404 on direct fetch

---
*Research completed: 2026-03-26*
*Ready for roadmap: yes*
