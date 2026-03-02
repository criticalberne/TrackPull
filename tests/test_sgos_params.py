"""Tests for parsing sgos[] query parameters for shot-group filtering."""

import pytest
from trackman_scraper.url_builder import parse_trackman_url


class TestSgosParams:
    """Test cases for sgos[] query parameter parsing."""

    def test_parses_single_sgo_parameter(self):
        """Test parsing a single sgos[] parameter."""
        url = "https://example.com/?r=123&sgos[]=group1"
        result = parse_trackman_url(url)

        assert result["id"] == "123"
        assert result["shot_group_ids"] == ["group1"]

    def test_parses_multiple_sgo_parameters(self):
        """Test parsing multiple sgos[] parameters."""
        url = "https://example.com/?r=123&sgos[]=group1&sgos[]=group2&sgos[]=group3"
        result = parse_trackman_url(url)

        assert result["id"] == "123"
        assert result["shot_group_ids"] == ["group1", "group2", "group3"]

    def test_sgo_order_preserved(self):
        """Test that order of sgos[] params is preserved."""
        url = "https://example.com/?r=123&sgos[]=C&sgos[]=A&sgos[]=B"
        result = parse_trackman_url(url)

        assert result["shot_group_ids"] == ["C", "A", "B"]

    def test_deduplicates_sgo_parameters(self):
        """Test that duplicate sgos[] parameters are deduplicated."""
        url = "https://example.com/?r=123&sgos[]=group1&sgos[]=group2&sgos[]=group1"
        result = parse_trackman_url(url)

        assert len(result["shot_group_ids"]) == 2
        assert result["shot_group_ids"] == ["group1", "group2"]

    def test_skips_empty_sgo_values(self):
        """Test that empty sgos[] parameter values are skipped."""
        url = "https://example.com/?r=123&sgos[]=&&sgos[]=group1&sgos[]"
        result = parse_trackman_url(url)

        assert result["shot_group_ids"] == ["group1"]

    def test_sgo_with_other_params(self):
        """Test that sgos[] parsing works with other query parameters."""
        url = "https://example.com/?r=123&someparam=value&sgos[]=group1&another=123"
        result = parse_trackman_url(url)

        assert result["id"] == "123"
        assert result["shot_group_ids"] == ["group1"]

    def test_no_sgo_params(self):
        """Test that URL without sgos[] params returns empty list."""
        url = "https://example.com/?r=123&mp[]=Carry"
        result = parse_trackman_url(url)

        assert result["shot_group_ids"] == []

    def test_sgo_with_activity_url(self):
        """Test that sgos[] works with activity URLs (?a=)."""
        url = "https://example.com/?a=456&sgos[]=group1&sgos[]=group2"
        result = parse_trackman_url(url)

        assert result["url_type"] == "activity"
        assert result["id"] == "456"
        assert result["shot_group_ids"] == ["group1", "group2"]

    def test_sgo_params_remain_in_dict(self):
        """Test that original sgos[] params remain in the params dict."""
        url = "https://example.com/?r=123&sgos[]=group1"
        result = parse_trackman_url(url)

        assert "sgos[]" in result["params"]
        assert result["params"]["sgos[]"] == ["group1"]

    def test_sgo_with_mp_params(self):
        """Test that both sgos[] and mp[] can be parsed together."""
        url = "https://example.com/?r=123&mp[]=Carry&mp[]=SpinRate&sgos[]=front&sgos[]=back"
        result = parse_trackman_url(url)

        assert result["metric_order"] == ["Carry", "SpinRate"]
        assert result["shot_group_ids"] == ["front", "back"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
