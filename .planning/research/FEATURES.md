# Feature Research

**Domain:** Golf data scraping and export Chrome extension (Trackman report data)
**Researched:** 2026-03-02
**Confidence:** MEDIUM — ecosystem surveyed via WebSearch and official product pages; no single authoritative spec exists for this niche

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that are standard in comparable golf data tools and data extraction extensions. Missing any of these makes the product feel half-built.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| CSV export with all shot metrics | Universal expectation from any data tool; this is the whole product | LOW | Already exists (v1.2.1) |
| Per-club grouping and averages in export | Every comparable tool (Golf Shot Analytics, R10Progress, ShotMetrics) groups by club | LOW | Already exists (v1.2.1) |
| Unit selection (yards/meters, mph/km/h) | International user base; Trackman itself is used globally | LOW | Already exists (v1.2.1) |
| Shot count visible in popup | Users need to confirm capture succeeded before downloading | LOW | Already exists (v1.2.1) |
| Clear/reset session button | Essential for starting a new session without stale data | LOW | Already exists (v1.2.1) |
| Consistent column ordering in CSV | Users build analysis templates in Excel/Sheets; columns must not shift | LOW | Already exists (v1.2.1) |
| Reliable capture (API + DOM fallback) | Users lose confidence if data is missing; silent partial capture is worse than a visible error | MEDIUM | Already exists (v1.2.1) |
| File named with date | Standard in every data export tool; unnamed files create chaos in Downloads | LOW | Already exists (ShotData_YYYY-MM-DD.csv) |
| Capture status indicator | User must know if the extension is actively intercepting data on the current page | LOW | Not currently visible; popup shows shot count only when data exists |
| Export feedback (success/failure) | Users click Download and see nothing happen; needs explicit confirmation | LOW | Not confirmed as implemented; standard UX expectation |

---

### Differentiators (Competitive Advantage)

Features that are not universally expected in a scraper extension but are common in dedicated golf data platforms — and would make TrackPull meaningfully better than a simple CSV dump.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Multi-session accumulation (persist across reports) | Every comparable tool (ericKlawitter/trackman_scraper, Golf Shot Analytics, R10Progress) builds historical shot logs; single-session export limits analysis | MEDIUM | Requires IndexedDB or chrome.storage.local with append logic; session identity needs definition |
| Shot filtering before export (exclude outliers) | Trackman's own dynamic report lets users "hide outliers"; analysts want clean data — the scraper captures everything indiscriminately | MEDIUM | UI for selecting/deselecting shots before download; requires shot-level state management |
| Column selection for export | Power users feeding data to Excel templates want specific columns; exporting 30+ columns creates noise | LOW | Checkbox list in popup; preference persisted in chrome.storage.sync |
| Club distance gapping summary row | Standard Trackman feature (Map My Bag); a one-page view of average carry per club is the primary use case for most gapping sessions | LOW | Computable from existing data; a separate summary CSV or an extra sheet |
| Clipboard copy (tab-delimited) | Power users paste directly into Excel or Google Sheets instead of managing file downloads; major scraper extensions (Table Capture, CopyTables) do this | LOW | navigator.clipboard.writeText() with tab-delimited data |
| Per-session export with session label in filename | Analysts running multiple bag-fitting or gapping sessions per day need filenames they can distinguish | LOW | Prompt for session name on download, or use timestamp with club count |
| Export to JSON | Some users pipe data into other tools or scripts (AI prompts, custom dashboards); JSON is the default for programmatic use | LOW | Trivial given data is already structured; toggle in settings |
| Consistency metric highlight in export | ShotMetrics AI and Golf Shot Analytics surface consistency as a primary signal; the extension already computes std dev but doesn't call it out prominently | LOW | Rename or annotate the consistency row; no new computation needed |
| Ready-made AI analysis prompt | Already referenced in repo README; lowers barrier from "I have a CSV" to "I have insights" | LOW | Static prompt template with instructions for pasting into ChatGPT/Claude; pure content, no code |
| Visual capture feedback in browser toolbar | Extensions like Webtable show badge counts; a green/yellow/red icon state communicates capture status at a glance without opening popup | LOW | chrome.action.setBadgeText() and setBadgeBackgroundColor() in content script |

---

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Cloud sync / account system | "Save my data online" seems natural for historical tracking | Requires auth, backend infrastructure, data storage — shatters the zero-dependency, privacy-safe model; violates the spirit of a local browser tool | Use chrome.storage.local for persistence; position as "your data stays in your browser" — that is a feature, not a limitation |
| In-extension shot visualization / dispersion charts | Dedicated tools (ShotMetrics, Golf Shot Analytics) do this; users want to see trajectory plots | This is a full analytics product, not an export tool; building it poorly competes badly against purpose-built tools | Export clean data to those tools; link to ShotMetrics, Golf Shot Analytics, R10Progress in the README/popup |
| Trackman account login / OAuth | Users want seamless access without navigating to the report URL manually | Requires Trackman API credentials, terms-of-service compliance, and a backend — none of which are feasible for a browser extension with no server | Rely on user already being logged in; extension only activates on the report page |
| Auto-send CSV to email or Google Sheets | Sounds like a convenience win | Requires cloud permissions, OAuth flows, and ongoing maintenance for third-party API changes; breaks the no-backend constraint | Clipboard copy to paste directly into Sheets is good enough and has no external dependencies |
| Shot video capture or replay | Trackman stores video per shot; seems natural to capture it | Videos are served from separate CDN endpoints, require separate auth tokens, and are large binary files — well outside the scope of a data extraction tool | Document the URL pattern if users want to find videos manually; do not automate this |
| Real-time coaching feedback / AI scoring | ShotMetrics AI does this; users who see AI mentioned in the README may ask for it | Requires inference API, subscription model, and ongoing costs; fundamentally changes the product from data exporter to analytics service | Provide an AI prompt template for users to run themselves with their exported CSV |

---

## Feature Dependencies

```
[Multi-session accumulation]
    └──requires──> [Session identity / deduplication logic]
                       └──requires──> [chrome.storage.local data model]

[Shot filtering before export]
    └──requires──> [Shot-level state management in popup]
                       └──enhances──> [Multi-session accumulation]

[Column selection]
    └──requires──> [chrome.storage.sync for preference persistence]

[Club distance gapping summary]
    └──requires──> [Existing per-club averages computation] (already exists)

[Clipboard copy]
    └──enhances──> [CSV export] (alternative output path, same data)

[JSON export]
    └──enhances──> [CSV export] (alternative format, same data)

[Toolbar badge status]
    └──enhances──> [Capture status indicator]

[Column selection] ──conflicts──> [Fixed column ordering]
    (if users can reorder, the "consistent column ordering" guarantee weakens)
```

### Dependency Notes

- **Multi-session accumulation requires session identity:** The extension must decide what constitutes a "session" (URL, timestamp, club set detected) before it can append shots correctly across visits to different report pages.
- **Shot filtering enhances multi-session accumulation:** Once shots persist across sessions, users need a way to clean up bad captures before the historical record grows stale.
- **Column selection conflicts with fixed column ordering:** If column ordering becomes user-configurable, any downstream scripts or Excel templates that assume fixed column positions break. Implement column selection as "include/exclude" only, not reordering.

---

## MVP Definition

The product is already past v1 MVP. This section defines what the "next milestone" MVP looks like — the minimum that justifies a v1.3 or v2.0 release.

### Next Release MVP (v1.3)

Minimum set that adds meaningful new value without scope creep.

- [ ] **Capture status indicator in popup** — Users currently cannot tell if the extension is ready or if it missed the API intercept; this is the single most common failure mode confusion
- [ ] **Export feedback (visible success/error state)** — Standard UX; currently unverified as implemented
- [ ] **Clipboard copy (tab-delimited)** — Low complexity, high value for the target user who lives in Excel/Sheets
- [ ] **Column selection** — Allows users to trim the export to what matters for their workflow; low complexity, well-understood UX pattern

### Add After Validation (v1.x)

- [ ] **Multi-session accumulation** — Trigger: users report friction from managing one CSV file per session
- [ ] **Shot filtering before export** — Trigger: users complain about outliers polluting their averages
- [ ] **Per-session filename with label** — Trigger: user feedback about filename collision when doing multiple sessions per day

### Future Consideration (v2+)

- [ ] **Club distance gapping summary tab** — Defer until multi-session data makes it more meaningful
- [ ] **JSON export toggle** — Defer until there is evidence of programmatic users
- [ ] **Toolbar badge status** — Nice polish; not blocking any real use case

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Capture status indicator | HIGH | LOW | P1 |
| Export feedback | HIGH | LOW | P1 |
| Clipboard copy | HIGH | LOW | P1 |
| Column selection | MEDIUM | LOW | P1 |
| Multi-session accumulation | HIGH | MEDIUM | P2 |
| Shot filtering before export | HIGH | MEDIUM | P2 |
| Per-session filename with label | MEDIUM | LOW | P2 |
| Club distance gapping summary | MEDIUM | LOW | P2 |
| Toolbar badge status | MEDIUM | LOW | P2 |
| JSON export toggle | LOW | LOW | P3 |
| Ready-made AI analysis prompt update | LOW | LOW | P3 |

**Priority key:**
- P1: High value, low cost — build next
- P2: High value, medium cost or medium value — build after P1 validates direction
- P3: Nice to have, defer until P2 is stable

---

## Competitor Feature Analysis

| Feature | Golf Shot Analytics | R10Progress | ShotMetrics AI | TrackPull (current) |
|---------|---------------------|-------------|----------------|---------------------|
| CSV export | Yes (tables + charts as PNG) | Yes | Yes | Yes |
| Per-club grouping | Yes (Clubs Overview dashboard) | Yes | Yes | Yes |
| Unit selection | Yes | Yes (multi-language CSV) | Not specified | Yes |
| Session history | Yes (Sessions Overview) | Yes | Yes | No — single session only |
| Shot filtering | Yes (date, club, session, custom) | Yes (sort/filter) | Not specified | No |
| Outlier removal | Yes | Not specified | Not specified | No |
| Visualization | Yes (trajectories, dispersion) | Yes (dispersion maps) | Yes (interactive plots) | No |
| Progress tracking | Yes (Progress dashboard) | Yes | Yes | No |
| Clipboard copy | Not specified | Not specified | Not specified | No |
| AI analysis | Not built-in | Optional (donation) | Core feature (AI plans) | Prompt template in README |
| Open source / free | Yes | Yes (free) | No ($5.99/mo) | Yes |
| Works with Trackman web reports | No (Trackman not listed) | No (Garmin R10 focused) | Yes (upload CSV) | Yes (native, in-browser) |

**Key insight:** TrackPull's unique competitive position is native, in-browser capture on Trackman's web report — no other tool does this. Every competitor requires the user to already have a CSV file. This means TrackPull's most defensible next features are those that extend the scraping experience (session accumulation, shot filtering) rather than downstream analytics (visualization, AI) where dedicated platforms are already much better.

---

## Sources

- [Golf Shot Analytics Features](https://www.golfshotanalytics.com/features) — product feature list (MEDIUM confidence, official product page)
- [ShotMetrics AI Features](https://shotmetrics-ai.com/features/) — product feature list (MEDIUM confidence, official product page)
- [R10Progress](https://r10progress.com/) — Garmin R10 analytics tool (MEDIUM confidence, official site)
- [ericKlawitter/trackman_scraper](https://github.com/ericKlawitter/trackman_scraper) — Python Trackman scraper feature set (HIGH confidence, inspected directly)
- [TrackPull GitHub](https://github.com/criticalberne/TrackPull) — existing extension (HIGH confidence, this is the project)
- [Trackman dynamic reports](https://www.golfcave.com/blog/dynamic-reports) — Trackman's own web report features including outlier hiding (MEDIUM confidence, third-party blog describing official feature)
- [Thunderbit Chrome extension data scrapers overview](https://thunderbit.com/blog/best-web-scraper-chrome-extensions) — export format norms for data scraper extensions (MEDIUM confidence, industry overview)
- [Chrome extension best practices](https://deepfocustools.com/chrome-extension-best-practices/) — popup UX patterns (MEDIUM confidence)
- [Trackman Map My Bag announcement](https://www.trackman.com/blog/golf/know-your-numbers-introducing-map-my-bag-in-tps-10-1) — distance gapping as a primary user need (HIGH confidence, official Trackman blog)

---
*Feature research for: TrackPull — Trackman report data scraping Chrome extension*
*Researched: 2026-03-02*
