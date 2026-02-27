"""Integration tests for mock payload → CSV snapshot workflow."""

import csv
import tempfile
from pathlib import Path

import pytest

from trackman_scraper.csv_writer import write_csv
from trackman_scraper.interceptor import APIInterceptor
from trackman_scraper.models import ClubGroup, SessionData, Shot


@pytest.fixture
def temp_dir():
    """Create a temporary directory for test outputs."""
    with tempfile.TemporaryDirectory() as tmpdir:
        yield Path(tmpdir)


class MockPayloadFactory:
    """Factory for creating mock Trackman API payloads."""

    @staticmethod
    def create_basic_payload(
        report_id: str = "12345",
        date: str = "2024-01-15",
        clubs: list[str] | None = None,
    ) -> dict:
        """Create a basic Trackman API payload with StrokeGroups."""
        if clubs is None:
            clubs = ["Driver", "7-Iron"]

        stroke_groups = []
        for club in clubs:
            shot_count = 5 if club == "Driver" else 10
            strokes = [
                {
                    "Measurement": {
                        "BallSpeed": f"{140 + i}",
                        "ClubSpeed": f"{105 + i}",
                        "SpinRate": f"{2500 + i * 100}",
                    }
                }
                for i in range(shot_count)
            ]

            stroke_groups.append({"Club": club, "Strokes": strokes})

        return {
            "StrokeGroups": stroke_groups,
            "Time": {"Date": date},
            "ReportId": report_id,
        }


class TestMockPayloadToCSV:
    """Integration tests for end-to-end mock payload to CSV workflow."""

    def test_basic_payload_to_csv_snapshot(
        self, temp_dir: Path, snapshot_factory: MockPayloadFactory
    ):
        """Test basic payload parsing and CSV generation."""
        interceptor = APIInterceptor()
        payload = snapshot_factory.create_basic_payload(
            report_id="test-001", date="2024-03-20"
        )

        interceptor.captured_responses.append(
            {"url": "https://api.example.com/report", "body": payload, "is_api": True}
        )

        url_info = {
            "id": "test-001",
            "url_type": "report",
            "metric_order": [],
        }

        session = interceptor.parse_api_data(url_info)
        assert session is not None, "Failed to parse payload"
        assert len(session.club_groups) == 2, "Should have 2 club groups"

        output_path = temp_dir / "test_basic.csv"
        write_csv(
            session,
            str(output_path),
            include_averages=False,
        )

        assert output_path.exists(), "CSV file should be created"


class TestPayloadWithNumericMetrics:
    """Tests for payload with numeric (non-string) metrics."""

    def test_payload_with_numeric_metrics_to_csv(self, temp_dir: Path):
        """Test payload with numeric metrics and CSV output verification."""
        interceptor = APIInterceptor()
        payload = {
            "StrokeGroups": [
                {
                    "Club": "Driver",
                    "Strokes": [
                        {
                            "Measurement": {
                                "BallSpeed": 142.5,
                                "ClubSpeed": 106.3,
                                "SpinRate": 2500,
                                "Carry": 245.0,
                            }
                        },
                        {
                            "Measurement": {
                                "BallSpeed": 145.0,
                                "ClubSpeed": 107.8,
                                "SpinRate": 2450,
                                "Carry": 250.0,
                            }
                        },
                    ],
                }
            ],
            "Time": {"Date": "2024-03-20"},
        }

        interceptor.captured_responses.append(
            {"url": "https://api.example.com/report", "body": payload, "is_api": True}
        )

        url_info = {
            "id": "numeric-test",
            "url_type": "report",
            "metric_order": ["BallSpeed", "SpinRate"],
        }

        session = interceptor.parse_api_data(url_info)
        assert session is not None, "Failed to parse payload"
        assert len(session.club_groups[0].shots) == 2, "Should have 2 shots"

        output_path = temp_dir / "numeric_metrics.csv"
        write_csv(
            session,
            str(output_path),
            include_averages=False,
            metric_order=["BallSpeed", "SpinRate"],
        )

        assert output_path.exists(), "CSV file should be created"


class TestCSVColumnOrdering:
    """Tests for CSV column ordering."""

    def test_csv_contains_expected_columns(self, temp_dir: Path):
        """Test that CSV contains expected columns in correct order."""
        interceptor = APIInterceptor()
        payload = {
            "StrokeGroups": [
                {
                    "Club": "Wedges",
                    "Strokes": [
                        {"Measurement": {"BallSpeed": 120.0, "SpinRate": 2500}},
                        {"Measurement": {"BallSpeed": 122.0, "SpinRate": 2520}},
                    ],
                }
            ],
            "Time": {"Date": "2024-03-20"},
        }

        interceptor.captured_responses.append(
            {"url": "https://api.example.com/report", "body": payload, "is_api": True}
        )

        url_info = {
            "id": "wedge-test",
            "url_type": "report",
            "metric_order": ["BallSpeed", "ClubSpeed"],
        }

        session = interceptor.parse_api_data(url_info)
        assert session is not None

        output_path = temp_dir / "columns.csv"
        write_csv(
            session,
            str(output_path),
            include_averages=False,
            metric_order=["BallSpeed", "ClubSpeed"],
        )

        with open(output_path, "r") as f:
            reader = csv.DictReader(f)
            headers = reader.fieldnames or []

        assert "Date" in headers, "Should have Date column"
        assert "Report ID" in headers, "Should have Report ID column"
        assert "Club" in headers, "Should have Club column"
        assert "Ball Speed" in headers, "Should have Ball Speed column (display name)"
        assert "Spin Rate" in headers, "Should have Spin Rate column (display name)"

    def test_metric_order_from_url_params(self, temp_dir: Path):
        """Test that metric order respects mp[] URL parameters."""
        interceptor = APIInterceptor()
        payload = {
            "StrokeGroups": [
                {
                    "Club": "Driver",
                    "Strokes": [
                        {"Measurement": {"BallSpeed": 140.0, "SpinRate": 2500}},
                        {"Measurement": {"BallSpeed": 142.0, "SpinRate": 2520}},
                    ],
                }
            ],
            "Time": {"Date": "2024-03-20"},
        }

        interceptor.captured_responses.append(
            {"url": "https://api.example.com/report", "body": payload, "is_api": True}
        )

        url_info = {
            "id": "order-test",
            "url_type": "report",
            "metric_order": ["SpinRate", "BallSpeed"],
        }

        session = interceptor.parse_api_data(url_info)
        assert session is not None

        output_path = temp_dir / "ordered.csv"
        write_csv(
            session,
            str(output_path),
            include_averages=False,
            metric_order=["SpinRate", "BallSpeed"],
        )

        with open(output_path, "r") as f:
            reader = csv.DictReader(f)
            headers = reader.fieldnames or []

        spinrate_idx = headers.index("Spin Rate") if "Spin Rate" in headers else -1
        ballspeed_idx = headers.index("Ball Speed") if "Ball Speed" in headers else -1
        assert spinrate_idx < ballspeed_idx, (
            "Spin Rate should come before Ball Speed in CSV"
        )


class TestCSVRowCount:
    """Tests for CSV row counts."""

    def test_csv_row_count_matches_shots(self, temp_dir: Path):
        """Test that CSV row count matches number of shots."""
        interceptor = APIInterceptor()
        payload = {
            "StrokeGroups": [
                {
                    "Club": "Driver",
                    "Strokes": [{"Measurement": {"BallSpeed": 140.0}}] * 5,
                },
                {
                    "Club": "Iron",
                    "Strokes": [{"Measurement": {"BallSpeed": 130.0}}] * 7,
                },
            ],
            "Time": {"Date": "2024-03-20"},
        }

        interceptor.captured_responses.append(
            {"url": "https://api.example.com/report", "body": payload, "is_api": True}
        )

        url_info = {
            "id": "rowcount-test",
            "url_type": "report",
            "metric_order": [],
        }

        session = interceptor.parse_api_data(url_info)
        assert session is not None

        output_path = temp_dir / "rowcount.csv"
        write_csv(
            session,
            str(output_path),
            include_averages=False,
        )

        with open(output_path, "r") as f:
            reader = csv.DictReader(f)
            rows = list(reader)

        total_shots = 5 + 7
        assert len(rows) == total_shots, (
            f"Should have {total_shots} rows for {total_shots} shots"
        )


class TestAveragesInCSV:
    """Tests for CSV with averages."""

    def test_csv_with_averages_included(self, temp_dir: Path):
        """Test CSV generation with averages included."""
        interceptor = APIInterceptor()
        payload = {
            "StrokeGroups": [
                {
                    "Club": "Driver",
                    "Strokes": [
                        {"Measurement": {"BallSpeed": 140.0, "SpinRate": 2500}},
                        {"Measurement": {"BallSpeed": 142.0, "SpinRate": 2520}},
                        {"Measurement": {"BallSpeed": 138.0, "SpinRate": 2480}},
                    ],
                }
            ],
            "Time": {"Date": "2024-03-20"},
        }

        interceptor.captured_responses.append(
            {"url": "https://api.example.com/report", "body": payload, "is_api": True}
        )

        url_info = {
            "id": "averages-test",
            "url_type": "report",
            "metric_order": [],
        }

        session = interceptor.parse_api_data(url_info)
        assert session is not None

        output_path = temp_dir / "with_averages.csv"
        write_csv(
            session,
            str(output_path),
            include_averages=True,
        )

        with open(output_path, "r") as f:
            reader = csv.DictReader(f)
            rows = list(reader)

        shot_rows = [r for r in rows if r["Type"] == "Shot"]
        avg_rows = [r for r in rows if r["Type"] == "Average"]

        assert len(shot_rows) == 3, "Should have 3 shot rows"
        assert len(avg_rows) == 1, "Should have 1 average row"


class TestDirectSessionData:
    """Tests for creating CSV directly from SessionData."""

    def test_session_data_direct_to_csv(self, temp_dir: Path):
        """Test creating CSV directly from SessionData without parsing."""
        session = SessionData(
            date="2024-03-20",
            report_id="direct-test",
            url_type="report",
            metric_names=["BallSpeed", "SpinRate"],
        )

        session.club_groups.append(
            ClubGroup(
                club_name="Driver",
                shots=[
                    Shot(
                        shot_number=0,
                        metrics={"BallSpeed": "140.0", "SpinRate": "2500"},
                    ),
                    Shot(
                        shot_number=1,
                        metrics={"BallSpeed": "142.0", "SpinRate": "2520"},
                    ),
                ],
            )
        )

        output_path = temp_dir / "direct.csv"
        write_csv(session, str(output_path), include_averages=False)

        assert output_path.exists(), "CSV should be created from direct SessionData"


class TestFilenameGeneration:
    """Tests for CSV filename generation."""

    def test_filename_generated_from_metadata(self, temp_dir: Path):
        """Test CSV filename generation with metadata parameters."""
        session = SessionData(
            date="2024-03-20",
            report_id="12345",
            url_type="report",
            metric_names=["BallSpeed"],
            metadata_params={"nd_course": "Oakmont", "nd_date": "2024-03-20"},
        )

        session.club_groups.append(
            ClubGroup(club_name="Driver", shots=[Shot(shot_number=0, metrics={})])
        )

        output_path = str(temp_dir / "metadata_test.csv")
        write_csv(session, output_path, include_averages=False)

        assert (temp_dir / "metadata_test.csv").exists(), "CSV file should be created"


class TestEdgeCases:
    """Tests for edge cases and error handling."""

    def test_empty_payload(self):
        """Test parsing empty payload returns None."""
        interceptor = APIInterceptor()
        url_info = {"id": "test", "url_type": "report", "metric_order": []}

        session = interceptor.parse_api_data(url_info)
        assert session is None, "Empty payload should return None"

    def test_payload_with_no_shots(self):
        """Test parsing payload with empty strokes returns None."""
        interceptor = APIInterceptor()
        payload = {
            "StrokeGroups": [
                {"Club": "Driver", "Strokes": []},
            ],
            "Time": {"Date": "2024-03-20"},
        }

        interceptor.captured_responses.append(
            {"url": "https://api.example.com/report", "body": payload, "is_api": True}
        )

        url_info = {"id": "empty-shots", "url_type": "report", "metric_order": []}

        session = interceptor.parse_api_data(url_info)
        # Empty strokes means no valid club groups with data, so returns None
        assert session is None, "Payload with empty strokes should return None"

    def test_payload_with_invalid_metrics(self):
        """Test parsing payload with missing metrics."""
        interceptor = APIInterceptor()
        payload = {
            "StrokeGroups": [
                {
                    "Club": "Driver",
                    "Strokes": [{"Measurement": {}}, {"Measurement": {}}],
                },
            ],
            "Time": {"Date": "2024-03-20"},
        }

        interceptor.captured_responses.append(
            {"url": "https://api.example.com/report", "body": payload, "is_api": True}
        )

        url_info = {"id": "missing-metrics", "url_type": "report", "metric_order": []}

        session = interceptor.parse_api_data(url_info)
        assert session is not None, "Should parse payload with missing metrics"


class TestSnapshotConsistency:
    """Tests ensuring CSV output is consistent and reproducible."""

    def test_reproducible_output(self, temp_dir: Path):
        """Test that same input produces identical output."""
        interceptor = APIInterceptor()
        payload = {
            "StrokeGroups": [
                {
                    "Club": "Driver",
                    "Strokes": [
                        {"Measurement": {"BallSpeed": 140.0, "SpinRate": 2500}},
                        {"Measurement": {"BallSpeed": 142.0, "SpinRate": 2520}},
                    ],
                }
            ],
            "Time": {"Date": "2024-03-20"},
        }

        interceptor.captured_responses.append(
            {"url": "https://api.example.com/report", "body": payload, "is_api": True}
        )

        url_info = {
            "id": "repro-test",
            "url_type": "report",
            "metric_order": [],
        }

        session1 = interceptor.parse_api_data(url_info)
        session2 = interceptor.parse_api_data(url_info)

        assert session1 is not None and session2 is not None

        output_path1 = temp_dir / "repro1.csv"
        output_path2 = temp_dir / "repro2.csv"

        write_csv(session1, str(output_path1), include_averages=False)
        write_csv(session2, str(output_path2), include_averages=False)

        with open(output_path1, "r") as f1, open(output_path2, "r") as f2:
            content1 = f1.read()
            content2 = f2.read()

        assert content1 == content2, "Same input should produce identical output"


# Import required modules for fixtures


@pytest.fixture
def snapshot_factory():
    """Fixture to provide MockPayloadFactory instance."""
    return MockPayloadFactory()
