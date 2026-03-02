# Pitfalls Research

**Domain:** Chrome extension data scraping (Trackman golf reports)
**Researched:** 2026-03-02
**Confidence:** HIGH for Chrome extension mechanics (official docs verified); MEDIUM for Trackman-specific API stability (no official API docs; inferred from existing scraper behavior)

---

## Critical Pitfalls

### Pitfall 1: Trackman Renames CSS Classes, Breaking the HTML Fallback Scraper

**What goes wrong:**
The HTML fallback scraper (html_scraping.ts) targets hardcoded CSS class names like `player-and-results-table-wrapper`, `ResultsTable`, `parameter-names-row`, `row-with-shot-details`, and `group-tag`. These are defined in constants.ts and used throughout. Trackman's frontend is a React SPA (confirmed: uses create-react-app). React SPAs frequently rename or hash CSS classes during routine frontend refactors or dependency upgrades — without any public changelog. When this happens, the HTML fallback silently returns empty data rather than throwing a visible error, so users see a 0-shot export without knowing why.

**Why it happens:**
Developers assume CSS class names on third-party sites are stable. They rarely are on React SPAs. Trackman has no obligation to maintain scraper-compatible markup. The existing code hard-codes 8+ CSS class names with no version guard or detection mechanism.

**How to avoid:**
- Before implementing any feature that touches HTML scraping, verify the current class names against live Trackman pages.
- Add a health-check log on extension load that confirms at least one expected CSS selector matches a real DOM element. If none match, log a warning the user can see in the popup.
- Consider targeting structural HTML attributes (ARIA roles, data attributes) or element hierarchy over class names where possible, as these change less frequently.
- Document which class names were verified on what date inside constants.ts.

**Warning signs:**
- HTML fallback path returns 0 shots while API interception returns data (class names changed but API still works).
- Both paths return 0 shots (more severe: API response shape may have also changed).
- Users reporting "no data captured" after a Trackman site update with no extension change on our side.

**Phase to address:**
Any phase that adds HTML fallback features or new CSS selectors. All new CSS selector additions should be verified against the live site before merging. Adding a DOM health-check should be a task in the first implementation phase.

---

### Pitfall 2: Trackman Changes the StrokeGroups JSON Schema, Breaking API Interception

**What goes wrong:**
The interceptor.ts parser deeply assumes the API response shape: `StrokeGroups` array, each with `Club`, `Strokes` array, each stroke with `NormalizedMeasurement` and `Measurement` objects. If Trackman renames any of these keys or nests them differently (e.g., introducing a wrapper object), `parseSessionData` returns `null` silently. The extension appears to work (no error) but captures nothing. This is harder to detect than a CSS class change because nothing in the UI signals the failure.

**Why it happens:**
The API is undocumented and private. The existing parser was built by reverse-engineering responses — a snapshot in time. Trackman could reshape the API for new frontend features (e.g., adding new data categories, restructuring for GraphQL) with no notice.

**How to avoid:**
- Add a diagnostic log after each intercepted response indicating whether `containsStrokegroups()` returned true or false, so failures are visible in the console without user action.
- When adding new metrics or new data sources, always inspect the live API response shape first (`Read` the actual JSON, don't assume). This is already stated in CLAUDE.md but worth reinforcing.
- The existing `containsStrokegroups()` heuristic (checking for 3+ indicator strings) provides a useful early-warning layer — keep it and extend it if new response shapes are added.
- Consider logging the raw response structure (not full data) when `containsStrokegroups()` is true but `parseSessionData()` returns null, to make debugging faster.

**Warning signs:**
- `TrackPull: Shot data detected in:` log appears (containsStrokegroups passed) but no subsequent `SessionData posted to bridge` log.
- Shot count in popup shows 0 despite navigating a report page.
- The metric key set in `METRIC_KEYS` begins missing values that Trackman has clearly displayed on screen.

**Phase to address:**
Every phase touching metric parsing. Any phase adding new data fields must begin with live API inspection, not assumptions from training data or existing code.

---

### Pitfall 3: Service Worker Terminates During Data Capture, Losing In-Flight Session Data

**What goes wrong:**
Chrome MV3 service workers terminate after ~30 seconds of inactivity (confirmed by official Chrome docs). The current architecture stores session data in `chrome.storage.local` synchronously when `SAVE_DATA` is received, which is safe. But if the service worker is idle and the interceptor fires (page loaded, API response captured), the bridge sends `chrome.runtime.sendMessage` to the service worker. If the worker isn't running, it must cold-start. During that cold-start gap, the message may be dropped. The `chrome.runtime.lastError` in bridge.ts catches this — but the shot data is then lost with no retry.

**Why it happens:**
MV3 service workers are not persistent background pages. This is a fundamental MV3 architectural constraint. The bridge has no retry or queue mechanism. When the service worker is warming up, messages sent during that window fail silently from the user's perspective.

**How to avoid:**
- When adding any new feature that depends on message passing from content script to service worker, test the cold-start scenario: navigate directly to a Trackman report URL without first opening the popup (which would wake the worker).
- If a new feature requires reliable message delivery, implement a retry loop in the bridge: catch `lastError`, wait 200ms, retry up to 3 times before giving up.
- Never store ephemeral state in service worker module-level variables — always read from `chrome.storage.local`.
- Register all `chrome.runtime.onMessage` listeners synchronously at module top-level (not inside callbacks) so they survive worker restarts. The existing code already does this correctly; new features must not break this pattern.

**Warning signs:**
- `TrackPull bridge: sendMessage failed` logs appearing in console on first page load after browser idle.
- Users reporting intermittent "no data" on the first report they open in a browser session.
- Shot count stays at 0 until user opens the popup (which wakes the service worker) and then refreshes the page.

**Phase to address:**
Any phase that adds new message types between content scripts and the service worker. Cold-start resilience should be a success criterion for those phases.

---

### Pitfall 4: Building Without Committing dist/, Then Releasing Stale Built Artifacts

**What goes wrong:**
`dist/` is tracked in git (deliberate project decision — documented in CLAUDE.md and project memory). This means the release is whatever is in `dist/` at commit time. If a developer makes source changes, forgets to run `bash scripts/build-extension.sh`, and commits only the TypeScript source files, the released extension is the old build. Users installing from the release zip get the previous version's behavior. This is especially dangerous when fixing bugs — the fix appears merged but the distribution is unaffected.

**Why it happens:**
There is no automated pre-commit hook or CI enforcing that `dist/` matches the source. The build step is manual. The project memory documents it, but it's easy to forget under time pressure.

**How to avoid:**
- Every phase task list that modifies TypeScript source must end with: run `npx vitest run`, run `bash scripts/build-extension.sh`, verify output in `dist/`, then commit with both source and dist changes in the same commit.
- Consider adding a simple check: if any `.ts` file in `src/` is newer than the corresponding `.js` in `dist/`, warn before any `gh release create`.
- Make "rebuild and verify dist" an explicit success criterion in every implementation phase.

**Warning signs:**
- `dist/*.js` timestamps are older than `src/*.ts` timestamps after a source change.
- Git diff shows only `.ts` changes with no corresponding `.js` changes in `dist/`.
- A release tag exists but the reported version in the extension popup doesn't match the commit.

**Phase to address:**
Every phase. Make it the last step in every task list involving source file changes.

---

## Moderate Pitfalls

### Pitfall 5: postMessage Race Between MAIN World Interceptor and ISOLATED World Bridge

**What goes wrong:**
Both `interceptor.js` (MAIN world) and `bridge.js` (ISOLATED world) are injected at `document_start`. The interceptor sends data via `window.postMessage`; the bridge listens via `window.addEventListener("message")`. If the interceptor fires before the bridge's listener is registered (possible in edge cases where the ISOLATED world script is slightly delayed), the message is never received. The current architecture doesn't have a handshake or queuing mechanism between the two worlds.

**Why it happens:**
`document_start` injection ordering between MAIN and ISOLATED world scripts is not strictly guaranteed to be synchronous. Chrome's documentation notes that script execution order within a single world is guaranteed but cross-world ordering has implicit dependencies on the extension's internal scheduling.

**How to avoid:**
- When adding any new message types between the interceptor and bridge, test on cold page loads and on hard refresh (Cmd+Shift+R) where script timing is tightest.
- Do not add synchronous initialization logic in the interceptor that fires messages before the DOM is even partially ready — the existing `waitForTagsThenPost` + polling pattern provides adequate delay for most cases.
- If a new feature needs guaranteed delivery of MAIN-to-ISOLATED messages, consider a heartbeat or acknowledgment pattern: interceptor retries `postMessage` if no `ACK` arrives within 100ms.

**Warning signs:**
- `TrackPull: bridge content script loaded` does not appear in console for a page load that did capture data.
- `TrackPull bridge: forwarding shot data to service worker` never fires despite interceptor confirming data was posted.

**Phase to address:**
Any phase adding new cross-world communication. Test in clean browser profiles where extension has no warm state.

---

### Pitfall 6: chrome.storage.local Quota Exceeded Silently Drops Save

**What goes wrong:**
`chrome.storage.local` has a 10 MB default quota (5 MB in Chrome 113 and earlier — confirmed by official Chrome docs). The current `SAVE_DATA` handler checks `chrome.runtime.lastError` and logs to console, but returns `{ success: false }` to the bridge, which ignores this response. If a session is large (many clubs, many shots, many metrics), the save silently fails. The popup still shows 0 shots because storage has no data, but no user-visible error appears.

**Why it happens:**
A single Trackman session is probably well under 10 MB. But if a future feature adds `raw_api_data` storage (the `SessionData` type already has this field), or if multi-session aggregation is added, the payload could grow unexpectedly. The `unlimitedStorage` permission is not currently requested in manifest.json.

**How to avoid:**
- When adding any feature that expands the data stored per session (new fields, raw API capture, historical sessions), estimate the storage cost first. A session with 300 shots × 29 metrics × ~10 bytes per value = ~87 KB — well within limits for single sessions.
- If adding multi-session history, request `unlimitedStorage` in manifest.json proactively and add explicit quota error handling with a user-visible popup message.
- Do not store raw API response blobs (`raw_api_data` field in SessionData) in production unless necessary — they can be megabytes.

**Warning signs:**
- `TrackPull: Failed to save data:` in service worker console.
- `chrome.runtime.lastError` containing "QUOTA_BYTES quota exceeded".
- Shot count shows 0 after what appeared to be a successful capture.

**Phase to address:**
Any phase adding multi-session storage, historical data, or raw API response persistence.

---

### Pitfall 7: New Metric Added to Trackman Not Captured Because METRIC_KEYS is a Closed Set

**What goes wrong:**
`interceptor.ts` has an explicit `METRIC_KEYS` Set. Any metric key not in this set is dropped during parsing. If Trackman introduces new ball-flight metrics (e.g., `SpinDecay`, `CarryEfficiency`), they are silently ignored even if present in the API response. The existing code also mirrors `ALL_METRICS` in `constants.ts`, creating two places that must be updated in sync.

**Why it happens:**
The allow-list was a conscious design choice (filter noise from the API), but it creates a maintenance burden. Every Trackman product update that adds metrics requires a code change. The Golf Simulator Forum search result confirms Trackman announced new data points at the 2025 PGA Show, suggesting this is an active risk.

**How to avoid:**
- When adding features or after any Trackman product announcement, inspect live API responses to check if new keys appear in `Measurement` or `NormalizedMeasurement` that aren't in `METRIC_KEYS`.
- Consider making the allow-list user-configurable or adding a "capture all numeric metrics" debug mode that bypasses the allow-list.
- If `METRIC_KEYS` in interceptor.ts and `ALL_METRICS` in constants.ts are ever out of sync, data will be captured but not exported in the CSV. Keep them synchronized — treat them as a single source of truth.

**Warning signs:**
- Trackman UI displays a metric value on screen that does not appear in the exported CSV.
- Trackman PGA Show or app update notes mention new data categories.

**Phase to address:**
Any phase adding new metric support. Always update both `METRIC_KEYS` (interceptor.ts) and `ALL_METRICS` (constants.ts) together.

---

### Pitfall 8: Adding New Permissions to manifest.json Disables the Extension for Existing Users

**What goes wrong:**
If a new feature requires new Chrome permissions beyond the current set (`storage`, `downloads`, `host_permissions` for trackmangolf.com), adding them to `manifest.json` triggers Chrome's privilege escalation check on extension update. Chrome disables the extension and shows users a permission re-approval prompt. Users who don't notice miss the prompt and have a broken extension until they manually re-enable it. The Chrome Web Store is not involved here (this is a direct-install extension via dist/), but the same Chrome behavior applies.

**Why it happens:**
Developers add permissions without thinking about the update path. This applies to both API permissions (`tabs`, `scripting`, etc.) and new host_permissions patterns.

**How to avoid:**
- Before adding any new `manifest.json` permission, ask: is this truly required? Can the existing `storage` and `downloads` permissions cover the use case?
- If a new permission is optional (e.g., access to another golf platform domain), use `optional_permissions` or `optional_host_permissions` rather than baking it into the required manifest. Optional permissions don't trigger re-approval on update.
- Document in the phase plan which permissions are being added and why, so it's a deliberate decision rather than an oversight.

**Warning signs:**
- A new feature requires `tabs`, `activeTab`, `scripting`, `webRequest`, or a new origin pattern.
- Reviewing the manifest diff before a release and seeing new entries in `permissions` or `host_permissions`.

**Phase to address:**
Any phase that introduces new capabilities outside the existing feature set (especially multi-tab or multi-domain features).

---

## Minor Pitfalls

### Pitfall 9: response.clone() on Large Responses Doubles Memory Consumption

**What goes wrong:**
`interceptor.ts` clones every intercepted fetch response (`response.clone()`) to read the body without consuming the original. For large API responses, this doubles the memory footprint for the duration of body reading. Trackman's StrokeGroups responses for large sessions (300+ shots across 15 clubs) can be several hundred KB. If a future feature intercepts additional Trackman endpoints (video data, image data, or other binary resources), the clone pattern would be applied to every response including large ones.

**How to avoid:**
Verify that the `containsStrokegroups()` URL filter is applied before cloning responses. The existing code applies it after cloning — consider filtering by URL prefix first. For any new intercepted endpoint, add URL-based filtering as the first guard before cloning.

**Warning signs:**
Chrome's Task Manager shows elevated memory for the extension process compared to baseline.

**Phase to address:**
Any phase adding new intercepted endpoints or capturing new response types.

---

### Pitfall 10: Tests Run Against TypeScript Source But Extension Runs Built Artifacts

**What goes wrong:**
Vitest runs against `src/*.ts` directly. The built `dist/*.js` files (produced by esbuild IIFE bundling) could behave differently — particularly around scope, module resolution, or edge cases in esbuild's TypeScript-to-JS transpilation. A test can pass while the built extension fails. This gap is the same reason the project mandate says to always rebuild and verify after source changes.

**How to avoid:**
When a bug only reproduces in the extension but not in unit tests, suspect build-artifact differences before assuming test environment issues. After any non-trivial refactor, do a manual smoke test on the built extension loaded into Chrome (not just vitest).

**Warning signs:**
`npx vitest run` passes but loading the extension into Chrome produces runtime errors in the DevTools console.

**Phase to address:**
Every phase. Add "load built extension into Chrome and verify basic capture flow" to the manual verification steps for any implementation phase.

---

### Pitfall 11: Group Tag Timing Assumption Breaks When Trackman Changes Render Timing

**What goes wrong:**
`waitForTagsThenPost` polls for `.group-tag` elements every 300ms for up to 8 seconds. If Trackman changes how or when these elements render (e.g., lazy-loading, deferred hydration, or server-side rendering), the poll could timeout and post data without tags. Tags are the human-readable club labels that make the CSV meaningful — without them, shots are labeled with raw API club strings that may be internal codes rather than user-facing names.

**How to avoid:**
When testing any change that touches timing (React lazy-loading, pagination, SPA routing changes on Trackman's side), verify that group tags are still being applied in the exported CSV. Look for shots with `tag: undefined` in the posted session data as a diagnostic signal.

**Warning signs:**
- CSV exports show raw club codes instead of human-readable names like "D1 SW".
- Console shows `No .group-tag elements found in DOM` after a Trackman UI update.

**Phase to address:**
Any phase modifying DOM scraping timing or adding new tag types.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcoded CSS class names in constants.ts | Simple, readable code | Breaks silently when Trackman refactors frontend | Only with a DOM health-check that alerts when selectors stop matching |
| Closed `METRIC_KEYS` allow-list | Prevents capturing noise fields | Misses new metrics Trackman adds | Add a "capture all numeric" debug mode to detect new fields without shipping them |
| `dist/` tracked in git without pre-commit build enforcement | Simple release process | Stale artifacts shipped if build step is forgotten | Acceptable only if every phase task list includes rebuild as an explicit final step |
| No retry on bridge `sendMessage` failure | Simpler code | Lost data on service worker cold-start | Never for production; add retry for any new critical message type |
| No user-visible error when `SAVE_DATA` fails | Less UI surface | Users see 0 shots with no explanation | Never; add at minimum a console warning that the popup can surface |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Trackman fetch API | Assuming `NormalizedMeasurement` always contains all metrics | Check both `Measurement` and `NormalizedMeasurement`; the existing merge (`...raw, ...normalized`) is correct — preserve it |
| Trackman HTML DOM | Querying selectors before React has hydrated the component | Use MutationObserver or polling (existing pattern); do not query at `document_start` |
| chrome.storage.local | Not checking `chrome.runtime.lastError` after every write | Always check in callback; the existing code does this, new code must too |
| chrome.runtime.sendMessage | Sending from content script when service worker hasn't started | Handle `Could not establish connection` lastError; do not treat it as fatal without retry |
| esbuild IIFE output | Assuming TypeScript types catch all runtime issues | IIFE bundles can have subtle differences from ESM source; always smoke-test the built artifact |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Cloning all intercepted responses regardless of content | High memory usage during page load | Filter by URL before cloning; skip non-JSON content types | Any session with large non-JSON responses (images, video) being intercepted |
| JSON.stringify in `containsStrokegroups()` on large objects | CPU spike during API response handling | Keep the heuristic fast; the existing 3-indicator check is good; do not add full-object traversal | API responses larger than ~1 MB |
| Polling DOM every 300ms for up to 8 seconds | Minor but constant DOM queries during page load | Current limit is acceptable; do not increase MAX_WAIT or decrease POLL_INTERVAL without measuring impact | Not a current concern at current session sizes |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Validating `event.source === window` but not `event.origin` in bridge.ts | Malicious page scripts could theoretically spoof `trackpull-interceptor` messages | The `source` check provides meaningful protection; add `event.origin === location.origin` for defense-in-depth when extending bridge message types |
| Storing sensitive user data in `chrome.storage.local` without considering extension's public install model | Other extensions with storage access could theoretically read shot data | Not currently a threat (extension is direct-install, not Web Store published), but avoid storing authentication tokens or personal data beyond the shot metrics themselves |
| Using `window.postMessage("*")` as target origin | Any frame on the page receives the message | Acceptable for same-origin SPA pages; if Trackman ever embeds third-party iframes, tighten to specific origin |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Popup shows "0 shots" with no explanation when capture fails | User doesn't know if extension is broken or no data exists yet | Add a status indicator: "Waiting for data", "Capture failed — see console", "N shots ready" |
| CSV downloads with internal clock API names (no group tags) | Useless file — user can't tell which club is which | Log when tags are missing; consider including the raw `Club` API field as a fallback column |
| No feedback when a new Trackman UI update breaks scraping | Silent failure — user keeps trying, gets nothing | Add a DOM health-check on page load that logs a clear warning if expected selectors are missing |

---

## "Looks Done But Isn't" Checklist

- [ ] **New metric field added:** Verify it exists in both `METRIC_KEYS` (interceptor.ts) AND `ALL_METRICS` (constants.ts) AND has a display name in `METRIC_DISPLAY_NAMES` — all three must be updated together.
- [ ] **New CSS selector added:** Verify it matches elements on the current live Trackman site, not just the last-seen version.
- [ ] **New service worker message type:** Verify the listener is registered synchronously at module top level, not inside a callback.
- [ ] **Source files changed:** Verify `bash scripts/build-extension.sh` ran, `dist/` files have newer timestamps than `src/` files, and `npx vitest run` passes.
- [ ] **New manifest permission added:** Verify whether it will trigger Chrome's privilege escalation and disable the extension on update. If yes, consider `optional_permissions` instead.
- [ ] **HTML fallback modified:** Manually verify with an actual Trackman report page that data is captured correctly, not just that unit tests pass.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Trackman CSS class rename breaking HTML fallback | LOW | Inspect live DOM, update constants.ts with new class names, rebuild, release patch |
| Trackman API JSON schema change breaking interceptor | MEDIUM | Inspect live network traffic in DevTools, update parseSessionData(), update METRIC_KEYS if fields renamed, rebuild, release patch |
| Stale dist/ released | LOW | Rebuild, bump patch version, create new release, notify users |
| Service worker cold-start dropping messages | MEDIUM | Add retry loop to bridge.ts, rebuild, release patch |
| chrome.storage.local quota exceeded | LOW | Add unlimitedStorage permission to manifest, rebuild, release patch (will require user re-approval if quota is in `permissions` array — it is not, so no re-approval needed) |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Trackman CSS class rename | Every phase touching html_scraping.ts | Manually verify selectors on live Trackman site before merge |
| Trackman API schema change | Every phase touching interceptor.ts or metric parsing | Inspect live API response JSON before implementing; log parse failures |
| Service worker cold-start drops | Any phase adding new message types | Test with cold browser profile, no popup pre-opened |
| Stale dist/ in release | Every phase | Confirm dist/ timestamp is newer than src/ timestamps before committing |
| New permission breaks update | Any phase adding manifest.json entries | Review manifest diff in PR; confirm no new required permissions |
| METRIC_KEYS out of sync | Any phase adding metrics | Unit test that METRIC_KEYS and ALL_METRICS contain identical entries |
| Group tag timing | Any phase touching DOM scraping timing | Verify tags appear in CSV after smoke test on live site |
| Storage quota | Any phase adding data storage breadth | Estimate payload size before shipping; test with large session |

---

## Sources

- [Chrome Extension Content Scripts — official docs](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts) — MAIN/ISOLATED world mechanics, API access limits
- [chrome.storage API reference — official docs](https://developer.chrome.com/docs/extensions/reference/api/storage) — 10 MB quota limit, lastError behavior (HIGH confidence)
- [Service Worker Lifecycle — official docs](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle) — idle termination, cold-start behavior (HIGH confidence)
- [Declare Permissions — official docs](https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions) — privilege escalation on update, optional_permissions pattern (HIGH confidence)
- [Intercepting Network Requests in Chrome Extensions](https://rxliuli.com/blog/intercepting-network-requests-in-chrome-extensions/) — response.clone() memory patterns (MEDIUM confidence)
- [How We Captured AJAX Requests with a Chrome Extension — Moesif Blog](https://www.moesif.com/blog/technical/apirequest/How-We-Captured-AJAX-Requests-with-a-Chrome-Extension/) — XHR monkey-patching pitfalls (MEDIUM confidence)
- [ServiceWorker is shut down every 5 minutes — Chromium Issue Tracker](https://issues.chromium.org/issues/40733525) — real-world service worker termination (MEDIUM confidence)
- [Smart Site Detection and Dynamic CSS Selector Generation — Medium](https://medium.com/@yukselcosgun/smart-site-detection-and-dynamic-css-selector-generation-for-resilient-scraping-ba8a5ba6ce26) — dynamic class name risks (MEDIUM confidence)
- [Trackman Golf at the 2025 PGA Show — Golf Simulator Forum](https://golfsimulatorforum.com/forum/trackman/412080-trackman-golf-at-the-2025-pga-show-new-data-points-software-features) — evidence of active metric expansion (LOW confidence; indirect)
- Project source code inspection: `src/content/interceptor.ts`, `src/content/bridge.ts`, `src/background/serviceWorker.ts`, `src/shared/constants.ts`, `src/manifest.json` (HIGH confidence — direct inspection)

---
*Pitfalls research for: Chrome extension data scraping (TrackPull / Trackman golf reports)*
*Researched: 2026-03-02*
