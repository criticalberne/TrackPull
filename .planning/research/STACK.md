# Stack Research

**Domain:** Chrome MV3 Extension — GraphQL API integration with cookie-based auth (v1.6 Trackman Portal Integration)
**Researched:** 2026-03-26
**Confidence:** HIGH (Chrome MV3 permission model verified via official docs and tested community sources; GraphQL raw fetch pattern is well-established; zero-dependency constraint drives the decision)

---

## Context: What This File Covers

TrackPull has a validated, zero-production-dependency stack: TypeScript, esbuild, Chrome MV3 APIs. The existing stack decisions (dark mode, history storage, prompts, CSV, unit conversion) stand and are not re-researched.

This document covers ONLY what is new for v1.6 Trackman Portal Integration:

1. **GraphQL client approach** — library vs. raw fetch; which is correct given the zero-dep constraint and two known queries
2. **Cookie-based authentication** — how HttpOnly session cookies work with `credentials: 'include'` in a MV3 service worker
3. **Host permission model** — which manifest entries are required; what they actually unlock
4. **Execution context** — where the fetch must originate (service worker, not content script)

---

## Recommended Stack

### Core Technologies (New for v1.6)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Raw `fetch` with `credentials: 'include'` | Native browser API (no package) | GraphQL POST requests to `api.trackmangolf.com/graphql` | GraphQL over HTTP is a POST with a JSON body — `{ query, variables }`. For two known, fixed queries (activity list + single session), a client library adds zero meaningful behavior. The entire "client" is a 6-line helper function. Eliminates the only production dependency that would otherwise be introduced. |
| Chrome `host_permissions` (two new entries) | MV3 manifest field | Grant the service worker CORS-exempt access to `api.trackmangolf.com` and `portal.trackmangolf.com` | MV3 extension service workers bypass CORS for origins listed in `host_permissions`. This is the documented Chrome mechanism for cross-origin extension fetches. Without it, the browser blocks the request. With it, no server-side CORS header changes are needed. |
| `credentials: 'include'` fetch option | Fetch API option | Attach Trackman's HttpOnly session cookies to every GraphQL request | Trackman authenticates via HttpOnly cookies set at login. When `host_permissions` declares the target origin and `credentials: 'include'` is set, the browser attaches the user's existing Trackman cookies automatically. The extension never reads, stores, or manages cookie values. |

---

## How Cookie Auth Works in This Architecture

**The critical insight: host_permissions + credentials:include is all that is needed.**

When a MV3 service worker fetches a URL that matches an entry in `host_permissions`:
1. The browser grants the service worker CORS-exempt access to that origin.
2. Existing cookies for that domain (set by the Trackman portal when the user logged in) are attached to the request when `credentials: 'include'` is specified.
3. The response is received without CORS errors, regardless of what CORS headers the server sets.

Verified from official Chrome docs and community implementation evidence:

> "When you send an API request from a background script or an extension page to a URL that is specified in your `host_permissions`, the cookies stored for that domain are also sent with the request."
>
> — [Cookie-based Authentication for MV3 extensions (Borys Melnyk)](https://boryssey.medium.com/cookie-based-authentication-for-your-browser-extension-and-web-app-mv3-4837d7603f54)

**No `chrome.cookies` API permission is needed.** The extension is not reading cookie values — it is instructing `fetch` to forward them. The browser handles this transparently via the standard credentialed-request mechanism.

**No token management needed.** Trackman's session state lives in HttpOnly cookies. The extension piggybacks on the user's existing browser session. If the user is not logged in, the GraphQL endpoint returns a 401 or an auth error in the `errors` array — handle it with a user-facing message.

**The fetch must originate from the service worker, not a content script.** Content scripts (MAIN world and ISOLATED world) cannot make credentialed cross-origin requests — they run in the context of the page's origin and are subject to the page's CORS policy. The service worker is an extension context with its own origin and `host_permissions`-granted access. The existing `chrome.runtime.sendMessage` / `sendResponse` pattern (used today for `EXPORT_CSV_REQUEST`) is the correct bridge: popup sends a message to the service worker, service worker makes the fetch, returns the result.

---

## Manifest Changes Required

```json
{
  "host_permissions": [
    "https://web-dynamic-reports.trackmangolf.com/*",
    "https://api.trackmangolf.com/*",
    "https://portal.trackmangolf.com/*"
  ]
}
```

`api.trackmangolf.com` is required — it is the GraphQL endpoint.
`portal.trackmangolf.com` is required — cookies are set on this domain when the user logs in; the service worker needs permission to send them.

No other manifest changes. No new `permissions` array entries. `storage` and `downloads` are already declared.

---

## The GraphQL Client (Complete Implementation)

This is the entire GraphQL client surface needed for v1.6:

```typescript
// src/shared/graphql_client.ts

const GRAPHQL_ENDPOINT = 'https://api.trackmangolf.com/graphql';

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

export async function gqlFetch<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL HTTP error: ${response.status}`);
  }

  const json = await response.json() as GraphQLResponse<T>;

  if (json.errors?.length) {
    throw new Error(`GraphQL error: ${json.errors[0].message}`);
  }

  if (!json.data) {
    throw new Error('GraphQL response missing data field');
  }

  return json.data;
}
```

This file is the entire client. There is no abstraction value in adding a library over this.

---

## Supporting Libraries

None. Zero new production dependencies.

| Feature | Why No Library Needed |
|---------|----------------------|
| GraphQL queries | Raw fetch with JSON.stringify — GraphQL is just HTTP POST |
| Cookie auth | `credentials: 'include'` fetch option — browser handles cookie forwarding |
| Response parsing | `response.json()` — standard JSON deserialization |
| Error handling | Check `response.ok` + `json.errors` array — two conditions, no library needed |
| TypeScript types | Inline interfaces for query shapes — no schema codegen needed for two known queries |

---

## New Files to Create

| File | Purpose |
|------|---------|
| `src/shared/graphql_client.ts` | `gqlFetch<T>()` helper — the complete GraphQL client |
| `src/shared/portal_queries.ts` | Typed query strings: `ACTIVITY_LIST_QUERY`, `SESSION_DETAIL_QUERY` + response type interfaces |
| `src/shared/portal_parser.ts` | `parseMeasurement()` — maps GraphQL `Measurement` fields (60+) into `SessionData` format |

These follow the existing module pattern. No new permissions, no new content scripts, no new build configuration.

---

## New Service Worker Message Handlers

Two new message types following the existing `RequestMessage` union pattern in `serviceWorker.ts`:

```typescript
interface FetchActivitiesRequest {
  type: "FETCH_ACTIVITIES";
}

interface FetchSessionRequest {
  type: "FETCH_SESSION";
  activityId: string;
}
```

The service worker handles these by calling `gqlFetch()` and returning the parsed result (or an error object) via `sendResponse`. The popup renders the activity list and dispatches `FETCH_SESSION` when the user selects a session.

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| Raw `fetch` | `graphql-http` npm package | Zero-dependency but adds the only production dependency to the project for a wrapper over 6 lines of code. The package is a spec-compliant server+client suite — the client portion is exactly what the raw fetch helper already does. Version 1.22.4, ~5 KB gzipped. No value for two known queries. |
| Raw `fetch` | `graphql-request` | Adds a production dependency. Wraps fetch with TypeScript generics and built-in error handling — which the 6-line helper already provides. Introduces a `RequestDocument` abstraction over plain strings. Overkill. |
| Raw `fetch` | Apollo Client | Enormous bundle (~30 KB+ gzipped). Brings normalized caching, reactive state, subscriptions — none of which apply to a service worker doing two one-shot queries. Explicitly out of scope for this project. |
| Raw `fetch` | `urql` | Lighter than Apollo (~10 KB gzipped) but designed for React/Svelte reactive contexts. Service worker is imperative — reactive state management adds friction with zero benefit. |
| Service worker fetch | Content script fetch | Content scripts cannot make credentialed cross-origin requests. Chrome's security model runs content scripts in the page's origin context. CORS policy of the page applies. The service worker is the only correct execution context for cross-origin credentialed fetches from an extension. |
| `credentials: 'include'` | `chrome.cookies` API + manual header injection | The `chrome.cookies` API reads cookie values into JS strings. This would require reading HttpOnly cookie values (which Chrome does allow the cookies API to do, but it is semantically wrong — cookies should be forwarded, not read), then manually constructing `Cookie:` headers. More complex, more fragile, requires the `"cookies"` permission which triggers additional user-facing warnings in the Chrome Web Store review. `credentials: 'include'` is the correct, idiomatic approach. |

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Apollo Client | Bundle size, reactive state, normalized cache — none apply | Raw fetch helper |
| `graphql-http` npm package | Adds the only production dependency for zero measurable benefit over a 6-line fetch helper | Inline `gqlFetch()` in `src/shared/graphql_client.ts` |
| `graphql-request` npm package | Same problem — adds dependency, wraps fetch, no benefit for fixed queries | Inline `gqlFetch()` |
| GraphQL code generation (graphql-codegen) | Generates TypeScript types from a schema. Requires the schema, a build step, and a dev dependency. For two known query shapes, inline TypeScript interfaces are simpler and maintainable. | Inline response type interfaces in `portal_queries.ts` |
| `chrome.cookies` permission | Not needed. `credentials: 'include'` forwards cookies without the extension reading their values. The cookies API permission triggers additional Chrome Web Store scrutiny. | Remove from manifest; the fetch API handles cookies transparently |
| Token/session management code | Trackman session state lives in HttpOnly cookies managed by the browser. The extension has no auth to manage. | None — auth is implicit via `credentials: 'include'` |
| GraphQL subscriptions or WebSocket transport | Not needed. Activity list and session pull are one-shot queries with no real-time requirement. | Standard HTTP POST queries |
| Schema introspection queries | The query shapes are known from API observation. Introspection adds complexity and may be disabled on the endpoint. | Fixed typed query strings |

---

## Version Compatibility

| API/Feature | Availability | Notes |
|-------------|-------------|-------|
| `fetch` with `credentials: 'include'` in MV3 service worker | Chrome 88+ (MV3 minimum) | Well within all current Chrome versions |
| `host_permissions` in MV3 manifest | Chrome 88+ | Already in use in the manifest for `web-dynamic-reports.trackmangolf.com` |
| `response.json()` | All Chrome versions | No compatibility concern |

No new packages, no new Node.js version requirements, no esbuild configuration changes.

---

## Sources

- [Chrome Extensions: Cross-origin network requests](https://developer.chrome.com/docs/extensions/develop/concepts/network-requests) — confirmed that service worker fetch + host_permissions grants cross-origin access without CORS errors (HIGH confidence, official Chrome docs)
- [Chrome Extensions: Declare permissions](https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions) — confirmed host_permissions syntax and scope; confirmed `"cookies"` API permission is separate from `credentials:include` behavior (HIGH confidence, official Chrome docs)
- [Cookie-based Authentication for MV3 extensions — Borys Melnyk](https://boryssey.medium.com/cookie-based-authentication-for-your-browser-extension-and-web-app-mv3-4837d7603f54) — confirmed: "When you send an API request from a background script or an extension page to a URL specified in host_permissions, the cookies stored for that domain are also sent with the request." Confirmed content scripts cannot make these requests. (MEDIUM confidence, community-verified practical guide)
- [GraphQL over HTTP — graphql.org](https://graphql.org/learn/serving-over-http/) — confirmed standard POST body shape: `{ query, variables, operationName }` (HIGH confidence, official spec)
- [Send GraphQL Queries With the Fetch API — Netlify](https://www.netlify.com/blog/2020/12/21/send-graphql-queries-with-the-fetch-api-without-using-apollo-urql-or-other-graphql-clients/) — confirmed raw fetch is production-viable for fixed queries; documented the exact pattern (MEDIUM confidence, verified against spec)
- [graphql-http GitHub](https://github.com/graphql/graphql-http) — reviewed as alternative; zero-dep, version 1.22.4, but unnecessary abstraction for two fixed queries (HIGH confidence, reviewed directly)
- Existing codebase analysis — `src/background/serviceWorker.ts`, `src/manifest.json`, `src/models/types.ts` — confirmed service worker message pattern, existing host_permissions structure, SessionData shape (HIGH confidence, source reviewed directly)

---

*Stack research for: TrackPull v1.6 — GraphQL API integration (Trackman Portal)*
*Researched: 2026-03-26*
