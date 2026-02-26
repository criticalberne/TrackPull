#!/bin/bash
# Build script for MV3 Chrome extension

set -e

DIST_DIR="dist"

echo "Building Trackman Scraper Chrome Extension..."
rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR/icons"

if [ -f "src/manifest.json" ]; then
    cp src/manifest.json "$DIST_DIR/"
else
    cat > "$DIST_DIR/manifest.json" << 'MANIFEST'
{
  "manifest_version": 3,
  "name": "Trackman Scraper",
  "version": "1.0.0",
  "description": "Extract shot data from Trackman reports",
"permissions": ["storage", "downloads"],
    "host_permissions": ["https://web-dynamic-reports.trackmangolf.com/*"],
    "background": {"service_worker": "./background.js"},
    "content_scripts": [{"matches": ["https://web-dynamic-reports.trackmangolf.com/*"], "js": ["./interceptor.js"]}],
  "action": {"default_popup": "popup.html", "default_icon": {"16": "icons/icon16.png"}},
  "icons": {"16": "icons/icon16.png"}
}
MANIFEST
fi

echo "Manifest copied to $DIST_DIR/manifest.json"

npx --yes esbuild src/background/serviceWorker.ts --bundle --outfile="$DIST_DIR/background.js" --format=esm --platform=browser --sourcemap=inline 2>/dev/null || { echo 'Error: Failed to build background.js' >&2; exit 1; }

echo "Background service worker bundled to $DIST_DIR/background.js"

npx --yes esbuild src/content/interceptor.ts --bundle --outfile="$DIST_DIR/interceptor.js" --format=esm --platform=browser || { echo 'Error: Failed to build interceptor.js' >&2; exit 1; }

echo "Content script bundled to $DIST_DIR/interceptor.js"

npx --yes esbuild src/popup/popup.ts --bundle --outfile="$DIST_DIR/popup.js" --format=iife || { echo 'Error: Failed to build popup.js' >&2; exit 1; }

echo "Popup script bundled to $DIST_DIR/popup.js"

mkdir -p "$DIST_DIR/icons"
if compgen -G "src/icons/*.png" > /dev/null; then
    cp src/icons/*.png "$DIST_DIR/icons/"
else
    echo 'Warning: No icon files found in src/icons/' >&2
fi
cp src/popup/popup.html "$DIST_DIR/popup.html" || echo 'Warning: popup.html not found' >&2

echo "Validating HTML references bundled JS..."
if grep -q '\.ts"' "$DIST_DIR/popup.html"; then
    echo "Error: popup.html references .ts files, must reference .js bundles only" >&2
    exit 1
fi

echo "HTML validation passed - no TypeScript source references found"

echo "Build complete!"
