"""HTML table scraping fallback using Playwright DOM queries."""

import logging
from typing import Optional, Tuple

from playwright.async_api import Page

from .constants import (
    CSS_AVERAGE_VALUES,
    CSS_CONSISTENCY_VALUES,
    CSS_DATE,
    CSS_PARAM_NAME,
    CSS_PARAM_NAMES_ROW,
    CSS_RESULTS_TABLE,
    CSS_RESULTS_WRAPPER,
    CSS_SHOT_DETAIL_ROW,
    PAGE_LOAD_TIMEOUT,
)
from .models import ClubGroup, SessionData, Shot
from .table_parser import TableParser

logger = logging.getLogger(__name__)


async def _extract_text(element) -> str:
    """Safely extract inner text from an element."""
    if element is None:
        return ""
    return (await element.inner_text()).strip()


async def scrape_page(
    page: Page,
    url: str,
    existing_clubs: Optional[dict[str, ClubGroup]] = None,
) -> Tuple[dict[str, ClubGroup], str]:
    """Scrape a single page load and return (club_name -> ClubGroup, date_text).

    If existing_clubs is provided, new metric columns are merged into existing
    shot data (for multi-page-load strategy).
    """
    logger.info(f"Loading: {url[:120]}...")
    await page.goto(url, wait_until="domcontentloaded")

    # Wait for the data table to render
    try:
        await page.wait_for_selector(
            f".{CSS_RESULTS_WRAPPER}", timeout=PAGE_LOAD_TIMEOUT
        )
        await page.wait_for_selector(
            f".{CSS_SHOT_DETAIL_ROW}", timeout=PAGE_LOAD_TIMEOUT
        )
    except Exception:
        logger.warning("Timed out waiting for data table to render")
        return existing_clubs or {}, "Unknown"

    # Extract date
    date_el = await page.query_selector(f".{CSS_DATE}")
    date_text = await _extract_text(date_el) or "Unknown"

    parser = TableParser(page)

    # Find all ResultsTable blocks (one per club) using CSS selector parsing
    tables_data = await parser.extract_table_data(
        wrapper_selector=f".{CSS_RESULTS_WRAPPER}",
        table_selector=f".{CSS_RESULTS_TABLE}",
        row_selector=f".{CSS_SHOT_DETAIL_ROW}",
        cell_selector="td",
    )

    clubs = existing_clubs if existing_clubs is not None else {}

    for table_data in tables_data:
        # Find club name from rows (first column of first row)
        club_name = "Unknown"
        if table_data.rows and len(table_data.rows[0].cells) > 0:
            club_name = table_data.rows[0].cells[0].text or "Unknown"

        # Get metric names from the parameter names row
        param_row = await page.query_selector(f".{CSS_PARAM_NAMES_ROW}")
        if not param_row:
            continue
        metric_names = await parser.extract_metric_names(
            param_row, name_selector=f".{CSS_PARAM_NAME}"
        )

        # Get or create ClubGroup
        if club_name not in clubs:
            clubs[club_name] = ClubGroup(club_name=club_name)
        club_group = clubs[club_name]

        # Process shot rows (skip first row which contains club name, skip param names row)
        for i, row in enumerate(table_data.rows):
            if i == 0 or i == 1:
                continue

            values = [cell.text for cell in row.cells[4:]] if len(row.cells) > 4 else []
            shot_data = dict(zip(metric_names, values))

            shot_idx = i - 2
            if shot_idx < len(club_group.shots):
                club_group.shots[shot_idx].metrics.update(shot_data)
            elif shot_data:
                club_group.shots.append(Shot(shot_number=shot_idx, metrics=shot_data))

        # Averages row - find by looking for rows with metric values only
        avg_row = await page.query_selector(f".{CSS_AVERAGE_VALUES}")
        if avg_row:
            avg_values = await parser.extract_row_values(avg_row, skip_first_n=1)
            avg_data = dict(zip(metric_names, avg_values))
            club_group.averages.update(avg_data)

        # Consistency row
        cons_row = await page.query_selector(f".{CSS_CONSISTENCY_VALUES}")
        if cons_row:
            cons_values = await parser.extract_row_values(cons_row, skip_first_n=1)
            cons_data = dict(zip(metric_names, cons_values))
            club_group.consistency.update(cons_data)

    return clubs, date_text


async def scrape_all_metrics(
    page: Page,
    urls: list[str],
    url_info: dict,
) -> SessionData:
    """Load multiple URLs to cover all metric groups, merge results."""
    all_clubs: dict[str, ClubGroup] = {}
    date_text = "Unknown"

    for url in urls:
        all_clubs, date_text = await scrape_page(page, url, existing_clubs=all_clubs)

    session = SessionData(
        date=date_text,
        report_id=url_info["id"],
        url_type=url_info["url_type"],
    )
    session.club_groups = list(all_clubs.values())

    # Collect all metric names across all clubs
    all_metric_names: set[str] = set()
    for club in session.club_groups:
        for shot in club.shots:
            all_metric_names.update(shot.metrics.keys())
        all_metric_names.update(club.averages.keys())
    session.metric_names = sorted(all_metric_names)

    return session
