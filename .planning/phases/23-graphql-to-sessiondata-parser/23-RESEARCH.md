# Phase 23: GraphQL-to-SessionData Parser - Research

**Researched:** 2026-03-26
**Domain:** TypeScript data mapping — GraphQL Stroke.measurement → SessionData
**Confidence:** HIGH (for structure/patterns; LOW for exact GraphQL field names)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Portal parser captures ALL available non-null `Measurement` fields from GraphQL — not limited to the interceptor's 29-key `METRIC_KEYS` set. Portal imports may produce richer CSV exports with more columns than interceptor captures.
- **D-02:** The interceptor remains unchanged — keeps its existing 29 `METRIC_KEYS` filter. Different sources may produce different column counts; both are accurate for what they capture.
- **D-03:** Metric values stored as strings (matching interceptor convention) — `Record<string, MetricValue>` type unchanged.
- **D-04:** Portal sessions use the UUID extracted from the base64 activity ID as `report_id`. If the interceptor's URL params contain the same ID (e.g., `?a=` param), existing history dedup logic handles matching naturally.
- **D-05:** When a duplicate is found (same `report_id` from both sources), the portal version wins — it has 60+ fields vs the interceptor's 29. The richer dataset replaces the sparser one.
- **D-06:** Build a canonical alias map: GraphQL field names are mapped to the interceptor's existing `METRIC_KEYS` names where overlap exists (e.g., if GraphQL returns `clubSpeed`, map to `ClubSpeed`). New fields beyond the 29 keep their GraphQL names, normalized to PascalCase.
- **D-07:** All metric names normalized to PascalCase convention to match existing `METRIC_KEYS` style (e.g., `clubHeadSpeed` -> `ClubHeadSpeed`). Ensures consistent CSV column headers regardless of source.

### Claude's Discretion

- Exact parser function API shape and internal structure of `portal_parser.ts`
- How to extract UUID from base64 activity ID (decode + parse)
- Null/missing field handling strategy (omit vs empty) — success criterion says "defensive handling"
- Whether alias map is a static object or generated from METRIC_KEYS set
- How to group GraphQL strokes into ClubGroups (depends on GraphQL response structure)
- Error handling for malformed GraphQL responses

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PIPE-01 | GraphQL `Stroke.measurement` fields (60+) are mapped into the existing `SessionData` format with defensive null handling | Covered by alias map design, null-omit strategy, and PascalCase normalization patterns |
| PIPE-03 | Same session captured via interceptor and imported via API is deduplicated in history | Covered by base64 UUID extraction, `report_id` identity, and `saveSessionToHistory` dedup behavior |
</phase_requirements>

---

## Summary

Phase 23 delivers `src/shared/portal_parser.ts` — a pure TypeScript transformation module with no runtime dependencies. It accepts a typed GraphQL activity response (already fetched by Phase 22's `executeQuery`) and produces a `SessionData` value that drops into the existing export, history, and display pipeline without modification.

The reference implementation for this transform already exists in `src/content/interceptor.ts` `parseSessionData()`. The portal parser follows the same structural pattern: iterate over stroke groups → collect metrics per stroke → build `ClubGroup` array → populate `metric_names` from actual populated fields. The key differences are the input shape (GraphQL `Stroke` nodes with `.measurement` object vs. REST `StrokeGroups[].Strokes[].Measurement`), the metric coverage (all non-null fields vs. 29-key filter), and the `report_id` source (decoded base64 UUID vs. URL param).

Deduplication requires no new logic. `saveSessionToHistory()` in `src/shared/history.ts` already deduplicates by `report_id` and replaces existing entries. The portal parser just sets `report_id` to the activity UUID — the same value the interceptor would have captured from the `?a=` URL param — and the existing dedup logic handles the rest. D-05 (portal version wins) is a natural consequence of `saveSessionToHistory` replacing on match: whichever source saves last wins. The planner must sequence import such that portal saves after any interceptor capture.

**Primary recommendation:** Model `portal_parser.ts` directly on `interceptor.ts` `parseSessionData()`. Alias map is a static `Record<string, string>` constant. Null handling is omit (skip field if value is null/undefined/NaN). UUID extraction uses `atob()` and string splitting on `\n`.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript 5.x | 5.9.3 (project) | Type safety for GraphQL input shape + SessionData output | Project-wide; zero overhead |
| `atob()` | Browser built-in | Base64 decode of activity ID | Available in service worker (MV3); no polyfill needed |
| Native TypeScript | — | PascalCase normalization via string manipulation | No library needed for `str[0].toUpperCase() + str.slice(1)` |

### Supporting

None — this phase is a pure data-mapping module. No new packages or Chrome APIs are needed.

**Installation:** No new packages. Project has zero production dependencies by design.

**Version verification:** No npm packages to verify for this phase.

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── shared/
│   ├── portal_parser.ts     # New: parse GraphQL activity response → SessionData
│   ├── graphql_client.ts    # Existing: executeQuery (Phase 22)
│   ├── history.ts           # Existing: saveSessionToHistory with dedup
│   └── constants.ts         # Existing: METRIC_KEYS (29 keys for alias map reference)
├── models/
│   └── types.ts             # Existing: SessionData, ClubGroup, Shot interfaces
tests/
└── test_portal_parser.ts    # New: vitest suite with fixture-based tests
```

### Pattern 1: GraphQL Input Type Definitions

**What:** Define the expected GraphQL response shape as TypeScript interfaces inside `portal_parser.ts`. These types are the contract between Phase 24's fetch code and Phase 23's parser.

**When to use:** Inline in `portal_parser.ts` — Phase 24 will import the types it needs when wiring the query.

```typescript
// Source: codebase graphql_client.ts pattern + GraphQL spec
export interface StrokeMeasurement {
  // Fields known to exist in METRIC_KEYS (confirmed interceptor names as reference)
  // GraphQL names unconfirmed — assume camelCase variants of METRIC_KEYS names
  clubSpeed?: number | null;
  ballSpeed?: number | null;
  smashFactor?: number | null;
  attackAngle?: number | null;
  clubPath?: number | null;
  faceAngle?: number | null;
  faceToPath?: number | null;
  swingDirection?: number | null;
  dynamicLoft?: number | null;
  spinRate?: number | null;
  spinAxis?: number | null;
  spinLoft?: number | null;
  launchAngle?: number | null;
  launchDirection?: number | null;
  carry?: number | null;
  total?: number | null;
  side?: number | null;
  // ... 40+ additional fields beyond the 29 METRIC_KEYS
  [key: string]: number | null | undefined; // index signature for unknown fields
}

export interface GraphQLStroke {
  id?: string | null;
  measurement?: StrokeMeasurement | null;
}

export interface GraphQLStrokeGroup {
  club?: string | null;
  strokes?: GraphQLStroke[] | null;
}

export interface GraphQLActivity {
  id: string;
  date?: string | null;
  strokeGroups?: GraphQLStrokeGroup[] | null;
}
```

**NOTE:** Exact GraphQL field names are LOW confidence (see Open Questions). The index signature `[key: string]` is the defensive fallback — the alias map handles name normalization regardless of what casing Trackman uses.

### Pattern 2: Canonical Alias Map

**What:** A static `Record<string, string>` mapping GraphQL camelCase field names to the interceptor's existing PascalCase `METRIC_KEYS` names. Fields not in the map get normalized to PascalCase directly.

**When to use:** Inside `portal_parser.ts`, applied during metric collection per stroke.

```typescript
// Source: interceptor.ts METRIC_KEYS + CONTEXT.md D-06/D-07
// Keys are GraphQL camelCase names (unconfirmed — verified at Phase 22 execution time)
// Values are the canonical METRIC_KEYS PascalCase names
const GRAPHQL_METRIC_ALIAS: Record<string, string> = {
  clubSpeed: "ClubSpeed",
  ballSpeed: "BallSpeed",
  smashFactor: "SmashFactor",
  attackAngle: "AttackAngle",
  clubPath: "ClubPath",
  faceAngle: "FaceAngle",
  faceToPath: "FaceToPath",
  swingDirection: "SwingDirection",
  dynamicLoft: "DynamicLoft",
  spinRate: "SpinRate",
  spinAxis: "SpinAxis",
  spinLoft: "SpinLoft",
  launchAngle: "LaunchAngle",
  launchDirection: "LaunchDirection",
  carry: "Carry",
  total: "Total",
  side: "Side",
  sideTotal: "SideTotal",
  carrySide: "CarrySide",
  totalSide: "TotalSide",
  height: "Height",
  maxHeight: "MaxHeight",
  curve: "Curve",
  landingAngle: "LandingAngle",
  hangTime: "HangTime",
  lowPointDistance: "LowPointDistance",
  impactHeight: "ImpactHeight",
  impactOffset: "ImpactOffset",
  tempo: "Tempo",
};

function toPascalCase(key: string): string {
  return key.charAt(0).toUpperCase() + key.slice(1);
}

function normalizeMetricKey(graphqlKey: string): string {
  return GRAPHQL_METRIC_ALIAS[graphqlKey] ?? toPascalCase(graphqlKey);
}
```

### Pattern 3: UUID Extraction from Base64 Activity ID

**What:** The Trackman activity ID is a base64-encoded string of the format `SessionActivity\n{uuid}`. Decoding and splitting on `\n` yields the UUID.

**When to use:** Inside `parsePortalActivity()` when setting `report_id`.

```typescript
// Source: STATE.md — "Base64 activity IDs decode to SessionActivity\n{uuid}"
function extractActivityUuid(base64Id: string): string {
  try {
    const decoded = atob(base64Id);
    // Format: "SessionActivity\n550e8400-e29b-41d4-a716-446655440000"
    const parts = decoded.split("\n");
    return parts[1]?.trim() || base64Id; // Fall back to raw ID if parse fails
  } catch {
    return base64Id; // atob throws on invalid base64
  }
}
```

**Confidence:** HIGH — `atob()` is available in MV3 service workers. The decode format is documented in STATE.md as a confirmed finding.

### Pattern 4: Core Parser Function

**What:** `parsePortalActivity()` — the main exported function, following the same structural pattern as `interceptor.ts` `parseSessionData()`.

**When to use:** Called by Phase 24's `IMPORT_SESSION` service worker handler.

```typescript
// Source: modeled on src/content/interceptor.ts parseSessionData() lines 75-174
export function parsePortalActivity(activity: GraphQLActivity): SessionData | null {
  try {
    if (!activity?.id) return null;

    const reportId = extractActivityUuid(activity.id);
    const dateStr = activity.date ?? "Unknown";

    const session: SessionData = {
      date: dateStr,
      report_id: reportId,
      url_type: "activity",
      club_groups: [],
      metric_names: [],
      metadata_params: { activity_id: activity.id },
    };

    const allMetricNames = new Set<string>();

    for (const group of activity.strokeGroups ?? []) {
      if (!group || typeof group !== "object") continue;

      const clubName = group.club || "Unknown";
      const shots: Shot[] = [];

      for (let i = 0; i < (group.strokes ?? []).length; i++) {
        const stroke = group.strokes![i];
        if (!stroke?.measurement) continue;

        const shotMetrics: Record<string, string> = {};

        for (const [key, value] of Object.entries(stroke.measurement)) {
          if (value === null || value === undefined) continue;

          const numValue = typeof value === "number" ? value : parseFloat(String(value));
          if (isNaN(numValue)) continue;

          const normalizedKey = normalizeMetricKey(key);
          allMetricNames.add(normalizedKey);
          shotMetrics[normalizedKey] = `${numValue}`;
        }

        if (Object.keys(shotMetrics).length > 0) {
          shots.push({ shot_number: i, metrics: shotMetrics });
        }
      }

      if (shots.length > 0) {
        session.club_groups.push({
          club_name: clubName,
          shots,
          averages: {},
          consistency: {},
        });
      }
    }

    session.metric_names = Array.from(allMetricNames).sort();
    return session.club_groups.length > 0 ? session : null;
  } catch (error) {
    console.error("TrackPull: Portal parse failed:", error);
    return null;
  }
}
```

**Key decisions embedded in this pattern:**
- `value === null || value === undefined` → **omit** (not empty string). Omitting matches CONTEXT.md "defensive handling" and matches how interceptor skips non-numeric values.
- `metadata_params: { activity_id: activity.id }` — stores the raw base64 ID for traceability; Phase 24 can add more params.
- `averages: {}, consistency: {}` — matches interceptor convention; Phase 24's import flow can compute averages if desired.

### Pattern 5: Deduplication Behavior (No New Code Needed)

**What:** Existing `saveSessionToHistory()` in `history.ts` already implements dedup by `report_id`. The portal parser just sets `report_id` correctly.

**How it achieves D-05 (portal wins):** The import flow (Phase 24) calls `saveSessionToHistory()` with the portal session AFTER it is parsed. `saveSessionToHistory()` removes any existing entry with the same `report_id` and inserts the new one (line 36-43 in `history.ts`). So if an interceptor session was saved first, the portal import call replaces it with the richer dataset.

```typescript
// Source: src/shared/history.ts lines 36-43
// No changes needed — existing behavior:
const filtered = existing.filter(
  (entry) => entry.snapshot.report_id !== session.report_id
);
// filtered now has interceptor session removed
// new portal entry (60+ fields) is pushed and sorted in
```

**Confidence:** HIGH — fully verified from source.

### Anti-Patterns to Avoid

- **Filtering to METRIC_KEYS whitelist in portal parser:** D-01 locks this out. The portal parser must include ALL non-null numeric fields, not just the 29 in `METRIC_KEYS`. Using `METRIC_KEYS.has(key)` would silently discard 30+ portal fields.
- **Empty string for null fields:** Omit fields with null/undefined/NaN values entirely. Including empty-string metric values would pollute `metric_names` with phantom column headers (violates success criterion #3).
- **Storing metric values as numbers:** D-03 locks metric values as strings. Use template literal: `` `${numValue}` ``.
- **Using the raw base64 ID as report_id without decoding:** The interceptor captures the UUID from the `?a=` URL param directly. The portal ID is the base64-encoded form. Dedup only works if both sources produce the same UUID string.
- **Accepting `string` type metric values from GraphQL without parseFloat guard:** GraphQL measurement fields are typed as numbers, but defensive parsing via `parseFloat` and `isNaN` guard is necessary for resilience per RESIL-03.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Deduplication | Custom dedup logic in portal parser | Existing `saveSessionToHistory()` | Already deduplicates by `report_id`; adding a second dedup layer creates two sources of truth |
| Base64 decode | Custom base64 decoder | `atob()` | Browser built-in, available in MV3 service workers, handles all valid base64 |
| PascalCase conversion library | `lodash.startcase` or similar | Single `toPascalCase()` helper function | One-liner; no dependency justified for `str[0].toUpperCase() + str.slice(1)` |
| Metric averaging | Compute averages per club in parser | Leave `averages: {}` empty (matching interceptor) | CSV writer computes averages inline from shots; parser should not duplicate this |
| GraphQL query construction | Build query string in parser | Query belongs in Phase 24's handler | Parser is a pure transform function; it receives already-fetched data |

**Key insight:** The parser is a pure data transformation — input shape in, SessionData out. It has no I/O, no storage, and no Chrome API calls. All infrastructure (fetching, storing, deduplication) lives in Phase 24's service worker handler.

---

## Runtime State Inventory

Step 2.5: SKIPPED — this is a greenfield module addition (new file `portal_parser.ts`). No rename, refactor, or migration. No runtime state affected.

---

## Environment Availability

Step 2.6: Minimal external dependencies for this phase.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `atob()` | Base64 decode of activity ID | ✓ | Browser built-in (MV3 service worker) | Manual base64 decode (not needed) |
| TypeScript | Build | ✓ | 5.9.3 | — |
| vitest | Test suite | ✓ | 4.0.18 | — |
| `esbuild` | Build | ✓ | project scripts | — |
| Live Trackman API | Confirm exact field names | ✗ | — | Alias map + index signature fallback handles unknown names |

**Missing dependencies with no fallback:**
- Confirmed Trackman GraphQL `Measurement` field names — the exact casing is unverified (see Open Questions). The alias map + `toPascalCase` fallback handles this defensively, but the alias map will need correction after live inspection in Phase 24.

---

## Common Pitfalls

### Pitfall 1: Phantom Metric Labels from Null Fields

**What goes wrong:** Including fields with null/undefined/NaN values in `metric_names` causes CSV to have column headers with no data.
**Why it happens:** Iterating `Object.entries(measurement)` returns all keys, including those with `null` values.
**How to avoid:** Guard with `if (value === null || value === undefined) continue;` and `if (isNaN(numValue)) continue;` before adding to `allMetricNames`. Only add to `allMetricNames` after confirming a valid numeric value was stored.
**Warning signs:** Success criterion #3 explicitly checks this — test fixture should include a stroke where some fields are null.

### Pitfall 2: Wrong report_id Breaks Deduplication

**What goes wrong:** If portal parser uses the raw base64 activity ID as `report_id` instead of the extracted UUID, dedup with interceptor-captured sessions fails. Both sources would be stored separately.
**Why it happens:** The interceptor's `parseSessionData()` extracts `report_id` from `?a=` URL param which is the UUID, not the base64 form.
**How to avoid:** Always call `extractActivityUuid()` — decode and split. Verify in tests that `extractActivityUuid("U2Vzc2lvbkFjdGl2aXR5CmFiYzEyMw==")` returns `"abc123"` (not the base64 string).
**Warning signs:** History shows two entries for the same session, one from interceptor and one from portal.

### Pitfall 3: GraphQL Field Name Casing Mismatch

**What goes wrong:** The alias map assumes `clubSpeed` (camelCase) but Trackman's API returns `ClubSpeed` (PascalCase) or `club_speed` (snake_case), so the alias map never matches and all fields get double-PascalCased (e.g., `ClubspeedValue` instead of `ClubSpeed`).
**Why it happens:** Trackman's exact GraphQL field names are unconfirmed from documentation. STATE.md notes the docs returned 404.
**How to avoid:** The alias map + `toPascalCase` fallback still produces usable column names even with wrong casing (just not aligned to `METRIC_KEYS`). The critical verification step is inspecting an actual `Stroke.measurement` response in Phase 24 and patching the alias map then. Test fixtures should use whatever casing was confirmed at Phase 22 execution time.
**Warning signs:** Phase 24 CSV export shows `Clubspeed` instead of `ClubSpeed` in column headers.

### Pitfall 4: Iterating `Object.entries` on TypeScript Interface with Index Signature

**What goes wrong:** If `StrokeMeasurement` has an index signature, TypeScript allows `Object.entries()` without type narrowing, but at runtime some keys may not be numeric (e.g., string metadata fields).
**Why it happens:** GraphQL may include non-numeric fields in `measurement` (e.g., IDs, timestamps).
**How to avoid:** The `isNaN(numValue)` guard handles non-numeric values at runtime. Additionally, the `typeof value === "number"` fast path avoids `parseFloat` overhead for numeric fields.
**Warning signs:** `NaN` metric values appearing in fixture tests when string metadata fields are included in the measurement object.

### Pitfall 5: Importing METRIC_KEYS into portal_parser.ts

**What goes wrong:** Using `METRIC_KEYS.has(key)` to filter portal metrics is tempting as a way to ensure only "known" metrics get through, but this violates D-01 and would silently discard the 30+ additional portal fields.
**Why it happens:** The interceptor uses METRIC_KEYS filtering; copy-pasting the pattern would inherit the filter.
**How to avoid:** The alias map is built from METRIC_KEYS conceptually, but is used for NAME MAPPING only, not FILTERING. Every non-null numeric field passes through regardless of whether it's in METRIC_KEYS.

---

## Code Examples

### Verified: `atob()` availability in Chrome MV3 service workers

```typescript
// Source: MDN Web API docs + Chrome Extensions MV3 service worker environment
// atob() is available as a global in Chrome extension service workers
const decoded = atob("U2Vzc2lvbkFjdGl2aXR5\nYWJjMTIz");
// decoded === "SessionActivity\nabc123"
const uuid = decoded.split("\n")[1]; // "abc123"
```

**Confidence:** HIGH — `atob` is a Web API available in all modern browser contexts including service workers.

### Verified: interceptor.ts null-omit pattern (existing codebase)

```typescript
// Source: src/content/interceptor.ts lines 136-149
for (const [key, value] of Object.entries(merged)) {
  if (!METRIC_KEYS.has(key)) continue;  // interceptor filters; portal parser does NOT
  let numValue: number | null = null;
  if (typeof value === "number") {
    numValue = value;
  } else if (typeof value === "string") {
    const trimmed = value.trim();
    numValue = isNaN(parseFloat(trimmed)) ? null : parseFloat(trimmed);
  }
  if (numValue !== null) {       // omit null/NaN — same strategy for portal parser
    allMetricNames.add(key);
    shotMetrics[key] = `${numValue}`;   // string convention
  }
}
```

### Verified: history.ts dedup by report_id (existing codebase)

```typescript
// Source: src/shared/history.ts lines 36-43
const filtered = existing.filter(
  (entry) => entry.snapshot.report_id !== session.report_id
);
// Removes existing entry with same report_id — portal import replaces interceptor entry
```

### Verified: SessionData.url_type "activity" already supported

```typescript
// Source: src/models/types.ts line 24
url_type: "report" | "activity";  // "activity" is already a valid value
```

---

## State of the Art

| Old Approach | Current Approach | Notes |
|--------------|------------------|-------|
| Interceptor-only capture (29 fields) | Portal import (60+ fields) | Both coexist; portal supplements interceptor |
| URL-param report_id | UUID from base64 activity ID | Same UUID value for dedup to work |
| StrokeGroups REST JSON | GraphQL Stroke.measurement nodes | Different input shape; same SessionData output |

---

## Open Questions

1. **Exact Trackman GraphQL `Measurement` field names and casing**
   - What we know: STATE.md confirms "Measurement type has 60+ fields — superset of what the interceptor captures"; the 29 METRIC_KEYS give us the semantic mapping targets
   - What's unclear: Whether GraphQL uses `clubSpeed` (camelCase), `ClubSpeed` (PascalCase), `club_speed` (snake_case), or even the same names as the REST API's `NormalizedMeasurement` keys
   - Recommendation: Write alias map with camelCase assumption (most common GraphQL convention); add index-signature fallback; annotate with a `// TODO: verify against live API in Phase 24` comment. The `toPascalCase` fallback ensures no data is lost even if casing assumptions are wrong.

2. **GraphQL `strokeGroups` vs `strokes` nesting structure**
   - What we know: The interceptor consumes `StrokeGroups[i].Strokes[j].Measurement`; the GraphQL schema likely nests strokes under an activity via a `strokeGroups` or similar field
   - What's unclear: The exact GraphQL field name for grouping (could be `strokeGroups`, `groups`, `clubGroups`, etc.) and whether it is paginated
   - Recommendation: Define `GraphQLActivity` with optional `strokeGroups?: GraphQLStrokeGroup[]` and guard all access with null-coalescing. If Phase 24's query response shows different nesting, only the type definitions need updating, not the core iteration logic.

3. **Whether the `node(id)` query returns strokes pre-grouped by club or as a flat list**
   - What we know: PROJECT.md references "single-session pull via `node(id)` query"; STATE.md notes "Older SESSION type activities accessible via node(id) query even without reportLink"
   - What's unclear: Whether the GraphQL response groups strokes by club (parallel to REST StrokeGroups) or returns them as a flat array requiring client-side grouping
   - Recommendation: Handle both. Design `GraphQLActivity.strokeGroups` as the primary path. If Phase 24 discovers a flat `strokes` array, add a `groupStrokesByClub()` helper that creates synthetic groups from a `stroke.club` or `stroke.clubName` field.

4. **Date field format in GraphQL activity response**
   - What we know: SessionData expects `date: string`; the interceptor reads from `data.Time.Date` or `strokeGroups[0].Date`
   - What's unclear: Whether the GraphQL activity date is an ISO 8601 string, a Unix timestamp, or Trackman's proprietary format
   - Recommendation: Store whatever string value is returned without transformation. The existing CSV pipeline accepts any `date` string. If it's a Unix timestamp number, call `String(date)`.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 4.0.18 |
| Config file | `vitest.config.ts` (root) — include pattern `tests/test_*.ts` |
| Quick run command | `npx vitest run tests/test_portal_parser.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PIPE-01 | All non-null numeric measurement fields are included in output | unit | `npx vitest run tests/test_portal_parser.ts` | Wave 0 |
| PIPE-01 | Null measurement fields are omitted from output and from `metric_names` | unit | `npx vitest run tests/test_portal_parser.ts` | Wave 0 |
| PIPE-01 | GraphQL field names are normalized to PascalCase in output | unit | `npx vitest run tests/test_portal_parser.ts` | Wave 0 |
| PIPE-01 | Known alias mappings produce canonical METRIC_KEYS names (e.g. `clubSpeed` → `ClubSpeed`) | unit | `npx vitest run tests/test_portal_parser.ts` | Wave 0 |
| PIPE-01 | `metric_names` contains only fields that were actually populated in shots | unit | `npx vitest run tests/test_portal_parser.ts` | Wave 0 |
| PIPE-01 | Metric values are stored as strings matching `Record<string, string>` convention | unit | `npx vitest run tests/test_portal_parser.ts` | Wave 0 |
| PIPE-01 | `url_type` is `"activity"` on parsed sessions | unit | `npx vitest run tests/test_portal_parser.ts` | Wave 0 |
| PIPE-01 | Parser returns `null` for malformed input (missing id, empty strokeGroups) without throwing | unit | `npx vitest run tests/test_portal_parser.ts` | Wave 0 |
| PIPE-03 | `report_id` is the UUID extracted from base64, not the raw base64 string | unit | `npx vitest run tests/test_portal_parser.ts` | Wave 0 |
| PIPE-03 | `extractActivityUuid` returns base64 input unchanged when decode fails | unit | `npx vitest run tests/test_portal_parser.ts` | Wave 0 |

**Manual-only tests (cannot be automated):**
- Live dedup: import same session via portal after capturing via interceptor → history shows one entry with portal metrics. Requires live Trackman portal session and real interceptor capture.

### Fixture Design

The test suite should define inline fixture objects (not JSON files), following the `test_graphql_client.ts` pattern of constructing typed inputs directly in test code. Key fixtures needed:

```typescript
// Minimal valid activity with two clubs and mixed null/non-null fields
const FIXTURE_ACTIVITY: GraphQLActivity = {
  id: btoa("SessionActivity\nabc-uuid-123"),  // encodes to valid base64
  date: "2026-01-15",
  strokeGroups: [
    {
      club: "7-Iron",
      strokes: [
        {
          measurement: {
            clubSpeed: 85.4,
            ballSpeed: 120.1,
            carry: null,          // should be omitted
            spinRate: 7200,
          }
        }
      ]
    }
  ]
};
```

### Sampling Rate

- **Per task commit:** `npx vitest run tests/test_portal_parser.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/test_portal_parser.ts` — covers PIPE-01 and PIPE-03 with inline fixtures

*(All other test infrastructure exists — vitest.config.ts, tests/ directory, import patterns confirmed from test_graphql_client.ts.)*

---

## Sources

### Primary (HIGH confidence)

- `src/content/interceptor.ts` lines 11-174 — Reference implementation for the parsing pattern; direct model for portal parser structure
- `src/models/types.ts` — `SessionData`, `Shot`, `ClubGroup`, `SessionSnapshot` — confirmed target types
- `src/shared/history.ts` lines 24-66 — `saveSessionToHistory()` dedup logic — confirmed no changes needed for PIPE-03
- `src/shared/unit_normalization.ts` — `MetricValue` type definition (`string | number | null`); string storage convention confirmed
- `.planning/STATE.md` — "Base64 activity IDs decode to SessionActivity\n{uuid}" — confirmed from Phase 22 findings
- MDN Web API — `atob()` available in service workers (global Web API)

### Secondary (MEDIUM confidence)

- `.planning/STATE.md` — "Measurement type has 60+ fields — superset of what the interceptor captures" — no field list confirmed
- `.planning/PROJECT.md` — `node(id)` query design — Phase 24 will implement the query; parser receives its output
- Phase 22 live verification (22-02-SUMMARY.md) — confirmed `api.trackmangolf.com/graphql` accepts `credentials:include`; auth working

### Tertiary (LOW confidence)

- Assumed GraphQL camelCase field names in alias map — training data pattern (GraphQL convention is camelCase) applied to Trackman; unverified against live schema. Must confirm during Phase 24 implementation.
- Assumed `strokeGroups` nesting structure in `GraphQLActivity` — exact field name unconfirmed.

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — pure TypeScript, no new deps, verified built-ins
- Architecture patterns: HIGH — directly modeled on existing `parseSessionData()` in same codebase
- Deduplication behavior: HIGH — confirmed from `history.ts` source
- UUID extraction: HIGH — `atob()` availability confirmed; format confirmed in STATE.md
- GraphQL field names in alias map: LOW — camelCase is the convention assumption; exact Trackman names unverified

**Research date:** 2026-03-26
**Valid until:** 2026-04-26 (stable TypeScript + Chrome APIs; Trackman schema LOW confidence items must be verified at Phase 24 execution)
