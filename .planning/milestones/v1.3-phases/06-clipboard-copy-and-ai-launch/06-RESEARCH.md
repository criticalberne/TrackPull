# Phase 6: Clipboard Copy and AI Launch - Research

**Researched:** 2026-03-02
**Domain:** Chrome Extension MV3 Clipboard API, Tab Creation, Storage, Popup UI
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Popup layout & sections**
- Stacked sections top-to-bottom: Data Status (shot count + units) -> Export (CSV + Copy TSV) -> AI Analysis (prompt picker, service picker, launch buttons) -> Clear Session Data at bottom
- AI section and Copy TSV button hidden until shot data exists (matches existing Export CSV pattern)
- Export CSV and Copy TSV buttons side-by-side in one row (flex layout, equal width)
- Section visual separation style is Claude's discretion (dividers, card containers, or similar)

**Prompt selector design**
- Grouped `<select>` dropdown with `<optgroup>` labels per skill tier (Beginner, Intermediate, Advanced)
- 8 built-in prompts: 3 beginner, 3 intermediate, 2 advanced
- Last-selected prompt remembered in chrome.storage and restored on popup open
- First-time default: Quick Session Summary (beginner) — fast, low-commitment results
- No preview panel — prompt names are descriptive enough; preview is a v2 feature

**AI service picker & defaults**
- `<select>` dropdown with three options: ChatGPT, Claude, Gemini
- Positioned above or next to the "Open in AI" button
- Auto-save on dropdown change — persists to chrome.storage immediately (matches unit selector pattern)
- First-time default: ChatGPT — most widely recognized
- Opens chat home pages: chatgpt.com, claude.ai, gemini.google.com (no fragile deep-link URLs)

**Button actions & grouping**
- "Open in AI" is the primary action — filled blue button (#1976d2), copies prompt+data to clipboard and opens selected AI service in new tab
- "Copy Prompt + Data" is secondary — outline/ghost button (blue border + blue text, transparent background), copies prompt+data without opening a tab
- Action-specific toast messages: "Shot data copied!" (Copy TSV), "Prompt + data copied — paste into [AI name]" (Open in AI), "Prompt + data copied!" (Copy only)
- Toast-only confirmation — no button label changes; consistent with existing Export CSV behavior

### Claude's Discretion
- Section visual separation style (dividers, cards, or similar)
- Exact button sizing and spacing within flex rows
- Toast timing (existing pattern: 3s success, 5s error)
- Storage key names for prompt selection and AI service preference

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CLIP-01 | User can copy all shot data to clipboard as tab-separated values with one click | `writeTsv()` is ready in `src/shared/tsv_writer.ts`; `navigator.clipboard.writeText()` available in popup; requires `clipboardWrite` permission in manifest |
| CLIP-02 | User sees visual confirmation (toast) after successful clipboard copy | `showToast()` already implemented in popup.ts; success variant (green, 3s) is the correct pattern |
| CLIP-03 | Clipboard copy includes column headers as the first row | `writeTsv()` already produces header row as first line — no additional work needed |
| AILN-01 | User can open ChatGPT in a new tab with prompt+data auto-copied to clipboard | `chrome.tabs.create({ url: "https://chatgpt.com" })`; no tabs permission required for create |
| AILN-02 | User can open Claude in a new tab with prompt+data auto-copied to clipboard | `chrome.tabs.create({ url: "https://claude.ai" })`; same pattern as AILN-01 |
| AILN-03 | User can open Gemini in a new tab with prompt+data auto-copied to clipboard | `chrome.tabs.create({ url: "https://gemini.google.com" })`; same pattern; no host_permissions needed for tab creation |
| AILN-04 | User can copy assembled prompt+data to clipboard without opening an AI tab | `assemblePrompt()` + `writeTsv()` + `navigator.clipboard.writeText()` — omit `chrome.tabs.create` call |
| PRMT-02 | Built-in prompts organized by skill tier (beginner/intermediate/advanced) in the popup | `<select>` with `<optgroup>` per tier; BUILTIN_PROMPTS already grouped by tier field |
| PREF-01 | User can set a default AI service (ChatGPT, Claude, or Gemini) | `<select>` dropdown; `chrome.storage.sync.set/get` for small string value; auto-save on change |
</phase_requirements>

---

## Summary

Phase 6 is a pure UI and integration phase — all business logic is already built in Phase 5. The work is: (1) add `clipboardWrite` permission to manifest and implement the Copy TSV button using `navigator.clipboard.writeText()` directly in the popup, (2) build the AI Analysis section HTML/CSS with grouped prompt dropdown, service dropdown, and two action buttons, (3) wire up storage persistence for prompt selection and AI service preference, and (4) implement the two AI action handlers that assemble and copy prompt+data then conditionally open a tab.

The single most important technical decision is already locked from STATE.md: `navigator.clipboard.writeText()` must be called in the popup context (not service worker) to avoid the unavailability in service workers. Data must be pre-fetched on popup load (before any async clipboard call) to avoid focus-loss errors that occur when the popup loses focus mid-operation. The popup page is a secure extension context and with the `clipboardWrite` permission, transient activation (user gesture) is not strictly required — but our clipboard calls all happen inside click handlers anyway, which guarantees user activation.

`chrome.tabs.create()` requires no additional permissions beyond what the manifest already has. The service worker can open tabs; the popup can also open tabs. Either context works. Given the popup already handles all user interaction, opening tabs directly from the popup click handler is the simplest path — no message round-trip to the service worker needed.

**Primary recommendation:** Implement all Phase 6 logic directly in `popup.ts` and `popup.html`. Pre-fetch all data on `DOMContentLoaded`, store it in module-level variables, and perform clipboard writes synchronously inside click handlers. Add `clipboardWrite` to manifest permissions. Use `chrome.storage.sync` for the AI service preference (small string) and `chrome.storage.local` for the last-selected prompt ID.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `navigator.clipboard.writeText()` | Web Platform API | Write text to system clipboard | Modern async clipboard API; available in extension popup pages; no library required |
| `chrome.tabs.create()` | Chrome Extensions API | Open new browser tab at specified URL | No permissions required beyond what manifest already declares |
| `chrome.storage.sync` | Chrome Extensions API | Persist AI service preference across devices | Correct for small string values (8KB/item limit; default "ChatGPT" fits easily) |
| `chrome.storage.local` | Chrome Extensions API | Persist last-selected prompt ID | Already used for all other extension data; prompt ID is a short string |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `writeTsv()` from `src/shared/tsv_writer.ts` | Phase 5 | Generate TSV string from SessionData | CLIP-01: Copy TSV button handler |
| `assemblePrompt()` from `src/shared/prompt_builder.ts` | Phase 5 | Combine prompt template + TSV data | AILN-01/02/03/04: AI action handlers |
| `BUILTIN_PROMPTS` from `src/shared/prompt_types.ts` | Phase 5 | Populate prompt dropdown | PRMT-02: render optgroup/option elements |
| `buildUnitLabel()` from `src/shared/prompt_builder.ts` | Phase 5 | Build unit string for PromptMetadata | Metadata header in assembled prompt |
| `countSessionShots()` from `src/shared/prompt_builder.ts` | Phase 5 | Count shots for PromptMetadata | Metadata header in assembled prompt |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `navigator.clipboard.writeText()` | `document.execCommand("copy")` | execCommand is deprecated; writeText is preferred; execCommand requires a focused selected DOM element |
| Direct popup tab creation | Message to service worker | Service worker can create tabs too, but adds unnecessary complexity — popup click handlers are already the user interaction point |
| `chrome.storage.sync` for AI preference | `chrome.storage.local` | Local would also work; sync chosen because it's a small string preference that benefits from cross-device persistence |

**Installation:** No new packages required. Phase 6 uses only web platform APIs, Chrome extension APIs, and the three Phase 5 shared modules already present.

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── popup/
│   ├── popup.html      # Add: Copy TSV button, AI Analysis section (prompt select, service select, 2 buttons)
│   └── popup.ts        # Add: pre-fetch data on load, wire up 4 new handlers, storage read/write
├── shared/
│   └── constants.ts    # Add: STORAGE_KEYS.SELECTED_PROMPT_ID, STORAGE_KEYS.AI_SERVICE
└── manifest.json       # Add: "clipboardWrite" to permissions array
```

No new source files needed. All changes are additions to existing files.

### Pattern 1: Pre-Fetch Data on DOMContentLoaded

**What:** Load all storage data (shot data + unit prefs + prompt pref + AI service pref) in a single `DOMContentLoaded` handler into module-level variables. Clipboard operations later read from these in-memory variables.

**When to use:** Required to avoid "Document is not focused" DOMException. If clipboard write is called after an async `chrome.storage.get()` triggered by a button click, the popup may lose focus before the storage read completes, causing the clipboard write to fail.

**Example:**
```typescript
// Source: STATE.md decision + MDN Clipboard API documentation
let cachedData: SessionData | null = null;
let cachedUnitChoice: UnitChoice = DEFAULT_UNIT_CHOICE;

document.addEventListener("DOMContentLoaded", async () => {
  // Load all storage in one pass on startup
  const result = await chrome.storage.local.get([
    STORAGE_KEYS.TRACKMAN_DATA,
    STORAGE_KEYS.SPEED_UNIT,
    STORAGE_KEYS.DISTANCE_UNIT,
    STORAGE_KEYS.SELECTED_PROMPT_ID,
  ]);
  const syncResult = await chrome.storage.sync.get([STORAGE_KEYS.AI_SERVICE]);

  cachedData = (result[STORAGE_KEYS.TRACKMAN_DATA] as SessionData) ?? null;
  // ... populate dropdowns, set visibility, etc.
});
```

### Pattern 2: Clipboard Write Inside Click Handler

**What:** Call `navigator.clipboard.writeText()` directly inside a synchronous click event handler. The click event guarantees user activation. The data is already in memory from DOMContentLoaded pre-fetch, so no async storage read is needed.

**When to use:** All four new action buttons: Copy TSV, Open in AI, Copy Prompt + Data.

**Example:**
```typescript
// Source: MDN https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Interact_with_the_clipboard
copyTsvBtn.addEventListener("click", async () => {
  if (!cachedData) return;
  const tsvText = writeTsv(cachedData, cachedUnitChoice);
  try {
    await navigator.clipboard.writeText(tsvText);
    showToast("Shot data copied!", "success");
  } catch (err) {
    showToast("Failed to copy data", "error");
  }
});
```

### Pattern 3: AI Service Tab Creation

**What:** Copy assembled prompt+data to clipboard, then open the selected AI service URL in a new tab. Both operations happen in the same click handler. No service worker message-passing needed.

**When to use:** "Open in AI" button handler.

**Example:**
```typescript
// Source: Chrome developer docs https://developer.chrome.com/docs/extensions/reference/api/tabs
const AI_URLS: Record<string, string> = {
  "ChatGPT": "https://chatgpt.com",
  "Claude":  "https://claude.ai",
  "Gemini":  "https://gemini.google.com",
};

openInAiBtn.addEventListener("click", async () => {
  const selectedService = aiServiceSelect.value;
  const selectedPromptId = promptSelect.value;
  const prompt = BUILTIN_PROMPTS.find(p => p.id === selectedPromptId);
  if (!prompt || !cachedData) return;

  const tsvData = writeTsv(cachedData, cachedUnitChoice);
  const metadata = {
    date: cachedData.date,
    shotCount: countSessionShots(cachedData),
    unitLabel: buildUnitLabel(cachedUnitChoice),
  };
  const assembled = assemblePrompt(prompt, tsvData, metadata);

  try {
    await navigator.clipboard.writeText(assembled);
    chrome.tabs.create({ url: AI_URLS[selectedService] });
    showToast(`Prompt + data copied — paste into ${selectedService}`, "success");
  } catch (err) {
    showToast("Failed to copy prompt", "error");
  }
});
```

### Pattern 4: Storage Persistence for Preferences

**What:** Auto-save dropdown value on `change` event. Use `chrome.storage.sync` for AI service (small string, cross-device), `chrome.storage.local` for last-selected prompt ID (follows existing local storage pattern).

**When to use:** AI service select and prompt select dropdowns.

**Example:**
```typescript
// Source: Existing pattern in popup.ts for speedSelect / distanceSelect
aiServiceSelect.addEventListener("change", () => {
  chrome.storage.sync.set({ [STORAGE_KEYS.AI_SERVICE]: aiServiceSelect.value });
});

promptSelect.addEventListener("change", () => {
  chrome.storage.local.set({ [STORAGE_KEYS.SELECTED_PROMPT_ID]: promptSelect.value });
});
```

### Pattern 5: Grouped Prompt Dropdown (HTML)

**What:** Use `<optgroup label="Beginner">` / `<optgroup label="Intermediate">` / `<optgroup label="Advanced">` to organize the 8 built-in prompts. Render from `BUILTIN_PROMPTS` in TypeScript.

**When to use:** PRMT-02 requirement; populated dynamically to stay in sync with BUILTIN_PROMPTS array.

**Example:**
```typescript
// Source: Standard HTML5 optgroup pattern
const tiers: SkillTier[] = ["beginner", "intermediate", "advanced"];
const tierLabels: Record<SkillTier, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

for (const tier of tiers) {
  const group = document.createElement("optgroup");
  group.label = tierLabels[tier];
  for (const prompt of BUILTIN_PROMPTS.filter(p => p.tier === tier)) {
    const opt = document.createElement("option");
    opt.value = prompt.id;
    opt.textContent = prompt.name;
    group.appendChild(opt);
  }
  promptSelect.appendChild(group);
}
```

### Pattern 6: Visibility Gating

**What:** Copy TSV button and entire AI Analysis section hidden via `style.display = "none"` when no shot data. Shown when data exists. Matches existing pattern for `export-btn`.

**When to use:** `updateExportButtonVisibility` equivalent — extend the existing function or add a separate `updateAiSectionVisibility` call at the same points.

**Example:**
```typescript
function updateAiSectionVisibility(data: unknown): void {
  const hasData = data && typeof data === "object" &&
    (data as Record<string, unknown>)["club_groups"];
  const aiSection = document.getElementById("ai-section");
  const copyTsvBtn = document.getElementById("copy-tsv-btn");
  if (aiSection) aiSection.style.display = hasData ? "block" : "none";
  if (copyTsvBtn) copyTsvBtn.style.display = hasData ? "inline-block" : "none";
}
```

### Anti-Patterns to Avoid

- **Async storage read inside click handler before clipboard write:** Clipboard write may fail with "Document is not focused" if the popup loses focus during the async gap. Pre-fetch data on DOMContentLoaded instead.
- **Using `document.execCommand("copy"):`** Deprecated. `navigator.clipboard.writeText()` is the correct modern approach.
- **Calling `chrome.tabs.create()` from the service worker via message:** Unnecessary complexity. The popup can call `chrome.tabs.create()` directly.
- **Using `chrome.storage.local` for AI service preference:** Works, but `chrome.storage.sync` is the correct choice for small preference strings — enables cross-device sync without cost.
- **Hard-coding prompt option elements in HTML:** Prompts should be rendered from `BUILTIN_PROMPTS` dynamically so HTML stays in sync with the TypeScript constant.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| TSV generation with headers | Custom string join logic | `writeTsv()` from tsv_writer.ts | Already tested, handles unit conversion, column ordering, tab/newline escaping |
| Prompt template assembly | Custom string replacement | `assemblePrompt()` from prompt_builder.ts | Already tested, handles metadata header, {{DATA}} replacement |
| Toast notifications | Custom DOM notification | `showToast()` from popup.ts | Already implemented with slide animation, error/success types, auto-dismiss |
| Clipboard write | Textarea hack / execCommand | `navigator.clipboard.writeText()` | Modern API, works in popup secure context with clipboardWrite permission |

**Key insight:** All data transformation logic was built in Phase 5 specifically to be consumed by Phase 6. Do not duplicate or reimagine it.

---

## Common Pitfalls

### Pitfall 1: Clipboard Write Fails After Async Storage Read

**What goes wrong:** Button click triggers `chrome.storage.get()` to fetch shot data, then calls `navigator.clipboard.writeText()` after the await. If the popup loses focus in that async gap (rare but possible), the clipboard write fails with "DOMException: Document is not focused."

**Why it happens:** The Clipboard API checks document focus at the time of the write call. An async gap between user gesture and clipboard write creates a window where focus may be lost.

**How to avoid:** Pre-fetch all shot data, unit prefs, prompt pref, and AI service pref on `DOMContentLoaded` into module-level variables. Clipboard writes in click handlers read from these variables synchronously (no await before writeText).

**Warning signs:** "DOMException: Document is not focused" errors in popup console.

### Pitfall 2: Missing `clipboardWrite` Permission

**What goes wrong:** `navigator.clipboard.writeText()` throws `NotAllowedError` in extension popup context without the `clipboardWrite` manifest permission.

**Why it happens:** Extension popup pages are secure contexts, but Chrome requires the explicit manifest permission for clipboard write operations in extensions.

**How to avoid:** Add `"clipboardWrite"` to the `"permissions"` array in `src/manifest.json`. This displays a user-facing warning ("Modify data you copy and paste") on install — acceptable for this use case.

**Warning signs:** `NotAllowedError: Failed to execute 'writeText' on 'Clipboard'` in console.

### Pitfall 3: Prompt Dropdown Not Restored on Popup Open

**What goes wrong:** User selects a prompt, closes and reopens popup — dropdown resets to first option instead of their last selection.

**Why it happens:** Chrome popups are ephemeral — the DOM is destroyed and recreated each time the popup opens. Dropdown state must be read from storage on every DOMContentLoaded.

**How to avoid:** In DOMContentLoaded handler, after rendering all optgroups/options, read `STORAGE_KEYS.SELECTED_PROMPT_ID` from storage and set `promptSelect.value` to it. Fall back to `"quick-summary-beginner"` (the first-time default) if key is absent.

**Warning signs:** Dropdown always shows first option regardless of prior selection.

### Pitfall 4: AI Service Preference Lost Across Devices

**What goes wrong:** User sets AI service preference on one machine; it does not appear on another.

**Why it happens:** Using `chrome.storage.local` instead of `chrome.storage.sync` for AI service preference.

**How to avoid:** Use `chrome.storage.sync` for the AI service preference (confirmed in STATE.md decisions). The value is a short string ("ChatGPT", "Claude", or "Gemini") — well within the 8KB per-item sync quota.

**Warning signs:** AI service preference not syncing across devices.

### Pitfall 5: Export Row Layout Breaking on Wide/Narrow Popups

**What goes wrong:** Side-by-side "Export CSV" and "Copy TSV" buttons overflow or collapse awkwardly.

**Why it happens:** Popup min-width is 320px. Two equal-width buttons in a flex row at 320px is achievable but requires `min-width: 0` on flex children and appropriate font-size.

**How to avoid:** Use CSS `display: flex; gap: 8px;` on the export row container. Set both buttons to `flex: 1; min-width: 0;` so they shrink equally. Match existing button padding (12px) but allow font-size to be 14px instead of 16px if needed for two-column fit.

**Warning signs:** Buttons wrapping to separate rows or text overflowing button boundaries.

### Pitfall 6: Toast Message Order Confusion

**What goes wrong:** User clicks "Open in AI" and sees generic "Prompt + data copied!" instead of the AI-specific message, leaving them unsure which service to look for.

**Why it happens:** Reusing the AILN-04 "Copy Prompt + Data" toast message for both actions.

**How to avoid:** Use distinct toast messages as specified in CONTEXT.md: AILN-01/02/03 shows "Prompt + data copied — paste into [AI name]" (interpolating the selected service name); AILN-04 shows "Prompt + data copied!".

---

## Code Examples

Verified patterns from official sources:

### Clipboard Write (Popup)

```typescript
// Source: MDN https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Interact_with_the_clipboard
async function copyToClipboard(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}
```

### Tab Creation (No Permission Required)

```typescript
// Source: Chrome developer docs https://developer.chrome.com/docs/extensions/reference/api/tabs
chrome.tabs.create({ url: "https://chatgpt.com" });
// Returns a Promise<Tab> in MV3; no need to await for fire-and-forget
```

### Storage Read with Fallback (sync)

```typescript
// Source: Existing popup.ts pattern + chrome.storage docs
const syncResult = await chrome.storage.sync.get([STORAGE_KEYS.AI_SERVICE]);
const aiService = (syncResult[STORAGE_KEYS.AI_SERVICE] as string) ?? "ChatGPT";
```

### Manifest Permission Addition

```json
// Source: Chrome developer docs https://developer.chrome.com/docs/extensions/reference/permissions-list
{
  "permissions": ["storage", "downloads", "clipboardWrite"]
}
```

### STORAGE_KEYS Additions (constants.ts)

```typescript
export const STORAGE_KEYS = {
  TRACKMAN_DATA:      "trackmanData",
  SPEED_UNIT:         "speedUnit",
  DISTANCE_UNIT:      "distanceUnit",
  SELECTED_PROMPT_ID: "selectedPromptId",  // chrome.storage.local
  AI_SERVICE:         "aiService",          // chrome.storage.sync
} as const;
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `document.execCommand("copy")` | `navigator.clipboard.writeText()` | ~2019 (Chrome 66) | execCommand is deprecated; writeText is async, promise-based, works in extension popups |
| URL query parameters for AI pre-fill (`?q=`) | Clipboard-only launch (copy + open homepage) | Oct 2025 (Claude removed ?q=) | All three AI services now require clipboard approach; deep-link pre-fill is unreliable or unavailable |
| `chrome.storage.local` for all preferences | `chrome.storage.sync` for small cross-device prefs | MV3 norm | Sync storage (100KB total, 8KB/item) is correct for small preference strings that benefit from cross-device sync |

**Deprecated/outdated:**
- `document.execCommand("copy")`: Deprecated in all browsers. Works but not recommended — use `navigator.clipboard.writeText()`.
- Claude.ai `?q=` URL parameter: Removed October 2025 per STATE.md. Do not attempt URL pre-fill for any AI service.
- ChatGPT `?q=` URL parameter: Community-sourced claim (pre-fills AND auto-submits); decision in STATE.md is to use clipboard-only for consistency across all three services.

---

## Open Questions

1. **Should `chrome.tabs.create()` be called from popup or service worker?**
   - What we know: Both can call it. Popup does not need to message the service worker. Service worker would require a round-trip message.
   - What's unclear: Nothing — popup is simpler and correct.
   - Recommendation: Call `chrome.tabs.create()` directly from the popup click handler. No service worker involvement needed.

2. **What happens if the popup closes before the new tab opens?**
   - What we know: `chrome.tabs.create()` is async. The popup may close immediately after the click. The tab creation request is already submitted to the browser before the popup closes.
   - What's unclear: Whether popup closure before `chrome.tabs.create()` resolves causes tab creation to fail.
   - Recommendation: Do not await `chrome.tabs.create()`. Fire-and-forget. The clipboard write (which must complete before the tab opens) is awaited; the tab creation is not. This mirrors the most common extension pattern.

3. **Do we need `showStatusMessage()` for clipboard errors, or is `showToast()` sufficient?**
   - What we know: Existing pattern uses `showStatusMessage()` for in-progress states and `showToast()` for final outcomes. Export button sets "Preparing CSV..." via `showStatusMessage()` then shows a toast.
   - What's unclear: Clipboard writes are near-instantaneous — there is no meaningful "in-progress" state to show.
   - Recommendation: Use `showToast()` only for all clipboard actions. No `showStatusMessage()` needed — clipboard operations complete before any perceptible delay.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 1.1.1 |
| Config file | `vitest.config.ts` (include: `tests/test_*.ts`) |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CLIP-01 | `writeTsv()` output is copied to clipboard on button click | unit (logic only; clipboard mock) | `npx vitest run tests/test_popup_clipboard.ts` | ❌ Wave 0 |
| CLIP-02 | Toast appears after successful copy | unit (DOM / vitest-dom) | `npx vitest run tests/test_popup_clipboard.ts` | ❌ Wave 0 |
| CLIP-03 | `writeTsv()` first row is header | unit | `npx vitest run tests/test_tsv_writer.ts` | ✅ existing (test: "starts with Date, Club, Shot # columns") |
| AILN-01 | "Open in AI" with ChatGPT: copies assembled prompt + opens chatgpt.com | unit (chrome.tabs mock) | `npx vitest run tests/test_popup_ai_launch.ts` | ❌ Wave 0 |
| AILN-02 | "Open in AI" with Claude: copies assembled prompt + opens claude.ai | unit (chrome.tabs mock) | `npx vitest run tests/test_popup_ai_launch.ts` | ❌ Wave 0 |
| AILN-03 | "Open in AI" with Gemini: copies assembled prompt + opens gemini.google.com | unit (chrome.tabs mock) | `npx vitest run tests/test_popup_ai_launch.ts` | ❌ Wave 0 |
| AILN-04 | "Copy Prompt + Data": copies assembled prompt, no tab opened | unit (chrome.tabs mock) | `npx vitest run tests/test_popup_ai_launch.ts` | ❌ Wave 0 |
| PRMT-02 | Prompt dropdown renders optgroup per tier with correct prompts | unit (JSDOM) | `npx vitest run tests/test_popup_prompt_select.ts` | ❌ Wave 0 |
| PREF-01 | AI service dropdown value persists to chrome.storage.sync | unit (storage mock) | `npx vitest run tests/test_popup_ai_launch.ts` | ❌ Wave 0 |

**Note on testability:** popup.ts currently has no unit tests — all existing popup tests are Python-based browser tests. The new test files will test pure logic functions extracted from the popup (assemblePrompt, writeTsv) rather than DOM interaction. Chrome API mocks (clipboard, tabs, storage) should be set up in vitest using `vi.stubGlobal()` or a `setup.ts` file.

### Sampling Rate
- **Per task commit:** `npx vitest run`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/test_popup_clipboard.ts` — covers CLIP-01, CLIP-02 (clipboard logic + toast trigger)
- [ ] `tests/test_popup_ai_launch.ts` — covers AILN-01, AILN-02, AILN-03, AILN-04, PREF-01 (AI launch logic + storage persistence)
- [ ] `tests/test_popup_prompt_select.ts` — covers PRMT-02 (prompt dropdown rendering with optgroups)

**Important scoping note:** Popup DOM tests in vitest require jsdom environment. The project's existing vitest tests (`test_*.ts`) do not currently use jsdom — they test pure TypeScript modules. Recommend scoping Wave 0 test files to test logic functions only (not full DOM interaction), using vi.stubGlobal() to mock `navigator.clipboard` and `chrome`. Full DOM tests remain as Python test_popup_* files.

---

## Sources

### Primary (HIGH confidence)
- [Chrome Extensions Permissions List](https://developer.chrome.com/docs/extensions/reference/permissions-list) — `clipboardWrite` permission definition and user-facing warning verified
- [Chrome Extensions Tabs API](https://developer.chrome.com/docs/extensions/reference/api/tabs) — `tabs.create()` requires no permissions; available in extension pages
- [Chrome Extensions Storage API](https://developer.chrome.com/docs/extensions/reference/api/storage) — `sync.QUOTA_BYTES_PER_ITEM = 8192`; `local.QUOTA_BYTES = 10MB` verified
- [MDN: Interact with the Clipboard (WebExtensions)](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Interact_with_the_clipboard) — `navigator.clipboard.writeText()` works in popup pages; `clipboardWrite` permission bypasses transient activation requirement

### Secondary (MEDIUM confidence)
- STATE.md project decisions — clipboard-first AI launch design (URL deep-links removed/unreliable); navigator.clipboard in popup only; chrome.storage.sync for AI service preference — these decisions are documented project history, not external sources, but are MEDIUM confidence as factual assertions about external services (Claude ?q= removal)

### Tertiary (LOW confidence)
- ChatGPT `?q=` auto-submit behavior: community sources agree it pre-fills and auto-submits; decision in STATE.md is to avoid it for consistency — flagged LOW as no official documentation from OpenAI

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all APIs verified via official Chrome developer docs and MDN
- Architecture: HIGH — patterns derived directly from existing codebase (popup.ts) and official APIs; no speculative choices
- Pitfalls: HIGH (Pitfall 1-4) / MEDIUM (Pitfall 5-6) — Pitfall 1 is explicitly documented in STATE.md; Pitfalls 2-4 are verifiable from official docs; Pitfalls 5-6 are CSS/UX reasoning

**Research date:** 2026-03-02
**Valid until:** 2026-04-02 (stable APIs — 30 day window appropriate)
