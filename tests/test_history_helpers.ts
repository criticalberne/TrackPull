import { describe, it, expect } from "vitest";
import type { ClubGroup, SessionSnapshot } from "../src/models/types";
import { formatRelativeDate, formatClubSummary, countSnapshotShots } from "../src/popup/history_helpers";

describe("formatRelativeDate", () => {
  it("returns 'Today' for timestamps from today", () => {
    const now = Date.now();
    expect(formatRelativeDate(now)).toBe("Today");
  });

  it("returns 'Yesterday' for timestamps from yesterday", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(12, 0, 0, 0); // midday yesterday
    expect(formatRelativeDate(yesterday.getTime())).toBe("Yesterday");
  });

  it("returns short date format for older dates", () => {
    // March 5, 2025
    const older = new Date(2025, 2, 5, 12, 0, 0).getTime();
    const result = formatRelativeDate(older);
    // Should be like "Mar 5"
    expect(result).toMatch(/^[A-Z][a-z]{2}\s\d{1,2}$/);
    expect(result).toBe("Mar 5");
  });
});

describe("formatClubSummary", () => {
  function makeClubGroup(name: string): ClubGroup {
    return { club_name: name, shots: [], averages: {}, consistency: {} };
  }

  it("returns single club name", () => {
    expect(formatClubSummary([makeClubGroup("7i")])).toBe("7i");
  });

  it("returns comma-separated for 3 clubs", () => {
    const clubs = [makeClubGroup("7i"), makeClubGroup("PW"), makeClubGroup("9i")];
    expect(formatClubSummary(clubs)).toBe("7i, PW, 9i");
  });

  it("truncates to 3 with +N more suffix for >3 clubs", () => {
    const clubs = [
      makeClubGroup("7i"),
      makeClubGroup("PW"),
      makeClubGroup("9i"),
      makeClubGroup("D"),
      makeClubGroup("3W"),
    ];
    expect(formatClubSummary(clubs)).toBe("7i, PW, 9i +2 more");
  });
});

describe("countSnapshotShots", () => {
  it("counts total shots across all club_groups", () => {
    const snapshot: SessionSnapshot = {
      date: "2026-01-01",
      report_id: "r1",
      url_type: "report",
      club_groups: [
        { club_name: "7i", shots: [{ shot_number: 1, metrics: {} }, { shot_number: 2, metrics: {} }], averages: {}, consistency: {} },
        { club_name: "PW", shots: [{ shot_number: 1, metrics: {} }], averages: {}, consistency: {} },
      ],
      metric_names: [],
      metadata_params: {},
    };
    expect(countSnapshotShots(snapshot)).toBe(3);
  });

  it("returns 0 for empty club_groups", () => {
    const snapshot: SessionSnapshot = {
      date: "2026-01-01",
      report_id: "r1",
      url_type: "report",
      club_groups: [],
      metric_names: [],
      metadata_params: {},
    };
    expect(countSnapshotShots(snapshot)).toBe(0);
  });
});
