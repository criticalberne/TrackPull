---
phase: 22-graphql-client-cookie-auth
plan: 02
subsystem: popup-ui

tags: [graphql, popup, service-worker, auth-check, three-state-ui, cookie-auth]

# Dependency graph
requires:
  - phase: 22-graphql-client-cookie-auth
    plan: 01
    provides: graphql_client.ts with executeQuery, classifyAuthResult, HEALTH_CHECK_QUERY
  - phase: 21-manifest-permissions-foundation
    provides: portalPermissions.ts with hasPortalPermission/requestPortalPermission

provides:
  - PORTAL_AUTH_CHECK message handler in serviceWorker.ts
  - Three-state portal section UI in popup (denied/not-logged-in/ready/error)
  - portal-not-logged-in div with portal login link
  - portal-error div with inline error message

affects: [23-session-fetching, 24-session-import]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "PortalState string union drives single renderPortalSection function instead of boolean"
    - "PORTAL_AUTH_CHECK IPC pattern: popup sends, service worker checks permission then queries GraphQL, maps to status string"
    - "stateMap Record<string, PortalState> translates service worker status strings to UI state"
    - "chrome.runtime.sendMessage wrapped in Promise for async/await in popup DOMContentLoaded"

key-files:
  created: []
  modified:
    - src/background/serviceWorker.ts
    - src/popup/popup.ts
    - src/popup/popup.html

key-decisions:
  - "PortalState union over boolean — extends cleanly to four states without additional parameters"
  - "PORTAL_AUTH_CHECK returns status string (denied/unauthenticated/authenticated/error) — service worker vocabulary; popup maps to PortalState via stateMap"
  - "portal-login-link click handler opens portal.trackmangolf.com in new tab — consistent with AI link pattern"
  - "stateMap lookup with ?? error fallback — unknown status strings degrade to error state safely"

# Metrics
duration: 2min
completed: 2026-03-26
---

# Phase 22 Plan 02: PORTAL_AUTH_CHECK handler, three-state portal section, and not-logged-in UX

**Service worker PORTAL_AUTH_CHECK handler using graphql_client health-check query, wired to popup three-state renderPortalSection (denied/not-logged-in/ready/error) with login link for unauthenticated users**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-26T22:33:20Z
- **Completed:** 2026-03-26T22:35:54Z
- **Tasks:** 2 complete (Task 1: auto — implementation; Task 2: human-verify — all three portal states confirmed against live Trackman portal)
- **Files modified:** 3 (+ 2 dist files rebuilt)

## Accomplishments

- Added `PORTAL_AUTH_CHECK` message handler in `serviceWorker.ts`: checks `hasPortalPermission()` first (returns `denied` if not granted), then calls `executeQuery(HEALTH_CHECK_QUERY)` via `classifyAuthResult`, maps auth status to response status string
- Refactored `renderPortalSection` in `popup.ts` from `(granted: boolean)` to `(state: PortalState, errorMsg?: string)` — supports four mutually exclusive states
- Replaced old `hasPortalPermission()` + `renderPortalSection(granted)` call with `PORTAL_AUTH_CHECK` message to service worker on every popup open
- Updated all four existing `renderPortalSection` call sites to use PortalState strings
- Added `portal-not-logged-in` div with `portal-login-link` anchor and `portal-error` div with `portal-error-msg` paragraph to `popup.html`
- Added click handler for `portal-login-link` that opens `portal.trackmangolf.com` in new tab
- Build succeeded, all 308 tests pass (zero regressions)

## Task Commits

1. **feat(22-02): wire PORTAL_AUTH_CHECK into service worker and popup three-state UI** — `01c6efc`

## Files Created/Modified

- `src/background/serviceWorker.ts` — new `PortalAuthCheckRequest` interface, `PORTAL_AUTH_CHECK` handler with permission gate and GraphQL health-check, import of executeQuery/classifyAuthResult/HEALTH_CHECK_QUERY
- `src/popup/popup.ts` — `PortalState` type, refactored `renderPortalSection`, `PORTAL_AUTH_CHECK` IPC on popup open, `stateMap` translation, portal login link handler, updated four call sites
- `src/popup/popup.html` — added `portal-not-logged-in` div with `portal-login-link`, `portal-error` div with `portal-error-msg`

## Decisions Made

- `PortalState` string union (`"denied" | "not-logged-in" | "ready" | "error"`) over boolean — cleanly extends to four states, self-documenting at call sites
- Service worker returns status strings from its own vocabulary (`authenticated`, `unauthenticated`, `denied`, `error`); popup maps to PortalState via `stateMap` — keeps service worker agnostic of popup state names
- `stateMap[status] ?? "error"` fallback — unknown status degrades safely to error state
- Login link uses `chrome.tabs.create` consistent with existing AI service tab-open pattern

## Deviations from Plan

None — plan executed exactly as written.

## Checkpoint Status

Task 2 (`checkpoint:human-verify`) — VERIFIED by human:
- All three portal states confirmed working against live Trackman portal
- Denied state: shows "Portal access is required" with Grant Access button
- Not-logged-in state: shows "Log into portal.trackmangolf.com to import sessions" with clickable link that opens portal in new tab
- Authenticated (ready) state: shows "Import from Portal" button
- No unhandled errors in service worker console

## Known Stubs

None. The three-state UI is fully wired. The Import button in `portal-ready` state still calls a stub (`console.log("Portal import — not yet implemented")`) but that is expected — Phase 24 implements the actual import flow.

---
*Phase: 22-graphql-client-cookie-auth*
*Completed: 2026-03-26*
