---
phase: 06-clipboard-copy-and-ai-launch
plan: 01
subsystem: ui
tags: [chrome-extension, popup, manifest, storage-keys, html, css]

# Dependency graph
requires:
  - phase: 05-foundation-modules
    provides: prompt_types.ts with BUILTIN_PROMPTS and SkillTier for prompt dropdown structure
provides:
  - clipboardWrite manifest permission for clipboard API access
  - SELECTED_PROMPT_ID and AI_SERVICE storage keys in constants.ts
  - Popup HTML export-row with side-by-side Export CSV and Copy TSV buttons
  - AI Analysis section with grouped prompt dropdown, AI service picker, and action buttons
  - CSS styling for export-row, ai-section, btn-primary, btn-outline
affects:
  - 06-02 (TypeScript wiring for all new HTML elements and storage keys)
  - 07-options-page (options page will extend AI service preference pattern)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Sections hidden by default (display:none) and shown by TypeScript when data is present"
    - "Side-by-side button layout using flex with gap for equal-width siblings"
    - "btn-primary and btn-outline classes for filled vs ghost button variants"

key-files:
  created: []
  modified:
    - src/manifest.json
    - src/shared/constants.ts
    - src/popup/popup.html

key-decisions:
  - "Quick Session Summary (quick-summary-beginner) is the first option in the prompt dropdown — the browser selects the first option by default, matching the intended first-time default"
  - "ChatGPT is the first option in the AI service dropdown — browser default selection means no initial storage read needed for first-time users"
  - "Export row and AI section are hidden with inline style=display:none — Plan 06-02 TypeScript will show them when session data is present"

patterns-established:
  - "UI sections that require data hidden by default via inline style; TypeScript shows them on load"
  - "Export row uses flex layout with flex:1 on each button for equal-width side-by-side layout"

requirements-completed:
  - PRMT-02
  - PREF-01

# Metrics
duration: 2min
completed: 2026-03-02
---

# Phase 6 Plan 01: Popup HTML and Config Foundation Summary

**clipboardWrite permission, SELECTED_PROMPT_ID/AI_SERVICE storage keys, and full Phase 6 popup layout with export-row and AI Analysis section with grouped prompt/service dropdowns and dual action buttons**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-02T19:54:09Z
- **Completed:** 2026-03-02T19:55:43Z
- **Tasks:** 3
- **Files modified:** 3 source files (plus dist rebuild)

## Accomplishments
- Added `clipboardWrite` to manifest.json permissions (required for navigator.clipboard.writeText in popup)
- Added `SELECTED_PROMPT_ID` and `AI_SERVICE` to STORAGE_KEYS in constants.ts for Plan 06-02 storage reads/writes
- Replaced single export button with flex-row container holding Export CSV and Copy TSV side-by-side
- Added complete AI Analysis section: grouped prompt dropdown (3 beginner, 3 intermediate, 2 advanced), AI service dropdown (ChatGPT/Claude/Gemini), Open in AI primary button, Copy Prompt + Data outline button
- All new sections hidden by default; Clear Session Data button repositioned after AI section
- Build passes and all 214 existing tests pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Add clipboardWrite permission and new STORAGE_KEYS** - `32f3d24` (feat)
2. **Task 2: Add popup HTML layout and CSS for Export row and AI Analysis section** - `7d8753a` (feat)
3. **Task 3: Verify build succeeds with HTML and config changes** - `c37b6a4` (chore)

**Plan metadata:** (docs commit — see final commit)

## Files Created/Modified
- `src/manifest.json` - Added clipboardWrite to permissions array
- `src/shared/constants.ts` - Added SELECTED_PROMPT_ID and AI_SERVICE to STORAGE_KEYS
- `src/popup/popup.html` - Full Phase 6 UI layout with export-row, ai-section, CSS for all new elements

## Decisions Made
- Quick Session Summary is the first `<option>` in Beginner optgroup — browser auto-selects first option so no JS needed for first-time default
- ChatGPT is the first `<option>` in AI service dropdown — same reasoning, no JS default-setting needed
- Both new sections use inline `style="display:none;"` rather than a CSS class — consistent with existing export-btn pattern in original popup.html

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All DOM element IDs are in place: `copy-tsv-btn`, `prompt-select`, `ai-service-select`, `open-ai-btn`, `copy-prompt-btn`
- All storage keys are exported from constants.ts: `STORAGE_KEYS.SELECTED_PROMPT_ID`, `STORAGE_KEYS.AI_SERVICE`
- Plan 06-02 can proceed to wire TypeScript logic without any HTML or config changes

---
*Phase: 06-clipboard-copy-and-ai-launch*
*Completed: 2026-03-02*
