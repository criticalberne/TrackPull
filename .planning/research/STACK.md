# Stack Research

**Domain:** Chrome Extension v1.6 — Session History, Cross-Session Comparison, Visual Stat Cards, Smart Prompt Matching
**Researched:** 2026-03-03
**Confidence:** HIGH for storage strategy (verified against official Chrome docs); HIGH for keyword matching (native TypeScript, no library needed); HIGH for UI approach (popup size constraints confirmed); HIGH for zero-dependency constraint (no new production deps required)

---

## Context: What This File Covers

TrackPull has a validated, zero-production-dependency stack: TypeScript, esbuild, Chrome MV3 APIs. The existing STACK.md documents v1.5 decisions (dark mode, Gemini, prompt preview, export toggle) — those stand and are not re-researched.

This document covers ONLY what is new for v1.6:

1. **Session history storage** — where and how to persist past sessions; how many can fit; re-export capability
2. **Session comparison** — delta computation approach; no library needed
3. **Visual stat cards in popup** — CSS-only implementation within 800x600 popup constraints
4. **Smart prompt matching** — keyword detection against session data; native vs library

Do not alter anything about the interceptor, CSV generation, unit conversion, AI tab launch mechanism, build system, or dark mode implementation.

---

## Recommended Stack

### Core Technologies (New for v1.6)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `chrome.storage.local` (new keys) | Built-in MV3 | Session history index + full session data | Already in use. 10 MB quota (verified) is generous: ~26 KB per full session = ~392 sessions fit. Full session storage enables re-export from history, which is a stated requirement. No new permission needed. |
| CSS Grid / Flexbox in popup | Browser built-in | Visual stat card layout | Popup is constrained to 800×600 px max (hard Chrome limit). CSS-only stat cards using `display:grid` or `display:flex` with existing CSS token variables are the correct approach. No charting library. |
| Native TypeScript keyword matching | TypeScript built-in | Smart prompt suggestions | The matching problem is: given ~29 known Trackman metrics present in a session, which built-in prompts are relevant? This is solved with a lookup table of metric-to-prompt associations — a `Map<string, string[]>` or typed `Record`. No fuzzy search library needed. Fuse.js and equivalents are for user-typed queries against large datasets; this use case is deterministic metric presence checks. |

---

## Feature-by-Feature Technical Breakdown

### 1. Session History Storage

**Requirement:** Persist sessions in `chrome.storage`, browse and re-export from popup.

**Verified storage quotas (official Chrome docs):**
- `chrome.storage.local` — 10,485,760 bytes (10 MB), persists across browser restarts
- `chrome.storage.session` — 10,485,760 bytes (10 MB), in-memory only, cleared on browser restart
- `chrome.storage.sync` — 102,400 bytes total (~100 KB) — **not suitable for session data**

**Use `chrome.storage.local` for session history.** Sessions must survive browser restarts (users open Chrome, open the popup, browse history). `storage.session` is cleared on restart — wrong fit. `storage.sync` quota is far too small.

**Storage sizing (measured):**

| Approach | Per Session | 10 Sessions | Notes |
|----------|------------|-------------|-------|
| Full `SessionData` (re-export capable) | ~26 KB | ~261 KB | 8 clubs × 8 shots × ~9 metrics with `{value, unit}` objects |
| Summary-only (averages + metadata) | ~1.5 KB | ~15 KB | No re-export; comparison only |

**Recommendation: Store full `SessionData` objects for re-export capability.** At ~26 KB per session, the 10 MB quota supports ~392 sessions — far more than any golfer will accumulate. No compression needed. No `unlimitedStorage` permission needed.

**Storage key pattern (per-key, not single array):**

```typescript
// Index key — stores array of session IDs in reverse chronological order
const SESSION_HISTORY_IDS_KEY = "sessionHistoryIds";

// Per-session key — stores full SessionData for each session
const SESSION_KEY_PREFIX = "session_";
// Example: "session_20260303_abc123def"
```

**Why per-key instead of a single `sessionHistory` array?**
- Matches the existing `customPrompt_` per-key pattern already in the codebase (proven pattern)
- Avoids deserializing all sessions when loading only the index
- Prevents a single 8 KB item limit concern (not a `storage.local` constraint, but consistent with existing design)
- Enables O(1) session deletion without rewriting the whole array

**New `STORAGE_KEYS` entries needed:**

```typescript
SESSION_HISTORY_IDS: "sessionHistoryIds",
// Per-session keys use SESSION_KEY_PREFIX + id (not in STORAGE_KEYS enum, same as CUSTOM_PROMPT_KEY_PREFIX)
```

**Session ID strategy:** `"session_" + date + "_" + report_id.slice(0, 8)` — human-readable, collision-resistant for the same user, no UUID library needed.

**Session limit policy:** Cap history at 20 sessions (configurable constant). On each new save, if count exceeds 20, remove the oldest session key. This prevents unbounded growth without quota math at runtime.

```typescript
const MAX_SESSION_HISTORY = 20;
```

20 sessions × ~26 KB = ~520 KB — well within 10 MB.

**No new manifest permissions required.** `storage` permission already declared.

**Confidence:** HIGH — quota verified against official Chrome storage API reference.

---

### 2. Cross-Session Comparison (Delta Columns)

**Requirement:** Delta columns comparing club averages across sessions.

**Approach: Pure TypeScript arithmetic — no library needed.**

Delta computation is subtraction of two numbers with null handling:

```typescript
function computeDelta(
  current: number | undefined,
  previous: number | undefined
): number | null {
  if (current === undefined || previous === undefined) return null;
  return current - previous;
}
```

**Comparison data shape:**

```typescript
interface ClubDelta {
  club_name: string;
  metrics: Record<string, {
    current: number;
    previous: number;
    delta: number;
    direction: "up" | "down" | "flat";
  }>;
}
```

**"Direction" threshold:** treat `|delta| < 0.5` as "flat" for display purposes (avoids showing +0.1 as meaningful movement). This threshold is a constant, not a user setting.

**Where the comparison runs:** In `popup.ts` (or a new `session_comparison.ts` module), after loading the current session and the selected comparison session from `chrome.storage.local`. The computation is synchronous and O(clubs × metrics).

**No library, no new files required unless extraction improves testability.** Recommend a `session_stats.ts` module in `src/shared/` to keep pure functions testable via vitest.

**Confidence:** HIGH — this is arithmetic, no external dependency needed.

---

### 3. Visual Stat Cards in Popup

**Requirement:** Stat card showing avg carry, avg club speed, shot count by club.

**Hard constraint: Chrome popup max size is 800×600 px (hard limit in Chromium source).** Content beyond this triggers scrollbars. The current popup already uses ~500 px of vertical space with all sections visible. Stat cards must either replace the shot count display or add minimal height.

**Approach: CSS Grid stat card with existing CSS token variables.**

The existing popup already has:
- CSS custom property tokens (`--color-bg-surface`, `--color-accent`, etc.)
- `display:flex` layout patterns
- `border-radius: 8px` card pattern (`.shot-count-container`)

A stat card is a 2–3 column grid of metric labels + values. No charting, no canvas, no SVG — just styled `<div>` elements.

```html
<!-- Replace or augment #shot-count-container -->
<div id="stat-cards" class="stat-grid">
  <div class="stat-card">
    <span class="stat-label">Shots</span>
    <span class="stat-value" id="stat-shots">—</span>
  </div>
  <div class="stat-card">
    <span class="stat-label">Avg Carry</span>
    <span class="stat-value" id="stat-carry">—</span>
  </div>
  <div class="stat-card">
    <span class="stat-label">Avg Club Speed</span>
    <span class="stat-value" id="stat-speed">—</span>
  </div>
</div>
```

```css
.stat-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin: 12px 0;
}

.stat-card {
  background: var(--color-bg-surface);
  border-radius: 6px;
  padding: 10px 8px;
  text-align: center;
}

.stat-label {
  display: block;
  font-size: 10px;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.stat-value {
  display: block;
  font-size: 20px;
  font-weight: bold;
  color: var(--color-accent);
}
```

**Dark mode:** Automatically correct — uses existing `--color-bg-surface` and `--color-accent` tokens that already have dark mode values in the `@media (prefers-color-scheme: dark)` block.

**Stat computation:** Runs in `popup.ts` after data load, calling a `computeSessionStats()` function:

```typescript
interface SessionStats {
  totalShots: number;
  avgCarry: number | null;       // null if Carry metric not present
  avgClubSpeed: number | null;   // null if ClubSpeed metric not present
  clubBreakdown: Array<{ club_name: string; shot_count: number }>;
}
```

**Where the logic lives:** New `computeSessionStats()` function in `src/shared/session_stats.ts` (pure function, testable). Called from `popup.ts` after data is loaded.

**No new dependencies, no canvas, no chart library.**

**Confidence:** HIGH — CSS pattern, existing token system, popup size constraint confirmed.

---

### 4. Smart Prompt Suggestions

**Requirement:** Highlighted label on data-matched prompts in the dropdown.

**What "smart" means here:** Given the set of metric names present in the current session (`SessionData.metric_names`), identify which built-in prompts are relevant to those metrics and display a visual indicator (e.g., a "Recommended" badge or "★" prefix on the option text).

**Approach: Deterministic keyword lookup table — no fuzzy search library.**

Fuzzy search libraries (Fuse.js, fast-fuzzy, microfuzz) solve a different problem: matching user-typed text against a corpus. This use case is: "does session contain metric X?" — a `Set.has()` check, not a string distance problem.

```typescript
// In prompt_types.ts or a new session_stats.ts
const PROMPT_METRIC_AFFINITY: Record<string, string[]> = {
  "consistency-analysis-advanced": ["ClubSpeed", "BallSpeed", "SpinRate", "FaceAngle"],
  "launch-spin-intermediate": ["LaunchAngle", "SpinRate", "SpinAxis", "DynamicLoft"],
  "shot-shape-intermediate": ["FaceAngle", "ClubPath", "FaceToPath", "Curve", "Side"],
  "club-delivery-advanced": ["AttackAngle", "ClubPath", "DynamicLoft", "FaceAngle"],
  "distance-gapping-beginner": ["Carry", "Total"],
  "session-overview-beginner": [],        // Always applicable
  "quick-summary-beginner": [],           // Always applicable
  "club-breakdown-intermediate": ["Carry", "BallSpeed"],
};

function getRecommendedPromptIds(metricNames: string[]): Set<string> {
  const available = new Set(metricNames);
  const recommended = new Set<string>();

  for (const [promptId, requiredMetrics] of Object.entries(PROMPT_METRIC_AFFINITY)) {
    if (requiredMetrics.length === 0) {
      recommended.add(promptId); // Always-applicable prompts
      continue;
    }
    // Recommend if session has at least one of the relevant metrics
    if (requiredMetrics.some(m => available.has(m))) {
      recommended.add(promptId);
    }
  }
  return recommended;
}
```

**UI rendering:** In `renderPromptSelect()` in `popup.ts`, after computing the recommended set, prefix matching option text with a star or append `(Recommended)`:

```typescript
opt.textContent = isRecommended ? `★ ${p.name}` : p.name;
```

This avoids any DOM badge complexity that could break the `<select>` element's option styling — `<option>` elements have very limited styling support across OSes (no CSS background-color on macOS). Text-prefix is the safe cross-platform approach.

**No library, no new file required.** The affinity map and `getRecommendedPromptIds()` function belong in `src/shared/session_stats.ts` alongside the stat computation functions, or directly in `prompt_types.ts` since it's prompt metadata.

**Confidence:** HIGH — native TypeScript, no external dependency, `<option>` styling limitation confirmed by browser behavior.

---

## Supporting Libraries (Still Zero Production Dependencies)

No new production dependencies are required for any v1.6 feature:

| Feature | Why No Library Needed |
|---------|----------------------|
| Session history storage | `chrome.storage.local` per-key pattern (same as custom prompts) |
| Session comparison | Arithmetic on two `Record<string, MetricValue>` objects |
| Visual stat cards | CSS Grid + existing token variables |
| Smart prompt matching | `Set.has()` lookup against a typed affinity map |
| Fuzzy matching | Not applicable — prompts are matched by metric presence, not text similarity |

**Zero-dependency constraint maintained.**

---

## New Files to Create

| File | Purpose |
|------|---------|
| `src/shared/session_stats.ts` | Pure functions: `computeSessionStats()`, `getRecommendedPromptIds()`, `computeSessionDelta()` |
| `src/shared/session_history.ts` | Storage CRUD: `saveSessionToHistory()`, `loadSessionHistory()`, `deleteSessionFromHistory()`, `loadSessionById()` |

These follow the existing `custom_prompts.ts` pattern — pure async Chrome storage helpers with no side effects.

---

## New `STORAGE_KEYS` Entries

```typescript
// In src/shared/constants.ts, add to STORAGE_KEYS:
SESSION_HISTORY_IDS: "sessionHistoryIds",
```

```typescript
// Add alongside CUSTOM_PROMPT_KEY_PREFIX:
export const SESSION_KEY_PREFIX = "session_" as const;
export const MAX_SESSION_HISTORY = 20 as const;
```

---

## Manifest Changes

**None.** `storage` permission is already declared. No new permissions, no new content scripts, no new background handlers needed for any v1.6 feature.

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Session storage location | `chrome.storage.local` per-key | Single `sessionHistory` array key | Array approach deserializes all data on every read. Per-key matches existing custom prompt pattern. More importantly: avoids ever hitting the `QUOTA_BYTES_PER_ITEM` limit on sync (8 KB), though local doesn't have this limit. Consistency with codebase wins. |
| Session storage location | `chrome.storage.local` | `chrome.storage.session` | Session storage is cleared on browser restart. Users expect history to persist across sessions. Wrong fit. |
| Session storage location | `chrome.storage.local` | `chrome.storage.sync` | Sync quota is 102 KB total — one full session exceeds that. Wrong fit. |
| Session storage format | Full `SessionData` object | Summary-only (averages + metadata) | Summary-only (~1.5 KB) saves storage but breaks the "re-export from history" requirement. Full sessions (~26 KB) are needed for re-export. At ~26 KB each, 10 MB fits ~392 sessions — compression adds complexity with no practical benefit. |
| Smart prompt matching | Typed affinity map + `Set.has()` | Fuse.js or fast-fuzzy | Fuzzy libraries solve user-input text matching. Metric presence checks are deterministic — `Set.has()` is O(1) and has no false positives. Fuzzy matching would introduce false positives (e.g., "Carry" fuzzy-matching against "accuracy" topics). |
| Stat card visualization | CSS Grid + `<div>` | Chart.js, D3, or Recharts | Popup space is extremely limited (800×600 px hard limit). A charting library adds bundle size, layout complexity, and renders worse than clean typography at small sizes. Golfers need numbers, not sparklines. |
| Session comparison UI | Popup inline | Separate options page tab | Options page requires navigating away from popup, breaking the inline browse-and-compare flow. Popup inline comparison is the stated requirement. |
| History browse UI | Scrollable `<select>` or `<ul>` | Full list view | Popup is height-constrained. A compact dropdown or short scrollable list (max 5 items visible) fits within 600 px without pushing other controls off-screen. |

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Fuse.js or any fuzzy search library | Solves the wrong problem. Metric presence is a `Set.has()` check, not a string distance problem. Adds ~24 KB bundle weight for zero benefit. | Typed affinity `Record<string, string[]>` + `Set.has()` |
| Chart.js, D3, Recharts | Popup is 800×600 px max. Charts require canvas or SVG, add significant bundle weight, and render poorly in small popup containers. Numbers in styled `<div>` elements are more readable at popup scale. | CSS Grid stat cards |
| `unlimitedStorage` permission | Not needed. At ~26 KB per session × 20 sessions = ~520 KB, well within 10 MB `storage.local` default quota. Requesting `unlimitedStorage` is unnecessary and signals to reviewers that the extension may misuse storage. | Cap history at `MAX_SESSION_HISTORY = 20` |
| `chrome.storage.sync` for session data | 102 KB total quota — one full session may exceed it. Sync is for user preferences (cross-device settings), not bulk data. | `chrome.storage.local` |
| `chrome.storage.session` for session data | Cleared on browser restart — defeats the purpose of persistent history. | `chrome.storage.local` |
| UUID library for session IDs | Overkill. `date + report_id.slice(0, 8)` creates collision-resistant IDs for a single user. No library needed. | Native string concatenation |
| External CSS framework (Tailwind, Bootstrap) | Zero-dependency constraint. Existing token-based CSS system already handles dark mode and theming. | Existing `--color-*` CSS custom properties |
| `<option>` element CSS styling for "Recommended" badge | `<option>` elements have extremely limited CSS support on macOS (background-color ignored, custom fonts ignored). Platform-inconsistent results. | Text prefix: `★ prompt name` in `option.textContent` |

---

## Version Compatibility

| API/Feature | Availability | Notes |
|-------------|-------------|-------|
| `chrome.storage.local` (10 MB quota) | Chrome 114+ | 5 MB in Chrome 113 and earlier. All current Chrome versions support 10 MB. MV3 was introduced in Chrome 88; 10 MB quota applies to all current MV3 installations. |
| `chrome.storage.local.getBytesInUse()` | All MV3 versions | Optional utility for quota diagnostics. Not required for v1.6 but useful for development. |
| CSS `display:grid` | Chrome 57+ | Well within MV3 support window. |
| `Set.has()` | ES2015+ / Chrome 49+ | No compatibility concern. |
| `chrome.storage.session` | Chrome 102+ | Available but not appropriate for this use case (in-memory, cleared on restart). |

---

## Sources

- Chrome Storage API Reference (quota limits, storage areas) — https://developer.chrome.com/docs/extensions/reference/api/storage (HIGH confidence, official; verified 10 MB `storage.local` quota, 102 KB `storage.sync` quota, `storage.session` in-memory behavior)
- Chrome Extension popup size constraints — Chromium issue tracker confirming 800×600 hard limit: https://issues.chromium.org/issues/40655432 (MEDIUM confidence; community + Chromium issue; consistent with `kMaxSize = {800, 600}` referenced in Chromium source)
- Fuse.js library overview — https://www.fusejs.io/ (HIGH confidence; confirmed it solves user-typed text fuzzy search, not deterministic metric presence matching)
- Existing codebase analysis — `src/shared/custom_prompts.ts`, `src/shared/constants.ts`, `src/models/types.ts`, `src/popup/popup.ts` (HIGH confidence; confirmed per-key storage pattern, `SessionData` type structure, existing `STORAGE_KEYS`, popup UI patterns)
- Storage sizing measurement — `node` JSON serialization test (HIGH confidence; measured ~26 KB per typical `SessionData` with 8 clubs × 8 shots × 9 metrics; ~1.5 KB for summary-only approach)
- DEV Community: Local vs Sync vs Session comparison — https://dev.to/notearthian/local-vs-sync-vs-session-which-chrome-extension-storage-should-you-use-5ec8 (MEDIUM confidence; consistent with official docs)

---

*Stack research for: TrackPull v1.6 — Data Intelligence (Session History, Comparison, Stat Cards, Smart Prompts)*
*Researched: 2026-03-03*
