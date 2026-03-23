/**
 * Tests for unit normalization functionality.
 * Ensures values align with report units/normalization params.
 */

import { describe, it, expect } from "vitest";
import {
  extractUnitParams,
  getUnitSystemId,
  getUnitSystem,
  getApiSourceUnitSystem,
  getMetricUnitLabel,
  convertDistance,
  convertAngle,
  convertSpeed,
  convertSmallDistance,
  convertMillimeters,
  getSmallDistanceUnit,
  normalizeMetricValue,
  migrateLegacyPref,
  DISTANCE_METRICS,
  ANGLE_METRICS,
  SPEED_METRICS,
  SMALL_DISTANCE_METRICS,
  MILLIMETER_METRICS,
  UNIT_SYSTEMS,
  type UnitChoice,
} from "../src/shared/unit_normalization";

describe("Unit Parameter Extraction", () => {
  it("extracts nd_* parameters correctly", () => {
    const metadataParams = {
      nd_001: "789012",
      nd_002: "789013",
      r: "12345",
      "mp[]": "Carry",
    };

    const result = extractUnitParams(metadataParams);
    
    expect(result).toEqual({
      "001": "789012",
      "002": "789013",
    });
  });

  it("handles case-insensitive nd_* keys", () => {
    const metadataParams = {
      ND_001: "789014",
      Nd_002: "789012",
    };

    const result = extractUnitParams(metadataParams);
    
    expect(result).toEqual({
      "001": "789014",
      "002": "789012",
    });
  });

  it("returns empty object when no nd_* parameters exist", () => {
    const metadataParams = {
      r: "12345",
      "mp[]": "Carry",
    };

    const result = extractUnitParams(metadataParams);
    
    expect(result).toEqual({});
  });

  it("handles empty metadata params", () => {
    const result = extractUnitParams({});
    expect(result).toEqual({});
  });
});

describe("Unit System ID Resolution", () => {
  it("gets unit system ID from nd_001 parameter", () => {
    const metadataParams = {
      nd_001: "789013",
      r: "12345",
    };

    expect(getUnitSystemId(metadataParams)).toBe("789013");
  });

  it("defaults to Imperial (789012) when no nd_001 exists", () => {
    const metadataParams = {
      r: "12345",
    };

    expect(getUnitSystemId(metadataParams)).toBe("789012");
  });

  it("defaults to Imperial when nd_001 is empty string", () => {
    const metadataParams = {
      nd_001: "",
      r: "12345",
    };

    expect(getUnitSystemId(metadataParams)).toBe("789012");
  });
});

describe("Unit System Configuration", () => {
  it("gets full unit system config for Imperial", () => {
    const metadataParams = { nd_001: "789012" };
    const result = getUnitSystem(metadataParams);

    expect(result.id).toBe("789012");
    expect(result.name).toBe("Imperial");
    expect(result.distanceUnit).toBe("yards");
    expect(result.angleUnit).toBe("degrees");
    expect(result.speedUnit).toBe("mph");
  });

  it("gets full unit system config for Metric (radians)", () => {
    const metadataParams = { nd_001: "789013" };
    const result = getUnitSystem(metadataParams);

    expect(result.id).toBe("789013");
    expect(result.name).toBe("Metric (rad)");
    expect(result.distanceUnit).toBe("meters");
    expect(result.angleUnit).toBe("radians");
    expect(result.speedUnit).toBe("km/h");
  });

  it("gets full unit system config for Metric (degrees)", () => {
    const metadataParams = { nd_001: "789014" };
    const result = getUnitSystem(metadataParams);

    expect(result.id).toBe("789014");
    expect(result.name).toBe("Metric (deg)");
    expect(result.distanceUnit).toBe("meters");
    expect(result.angleUnit).toBe("degrees");
    expect(result.speedUnit).toBe("km/h");
  });

  it("defaults to Imperial for unknown unit system ID", () => {
    const metadataParams = { nd_001: "999999" };
    const result = getUnitSystem(metadataParams);

    expect(result.id).toBe("789012"); // Default
    expect(result.name).toBe("Imperial");
  });
});

describe("Distance Conversion", () => {
  it("converts yards to meters correctly", () => {
    const result = convertDistance(100, "yards", "meters");
    
    expect(result).toBeCloseTo(91.44, 2); // 100 * 0.9144
  });

  it("converts meters to yards correctly", () => {
    const result = convertDistance(100, "meters", "yards");
    
    expect(result).toBeCloseTo(109.36, 2); // 100 / 0.9144
  });

  it("returns same value when units match (yards)", () => {
    const result = convertDistance(150, "yards", "yards");
    
    expect(result).toBe(150);
  });

  it("returns same value when units match (meters)", () => {
    const result = convertDistance(50, "meters", "meters");
    
    expect(result).toBe(50);
  });

  it("handles string input correctly", () => {
    const result = convertDistance("120", "yards", "meters");
    
    expect(result).toBeCloseTo(109.73, 2); // 120 * 0.9144
  });

  it("returns null for null input", () => {
    const result = convertDistance(null, "yards", "meters");
    
    expect(result).toBeNull();
  });

  it("returns empty string for empty string input", () => {
    const result = convertDistance("", "yards", "meters");
    
    expect(result).toBe("");
  });

  it("handles invalid numeric strings gracefully", () => {
    const result = convertDistance("abc", "yards", "meters");
    
    expect(result).toBe("abc"); // Returns original for invalid input
  });
});

describe("Angle Conversion", () => {
  it("converts degrees to radians correctly", () => {
    const result = convertAngle(180, "degrees", "radians");
    
    expect(result).toBeCloseTo(Math.PI, 2); // π radians
  });

  it("converts radians to degrees correctly", () => {
    const result = convertAngle(Math.PI, "radians", "degrees");
    
    expect(result).toBeCloseTo(180, 2);
  });

  it("returns same value when units match (degrees)", () => {
    const result = convertAngle(45, "degrees", "degrees");
    
    expect(result).toBe(45);
  });

  it("returns same value when units match (radians)", () => {
    const result = convertAngle(Math.PI / 2, "radians", "radians");
    
    expect(result).toBeCloseTo(Math.PI / 2, 2);
  });

  it("handles string input correctly", () => {
    const result = convertAngle("90", "degrees", "radians");
    
    expect(result).toBeCloseTo(Math.PI / 2, 2); // π/2 radians
  });

  it("returns null for null input", () => {
    const result = convertAngle(null, "degrees", "radians");
    
    expect(result).toBeNull();
  });

  it("handles invalid numeric strings gracefully", () => {
    const result = convertAngle("invalid", "degrees", "radians");
    
    expect(result).toBe("invalid"); // Returns original for invalid input
  });
});

describe("Speed Conversion", () => {
  it("converts mph to km/h correctly", () => {
    const result = convertSpeed(60, "mph", "km/h");

    expect(result).toBeCloseTo(96.56, 2); // 60 * 1.609344
  });

  it("converts km/h to mph correctly", () => {
    const result = convertSpeed(100, "km/h", "mph");

    expect(result).toBeCloseTo(62.14, 2); // 100 / 1.609344
  });

  it("converts m/s to mph correctly", () => {
    const result = convertSpeed(44.704, "m/s", "mph");

    expect(result).toBeCloseTo(100, 1); // 44.704 m/s ≈ 100 mph
  });

  it("converts mph to m/s correctly", () => {
    const result = convertSpeed(100, "mph", "m/s");

    expect(result).toBeCloseTo(44.704, 1); // 100 mph ≈ 44.704 m/s
  });

  it("converts m/s to km/h correctly", () => {
    const result = convertSpeed(10, "m/s", "km/h");

    expect(result).toBeCloseTo(36, 1); // 10 m/s = 36 km/h
  });

  it("converts km/h to m/s correctly", () => {
    const result = convertSpeed(36, "km/h", "m/s");

    expect(result).toBeCloseTo(10, 1); // 36 km/h = 10 m/s
  });

  it("returns same value when units match (m/s)", () => {
    const result = convertSpeed(25, "m/s", "m/s");

    expect(result).toBe(25);
  });

  it("returns same value when units match (mph)", () => {
    const result = convertSpeed(80, "mph", "mph");

    expect(result).toBe(80);
  });

  it("returns same value when units match (km/h)", () => {
    const result = convertSpeed(120, "km/h", "km/h");

    expect(result).toBe(120);
  });

  it("handles string input correctly", () => {
    const result = convertSpeed("75", "mph", "km/h");

    expect(result).toBeCloseTo(120.70, 2); // 75 * 1.609344
  });

  it("returns null for null input", () => {
    const result = convertSpeed(null, "mph", "km/h");

    expect(result).toBeNull();
  });

  it("handles invalid numeric strings gracefully", () => {
    const result = convertSpeed("invalid", "mph", "km/h");

    expect(result).toBe("invalid"); // Returns original for invalid input
  });
});

describe("Metric Category Classification", () => {
  it("correctly classifies distance metrics", () => {
    expect(DISTANCE_METRICS.has("Carry")).toBeTruthy();
    expect(DISTANCE_METRICS.has("Total")).toBeTruthy();
    expect(DISTANCE_METRICS.has("Side")).toBeTruthy();
    expect(DISTANCE_METRICS.has("Height")).toBeTruthy();
    expect(SMALL_DISTANCE_METRICS.has("LowPointDistance")).toBeTruthy();
    expect(MILLIMETER_METRICS.has("ImpactHeight")).toBeTruthy();
    expect(MILLIMETER_METRICS.has("ImpactOffset")).toBeTruthy();
    expect(DISTANCE_METRICS.has("CarrySide")).toBeTruthy();
    expect(DISTANCE_METRICS.has("TotalSide")).toBeTruthy();
    expect(DISTANCE_METRICS.has("MaxHeight")).toBeTruthy();
    expect(DISTANCE_METRICS.has("Curve")).toBeTruthy();
  });

  it("correctly classifies angle metrics", () => {
    expect(ANGLE_METRICS.has("AttackAngle")).toBeTruthy();
    expect(ANGLE_METRICS.has("ClubPath")).toBeTruthy();
    expect(ANGLE_METRICS.has("FaceAngle")).toBeTruthy();
    expect(ANGLE_METRICS.has("DynamicLoft")).toBeTruthy();
  });

  it("correctly classifies speed metrics", () => {
    expect(SPEED_METRICS.has("ClubSpeed")).toBeTruthy();
    expect(SPEED_METRICS.has("BallSpeed")).toBeTruthy();
    expect(SPEED_METRICS.has("Tempo")).toBeFalsy();
  });

  it("excludes non-metric keys from categories", () => {
    expect(DISTANCE_METRICS.has("SpinRate")).toBeFalsy();
    expect(ANGLE_METRICS.has("SmashFactor")).toBeFalsy();
    expect(SPEED_METRICS.has("FaceToPath")).toBeFalsy();
  });
});

describe("Metric Value Normalization", () => {
  it("normalizes distance from meters to yards", () => {
    const result = normalizeMetricValue(100, "Carry", UNIT_SYSTEMS["789013"]);

    expect(result).toBeCloseTo(109.4, 1); // 100m ≈ 109.4 yds (rounded to 1 decimal)
  });

  it("normalizes distance from yards (no change)", () => {
    const result = normalizeMetricValue(150, "Carry", UNIT_SYSTEMS["789012"]);
    
    expect(result).toBeCloseTo(150, 2); // No conversion needed
  });

  it("normalizes angle from radians to degrees", () => {
    const result = normalizeMetricValue(Math.PI / 4, "AttackAngle", UNIT_SYSTEMS["789013"]);
    
    expect(result).toBeCloseTo(45, 2); // π/4 radians = 45 degrees
  });

  it("normalizes angle from degrees (no change)", () => {
    const result = normalizeMetricValue(10, "ClubPath", UNIT_SYSTEMS["789012"]);
    
    expect(result).toBeCloseTo(10, 2); // No conversion needed
  });

  it("normalizes speed from km/h to mph", () => {
    const result = normalizeMetricValue(100, "ClubSpeed", UNIT_SYSTEMS["789013"]);

    expect(result).toBeCloseTo(62.1, 1); // 100 km/h ≈ 62.1 mph (rounded to 1 decimal)
  });

  it("normalizes speed from mph (no change)", () => {
    const result = normalizeMetricValue(90, "BallSpeed", UNIT_SYSTEMS["789012"]);
    
    expect(result).toBeCloseTo(90, 2); // No conversion needed
  });

  it("rounds normalized values to 1 decimal place", () => {
    const result = normalizeMetricValue(105.678, "ClubSpeed", UNIT_SYSTEMS["789012"]);
    
    expect(result).toBeCloseTo(105.7, 1); // Rounded to 1 decimal
  });

  it("returns null for invalid input", () => {
    const result = normalizeMetricValue(null, "Carry", UNIT_SYSTEMS["789012"]);
    
    expect(result).toBeNull();
  });

  it("returns empty string for empty string input", () => {
    const result = normalizeMetricValue("", "Carry", UNIT_SYSTEMS["789012"]);
    
    expect(result).toBe("");
  });

  it("handles unknown metrics without conversion but with rounding", () => {
    const result = normalizeMetricValue(123.456, "UnknownMetric", UNIT_SYSTEMS["789013"]);

    expect(result).toBe(123.5); // No conversion but rounded to 1 decimal
  });

  it("handles string numeric input correctly", () => {
    const result = normalizeMetricValue("105.5", "ClubSpeed", UNIT_SYSTEMS["789012"]);
    
    expect(result).toBeCloseTo(105.5, 2);
  });

  it("returns original string for non-numeric input", () => {
    const result = normalizeMetricValue("N/A", "ClubSpeed", UNIT_SYSTEMS["789012"]);
    
    expect(result).toBe("N/A"); // Original value returned
  });
});

describe("getApiSourceUnitSystem", () => {
  it("always returns m/s for speed and meters for distance", () => {
    const result = getApiSourceUnitSystem({ nd_001: "789012" });

    expect(result.speedUnit).toBe("m/s");
    expect(result.distanceUnit).toBe("meters");
  });

  it("preserves angle unit from imperial report (degrees)", () => {
    const result = getApiSourceUnitSystem({ nd_001: "789012" });

    expect(result.angleUnit).toBe("degrees");
  });

  it("preserves angle unit from metric/radians report", () => {
    const result = getApiSourceUnitSystem({ nd_001: "789013" });

    expect(result.angleUnit).toBe("radians");
  });

  it("preserves angle unit from metric/degrees report", () => {
    const result = getApiSourceUnitSystem({ nd_001: "789014" });

    expect(result.angleUnit).toBe("degrees");
  });

  it("defaults to imperial angle unit when no metadata", () => {
    const result = getApiSourceUnitSystem({});

    expect(result.speedUnit).toBe("m/s");
    expect(result.distanceUnit).toBe("meters");
    expect(result.angleUnit).toBe("degrees");
  });
});

describe("getMetricUnitLabel", () => {
  const imperial: UnitChoice = { speed: "mph", distance: "yards" };
  const metric: UnitChoice = { speed: "m/s", distance: "meters" };
  const mphMeters: UnitChoice = { speed: "mph", distance: "meters" };
  const msYards: UnitChoice = { speed: "m/s", distance: "yards" };

  it("returns mph for speed metrics with mph + yards", () => {
    expect(getMetricUnitLabel("ClubSpeed", imperial)).toBe("mph");
    expect(getMetricUnitLabel("BallSpeed", imperial)).toBe("mph");
  });

  it("returns m/s for speed metrics with m/s + meters", () => {
    expect(getMetricUnitLabel("ClubSpeed", metric)).toBe("m/s");
    expect(getMetricUnitLabel("BallSpeed", metric)).toBe("m/s");
  });

  it("returns yds for distance metrics with mph + yards", () => {
    expect(getMetricUnitLabel("Carry", imperial)).toBe("yds");
    expect(getMetricUnitLabel("Total", imperial)).toBe("yds");
  });

  it("returns m for distance metrics with m/s + meters", () => {
    expect(getMetricUnitLabel("Carry", metric)).toBe("m");
    expect(getMetricUnitLabel("Total", metric)).toBe("m");
  });

  it("returns mph for speed metrics with mph + meters", () => {
    expect(getMetricUnitLabel("ClubSpeed", mphMeters)).toBe("mph");
    expect(getMetricUnitLabel("BallSpeed", mphMeters)).toBe("mph");
  });

  it("returns m for distance metrics with mph + meters", () => {
    expect(getMetricUnitLabel("Carry", mphMeters)).toBe("m");
    expect(getMetricUnitLabel("Total", mphMeters)).toBe("m");
  });

  it("returns m/s for speed metrics with m/s + yards", () => {
    expect(getMetricUnitLabel("ClubSpeed", msYards)).toBe("m/s");
    expect(getMetricUnitLabel("BallSpeed", msYards)).toBe("m/s");
  });

  it("returns yds for distance metrics with m/s + yards", () => {
    expect(getMetricUnitLabel("Carry", msYards)).toBe("yds");
    expect(getMetricUnitLabel("Total", msYards)).toBe("yds");
  });

  it("returns ° for angle metrics", () => {
    expect(getMetricUnitLabel("AttackAngle", imperial)).toBe("°");
    expect(getMetricUnitLabel("ClubPath", metric)).toBe("°");
    expect(getMetricUnitLabel("FaceAngle", mphMeters)).toBe("°");
  });

  it("returns empty string for dimensionless metrics", () => {
    expect(getMetricUnitLabel("SmashFactor", imperial)).toBe("");
    expect(getMetricUnitLabel("SpinAxis", metric)).toBe("");
  });

  it("returns fixed labels for SpinRate and HangTime", () => {
    expect(getMetricUnitLabel("SpinRate", imperial)).toBe("rpm");
    expect(getMetricUnitLabel("SpinRate", metric)).toBe("rpm");
    expect(getMetricUnitLabel("HangTime", imperial)).toBe("s");
    expect(getMetricUnitLabel("HangTime", metric)).toBe("s");
  });

  it("returns ° for LandingAngle", () => {
    expect(getMetricUnitLabel("LandingAngle", imperial)).toBe("°");
    expect(getMetricUnitLabel("LandingAngle", metric)).toBe("°");
  });

  it("defaults to mph + yards when no choice specified", () => {
    expect(getMetricUnitLabel("ClubSpeed")).toBe("mph");
    expect(getMetricUnitLabel("Carry")).toBe("yds");
  });
});

describe("normalizeMetricValue with UnitChoice", () => {
  // Use an API source unit system (m/s + meters)
  const apiSource = getApiSourceUnitSystem({ nd_001: "789012" });
  const imperial: UnitChoice = { speed: "mph", distance: "yards" };
  const metric: UnitChoice = { speed: "m/s", distance: "meters" };
  const mphMeters: UnitChoice = { speed: "mph", distance: "meters" };
  const msYards: UnitChoice = { speed: "m/s", distance: "yards" };

  it("converts m/s to mph for mph + yards", () => {
    const result = normalizeMetricValue(44.704, "ClubSpeed", apiSource, imperial);

    expect(result).toBeCloseTo(100, 0); // ~100 mph
  });

  it("keeps m/s for m/s + meters", () => {
    const result = normalizeMetricValue(44.704, "ClubSpeed", apiSource, metric);

    expect(result).toBeCloseTo(44.7, 1);
  });

  it("converts meters to yards for mph + yards", () => {
    const result = normalizeMetricValue(200, "Carry", apiSource, imperial);

    expect(result).toBeCloseTo(218.7, 1); // 200m ≈ 218.7 yds
  });

  it("keeps meters for m/s + meters", () => {
    const result = normalizeMetricValue(200, "Carry", apiSource, metric);

    expect(result).toBeCloseTo(200, 1);
  });

  it("converts new distance metrics (CarrySide)", () => {
    const result = normalizeMetricValue(10, "CarrySide", apiSource, imperial);

    expect(result).toBeCloseTo(10.9, 1); // 10m ≈ 10.9 yds
  });

  it("converts new distance metrics (TotalSide)", () => {
    const result = normalizeMetricValue(15, "TotalSide", apiSource, imperial);

    expect(result).toBeCloseTo(16.4, 1);
  });

  it("converts new distance metrics (MaxHeight)", () => {
    const result = normalizeMetricValue(30, "MaxHeight", apiSource, imperial);

    expect(result).toBeCloseTo(32.8, 1);
  });

  it("converts new distance metrics (Curve)", () => {
    const result = normalizeMetricValue(5, "Curve", apiSource, imperial);

    expect(result).toBeCloseTo(5.5, 1);
  });

  it("converts m/s to mph for mph + meters", () => {
    const result = normalizeMetricValue(44.704, "ClubSpeed", apiSource, mphMeters);

    expect(result).toBeCloseTo(100, 0); // mph + meters uses mph for speed
  });

  it("keeps meters for mph + meters", () => {
    const result = normalizeMetricValue(200, "Carry", apiSource, mphMeters);

    expect(result).toBeCloseTo(200, 1); // mph + meters keeps meters for distance
  });

  it("keeps m/s for m/s + yards", () => {
    const result = normalizeMetricValue(44.704, "ClubSpeed", apiSource, msYards);

    expect(result).toBeCloseTo(44.7, 1); // m/s + yards keeps m/s for speed
  });

  it("converts meters to yards for m/s + yards", () => {
    const result = normalizeMetricValue(200, "Carry", apiSource, msYards);

    expect(result).toBeCloseTo(218.7, 1); // m/s + yards converts to yards
  });

  it("always converts angles to degrees regardless of unit choice", () => {
    const apiRadians = getApiSourceUnitSystem({ nd_001: "789013" });
    const r1 = normalizeMetricValue(0.1745, "AttackAngle", apiRadians, imperial);
    const r2 = normalizeMetricValue(0.1745, "AttackAngle", apiRadians, metric);
    const r3 = normalizeMetricValue(0.1745, "AttackAngle", apiRadians, mphMeters);
    const r4 = normalizeMetricValue(0.1745, "AttackAngle", apiRadians, msYards);

    expect(r1).toBeCloseTo(10.0, 1);
    expect(r2).toBeCloseTo(10.0, 1);
    expect(r3).toBeCloseTo(10.0, 1);
    expect(r4).toBeCloseTo(10.0, 1);
  });

  it("defaults to mph + yards when unitChoice not specified", () => {
    const result = normalizeMetricValue(44.704, "ClubSpeed", apiSource);

    expect(result).toBeCloseTo(100, 0);
  });
});

describe("migrateLegacyPref", () => {
  it("migrates 'imperial' to mph + yards", () => {
    expect(migrateLegacyPref("imperial")).toEqual({ speed: "mph", distance: "yards" });
  });

  it("migrates 'metric' to m/s + meters", () => {
    expect(migrateLegacyPref("metric")).toEqual({ speed: "m/s", distance: "meters" });
  });

  it("migrates 'hybrid' to mph + meters", () => {
    expect(migrateLegacyPref("hybrid")).toEqual({ speed: "mph", distance: "meters" });
  });

  it("migrates undefined to mph + yards (default)", () => {
    expect(migrateLegacyPref(undefined)).toEqual({ speed: "mph", distance: "yards" });
  });
});

describe("Integration: Full Unit System Conversion Flow", () => {
  it("converts a complete set of metrics from Metric to Imperial", () => {
    const unitSystem = UNIT_SYSTEMS["789013"]; // Metric (rad)

    const conversions = [
      { metric: "Carry", value: 250, expectedMin: 272, expectedMax: 274 }, // meters to yards
      { metric: "AttackAngle", value: 0.1745, expectedMin: 9.9, expectedMax: 10.0 }, // radians to degrees
      { metric: "ClubSpeed", value: 96.56, expectedMin: 59.9, expectedMax: 60.0 }, // km/h to mph
    ];

    conversions.forEach(({ metric, value, expectedMin, expectedMax }) => {
      const result = normalizeMetricValue(value, metric, unitSystem);
      expect(result).toBeGreaterThanOrEqual(expectedMin);
      expect(result).toBeLessThanOrEqual(expectedMax);
    });
  });

  it("preserves values when source and target units match", () => {
    const unitSystem = UNIT_SYSTEMS["789012"]; // Imperial

    const metrics = ["Carry", "ClubSpeed", "AttackAngle", "SpinRate"];

    metrics.forEach(metric => {
      let value: number | string;
      switch (metric) {
        case "Carry": value = 280; break;
        case "ClubSpeed": value = 105; break;
        case "AttackAngle": value = -3.5; break;
        default: value = 2500;
      }

      const result = normalizeMetricValue(value, metric, unitSystem);
      expect(result).toBeCloseTo(value, 2); // No change expected
    });
  });
});

describe("convertSmallDistance", () => {
  it("converts meters to inches", () => {
    const result = convertSmallDistance(0.003, "inches");
    expect(result).toBeCloseTo(0.1181, 3); // 0.003 * 39.3701
  });

  it("converts meters to cm", () => {
    const result = convertSmallDistance(0.003, "cm");
    expect(result).toBeCloseTo(0.3, 4); // 0.003 * 100
  });

  it("returns null for null input", () => {
    expect(convertSmallDistance(null, "inches")).toBeNull();
  });

  it("returns empty string for empty string input", () => {
    expect(convertSmallDistance("", "cm")).toBe("");
  });

  it("returns original for NaN string input", () => {
    expect(convertSmallDistance("abc", "inches")).toBe("abc");
  });

  it("handles string numeric input", () => {
    const result = convertSmallDistance("0.01", "inches");
    expect(result).toBeCloseTo(0.3937, 3);
  });
});

describe("convertMillimeters", () => {
  it("converts meters to millimeters", () => {
    const result = convertMillimeters(0.0056);
    expect(result).toBeCloseTo(5.6, 4);
  });

  it("preserves negative values", () => {
    const result = convertMillimeters(-0.0012);
    expect(result).toBeCloseTo(-1.2, 4);
  });

  it("returns null for null input", () => {
    expect(convertMillimeters(null)).toBeNull();
  });

  it("returns empty string for empty input", () => {
    expect(convertMillimeters("")).toBe("");
  });
});

describe("getSmallDistanceUnit", () => {
  it("returns inches when distance is yards", () => {
    expect(getSmallDistanceUnit({ speed: "mph", distance: "yards" })).toBe("inches");
  });

  it("returns cm when distance is meters", () => {
    expect(getSmallDistanceUnit({ speed: "m/s", distance: "meters" })).toBe("cm");
  });

  it("returns inches for default unit choice", () => {
    expect(getSmallDistanceUnit()).toBe("inches");
  });
});

describe("getMetricUnitLabel with LowPointDistance", () => {
  it("returns 'in' for LowPointDistance with yards", () => {
    expect(getMetricUnitLabel("LowPointDistance", { speed: "mph", distance: "yards" })).toBe("in");
  });

  it("returns 'cm' for LowPointDistance with meters", () => {
    expect(getMetricUnitLabel("LowPointDistance", { speed: "m/s", distance: "meters" })).toBe("cm");
  });

  it("returns 'in' for LowPointDistance with mph + meters (uses distance for small unit)", () => {
    expect(getMetricUnitLabel("LowPointDistance", { speed: "mph", distance: "meters" })).toBe("cm");
  });
});

describe("getMetricUnitLabel with impact metrics", () => {
  it("returns 'mm' for ImpactHeight regardless of unit choice", () => {
    expect(getMetricUnitLabel("ImpactHeight", { speed: "mph", distance: "yards" })).toBe("mm");
    expect(getMetricUnitLabel("ImpactHeight", { speed: "m/s", distance: "meters" })).toBe("mm");
  });

  it("returns 'mm' for ImpactOffset regardless of unit choice", () => {
    expect(getMetricUnitLabel("ImpactOffset", { speed: "mph", distance: "yards" })).toBe("mm");
    expect(getMetricUnitLabel("ImpactOffset", { speed: "m/s", distance: "meters" })).toBe("mm");
  });
});

describe("normalizeMetricValue with LowPointDistance", () => {
  const apiSource = getApiSourceUnitSystem({ nd_001: "789012" });

  it("converts LowPointDistance meters to inches for yards users", () => {
    const result = normalizeMetricValue(0.003, "LowPointDistance", apiSource, { speed: "mph", distance: "yards" });
    expect(result).toBeCloseTo(0.1, 1); // 0.003 * 39.3701 ≈ 0.1181 → rounded to 0.1
  });

  it("converts LowPointDistance meters to cm for meters users", () => {
    const result = normalizeMetricValue(0.003, "LowPointDistance", apiSource, { speed: "m/s", distance: "meters" });
    expect(result).toBeCloseTo(0.3, 1); // 0.003 * 100 = 0.3
  });

  it("handles larger LowPointDistance values", () => {
    const result = normalizeMetricValue(0.05, "LowPointDistance", apiSource, { speed: "mph", distance: "yards" });
    expect(result).toBeCloseTo(2.0, 1); // 0.05 * 39.3701 ≈ 1.969 → rounded to 2.0
  });
});

describe("normalizeMetricValue with impact metrics", () => {
  const apiSource = getApiSourceUnitSystem({ nd_001: "789012" });

  it("converts ImpactHeight meters to rounded millimeters", () => {
    const result = normalizeMetricValue(0.0056, "ImpactHeight", apiSource, { speed: "mph", distance: "yards" });
    expect(result).toBe(6);
  });

  it("converts ImpactOffset meters to rounded millimeters", () => {
    const result = normalizeMetricValue(-0.0012, "ImpactOffset", apiSource, { speed: "m/s", distance: "meters" });
    expect(result).toBe(-1);
  });

  it("uses millimeters regardless of user distance preference", () => {
    const imperial = normalizeMetricValue(0.0049, "ImpactHeight", apiSource, { speed: "mph", distance: "yards" });
    const metric = normalizeMetricValue(0.0049, "ImpactHeight", apiSource, { speed: "m/s", distance: "meters" });
    expect(imperial).toBe(5);
    expect(metric).toBe(5);
  });
});

describe("SpinRate rounding", () => {
  const apiSource = getApiSourceUnitSystem({ nd_001: "789012" });

  it("rounds SpinRate to whole numbers", () => {
    const result = normalizeMetricValue(2543.7, "SpinRate", apiSource);
    expect(result).toBe(2544);
  });

  it("rounds SpinRate down when below .5", () => {
    const result = normalizeMetricValue(2543.3, "SpinRate", apiSource);
    expect(result).toBe(2543);
  });

  it("rounds SpinRate at .5 up", () => {
    const result = normalizeMetricValue(2543.5, "SpinRate", apiSource);
    expect(result).toBe(2544);
  });
});
