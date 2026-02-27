"""Tests for screenshot capture script."""

import os
from pathlib import Path


class TestScreenshotCapture:
    """Verify screenshot generation for release documentation."""

    def test_screenshot_script_exists(self):
        """capture-screenshots.sh must exist in scripts directory."""
        script_path = Path("scripts/capture-screenshots.sh")
        assert script_path.exists(), "capture-screenshots.sh must exist"

    def test_screenshot_script_is_executable(self):
        """capture-screenshots.sh must have execute permissions."""
        script_path = Path("scripts/capture-screenshots.sh")

        if script_path.exists():
            assert os.access(script_path, os.X_OK), (
                "capture-screenshots.sh must be executable"
            )

    def test_screenshot_script_references_dist(self):
        """Screenshot script should reference dist directory."""
        script_path = Path("scripts/capture-screenshots.sh")

        with open(script_path) as f:
            content = f.read()

        assert "dist/" in content or "DIST_DIR" in content, (
            "Script must reference dist directory"
        )

    def test_screenshot_script_uses_agent_browser(self):
        """Screenshot script should use agent-browser CLI."""
        script_path = Path("scripts/capture-screenshots.sh")

        with open(script_path) as f:
            content = f.read()

        assert "agent-browser" in content, (
            "Script must use agent-browser CLI for screenshot capture"
        )

    def test_screenshot_script_has_proper_error_handling(self):
        """Screenshot script should verify dist directory exists."""
        script_path = Path("scripts/capture-screenshots.sh")

        with open(script_path) as f:
            content = f.read()

        assert "dist/" in content, "Script must check for dist/ directory"
        assert "Error:" in content or "exit 1" in content, (
            "Script should have error handling"
        )

    def test_screenshot_script_creates_output_directory(self):
        """Screenshot script should create screenshots directory."""
        script_path = Path("scripts/capture-screenshots.sh")

        with open(script_path) as f:
            content = f.read()

        assert "screenshots" in content or "SCREENSHOT_DIR" in content, (
            "Script must define screenshot output directory"
        )

    def test_screenshot_script_captures_popup(self):
        """Screenshot script should capture popup.html."""
        script_path = Path("scripts/capture-screenshots.sh")

        with open(script_path) as f:
            content = f.read()

        assert "popup" in content.lower(), (
            "Script should capture extension popup screenshot"
        )
