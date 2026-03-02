# Phase 5: Foundation Modules - Research

**Researched:** 2026-03-02
**Domain:** TypeScript module authoring — TSV generation, prompt template constants, prompt+data assembly
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- Three skill tiers: Beginner / Intermediate / Advanced — matches PRMT-02 requirement for the Phase 6 skill-tiered dropdown
- Mix of coaching-style feedback AND data interpretation prompts across the library — some prompts give actionable swing advice, others explain what the numbers mean
- Tier-matched tone: Beginner prompts use friendly coach tone ("Nice work on X, let's sharpen Y"), Advanced prompts use technical analyst tone (data-driven, numbers-first)
- Prompt topics (7+ required):
  - General session overview — "tell me how I did today" go-to prompt
  - Club-by-club breakdown — compare performance across clubs, strengths, weaknesses, distance gaps
  - Consistency analysis — shot dispersion, repeatability patterns
  - Claude picks the remaining 4+ topics to reach 7+ total, based on what Trackman metrics can reveal
- TSV output — shots only: no averages or consistency rows; AI can compute its own stats from raw shots
- Include unit labels in column headers (e.g., "Club Speed (mph)") — self-documenting data, matches existing csv_writer.ts pattern
- Same column ordering as CSV — reuse METRIC_COLUMN_ORDER from csv_writer.ts for consistency

### Claude's Discretion

- TSV column scope: whether to include Date and Type columns, or just Club + Shot # + metrics — pick what works best for spreadsheet paste and AI payload
- Prompt template structure: placeholder tokens (e.g., `{{DATA}}`) vs simple concatenation — pick what's cleanest for the builder module
- Data payload assembly: how prompt + TSV combine into the final string, what context metadata to include (date, unit system, shot count), delimiter between prompt and data block
- Exact prompt wording for each of the 7+ built-in prompts
- Which additional topics beyond the 3 specified to reach 7+ total

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PRMT-01 | Extension ships with 7+ built-in golf analysis prompts bundled as code constants | Prompt library pattern using TypeScript `as const` array; tiered structure with skill-matched tone documented in Architecture Patterns section |
</phase_requirements>

## Summary

Phase 5 produces three new files in `src/shared/`: a TSV writer (`tsv_writer.ts`), a prompt library (`prompt_types.ts`), and a prompt builder (`prompt_builder.ts`). All three are pure TypeScript with no external dependencies and follow existing patterns established in `csv_writer.ts` and `unit_normalization.ts`. The codebase already has every reusable primitive needed: `METRIC_COLUMN_ORDER`, `getColumnName()`, `normalizeMetricValue()`, `getApiSourceUnitSystem()`, and the `SessionData` / `ClubGroup` / `Shot` types.

The TSV writer is a near-direct port of `csv_writer.ts` with three changes: tab delimiter instead of comma, shots-only rows (no averages/consistency), and no CSV escaping for commas (only tabs and newlines need escaping). The prompt library is a typed constant array — no runtime logic, no storage. The prompt builder performs simple string assembly: prompt text + optional metadata header + TSV data block.

**Primary recommendation:** Mirror `csv_writer.ts` closely for the TSV writer. Use a typed `BUILTIN_PROMPTS` constant array (not a Map or object) so Phase 6 can iterate by tier with a simple `.filter()`. Keep the prompt builder as a pure function — input prompt template + TSV string → output assembled string.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript (project) | ^5.9.3 | Type-safe module authoring | Already the project language; esbuild compilation already configured |
| vitest | ^4.0.18 | Unit testing | Already installed and configured; test pattern is `tests/test_*.ts` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none) | — | No new dependencies needed | All required primitives exist in `src/shared/`; zero-dependency policy is established |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Plain `BUILTIN_PROMPTS` array | `Map<string, BuiltInPrompt>` | Map makes per-tier filtering more verbose; array + `.filter()` is simpler and matches how Phase 6 will iterate |
| `{{DATA}}` placeholder tokens | Simple concatenation | Placeholder approach adds a `replace()` call but makes the template structure self-documenting in the prompt text; recommended for discretion areas |
| Shots-only TSV | Averaging rows included | AI models compute their own stats more reliably from raw shots; matches user decision |

**Installation:**
```bash
# No new packages required
```

## Architecture Patterns

### Recommended Project Structure

```
src/shared/
├── csv_writer.ts        # Existing — CSV with averages/consistency rows (do not modify)
├── tsv_writer.ts        # NEW — TSV shots-only for clipboard/AI payload
├── prompt_types.ts      # NEW — BuiltInPrompt type + BUILTIN_PROMPTS constant array
├── prompt_builder.ts    # NEW — assemblePrompt(prompt, tsvData, metadata?) → string
├── constants.ts         # Existing — METRIC_COLUMN_ORDER reused by tsv_writer
└── unit_normalization.ts # Existing — normalizeMetricValue, getColumnName reused

tests/
├── test_tsv_writer.ts      # NEW — edge cases: tabs, newlines, commas in values
├── test_prompt_builder.ts  # NEW — assembly smoke tests
└── (existing tests unchanged)
```

### Pattern 1: TSV Writer — Mirror csv_writer.ts, shots only

**What:** `writeTsv(session, unitChoice)` returns a tab-delimited string. Header row + one data row per shot across all clubs. No averages, no consistency rows. Column headers include unit labels.

**When to use:** Called from popup.ts (Phase 6) before clipboard copy and before AI launch.

**Column scope recommendation (Claude's discretion):** Include `Date` and `Club` columns. These add critical context for AI analysis (the AI needs to know which club produced which shot). Omit `Type` column since all rows are shots (it would always be "Shot"). Include `Shot #`.

Final column order: `Date`, `Club`, `Shot #`, then metrics in `METRIC_COLUMN_ORDER`.

**Example:**
```typescript
// src/shared/tsv_writer.ts
import type { SessionData } from "../models/types";
import {
  getApiSourceUnitSystem,
  getMetricUnitLabel,
  normalizeMetricValue,
  DEFAULT_UNIT_CHOICE,
  type UnitChoice,
} from "./unit_normalization";
import { METRIC_DISPLAY_NAMES } from "./constants";

// Reuse same column order as csv_writer.ts
const METRIC_COLUMN_ORDER: string[] = [
  "ClubSpeed", "BallSpeed", "SmashFactor",
  "AttackAngle", "ClubPath", "FaceAngle", "FaceToPath", "SwingDirection", "DynamicLoft",
  "LaunchAngle", "LaunchDirection", "SpinRate", "SpinAxis", "SpinLoft",
  "Carry", "Total",
  "Side", "SideTotal", "CarrySide", "TotalSide", "Curve",
  "Height", "MaxHeight", "LandingAngle", "HangTime",
  "LowPointDistance", "ImpactHeight", "ImpactOffset",
  "Tempo",
];

function escapeTsvField(value: string): string {
  // TSV: escape tabs and newlines within field values
  // Commas need no escaping in TSV
  return value.replace(/\t/g, " ").replace(/\n/g, " ").replace(/\r/g, " ");
}

export function writeTsv(
  session: SessionData,
  unitChoice: UnitChoice = DEFAULT_UNIT_CHOICE
): string {
  // ... (mirrors writeCsv but tabs, shots only, no Tag column)
}
```

### Pattern 2: Prompt Library — Typed constant array

**What:** `BUILTIN_PROMPTS` is a `readonly` array of `BuiltInPrompt` objects. Each prompt has an `id`, `name`, `tier`, `topic`, and `template` string. The `tier` field enables Phase 6 to filter by skill level.

**Template structure recommendation (Claude's discretion):** Use `{{DATA}}` placeholder token in the template body. The prompt builder replaces `{{DATA}}` with the assembled TSV block. This makes the template self-documenting — a prompt editor (Phase 7) can display the template with the placeholder visible, making it clear where data is injected.

**Example:**
```typescript
// src/shared/prompt_types.ts
export type SkillTier = "beginner" | "intermediate" | "advanced";

export interface BuiltInPrompt {
  readonly id: string;           // e.g. "session-overview-beginner"
  readonly name: string;         // e.g. "Session Overview"
  readonly tier: SkillTier;
  readonly topic: string;        // e.g. "overview", "club-breakdown", "consistency"
  readonly template: string;     // Contains {{DATA}} placeholder
}

export const BUILTIN_PROMPTS: readonly BuiltInPrompt[] = [
  {
    id: "session-overview-beginner",
    name: "Session Overview",
    tier: "beginner",
    topic: "overview",
    template: `You're a friendly golf coach reviewing my Trackman session data. \
Look at how I did today and give me 2-3 things I did well and 1-2 things to work on next time. \
Keep it encouraging and simple — I'm still learning. Here's my session:\n\n{{DATA}}`,
  },
  // ... 6+ more prompts
] as const;
```

### Pattern 3: Prompt Builder — Pure assembly function

**What:** `assemblePrompt(prompt, tsvData, metadata?)` produces the final string that gets copied to the clipboard and sent to the AI. It replaces `{{DATA}}` in the template with the TSV block, optionally prepending a metadata header.

**Assembly recommendation (Claude's discretion):**
- Include metadata header with date, shot count, and unit system — gives the AI context without requiring the user to know what to add.
- Delimiter: two blank lines between the prompt body and the data block — matches natural LLM document structure.

**Example:**
```typescript
// src/shared/prompt_builder.ts
import type { BuiltInPrompt } from "./prompt_types";

export interface PromptMetadata {
  date: string;
  shotCount: number;
  unitLabel: string;  // e.g., "mph + yards" or "m/s + meters"
}

export function assemblePrompt(
  prompt: BuiltInPrompt,
  tsvData: string,
  metadata?: PromptMetadata
): string {
  const dataBlock = metadata
    ? `Session: ${metadata.date} | ${metadata.shotCount} shots | Units: ${metadata.unitLabel}\n\n${tsvData}`
    : tsvData;
  return prompt.template.replace("{{DATA}}", dataBlock);
}
```

### Anti-Patterns to Avoid

- **Duplicating METRIC_COLUMN_ORDER:** `tsv_writer.ts` should define its own copy of the constant (same values as `csv_writer.ts`) rather than importing from it. The CSV writer is not the canonical source — `constants.ts` is the right home. If the order ever diverges, both exports should be independent.
- **Putting prompt content in storage:** Built-in prompts are TypeScript constants, not stored data. Only user-created templates (Phase 7) go to `chrome.storage.local`. The CONTEXT.md and STATE.md both lock this decision.
- **Default exports:** The project convention is named exports only (`export function`, `export const`). No default exports, no barrel `index.ts` files.
- **Averaging rows in TSV:** TSV is for AI consumption of raw shots. Including averages would confuse AI analysis by mixing aggregated rows with shot rows.
- **Over-engineering the template engine:** `{{DATA}}` + `String.replace()` is sufficient. Do not introduce a template library.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| TSV column ordering | Custom sort logic | Reuse `orderMetricsByPriority()` pattern from `csv_writer.ts` | Already handles "priority order then remaining" correctly |
| Unit-labelled column headers | Custom label logic | Reuse `getMetricUnitLabel()` + `METRIC_DISPLAY_NAMES` from existing shared modules | Already handles all metric categories, fixed labels, and edge cases |
| Value normalization | New conversion logic | Reuse `normalizeMetricValue()` + `getApiSourceUnitSystem()` | Already handles all unit system combinations and edge cases |

**Key insight:** 90% of the TSV writer is already written — it lives in `csv_writer.ts`. The main job is to strip out averages/consistency rows, change the delimiter, and remove CSV-specific quoting.

## Common Pitfalls

### Pitfall 1: TSV field values containing tabs or newlines

**What goes wrong:** A shot metric value or club name containing a literal tab character would corrupt the TSV structure. Newlines in values would silently add phantom rows.

**Why it happens:** Raw data from Trackman is not validated for these characters. Club names (e.g. "7 Iron") are safe, but metric values are numbers, so the risk is low. Still, defensive escaping is required.

**How to avoid:** Replace tab characters (`\t`) in any field value with a space before writing. Replace `\n` and `\r` with space as well. Unlike CSV, no quoting is needed — just strip or replace the delimiters inline.

**Warning signs:** Test assertion on row count fails because a newline in a value created extra rows. Spreadsheet paste shows misaligned columns.

### Pitfall 2: TSV header row missing for spreadsheet paste

**What goes wrong:** Without a header row, Google Sheets and Excel have no column labels. The AI also cannot interpret which column is which.

**Why it happens:** Easy to forget when focusing on data rows. CLIP-03 explicitly requires headers.

**How to avoid:** Always emit header row as the first line. Tests should assert `output.split("\n")[0]` contains expected column names.

### Pitfall 3: Prompt template missing `{{DATA}}` placeholder

**What goes wrong:** If a template doesn't contain `{{DATA}}`, the assembled string will be missing the TSV data entirely. `String.replace()` silently no-ops when the pattern isn't found.

**Why it happens:** Copy-paste error when writing prompt templates.

**How to avoid:** Validate at module load time that every entry in `BUILTIN_PROMPTS` has `{{DATA}}` in its template. A simple assertion or TypeScript-level check is sufficient.

**Warning signs:** `assemblePrompt()` returns a string that contains no tab characters despite `tsvData` being non-empty.

### Pitfall 4: Tag column appearing in TSV when no tags exist

**What goes wrong:** `csv_writer.ts` conditionally includes a `Tag` column when any shot has a tag. The TSV writer should omit this column entirely — it is not relevant for AI analysis payloads.

**Why it happens:** Copy-paste from csv_writer.ts without reviewing the Tag conditional logic.

**How to avoid:** Do not include `hasTags()` check or Tag column in `tsv_writer.ts`. The column scope is: Date, Club, Shot #, then metrics.

### Pitfall 5: Vitest test file naming

**What goes wrong:** A test file named `tsv_writer.test.ts` won't be picked up by the test runner.

**Why it happens:** Standard Jest/Vitest convention uses `.test.ts` suffix, but this project uses `test_*.ts` prefix pattern configured in `vitest.config.ts`.

**How to avoid:** Name test files `tests/test_tsv_writer.ts` and `tests/test_prompt_builder.ts`. Run `npx vitest run` to confirm files are included.

## Code Examples

Verified patterns from existing project source:

### Column header with unit label (from csv_writer.ts)
```typescript
// src/shared/csv_writer.ts — getColumnName pattern
function getColumnName(metric: string, unitChoice: UnitChoice): string {
  const displayName = METRIC_DISPLAY_NAMES[metric] ?? metric;
  const unitLabel = getMetricUnitLabel(metric, unitChoice);
  return unitLabel ? `${displayName} (${unitLabel})` : displayName;
}
```

### Metric ordering (from csv_writer.ts)
```typescript
// Reuse this pattern in tsv_writer.ts
function orderMetricsByPriority(allMetrics: string[], priorityOrder: string[]): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const metric of priorityOrder) {
    if (allMetrics.includes(metric) && !seen.has(metric)) {
      result.push(metric);
      seen.add(metric);
    }
  }
  for (const metric of allMetrics) {
    if (!seen.has(metric)) result.push(metric);
  }
  return result;
}
```

### API source unit system (from unit_normalization.ts)
```typescript
// Use this when building TSV — API always returns m/s + meters
const unitSystem = getApiSourceUnitSystem(session.metadata_params);
// Then normalize each value:
const normalized = normalizeMetricValue(rawValue, metricName, unitSystem, unitChoice);
```

### Vitest test structure (from tests/test_csv_writer_units.ts)
```typescript
import { describe, it, expect } from "vitest";
import { writeTsv } from "../src/shared/tsv_writer";
import type { SessionData } from "../src/models/types";
import type { UnitChoice } from "../src/shared/unit_normalization";

function makeSession(metrics: Record<string, string | number>, metricNames: string[]): SessionData {
  return {
    date: "2025-01-15",
    report_id: "test-123",
    url_type: "report",
    metric_names: metricNames,
    metadata_params: { nd_001: "789012" },
    club_groups: [{
      club_name: "7 Iron",
      shots: [{ shot_number: 0, metrics }],
      averages: {},
      consistency: {},
    }],
  };
}

describe("TSV Writer: tab delimiter", () => {
  it("uses tabs as delimiter", () => {
    const session = makeSession({ ClubSpeed: "44.704" }, ["ClubSpeed"]);
    const tsv = writeTsv(session);
    const header = tsv.split("\n")[0];
    expect(header.split("\t").length).toBeGreaterThan(1);
  });
});
```

### TSV edge case tests to write
```typescript
describe("TSV Writer: edge cases", () => {
  it("replaces tab in field value with space", () => {
    // Club name containing \t (defensive test)
    const session = makeSessionWithClubName("7\tIron");
    const tsv = writeTsv(session);
    // Should not create extra columns
    const firstDataRow = tsv.split("\n")[1];
    expect(firstDataRow.split("\t")[1]).toBe("7 Iron");
  });

  it("replaces newline in field value with space", () => {
    // Metric value containing \n
    const session = makeSession({ ClubSpeed: "44\n704" }, ["ClubSpeed"]);
    const tsv = writeTsv(session);
    // Should not create extra rows
    expect(tsv.split("\n").length).toBe(2); // header + 1 shot row
  });

  it("does not escape commas in field values", () => {
    // Commas are fine in TSV — no quoting needed
    const session = makeSessionWithClubName("Pitching Wedge, Low");
    const tsv = writeTsv(session);
    const firstDataRow = tsv.split("\n")[1];
    expect(firstDataRow).toContain("Pitching Wedge, Low");
  });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| CSV-only export | CSV + TSV (for clipboard/AI) | Phase 5 (now) | TSV pastes into spreadsheets without quoting complexity; cleaner AI payloads |
| No prompt library | Built-in typed constants | Phase 5 (now) | Eliminates storage reads for built-in prompts; type safety on tier/topic fields |

**Deprecated/outdated:**
- Nothing deprecated in this phase — all new code, building on stable existing patterns.

## Open Questions

1. **METRIC_COLUMN_ORDER placement — csv_writer.ts vs constants.ts**
   - What we know: Currently defined as a module-level constant inside `csv_writer.ts`, not exported from `constants.ts`.
   - What's unclear: Should `tsv_writer.ts` import from `csv_writer.ts` or duplicate the array?
   - Recommendation: Define a new copy of `METRIC_COLUMN_ORDER` inside `tsv_writer.ts` (same values). Do NOT import from `csv_writer.ts` — that creates a coupling between two independent writers. If the canonical order is ever needed project-wide, move it to `constants.ts` as a separate task.

2. **Tag column in TSV**
   - What we know: `csv_writer.ts` conditionally includes a Tag column. Tags are user-created labels on shots.
   - What's unclear: Whether AI prompt context benefits from knowing a shot's tag.
   - Recommendation: Omit the Tag column from TSV. Tags are a user organizational feature, not a golf performance metric. AI analysis should focus on metrics only.

3. **Prompt metadata context line**
   - What we know: User hasn't specified whether to include metadata (date, shot count, unit system) in the assembled string.
   - What's unclear: Whether the metadata header adds value or noise for AI analysis.
   - Recommendation: Include it. LLMs benefit from structured context. Format: `Session: {date} | {shotCount} shots | Units: {unitLabel}`. Place it immediately before the TSV data block, separated by a blank line.

## Sources

### Primary (HIGH confidence)

- Direct code inspection: `/Users/kylelunter/claudeprojects/trackv3/src/shared/csv_writer.ts` — all column ordering, unit label, and value normalization patterns
- Direct code inspection: `/Users/kylelunter/claudeprojects/trackv3/src/shared/unit_normalization.ts` — all conversion primitives and type definitions
- Direct code inspection: `/Users/kylelunter/claudeprojects/trackv3/src/shared/constants.ts` — METRIC_DISPLAY_NAMES, ALL_METRICS
- Direct code inspection: `/Users/kylelunter/claudeprojects/trackv3/src/models/types.ts` — SessionData, ClubGroup, Shot interfaces
- Direct code inspection: `/Users/kylelunter/claudeprojects/trackv3/tests/test_csv_writer_units.ts` — established test patterns
- Direct code inspection: `/Users/kylelunter/claudeprojects/trackv3/vitest.config.ts` — test include pattern `tests/test_*.ts`
- Direct code inspection: `/Users/kylelunter/claudeprojects/trackv3/package.json` — vitest ^4.0.18, TypeScript ^5.9.3

### Secondary (MEDIUM confidence)

- TSV field escaping convention: replacing tabs with spaces is the standard defensive approach for TSV generation without a dedicated library. No external source needed — the rule is structural: fields cannot contain the delimiter character.

### Tertiary (LOW confidence)

- None — all findings are derived from direct codebase inspection or basic TSV specification knowledge.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — directly verified from package.json and existing source files
- Architecture: HIGH — patterns are direct mirrors of existing csv_writer.ts with minimal creative decisions
- Pitfalls: HIGH — derived from concrete code analysis (delimiter escaping, test naming, column structure)

**Research date:** 2026-03-02
**Valid until:** 2026-06-02 (stable codebase with no fast-moving dependencies)
