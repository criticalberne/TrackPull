# Phase 12: Prompt Preview - Research

**Researched:** 2026-03-03
**Domain:** Chrome extension popup HTML disclosure element, live DOM preview, CSS scroll containment
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AI-02 | User can preview the assembled prompt and data before sending to any AI service | `assemblePrompt()` in `src/shared/prompt_builder.ts` already produces the exact string that goes to the clipboard. A `<details>`/`<summary>` disclosure element containing a `<pre>` or `<textarea readonly>` can call `assemblePrompt()` with the same inputs used by the "Open in AI" and "Copy Prompt + Data" buttons, then display the result. Updating on prompt/service change is a `change` event listener on `#prompt-select` and `#ai-service-select`. |
</phase_requirements>

---

## Summary

Phase 12 adds a collapsible preview widget inside the `#ai-section` that shows the assembled prompt text before the user copies or launches. The core logic already exists: `assemblePrompt()` in `src/shared/prompt_builder.ts` is a pure function that takes a `PromptItem`, a TSV string, and optional metadata — the same inputs the "Open in AI" button uses. The widget renders the return value of that function inside a disclosure element (HTML `<details>`/`<summary>`).

The success criteria require four things: (1) a collapsible element showing the full assembled prompt and data, (2) live updates when prompt or AI service changes, (3) no outer-popup scrollbar from the widget, (4) readability in both light and dark mode. Point 3 is the most technically interesting: Chrome popup height is fixed (or grows to a max), so the preview area must use `overflow-y: auto` on a height-constrained inner element — not on the popup body. The existing CSS token system from Phase 9 handles point 4 automatically for any element that references `var(--color-*)` tokens.

The AI service selector is already in the popup but currently has no bearing on the assembled prompt text — the prompt content itself does not change per-service. However, success criterion 2 says the preview should "update immediately when the user changes the selected prompt or AI service." Since the assembled string does not actually differ by AI service (service only determines which URL to open), the preview should still respond to service changes (even if the text is identical) to satisfy the criterion literally. In practice, wiring the `change` event on both selects is the correct approach.

**Primary recommendation:** Add a `<details id="prompt-preview">` element at the bottom of `#ai-section` (below `.ai-actions`). Inside it, put a `<summary>` label and a `<pre>` with `overflow-y: auto; max-height: 200px` (or similar). In `popup.ts`, write an `updatePreview()` function that calls `assemblePrompt()` with `cachedData`, the current prompt, and metadata from cached values — then sets `pre.textContent`. Call `updatePreview()` from `promptSelect.addEventListener("change", ...)` and `aiServiceSelect.addEventListener("change", ...)`. Also call it from the initial DOMContentLoaded flow after the select values are restored, and from the `DATA_UPDATED` message handler.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| HTML `<details>`/`<summary>` | Native (no polyfill needed in Chrome MV3) | Collapsible disclosure widget with no JS toggle needed | Chrome 12+ support; MV3 targets modern Chrome only; zero JS required for open/close behavior |
| `assemblePrompt()` from `src/shared/prompt_builder.ts` | Project module | Produces the assembled prompt string for preview | Already used by "Open in AI" and "Copy Prompt + Data" buttons — single source of truth for the assembled string |
| `writeTsv()` from `src/shared/tsv_writer.ts` | Project module | Produces the TSV data block that goes into `assemblePrompt()` | Already used by the copy/launch buttons; preview must use same function to match what gets copied |
| CSS custom properties (`var(--color-*)`) | Phase 9 token set | Dark mode compatible styling | All tokens already defined; no new tokens needed |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `<pre>` or `<textarea readonly>` | Native | Renders the assembled prompt in monospace with preserved whitespace | `<pre>` for display-only; `<textarea readonly>` if copy-on-click or text selection is desired |
| `overflow-y: auto` + `max-height` | CSS | Scroll containment for preview area | Required to prevent the preview from expanding the popup body height past Chrome's popup max |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| HTML `<details>`/`<summary>` | JS-toggled `<div>` with a button | `<details>` is semantic, zero-JS for open/close, accessible natively; custom toggle adds DOM complexity for no benefit in this codebase |
| `<pre>` | `<textarea readonly>` | `<textarea>` allows text selection/copying directly from the widget; `<pre>` is simpler but preserves whitespace equally well; both work — `<pre>` preferred for read-only display |
| CSS `max-height` + `overflow-y: auto` | No height constraint | Without a height constraint, the preview expands the popup body, which Chrome may cap unpredictably or scroll the popup itself |
| Calling `assemblePrompt()` on preview expansion | Calling it on every prompt/service change | Lazy evaluation (only on expand) avoids unnecessary computation when preview is closed; however, success criterion 2 says "updates immediately when the user changes" — implies eager update is required so the content is ready when user opens the disclosure |

**Installation:** No new packages. All functions and APIs already exist in the project.

---

## Architecture Patterns

### Recommended Project Structure

No new files required. Changes touch:

```
src/
├── popup/
│   ├── popup.html     # Add <details> element + CSS for preview widget
│   └── popup.ts       # Add updatePreview() function, wire change listeners
dist/
├── popup.html         # Rebuilt by build script
└── popup.js           # Rebuilt by build script
```

### Pattern 1: `<details>`/`<summary>` Disclosure Element

**What:** Native HTML disclosure element. `<details>` is collapsed by default; `<details open>` is expanded. The `<summary>` child renders as the clickable toggle label.

**When to use:** When a section needs progressive disclosure (collapsed by default, expandable on click) with no JS toggle logic.

**Example:**
```html
<details id="prompt-preview">
  <summary>Preview prompt</summary>
  <pre id="prompt-preview-content"></pre>
</details>
```

```css
/* summary label styling */
details#prompt-preview > summary {
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-muted);
  list-style: none;   /* hides default disclosure triangle if desired */
  padding: 4px 0;
  user-select: none;
}

details#prompt-preview > summary::-webkit-details-marker {
  display: none;  /* Chrome-specific: removes the default triangle */
}

/* pre element: scroll containment */
#prompt-preview-content {
  max-height: 200px;
  overflow-y: auto;
  font-size: 11px;
  line-height: 1.4;
  background: var(--color-bg-subtle);
  color: var(--color-text-body);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 8px;
  white-space: pre-wrap;    /* wrap long lines within the width */
  word-break: break-word;
  margin: 6px 0 0 0;
}
```

**Confidence:** HIGH — `<details>`/`<summary>` is a stable native HTML element with full Chrome support. No polyfill or JS needed for toggle behavior.

### Pattern 2: `updatePreview()` Function

**What:** A synchronous function that reads `cachedData`, `cachedUnitChoice`, `cachedSurface`, `promptSelect.value`, and `aiServiceSelect.value`; calls `writeTsv()` and `assemblePrompt()`; sets `previewEl.textContent`.

**When to use:** Called from (a) prompt select `change`, (b) AI service select `change`, (c) after initial selects are restored on DOMContentLoaded, (d) `DATA_UPDATED` message handler.

**Example:**
```typescript
function updatePreview(): void {
  const previewEl = document.getElementById("prompt-preview-content") as HTMLElement | null;
  const promptSelect = document.getElementById("prompt-select") as HTMLSelectElement | null;
  if (!previewEl || !promptSelect) return;

  // Only populate preview when data is available
  if (!cachedData) {
    previewEl.textContent = "(No shot data captured yet)";
    return;
  }

  const prompt = findPromptById(promptSelect.value);
  if (!prompt) {
    previewEl.textContent = "";
    return;
  }

  const tsvData = writeTsv(cachedData, cachedUnitChoice, cachedSurface);
  const metadata = {
    date: cachedData.date,
    shotCount: countSessionShots(cachedData),
    unitLabel: buildUnitLabel(cachedUnitChoice),
    hittingSurface: cachedSurface,
  };

  const assembled = assemblePrompt(prompt, tsvData, metadata);
  previewEl.textContent = assembled;
}
```

**Key insight:** The function is synchronous (no async calls, no storage reads — all values are cached in module-level variables). This enables instant update on `change` events without await chains.

### Pattern 3: Event Listener Wiring

**What:** Attach `updatePreview()` as an additional listener on the existing `change` events for `#prompt-select` and `#ai-service-select`. These selectors are already wired in DOMContentLoaded. The preview listener is additive — it does not replace the existing save-to-storage listener.

**Example:**
```typescript
// Add to existing promptSelect change listener block:
promptSelect.addEventListener("change", () => {
  chrome.storage.local.set({ [STORAGE_KEYS.SELECTED_PROMPT_ID]: promptSelect.value });
  updatePreview();  // ADD THIS
});

// Add to existing aiServiceSelect change listener block:
aiServiceSelect.addEventListener("change", () => {
  chrome.storage.sync.set({ [STORAGE_KEYS.AI_SERVICE]: aiServiceSelect.value });
  updatePreview();  // ADD THIS
});

// After restoring saved values at end of DOMContentLoaded:
updatePreview();  // initial render
```

### Pattern 4: DATA_UPDATED Live Refresh

**What:** The popup listens for `DATA_UPDATED` messages from the service worker (fired when the content script captures new shots). The `updatePreview()` call must also be added to this listener so the preview refreshes automatically when new shot data arrives.

**Example:**
```typescript
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'DATA_UPDATED') {
    cachedData = (message.data as SessionData) ?? null;
    updateShotCount(message.data);
    updateExportButtonVisibility(message.data);
    updatePreview();  // ADD THIS
  }
  return true;
});
```

### Placement of `<details>` in the HTML

The `<details>` element should be placed **inside `#ai-section`**, after `.ai-actions`, so it:
1. Is hidden when no data is present (since `#ai-section` itself is `display:none` when `hasValidData` is false)
2. Is contextually grouped with the AI controls
3. Does not add vertical space when no data is loaded

```html
<div id="ai-section" class="ai-section" style="display:none;">
  <h2>AI Analysis</h2>
  <div class="ai-controls">...</div>
  <div class="ai-actions">...</div>
  <!-- ADD: -->
  <details id="prompt-preview">
    <summary>Preview prompt</summary>
    <pre id="prompt-preview-content"></pre>
  </details>
</div>
```

### Anti-Patterns to Avoid

- **Calling `assemblePrompt()` only on `<details>` open:** The `toggle` event on `<details>` fires when expanded. If preview is only updated on expand, the content may be stale (user changed prompt after last open). Eager update on change events ensures the preview is always current.
- **Putting the preview outside `#ai-section`:** The preview shows AI-specific content (the prompt + data). It should live and hide/show with the AI section. If placed outside, it will appear even when no data exists.
- **Using `overflow: auto` on `body` or the popup container:** The popup outer container must NOT get a scrollbar. The scroll constraint belongs on `#prompt-preview-content` (the `<pre>`) only.
- **Inline `style.display` to show/hide the `<details>`:** The `#ai-section` parent already handles visibility. The `<details>` itself never needs explicit show/hide logic.
- **Using `innerHTML` instead of `textContent`:** The assembled prompt contains user-defined custom prompt text (from the options page) and shot data. Setting `innerHTML` would be an XSS risk if any template or data contains HTML metacharacters. Always use `textContent`.
- **`white-space: pre` without `word-break: break-word`:** Long TSV lines in the assembled prompt will overflow the `<pre>` element horizontally if not wrapped. Use `white-space: pre-wrap` + `word-break: break-word` to wrap without losing line structure.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Collapsible toggle behavior | JS click handler + `classList.toggle("open")` | Native `<details>`/`<summary>` | Zero JS, accessible, keyboard-navigable, browser handles animation/state |
| Assembled prompt string | Duplicate assembly logic in popup.ts | `assemblePrompt()` from `prompt_builder.ts` | Single source of truth; already tested; duplicating creates divergence risk |
| TSV generation for preview | Duplicate `writeTsv()` logic | `writeTsv()` from `tsv_writer.ts` | Same function used by copy buttons; preview must match what gets copied |
| Scroll containment | JS height measurement + overflow detection | CSS `max-height` + `overflow-y: auto` on the inner element | Pure CSS; no layout event listeners needed; resize-safe |

**Key insight:** This phase is almost entirely wiring, not building. `assemblePrompt()` already returns the correct string. The preview is just: call the same function that the copy buttons call, put the result in a `<pre>`, wrap in a `<details>`. The only non-trivial decision is scroll containment (max-height on the inner element).

---

## Common Pitfalls

### Pitfall 1: Popup Body Scrollbar From Unbounded Preview Height

**What goes wrong:** Adding a `<pre>` containing a long assembled prompt (template text + TSV data for 50+ shots across multiple clubs can easily be 3000+ characters) expands the popup to its max height and causes Chrome to show a scrollbar on the outer popup container. This violates success criterion 3.

**Why it happens:** Chrome popup height grows with content up to a browser-defined maximum (~600px on most systems). If `<pre>` has no height constraint and `overflow: visible` (the default), it expands the popup body.

**How to avoid:** Apply `max-height: 200px; overflow-y: auto;` to `#prompt-preview-content` (the `<pre>` element), not to `body`. The preview scrolls internally; the popup body does not scroll. Tune `max-height` based on how much vertical space the popup has remaining when the AI section is visible. A value of `150px`–`220px` is a reasonable range.

**Warning signs:** Chrome popup gets a vertical scrollbar when the `<details>` is opened.

### Pitfall 2: `updatePreview()` Called Before Selects Are Wired

**What goes wrong:** If `updatePreview()` is called during DOMContentLoaded setup before `promptSelect.value` has been set to the saved value (i.e., before the `chrome.storage.local.get` for `SELECTED_PROMPT_ID` resolves), the preview renders the default-selected prompt option, not the user's saved prompt.

**Why it happens:** DOMContentLoaded setup has async gaps: the prompt select value is restored after an async `chrome.storage.local.get` call for `SELECTED_PROMPT_ID` (line ~185 in popup.ts). The initial `updatePreview()` call must come **after** both the prompt select and AI service select have their stored values set.

**How to avoid:** Call `updatePreview()` at the end of the DOMContentLoaded `try` block, after the saved prompt ID and AI service are restored to their selects. The existing code flow: `renderPromptSelect` → `get SELECTED_PROMPT_ID` → `set promptSelect.value` → `get AI_SERVICE` → `set aiServiceSelect.value`. Call `updatePreview()` after the last of these resolves.

**Warning signs:** Preview shows a different prompt than the one displayed in the dropdown on popup open.

### Pitfall 3: `innerHTML` XSS Exposure

**What goes wrong:** If `previewEl.innerHTML = assembled` is used instead of `previewEl.textContent = assembled`, any `<`, `>`, or `&` characters in the prompt template or shot data will be parsed as HTML. Custom prompts from the options page (stored in `chrome.storage.local`) could contain HTML metacharacters if the user typed them, or characters that accidentally form tags.

**Why it happens:** Developers habitually reach for `innerHTML` when setting content; `textContent` may be overlooked.

**How to avoid:** Always use `textContent` for the preview element. The `<pre>` element with `white-space: pre-wrap` will render newlines and spacing correctly without needing HTML interpretation.

**Warning signs:** Preview renders odd HTML artifacts or blank areas for shots with certain metric values.

### Pitfall 4: Preview Shows Stale Content After `handleClearClick`

**What goes wrong:** When the user clicks "Clear Session Data," `cachedData` is set to `null` and `updateShotCount(null)` / `updateExportButtonVisibility(null)` are called. But since `#ai-section` (which contains the `<details>`) is hidden by `updateExportButtonVisibility` when `hasValidData` is false, the `<details>` becomes hidden. This is correct behavior — no update to `updatePreview()` is needed for the clear case because the container is hidden.

**Why it happens (trap for the planner):** A planner might add `updatePreview()` to `handleClearClick` when it is actually unnecessary. Adding it is harmless but not required.

**How to avoid:** No action needed. The `#ai-section` `display:none` hiding on clear already means the stale preview is not visible. If the user re-captures data, `DATA_UPDATED` fires and `updatePreview()` is called there.

### Pitfall 5: `<details>` State Not Preserved Across Popup Close/Open

**What goes wrong:** Chrome popup lifecycle: every popup open is a fresh DOM. The `<details open>` attribute is not persisted in `chrome.storage`. So on every popup open, the preview is collapsed (which is the correct default — most users won't want the preview open by default).

**Why it happens:** Developers may try to persist the disclosure state.

**How to avoid:** Do not persist the `<details open>` state. Collapsed-by-default is correct. Users who want to inspect the prompt expand it; they can do so quickly since it is always present.

### Pitfall 6: Long TSV Lines Cause Horizontal Overflow in `<pre>`

**What goes wrong:** TSV data rows are tab-separated. A row with 20+ metric columns can be hundreds of characters wide. If `white-space: pre` is used (the default for `<pre>`), horizontal scrolling or overflow occurs.

**Why it happens:** `white-space: pre` preserves newlines but does not wrap long lines.

**How to avoid:** Set `white-space: pre-wrap; word-break: break-word;` on `#prompt-preview-content`. This wraps long lines while preserving intentional newlines in the prompt template. The TSV data loses strict tab-alignment when wrapped but remains readable.

---

## Code Examples

Verified patterns from the existing codebase:

### Current `assemblePrompt` call in "Open in AI" handler (popup.ts lines 247–254)

```typescript
// Source: src/popup/popup.ts lines 247-254 (direct inspection 2026-03-03)
const tsvData = writeTsv(cachedData, cachedUnitChoice, cachedSurface);
const metadata = {
  date: cachedData.date,
  shotCount: countSessionShots(cachedData),
  unitLabel: buildUnitLabel(cachedUnitChoice),
  hittingSurface: cachedSurface,
};
const assembled = assemblePrompt(prompt, tsvData, metadata);
```

The `updatePreview()` function reuses this exact pattern — same inputs, same output. The preview IS the assembled string.

### `findPromptById()` (popup.ts lines 66-70)

```typescript
// Source: src/popup/popup.ts lines 66-70 (direct inspection 2026-03-03)
function findPromptById(id: string): PromptItem | undefined {
  const builtIn = BUILTIN_PROMPTS.find(p => p.id === id);
  if (builtIn) return builtIn;
  return cachedCustomPrompts.find(p => p.id === id);
}
```

`updatePreview()` calls `findPromptById(promptSelect.value)` — same as the copy/launch handlers.

### Module-level cached values available to `updatePreview()` (popup.ts lines 17-20)

```typescript
// Source: src/popup/popup.ts lines 17-20 (direct inspection 2026-03-03)
let cachedData: SessionData | null = null;
let cachedUnitChoice: UnitChoice = DEFAULT_UNIT_CHOICE;
let cachedSurface: "Grass" | "Mat" = "Mat";
let cachedCustomPrompts: CustomPrompt[] = [];
```

All inputs to `assemblePrompt()` are already cached at module level. `updatePreview()` is synchronous.

### Existing `change` listener on `promptSelect` (popup.ts lines 199-201)

```typescript
// Source: src/popup/popup.ts lines 199-201 (direct inspection 2026-03-03)
promptSelect.addEventListener("change", () => {
  chrome.storage.local.set({ [STORAGE_KEYS.SELECTED_PROMPT_ID]: promptSelect.value });
});
```

Add `updatePreview()` call inside this callback.

### Full `updatePreview()` implementation (proposed)

```typescript
// Proposed: src/popup/popup.ts — new function
function updatePreview(): void {
  const previewEl = document.getElementById("prompt-preview-content") as HTMLPreElement | null;
  const promptSelect = document.getElementById("prompt-select") as HTMLSelectElement | null;
  if (!previewEl || !promptSelect) return;

  if (!cachedData) {
    previewEl.textContent = "(No shot data captured yet — capture a session to preview)";
    return;
  }

  const prompt = findPromptById(promptSelect.value);
  if (!prompt) {
    previewEl.textContent = "";
    return;
  }

  const tsvData = writeTsv(cachedData, cachedUnitChoice, cachedSurface);
  const metadata = {
    date: cachedData.date,
    shotCount: countSessionShots(cachedData),
    unitLabel: buildUnitLabel(cachedUnitChoice),
    hittingSurface: cachedSurface,
  };

  previewEl.textContent = assemblePrompt(prompt, tsvData, metadata);
}
```

### HTML structure for `<details>` widget (proposed)

```html
<!-- Add inside #ai-section, after .ai-actions div -->
<details id="prompt-preview">
  <summary id="prompt-preview-summary">Preview prompt</summary>
  <pre id="prompt-preview-content"></pre>
</details>
```

### CSS for the preview widget (proposed, using Phase 9 tokens)

```css
/* Add to inline <style> in popup.html */

details#prompt-preview {
  margin-top: 10px;
}

details#prompt-preview > summary {
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-muted);
  padding: 4px 0;
  user-select: none;
}

#prompt-preview-content {
  max-height: 200px;
  overflow-y: auto;
  font-size: 11px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  background: var(--color-bg-subtle);
  color: var(--color-text-body);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 8px;
  margin: 6px 0 0 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
```

---

## State of the Art

| Old Approach | Current Approach | Notes |
|--------------|------------------|-------|
| No preview — user can only inspect the assembled prompt after copying to clipboard | `<details>` disclosure in popup shows the assembled string before copy/launch | Phase 12 addition |
| Custom JS toggles for collapsible sections | Native `<details>`/`<summary>` | Phase 9 and 10 used CSS class patterns; Phase 12 uses the native disclosure element — appropriate since there is no state that needs persistence |

**Deprecated/outdated:**
- Custom JS accordion implementations: Not applicable here; `<details>` is the modern standard for single-level disclosure in static HTML. No custom JS needed.

---

## Open Questions

1. **`max-height` value for `#prompt-preview-content`**
   - What we know: Chrome popup grows with content up to a browser-defined max (approximately 600px screen height). The popup with full AI section visible (prompt dropdown, service dropdown, action buttons) is already ~350-400px before the preview. Expanding the preview adds to this.
   - What's unclear: The exact remaining height budget without testing in a real Chrome popup. The assembled prompt for a large session (8+ clubs, 10 shots each) with metadata can be 4000+ characters, which at 11px font is many lines.
   - Recommendation: Start with `max-height: 180px`. If the popup hits the Chrome height cap during manual testing, reduce. If 180px is too small to be useful, increase to 220px. This is a test-and-observe calibration — cannot be determined precisely without running the extension.

2. **"Preview prompt" summary label — when no data is present**
   - What we know: `#ai-section` is hidden when no data is present, so the `<details>` is also hidden. The preview widget is only visible when `hasValidData` is true.
   - What's unclear: Whether the `<pre>` should show a placeholder message when `cachedData` is null (can this ever occur when the AI section is visible?). Given `updateExportButtonVisibility` gates the AI section on `hasValidData`, in practice `cachedData` should always be non-null when the preview is visible.
   - Recommendation: Include the `"(No shot data captured yet)"` fallback in `updatePreview()` as a defensive guard, even though it should never render in practice.

3. **Whether to include character count or line count in the summary label**
   - What we know: Success criterion 1 says "shows the full assembled prompt text and shot data when expanded."
   - What's unclear: Whether augmenting the summary label with "(~1200 chars)" or similar would be useful UX.
   - Recommendation: Claude's discretion. A simple "Preview prompt" label is sufficient. Adding a character count would require updating the summary on every preview change (more DOM writes). Omit for simplicity.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 4.0.18 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AI-02 | `assemblePrompt()` returns the string the preview will display | unit (already tested) | `npx vitest run tests/test_prompt_builder.ts` | ✅ exists |
| AI-02 | Preview DOM element receives `textContent` equal to `assemblePrompt()` output | unit (DOM-dependent — not testable in vitest without DOM environment) | manual-only | N/A |
| AI-02 | `<details>` disclosure is collapsed by default, expands on click | manual-only | N/A | N/A |
| AI-02 | Preview updates when prompt select changes | manual-only | N/A | N/A |
| AI-02 | Preview updates when AI service select changes | manual-only | N/A | N/A |
| AI-02 | No outer popup scrollbar when preview is expanded | manual-only | N/A | N/A |
| AI-02 | Preview is readable in dark mode | manual-only | N/A | N/A |

**Note:** The popup DOM interaction (change events, textContent updates) is not testable with vitest in this project (no jsdom or happy-dom configured; no Chrome API mocks in place). The unit-testable behavior — `assemblePrompt()` producing the correct string — is already fully covered in `tests/test_prompt_builder.ts`. The implementation correctness must be verified via manual extension load and visual inspection.

### Sampling Rate

- **Per task commit:** `npx vitest run`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green + manual popup load verification before `/gsd:verify-work`

### Wave 0 Gaps

None — existing `test_prompt_builder.ts` covers the core function. No new test files required.

*(The popup DOM behavior is manual-only given the project's testing conventions. This is consistent with how all prior phases handled popup.ts changes — no popup DOM unit tests exist in the project.)*

---

## Sources

### Primary (HIGH confidence)

- `src/popup/popup.ts` — full file inspection (2026-03-03): verified module-level cached variables (`cachedData`, `cachedUnitChoice`, `cachedSurface`, `cachedCustomPrompts`), existing `assemblePrompt()` call pattern in "Open in AI" handler (lines 247-254), `findPromptById()` function (lines 66-70), `DATA_UPDATED` message listener (lines 154-161), prompt select change listener (lines 199-201), AI service select change listener (lines 215-217)
- `src/popup/popup.html` — full file inspection (2026-03-03): verified `#ai-section` structure, `.ai-actions` placement, existing CSS token system, CSS `var(--color-*)` token set
- `src/shared/prompt_builder.ts` — full file inspection (2026-03-03): verified `assemblePrompt()` signature and pure function nature
- `src/shared/tsv_writer.ts` — full file inspection (2026-03-03): verified `writeTsv()` signature
- `src/shared/prompt_types.ts` — full file inspection (2026-03-03): verified `PromptItem` type
- `tests/test_prompt_builder.ts` — full file inspection (2026-03-03): confirmed existing coverage of `assemblePrompt()`
- `.planning/ROADMAP.md` — Phase 12 success criteria (2026-03-02)
- `.planning/REQUIREMENTS.md` — AI-02 requirement definition

### Secondary (MEDIUM confidence)

- MDN Web Docs knowledge (training): `<details>`/`<summary>` element behavior — collapsed by default, `open` attribute for expanded state, `toggle` event. Verified against Chrome's known comprehensive support for this element (Chrome 12+, MV3 targets modern Chrome only).
- CSS `white-space: pre-wrap` + `word-break: break-word` behavior — standard CSS properties, behavior well-established.

### Tertiary (LOW confidence)

- Chrome popup max height (~600px) — estimated from general Chrome extension knowledge; not verified against official documentation for this research. Actual max may vary by Chrome version and OS. The `max-height` value on the inner `<pre>` is the correct mitigation regardless of the exact cap.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; all functions already exist in the codebase; `<details>`/`<summary>` is native HTML
- Architecture: HIGH — `updatePreview()` pattern derived directly from inspecting the existing "Open in AI" button handler; cached variables already available; wiring points clearly identified
- Pitfalls: HIGH — derived from direct source code inspection and known DOM behavior; XSS risk (textContent vs innerHTML) is well-established; scroll containment is a CSS fundamentals issue
- Chrome popup height constraint: MEDIUM — estimated, not verified against official docs; the CSS mitigation (max-height on inner element) is correct regardless of the exact cap value

**Research date:** 2026-03-03
**Valid until:** 2026-04-03 (stable — pure HTML/CSS/TS with no external dependencies)
