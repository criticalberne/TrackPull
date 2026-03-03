# Phase 1: Add Setting for Hitting Surface Selection - Research

**Researched:** 2026-03-02
**Domain:** Chrome extension storage, popup UI, CSV/TSV metadata, AI prompt assembly
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Surface options:**
- Two surfaces: Grass, Mat
- Simple display labels (no descriptions/parentheticals)
- Global default only — no per-session override
- Default on install: Mat

**Setting location:**
- Popup only — dropdown grouped with existing speed/distance unit dropdowns
- Label: "Surface"
- Not on options page

**How surface is used:**
- CSV export: included as metadata header line (e.g., "Hitting Surface: Grass") — not a column
- TSV clipboard copy: same treatment as CSV, metadata header included
- AI prompts: auto-injected as context metadata (e.g., "Hitting surface: Grass")

**Storage & defaults:**
- chrome.storage.local (same as speed/distance units)
- Always set — no "None" / unset option
- Default: Mat

### Claude's Discretion
- Exact placement order within the unit dropdowns group
- Storage key naming convention (follow existing STORAGE_KEYS pattern)
- How metadata header is formatted in CSV/TSV output
- How surface context is formatted in AI prompt assembly

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

## Summary

Phase 1 adds a hitting surface preference (Grass or Mat) to the TrackPull extension popup. The surface value is stored in `chrome.storage.local`, loaded at popup init alongside speed/distance units, and threaded through three output paths: CSV export, TSV clipboard copy, and AI prompt assembly. The work is additive — no existing behavior changes, only new surface metadata is injected.

The codebase has a mature, consistent pattern for exactly this kind of preference: STORAGE_KEYS constant, popup dropdown handler with local cache, and the value passed into write functions. The surface follows that exact pattern. The only new design decision is the metadata header format for CSV/TSV (user left this to Claude) and how surface is formatted in the AI prompt context header.

The CSV path has an important split: the popup drives TSV clipboard writes synchronously, but CSV export is handled by `src/background/serviceWorker.ts` which reads storage independently. Surface must be fetched in both places.

**Primary recommendation:** Model the surface preference exactly after the speed/distance unit pattern. Add `HITTING_SURFACE` to `STORAGE_KEYS`, add a `cachedSurface` variable in popup alongside `cachedUnitChoice`, fetch surface in the same storage.get call, and pass it as a parameter through `writeCsv`, `writeTsv`, and `assemblePrompt`. No new abstractions needed.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| chrome.storage.local | Chrome MV3 built-in | Persist surface preference | Same API used for all other prefs in this extension |
| TypeScript | Project standard | Type safety for new surface type | All source files are TypeScript |
| vitest | ^4.0.18 | Unit tests | Existing test framework |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| esbuild (via build script) | Existing | Bundle dist/popup.js, dist/background.js | Run after any source change |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| chrome.storage.local | chrome.storage.sync | sync would persist across devices, but user decided local to match speed/distance; local is the locked decision |

**Installation:** No new packages needed. All dependencies already exist.

## Architecture Patterns

### Recommended Project Structure

No new directories. Changes touch existing files only:

```
src/
├── shared/
│   ├── constants.ts         # Add HITTING_SURFACE to STORAGE_KEYS
│   ├── csv_writer.ts        # Add hittingSurface param, prepend metadata header
│   ├── tsv_writer.ts        # Add hittingSurface param, prepend metadata header
│   └── prompt_builder.ts    # Add surface to PromptMetadata, inject into context header
├── popup/
│   ├── popup.ts             # Add dropdown handler + cachedSurface variable
│   └── popup.html           # Add Surface dropdown in .unit-selectors group
└── background/
    └── serviceWorker.ts     # Read HITTING_SURFACE from storage in EXPORT_CSV_REQUEST handler
tests/
└── test_hitting_surface.ts  # New test file covering CSV/TSV metadata injection and storage key
```

### Pattern 1: Storage Key Registration

**What:** All chrome.storage.local keys used by the extension are registered in `STORAGE_KEYS` in `src/shared/constants.ts`. This ensures popup and service worker reference the same string keys without duplication.

**When to use:** Any new persistent preference.

**Example (existing pattern to follow):**
```typescript
// src/shared/constants.ts
export const STORAGE_KEYS = {
  TRACKMAN_DATA: "trackmanData",
  SPEED_UNIT: "speedUnit",
  DISTANCE_UNIT: "distanceUnit",
  SELECTED_PROMPT_ID: "selectedPromptId",
  AI_SERVICE: "aiService",
  HITTING_SURFACE: "hittingSurface",  // ADD THIS
} as const;
```

Storage value type: `"Grass" | "Mat"`. Default: `"Mat"`.

### Pattern 2: Popup Dropdown Handler with Local Cache

**What:** The popup reads saved preferences at DOMContentLoaded, caches them in module-level variables for synchronous access during button clicks, and saves back to storage on dropdown change. Surface follows the same flow.

**When to use:** Any preference that needs to be available synchronously when a button is clicked (before focus-loss clears async ability).

**Example (existing pattern, lines 87-129 of popup.ts):**
```typescript
// Module-level cache (add alongside existing)
let cachedSurface: "Grass" | "Mat" = "Mat";

// Inside DOMContentLoaded handler, in the same storage.get call as speed/distance:
const unitResult = await new Promise<Record<string, unknown>>((resolve) => {
  chrome.storage.local.get([
    STORAGE_KEYS.SPEED_UNIT,
    STORAGE_KEYS.DISTANCE_UNIT,
    STORAGE_KEYS.HITTING_SURFACE,
    "unitPreference"
  ], resolve);
});

// Resolve surface (with default):
const surface = (unitResult[STORAGE_KEYS.HITTING_SURFACE] as "Grass" | "Mat") ?? "Mat";
cachedSurface = surface;

// Dropdown restore + save:
const surfaceSelect = document.getElementById("surface-select") as HTMLSelectElement | null;
if (surfaceSelect) {
  surfaceSelect.value = surface;
  surfaceSelect.addEventListener("change", () => {
    chrome.storage.local.set({ [STORAGE_KEYS.HITTING_SURFACE]: surfaceSelect.value });
    cachedSurface = surfaceSelect.value as "Grass" | "Mat";
  });
}
```

### Pattern 3: Surface Dropdown HTML

**What:** Add Surface dropdown inside `.unit-selectors` div, which already lays out Speed and Distance as flex items. Surface becomes a third `unit-group` in the same container.

**Placement decision (Claude's discretion):** Add Surface as the third item after Distance, since it's conceptually different from unit preferences but fits the same UI group as a per-session context setting.

**Example:**
```html
<div class="unit-selectors">
  <div class="unit-group">
    <label for="speed-unit">Speed</label>
    <select id="speed-unit">
      <option value="mph">mph</option>
      <option value="m/s">m/s</option>
    </select>
  </div>
  <div class="unit-group">
    <label for="distance-unit">Distance</label>
    <select id="distance-unit">
      <option value="yards">yards</option>
      <option value="meters">meters</option>
    </select>
  </div>
  <div class="unit-group">
    <label for="surface-select">Surface</label>
    <select id="surface-select">
      <option value="Mat">Mat</option>
      <option value="Grass">Grass</option>
    </select>
  </div>
</div>
```

Note: Mat listed first since it is the default. The `<option>` order controls visual display; the HTML default selected is the first option, which will be overridden by the JS restore logic anyway.

### Pattern 4: CSV Metadata Header

**What:** `writeCsv` currently returns only column headers + data rows. The user decided surface is a metadata header line, not a column. The metadata header line should appear before the column header row.

**Format decision (Claude's discretion):** Use the same colon-separated style visible in the user's own example: `"Hitting Surface: Mat"`. Consistent with the session context header in `assemblePrompt`.

**Implementation approach:**
```typescript
// src/shared/csv_writer.ts
export function writeCsv(
  session: SessionData,
  includeAverages = true,
  metricOrder?: string[],
  unitChoice: UnitChoice = DEFAULT_UNIT_CHOICE,
  hittingSurface?: "Grass" | "Mat"   // ADD optional param
): string {
  // ... existing logic ...

  const lines: string[] = [];

  // Prepend metadata header if surface provided
  if (hittingSurface !== undefined) {
    lines.push(`Hitting Surface: ${hittingSurface}`);
  }

  lines.push(headerRow.join(","));
  // ... data rows ...

  return lines.join("\n");
}
```

Making the parameter optional (`hittingSurface?: "Grass" | "Mat"`) preserves backwards compatibility for existing tests.

### Pattern 5: TSV Metadata Header (same approach as CSV)

**What:** `writeTsv` should prepend the same metadata header as CSV. User decision: "same treatment as CSV."

**Format decision (Claude's discretion):** Use `"Hitting Surface: Mat"` — identical to CSV for consistency. The metadata line is plain text, not tab-separated, which is fine as it precedes the column header row and AI tools will parse it as context text, not table data.

```typescript
// src/shared/tsv_writer.ts
export function writeTsv(
  session: SessionData,
  unitChoice: UnitChoice = DEFAULT_UNIT_CHOICE,
  hittingSurface?: "Grass" | "Mat"   // ADD optional param
): string {
  // ... existing logic ...

  const parts: string[] = [];
  if (hittingSurface !== undefined) {
    parts.push(`Hitting Surface: ${hittingSurface}`);
  }
  parts.push(headerRow);
  parts.push(...rows);

  return parts.join("\n");
}
```

### Pattern 6: AI Prompt Context Header

**What:** `assemblePrompt` in `prompt_builder.ts` builds a context header line:
`"Session: {date} | {shotCount} shots | Units: {unitLabel}"`

Surface should be added to `PromptMetadata` and injected into this same line.

**Format decision (Claude's discretion):** Extend the existing pipe-separated context header pattern:
`"Session: {date} | {shotCount} shots | Units: {unitLabel} | Surface: {surface}"`

This keeps all context on one line, consistent with the existing format.

```typescript
// src/shared/prompt_builder.ts
export interface PromptMetadata {
  date: string;
  shotCount: number;
  unitLabel: string;
  hittingSurface?: "Grass" | "Mat";   // ADD optional field
}

export function assemblePrompt(
  prompt: PromptItem,
  tsvData: string,
  metadata?: PromptMetadata
): string {
  let dataBlock: string;

  if (metadata !== undefined) {
    let contextHeader = `Session: ${metadata.date} | ${metadata.shotCount} shots | Units: ${metadata.unitLabel}`;
    if (metadata.hittingSurface !== undefined) {
      contextHeader += ` | Surface: ${metadata.hittingSurface}`;
    }
    dataBlock = contextHeader + "\n\n" + tsvData;
  } else {
    dataBlock = tsvData;
  }

  return prompt.template.replace("{{DATA}}", dataBlock);
}
```

Making `hittingSurface` optional preserves all existing tests.

### Pattern 7: Service Worker CSV Export Path

**What:** The CSV export is handled in `src/background/serviceWorker.ts`, not the popup. It reads storage independently. Surface must be fetched in the `EXPORT_CSV_REQUEST` handler alongside the existing unit keys.

**Example (extending existing storage.get call):**
```typescript
// src/background/serviceWorker.ts — EXPORT_CSV_REQUEST handler
chrome.storage.local.get(
  [STORAGE_KEYS.TRACKMAN_DATA, STORAGE_KEYS.SPEED_UNIT, STORAGE_KEYS.DISTANCE_UNIT, STORAGE_KEYS.HITTING_SURFACE, "unitPreference"],
  (result) => {
    // ... existing unit resolution ...
    const surface = (result[STORAGE_KEYS.HITTING_SURFACE] as "Grass" | "Mat") ?? "Mat";
    const csvContent = writeCsv(data, true, undefined, unitChoice, surface);
    // ...
  }
);
```

### Pattern 8: Popup Callers Pass Surface Through

**What:** In popup.ts, both TSV clipboard copy and AI prompt assembly call `writeTsv` and `assemblePrompt`. Both must pass `cachedSurface`.

```typescript
// Copy TSV button:
const tsvText = writeTsv(cachedData, cachedUnitChoice, cachedSurface);

// Open in AI / Copy Prompt button:
const metadata = {
  date: cachedData.date,
  shotCount: countSessionShots(cachedData),
  unitLabel: buildUnitLabel(cachedUnitChoice),
  hittingSurface: cachedSurface,
};
const assembled = assemblePrompt(prompt, tsvData, metadata);
```

### Anti-Patterns to Avoid

- **Reading surface from storage inside writeCsv/writeTsv:** These are pure functions. Keep them pure — always pass surface as a parameter. Storage reads belong in callers (popup.ts, serviceWorker.ts).
- **Treating surface as a data column:** User decided metadata header, not column. Do not add it to headerRow array.
- **Using separate storage.get for surface:** Batch surface with the existing unit preference fetch. Avoids an extra async round-trip and keeps initialization logic consolidated.
- **Not applying a default in serviceWorker.ts:** The service worker reads storage independently. If the key doesn't exist (fresh install before popup opened), it must default to "Mat" — same as popup.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Persisting a new preference | Custom storage wrapper | `chrome.storage.local.get/set` directly, same as speed/distance | Already proven in this codebase; no abstraction needed for 3 keys |
| Dropdown restore logic | Custom framework | Copy existing speed/distance pattern verbatim | Pattern is 15 lines and handles all edge cases already |
| Type definition for surface | Runtime validation | TypeScript union type `"Grass" | "Mat"` | Compile-time safety, zero overhead |

**Key insight:** This phase is essentially a copy-and-adapt of the speed/distance preference pattern. The codebase's existing patterns handle every requirement without new abstractions.

## Common Pitfalls

### Pitfall 1: Missing the Service Worker Storage Fetch

**What goes wrong:** Surface is cached in popup.ts but not fetched in serviceWorker.ts. Result: CSV export always omits surface metadata header, even though TSV clipboard works correctly.

**Why it happens:** The CSV export and TSV clipboard paths look similar in popup.ts, but CSV export actually delegates to the background service worker, which reads its own storage snapshot. The popup's `cachedSurface` is not accessible in the service worker context.

**How to avoid:** After updating popup.ts, immediately check serviceWorker.ts EXPORT_CSV_REQUEST handler. Confirm it reads HITTING_SURFACE in its own storage.get call.

**Warning signs:** TSV clipboard shows "Hitting Surface: Mat" but exported CSV does not contain the line.

### Pitfall 2: Breaking Existing Tests by Making Params Required

**What goes wrong:** Adding `hittingSurface` as a required parameter to `writeCsv` or `writeTsv` breaks all existing tests and callers that don't pass it.

**Why it happens:** The function signatures already have many existing call sites in tests.

**How to avoid:** Make `hittingSurface` optional (`hittingSurface?: "Grass" | "Mat"`). When undefined, omit the metadata header line entirely. All existing tests pass unmodified.

**Warning signs:** `npx vitest run` shows failures in `test_csv_writer_units.ts` or `test_tsv_writer.ts` immediately after the change.

### Pitfall 3: Breaking Existing `assemblePrompt` Tests

**What goes wrong:** Adding `hittingSurface` to `PromptMetadata` as required breaks `test_prompt_builder.ts`.

**Why it happens:** Tests construct `PromptMetadata` objects directly without a surface field.

**How to avoid:** Define `hittingSurface` as optional in `PromptMetadata`. Check it with `!== undefined` before appending to the context header. Existing tests omit it and the output stays identical.

**Warning signs:** `test_prompt_builder.ts` "prepends metadata header" tests fail because the context header string no longer matches.

### Pitfall 4: Forgetting to Rebuild dist/

**What goes wrong:** Source changes work in tests but the loaded Chrome extension uses old dist/popup.js and dist/background.js.

**Why it happens:** `dist/` is the built artifact committed to git. Source edits do not auto-rebuild.

**How to avoid:** Run `bash scripts/build-extension.sh` after all source changes and before committing. Verify popup.html, popup.js, background.js in dist/ are updated.

**Warning signs:** Extension reloaded in Chrome still shows old UI (only 2 dropdowns) after source changes.

### Pitfall 5: Popup Width Overflow with Three Dropdowns

**What goes wrong:** Adding a third dropdown to `.unit-selectors` (a flex row with `gap: 12px`) causes the popup to exceed its minimum width or the dropdowns to become too narrow to read.

**Why it happens:** `.unit-selectors` is a flex row. Three equal-width items in a 320px minimum popup leaves ~90px per dropdown after gaps. Labels like "Mat" and "Grass" still fit, but long option text would not.

**How to avoid:** Surface values are "Mat" and "Grass" — both short. Three items at flex:1 in 320px works fine. Verify visually after building. If layout breaks, consider adjusting font-size or gap.

**Warning signs:** Dropdown labels get clipped; popup expands beyond 320px min-width.

## Code Examples

Verified patterns from actual source files:

### Storage key constant pattern
```typescript
// src/shared/constants.ts (lines 143-149)
export const STORAGE_KEYS = {
  TRACKMAN_DATA: "trackmanData",
  SPEED_UNIT: "speedUnit",
  DISTANCE_UNIT: "distanceUnit",
  SELECTED_PROMPT_ID: "selectedPromptId",
  AI_SERVICE: "aiService",
} as const;
```

### Popup preference load pattern (lines 88-129 of popup.ts)
```typescript
const unitResult = await new Promise<Record<string, unknown>>((resolve) => {
  chrome.storage.local.get([STORAGE_KEYS.SPEED_UNIT, STORAGE_KEYS.DISTANCE_UNIT, "unitPreference"], resolve);
});
// ... resolve with migration logic ...
const speedSelect = document.getElementById("speed-unit") as HTMLSelectElement | null;
if (speedSelect) {
  speedSelect.value = speedUnit;
  speedSelect.addEventListener("change", () => {
    chrome.storage.local.set({ [STORAGE_KEYS.SPEED_UNIT]: speedSelect.value });
    cachedUnitChoice = { ...cachedUnitChoice, speed: speedSelect.value as "mph" | "m/s" };
  });
}
```

### Service worker storage fetch for CSV export (lines 65-82 of serviceWorker.ts)
```typescript
chrome.storage.local.get(
  [STORAGE_KEYS.TRACKMAN_DATA, STORAGE_KEYS.SPEED_UNIT, STORAGE_KEYS.DISTANCE_UNIT, "unitPreference"],
  (result) => {
    // ... resolve unit preference ...
    const csvContent = writeCsv(data, true, undefined, unitChoice);
    // ...
  }
);
```

### writeCsv current signature (line 78 of csv_writer.ts)
```typescript
export function writeCsv(
  session: SessionData,
  includeAverages = true,
  metricOrder?: string[],
  unitChoice: UnitChoice = DEFAULT_UNIT_CHOICE
): string {
```

### writeTsv current signature (line 73 of tsv_writer.ts)
```typescript
export function writeTsv(
  session: SessionData,
  unitChoice: UnitChoice = DEFAULT_UNIT_CHOICE
): string {
```

### assemblePrompt current metadata header (lines 35-38 of prompt_builder.ts)
```typescript
const contextHeader = `Session: ${metadata.date} | ${metadata.shotCount} shots | Units: ${metadata.unitLabel}`;
dataBlock = contextHeader + "\n\n" + tsvData;
```

### Test factory pattern to model new tests after (test_csv_writer_units.ts)
```typescript
function makeSession(
  metrics: Record<string, string | number>,
  metricNames: string[],
  metadataParams: Record<string, string> = { nd_001: "789012" }
): SessionData { ... }

describe("CSV Writer: ...", () => {
  it("...", () => {
    const session = makeSession({ ClubSpeed: "44.704" }, ["ClubSpeed"]);
    const csv = writeCsv(session, false, undefined, imperial);
    const header = csv.split("\n")[0];
    expect(header).toContain("Club Speed (mph)");
  });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single "unitPreference" string in storage | Separate SPEED_UNIT and DISTANCE_UNIT keys with migration logic | v1.3 Phase 5 | HITTING_SURFACE follows the new separate-key pattern; no migration needed since it's brand new |

**Deprecated/outdated:**
- `"unitPreference"` key: Legacy; migration code still in codebase but HITTING_SURFACE should not use this pattern.

## Open Questions

1. **Metadata header placement in CSV: before or after BOM / before column headers?**
   - What we know: Current `writeCsv` output is `headerRow\ndata rows`. No BOM. User said metadata header line, e.g. "Hitting Surface: Grass".
   - What's unclear: If a consumer opens the CSV in Excel, a non-column first line may confuse simple parsers.
   - Recommendation: Prepend as the very first line before the column header row. This is the conventional approach for metadata in CSVs (e.g., git log --format CSVs, Trackman's own exports). It's what the user described and the user is the primary consumer.

2. **Should surface be stored on first popup open or only when user explicitly picks one?**
   - What we know: User said "Always set — no None/unset option" and "Default: Mat."
   - What's unclear: Whether to write "Mat" to storage on first load (if key missing) or just default in memory.
   - Recommendation: Default in memory (`?? "Mat"`) without writing to storage until user changes the dropdown. This matches the current speed/distance pattern: migration writes when key is missing, but a fresh install doesn't need a write-on-read. The service worker also defaults to "Mat" when key is missing. This is simpler and avoids an unnecessary write on first load.

## Validation Architecture

`workflow.nyquist_validation` is not set in `.planning/config.json` — this section is skipped.

## Sources

### Primary (HIGH confidence)
- Direct source code read: `src/shared/constants.ts` — STORAGE_KEYS pattern, lines 143-149
- Direct source code read: `src/popup/popup.ts` — dropdown load/cache/save pattern, lines 87-129
- Direct source code read: `src/popup/popup.html` — .unit-selectors structure, lines 307-322
- Direct source code read: `src/shared/csv_writer.ts` — writeCsv signature and output format
- Direct source code read: `src/shared/tsv_writer.ts` — writeTsv signature and output format
- Direct source code read: `src/shared/prompt_builder.ts` — PromptMetadata, assemblePrompt, context header format
- Direct source code read: `src/background/serviceWorker.ts` — EXPORT_CSV_REQUEST storage fetch, lines 64-108
- Direct source code read: `.planning/codebase/CONVENTIONS.md` — naming, style patterns
- Direct source code read: `.planning/codebase/TESTING.md` — vitest setup, test file naming, factory patterns
- Direct source code read: `.planning/config.json` — workflow.nyquist_validation not present
- Direct source read: `01-CONTEXT.md` — all user decisions

### Secondary (MEDIUM confidence)
- N/A — all research is from direct codebase inspection, no external sources needed

### Tertiary (LOW confidence)
- N/A

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — entire stack verified by reading actual source files
- Architecture: HIGH — all integration points confirmed by reading the actual code at the exact lines
- Pitfalls: HIGH — derived from direct inspection of existing patterns and failure modes; no speculation needed
- Code examples: HIGH — all examples copied from or derived directly from actual source

**Research date:** 2026-03-02
**Valid until:** 2026-04-02 (stable codebase; no external dependencies to track)
