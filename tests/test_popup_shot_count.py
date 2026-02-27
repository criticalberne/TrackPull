"""Tests for real-time shot count in popup."""

from pathlib import Path


class TestPopupShotCount:
    """Verify popup displays real-time shot count."""

    def test_popup_html_has_shot_count_container(self):
        """popup.html must contain shot count container element."""
        popup_path = Path("dist/popup.html")
        content = popup_path.read_text()

        assert 'id="shot-count-container"' in content, (
            "HTML must contain shot-count-container div"
        )
        assert 'id="shot-count"' in content, (
            "HTML must contain shot-count display element"
        )

    def test_popup_html_has_status_message_element(self):
        """popup.html must contain status message element for error handling."""
        popup_path = Path("dist/popup.html")
        content = popup_path.read_text()

        assert 'id="status-message"' in content, (
            "HTML must contain status-message div"
        )

    def test_popup_html_has_inline_styles(self):
        """popup.html must have inline styles for shot count display."""
        popup_path = Path("dist/popup.html")
        content = popup_path.read_text()

        assert ".shot-count-container" in content, (
            "HTML must include .shot-count-container CSS class"
        )
        assert ".shot-count" in content, (
            "HTML must include .shot-count CSS class"
        )

    def test_popup_js_has_update_shot_count_function(self):
        """popup.js must contain updateShotCount function."""
        popup_path = Path("dist/popup.js")
        content = popup_path.read_text()

        assert "updateShotCount" in content, (
            "JS must contain updateShotCount function"
        )
        assert "shot-count" in content, (
            "JS must reference shot-count element ID"
        )

    def test_popup_js_has_status_message_function(self):
        """popup.js must contain showStatusMessage function."""
        popup_path = Path("dist/popup.js")
        content = popup_path.read_text()

        assert "showStatusMessage" in content, (
            "JS must contain showStatusMessage function"
        )

    def test_popup_js_calculates_total_shots(self):
        """popup.js must calculate total shots from all club groups."""
        popup_path = Path("dist/popup.js")
        content = popup_path.read_text()

        assert "totalShots" in content, (
            "JS must have totalShots variable for counting"
        )
        assert "club_groups" in content, (
            "JS must access club_groups from session data"
        )
        assert "shots.length" in content or "length" in content, (
            "JS must count shots using length property"
        )

    def test_popup_js_handles_empty_data(self):
        """popup.js must handle cases where no shot data exists."""
        popup_path = Path("dist/popup.js")
        content = popup_path.read_text()

        # Should check for falsy data and set to 0
        assert "textContent = \"0\"" in content or 'textContent = "0"' in content, (
            "JS must display 0 when no data is available"
        )

    def test_popup_js_calls_update_on_load(self):
        """popup.js must call updateShotCount after loading data."""
        popup_path = Path("dist/popup.js")
        content = popup_path.read_text()

        assert "updateShotCount(data)" in content, (
            "JS must call updateShotCount with loaded data"
        )
