# Requirements: TrackPull

**Defined:** 2026-03-03
**Core Value:** Accurately capture every shot metric from a Trackman report and produce a clean, complete CSV export — scraping and exporting are inseparable.

## v1.6 Requirements

Requirements for v1.6 Data Intelligence milestone. Each maps to roadmap phases.

### Session History

- [ ] **HIST-01**: Sessions are automatically saved to local storage when captured from a Trackman report
- [ ] **HIST-02**: Duplicate sessions (same report_id) update in place rather than creating new entries
- [ ] **HIST-03**: User can browse a list of saved sessions showing date, shot count, and clubs used
- [ ] **HIST-04**: User can load a past session and re-export it as CSV
- [ ] **HIST-05**: User can load a past session and copy it as TSV to clipboard
- [ ] **HIST-06**: User can load a past session and send it to AI analysis
- [ ] **HIST-07**: Oldest sessions are evicted when storage cap is reached (20 sessions max)
- [ ] **HIST-08**: User can delete individual sessions from history
- [ ] **HIST-09**: User can clear all session history

### Visual Summary

- [ ] **VIS-01**: Popup displays a stat card showing avg carry distance, avg club speed, and shot count by club for the current session
- [ ] **VIS-02**: Stat card updates when new data is captured (DATA_UPDATED)
- [ ] **VIS-03**: Stat card respects user's unit preferences (yards/meters, mph/m/s)

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

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| HIST-01 | — | Pending |
| HIST-02 | — | Pending |
| HIST-03 | — | Pending |
| HIST-04 | — | Pending |
| HIST-05 | — | Pending |
| HIST-06 | — | Pending |
| HIST-07 | — | Pending |
| HIST-08 | — | Pending |
| HIST-09 | — | Pending |
| VIS-01 | — | Pending |
| VIS-02 | — | Pending |
| VIS-03 | — | Pending |
| PROMPT-01 | — | Pending |
| PROMPT-02 | — | Pending |

**Coverage:**
- v1.6 requirements: 14 total
- Mapped to phases: 0
- Unmapped: 14 ⚠️

---
*Requirements defined: 2026-03-03*
*Last updated: 2026-03-03 after initial definition*
