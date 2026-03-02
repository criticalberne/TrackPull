/**
 * Tests for TSV writer module.
 */

import { describe, it, expect } from "vitest";
import { writeTsv } from "../src/shared/tsv_writer";
import type { SessionData } from "../src/models/types";
import type { UnitChoice } from "../src/shared/unit_normalization";

function makeSession(
  metrics: Record<string, string | number>,
  metricNames: string[],
  metadataParams: Record<string, string> = { nd_001: "789012" }
): SessionData {
  return {
    date: "2025-01-15",
    report_id: "test-123",
    url_type: "report",
    metric_names: metricNames,
    metadata_params: metadataParams,
    club_groups: [
      {
        club_name: "7 Iron",
        shots: [{ shot_number: 0, metrics }],
        averages: {},
        consistency: {},
      },
    ],
  };
}

function makeMultiClubSession(
  clubs: Array<{ name: string; shots: Array<Record<string, string | number>> }>,
  metricNames: string[],
  metadataParams: Record<string, string> = { nd_001: "789012" }
): SessionData {
  return {
    date: "2025-01-15",
    report_id: "test-456",
    url_type: "report",
    metric_names: metricNames,
    metadata_params: metadataParams,
    club_groups: clubs.map((club) => ({
      club_name: club.name,
      shots: club.shots.map((metrics, idx) => ({ shot_number: idx, metrics })),
      averages: {},
      consistency: {},
    })),
  };
}

const imperial: UnitChoice = { speed: "mph", distance: "yards" };
const metric: UnitChoice = { speed: "m/s", distance: "meters" };

describe("TSV Writer: tab delimiter", () => {
  it("uses tabs as column delimiter", () => {
    const session = makeSession({ ClubSpeed: "44.704" }, ["ClubSpeed"]);
    const tsv = writeTsv(session, imperial);
    const header = tsv.split("\n")[0];
    const cols = header.split("\t");
    expect(cols.length).toBeGreaterThan(1);
  });

  it("does not contain commas as delimiters", () => {
    const session = makeSession({ ClubSpeed: "44.704" }, ["ClubSpeed"]);
    const tsv = writeTsv(session, imperial);
    const header = tsv.split("\n")[0];
    // Header should not use commas as field separators
    expect(header.split("\t").length).toBeGreaterThan(header.split(",").length);
  });
});

describe("TSV Writer: header row", () => {
  it("starts with Date, Club, Shot # columns", () => {
    const session = makeSession({ ClubSpeed: "44.704" }, ["ClubSpeed"]);
    const tsv = writeTsv(session, imperial);
    const header = tsv.split("\n")[0];
    const cols = header.split("\t");
    expect(cols[0]).toBe("Date");
    expect(cols[1]).toBe("Club");
    expect(cols[2]).toBe("Shot #");
  });

  it("includes unit labels in metric column headers", () => {
    const session = makeSession({ ClubSpeed: "44.704" }, ["ClubSpeed"]);
    const tsv = writeTsv(session, imperial);
    const header = tsv.split("\n")[0];
    expect(header).toContain("Club Speed (mph)");
  });

  it("does not include Type column", () => {
    const session = makeSession({ ClubSpeed: "44.704" }, ["ClubSpeed"]);
    const tsv = writeTsv(session, imperial);
    const header = tsv.split("\n")[0];
    const cols = header.split("\t");
    expect(cols).not.toContain("Type");
  });

  it("does not include Tag column", () => {
    const session: SessionData = {
      date: "2025-01-15",
      report_id: "test-123",
      url_type: "report",
      metric_names: ["ClubSpeed"],
      metadata_params: { nd_001: "789012" },
      club_groups: [
        {
          club_name: "7 Iron",
          shots: [{ shot_number: 0, metrics: { ClubSpeed: "44.704" }, tag: "Good" }],
          averages: {},
          consistency: {},
        },
      ],
    };
    const tsv = writeTsv(session, imperial);
    const header = tsv.split("\n")[0];
    const cols = header.split("\t");
    expect(cols).not.toContain("Tag");
  });
});

describe("TSV Writer: shots only", () => {
  it("does not include average rows", () => {
    const session: SessionData = {
      date: "2025-01-15",
      report_id: "test-123",
      url_type: "report",
      metric_names: ["ClubSpeed"],
      metadata_params: { nd_001: "789012" },
      club_groups: [
        {
          club_name: "7 Iron",
          shots: [{ shot_number: 0, metrics: { ClubSpeed: "44.704" } }],
          averages: { ClubSpeed: 44.704 },
          consistency: {},
        },
      ],
    };
    const tsv = writeTsv(session, imperial);
    const rows = tsv.split("\n");
    const hasAverage = rows.some((row) => row.includes("Average"));
    expect(hasAverage).toBe(false);
  });

  it("does not include consistency rows", () => {
    const session: SessionData = {
      date: "2025-01-15",
      report_id: "test-123",
      url_type: "report",
      metric_names: ["ClubSpeed"],
      metadata_params: { nd_001: "789012" },
      club_groups: [
        {
          club_name: "7 Iron",
          shots: [{ shot_number: 0, metrics: { ClubSpeed: "44.704" } }],
          averages: {},
          consistency: { ClubSpeed: 1.2 },
        },
      ],
    };
    const tsv = writeTsv(session, imperial);
    const rows = tsv.split("\n");
    const hasConsistency = rows.some((row) => row.includes("Consistency"));
    expect(hasConsistency).toBe(false);
  });

  it("outputs one data row per shot", () => {
    const session: SessionData = {
      date: "2025-01-15",
      report_id: "test-123",
      url_type: "report",
      metric_names: ["ClubSpeed"],
      metadata_params: { nd_001: "789012" },
      club_groups: [
        {
          club_name: "7 Iron",
          shots: [
            { shot_number: 0, metrics: { ClubSpeed: "44.704" } },
            { shot_number: 1, metrics: { ClubSpeed: "45.0" } },
            { shot_number: 2, metrics: { ClubSpeed: "43.5" } },
          ],
          averages: {},
          consistency: {},
        },
      ],
    };
    const tsv = writeTsv(session, imperial);
    const lines = tsv.split("\n");
    // 1 header + 3 data rows = 4 lines
    expect(lines.length).toBe(4);
  });
});

describe("TSV Writer: edge cases", () => {
  it("replaces tab in field value with space", () => {
    const session: SessionData = {
      date: "2025-01-15",
      report_id: "test-123",
      url_type: "report",
      metric_names: ["ClubSpeed"],
      metadata_params: { nd_001: "789012" },
      club_groups: [
        {
          club_name: "7\tIron",
          shots: [{ shot_number: 0, metrics: { ClubSpeed: "44.704" } }],
          averages: {},
          consistency: {},
        },
      ],
    };
    const tsv = writeTsv(session, imperial);
    const dataRow = tsv.split("\n")[1];
    const cols = dataRow.split("\t");
    // Club name with tab should have been replaced with space -> "7 Iron"
    expect(cols[1]).toBe("7 Iron");
    // Column count should be the same as header
    const headerCols = tsv.split("\n")[0].split("\t");
    expect(cols.length).toBe(headerCols.length);
  });

  it("replaces newline in field value with space", () => {
    const session: SessionData = {
      date: "2025-01-15",
      report_id: "test-123",
      url_type: "report",
      metric_names: ["ClubSpeed"],
      metadata_params: { nd_001: "789012" },
      club_groups: [
        {
          club_name: "7 Iron",
          shots: [{ shot_number: 0, metrics: { ClubSpeed: "44\n704" } }],
          averages: {},
          consistency: {},
        },
      ],
    };
    const tsv = writeTsv(session, imperial);
    const lines = tsv.split("\n");
    // No extra lines from the embedded newline
    expect(lines.length).toBe(2); // 1 header + 1 data row
  });

  it("does not escape commas in field values", () => {
    const session: SessionData = {
      date: "2025-01-15",
      report_id: "test-123",
      url_type: "report",
      metric_names: ["ClubSpeed"],
      metadata_params: { nd_001: "789012" },
      club_groups: [
        {
          club_name: "7 Iron, Long",
          shots: [{ shot_number: 0, metrics: { ClubSpeed: "44.704" } }],
          averages: {},
          consistency: {},
        },
      ],
    };
    const tsv = writeTsv(session, imperial);
    const dataRow = tsv.split("\n")[1];
    const cols = dataRow.split("\t");
    // Comma in club name should survive unquoted
    expect(cols[1]).toBe("7 Iron, Long");
  });

  it("handles empty session with no clubs", () => {
    const session: SessionData = {
      date: "2025-01-15",
      report_id: "test-123",
      url_type: "report",
      metric_names: ["ClubSpeed"],
      metadata_params: { nd_001: "789012" },
      club_groups: [],
    };
    const tsv = writeTsv(session, imperial);
    const lines = tsv.split("\n");
    // Header row only
    expect(lines.length).toBe(1);
    expect(lines[0]).toContain("Date");
  });

  it("handles shot with missing metric values", () => {
    const session: SessionData = {
      date: "2025-01-15",
      report_id: "test-123",
      url_type: "report",
      metric_names: ["ClubSpeed", "BallSpeed"],
      metadata_params: { nd_001: "789012" },
      club_groups: [
        {
          club_name: "7 Iron",
          shots: [{ shot_number: 0, metrics: {} }],
          averages: {},
          consistency: {},
        },
      ],
    };
    const tsv = writeTsv(session, imperial);
    const dataRow = tsv.split("\n")[1];
    const headerCols = tsv.split("\n")[0].split("\t");
    const dataCols = dataRow.split("\t");
    // Same column count, missing metrics show as empty string
    expect(dataCols.length).toBe(headerCols.length);
    // Metric value columns should be empty
    expect(dataCols[3]).toBe("");
    expect(dataCols[4]).toBe("");
  });
});

describe("TSV Writer: unit conversion", () => {
  it("converts speed from m/s to mph for imperial", () => {
    const session = makeSession({ ClubSpeed: "44.704" }, ["ClubSpeed"]);
    const tsv = writeTsv(session, imperial);
    const dataRow = tsv.split("\n")[1];
    // 44.704 m/s ≈ 100 mph
    expect(dataRow).toContain("100");
  });

  it("keeps speed in m/s for metric", () => {
    const session = makeSession({ ClubSpeed: "44.704" }, ["ClubSpeed"]);
    const tsv = writeTsv(session, metric);
    const dataRow = tsv.split("\n")[1];
    // Should stay ~44.7 m/s
    expect(dataRow).toContain("44.7");
  });

  it("converts distance from meters to yards for imperial", () => {
    const session = makeSession({ Carry: "182.88" }, ["Carry"]);
    const tsv = writeTsv(session, imperial);
    const dataRow = tsv.split("\n")[1];
    // 182.88m = 200 yds exactly
    expect(dataRow).toContain("200");
  });
});

describe("TSV Writer: multi-club sessions", () => {
  it("includes shots from all clubs in order", () => {
    const session = makeMultiClubSession(
      [
        { name: "Driver", shots: [{ ClubSpeed: "55.0" }, { ClubSpeed: "54.0" }] },
        { name: "7 Iron", shots: [{ ClubSpeed: "44.0" }, { ClubSpeed: "43.0" }] },
      ],
      ["ClubSpeed"]
    );
    const tsv = writeTsv(session, imperial);
    const lines = tsv.split("\n");
    // 1 header + 4 data rows = 5 lines
    expect(lines.length).toBe(5);
    // First data row should be Driver
    const firstDataCols = lines[1].split("\t");
    expect(firstDataCols[1]).toBe("Driver");
    // Third data row should be 7 Iron
    const thirdDataCols = lines[3].split("\t");
    expect(thirdDataCols[1]).toBe("7 Iron");
  });
});
