/**
 * Tests for CSV writer includeAverages toggle behavior.
 * Verifies that writeCsv correctly includes or excludes Average and Consistency rows
 * based on the includeAverages parameter.
 */

import { describe, it, expect } from "vitest";
import { writeCsv } from "../src/shared/csv_writer";
import { STORAGE_KEYS } from "../src/shared/constants";
import type { SessionData } from "../src/models/types";

function makeSessionWithAverages(): SessionData {
  return {
    date: "2025-01-15",
    report_id: "test-456",
    url_type: "report",
    metric_names: ["ClubSpeed", "BallSpeed", "Carry"],
    metadata_params: { nd_001: "789012" },
    club_groups: [
      {
        club_name: "7 Iron",
        shots: [
          { shot_number: 0, metrics: { ClubSpeed: "44.704", BallSpeed: "58.12", Carry: "182.88" } },
          { shot_number: 1, metrics: { ClubSpeed: "43.5", BallSpeed: "57.0", Carry: "178.0" } },
        ],
        averages: {
          ClubSpeed: "44.1",
          BallSpeed: "57.56",
          Carry: "180.44",
        },
        consistency: {
          ClubSpeed: "1.2",
          BallSpeed: "1.56",
          Carry: "4.88",
        },
      },
    ],
  };
}

describe("CSV Writer: includeAverages=true", () => {
  it("produces rows containing 'Average' for a club with averages data", () => {
    const session = makeSessionWithAverages();
    const csv = writeCsv(session, true);
    const lines = csv.split("\n").filter((l) => l.trim() !== "");
    const hasAverage = lines.some((line) => line.includes("Average"));
    expect(hasAverage).toBe(true);
  });

  it("produces rows containing 'Consistency' for a club with consistency data", () => {
    const session = makeSessionWithAverages();
    const csv = writeCsv(session, true);
    const lines = csv.split("\n").filter((l) => l.trim() !== "");
    const hasConsistency = lines.some((line) => line.includes("Consistency"));
    expect(hasConsistency).toBe(true);
  });
});

describe("CSV Writer: includeAverages=false", () => {
  it("produces NO rows containing 'Average'", () => {
    const session = makeSessionWithAverages();
    const csv = writeCsv(session, false);
    const lines = csv.split("\n").filter((l) => l.trim() !== "");
    const hasAverage = lines.some((line) => line.includes("Average"));
    expect(hasAverage).toBe(false);
  });

  it("produces NO rows containing 'Consistency'", () => {
    const session = makeSessionWithAverages();
    const csv = writeCsv(session, false);
    const lines = csv.split("\n").filter((l) => l.trim() !== "");
    const hasConsistency = lines.some((line) => line.includes("Consistency"));
    expect(hasConsistency).toBe(false);
  });

  it("still produces all individual shot rows (row count matches total shots)", () => {
    const session = makeSessionWithAverages();
    const totalShots = session.club_groups.reduce((acc, cg) => acc + cg.shots.length, 0);
    const csv = writeCsv(session, false);
    // Lines: header + shot rows (no averages or consistency)
    const lines = csv.split("\n").filter((l) => l.trim() !== "");
    // First line is header; remaining are shot rows
    const dataRows = lines.slice(1);
    expect(dataRows.length).toBe(totalShots);
  });
});

describe("STORAGE_KEYS.INCLUDE_AVERAGES", () => {
  it("equals 'includeAverages'", () => {
    expect(STORAGE_KEYS.INCLUDE_AVERAGES).toBe("includeAverages");
  });
});
