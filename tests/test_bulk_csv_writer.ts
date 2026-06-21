import { describe, it, expect } from "vitest";
import type { SessionData } from "../src/models/types";
import { writeBulkCsv } from "../src/shared/csv_writer";

function makeSession(
  reportId: string,
  date: string,
  clubName: string,
  metrics: Record<string, string>,
  activityType = "CoursePlayActivity"
): SessionData {
  return {
    date,
    report_id: reportId,
    url_type: "activity",
    metric_names: Object.keys(metrics),
    metadata_params: {
      activity_id: `activity-${reportId}`,
      activity_type: activityType,
    },
    club_groups: [
      {
        club_name: clubName,
        shots: [
          { shot_number: 0, metrics },
          { shot_number: 1, metrics },
        ],
        averages: {},
        consistency: {},
      },
    ],
  };
}

describe("writeBulkCsv", () => {
  it("writes one combined header with report and activity context", () => {
    const csv = writeBulkCsv([
      makeSession("report-1", "2026-01-01", "Driver", { ClubSpeed: "45" }),
      makeSession("report-2", "2026-01-02", "7 Iron", { Carry: "150" }, "MapMyBagSessionActivity"),
    ], false);

    const header = csv.split("\n")[0];
    expect(header).toContain("Session Date,Report ID,Activity Type,Club,Shot #,Type");
    expect(header).toContain("Club Speed (mph)");
    expect(header).toContain("Carry (yds)");
    expect(csv).toContain("report-1");
    expect(csv).toContain("CoursePlayActivity");
    expect(csv).toContain("MapMyBagSessionActivity");
  });

  it("adds average rows per session when requested", () => {
    const csv = writeBulkCsv([
      makeSession("report-1", "2026-01-01", "Driver", { ClubSpeed: "45" }),
      makeSession("report-2", "2026-01-02", "7 Iron", { ClubSpeed: "35" }),
    ], true);

    const averageRows = csv.split("\n").filter((line) => line.includes(",Average,"));
    expect(averageRows).toHaveLength(2);
  });

  it("omits average rows when disabled", () => {
    const csv = writeBulkCsv([
      makeSession("report-1", "2026-01-01", "Driver", { ClubSpeed: "45" }),
    ], false);

    expect(csv).not.toContain(",Average,");
  });

  it("escapes comma-containing values and includes hitting surface", () => {
    const csv = writeBulkCsv([
      makeSession("report-1", "2026-01-01", "Driver, Fitted", { Carry: "150" }),
    ], false, undefined, undefined, "Grass");

    expect(csv.split("\n")[0]).toBe("Hitting Surface: Grass");
    expect(csv).toContain('"Driver, Fitted"');
  });
});
