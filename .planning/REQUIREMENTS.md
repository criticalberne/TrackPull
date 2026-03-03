# Requirements: TrackPull

**Defined:** 2026-03-02
**Core Value:** Accurately capture every shot metric from a Trackman report and produce a clean, complete CSV export

## v1.5 Requirements

Requirements for v1.5 Polish & Quick Wins. Each maps to roadmap phases.

### AI Integration

- [ ] **AI-01**: User can launch Gemini as an AI analysis target using the existing clipboard-first flow
- [ ] **AI-02**: User can preview the assembled prompt and data before sending to any AI service

### UI Polish

- [ ] **UI-01**: Popup and options page automatically match the system dark/light theme
- [ ] **UI-02**: User sees actionable guidance (not a bare "0") when no shot data is available

### Export

- [ ] **EXP-01**: User can toggle whether exports include averages and consistency rows

### Navigation

- [ ] **NAV-01**: User can open the popup with Cmd+Shift+G (Mac) / Ctrl+Shift+G (Windows)

## v1.6 Requirements

Deferred to v1.6 Data Intelligence milestone. Tracked but not in current roadmap.

### Session Management

- **SESS-01**: User can browse and re-export past sessions from the popup without reopening the Trackman report
- **SESS-02**: User can see delta columns comparing club averages across sessions in CSV and TSV exports

### Data Visualization

- **VIS-01**: User sees a stat card in the popup showing avg carry, avg club speed, and shot count by club

### Smart Prompts

- **SMRT-01**: User sees a highlighted "Suggested" prompt label based on their session data characteristics

## Out of Scope

| Feature | Reason |
|---------|--------|
| Manual dark mode toggle | System-match is sufficient; revisit only if users request override |
| Gemini URL pre-fill via content script | Brittle against Gemini's SPA; clipboard-first is the correct permanent approach |
| User-configurable shortcut picker | Chrome's chrome://extensions/shortcuts already provides this natively |
| Real-time API integration with AI services | Opens in browser tab, no API keys |
| Direct AI API integration | Requires API key management, billing |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AI-01 | — | Pending |
| AI-02 | — | Pending |
| UI-01 | — | Pending |
| UI-02 | — | Pending |
| EXP-01 | — | Pending |
| NAV-01 | — | Pending |

**Coverage:**
- v1.5 requirements: 6 total
- Mapped to phases: 0
- Unmapped: 6

---
*Requirements defined: 2026-03-02*
*Last updated: 2026-03-02 after initial definition*
