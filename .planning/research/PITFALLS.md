# Pitfalls Research

**Domain:** Chrome Extension (MV3) — Clipboard Export, AI Prompt Tab Launch, and v1.5 Polish Features
**Researched:** 2026-03-02
**Confidence:** HIGH for MV3 clipboard mechanics (official docs + Chromium issue tracker verified); HIGH for AI URL pre-fill status (multiple community sources, cross-verified); HIGH for keyboard shortcut restrictions (official API docs verified); HIGH for popup size constraints (multiple community sources consistent); MEDIUM for dark mode CSS cascade (official docs + community); MEDIUM for permission re-prompt behavior (official docs, behavior documented but edge-case dependent); LOW for AI service URL stability (undocumented, subject to change without notice)

---

## v1.5 Polish & Quick Wins — Feature-Specific Pitfalls

These pitfalls are specific to the six features in the v1.5 milestone. They cover integration risks when adding Gemini support, prompt preview, empty state guidance, export format toggle, keyboard shortcut, and dark mode to the existing popup/options architecture.

---

### Pitfall V1: Keyboard Shortcut Cmd+Shift+T Conflicts With Chrome's "Reopen Closed Tab"

**What goes wrong:**
The planned shortcut `Cmd+Shift+T` (specified in manifest as `Ctrl+Shift+T`, which Chrome auto-converts to `Cmd+Shift+T` on macOS) is Chrome's built-in "Reopen closed tab" shortcut on both macOS and Windows. Chrome's browser shortcuts take priority over extension command shortcuts. The manifest compiles without error, the shortcut appears in `chrome://extensions/shortcuts`, but pressing it reopens a tab instead of opening the TrackPull popup. The extension command is never triggered.

**Why it happens:**
Chrome's documentation states: "Certain operating system and Chrome shortcuts (e.g. window management) always take priority over Extension command shortcuts and cannot be overridden." The `Ctrl+Shift+T` / `Cmd+Shift+T` shortcut is a Chrome-level navigation shortcut, not configurable. Extension manifests that specify it will be silently overridden at runtime. There is no error or warning at install or manifest parse time.

**How to avoid:**
Do not use `Ctrl+Shift+T` as the extension shortcut. Alternatives that are less likely to conflict:
- `Ctrl+Shift+G` — "G for Golf" mnemonic, not reserved by Chrome or macOS on Mac
- `Ctrl+Shift+P` — common convention for "Pull" but conflicts with Chrome's print preview on Windows; test before committing
- Let the user assign their own shortcut — ship with a suggested shortcut only, document it as user-configurable via `chrome://extensions/shortcuts`

The `_execute_action` command in the manifest is the correct mechanism for "open popup":
```json
"commands": {
  "_execute_action": {
    "suggested_key": {
      "default": "Ctrl+Shift+G",
      "mac": "Command+Shift+G"
    },
    "description": "Open TrackPull popup"
  }
}
```
Note: `_execute_action` does not fire `chrome.commands.onCommand` — it directly triggers the action popup. No additional listener needed.

**Warning signs:**
- Pressing the shortcut reopens a previously closed browser tab instead of the extension popup.
- The shortcut works in `chrome://extensions/shortcuts` after manual reassignment by the user, but not after install.
- Manifest specifies `"Ctrl+Shift+T"` without explicit platform override.

**Phase to address:**
Keyboard shortcut implementation phase. Verify the chosen shortcut is not Chrome-reserved before writing any code. Test on both macOS and Windows.

---

### Pitfall V2: Gemini host_permissions Addition Disables Extension for All Existing Users

**What goes wrong:**
Adding `"https://gemini.google.com/*"` to `host_permissions` in `manifest.json` triggers Chrome's permission escalation check on the next auto-update. Chrome compares the new permission warnings against the permission set the user already approved. Adding a new host that was not previously covered generates a new "Read and change your data on gemini.google.com" warning. Chrome disables the extension and notifies the user with a re-approval prompt. Users who miss or dismiss the prompt have a broken extension.

**Why it happens:**
The existing `manifest.json` has `"host_permissions": ["https://web-dynamic-reports.trackmangolf.com/*"]`. Adding any new host creates a net-new warning message category. Chrome's permission change detection is binary: if the new permission set generates different warning text than the previously-approved set, the extension is disabled until the user re-approves. There is no way to add host_permissions without triggering this for all current users.

This was anticipated in the project's key decisions: "Gemini deferred to v1.4+ — host_permissions addition triggers permission prompt for all users; isolate to own release." Isolating this to v1.5 (dedicated release) is the correct call. The risk is the timing and communication around the prompt.

**How to avoid:**
- Ship Gemini host_permissions as a standalone release (v1.5.0 with only this change and the Gemini UI) rather than bundled with all five other v1.5 features. This narrows the blast radius: if users are confused by the re-prompt, they know exactly what caused it.
- The UI in the popup already lists Gemini as an option in the `ai-service-select` dropdown (visible in popup.html), so the UX is already partially prepared. The manifest change is the only gating factor.
- Do not add `"https://generativelanguage.googleapis.com/*"` — this extension opens the Gemini web UI (gemini.google.com), not the Gemini API. The API host is irrelevant and would add a second alarming-looking permission.
- Communicate the permission re-prompt in release notes. Users who see "extension disabled" without context will uninstall rather than re-approve.

**Warning signs:**
- Testing the update in an unpacked extension shows no re-prompt (it won't — Chrome only triggers this on Chrome Web Store auto-updates, not sideloaded extension reloads).
- Manifest diff shows `host_permissions` gaining a new entry without a dedicated release note.
- Developer adds both `"https://gemini.google.com/*"` and the Gemini API host in the same release.

**Phase to address:**
Gemini support implementation phase. This should be the first feature shipped in v1.5, in an isolated release before the other five features land, exactly as planned.

---

### Pitfall V3: Dark Mode CSS Breaks Existing Hardcoded Colors

**What goes wrong:**
Adding `@media (prefers-color-scheme: dark)` overrides to popup.html and options.html misses elements that use hardcoded hex colors set via inline CSS or JavaScript (e.g., `element.style.color = '#d32f2f'`). The result is a partially-dark UI: the background switches to dark but buttons, toasts, status messages, and some text remain in light-mode colors. Specifically in the existing codebase:
- `showStatusMessage()` in popup.ts sets `statusElement.style.color = isError ? "#d32f2f" : "#388e3c"` as an inline style
- Toast background colors are hardcoded in `showToast()` as `background-color: #d32f2f` and `#388e3c` via className
- The `shot-count` element has `color: #1976d2` hardcoded in CSS

Inline styles set via JavaScript have higher specificity than `@media` CSS rules and cannot be overridden by a stylesheet dark mode rule without `!important`, which itself creates a specificity war.

**Why it happens:**
The popup and options pages were built with a light-only design and no CSS custom properties (CSS variables). All colors are literal hex values in the stylesheet and in JavaScript string assignments. Adding dark mode as a pure CSS overlay works for elements that exist in the HTML and whose styles come from the stylesheet, but JavaScript-injected inline styles bypass the CSS cascade entirely.

**How to avoid:**
Before adding dark mode media queries, audit every color assignment in both TypeScript files. The correct approach:

1. Replace all hardcoded color strings in JavaScript with CSS class additions/removals:
```typescript
// Before (bad for dark mode):
statusElement.style.color = isError ? "#d32f2f" : "#388e3c";

// After (dark mode compatible):
statusElement.className = isError ? "status-error" : "status-success";
```

2. Define a CSS color palette as custom properties on `:root` and apply dark mode by overriding them:
```css
:root {
  --color-error: #d32f2f;
  --color-success: #388e3c;
  --color-primary: #1976d2;
  --bg-primary: #ffffff;
  --text-primary: #333333;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-error: #ef9a9a;
    --color-success: #a5d6a7;
    --color-primary: #64b5f6;
    --bg-primary: #1e1e1e;
    --text-primary: #e0e0e0;
  }
}
```

3. Replace all literal hex colors in the stylesheet with `var(--color-*)` references.

Do this refactor first, then add the media query. Without it, dark mode will be broken for toast messages and status indicators — the highest-visibility UI elements.

**Warning signs:**
- Dark mode screenshots show dark background but red/green error/success text still in full-brightness light-mode colors.
- Toast elements appear correct but status message text does not update.
- Any occurrence of `element.style.color = "..."` or `element.style.backgroundColor = "..."` in popup.ts or options.ts.
- Stylesheet contains `color: #d32f2f` rather than `color: var(--color-error)`.

**Phase to address:**
Dark mode implementation phase. Perform the CSS variable refactor as step 1 before writing any `@media (prefers-color-scheme: dark)` rule.

---

### Pitfall V4: Prompt Preview Modal Exceeds Popup Height Constraint

**What goes wrong:**
A prompt preview modal displayed inside the existing popup (which is already ~400-500px tall given the current controls) pushes the popup beyond Chrome's 600px hard height cap. The modal renders but the popup clips the bottom portion. If the popup uses `overflow: hidden` on body (the current implicit behavior), the modal close button or bottom content is unreachable. If `overflow: auto` is added, a scrollbar appears that looks broken at the narrow 320px popup width.

**Why it happens:**
The current popup already contains: header row, shot count container, unit selectors (3 dropdowns), export row (2 buttons), AI section (2 dropdowns + 2 buttons), and clear button. That's approximately 400-450px of content. A prompt preview modal that shows the full assembled prompt+data string (which can be 50-80 KB rendered in a textarea) cannot fit inside the remaining 150-200px of headroom before the 600px ceiling.

**How to avoid:**
Do not implement the prompt preview as a modal overlay inside the popup. Two viable approaches:

**Option A: Truncated inline preview** — Show the first 300 characters of the assembled prompt as a collapsible `<details>` element directly in the popup UI. No modal, no height expansion. Toggle open/close. This fits in the available space and avoids the height problem entirely.

```html
<details id="prompt-preview">
  <summary>Preview prompt</summary>
  <pre id="prompt-preview-text" class="prompt-preview-text"></pre>
</details>
```

**Option B: Options page preview** — Open the options page to a "preview" state when the user clicks "Preview" in the popup. The options page is a full tab and has no size constraints. This is more friction but allows rendering the full assembled prompt with data.

Do not use a `position: fixed` overlay inside the popup — popups do not scroll and the overlay will clip.

**Warning signs:**
- The popup body requires scrolling after adding the preview UI.
- A `position: fixed; inset: 0` modal inside the popup clips at 600px.
- `min-width: 320px` on body means any modal narrower than 320px won't fit the full text without horizontal scroll.

**Phase to address:**
Prompt preview implementation phase. Mock the UI in a static HTML file before wiring to TypeScript; measure the rendered height with a full prompt payload.

---

### Pitfall V5: Export Format Toggle Storage Key Missing for Existing Users Returns Undefined, Treated as Falsy Toggle State

**What goes wrong:**
A new boolean storage key (e.g., `includeAverages`) is added to `chrome.storage.local` to control whether the export includes averages and consistency rows. For existing users, this key does not exist in storage. `chrome.storage.local.get(["includeAverages"])` returns `{}` — the key is absent, not `false`. Code that checks `if (result.includeAverages)` correctly defaults to "off" (falsy), but code that checks `if (result.includeAverages === false)` incorrectly treats undefined as "include averages" because `undefined !== false`. The default behavior (include or exclude) is inconsistent depending on which equality check is used.

**Why it happens:**
This is a general Chrome storage gotcha: unset keys return `undefined`, not a type-specific falsy default. The existing codebase already handles this correctly for unit preferences (see `migrateLegacyPref` pattern), but a new developer touching the toggle code may not recognize the pattern and write a strict equality check against `false`.

**How to avoid:**
Define the default value explicitly at the point of read, not at the point of check:
```typescript
// Correct pattern:
const result = await chrome.storage.local.get(["includeAverages"]);
const includeAverages: boolean = result["includeAverages"] ?? true; // default: include averages

// Wrong pattern (undefined !== false):
if (result["includeAverages"] === false) { /* exclude */ }
```
Add the new key to `STORAGE_KEYS` in constants.ts so it is tracked alongside all other storage keys. Write a unit test that verifies the default behavior when the key is absent.

The default should be `true` (include averages and consistency rows) to preserve backward-compatible behavior for existing users — they currently always get averages in their exports.

**Warning signs:**
- Toggle defaults to "exclude averages" for new users when the intent is to preserve existing behavior.
- Code uses `result.includeAverages === false` instead of `result.includeAverages ?? true`.
- The new storage key is not added to `STORAGE_KEYS` in constants.ts.

**Phase to address:**
Export format toggle implementation phase. Define the storage key and default in constants.ts first; write the read-with-default pattern before wiring to the UI.

---

### Pitfall V6: Empty State Detection Treats "Loading" State as "No Data" State

**What goes wrong:**
The popup's `updateShotCount()` function currently sets `shotCountElement.textContent = "0"` for both "no data in storage" and "data exists but has no shots." Adding empty state guidance (e.g., "Visit a Trackman report to capture data") triggered from the "0 shots" state incorrectly shows guidance during the brief moment when the popup opens and storage has not yet responded (the async `chrome.storage.local.get` has not resolved). The user sees the "Visit Trackman" message flash before their actual shot count appears.

Additionally, the guidance message is wrong for a different failure mode: when the user is on the Trackman page but the extension has not yet intercepted an API response (e.g., the page hasn't fully loaded or the correct metric view hasn't been visited). "0 shots" can mean three distinct states: (1) user has never visited Trackman, (2) user is on Trackman but hasn't triggered data capture, (3) data was cleared. The current empty state guidance can only realistically address state 1 and 3 — state 2 requires different copy.

**Why it happens:**
The popup currently initializes `shot-count` to `"Loading..."` and then immediately starts the async storage read. The "0" display state does not distinguish between "storage returned null" (never captured) and "storage is still loading" (race condition). Empty state guidance hooked to the "0" count will fire during the loading window on every popup open.

**How to avoid:**
Introduce a third display state distinct from "Loading" and "0":
```typescript
// Three distinct states:
// 1. Loading: shotCountElement.textContent = "Loading..."
// 2. No data: shotCountElement.textContent = "0" + show guidance
// 3. Has data: shotCountElement.textContent = count.toString()

// Only show guidance AFTER storage read resolves AND result is null/empty:
const result = await chrome.storage.local.get([STORAGE_KEYS.TRACKMAN_DATA]);
const data = result[STORAGE_KEYS.TRACKMAN_DATA];
if (!data) {
  showEmptyState(); // now safe — loading is complete, confirmed no data
} else {
  updateShotCount(data);
}
```

For empty state copy, write two distinct messages:
- Primary (storage is empty): "Open a Trackman report in your browser to capture shot data."
- Secondary (optional, shown after a delay if on Trackman domain): "Data not captured yet — browse to the results table to load shots."

**Warning signs:**
- Empty state guidance flashes briefly on popup open then disappears when data loads.
- "Visit Trackman" message appears for a user who has 50 shots captured.
- `showEmptyState()` is called before the `chrome.storage.local.get` Promise resolves.

**Phase to address:**
Empty state implementation phase. Add the three-state model before hooking up the guidance UI; the loading state must be a distinct condition from no-data.

---

### Pitfall V7: Dark Mode Does Not Apply to Dynamically Created DOM Elements (Toasts)

**What goes wrong:**
Dark mode CSS rules defined with `@media (prefers-color-scheme: dark)` in the stylesheet apply to elements in the HTML at parse time. Toast elements in TrackPull are created dynamically via `document.createElement("div")` and appended to the DOM at runtime. If the toast's colors are set via the class names `.toast.success` and `.toast.error` in the stylesheet, the media query will apply correctly. However, both popup.html and options.html define toast colors using `background-color: #388e3c` and `background-color: #d32f2f` as direct class rules with no CSS variable references. These survive dark mode unchanged — toasts remain brightly colored in dark mode.

**Why it happens:**
Same root cause as Pitfall V3: literal hex colors in class definitions bypass the dark mode system unless they use `var()` references. Dynamically created elements receive their styles from the class rules, which are literal colors, so `@media (prefers-color-scheme: dark)` overrides must specifically target `.toast.success` and `.toast.error` inside the media query.

**How to avoid:**
Include toast classes explicitly in the dark mode media query, or (better) switch toast classes to use CSS custom properties (addressed as part of the Pitfall V3 refactor). The toast colors need to remain high-contrast in both modes — success should be a dark-accessible green, error a dark-accessible red:

```css
@media (prefers-color-scheme: dark) {
  .toast.success { background-color: #2e7d32; } /* slightly darker green */
  .toast.error { background-color: #c62828; } /* slightly darker red */
}
```

This is safe without full CSS variable refactor as a targeted fix, but the CSS variable approach from Pitfall V3 is the cleaner long-term solution.

**Warning signs:**
- Dark mode screenshot shows dark background but bright green/red toasts.
- CSS audit shows `.toast.success` with no `@media (prefers-color-scheme: dark)` override.
- Dark mode implemented by adding `:root` dark variables without reviewing all class rules.

**Phase to address:**
Dark mode implementation phase, same as Pitfall V3. Audit all color-bearing CSS classes in popup.html and options.html, not just body-level colors.

---

### Pitfall V8: Keyboard Shortcut _execute_action Requires No Listener — Adding One Creates a Race

**What goes wrong:**
A developer adds a `chrome.commands.onCommand` listener in the service worker to handle the keyboard shortcut, expecting it to be called when the user presses the shortcut and the popup opens. The `_execute_action` command does not fire `chrome.commands.onCommand`. The listener is never called. In a worse variant, the developer adds logic to the listener expecting to pre-fetch data or update state before the popup opens — this pre-fetch never runs, and the popup loads with stale or missing data, confusing the developer who then spends time debugging the non-firing event.

**Why it happens:**
The Chrome Extensions API documentation clearly states that `_execute_action` is a reserved command that directly triggers the action (popup) without dispatching a command event. Developers who have used standard commands before expect all command names to fire `onCommand`. The `_execute_action` name looks like it should fire an event.

**How to avoid:**
Do not add `chrome.commands.onCommand` listener for `_execute_action`. The popup already handles its own initialization in `DOMContentLoaded`. If data pre-fetch is needed before the popup renders, do it inside the popup's `DOMContentLoaded` handler — that is already the correct pattern in popup.ts.

The manifest entry for `_execute_action` only needs the `"suggested_key"` and `"description"` fields. No listener code is needed anywhere:
```json
"commands": {
  "_execute_action": {
    "suggested_key": { "default": "Ctrl+Shift+G" },
    "description": "Open TrackPull"
  }
}
```

**Warning signs:**
- Service worker contains `chrome.commands.onCommand.addListener(...)` referencing `_execute_action`.
- Developer reports "the shortcut opens the popup but my listener code doesn't run."
- Logic that should run before popup render is placed in a command handler instead of `popup.ts`.

**Phase to address:**
Keyboard shortcut implementation phase. The implementation is purely declarative (manifest entry only). No TypeScript changes are needed in popup.ts or serviceWorker.ts.

---

### Pitfall V9: Export Format Toggle Changes CSV Output But Breaks Backward-Compatible Filenames and Existing Tests

**What goes wrong:**
The `writeCsv()` function in csv_writer.ts currently always includes averages and consistency rows. Adding a `includeAverages` parameter changes the function signature. Callers in serviceWorker.ts pass the CSV writer call through a message handler — if the new parameter is not threaded through the `EXPORT_CSV_REQUEST` message, the toggle has no effect in production even though it works in unit tests (which call `writeCsv` directly). Additionally, existing unit tests that assert exact CSV output (including average/consistency rows) will fail if the default parameter is set to `false`.

**Why it happens:**
The export flow is: popup click → message to service worker → service worker reads storage + calls writeCsv → downloads the file. The toggle state lives in popup-land (storage key). The CSV generation lives in service worker-land. The parameter must travel across the message boundary, either via storage read in the service worker or via inclusion in the message payload. If the developer adds the parameter to `writeCsv` but forgets to thread it through the message → service worker path, the feature appears to work in tests but does nothing in the actual extension.

**How to avoid:**
The toggle state must be stored in `chrome.storage.local` (not just in-memory popup state) so the service worker can read it independently during export. The service worker already reads unit preference and surface preference from storage — add the toggle key to the same `chrome.storage.local.get()` call in the `EXPORT_CSV_REQUEST` handler:

```typescript
// In serviceWorker.ts EXPORT_CSV_REQUEST handler:
chrome.storage.local.get([
  STORAGE_KEYS.TRACKMAN_DATA,
  STORAGE_KEYS.SPEED_UNIT,
  STORAGE_KEYS.DISTANCE_UNIT,
  STORAGE_KEYS.HITTING_SURFACE,
  STORAGE_KEYS.INCLUDE_AVERAGES, // new key
  "unitPreference"
], (result) => {
  const includeAverages: boolean = result[STORAGE_KEYS.INCLUDE_AVERAGES] ?? true;
  const csvContent = writeCsv(data, includeAverages, undefined, unitChoice, surface);
```

Update unit tests to pass `true` explicitly for the `includeAverages` parameter to keep existing test assertions valid.

**Warning signs:**
- Toggle works when testing `writeCsv` directly in unit tests but has no effect when exporting from the popup.
- Service worker's `EXPORT_CSV_REQUEST` handler does not read `STORAGE_KEYS.INCLUDE_AVERAGES`.
- Unit tests fail after adding the new parameter with a new default.

**Phase to address:**
Export format toggle implementation phase. Thread the storage key through the entire message → service worker → writeCsv path on day one; verify with an end-to-end test (not just a unit test of writeCsv).

---

## Critical Pitfalls (Carry-Forward from v1.3/v1.4)

These pitfalls from earlier research remain relevant to v1.5 features.

---

### Pitfall 1: Clipboard Write Fails in Service Worker — Wrong Context Used

**What goes wrong:**
A developer routes the clipboard copy through the service worker (e.g., handling a `COPY_TO_CLIPBOARD` message in `serviceWorker.ts`). `navigator.clipboard` is unavailable in service worker context. The call either throws `TypeError: navigator.clipboard is undefined` or silently fails. The user clicks "Copy" and nothing happens.

**Why it happens:**
Service workers do not have a DOM context and therefore have no access to `navigator.clipboard`. The existing architecture for CSV export (popup → message → service worker → download) works for `chrome.downloads`, which is a Chrome API available to service workers. Developers naturally try to replicate this pattern for clipboard, but the clipboard API is a Web Platform API requiring a document context, not a Chrome API.

**How to avoid:**
Clipboard write belongs in the **popup context**, not the service worker. The popup is a document context — `navigator.clipboard.writeText()` works there directly when the user clicks a button. Call it directly in the popup's click handler. Do not route it through the service worker at all. Add `"clipboardWrite"` to `manifest.json` permissions to skip the transient activation requirement.

The correct flow is:
```
User clicks "Copy" button in popup
→ popup.ts handler calls navigator.clipboard.writeText(formattedData) directly
→ success/error toast shown to user
```

**Warning signs:**
- `TypeError: Cannot read properties of undefined (reading 'writeText')` in service worker console.
- User reports "Copy" button does nothing, no error shown.
- Developer adding a `COPY_TO_CLIPBOARD` message type to serviceWorker.ts.

**Phase to address:**
Clipboard copy implementation phase. Architect the copy handler to live in popup.ts from the start — do not prototype it in the service worker first.

---

### Pitfall 2: Clipboard Write Silently Fails When Popup Loses Focus Before Async Resolves

**What goes wrong:**
The popup fetches shot data from `chrome.storage.local` asynchronously, formats it as TSV, then calls `navigator.clipboard.writeText()`. If the popup loses focus between the storage read completing and `writeText()` executing, Chrome throws `DOMException: Document is not focused`. This manifests as a silent failure — the copy toast may show "success" while the clipboard actually has stale or no content.

**Why it happens:**
The `navigator.clipboard.writeText()` API requires the document to have focus at call time, even with the `clipboardWrite` permission. In a Chrome extension popup, focus is fragile: the popup closes (and thus loses focus) if the user clicks outside it. An async chain of `storage.get → format → clipboard.write` opens a window where focus can be lost between storage callback resolution and the clipboard write.

**How to avoid:**
Keep the async chain as tight as possible. Retrieve the data, format it, and call `navigator.clipboard.writeText()` all within the same microtask queue flush — avoid any `setTimeout` or unnecessary `await` between the data retrieval and the clipboard write. The storage read can be done proactively on popup load (not on button click) so that when the user clicks "Copy", the data is already in memory and the write fires synchronously within the click handler's event context.

Pattern to use:
```typescript
// On popup load: pre-fetch data into memory
let cachedTsvData: string | null = null;

// On load
const data = await chrome.storage.local.get([STORAGE_KEYS.TRACKMAN_DATA]);
cachedTsvData = formatAsTsv(data[STORAGE_KEYS.TRACKMAN_DATA]);

// On button click: fire immediately with cached data
copyBtn.addEventListener('click', () => {
  if (!cachedTsvData) return;
  navigator.clipboard.writeText(cachedTsvData)
    .then(() => showToast('Copied to clipboard', 'success'))
    .catch(() => showToast('Copy failed — try again', 'error'));
});
```

**Warning signs:**
- `DOMException: Document is not focused` appearing in the popup's DevTools console.
- Clipboard contains old data after clicking "Copy" on a new session.
- The copy operation is unreliable: works sometimes, not others.

**Phase to address:**
Clipboard copy implementation phase. Pre-fetch and cache data on popup open; do not initiate storage reads inside the click handler.

---

### Pitfall 3: AI URL Pre-Fill Is Not a Supported Feature — It Is a Fragile Hack

**What goes wrong:**
The developer designs the "AI tab launch" feature assuming that opening `https://chatgpt.com/?q=<prompt>` or `https://claude.ai/?q=<prompt>` will reliably pre-fill the prompt field. This was community-discovered URL behavior, not an official API. These URLs break silently when the AI provider updates their frontend.

**How to avoid:**
Design the feature around clipboard copy as the primary delivery mechanism, not URL pre-fill. Open the AI service homepage (bare URL), let the user paste.

**Warning signs:**
- AI tab opens but chat field is empty with no error.
- Users report that the AI launch "used to work" after a provider UI update.

**Phase to address:**
AI tab launch design phase. Clipboard-first is the only durable approach.

---

### Pitfall 4: Manifest Permissions Addition for "tabs" Disables Extension for Existing Users

**What goes wrong:**
Adding `"tabs"` to the `permissions` array in `manifest.json` to support tab opening triggers Chrome's privilege escalation check on extension update. The extension is disabled and existing users see a re-approval prompt.

**How to avoid:**
`chrome.tabs.create()` does **not** require the `"tabs"` permission — it works with no tabs permission. Do not add `"tabs"` to the manifest.

**Warning signs:**
- Developer adding `"tabs"` to manifest because they saw it referenced in documentation alongside `chrome.tabs.create`.
- A manifest diff before release showing new entries in the `permissions` array.

**Phase to address:**
Any phase touching manifest.json. Review the manifest diff as part of every pre-release checklist.

---

### Pitfall 5: Storage Quota Exceeded When Saving Many Custom Prompt Templates to chrome.storage.sync

**What goes wrong:**
Storing user-created prompt templates in `chrome.storage.sync` hits the 8 KB per-item and 100 KB total quota. Writes fail with `chrome.runtime.lastError: QUOTA_BYTES_PER_ITEM quota exceeded`, leaving the user's prompt template unsaved with no feedback.

**How to avoid:**
Use `chrome.storage.local` for prompt templates. `chrome.storage.local` has a 10 MB default quota. Only store small, singular configuration values in `chrome.storage.sync`.

**Phase to address:**
Prompt storage design phase.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| URL pre-fill as primary AI delivery mechanism | Feels like one-click magic | Breaks silently whenever AI providers update their frontend; no official API | Never as primary; always implement clipboard-first with URL pre-fill as enhancement |
| Hardcoded hex colors in JS (element.style.color = "#d32f2f") | Simple to write | Cannot be overridden by CSS dark mode media queries; requires code change to support theming | Acceptable for legacy code, not for new v1.5 UI |
| Adding `@media (prefers-color-scheme: dark)` without CSS variable refactor first | Can add dark mode quickly | Misses dynamically-set colors; results in partial dark mode that looks broken | Never — do the variable refactor first |
| Storing built-in prompts in chrome.storage.local on install | Single code path for all prompts | Built-in prompts get overwritten on update, losing user edits | Never — bundle built-ins in source, store only user-created prompts |
| Using chrome.storage.sync for prompt template bodies | Cross-device sync sounds appealing | 8 KB per-item quota; 100 KB total; silently fails on save | Never — use chrome.storage.local for templates |
| Routing clipboard write through service worker | Follows existing message-passing pattern | Service workers have no navigator.clipboard access; always fails | Never — clipboard must live in popup context |
| Implementing prompt preview as a full-height modal inside popup | Familiar UX pattern | Popup 600px height cap clips modal; scrollbar looks broken at 320px width | Never — use inline collapsible or options page redirect |
| Checking `result.key === false` instead of `result.key ?? default` for boolean storage keys | Slightly more explicit | undefined (absent key) does not equal false; breaks default behavior for existing users | Never for new boolean storage keys |

---

## Integration Gotchas

Common mistakes when connecting to external services or existing extension systems.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Gemini host_permissions | Adding to an existing release bundled with other features | Isolate to its own release so permission re-prompt is the only change users see |
| Keyboard shortcut _execute_action | Adding chrome.commands.onCommand listener for it | No listener needed; _execute_action opens the popup directly; hook initialization to DOMContentLoaded in popup.ts |
| Keyboard shortcut Ctrl+Shift+T | Using Ctrl+Shift+T (reopens closed tab in Chrome) | Choose a non-reserved combination like Ctrl+Shift+G; test on both macOS and Windows |
| Export toggle + service worker | Only wiring toggle to writeCsv, not threading through the message path | Store toggle in chrome.storage.local; read it in serviceWorker.ts EXPORT_CSV_REQUEST handler |
| Dark mode + existing popup styles | Adding @media rules before auditing inline JS color assignments | Refactor inline color assignments to CSS classes first; use CSS custom properties throughout |
| Empty state guidance | Showing guidance during "Loading" state | Only show guidance after chrome.storage.local.get resolves with null result |
| ChatGPT URL pre-fill | Using `?prompt=` parameter | Use `?q=` parameter; `?prompt=` has not been observed to work |
| Claude URL pre-fill | Using `claude.ai/new?q=` or any URL parameter | No URL pre-fill works on claude.ai as of 2025 — use clipboard delivery only |
| Gemini URL pre-fill | Assuming `?q=` or `?prompt=` works natively | No native support; do not implement; open gemini.google.com bare URL only |
| chrome.tabs.create | Adding `"tabs"` permission to manifest | Not needed for tab creation; only needed for reading tab metadata |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Formatting TSV on every popup render | Slow popup open for large sessions | Pre-format on popup load once; cache result in memory | Sessions with 300+ shots and 29 metrics (~50 KB output) |
| Rendering full prompt text in popup dropdown | Popup layout performance | Show only title/tier in dropdown; lazy-load full text when prompt is selected | 7+ built-in prompts with long text bodies |
| Prompt preview textarea with unbounded height inside popup | Popup overflows 600px hard cap | Cap preview height with max-height + overflow: auto on the textarea | Any preview that renders more than ~5 lines |
| Loading all storage keys in one get() call in popup | Acceptable now but grows with each new key | Keep get() calls grouped by concern; avoid single catch-all get() | More than 10-15 storage keys loaded at popup open |

---

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Injecting user-provided prompt text directly into URL without encoding | URL injection breaks the constructed URL | Always use `encodeURIComponent()` for any text placed in URL parameters |
| Storing the user's AI service preference in a globally readable storage key without namespace | Minimal risk but poor hygiene | Use namespaced keys like those in STORAGE_KEYS constants object |
| Including raw session data in a URL sent to an AI service | Golf shot data is not sensitive, but sets a bad pattern | Do not embed session data in URLs; clipboard-only delivery keeps data off the wire until the user explicitly pastes |
| Adding Gemini API host (generativelanguage.googleapis.com) to host_permissions | Creates an alarming second host permission; extension does not use the API | Only add gemini.google.com — the web UI host; never add the API host |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Empty state shows "Visit Trackman" while data is still loading | User reads guidance for a problem they don't have; trust is broken | Only show guidance after storage read completes with a confirmed null result |
| Dark mode toggle shows partially dark UI with bright error toasts | Extension looks broken; users perceive it as a bug | Audit all color-bearing elements including dynamically created DOM (toasts, status messages) |
| Prompt preview in popup requires scrolling through 50+ KB of text | Users can't see the whole prompt; popup is unusable | Truncate preview to 300-500 characters with a "see more" option in options page |
| Keyboard shortcut works on first try then stops working | User loses trust in the feature | Test shortcut survival across Chrome restart, extension update, and profile switches |
| Permission re-prompt for Gemini appears with no explanation | Users dismiss or uninstall rather than re-approve | Release notes must explain why the prompt appears; provide in-extension first-run message post-approval |
| Export toggle defaults to excluding averages | Existing users who rely on averages are surprised by changed output | Default must be `true` (include averages) to preserve existing behavior |
| No feedback after clicking "Copy" | User re-clicks repeatedly thinking it failed | Always show a brief "Copied!" toast for 2 seconds after a successful write |

---

## "Looks Done But Isn't" Checklist

- [ ] **Keyboard shortcut:** Verify the shortcut actually opens the popup when pressed in Chrome on macOS. Ctrl+Shift+G (not Ctrl+Shift+T) — test by opening `chrome://extensions/shortcuts` and confirming the key binding, then pressing it on a non-Trackman page.
- [ ] **Gemini support:** Verify clicking "Open in AI" with Gemini selected opens `https://gemini.google.com` (not the API endpoint). Verify the extension is disabled and re-prompts after loading the updated extension from `chrome://extensions`.
- [ ] **Dark mode:** Verify with DevTools color scheme emulation (Rendering tab > "Emulate CSS media feature prefers-color-scheme"). Check: body background, all buttons, both toast variants (success + error), unit dropdowns, shot count number, status message text.
- [ ] **Prompt preview:** Verify popup does not require vertical scrolling after preview is rendered. Measure popup height in DevTools — must stay under 600px with preview open.
- [ ] **Export toggle:** Verify toggling to "exclude averages" produces a CSV without average/consistency rows. Verify toggling back to "include averages" restores them. Verify the setting survives popup close and re-open. Verify the service worker reads the toggle from storage (not from a message payload).
- [ ] **Empty state:** Verify the guidance message does not flash on popup open when shot data is present. Verify it appears correctly when storage is cleared. Verify it does not appear during the Loading state.
- [ ] **Build artifacts:** Verify `dist/` contains rebuilt files after any TypeScript change. Run `bash scripts/build-extension.sh` and check timestamps before committing.
- [ ] **All 247 tests pass:** Run `npx vitest run` after implementing each feature. Dark mode and empty state changes are CSS/HTML only and should not affect existing tests. Export toggle changes writeCsv signature and will require test updates.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Cmd+Shift+T conflict with Chrome reopen-tab shortcut | LOW | Update manifest suggested_key to non-conflicting combination; rebuild; release patch; no user action required |
| Gemini host_permissions disables extension for all users | LOW (anticipated) | Expected behavior — document in release notes; provide in-extension message post-approval explaining why prompt appeared |
| Dark mode breaks existing UI with partial implementation | MEDIUM | Audit all color assignments (stylesheet + JS inline); do CSS variable refactor; retest all UI states; rebuild |
| Prompt preview overflows popup height cap | LOW | Replace modal with inline collapsible `<details>` element; constrain height with max-height + overflow: auto |
| Export toggle breaks backward compatibility (defaults to exclude) | LOW | Fix default to `true` (include); update storage read pattern to use `?? true`; rebuild |
| Empty state flashes on load for users with data | LOW | Move empty state trigger to post-storage-read; add loading state guard; rebuild |
| Keyboard shortcut _execute_action listener never fires | LOW | Remove the listener; no code change needed in popup.ts; rebuild service worker |
| Clipboard write in service worker fails | LOW | Move write handler to popup.ts; rebuild; no permission changes needed |
| AI URL pre-fill breaks after provider update | LOW | Remove URL pre-fill for that service; update flow to clipboard-only; rebuild; release patch |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Cmd+Shift+T conflict | Keyboard shortcut implementation | Test shortcut in Chrome on macOS before committing manifest change |
| _execute_action listener never fires | Keyboard shortcut implementation | Code review: no chrome.commands.onCommand listener for _execute_action |
| Gemini host_permissions disables extension | Gemini support (isolated release) | Load updated extension in Chrome; verify re-prompt appears; document in release notes |
| Dark mode breaks JS-assigned colors | Dark mode implementation (step 1: CSS variable refactor) | DevTools color scheme emulation; inspect all toast and status message colors |
| Dark mode misses dynamically created elements | Dark mode implementation | Create a toast in dark mode; inspect computed styles on .toast.success and .toast.error |
| Prompt preview overflows popup | Prompt preview implementation | Measure popup body height with preview open; assert under 600px |
| Export toggle undefined default | Export toggle implementation | Unit test: read key when absent; verify default is `true` (include averages) |
| Export toggle not threaded to service worker | Export toggle implementation | End-to-end test: toggle off, export, verify CSV has no average rows |
| Empty state flashes during loading | Empty state implementation | Rapid popup open with data present; verify no guidance flash |
| Empty state wrong for "on-page but no data" state | Empty state implementation | Define the three states in code; write specific copy for each |
| Clipboard in service worker | Clipboard copy implementation | Code review: no clipboard calls in serviceWorker.ts |
| Async focus loss on clipboard write | Clipboard copy implementation | Test with popup unfocused during async gap; verify clipboard content after click |
| "tabs" permission added unnecessarily | Manifest review (every phase) | diff manifest.json before release; confirm no new entries in permissions array |
| Storage quota exceeded for prompts | Prompt storage design | Unit test: attempt to store 20 × 1,000-char prompts; verify no quota error |

---

## Sources

- [chrome.commands API reference — Chrome for Developers](https://developer.chrome.com/docs/extensions/reference/api/commands) — keyboard shortcut restrictions, _execute_action behavior, global command limitations (HIGH confidence)
- [Permission warning guidelines — Chrome for Developers](https://developer.chrome.com/docs/extensions/develop/concepts/permission-warnings) — extension disabled on new permission warning; re-consent behavior (HIGH confidence)
- [Chrome keyboard shortcuts reference — Google Chrome Help](https://support.google.com/chrome/answer/157179) — Ctrl+Shift+T is "Reopen closed tab" on all platforms (HIGH confidence)
- [Chrome extension popup size — Chromium Issue Tracker 40655432](https://issues.chromium.org/issues/40655432) — 800×600px hard cap confirmed (HIGH confidence)
- [Inconsistency: extension popup's preferred color scheme — w3c/webextensions Issue #242](https://github.com/w3c/webextensions/issues/242) — Chrome follows OS prefers-color-scheme; browser_style removed in MV3 (MEDIUM confidence)
- [Manifest 3 Permissions on Update — chromium-extensions Google Group](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/sufxArpz5ZU) — new host_permissions trigger re-consent prompt; extension disabled (MEDIUM confidence)
- [prefers-color-scheme — MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme) — media query syntax and browser behavior (HIGH confidence)
- [chrome.storage API reference — Chrome for Developers](https://developer.chrome.com/docs/extensions/reference/api/storage) — exact sync quota: 8 KB per item, 100 KB total; local quota: 10 MB; absent keys return undefined (HIGH confidence)
- [Offscreen Documents in Manifest V3 — Chrome for Developers](https://developer.chrome.com/blog/Offscreen-Documents-in-Manifest-v3) — confirmed service workers cannot use navigator.clipboard (HIGH confidence)
- [Cannot read clipboard from service worker — Chromium Issue Tracker](https://issues.chromium.org/issues/40738001) — confirmed service workers cannot use navigator.clipboard (HIGH confidence)
- [PSA: Updates to chrome://extensions permissions UI in Chrome 130 — chromium-extensions](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/tqbVLwgVh58) — permission UI changes for host permissions (MEDIUM confidence)
- Project source code inspection: `src/manifest.json`, `src/popup/popup.html`, `src/popup/popup.ts`, `src/background/serviceWorker.ts`, `src/options/options.html`, `src/options/options.ts`, `src/shared/constants.ts` — existing architecture baseline for compatibility assessment (HIGH confidence)

---
*Pitfalls research for: Chrome Extension (MV3) — v1.5 Polish & Quick Wins (TrackPull v1.5)*
*Researched: 2026-03-02*
