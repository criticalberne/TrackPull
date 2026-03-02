# Feature Research

**Domain:** Golf data scraping and export Chrome extension (Trackman report data)
**Researched:** 2026-03-02
**Confidence:** HIGH for clipboard (official Chrome docs verified); MEDIUM for AI launch (URL parameters verified via multiple sources, but Gemini native support unconfirmed)

---

## Milestone Scope

This document covers **v1.3 features only**: clipboard copy (tab-separated) and AI prompt launch (ChatGPT, Claude, Gemini). It extends the prior feature research and supersedes it for these two domains.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that are non-negotiable for the clipboard/AI milestone. Missing these makes the feature feel broken or half-done.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Copy data to clipboard with a single button click | Copy buttons are universal in data tools; users expect immediate paste-readiness without file management | LOW | `navigator.clipboard.writeText()` from popup context; no offscreen doc needed since popup has DOM access |
| Visual confirmation after clipboard copy | Users cannot see the clipboard; they need confirmation that the copy succeeded ("Copied!" toast or button state change) | LOW | Extension already has a `showToast()` pattern — reuse it; button text swap (Copy → Copied!) is the dominant pattern |
| Tab-separated format for clipboard data | Google Sheets and Excel interpret tab-separated text as multi-column paste; CSV-with-commas in a single cell is useless | LOW | `\t` delimiter between fields, `\n` between rows; same column ordering as CSV export |
| Copy includes headers | Users need column names to know what they pasted | LOW | First row = column headers, same as CSV |
| Open AI service in new tab with data + prompt | One-click launch is the whole value prop; anything requiring manual copying defeats it | LOW | `chrome.tabs.create({ url })` — no extra permissions needed beyond what already exists |
| Pre-fill AI prompt with session data + analysis prompt | Users expect the AI tab to open ready-to-use, not requiring further setup | MEDIUM | URL `?q=` parameter works for ChatGPT (`chatgpt.com/?q=`) and Claude (`claude.ai/new?q=`); Gemini requires a helper content script to fill the input box |
| Support ChatGPT and Claude natively | These are the two services with confirmed URL pre-fill support; covering both satisfies the vast majority of users | LOW | ChatGPT: `https://chatgpt.com/?q=ENCODED_PROMPT`; Claude: `https://claude.ai/new?q=ENCODED_PROMPT` — both pre-fill AND auto-submit on page load |

---

### Differentiators (Competitive Advantage)

Features that go beyond bare-bones clipboard/AI launch and create a meaningfully better experience.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Built-in golf analysis prompt library (7+ prompts) | Lowers the barrier from "I have data" to "I have a specific question answered" — users do not know how to prompt an LLM for golf analysis | LOW | 8 prompts already exist in `/prompts/` directory across beginner/intermediate/advanced tiers; bundling them is content packaging, not engineering |
| Skill-tier organization (beginner / intermediate / advanced) | Users self-select their context; a beginner asking a shaft-flex question gets a different prompt than an advanced fitter | LOW | Already structured in filesystem; expose as UI grouping in prompt picker |
| Copy prompt+data to clipboard (no tab launch) | Users on corporate devices can't open new tabs freely, or prefer to paste into an existing AI chat | LOW | Same implementation path as data-only clipboard; just prepend the prompt text |
| Custom prompt templates (create and save) | Power users have bespoke analysis workflows that don't match any built-in prompt | MEDIUM | `chrome.storage.sync` for small templates (8 KB/item limit); `chrome.storage.local` if prompt text is large; CRUD UI in options page |
| Default AI service preference with per-launch override | Users who always use ChatGPT should not have to pick it every time | LOW | `chrome.storage.sync` stores `defaultAIService`; popup shows override buttons |
| Prompt preview before launch | User can see what will be sent before the tab opens; builds trust that the data+prompt is correct | LOW | Expandable textarea in popup showing assembled prompt+data; read-only |
| Gemini support via content script injection | Gemini has no native URL pre-fill; a content script on `gemini.google.com` can inject the prompt after navigation | MEDIUM | Content script listens for URL parameter `?q=` on Gemini domain, injects text via simulated input events; requires adding `gemini.google.com` to `host_permissions` |
| Prompt management in options page | Popup is too cramped for full CRUD; options page is the correct location for create/edit/delete of custom prompts | MEDIUM | New `options.html` + `options.ts`; add `"options_page"` entry to manifest |

---

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Direct AI API integration (send data to OpenAI/Anthropic API) | Seems more seamless than opening a tab | Requires API key management, storage, and billing handling; fundamentally changes the product from a data tool to an AI client; security surface area grows dramatically; violates zero-dependency model | Open tab approach: user's own AI account handles billing and context; TrackPull stays stateless |
| Auto-submit the prompt without user review | Saves one keypress | Auto-submission bypasses user's chance to review what is being sent, especially for large data payloads; AI services may also rate-limit or block automated submissions | Pre-fill + focus: user presses Enter themselves; keeps human in the loop |
| Prompt versioning / changelog | Power users want to track prompt iterations | Scope creep into a prompt management product; storage complexity grows; not relevant to most users | Simple overwrite-on-save is sufficient; document notable prompt improvements in release notes |
| Streaming AI response in the extension popup | "Inline AI" seems premium | Requires direct API integration (see above) plus a complex streaming UI in a constrained popup; popup has no persistent state between closes | Use the AI service's native chat UI — it is better than anything we could build in a 400px popup |
| Rich text / Markdown formatting in prompt templates | Users want styled prompts | Prompt templates are plain text sent to an LLM; markdown in the template is interpreted by the LLM, not rendered — plain textarea is appropriate | Encourage LLM-flavored markdown within the prompt text itself (headers, lists) since LLMs handle it natively |
| Prompt sharing / community library | Social feature for sharing prompts | Requires backend, moderation, user accounts — shatters the privacy-safe, no-backend architecture | The 8 built-in prompts serve this purpose; users who want community prompts use prompt-sharing sites like PromptBase |

---

## Feature Dependencies

```
[AI Tab Launch]
    └──requires──> [Data formatted as CSV string] (already exists in export pipeline)
    └──requires──> [Prompt selected from library or custom] ──requires──> [Prompt library bundled in extension]

[Copy Prompt+Data to Clipboard]
    └──requires──> [AI Tab Launch] (same assembly logic; different output destination)

[Custom Prompt Templates]
    └──requires──> [chrome.storage.sync] (already declared in manifest)
    └──requires──> [Options page] ──requires──> [options.html + options.ts + manifest entry]

[Gemini Support]
    └──requires──> [Content script on gemini.google.com]
    └──requires──> [host_permissions: "https://gemini.google.com/*"]
    (independent of ChatGPT/Claude support — those need no new permissions)

[Default AI Service Preference]
    └──enhances──> [AI Tab Launch] (skips service picker)
    └──requires──> [chrome.storage.sync] (already available)

[Prompt Preview]
    └──enhances──> [AI Tab Launch] (read-only preview of assembled output)
    └──requires──> [Prompt assembly logic] ──requires──> [Prompt library bundled]
```

### Dependency Notes

- **ChatGPT and Claude AI launch require no new permissions.** `chrome.tabs.create()` requires no extra permission declaration; the URL pre-fill uses native query parameters. This is the fastest path to working AI launch.
- **Gemini requires new host permissions.** Adding `gemini.google.com` to `host_permissions` triggers a permission prompt on extension update. This is a real UX cost. Treat Gemini support as a separate deliverable after ChatGPT + Claude ship.
- **Clipboard write from popup is simple.** Popup HTML has document context — `navigator.clipboard.writeText()` works directly with the `clipboardWrite` permission added to manifest. No offscreen document needed because clipboard is triggered from user interaction in the popup.
- **Custom prompts depend on options page.** The popup is too space-constrained for full prompt CRUD. Options page is a separate surface that must be scaffolded before custom prompts can be exposed.
- **Built-in prompts have no code dependencies.** Bundling the 8 existing `.md` prompt files as a TypeScript constant (or imported JSON) has zero architecture impact. Do this first.

---

## MVP Definition

The v1.3 milestone scope is pre-defined in `PROJECT.md`. This section maps that scope to a build order based on dependencies and risk.

### Launch With — v1.3 Core (do first)

Minimum viable clipboard + AI that delivers the promised value.

- [ ] **Tab-separated clipboard copy** — Low complexity, standalone, immediately useful; requires adding `clipboardWrite` permission to manifest
- [ ] **Copy feedback (toast / button state)** — Without it, users do not know if the copy worked; reuse existing `showToast()` pattern
- [ ] **Built-in prompt library bundled in extension** — 8 prompts already written; compile to TypeScript constant; no new architecture
- [ ] **AI tab launch for ChatGPT** — Confirmed URL: `https://chatgpt.com/?q=ENCODED`; no new permissions; fastest AI launch to ship
- [ ] **AI tab launch for Claude** — Confirmed URL: `https://claude.ai/new?q=ENCODED`; no new permissions; pairs with ChatGPT naturally

### Add After Core Ships — v1.3 Polish

Once the above is working end-to-end, add UX refinements.

- [ ] **Copy prompt+data to clipboard** — Adds the clipboard alternative to tab launch; same assembly logic, different output destination
- [ ] **Default AI service preference** — `chrome.storage.sync` write/read; simple preference UI in popup
- [ ] **Skill-tier UI for prompt selection** — Group built-in prompts by tier in popup dropdown/menu

### Defer to v1.4 — Higher Complexity

- [ ] **Custom prompt templates + options page** — Needs new page scaffolding; worth its own milestone
- [ ] **Gemini support** — New host permissions = update permission prompt for existing users; isolate this change
- [ ] **Prompt preview panel** — Nice-to-have; adds UI surface complexity; defer until AI launch pattern is validated

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Tab-separated clipboard copy | HIGH | LOW | P1 |
| Clipboard copy feedback | HIGH | LOW | P1 |
| Built-in prompt library (8 prompts) | HIGH | LOW | P1 |
| AI launch → ChatGPT | HIGH | LOW | P1 |
| AI launch → Claude | HIGH | LOW | P1 |
| Copy prompt+data to clipboard | HIGH | LOW | P1 |
| Default AI service preference | MEDIUM | LOW | P1 |
| Skill-tier prompt UI | MEDIUM | LOW | P2 |
| Prompt preview before launch | MEDIUM | LOW | P2 |
| Custom prompt templates | HIGH | MEDIUM | P2 |
| Options page for prompt management | MEDIUM | MEDIUM | P2 |
| AI launch → Gemini | MEDIUM | MEDIUM | P2 |

**Priority key:**
- P1: Ship in v1.3 core
- P2: Ship in v1.3 polish or v1.4
- P3: Future consideration

---

## Technical Implementation Notes

These are findings that directly affect implementation decisions — not architecture, just constraints that inform how to build.

### Clipboard Copy

- **Context matters.** `navigator.clipboard.writeText()` works in popup context without an offscreen document because the popup has a real document and user interaction. Offscreen documents are only needed for service worker clipboard access.
- **Permission required.** Add `"clipboardWrite"` to `"permissions"` in `manifest.json`. This suppresses the transient activation requirement and allows copy on button click.
- **No new architecture.** Popup → `navigator.clipboard.writeText(tsvString)` → toast confirmation. The TSV string is assembled the same way as CSV, substituting `\t` for `,`.
- Confidence: HIGH (verified against [Chrome offscreen docs](https://developer.chrome.com/blog/Offscreen-Documents-in-Manifest-v3) and [MDN clipboard permissions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Interact_with_the_clipboard))

### AI Tab Launch

- **ChatGPT URL (confirmed):** `https://chatgpt.com/?q=ENCODED_TEXT` — pre-fills AND auto-submits. Verified via [treyhunner.com](https://treyhunner.com/2024/07/chatgpt-and-claude-from-your-browser-url-bar/) and [OpenAI community](https://community.openai.com/t/using-the-q-url-parameters-defaults-the-model-to-gpt4o-even-if-you-explicitly-pass-a-model-via-the-url-using-model/1074025).
- **Claude URL (confirmed):** `https://claude.ai/new?q=ENCODED_TEXT` — pre-fills the input. Verified via [treyhunner.com](https://treyhunner.com/2024/07/chatgpt-and-claude-from-your-browser-url-bar/).
- **Gemini URL (unconfirmed native):** `https://gemini.google.com/app?prompt=ENCODED_TEXT` — works only via a helper extension that injects the text; Gemini itself does not natively parse the query parameter. Requires a content script on `gemini.google.com`. Confidence: MEDIUM ([elliot79313/gemini-url-prompt](https://github.com/elliot79313/gemini-url-prompt) confirms the injection approach).
- **Data payload size.** URL length limits apply. A typical Trackman session (100 shots × 30 metrics) as CSV can be 30–60 KB. This will likely exceed URL length limits (`~2000` chars in some browsers; `~8000` in modern Chrome). **Recommendation:** Send only the prompt text in the URL, and instruct users to paste the data. Or send a truncated summary rather than raw shot data. This is a critical design decision for the AI launch feature.
- **No new permissions for ChatGPT/Claude.** `chrome.tabs.create()` requires no special permission. Verified via [Chrome tabs API docs](https://developer.chrome.com/docs/extensions/reference/api/tabs#method-create).

### Prompt Storage

- **Built-in prompts:** Compile the 8 existing `.md` files into a TypeScript `const BUILTIN_PROMPTS` array. No storage API needed — they ship with the extension bundle.
- **Custom prompts:** `chrome.storage.sync` for cross-device sync; `8 KB` per item limit means prompts must be compact. For longer custom prompts, fall back to `chrome.storage.local` (10 MB limit). `"storage"` permission already declared in manifest.
- Confidence: HIGH (verified via [Chrome storage API docs](https://developer.chrome.com/docs/extensions/reference/api/storage))

---

## Competitor Feature Analysis

| Feature | Table Capture (ext) | Copy as Markdown (ext) | ChatGPT Prompt Link (ext) | TrackPull v1.3 plan |
|---------|---------------------|------------------------|---------------------------|---------------------|
| Clipboard copy | Yes (HTML table → TSV) | Yes (Markdown) | No | Yes (TSV) |
| Format selection | Yes | Yes | N/A | No — TSV only |
| AI tab launch | No | No | Yes (ChatGPT only) | Yes (ChatGPT + Claude + Gemini) |
| Built-in prompts | No | No | No | Yes (8 golf-specific prompts) |
| Custom prompts | No | No | No | Yes (in options page) |
| Copy prompt+data | No | No | No | Yes |
| Domain-specific context | No (generic) | No (generic) | No (generic) | Yes (golf/Trackman) |

**Key insight:** No existing extension combines domain-specific prompt bundling with AI tab launch AND clipboard export. The combination is TrackPull's differentiator in this milestone.

---

## Sources

- [Chrome offscreen documents for clipboard in MV3](https://developer.chrome.com/blog/Offscreen-Documents-in-Manifest-v3) — confirmed popup does NOT need offscreen doc (HIGH confidence)
- [MDN clipboard permissions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Interact_with_the_clipboard) — `clipboardWrite` permission behavior (HIGH confidence)
- [Chrome tabs.create API](https://developer.chrome.com/docs/extensions/reference/api/tabs#method-create) — no permission needed for tab creation (HIGH confidence)
- [treyhunner.com — ChatGPT and Claude from URL bar](https://treyhunner.com/2024/07/chatgpt-and-claude-from-your-browser-url-bar/) — confirmed `?q=` parameter for both services (MEDIUM confidence, third-party verified)
- [OpenAI community — q= URL parameter](https://community.openai.com/t/using-the-q-url-parameters-defaults-the-model-to-gpt4o-even-if-you-explicitly-pass-a-model-via-the-url-using-model/1074025) — ChatGPT `?q=` behavior confirmed (MEDIUM confidence)
- [elliot79313/gemini-url-prompt GitHub](https://github.com/elliot79313/gemini-url-prompt) — Gemini requires content script injection, not native URL params (MEDIUM confidence)
- [Chrome storage API](https://developer.chrome.com/docs/extensions/reference/api/storage) — `storage.sync` limits and `storage.local` fallback (HIGH confidence)
- [Chrome extension permissions list](https://developer.chrome.com/docs/extensions/reference/permissions-list) — `clipboardWrite` permission behavior (HIGH confidence)
- [Andy's Golf Blog — ChatGPT + FlightScope data](https://www.andysgolfblog.co.uk/blog/the-ai-golf-coach-using-chatgpt-to-analyse-your-flightscope-mevo-data/) — real-world golf AI prompt patterns (MEDIUM confidence)
- [AmateurGolf — AI golf analysis](https://www.amateurgolf.com/golf-tournament-news/33236/Can-AI-improve-your-golf-game--My-ChatGPT-and-Foresight-Falcon-test) — user behavior: drag-and-drop CSV or paste is standard workflow (MEDIUM confidence)

---

*Feature research for: TrackPull v1.3 — Clipboard copy and AI prompt launch*
*Researched: 2026-03-02*
*Supersedes clipboard/AI sections of previous FEATURES.md; v1.0–v1.2 feature landscape entries preserved in prior version*
