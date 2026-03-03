# Phase 9: Dark Mode CSS Foundation - Context

**Gathered:** 2026-03-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Popup and options pages automatically match the system dark or light theme with no user action required. Both pages render with dark background and light text when the OS is set to dark mode, and revert to light theme immediately when OS switches to light mode. Status messages and toast notifications respect dark mode.

</domain>

<decisions>
## Implementation Decisions

### CSS Architecture
- CSS custom properties (tokens) defined on `:root` with light-mode defaults
- Single `@media (prefers-color-scheme: dark)` block overrides tokens for dark mode
- `color-scheme: light dark` on `:root` enables native form control adaptation (selects, inputs, scrollbars)
- `<meta name="color-scheme" content="light dark">` in `<head>` prevents flash of wrong theme
- Keep CSS inline in HTML files (no external CSS file) -- accepted duplication of ~20 token variables between popup.html and options.html
- Leave `src/shared/styles.css` alone -- it is dead code not used by build or HTML

### Token Naming
- All tokens follow `--color-*` naming convention
- Token names are consistent across popup.html and options.html
- Comment in each file: `/* Dark mode tokens -- keep in sync with options.html/popup.html */`

### JS Inline Style Fix
- Replace `statusElement.style.color = isError ? "#d32f2f" : "#388e3c"` in popup.ts with CSS class toggling
- Add `.status-error` and `.status-success` classes that use `var(--color-status-error)` and `var(--color-status-ok)` tokens
- Other `style.display` assignments in popup.ts and options.ts are not color-related and do not need changes

### Color Values
- Dark mode background: `#121212` (Material Design dark surface)
- Dark mode text: `#cccccc` (body), `#e8e8e8` (headings)
- Dark mode accent: `#64b5f6` (Material Design Blue 300 -- lighter blue for dark backgrounds)
- Toast/status colors adjusted for contrast against dark background
- Full color inventory in 09-RESEARCH.md Inventory section

### Claude's Discretion
- Exact dark mode hex values for accent, border, muted text (starting recommendations in research, verify visually)
- Whether to add `--color-shadow` token for box-shadows or keep `rgba(0,0,0,*)` as-is
- Options page badge colors (`tier-badge.beginner/intermediate/advanced`) dark mode variants

</decisions>

<specifics>
## Specific Ideas

- Every hardcoded hex value in both HTML `<style>` blocks must be replaced with `var(--color-*)` references
- After token substitution, grep for remaining `#` hex codes and `rgb(`/`rgba(` patterns to verify completeness
- Box-shadow `rgba(0,0,0,*)` values can optionally remain if they work visually on both themes

</specifics>

<code_context>
## Existing Code Insights

### Files to Modify
- `src/popup/popup.html`: Inline `<style>` block with ~30 hardcoded color values (see research inventory)
- `src/popup/popup.ts`: Line 391 -- single JS inline style assignment for status message colors
- `src/options/options.html`: Inline `<style>` block with ~40 hardcoded color values (see research inventory)

### Files NOT Modified
- `src/options/options.ts`: Only uses `style.display` toggling (not color) -- no changes needed
- `src/shared/styles.css`: Dead code, leave alone
- `scripts/build-extension.sh`: HTML files are already copied verbatim to dist/, no build changes needed

### Established Patterns
- HTML files copied verbatim to dist/ by build script -- inline CSS means no extra build steps
- Toast notifications use `.className = "toast success"` / `.className = "toast error"` (CSS class-based, just need token values)
- Status messages use JS inline `.style.color` (must be replaced with class-based approach)

### Integration Points
- `src/popup/popup.html` `<style>` block: Add `:root` tokens + `@media` dark override + `<meta>` tag
- `src/options/options.html` `<style>` block: Add `:root` tokens + `@media` dark override + `<meta>` tag
- `src/popup/popup.ts` `showStatusMessage()`: Replace inline style with classList toggle

</code_context>

<deferred>
## Deferred Ideas

- Manual dark mode toggle (out of scope per REQUIREMENTS.md -- system-match is sufficient)
- External shared CSS file (accepted duplication for now; revisit if CSS grows significantly)
- `light-dark()` CSS function (valid alternative but `@media` block is more readable/diffable)

</deferred>

---

*Phase: 09-dark-mode-css-foundation*
*Context gathered: 2026-03-02*
