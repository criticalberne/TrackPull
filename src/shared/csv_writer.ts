/**
 * CSV writer for TrackPull session data.
 * Implements core columns: Date, Club, Shot #, Type
 */

import type { SessionData, Shot } from "../models/types";
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

function getDisplayName(metric: string): string {
  return METRIC_DISPLAY_NAMES[metric] ?? metric;
}

function getColumnName(metric: string, unitChoice: UnitChoice): string {
  const displayName = getDisplayName(metric);
  const unitLabel = getMetricUnitLabel(metric, unitChoice);
  return unitLabel ? `${displayName} (${unitLabel})` : displayName;
}

function orderMetricsByPriority(
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

function hasAnyTags(sessions: SessionData[]): boolean {
  return sessions.some(hasTags);
}

function escapeCsvValue(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function createCsvLines(
  headerRow: string[],
  rows: Record<string, string>[],
  hittingSurface?: "Grass" | "Mat"
): string {
  const lines: string[] = [];

  if (hittingSurface !== undefined) {
    lines.push(`Hitting Surface: ${hittingSurface}`);
  }

  lines.push(headerRow.join(","));
  for (const row of rows) {
    lines.push(
      headerRow
        .map((col) => escapeCsvValue(row[col] ?? ""))
        .join(",")
    );
  }

  return lines.join("\n");
}

export function writeCsv(
  session: SessionData,
  includeAverages = true,
  metricOrder?: string[],
  unitChoice: UnitChoice = DEFAULT_UNIT_CHOICE,
  hittingSurface?: "Grass" | "Mat"
): string {
  const orderedMetrics = orderMetricsByPriority(
    session.metric_names,
    metricOrder ?? METRIC_COLUMN_ORDER
  );

  const headerRow: string[] = ["Date", "Club"];

  if (hasTags(session)) {
    headerRow.push("Tag");
  }

  headerRow.push("Shot #", "Type");

  for (const metric of orderedMetrics) {
    headerRow.push(getColumnName(metric, unitChoice));
  }

  const rows: Record<string, string>[] = [];

  // Source unit system: API always returns m/s + meters, angle unit from report
  const unitSystem = getApiSourceUnitSystem(session.metadata_params);

  for (const club of session.club_groups) {
    for (const shot of club.shots) {
      const row: Record<string, string> = {
        Date: session.date,
        Club: club.club_name,
        "Shot #": String(shot.shot_number + 1),
        Type: "Shot",
      };

      if (hasTags(session)) {
        row.Tag = shot.tag ?? "";
      }

      for (const metric of orderedMetrics) {
        const colName = getColumnName(metric, unitChoice);
        const rawValue = shot.metrics[metric] ?? "";

        if (typeof rawValue === "string" || typeof rawValue === "number") {
          row[colName] = String(normalizeMetricValue(rawValue, metric, unitSystem, unitChoice));
        } else {
          row[colName] = "";
        }
      }

      rows.push(row);
    }

    if (includeAverages) {
      // Group shots by tag
      const tagGroups = new Map<string, Shot[]>();
      for (const shot of club.shots) {
        const tag = shot.tag ?? "";
        if (!tagGroups.has(tag)) tagGroups.set(tag, []);
        tagGroups.get(tag)!.push(shot);
      }

      for (const [tag, shots] of tagGroups) {
        // Only write average row if group has 2+ shots
        if (shots.length < 2) continue;

        const avgRow: Record<string, string> = {
          Date: session.date,
          Club: club.club_name,
          "Shot #": "",
          Type: "Average",
        };

        if (hasTags(session)) {
          avgRow.Tag = tag;
        }

        for (const metric of orderedMetrics) {
          const colName = getColumnName(metric, unitChoice);
          const values = shots
            .map((s) => s.metrics[metric])
            .filter((v) => v !== undefined && v !== "")
            .map((v) => parseFloat(String(v)));
          const numericValues = values.filter((v) => !isNaN(v));

          if (numericValues.length > 0) {
            const avg = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
            const rounded = (metric === "SmashFactor" || metric === "Tempo")
              ? Math.round(avg * 100) / 100
              : Math.round(avg * 10) / 10;
            avgRow[colName] = String(normalizeMetricValue(rounded, metric, unitSystem, unitChoice));
          } else {
            avgRow[colName] = "";
          }
        }

        rows.push(avgRow);
      }
    }
  }

  return createCsvLines(headerRow, rows, hittingSurface);
}

export function writeBulkCsv(
  sessions: SessionData[],
  includeAverages = true,
  metricOrder?: string[],
  unitChoice: UnitChoice = DEFAULT_UNIT_CHOICE,
  hittingSurface?: "Grass" | "Mat"
): string {
  const allMetricNames = Array.from(
    new Set(sessions.flatMap((session) => session.metric_names))
  );
  const orderedMetrics = orderMetricsByPriority(
    allMetricNames,
    metricOrder ?? METRIC_COLUMN_ORDER
  );

  const headerRow: string[] = ["Session Date", "Report ID", "Activity Type", "Club"];
  const includeTagColumn = hasAnyTags(sessions);
  if (includeTagColumn) {
    headerRow.push("Tag");
  }
  headerRow.push("Shot #", "Type");

  for (const metric of orderedMetrics) {
    headerRow.push(getColumnName(metric, unitChoice));
  }

  const rows: Record<string, string>[] = [];

  for (const session of sessions) {
    const unitSystem = getApiSourceUnitSystem(session.metadata_params);
    const activityType = session.metadata_params.activity_type ??
      session.metadata_params.activity_kind ??
      "";

    for (const club of session.club_groups) {
      for (const shot of club.shots) {
        const row: Record<string, string> = {
          "Session Date": session.date,
          "Report ID": session.report_id,
          "Activity Type": activityType,
          Club: club.club_name,
          "Shot #": String(shot.shot_number + 1),
          Type: "Shot",
        };

        if (includeTagColumn) {
          row.Tag = shot.tag ?? "";
        }

        for (const metric of orderedMetrics) {
          const colName = getColumnName(metric, unitChoice);
          const rawValue = shot.metrics[metric] ?? "";
          row[colName] = typeof rawValue === "string" || typeof rawValue === "number"
            ? String(normalizeMetricValue(rawValue, metric, unitSystem, unitChoice))
            : "";
        }

        rows.push(row);
      }

      if (includeAverages) {
        const tagGroups = new Map<string, Shot[]>();
        for (const shot of club.shots) {
          const tag = shot.tag ?? "";
          if (!tagGroups.has(tag)) tagGroups.set(tag, []);
          tagGroups.get(tag)!.push(shot);
        }

        for (const [tag, shots] of tagGroups) {
          if (shots.length < 2) continue;

          const avgRow: Record<string, string> = {
            "Session Date": session.date,
            "Report ID": session.report_id,
            "Activity Type": activityType,
            Club: club.club_name,
            "Shot #": "",
            Type: "Average",
          };

          if (includeTagColumn) {
            avgRow.Tag = tag;
          }

          for (const metric of orderedMetrics) {
            const colName = getColumnName(metric, unitChoice);
            const values = shots
              .map((s) => s.metrics[metric])
              .filter((v) => v !== undefined && v !== "")
              .map((v) => parseFloat(String(v)));
            const numericValues = values.filter((v) => !isNaN(v));

            if (numericValues.length > 0) {
              const avg = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
              const rounded = (metric === "SmashFactor" || metric === "Tempo")
                ? Math.round(avg * 100) / 100
                : Math.round(avg * 10) / 10;
              avgRow[colName] = String(normalizeMetricValue(rounded, metric, unitSystem, unitChoice));
            } else {
              avgRow[colName] = "";
            }
          }

          rows.push(avgRow);
        }
      }
    }
  }

  return createCsvLines(headerRow, rows, hittingSurface);
}
