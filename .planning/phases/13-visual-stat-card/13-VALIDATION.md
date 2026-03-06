---
phase: 13
slug: visual-stat-card
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-05
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` |
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
| 13-01-01 | 01 | 1 | VIS-01 | unit | `npx vitest run tests/test_stat_card.ts -t "computes averages"` | ❌ W0 | ⬜ pending |
| 13-01-02 | 01 | 1 | VIS-01 | unit | `npx vitest run tests/test_stat_card.ts -t "renders per-club stats"` | ❌ W0 | ⬜ pending |
| 13-01-03 | 01 | 1 | VIS-01 | unit | `npx vitest run tests/test_stat_card.ts -t "missing metrics"` | ❌ W0 | ⬜ pending |
| 13-01-04 | 01 | 1 | VIS-02 | unit | `npx vitest run tests/test_stat_card.ts -t "updates on data"` | ❌ W0 | ⬜ pending |
| 13-01-05 | 01 | 1 | VIS-03 | unit | `npx vitest run tests/test_stat_card.ts -t "unit conversion"` | ❌ W0 | ⬜ pending |
| 13-01-06 | 01 | 1 | VIS-03 | unit | `npx vitest run tests/test_stat_card.ts -t "header labels"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/test_stat_card.ts` — stubs for VIS-01, VIS-02, VIS-03
- [ ] Average computation helper should be testable in isolation (pure function, no DOM dependency)

*Note: DOM-dependent tests (rendering, show/hide) may require jsdom or be tested via build + manual load. The average computation and unit conversion logic can be tested as pure functions.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Stat card renders correctly in popup | VIS-01 | Visual layout in Chrome popup | Load extension, open Trackman report, open popup, expand "Session Stats" |
| Stat card hides when no data | VIS-01 | DOM visibility in extension context | Open popup with no session data captured, verify stat card section is absent |
| Live update on DATA_UPDATED | VIS-02 | Requires extension runtime with message passing | Load report, open popup, load new report tab, verify stat card updates |
| Unit change updates card | VIS-03 | Requires Chrome extension popup interaction | Change distance/speed dropdowns, verify values and headers update |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
