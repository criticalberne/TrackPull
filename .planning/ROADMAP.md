# Roadmap: TrackPull

## Milestones

- ✅ **v1.x Core Extension** — Phases 1-4 (shipped pre-2026-03-02)
- ✅ **v1.3 Export & AI** — Phases 5-7 (shipped 2026-03-03)
- ✅ **v1.4 Surface Metadata** — Phase 1 (shipped 2026-03-03)
- ✅ **v1.5 Polish & Quick Wins** — Phases 8-12 (shipped 2026-03-03)
- ⏸️ **v1.6 Data Intelligence** — Phases 13-16 (paused after phases 13-14)
- ⏸️ **v1.7 Flight Intelligence** — Phases 17-20 (paused)
- 🚧 **v1.6 Trackman Portal Integration** — Phases 21-25 (in progress)

## Phases

<details>
<summary>✅ v1.x Core Extension (Phases 1-4) — SHIPPED</summary>

- [x] Phase 1: Data Capture (5/5 plans) — pre-existing
- [x] Phase 2: CSV Export (2/2 plans) — pre-existing
- [x] Phase 3: Unit Preferences (3/3 plans) — pre-existing
- [x] Phase 4: Popup UI (2/2 plans) — pre-existing

</details>

<details>
<summary>✅ v1.3 Export & AI (Phases 5-7) — SHIPPED 2026-03-03</summary>

- [x] Phase 5: Foundation Modules (3/3 plans) — completed 2026-03-02
- [x] Phase 6: Clipboard Copy and AI Launch (2/2 plans) — completed 2026-03-02
- [x] Phase 7: Options Page and Custom Prompts (3/3 plans) — completed 2026-03-03

</details>

<details>
<summary>✅ v1.4 Surface Metadata (Phase 1) — SHIPPED 2026-03-03</summary>

- [x] Phase 1: Add setting for hitting surface selection (2/2 plans) — completed 2026-03-03

</details>

<details>
<summary>✅ v1.5 Polish & Quick Wins (Phases 8-12) — SHIPPED 2026-03-03</summary>

- [x] Phase 8: Gemini Launch and Keyboard Shortcut (1/1 plans) — completed 2026-03-03
- [x] Phase 9: Dark Mode CSS Foundation (2/2 plans) — completed 2026-03-03
- [x] Phase 10: Empty State Guidance (1/1 plans) — completed 2026-03-03
- [x] Phase 11: Export Format Toggle (1/1 plans) — completed 2026-03-03
- [x] Phase 12: Prompt Preview (1/1 plans) — completed 2026-03-03

</details>

### Data Intelligence (Paused)

**Milestone Goal:** Add session persistence, visual at-a-glance summaries, and intelligent prompt matching so users can track improvement over time without leaving the extension.

- [x] **Phase 13: Visual Stat Card** — Popup displays avg carry, avg club speed, and shot count by club for the current session (completed 2026-03-06)
- [x] **Phase 14: Session History Storage** — Sessions are automatically persisted to local storage with deduplication and rolling eviction (completed 2026-03-06)
- [ ] **Phase 15: Session History UI** — Deferred while v1.7 Flight Intelligence is active
- [ ] **Phase 16: Smart Prompt Suggestions** — Deferred while v1.7 Flight Intelligence is active

### Flight Intelligence (Paused)

**Milestone Goal:** Build a local ball-flight and spin-confidence system that can be calibrated against real Trackman sessions and backtested against user-captured FlightScope reference outputs before it affects exports or AI analysis.

- [ ] **Phase 17: Dataset Capture and Backtest Harness** — Create a repeatable dataset format and tooling for Trackman shots plus manually captured FlightScope outputs
- [ ] **Phase 18: Local Trajectory Engine** — Implement an independent local flight model with environment inputs and predicted carry, apex, hang time, landing angle, and lateral motion
- [ ] **Phase 19: Calibration and Spin Confidence** — Tune the model against the backtest set and derive a deterministic spin confidence / suspected-estimated-spin signal
- [ ] **Phase 20: Product Integration and Validation** — Surface spin confidence in exports and AI prompts, then verify end-to-end behavior on real reports

### v1.6 Trackman Portal Integration (In Progress)

**Milestone Goal:** Direct GraphQL API access to pull any session from a user's Trackman account — including old sessions without report URLs — and route them through the existing export, AI, and history pipeline unchanged.

- [x] **Phase 21: Manifest and Permissions Foundation** — Extension requests portal API access at runtime without disrupting existing users (completed 2026-03-26)
- [x] **Phase 22: GraphQL Client and Cookie Auth** — Authenticated GraphQL communication established and verified against the live Trackman API (completed 2026-03-26)
- [x] **Phase 23: GraphQL-to-SessionData Parser** — Measurement fields mapped to SessionData with defensive null handling and deduplication identity (completed 2026-03-27)
- [x] **Phase 24: Service Worker Import Flow** — FETCH_ACTIVITIES and IMPORT_SESSION handlers with fire-and-forget status tracking (completed 2026-03-27)
- [ ] **Phase 25: Activity Browser UI** — Popup panel for browsing, filtering, and importing portal sessions

## Phase Details

### Phase 13: Visual Stat Card
**Goal**: User sees an at-a-glance stat card in the popup showing the most important metrics from the current session
**Depends on**: Nothing (uses cachedData already present in v1.5)
**Requirements**: VIS-01, VIS-02, VIS-03
**Success Criteria** (what must be TRUE):
  1. Popup displays avg carry distance, avg club speed, and shot count broken down by club for the current session
  2. Stat card shows values in the user's selected units (yards/meters, mph/m/s) — not raw SI values
  3. Stat card updates automatically when a new report is loaded (DATA_UPDATED event fires) without requiring popup close/reopen
  4. Stat card is absent (or shows empty state) when no session data has been captured yet
**Plans:** 1/1 plans complete
Plans:
- [ ] 13-01-PLAN.md — Stat card computation, HTML/CSS, and popup integration

### Phase 14: Session History Storage
**Goal**: Every captured session is automatically saved to local storage and retrievable by the service worker, with storage safety guaranteed
**Depends on**: Nothing (pure service worker change; no UI dependency)
**Requirements**: HIST-01, HIST-02, HIST-07
**Success Criteria** (what must be TRUE):
  1. A session is saved automatically after each Trackman report capture — user performs no manual save action
  2. Capturing the same report a second time updates the existing entry rather than creating a duplicate
  3. When 20 saved sessions are present, capturing a new session evicts the oldest one rather than failing silently
  4. If a storage write fails (quota exceeded), the extension shows a toast notification rather than dropping the session silently
**Plans:** 2/2 plans complete
Plans:
- [ ] 14-01-PLAN.md — Types, constants, and TDD history module (save, dedup, eviction)
- [ ] 14-02-PLAN.md — Service worker integration and popup error toast

### Phase 15: Session History UI
**Goal**: User can browse saved sessions and re-export any of them as CSV, TSV, or AI analysis — identical actions to the current session
**Depends on**: Phase 14
**Requirements**: HIST-03, HIST-04, HIST-05, HIST-06, HIST-08, HIST-09
**Success Criteria** (what must be TRUE):
  1. Popup shows a list of saved sessions with date, shot count, and clubs used for each entry
  2. User can load a past session and export it as CSV — the file is identical in format to a live export
  3. User can load a past session and copy it as TSV to clipboard
  4. User can load a past session and send it to AI analysis (ChatGPT, Claude, or Gemini)
  5. User can delete individual sessions from the history list, and can clear all history at once
**Plans:** 1/2 plans executed
Plans:
- [ ] 15-01-PLAN.md — History module functions (delete, clear), UI helpers, and EXPORT_CSV_FROM_DATA message type
- [ ] 15-02-PLAN.md — Popup history UI: collapsible list, session loading, banner, delete/clear actions

### Phase 16: Smart Prompt Suggestions
**Goal**: The prompt dropdown surfaces the best-fit built-in prompt for the current session's data so users spend less time picking a prompt
**Depends on**: Nothing (uses cachedData.metric_names and BUILTIN_PROMPTS already present in v1.5)
**Requirements**: PROMPT-01, PROMPT-02
**Success Criteria** (what must be TRUE):
  1. The best-matching built-in prompt in the dropdown displays a visual indicator (e.g., "Recommended") when the session contains metrics that match its focus
  2. Matching is determined by which metric names are present in the session — no AI call, no fuzzy search, rule-based lookup only
  3. Full Bag Fitting prompt is only recommended when the session contains data from multiple clubs (single-club sessions lack sufficient data for bag-level analysis)
  4. The badge updates when a new report is loaded (DATA_UPDATED) without requiring popup close/reopen
  5. The user's current prompt selection is never auto-changed — the badge is advisory only
**Plans:** 2 plans
Plans:
- [ ] 16-01-PLAN.md — Prompt matching rules and prompt metadata coverage
- [ ] 16-02-PLAN.md — Popup dropdown badge rendering and live update behavior

### Phase 17: Dataset Capture and Backtest Harness
**Goal**: Build the data pipeline needed to compare Trackman shots against a user-maintained reference set from FlightScope outputs
**Depends on**: Phase 14 for durable local session capture; does not require v1.6 UI completion
**Requirements**: FLIGHT-01, FLIGHT-03
**Success Criteria** (what must be TRUE):
  1. There is a documented local dataset format for pairing Trackman shot inputs with manually captured FlightScope reference outputs
  2. User can import or place real report-derived calibration fixtures in the repo without hand-editing production code
  3. A backtest runner computes and reports per-metric error across the fixture set
  4. The backtest output is stable enough to gate future model changes
**Plans:** 0 plans
Plans:
- [ ] 17-01-PLAN.md — Dataset schema, fixture ingestion, and backtest runner

### Phase 18: Local Trajectory Engine
**Goal**: Implement an independently authored local trajectory model that predicts ball flight from launch conditions and environment inputs
**Depends on**: Phase 17
**Requirements**: FLIGHT-02, FLIGHT-07
**Success Criteria** (what must be TRUE):
  1. Local engine accepts at minimum ball speed, launch angle, spin rate, spin axis, and environment inputs needed for prediction
  2. Engine returns predicted carry, apex, hang time, landing angle, and lateral movement in a structured output
  3. Implementation runs locally with no dependency on FlightScope's hosted tool or proprietary assets
  4. Model assumptions and limits are documented so output can be interpreted correctly
**Plans:** 0 plans
Plans:
- [ ] 18-01-PLAN.md — Trajectory model implementation and API

### Phase 19: Calibration and Spin Confidence
**Goal**: Calibrate the local model against real data and derive a deterministic signal for suspect or estimated spin
**Depends on**: Phase 18
**Requirements**: FLIGHT-03, FLIGHT-04
**Success Criteria** (what must be TRUE):
  1. Calibration workflow can tune or choose model parameters based on measured backtest error
  2. Backtest output reports aggregate fit quality and identifies shots with poor model agreement
  3. System emits a deterministic spin confidence or suspected-estimated-spin signal per shot
  4. Signal is explainable from stored metrics and model fit, not prompt-only judgment
**Plans:** 0 plans
Plans:
- [ ] 19-01-PLAN.md — Calibration loop and spin confidence scoring

### Phase 20: Product Integration and Validation
**Goal**: Use spin confidence in user-facing outputs without replacing Trackman's raw spin values
**Depends on**: Phase 19
**Requirements**: FLIGHT-05, FLIGHT-06
**Success Criteria** (what must be TRUE):
  1. Export paths can include spin confidence metadata while preserving the original Trackman spin value
  2. AI prompt assembly carries spin confidence context so suspect spin is treated cautiously
  3. End-to-end validation covers capture → backtest → confidence generation → export/prompt output on real reports
  4. User can inspect enough output to trust why a shot was flagged as low-confidence
**Plans:** 0 plans
Plans:
- [ ] 20-01-PLAN.md — Export/prompt integration and real-report validation

### Phase 21: Manifest and Permissions Foundation
**Goal**: Extension gains the ability to request portal API access at runtime without disrupting existing users on update
**Depends on**: Nothing
**Requirements**: PERM-01
**Success Criteria** (what must be TRUE):
  1. An existing v1.5.x install can update to v1.6 without the extension being disabled or showing a permission escalation warning
  2. The manifest declares `api.trackmangolf.com` and `portal.trackmangolf.com` under `optional_host_permissions` (not `host_permissions`)
  3. The first time a user initiates a portal import, `chrome.permissions.request()` is triggered and the user sees the standard Chrome permission grant dialog
  4. If the user denies the permission request, the extension continues to work normally for report-based capture
**Plans**: 1 plan
Plans:
- [x] 21-01-PLAN.md — Manifest optional_host_permissions, permissions module, popup portal section, service worker guard

### Phase 22: GraphQL Client and Cookie Auth
**Goal**: Authenticated GraphQL communication is established and verified against the live Trackman API from the service worker
**Depends on**: Phase 21
**Requirements**: PERM-02, PERM-03, RESIL-03
**Success Criteria** (what must be TRUE):
  1. A health-check query (`{ me { id } }`) returns a successful authenticated response when the user is logged into Trackman portal
  2. When the user is not logged in, the extension surfaces a clear "Log into portal.trackmangolf.com" message — not a blank list or a silent error
  3. `graphql_client.ts` can execute any POST query with variables and return typed data without production dependencies
  4. Parser gracefully handles null, missing, or unexpected response fields without throwing — unknown fields are skipped, not fatal
**Plans**: 2 plans
Plans:
- [x] 22-01-PLAN.md — GraphQL client module with executeQuery, classifyAuthResult, and health-check query (TDD)
- [x] 22-02-PLAN.md — Service worker auth check handler, popup three-state portal section, login link
**UI hint**: yes

### Phase 23: GraphQL-to-SessionData Parser
**Goal**: GraphQL Measurement fields are mapped into the existing SessionData format with defensive handling and deduplication identity established
**Depends on**: Phase 22
**Requirements**: PIPE-01, PIPE-03
**Success Criteria** (what must be TRUE):
  1. `portal_parser.ts` maps all available `Stroke.measurement` fields (60+) to the `Shot.metrics` structure used by the existing export pipeline
  2. Sessions imported from the portal and sessions captured via the interceptor for the same round are deduplicated — the same session is not stored twice
  3. `metric_names` on the parsed SessionData accurately reflects only fields that were populated — no phantom metric labels
  4. A test suite covering real API response fixtures passes, with explicit cases for missing and null measurement fields
**Plans**: 1 plan
Plans:
- [ ] 23-01-PLAN.md — Portal parser with alias map, UUID extraction, and TDD test suite

### Phase 24: Service Worker Import Flow
**Goal**: The service worker can fetch the activity list and execute a full session import that persists even if the popup is closed mid-import
**Depends on**: Phase 23
**Requirements**: BROWSE-02, PIPE-02, RESIL-01, RESIL-02
**Success Criteria** (what must be TRUE):
  1. User can select an activity and the extension imports its full shot data — the session appears in history and is immediately available for CSV export, TSV copy, and AI launch
  2. Import completes and the session is saved even if the user closes the popup before the GraphQL fetch returns
  3. When the popup is reopened after a mid-import close, it displays the import result (success or error) read from `chrome.storage.local` — no data is silently lost
  4. An imported session is functionally identical to a live-captured session in all export and AI paths
**Plans**: 2 plans
Plans:
- [x] 24-01-PLAN.md — Constants, types, FETCH_ACTIVITIES and IMPORT_SESSION handlers with TDD
- [x] 24-02-PLAN.md — Popup import status display and build verification

### Phase 25: Activity Browser UI
**Goal**: User can browse, filter, and import portal sessions directly from the popup without leaving the extension
**Depends on**: Phase 24
**Requirements**: BROWSE-01, BROWSE-03, BROWSE-04
**Success Criteria** (what must be TRUE):
  1. Popup shows an "Import from Portal" section displaying each activity's date, stroke count, and activity type
  2. Activities are grouped under time-period headers (Today / This Week / This Month / Older) so users can locate recent sessions without scrolling a flat list
  3. User can filter the activity list by type (Session, Shot Analysis, Course Play, etc.) — only matching activities are shown
  4. The browser panel displays idle, loading, loaded, importing, and error states — the user always knows what is happening
**Plans**: TBD
**UI hint**: yes

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Data Capture | v1.x | 5/5 | Complete | Pre-existing |
| 2. CSV Export | v1.x | 2/2 | Complete | Pre-existing |
| 3. Unit Preferences | v1.x | 3/3 | Complete | Pre-existing |
| 4. Popup UI | v1.x | 2/2 | Complete | Pre-existing |
| 5. Foundation Modules | v1.3 | 3/3 | Complete | 2026-03-02 |
| 6. Clipboard Copy and AI Launch | v1.3 | 2/2 | Complete | 2026-03-02 |
| 7. Options Page and Custom Prompts | v1.3 | 3/3 | Complete | 2026-03-03 |
| 1. Surface Selection | v1.4 | 2/2 | Complete | 2026-03-03 |
| 8. Gemini Launch and Keyboard Shortcut | v1.5 | 1/1 | Complete | 2026-03-03 |
| 9. Dark Mode CSS Foundation | v1.5 | 2/2 | Complete | 2026-03-03 |
| 10. Empty State Guidance | v1.5 | 1/1 | Complete | 2026-03-03 |
| 11. Export Format Toggle | v1.5 | 1/1 | Complete | 2026-03-03 |
| 12. Prompt Preview | v1.5 | 1/1 | Complete | 2026-03-03 |
| 13. Visual Stat Card | v1.6 DI | 1/1 | Complete | 2026-03-06 |
| 14. Session History Storage | v1.6 DI | 2/2 | Complete | 2026-03-06 |
| 15. Session History UI | v1.6 DI | 1/2 | Paused | - |
| 16. Smart Prompt Suggestions | v1.6 DI | 0/2 | Paused | - |
| 17. Dataset Capture and Backtest Harness | v1.7 | 0/1 | Paused | - |
| 18. Local Trajectory Engine | v1.7 | 0/1 | Paused | - |
| 19. Calibration and Spin Confidence | v1.7 | 0/1 | Paused | - |
| 20. Product Integration and Validation | v1.7 | 0/1 | Paused | - |
| 21. Manifest and Permissions Foundation | v1.6 PI | 1/1 | Complete    | 2026-03-26 |
| 22. GraphQL Client and Cookie Auth | v1.6 PI | 2/2 | Complete   | 2026-03-26 |
| 23. GraphQL-to-SessionData Parser | v1.6 PI | 0/1 | Complete    | 2026-03-27 |
| 24. Service Worker Import Flow | v1.6 PI | 2/2 | Complete   | 2026-03-27 |
| 25. Activity Browser UI | v1.6 PI | 0/0 | Not started | - |

---
*Roadmap created: 2026-03-02*
*v1.x phases reflect pre-existing implementation — all 12 v1 requirements complete*
*v1.3 shipped: 2026-03-03 — 13 requirements across phases 5-7*
*v1.4 shipped: 2026-03-03 — hitting surface metadata in all output paths*
*v1.5 shipped: 2026-03-03 — 6 polish features across phases 8-12*
*v1.6 Data Intelligence roadmap added: 2026-03-03 — 14 requirements across phases 13-16*
*v1.7 activated: 2026-03-21 — pivoted current focus to local trajectory modeling, calibration/backtesting, and spin-confidence productization across phases 17-20*
*v1.6 Trackman Portal Integration roadmap added: 2026-03-26 — 13 requirements across phases 21-25*
