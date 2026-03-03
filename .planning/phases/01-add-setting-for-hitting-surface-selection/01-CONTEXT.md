# Phase 1: Add Setting for Hitting Surface Selection - Context

**Gathered:** 2026-03-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Add a user-selectable hitting surface preference (Grass or Mat) to the extension popup. The surface is included as metadata in CSV/TSV exports and auto-injected into AI prompts for analysis context.

</domain>

<decisions>
## Implementation Decisions

### Surface options
- Two surfaces: Grass, Mat
- Simple display labels (no descriptions/parentheticals)
- Global default only — no per-session override
- Default on install: Grass

### Setting location
- Popup only — dropdown grouped with existing speed/distance unit dropdowns
- Label: "Surface"
- Not on options page

### How surface is used
- CSV export: included as metadata header line (e.g., "Hitting Surface: Grass") — not a column
- TSV clipboard copy: same treatment as CSV, metadata header included
- AI prompts: auto-injected as context metadata (e.g., "Hitting surface: Grass")

### Storage & defaults
- chrome.storage.local (same as speed/distance units)
- Always set — no "None" / unset option
- Default: Grass

### Claude's Discretion
- Exact placement order within the unit dropdowns group
- Storage key naming convention (follow existing STORAGE_KEYS pattern)
- How metadata header is formatted in CSV/TSV output
- How surface context is formatted in AI prompt assembly

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches matching existing patterns.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `STORAGE_KEYS` in `src/shared/constants.ts`: centralized storage key registry — add HITTING_SURFACE key here
- Speed/distance dropdown pattern in `src/popup/popup.ts` (lines 87-129): read from storage, restore selection, save on change, update cache
- `src/popup/popup.html`: existing dropdown HTML structure for unit selectors

### Established Patterns
- Settings stored via `chrome.storage.local.get/set` with typed STORAGE_KEYS constants
- Popup reads saved prefs at DOMContentLoaded, caches locally, saves on dropdown change
- `cachedUnitChoice` pattern: pre-fetch for synchronous clipboard access
- `writeTsv()` and CSV export path both receive `cachedUnitChoice` — surface can follow same pattern

### Integration Points
- `src/shared/constants.ts` STORAGE_KEYS: add new key
- `src/popup/popup.ts`: add dropdown handler matching speed/distance pattern
- `src/popup/popup.html`: add dropdown element in settings area
- `src/shared/csv_writer.ts`: inject surface metadata header
- `src/shared/tsv_writer.ts`: inject surface metadata header
- `src/shared/prompt_builder.ts`: inject surface into assembled prompt metadata
- `src/background/serviceWorker.ts`: read surface from storage for CSV export

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-add-setting-for-hitting-surface-selection*
*Context gathered: 2026-03-02*
