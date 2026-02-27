/**
 * CSV writer for Trackman session data.
 * Implements core columns: Date, Club, Shot #, Type
 */

import type { SessionData, ClubGroup, Shot } from "../models/types";
import {
  getUnitSystem,
  normalizeMetricValue,
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

function generateFilename(session: SessionData): string {
  return `${session.date}_TrackmanData.csv`;
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
  outputFilename?: string,
  includeAverages = true,
  metricOrder?: string[]
): string {
  const filename = outputFilename ?? generateFilename(session);

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
    headerRow.push(getDisplayName(metric));
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

      // Get unit system for normalization
      const unitSystem = getUnitSystem(session.metadata_params);

      for (const metric of orderedMetrics) {
        const displayName = getDisplayName(metric);
        let rawValue = shot.metrics[metric] ?? "";
        
        // Normalize value based on report units/normalization params
        if (typeof rawValue === "string" || typeof rawValue === "number") {
          row[displayName] = String(normalizeMetricValue(rawValue, metric, unitSystem));
        } else {
          row[displayName] = "";
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
        const displayName = getDisplayName(metric);
        let rawValue = club.averages[metric] ?? "";
        
        if (typeof rawValue === "string" || typeof rawValue === "number") {
          avgRow[displayName] = String(normalizeMetricValue(rawValue, metric, unitSystem));
        } else {
          avgRow[displayName] = "";
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
        const displayName = getDisplayName(metric);
        let rawValue = club.consistency[metric] ?? "";
        
        if (typeof rawValue === "string" || typeof rawValue === "number") {
          consRow[displayName] = String(normalizeMetricValue(rawValue, metric, unitSystem));
        } else {
          consRow[displayName] = "";
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
