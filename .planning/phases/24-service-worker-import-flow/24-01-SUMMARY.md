---
phase: 24-service-worker-import-flow
plan: "01"
subsystem: service-worker
tags: [graphql, import, service-worker, storage, resilience]
dependency_graph:
  requires:
    - src/shared/graphql_client.ts (executeQuery)
    - src/shared/portal_parser.ts (parsePortalActivity, GraphQLActivity)
    - src/shared/history.ts (saveSessionToHistory)
    - src/shared/portalPermissions.ts (hasPortalPermission)
    - src/shared/constants.ts (STORAGE_KEYS)
  provides:
    - FETCH_ACTIVITIES message handler in service worker
    - IMPORT_SESSION message handler in service worker
    - IMPORT_STATUS storage key for cross-context status communication
    - ImportStatus type union (idle/importing/success/error)
    - ActivitySummary interface
    - FETCH_ACTIVITIES_QUERY and IMPORT_SESSION_QUERY constants
  affects:
    - src/background/serviceWorker.ts (replaces PORTAL_IMPORT_REQUEST stub)
    - Popup (Phase 25) can now request activity list and trigger import
tech_stack:
  added: []
  patterns:
    - Fire-and-forget async import continuing after popup closes (RESIL-01)
    - IMPORT_STATUS written before sendResponse so storage reflects in-progress state immediately
    - Inline isAuthError() helper for auth detection without classifyAuthResult type constraint
key_files:
  created:
    - src/shared/import_types.ts
    - tests/test_service_worker_import.ts
  modified:
    - src/shared/constants.ts (IMPORT_STATUS key added to STORAGE_KEYS)
    - src/background/serviceWorker.ts (PORTAL_IMPORT_REQUEST replaced with FETCH_ACTIVITIES + IMPORT_SESSION)
decisions:
  - key: isAuthError inline helper instead of classifyAuthResult
    rationale: classifyAuthResult's typed signature expects { me: ... } response; generic activity/node queries don't match. Inline detection avoids unsafe type casting.
  - key: IMPORT_STATUS written synchronously before sendResponse
    rationale: RESIL-01 — popup may close after sendResponse returns; storage must reflect importing state before that happens so polling still shows progress
  - key: Empty activity check on parsePortalActivity returning null
    rationale: D-09 — storing an empty session would pollute history; explicit error status guides user to try a different activity
metrics:
  duration_seconds: 498
  completed_date: "2026-03-27"
  tasks_completed: 2
  files_changed: 4
  tests_added: 23
  tests_total: 352
---

# Phase 24 Plan 01: Service Worker Import Handlers Summary

**One-liner:** FETCH_ACTIVITIES and IMPORT_SESSION handlers in service worker using fire-and-forget async import with ImportStatus storage key for cross-context resilience (RESIL-01).

## What Was Built

Two new message handlers in `src/background/serviceWorker.ts` replace the `PORTAL_IMPORT_REQUEST` stub:

**FETCH_ACTIVITIES** — returns a paginated list of activity summaries (id + date) by querying the Trackman GraphQL API. Checks portal permission first, detects auth errors via inline `isAuthError()`, maps Relay connection edges to flat `ActivitySummary[]`.

**IMPORT_SESSION** — triggers a full portal session import. Key sequence:
1. Check portal permission
2. Write `IMPORT_STATUS = { state: "importing" }` to storage
3. Call `sendResponse({ success: true })` immediately (popup can now close safely)
4. Fetch activity via GraphQL, parse via `parsePortalActivity`, write to `TRACKMAN_DATA`, save to history, set `IMPORT_STATUS = { state: "success" }`

Supporting types: `ImportStatus` union (idle/importing/success/error), `ActivitySummary` interface, `FETCH_ACTIVITIES_QUERY`, `IMPORT_SESSION_QUERY` in new `src/shared/import_types.ts`. `IMPORT_STATUS` storage key added to `STORAGE_KEYS`.

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| isAuthError() inline helper | classifyAuthResult requires `{ me: ... }` typed response; generic node queries don't match; inline detection avoids unsafe cast |
| IMPORT_STATUS set before sendResponse | RESIL-01: popup may close after sendResponse; storage must already show "importing" before that |
| PIPE-02 via TRACKMAN_DATA write | All export/AI/history paths read from TRACKMAN_DATA; imported sessions must land there |
| Empty activity → error status | D-09: no shot data means nothing useful to store; explicit error guides user |

## Test Coverage

23 new tests in `tests/test_service_worker_import.ts`:
- 7 import_types + STORAGE_KEYS tests (constant values, type variants, query content)
- 7 FETCH_ACTIVITIES handler tests (permission denied, auth error x2, generic error, success, empty, network)
- 9 IMPORT_SESSION handler tests (return value, permission denied, RESIL-01 order, response-before-query, success path, empty activity D-09, auth error D-08, generic error, network exception)

Uses `vi.hoisted()` to inject `globalThis.chrome` before service worker module evaluation (only approach that works since serviceWorker.ts calls `chrome.runtime.onInstalled.addListener` at module load time).

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED
