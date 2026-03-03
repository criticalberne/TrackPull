# Architecture Research

**Domain:** Chrome Extension — TrackPull v1.5 Polish & Quick Wins
**Researched:** 2026-03-02
**Confidence:** HIGH (based on direct source code inspection of all current files + MV3 official documentation)

---

## Scope

This document supersedes the v1.3 ARCHITECTURE.md and covers v1.5 integration only. The existing system architecture is documented fully in the prior version and in `.claude/projects/memory/architecture.md`. This file answers: **which files get modified, which are new, how each feature integrates, and what order to build them.**

---

## Current Architecture Baseline (v1.4)

Before documenting changes, the system as it stands after v1.4:

```
┌────────────────────────────────────────────────────────────────────────┐
│                    trackmangolf.com page                                │
│  ┌──────────────────────────────────────────┐                           │
│  │  interceptor.ts (MAIN world)             │  monkey-patches fetch/XHR │
│  │  → parses StrokeGroups JSON              │  → builds SessionData     │
│  └──────────────────┬───────────────────────┘                           │
│                     │ window.postMessage                                 │
│  ┌──────────────────▼───────────────────────┐                           │
│  │  bridge.ts (ISOLATED world)              │  relays to service worker │
│  └──────────────────┬───────────────────────┘                           │
└─────────────────────┼──────────────────────────────────────────────────┘
                      │ chrome.runtime.sendMessage (SAVE_DATA)
┌─────────────────────▼──────────────────────────────────────────────────┐
│  serviceWorker.ts                                                        │
│  Handlers: SAVE_DATA, GET_DATA, EXPORT_CSV_REQUEST                      │
│  Emits: DATA_UPDATED → popup                                             │
│  APIs: chrome.storage.local, chrome.downloads                           │
└────────────────┬───────────────────────────────────────────────────────┘
                 │ chrome.storage.local + chrome.runtime.onMessage
┌────────────────▼───────────────────┐   ┌────────────────────────────────┐
│  popup.ts / popup.html             │   │  options.ts / options.html      │
│  - shot count display              │   │  - custom prompt CRUD           │
│  - export CSV                      │   │  - built-in prompts (read-only) │
│  - copy TSV to clipboard           │   │  - default AI service setting   │
│  - open in AI (ChatGPT/Claude/     │   └────────────────────────────────┘
│    Gemini already in HTML select)  │
│  - prompt selector dropdown        │
│  - AI service selector dropdown    │
│  - hitting surface selector        │
│  - unit selectors                  │
└────────────────────────────────────┘

Shared modules (no Chrome APIs):
  shared/constants.ts         — STORAGE_KEYS, METRIC_DISPLAY_NAMES, CSS selectors
  shared/csv_writer.ts        — SessionData → CSV string; includeAverages flag
  shared/tsv_writer.ts        — SessionData → TSV string (clipboard)
  shared/unit_normalization.ts — conversion math, UnitChoice types
  shared/prompt_builder.ts    — assemble prompt + data payload
  shared/prompt_types.ts      — BuiltInPrompt, CustomPrompt types + BUILTIN_PROMPTS catalog
  shared/custom_prompts.ts    — loadCustomPrompts/saveCustomPrompt/deleteCustomPrompt
  shared/html_table_parser.ts — DOM table extraction utility
  models/types.ts             — SessionData, ClubGroup, Shot interfaces
```

**Storage layout (v1.4):**

| Key | Store | Type | Set by |
|-----|-------|------|--------|
| `trackmanData` | local | SessionData | serviceWorker |
| `speedUnit` | local | `"mph" \| "m/s"` | popup |
| `distanceUnit` | local | `"yards" \| "meters"` | popup |
| `hittingSurface` | local | `"Grass" \| "Mat"` | popup |
| `selectedPromptId` | local | string | popup |
| `aiService` | sync | string | popup + options |
| `customPrompt_{id}` | sync | CustomPrompt | options |
| `customPromptIds` | sync | string[] | options |

---

## v1.5 Feature Integration Map

Each feature is analyzed independently: what files it touches, whether any new files are needed, what storage changes (if any) are required, and what the data flow looks like.

---

### Feature 1: Gemini AI Launch Support

**What it does:** Gemini is already in the AI service selector HTML (`<option value="Gemini">Gemini</option>`) and in the `AI_URLS` record in popup.ts. The tab opens correctly. The issue is that Gemini has no native URL parameter support — the tab opens to `gemini.google.com` but no prompt is pre-filled. v1.5 ships Gemini as a working option via the clipboard-first flow, which already works (paste into Gemini after clipboard copy). The isolated host_permissions release means adding `"https://gemini.google.com/*"` to the manifest in a dedicated release so the permission prompt doesn't alarm existing users.

**Confidence in approach:** HIGH — Gemini clipboard-first flow is already the architecture for all AI services. The only manifest change is host_permissions, not a new permission type.

**Files modified:**

| File | Change |
|------|--------|
| `src/manifest.json` | Add `"https://gemini.google.com/*"` to `host_permissions` array |

**Files created:** None.

**Storage schema changes:** None.

**Data flow:** No change to data flow. The existing clipboard-first flow (`await navigator.clipboard.writeText(assembled)` → `chrome.tabs.create({ url: AI_URLS[selectedService] })`) works for Gemini. `AI_URLS["Gemini"]` is already `"https://gemini.google.com"` in popup.ts.

**Why host_permissions for Gemini?** Chrome MV3 requires `host_permissions` for a domain before a content script can inject into it. Even though v1.5 uses clipboard-first (not content script injection), adding Gemini to host_permissions is the prerequisite for any future content script approach and signals intent. The isolated release requirement exists because any addition to `host_permissions` triggers a permission prompt for existing users. This must be its own version bump to control the rollout.

**Integration point with existing code:**

```
popup.ts — AI_URLS record already has "Gemini": "https://gemini.google.com"
popup.html — Gemini already in <select> options
manifest.json — ONLY file that changes for this feature
```

**Build order position:** Can ship first — manifest-only change, rebuild, release as a standalone version bump.

---

### Feature 2: Prompt Preview Before Sending to AI

**What it does:** User selects a prompt and sees a preview of the assembled prompt + data text before clicking "Open in AI." Builds trust that the correct prompt and data will be sent.

**Integration analysis:** The prompt assembly logic already exists in `shared/prompt_builder.ts` as `assemblePrompt()`. The `cachedData`, `cachedUnitChoice`, `cachedSurface`, and `cachedCustomPrompts` are already in popup.ts module scope. Preview needs: (1) a UI element in popup.html to show the assembled text, (2) a trigger in popup.ts to assemble and display it when the prompt or AI service selection changes.

**Constraint:** The popup is 320px minimum width. A full-text prompt preview would overflow the popup. The correct UX is a collapsible/expandable preview section or a character-limited preview (first N characters with a "..." indicator). A `<textarea readonly>` element that expands on click is the simplest implementation requiring no new dependencies.

**Files modified:**

| File | Change |
|------|--------|
| `src/popup/popup.html` | Add a `<div id="prompt-preview-container">` section below the prompt/service selectors, containing a `<button id="preview-toggle-btn">` and a `<textarea id="prompt-preview" readonly>` (initially hidden) |
| `src/popup/popup.ts` | Add `updatePromptPreview()` function that calls `assemblePrompt()` and sets the textarea value; call it when `promptSelect` or `aiServiceSelect` changes; wire toggle button; call on initial load |

**Files created:** None.

**Storage schema changes:** None. Preview is ephemeral, generated from cached data in memory, not persisted.

**Data flow:**

```
User changes prompt select or AI service select
        ↓
popup.ts: promptSelect.addEventListener("change", updatePromptPreview)
        ↓
updatePromptPreview() {
  if (!cachedData || !promptSelect) return;
  const prompt = findPromptById(promptSelect.value);
  if (!prompt) return;
  const tsvData = writeTsv(cachedData, cachedUnitChoice, cachedSurface);
  const metadata = { date, shotCount, unitLabel, hittingSurface };
  const assembled = assemblePrompt(prompt, tsvData, metadata);
  previewTextarea.value = assembled;
}
        ↓
User clicks toggle button → show/hide previewTextarea
```

**Key constraint — pre-assembled preview can be slow for large sessions:** `writeTsv()` and `assemblePrompt()` are pure synchronous functions. For a 200-shot session, TSV generation takes under 5ms — not a UX concern. Generating on every select change (not on every keystroke) is safe.

**Key constraint — popup height:** Chrome popup windows have a maximum recommended height. A visible `<textarea>` with 10+ lines of preview text may push the popup height to an awkward dimension. Use `max-height: 120px; overflow-y: auto` on the preview textarea to contain it.

**Integration point with existing code:**

```
popup.ts imports assemblePrompt from shared/prompt_builder.ts — already imported
popup.ts imports writeTsv from shared/tsv_writer.ts — already imported
popup.ts has cachedData, cachedUnitChoice, cachedSurface, cachedCustomPrompts — already in scope
popup.ts has findPromptById() — already exists
No new imports needed in popup.ts
```

**Build order position:** Build after dark mode CSS is finalized (dark mode affects preview textarea styling). Otherwise independent of other features.

---

### Feature 3: Empty State Guidance

**What it does:** Instead of showing "0 shots" and hiding all export/AI buttons (the current `updateExportButtonVisibility()` behavior), show an actionable message explaining how to get data: "Open a Trackman report in this tab to capture shots."

**Integration analysis:** `updateExportButtonVisibility()` in popup.ts already controls the `#export-row` and `#ai-section` display via `style.display`. `updateShotCount()` already sets the `#shot-count` text. The empty state replaces the current "0 shots" + hidden buttons with a visible guidance message. No data flow changes required.

**Files modified:**

| File | Change |
|------|--------|
| `src/popup/popup.html` | Add `<div id="empty-state">` element with guidance text and a link to trackmangolf.com; position it inside `#shot-count-container` or below it; hide by default |
| `src/popup/popup.ts` | Modify `updateExportButtonVisibility()` to also toggle `#empty-state` visibility (show when no data, hide when data present); update `updateShotCount()` to show "0" count more gracefully or suppress the count in empty state |

**Files created:** None.

**Storage schema changes:** None.

**Data flow:**

```
popup.ts DOMContentLoaded:
  cachedData = null → updateExportButtonVisibility(null)
        ↓
updateExportButtonVisibility(data):
  if hasValidData:
    exportRow.display = "flex"
    aiSection.display = "block"
    emptyState.display = "none"
  else:
    exportRow.display = "none"
    aiSection.display = "none"
    emptyState.display = "block"   ← NEW
```

**Empty state content decision:** The guidance text should be specific and actionable: "Visit a Trackman report at web-dynamic-reports.trackmangolf.com and TrackPull will automatically capture your shots." A direct link is a nice addition but requires knowing if the user is already on the right domain. A static message is sufficient for v1.5.

**Integration point with existing code:**

```
popup.ts: updateExportButtonVisibility() — modify existing function
popup.html: add #empty-state div in existing layout
No new imports, no storage changes, no service worker changes
```

**Build order position:** Can be built first or second — no dependencies on other v1.5 features.

---

### Feature 4: Export Format Toggle (Averages/Consistency Rows)

**What it does:** Add a UI control (checkbox or toggle) in the popup that lets the user choose whether the exported CSV includes or excludes the "Average" and "Consistency" rows per club. The `writeCsv()` function in `csv_writer.ts` already has an `includeAverages` boolean parameter (currently always passed as `true` from `serviceWorker.ts`).

**Integration analysis:** The `includeAverages` parameter in `writeCsv()` is the right hook — no changes to `csv_writer.ts` are needed. The only changes are: (1) persist the user's toggle preference to storage, (2) pass the preference when the service worker calls `writeCsv()`.

**Files modified:**

| File | Change |
|------|--------|
| `src/shared/constants.ts` | Add `INCLUDE_AVERAGES: "includeAverages"` to `STORAGE_KEYS` |
| `src/popup/popup.html` | Add a checkbox `<input type="checkbox" id="include-averages-toggle" checked>` with label "Include averages" in the export section |
| `src/popup/popup.ts` | Read `includeAverages` from `chrome.storage.local` on load; set checkbox state; wire `change` listener to persist to storage |
| `src/background/serviceWorker.ts` | In the `EXPORT_CSV_REQUEST` handler, read `STORAGE_KEYS.INCLUDE_AVERAGES` from storage; pass the boolean to `writeCsv()` instead of hardcoded `true` |

**Files created:** None.

**Storage schema changes:**

| Key | Store | Type | Default | Set by |
|-----|-------|------|---------|--------|
| `includeAverages` | local | boolean | `true` | popup |

The default is `true` so existing users see no behavior change on upgrade.

**Data flow:**

```
User toggles "Include averages" checkbox in popup
        ↓
popup.ts: chrome.storage.local.set({ includeAverages: checkbox.checked })
        ↓
User clicks "Export CSV"
        ↓
popup.ts → chrome.runtime.sendMessage({ type: "EXPORT_CSV_REQUEST" })
        ↓
serviceWorker.ts: reads includeAverages from storage (default true if absent)
        ↓
writeCsv(data, includeAverages, undefined, unitChoice, surface)
        ↓
CSV written with or without Average/Consistency rows
```

**Key implementation note:** The `includeAverages` flag also controls whether consistency rows appear (see `csv_writer.ts` lines 134 and 160 — both `includeAverages && ...`). This is the correct behavior: the toggle covers both Average and Consistency rows as a unit. No changes to csv_writer.ts logic are needed.

**Integration point with existing code:**

```
serviceWorker.ts: EXPORT_CSV_REQUEST handler at line 65
  — already reads: TRACKMAN_DATA, SPEED_UNIT, DISTANCE_UNIT, HITTING_SURFACE, "unitPreference"
  — add read of: STORAGE_KEYS.INCLUDE_AVERAGES
  — change writeCsv call at line 83 from writeCsv(data, true, ...) to writeCsv(data, includeAverages, ...)

popup.ts: DOMContentLoaded already reads from chrome.storage.local
  — add includeAverages to the storage.local.get call
  — wire checkbox change listener (same pattern as surface, speed, distance selectors)

csv_writer.ts: no changes needed — includeAverages parameter already exists
```

**Build order position:** Service worker changes and popup changes are independent of other v1.5 features. Can build at any point.

---

### Feature 5: Keyboard Shortcut (Cmd+Shift+T)

**What it does:** Add a keyboard shortcut `Cmd+Shift+T` (Mac) / `Ctrl+Shift+T` (Windows/Linux) that opens the TrackPull popup from any tab, allowing users to launch the popup without clicking the toolbar icon.

**Integration analysis:** Chrome MV3 provides `commands` in `manifest.json` to declare keyboard shortcuts. The `_execute_action` reserved command name triggers the extension's action (popup open) without any code. This requires zero TypeScript changes.

**Constraint — `Ctrl+Shift+T` conflict on Windows:** `Ctrl+Shift+T` is the "reopen closed tab" shortcut in Chrome on Windows/Linux. Chrome will not let extensions override browser reserved shortcuts. The correct approach is to use a different modifier combo on Windows or just use `Ctrl+Shift+Y` (or similar). Alternatively, use `Ctrl+Shift+T` on Mac (not a reserved shortcut there) and a different combo on Windows. Chrome's command system supports platform-specific bindings.

**Safer alternative:** Use `Alt+T` which is not reserved on any platform. The PROJECT.md specifies `Cmd+Shift+T` — use that as the Mac binding and `Ctrl+Shift+T` as the Windows/Linux fallback (Chrome will ignore it if reserved; users can manually reassign in chrome://extensions/shortcuts).

**Files modified:**

| File | Change |
|------|--------|
| `src/manifest.json` | Add `"commands"` block with `_execute_action` command and suggested key bindings |

**Files created:** None.

**Storage schema changes:** None.

**TypeScript changes:** None.

**Manifest change:**

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

**Key caveat:** These are "suggested" keys. Chrome may reject them if they conflict with existing browser shortcuts on the user's platform. Users can always reassign shortcuts via `chrome://extensions/shortcuts`. The `_execute_action` command name is special — it triggers the extension action (popup) without any `chrome.commands.onCommand` listener needed.

**Integration point with existing code:**

```
manifest.json — only file that changes
No popup.ts changes, no serviceWorker.ts changes
```

**Build order position:** Manifest-only. Can be combined with the Gemini host_permissions manifest change in the same build.

---

### Feature 6: Dark Mode (Match System Theme)

**What it does:** The popup and options page automatically switch to a dark color scheme when the user's OS is set to dark mode. Uses CSS `prefers-color-scheme: dark` media query.

**Integration analysis:** All CSS currently lives inline in `popup.html` and `options.html` `<style>` blocks. There is also a `src/shared/styles.css` file that is not referenced by either HTML file (it appears to be an artifact). The v1.5 dark mode implementation adds `@media (prefers-color-scheme: dark)` blocks to the inline styles in both HTML files. No JavaScript changes are needed — CSS handles the theme switching automatically.

**Files modified:**

| File | Change |
|------|--------|
| `src/popup/popup.html` | Add `@media (prefers-color-scheme: dark) { ... }` block in the existing `<style>` tag |
| `src/options/options.html` | Add `@media (prefers-color-scheme: dark) { ... }` block in the existing `<style>` tag |

**Files created:** None (the existing `src/shared/styles.css` is not currently used and should remain untouched).

**Storage schema changes:** None. System theme detection is CSS-native.

**TypeScript changes:** None.

**Dark mode color mapping:**

The current light mode palette uses these semantic values that need dark counterparts:

| Token | Light value | Dark value |
|-------|-------------|------------|
| Body background | `#ffffff` | `#1a1a1a` |
| Body text | `#333333` | `#e0e0e0` |
| Secondary text | `#666666` | `#9e9e9e` |
| H1 color | `#1a1a1a` | `#f0f0f0` |
| Accent (borders, selects) | `#1976d2` | `#64b5f6` |
| Card/panel background | `#f5f5f5` | `#2c2c2c` |
| Input background | `#ffffff` | `#2c2c2c` |
| Input border | `#ccc` | `#555` |
| Shot count number | `#1976d2` | `#64b5f6` |
| Icon button hover bg | `#f0f0f0` | `#333333` |
| Section divider | `#e0e0e0` | `#3a3a3a` |
| Built-in prompt row bg | `#f9f9f9` | `#2a2a2a` |
| Success toast | `#388e3c` (unchanged) | `#388e3c` |
| Error toast | `#d32f2f` (unchanged) | `#d32f2f` |

**Example media query structure for popup.html:**

```css
@media (prefers-color-scheme: dark) {
  body {
    background-color: #1a1a1a;
    color: #e0e0e0;
  }
  h1, h2 {
    color: #f0f0f0;
  }
  .shot-count-container {
    background-color: #2c2c2c;
  }
  .shot-count {
    color: #64b5f6;
  }
  .unit-selectors select,
  .ai-group select {
    background: #2c2c2c;
    color: #e0e0e0;
    border-color: #64b5f6;
  }
  .icon-btn {
    color: #9e9e9e;
  }
  .icon-btn:hover {
    background-color: #333;
    color: #64b5f6;
  }
  .ai-section {
    border-top-color: #3a3a3a;
  }
  /* ... additional rules */
}
```

**Constraint — popup.html inline styles:** Because both HTML files use inline `<style>` blocks (not external CSS files), the `@media` blocks must be added inside those same `<style>` blocks. This is straightforward but means maintaining color tokens in two separate files. For v1.5 this is acceptable — extracting to a shared CSS file would require build script changes and is out of scope.

**Integration point with existing code:**

```
popup.html: <style> block — append dark mode media query
options.html: <style> block — append dark mode media query
No TypeScript changes, no storage changes, no manifest changes
```

**Build order position:** Build dark mode FIRST among the v1.5 UI changes. Reason: prompt preview, empty state, and export toggle all add new HTML elements. If dark mode CSS is written first, the new elements can be included in the same media query block during those features' implementation, avoiding a second pass through the CSS.

---

## File-Level Change Summary

| File | Change Type | Features | Notes |
|------|-------------|----------|-------|
| `src/manifest.json` | Modified | Gemini (host_permissions), Keyboard shortcut (commands) | Two independent additions; can be one commit or two |
| `src/shared/constants.ts` | Modified | Export toggle | Add `INCLUDE_AVERAGES` to STORAGE_KEYS |
| `src/background/serviceWorker.ts` | Modified | Export toggle | Read `includeAverages` from storage; pass to writeCsv() |
| `src/popup/popup.html` | Modified | Dark mode, Prompt preview, Empty state, Export toggle | Four features, all inline style/HTML additions |
| `src/popup/popup.ts` | Modified | Prompt preview, Empty state, Export toggle | Three features; no new imports needed |
| `src/options/options.html` | Modified | Dark mode | CSS media query only |
| `src/shared/csv_writer.ts` | None | — | `includeAverages` param already exists |
| `src/shared/prompt_builder.ts` | None | — | `assemblePrompt()` already used for preview |
| `src/shared/tsv_writer.ts` | None | — | Already used; no changes needed |
| `src/content/interceptor.ts` | None | — | Unchanged |
| `src/content/bridge.ts` | None | — | Unchanged |
| `src/background/serviceWorker.ts` | None (except export toggle) | — | Only EXPORT_CSV_REQUEST handler changes |

**New files created:** None. All six v1.5 features integrate into existing files.

---

## Storage Schema Changes (v1.5 delta)

Only one new storage key is added in v1.5:

| Key | Store | Type | Default | Added by |
|-----|-------|------|---------|----------|
| `includeAverages` | local | boolean | `true` | Export toggle feature |

No keys are removed or renamed. The default of `true` ensures zero behavior change for existing users on upgrade.

---

## Suggested Build Order

The build order is driven by two constraints: (1) dark mode CSS should exist before UI features add new elements, so those elements can get dark mode styles in one pass; (2) manifest changes (Gemini + keyboard shortcut) are independent and can ship in isolation.

```
Step 1 — Manifest changes (independent, isolated release)
  ├─ manifest.json: add host_permissions for Gemini
  └─ manifest.json: add commands block for keyboard shortcut
  → Build + verify + release as v1.5.0-gemini (or bundle both in one manifest PR)
  Note: Keyboard shortcut and Gemini host_permissions in same manifest edit is fine
        since they're non-conflicting additions.

Step 2 — Dark mode CSS (foundation for UI features)
  ├─ popup.html: add @media (prefers-color-scheme: dark) block
  └─ options.html: add @media (prefers-color-scheme: dark) block
  → Build + verify with system dark mode toggle
  Rationale: Do dark mode before adding HTML elements so new elements get dark
             styles in the same session, not as a retrofit.

Step 3 — Empty state guidance (popup.html + popup.ts only)
  ├─ popup.html: add #empty-state div with guidance text
  └─ popup.ts: modify updateExportButtonVisibility() to toggle empty state
  → Simple, self-contained; no storage changes.

Step 4 — Export format toggle (constants.ts + popup.ts + popup.html + serviceWorker.ts)
  ├─ constants.ts: add INCLUDE_AVERAGES storage key
  ├─ popup.html: add checkbox in export section; add to dark mode query if Step 2 complete
  ├─ popup.ts: read/persist includeAverages on load; wire checkbox listener
  └─ serviceWorker.ts: read includeAverages from storage; pass to writeCsv()
  → Cross-file change; serviceWorker and popup must be rebuilt together.

Step 5 — Prompt preview (popup.html + popup.ts only)
  ├─ popup.html: add preview toggle button + textarea; add to dark mode query
  └─ popup.ts: add updatePromptPreview() function; wire to prompt/service change events
  → No new imports; uses existing assemblePrompt() and writeTsv() already in scope.
  Note: Build after export toggle so popup.ts changes are consolidated.

Order rationale:
- Manifest first (Gemini is already 99% wired; manifest is the only blocker)
- Dark mode second (CSS foundation before HTML elements proliferate)
- Empty state third (zero dependencies; quick win)
- Export toggle fourth (requires storage key; cross-file coordination)
- Prompt preview fifth (no dependencies; goes last to consolidate popup.ts edits)
```

---

## Component Boundaries for v1.5

### What stays unchanged

- `interceptor.ts` — zero changes; data capture is unrelated to any v1.5 feature
- `bridge.ts` — zero changes; relay is unrelated to any v1.5 feature
- `csv_writer.ts` — zero changes; the `includeAverages` parameter already exists
- `tsv_writer.ts` — zero changes; clipboard copy flow is already correct
- `prompt_builder.ts` — zero changes; `assemblePrompt()` is already used for prompt preview
- `prompt_types.ts` — zero changes; built-in prompts unchanged
- `custom_prompts.ts` — zero changes; custom prompt storage unchanged
- `unit_normalization.ts` — zero changes
- `html_table_parser.ts` — zero changes
- `types.ts` — zero changes

### What changes

| Component | Why it changes | Risk |
|-----------|---------------|------|
| `manifest.json` | Gemini host_permissions + keyboard commands | LOW — additive; no permissions removed |
| `constants.ts` | New storage key `includeAverages` | LOW — purely additive |
| `serviceWorker.ts` | Export toggle: read one extra storage key | LOW — single parameter change to existing writeCsv() call |
| `popup.html` | Dark mode CSS + empty state + export toggle checkbox + prompt preview UI | MEDIUM — multiple additions to one file; order matters for readability |
| `popup.ts` | Empty state toggle + export toggle persistence + prompt preview assembly | MEDIUM — modifies existing functions and adds new ones |
| `options.html` | Dark mode CSS only | LOW — CSS-only addition |

---

## Integration Patterns

### Pattern: Extend `updateExportButtonVisibility()` for Empty State

The function already controls `#export-row` and `#ai-section` display. The empty state flag adds a third element (`#empty-state`) to the same conditional:

```typescript
function updateExportButtonVisibility(data: unknown): void {
  const exportRow = document.getElementById("export-row");
  const aiSection = document.getElementById("ai-section");
  const emptyState = document.getElementById("empty-state");  // NEW

  const hasValidData = data && typeof data === "object" &&
    (data as Record<string, unknown>)["club_groups"];

  if (exportRow) exportRow.style.display = hasValidData ? "flex" : "none";
  if (aiSection) aiSection.style.display = hasValidData ? "block" : "none";
  if (emptyState) emptyState.style.display = hasValidData ? "none" : "block";  // NEW
}
```

### Pattern: Export Toggle Follows Existing Preference Storage

The export toggle follows exactly the same pattern as `hittingSurface`: read on load, apply to UI element, wire change listener to persist.

```typescript
// In DOMContentLoaded — same pattern as hitting surface
const includeAveragesResult = await new Promise<Record<string, unknown>>((resolve) => {
  chrome.storage.local.get([STORAGE_KEYS.INCLUDE_AVERAGES], resolve);
});
const includeAveragesToggle = document.getElementById("include-averages-toggle") as HTMLInputElement | null;
if (includeAveragesToggle) {
  // Default true if not set (preserve existing behavior)
  const savedIncludeAverages = includeAveragesResult[STORAGE_KEYS.INCLUDE_AVERAGES];
  includeAveragesToggle.checked = savedIncludeAverages !== false;
  includeAveragesToggle.addEventListener("change", () => {
    chrome.storage.local.set({ [STORAGE_KEYS.INCLUDE_AVERAGES]: includeAveragesToggle.checked });
  });
}
```

### Pattern: Prompt Preview Uses Cached Data (No New Storage Reads)

The preview assembles from already-cached module-level variables. No new `chrome.storage` reads are needed:

```typescript
function updatePromptPreview(): void {
  const previewTextarea = document.getElementById("prompt-preview") as HTMLTextAreaElement | null;
  if (!previewTextarea || !cachedData || !promptSelect) return;

  const prompt = findPromptById(promptSelect.value);
  if (!prompt) return;

  const tsvData = writeTsv(cachedData, cachedUnitChoice, cachedSurface);
  const metadata = {
    date: cachedData.date,
    shotCount: countSessionShots(cachedData),
    unitLabel: buildUnitLabel(cachedUnitChoice),
    hittingSurface: cachedSurface,
  };
  previewTextarea.value = assemblePrompt(prompt, tsvData, metadata);
}
```

Wire to both `promptSelect` and `aiServiceSelect` change events:
```typescript
promptSelect.addEventListener("change", () => {
  chrome.storage.local.set({ [STORAGE_KEYS.SELECTED_PROMPT_ID]: promptSelect.value });
  updatePromptPreview();  // add this line
});
```

---

## Data Flow Summary for v1.5

### Gemini launch flow (same as ChatGPT/Claude)
```
User selects "Gemini" + clicks "Open in AI"
  → await navigator.clipboard.writeText(assembled)
  → chrome.tabs.create({ url: "https://gemini.google.com" })
  → showToast("Prompt + data copied — paste into Gemini", "success")
```

### Empty state flow
```
popup opens, cachedData = null
  → updateExportButtonVisibility(null)
  → exportRow hidden, aiSection hidden, emptyState shown
User opens Trackman report, data captured
  → DATA_UPDATED message
  → cachedData = SessionData
  → updateExportButtonVisibility(data)
  → exportRow shown, aiSection shown, emptyState hidden
```

### Export toggle flow
```
popup loads
  → chrome.storage.local.get([INCLUDE_AVERAGES])
  → checkbox.checked = stored value (default true)
User unchecks "Include averages"
  → chrome.storage.local.set({ includeAverages: false })
User clicks Export CSV
  → serviceWorker reads includeAverages from storage
  → writeCsv(data, false, undefined, unitChoice, surface)
  → CSV contains only Shot rows, no Average/Consistency rows
```

### Keyboard shortcut flow
```
User presses Cmd+Shift+T (Mac) or Ctrl+Shift+T (Win/Linux)
  → Chrome triggers _execute_action command
  → Popup opens (same as clicking toolbar icon)
  → No extension code needed
```

### Dark mode flow
```
OS switches to dark mode
  → @media (prefers-color-scheme: dark) CSS activates automatically
  → Popup and options page adopt dark palette
  → No JavaScript involved
```

### Prompt preview flow
```
popup loads with cachedData
  → updatePromptPreview() called after initial prompt + data cache
  → preview textarea populated
User changes prompt select
  → updatePromptPreview() called from change listener
  → preview textarea updated with new assembled text
User clicks preview toggle
  → preview container shown/hidden via style.display toggle
```

---

## Anti-Patterns to Avoid

### Anti-Pattern: Storing Theme Preference in chrome.storage

**What to avoid:** Adding a `darkMode: "system" | "light" | "dark"` preference to storage.
**Why wrong:** `prefers-color-scheme` CSS handles system theme automatically. Adding manual override creates a three-state toggle that's unnecessary complexity for v1.5.
**Do instead:** Use `@media (prefers-color-scheme: dark)` CSS only. Ship system-match only.

### Anti-Pattern: Generating Preview on Every Keystroke

**What to avoid:** Wiring `input` event on the prompt textarea (if editable) or any per-keystroke update.
**Why wrong:** Assembling TSV for large sessions on every keystroke causes jank.
**Do instead:** Assemble preview on `change` events (prompt selection changes) and on initial load only.

### Anti-Pattern: Manifest Permission Bundling

**What to avoid:** Adding Gemini `host_permissions` in the same release as unrelated feature changes.
**Why wrong:** Permission prompt appears to users when the extension updates. Bundling it with other features obscures the reason for the permission prompt.
**Do instead:** Gemini `host_permissions` addition is its own isolated release (v1.5.x-gemini). Keyboard shortcut `commands` can be bundled with it since commands don't trigger a permission prompt.

### Anti-Pattern: Hardcoding `includeAverages: true` After Feature Ships

**What to avoid:** Leaving `writeCsv(data, true, ...)` hardcoded in serviceWorker.ts after the toggle UI is shipped.
**Why wrong:** The UI shows a checkbox that appears to control the setting but the service worker ignores it.
**Do instead:** Always read `includeAverages` from storage in the EXPORT_CSV_REQUEST handler. If the key is absent, default to `true` (preserves prior behavior). This is a single line change to an existing storage read.

### Anti-Pattern: Sharing a CSS File Between popup.html and options.html via External Link

**What to avoid:** Moving inline styles to `shared/styles.css` and referencing it with `<link rel="stylesheet">` from both HTML files.
**Why wrong:** Requires build script changes (copy CSS to dist/), adds a network request per page load within the extension, and creates coupling between the two pages' style updates. For v1.5, inline is correct.
**Do instead:** Keep styles inline in each HTML file. The existing `shared/styles.css` file is not used and should remain unused for v1.5.

---

## Sources

- Direct source code inspection: `/Users/kylelunter/claudeprojects/trackv3/src/` — all TypeScript and HTML files read (HIGH confidence)
- Chrome MV3 manifest `commands` documentation: https://developer.chrome.com/docs/extensions/reference/api/commands (HIGH confidence)
- `_execute_action` reserved command name for triggering extension popup: official MV3 docs (HIGH confidence)
- `prefers-color-scheme` CSS media query: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme (HIGH confidence)
- Chrome MV3 `host_permissions` permission prompt behavior: https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions (HIGH confidence)
- Prior ARCHITECTURE.md research (v1.3 build, 2026-03-02) — clipboard flow, storage patterns, anti-patterns (HIGH confidence, same codebase)

---
*Architecture research for: TrackPull v1.5 — Polish & Quick Wins*
*Researched: 2026-03-02*
*Supersedes v1.3 ARCHITECTURE.md for this milestone's scope*
