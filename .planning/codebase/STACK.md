# Technology Stack

**Analysis Date:** 2026-03-02

## Languages

**Primary:**
- TypeScript 5.9.3 - Chrome extension source code and build system

## Runtime

**Environment:**
- Chrome Extension (Manifest V3)
- Service Worker (background task handling)
- Content Scripts (page injection)

**Package Manager:**
- npm (from package-lock.json)
- Lockfile: present

## Frameworks

**Core:**
- Chrome Extension APIs (runtime, storage, downloads, permissions)
  - `chrome.runtime` - Message passing between extension components
  - `chrome.storage.local` - Persistent local storage for session data and user preferences
  - `chrome.downloads` - CSV file downloads

**Testing:**
- vitest 4.0.18 - Unit test runner
  - Config: `vitest.config.ts`
  - Custom pattern: tests named `test_*.ts` (non-standard `.test.ts` naming)

**Build/Dev:**
- esbuild - JavaScript/TypeScript bundler (via npm esbuild)
  - Used in `scripts/build-extension.sh`
  - Output format: IIFE (immediately-invoked function expression)
  - Bundles each extension component separately:
    - `src/background/serviceWorker.ts` → `dist/background.js`
    - `src/content/interceptor.ts` → `dist/interceptor.js`
    - `src/content/bridge.ts` → `dist/bridge.js`
    - `src/content/html_scraping.ts` → `dist/html_scraping.js`
    - `src/popup/popup.ts` → `dist/popup.js`

## Key Dependencies

**Development:**
- typescript 5.9.3 - Language compiler
- vitest 4.0.18 - Test framework

**No Production Dependencies**
- Pure TypeScript/JavaScript with native Chrome APIs only
- No external npm packages in production build

## Configuration

**Extension Manifest:**
- `src/manifest.json` - Chrome Extension Manifest V3
  - Permissions: `storage` (chrome.storage.local), `downloads` (CSV export)
  - Host permissions: `https://web-dynamic-reports.trackmangolf.com/*`
  - Version synchronized with `package.json` version field (currently 1.2.1)

**Build Configuration:**
- `scripts/build-extension.sh` - Main build script
  - Compiles TypeScript via esbuild
  - Copies assets (icons, HTML)
  - Validates popup.html for correct JS references

**Test Configuration:**
- `vitest.config.ts` - Specifies test file pattern `tests/test_*.ts`

**Type Configuration:**
- `package.json` declares `"type": "commonjs"` for module resolution

## Platform Requirements

**Development:**
- Node.js (npm, esbuild)
- Bash shell (for build scripts)
- TypeScript 5.9.3+ compiler

**Production:**
- Chrome browser with Manifest V3 support
- Host access to `https://web-dynamic-reports.trackmangolf.com/` for API interception

## Build Output

**Artifacts:**
- `dist/` directory (tracked in git)
- `dist/manifest.json` - Extension manifest
- `dist/background.js` - Service worker bundle (with inline sourcemap)
- `dist/interceptor.js` - Content script for API interception (MAIN world)
- `dist/bridge.js` - Content script for message bridge (ISOLATED world)
- `dist/html_scraping.js` - Content script for DOM scraping
- `dist/popup.js` - UI popup script
- `dist/popup.html` - Popup interface
- `dist/icons/` - Extension icons

**Distribution:**
- `production.zip` - Created by `scripts/build-zip.sh` (gitignored)
- GitHub releases use the zipped dist/ folder

---

*Stack analysis: 2026-03-02*
