/**
 * Shared constants including CSS selectors and configuration.
 * Based on Python scraper constants.py implementation.
 */

// Complete list of all known Trackman metrics (URL parameter names)
export const ALL_METRICS = [
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
  "SpinLoft",
  "LaunchAngle",
  "LaunchDirection",
  "Carry",
  "Total",
  "Side",
  "SideTotal",
  "CarrySide",
  "TotalSide",
  "Height",
  "MaxHeight",
  "Curve",
  "LandingAngle",
  "HangTime",
  "LowPointDistance",
  "ImpactHeight",
  "ImpactOffset",
  "Tempo",
] as const;

// Metrics split into groups for multi-page-load HTML fallback
export const METRIC_GROUPS = [
  [
    "ClubSpeed",
    "BallSpeed",
    "SmashFactor",
    "AttackAngle",
    "ClubPath",
    "FaceAngle",
    "FaceToPath",
    "SwingDirection",
    "DynamicLoft",
    "SpinLoft",
  ],
  [
    "SpinRate",
    "SpinAxis",
    "LaunchAngle",
    "LaunchDirection",
    "Carry",
    "Total",
    "Side",
    "SideTotal",
    "CarrySide",
    "TotalSide",
    "Height",
    "MaxHeight",
    "Curve",
    "LandingAngle",
    "HangTime",
    "LowPointDistance",
    "ImpactHeight",
    "ImpactOffset",
    "Tempo",
  ],
] as const;

// Display names: URL param name -> human-readable CSV header
export const METRIC_DISPLAY_NAMES: Record<string, string> = {
  ClubSpeed: "Club Speed",
  BallSpeed: "Ball Speed",
  SmashFactor: "Smash Factor",
  AttackAngle: "Attack Angle",
  ClubPath: "Club Path",
  FaceAngle: "Face Angle",
  FaceToPath: "Face To Path",
  SwingDirection: "Swing Direction",
  DynamicLoft: "Dynamic Loft",
  SpinRate: "Spin Rate",
  SpinAxis: "Spin Axis",
  SpinLoft: "Spin Loft",
  LaunchAngle: "Launch Angle",
  LaunchDirection: "Launch Direction",
  Carry: "Carry",
  Total: "Total",
  Side: "Side",
  SideTotal: "Side Total",
  CarrySide: "Carry Side",
  TotalSide: "Total Side",
  Height: "Height",
  MaxHeight: "Max Height",
  Curve: "Curve",
  LandingAngle: "Landing Angle",
  HangTime: "Hang Time",
  LowPointDistance: "Low Point",
  ImpactHeight: "Impact Height",
  ImpactOffset: "Impact Offset",
  Tempo: "Tempo",
};

// CSS class selectors (from Trackman's rendered HTML)
export const CSS_DATE = "date";
export const CSS_RESULTS_WRAPPER = "player-and-results-table-wrapper";
export const CSS_RESULTS_TABLE = "ResultsTable";
export const CSS_CLUB_TAG = "group-tag";
export const CSS_PARAM_NAMES_ROW = "parameter-names-row";
export const CSS_PARAM_NAME = "parameter-name";
export const CSS_SHOT_DETAIL_ROW = "row-with-shot-details";
export const CSS_AVERAGE_VALUES = "average-values";
export const CSS_CONSISTENCY_VALUES = "consistency-values";

// API URL patterns that likely indicate an API data response
export const API_URL_PATTERNS = [
  "api.trackmangolf.com",
  "trackmangolf.com/api",
  "/api/",
  "/reports/",
  "/activities/",
  "/shots/",
  "graphql",
];

// Timeouts (milliseconds)
export const PAGE_LOAD_TIMEOUT = 30_000;
export const DATA_LOAD_TIMEOUT = 15_000;

// Trackman base URL
export const BASE_URL = "https://web-dynamic-reports.trackmangolf.com/";

// Storage keys for Chrome extension (aligned between background and popup)
export const STORAGE_KEYS = {
  TRACKMAN_DATA: "trackmanData",
  UNIT_PREF: "unitPreference",
} as const;
