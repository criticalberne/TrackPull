# Phase 13: Visual Stat Card - Research

**Researched:** 2026-03-05
**Domain:** Chrome extension popup UI (HTML/CSS/TypeScript), unit conversion, session data rendering
**Confidence:** HIGH

## Summary

Phase 13 adds a collapsible per-club stat card to the popup, showing avg carry distance, avg club speed, and shot count for each club in the current session. The implementation is straightforward because all required infrastructure already exists: `cachedData` provides the session data, `normalizeMetricValue()` handles unit conversion, and the popup already has established patterns for show/hide logic, DATA_UPDATED handling, and unit dropdown change listeners.

The single most important technical finding is that **`ClubGroup.averages` is empty for API-intercepted data** (the primary data path). The stat card must compute per-club averages from raw shot data (`ClubGroup.shots[].metrics`), not from `ClubGroup.averages`. The CSV writer already follows this same pattern -- it computes averages from shot metrics, normalizes via `normalizeMetricValue()`, and formats. The stat card should replicate this approach.

**Primary recommendation:** Compute averages from raw shot data using the same pattern as the CSV writer, normalize with `normalizeMetricValue()` + `getApiSourceUnitSystem()`, render in a `<details>/<summary>` section using CSS grid for column alignment.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- Card placement: Collapsible `<details>/<summary>` section after `#shot-count-container`, before `.unit-selectors`
- Always starts collapsed on popup open -- no persistence of open/closed state
- Summary label: "Session Stats"
- Per-club rows (not session-wide averages) -- each club gets its own row
- Compact single-line rows: club name, shot count, avg carry, avg club speed on one line
- Column headers show units: "Carry(yds)" / "Speed(mph)" -- units NOT repeated per row
- Column headers update live when user changes unit preferences
- Values update live on unit preference change (VIS-03)
- Values update on DATA_UPDATED event without popup close/reopen (VIS-02)
- Club order follows SessionData.club_groups order (Trackman report order)
- Show all clubs -- no cap, no "show more" truncation
- No total row at bottom
- Stat card section hidden entirely when no session data exists
- Missing metric values show em-dash (---)
- On clear session data: stat card disappears immediately

### Claude's Discretion
- Exact CSS styling (font sizes, spacing, padding) within the collapsible section
- How to compute per-club averages from ClubGroup.averages vs. raw shot data
- Whether to create a separate stat-card rendering function or inline in popup.ts
- Column alignment approach (CSS grid, flexbox, or table element)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| VIS-01 | Popup displays stat card showing avg carry, avg club speed, shot count by club | Compute averages from `ClubGroup.shots[].metrics["Carry"]` and `ClubGroup.shots[].metrics["ClubSpeed"]`, normalize with `normalizeMetricValue()`, render in `<details>` section |
| VIS-02 | Stat card updates when new data is captured (DATA_UPDATED) | Hook into existing `chrome.runtime.onMessage` listener at popup.ts:181-189; add stat card update call alongside existing `updateShotCount()` and `updateExportButtonVisibility()` |
| VIS-03 | Stat card respects user's unit preferences (yards/meters, mph/m/s) | Use `getMetricUnitLabel("Carry", cachedUnitChoice)` for header labels, `normalizeMetricValue()` for value conversion; re-render on speed/distance dropdown change events at popup.ts:149-161 |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | (project existing) | Popup logic | Already used for all popup code |
| Chrome Extension APIs | MV3 | `chrome.runtime.onMessage`, `chrome.storage.local` | Already in use for DATA_UPDATED and unit preferences |
| Native HTML `<details>` | n/a | Collapsible section | Zero JS needed for expand/collapse; already used for prompt preview |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `unit_normalization.ts` | (existing) | `normalizeMetricValue()`, `getMetricUnitLabel()`, `getApiSourceUnitSystem()` | Converting raw SI values to user-preferred units |
| `constants.ts` | (existing) | `STORAGE_KEYS` | If any new storage keys are needed (unlikely) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CSS Grid for columns | HTML `<table>` | Table is semantically correct for tabular data but harder to style responsively in a narrow popup; CSS grid gives equal control with less markup |
| Computing own averages | Using `ClubGroup.averages` | `ClubGroup.averages` is **empty for API-intercepted data** (primary path); must compute from shots |

## Architecture Patterns

### Recommended Approach

Add a single new function `renderStatCard()` in popup.ts that:
1. Takes `cachedData` and `cachedUnitChoice` as inputs
2. Computes per-club averages from raw shot data
3. Builds or updates the stat card DOM
4. Shows/hides based on data presence

### Integration Points (4 hooks)

```
popup.ts hooks:
  1. DOMContentLoaded (line ~113) -> renderStatCard(cachedData, cachedUnitChoice)
  2. DATA_UPDATED handler (line 181-189) -> renderStatCard(cachedData, cachedUnitChoice)
  3. Speed dropdown change (line 149-152) -> renderStatCard(cachedData, cachedUnitChoice)
  4. Distance dropdown change (line 156-160) -> renderStatCard(cachedData, cachedUnitChoice)
  5. handleClearClick (line 459) -> renderStatCard(null, cachedUnitChoice)
```

### HTML Structure

```html
<!-- Between #shot-count-container and .unit-selectors in popup.html -->
<details id="stat-card" style="display:none;">
  <summary>Session Stats</summary>
  <div id="stat-card-content">
    <!-- Dynamically populated by renderStatCard() -->
  </div>
</details>
```

### Average Computation Pattern

Follow the CSV writer pattern (csv_writer.ts:158-173):

```typescript
// Source: src/shared/csv_writer.ts lines 158-173
function computeClubAverage(
  shots: Shot[],
  metricName: string
): number | null {
  const values = shots
    .map(s => s.metrics[metricName])
    .filter(v => v !== undefined && v !== "")
    .map(v => parseFloat(String(v)));
  const numericValues = values.filter(v => !isNaN(v));

  if (numericValues.length === 0) return null;
  const avg = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
  return Math.round(avg * 10) / 10;
}
```

### Unit Conversion Pattern

```typescript
// Source: src/shared/csv_writer.ts line 105, unit_normalization.ts line 358
import { getApiSourceUnitSystem, normalizeMetricValue } from "../shared/unit_normalization";

const unitSystem = getApiSourceUnitSystem(cachedData.metadata_params);
const rawAvg = computeClubAverage(club.shots, "Carry");
if (rawAvg !== null) {
  const displayValue = normalizeMetricValue(rawAvg, "Carry", unitSystem, cachedUnitChoice);
  // displayValue is now in user's preferred units
}
```

### Column Header Label Pattern

```typescript
// Source: unit_normalization.ts lines 113-124, 228-238
import { DISTANCE_LABELS, SPEED_LABELS } from "../shared/unit_normalization";

// For column headers: "Carry(yds)" or "Carry(m)"
const carryHeader = `Carry(${DISTANCE_LABELS[cachedUnitChoice.distance]})`;
const speedHeader = `Speed(${SPEED_LABELS[cachedUnitChoice.speed]})`;
```

### Anti-Patterns to Avoid
- **Using `ClubGroup.averages` directly:** These are empty for API-intercepted data (the primary path). Always compute from raw shot data.
- **Hardcoding unit labels:** Use `DISTANCE_LABELS` and `SPEED_LABELS` constants so they stay in sync with the rest of the codebase.
- **Creating a separate file for the stat card:** The logic is simple enough (~50-80 lines) to live in popup.ts. A separate module adds import complexity without proportional benefit.
- **Persisting open/closed state of `<details>`:** User decision explicitly says no persistence.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Unit conversion | Custom carry/speed math | `normalizeMetricValue()` from `unit_normalization.ts` | Handles m/s-to-mph, meters-to-yards, and rounding consistently |
| Unit labels | Hardcoded "yds"/"mph" strings | `DISTANCE_LABELS[choice.distance]` / `SPEED_LABELS[choice.speed]` | Single source of truth, already used in CSV/TSV writers |
| Source unit system | Guessing raw data units | `getApiSourceUnitSystem(metadata_params)` | API always returns m/s + meters; this function encodes that knowledge |
| Show/hide logic | Custom visibility toggling | Follow `updateExportButtonVisibility()` pattern (popup.ts:366-377) | Consistent with existing codebase conventions |

**Key insight:** The unit normalization pipeline is the most complex part of this feature, and it's already fully implemented. The stat card is essentially a thin rendering layer on top of existing conversion infrastructure.

## Common Pitfalls

### Pitfall 1: Using ClubGroup.averages Instead of Computing from Shots
**What goes wrong:** Stat card shows no values for API-intercepted sessions (the majority case)
**Why it happens:** `ClubGroup.averages` is populated only by the HTML scraper path; the API interceptor sets it to `{}`
**How to avoid:** Always compute averages from `club.shots[].metrics`, following the csv_writer.ts pattern
**Warning signs:** Stat card works on HTML-scraped sessions but shows all em-dashes on API sessions

### Pitfall 2: Forgetting metadata_params in Unit Conversion
**What goes wrong:** Values display in wrong units or crash with undefined
**Why it happens:** `getApiSourceUnitSystem()` requires `session.metadata_params` which might not exist on malformed data
**How to avoid:** Guard with `cachedData?.metadata_params` before calling; fall back to default unit system if missing
**Warning signs:** NaN values or console errors on edge-case sessions

### Pitfall 3: Not Re-rendering on Unit Change
**What goes wrong:** User changes speed from mph to m/s, but stat card still shows mph values
**Why it happens:** Only hooking into DATA_UPDATED but forgetting the speed/distance dropdown change listeners
**How to avoid:** Hook stat card re-render into all 4 triggers: DOMContentLoaded, DATA_UPDATED, speed change, distance change
**Warning signs:** Stat card values freeze after unit change until popup is reopened

### Pitfall 4: Stat Card Visible with No Data
**What goes wrong:** Empty stat card section appears when no session data is captured
**Why it happens:** `<details>` element has default `display:block`; need explicit `display:none` when no data
**How to avoid:** Set `display:none` by default in HTML; `renderStatCard()` shows it only when `cachedData` has `club_groups`
**Warning signs:** Empty "Session Stats" collapsible appears on fresh extension install

### Pitfall 5: Not Hiding on Clear
**What goes wrong:** After clearing session data, the stat card remains visible with stale values
**Why it happens:** `handleClearClick()` sets `cachedData = null` but doesn't trigger stat card update
**How to avoid:** Call `renderStatCard(null, cachedUnitChoice)` in `handleClearClick()` after setting `cachedData = null`
**Warning signs:** Stale stat card visible after clicking "Clear Session Data"

## Code Examples

### Computing and Displaying Per-Club Stats

```typescript
// Source: Pattern derived from csv_writer.ts:158-173 + unit_normalization.ts:358
function renderStatCard(): void {
  const container = document.getElementById("stat-card") as HTMLDetailsElement | null;
  if (!container) return;

  const hasData = cachedData?.club_groups && cachedData.club_groups.length > 0;
  container.style.display = hasData ? "" : "none";
  if (!hasData) return;

  const unitSystem = getApiSourceUnitSystem(cachedData!.metadata_params);
  const contentEl = document.getElementById("stat-card-content")!;

  // Update column headers with current units
  // ... build header row with DISTANCE_LABELS / SPEED_LABELS ...

  // Build club rows
  for (const club of cachedData!.club_groups) {
    const shotCount = club.shots.length;
    const rawCarry = computeClubAverage(club.shots, "Carry");
    const rawSpeed = computeClubAverage(club.shots, "ClubSpeed");

    const carry = rawCarry !== null
      ? String(normalizeMetricValue(rawCarry, "Carry", unitSystem, cachedUnitChoice))
      : "\u2014"; // em-dash
    const speed = rawSpeed !== null
      ? String(normalizeMetricValue(rawSpeed, "ClubSpeed", unitSystem, cachedUnitChoice))
      : "\u2014"; // em-dash

    // ... render row: club.club_name, shotCount, carry, speed ...
  }
}
```

### Hooking into Existing Event Listeners

```typescript
// In DOMContentLoaded handler, after cachedData is set (~line 113):
renderStatCard();

// In DATA_UPDATED handler (line 181-189), add:
renderStatCard();

// In speed dropdown change listener (line 149-152), add:
renderStatCard();

// In distance dropdown change listener (line 156-160), add:
renderStatCard();

// In handleClearClick (after cachedData = null, ~line 459), add:
renderStatCard();
```

### CSS Grid Layout for Tabular Alignment

```css
/* Stat card rows use CSS grid for column alignment */
.stat-card-row {
  display: grid;
  grid-template-columns: 1fr auto auto auto;
  gap: 8px;
  padding: 4px 0;
  font-size: 13px;
  align-items: baseline;
}

.stat-card-header {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-muted);
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 4px;
  margin-bottom: 2px;
}

.stat-card-value {
  text-align: right;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-body);
}

.stat-card-club {
  color: var(--color-text-primary);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Read averages from `ClubGroup.averages` | Compute from raw shot metrics | Since API interceptor was added | Must always compute; `averages` field is unreliable |
| Single unit preference | Independent speed + distance dropdowns | v1.4 | Stat card header labels must track both independently |

**Deprecated/outdated:**
- Legacy `unitPreference` string ("imperial"/"metric"/"hybrid"): Already migrated in popup.ts:123-132. Stat card should only use `cachedUnitChoice: UnitChoice`.

## Open Questions

1. **Should `renderStatCard()` be extracted to a separate module?**
   - What we know: The function will be ~50-80 lines. popup.ts is currently ~470 lines.
   - What's unclear: Whether future phases (14-15) will need to reuse the average computation.
   - Recommendation: Keep inline in popup.ts for now. If Phase 14/15 needs the same computation, extract then. The average computation helper (~10 lines) could easily be moved later.

2. **Should the stat card use the same `font-variant-numeric: tabular-nums` as numeric data elsewhere?**
   - What we know: The popup doesn't currently use tabular figures anywhere.
   - What's unclear: Whether the monospaced number alignment matters for a compact tabular layout.
   - Recommendation: Use `tabular-nums` -- it prevents column width jitter when values change (e.g., 99.1 vs 100.2).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest (project-configured) |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| VIS-01 | Stat card renders avg carry, avg speed, shot count per club | unit | `npx vitest run tests/test_stat_card.ts -t "renders per-club stats"` | No -- Wave 0 |
| VIS-01 | Average computation from raw shot metrics | unit | `npx vitest run tests/test_stat_card.ts -t "computes averages"` | No -- Wave 0 |
| VIS-01 | Missing metrics show em-dash | unit | `npx vitest run tests/test_stat_card.ts -t "missing metrics"` | No -- Wave 0 |
| VIS-02 | Stat card updates on DATA_UPDATED | unit | `npx vitest run tests/test_stat_card.ts -t "updates on data"` | No -- Wave 0 |
| VIS-03 | Values convert correctly for yards/meters | unit | `npx vitest run tests/test_stat_card.ts -t "unit conversion"` | No -- Wave 0 |
| VIS-03 | Column headers reflect current unit choice | unit | `npx vitest run tests/test_stat_card.ts -t "header labels"` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before verification

### Wave 0 Gaps
- [ ] `tests/test_stat_card.ts` -- covers VIS-01, VIS-02, VIS-03
- [ ] Average computation helper should be testable in isolation (pure function, no DOM dependency)

Note: DOM-dependent tests (rendering, show/hide) may require jsdom or be tested via build + manual load. The average computation and unit conversion logic can be tested as pure functions.

## Sources

### Primary (HIGH confidence)
- `src/popup/popup.ts` -- current popup logic, all integration points verified by reading source
- `src/popup/popup.html` -- current popup HTML structure, CSS tokens, `<details>` pattern confirmed
- `src/shared/unit_normalization.ts` -- all conversion functions, label constants, `normalizeMetricValue()` signature
- `src/shared/csv_writer.ts` -- average computation pattern from raw shots (lines 158-173)
- `src/models/types.ts` -- `ClubGroup` interface: `averages: Record<string, MetricValue>`
- `src/content/interceptor.ts` -- confirms `averages: {}` for API path (line 162)
- `src/shared/constants.ts` -- `STORAGE_KEYS`, no new keys needed

### Secondary (MEDIUM confidence)
- None needed -- all findings are from direct source code inspection

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already exist in the project; no new dependencies
- Architecture: HIGH -- patterns directly copied from existing popup.ts and csv_writer.ts code
- Pitfalls: HIGH -- each pitfall identified from reading actual source code and understanding data flow

**Research date:** 2026-03-05
**Valid until:** Indefinite (stable internal codebase patterns; no external dependencies)
