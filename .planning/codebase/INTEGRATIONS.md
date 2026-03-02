# External Integrations

**Analysis Date:** 2026-03-02

## APIs & External Services

**Trackman Golf Reporting API:**
- Service: Trackman shot data API
- What it's used for: Fetch golf swing metrics and shot telemetry data
  - API Host: `web-dynamic-reports.trackmangolf.com`
  - Multiple API patterns captured: `/api/`, `/reports/`, `/activities/`, `/shots/`, `/graphql`
  - SDK/Client: Native Chrome fetch/XMLHttpRequest interception
  - Auth: Inherited from browser session (cookie-based)

**Method of Integration:**
- `src/content/interceptor.ts` - Monkey-patches `window.fetch` and `XMLHttpRequest` to intercept API responses
- Listens for JSON responses containing `StrokeGroups` array with shot data
- Captures metrics: ClubSpeed, BallSpeed, SmashFactor, AttackAngle, ClubPath, FaceAngle, FaceToPath, SwingDirection, DynamicLoft, SpinRate, SpinAxis, SpinLoft, LaunchAngle, LaunchDirection, Carry, Total, Side, SideTotal, CarrySide, TotalSide, Height, MaxHeight, Curve, LandingAngle, HangTime, LowPointDistance, ImpactHeight, ImpactOffset, Tempo
- Response format: JSON with `StrokeGroups` array containing `Club`, `Strokes` with `Measurement` and `NormalizedMeasurement` objects

## Data Storage

**Databases:**
- None (no external database)

**Browser Storage (Chrome Extension API):**
- Storage: `chrome.storage.local` (persistent local browser storage)
  - Client: Native Chrome Storage API
  - Keys used (from `src/shared/constants.ts`):
    - `trackmanData` - Serialized SessionData (shot data, club groups, metrics)
    - `speedUnit` - User's selected speed unit preference (mph, kph, m/s)
    - `distanceUnit` - User's selected distance unit preference (yards, meters, feet, inches, cm)
    - Legacy key: `unitPreference` (migrated to separate speed/distance keys)

**File Storage:**
- Local filesystem only via Chrome Downloads API
- `chrome.downloads.download()` - Exports CSV files to user's Downloads folder
  - Data-URI format: `data:text/csv;charset=utf-8,{encodeURIComponent(csvContent)}`
  - Filename pattern: `ShotData_{date}.csv`

**Caching:**
- None (no external caching service)

## Authentication & Identity

**Auth Provider:**
- Custom/Session-based
  - Implementation: Inherits browser authentication to Trackman
  - No explicit auth tokens managed by extension
  - Relies on user being logged into `web-dynamic-reports.trackmangolf.com` in Chrome

## Monitoring & Observability

**Error Tracking:**
- None (no external error tracking service)

**Logs:**
- Browser console logging via `console.log()` and `console.error()`
- No centralized log aggregation
- Messages prefixed with "TrackPull:" for identification

## CI/CD & Deployment

**Hosting:**
- GitHub releases (repository: `criticalberne/TrackPull`)
- Chrome Web Store (assumed, standard distribution channel)

**CI Pipeline:**
- None detected (no GitHub Actions, CircleCI, etc. configured)
- Manual build and release process

## Environment Configuration

**Required env vars:**
- None (extension uses no environment variables)

**Configuration Files:**
- `src/manifest.json` - Extension manifest (permissions, host restrictions)
- User preferences stored in Chrome storage, not config files

**Secrets location:**
- No secrets management (extension uses session-based auth inherited from browser)
- All sensitive data stays in browser (Chrome storage.local is sandboxed)

## Webhooks & Callbacks

**Incoming:**
- None (extension does not expose incoming webhooks)

**Outgoing:**
- None (extension makes only read requests to Trackman API)

## Cross-Domain Communication

**Content Script Messaging:**
- `src/content/interceptor.ts` (MAIN world) posts to `src/content/bridge.ts` (ISOLATED world) via `window.postMessage()`
  - Message format: `{ type: "TRACKMAN_SHOT_DATA", source: "trackpull-interceptor", data: SessionData }`
- Bridge forwards to service worker via Chrome messaging API

**Service Worker Communication:**
- `src/background/serviceWorker.ts` receives messages via `chrome.runtime.onMessage`
  - Message types:
    - `GET_DATA` - Retrieve stored session data
    - `SAVE_DATA` - Store session data from content scripts
    - `EXPORT_CSV_REQUEST` - Generate and download CSV
  - Popup (`src/popup/popup.ts`) sends/receives messages

**Storage Events:**
- `chrome.storage.onChanged` - Service worker listens for storage changes and broadcasts via `chrome.runtime.sendMessage()`
- Popup receives `DATA_UPDATED` messages when data changes

## Data Flow

1. User navigates to Trackman report page (`https://web-dynamic-reports.trackmangolf.com/*`)
2. Content scripts inject and intercept API calls
3. `interceptor.ts` captures JSON responses containing `StrokeGroups`
4. Parses shot metrics and waits for DOM to render `.group-tag` elements
5. `html_scraping.ts` or DOM scraper extracts club group labels
6. Posts complete `SessionData` to bridge via postMessage
7. Bridge forwards to service worker
8. Service worker stores in `chrome.storage.local`
9. Popup UI reads and displays data
10. User clicks "Export" → Service worker generates CSV and triggers download

---

*Integration audit: 2026-03-02*
