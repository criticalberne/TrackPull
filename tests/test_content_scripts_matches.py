"""Tests for content scripts URL matching configuration."""

import json
from pathlib import Path


class TestContentScriptsMatches:
    """Verify content scripts have correct matches patterns."""

    def test_content_scripts_defined(self):
        """Manifest must define content_scripts section."""
        manifest_path = Path("src/manifest.json")
        
        assert manifest_path.exists(), "src/manifest.json must exist"
        
        with open(manifest_path) as f:
            manifest = json.load(f)
        
        assert "content_scripts" in manifest, (
            "Manifest must define content_scripts section"
        )

    def test_content_script_has_matches_pattern(self):
        """Content scripts must have matches URL patterns defined."""
        manifest_path = Path("src/manifest.json")
        
        with open(manifest_path) as f:
            manifest = json.load(f)
        
        content_scripts = manifest.get("content_scripts", [])
        assert len(content_scripts) > 0, "Must have at least one content script"
        
        for cs in content_scripts:
            assert "matches" in cs, (
                "Each content script must define matches pattern"
            )

    def test_trackman_domain_in_matches(self):
        """Matches must include Trackman domain URL pattern."""
        manifest_path = Path("src/manifest.json")
        
        with open(manifest_path) as f:
            manifest = json.load(f)
        
        content_scripts = manifest.get("content_scripts", [])
        
        for cs in content_scripts:
            matches = cs.get("matches", [])
            assert any(
                "web-dynamic-reports.trackmangolf.com" in match
                for match in matches
            ), (
                "Content scripts must include web-dynamic-reports.trackmangolf.com/* pattern"
            )

    def test_matches_pattern_wildcard(self):
        """Matches pattern should use wildcard for all paths on domain."""
        manifest_path = Path("src/manifest.json")
        
        with open(manifest_path) as f:
            manifest = json.load(f)
        
        content_scripts = manifest.get("content_scripts", [])
        
        for cs in content_scripts:
            matches = cs.get("matches", [])
            has_wildcard = any(
                match.endswith("/*")
                for match in matches
            )
            assert has_wildcard, (
                "Matches pattern should use /* wildcard to match all paths"
            )

    def test_dist_manifest_has_same_matches(self):
        """dist/manifest.json must have same matches as src/manifest.json."""
        src_path = Path("src/manifest.json")
        dist_path = Path("dist/manifest.json")
        
        assert src_path.exists(), "src/manifest.json must exist"
        assert dist_path.exists(), "dist/manifest.json must exist"
        
        with open(src_path) as f:
            src_manifest = json.load(f)
        
        with open(dist_path) as f:
            dist_manifest = json.load(f)
        
        src_matches = set()
        for cs in src_manifest.get("content_scripts", []):
            src_matches.update(cs.get("matches", []))
        
        dist_matches = set()
        for cs in dist_manifest.get("content_scripts", []):
            dist_matches.update(cs.get("matches", []))
        
        assert src_matches == dist_matches, (
            "dist/manifest.json matches must match src/manifest.json"
        )
