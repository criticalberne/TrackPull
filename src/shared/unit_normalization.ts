/**
 * Unit normalization utilities for Trackman measurements.
 * 
 * Trackman uses nd_* parameters to specify units:
 * - nd_001, nd_002, etc. define unit systems for different measurement groups
 * - Common values: 789012 = yards/degrees, 789013 = meters/radians
 */

export type UnitSystemId = "789012" | "789013" | "789014" | string;

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
  speedUnit: "mph" | "km/h";
}

/**
 * Metrics that use distance units.
 */
export const DISTANCE_METRICS = new Set([
  "Carry",
  "Total",
  "Side",
  "SideTotal",
  "Height",
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
 * @param fromUnit - Source unit ("mph" or "km/h")
 * @param toUnit - Target unit ("mph" or "km/h")
 * @returns Converted value, or original if units match
 */
export function convertSpeed(
  value: number | string | null,
  fromUnit: "mph" | "km/h",
  toUnit: "mph" | "km/h"
): number | string | null {
  if (value === null || value === "") return value;

  const numValue = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(numValue)) return value;

  if (fromUnit === toUnit) return numValue;

  // Convert to mph first, then to target unit
  const inMph = fromUnit === "mph" ? numValue : numValue / 1.609344;
  return toUnit === "mph" ? inMph : inMph * 1.609344;
}

/**
 * Normalize a metric value based on unit system alignment.
 * 
 * Converts values from the report's native units to standard output units:
 * - Distance: always yards (Imperial)
 * - Angles: always degrees
 * - Speed: always mph
 * 
 * @param value - The raw metric value
 * @param metricName - The name of the metric being normalized
 * @param reportUnitSystem - The unit system used in the source report
 * @returns Normalized value as number or string (null if invalid)
 */
export function normalizeMetricValue(
  value: MetricValue,
  metricName: string,
  reportUnitSystem: UnitSystem
): MetricValue {
  const numValue = parseNumericValue(value);
  if (numValue === null) return value;

  let converted: number;

  if (DISTANCE_METRICS.has(metricName)) {
    converted = convertDistance(
      numValue,
      reportUnitSystem.distanceUnit,
      "yards"
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
      "mph"
    ) as number;
  } else {
    // No conversion needed for this metric type
    return value;
  }

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
