/**
 * CSV writer for Trackman session data.
 * Implements core columns: Date, Report ID, Club, Shot #, Type
 */

import type { SessionData, ClubGroup, Shot } from "../models/types";
import {
  getUnitSystem,
  normalizeMetricValue,
} from "./unit_normalization";

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
  Carry: "Carry",
  Total: "Total",
  Side: "Side",
  SideTotal: "Side Total",
  Height: "Height",
  LowPointDistance: "Low Point",
  ImpactHeight: "Impact Height",
  ImpactOffset: "Impact Offset",
  Tempo: "Tempo",
};

function getDisplayName(metric: string): string {
  return METRIC_DISPLAY_NAMES[metric] ?? metric;
}

function generateFilename(session: SessionData): string {
  const base = `trackman_${session.report_id}`;

  if (!Object.keys(session.metadata_params).length) {
    return `${base}.csv`;
  }

  const ndValues: string[] = [];
  for (const [key, value] of Object.entries(session.metadata_params)) {
    const match = key.match(/^nd_([a-z0-9]+)$/);
    if (match) {
      ndValues.push(`nd${match[1]}${value}`);
    }
  }

  ndValues.sort();

  if (ndValues.length > 0) {
    return `${base}_${ndValues.join("_")}.csv`;
  }

  return `${base}.csv`;
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

  const orderedMetrics = metricOrder
    ? orderMetricsByPriority(session.metric_names, metricOrder)
    : session.metric_names;

  const headerRow: string[] = ["Date", "Report ID", "Club"];
  
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
        "Report ID": session.report_id,
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
        "Report ID": session.report_id,
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
        "Report ID": session.report_id,
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

  try {
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log(`Trackman Scraper: Wrote ${rows.length} rows to ${filename}`);
    return filename;
  } catch (error) {
    console.error("Trackman Scraper: CSV export failed:", error);
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const container = document.getElementById('toast-container');
      if (container) {
        const toast = document.createElement('div');
        toast.className = 'toast error';
        toast.textContent = 'Failed to export CSV: ' + (error instanceof Error ? error.message : String(error));
        toast.setAttribute('role', 'alert');
        container.appendChild(toast);
        setTimeout(() => {
          if (toast.parentNode) {
            toast.classList.add('hiding');
            setTimeout(() => toast.remove(), 300);
          }
        }, 5000);
      }
    }
    throw error;
  }
}
