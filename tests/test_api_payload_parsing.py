"""Unit tests for API payload parsing with captured JSON."""

import asyncio

import pytest

from trackman_scraper.interceptor import (
    contains_strokegroups,
    APIInterceptor,
)


class TestContainsStrokeGroups:
    """Test cases for the contains_strokegroups function."""

    def test_valid_payload_has_strokegroups(self):
        """Valid Trackman payload with StrokeGroups list."""
        data = {
            "StrokeGroups": [
                {"Club": "Driver", "Strokes": [{"Measurement": {"BallSpeed": 150.0}}]}
            ],
            "Time": {"Date": "2024-01-15"},
        }
        assert contains_strokegroups(data) is True

    def test_empty_strokegroups_list(self):
        """Payload with empty StrokeGroups list."""
        data = {"StrokeGroups": [], "Time": {"Date": "2024-01-15"}}
        assert contains_strokegroups(data) is False

    def test_no_strokegroups_key(self):
        """Payload without StrokeGroups key."""
        data = {"DataLoadState": "Loaded", "Time": {"Date": "2024-01-15"}}
        assert contains_strokegroups(data) is False

    def test_strokegroups_not_a_list(self):
        """StrokeGroups value is not a list."""
        data = {"StrokeGroups": "invalid", "Time": {"Date": "2024-01-15"}}
        assert contains_strokegroups(data) is False

    def test_non_dict_payload(self):
        """Payload is not a dictionary."""
        assert contains_strokegroups([]) is False
        assert contains_strokegroups("string") is False
        assert contains_strokegroups(123) is False
        assert contains_strokegroups(None) is False

    def test_nested_valid_structure(self):
        """Valid payload with nested StrokeGroups structure."""
        data = {
            "StrokeGroups": [
                {"Club": "Wood", "Strokes": [{"Measurement": {}}]},
                {"Club": "Iron", "Strokes": [{"Measurement": {}}, {"Measurement": {}}]},
            ],
            "Time": {"Date": "2024-01-15"},
        }
        assert contains_strokegroups(data) is True


class TestAPIInterceptorPayloadParsing:
    """Test cases for APIInterceptor payload parsing methods."""

    @pytest.fixture
    def interceptor(self):
        """Create an APIInterceptor instance."""
        return APIInterceptor()

    def test_contains_strokegroups_integration(self, interceptor):
        """Integration test for _contains_strokegroups method."""
        valid_data = {
            "StrokeGroups": [{"Club": "Driver", "Strokes": []}],
            "Time": {"Date": "2024-01-15"},
        }
        invalid_data = {"DataLoadState": "Loaded"}

        assert interceptor._contains_strokegroups(valid_data) is True
        assert interceptor._contains_strokegroups(invalid_data) is False

    def test_looks_like_shot_data_with_strokegroups(self):
        """Detect shot data via StrokeGroups key."""
        data = {"StrokeGroups": [{"Club": "Driver"}], "Time": {"Date": "2024-01-15"}}
        assert APIInterceptor._looks_like_shot_data(data) is True

    def test_looks_like_shot_data_with_metrics(self):
        """Detect shot data via metric keywords."""
        data = {
            "DataLoadState": "Loaded",
            "Measurement": {"BallSpeed": 150.0, "SpinRate": 2500.0},
        }
        assert APIInterceptor._looks_like_shot_data(data) is True

    def test_looks_like_shot_data_insufficient_indicators(self):
        """Return False when indicators are insufficient."""
        data = {"DataLoadState": "Loaded", "Time": {"Date": "2024-01-15"}}
        assert APIInterceptor._looks_like_shot_data(data) is False

    def test_looks_like_shot_data_non_dict(self):
        """Return False for non-dictionary payloads."""
        assert APIInterceptor._looks_like_shot_data([]) is False
        assert APIInterceptor._looks_like_shot_data("string") is False
        assert APIInterceptor._looks_like_shot_data(123) is False


class TestAPIInterceptorMeasurementParsing:
    """Test cases for measurement data parsing methods."""

    def test_parse_measurement_prefers_normalized(self):
        """NormalizedMeasurement values should be preferred over Measurement."""
        stroke = {
            "Measurement": {"BallSpeed": 145.0, "SpinRate": 2500.0},
            "NormalizedMeasurement": {"BallSpeed": 150.0, "ClubSpeed": 98.5},
        }

        result = APIInterceptor._parse_measurement(stroke)
        assert result["BallSpeed"] == 150.0
        assert result["SpinRate"] == 2500.0
        assert result["ClubSpeed"] == 98.5

    def test_parse_measurement_fallback_to_raw(self):
        """Fall back to Measurement when NormalizedMeasurement is missing."""
        stroke = {"Measurement": {"BallSpeed": 145.0, "SpinRate": 2500.0}}

        result = APIInterceptor._parse_measurement(stroke)
        assert result["BallSpeed"] == 145.0
        assert result["SpinRate"] == 2500.0

    def test_parse_measurement_empty_data(self):
        """Handle empty measurement data."""
        stroke = {}
        result = APIInterceptor._parse_measurement(stroke)
        assert result == {}

    def test_extract_numeric_value_int(self):
        """Extract integer values as float."""
        result = APIInterceptor._extract_numeric_value(150, "BallSpeed")
        assert result == 150.0

    def test_extract_numeric_value_float(self):
        """Extract float values unchanged."""
        result = APIInterceptor._extract_numeric_value(150.5, "BallSpeed")
        assert result == 150.5

    def test_extract_numeric_value_string_number(self):
        """Convert string representations of numbers."""
        result = APIInterceptor._extract_numeric_value("150", "BallSpeed")
        assert result == 150.0

    def test_extract_numeric_value_string_trimmed(self):
        """Strip whitespace from numeric strings."""
        result = APIInterceptor._extract_numeric_value("  150.5  ", "SpinRate")
        assert result == 150.5

    def test_extract_numeric_value_invalid_string(self):
        """Return None for non-numeric strings."""
        result = APIInterceptor._extract_numeric_value("invalid", "BallSpeed")
        assert result is None

    def test_extract_numeric_value_none(self):
        """Return None for None values."""
        result = APIInterceptor._extract_numeric_value(None, "BallSpeed")
        assert result is None


class TestAPIInterceptorScalarMetricsExtraction:
    """Test cases for scalar metrics extraction."""

    def test_extract_scalar_metrics_filters_known_keys(self):
        """Only extract known metric keys."""
        measurement = {
            "BallSpeed": 150.0,
            "SpinRate": 2500.0,
            "UnknownField": "test",
            "AnotherUnknown": 123,
        }

        result = APIInterceptor.extract_scalar_metrics(measurement)
        assert "BallSpeed" in result
        assert "SpinRate" in result
        assert "UnknownField" not in result
        assert "AnotherUnknown" not in result

    def test_extract_scalar_metrics_converts_types(self):
        """Convert int and string values to float."""
        measurement = {
            "BallSpeed": 150,  # int
            "SpinRate": "2500.5",  # string
            "ClubSpeed": 98.5,  # float
        }

        result = APIInterceptor.extract_scalar_metrics(measurement)
        assert result["BallSpeed"] == 150.0
        assert result["SpinRate"] == 2500.5
        assert result["ClubSpeed"] == 98.5


class TestAPIInterceptorCapturedResponses:
    """Test cases for response capturing functionality."""

    @pytest.fixture
    def interceptor(self):
        """Create an APIInterceptor instance."""
        return APIInterceptor()

    def test_captured_responses_initially_empty(self, interceptor):
        """Ensure captured responses starts empty."""
        assert len(interceptor.captured_responses) == 0

    def test_report_json_captures_initially_empty(self, interceptor):
        """Ensure report JSON captures starts empty."""
        assert len(interceptor.report_json_captures) == 0

    def test_data_found_event_not_set_initially(self, interceptor):
        """Data found event should not be set initially."""
        assert interceptor.data_found.is_set() is False


class TestAPIInterceptorParseMetricOrder:
    """Test cases for URL metric order handling in parsed data."""

    @pytest.fixture
    def sample_activity_payload(self):
        """Sample Trackman activity report payload."""
        return {
            "StrokeGroups": [
                {
                    "Club": "Driver",
                    "Date": "2024-01-15",
                    "Strokes": [
                        {
                            "Measurement": {"BallSpeed": 150.0, "SpinRate": 2500.0},
                            "NormalizedMeasurement": {
                                "BallSpeed": 150.0,
                                "ClubSpeed": 98.5,
                            },
                        }
                    ],
                },
                {
                    "Club": "Iron",
                    "Date": "2024-01-15",
                    "Strokes": [
                        {
                            "Measurement": {"BallSpeed": 130.0, "SpinRate": 3000.0},
                        }
                    ],
                },
            ],
            "Time": {"Date": "2024-01-15"},
        }

    def test_parse_api_data_extracted_metrics(self, sample_activity_payload):
        """Parsed data should include extracted metrics."""
        interceptor = APIInterceptor()
        interceptor.captured_responses.append(
            {
                "url": "https://app.trackmancloud.com/api/activity",
                "status": 200,
                "body": sample_activity_payload,
                "is_api": True,
            }
        )

        url_info = {"id": "report123", "url_type": "activity"}
        session = interceptor.parse_api_data(url_info)

        assert session is not None
        assert len(session.club_groups) == 2
        assert session.club_groups[0].club_name == "Driver"
        assert session.club_groups[1].club_name == "Iron"

    def test_parse_api_data_metric_names(self, sample_activity_payload):
        """Parsed data should include all metric names."""
        interceptor = APIInterceptor()
        interceptor.captured_responses.append(
            {
                "url": "https://app.trackmancloud.com/api/activity",
                "status": 200,
                "body": sample_activity_payload,
                "is_api": True,
            }
        )

        url_info = {"id": "report123", "url_type": "activity"}
        session = interceptor.parse_api_data(url_info)

        assert session is not None
        assert "BallSpeed" in session.metric_names
        assert "SpinRate" in session.metric_names
        assert "ClubSpeed" in session.metric_names

    def test_parse_api_data_raw_api_data_stored(self, sample_activity_payload):
        """Parsed data should store raw API response."""
        interceptor = APIInterceptor()
        interceptor.captured_responses.append(
            {
                "url": "https://app.trackmancloud.com/api/activity",
                "status": 200,
                "body": sample_activity_payload,
                "is_api": True,
            }
        )

        url_info = {"id": "report123", "url_type": "activity"}
        session = interceptor.parse_api_data(url_info)

        assert session is not None
        assert session.raw_api_data == sample_activity_payload


class TestAPIInterceptorAveragesCalculation:
    """Test cases for average calculations from shot data."""

    @pytest.fixture
    def multi_shot_payload(self):
        """Payload with multiple shots per club."""
        return {
            "StrokeGroups": [
                {
                    "Club": "Driver",
                    "Date": "2024-01-15",
                    "Strokes": [
                        {"Measurement": {"BallSpeed": 150.0, "SpinRate": 2400.0}},
                        {"Measurement": {"BallSpeed": 155.0, "SpinRate": 2600.0}},
                        {"Measurement": {"BallSpeed": 152.5, "SpinRate": 2500.0}},
                    ],
                }
            ],
            "Time": {"Date": "2024-01-15"},
        }

    def test_calculate_averages_ball_speed(self, multi_shot_payload):
        """Averages should be calculated correctly for BallSpeed."""
        interceptor = APIInterceptor()
        interceptor.captured_responses.append(
            {
                "url": "https://app.trackmancloud.com/api/activity",
                "status": 200,
                "body": multi_shot_payload,
                "is_api": True,
            }
        )

        url_info = {"id": "report123", "url_type": "activity"}
        session = interceptor.parse_api_data(url_info)

        assert session is not None
        driver_group = session.club_groups[0]
        # Average of 150.0, 155.0, 152.5 = 152.5
        assert float(driver_group.averages["BallSpeed"]) == pytest.approx(152.5)

    def test_calculate_averages_spin_rate(self, multi_shot_payload):
        """Averages should be calculated correctly for SpinRate."""
        interceptor = APIInterceptor()
        interceptor.captured_responses.append(
            {
                "url": "https://app.trackmancloud.com/api/activity",
                "status": 200,
                "body": multi_shot_payload,
                "is_api": True,
            }
        )

        url_info = {"id": "report123", "url_type": "activity"}
        session = interceptor.parse_api_data(url_info)

        assert session is not None
        driver_group = session.club_groups[0]
        # Average of 2400, 2600, 2500 = 2500.0
        assert float(driver_group.averages["SpinRate"]) == pytest.approx(2500.0)

    def test_averages_rounded_to_one_decimal(self, multi_shot_payload):
        """Averages should be rounded to one decimal place."""
        interceptor = APIInterceptor()
        interceptor.captured_responses.append(
            {
                "url": "https://app.trackmancloud.com/api/activity",
                "status": 200,
                "body": multi_shot_payload,
                "is_api": True,
            }
        )

        url_info = {"id": "report123", "url_type": "activity"}
        session = interceptor.parse_api_data(url_info)

        assert session is not None
        driver_group = session.club_groups[0]
        # Verify it's stored as string with one decimal
        assert isinstance(driver_group.averages["BallSpeed"], str)
        assert ".5" in driver_group.averages["BallSpeed"]


class TestAPIInterceptorEdgeCases:
    """Test cases for edge cases and error handling."""

    def test_parse_empty_strokegroups_list(self):
        """Handle empty StrokeGroups list gracefully."""
        payload = {"StrokeGroups": [], "Time": {"Date": "2024-01-15"}}

        interceptor = APIInterceptor()
        interceptor.captured_responses.append(
            {
                "url": "https://app.trackmancloud.com/api/activity",
                "status": 200,
                "body": payload,
                "is_api": True,
            }
        )

        url_info = {"id": "report123", "url_type": "activity"}
        session = interceptor.parse_api_data(url_info)

        assert session is None

    def test_parse_malformed_strokegroup(self):
        """Handle malformed stroke entries gracefully."""
        payload = {
            "StrokeGroups": [
                {"Club": "Driver", "Strokes": ["invalid"]},
                {"Club": "Iron", "Strokes": [{"Measurement": {"BallSpeed": 150.0}}]},
            ],
            "Time": {"Date": "2024-01-15"},
        }

        interceptor = APIInterceptor()
        interceptor.captured_responses.append(
            {
                "url": "https://app.trackmancloud.com/api/activity",
                "status": 200,
                "body": payload,
                "is_api": True,
            }
        )

        url_info = {"id": "report123", "url_type": "activity"}
        session = interceptor.parse_api_data(url_info)

        assert session is not None
        # Should still parse valid strokes - malformed entries skipped
        assert len(session.club_groups[0].shots) == 1
        assert session.club_groups[0].shots[0].metrics.get("BallSpeed") == "150.0"

    def test_parse_missing_date(self):
        """Handle missing date information gracefully."""
        payload = {
            "StrokeGroups": [
                {"Club": "Driver", "Strokes": [{"Measurement": {"BallSpeed": 150.0}}]}
            ]
        }

        interceptor = APIInterceptor()
        interceptor.captured_responses.append(
            {
                "url": "https://app.trackmancloud.com/api/activity",
                "status": 200,
                "body": payload,
                "is_api": True,
            }
        )

        url_info = {"id": "report123", "url_type": "activity"}
        session = interceptor.parse_api_data(url_info)

        assert session is not None
        assert session.date == "Unknown"


class TestAPIInterceptorDebugHelpers:
    """Test cases for debug helper methods."""

    @pytest.fixture
    def interceptor(self):
        """Create an APIInterceptor instance with captured responses."""
        interceptor = APIInterceptor()
        interceptor.captured_responses.append(
            {
                "url": "https://app.trackmancloud.com/api/activity",
                "status": 200,
                "body": {"StrokeGroups": [{"Club": "Driver"}]},
                "is_api": True,
            }
        )
        return interceptor

    def test_get_debug_info_format(self, interceptor):
        """Debug info should contain captured response summaries."""
        debug_info = interceptor.get_debug_info()

        assert "Captured 1 JSON response" in debug_info
        assert "[200]" in debug_info
        assert "app.trackmancloud.com/api/activity" in debug_info


class TestAPIInterceptorReportJSONCapture:
    """Test cases for report JSON capturing functionality."""

    @pytest.fixture
    def interceptor(self):
        """Create an APIInterceptor instance."""
        return APIInterceptor()

    def test_capture_report_json_stores_response(self, interceptor):
        """Report JSON capture should store response data."""
        url = "https://app.trackmancloud.com/reports/123?date=2024-01-15"
        status = 200
        body = {"StrokeGroups": [{"Club": "Driver"}]}

        async def capture_and_verify():
            interceptor._capture_report_json(url, status, body)

            assert len(interceptor.report_json_captures) == 1

            cache_key = "/reports/123?date=2024-01-15"
            captured = interceptor.report_json_captures[cache_key]
            assert captured["status"] == 200
            assert captured["body"] == body

        asyncio.run(capture_and_verify())

    def test_get_report_json_specific_url(self, interceptor):
        """Retrieve specific URL capture."""
        url = "https://app.trackmancloud.com/reports/123?date=2024-01-15"
        status = 200
        body = {"StrokeGroups": [{"Club": "Driver"}]}

        async def verify_capture():
            interceptor._capture_report_json(url, status, body)

            result = interceptor.get_report_json(url)
            assert result is not None
            assert result["status"] == 200

        asyncio.run(verify_capture())

    def test_get_report_json_returns_all_when_none_specified(self, interceptor):
        """Retrieve all captures when URL not specified."""
        url1 = "https://app.trackmancloud.com/reports/123?date=2024-01-15"
        url2 = "https://app.trackmancloud.com/reports/456?date=2024-01-16"

        async def verify_all():
            interceptor._capture_report_json(url1, 200, {"data": "test1"})
            interceptor._capture_report_json(url2, 200, {"data": "test2"})

            result = interceptor.get_report_json()
            assert len(result) == 2
            assert "/reports/123?date=2024-01-15" in result
            assert "/reports/456?date=2024-01-16" in result

        asyncio.run(verify_all())
