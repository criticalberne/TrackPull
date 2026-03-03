# Roadmap: TrackPull

## Milestones

- ✅ **v1.x Core Extension** — Phases 1-4 (shipped pre-2026-03-02)
- ✅ **v1.3 Export & AI** — Phases 5-7 (shipped 2026-03-03)
- ✅ **v1.4 Surface Metadata** — Phase 1 (shipped 2026-03-03)
- 🚧 **v1.5 Polish & Quick Wins** — Phases 8-12 (in progress)

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

### 🚧 v1.5 Polish & Quick Wins (In Progress)

**Milestone Goal:** Ship 6 low-effort, high-impact features that polish the existing experience without breaking existing behavior.

- [x] **Phase 8: Gemini Launch and Keyboard Shortcut** - Isolated manifest-only release adding Gemini host_permissions and Cmd+Shift+G keyboard shortcut (completed 2026-03-03)
- [x] **Phase 9: Dark Mode CSS Foundation** - CSS custom properties refactor enabling system-driven dark mode in popup and options pages (completed 2026-03-03)
- [x] **Phase 10: Empty State Guidance** - Actionable guidance message replacing bare "0 shots" when no data is captured (completed 2026-03-03)
- [x] **Phase 11: Export Format Toggle** - Checkbox persisting user preference to include or exclude averages and consistency rows in CSV (completed 2026-03-03)
- [ ] **Phase 12: Prompt Preview** - Collapsible disclosure widget showing assembled prompt and data before AI launch

## Phase Details

### Phase 8: Gemini Launch and Keyboard Shortcut
**Goal**: Users can launch Gemini as an AI target and open the popup via keyboard without disrupting existing users
**Depends on**: Nothing (isolated manifest-only release)
**Requirements**: AI-01, NAV-01
**Success Criteria** (what must be TRUE):
  1. User can select Gemini from the AI service dropdown and "Open in AI" opens gemini.google.com with data on the clipboard
  2. User can open the extension popup by pressing Cmd+Shift+G (Mac) or Ctrl+Shift+G (Windows) from any tab
  3. Existing ChatGPT and Claude AI launch flows are unaffected after the update
  4. Extension installs/updates without disabling for users who do not use Gemini
**Plans**: TBD

### Phase 9: Dark Mode CSS Foundation
**Goal**: Popup and options pages automatically match the system dark or light theme with no user action required
**Depends on**: Phase 8
**Requirements**: UI-01
**Success Criteria** (what must be TRUE):
  1. Popup renders with dark background and light text when the OS is set to dark mode
  2. Options page renders with dark background and light text when the OS is set to dark mode
  3. Both pages revert to light theme immediately when OS switches to light mode
  4. Status messages and toast notifications respect dark mode (no bright text on dark backgrounds)
**Plans**: TBD

### Phase 10: Empty State Guidance
**Goal**: Users who open the popup before capturing shot data see an actionable instruction instead of a bare zero
**Depends on**: Phase 9
**Requirements**: UI-02
**Success Criteria** (what must be TRUE):
  1. Opening the popup with no stored data shows a guidance message (e.g., "Open a Trackman report to capture shots") instead of "0 shots"
  2. The guidance message does not flash briefly when data is already present — it only appears after storage resolves as empty
  3. The guidance message is readable in both light and dark mode
**Plans:** 1/1 plans complete
- [ ] 10-01-PLAN.md — Empty state guidance HTML/CSS + TypeScript logic refactor

### Phase 11: Export Format Toggle
**Goal**: Users can choose whether CSV exports include averages and consistency summary rows
**Depends on**: Phase 10
**Requirements**: EXP-01
**Success Criteria** (what must be TRUE):
  1. Popup shows a checkbox (checked by default) labeled to indicate averages and consistency rows are included in the export
  2. Unchecking the box and exporting produces a CSV with only raw shot rows — no Average or Consistency rows
  3. The checkbox state persists across popup closes and browser restarts
  4. Existing users who have never touched the toggle get the same export output as before (averages included by default)
**Plans:** 1/1 plans complete
- [ ] 11-01-PLAN.md — Add averages toggle checkbox, storage persistence, and service worker wiring

### Phase 12: Prompt Preview
**Goal**: Users can inspect the assembled prompt and data before sending to any AI service
**Depends on**: Phase 11
**Requirements**: AI-02
**Success Criteria** (what must be TRUE):
  1. A collapsible disclosure element in the popup shows the full assembled prompt text and shot data when expanded
  2. The preview updates immediately when the user changes the selected prompt or AI service
  3. The preview widget fits within the popup without triggering a scrollbar on the outer popup container
  4. The preview is readable in both light and dark mode
**Plans**: TBD

## Progress

**Execution Order:** Phases execute in numeric order: 8 → 9 → 10 → 11 → 12

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Data Capture | v1.x | 5/5 | Complete | Pre-existing |
| 2. CSV Export | v1.x | 2/2 | Complete | Pre-existing |
| 3. Unit Preferences | v1.x | 3/3 | Complete | Pre-existing |
| 4. Popup UI | v1.x | 2/2 | Complete | Pre-existing |
| 5. Foundation Modules | v1.3 | 3/3 | Complete | 2026-03-02 |
| 6. Clipboard Copy and AI Launch | v1.3 | 2/2 | Complete | 2026-03-02 |
| 7. Options Page and Custom Prompts | v1.3 | 3/3 | Complete | 2026-03-03 |
| 1. Add setting for hitting surface selection | v1.4 | 2/2 | Complete | 2026-03-03 |
| 8. Gemini Launch and Keyboard Shortcut | 1/1 | Complete   | 2026-03-03 | - |
| 9. Dark Mode CSS Foundation | 2/2 | Complete   | 2026-03-03 | - |
| 10. Empty State Guidance | 1/1 | Complete    | 2026-03-03 | - |
| 11. Export Format Toggle | 1/1 | Complete   | 2026-03-03 | - |
| 12. Prompt Preview | v1.5 | 0/TBD | Not started | - |

---
*Roadmap created: 2026-03-02*
*v1.x phases reflect pre-existing implementation — all 12 v1 requirements complete*
*v1.3 shipped: 2026-03-03 — 13 requirements across phases 5-7*
*v1.4 shipped: 2026-03-03 — hitting surface metadata in all output paths*
*v1.5 phases added: 2026-03-02 — 6 requirements across phases 8-12*
