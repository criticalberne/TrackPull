# Phase 22: GraphQL Client and Cookie Auth - Research

**Researched:** 2026-03-26
**Domain:** Chrome MV3 Extension — GraphQL over fetch with browser session cookies
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Auth check (health-check query `{ me { id } }`) fires every time the popup opens, alongside the existing permission check from Phase 21. User sees login status immediately — no surprise failures on Import click.
- **D-02:** Show an inline message in the portal section: "Log into portal.trackmangolf.com to import sessions" with a clickable link that opens the portal login page in a new tab. Consistent with Phase 21's inline denial pattern (D-03/D-04).
- **D-03:** The portal section shows three mutually exclusive states: permission-denied (from Phase 21), not-logged-in (new), and ready. Permission check gates first; auth check only runs if permission is granted.
- **D-04:** GraphQL and network errors (beyond auth) are shown inline in the portal section — same location as auth messages. No toast, no modal.
- **D-05:** Detailed errors are also logged to console for debugging. User-facing messages are kept simple (e.g., "Unable to reach Trackman — try again later").
- **D-06 (Claude's Discretion):** Researcher must determine what `api.trackmangolf.com/graphql` actually requires (cookies, headers, CSRF tokens) and pick the simplest approach. Ambient browser cookies via `fetch()` with `credentials: "include"` is the starting assumption.

### Claude's Discretion

- Exact GraphQL client API shape (generic execute function vs named methods)
- Error type hierarchy and classification logic
- How to distinguish auth failure from other GraphQL errors in the response
- Whether health-check result should be cached briefly or always fresh

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PERM-02 | Extension can make authenticated GraphQL requests to `api.trackmangolf.com/graphql` using the browser's Trackman session cookies | Covered by cookie auth investigation and fetch pattern research |
| PERM-03 | User sees a clear message when they aren't logged into Trackman portal (auth failure feedback) | Covered by GraphQL error discrimination and popup state research |
| RESIL-03 | Parser handles missing, null, or unexpected fields gracefully without crashing | Covered by defensive null handling patterns and TypeScript type guard research |
</phase_requirements>

---

## Summary

Phase 22 delivers `graphql_client.ts` — a zero-dependency TypeScript module that executes authenticated GraphQL POST requests against `api.trackmangolf.com/graphql` using the browser's Trackman session cookies. The approach is a vanilla `fetch()` with `credentials: "include"` and `Content-Type: application/json`. Chrome MV3 service workers can send browser session cookies to `host_permissions` domains when `credentials: "include"` is set; the extension's already-declared `optional_host_permissions` for `api.trackmangolf.com/*` is sufficient. No external GraphQL library is needed — a single generic `executeQuery<T>` function handles POST, error detection, and typed deserialization.

The auth check (`{ me { id } }`) runs in the service worker on demand, triggered by a new `PORTAL_AUTH_CHECK` message from the popup. The popup's `renderPortalSection()` is extended to a three-state renderer: permission-denied → not-logged-in → ready. The service worker replaces the `PORTAL_IMPORT_REQUEST` stub with a real handler that verifies permission, runs the health-check, and responds with auth status so the popup can set state correctly.

GraphQL responses always return HTTP 200; auth failures appear as an `errors` array with `data: null`. The client classifies errors by inspecting `errors[0].extensions?.code` or `errors[0].message` — an "Unauthorized" or `"UNAUTHENTICATED"` code signals not-logged-in vs. other errors being surfaced as generic network/API failures.

**Primary recommendation:** Use `fetch` with `credentials: "include"` directly; add `chrome.cookies.getAll()` manual header injection only as a fallback if live testing reveals cookies are not transmitted.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Native `fetch` | Browser built-in | HTTP POST to GraphQL endpoint | MV3 service workers support global `fetch`; zero dependency overhead |
| TypeScript generics | 5.x (project uses 5.9.3) | Typed response deserialization | Project-wide pattern; no codegen needed for a single health-check query |
| `chrome.runtime.sendMessage` | MV3 built-in | Popup → service worker auth check trigger | Established IPC pattern in this codebase |
| `chrome.permissions.contains` | MV3 built-in | Permission guard before auth check | Already used in Phase 21; same pattern |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `chrome.cookies.getAll` | MV3 built-in | Manual cookie extraction fallback | Only if `credentials: "include"` proves unreliable in live testing |
| `chrome.tabs.create` | MV3 built-in | Open portal login page in new tab | Not-logged-in inline link click handler |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native fetch | `graphql-request` npm | graphql-request adds a production dependency; project constraint is zero production deps |
| Native fetch | Apollo Client | Far too heavy; requires React or Observable; overkill for a single-endpoint extension |
| `credentials: "include"` | Manual `cookie` header via `chrome.cookies.getAll` | Manual approach works but is more code and requires `"cookies"` permission in manifest |

**Installation:** No new packages. Project has zero production dependencies by design.

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── shared/
│   └── graphql_client.ts    # New: generic executeQuery + health check query
├── background/
│   └── serviceWorker.ts     # Modified: replace PORTAL_IMPORT_REQUEST stub with auth check handler
├── popup/
│   ├── popup.ts             # Modified: add PORTAL_AUTH_CHECK call, extend renderPortalSection to 3 states
│   └── popup.html           # Modified: add portal-not-logged-in div
```

### Pattern 1: Generic executeQuery Function

**What:** A single typed function that POSTs a GraphQL query to the Trackman endpoint with session cookies.

**When to use:** Every GraphQL call in this codebase — health check now, activity fetch in Phase 23.

```typescript
// src/shared/graphql_client.ts

const GRAPHQL_ENDPOINT = "https://api.trackmangolf.com/graphql";

export interface GraphQLResponse<T> {
  data: T | null;
  errors?: Array<{ message: string; extensions?: { code?: string } }>;
}

export async function executeQuery<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<GraphQLResponse<T>> {
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json() as Promise<GraphQLResponse<T>>;
}
```

**Source:** GraphQL over HTTP spec (https://graphql.github.io/graphql-over-http/); Apollo blog basic fetch pattern (https://www.apollographql.com/blog/graphql/examples/4-simple-ways-to-call-a-graphql-api/)

### Pattern 2: Auth Classification

**What:** Inspect the GraphQL `errors` array to distinguish not-logged-in from other errors.

**When to use:** After every `executeQuery` call in the health-check handler.

```typescript
export type AuthStatus =
  | { kind: "authenticated" }
  | { kind: "unauthenticated" }
  | { kind: "error"; message: string };

export function classifyAuthResult(
  result: GraphQLResponse<{ me: { id: string } | null }>
): AuthStatus {
  if (result.errors && result.errors.length > 0) {
    const code = result.errors[0].extensions?.code ?? "";
    const msg = result.errors[0].message ?? "";
    const isAuthError =
      code === "UNAUTHENTICATED" ||
      msg.toLowerCase().includes("unauthorized") ||
      msg.toLowerCase().includes("unauthenticated") ||
      msg.toLowerCase().includes("not logged in");
    return isAuthError
      ? { kind: "unauthenticated" }
      : { kind: "error", message: "Unable to reach Trackman — try again later" };
  }
  if (!result.data?.me?.id) {
    // data: null with no errors also means auth failure on some servers
    return { kind: "unauthenticated" };
  }
  return { kind: "authenticated" };
}
```

### Pattern 3: Health-Check Query Constant

**What:** The exact GraphQL query string for the auth probe.

```typescript
export const HEALTH_CHECK_QUERY = `
  query HealthCheck {
    me {
      id
    }
  }
`;
```

### Pattern 4: Three-State Portal Renderer (popup.ts)

**What:** Extend `renderPortalSection` to handle permission-denied / not-logged-in / ready.

**When to use:** Called on every popup open after permission check, and after auth check completes.

```typescript
type PortalState = "denied" | "not-logged-in" | "ready" | "error";

function renderPortalSection(state: PortalState, errorMsg?: string): void {
  const section = document.getElementById("portal-section");
  const denied = document.getElementById("portal-denied");
  const notLoggedIn = document.getElementById("portal-not-logged-in");
  const ready = document.getElementById("portal-ready");
  if (!section || !denied || !notLoggedIn || !ready) return;

  section.style.display = "block";
  denied.style.display = state === "denied" ? "block" : "none";
  notLoggedIn.style.display = state === "not-logged-in" ? "block" : "none";
  ready.style.display = state === "ready" ? "block" : "none";
  // error falls through to not-logged-in div with different text, or inline in portal-ready
}
```

### Pattern 5: Message IPC for Auth Check

**What:** New message type `PORTAL_AUTH_CHECK` — popup requests auth status from service worker.

```typescript
// serviceWorker.ts — new handler
if (message.type === "PORTAL_AUTH_CHECK") {
  (async () => {
    const granted = await hasPortalPermission();
    if (!granted) {
      sendResponse({ success: false, reason: "permission-denied" });
      return;
    }
    try {
      const result = await executeQuery<{ me: { id: string } }>(HEALTH_CHECK_QUERY);
      const status = classifyAuthResult(result);
      sendResponse({ success: true, status: status.kind });
    } catch (err) {
      console.error("TrackPull: GraphQL health check failed:", err);
      sendResponse({ success: false, reason: "network-error" });
    }
  })();
  return true;
}
```

### Anti-Patterns to Avoid

- **Throwing on GraphQL errors:** GraphQL returns HTTP 200 with errors in the body. Never treat `response.ok === true` as proof of success — always check `result.errors`.
- **Caching auth status across popup opens:** D-01 is explicit: auth check fires fresh on every popup open. No localStorage/storage.local caching of auth state.
- **Calling `chrome.tabs.create` from service worker:** Opening the portal login tab must happen in popup context (user gesture available), not the service worker.
- **Hardcoding error message strings for auth classification:** Trackman's error codes are unconfirmed — use both `extensions.code` and `message` string matching for resilience.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| GraphQL client | Custom retry/cache layer | Simple `executeQuery` wrapper | Phase 22 only needs one query; over-engineering invites bugs |
| Cookie extraction | Manual `document.cookie` parsing | `credentials: "include"` on fetch | Browser handles cookie transmission when host_permissions declared |
| Auth token management | Token storage + refresh flow | Ambient session cookies | Trackman uses HTTP-only cookies; extension cannot read them directly anyway |
| Response validation | JSON schema validator | TypeScript generics + null checks | Sufficient for this use case; RESIL-03 requires graceful skip, not schema enforcement |

**Key insight:** Trackman's cookie auth is ambient — the browser already holds the session cookie from the user's portal login. The extension does not need to read, store, or refresh credentials. This eliminates an entire class of auth complexity.

---

## Cookie Auth Strategy (D-06 Investigation)

### Confirmed Approach: `credentials: "include"` with Host Permissions

**Evidence (MEDIUM-HIGH confidence):**

1. Chrome docs (developer.chrome.com/docs/extensions/develop/concepts/storage-and-cookies): "Requests from an extension to a third-party are treated as same-site if the extension has host permissions for the third-party. This means `SameSite=Strict` cookies can be sent."

2. The Medium article on MV3 cookie auth (Borys Melnyk, 2024): "`credentials: 'include'` works directly for background script → URL in host_permissions. The author confirms no fallback to `chrome.cookies.getAll()` is needed for basic requests."

3. Multiple Chromium Extensions group discussions confirm: once `api.trackmangolf.com/*` is in `optional_host_permissions` AND the user has granted it, fetches from the service worker to that origin carry the browser's cookie jar.

**The extension already has this in place:** `optional_host_permissions` includes `https://api.trackmangolf.com/*` (confirmed in `src/manifest.json` — Phase 21 output).

### Fallback if credentials:include Fails

Some community reports note that cookies are not automatically included by default in all Chrome versions — a workaround exists: read cookies via `chrome.cookies.getAll({ domain: "api.trackmangolf.com" })` then inject them as the `Cookie` header manually. However, this requires adding `"cookies"` to the manifest `permissions` array, which is a broader permission. The plan should attempt `credentials: "include"` first and note the fallback path clearly.

**Note:** The `Cookie` header is on the browser's forbidden header list for regular web pages, but Chrome extensions with host permissions CAN set it. This is a documented extension-specific capability.

### CSRF Considerations

Trackman's GraphQL endpoint likely does not require explicit CSRF tokens for cookie-authenticated API calls (no evidence of CSRF token injection in browser DevTools captures from milo-mac's research). Standard practice for GraphQL APIs is to rely on CORS and `Content-Type: application/json` (not a simple content type, so preflight required) as CSRF protection. The extension's `credentials: "include"` + `Content-Type: application/json` POST satisfies this pattern.

---

## Common Pitfalls

### Pitfall 1: Treating HTTP 200 as Auth Success

**What goes wrong:** `fetch()` resolves without throwing for HTTP 200 — but GraphQL auth errors come back as HTTP 200 with an `errors` array.
**Why it happens:** GraphQL over HTTP spec: errors are in the response body, not the HTTP status code.
**How to avoid:** Always inspect `result.errors` before treating `result.data` as valid.
**Warning signs:** `data: null` with no thrown exception.

### Pitfall 2: Assuming `credentials: "include"` Works Without Host Permissions Granted

**What goes wrong:** Cookies are not sent if the user has not granted the optional host permission for `api.trackmangolf.com`.
**Why it happens:** `optional_host_permissions` means the browser only treats the extension as same-site for that domain after the user grants access via `chrome.permissions.request()`.
**How to avoid:** Always check `hasPortalPermission()` before calling `executeQuery`. The service worker handler does this already via D-06/existing pattern.
**Warning signs:** HTTP 401 or empty `data` on health check before the permission grant flow.

### Pitfall 3: Calling chrome.tabs.create from Service Worker for Login Link

**What goes wrong:** Opening the portal login page in a new tab is a UI action — must come from popup context.
**Why it happens:** Service worker has no browsing context; `chrome.tabs.create` works but is semantically wrong for a user-gesture-driven link click.
**How to avoid:** Handle the "Log in" link click in `popup.ts` with `chrome.tabs.create({ url: "https://portal.trackmangolf.com" })`.
**Warning signs:** Service worker code getting entangled with tab management.

### Pitfall 4: renderPortalSection Boolean Refactor Break

**What goes wrong:** Current `renderPortalSection(granted: boolean)` takes a boolean. Extending to three states requires changing the signature — callers in popup.ts must be updated simultaneously.
**Why it happens:** The existing function at popup.ts line 168 takes a boolean; adding a third state means switching to a union type or enum.
**How to avoid:** Refactor `renderPortalSection` signature to accept `PortalState` string union in the same commit. Update the one existing call site (line 342) and the `renderPortalSection` function body together.
**Warning signs:** TypeScript compiler errors on existing callers after signature change.

### Pitfall 5: RESIL-03 — Null me.id in Health-Check

**What goes wrong:** If `me` is present but `id` is null/undefined, auth classification incorrectly assumes authenticated.
**Why it happens:** Defensive coding is omitted; the check tests `result.data?.me` not `result.data?.me?.id`.
**How to avoid:** Check `result.data?.me?.id` (truthy check on `id`, not just `me`).
**Warning signs:** Auth check passes but downstream queries fail because user session is partial.

---

## Code Examples

### Minimal GraphQL POST (verified pattern)

```typescript
// Source: https://www.apollographql.com/blog/graphql/examples/4-simple-ways-to-call-a-graphql-api/
const response = await fetch("https://api.trackmangolf.com/graphql", {
  method: "POST",
  credentials: "include",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    query: `query HealthCheck { me { id } }`,
  }),
});
const result = await response.json();
// result.data?.me?.id — truthy = authenticated
// result.errors — present = error (check message/extensions.code)
```

### GraphQL Error Shape (standard spec)

```json
{
  "data": null,
  "errors": [
    {
      "message": "Not authenticated",
      "extensions": {
        "code": "UNAUTHENTICATED"
      }
    }
  ]
}
```

Source: Apollo Server error handling docs (https://www.apollographql.com/docs/apollo-server/data/errors)

### Chrome extension same-site cookie treatment (official)

> "Requests from an extension to a third-party are treated as same-site if the extension has host permissions for the third-party. This means SameSite=Strict cookies can be sent."

Source: https://developer.chrome.com/docs/extensions/develop/concepts/storage-and-cookies (confirmed 2024)

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| MV2 background page (persistent) | MV3 service worker (event-driven) | ~2022 | Service worker has no `document`; global `fetch` is available; no XMLHttpRequest limitation |
| Apollo Client for GraphQL | Native fetch + generics | 2023+ trend for extensions | Zero-dep fetch is idiomatic for extension work; Apollo adds 40KB+ |
| Storing auth tokens in extension | Ambient browser session cookies | Always for portal-session-auth | HTTP-only cookies unavailable to JS anyway; `credentials: "include"` is the only path |

**Deprecated/outdated:**
- `background.persistent: true` (MV2): Not applicable in MV3. Service worker is the background context.
- `XMLHttpRequest` in service workers: Replaced by `fetch`. The project already uses `fetch` in its interceptor.

---

## Open Questions

1. **Exact Trackman error code for unauthenticated requests**
   - What we know: GraphQL spec defines `UNAUTHENTICATED` as a standard extension code; many servers return it
   - What's unclear: Trackman may use a different code (e.g., `401`, `"NOT_AUTHENTICATED"`, or just a message string)
   - Recommendation: Classify by BOTH `extensions.code` AND `message` string matching. Test against the live API in Phase 22 execution using DevTools network tab. Log the full error object to console during implementation for inspection.

2. **Whether `me.id` is the right auth probe field**
   - What we know: `{ me { id } }` is the agreed health-check query from CONTEXT.md D-01 and STATE.md
   - What's unclear: Unconfirmed whether Trackman's `me` type always returns `id` vs. a different identifier
   - Recommendation: Proceed with `{ me { id } }` — it's the minimal viable probe. If `id` is absent in the schema, the `null` result will still correctly classify as unauthenticated.

3. **Whether CORS allows the extension origin**
   - What we know: Extensions have `host_permissions` which bypass standard CORS restrictions for extension-origin requests
   - What's unclear: The exact CORS configuration at `api.trackmangolf.com` has not been independently verified
   - Recommendation: Chrome extensions with `host_permissions` bypass CORS for their own requests (not for injected page scripts). The service worker's `fetch` will not be blocked by CORS.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `fetch` (global) | GraphQL POST | ✓ | MV3 built-in | — |
| `chrome.permissions` | Permission guard | ✓ | MV3 built-in | — |
| `chrome.runtime.sendMessage` | Popup ↔ SW IPC | ✓ | MV3 built-in | — |
| `chrome.tabs.create` | Open login tab | ✓ | MV3 built-in | — |
| `chrome.cookies.getAll` | Cookie fallback | ✓ | MV3 built-in (requires `"cookies"` permission if used) | Not needed if `credentials: "include"` works |
| Live Trackman API | Integration testing | ✗ (no robot account) | — | Manual test by developer while logged in; unit tests mock fetch |

**Missing dependencies with no fallback:**
- Live authenticated Trackman session for integration testing — developer must test manually while logged in at portal.trackmangolf.com. Cannot be automated in CI.

**Missing dependencies with fallback:**
- `chrome.cookies.getAll`: Only needed if `credentials: "include"` fails in live testing. Adds `"cookies"` to manifest permissions if used.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 4.0.18 |
| Config file | `vitest.config.ts` (root) — include pattern `tests/test_*.ts` |
| Quick run command | `npx vitest run tests/test_graphql_client.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PERM-02 | `executeQuery` sends POST with `credentials: "include"` and correct headers | unit (mock fetch) | `npx vitest run tests/test_graphql_client.ts` | Wave 0 |
| PERM-02 | `executeQuery` returns typed data when response is `{ data: { me: { id: "x" } } }` | unit (mock fetch) | `npx vitest run tests/test_graphql_client.ts` | Wave 0 |
| PERM-03 | `classifyAuthResult` returns `unauthenticated` when `errors[0].extensions.code === "UNAUTHENTICATED"` | unit | `npx vitest run tests/test_graphql_client.ts` | Wave 0 |
| PERM-03 | `classifyAuthResult` returns `unauthenticated` when `data.me` is null and no errors | unit | `npx vitest run tests/test_graphql_client.ts` | Wave 0 |
| PERM-03 | `classifyAuthResult` returns `error` for non-auth GraphQL errors | unit | `npx vitest run tests/test_graphql_client.ts` | Wave 0 |
| RESIL-03 | `executeQuery` does not throw when response has unexpected extra fields | unit (mock fetch) | `npx vitest run tests/test_graphql_client.ts` | Wave 0 |
| RESIL-03 | `classifyAuthResult` does not throw when `errors` array is malformed or empty | unit | `npx vitest run tests/test_graphql_client.ts` | Wave 0 |
| PERM-03 | `renderPortalSection` renders correct div for each of 3 states | unit (jsdom) | `npx vitest run tests/test_portal_section.ts` | Wave 0 |

**Manual-only tests (cannot be automated):**
- Live auth: `{ me { id } }` returns `{ data: { me: { id: "..." } } }` when logged in — developer must verify in browser DevTools
- Live unauth: `{ me { id } }` returns errors when not logged in — developer must log out of portal and recheck

### Sampling Rate

- **Per task commit:** `npx vitest run tests/test_graphql_client.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/test_graphql_client.ts` — covers PERM-02, PERM-03, RESIL-03 for the new `graphql_client.ts` module
- [ ] `tests/test_portal_section.ts` — covers three-state `renderPortalSection` rendering (jsdom)

*(Existing `tests/test_portal_permissions.ts` already covers `PORTAL_ORIGINS` — no changes needed there.)*

---

## Sources

### Primary (HIGH confidence)
- `developer.chrome.com/docs/extensions/develop/concepts/storage-and-cookies` — SameSite cookie same-site treatment for extensions with host_permissions
- `developer.chrome.com/docs/extensions/develop/concepts/network-requests` — Cross-origin fetch from service worker with host_permissions
- Apollo Server error handling docs (`apollographql.com/docs/apollo-server/data/errors`) — Standard GraphQL error shape with `errors` array and `extensions.code`
- Apollo blog basic fetch pattern (`apollographql.com/blog/graphql/examples/4-simple-ways-to-call-a-graphql-api/`) — Verified minimal fetch POST for GraphQL
- Existing codebase: `src/manifest.json`, `src/shared/portalPermissions.ts`, `src/background/serviceWorker.ts`, `src/popup/popup.ts`

### Secondary (MEDIUM confidence)
- Borys Melnyk, "Cookie-based Authentication for your Browser Extension and Web App (MV3)" (Medium, 2024) — `credentials: "include"` works for background script → host_permissions URL without `chrome.cookies.getAll` fallback
- Multiple Chromium Extensions group threads (groups.google.com) — Confirm cookie behavior with host_permissions; note some edge cases requiring `chrome.cookies.get` + re-set workaround

### Tertiary (LOW confidence)
- Trackman GraphQL endpoint behavior (no public docs; 404 on schema docs per STATE.md) — Must be verified via DevTools during Phase 22 execution
- Exact error `extensions.code` for unauthenticated Trackman requests — Unconfirmed; classification logic uses both code and message matching as defense

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — native fetch + MV3 Chrome APIs, all browser built-ins, verified against docs
- Cookie auth approach: MEDIUM-HIGH — official Chrome docs confirm same-site treatment; one community concern about edge cases noted
- Architecture patterns: HIGH — follows established codebase conventions (IPC, state rendering, error handling)
- Trackman-specific GraphQL schema: LOW — no public docs; field names and error codes unconfirmed; must verify live

**Research date:** 2026-03-26
**Valid until:** 2026-04-26 (stable platform; Chrome MV3 cookie behavior unlikely to change; Trackman API may change without notice)
