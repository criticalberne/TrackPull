# Phase 10: Empty State Guidance - Research

**Researched:** 2026-03-03
**Domain:** Chrome extension popup DOM manipulation, CSS empty-state patterns, flicker prevention
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Message content**
- Instructional tone — direct and helpful, tells the user what to do next
- Two-part message: primary instruction + smaller secondary hint
- References Trackman specifically (users know what this extension is for)
- Primary message: "Open a Trackman report to capture shots"
- Secondary hint wording: Claude's discretion (something about auto-detection or workflow)

**Visual presentation**
- Replace the big "0" number with guidance text inside the existing `#shot-count-container`
- Hide the "Shot Count" (`<h2>`) heading when empty — guidance message stands alone in the container
- Text only — no icons, illustrations, or emoji. Consistent with the rest of the popup
- Text sizing smaller than the 48px shot count number — Claude's discretion on exact size

**State transitions**
- Loading → Empty flicker prevention: Claude's discretion on approach (keep "Loading..." vs start hidden vs other)
- Auto-switch to shot count when data arrives via existing `DATA_UPDATED` message listener — no extra code needed
- After clearing session data, show the guidance message again (same as first-open empty state)
- Success criteria #2: guidance must NOT flash briefly when data IS present — only show after storage resolves as empty

**Scope of change**
- Unit selectors (Speed, Distance, Surface): stay visible when empty — users can pre-configure preferences
- Clear button: hide when no data (nothing to clear)
- Settings gear: always visible regardless of state
- Export row and AI section: already hidden when empty (existing behavior, no change)

### Claude's Discretion
- Secondary hint message wording
- Guidance text sizing within the container
- Loading state flicker prevention approach
- CSS class naming for empty state styling

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UI-02 | User sees actionable guidance (not a bare "0") when no shot data is available | `updateShotCount()` is the single mutation point; HTML and CSS patterns are established in Phase 9 with `var(--color-*)` tokens and `classList`-based state classes |
</phase_requirements>

---

## Summary

Phase 10 is a focused DOM + CSS change with no new dependencies. The entire implementation lives in two files: `src/popup/popup.ts` (TypeScript logic) and `src/popup/popup.html` (markup + inline CSS). The primary touch point is `updateShotCount()`, which currently sets `textContent = "0"` when storage resolves empty. The task is to replace that dead-end with a two-part guidance block, hide the `<h2>Shot Count</h2>` heading during the empty state, and hide the Clear button when empty.

The established pattern from Phase 9 is to use CSS classes plus `var(--color-*)` token references — never inline styles. Dark mode compatibility is therefore automatic: any new text colors must reference the existing token set defined in the `:root` block. No new tokens are needed; `var(--color-text-muted)` or `var(--color-text-body)` are appropriate for guidance text.

Flicker prevention is the only subtle requirement. The popup starts with `Loading...` in `#shot-count`. The storage read is async (`chrome.storage.local.get`). If the popup starts in a "show guidance" state before storage resolves, users with data will see a flash of guidance before the count appears. The correct approach is to keep the initial `Loading...` text until the storage promise resolves, then branch: show guidance (empty) or show count (has data). No additional element hiding or "start hidden" technique is needed beyond what already exists.

**Primary recommendation:** In `updateShotCount()`, replace the `textContent = "0"` branch with DOM manipulation that injects the guidance elements and adds a CSS class to `#shot-count-container`; reverse the DOM state in the data-present branch. Use `classList`-based state classes for all styling. Extend `updateExportButtonVisibility()` (or a new parallel function) to also hide/show `#clear-btn`.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| DOM `classList` API | Native | Add/remove state classes to drive CSS visibility | Phase 9 established pattern — classList, not inline styles |
| CSS custom properties (`var(--color-*)`) | Native | Token-based colors for dark mode compatibility | Phase 9 token set already covers all needed colors; reuse only |
| `display: none` / `style.display` | Native | Show/hide the `<h2>` heading and Clear button | Already used in `updateExportButtonVisibility()` for export-row and ai-section |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `createElement` / `innerHTML` | Native | Inject guidance markup dynamically | Use when the guidance DOM does not exist as a static element in the HTML (dynamic approach) |
| Static HTML `hidden` attribute or `display:none` class | Native | Pre-declare guidance elements in HTML and toggle visibility | Use when guidance elements are declared statically in popup.html (static approach) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Static HTML guidance element (toggle visibility) | Dynamic createElement in JS | Static is simpler to CSS-style and avoids repeated DOM construction; dynamic avoids HTML clutter — both work, static preferred |
| CSS class `.empty-state` on container | Inline `style.display` | Class-based matches Phase 9 pattern; inline styles override CSS cascade and break dark mode |
| Hiding `<h2>` with `display:none` on element | CSS `.container.empty-state h2 { display:none }` | CSS rule is cleaner; direct `style.display` on the element is equally valid and more explicit given existing patterns in the file |

**Installation:** No packages required — pure TypeScript DOM manipulation and inline CSS.

---

## Architecture Patterns

### Recommended Approach: Static HTML + CSS Class Toggle

Declare the guidance elements statically in `popup.html` inside `#shot-count-container`. Toggle an `.empty-state` CSS class on the container (or use `hidden` attribute on individual elements). This is the cleanest match to Phase 9 patterns.

**Resulting HTML structure (proposed):**
```html
<div id="shot-count-container">
  <h2 id="shot-count-heading">Shot Count</h2>
  <div id="shot-count" class="shot-count">Loading...</div>
  <div id="empty-guidance" class="empty-guidance">
    <p class="empty-guidance-primary">Open a Trackman report to capture shots</p>
    <p class="empty-guidance-hint">[secondary hint — Claude's discretion]</p>
  </div>
</div>
```

**CSS toggle pattern (Phase 9 style):**
```css
/* Default: guidance hidden, shot count visible */
#empty-guidance { display: none; }
#shot-count-heading { display: block; }  /* or inherits */

/* Empty state: guidance visible, heading + count hidden */
#shot-count-container.empty-state #empty-guidance { display: block; }
#shot-count-container.empty-state #shot-count-heading { display: none; }
#shot-count-container.empty-state #shot-count { display: none; }
```

**TypeScript update pattern (Phase 9 style):**
```typescript
function updateShotCount(data: unknown): void {
  const container = document.getElementById("shot-count-container");
  const shotCountElement = document.getElementById("shot-count");
  if (!container || !shotCountElement) return;

  const isEmpty = !data || typeof data !== "object" || !hasShots(data);

  if (isEmpty) {
    container.classList.add("empty-state");
    // shot count text content: leave as-is or clear — it's hidden
  } else {
    container.classList.remove("empty-state");
    shotCountElement.textContent = String(countShots(data));
  }
}
```

### Pattern: Clear Button Hide/Show

`updateExportButtonVisibility()` already shows/hides `#export-row` and `#ai-section` using `style.display`. Extend it (or add a parallel call in the same flow) to hide `#clear-btn` when data is null/empty.

```typescript
function updateExportButtonVisibility(data: unknown): void {
  const exportRow = document.getElementById("export-row");
  const aiSection = document.getElementById("ai-section");
  const clearBtn = document.getElementById("clear-btn");  // ADD

  const hasValidData = data && typeof data === "object" &&
    (data as Record<string, unknown>)["club_groups"];

  if (exportRow) exportRow.style.display = hasValidData ? "flex" : "none";
  if (aiSection) aiSection.style.display = hasValidData ? "block" : "none";
  if (clearBtn) clearBtn.style.display = hasValidData ? "block" : "none";  // ADD
}
```

### Flicker Prevention Pattern

The popup's `DOMContentLoaded` handler sequence is:
1. Call `chrome.storage.local.get(...)` — async
2. Await result
3. Call `updateShotCount(data)` and `updateExportButtonVisibility(data)`

The initial HTML shows `Loading...` in `#shot-count`. This is correct — it prevents any flash because nothing commits to "empty" or "has data" until the storage promise resolves. The `Loading...` text is replaced by either the shot count OR guidance only after storage resolves. No additional flicker prevention mechanism is needed.

The only risk is the inverse case: if guidance elements start visible in HTML. They must start hidden (either `display: none` in CSS or `hidden` attribute in HTML).

### Anti-Patterns to Avoid

- **Inline styles for guidance visibility:** `element.style.display = "none"` on the guidance elements breaks CSS cascade priority — use CSS class `.empty-state` on the container, then CSS rules show/hide children. The exception: the existing pattern uses `style.display` for `export-row` and `ai-section` — it is acceptable to follow the same pattern for `clear-btn` for consistency, but the guidance element itself should use CSS classes.
- **Starting guidance visible in HTML:** If `#empty-guidance` lacks `display: none` in CSS by default, users with data will see guidance flash during the async storage read.
- **Separate "empty state" element outside `#shot-count-container`:** The decision locks guidance inside `#shot-count-container` — don't add a sibling element.
- **Modifying `DATA_UPDATED` listener separately:** The listener already calls `updateShotCount(message.data)` — no changes needed there; the fix in `updateShotCount` covers all three call sites automatically (initial load, DATA_UPDATED, handleClearClick).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dark mode guidance text colors | New CSS tokens or hardcoded dark/light hex pairs | `var(--color-text-muted)` and `var(--color-text-body)` from Phase 9 token set | Tokens already defined for both modes; adding hardcoded colors breaks dark mode |
| Flicker prevention | setTimeout delay, opacity transitions, two-phase render | Keep `Loading...` initial state, resolve once, branch | Storage resolves fast (~1–5ms local); any added delay adds visible latency |

**Key insight:** Phase 9 solved the dark mode problem completely. This phase only adds content — the token system handles theme adaptation automatically with zero extra work.

---

## Common Pitfalls

### Pitfall 1: CSS Selector Mismatch — `.shot-count-container` vs `#shot-count-container`

**What goes wrong:** The CSS block in `popup.html` defines `.shot-count-container` (class selector), but the HTML element is `<div id="shot-count-container">` with **no class attribute**. The existing CSS rule `.shot-count-container { ... }` does not currently apply to the element at all.

**Why it happens:** The element was styled with a class in the CSS but the HTML uses only an ID — a pre-existing mismatch that went unnoticed because the element renders with browser defaults (block display, no background, no padding). The container may have been intended to use a class but was written with an ID in the HTML.

**How to avoid:** When adding new CSS rules for the empty state, target `#shot-count-container` (ID selector) not `.shot-count-container` (class selector). If adding the `.empty-state` class for state toggling, write: `#shot-count-container.empty-state { ... }` and child rules as `#shot-count-container.empty-state #empty-guidance { ... }`. Do not fix the pre-existing mismatch unless explicitly in scope.

**Warning signs:** The container background (`#f5f5f5` / `var(--color-bg-surface)`) is not visible in the rendered popup — the existing `.shot-count-container` CSS does not apply.

### Pitfall 2: Guidance Visible on Initial Load (Flicker in Reverse)

**What goes wrong:** If `#empty-guidance` starts with `display: block` (or no explicit `display: none`) in CSS, users who have shot data will briefly see the guidance message before the async storage read resolves and `updateShotCount` fires.

**Why it happens:** CSS default for `display` on `<p>` and `<div>` is `block`/`inline` — elements render unless explicitly hidden.

**How to avoid:** Add `#empty-guidance { display: none; }` to the CSS (or `style="display:none"` inline in HTML). The `empty-state` class then overrides to `display: block`. Default is hidden; active empty state makes it visible.

**Warning signs:** Users with data see a brief flash of guidance text when the popup opens.

### Pitfall 3: Three Call Sites Must All Work — updateShotCount is Called From Three Places

**What goes wrong:** Updating `updateShotCount` for the initial load case but forgetting it is also called from the `DATA_UPDATED` message handler and `handleClearClick`. If the function is correct, all three cases work automatically. But if the implementation uses a one-time setup (e.g., only runs once in DOMContentLoaded), it will fail for live updates.

**Why it happens:** Forgetting to trace all callers.

**How to avoid:** The fix must be inside `updateShotCount()` itself (not in DOMContentLoaded setup code). Current call sites:
- Line 85: `updateShotCount(data)` — initial load
- Line 148: `updateShotCount(message.data)` — live DATA_UPDATED
- Line 414: `updateShotCount(null)` — after clear

All three will get empty state guidance correctly if the function itself handles the null/empty case correctly.

**Warning signs:** After clearing data, the count goes to "0" instead of guidance — means the null case wasn't handled in the function.

### Pitfall 4: Clear Button Visibility — Currently Always Visible

**What goes wrong:** `#clear-btn` is always rendered in the HTML (`<button id="clear-btn">Clear Session Data</button>` at line 412, outside any conditional display container). It has no initial `style="display:none"` and `updateExportButtonVisibility` does not touch it. A bare Clear button on an empty popup is misleading and should be hidden.

**Why it happens:** The button's hide/show logic was simply never implemented.

**How to avoid:** Add `clearBtn.style.display = hasValidData ? "block" : "none"` to `updateExportButtonVisibility`. Also add `style="display:none"` as the initial HTML state to prevent the button from showing before DOMContentLoaded fires (or rely on the async load being fast enough — given `Loading...` appears first, this is acceptable).

**Warning signs:** Clear button is still visible when popup opens with no data.

---

## Code Examples

Verified patterns from existing codebase:

### Current updateShotCount (popup.ts lines 294–320)

```typescript
// Source: src/popup/popup.ts lines 294–320 (direct inspection 2026-03-03)
function updateShotCount(data: unknown): void {
  const shotCountElement = document.getElementById("shot-count");
  if (!shotCountElement) return;

  if (!data || typeof data !== "object") {
    shotCountElement.textContent = "0";  // <-- REPLACE with empty state
    return;
  }

  const sessionData = data as Record<string, unknown>;
  const clubGroups = sessionData["club_groups"] as Array<Record<string, unknown>> | undefined;

  if (!clubGroups || !Array.isArray(clubGroups)) {
    shotCountElement.textContent = "0";  // <-- REPLACE with empty state
    return;
  }

  let totalShots = 0;
  for (const club of clubGroups) {
    const shots = club["shots"] as Array<Record<string, unknown>> | undefined;
    if (shots && Array.isArray(shots)) {
      totalShots += shots.length;
    }
  }

  shotCountElement.textContent = totalShots.toString();
}
```

### Proposed updateShotCount (after Phase 10)

```typescript
// Source: proposed pattern — Phase 10
function updateShotCount(data: unknown): void {
  const container = document.getElementById("shot-count-container");
  const shotCountElement = document.getElementById("shot-count");
  if (!container || !shotCountElement) return;

  const isEmpty = !isValidSessionData(data);

  if (isEmpty) {
    container.classList.add("empty-state");
    return;
  }

  container.classList.remove("empty-state");

  const sessionData = data as Record<string, unknown>;
  const clubGroups = sessionData["club_groups"] as Array<Record<string, unknown>>;
  let totalShots = 0;
  for (const club of clubGroups) {
    const shots = club["shots"] as Array<Record<string, unknown>> | undefined;
    if (shots && Array.isArray(shots)) totalShots += shots.length;
  }
  shotCountElement.textContent = totalShots.toString();
}
```

### Empty State CSS (popup.html inline `<style>`)

```css
/* Source: proposed pattern using Phase 9 token system — Phase 10 */

/* Guidance elements: hidden by default */
#empty-guidance {
  display: none;
}

/* When container has empty-state class: show guidance, hide count elements */
#shot-count-container.empty-state #empty-guidance {
  display: block;
}
#shot-count-container.empty-state #shot-count {
  display: none;
}
#shot-count-container.empty-state #shot-count-heading {
  display: none;
}

/* Guidance text styling — uses Phase 9 tokens for dark mode */
.empty-guidance-primary {
  font-size: 16px;
  font-weight: 500;
  color: var(--color-text-primary);
  margin: 0 0 6px 0;
}

.empty-guidance-hint {
  font-size: 13px;
  color: var(--color-text-muted);
  margin: 0;
}
```

### HTML Structure (popup.html body)

```html
<!-- Source: proposed structure — Phase 10 -->
<div id="shot-count-container">
  <h2 id="shot-count-heading">Shot Count</h2>
  <div id="shot-count" class="shot-count">Loading...</div>
  <div id="empty-guidance">
    <p class="empty-guidance-primary">Open a Trackman report to capture shots</p>
    <p class="empty-guidance-hint">[secondary hint]</p>
  </div>
</div>
```

Note: `<h2>` gains `id="shot-count-heading"` to be targetable by CSS. Current HTML has no ID on the `<h2>`.

### Clear Button — updateExportButtonVisibility extension

```typescript
// Source: src/popup/popup.ts lines 322–331 (direct inspection 2026-03-03) — annotated with addition
function updateExportButtonVisibility(data: unknown): void {
  const exportRow = document.getElementById("export-row");
  const aiSection = document.getElementById("ai-section");
  const clearBtn = document.getElementById("clear-btn");  // ADD

  const hasValidData = data && typeof data === "object" &&
    (data as Record<string, unknown>)["club_groups"];

  if (exportRow) exportRow.style.display = hasValidData ? "flex" : "none";
  if (aiSection) aiSection.style.display = hasValidData ? "block" : "none";
  if (clearBtn) clearBtn.style.display = hasValidData ? "block" : "none";  // ADD
}
```

---

## State of the Art

| Old Approach | Current Approach | Notes |
|--------------|------------------|-------|
| Show "0" on empty | Show guidance message | Phase 10 change |
| Clear button always visible | Clear button hidden when no data | Phase 10 change |
| `<h2>Shot Count</h2>` always visible | `<h2>` hidden in empty state | Phase 10 change |

No deprecated techniques involved — this is a first implementation of empty state guidance.

---

## Implementation Scope Summary

**Files to change:**

| File | Changes |
|------|---------|
| `src/popup/popup.html` | Add `id="shot-count-heading"` to `<h2>`, add `#empty-guidance` div with two `<p>` children, add CSS rules for `.empty-state` class and guidance styling |
| `src/popup/popup.ts` | Refactor `updateShotCount()` to toggle `.empty-state` class instead of setting `textContent = "0"`, extend `updateExportButtonVisibility()` to hide/show `#clear-btn` |
| `scripts/dist/` | Rebuild via `bash scripts/build-extension.sh` after changes |

**Files NOT to change:** `src/options/`, `src/shared/`, `src/manifest.json`, any test files (popup logic is DOM-dependent; vitest cannot test DOM interactions per existing test conventions).

**Total change surface:** ~20–30 lines of CSS additions, ~15 lines of TypeScript changes.

---

## Open Questions

1. **Secondary hint wording** — Claude's discretion. Suggested options: "Shot data is captured automatically when you view a report" or "Navigate to a Trackman report — shots are captured automatically". The second is more action-oriented.

2. **Initial Clear button state in HTML** — Should `<button id="clear-btn">` have `style="display:none"` in the static HTML to prevent a flash before DOMContentLoaded? Given the async storage read is fast and `Loading...` provides visual continuity, this is low risk either way. Adding `style="display:none"` is safer and consistent with `export-row` and `ai-section` which already have `style="display:none"` in the HTML.

3. **Pre-existing CSS mismatch** — `.shot-count-container` CSS rule does not apply to `#shot-count-container` HTML element (class vs ID mismatch). This is a pre-existing bug outside Phase 10 scope. New CSS should use the ID selector `#shot-count-container` to correctly target the element. Do not fix the pre-existing mismatch or it becomes a scope creep concern.

---

## Sources

### Primary (HIGH confidence)

- Direct source inspection: `src/popup/popup.ts` (full file, 2026-03-03) — verified all three `updateShotCount` call sites, `updateExportButtonVisibility` implementation, `handleClearClick` flow
- Direct source inspection: `src/popup/popup.html` (full file, 2026-03-03) — verified HTML structure, ID/class mismatch in `#shot-count-container`, existing CSS token system, initial `display:none` patterns on `#export-row` and `#ai-section`
- Phase 9 RESEARCH.md + completed PLANs — verified CSS token set, classList pattern, and inline style replacement precedent
- `.planning/phases/10-empty-state-guidance/10-CONTEXT.md` — user decisions (2026-03-03)
- REQUIREMENTS.md — UI-02 requirement definition

### Secondary (MEDIUM confidence)
- None required — implementation is entirely based on direct source inspection

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — pure DOM/CSS, no new dependencies, patterns verified in project source
- Architecture: HIGH — derived from direct source inspection with all call sites traced
- Pitfalls: HIGH — CSS mismatch confirmed by direct inspection; flicker pattern is well-understood
- CSS class naming: MEDIUM — names suggested (`empty-state`, `empty-guidance`, etc.) follow project convention but are Claude's discretion per CONTEXT.md

**Research date:** 2026-03-03
**Valid until:** 2026-06-03 (stable DOM/CSS APIs; valid until popup.ts or popup.html changes significantly)
