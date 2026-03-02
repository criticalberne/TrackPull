# Pitfalls Research

**Domain:** Chrome Extension (MV3) — Clipboard Export and AI Prompt Tab Launch
**Researched:** 2026-03-02
**Confidence:** HIGH for MV3 clipboard mechanics (official docs + Chromium issue tracker verified); HIGH for AI URL pre-fill status (multiple community sources, cross-verified); MEDIUM for options page patterns (official docs, single source); LOW for AI service URL stability (undocumented, subject to change without notice)

---

## Critical Pitfalls

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
The developer designs the "AI tab launch" feature assuming that opening `https://chatgpt.com/?q=<prompt>` or `https://claude.ai/?q=<prompt>` will reliably pre-fill the prompt field. This was community-discovered URL behavior, not an official API. These URLs break silently when the AI provider updates their frontend. The tab opens but the prompt field is empty, and the user has no idea why.

**Why it happens:**
There is no official ChatGPT, Claude, or Gemini URL API for pre-filling prompts. ChatGPT's `?q=` parameter was identified by the community and works as of early 2026, but OpenAI has no obligation to maintain it. Claude's equivalent (`claude.ai/new?q=`) was removed in October 2025. Gemini has no native URL parameter support — browser extensions that appear to support it work by injecting content scripts that simulate DOM input events after the page loads.

**How to avoid:**
Design the feature around **clipboard copy as the primary delivery mechanism**, not URL pre-fill. The user flow should be:

1. User selects AI service (ChatGPT / Claude / Gemini)
2. Extension copies prompt+data to clipboard
3. Extension opens the AI service URL (the bare homepage, no query params)
4. User pastes with Cmd+V in the chat input

This flow is robust against frontend changes at AI providers because it uses no undocumented APIs. URL pre-fill can be offered as a "try it" enhancement for ChatGPT where the `?q=` param currently works, but it must degrade gracefully (open the page, show "prompt copied — paste to proceed" message) when the URL param is ignored.

If URL pre-fill is implemented:
- ChatGPT: `https://chatgpt.com/?q=<encoded_prompt>` — works as of early 2026, LOW confidence in stability
- Claude: No URL parameter works as of 2025 (removed October 2025)
- Gemini: No native URL parameter — requires content script injection to simulate input

**Warning signs:**
- AI tab opens but chat field is empty with no error.
- Users report that the AI launch "used to work" after a provider UI update.
- A provider changelog mentions "new chat interface" or "redesigned input".

**Phase to address:**
AI tab launch design phase. Decide the delivery model before implementation: clipboard-first with optional URL pre-fill, not URL pre-fill as primary.

---

### Pitfall 4: Prompt + Data Payload Exceeds URL Length Limits for Tab Launch

**What goes wrong:**
The developer encodes the full prompt template + full TSV shot data into a URL query parameter and opens it with `chrome.tabs.create({ url: ... })`. A Trackman session with 200 shots × 29 metrics produces ~50-80 KB of TSV data. URL-encoded, this far exceeds practical limits. The `chrome.tabs.create()` call may succeed (Chrome supports URLs up to 2 MB technically), but the AI provider's server or frontend rejects or truncates the oversized URL, delivering a garbled or empty prompt.

**Why it happens:**
It seems natural to encode everything into the URL for a one-step launch. But URL encoding inflates data size (spaces become `%20`, etc.), and AI provider frontends are not designed to receive megabytes of data as URL parameters. HTTP servers typically enforce limits of 8 KB–64 KB on query strings.

**How to avoid:**
Never put the full shot data into the URL. The URL pre-fill pattern (where it works) should contain only the prompt template text — a few hundred characters at most. The shot data always goes through the clipboard. The recommended flow is: copy prompt+data to clipboard, open AI tab to homepage, user pastes.

If URL pre-fill is used for the prompt text only (no data embedded), keep the prompt template short. The 7 built-in golf prompts should be designed to be terse instructions — the data comes from clipboard paste, not URL embedding.

**Warning signs:**
- `chrome.tabs.create()` with a URL argument longer than 2,000 characters.
- AI chat field shows a truncated or garbled prompt.
- Developer using `encodeURIComponent(csvContent + promptText)` to build the URL.

**Phase to address:**
AI tab launch implementation phase. Establish upfront: URL carries prompt template only (if anything); data always travels via clipboard.

---

### Pitfall 5: Storage Quota Exceeded When Saving Many Custom Prompt Templates to chrome.storage.sync

**What goes wrong:**
The developer stores user-created prompt templates in `chrome.storage.sync` to sync across devices. `chrome.storage.sync` has a hard limit of 8,192 bytes (8 KB) per item and 102,400 bytes (100 KB) total across all items. A single verbose custom prompt template can easily be 1–3 KB of text. With 7 built-in prompts stored alongside user-created prompts, the total easily approaches or exceeds 100 KB. Writes fail silently if the quota is exceeded (`chrome.runtime.lastError` is set but not user-visible), leaving the user's prompt template unsaved with no feedback.

**Why it happens:**
Developers choose `chrome.storage.sync` because it sounds like the right choice for "user settings." But sync storage was designed for small configuration values (booleans, short strings), not multi-kilobyte text templates. The quota is extremely tight for prompt libraries.

**How to avoid:**
Use `chrome.storage.local` for prompt templates, not `chrome.storage.sync`. `chrome.storage.local` has a 10 MB default quota — sufficient for hundreds of prompts. Only store small, singular configuration values (like the default AI service preference, a single string) in `chrome.storage.sync`.

Storage separation:
- `chrome.storage.local` — prompt templates (built-in + custom), shot session data
- `chrome.storage.sync` — user preferences: default AI service, unit preferences

Never store the prompt text bodies in `chrome.storage.sync`.

**Warning signs:**
- `chrome.runtime.lastError: QUOTA_BYTES_PER_ITEM quota exceeded` when saving a prompt.
- User's custom prompt template disappears after saving (write failed).
- Developer using `chrome.storage.sync.set({ prompts: allPromptTemplates })` — storing all prompts as one object.

**Phase to address:**
Prompt storage design phase. Establish the storage split (local vs. sync) in the data model before writing any storage code.

---

## Moderate Pitfalls

### Pitfall 6: Built-In Prompts Bundled as Storage Writes Bloat Local Storage and Conflict With User Edits

**What goes wrong:**
On extension install, the service worker writes all 7 built-in prompts into `chrome.storage.local`. On update, it overwrites them again — wiping any user modifications to the default prompts. Alternatively, if built-in prompts are never written and only exist in source code, reading them requires different code paths than reading user-created prompts (inconsistent API).

**How to avoid:**
Do not store built-in prompts in `chrome.storage.local` at all. Bundle them as static TypeScript constants in the source code. At runtime, merge built-in prompts (from code) with user-created prompts (from storage) in-memory when the popup or options page renders the prompt list. This approach:
- Never overwrites user changes on extension update
- Keeps storage lean (only user-created prompts stored)
- Gives a clean architectural boundary between "shipped content" and "user data"

Pattern:
```typescript
// In source: builtin-prompts.ts
export const BUILTIN_PROMPTS: PromptTemplate[] = [
  { id: 'builtin-beginner-overview', title: 'Beginner Overview', text: '...', tier: 'beginner', builtin: true },
  // ...
];

// At render time:
const userPrompts = await loadUserPrompts(); // from chrome.storage.local
const allPrompts = [...BUILTIN_PROMPTS, ...userPrompts];
```

**Warning signs:**
- `chrome.runtime.onInstalled` handler calling `chrome.storage.local.set({ builtinPrompts: ... })`.
- User reports their edited built-in prompt was reset after an extension update.
- Storage inspection shows duplicate prompt data across both extension source and storage.

**Phase to address:**
Prompt data model design phase, before any storage code is written.

---

### Pitfall 7: Options Page Cannot Open New Tabs Directly — Must Message Service Worker

**What goes wrong:**
The developer writes an options page that, when the user clicks "Test prompt in ChatGPT," calls `chrome.tabs.create()` directly from the options page script. This fails when the options page is configured as an embedded options page (`options_ui` with `open_in_tab: false`), because embedded options pages are not hosted in a tab and do not have access to the full Tabs API.

**How to avoid:**
Route all tab-creation calls through the service worker via `chrome.runtime.sendMessage`. The options page sends a message; the service worker calls `chrome.tabs.create()`. This works regardless of whether the options page is embedded or full-page.

```typescript
// Options page:
chrome.runtime.sendMessage({ type: 'OPEN_AI_TAB', service: 'chatgpt' });

// Service worker:
if (message.type === 'OPEN_AI_TAB') {
  chrome.tabs.create({ url: AI_SERVICE_URLS[message.service] });
}
```

Additionally, the `tabs` permission should be added to manifest.json if the extension needs to open tabs from the service worker. Note this permission addition will trigger Chrome's privilege escalation prompt for existing users (see Pitfall 8 in the base PITFALLS for context), so confirm it is truly necessary before adding it. Alternatively, `chrome.tabs.create` works without the `tabs` permission — it only grants access to tab metadata (URL, title) which is not needed here.

**Warning signs:**
- `chrome.tabs is undefined` or `chrome.tabs.create is not a function` in the options page DevTools console.
- Options page uses `window.open()` as a fallback (this opens outside the extension context and may be blocked).

**Phase to address:**
Options page implementation phase. Decide upfront whether to use embedded or full-page options (full-page avoids this issue), and if embedded, route all tab operations through the service worker.

---

### Pitfall 8: Popup Sends Clipboard + Tab-Open Sequentially — Popup Closes Before Tab Opens

**What goes wrong:**
The developer sequences: (1) write to clipboard, (2) open AI tab. When `chrome.tabs.create()` is called after `navigator.clipboard.writeText()`, the popup may close (Chrome auto-closes the popup when focus shifts to a new tab). If the clipboard write is still in-flight (the Promise hasn't resolved), the popup's document is destroyed mid-operation, aborting the clipboard write. The tab opens but the clipboard is empty or stale.

**How to avoid:**
`await` the clipboard write to completion before calling `chrome.tabs.create()`. The tab open should happen only after the clipboard Promise has fully resolved. Since the popup will close when the tab opens, show any status toast (e.g., "Prompt copied — paste in chat") before opening the tab.

```typescript
copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(promptAndData);
    showToast('Prompt copied — paste in AI chat', 'success');
    // Brief pause so user sees the toast before popup closes
    await new Promise(r => setTimeout(r, 400));
    chrome.tabs.create({ url: aiServiceUrl });
  } catch {
    showToast('Copy failed', 'error');
  }
});
```

**Warning signs:**
- Clipboard is empty or stale after AI tab opens.
- Race condition: works sometimes, fails others.
- Developer calling `chrome.tabs.create()` before `await`ing the clipboard write Promise.

**Phase to address:**
AI tab launch implementation. Write the operation sequence with explicit awaits and verify with manual testing that the clipboard contains the expected content after the tab opens.

---

### Pitfall 9: Manifest Permissions Addition for "tabs" Disables Extension for Existing Users

**What goes wrong:**
Adding `"tabs"` to the `permissions` array in `manifest.json` to support tab opening triggers Chrome's privilege escalation check on extension update. The extension is disabled and existing users see a re-approval prompt. Users who miss the prompt have a broken extension.

**Why it matters here:**
The current manifest has only `"storage"` and `"downloads"`. Adding `"tabs"` for the AI launch feature would be a new required permission.

**How to avoid:**
`chrome.tabs.create()` does **not** require the `"tabs"` permission — it works with no tabs permission. The `"tabs"` permission only grants access to tab metadata (URL, title, favIconUrl for all tabs). For simply opening a new tab to an AI service URL, no additional permissions are needed.

If the feature only opens tabs via `chrome.tabs.create({ url: 'https://chatgpt.com' })`, the current manifest permissions are sufficient. Do not add `"tabs"` to the manifest.

**Warning signs:**
- Developer adding `"tabs"` to manifest because they saw it referenced in documentation alongside `chrome.tabs.create`.
- A manifest diff before release showing new entries in the `permissions` array.

**Phase to address:**
Any phase touching manifest.json. Review the manifest diff as part of every pre-release checklist.

---

## Minor Pitfalls

### Pitfall 10: TSV Formatting Breaks When Shot Data Contains Tabs or Newlines

**What goes wrong:**
Tab-separated values (TSV) use `\t` as the column delimiter. If any shot metric value contains a literal tab character or newline, the TSV is malformed and the spreadsheet import produces garbled rows. Trackman metric values are typically numeric, but string fields (club name, session date, notes) could theoretically contain problematic characters.

**How to avoid:**
When formatting TSV, sanitize string fields: replace `\t` with a space or strip it, and replace `\n`/`\r` with a space. For purely numeric fields no sanitization is needed. Add a dedicated TSV formatting function (analogous to the existing CSV formatter) that applies this sanitization.

**Warning signs:**
- Pasting TSV into Google Sheets produces extra rows or misaligned columns.
- Any string field in the export contains a `\t` or newline character.

**Phase to address:**
Clipboard copy implementation. Write a unit test that verifies TSV output for a session containing edge-case string values.

---

### Pitfall 11: "Copy Prompt + Data" Produces a Payload Too Large for Some AI Services

**What goes wrong:**
Combining a prompt template (200–500 characters) with full TSV shot data (potentially 50–100 KB for large sessions) produces a paste payload that exceeds some AI chat input limits. ChatGPT's web interface supports very large inputs, but there may be practical rendering lag, and some AI services have lower limits.

**How to avoid:**
This is a known limitation to document, not necessarily to engineer around at v1.3. The built-in prompts should include instructions for the model to process large data. If needed in a future phase, offer a "summary data" mode that exports per-club averages only (already produced by the CSV writer) rather than every individual shot. For v1.3: ship with full data, note the limitation, revisit if users report issues.

**Warning signs:**
- User reports AI service shows "message too long" error.
- Paste operation takes multiple seconds due to large clipboard content.

**Phase to address:**
Post-launch follow-up, not a blocking concern for v1.3 unless tested and found to be a consistent failure mode.

---

### Pitfall 12: Options Page State Not Persisted on Close If User Navigates Away Without Explicit Save

**What goes wrong:**
The options page shows a prompt editor. User edits a prompt. User navigates to a different page or closes the options tab without clicking "Save." Changes are lost silently. This is a common UX failure in extension options pages that do not use auto-save.

**How to avoid:**
Use either auto-save (write to storage on every keypress with debounce, ~500ms) or add an explicit unsaved-changes indicator that warns the user before they navigate away (`beforeunload` event). Auto-save is simpler and more reliable for a prompt editor context.

```typescript
promptTextarea.addEventListener('input', debounce(() => {
  savePrompt(currentPromptId, promptTextarea.value);
}, 500));
```

**Warning signs:**
- Options page only saves on a button click with no auto-save fallback.
- No `beforeunload` warning for unsaved changes.
- User reports losing edited prompts.

**Phase to address:**
Options page implementation phase. Decide save strategy (auto-save recommended) before building the editor component.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| URL pre-fill as primary AI delivery mechanism | Feels like one-click magic | Breaks silently whenever AI providers update their frontend; no official API | Never as primary; always implement clipboard-first with URL pre-fill as enhancement |
| Storing built-in prompts in chrome.storage.local on install | Single code path for all prompts | Built-in prompts get overwritten on update, losing user edits | Never — bundle built-ins in source, store only user-created prompts |
| Using chrome.storage.sync for prompt template bodies | Cross-device sync sounds appealing | 8 KB per-item quota; 100 KB total; silently fails on save | Never — use chrome.storage.local for templates |
| Routing clipboard write through service worker | Follows existing message-passing pattern | Service workers have no navigator.clipboard access; always fails | Never — clipboard must live in popup context |
| No toast shown when clipboard write succeeds | Less UI to implement | User doesn't know if copy worked | Never — always show feedback for clipboard operations |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| ChatGPT URL pre-fill | Using `?prompt=` parameter | Use `?q=` parameter; `?prompt=` has not been observed to work |
| Claude URL pre-fill | Using `claude.ai/new?q=` or any URL parameter | No URL pre-fill works on claude.ai as of 2025 — use clipboard delivery only |
| Gemini URL pre-fill | Assuming `?q=` or `?prompt=` works natively | No native support; requires a content script that simulates DOM input events; do not implement in v1.3 |
| chrome.tabs.create | Adding `"tabs"` permission to manifest | Not needed for tab creation; only needed for reading tab metadata |
| Options page embedded mode | Calling chrome.tabs.create() directly from options page script | Route tab creation through service worker via sendMessage |
| navigator.clipboard.writeText | Calling after an async gap from user click | Call within the click handler's synchronous path or immediately after awaiting pre-fetched data |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Formatting TSV on every popup render | Slow popup open for large sessions | Pre-format on popup load once; cache result in memory | Sessions with 300+ shots and 29 metrics (~50 KB output) |
| Storing full prompt list as single chrome.storage.local key | One large read on every popup open | Store prompts indexed by ID; read only what is needed for current view | Libraries with 20+ large custom prompts |
| Rendering full prompt text in popup dropdown | Popup layout performance | Show only title/tier in dropdown; lazy-load full text when prompt is selected | 7+ built-in prompts with long text bodies |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Injecting user-provided prompt text directly into URL without encoding | URL injection breaks the constructed URL or is exploited | Always use `encodeURIComponent()` for any text placed in URL parameters |
| Storing the user's AI service preference in a globally readable storage key without namespace | Minimal risk but good hygiene | Use a namespaced key like `tp_ai_default_service` rather than `default_service` to avoid accidental collisions with other extensions |
| Including raw session data in a URL sent to an AI service | Golf shot data is not sensitive, but sets a bad pattern | Do not embed session data in URLs; clipboard-only delivery keeps data off the wire until the user explicitly pastes it |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No feedback after clicking "Copy to clipboard" | User re-clicks repeatedly thinking it failed | Always show a brief "Copied!" toast for 2 seconds after a successful write |
| AI tab opens and the user doesn't know to paste | User stares at empty AI chat input | Show "Prompt copied — press Cmd+V in the chat input" message in toast before tab opens |
| Prompt dropdown in popup shows full text | Popup is cramped; long prompts break layout | Show title only in dropdown; show first 80 characters as preview in a tooltip or below the dropdown |
| Default AI service is undefined on first use | User clicks launch, nothing happens or gets an error | Default to ChatGPT on first use; surface the setting on first launch |
| Custom prompt edit form requires clicking into options page | High friction for a quick tweak | Allow prompt title/text editing directly in options page without a separate modal |

---

## "Looks Done But Isn't" Checklist

- [ ] **Clipboard copy:** Verify the clipboard actually contains the expected TSV content after clicking "Copy" — check with Cmd+V in a plain text editor, not just a success toast.
- [ ] **AI tab launch:** Verify the tab opens to the correct AI service homepage and the clipboard contains the expected prompt+data — test with each supported service (ChatGPT, Claude, Gemini).
- [ ] **URL pre-fill (if implemented):** Verify the AI chat input is actually pre-filled, not just that the tab opened. Test after an incognito session (not cached state).
- [ ] **Custom prompt save:** Verify the prompt survives popup close and re-open — read from storage, not in-memory cache.
- [ ] **Options page:** Verify prompt list renders correctly after extension update (built-in prompts present, user prompts preserved, no duplicates).
- [ ] **Storage quota:** Verify that adding 10 custom prompts of ~1,000 characters each does not hit storage errors — check `chrome.runtime.lastError` after each write.
- [ ] **Manifest permissions:** Verify that no new required permissions were added that would disable the extension on update — diff `manifest.json` before release.
- [ ] **Build artifacts:** Verify `dist/` contains rebuilt files after any TypeScript change to popup.ts, serviceWorker.ts, or new files — check timestamps.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Clipboard write in service worker fails | LOW | Move write handler to popup.ts; rebuild; no permission changes needed |
| AI URL pre-fill breaks after provider update | LOW | Remove URL pre-fill for that service; update flow to clipboard-only; rebuild; release patch |
| Prompt templates lost due to sync quota exceeded | MEDIUM | Migrate storage key from sync to local; add migration code in onInstalled; rebuild; release patch with user communication |
| Built-in prompts overwriting user edits on update | MEDIUM | Refactor to source-bundled built-ins; write storage migration to restore user edits from backup key; rebuild |
| Options page tab-open fails in embedded mode | LOW | Add sendMessage route to service worker for tab creation; rebuild |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Clipboard in service worker | Clipboard copy implementation | Code review: no clipboard calls in serviceWorker.ts; manual test of copy button |
| Async focus loss on clipboard write | Clipboard copy implementation | Test with popup unfocused during async gap; verify clipboard content after click |
| AI URL pre-fill fragility | AI tab launch design | Design doc must specify clipboard-first; URL pre-fill only as degradable enhancement |
| URL payload too large | AI tab launch implementation | Measure payload size with a 200-shot session; reject any URL over 500 characters |
| Sync quota exceeded for prompts | Prompt storage design | Unit test: attempt to store 20 × 1,000-char prompts; verify no quota error; check storage area is local not sync |
| Built-in prompts overwriting user edits | Prompt data model design | Architecture review: built-ins must be source constants, not storage writes |
| Options page tab-open failure | Options page implementation | Test in embedded mode (open_in_tab: false); verify tab opens |
| Clipboard write before tab close races | AI tab launch implementation | Manual test: verify clipboard content after tab opens; add brief delay and await chain |
| "tabs" permission added unnecessarily | Manifest review (every phase) | diff manifest.json; confirm no new permissions added for tab creation |
| TSV data contains tabs or newlines | Clipboard copy implementation | Unit test TSV formatter with club name containing \t and \n characters |

---

## Sources

- [Offscreen Documents in Manifest V3 — Chrome for Developers](https://developer.chrome.com/blog/Offscreen-Documents-in-Manifest-v3) — confirmed one offscreen document per profile, CLIPBOARD reason, lifecycle management (HIGH confidence)
- [Cannot read clipboard from service worker — Chromium Issue Tracker](https://issues.chromium.org/issues/40738001) — confirmed service workers cannot use navigator.clipboard (HIGH confidence)
- [Interact with the clipboard — MDN Web Extensions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Interact_with_the_clipboard) — clipboardWrite permission behavior, gesture requirements (HIGH confidence)
- [chrome.storage API reference — Chrome for Developers](https://developer.chrome.com/docs/extensions/reference/api/storage) — exact sync quota: 8 KB per item, 100 KB total, 512 items max; 120 writes/min (HIGH confidence)
- [Give users options — Chrome for Developers](https://developer.chrome.com/docs/extensions/develop/ui/options-page) — embedded options page Tabs API limitations, messaging workaround (HIGH confidence)
- [Implementing a Link Copy Extension: Pitfalls of Clipboard API, CSP, and Service Workers — zenn.dev](https://zenn.dev/atani/articles/copy-current-page-as-chrome-extension?locale=en) — real-world clipboard pitfalls: execCommand fallback, CSP issues, service worker routing (MEDIUM confidence)
- [OpenAI Developer Community — URL query param to open chat with initial message](https://community.openai.com/t/url-query-param-to-open-chat-with-initial-message/64167) — ChatGPT ?q= parameter community discovery, no official support (MEDIUM confidence)
- [Claude URL parameter removed — GitHub issue #8827 reference via WebSearch](https://github.com) — claude.ai URL pre-fill removed October 2025 (MEDIUM confidence; indirect)
- [Gemini URL Prompt extension — Chrome Web Store](https://chromewebstore.google.com/detail/gemini-url-prompt) — Gemini has no native URL parameter; extension simulates DOM input events (MEDIUM confidence)
- [async clipboard API not working in Chrome extension offscreen — Google Issue Tracker 41497480](https://issuetracker.google.com/issues/41497480) — offscreen documents cannot use navigator.clipboard due to focus requirements (MEDIUM confidence)
- [clipboard.writeText() user gesture requirement — Chromium Issue 40846300](https://issues.chromium.org/issues/40846300) — focus requirement behavior, clipboardWrite permission interaction (MEDIUM confidence)
- Project source code inspection: `src/manifest.json`, `src/popup/popup.ts`, `src/background/serviceWorker.ts` — existing architecture baseline for compatibility assessment (HIGH confidence)

---
*Pitfalls research for: Chrome Extension (MV3) — Clipboard Export and AI Prompt Tab Launch (TrackPull v1.3)*
*Researched: 2026-03-02*
