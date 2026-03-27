---
phase: 25
slug: activity-browser-ui
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-26
---

# Phase 25 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.0.18 |
| **Config file** | `vitest.config.ts` (root) — include pattern: `tests/test_*.ts` |
| **Quick run command** | `npx vitest run tests/test_activity_browser.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/test_activity_browser.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 25-01-01 | 01 | 1 | BROWSE-01 | unit | `npx vitest run tests/test_activity_browser.ts` | ❌ W0 | ⬜ pending |
| 25-01-02 | 01 | 1 | BROWSE-01 | unit | `npx vitest run tests/test_activity_browser.ts` | ❌ W0 | ⬜ pending |
| 25-01-03 | 01 | 1 | BROWSE-03 | unit | `npx vitest run tests/test_activity_browser.ts` | ❌ W0 | ⬜ pending |
| 25-01-04 | 01 | 1 | BROWSE-03 | unit | `npx vitest run tests/test_activity_browser.ts` | ❌ W0 | ⬜ pending |
| 25-01-05 | 01 | 1 | BROWSE-04 | unit | `npx vitest run tests/test_activity_browser.ts` | ❌ W0 | ⬜ pending |
| 25-01-06 | 01 | 1 | BROWSE-04 | unit | `npx vitest run tests/test_activity_browser.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/test_activity_browser.ts` — stubs for BROWSE-01 date formatting, BROWSE-03 period grouping, BROWSE-04 filtering

*Existing infrastructure covers framework — vitest 4.0.18 already configured.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Scrollable container with ~300px max-height | BROWSE-01 | Visual/CSS layout | Inspect portal-section in DevTools, verify overflow scroll and max-height |
| Auth/error state replacement | BROWSE-01 | Requires Trackman portal auth state | Test with portal logged out, denied, error states |
| Import button triggers service worker flow | BROWSE-01 | Requires live extension message passing | Click Import on an activity, verify toast appears |
| Loading/importing spinner states | BROWSE-01 | Visual state transitions | Observe spinner during fetch and import operations |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
