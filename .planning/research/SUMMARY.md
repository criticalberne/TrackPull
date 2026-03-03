# Project Research Summary

**Project:** TrackPull v1.6 — Data Intelligence
**Domain:** Chrome Extension (MV3) — Golf shot data persistence, session comparison, and AI prompt intelligence
**Researched:** 2026-03-03
**Confidence:** HIGH

## Executive Summary

TrackPull v1.6 adds four features to an already-validated Chrome extension stack: session history, cross-session comparison, visual stat cards, and smart prompt suggestions. The existing architecture (TypeScript + esbuild, zero production dependencies, MV3 service worker, `chrome.storage.local`) is the correct foundation — no stack changes are needed. All four features build on existing data models without new data capture, new permissions, or new external dependencies. The recommended approach is a strict separation of concerns: pure TypeScript modules (`session_stats.ts`, `session_comparison.ts`, `prompt_matcher.ts`) for all data computation, with `popup.ts` and `serviceWorker.ts` handling orchestration and storage only.

The most important architectural decision is storage placement for session history. Sessions must go in `chrome.storage.local` (not `sync`), stored as a capped array with `raw_api_data` stripped before persisting. Full `SessionData` objects without the raw API payload are approximately 40-90 KB each; a 10-session cap keeps total history under 900 KB — well within the 10 MB local quota. The existing `EXPORT_CSV_REQUEST` path is preserved unchanged; a new `EXPORT_HISTORY_CSV_REQUEST` handler handles historical re-exports. The session comparison and stat card computations are purely in-memory operations on data already fetched at popup load — no additional storage reads.

The primary risks are: (1) silent storage quota failures if `raw_api_data` is not stripped before saving sessions to history; (2) popup height overflow if the full history list is rendered inline without height constraints; and (3) stale prompt suggestions and stat card values if the `DATA_UPDATED` handler is not extended to trigger re-renders. All three risks are preventable with explicit design choices made before implementation begins.

## Key Findings

### Recommended Stack

The existing stack requires zero changes for v1.6. `chrome.storage.local` with a capped array pattern, CSS Grid within existing token variables, and native TypeScript `Set.has()` lookups cover all four features. No charting libraries, no fuzzy search libraries, no UUID generators, no new manifest permissions. Three new files are added in `src/shared/` (`session_stats.ts`, `session_comparison.ts`, `prompt_matcher.ts`) — all pure functions with no Chrome API dependencies, making them fully testable with `npx vitest run`.

**Core technologies:**
- `chrome.storage.local` (capped array for session history): persists across browser restarts, 10 MB quota; at ~40-90 KB per session the enforced 10-session cap stays under 900 KB total
- CSS Grid + existing `--color-*` tokens: stat card layout with automatic dark mode via the existing token system — no new CSS framework needed
- Native TypeScript `Set.has()` lookup: smart prompt matching via a `Record<string, string[]>` affinity map — no fuzzy search library (fuzzy search solves a different problem class: user-typed text vs. corpus; this is deterministic metric presence)
- Arithmetic delta computation: session comparison via pure subtraction on `ClubGroup.averages` — no statistics library

### Expected Features

**Must have (table stakes):**
- Session auto-save on capture — every sports data tool auto-saves; users should never need to manually trigger a save
- Session history list (browsable from popup or options page) — persistent storage without a browse path is useless
- Re-export any past session as CSV — history is incomplete without re-export; reuses existing CSV export infrastructure with no csv_writer.ts changes
- Visual stat card for current session (total shots, avg carry, avg club speed) — current shot-count-only display leaves obvious value on the table; all required data is already in `cachedData`

**Should have (competitive differentiators):**
- Session comparison delta columns — "did I improve?" is the core golf improvement question; no native Trackman export tool surfaces this; positive/negative delta with directional color coding
- Smart prompt suggestion highlight — reduces cognitive friction when selecting AI prompts; rule-based matching on `metric_names` is zero-latency and requires no API calls
- Export comparison as CSV — natural follow-on once comparison UI exists; reuses CSV writer infrastructure with a new delta-format output shape

**Defer (v2+):**
- Trend view across all sessions (per-club carry trend line) — requires enough historical data to be meaningful; build once users have accumulated sessions
- Session sharing / shareable links — niche demand, significant complexity, no backend infrastructure

### Architecture Approach

v1.6 follows a strict layering pattern: the capture pipeline (`interceptor.ts`, `bridge.ts`) is untouched; `serviceWorker.ts` gains session history persistence logic and two new message handlers; `popup.ts` gains four new render paths; and three new pure modules in `src/shared/` handle all data transformation. The popup's existing module-level cache pattern (`cachedData`, `cachedUnitChoice`) is extended with `cachedHistory: SessionData[]` and `cachedRecommendedPromptId: string | null`. Session data for comparison is served from the in-memory `cachedHistory` array — no second storage read triggered by user interaction.

**Major components:**
1. `serviceWorker.ts` — session history persistence (append-with-cap, deduplication by `report_id`), new `GET_HISTORY` and `EXPORT_HISTORY_CSV_REQUEST` handlers
2. `src/shared/session_stats.ts` — pure function: `SessionData → SessionStats` (avg carry, avg club speed, per-club shot counts); reads from pre-computed `ClubGroup.averages`, not re-computed inline
3. `src/shared/session_comparison.ts` — pure function: `(SessionData, SessionData) → ComparisonResult` with per-club `ClubDelta` including null handling for mismatched clubs; sign convention: B minus A, positive = improved
4. `src/shared/prompt_matcher.ts` — pure function: `(SessionData, BuiltInPrompt[]) → MatchResult | null` using priority-ordered heuristic rules against `metric_names`
5. `popup.ts` — orchestration: fetches history at DOMContentLoaded, wires all four new render paths, extends `DATA_UPDATED` handler to refresh stat card and prompt badge

### Critical Pitfalls

1. **`raw_api_data` stored in session history blows storage quota** — strip the `raw_api_data` field before saving any `SessionData` to history; define a `SessionSnapshot` type with this field omitted; a single large session with `raw_api_data` can reach 700+ KB, hitting the 10 MB quota at just ~14 sessions
2. **No storage quota guard means history silently stops saving** — every `chrome.storage.local.set()` in the history write path must check errors; implement proactive quota check with `getBytesInUse()` before each write; surface a toast on failure rather than dropping silently
3. **Popup height overflow from history list** — the 800x600 px Chrome popup hard limit is already challenged by current v1.5 content; a full session list inside the popup will clip controls; either route the full list to the options page or constrain the popup to a fixed-height (max 120px) scrollable widget showing 2-3 rows
4. **Session comparison breaks on club name mismatches** — club names from the Trackman DOM can vary by whitespace, hyphenation, or report type; normalize (trim, lowercase, collapse separators) before comparison; handle clubs present in only one session with explicit N/A display
5. **Stale stat cards and prompt suggestions when popup stays open across report loads** — both the stat card render and the smart prompt matching must be wired to the `DATA_UPDATED` handler, not only to `DOMContentLoaded`; extract each into a named function called from both initialization and update paths

## Implications for Roadmap

Build order follows feature dependencies strictly: auto-save is the prerequisite for history and comparison; stat cards and prompt suggestions are independent and can be built before or alongside history work.

### Phase 1: Visual Stat Card

**Rationale:** Zero dependencies on other v1.6 work. Requires only `cachedData` (already present in v1.5). Creates the new `session_stats.ts` module and validates the pure-function pattern before it is needed for comparison. Lowest-risk starting point that delivers visible user value immediately.

**Delivers:** Compact stat card in popup showing avg carry, avg club speed, and per-club shot counts. Replaces or augments the current single-number shot count display.

**Addresses:** Table-stakes "at-a-glance summary" feature; reads from pre-computed `ClubGroup.averages` as the single source of truth (prevents double-computation divergence from CSV).

**Avoids:** Pitfall M2 (double-computation of averages) and Pitfall M5 (stale data on `DATA_UPDATED`) — both must be designed correctly from the start by wiring `renderStatCards()` to both `DOMContentLoaded` and the `DATA_UPDATED` handler.

**New files:** `src/shared/session_stats.ts`
**Modified files:** `src/popup/popup.html`, `src/popup/popup.ts`

### Phase 2: Session History Storage and Service Worker

**Rationale:** Foundation for both session history browsing and session comparison. The service worker change (append-to-history in `SAVE_DATA`) is the largest single risk in v1.6 — it must be implemented and stabilized before building any UI that depends on it. Storage design decisions (strip `raw_api_data`, enforce cap, handle quota errors) must be locked in during this phase.

**Delivers:** Automatic session persistence on every capture (up to 10 sessions, rolling eviction of oldest). `GET_HISTORY` and `EXPORT_HISTORY_CSV_REQUEST` message handlers. `SessionSnapshot` type with `raw_api_data` stripped.

**Addresses:** Session auto-save (P1 table stakes); re-export past session (P1 table stakes).

**Avoids:** Pitfall C1 (raw_api_data quota blowout), Pitfall C2 (wrong storage area — all session data stays in `local`, not `sync`), Pitfall C4 (no quota guard — error handling required on every write), Pitfall M3 (orphaned index keys — batch index and session key writes in a single `storage.local.set()` call).

**New storage keys:** `SESSION_HISTORY` in `STORAGE_KEYS`, `MAX_HISTORY = 10` constant
**Modified files:** `src/shared/constants.ts`, `src/models/types.ts`, `src/background/serviceWorker.ts`

### Phase 3: Session History UI (Browse and Re-export)

**Rationale:** Depends on Phase 2 service worker work being stable. Adds the popup UI surface for browsing and re-exporting past sessions. The key design decision — popup inline vs. options page — must favor the options page or a tightly constrained popup widget (max-height: 120px, overflow-y: auto, 2-3 rows) to avoid the 600px height overflow pitfall.

**Delivers:** Session history list accessible from popup (compact widget or link to options page), per-session re-export buttons, human-readable date/shot-count labels ("March 3 · 47 shots").

**Addresses:** "Session history list browsable from popup" (table stakes); popup shows a "Saved to history" toast on successful auto-save.

**Avoids:** Pitfall C5 (popup height overflow) — history list must be height-constrained; route full list to options page if popup space is insufficient.

**Modified files:** `src/popup/popup.html`, `src/popup/popup.ts` (optionally `src/options/options.html`, `src/options/options.ts`)

### Phase 4: Session Comparison

**Rationale:** Depends on Phase 3 providing at least two sessions in popup memory. The comparison computation is a pure function over data already cached in `cachedHistory` — no new storage reads at comparison time. UI complexity (selecting two sessions, rendering delta table, showing surface mismatch warning) is the main work.

**Delivers:** Delta table comparing club averages (avg carry, avg club speed, avg spin rate) between any two stored sessions. Positive/negative delta with CSS class-based color coding (`delta-positive`, `delta-negative`). Surface mismatch indicator when sessions differ on hitting surface.

**Addresses:** Cross-session comparison (core differentiator); export comparison as CSV (P2 follow-on after comparison UI is validated).

**Avoids:** Pitfall C3 (club name mismatch — normalize before comparison), Pitfall M4 (surface mismatch misleads user — show surface for each session in comparison header).

**New files:** `src/shared/session_comparison.ts`
**Modified files:** `src/popup/popup.html`, `src/popup/popup.ts`

### Phase 5: Smart Prompt Suggestions

**Rationale:** Fully independent of history infrastructure — depends only on `cachedData.metric_names` and `BUILTIN_PROMPTS`, both present in v1.5. Placed last because it is the smallest change and drops in cleanly after `popup.ts` is settled from history and comparison work. Building it last avoids re-touching `renderPromptSelect()` multiple times.

**Delivers:** "★ Recommended" badge on the best-fit built-in prompt in the dropdown, based on which Trackman metrics are present in the current session. Badge updates on `DATA_UPDATED` when the user navigates to a new report. User's current selection is never auto-changed.

**Addresses:** Smart prompt suggestion highlight (differentiator); reduces prompt selection decision friction.

**Avoids:** Pitfall M1 (stale matching on `DATA_UPDATED`) — `updateSmartPromptSuggestion()` must be called from both `DOMContentLoaded` initialization and the `DATA_UPDATED` handler.

**New files:** `src/shared/prompt_matcher.ts`
**Modified files:** `src/popup/popup.ts`

### Phase Ordering Rationale

- **Stat card first** because it creates the `session_stats.ts` module pattern independently, delivers visible user value immediately, and has no failure modes that would block other phases
- **Service worker history second** because it is the highest-risk single change (modifies the existing `SAVE_DATA` handler) and must be stable before any UI depends on stored session data
- **History UI third** because it depends on service worker being stable; history browsing is prerequisite to comparison
- **Comparison fourth** because it depends on history UI providing two selectable sessions available in popup memory as `cachedHistory`
- **Prompt matching last** because it is fully independent and the smallest change; building last avoids multiple reopening of `renderPromptSelect()` as `popup.ts` evolves through earlier phases

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (History UI):** The popup-vs-options-page split requires a concrete UX decision before writing any HTML. Measure actual current v1.5 popup height in dev to confirm which approach fits within 600px.
- **Phase 4 (Comparison):** Club name normalization needs an explicit decision on normalization rules before implementation. Review actual Trackman DOM output for club name formatting edge cases across different report types.

Phases with standard patterns (skip additional research):
- **Phase 1 (Stat Card):** Pure function pattern, well-understood. `ClubGroup.averages` as data source confirmed by direct source inspection. Standard vitest test pattern.
- **Phase 2 (Storage):** Storage patterns verified against official Chrome docs. Append-with-cap pattern is well-documented. `raw_api_data` strip confirmed by direct type inspection.
- **Phase 5 (Prompt Matching):** Deterministic lookup table, zero dependencies. Heuristic rules fully defined in research. `<option>` textContent badge pattern confirmed safe across OS.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Zero-dependency constraint maintained; all APIs verified against official Chrome docs; quota math computed from empirical `SessionData` size estimates from actual type shape |
| Features | HIGH | Direct codebase inspection confirms existing data models support all features without new capture logic; competitor analysis confirms session comparison and smart prompts as genuine differentiators |
| Architecture | HIGH | All integration points traced against actual source files in `src/`; message handler patterns, storage key conventions, and popup cache patterns verified by direct code inspection |
| Pitfalls | HIGH | Storage pitfalls verified against official Chrome docs and empirical size estimates; popup 600px limit confirmed via Chromium source; service worker pitfalls from official lifecycle docs |

**Overall confidence:** HIGH

### Gaps to Address

- **`SessionSnapshot` type definition:** Research recommends stripping `raw_api_data` from stored sessions, but the exact type definition (new interface vs. TypeScript `Omit<SessionData, 'raw_api_data'>`) is unresolved. Decide during Phase 2 implementation.
- **History UI placement (popup inline vs. options page):** PITFALLS.md recommends options page for the full list; FEATURES.md and ARCHITECTURE.md recommend an inline popup panel. Measure actual popup height in dev before committing to either approach; the correct answer depends on how much vertical space remains after stat cards are added.
- **Session history cap value (10 vs. 20):** STACK.md recommends 20, ARCHITECTURE.md recommends 10. Both are safe given quota math (20 sessions at 90 KB = 1.8 MB). Pick one value, define it as `MAX_HISTORY` in `constants.ts`, and document the rationale.
- **Comparison metric column selection:** Research suggests 5-7 key metrics (ClubSpeed, BallSpeed, SmashFactor, Carry, Total, SpinRate, LaunchAngle). Confirm this list against actual Trackman metric availability and `metric_names` contents before implementing comparison table columns.

## Sources

### Primary (HIGH confidence)
- Chrome Storage API Reference — quota limits, storage areas, per-item limits: https://developer.chrome.com/docs/extensions/reference/api/storage
- Chrome Extension popup size constraints (800x600 hard limit): Chromium issue tracker https://issues.chromium.org/issues/40655432
- Direct source code inspection: all files in `/Users/kylelunter/claudeprojects/trackv3/src/` — `SessionData` type, `ClubGroup.averages`, `STORAGE_KEYS`, `BUILTIN_PROMPTS`, popup cache pattern, message handler types, `raw_api_data` field
- Chrome Extension service worker lifecycle: https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle
- `chrome.runtime.sendMessage` practical size limits: https://developer.chrome.com/docs/extensions/reference/api/runtime#method-sendMessage

### Secondary (MEDIUM confidence)
- Trackman Portal Activities tab UX — https://support.trackmangolf.com/hc/en-us/articles/28111485485083-Portal-Player-My-Activities-Within-The-Golf-Portal
- NN/g recommendation label UX guidelines — https://www.nngroup.com/articles/recommendation-guidelines/
- PatternFly Dashboard stat card design patterns — https://www.patternfly.org/patterns/dashboard/design-guidelines/
- Coach Dave Delta session comparison UX — https://coachdaveacademy.com/tutorials/a-delta-guide-learning-through-share-and-compare-data/
- DEV Community: Local vs Sync vs Session storage comparison — https://dev.to/notearthian/local-vs-sync-vs-session-which-chrome-extension-storage-should-you-use-5ec8
- GenAI UX contextual prompt suggestion patterns — https://uxdesign.cc/20-genai-ux-patterns-examples-and-implementation-tactics-5b1868b7d4a1

### Tertiary (LOW confidence, verify during implementation)
- w3c/webextensions issue #351 — storage.local limits discussion: https://github.com/w3c/webextensions/issues/351
- HackerNoon — State Storage in Chrome Extensions: https://hackernoon.com/state-storage-in-chrome-extensions-options-limits-and-best-practices

---
*Research completed: 2026-03-03*
*Ready for roadmap: yes*
