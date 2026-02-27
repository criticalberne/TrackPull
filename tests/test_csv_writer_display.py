"""Tests for CSV writer display name mapping functionality."""

from trackman_scraper.csv_writer import _get_display_name


class TestGetDisplayName:
    """Test cases for _get_display_name function."""

    def test_known_metric_returns_display_name(self):
        """Known metrics should return their display name."""
        assert _get_display_name("ClubSpeed") == "Club Speed"
        assert _get_display_name("BallSpeed") == "Ball Speed"
        assert _get_display_name("SpinRate") == "Spin Rate"

    def test_unknown_metric_returns_key(self):
        """Unknown metrics should return the key unchanged."""
        assert _get_display_name("UnknownMetric") == "UnknownMetric"
        assert _get_display_name("FakeMetric") == "FakeMetric"

    def test_all_known_metrics_mapped(self):
        """All known metrics from constants should have display names."""
        from trackman_scraper.constants import ALL_METRICS, METRIC_DISPLAY_NAMES

        for metric in ALL_METRICS:
            assert metric in METRIC_DISPLAY_NAMES, (
                f"Metric {metric} missing from display names mapping"
            )
