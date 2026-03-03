---
phase: 11-export-format-toggle
plan: "01"
subsystem: export
tags: [csv-export, popup-ui, storage, chrome-extension]
dependency_graph:
  requires: []
  provides: [include-averages-toggle, INCLUDE_AVERAGES-storage-key]
  affects: [src/shared/constants.ts, src/popup/popup.html, src/popup/popup.ts, src/background/serviceWorker.ts]
tech_stack:
  added: []
  patterns: [chrome.storage.local persistence, boolean storage default pattern]
key_files:
  created:
    - tests/test_csv_writer_averages_toggle.ts
  modified:
    - src/shared/constants.ts
    - src/popup/popup.html
    - src/popup/popup.ts
    - src/background/serviceWorker.ts
decisions:
  - "Default includeAverages to true when storage key is undefined — ensures existing users get same export output as before (backward compatible)"
  - "Boolean(stored) used for explicit boolean conversion from storage — not !! to maintain clarity"
  - "Checkbox not given checked attribute in HTML — TypeScript sets it from storage to avoid flash of incorrect state"
metrics:
  duration: ~2 min
  completed_date: "2026-03-03T14:07:05Z"
  tasks_completed: 2
  files_changed: 4
  files_created: 1
---

# Phase 11 Plan 01: Export Format Toggle Summary

**One-liner:** "Include averages and consistency in export" checkbox in popup with chrome.storage.local persistence wired to writeCsv via service worker storage read.

## What Was Built

Added a user-controlled toggle for whether Average and Consistency summary rows are included in CSV exports. The toggle is a checkbox in the popup UI that persists across sessions. Existing users who never interact with the toggle continue receiving exports with averages included (backward compatible default).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add INCLUDE_AVERAGES storage key and write toggle unit tests | e68a813 | src/shared/constants.ts, tests/test_csv_writer_averages_toggle.ts |
| 2 | Add checkbox to popup and wire storage read in popup + service worker | 0dcddd3 | src/popup/popup.html, src/popup/popup.ts, src/background/serviceWorker.ts |

## Key Changes

**src/shared/constants.ts:** Added `INCLUDE_AVERAGES: "includeAverages"` to the `STORAGE_KEYS` object.

**src/popup/popup.html:**
- Added `.toggle-row` CSS rules (margin, label flex layout, checkbox sizing with accent-color)
- Added `<div class="toggle-row">` with `<input type="checkbox" id="include-averages-checkbox">` placed after `.unit-selectors` and before `#export-row`

**src/popup/popup.ts:**
- Added `STORAGE_KEYS.INCLUDE_AVERAGES` to the `chrome.storage.local.get()` keys array
- Added checkbox initialization: reads stored value (default `true` when undefined), wires `change` event to write boolean to storage

**src/background/serviceWorker.ts:**
- Added `STORAGE_KEYS.INCLUDE_AVERAGES` to the `EXPORT_CSV_REQUEST` handler's storage get call
- Added `includeAverages` variable that reads from storage with `true` default
- Replaced hardcoded `true` in `writeCsv(data, true, ...)` with `writeCsv(data, includeAverages, ...)`

## Tests

Created `tests/test_csv_writer_averages_toggle.ts` with 6 vitest tests:
1. `includeAverages=true` produces rows containing "Average"
2. `includeAverages=true` produces rows containing "Consistency"
3. `includeAverages=false` produces NO rows containing "Average"
4. `includeAverages=false` produces NO rows containing "Consistency"
5. `includeAverages=false` still preserves all individual shot rows
6. `STORAGE_KEYS.INCLUDE_AVERAGES` equals `"includeAverages"`

All 253 tests pass (247 pre-existing + 6 new). Build completes with no errors.

## Decisions Made

- **Default true when undefined:** New users and existing users who have never set the preference get the same behavior as before — averages included. This is backward compatible.
- **Service worker reads from storage directly:** Not passed via message field. Matches existing pattern where service worker reads all preferences (unit choice, surface) from storage in the same `chrome.storage.local.get()` call.
- **No `checked` attribute in HTML:** TypeScript sets `checkbox.checked` from storage. Avoids a flash of incorrect state if storage says `false` but HTML defaulted to checked.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

All created/modified files confirmed present. Both task commits (e68a813, 0dcddd3) confirmed in git history.
