# TrackPull

## What This Is

A Chrome extension that scrapes shot data from Trackman golf web reports and exports it to CSV. It intercepts API responses on trackmangolf.com, parses shot metrics by club, and lets golfers download their session data for external analysis.

## Core Value

Accurately capture every shot metric from a Trackman report and produce a clean, complete CSV export — scraping and exporting are inseparable.

## Requirements

### Validated

- ✓ Intercept Trackman API responses to capture shot data — existing
- ✓ Parse StrokeGroups JSON into structured SessionData — existing
- ✓ Scrape HTML tables as fallback when API interception unavailable — existing
- ✓ Merge shot data across multiple metric pages — existing
- ✓ Scrape club name tags from DOM and attach to shots — existing
- ✓ Export session data as CSV with ordered metric columns — existing
- ✓ Convert units (yards/meters, mph/km/h/m/s, degrees/radians) — existing
- ✓ Persist user unit preferences (speed + distance independently) — existing
- ✓ Display shot count in popup UI — existing
- ✓ Clear stored session data from popup — existing
- ✓ Include averages and consistency rows per club in CSV — existing

### Active

(None yet — setting up GSD for future work)

### Out of Scope

(None defined yet)

## Context

- Manifest V3 Chrome extension with MAIN world interceptor + ISOLATED world bridge architecture
- Pure TypeScript, no production dependencies — only Chrome APIs
- Built with esbuild, tested with vitest
- Targets `https://web-dynamic-reports.trackmangolf.com/*`
- Current version: 1.2.1
- `dist/` is tracked in git; `production.zip` is gitignored
- GitHub releases via zipped dist/ folder

## Constraints

- **Platform**: Chrome Extension (Manifest V3) — required for API interception and page injection
- **Host**: Only runs on `web-dynamic-reports.trackmangolf.com` — Trackman's report domain
- **Dependencies**: Zero production dependencies — Chrome APIs only
- **Auth**: No auth layer — relies on user being logged into Trackman website

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| MAIN world injection for API interception | Only MAIN world can monkey-patch fetch/XHR to capture responses | ✓ Good |
| ISOLATED world bridge for Chrome API access | Chrome extension APIs unavailable in MAIN world; bridge forwards messages | ✓ Good |
| HTML table scraping as fallback | API responses may not always be available; DOM scraping provides reliability | ✓ Good |
| esbuild over webpack/vite | Simpler, faster builds for a small extension with no complex bundling needs | ✓ Good |
| dist/ tracked in git | Simplifies releases — zip and upload without separate build step | ✓ Good |

---
*Last updated: 2026-03-02 after initialization*
