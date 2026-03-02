"""Tests for parsing mp[] query parameters to define CSV column order."""

import pytest
from trackman_scraper.url_builder import parse_trackman_url


class TestMpParamsParsing:
    """Test cases for mp[] query parameter parsing."""

    def test_parses_single_mp_param(self):
        """Test parsing a single mp[] parameter."""
        url = "https://example.com/?r=123&mp[]=ClubSpeed"
        result = parse_trackman_url(url)

        assert result["metric_order"] == ["ClubSpeed"]

    def test_parses_multiple_mp_params(self):
        """Test parsing multiple mp[] parameters."""
        url = "https://example.com/?r=123&mp[]=SpinRate&mp[]=BallSpeed&mp[]=Carry"
        result = parse_trackman_url(url)

        assert result["metric_order"] == ["SpinRate", "BallSpeed", "Carry"]

    def test_parses_mp_params_in_different_order(self):
        """Test that order of mp[] params is preserved."""
        url1 = "https://example.com/?r=123&mp[]=A&mp[]=B&mp[]=C"
        url2 = "https://example.com/?r=123&mp[]=C&mp[]=A&mp[]=B"

        result1 = parse_trackman_url(url1)
        result2 = parse_trackman_url(url2)

        assert result1["metric_order"] == ["A", "B", "C"]
        assert result2["metric_order"] == ["C", "A", "B"]

    def test_handles_duplicate_mp_params(self):
        """Test that duplicate mp[] parameters are deduplicated."""
        url = "https://example.com/?r=123&mp[]=ClubSpeed&mp[]=BallSpeed&mp[]=ClubSpeed"
        result = parse_trackman_url(url)

        assert result["metric_order"] == ["ClubSpeed", "BallSpeed"]
        assert len(result["metric_order"]) == 2

    def test_handles_empty_mp_param_value(self):
        """Test that empty mp[] parameter values are skipped."""
        url = "https://example.com/?r=123&mp[]=&mp[]=SpinRate&mp[]"
        result = parse_trackman_url(url)

        assert result["metric_order"] == ["SpinRate"]

    def test_parses_with_other_query_params(self):
        """Test that mp[] parsing works with other query parameters."""
        url = "https://example.com/?r=123&someparam=value&mp[]=Carry&another=123"
        result = parse_trackman_url(url)

        assert result["metric_order"] == ["Carry"]
        assert result["params"]["someparam"] == ["value"]
        assert result["params"]["another"] == ["123"]

    def test_no_mp_params_returns_empty_list(self):
        """Test that URL without mp[] params returns empty list."""
        url = "https://example.com/?r=123&foo=bar"
        result = parse_trackman_url(url)

        assert result["metric_order"] == []

    def test_parses_from_activity_url(self):
        """Test that mp[] works with activity URLs (?a=)."""
        url = "https://example.com/?a=456&mp[]=SpinRate&mp[]=LaunchAngle"
        result = parse_trackman_url(url)

        assert result["url_type"] == "activity"
        assert result["id"] == "456"
        assert result["metric_order"] == ["SpinRate", "LaunchAngle"]

    def test_preserves_mp_param_values_in_params_dict(self):
        """Test that original mp[] params remain in the params dict."""
        url = "https://example.com/?r=123&mp[]=ClubSpeed"
        result = parse_trackman_url(url)

        assert "mp[]" in result["params"]
        assert result["params"]["mp[]"] == ["ClubSpeed"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
