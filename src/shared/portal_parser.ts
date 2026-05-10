/**
 * Portal GraphQL activity parser.
 *
 * Converts GraphQL activity responses (from Phase 22 graphql_client) into the
 * existing SessionData format, enabling portal-fetched data to flow into the
 * CSV export, AI analysis, and session history pipeline.
 *
 * Key design decisions:
 * - GRAPHQL_METRIC_ALIAS maps all 29 known camelCase GraphQL field names to
 *   PascalCase METRIC_KEYS names. Unknown fields are normalized via toPascalCase.
 * - Does NOT import METRIC_KEYS from interceptor.ts to avoid accidentally
 *   filtering unknown future fields (D-01 anti-pattern).
 * - Null/undefined/NaN values are omitted — no phantom empty metrics.
 * - Metric values are stored as strings for consistency with interceptor output.
 * - report_id is the UUID decoded from the base64 activity ID (PIPE-03 dedup).
 */

import type { SessionData, Shot, ClubGroup } from "../models/types";

// ---------------------------------------------------------------------------
// Exported types (used by Phase 24 integration)
// ---------------------------------------------------------------------------

export interface StrokeMeasurement {
  [key: string]: unknown;
}

export interface GraphQLStroke {
  club?: string | null;
  Club?: string | null;
  time?: string | null;
  targetDistance?: number | null;
  isDeleted?: boolean | null;
  isSimulated?: boolean | null;
  measurement?: StrokeMeasurement | null;
  Measurement?: StrokeMeasurement | null;
  NormalizedMeasurement?: StrokeMeasurement | null;
  [key: string]: unknown;
}

export interface GraphQLStrokeGroup {
  club?: string | null;
  Club?: string | null;
  name?: string | null;
  strokes?: GraphQLStroke[] | null;
  Strokes?: GraphQLStroke[] | null;
  [key: string]: unknown;
}

export interface GraphQLActivity {
  id: string;
  __typename?: string | null;
  kind?: string | null;
  time?: string | null;
  date?: string | null;
  strokeCount?: number | null;
  strokes?: GraphQLStroke[] | null;
  strokeGroups?: GraphQLStrokeGroup[] | null;
  StrokeGroups?: GraphQLStrokeGroup[] | null;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// GRAPHQL_METRIC_ALIAS — all 29 METRIC_KEYS from camelCase to PascalCase
// ---------------------------------------------------------------------------

const GRAPHQL_METRIC_ALIAS: Record<string, string> = {
  clubSpeed: "ClubSpeed",
  ballSpeed: "BallSpeed",
  smashFactor: "SmashFactor",
  attackAngle: "AttackAngle",
  clubPath: "ClubPath",
  faceAngle: "FaceAngle",
  faceToPath: "FaceToPath",
  swingDirection: "SwingDirection",
  swingPlane: "SwingPlane",
  dynamicLoft: "DynamicLoft",
  spinRate: "SpinRate",
  ballSpin: "SpinRate",
  spinAxis: "SpinAxis",
  spinLoft: "SpinLoft",
  launchAngle: "LaunchAngle",
  launchDirection: "LaunchDirection",
  carry: "Carry",
  total: "Total",
  side: "Side",
  sideTotal: "SideTotal",
  carrySide: "CarrySide",
  totalSide: "TotalSide",
  height: "Height",
  maxHeight: "MaxHeight",
  curve: "Curve",
  landingAngle: "LandingAngle",
  hangTime: "HangTime",
  lowPointDistance: "LowPointDistance",
  impactHeight: "ImpactHeight",
  impactOffset: "ImpactOffset",
  tempo: "Tempo",
};

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/** Convert first character to uppercase — used for unknown fields beyond METRIC_KEYS. */
function toPascalCase(key: string): string {
  return key.charAt(0).toUpperCase() + key.slice(1);
}

/** Resolve a GraphQL camelCase field name to its canonical PascalCase metric key. */
function normalizeMetricKey(graphqlKey: string): string {
  return GRAPHQL_METRIC_ALIAS[graphqlKey] ?? toPascalCase(graphqlKey);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function pickClubName(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (!isRecord(value)) return null;
  const candidate =
    value.name ??
    value.Name ??
    value.displayName ??
    value.shortName ??
    value.id;
  return typeof candidate === "string" && candidate.trim()
    ? candidate.trim()
    : null;
}

function getContainerClubName(container: Record<string, unknown>): string | null {
  return (
    pickClubName(container.club) ??
    pickClubName(container.Club) ??
    pickClubName(container.clubName) ??
    pickClubName(container.name)
  );
}

function getStrokeMeasurement(stroke: Record<string, unknown>): StrokeMeasurement | null {
  const normalized = isRecord(stroke.NormalizedMeasurement)
    ? stroke.NormalizedMeasurement
    : null;
  const measurement = isRecord(stroke.measurement)
    ? stroke.measurement
    : isRecord(stroke.Measurement)
      ? stroke.Measurement
      : null;

  if (measurement && normalized) {
    return { ...measurement, ...normalized };
  }
  return (normalized ?? measurement) as StrokeMeasurement | null;
}

function appendStroke(
  stroke: Record<string, unknown>,
  fallbackClub: string | null,
  clubMap: Map<string, Shot[]>,
  allMetricNames: Set<string>
): void {
  if (stroke.isDeleted === true || stroke.isSimulated === true) return;

  const measurement = getStrokeMeasurement(stroke);
  if (!measurement) return;

  const clubName = getContainerClubName(stroke) ?? fallbackClub ?? "Unknown";
  const shotMetrics: Record<string, string> = {};

  for (const [key, value] of Object.entries(measurement)) {
    if (value === null || value === undefined) continue;

    const numValue =
      typeof value === "number" ? value : parseFloat(String(value));
    if (isNaN(numValue)) continue;

    const normalizedKey = normalizeMetricKey(key);
    shotMetrics[normalizedKey] = `${numValue}`;
    allMetricNames.add(normalizedKey);
  }

  if (Object.keys(shotMetrics).length === 0) return;

  const shots = clubMap.get(clubName) ?? [];
  shots.push({
    shot_number: shots.length,
    metrics: shotMetrics,
  });
  clubMap.set(clubName, shots);
}

function collectStrokes(
  value: unknown,
  fallbackClub: string | null,
  clubMap: Map<string, Shot[]>,
  allMetricNames: Set<string>
): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectStrokes(item, fallbackClub, clubMap, allMetricNames);
    }
    return;
  }

  if (!isRecord(value)) return;

  const containerClub = getContainerClubName(value) ?? fallbackClub;
  if (getStrokeMeasurement(value)) {
    appendStroke(value, containerClub, clubMap, allMetricNames);
    return;
  }

  for (const [key, nested] of Object.entries(value)) {
    if (key === "measurement" || key === "Measurement" || key === "NormalizedMeasurement") {
      continue;
    }
    if (Array.isArray(nested) || isRecord(nested)) {
      collectStrokes(nested, containerClub, clubMap, allMetricNames);
    }
  }
}

/**
 * Decode a Trackman base64 activity ID to extract the UUID portion.
 *
 * Trackman encodes activity IDs as: btoa("SessionActivity\n<uuid>")
 * Returns the raw input string if decoding fails or no newline is found.
 */
export function extractActivityUuid(base64Id: string): string {
  try {
    const decoded = atob(base64Id);
    const parts = decoded.split("\n");
    const uuid = parts[1]?.trim();
    if (!uuid) return base64Id;
    return uuid;
  } catch {
    return base64Id;
  }
}

// ---------------------------------------------------------------------------
// Main exported parser
// ---------------------------------------------------------------------------

/**
 * Convert a GraphQL activity response into the SessionData format.
 *
 * Returns null if the activity is malformed, missing an ID, or produces no
 * valid club groups after filtering empty/null strokes.
 */
export function parsePortalActivity(
  activity: GraphQLActivity
): SessionData | null {
  try {
    if (!activity?.id) return null;

    const reportId = extractActivityUuid(activity.id);
    const date = activity.time ?? activity.date ?? "Unknown";
    const allMetricNames = new Set<string>();

    const clubMap = new Map<string, Shot[]>();
    collectStrokes(activity, null, clubMap, allMetricNames);

    if (clubMap.size === 0) return null;

    const club_groups: ClubGroup[] = [];
    for (const [clubName, shots] of clubMap) {
      club_groups.push({
        club_name: clubName,
        shots,
        averages: {},
        consistency: {},
      });
    }

    const session: SessionData = {
      date,
      report_id: reportId,
      url_type: "activity",
      club_groups,
      metric_names: Array.from(allMetricNames).sort(),
      metadata_params: {
        activity_id: activity.id,
        ...(activity.__typename ? { activity_type: activity.__typename } : {}),
        ...(activity.kind ? { activity_kind: activity.kind } : {}),
      },
    };

    return session;
  } catch (err) {
    console.error("[portal_parser] Failed to parse activity:", err);
    return null;
  }
}
