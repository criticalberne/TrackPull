# Phase 13: Visual Stat Card - Context

**Gathered:** 2026-03-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Display a per-club stat summary (avg carry, avg club speed, shot count) in the popup for the current session. The stat card is read-only — no editing, no session history browsing, no cross-session comparison. Those belong to Phases 14-15.

</domain>

<decisions>
## Implementation Decisions

### Card placement
- Collapsible `<details>/<summary>` section (matches existing prompt preview pattern)
- Positioned after the shot count container, before unit selectors
- Always starts collapsed on popup open — no persistence of open/closed state
- Summary label: "Session Stats"

### Metric layout
- Per-club rows, not session-wide averages — each club gets its own row
- Compact single-line rows: club name, shot count, avg carry, avg club speed on one line
- Column headers show units: "Carry(yds)" / "Speed(mph)" — units NOT repeated per row
- Column headers update live when user changes unit preferences (speed/distance dropdowns)
- Values update live on unit preference change (VIS-03)
- Values update on DATA_UPDATED event without popup close/reopen (VIS-02)

### Club breakdown
- Club order follows SessionData.club_groups order (Trackman report order, typically longest to shortest)
- Show all clubs — no cap, no "show more" truncation
- No total row at bottom (shot count box above already shows total)

### Empty & edge states
- Stat card section hidden entirely when no session data exists (consistent with export buttons and AI section)
- Missing metric values (club has Carry but no ClubSpeed, or vice versa) show em-dash (—)
- On clear session data: stat card disappears immediately (no animation, consistent with existing clear behavior)

### Claude's Discretion
- Exact CSS styling (font sizes, spacing, padding) within the collapsible section
- How to compute per-club averages from ClubGroup.averages vs. raw shot data
- Whether to create a separate stat-card rendering function or inline in popup.ts
- Column alignment approach (CSS grid, flexbox, or table element)

</decisions>

<specifics>
## Specific Ideas

- Layout inspired by the preview mockup: `7i  12  164.2  87.1` — tight, tabular, no decoration
- Column headers with unit in parentheses: `Carry(yds)  Speed(mph)` — changes with user preference
- Uses native `<details>/<summary>` element — zero JS for expand/collapse, browser handles it

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `cachedData: SessionData` (popup.ts:17) — already pre-fetched at DOMContentLoaded, contains club_groups with averages
- `cachedUnitChoice: UnitChoice` (popup.ts:18) — already cached and updated on dropdown change
- `normalizeMetricValue()` (unit_normalization.ts:358) — converts raw values to user's unit choice
- `getMetricUnitLabel()` (unit_normalization.ts:228) — returns unit suffix string for any metric
- `DISTANCE_LABELS` / `SPEED_LABELS` (unit_normalization.ts:121-124) — "yds"/"m", "mph"/"m/s"
- `convertDistance()`, `convertSpeed()` (unit_normalization.ts) — individual conversion functions
- CSS custom property tokens (popup.html:9-58) — dark mode handled automatically via `var(--color-*)`

### Established Patterns
- `<details>/<summary>` for collapsible content — prompt preview (popup.html:504-507) is the precedent
- `updateExportButtonVisibility()` pattern (popup.ts:366-377) — show/hide sections based on data presence
- DATA_UPDATED listener (popup.ts:181-189) — already calls multiple update functions; stat card update hooks in here
- Unit dropdown change listeners (popup.ts:149-161) — stat card re-render hooks into these same listeners

### Integration Points
- popup.html: new `<details>` section between `#shot-count-container` and `.unit-selectors`
- popup.ts DATA_UPDATED handler: add stat card update call
- popup.ts unit change listeners: add stat card re-render call
- popup.ts `handleClearClick()`: add stat card hide call (or rely on updateExportButtonVisibility pattern)
- ClubGroup.averages["Carry"] and ClubGroup.averages["ClubSpeed"] — source data for the card

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 13-visual-stat-card*
*Context gathered: 2026-03-05*
