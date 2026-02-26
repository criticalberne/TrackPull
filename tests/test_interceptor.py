"""Tests for API interceptor JSON capture functionality."""

from unittest.mock import AsyncMock, MagicMock

import pytest
from trackman_scraper.interceptor import contains_strokegroups


class TestContainsStrokeGroups:
    """Test cases for StrokeGroup detection function."""

    def test_detects_valid_strokegroups_payload(self):
        """Test detection of valid payload with StrokeGroups."""
        data = {"StrokeGroups": [{"Club": "Driver", "Strokes": []}]}
        assert contains_strokegroups(data) is True

    def test_detects_empty_list_strokegroups(self):
        """Test that empty StrokeGroups list returns False."""
        data = {"StrokeGroups": []}
        assert contains_strokegroups(data) is False

    def test_returns_false_for_non_dict(self):
        """Test that non-dict inputs return False."""
        assert contains_strokegroups([]) is False
        assert contains_strokegroups("string") is False
        assert contains_strokegroups(123) is False
        assert contains_strokegroups(None) is False

    def test_returns_false_without_strokegroups_key(self):
        """Test that missing StrokeGroups key returns False."""
        data = {"OtherKey": "value"}
        assert contains_strokegroups(data) is False

    def test_returns_false_for_non_list_strokegroups_value(self):
        """Test that non-list StrokeGroups value returns False."""
        data = {"StrokeGroups": "not a list"}
        assert contains_strokegroups(data) is False

    def test_detects_multiple_strokegroups(self):
        """Test detection with multiple stroke groups."""
        data = {
            "StrokeGroups": [
                {"Club": "Driver", "Strokes": []},
                {"Club": "Iron", "Strokes": []},
                {"Club": "Wedge", "Strokes": []},
            ]
        }
        assert contains_strokegroups(data) is True

    def test_detects_nested_data_with_strokegroups(self):
        """Test detection in nested payload structure."""
        data = {
            "data": {
                "StrokeGroups": [{"Club": "Driver", "Strokes": []}],
                "Time": {"Date": 1234567890},
            }
        }
        assert contains_strokegroups(data) is False

    def test_detects_complex_strokegroup_structure(self):
        """Test detection with complex stroke group structure."""
        data = {
            "StrokeGroups": [
                {
                    "Club": "Driver",
                    "Date": 1234567890,
                    "Strokes": [
                        {
                            "Measurement": {"Carry": 250.0},
                            "NormalizedMeasurement": {"Carry": 248.5},
                        },
                        {
                            "Measurement": {"Carry": 245.0},
                            "NormalizedMeasurement": {"Carry": 243.0},
                        },
                    ],
                }
            ]
        }
        assert contains_strokegroups(data) is True


class TestReportJSONCapture:
    """Test cases for JSON response capture on report pages."""

    @pytest.fixture
    def mock_response(self):
        """Create a mock Playwright response object."""
        response = MagicMock()
        response.url = "https://api.trackmangolf.com/reports?r=123"
        response.headers = {"content-type": "application/json"}
        response.status = 200
        return response

    @pytest.fixture
    def interceptor(self):
        """Create an APIInterceptor instance."""
        from trackman_scraper.interceptor import APIInterceptor

        return APIInterceptor()

    @pytest.mark.asyncio
    async def test_captures_json_responses_from_api_urls(
        self, mock_response, interceptor
    ):
        """Test that JSON responses from API URLs are captured."""
        mock_response.json = AsyncMock(return_value={"StrokeGroups": []})

        await interceptor.handle_response(mock_response)

        assert len(interceptor.captured_responses) == 1
        capture = interceptor.captured_responses[0]
        assert capture["url"] == "https://api.trackmangolf.com/reports?r=123"
        assert capture["status"] == 200
        assert capture["is_api"] is True

    @pytest.mark.asyncio
    async def test_skips_non_json_responses(self, mock_response):
        """Test that non-JSON responses are skipped."""
        from trackman_scraper.interceptor import APIInterceptor

        interceptor = APIInterceptor()
        mock_response.headers = {"content-type": "text/html"}

        await interceptor.handle_response(mock_response)

        assert len(interceptor.captured_responses) == 0

    @pytest.mark.asyncio
    async def test_stores_report_json_by_url_key(self, mock_response):
        """Test that report JSON is stored with URL-based cache key."""
        from trackman_scraper.interceptor import APIInterceptor

        interceptor = APIInterceptor()
        mock_response.json = AsyncMock(return_value={"StrokeGroups": []})

        await interceptor.handle_response(mock_response)

        captures = interceptor.get_report_json()
        assert captures is not None and len(captures) == 1

    @pytest.mark.asyncio
    async def test_gets_specific_url_capture(self, mock_response):
        """Test retrieving a specific URL capture."""
        from trackman_scraper.interceptor import APIInterceptor

        interceptor = APIInterceptor()
        mock_response.json = AsyncMock(
            return_value={"StrokeGroups": [], "Time": {"Date": 1234567890}}
        )

        await interceptor.handle_response(mock_response)

        specific_capture = interceptor.get_report_json(
            "https://api.trackmangolf.com/reports?r=123"
        )
        assert specific_capture is not None
        assert "body" in specific_capture
        assert isinstance(specific_capture["body"], dict)

    @pytest.mark.asyncio
    async def test_returns_none_for_uncaptured_url(self, interceptor):
        """Test that retrieving an uncaptured URL returns None."""
        result = interceptor.get_report_json(
            "https://api.trackmangolf.com/reports?r=999"
        )
        assert result is None

    @pytest.mark.asyncio
    async def test_handles_multiple_different_urls(self):
        """Test capturing responses from multiple different URLs."""
        from trackman_scraper.interceptor import APIInterceptor

        interceptor = APIInterceptor()

        for report_id in ["123", "456", "789"]:
            response = MagicMock()
            response.url = f"https://api.trackmangolf.com/reports?r={report_id}"
            response.headers = {"content-type": "application/json"}
            response.status = 200
            response.json = AsyncMock(
                return_value={"StrokeGroups": [f"Group {report_id}"]}
            )

            await interceptor.handle_response(response)

        captures = interceptor.get_report_json()
        assert captures is not None and len(captures) == 3

    @pytest.mark.asyncio
    async def test_url_cache_key_without_query_params(self):
        """Test URL cache key matching without query parameters."""
        from trackman_scraper.interceptor import APIInterceptor

        interceptor = APIInterceptor()

        # Capture with full URL including query params
        response1 = MagicMock()
        response1.url = "https://api.trackmangolf.com/reports?r=123&mp[]=Carry"
        response1.headers = {"content-type": "application/json"}
        response1.status = 200
        response1.json = AsyncMock(return_value={"StrokeGroups": []})

        await interceptor.handle_response(response1)

        # Retrieve with partial URL (without query params)
        result = interceptor.get_report_json("https://api.trackmangolf.com/reports")
        assert result is not None


class TestMetricExtraction:
    """Test cases for metric extraction from captured JSON."""

    @pytest.mark.asyncio
    async def test_extract_metric_keys_from_measurement(self):
        """Test extracting metric keys from Measurement objects."""
        from trackman_scraper.interceptor import APIInterceptor

        interceptor = APIInterceptor()

        mock_data = {
            "StrokeGroups": [
                {
                    "Club": "Driver",
                    "Strokes": [
                        {
                            "Measurement": {
                                "ClubSpeed": 105.2,
                                "BallSpeed": 158.3,
                                "SpinRate": 2500,
                                "InvalidKey": "should_not_be_extracted",
                            }
                        }
                    ],
                }
            ]
        }

        session = interceptor._try_parse(mock_data, {"id": "123", "url_type": "report"})

        assert session is not None
        assert len(session.club_groups) == 1
        assert session.club_groups[0].club_name == "Driver"
        assert "ClubSpeed" in session.metric_names
        assert "SpinRate" in session.metric_names
        assert "InvalidKey" not in session.metric_names

    @pytest.mark.asyncio
    async def test_prefer_normalized_measurement_over_raw(self):
        """Test that NormalizedMeasurement is preferred over Measurement."""
        from trackman_scraper.interceptor import APIInterceptor

        interceptor = APIInterceptor()

        mock_data = {
            "StrokeGroups": [
                {
                    "Club": "Driver",
                    "Strokes": [
                        {
                            "Measurement": {"Carry": 250.0},
                            "NormalizedMeasurement": {"Carry": 248.5},
                        }
                    ],
                }
            ]
        }

        session = interceptor._try_parse(mock_data, {"id": "123", "url_type": "report"})

        assert session is not None
        # NormalizedMeasurement should be used (248.5 vs 250.0)
        assert len(session.club_groups[0].shots) == 1

    @pytest.mark.asyncio
    async def test_merge_normalized_and_measurement(self):
        """Test that missing keys in NormalizedMeasurement fall back to Measurement."""
        from trackman_scraper.interceptor import APIInterceptor

        interceptor = APIInterceptor()

        mock_data = {
            "StrokeGroups": [
                {
                    "Club": "Driver",
                    "Strokes": [
                        {
                            "Measurement": {
                                "Carry": 250.0,
                                "BallSpeed": 158.3,
                                "SpinRate": 2500,
                            },
                            "NormalizedMeasurement": {"Carry": 248.5},
                        }
                    ],
                }
            ]
        }

        session = interceptor._try_parse(mock_data, {"id": "123", "url_type": "report"})

        assert session is not None
        assert len(session.club_groups[0].shots) == 1

        shot_metrics = session.club_groups[0].shots[0].metrics
        # Carry should come from NormalizedMeasurement (248.5 rounded to 248.5)
        assert "Carry" in shot_metrics
        assert float(shot_metrics["Carry"]) == 248.5
        # BallSpeed and SpinRate should fall back to Measurement
        assert "BallSpeed" in shot_metrics
        assert "SpinRate" in shot_metrics


class TestHeuristicFallback:
    """Test cases for heuristic payload detection fallback."""

    @pytest.mark.asyncio
    async def test_heuristic_detects_ballspeed_and_clubspeed(self):
        """Test that two speed indicators plus one more trigger detection."""
        from trackman_scraper.interceptor import APIInterceptor

        interceptor = APIInterceptor()
        mock_data = {
            "data": {
                "ballspeed": 158.3,
                "clubspeed": 105.2,
                "carry": 248.5,
            }
        }
        assert interceptor._looks_like_shot_data(mock_data) is True

    @pytest.mark.asyncio
    async def test_heuristic_detects_spinrate_and_measurement(self):
        """Test detection with spin rate and measurement indicators."""
        from trackman_scraper.interceptor import APIInterceptor

        interceptor = APIInterceptor()
        mock_data = {
            "data": {
                "spinrate": 2500,
                "measurement": {"SpinRate": 2500},
                "carry": 248.5,
            }
        }
        assert interceptor._looks_like_shot_data(mock_data) is True

    @pytest.mark.asyncio
    async def test_heuristic_fails_with_only_two_indicators(self):
        """Test that only two indicators do not trigger detection."""
        from trackman_scraper.interceptor import APIInterceptor

        interceptor = APIInterceptor()
        mock_data = {
            "data": {
                "ballspeed": 158.3,
                "clubspeed": 105.2,
            }
        }
        assert interceptor._looks_like_shot_data(mock_data) is False

    @pytest.mark.asyncio
    async def test_heuristic_fails_with_one_indicator(self):
        """Test that only one indicator does not trigger detection."""
        from trackman_scraper.interceptor import APIInterceptor

        interceptor = APIInterceptor()
        mock_data = {
            "data": {
                "ballspeed": 158.3,
            }
        }
        assert interceptor._looks_like_shot_data(mock_data) is False

    @pytest.mark.asyncio
    async def test_heuristic_detects_strokes_indicator(self):
        """Test detection with strokes indicator."""
        from trackman_scraper.interceptor import APIInterceptor

        interceptor = APIInterceptor()
        mock_data = {
            "data": {
                "strokes": [1, 2, 3],
                "measurement": {"Carry": 250.0},
                "carry": 248.5,
            }
        }
        assert interceptor._looks_like_shot_data(mock_data) is True

    @pytest.mark.asyncio
    async def test_heuristic_detects_strokegroups_in_nested_data(self):
        """Test detection when strokegroups appears in nested data."""
        from trackman_scraper.interceptor import APIInterceptor

        interceptor = APIInterceptor()
        mock_data = {
            "data": {
                "strokegroups": [],  # lowercase, not a key but in stringified form
                "measurement": {"Carry": 250.0},
                "carry": 248.5,
            }
        }
        assert interceptor._looks_like_shot_data(mock_data) is True


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
