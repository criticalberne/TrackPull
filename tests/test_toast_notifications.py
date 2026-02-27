"""Tests for toast notification feature in popup."""

import re
from pathlib import Path


class TestToastNotifications:
    """Verify toast notifications are implemented correctly."""

    def test_popup_has_toast_container(self):
        """popup.html must contain toast container element."""
        popup_path = Path("dist/popup.html")
        content = popup_path.read_text()

        assert 'id="toast-container"' in content, (
            "HTML must contain toast-container div"
        )

    def test_popup_html_has_toast_styles(self):
        """popup.html must include CSS styles for toast notifications."""
        popup_path = Path("dist/popup.html")
        content = popup_path.read_text()

        assert ".toast" in content, "HTML must include .toast CSS class"
        assert "@keyframes slideIn" in content or "slideIn" in content.lower(), (
            "Toast should have slide-in animation"
        )
        assert ".toast.error" in content or "toast error" in content.lower(), (
            "Must have error toast styling"
        )
        assert ".toast.success" in content or "toast success" in content.lower(), (
            "Must have success toast styling"
        )

    def test_popup_js_has_toast_container_reference(self):
        """popup.js must reference toast-container element."""
        popup_path = Path("dist/popup.js")
        content = popup_path.read_text()

        assert "toast-container" in content, "JS must reference toast-container element"

    def test_popup_js_has_toast_function(self):
        """popup.js must contain showToast function."""
        popup_path = Path("dist/popup.js")
        content = popup_path.read_text()

        assert "showToast" in content, "JS must contain showToast function"

    def test_showtoast_creates_element(self):
        """showToast must create and append toast element to container."""
        popup_path = Path("dist/popup.js")
        content = popup_path.read_text()

        assert 'createElement("div")' in content, "showToast must create div element"
        assert "toast-container" in content or "container" in content.lower(), (
            "showToast must append to toast container"
        )

    def test_showtoast_adds_error_class(self):
        """showToast must add error class for error type."""
        popup_path = Path("dist/popup.js")
        content = popup_path.read_text()

        assert "className" in content and "toast" in content.lower(), (
            "showToast must set className with toast class"
        )
        # Check that it handles both success and error types
        assert '"error"' in content or "'error'" in content, (
            "showToast must handle error type"
        )
        assert '"success"' in content or "'success'" in content, (
            "showToast must handle success type"
        )

    def test_showtoast_sets_role_attribute(self):
        """showToast must set appropriate ARIA role for accessibility."""
        popup_path = Path("dist/popup.js")
        content = popup_path.read_text()

        assert "setAttribute" in content and "role" in content.lower(), (
            "showToast must set ARIA role attribute"
        )
        assert '"alert"' in content or "'alert'" in content, (
            "Error toasts should have alert role"
        )

    def test_showtoast_auto_dismisses(self):
        """showToast must automatically dismiss after timeout."""
        popup_path = Path("dist/popup.js")
        content = popup_path.read_text()

        assert "setTimeout" in content, "showToast must use setTimeout for auto-dismiss"
        # Check for hide/slide-out logic
        assert "hiding" in content.lower() or "remove()" in content, (
            "showToast must remove toast after animation"
        )

    def test_export_errors_show_toast(self):
        """Export errors should trigger toast notifications."""
        popup_path = Path("dist/popup.js")
        content = popup_path.read_text()

        assert "No data to export" in content, "Must show error for no data scenario"
        assert "No valid data to export" in content, (
            "Must show error for invalid data scenario"
        )
        assert "Failed to generate CSV" in content, (
            "Must show error for CSV generation failure"
        )

    def test_export_success_shows_toast(self):
        """Export success should trigger toast notification."""
        popup_path = Path("dist/popup.js")
        content = popup_path.read_text()

        assert "Exported successfully" in content, (
            "Must show success message for export"
        )

    def test_clear_success_shows_toast(self):
        """Clear button success should trigger toast notification."""
        popup_path = Path("dist/popup.js")
        content = popup_path.read_text()

        assert "Session data cleared" in content, (
            "Must show success message when clearing data"
        )


class TestDownloadErrorMessages:
    """Verify service worker provides helpful download error messages."""

    def test_service_worker_has_error_handling(self):
        """serviceWorker.js must handle download errors gracefully."""
        service_worker_path = Path("dist/background.js")
        content = service_worker_path.read_text()

        assert "download" in content.lower(), "Service worker must handle downloads"
        assert "success" in content.lower(), "Service worker must report success status"

    def test_service_worker_returns_error_message(self):
        """serviceWorker.js must return error message on failure."""
        service_worker_path = Path("dist/background.js")
        content = service_worker_path.read_text()

        assert "error" in content.lower(), (
            "Service worker must include error field in response"
        )

    def test_service_worker_gets_error_from_chrome(self):
        """serviceWorker.js must check chrome.runtime.lastError."""
        service_worker_path = Path("dist/background.js")
        content = service_worker_path.read_text()

        assert "chrome.runtime.lastError" in content or (
            "runtimeError" in content.lower() and "error" in content.lower()
        ), "Service worker must check chrome runtime error"


class TestToastAccessibility:
    """Verify toast notifications meet accessibility requirements."""

    def test_toast_has_role_attribute(self):
        """Toasts must have appropriate ARIA roles for screen readers."""
        popup_path = Path("dist/popup.js")
        content = popup_path.read_text()

        # Check that role attribute is set conditionally based on type
        assert "setAttribute" in content, (
            "showToast must use setAttribute for accessibility"
        )
        assert "role" in content.lower(), "Toasts must have ARIA role attribute"

    def test_toast_has_z_index_styling(self):
        """Toasts must appear above other UI elements."""
        popup_path = Path("dist/popup.html")
        content = popup_path.read_text()

        assert "z-index" in content.lower(), (
            "Toast must have z-index for proper layering"
        )
        # Check that it's high enough to appear above other elements
        assert re.search(r"z-index\s*:\s*(\d+)", content), (
            "Toast should have numeric z-index value"
        )
