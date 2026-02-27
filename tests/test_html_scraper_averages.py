"""Tests for HTML scraper averages and consistency extraction."""

import pytest
from unittest.mock import AsyncMock
from trackman_scraper.table_parser import TableParser


class TestTableParserAveragesConsistency:
    """Test cases for extracting averages and consistency rows."""

    @pytest.fixture
    def mock_page(self):
        """Create a mock Playwright page."""
        return AsyncMock()

    @pytest.fixture
    def parser(self, mock_page):
        """Create a TableParser instance."""
        return TableParser(mock_page)

    @pytest.mark.asyncio
    async def test_extract_averages_basic(self, parser, mock_page):
        """Test extracting averages from a row."""
        # Create mock row element with cells (skip 2 + 3 metrics = 5 total)
        mock_row = AsyncMock()

        mock_cells = []
        for i in range(5):
            cell = AsyncMock()
            if i >= 2:  # Only values after skip
                cell.inner_text = AsyncMock(return_value=f"105.{i}")
            else:
                cell.inner_text = AsyncMock(return_value="label")
            mock_cells.append(cell)

        mock_row.query_selector_all = AsyncMock(return_value=mock_cells)

        metric_headers = ["ClubSpeed", "BallSpeed", "SpinRate"]

        result = await parser.extract_averages(mock_row, metric_headers)

        assert len(result) == 3
        assert "ClubSpeed" in result
        assert "BallSpeed" in result
        assert "SpinRate" in result

    @pytest.mark.asyncio
    async def test_extract_consistency_basic(self, parser, mock_page):
        """Test extracting consistency from a row."""
        # Create mock row element with cells (skip 2 + 3 metrics = 5 total)
        mock_row = AsyncMock()

        mock_cells = []
        for i in range(5):
            cell = AsyncMock()
            if i >= 2:  # Only values after skip
                cell.inner_text = AsyncMock(return_value=f"±{i}")
            else:
                cell.inner_text = AsyncMock(return_value="label")
            mock_cells.append(cell)

        mock_row.query_selector_all = AsyncMock(return_value=mock_cells)

        metric_headers = ["ClubSpeed", "BallSpeed", "SpinRate"]

        result = await parser.extract_consistency(mock_row, metric_headers)

        assert len(result) == 3
        assert "ClubSpeed" in result
        assert "BallSpeed" in result
        assert "SpinRate" in result

    @pytest.mark.asyncio
    async def test_extract_averages_empty_values(self, parser, mock_page):
        """Test that empty values are not included."""
        # Create mock row element with some empty cells (skip 2 + more metrics)
        mock_row = AsyncMock()

        mock_cell1 = AsyncMock()
        mock_cell1.inner_text = AsyncMock(return_value="label")

        mock_cell2 = AsyncMock()
        mock_cell2.inner_text = AsyncMock(return_value="")  # Empty after skip

        mock_cell3 = AsyncMock()
        mock_cell3.inner_text = AsyncMock(return_value="ClubSpeed Value")

        mock_row.query_selector_all = AsyncMock(
            return_value=[mock_cell1, mock_cell2, mock_cell3]
        )

        metric_headers = ["ClubSpeed", "BallSpeed"]  # Only 2 metrics

        result = await parser.extract_averages(mock_row, metric_headers)

        assert len(result) == 1  # Only non-empty value after skip
        assert "ClubSpeed" in result

    @pytest.mark.asyncio
    async def test_extract_averages_with_skip_first(self, parser, mock_page):
        """Test that skip_first parameter works correctly."""
        # Create mock row element with 5 cells (2 to skip + 3 values)
        mock_row = AsyncMock()

        cells = []
        for i in range(5):
            cell = AsyncMock()
            cell.inner_text = AsyncMock(return_value=f"Value{i}")
            cells.append(cell)

        mock_row.query_selector_all = AsyncMock(return_value=cells)

        metric_headers = ["ClubSpeed", "BallSpeed", "SpinRate"]

        result = await parser.extract_averages(mock_row, metric_headers)

        # Should skip first 2 cells and extract next 3
        assert len(result) == 3
        assert result["ClubSpeed"] == "Value2"
        assert result["BallSpeed"] == "Value3"
        assert result["SpinRate"] == "Value4"
