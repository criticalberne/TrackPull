---
phase: 12-prompt-preview
plan: 01
subsystem: ui
tags: [chrome-extension, popup, prompt-preview, details-element, dark-mode, css-tokens]

# Dependency graph
requires:
  - phase: 06-clipboard-copy-ai-launch
    provides: assemblePrompt(), buildUnitLabel(), countSessionShots() in prompt_builder.ts
  - phase: 09-dark-mode-css-foundation
    provides: CSS custom property tokens (var(--color-*)) used by preview widget
provides:
  - Collapsible prompt preview widget in popup AI Analysis section
  - updatePreview() function that assembles and displays the full prompt text
affects: [future-phases-using-popup-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Native HTML details/summary disclosure element (no JS show/hide required)
    - textContent (not innerHTML) for XSS-safe display of user-defined prompt text
    - max-height + overflow-y: auto on inner pre element for scroll containment without outer popup scrollbar

key-files:
  created: []
  modified:
    - src/popup/popup.html
    - src/popup/popup.ts
    - dist/popup.js
    - dist/popup.html

key-decisions:
  - "Use native details/summary for disclosure — no JS show/hide state management needed"
  - "textContent (not innerHTML) on pre element to prevent XSS from user-defined custom prompt text"
  - "max-height: 180px + overflow-y: auto on #prompt-preview-content (not body) prevents outer popup scrollbar"
  - "All colors use var(--color-*) tokens for automatic dark mode support via Phase 9 token set"
  - "collapsed by default (no open attribute) — user expands when they want to inspect"
  - "No updatePreview() call in handleClearClick — #ai-section hides on clear, making preview invisible anyway"

patterns-established:
  - "Prompt preview uses same assemblePrompt() inputs as Open in AI and Copy Prompt handlers — single source of truth for assembled string"
  - "updatePreview() called from DATA_UPDATED, promptSelect change, aiServiceSelect change, and DOMContentLoaded initial render"

requirements-completed: [AI-02]

# Metrics
duration: 2min
completed: 2026-03-03
---

# Phase 12 Plan 01: Prompt Preview Summary

**Collapsible details/summary disclosure widget in popup AI section showing the full assembled prompt and TSV data, wired to update on prompt/service select changes and DATA_UPDATED messages**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-03T14:28:26Z
- **Completed:** 2026-03-03T14:29:53Z
- **Tasks:** 2
- **Files modified:** 3 (src/popup/popup.html, src/popup/popup.ts, dist/popup.js)

## Accomplishments
- Added native `<details id="prompt-preview">` / `<pre id="prompt-preview-content">` element inside `#ai-section` after `.ai-actions`, collapsed by default
- Added CSS rules with max-height scroll containment, pre-wrap word wrapping, and var(--color-*) dark mode tokens
- Implemented `updatePreview()` function that calls `assemblePrompt()` with cached data and sets `textContent` on the pre element
- Wired `updatePreview()` to all 4 trigger points: promptSelect change, aiServiceSelect change, DATA_UPDATED handler, DOMContentLoaded init
- All 253 existing tests pass, build succeeds

## Task Commits

Each task was committed atomically:

1. **Task 1: Add details/summary disclosure element and CSS to popup.html** - `fbacffc` (feat)
2. **Task 2: Add updatePreview() function and wire event listeners in popup.ts, then build** - `725d121` (feat)

## Files Created/Modified
- `src/popup/popup.html` - Added CSS block for preview widget and details/summary/pre HTML structure inside #ai-section
- `src/popup/popup.ts` - Added updatePreview() function and 4 call sites (promptSelect change, aiServiceSelect change, DATA_UPDATED, DOMContentLoaded)
- `dist/popup.js` - Rebuilt from updated popup.ts

## Decisions Made
- Used native `<details>`/`<summary>` element — zero JS state management, browser handles expand/collapse natively
- Used `textContent` not `innerHTML` to prevent XSS from user-defined custom prompt text (key security requirement)
- Inner `<pre>` carries `max-height: 180px` + `overflow-y: auto` to contain scroll within the widget, not the outer popup body
- All colors reference var(--color-*) CSS tokens established in Phase 9, giving automatic dark mode readability
- No `open` attribute on `<details>` — collapsed by default is correct UX; no storage persistence needed since Chrome popup DOM resets on every open
- Skipped `updatePreview()` call in `handleClearClick` — `#ai-section` hides when data is cleared, making preview invisible; DATA_UPDATED fires on next capture

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None - build succeeded first attempt, all 253 tests passed.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Prompt preview widget fully functional in popup
- Phase 12 Plan 01 complete — all plans in phase 12 executed
- Requirement AI-02 satisfied: users can inspect the exact prompt text before sending

---
*Phase: 12-prompt-preview*
*Completed: 2026-03-03*

## Self-Check: PASSED

- src/popup/popup.html: FOUND
- src/popup/popup.ts: FOUND
- 12-01-SUMMARY.md: FOUND
- Commit fbacffc (Task 1): FOUND
- Commit 725d121 (Task 2): FOUND
