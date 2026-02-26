"""Command-line interface for the Trackman scraper."""

import argparse


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Scrape Trackman golf dynamic report data to CSV",
        epilog=(
            "Example:\n"
            "  python -m trackman_scraper "
            "--url 'https://web-dynamic-reports.trackmangolf.com/?a=...'"
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--url",
        "-u",
        required=True,
        help="Trackman report URL (supports ?a=, ?r=, ?ReportId= formats)",
    )
    parser.add_argument(
        "--output",
        "-o",
        default=None,
        help="Output CSV path (default: trackman_<id>.csv)",
    )
    parser.add_argument(
        "--strategy",
        choices=["auto", "api", "html"],
        default="auto",
        help="Scraping strategy (default: auto)",
    )
    parser.add_argument(
        "--no-averages",
        action="store_true",
        help="Exclude average/consistency rows from CSV",
    )
    parser.add_argument(
        "--tags",
        nargs="+",
        metavar="CLUB:COUNT:LABEL",
        help=(
            "Tag shots sequentially within a club. "
            "Format: 'Club:Count:Label' (repeatable). "
            "Example: --tags '7Iron:6:warmup' '7Iron:8:assess' "
            "assigns the first 6 7Iron shots as 'warmup', next 8 as 'assess'."
        ),
    )
    parser.add_argument(
        "--metrics",
        nargs="+",
        metavar="METRIC",
        help=(
            "Specify CSV column order for metrics. "
            "Example: --metrics ClubSpeed BallSpeed SmashFactor"
        ),
    )
    parser.add_argument(
        "--debug",
        action="store_true",
        help="Verbose logging and dump captured API responses",
    )
    parser.add_argument(
        "--headed",
        action="store_true",
        help="Run browser in visible mode (for debugging)",
    )
    return parser.parse_args(argv)
