/**
 * Unit normalization utilities for Trackman measurements.
 * 
 * Trackman uses nd_* parameters to specify units:
 * - nd_001, nd_002, etc. define unit systems for different measurement groups
 * - Common values: 789012 = yards/degrees, 789013 = meters/radians
 */

export type UnitSystemId = "789012" | "789013" | "789014" | string;

export type SpeedUnit = "mph" | "m/s";
export type DistanceUnit = "yards" | "meters";
export type SmallDistanceUnit = "inches" | "cm";
export interface UnitChoice { speed: SpeedUnit; distance: DistanceUnit }
export const DEFAULT_UNIT_CHOICE: UnitChoice = { speed: "mph", distance: "yards" };

/**
 * Trackman unit system definitions.
 * Maps nd_* parameter values to actual units for each metric.
 */
export const UNIT_SYSTEMS: Record<UnitSystemId, UnitSystem> = {
  // Imperial (yards, degrees) - most common
  "789012": {
    id: "789012",
    name: "Imperial",
    distanceUnit: "yards",
    angleUnit: "degrees",
    speedUnit: "mph",
  },
  // Metric (meters, radians)
  "789013": {
    id: "789013",
    name: "Metric (rad)",
    distanceUnit: "meters",
    angleUnit: "radians",
    speedUnit: "km/h",
  },
  // Metric (meters, degrees) - less common
  "789014": {
    id: "789014",
    name: "Metric (deg)",
    distanceUnit: "meters",
    angleUnit: "degrees",
    speedUnit: "km/h",
  },
};

/**
 * Unit system configuration.
 */
export interface UnitSystem {
  id: UnitSystemId;
  name: string;
  distanceUnit: "yards" | "meters";
  angleUnit: "degrees" | "radians";
  speedUnit: "mph" | "km/h" | "m/s";
}

/**
 * Metrics that use distance units.
 */
export const DISTANCE_METRICS = new Set([
  "Carry",
  "Total",
  "Side",
  "SideTotal",
  "CarrySide",
  "TotalSide",
  "Height",
  "MaxHeight",
  "Curve",
]);

/**
 * Metrics that use small distance units (inches/cm).
 * These values come from the API in meters but are too small for yards/meters.
 */
export const SMALL_DISTANCE_METRICS = new Set([
  "LowPointDistance",
]);

/**
 * Metrics that use angle units.
 */
export const ANGLE_METRICS = new Set([
  "AttackAngle",
  "ClubPath",
  "FaceAngle",
  "FaceToPath",
  "DynamicLoft",
  "LaunchAngle",
  "LaunchDirection",
  "LandingAngle",
]);

/**
 * Metrics that use speed units.
 */
export const SPEED_METRICS = new Set([
  "ClubSpeed",
  "BallSpeed",
  "Tempo",
]);

/**
 * Default unit system (Imperial - yards/degrees).
 */
export const DEFAULT_UNIT_SYSTEM: UnitSystem = UNIT_SYSTEMS["789012"];

/**
 * Speed unit display labels for CSV headers.
 */
export const SPEED_LABELS: Record<SpeedUnit, string> = {
  "mph": "mph",
  "m/s": "m/s",
};

/**
 * Distance unit display labels for CSV headers.
 */
export const DISTANCE_LABELS: Record<DistanceUnit, string> = {
  "yards": "yds",
  "meters": "m",
};

/**
 * Small distance unit display labels for CSV headers.
 */
export const SMALL_DISTANCE_LABELS: Record<SmallDistanceUnit, string> = {
  "inches": "in",
  "cm": "cm",
};

/**
 * Migrate a legacy unitPreference string to a UnitChoice object.
 */
export function migrateLegacyPref(stored: string | undefined): UnitChoice {
  switch (stored) {
    case "metric":
      return { speed: "m/s", distance: "meters" };
    case "hybrid":
      return { speed: "mph", distance: "meters" };
    case "imperial":
    default:
      return { speed: "mph", distance: "yards" };
  }
}

/**
 * Fixed unit labels for metrics whose units don't vary by preference.
 */
export const FIXED_UNIT_LABELS: Record<string, string> = {
  SpinRate: "rpm",
  HangTime: "s",
};

/**
 * Extract nd_* parameters from metadata_params.
 * 
 * @param metadataParams - The metadata_params object from SessionData
 * @returns Object mapping metric group IDs to unit system IDs
 */
export function extractUnitParams(
  metadataParams: Record<string, string>
): Record<string, UnitSystemId> {
  const result: Record<string, UnitSystemId> = {};

  for (const [key, value] of Object.entries(metadataParams)) {
    const match = key.match(/^nd_([a-z0-9]+)$/i);
    if (match) {
      const groupKey = match[1].toLowerCase();
      result[groupKey] = value as UnitSystemId;
    }
  }

  return result;
}

/**
 * Determine the unit system ID from metadata params.
 * Uses nd_001 as primary, falls back to default.
 * 
 * @param metadataParams - The metadata_params object
 * @returns The unit system ID string
 */
export function getUnitSystemId(
  metadataParams: Record<string, string>
): UnitSystemId {
  const unitParams = extractUnitParams(metadataParams);
  return unitParams["001"] || "789012"; // Default to Imperial
}

/**
 * Get the full unit system configuration.
 * 
 * @param metadataParams - The metadata_params object
 * @returns The UnitSystem configuration
 */
export function getUnitSystem(
  metadataParams: Record<string, string>
): UnitSystem {
  const id = getUnitSystemId(metadataParams);
  return UNIT_SYSTEMS[id] || DEFAULT_UNIT_SYSTEM;
}

/**
 * Get the unit system representing what the API actually returns.
 * The API always returns speed in m/s and distance in meters,
 * but the angle unit depends on the report's nd_001 parameter.
 */
export function getApiSourceUnitSystem(
  metadataParams: Record<string, string>
): UnitSystem {
  const reportSystem = getUnitSystem(metadataParams);
  return {
    id: "api" as UnitSystemId,
    name: "API Source",
    distanceUnit: "meters",
    angleUnit: reportSystem.angleUnit,
    speedUnit: "m/s",
  };
}

/**
 * Get the unit label for a metric based on user's unit choice.
 * Returns empty string for dimensionless metrics (e.g. SmashFactor, SpinRate).
 */
export function getMetricUnitLabel(
  metricName: string,
  unitChoice: UnitChoice = DEFAULT_UNIT_CHOICE
): string {
  if (metricName in FIXED_UNIT_LABELS) return FIXED_UNIT_LABELS[metricName];
  if (SPEED_METRICS.has(metricName)) return SPEED_LABELS[unitChoice.speed];
  if (SMALL_DISTANCE_METRICS.has(metricName)) return SMALL_DISTANCE_LABELS[getSmallDistanceUnit(unitChoice)];
  if (DISTANCE_METRICS.has(metricName)) return DISTANCE_LABELS[unitChoice.distance];
  if (ANGLE_METRICS.has(metricName)) return "°";
  return "";
}

/**
 * Convert a distance value between units.
 * 
 * @param value - The value to convert
 * @param fromUnit - Source unit ("yards" or "meters")
 * @param toUnit - Target unit ("yards" or "meters")
 * @returns Converted value, or original if units match
 */
export function convertDistance(
  value: number | string | null,
  fromUnit: "yards" | "meters",
  toUnit: "yards" | "meters"
): number | string | null {
  if (value === null || value === "") return value;

  const numValue = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(numValue)) return value;

  if (fromUnit === toUnit) return numValue;

  // Convert to meters first, then to target unit
  const inMeters = fromUnit === "yards" ? numValue * 0.9144 : numValue;
  return toUnit === "yards" ? inMeters / 0.9144 : inMeters;
}

/**
 * Convert an angle value between units.
 * 
 * @param value - The value to convert
 * @param fromUnit - Source unit ("degrees" or "radians")
 * @param toUnit - Target unit ("degrees" or "radians")
 * @returns Converted value, or original if units match
 */
export function convertAngle(
  value: number | string | null,
  fromUnit: "degrees" | "radians",
  toUnit: "degrees" | "radians"
): number | string | null {
  if (value === null || value === "") return value;

  const numValue = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(numValue)) return value;

  if (fromUnit === toUnit) return numValue;

  // Convert to degrees first, then to target unit
  const inDegrees = fromUnit === "degrees" ? numValue : (numValue * 180 / Math.PI);
  return toUnit === "degrees" ? inDegrees : (inDegrees * Math.PI / 180);
}

/**
 * Convert a speed value between units.
 *
 * @param value - The value to convert
 * @param fromUnit - Source unit ("mph", "km/h", or "m/s")
 * @param toUnit - Target unit ("mph", "km/h", or "m/s")
 * @returns Converted value, or original if units match
 */
export function convertSpeed(
  value: number | string | null,
  fromUnit: "mph" | "km/h" | "m/s",
  toUnit: "mph" | "km/h" | "m/s"
): number | string | null {
  if (value === null || value === "") return value;

  const numValue = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(numValue)) return value;

  if (fromUnit === toUnit) return numValue;

  // Convert to mph first, then to target unit
  let inMph: number;
  if (fromUnit === "mph") inMph = numValue;
  else if (fromUnit === "km/h") inMph = numValue / 1.609344;
  else inMph = numValue * 2.23694; // m/s to mph

  if (toUnit === "mph") return inMph;
  if (toUnit === "km/h") return inMph * 1.609344;
  return inMph / 2.23694; // mph to m/s
}

/**
 * Get the small distance unit based on the user's distance choice.
 * Yards users see inches; meters users see cm.
 */
export function getSmallDistanceUnit(unitChoice: UnitChoice = DEFAULT_UNIT_CHOICE): SmallDistanceUnit {
  return unitChoice.distance === "yards" ? "inches" : "cm";
}

/**
 * Convert a distance value from meters to a small distance unit (inches or cm).
 */
export function convertSmallDistance(
  value: number | string | null,
  toSmallUnit: SmallDistanceUnit
): number | string | null {
  if (value === null || value === "") return value;

  const numValue = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(numValue)) return value;

  return toSmallUnit === "inches" ? numValue * 39.3701 : numValue * 100;
}

/**
 * Normalize a metric value based on unit system alignment and user's unit choice.
 *
 * Converts values from the source units to target output units:
 * - Distance: yards or meters (per unitChoice.distance)
 * - Angles: always degrees
 * - Speed: mph or m/s (per unitChoice.speed)
 *
 * @param value - The raw metric value
 * @param metricName - The name of the metric being normalized
 * @param reportUnitSystem - The unit system used in the source data
 * @param unitChoice - User's unit choice (defaults to mph + yards)
 * @returns Normalized value as number or string (null if invalid)
 */
export function normalizeMetricValue(
  value: MetricValue,
  metricName: string,
  reportUnitSystem: UnitSystem,
  unitChoice: UnitChoice = DEFAULT_UNIT_CHOICE
): MetricValue {
  const numValue = parseNumericValue(value);
  if (numValue === null) return value;

  let converted: number;

  if (SMALL_DISTANCE_METRICS.has(metricName)) {
    converted = convertSmallDistance(
      numValue,
      getSmallDistanceUnit(unitChoice)
    ) as number;
  } else if (DISTANCE_METRICS.has(metricName)) {
    converted = convertDistance(
      numValue,
      reportUnitSystem.distanceUnit,
      unitChoice.distance
    ) as number;
  } else if (ANGLE_METRICS.has(metricName)) {
    converted = convertAngle(
      numValue,
      reportUnitSystem.angleUnit,
      "degrees"
    ) as number;
  } else if (SPEED_METRICS.has(metricName)) {
    converted = convertSpeed(
      numValue,
      reportUnitSystem.speedUnit,
      unitChoice.speed
    ) as number;
  } else {
    converted = numValue;
  }

  // SpinRate: round to whole numbers
  if (metricName === "SpinRate") return Math.round(converted);

  // Round to 1 decimal place for consistency
  return Math.round(converted * 10) / 10;
}

/**
 * Parse a numeric value from MetricValue type.
 */
function parseNumericValue(value: MetricValue): number | null {
  if (value === null || value === "") return null;
  if (typeof value === "number") return isNaN(value) ? null : value;
  
  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : parsed;
}

export type MetricValue = string | number | null;
