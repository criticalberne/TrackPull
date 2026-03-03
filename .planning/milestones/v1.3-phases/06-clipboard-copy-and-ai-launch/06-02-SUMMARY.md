---
phase: 06-clipboard-copy-and-ai-launch
plan: "02"
subsystem: ui
tags: [clipboard, chrome-extension, typescript, vitest, ai-launch, popup]

# Dependency graph
requires:
  - phase: 05-foundation-modules
    provides: writeTsv, BUILTIN_PROMPTS, assemblePrompt, buildUnitLabel, countSessionShots
  - phase: 06-01
    provides: export-row, ai-section, copy-tsv-btn, open-ai-btn, copy-prompt-btn, prompt-select, ai-service-select HTML elements

provides:
  - Copy TSV button handler: writes tab-separated shot data with headers to clipboard
  - Open in AI button handler: assembles prompt+data, copies to clipboard, opens AI service tab
  - Copy Prompt + Data handler: assembles prompt+data, copies to clipboard without opening tab
  - Prompt dropdown preference persistence to chrome.storage.local
  - AI service dropdown preference persistence to chrome.storage.sync
  - Pre-fetch data pattern: cachedData and cachedUnitChoice loaded on DOMContentLoaded
  - Export row and AI section visibility gating based on session data presence

affects:
  - phase 07 (Options Page and Custom Prompts) -- builds on preference persistence patterns established here

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Pre-fetch pattern: all storage reads at DOMContentLoaded, cached variables enable synchronous clipboard writes in handlers
    - Fire-and-forget tab creation: chrome.tabs.create not awaited so clipboard write completes before focus shifts
    - Visibility gating: export-row uses display flex, ai-section uses display block

key-files:
  created:
    - tests/test_popup_actions.ts
  modified:
    - src/popup/popup.ts
    - dist/popup.js

key-decisions:
  - "cachedData and cachedUnitChoice pre-fetched on DOMContentLoaded to avoid async storage reads inside click handlers (navigator.clipboard.writeText requires active focus)"
  - "chrome.tabs.create is fire-and-forget (not awaited) so clipboard write completes before focus shifts to new tab"
  - "AI service preference stored in chrome.storage.sync for cross-device portability; prompt selection in chrome.storage.local (prompt content too large for sync quota)"
  - "export-row display: flex (not block) -- it is a flex container for side-by-side buttons"

patterns-established:
  - "Pre-fetch pattern: read storage once at DOMContentLoaded, cache in module-level variables, use cached values in all click handlers"
  - "cachedData = null on clear to reset button state without re-reading storage"
  - "Unit choice cache updated in-place when dropdowns change (no storage read needed)"

requirements-completed: [CLIP-01, CLIP-02, CLIP-03, AILN-01, AILN-02, AILN-03, AILN-04, PRMT-02, PREF-01]

# Metrics
duration: 8min
completed: 2026-03-02
---

# Phase 6 Plan 02: Popup TypeScript Wiring Summary

**Clipboard copy handlers (TSV, prompt+data, AI launch) and preference persistence wired in popup.ts using pre-fetched data pattern to avoid focus-loss clipboard errors**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-02T19:57:59Z
- **Completed:** 2026-03-02T20:05:38Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Wired all three clipboard action buttons (Copy TSV, Open in AI, Copy Prompt + Data) with correct toast messages
- Implemented pre-fetch pattern: session data and unit choices cached on DOMContentLoaded so click handlers can write to clipboard synchronously
- Prompt and AI service preferences restored from storage on popup open and auto-saved on change
- Extended `updateExportButtonVisibility` to show/hide both `export-row` (flex) and `ai-section` (block) based on data availability
- Created 14-test integration suite verifying the Phase 5 module data pipeline used by popup handlers

## Task Commits

Each task was committed atomically:

1. **Tasks 1 & 2: Add imports, pre-fetch pattern, and all button handlers** - `f239db3` (feat)
2. **Task 3: Add popup action integration tests** - `f66c226` (test)

**Plan metadata:** pending (docs: complete plan)

## Files Created/Modified
- `src/popup/popup.ts` - Added Phase 5 imports, module-level cache variables, AI_URLS constant, pre-fetch pattern in DOMContentLoaded, preference restoration, three button handlers, updated visibility function
- `dist/popup.js` - Rebuilt output (31.9kb)
- `tests/test_popup_actions.ts` - 14 integration tests for TSV pipeline, prompt assembly, prompt data constants, AI URLs, helpers

## Decisions Made
- Combined Tasks 1 and 2 into single popup.ts write since they both modify the same file and verifying Task 1 independently before adding handlers would have required a partial commit -- wrote the complete popup.ts atomically and committed after build success
- All button handlers declared inside DOMContentLoaded so `promptSelect` and `aiServiceSelect` are in scope for the Open in AI and Copy Prompt + Data closures

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 6 is complete: Copy TSV, Open in AI, Copy Prompt + Data all working
- All 228 tests pass; build succeeds
- Phase 7 (Options Page and Custom Prompts) can build on preference persistence patterns established here

---
*Phase: 06-clipboard-copy-and-ai-launch*
*Completed: 2026-03-02*
