#!/bin/bash
# Build script for MV3 Chrome extension

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

DIST_DIR="dist"

echo "Building TrackPull Chrome Extension..."
rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR/icons"

if [ ! -f "src/manifest.json" ]; then
    echo "Error: src/manifest.json not found" >&2
    exit 1
fi
cp src/manifest.json "$DIST_DIR/"
echo "Manifest copied to $DIST_DIR/manifest.json"

# Entry points: "<source>:<output bundle>"
ENTRY_POINTS=(
    "src/background/serviceWorker.ts:background.js"
    "src/content/interceptor.ts:interceptor.js"
    "src/content/bridge.ts:bridge.js"
    "src/content/portal_page_fetch.ts:portal_page_fetch.js"
    "src/content/portal_fetch.ts:portal_fetch.js"
    "src/popup/popup.ts:popup.js"
    "src/options/options.ts:options.js"
)

for entry in "${ENTRY_POINTS[@]}"; do
    source_file="${entry%%:*}"
    bundle_name="${entry##*:}"
    npx esbuild "$source_file" --bundle --outfile="$DIST_DIR/$bundle_name" --format=iife --platform=browser \
        || { echo "Error: Failed to build $bundle_name" >&2; exit 1; }
    echo "Bundled $source_file -> $DIST_DIR/$bundle_name"
done

if compgen -G "src/icons/*.png" > /dev/null; then
    cp src/icons/*.png "$DIST_DIR/icons/"
else
    echo 'Warning: No icon files found in src/icons/' >&2
fi
cp src/popup/popup.html "$DIST_DIR/popup.html" || echo 'Warning: popup.html not found' >&2
cp src/options/options.html "$DIST_DIR/options.html" || echo 'Warning: options.html not found' >&2

echo "Validating HTML references bundled JS..."
for html_file in popup.html options.html; do
  if [ -f "$DIST_DIR/$html_file" ] && grep -q '\.ts"' "$DIST_DIR/$html_file"; then
    echo "Error: $html_file references .ts files, must reference .js bundles only" >&2
    exit 1
  fi
done

echo "HTML validation passed - no TypeScript source references found"

echo "Build complete!"
