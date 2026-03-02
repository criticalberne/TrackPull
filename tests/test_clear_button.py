"""Tests for clear button feature in popup."""

from pathlib import Path


class TestClearButton:
    """Verify clear button exists and functions correctly."""

    def test_popup_html_has_clear_button(self):
        """popup.html must contain clear button element."""
        popup_path = Path("dist/popup.html")
        content = popup_path.read_text()

        assert 'id="clear-btn"' in content, "HTML must contain clear-btn button"
        assert "Clear Session Data" in content, (
            "Button text should be 'Clear Session Data'"
        )

    def test_popup_html_has_clear_button_styles(self):
        """popup.html must have inline styles for clear button."""
        popup_path = Path("dist/popup.html")
        content = popup_path.read_text()

        assert "#clear-btn" in content, "HTML must include #clear-btn CSS selector"
        assert "#clear-btn:hover" in content or "hover" in content.lower(), (
            "Clear button should have hover state styling"
        )
        assert "#clear-btn:disabled" in content, (
            "Clear button must have disabled state styling"
        )

    def test_popup_js_has_handle_clear_click_function(self):
        """popup.js must contain handleClearClick function."""
        popup_path = Path("dist/popup.js")
        content = popup_path.read_text()

        assert "handleClearClick" in content, (
            "JS must contain handleClearClick function"
        )

    def test_popup_js_clears_session_data(self):
        """popup.js must clear session data from storage."""
        popup_path = Path("dist/popup.js")
        content = popup_path.read_text()

        assert "storage.local.remove" in content or "chrome.storage" in content, (
            "JS must use chrome.storage to remove data"
        )
        assert "trackmanData" in content or "TRACKMAN_DATA" in content, (
            "JS must reference trackmanData storage key when clearing"
        )

    def test_popup_js_updates_ui_after_clear(self):
        """popup.js must update UI after clearing session data."""
        popup_path = Path("dist/popup.js")
        content = popup_path.read_text()

        assert "updateShotCount" in content, "JS must call updateShotCount after clear"
        assert "updateExportButtonVisibility" in content, (
            "JS must call updateExportButtonVisibility after clear"
        )

    def test_clear_button_disabled_during_operation(self):
        """Clear button should be disabled during data clearing operation."""
        popup_path = Path("dist/popup.js")
        content = popup_path.read_text()

        assert "clearBtn.disabled = true" in content, (
            "JS must disable clear button before clearing data"
        )
        assert (
            "clearBtn.disabled = false" in content or "disabled = false" in content
        ), "JS must re-enable clear button after operation completes"

    def test_status_message_shown_after_clear(self):
        """Status message should be shown after clearing data."""
        popup_path = Path("dist/popup.js")
        content = popup_path.read_text()

        assert "Session data cleared" in content or "cleared" in content.lower(), (
            "JS must show success message when data is cleared"
        )

    def test_clear_button_has_red_color(self):
        """Clear button should have red color to indicate destructive action."""
        popup_path = Path("dist/popup.html")
        content = popup_path.read_text()

        assert "#f44336" in content or "#d32f2f" in content, (
            "Clear button should use red color scheme (#f44336 or #d32f2f)"
        )
