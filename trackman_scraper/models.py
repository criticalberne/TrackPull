"""Data models for Trackman session data."""

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class Shot:
    """A single shot's data."""

    shot_number: int
    metrics: dict[str, str] = field(default_factory=dict)
    tag: str = ""


@dataclass
class ClubGroup:
    """A group of shots for one club."""

    club_name: str
    shots: list[Shot] = field(default_factory=list)
    averages: dict[str, str] = field(default_factory=dict)
    consistency: dict[str, str] = field(default_factory=dict)


@dataclass
class SessionData:
    """Complete session data."""

    date: str
    report_id: str
    url_type: str  # "report" or "activity"
    club_groups: list[ClubGroup] = field(default_factory=list)
    raw_api_data: Optional[dict] = None
    metric_names: list[str] = field(default_factory=list)
    metadata_params: dict[str, str] = field(default_factory=dict)
