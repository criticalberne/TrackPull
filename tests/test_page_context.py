"""Tests for content scripts running in page context (main world)."""

import json
from pathlib import Path


class TestPageContextConfiguration:
    """Verify content scripts run in page context (MAIN world)."""

    def test_content_script_runs_in_main_world(self):
        """Content script must specify world: MAIN to access page JS."""
        manifest_path = Path("src/manifest.json")

        with open(manifest_path) as f:
            manifest = json.load(f)

        content_scripts = manifest.get("content_scripts", [])
        assert len(content_scripts) > 0, "Must have at least one content script"

        for cs in content_scripts:
            assert "world" in cs, (
                "Content scripts must specify 'world' property to run in page context"
            )
            assert cs["world"] == "MAIN", (
                "Content scripts must run in MAIN world to access page JavaScript variables"
            )

    def test_dist_manifest_has_main_world(self):
        """dist/manifest.json must also specify world: MAIN."""
        dist_path = Path("dist/manifest.json")

        with open(dist_path) as f:
            manifest = json.load(f)

        content_scripts = manifest.get("content_scripts", [])

        for cs in content_scripts:
            assert "world" in cs, "dist manifest must specify 'world' property"
            assert cs["world"] == "MAIN", (
                "dist manifest must run content scripts in MAIN world"
            )

    def test_src_and_dist_manifests_match_on_world(self):
        """src and dist manifests must both have world: MAIN."""
        src_path = Path("src/manifest.json")
        dist_path = Path("dist/manifest.json")

        with open(src_path) as f:
            src_manifest = json.load(f)

        with open(dist_path) as f:
            dist_manifest = json.load(f)

        src_worlds = set()
        for cs in src_manifest.get("content_scripts", []):
            src_worlds.add(cs.get("world"))

        dist_worlds = set()
        for cs in dist_manifest.get("content_scripts", []):
            dist_worlds.add(cs.get("world"))

        assert src_worlds == dist_worlds, (
            "src and dist manifests must have same world configuration"
        )
        assert "MAIN" in src_worlds, (
            "Both manifests must specify MAIN world for page context access"
        )

    def test_run_at_document_idle(self):
        """Content script should run at document_idle for optimal timing."""
        manifest_path = Path("src/manifest.json")

        with open(manifest_path) as f:
            manifest = json.load(f)

        content_scripts = manifest.get("content_scripts", [])

        for cs in content_scripts:
            assert "run_at" in cs, "Content scripts should specify 'run_at' timing"
            assert cs["run_at"] == "document_idle", (
                "Content scripts should run at document_idle after DOM is ready"
            )

    def test_all_frames_false_for_report_pages(self):
        """all_frames should be false for report pages to avoid frame injection."""
        manifest_path = Path("src/manifest.json")

        with open(manifest_path) as f:
            manifest = json.load(f)

        content_scripts = manifest.get("content_scripts", [])

        for cs in content_scripts:
            assert "all_frames" in cs, (
                "Content scripts should specify 'all_frames' explicitly"
            )
            assert cs["all_frames"] is False, (
                "Report page interceptors should not run in subframes"
            )
