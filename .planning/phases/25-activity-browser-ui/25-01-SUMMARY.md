---
phase: 25
plan: 01
subsystem: popup-ui
tags: [activity-browser, data-model, helper-functions, tdd, html-scaffold]
dependency_graph:
  requires: [phase-24]
  provides: [activity-helpers-module, expanded-activity-summary, popup-html-scaffold]
  affects: [popup.html, serviceWorker.ts, import_types.ts]
tech_stack:
  added: [activity_helpers.ts]
  patterns: [pure-functions-for-testability, tdd-red-green, css-custom-properties-for-dark-mode]
key_files:
  created:
    - src/shared/activity_helpers.ts
    - tests/test_activity_browser.ts
  modified:
    - src/shared/import_types.ts
    - src/background/serviceWorker.ts
    - src/popup/popup.html
    - tests/test_service_worker_import.ts
decisions:
  - "ActivitySummary strokeCount and type fields are nullable (null not undefined) to match JSON safety and intent"
  - "now parameter on formatActivityDate and getTimePeriod enables deterministic testing without Date mocking"
  - "strokeCount and type field names in FETCH_ACTIVITIES_QUERY are candidate names — may need adjustment after live API testing"
metrics:
  duration: ~8 minutes
  completed: "2026-03-27"
  tasks_completed: 2
  files_changed: 5
---

# Phase 25 Plan 01: Activity Browser — Data Model and Scaffold Summary

Expanded ActivitySummary with strokeCount and type, created a pure-function activity_helpers.ts module with TDD, and built the full HTML/CSS scaffold for the activity browser inside popup.html.

## Tasks Completed

### Task 1: Expand ActivitySummary, FETCH_ACTIVITIES_QUERY, service worker mapping, and create activity_helpers.ts with tests

**TDD: RED** — `test(25-01): add failing tests for activity browser helpers` — 738ce02

**TDD: GREEN** — `feat(25-01): expand ActivitySummary, add activity_helpers.ts, update service worker mapping` — 0ed5dac

- Added `strokeCount: number | null` and `type: string | null` to `ActivitySummary` interface in `import_types.ts`
- Expanded `FETCH_ACTIVITIES_QUERY` to request `strokeCount` and `type` from the Trackman GraphQL API
- Updated service worker `FETCH_ACTIVITIES` handler to map both fields with `?? null` fallbacks
- Created `src/shared/activity_helpers.ts` with four exported pure functions: `formatActivityDate`, `getTimePeriod`, `filterActivities`, `getUniqueTypes`
- 19 vitest tests passing across all helper functions

### Task 2: Build the activity browser HTML/CSS scaffold in popup.html

`feat(25-01): add activity browser HTML/CSS scaffold to popup.html` — 5638b40

- Added 17 CSS rule blocks using CSS custom property tokens (no hardcoded colors) for dark mode support
- Replaced the old `portal-import-btn` single button with a type filter `<select>` and a scrollable `activity-list-container` div
- Build succeeds: `bash scripts/build-extension.sh` exits 0

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated existing service worker test for expanded ActivitySummary shape**

- **Found during:** Full test suite run after Task 2 commit
- **Issue:** `test_service_worker_import.ts` expected FETCH_ACTIVITIES to return `{id, date}` objects. Our new mapping now returns `{id, date, strokeCount, type}` — the test mock omitted the new fields causing `null` vs missing key mismatch.
- **Fix:** Updated test to include `strokeCount` and `type` in mock node data and assert the full expanded ActivitySummary shape including `null` fallbacks for nodes without those fields.
- **Files modified:** `tests/test_service_worker_import.ts`
- **Commit:** f2a31a1

## Verification

- `npx vitest run tests/test_activity_browser.ts` — 19/19 tests pass
- `npx vitest run` — 371/371 tests pass (no regressions)
- `bash scripts/build-extension.sh` — exits 0

## Known Stubs

- `strokeCount` and `type` GraphQL field names in `FETCH_ACTIVITIES_QUERY` are candidate names. If the Trackman API schema uses different names, the service worker error path will fire on first live test. Field names may need adjustment after real API testing. This is noted in the SUMMARY — Plan 02 will wire these fields into the UI and live testing will validate them.

## Self-Check: PASSED

Files exist:
- src/shared/activity_helpers.ts — FOUND
- tests/test_activity_browser.ts — FOUND
- src/shared/import_types.ts — modified with strokeCount/type
- src/popup/popup.html — contains activity-list-container

Commits exist:
- 738ce02 — test(25-01): add failing tests for activity browser helpers
- 0ed5dac — feat(25-01): expand ActivitySummary, add activity_helpers.ts, update service worker mapping
- 5638b40 — feat(25-01): add activity browser HTML/CSS scaffold to popup.html
- f2a31a1 — fix(25-01): update FETCH_ACTIVITIES test to match expanded ActivitySummary shape
