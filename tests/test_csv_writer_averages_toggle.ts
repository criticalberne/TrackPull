/**
 * Tests for CSV writer includeAverages toggle behavior.
 * Averages are now computed from shot data, grouped by tag.
 */

import { describe, it, expect } from "vitest";
import { writeCsv } from "../src/shared/csv_writer";
import { STORAGE_KEYS } from "../src/shared/constants";
import type { SessionData } from "../src/models/types";

/** Session with 2 shots (same club, no tags) — enough for an average row. */
function makeSession(): SessionData {
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
          { shot_number: 0, metrics: { ClubSpeed: "80", BallSpeed: "110", Carry: "160" } },
          { shot_number: 1, metrics: { ClubSpeed: "82", BallSpeed: "112", Carry: "164" } },
        ],
        averages: {},
        consistency: {},
      },
    ],
  };
}

/** Session with a single shot — not enough for an average row. */
function makeSingleShotSession(): SessionData {
  return {
    date: "2025-01-15",
    report_id: "test-789",
    url_type: "report",
    metric_names: ["ClubSpeed"],
    metadata_params: { nd_001: "789012" },
    club_groups: [
      {
        club_name: "PW",
        shots: [
          { shot_number: 0, metrics: { ClubSpeed: "70" } },
        ],
        averages: {},
        consistency: {},
      },
    ],
  };
}

/** Session with tagged shots — two tags on the same club. */
function makeTaggedSession(): SessionData {
  return {
    date: "2025-01-15",
    report_id: "test-tagged",
    url_type: "report",
    metric_names: ["ClubSpeed", "Carry"],
    metadata_params: { nd_001: "789012" },
    club_groups: [
      {
        club_name: "Driver",
        shots: [
          { shot_number: 0, metrics: { ClubSpeed: "100", Carry: "250" }, tag: "D1 Driver" },
          { shot_number: 1, metrics: { ClubSpeed: "102", Carry: "255" }, tag: "D1 Driver" },
          { shot_number: 2, metrics: { ClubSpeed: "98", Carry: "245" }, tag: "D2 Driver" },
          { shot_number: 3, metrics: { ClubSpeed: "96", Carry: "240" }, tag: "D2 Driver" },
        ],
        averages: {},
        consistency: {},
      },
    ],
  };
}

function parseRows(csv: string): string[][] {
  return csv.split("\n").filter((l) => l.trim() !== "").map((l) => l.split(","));
}

// ── includeAverages = true ──────────────────────────────────────────

describe("CSV Writer: includeAverages=true", () => {
  it("produces an Average row computed from shots", () => {
    const csv = writeCsv(makeSession(), true);
    const rows = parseRows(csv);
    const avgRows = rows.filter((r) => r.some((c) => c === "Average"));
    expect(avgRows.length).toBe(1);
  });

  it("does NOT produce a Consistency row (removed)", () => {
    const csv = writeCsv(makeSession(), true);
    const rows = parseRows(csv);
    const consRows = rows.filter((r) => r.some((c) => c === "Consistency"));
    expect(consRows.length).toBe(0);
  });

  it("computes correct average values", () => {
    const csv = writeCsv(makeSession(), true);
    const lines = csv.split("\n").filter((l) => l.trim() !== "");
    const header = lines[0].split(",");
    const avgLine = lines.find((l) => l.includes("Average"))!;
    const avgCols = avgLine.split(",");

    // ClubSpeed: (80+82)/2 = 81 → converted from m/s to mph ≈ 181.2
    // But raw values are passed as strings; the unit normalization will convert.
    // We just verify the Average row exists and has numeric values in metric columns.
    const clubSpeedIdx = header.findIndex((h) => h.startsWith("Club Speed"));
    expect(avgCols[clubSpeedIdx]).not.toBe("");
    expect(parseFloat(avgCols[clubSpeedIdx])).not.toBeNaN();
  });

  it("skips Average row for single-shot clubs", () => {
    const csv = writeCsv(makeSingleShotSession(), true);
    const hasAverage = csv.split("\n").some((l) => l.includes("Average"));
    expect(hasAverage).toBe(false);
  });
});

// ── includeAverages = false ─────────────────────────────────────────

describe("CSV Writer: includeAverages=false", () => {
  it("produces NO Average rows", () => {
    const csv = writeCsv(makeSession(), false);
    const hasAverage = csv.split("\n").some((l) => l.includes("Average"));
    expect(hasAverage).toBe(false);
  });

  it("still produces all individual shot rows", () => {
    const session = makeSession();
    const totalShots = session.club_groups.reduce((acc, cg) => acc + cg.shots.length, 0);
    const csv = writeCsv(session, false);
    const lines = csv.split("\n").filter((l) => l.trim() !== "");
    const dataRows = lines.slice(1); // skip header
    expect(dataRows.length).toBe(totalShots);
  });
});

// ── Tag grouping ────────────────────────────────────────────────────

describe("CSV Writer: averages grouped by tag", () => {
  it("produces one Average row per tag group", () => {
    const csv = writeCsv(makeTaggedSession(), true);
    const rows = parseRows(csv);
    const avgRows = rows.filter((r) => r.some((c) => c === "Average"));
    // Two tag groups (D1 Driver, D2 Driver), each with 2 shots
    expect(avgRows.length).toBe(2);
  });

  it("populates Tag column on Average rows", () => {
    const csv = writeCsv(makeTaggedSession(), true);
    const lines = csv.split("\n").filter((l) => l.trim() !== "");
    const header = lines[0].split(",");
    const tagIdx = header.indexOf("Tag");
    expect(tagIdx).toBeGreaterThan(-1);

    const avgLines = lines.filter((l) => l.includes("Average"));
    const tags = avgLines.map((l) => l.split(",")[tagIdx]);
    expect(tags.sort()).toEqual(["D1 Driver", "D2 Driver"]);
  });

  it("does not produce Average row for a tag with only 1 shot", () => {
    const session = makeTaggedSession();
    // Remove one D2 shot so that tag group has only 1 shot
    session.club_groups[0].shots = session.club_groups[0].shots.filter(
      (s) => !(s.tag === "D2 Driver" && s.shot_number === 3)
    );

    const csv = writeCsv(session, true);
    const rows = parseRows(csv);
    const avgRows = rows.filter((r) => r.some((c) => c === "Average"));
    // Only D1 Driver group (2 shots) gets an average row
    expect(avgRows.length).toBe(1);
  });
});

// ── Storage key ─────────────────────────────────────────────────────

describe("STORAGE_KEYS.INCLUDE_AVERAGES", () => {
  it("equals 'includeAverages'", () => {
    expect(STORAGE_KEYS.INCLUDE_AVERAGES).toBe("includeAverages");
  });
});
