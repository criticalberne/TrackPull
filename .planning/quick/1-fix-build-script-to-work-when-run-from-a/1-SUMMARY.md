---
phase: quick
plan: 1
subsystem: build
tags: [build, shell, dx]
dependency_graph:
  requires: []
  provides: [directory-independent-build]
  affects: [scripts/build-extension.sh]
tech_stack:
  added: []
  patterns: [SCRIPT_DIR idiom for portable shell scripts]
key_files:
  created: []
  modified:
    - scripts/build-extension.sh
decisions:
  - Used standard SCRIPT_DIR/PROJECT_ROOT idiom and cd to PROJECT_ROOT rather than rewriting all paths — minimal, safe change
metrics:
  duration: "~2 minutes"
  completed: "2026-03-03"
  tasks_completed: 1
  files_modified: 1
---

# Quick Task 1: Fix Build Script to Work from Any Directory - Summary

**One-liner:** Added SCRIPT_DIR/PROJECT_ROOT resolution to build-extension.sh so dist/ always lands in the project root regardless of caller's cwd.

## What Was Done

Added three lines after `set -e` in `scripts/build-extension.sh`:

```bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"
```

This resolves the project root from the script's own location, then changes the working directory to it before any other commands run. All existing relative paths (`dist/`, `src/...`) now resolve correctly because the cwd is always the project root — no other lines needed to change.

## Verification

- `cd /tmp && bash /path/to/scripts/build-extension.sh` — succeeds, dist/ lands in project root
- `bash scripts/build-extension.sh` from project root — succeeds, no regression

## Commits

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Add SCRIPT_DIR/PROJECT_ROOT and cd to project root | 4a4de28 |

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

- `scripts/build-extension.sh` modified with the three new lines
- Commit `4a4de28` exists: `git log --oneline` confirms `fix(quick-1): make build script directory-independent`
- Build from /tmp verified to produce correct output in project dist/
