# Requirements: TrackPull

**Defined:** 2026-03-02
**Core Value:** Accurately capture every shot metric from a Trackman report and produce a clean, complete CSV export

## v1 Requirements

### Data Capture

- [x] **CAPT-01**: Extension intercepts Trackman API responses to capture shot data
- [x] **CAPT-02**: Extension parses StrokeGroups JSON into structured SessionData
- [x] **CAPT-03**: Extension scrapes HTML tables as fallback when API unavailable
- [x] **CAPT-04**: Extension merges shot data across multiple metric pages
- [x] **CAPT-05**: Extension scrapes club name tags from DOM and attaches to shots

### Export

- [x] **EXPO-01**: User can export session data as CSV with ordered metric columns
- [x] **EXPO-02**: CSV includes averages and consistency rows per club

### Units

- [x] **UNIT-01**: User can convert between distance units (yards/meters)
- [x] **UNIT-02**: User can convert between speed units (mph/km/h/m/s)
- [x] **UNIT-03**: Unit preferences persist across sessions

### UI

- [x] **UI-01**: User can see shot count in popup
- [x] **UI-02**: User can clear stored session data from popup

## v1.3 Requirements

### Clipboard

- [ ] **CLIP-01**: User can copy all shot data to clipboard as tab-separated values with one click
- [ ] **CLIP-02**: User sees visual confirmation (toast) after successful clipboard copy
- [ ] **CLIP-03**: Clipboard copy includes column headers as the first row

### AI Launch

- [ ] **AILN-01**: User can open ChatGPT in a new tab with prompt+data auto-copied to clipboard
- [ ] **AILN-02**: User can open Claude in a new tab with prompt+data auto-copied to clipboard
- [ ] **AILN-03**: User can open Gemini in a new tab with prompt+data auto-copied to clipboard
- [ ] **AILN-04**: User can copy assembled prompt+data to clipboard without opening an AI tab

### Prompt Library

- [x] **PRMT-01**: Extension ships with 7+ built-in golf analysis prompts bundled as code constants
- [x] **PRMT-02**: Built-in prompts are organized by skill tier (beginner/intermediate/advanced) in the popup
- [ ] **PRMT-03**: User can create and save custom prompt templates
- [ ] **PRMT-04**: User can edit and delete their custom prompt templates

### Preferences

- [x] **PREF-01**: User can set a default AI service (ChatGPT, Claude, or Gemini)
- [ ] **PREF-02**: User can manage prompts and AI preferences in a dedicated options page

## v2 Requirements

(Deferred from v1.3 or identified for future)

### Potential Future Features

- **Capture status indicator** — show when extension is actively intercepting
- **Export feedback** — clear success/error confirmation on download
- **Column selection** — choose which metrics to export
- **Multi-session history** — persist data across multiple sessions
- **Shot filtering** — include/exclude shots before export
- **Dev tooling** — tsconfig.json, @types/chrome, DOM health-check
- **Prompt preview panel** — read-only preview of assembled prompt+data before launch
- **Per-launch AI service override** — pick different AI service on individual launches

## Out of Scope

| Feature | Reason |
|---------|--------|
| Cloud sync | No backend; extension is local-only by design |
| In-extension visualization | Purpose-built analytics platforms do this better |
| Trackman OAuth | Extension piggybacks on website auth |
| Direct AI API integration | Requires API key management, billing; opens tab instead |
| Streaming AI response in popup | Requires API integration; AI service's chat UI is better |
| Prompt sharing / community library | Requires backend, moderation, user accounts |
| Auto-submit to AI without user review | Bypasses user's chance to review; rate-limit risk |
| Mobile app | Web extension only |

## Traceability

All v1 requirements are implemented (shipped in v1.x milestone).
All v1.3 requirements are mapped to phases 5-7.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CAPT-01 | Phase 1 (Data Capture) | Complete |
| CAPT-02 | Phase 1 (Data Capture) | Complete |
| CAPT-03 | Phase 1 (Data Capture) | Complete |
| CAPT-04 | Phase 1 (Data Capture) | Complete |
| CAPT-05 | Phase 1 (Data Capture) | Complete |
| EXPO-01 | Phase 2 (CSV Export) | Complete |
| EXPO-02 | Phase 2 (CSV Export) | Complete |
| UNIT-01 | Phase 3 (Unit Preferences) | Complete |
| UNIT-02 | Phase 3 (Unit Preferences) | Complete |
| UNIT-03 | Phase 3 (Unit Preferences) | Complete |
| UI-01 | Phase 4 (Popup UI) | Complete |
| UI-02 | Phase 4 (Popup UI) | Complete |
| PRMT-01 | Phase 5 (Foundation Modules) | Complete |
| CLIP-01 | Phase 6 (Clipboard Copy and AI Launch) | Pending |
| CLIP-02 | Phase 6 (Clipboard Copy and AI Launch) | Pending |
| CLIP-03 | Phase 6 (Clipboard Copy and AI Launch) | Pending |
| AILN-01 | Phase 6 (Clipboard Copy and AI Launch) | Pending |
| AILN-02 | Phase 6 (Clipboard Copy and AI Launch) | Pending |
| AILN-03 | Phase 6 (Clipboard Copy and AI Launch) | Pending |
| AILN-04 | Phase 6 (Clipboard Copy and AI Launch) | Pending |
| PRMT-02 | Phase 6 (Clipboard Copy and AI Launch) | Complete |
| PREF-01 | Phase 6 (Clipboard Copy and AI Launch) | Complete |
| PRMT-03 | Phase 7 (Options Page and Custom Prompts) | Pending |
| PRMT-04 | Phase 7 (Options Page and Custom Prompts) | Pending |
| PREF-02 | Phase 7 (Options Page and Custom Prompts) | Pending |

**Coverage:**
- v1 requirements: 12 total (all complete)
- v1.3 requirements: 12 total
- Mapped to phases: 12 (v1) + 12 (v1.3)
- Unmapped: 0

---
*Requirements defined: 2026-03-02*
*Last updated: 2026-03-02 — v1.3 requirements mapped to phases 5-7*
