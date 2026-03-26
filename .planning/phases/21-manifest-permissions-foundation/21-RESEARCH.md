# Phase 21: Manifest and Permissions Foundation - Research

**Researched:** 2026-03-26
**Domain:** Chrome MV3 optional_host_permissions + chrome.permissions API
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Permission request fires on first "Import from Portal" click — natural context, user understands why the permission is needed
- **D-02:** No pre-explanation UI before the Chrome dialog — just the native Chrome permission prompt, keep it simple
- **D-03:** On denial, show an inline message in the portal section with a "Grant Access" button to re-trigger the request. Non-blocking — rest of extension works normally
- **D-04:** Denial message persists until permission is granted — every popup open shows the message with "Grant Access" button in the portal section, providing a clear signal that portal features need permission
- **D-05:** Use `chrome.permissions.contains()` every time the popup opens or portal features are accessed — always authoritative, no stale state risk
- **D-06:** Service worker also checks `chrome.permissions.contains()` before any portal API call — defense in depth, prevents edge cases where popup state could be stale

### Claude's Discretion
- Exact wording of the denial/grant message
- Whether to use `chrome.permissions.onAdded` / `chrome.permissions.onRemoved` listeners for reactive UI updates
- Internal code organization for the permissions helper module

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PERM-01 | Extension requests portal API access at runtime via `optional_host_permissions` — existing users are not disrupted on update | Confirmed: optional_host_permissions never disables extension on update; chrome.permissions.request() triggers user dialog at runtime |
</phase_requirements>

---

## Summary

Phase 21 adds `optional_host_permissions` for `api.trackmangolf.com` and `portal.trackmangolf.com` to the manifest, implements a `chrome.permissions` helper module, and wires up the portal section in the popup UI with permission-gated state. The manifest change is the critical safety gate: moving new host permissions into `optional_host_permissions` instead of `host_permissions` means Chrome will never disable the extension for existing v1.5.x users on update, because optional permissions never trigger privilege escalation warnings.

The `chrome.permissions` API is straightforward: `request()` must be called from a user gesture (a button click handler), takes a `Permissions` object with an `origins` array, and returns a boolean Promise. `contains()` is the authoritative state check — it queries Chrome's live permission store, never returns stale state, and can be called anywhere including the service worker. Both methods are available in MV3 service workers and popup contexts.

The entire implementation is pure TypeScript in two existing files (`src/manifest.json`, `src/popup/popup.ts`, `src/background/serviceWorker.ts`) plus one new shared module (`src/shared/portalPermissions.ts`). No new dependencies. The build process (esbuild via `scripts/build-extension.sh`) requires no changes — `portalPermissions.ts` will be imported by both popup and service worker and bundled automatically.

**Primary recommendation:** Create `src/shared/portalPermissions.ts` as a thin wrapper around `chrome.permissions.request()` and `chrome.permissions.contains()`, import it in popup and service worker, and add the portal section HTML directly in `popup.html` using existing CSS tokens. No new files beyond the permissions module.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `chrome.permissions` API | Built-in (MV3) | Runtime permission grant/check/event | The only mechanism Chrome exposes for optional permission management |
| TypeScript | Already in project | Type-safe implementation | Project already uses TypeScript throughout |
| esbuild | Already in project | Bundle `portalPermissions.ts` into popup.js and background.js | Same bundler used for all existing modules |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `chrome.permissions.onAdded` | Built-in (MV3) | Reactive UI update when permission granted | Use if implementing live popup refresh; adds resilience when user grants via Chrome settings rather than via "Grant Access" button |

**No new npm dependencies required for this phase.**

---

## Architecture Patterns

### Recommended Project Structure Addition
```
src/
├── shared/
│   └── portalPermissions.ts    # NEW: thin wrapper for chrome.permissions API
├── popup/
│   ├── popup.ts                # MODIFIED: add portal section + permission check
│   └── popup.html              # MODIFIED: add portal section HTML
├── background/
│   └── serviceWorker.ts        # MODIFIED: add permission guard + request type
└── manifest.json               # MODIFIED: add optional_host_permissions
```

### Pattern 1: Manifest optional_host_permissions Declaration

**What:** Two portal domains declared in `optional_host_permissions`, not `host_permissions`. The existing `host_permissions` entry for `web-dynamic-reports.trackmangolf.com` remains unchanged.

**When to use:** Any host permission that should not block extension install/update for existing users.

```json
// src/manifest.json — add alongside existing host_permissions
{
  "host_permissions": ["https://web-dynamic-reports.trackmangolf.com/*"],
  "optional_host_permissions": [
    "https://api.trackmangolf.com/*",
    "https://portal.trackmangolf.com/*"
  ]
}
```

**Confidence:** HIGH — verified against official Chrome docs.

### Pattern 2: Permissions Helper Module

**What:** A single shared module that encapsulates all `chrome.permissions` calls so popup and service worker both reference the same patterns.

**When to use:** Anytime more than one file needs to check or request the same permission set.

```typescript
// src/shared/portalPermissions.ts
// Source: https://developer.chrome.com/docs/extensions/reference/api/permissions

const PORTAL_ORIGINS: string[] = [
  "https://api.trackmangolf.com/*",
  "https://portal.trackmangolf.com/*",
];

/** Returns true if portal host permissions are currently granted. */
export async function hasPortalPermission(): Promise<boolean> {
  return chrome.permissions.contains({ origins: PORTAL_ORIGINS });
}

/**
 * Requests portal host permissions from the user.
 * MUST be called from a user gesture (button click handler).
 * Returns true if granted, false if denied.
 */
export async function requestPortalPermission(): Promise<boolean> {
  return chrome.permissions.request({ origins: PORTAL_ORIGINS });
}
```

### Pattern 3: Popup Permission Check on Open (D-05)

**What:** Call `hasPortalPermission()` at DOMContentLoaded to determine initial portal section state. Do not cache the result — re-check on every popup open.

**When to use:** Per D-05, always check live state rather than storing a cached boolean.

```typescript
// Inside DOMContentLoaded async handler in src/popup/popup.ts
const portalGranted = await hasPortalPermission();
renderPortalSection(portalGranted);
```

### Pattern 4: Permission Request from Button Click (D-01, D-02)

**What:** The "Import from Portal" button click fires `requestPortalPermission()` directly. If denied, transition to denial state per D-03.

**When to use:** The user gesture constraint makes this the only valid call site.

```typescript
// Button click handler — must be synchronous entry point into async request
importPortalBtn.addEventListener("click", async () => {
  const granted = await requestPortalPermission();
  if (granted) {
    // proceed to portal import (Phase 24)
    renderPortalSection(true);
  } else {
    renderPortalDenied();
  }
});
```

**Critical constraint:** `chrome.permissions.request()` must be invoked within the call stack of the click event. Calling it in a `setTimeout`, after an `await` that crosses a task boundary from a non-gesture context, or from the service worker directly will silently fail or throw. The click handler itself is the user gesture — the `await` inside is fine as long as the `request()` call is reached synchronously from that handler's invocation.

### Pattern 5: Service Worker Permission Guard (D-06)

**What:** Any service worker message handler that will eventually call the portal API checks `hasPortalPermission()` before proceeding.

**When to use:** Any message type added for portal data fetching (Phase 22+).

```typescript
// serviceWorker.ts — guard for future PORTAL_* message handlers
if (message.type === "PORTAL_IMPORT_REQUEST") {
  const granted = await hasPortalPermission();
  if (!granted) {
    sendResponse({ success: false, error: "Portal permission not granted" });
    return;
  }
  // ... proceed (Phase 22)
  return true;
}
```

### Pattern 6: Reactive UI via onAdded (Claude's Discretion)

**What:** Register `chrome.permissions.onAdded` in the popup to detect when permission is granted via means other than the "Grant Access" button (e.g., the user visits chrome://extensions and grants it manually).

**Recommendation:** Include it. It closes an edge case at essentially zero cost: one event listener that calls `renderPortalSection(true)` when the permission appears. Without it, a user who grants via chrome://extensions would see a stale denial UI until the next popup open.

```typescript
// Inside DOMContentLoaded in popup.ts
chrome.permissions.onAdded.addListener((permissions) => {
  const portalOriginsGranted = PORTAL_ORIGINS.some(
    origin => permissions.origins?.includes(origin)
  );
  if (portalOriginsGranted) {
    renderPortalSection(true);
  }
});
```

### Anti-Patterns to Avoid

- **Storing permission state in chrome.storage:** D-05 explicitly rejects this. `chrome.permissions.contains()` is always authoritative and fast — do not cache a boolean in storage and risk stale state.
- **Calling `request()` outside a user gesture:** Chrome will silently reject the call. The `chrome.permissions.request()` call must be reachable synchronously from an event handler for a user interaction (click, keypress, etc.).
- **Declaring portal domains in `host_permissions`:** This would disable existing users on update — the exact scenario PERM-01 prohibits.
- **Calling `request()` from the service worker:** The service worker has no user gesture context. Permission requests must originate from the popup (the only interactive UI context). The service worker only ever *checks* permissions, never requests them.
- **Using wildcard `https://*/*` in optional_host_permissions:** Unnecessarily broad; declare only the two specific portal domains.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Permission state management | A custom permission cache in chrome.storage | `chrome.permissions.contains()` on every check | Chrome's API is always authoritative; caching introduces staleness bugs |
| Runtime permission dialog | A custom HTML modal | `chrome.permissions.request()` with native Chrome dialog | Chrome policy requires native dialog; custom modals cannot grant real permissions |
| Permission change listeners | Polling `contains()` on a timer | `chrome.permissions.onAdded` / `onRemoved` | Native events are immediate and zero-cost |

---

## Common Pitfalls

### Pitfall 1: User Gesture Constraint for `request()`
**What goes wrong:** `chrome.permissions.request()` is called outside a user gesture context (e.g., on DOMContentLoaded, in a `setTimeout`, or from a message handler in the service worker). Chrome silently rejects the call and returns `false` without showing any dialog.

**Why it happens:** Chrome enforces that permission grants require explicit user intent. Any async gap that crosses a task boundary from a non-gesture origin breaks the gesture association.

**How to avoid:** Wire the `request()` call directly to a button's `click` event listener. The `await` inside the handler is fine; what matters is that the click event is the genesis of the call stack.

**Warning signs:** `request()` returns `false` immediately without any dialog appearing, even the first time.

### Pitfall 2: Origins Array Format
**What goes wrong:** Passing `"https://api.trackmangolf.com"` (no trailing wildcard) instead of `"https://api.trackmangolf.com/*"` causes `contains()` to return `false` even after the permission is granted, because the origin patterns must match exactly as declared in `optional_host_permissions`.

**Why it happens:** Chrome compares origins as patterns. The manifest declares `"https://api.trackmangolf.com/*"` — the `contains()` and `request()` calls must use the identical pattern string.

**How to avoid:** Define `PORTAL_ORIGINS` as a constant in `portalPermissions.ts` and use that constant everywhere — manifest declaration AND API calls share the same strings.

**Warning signs:** `contains()` returns `false` after a `request()` that returned `true`.

### Pitfall 3: Existing Test `test_permissions_minimal.py` Will Fail
**What goes wrong:** The test at `tests/test_permissions_minimal.py` asserts `permissions == {"storage"}` only. The current v1.5.3 manifest already has `"downloads"` and `"clipboardWrite"` in permissions (the test's assertion for `{"storage"}` only is already stale relative to the actual manifest). Adding `optional_host_permissions` does not touch `permissions[]`, so this test's failure is pre-existing. However, if any test asserts there is no `optional_host_permissions` key in the manifest, it will need updating.

**How to avoid:** After adding `optional_host_permissions`, update `test_permissions_minimal.py` to also assert the presence of `optional_host_permissions` with the two portal domains. The test for `permissions` equality will need to be updated to reflect the current actual set.

**Warning signs:** `npx vitest run` or `pytest` fails on permissions assertions after the manifest change.

### Pitfall 4: `request()` Behavior in Popup vs Service Worker
**What goes wrong:** Attempting to call `chrome.permissions.request()` from a service worker message handler. The service worker has no user gesture context — the call will fail.

**Why it happens:** Permission requests require a foreground page (popup) as the origin of the user gesture.

**How to avoid:** The popup calls `requestPortalPermission()` on button click. The service worker only ever calls `hasPortalPermission()` (i.e., `contains()`).

### Pitfall 5: Update Behavior — `optional_host_permissions` vs `host_permissions`
**What goes wrong:** Developer accidentally puts portal domains in `host_permissions`. On update, Chrome detects a privilege increase (new host warnings), disables the extension for existing users, and shows a re-enable prompt.

**Why it doesn't happen with optional:** Adding entries to `optional_host_permissions` never generates privilege escalation warnings for existing users. Chrome's update logic only escalates on new `host_permissions` or `permissions` entries that produce new warning messages. Optional permissions are excluded from this check.

---

## Code Examples

### Manifest Change
```json
// src/manifest.json (complete relevant section)
{
  "manifest_version": 3,
  "permissions": ["storage", "downloads", "clipboardWrite"],
  "host_permissions": ["https://web-dynamic-reports.trackmangolf.com/*"],
  "optional_host_permissions": [
    "https://api.trackmangolf.com/*",
    "https://portal.trackmangolf.com/*"
  ]
}
```

### Portal Permissions Module
```typescript
// src/shared/portalPermissions.ts
// Source: https://developer.chrome.com/docs/extensions/reference/api/permissions

export const PORTAL_ORIGINS: readonly string[] = [
  "https://api.trackmangolf.com/*",
  "https://portal.trackmangolf.com/*",
] as const;

export async function hasPortalPermission(): Promise<boolean> {
  return chrome.permissions.contains({ origins: [...PORTAL_ORIGINS] });
}

// Must be called from a user gesture (click handler).
export async function requestPortalPermission(): Promise<boolean> {
  return chrome.permissions.request({ origins: [...PORTAL_ORIGINS] });
}
```

### Popup Portal Section HTML (inline in popup.html)
```html
<!-- Portal Import section — always rendered, visibility controlled by JS -->
<div id="portal-section" class="ai-section" style="display:none;">
  <h2>Import from Portal</h2>
  <!-- Shown when permission denied (id="portal-denied") -->
  <div id="portal-denied" style="display:none;">
    <p id="portal-denied-msg" style="font-size:13px; color:var(--color-status-error); margin:0 0 8px 0;">
      Portal access is required to import sessions.
    </p>
    <button id="portal-grant-btn" class="btn-primary">Grant Access</button>
  </div>
  <!-- Shown when permission granted (id="portal-ready") -->
  <div id="portal-ready" style="display:none;">
    <button id="portal-import-btn" class="btn-primary">Import from Portal</button>
  </div>
</div>
```

### Popup Permission State Render
```typescript
// Render helper — call on DOMContentLoaded and when permission state changes
function renderPortalSection(granted: boolean): void {
  const section = document.getElementById("portal-section");
  const denied = document.getElementById("portal-denied");
  const ready = document.getElementById("portal-ready");
  if (!section || !denied || !ready) return;

  section.style.display = "block";
  denied.style.display = granted ? "none" : "block";
  ready.style.display = granted ? "block" : "none";
}
```

### Service Worker Permission Guard
```typescript
// serviceWorker.ts — RequestMessage union extension
interface PortalImportRequest {
  type: "PORTAL_IMPORT_REQUEST";
}

// Inside chrome.runtime.onMessage.addListener:
if (message.type === "PORTAL_IMPORT_REQUEST") {
  (async () => {
    const granted = await hasPortalPermission();
    if (!granted) {
      sendResponse({ success: false, error: "Portal permission not granted" });
      return;
    }
    // Phase 22 will fill this body
    sendResponse({ success: false, error: "Not implemented" });
  })();
  return true;
}
```

---

## Runtime State Inventory

> This phase is not a rename/refactor — the Runtime State Inventory section does not apply.

---

## Environment Availability

Step 2.6: SKIPPED — this phase is purely code and config changes. No external tools, services, CLIs, databases, or runtimes beyond the existing project stack (Node.js, esbuild, vitest) are required. All already verified as present in the build environment.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest (installed) + pytest (for manifest tests) |
| Config file | `vitest.config.ts` (include: `tests/test_*.ts`) |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run && python -m pytest tests/ -x -q` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PERM-01 | `optional_host_permissions` declared for portal domains | unit (manifest) | `python -m pytest tests/test_permissions_minimal.py -x -q` | ✅ (needs update) |
| PERM-01 | `host_permissions` does NOT include portal domains | unit (manifest) | `python -m pytest tests/test_permissions_minimal.py -x -q` | ✅ (needs update) |
| PERM-01 | `portalPermissions.ts` exports `hasPortalPermission` and `requestPortalPermission` | unit | `npx vitest run tests/test_portal_permissions.ts` | ❌ Wave 0 |
| PERM-01 | Popup renders portal section correctly based on permission state | unit | `npx vitest run tests/test_portal_permissions.ts` | ❌ Wave 0 |
| PERM-01 | Source and dist manifests stay in sync | unit (manifest) | `python -m pytest tests/test_permissions_minimal.py -x -q` | ✅ (already tests this) |

### Sampling Rate
- **Per task commit:** `npx vitest run`
- **Per wave merge:** `npx vitest run && python -m pytest tests/ -x -q`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/test_portal_permissions.ts` — covers PERM-01 unit assertions for `portalPermissions.ts` module exports and popup render helpers
- [ ] Update `tests/test_permissions_minimal.py` — existing assertions will fail because (a) they assume `permissions == {"storage"}` but the manifest has `downloads` and `clipboardWrite` too, and (b) they need to assert `optional_host_permissions` is present with portal domains and absent from `host_permissions`

---

## Sources

### Primary (HIGH confidence)
- [Chrome Extensions API: chrome.permissions](https://developer.chrome.com/docs/extensions/reference/api/permissions) — `request()`, `contains()`, `onAdded`, `onRemoved`, user gesture requirement, Permissions object shape
- [Chromium Extensions Permissions Docs](https://chromium.googlesource.com/chromium/src/+/lkgr/extensions/docs/permissions.md) — update behavior, privilege escalation rules, optional permissions never disable extension
- [Chrome Declare Permissions](https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions) — `optional_host_permissions` syntax, update behavior for existing users

### Secondary (MEDIUM confidence)
- [Chromium Extensions Group: Optional Host Permissions in MV3](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/EnUmtHWOI9o) — community confirmation of update-safe behavior
- [Manifest v3 Permissions on Update](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/sufxArpz5ZU) — community discussion confirming optional permissions do not escalate on update

---

## Metadata

**Confidence breakdown:**
- Manifest change (optional_host_permissions syntax): HIGH — verified against official Chrome docs
- Update-safe behavior (no disable on update): HIGH — verified against official Chromium source docs and Chrome developer docs
- chrome.permissions.request() user gesture requirement: HIGH — stated explicitly in official API reference
- Service worker cannot call request(): HIGH — user gesture constraint is absolute; no popup = no gesture
- onAdded/onRemoved event details: HIGH — from official API reference
- origins array pattern matching pitfall: MEDIUM — inferred from pattern-matching semantics in Chrome; not a found bug report, but consistent with how Chrome handles URL patterns throughout MV3

**Research date:** 2026-03-26
**Valid until:** 2026-09-26 (stable Chrome APIs; 6-month window reasonable)
