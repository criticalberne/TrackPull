# Roadmap: TrackPull

## Milestones

- ✅ **v1.x Core Extension** - Phases 1-4 (shipped before 2026-03-02)
- 📋 **Future milestones** - To be defined via `/gsd:new-milestone`

## Phases

<details>
<summary>✅ v1.x Core Extension (Phases 1-4) — SHIPPED</summary>

### Phase 1: Data Capture
**Goal**: The extension reliably captures every shot from a Trackman report session
**Depends on**: Nothing (first phase)
**Requirements**: CAPT-01, CAPT-02, CAPT-03, CAPT-04, CAPT-05
**Success Criteria** (what must be TRUE):
  1. Extension intercepts Trackman API responses and captures shot data without user action
  2. Shots are grouped by club with correct club names attached from DOM
  3. Shot data is merged correctly when a report spans multiple metric pages
  4. HTML table scraping captures shots when API interception is unavailable
**Plans**: Pre-existing

Plans:
- [x] 01-01: API interception via MAIN world fetch/XHR monkey-patching
- [x] 01-02: StrokeGroups JSON parsing into structured SessionData
- [x] 01-03: HTML table fallback scraper
- [x] 01-04: Multi-page shot data merging
- [x] 01-05: DOM club tag scraping and attachment

### Phase 2: CSV Export
**Goal**: Users can download a complete, well-structured CSV of their captured session
**Depends on**: Phase 1
**Requirements**: EXPO-01, EXPO-02
**Success Criteria** (what must be TRUE):
  1. User can download a CSV file containing all shot metrics in ordered columns
  2. CSV includes per-club averages and consistency rows below the shot data
**Plans**: Pre-existing

Plans:
- [x] 02-01: CSV export with ordered metric columns via chrome.downloads
- [x] 02-02: Per-club averages and consistency row generation

### Phase 3: Unit Preferences
**Goal**: Users can view all metrics in their preferred measurement system, persisted across sessions
**Depends on**: Phase 2
**Requirements**: UNIT-01, UNIT-02, UNIT-03
**Success Criteria** (what must be TRUE):
  1. User can switch distance units between yards and meters and see values update
  2. User can switch speed units between mph, km/h, and m/s and see values update
  3. Unit preferences are remembered after closing and reopening the browser
**Plans**: Pre-existing

Plans:
- [x] 03-01: Distance unit conversion (yards/meters)
- [x] 03-02: Speed unit conversion (mph/km/h/m/s)
- [x] 03-03: Unit preference persistence via chrome.storage

### Phase 4: Popup UI
**Goal**: Users can see capture state and manage session data from the popup
**Depends on**: Phase 3
**Requirements**: UI-01, UI-02
**Success Criteria** (what must be TRUE):
  1. User can see how many shots have been captured in the popup
  2. User can clear all stored session data from the popup
**Plans**: Pre-existing

Plans:
- [x] 04-01: Shot count display in popup
- [x] 04-02: Clear session data button in popup

</details>

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Data Capture | v1.x | 5/5 | Complete | Pre-existing |
| 2. CSV Export | v1.x | 2/2 | Complete | Pre-existing |
| 3. Unit Preferences | v1.x | 3/3 | Complete | Pre-existing |
| 4. Popup UI | v1.x | 2/2 | Complete | Pre-existing |

---
*Roadmap created: 2026-03-02*
*v1.x phases reflect pre-existing implementation — all 12 v1 requirements complete*
*Future milestones to be added via `/gsd:new-milestone`*
