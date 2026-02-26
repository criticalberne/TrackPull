"""Parse Trackman report URLs and build metric-specific URLs."""

from urllib.parse import urlparse, parse_qs, urlencode

from .constants import ALL_METRICS, METRIC_GROUPS


def parse_trackman_url(url: str) -> dict:
    """Parse a Trackman URL and extract key parameters.

    Supports ?a= (activity), ?r= (report), and ?ReportId= formats.
    Also extracts mp[] query parameters to define metric column order,
    and sgos[] query parameters for shot-group filtering.

    Returns dict with keys: original_url, base, params, url_type, id, metric_order, shot_group_ids.
    """
    parsed = urlparse(url)
    params = parse_qs(parsed.query, keep_blank_values=True)

    result = {
        "original_url": url,
        "base": f"{parsed.scheme}://{parsed.netloc}{parsed.path}",
        "params": params,
        "metric_order": [],
        "shot_group_ids": [],
    }

    if "a" in params:
        result["url_type"] = "activity"
        result["id"] = params["a"][0]
    elif "r" in params:
        result["url_type"] = "report"
        result["id"] = params["r"][0]
    elif "ReportId" in params:
        result["url_type"] = "report"
        result["id"] = params["ReportId"][0]
    else:
        raise ValueError("URL must contain an ?a=, ?r=, or ?ReportId= parameter")

    metric_order = _extract_metric_order(params)
    shot_group_ids = _extract_shot_group_ids(params)
    result["metric_order"] = metric_order
    result["shot_group_ids"] = shot_group_ids

    return result


def _extract_metric_order(params: dict) -> list[str]:
    """Extract and deduplicate metrics from mp[] query parameters.

    Args:
        params: Parsed URL query parameters.

    Returns:
        List of metric names in the order they appear in mp[] params,
        with duplicates removed and empty values skipped.
    """
    metric_order = []
    if "mp[]" in params:
        for value in params["mp[]"]:
            if value and value not in metric_order:
                metric_order.append(value)
    return metric_order


def _extract_shot_group_ids(params: dict) -> list[str]:
    """Extract and deduplicate shot-group IDs from sgos[] query parameters.

    Args:
        params: Parsed URL query parameters.

    Returns:
        List of shot-group IDs in the order they appear in sgos[] params,
        with duplicates removed and empty values skipped.
    """
    shot_group_ids = []
    if "sgos[]" in params:
        for value in params["sgos[]"]:
            if value and value not in shot_group_ids:
                shot_group_ids.append(value)
    return shot_group_ids


def _build_base_params(url_info: dict) -> dict:
    """Copy params from the original URL, stripping out mp[] and sgos[] entries."""
    base = {}
    for key, values in url_info["params"].items():
        # Skip any metric-parameter or shot-group keys (mp[], sgos[])
        if (
            key == "mp[]"
            or key.startswith("mp[")
            or key == "sgos[]"
            or key.startswith("sgos[")
        ):
            continue
        base[key] = values
    return base


def _params_to_query_string(params: dict, metrics: list[str]) -> str:
    """Encode params dict + a list of metrics into a URL query string."""
    parts: list[str] = []
    for key, values in params.items():
        for v in values if isinstance(values, list) else [values]:
            parts.append(f"{urlencode({key: v})}")
    for metric in metrics:
        parts.append(f"mp%5B%5D={metric}")
    return "&".join(parts)


def build_metric_urls(
    url_info: dict,
    metric_groups: list[list[str]] | None = None,
) -> list[str]:
    """Build one URL per metric group, preserving all non-metric params."""
    if metric_groups is None:
        metric_groups = METRIC_GROUPS

    base_params = _build_base_params(url_info)
    urls: list[str] = []

    for group in metric_groups:
        qs = _params_to_query_string(base_params, group)
        urls.append(f"{url_info['base']}?{qs}")

    return urls


def build_single_url_all_metrics(url_info: dict) -> str:
    """Build a single URL with ALL metrics (for API interception load)."""
    return build_metric_urls(url_info, [ALL_METRICS])[0]
