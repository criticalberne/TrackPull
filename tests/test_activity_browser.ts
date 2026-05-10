import { describe, it, expect } from "vitest";
import {
  formatActivityDate,
  getTimePeriod,
  filterActivities,
  getPortalActivityDisplayLabel,
  getUniqueTypes,
} from "../src/shared/activity_helpers";
import type { ActivitySummary } from "../src/shared/import_types";

// Fixed reference date: 2026-03-26 (Thursday)
const NOW = new Date("2026-03-26T12:00:00");

describe("formatActivityDate", () => {
  it("returns short month+day for same-year date", () => {
    expect(formatActivityDate("2026-03-26", NOW)).toBe("Mar 26");
  });

  it("appends year for prior-year date", () => {
    expect(formatActivityDate("2025-12-15", NOW)).toBe("Dec 15, 2025");
  });

  it("returns single-digit day without padding for same year", () => {
    expect(formatActivityDate("2026-01-01", NOW)).toBe("Jan 1");
  });

  it("handles month boundary correctly (Feb)", () => {
    expect(formatActivityDate("2026-02-28", NOW)).toBe("Feb 28");
  });

  it("handles full ISO timestamps from portal activities", () => {
    expect(formatActivityDate("2025-04-05T15:46:57.519Z", NOW)).toBe("Apr 5, 2025");
  });

  it("appends year when year is older than 1 year", () => {
    expect(formatActivityDate("2024-06-15", NOW)).toBe("Jun 15, 2024");
  });
});

describe("getTimePeriod", () => {
  // NOW = 2026-03-26 (Thursday)
  // Week starts on Sunday: 2026-03-22
  // Month start: 2026-03-01

  it("returns Today for today's date", () => {
    expect(getTimePeriod("2026-03-26", NOW)).toBe("Today");
  });

  it("classifies full ISO timestamps by local date", () => {
    expect(getTimePeriod("2026-03-26T23:59:59.000Z", NOW)).toBe("Today");
  });

  it("returns This Week for earlier this week (not today)", () => {
    // Monday 2026-03-23 — within the same week but not today
    expect(getTimePeriod("2026-03-23", NOW)).toBe("This Week");
  });

  it("returns This Week for Sunday (start of current week)", () => {
    expect(getTimePeriod("2026-03-22", NOW)).toBe("This Week");
  });

  it("returns This Month for earlier this month but not this week", () => {
    // 2026-03-01 — month start, before week start (March 22)
    expect(getTimePeriod("2026-03-01", NOW)).toBe("This Month");
  });

  it("returns Older for a date in a prior month", () => {
    expect(getTimePeriod("2026-02-15", NOW)).toBe("Older");
  });

  it("returns Older for last year", () => {
    expect(getTimePeriod("2025-12-31", NOW)).toBe("Older");
  });
});

describe("filterActivities", () => {
  const activities: ActivitySummary[] = [
    { id: "1", date: "2026-03-26", strokeCount: 10, type: "Session" },
    { id: "2", date: "2026-03-25", strokeCount: 5, type: "Practice" },
    { id: "3", date: "2026-03-24", strokeCount: null, type: "Session" },
    { id: "4", date: "2026-03-23", strokeCount: 8, type: null },
  ];

  it("returns all activities when typeFilter is empty string", () => {
    expect(filterActivities(activities, "")).toHaveLength(4);
  });

  it("returns only matching activities for Session type", () => {
    const result = filterActivities(activities, "Session");
    expect(result).toHaveLength(2);
    expect(result.every((a) => a.type === "Session")).toBe(true);
  });

  it("returns empty array when no activities match the filter", () => {
    expect(filterActivities(activities, "Tournament")).toHaveLength(0);
  });

  it("returns only Practice activities", () => {
    const result = filterActivities(activities, "Practice");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });
});

describe("getUniqueTypes", () => {
  it("returns sorted unique non-null types", () => {
    const activities: ActivitySummary[] = [
      { id: "1", date: "2026-03-26", strokeCount: 10, type: "Session" },
      { id: "2", date: "2026-03-25", strokeCount: 5, type: "Practice" },
      { id: "3", date: "2026-03-24", strokeCount: null, type: "Session" },
    ];
    expect(getUniqueTypes(activities)).toEqual(["Practice", "Session"]);
  });

  it("skips null type values", () => {
    const activities: ActivitySummary[] = [
      { id: "1", date: "2026-03-26", strokeCount: 10, type: null },
      { id: "2", date: "2026-03-25", strokeCount: 5, type: "Session" },
    ];
    expect(getUniqueTypes(activities)).toEqual(["Session"]);
  });

  it("returns empty array when all types are null", () => {
    const activities: ActivitySummary[] = [
      { id: "1", date: "2026-03-26", strokeCount: null, type: null },
    ];
    expect(getUniqueTypes(activities)).toEqual([]);
  });

  it("deduplicates types", () => {
    const activities: ActivitySummary[] = [
      { id: "1", date: "2026-03-26", strokeCount: 1, type: "Session" },
      { id: "2", date: "2026-03-25", strokeCount: 2, type: "Session" },
      { id: "3", date: "2026-03-24", strokeCount: 3, type: "Session" },
    ];
    expect(getUniqueTypes(activities)).toEqual(["Session"]);
  });
});

describe("getPortalActivityDisplayLabel", () => {
  it("renders supported portal activity type names for users", () => {
    expect(getPortalActivityDisplayLabel("CoursePlayActivity")).toBe("Course play");
    expect(getPortalActivityDisplayLabel("CourseSessionActivity")).toBe("Course play");
    expect(getPortalActivityDisplayLabel("COURSE_PLAY")).toBe("Course play");
    expect(getPortalActivityDisplayLabel("MapMyBagActivity")).toBe("Map My Bag");
    expect(getPortalActivityDisplayLabel("MapMyBagSessionActivity")).toBe("Map My Bag");
    expect(getPortalActivityDisplayLabel("BagMappingActivity")).toBe("Map My Bag");
    expect(getPortalActivityDisplayLabel("MAP_MY_BAG")).toBe("Map My Bag");
  });

  it("falls back to raw type or generic activity label", () => {
    expect(getPortalActivityDisplayLabel("CustomActivity")).toBe("CustomActivity");
    expect(getPortalActivityDisplayLabel(null)).toBe("Activity");
  });
});
