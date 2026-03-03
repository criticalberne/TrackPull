# Milestones

## v1.5 Polish & Quick Wins (Shipped: 2026-03-03)

**Phases:** 8-12 (5 phases, 6 plans, 14 tasks)
**Timeline:** 1 day (2026-03-02 → 2026-03-03)
**Git range:** `f14d39f` (docs(08)) to `d72d4db` (docs(phase-12))
**Files changed:** 12 (+841, -196)

**Delivered:** Six polish features — Gemini AI launch, keyboard shortcut, dark mode, empty state guidance, export format toggle, and prompt preview — shipped as quick wins without breaking existing behavior.

**Key accomplishments:**
1. Gemini AI launch support with Cmd+Shift+G keyboard shortcut via Chrome Commands API
2. Dark mode CSS foundation with custom property tokens across popup and options pages
3. Empty state guidance replacing bare "0 shots" with actionable instructions
4. Export format toggle for including/excluding averages and consistency rows in CSV
5. Collapsible prompt preview widget showing assembled prompt and data before AI launch
6. Status message refactored from inline styles to CSS class toggling for dark mode support

**Tests:** 247 total, all passing

---

## v1.4 Surface Metadata (Shipped: 2026-03-03)

**Phases:** 1 (1 phase, 2 plans, 4 tasks)
**Timeline:** 1 day (2026-03-02 → 2026-03-03)
**Files changed:** 17 (826 insertions, 77 deletions)

**Delivered:** User-selectable hitting surface preference (Mat/Grass) with metadata injected into CSV exports, TSV clipboard, and AI prompt context.

**Key accomplishments:**
1. Surface dropdown (Mat/Grass) in popup alongside Speed and Distance selectors
2. Surface metadata auto-injected as first line in CSV and TSV output
3. AI prompt context header extended with pipe-separated surface metadata
4. 11 unit tests covering all output paths (247 total passing)

---

## v1.3 Export & AI (Shipped: 2026-03-03)

**Phases:** 5-7 (3 phases, 8 plans, 22 tasks)
**Timeline:** 5 days (2026-02-26 to 2026-03-02)
**Git range:** `cc63e78` (feat(05-01)) to `020c601` (docs(phase-07))
**Files changed:** 45 (8,565 insertions, 81 deletions)

**Delivered:** Clipboard export and one-click AI analysis with built-in golf prompts, custom prompt templates, and a dedicated options page.

**Key accomplishments:**
1. TSV writer module for tab-separated clipboard export with field escaping and unit-labeled headers
2. 8 built-in golf analysis prompts across 3 skill tiers (beginner/intermediate/advanced)
3. Prompt builder (assemblePrompt) combining templates with TSV data and session metadata
4. Popup clipboard actions — Copy TSV, Open in AI (ChatGPT/Claude/Gemini), Copy Prompt + Data
5. Full options page with CRUD for custom prompt templates and AI service preferences
6. Dynamic popup prompt selector merging built-in + custom prompts with gear icon navigation

**Tests:** 236 total (67 new across 5 test files), all passing

---

