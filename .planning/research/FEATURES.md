# Feature Research

**Domain:** Golf data scraping and export Chrome extension (Trackman report data)
**Researched:** 2026-03-02
**Confidence:** HIGH for dark mode and keyboard shortcut (verified Chrome API docs); HIGH for Gemini approach (confirmed no native URL pre-fill); MEDIUM for prompt preview and empty state UX patterns (established patterns, no Chrome-specific verification needed)

---

## Milestone Scope

This document covers **v1.5 features only**: Gemini AI launch, prompt preview, empty state guidance, export format toggle, keyboard shortcut, and dark mode. It extends and supersedes the v1.3 FEATURES.md for these domains.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that are non-negotiable for v1.5. Missing these makes the polish milestone feel incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Dark mode matching system theme | Users with OS-level dark mode expect all UI to match; a white popup glaring in dark mode is an obvious oversight | LOW | Pure CSS: `@media (prefers-color-scheme: dark)` works in Chrome extension popups and reads OS preference. No JS needed. No `matchMedia` listener needed for initial load. |
| Empty state guidance instead of "0 shots" | "0 shots" is a dead end — it tells the user nothing. Standard UX requires an actionable message explaining what to do next | LOW | Replace the bare number with a short message + link. Standard pattern: positive phrasing ("Open a Trackman report to capture shots") + actionable link to `web-dynamic-reports.trackmangolf.com`. |
| Keyboard shortcut to open popup | Power users expect keyboard access to any frequently-used extension; manually clicking the extension icon is friction | LOW | Use `_execute_action` in manifest `commands`. Cannot use Cmd+Shift+T — that is Chrome's reserved "reopen closed tab" shortcut. Must use a non-conflicting combo (see dependency notes). |
| Gemini as a supported AI service | Gemini is now listed in the AI dropdown but behaves identically to ChatGPT/Claude — open the tab, user pastes | LOW | Gemini has no native URL parameter pre-fill. Clipboard-first approach (copy prompt+data to clipboard, open gemini.google.com) is the correct and already-working pattern. No content script or new host_permissions needed if not injecting. |

---

### Differentiators (Competitive Advantage)

Features that go beyond fixing obvious gaps and create a meaningfully better experience.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Prompt preview before AI launch | Lets user see the full assembled prompt+data before committing to clipboard copy + tab open. Builds trust that the data is correct. Especially valuable for large sessions. | LOW | A collapsible `<details>/<summary>` element or a show/hide textarea in the popup showing the assembled output of `assemblePrompt()`. Read-only. The assembly logic already exists — this is purely a display surface. No new logic. |
| Export format toggle for averages/consistency rows | Advanced users who paste into their own analysis spreadsheet don't want the summary rows mixed in with shot-level data | LOW | A single checkbox or compact toggle in the popup: "Include summary rows" (default: on). Persisted in `chrome.storage.local`. The CSV writer already generates these rows — add a boolean param to conditionally skip them. |

---

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Gemini content script injection for URL pre-fill | Seems like it would make Gemini match ChatGPT/Claude's "auto-fill" behavior | Requires adding `gemini.google.com` to `host_permissions`, which triggers a permission prompt for all existing users on extension update. The content script approach is brittle against Gemini's SPA architecture changes. The clipboard-first approach already works and is the correct design. | Ship Gemini as clipboard-first (identical to current behavior): open gemini.google.com + data already in clipboard. No new permissions required. No injection needed. The PROJECT.md note "isolated host_permissions release" refers to this permission cost — avoid it entirely by not injecting. |
| `Cmd+Shift+T` as the keyboard shortcut | The project spec names this shortcut | Chrome reserves `Cmd+Shift+T` (Mac) / `Ctrl+Shift+T` (PC) as "Reopen closed tab" at the browser level. Extensions cannot override reserved browser shortcuts. Chrome will silently ignore or conflict with this binding. | Use `Cmd+Shift+Y` (Mac) / `Ctrl+Shift+Y` (PC) — the example shortcut in Chrome's own `_execute_action` documentation. Users can reassign shortcuts in `chrome://extensions/shortcuts`. |
| System-level dark mode toggle within the extension | Seems like users want to control the theme independently of the OS | The whole value prop of v1.5 dark mode is "matches system theme automatically with zero user action." A manual toggle adds settings complexity for no gain — users who want to override the system already know how to do so at the OS level. | `@media (prefers-color-scheme: dark)` CSS only. One rule. No JS. No toggle. No storage. |
| Export format toggle in options page | Seems cleaner to keep options separate | The export format toggle is a per-session decision (some sessions you want raw data, some you want summaries). It belongs in the popup, accessible during the export workflow, not buried in a settings page. | Inline toggle in popup, adjacent to Export CSV button. Small checkbox or labeled switch. |
| Prompt preview in a separate modal/overlay | More screen space for long prompts | Chrome popup maximum width is ~800px but design convention keeps popups narrow (320-400px). A modal within a popup creates nested scroll complexity. Large prompts also make the user regret previewing — they can't do anything useful with 30 KB of text in a 200px textarea. | `<details>/<summary>` disclosure widget: collapsed by default, expands inline. Scrollable fixed-height textarea (e.g., 120px). Shows enough to confirm data is present without overwhelming the popup layout. |

---

## Feature Dependencies

```
[Dark Mode]
    (independent — pure CSS, no dependencies)

[Empty State Guidance]
    └──requires──> [Shot count display] (already exists as #shot-count element)
    └──enhances──> [Shot count display] (replaces "0" with actionable message)

[Keyboard Shortcut]
    └──requires──> [manifest.json "commands" entry with _execute_action]
    (no code changes — manifest-only)

[Gemini AI Launch]
    └──requires──> [Clipboard-first AI launch pattern] (already exists in v1.3)
    └──requires──> [AI_URLS["Gemini"] entry] (already exists in popup.ts)
    (no new dependencies — Gemini option already in dropdown; behavior is identical to ChatGPT/Claude)

[Prompt Preview]
    └──requires──> [assemblePrompt()] (already exists in prompt_builder.ts)
    └──requires──> [findPromptById()] (already exists in popup.ts)
    └──requires──> [cachedData] (already pre-fetched at DOMContentLoaded)
    └──enhances──> [AI Tab Launch] (user sees what will be copied before clicking Open in AI)

[Export Format Toggle]
    └──requires──> [CSV writer function] (already exists in background.ts or equivalent)
    └──requires──> [chrome.storage.local] (already declared in manifest)
    └──enhances──> [Export CSV button] (adds include/exclude option)
```

### Dependency Notes

- **Gemini has no new dependencies.** The "Gemini AI launch support" in PROJECT.md is already half-done — `AI_URLS["Gemini"]` is already defined in popup.ts and Gemini is already in the AI service dropdown. The only missing piece is whether Gemini was intentionally excluded from the launch flow previously. Confirm whether the Open in AI button already handles Gemini identically to ChatGPT/Claude (clipboard + tabs.create). If yes, v1.5 Gemini work is purely the "isolated host_permissions release" — i.e., no new manifest changes are needed because no content script is being added.
- **Keyboard shortcut is manifest-only.** No TypeScript changes needed. Add `"commands": { "_execute_action": { "suggested_key": { "default": "Ctrl+Shift+Y", "mac": "Command+Shift+Y" } } }` to manifest.json. Do not use T — it conflicts with Chrome's reopen-closed-tab shortcut.
- **Prompt preview requires popup layout consideration.** The current popup has a fixed-width layout. A collapsible preview section added after the AI controls section will extend popup height. This is acceptable. Ensure the `<details>` element is closed by default so existing users see no layout change until they click.
- **Export format toggle requires CSV writer modification.** The toggle state is read at export time and passed as a parameter. Do not change the default behavior (include summaries by default) — only the explicit toggle should suppress them.
- **Dark mode requires audit of all hardcoded colors.** The popup.html currently uses hardcoded hex colors (`#ffffff`, `#333333`, `#666666`, `#1976d2`, `#388e3c`, `#d32f2f`, `#f5f5f5`). Each must be overridden in a `@media (prefers-color-scheme: dark)` block. Use CSS custom properties (`--bg`, `--text`, `--accent`) to minimize the override surface.

---

## MVP Definition

The v1.5 milestone scope is pre-defined in PROJECT.md. This section maps that scope to a recommended build order based on complexity and risk.

### Build First (fastest, no dependencies, highest safety)

- [ ] **Dark mode CSS** — Pure CSS, no JS, no logic changes. Add `@media (prefers-color-scheme: dark)` block to popup.html and options.html. Zero risk of regression.
- [ ] **Keyboard shortcut manifest entry** — Single manifest.json change. No TypeScript. Use `Cmd+Shift+Y` / `Ctrl+Shift+Y` (not T). Test in `chrome://extensions/shortcuts` to verify it appears.
- [ ] **Empty state guidance** — Replace `updateShotCount()` logic to show "Open a Trackman report" message when count is 0. Minor JS change in popup.ts + CSS for the message styling.

### Build Second (slightly more surface area)

- [ ] **Export format toggle** — Add checkbox to popup HTML next to Export CSV. Persist state to `chrome.storage.local`. Pass boolean to CSV writer. Modify writer to conditionally skip averages/consistency rows.
- [ ] **Prompt preview disclosure widget** — Add `<details><summary>Preview prompt</summary><textarea readonly></textarea></details>` after AI controls. Wire to `assemblePrompt()` on prompt/service change. Populate on expand.

### Build Last (verify Gemini behavior before touching)

- [ ] **Gemini AI launch confirmation** — Verify the existing Open in AI button already handles Gemini via clipboard-first (it should — `AI_URLS["Gemini"]` exists). If it does, this is a no-op code change and only a manifest version bump. If a content script was required, that is a separate decision (see Anti-Features above).

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Dark mode | HIGH | LOW | P1 |
| Empty state guidance | HIGH | LOW | P1 |
| Keyboard shortcut | MEDIUM | LOW | P1 |
| Export format toggle | MEDIUM | LOW | P1 |
| Prompt preview | MEDIUM | LOW | P1 |
| Gemini AI launch | LOW | LOW | P2 |

**Priority key:**
- P1: Ship in v1.5 (all are low-cost, do them all)
- P2: Verify existing behavior first; may already be done

---

## Technical Implementation Notes

These are findings that directly affect implementation decisions for v1.5 features.

### Dark Mode

- **`prefers-color-scheme` works in Chrome extension popups.** Confirmed via w3c/webextensions issue #242: Chrome extension popups and options pages read the OS-level color scheme preference consistently. No JS listener or `matchMedia` required for initial paint.
- **CSS custom properties are the right approach.** Define a `:root` block with light-mode defaults, then override in `@media (prefers-color-scheme: dark)`. This minimizes the number of override declarations.
- **CSS `light-dark()` function is available.** Chrome 123+ (released 2024) supports `color: light-dark(#333, #eee)` as a single declaration covering both modes. Since TrackPull targets current Chrome only, this is available. It reduces boilerplate versus separate media query blocks.
- **options.html needs the same treatment.** Both popup.html and options.html use inline styles. Both must be updated.
- Confidence: HIGH (verified via [MDN prefers-color-scheme](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme) and [w3c/webextensions issue #242](https://github.com/w3c/webextensions/issues/242))

### Keyboard Shortcut

- **`_execute_action` is the correct command.** In Manifest V3, this reserved command opens the extension popup on keypress. It does not fire `onCommand` events — no background script handler needed.
- **`Cmd+Shift+T` is a Chrome-reserved browser shortcut** (reopen closed tab). Extensions cannot override OS-level or browser-reserved shortcuts. Using it will cause silent failure or conflict. The Chrome commands API documentation uses `Ctrl+Shift+Y` / `Command+Shift+Y` as its own example shortcut — use that.
- **Suggested keys are advisory.** Users can remap to any non-reserved combo in `chrome://extensions/shortcuts`. The manifest `suggested_key` is a default proposal only.
- **Manifest-only change.** No TypeScript files need modification.
- Confidence: HIGH (verified via [Chrome commands API](https://developer.chrome.com/docs/extensions/reference/api/commands))

### Gemini AI Launch

- **Gemini has no native URL pre-fill.** As of 2025, `gemini.google.com` does not parse `?q=`, `?prompt=`, or `?text=` URL parameters natively. Extensions like `elliot79313/gemini-url-prompt` simulate input injection via content scripts — they are not using a native Gemini URL scheme.
- **Clipboard-first is the correct pattern.** TrackPull's existing implementation (copy assembled prompt+data to clipboard, then `chrome.tabs.create({ url: "https://gemini.google.com" })`) is already the correct approach. This is what the code does for ChatGPT and Claude today.
- **No `host_permissions` needed if not injecting.** `chrome.tabs.create()` requires no host_permissions for the destination URL. Only reading tab properties (url, title) or running content scripts requires host_permissions. Opening a tab to gemini.google.com requires zero new permissions.
- **PROJECT.md note "isolated host_permissions release"** refers to a past decision to defer adding Gemini injection to a separate release to avoid triggering permission prompts. Since we're NOT adding a content script (clipboard-first approach instead), no host_permissions change is needed at all. The Gemini dropdown option already exists in the popup — the "launch" is to verify it already works.
- Confidence: HIGH for clipboard-first approach; LOW for whether native URL pre-fill will ever exist (Google has not announced it)

### Prompt Preview

- **Assembly is already done.** `assemblePrompt(prompt, tsvData, metadata)` in `prompt_builder.ts` returns the full assembled string. The popup already calls this on "Open in AI" click. Prompt preview just calls the same function and displays the result in a read-only textarea.
- **Update on prompt/service change.** Wire the preview textarea to update when `promptSelect` or `aiServiceSelect` change. Use the same `cachedData`, `cachedUnitChoice`, `cachedSurface` already cached at DOMContentLoaded.
- **`<details>/<summary>` preferred over modal.** The popup is constrained. A disclosure widget collapsed by default adds zero visual weight. On expand it shows a scrollable textarea. This is the dominant pattern in extension popups for secondary info.
- **Popup height concern.** The popup currently shrink-wraps content. Adding a collapsed `<details>` block is invisible. When expanded, the popup will grow taller. Chrome allows popup heights up to ~600px. Current popup is well under that. No issue.
- Confidence: HIGH (implementation path is clear from existing code)

### Export Format Toggle

- **CSV writer location.** The export CSV flow goes through the background service worker (background.ts handles `EXPORT_CSV_REQUEST` messages). The toggle state must be passed through the message or read from storage in the background.
- **Storage key needed.** Add `INCLUDE_SUMMARY_ROWS` to `STORAGE_KEYS` constants. Default: `true` (existing behavior preserved).
- **Popup reads preference at launch** (same pattern as other preferences). Toggle checkbox reflects stored value. On change: write to `chrome.storage.local` immediately (same pattern as speed/distance unit selectors).
- **CSV writer gets a new optional boolean param.** `includeSummaryRows: boolean = true`. When false, skip the averages row and consistency row per club. This is additive — zero caller breakage with a default param.
- Confidence: HIGH (clear implementation path from existing code patterns)

### Empty State Guidance

- **UX pattern:** Positive phrasing, single actionable step. "Open a Trackman report to capture shots" with a subtitle link "Go to Trackman" pointing to `https://web-dynamic-reports.trackmangolf.com`. Per NN/g and industry patterns: avoid "No data found" (negative); prefer "Here's how to get started" (positive + actionable).
- **Implementation:** Modify `updateShotCount()` to either set `shotCountElement.textContent` to the number (existing behavior when data exists) or render a guidance message when count is 0. A separate `<div id="empty-state">` element (hidden when data exists) avoids mutating the count element's semantics.
- **The export row and AI section are already hidden** when there's no data (via `updateExportButtonVisibility()`). The empty state guidance replaces the cold "0" with an instructional message in the same space.
- Confidence: HIGH (clear from existing code + well-established UX pattern)

---

## Competitor Feature Analysis

| Feature | Grammarly (ext) | JSON Formatter (ext) | ChatGPT for Chrome (ext) | TrackPull v1.5 plan |
|---------|-----------------|----------------------|--------------------------|---------------------|
| Dark mode | Yes | Yes | Yes | Yes — `prefers-color-scheme` CSS |
| Keyboard shortcut | Yes | Varies | Yes | Yes — `_execute_action` with `Cmd+Shift+Y` |
| Empty state guidance | Yes (onboarding) | N/A | Yes | Yes — actionable message |
| Prompt preview | N/A | N/A | Yes | Yes — disclosure widget |
| Export options toggle | N/A | N/A | N/A | Yes — include/exclude summary rows |
| Gemini support | N/A | N/A | N/A | Yes — clipboard-first (same as ChatGPT/Claude) |

---

## Sources

- [Chrome commands API — `_execute_action` and key syntax](https://developer.chrome.com/docs/extensions/reference/api/commands) — confirmed `_execute_action` for popup trigger; `Command+Shift+Y` / `Ctrl+Shift+Y` as example shortcut (HIGH confidence)
- [MDN prefers-color-scheme](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme) — CSS media query syntax (HIGH confidence)
- [w3c/webextensions issue #242](https://github.com/w3c/webextensions/issues/242) — confirmed `prefers-color-scheme` reads OS preference in Chrome extension popups (HIGH confidence)
- [elliot79313/gemini-url-prompt GitHub](https://github.com/elliot79313/gemini-url-prompt) — confirmed Gemini requires content script injection for URL pre-fill; no native URL params (MEDIUM confidence)
- [Google AI Developers Forum — Gemini URL pre-fill](https://discuss.ai.google.dev/t/can-the-gemini-api-enable-a-website-to-open-the-gemini-site-with-a-text-prompt-pre-filled-by-that-website/73828) — no official Google response confirming native support; community workarounds required (MEDIUM confidence)
- [Chrome keyboard shortcuts — Ctrl+Shift+T](https://support.google.com/chrome/answer/157179) — Ctrl+Shift+T / Cmd+Shift+T is Chrome's reserved "reopen closed tab" shortcut (HIGH confidence)
- [NN/g — Designing Empty States](https://www.nngroup.com/articles/empty-state-interface-design/) — positive phrasing + single action UX pattern (MEDIUM confidence)
- [Chrome dialog element for modals](https://developer.chrome.com/blog/dialog-element-modals-made-easy) — `<details>/<summary>` preferred over dialog for lightweight disclosures in space-constrained popups (MEDIUM confidence)
- [Chrome tabs API — tabs.create](https://developer.chrome.com/docs/extensions/reference/api/tabs) — no host_permissions required for destination URL when creating a tab (HIGH confidence)
- [CSS light-dark() function](https://medium.com/front-end-weekly/forget-javascript-achieve-dark-mode-effortlessly-with-brand-new-css-function-light-dark-2024-94981c61756b) — available in Chrome 123+ as single-declaration dark mode (MEDIUM confidence)

---

*Feature research for: TrackPull v1.5 — Polish & Quick Wins (Gemini launch, prompt preview, empty states, export toggle, keyboard shortcut, dark mode)*
*Researched: 2026-03-02*
*Supersedes v1.3 FEATURES.md for new v1.5 feature domains; v1.3 entries preserved as context where referenced*
