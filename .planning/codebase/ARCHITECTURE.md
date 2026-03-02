# Architecture

**Analysis Date:** 2026-03-02

## Pattern Overview

**Overall:** Chrome Extension with Multi-World Content Script Separation and Message-Based IPC

**Key Characteristics:**
- Manifest V3 Chrome extension architecture
- MAIN world content script (API interception) + ISOLATED world bridge content script (permission boundary)
- Service worker as central data hub with chrome.storage persistence
- Message-based communication between worlds and popup UI
- Dual data extraction paths: API response interception (primary) + HTML table scraping (fallback)
- Unit normalization layer for flexible metric unit conversion

## Layers

**Content Scripts (MAIN World):**
- Purpose: Monkey-patch fetch/XMLHttpRequest to intercept Trackman API responses; parse JSON payloads into SessionData; wait for DOM rendering and scrape shot group tags
- Location: `src/content/interceptor.ts`
- Contains: API response detection, JSON parsing of StrokeGroups data, shot metric extraction, group tag scraping
- Depends on: `src/models/types.ts` for SessionData structure, `src/shared/constants.ts` for metric keys
- Used by: None directly; posts to bridge via window.postMessage in MAIN world context

**Content Scripts (ISOLATED World):**
- Purpose: Listen for postMessage from MAIN world interceptor; forward session data to service worker via chrome.runtime.sendMessage (only ISOLATED world has Chrome API access)
- Location: `src/content/bridge.ts`
- Contains: Message listener, chrome.runtime.sendMessage wrapper
- Depends on: None; minimal passthrough
- Used by: Service worker receives its messages

**Service Worker (Background):**
- Purpose: Central persistence layer; handle storage operations, CSV export requests, manage unit preferences; broadcast data updates to popup
- Location: `src/background/serviceWorker.ts`
- Contains: chrome.storage.local handlers, chrome.downloads API wrapper, message routing (SAVE_DATA, GET_DATA, EXPORT_CSV_REQUEST)
- Depends on: `src/shared/csv_writer.ts`, `src/shared/unit_normalization.ts`, `src/models/types.ts`
- Used by: Bridge posts to it; popup queries it; storage.onChanged broadcasts to popup

**Popup UI:**
- Purpose: User interface for viewing shot count, exporting CSV, clearing stored data, setting unit preferences
- Location: `src/popup/popup.ts`
- Contains: DOM event listeners, shot count display, export/clear button handlers, unit selector persistence
- Depends on: `src/shared/constants.ts` for storage keys
- Used by: Service worker pushes DATA_UPDATED messages back to it

**Shared Utilities:**
- **CSV Writer** (`src/shared/csv_writer.ts`): Converts SessionData to CSV format with metric ordering, unit labels, includes averages/consistency rows
- **Unit Normalization** (`src/shared/unit_normalization.ts`): Distance/angle/speed conversion (yards↔meters, degrees↔radians, mph↔km/h↔m/s), metric classification (distance, small distance, angle, speed)
- **HTML Table Parser** (`src/shared/html_table_parser.ts`): Fallback DOM scraper; CSS selector-based extraction of club names, metric headers, shot rows, averages, consistency values
- **Constants** (`src/shared/constants.ts`): Metric definitions, CSS selectors, storage key names, API patterns

**Data Models:**
- Location: `src/models/types.ts`
- Contains: Shot, ClubGroup, SessionData interfaces; mergeSessionData() for multi-page metric merging
- Pattern: SessionData aggregates ClubGroups (one per club/metric page), each containing Shots with raw metrics; merging combines shot data from multiple pages

## Data Flow

**API Interception Flow (Primary):**

1. Page loads on trackmangolf.com, manifest injects interceptor.ts into MAIN world
2. Interceptor monkey-patches fetch and XMLHttpRequest
3. API request returns JSON with StrokeGroups array (shot data)
4. handleCapturedJson() detects StrokeGroups, parses to SessionData
5. waitForTagsThenPost() polls DOM for .group-tag elements (club names)
6. applyGroupTags() attaches tags to shots, postSession() sends to bridge via window.postMessage
7. Bridge listener (bridge.ts) receives in ISOLATED world, calls chrome.runtime.sendMessage
8. Service worker chrome.runtime.onMessage receives SAVE_DATA, stores in chrome.storage.local
9. storage.onChanged fires, broadcasts DATA_UPDATED to popup

**User Export Flow:**

1. Popup calls chrome.runtime.sendMessage with EXPORT_CSV_REQUEST
2. Service worker retrieves SessionData + unit preferences from storage
3. Calls writeCsv() with retrieved unitChoice
4. writeCsv() normalizes metric values (converts units), orders metrics, generates CSV string
5. chrome.downloads.download() creates blob URL, triggers browser download
6. Response success/error sent back to popup for toast notification

**Fallback HTML Scraping Flow (if API unavailable):**

1. scrapeAndMergeSessions() in html_scraping.ts runs on page
2. TableParser queries DOM for .player-and-results-table-wrapper, .ResultsTable, .row-with-shot-details
3. Extracts club name, metric headers from .parameter-names-row, shot rows with values
4. Builds SessionData with metric_names and club_groups
5. If multi-page (multiple metric groups), mergeSessionData() combines shot data by index

**State Management:**
- Primary: Chrome storage.local (`trackmanData`, `speedUnit`, `distanceUnit`)
- Transient: Service worker in-memory message handlers (no persistence beyond storage)
- UI updates: Message-driven (popup listens for DATA_UPDATED broadcasts)
- Unit preferences: Per-user, stored independently of session data

## Key Abstractions

**SessionData (Aggregate Root):**
- Purpose: Immutable structured representation of Trackman session
- Examples: `src/models/types.ts`
- Pattern: Record containing date, report_id, club_groups array, metric names list, metadata_params from URL
- Serialized to chrome.storage.local as JSON

**ClubGroup (Value Object):**
- Purpose: Club-specific shot aggregation with averages/consistency
- Pattern: Contains club_name, shots array, averages/consistency dicts (populated from API)
- Used in CSV export to group rows by club

**Shot (Value Object):**
- Purpose: Single shot record with metrics
- Pattern: Minimal; shot_number, metrics dict, optional tag (from DOM)

**UnitChoice (Configuration Value Object):**
- Purpose: User's unit preference state
- Pattern: { speed: "mph"|"m/s", distance: "yards"|"meters" }
- Derived: From chrome.storage.local or migrated from legacy "unitPreference" key

**MetricNormalization (Pure Function):**
- Purpose: Atomic conversion of raw metric value to output units
- Pattern: normalizeMetricValue(value, metricName, reportUnitSystem, unitChoice) → MetricValue
- Idempotent; no side effects

## Entry Points

**Service Worker Activation:**
- Location: `src/background/serviceWorker.ts`
- Triggers: Browser loads extension, chrome.runtime.onInstalled fires once per install
- Responsibilities: Establish message listeners, initialize storage if empty, log install

**Content Script Injection (MAIN World):**
- Location: `src/content/interceptor.ts`
- Triggers: Manifest content_scripts matches ["https://web-dynamic-reports.trackmangolf.com/*"]
- Responsibilities: IIFE self-executes, monkey-patches fetch/XHR, sets up capture handler

**Content Script Injection (ISOLATED World):**
- Location: `src/content/bridge.ts`
- Triggers: Manifest content_scripts at document_start, ISOLATED world
- Responsibilities: Register window.addEventListener for postMessage, forward to service worker

**Popup UI Load:**
- Location: `src/popup/popup.ts` (loaded by `src/popup/popup.html`)
- Triggers: User clicks extension icon
- Responsibilities: Query storage for shot data, render count, set up event listeners (export, clear, unit change)

## Error Handling

**Strategy:** Non-blocking; log to console, show user-facing toasts/messages where appropriate

**Patterns:**

1. **API Interception Failures:**
   - parseSessionData() returns null silently if StrokeGroups missing
   - containsStrokegroups() heuristic checks prevent parsing non-shot responses
   - try-catch in handleCapturedJson() prevents breaking original fetch/XHR

2. **Storage Failures:**
   - Service worker checks chrome.runtime.lastError after storage operations
   - Sends error response to popup with human-readable message
   - getDownloadErrorMessage() sanitizes Chrome error strings for UI display

3. **Tag Scraping Failures:**
   - waitForTagsThenPost() times out after 8 seconds, posts without tags if DOM elements never appear
   - applyGroupTags() silently skips if tag count < club count

4. **CSV Generation Failures:**
   - writeCsv() wrapped in try-catch, error sent to popup
   - Popup shows toast with error message, disables export button temporarily

5. **Unit Normalization Failures:**
   - parseNumericValue() returns null for non-numeric strings
   - normalizeMetricValue() returns original value if conversion fails
   - CSV export preserves unparseable values as-is

## Cross-Cutting Concerns

**Logging:** Native console.log throughout; tagged with "TrackPull:" prefix for easy filtering

**Validation:**
- Metric keys filtered against METRIC_KEYS set in interceptor (whitelist)
- URL parameter parsing for report_id and date extraction with fallbacks
- Column count validation in CSV writer (headers.length must match row values)

**Authentication:**
- No auth layer; extension only runs on web-dynamic-reports.trackmangolf.com (host_permissions in manifest)
- Users implicitly authenticated via Trackman website login

**Performance:**
- API interception uses response.clone() to avoid consuming original response
- Tag polling uses 300ms intervals, max 8s wait (tradeoff: DOM readiness vs. extension blocking)
- Metric ordering pre-defined in METRIC_COLUMN_ORDER for consistent CSV column order
- mergeSessionData() uses Map for O(1) club lookups during multi-page merge

---

*Architecture analysis: 2026-03-02*
