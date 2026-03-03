---
phase: 10-empty-state-guidance
plan: 01
subsystem: ui
tags: [chrome-extension, popup, css, dark-mode, empty-state]

# Dependency graph
requires:
  - phase: 09-dark-mode-css-foundation
    provides: CSS custom property tokens (var(--color-text-primary), var(--color-text-muted)) used for guidance text colors
provides:
  - Empty state guidance UI replacing the bare "0 shots" dead end when no data is captured
  - CSS class toggling pattern (.empty-state on #shot-count-container) that hides heading, count, and shows guidance
  - Clear button hidden by default and shown only when data is present
affects:
  - 10-02 (if exists, any further empty state polish or related UI changes)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "CSS class toggling on container element: add/remove .empty-state on #shot-count-container to drive visibility of child elements via CSS descendant selectors"
    - "Style=display:none on HTML elements that should be hidden before async storage resolves (same as export-row and ai-section pattern)"

key-files:
  created: []
  modified:
    - src/popup/popup.html
    - src/popup/popup.ts
    - dist/popup.html
    - dist/popup.js

key-decisions:
  - "Use CSS descendant selectors on container (#shot-count-container.empty-state #child) not JS per-element visibility — single classList operation drives all child visibility"
  - "style=display:none on #clear-btn in HTML prevents flash before async storage resolves — same pattern already used by #export-row and #ai-section"
  - "ID selectors used for new CSS rules (not class selectors) — element uses ID #shot-count-container, pre-existing class mismatch .shot-count-container left as-is per plan"

patterns-established:
  - "Empty state via container class: add .empty-state to container, CSS handles all child visibility — avoids per-element JS style manipulation"
  - "Flicker prevention: HTML style=display:none on elements that should be hidden until storage resolves"

requirements-completed: [UI-02]

# Metrics
duration: 1min
completed: 2026-03-03
---

# Phase 10 Plan 01: Empty State Guidance Summary

**CSS class-toggled empty state in popup: guidance message replaces bare "0 shots" dead end, with Shot Count heading and Clear button hidden when no data is present**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-03-03T05:39:17Z
- **Completed:** 2026-03-03T05:40:21Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Added `#empty-guidance` div with primary instruction ("Open a Trackman report to capture shots") and secondary hint text inside `#shot-count-container`
- Added CSS rules: `#empty-guidance` hidden by default, shown when container has `.empty-state` class; heading and count hidden when empty
- Refactored `updateShotCount()` to toggle `.empty-state` on container instead of setting `textContent = "0"`
- Extended `updateExportButtonVisibility()` to hide/show `#clear-btn` alongside existing export-row and ai-section
- Build succeeds, all 247 existing tests pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Add empty state HTML elements and CSS rules to popup.html** - `5aa72b0` (feat)
2. **Task 2: Refactor updateShotCount and updateExportButtonVisibility in popup.ts, then build** - `d9b9b0d` (feat)

## Files Created/Modified

- `src/popup/popup.html` - Added id="shot-count-heading" on h2, added #empty-guidance div with two child paragraphs, added CSS rules for .empty-state class toggling, added style="display:none" on #clear-btn
- `src/popup/popup.ts` - updateShotCount now toggles .empty-state class on container; updateExportButtonVisibility now manages #clear-btn visibility
- `dist/popup.html` - Rebuilt artifact
- `dist/popup.js` - Rebuilt artifact with compiled TypeScript changes

## Decisions Made

- Used CSS descendant selectors on container element rather than per-element JS visibility — single `classList.add("empty-state")` call drives all child element visibility through CSS
- Added `style="display:none"` to `#clear-btn` in HTML source to match the existing pattern used by `#export-row` and `#ai-section` — prevents flash before async storage resolves
- Targeted new CSS rules with ID selector `#shot-count-container.empty-state` (not class selector `.shot-count-container`) because the element uses an ID; pre-existing class/ID mismatch left as-is per plan instruction

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Empty state guidance fully implemented and shipped in `dist/`
- Phase 10 Plan 01 complete — UI-02 requirement satisfied
- Manual testing checklist: open popup with no data (see guidance, not "0"), open with data (see count, no guidance flash), clear data (guidance reappears), toggle OS dark mode (text readable in both themes)

---
*Phase: 10-empty-state-guidance*
*Completed: 2026-03-03*
