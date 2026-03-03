# Feature Research

**Domain:** Golf data scraping and export Chrome extension — session persistence, comparison, and intelligent suggestions
**Researched:** 2026-03-03
**Confidence:** HIGH for storage patterns (verified Chrome docs); HIGH for stat card UX (established dashboard patterns); MEDIUM for session comparison UX (analogous domain — sports telemetry, fitness apps); MEDIUM for smart prompt matching (analogous to contextual recommendation patterns)

---

## Milestone Scope

This document covers **v1.6 features only**: session history, session comparison, visual shot summary stat card, and smart prompt suggestions. It extends the v1.5 FEATURES.md. Prior v1.5 features are fully shipped and not re-analyzed here.

The existing system is fully ephemeral — `STORAGE_KEYS.TRACKMAN_DATA` holds only the live session captured during the current page visit. `SessionData` has `date`, `report_id`, `club_groups[]` (with `shots[]`, `averages`, `consistency`), and `metric_names`. All four v1.6 features build on this existing data model without requiring new capture logic.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users consider obvious given the v1.6 goal. Missing these makes the milestone feel unfinished.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Session history list browsable in popup | Any sports data tool that persists sessions exposes a way to browse them — Trackman's own app has an "Activities" tab for this. Users who scroll back to last week's session expect to find it somewhere. | MEDIUM | Requires a new UI surface (session list view) in the popup, a storage schema for multiple sessions keyed by `report_id` + date, and a read/load path. The popup today has a single-view layout — this adds a second "view" (current vs. history). |
| Re-export a past session from history | If history is stored but you can only view it, not act on it, the feature feels read-only and incomplete. | MEDIUM | Re-export requires loading the historical `SessionData` into the same CSV/TSV export flow already built. The background service worker handler (`EXPORT_CSV_REQUEST`) already accepts session data from storage — re-point the key to a historical entry. |
| Visual stat card for current session | After capturing data, users want a glanceable summary: total shots, avg carry, avg club speed — not a raw shot count. The v1.5 empty state guidance showed the value of contextual info at a glance. | LOW | Compute from `cachedData.club_groups[].shots[].metrics` — `ClubSpeed` and `Carry` are standard metrics in every session. Show 3-4 key numbers. No new data, no new storage — pure display logic built from existing cached values. |
| Persist sessions automatically on capture | If users must manually "save" a session, they will forget. Every sports tracking app auto-saves. | LOW | On `DATA_UPDATED` message in background, compare incoming `report_id` to stored history keys. If new, append it. If same, update in place (handles multi-page merge). This is an additive side-effect in the existing `DATA_UPDATED` handler. |

---

### Differentiators (Competitive Advantage)

Features that go beyond expected behavior and create a meaningfully better experience specific to this tool.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Session comparison delta columns | Golf improvement is about trend — "am I hitting further than last week?" Delta columns between two sessions' club averages (e.g., carry +4 yds, club speed -1 mph) answer this directly without the user having to manually compute. No other Trackman export tool surfaces this. | HIGH | Requires selecting two sessions, computing per-club averages for the same metric across both sessions, and rendering a delta table. Club names must match exactly for comparison to be meaningful. The delta format (absolute, percentage, or directional arrow) is a design decision. Export as CSV is a natural extension. |
| Smart prompt suggestion highlight | Users don't always know which prompt fits their data. If the session has SpinRate data, the "Launch & Spin Optimization" prompt is automatically relevant. A subtle "Recommended" badge on the most relevant prompt in the dropdown reduces the cognitive cost of prompt selection. | LOW | Rule-based matching on `SessionData.metric_names`: if session contains `SpinRate` + `SpinAxis` → rank "launch-spin" prompt higher; if `FaceAngle` + `ClubPath` present → rank "shot-shape" or "club-delivery"; if only `Carry` + `ClubSpeed` → rank "quick-summary" or "distance-gapping". This is a pure UI annotation on the existing prompt select — no new storage, no AI. |
| Export comparison as CSV | After running a session comparison, let the user download the delta table as a CSV for their own analysis or sharing. | MEDIUM | Same CSV writer infrastructure already in place. Requires a new CSV shape: club name, metric, session A value, session B value, delta. The delta computation happens in the comparison logic — this is an output path for that result. Dependency: session comparison delta columns must exist first. |

---

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Unlimited session history storage | Users want all their sessions saved forever | `chrome.storage.local` has a 10 MB quota. A typical `SessionData` JSON object (with all metric columns for 40 shots across 8 clubs) is approximately 30-80 KB. At 80 KB/session, the 10 MB limit is hit at ~125 sessions. Requesting `unlimitedStorage` triggers a permission prompt on update and expands the extension's data footprint on the user's machine. | Cap history at 20 most recent sessions (rolling eviction of oldest). 20 × 80 KB = 1.6 MB max. Add a "Clear all history" button in the options page. Document the cap in the UI. |
| Cloud sync of session history to `chrome.storage.sync` | Appealing for users with multiple devices | `chrome.storage.sync` has a 100 KB total quota and 8 KB per item. A single `SessionData` object may exceed 8 KB. Syncing session history would require fragmentation logic and would hit quota almost immediately. | Session history stays `chrome.storage.local` only. Existing AI service preference lives in `sync` (100 bytes) — keep that pattern but don't extend it to sessions. |
| Session comparison with more than 2 sessions simultaneously | Power users might want 3-way or trend-over-time comparison | Multi-session comparison multiplies UI complexity (which two to compare? which order? how to show N deltas?) with diminishing return. The core question is "did I improve?" which is answered by 2-session comparison. | Ship 2-session comparison only. The user can do multi-session analysis by exporting each session as CSV and using a spreadsheet. |
| AI-powered prompt suggestion (send data to LLM to pick best prompt) | Seems smarter than rule-based | Requires an API key, a backend, or injecting data into an AI service just to get a prompt recommendation — before the user even starts their analysis. The value delivered is marginal (8 prompts is a short list; users can read them). | Rule-based matching on `metric_names` is deterministic, instant, works offline, requires no permissions, and covers the real use case: "I have spin data, should I use the spin prompt?" |
| Session history in a full options page tab | More space for a rich history UI | The options page is for preferences, not for primary data interaction. History browsing is a popup-native workflow: the user just captured data and wants to browse or compare. Putting it in options creates a context switch. | Inline history panel within the popup (collapsible, or a second "view" toggled by a History button). Keep the interaction surface close to where the user already is. |
| Comparison as a persistent "saved comparison" | Let users save a comparison result for reference later | Adds a new storage entity type (saved comparisons) on top of session history. Most users want to act on the comparison immediately (download, send to AI). Persisting comparisons adds complexity without demonstrated demand. | Stateless comparison: select two sessions, compute delta on demand, download or copy. No persistence of comparison results. |

---

## Feature Dependencies

```
[Session Auto-Save]
    └──requires──> [DATA_UPDATED message handler] (already exists in background.ts)
    └──requires──> [chrome.storage.local history schema] (new — session list keyed by report_id)
    └──feeds──> [Session History List]
    └──feeds──> [Session Comparison]

[Session History List]
    └──requires──> [Session Auto-Save] (needs data to list)
    └──requires──> [Popup view-switching logic] (new — toggle between current session view and history view)
    └──enables──> [Re-export Past Session]
    └──enables──> [Session Comparison]

[Re-export Past Session]
    └──requires──> [Session History List] (must be able to select a session)
    └──requires──> [EXPORT_CSV_REQUEST handler] (already exists; re-point to historical session data)

[Visual Stat Card]
    (independent — reads cachedData, which already exists at DOMContentLoaded)
    └──enhances──> [Shot count display] (replaces/augments the current single-number shot count)

[Session Comparison Delta Columns]
    └──requires──> [Session History List] (must have >= 2 sessions to compare)
    └──requires──> [Per-club average computation] (already in ClubGroup.averages — existing data)
    └──enables──> [Export Comparison as CSV]

[Export Comparison as CSV]
    └──requires──> [Session Comparison Delta Columns]
    └──requires──> [CSV writer] (already exists; needs new delta-format output shape)

[Smart Prompt Suggestion Highlight]
    (independent — reads cachedData.metric_names and BUILTIN_PROMPTS; no new storage)
    └──enhances──> [Prompt select dropdown] (adds visual annotation only)
```

### Dependency Notes

- **Session auto-save is the foundation.** Without it, history and comparison have no data. It must ship before any other v1.6 feature is useful. It is also the lowest-complexity item — a side-effect write in the existing data handler.
- **Visual stat card and smart prompt suggestion are fully independent.** They require only `cachedData`, which is already pre-fetched at popup load time. Either can ship without session history infrastructure.
- **Session comparison depends on history list.** You cannot compare sessions you cannot select. Implement history storage and list UI before tackling comparison delta computation.
- **Re-export and comparison both reuse existing infrastructure.** The CSV export path already exists. The averages data is already present in `ClubGroup.averages`. The new work is the selection UI and the delta computation, not the data layer.
- **Smart prompt suggestion has zero storage dependencies.** It is a pure computation on `metric_names` (already on `SessionData`) and `BUILTIN_PROMPTS` (already in `prompt_types.ts`). A lookup function + one CSS class added to the relevant `<option>` is the entire implementation.

---

## MVP Definition

The v1.6 scope is pre-defined in PROJECT.md. This section maps it to a recommended build order based on dependencies and risk.

### Launch With (v1.6 core — build in this order)

- [ ] **Session auto-save** — Foundation for history and comparison. Side-effect write in `DATA_UPDATED` handler. Define storage schema: `sessionHistory: { [reportId]: SessionData }` in `chrome.storage.local`. Cap at 20 sessions with rolling eviction.
- [ ] **Visual stat card** — Independent of history. Reads `cachedData`. Add 3-4 key metrics (total shots, avg carry, avg club speed, shot distribution by club) to popup above current shot count display. Zero new storage or data capture.
- [ ] **Smart prompt suggestion highlight** — Independent of history. Rules on `metric_names` → add a `data-recommended` attribute or "Recommended" badge to the best-fit prompt option. Single function + minimal CSS.
- [ ] **Session history list** — Requires auto-save. Add a "History" button to popup that toggles a second view listing past sessions with date, shot count, and re-export button.
- [ ] **Session comparison delta columns** — Requires history list. Select two sessions, compute per-club delta on `ClubGroup.averages`, render a comparison table. The core question it answers: "How did I improve?"

### Add After Validation (v1.6 follow-on)

- [ ] **Export comparison as CSV** — Trigger: if users engage with session comparison, the natural next action is downloading the delta. Add after core comparison UI is proven.

### Future Consideration (v2+)

- [ ] **Trend view across all sessions** — Once enough sessions are stored, a per-club carry trend line would be valuable. Defer until history is live and users have accumulated multiple sessions.
- [ ] **Share session** — Export a session as a shareable link or QR code. No backend — requires encoding the session data in the URL. Niche demand, high complexity.

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Session auto-save | HIGH (enables everything else) | LOW | P1 |
| Visual stat card | HIGH (immediate, no dependencies) | LOW | P1 |
| Smart prompt suggestion | MEDIUM (reduces decision friction) | LOW | P1 |
| Session history list | HIGH | MEDIUM | P1 |
| Session comparison delta columns | HIGH (core differentiator) | HIGH | P1 |
| Export comparison as CSV | MEDIUM | MEDIUM | P2 |
| Trend view across sessions | HIGH | HIGH | P3 |

**Priority key:**
- P1: Ship in v1.6
- P2: Add when comparison UI is validated
- P3: Future consideration; requires enough historical data to be useful

---

## Technical Implementation Notes

### Storage Schema for Session History

`chrome.storage.local` — current 10 MB quota (since Chrome 113+). Confirmed authoritative via Chrome developer docs.

Recommended schema:
```typescript
// Storage key: STORAGE_KEYS.SESSION_HISTORY (new key)
// Value type:
interface SessionHistoryEntry {
  report_id: string;   // deduplification key
  date: string;        // from SessionData.date
  shot_count: number;  // computed at save time (avoids re-counting on list render)
  session: SessionData; // full session object
}
// Stored as array, newest first. Cap at 20 entries.
// When > 20, shift() the oldest.
```

A typical `SessionData` (40 shots, 8 clubs, all 28 metric columns) serializes to approximately 30-80 KB JSON. At 80 KB worst case × 20 sessions = 1.6 MB — well within the 10 MB limit with room for other stored preferences.

Deduplication strategy: if incoming `report_id` already exists in history, replace in place (handles multi-page metric merge scenario). This mirrors the existing `mergeSessionData()` pattern.

### Visual Stat Card

Computed from existing `cachedData` at popup load (no new storage reads). Key metrics available in every session:
- `ClubSpeed` — available on all clubs (speed metrics are captured on every Trackman session)
- `Carry` — available on all clubs (distance metrics always present)
- Shot count per club — already computed in `updateShotCount()`

Display format: 3-4 compact "pill" numbers above or replacing the current shot count display. Example: `42 shots | 145 yd avg carry | 89 mph avg club speed`. The existing `ClubGroup.averages` object already contains these values — no computation needed beyond averaging across clubs.

### Smart Prompt Suggestion Rules

Rule-based matching against `SessionData.metric_names`. Lookup runs once when `cachedData` loads. Add a `getRecommendedPromptId(metricNames: string[]): string` function to `prompt_builder.ts`.

Priority rules (ordered by specificity):
1. `SpinRate` + `SpinAxis` present → recommend `"launch-spin-intermediate"`
2. `FaceAngle` + `ClubPath` + `FaceToPath` present → recommend `"shot-shape-intermediate"` or `"club-delivery-advanced"`
3. `AttackAngle` + `DynamicLoft` present → recommend `"club-delivery-advanced"`
4. `Carry` only (minimal metric set) → recommend `"distance-gapping-beginner"`
5. Default fallback → recommend `"quick-summary-beginner"` (already the current default)

UI: add a `"Recommended"` text label inline in the `<option>` for the matched prompt (e.g., `"Launch & Spin Optimization (Recommended)"`). Alternatively, auto-select the recommended prompt if the user hasn't manually changed their selection in this session. The latter is more impactful but risks overwriting a saved preference — a badge is safer.

### Session Comparison Delta Computation

Source: `ClubGroup.averages` on both sessions. Keys in `averages` are metric names (same as `metric_names` array). Delta is `sessionB.averages[metric] - sessionA.averages[metric]`. Positive delta = improvement in most distance/speed metrics (context-dependent — lower spin or side is better, so sign interpretation is metric-aware).

Club matching: exact string match on `club_name`. Clubs present in one session but not the other are shown with N/A for the missing session's values.

Metric selection for comparison table: expose the same metrics the user has unit preferences for (carry in their chosen distance unit, club speed in their chosen speed unit). Do not dump all 28 metrics into the comparison table — it becomes unreadable. A curated set of 5-7 key metrics per club is the right scope: `ClubSpeed`, `BallSpeed`, `SmashFactor`, `Carry`, `Total`, `SpinRate`, `LaunchAngle`.

### Popup View Architecture

The popup today is a single flat layout. Session history requires a second "view." Two implementation patterns in Chrome extension popups:

1. **Tab-based** — add History/Current tabs at top of popup. Simple but adds permanent vertical height to all views.
2. **Show/hide panel** — a "History" button slides in or reveals a list panel; "Back" returns to current session view. More compact but requires explicit panel state management.

Recommendation: show/hide panel. The popup is already narrow (320-400px width), and tabs add visual weight that the current design avoids. A "History (5)" button in the header area, clicking which slides in a list panel, matches patterns seen in well-designed analytics extensions. State is transient (panel open/closed) — no need to persist which panel is active.

---

## Competitor Feature Analysis

| Feature | Trackman Golf App | FlightScope App | TrackPull v1.6 plan |
|---------|-------------------|-----------------|---------------------|
| Session history | Yes — Activities tab, full history, cloud-backed | Yes — session log in app | Local-only, 20 sessions, popup-accessible |
| Session comparison | Yes — side-by-side stats per club | Limited | Delta table, 2-session, downloadable CSV |
| Visual stat card | Yes — rich dashboard with charts | Yes — basic summary | Compact 3-4 metric pills in popup |
| Smart prompt suggestion | N/A (native AI, no prompts) | N/A | Rule-based badge on best-fit prompt |
| Export to CSV | No (app locks data to their ecosystem) | No | Already shipped — v1.6 extends to historical sessions |

TrackPull's differentiation is the CSV export and AI prompt workflow — both of which the native apps deliberately withhold. The v1.6 features extend that open-data philosophy to historical sessions.

---

## Sources

- [Chrome storage API — quota limits and storage.local](https://developer.chrome.com/docs/extensions/reference/api/storage) — 10 MB limit for local (HIGH confidence)
- [Trackman Portal — Activities tab UX](https://support.trackmangolf.com/hc/en-us/articles/28111485485083-Portal-Player-My-Activities-Within-The-Golf-Portal) — session history patterns in Trackman's own product (MEDIUM confidence)
- [NN/g — Recommendation UX guidelines](https://www.nngroup.com/articles/recommendation-guidelines/) — "Recommended" label UX best practice (MEDIUM confidence)
- [Designing Use-Case Prompt Suggestions — NN/g](https://www.nngroup.com/articles/designing-use-case-prompt-suggestions/) — contextual prompt suggestion patterns for AI UX (MEDIUM confidence)
- [PatternFly Dashboard Design Guidelines](https://www.patternfly.org/patterns/dashboard/design-guidelines/) — stat card design patterns (MEDIUM confidence)
- [Coach Dave Delta — session comparison UX](https://coachdaveacademy.com/tutorials/a-delta-guide-learning-through-share-and-compare-data/) — delta comparison patterns in sports telemetry (MEDIUM confidence — adjacent domain)
- [GenAI UX patterns — contextual prompt suggestions](https://uxdesign.cc/20-genai-ux-patterns-examples-and-implementation-tactics-5b1868b7d4a1) — data-matched AI prompt recommendation patterns (MEDIUM confidence)
- Codebase analysis: `src/models/types.ts`, `src/shared/constants.ts`, `src/popup/popup.ts`, `src/shared/prompt_types.ts` — confirmed existing data models, storage keys, metric names, and prompt IDs available for v1.6 features (HIGH confidence)

---

*Feature research for: TrackPull v1.6 — Data Intelligence (session history, comparison, visual stat summary, smart prompt suggestions)*
*Researched: 2026-03-03*
*Extends v1.5 FEATURES.md. Prior v1.5 entries preserved in that file; only v1.6 features analyzed here.*
