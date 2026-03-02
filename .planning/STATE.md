# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-02)

**Core value:** Accurately capture every shot metric from a Trackman report and produce a clean, complete CSV export
**Current focus:** Milestone v1.3 — Export & AI, Phase 5: Foundation Modules

## Current Position

Phase: 5 — Foundation Modules
Plan: —
Status: Roadmap defined, ready for Phase 5 planning
Last activity: 2026-03-02 — v1.3 roadmap created (phases 5-7)

Progress: [░░░░░░░░░░] 0% (v1.3 — 0/3 phases complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 12 (pre-existing v1.x)
- Average duration: N/A (pre-existing work)
- Total execution time: N/A

**By Phase:**

| Phase | Milestone | Plans | Total | Avg/Plan |
|-------|-----------|-------|-------|----------|
| 1. Data Capture | v1.x | 5 | N/A | N/A |
| 2. CSV Export | v1.x | 2 | N/A | N/A |
| 3. Unit Preferences | v1.x | 3 | N/A | N/A |
| 4. Popup UI | v1.x | 2 | N/A | N/A |
| 5. Foundation Modules | v1.3 | TBD | - | - |
| 6. Clipboard Copy and AI Launch | v1.3 | TBD | - | - |
| 7. Options Page and Custom Prompts | v1.3 | TBD | - | - |

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [v1.x]: MAIN world injection for API interception — only context that can monkey-patch fetch/XHR
- [v1.x]: ISOLATED world bridge as thin relay only — no logic, just message forwarding
- [v1.x]: dist/ tracked in git — simplifies releases, zip and upload without separate build step
- [v1.x]: Zero production dependencies — Chrome APIs only
- [v1.3]: Clipboard-first AI launch design — Claude's ?q= removed Oct 2025; Gemini has no URL support; ChatGPT's is undocumented; copy to clipboard + open homepage is the primary path for all services
- [v1.3]: navigator.clipboard.writeText in popup only — unavailable in service workers; data pre-fetched on popup load to avoid async focus-loss errors
- [v1.3]: chrome.storage.local for prompt template bodies — sync quota (8 KB/item) would be exceeded by golf prompt content; local (10 MB) is correct
- [v1.3]: chrome.storage.sync for default AI service preference only — small string value fits within sync quota; enables cross-device preference sync
- [v1.3]: Built-in prompts as TypeScript constants (not storage) — BUILTIN_PROMPTS array in prompt_types.ts; only user-created templates go to storage
- [v1.3]: Gemini deferred to v1.4+ — requires host_permissions addition which triggers permission update prompt for all existing users; isolate to its own release
- [v1.3]: Custom prompts (PRMT-03/04) and options page (PREF-02) deferred to Phase 7 — higher UI complexity; core v1.3 value (clipboard + AI launch) ships in Phase 6 independently

### Pending Todos

None.

### Blockers/Concerns

- Trackman CSS class selectors for HTML fallback are brittle — undocumented private API
- StrokeGroups JSON schema can change without notice — inspect live API before touching parsing
- Stale dist/ risk: build step is manual with no enforcement; always rebuild before commit
- Missing tsconfig.json and @types/chrome create IDE friction (research flagged for future work)
- ChatGPT ?q= auto-submit behavior: community sources confirm it both pre-fills AND auto-submits — decide during Phase 6 planning whether to offer URL pre-fill or use clipboard-only for consistency
- Claude ?q= parameter removal: single indirect source (Oct 2025); verify manually before Phase 6 ships by opening claude.ai/new?q=test

## Session Continuity

Last session: 2026-03-02
Stopped at: v1.3 roadmap created — phases 5-7 defined, REQUIREMENTS.md traceability updated
Resume file: None
Next action: Run /gsd:plan-phase 5 to plan Foundation Modules
