---
phase: 15-session-history-ui
plan: 01
subsystem: ui
tags: [chrome-extension, history, csv-export, pure-functions]

# Dependency graph
requires:
  - phase: 14-session-history-storage
    provides: history.ts saveSessionToHistory, HistoryEntry/SessionSnapshot types
provides:
  - deleteSessionFromHistory and clearAllHistory exports in history.ts
  - formatRelativeDate, formatClubSummary, countSnapshotShots pure helpers
  - EXPORT_CSV_FROM_DATA message handler in service worker
affects: [15-session-history-ui]

# Tech tracking
tech-stack:
  added: []
  patterns: [pure-helper-module for UI formatting, inline-data CSV export pattern]

key-files:
  created:
    - src/popup/history_helpers.ts
    - tests/test_history_helpers.ts
  modified:
    - src/shared/history.ts
    - src/background/serviceWorker.ts
    - tests/test_history.ts

key-decisions:
  - "formatClubSummary truncates at 3 clubs with +N more suffix"
  - "EXPORT_CSV_FROM_DATA mirrors EXPORT_CSV_REQUEST logic but accepts inline SessionData"

patterns-established:
  - "Pure helper module pattern: stateless formatting functions in separate file for testability"

requirements-completed: [HIST-04, HIST-08, HIST-09]

# Metrics
duration: 2min
completed: 2026-03-06
---

# Phase 15 Plan 01: Session History Backend Contracts Summary

**Delete/clear history functions, date/club formatting helpers, and inline CSV export message handler for historical sessions**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-06T05:40:54Z
- **Completed:** 2026-03-06T05:42:50Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Added deleteSessionFromHistory and clearAllHistory to history.ts with full error handling
- Created history_helpers.ts with 3 pure formatting functions (formatRelativeDate, formatClubSummary, countSnapshotShots)
- Added EXPORT_CSV_FROM_DATA handler to service worker enabling CSV export from historical session data
- 20 tests passing across both test files

## Task Commits

Each task was committed atomically:

1. **Task 1: Add delete/clear functions and pure helpers (TDD)** - `2e2546b` (feat)
2. **Task 2: Add EXPORT_CSV_FROM_DATA message type** - `91ee1e8` (feat)

_Task 1 used TDD: RED tests confirmed failing, then GREEN implementation passed all tests._

## Files Created/Modified
- `src/shared/history.ts` - Added deleteSessionFromHistory and clearAllHistory exports
- `src/popup/history_helpers.ts` - New pure helper module with formatRelativeDate, formatClubSummary, countSnapshotShots
- `src/background/serviceWorker.ts` - Added EXPORT_CSV_FROM_DATA handler mirroring existing CSV export logic
- `tests/test_history.ts` - Added 8 tests for delete/clear functions
- `tests/test_history_helpers.ts` - New test file with 8 tests for pure helper functions

## Decisions Made
- formatClubSummary truncates at 3 clubs with "+N more" suffix (balances info density with space)
- EXPORT_CSV_FROM_DATA mirrors EXPORT_CSV_REQUEST exactly but takes inline data instead of reading TRACKMAN_DATA from storage

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All backend contracts ready for Plan 02 to wire into popup UI
- deleteSessionFromHistory, clearAllHistory, formatRelativeDate, formatClubSummary, countSnapshotShots all exported and tested
- EXPORT_CSV_FROM_DATA message type ready for popup to send historical session data for CSV export

---
*Phase: 15-session-history-ui*
*Completed: 2026-03-06*
