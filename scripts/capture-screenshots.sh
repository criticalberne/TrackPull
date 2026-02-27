#!/bin/bash
# Capture screenshots of the Chrome extension for release documentation
# Generates visual assets showing the extension popup interface

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SCREENSHOT_DIR="$PROJECT_ROOT/screenshots"
DIST_DIR="$PROJECT_ROOT/dist"

cd "$PROJECT_ROOT"

echo "Capturing extension screenshots..."

if [ ! -d "$DIST_DIR" ]; then
    echo "Error: dist/ directory not found. Run build-extension.sh first." >&2
    exit 1
fi

mkdir -p "$SCREENSHOT_DIR"

echo "Opening popup in browser for screenshot capture..."
agent-browser open "file://$PROJECT_ROOT/dist/popup.html"

sleep 2

agent-browser screenshot "$SCREENSHOT_DIR/extension-popup.png"

echo "Screenshots captured: $SCREENSHOT_DIR/"
ls -la "$SCREENSHOT_DIR/"

