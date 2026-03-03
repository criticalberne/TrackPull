# Phase 10: Empty State Guidance - Context

**Gathered:** 2026-03-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the bare "0 shots" dead end with an actionable guidance message when the popup opens with no captured data. The guidance message must be readable in both light and dark mode. No new capabilities — just a better empty state.

</domain>

<decisions>
## Implementation Decisions

### Message content
- Instructional tone — direct and helpful, tells the user what to do next
- Two-part message: primary instruction + smaller secondary hint
- References Trackman specifically (users know what this extension is for)
- Primary message: "Open a Trackman report to capture shots"
- Secondary hint wording: Claude's discretion (something about auto-detection or workflow)

### Visual presentation
- Replace the big "0" number with guidance text inside the existing `#shot-count-container`
- Hide the "Shot Count" (`<h2>`) heading when empty — guidance message stands alone in the container
- Text only — no icons, illustrations, or emoji. Consistent with the rest of the popup
- Text sizing smaller than the 48px shot count number — Claude's discretion on exact size

### State transitions
- Loading → Empty flicker prevention: Claude's discretion on approach (keep "Loading..." vs start hidden vs other)
- Auto-switch to shot count when data arrives via existing `DATA_UPDATED` message listener — no extra code needed
- After clearing session data, show the guidance message again (same as first-open empty state)
- Success criteria #2: guidance must NOT flash briefly when data IS present — only show after storage resolves as empty

### Scope of change
- Unit selectors (Speed, Distance, Surface): stay visible when empty — users can pre-configure preferences
- Clear button: hide when no data (nothing to clear)
- Settings gear: always visible regardless of state
- Export row and AI section: already hidden when empty (existing behavior, no change)

### Claude's Discretion
- Secondary hint message wording
- Guidance text sizing within the container
- Loading state flicker prevention approach
- CSS class naming for empty state styling

</decisions>

<specifics>
## Specific Ideas

- Primary guidance line: "Open a Trackman report to capture shots"
- After clearing data, revert to guidance (not "0") for consistent empty state behavior
- The `updateShotCount()` function is the main touch point — it currently sets `textContent = "0"` on empty

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `var(--color-*)` CSS tokens (Phase 9): All new styles must use these tokens for dark mode compatibility
- `#shot-count-container` and `#shot-count` elements: Container and number element to modify
- `updateExportButtonVisibility()`: Already hides export/AI sections when empty — same pattern for Clear button

### Established Patterns
- `classList` for state classes (Phase 9): Use CSS classes, not inline styles
- `style.display = "none"/"flex"/"block"` for showing/hiding sections (popup.ts lines 329-330)
- Toast/status message pattern: CSS classes with `var(--color-*)` token references

### Integration Points
- `src/popup/popup.ts` `updateShotCount()`: Primary function to modify — swap "0" for guidance content
- `src/popup/popup.ts` `updateExportButtonVisibility()`: Add Clear button hide/show logic here (or alongside)
- `src/popup/popup.html`: Add CSS classes for empty state text styling using existing token system
- `src/popup/popup.html` `#shot-count-container`: Container that holds both heading and count/guidance

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 10-empty-state-guidance*
*Context gathered: 2026-03-03*
