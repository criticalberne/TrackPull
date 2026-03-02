/**
 * Tests for CSV writer unit label headers and conversion correctness.
 */

import { describe, it, expect } from "vitest";
import { writeCsv } from "../src/shared/csv_writer";
import type { SessionData } from "../src/models/types";
import type { UnitChoice } from "../src/shared/unit_normalization";

function makeSession(metrics: Record<string, string | number>, metricNames: string[], metadataParams: Record<string, string> = { nd_001: "789012" }): SessionData {
  return {
    date: "2025-01-15",
    report_id: "test-123",
    url_type: "report",
    metric_names: metricNames,
    metadata_params: metadataParams,
    club_groups: [
      {
        club_name: "7 Iron",
        shots: [
          { shot_number: 0, metrics },
        ],
        averages: {},
        consistency: {},
      },
    ],
  };
}

const imperial: UnitChoice = { speed: "mph", distance: "yards" };
const metric: UnitChoice = { speed: "m/s", distance: "meters" };
const mphMeters: UnitChoice = { speed: "mph", distance: "meters" };
const msYards: UnitChoice = { speed: "m/s", distance: "yards" };

describe("CSV Writer: mph + yards headers", () => {
  it("includes unit labels in speed column headers", () => {
    const session = makeSession(
      { ClubSpeed: "44.704", BallSpeed: "58.12" },
      ["ClubSpeed", "BallSpeed"]
    );

    const csv = writeCsv(session, false, undefined, imperial);
    const header = csv.split("\n")[0];

    expect(header).toContain("Club Speed (mph)");
    expect(header).toContain("Ball Speed (mph)");
  });

  it("includes unit labels in distance column headers", () => {
    const session = makeSession(
      { Carry: "200", Total: "215" },
      ["Carry", "Total"]
    );

    const csv = writeCsv(session, false, undefined, imperial);
    const header = csv.split("\n")[0];

    expect(header).toContain("Carry (yds)");
    expect(header).toContain("Total (yds)");
  });

  it("includes unit labels in angle column headers", () => {
    const session = makeSession(
      { AttackAngle: "-0.05", LaunchAngle: "0.2" },
      ["AttackAngle", "LaunchAngle"]
    );

    const csv = writeCsv(session, false, undefined, imperial);
    const header = csv.split("\n")[0];

    expect(header).toContain("Attack Angle (°)");
    expect(header).toContain("Launch Angle (°)");
  });
});

describe("CSV Writer: m/s + meters headers", () => {
  it("includes m/s for speed column headers", () => {
    const session = makeSession(
      { ClubSpeed: "44.704", BallSpeed: "58.12" },
      ["ClubSpeed", "BallSpeed"]
    );

    const csv = writeCsv(session, false, undefined, metric);
    const header = csv.split("\n")[0];

    expect(header).toContain("Club Speed (m/s)");
    expect(header).toContain("Ball Speed (m/s)");
  });

  it("includes m for distance column headers", () => {
    const session = makeSession(
      { Carry: "200", Total: "215" },
      ["Carry", "Total"]
    );

    const csv = writeCsv(session, false, undefined, metric);
    const header = csv.split("\n")[0];

    expect(header).toContain("Carry (m)");
    expect(header).toContain("Total (m)");
  });
});

describe("CSV Writer: mph + meters headers", () => {
  it("includes mph for speed column headers", () => {
    const session = makeSession(
      { ClubSpeed: "44.704", BallSpeed: "58.12" },
      ["ClubSpeed", "BallSpeed"]
    );

    const csv = writeCsv(session, false, undefined, mphMeters);
    const header = csv.split("\n")[0];

    expect(header).toContain("Club Speed (mph)");
    expect(header).toContain("Ball Speed (mph)");
  });

  it("includes m for distance column headers", () => {
    const session = makeSession(
      { Carry: "200", Total: "215" },
      ["Carry", "Total"]
    );

    const csv = writeCsv(session, false, undefined, mphMeters);
    const header = csv.split("\n")[0];

    expect(header).toContain("Carry (m)");
    expect(header).toContain("Total (m)");
  });
});

describe("CSV Writer: mph + meters conversion correctness", () => {
  it("converts speed from m/s to mph for mph + meters output", () => {
    const session = makeSession(
      { ClubSpeed: "44.704" },
      ["ClubSpeed"]
    );

    const csv = writeCsv(session, false, undefined, mphMeters);
    const dataRow = csv.split("\n")[1];

    // 44.704 m/s ≈ 100 mph
    expect(dataRow).toContain("100");
  });

  it("keeps distance in meters for mph + meters output", () => {
    const session = makeSession(
      { Carry: "182.88" },
      ["Carry"]
    );

    const csv = writeCsv(session, false, undefined, mphMeters);
    const dataRow = csv.split("\n")[1];

    // Should stay 182.9m (rounded to 1 decimal)
    expect(dataRow).toContain("182.9");
  });
});

describe("CSV Writer: m/s + yards headers and conversion", () => {
  it("includes m/s for speed and yds for distance headers", () => {
    const session = makeSession(
      { ClubSpeed: "44.704", Carry: "200" },
      ["ClubSpeed", "Carry"]
    );

    const csv = writeCsv(session, false, undefined, msYards);
    const header = csv.split("\n")[0];

    expect(header).toContain("Club Speed (m/s)");
    expect(header).toContain("Carry (yds)");
  });

  it("keeps speed in m/s for m/s + yards output", () => {
    const session = makeSession(
      { ClubSpeed: "44.704" },
      ["ClubSpeed"]
    );

    const csv = writeCsv(session, false, undefined, msYards);
    const dataRow = csv.split("\n")[1];

    // Should stay ~44.7 m/s
    expect(dataRow).toContain("44.7");
  });

  it("converts distance from meters to yards for m/s + yards output", () => {
    const session = makeSession(
      { Carry: "182.88" },
      ["Carry"]
    );

    const csv = writeCsv(session, false, undefined, msYards);
    const dataRow = csv.split("\n")[1];

    // 182.88m = 200 yds exactly
    expect(dataRow).toContain("200");
  });
});

describe("CSV Writer: Dimensionless metrics", () => {
  it("has no unit label for SmashFactor", () => {
    const session = makeSession(
      { SmashFactor: "1.48" },
      ["SmashFactor"]
    );

    const csv = writeCsv(session, false, undefined, imperial);
    const header = csv.split("\n")[0];

    expect(header).toContain("Smash Factor");
    expect(header).not.toContain("Smash Factor (");
  });
});

describe("CSV Writer: Fixed unit labels", () => {
  it("labels SpinRate with rpm", () => {
    const session = makeSession(
      { SpinRate: "2800" },
      ["SpinRate"]
    );

    const csv = writeCsv(session, false, undefined, imperial);
    const header = csv.split("\n")[0];

    expect(header).toContain("Spin Rate (rpm)");
  });

  it("labels HangTime with s", () => {
    const session = makeSession(
      { HangTime: "5.2" },
      ["HangTime"]
    );

    const csv = writeCsv(session, false, undefined, imperial);
    const header = csv.split("\n")[0];

    expect(header).toContain("Hang Time (s)");
  });

  it("labels LandingAngle with °", () => {
    const session = makeSession(
      { LandingAngle: "45" },
      ["LandingAngle"]
    );

    const csv = writeCsv(session, false, undefined, imperial);
    const header = csv.split("\n")[0];

    expect(header).toContain("Landing Angle (°)");
  });
});

describe("CSV Writer: Conversion correctness", () => {
  it("converts speed from m/s to mph for mph + yards output", () => {
    const session = makeSession(
      { ClubSpeed: "44.704" },
      ["ClubSpeed"]
    );

    const csv = writeCsv(session, false, undefined, imperial);
    const dataRow = csv.split("\n")[1];

    // 44.704 m/s ≈ 100 mph
    expect(dataRow).toContain("100");
  });

  it("keeps speed in m/s for m/s + meters output", () => {
    const session = makeSession(
      { ClubSpeed: "44.704" },
      ["ClubSpeed"]
    );

    const csv = writeCsv(session, false, undefined, metric);
    const dataRow = csv.split("\n")[1];

    // Should stay ~44.7 m/s
    expect(dataRow).toContain("44.7");
  });

  it("converts distance from meters to yards for mph + yards output", () => {
    const session = makeSession(
      { Carry: "182.88" },
      ["Carry"]
    );

    const csv = writeCsv(session, false, undefined, imperial);
    const dataRow = csv.split("\n")[1];

    // 182.88m = 200 yds exactly (182.88 / 0.9144 = 200)
    expect(dataRow).toContain("200");
  });

  it("keeps distance in meters for m/s + meters output", () => {
    const session = makeSession(
      { Carry: "182.88" },
      ["Carry"]
    );

    const csv = writeCsv(session, false, undefined, metric);
    const dataRow = csv.split("\n")[1];

    // Should stay 182.9m (rounded to 1 decimal)
    expect(dataRow).toContain("182.9");
  });

  it("produces correct mph+yards and m/s+meters CSVs for same data", () => {
    const session = makeSession(
      { ClubSpeed: "44.704", Carry: "200", SmashFactor: "1.48" },
      ["ClubSpeed", "Carry", "SmashFactor"]
    );

    const imperialCsv = writeCsv(session, false, undefined, imperial);
    const metricCsv = writeCsv(session, false, undefined, metric);

    const imperialHeader = imperialCsv.split("\n")[0];
    const metricHeader = metricCsv.split("\n")[0];

    // Headers differ by unit labels
    expect(imperialHeader).toContain("Club Speed (mph)");
    expect(metricHeader).toContain("Club Speed (m/s)");
    expect(imperialHeader).toContain("Carry (yds)");
    expect(metricHeader).toContain("Carry (m)");

    // SmashFactor has no unit label in either
    expect(imperialHeader).toContain("Smash Factor");
    expect(imperialHeader).not.toContain("Smash Factor (");
    expect(metricHeader).toContain("Smash Factor");
    expect(metricHeader).not.toContain("Smash Factor (");
  });
});
