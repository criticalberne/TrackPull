# Architecture Research

**Domain:** Chrome Extension — golf data scraping and export (TrackPull)
**Researched:** 2026-03-02
**Confidence:** HIGH (based on direct source code inspection + MV3 official documentation)

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    trackmangolf.com page                             │
│                                                                       │
│  ┌───────────────────────────────────────┐                           │
│  │   MAIN world (interceptor.ts)         │                           │
│  │   - monkey-patches fetch + XHR        │                           │
│  │   - parses StrokeGroups JSON          │                           │
│  │   - scrapes .group-tag DOM elements   │                           │
│  │   - postMessage → window              │                           │
│  └─────────────────┬─────────────────────┘                          │
│                    │ window.postMessage                               │
│  ┌─────────────────▼─────────────────────┐                          │
│  │   ISOLATED world (bridge.ts)          │                           │
│  │   - filters TRACKMAN_SHOT_DATA msgs   │                           │
│  │   - chrome.runtime.sendMessage →      │                           │
│  └─────────────────┬─────────────────────┘                          │
└────────────────────┼────────────────────────────────────────────────┘
                     │ chrome.runtime.sendMessage (SAVE_DATA)
┌────────────────────▼────────────────────────────────────────────────┐
│                SERVICE WORKER (serviceWorker.ts)                      │
│                                                                       │
│   Handles: SAVE_DATA, GET_DATA, EXPORT_CSV_REQUEST                   │
│   Reads: chrome.storage.local → SessionData                          │
│   Triggers: chrome.downloads.download (data URI)                     │
│   Emits: DATA_UPDATED → popup (if open)                              │
└──────────┬───────────────────────────────────────────────────────────┘
           │ chrome.storage.local                  │ chrome.runtime.onMessage
┌──────────▼───────────┐              ┌────────────▼───────────────────┐
│  chrome.storage.local │              │   POPUP (popup.ts)             │
│                       │              │                                 │
│  trackmanData: {}     │◄─────────── │   - shot count display          │
│  speedUnit: string    │             │   - export button               │
│  distanceUnit: string │             │   - clear button                │
│  prompts: [...]       │             │   - unit preference dropdowns   │
│  defaultAiService:str │             │   [v1.3 additions:]             │
│                       │             │   - copy to clipboard button    │
│                       │             │   - AI launch button            │
│                       │             │   - AI service selector         │
└───────────────────────┘             └──────────────┬──────────────────┘
                                                      │ chrome.runtime.openOptionsPage()
                                       ┌──────────────▼──────────────────┐
                                       │   OPTIONS PAGE (options.ts)     │
                                       │   [NEW in v1.3]                 │
                                       │   - prompt template CRUD        │
                                       │   - default AI service setting  │
                                       │   - view/edit built-in prompts  │
                                       └─────────────────────────────────┘

Shared modules (no Chrome API dependencies):
  src/shared/constants.ts          — METRIC_DISPLAY_NAMES, STORAGE_KEYS, CSS selectors
  src/shared/csv_writer.ts         — SessionData → CSV string (single conversion point)
  src/shared/unit_normalization.ts — convertSpeed/Distance/Angle, UnitChoice types
  src/shared/html_table_parser.ts  — DOM table extraction utility
  src/shared/tsv_writer.ts         — [NEW] SessionData → tab-separated string (clipboard)
  src/shared/prompt_builder.ts     — [NEW] assemble prompt + data payload
  src/models/types.ts              — SessionData, ClubGroup, Shot, CaptureInfo, mergeSessionData
  src/models/prompt_types.ts       — [NEW] PromptTemplate, AiService type definitions
```

### Component Responsibilities

| Component | Status | Responsibility | Communicates With |
|-----------|--------|----------------|-------------------|
| interceptor.ts (MAIN) | Unchanged | Monkey-patch fetch/XHR, parse StrokeGroups JSON, scrape .group-tag DOM, build SessionData | bridge.ts via window.postMessage |
| bridge.ts (ISOLATED) | Unchanged | Filter postMessage events, relay SessionData to service worker | serviceWorker.ts via chrome.runtime.sendMessage |
| serviceWorker.ts | Modified | Persist SessionData, handle export (CSV via data URI), respond to popup; add new handlers for prompt storage CRUD | chrome.storage.local, chrome.downloads, popup via onMessage |
| popup.ts | Modified | Display shot count, trigger export/clear, persist unit preferences; add clipboard copy button, AI launch controls, link to options page | serviceWorker.ts via chrome.runtime.sendMessage, chrome.storage.local directly, navigator.clipboard API directly |
| popup.html | Modified | Add clipboard copy button, AI service selector, AI launch button, "Manage prompts" link | — |
| options.ts | New | Prompt template CRUD (add/edit/delete custom, view built-in), default AI service setting | chrome.storage.sync directly (preferences and templates) |
| options.html | New | Full-page UI for prompt management | — |
| tsv_writer.ts | New | Pure function: SessionData → tab-separated string for clipboard | unit_normalization.ts |
| prompt_builder.ts | New | Assemble prompt text + TSV/CSV data into AI payload; resolve AI service URL | prompt_types.ts |
| prompt_types.ts | New | PromptTemplate interface, AiService type, built-in prompt catalog | — |
| csv_writer.ts | Unchanged | Single source-of-truth for SessionData → CSV string with unit conversion | unit_normalization.ts |
| unit_normalization.ts | Unchanged | Type definitions + conversion math for speed/distance/angle | csv_writer.ts, serviceWorker.ts |
| types.ts | Unchanged | SessionData/Shot/ClubGroup interfaces + mergeSessionData() | All components |
| constants.ts | Modified | Add STORAGE_KEYS for prompts and AI service preference | All components |

## Recommended Project Structure

Current structure is sound. v1.3 additions slot into existing folders:

```
src/
├── background/
│   └── serviceWorker.ts           — add: GET_PROMPTS, SAVE_PROMPT, DELETE_PROMPT handlers
├── content/
│   ├── interceptor.ts             — unchanged
│   ├── bridge.ts                  — unchanged
│   └── html_scraping.ts           — unchanged
├── popup/
│   ├── popup.ts                   — add: clipboard button, AI launch, options page link
│   └── popup.html                 — add: new buttons and AI service selector
├── options/                       — NEW folder
│   ├── options.ts                 — prompt template CRUD UI
│   └── options.html               — prompt management page
├── shared/
│   ├── constants.ts               — add: STORAGE_KEYS.PROMPTS, STORAGE_KEYS.DEFAULT_AI
│   ├── csv_writer.ts              — unchanged
│   ├── html_table_parser.ts       — unchanged
│   ├── tsv_writer.ts              — NEW: SessionData → tab-separated values
│   ├── unit_normalization.ts      — unchanged
│   └── prompt_builder.ts          — NEW: prompt + data assembly, AI URL resolver
└── models/
    ├── types.ts                   — unchanged
    └── prompt_types.ts            — NEW: PromptTemplate, AiService types, built-in catalog
```

### Structure Rationale

- **options/:** Parallel to popup/ — same pattern (one .ts + one .html, bundled independently by esbuild)
- **shared/tsv_writer.ts:** Follows the same pure-function pattern as csv_writer.ts — zero Chrome APIs, fully testable with vitest
- **shared/prompt_builder.ts:** Pure function: takes a PromptTemplate + SessionData → returns assembled string (and AI URL); no Chrome APIs, testable
- **models/prompt_types.ts:** Separates prompt-domain types from shot-data types; built-in catalog lives as a const array here

## Architectural Patterns

### Pattern 1: World Separation (existing — must be preserved)

**What:** MAIN world for page API access, ISOLATED world as relay, service worker for Chrome APIs. This is the only way to both intercept fetch/XHR and use chrome.runtime.sendMessage.

**When to use:** Every feature that needs to interact with page data. Never collapse these worlds.

**Trade-offs:** Extra message-passing indirection, but mandatory in MV3.

**Example:**
```typescript
// interceptor.ts (MAIN) — never use chrome.* here
window.postMessage({ type: "TRACKMAN_SHOT_DATA", source: "trackpull-interceptor", data: session }, "*");

// bridge.ts (ISOLATED) — never touch window.fetch here
window.addEventListener("message", (event) => {
  if (event.data?.source !== "trackpull-interceptor") return;
  chrome.runtime.sendMessage({ type: "SAVE_DATA", data: event.data.data });
});
```

### Pattern 2: Service Worker as Single Dispatch Point

**What:** All Chrome API calls (storage, downloads, tabs) go through the service worker. Popup and content scripts send typed messages; the service worker routes them.

**When to use:** Any new feature requiring chrome.storage writes, chrome.downloads, or cross-tab state. Do not call chrome.storage from content scripts.

**Trade-offs:** One file concentrates side effects — easy to audit, but grows as features add. Keep handler logic thin; delegate computation to shared modules.

**Exception for v1.3:** Prompt storage (user preferences and custom templates) uses `chrome.storage.sync` and is read/written directly by popup.ts and options.ts — consistent with the existing pattern where popup reads unit preferences directly from storage. This avoids unnecessary message round-trips for lightweight preference data.

### Pattern 3: Shared Modules as Pure Functions

**What:** csv_writer.ts, unit_normalization.ts, and html_table_parser.ts contain zero Chrome APIs and are testable in vitest without any mocking. New computation logic belongs here.

**When to use:** Any stateless transformation — format conversion, filtering, calculation, rendering to string. If it doesn't need chrome.*, put it in shared/.

**Trade-offs:** Deliberate; keeps the Chrome API surface auditable and keeps test coverage feasible.

**v1.3 additions following this pattern:**
- `tsv_writer.ts` — pure function, same shape as csv_writer.ts
- `prompt_builder.ts` — pure function: (PromptTemplate, SessionData, UnitChoice) → string

### Pattern 4: chrome.storage.local for Session Data, chrome.storage.sync for Preferences

**What:** Session data in `chrome.storage.local` (large, device-specific). User preferences and prompt templates in `chrome.storage.sync` (small, synced across user's Chrome profiles).

**When to use:** Any preference the user would want to carry between devices (AI service choice, custom prompts). Session shot data stays local.

**Trade-offs:** storage.sync has stricter quotas: 100 KB total, 8 KB per item, 512 items. A single PromptTemplate with a 2-4 KB prompt body stays well under the 8 KB limit. A user with 20 custom prompts at 4 KB each uses 80 KB — approaching the 100 KB ceiling. Cap custom prompts at 20 to stay safe, with a warning if the limit is reached.

## Data Flow

### Primary Capture Flow (existing — unchanged)

```
Trackman page loads API data
        ↓
interceptor.ts intercepts fetch/XHR response
        ↓
containsStrokegroups() detection → parseSessionData()
        ↓
waitForTagsThenPost() polls for .group-tag DOM elements (up to 8s)
        ↓
window.postMessage({ type: "TRACKMAN_SHOT_DATA", data: SessionData })
        ↓
bridge.ts receives message → chrome.runtime.sendMessage({ type: "SAVE_DATA" })
        ↓
serviceWorker.ts → chrome.storage.local.set({ trackmanData: SessionData })
        ↓
chrome.storage.onChanged emits → chrome.runtime.sendMessage({ type: "DATA_UPDATED" })
        ↓
popup.ts (if open) receives DATA_UPDATED → updateShotCount()
```

### Export Flow (existing — unchanged)

```
User clicks Export CSV in popup
        ↓
popup.ts → chrome.runtime.sendMessage({ type: "EXPORT_CSV_REQUEST" })
        ↓
serviceWorker.ts → chrome.storage.local.get([trackmanData, speedUnit, distanceUnit])
        ↓
writeCsv(session, true, undefined, unitChoice) — in shared/csv_writer.ts
        ↓
csv_writer applies normalizeMetricValue() with getApiSourceUnitSystem()
        ↓
chrome.downloads.download({ url: "data:text/csv;...base64..." })
        ↓
sendResponse({ success: true, filename })
```

### Clipboard Copy Flow (NEW — v1.3)

```
User clicks "Copy to Clipboard" in popup
        ↓
popup.ts reads SessionData from chrome.storage.local.get (directly, no SW round-trip)
        ↓
popup.ts reads unitChoice from chrome.storage.local
        ↓
writeTsv(session, unitChoice) — pure function in shared/tsv_writer.ts
        ↓
navigator.clipboard.writeText(tsvString)
        ↓
popup.ts shows success toast "Copied to clipboard"
```

**Why popup handles this directly (not via service worker):**
- `navigator.clipboard.writeText` requires a secure context with a DOM — only available in popup pages and options pages, not in service workers.
- The offscreen document workaround is unnecessary because popups are already DOM contexts.
- No `"clipboardWrite"` permission needed when called from a user-initiated click event in a popup (HIGH confidence: Chrome MV3 docs).
- This follows the existing pattern of popup reading unit preferences directly from storage for lightweight read operations.

**Data source for clipboard:** TSV (tab-separated) is preferred over CSV for clipboard because Google Sheets and Excel both interpret paste-from-TSV natively, producing correctly-separated columns without needing a CSV import dialog.

### AI Tab Launch Flow (NEW — v1.3)

```
User selects a prompt from popup dropdown (or uses default)
        ↓
User clicks "Open in AI" (or selects AI service from popup selector)
        ↓
popup.ts reads SessionData from chrome.storage.local.get (directly)
        ↓
popup.ts reads unitChoice from chrome.storage.local
        ↓
writeTsv(session, unitChoice) → tsvString  [shared/tsv_writer.ts]
        ↓
buildPromptPayload(template, tsvString) → fullPromptText  [shared/prompt_builder.ts]
  - assembles: [prompt template text] + "\n\n" + [TSV data block]
        ↓
resolveAiUrl(aiService, fullPromptText) → url  [shared/prompt_builder.ts]
  - ChatGPT:  https://chatgpt.com/?q={encodeURIComponent(fullPromptText)}
  - Claude:   clipboard fallback (URL parameter removed Oct 2025 — LOW confidence, verify)
  - Gemini:   https://gemini.google.com/app?prompt={encodeURIComponent(fullPromptText)}
              (requires Gemini to recognize the ?prompt= param; may need fallback)
        ↓
chrome.tabs.create({ url }) — no "tabs" permission required for creating tabs
        ↓
popup.ts closes (popup closes automatically when user clicks away or tab opens)
```

**Alternative for services without URL param support — Copy + Open:**
```
buildPromptPayload(template, tsvString) → fullPromptText
        ↓
navigator.clipboard.writeText(fullPromptText)   ← copy to clipboard
        ↓
chrome.tabs.create({ url: aiServiceBaseUrl })   ← open AI tab
        ↓
toast: "Prompt copied — paste it in the new tab"
```

This fallback handles Claude (if URL params are broken) and any future service. It is also the explicit "Copy prompt+data to clipboard" feature from the requirements.

**AI Service URL Schemes (confidence assessment):**

| Service | URL Pattern | Native Support | Confidence |
|---------|-------------|----------------|------------|
| ChatGPT | `https://chatgpt.com/?q={prompt}` | YES — confirmed in community docs | MEDIUM (community-sourced, undocumented officially) |
| Claude | `https://claude.ai/new?q={prompt}` | Broken as of Oct 2025 per GitHub issue | LOW — needs verification at build time |
| Gemini | `https://gemini.google.com/app?prompt={prompt}` | NO native support — requires extension-based injection | LOW for direct URL; use clipboard fallback |

**Recommended approach:** Use URL params for ChatGPT. Default to clipboard-copy + open tab for Claude and Gemini, with a popup toast explaining to paste. This is simpler, more reliable, and avoids depending on undocumented URL schemes.

### Prompt Template Storage Flow (NEW — v1.3)

```
Extension installs / first popup open
        ↓
popup.ts checks chrome.storage.sync for "prompts" key
        ↓
If absent → write built-in catalog (from prompt_types.ts) to storage.sync
        ↓
Popup dropdown populated from storage.sync prompts list
```

```
User opens Options page (via "Manage prompts" link in popup)
        ↓
chrome.runtime.openOptionsPage() — opens options.html in new tab
        ↓
options.ts reads chrome.storage.sync → renders prompt list
        ↓
User creates/edits/deletes custom prompt → chrome.storage.sync.set({ prompts: [...] })
        ↓
Popup re-reads storage.sync on next open (no live sync needed for this flow)
```

## Integration Points

### New vs Modified Components

| Component | Change Type | What Changes |
|-----------|-------------|--------------|
| interceptor.ts | None | Content script capture unchanged |
| bridge.ts | None | Bridge relay unchanged |
| serviceWorker.ts | Modified | Add message handlers for prompt CRUD if needed; otherwise prompts live in sync storage accessed directly by popup/options |
| popup.ts | Modified | Add: clipboard button handler, AI launch handler, prompt selector dropdown, AI service selector, "Manage prompts" link |
| popup.html | Modified | Add: new buttons, selects, layout sections |
| options.ts | New | Full prompt management UI |
| options.html | New | Options page markup |
| tsv_writer.ts | New | Pure function: SessionData → TSV string |
| prompt_builder.ts | New | Pure functions: build payload, resolve AI URL |
| prompt_types.ts | New | Types + built-in prompt catalog |
| constants.ts | Modified | Add new STORAGE_KEYS entries |
| manifest.json | Modified | Add `options_page` or `options_ui` field |
| build script | Modified | Add esbuild step for options.ts → options.js |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| MAIN ↔ ISOLATED | window.postMessage (source-filtered) | Unchanged; malicious page postMessages rejected in bridge |
| ISOLATED ↔ Service Worker | chrome.runtime.sendMessage / sendResponse | Unchanged |
| Service Worker ↔ Popup | chrome.runtime.sendMessage + chrome.storage.onChanged | Unchanged |
| Popup ↔ Storage (session data) | chrome.storage.local.get (direct read for clipboard/AI — no SW hop) | Acceptable for read-only; consistent with unit pref pattern |
| Popup ↔ Storage (prompts/AI prefs) | chrome.storage.sync (direct read/write) | Prompts are user prefs, not session data — sync storage is appropriate |
| Options ↔ Storage (prompts/AI prefs) | chrome.storage.sync (direct read/write) | Same as popup for consistency |
| Popup → New Tab | chrome.tabs.create({ url }) | No permission needed for tab creation |
| Popup → Clipboard | navigator.clipboard.writeText() | No clipboardWrite permission needed from popup click event |
| Popup → Options Page | chrome.runtime.openOptionsPage() | Opens options page in new tab |

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Trackman API (trackmangolf.com) | Passive interception — unchanged | Zero auth complexity |
| chrome.downloads | Data URI pattern: `data:text/csv;charset=utf-8,...` | Unchanged |
| chrome.storage.local | Session data blob | Unchanged; 10 MB limit |
| chrome.storage.sync | User prompts + AI service preference | NEW; 100 KB total / 8 KB per item. Cap custom prompts at 20 |
| ChatGPT (chatgpt.com) | `?q=` URL parameter + chrome.tabs.create | MEDIUM confidence — community-documented, not officially stable |
| Claude (claude.ai) | Clipboard fallback recommended | URL param support unreliable as of late 2025; use copy + open pattern |
| Gemini (gemini.google.com) | Clipboard fallback recommended | No native URL param support; injection requires content script we don't have on gemini.google.com |
| Clipboard API | navigator.clipboard.writeText() from popup | Works in popup DOM context; no permission needed for write on user-initiated click |

## Build Order for v1.3 Features

Dependencies determine what must be built first. The two features (clipboard and AI launch) share a common foundation:

```
Phase A — Foundation (shared modules, no UI changes yet)
        │
        ├─ 1. models/prompt_types.ts        (PromptTemplate type + built-in catalog array)
        │      — no dependencies; pure types and data
        │
        ├─ 2. shared/tsv_writer.ts          (SessionData → TSV string)
        │      — depends on: unit_normalization.ts (existing), types.ts (existing)
        │      — testable immediately with vitest
        │
        └─ 3. shared/prompt_builder.ts      (assemble payload, resolve AI URLs)
               — depends on: prompt_types.ts (step 1), tsv_writer.ts (step 2)
               — testable immediately with vitest

Phase B — Storage and Constants
        │
        ├─ 4. shared/constants.ts           (add STORAGE_KEYS.PROMPTS, STORAGE_KEYS.DEFAULT_AI)
        │      — depends on nothing new
        │
        └─ 5. Prompt initialization logic   (where to seed built-ins on first run)
               — recommend: popup.ts reads sync on open; if "prompts" key absent, write built-ins
               — no service worker changes needed for this

Phase C — Clipboard Feature (simpler, no options page dependency)
        │
        └─ 6. popup.ts + popup.html         (add clipboard button → writeTsv → writeText)
               — depends on: tsv_writer.ts (step 2), storage read pattern (existing)
               — can ship independently of AI launch

Phase D — AI Launch Feature
        │
        ├─ 7. popup.ts + popup.html         (add prompt selector, AI service selector, AI launch button)
        │      — depends on: prompt_builder.ts (step 3), prompt_types.ts (step 1)
        │      — can be built on top of Phase C popup changes
        │
        └─ 8. manifest.json + build script  (add options_page, add esbuild step for options.js)
               — needed before options page can be linked

Phase E — Options Page (prompt management)
        │
        └─ 9. options.ts + options.html     (full prompt CRUD UI)
               — depends on: prompt_types.ts (step 1), constants.ts (step 4)
               — depends on: manifest.json update (step 8)
               — can be built last; popup shows prompts correctly even without options page

Rationale for this order:
- Clipboard (Phase C) is independent of AI launch — ships first to get early value
- AI launch (Phase D) builds on clipboard's TSV writer — avoids duplicate code
- Options page (Phase E) is a bonus; popup can list built-ins from catalog without it
- Built-in prompts exist in code (prompt_types.ts) so the extension works immediately
  even if the user never visits the options page
```

## Manifest Changes Required

```json
{
  "permissions": ["storage", "downloads"],
  "options_page": "options.html"
}
```

Use `options_page` (opens in a full tab) rather than `options_ui` (embedded in chrome://extensions). Full tab gives layout freedom for the prompt management UI and allows access to the full Tabs API. The popup links to it via `chrome.runtime.openOptionsPage()`.

No additional permissions are needed:
- Clipboard write from popup: no permission required (user-initiated in DOM context)
- Tab creation: no permission required (chrome.tabs.create for tab creation only)
- storage.sync: covered by existing `"storage"` permission

## Scaling Considerations

This is a single-user browser extension. "Scaling" means graceful behavior with large datasets and many prompt templates.

| Concern | Current State | With v1.3 Features |
|---------|---------------|-------------------|
| Storage — session data | Single session ~50-200 KB | Unchanged; clipboard reads from same blob |
| Storage — prompts | None | 7 built-ins ~1-4 KB each + up to 20 custom = ~100 KB ceiling approached; cap at 20 custom |
| Clipboard payload size | N/A | TSV of 200 shots across 10 clubs ≈ 50-150 KB as string; clipboard has no practical limit for this |
| AI URL length | N/A | chatgpt.com/?q= with 150 KB payload will exceed browser URL limits (~2 MB theoretical, but server-imposed limits vary). For large sessions, clipboard fallback is safer |
| Popup render | Instant | Adding a dropdown of 20-27 prompts adds negligible render time |
| Options page load | N/A | chrome.storage.sync read of <100 KB is instant |

**AI URL length risk:** For large sessions (200+ shots across 10+ clubs), the encoded prompt+data payload can be 50-200 KB. URL-encoding adds overhead. ChatGPT's `?q=` parameter has no documented limit, but very large URLs may be truncated by the browser or rejected by the server. For large payloads, default to the clipboard-copy + open approach rather than URL params.

## Anti-Patterns

### Anti-Pattern 1: Chrome API Calls in MAIN World Content Script

**What people do:** Call `chrome.storage.local.set()` directly from interceptor.ts to skip the bridge.
**Why it's wrong:** Chrome extension APIs are unavailable in MAIN world — they throw at runtime.
**Do this instead:** Keep interceptor.ts free of `chrome.*` calls. All Chrome APIs flow through bridge.ts → serviceWorker.ts.

### Anti-Pattern 2: Storing Derived or Converted Data

**What people do:** Store converted (mph, yards) values in chrome.storage instead of raw API values.
**Why it's wrong:** Unit preference can change after capture. Storing raw values allows re-conversion without re-scraping.
**Do this instead:** Store raw metric values. Apply unit conversion only at export time in tsv_writer.ts or csv_writer.ts.

### Anti-Pattern 3: Logic in the Bridge

**What people do:** Add data transformation, filtering, or merging logic to bridge.ts.
**Why it's wrong:** Bridge is a thin relay — no Chrome APIs, no transformation logic.
**Do this instead:** Bridge relays raw SessionData. All transformation goes in interceptor.ts or serviceWorker.ts / shared/.

### Anti-Pattern 4: Synchronous Storage Calls in Service Worker

**What people do:** Use `localStorage` from the service worker for convenience.
**Why it's wrong:** `localStorage` is not available in MV3 service workers.
**Do this instead:** `chrome.storage.local.get/set` for structured data. Return `true` from `onMessage` handlers that call async storage to keep the response channel open.

### Anti-Pattern 5: Using Offscreen Document for Clipboard

**What people do:** Create an offscreen document with `CLIPBOARD` reason to handle clipboard writes.
**Why it's wrong:** Unnecessary complexity. The popup is already a DOM context where `navigator.clipboard.writeText()` works directly on a user-initiated click event. Offscreen documents are only needed for clipboard access from a service worker.
**Do this instead:** Call `navigator.clipboard.writeText()` directly in the popup's button click handler.

### Anti-Pattern 6: Storing Built-in Prompts in chrome.storage

**What people do:** Write all built-in prompts to storage on first install, treating them like user data.
**Why it's wrong:** Built-ins occupy sync storage quota, cannot be updated when the extension updates (user may have stale built-in text), and blur the line between user data and extension data.
**Do this instead:** Bundle built-in prompts as a constant array in `prompt_types.ts`. At runtime, merge built-ins (from code) with user custom prompts (from storage.sync) to produce the full prompt list. Only custom prompts are written to storage. When the extension updates, built-ins are automatically updated too.

### Anti-Pattern 7: Depending on AI URL Parameters Without a Fallback

**What people do:** Hardcode `chatgpt.com/?q=` or `claude.ai/new?q=` without a fallback path.
**Why it's wrong:** These are undocumented, unofficial URL schemes. Claude's `?q=` broke in late 2025. ChatGPT's may change. Gemini never supported it natively.
**Do this instead:** Implement clipboard-copy + open-tab as the primary fallback for all services. Use URL params as the optimistic fast path for ChatGPT only. If the URL launch fails or the service is Claude/Gemini, show a "Prompt copied — paste it in the new tab" toast.

## Sources

- Direct source code inspection: `/Users/kylelunter/claudeprojects/trackv3/src/` (HIGH confidence)
- Chrome for Developers — chrome.tabs.create (no permission required): https://developer.chrome.com/docs/extensions/reference/api/tabs (HIGH confidence)
- Chrome for Developers — chrome.offscreen API and CLIPBOARD reason: https://developer.chrome.com/docs/extensions/reference/api/offscreen (HIGH confidence)
- Chrome for Developers — chrome.storage quotas (sync: 100 KB / 8 KB per item): https://developer.chrome.com/docs/extensions/reference/api/storage (HIGH confidence)
- Chrome for Developers — options page declaration (options_page vs options_ui): https://developer.chrome.com/docs/extensions/develop/ui/options-page (HIGH confidence)
- navigator.clipboard in popup context (no clipboardWrite permission needed for user-initiated write): MDN + Chrome community consensus (MEDIUM confidence — verified via multiple sources)
- ChatGPT `?q=` URL parameter: OpenAI community discussion + GitHub (MEDIUM confidence — community-sourced, not officially documented)
- Claude `?q=` URL parameter removal (Oct 2025): GitHub issue report (LOW confidence — single source; verify before shipping)
- Gemini no native URL param support (injection required): Official Google AI developer forum + elliot79313/gemini-url-prompt README (MEDIUM confidence)
- chrome.runtime.openOptionsPage(): Chrome for Developers API reference (HIGH confidence)

---
*Architecture research for: TrackPull v1.3 — clipboard copy and AI prompt launch*
*Researched: 2026-03-02*
