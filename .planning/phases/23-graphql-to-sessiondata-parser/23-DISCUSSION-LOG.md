# Phase 23: GraphQL-to-SessionData Parser - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-26
**Phase:** 23-graphql-to-sessiondata-parser
**Areas discussed:** Field coverage, Deduplication identity, Metric name alignment

---

## Field Coverage

### Q1: How many of the 60+ GraphQL Measurement fields should portal imports capture?

| Option | Description | Selected |
|--------|-------------|----------|
| Match interceptor (~29) | Only capture the same METRIC_KEYS the interceptor uses. Identical CSV columns. Simple but leaves 30+ fields on the table. | |
| Capture all available | Grab every non-null Measurement field from GraphQL. Richer data, CSV columns expand automatically. | ✓ |
| Curated superset | Define a larger curated list (40-50 fields). More than interceptor but not everything. | |

**User's choice:** Capture all available
**Notes:** None

### Q2: Should the interceptor also be updated to capture all fields?

| Option | Description | Selected |
|--------|-------------|----------|
| Keep interceptor as-is | Stays with 29 METRIC_KEYS. Different sources may have different column counts. | ✓ |
| Update interceptor too | Expand interceptor to match portal. Both sources produce identical columns. | |

**User's choice:** Keep interceptor as-is
**Notes:** None

### Q3: Should metric values be stored as strings or numbers?

| Option | Description | Selected |
|--------|-------------|----------|
| Strings (match interceptor) | Store as string values like interceptor. Consistent with existing Shot.metrics type. | ✓ |
| Numbers | Store as numbers where possible. More semantically correct but may need downstream changes. | |
| You decide | Claude picks whichever minimizes downstream changes. | |

**User's choice:** Strings (match interceptor)
**Notes:** None

---

## Deduplication Identity

### Q4: How should a portal-imported session be linked to an interceptor-captured session?

| Option | Description | Selected |
|--------|-------------|----------|
| Activity UUID as report_id | Extract UUID from base64 activity ID, use as report_id. Natural dedup via existing history logic. | ✓ |
| Fingerprint matching | Match by content fingerprint (date + shot count + clubs). More resilient but complex. | |
| You decide | Claude investigates actual ID relationship and picks the most reliable approach. | |

**User's choice:** Activity UUID as report_id
**Notes:** None

### Q5: When a duplicate is found, which version should be kept?

| Option | Description | Selected |
|--------|-------------|----------|
| Portal wins | Portal has 60+ fields vs interceptor's 29. Replace with richer data. | ✓ |
| Newer wins | Whichever was captured more recently replaces the older one. | |
| Keep both | Don't deduplicate. Simple but confusing. | |

**User's choice:** Portal wins
**Notes:** None

---

## Metric Name Alignment

### Q6: How should GraphQL field names be aligned with interceptor metric names?

| Option | Description | Selected |
|--------|-------------|----------|
| Canonical alias map | Map GraphQL names to METRIC_KEYS where overlap exists. New fields keep their GraphQL names. | ✓ |
| Use GraphQL names as-is | Store whatever GraphQL returns. May cause inconsistent CSV columns across sources. | |
| You decide | Claude investigates actual field names during research. | |

**User's choice:** Canonical alias map
**Notes:** None

### Q7: For new fields beyond the 29, should headers be human-friendly or raw API names?

| Option | Description | Selected |
|--------|-------------|----------|
| PascalCase from API | Keep whatever casing the GraphQL API returns. | |
| Normalized PascalCase | Normalize all to PascalCase to match interceptor convention. | ✓ |
| You decide | Claude normalizes to match existing pattern. | |

**User's choice:** Normalized PascalCase
**Notes:** None

---

## Claude's Discretion

- Parser function API shape and internal structure
- UUID extraction from base64 activity ID
- Null/missing field handling (omit vs empty)
- Alias map implementation (static vs generated)
- ClubGroup grouping from GraphQL structure
- Error handling for malformed responses

## Deferred Ideas

None — discussion stayed within phase scope
