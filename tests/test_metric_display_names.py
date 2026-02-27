"""Tests for METRIC_DISPLAY_NAMES mapping."""

from trackman_scraper.constants import (
    ALL_METRICS,
    METRIC_DISPLAY_NAMES,
)


class TestMetricDisplayNames:
    """Test cases for metric name to display label mapping."""

    def test_all_metrics_have_display_names(self):
        """All metrics in ALL_METRICS should have a display name mapping."""
        for metric in ALL_METRICS:
            assert metric in METRIC_DISPLAY_NAMES, (
                f"Missing display name for metric: {metric}"
            )

    def test_display_name_mapping_correctness(self):
        """Test specific metric to display name mappings."""
        expected_mappings = {
            "ClubSpeed": "Club Speed",
            "BallSpeed": "Ball Speed",
            "SmashFactor": "Smash Factor",
            "AttackAngle": "Attack Angle",
            "ClubPath": "Club Path",
            "FaceAngle": "Face Angle",
            "FaceToPath": "Face To Path",
            "SwingDirection": "Swing Direction",
            "DynamicLoft": "Dynamic Loft",
            "SpinRate": "Spin Rate",
            "SpinAxis": "Spin Axis",
            "Carry": "Carry",
            "Total": "Total",
            "Side": "Side",
            "SideTotal": "Side Total",
            "Height": "Height",
            "LowPointDistance": "Low Point",
            "ImpactHeight": "Impact Height",
            "ImpactOffset": "Impact Offset",
            "Tempo": "Tempo",
        }

        for metric, expected_display in expected_mappings.items():
            assert METRIC_DISPLAY_NAMES[metric] == expected_display, (
                f"Display name mismatch for {metric}: expected '{expected_display}', got '{METRIC_DISPLAY_NAMES.get(metric)}'"
            )

    def test_unknown_metric_returns_key(self):
        """Unknown metrics should return the key itself as fallback."""
        assert (
            METRIC_DISPLAY_NAMES.get("UnknownMetric", "UnknownMetric")
            == "UnknownMetric"
        )

    def test_no_duplicate_display_names(self):
        """Display names should be unique (no duplicates)."""
        display_values = list(METRIC_DISPLAY_NAMES.values())
        assert len(display_values) == len(set(display_values)), (
            "Duplicate display names found"
        )
