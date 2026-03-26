# Phase 21: Manifest and Permissions Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-26
**Phase:** 21-manifest-permissions-foundation
**Areas discussed:** Permission request trigger, Permission denial UX, Permission state persistence

---

## Permission Request Trigger

| Option | Description | Selected |
|--------|-------------|----------|
| On first portal import click | User clicks 'Import from Portal' in popup, gets Chrome permission dialog. Natural context. | ✓ |
| Dedicated setup button | A 'Connect to Portal' button in options or popup that explicitly requests permission before any import attempt. | |
| On extension install/update | Proactively ask during onboarding. Gets it out of the way early but lacks context. | |

**User's choice:** On first portal import click
**Notes:** None — straightforward selection of recommended approach.

| Option | Description | Selected |
|--------|-------------|----------|
| Chrome dialog only | Keep it simple — user clicks Import, Chrome's native permission prompt appears. No extra UI step. | ✓ |
| Brief explanation first | Show a small inline message explaining why permission is needed before triggering the Chrome dialog. | |

**User's choice:** Chrome dialog only
**Notes:** None

---

## Permission Denial UX

| Option | Description | Selected |
|--------|-------------|----------|
| Inline message with retry | Brief message in popup with 'Grant Access' button. Non-blocking. | ✓ |
| Toast notification only | Brief dismissible toast. No persistent UI change — clicking Import re-triggers. | |
| Disabled portal section | Grey out/hide entire portal import section with explanation. | |

**User's choice:** Inline message with retry
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Persist until granted | Message stays in portal section each popup open, with 'Grant Access' always available. | ✓ |
| Show only after denial | Message appears after denial but resets on next popup open. | |

**User's choice:** Persist until granted
**Notes:** None

---

## Permission State Persistence

| Option | Description | Selected |
|--------|-------------|----------|
| chrome.permissions.contains() each time | Call on popup open and portal feature access. Always authoritative, no stale state. | ✓ |
| Cache in chrome.storage.local | Store flag after granting. Faster but could get out of sync. | |
| Check + cache hybrid | Check on popup open, cache in memory for session. | |

**User's choice:** chrome.permissions.contains() each time
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Service worker also checks | Defense in depth — SW calls chrome.permissions.contains() before portal fetch. | ✓ |
| Trust the popup gate | Popup is only entry point, so SW doesn't need to re-check. | |

**User's choice:** Service worker also checks
**Notes:** None

---

## Claude's Discretion

- Exact wording of denial/grant messages
- Whether to use chrome.permissions.onAdded/onRemoved listeners
- Internal code organization for permissions helper module

## Deferred Ideas

None — discussion stayed within phase scope
