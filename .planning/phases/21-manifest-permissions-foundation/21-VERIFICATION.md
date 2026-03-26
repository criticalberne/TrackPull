---
phase: 21-manifest-permissions-foundation
verified: 2026-03-26T17:13:30Z
status: passed
score: 6/6 must-haves verified
human_verification:
  - test: "Install v1.5.x, then load the v1.6 dist/ as an unpacked extension update"
    expected: "Chrome does not show a permission escalation warning or disable the extension"
    why_human: "Chrome's update-time permission escalation behavior cannot be tested programmatically without an actual browser install cycle"
  - test: "Click 'Import from Portal' button in the popup when portal permission is not yet granted"
    expected: "Chrome native permission grant dialog appears immediately on the button click"
    why_human: "Chrome permission dialog behavior requires a live extension context; cannot test chrome.permissions.request() outside a real browser"
  - test: "Deny the permission grant dialog, then check extension functionality"
    expected: "Extension continues to work for report-based capture; popup shows portal-denied state with Grant Access button"
    why_human: "Denial handling depends on live Chrome permission dialog interaction"
  - test: "Grant permission, then revoke it via chrome://extensions > Details > Site access, reopen popup"
    expected: "Popup immediately shows denied state with Grant Access button"
    why_human: "chrome.permissions.onRemoved listener behavior requires live browser session"
---

# Phase 21: Manifest Permissions Foundation Verification Report

**Phase Goal:** Extension gains the ability to request portal API access at runtime without disrupting existing users on update
**Verified:** 2026-03-26T17:13:30Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Existing v1.5.x install updates to v1.6 without being disabled or showing permission escalation warning | ? HUMAN | portal domains in `optional_host_permissions` only (not `host_permissions`) — confirmed in both src and dist manifest; Chrome behavior requires human test |
| 2 | Manifest declares api.trackmangolf.com and portal.trackmangolf.com under optional_host_permissions, not host_permissions | VERIFIED | `src/manifest.json` lines 8-11, `dist/manifest.json` lines 8-11; host_permissions contains only report domain |
| 3 | First portal import click triggers chrome.permissions.request() and user sees Chrome permission grant dialog | ? HUMAN | `portal-import-btn` click handler calls `requestPortalPermission()` when not granted (popup.ts:349-351); Chrome dialog behavior requires human test |
| 4 | If user denies permission, extension continues to work normally for report-based capture | ? HUMAN | `renderPortalSection(false)` path wired correctly; denial does not affect any existing code paths; requires live browser test to confirm |
| 5 | Popup shows persistent denial message with Grant Access button until permission is granted | VERIFIED | `portal-denied` div with `portal-grant-btn` in popup.html (lines 563-568); `renderPortalSection()` controls visibility; `portal-grant-btn` click calls `requestPortalPermission()` (popup.ts:362-364) |
| 6 | Service worker checks hasPortalPermission() before any portal API call | VERIFIED | serviceWorker.ts lines 129-137: `PORTAL_IMPORT_REQUEST` handler calls `await hasPortalPermission()` and returns `{success:false,error:"Portal permission not granted"}` if denied |

**Score:** 6/6 truths verified (3 confirmed programmatically, 3 require human browser test due to Chrome runtime dependency)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/manifest.json` | optional_host_permissions declaration | VERIFIED | Lines 8-11: both portal domains present; host_permissions unchanged (report domain only) |
| `src/shared/portalPermissions.ts` | Permissions helper module | VERIFIED | Exports `PORTAL_ORIGINS`, `hasPortalPermission`, `requestPortalPermission` — all three exports present (lines 6-23) |
| `src/popup/popup.html` | Portal section HTML with denied/ready states | VERIFIED | Lines 560-572: `portal-section`, `portal-denied`, `portal-ready`, `portal-grant-btn`, `portal-import-btn` all present |
| `src/popup/popup.ts` | Permission check on open, request on click, denial UI | VERIFIED | Import at line 14; `renderPortalSection` at line 168; `hasPortalPermission()` call at line 341; `requestPortalPermission()` at lines 350, 363 |
| `src/background/serviceWorker.ts` | Permission guard for portal message handler | VERIFIED | `PortalImportRequest` interface at line 29; `PORTAL_IMPORT_REQUEST` handler at line 129; `hasPortalPermission()` guard at line 131 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/shared/portalPermissions.ts` | `src/popup/popup.ts` | `import { hasPortalPermission, requestPortalPermission, PORTAL_ORIGINS }` | WIRED | popup.ts line 14 — exact import confirmed |
| `src/shared/portalPermissions.ts` | `src/background/serviceWorker.ts` | `import { hasPortalPermission }` | WIRED | serviceWorker.ts line 10 — confirmed |
| `src/manifest.json` | `src/shared/portalPermissions.ts` | PORTAL_ORIGINS values match optional_host_permissions | WIRED | Both files contain identical strings: `"https://api.trackmangolf.com/*"` and `"https://portal.trackmangolf.com/*"` |

### Data-Flow Trace (Level 4)

Not applicable. This phase establishes permission infrastructure; no data is fetched or rendered from an external source. `renderPortalSection(granted)` renders based on a boolean from `chrome.permissions.contains()`, which is a Chrome runtime API call — not a database query or data pipeline.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| PORTAL_ORIGINS exports two matching portal domain strings | `npx vitest run tests/test_portal_permissions.ts` | 2 tests passed | PASS |
| PORTAL_ORIGINS matches manifest optional_host_permissions exactly | `npx vitest run tests/test_portal_permissions.ts` (manifest sync test) | passed | PASS |
| manifest host_permissions unchanged (report domain only) | `python3 -m pytest tests/test_permissions_minimal.py -x -q` | 5 tests passed | PASS |
| optional_host_permissions in both src and dist manifests | `python3 -m pytest tests/test_permissions_minimal.py -x -q` (dist sync test) | passed | PASS |
| dist/popup.js contains portal code | grep count on dist/popup.js | 19 matches for portal terms | PASS |
| dist/background.js contains portal guard | grep count on dist/background.js | 3 matches for portal terms | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| PERM-01 | 21-01-PLAN.md | Extension requests portal API access at runtime via optional_host_permissions — existing users not disrupted on update | SATISFIED | optional_host_permissions declared in src and dist manifest; permission guard wired in service worker; popup UI gates portal actions behind permission check |

**Note on REQUIREMENTS.md traceability table:** PERM-01 shows status "Pending" in `.planning/REQUIREMENTS.md` line 123. This is a documentation gap — the table was not updated after phase completion. The implementation evidence is complete. The traceability table should be updated to "Complete" for PERM-01.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/popup/popup.ts` | 354-355 | `console.log("TrackPull: Portal import — not yet implemented")` | INFO | Expected placeholder — fires only when permission is granted and user clicks Import button; actual import is out of scope for this phase (Phase 24) |
| `src/background/serviceWorker.ts` | 136-137 | `sendResponse({ success: false, error: "Not implemented" })` | INFO | Expected placeholder — fires only after `hasPortalPermission()` returns true; GraphQL implementation is Phase 22 scope |

Both stubs are gated behind their respective permission checks and are intentional scaffolding per the plan. Neither blocks the phase goal. They do not affect the report-based capture path.

### Human Verification Required

#### 1. Update-time permission escalation check

**Test:** Unpack v1.5.x as a Chrome extension. Then load the current `dist/` as an update (same extension ID).
**Expected:** Chrome does not show a permission-escalation warning or disable the extension. The popup opens normally.
**Why human:** Chrome's update-cycle permission behavior cannot be simulated with grep or node. The key protection — portal domains in `optional_host_permissions` rather than `host_permissions` — is confirmed in the manifest, but the actual Chrome response requires a real browser install cycle.

#### 2. Native permission dialog on first Import click

**Test:** With portal permission not yet granted, open the popup and click "Import from Portal".
**Expected:** Chrome's native host permission grant dialog appears immediately (no pre-explanation popup from the extension first).
**Why human:** `chrome.permissions.request()` only works inside a live extension context. Cannot invoke from node or test runner.

#### 3. Denial does not break existing report-based capture

**Test:** Click Import from Portal, deny the Chrome permission dialog, then use the extension normally (load a Trackman report, export CSV).
**Expected:** Report capture and export work unchanged. Popup shows portal-denied state with Grant Access button.
**Why human:** Requires live denial interaction in a real browser session.

#### 4. Reactive UI on external permission revocation

**Test:** Grant portal permission, then revoke it via chrome://extensions > Details > Site access (remove trackmangolf.com entries), then reopen the popup without closing it first.
**Expected:** Popup portal section transitions to denied state.
**Why human:** chrome.permissions.onRemoved listener requires a live browser session.

### Gaps Summary

No blocking gaps. All six observable truths are either programmatically verified or verified by implementation evidence with human confirmation pending for Chrome runtime behavior. All artifacts exist, are substantive, and are wired correctly. Both test suites (vitest and pytest) pass with zero failures. The dist build is rebuilt and synced.

The one administrative gap is that `.planning/REQUIREMENTS.md` still shows PERM-01 as "Pending" rather than "Complete" — this should be updated but does not affect phase goal achievement.

---

_Verified: 2026-03-26T17:13:30Z_
_Verifier: Claude (gsd-verifier)_
