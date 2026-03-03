# Project Research Summary

**Project:** TrackPull v1.5 — Polish & Quick Wins
**Domain:** Chrome Extension (MV3) — Golf data capture and AI prompt export
**Researched:** 2026-03-02
**Confidence:** HIGH

## Executive Summary

TrackPull v1.5 is a polish milestone for an existing, proven Chrome extension. The codebase already has a complete, zero-production-dependency architecture (TypeScript + esbuild + Chrome MV3 APIs) that works in production. All six v1.5 features — Gemini AI launch, prompt preview, empty state guidance, export format toggle, keyboard shortcut, and dark mode — are additive enhancements that extend existing files without requiring new dependencies, new modules, or architectural changes. The correct expert approach for this type of polish milestone is to build incrementally: manifest-first (isolated release for permission changes), CSS-foundation next (dark mode before UI elements proliferate), then UI logic changes in increasing complexity order.

The recommended approach is to ship Gemini host_permissions as a standalone release before bundling the remaining five features together. This is already the project's stated intent and is validated as technically correct: adding a new `host_permissions` entry disables the extension for all existing users pending re-approval, so isolating it minimizes the blast radius. The remaining five features carry zero permission changes and zero breaking changes to existing behavior. Every default is set to preserve backward compatibility (includeAverages defaults to true, dark mode follows the OS automatically, empty state only shows after storage resolves).

The primary implementation risk is dark mode: the existing codebase sets colors via JavaScript inline styles (`element.style.color = "#d32f2f"`), which have higher CSS specificity than any `@media` query and cannot be overridden without a prior CSS custom properties refactor. The keyboard shortcut conflict (`Ctrl+Shift+T` is Chrome's reserved "reopen closed tab") is a silent failure — the manifest compiles cleanly but the shortcut never triggers. Both are well-understood and easily avoided with the patterns documented in this research.

## Key Findings

### Recommended Stack

TrackPull's existing stack — TypeScript compiled with esbuild, Chrome MV3 APIs, zero production dependencies — remains unchanged for v1.5. No new libraries, no new build tooling, no new frameworks are needed. All six features are implementable with APIs already in use or standard browser/CSS capabilities.

**Core technologies (new for v1.5):**
- `commands` manifest key (MV3): Keyboard shortcut via `_execute_action` — no TypeScript listener needed; manifest-only change; no new permissions
- `@media (prefers-color-scheme: dark)` CSS: Dark mode matching system theme — pure CSS, no JavaScript, no new storage key, reads OS preference automatically
- `chrome.storage.local` (new key `includeAverages`): Export format toggle persistence — one additive key with default `true` to preserve existing behavior; no schema migration
- HTML `<details>/<summary>` element: Prompt preview disclosure widget — standard DOM, no library, fits popup layout constraints better than a modal overlay

### Expected Features

**Must have (table stakes for v1.5):**
- Dark mode matching system theme — users with OS dark mode expect all UI to adapt; a white popup in dark mode is an obvious oversight
- Empty state guidance replacing "0 shots" dead end — a bare zero count gives users no actionable path; standard UX requires a positive, instructional message
- Keyboard shortcut to open popup — power users expect keyboard access; clicking the toolbar icon every time is unnecessary friction

**Should have (differentiators):**
- Export format toggle (include/exclude averages and consistency rows) — advanced users doing their own analysis do not want summary rows mixed with shot-level data
- Prompt preview before AI launch — builds user trust that the correct prompt and data will be sent; valuable for large sessions where data volume is not obvious

**Verify first, then ship:**
- Gemini AI launch — `AI_URLS["Gemini"]` already exists in popup.ts and Gemini is already in the HTML select; the only remaining action is confirming the URL is correct and adding the host_permissions entry in an isolated release

**Defer to v1.6+:**
- Manual dark mode toggle (user-controlled independent of OS) — adds unnecessary complexity over system-match; revisit only if users request it
- Gemini content script injection for URL pre-fill — requires host_permissions and is brittle against Gemini's SPA architecture; clipboard-first is the correct permanent approach
- User-configurable shortcut picker in extension UI — Chrome's `chrome://extensions/shortcuts` already provides this natively for all extensions

### Architecture Approach

All six features integrate into existing files with no new modules required. The architecture is purely additive. The shared modules (csv_writer.ts, prompt_builder.ts, tsv_writer.ts, unit_normalization.ts, interceptor.ts, bridge.ts) require zero changes. The core data capture pipeline is untouched.

**Major components and what changes:**
1. `src/manifest.json` — Gemini `host_permissions` entry + keyboard shortcut `commands` block (manifest-only, two additive fields)
2. `src/popup/popup.html` — dark mode CSS media query, empty state element, export toggle checkbox, prompt preview widget (HTML and CSS additions)
3. `src/popup/popup.ts` — extend `updateExportButtonVisibility()` for empty state; add `updatePromptPreview()` function; wire export toggle persistence (function extension + one new function; no new imports)
4. `src/options/options.html` — dark mode CSS media query only
5. `src/background/serviceWorker.ts` — read `includeAverages` from storage in `EXPORT_CSV_REQUEST` handler, pass to `writeCsv()` (one-line parameter change; `includeAverages` param already exists in csv_writer.ts)
6. `src/shared/constants.ts` — add `INCLUDE_AVERAGES` to STORAGE_KEYS (one additive constant)

### Critical Pitfalls

1. **`Ctrl+Shift+T` keyboard shortcut is silently overridden by Chrome's "Reopen closed tab"** — The manifest compiles without error, the shortcut appears in `chrome://extensions/shortcuts`, but pressing it reopens a tab instead of opening the popup. Use `Ctrl+Shift+Y` / `Command+Shift+Y` instead. Chrome's native browser shortcuts always take priority; extensions cannot override them.

2. **Dark mode is broken by JavaScript inline styles** — `element.style.color = "#d32f2f"` (used in `showStatusMessage()` and toast creation) has higher CSS specificity than any `@media` query. A `prefers-color-scheme` overlay alone produces a dark background with bright light-mode status text. Mitigation: refactor all JS color assignments to CSS class additions that use `var(--color-*)` custom properties, then write the media query.

3. **Gemini host_permissions addition disables the extension for all existing users pending re-approval** — Chrome's permission change detection triggers a re-prompt when any new host is added to `host_permissions`. The extension is disabled until the user explicitly re-approves. Ship Gemini host_permissions as its own isolated release with clear release notes.

4. **Empty state guidance flashes briefly on every popup open before storage resolves** — `chrome.storage.local.get` is async. Showing the empty state before the promise resolves means it displays momentarily even when the user has data. Show the empty state only after the storage read completes and the result is confirmed null.

5. **Export toggle has no effect if not threaded through the service worker's storage read** — The export flow crosses a message boundary (popup sends `EXPORT_CSV_REQUEST`; service worker handles it and calls `writeCsv()`). The `includeAverages` preference must be read by the service worker from `chrome.storage.local`, not passed via message payload. Service worker already reads all other export preferences (speed unit, distance unit, surface) from storage — add `STORAGE_KEYS.INCLUDE_AVERAGES` to that same `storage.local.get` call.

## Implications for Roadmap

Build order is driven by two hard constraints: (1) Gemini host_permissions must ship in isolation because it triggers a user-facing re-approval prompt; (2) dark mode CSS must be established before other UI elements are added so new elements inherit dark styles in a single pass.

### Phase 1: Manifest Changes (Isolated Release)

**Rationale:** Gemini host_permissions is the only v1.5 change that disables the extension for existing users on update. Isolating it to its own release limits blast radius and gives users a clear signal about what changed. The keyboard shortcut `commands` block carries no permission prompt and can be bundled here since it is also manifest-only with no user impact.
**Delivers:** Gemini confirmed as a working AI service option; keyboard shortcut declared and testable in `chrome://extensions/shortcuts`
**Addresses:** Gemini AI launch support, keyboard shortcut (manifest entry)
**Avoids:** Pitfall V2 (permission re-prompt mixed with unrelated features), Pitfall V1 (wrong shortcut key — use Ctrl+Shift+Y), Pitfall V8 (no onCommand listener needed for `_execute_action`)
**Research flag:** Not needed — manifest-only; Chrome Commands and host_permissions APIs are well-documented

### Phase 2: Dark Mode CSS Foundation

**Rationale:** Dark mode must be built before the other four UI features add HTML elements to popup.html. Building dark mode first means each subsequent phase naturally includes dark mode styles for new elements in the same pass, rather than requiring a retroactive audit.
**Delivers:** Popup and options page automatically switch to dark palette when OS dark mode is active; no user action required
**Uses:** CSS custom properties refactor (`:root` color variables) + `@media (prefers-color-scheme: dark)` media query blocks in popup.html and options.html
**Avoids:** Pitfall V3 (JS inline styles bypass the CSS cascade — CSS variable refactor is the prerequisite step), Pitfall V7 (dynamically created toast elements need explicit dark mode class overrides)
**Research flag:** Not needed — CSS approach is well-documented and verified against Chrome extension popup behavior

### Phase 3: Empty State Guidance

**Rationale:** Self-contained, zero dependencies on other v1.5 features. Minor change to one existing function and one new HTML element. Quick win after the heavier dark mode work.
**Delivers:** Users opening the popup with no data see "Open a Trackman report to capture shots" instead of a bare "0"
**Implements:** Extend `updateExportButtonVisibility()` to toggle a new `#empty-state` div; add dark mode styles for the new element (already have the media query in place from Phase 2)
**Avoids:** Pitfall V6 (empty state must display only after storage read resolves — implement as a three-state model: loading / no-data / has-data)
**Research flag:** Not needed — implementation path is trivial and fully traced through existing code

### Phase 4: Export Format Toggle

**Rationale:** Requires coordination across four files (constants.ts, popup.html, popup.ts, serviceWorker.ts). Comes after simpler phases so popup.ts and popup.html modifications are consolidated. Storage key and default value must be established before wiring the UI.
**Delivers:** Checkbox in popup letting users export raw shot data only or include averages/consistency rows; state persists across sessions
**Uses:** `chrome.storage.local` (new `includeAverages` key, default `true`); `writeCsv()` `includeAverages` param (already exists — zero changes to csv_writer.ts)
**Avoids:** Pitfall V5 (use `?? true` not `=== false` to handle absent storage key), Pitfall V9 (service worker must read preference from storage directly, not rely on popup to pass it in the message)
**Research flag:** Not needed — storage and message patterns are established in the existing codebase

### Phase 5: Prompt Preview

**Rationale:** Goes last among UI features to consolidate all popup.ts changes into one editing pass. Uses only existing imports (`assemblePrompt`, `writeTsv`) and existing cached data variables — zero new dependencies. Building after export toggle means popup.ts is opened only once for both features.
**Delivers:** Collapsible `<details>/<summary>` disclosure widget in popup showing assembled prompt + data text before clicking "Open in AI"
**Uses:** Existing `assemblePrompt()` from prompt_builder.ts, existing `cachedData` / `cachedUnitChoice` / `cachedSurface` already in popup.ts module scope
**Avoids:** Pitfall V4 (full modal overlay exceeds 600px popup height limit — use `<details>/<summary>` with `max-height: 120px; overflow-y: auto` textarea, not `position:fixed` overlay)
**Research flag:** Not needed — implementation path is fully clear from source inspection; `<details>/<summary>` is the standard pattern for space-constrained popups

### Phase Ordering Rationale

- Manifest first because Gemini host_permissions must be isolated from all other changes to limit the re-approval prompt blast radius
- Dark mode second because it creates the CSS foundation that all subsequent UI phases build on without requiring a second pass
- Empty state third because it is the simplest UI change and validates the three-state display logic before more complex phases
- Export toggle fourth because it spans multiple files and requires the storage key to be established before the UI is wired
- Prompt preview last to consolidate popup.ts edits; stable popup layout from prior phases means no layout retrofitting

### Research Flags

No phases require `/gsd:research-phase` during planning. All research was completed in this round with HIGH confidence across all six features. The Chrome MV3 APIs in use are official and well-documented; the implementation paths are all traced through actual source code, not inferred.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Zero new dependencies; all APIs are official Chrome MV3 or standard CSS/HTML; verified against official documentation |
| Features | HIGH | Features directly specified in PROJECT.md; implementation paths traced through actual source code inspection; no speculative features |
| Architecture | HIGH | Based on direct source code inspection of all files in `src/`; no assumptions about function signatures or file layout |
| Pitfalls | HIGH | Shortcut conflict verified against official Chrome Commands docs; dark mode inline style problem verified against CSS cascade specification; permission re-prompt behavior documented against official Chrome permission model |

**Overall confidence:** HIGH

### Gaps to Address

- **Gemini URL verification:** `AI_URLS["Gemini"] = "https://gemini.google.com"` already exists in popup.ts. Before Phase 1 ships, manually verify this URL lands on the Gemini chat input and not a marketing page or redirect. Low risk — 30-second manual check.
- **Dark mode color audit scope:** The complete set of CSS classes and JS inline style assignments requiring dark mode overrides must be inventoried from the actual source files at implementation time. Research identifies the pattern and key known instances (showStatusMessage, toast creation) but implementation should begin with a full audit pass through popup.ts, popup.html, options.ts, and options.html.
- **Popup current rendered height:** The 600px Chrome popup height cap is a hard limit. Research estimates current popup height at approximately 400-450px, leaving adequate headroom for the prompt preview `<details>` widget. Verify by measuring the actual built popup before committing to the preview widget's expanded height.
- **Keyboard shortcut final key selection:** STACK.md and FEATURES.md both recommend `Ctrl+Shift+Y` / `Command+Shift+Y`; PITFALLS.md also suggests `Ctrl+Shift+G` as a "G for Golf" mnemonic alternative. Both are technically correct. The roadmapper should make a final call and be consistent across all files.

## Sources

### Primary (HIGH confidence)
- Chrome Tabs API Reference — `chrome.tabs.create` requires no host_permissions for URL-only tab creation: https://developer.chrome.com/docs/extensions/reference/api/tabs
- Chrome Commands API Reference — `_execute_action` syntax, modifier key rules, shortcut conflicts: https://developer.chrome.com/docs/extensions/reference/api/commands
- Chrome Declare Permissions Reference — host_permissions re-prompt behavior on extension update: https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions
- MDN prefers-color-scheme — CSS media query specification: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme
- w3c/webextensions issue #242 — Chrome propagates OS `prefers-color-scheme` consistently to extension popup and options pages: https://github.com/w3c/webextensions/issues/242
- Chrome keyboard shortcuts reference — Ctrl+Shift+T / Cmd+Shift+T reserved as "Reopen closed tab": https://support.google.com/chrome/answer/157179
- Direct source code inspection — all TypeScript and HTML files in `src/` read and analyzed for function signatures, storage patterns, and color assignments
- csv_writer.ts lines 134-161 — `includeAverages` param already gates both Average and Consistency rows; no csv_writer.ts changes needed for v1.5

### Secondary (MEDIUM confidence)
- elliot79313/gemini-url-prompt GitHub — confirmed Gemini requires content script injection for URL pre-fill; no native URL parameter support: https://github.com/elliot79313/gemini-url-prompt
- Google AI Developers Forum — no official Google confirmation of native Gemini URL pre-fill; community workarounds only: https://discuss.ai.google.dev/t/can-the-gemini-api-enable-a-website-to-open-the-gemini-site-with-a-text-prompt-pre-filled-by-that-website/73828
- NN/g — Designing Empty States — positive phrasing + single actionable step UX pattern: https://www.nngroup.com/articles/empty-state-interface-design/
- CSS light-dark() function — available Chrome 123+ as a single-declaration alternative to separate media query blocks: https://medium.com/front-end-weekly/forget-javascript-achieve-dark-mode-effortlessly-with-brand-new-css-function-light-dark-2024-94981c61756b

### Tertiary (LOW confidence)
- AI service URL stability — `gemini.google.com`, `chat.openai.com`, `claude.ai` URLs are undocumented product URLs subject to change without notice; must be verified manually at implementation time

---
*Research completed: 2026-03-02*
*Ready for roadmap: yes*
