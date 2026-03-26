# Phase 22: GraphQL Client and Cookie Auth - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Authenticated GraphQL communication is established and verified against the live Trackman API from the service worker. This phase delivers `graphql_client.ts` with typed query execution, a health-check query for auth detection, and popup UX for not-logged-in and error states. No activity fetching, no data parsing, no session import — those are phases 23-25.

</domain>

<decisions>
## Implementation Decisions

### Auth Check Timing
- **D-01:** Auth check (health-check query `{ me { id } }`) fires every time the popup opens, alongside the existing permission check from Phase 21. User sees login status immediately — no surprise failures on Import click.

### Not-Logged-In UX
- **D-02:** Show an inline message in the portal section: "Log into portal.trackmangolf.com to import sessions" with a clickable link that opens the portal login page in a new tab. Consistent with Phase 21's inline denial pattern (D-03/D-04).
- **D-03:** The portal section shows three mutually exclusive states: permission-denied (from Phase 21), not-logged-in (new), and ready. Permission check gates first; auth check only runs if permission is granted.

### Error Feedback
- **D-04:** GraphQL and network errors (beyond auth) are shown inline in the portal section — same location as auth messages. No toast, no modal.
- **D-05:** Detailed errors are also logged to console for debugging. User-facing messages are kept simple (e.g., "Unable to reach Trackman — try again later").

### Cookie Auth Strategy
- **D-06:** Claude's Discretion — researcher should investigate what Trackman's GraphQL endpoint at `api.trackmangolf.com/graphql` actually requires (cookies, headers, CSRF tokens) and pick the simplest approach that works. Ambient browser cookies via `fetch()` with credentials is the starting assumption, but adapt based on findings.

### Claude's Discretion
- Exact GraphQL client API shape (generic execute function vs named methods)
- Error type hierarchy and classification logic
- How to distinguish auth failure from other GraphQL errors in the response
- Whether health-check result should be cached briefly or always fresh

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Permissions & Auth Foundation
- `src/shared/portalPermissions.ts` — `hasPortalPermission()`, `requestPortalPermission()`, `PORTAL_ORIGINS` constants
- `src/background/serviceWorker.ts` lines 129-140 — `PORTAL_IMPORT_REQUEST` handler stub (Phase 22 replaces this)
- `.planning/REQUIREMENTS.md` §PERM-02 — Authenticated GraphQL requests using browser session cookies
- `.planning/REQUIREMENTS.md` §PERM-03 — Clear message when not logged in
- `.planning/REQUIREMENTS.md` §RESIL-03 — Parser handles missing/null/unexpected fields gracefully

### Existing Portal UI
- `src/popup/popup.html` lines 559-572 — Portal section HTML with `portal-denied`, `portal-ready` divs
- `src/popup/popup.ts` lines 168-171 — `renderPortalSection()` function, permission check on popup open
- `src/popup/popup.ts` lines 340-346 — Portal permission check and import button wiring

### Architecture & Conventions
- `.planning/codebase/ARCHITECTURE.md` — Extension architecture (service worker, popup, content scripts)
- `.planning/codebase/CONVENTIONS.md` — Naming patterns, import organization, code style
- `.planning/codebase/STRUCTURE.md` — File layout

### Prior Phase Context
- `.planning/phases/21-manifest-permissions-foundation/21-CONTEXT.md` — Permission decisions D-01 through D-06

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/shared/portalPermissions.ts` — Permission helpers shared by popup and service worker; new auth module can follow same pattern
- `src/shared/constants.ts` — Already has `"graphql"` in constants (line 128)
- `src/shared/styles.css` — CSS custom properties for theming; error/status messages should use existing `--color-*` tokens
- Dark mode via `@media (prefers-color-scheme: dark)` — new UI elements inherit automatically

### Established Patterns
- Message-based IPC: popup ↔ service worker via `chrome.runtime.sendMessage` / `onMessage`
- Pre-fetch on popup open: existing pattern of checking state at `DOMContentLoaded`
- Error handling: try/catch with `sendResponse({ success: false, error: string })` pattern in service worker
- Status messages: CSS classes (not inline styles) for dark mode support

### Integration Points
- `src/background/serviceWorker.ts` — Replace `PORTAL_IMPORT_REQUEST` stub with real GraphQL client calls
- `src/popup/popup.ts` — Add auth check on popup open, add not-logged-in state rendering
- `src/popup/popup.html` — Add `portal-not-logged-in` div alongside existing `portal-denied` / `portal-ready`
- New file: `src/shared/graphql_client.ts` — GraphQL client module (per success criterion #3)

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 22-graphql-client-cookie-auth*
*Context gathered: 2026-03-26*
