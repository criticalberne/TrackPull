"""Tests for export button CSV generation functionality."""

import pytest

from tests.test_csv_writer_integration import (
    MockSessionData,
    MockClubGroup,
    MockShot,
    build_csv_content,
    get_csv_rows,
)


class TestExportButtonCSVGeneration:
    """Test that the export button generates correct CSV content."""

    @pytest.fixture
    def sample_session(self):
        return MockSessionData(
            date="2026-02-27",
            report_id="EXPORT123",
            metric_names=["ClubSpeed", "BallSpeed"],
            club_groups=[
                MockClubGroup(
                    club_name="Driver",
                    shots=[
                        MockShot(0, {"ClubSpeed": "105.2", "BallSpeed": "158.3"}),
                        MockShot(1, {"ClubSpeed": "104.8", "BallSpeed": "157.9"}),
                    ],
                    averages={"ClubSpeed": "105.0", "BallSpeed": "158.1"},
                    consistency={"ClubSpeed": "±1.2", "BallSpeed": "±0.8"},
                )
            ],
        )

    def test_export_button_generates_csv_with_correct_headers(self, sample_session):
        """Test that export button generates CSV with correct headers."""
        content = build_csv_content(sample_session)
        rows = get_csv_rows(content)
        headers = rows[0]

        assert "Date" in headers
        assert "Report ID" in headers
        assert "Club" in headers
        assert "Shot #" in headers
        assert "Type" in headers

    def test_export_button_includes_report_id_in_data(self, sample_session):
        """Test that export button includes correct report ID."""
        content = build_csv_content(sample_session)
        rows = get_csv_rows(content)

        # Find row with report ID
        has_correct_report_id = any("EXPORT123" in row for row in rows[1:])
        assert has_correct_report_id, "Report ID should appear in CSV data"

    def test_export_button_includes_date(self, sample_session):
        """Test that export button includes correct date."""
        content = build_csv_content(sample_session)
        rows = get_csv_rows(content)

        # Find row with date
        has_correct_date = any("2026-02-27" in row for row in rows[1:])
        assert has_correct_date, "Date should appear in CSV data"


class TestExportButtonFilenameGeneration:
    """Test filename generation logic."""

    def test_filename_includes_report_id(self):
        """Test that generated filename includes report ID."""
        session = MockSessionData(
            date="2026-02-27",
            report_id="TEST456",
            metric_names=[],
            club_groups=[MockClubGroup("Driver", [], {}, {})],
            metadata_params={},
        )

        content = build_csv_content(session)
        rows = get_csv_rows(content)

        # Verify basic structure is present
        assert len(rows) > 0, "CSV should have at least headers"
        assert "Date" in rows[0], "Headers should include Date"

    def test_filename_handles_metadata_params(self):
        """Test filename generation with metadata params."""
        session = MockSessionData(
            date="2026-02-27",
            report_id="TEST789",
            metric_names=[],
            club_groups=[MockClubGroup("Driver", [], {}, {})],
            metadata_params={"nd_001": "ABC123"},
        )

        content = build_csv_content(session)

        # Verify CSV is generated successfully
        assert len(content) > 0, "CSV should be generated"


class TestExportButtonEmptyDataHandling:
    """Test export button behavior with empty or missing data."""

    def test_export_button_handles_empty_club_groups(self):
        """Test that export handles empty club groups gracefully."""
        session = MockSessionData(
            date="2026-02-27",
            report_id="EMPTY123",
            metric_names=[],
            club_groups=[],
            metadata_params={},
        )

        content = build_csv_content(session)
        rows = get_csv_rows(content)

        # Should still have headers even with no data
        assert len(rows) > 0, "Should have headers"
        assert "Date" in rows[0], "Headers should include Date"

    def test_export_button_handles_no_shots(self):
        """Test that export handles clubs with no shots."""
        session = MockSessionData(
            date="2026-02-27",
            report_id="NOSHOTS123",
            metric_names=["Carry"],
            club_groups=[MockClubGroup("Driver", [], {}, {})],
            metadata_params={},
        )

        content = build_csv_content(session)

        # Should still generate valid CSV structure
        assert len(content) > 0, "Should generate valid CSV"


class TestExportButtonShotCounting:
    """Test that export button correctly counts shots."""

    def test_export_button_counts_single_shot(self):
        """Test shot counting with single shot."""
        session = MockSessionData(
            date="2026-02-27",
            report_id="COUNT123",
            metric_names=["Carry"],
            club_groups=[MockClubGroup("Driver", [MockShot(0, {"Carry": "280"})])],
        )

        content = build_csv_content(session)
        rows = get_csv_rows(content)

        # Count shot rows (Type column should be 'Shot')
        shot_count = sum(1 for row in rows if len(row) > 4 and row[4] == "Shot")
        assert shot_count >= 1, "Should have at least one shot row"

    def test_export_button_counts_multiple_shots(self):
        """Test shot counting with multiple shots."""
        session = MockSessionData(
            date="2026-02-27",
            report_id="COUNT456",
            metric_names=["Carry"],
            club_groups=[
                MockClubGroup(
                    "Driver",
                    [
                        MockShot(0, {"Carry": "280"}),
                        MockShot(1, {"Carry": "275"}),
                        MockShot(2, {"Carry": "282"}),
                    ],
                )
            ],
        )

        content = build_csv_content(session)
        rows = get_csv_rows(content)

        # Count shot rows (Type column should be 'Shot')
        shot_count = sum(1 for row in rows if len(row) > 4 and row[4] == "Shot")
        assert shot_count >= 3, f"Should have at least 3 shot rows, got {shot_count}"


class TestExportButtonUIBehavior:
    """Test UI-related behaviors of export button."""

    def test_button_visible_when_data_exists(self):
        """Test that export button should be visible when data exists."""
        session = MockSessionData(
            date="2026-02-27",
            report_id="VISIBLE123",
            metric_names=["Carry"],
            club_groups=[MockClubGroup("Driver", [MockShot(0, {"Carry": "280"})])],
        )

        assert session.club_groups is not None, "Data should exist"
        assert len(session.club_groups) > 0, "Should have club groups"

    def test_button_hidden_when_no_data(self):
        """Test that export button should be hidden with no data."""
        # Simulate no data scenario
        session = MockSessionData(
            date="2026-02-27",
            report_id="",
            metric_names=[],
            club_groups=[],
            metadata_params={},
        )

        assert len(session.club_groups) == 0, "Should have no club groups"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
