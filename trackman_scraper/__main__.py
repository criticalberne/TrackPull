"""Entry point: python -m trackman_scraper --url '...'"""

import asyncio
import logging
import sys

from .cli import parse_args
from .csv_writer import write_csv
from .models import SessionData
from .scraper import scrape


def _apply_tags(session: SessionData, tag_specs: list[str]) -> None:
    """Apply user-specified tags to shots.

    Each spec is "Club:Count:Label".  Tags are applied sequentially
    within each club — the first spec for a club tags shots 1..Count,
    the next spec tags the following Count shots, etc.
    """
    # Track how many shots have been tagged per club so far
    club_offset: dict[str, int] = {}

    for spec in tag_specs:
        parts = spec.split(":", 2)
        if len(parts) != 3:
            logging.warning(
                f"Ignoring malformed tag spec '{spec}' (expected Club:Count:Label)"
            )
            continue
        club, count_str, label = parts
        try:
            count = int(count_str)
        except ValueError:
            logging.warning(f"Ignoring tag spec '{spec}': count is not a number")
            continue

        offset = club_offset.get(club, 0)

        for cg in session.club_groups:
            if cg.club_name != club:
                continue
            for shot in cg.shots[offset : offset + count]:
                shot.tag = label

        club_offset[club] = offset + count


def main() -> None:
    args = parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.debug else logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    try:
        session = asyncio.run(
            scrape(
                url=args.url,
                debug=args.debug,
                strategy=args.strategy,
                headed=args.headed,
            )
        )

        if args.tags:
            _apply_tags(session, args.tags)

        metric_order = list(args.metrics) if args.metrics else None

        filepath = write_csv(
            session=session,
            output_path=args.output,
            include_averages=not args.no_averages,
            metric_order=metric_order,
        )

        # Print summary
        total_shots = sum(len(c.shots) for c in session.club_groups)
        clubs = [c.club_name for c in session.club_groups]
        print(
            f"\nScraped {total_shots} shot(s) across "
            f"{len(clubs)} club(s): {', '.join(clubs)}"
        )
        print(f"Output: {filepath}")

    except Exception as exc:
        logging.error(f"Scraping failed: {exc}")
        if args.debug:
            raise
        sys.exit(1)


if __name__ == "__main__":
    main()
