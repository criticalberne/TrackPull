# Phase 6: Clipboard Copy and AI Launch - Context

**Gathered:** 2026-03-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can copy their shot data to clipboard and launch AI analysis in one click from the popup. This phase adds clipboard copy (TSV), prompt selector with skill-tiered built-in prompts, AI service picker with persistence, and "Open in AI" / "Copy Prompt + Data" actions. Foundation modules (tsv_writer, prompt_types, prompt_builder) are ready from Phase 5. Custom prompt creation belongs in Phase 7.

</domain>

<decisions>
## Implementation Decisions

### Popup layout & sections
- Stacked sections top-to-bottom: Data Status (shot count + units) -> Export (CSV + Copy TSV) -> AI Analysis (prompt picker, service picker, launch buttons) -> Clear Session Data at bottom
- AI section and Copy TSV button hidden until shot data exists (matches existing Export CSV pattern)
- Export CSV and Copy TSV buttons side-by-side in one row (flex layout, equal width)
- Section visual separation style is Claude's discretion (divider lines, card containers, or similar)

### Prompt selector design
- Grouped `<select>` dropdown with `<optgroup>` labels per skill tier (Beginner, Intermediate, Advanced)
- 8 built-in prompts: 3 beginner, 3 intermediate, 2 advanced
- Last-selected prompt remembered in chrome.storage and restored on popup open
- First-time default: Quick Session Summary (beginner) — fast, low-commitment results
- No preview panel — prompt names are descriptive enough; preview is a v2 feature

### AI service picker & defaults
- `<select>` dropdown with three options: ChatGPT, Claude, Gemini
- Positioned above or next to the "Open in AI" button
- Auto-save on dropdown change — persists to chrome.storage immediately (matches unit selector pattern)
- First-time default: ChatGPT — most widely recognized
- Opens chat home pages: chatgpt.com, claude.ai, gemini.google.com (no fragile deep-link URLs)

### Button actions & grouping
- "Open in AI" is the primary action — filled blue button (#1976d2), copies prompt+data to clipboard and opens selected AI service in new tab
- "Copy Prompt + Data" is secondary — outline/ghost button (blue border + blue text, transparent background), copies prompt+data without opening a tab
- Action-specific toast messages: "Shot data copied!" (Copy TSV), "Prompt + data copied — paste into [AI name]" (Open in AI), "Prompt + data copied!" (Copy only)
- Toast-only confirmation — no button label changes; consistent with existing Export CSV behavior

### Claude's Discretion
- Section visual separation style (dividers, cards, or similar)
- Exact button sizing and spacing within flex rows
- Toast timing (existing pattern: 3s success, 5s error)
- Storage key names for prompt selection and AI service preference

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `writeTsv()` (src/shared/tsv_writer.ts): Produces tab-separated output with column headers and unit labels — ready for clipboard copy
- `BUILTIN_PROMPTS` (src/shared/prompt_types.ts): 8 prompts with id, name, tier, topic, template fields — ready for dropdown population
- `assemblePrompt()` (src/shared/prompt_builder.ts): Combines prompt template + TSV data with optional metadata header — ready for clipboard payload
- `buildUnitLabel()` and `countSessionShots()` (src/shared/prompt_builder.ts): Helpers for metadata assembly
- `showToast()` (src/popup/popup.ts): Existing toast notification system with success/error types and slide animation
- `showStatusMessage()` (src/popup/popup.ts): Existing status message display

### Established Patterns
- Chrome storage for preferences: `chrome.storage.local.set/get` with `STORAGE_KEYS` constants — add new keys for prompt selection and AI service
- Auto-save on dropdown change: Unit selectors already persist immediately on change event — same pattern for AI service and prompt selection
- Button styling: Full-width buttons with `#1976d2` primary color, `#f44336` for destructive (clear), `:hover` and `:disabled` states defined
- Message routing: Popup sends messages to service worker via `chrome.runtime.sendMessage` — may need for clipboard operations if `navigator.clipboard` isn't available in popup context
- Visibility toggling: Export button uses `style.display = "block" | "none"` based on data availability

### Integration Points
- `src/popup/popup.html`: Add new HTML sections for Export row (side-by-side CSV + Copy TSV), AI Analysis section (prompt dropdown, service dropdown, action buttons)
- `src/popup/popup.ts`: Add event handlers for new buttons, import tsv_writer/prompt_types/prompt_builder modules, add storage read/write for new preferences
- `src/shared/constants.ts`: Add new STORAGE_KEYS for prompt selection and AI service preference
- `src/manifest.json`: May need `clipboardWrite` permission if not already present
- `scripts/build-extension.sh`: Popup bundle already includes shared/ modules via esbuild — new imports should resolve automatically

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-clipboard-copy-and-ai-launch*
*Context gathered: 2026-03-02*
