---
phase: 22
slug: graphql-client-cookie-auth
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-26
---

# Phase 22 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.0.18 |
| **Config file** | `vitest.config.ts` (root) — include pattern `tests/test_*.ts` |
| **Quick run command** | `npx vitest run tests/test_graphql_client.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/test_graphql_client.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 22-01-01 | 01 | 1 | PERM-02 | unit (mock fetch) | `npx vitest run tests/test_graphql_client.ts` | ❌ W0 | ⬜ pending |
| 22-01-02 | 01 | 1 | PERM-02 | unit (mock fetch) | `npx vitest run tests/test_graphql_client.ts` | ❌ W0 | ⬜ pending |
| 22-01-03 | 01 | 1 | PERM-03 | unit | `npx vitest run tests/test_graphql_client.ts` | ❌ W0 | ⬜ pending |
| 22-01-04 | 01 | 1 | PERM-03 | unit | `npx vitest run tests/test_graphql_client.ts` | ❌ W0 | ⬜ pending |
| 22-01-05 | 01 | 1 | PERM-03 | unit | `npx vitest run tests/test_graphql_client.ts` | ❌ W0 | ⬜ pending |
| 22-01-06 | 01 | 1 | RESIL-03 | unit (mock fetch) | `npx vitest run tests/test_graphql_client.ts` | ❌ W0 | ⬜ pending |
| 22-01-07 | 01 | 1 | RESIL-03 | unit | `npx vitest run tests/test_graphql_client.ts` | ❌ W0 | ⬜ pending |
| 22-02-01 | 02 | 2 | PERM-03 | unit (jsdom) | `npx vitest run tests/test_portal_section.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/test_graphql_client.ts` — stubs for PERM-02, PERM-03, RESIL-03 (executeQuery, classifyAuthResult)
- [ ] `tests/test_portal_section.ts` — stubs for three-state renderPortalSection rendering (jsdom)

*(Existing `tests/test_portal_permissions.ts` already covers `PORTAL_ORIGINS` — no changes needed there.)*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live auth: `{ me { id } }` returns `{ data: { me: { id: "..." } } }` when logged in | PERM-02 | Requires live Trackman session | Log into portal.trackmangolf.com, open extension, check DevTools Network for GraphQL response |
| Live unauth: `{ me { id } }` returns errors when not logged in | PERM-03 | Requires logged-out state | Log out of portal, open extension, verify "Log into portal" message appears |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
