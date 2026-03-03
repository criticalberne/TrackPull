# TrackPull

## What This Is

A Chrome extension that scrapes shot data from Trackman golf web reports, exports to CSV, copies to clipboard as TSV for spreadsheets, and launches one-click AI analysis with built-in and custom golf prompts. Features system-aware dark mode, prompt preview, and export customization.

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
- ✓ Gemini AI launch support via clipboard-first flow — v1.5
- ✗ ~~Keyboard shortcut (Cmd+Shift+G / Ctrl+Shift+G) to open popup~~ — v1.5, removed: conflicted with macOS system shortcuts
- ✓ Dark mode matching system theme across popup and options — v1.5
- ✓ Empty state guidance replacing bare "0 shots" dead end — v1.5
- ✓ Export format toggle for averages/consistency rows — v1.5
- ✓ Prompt preview before sending to AI — v1.5

### Active

<!-- v1.6 Data Intelligence -->

- [ ] Session history — persist sessions in chrome.storage, browse/re-export from popup
- [ ] Session comparison — delta columns comparing club averages across sessions
- [ ] Visual shot summary — stat card in popup (avg carry, avg club speed, shot count by club)
- [ ] Smart prompt suggestions — highlighted label on data-matched prompt in dropdown

### Future

(None)

### Out of Scope

- Real-time API integration with AI services — opens in browser tab, no API keys
- Mobile app — web extension only
- Cloud sync — no backend; extension is local-only by design
- Direct AI API integration — requires API key management, billing
- Prompt sharing / community library — requires backend, moderation, user accounts
- Manual dark mode toggle — system-match is sufficient; revisit only if users request override
- Gemini URL pre-fill via content script — brittle against Gemini's SPA; clipboard-first is permanent approach
- User-configurable shortcut picker — Chrome's chrome://extensions/shortcuts provides this natively
- Keyboard shortcut to open popup — Cmd+Shift+G conflicted with macOS; removed in v1.5

## Context

Shipped v1.5 with ~49,908 LOC TypeScript.
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
| Optional last param for surface metadata | All writer functions accept optional hittingSurface — zero caller breakage | ✓ Good |
| Mat as default surface | Most Trackman users practice on mats at indoor ranges; flags most impactful surface | ✓ Good |
| _execute_action for keyboard shortcut | Chrome handles popup open natively; no background.js handler needed | ✗ Removed — conflicted with macOS |
| CSS custom property tokens for theming | var(--color-*) tokens enable dark mode via @media query without JS | ✓ Good |
| classList toggling over inline styles | Status messages use CSS classes for dark mode support instead of style.color | ✓ Good |
| Native details/summary for prompt preview | No JS state management needed; browser handles expand/collapse | ✓ Good |
| textContent (not innerHTML) for preview | Prevents XSS from user-defined prompts in preview widget | ✓ Good |
| includeAverages default true | Backward compatible — existing users continue getting averages in exports | ✓ Good |

## Current Milestone: v1.6 Data Intelligence

**Goal:** Add session persistence, cross-session comparison, visual summaries, and intelligent prompt matching.

**Target features:**
- Session history — persist sessions in chrome.storage, browse/re-export from popup
- Session comparison — delta columns comparing club averages across sessions
- Visual shot summary — stat card in popup (avg carry, avg club speed, shot count by club)
- Smart prompt suggestions — highlighted label on data-matched prompt in dropdown

---
*Last updated: 2026-03-03 after starting v1.6 milestone*
