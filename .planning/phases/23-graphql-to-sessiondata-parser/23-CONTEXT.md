# Phase 23: GraphQL-to-SessionData Parser - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning

<domain>
## Phase Boundary

GraphQL `Stroke.measurement` fields are mapped into the existing `SessionData` format with defensive null handling. Deduplication identity is established so the same session captured via interceptor and imported via portal is not stored twice. No activity fetching, no import UI, no service worker handlers — those are phases 24-25.

</domain>

<decisions>
## Implementation Decisions

### Field Coverage
- **D-01:** Portal parser captures ALL available non-null `Measurement` fields from GraphQL — not limited to the interceptor's 29-key `METRIC_KEYS` set. Portal imports may produce richer CSV exports with more columns than interceptor captures.
- **D-02:** The interceptor remains unchanged — keeps its existing 29 `METRIC_KEYS` filter. Different sources may produce different column counts; both are accurate for what they capture.
- **D-03:** Metric values stored as strings (matching interceptor convention) — `Record<string, MetricValue>` type unchanged.

### Deduplication Identity
- **D-04:** Portal sessions use the UUID extracted from the base64 activity ID as `report_id`. If the interceptor's URL params contain the same ID (e.g., `?a=` param), existing history dedup logic handles matching naturally.
- **D-05:** When a duplicate is found (same `report_id` from both sources), the portal version wins — it has 60+ fields vs the interceptor's 29. The richer dataset replaces the sparser one.

### Metric Name Alignment
- **D-06:** Build a canonical alias map: GraphQL field names are mapped to the interceptor's existing `METRIC_KEYS` names where overlap exists (e.g., if GraphQL returns `clubSpeed`, map to `ClubSpeed`). New fields beyond the 29 keep their GraphQL names, normalized to PascalCase.
- **D-07:** All metric names normalized to PascalCase convention to match existing `METRIC_KEYS` style (e.g., `clubHeadSpeed` -> `ClubHeadSpeed`). Ensures consistent CSV column headers regardless of source.

### Claude's Discretion
- Exact parser function API shape and internal structure of `portal_parser.ts`
- How to extract UUID from base64 activity ID (decode + parse)
- Null/missing field handling strategy (omit vs empty) — success criterion says "defensive handling"
- Whether alias map is a static object or generated from METRIC_KEYS set
- How to group GraphQL strokes into ClubGroups (depends on GraphQL response structure discovered during research)
- Error handling for malformed GraphQL responses

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Data Types & Pipeline
- `src/models/types.ts` — `SessionData`, `Shot`, `ClubGroup`, `SessionSnapshot`, `mergeSessionData()` — the target format for the parser
- `src/content/interceptor.ts` lines 11-41 — `METRIC_KEYS` set (29 keys) and `parseSessionData()` — reference implementation for how the interceptor maps StrokeGroups JSON to SessionData
- `src/content/interceptor.ts` lines 75-160 — Interceptor's parsing logic: StrokeGroups iteration, NormalizedMeasurement/Measurement merge, metric filtering, ClubGroup construction
- `src/shared/unit_normalization.ts` — `MetricValue` type used in `Shot.metrics`

### Deduplication & History
- `src/shared/history.ts` — `saveSessionToHistory()` — deduplicates by `report_id`, evicts oldest at cap
- `.planning/REQUIREMENTS.md` §PIPE-01 — Map 60+ Measurement fields to SessionData
- `.planning/REQUIREMENTS.md` §PIPE-03 — Deduplicate interceptor-captured and portal-imported sessions
- `.planning/REQUIREMENTS.md` §RESIL-03 — Parser handles missing/null/unexpected fields gracefully

### GraphQL Client
- `src/shared/graphql_client.ts` — `executeQuery()`, `GraphQLResponse<T>` type — used to fetch data that this parser will consume

### Architecture & Conventions
- `.planning/codebase/CONVENTIONS.md` — Naming patterns, import organization, code style
- `.planning/codebase/STRUCTURE.md` — File layout

### Prior Phase Context
- `.planning/phases/22-graphql-client-cookie-auth/22-CONTEXT.md` — Auth decisions, GraphQL client design, PortalState pattern

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/content/interceptor.ts` `parseSessionData()` — Reference implementation for mapping raw JSON to SessionData; portal parser follows same pattern but with GraphQL input
- `src/content/interceptor.ts` `METRIC_KEYS` — The 29-key set defines the canonical metric name convention (PascalCase); alias map should target these names for overlapping fields
- `src/shared/graphql_client.ts` `executeQuery<T>()` — Generic typed query execution; portal parser will define types for the activity/stroke queries
- `src/shared/history.ts` — Dedup by `report_id` already works; portal parser just needs to set `report_id` to the activity UUID

### Established Patterns
- Metrics stored as `Record<string, MetricValue>` (string values) — portal parser must match
- `metric_names` array on SessionData built from actual populated fields (Set-based collection) — portal parser must follow same approach
- `url_type` field on SessionData already supports `"activity"` — portal imports can use this
- `metadata_params` on SessionData used for URL query params — portal imports can store activity metadata here

### Integration Points
- New file: `src/shared/portal_parser.ts` — Parser module (per success criterion naming)
- Consumed by Phase 24's service worker import handler
- Output feeds into existing `saveSessionToHistory()`, CSV writer, TSV writer, prompt builder — all unchanged

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 23-graphql-to-sessiondata-parser*
*Context gathered: 2026-03-26*
