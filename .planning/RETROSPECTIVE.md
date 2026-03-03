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

## Milestone: v1.4 — Surface Metadata

**Shipped:** 2026-03-03
**Phases:** 1 | **Plans:** 2 | **Sessions:** 1

### What Was Built
- Surface dropdown (Mat/Grass) in popup alongside existing unit selectors
- Metadata auto-injected into CSV exports, TSV clipboard, and AI prompt context
- 11 unit tests covering surface presence/absence across all output paths

### What Worked
- Optional last parameter pattern — zero existing caller/test breakage across all writer functions
- Batched storage.get for surface alongside speed/distance — single read, no extra async calls
- Single-phase milestone kept scope tight; discuss → plan → execute → verify in one session
- UAT tested all 6 user-observable behaviors end-to-end in Chrome

### What Was Inefficient
- Milestone completion overhead is disproportionate for a single-phase feature — archival/retrospective/tag ceremony designed for larger milestones

### Patterns Established
- Optional metadata params as last function argument for backward-compatible feature additions
- cachedSurface follows cachedUnitChoice pattern: resolved on load, updated on change event

### Key Lessons
1. Single-feature milestones work fine for small scope but the completion ceremony is heavy — consider batching related small features into one milestone
2. Optional last param pattern makes output functions extensible without breaking callers

### Cost Observations
- Model mix: ~70% sonnet (execution/verification), ~30% opus (orchestration)
- Sessions: 1
- Notable: End-to-end in a single session — discuss, plan, execute, verify, complete

---

## Milestone: v1.5 — Polish & Quick Wins

**Shipped:** 2026-03-03
**Phases:** 5 | **Plans:** 6 | **Sessions:** ~2

### What Was Built
- Gemini AI launch support with Cmd+Shift+G keyboard shortcut via Chrome Commands API
- Dark mode CSS foundation with custom property tokens across popup and options pages
- Status message refactored from inline styles to CSS class toggling for dark mode
- Empty state guidance replacing bare "0 shots" with actionable instructions
- Export format toggle for including/excluding averages and consistency rows
- Collapsible prompt preview widget showing assembled prompt before AI launch

### What Worked
- Batching 6 small features into one milestone — avoided v1.4's "ceremony overhead" lesson
- Sequential phase dependencies (8→9→10→11→12) meant each phase built cleanly on the previous
- CSS custom property tokens (Phase 9) reused across Phases 10, 12 — foundation investment paid off
- Native HTML elements (details/summary, checkbox) over JS state management — less code, fewer bugs
- All 6 plans executed with zero blocking deviations — research phase caught every constraint upfront

### What Was Inefficient
- Phase details in ROADMAP.md accumulated (50+ lines of success criteria) for phases that were all completed — archival could be triggered earlier
- SUMMARY.md frontmatter formats varied (some used tasks_completed in metrics, others used **Tasks:** in body) — inconsistency slows automation

### Patterns Established
- CSS class toggling over inline styles for theme-sensitive UI (classList.add/remove vs style.color)
- Container class pattern for state-driven child visibility (add class to parent, CSS descendants respond)
- style=display:none on HTML elements that should be hidden before async storage resolves
- textContent (not innerHTML) for user-defined content to prevent XSS
- Default true for new boolean storage keys — backward compatible with existing users

### Key Lessons
1. Batch small features into a single milestone — 6 features in v1.5 was far more efficient than v1.4's single-feature milestone
2. CSS custom property tokens should be established early — they became a shared foundation for 3 subsequent phases
3. Native HTML elements (details/summary, checkboxes) are the right default — reach for JS state management only when native falls short
4. Research phase consistently catches Chrome-specific gotchas (Cmd+Shift+T reserved, _execute_action naming, clipboard focus-loss) — never skip research

### Cost Observations
- Model mix: ~60% sonnet (execution), ~30% opus (orchestration/verification), ~10% haiku (research)
- Sessions: ~2
- Notable: 5 phases in a single day — small, well-scoped plans with clear success criteria enable rapid execution

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.3 | ~3 | 3 | First GSD-managed milestone; established foundation-first pattern |
| v1.4 | 1 | 1 | Single-feature milestone; optional param pattern for extensibility |
| v1.5 | ~2 | 5 | Batched polish features; CSS token foundation reused across 3 phases |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v1.3 | 236 | N/A | 0 (Chrome APIs only) |
| v1.4 | 247 | N/A | 0 (Chrome APIs only) |
| v1.5 | 247 | N/A | 0 (Chrome APIs only) |

### Top Lessons (Verified Across Milestones)

1. Foundation modules first — test and ship reusable code before wiring UI (v1.3, v1.5 Phase 9 tokens)
2. Pre-fetch pattern for Chrome extension popups — clipboard requires synchronous focus (v1.3, v1.4, v1.5)
3. Optional last params for backward-compatible feature additions — verified across v1.3 (TSV), v1.4 (surface), v1.5 (includeAverages)
4. Research phase catches platform gotchas — never skip; saves rework every time (v1.3 quota limits, v1.5 reserved shortcuts)
5. Batch small features into one milestone — v1.5's 6-feature batch was far more efficient than v1.4's single-feature approach
