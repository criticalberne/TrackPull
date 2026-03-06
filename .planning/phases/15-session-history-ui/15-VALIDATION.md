---
phase: 15
slug: session-history-ui
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-06
---

# Phase 15 — Validation Strategy

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
| 15-01-01 | 01 | 1 | HIST-03 | unit | `npx vitest run tests/test_history_ui.ts -t "renders history list"` | No — W0 | pending |
| 15-01-02 | 01 | 1 | HIST-04 | unit | `npx vitest run tests/test_history_ui.ts -t "export csv"` | No — W0 | pending |
| 15-01-03 | 01 | 1 | HIST-05 | unit | `npx vitest run tests/test_history_ui.ts -t "tsv copy"` | No — W0 | pending |
| 15-01-04 | 01 | 1 | HIST-06 | unit | `npx vitest run tests/test_history_ui.ts -t "ai prompt"` | No — W0 | pending |
| 15-01-05 | 01 | 1 | HIST-08 | unit | `npx vitest run tests/test_history.ts -t "delete"` | No — W0 | pending |
| 15-01-06 | 01 | 1 | HIST-09 | unit | `npx vitest run tests/test_history.ts -t "clear"` | No — W0 | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] `tests/test_history.ts` — add tests for `deleteSessionFromHistory()` and `clearAllHistory()`
- [ ] `tests/test_history_ui.ts` — new file for history list rendering, date formatting, club summary formatting
- [ ] Date formatting helper: `formatRelativeDate()` — pure function, easily testable
- [ ] Club summary helper: `formatClubSummary()` — pure function, easily testable

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Popup height stays under 600px with history open | HIST-03 | Chrome popup rendering constraint | Open popup with 10+ history entries, verify no clipping |
| Banner displays correctly at top of popup | HIST-03 | Visual layout verification | Load historical session, verify banner text and dismiss button |
| DATA_UPDATED auto-switches from historical to live | HIST-03 | Requires live Trackman data event | Open historical session, trigger new data capture, verify auto-switch |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
