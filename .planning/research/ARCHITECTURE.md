# Architecture Research

**Domain:** Chrome Extension — TrackPull v1.6 Data Intelligence
**Researched:** 2026-03-03
**Confidence:** HIGH (based on direct source code inspection of all current files; chrome.storage quota verified against official Chrome API documentation)

---

## Scope

This document supersedes the v1.5 ARCHITECTURE.md and covers the v1.6 milestone only. The existing baseline architecture is stable and fully documented in the prior version. This file answers: **which files get modified, which new files are required, how each of the four new features integrates into the existing system, and what order to build them.**

---

## Current Architecture Baseline (v1.5)

The system after v1.5:

```
┌────────────────────────────────────────────────────────────────────────┐
│                    trackmangolf.com page                                │
│  ┌──────────────────────────────────────────┐                           │
│  │  interceptor.ts (MAIN world)             │  monkey-patches fetch/XHR │
│  │  → parses StrokeGroups JSON              │  → builds SessionData     │
│  └──────────────────┬───────────────────────┘                           │
│                     │ window.postMessage                                 │
│  ┌──────────────────▼───────────────────────┐                           │
│  │  bridge.ts (ISOLATED world)              │  relays to service worker │
│  └──────────────────┬───────────────────────┘                           │
└─────────────────────┼──────────────────────────────────────────────────┘
                      │ chrome.runtime.sendMessage (SAVE_DATA)
┌─────────────────────▼──────────────────────────────────────────────────┐
│  serviceWorker.ts                                                        │
│  Handlers: SAVE_DATA, GET_DATA, EXPORT_CSV_REQUEST                      │
│  Emits: DATA_UPDATED → popup                                             │
│  APIs: chrome.storage.local, chrome.downloads                           │
└────────────────┬───────────────────────────────────────────────────────┘
                 │ chrome.storage.local + chrome.runtime.onMessage
┌────────────────▼───────────────────┐   ┌────────────────────────────────┐
│  popup.ts / popup.html             │   │  options.ts / options.html      │
│  - shot count + stat card          │   │  - custom prompt CRUD           │
│  - export CSV                      │   │  - built-in prompts (read-only) │
│  - copy TSV to clipboard           │   │  - default AI service setting   │
│  - open in AI                      │   └────────────────────────────────┘
│  - prompt selector dropdown        │
│  - prompt preview (details/summary)│
│  - AI service selector             │
│  - hitting surface selector        │
│  - unit selectors                  │
│  - include averages checkbox       │
└────────────────────────────────────┘

Shared modules (no Chrome APIs):
  shared/constants.ts          — STORAGE_KEYS, METRIC_DISPLAY_NAMES, CSS selectors
  shared/csv_writer.ts         — SessionData → CSV string
  shared/tsv_writer.ts         — SessionData → TSV string (clipboard)
  shared/unit_normalization.ts — conversion math, UnitChoice types
  shared/prompt_builder.ts     — assembles prompt + data payload
  shared/prompt_types.ts       — BuiltInPrompt, CustomPrompt, BUILTIN_PROMPTS
  shared/custom_prompts.ts     — loadCustomPrompts/saveCustomPrompt/deleteCustomPrompt
  shared/html_table_parser.ts  — DOM table extraction utility
  models/types.ts              — SessionData, ClubGroup, Shot interfaces
```

**Storage layout (v1.5):**

| Key | Store | Type | Set by |
|-----|-------|------|--------|
| `trackmanData` | local | SessionData | serviceWorker |
| `speedUnit` | local | `"mph" \| "m/s"` | popup |
| `distanceUnit` | local | `"yards" \| "meters"` | popup |
| `hittingSurface` | local | `"Grass" \| "Mat"` | popup |
| `selectedPromptId` | local | string | popup |
| `includeAverages` | local | boolean | popup |
| `aiService` | sync | string | popup + options |
| `customPrompt_{id}` | sync | CustomPrompt | options |
| `customPromptIds` | sync | string[] | options |

---

## v1.6 System Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│                    trackmangolf.com page                                │
│  interceptor.ts → bridge.ts                (unchanged)                  │
└────────────────────────┬───────────────────────────────────────────────┘
                         │ SAVE_DATA (unchanged)
┌────────────────────────▼───────────────────────────────────────────────┐
│  serviceWorker.ts                                                        │
│  SAVE_DATA: now appends to sessionHistory[] instead of replacing        │
│             trackmanData; enforces MAX_HISTORY cap                      │
│  EXPORT_CSV_REQUEST: no change                                          │
│  NEW: EXPORT_HISTORY_CSV_REQUEST — export a specific past session       │
│  NEW: GET_HISTORY — return sessionHistory[] to popup                    │
└────────────────┬───────────────────────────────────────────────────────┘
                 │
┌────────────────▼───────────────────────────────────────────────────────┐
│  popup.ts / popup.html                                                   │
│  NEW: stat card section (avg carry, avg club speed, shot count by club) │
│  NEW: session history panel (list past sessions, re-export any)         │
│  NEW: session comparison view (select two sessions → delta table)       │
│  MODIFIED: renderPromptSelect() → applies "recommended" badge           │
└────────────────────────────────────────────────────────────────────────┘

New shared modules:
  shared/session_stats.ts      — compute stat card values from SessionData (pure)
  shared/session_comparison.ts — compute delta table from two SessionData (pure)
  shared/prompt_matcher.ts     — match SessionData metrics → best-fit prompt ID (pure)
```

---

## Feature Integration Map

Each feature is analyzed independently: what files it touches, whether any new files are needed, what storage changes are required, and the data flow.

---

### Feature 1: Visual Shot Summary (Stat Card)

**What it does:** Display a compact stat card in the popup showing the three most useful at-a-glance values for the current session: average carry distance, average club speed, and shot count per club.

**Integration analysis:** All required data is already in `cachedData` (the `SessionData` in popup module scope). No new storage reads are needed. The computation is a pure function over `SessionData.club_groups`. The result is rendered as a small table or list in the popup below the shot count display.

**New file required:**

`src/shared/session_stats.ts` — pure, no Chrome API dependencies.

```typescript
export interface SessionStats {
  totalShots: number;
  avgCarry: number | null;        // yards or meters, in stored raw units
  avgClubSpeed: number | null;    // m/s, in stored raw units
  clubShotCounts: Array<{ clubName: string; shotCount: number }>;
}

export function computeSessionStats(session: SessionData): SessionStats;
```

The function iterates `club_groups`, averaging the `Carry` and `ClubSpeed` metrics across all shots. Returns `null` for a metric if no shots contain it (some reports omit speed metrics). `clubShotCounts` is ordered by club as they appear in the session.

**Files modified:**

| File | Change |
|------|--------|
| `src/popup/popup.html` | Add `<div id="stat-card">` section below the shot count container; contains avg carry, avg speed, and per-club shot count rows |
| `src/popup/popup.ts` | Import `computeSessionStats` from `shared/session_stats.ts`; call after `cachedData` is set; call again on `DATA_UPDATED` message |

**Files created:**

| File | Purpose |
|------|---------|
| `src/shared/session_stats.ts` | Pure function: `SessionData → SessionStats` |

**Storage schema changes:** None. All data for stat card is computed from `cachedData` in memory.

**Data flow:**

```
DOMContentLoaded → storage.local.get([TRACKMAN_DATA])
        ↓
cachedData = SessionData
        ↓
computeSessionStats(cachedData) → SessionStats
        ↓
render stat card in #stat-card DOM element

DATA_UPDATED event → cachedData updated → re-render stat card
```

**Unit display:** Raw values from the API are in m/s and meters. Apply `normalizeMetricValue` from `unit_normalization.ts` with `cachedUnitChoice` to display in the user's selected units. The stat card respects the same speed and distance unit toggles as the CSV export.

**Build order position:** Build first. Pure function new file + HTML/CSS only. Zero cross-feature dependencies. Validates the `session_stats.ts` module before it is potentially used by comparison.

---

### Feature 2: Session History

**What it does:** Every time a Trackman report is captured, the session is added to a persistent history list (up to a configurable cap). Users can browse past sessions from the popup and re-export any of them as CSV.

**Integration analysis:** This is the largest architectural change in v1.6. Currently `SAVE_DATA` overwrites `trackmanData` with the new `SessionData`. For history, the service worker must instead append to a `sessionHistory` array and trim it to `MAX_HISTORY` entries. The popup needs a new panel to list past sessions with date/shot-count labels and "Export CSV" actions for each.

**Storage design:**

The current `trackmanData` key holds the most recently captured session and is used by `EXPORT_CSV_REQUEST`. Both behaviors must remain intact for v1.6 (the current session export must continue to work unchanged).

Two storage strategies were considered:

- **Option A: Single key `sessionHistory[]`** — an array of all past sessions including the current one. `trackmanData` becomes redundant and is removed. Risk: single 10MB key limit per item in chrome.storage.local is not the constraint (total quota is 10MB, not per-key), but large arrays become harder to partially update.

- **Option B: Keep `trackmanData` for current session + new `sessionHistory[]` for historical archive** — `SAVE_DATA` writes to both: updates `trackmanData` (existing behavior, zero regression risk) and appends to `sessionHistory[]`. When the popup browses history, it reads `sessionHistory`. When the user exports the current session, it uses `trackmanData` (existing `EXPORT_CSV_REQUEST` path). When the user exports a past session, a new `EXPORT_HISTORY_CSV_REQUEST` reads the specific entry from `sessionHistory`.

**Recommended: Option B.** It preserves backward compatibility exactly. The existing `EXPORT_CSV_REQUEST` path is unchanged. No regression risk to any v1.5 feature.

**Storage quota:** chrome.storage.local quota is 10MB (raised from 5MB in Chrome 113). A typical session with 50 shots and 28 metrics stringifies to approximately 30-60KB. Capping history at 10 sessions costs at most 600KB — well within the 10MB quota. `MAX_HISTORY = 10` is a safe default. Add a `SESSION_HISTORY` key to `STORAGE_KEYS`.

**New message types in serviceWorker.ts:**

```typescript
interface GetHistoryRequest {
  type: "GET_HISTORY";
}

interface ExportHistoryCsvRequest {
  type: "EXPORT_HISTORY_CSV_REQUEST";
  sessionIndex: number;  // index into sessionHistory array (0 = oldest)
}
```

**Files modified:**

| File | Change |
|------|--------|
| `src/shared/constants.ts` | Add `SESSION_HISTORY: "sessionHistory"` and `MAX_HISTORY = 10` to `STORAGE_KEYS` |
| `src/background/serviceWorker.ts` | Modify `SAVE_DATA` handler: after saving `trackmanData`, read `sessionHistory`, append new session, trim to `MAX_HISTORY`, save back; add `GET_HISTORY` handler returning the array; add `EXPORT_HISTORY_CSV_REQUEST` handler reading `sessionHistory[sessionIndex]` and calling `writeCsv()` |
| `src/popup/popup.html` | Add `<div id="history-panel">` section with a session list; each row shows date + shot count + "Export" button |
| `src/popup/popup.ts` | On DOMContentLoaded: send `GET_HISTORY` to service worker, render history list; wire each row's "Export" button to send `EXPORT_HISTORY_CSV_REQUEST` with the index |

**Files created:** None (all changes are to existing files).

**Storage schema changes:**

| Key | Store | Type | Default | Set by |
|-----|-------|------|---------|--------|
| `sessionHistory` | local | `SessionData[]` | `[]` | serviceWorker |

**Data flow:**

```
Interceptor captures new session
        ↓
SAVE_DATA → serviceWorker
        ↓
chrome.storage.local.get(["trackmanData", "sessionHistory"])
        ↓
Set trackmanData = newSession  (existing behavior preserved)
Append newSession to sessionHistory[]
Trim sessionHistory to MAX_HISTORY (remove oldest if over cap)
chrome.storage.local.set({ trackmanData, sessionHistory })
        ↓
DATA_UPDATED emitted → popup updates current session display

Popup opens → sends GET_HISTORY
        ↓
serviceWorker returns sessionHistory[]
        ↓
popup renders history panel (date, shot count, Export button per row)

User clicks Export on history row
        ↓
EXPORT_HISTORY_CSV_REQUEST { sessionIndex: N }
        ↓
serviceWorker reads sessionHistory[N] + preferences from storage
        ↓
writeCsv(sessionHistory[N], ...) → chrome.downloads.download()
```

**Key constraint — deduplication:** If the user navigates between pages of the same Trackman report (which triggers multiple `SAVE_DATA` messages with the same `report_id`), each navigation adds a duplicate entry. Solution: before appending to `sessionHistory`, check if the last entry has the same `report_id`. If yes, replace it (same session updated with more metrics) rather than appending. This mirrors the existing `mergeSessionData` pattern from `models/types.ts`.

**Build order position:** Build second, after stat card. The history list's "Export" button follows the same pattern as the existing export button. The `EXPORT_HISTORY_CSV_REQUEST` handler in serviceWorker.ts is straightforward — it shares all the unit/surface preference reading code with the existing `EXPORT_CSV_REQUEST` handler.

---

### Feature 3: Session Comparison

**What it does:** User selects two sessions from the history list and the popup shows a delta table comparing club averages: for each club present in both sessions, show the change in avg carry, avg club speed, and avg spin rate (most meaningful comparison metrics).

**Integration analysis:** This is a pure computation over two `SessionData` objects retrieved from `sessionHistory`. No new Chrome API usage. The comparison UI lives in the popup (either inline in the history panel or as a separate expandable section). A "Compare" button in the history panel lets users select two sessions. The comparison result is rendered as a table.

**New file required:**

`src/shared/session_comparison.ts` — pure, no Chrome API dependencies.

```typescript
export interface ClubDelta {
  clubName: string;
  avgCarryA: number | null;
  avgCarryB: number | null;
  avgCarryDelta: number | null;      // B - A (positive = improved carry)
  avgClubSpeedA: number | null;
  avgClubSpeedB: number | null;
  avgClubSpeedDelta: number | null;
  avgSpinRateA: number | null;
  avgSpinRateB: number | null;
  avgSpinRateDelta: number | null;
}

export interface ComparisonResult {
  sessionADate: string;
  sessionBDate: string;
  clubDeltas: ClubDelta[];           // clubs present in at least one session
}

export function compareSessions(
  sessionA: SessionData,
  sessionB: SessionData
): ComparisonResult;
```

The function computes per-club averages for each metric by iterating shots, then diffs the two sessions for each club. Clubs present in only one session have `null` for all values from the missing session.

**Files modified:**

| File | Change |
|------|--------|
| `src/popup/popup.html` | Add comparison selection UI (two `<select>` dropdowns populated with history entries by date+index, or checkboxes on history rows) and a `<div id="comparison-result">` table container |
| `src/popup/popup.ts` | Import `compareSessions` from `shared/session_comparison.ts`; wire selection UI → call `compareSessions(sessionA, sessionB)` → render delta table in `#comparison-result`; apply unit normalization using `cachedUnitChoice` for display |

**Files created:**

| File | Purpose |
|------|---------|
| `src/shared/session_comparison.ts` | Pure function: `(SessionData, SessionData) → ComparisonResult` |

**Storage schema changes:** None. Comparison is computed in memory from `sessionHistory` already loaded by the history panel.

**Data flow:**

```
User selects two sessions in history panel
        ↓
popup.ts: look up sessionHistory[indexA] and sessionHistory[indexB]
          (already in memory from GET_HISTORY response)
        ↓
compareSessions(sessionA, sessionB) → ComparisonResult
        ↓
render delta table in #comparison-result
Apply normalizeMetricValue() to display in user's unit choice
```

**UX design constraint:** The comparison UI must not require a page reload or new storage read. Both sessions are in the `sessionHistory[]` array already fetched at popup open. The comparison is purely in-memory. This keeps the popup responsive.

**Delta sign convention:** Delta = sessionB − sessionA. A positive carry delta means more distance in the newer session. Display positive deltas with a "+" prefix and a green color token; negative with a "−" prefix and a red color token. Use CSS classes (`delta-positive`, `delta-negative`) rather than inline style colors so dark mode overrides apply.

**Build order position:** Build third, after session history (depends on the `sessionHistory[]` being available in popup memory).

---

### Feature 4: Smart Prompt Suggestions

**What it does:** When session data is loaded, automatically detect which built-in prompt is most relevant based on the metrics present. Apply a "Recommended" badge to that prompt's `<option>` in the dropdown. This is visual only — the user's selection is not changed.

**Integration analysis:** Smart matching is a pure function of the current `SessionData`. It needs to inspect which metrics are present in the session (`session.metric_names`) and apply heuristic rules against the built-in prompt catalog (`BUILTIN_PROMPTS` from `prompt_types.ts`). The popup's `renderPromptSelect()` function builds the `<option>` elements — this is where the badge is applied.

**New file required:**

`src/shared/prompt_matcher.ts` — pure, no Chrome API dependencies.

```typescript
export interface MatchResult {
  promptId: string;
  reason: string;   // human-readable rationale (for debug; not displayed in UI)
  confidence: "high" | "medium";
}

export function matchPromptToSession(
  session: SessionData,
  prompts: readonly BuiltInPrompt[]
): MatchResult | null;
```

**Matching heuristic rules (in priority order):**

1. If session has `FaceAngle`, `ClubPath`, `FaceToPath` AND 3+ clubs: → `shot-shape-intermediate` ("Shot Shape & Dispersion") — presence of shape data + multiple clubs screams "compare my shot pattern"
2. If session has `Carry` AND 3+ distinct clubs: → `distance-gapping-beginner` ("Distance Gapping Report") — multiple clubs + carry data = classic gap analysis session
3. If session has `LaunchAngle` AND `SpinRate` AND `SpinAxis`: → `launch-spin-intermediate` ("Launch & Spin Optimization") — launch/spin data explicitly captured
4. If session has `AttackAngle` AND `DynamicLoft` AND `ClubPath`: → `club-delivery-advanced` ("Club Delivery Analysis") — advanced delivery metrics present
5. If session has any metrics (fallback): → `quick-summary-beginner` ("Quick Session Summary") — safe default for any session with data

Return `null` if session is empty (no club_groups or no shots). The popup ignores a null result and renders the prompt dropdown without any badge.

**Files modified:**

| File | Change |
|------|--------|
| `src/popup/popup.ts` | Import `matchPromptToSession` from `shared/prompt_matcher.ts`; call after `cachedData` is set; pass result to `renderPromptSelect()`; in `renderPromptSelect()`, check if a prompt's ID matches the recommended ID and append `" ★ Recommended"` (or equivalent label) to that `<option>`'s `textContent`; clear the badge when cachedData is null |

**Files created:**

| File | Purpose |
|------|---------|
| `src/prompt_matcher.ts` → `src/shared/prompt_matcher.ts` | Pure function: `(SessionData, BuiltInPrompt[]) → MatchResult \| null` |

**Storage schema changes:** None. Match result is computed in memory on every `cachedData` update. Not persisted.

**Data flow:**

```
cachedData set (DOMContentLoaded or DATA_UPDATED)
        ↓
matchPromptToSession(cachedData, BUILTIN_PROMPTS) → MatchResult | null
        ↓
renderPromptSelect(select, recommendedId)
  - for each option: if option.value === recommendedId → append " ★ Recommended" suffix
        ↓
User sees badge on the recommended prompt in dropdown
```

**Key constraint — `<option>` text in optgroup:** Chrome (and all browsers) allow `textContent` modification of `<option>` elements in grouped `<select>` elements. The existing `renderPromptSelect()` sets `opt.textContent = p.name` for each built-in prompt. The badge is appended by checking the recommended ID during the same loop:

```typescript
async function renderPromptSelect(
  select: HTMLSelectElement,
  recommendedId?: string
): Promise<void> {
  // ... existing group/option creation ...
  opt.textContent = p.name;
  if (recommendedId && opt.value === recommendedId) {
    opt.textContent = `${p.name} ★`;  // compact; tooltip explains via title attr
    opt.title = "Recommended for this session";
  }
}
```

The `★` character is universally supported. Avoid emoji (may render inconsistently across OSes). Do not auto-select the recommended prompt — user selection is preserved.

**Key constraint — recommended badge persists across prompt re-renders:** The badge is applied during `renderPromptSelect()`, which is called once on DOMContentLoaded. If `cachedData` updates later (via `DATA_UPDATED`), `renderPromptSelect()` is not called again by the current popup.ts code. Solution: call `renderPromptSelect()` again after a `DATA_UPDATED` event when `matchPromptToSession` returns a different recommended ID than the current one. Or, simpler: expose a `updateRecommendedBadge(select, recommendedId)` function that walks existing options and sets/clears the `★` suffix without rebuilding the DOM. The latter avoids resetting the user's current selection.

**Build order position:** Build fourth (last). Depends only on `cachedData` being populated (already true in v1.5). The `prompt_matcher.ts` module is fully independent. The popup.ts change is minimal.

---

## New Files Created in v1.6

| File | Type | Purpose | Pure? |
|------|------|---------|-------|
| `src/shared/session_stats.ts` | New | `SessionData → SessionStats` stat card values | Yes |
| `src/shared/session_comparison.ts` | New | `(SessionData, SessionData) → ComparisonResult` delta table | Yes |
| `src/shared/prompt_matcher.ts` | New | `(SessionData, BuiltInPrompt[]) → MatchResult \| null` | Yes |

All three new modules are pure functions. They have no `chrome.*` API calls. They can be tested with vitest without any mock setup.

---

## Modified Files in v1.6

| File | Change Type | Features | Notes |
|------|-------------|----------|-------|
| `src/shared/constants.ts` | Modified | Session history | Add `SESSION_HISTORY` key + `MAX_HISTORY` constant |
| `src/background/serviceWorker.ts` | Modified | Session history | Append-to-history in SAVE_DATA; new GET_HISTORY handler; new EXPORT_HISTORY_CSV_REQUEST handler |
| `src/popup/popup.html` | Modified | All four features | Stat card section, history panel, comparison section, prompt badge (CSS only for badge) |
| `src/popup/popup.ts` | Modified | All four features | Stat card render, history list render, comparison trigger, prompt badge application |
| `src/models/types.ts` | Modified | Session history | Add `savedAt` timestamp field to `SessionData` (optional, for display) |

**Unchanged files:**
- `src/content/interceptor.ts` — data capture pipeline is unrelated to any v1.6 feature
- `src/content/bridge.ts` — relay is unrelated to any v1.6 feature
- `src/shared/csv_writer.ts` — export logic unchanged; reused for history export
- `src/shared/tsv_writer.ts` — unchanged
- `src/shared/unit_normalization.ts` — unchanged; stat card and comparison display reuse it
- `src/shared/prompt_builder.ts` — unchanged
- `src/shared/prompt_types.ts` — unchanged; prompt_matcher.ts imports from it
- `src/shared/custom_prompts.ts` — unchanged
- `src/options/options.ts` / `options.html` — unchanged
- `src/shared/html_table_parser.ts` — unchanged

---

## Storage Schema Changes (v1.6 delta)

| Key | Store | Type | Default | Added by | Notes |
|-----|-------|------|---------|----------|-------|
| `sessionHistory` | local | `SessionData[]` | `[]` | serviceWorker | Max 10 entries; oldest trimmed on overflow |

`trackmanData` is retained unchanged — it still holds the most recently captured session. `EXPORT_CSV_REQUEST` continues to use it. Zero regression.

**Estimated storage cost:** One session (50 shots × 28 metrics) ≈ 40–60KB stringified. 10 sessions ≈ 400–600KB. chrome.storage.local quota is 10MB. Safe margin.

---

## Component Boundaries for v1.6

### What stays unchanged

- `interceptor.ts`, `bridge.ts` — capture pipeline unaffected
- `csv_writer.ts`, `tsv_writer.ts` — reused without modification
- `unit_normalization.ts`, `prompt_builder.ts`, `prompt_types.ts`, `custom_prompts.ts` — unchanged; new modules import from these
- `options.ts`, `options.html` — no options page changes in v1.6

### What changes

| Component | Why it changes | Risk |
|-----------|---------------|------|
| `constants.ts` | New storage key + cap constant | LOW — purely additive |
| `serviceWorker.ts` | History append logic + two new message handlers | MEDIUM — modify existing SAVE_DATA handler; must not break current session export |
| `models/types.ts` | Add optional `savedAt?: string` to SessionData | LOW — optional field; zero caller breakage |
| `popup.html` | Four new UI sections + CSS for badges and delta colors | MEDIUM — multiple additions; popup height grows |
| `popup.ts` | Stat card render + history list + comparison trigger + prompt badge | HIGH — most code change in one file; careful function boundaries needed |

---

## Data Flow Summary for v1.6

### Stat card flow

```
DOMContentLoaded → cachedData = SessionData
        ↓
computeSessionStats(cachedData) → { avgCarry, avgClubSpeed, clubShotCounts }
        ↓
Apply normalizeMetricValue() with cachedUnitChoice for display
        ↓
Render #stat-card (updates on DATA_UPDATED)
```

### Session history — save flow

```
Interceptor captures new SessionData
        ↓
SAVE_DATA message → serviceWorker
        ↓
storage.local.get(["trackmanData", "sessionHistory"])
        ↓
Check: sessionHistory.last.report_id === newSession.report_id?
  YES → replace last entry (same report, new page of metrics)
  NO  → append newSession; trim to MAX_HISTORY
        ↓
storage.local.set({ trackmanData: newSession, sessionHistory: updated })
        ↓
DATA_UPDATED emitted (existing behavior)
```

### Session history — browse + export flow

```
popup opens → sends GET_HISTORY
        ↓
serviceWorker returns sessionHistory[]
        ↓
popup renders history list: date, shot count, "Export" button per row
        ↓
User clicks Export on row N
        ↓
EXPORT_HISTORY_CSV_REQUEST { sessionIndex: N }
        ↓
serviceWorker: reads sessionHistory[N], reads unit/surface prefs from storage
        ↓
writeCsv(sessionHistory[N], includeAverages, undefined, unitChoice, surface)
        ↓
chrome.downloads.download()
```

### Session comparison flow

```
User picks two sessions from history panel (A and B)
        ↓
popup.ts: retrieve sessionHistory[indexA], sessionHistory[indexB]
          (from in-memory array — no new storage read)
        ↓
compareSessions(sessionA, sessionB) → ComparisonResult
        ↓
Apply normalizeMetricValue() with cachedUnitChoice
        ↓
Render #comparison-result delta table
  - positive delta → .delta-positive CSS class (green token)
  - negative delta → .delta-negative CSS class (red token)
```

### Smart prompt matching flow

```
cachedData set (DOMContentLoaded or DATA_UPDATED)
        ↓
matchPromptToSession(cachedData, BUILTIN_PROMPTS) → MatchResult | null
        ↓
If match: updateRecommendedBadge(promptSelect, match.promptId)
          — walks existing <option> elements, appends ★ suffix to match
          — clears ★ suffix from all others
If null: clear all ★ suffixes
        ↓
User sees badge on recommended prompt; selection is NOT changed automatically
```

---

## Architectural Patterns for v1.6

### Pattern 1: Pure Module per Feature (session_stats, session_comparison, prompt_matcher)

**What:** Each new computation lives in its own pure TypeScript module under `shared/`. No Chrome API calls. No side effects. Single exported function per module.

**When to use:** Any computation that maps data to data without needing storage or messaging.

**Trade-offs:** Adds three new files. Each file is independently testable with zero mocking. Keeps `popup.ts` from becoming a computation monolith.

**Example:**

```typescript
// src/shared/session_stats.ts
export function computeSessionStats(session: SessionData): SessionStats {
  const totalShots = session.club_groups.reduce(
    (n, g) => n + g.shots.length, 0
  );
  // ... aggregate Carry and ClubSpeed across all shots ...
  return { totalShots, avgCarry, avgClubSpeed, clubShotCounts };
}
```

### Pattern 2: Append-with-Cap for History Storage

**What:** `SAVE_DATA` handler in serviceWorker reads current history array, appends new entry, trims to `MAX_HISTORY`, writes back atomically in a single `storage.local.set` call.

**When to use:** Any time a bounded persistent log is needed with no server-side storage.

**Trade-offs:** The full history array is read and written on every capture. At 10 entries × 60KB each, that is a 600KB read/write per capture — acceptable for this use pattern. Avoids individual session keys (which would require an index key like the custom prompts pattern).

**Example:**

```typescript
// In SAVE_DATA handler
const result = await chrome.storage.local.get([
  STORAGE_KEYS.TRACKMAN_DATA,
  STORAGE_KEYS.SESSION_HISTORY
]);
const history: SessionData[] = result[STORAGE_KEYS.SESSION_HISTORY] ?? [];

// Deduplication: replace last entry if same report_id
const lastEntry = history[history.length - 1];
if (lastEntry && lastEntry.report_id === sessionData.report_id) {
  history[history.length - 1] = sessionData;
} else {
  history.push(sessionData);
  if (history.length > MAX_HISTORY) {
    history.shift(); // remove oldest
  }
}

await chrome.storage.local.set({
  [STORAGE_KEYS.TRACKMAN_DATA]: sessionData,
  [STORAGE_KEYS.SESSION_HISTORY]: history,
});
```

### Pattern 3: In-Memory Data for Comparison (No Extra Storage Reads)

**What:** The comparison computation uses `sessionHistory[]` already fetched by the history panel's `GET_HISTORY` call. No second `chrome.storage.local.get` is needed for the comparison.

**When to use:** When multiple features share the same underlying data. Fetch once, use many times.

**Trade-offs:** Popup must hold up to 10 sessions in JavaScript memory (up to ~600KB). This is negligible for a popup process.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Storing One Session Per Key in History

**What people do:** Use individual storage keys like `session_0`, `session_1`, ... with a `sessionIds[]` index — mirroring the custom prompts pattern.

**Why it's wrong:** Sessions are much larger than custom prompts (~50KB vs ~1KB). The per-key pattern works for small objects where individual updates are common. For session history, the whole array is replaced on every capture anyway — the overhead of managing individual keys is net negative. The single-key append-with-cap pattern is simpler and safer.

**Do this instead:** One `sessionHistory` key holding `SessionData[]`. Bounded at 10 entries. Replace the whole array on write.

### Anti-Pattern 2: Passing sessionHistory Data Through Message Payload

**What people do:** When the user requests export of a history item, pass the full `SessionData` in the `EXPORT_HISTORY_CSV_REQUEST` message to the service worker.

**Why it's wrong:** Chrome's `chrome.runtime.sendMessage` has a serialization overhead and a practical size limit (messages are serialized to JSON and deserialized). A 60KB session object as a message payload is wasteful when the service worker already has access to storage directly.

**Do this instead:** Pass only the `sessionIndex` (integer) in `EXPORT_HISTORY_CSV_REQUEST`. The service worker reads `sessionHistory[sessionIndex]` from storage itself. This is the same pattern used by `EXPORT_CSV_REQUEST` (which reads `trackmanData` from storage rather than receiving it in the message).

### Anti-Pattern 3: Auto-Selecting the Recommended Prompt

**What people do:** When a match is found, change `promptSelect.value` to the recommended prompt ID automatically.

**Why it's wrong:** The user may have deliberately selected a different prompt. Auto-selection overrides user intent without warning, and it resets the selection every time data updates. This is unexpected behavior that damages trust.

**Do this instead:** Visual badge only. The `★` suffix (or "Recommended" label) signals the recommendation without changing the selection. The user retains full control.

### Anti-Pattern 4: Computing Stats/Comparison Inline in popup.ts

**What people do:** Put the averaging/delta logic directly in popup.ts event handlers or render functions.

**Why it's wrong:** popup.ts is already the largest file in the project. Adding complex data computation inline makes it harder to test (popup.ts has Chrome API dependencies that require mocking in tests) and harder to reason about.

**Do this instead:** Pure modules in `shared/`. Each computation is a named export that can be imported and tested with `npx vitest run` without any Chrome API setup.

### Anti-Pattern 5: Reloading sessionHistory from Storage on Every Comparison

**What people do:** On each comparison trigger, send another `GET_HISTORY` message to the service worker and wait for the response.

**Why it's wrong:** Creates unnecessary async latency for a user interaction that should feel instant. The history data is already in memory from the initial `GET_HISTORY` call at popup open.

**Do this instead:** Cache the `sessionHistory[]` array in a popup module-level variable (same pattern as `cachedData`) at DOMContentLoaded. Comparison reads from that cached array synchronously.

---

## Suggested Build Order

```
Step 1 — Visual Stat Card (stat card section in popup)
  NEW: src/shared/session_stats.ts
  MOD: src/popup/popup.html — add #stat-card section
  MOD: src/popup/popup.ts  — import computeSessionStats; render on load + DATA_UPDATED
  → Fully self-contained; validates session_stats.ts before history/comparison
  → Tests: add test_session_stats.ts with sample SessionData fixtures

Step 2 — Session History (storage + service worker + history panel)
  MOD: src/shared/constants.ts    — add SESSION_HISTORY + MAX_HISTORY
  MOD: src/models/types.ts        — add optional savedAt field
  MOD: src/background/serviceWorker.ts — append-to-history in SAVE_DATA;
                                         GET_HISTORY handler;
                                         EXPORT_HISTORY_CSV_REQUEST handler
  MOD: src/popup/popup.html — add #history-panel section
  MOD: src/popup/popup.ts  — GET_HISTORY on load; render list; wire Export buttons
  → Tests: add test_session_history.ts for deduplication + cap logic

Step 3 — Session Comparison (depends on Step 2 history being available in popup)
  NEW: src/shared/session_comparison.ts
  MOD: src/popup/popup.html — add session selection UI + #comparison-result
  MOD: src/popup/popup.ts  — import compareSessions; wire selection → render delta
  → Tests: add test_session_comparison.ts with two fixed sessions

Step 4 — Smart Prompt Suggestions (depends on cachedData; no history dependency)
  NEW: src/shared/prompt_matcher.ts
  MOD: src/popup/popup.ts  — import matchPromptToSession; call after cachedData set;
                              call updateRecommendedBadge() to apply/clear ★ suffix
  → Tests: add test_prompt_matcher.ts with metric presence scenarios

Order rationale:
  Stat card first — new pure module, self-contained, safe starting point
  History second  — largest service worker change; must be stable before comparison
  Comparison third — depends on history being in popup memory
  Prompt matching last — smallest change; drops in cleanly after popup.ts is settled
```

---

## Integration Points

### Popup Module-Level Variables (v1.6 additions)

The popup currently caches `cachedData`, `cachedUnitChoice`, `cachedSurface`, `cachedCustomPrompts`. v1.6 adds:

```typescript
let cachedHistory: SessionData[] = [];   // from GET_HISTORY; updated on capture
let cachedRecommendedPromptId: string | null = null;  // from matchPromptToSession
```

### Message Type Registry (v1.6 additions to serviceWorker.ts)

```typescript
type RequestMessage =
  | SaveDataRequest
  | ExportCsvRequest
  | GetDataRequest
  | GetHistoryRequest          // NEW
  | ExportHistoryCsvRequest;   // NEW
```

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| popup.ts ↔ session_stats.ts | Direct import | Pure function; no async |
| popup.ts ↔ session_comparison.ts | Direct import | Pure function; no async |
| popup.ts ↔ prompt_matcher.ts | Direct import | Pure function; no async |
| popup.ts ↔ serviceWorker.ts | `chrome.runtime.sendMessage` | GET_HISTORY + EXPORT_HISTORY_CSV_REQUEST are new |
| serviceWorker.ts ↔ chrome.storage.local | Async chrome API | sessionHistory key is new |

---

## Sources

- Direct source code inspection: all TypeScript, HTML, and JSON files in `src/` — all function signatures, storage patterns, and message types read (HIGH confidence)
- chrome.storage.local quota: 10MB (raised from 5MB in Chrome 113): https://developer.chrome.com/docs/extensions/reference/api/storage (HIGH confidence)
- `chrome.runtime.sendMessage` practical message size: serialization to JSON; message passing is not suitable for megabyte payloads — use storage index pattern: https://developer.chrome.com/docs/extensions/reference/api/runtime#method-sendMessage (HIGH confidence)
- `mergeSessionData` in `src/models/types.ts` — established deduplication-by-report_id pattern; adapted for history append logic (direct source inspection)
- Prior ARCHITECTURE.md research (v1.5 build, 2026-03-02) — established patterns for storage keys, message handlers, popup cache pattern, anti-patterns (HIGH confidence, same codebase)

---

*Architecture research for: TrackPull v1.6 — Data Intelligence*
*Researched: 2026-03-03*
*Supersedes v1.5 ARCHITECTURE.md for this milestone's scope*
