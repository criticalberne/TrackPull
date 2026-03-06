---
phase: 14
slug: session-history-storage
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-05
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 1.1.1 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 14-01-01 | 01 | 1 | HIST-01 | unit | `npx vitest run tests/test_history.ts -t "saves session"` | No — W0 | pending |
| 14-01-02 | 01 | 1 | HIST-02 | unit | `npx vitest run tests/test_history.ts -t "dedup"` | No — W0 | pending |
| 14-01-03 | 01 | 1 | HIST-07 | unit | `npx vitest run tests/test_history.ts -t "evict"` | No — W0 | pending |

*Status: pending · green · red · flaky*

---

## Wave 0 Requirements

- [ ] `tests/test_history.ts` — stubs for HIST-01, HIST-02, HIST-07 (snapshot creation, dedup logic, eviction logic)
- [ ] Chrome storage mock setup — mock `chrome.storage.local.get/set` and `chrome.runtime.lastError` for unit tests

*Note: The history module (`src/shared/history.ts`) can be tested by mocking Chrome APIs. The core logic (dedup by report_id, sort by captured_at, slice to 20) is pure array manipulation once the chrome.storage read is mocked.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Toast shows on storage write failure | HIST-07 (error path) | Requires real Chrome popup context + quota exceeded state | 1. Fill storage near quota 2. Capture a session 3. Verify red toast appears and auto-dismisses after 5s |
| History save doesn't block primary flow | HIST-01 | Timing behavior in real service worker context | 1. Capture a session 2. Verify popup receives data immediately (no delay) 3. Check console for history save log |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
