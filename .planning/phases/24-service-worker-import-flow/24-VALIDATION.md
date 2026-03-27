---
phase: 24
slug: service-worker-import-flow
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-26
---

# Phase 24 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
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
| 24-01-01 | 01 | 1 | BROWSE-02 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 24-01-02 | 01 | 1 | PIPE-02 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 24-01-03 | 01 | 1 | RESIL-01 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 24-01-04 | 01 | 1 | RESIL-02 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/test_service_worker_import.ts` — stubs for BROWSE-02, PIPE-02, RESIL-01, RESIL-02
- [ ] Test helpers for mocking chrome.storage.local and chrome.runtime.sendMessage

*Existing vitest infrastructure covers framework installation.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Import survives popup close | RESIL-01 | Requires real Chrome extension runtime | 1. Start import 2. Close popup immediately 3. Reopen popup 4. Verify session appears in history |
| Status display on reopen | RESIL-02 | Requires real popup lifecycle | 1. Start import 2. Close popup 3. Reopen popup 4. Verify success/error message displays |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
