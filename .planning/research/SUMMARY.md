# Project Research Summary

**Project:** TrackPull — Trackman Golf Data Chrome Extension
**Domain:** Chrome extension data scraping and CSV export (Manifest V3 / TypeScript)
**Researched:** 2026-03-02
**Confidence:** HIGH

## Executive Summary

TrackPull v1.2.1 is a mature, well-architected Chrome extension with a correct and defensible foundation: Manifest V3 MAIN world API interception, a thin ISOLATED world bridge, a service worker for all Chrome API dispatch, and pure TypeScript shared modules for testable computation. The core stack (TypeScript 5.9.3, esbuild 0.27.3, vitest 4.0.18, zero production dependencies) is at current latest and needs no upgrades. The three gaps worth addressing are: missing tsconfig.json, missing @types/chrome, and the absence of Chrome API mocking in tests. The product's existing feature set already covers all table stakes for a golf data export tool; the next meaningful value increments are capture status visibility, clipboard copy, column selection, and eventually multi-session accumulation.

The recommended approach for v1.3 is to stay within the existing architecture — no new build tools, no production dependencies, no new Chrome permissions — and deliver four P1 features that close the gap between what the extension does and what a user can observe it doing. The architecture's build-order constraint is strict: models/types.ts changes first, then shared/ modules, then serviceWorker.ts message handlers, then popup.ts/popup.html UI. Content scripts only need changes when capture or relay logic changes; all new export formats, history, and visualization require zero content script changes.

The primary ongoing risk is Trackman's undocumented, private API. Both the CSS class selectors for the HTML fallback and the StrokeGroups JSON schema are brittle external dependencies that Trackman can change without notice. The mitigation is a DOM health-check on page load that makes failures user-visible rather than silent, combined with the existing CLAUDE.md discipline of always inspecting live API responses before writing parsing logic. A secondary risk — the one most likely to cause accidental regressions — is shipping stale dist/ artifacts because the build step is manual with no enforcement mechanism.

## Key Findings

### Recommended Stack

The stack requires no changes to core technologies. The two missing dev tools that would meaningfully improve the development experience are @types/chrome (untyped chrome.* calls are the biggest friction in IDE development) and a tsconfig.json with strict mode (esbuild builds without one but tsc cannot run type checks standalone). For Chrome API mocking in tests, vitest-chrome (0.1.0) is the purpose-built option but has low maintenance signals; the pragmatic alternative is vi.stubGlobal('chrome', {...}) per test for the small API surface currently under test.

**Core technologies:**
- TypeScript 5.9.3: static typing, compile-time safety — already at latest, no changes needed
- esbuild 0.27.3: multi-entry IIFE bundling for content scripts — already at latest, correct for MV3
- Manifest V3: extension platform — correct; MAIN + ISOLATED world bridge is the canonical pattern
- chrome.storage.local: persistence — correct; 10 MB quota is sufficient for single sessions
- chrome.downloads API: CSV export via data URI — correct; avoids Blob URL pattern unavailable in service workers

**Missing dev tooling to add:**
- @types/chrome: Chrome API type definitions — eliminates untyped chrome.* calls
- tsconfig.json with strict + isolatedModules + dom lib: enables standalone tsc type checking
- vi.stubGlobal or vitest-chrome: Chrome API mocking in unit tests

### Expected Features

TrackPull's unique competitive position is native in-browser capture on Trackman's web report — no other tool does this. Every competitor (Golf Shot Analytics, R10Progress, ShotMetrics AI) requires the user to already have a CSV file. This means the most defensible next features extend the scraping experience rather than add downstream analytics where dedicated platforms are already far better.

**Must have (table stakes — already implemented):**
- CSV export with all shot metrics — the core product value
- Per-club grouping and averages — universal expectation in golf data tools
- Unit selection (yards/meters, mph/km/h) — international user base
- Shot count visible in popup — confirms capture succeeded
- Clear/reset session button — essential for session management
- Consistent column ordering in CSV — users build Excel templates against fixed columns

**Must have (table stakes — not yet implemented):**
- Capture status indicator — users cannot tell if the extension is actively intercepting or has missed data
- Export feedback (success/error state) — standard UX; currently unverified as implemented

**Should have (differentiators — v1.3):**
- Clipboard copy (tab-delimited) — power users live in Excel/Google Sheets; eliminates file download workflow
- Column selection for export — lets users trim to what matters; preference persisted in chrome.storage.sync

**Should have (differentiators — v1.x after validation):**
- Multi-session accumulation — every comparable tool builds historical shot logs; single-session export limits analysis
- Shot filtering before export — analysts want clean data; Trackman's own UI has outlier hiding
- Per-session filename with label — friction when running multiple sessions per day

**Defer (v2+):**
- Club distance gapping summary — more meaningful once multi-session data exists
- JSON export toggle — defer until evidence of programmatic users
- Toolbar badge status — polish; not blocking any real use case

### Architecture Approach

The MAIN world / ISOLATED world / service worker / shared modules separation is the correct canonical MV3 architecture and must be preserved as-is. The strict build order (types → shared → service worker → popup) is enforced by the component dependency graph, not by tooling, so every implementation phase must respect it deliberately. New export formats, column selection, and clipboard copy require zero content script changes — they are additions to shared/ plus serviceWorker.ts message handlers plus popup UI. Multi-session history requires a storage model change and a new `sessionHistory` key separate from the current `trackmanData` key; merging them would be a backward-compatibility mistake.

**Major components:**
1. interceptor.ts (MAIN world) — monkey-patches fetch/XHR, parses StrokeGroups JSON, scrapes .group-tag DOM elements, postMessages to bridge
2. bridge.ts (ISOLATED world) — thin relay only; filters postMessage events, forwards to service worker via chrome.runtime.sendMessage; no logic here
3. serviceWorker.ts — all Chrome API dispatch; handles SAVE_DATA, GET_DATA, EXPORT_CSV_REQUEST; single source of truth for side effects
4. popup.ts — UI layer; triggers service worker messages; reads unit prefs directly from storage (acceptable for read-only)
5. shared/ (csv_writer, unit_normalization, html_table_parser, constants, types) — pure functions; zero Chrome API surface; fully testable without mocking

### Critical Pitfalls

1. **Trackman CSS class rename breaks HTML fallback silently** — Add a DOM health-check on page load that logs a visible warning if expected selectors match nothing; verify all CSS selectors against the live site before any merge touching html_scraping.ts or constants.ts
2. **Trackman StrokeGroups JSON schema change breaks interceptor silently** — Log parse failures explicitly when containsStrokegroups() returns true but parseSessionData() returns null; inspect live API responses before writing any new metric parsing logic (enforced by CLAUDE.md)
3. **Service worker cold-start drops in-flight messages** — Test capture on cold browser profile (no popup pre-opened) for any phase adding new message types; add retry loop to bridge.ts for critical message types
4. **Stale dist/ artifacts released** — End every phase task list with: run vitest, run build script, verify dist/ timestamps are newer than src/ timestamps, then commit both source and dist in same commit
5. **New manifest permission disables extension on update** — Review manifest diff before every release; use optional_permissions for non-core capabilities rather than baking them into required permissions

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Foundation and UX Parity

**Rationale:** Two table-stakes features are missing (capture status indicator, export feedback) and two dev tooling gaps (tsconfig.json, @types/chrome) create friction in every subsequent phase. Close these before adding new features so that the development environment is correct and users can observe the extension working. No new permissions, no architecture changes.

**Delivers:** Capture status visible in popup ("Waiting", "Captured N shots", "Capture failed"), export success/error feedback, typed Chrome API calls, standalone tsc type checking, optional Chrome API mocking in tests.

**Addresses:** Capture status indicator (FEATURES.md table stakes), export feedback (FEATURES.md table stakes), tsconfig + @types/chrome (STACK.md missing dev tooling).

**Avoids:** The UX pitfall of popup showing "0 shots" with no explanation (PITFALLS.md UX Pitfalls section). Establishes the "dist/ rebuild is mandatory" workflow before new features add complexity.

**Research flag:** Standard patterns — skip phase research. tsconfig.json setup and @types/chrome installation are well-documented; popup status indicator is vanilla DOM.

---

### Phase 2: Power User Export Features

**Rationale:** Clipboard copy and column selection are both P1 features with LOW implementation cost and HIGH user value. They require only shared/ additions (new formatter for clipboard), a serviceWorker.ts message handler, and popup UI changes — zero content script changes. They are independent of each other and can be delivered together. Column selection requires chrome.storage.sync for preference persistence; this is the only new storage key needed.

**Delivers:** One-click clipboard copy (tab-delimited for direct Excel/Sheets paste), column selection checkboxes in popup with preferences persisted across sessions, user-visible feedback on clipboard copy success.

**Addresses:** Clipboard copy (FEATURES.md P1 differentiator), column selection (FEATURES.md P1 differentiator).

**Uses:** Existing service worker dispatch pattern (ARCHITECTURE.md Pattern 2), shared/ pure function pattern (ARCHITECTURE.md Pattern 3), navigator.clipboard.writeText() — no new permissions needed.

**Avoids:** Column selection must be include/exclude only, not reordering — column reordering conflicts with the fixed column ordering guarantee that downstream user templates depend on (FEATURES.md Dependency Notes).

**Research flag:** Standard patterns — skip phase research. navigator.clipboard and chrome.storage.sync are well-documented APIs.

---

### Phase 3: Multi-Session Accumulation

**Rationale:** Multi-session accumulation is the single feature that would most differentiate TrackPull from a simple scraper and move it toward a longitudinal data tool. It is also the most architecturally impactful feature — it requires a storage model change, session identity logic, and a popup UI extension. Delivering it after Phase 2 ensures the popup UX patterns are established before adding history complexity.

**Delivers:** Session history persisted across Trackman report visits, history list in popup or side panel, session labeling in export filenames, accurate shot accumulation across clubs within a session.

**Addresses:** Multi-session accumulation (FEATURES.md P2 differentiator), per-session filename with label (FEATURES.md P2).

**Uses:** Separate `sessionHistory` storage key pattern (ARCHITECTURE.md Anti-Pattern 5 — do NOT merge with `trackmanData`), chrome.storage.local for history metadata + individual session keys. If history exceeds ~50 sessions, evaluate IndexedDB or unlimitedStorage permission.

**Avoids:** Storage quota pitfall (PITFALLS.md Pitfall 6) — estimate payload before shipping, add explicit quota error handling with user-visible message in popup. Anti-Pattern 5 (ARCHITECTURE.md) — keep current session key separate from history array.

**Research flag:** Needs research-phase during planning. Session identity (what defines a unique session: URL, timestamp, club set, report ID?), IndexedDB vs chrome.storage trade-offs, and pruning strategy for long-term history all require deeper design before implementation.

---

### Phase 4: Shot Filtering and Data Quality

**Rationale:** Once shot data persists across sessions, users need a mechanism to remove outliers before the historical record grows with bad data. This phase adds shot-level state management in the popup and builds on the multi-session storage model from Phase 3. Delivering filtering after accumulation prevents the phase from being blocked on undefined data model details.

**Delivers:** Shot-level include/exclude UI in popup before export, outlier flagging or manual shot removal, ability to clean captured sessions before committing to history.

**Addresses:** Shot filtering before export (FEATURES.md P2 differentiator).

**Uses:** Shot-level state management extending the Phase 3 storage model (FEATURES.md Feature Dependencies). Filtering logic belongs in shared/ as a pure function.

**Avoids:** Storing filtered state in the bridge or content scripts — all filtering logic must live in shared/ or serviceWorker.ts (ARCHITECTURE.md Anti-Pattern 3).

**Research flag:** Needs light research during planning. The UX pattern for shot-level selection in a constrained popup (800x600) needs a decision: inline table with checkboxes vs. side panel. Evaluate chrome.sidePanel API if the popup is too cramped.

---

### Phase Ordering Rationale

- Phase 1 before everything: the dev tooling gaps (tsconfig, @types/chrome) slow down all subsequent phases, and the UX parity gap (capture status, export feedback) undermines user confidence in features added later
- Phase 2 before Phase 3: clipboard and column selection are architecturally simple and deliver clear user value without the data model complexity of multi-session storage; validating Phase 2 confirms direction before investing in Phase 3
- Phase 3 before Phase 4: shot filtering depends on shot-level persistent state, which is only defined in Phase 3's storage model
- Content script changes (interceptor.ts, bridge.ts) are not required in any of the 4 phases — all new features route through shared/ + serviceWorker.ts + popup, preserving capture stability across all phases

### Research Flags

Phases requiring deeper research during planning:
- **Phase 3 (Multi-Session Accumulation):** Session identity definition, IndexedDB vs. chrome.storage trade-off, history pruning strategy, storage quota estimation at scale
- **Phase 4 (Shot Filtering):** Popup vs. side panel UX trade-off for shot-level selection; chrome.sidePanel API suitability

Phases with standard, well-documented patterns (skip research-phase):
- **Phase 1 (Foundation and UX Parity):** tsconfig.json setup, @types/chrome installation, popup status indicator are all straightforward
- **Phase 2 (Power User Export):** navigator.clipboard, chrome.storage.sync, and service worker message handler pattern are established

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All recommendations based on official docs and direct source code inspection; tsconfig/@types/chrome additions are unambiguous improvements |
| Features | MEDIUM | Ecosystem surveyed via product pages and open-source scraper inspection; no single authoritative spec for this niche; competitor feature parity confirmed |
| Architecture | HIGH | Based on direct source code inspection plus official MV3 documentation; component boundaries and build order are verified against the actual codebase |
| Pitfalls | HIGH for Chrome mechanics, MEDIUM for Trackman API stability | Chrome extension platform behavior confirmed via official docs; Trackman API stability is inferred from existing scraper behavior and indirect evidence of active metric expansion |

**Overall confidence:** HIGH

### Gaps to Address

- **Session identity definition:** What constitutes a unique session (URL, timestamp, report ID, club set detected) is undefined and must be resolved before Phase 3 can be planned. The wrong choice here causes duplicate accumulation or missed shots.
- **Trackman API stability monitoring:** There is no automated mechanism to detect when Trackman changes its API schema or CSS classes. The DOM health-check from Phase 1 partially mitigates this but is reactive, not proactive.
- **vitest-chrome compatibility:** vitest-chrome@0.1.0 has low maintenance signals and may not be compatible with vitest@4.0.18. Validate before committing to it in Phase 1; fall back to vi.stubGlobal if incompatible.
- **Storage cost estimation for multi-session history:** A single session is ~50-200 KB. At 50 sessions, this approaches the 10 MB chrome.storage.local limit. The decision on whether to add unlimitedStorage permission or use IndexedDB should be made before Phase 3 design begins.

## Sources

### Primary (HIGH confidence)
- Direct source code inspection: `/Users/kylelunter/claudeprojects/trackv3/src/` — component boundaries, data flow, existing patterns
- Chrome for Developers — Storage API: https://developer.chrome.com/docs/extensions/reference/api/storage — 10 MB quota, storage key behavior
- Chrome for Developers — Service Worker Lifecycle: https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle — idle termination, cold-start behavior
- Chrome for Developers — MV3 Migration Guide: https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3 — MAIN/ISOLATED world mechanics
- Chrome for Developers — Declare Permissions: https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions — privilege escalation on update
- Chrome for Developers — sidePanel API: https://developer.chrome.com/docs/extensions/reference/api/sidePanel — side panel for future richer UI
- TypeScript 5.9 Release Notes: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-9.html — current version confirmed
- Vitest 4.0 Migration Guide: https://vitest.dev/guide/migration.html — vitest 4.x breaking changes confirmed as non-impactful for current config

### Secondary (MEDIUM confidence)
- Golf Shot Analytics Features: https://www.golfshotanalytics.com/features — competitor feature landscape
- ShotMetrics AI Features: https://shotmetrics-ai.com/features/ — competitor feature landscape
- R10Progress: https://r10progress.com/ — competitor feature landscape
- Trackman Map My Bag: https://www.trackman.com/blog/golf/know-your-numbers-introducing-map-my-bag-in-tps-10-1 — distance gapping as primary use case
- ericKlawitter/trackman_scraper GitHub — alternative Trackman scraper feature comparison

### Tertiary (LOW confidence)
- Trackman at 2025 PGA Show — Golf Simulator Forum: evidence of active metric expansion; validation needed during Phase 3 planning
- vitest-chrome@0.1.0: https://github.com/probil/vitest-chrome — minimal maintenance signals; validate compatibility before using

---
*Research completed: 2026-03-02*
*Ready for roadmap: yes*
