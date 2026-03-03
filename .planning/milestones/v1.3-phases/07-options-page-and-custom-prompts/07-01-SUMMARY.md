---
phase: 07-options-page-and-custom-prompts
plan: "01"
subsystem: shared-infrastructure
tags: [custom-prompts, storage, types, manifest, build]
dependency_graph:
  requires: []
  provides:
    - CustomPrompt interface and PromptItem union type for downstream plans
    - custom_prompts.ts CRUD storage module
    - CUSTOM_PROMPT_KEY_PREFIX and CUSTOM_PROMPT_IDS_KEY storage constants
    - options_ui manifest declaration
    - options page esbuild entry and HTML copy in build script
  affects:
    - src/shared/prompt_types.ts
    - src/shared/constants.ts
    - src/shared/prompt_builder.ts
    - src/shared/custom_prompts.ts
    - src/manifest.json
    - scripts/build-extension.sh
tech_stack:
  added:
    - src/shared/custom_prompts.ts (new module)
    - src/options/options.ts (placeholder)
    - src/options/options.html (placeholder)
  patterns:
    - Per-key chrome.storage.sync strategy for custom prompts
    - PromptItem union type pattern for polymorphic prompt handling
    - TDD with vi.stubGlobal chrome mock for storage testing
key_files:
  created:
    - src/shared/custom_prompts.ts
    - src/options/options.ts
    - src/options/options.html
    - tests/test_custom_prompts.ts
  modified:
    - src/shared/prompt_types.ts
    - src/shared/constants.ts
    - src/shared/prompt_builder.ts
    - src/manifest.json
    - scripts/build-extension.sh
decisions:
  - Per-key chrome.storage.sync strategy chosen — each prompt stored under individual key with ID index; avoids single-item 8 KB quota issue for larger templates
  - CustomPrompt interface has only id, name, template — no tier or topic (per user decision from planning); custom prompts are user-written and do not need built-in categorization
  - assemblePrompt() broadened to PromptItem union — backward-compatible; BuiltInPrompt satisfies PromptItem since both have template field
  - Placeholder options.ts/options.html created — allows build script wiring in 07-01 without blocking Plan 07-02 which implements the full UI
metrics:
  duration: "~2 minutes"
  completed: "2026-03-03"
  tasks_completed: 3
  files_created: 4
  files_modified: 5
---

# Phase 7 Plan 01: Custom Prompt Infrastructure Summary

**One-liner:** Per-key chrome.storage.sync CRUD module for user custom prompts, with CustomPrompt/PromptItem types and manifest/build wiring for the options page.

## Tasks Completed

| # | Task | Commit | Status |
|---|------|--------|--------|
| 1 | Add CustomPrompt type, PromptItem union, storage constants, broadened assemblePrompt | 2b8d406 | Done |
| 2 | Create custom_prompts.ts storage module + unit tests (TDD) | 900aa1a, 2740ecf | Done |
| 3 | Add options_ui to manifest, options esbuild entry, build validation | 552745b | Done |

## What Was Built

### Types (src/shared/prompt_types.ts)
Added `CustomPrompt` interface (id, name, template — no tier/topic) and `PromptItem = BuiltInPrompt | CustomPrompt` union type. Both downstream plans (07-02 options page, 07-03 popup refactor) depend on these.

### Storage Constants (src/shared/constants.ts)
Added `CUSTOM_PROMPT_KEY_PREFIX = "customPrompt_"` and `CUSTOM_PROMPT_IDS_KEY = "customPromptIds"` — the per-key storage strategy keys.

### Broadened assemblePrompt (src/shared/prompt_builder.ts)
Changed import and parameter type from `BuiltInPrompt` to `PromptItem`. Implementation unchanged — only accesses `prompt.template` which both union members have. All 13 existing prompt_builder tests pass.

### Storage CRUD Module (src/shared/custom_prompts.ts)
Three async functions following per-key chrome.storage.sync strategy:
- `loadCustomPrompts()` — reads ID index, fetches each prompt by prefixed key
- `saveCustomPrompt(prompt)` — writes prompt to individual key, deduplicates ID in index
- `deleteCustomPrompt(id)` — removes prompt key, filters ID from index (no-op for missing IDs)

### Unit Tests (tests/test_custom_prompts.ts)
8 tests covering all CRUD behaviors with in-memory chrome.storage.sync mock via `vi.stubGlobal`. Tests use TDD pattern: RED commit before implementation, GREEN after.

### Manifest + Build Script
- `src/manifest.json` — added `options_ui: { page: "options.html", open_in_tab: true }`
- `scripts/build-extension.sh` — added esbuild entry for options.ts, cp for options.html, HTML validation loop covers both popup.html and options.html
- Placeholder `src/options/options.ts` and `src/options/options.html` created so build succeeds end-to-end; Plan 07-02 replaces them with real UI

## Verification Results

- All 236 tests pass (npx vitest run)
- Build succeeds end-to-end (bash scripts/build-extension.sh)
- CustomPrompt in prompt_types.ts: PASS
- PromptItem in prompt_builder.ts: PASS
- CUSTOM_PROMPT_KEY_PREFIX in constants.ts: PASS
- options_ui in dist/manifest.json: PASS
- dist/options.html exists: PASS
- dist/options.js exists: PASS

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

All created/modified files exist on disk:
- src/shared/prompt_types.ts: FOUND
- src/shared/custom_prompts.ts: FOUND
- src/shared/constants.ts: FOUND
- src/shared/prompt_builder.ts: FOUND
- src/manifest.json: FOUND
- scripts/build-extension.sh: FOUND
- tests/test_custom_prompts.ts: FOUND

All task commits exist in git history:
- 2b8d406 (Task 1): FOUND
- 900aa1a (Task 2 RED): FOUND
- 2740ecf (Task 2 GREEN): FOUND
- 552745b (Task 3): FOUND
