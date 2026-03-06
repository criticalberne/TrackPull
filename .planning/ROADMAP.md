# Roadmap: TrackPull

## Milestones

- ✅ **v1.x Core Extension** — Phases 1-4 (shipped pre-2026-03-02)
- ✅ **v1.3 Export & AI** — Phases 5-7 (shipped 2026-03-03)
- ✅ **v1.4 Surface Metadata** — Phase 1 (shipped 2026-03-03)
- ✅ **v1.5 Polish & Quick Wins** — Phases 8-12 (shipped 2026-03-03)
- 🚧 **v1.6 Data Intelligence** — Phases 13-16 (in progress)

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

### v1.6 Data Intelligence (In Progress)

**Milestone Goal:** Add session persistence, visual at-a-glance summaries, and intelligent prompt matching so users can track improvement over time without leaving the extension.

- [x] **Phase 13: Visual Stat Card** — Popup displays avg carry, avg club speed, and shot count by club for the current session (completed 2026-03-06)
- [x] **Phase 14: Session History Storage** — Sessions are automatically persisted to local storage with deduplication and rolling eviction (completed 2026-03-06)
- [ ] **Phase 15: Session History UI** — User can browse, re-export, and delete past sessions from within the popup
- [ ] **Phase 16: Smart Prompt Suggestions** — Prompt dropdown annotates the best-fit built-in prompt based on available metrics

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
- [ ] 15-01-PLAN.md — History module functions (delete, clear), UI helpers, and EXPORT_CSV_FROM_DATA message type
- [ ] 15-02-PLAN.md — Popup history UI: collapsible list, session loading, banner, delete/clear actions

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
| 13. Visual Stat Card | 1/1 | Complete    | 2026-03-06 | - |
| 14. Session History Storage | 2/2 | Complete    | 2026-03-06 | - |
| 15. Session History UI | 1/2 | In Progress|  | - |
| 16. Smart Prompt Suggestions | v1.6 | 0/? | Not started | - |

---
*Roadmap created: 2026-03-02*
*v1.x phases reflect pre-existing implementation — all 12 v1 requirements complete*
*v1.3 shipped: 2026-03-03 — 13 requirements across phases 5-7*
*v1.4 shipped: 2026-03-03 — hitting surface metadata in all output paths*
*v1.5 shipped: 2026-03-03 — 6 polish features across phases 8-12*
*v1.6 roadmap added: 2026-03-03 — 14 requirements across phases 13-16*
