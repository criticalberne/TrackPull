# Phase 5: Foundation Modules - Context

**Gathered:** 2026-03-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Shared TypeScript modules for TSV export, built-in golf prompt library, and prompt+data assembly — tested and ready for Phase 6 popup integration. This phase produces reusable code in `src/shared/`; no UI changes. Requirement covered: PRMT-01.

</domain>

<decisions>
## Implementation Decisions

### Prompt content & skill tiers
- Three tiers: Beginner / Intermediate / Advanced — matches PRMT-02 requirement for the Phase 6 skill-tiered dropdown
- Mix of coaching-style feedback AND data interpretation prompts across the library — some prompts give actionable swing advice, others explain what the numbers mean
- Tier-matched tone: Beginner prompts use friendly coach tone ("Nice work on X, let's sharpen Y"), Advanced prompts use technical analyst tone (data-driven, numbers-first)

### Prompt topics (7+ required)
- General session overview — "tell me how I did today" go-to prompt
- Club-by-club breakdown — compare performance across clubs, strengths, weaknesses, distance gaps
- Consistency analysis — shot dispersion, repeatability patterns
- Claude picks the remaining 4+ topics to reach 7+ total, based on what Trackman metrics can reveal (e.g., launch optimization, spin analysis, distance gapping, club delivery patterns)

### TSV output format
- Shots only — no averages or consistency rows. AI can compute its own stats from raw shots; keeps data clean and smaller
- Include unit labels in column headers (e.g., "Club Speed (mph)") — self-documenting data, matches existing csv_writer.ts pattern
- Same column ordering as CSV — reuse METRIC_COLUMN_ORDER from csv_writer.ts for consistency

### Claude's Discretion
- TSV column scope: whether to include Date and Type columns, or just Club + Shot # + metrics — pick what works best for spreadsheet paste and AI payload
- Prompt template structure: placeholder tokens (e.g., `{{DATA}}`) vs simple concatenation — pick what's cleanest for the builder module
- Data payload assembly: how prompt + TSV combine into the final string, what context metadata to include (date, unit system, shot count), delimiter between prompt and data block
- Exact prompt wording for each of the 7+ built-in prompts
- Which additional topics beyond the 3 specified to reach 7+ total

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/shared/csv_writer.ts`: TSV writer can mirror this structure closely — same `METRIC_COLUMN_ORDER`, same `getColumnName()` with unit labels, same `orderMetricsByPriority()` logic
- `src/shared/unit_normalization.ts`: `normalizeMetricValue()`, `getMetricUnitLabel()`, `UnitChoice` type — TSV writer reuses these directly
- `src/shared/constants.ts`: `METRIC_DISPLAY_NAMES`, `ALL_METRICS` — prompt templates can reference metric names from here
- `src/models/types.ts`: `SessionData`, `ClubGroup`, `Shot` interfaces — TSV writer and prompt builder both consume `SessionData`

### Established Patterns
- Shared utilities live in `src/shared/` as named exports (no default exports, no barrel files)
- Functions use explicit typed parameters and return types
- Constants use UPPER_SNAKE_CASE
- Tests in `tests/test_*.ts` using vitest
- No external dependencies in production — pure TypeScript

### Integration Points
- TSV writer will be called from popup.ts (Phase 6) for clipboard copy
- Prompt builder will be called from popup.ts (Phase 6) for AI launch
- Built-in prompts will be consumed by popup dropdown (Phase 6) and options page (Phase 7)
- Prompt type definitions need to support both built-in (read-only) and custom (user-created, Phase 7) prompts

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-foundation-modules*
*Context gathered: 2026-03-02*
