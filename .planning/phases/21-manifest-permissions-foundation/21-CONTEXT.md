# Phase 21: Manifest and Permissions Foundation - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Extension gains the ability to request portal API access at runtime without disrupting existing users on update. This phase delivers manifest changes (`optional_host_permissions`) and a `chrome.permissions.request()` flow — no GraphQL client, no data fetching, no UI beyond the permission grant/denial states.

</domain>

<decisions>
## Implementation Decisions

### Permission Request Trigger
- **D-01:** Permission request fires on first "Import from Portal" click — natural context, user understands why the permission is needed
- **D-02:** No pre-explanation UI before the Chrome dialog — just the native Chrome permission prompt, keep it simple

### Permission Denial UX
- **D-03:** On denial, show an inline message in the portal section with a "Grant Access" button to re-trigger the request. Non-blocking — rest of extension works normally
- **D-04:** Denial message persists until permission is granted — every popup open shows the message with "Grant Access" button in the portal section, providing a clear signal that portal features need permission

### Permission State Checking
- **D-05:** Use `chrome.permissions.contains()` every time the popup opens or portal features are accessed — always authoritative, no stale state risk
- **D-06:** Service worker also checks `chrome.permissions.contains()` before any portal API call — defense in depth, prevents edge cases where popup state could be stale

### Claude's Discretion
- Exact wording of the denial/grant message
- Whether to use `chrome.permissions.onAdded` / `chrome.permissions.onRemoved` listeners for reactive UI updates
- Internal code organization for the permissions helper module

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Manifest & Permissions
- `src/manifest.json` — Current manifest; must be modified to add `optional_host_permissions`
- `.planning/REQUIREMENTS.md` §PERM-01 — Requirement that existing users are not disrupted on update

### Architecture
- `.planning/codebase/ARCHITECTURE.md` — Extension architecture overview (service worker, popup, content scripts, worlds)
- `.planning/codebase/CONVENTIONS.md` — Code conventions and patterns
- `.planning/codebase/STRUCTURE.md` — File layout

### Existing Code
- `src/popup/popup.ts` — Popup entry point where portal section UI and permission check will live
- `src/background/serviceWorker.ts` — Service worker where permission guard for portal API calls will go

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/popup/popup.ts` — Existing popup with DOM event handling patterns; portal section will follow same patterns
- `src/shared/styles.css` — CSS custom properties for theming; denial/grant messages should use existing `--color-*` tokens
- Dark mode already handled via `@media (prefers-color-scheme: dark)` — new UI elements inherit this automatically

### Established Patterns
- Message-based IPC between popup and service worker via `chrome.runtime.sendMessage`
- Pre-fetch pattern in popup: cache storage reads at DOMContentLoaded
- Status messages use CSS classes (not inline styles) for dark mode support

### Integration Points
- `src/manifest.json` — Add `optional_host_permissions` array for portal domains
- `src/popup/popup.ts` — Add portal section with permission-gated UI
- `src/background/serviceWorker.ts` — Add permission check guard for future portal API handlers

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

*Phase: 21-manifest-permissions-foundation*
*Context gathered: 2026-03-26*
