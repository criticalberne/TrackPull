/**
 * Tests for multi-page metric group merging functionality.
 */

import { describe, it, expect } from "vitest";
import { mergeSessionData } from "../src/models/types";
import type { SessionData, Shot, ClubGroup } from "../src/models/types";

function createMockSession(
  date: string = "2024-01-15",
  reportId: string = "12345",
  clubName: string = "Driver",
  shots: Shot[],
  metricNames: string[]
): SessionData {
  return {
    date,
    report_id: reportId,
    url_type: "report" as const,
    club_groups: [
      {
        club_name: clubName,
        shots,
        averages: {},
        consistency: {},
      },
    ],
    metric_names: metricNames,
    metadata_params: {},
  };
}

describe("mergeSessionData", () => {
  const page1: SessionData = createMockSession(
    "2024-01-15",
    "12345",
    "Driver",
    [
      { shot_number: 0, metrics: { Carry: "250.5" } },
      { shot_number: 1, metrics: { Carry: "260.3" } },
    ],
    ["Carry"]
  );

  it("merges same club with different metrics", () => {
    const page2 = createMockSession(
      "2024-01-15",
      "12345",
      "Driver",
      [
        { shot_number: 0, metrics: { SpinRate: "2800" } },
        { shot_number: 1, metrics: { SpinRate: "2900" } },
      ],
      ["SpinRate"]
    );

    const merged = mergeSessionData(page1, page2);

    expect(merged.club_groups.length).toBe(1);
    expect(merged.metric_names.length).toBe(2);
    expect(merged.metric_names).toContain("Carry");
    expect(merged.metric_names).toContain("SpinRate");

    const shot0 = merged.club_groups[0].shots[0];
    expect(shot0.metrics.Carry).toBe("250.5");
    expect(shot0.metrics.SpinRate).toBe("2800");
  });

  it("adds new shots to existing club", () => {
    const page3 = createMockSession(
      "2024-01-15",
      "12345",
      "Driver",
      [
        { shot_number: 0, metrics: { Carry: "250.5" } },
        { shot_number: 1, metrics: { Carry: "260.3" } },
        { shot_number: 2, metrics: { Carry: "248.7" } },
      ],
      ["Carry"]
    );

    const merged = mergeSessionData(page1, page3);

    expect(merged.club_groups[0].shots.length).toBe(3);
    expect(merged.club_groups[0].shots[2].metrics.Carry).toBe("248.7");
  });

  it("merges different clubs", () => {
    const page4 = createMockSession(
      "2024-01-15",
      "12345",
      "Iron",
      [
        { shot_number: 0, metrics: { ClubSpeed: "95.2" } },
        { shot_number: 1, metrics: { ClubSpeed: "96.5" } },
      ],
      ["ClubSpeed"]
    );

    const merged = mergeSessionData(page1, page4);

    expect(merged.club_groups.length).toBe(2);

    const driverGroup = merged.club_groups.find((c) => c.club_name === "Driver");
    const ironGroup = merged.club_groups.find((c) => c.club_name === "Iron");

    expect(driverGroup).toBeTruthy();
    expect(ironGroup).toBeTruthy();
  });

  it("merges averages and consistency data", () => {
    const page5 = createMockSession(
      "2024-01-15",
      "12345",
      "Driver",
      [{ shot_number: 0, metrics: { Carry: "250.5" } }],
      ["Carry"]
    );

    const page6 = createMockSession(
      "2024-01-15",
      "12345",
      "Driver",
      [{ shot_number: 0, metrics: { Carry: "255.3" } }],
      ["Carry"]
    );
    (page6.club_groups[0] as ClubGroup).averages = { Carry: "255.3" };
    (page6.club_groups[0] as ClubGroup).consistency = { Carry: "high" };

    const merged = mergeSessionData(page5, page6);

    expect(merged.club_groups[0].averages.Carry).toBe("255.3");
    expect(merged.club_groups[0].consistency.Carry).toBe("high");
  });

  it("adds new club with new metrics", () => {
    const page7 = createMockSession(
      "2024-01-15",
      "12345",
      "Wedge",
      [{ shot_number: 0, metrics: { Distance: "100" } }],
      ["Distance"]
    );

    const merged = mergeSessionData(page1, page7);

    expect(merged.metric_names.length).toBeGreaterThanOrEqual(2);
    expect(merged.metric_names).toContain("Distance");
  });

  it("handles merging empty session", () => {
    const emptySession: SessionData = {
      date: "2024-01-15",
      report_id: "12345",
      url_type: "report" as const,
      club_groups: [],
      metric_names: [],
      metadata_params: {},
    };

    const merged = mergeSessionData(page1, emptySession);

    expect(merged.club_groups.length).toBe(1);
    expect(merged.metric_names.length).toBeGreaterThanOrEqual(1);
  });

  it("merges multiple shots with partial metric overlap", () => {
    const page8 = createMockSession(
      "2024-01-15",
      "12345",
      "Driver",
      [
        { shot_number: 0, metrics: { Carry: "250" } },
        { shot_number: 1, metrics: { BallSpeed: "170" } },
        { shot_number: 2, metrics: {} },
      ],
      ["Carry", "BallSpeed"]
    );

    const page9 = createMockSession(
      "2024-01-15",
      "12345",
      "Driver",
      [
        { shot_number: 0, metrics: { SpinRate: "2800" } },
        { shot_number: 1, metrics: { SmashFactor: "9.0" } },
        { shot_number: 2, metrics: { Carry: "245" } },
      ],
      ["SpinRate", "SmashFactor", "Carry"]
    );

    const merged = mergeSessionData(page8, page9);

    expect(merged.club_groups[0].shots.length).toBeGreaterThanOrEqual(3);

    const shot0 = merged.club_groups[0].shots[0];
    expect(
      shot0.metrics.Carry !== undefined || shot0.metrics.SpinRate !== undefined
    ).toBe(true);

    const shot1 = merged.club_groups[0].shots[1];
    expect(
      shot1.metrics.BallSpeed !== undefined || shot1.metrics.SmashFactor !== undefined
    ).toBe(true);
  });
});

describe("mergeSessionData multi-step", () => {
  it("accumulates metrics across multiple page loads", () => {
    const session1 = createMockSession(
      "2024-01-15",
      "TEST-789",
      "Driver",
      [{ shot_number: 0, metrics: { Carry: "265.2" } }],
      ["Carry"]
    );

    const session2 = createMockSession(
      "2024-01-15",
      "TEST-789",
      "Driver",
      [{ shot_number: 0, metrics: { BallSpeed: "178.5" } }],
      ["BallSpeed"]
    );

    const session3 = createMockSession(
      "2024-01-15",
      "TEST-789",
      "Driver",
      [{ shot_number: 0, metrics: { SpinRate: "2950" } }],
      ["SpinRate"]
    );

    const afterStep1 = mergeSessionData(session1, session2);
    expect(afterStep1.metric_names.length).toBe(2);

    const afterStep2 = mergeSessionData(afterStep1, session3);
    expect(afterStep2.metric_names.length).toBe(3);

    const finalShot = afterStep2.club_groups[0].shots[0];
    expect(finalShot.metrics.Carry).toBeDefined();
    expect(finalShot.metrics.BallSpeed).toBeDefined();
    expect(finalShot.metrics.SpinRate).toBeDefined();
  });
});
