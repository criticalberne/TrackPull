# Trackman Scraper → Chrome Extension - Task List

This PRD is a task list for rewriting the working Python Trackman scraper into a usable Chrome extension. Tasks are micro-scoped for reliable execution.

## Best Practice: Micro-Tasks
Break large tasks into micro-tasks. Smaller tasks = better code quality.

**Bad:** `- [ ] Implement report parsing`

**Good:**
```md
- [x] Capture JSON responses on report pages
- [x] Detect payloads containing StrokeGroups
- [x] Parse NormalizedMeasurement (fallback to Measurement)
- [x] Map metrics to CSV columns
```

## Project Setup
- [x] Audit current repo structure and document required build outputs for a loadable MV3 extension
- [x] Create a `build/` (or `dist/`) output that contains only compiled JS/HTML/CSS + assets
- [x] Ensure no TypeScript sources are referenced directly by the manifest

## Build Pipeline
- [x] Build pipeline: emit JS bundle for `src/background/serviceWorker.ts`
- [x] Build pipeline: emit JS bundle for `src/content/interceptor.ts`
- [x] Build pipeline: emit JS bundle for `src/popup/popup.ts`
- [x] Build pipeline: ensure popup HTML references bundled JS (not TS)
- [x] Build pipeline: ensure icons and static assets are copied into the build output
- [x] Build pipeline: confirm build output is loadable in Chrome (no TS sources)

## Manifest & MV3 Compliance
- [x] Manifest: point `background.service_worker` to built JS
- [x] Manifest: point `content_scripts[*].js` to built JS (verified: manifest references interceptor.js which is built by esbuild)
- [x] Manifest: point `action.default_popup` to built popup HTML (verified: manifest references popup.html which is copied to dist/)
- [x] Permissions: add `https://web-dynamic-reports.trackmangolf.com/*` to `host_permissions`
- [x] Content scripts: include `https://web-dynamic-reports.trackmangolf.com/*` in `matches`
- [x] CSP: remove Tailwind CDN usage and bundle CSS locally (using src/shared/styles.css)
- [x] Permissions: verify minimal set (`storage`, `downloads`)

## URL Parsing & Report Context
- [x] Parse report URL to extract `r=`, `a=`, or `ReportId=` identifiers
- [x] Parse `mp[]` query parameters to define CSV column order
- [x] Parse `sgos[]` query parameters for shot-group filtering
- [x] Capture report metadata params (`nd_*`, `u`, `v`, `ot`, `ov`, etc.) for CSV metadata/filename

## API Interception (Primary Data Source)
- [x] Ensure interceptor runs in the page context (main world or injected script)
- [ ] Capture JSON responses on report pages
- [ ] Detect candidate payloads containing `StrokeGroups` (plus heuristic fallback)
- [ ] Parse `StrokeGroups -> Strokes -> NormalizedMeasurement` (fallback `Measurement`)
- [ ] Extract scalar metric fields using the Python `_METRIC_KEYS`
- [ ] Build session data (club groups, shots, averages)
- [ ] Filter shots by `sgos[]` if payload includes shot-group IDs
- [ ] Store raw payload for debugging when parsing fails

## HTML Scraping (Fallback)
- [ ] Implement HTML table scraping based on Python CSS selectors
- [ ] Extract club name, metric headers, and shot rows
- [ ] Extract averages and consistency rows
- [ ] Merge multi-page metric groups into a single dataset

## CSV Export
- [ ] Use `mp[]` to enforce CSV column order
- [ ] Map metric names to display labels (Python `METRIC_DISPLAY_NAMES`)
- [ ] Include core columns: Date, Report ID, Club, Shot #, Type
- [ ] Include Tag column if present in payload
- [ ] Ensure values align with report units/normalization params
- [ ] Export via Chrome Downloads API

## Extension Storage + Popup UX
- [ ] Align storage keys between background and popup
- [ ] Update real-time shot count in popup
- [ ] Export button triggers CSV generation
- [ ] Clear button clears session data
- [ ] Show toast for capture/export errors

## Testing & Quality
- [x] Unit test: URL parsing for `r`, `a`, `ReportId`
- [x] Unit test: `mp[]` ordering preserved
- [ ] Unit test: `sgos[]` filtering
- [ ] Unit test: API payload parsing with captured JSON
- [ ] Unit test: CSV column ordering
- [ ] Integration test: mock payload → CSV snapshot
- [ ] Manual smoke: extension loads in Chrome without console errors

## Packaging & Release
- [ ] Build production zip containing only extension assets
- [ ] Update README with unpacked install steps and report URL usage
- [ ] Add screenshots for release readiness

