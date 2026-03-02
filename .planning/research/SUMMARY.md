# Project Research Summary

**Project:** TrackPull v1.3 — Clipboard Export and AI Prompt Launch
**Domain:** Chrome Extension (MV3) — golf data export tool
**Researched:** 2026-03-02
**Confidence:** HIGH for Chrome API mechanics; MEDIUM for AI service URL behavior

## Executive Summary

TrackPull v1.3 adds two new export surfaces to an already mature, zero-dependency Chrome extension: clipboard copy (tab-separated, paste-ready for Sheets/Excel) and AI prompt launch (open ChatGPT, Claude, or Gemini with session data and a pre-selected golf analysis prompt). The recommended approach is extension-native and conservative: use `navigator.clipboard.writeText()` directly from the popup context, open AI tabs with `chrome.tabs.create()`, bundle 8 pre-written golf prompts as TypeScript constants, and store user preferences in `chrome.storage.local`. No new production dependencies are required. The existing TypeScript + esbuild + vitest + zero-dependency stack is fully preserved.

The primary design risk is treating AI URL pre-fill as a reliable mechanism. Claude removed its `?q=` parameter in October 2025; Gemini has no native URL support; ChatGPT's `?q=` is undocumented and community-discovered. The correct architecture is clipboard-first: copy the prompt+data to clipboard, open the AI service homepage, and show a toast instructing the user to paste. URL pre-fill for ChatGPT may be offered as a degradable enhancement but must never be the primary path. This design means the entire AI launch feature is implementable today with zero dependency on third-party URL behavior.

A secondary risk is context confusion around Chrome APIs. `navigator.clipboard.writeText()` is a Web Platform API requiring a document context — it must live in the popup, not the service worker. Prompt templates must use `chrome.storage.local` (10 MB quota), not `chrome.storage.sync` (8 KB per-item, 100 KB total). These decisions must be made at architecture time, not discovered during debugging. The build order constraint is also firm: foundation modules (prompt_types, tsv_writer, prompt_builder) must exist before any popup UI work begins.

## Key Findings

### Recommended Stack

TrackPull v1.3 requires no new production dependencies. All new capabilities are built on Chrome built-in APIs and the Web Platform. The manifest gains exactly two additions: `"clipboardWrite"` permission and an `"options_ui"` block pointing to `options.html`. The build script gains one esbuild entry point for `options.ts`. No host permissions are added. The `"tabs"` permission must not be added — `chrome.tabs.create()` does not require it, and adding it would trigger a "Read your browsing history" warning that erodes user trust.

**Core technologies (new for v1.3):**
- `navigator.clipboard.writeText()`: Clipboard write from popup — accessible in extension page context; no offscreen document needed
- `chrome.tabs.create({ url })`: AI service tab launch — no additional permissions required beyond existing manifest
- `chrome.storage.local`: Prompt template storage — 10 MB quota, no per-item limit (use instead of storage.sync for template bodies)
- `chrome.storage.sync`: User preferences only — default AI service preference (a single small string) fits within sync quota
- `chrome.runtime.openOptionsPage()`: Open options page from popup — no manual URL construction needed
- `options_ui` with `open_in_tab: true`: Full-tab options page — avoids embedded mode API limitations and layout constraints
- `crypto.randomUUID()`: Template ID generation — built-in, available Chrome 92+, no UUID library needed

### Expected Features

The 8 pre-existing golf prompt `.md` files in `/prompts/` should be compiled into a TypeScript constant array (`BUILTIN_PROMPTS`) in `src/models/prompt_types.ts`. This is content packaging, not engineering, and unlocks the primary v1.3 differentiator: domain-specific AI analysis out of the box with no user setup.

**Must have (table stakes for v1.3):**
- Tab-separated clipboard copy with single button click — users expect paste-readiness in Sheets/Excel without a file download
- Visual confirmation toast after clipboard copy — users cannot see the clipboard; feedback is mandatory
- Open AI service tab (ChatGPT, Claude) — one-click launch is the stated value prop of the milestone
- Prompt + data delivered via clipboard, tab opened to AI homepage, toast prompts user to paste
- Built-in golf prompt library (8 prompts, beginner/intermediate/advanced tiers) — core differentiator; content already written

**Should have (v1.3 polish, after core ships):**
- Copy prompt+data to clipboard without opening a tab — corporate device users and users with existing AI sessions
- Default AI service preference stored in `chrome.storage.sync` — skip service selection for repeat users
- Skill-tier UI grouping in popup dropdown — beginner/intermediate/advanced grouping, already structured in filesystem

**Defer to v1.4:**
- Custom prompt templates + options page CRUD — higher complexity, options page scaffolding justifies its own milestone
- Gemini support — requires `host_permissions` for `gemini.google.com`, which triggers update permission prompt for existing users; isolate this change
- Prompt preview panel — nice-to-have UI, adds surface complexity; defer until AI launch pattern is validated

### Architecture Approach

The existing five-layer architecture (MAIN world interceptor → ISOLATED world bridge → service worker → popup → storage) is entirely unchanged. v1.3 adds one new entry point (options page), three new shared modules, and modifies popup.ts to wire up the new buttons. The clipboard write and AI tab launch both originate from popup.ts directly and require no service worker involvement. Built-in prompts live as source constants; only user-created custom prompts are written to storage.

**Major components (v1.3 additions):**
1. `src/models/prompt_types.ts` (NEW) — PromptTemplate interface, AiService type, BUILTIN_PROMPTS constant array; no dependencies
2. `src/shared/tsv_writer.ts` (NEW) — pure function: SessionData → tab-separated string; testable with vitest; same shape as csv_writer.ts
3. `src/shared/prompt_builder.ts` (NEW) — pure functions: assemble prompt+data payload, resolve AI service URL; fully testable
4. `src/options/options.ts` + `options.html` (NEW) — prompt template CRUD UI, default AI service setting (v1.4 scope)
5. `src/popup/popup.ts` + `popup.html` (MODIFIED) — clipboard button, prompt selector dropdown, AI service selector, AI launch button, "Manage prompts" link
6. `src/shared/constants.ts` (MODIFIED) — add `STORAGE_KEYS.PROMPT_TEMPLATES`, `STORAGE_KEYS.DEFAULT_AI_SERVICE`
7. `manifest.json` (MODIFIED) — add `clipboardWrite` permission, add `options_ui` block
8. Build script (MODIFIED) — add esbuild step for `options.ts → options.js`

**Build order (enforced by dependency graph):**
Foundation (prompt_types → tsv_writer → prompt_builder) → Constants → Clipboard popup changes → AI launch popup changes → Options page

### Critical Pitfalls

1. **Clipboard write in service worker always fails** — `navigator.clipboard` is unavailable in service workers; route clipboard writes through popup.ts directly, never via message-passing to the service worker. This is the single most likely architectural mistake.

2. **Async focus loss before clipboard write** — If popup loses focus between storage read and `writeText()` call, Chrome throws `DOMException: Document is not focused`. Pre-fetch and format TSV data on popup load; fire `writeText()` synchronously in the click handler using cached data, not inside an async storage fetch triggered by the click.

3. **AI URL pre-fill designed as primary mechanism** — Claude's `?q=` parameter was removed October 2025; Gemini has no native support; ChatGPT's is undocumented. Clipboard-first must be the primary design. URL pre-fill is enhancement-only for ChatGPT and must degrade gracefully (open page, show paste toast) when the parameter is ignored.

4. **Prompt templates in chrome.storage.sync** — sync quota is 8 KB per item, 100 KB total. A golf prompt at 2-3 KB with 7+ built-ins exceeds this ceiling. Use `chrome.storage.local` for all prompt template bodies. Only small preference values (default AI service string) belong in sync.

5. **clipboard.writeText race with chrome.tabs.create** — Popup auto-closes when a new tab opens. If `chrome.tabs.create()` fires before the clipboard Promise resolves, the write is aborted and the clipboard is empty. Always `await` the clipboard write, show the toast, then open the tab with a brief pause so the user sees the toast.

## Implications for Roadmap

The dependency graph and pitfall map together suggest three phases: a shared foundation, the clipboard+AI core features, and a deferred options page.

### Phase 1: Foundation Modules

**Rationale:** Two of the three new popup features (clipboard copy and AI launch) share `tsv_writer.ts` and `prompt_builder.ts`. Building these pure shared modules first, with unit tests, creates a verified foundation before any UI work begins. The built-in prompt catalog (`prompt_types.ts`) must exist before anything in the popup can reference prompts. No Chrome API involvement in this phase means it is fully testable and entirely safe to build first.

**Delivers:** `prompt_types.ts` with built-in catalog; `tsv_writer.ts` with vitest coverage; `prompt_builder.ts` with vitest coverage; updated `constants.ts` with new storage keys.

**Addresses:** Built-in prompt library (FEATURES.md P1), establishes TSV formatting and prompt assembly as tested shared modules.

**Avoids:** TSV data containing tabs/newlines (PITFALLS.md Pitfall 10) — addressed by a unit test with edge-case string values in this phase.

**Research flag:** Standard patterns — skip phase research. Pure TypeScript functions with no Chrome API surface; well-documented domain.

### Phase 2: Clipboard Copy and AI Launch

**Rationale:** With foundation modules in place, the popup UI changes for both clipboard copy and AI launch can be built in one phase. They share the same data flow (read storage → format → dispatch), the same toast feedback pattern, and the same pre-fetch-on-load strategy. Delivering them together avoids two separate rounds of popup.ts/popup.html modification. This is the v1.3 headline release.

**Delivers:** Clipboard "Copy to Clipboard" button with TSV output and toast feedback; prompt selector dropdown (built-in prompts, skill-tier grouped); AI service selector (ChatGPT, Claude); "Open in AI" button with clipboard-first delivery and paste toast; default AI service preference in `chrome.storage.sync`; manifest changes (`clipboardWrite`, `options_ui`).

**Addresses:** All P1 features from FEATURES.md (clipboard copy, clipboard feedback, built-in prompt library UI, AI launch for ChatGPT and Claude, copy prompt+data without tab).

**Avoids:**
- Clipboard in service worker (PITFALLS.md Pitfall 1) — write happens in popup.ts click handler.
- Async focus loss (PITFALLS.md Pitfall 2) — data pre-fetched on popup load, write is synchronous in handler.
- AI URL pre-fill as primary (PITFALLS.md Pitfall 3) — clipboard-first design; URL param is enhancement only for ChatGPT.
- URL payload size (PITFALLS.md Pitfall 4) — URL carries prompt template text only if used; data always via clipboard.
- Race condition clipboard vs. tab open (PITFALLS.md Pitfall 8) — `await` clipboard write, show toast, then open tab.
- "tabs" permission added unnecessarily (PITFALLS.md Pitfall 9) — `chrome.tabs.create()` requires no tabs permission.

**Research flag:** Standard patterns — skip phase research. All Chrome APIs verified; clipboard-first design eliminates dependency on AI service URL behavior.

### Phase 3: Options Page and Custom Prompts (v1.4)

**Rationale:** Custom prompt CRUD requires a new page, a separate esbuild entry point, and a more complex storage pattern (`chrome.storage.local` for template bodies). Splitting this into its own milestone isolates the `options_ui` manifest addition from the core v1.3 features and allows v1.3 to ship without options page complexity. The popup will show a "Manage prompts" link that opens the options page once it exists.

**Delivers:** Full-tab options page (`options.ts` + `options.html`) with prompt CRUD; create/edit/delete for custom prompts; built-in prompts visible, not editable; auto-save with 500ms debounce to prevent data loss on navigate-away; build script update for `options.ts`.

**Uses:** `chrome.storage.local` for template bodies (verified via STACK.md and PITFALLS.md), `chrome.storage.sync` for preference values only, `chrome.runtime.openOptionsPage()` from popup.

**Avoids:**
- Built-in prompts in storage (PITFALLS.md Pitfall 6) — built-ins are source constants; storage holds only user-created templates.
- Sync quota exceeded (PITFALLS.md Pitfall 5) — all template bodies go to `chrome.storage.local`.
- Options page tab-open in embedded mode (PITFALLS.md Pitfall 7) — using `open_in_tab: true` eliminates this class of issue.
- Options page losing unsaved changes (PITFALLS.md Pitfall 12) — auto-save on input with debounce.

**Research flag:** Light research recommended during planning. Confirm auto-save debounce interaction with `chrome.storage.local` concurrent writes; verify the `open_in_tab: true` option page is accessible from `chrome.runtime.openOptionsPage()` (confirmed HIGH confidence in STACK.md).

### Phase 4: Gemini Support (v1.4+)

**Rationale:** Gemini requires adding `gemini.google.com` to `host_permissions`, which triggers a permission update prompt for all existing users. Isolating this to its own release minimizes disruption and prevents permission anxiety from overshadowing the core AI launch feature. Gemini also requires a content script for DOM injection since it has no native URL parameter support.

**Delivers:** Gemini as a selectable AI service in the popup; content script on `gemini.google.com` that injects prompt text via simulated DOM input events after page load.

**Uses:** New `host_permissions` entry; content script in ISOLATED world targeting `gemini.google.com`.

**Research flag:** Needs research at implementation time. Gemini's frontend may change between now and when this phase is scheduled. Verify the content script injection approach against the live Gemini interface before designing the implementation.

### Phase Ordering Rationale

- Foundation modules first: both clipboard and AI launch depend on `tsv_writer.ts` and `prompt_builder.ts`; building them in isolation with full test coverage prevents regressions when popup changes land.
- Clipboard and AI launch together in Phase 2: they share the same data flow, the same pre-fetch pattern, and the same popup modifications; delivering them separately would require two rounds of popup.ts churn.
- Options page deferred: custom prompt CRUD is UI-heavy and has no blockers on v1.3 value delivery; isolating it prevents scope creep from delaying the headline features.
- Gemini last: host permissions addition should never be bundled with a feature release; isolate it to manage the user update experience.

### Research Flags

Phases with standard, well-documented patterns (skip research-phase):
- **Phase 1 (Foundation Modules):** Pure TypeScript functions, no Chrome APIs; fully testable; no research needed.
- **Phase 2 (Clipboard and AI Launch):** All Chrome APIs verified via official docs; clipboard-first design removes dependency on undocumented AI service URLs.

Phases that may benefit from research during planning:
- **Phase 3 (Options Page):** Auto-save interaction with storage writes; confirm `open_in_tab: true` behavior. Low risk, light research only.
- **Phase 4 (Gemini):** Content script injection approach requires live verification at implementation time. Gemini frontend may change.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All new APIs verified against official Chrome docs; zero-dependency constraint confirmed maintainable; version compatibility table in STACK.md |
| Features | HIGH | Table stakes are clear; differentiator (prompt library) is pre-existing content in repo; anti-features are well-reasoned with concrete alternatives |
| Architecture | HIGH | Based on direct source code inspection + official MV3 docs; all integration boundaries are explicit; build order is verified against component dependency graph |
| Pitfalls | HIGH for MV3 mechanics; MEDIUM for AI URLs | Chromium issue tracker verified clipboard/service worker constraints; AI URL stability is inherently MEDIUM-to-LOW |

**Overall confidence:** HIGH for the implementation plan; MEDIUM specifically for ChatGPT `?q=` URL pre-fill stability (undocumented, subject to change without notice).

### Gaps to Address

- **Claude `?q=` parameter removal:** Reported via a single indirect GitHub issue reference (October 2025). Before shipping AI launch, verify current behavior manually by opening `claude.ai/new?q=test` in a browser. Expected outcome: no pre-fill, confirming clipboard-only approach is the correct design. Low-effort, high-value verification.

- **ChatGPT `?q=` auto-submit behavior:** Community sources confirm `?q=` both pre-fills AND auto-submits without user review. Decision needed: offer URL pre-fill for ChatGPT as an enhancement, or default to clipboard-only for consistency across all services. Research recommendation is clipboard-only (simpler, consistent, no auto-submit risk). Flag this during Phase 2 planning.

- **Storage choice discrepancy:** STACK.md recommends `chrome.storage.local` for prompt templates; ARCHITECTURE.md Pattern 4 initially describes `chrome.storage.sync` for preferences then corrects to local for template bodies. This is internally consistent — sync for preferences, local for template bodies — but the wording is worth clarifying in the constants.ts storage key comments during Phase 1.

- **Gemini support timing:** Content script approach requires live verification at implementation time. Do not research or plan Gemini until Phase 3 (options page) is shipped and Gemini's frontend state can be verified.

## Sources

### Primary (HIGH confidence)
- Chrome Offscreen API Reference — confirmed popup does NOT need offscreen document for clipboard writes
- Chrome Tabs API Reference — confirmed `chrome.tabs.create` requires no `tabs` permission for URL-only tab creation
- Chrome Storage API Reference — confirmed sync (8 KB/item, 100 KB total) vs local (10 MB) quotas; Chrome 113+ for 10 MB
- Chrome Permissions Reference — confirmed `clipboardWrite` purpose; `tabs` permission warning text
- Chromium Issue Tracker #40738001 — confirmed service workers cannot use `navigator.clipboard`
- Chrome for Developers — options page declaration (`options_page` vs `options_ui`)
- Project source code inspection: `src/` directory — existing architecture baseline and component boundaries

### Secondary (MEDIUM confidence)
- treyhunner.com — ChatGPT and Claude `?q=` URL parameters confirmed (third-party, cross-verified with OpenAI community)
- OpenAI community thread — ChatGPT `?q=` auto-submit behavior and undocumented status
- elliot79313/gemini-url-prompt GitHub — Gemini content script injection approach confirmed
- Tenable security research TRA-2025-22 — ChatGPT `?q=` auto-submission and `sec-fetch-site` protections
- zenn.dev MV3 clipboard pitfalls article — real-world clipboard extension pitfall patterns
- Andy's Golf Blog / AmateurGolf — real-world golf AI prompt patterns; paste workflow is standard user behavior

### Tertiary (LOW confidence)
- GitHub issue reference (indirect) — Claude `?q=` parameter removal October 2025; single source, needs manual verification before shipping Phase 2
- Gemini URL Prompt Chrome Web Store extension — no native URL support; injection-only; single source

---
*Research completed: 2026-03-02*
*Ready for roadmap: yes*
