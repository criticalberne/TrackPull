# Phase 24: Service Worker Import Flow - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-26
**Phase:** 24-service-worker-import-flow
**Areas discussed:** Import status model, Concurrent imports, Activity list caching, Error handling

---

## Import Status Model

### Status Granularity

| Option | Description | Selected |
|--------|-------------|----------|
| Simple result only | Store just final state: idle/importing/success/error. Minimal storage, matches existing toast patterns. | ✓ |
| Progress tracking | Store intermediate progress (fetching/parsing/saving). More informative but complex for a 1-2 second operation. | |
| Full audit trail | Log each step with timestamps. Useful for debugging but heavyweight. | |

**User's choice:** Simple result only
**Notes:** None

### Status Lifecycle on Re-open

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-clear on read | Popup reads status, shows result, clears storage key. Prevents stale messages. | ✓ |
| Persist until dismissed | Status stays until user closes notification. Ensures nothing is missed but could show outdated info. | |

**User's choice:** Auto-clear on read
**Notes:** None

### Status Key Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Single global status | One IMPORT_STATUS key. Simple since only one import runs at a time. | ✓ |
| Per-activity status map | Map of activity ID → status. Allows tracking multiple imports. More complex. | |

**User's choice:** Single global status
**Notes:** None

---

## Concurrent Imports

| Option | Description | Selected |
|--------|-------------|----------|
| One at a time | Disable Import button while in progress. Simple, avoids race conditions. | ✓ |
| Queue sequential | Accept second request, queue after first. Complex state management. | |
| Allow parallel | Multiple simultaneous imports. Requires per-activity status (contradicts D-03). | |

**User's choice:** One at a time
**Notes:** None

---

## Activity List Caching

### Caching Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Always re-fetch | Fresh fetch on every popup open. Fast call, no staleness risk. | ✓ |
| Cache with TTL | Store with timestamp, re-fetch after N minutes. Saves a network call. | |
| Cache until manual refresh | Store until explicit refresh button click. Fastest re-open. | |

**User's choice:** Always re-fetch
**Notes:** None

### Page Size

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed page (e.g., 50) | Single query for recent activities. Simple, no pagination UI. | |
| Small page + load more | 20 initially with Load More button. Lighter initial payload. | |
| You decide | Claude picks based on API findings. | ✓ |

**User's choice:** You decide
**Notes:** Claude has discretion on page size based on research findings.

---

## Error Handling

### Failure Response

| Option | Description | Selected |
|--------|-------------|----------|
| Store error, no retry | Write error to status. User can manually retry. Simple. | ✓ |
| Auto-retry once | Retry once before storing error. Handles transient blips. | |
| Retry with backoff | Up to 3 retries with exponential backoff. Complex, MV3 timeout concern. | |

**User's choice:** Store error, no retry
**Notes:** None

### Auth Error Differentiation

| Option | Description | Selected |
|--------|-------------|----------|
| Auth-specific message | Detect UNAUTHENTICATED via classifyAuthResult, show login link. Actionable. | ✓ |
| Generic error only | Same message for all failures. Simpler but less helpful. | |

**User's choice:** Auth-specific message
**Notes:** None

### Auth Error Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Both handlers | FETCH_ACTIVITIES and IMPORT_SESSION both detect auth errors. | ✓ |
| Import only | Only IMPORT_SESSION differentiates auth errors. | |

**User's choice:** Both handlers
**Notes:** None

### Empty Activity Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Specific empty message | Show "No shot data found" instead of saving empty session. | ✓ |
| Save empty session | Save to history with zero shots. Technically consistent. | |
| You decide | Claude picks based on parser behavior. | |

**User's choice:** Specific empty message
**Notes:** Prevents confusing zero-shot entries in history.

---

## Claude's Discretion

- Activity page size (based on GraphQL API research)
- Internal handler structure and GraphQL query shapes
- Import status object field names in storage
- Whether to extract shared error-classification logic
- How to wire portal parser into the import flow

## Deferred Ideas

None — discussion stayed within phase scope
