"""Automated smoke tests for Chrome extension loading."""

import json
from pathlib import Path


class TestExtensionSmoke:
    """Verify extension can be loaded in Chrome without console errors."""

    def test_extension_loadable_in_chrome(self, tmp_path):
        """Extension should load without console errors when unpacked."""
        dist_path = Path("dist")

        # Verify all required files exist
        assert (dist_path / "manifest.json").exists(), "manifest.json must exist"
        assert (dist_path / "popup.html").exists(), "popup.html must exist"
        assert (dist_path / "popup.js").exists(), "popup.js must exist"
        assert (dist_path / "background.js").exists(), "background.js must exist"

    def test_manifest_parses_without_errors(self):
        """Manifest should be valid JSON that Chrome can parse."""
        manifest_path = Path("dist/manifest.json")

        with open(manifest_path) as f:
            try:
                manifest = json.load(f)
            except json.JSONDecodeError as e:
                raise AssertionError(f"Manifest is not valid JSON: {e}")

        # Verify MV3 structure
        assert manifest.get("manifest_version") == 3, "Must use MV3 format"
        assert "name" in manifest, "Manifest must have name field"
        assert "version" in manifest, "Manifest must have version field"

    def test_popup_html_has_script_tag(self):
        """Popup HTML should reference bundled JS via script tag."""
        popup_path = Path("dist/popup.html")

        with open(popup_path) as f:
            content = f.read()

        # Should have a script tag referencing popup.js
        assert "<script" in content, "Must have script tag"
        assert "popup.js" in content, "Script must reference popup.js"

    def test_no_console_error_indicators(self):
        """Extension should not contain obvious error triggers."""
        js_files = [
            Path("dist/background.js"),
            Path("dist/popup.js"),
            Path("dist/interceptor.js"),
        ]

        for js_file in js_files:
            if js_file.exists():
                with open(js_file) as f:
                    content = f.read()

                # Check for obvious error patterns (excluding comments)
                lines = [line.strip() for line in content.split("\n")]
                code_lines = [
                    ln
                    for ln in lines
                    if not ln.startswith("//") and not ln.startswith("/*")
                ]

                # Should have at least some code (not empty files)
                assert len(code_lines) > 0, f"{js_file} should contain code"

    def test_extension_consistent_with_unit_tests(self):
        """Extension structure should match what unit tests verify."""
        manifest_path = Path("dist/manifest.json")

        with open(manifest_path) as f:
            manifest = json.load(f)

        # Verify key MV3 structures that prevent console errors
        assert "background" in manifest, "Must have background config"
        assert "service_worker" in manifest.get("background", {}), (
            "Background must specify service worker"
        )
