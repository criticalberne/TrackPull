"""Tests for CSS selector-based HTML table parsing."""

from unittest.mock import AsyncMock, MagicMock

import pytest

from trackman_scraper.table_parser import _extract_text
from trackman_scraper.table_parser import (
    TableCell,
    TableData,
    TableRow,
    TableParser,
)


class TestTableCell:
    """Test cases for the TableCell data class."""

    def test_cell_creation(self):
        """Test basic cell creation with required fields."""
        cell = TableCell(row_index=0, col_index=1, text="Driver", element=None)
        assert cell.row_index == 0
        assert cell.col_index == 1
        assert cell.text == "Driver"
        assert cell.element is None

    def test_cell_with_element(self):
        """Test cell creation with an element handle."""
        mock_elem = MagicMock()
        cell = TableCell(row_index=2, col_index=3, text="250.5", element=mock_elem)
        assert cell.row_index == 2
        assert cell.col_index == 3
        assert cell.text == "250.5"
        assert cell.element is mock_elem


class TestTableRow:
    """Test cases for the TableRow data class."""

    def test_empty_row(self):
        """Test creation of a row with no cells."""
        row = TableRow(row_index=0)
        assert row.row_index == 0
        assert len(row.cells) == 0

    def test_row_with_cells(self):
        """Test row creation with multiple cells."""
        cell1 = TableCell(row_index=0, col_index=0, text="Driver")
        cell2 = TableCell(row_index=0, col_index=1, text="250.5")
        row = TableRow(row_index=0, cells=[cell1, cell2])

        assert row.row_index == 0
        assert len(row.cells) == 2
        assert row.get_cell_text(0) == "Driver"
        assert row.get_cell_text(1) == "250.5"

    def test_get_cell_out_of_range(self):
        """Test getting a cell that doesn't exist."""
        row = TableRow(row_index=0, cells=[TableCell(0, 0, "test")])
        assert row.get_cell_text(5) == ""


class TestTableData:
    """Test cases for the TableData data class."""

    def test_empty_table(self):
        """Test creation of an empty table."""
        table = TableData()
        assert len(table.rows) == 0
        assert table.header_row is None
        assert table.footer_rows == []

    def test_table_with_rows(self):
        """Test table with multiple rows."""
        row1 = TableRow(row_index=0, cells=[TableCell(0, 0, "Header")])
        row2 = TableRow(row_index=1, cells=[TableCell(1, 0, "Data")])

        table = TableData(rows=[row1, row2], header_row=0)
        assert len(table.rows) == 2
        assert table.header_row == 0


class TestTableParserInit:
    """Test cases for TableParser initialization."""

    def test_parser_initialization(self):
        """Test that parser is initialized with a page instance."""
        mock_page = AsyncMock()
        parser = TableParser(mock_page)
        assert parser.page is mock_page


class TestFindElementByCSS:
    """Test cases for finding elements by CSS selector."""

    @pytest.mark.asyncio
    async def test_find_element_success(self):
        """Test successful element lookup."""
        mock_page = AsyncMock()
        mock_element = MagicMock()
        mock_page.query_selector = AsyncMock(return_value=mock_element)

        parser = TableParser(mock_page)
        result = await parser.find_element_by_css(".test-class")

        assert result is mock_element
        mock_page.query_selector.assert_called_once_with(".test-class")

    @pytest.mark.asyncio
    async def test_find_element_not_found(self):
        """Test when element doesn't exist."""
        mock_page = AsyncMock()
        mock_page.query_selector = AsyncMock(return_value=None)

        parser = TableParser(mock_page)
        result = await parser.find_element_by_css(".nonexistent")

        assert result is None

    @pytest.mark.asyncio
    async def test_find_element_exception(self):
        """Test handling of exceptions during lookup."""
        mock_page = AsyncMock()
        mock_page.query_selector = AsyncMock(side_effect=Exception("Invalid selector"))

        parser = TableParser(mock_page)
        result = await parser.find_element_by_css("[invalid")

        assert result is None


class TestFindElementsByCSS:
    """Test cases for finding multiple elements by CSS selector."""

    @pytest.mark.asyncio
    async def test_find_elements_success(self):
        """Test successful element lookup returning multiple matches."""
        mock_page = AsyncMock()
        mock_elements = [MagicMock(), MagicMock()]
        mock_page.query_selector_all = AsyncMock(return_value=mock_elements)

        parser = TableParser(mock_page)
        result = await parser.find_elements_by_css(".test-class")

        assert len(result) == 2
        assert result is mock_elements

    @pytest.mark.asyncio
    async def test_find_elements_empty(self):
        """Test when no elements match."""
        mock_page = AsyncMock()
        mock_page.query_selector_all = AsyncMock(return_value=[])

        parser = TableParser(mock_page)
        result = await parser.find_elements_by_css(".nonexistent")

        assert len(result) == 0


class TestExtractTableData:
    """Test cases for extracting table data from a page."""

    @pytest.mark.asyncio
    async def test_extract_no_wrapper(self):
        """Test when wrapper element doesn't exist."""
        mock_page = AsyncMock()
        mock_page.query_selector = AsyncMock(return_value=None)

        parser = TableParser(mock_page)
        result = await parser.extract_table_data(
            wrapper_selector=".wrapper",
            table_selector="table",
            row_selector="tr",
            cell_selector="td",
        )

        assert len(result) == 0

    @pytest.mark.asyncio
    async def test_extract_no_tables(self):
        """Test when wrapper exists but contains no tables."""
        mock_wrapper = MagicMock()
        mock_wrapper.query_selector_all = AsyncMock(return_value=[])

        mock_page = AsyncMock()
        mock_page.query_selector = AsyncMock(return_value=mock_wrapper)

        parser = TableParser(mock_page)
        result = await parser.extract_table_data(
            wrapper_selector=".wrapper",
            table_selector="table",
            row_selector="tr",
            cell_selector="td",
        )

        assert len(result) == 0


class TestExtractRowValues:
    """Test cases for extracting values from a row."""

    @pytest.mark.asyncio
    async def test_extract_all_values(self):
        """Test extraction of all cell values without skipping."""
        mock_td1 = MagicMock()
        mock_td1.inner_text = AsyncMock(return_value="Value 1")
        mock_td2 = MagicMock()
        mock_td2.inner_text = AsyncMock(return_value="Value 2")

        mock_row = MagicMock()
        mock_row.query_selector_all = AsyncMock(return_value=[mock_td1, mock_td2])

        parser = TableParser(MagicMock())
        result = await parser.extract_row_values(mock_row, skip_first_n=0)

        assert result == ["Value 1", "Value 2"]

    @pytest.mark.asyncio
    async def test_extract_skip_cells(self):
        """Test extraction skipping first N cells."""
        mock_td1 = MagicMock()
        mock_td1.inner_text = AsyncMock(return_value="Skip")
        mock_td2 = MagicMock()
        mock_td2.inner_text = AsyncMock(return_value="Keep 1")
        mock_td3 = MagicMock()
        mock_td3.inner_text = AsyncMock(return_value="Keep 2")

        mock_row = MagicMock()
        mock_row.query_selector_all = AsyncMock(
            return_value=[mock_td1, mock_td2, mock_td3]
        )

        parser = TableParser(MagicMock())
        result = await parser.extract_row_values(mock_row, skip_first_n=1)

        assert result == ["Keep 1", "Keep 2"]


class TestExtractMetricNames:
    """Test cases for extracting metric names from a header row."""

    @pytest.mark.asyncio
    async def test_extract_names(self):
        """Test extraction of multiple metric names."""
        mock_name1 = MagicMock()
        mock_name1.inner_text = AsyncMock(return_value="Club Speed")
        mock_name2 = MagicMock()
        mock_name2.inner_text = AsyncMock(return_value="Ball Speed")

        mock_row = MagicMock()
        mock_row.query_selector_all = AsyncMock(return_value=[mock_name1, mock_name2])

        parser = TableParser(MagicMock())
        result = await parser.extract_metric_names(
            mock_row, name_selector=".metric-name"
        )

        assert len(result) == 2
        assert "Club Speed" in result
        assert "Ball Speed" in result

    @pytest.mark.asyncio
    async def test_extract_names_skips_empty(self):
        """Test that empty names are filtered out."""
        mock_name1 = MagicMock()
        mock_name1.inner_text = AsyncMock(return_value="Club Speed")
        mock_name2 = MagicMock()
        mock_name2.inner_text = AsyncMock(return_value="")

        mock_row = MagicMock()
        mock_row.query_selector_all = AsyncMock(return_value=[mock_name1, mock_name2])

        parser = TableParser(MagicMock())
        result = await parser.extract_metric_names(
            mock_row, name_selector=".metric-name"
        )

        assert len(result) == 1
        assert "Club Speed" in result


class TestExtractText:
    """Test cases for the _extract_text helper function."""

    @pytest.mark.asyncio
    async def test_extract_from_element(self):
        """Test extraction from a valid element."""
        mock_elem = MagicMock()
        mock_elem.inner_text = AsyncMock(return_value="  Test Text  ")

        result = await _extract_text(mock_elem)
        assert result == "Test Text"

    @pytest.mark.asyncio
    async def test_extract_none(self):
        """Test extraction from None element."""
        result = await _extract_text(None)
        assert result == ""


class TestIntegration:
    """Integration tests for table parsing functionality."""

    @pytest.mark.asyncio
    async def test_full_table_parsing_workflow(self):
        """Test complete workflow of finding and parsing tables."""
        # Create mock elements simulating HTML structure
        mock_cell = MagicMock()
        mock_cell.inner_text = AsyncMock(return_value="250.5")

        mock_row = MagicMock()
        mock_row.query_selector_all = AsyncMock(return_value=[mock_cell])

        mock_table = MagicMock()
        mock_table.query_selector_all = AsyncMock(return_value=[mock_row])

        mock_wrapper = MagicMock()
        mock_wrapper.query_selector_all = AsyncMock(return_value=[mock_table])

        mock_page = AsyncMock()
        mock_page.query_selector = AsyncMock(return_value=mock_wrapper)

        parser = TableParser(mock_page)
        result = await parser.extract_table_data(
            wrapper_selector=".wrapper",
            table_selector="table",
            row_selector="tr",
            cell_selector="td",
        )

        assert len(result) == 1
        assert len(result[0].rows) == 1
        assert result[0].rows[0].cells[0].text == "250.5"
