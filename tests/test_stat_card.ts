/**
 * Tests for stat card: computeClubAverage and unit integration.
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeAll } from "vitest";

// Mock chrome API before importing popup.ts (which calls document.addEventListener at module level)
beforeAll(() => {
  // Minimal chrome stub so popup.ts module loads without errors
  const storageMock = {
    get: vi.fn((_keys: unknown, cb: (result: Record<string, unknown>) => void) => cb({})),
    set: vi.fn(),
    remove: vi.fn(),
  };
  (globalThis as Record<string, unknown>).chrome = {
    storage: {
      local: storageMock,
      sync: storageMock,
    },
    runtime: {
      onMessage: { addListener: vi.fn() },
      sendMessage: vi.fn(),
      openOptionsPage: vi.fn(),
    },
  };
});

import { computeClubAverage } from "../src/popup/popup";
import {
  normalizeMetricValue,
  getApiSourceUnitSystem,
  DISTANCE_LABELS,
  SPEED_LABELS,
} from "../src/shared/unit_normalization";
import type { Shot } from "../src/models/types";

describe("computeClubAverage", () => {
  it("averages two carry values", () => {
    const shots: Shot[] = [
      { shot_number: 1, metrics: { Carry: 150 } },
      { shot_number: 2, metrics: { Carry: 160 } },
    ];
    expect(computeClubAverage(shots, "Carry")).toBe(155.0);
  });

  it("averages three carry values", () => {
    const shots: Shot[] = [
      { shot_number: 1, metrics: { Carry: 150 } },
      { shot_number: 2, metrics: { Carry: 160 } },
      { shot_number: 3, metrics: { Carry: 155 } },
    ];
    expect(computeClubAverage(shots, "Carry")).toBe(155.0);
  });

  it("returns null for empty array", () => {
    expect(computeClubAverage([], "Carry")).toBeNull();
  });

  it("returns null when metric not present", () => {
    const shots: Shot[] = [
      { shot_number: 1, metrics: {} },
    ];
    expect(computeClubAverage(shots, "Carry")).toBeNull();
  });

  it("skips shots with missing metric", () => {
    const shots: Shot[] = [
      { shot_number: 1, metrics: { Carry: 150 } },
      { shot_number: 2, metrics: {} },
    ];
    expect(computeClubAverage(shots, "Carry")).toBe(150.0);
  });

  it("skips shots with empty string metric", () => {
    const shots: Shot[] = [
      { shot_number: 1, metrics: { Carry: "" } },
      { shot_number: 2, metrics: { Carry: 150 } },
    ];
    expect(computeClubAverage(shots, "Carry")).toBe(150.0);
  });

  it("rounds result to 1 decimal place", () => {
    const shots: Shot[] = [
      { shot_number: 1, metrics: { Carry: 100 } },
      { shot_number: 2, metrics: { Carry: 101 } },
      { shot_number: 3, metrics: { Carry: 102 } },
    ];
    // (100 + 101 + 102) / 3 = 101.0
    expect(computeClubAverage(shots, "Carry")).toBe(101.0);

    const shots2: Shot[] = [
      { shot_number: 1, metrics: { Carry: 10 } },
      { shot_number: 2, metrics: { Carry: 11 } },
      { shot_number: 3, metrics: { Carry: 11 } },
    ];
    // (10 + 11 + 11) / 3 = 10.666... -> 10.7
    expect(computeClubAverage(shots2, "Carry")).toBe(10.7);
  });
});

describe("normalizeMetricValue integration for stat card", () => {
  const siMetadata = { nd_001: "789013" }; // Metric system (m/s, meters)
  const apiSource = getApiSourceUnitSystem(siMetadata);

  it("converts SI carry (meters) to yards", () => {
    // 137.16 meters -> ~150.0 yards (137.16 / 0.9144)
    const result = normalizeMetricValue(137.16, "Carry", apiSource, {
      speed: "mph",
      distance: "yards",
    });
    expect(result).toBeCloseTo(150.0, 0);
  });

  it("converts SI speed (m/s) to mph", () => {
    // 38.88 m/s -> ~87.0 mph (38.88 * 2.23694)
    const result = normalizeMetricValue(38.88, "ClubSpeed", apiSource, {
      speed: "mph",
      distance: "yards",
    });
    expect(result).toBeCloseTo(87.0, 0);
  });
});

describe("unit label constants", () => {
  it("DISTANCE_LABELS returns correct abbreviations", () => {
    expect(DISTANCE_LABELS["yards"]).toBe("yds");
    expect(DISTANCE_LABELS["meters"]).toBe("m");
  });

  it("SPEED_LABELS returns correct abbreviations", () => {
    expect(SPEED_LABELS["mph"]).toBe("mph");
    expect(SPEED_LABELS["m/s"]).toBe("m/s");
  });
});
