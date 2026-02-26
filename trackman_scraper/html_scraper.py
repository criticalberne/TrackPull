"""HTML table scraping fallback using Playwright DOM queries."""

import logging
from typing import Optional

from playwright.async_api import Page

from .constants import (
    CSS_AVERAGE_VALUES,
    CSS_CLUB_TAG,
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

logger = logging.getLogger(__name__)


async def _extract_text(element) -> str:
    """Safely extract inner text from an element."""
    if element is None:
        return ""
    return (await element.inner_text()).strip()


async def _extract_row_values(
    row, skip_first_n: int = 4
) -> list[str]:
    """Extract text values from table cells, skipping leading non-data columns."""
    tds = await row.query_selector_all("td")
    values: list[str] = []
    for i, td in enumerate(tds):
        if i >= skip_first_n:
            values.append((await td.inner_text()).strip())
    return values


async def scrape_page(
    page: Page,
    url: str,
    existing_clubs: Optional[dict[str, ClubGroup]] = None,
) -> tuple[dict[str, ClubGroup], str]:
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

    # Find all ResultsTable blocks (one per club)
    wrapper = await page.query_selector(f".{CSS_RESULTS_WRAPPER}")
    if wrapper is None:
        logger.warning("Results wrapper not found")
        return existing_clubs or {}, date_text

    tables = await wrapper.query_selector_all(f".{CSS_RESULTS_TABLE}")
    clubs = existing_clubs if existing_clubs is not None else {}

    for table in tables:
        # Club name
        club_tag = await table.query_selector(f".{CSS_CLUB_TAG}")
        club_name = await _extract_text(club_tag) or "Unknown"

        # Metric column headers for this page load
        param_row = await table.query_selector(f".{CSS_PARAM_NAMES_ROW}")
        if param_row is None:
            continue
        param_els = await param_row.query_selector_all(f".{CSS_PARAM_NAME}")
        metric_names = [await _extract_text(el) for el in param_els]

        # Get or create ClubGroup
        if club_name not in clubs:
            clubs[club_name] = ClubGroup(club_name=club_name)
        club_group = clubs[club_name]

        # Individual shot rows
        shot_rows = await table.query_selector_all(f".{CSS_SHOT_DETAIL_ROW}")
        for i, row in enumerate(shot_rows):
            values = await _extract_row_values(row)
            shot_data = dict(zip(metric_names, values))

            if i < len(club_group.shots):
                # Merge new metrics into existing shot (2nd page load)
                club_group.shots[i].metrics.update(shot_data)
            else:
                club_group.shots.append(
                    Shot(shot_number=i, metrics=shot_data)
                )

        # Averages row
        avg_row = await table.query_selector(f".{CSS_AVERAGE_VALUES}")
        if avg_row:
            avg_values = await _extract_row_values(avg_row, skip_first_n=1)
            avg_data = dict(zip(metric_names, avg_values))
            club_group.averages.update(avg_data)

        # Consistency row
        cons_row = await table.query_selector(f".{CSS_CONSISTENCY_VALUES}")
        if cons_row:
            cons_values = await _extract_row_values(cons_row, skip_first_n=1)
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
        all_clubs, date_text = await scrape_page(
            page, url, existing_clubs=all_clubs
        )

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
