# Requirements: TrackPull

**Defined:** 2026-03-03
**Core Value:** Accurately capture every shot metric from a Trackman report and produce a clean, complete CSV export — scraping and exporting are inseparable.

## v1.6 Requirements

Requirements for v1.6 Trackman Portal Integration milestone. Each maps to roadmap phases.

### Permissions & Auth

- [ ] **PERM-01**: Extension requests portal API access at runtime via `optional_host_permissions` — existing users are not disrupted on update
- [x] **PERM-02**: Extension can make authenticated GraphQL requests to `api.trackmangolf.com/graphql` using the browser's Trackman session cookies
- [ ] **PERM-03**: User sees a clear message when they aren't logged into Trackman portal (auth failure feedback)

### Activity Browser

- [ ] **BROWSE-01**: User can view a list of their Trackman activities showing date, stroke count, and activity type
- [ ] **BROWSE-02**: User can select a single activity and import its full shot data into the extension
- [ ] **BROWSE-03**: Activities are grouped by time period (Today / This Week / This Month / Older)
- [ ] **BROWSE-04**: User can filter activities by type (Session, Shot Analysis, Course Play, etc.)

### Data Pipeline

- [ ] **PIPE-01**: GraphQL `Stroke.measurement` fields (60+) are mapped into the existing `SessionData` format with defensive null handling
- [ ] **PIPE-02**: An imported session supports CSV export, TSV clipboard copy, AI launch, and history storage — identical to intercepted sessions
- [ ] **PIPE-03**: Same session captured via interceptor and imported via API is deduplicated in history

### Resilience

- [ ] **RESIL-01**: Session import continues in the service worker even if the popup is closed mid-import
- [ ] **RESIL-02**: Popup reads import status from storage on open/re-open and displays progress or completion
- [x] **RESIL-03**: Parser handles missing, null, or unexpected fields gracefully without crashing

## Deferred v1.7 Requirements

Requirements for v1.7 Flight Intelligence milestone. Paused.

### Dataset and Backtesting

- [ ] **FLIGHT-01**: System can ingest a calibration/backtest dataset pairing Trackman shot data with user-captured FlightScope reference outputs
- [ ] **FLIGHT-02**: Local trajectory engine accepts launch conditions and environment inputs and predicts carry, apex, hang time, landing angle, and lateral movement without calling third-party services
- [ ] **FLIGHT-03**: Calibration workflow reports model error against the backtest dataset so changes can be judged on measured fit instead of eyeballing traces

### Spin Confidence

- [ ] **FLIGHT-04**: Product computes a deterministic per-shot spin confidence or suspected-estimated-spin signal from model fit and available shot metrics
- [ ] **FLIGHT-05**: Export paths can surface spin confidence metadata without overwriting the underlying Trackman spin value
- [ ] **FLIGHT-06**: AI prompt assembly includes spin confidence context so analysis treats suspect spin more cautiously
- [ ] **FLIGHT-07**: Local implementation is independently authored; no proprietary FlightScope code, assets, or live service dependency is required

## Deferred v1.6 Data Intelligence Requirements

### Session History (partially shipped)

- [x] **HIST-01**: Sessions are automatically saved to local storage when captured from a Trackman report
- [x] **HIST-02**: Duplicate sessions (same report_id) update in place rather than creating new entries
- [ ] **HIST-03**: User can browse a list of saved sessions showing date, shot count, and clubs used
- [x] **HIST-04**: User can load a past session and re-export it as CSV
- [ ] **HIST-05**: User can load a past session and copy it as TSV to clipboard
- [ ] **HIST-06**: User can load a past session and send it to AI analysis
- [x] **HIST-07**: Oldest sessions are evicted when storage cap is reached (20 sessions max)
- [x] **HIST-08**: User can delete individual sessions from history
- [x] **HIST-09**: User can clear all session history

### Visual Summary (shipped)

- [x] **VIS-01**: Popup displays a stat card showing avg carry distance, avg club speed, and shot count by club for the current session
- [x] **VIS-02**: Stat card updates when new data is captured (DATA_UPDATED)
- [x] **VIS-03**: Stat card respects user's unit preferences (yards/meters, mph/m/s)

### Smart Prompts

- [ ] **PROMPT-01**: Prompts in the dropdown are annotated with a visual indicator when they match the current session's available metrics
- [ ] **PROMPT-02**: Matching is rule-based on metric_names (e.g., SpinRate present → highlight spin-related prompts)

## Future Requirements

Deferred to future release. Tracked but not in current roadmap.

### Session Comparison

- **COMP-01**: User can select two sessions and view delta columns comparing club averages
- **COMP-02**: User can export comparison results as CSV

## Out of Scope

| Feature | Reason |
|---------|--------|
| Unlimited session history | chrome.storage.local 10 MB quota; 20-session cap is sufficient |
| Cloud sync of sessions | chrome.storage.sync 100 KB total quota cannot hold session data |
| Multi-session comparison (3+) | Diminishing returns; 2-session comparison deferred to future milestone |
| AI-powered prompt suggestion | Rule-based matching is deterministic, instant, offline; no API key needed |
| Saved comparison results | Stateless comparison on demand is sufficient |
| Session history in options page | Popup-native workflow keeps interaction close to capture context |
| Keyboard shortcut to open popup | Cmd+Shift+G conflicted with macOS system shortcuts; removed in v1.5 |
| Replacing Trackman spin values with inferred spin | Confidence scoring is safer than silently inventing corrected values |
| Depending on FlightScope's hosted calculator in production | The milestone goal is a local model that can be calibrated and backtested offline |
| Bulk sync of all portal activities on install | Storage overflow risk; on-demand import is sufficient |
| Real-time portal polling | MV3 service worker lifecycle incompatible with persistent polling |
| Required host_permissions for portal domains | Would disable extension for existing users on update; use optional_host_permissions instead |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| HIST-01 | Phase 14 | Complete |
| HIST-02 | Phase 14 | Complete |
| HIST-03 | Phase 15 | Pending |
| HIST-04 | Phase 15 | Complete |
| HIST-05 | Phase 15 | Pending |
| HIST-06 | Phase 15 | Pending |
| HIST-07 | Phase 14 | Complete |
| HIST-08 | Phase 15 | Complete |
| HIST-09 | Phase 15 | Complete |
| VIS-01 | Phase 13 | Complete |
| VIS-02 | Phase 13 | Complete |
| VIS-03 | Phase 13 | Complete |
| PROMPT-01 | Phase 16 | Pending |
| PROMPT-02 | Phase 16 | Pending |
| PERM-01 | Phase 21 | Pending |
| PERM-02 | Phase 22 | Complete |
| PERM-03 | Phase 22 | Pending |
| BROWSE-01 | Phase 25 | Pending |
| BROWSE-02 | Phase 24 | Pending |
| BROWSE-03 | Phase 25 | Pending |
| BROWSE-04 | Phase 25 | Pending |
| PIPE-01 | Phase 23 | Pending |
| PIPE-02 | Phase 24 | Pending |
| PIPE-03 | Phase 23 | Pending |
| RESIL-01 | Phase 24 | Pending |
| RESIL-02 | Phase 24 | Pending |
| RESIL-03 | Phase 22 | Complete |

**Coverage:**
- v1.6 Portal Integration requirements: 13 total
- Mapped to phases: 13 (phases 21-25)
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-03*
*Last updated: 2026-03-26 — v1.6 Portal Integration traceability complete (phases 21-25)*
