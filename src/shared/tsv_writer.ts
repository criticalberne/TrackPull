/**
 * TSV writer for TrackPull session data.
 * Produces tab-separated output with column headers and unit labels.
 * Shots only -- no averages or consistency rows.
 * A Tag column is included only when at least one shot carries a tag,
 * mirroring the CSV writer.
 */

import type { SessionData } from "../models/types";
import {
  getApiSourceUnitSystem,
  getMetricUnitLabel,
  normalizeMetricValue,
  DEFAULT_UNIT_CHOICE,
  type UnitChoice,
} from "./unit_normalization";
import { METRIC_DISPLAY_NAMES } from "./constants";

const METRIC_COLUMN_ORDER: string[] = [
  // Speed & Efficiency
  "ClubSpeed", "BallSpeed", "SmashFactor",
  // Club Delivery
  "AttackAngle", "ClubPath", "FaceAngle", "FaceToPath", "SwingDirection", "DynamicLoft",
  // Launch & Spin
  "LaunchAngle", "LaunchDirection", "SpinRate", "SpinAxis", "SpinLoft",
  // Distance
  "Carry", "Total",
  // Dispersion
  "Side", "SideTotal", "CarrySide", "TotalSide", "Curve",
  // Ball Flight
  "Height", "MaxHeight", "LandingAngle", "HangTime",
  // Impact
  "LowPointDistance", "ImpactHeight", "ImpactOffset",
  // Other
  "Tempo",
];

export function escapeTsvField(value: string): string {
  return value.replace(/\t/g, " ").replace(/[\n\r]/g, " ");
}

export function getDisplayName(metric: string): string {
  return METRIC_DISPLAY_NAMES[metric] ?? metric;
}

export function getColumnName(metric: string, unitChoice: UnitChoice): string {
  const displayName = getDisplayName(metric);
  const unitLabel = getMetricUnitLabel(metric, unitChoice);
  return unitLabel ? `${displayName} (${unitLabel})` : displayName;
}

export function orderMetricsByPriority(
  allMetrics: string[],
  priorityOrder: string[]
): string[] {
  const result: string[] = [];
  const seen = new Set<string>();

  for (const metric of priorityOrder) {
    if (allMetrics.includes(metric) && !seen.has(metric)) {
      result.push(metric);
      seen.add(metric);
    }
  }

  for (const metric of allMetrics) {
    if (!seen.has(metric)) {
      result.push(metric);
    }
  }

  return result;
}

function hasTags(session: SessionData): boolean {
  return session.club_groups.some((club) =>
    club.shots.some((shot) => shot.tag !== undefined && shot.tag !== "")
  );
}

export function writeTsv(
  session: SessionData,
  unitChoice: UnitChoice = DEFAULT_UNIT_CHOICE,
  hittingSurface?: "Grass" | "Mat"
): string {
  const orderedMetrics = orderMetricsByPriority(
    session.metric_names,
    METRIC_COLUMN_ORDER
  );

  const includeTag = hasTags(session);

  // Build header row: Date, Club, [Tag,] Shot # then metric columns with unit labels
  const headerFields: string[] = ["Date", "Club"];
  if (includeTag) {
    headerFields.push("Tag");
  }
  headerFields.push("Shot #");
  for (const metric of orderedMetrics) {
    headerFields.push(getColumnName(metric, unitChoice));
  }

  // Source unit system: API always returns m/s + meters, angle unit from report
  const unitSystem = getApiSourceUnitSystem(session.metadata_params);

  const rows: string[] = [];

  for (const club of session.club_groups) {
    for (const shot of club.shots) {
      const fields: string[] = [
        escapeTsvField(session.date),
        escapeTsvField(club.club_name),
      ];
      if (includeTag) {
        fields.push(escapeTsvField(shot.tag ?? ""));
      }
      fields.push(escapeTsvField(String(shot.shot_number + 1)));

      for (const metric of orderedMetrics) {
        const rawValue = shot.metrics[metric] ?? "";

        let fieldValue: string;
        if (typeof rawValue === "string" || typeof rawValue === "number") {
          fieldValue = String(normalizeMetricValue(rawValue, metric, unitSystem, unitChoice));
        } else {
          fieldValue = "";
        }

        fields.push(escapeTsvField(fieldValue));
      }

      rows.push(fields.join("\t"));
    }
  }

  const headerRow = headerFields.map(escapeTsvField).join("\t");

  const parts: string[] = [];
  if (hittingSurface !== undefined) {
    parts.push(`Hitting Surface: ${hittingSurface}`);
  }
  parts.push(headerRow, ...rows);

  return parts.join("\n");
}
