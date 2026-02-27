/**
 * CSV writer for TrackPull session data.
 * Implements core columns: Date, Club, Shot #, Type
 */

import type { SessionData, ClubGroup, Shot } from "../models/types";
import {
  getApiSourceUnitSystem,
  getMetricUnitLabel,
  normalizeMetricValue,
  type UnitPreference,
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

function getColumnName(metric: string, unitPref: UnitPreference): string {
  const name = getDisplayName(metric);
  const unit = getMetricUnitLabel(metric, unitPref);
  return unit ? `${name} (${unit})` : name;
}

function generateFilename(session: SessionData): string {
  return `ShotData_${session.date}.csv`;
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

export function writeCsv(
  session: SessionData,
  includeAverages = true,
  metricOrder?: string[],
  unitPref: UnitPreference = "imperial"
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
    headerRow.push(getColumnName(metric, unitPref));
  }

  const rows: Record<string, string>[] = [];

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

      // API data arrives in m/s and meters; angles follow the report's display unit
      const unitSystem = getApiSourceUnitSystem(session.metadata_params);

      for (const metric of orderedMetrics) {
        const colName = getColumnName(metric, unitPref);
        let rawValue = shot.metrics[metric] ?? "";

        // Normalize value based on report units/normalization params
        if (typeof rawValue === "string" || typeof rawValue === "number") {
          row[colName] = String(normalizeMetricValue(rawValue, metric, unitSystem, unitPref));
        } else {
          row[colName] = "";
        }
      }

      rows.push(row);
    }

    if (includeAverages && Object.keys(club.averages).length > 0) {
      const avgRow: Record<string, string> = {
        Date: session.date,
        Club: club.club_name,
        "Shot #": "",
        Type: "Average",
      };

      if (hasTags(session)) {
        avgRow.Tag = "";
      }

      // Normalize average values based on report units/normalization params
      for (const metric of orderedMetrics) {
        const colName = getColumnName(metric, unitPref);
        let rawValue = club.averages[metric] ?? "";

        if (typeof rawValue === "string" || typeof rawValue === "number") {
          avgRow[colName] = String(normalizeMetricValue(rawValue, metric, unitSystem, unitPref));
        } else {
          avgRow[colName] = "";
        }
      }

      rows.push(avgRow);
    }

    if (includeAverages && Object.keys(club.consistency).length > 0) {
      const consRow: Record<string, string> = {
        Date: session.date,
        Club: club.club_name,
        "Shot #": "",
        Type: "Consistency",
      };

      if (hasTags(session)) {
        consRow.Tag = "";
      }

      // Normalize consistency values based on report units/normalization params
      for (const metric of orderedMetrics) {
        const colName = getColumnName(metric, unitPref);
        let rawValue = club.consistency[metric] ?? "";

        if (typeof rawValue === "string" || typeof rawValue === "number") {
          consRow[colName] = String(normalizeMetricValue(rawValue, metric, unitSystem, unitPref));
        } else {
          consRow[colName] = "";
        }
      }

      rows.push(consRow);
    }
  }

  const csvContent = [
    headerRow.join(","),
    ...rows.map((row) => {
      return headerRow
        .map((col) => {
          const value = row[col] ?? "";
          if (value.includes(",") || value.includes('"') || value.includes("\n")) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        })
        .join(",");
    }),
  ].join("\n");

  return csvContent;
}
