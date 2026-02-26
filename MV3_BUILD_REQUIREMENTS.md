# MV3 Chrome Extension Build Requirements

## Current State
This repository currently contains a **Python-based CLI scraper** using Playwright. No MV3 extension files exist yet.

## Required Build Outputs for Loadable MV3 Extension

### 1. Root Manifest (`manifest.json`)
Required fields for MV3:
```json
{
  "manifest_version": 3,
  "name": "Trackman Scraper",
  "version": "1.0.0",
  "description": "Extract shot data from Trackman reports",
  "permissions": ["storage", "downloads"],
  "host_permissions": ["https://web-dynamic-reports.trackmangolf.com/*"],
  "background": {
    "service_worker": "dist/background.js"
  },
  "content_scripts": [{
    "matches": ["https://web-dynamic-reports.trackmangolf.com/*"],
    "js": ["dist/interceptor.js"],
    "run_at": "document_idle"
  }],
  "action": {
    "default_popup": "dist/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

### 2. Build Output Directory (`dist/` or `build/`)
Contents must include:

#### JavaScript Bundles (compiled from TypeScript)
- `background.js` - Service worker for background tasks
- `interceptor.js` - Content script for API interception  
- `popup.js` - Popup UI logic

#### HTML Files
- `popup.html` - Extension popup interface

#### Assets
- `icons/icon16.png` - 16x16 icon
- `icons/icon48.png` - 48x48 icon
- `icons/icon128.png` - 128x128 icon

### 3. Build Pipeline Requirements

#### Source Files (TypeScript)
```
src/
├── background/
│   └── serviceWorker.ts    → dist/background.js
├── content/
│   └── interceptor.ts      → dist/interceptor.js
├── popup/
│   ├── popup.ts            → dist/popup.js
│   └── popup.html          → dist/popup.html (copy)
└── shared/
    ├── models.ts           → shared types
    ├── constants.ts        → shared constants
    └── csv_writer.ts       → CSV generation logic
```

#### Build Steps
1. **TypeScript Compilation**: Compile `.ts` files to ES2020 JavaScript
2. **Bundling**: Bundle each entry point with dependencies (using esbuild/rollup/vite)
3. **Asset Copying**: Copy icons and static assets to `dist/`
4. **Manifest Validation**: Ensure all paths reference built JS, not source TS

### 4. MV3 Compliance Checklist

- [ ] `manifest_version: 3` (not 2)
- [ ] Service worker uses `background.service_worker` (not `background.page`)
- [ ] Content scripts declare `matches` patterns explicitly
- [ ] No inline scripts or eval() in content scripts
- [x] CSP compliant (no external CDN dependencies like Tailwind CDN - using local CSS bundle at src/shared/styles.css)
- [ ] Permissions are minimal (`storage`, `downloads`, host_permissions only)
- [ ] All JS paths point to bundled output, not source files

### 5. File Structure Summary

```
trackv3/
├── manifest.json              # MV3 manifest (root level)
├── src/                      # TypeScript sources
│   ├── background/serviceWorker.ts
│   ├── content/interceptor.ts
│   ├── popup/popup.ts
│   ├── popup/popup.html
│   └── shared/               # Shared modules
├── dist/                     # Build output (gitignored)
│   ├── manifest.json         # Copied with corrected paths
│   ├── background.js
│   ├── interceptor.js
│   ├── popup.js
│   ├── popup.html
│   └── icons/
│       ├── icon16.png
│       ├── icon48.png
│       └── icon128.png
├── package.json              # Build dependencies & scripts
└── tsconfig.json             # TypeScript configuration
```

### 6. Build Script Example (`package.json` scripts)

```json
{
  "scripts": {
    "build": "npm run build:ts && npm run build:assets",
    "build:ts": "esbuild src/background/serviceWorker.ts --bundle --outfile=dist/background.js --format=esm --platform=browser",
    "build:content": "esbuild src/content/interceptor.ts --bundle --outfile=dist/interceptor.js --format=esm --platform=browser",
    "build:popup": "esbuild src/popup/popup.ts --bundle --outfile=dist/popup.js --format=iife --global-name=TrackmanPopup",
    "build:assets": "cp -r src/icons dist/"
  }
}
```

### 7. Testing Requirements

- Unit tests for URL parsing, CSV generation, data models
- Integration tests with mock API payloads
- Manual smoke test: Load unpacked extension in Chrome without console errors
