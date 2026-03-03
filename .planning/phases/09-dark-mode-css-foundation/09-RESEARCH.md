# Phase 9: Dark Mode CSS Foundation - Research

**Researched:** 2026-03-02
**Domain:** CSS custom properties, `@media (prefers-color-scheme)`, Chrome extension popup/options page styling
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UI-01 | Popup and options page automatically match the system dark/light theme | CSS custom properties + `@media (prefers-color-scheme: dark)` pattern; JS inline style in `showStatusMessage` must be replaced with CSS class; `color-scheme` property makes native form controls auto-adapt |
</phase_requirements>

---

## Summary

TrackPull's popup and options pages use exclusively inline `<style>` blocks with hardcoded hex color values. There is no external CSS file being loaded by either page at runtime. The build script (`build-extension.sh`) copies the HTML files verbatim to `dist/` — there is no CSS preprocessing step, no CSS bundling, and no reference to the existing `src/shared/styles.css` file (which is currently unused by the build). The standard approach for automatic system-theme matching is pure CSS: define color tokens as CSS custom properties on `:root`, then override the token values inside `@media (prefers-color-scheme: dark)`. No JavaScript is needed for the theme switch itself.

The critical constraint noted in STATE.md is accurate and well-understood: one JS inline style assignment (`statusElement.style.color = isError ? "#d32f2f" : "#388e3c"` in `showStatusMessage` in `popup.ts`) overrides the CSS cascade and cannot be reached by any `@media` query. This must be replaced by adding/removing a CSS class (e.g., `.status-error` / `.status-success`) whose color properties use CSS custom property tokens. The `showToast` function in both files constructs toasts using `.className = "toast success"` / `.className = "toast error"` — these already go through CSS class selectors, so they just need updated color declarations using token variables.

The modern CSS alternative to the two-block pattern is `light-dark()` (Baseline 2024, available in Chrome since May 2024). It requires `color-scheme: light dark` on `:root` and collapses two `@media` blocks into a single property declaration. Given that Chrome extensions target the current Chrome version, `light-dark()` is fully safe to use. However, the traditional `@media` + custom properties pattern is equally correct and easier to diff/review; either approach is valid. Setting `color-scheme: light dark` on `:root` additionally gives free dark-mode rendering of native form controls (selects, inputs, textareas, scrollbars) without any extra CSS.

**Primary recommendation:** Refactor both HTML files to use CSS custom property tokens on `:root`, add a single `@media (prefers-color-scheme: dark)` block overriding those tokens, add `color-scheme: light dark` to `:root`, replace the one JS inline style assignment with a CSS class, and copy any externalized CSS to `dist/` in the build script (or keep it inline — see Architecture Patterns).

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| CSS custom properties | Native | Color token system — define once, reference everywhere with `var(--name)` | Zero-dependency, cascade-aware, overridable per media query |
| `@media (prefers-color-scheme: dark)` | CSS Level 5 | Detects OS dark mode preference | Baseline: Widely available since January 2020; works in Chrome extension popups/options pages |
| `color-scheme: light dark` | CSS | Signals to Chrome that both schemes are supported; auto-adapts native form controls | Required prerequisite for `light-dark()` function; free benefit for selects/inputs/scrollbars |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `light-dark(light, dark)` CSS function | Baseline 2024 (Chrome 123+) | Declare both color values inline without a media block | Optional — tidier than two `@media` blocks; requires `color-scheme: light dark` on `:root` |
| `<meta name="color-scheme" content="light dark">` | HTML | Prevents flash of wrong theme before CSS loads | Add to both HTML files' `<head>` alongside the CSS `color-scheme` declaration |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CSS-only `@media` approach | JavaScript `window.matchMedia('(prefers-color-scheme: dark)')` listener | JS approach adds complexity, is unnecessary here, and creates a timing gap between page load and theme application — worse in all respects for this use case |
| Inline `<style>` blocks in HTML | External `.css` file copied to `dist/` | External file requires build script update; inline keeps everything in one file; either works — see Architecture Patterns for tradeoffs |
| CSS custom properties + `@media` | `light-dark()` function | `light-dark()` is more concise; `@media` blocks are more readable/diffable; both fully supported |

**Installation:** No packages required — pure CSS and HTML.

---

## Architecture Patterns

### Current Project Structure (relevant files)

```
src/
├── popup/
│   ├── popup.html    # All CSS inline in <style> block — hardcoded hex colors
│   └── popup.ts      # ONE inline style assignment: statusElement.style.color = ...
├── options/
│   ├── options.html  # All CSS inline in <style> block — hardcoded hex colors
│   └── options.ts    # No inline style assignments (uses className only)
└── shared/
    └── styles.css    # EXISTS but NOT used by build or HTML files — currently dead code
dist/
├── popup.html        # Copied verbatim from src/popup/popup.html
└── options.html      # Copied verbatim from src/options/options.html
```

### Pattern 1: CSS Custom Properties + `@media` Override (Recommended)

**What:** Define all colors as `--color-*` custom properties on `:root` (defaults = light theme). Add a single `@media (prefers-color-scheme: dark)` block that reassigns those same properties. All color rules in the rest of the stylesheet use `var(--color-*)`.

**When to use:** Always — this is the canonical dark mode approach for pure-CSS theming.

**Example:**
```css
/* Source: MDN prefers-color-scheme, verified 2026-03-02 */
:root {
  color-scheme: light dark;

  /* Light theme tokens (default) */
  --color-bg:           #ffffff;
  --color-bg-surface:   #f5f5f5;
  --color-bg-card:      #ffffff;
  --color-bg-subtle:    #f9f9f9;
  --color-text-primary: #1a1a1a;
  --color-text-body:    #333333;
  --color-text-muted:   #666666;
  --color-text-label:   #555555;
  --color-accent:       #1976d2;
  --color-accent-hover: #1565c0;
  --color-accent-light: rgba(25, 118, 210, 0.08);
  --color-border:       #e0e0e0;
  --color-disabled:     #bdbdbd;
  --color-status-ok:    #388e3c;
  --color-status-error: #d32f2f;
  --color-toast-ok-bg:  #388e3c;
  --color-toast-err-bg: #d32f2f;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-bg:           #121212;
    --color-bg-surface:   #1e1e1e;
    --color-bg-card:      #2a2a2a;
    --color-bg-subtle:    #242424;
    --color-text-primary: #e8e8e8;
    --color-text-body:    #cccccc;
    --color-text-muted:   #999999;
    --color-text-label:   #aaaaaa;
    --color-accent:       #64b5f6;
    --color-accent-hover: #90caf9;
    --color-accent-light: rgba(100, 181, 246, 0.12);
    --color-border:       #404040;
    --color-disabled:     #666666;
    --color-status-ok:    #66bb6a;
    --color-status-error: #ef9a9a;
    --color-toast-ok-bg:  #2e7d32;
    --color-toast-err-bg: #c62828;
  }
}

/* All rules then reference tokens: */
body {
  background-color: var(--color-bg);
  color: var(--color-text-body);
}

.section {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
}
```

### Pattern 2: Replace JS Inline Style with CSS Class

**What:** The single JS inline style assignment in `popup.ts` (`showStatusMessage`) must be replaced. Add two CSS classes; the JS adds/removes the class instead of setting `.style.color`.

**When to use:** Required — JS `.style.*` assignments override the CSS cascade and are invisible to `@media` queries.

**Example:**
```css
/* In popup.html <style> block */
#status-message.status-error   { color: var(--color-status-error); }
#status-message.status-success { color: var(--color-status-ok); }
```

```typescript
// In popup.ts — replace showStatusMessage body:
function showStatusMessage(message: string, isError: boolean = false): void {
  const statusElement = document.getElementById("status-message");
  if (!statusElement) return;
  statusElement.textContent = message;
  statusElement.classList.remove("status-error", "status-success");
  statusElement.classList.add(isError ? "status-error" : "status-success");
}
```

### Pattern 3: `color-scheme` for Free Native Control Adaptation

**What:** Setting `color-scheme: light dark` on `:root` causes Chrome to automatically render `<select>`, `<input>`, `<textarea>`, and scrollbars in dark style when the OS is in dark mode — no additional CSS needed for those elements' backgrounds.

**When to use:** Always — set it alongside the custom properties block. Also add the matching `<meta>` tag to prevent flash.

```html
<!-- In <head> of both popup.html and options.html -->
<meta name="color-scheme" content="light dark">
```

### CSS Placement: Inline vs External File

**Option A — Keep CSS inline in HTML files (simpler):**
- No build script changes needed
- CSS stays co-located with markup
- Duplication between popup.html and options.html for shared tokens (acceptable for a small extension)

**Option B — Extract to external CSS file:**
- Requires adding `cp src/popup/popup.css "$DIST_DIR/popup.css"` etc. to `build-extension.sh`
- Reduces duplication if tokens are shared in one file
- Adds complexity to build

**Recommendation:** Keep CSS inline in the HTML files. The duplication of ~15 token variables between popup.html and options.html is a minor cost, and avoiding a build script change reduces risk. The existing `src/shared/styles.css` file is dead code (not referenced by either HTML or the build) — leave it alone.

### Anti-Patterns to Avoid

- **JS-driven theme switching:** Using `window.matchMedia` to toggle a class is unnecessary complexity when `@media` in CSS handles it automatically. The OS switch triggers an instant CSS repaint — no JS event listener required.
- **`!important` to override hardcoded values:** If any rule uses `!important` with a hardcoded color, the token substitution won't override it. Audit all existing rules before substituting.
- **Partial token replacement:** Replacing colors in some rules but leaving hardcoded hex in others creates a fragmented result where some elements stay light while others switch. All hex color values in both HTML files must be replaced with `var(--color-*)` references.
- **Not replacing the JS inline style:** Forgetting `statusElement.style.color` in `popup.ts` means the status message will always display light-mode colors regardless of OS setting.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Theme detection | Custom JS that reads `localStorage` or sets a `data-theme` attribute | `@media (prefers-color-scheme: dark)` in CSS | The media query fires instantly on OS switch; no JS polling, no storage reads, no render flash |
| Native control dark styling | Manual CSS overrides for `<select>`, `<input>` backgrounds | `color-scheme: light dark` on `:root` | Chrome handles it natively; manual overrides are fragile and incomplete |
| Two-color property declaration | Two `@media` blocks | `light-dark(light-val, dark-val)` function | Cleaner syntax when preferred, though either approach is valid |

**Key insight:** CSS handles system theme detection natively and completely. Any JavaScript involvement in the theme switch (beyond the one-time class-vs-inline-style refactor) is over-engineering.

---

## Common Pitfalls

### Pitfall 1: JS Inline Styles Override the CSS Cascade

**What goes wrong:** `element.style.color = "#d32f2f"` sets an inline style that has specificity higher than any stylesheet rule, including those inside `@media (prefers-color-scheme: dark)`. The element stays hardcoded regardless of theme.

**Why it happens:** Developers assume CSS `@media` queries affect all color on the page, but inline styles on the `style` attribute are not affected by media queries in stylesheets.

**How to avoid:** Before implementing tokens, grep for `.style.color`, `.style.backgroundColor`, `.style.background` in all `.ts` files. In this project there is exactly one: `popup.ts:391`. Replace with class toggling.

**Warning signs:** After implementing dark mode, the status message text stays red/green regardless of theme — the one remaining JS inline style.

### Pitfall 2: Incomplete Color Audit — Missing Hardcoded Values

**What goes wrong:** Some hex values in the CSS are replaced with tokens, but others are overlooked (e.g., `rgba(0, 0, 0, 0.2)` on `.toast` box-shadow, or colors in pseudo-element rules). The result is a partially-themed UI with some light-mode artifacts in dark mode.

**Why it happens:** Manual grep/search misses values embedded in shorthand properties or multi-value declarations.

**How to avoid:** After substituting tokens, search the resulting HTML for any remaining `#` hex codes and `rgb(` / `rgba(` patterns. Every color should use `var(--color-*)` except values where transparency-only shadows are intentional (e.g., `rgba(0,0,0,0.2)` for shadows — these can remain if the shadow effect is acceptable on both themes, or add a `--color-shadow` token).

**Warning signs:** Any `#xxxxxx`, `rgb(`, or hardcoded color value remaining in the `<style>` block after the refactor.

### Pitfall 3: Flash of Wrong Theme (FOUT)

**What goes wrong:** If the OS is in dark mode but the HTML loads for a split second with the default light background before CSS applies, users see a white flash.

**Why it happens:** Browser applies CSS after HTML parsing; without a hint, it defaults to a white background briefly.

**How to avoid:** Add `<meta name="color-scheme" content="light dark">` to the `<head>` of both HTML files. This signals the intended color scheme before CSS loads, allowing Chrome to set the appropriate background immediately.

**Warning signs:** Visible white flash when opening the popup in dark mode.

### Pitfall 4: `color-scheme` Not Set — Native Controls Stay Light

**What goes wrong:** Selects, inputs, and textareas render with white backgrounds and dark text even when OS is in dark mode, creating jarring contrast against the now-dark page background.

**Why it happens:** `@media (prefers-color-scheme: dark)` token overrides affect custom CSS rules, but browser-rendered form controls use their own internal styling unless `color-scheme` is declared.

**How to avoid:** Always add `color-scheme: light dark` to the `:root` rule. This is a one-liner and covers all native controls automatically.

**Warning signs:** The page background is dark but `<select>` dropdowns have white backgrounds in dark mode.

### Pitfall 5: Missed State.md Warning — Full Color Audit at Implementation Time

**What goes wrong:** The STATE.md note says "Full color audit required at implementation time — research identifies pattern but not complete inventory of all JS inline style assignments." The research has now confirmed there is exactly one JS inline style assignment (`popup.ts:391`), but the implementer should verify this independently at task time.

**Why it happens:** Source files can change between research and implementation.

**How to avoid:** At implementation time, re-run: `grep -r "\.style\." src/ --include="*.ts"` and verify the full list before proceeding.

---

## Code Examples

Verified patterns from official sources:

### Complete Token + Dark Override Block

```css
/* Source: MDN prefers-color-scheme (https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme) */
:root {
  color-scheme: light dark;  /* enables native control adaptation */

  /* Light mode (default) */
  --color-bg:           #ffffff;
  --color-text-body:    #333333;
  --color-accent:       #1976d2;
  --color-border:       #e0e0e0;
  --color-status-ok:    #388e3c;
  --color-status-error: #d32f2f;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-bg:           #121212;
    --color-text-body:    #cccccc;
    --color-accent:       #64b5f6;
    --color-border:       #404040;
    --color-status-ok:    #66bb6a;
    --color-status-error: #ef9a9a;
  }
}

body {
  background-color: var(--color-bg);
  color: var(--color-text-body);
}
```

### `light-dark()` Alternative (Chrome 123+, Baseline 2024)

```css
/* Source: MDN light-dark() (https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/light-dark) */
/* Requires color-scheme: light dark on :root */
:root {
  color-scheme: light dark;
}

body {
  background-color: light-dark(#ffffff, #121212);
  color: light-dark(#333333, #cccccc);
}
```

### JS Class Toggle Replacing Inline Style

```typescript
// Replaces: statusElement.style.color = isError ? "#d32f2f" : "#388e3c";
function showStatusMessage(message: string, isError: boolean = false): void {
  const statusElement = document.getElementById("status-message");
  if (!statusElement) return;
  statusElement.textContent = message;
  statusElement.classList.remove("status-error", "status-success");
  statusElement.classList.add(isError ? "status-error" : "status-success");
}
```

```css
/* Companion CSS in popup.html */
#status-message.status-error   { color: var(--color-status-error); }
#status-message.status-success { color: var(--color-status-ok); }
```

### Meta Tag to Prevent Flash

```html
<!-- Source: MDN color-scheme (https://developer.mozilla.org/en-US/docs/Web/CSS/color-scheme) -->
<!-- Add to <head> in both popup.html and options.html -->
<meta name="color-scheme" content="light dark">
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| JS `localStorage` theme toggle with `data-theme` attribute | CSS-only `@media (prefers-color-scheme)` with custom properties | ~2019–2020 | No JS needed for system-match; JS only needed for user-override (out of scope here) |
| Separate dark.css file or duplicated rules | CSS custom properties with single `@media` override block | ~2018–2020 | Single source of truth for all color values |
| Manual form control dark styling | `color-scheme: light dark` on `:root` | Chrome 81+ (2020) | Free adaptation of selects, inputs, scrollbars |
| `@media (prefers-color-scheme)` repeated per property | `light-dark()` function | Chrome 123 (May 2024), Baseline 2024 | Optional syntax sugar — no `@media` block needed per-property |

**Deprecated/outdated:**
- Separate `dark.css` stylesheet toggled via JS: unnecessary complexity when `@media` queries handle it.
- Detecting dark mode via `window.matchMedia` to set a JS-managed theme class: needed only when user wants to *override* the system setting (explicitly out of scope per REQUIREMENTS.md).

---

## Open Questions

1. **Exact dark mode color values for accent blue (`#1976d2`)**
   - What we know: `#1976d2` is Material Design Blue 700, which is dark-on-light. On a dark background it may have insufficient contrast or feel overly saturated.
   - What's unclear: The ideal dark-mode accent value is a design judgment — `#64b5f6` (Blue 300) is a common choice for dark backgrounds in Material Design but hasn't been validated against the actual popup at runtime.
   - Recommendation: Use `#64b5f6` as the dark-mode accent as a starting point; verify visually in Chrome DevTools dark mode emulation before committing.

2. **Shared CSS between popup.html and options.html**
   - What we know: Both files will need identical token declarations in their `:root` blocks, and the token names should match. This is ~15–20 lines duplicated.
   - What's unclear: Whether future phases will add enough CSS complexity to make an external shared CSS file worth the build script change.
   - Recommendation: Keep inline for Phase 9. Accept the duplication. Add a comment `/* Dark mode tokens — keep in sync with options.html */` in popup.html and vice versa.

3. **`src/shared/styles.css` status**
   - What we know: The file exists but is not referenced by either HTML file or the build script. It is dead code.
   - What's unclear: Whether it was intended to be used and accidentally omitted from the build, or intentionally abandoned.
   - Recommendation: Leave it alone during Phase 9. Do not use it as the primary CSS delivery mechanism without a deliberate decision to update the build script.

---

## Inventory: All Hardcoded Colors to Migrate

### popup.html `<style>` block — hardcoded hex values found

| Selector/Context | Property | Current Value | Suggested Token |
|-----------------|----------|---------------|-----------------|
| `body` | `background-color` | `#ffffff` | `var(--color-bg)` |
| `body` | `color` | `#333333` | `var(--color-text-body)` |
| `h1` | `color` | `#1a1a1a` | `var(--color-text-primary)` |
| `p` | `color` | `#666666` | `var(--color-text-muted)` |
| `.shot-count-container` | `background-color` | `#f5f5f5` | `var(--color-bg-surface)` |
| `.shot-count` | `color` | `#1976d2` | `var(--color-accent)` |
| `.toast.error` | `background-color` | `#d32f2f` | `var(--color-toast-err-bg)` |
| `.toast.success` | `background-color` | `#388e3c` | `var(--color-toast-ok-bg)` |
| `#export-btn:disabled, #clear-btn:disabled` | `background-color` | `#bdbdbd` | `var(--color-disabled)` |
| `#clear-btn` | `background-color` | `#f44336` | `var(--color-danger)` |
| `#clear-btn:hover:not(:disabled)` | `background-color` | `#d32f2f` | `var(--color-danger-hover)` |
| `.unit-selectors label` | `color` | `#666` | `var(--color-text-muted)` |
| `.unit-selectors select` | `border` | `1px solid #1976d2` | `var(--color-accent)` |
| `.unit-selectors select` | `background` | `#fff` | `var(--color-bg-card)` |
| `.unit-selectors select` | `color` | `#333` | `var(--color-text-body)` |
| `.unit-selectors select:focus` | `outline` | `2px solid #1976d2` | `var(--color-accent)` |
| `.ai-section` | `border-top` | `1px solid #e0e0e0` | `var(--color-border)` |
| `.ai-section h2` | `color` | `#1a1a1a` | `var(--color-text-primary)` |
| `.export-row button` | `background-color` | `#1976d2` | `var(--color-accent)` |
| `.export-row button:hover` | `background-color` | `#1565c0` | `var(--color-accent-hover)` |
| `.export-row button:disabled` | `background-color` | `#bdbdbd` | `var(--color-disabled)` |
| `.ai-group label` | `color` | `#666` | `var(--color-text-muted)` |
| `.ai-group select` | `border` | `1px solid #1976d2` | `var(--color-accent)` |
| `.ai-group select` | `background` | `#fff` | `var(--color-bg-card)` |
| `.ai-group select` | `color` | `#333` | `var(--color-text-body)` |
| `.ai-group select:focus` | `outline` | `2px solid #1976d2` | `var(--color-accent)` |
| `.btn-primary` | `background-color` | `#1976d2` | `var(--color-accent)` |
| `.btn-primary:hover` | `background-color` | `#1565c0` | `var(--color-accent-hover)` |
| `.btn-outline` | `color` | `#1976d2` | `var(--color-accent)` |
| `.btn-outline` | `border` | `2px solid #1976d2` | `var(--color-accent)` |
| `.btn-outline:hover` | `background-color` | `rgba(25, 118, 210, 0.08)` | `var(--color-accent-light)` |
| `.icon-btn` | `color` | `#666` | `var(--color-text-muted)` |
| `.icon-btn:hover` | `background-color` | `#f0f0f0` | `var(--color-bg-surface)` |
| `.icon-btn:hover` | `color` | `#1976d2` | `var(--color-accent)` |
| **JS inline** | `statusElement.style.color` | `"#d32f2f"` / `"#388e3c"` | CSS class + `var(--color-status-error/ok)` |

### options.html `<style>` block — hardcoded hex values found

| Selector/Context | Property | Current Value | Suggested Token |
|-----------------|----------|---------------|-----------------|
| `body` | `background-color` | `#f5f5f5` | `var(--color-bg-surface)` |
| `body` | `color` | `#333333` | `var(--color-text-body)` |
| `h1` | `color` | `#1a1a1a` | `var(--color-text-primary)` |
| `h2` | `color` | `#1a1a1a` | `var(--color-text-primary)` |
| `h2` | `border-bottom` | `2px solid #1976d2` | `var(--color-accent)` |
| `h3` | `color` | `#666` | `var(--color-text-muted)` |
| `.section` | `background` | `#ffffff` | `var(--color-bg-card)` |
| `.builtin-prompt-item` | `background` | `#f9f9f9` | `var(--color-bg-subtle)` |
| `.prompt-name` | `color` | `#1a1a1a` | `var(--color-text-primary)` |
| `.tier-badge.beginner` | `background` | `#e8f5e9` | `var(--color-badge-beginner-bg)` |
| `.tier-badge.beginner` | `color` | `#2e7d32` | `var(--color-badge-beginner-text)` |
| `.tier-badge.intermediate` | `background` | `#fff3e0` | `var(--color-badge-intermediate-bg)` |
| `.tier-badge.intermediate` | `color` | `#e65100` | `var(--color-badge-intermediate-text)` |
| `.tier-badge.advanced` | `background` | `#fce4ec` | `var(--color-badge-advanced-bg)` |
| `.tier-badge.advanced` | `color` | `#c62828` | `var(--color-badge-advanced-text)` |
| `.custom-prompt-item` | `border` | `1px solid #e0e0e0` | `var(--color-border)` |
| `.custom-prompt-name` | `color` | `#1a1a1a` | `var(--color-text-primary)` |
| `.btn-action` | `border` | `1px solid #1976d2` | `var(--color-accent)` |
| `.btn-action` | `color` | `#1976d2` | `var(--color-accent)` |
| `.btn-action:hover` | `background` | `rgba(25, 118, 210, 0.08)` | `var(--color-accent-light)` |
| `.btn-action.delete` | `border-color` | `#d32f2f` | `var(--color-status-error)` |
| `.btn-action.delete` | `color` | `#d32f2f` | `var(--color-status-error)` |
| `.btn-action.delete:hover` | `background` | `rgba(211, 47, 47, 0.06)` | `var(--color-danger-light)` |
| `.no-custom-prompts` | `color` | `#999` | `var(--color-text-muted)` |
| `.btn-secondary` | `color` | `#1976d2` | `var(--color-accent)` |
| `.btn-secondary` | `border` | `2px solid #1976d2` | `var(--color-accent)` |
| `.btn-secondary:hover` | `background` | `rgba(25, 118, 210, 0.08)` | `var(--color-accent-light)` |
| `#prompt-form` | `background` | `#f9f9f9` | `var(--color-bg-subtle)` |
| `#prompt-form` | `border` | `1px solid #e0e0e0` | `var(--color-border)` |
| `#prompt-form label` | `color` | `#555` | `var(--color-text-label)` |
| `#prompt-name-input, #prompt-template-input` | `border` | `1px solid #ccc` | `var(--color-border)` |
| `#prompt-name-input, #prompt-template-input` | `background` | `#fff` | `var(--color-bg-card)` |
| `#prompt-name-input, #prompt-template-input` | `color` | `#333` | `var(--color-text-body)` |
| `input:focus, textarea:focus` | `border-color` | `#1976d2` | `var(--color-accent)` |
| `input:focus, textarea:focus` | `box-shadow` | `0 0 0 2px rgba(25, 118, 210, 0.15)` | `var(--color-accent-ring)` |
| `.helper-text` | `color` | `#888` | `var(--color-text-muted)` |
| `.helper-text code` | `background` | `#efefef` | `var(--color-bg-surface)` |
| `.helper-text code` | `color` | `#555` | `var(--color-text-label)` |
| `.pref-group label` | `color` | `#555` | `var(--color-text-label)` |
| `#options-ai-service` | `border` | `1px solid #ccc` | `var(--color-border)` |
| `#options-ai-service` | `background` | `#fff` | `var(--color-bg-card)` |
| `#options-ai-service` | `color` | `#333` | `var(--color-text-body)` |
| `.btn-primary` | `background-color` | `#1976d2` | `var(--color-accent)` |
| `.btn-primary:hover` | `background-color` | `#1565c0` | `var(--color-accent-hover)` |
| `.toast.error` | `background-color` | `#d32f2f` | `var(--color-toast-err-bg)` |
| `.toast.success` | `background-color` | `#388e3c` | `var(--color-toast-ok-bg)` |

---

## Sources

### Primary (HIGH confidence)
- MDN Web Docs: `@media/prefers-color-scheme` — syntax, values, browser support (Baseline: widely available since Jan 2020)
  - https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme
- MDN Web Docs: `color-scheme` CSS property — native form control adaptation, `color-scheme: light dark` syntax
  - https://developer.mozilla.org/en-US/docs/Web/CSS/color-scheme
- MDN Web Docs: `light-dark()` CSS color function — Baseline 2024, Chrome 123+, requires `color-scheme: light dark`
  - https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/light-dark
- Direct source inspection: `src/popup/popup.ts`, `src/popup/popup.html`, `src/options/options.html`, `src/options/options.ts`, `scripts/build-extension.sh` — verified 2026-03-02

### Secondary (MEDIUM confidence)
- WebSearch: `light-dark()` Baseline 2024 confirmed across CSS-Tricks and caniuse references in search results — Chrome 123+ (May 2024)

### Tertiary (LOW confidence)
- Dark mode color value recommendations (e.g., `#64b5f6` for dark-mode accent) — based on Material Design conventions, not verified against this specific UI at runtime

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — `@media (prefers-color-scheme)` and CSS custom properties are MDN-verified, Baseline widely available
- Architecture patterns: HIGH — patterns derived from direct source inspection of the actual project files
- Color inventory: HIGH — direct line-by-line audit of popup.html and options.html
- JS inline style identification: HIGH — confirmed exactly one instance (`popup.ts:391`) via Grep
- Dark mode color values: LOW — design judgment, needs visual validation
- Pitfalls: HIGH — derived from both official CSS cascade rules and actual project structure

**Research date:** 2026-03-02
**Valid until:** 2026-06-02 (stable CSS spec, unlikely to change; color values need no freshness check)
