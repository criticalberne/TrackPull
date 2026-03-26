# Phase 22: GraphQL Client and Cookie Auth - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-26
**Phase:** 22-graphql-client-cookie-auth
**Areas discussed:** Auth check timing, Not-logged-in UX, Error feedback, Cookie auth strategy

---

## Auth Check Timing

| Option | Description | Selected |
|--------|-------------|----------|
| On popup open | Check auth every time popup opens alongside permission check. User sees login status immediately. | ✓ |
| On import click only | Only check when user clicks Import. Saves network call but user won't know they're logged out until they try. | |
| Both — cached + fresh | Light check on popup open with cached state, fresh check on import click. | |

**User's choice:** On popup open (Recommended)
**Notes:** Consistent with Phase 21's permission check pattern — both happen on popup open.

---

## Not-Logged-In UX

| Option | Description | Selected |
|--------|-------------|----------|
| Inline message + link | "Log into portal.trackmangolf.com" with clickable link opening portal login in new tab. Consistent with Phase 21 inline denial pattern. | ✓ |
| Replace import button | Swap Import button for "Log into Trackman" button. More action-oriented but hides import. | |
| You decide | Claude picks approach matching existing Phase 21 patterns. | |

**User's choice:** Inline message + link (Recommended)
**Notes:** None

---

## Error Feedback

| Option | Description | Selected |
|--------|-------------|----------|
| Inline in portal section | Show error in portal section itself, consistent with existing patterns. | ✓ |
| Toast notification | Use existing toast pattern from Phase 14. More prominent but ephemeral. | |
| Both — inline + console | Inline for user + detailed error in console for debugging. | |

**User's choice:** Inline in portal section (Recommended)
**Notes:** None

---

## Cookie Auth Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Ambient cookies only | Rely on browser cookies, service worker uses fetch() with credentials. Zero token management. | |
| Cookie + CSRF token | Extract CSRF/XSRF token if required. More defensive but adds complexity. | |
| You decide after research | Let researcher investigate what Trackman's endpoint actually requires. | ✓ |

**User's choice:** You decide after research
**Notes:** Ambient cookies is the starting assumption, but researcher should verify actual requirements.

---

## Claude's Discretion

- GraphQL client API shape
- Error type hierarchy and classification
- Auth failure detection logic
- Health-check caching strategy

## Deferred Ideas

None
