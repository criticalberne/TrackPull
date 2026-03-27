# Phase 24: Service Worker Import Flow - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning

<domain>
## Phase Boundary

The service worker gains two new message handlers — FETCH_ACTIVITIES (fetches the activity list from the Trackman GraphQL API) and IMPORT_SESSION (imports a specific activity's shot data, parses it via the Phase 23 portal parser, and saves to history). Import status is persisted to `chrome.storage.local` so the popup can display results even if closed and reopened mid-import. No activity browser UI, no filtering, no time-period grouping — those are Phase 25.

</domain>

<decisions>
## Implementation Decisions

### Import Status Model
- **D-01:** Simple result-only status — store final state: `idle` / `importing` / `success` / `error`. No intermediate progress tracking. The import is fast (1-2 seconds) and doesn't warrant step-by-step progress.
- **D-02:** Auto-clear on read — when the popup opens and reads a `success` or `error` status, it displays the result (toast or inline) then clears the storage key. Prevents stale messages from hours ago.
- **D-03:** Single global status key in `chrome.storage.local` (e.g., `IMPORT_STATUS`) — not per-activity. One import runs at a time, so a single key suffices.

### Concurrent Imports
- **D-04:** One import at a time. The popup disables the Import button while an import is in progress. No queuing, no parallelism. Avoids race conditions on the single global status key.

### Activity List Caching
- **D-05:** Always re-fetch the activity list on every popup open — no caching. Activities change frequently and the GraphQL call is fast. No staleness risk, no cache invalidation logic.

### Activity Page Size
- **D-06:** Claude's Discretion — researcher picks the right page size based on what the GraphQL API supports. User doesn't have a strong preference.

### Error Handling
- **D-07:** Store error to status key, no automatic retry. User can manually re-try by clicking Import again. Keeps the flow simple and avoids MV3 service worker idle timeout concerns with retries.
- **D-08:** Auth-specific error messages — reuse `classifyAuthResult()` from Phase 22's `graphql_client.ts` to detect UNAUTHENTICATED errors. Show "Session expired — log into portal.trackmangolf.com" with a link. Both FETCH_ACTIVITIES and IMPORT_SESSION handlers detect and surface auth errors.
- **D-09:** Empty activity handling — if an activity has no strokes, show "No shot data found for this activity" rather than saving an empty session to history. Prevents confusing zero-shot entries.

### Claude's Discretion
- Internal structure of the FETCH_ACTIVITIES and IMPORT_SESSION handlers
- GraphQL query shape for fetching activities (field selection, pagination variables)
- How the import status object is structured in storage (exact field names)
- Whether to extract shared error-classification logic or inline it per handler
- How to wire the portal parser (Phase 23) into the import flow

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Service Worker & Message Handling
- `src/background/serviceWorker.ts` — Current service worker with existing message handlers (SAVE_DATA, GET_DATA, EXPORT_CSV_REQUEST, PORTAL_AUTH_CHECK, PORTAL_IMPORT_REQUEST stub at lines 160-171)
- `src/shared/constants.ts` — Storage keys and constants; new IMPORT_STATUS key will be added here

### GraphQL Client & Auth
- `src/shared/graphql_client.ts` — `executeQuery()`, `GraphQLResponse<T>`, `classifyAuthResult()`, `AuthStatus` type, `HEALTH_CHECK_QUERY`
- `src/shared/portalPermissions.ts` — `hasPortalPermission()` — must check before any portal API call

### Parser & Data Pipeline
- `src/shared/portal_parser.ts` (Phase 23 output) — Maps GraphQL Measurement fields to SessionData format; alias map; UUID extraction from base64 activity ID
- `src/models/types.ts` — `SessionData`, `Shot`, `ClubGroup`, `SessionSnapshot`, `HistoryEntry`
- `src/shared/history.ts` — `saveSessionToHistory()` — deduplicates by `report_id`, evicts oldest at cap

### Requirements
- `.planning/REQUIREMENTS.md` §BROWSE-02 — User can select a single activity and import its full shot data
- `.planning/REQUIREMENTS.md` §PIPE-02 — Imported session supports CSV export, TSV copy, AI launch, and history storage
- `.planning/REQUIREMENTS.md` §RESIL-01 — Session import continues in service worker even if popup is closed
- `.planning/REQUIREMENTS.md` §RESIL-02 — Popup reads import status from storage on open/re-open

### Prior Phase Context
- `.planning/phases/22-graphql-client-cookie-auth/22-CONTEXT.md` — Auth check timing, inline error messaging pattern, PortalState union
- `.planning/phases/23-graphql-to-sessiondata-parser/23-CONTEXT.md` — Field coverage (all 60+ fields), dedup identity (UUID as report_id), portal wins on dedup, PascalCase normalization

### Architecture & Conventions
- `.planning/codebase/ARCHITECTURE.md` — Extension architecture (service worker as central hub, message-based IPC)
- `.planning/codebase/CONVENTIONS.md` — Naming patterns, import organization, code style

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `executeQuery<T>()` in `graphql_client.ts` — Generic typed GraphQL execution with cookie auth, ready to use for both activity fetching and session import queries
- `classifyAuthResult()` in `graphql_client.ts` — Auth error detection logic, reusable for differentiating auth failures from other errors in both handlers
- `saveSessionToHistory()` in `history.ts` — Fire-and-forget history save with dedup by `report_id`, already handles eviction at 20-session cap
- `hasPortalPermission()` in `portalPermissions.ts` — Permission gate before any portal API call
- `PORTAL_IMPORT_REQUEST` stub in `serviceWorker.ts` (lines 160-171) — Placeholder handler to be replaced with actual implementation

### Established Patterns
- Fire-and-forget with error broadcasting: `saveSessionToHistory()` call on line 72 of serviceWorker.ts shows the pattern — async operation that doesn't block response, errors broadcast via `chrome.runtime.sendMessage`
- Message handler structure: Each handler checks preconditions, does async work in an IIFE, calls `sendResponse()`, returns `true` for async response
- Storage-based state sharing: Extension uses `chrome.storage.local` + `storage.onChanged` listener for cross-context communication (service worker ↔ popup)

### Integration Points
- `PORTAL_IMPORT_REQUEST` handler stub — replace with IMPORT_SESSION logic
- New `FETCH_ACTIVITIES` message type — add to `RequestMessage` union type
- New `IMPORT_STATUS` storage key — add to `STORAGE_KEYS` in constants.ts
- Phase 25 (Activity Browser UI) will consume FETCH_ACTIVITIES responses and trigger IMPORT_SESSION

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

*Phase: 24-service-worker-import-flow*
*Context gathered: 2026-03-26*
