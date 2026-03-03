# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.3 — Export & AI

**Shipped:** 2026-03-03
**Phases:** 3 | **Plans:** 8 | **Sessions:** ~3

### What Was Built
- TSV writer module with field escaping and unit-labeled headers for clipboard export
- 8 built-in golf analysis prompts (3 beginner, 3 intermediate, 2 advanced)
- Prompt builder assembling templates + TSV data + session metadata
- Popup clipboard actions: Copy TSV, Open in AI (ChatGPT/Claude/Gemini), Copy Prompt + Data
- Full options page with CRUD for custom prompt templates
- Dynamic popup prompt selector merging built-in + custom prompts

### What Worked
- Foundation module approach (Phase 5) paid off — reusable modules made Phases 6-7 fast to wire
- Pre-fetch data pattern for popup solved clipboard focus-loss issue cleanly
- Per-key storage strategy for custom prompts avoided quota limits without complexity
- Parallel plan execution in waves (05-A/05-B wave 1, 05-C wave 2) maximized throughput
- All plans executed with zero deviations — thorough research and planning eliminated surprises

### What Was Inefficient
- v1.x phases (1-4) had no GSD tracking — retroactive phase creation was overhead with no execution benefit
- 49K LOC total seems high for the project scope — likely includes some vendored or generated code in dist/

### Patterns Established
- Separate esbuild bundles per entry point (popup, options) — no shared runtime across bundles; duplicate utilities when needed
- Module-level cache pattern: read storage once at DOMContentLoaded, use cached values in all handlers
- PromptItem union type enabling polymorphic handling of built-in and custom prompts
- Per-key chrome.storage strategy for user content that might exceed single-item quota

### Key Lessons
1. Clipboard APIs in Chrome extension popups require synchronous focus — always pre-fetch data before user interaction
2. chrome.storage.sync has 8 KB per-item limit — use per-key strategy for user-generated content
3. AI services don't reliably support URL-based prompt pre-fill — clipboard-first is the universal approach
4. Foundation modules with unit tests as Phase 1 of a feature set reduces integration risk in later phases

### Cost Observations
- Model mix: ~80% sonnet, ~20% opus (research/planning opus, execution sonnet)
- Sessions: ~3 sessions across 5 days
- Notable: 8 plans completed with zero rework — planning investment paid off in execution speed

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.3 | ~3 | 3 | First GSD-managed milestone; established foundation-first pattern |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v1.3 | 236 | N/A | 0 (Chrome APIs only) |

### Top Lessons (Verified Across Milestones)

1. Foundation modules first — test and ship reusable code before wiring UI
2. Pre-fetch pattern for Chrome extension popups — clipboard requires synchronous focus
