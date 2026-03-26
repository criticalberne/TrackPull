---
phase: 22-graphql-client-cookie-auth
plan: 01
subsystem: api

tags: [graphql, fetch, credentials, cookie-auth, typescript]

# Dependency graph
requires:
  - phase: 21-manifest-permissions-foundation
    provides: portalPermissions.ts with hasPortalPermission/requestPortalPermission helpers

provides:
  - src/shared/graphql_client.ts with executeQuery, classifyAuthResult, HEALTH_CHECK_QUERY, AuthStatus, GraphQLResponse
  - Typed GraphQL client using browser session cookies via credentials:include
  - Auth classification logic distinguishing authenticated/unauthenticated/error states

affects: [22-02, 23-session-fetching, 24-session-import, 25-session-data-parsing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Generic executeQuery<T> returning typed GraphQLResponse<T> envelope"
    - "credentials: include on fetch — ambient browser cookie auth, no token management"
    - "classifyAuthResult classifies errors by code and message substring matching"
    - "Pattern matches portalPermissions.ts — shared module usable by both popup and service worker"

key-files:
  created:
    - src/shared/graphql_client.ts
    - tests/test_graphql_client.ts
  modified: []

key-decisions:
  - "credentials: include on fetch — ambient browser cookies, zero token management overhead"
  - "classifyAuthResult checks error code first (UNAUTHENTICATED), then message substrings (unauthorized, unauthenticated, not logged in), then falls through to generic error"
  - "HEALTH_CHECK_QUERY targets me { id } — minimal query sufficient for auth detection"
  - "executeQuery throws on non-2xx HTTP — caller handles; classifyAuthResult handles GraphQL-layer errors"

patterns-established:
  - "classifyAuthResult pattern: errors.length > 0 check before data check avoids trusting data when server reports error"
  - "GraphQLResponse<T> generic envelope: data T|null and optional errors array matches GraphQL spec"

requirements-completed: [PERM-02, RESIL-03]

# Metrics
duration: 6min
completed: 2026-03-26
---

# Phase 22 Plan 01: GraphQL Client — executeQuery, classifyAuthResult, and HEALTH_CHECK_QUERY via fetch with credentials:include

**Typed GraphQL client using ambient browser session cookies, with auth classification distinguishing unauthenticated/error/authenticated states from GraphQL response shape**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-26T22:29:00Z
- **Completed:** 2026-03-26T22:30:05Z
- **Tasks:** 1 (TDD — RED + GREEN commits)
- **Files modified:** 2

## Accomplishments

- Created `src/shared/graphql_client.ts` with `executeQuery<T>`, `classifyAuthResult`, `HEALTH_CHECK_QUERY`, `GRAPHQL_ENDPOINT`, `GraphQLResponse`, and `AuthStatus` — all exported
- Written 16 tests covering PERM-02, PERM-03, and RESIL-03 — POST method, credentials include, Content-Type header, HTTP error throwing, extra-field tolerance, auth/unauth/error classification
- Full test suite passes: 308/308 tests (16 new + 292 existing), zero regressions

## Task Commits

TDD RED → GREEN cycle:

1. **RED: Failing tests for graphql_client** - `6c8ebde` (test)
2. **GREEN: Implement graphql_client module** - `7768e4d` (feat)

## Files Created/Modified

- `src/shared/graphql_client.ts` - GraphQL client: GRAPHQL_ENDPOINT constant, executeQuery generic function, classifyAuthResult, HEALTH_CHECK_QUERY, GraphQLResponse interface, AuthStatus union type
- `tests/test_graphql_client.ts` - 16 tests: 5 for executeQuery, 10 for classifyAuthResult, 1 for HEALTH_CHECK_QUERY content

## Decisions Made

- `credentials: "include"` on fetch — ambient browser session cookies, no token management needed; simpler than extracting/forwarding cookies manually
- `classifyAuthResult` checks `errors.length > 0` first — if server sends error codes alongside partial data, the error takes priority over any data field
- Auth keyword matching covers both `code === "UNAUTHENTICATED"` and message substrings (`unauthorized`, `unauthenticated`, `not logged in`) — defensive against API inconsistencies seen in research
- `executeQuery` throws on non-2xx HTTP — separates network/HTTP failures (caller handles) from GraphQL application errors (classifyAuthResult handles)

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- Worktree branch was behind `master` and missing `portalPermissions.ts` and other Phase 21 files. Merged `master` into the worktree branch before beginning implementation to ensure a complete codebase baseline.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `src/shared/graphql_client.ts` is complete and tested; Plan 02 (popup auth check + not-logged-in UX) can import directly
- `classifyAuthResult` handles all three output states (`authenticated`, `unauthenticated`, `error`) needed for Plan 02 UI branching
- Service worker `PORTAL_IMPORT_REQUEST` stub (Phase 21) is ready to be replaced with real `executeQuery` calls in Phase 22 Plan 02

---
*Phase: 22-graphql-client-cookie-auth*
*Completed: 2026-03-26*
