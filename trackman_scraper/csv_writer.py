"""Write session data to CSV."""

import csv
import logging

from .constants import METRIC_DISPLAY_NAMES
from .models import SessionData

logger = logging.getLogger(__name__)


def _get_display_name(metric: str) -> str:
    """Map a metric key to its human-readable display name."""
    return METRIC_DISPLAY_NAMES.get(metric, metric)


def write_csv(
    session: SessionData,
    output_path: str | None = None,
    include_averages: bool = True,
    metric_order: list[str] | None = None,
) -> str:
    """Write session data to a single combined CSV file.

    Args:
        session: The session data to write.
        output_path: Optional custom output path.
        include_averages: Whether to include average/consistency rows.
        metric_order: Optional list of metrics in desired column order,
            using URL mp[] parameter format. If None, uses session.metric_names.

    Returns:
        Path of the written file.
    """
    filepath = output_path or f"trackman_{session.report_id}.csv"

    if metric_order is not None:
        ordered_metrics = _order_metrics_by_priority(session.metric_names, metric_order)
    else:
        ordered_metrics = session.metric_names

    # Check if any shots have tags
    has_tags = any(shot.tag for club in session.club_groups for shot in club.shots)

    # Build header row
    base_headers = ["Date", "Report ID", "Club"]
    if has_tags:
        base_headers.append("Tag")
    base_headers += ["Shot #", "Type"]
    metric_headers = [_get_display_name(m) for m in ordered_metrics]
    headers = base_headers + metric_headers

    rows: list[dict[str, str]] = []

    for club in session.club_groups:
        # Individual shots
        for shot in club.shots:
            row: dict[str, str] = {
                "Date": session.date,
                "Report ID": session.report_id,
                "Club": club.club_name,
                "Shot #": str(shot.shot_number + 1),
                "Type": "Shot",
            }
            if has_tags:
                row["Tag"] = shot.tag
            for metric in ordered_metrics:
                display = _get_display_name(metric)
                row[display] = shot.metrics.get(metric, "")
            rows.append(row)

        # Average row
        if include_averages and club.averages:
            row = {
                "Date": session.date,
                "Report ID": session.report_id,
                "Club": club.club_name,
                "Shot #": "",
                "Type": "Average",
            }
            if has_tags:
                row["Tag"] = ""
            for metric in ordered_metrics:
                display = _get_display_name(metric)
                row[display] = club.averages.get(metric, "")
            rows.append(row)

        # Consistency row
        if include_averages and club.consistency:
            row = {
                "Date": session.date,
                "Report ID": session.report_id,
                "Club": club.club_name,
                "Shot #": "",
                "Type": "Consistency",
            }
            if has_tags:
                row["Tag"] = ""
            for metric in ordered_metrics:
                display = _get_display_name(metric)
                row[display] = club.consistency.get(metric, "")
            rows.append(row)

    with open(filepath, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()
        writer.writerows(rows)

    logger.info(f"Wrote {len(rows)} rows to {filepath}")
    return filepath


def _order_metrics_by_priority(
    all_metrics: list[str], priority_order: list[str]
) -> list[str]:
    """Order metrics by priority order, keeping remaining metrics at the end.

    Args:
        all_metrics: All available metrics.
        priority_order: Desired priority order (from mp[] params).

    Returns:
        Metrics ordered with priority first, then remaining in original order.
    """
    result = []
    seen = set()

    for metric in priority_order:
        if metric in all_metrics and metric not in seen:
            result.append(metric)
            seen.add(metric)

    for metric in all_metrics:
        if metric not in seen:
            result.append(metric)

    return result
