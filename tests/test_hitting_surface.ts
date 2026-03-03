/**
 * Tests for hitting surface metadata injection in CSV, TSV, and prompt output.
 * Verifies surface header appears when hittingSurface is provided and is absent when omitted.
 */

import { describe, it, expect } from "vitest";
import type { SessionData } from "../src/models/types";
import { writeCsv } from "../src/shared/csv_writer";
import { writeTsv } from "../src/shared/tsv_writer";
import { assemblePrompt } from "../src/shared/prompt_builder";
import type { PromptMetadata } from "../src/shared/prompt_builder";
import type { UnitChoice } from "../src/shared/unit_normalization";
import type { BuiltInPrompt } from "../src/shared/prompt_types";

const imperial: UnitChoice = { speed: "mph", distance: "yards" };

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

const testPrompt: BuiltInPrompt = {
  id: "test",
  name: "Test",
  tier: "beginner",
  topic: "test",
  template: "Analyze: {{DATA}}",
};

describe("CSV Writer: hitting surface metadata", () => {
  it("prepends surface header when hittingSurface is 'Mat'", () => {
    const session = makeSession({ ClubSpeed: "44.704" }, ["ClubSpeed"]);
    const csv = writeCsv(session, false, undefined, imperial, "Mat");
    const firstLine = csv.split("\n")[0];
    expect(firstLine).toBe("Hitting Surface: Mat");
  });

  it("prepends surface header when hittingSurface is 'Grass'", () => {
    const session = makeSession({ ClubSpeed: "44.704" }, ["ClubSpeed"]);
    const csv = writeCsv(session, false, undefined, imperial, "Grass");
    const firstLine = csv.split("\n")[0];
    expect(firstLine).toBe("Hitting Surface: Grass");
  });

  it("omits surface header when hittingSurface is undefined", () => {
    const session = makeSession({ ClubSpeed: "44.704" }, ["ClubSpeed"]);
    const csv = writeCsv(session, false, undefined, imperial);
    const firstLine = csv.split("\n")[0];
    expect(firstLine).not.toContain("Hitting Surface:");
    // First line should be the column header row
    expect(firstLine).toContain("Date");
  });

  it("column headers are on second line when hittingSurface is set", () => {
    const session = makeSession({ ClubSpeed: "44.704" }, ["ClubSpeed"]);
    const csv = writeCsv(session, false, undefined, imperial, "Mat");
    const lines = csv.split("\n");
    expect(lines[0]).toBe("Hitting Surface: Mat");
    expect(lines[1]).toContain("Date");
  });
});

describe("TSV Writer: hitting surface metadata", () => {
  it("prepends surface header when hittingSurface is 'Mat'", () => {
    const session = makeSession({ ClubSpeed: "44.704" }, ["ClubSpeed"]);
    const tsv = writeTsv(session, imperial, "Mat");
    const firstLine = tsv.split("\n")[0];
    expect(firstLine).toBe("Hitting Surface: Mat");
  });

  it("omits surface header when hittingSurface is undefined", () => {
    const session = makeSession({ ClubSpeed: "44.704" }, ["ClubSpeed"]);
    const tsv = writeTsv(session, imperial);
    const firstLine = tsv.split("\n")[0];
    expect(firstLine).not.toContain("Hitting Surface:");
    // First line should be the column header row
    expect(firstLine).toContain("Date");
  });

  it("column headers are on second line when hittingSurface is set", () => {
    const session = makeSession({ ClubSpeed: "44.704" }, ["ClubSpeed"]);
    const tsv = writeTsv(session, imperial, "Grass");
    const lines = tsv.split("\n");
    expect(lines[0]).toBe("Hitting Surface: Grass");
    expect(lines[1]).toContain("Date");
  });
});

describe("Prompt Builder: hitting surface in context header", () => {
  it("appends surface to context header when hittingSurface is set", () => {
    const metadata: PromptMetadata = {
      date: "2025-01-15",
      shotCount: 10,
      unitLabel: "mph + yards",
      hittingSurface: "Mat",
    };
    const result = assemblePrompt(testPrompt, "col1\tval1", metadata);
    expect(result).toContain("| Surface: Mat");
  });

  it("appends Grass surface to context header when hittingSurface is 'Grass'", () => {
    const metadata: PromptMetadata = {
      date: "2025-01-15",
      shotCount: 10,
      unitLabel: "mph + yards",
      hittingSurface: "Grass",
    };
    const result = assemblePrompt(testPrompt, "col1\tval1", metadata);
    expect(result).toContain("| Surface: Grass");
  });

  it("omits surface from context header when hittingSurface is undefined", () => {
    const metadata: PromptMetadata = {
      date: "2025-01-15",
      shotCount: 10,
      unitLabel: "mph + yards",
    };
    const result = assemblePrompt(testPrompt, "col1\tval1", metadata);
    expect(result).not.toContain("Surface:");
  });

  it("omits surface entirely when no metadata is passed", () => {
    const result = assemblePrompt(testPrompt, "col1\tval1");
    expect(result).not.toContain("Surface:");
  });
});
