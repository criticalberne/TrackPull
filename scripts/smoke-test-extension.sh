#!/bin/bash
# Manual smoke test: Verify Chrome extension loads without console errors

set -e

DIST_DIR="dist"
EXTENSION_PATH="$(cd "$DIST_DIR" && pwd)"

echo "=== Trackman Scraper Extension Smoke Test ==="
echo ""
echo "Extension path: $EXTENSION_PATH"
echo ""
echo "Instructions:"
echo "1. Open Chrome and go to chrome://extensions/"
echo "2. Enable 'Developer mode' (toggle in top right)"
echo "3. Click 'Load unpacked'"
echo "4. Select the directory: $EXTENSION_PATH"
echo "5. Check the console for any errors:"
echo "   - Right-click anywhere on the extension card"
echo "   - Select 'Inspect' to open DevTools"
echo "   - Look at the Console tab for errors"
echo ""
echo "Expected result: No console errors, extension loads successfully"
echo ""

# Verify dist directory exists
if [ ! -d "$DIST_DIR" ]; then
    echo "ERROR: dist/ directory not found. Run 'bash scripts/build-extension.sh' first."
    exit 1
fi

# List what will be loaded
echo "Files that will be loaded:"
ls -la "$DIST_DIR"/manifest.json "$DIST_DIR/popup.html" "$DIST_DIR/popup.js" "$DIST_DIR/background.js" 2>/dev/null || true
echo ""

echo "Ready to load extension in Chrome."
