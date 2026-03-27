# Phase 25: Activity Browser UI - Research

**Researched:** 2026-03-26
**Domain:** Chrome Extension Popup UI — vanilla TypeScript, inline CSS, message-passing IPC
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Panel Integration**
- D-01: Inline replacement — the current `portal-ready` div with a single "Import from Portal" button is replaced by the activity browser. When portal auth is ready, the list loads automatically (per Phase 24 D-05: always re-fetch on open).
- D-02: Auth/error states (denied, not-logged-in, error) replace the entire portal section content — same as current behavior. No activity list shown until portal is ready.
- D-03: Scrollable container with fixed max-height (~300px) and overflow scroll. Keeps the popup compact so export/AI sections remain accessible below.

**Activity List Layout**
- D-04: Compact single-line rows — date, stroke count, and activity type on one line with an Import button right-aligned. Matches the dense stat-card-row pattern.
- D-05: Short month + day date format ("Mar 26"). Add year only for activities older than the current year.
- D-06: Show "Imported" label (muted text/badge) instead of the Import button for activities already in history. Prevents accidental re-imports and signals completion.

**Time-Period Grouping**
- D-07: Flat section headers — small, muted text labels (Today / This Week / This Month / Older) between activity rows. Not collapsible, always visible.
- D-08: Hide empty time periods entirely. If no activities in "Today", skip that header.

**Filter UI**
- D-09: Dropdown selector above the activity list — "All Types" default, consistent with existing unit-selector and AI-service-select dropdown patterns in the popup.
- D-10: Filter options dynamically populated from fetched activities — "All Types" plus only the types present in the data.
- D-11: Client-side filtering — fetch all activities once, filter in JS. Instant filtering with no extra network calls.

**Loading & State Display**
- D-12: The browser panel displays idle, loading, loaded, importing, and error states. Import feedback continues to use `showToast`.

### Claude's Discretion
- CSS styling details for activity rows, section headers, and scrollable container
- How to detect which activities are already in history (comparison logic)
- GraphQL query field expansion to include stroke count and activity type (current FETCH_ACTIVITIES_QUERY only has id and date)
- Loading spinner/skeleton design during fetch
- How to wire the filter dropdown change handler

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BROWSE-01 | User can view a list of their Trackman activities showing date, stroke count, and activity type | GraphQL query expansion (add `strokeCount`/`type` fields to `FETCH_ACTIVITIES_QUERY`); `ActivitySummary` interface must gain both fields; HTML row template pattern derived from `stat-card-row` |
| BROWSE-03 | Activities are grouped by time period (Today / This Week / This Month / Older) | Date comparison logic using `new Date()` vs activity ISO date string; group headers styled with `--color-text-muted`; empty-group suppression via conditional rendering |
| BROWSE-04 | User can filter activities by type (Session, Shot Analysis, Course Play, etc.) | Dropdown styled to match `.unit-selectors select` / `.ai-group select`; options built from `Set` over fetched `type` values; client-side filter mutates rendered list without re-fetching |
</phase_requirements>

---

## Summary

Phase 25 is a pure popup UI expansion — no new service worker message types, no new storage keys. The work falls in two areas: (1) expanding the GraphQL query + TypeScript type to surface `strokeCount` and activity `type`, and (2) rewriting the `portal-ready` div from a single button into a scrollable, filterable, stateful activity browser.

All infrastructure (message passing, `FETCH_ACTIVITIES` handler, `IMPORT_SESSION` handler, `showToast`, `renderPortalSection`, storage listener) was built in Phases 22 and 24. This phase only adds popup-side rendering logic and the query field expansion needed to display the two new data points.

The primary risk is the GraphQL field names for stroke count and activity type — the Trackman API schema is not publicly documented and must be confirmed via DevTools or trial-and-error during implementation. All other concerns are standard DOM manipulation within the existing popup architecture.

**Primary recommendation:** Expand `FETCH_ACTIVITIES_QUERY` and `ActivitySummary` first (Wave 1), then build the static HTML scaffold (Wave 1), then wire the dynamic rendering logic in `popup.ts` (Wave 2). This ordering means the API shape is confirmed before any UI logic depends on it.

---

## Standard Stack

This project uses no external UI libraries. Everything is vanilla TypeScript + inline CSS in popup.html.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.9.3 | Popup logic (`popup.ts`) | Already in use; strict typing for all DOM and message handlers |
| vitest | 4.0.18 | Unit tests | Already configured; `tests/test_*.ts` include pattern |
| esbuild (via build script) | pinned in `scripts/build-extension.sh` | Bundles `popup.ts` → `popup.js` | Already in use; no webpack/vite |

### No additional libraries needed
This phase introduces zero new dependencies. The activity browser is DOM manipulation + CSS within the existing popup.html shell.

**Installation:** No new packages to install.

---

## Architecture Patterns

### How the popup currently works (relevant to this phase)

`popup.ts` is a single DOMContentLoaded handler that:
1. Reads from `chrome.storage.local` synchronously (prefetch pattern)
2. Sends `PORTAL_AUTH_CHECK` to the service worker, receives a `PortalState` string
3. Calls `renderPortalSection(state)` which show/hides the four pre-rendered divs (`portal-denied`, `portal-not-logged-in`, `portal-ready`, `portal-error`)
4. Attaches event listeners to buttons within those divs

Phase 25 replaces step 3/4 for the `portal-ready` case: instead of showing a single button, it sends `FETCH_ACTIVITIES`, receives the list, and renders the browser panel inside `portal-ready`.

### Recommended Project Structure (no changes to directories)
```
src/
├── popup/
│   ├── popup.html   -- Add activity browser HTML + CSS inside portal-ready div
│   └── popup.ts     -- Add renderActivityBrowser(), renderActivityList(), filter logic
├── shared/
│   └── import_types.ts  -- Expand ActivitySummary, expand FETCH_ACTIVITIES_QUERY
tests/
└── test_activity_browser.ts  -- New test file for time-period grouping, date formatting, filter logic
```

### Pattern 1: portal-ready div replacement (D-01)

The current `portal-ready` div (popup.html line 582–584) contains only a single button. Phase 25 replaces its content with the full browser scaffold.

**Current:**
```html
<div id="portal-ready" style="display:none;">
  <button id="portal-import-btn" class="btn-primary">Import from Portal</button>
</div>
```

**Target structure:**
```html
<div id="portal-ready" style="display:none;">
  <!-- Filter row -->
  <div class="activity-filter-row">
    <label for="activity-type-filter" class="sr-only">Filter by type</label>
    <select id="activity-type-filter" class="activity-type-select">
      <option value="">All Types</option>
    </select>
  </div>
  <!-- Scrollable list container (D-03: max-height ~300px) -->
  <div id="activity-list-container" class="activity-list-container">
    <!-- States: idle / loading / loaded / error injected by JS -->
  </div>
</div>
```

### Pattern 2: Stat-card-row grid adapted for activity rows (D-04)

The existing `.stat-card-row` uses `grid-template-columns: 1fr 3rem 5rem 5rem`. Activity rows need a different layout (date, type, stroke count, Import button). A new `.activity-row` class reuses the same grid + tabular-nums pattern.

```css
/* Activity browser */
.activity-list-container {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  margin-top: 8px;
}

.activity-period-header {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-muted);
  padding: 6px 8px 2px 8px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  background: var(--color-bg-surface);
  position: sticky;
  top: 0;
  z-index: 1;
}

.activity-row {
  display: grid;
  grid-template-columns: 5rem 1fr 3rem auto;
  gap: 8px;
  padding: 6px 8px;
  font-size: 13px;
  align-items: center;
  border-top: 1px solid var(--color-border);
}

.activity-row:first-child {
  border-top: none;
}

.activity-date {
  font-variant-numeric: tabular-nums;
  color: var(--color-text-body);
  white-space: nowrap;
}

.activity-type {
  color: var(--color-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.activity-stroke-count {
  text-align: right;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-body);
}

.activity-import-btn {
  padding: 4px 10px;
  font-size: 12px;
  white-space: nowrap;
  color: var(--color-text-on-accent);
  background-color: var(--color-accent);
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.activity-import-btn:hover {
  background-color: var(--color-accent-hover);
}

.activity-import-btn:disabled {
  background-color: var(--color-disabled);
  cursor: not-allowed;
}

.activity-imported-label {
  font-size: 12px;
  color: var(--color-text-muted);
  padding: 4px 0;
  text-align: right;
}

/* Loading/empty states */
.activity-list-empty {
  padding: 16px 8px;
  text-align: center;
  font-size: 13px;
  color: var(--color-text-muted);
}
```

### Pattern 3: Dropdown consistent with existing selectors (D-09)

The filter dropdown must visually match `.unit-selectors select` and `.ai-group select` — same `border: 1px solid var(--color-accent)`, `border-radius: 6px`, `background: var(--color-bg-card)` pattern:

```css
.activity-filter-row {
  margin-top: 8px;
}

.activity-type-select {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--color-accent);
  border-radius: 6px;
  background: var(--color-bg-card);
  color: var(--color-text-body);
  font-size: 13px;
  cursor: pointer;
}

.activity-type-select:focus {
  outline: 2px solid var(--color-accent);
  outline-offset: -1px;
}
```

### Pattern 4: Date formatting (D-05)

JavaScript `Intl.DateTimeFormat` or manual month-name lookup. The activity `date` field from the API is an ISO 8601 date string (e.g., `"2026-01-15"`). Parse with `new Date(date + 'T00:00:00')` to avoid UTC-vs-local day-shift.

```typescript
function formatActivityDate(isoDate: string): string {
  // Append time to avoid UTC shift on date-only strings
  const d = new Date(isoDate + "T00:00:00");
  const now = new Date();
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const formatted = `${monthNames[d.getMonth()]} ${d.getDate()}`;
  // D-05: add year only if different from current year
  if (d.getFullYear() !== now.getFullYear()) {
    return `${formatted}, ${d.getFullYear()}`;
  }
  return formatted;
}
```

### Pattern 5: Time-period grouping logic (D-07, D-08)

```typescript
type TimePeriod = "Today" | "This Week" | "This Month" | "Older";

function getTimePeriod(isoDate: string): TimePeriod {
  const activityDate = new Date(isoDate + "T00:00:00");
  const now = new Date();

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Sunday start
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  if (activityDate >= todayStart) return "Today";
  if (activityDate >= weekStart) return "This Week";
  if (activityDate >= monthStart) return "This Month";
  return "Older";
}
```

The render function iterates `["Today", "This Week", "This Month", "Older"]` in order. For each period: filter the activity list to that period; if none, skip entirely (D-08); otherwise emit the header then the rows.

### Pattern 6: History dedup detection for "Imported" badge (D-06)

`history.ts`'s `saveSessionToHistory` deduplicates by `snapshot.report_id`. The `ActivitySummary.id` is a base64-encoded `SessionActivity\n{uuid}` (confirmed in STATE.md). The service worker uses this same `id` as the GraphQL `node(id:)` parameter and sets `report_id` in `SessionData` via `parsePortalActivity`.

To detect "already imported": on popup open, read `STORAGE_KEYS.SESSION_HISTORY` from `chrome.storage.local`. Extract all `report_id` values from the history entries. Compare each activity's `id` against the set.

**Implementation note:** The `report_id` on a portal-imported session equals the `ActivitySummary.id` (the base64 activity ID), not the UUID inside it. Verify this in `portal_parser.ts` before writing comparison logic — read `src/shared/portal_parser.ts` to confirm how `report_id` is set.

```typescript
async function fetchImportedIds(): Promise<Set<string>> {
  const result = await new Promise<Record<string, unknown>>((resolve) => {
    chrome.storage.local.get([STORAGE_KEYS.SESSION_HISTORY], resolve);
  });
  const history = (result[STORAGE_KEYS.SESSION_HISTORY] as Array<{ snapshot: { report_id: string } }>) ?? [];
  return new Set(history.map(e => e.snapshot.report_id));
}
```

### Pattern 7: GraphQL query expansion (Claude's discretion)

`FETCH_ACTIVITIES_QUERY` currently fetches only `id` and `date`. Phase 25 needs `strokeCount` (or equivalent) and `type` (activity type). The Trackman GraphQL schema is undocumented.

**Candidate field names to attempt (in order of likelihood):**

For stroke/shot count:
- `strokeCount` — most idiomatic GraphQL
- `totalStrokes`
- `shotCount`

For activity type:
- `type` — most common; likely a string or enum
- `activityType`
- `kind`

The service worker currently maps `result.data?.activities?.edges?.map(e => e.node)` directly to `ActivitySummary[]`. Adding new fields to the query is safe — unrecognized fields are returned by the server (if valid) or cause a GraphQL error (if invalid). The FETCH_ACTIVITIES handler passes errors up to the popup already.

**Recommended approach:** Add both `strokeCount` and `type` to the query. If the server returns a GraphQL error, the popup FETCH_ACTIVITIES error path fires with "Unable to fetch activities — try again later" and the implementer can adjust the field names. This is the same trial-and-error approach used in Phase 22.

### Anti-Patterns to Avoid

- **Separate re-fetch on filter change:** Filter must be client-side (D-11). Never send a new FETCH_ACTIVITIES message when the dropdown changes.
- **Blocking portal auth with activities fetch:** Keep the two async calls sequential — auth check first, then fetch activities only if state is "ready". Do not parallelize them.
- **UTC date parsing without time:** `new Date("2026-01-15")` is parsed as UTC midnight, which shifts to the previous day in negative-UTC-offset timezones. Always append `"T00:00:00"` for local parsing.
- **innerHTML injection without escaping:** Activity type names come from the API. Use `escapeHtml()` (already exported from `popup.ts`) before inserting into innerHTML.
- **Disabling all Import buttons during one import:** The "one import at a time" constraint (Phase 24 D-04) is enforced by the service worker. The popup should disable only the clicked row's button (show a spinner/disabled state), not all buttons.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTML escaping | Custom regex | `escapeHtml()` already in `popup.ts` | Handles `&`, `<`, `>`, `"`, `'`; already tested |
| Toast notifications | Custom alert div | `showToast()` already in `popup.ts` | Dark-mode safe, auto-dismiss, accessible role attribute |
| Unique type list | Manual dedup loop | `new Set(activities.map(a => a.type))` | One-liner; correct |
| Import status read on open | New storage read | Existing pattern at popup.ts lines 226–236 | Already handles auto-clear of completed states |

---

## Common Pitfalls

### Pitfall 1: GraphQL field names unconfirmed
**What goes wrong:** FETCH_ACTIVITIES_QUERY includes `strokeCount` and `type` but the real field names differ, causing a GraphQL error on every popup open.
**Why it happens:** Trackman API schema is not publicly documented.
**How to avoid:** Run the extension with DevTools open on the first implementation attempt. Check the error message in the service worker console — it will name the invalid field. Adjust and rebuild.
**Warning signs:** "Unable to fetch activities — try again later" toast on every popup open after Phase 25 lands.

### Pitfall 2: UTC date parse shifts day
**What goes wrong:** `new Date("2026-01-15")` returns Jan 14 in US timezones (UTC-5 to UTC-8), making the time-period grouping wrong.
**Why it happens:** Date-only ISO strings without a time component are parsed as UTC midnight by spec.
**How to avoid:** Always parse as `new Date(isoDate + "T00:00:00")`.
**Warning signs:** Activities showing in wrong time bucket; activities dated "today" appearing in "This Week" or "This Month".

### Pitfall 3: Report ID mismatch for "Imported" badge
**What goes wrong:** The imported-IDs set compares activity.id against history report_ids, but they don't match because `portal_parser.ts` sets `report_id` differently than `ActivitySummary.id`.
**Why it happens:** The base64 ID and the UUID inside it are different strings.
**How to avoid:** Before writing comparison logic, read `src/shared/portal_parser.ts` to confirm how `report_id` is assigned. If `report_id = activity.id` (the raw base64 value), the comparison works directly. If it's set to the decoded UUID, the comparison needs to decode the activity IDs.
**Warning signs:** Imported badge never shows, even for sessions clearly in history.

### Pitfall 4: Popup width overflow
**What goes wrong:** Activity rows with long type names push the popup wider than 320px (min-width).
**Why it happens:** Grid columns with `1fr` auto-size; long strings break layout.
**How to avoid:** Set `overflow: hidden; text-overflow: ellipsis; white-space: nowrap` on the type column (`.activity-type`). This is the same pattern used on `.stat-card-club`.
**Warning signs:** Popup stretches horizontally when certain activity types are displayed.

### Pitfall 5: "This Week" boundary definition
**What goes wrong:** "This Week" includes today if implemented as `>= weekStart && < todayStart`, producing double-counting (today appears in both Today and This Week).
**Why it happens:** Off-by-one in the period range.
**How to avoid:** Use strictly-less-than for the upper bound of each period (i.e., "Today" catches >= todayStart, then "This Week" catches >= weekStart AND < todayStart).
**Warning signs:** Activities appearing twice in the list.

---

## Code Examples

### Expanding ActivitySummary and FETCH_ACTIVITIES_QUERY
```typescript
// src/shared/import_types.ts

export interface ActivitySummary {
  id: string;
  date: string;
  strokeCount: number | null;  // null if field unavailable
  type: string | null;         // null if field unavailable
}

export const FETCH_ACTIVITIES_QUERY = `
  query FetchActivities($first: Int!) {
    activities(first: $first) {
      edges {
        node {
          id
          date
          strokeCount
          type
        }
      }
    }
  }
`;
```
Note: `strokeCount` and `type` are candidate names only. Verify via DevTools before treating as final.

### Service worker response mapping (needs update)
```typescript
// src/background/serviceWorker.ts — FETCH_ACTIVITIES handler, line ~196
const activities: ActivitySummary[] = result.data?.activities?.edges?.map(
  (e: { node: { id: string; date: string; strokeCount?: number; type?: string } }) => ({
    id: e.node.id,
    date: e.node.date,
    strokeCount: e.node.strokeCount ?? null,
    type: e.node.type ?? null,
  })
) ?? [];
```

### Calling FETCH_ACTIVITIES from popup.ts
```typescript
async function fetchActivities(): Promise<{ success: boolean; activities?: ActivitySummary[]; error?: string }> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "FETCH_ACTIVITIES" }, resolve);
  });
}
```

### Rendering the browser panel
```typescript
function renderActivityBrowser(
  activities: ActivitySummary[],
  importedIds: Set<string>,
  typeFilter: string
): void {
  const container = document.getElementById("activity-list-container");
  if (!container) return;

  const filtered = typeFilter
    ? activities.filter(a => a.type === typeFilter)
    : activities;

  if (filtered.length === 0) {
    container.innerHTML = `<div class="activity-list-empty">No activities found</div>`;
    return;
  }

  const periods: Array<"Today" | "This Week" | "This Month" | "Older"> =
    ["Today", "This Week", "This Month", "Older"];

  let html = "";
  for (const period of periods) {
    const group = filtered.filter(a => getTimePeriod(a.date) === period);
    if (group.length === 0) continue; // D-08: hide empty periods
    html += `<div class="activity-period-header">${escapeHtml(period)}</div>`;
    for (const activity of group) {
      const isImported = importedIds.has(activity.id);
      const dateStr = formatActivityDate(activity.date);
      const typeStr = activity.type ? escapeHtml(activity.type) : "—";
      const countStr = activity.strokeCount !== null ? String(activity.strokeCount) : "—";
      const actionHtml = isImported
        ? `<span class="activity-imported-label">Imported</span>`
        : `<button class="activity-import-btn" data-activity-id="${escapeHtml(activity.id)}">Import</button>`;
      html += `<div class="activity-row">
        <span class="activity-date">${dateStr}</span>
        <span class="activity-type">${typeStr}</span>
        <span class="activity-stroke-count">${countStr}</span>
        ${actionHtml}
      </div>`;
    }
  }
  container.innerHTML = html;

  // Attach import button listeners
  container.querySelectorAll<HTMLButtonElement>(".activity-import-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const activityId = btn.dataset.activityId;
      if (!activityId) return;
      btn.disabled = true;
      chrome.runtime.sendMessage({ type: "IMPORT_SESSION", activityId });
      // RESIL-02: result displayed via existing storage.onChanged listener
    });
  });
}
```

### Populating the filter dropdown
```typescript
function populateTypeFilter(activities: ActivitySummary[]): void {
  const select = document.getElementById("activity-type-filter") as HTMLSelectElement | null;
  if (!select) return;

  const types = [...new Set(activities.map(a => a.type).filter((t): t is string => t !== null))].sort();
  select.innerHTML = `<option value="">All Types</option>`;
  for (const type of types) {
    const opt = document.createElement("option");
    opt.value = type;
    opt.textContent = type;
    select.appendChild(opt);
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single "Import from Portal" button | Scrollable activity browser with filter | Phase 25 | User can select specific sessions without guessing |
| `ActivitySummary { id, date }` | `ActivitySummary { id, date, strokeCount, type }` | Phase 25 | Enables BROWSE-01 display requirements |
| Popup shows one portal-ready state | Popup shows idle/loading/loaded/importing/error browser states | Phase 25 | BROWSE-01 success criterion: user always knows status |

---

## Open Questions

1. **GraphQL field names for stroke count and activity type**
   - What we know: The API returns at least `id` and `date` per `FETCH_ACTIVITIES_QUERY`. The `Measurement` type has 60+ fields. Activities have a date and stroke groups.
   - What's unclear: Are the field names `strokeCount`/`type`, `totalStrokes`/`activityType`, or something else? No public schema docs.
   - Recommendation: Attempt `strokeCount` and `type` first. If a GraphQL error is returned, inspect the error message in the service worker DevTools console — it names invalid fields. Adjust and rebuild. This is the same workflow used in Phase 22.

2. **`report_id` vs `ActivitySummary.id` for "Imported" badge**
   - What we know: `saveSessionToHistory` deduplicates by `snapshot.report_id`. The portal parser sets `report_id` somewhere.
   - What's unclear: Is `report_id` set to the raw base64 activity ID (same as `ActivitySummary.id`), the decoded UUID, or something else?
   - Recommendation: Read `src/shared/portal_parser.ts` before implementing the comparison. This is a 5-minute check that determines whether the comparison is direct string equality or needs decoding.

---

## Environment Availability

Step 2.6: SKIPPED — this phase is pure code/config changes (TypeScript + HTML/CSS). No external tools, services, or CLIs beyond the project's existing build toolchain.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.0.18 |
| Config file | `vitest.config.ts` (root) — include pattern: `tests/test_*.ts` |
| Quick run command | `npx vitest run tests/test_activity_browser.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BROWSE-01 | `ActivitySummary` interface has `strokeCount` and `type` fields | unit | `npx vitest run tests/test_activity_browser.ts` | ❌ Wave 0 |
| BROWSE-01 | `formatActivityDate` returns "Mar 26" for same-year date | unit | `npx vitest run tests/test_activity_browser.ts` | ❌ Wave 0 |
| BROWSE-01 | `formatActivityDate` appends year for prior-year date | unit | `npx vitest run tests/test_activity_browser.ts` | ❌ Wave 0 |
| BROWSE-03 | `getTimePeriod` correctly bins today, this-week, this-month, older dates | unit | `npx vitest run tests/test_activity_browser.ts` | ❌ Wave 0 |
| BROWSE-03 | Empty time periods are skipped in rendered output | unit | `npx vitest run tests/test_activity_browser.ts` | ❌ Wave 0 |
| BROWSE-04 | Filter with specific type returns only matching activities | unit | `npx vitest run tests/test_activity_browser.ts` | ❌ Wave 0 |
| BROWSE-04 | Filter with empty string ("All Types") returns all activities | unit | `npx vitest run tests/test_activity_browser.ts` | ❌ Wave 0 |

**Note on testability:** `formatActivityDate`, `getTimePeriod`, and the filter logic should be extracted as exported pure functions from `popup.ts` or a new `src/shared/activity_browser.ts` helper module. This makes them directly importable by tests without needing a DOM. The rendering functions that directly manipulate DOM stay in `popup.ts` and do not require unit tests.

### Sampling Rate
- **Per task commit:** `npx vitest run tests/test_activity_browser.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/test_activity_browser.ts` — covers BROWSE-01 date formatting, BROWSE-03 period grouping, BROWSE-04 filtering

*(No framework install gaps — vitest 4.0.18 already configured.)*

---

## Sources

### Primary (HIGH confidence)
- Direct source code read: `src/popup/popup.html` — full CSS token set, stat-card-row pattern, existing dropdown styling, portal-section HTML structure
- Direct source code read: `src/popup/popup.ts` — `renderPortalSection`, `showToast`, `showImportStatus`, DOMContentLoaded handler structure, `escapeHtml`
- Direct source code read: `src/shared/import_types.ts` — `ActivitySummary` interface, `FETCH_ACTIVITIES_QUERY`, `IMPORT_SESSION_QUERY`
- Direct source code read: `src/background/serviceWorker.ts` — `FETCH_ACTIVITIES` and `IMPORT_SESSION` handlers, response shape
- Direct source code read: `src/shared/history.ts` — `saveSessionToHistory`, dedup by `report_id`
- Direct source code read: `src/shared/constants.ts` — `STORAGE_KEYS.SESSION_HISTORY`, `STORAGE_KEYS.IMPORT_STATUS`
- Direct source code read: `.planning/phases/25-activity-browser-ui/25-CONTEXT.md` — all locked decisions D-01 through D-12

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` — base64 activity ID format (`SessionActivity\n{uuid}`) confirmed during Phase 22 research
- `.planning/codebase/CONVENTIONS.md` — naming patterns, function design, export conventions
- `.planning/codebase/ARCHITECTURE.md` — message-passing IPC, popup data flow

### Tertiary (LOW confidence)
- Candidate GraphQL field names (`strokeCount`, `type`) — inferred from naming conventions; not verified against live API. Must confirm via DevTools during implementation.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; existing stack fully read from source
- Architecture: HIGH — all integration points read directly from source files
- GraphQL field names: LOW — schema not documented; candidate names are best-effort guesses
- Pitfalls: HIGH — derived from direct code inspection and known JS date parsing behavior
- Test patterns: HIGH — existing test files (`test_service_worker_import.ts`) provide concrete vi.hoisted + vi.mock patterns

**Research date:** 2026-03-26
**Valid until:** 2026-04-26 (stable stack; only risk is API schema change)
