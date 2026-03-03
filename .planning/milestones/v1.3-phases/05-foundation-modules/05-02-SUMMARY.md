---
phase: 05-foundation-modules
plan: "02"
subsystem: ai
tags: [typescript, prompt-library, skill-tiers, vitest]

# Dependency graph
requires: []
provides:
  - SkillTier type (beginner | intermediate | advanced)
  - BuiltInPrompt interface with id, name, tier, topic, template fields
  - BUILTIN_PROMPTS readonly array with 8 golf analysis prompt constants
affects: [06-clipboard-ai-launch, 07-options-custom-prompts]

# Tech tracking
tech-stack:
  added: []
  patterns: [TypeScript constants-only prompt library with as const, tier-stratified tone conventions for golf prompts]

key-files:
  created:
    - src/shared/prompt_types.ts
    - tests/test_prompt_types.ts
  modified: []

key-decisions:
  - "Built-in prompts are TypeScript constants only -- BUILTIN_PROMPTS is not stored in chrome.storage"
  - "BuiltInPrompt interface is read-only, enabling future custom prompts (mutable) to share the same topic/tier shape in Phase 7"
  - "All prompt templates include {{DATA}} placeholder for TSV data injection at clipboard-copy time"

patterns-established:
  - "Prompt tone ladder: beginner=friendly coach, intermediate=moderate depth with metric explanations, advanced=numbers-first data analyst"
  - "Prompt template structure: context-setting paragraph, data block ({{DATA}}), structured output instructions"

requirements-completed: [PRMT-01]

# Metrics
duration: 2min
completed: 2026-03-02
---

# Phase 5 Plan 02: Prompt Library Types and Constants Summary

**BuiltInPrompt TypeScript constant library with 8 tier-stratified golf analysis prompts covering session overview, club breakdown, consistency, launch/spin, distance gapping, shot shape, club delivery, and quick summary**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-02T18:44:04Z
- **Completed:** 2026-03-02T18:45:39Z
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments

- Defined `SkillTier` union type and `BuiltInPrompt` readonly interface exported from `src/shared/prompt_types.ts`
- Created `BUILTIN_PROMPTS` constant array with 8 prompts across all three tiers (3 beginner, 3 intermediate, 2 advanced), all required topics covered (overview, club-breakdown, consistency)
- All 14 vitest tests pass; all 183 total tests pass; build succeeds with no errors

## Task Commits

Each task was committed atomically:

1. **Task B1: Create src/shared/prompt_types.ts with types and 8 built-in prompts** - `4a75220` (feat)
2. **Task B2: Create tests/test_prompt_types.ts with validation tests** - `bbf0dc7` (feat)
3. **Task B3: Run tests and verify all pass** - (no separate commit; tests/build verified inline, no additional file changes)

**Plan metadata:** (docs commit created after SUMMARY.md)

## Files Created/Modified

- `src/shared/prompt_types.ts` - SkillTier type, BuiltInPrompt interface, BUILTIN_PROMPTS array (8 prompts)
- `tests/test_prompt_types.ts` - 14 vitest tests covering structure, tier distribution, required topics, and template quality

## Decisions Made

- Built-in prompts remain TypeScript constants only; chrome.storage is reserved for future user-created custom prompts (Phase 7) — avoids storage quota concerns and simplifies bundle
- `BuiltInPrompt` interface uses all-readonly fields, ensuring the constant array cannot be mutated at runtime
- Prompt templates are intentionally concise (all under 600 chars) to keep clipboard payloads manageable while remaining substantive

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `BUILTIN_PROMPTS` and `BuiltInPrompt` types are ready for use in Phase 5 Plan 03 (Prompt Builder) and Phase 6 (Clipboard Copy and AI Launch)
- The `{{DATA}}` placeholder convention is established; Plan 03 will implement the `buildPrompt(prompt, tsvData)` function that substitutes it

---
*Phase: 05-foundation-modules*
*Completed: 2026-03-02*

## Self-Check: PASSED

- FOUND: src/shared/prompt_types.ts
- FOUND: tests/test_prompt_types.ts
- FOUND: .planning/phases/05-foundation-modules/05-02-SUMMARY.md
- FOUND commit: 4a75220 (Task B1)
- FOUND commit: bbf0dc7 (Task B2)
