# Phase 7: Options Page and Custom Prompts - Context

**Gathered:** 2026-03-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Dedicated settings page where users create, edit, and delete custom prompt templates. Built-in prompts displayed read-only. AI service default preference managed here. Custom prompts appear in the popup's prompt selector alongside built-ins. Requirements: PRMT-03, PRMT-04, PREF-02.

</domain>

<decisions>
## Implementation Decisions

### Options page layout
- Single scroll page with section headers (no tabs)
- Cleaner settings-page style — same TrackPull color palette (#1976d2 blue accent) but wider layout, more whitespace, full-page feel (like Chrome's own settings)
- Two main sections: Prompts (top) and AI Preferences (bottom)
- Navigation to options page via gear icon in popup header AND Chrome's built-in right-click extension menu (options_ui in manifest provides this automatically)

### Prompt editing experience
- Inline form below the prompt list — "+ New Prompt" button expands a form with name and template fields directly below the list; editing replaces the prompt row with the form inline
- Custom prompt fields: Name + Template body only (no tier, topic, or category)
- Delete requires a confirm dialog before removal ("Delete this prompt?")

### Popup integration
- Custom prompts appear in a "My Prompts" `<optgroup>` at the TOP of the prompt selector, above built-in tier groups
- Popup loads custom prompts fresh on each open (no live sync listener between options page and popup)
- If the user's last-selected prompt was deleted, fall back to the first built-in prompt (Quick Session Summary)
- Fully dynamic rendering — rebuild the entire `<select>` dropdown from code on popup load (built-in prompts from BUILTIN_PROMPTS array + custom prompts from storage). Remove the current hardcoded `<option>` elements from popup.html

### Data & storage
- Custom prompts stored in chrome.storage.sync (syncs across devices via Chrome account)
- No explicit limit on custom prompt count — let storage quota (~100KB) be the natural constraint; show error on save if quota exceeded
- Custom prompts use the same {{DATA}} placeholder and assemblePrompt() logic as built-in prompts — consistent behavior
- AI service preference lives in both places: options page sets the default, popup dropdown allows quick per-session override (already using chrome.storage.sync for AI service)

### Claude's Discretion
- Built-in prompt display style on options page (collapsed list vs cards vs other)
- {{DATA}} placeholder discoverability in the template editor (placeholder text, auto-insert, helper note, etc.)
- Exact spacing, typography, and whitespace for the settings page
- Custom prompt storage key structure and ID generation

</decisions>

<specifics>
## Specific Ideas

No specific references — open to standard approaches. Page should feel like a real settings page, not a cramped popup extension.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `BUILTIN_PROMPTS` array (src/shared/prompt_types.ts): 8 built-in prompts with id, name, tier, topic, template — options page reads this for the read-only list
- `assemblePrompt()` (src/shared/prompt_builder.ts): handles {{DATA}} replacement + metadata header — extend to accept custom prompts (needs type broadening from BuiltInPrompt)
- `STORAGE_KEYS` (src/shared/constants.ts): central storage key registry — add custom prompt storage key here
- Toast pattern (src/popup/popup.ts): `showToast()` function for success/error feedback — replicate or extract for options page
- Existing `options_ui` / `options_page` NOT in manifest — must be added

### Established Patterns
- Vanilla TypeScript with plain DOM manipulation (no framework) — options page follows this
- esbuild IIFE bundles per entry point — options page needs new entry in build script
- chrome.storage.sync for cross-device preferences (already used for AI service selection)
- chrome.storage.local for session-specific data (shot data, unit prefs)
- DOMContentLoaded + async IIFE pattern for initialization (popup.ts)

### Integration Points
- src/manifest.json: add `options_ui` field pointing to options.html
- scripts/build-extension.sh: add esbuild entry for options page TS → JS
- src/popup/popup.ts: refactor prompt `<select>` rendering to be fully dynamic (load BUILTIN_PROMPTS + custom prompts from storage)
- src/popup/popup.html: remove hardcoded `<option>` elements, add gear icon for settings navigation
- src/shared/prompt_builder.ts: `assemblePrompt()` signature may need to accept a broader type (custom prompts lack tier/topic)
- src/shared/constants.ts: add STORAGE_KEYS entry for custom prompts

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-options-page-and-custom-prompts*
*Context gathered: 2026-03-02*
