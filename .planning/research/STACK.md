# Stack Research

**Domain:** Chrome Extension v1.3 — Clipboard export and AI prompt launch additions
**Researched:** 2026-03-02
**Confidence:** HIGH for Chrome API patterns (verified against official docs); MEDIUM for AI service URL behavior (verified via community + security research, but subject to third-party change)

---

## Context: Narrowly Scoped Additions

TrackPull already has a validated, no-production-dependency stack (TypeScript + esbuild + Chrome APIs). This document covers ONLY what is new for v1.3:

1. Clipboard write from popup
2. Opening AI service tabs (ChatGPT, Claude, Gemini) with data pre-filled
3. Options page for prompt template management
4. chrome.storage for prompt templates

Do not re-research or change anything about interceptor, CSV generation, unit conversion, or the build system.

---

## Recommended Stack

### Core Technologies (New for v1.3)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `navigator.clipboard.writeText()` | Web API (no version) | Write tab-separated data to system clipboard | The popup is an extension page — not a service worker — so the Web Clipboard API is accessible directly. Add `"clipboardWrite"` permission to manifest. No offscreen document needed. Zero dependencies. |
| `chrome.tabs.create({ url })` | Built-in Chrome API | Open ChatGPT, Claude, or Gemini in a new tab | No permission needed for basic tab creation (tabs permission only required for reading sensitive tab properties like url/title). Called from popup directly. |
| `options_ui` manifest field | Manifest V3 | Declare options page for prompt management | MV3 deprecated `options_page`; use `options_ui` with `open_in_tab: true` to open the options page as a full tab (not embedded in chrome://extensions). |
| `chrome.storage.local` | Built-in Chrome API | Persist prompt templates and default AI preference | Use `local` not `sync`: sync has an 8 KB per-item limit and 100 KB total quota — a user with 7+ prompt templates hits this easily. Local has 10 MB quota with no per-item limit. |
| `chrome.runtime.openOptionsPage()` | Built-in Chrome API | Open options page from popup with one call | No manual URL construction needed. Works regardless of how options page was declared. Called from popup "Manage prompts" link. |

---

### Clipboard Implementation Pattern

**Where the write happens: popup.ts (extension page context, not service worker)**

The popup runs in an extension page, which has DOM access and a trusted origin. `navigator.clipboard.writeText()` works there without offscreen documents. The service worker cannot do clipboard writes directly — but the popup can. Since all new export buttons live in the popup, no architectural complexity is needed.

```typescript
// In popup.ts — direct clipboard write (no message passing needed)
async function copyToClipboard(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}
```

**Manifest addition required:**
```json
"permissions": ["storage", "downloads", "clipboardWrite"]
```

`clipboardWrite` enables writing to clipboard "outside a short-lived event handler for a user action." In practice, the button click IS a user action, so even without this permission the write might succeed. But declare it anyway — it makes the intent explicit and avoids intermittent failures.

Do NOT add `clipboardRead` — TrackPull never reads from clipboard.

---

### AI Tab Launch Implementation Pattern

**How to open AI services: `chrome.tabs.create` from popup**

None of the three AI services (ChatGPT, Claude.ai, Gemini) provide a reliable, official URL parameter for pre-filling and auto-submitting prompts. The approach that works reliably across all three is:

1. Write the prompt + data to clipboard (`navigator.clipboard.writeText`)
2. Open the AI service URL in a new tab (`chrome.tabs.create`)
3. Show a toast in the popup: "Prompt copied to clipboard — paste it in the chat"

This works because the user is already expecting to interact with the AI; one Ctrl+V is not friction.

**What does NOT work reliably as of 2026-03:**

| Service | Parameter | Status |
|---------|-----------|--------|
| ChatGPT (`chatgpt.com`) | `?q=` or `?prompt=` | Pre-fills but **auto-submits** the prompt (security risk, no user review). Behavior subject to change without notice. OpenAI added `sec-fetch-site` protections in 2025. |
| Claude.ai | `?q=` | Removed as of October 2025. No replacement. |
| Gemini (`gemini.google.com`) | None native | No native URL parameter support. Third-party extensions required. |

**Conclusion:** Do not depend on URL parameters. Clipboard + tab open is the only approach that works reliably across all three services today and will continue working regardless of third-party changes.

```typescript
// In popup.ts
const AI_URLS: Record<string, string> = {
  chatgpt: "https://chatgpt.com/",
  claude:  "https://claude.ai/new",
  gemini:  "https://gemini.google.com/app",
};

async function launchAI(service: string, promptText: string): Promise<void> {
  await navigator.clipboard.writeText(promptText);
  await chrome.tabs.create({ url: AI_URLS[service] });
  showToast("Prompt copied — paste it in the chat", "success");
}
```

No permission additions needed for `chrome.tabs.create` beyond what already exists.

---

### Options Page Setup

**Manifest declaration:**
```json
"options_ui": {
  "page": "options.html",
  "open_in_tab": true
}
```

Use `open_in_tab: true` (full tab) rather than embedded (`false`) because:
- Embedded options in chrome://extensions has limited viewport; prompt text areas need space
- Full-tab options is simpler to style (no iframe constraints)
- Prompt management is a deliberate workflow, not a quick toggle

**Build script addition:** Add one esbuild line for `options.ts`:
```bash
npx esbuild src/options/options.ts --bundle --outfile="$DIST_DIR/options.js" --format=iife
cp src/options/options.html "$DIST_DIR/options.html"
```

**No new permissions required** for the options page itself.

---

### Prompt Template Storage Schema

Store prompts in `chrome.storage.local` under a new key. Keep separate from `trackmanData` to avoid accidental clears.

```typescript
// Extend STORAGE_KEYS in constants.ts
PROMPT_TEMPLATES: "promptTemplates",
DEFAULT_AI_SERVICE: "defaultAiService",
```

```typescript
// Prompt template shape
interface PromptTemplate {
  id: string;           // UUID or timestamp-based
  name: string;         // Display name, e.g. "Distance Gapping"
  tier: "beginner" | "intermediate" | "advanced" | "custom";
  body: string;         // The prompt text (can be 2-4 KB)
  builtIn: boolean;     // true = shipped in extension, false = user-created
}
```

Built-in prompts ship as a TypeScript constant (compiled into the bundle). User-created prompts go into `chrome.storage.local`. This avoids the options page needing to load built-ins from storage on every open — they are always present in memory.

---

## Supporting Libraries (Still Zero Production Dependencies)

No new production dependencies are needed. All new features use:
- `navigator.clipboard.writeText()` — Web API
- `chrome.tabs.create()` — Chrome built-in
- `chrome.storage.local` — Chrome built-in
- `chrome.runtime.openOptionsPage()` — Chrome built-in
- Vanilla TypeScript DOM manipulation for options page UI

The zero-production-dependency constraint is maintained.

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Clipboard write | `navigator.clipboard.writeText()` from popup | Offscreen document + `CLIPBOARD` reason | Offscreen is needed only when the service worker must write to clipboard. The popup is an extension page with direct clipboard access. Offscreen adds 2 extra files and message-passing complexity for no benefit. |
| Clipboard write | `navigator.clipboard.writeText()` | `document.execCommand('copy')` | `execCommand` is deprecated. MDN marks it as not recommended. Only use as fallback if navigator.clipboard fails (e.g. focus lost). |
| AI tab pre-fill | Clipboard + toast | URL `?prompt=` parameter | URL params are unreliable: Claude removed theirs, Gemini has none, ChatGPT auto-submits (no user review). Clipboard approach works identically for all three, forever. |
| AI tab pre-fill | Clipboard + toast | Content script injection into AI page | Would require host_permissions for chatgpt.com, claude.ai, and gemini.google.com — adds privacy surface, requires user permission grants, and violates Chrome Web Store policies if injecting into unrelated pages. |
| Options page | `options_ui` (open_in_tab: true) | `options_ui` (open_in_tab: false, embedded) | Embedded options are too cramped for prompt text areas. Full tab is appropriate for a content management workflow. |
| Prompt storage | `chrome.storage.local` | `chrome.storage.sync` | Sync has 8 KB per-item, 100 KB total limit. A golf prompt with context + instructions can reach 2-3 KB. With 7+ built-ins plus user templates, sync quota is easily hit. Local has 10 MB. |
| Built-in prompts | Compiled TypeScript constant | Fetched from remote URL | MV3 prohibits remotely-hosted code. Prompts must be compiled into the bundle. They already exist as markdown files in the repo — convert body text to a TS constant at build time. |

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `clipboardRead` permission | TrackPull only writes to clipboard, never reads. This permission displays "Read data you copy and paste" warning to users — unnecessarily alarming and unused. | Omit — only add `clipboardWrite` |
| `tabs` permission | Only needed for reading url/title/favIconUrl from tab objects. `chrome.tabs.create()` does not need it. Adding it displays "Read your browsing history" warning — a major trust signal for users. | Omit — `chrome.tabs.create` works without it |
| `host_permissions` for AI services | Would be required for content script injection into chatgpt.com etc. Not needed for the clipboard approach. | Omit — clipboard + tab open requires no host_permissions |
| `offscreen` permission + document | Only needed when service worker must clipboard-write. Popup handles all clipboard writes directly. | `navigator.clipboard.writeText()` in popup |
| React / Preact for options page | Options page is a list + textarea + buttons. Vanilla TypeScript handles this in ~150 lines. Adding a UI framework adds a production dependency and bundle size for no benefit at this complexity level. | Vanilla TypeScript DOM manipulation |
| UUID library for template IDs | `crypto.randomUUID()` is available natively in all modern Chrome versions (Chrome 92+, well within MV3 support window). | `crypto.randomUUID()` built-in |
| IndexedDB | Overkill for a flat list of prompt templates. `chrome.storage.local` handles arrays of objects natively. | `chrome.storage.local` |

---

## Stack Patterns by Variant

**If clipboard write from popup fails (edge case: focus lost before API call):**
- Fallback to `document.execCommand('copy')` using a temporary textarea
- Detect failure via Promise rejection, not silent failure
- Show user-friendly toast: "Copy failed — click the button again while the popup is focused"

**If user wants prompts synced across Chrome profiles:**
- Consider splitting storage: preferences (sync) vs templates (local)
- Default AI service preference (a small string) fits in sync easily
- Prompt templates stay in local regardless
- This is a nice-to-have, not v1.3 scope

**If a fourth AI service is added later:**
- AI_URLS is a plain record — add one entry
- No architecture change needed
- Service picker in popup is already planned as a dropdown

---

## Manifest Changes Summary

The full manifest.json diff for v1.3 is:

```json
{
  "permissions": ["storage", "downloads", "clipboardWrite"],
  "options_ui": {
    "page": "options.html",
    "open_in_tab": true
  }
}
```

Two additions:
1. `"clipboardWrite"` in permissions
2. `"options_ui"` block pointing to `options.html`

No new host_permissions. No content_scripts additions.

---

## Version Compatibility

| API | Availability | Notes |
|-----|-------------|-------|
| `navigator.clipboard.writeText()` | Chrome 66+ | Extension pages (popup, options) have reliable access. Requires `clipboardWrite` permission for calls outside user gesture. |
| `chrome.tabs.create()` | All MV3 Chrome versions | No permissions needed for URL-only tab creation. |
| `chrome.runtime.openOptionsPage()` | Chrome 42+ | Works with both `options_page` and `options_ui` declaration. |
| `options_ui` with `open_in_tab: true` | Chrome 40+ MV3 supported | `options_page` deprecated in MV3 — `options_ui` is the correct field. |
| `crypto.randomUUID()` | Chrome 92+ | Safe to use — MV3 requires Chrome 88+, and any extension running MV3 is well above Chrome 92. |
| `chrome.storage.local` (10 MB quota) | Chrome 113+ | Extended from 5 MB to 10 MB in Chrome 113. All current Chrome versions are above 113. |

---

## Sources

- Chrome Offscreen API Reference — https://developer.chrome.com/docs/extensions/reference/api/offscreen (HIGH confidence, official; confirmed CLIPBOARD reason and permission requirements)
- Chrome Tabs API Reference — https://developer.chrome.com/docs/extensions/reference/api/tabs (HIGH confidence, official; confirmed tabs.create needs no permission for basic URL open)
- Chrome Permissions Reference — https://developer.chrome.com/docs/extensions/reference/permissions-list (HIGH confidence, official; confirmed clipboardWrite purpose and warning text)
- Chrome Storage API Reference — https://developer.chrome.com/docs/extensions/reference/api/storage (HIGH confidence, official; confirmed sync 8 KB/item vs local 10 MB)
- Offscreen Documents Blog Post — https://developer.chrome.com/blog/Offscreen-Documents-in-Manifest-v3 (HIGH confidence, official; service worker clipboard limitation confirmed)
- ChatGPT URL parameter security research — https://de.tenable.com/security/research/tra-2025-22 (MEDIUM confidence; confirms `?q=` auto-submission and OpenAI's sec-fetch-site protections)
- ChatGPT URL prompt community thread — https://community.openai.com/t/url-query-param-to-open-chat-with-initial-message/64167 (MEDIUM confidence; reliability issues with parameter confirmed by multiple developers)
- Claude.ai ?q= parameter removal — GitHub issue #8827 anthropics/claude-code (MEDIUM confidence; removal reported as of October 2025)
- Gemini URL parameter support — Google AI Developers Forum discussion (MEDIUM confidence; confirmed no native support, only third-party extensions)
- chrome.storage.sync quota — confirmed via Chrome Storage API docs, December 2025 update (HIGH confidence, official)
- options_ui vs options_page in MV3 — WebSearch + MDN options_ui reference (MEDIUM confidence; options_page confirmed deprecated in MV3 by parcel issue and Chrome docs)

---

*Stack research for: TrackPull v1.3 — Clipboard export and AI prompt launch*
*Researched: 2026-03-02*
