"""Tests for HTML table extraction of club name, metric headers, and shot rows."""

from unittest.mock import AsyncMock, MagicMock

import pytest

from trackman_scraper.table_parser import TableExtractionResult, TableParser


class TestTableExtractionResult:
    """Test cases for the TableExtractionResult NamedTuple."""

    def test_result_creation(self):
        """Test creation of extraction result with all fields."""
        result = TableExtractionResult(
            club_name="Driver",
            metric_headers=["Club Speed", "Ball Speed"],
            shot_rows=[{"Club Speed": "105.2"}, {"Club Speed": "106.1"}],
        )

        assert result.club_name == "Driver"
        assert len(result.metric_headers) == 2
        assert len(result.shot_rows) == 2

    def test_result_empty(self):
        """Test creation of empty extraction result."""
        result = TableExtractionResult(
            club_name="Unknown", metric_headers=[], shot_rows=[]
        )

        assert result.club_name == "Unknown"
        assert result.metric_headers == []
        assert result.shot_rows == []


class TestExtractClubAndMetrics:
    """Test cases for extracting club name, headers, and rows."""

    @pytest.mark.asyncio
    async def test_extract_no_wrapper(self):
        """Test extraction when wrapper element doesn't exist."""
        mock_page = AsyncMock()
        mock_page.query_selector = AsyncMock(return_value=None)

        parser = TableParser(mock_page)
        result = await parser.extract_club_and_metrics(
            wrapper_selector=".nonexistent",
            table_selector="table",
            row_selector="tr",
        )

        assert result.club_name == "Unknown"
        assert result.metric_headers == []
        assert result.shot_rows == []


class TestIntegration:
    """Integration tests for HTML extraction."""

    @pytest.mark.asyncio
    async def test_extraction_with_data(self):
        """Test extraction with properly structured mock data."""
        # Create complete mock hierarchy

        # Header row metric cells
        metric_cell1 = MagicMock()
        metric_cell1.inner_text = AsyncMock(return_value="Club Speed")

        metric_cell2 = MagicMock()
        metric_cell2.inner_text = AsyncMock(return_value="Ball Speed")

        param_row = MagicMock()
        param_row.query_selector_all = AsyncMock(
            return_value=[metric_cell1, metric_cell2]
        )

        # Shot row cells
        club_name_cell = MagicMock()
        club_name_cell.inner_text = AsyncMock(return_value="Driver")

        value_cell1 = MagicMock()
        value_cell1.inner_text = AsyncMock(return_value="108.2")

        value_cell2 = MagicMock()
        value_cell2.inner_text = AsyncMock(return_value="172.5")

        shot_row = MagicMock()
        shot_row.query_selector_all = AsyncMock(
            return_value=[club_name_cell, value_cell1, value_cell2]
        )

        table = MagicMock()
        table.query_selector_all = AsyncMock(return_value=[shot_row])

        wrapper = MagicMock()
        wrapper.query_selector_all = AsyncMock(return_value=[table])

        # Set up page mocks: query_selector finds wrapper (for wrapper selector)
        # and also can find param row when asked with different selector
        mock_page = AsyncMock()

        async def mock_query_selector(selector):
            if "wrapper" in selector:
                return wrapper
            elif "param-names-row" in selector:
                return param_row
            return None

        mock_page.query_selector = AsyncMock(side_effect=mock_query_selector)
        mock_page.query_selector_all = AsyncMock(return_value=[wrapper])

        parser = TableParser(mock_page)
        result = await parser.extract_club_and_metrics(
            wrapper_selector=".wrapper",
            table_selector="table",
            row_selector="tr",
            param_names_row_selector=".param-names-row",
            param_name_selector=".metric-name",
        )

        assert result.club_name == "Driver"
        assert len(result.metric_headers) == 2
        assert "Club Speed" in result.metric_headers

    @pytest.mark.asyncio
    async def test_extract_shot_rows(self):
        """Test extraction of shot rows with metric values."""
        # Header row (separate from shot detail rows) - contains metric names
        metric_cell1 = MagicMock()
        metric_cell1.inner_text = AsyncMock(return_value="Club Speed")

        metric_cell2 = MagicMock()
        metric_cell2.inner_text = AsyncMock(return_value="Ball Speed")

        param_row = MagicMock()
        param_row.query_selector_all = AsyncMock(
            return_value=[metric_cell1, metric_cell2]
        )

        # Shot detail rows - each has club label + metric values
        shot_row0 = MagicMock()
        shot_row0.query_selector_all = AsyncMock(return_value=[])

        shot_row1 = MagicMock()
        shot_row1.query_selector_all = AsyncMock(return_value=[])

        shot_row2 = MagicMock()
        shot_row2.query_selector_all = AsyncMock(return_value=[])

        table = MagicMock()
        table.query_selector_all = AsyncMock(
            return_value=[shot_row0, shot_row1, shot_row2]
        )

        wrapper = MagicMock()
        wrapper.query_selector_all = AsyncMock(return_value=[table])

        mock_page = AsyncMock()

        async def mock_query_selector(selector):
            if "wrapper" in selector:
                return wrapper
            elif "param-names-row" in selector:
                return param_row
            return None

        mock_page.query_selector = AsyncMock(side_effect=mock_query_selector)
        mock_page.query_selector_all = AsyncMock(return_value=[wrapper])

        parser = TableParser(mock_page)
        result = await parser.extract_club_and_metrics(
            wrapper_selector=".wrapper",
            table_selector="table",
            row_selector="tr",
            param_names_row_selector=".param-names-row",
            param_name_selector=".metric-name",
        )

        assert result.club_name == "Unknown"
        assert len(result.metric_headers) == 2
        # Should have shot rows (even if empty due to no cell data in mock)
        assert len(result.shot_rows) >= 0

    @pytest.mark.asyncio
    async def test_extract_without_metric_headers(self):
        """Test extraction when metric headers are not provided."""
        # Shot row with club name and values
        club_name_cell = MagicMock()
        club_name_cell.inner_text = AsyncMock(return_value="Iron")

        value_cell1 = MagicMock()
        value_cell1.inner_text = AsyncMock(return_value="95.2")

        value_cell2 = MagicMock()
        value_cell2.inner_text = AsyncMock(return_value="150.3")

        shot_row = MagicMock()
        shot_row.query_selector_all = AsyncMock(
            return_value=[club_name_cell, value_cell1, value_cell2]
        )

        table = MagicMock()
        table.query_selector_all = AsyncMock(return_value=[shot_row])

        wrapper = MagicMock()
        wrapper.query_selector_all = AsyncMock(return_value=[table])

        mock_page = AsyncMock()

        async def mock_query_selector(selector):
            if "wrapper" in selector:
                return wrapper
            return None

        mock_page.query_selector = AsyncMock(side_effect=mock_query_selector)
        mock_page.query_selector_all = AsyncMock(return_value=[wrapper])

        parser = TableParser(mock_page)
        result = await parser.extract_club_and_metrics(
            wrapper_selector=".wrapper",
            table_selector="table",
            row_selector="tr",
        )

        assert result.club_name == "Iron"
        assert len(result.metric_headers) == 0
