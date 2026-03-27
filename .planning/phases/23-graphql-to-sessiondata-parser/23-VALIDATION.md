---
phase: 23
slug: graphql-to-sessiondata-parser
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-26
---

# Phase 23 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.0.18 |
| **Config file** | `vitest.config.ts` (root) — include pattern `tests/test_*.ts` |
| **Quick run command** | `npx vitest run tests/test_portal_parser.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/test_portal_parser.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 23-01-01 | 01 | 1 | PIPE-01 | unit | `npx vitest run tests/test_portal_parser.ts` | ❌ W0 | ⬜ pending |
| 23-01-02 | 01 | 1 | PIPE-01 | unit | `npx vitest run tests/test_portal_parser.ts` | ❌ W0 | ⬜ pending |
| 23-01-03 | 01 | 1 | PIPE-01 | unit | `npx vitest run tests/test_portal_parser.ts` | ❌ W0 | ⬜ pending |
| 23-01-04 | 01 | 1 | PIPE-01 | unit | `npx vitest run tests/test_portal_parser.ts` | ❌ W0 | ⬜ pending |
| 23-01-05 | 01 | 1 | PIPE-01 | unit | `npx vitest run tests/test_portal_parser.ts` | ❌ W0 | ⬜ pending |
| 23-01-06 | 01 | 1 | PIPE-01 | unit | `npx vitest run tests/test_portal_parser.ts` | ❌ W0 | ⬜ pending |
| 23-01-07 | 01 | 1 | PIPE-01 | unit | `npx vitest run tests/test_portal_parser.ts` | ❌ W0 | ⬜ pending |
| 23-01-08 | 01 | 1 | PIPE-01 | unit | `npx vitest run tests/test_portal_parser.ts` | ❌ W0 | ⬜ pending |
| 23-01-09 | 01 | 1 | PIPE-03 | unit | `npx vitest run tests/test_portal_parser.ts` | ❌ W0 | ⬜ pending |
| 23-01-10 | 01 | 1 | PIPE-03 | unit | `npx vitest run tests/test_portal_parser.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/test_portal_parser.ts` — stubs for PIPE-01, PIPE-03 covering all 10 behaviors
- [ ] Inline fixture objects (not JSON files) following `test_graphql_client.ts` pattern

*Existing infrastructure covers framework installation (vitest already configured).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live dedup: portal import after interceptor capture shows one entry with portal metrics | PIPE-03 | Requires live Trackman portal session and real interceptor capture | 1. Capture session via interceptor 2. Import same session via portal 3. Verify history shows single entry with 60+ fields |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending