---
phase: 05-foundation-modules
plan: "03"
subsystem: ai
tags: [prompt-builder, tsv, clipboard, typescript, chrome-extension]

# Dependency graph
requires:
  - phase: 05-01
    provides: writeTsv() function that produces TSV data strings
  - phase: 05-02
    provides: BuiltInPrompt interface and BUILTIN_PROMPTS constants

provides:
  - assemblePrompt() pure function that combines prompt template + TSV data + optional metadata
  - buildUnitLabel() helper converting UnitChoice to human-readable string
  - countSessionShots() helper summing shots across club_groups
  - PromptMetadata interface for session context (date, shotCount, unitLabel)

affects:
  - 06-clipboard-copy-ai-launch

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Pure function module with no side effects or storage access
    - Minimal type signatures to avoid cross-module coupling (countSessionShots avoids SessionData import)
    - {{DATA}} placeholder injection pattern for prompt template assembly

key-files:
  created:
    - src/shared/prompt_builder.ts
    - tests/test_prompt_builder.ts
  modified: []

key-decisions:
  - "assemblePrompt replaces only the first {{DATA}} occurrence via String.replace (single data injection point per template)"
  - "PromptMetadata is optional to support callers that don't have session context available"
  - "countSessionShots uses minimal anonymous type instead of SessionData to keep prompt_builder.ts decoupled from model layer"

patterns-established:
  - "Optional metadata pattern: metadata?: PromptMetadata passed to assemblePrompt, no metadata = no context header"
  - "Context header format: 'Session: {date} | {shotCount} shots | Units: {unitLabel}' separated from TSV by blank line"

requirements-completed:
  - PRMT-01

# Metrics
duration: 1min
completed: 2026-03-02
---

# Phase 5 Plan 03: Prompt Builder Module Summary

**Pure assemblePrompt() function that combines BuiltInPrompt templates with TSV data and optional session metadata into clipboard-ready strings**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-02T18:49:00Z
- **Completed:** 2026-03-02T18:50:00Z
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments

- Created `prompt_builder.ts` with three pure exported functions: `assemblePrompt`, `buildUnitLabel`, `countSessionShots`
- `assemblePrompt` handles optional `PromptMetadata` prepending a context header (`Session: date | N shots | Units: label`) separated from TSV by a blank line
- Created `test_prompt_builder.ts` with 13 tests covering basic assembly, metadata behavior, integration with real `BUILTIN_PROMPTS`, and helper functions
- Full test suite passes (214 tests across 10 files) and build succeeds with no errors

## Task Commits

Each task was committed atomically:

1. **Task C1: Create src/shared/prompt_builder.ts** - `7a73c4e` (feat)
2. **Task C2: Create tests/test_prompt_builder.ts** - `e31edc7` (test)
3. **Task C3: Run full test suite and build** - verified inline (no separate commit; all tests passed on first run)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/shared/prompt_builder.ts` - Pure functions: assemblePrompt, buildUnitLabel, countSessionShots, PromptMetadata interface
- `tests/test_prompt_builder.ts` - 13 unit tests covering all functions and edge cases

## Decisions Made

- `assemblePrompt` uses `String.replace("{{DATA}}", dataBlock)` which replaces only the first occurrence — appropriate since all templates have exactly one `{{DATA}}` placeholder
- `countSessionShots` takes a minimal anonymous type `{ club_groups: Array<{ shots: unknown[] }> }` rather than importing `SessionData` to keep `prompt_builder.ts` decoupled from the model layer
- `PromptMetadata` is exported as an interface so Phase 6 popup.ts can reference it directly

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All three foundation modules are now complete: `tsv_writer.ts` (05-01), `prompt_types.ts` (05-02), `prompt_builder.ts` (05-03)
- Phase 6 (Clipboard Copy and AI Launch) can now import `writeTsv`, `BUILTIN_PROMPTS`, `assemblePrompt`, `buildUnitLabel`, and `countSessionShots` to wire the popup together
- No blockers for Phase 6

---
*Phase: 05-foundation-modules*
*Completed: 2026-03-02*
