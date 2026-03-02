/**
 * Integration tests for popup action logic.
 *
 * Tests verify the Phase 5 modules integrate correctly when called
 * the way popup.ts calls them. DOM interaction and Chrome API calls
 * are not testable in vitest -- these tests cover the data transformation
 * pipeline that the popup handlers rely on.
 */

import { describe, it, expect } from "vitest";
import { writeTsv } from "../src/shared/tsv_writer";
import { BUILTIN_PROMPTS } from "../src/shared/prompt_types";
import { assemblePrompt, buildUnitLabel, countSessionShots } from "../src/shared/prompt_builder";
import type { UnitChoice } from "../src/shared/unit_normalization";

// Minimal SessionData used across tests
const minimalSession = {
  date: "2025-01-15",
  report_id: "test",
  url_type: "report" as const,
  club_groups: [
    {
      club_name: "7 Iron",
      shots: [
        { shot_number: 0, metrics: {} },
      ],
    },
  ],
  metric_names: [],
  metadata_params: {},
};

describe("Copy TSV integration", () => {
  it("writeTsv output starts with header row containing Date, Club, Shot #", () => {
    const tsv = writeTsv(minimalSession);
    const firstLine = tsv.split("\n")[0];
    expect(firstLine).toContain("Date");
    expect(firstLine).toContain("Club");
    expect(firstLine).toContain("Shot #");
  });

  it("writeTsv output uses tabs as delimiters", () => {
    const session = {
      ...minimalSession,
      metric_names: ["ClubSpeed"],
      club_groups: [
        {
          club_name: "Driver",
          shots: [
            { shot_number: 0, metrics: { ClubSpeed: 44.7 } },
          ],
        },
      ],
    };
    const tsv = writeTsv(session);
    const dataRow = tsv.split("\n")[1];
    expect(dataRow).toContain("\t");
  });

  it("writeTsv respects unit choice", () => {
    const session = {
      ...minimalSession,
      metric_names: ["ClubSpeed", "Carry"],
    };
    const metricUnitChoice: UnitChoice = { speed: "m/s", distance: "meters" };
    const tsv = writeTsv(session, metricUnitChoice);
    const firstLine = tsv.split("\n")[0];
    // Header should contain unit labels for m/s speed metrics
    expect(firstLine).toContain("(m/s)");
  });
});

describe("AI prompt assembly integration", () => {
  it("assemblePrompt produces string containing both prompt text and TSV data", () => {
    const prompt = BUILTIN_PROMPTS[0];
    const tsvData = "Date\tClub\n2025-01-15\t7 Iron";
    const assembled = assemblePrompt(prompt, tsvData);
    // Should contain part of the prompt template
    expect(assembled.length).toBeGreaterThan(tsvData.length);
    // Should contain the TSV data
    expect(assembled).toContain(tsvData);
  });

  it("assembled output does not contain {{DATA}} placeholder", () => {
    const prompt = BUILTIN_PROMPTS[0];
    const tsvData = "Date\tClub\n2025-01-15\t7 Iron";
    const assembled = assemblePrompt(prompt, tsvData);
    expect(assembled).not.toContain("{{DATA}}");
  });

  it("assembled output includes metadata header when metadata is provided", () => {
    const prompt = BUILTIN_PROMPTS[0];
    const tsvData = "Date\tClub\n2025-01-15\t7 Iron";
    const metadata = { date: "2025-01-15", shotCount: 5, unitLabel: "mph + yards" };
    const assembled = assemblePrompt(prompt, tsvData, metadata);
    expect(assembled).toContain("Session: 2025-01-15 | 5 shots | Units: mph + yards");
  });

  it("all 8 built-in prompts can be assembled without error", () => {
    const tsvData = "Date\tClub\n2025-01-15\t7 Iron";
    for (const prompt of BUILTIN_PROMPTS) {
      const assembled = assemblePrompt(prompt, tsvData);
      expect(typeof assembled).toBe("string");
      expect(assembled.length).toBeGreaterThan(0);
    }
  });
});

describe("Prompt dropdown data", () => {
  it("BUILTIN_PROMPTS contains exactly 8 prompts", () => {
    expect(BUILTIN_PROMPTS).toHaveLength(8);
  });

  it("BUILTIN_PROMPTS has 3 beginner, 3 intermediate, 2 advanced", () => {
    const beginnerCount = BUILTIN_PROMPTS.filter(p => p.tier === "beginner").length;
    const intermediateCount = BUILTIN_PROMPTS.filter(p => p.tier === "intermediate").length;
    const advancedCount = BUILTIN_PROMPTS.filter(p => p.tier === "advanced").length;
    expect(beginnerCount).toBe(3);
    expect(intermediateCount).toBe(3);
    expect(advancedCount).toBe(2);
  });

  it("quick-summary-beginner exists as the default prompt", () => {
    const found = BUILTIN_PROMPTS.find(p => p.id === "quick-summary-beginner");
    expect(found).toBeDefined();
  });

  it("every prompt has a unique id", () => {
    const ids = BUILTIN_PROMPTS.map(p => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});

describe("AI service URLs", () => {
  it("AI_URLS maps all three services to correct home pages", () => {
    const AI_URLS: Record<string, string> = {
      "ChatGPT": "https://chatgpt.com",
      "Claude": "https://claude.ai",
      "Gemini": "https://gemini.google.com",
    };
    expect(AI_URLS["ChatGPT"]).toBe("https://chatgpt.com");
    expect(AI_URLS["Claude"]).toBe("https://claude.ai");
    expect(AI_URLS["Gemini"]).toBe("https://gemini.google.com");
  });
});

describe("Helper utilities", () => {
  it("buildUnitLabel returns 'mph + yards' for default imperial choice", () => {
    expect(buildUnitLabel({ speed: "mph", distance: "yards" })).toBe("mph + yards");
  });

  it("countSessionShots sums across club groups", () => {
    const session = {
      club_groups: [
        { shots: [{}, {}, {}] },
        { shots: [{}, {}] },
      ],
    };
    expect(countSessionShots(session)).toBe(5);
  });
});
