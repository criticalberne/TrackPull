# TrackPull

## What This Is

A Chrome extension that scrapes shot data from Trackman golf web reports, exports to CSV, copies to clipboard as TSV for spreadsheets, and launches one-click AI analysis with built-in and custom golf prompts.

## Core Value

Accurately capture every shot metric from a Trackman report and produce a clean, complete CSV export — scraping and exporting are inseparable.

## Requirements

### Validated

- ✓ Intercept Trackman API responses to capture shot data — v1.x
- ✓ Parse StrokeGroups JSON into structured SessionData — v1.x
- ✓ Scrape HTML tables as fallback when API interception unavailable — v1.x
- ✓ Merge shot data across multiple metric pages — v1.x
- ✓ Scrape club name tags from DOM and attach to shots — v1.x
- ✓ Export session data as CSV with ordered metric columns — v1.x
- ✓ Convert units (yards/meters, mph/km/h/m/s, degrees/radians) — v1.x
- ✓ Persist user unit preferences (speed + distance independently) — v1.x
- ✓ Display shot count in popup UI — v1.x
- ✓ Clear stored session data from popup — v1.x
- ✓ Include averages and consistency rows per club in CSV — v1.x
- ✓ Copy shot data to clipboard as tab-separated values — v1.3
- ✓ Launch AI analysis in ChatGPT, Claude, or Gemini with data + prompt — v1.3
- ✓ Copy prompt+data to clipboard for manual AI paste — v1.3
- ✓ Bundle 8 built-in golf analysis prompts across skill tiers — v1.3
- ✓ Let users create, edit, and delete custom prompt templates — v1.3
- ✓ Set default AI service preference — v1.3
- ✓ Prompt management in options page, quick access in popup — v1.3

- ✓ User-selectable hitting surface (Grass/Mat) in popup with metadata in CSV, TSV, and AI prompts — v1.4

### Active

(None — awaiting next milestone definition)

### Out of Scope

- Real-time API integration with AI services — opens in browser tab, no API keys
- Mobile app — web extension only
- Cloud sync — no backend; extension is local-only by design
- Direct AI API integration — requires API key management, billing
- Prompt sharing / community library — requires backend, moderation, user accounts

## Context

Shipped v1.4 with ~50,600 LOC TypeScript.
Tech stack: Chrome MV3 extension, esbuild, vitest. Zero production dependencies.
247 tests across 12 test files, all passing.
`dist/` tracked in git; `production.zip` gitignored.

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
| Built-in prompts as TypeScript constants | 8 prompts bundled in code; no storage overhead or quota concerns | ✓ Good |
| TSV for clipboard export | Tab-separated pastes directly into Google Sheets / Excel | ✓ Good |
| Clipboard-first AI launch | AI services lack reliable URL pre-fill; clipboard + open tab is universal | ✓ Good |
| Per-key chrome.storage.sync for custom prompts | Individual keys avoid 8 KB single-item quota limit | ✓ Good |
| Pre-fetch data pattern in popup | Cache storage reads at DOMContentLoaded; avoids async focus-loss clipboard errors | ✓ Good |
| Gemini deferred to v1.4+ | host_permissions addition triggers permission prompt for all users; isolate to own release | ✓ Good |
| Optional last param for surface metadata | All writer functions accept optional hittingSurface — zero caller breakage | ✓ Good |
| Mat as default surface | Most Trackman users practice on mats at indoor ranges; flags most impactful surface | ✓ Good |

---
*Last updated: 2026-03-03 after v1.4 milestone*
