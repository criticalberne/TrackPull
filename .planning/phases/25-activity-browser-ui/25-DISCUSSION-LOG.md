# Phase 25: Activity Browser UI - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-26
**Phase:** 25-activity-browser-ui
**Areas discussed:** Panel integration, Activity list layout, Time-period grouping, Filter UI

---

## Panel Integration

| Option | Description | Selected |
|--------|-------------|----------|
| Replace Import button | Inline replacement — activity list loads directly when portal is ready. No extra click. | ✓ |
| Expandable disclosure | Keep Import button as trigger, expand into list using details/summary pattern. | |
| Always-visible list | Activity list always visible, scrolls in fixed-height container. | |

**User's choice:** Replace Import button
**Notes:** Most direct access. Activity browser replaces the current single-button portal-ready state.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Scrollable container | Fixed max-height (~300px) with overflow scroll. Keeps popup compact. | ✓ |
| Grow to fit | List grows to show all activities. Popup gets taller. | |
| You decide | Claude picks. | |

**User's choice:** Scrollable container
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Replace list area | Auth/error states take over entire portal section. No list until ready. | ✓ |
| You decide | Claude picks based on existing patterns. | |

**User's choice:** Replace list area
**Notes:** Same as current behavior.

---

## Activity List Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Compact single-line | Date · stroke count · type on one line, Import button right-aligned. | ✓ |
| Two-line card | Date and type on first line, stroke count on second. More readable but 2x space. | |

**User's choice:** Compact single-line
**Notes:** Matches dense stat-card-row pattern.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Short month + day | "Mar 26" — add year only for activities older than current year. | ✓ |
| Relative dates | "Today", "Yesterday", "3 days ago". | |
| You decide | Claude picks. | |

**User's choice:** Short month + day
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Show "Imported" label | Replace Import button with muted "Imported" text for already-imported activities. | ✓ |
| Always show Import | Import always available, re-importing overwrites via dedup. | |
| You decide | Claude picks. | |

**User's choice:** Show "Imported" label
**Notes:** Prevents accidental re-imports, signals completion.

---

## Time-Period Grouping

| Option | Description | Selected |
|--------|-------------|----------|
| Flat section headers | Small, muted text labels between rows. Always visible, not collapsible. | ✓ |
| Collapsible sections | details/summary disclosure per time period. | |
| Sticky headers | Headers stick to top of scroll container. | |

**User's choice:** Flat section headers
**Notes:** Consistent with compact single-line row decision.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Hide empty periods | Skip header entirely if no activities in that period. | ✓ |
| Show all periods | Always show all four headers with "No activities" for empty ones. | |
| You decide | Claude picks. | |

**User's choice:** Hide empty periods
**Notes:** Cleaner, less noise.

---

## Filter UI

| Option | Description | Selected |
|--------|-------------|----------|
| Dropdown selector | "All Types ▼" dropdown above activity list. Matches existing dropdown patterns. | ✓ |
| Horizontal chip/pills | Small pill buttons for each type. More visual but takes horizontal space. | |
| You decide | Claude picks. | |

**User's choice:** Dropdown selector
**Notes:** Consistent with unit-selector and AI-service-select patterns.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Dynamic from data | Populate dropdown with types present in fetched activities only. | ✓ |
| Hardcoded types | Fixed list of known Trackman activity types. | |
| You decide | Claude picks. | |

**User's choice:** Dynamic from data
**Notes:** Avoids showing filter options that return zero results.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Client-side filter | Fetch all once, filter in JS. Instant, no extra network calls. | ✓ |
| Server-side filter | Pass type to GraphQL query. More accurate for large datasets. | |
| You decide | Claude picks. | |

**User's choice:** Client-side filter
**Notes:** Works well with the 20-item page size from Phase 24.

---

## Claude's Discretion

- CSS styling details for activity rows, section headers, scrollable container
- How to detect which activities are already in history
- GraphQL query field expansion (stroke count, activity type)
- Loading spinner/skeleton design
- Filter dropdown change handler wiring

## Deferred Ideas

None — discussion stayed within phase scope
