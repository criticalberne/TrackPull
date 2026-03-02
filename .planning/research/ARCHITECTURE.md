# Architecture Research

**Domain:** Chrome Extension — golf data scraping and export (TrackPull)
**Researched:** 2026-03-02
**Confidence:** HIGH (based on direct source code inspection + MV3 official documentation)

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    trackmangolf.com page                             │
│                                                                       │
│  ┌───────────────────────────────────────┐                           │
│  │   MAIN world (interceptor.ts)         │                           │
│  │   - monkey-patches fetch + XHR        │                           │
│  │   - parses StrokeGroups JSON          │                           │
│  │   - scrapes .group-tag DOM elements   │                           │
│  │   - postMessage → window              │                           │
│  └─────────────────┬─────────────────────┘                          │
│                    │ window.postMessage                               │
│  ┌─────────────────▼─────────────────────┐                          │
│  │   ISOLATED world (bridge.ts)          │                           │
│  │   - filters TRACKMAN_SHOT_DATA msgs   │                           │
│  │   - chrome.runtime.sendMessage →      │                           │
│  └─────────────────┬─────────────────────┘                          │
└────────────────────┼────────────────────────────────────────────────┘
                     │ chrome.runtime.sendMessage (SAVE_DATA)
┌────────────────────▼────────────────────────────────────────────────┐
│                SERVICE WORKER (serviceWorker.ts)                      │
│                                                                       │
│   Handles: SAVE_DATA, GET_DATA, EXPORT_CSV_REQUEST                   │
│   Reads: chrome.storage.local → SessionData                          │
│   Triggers: chrome.downloads.download (data URI)                     │
│   Emits: DATA_UPDATED → popup (if open)                              │
└──────────┬───────────────────────────────────────────────────────────┘
           │ chrome.storage.local                  │ chrome.runtime.onMessage
┌──────────▼───────────┐              ┌────────────▼───────────────────┐
│  chrome.storage.local │              │   POPUP (popup.ts)             │
│                       │              │                                 │
│  trackmanData: {}     │◄─────────── │   - shot count display          │
│  speedUnit: string    │             │   - export button               │
│  distanceUnit: string │             │   - clear button                │
│                       │             │   - unit preference dropdowns   │
└───────────────────────┘             └─────────────────────────────────┘

Shared modules (no Chrome API dependencies):
  src/shared/constants.ts          — METRIC_DISPLAY_NAMES, STORAGE_KEYS, CSS selectors
  src/shared/csv_writer.ts         — SessionData → CSV string (single conversion point)
  src/shared/unit_normalization.ts — convertSpeed/Distance/Angle, UnitChoice types
  src/shared/html_table_parser.ts  — DOM table extraction utility
  src/models/types.ts              — SessionData, ClubGroup, Shot, CaptureInfo, mergeSessionData
```

### Component Responsibilities

| Component | Responsibility | Communicates With |
|-----------|----------------|-------------------|
| interceptor.ts (MAIN) | Monkey-patch fetch/XHR, parse StrokeGroups JSON, scrape .group-tag DOM, build SessionData | bridge.ts via window.postMessage |
| bridge.ts (ISOLATED) | Filter postMessage events, relay SessionData to service worker | serviceWorker.ts via chrome.runtime.sendMessage |
| serviceWorker.ts | Persist SessionData, handle export (CSV via data URI), respond to popup | chrome.storage.local, chrome.downloads, popup via onMessage |
| popup.ts | Display shot count, trigger export/clear, persist unit preferences | serviceWorker.ts via chrome.runtime.sendMessage, chrome.storage.local directly |
| csv_writer.ts | Single source-of-truth for SessionData → CSV string with unit conversion | unit_normalization.ts |
| unit_normalization.ts | Type definitions + conversion math for speed/distance/angle | csv_writer.ts, serviceWorker.ts |
| types.ts | SessionData/Shot/ClubGroup interfaces + mergeSessionData() | All components |
| constants.ts | STORAGE_KEYS, ALL_METRICS, METRIC_DISPLAY_NAMES, CSS selectors | All components |

## Recommended Project Structure

Current structure is sound and should be preserved:

```
src/
├── background/
│   └── serviceWorker.ts       — single background entry point; all Chrome API dispatch here
├── content/
│   ├── interceptor.ts         — MAIN world; zero Chrome API calls
│   ├── bridge.ts              — ISOLATED world; only chrome.runtime.sendMessage
│   └── html_scraping.ts       — DOM fallback scraper (not injected via manifest yet)
├── popup/
│   ├── popup.ts               — UI logic
│   └── popup.html             — markup + styles reference
├── shared/
│   ├── constants.ts           — shared config, no Chrome APIs
│   ├── csv_writer.ts          — pure function: SessionData + UnitChoice → string
│   ├── html_table_parser.ts   — pure DOM parsing utility
│   └── unit_normalization.ts  — pure math + types
└── models/
    └── types.ts               — interfaces + mergeSessionData()
```

### Structure Rationale

- **shared/:** Pure TypeScript with zero Chrome API surface — freely testable with vitest without mocking
- **models/:** Data shapes and transformation logic isolated from I/O
- **content/:** Each world (MAIN, ISOLATED) gets its own file — cannot be mixed
- **background/:** Single service worker; all chrome.storage and chrome.downloads calls live here
- **popup/:** UI layer; reads storage directly for preferences but delegates all data operations to service worker

## Architectural Patterns

### Pattern 1: World Separation (existing — must be preserved)

**What:** MAIN world for page API access, ISOLATED world as relay, service worker for Chrome APIs. This is the only way to both intercept fetch/XHR and use chrome.runtime.sendMessage.

**When to use:** Every feature that needs to interact with page data. Never collapse these worlds.

**Trade-offs:** Extra message-passing indirection, but mandatory in MV3.

**Example:**
```typescript
// interceptor.ts (MAIN) — never use chrome.* here
window.postMessage({ type: "TRACKMAN_SHOT_DATA", source: "trackpull-interceptor", data: session }, "*");

// bridge.ts (ISOLATED) — never touch window.fetch here
window.addEventListener("message", (event) => {
  if (event.data?.source !== "trackpull-interceptor") return;
  chrome.runtime.sendMessage({ type: "SAVE_DATA", data: event.data.data });
});
```

### Pattern 2: Service Worker as Single Dispatch Point

**What:** All Chrome API calls (storage, downloads, tabs) go through the service worker. Popup and content scripts send typed messages; the service worker routes them.

**When to use:** Any new feature requiring chrome.storage writes, chrome.downloads, or cross-tab state. Do not call chrome.storage from content scripts.

**Trade-offs:** One file concentrates side effects — easy to audit, but grows as features add. Keep handler logic thin; delegate computation to shared modules.

**Example:**
```typescript
// Add a new message type to serviceWorker.ts
if (message.type === "EXPORT_JSON_REQUEST") {
  chrome.storage.local.get([STORAGE_KEYS.TRACKMAN_DATA], (result) => {
    const json = JSON.stringify(result[STORAGE_KEYS.TRACKMAN_DATA], null, 2);
    chrome.downloads.download({
      url: `data:application/json;charset=utf-8,${encodeURIComponent(json)}`,
      filename: `ShotData_${data.date}.json`,
    });
    sendResponse({ success: true });
  });
  return true; // keeps channel open for async
}
```

### Pattern 3: Shared Modules as Pure Functions

**What:** csv_writer.ts, unit_normalization.ts, and html_table_parser.ts contain zero Chrome APIs and are testable in vitest without any mocking. New computation logic belongs here.

**When to use:** Any stateless transformation — format conversion, filtering, calculation, rendering to string. If it doesn't need chrome.*, put it in shared/.

**Trade-offs:** Deliberate; keeps the Chrome API surface auditable and keeps test coverage feasible.

### Pattern 4: chrome.storage.local for All Persistence

**What:** Single session data blob stored at `trackmanData`. Unit preferences stored as separate keys (`speedUnit`, `distanceUnit`).

**When to use:** Current sessions, user preferences, anything needed across popup opens and service worker restarts.

**Trade-offs:** 10 MB quota (per Chrome docs). For session history (multiple past sessions), 10 MB fills quickly with large sessions — each session can be 50-200 KB. History beyond ~50 sessions may need IndexedDB or pruning strategy.

## Data Flow

### Primary Capture Flow (existing)

```
Trackman page loads API data
        ↓
interceptor.ts intercepts fetch/XHR response
        ↓
containsStrokegroups() detection → parseSessionData()
        ↓
waitForTagsThenPost() polls for .group-tag DOM elements (up to 8s)
        ↓
window.postMessage({ type: "TRACKMAN_SHOT_DATA", data: SessionData })
        ↓
bridge.ts receives message → chrome.runtime.sendMessage({ type: "SAVE_DATA" })
        ↓
serviceWorker.ts → chrome.storage.local.set({ trackmanData: SessionData })
        ↓
chrome.storage.onChanged emits → chrome.runtime.sendMessage({ type: "DATA_UPDATED" })
        ↓
popup.ts (if open) receives DATA_UPDATED → updateShotCount()
```

### Export Flow (existing)

```
User clicks Export in popup
        ↓
popup.ts → chrome.runtime.sendMessage({ type: "EXPORT_CSV_REQUEST" })
        ↓
serviceWorker.ts → chrome.storage.local.get([trackmanData, speedUnit, distanceUnit])
        ↓
writeCsv(session, true, undefined, unitChoice) — in shared/csv_writer.ts
        ↓
csv_writer applies normalizeMetricValue() with getApiSourceUnitSystem()
        ↓
chrome.downloads.download({ url: "data:text/csv;...base64..." })
        ↓
sendResponse({ success: true, filename })
```

### How New Features Integrate

**Multi-format export (JSON, XLSX-like):**
- Add new message type `EXPORT_JSON_REQUEST` in serviceWorker.ts
- Add format converter in shared/ (e.g., `json_writer.ts`) — pure function
- Add format selector UI in popup.ts + popup.html
- No content script changes needed
- Build: one new shared module + serviceWorker handler addition

**Session history:**
- Add `sessionHistory: SessionData[]` to storage (or switch to IndexedDB for >10 sessions)
- serviceWorker.ts: on `SAVE_DATA`, append to history array, prune to N entries
- New message type `GET_HISTORY` → popup fetches list
- Popup gains history panel (tab or accordion in existing popup, or side panel for richer UI)
- No interceptor/bridge changes needed

**Data visualization:**
- Popup constraint: max 800x600px; canvas/SVG renders fine within that
- Use native `<canvas>` or inline SVG — no third-party library needed at this scale
- Data comes from `GET_DATA` → popup renders chart from SessionData.club_groups
- Chart type candidates: scatter (shot dispersion), bar (club averages), line (shot sequence)
- No Chrome API changes — pure UI addition to popup.ts + popup.html

**Side panel for richer UI (future):**
- chrome.sidePanel API (MV3, Chrome 114+) enables persistent UI alongside browsing
- Add `"sidePanel"` permission + `"side_panel": { "default_path": "panel.html" }` to manifest
- Side panel page behaves like popup page but persists across navigation
- Useful if session history or visualization outgrows 800x600 popup

## Integration Points

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| MAIN ↔ ISOLATED | window.postMessage (string-filtered) | Source field `"trackpull-interceptor"` is the guard; malicious page postMessages are rejected in bridge |
| ISOLATED ↔ Service Worker | chrome.runtime.sendMessage / sendResponse | Async; bridge must handle chrome.runtime.lastError |
| Service Worker ↔ Popup | chrome.runtime.sendMessage + chrome.storage.onChanged | Popup may not be open when DATA_UPDATED fires — catch() on sendMessage is correct |
| Popup ↔ Storage | chrome.storage.local.get (preferences) | Popup reads unit prefs directly rather than via service worker — acceptable for read-only preference access |

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Trackman API (trackmangolf.com) | Passive interception — no requests initiated by extension | Zero auth complexity; extension observes, never calls |
| chrome.downloads | Data URI pattern: `data:text/csv;charset=utf-8,...` | No Blob URL needed; data URI approach works in service worker context. Offscreen document only needed for Blob URL pattern. |
| chrome.storage.local | JSON blob storage | 10 MB limit per Chrome API docs. `"unlimitedStorage"` permission bypasses this. For session history with many sessions, consider unlimitedStorage or IndexedDB. |

## Build Order for New Features

Dependencies determine what must be built first:

```
1. models/types.ts changes      (data shape changes affect everything downstream)
        ↓
2. shared/ module additions     (pure logic — testable without build)
        ↓
3. serviceWorker.ts handlers    (wires new message types to storage/downloads)
        ↓
4. popup.ts + popup.html        (UI that triggers new service worker messages)
```

Content script changes (interceptor.ts, bridge.ts) are only needed if the capture or relay logic itself changes (e.g., capturing different API endpoints or adding new postMessage types). New export formats, history, and visualization require zero content script changes.

## Scaling Considerations

This is a single-user browser extension, not a server-side application. "Scaling" means graceful behavior with large datasets and many sessions.

| Concern | Current State | With Session History |
|---------|---------------|---------------------|
| Storage size | Single session ~50-200 KB | 50 sessions ~2.5-10 MB; approaches chrome.storage.local 10 MB limit |
| Popup render time | Instant (count + buttons) | History list: fine up to ~100 entries with simple DOM; charts: fine with canvas |
| Service worker wake time | Negligible (small get) | Negligible — storage reads are async and fast |
| Data loss on SW termination | Not an issue — data in storage | Not an issue — history also in storage |

**First bottleneck:** chrome.storage.local 10 MB limit if session history is implemented. Solution: add `"unlimitedStorage"` permission (no approval risk — it's common) or limit history to last N sessions with pruning.

**Second bottleneck:** Popup size for visualization (800x600 max). Solution: use chrome.sidePanel for feature-rich data views; keep the popup lean.

## Anti-Patterns

### Anti-Pattern 1: Chrome API Calls in MAIN World Content Script

**What people do:** Call `chrome.storage.local.set()` directly from interceptor.ts to skip the bridge.
**Why it's wrong:** Chrome extension APIs are unavailable in MAIN world — they throw at runtime. The two-world architecture is mandatory.
**Do this instead:** Keep interceptor.ts free of `chrome.*` calls. All Chrome APIs flow through bridge.ts → serviceWorker.ts.

### Anti-Pattern 2: Storing Derived or Converted Data

**What people do:** Store converted (mph, yards) values in chrome.storage instead of raw API values.
**Why it's wrong:** Unit preference can change after capture. Storing raw values allows re-conversion on export without re-scraping. The existing codebase correctly stores raw API values (m/s, meters) and converts on export.
**Do this instead:** Store raw metric values. Apply unit conversion only in csv_writer.ts or equivalent export module at time of export.

### Anti-Pattern 3: Logic in the Bridge

**What people do:** Add data transformation, filtering, or merging logic to bridge.ts.
**Why it's wrong:** Bridge is a thin relay. Any logic there cannot use Chrome APIs (wrong world) and cannot be tested easily. It's also re-executed for every page message.
**Do this instead:** Bridge relays raw SessionData. All transformation goes in interceptor.ts (before postMessage) or serviceWorker.ts / shared/ (after receipt).

### Anti-Pattern 4: Synchronous Storage Calls

**What people do:** Use `localStorage` from the service worker for convenience.
**Why it's wrong:** `localStorage` is not available in MV3 service workers — the Web Storage API is not accessible there. All service worker storage must use `chrome.storage.*` or `IndexedDB`.
**Do this instead:** `chrome.storage.local.get/set` for structured data. Return `true` from `onMessage` handlers that call async storage to keep the response channel open.

### Anti-Pattern 5: Single Large SessionData Blob for History

**What people do:** Store session history as a nested array inside the existing `trackmanData` key.
**Why it's wrong:** Merging history into the current session key breaks backward compatibility and makes partial reads expensive (must deserialize all history to read current session).
**Do this instead:** Keep `trackmanData` as the single current session key. Add a separate `sessionHistory` key that stores an array of session metadata (date, report_id, shot count) plus individual session keys (e.g., `session_<report_id>`). This allows lightweight history list queries without loading all shot data.

## Sources

- Direct source code inspection: `/Users/kylelunter/claudeprojects/trackv3/src/` (HIGH confidence)
- Chrome for Developers — Service Worker Lifecycle: https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle (HIGH confidence)
- Chrome for Developers — chrome.sidePanel API: https://developer.chrome.com/docs/extensions/reference/api/sidePanel (HIGH confidence)
- Chrome for Developers — chrome.storage API: https://developer.chrome.com/docs/extensions/reference/api/storage (HIGH confidence)
- MV3 offscreen document + blob URL pattern: https://developer.chrome.com/docs/extensions/reference/api/offscreen (MEDIUM confidence — current data URI approach is simpler and works without offscreen doc)
- Popup size constraints (800x600 max): multiple community sources (MEDIUM confidence)

---
*Architecture research for: TrackPull Chrome Extension — new feature integration*
*Researched: 2026-03-02*
