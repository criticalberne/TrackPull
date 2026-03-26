---
phase: 21
slug: manifest-permissions-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-26
---

# Phase 21 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 1.x |
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
| 21-01-01 | 01 | 1 | PERM-01 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/test_permissions.ts` — stubs for PERM-01 (optional_host_permissions validation, permission request/contains logic)
- [ ] Verify existing test infrastructure works (`npx vitest run` exits 0)

*Existing vitest infrastructure covers framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Chrome permission dialog appears on first portal import click | PERM-01 | Requires real Chrome runtime with user gesture | 1. Install extension in Chrome 2. Click "Import from Portal" 3. Verify Chrome permission dialog appears |
| Existing v1.5.x install updates without disable/warning | PERM-01 | Requires real Chrome update flow | 1. Install v1.5.x 2. Update to v1.6 build 3. Verify extension stays enabled, no escalation warning |
| Permission denial leaves report-based capture working | PERM-01 | Requires real Chrome runtime | 1. Trigger permission dialog 2. Click "Deny" 3. Verify report capture still works normally |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
