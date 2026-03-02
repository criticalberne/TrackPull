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

## v2 Requirements

(None defined — research identified potential features below for future consideration)

### Potential Future Features (from research)

- **Capture status indicator** — show when extension is actively intercepting
- **Export feedback** — clear success/error confirmation on download
- **Clipboard copy** — paste directly into Excel/Sheets
- **Column selection** — choose which metrics to export
- **Multi-session history** — persist data across multiple sessions
- **Shot filtering** — include/exclude shots before export
- **Dev tooling** — tsconfig.json, @types/chrome, DOM health-check

## Out of Scope

| Feature | Reason |
|---------|--------|
| Cloud sync | No backend; extension is local-only by design |
| In-extension visualization | Purpose-built analytics platforms do this better |
| Trackman OAuth | Extension piggybacks on website auth |
| Real-time AI coaching | Outside core value; competency mismatch |
| Mobile app | Web extension only |

## Traceability

All v1 requirements are validated (already implemented).

| Requirement | Phase | Status |
|-------------|-------|--------|
| CAPT-01 | Pre-existing | Complete |
| CAPT-02 | Pre-existing | Complete |
| CAPT-03 | Pre-existing | Complete |
| CAPT-04 | Pre-existing | Complete |
| CAPT-05 | Pre-existing | Complete |
| EXPO-01 | Pre-existing | Complete |
| EXPO-02 | Pre-existing | Complete |
| UNIT-01 | Pre-existing | Complete |
| UNIT-02 | Pre-existing | Complete |
| UNIT-03 | Pre-existing | Complete |
| UI-01 | Pre-existing | Complete |
| UI-02 | Pre-existing | Complete |

**Coverage:**
- v1 requirements: 12 total
- Mapped to phases: 12
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-02*
*Last updated: 2026-03-02 after initial definition*
