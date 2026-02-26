"""Orchestrator: tries API interception first, falls back to HTML scraping."""

import logging

from playwright.async_api import async_playwright

from .html_scraper import scrape_all_metrics
from .interceptor import APIInterceptor
from .models import SessionData
from .url_builder import (
    build_metric_urls,
    build_single_url_all_metrics,
    parse_trackman_url,
)

logger = logging.getLogger(__name__)


async def scrape(
    url: str,
    debug: bool = False,
    strategy: str = "auto",
    headed: bool = False,
) -> SessionData:
    """Scrape a Trackman report URL and return structured session data.

    strategy:
        "auto" - try API interception, then fall back to HTML scraping
        "api"  - API interception only
        "html" - HTML scraping only
    """
    url_info = parse_trackman_url(url)
    logger.info(
        f"Report type={url_info['url_type']}, id={url_info['id']}"
    )

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=not headed)
        context = await browser.new_context(
            viewport={"width": 1440, "height": 900},
            user_agent=(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
        )
        page = await context.new_page()

        session_data = None

        # ----- Strategy A: API Interception -----
        if strategy in ("auto", "api"):
            logger.info("Trying API interception...")
            interceptor = APIInterceptor()
            full_url = build_single_url_all_metrics(url_info)
            session_data = await interceptor.intercept(page, full_url, url_info)

            if debug:
                print(interceptor.get_debug_info())

            if session_data and session_data.club_groups:
                total = sum(len(c.shots) for c in session_data.club_groups)
                logger.info(
                    f"API interception: {len(session_data.club_groups)} "
                    f"club(s), {total} shot(s)"
                )
            else:
                logger.info("API interception did not yield data")
                session_data = None

        # ----- Strategy B: HTML Scraping -----
        if session_data is None and strategy in ("auto", "html"):
            logger.info("Using HTML scraping...")
            metric_urls = build_metric_urls(url_info)
            session_data = await scrape_all_metrics(page, metric_urls, url_info)

            if session_data.club_groups:
                total = sum(len(c.shots) for c in session_data.club_groups)
                logger.info(
                    f"HTML scraping: {len(session_data.club_groups)} "
                    f"club(s), {total} shot(s)"
                )
            else:
                logger.error("HTML scraping found no data")

        await browser.close()

    if session_data is None or not session_data.club_groups:
        raise RuntimeError(
            "Failed to extract data. Try running with --debug for details."
        )

    return session_data
