# Stack Research

**Domain:** Chrome Extension v1.5 — Polish & Quick Wins (Gemini support, prompt preview, empty state, export toggle, keyboard shortcut, dark mode)
**Researched:** 2026-03-02
**Confidence:** HIGH for Chrome API patterns (verified against official docs); HIGH for dark mode CSS (CSS spec + Chrome confirmed); HIGH for tabs.create permissions (confirmed no host_permissions needed)

---

## Context: What This File Covers

TrackPull has a validated, zero-production-dependency stack (TypeScript + esbuild + Chrome MV3 APIs). The prior STACK.md (v1.3) documents the clipboard, AI launch, and options page additions — those decisions stand and are not re-researched here.

This document covers ONLY what is new for v1.5:

1. Gemini AI launch — URL to use and whether host_permissions are needed
2. Keyboard shortcut — Chrome Commands API, manifest syntax, key constraints
3. Dark mode — CSS approach, Chrome popup behavior with prefers-color-scheme
4. Prompt preview — Modal/overlay implementation approach in popup
5. Empty state guidance — Conditional UI pattern
6. Export format toggle — Checkbox + storage key

Do not alter anything about interceptor, CSV generation, unit conversion, AI tab launch mechanism, or the build system.

---

## Recommended Stack

### Core Technologies (New for v1.5)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `commands` manifest key | MV3 | Keyboard shortcut to open popup | Standard MV3 mechanism. `_execute_action` reserved command opens popup without needing any `onCommand` listener in code. No new permission required. |
| `@media (prefers-color-scheme: dark)` | CSS Level 5 | Dark mode matching system theme | Chrome correctly propagates the OS `prefers-color-scheme` value to extension popup and options pages. Plain CSS media query — no JavaScript, no new API. |
| `chrome.storage.local` (new key) | Built-in Chrome API | Persist export toggle preference (include/exclude averages+consistency rows) | Already in use. One new boolean key. No schema migration needed. |
| HTML `<dialog>` element or manual overlay div | Web standard / vanilla DOM | Prompt preview modal in popup | `<dialog>` is supported in all Chrome versions compatible with MV3. No library needed. Alternatively a plain `<div>` with `position:fixed` works identically at popup scale. |

---

## Feature-by-Feature Technical Breakdown

### 1. Gemini AI Launch

**Current situation:** Gemini is already in `AI_URLS` in popup.ts (`"https://gemini.google.com"`) and appears in the AI service dropdown. The PROJECT.md notes Gemini was deliberately deferred because adding `host_permissions` for `gemini.google.com` would trigger a permission prompt for all users. The v1.5 goal is to ship this as an isolated release so the permission prompt is its own event.

**Verified finding:** `chrome.tabs.create({ url: "https://gemini.google.com" })` does NOT require `host_permissions` for `gemini.google.com`.

Per the official Chrome Tabs API reference: "Most features don't require any permissions to use. For example: creating a new tab, reloading a tab, navigating to another URL, etc."

`host_permissions` is required when an extension needs to read sensitive tab properties (`url`, `title`, `favIconUrl`), inject content scripts, capture screenshots, or intercept network requests on a domain. Opening a tab does not fall into any of these categories.

**Conclusion:** No `host_permissions` addition for `gemini.google.com` is needed. Gemini is already wired into popup.ts. The "isolated release" concern from v1.3 decision log was a precaution, but the permission system does not require it. Gemini can ship in v1.5 without touching manifest.json host_permissions.

**Only action required:** Verify the Gemini URL is correct (confirm `"https://gemini.google.com"` vs `"https://gemini.google.com/app"`) and that it lands on the chat page. The existing clipboard + tab approach works identically.

**Confidence:** HIGH — verified against official Chrome Tabs API docs.

---

### 2. Keyboard Shortcut (Cmd+Shift+T / Ctrl+Shift+T)

**Manifest addition required:**

```json
"commands": {
  "_execute_action": {
    "suggested_key": {
      "default": "Ctrl+Shift+T",
      "mac": "Command+Shift+T"
    },
    "description": "Open TrackPull popup"
  }
}
```

**Key rules (verified):**

- Must include `Ctrl` or `Alt` as modifier. `Shift` is optional.
- On macOS, `Ctrl` in `default` automatically becomes `Command`. Use the explicit `mac` key with `Command+Shift+T` for clarity.
- `Ctrl+Alt` combinations are prohibited (conflicts with AltGr on Windows/Linux).
- OS-level and Chrome-level shortcuts take priority and cannot be overridden. If `Ctrl+Shift+T` is in use by Chrome (it is: "Reopen closed tab"), Chrome's hotkey wins and the extension shortcut is silently ignored.

**Critical conflict: Ctrl+Shift+T is Chrome's "Reopen closed tab"** — this is a well-known Chrome built-in shortcut. Declaring it as `suggested_key` will have no effect; Chrome's native binding takes priority.

**Better alternatives to recommend in roadmap:**

| Platform | Suggestion | Conflict risk |
|----------|------------|---------------|
| Default | `Ctrl+Shift+Y` | Low |
| Mac | `Command+Shift+Y` | Low |
| Alt+T | `Alt+T` | Low (Alt shortcuts rarely conflict) |

The shortcut is user-remappable via `chrome://extensions/shortcuts` regardless of what is suggested.

**Code changes required:** None. `_execute_action` opens the popup automatically — no TypeScript listener is needed. The `commands` block in manifest.json is the only change.

**Permissions required:** None. The `commands` API does not require a permission declaration.

**Confidence:** HIGH — verified against official Chrome Commands API reference.

---

### 3. Dark Mode (CSS prefers-color-scheme)

**Approach: Pure CSS media query. No JavaScript, no toggle, no new storage key.**

Chrome follows the operating system's `prefers-color-scheme` setting and correctly propagates it to extension popup and options pages. This is confirmed behavior — extension popups are rendered as standard web content and inherit the system preference.

**Implementation pattern:**

```css
/* Base: light mode (existing styles stay unchanged) */
body {
  background-color: #ffffff;
  color: #333333;
}

/* Dark mode override — add at bottom of existing <style> block */
@media (prefers-color-scheme: dark) {
  body {
    background-color: #1a1a1a;
    color: #e0e0e0;
  }

  .shot-count-container {
    background-color: #2a2a2a;
  }

  .unit-selectors select,
  .ai-group select {
    background: #2a2a2a;
    color: #e0e0e0;
    border-color: #4a90d9;
  }

  .btn-primary {
    background-color: #1565c0;
  }

  .btn-outline {
    color: #90caf9;
    border-color: #90caf9;
  }

  .ai-section {
    border-top-color: #444;
  }

  .icon-btn:hover {
    background-color: #2a2a2a;
  }
}
```

**Files to update:** `popup.html` and `options.html` — both have inline `<style>` blocks. Add a `@media (prefers-color-scheme: dark)` block at the bottom of each.

**Color palette for dark mode:**

| Role | Light | Dark |
|------|-------|------|
| Page background | `#ffffff` | `#1a1a1a` |
| Card/container background | `#f5f5f5` | `#2a2a2a` |
| Primary text | `#333333` | `#e0e0e0` |
| Secondary text | `#666666` | `#aaaaaa` |
| Accent (blue) | `#1976d2` | `#4a90d9` |
| Accent hover | `#1565c0` | `#3a7bc8` |
| Border | `#e0e0e0` | `#444444` |
| Input background | `#ffffff` | `#2a2a2a` |
| Success toast | `#388e3c` | `#388e3c` (unchanged) |
| Error toast | `#d32f2f` | `#d32f2f` (unchanged) |

**No manual toggle needed** for v1.5. "Match system theme" is the correct behavior and the simplest implementation. A user-controlled toggle would require a new storage key and JavaScript to apply a class to `<html>`, adding complexity for marginal gain — defer to v1.6+ if requested.

**Confidence:** HIGH — CSS Level 5 `prefers-color-scheme` is well-supported; Chrome extension popup behavior verified via w3c/webextensions issue #242 (Chrome confirmed to propagate OS preference consistently to popup and options pages).

---

### 4. Prompt Preview Modal

**Goal:** Show a read-only preview of the assembled prompt+data before clicking "Open in AI," so users can verify what will be sent.

**Approach: Inline `<div>` overlay (not `<dialog>`).**

Both `<dialog>` and a div-based modal work fine in the popup. A plain div is simpler for a small popup where the modal does not need to trap focus across the full browser context. Either is acceptable.

```html
<!-- In popup.html — add before </body> -->
<div id="preview-overlay" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:500; overflow:auto; padding:16px;">
  <div style="background:#fff; border-radius:8px; padding:16px; max-height:100%; overflow:auto;">
    <h3 style="margin:0 0 8px; font-size:14px;">Prompt Preview</h3>
    <pre id="preview-text" style="white-space:pre-wrap; font-size:12px; font-family:monospace; margin:0 0 12px;"></pre>
    <button id="preview-close-btn">Close</button>
  </div>
</div>
```

**Trigger:** Add a "Preview" button near the "Open in AI" button. Clicking Preview calls `assemblePrompt()` with current selections and renders the output into `#preview-text`, then shows the overlay.

**Dark mode consideration:** The preview overlay background color (`#fff`) also needs a dark mode variant. Add it to the `@media (prefers-color-scheme: dark)` block.

**No new Chrome APIs or permissions needed.**

**Confidence:** HIGH — standard DOM pattern, zero API surface.

---

### 5. Empty State Guidance

**Goal:** When shot count is 0, replace the "0 shots" dead end with actionable instructions (e.g., "Open a Trackman report to capture shots").

**Approach: Conditional DOM in `updateExportButtonVisibility()` — already the right function.**

The existing `updateExportButtonVisibility()` function in popup.ts controls what is shown based on whether `data` is present. Extend it to also swap a static "empty state" element in/out.

```html
<!-- In popup.html — add to shot-count-container -->
<div id="empty-state-msg" style="display:none; font-size:13px; color:#666; margin-top:8px;">
  Open a Trackman report tab and TrackPull will capture your shots automatically.
</div>
```

```typescript
// In popup.ts — extend updateExportButtonVisibility
const emptyMsg = document.getElementById("empty-state-msg");
if (emptyMsg) emptyMsg.style.display = hasValidData ? "none" : "block";
```

**No new Chrome APIs or storage keys needed.** Pure UI conditional.

**Confidence:** HIGH — trivial DOM logic, existing pattern in codebase.

---

### 6. Export Format Toggle (Include/Exclude Averages + Consistency Rows)

**Goal:** Let users choose whether the CSV export includes the Average and Consistency summary rows per club.

**Storage:** One new boolean key in `chrome.storage.local`.

```typescript
// Add to STORAGE_KEYS in constants.ts
INCLUDE_SUMMARY_ROWS: "includeSummaryRows"
```

Default value: `true` (existing behavior — averages + consistency included by default).

**UI:** A checkbox in the popup, near the Export CSV button.

```html
<!-- In popup.html — add above or below export-row div -->
<label style="font-size:12px; display:flex; align-items:center; gap:6px; margin-top:8px;">
  <input type="checkbox" id="include-summary-rows" checked />
  Include averages &amp; consistency rows in CSV
</label>
```

**Storage read/write pattern (same as other preferences):**

```typescript
// Load preference
const result = await chrome.storage.local.get([STORAGE_KEYS.INCLUDE_SUMMARY_ROWS]);
const includeSummaryRows = result[STORAGE_KEYS.INCLUDE_SUMMARY_ROWS] !== false; // true by default

// Persist on change
checkbox.addEventListener("change", () => {
  chrome.storage.local.set({ [STORAGE_KEYS.INCLUDE_SUMMARY_ROWS]: checkbox.checked });
});

// Pass to writeCsv
writeCsv(cachedData, includeSummaryRows, undefined, cachedUnitChoice, cachedSurface);
```

**`writeCsv` already accepts `includeAverages` as its second parameter** — this maps directly. No changes to csv_writer.ts are needed beyond verifying the parameter controls both averages and consistency rows (confirmed: lines 134-161 of csv_writer.ts show both are gated on `includeAverages`).

**No new Chrome APIs or permissions needed.**

**Confidence:** HIGH — existing API, existing function signature already supports this.

---

## Supporting Libraries (Still Zero Production Dependencies)

No new production dependencies are required for any v1.5 feature:

- Keyboard shortcut — manifest.json change only
- Dark mode — CSS `@media` query only
- Prompt preview — vanilla DOM div/overlay
- Empty state — conditional `display` toggle
- Export toggle — `chrome.storage.local` + checkbox
- Gemini launch — already implemented, no manifest change needed

The zero-production-dependency constraint is maintained across all six features.

---

## Manifest Changes Summary

The full manifest.json changes for v1.5:

```json
{
  "commands": {
    "_execute_action": {
      "suggested_key": {
        "default": "Ctrl+Shift+Y",
        "mac": "Command+Shift+Y"
      },
      "description": "Open TrackPull"
    }
  }
}
```

**One addition only:** The `commands` block.

**No changes to:**
- `permissions` — no new permissions needed
- `host_permissions` — Gemini does not require it for `chrome.tabs.create`
- `content_scripts` — no new content scripts
- `background` — service worker unchanged
- `action` — popup unchanged
- `options_ui` — options page unchanged

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Dark mode | `@media (prefers-color-scheme: dark)` CSS | Manual toggle with `data-theme` attribute + JS | Manual toggle requires a new storage key, event listener, and class-swapping on load. "Match system" is the stated requirement and the simpler path. Toggle can be added in v1.6 if users request it. |
| Dark mode | CSS in `<style>` block | External `.css` file | CSS is already inline in both HTML files. Splitting to external files requires build script changes. No benefit at this size. |
| Prompt preview | Plain div overlay | `<dialog>` element | `<dialog>` provides focus trapping and `Escape` key handling, which are not needed for a read-only preview in a small popup. Plain div is 5 fewer lines. |
| Export toggle | Checkbox + storage | Radio buttons (Shots Only / Full / Custom) | A binary checkbox is sufficient for the stated requirement. Radio buttons add UI complexity. Can evolve later. |
| Keyboard shortcut | `_execute_action` in manifest | `onCommand` listener + `chrome.action.openPopup()` | `chrome.action.openPopup()` is only callable from user-gesture context, and `_execute_action` already does what's needed without any code. |
| Suggested shortcut | `Ctrl+Shift+Y` | `Ctrl+Shift+T` | `Ctrl+Shift+T` is Chrome's built-in "Reopen closed tab" shortcut. Chrome's native binding wins; the extension suggested key would be silently ignored on most Chrome versions. |

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `host_permissions` for `gemini.google.com` | `chrome.tabs.create` does not require host_permissions for the destination URL. Adding it displays a permission prompt users will not understand and widens the extension's permission surface unnecessarily. | No change — existing `chrome.tabs.create` pattern works |
| `tabs` permission | Not needed for `chrome.tabs.create`. Adding it displays "Read your browsing history" warning to users. | Omit |
| Dark mode JS library (e.g., `color-mode`, `darkreader`) | Zero-dependency constraint. CSS media query handles system-level dark mode in 5 lines. | CSS `@media (prefers-color-scheme: dark)` |
| `Ctrl+Shift+T` as keyboard shortcut | Chrome's native shortcut (Reopen closed tab) takes priority. Extension shortcut is silently ignored. | Use `Ctrl+Shift+Y` or another non-conflicting combo |
| User-configurable keyboard shortcut picker | `chrome://extensions/shortcuts` already provides this for all extensions. Chrome handles it natively. | Point users to `chrome://extensions/shortcuts` if they want to change it |
| Any new import/module | All six features are small enough to implement inline in existing files (popup.ts, popup.html, options.html, manifest.json, constants.ts). No new files needed beyond possibly a modal utility if preview grows complex. | Extend existing files |

---

## Version Compatibility

| API/Feature | Availability | Notes |
|-------------|-------------|-------|
| `commands` with `_execute_action` | MV3 (Chrome 88+) | Replaces `_execute_browser_action` from MV2. Works in all current Chrome versions. |
| `@media (prefers-color-scheme: dark)` | Chrome 76+ | Well within MV3 support window. OS preference propagated correctly to extension popups in Chrome. |
| `chrome.storage.local` (new key) | All MV3 versions | Existing API — just a new key name. |
| `<dialog>` element | Chrome 37+ | If preferred over div overlay — no compatibility concern. |
| `writeCsv(session, includeAverages)` | v1.0+ | Second parameter already exists in codebase — no signature change needed. |

---

## Sources

- Chrome Tabs API Reference (`chrome.tabs.create` permissions) — https://developer.chrome.com/docs/extensions/reference/api/tabs#method-create (HIGH confidence, official; confirmed tabs.create needs no permissions for URL-only tab creation)
- Chrome Commands API Reference — https://developer.chrome.com/docs/extensions/reference/api/commands (HIGH confidence, official; confirmed `_execute_action` syntax, key requirements, modifier rules)
- Chrome Extensions Samples issue #619 — https://github.com/GoogleChrome/chrome-extensions-samples/issues/619 (MEDIUM confidence; community confirmation of `_execute_action` for popup opening)
- w3c/webextensions issue #242 — https://github.com/w3c/webextensions/issues/242 (HIGH confidence; confirms Chrome propagates OS `prefers-color-scheme` consistently to popup and options pages)
- MDN prefers-color-scheme — https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-color-scheme (HIGH confidence, official spec reference)
- Chrome Declare Permissions reference — https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions (HIGH confidence, official; confirms which APIs require host_permissions and which do not)
- PROJECT.md decision log — Gemini deferral rationale (HIGH confidence; confirmed the decision was about isolating the permission prompt, not a technical requirement for host_permissions)
- csv_writer.ts source inspection — lines 134-161 (HIGH confidence; confirmed `includeAverages` param gates both Average and Consistency rows)

---

*Stack research for: TrackPull v1.5 — Polish & Quick Wins*
*Researched: 2026-03-02*
