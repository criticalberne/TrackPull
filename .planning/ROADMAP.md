# Roadmap: TrackPull

## Milestones

- ✅ **v1.x Core Extension** - Phases 1-4 (shipped before 2026-03-02)
- 📋 **v1.3 Export & AI** - Phases 5-7 (in progress)

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

## Phase Details

### Phase 5: Foundation Modules
**Goal**: Shared TypeScript modules for TSV export and prompt assembly are tested and ready for popup integration
**Depends on**: Phase 4
**Requirements**: PRMT-01
**Success Criteria** (what must be TRUE):
  1. All 7+ built-in golf prompts are bundled as TypeScript constants and accessible by name and skill tier
  2. A TSV writer converts SessionData into a tab-separated string that pastes correctly into Google Sheets and Excel
  3. A prompt builder assembles a final prompt+data payload string from any prompt template and TSV data
  4. Unit tests cover TSV edge cases (field values containing tabs, newlines, or commas) and pass in CI
**Plans**:

Plans:
- [ ] 05-A: TSV Writer Module (wave 1)
- [ ] 05-B: Prompt Library Types and Constants (wave 1)
- [ ] 05-C: Prompt Builder Module (wave 2, depends on 05-A + 05-B)

### Phase 6: Clipboard Copy and AI Launch
**Goal**: Users can copy their shot data and launch AI analysis in one click from the popup
**Depends on**: Phase 5
**Requirements**: CLIP-01, CLIP-02, CLIP-03, AILN-01, AILN-02, AILN-03, AILN-04, PRMT-02, PREF-01
**Success Criteria** (what must be TRUE):
  1. User clicks "Copy to Clipboard" and can paste tab-separated shot data with column headers directly into a spreadsheet
  2. A toast confirmation appears in the popup after every clipboard copy so the user knows the data is ready
  3. User selects a built-in prompt from a skill-tiered dropdown and clicks "Open in AI" — the assembled prompt+data is copied to clipboard and ChatGPT or Claude opens in a new tab
  4. User clicks "Copy Prompt + Data" and the full AI payload is on the clipboard without any new tab opening
  5. User sets a default AI service preference in the popup and it is remembered on next open
**Plans**: 2 plans

Plans:
- [ ] 06-01: Config, constants, and popup HTML/CSS layout (wave 1)
- [ ] 06-02: Popup TypeScript logic -- clipboard handlers, AI launch, preference persistence (wave 2)

### Phase 7: Options Page and Custom Prompts
**Goal**: Users can create, edit, and delete their own prompt templates in a dedicated settings page
**Depends on**: Phase 6
**Requirements**: PRMT-03, PRMT-04, PREF-02
**Success Criteria** (what must be TRUE):
  1. User opens the options page from the popup and sees all built-in prompts listed (read-only) and any custom prompts they have saved
  2. User creates a new custom prompt with a name and body, saves it, and it immediately appears in the popup prompt selector
  3. User edits an existing custom prompt and the updated version is reflected in the popup on next open
  4. User deletes a custom prompt and it is removed from both the options page and the popup selector
**Plans**: 3 plans

Plans:
- [ ] 07-01: Shared infrastructure -- CustomPrompt type, storage CRUD helpers, broadened assemblePrompt, manifest options_ui, build script wiring (wave 1)
- [ ] 07-02: Options page HTML/CSS layout and TypeScript CRUD logic for custom prompts and AI preference (wave 2)
- [ ] 07-03: Popup refactor -- dynamic prompt select rendering, gear icon, PromptItem lookup (wave 2, parallel with 07-02)

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Data Capture | v1.x | 5/5 | Complete | Pre-existing |
| 2. CSV Export | v1.x | 2/2 | Complete | Pre-existing |
| 3. Unit Preferences | v1.x | 3/3 | Complete | Pre-existing |
| 4. Popup UI | v1.x | 2/2 | Complete | Pre-existing |
| 5. Foundation Modules | 3/3 | Complete    | 2026-03-02 | - |
| 6. Clipboard Copy and AI Launch | 2/2 | Complete   | 2026-03-02 | - |
| 7. Options Page and Custom Prompts | 1/3 | In Progress|  | - |

---
*Roadmap created: 2026-03-02*
*v1.x phases reflect pre-existing implementation — all 12 v1 requirements complete*
*v1.3 phases added: 2026-03-02 — 12 requirements mapped across phases 5-7*
