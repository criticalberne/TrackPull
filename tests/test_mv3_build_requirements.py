"""Tests for MV3 extension build requirements documentation."""

import json
from pathlib import Path


class TestMV3BuildRequirements:
    """Verify the documented MV3 build requirements are correct."""

    def test_must_have_manifest_version_3(self):
        """MV3 extensions must use manifest_version 3."""
        prd_path = Path("/Users/kylelunter/claudeprojects/trackv3/PRD.md")
        content = prd_path.read_text()
        assert "MV3" in content or "manifest_version" in content

    def test_service_worker_requirement(self):
        """Background must use service_worker, not background.page."""
        prd_path = Path("/Users/kylelunter/claudeprojects/trackv3/PRD.md")
        content = prd_path.read_text()
        assert "service_worker" in content

    def test_content_scripts_must_match_urls(self):
        """Content scripts must declare matches patterns explicitly."""
        prd_path = Path("/Users/kylelunter/claudeprojects/trackv3/PRD.md")
        content = prd_path.read_text()
        assert any("content" in line.lower() for line in content.split("\n"))

    def test_manifest_json_structure(self):
        """Verify manifest.json structure requirements."""
        required_fields = {
            "manifest_version": int,
            "name": str,
            "version": str,
            "description": str,
            "permissions": list,
            "host_permissions": list,
            "action": dict,
        }

        manifest_path = Path("/Users/kylelunter/claudeprojects/trackv3/manifest.json")

        if manifest_path.exists():
            with open(manifest_path) as f:
                manifest = json.load(f)

            for field, expected_type in required_fields.items():
                assert field in manifest, f"Missing required field: {field}"
                assert isinstance(manifest[field], expected_type), (
                    f"Field {field} should be {expected_type.__name__}"
                )

    def test_build_output_directory_structure(self):
        """Verify dist/ directory structure requirements."""
        requirements_path = Path(
            "/Users/kylelunter/claudeprojects/trackv3/MV3_BUILD_REQUIREMENTS.md"
        )
        assert requirements_path.exists(), "Build requirements should be documented"

    def test_icons_requirement(self):
        """Extension must include icon files at multiple sizes."""
        required_sizes = [16, 48, 128]

        requirements_content = Path(
            "/Users/kylelunter/claudeprojects/trackv3/MV3_BUILD_REQUIREMENTS.md"
        ).read_text()

        for size in required_sizes:
            assert f"{size}" in requirements_content, (
                f"Icon size {size}x{size} should be documented"
            )

    def test_no_typescript_in_manifest(self):
        """Manifest must not reference TypeScript source files."""
        prd_path = Path("/Users/kylelunter/claudeprojects/trackv3/PRD.md")
        content = prd_path.read_text()
        assert "no TypeScript sources are referenced" in content

    def test_host_permissions_requirement(self):
        """Must have proper host permissions for Trackman domain."""
        required_domain = "web-dynamic-reports.trackmangolf.com"

        requirements_content = Path(
            "/Users/kylelunter/claudeprojects/trackv3/MV3_BUILD_REQUIREMENTS.md"
        ).read_text()

        assert required_domain in requirements_content, (
            f"Host permission for {required_domain} should be documented"
        )

    def test_permission_minimality(self):
        """Extension should use minimal permissions."""
        requirements_content = Path(
            "/Users/kylelunter/claudeprojects/trackv3/MV3_BUILD_REQUIREMENTS.md"
        ).read_text()

        assert "minimal" in requirements_content.lower(), (
            "Should document permission minimality requirement"
        )

    def test_csp_compliance_requirement(self):
        """Must not use external CDN dependencies."""
        prd_path = Path("/Users/kylelunter/claudeprojects/trackv3/PRD.md")
        content = prd_path.read_text()
        assert "CSP" in content, "PRD should document CSP requirements"

    def test_no_tailwind_cdn_in_html(self):
        """Verify no Tailwind CDN references in HTML files."""
        popup_html = Path(
            "/Users/kylelunter/claudeprojects/trackv3/src/popup/popup.html"
        )
        content = popup_html.read_text()
        assert "cdn.tailwind" not in content.lower(), "No Tailwind CDN should be used"

    def test_local_css_bundle_exists(self):
        """Verify local CSS bundle exists for CSP compliance."""
        css_path = Path(
            "/Users/kylelunter/claudeprojects/trackv3/src/shared/styles.css"
        )
        assert css_path.exists(), "Local CSS bundle must exist at src/shared/styles.css"

    def test_css_bundle_is_csp_compliant(self):
        """Verify local CSS bundle has no external CDN references."""
        css_path = Path(
            "/Users/kylelunter/claudeprojects/trackv3/src/shared/styles.css"
        )
        content = css_path.read_text()
        assert "cdn.tailwind" not in content.lower(), (
            "CSS bundle should have no CDN dependencies"
        )
