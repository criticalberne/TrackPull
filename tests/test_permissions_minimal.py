"""Tests for verifying minimal permission set in manifest."""

import json
from pathlib import Path


class TestPermissionsMinimal:
    """Verify minimal permissions (storage, downloads) are configured."""

    def test_source_manifest_has_storage_permission(self):
        """Source manifest must include storage permission."""
        manifest_path = Path("src/manifest.json")

        with open(manifest_path) as f:
            manifest = json.load(f)

        assert "storage" in manifest.get("permissions", []), (
            "Storage permission required for extension data persistence"
        )

    def test_source_manifest_has_downloads_permission(self):
        """Source manifest must include downloads permission."""
        manifest_path = Path("src/manifest.json")

        with open(manifest_path) as f:
            manifest = json.load(f)

        assert "downloads" in manifest.get("permissions", []), (
            "Downloads permission required for CSV export functionality"
        )

    def test_dist_manifest_has_storage_permission(self):
        """Dist manifest must include storage permission."""
        manifest_path = Path("dist/manifest.json")

        with open(manifest_path) as f:
            manifest = json.load(f)

        assert "storage" in manifest.get("permissions", []), (
            "Storage permission required for extension data persistence"
        )

    def test_dist_manifest_has_downloads_permission(self):
        """Dist manifest must include downloads permission."""
        manifest_path = Path("dist/manifest.json")

        with open(manifest_path) as f:
            manifest = json.load(f)

        assert "downloads" in manifest.get("permissions", []), (
            "Downloads permission required for CSV export functionality"
        )

    def test_permissions_are_minimal(self):
        """Permissions must be minimal - only storage and downloads."""
        manifest_path = Path("src/manifest.json")

        with open(manifest_path) as f:
            manifest = json.load(f)

        allowed_permissions = {"storage", "downloads"}
        actual_permissions = set(manifest.get("permissions", []))

        assert actual_permissions == allowed_permissions, (
            f"Only minimal permissions allowed. Expected {allowed_permissions}, got {actual_permissions}"
        )

    def test_dist_permissions_match_source(self):
        """Dist manifest permissions must match source manifest."""
        source_path = Path("src/manifest.json")
        dist_path = Path("dist/manifest.json")

        with open(source_path) as f:
            source_manifest = json.load(f)

        with open(dist_path) as f:
            dist_manifest = json.load(f)

        assert set(source_manifest.get("permissions", [])) == set(
            dist_manifest.get("permissions", [])
        ), "Source and dist manifests must have identical permissions"
