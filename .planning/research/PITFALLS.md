# Pitfalls Research

**Domain:** Chrome Extension (MV3) — GraphQL API Integration with Cookie Auth, Portal Activity Browser, Dual Data Source Merging
**Researched:** 2026-03-26
**Confidence:** HIGH for MV3 service worker lifecycle (official docs verified); HIGH for permission escalation behavior (official docs verified); HIGH for cookie/credentials behavior in service workers (multiple community reports + official docs); MEDIUM for GraphQL schema resilience patterns (general GraphQL best practices, Trackman API schema not directly inspectable); MEDIUM for popup lifecycle interaction with async message passing (community confirmed, official behavior documented); LOW for Trackman-specific schema stability (no official versioning documentation found — Trackman Cloud API docs returned 404)

---

## Critical Pitfalls

### Pitfall C1: Adding host_permissions Disables the Extension for All Existing Users

**What goes wrong:**
The current manifest has a single `host_permissions` entry: `https://web-dynamic-reports.trackmangolf.com/*`. Adding `https://api.trackmangolf.com/*` and `https://portal.trackmangolf.com/*` constitutes a permission escalation. Chrome detects the escalation, **disables the extension for every existing user**, and shows a banner asking them to re-approve. Users who miss the banner remain on the disabled extension indefinitely. Chrome Web Store review processes also flag permission increases and may require additional justification.

**Why it happens:**
Developers treat `host_permissions` like a configuration change. It is not — it is a privilege change. Chrome compares the permission warning messages before and after the update. Adding two new site origins produces new warning messages that did not exist in the previous grant, which triggers the disable-on-update path.

**How to avoid:**
Use `optional_host_permissions` instead of `host_permissions` for the new API domains. Declare in manifest:

```json
"optional_host_permissions": [
  "https://api.trackmangolf.com/*",
  "https://portal.trackmangolf.com/*"
]
```

Then request the permissions at runtime using `chrome.permissions.request()` the first time the user initiates an "Import from Portal" action. Users who never use portal import are never prompted and the extension is never disabled. Optional host permissions trigger a permission dialog only when the user explicitly opts into the feature.

**Warning signs:**
- Extension version bump causes support requests: "my extension stopped working"
- Chrome Web Store review includes a request to justify new host permissions
- Existing users are on an older version because they dismissed the re-approval banner

**Phase to address:**
GraphQL client and manifest phase — the host permission strategy must be decided before writing a single line of fetch code, because it determines the entire manifest structure and the runtime request flow.

---

### Pitfall C2: Service Worker Cookies Are Not Automatically Sent with `credentials: 'include'`

**What goes wrong:**
In a normal browser context, `fetch(url, { credentials: 'include' })` sends all matching cookies with the request. In a Chrome extension service worker, this behavior is **unreliable**. Multiple verified community reports document that cookies are not included in service worker fetch calls even with `credentials: 'include'` and correct `host_permissions`. The request reaches the server without the session cookie, resulting in a 401 or redirect response. The extension appears to work (no network error is thrown) but every GraphQL query returns an authentication failure.

**Why it happens:**
The service worker runs in an isolated, non-browser context without a tab origin. The cookie store is accessible to the extension via `chrome.cookies`, but the automatic cookie attachment that the browser does for tab-origin requests does not reliably apply in the service worker's fetch context. This is a known, documented Chrome behavior difference between extension service workers and regular page contexts.

**How to avoid:**
Do not rely on automatic cookie attachment in the service worker. Use the `chrome.cookies` API to explicitly read the session cookie(s) before making GraphQL requests, then attach them manually as `Cookie` request headers:

```typescript
const cookies = await chrome.cookies.getAll({ domain: 'trackmangolf.com' });
const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

const response = await fetch('https://api.trackmangolf.com/graphql', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Cookie': cookieHeader,
  },
  body: JSON.stringify({ query, variables }),
});
```

Requires the `"cookies"` permission in `manifest.json` permissions array alongside the host permissions for `trackmangolf.com`.

**Warning signs:**
- GraphQL requests return HTTP 401 or redirect to login page
- `fetch` itself does not throw — error is inside the HTTP response
- Works when tested from a tab page context but not from the service worker
- Manually inspecting `chrome.cookies.getAll` shows cookies are present but the request still fails

**Phase to address:**
GraphQL client implementation phase — this is the first thing to verify before building anything on top of the auth layer. Write a health-check query (`{ me { id } }`) as the first test and validate authenticated response before implementing the activity list query.

---

### Pitfall C3: Service Worker Terminates Mid-Query, Silently Dropping the GraphQL Response

**What goes wrong:**
Chrome terminates an extension service worker after **30 seconds of fetch response inactivity** and after **5 minutes for any single operation**. A user with hundreds of sessions requesting the full activity list, or a large `node(id)` query pulling 60+ fields across 300+ shots, may exceed these limits. The service worker terminates while the fetch is in flight. The response is dropped with no error surface to the user. From the popup's perspective, the message it sent to the service worker simply never receives a reply.

**Why it happens:**
The service worker lifecycle was designed for short-lived event handlers. GraphQL queries against a portal API with large session data are longer-lived than the model assumes. Developers test with small sessions (10–20 shots) that complete well within the limits, then ship to users with 400-shot sessions.

**How to avoid:**

1. **Paginate activity list queries** — do not fetch all activities in one request. Use cursor-based pagination to fetch 20–50 activities at a time. Store the cursor and fetch the next page on demand.

2. **Keep the service worker alive during the fetch** — periodically call a lightweight extension API (e.g., `chrome.storage.local.get('ping')`) during long operations to reset the 30-second idle timer. This is the recommended workaround for operations that cannot be paginated.

3. **Set aggressive fetch timeouts** — use `AbortController` with a timeout shorter than Chrome's 30-second limit (e.g., 20 seconds) so the extension can surface a user-visible timeout error rather than silently dropping the response.

4. **Persist intermediate results** — if fetching multiple pages of activities, write each page to `chrome.storage.local` as it arrives rather than holding the full result set in memory and writing at the end.

**Warning signs:**
- Import appears to hang with no error or success feedback
- Background console shows no error after a long pause, then the request handler never fires
- Works for small sessions, fails for large sessions
- Chrome DevTools service worker inspector shows the worker as "stopped" mid-operation

**Phase to address:**
GraphQL client implementation phase — paginated fetch and AbortController timeout must be part of the initial client design, not added later.

---

### Pitfall C4: Popup Closes Before the GraphQL Response Returns, Orphaning the Import

**What goes wrong:**
The popup is a transient Chrome UI. When the user closes it (clicks away, presses Escape, or the popup loses focus), **the popup's JavaScript execution stops immediately**. If the "Import from Portal" flow is implemented by sending a message from the popup to the service worker and waiting for a response via `chrome.runtime.sendMessage`, closing the popup before the response arrives causes the response message to be delivered to a dead context. The service worker may or may not receive an error. The import either completes silently in the background (no UI feedback) or is abandoned entirely.

**Why it happens:**
Developers familiar with normal web apps assume the message sender persists until the response arrives. In Chrome extension popups, the entire popup context is destroyed on close. Any promise or callback awaiting a service worker response is simply garbage collected.

**How to avoid:**

1. **Execute the import entirely in the service worker** — the popup sends a fire-and-forget message (`IMPORT_ACTIVITY` with the activity ID). The service worker performs the fetch, processes the result, and writes it to `chrome.storage.local`. The popup, when reopened, reads the updated state.

2. **Use a progress key in storage** — service worker writes an `importStatus` key to storage (`{ state: 'loading' | 'done' | 'error', message: string }`). The popup reads this key on open and on `DATA_UPDATED` events. This decouples the popup lifecycle from the import lifecycle.

3. **Do not return `true` from `onMessage` and rely on `sendResponse`** — `sendResponse` only works if the popup is still open. An import that takes 5+ seconds should never depend on `sendResponse`.

**Warning signs:**
- Import works when popup stays open, fails silently when user clicks away
- `chrome.runtime.sendMessage` callback never fires after popup is closed
- Console shows "The message port closed before a response was received"
- No error shown to user despite failed import

**Phase to address:**
Activity import flow phase — the fire-and-forget + storage state pattern must be the design from the start, not a fix added after discovering the popup lifecycle issue.

---

### Pitfall C5: GraphQL Schema Changes Break the Field Mapping Without Warning

**What goes wrong:**
The `Measurement` type returned by `Stroke.measurement` contains 60+ fields. The parser maps these fields to the existing `SessionData` / `ClubGroup` shape. Trackman does not publish a formal schema changelog. If Trackman renames a field (e.g., `ballSpeed` → `ballSpeedMph`), removes a field, or changes a field from nullable to non-null, the mapping silently returns `undefined` for that metric. The user's export appears complete but is missing data. Because the existing interceptor path still works for report pages, the regression may not be noticed for weeks.

**Why it happens:**
GraphQL best practice is additive evolution (new fields, deprecated old fields), but private APIs used by first-party clients (Trackman's own portal) have no external consumers to protect and may make breaking changes without warning. There is no versioning header on the endpoint and no official API contract for third-party use.

**How to avoid:**

1. **Validate required fields at parse time** — after receiving the `Stroke.measurement` object, verify that the fields the parser depends on are present and non-null before mapping. Log (but do not crash) when an expected field is missing.

2. **Map defensively with fallbacks** — every field mapping should explicitly handle `undefined` and `null`:
   ```typescript
   const ballSpeed = measurement.ballSpeed ?? measurement.ball_speed ?? null;
   ```

3. **Compare interceptor results against API results in testing** — for any session captured via both the interceptor path and the API path, the metric values should match. Discrepancies surface schema drift before users encounter it.

4. **Pin the known working query shape** — store the full GraphQL query string as a constant, not dynamically assembled. If the API rejects the query due to a schema change, the error is surfaced immediately rather than silently returning incomplete data.

**Warning signs:**
- API-imported sessions have fewer metrics than interceptor-captured sessions for the same session
- Specific metric columns are consistently empty in exports from portal-imported sessions
- `undefined` or `null` values appearing in the Measurement mapping where values are expected

**Phase to address:**
GraphQL field mapping phase — defensive parsing with explicit validation must be built into the `Measurement` → `SessionData` mapper from the first implementation.

---

### Pitfall C6: Base64 Activity ID Is Opaque and Must Not Be Parsed or Constructed

**What goes wrong:**
Trackman's GraphQL API likely uses Relay-style global object IDs for activities. These IDs are base64-encoded strings (e.g., `QWN0aXZpdHk6MTIz` decodes to `Activity:123`). Developers sometimes decode the base64 to extract the underlying numeric ID, then use it in other queries or store it as the canonical identifier. If Trackman changes the encoding format (adding a version prefix, switching to a different scheme), the decoded extraction breaks. Similarly, constructing IDs by encoding `Activity:` + an arbitrary number fails for any IDs that do not follow that pattern.

**Why it happens:**
The decoded value looks stable and meaningful. Developers treat the decoded numeric ID as more durable than the encoded form. The Relay specification explicitly states IDs are opaque, but this is ignored when the decoded value is obviously a simple integer.

**How to avoid:**
Store and pass the raw base64 ID string as returned by the API. Never decode it. Never construct an ID. Pass the unaltered `id` value from the activity list query directly to the `node(id: $id)` query. Use the raw ID as the storage key for activity data (e.g., `activity_{rawBase64Id}`).

**Warning signs:**
- IDs that worked yesterday return `null` from `node(id)` queries today
- Manual ID construction (encoding `Activity:` + number) fails for newer activities
- Decoding the stored ID produces a format that does not match newly returned IDs

**Phase to address:**
GraphQL client implementation phase — the data model for stored activity IDs must treat IDs as opaque strings from the start.

---

## Moderate Pitfalls

### Pitfall M1: Unauthenticated State Is Not Caught Early Enough

**What goes wrong:**
The GraphQL auth depends entirely on the user being logged into the Trackman portal in their browser. If the user is not logged in, the session cookie is absent or expired. The GraphQL request returns an HTTP 200 with a `{ "errors": [{ "message": "Unauthorized" }] }` body — **not** an HTTP 401. If the fetch client only checks the HTTP status code for errors, unauthenticated responses are treated as successful responses with empty data. The activity list appears empty rather than showing a login prompt.

**Why it happens:**
GraphQL always returns HTTP 200 for application-level errors. Network-layer error checking (status code != 200) is insufficient for GraphQL. Developers familiar with REST APIs check the status code and assume a 200 means success.

**How to avoid:**
After every GraphQL fetch, check both the HTTP status code AND the `errors` array in the response body:

```typescript
const json = await response.json();
if (!response.ok) throw new NetworkError(response.status);
if (json.errors?.length) {
  const isAuthError = json.errors.some(e =>
    e.message.toLowerCase().includes('unauthorized') ||
    e.extensions?.code === 'UNAUTHENTICATED'
  );
  if (isAuthError) throw new AuthError('Not logged into Trackman');
  throw new GraphQLError(json.errors);
}
```

Surface auth errors to the user with specific messaging: "You must be logged into portal.trackmangolf.com to import sessions."

**Warning signs:**
- Activity list renders empty with no error message when user is not logged in
- `json.data` is `null` but `json.errors` contains auth messages that are never surfaced
- No difference in UI between "no sessions" and "not authenticated"

**Phase to address:**
GraphQL client implementation phase — the base fetch wrapper must handle both HTTP errors and GraphQL errors before any query-specific code is written.

---

### Pitfall M2: API-Imported Sessions and Interceptor-Captured Sessions Have Different Field Availability

**What goes wrong:**
Interceptor-captured sessions come from Trackman's report page API response, which includes whatever fields Trackman chose to surface in the report view. API-imported sessions come from `Stroke.measurement`, which may have a different field set — some fields present in reports may not be in the GraphQL Measurement type, and vice versa. If the `SessionData` type, the CSV writer, and the export pipeline assume all sessions have the same metric set, API-imported sessions either show blank columns where the metric was unavailable or crash when accessing a field that does not exist in `ClubGroup.averages`.

**Why it happens:**
The existing pipeline was designed around a single data source (the interceptor). The assumption that every `SessionData` has the same fields is implicit in the current CSV writer and TSV writer. No defensive checks exist for missing metrics because they were never missing before.

**How to avoid:**

1. **Use the existing `metric_names` array as the contract** — when building `SessionData` from the GraphQL response, populate `metric_names` only with the metrics that are actually present in the API response. The CSV writer already uses `metric_names` to determine column presence; this is the correct behavior.

2. **Test the export pipeline with a session sourced from the API** — run a full export (CSV, TSV, AI prompt) using a `SessionData` built from a mock `Measurement` object, verifying no column-selection logic assumes specific metrics are present.

3. **Do not add an `is_api_imported` flag** — it creates a second branch in every consumer. Instead, the `SessionData` shape is the contract regardless of source.

**Warning signs:**
- CSV exports from API-imported sessions have blank metric columns that exist in interceptor sessions
- TSV copy fails or produces trailing delimiters for API-imported sessions
- AI prompts include metric references for metrics not present in the session

**Phase to address:**
GraphQL field mapping phase — the `Measurement` → `SessionData` mapper must produce a `SessionData` that is structurally identical to what the interceptor produces, with `metric_names` accurately reflecting which fields are populated.

---

### Pitfall M3: Activity List Pagination Loads More Than Needed, Slowing the Import UI

**What goes wrong:**
If the activity list query fetches all activities in one go (no pagination), a user with 2 years of Trackman sessions may have 500+ activities. Fetching all 500 before rendering the activity browser results in a multi-second hang with no progress feedback. Even with a limit parameter, fetching more than the user needs on first open wastes bandwidth and service worker time.

**Why it happens:**
Pagination is perceived as added complexity. Developers default to "fetch all, then render" because it simplifies the UI state machine. This works fine in testing with 5 activities.

**How to avoid:**
Fetch the first page (20–50 activities) immediately and render the list. Load additional pages on demand ("Load more" button or scroll trigger). Store each page's activities in `chrome.storage.local` with the cursor so re-opening the popup does not re-fetch already-loaded pages. The typical user wants recent sessions; fetching 20 is sufficient for the common case.

**Warning signs:**
- Activity browser takes 3+ seconds to open
- Service worker approaches the 30-second idle timeout during activity list fetch
- Users with large history report the popup feels slow

**Phase to address:**
Activity browser UI phase — pagination strategy must be decided before implementing the activity list query, because it affects the query shape, storage layout, and UI component design.

---

### Pitfall M4: Merged Duplicate Sessions From Both Data Sources Create Inconsistent History

**What goes wrong:**
A user visits a Trackman report page, which fires the interceptor and saves the session via the existing `SAVE_DATA` path. Later, the user uses "Import from Portal" to pull the same session via the GraphQL API. Now the session exists twice in `chrome.storage.local` — once from the interceptor path (keyed by `report_id`) and once from the API path (keyed by activity base64 ID). The history list shows the session twice. Exports from the two copies may differ slightly if the field sets are not identical.

**Why it happens:**
The two data collection paths use different session identifiers. The interceptor uses `report_id` from the URL or response. The API path uses the activity's GraphQL ID. Without an explicit deduplication check bridging these two identifier systems, the same real-world session gets stored under two different keys.

**How to avoid:**

1. **Establish a canonical session ID** — define `session_id` as a string that can be set from either the `report_id` (interceptor path) or a normalized form of the activity ID (API path). When saving, check if any existing session has a `report_id` or `activity_id` that matches, and update in place rather than creating a new entry.

2. **Prefer the API-sourced version** — if a session exists from both paths, the API version has more complete field coverage (60+ Measurement fields). On import via API, detect the duplicate and offer to replace the interceptor-captured version.

3. **Surface the source in the history list** — show a small indicator (e.g., "Intercepted" vs. "Portal") so the user understands why two entries for the same date exist, and can delete the less complete one.

**Warning signs:**
- History list shows duplicate entries for the same session date and shot count
- Exporting two history entries for the same session produces different column sets
- `chrome.storage.local.getBytesInUse()` grows faster than expected

**Phase to address:**
Activity import flow phase — deduplication logic must be implemented when the API import path writes to storage, before shipping the feature.

---

### Pitfall M5: `cookies` Permission Adds a New Permission Warning on Extension Update

**What goes wrong:**
The current manifest does not include `"cookies"` in the permissions array. Adding it to support `chrome.cookies.getAll()` (required for explicit cookie attachment per Pitfall C2) triggers a permission warning on extension update. Depending on Chrome's classification of this permission, it may or may not cause the extension to be disabled for existing users.

**Why it happens:**
The `"cookies"` permission is a named permission with a user-visible warning message. Unlike `host_permissions`, named permission changes may or may not trigger the disable-on-update path. Chrome compares warning message sets before and after. If "cookies" adds a warning that was not present before, it is treated as escalation.

**How to avoid:**
Add `"cookies"` to the required permissions in the same update that introduces optional host permissions for the API domains. Since the update is already accompanied by a new host permission request (or optional_host_permissions), users of the portal import feature will already be granting new access. If possible, gate the `chrome.cookies` call such that it is only invoked after the user has explicitly enabled the portal import feature (i.e., after granting optional_host_permissions), which aligns the permission grant with user intent.

Alternatively, verify whether `chrome.cookies` access is available without explicit declaration when `host_permissions` covers the relevant domain. This behavior is version-dependent and should be tested against the target Chrome version.

**Warning signs:**
- Extension update causes user reports of "my extension is disabled again"
- Chrome extension update review flags `"cookies"` permission as new
- DevTools shows `chrome.cookies` is undefined despite manifest declaration

**Phase to address:**
Manifest and permissions phase — all permission additions must be planned together and tested against an existing installed extension to verify the update experience before shipping.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Put new `host_permissions` in required permissions instead of optional | Simpler code, no runtime permission request | Disables extension for all existing users on update; Chrome Web Store review friction | Never — use `optional_host_permissions` for portal domains |
| Rely on `credentials: 'include'` for cookie attachment in service worker | No `chrome.cookies` API needed | Silent auth failures; cookies not reliably sent from service worker context | Never for service worker context |
| Decode base64 activity IDs to extract numeric ID | Numeric ID looks more usable | Breaks when ID encoding format changes | Never — treat IDs as opaque strings |
| Fire-and-forget without storage state key for imports | Simpler message flow | Silent failure when popup closes mid-import | Never for operations taking more than 1 second |
| Fetch all activities on first open, no pagination | Simpler state machine | Multi-second hang for users with large history; service worker timeout risk | Only acceptable for initial prototype / testing |
| Single GraphQL query with all 60 Measurement fields inline | One query, no fragments | Query string is fragile; schema change breaks entire request | Acceptable in MVP if query is stored as a versioned constant |
| Add `is_api_imported` flag to SessionData | Easier to reason about source | Every consumer must handle two branches; import source is not the consumer's concern | Never — let `metric_names` presence be the contract |

---

## Integration Gotchas

Common mistakes when connecting the GraphQL API path to the existing extension system.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Cookie auth in service worker | Use `fetch(..., { credentials: 'include' })` and assume cookies attach | Read cookies explicitly with `chrome.cookies.getAll()` and set `Cookie` header manually |
| GraphQL error handling | Check only HTTP status code for errors | Check both HTTP status and `response.errors` array; distinguish auth errors from field errors |
| Activity ID storage key | Decode base64 ID and use the numeric part as storage key | Use raw base64 ID string as-is for storage keys |
| Import completion | Send result back to popup via `sendResponse` | Write result to `chrome.storage.local`; popup reads on open or `DATA_UPDATED` |
| `SessionData` from API vs. interceptor | Treat as different types requiring different code paths | Both must produce a valid `SessionData` with accurate `metric_names`; same pipeline, different sources |
| Deduplication across sources | Use report URL as dedup key | Maintain both `report_id` and `activity_id` on `SessionSnapshot`; check both on import |
| Manifest permission update | Add new `host_permissions` required entries | Use `optional_host_permissions`; request at runtime via `chrome.permissions.request()` |
| Large activity list pagination | Fetch all before rendering | Fetch first page (20–50), render immediately, load more on demand |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Fetch all activities in one GraphQL query | Multi-second popup hang; service worker timeout on 30s fetch limit | Paginate: first 20–50 activities, cursor-based, load-more on demand | At ~100+ activities (2+ years of regular use) |
| Hold full Measurement result in memory before writing to storage | Service worker terminated mid-import loses all data | Write each activity to storage as it arrives; commit incrementally | For any session with 200+ shots under poor network conditions |
| No `AbortController` timeout on GraphQL fetch | User sees spinner indefinitely on network error | Set 20-second abort timeout; surface explicit error on abort | On any poor network condition |
| Read all stored sessions on every popup open to check for portal-imported ones | Popup open time grows with history size | Use the existing session index; only load sessions on demand | At 10+ sessions with portal-imported data |
| Build full 60-field `Measurement` query inline | Any schema change breaks the entire query with an unhelpful error | Store query as a named constant; validate response shape at entry point | Immediately on any Trackman schema change |

---

## Security Mistakes

Domain-specific security issues for this extension.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Logging full cookie header in debug output | Session cookies in extension console logs; exfiltration risk if console logging is shipped | Never log cookie values; log only cookie names and count for debugging |
| Storing session cookies in `chrome.storage` | If storage is read by another extension or process, cookies are exposed outside browser's cookie jar | Never store cookie values; use `chrome.cookies.getAll()` at request time only |
| Rendering activity names from the API with `innerHTML` | XSS if Trackman returns a crafted activity name | Use `textContent` for all activity metadata display; consistent with existing XSS prevention in the extension |
| Forwarding the full cookie string via `chrome.runtime.sendMessage` | Cookie values visible in extension message passing; not end-to-end encrypted within Chrome | Perform the GraphQL fetch in the service worker; never pass cookie values through message channels to popup or content scripts |
| Making GraphQL requests from content script context | Content scripts run in page origin; credentials may be blocked by the page's CSP | All GraphQL requests must originate from the service worker only |

---

## UX Pitfalls

Common user experience mistakes for the portal import feature.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No indication that user is not logged in | Activity browser appears empty; user assumes they have no sessions | Detect auth error early; show explicit "Log into portal.trackmangolf.com to enable import" with a link |
| Activity browser lists raw timestamps with no session context | User cannot identify which session to import | Show date, time, shot count, and session type per activity |
| Import replaces current session without confirmation | User loses an un-exported interceptor session | Importing a session from portal loads it as the active session but does not overwrite unsaved interceptor data without a prompt |
| Import spinner with no progress on a large session (300+ shots) | User closes popup thinking the import failed | Show per-phase progress: "Fetching session..." → "Processing shots..." → "Ready to export" |
| No way to distinguish portal-imported from interceptor-captured sessions in history | User does not know the data provenance | Add a small source label ("Portal" vs. "Live") to the history list |
| Activity list re-fetches from API every time the popup opens | Slow open for users with poor connection | Cache the activity list page in `chrome.storage.local` with a timestamp; refresh only after 5+ minutes or explicit user action |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Cookie auth:** Does `chrome.cookies.getAll({ domain: 'trackmangolf.com' })` return the expected session cookies? Verify explicitly before assuming authentication works.
- [ ] **GraphQL error handling:** Send a request with an invalid cookie. Does the UI show an auth error or an empty activity list?
- [ ] **Service worker timeout:** Import a session with 300+ shots on a throttled connection. Does the import complete or time out silently?
- [ ] **Popup lifecycle:** Start an import, then immediately click away to close the popup. Reopen the popup. Is the import complete, in progress (with status indicator), or silently lost?
- [ ] **Permission escalation:** Install version 1.5.x, then manually install a test build with the new permissions. Does Chrome disable the extension? (This must be tested pre-release.)
- [ ] **Deduplication:** Intercept a session from the report page. Then import the same session via "Import from Portal." Does the history list show one entry or two?
- [ ] **Field mapping completeness:** Export a portal-imported session as CSV. Compare the column count and values against a CSV exported from the same session captured via the interceptor. Any missing columns indicate mapper gaps.
- [ ] **Base64 ID opaqueness:** Confirm the activity ID stored in `chrome.storage.local` is the raw base64 string as returned by the API, not a decoded or re-encoded form.
- [ ] **Unauthenticated empty state:** With the user logged out of portal.trackmangolf.com, open the activity browser. Verify the error message explicitly names the login requirement.
- [ ] **Optional permission revocation:** Grant the optional host permissions, use the import feature, then revoke the permissions via `chrome.permissions.remove()`. Open the activity browser. Does it gracefully detect missing permissions and prompt the user to grant them again?

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Extension disabled for existing users due to host_permissions escalation | HIGH | Cannot undo a shipped release; migrate to optional_host_permissions in next release; add onboarding flow explaining why permission is needed |
| Cookies not sent, all imports fail with auth error | MEDIUM | Switch from `credentials: 'include'` to explicit `chrome.cookies.getAll()` approach; requires adding `"cookies"` permission (triggers another update review) |
| Duplicate sessions in history from both sources | MEDIUM | Write a one-time migration in `chrome.runtime.onInstalled` that scans history, detects duplicates by matching date+shot count, and merges them; requires defining merge priority (API > interceptor) |
| Schema change breaks Measurement field mapping | MEDIUM | Update the mapper constants to match new field names; ship a patch release; add integration test comparing API response against expected field names to detect future drift early |
| Service worker timeout mid-import with no error surfaced | LOW | Add AbortController timeout and storage-based progress state; users retry the import with better feedback |
| Import state lost when popup closes | LOW | Migrate to storage-based progress state (service worker writes status to storage); popup reads on next open |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| host_permissions escalation disables existing users (C1) | Manifest and permissions phase (first phase) | Test: install old version, apply update; verify extension is not disabled |
| Cookies not attached in service worker (C2) | GraphQL client implementation phase | Test: `{ me { id } }` query returns authenticated user object, not auth error |
| Service worker terminated mid-query (C3) | GraphQL client implementation phase | Test: throttle network to 3G, import 300-shot session; verify completion or user-visible timeout error |
| Popup closes before import completes (C4) | Activity import flow phase | Test: start import, close popup, reopen; verify import state is preserved in storage |
| Schema change breaks field mapping (C5) | GraphQL field mapping phase | Test: mock a response with one field renamed; verify mapper falls back gracefully without crashing |
| Base64 ID parsed or constructed (C6) | GraphQL client implementation phase | Code review: assert no `atob()` or ID construction calls in client code; IDs are stored and passed as-is |
| Auth errors surfaced as empty list (M1) | GraphQL client implementation phase | Test: revoke cookies, open activity browser; verify explicit auth error message |
| API vs interceptor field availability mismatch (M2) | GraphQL field mapping phase | Test: full export pipeline on mock API-sourced SessionData; compare CSV columns to interceptor-sourced export |
| Pagination missing, slow activity list (M3) | Activity browser UI phase | Test: mock 200 activities; verify first 20 render before 2 seconds; no service worker timeout |
| Duplicate sessions from both sources (M4) | Activity import flow phase | Test: intercept + API import same session; verify single history entry |
| `cookies` permission warning on update (M5) | Manifest and permissions phase (first phase) | Test: update test install; observe Chrome permission dialog behavior |

---

## Sources

- [Cross-origin network requests — Chrome for Developers](https://developer.chrome.com/docs/extensions/develop/concepts/network-requests) — host_permissions required for service worker cross-origin fetch; prefer `fetch()` over XHR in service workers (HIGH confidence)
- [Extension service worker lifecycle — Chrome for Developers](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle) — 30s inactivity termination, 5-minute operation limit, 30s fetch response timeout; all limits authoritative (HIGH confidence)
- [Longer extension service worker lifetimes — Chrome for Developers](https://developer.chrome.com/blog/longer-esw-lifetimes) — Chrome 110 improvements to idle timer resets; calling any extension API resets the timer (HIGH confidence)
- [Cookie-based Authentication for Chrome Extension MV3 — Borys Melnyk, Medium](https://boryssey.medium.com/cookie-based-authentication-for-your-browser-extension-and-web-app-mv3-4837d7603f54) — credentials:include required; host_permissions required; service worker cookie attachment caveat documented (MEDIUM confidence — community source)
- [Cookies in Service Worker — chromium-extensions Google Group](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/RMUtNEhR0R8) — community-confirmed reports that cookies are not automatically attached in service worker fetch even with credentials:include; workaround is explicit chrome.cookies.getAll + Cookie header (MEDIUM confidence — community, multiple reporters)
- [Declare permissions — Chrome for Developers](https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions) — optional_host_permissions available in MV3; adding required permissions can disable extension for existing users (HIGH confidence)
- [Permission warning guidelines — Chrome for Developers](https://developer.chrome.com/docs/extensions/develop/concepts/permission-warnings) — Chrome compares warning message sets before/after update to determine privilege escalation (HIGH confidence)
- [Optional Host Permissions in Manifest v3 — chromium-extensions Google Group](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/EnUmtHWOI9o) — optional_host_permissions do not trigger disable on update; confirmed behavior (MEDIUM confidence — community source)
- [GraphQL Global Object Identification Specification — Relay](https://relay.dev/graphql/objectidentification.htm) — IDs are opaque; base64 encoding is a convention to remind clients not to parse them (HIGH confidence — official spec)
- [GraphQL response format — graphql.org](https://graphql.org/learn/response/) — HTTP 200 returned even for application-level errors; errors in `errors` array not reflected in status code (HIGH confidence — official spec)
- [Message port closed before response — chromium-extensions community](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/alX5FusNQMI) — popup closing destroys message channel; sendResponse fails silently after popup close (HIGH confidence — confirmed behavior)
- [Trackman Cloud API docs](https://dr-cloud-api-docs-dev.trackmangolfdev.com/graphql/graphql/) — attempted fetch returned 404; Trackman does not publish an open API schema for the portal endpoint (LOW confidence — absence of documentation is itself a finding)

---
*Pitfalls research for: TrackPull v1.6 — Trackman Portal GraphQL Integration with Cookie Auth*
*Researched: 2026-03-26*
*Supersedes v1.5/v1.6-Data-Intelligence PITFALLS.md for this milestone's scope*
