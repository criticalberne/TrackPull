#!/bin/bash
# Build production zip for Chrome extension distribution

set -e

ZIP_FILE="production.zip"
DIST_DIR="dist"

echo "Creating production zip: $ZIP_FILE..."

if [ ! -d "$DIST_DIR" ]; then
    echo "Error: dist/ directory not found. Run build-extension.sh first." >&2
    exit 1
fi

cd dist

rm -f "../$ZIP_FILE"

zip -r "../$ZIP_FILE" .

echo "Production zip created: ../$ZIP_FILE"
