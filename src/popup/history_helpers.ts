/**
 * Pure helper functions for the session history UI.
 * No chrome API dependencies — all functions are stateless and testable.
 */

import type { ClubGroup, SessionSnapshot } from "../models/types";

/**
 * Format a timestamp as a relative date string.
 * Returns "Today", "Yesterday", or a short date like "Mar 5".
 */
export function formatRelativeDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();

  // Compare calendar dates (not time offsets)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (dateOnly.getTime() === today.getTime()) {
    return "Today";
  }
  if (dateOnly.getTime() === yesterday.getTime()) {
    return "Yesterday";
  }

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Format club groups into a summary string.
 * Shows first 3 club names, then "+N more" if there are additional clubs.
 */
export function formatClubSummary(clubGroups: ClubGroup[]): string {
  const names = clubGroups.map((g) => g.club_name);
  if (names.length <= 3) {
    return names.join(", ");
  }
  return `${names.slice(0, 3).join(", ")} +${names.length - 3} more`;
}

/**
 * Count total shots across all club groups in a snapshot.
 */
export function countSnapshotShots(snapshot: SessionSnapshot): number {
  return snapshot.club_groups.reduce((sum, group) => sum + group.shots.length, 0);
}
