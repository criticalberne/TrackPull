# Codebase Concerns

**Analysis Date:** 2026-03-02

## Tech Debt

**Type Safety in Content Script Interception:**
- Issue: XMLHttpRequest monkey-patching uses multiple `any` type casts in `src/content/interceptor.ts` lines 293-312
- Files: `src/content/interceptor.ts`
- Impact: Runtime errors possible if XHR API changes; harder to refactor; type checker cannot catch issues
- Fix approach: Create strongly-typed wrapper interfaces for XHR modifications; use proper type assertions instead of `any` casts

**Loose Type Casting in Bridge and Service Worker:**
- Issue: Multiple locations use `as Record<string, unknown>` and `as any` to cast data, particularly when handling chrome.storage responses in `src/popup/popup.ts` and `src/background/serviceWorker.ts`
- Files: `src/popup/popup.ts` (lines 90-102), `src/background/serviceWorker.ts` (lines 51-81)
- Impact: Type safety eroded; potential runtime errors if data structure changes; harder to validate input
- Fix approach: Create strict type guards for storage data; validate structure before casting

**Raw JSON Parsing Without Validation:**
- Issue: `tryParseJson()` in `src/content/interceptor.ts` (lines 63-69) accepts any JSON without schema validation
- Files: `src/content/interceptor.ts`
- Impact: Malformed or unexpected API responses could cause silent failures; no clear error messages to user
- Fix approach: Add JSON schema validation; provide specific error types for different failure modes

## Known Issues

**DOM Polling with Hard Timeout:**
- Symptoms: Group tags may not apply if DOM renders slower than 8 seconds on slow connections
- Files: `src/content/interceptor.ts` lines 227-251 (`waitForTagsThenPost` function)
- Trigger: Pages with slow JavaScript execution or resource loading
- Workaround: Manual retry - clear extension data and reload page

**Incomplete Shot Data on Multi-Page Reports:**
- Symptoms: Shot data may be missing metrics if user navigates between metric pages without waiting
- Files: `src/content/html_scraping.ts`, `src/models/types.ts` (mergeSessionData)
- Trigger: Rapidly clicking between metric group tabs on Trackman report
- Workaround: Re-visit the report after all metrics have loaded

**CSV Generation Silent Failures:**
- Symptoms: Export button shows success but no file downloaded
- Files: `src/background/serviceWorker.ts` lines 85-101
- Trigger: Browser download settings block data: URIs, or storage quota exceeded
- Current mitigation: Error message shown to user via `getDownloadErrorMessage()`, but error may be generic

## Security Considerations

**Content Script Monkey-Patching:**
- Risk: Intercepting fetch/XMLHttpRequest on any page exposes shot data to DOM inspection
- Files: `src/content/interceptor.ts` lines 273-317
- Current mitigation: Data is immediately posted via `window.postMessage` to isolated bridge context; console logging only (not stored in window)
- Recommendations:
  - Add CSP headers to manifest (already recommended in manifest.json but verify enforcement)
  - Clear sensitive data from memory after posting
  - Monitor for XSS attacks that could intercept postMessage

**PostMessage with Wildcard Origin:**
- Risk: Bridge listens to postMessage from any origin (`window.postMessage(..., "*")` in `src/content/interceptor.ts` line 212)
- Files: `src/content/interceptor.ts` line 212
- Current mitigation: Bridge validates `event.source === window` and `event.data.source === "trackpull-interceptor"` in `src/content/bridge.ts` lines 8-10
- Recommendations: Origin wildcard is safe here since bridge validates source, but consider explicit origin for clarity

**Storage of Unencrypted Session Data:**
- Risk: chrome.storage.local stores raw SessionData without encryption
- Files: `src/background/serviceWorker.ts`, storage via `STORAGE_KEYS.TRACKMAN_DATA`
- Current mitigation: Chrome extension storage is isolated per-extension and per-profile
- Recommendations: Session data expires when user clears extension data; consider automatic session clear after 24h

## Performance Bottlenecks

**DOM Polling Every 300ms:**
- Problem: `waitForTagsThenPost()` polls DOM for `.group-tag` elements every 300ms for up to 8 seconds
- Files: `src/content/interceptor.ts` lines 226-251
- Cause: No MutationObserver or DOM change detection; relying on interval polling
- Improvement path: Replace polling with MutationObserver; reduce wake-ups from 27+ checks to 1-2 actual DOM changes

**Large HTML Table Parser Iterations:**
- Problem: `extract_club_and_metrics()` iterates through all rows multiple times (header detection, shot rows, averages, consistency)
- Files: `src/shared/html_table_parser.ts` lines 337-473
- Cause: Separate passes for different row types instead of single traversal
- Improvement path: Single-pass parser that identifies row types during initial DOM traversal

**CSV String Concatenation:**
- Problem: CSV generation uses string concatenation in loop (line 188-199 in `src/shared/csv_writer.ts`)
- Files: `src/shared/csv_writer.ts`
- Cause: Array.join() would be more efficient but current approach is readable
- Improvement path: Use array buffer for very large datasets (100+ shots); current performance is acceptable for typical use

## Fragile Areas

**Trackman API Response Detection:**
- Files: `src/content/interceptor.ts` lines 43-61 (`containsStrokegroups`)
- Why fragile: Relies on heuristic keyword matching (3+ of: "ballspeed", "clubspeed", "carry", "spinrate", "strokegroups", "strokes", "measurement")
- Safe modification: Add unit tests for edge cases; consider using response URL matching as primary indicator
- Test coverage: Covered by basic detection tests but not comprehensive edge case testing

**DOM Selector Dependencies:**
- Files: Multiple files use CSS selectors from `src/shared/constants.ts`
- Why fragile: If Trackman redesigns their report page HTML, all selectors break simultaneously
- Safe modification: Add feature detection to warn user if selectors fail; provide fallback parsing
- Test coverage: No integration tests against live Trackman site; only isolated DOM parsing tests

**Metric Name Mapping:**
- Files: `src/shared/constants.ts` lines 6-37 and `METRIC_COLUMN_ORDER` in `src/shared/csv_writer.ts` lines 16-33
- Why fragile: Hard-coded metric lists must stay in sync with Trackman API field names
- Safe modification: Add runtime warning if encountered metrics don't match known list; include unknown metrics in CSV
- Test coverage: Unit test for known metrics but no test for unknown metric handling

**Unit System Detection:**
- Files: `src/shared/unit_normalization.ts` lines 186-191 (`getUnitSystemId`)
- Why fragile: Defaults to Imperial (789012) if nd_001 parameter missing; may incorrect for metric units
- Safe modification: Add logging when defaulting; consider requiring explicit unit parameter
- Test coverage: Good test coverage for conversion; but no tests for real Trackman API response parsing

## Scaling Limits

**Storage Quota for Large Sessions:**
- Current capacity: Chrome extension storage typically allows 10MB per extension
- Limit: ~200+ sessions at 50KB each (typical session) hits quota
- Scaling path: Implement session archival/export to file; add storage cleanup on export; consider IndexedDB for larger capacity

**Memory Usage of Large Sessions:**
- Current capacity: Reasonable for typical golf sessions (5-20 shots); untested with 100+ shots
- Limit: Large tournament data or multi-day sessions may consume significant memory during merge
- Scaling path: Batch process large sessions; implement streaming CSV writer for export

## Dependencies at Risk

**No Modern Package Manager Scripts:**
- Risk: `package.json` has placeholder test script (`echo "Error: no test specified"`)
- Impact: Easy to forget running vitest; CI/CD integration impossible without custom setup
- Migration plan: Add proper `"test": "vitest run"` script to package.json; add `"build"` script pointing to build-extension.sh

**Vitest Configuration Minimal:**
- Risk: `vitest.config.ts` only specifies include pattern; no browser environment, no jsdom, pure Node.js
- Impact: Can only test unit logic, not DOM/Chrome API interactions; tests don't catch browser-specific bugs
- Migration plan: Add environment configuration for DOM tests (jsdom) as separate test suite; stub Chrome APIs

**TypeScript Version Constraint:**
- Risk: `typescript@^5.9.3` - minor updates could introduce breaking changes
- Impact: Future type safety improvements may require code changes
- Current status: Acceptable for extension development; not critical

## Missing Critical Features

**No Error Recovery for Failed Exports:**
- Problem: If CSV export fails mid-stream, user loses data (must start over)
- Blocks: Reliable data export for critical golf sessions
- Fix: Implement save-to-file fallback using chrome.downloads API with retry; or implement draft-save before export

**No Session Persistence Across Browser Crash:**
- Problem: Unexported session data lost if browser crashes before export
- Blocks: Long sessions risk data loss
- Fix: Add automatic session save to IndexedDB; implement draft recovery on extension reload

**No Multi-Report Session Merging UI:**
- Problem: `mergeSessionData()` exists but has no UI affordance
- Blocks: Users cannot easily combine data from multiple Trackman reports
- Fix: Add "Load additional report" button to popup; show merged session summary

## Test Coverage Gaps

**Content Script Interception Not Tested:**
- What's not tested: Actual fetch/XHR monkey-patching; response cloning and parsing
- Files: `src/content/interceptor.ts` lines 273-317
- Risk: Changes to interception logic could silently break data capture
- Priority: High - core functionality

**Bridge Message Forwarding Not Tested:**
- What's not tested: Cross-context postMessage flow; error handling when service worker unreachable
- Files: `src/content/bridge.ts`
- Risk: Silent data loss if bridge fails
- Priority: High

**Service Worker Message Handling Not Tested:**
- What's not tested: chrome.runtime.onMessage listener; storage.local interactions; CSV export flow
- Files: `src/background/serviceWorker.ts`
- Risk: Export failures not caught; storage corruption possible
- Priority: Medium - tested manually but no automated verification

**Popup UI State Synchronization Not Tested:**
- What's not tested: Popup listening for DATA_UPDATED messages; real-time shot count updates
- Files: `src/popup/popup.ts` lines 58-64
- Risk: UI shows stale data after export or clear
- Priority: Medium

**Real Trackman API Response Parsing Not Tested:**
- What's not tested: Actual API response structure from Trackman; edge cases in StrokeGroups parsing
- Files: `src/content/interceptor.ts` lines 75-174 (parseSessionData)
- Risk: Schema changes at Trackman could break parsing without detection
- Priority: Medium - covered by unit tests on mock data but no integration tests

**Error Scenarios Not Covered:**
- What's not tested: Malformed API responses; missing required fields; null/undefined handling in shot data
- Files: Multiple files handle data defensively but no explicit error case testing
- Risk: Silent data loss or incomplete CSV generation
- Priority: Medium

---

*Concerns audit: 2026-03-02*
