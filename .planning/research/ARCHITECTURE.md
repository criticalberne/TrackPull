# Architecture Research

**Domain:** Chrome Extension — TrackPull v1.6 Trackman Portal GraphQL Integration
**Researched:** 2026-03-26
**Confidence:** HIGH (based on direct source code inspection of all existing files; Chrome MV3 service worker behavior verified against official Chrome developer documentation and confirmed community articles)

---

## Scope

This document supersedes all prior ARCHITECTURE.md versions and covers the v1.6 Trackman Portal Integration milestone only. The v1.5 baseline architecture is stable. This file answers: **where GraphQL requests live, how cookie auth works in MV3, what new files are required, what existing files are modified, how GraphQL responses map into SessionData, and what order to build the integration.**

---

## Current Architecture Baseline (v1.5)

```
┌────────────────────────────────────────────────────────────────────────┐
│                web-dynamic-reports.trackmangolf.com page                │
│  ┌───────────────────────────────────────┐                              │
│  │  interceptor.ts (MAIN world)          │  monkey-patches fetch/XHR   │
│  │  → parses StrokeGroups JSON           │  → builds SessionData        │
│  └───────────────────────┬───────────────┘                              │
│                           │ window.postMessage                           │
│  ┌───────────────────────▼───────────────┐                              │
│  │  bridge.ts (ISOLATED world)           │  relays to service worker    │
│  └───────────────────────┬───────────────┘                              │
└───────────────────────────┼────────────────────────────────────────────┘
                            │ chrome.runtime.sendMessage (SAVE_DATA)
┌───────────────────────────▼────────────────────────────────────────────┐
│  serviceWorker.ts                                                        │
│  Handlers: SAVE_DATA, GET_DATA, EXPORT_CSV_REQUEST                      │
│  Emits: DATA_UPDATED → popup                                             │
│  APIs: chrome.storage.local, chrome.downloads                           │
└───────────────────────────┬────────────────────────────────────────────┘
                            │ chrome.storage.local + chrome.runtime.onMessage
┌───────────────────────────▼────────────────┐  ┌─────────────────────────┐
│  popup.ts / popup.html                      │  │  options.ts             │
│  - stat card (avg carry/speed by club)      │  │  - custom prompt CRUD   │
│  - export CSV, copy TSV, open in AI         │  │  - default AI service   │
│  - prompt selector, preview, surface picker │  └─────────────────────────┘
└─────────────────────────────────────────────┘

Shared modules (pure, no Chrome APIs):
  shared/constants.ts           STORAGE_KEYS, metrics, CSS selectors
  shared/csv_writer.ts          SessionData → CSV string
  shared/tsv_writer.ts          SessionData → TSV string
  shared/unit_normalization.ts  conversion math, UnitChoice types
  shared/prompt_builder.ts      assembles prompt + data payload
  shared/prompt_types.ts        BuiltInPrompt, CustomPrompt, BUILTIN_PROMPTS
  shared/custom_prompts.ts      loadCustomPrompts / saveCustomPrompt / deleteCustomPrompt
  shared/html_table_parser.ts   DOM table extraction
  models/types.ts               SessionData, ClubGroup, Shot, HistoryEntry

Host permissions (v1.5): https://web-dynamic-reports.trackmangolf.com/*
Content scripts run on: web-dynamic-reports.trackmangolf.com only
```

**Storage layout (v1.5):**

| Key | Store | Type | Set by |
|-----|-------|------|--------|
| `trackmanData` | local | SessionData | serviceWorker |
| `speedUnit` | local | `"mph" \| "m/s"` | popup |
| `distanceUnit` | local | `"yards" \| "meters"` | popup |
| `hittingSurface` | local | `"Grass" \| "Mat"` | popup |
| `selectedPromptId` | local | string | popup |
| `includeAverages` | local | boolean | popup |
| `aiService` | sync | string | popup + options |
| `customPrompt_{id}` | sync | CustomPrompt | options |
| `customPromptIds` | sync | string[] | options |

---

## Critical Constraint: Where GraphQL Requests Must Live

**Decision: GraphQL requests go through the service worker, NOT a content script on portal.trackmangolf.com.**

This is the most architecturally important decision for this milestone. The rationale:

### Why Service Worker (not content script)

1. **Cookie auth works correctly.** When `host_permissions` includes `https://api.trackmangolf.com/*`, the service worker can call `fetch('https://api.trackmangolf.com/graphql', { credentials: 'include' })` and the browser automatically attaches the user's Trackman session cookies. This is confirmed behavior — Chrome documentation and community sources both confirm: *"When you send an API request from a background script to a URL specified in host_permission, the cookies stored for that domain are also sent with the request."* (MEDIUM confidence — confirmed against official Chrome developer concepts and a community verification article.)

2. **No content script needed on portal.trackmangolf.com.** A content script running on `portal.trackmangolf.com` could also make the fetch with `credentials: 'include'`, but it would require declaring a new content script entry in the manifest, adding complexity for no benefit. The service worker is already the hub for all data I/O and storage.

3. **Popup already communicates with the service worker.** The activity browser lives in the popup. Popup → service worker → api.trackmangolf.com is the natural message path: popup sends `FETCH_ACTIVITIES` or `IMPORT_SESSION` message, service worker makes the GraphQL call, returns result.

4. **Service workers have fetch available.** MV3 service workers do not have `XMLHttpRequest`, but `fetch()` is available. GraphQL requests over `fetch` are straightforward POST requests — no client library needed.

5. **Lifetime is sufficient for GraphQL calls.** As of Chrome 110+, extension service workers stay alive as long as events are being processed. A GraphQL fetch that completes in under 5 minutes (easily met) keeps the worker alive for its duration. No keep-alive hack is needed. (HIGH confidence — Chrome developer documentation confirmed this change.)

### Why Not a Content Script on portal.trackmangolf.com

- Would require adding `portal.trackmangolf.com` to both `content_scripts.matches` and `host_permissions` with an active content script, adding unnecessary attack surface.
- Content scripts cannot access `chrome.storage` in MAIN world; an ISOLATED world bridge would be needed, replicating the existing interceptor+bridge pattern for a different purpose.
- The popup already has a direct channel to the service worker. Adding a content script as an intermediary adds a hop with no benefit.

---

## v1.6 System Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│           web-dynamic-reports.trackmangolf.com page                     │
│  interceptor.ts → bridge.ts                    (unchanged)              │
└──────────────────────────┬─────────────────────────────────────────────┘
                           │ SAVE_DATA (unchanged)
┌──────────────────────────▼─────────────────────────────────────────────┐
│  serviceWorker.ts                                                        │
│  EXISTING: SAVE_DATA, GET_DATA, EXPORT_CSV_REQUEST                      │
│  NEW: FETCH_ACTIVITIES  → GraphQL me.activities query                   │
│  NEW: IMPORT_SESSION    → GraphQL node(id) query + parse → SAVE_DATA    │
└──────────────────────────┬──────────────────────────────────────────────┘
        │ fetch POST with credentials:include                              │
        ▼                                                                  │
  api.trackmangolf.com/graphql                          (external)         │
        │ GraphQL response                                                  │
        ▼                                                                   │
  portal_parser.ts (pure)                                                   │
  → maps Measurement fields → SessionData                                  │
        │                                                                   │
        └──────────────────────────────────────────────────────────────────┘
                           │ SAVE_DATA (existing path)
                           ▼
                   chrome.storage.local
                           │
┌──────────────────────────▼─────────────────────────────────────────────┐
│  popup.ts / popup.html                                                   │
│  EXISTING: stat card, export CSV, copy TSV, AI launch, prompt selector  │
│  NEW: "Import from Portal" button                                        │
│  NEW: Activity list view (date, club count, shot count per session)      │
│  NEW: Per-activity import button → sends IMPORT_SESSION to SW           │
└─────────────────────────────────────────────────────────────────────────┘

New shared modules:
  shared/portal_parser.ts    — maps GraphQL Measurement → Shot metrics (pure)
  shared/graphql_client.ts   — minimal fetch wrapper for POST to /graphql (pure)
  shared/portal_types.ts     — TypeScript interfaces for GraphQL response shapes
```

**Manifest changes required:**

```json
"host_permissions": [
  "https://web-dynamic-reports.trackmangolf.com/*",
  "https://api.trackmangolf.com/*"
]
```

No new content script entries are needed. `portal.trackmangolf.com` does NOT need to be in `host_permissions` unless a content script is added there — which it is not.

---

## Component Responsibilities

| Component | Responsibility | Modified / New |
|-----------|---------------|----------------|
| `serviceWorker.ts` | Add `FETCH_ACTIVITIES` and `IMPORT_SESSION` message handlers; calls `graphql_client.ts`; pipes parsed SessionData through existing SAVE_DATA path | Modified |
| `shared/graphql_client.ts` | Minimal `fetch` POST wrapper: accepts endpoint, query string, variables; returns parsed JSON; no Chrome API dependency | New |
| `shared/portal_types.ts` | TypeScript interfaces for GraphQL activity list shape and single-session node shape | New |
| `shared/portal_parser.ts` | Pure function mapping GraphQL `Measurement` fields into the existing `Shot.metrics` record format; mirrors interceptor.ts parsing logic | New |
| `popup.ts` | Add "Import from Portal" UI section; renders activity list; sends `FETCH_ACTIVITIES` / `IMPORT_SESSION` messages; handles loading/error states | Modified |
| `popup.html` | Add activity browser section (initially hidden, revealed when user clicks "Import from Portal") | Modified |
| `models/types.ts` | No changes needed — SessionData, Shot, ClubGroup already handle portal-imported sessions | Unchanged |
| `shared/constants.ts` | Add new STORAGE_KEYS entries if activity cache is persisted; add portal API endpoint constant | Modified |
| `interceptor.ts` | Unchanged | Unchanged |
| `bridge.ts` | Unchanged | Unchanged |
| `csv_writer.ts` | Unchanged — `url_type: "activity"` is already in SessionData | Unchanged |

---

## Data Flow

### Activity List Flow

```
User clicks "Import from Portal" in popup
    ↓
popup.ts sends { type: "FETCH_ACTIVITIES" }
    via chrome.runtime.sendMessage
    ↓
serviceWorker.ts receives FETCH_ACTIVITIES
    ↓
graphql_client.ts: POST https://api.trackmangolf.com/graphql
  body: { query: "{ me { activities { id date strokeCount type } } }" }
  credentials: "include"
    ↓
api.trackmangolf.com returns activity list JSON
    ↓
serviceWorker.ts sendResponse({ activities: [...] })
    ↓
popup.ts receives list, renders activity rows
  each row: date, shot count, session type, [Import] button
```

### Session Import Flow

```
User clicks [Import] on an activity row
    ↓
popup.ts sends { type: "IMPORT_SESSION", activityId: "..." }
    via chrome.runtime.sendMessage
    ↓
serviceWorker.ts receives IMPORT_SESSION
    ↓
graphql_client.ts: POST https://api.trackmangolf.com/graphql
  body: { query: "{ node(id: $id) { ... on Activity { strokeGroups { ... } } } }",
          variables: { id: activityId } }
  credentials: "include"
    ↓
api.trackmangolf.com returns full session with Measurement fields
    ↓
portal_parser.ts.parsePortalSession(graphqlResponse)
  → iterates strokeGroups → strokes → Measurement
  → maps known fields to Shot.metrics (same METRIC_KEYS as interceptor.ts)
  → builds SessionData with url_type: "activity"
    ↓
serviceWorker.ts: pipes SessionData through existing SAVE_DATA handler
  (saves to chrome.storage.local, fires DATA_UPDATED, appends to history)
    ↓
popup.ts receives DATA_UPDATED, re-renders stat card
  → user can now export CSV, copy TSV, launch AI — unchanged pipeline
```

### Error Handling Flow

```
FETCH_ACTIVITIES or IMPORT_SESSION fails (network, auth, parse)
    ↓
serviceWorker.ts sendResponse({ success: false, error: "..." })
    ↓
popup.ts shows inline error message in activity browser section
  (same pattern as existing EXPORT_CSV_REQUEST error handling)
```

---

## New File Specifications

### `src/shared/graphql_client.ts`

Pure function — no Chrome APIs. Accepts the full GraphQL endpoint URL, query string, optional variables, and returns the parsed `data` object or throws on network/HTTP error.

```typescript
export async function graphqlFetch<T>(
  url: string,
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!response.ok) {
    throw new Error(`GraphQL HTTP ${response.status}`);
  }
  const json = await response.json();
  if (json.errors?.length) {
    throw new Error(json.errors[0].message);
  }
  return json.data as T;
}
```

No external dependencies. No client library. The zero-dependency constraint is maintained.

### `src/shared/portal_types.ts`

TypeScript interfaces mirroring the expected GraphQL response shapes. These are defined once and used by both serviceWorker.ts and portal_parser.ts to avoid `unknown` casting throughout.

```typescript
export interface PortalActivity {
  id: string;
  date: string;
  strokeCount: number;
  type: string;  // "Range", "OnCourse", etc.
}

export interface PortalMeasurement {
  ClubSpeed?: number;
  BallSpeed?: number;
  // ... same field names as METRIC_KEYS in interceptor.ts
}

export interface PortalStroke {
  measurement: PortalMeasurement;
}

export interface PortalStrokeGroup {
  club: string;
  strokes: PortalStroke[];
}

export interface PortalSession {
  id: string;
  date: string;
  strokeGroups: PortalStrokeGroup[];
}
```

Field names should be verified against live API introspection during implementation.

### `src/shared/portal_parser.ts`

Pure function. Mirrors `parseSessionData` in interceptor.ts but operates on GraphQL response shape instead of StrokeGroups JSON. Reuses the same `METRIC_KEYS` set (imported from constants.ts or interceptor.ts).

```typescript
export function parsePortalSession(
  session: PortalSession,
  activityId: string
): SessionData | null
```

The output SessionData sets `url_type: "activity"` and `report_id: activityId`. The `metadata_params` field is populated with `{ source: "portal" }` to distinguish portal-imported sessions from report-intercepted ones in downstream export/display code.

---

## Manifest Changes

```json
{
  "host_permissions": [
    "https://web-dynamic-reports.trackmangolf.com/*",
    "https://api.trackmangolf.com/*"
  ]
}
```

No new `content_scripts` entries are required. No `portal.trackmangolf.com` host permission is needed. The only new network origin is `api.trackmangolf.com`.

---

## Popup UI Architecture

The activity browser is a new collapsible section in popup.html. It is revealed when the user clicks a "Import from Portal" button and hidden by default to preserve the existing popup layout.

```
┌──────────────────────────────────────────┐
│  [TrackPull header]                       │
│  [Stat card — existing]                   │
│  [Export CSV / Copy TSV / AI — existing]  │
│  ─────────────────────────────────────── │
│  [Import from Portal ▼]                   │
│  ┌────────────────────────────────────┐  │
│  │ Loading... / Error / Activity list  │  │
│  │  2026-03-20  Range  47 shots [Use]  │  │
│  │  2026-03-15  Range  38 shots [Use]  │  │
│  │  ...                                │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

**State machine for the activity browser:**

| State | Trigger | Display |
|-------|---------|---------|
| `idle` | Initial | "Import from Portal" button only |
| `loading` | Button clicked | Spinner / "Fetching activities..." |
| `loaded` | FETCH_ACTIVITIES response | Activity list with [Use] buttons |
| `importing` | [Use] clicked | Row shows "Importing..." |
| `error` | Any failure | Inline error with retry option |

This is implemented with a simple `data-state` attribute on the container div and CSS class toggling — no JavaScript state management library.

---

## Patterns to Follow

### Pattern 1: New Message Handler in Service Worker

**What:** Add new message type constants alongside existing ones. Keep each handler independent — no shared mutable state between handlers. Mirror the existing `return true` async pattern.

**When to use:** Every new popup → service worker interaction.

```typescript
interface FetchActivitiesRequest { type: "FETCH_ACTIVITIES"; }
interface ImportSessionRequest   { type: "IMPORT_SESSION"; activityId: string; }

// In the onMessage listener — add alongside existing handlers:
if (message.type === "FETCH_ACTIVITIES") {
  graphqlFetch<{ me: { activities: PortalActivity[] } }>(
    PORTAL_GRAPHQL_URL,
    ME_ACTIVITIES_QUERY
  ).then(data => sendResponse({ success: true, activities: data.me.activities }))
   .catch(err => sendResponse({ success: false, error: err.message }));
  return true;
}
```

### Pattern 2: Pure Parser for New Data Source

**What:** Every data source gets its own parser function in `shared/`. The parser accepts raw API data and returns `SessionData | null`. No Chrome APIs inside the parser.

**When to use:** Any new external API whose data must enter the SessionData pipeline.

**Trade-offs:** Slight duplication with interceptor.ts parsing logic (both process Measurement fields), but isolation means either can change without affecting the other. A shared `parseMeasurementFields(measurement)` helper in constants.ts or a new shared file can eliminate duplication if field mappings diverge.

### Pattern 3: Reuse SAVE_DATA for All Import Paths

**What:** Portal-imported sessions flow through the existing `SAVE_DATA` message handler after parsing. This gives them history tracking, DATA_UPDATED broadcast, and storage management for free.

**When to use:** Any new session source — portal import today, potential future sources.

**Trade-offs:** None. This is the correct pattern. Do not write to `chrome.storage.local` directly from new handlers; route through SAVE_DATA.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Content Script on portal.trackmangolf.com

**What people do:** Add a content script to portal.trackmangolf.com to intercept portal page network calls or access the DOM to discover session IDs.

**Why it's wrong:** Adds manifest complexity (new content_scripts entry, new host permission), creates a second interceptor+bridge pattern for a different purpose, and is fragile against SPA navigation changes on the portal. The service worker can make direct authenticated GraphQL calls without any portal page involvement.

**Do this instead:** Add `api.trackmangolf.com` to `host_permissions` only. Make GraphQL calls directly from the service worker.

### Anti-Pattern 2: GraphQL Client Library

**What people do:** Install `graphql-request`, `urql`, or Apollo Client to handle GraphQL requests.

**Why it's wrong:** The project has zero production dependencies by design. All three GraphQL client libraries add dependencies. GraphQL over fetch is a single POST — no library needed.

**Do this instead:** `src/shared/graphql_client.ts` — a plain `fetch` POST wrapper is 15 lines and covers 100% of the use case.

### Anti-Pattern 3: Storing Activity List in chrome.storage

**What people do:** Cache the fetched activity list in `chrome.storage.local` to avoid refetching.

**Why it's wrong:** Activity list changes as the user shoots more sessions. Stale cache creates confusion. The activity browser is opened intentionally — a fresh fetch on each open is the correct UX behavior. Storage quota is also a concern if activity lists grow large.

**Do this instead:** Fetch fresh on each "Import from Portal" button click. Only persist fully imported sessions (which already happens through the existing SAVE_DATA → sessionHistory path).

### Anti-Pattern 4: New Data Path that Bypasses SAVE_DATA

**What people do:** Write imported portal sessions directly to `chrome.storage.local.trackmanData` from a new handler, skipping SAVE_DATA.

**Why it's wrong:** SAVE_DATA also fires `saveSessionToHistory`, broadcasts `DATA_UPDATED` to the popup, and logs errors. Bypassing it means portal sessions don't appear in history and the popup doesn't update.

**Do this instead:** After parsing a portal session to `SessionData`, call the existing SAVE_DATA logic (or extract it into a shared `persistSession(data)` helper that both the bridge path and the portal path call).

---

## Build Order

Dependencies determine the order. Each step's output is a prerequisite for the next.

### Step 1: Manifest + Host Permissions (no code changes)

Add `https://api.trackmangolf.com/*` to `host_permissions`. This unblocks all authenticated fetch calls from the service worker. Verify with a manual test: open extension on a report page, open DevTools for the service worker, confirm a `fetch('https://api.trackmangolf.com/graphql', { credentials: 'include' })` call returns 200 (not 403 or CORS error).

**Prerequisite for:** everything else.

### Step 2: portal_types.ts + graphql_client.ts (new shared files)

Both are pure modules with no dependencies. Write them together since `graphql_client.ts` uses the type parameter `<T>` that will be filled with types from `portal_types.ts`.

The actual GraphQL field names in `portal_types.ts` must be validated against the live API during this step. Use the DevTools Network tab on `portal.trackmangolf.com` to capture a real me.activities or node(id) response and match field names exactly.

**Prerequisite for:** Step 3.

### Step 3: portal_parser.ts (new shared file)

Depends on `portal_types.ts` for input types and `models/types.ts` for output type. Pure function — fully unit-testable.

Write test coverage (`tests/test_portal_parser.ts`) using captured real GraphQL response fixtures before implementing. This is the highest-risk step because Trackman's GraphQL field naming may differ from the REST/StrokeGroups naming in interceptor.ts.

**Prerequisite for:** Step 4.

### Step 4: serviceWorker.ts — new message handlers

Add `FETCH_ACTIVITIES` and `IMPORT_SESSION` handlers. These depend on `graphql_client.ts` and `portal_parser.ts`. The `IMPORT_SESSION` handler calls the existing `saveSessionToHistory` path through SAVE_DATA logic.

**Prerequisite for:** Step 5.

### Step 5: popup.ts + popup.html — activity browser UI

The activity browser is the last step because all the data logic is complete by Step 4. The popup only needs to send messages and render responses. Style with existing CSS custom property tokens — no new color variables needed.

**No prerequisites except Step 4 being testable.**

---

## Integration Points

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| popup.ts → serviceWorker.ts | `chrome.runtime.sendMessage` | Existing pattern; add FETCH_ACTIVITIES, IMPORT_SESSION message types |
| serviceWorker.ts → api.trackmangolf.com | `fetch` POST with `credentials: "include"` | New; requires host_permissions addition |
| serviceWorker.ts → portal_parser.ts | Direct function call | Pure module import; no message passing |
| portal_parser.ts → models/types.ts | Type import | SessionData interface is the shared contract |
| IMPORT_SESSION handler → SAVE_DATA logic | Internal function call | Route through existing persist+history+broadcast path |

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| `api.trackmangolf.com/graphql` | HTTP POST, `credentials: "include"`, no API key | Cookie auth; user must be logged into Trackman portal in Chrome |

---

## Sources

- [Chrome Extensions: Cross-origin network requests](https://developer.chrome.com/docs/extensions/develop/concepts/network-requests) — host_permissions enable service worker cross-origin fetch
- [Longer extension service worker lifetimes (Chrome 110+)](https://developer.chrome.com/blog/longer-esw-lifetimes) — confirms no hard 5-minute lifetime for event-driven workers
- [Cookie-based auth for Chrome MV3 extensions](https://boryssey.medium.com/cookie-based-authentication-for-your-browser-extension-and-web-app-mv3-4837d7603f54) — confirms credentials:include + host_permissions sends domain cookies automatically
- [Chrome extension service worker concepts](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers) — MV3 service worker fetch vs XMLHttpRequest availability

---

*Architecture research for: TrackPull v1.6 Trackman Portal GraphQL Integration*
*Researched: 2026-03-26*
