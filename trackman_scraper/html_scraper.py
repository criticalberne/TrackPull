"""HTML table scraping fallback using Playwright DOM queries."""

import logging
from typing import Optional, Tuple

from playwright.async_api import Page

from .constants import (
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

    date_el = await page.query_selector(f".{CSS_DATE}")
    date_text = await _extract_text(date_el) or "Unknown"

    parser = TableParser(page)

    clubs = existing_clubs if existing_clubs is not None else {}

    extraction_result = await parser.extract_club_and_metrics(
        wrapper_selector=f".{CSS_RESULTS_WRAPPER}",
        table_selector=f".{CSS_RESULTS_TABLE}",
        row_selector=f".{CSS_SHOT_DETAIL_ROW}",
        param_names_row_selector=f".{CSS_PARAM_NAMES_ROW}",
        param_name_selector=f".{CSS_PARAM_NAME}",
    )

    if not extraction_result.metric_headers:
        logger.warning("No metric headers found in table")
        return clubs, date_text

    club_name = extraction_result.club_name
    shot_rows_data = extraction_result.shot_rows

    if club_name not in clubs:
        clubs[club_name] = ClubGroup(club_name=club_name)
    club_group = clubs[club_name]

    for i, row_data in enumerate(shot_rows_data):
        shot_idx = i
        if shot_idx < len(club_group.shots):
            club_group.shots[shot_idx].metrics.update(row_data)
        else:
            club_group.shots.append(Shot(shot_number=shot_idx, metrics=row_data))

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

    all_metric_names: set[str] = set()
    for club in session.club_groups:
        for shot in club.shots:
            all_metric_names.update(shot.metrics.keys())
        all_metric_names.update(club.averages.keys())
    session.metric_names = sorted(all_metric_names)

    return session
