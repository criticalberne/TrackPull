/**
 * Pure helper functions for the activity browser.
 * Intentionally separated from popup.ts for testability.
 * Per D-05, D-07, D-10, D-11 from the Phase 25 research notes.
 */

import type { ActivitySummary } from "./import_types";

export type TimePeriod = "Today" | "This Week" | "This Month" | "Older";

function parseActivityLocalDate(isoDate: string): Date {
  const dateOnly = isoDate.includes("T") ? isoDate.slice(0, 10) : isoDate;
  return new Date(dateOnly + "T00:00:00");
}

/**
 * Format an ISO date string as "Mar 26" (same year) or "Mar 26, 2025" (different year).
 * Per D-05: short month + day, year only for prior years.
 * Appends T00:00:00 to avoid UTC date shift (Pitfall 2 from RESEARCH.md).
 */
export function formatActivityDate(isoDate: string, now?: Date): string {
  const d = parseActivityLocalDate(isoDate);
  if (isNaN(d.getTime())) return isoDate || "Unknown";
  const ref = now ?? new Date();
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const formatted = `${monthNames[d.getMonth()]} ${d.getDate()}`;
  if (d.getFullYear() !== ref.getFullYear()) {
    return `${formatted}, ${d.getFullYear()}`;
  }
  return formatted;
}

/**
 * Classify an ISO date string into a time period bucket.
 * Per D-07: Today / This Week / This Month / Older.
 * "Today" = >= todayStart. "This Week" = >= weekStart AND < todayStart.
 * "This Month" = >= monthStart AND < weekStart. "Older" = < monthStart.
 * Week starts on Sunday (Pitfall 5 from RESEARCH.md).
 */
export function getTimePeriod(isoDate: string, now?: Date): TimePeriod {
  const activityDate = parseActivityLocalDate(isoDate);
  const ref = now ?? new Date();

  const todayStart = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const monthStart = new Date(ref.getFullYear(), ref.getMonth(), 1);

  if (activityDate >= todayStart) return "Today";
  if (activityDate >= weekStart) return "This Week";
  if (activityDate >= monthStart) return "This Month";
  return "Older";
}

/**
 * Filter activities by type. Empty string means "All Types" (no filter).
 * Per D-11: client-side filtering.
 */
export function filterActivities(activities: ActivitySummary[], typeFilter: string): ActivitySummary[] {
  if (!typeFilter) return activities;
  return activities.filter((a) => a.type === typeFilter);
}

export function getPortalActivityDisplayLabel(type: string | null): string {
  switch (type) {
    case "CoursePlayActivity":
    case "CourseSessionActivity":
    case "COURSE_PLAY":
      return "Course play";
    case "MapMyBagActivity":
    case "MapMyBagSessionActivity":
    case "BagMappingActivity":
    case "MAP_MY_BAG":
      return "Map My Bag";
    default:
      return type ?? "Activity";
  }
}

/**
 * Extract sorted unique non-null type values from activity list.
 * Per D-10: dynamically populated from fetched data.
 */
export function getUniqueTypes(activities: ActivitySummary[]): string[] {
  return [...new Set(activities.map((a) => a.type).filter((t): t is string => t !== null))].sort();
}
