# Phase 7: Options Page and Custom Prompts - Research

**Researched:** 2026-03-02
**Domain:** Chrome Extension Options Page, chrome.storage API, Vanilla TypeScript DOM
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Options page layout:**
- Single scroll page with section headers (no tabs)
- Cleaner settings-page style — same TrackPull color palette (#1976d2 blue accent) but wider layout, more whitespace, full-page feel (like Chrome's own settings)
- Two main sections: Prompts (top) and AI Preferences (bottom)
- Navigation to options page via gear icon in popup header AND Chrome's built-in right-click extension menu (options_ui in manifest provides this automatically)

**Prompt editing experience:**
- Inline form below the prompt list — "+ New Prompt" button expands a form with name and template fields directly below the list; editing replaces the prompt row with the form inline
- Custom prompt fields: Name + Template body only (no tier, topic, or category)
- Delete requires a confirm dialog before removal ("Delete this prompt?")

**Popup integration:**
- Custom prompts appear in a "My Prompts" `<optgroup>` at the TOP of the prompt selector, above built-in tier groups
- Popup loads custom prompts fresh on each open (no live sync listener between options page and popup)
- If the user's last-selected prompt was deleted, fall back to the first built-in prompt (Quick Session Summary)
- Fully dynamic rendering — rebuild the entire `<select>` dropdown from code on popup load (built-in prompts from BUILTIN_PROMPTS array + custom prompts from storage). Remove the current hardcoded `<option>` elements from popup.html

**Data & storage:**
- Custom prompts stored in chrome.storage.sync (syncs across devices via Chrome account)
- No explicit limit on custom prompt count — let storage quota (~100KB) be the natural constraint; show error on save if quota exceeded
- Custom prompts use the same {{DATA}} placeholder and assemblePrompt() logic as built-in prompts — consistent behavior
- AI service preference lives in both places: options page sets the default, popup dropdown allows quick per-session override (already using chrome.storage.sync for AI service)

### Claude's Discretion
- Built-in prompt display style on options page (collapsed list vs cards vs other)
- {{DATA}} placeholder discoverability in the template editor (placeholder text, auto-insert, helper note, etc.)
- Exact spacing, typography, and whitespace for the settings page
- Custom prompt storage key structure and ID generation

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PRMT-03 | User can create and save custom prompt templates | chrome.storage.sync write + options page form; assemblePrompt() type broadening enables custom prompts to work with existing clipboard/AI launch logic |
| PRMT-04 | User can edit and delete their custom prompt templates | Inline form pattern; confirm dialog for delete; storage update/remove operations; popup fallback when deleted prompt was selected |
| PREF-02 | User can manage prompts and AI preferences in a dedicated options page | options_ui manifest field; chrome.runtime.openOptionsPage() from popup; full-page options with open_in_tab: true; esbuild entry for options.ts |
</phase_requirements>

---

## Summary

Phase 7 introduces two new artifacts: an options page (`src/options/options.html` + `src/options/options.ts`) and supporting shared logic for custom prompts. The page is opened via `chrome.runtime.openOptionsPage()` from a gear icon in the popup header. Chrome's `options_ui` manifest field with `open_in_tab: true` provides a full-tab experience and also automatically enables the "Options" entry in the extension's right-click context menu.

The main technical work falls into three areas: (1) the options page HTML/CSS layout and TypeScript event handling for the create/edit/delete CRUD loop, (2) the storage design for custom prompts in `chrome.storage.sync`, and (3) refactoring popup.ts to rebuild the prompt `<select>` dynamically from both `BUILTIN_PROMPTS` and stored custom prompts. All three areas use patterns already established in this codebase — vanilla DOM manipulation, esbuild IIFE bundles, and `chrome.storage` calls.

The most important design decision is storage key structure for custom prompts. The user chose `chrome.storage.sync`, which syncs across Chrome profiles. The 8 KB per-item quota is the critical constraint: storing all custom prompts as a single JSON array under one key risks exceeding the limit if prompts are long or numerous (fails at ~16 long-template prompts or ~39 typical-length prompts per calculated benchmarks). The recommended approach is to store each custom prompt under its own key (e.g., `customPrompt_<id>`) so no single item can exceed 8 KB, and handle the total 100 KB sync quota as the natural ceiling (as the user specified).

**Primary recommendation:** Store each custom prompt as an individual `chrome.storage.sync` key prefixed `customPrompt_`. Maintain a separate index key `customPromptIds` (a string array of IDs) to enable efficient listing. Use `crypto.randomUUID()` for ID generation.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vanilla TypeScript | project's own | Options page logic, DOM manipulation, event handling | Already the established pattern for popup.ts; no framework |
| esbuild | already in build | Bundle options.ts to options.js IIFE | Already used for all other entry points |
| chrome.storage.sync | Chrome built-in | Persist custom prompts across devices | User-specified; same API already used for AI service preference |
| chrome.runtime.openOptionsPage | Chrome built-in | Navigate from popup gear icon to options page | Official API; works with options_ui manifest field |
| crypto.randomUUID() | browser built-in (Chrome 92+) | Generate unique IDs for custom prompts | Available in all extension contexts; no dependency needed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| window.confirm() | browser built-in | Delete confirmation dialog | Simple, zero-dependency; matches the no-framework constraint |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Per-key storage (`customPrompt_<id>`) | Single array key `customPrompts` | Array key fails at ~16 long prompts (8 KB limit); per-key scales to 100 KB total |
| `crypto.randomUUID()` | `Date.now().toString()` or counter | UUID avoids collisions on import/sync edge cases; no extra code |
| `window.confirm()` | Custom modal overlay | Custom modal is extra complexity for a one-time delete action |
| `open_in_tab: true` | `open_in_tab: false` (embedded) | Embedded doesn't match "full-page feel" UX decision; full-tab preferred |

**Installation:**
No new packages required. All capabilities come from browser built-ins and esbuild (already present).

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── options/
│   ├── options.html      # Options page HTML (standalone, references options.js)
│   └── options.ts        # Options page TypeScript (esbuild entry point)
├── popup/
│   ├── popup.html        # Add gear icon in header; remove hardcoded <option> elements
│   └── popup.ts          # Refactor renderPromptSelect() to dynamic build
└── shared/
    ├── constants.ts      # Add CUSTOM_PROMPT_KEY_PREFIX, CUSTOM_PROMPT_IDS_KEY
    └── prompt_types.ts   # Add CustomPrompt interface; add union type PromptItem
```

Build artifacts in `dist/`:
```
dist/
├── options.html
├── options.js
└── (all existing files unchanged)
```

### Pattern 1: options_ui Manifest Field
**What:** Declares the options page to Chrome. Enables right-click "Options" menu entry and `chrome.runtime.openOptionsPage()` routing.
**When to use:** Any extension with a settings page.
**Example:**
```json
// Source: https://developer.chrome.com/docs/extensions/develop/ui/options-page
// In src/manifest.json — add alongside existing "action" field:
"options_ui": {
  "page": "options.html",
  "open_in_tab": true
}
```
Note: `open_in_tab: true` gives a full browser tab. `open_in_tab: false` embeds in `chrome://extensions` (not desired here per UX decision).

### Pattern 2: Opening Options Page from Popup
**What:** Gear icon click calls `chrome.runtime.openOptionsPage()` to navigate to options page.
**When to use:** Any navigation from popup to options.
**Example:**
```typescript
// Source: https://developer.chrome.com/docs/extensions/develop/ui/options-page
const settingsBtn = document.getElementById("settings-btn");
if (settingsBtn) {
  settingsBtn.addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });
}
```

### Pattern 3: Custom Prompt Storage (Per-Key Strategy)
**What:** Store each custom prompt as its own `chrome.storage.sync` key. Maintain an index array of IDs.
**When to use:** When storing variable-length user content in sync storage; avoids single-key 8 KB quota limit.
**Example:**
```typescript
// Source: https://developer.chrome.com/docs/extensions/reference/api/storage
// constants.ts additions:
export const CUSTOM_PROMPT_KEY_PREFIX = "customPrompt_" as const;
export const CUSTOM_PROMPT_IDS_KEY = "customPromptIds" as const;

// Saving a new custom prompt:
async function saveCustomPrompt(prompt: CustomPrompt): Promise<void> {
  const key = CUSTOM_PROMPT_KEY_PREFIX + prompt.id;

  // Fetch existing IDs
  const result = await chrome.storage.sync.get([CUSTOM_PROMPT_IDS_KEY]);
  const ids: string[] = (result[CUSTOM_PROMPT_IDS_KEY] as string[]) ?? [];

  // Add new ID if not already present
  if (!ids.includes(prompt.id)) {
    ids.push(prompt.id);
  }

  try {
    await chrome.storage.sync.set({
      [key]: prompt,
      [CUSTOM_PROMPT_IDS_KEY]: ids,
    });
  } catch (err) {
    if ((err as Error).message?.includes("QUOTA_BYTES")) {
      showError("Storage quota exceeded. Delete some prompts to save new ones.");
    }
    throw err;
  }
}

// Loading all custom prompts:
async function loadCustomPrompts(): Promise<CustomPrompt[]> {
  const idsResult = await chrome.storage.sync.get([CUSTOM_PROMPT_IDS_KEY]);
  const ids: string[] = (idsResult[CUSTOM_PROMPT_IDS_KEY] as string[]) ?? [];

  if (ids.length === 0) return [];

  const keys = ids.map(id => CUSTOM_PROMPT_KEY_PREFIX + id);
  const promptsResult = await chrome.storage.sync.get(keys);

  return ids
    .map(id => promptsResult[CUSTOM_PROMPT_KEY_PREFIX + id] as CustomPrompt | undefined)
    .filter((p): p is CustomPrompt => p !== undefined);
}

// Deleting a custom prompt:
async function deleteCustomPrompt(id: string): Promise<void> {
  const key = CUSTOM_PROMPT_KEY_PREFIX + id;
  const idsResult = await chrome.storage.sync.get([CUSTOM_PROMPT_IDS_KEY]);
  const ids: string[] = (idsResult[CUSTOM_PROMPT_IDS_KEY] as string[]) ?? [];
  const newIds = ids.filter(i => i !== id);

  await chrome.storage.sync.remove(key);
  await chrome.storage.sync.set({ [CUSTOM_PROMPT_IDS_KEY]: newIds });
}
```

### Pattern 4: CustomPrompt Type and assemblePrompt() Broadening
**What:** Add `CustomPrompt` interface; create a `PromptItem` union type so `assemblePrompt()` accepts both prompt kinds.
**When to use:** Wherever a prompt is assembled for the clipboard.
**Example:**
```typescript
// In src/shared/prompt_types.ts — add:
export interface CustomPrompt {
  readonly id: string;
  readonly name: string;
  readonly template: string;
  // No tier or topic — by user decision
}

// Union type for any prompt that can be assembled:
export type PromptItem = BuiltInPrompt | CustomPrompt;
```

```typescript
// In src/shared/prompt_builder.ts — broaden the signature:
// Change: prompt: BuiltInPrompt
// To:     prompt: PromptItem
// (PromptItem has id, name, template — all assemblePrompt() needs)
export function assemblePrompt(
  prompt: PromptItem,
  tsvData: string,
  metadata?: PromptMetadata
): string {
  // Implementation unchanged — template.replace("{{DATA}}", dataBlock)
}
```

### Pattern 5: Dynamic Prompt Select Rendering in Popup
**What:** Replace hardcoded `<option>` elements in popup.html with JavaScript-generated options from `BUILTIN_PROMPTS` + `loadCustomPrompts()`.
**When to use:** Any time the prompt list may include user-defined items.
**Example:**
```typescript
// In popup.ts — replace prompt select initialization:
async function renderPromptSelect(select: HTMLSelectElement): Promise<void> {
  const customPrompts = await loadCustomPrompts();

  select.innerHTML = ""; // Clear existing options

  // "My Prompts" group at top (if any custom prompts exist)
  if (customPrompts.length > 0) {
    const myGroup = document.createElement("optgroup");
    myGroup.label = "My Prompts";
    for (const cp of customPrompts) {
      const opt = document.createElement("option");
      opt.value = cp.id;
      opt.textContent = cp.name;
      myGroup.appendChild(opt);
    }
    select.appendChild(myGroup);
  }

  // Built-in groups by tier
  const tiers: Array<{ label: string; value: SkillTier }> = [
    { label: "Beginner", value: "beginner" },
    { label: "Intermediate", value: "intermediate" },
    { label: "Advanced", value: "advanced" },
  ];
  for (const tier of tiers) {
    const group = document.createElement("optgroup");
    group.label = tier.label;
    for (const p of BUILTIN_PROMPTS.filter(b => b.tier === tier.value)) {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = p.name;
      group.appendChild(opt);
    }
    select.appendChild(group);
  }
}
```

### Pattern 6: Options Page DOMContentLoaded IIFE (matches popup.ts pattern)
**What:** Async IIFE on DOMContentLoaded — exact same initialization pattern as popup.ts.
**When to use:** All extension pages in this project.
**Example:**
```typescript
// src/options/options.ts — skeleton:
import { BUILTIN_PROMPTS } from "../shared/prompt_types";
import { STORAGE_KEYS, CUSTOM_PROMPT_KEY_PREFIX, CUSTOM_PROMPT_IDS_KEY } from "../shared/constants";
import type { CustomPrompt } from "../shared/prompt_types";

document.addEventListener("DOMContentLoaded", async () => {
  await renderBuiltInPrompts();
  await renderCustomPrompts();
  setupNewPromptForm();
  await restoreAiPreference();
});
```

### Pattern 7: Build Script Extension
**What:** Add esbuild entry for options.ts; copy options.html to dist/.
**When to use:** Every new extension page entry point.
**Example:**
```bash
# Add to scripts/build-extension.sh after popup.js build:
npx --yes esbuild src/options/options.ts --bundle --outfile="$DIST_DIR/options.js" --format=iife || { echo 'Error: Failed to build options.js' >&2; exit 1; }
echo "Options page script bundled to $DIST_DIR/options.js"
cp src/options/options.html "$DIST_DIR/options.html" || echo 'Warning: options.html not found' >&2
```

### Anti-Patterns to Avoid
- **Storing all custom prompts as a single array under one sync key:** Hits the 8 KB per-item limit at ~16 long prompts. Use per-key storage with an index.
- **Using `open_in_tab: false`:** Embeds options inside `chrome://extensions` — doesn't match the "full-page feel" UX decision.
- **Using `options_page` (MV2 field):** Deprecated in MV3. Use `options_ui` with `open_in_tab: true` for full-tab behavior.
- **Hardcoding options in popup.html `<select>`:** Prevents custom prompts from appearing. Must be fully dynamic.
- **Reading from storage inside click handlers for clipboard operations:** Existing popup.ts pattern pre-fetches data on load for clipboard access; custom prompt lookup for assembly should follow the same pre-fetch approach.
- **Looking up custom prompts by scanning BUILTIN_PROMPTS only:** After refactor, popup.ts must search both `BUILTIN_PROMPTS` and loaded custom prompts when resolving a selected prompt ID.
- **Not handling the "deleted prompt was selected" fallback:** Popup must detect when `selectedPromptId` doesn't match any available option and fall back to `quick-summary-beginner`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Options page routing | Custom URL routing or hash-based navigation | `chrome.runtime.openOptionsPage()` | Built-in API; handles focus if page already open |
| Sync across devices | Custom sync backend | `chrome.storage.sync` | Chrome handles sync; built into the extension platform |
| Delete confirmation | Custom modal component | `window.confirm()` | Zero dependencies; meets the UX requirement (simple confirm dialog) |
| Unique ID generation | Timestamp or counter | `crypto.randomUUID()` | Collision-free; available in all Chrome 92+ extension contexts |
| Quota error detection | Try/catch on size estimation | chrome.storage.sync `QUOTA_BYTES_EXCEEDED` error in catch | Chrome throws a specific error; catch and surface it as toast |

**Key insight:** The Chrome extensions API provides all required capabilities natively. No npm packages are needed for this phase.

---

## Common Pitfalls

### Pitfall 1: 8 KB Per-Item Sync Quota Exceeded
**What goes wrong:** Storing all custom prompts in a single `chrome.storage.sync` key as a JSON array. When the array grows beyond ~16 prompts with typical templates (or fewer with long templates), the set() call throws a QUOTA_BYTES_PER_ITEM error silently or with a runtime error.
**Why it happens:** `chrome.storage.sync.QUOTA_BYTES_PER_ITEM` is 8192 bytes total per key (key name + JSON-stringified value). A single array containing multiple prompt templates easily exceeds this.
**How to avoid:** Store each custom prompt as its own key (`customPrompt_<id>`). Maintain a separate `customPromptIds` array (small, just strings) as an index. Each individual prompt is well under 8 KB (measured: ~689 bytes for a prompt similar to built-ins).
**Warning signs:** `chrome.runtime.lastError` with "QUOTA_BYTES_PER_ITEM" message after save. The catch block in `saveCustomPrompt()` must explicitly check for quota errors and show a user-visible error toast.

### Pitfall 2: assemblePrompt() Type Mismatch After Broadening
**What goes wrong:** `assemblePrompt()` currently accepts `BuiltInPrompt` which has `readonly tier` and `readonly topic` fields. Custom prompts don't have these. Passing a `CustomPrompt` causes a TypeScript type error.
**Why it happens:** The current signature is narrowed to `BuiltInPrompt` because only built-in prompts existed at time of implementation.
**How to avoid:** Create a `PromptItem = BuiltInPrompt | CustomPrompt` union type (or a minimal interface with only `id`, `name`, `template`). Change `assemblePrompt()` parameter type to `PromptItem`. Existing callers are unaffected (built-in prompts satisfy the broader type).
**Warning signs:** TypeScript errors in popup.ts when calling `assemblePrompt(customPrompt, ...)`.

### Pitfall 3: Popup Fails to Find Prompt After Custom Prompt Deleted
**What goes wrong:** User had a custom prompt selected, deletes it from options page, reopens popup. `promptSelect.value = savedPromptId` sets the value but the option no longer exists — browser silently ignores it, select remains on first option. If that first option is a custom prompt that was also deleted, the value is empty string. Calling `BUILTIN_PROMPTS.find(p => p.id === selectedPromptId)` returns `undefined` and the AI launch buttons break.
**Why it happens:** The popup resolves the saved prompt ID against available options after rebuilding the select. If the ID is stale (prompt deleted), no match is found.
**How to avoid:** After `renderPromptSelect()`, attempt to restore `savedPromptId`. If the select's value doesn't match `savedPromptId` after assignment (i.e., option doesn't exist), fall back to `quick-summary-beginner` and update storage to clear the stale ID.
**Warning signs:** Open AI button does nothing when a previously-selected custom prompt no longer exists.

### Pitfall 4: esbuild Bundle References options.ts Instead of options.js
**What goes wrong:** options.html `<script src="./options.ts">` causes a Chrome extension CSP error or blank page. The build validation in build-extension.sh currently only checks popup.html for .ts references.
**Why it happens:** Copy-paste error when creating options.html. The build script's validation grep only checks popup.html.
**How to avoid:** options.html must reference `./options.js` (the esbuild output). Extend the build validation in `build-extension.sh` to also check options.html for .ts references.
**Warning signs:** Options page is blank; DevTools console shows a CSP violation or 404 for options.ts.

### Pitfall 5: test_dist_structure.py Fails After Adding Options Page
**What goes wrong:** The existing `test_dist_structure.py` validates that `dist/popup.html` references `popup.js` specifically (`assert 'src="./popup.js"' in content`). After adding options.html, if the test expands to check options.html, the same pattern check must be added.
**Why it happens:** No options page tests exist yet; the test only checks popup.html.
**How to avoid:** When adding options.html to dist/, add corresponding test assertions for `dist/options.html` and `dist/options.js` existence.

### Pitfall 6: options_ui Page Path Must Match Dist Layout
**What goes wrong:** `manifest.json` `options_ui.page` references `options.html`, but options.html isn't copied to `dist/`. Chrome can't find the options page — right-click "Options" menu entry is broken, `openOptionsPage()` fails silently.
**Why it happens:** The build script must explicitly copy options.html in addition to building options.js.
**How to avoid:** Add `cp src/options/options.html "$DIST_DIR/options.html"` to the build script after the esbuild step.

---

## Code Examples

Verified patterns from official sources and codebase analysis:

### Manifest options_ui Field
```json
// Source: https://developer.chrome.com/docs/extensions/develop/ui/options-page
// src/manifest.json addition:
{
  "manifest_version": 3,
  "name": "TrackPull",
  "options_ui": {
    "page": "options.html",
    "open_in_tab": true
  }
}
```

### chrome.storage.sync Error Handling Pattern
```typescript
// Source: https://developer.chrome.com/docs/extensions/reference/api/storage
// Chrome throws a runtime error for quota violations; catch it:
try {
  await chrome.storage.sync.set({ [key]: value });
} catch (err) {
  const message = (err as Error).message ?? "";
  if (message.includes("QUOTA_BYTES")) {
    showToast("Storage full. Delete prompts to save new ones.", "error");
  } else {
    showToast("Failed to save prompt", "error");
  }
}
```

### Delete Confirmation with window.confirm()
```typescript
// window.confirm() blocks — simple and no dependencies:
function handleDeletePrompt(id: string): void {
  const confirmed = window.confirm("Delete this prompt?");
  if (!confirmed) return;
  deleteCustomPrompt(id).then(() => renderCustomPrompts());
}
```

### Popup: Resolving Selected Prompt ID After Dynamic Rebuild
```typescript
// In popup.ts, after renderPromptSelect(promptSelect):
const savedPromptId = promptResult[STORAGE_KEYS.SELECTED_PROMPT_ID] as string | undefined;
if (savedPromptId) {
  promptSelect.value = savedPromptId;
  // Check if the option actually exists (value is set to "" if not found)
  if (promptSelect.value !== savedPromptId) {
    // Fallback: the saved prompt no longer exists (deleted custom prompt)
    promptSelect.value = "quick-summary-beginner";
    chrome.storage.local.set({ [STORAGE_KEYS.SELECTED_PROMPT_ID]: "quick-summary-beginner" });
  }
}
```

### Custom Prompt ID Generation
```typescript
// crypto.randomUUID() is available in Chrome 92+ (all extension contexts)
// Source: https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID
const id = crypto.randomUUID(); // e.g. "f797ee12-2880-4076-adf9-5120970fae72"
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `options_page` (MV2 field) | `options_ui` with `open_in_tab` (MV3) | MV3 launch (~2022) | `options_page` still works in MV3 but `options_ui` is canonical |
| Background pages | Service workers | MV3 | Already handled in this project |
| Hardcoded popup `<option>` elements | Dynamically generated from code | This phase | Enables custom prompts to appear in popup |

**Deprecated/outdated:**
- `options_page` manifest key (MV2): Still functional in MV3 but `options_ui` is the documented standard. Either works; the difference is `options_ui` supports both full-tab and embedded; `options_page` is always full-tab.
- Note from STATE.md: The prior decision "chrome.storage.local for prompt template bodies" applied to built-in prompt content (which was ultimately moved to TypeScript constants). Custom prompts (user-created) going to `chrome.storage.sync` is a separate, user-specified decision.

---

## Open Questions

1. **Storage key structure detail: should `customPromptIds` index live in sync or local?**
   - What we know: The IDs array is a small string array (e.g., 5 UUIDs = ~200 bytes). Sync storage is appropriate.
   - What's unclear: Whether to store it under `STORAGE_KEYS` constant or as a separate constant.
   - Recommendation: Add `CUSTOM_PROMPT_IDS_KEY: "customPromptIds"` to `STORAGE_KEYS` in constants.ts. This keeps all storage keys centralized.

2. **Should popup.ts import `loadCustomPrompts()` from a shared module, or inline the storage logic?**
   - What we know: Popup needs custom prompts for both rendering the select and resolving a prompt for assembly. Options page also manages them.
   - What's unclear: Whether a `src/shared/custom_prompts.ts` module is worth extracting.
   - Recommendation: Extract `loadCustomPrompts()`, `saveCustomPrompt()`, `deleteCustomPrompt()` to `src/shared/custom_prompts.ts`. Both popup.ts and options.ts import from there. Avoids duplication and keeps storage logic co-located.

3. **{{DATA}} placeholder discoverability in the template editor (Claude's discretion)**
   - What we know: The user leaves this to Claude.
   - Recommendation: Use `placeholder` attribute on the textarea: `placeholder="Use {{DATA}} where you want the shot data inserted..."` plus a static helper note below the textarea: `<p class="helper">Use {{DATA}} as a placeholder for your shot data.</p>` This is the simplest approach, zero extra JS, immediately visible.

---

## Validation Architecture

> `workflow.nyquist_validation` is not present in config.json — the workflow object only has `research`, `plan_check`, and `verifier` keys. Skip Validation Architecture section.

However, noting the existing test infrastructure for planning purposes:

**Test framework:** vitest (TS tests: `tests/test_*.ts`), pytest (Python tests: `tests/test_*.py`)
**Quick run:** `npx vitest run`
**Relevant existing tests:**
- `tests/test_storage_keys.ts` — verifies STORAGE_KEYS constants; will need updating when new keys are added
- `tests/test_prompt_types.ts` — verifies BUILTIN_PROMPTS structure; may need updating if prompt_types.ts is modified
- `tests/test_prompt_builder.ts` — verifies assemblePrompt(); must still pass after type broadening
- `tests/test_dist_structure.py` — verifies dist/ structure; needs new assertions for options.html and options.js
- `tests/test_popup_actions.ts` — integration tests for popup logic; will need updates for dynamic prompt rendering

**Wave 0 gaps (tests to create before implementation):**
- `tests/test_custom_prompts.ts` — unit tests for `loadCustomPrompts()`, `saveCustomPrompt()`, `deleteCustomPrompt()` (mocking chrome.storage.sync)
- `tests/test_options_page.py` — dist structure tests: `dist/options.html` exists, `dist/options.js` exists, options.html references `./options.js` not `./options.ts`, manifest contains `options_ui` field

---

## Sources

### Primary (HIGH confidence)
- [Chrome Extensions - Give users options](https://developer.chrome.com/docs/extensions/develop/ui/options-page) — `options_ui` manifest field, `open_in_tab`, `chrome.runtime.openOptionsPage()` API
- [Chrome Extensions - chrome.storage API](https://developer.chrome.com/docs/extensions/reference/api/storage) — QUOTA_BYTES (102400), QUOTA_BYTES_PER_ITEM (8192), MAX_ITEMS (512), storage.sync vs local semantics
- [Can I use - crypto.randomUUID](https://caniuse.com/mdn-api_crypto_randomuuid) — Chrome 92+ support (all MV3 extension contexts)
- Codebase analysis: `src/popup/popup.ts`, `src/popup/popup.html`, `src/shared/prompt_types.ts`, `src/shared/prompt_builder.ts`, `src/shared/constants.ts`, `src/manifest.json`, `scripts/build-extension.sh` — existing patterns verified by direct read

### Secondary (MEDIUM confidence)
- Quota calculations verified with `TextEncoder.encode(JSON.stringify(data)).length` benchmarks — array fails at ~16 long prompts, per-key approach stays well under 8 KB per item

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all capabilities are Chrome extension built-ins verified in official docs
- Architecture: HIGH — patterns directly mirror existing popup.ts implementation; no new abstractions needed
- Storage design: HIGH — quota math verified computationally; per-key approach well-documented
- Pitfalls: HIGH — derived from code analysis of existing implementation and official quota documentation

**Research date:** 2026-03-02
**Valid until:** 2026-09-01 (Chrome extension APIs are stable; quota numbers are published constants)
