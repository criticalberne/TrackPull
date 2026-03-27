---
phase: 23-graphql-to-sessiondata-parser
plan: 01
subsystem: data-pipeline
tags: [parser, graphql, sessiondata, tdd, portal]
dependency_graph:
  requires:
    - src/models/types.ts (SessionData, Shot, ClubGroup interfaces)
    - src/shared/unit_normalization.ts (MetricValue type)
  provides:
    - src/shared/portal_parser.ts (parsePortalActivity, extractActivityUuid)
  affects:
    - Phase 24 integration (portal_parser consumed to wire GraphQL fetch to SessionData)
    - src/shared/history.ts (report_id dedup works because UUID is extracted correctly)
tech_stack:
  added: []
  patterns:
    - Static alias map (GRAPHQL_METRIC_ALIAS) for camelCase -> PascalCase normalization
    - Pass-through toPascalCase for unknown future fields (D-01 anti-filter pattern)
    - try/catch wrapper around entire parser (null on any exception)
    - btoa/atob UUID extraction from Trackman SessionActivity base64 format
key_files:
  created:
    - src/shared/portal_parser.ts
    - tests/test_portal_parser.ts
  modified: []
decisions:
  - "GRAPHQL_METRIC_ALIAS is a standalone static constant — does not import METRIC_KEYS from interceptor.ts to avoid accidentally filtering unknown future fields"
  - "Metric values stored as strings (template literal) matching interceptor output convention"
  - "Strokes with no valid numeric measurements are excluded; club groups with no valid strokes are excluded"
  - "report_id = extractActivityUuid(activity.id) for dedup compatibility with history.ts filter"
metrics:
  duration: "2 minutes"
  completed_date: "2026-03-27"
  tasks_completed: 2
  files_created: 2
  files_modified: 0
  tests_added: 21
  tests_total: 311
---

# Phase 23 Plan 01: GraphQL-to-SessionData Parser Summary

**One-liner:** Pure data transformation module converting GraphQL activity responses to SessionData via static alias map and base64 UUID extraction.

## Tasks Completed

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 | Write failing test suite for portal parser behaviors | 0652f62 | tests/test_portal_parser.ts |
| 2 | Implement portal_parser.ts to pass all tests | e7b4b75 | src/shared/portal_parser.ts |

## What Was Built

`src/shared/portal_parser.ts` — the data bridge between the Phase 22 GraphQL client and the existing export/history pipeline. Two exported functions:

- `parsePortalActivity(activity: GraphQLActivity): SessionData | null` — converts a full activity response to SessionData; returns null on any malformed input
- `extractActivityUuid(base64Id: string): string` — decodes Trackman's `btoa("SessionActivity\n<uuid>")` format to extract the UUID for dedup identity

Four exported interfaces used by Phase 24: `GraphQLActivity`, `GraphQLStrokeGroup`, `GraphQLStroke`, `StrokeMeasurement`.

Key behaviors:
- `GRAPHQL_METRIC_ALIAS` maps all 29 METRIC_KEYS camelCase variants to PascalCase names
- Unknown fields beyond the 29 are normalized via `toPascalCase()` — not filtered out (D-01)
- Null/undefined/NaN measurement values are omitted from shot metrics
- Metric values stored as strings for consistency with interceptor output
- `url_type: "activity"` and `metadata_params: { activity_id: <raw_base64> }` are set
- `report_id` is the decoded UUID (not raw base64) for dedup compatibility with history.ts

## Test Results

- 21 tests added in `tests/test_portal_parser.ts`
- All 311 tests in full suite pass (0 regressions)
- TDD: RED at Task 1 (import failed), GREEN at Task 2

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — `parsePortalActivity` is fully wired. Phase 24 will call this parser from the GraphQL fetch flow to produce live SessionData.

## Self-Check: PASSED

- `src/shared/portal_parser.ts` exists: FOUND
- `tests/test_portal_parser.ts` exists: FOUND
- Commit 0652f62 exists: FOUND (test(23-01): add failing test suite for portal parser)
- Commit e7b4b75 exists: FOUND (feat(23-01): implement portal parser with alias map and UUID extraction)
- `npx vitest run tests/test_portal_parser.ts` exits 0: PASSED (21/21)
- `npx vitest run` exits 0: PASSED (311/311)
- `grep -c "export function" src/shared/portal_parser.ts` = 2: PASSED
- `grep -c "export interface" src/shared/portal_parser.ts` = 4: PASSED
- No `METRIC_KEYS.has(` or `import.*METRIC_KEYS` in functional code: PASSED
