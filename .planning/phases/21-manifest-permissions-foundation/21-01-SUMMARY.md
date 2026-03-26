---
phase: 21-manifest-permissions-foundation
plan: 01
subsystem: permissions
tags: [chrome-extension, manifest-v3, optional-permissions, chrome.permissions]

requires:
  - phase: none
    provides: existing manifest and popup/service worker structure
provides:
  - optional_host_permissions declaration for portal domains
  - portalPermissions.ts shared module (hasPortalPermission, requestPortalPermission, PORTAL_ORIGINS)
  - popup portal section with permission-gated denied/ready UI states
  - service worker PORTAL_IMPORT_REQUEST guard
affects: [22-graphql-client, 23-portal-auth, 24-portal-import, 25-portal-ui]

tech-stack:
  added: []
  patterns: [optional-permissions-pattern, permission-gated-ui]

key-files:
  created:
    - src/shared/portalPermissions.ts
    - tests/test_portal_permissions.ts
  modified:
    - src/manifest.json
    - src/popup/popup.html
    - src/popup/popup.ts
    - src/background/serviceWorker.ts
    - tests/test_permissions_minimal.py
    - dist/

key-decisions:
  - "Portal domains in optional_host_permissions (not host_permissions) to avoid install-time escalation"
  - "PORTAL_ORIGINS array mirrors manifest exactly — single source of truth for permission checks"
  - "Import button checks and requests permission inline (D-01) rather than pre-explanation flow"

patterns-established:
  - "Permission-gated UI: renderPortalSection(granted) toggles denied/ready states"
  - "Service worker permission guard: check hasPortalPermission() before any portal API call"
  - "Reactive permission listeners: chrome.permissions.onAdded/onRemoved update UI live"

requirements-completed: [PERM-01]

duration: 5min
completed: 2026-03-26
---

# Phase 21: Manifest Permissions Foundation Summary

**Optional host permissions for portal domains with permission-gated popup UI and service worker guard**

## Performance

- **Duration:** ~5 min
- **Tasks:** 2
- **Files modified:** 7 source + dist rebuild

## Accomplishments
- Manifest declares portal domains as optional_host_permissions (no install-time warning)
- portalPermissions.ts module shared by popup and service worker
- Popup shows Import from Portal button (ready state) or Grant Access button (denied state)
- Service worker guards PORTAL_IMPORT_REQUEST with permission check
- All 292 vitest tests + 5 pytest tests pass

## Task Commits

1. **Task 1: Manifest, permissions module, and tests** - `0f86881` (feat)
2. **Task 2: Popup portal section, service worker guard, and build** - `76c6d58` (feat)

## Files Created/Modified
- `src/manifest.json` - Added optional_host_permissions array
- `src/shared/portalPermissions.ts` - New permission helper module
- `src/popup/popup.html` - Portal section with denied/ready states
- `src/popup/popup.ts` - Permission check on open, request on click, reactive listeners
- `src/background/serviceWorker.ts` - PortalImportRequest type and permission guard
- `tests/test_permissions_minimal.py` - Updated for new manifest shape
- `tests/test_portal_permissions.ts` - New tests for PORTAL_ORIGINS and manifest sync

## Decisions Made
- Portal domains in optional_host_permissions per D-01/PERM-01 to avoid Chrome disabling extension on update
- PORTAL_ORIGINS values match manifest strings exactly (including trailing /*) per Research Pitfall 2
- Import button requests permission on first click (D-01) — no pre-explanation dialog (D-02)

## Deviations from Plan
None - plan executed exactly as written

## Issues Encountered
- pytest not installed — installed via pip3 with --break-system-packages flag

## Next Phase Readiness
- Permission foundation complete for phases 22-25 to build on
- portalPermissions.ts ready to import in GraphQL client and portal auth phases

---
*Phase: 21-manifest-permissions-foundation*
*Completed: 2026-03-26*
