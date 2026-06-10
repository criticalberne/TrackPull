/**
 * Shared constants and configuration.
 */

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

// Custom prompt storage keys
export const CUSTOM_PROMPT_KEY_PREFIX = "customPrompt_" as const;
export const CUSTOM_PROMPT_IDS_KEY = "customPromptIds" as const;

// Storage keys for Chrome extension (aligned between background and popup)
export const STORAGE_KEYS = {
  TRACKMAN_DATA: "trackmanData",
  SPEED_UNIT: "speedUnit",
  DISTANCE_UNIT: "distanceUnit",
  SELECTED_PROMPT_ID: "selectedPromptId",
  AI_SERVICE: "aiService",
  HITTING_SURFACE: "hittingSurface",
  INCLUDE_AVERAGES: "includeAverages",
  SESSION_HISTORY: "sessionHistory",
  IMPORT_STATUS: "importStatus",
} as const;
