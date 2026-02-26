"""Trackman metric names, CSS selectors, and configuration constants."""

# Complete list of all known Trackman metrics (URL parameter names)
ALL_METRICS = [
    "ClubSpeed",
    "BallSpeed",
    "SmashFactor",
    "AttackAngle",
    "ClubPath",
    "FaceAngle",
    "FaceToPath",
    "SwingDirection",
    "DynamicLoft",
    "SpinRate",
    "SpinAxis",
    "Carry",
    "Total",
    "Side",
    "SideTotal",
    "Height",
    "LowPointDistance",
    "ImpactHeight",
    "ImpactOffset",
    "Tempo",
]

# Metrics split into groups for multi-page-load HTML fallback
# (the Trackman page only renders columns matching the mp[] URL params)
METRIC_GROUPS = [
    [
        "ClubSpeed", "BallSpeed", "SmashFactor", "AttackAngle", "ClubPath",
        "FaceAngle", "FaceToPath", "SwingDirection", "DynamicLoft",
    ],
    [
        "SpinRate", "SpinAxis", "Carry", "Total", "Side",
        "SideTotal", "Height", "LowPointDistance", "ImpactHeight",
        "ImpactOffset", "Tempo",
    ],
]

# Display names: URL param name -> human-readable CSV header
METRIC_DISPLAY_NAMES = {
    "ClubSpeed": "Club Speed",
    "BallSpeed": "Ball Speed",
    "SmashFactor": "Smash Factor",
    "AttackAngle": "Attack Angle",
    "ClubPath": "Club Path",
    "FaceAngle": "Face Angle",
    "FaceToPath": "Face To Path",
    "SwingDirection": "Swing Direction",
    "DynamicLoft": "Dynamic Loft",
    "SpinRate": "Spin Rate",
    "SpinAxis": "Spin Axis",
    "Carry": "Carry",
    "Total": "Total",
    "Side": "Side",
    "SideTotal": "Side Total",
    "Height": "Height",
    "LowPointDistance": "Low Point",
    "ImpactHeight": "Impact Height",
    "ImpactOffset": "Impact Offset",
    "Tempo": "Tempo",
}

# CSS class selectors (from Trackman's rendered HTML)
CSS_DATE = "date"
CSS_RESULTS_WRAPPER = "player-and-results-table-wrapper"
CSS_RESULTS_TABLE = "ResultsTable"
CSS_CLUB_TAG = "group-tag"
CSS_PARAM_NAMES_ROW = "parameter-names-row"
CSS_PARAM_NAME = "parameter-name"
CSS_SHOT_DETAIL_ROW = "row-with-shot-details"
CSS_AVERAGE_VALUES = "average-values"
CSS_CONSISTENCY_VALUES = "consistency-values"

# URL patterns that likely indicate an API data response
API_URL_PATTERNS = [
    "api.trackmangolf.com",
    "trackmangolf.com/api",
    "/api/",
    "/reports/",
    "/activities/",
    "/shots/",
    "graphql",
]

# Timeouts (milliseconds)
PAGE_LOAD_TIMEOUT = 30_000
DATA_LOAD_TIMEOUT = 15_000

# Trackman base URL
BASE_URL = "https://web-dynamic-reports.trackmangolf.com/"
