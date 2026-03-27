# Phase 24: Service Worker Import Flow - Research

**Researched:** 2026-03-26
**Domain:** Chrome MV3 service worker message handlers, GraphQL activity fetching, portal parser integration, chrome.storage.local status persistence
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Simple result-only status — store final state: `idle` / `importing` / `success` / `error`. No intermediate progress tracking.
- **D-02:** Auto-clear on read — popup reads `success` or `error`, displays result, then clears the storage key.
- **D-03:** Single global status key in `chrome.storage.local` (e.g., `IMPORT_STATUS`) — not per-activity.
- **D-04:** One import at a time. Popup disables Import button while importing. No queuing.
- **D-05:** Always re-fetch activity list on every popup open — no caching.
- **D-06:** Claude's Discretion — researcher picks the right page size based on what the GraphQL API supports.
- **D-07:** Store error to status key, no automatic retry.
- **D-08:** Auth-specific error messages — reuse `classifyAuthResult()` from `graphql_client.ts`. Show "Session expired — log into portal.trackmangolf.com" with a link for UNAUTHENTICATED errors.
- **D-09:** Empty activity handling — if an activity has no strokes, show "No shot data found for this activity" rather than saving an empty session.

### Claude's Discretion

- Internal structure of the FETCH_ACTIVITIES and IMPORT_SESSION handlers
- GraphQL query shape for fetching activities (field selection, pagination variables)
- How the import status object is structured in storage (exact field names)
- Whether to extract shared error-classification logic or inline it per handler
- How to wire the portal parser (Phase 23) into the import flow

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BROWSE-02 | User can select a single activity and import its full shot data into the extension | FETCH_ACTIVITIES handler returns activity list; IMPORT_SESSION handler executes import pipeline |
| PIPE-02 | An imported session supports CSV export, TSV clipboard copy, AI launch, and history storage — identical to intercepted sessions | `saveSessionToHistory()` + existing `TRACKMAN_DATA` storage key handle all downstream paths unchanged |
| RESIL-01 | Session import continues in the service worker even if the popup is closed mid-import | Fire-and-forget IIFE in service worker; `sendResponse()` called immediately, import continues async |
| RESIL-02 | Popup reads import status from storage on open/re-open and displays progress or completion | `IMPORT_STATUS` key in `chrome.storage.local`; popup reads on `DOMContentLoaded`, clears on read (D-02) |
</phase_requirements>

---

## Summary

Phase 24 adds two message handlers to the service worker — `FETCH_ACTIVITIES` and `IMPORT_SESSION` — and introduces an `IMPORT_STATUS` storage key that persists import state across popup open/close cycles. All the plumbing needed for this phase already exists: `executeQuery()` handles authenticated GraphQL calls, `parsePortalActivity()` converts activity responses to `SessionData`, `saveSessionToHistory()` deduplicates and persists, and `classifyAuthResult()` identifies auth errors. This phase wires them together.

The resilience requirement (RESIL-01) is met by calling `sendResponse()` immediately and running the import pipeline in a fire-and-forget async IIFE — the same pattern already used for the PORTAL_AUTH_CHECK handler and the history save in SAVE_DATA. The popup-side requirement (RESIL-02) is met by reading `IMPORT_STATUS` on every `DOMContentLoaded` and clearing it after display (D-02). No new patterns need to be invented; every pattern needed is already proven in the codebase.

The GraphQL activity list query needs two fields per activity: `id` (base64 activity ID, needed for IMPORT_SESSION) and `date` (display in Phase 25 UI). The IMPORT_SESSION query fetches the full activity node with `strokeGroups` and `strokes.measurement` — the same shape `GraphQLActivity` type in `portal_parser.ts` already expects. Page size recommendation: 20 activities per fetch matches the `MAX_SESSIONS = 20` history cap and keeps the response light.

**Primary recommendation:** Replace the `PORTAL_IMPORT_REQUEST` stub with `IMPORT_SESSION`, add `FETCH_ACTIVITIES`, add `IMPORT_STATUS` to `STORAGE_KEYS`, wire popup to read and clear status on open.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| chrome.storage.local | MV3 built-in | Persist IMPORT_STATUS and TRACKMAN_DATA | Already used throughout extension; survives service worker idle/restart |
| chrome.runtime.onMessage | MV3 built-in | Receive FETCH_ACTIVITIES and IMPORT_SESSION messages from popup | Established IPC pattern in codebase |
| fetch() with credentials:include | MV3 built-in | Authenticated GraphQL calls via existing executeQuery() | Already validated in Phase 22 |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| executeQuery\<T\>() | project | Typed GraphQL execution with cookie auth | Both FETCH_ACTIVITIES and IMPORT_SESSION handlers |
| classifyAuthResult() | project | Detects UNAUTHENTICATED errors in GraphQL response | Auth error branch in both handlers (D-08) |
| parsePortalActivity() | project | Converts GraphQLActivity to SessionData | IMPORT_SESSION handler after fetching full activity |
| saveSessionToHistory() | project | Dedup + persist to history | IMPORT_SESSION handler after successful parse |
| hasPortalPermission() | project | Permission gate before any portal API call | Both handlers, same as PORTAL_AUTH_CHECK |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Single global IMPORT_STATUS key | Per-activity status keys | Single key is correct per D-03; no queuing, one import at a time |
| Fire-and-forget IIFE for import resilience | Returning false from onMessage handler | IIFE with sendResponse()+return true is the established MV3 async response pattern |
| Auto-clear on popup read (D-02) | TTL-based expiry | Auto-clear is simpler and avoids stale message problem without a timer |

**Installation:** No new packages needed. All dependencies are built-in Chrome APIs or existing project modules.

---

## Architecture Patterns

### New Types and Constants

```
src/shared/constants.ts         — Add IMPORT_STATUS to STORAGE_KEYS
src/background/serviceWorker.ts — Add FetchActivitiesRequest, ImportSessionRequest interfaces;
                                   add to RequestMessage union; implement both handlers
src/popup/popup.ts              — Read IMPORT_STATUS on DOMContentLoaded, clear after display
```

### Pattern 1: Async Message Handler with Immediate sendResponse

The correct MV3 pattern for async work in `onMessage`. `sendResponse` is called right away; async work runs in a fire-and-forget IIFE. The handler returns `true` to keep the response channel open.

**When to use:** Both FETCH_ACTIVITIES (synchronous-ish: await query, send result) and IMPORT_SESSION (send response quickly, import continues async after).

```typescript
// Source: existing serviceWorker.ts PORTAL_AUTH_CHECK handler (lines 134-158)
if (message.type === "PORTAL_AUTH_CHECK") {
  (async () => {
    const granted = await hasPortalPermission();
    if (!granted) {
      sendResponse({ success: true, status: "denied" });
      return;
    }
    try {
      const result = await executeQuery<{ me: { id: string } | null }>(HEALTH_CHECK_QUERY);
      const authStatus = classifyAuthResult(result);
      sendResponse({
        success: true,
        status: authStatus.kind,
        message: authStatus.kind === "error" ? authStatus.message : undefined,
      });
    } catch (err) {
      sendResponse({ success: true, status: "error", message: "Unable to reach Trackman — try again later" });
    }
  })();
  return true;
}
```

### Pattern 2: IMPORT_SESSION Resilience Pattern

For RESIL-01: call `sendResponse()` before the async work completes so the popup is not blocked. The import continues after the popup may have closed.

```typescript
// Pseudocode — mirrors SAVE_DATA fire-and-forget pattern (serviceWorker.ts line 72)
if (message.type === "IMPORT_SESSION") {
  (async () => {
    const granted = await hasPortalPermission();
    if (!granted) {
      sendResponse({ success: false, error: "Portal permission not granted" });
      return;
    }
    // Write importing status BEFORE responding — popup can read it immediately
    await chrome.storage.local.set({ [STORAGE_KEYS.IMPORT_STATUS]: { state: "importing" } });
    sendResponse({ success: true });  // Popup is now free to close

    // Import runs in service worker regardless of popup state
    try {
      const result = await executeQuery<{ node: GraphQLActivity }>(FETCH_ACTIVITY_QUERY, { id: activityId });
      // ... parse, check empty, save to history, write success status
      const session = parsePortalActivity(result.data.node);
      if (!session) {
        await chrome.storage.local.set({ [STORAGE_KEYS.IMPORT_STATUS]: { state: "error", message: "No shot data found for this activity" } });
        return;
      }
      await saveSessionToHistory(session);
      await chrome.storage.local.set({ [STORAGE_KEYS.TRACKMAN_DATA]: session });
      await chrome.storage.local.set({ [STORAGE_KEYS.IMPORT_STATUS]: { state: "success" } });
    } catch (err) {
      // ... classify auth errors, write error status
    }
  })();
  return true;
}
```

### Pattern 3: IMPORT_STATUS Storage Object Shape

```typescript
// Recommended shape for the IMPORT_STATUS value in chrome.storage.local
type ImportStatus =
  | { state: "idle" }
  | { state: "importing" }
  | { state: "success" }
  | { state: "error"; message: string };
```

This covers all four states from D-01. The `message` field is only needed on `error`. `idle` is the initial/cleared state (absence of the key is equivalent to idle).

### Pattern 4: Popup Reads and Clears Status on Open

```typescript
// In popup DOMContentLoaded (RESIL-02 + D-02)
const statusResult = await new Promise<Record<string, unknown>>((resolve) => {
  chrome.storage.local.get([STORAGE_KEYS.IMPORT_STATUS], resolve);
});
const importStatus = statusResult[STORAGE_KEYS.IMPORT_STATUS] as ImportStatus | undefined;
if (importStatus && (importStatus.state === "success" || importStatus.state === "error")) {
  // Display toast or inline message
  showImportResult(importStatus);
  // Clear immediately after reading (D-02)
  chrome.storage.local.remove(STORAGE_KEYS.IMPORT_STATUS);
}
```

### Pattern 5: GraphQL Query Shapes

**FETCH_ACTIVITIES query** — returns activity list for display in Phase 25 UI. Only `id` and `date` needed at this phase (FETCH_ACTIVITIES response consumed by Phase 25 for display, but handler lives here per phase boundary).

```graphql
query FetchActivities($first: Int!) {
  activities(first: $first) {
    edges {
      node {
        id
        date
      }
    }
  }
}
```

Variables: `{ first: 20 }` (page size recommendation — see D-06 discussion below).

**IMPORT_SESSION query** — fetches full activity with shot data. Matches the `GraphQLActivity` interface already defined in `portal_parser.ts`:

```graphql
query FetchActivityById($id: ID!) {
  node(id: $id) {
    ... on SessionActivity {
      id
      date
      strokeGroups {
        club
        strokes {
          id
          measurement {
            clubSpeed ballSpeed smashFactor attackAngle clubPath faceAngle
            faceToPath swingDirection dynamicLoft spinRate spinAxis spinLoft
            launchAngle launchDirection carry total side sideTotal carrySide
            totalSide height maxHeight curve landingAngle hangTime
            lowPointDistance impactHeight impactOffset tempo
          }
        }
      }
    }
  }
}
```

The `node(id: $id)` query on base64-encoded `SessionActivity` IDs was confirmed working for older SESSION type activities during Phase 22 research (STATE.md: "Older SESSION type activities accessible via node(id) query even without reportLink").

### Anti-Patterns to Avoid

- **Blocking sendResponse until import completes:** violates RESIL-01 and will cause MV3 response channel timeout (30s max). Always `sendResponse()` before the async import work.
- **Storing `SessionData` in IMPORT_STATUS:** IMPORT_STATUS holds result state only. `SessionData` goes in `TRACKMAN_DATA` (existing key) so all downstream export/AI/history paths work without change (PIPE-02).
- **Setting IMPORT_STATUS to success before saveSessionToHistory resolves:** Write success status only after both `saveSessionToHistory()` and `chrome.storage.local.set(TRACKMAN_DATA)` succeed. Order matters for popup correctness.
- **Not checking `hasPortalPermission()` at handler entry:** Both handlers must gate on permission, matching the PORTAL_AUTH_CHECK pattern.
- **Saving an empty session (D-09):** If `parsePortalActivity()` returns `null`, write an error status with "No shot data found for this activity" — do not call `saveSessionToHistory()`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Auth error detection | Custom error string parsing | `classifyAuthResult()` in graphql_client.ts | Already handles UNAUTHENTICATED code + message substring patterns; tested in 16 test cases |
| GraphQL execution with cookie auth | Custom fetch wrapper | `executeQuery<T>()` in graphql_client.ts | Handles credentials:include, error throwing on non-2xx, typed response parsing |
| Activity-to-SessionData mapping | Custom field mapper | `parsePortalActivity()` in portal_parser.ts | Handles all 29 METRIC_KEYS aliases, PascalCase normalization, null/undefined/NaN filtering, UUID extraction |
| History dedup and eviction | Custom storage logic | `saveSessionToHistory()` in history.ts | Handles dedup by report_id, eviction at 20-session cap, newest-first sort |
| Permission check | Inline permission query | `hasPortalPermission()` in portalPermissions.ts | Already imported in serviceWorker.ts |

**Key insight:** Every non-trivial piece of this phase is already implemented and tested. Phase 24 is pure wiring — compose existing functions in two new message handlers.

---

## Common Pitfalls

### Pitfall 1: MV3 Service Worker Idle Termination During Import
**What goes wrong:** MV3 service workers can be terminated by Chrome at any point after 30 seconds of inactivity. If the import is triggered by a message, the service worker has an active message port that keeps it alive — but only until `sendResponse()` is called. After that, the port closes and the SW may idle.
**Why it happens:** MV3 removed persistent service workers. The 30s timer resets on new events but not on ongoing async work.
**How to avoid:** For the import (RESIL-01), write `IMPORT_STATUS = importing` to storage BEFORE calling `sendResponse()`. The storage write itself keeps the SW alive briefly. The actual import GraphQL call + save should complete in 1-2 seconds (per CONTEXT.md assessment), well within normal SW lifecycle. D-07 already eliminates retry loops that would be the real risk.
**Warning signs:** Import status stuck at `importing` without transitioning to `success` or `error`. This would indicate the SW was killed mid-operation — a real concern for retries, not single fast imports.

### Pitfall 2: sendResponse Called After Channel Closes
**What goes wrong:** If `sendResponse` is called after the popup has closed, Chrome throws "The message channel closed before a response was received."
**Why it happens:** The message channel has a finite lifetime tied to the sender context. The IMPORT_SESSION pattern is specifically designed to avoid this — `sendResponse` is called before the async import work, not after.
**How to avoid:** Always call `sendResponse()` early in the IMPORT_SESSION handler (after writing `importing` status), not at the end. The FETCH_ACTIVITIES handler can call `sendResponse` with the full result since it awaits the query before responding (fetch is fast, popup stays open).
**Warning signs:** Console error: "The message channel closed before a response was received." This would mean `sendResponse` is being called too late.

### Pitfall 3: IMPORT_STATUS Not Cleared — Stale Message Problem
**What goes wrong:** User imports a session, closes popup, then opens popup hours later and sees a stale "success" toast from the earlier import.
**Why it happens:** IMPORT_STATUS persists until explicitly cleared.
**How to avoid:** D-02 specifies clear-on-read. Popup reads IMPORT_STATUS on `DOMContentLoaded`, displays result, then immediately calls `chrome.storage.local.remove(STORAGE_KEYS.IMPORT_STATUS)`. This is the canonical pattern.
**Warning signs:** User reports seeing import success messages they don't recognize from earlier sessions.

### Pitfall 4: RequestMessage Union Type Not Updated
**What goes wrong:** TypeScript throws "Object literal may only specify known properties" when the new message types are added to the handler but not to the `RequestMessage` union.
**Why it happens:** `serviceWorker.ts` line 51 has `type RequestMessage = SaveDataRequest | ExportCsvRequest | GetDataRequest | PortalImportRequest | PortalAuthCheckRequest`. The old `PortalImportRequest` should be replaced by `ImportSessionRequest`, and `FetchActivitiesRequest` added.
**How to avoid:** Add new request interface definitions (with `type` discriminant field), add them to `RequestMessage` union, and remove the now-superseded `PortalImportRequest` interface.
**Warning signs:** TypeScript compile errors on the handler `if (message.type === "FETCH_ACTIVITIES")` check.

### Pitfall 5: TRACKMAN_DATA Must Be Set for PIPE-02 Compliance
**What goes wrong:** Import saves to history but doesn't update `TRACKMAN_DATA`, so CSV export, TSV copy, and AI launch don't see the imported session (they all read from `TRACKMAN_DATA`).
**Why it happens:** `saveSessionToHistory()` only writes to `SESSION_HISTORY` storage key. `TRACKMAN_DATA` is the key the popup and export handlers read.
**How to avoid:** After a successful import, write the session to BOTH `TRACKMAN_DATA` and call `saveSessionToHistory()`. The `storage.onChanged` listener already fires `DATA_UPDATED` when `TRACKMAN_DATA` changes, so the popup will refresh automatically.
**Warning signs:** Import succeeds (history shows the session) but popup still shows the old session / export downloads old data.

### Pitfall 6: GraphQL Activity List Query Shape Unknown
**What goes wrong:** The query `activities(first: $first)` may not be the correct root field name on the Trackman schema; the actual root may be `myActivities`, `sessions`, `recentActivities`, or paginated differently.
**Why it happens:** Trackman's GraphQL schema has not been publicly documented; Phase 22 research confirmed `me { id }` works but did not verify activity list queries.
**How to avoid:** The FETCH_ACTIVITIES handler should be tested against the live API in a Wave 1 verification step. The query shape recommended here (`activities(first: N) { edges { node { id date } } }`) follows standard Relay connection convention; if it fails, fall back to `node` queries or introspection. D-06 gives Claude full discretion on this.
**Warning signs:** `errors` array in GraphQL response with "Cannot query field 'activities' on type 'Query'" or similar schema error.

---

## Code Examples

### Adding IMPORT_STATUS to STORAGE_KEYS

```typescript
// Source: src/shared/constants.ts — add to STORAGE_KEYS object
export const STORAGE_KEYS = {
  TRACKMAN_DATA: "trackmanData",
  SPEED_UNIT: "speedUnit",
  DISTANCE_UNIT: "distanceUnit",
  SELECTED_PROMPT_ID: "selectedPromptId",
  AI_SERVICE: "aiService",
  HITTING_SURFACE: "hittingSurface",
  INCLUDE_AVERAGES: "includeAverages",
  SESSION_HISTORY: "sessionHistory",
  IMPORT_STATUS: "importStatus",   // NEW — Phase 24
} as const;
```

### New Request Message Interfaces

```typescript
// Source: serviceWorker.ts — replace PortalImportRequest, add FetchActivitiesRequest
interface FetchActivitiesRequest {
  type: "FETCH_ACTIVITIES";
}

interface ImportSessionRequest {
  type: "IMPORT_SESSION";
  activityId: string;
}

// Updated union — remove PortalImportRequest, add both new types
type RequestMessage =
  | SaveDataRequest
  | ExportCsvRequest
  | GetDataRequest
  | FetchActivitiesRequest
  | ImportSessionRequest
  | PortalAuthCheckRequest;
```

### FETCH_ACTIVITIES Handler Skeleton

```typescript
if (message.type === "FETCH_ACTIVITIES") {
  (async () => {
    const granted = await hasPortalPermission();
    if (!granted) {
      sendResponse({ success: false, error: "Portal permission not granted" });
      return;
    }
    try {
      const result = await executeQuery<{ activities: { edges: Array<{ node: { id: string; date: string } }> } }>(
        FETCH_ACTIVITIES_QUERY,
        { first: 20 }
      );
      // Check for auth error
      const authStatus = classifyAuthResult(result as GraphQLResponse<{ me: { id: string } | null }>);
      // ... surface auth error or return activity list
      sendResponse({ success: true, activities: result.data?.activities?.edges?.map(e => e.node) ?? [] });
    } catch (err) {
      sendResponse({ success: false, error: "Unable to fetch activities — try again later" });
    }
  })();
  return true;
}
```

### IMPORT_SESSION Handler Skeleton

```typescript
if (message.type === "IMPORT_SESSION") {
  const { activityId } = message as ImportSessionRequest;
  (async () => {
    const granted = await hasPortalPermission();
    if (!granted) {
      sendResponse({ success: false, error: "Portal permission not granted" });
      return;
    }
    // Persist importing state and immediately free the popup (RESIL-01)
    await chrome.storage.local.set({ [STORAGE_KEYS.IMPORT_STATUS]: { state: "importing" } });
    sendResponse({ success: true });

    try {
      const result = await executeQuery<{ node: GraphQLActivity }>(
        IMPORT_SESSION_QUERY, { id: activityId }
      );
      // Auth check reusing existing classifier
      if (result.errors && result.errors.length > 0) {
        const authStatus = classifyAuthResult(result as GraphQLResponse<{ me: { id: string } | null }>);
        if (authStatus.kind === "unauthenticated") {
          await chrome.storage.local.set({ [STORAGE_KEYS.IMPORT_STATUS]: { state: "error", message: "Session expired — log into portal.trackmangolf.com" } });
          return;
        }
        await chrome.storage.local.set({ [STORAGE_KEYS.IMPORT_STATUS]: { state: "error", message: "Unable to reach Trackman — try again later" } });
        return;
      }
      const activity = result.data?.node;
      const session = activity ? parsePortalActivity(activity) : null;
      if (!session) {
        // D-09: empty activity
        await chrome.storage.local.set({ [STORAGE_KEYS.IMPORT_STATUS]: { state: "error", message: "No shot data found for this activity" } });
        return;
      }
      // PIPE-02: write to TRACKMAN_DATA so all export paths see the imported session
      await chrome.storage.local.set({ [STORAGE_KEYS.TRACKMAN_DATA]: session });
      await saveSessionToHistory(session);
      await chrome.storage.local.set({ [STORAGE_KEYS.IMPORT_STATUS]: { state: "success" } });
      console.log("TrackPull: Session imported successfully:", session.report_id);
    } catch (err) {
      console.error("TrackPull: Import failed:", err);
      await chrome.storage.local.set({ [STORAGE_KEYS.IMPORT_STATUS]: { state: "error", message: "Import failed — try again" } });
    }
  })();
  return true;
}
```

---

## D-06 Recommendation: Activity Page Size

**Recommendation: 20 activities** (HIGH confidence for this project, MEDIUM for API limit).

Rationale:
- The history cap is 20 sessions (`MAX_SESSIONS = 20` in `history.ts`). Fetching more than 20 activities means offering imports that would immediately evict earlier sessions — a poor UX.
- A batch of 20 activities with `id` and `date` fields is a lightweight response (< 2KB JSON).
- Phase 25 will add UI for browsing; if users need more, pagination can be added then.
- If the Trackman API imposes a lower max (e.g., 10), the query should use that lower value. The actual limit should be validated during Wave 1 testing against the live API.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| PORTAL_IMPORT_REQUEST stub (lines 160-171) | IMPORT_SESSION handler (replace stub) | Phase 24 | Replace with real implementation |
| No IMPORT_STATUS storage key | IMPORT_STATUS added to STORAGE_KEYS | Phase 24 | Popup can read result after popup close/reopen |
| portalImportBtn click logs "not yet implemented" | Popup sends IMPORT_SESSION message and reads status | Phase 24 | Actually imports a session |

---

## Open Questions

1. **GraphQL activity list root field name**
   - What we know: `me { id }` works for auth check; `node(id: $id)` works for fetching a specific session activity
   - What's unclear: Whether `activities(first: N)` is the correct root query for listing activities, or if the field is named differently (e.g., `myActivities`, `recentActivities`)
   - Recommendation: Treat this as a Wave 1 integration test. If introspection is available, query `__schema { queryType { fields { name } } }` to discover root field names. The FETCH_ACTIVITIES handler should surface a clear error if the query fails so the implementer can see the schema error and adjust.

2. **classifyAuthResult reuse for non-health-check responses**
   - What we know: `classifyAuthResult` expects `GraphQLResponse<{ me: { id: string } | null }>` — typed for the health check query shape
   - What's unclear: Whether casting non-health-check responses to this type for auth error detection is clean or fragile
   - Recommendation: Inline auth error detection in the import handlers using the same logic (check `errors[0].extensions?.code === "UNAUTHENTICATED"` and message substrings) rather than casting to the wrong type. This is the "extract shared error-classification logic or inline it per handler" discretion item from CONTEXT.md. Inlining is cleaner for handlers that have different response shapes.

---

## Environment Availability

Step 2.6: SKIPPED — Phase 24 is pure TypeScript/Chrome extension code changes. No external tools, services, runtimes, or CLI utilities beyond the existing project stack (Node.js, npx vitest) are required.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest (v1.1.1 per package.json) |
| Config file | `vitest.config.ts` (include: `tests/test_*.ts`) |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run` |

**Current suite:** 329 tests across 19 test files — all passing as of research date.

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BROWSE-02 | FETCH_ACTIVITIES handler returns activity list when permission granted | unit | `npx vitest run tests/test_service_worker_import.ts` | Wave 0 |
| BROWSE-02 | FETCH_ACTIVITIES handler returns auth error when unauthenticated | unit | `npx vitest run tests/test_service_worker_import.ts` | Wave 0 |
| BROWSE-02 | FETCH_ACTIVITIES handler returns denied when permission not granted | unit | `npx vitest run tests/test_service_worker_import.ts` | Wave 0 |
| PIPE-02 | IMPORT_SESSION writes to TRACKMAN_DATA (not only SESSION_HISTORY) | unit | `npx vitest run tests/test_service_worker_import.ts` | Wave 0 |
| PIPE-02 | IMPORT_SESSION calls saveSessionToHistory with the parsed SessionData | unit | `npx vitest run tests/test_service_worker_import.ts` | Wave 0 |
| RESIL-01 | IMPORT_SESSION calls sendResponse before awaiting GraphQL result | unit | `npx vitest run tests/test_service_worker_import.ts` | Wave 0 |
| RESIL-01 | IMPORT_STATUS set to "importing" before sendResponse is called | unit | `npx vitest run tests/test_service_worker_import.ts` | Wave 0 |
| RESIL-02 | IMPORT_STATUS persists to storage on success | unit | `npx vitest run tests/test_service_worker_import.ts` | Wave 0 |
| RESIL-02 | IMPORT_STATUS persists to storage on error | unit | `npx vitest run tests/test_service_worker_import.ts` | Wave 0 |
| RESIL-02 | Empty activity sets IMPORT_STATUS to error with "No shot data" message (D-09) | unit | `npx vitest run tests/test_service_worker_import.ts` | Wave 0 |
| RESIL-02 | Auth failure sets IMPORT_STATUS to error with session-expired message (D-08) | unit | `npx vitest run tests/test_service_worker_import.ts` | Wave 0 |
| D-03 | STORAGE_KEYS.IMPORT_STATUS key is defined in constants.ts | unit | `npx vitest run tests/test_storage_keys.ts` | exists (extend) |

**Manual-only tests (no automation possible):**
- Live Trackman API: FETCH_ACTIVITIES returns real activity list with correct id/date fields
- Live Trackman API: IMPORT_SESSION imports a real session and it appears in history
- Popup close mid-import: Open popup, trigger import, close popup, reopen — status displayed correctly

### Sampling Rate

- **Per task commit:** `npx vitest run tests/test_service_worker_import.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite (329+ tests) green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/test_service_worker_import.ts` — covers BROWSE-02, PIPE-02, RESIL-01, RESIL-02 (all handler unit tests with mocked chrome APIs and fetch)

*(Existing `tests/test_storage_keys.ts` should be extended to verify `IMPORT_STATUS` key exists — minor addition, not a new file.)*

---

## Project Constraints (from CLAUDE.md)

No `CLAUDE.md` found in the working directory. No project-level overrides apply. The project-level conventions documented in `.planning/codebase/CONVENTIONS.md` and the memory file apply:

- Build: `bash scripts/build-extension.sh` (esbuild, no webpack/vite)
- Test: `npx vitest run` (include pattern `tests/test_*.ts`)
- Test file naming: `test_*.ts` (not `*.test.ts`)
- Commit messages: `type: Description`
- `dist/` is tracked in git — must rebuild and commit after source changes
- No default exports
- Named exports for all utility functions and types
- `console.log` with "TrackPull: " prefix in service worker

---

## Sources

### Primary (HIGH confidence)

- `src/background/serviceWorker.ts` — Existing handler patterns, PORTAL_AUTH_CHECK stub as template, fire-and-forget history save as RESIL-01 pattern
- `src/shared/graphql_client.ts` — `executeQuery()`, `classifyAuthResult()`, `AuthStatus` type
- `src/shared/portal_parser.ts` — `parsePortalActivity()`, `GraphQLActivity` interface, exported types for Phase 24 integration
- `src/shared/history.ts` — `saveSessionToHistory()`, dedup/eviction behavior
- `src/shared/constants.ts` — `STORAGE_KEYS` — IMPORT_STATUS key will be added here
- `src/popup/popup.ts` — `PortalState` union, `renderPortalSection()`, portal section rendering pattern, `DOMContentLoaded` storage read pattern
- `.planning/phases/24-service-worker-import-flow/24-CONTEXT.md` — All locked decisions (D-01 through D-09)

### Secondary (MEDIUM confidence)

- `.planning/STATE.md` — Confirmed: `node(id)` query works for base64 activity IDs; credentials:include validated in Phase 22
- `.planning/phases/22-graphql-client-cookie-auth/22-CONTEXT.md` — PortalState string union pattern, inline error messaging convention
- `.planning/phases/23-graphql-to-sessiondata-parser/23-CONTEXT.md` — Field coverage decisions, portal wins on dedup

### Tertiary (LOW confidence)

- GraphQL activity list query shape (`activities(first: N)`) — assumed Relay connection convention; must be validated against live API in Wave 1

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all dependencies are existing, tested project modules
- Architecture: HIGH — all patterns are drawn directly from existing serviceWorker.ts code
- Pitfalls: HIGH for MV3 patterns (well-documented); MEDIUM for GraphQL schema shape (unverified field names)
- GraphQL query shape for activity list: LOW — must be verified against live API

**Research date:** 2026-03-26
**Valid until:** 2026-04-25 (stable MV3 APIs; Trackman schema could change without notice)
