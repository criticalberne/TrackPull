"""Tests for verifying Chrome extension loadability."""

import json
from pathlib import Path


class TestChromeLoad:
    """Verify extension can be loaded in Chrome without errors."""

    def test_dist_directory_exists(self):
        """dist/ directory must exist as build output location."""
        dist_path = Path("dist")
        assert dist_path.exists(), "dist/ directory must exist"
        assert dist_path.is_dir(), "dist/ must be a directory"

    def test_manifest_json_exists_and_valid(self):
        """manifest.json must exist and be valid MV3 format."""
        manifest_path = Path("dist/manifest.json")
        assert manifest_path.exists(), "dist/manifest.json must exist"

        with open(manifest_path) as f:
            manifest = json.load(f)

        assert manifest.get("manifest_version") == 3, "Must use MV3"
        assert "name" in manifest, "Manifest must have name"
        assert "version" in manifest, "Manifest must have version"

    def test_manifest_references_compiled_js_not_ts(self):
        """Manifest JS paths must not reference .ts files."""
        manifest_path = Path("dist/manifest.json")

        with open(manifest_path) as f:
            content = f.read()

        assert ".ts" not in content, "Manifest must not reference TypeScript sources"
        assert ".js" in content, "Manifest must reference JavaScript files"

    def test_service_worker_points_to_compiled_js(self):
        """background.service_worker must point to .js file."""
        manifest_path = Path("dist/manifest.json")

        with open(manifest_path) as f:
            manifest = json.load(f)

        service_worker = manifest.get("background", {}).get("service_worker", "")
        assert service_worker.endswith(".js"), "Service worker must be .js file"
        assert not service_worker.endswith(".ts"), "Must not use .ts extension"

    def test_content_scripts_point_to_compiled_js(self):
        """Content script paths must point to .js files."""
        manifest_path = Path("dist/manifest.json")

        with open(manifest_path) as f:
            manifest = json.load(f)

        for cs in manifest.get("content_scripts", []):
            for js_file in cs.get("js", []):
                assert js_file.endswith(".js"), "Content script must be .js"

    def test_all_required_files_exist(self):
        """All required extension files must exist."""
        required_files = [
            "dist/manifest.json",
            "dist/background.js",
            "dist/interceptor.js",
            "dist/popup.html",
            "dist/popup.js",
            "dist/icons/icon16.png",
            "dist/icons/icon48.png",
            "dist/icons/icon128.png",
        ]

        for file_path in required_files:
            assert Path(file_path).exists(), f"{file_path} must exist"

    def test_no_ts_sources_in_dist(self):
        """dist/ should not contain TypeScript source files."""
        dist_path = Path("dist")

        ts_files = list(dist_path.rglob("*.ts"))
        assert len(ts_files) == 0, f"No .ts files allowed in dist/, found: {ts_files}"

    def test_no_ts_imports_in_js_content(self):
        """JS bundles should not import TypeScript source files."""
        js_files = ["dist/background.js", "dist/interceptor.js", "dist/popup.js"]

        for js_file in js_files:
            with open(js_file) as f:
                content = f.read()
            lines = [line.strip() for line in content.split("\n")]
            ts_imports = [
                ln for ln in lines if ".ts" in ln and ("import" in ln or "from" in ln)
            ]
            assert len(ts_imports) == 0, (
                f"{js_file} should not import .ts files. Found: {ts_imports}"
            )

    def test_popup_html_references_js_not_ts(self):
        """popup.html must reference bundled JS (not TS source)."""
        popup_path = Path("dist/popup.html")

        with open(popup_path) as f:
            content = f.read()

        assert ".js" in content, "Must reference JavaScript bundles"
        assert ".ts" not in content, "Must not reference TypeScript source files"
        assert 'src="./popup.js"' in content or "src='./popup.js'" in content, (
            "Must reference popup.js bundle specifically"
        )

    def test_manifest_valid_json(self):
        """manifest.json must be valid JSON with correct structure."""
        manifest_path = Path("dist/manifest.json")

        with open(manifest_path) as f:
            try:
                manifest = json.load(f)
            except json.JSONDecodeError as e:
                assert False, f"manifest.json is not valid JSON: {e}"

        required_keys = ["manifest_version", "name", "version"]
        for key in required_keys:
            assert key in manifest, f"Manifest must have '{key}' field"

    def test_host_permissions_configured(self):
        """Must have host permissions for Trackman domain."""
        manifest_path = Path("dist/manifest.json")

        with open(manifest_path) as f:
            manifest = json.load(f)

        host_perms = manifest.get("host_permissions", [])
        assert len(host_perms) > 0, "Must have host_permissions configured"
        assert any("trackmangolf" in perm.lower() for perm in host_perms), (
            "Must have Trackman domain permissions"
        )
