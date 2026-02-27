"""CSS selector-based HTML table parsing utilities for Trackman reports."""

import logging
from dataclasses import dataclass, field
from typing import NamedTuple, Optional

from playwright.async_api import ElementHandle, Page

logger = logging.getLogger(__name__)


class TableExtractionResult(NamedTuple):
    """Structured result of extracting club name, headers, and rows from a table."""

    club_name: str
    metric_headers: list[str]
    shot_rows: list[dict[str, str]]


@dataclass
class TableCell:
    """Represents a single cell in an HTML table."""

    row_index: int
    col_index: int
    text: str
    element: Optional[ElementHandle] = None


@dataclass
class TableRow:
    """Represents a row in an HTML table."""

    row_index: int
    cells: list[TableCell] = field(default_factory=list)

    def get_cell_text(self, col_index: int) -> str:
        """Get text content of a cell by column index."""
        if 0 <= col_index < len(self.cells):
            return self.cells[col_index].text
        return ""


@dataclass
class TableData:
    """Parsed table data with metadata."""

    rows: list[TableRow] = field(default_factory=list)
    header_row: Optional[int] = None
    footer_rows: list[int] = field(default_factory=list)


class TableParser:
    """CSS selector-based HTML table parser using Playwright.

    Provides methods to extract structured data from HTML tables using CSS selectors.
    Designed for parsing Trackman golf report tables with complex layouts including
    metric headers, shot rows, averages, and consistency statistics.
    """

    def __init__(self, page: Page):
        """Initialize the table parser with a Playwright page instance."""
        self.page = page

    async def find_element_by_css(self, css_selector: str) -> Optional[ElementHandle]:
        """Find an element using a CSS selector.

        Args:
            css_selector: The CSS selector to match.

        Returns:
            ElementHandle if found, None otherwise.
        """
        try:
            return await self.page.query_selector(css_selector)
        except Exception as e:
            logger.error(f"Error finding element with selector '{css_selector}': {e}")
            return None

    async def find_elements_by_css(self, css_selector: str) -> list[ElementHandle]:
        """Find multiple elements using a CSS selector.

        Args:
            css_selector: The CSS selector to match.

        Returns:
            List of ElementHandles that match the selector.
        """
        try:
            return await self.page.query_selector_all(css_selector)
        except Exception as e:
            logger.error(f"Error finding elements with selector '{css_selector}': {e}")
            return []

    async def extract_table_data(
        self,
        wrapper_selector: str,
        table_selector: str,
        row_selector: str,
        cell_selector: str = "td",
    ) -> list[TableData]:
        """Extract data from multiple tables on a page.

        Args:
            wrapper_selector: CSS selector for the table container/wrapper element.
            table_selector: CSS selector for individual table elements within wrapper.
            row_selector: CSS selector for rows within each table.
            cell_selector: CSS selector for cells within rows (default: "td").

        Returns:
            List of TableData objects, one per found table.
        """
        tables_data: list[TableData] = []

        wrapper = await self.find_element_by_css(wrapper_selector)
        if not wrapper:
            logger.warning(f"Wrapper element not found: {wrapper_selector}")
            return tables_data

        tables = await wrapper.query_selector_all(table_selector)
        if not tables:
            logger.warning(f"No tables found in wrapper: {table_selector}")
            return tables_data

        for table_idx, table in enumerate(tables):
            try:
                table_data = await self._parse_table(table, row_selector, cell_selector)
                if table_data.rows:
                    tables_data.append(table_data)
            except Exception as e:
                logger.error(f"Error parsing table {table_idx}: {e}")

        return tables_data

    async def _parse_table(
        self,
        table_element: ElementHandle,
        row_selector: str,
        cell_selector: str,
    ) -> TableData:
        """Parse a single table element into structured data.

        Args:
            table_element: The Playwright ElementHandle for the table.
            row_selector: CSS selector for rows within the table.
            cell_selector: CSS selector for cells within rows.

        Returns:
            TableData object containing parsed table structure.
        """
        table_data = TableData()
        rows = await table_element.query_selector_all(row_selector)

        for row_idx, row in enumerate(rows):
            try:
                cell_elements = await row.query_selector_all(cell_selector)
                cells = []

                for col_idx, cell_elem in enumerate(cell_elements):
                    text = (await cell_elem.inner_text()).strip()
                    cells.append(
                        TableCell(
                            row_index=row_idx,
                            col_index=col_idx,
                            text=text,
                            element=cell_elem,
                        )
                    )

                if cells:
                    table_data.rows.append(TableRow(row_index=row_idx, cells=cells))

            except Exception as e:
                logger.error(f"Error parsing row {row_idx}: {e}")

        return table_data

    async def extract_row_values(
        self,
        row_element: ElementHandle,
        skip_first_n: int = 0,
    ) -> list[str]:
        """Extract text values from a row's cells.

        Args:
            row_element: The Playwright ElementHandle for the row.
            skip_first_n: Number of leading cells to skip (e.g., headers or labels).

        Returns:
            List of cell text values, excluding skipped cells.
        """
        tds = await row_element.query_selector_all("td")
        values: list[str] = []

        for i, td in enumerate(tds):
            if i >= skip_first_n:
                value = (await td.inner_text()).strip()
                values.append(value)

        return values

    async def extract_metric_names(
        self,
        row_element: ElementHandle,
        name_selector: str,
    ) -> list[str]:
        """Extract metric/column names from a header row.

        Args:
            row_element: The Playwright ElementHandle for the header row.
            name_selector: CSS selector for individual metric name elements.

        Returns:
            List of metric names in order.
        """
        name_elements = await row_element.query_selector_all(name_selector)
        names: list[str] = []

        for elem in name_elements:
            name = (await elem.inner_text()).strip()
            if name:
                names.append(name)

        return names

    async def extract_club_and_metrics(
        self,
        wrapper_selector: str,
        table_selector: str,
        row_selector: str,
        cell_selector: str = "td",
        param_names_row_selector: Optional[str] = None,
        param_name_selector: Optional[str] = None,
    ) -> TableExtractionResult:
        """Extract club name, metric headers, and shot rows from a table.

        Args:
            wrapper_selector: CSS selector for the table container/wrapper element.
            table_selector: CSS selector for individual table elements within wrapper.
            row_selector: CSS selector for rows within each table.
            cell_selector: CSS selector for cells within rows (default: "td").
            param_names_row_selector: Optional CSS selector for metric names header row.
            param_name_selector: CSS selector for metric names.

        Returns:
            TableExtractionResult with club_name, metric_headers, and shot_rows.
        """
        wrapper = await self.find_element_by_css(wrapper_selector)
        if not wrapper:
            logger.warning(f"Wrapper element not found: {wrapper_selector}")
            return TableExtractionResult(
                club_name="Unknown",
                metric_headers=[],
                shot_rows=[],
            )

        tables = await wrapper.query_selector_all(table_selector)
        if not tables:
            logger.warning(f"No tables found in wrapper: {table_selector}")
            return TableExtractionResult(
                club_name="Unknown",
                metric_headers=[],
                shot_rows=[],
            )

        table = tables[0]
        rows = await table.query_selector_all(row_selector)

        if not rows:
            logger.warning("No rows found in table")
            return TableExtractionResult(
                club_name="Unknown",
                metric_headers=[],
                shot_rows=[],
            )

        # Extract club name from first cell of first row
        first_row_cells = await rows[0].query_selector_all(cell_selector)
        club_name = (
            (await first_row_cells[0].inner_text()).strip()
            if first_row_cells
            else "Unknown"
        )

        # Extract metric headers from parameter names row if provided
        metric_headers: list[str] = []
        if param_names_row_selector and param_name_selector:
            param_row = await self.find_element_by_css(param_names_row_selector)
            if param_row:
                metric_headers = await self.extract_metric_names(
                    param_row, name_selector=param_name_selector
                )

        # Extract shot rows, skip header rows
        shot_rows: list[dict[str, str]] = []
        start_row_idx = 1 if metric_headers else 0

        for i in range(start_row_idx, len(rows)):
            row = rows[i]
            cells = await row.query_selector_all(cell_selector)

            if not cells:
                continue

            # Create dict mapping headers to cell values
            row_data: dict[str, str] = {}
            for j, header in enumerate(metric_headers):
                if j < len(cells):
                    value = (await cells[j].inner_text()).strip()
                    row_data[header] = value

            if row_data or metric_headers:
                shot_rows.append(row_data)

        return TableExtractionResult(
            club_name=club_name,
            metric_headers=metric_headers,
            shot_rows=shot_rows,
        )


async def _extract_text(element: Optional[ElementHandle]) -> str:
    """Safely extract inner text from an element.

    Args:
        element: The Playwright ElementHandle to extract text from.

    Returns:
        Stripped text content, or empty string if element is None.
    """
    if element is None:
        return ""
    return (await element.inner_text()).strip()
