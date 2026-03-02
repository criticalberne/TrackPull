"""Tests for Trackman URL parsing functionality."""

import pytest
from trackman_scraper.url_builder import parse_trackman_url


class TestParseTrackmanUrl:
    """Test cases for URL parsing with r=, a=, ReportId= parameters."""

    def test_parses_r_parameter(self):
        """Test parsing URLs with ?r= parameter (report)."""
        url = "https://web-dynamic-reports.trackmangolf.com/reports?r=12345"
        result = parse_trackman_url(url)

        assert result["url_type"] == "report"
        assert result["id"] == "12345"
        assert result["params"]["r"] == ["12345"]

    def test_parses_a_parameter(self):
        """Test parsing URLs with ?a= parameter (activity)."""
        url = "https://web-dynamic-reports.trackmangolf.com/activities?a=67890"
        result = parse_trackman_url(url)

        assert result["url_type"] == "activity"
        assert result["id"] == "67890"
        assert result["params"]["a"] == ["67890"]

    def test_parses_ReportId_parameter(self):
        """Test parsing URLs with ?ReportId= parameter."""
        url = "https://web-dynamic-reports.trackmangolf.com/reports?ReportId=11223"
        result = parse_trackman_url(url)

        assert result["url_type"] == "report"
        assert result["id"] == "11223"
        assert result["params"]["ReportId"] == ["11223"]

    def test_preserves_base_url(self):
        """Test that base URL is correctly extracted."""
        url = "https://web-dynamic-reports.trackmangolf.com/reports?r=123"
        result = parse_trackman_url(url)

        assert result["base"] == "https://web-dynamic-reports.trackmangolf.com/reports"

    def test_preserves_scheme_and_domain(self):
        """Test that scheme and domain are preserved."""
        url = "http://localhost:3000/reports?r=456"
        result = parse_trackman_url(url)

        assert result["base"] == "http://localhost:3000/reports"

    def test_handles_multiple_params(self):
        """Test parsing URLs with multiple parameters."""
        url = "https://web-dynamic-reports.trackmangolf.com/reports?r=123&mp[]=Carry&mp[]=SpinRate"
        result = parse_trackman_url(url)

        assert result["id"] == "123"
        assert result["metric_order"] == ["Carry", "SpinRate"]

    def test_handles_empty_mp_array(self):
        """Test parsing URLs with empty mp[] array."""
        url = "https://web-dynamic-reports.trackmangolf.com/reports?r=123&mp[]"
        result = parse_trackman_url(url)

        assert result["id"] == "123"
        assert result["metric_order"] == []

    def test_handles_duplicate_metrics(self):
        """Test that duplicate metrics are deduplicated."""
        url = "https://web-dynamic-reports.trackmangolf.com/reports?r=123&mp[]=Carry&mp[]=SpinRate&mp[]=Carry"
        result = parse_trackman_url(url)

        assert len(result["metric_order"]) == 2
        assert result["metric_order"] == ["Carry", "SpinRate"]

    def test_maintains_metric_order(self):
        """Test that metric order is preserved."""
        url = "https://web-dynamic-reports.trackmangolf.com/reports?r=123&mp[]=SpinRate&mp[]=Carry"
        result = parse_trackman_url(url)

        assert result["metric_order"] == ["SpinRate", "Carry"]

    def test_raises_error_without_required_params(self):
        """Test that URLs without required parameters raise ValueError."""
        url = "https://web-dynamic-reports.trackmangolf.com/reports"

        with pytest.raises(
            ValueError,
            match=r"URL must contain an \?a=, \?r=, or \?ReportId= parameter",
        ):
            parse_trackman_url(url)

    def test_raises_error_with_unknown_param(self):
        """Test that URLs with only unknown parameters raise ValueError."""
        url = "https://web-dynamic-reports.trackmangolf.com/reports?foo=bar"

        with pytest.raises(
            ValueError,
            match=r"URL must contain an \?a=, \?r=, or \?ReportId= parameter",
        ):
            parse_trackman_url(url)

    def test_handles_special_characters_in_id(self):
        """Test parsing URLs with special characters in ID."""
        url = "https://web-dynamic-reports.trackmangolf.com/reports?r=abc-123_def"
        result = parse_trackman_url(url)

        assert result["id"] == "abc-123_def"

    def test_original_url_preserved(self):
        """Test that original URL is preserved in result."""
        url = "https://web-dynamic-reports.trackmangolf.com/reports?r=123&mp[]=Carry"
        result = parse_trackman_url(url)

        assert result["original_url"] == url


class TestParseTrackmanUrlEdgeCases:
    """Test edge cases for URL parsing."""

    def test_handles_query_params_order(self):
        """Test that parameter order doesn't affect parsing."""
        url1 = "https://web-dynamic-reports.trackmangolf.com/reports?r=123&foo=bar"
        url2 = "https://web-dynamic-reports.trackmangolf.com/reports?foo=bar&r=123"

        result1 = parse_trackman_url(url1)
        result2 = parse_trackman_url(url2)

        assert result1["id"] == result2["id"] == "123"
        assert result1["url_type"] == result2["url_type"] == "report"

    def test_handles_encoded_special_chars(self):
        """Test parsing URLs with URL-encoded characters."""
        url = "https://web-dynamic-reports.trackmangolf.com/reports?r=abc%20def&mp[]=Carry+Side"
        result = parse_trackman_url(url)

        assert result["id"] == "abc def"  # Decoded by parse_qs


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
