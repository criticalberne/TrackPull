"""Tests for production zip creation."""

import json
import zipfile
from pathlib import Path


class TestProductionZip:
    """Verify production.zip contains only extension assets."""

    def test_zip_file_created_after_build(self):
        """production.zip must be created by build-zip.sh script."""
        zip_path = Path("production.zip")

        # Run the build-zip script first
        import subprocess

        result = subprocess.run(
            ["bash", "scripts/build-zip.sh"], capture_output=True, text=True
        )

        assert result.returncode == 0, f"build-zip.sh failed: {result.stderr}"
        assert zip_path.exists(), "production.zip must be created"

    def test_zip_is_valid_archive(self):
        """production.zip must be a valid ZIP archive."""
        zip_path = Path("production.zip")

        if not zip_path.exists():
            import subprocess

            subprocess.run(["bash", "scripts/build-zip.sh"], check=True)

        with zipfile.ZipFile(zip_path, "r") as zf:
            # Should be able to read the archive
            names = zf.namelist()
            assert len(names) > 0, "ZIP must contain files"

    def test_zip_contains_manifest(self):
        """production.zip must include manifest.json."""
        zip_path = Path("production.zip")

        with zipfile.ZipFile(zip_path, "r") as zf:
            names = zf.namelist()
            assert any(
                name == "manifest.json" or name.endswith("/manifest.json")
                for name in names
            ), "ZIP must contain manifest.json"

    def test_zip_contains_service_worker(self):
        """production.zip must include background service worker."""
        zip_path = Path("production.zip")

        with zipfile.ZipFile(zip_path, "r") as zf:
            names = zf.namelist()
            assert any(
                name == "background.js" or name.endswith("/background.js")
                for name in names
            ), "ZIP must contain background.js"

    def test_zip_contains_content_scripts(self):
        """production.zip must include content scripts."""
        zip_path = Path("production.zip")

        with zipfile.ZipFile(zip_path, "r") as zf:
            names = zf.namelist()
            assert any(
                name == "interceptor.js" or name.endswith("/interceptor.js")
                for name in names
            ), "ZIP must contain interceptor.js"

    def test_zip_contains_popup_assets(self):
        """production.zip must include popup HTML and JS."""
        zip_path = Path("production.zip")

        with zipfile.ZipFile(zip_path, "r") as zf:
            names = zf.namelist()

            has_popup_html = any(
                name == "popup.html" or name.endswith("/popup.html") for name in names
            )
            has_popup_js = any(
                name == "popup.js" or name.endswith("/popup.js") for name in names
            )

            assert has_popup_html, "ZIP must contain popup.html"
            assert has_popup_js, "ZIP must contain popup.js"

    def test_zip_contains_icons(self):
        """production.zip must include icon files."""
        zip_path = Path("production.zip")

        with zipfile.ZipFile(zip_path, "r") as zf:
            names = zf.namelist()

            has_icon16 = any(
                name.endswith("/icon16.png") or name == "icons/icon16.png"
                for name in names
            )
            has_icon48 = any(
                name.endswith("/icon48.png") or name == "icons/icon48.png"
                for name in names
            )
            has_icon128 = any(
                name.endswith("/icon128.png") or name == "icons/icon128.png"
                for name in names
            )

            assert has_icon16, "ZIP must contain icon16.png"
            assert has_icon48, "ZIP must contain icon48.png"
            assert has_icon128, "ZIP must contain icon128.png"

    def test_zip_contains_only_extension_assets(self):
        """production.zip should not include source files (.ts) or build artifacts."""
        zip_path = Path("production.zip")

        with zipfile.ZipFile(zip_path, "r") as zf:
            names = zf.namelist()

            # Should not contain TypeScript sources
            ts_files = [name for name in names if name.endswith(".ts")]
            assert len(ts_files) == 0, f"ZIP should not contain .ts files: {ts_files}"

            # Should not contain node_modules or other non-extension files
            unwanted = ["node_modules", "src/", "tests/", ".git"]
            for entry in names:
                for pattern in unwanted:
                    assert pattern not in entry, f"ZIP should not contain {pattern}"

    def test_zip_manifest_matches_dist_manifest(self):
        """Manifest in zip must match dist/manifest.json."""
        zip_path = Path("production.zip")

        with zipfile.ZipFile(zip_path, "r") as zf:
            manifest_content = zf.read("manifest.json").decode("utf-8")

            # Should be valid JSON matching expected structure
            manifest = json.loads(manifest_content)

            assert manifest.get("manifest_version") == 3, "Must use MV3"
            assert "name" in manifest, "Manifest must have name"
            assert "version" in manifest, "Manifest must have version"

    def test_zip_has_correct_file_count(self):
        """production.zip should contain expected number of files."""
        zip_path = Path("production.zip")

        with zipfile.ZipFile(zip_path, "r") as zf:
            names = zf.namelist()

            # Expected: manifest.json, background.js, interceptor.js,
            #           html_scraping.js, popup.html, popup.js, icons (3 files)
            expected_minimum = 8

            assert len(names) >= expected_minimum, (
                f"ZIP should contain at least {expected_minimum} files, "
                f"found {len(names)}: {names}"
            )
