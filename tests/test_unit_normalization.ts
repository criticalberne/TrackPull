/**
 * Tests for unit normalization functionality.
 * Ensures values align with report units/normalization params.
 */

import { describe, it, expect } from "vitest";
import {
  extractUnitParams,
  getUnitSystemId,
  getUnitSystem,
  convertDistance,
  convertAngle,
  convertSpeed,
  normalizeMetricValue,
  DISTANCE_METRICS,
  ANGLE_METRICS,
  SPEED_METRICS,
  UNIT_SYSTEMS,
} from "../src/shared/unit_normalization";

describe("Unit Parameter Extraction", () => {
  it("extracts nd_* parameters correctly", () => {
    const metadataParams = {
      nd_001: "789012",
      nd_002: "789013",
      r: "12345",
      mp[]: "Carry",
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
      mp[]: "Carry",
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
    expect(DISTANCE_METRICS.has("LowPointDistance")).toBeTruthy();
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
    expect(SPEED_METRICS.has("Tempo")).toBeTruthy();
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
    
    expect(result).toBeCloseTo(109.36, 2); // ~109 yards
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
    
    expect(result).toBeCloseTo(62.14, 2); // ~62 mph
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

  it("handles unknown metrics without conversion", () => {
    const result = normalizeMetricValue(123.456, "UnknownMetric", UNIT_SYSTEMS["789013"]);
    
    expect(result).toBe(123.456); // No conversion applied
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
