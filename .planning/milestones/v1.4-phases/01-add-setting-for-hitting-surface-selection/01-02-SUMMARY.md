---
phase: 01-add-setting-for-hitting-surface-selection
plan: 02
subsystem: testing
tags: [chrome-extension, vitest, csv, tsv, ai-prompt, unit-tests]

# Dependency graph
requires:
  - phase: 01-add-setting-for-hitting-surface-selection
    plan: 01
    provides: "hittingSurface optional param on writeCsv, writeTsv, assemblePrompt"
provides:
  - Unit tests for hitting surface metadata in CSV output (3 tests)
  - Unit tests for hitting surface metadata in TSV output (3 tests)
  - Unit tests for hitting surface in AI prompt context header (4 tests - 11 total)
  - Rebuilt dist/ artifacts with surface feature compiled in
affects:
  - Any future plan adding test coverage for CSV/TSV/prompt builder

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Vitest describe/it/expect pattern for optional param presence/absence verification
    - makeSession factory pattern reused from test_csv_writer_units.ts

key-files:
  created:
    - tests/test_hitting_surface.ts
  modified:
    - dist/popup.html
    - dist/popup.js
    - dist/background.js

key-decisions:
  - "11 tests written (exceeds 7 minimum) to thoroughly cover Mat, Grass, and undefined cases across all three output paths"
  - "Tests use BuiltInPrompt type for the minimal test prompt fixture (requires tier/topic fields unlike CustomPrompt)"

patterns-established:
  - "Test both presence (surface set) and absence (surface undefined) for every output path"

requirements-completed: []

# Metrics
duration: 3min
completed: 2026-03-03
---

# Phase 01 Plan 02: Write Hitting Surface Tests and Rebuild Extension Summary

**11 vitest unit tests verifying hitting surface metadata in CSV, TSV, and AI prompt output, plus dist/ rebuilt with all surface changes compiled**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-03T03:06:03Z
- **Completed:** 2026-03-03T03:09:00Z
- **Tasks:** 2
- **Files modified:** 4 (1 test file + 3 dist artifacts)

## Accomplishments
- 11 unit tests verify CSV prepends "Hitting Surface: Mat/Grass" as first line when param set
- Tests confirm CSV/TSV first line is column headers (not surface header) when param omitted
- Tests confirm AI prompt context header includes "| Surface: Mat/Grass" pipe-separated when set
- All 247 tests pass — no regressions in existing 236-test suite
- Extension dist/ rebuilt and verified: surface-select in popup.html, cachedSurface in popup.js, hittingSurface in background.js

## Task Commits

Each task was committed atomically:

1. **Task 1: Write tests for surface metadata in CSV, TSV, and prompt output** - `3105ccf` (test)
2. **Task 2: Rebuild extension and run full test suite** - `55b5efc` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `tests/test_hitting_surface.ts` - 11 vitest tests covering CSV, TSV, and prompt builder surface metadata
- `dist/popup.html` - Rebuilt with surface dropdown (surface-select element present)
- `dist/popup.js` - Rebuilt with cachedSurface logic compiled in
- `dist/background.js` - Rebuilt with hittingSurface storage key reference

## Decisions Made
- Used BuiltInPrompt type for test fixture (requires tier/topic) — CustomPrompt lacks those fields but PromptItem accepts both
- 11 tests written instead of 7 minimum to include Grass variant for TSV and both Grass/absent for prompt builder

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Hitting surface feature is fully tested end-to-end with unit tests
- All 247 tests pass with no regressions
- dist/ rebuilt and ready for Chrome extension loading
- Phase 01 is now fully complete (both plans done)

## Self-Check: PASSED

- `tests/test_hitting_surface.ts` confirmed created with 143 lines (11 tests)
- Task commits 3105ccf and 55b5efc verified in git history
- dist/ artifacts verified: surface-select (2 occurrences in popup.html), cachedSurface (8 occurrences in popup.js), hittingSurface (4 occurrences in background.js)
- All 247 tests passing confirmed via `npx vitest run`

---
*Phase: 01-add-setting-for-hitting-surface-selection*
*Completed: 2026-03-03*
