"""API response interception strategy using Playwright network events."""

import asyncio
import json
import logging
from typing import Any, Optional
from urllib.parse import urlparse

from playwright.async_api import Page, Response

from .constants import API_URL_PATTERNS, DATA_LOAD_TIMEOUT
from .models import ClubGroup, SessionData, Shot

logger = logging.getLogger(__name__)


def contains_strokegroups(data: Any) -> bool:
    """Detect if a payload contains valid StrokeGroups (Trackman activity reports).

    A valid StrokeGroups payload has:
    - 'StrokeGroups' key at the top level
    - Value is a non-empty list

    Args:
        data: The JSON-parsed response body to check

    Returns:
        True if the payload contains valid StrokeGroups, False otherwise
    """
    return (
        isinstance(data, dict)
        and "StrokeGroups" in data
        and isinstance(data["StrokeGroups"], list)
        and len(data["StrokeGroups"]) > 0
    )


# Metrics to extract from the API Measurement/NormalizedMeasurement objects.
# These are the scalar numeric fields (excludes trajectories, IDs, etc.).
_METRIC_KEYS = {
    "ClubSpeed",
    "AttackAngle",
    "ClubPath",
    "DynamicLoft",
    "FaceAngle",
    "SpinLoft",
    "FaceToPath",
    "SwingDirection",
    "LowPointDistance",
    "BallSpeed",
    "SmashFactor",
    "LaunchAngle",
    "LaunchDirection",
    "SpinRate",
    "SpinAxis",
    "Curve",
    "MaxHeight",
    "Carry",
    "Total",
    "CarrySide",
    "TotalSide",
    "LandingAngle",
    "HangTime",
    "ImpactHeight",
    "ImpactOffset",
    "Tempo",
}


class APIInterceptor:
    """Captures JSON API responses from the Trackman SPA and attempts to
    parse shot data from them."""

    def __init__(self) -> None:
        self.captured_responses: list[dict] = []
        self.data_found = asyncio.Event()
        self.report_json_captures: dict[str, dict] = {}

    async def handle_response(self, response: Response) -> None:
        """Callback attached to page.on('response')."""
        url = response.url
        content_type = response.headers.get("content-type", "")

        # Only care about JSON responses
        if "json" not in content_type:
            return

        try:
            body = await response.json()
        except Exception:
            return

        is_api = any(pat in url for pat in API_URL_PATTERNS)

        self.captured_responses.append(
            {
                "url": url,
                "status": response.status,
                "body": body,
                "is_api": is_api,
            }
        )
        logger.debug(f"Captured JSON: {url[:120]} (status={response.status})")

        # Capture report page JSON responses for later use
        self._capture_report_json(url, response.status, body)

        if self._looks_like_shot_data(body):
            logger.info(f"Shot data detected in: {url}")
            self.data_found.set()

    def _capture_report_json(self, url: str, status: int, body: dict) -> None:
        """Store JSON response from report pages for later retrieval."""
        is_api = any(pat in url for pat in API_URL_PATTERNS)

        if not is_api:
            return

        # Use URL hash (path + query without params) as key
        parsed_url = urlparse(url)
        cache_key = f"{parsed_url.path}?{parsed_url.query}"

        self.report_json_captures[cache_key] = {
            "url": url,
            "status": status,
            "body": body,
            "captured_at": asyncio.get_event_loop().time(),
        }

    # ------------------------------------------------------------------
    # Heuristic detection
    # ------------------------------------------------------------------

    @staticmethod
    def _contains_strokegroups(data: object) -> bool:
        """Return True if data contains StrokeGroups (Trackman activity reports).

        Uses the standalone contains_strokegroups function for consistency.
        """
        return contains_strokegroups(data)

    @staticmethod
    def _looks_like_shot_data(data: object) -> bool:
        """Return True if *data* likely contains Trackman shot information."""
        if not isinstance(data, dict):
            return False
        # Trackman activity reports have StrokeGroups at the top level
        if "StrokeGroups" in data:
            return True
        text = json.dumps(data, default=str).lower()
        indicators = [
            "ballspeed",
            "clubspeed",
            "carry",
            "spinrate",
            "strokegroups",
            "strokes",
            "measurement",
        ]
        return sum(1 for ind in indicators if ind in text) >= 3

    @staticmethod
    def _parse_measurement(stroke: dict) -> dict:
        """Extract measurement data from a stroke, preferring NormalizedMeasurement.

        Trackman provides both Measurement (raw sensor data) and
        NormalizedMeasurement (adjusted for environmental conditions).
        This method merges them, using NormalizedMeasurement values where available
        and falling back to Measurement for missing keys.

        Args:
            stroke: A stroke dictionary potentially containing Measurement/NormalizedMeasurement

        Returns:
            Merged measurement dict with NormalizedMeasurement preferred
        """
        normalized = stroke.get("NormalizedMeasurement", {}) or {}
        raw = stroke.get("Measurement", {}) or {}

        if not normalized and not raw:
            return {}

        merged = {**raw}
        merged.update(normalized)
        return merged

    @staticmethod
    def _extract_numeric_value(val: Any, key: str) -> Optional[float]:
        """Safely extract numeric value from measurement data.

        Handles int, float, and string representations of numbers.

        Args:
            val: Value to convert (can be int, float, or string)
            key: Metric name for error messages

        Returns:
            Numeric value as float, or None if conversion fails
        """
        if isinstance(val, (int, float)):
            return float(val)
        if isinstance(val, str):
            try:
                return float(val.strip())
            except ValueError:
                logger.debug(f"Cannot convert '{key}={val}' to float")
                return None
        return None

    @staticmethod
    def extract_scalar_metrics(
        measurement: dict[str, Any], metric_keys: set[str] = _METRIC_KEYS
    ) -> dict[str, Optional[float]]:
        """Extract scalar metric fields from measurement data using given keys.

        Filters measurement dictionary to only include known scalar metrics and
        converts them to float values.

        Args:
            measurement: Merged measurement dictionary containing metric key-value pairs
            metric_keys: Set of valid metric key names to extract (defaults to _METRIC_KEYS)

        Returns:
            Dictionary mapping metric names to their numeric float values, excluding unknown keys
        """
        return {
            key: APIInterceptor._extract_numeric_value(val, key)
            for key, val in measurement.items()
            if key in metric_keys
        }

    @staticmethod
    def _extract_metrics_from_measurement(
        measurement: dict,
    ) -> dict[str, Optional[str]]:
        """Extract and format metrics from measurement data.

        Args:
            measurement: Merged measurement dictionary

        Returns:
            Dictionary of metric names to formatted string values
        """
        numeric_metrics = APIInterceptor.extract_scalar_metrics(measurement)
        return {
            key: str(round(val, 1))
            for key, val in numeric_metrics.items()
            if val is not None
        }

    # ------------------------------------------------------------------
    # Parsing
    # ------------------------------------------------------------------

    def parse_api_data(self, url_info: dict) -> Optional[SessionData]:
        """Try to parse session data from captured responses."""
        # Prioritize: API-flagged responses first, then by payload size
        candidates = sorted(
            self.captured_responses,
            key=lambda r: (not r["is_api"], -len(json.dumps(r["body"], default=str))),
        )

        for resp in candidates:
            if not self._looks_like_shot_data(resp["body"]):
                continue
            try:
                session = self._try_parse(resp["body"], url_info)
                if session and session.club_groups:
                    session.raw_api_data = resp["body"]
                    logger.info(
                        f"Parsed {len(session.club_groups)} club(s) "
                        f"from {resp['url'][:100]}"
                    )
                    return session
            except Exception as exc:
                logger.warning(
                    f"Parse failed for {resp['url'][:80]}: {exc}. "
                    f"Raw payload stored in captured_responses for debugging."
                )

        return None

    def _try_parse(self, data: object, url_info: dict) -> Optional[SessionData]:
        """Attempt to extract SessionData from a JSON payload."""
        if not isinstance(data, dict):
            return None

        top_keys = list(data.keys())
        logger.debug(f"API top-level keys: {top_keys}")

        # Primary pattern: Trackman activity report
        # Structure: { StrokeGroups: [ { Club, Date, Strokes: [ { Measurement, NormalizedMeasurement } ] } ] }
        if self._contains_strokegroups(data):
            return self._parse_trackman_activity(data, url_info)

        return None

    def _parse_trackman_activity(
        self, data: dict, url_info: dict
    ) -> Optional[SessionData]:
        """Parse the Trackman getactivityreport API response."""
        stroke_groups = data["StrokeGroups"]

        # Extract date: try Time dict, then first StrokeGroup's Date
        time_info = data.get("Time")
        if isinstance(time_info, dict):
            date_str = str(time_info.get("Date", "Unknown"))
        elif stroke_groups and isinstance(stroke_groups[0], dict):
            date_str = str(stroke_groups[0].get("Date", "Unknown"))
        else:
            date_str = "Unknown"

        session = SessionData(
            date=date_str,
            report_id=url_info["id"],
            url_type=url_info["url_type"],
            metadata_params={},
        )

        # Store metric order from URL for CSV column ordering
        if "metric_order" in url_info:
            session.url_metric_order = url_info["metric_order"]

        all_metric_names: set[str] = set()

        for sg in stroke_groups:
            if not isinstance(sg, dict):
                continue

            club_name = sg.get("Club", "Unknown")
            club_group = ClubGroup(club_name=club_name)

            strokes = sg.get("Strokes", [])
            shot_values: list[dict[str, float]] = []

            for i, stroke in enumerate(strokes):
                if not isinstance(stroke, dict):
                    continue

                meas = self._parse_measurement(stroke)
                metrics = self._extract_metrics_from_measurement(meas)

                all_metric_names.update(metrics.keys())
                club_group.shots.append(Shot(shot_number=i, metrics=metrics))

                # Collect numeric values for computing averages using extract_scalar_metrics
                numeric = APIInterceptor.extract_scalar_metrics(meas)
                shot_values.append({k: v for k, v in numeric.items() if v is not None})

            # Compute averages from the raw data
            if shot_values:
                for key in all_metric_names:
                    vals = [sv[key] for sv in shot_values if key in sv]
                    if vals:
                        club_group.averages[key] = str(round(sum(vals) / len(vals), 1))

            if club_group.shots:
                session.club_groups.append(club_group)

        session.metric_names = sorted(all_metric_names)
        return session if session.club_groups else None

    # ------------------------------------------------------------------
    # Main entry point
    # ------------------------------------------------------------------

    async def intercept(
        self, page: Page, url: str, url_info: dict
    ) -> Optional[SessionData]:
        """Load the page, capture API responses, and try to parse shot data."""
        page.on("response", self.handle_response)

        await page.goto(url, wait_until="domcontentloaded")

        # Wait for an API response that looks like shot data
        try:
            await asyncio.wait_for(
                self.data_found.wait(),
                timeout=DATA_LOAD_TIMEOUT / 1000,
            )
        except asyncio.TimeoutError:
            logger.warning("Timed out waiting for shot-data API response")

        # Short extra wait to let any trailing responses arrive
        await asyncio.sleep(1)

        if self.captured_responses:
            return self.parse_api_data(url_info)

        return None

    # ------------------------------------------------------------------
    # Debug helpers
    # ------------------------------------------------------------------

    def get_debug_info(self) -> str:
        """Summary of all captured responses (for --debug flag)."""
        lines = [f"\nCaptured {len(self.captured_responses)} JSON response(s):\n"]
        for r in self.captured_responses:
            body_str = json.dumps(r["body"], default=str)
            preview = body_str[:300]
            lines.append(f"  [{r['status']}] {r['url']}")
            lines.append(f"    Size: {len(body_str)} chars")
            lines.append(f"    Preview: {preview}")
            lines.append("")
        return "\n".join(lines)

    def get_report_json(self, url: str | None = None) -> dict[str, dict] | dict | None:
        """Retrieve captured JSON responses from report pages.

        Args:
            url: Optional specific URL to retrieve. If None, returns all captures.

        Returns:
            For specific URL: the capture dict or None if not found
            For all: dict mapping URL keys to capture dicts
        """
        if url is None:
            return self.report_json_captures

        parsed_url = urlparse(url)
        cache_key = f"{parsed_url.path}?{parsed_url.query}"

        # Try exact match first, then try without query params
        result = self.report_json_captures.get(cache_key)
        if result is None:
            path_only = parsed_url.path
            for key, value in self.report_json_captures.items():
                if key.startswith(path_only):
                    return value

        return result
