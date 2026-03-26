"""Tests for verifying permission configuration in manifest."""

import json
from pathlib import Path


class TestPermissionsManifest:
    """Verify permissions are correctly configured in manifest."""

    def test_source_manifest_has_required_permissions(self):
        """Source manifest must include storage, downloads, clipboardWrite."""
        manifest_path = Path("src/manifest.json")
        with open(manifest_path) as f:
            manifest = json.load(f)
        permissions = set(manifest.get("permissions", []))
        assert permissions == {"storage", "downloads", "clipboardWrite"}, (
            f"Expected {{storage, downloads, clipboardWrite}}, got {permissions}"
        )

    def test_source_manifest_host_permissions_unchanged(self):
        """host_permissions must only contain the report domain."""
        manifest_path = Path("src/manifest.json")
        with open(manifest_path) as f:
            manifest = json.load(f)
        host_perms = manifest.get("host_permissions", [])
        assert host_perms == ["https://web-dynamic-reports.trackmangolf.com/*"], (
            f"host_permissions must only contain report domain, got {host_perms}"
        )

    def test_source_manifest_has_optional_host_permissions(self):
        """optional_host_permissions must declare portal domains."""
        manifest_path = Path("src/manifest.json")
        with open(manifest_path) as f:
            manifest = json.load(f)
        optional = set(manifest.get("optional_host_permissions", []))
        expected = {"https://api.trackmangolf.com/*", "https://portal.trackmangolf.com/*"}
        assert optional == expected, (
            f"Expected optional_host_permissions {expected}, got {optional}"
        )

    def test_portal_domains_not_in_host_permissions(self):
        """Portal domains must NOT appear in host_permissions (would disable on update)."""
        manifest_path = Path("src/manifest.json")
        with open(manifest_path) as f:
            manifest = json.load(f)
        host_perms = manifest.get("host_permissions", [])
        for hp in host_perms:
            assert "api.trackmangolf.com" not in hp, (
                f"api.trackmangolf.com must not be in host_permissions: {hp}"
            )
            assert "portal.trackmangolf.com" not in hp, (
                f"portal.trackmangolf.com must not be in host_permissions: {hp}"
            )

    def test_dist_manifest_matches_source(self):
        """Dist manifest permissions must match source manifest."""
        source_path = Path("src/manifest.json")
        dist_path = Path("dist/manifest.json")
        with open(source_path) as f:
            source = json.load(f)
        with open(dist_path) as f:
            dist = json.load(f)
        assert set(source.get("permissions", [])) == set(dist.get("permissions", []))
        assert source.get("host_permissions") == dist.get("host_permissions")
        assert set(source.get("optional_host_permissions", [])) == set(
            dist.get("optional_host_permissions", [])
        )
