"""Tests for MV3 extension build output structure."""

import json
from pathlib import Path


class TestDistStructure:
    """Verify dist/ directory contains only compiled assets."""

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

    def test_icons_directory_exists(self):
        """icons/ subdirectory must exist within dist/."""
        icons_path = Path("dist/icons")
        assert icons_path.exists(), "dist/icons/ directory must exist"
        assert icons_path.is_dir(), "dist/icons/ must be a directory"

    def test_icon_files_exist(self):
        """Extension must include icon files at required sizes."""
        required_icons = [16, 48, 128]

        for size in required_icons:
            icon_path = Path(f"dist/icons/icon{size}.png")
            assert icon_path.exists(), f"Icon {size}x{size} must exist"

    def test_icons_copied_from_source(self):
        """Icons must be copied from src/icons to dist/icons by build pipeline."""
        source_dir = Path("src/icons")
        dest_dir = Path("dist/icons")

        for icon_file in source_dir.glob("*.png"):
            dest_icon = dest_dir / icon_file.name
            assert dest_icon.exists(), (
                f"Build must copy {icon_file.name} to dist/icons/"
            )
            assert dest_icon.stat().st_size > 0, (
                f"{icon_file.name} must not be empty after copying"
            )

    def test_all_required_icons_copied(self):
        """Build pipeline must copy all required icon sizes."""
        required_sizes = {16, 48, 128}
        found_sizes = set()

        for size in required_sizes:
            icon_path = Path(f"dist/icons/icon{size}.png")
            if icon_path.exists():
                found_sizes.add(size)

        assert found_sizes == required_sizes, (
            f"All icons must be copied. Missing: {required_sizes - found_sizes}"
        )

    def test_popup_html_exists(self):
        """popup.html must exist as extension popup interface."""
        popup_path = Path("dist/popup.html")
        assert popup_path.exists(), "dist/popup.html must exist"

    def test_popup_references_compiled_js(self):
        """popup.html must reference bundled JS (not TS source files)."""
        popup_path = Path("dist/popup.html")

        with open(popup_path) as f:
            content = f.read()

        assert ".js" in content, "Must reference JavaScript bundles"
        assert ".ts" not in content, "Must not reference TypeScript source files"
        assert 'src="./popup.js"' in content or "src='./popup.js'" in content, (
            "Must reference popup.js bundle specifically"
        )

    def test_no_source_files_in_dist(self):
        """dist/ should not contain source files (.ts, .tsx)."""
        dist_path = Path("dist")

        for ts_file in dist_path.rglob("*.ts"):
            assert False, f"Source file {ts_file} found in dist/"

    def test_host_permissions_configured(self):
        """Must have host permissions for Trackman domain."""
        manifest_path = Path("dist/manifest.json")

        with open(manifest_path) as f:
            manifest = json.load(f)

        host_perms = manifest.get("host_permissions", [])
        assert any("trackmangolf" in perm.lower() for perm in host_perms), (
            "Must have Trackman domain permissions"
        )

    def test_action_default_popup_points_to_html(self):
        """action.default_popup must point to built popup.html."""
        manifest_path = Path("dist/manifest.json")

        with open(manifest_path) as f:
            manifest = json.load(f)

        action = manifest.get("action", {})
        default_popup = action.get("default_popup", "")

        assert default_popup.endswith(".html"), (
            "action.default_popup must point to an HTML file"
        )
        assert Path(f"dist/{default_popup}").exists(), (
            f"popup.html referenced in manifest must exist at dist/{default_popup}"
        )

    def test_build_script_exists(self):
        """Build script should exist to produce dist/."""
        build_script_paths = [
            Path("scripts/build-extension.sh"),
            Path("package.json"),  # npm scripts alternative
        ]

        assert any(p.exists() for p in build_script_paths), (
            "Build script or package.json with build scripts must exist"
        )
