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
  [key: string]: number | null | undefined;
}

export interface GraphQLStroke {
  club?: string | null;
  time?: string | null;
  targetDistance?: number | null;
  measurement?: StrokeMeasurement | null;
}

export interface GraphQLActivity {
  id: string;
  time?: string | null;
  strokeCount?: number | null;
  strokes?: GraphQLStroke[] | null;
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
    const date = activity.time ?? "Unknown";
    const allMetricNames = new Set<string>();

    // Group flat strokes by club name
    const clubMap = new Map<string, Shot[]>();

    for (const stroke of activity.strokes ?? []) {
      if (!stroke?.measurement) continue;

      const clubName = stroke.club || "Unknown";
      const shotMetrics: Record<string, string> = {};

      for (const [key, value] of Object.entries(stroke.measurement)) {
        if (value === null || value === undefined) continue;

        const numValue =
          typeof value === "number" ? value : parseFloat(String(value));
        if (isNaN(numValue)) continue;

        const normalizedKey = normalizeMetricKey(key);
        shotMetrics[normalizedKey] = `${numValue}`;
        allMetricNames.add(normalizedKey);
      }

      if (Object.keys(shotMetrics).length > 0) {
        const shots = clubMap.get(clubName) ?? [];
        shots.push({
          shot_number: shots.length + 1,
          metrics: shotMetrics,
        });
        clubMap.set(clubName, shots);
      }
    }

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
      metadata_params: { activity_id: activity.id },
    };

    return session;
  } catch (err) {
    console.error("[portal_parser] Failed to parse activity:", err);
    return null;
  }
}
