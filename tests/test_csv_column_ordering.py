"""Tests for CSV column ordering functionality."""

from trackman_scraper.csv_writer import _order_metrics_by_priority


class TestOrderMetricsByPriority:
    """Test cases for _order_metrics_by_priority function."""

    def test_empty_priority_order_returns_original(self):
        """Empty priority order should return original metric list."""
        all_metrics = ["A", "B", "C"]
        result = _order_metrics_by_priority(all_metrics, [])
        assert result == ["A", "B", "C"]

    def test_full_priority_order_reorders_all(self):
        """Full priority order should return metrics in priority order."""
        all_metrics = ["A", "B", "C", "D"]
        priority_order = ["D", "C", "B", "A"]
        result = _order_metrics_by_priority(all_metrics, priority_order)
        assert result == ["D", "C", "B", "A"]

    def test_partial_priority_order_keeps_remaining_original(self):
        """Partial priority order should put prioritized first, then remaining in original order."""
        all_metrics = ["A", "B", "C", "D", "E"]
        priority_order = ["E", "A"]
        result = _order_metrics_by_priority(all_metrics, priority_order)
        assert result == ["E", "A", "B", "C", "D"]

    def test_priority_with_duplicates_ignores_duplicates(self):
        """Duplicate entries in priority order should be ignored."""
        all_metrics = ["A", "B", "C"]
        priority_order = ["C", "A", "A", "B"]
        result = _order_metrics_by_priority(all_metrics, priority_order)
        assert result == ["C", "A", "B"]

    def test_priority_with_nonexistent_metrics_ignores_them(self):
        """Non-existent metrics in priority order should be ignored."""
        all_metrics = ["A", "B", "C"]
        priority_order = ["Z", "Y", "A", "X", "B"]
        result = _order_metrics_by_priority(all_metrics, priority_order)
        assert result == ["A", "B", "C"]

    def test_empty_all_metrics_returns_empty(self):
        """Empty all_metrics list should return empty result."""
        result = _order_metrics_by_priority([], ["A", "B"])
        assert result == []

    def test_both_lists_empty_returns_empty(self):
        """Both empty lists should return empty result."""
        result = _order_metrics_by_priority([], [])
        assert result == []

    def test_real_world_trackman_ordering(self):
        """Test with real Trackman metrics ordering as in URL params."""
        all_metrics = [
            "ClubSpeed",
            "BallSpeed",
            "SmashFactor",
            "AttackAngle",
            "ClubPath",
            "FaceAngle",
            "FaceToPath",
            "SwingDirection",
            "DynamicLoft",
            "SpinRate",
            "SpinAxis",
            "Carry",
            "Total",
            "Side",
            "SideTotal",
        ]

        # Typical user preference: key metrics first (Ball Speed, Smash Factor)
        priority_order = ["BallSpeed", "SmashFactor", "ClubSpeed"]
        result = _order_metrics_by_priority(all_metrics, priority_order)

        assert result[0] == "BallSpeed"
        assert result[1] == "SmashFactor"
        assert result[2] == "ClubSpeed"
        # Remaining metrics should follow original order
        remaining_start_idx = 3
        expected_remaining = [
            "AttackAngle",
            "ClubPath",
            "FaceAngle",
            "FaceToPath",
            "SwingDirection",
            "DynamicLoft",
            "SpinRate",
            "SpinAxis",
            "Carry",
            "Total",
            "Side",
            "SideTotal",
        ]
        assert result[remaining_start_idx:] == expected_remaining

    def test_reorder_with_no_overlap(self):
        """No overlap between priority and all_metrics should return original order."""
        all_metrics = ["A", "B", "C"]
        priority_order = ["X", "Y", "Z"]
        result = _order_metrics_by_priority(all_metrics, priority_order)
        assert result == ["A", "B", "C"]

    def test_single_metric_in_priority(self):
        """Single metric in priority order should move it to front."""
        all_metrics = ["A", "B", "C", "D", "E"]
        priority_order = ["C"]
        result = _order_metrics_by_priority(all_metrics, priority_order)
        assert result == ["C", "A", "B", "D", "E"]

    def test_all_metrics_in_reverse_priority(self):
        """All metrics specified in reverse order."""
        all_metrics = ["A", "B", "C", "D"]
        priority_order = ["D", "C", "B", "A"]
        result = _order_metrics_by_priority(all_metrics, priority_order)
        assert result == ["D", "C", "B", "A"]

    def test_preserves_metric_case_sensitivity(self):
        """Metric names are case-sensitive."""
        all_metrics = ["ClubSpeed", "clubspeed", "CLUBSPEED"]
        priority_order = ["CLUBSPEED"]
        result = _order_metrics_by_priority(all_metrics, priority_order)
        assert result == ["CLUBSPEED", "ClubSpeed", "clubspeed"]
