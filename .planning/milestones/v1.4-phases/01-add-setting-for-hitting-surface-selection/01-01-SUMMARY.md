---
phase: 01-add-setting-for-hitting-surface-selection
plan: 01
subsystem: ui
tags: [chrome-extension, storage, csv, tsv, ai-prompt, popup]

# Dependency graph
requires: []
provides:
  - Surface dropdown (Mat/Grass) in popup with chrome.storage.local persistence
  - HITTING_SURFACE storage key in STORAGE_KEYS constant
  - hittingSurface optional param on writeCsv — prepends "Hitting Surface: {value}" metadata line
  - hittingSurface optional param on writeTsv — prepends "Hitting Surface: {value}" metadata line
  - hittingSurface optional field on PromptMetadata — appends "| Surface: {value}" to AI context header
  - serviceWorker reads surface from storage with Mat default and passes to writeCsv
affects:
  - Any future plan that extends CSV/TSV export format
  - Any future plan that modifies popup unit selectors UI
  - Any future plan that builds on PromptMetadata or assemblePrompt

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Optional last parameter pattern for output functions (hittingSurface?) — preserves all callers
    - Module-level cachedSurface variable pattern matching cachedUnitChoice in popup.ts
    - Batch storage.get for unit + surface in single call (no separate storage reads)

key-files:
  created: []
  modified:
    - src/shared/constants.ts
    - src/popup/popup.html
    - src/popup/popup.ts
    - src/shared/csv_writer.ts
    - src/shared/tsv_writer.ts
    - src/shared/prompt_builder.ts
    - src/background/serviceWorker.ts
    - dist/background.js
    - dist/popup.js

key-decisions:
  - "Mat is first in dropdown and the default value — matches user decision from context session"
  - "Surface param is optional on all writer functions — preserves all existing callers and tests unchanged"
  - "serviceWorker defaults to Mat when HITTING_SURFACE key not yet set (fresh install before popup opened)"
  - "Surface batched with SPEED_UNIT and DISTANCE_UNIT in single storage.get call in popup.ts"
  - "TSV and CSV use identical metadata header format: 'Hitting Surface: {value}' as first line"
  - "AI context header uses pipe-separated format: '| Surface: {value}' appended to existing header"

patterns-established:
  - "Optional metadata params as last function argument to preserve backward compatibility"
  - "cachedSurface follows cachedUnitChoice pattern: resolved on load, updated on change event"

requirements-completed: []

# Metrics
duration: 3min
completed: 2026-03-03
---

# Phase 01 Plan 01: Add Hitting Surface Setting Summary

**Hitting surface preference (Mat/Grass) added to popup with storage persistence, threaded through CSV/TSV exports as a metadata header line and appended to AI prompt context header**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-03T02:59:04Z
- **Completed:** 2026-03-03T03:02:12Z
- **Tasks:** 2
- **Files modified:** 9 (7 source + 2 dist)

## Accomplishments
- Surface dropdown with Mat/Grass options added to popup .unit-selectors alongside Speed and Distance
- Surface preference persists via chrome.storage.local and defaults to Mat on fresh install
- CSV exports now start with "Hitting Surface: Mat" (or Grass) before column headers
- TSV clipboard copy now starts with "Hitting Surface: Mat" (or Grass) before column headers
- AI prompt context header now includes "| Surface: Mat" (or Grass) pipe-separated metadata
- All 236 existing tests pass unchanged (all new parameters are optional)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add surface storage key, popup dropdown, and popup handler** - `eaab69d` (feat)
2. **Task 2: Thread surface through CSV, TSV, prompt, and service worker output paths** - `2b8d0a3` (feat)

## Files Created/Modified
- `src/shared/constants.ts` - Added HITTING_SURFACE: "hittingSurface" to STORAGE_KEYS
- `src/popup/popup.html` - Added Surface dropdown (Mat/Grass) inside .unit-selectors
- `src/popup/popup.ts` - Added cachedSurface variable, storage load/save, passes to all three output callers
- `src/shared/csv_writer.ts` - Added optional hittingSurface param, prepends metadata line to output
- `src/shared/tsv_writer.ts` - Added optional hittingSurface param, prepends metadata line to output
- `src/shared/prompt_builder.ts` - Added hittingSurface to PromptMetadata interface, appends to context header
- `src/background/serviceWorker.ts` - Reads HITTING_SURFACE from storage, passes to writeCsv with Mat default

## Decisions Made
- Mat is first in dropdown and the default — matches user decision from context session
- Surface param is optional on all output functions — all callers and tests unchanged
- Service worker defaults to Mat on fresh install (HITTING_SURFACE key not yet written)
- Surface batched into existing SPEED_UNIT/DISTANCE_UNIT storage.get call in popup.ts
- TSV and CSV use identical first-line format: "Hitting Surface: {value}"
- AI context header uses pipe-separated format consistent with existing "| Units: {label}" style

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Hitting surface feature is fully wired end-to-end and ready to use
- Extension builds successfully; dist/ updated with compiled output
- No blockers for future phases

## Self-Check: PASSED

All modified source files confirmed present. Both task commits (eaab69d, 2b8d0a3) verified in git history. SUMMARY.md created.

---
*Phase: 01-add-setting-for-hitting-surface-selection*
*Completed: 2026-03-03*
