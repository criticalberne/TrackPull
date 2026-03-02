import { describe, it, expect } from "vitest";
import {
  assemblePrompt,
  buildUnitLabel,
  countSessionShots,
  type PromptMetadata,
} from "../src/shared/prompt_builder";
import { BUILTIN_PROMPTS, type BuiltInPrompt } from "../src/shared/prompt_types";

function makePrompt(template: string): BuiltInPrompt {
  return {
    id: "test-prompt",
    name: "Test Prompt",
    tier: "beginner",
    topic: "test",
    template,
  };
}

describe("assemblePrompt: basic assembly", () => {
  it("replaces {{DATA}} with TSV data", () => {
    const prompt = makePrompt("Here is data:\n\n{{DATA}}");
    const tsv = "Date\tClub\tShot #\n2025-01-15\tDriver\t1";
    const result = assemblePrompt(prompt, tsv);
    expect(result).toContain(tsv);
    expect(result).toContain("Here is data:");
  });

  it("returns template unchanged when {{DATA}} is missing", () => {
    const prompt = makePrompt("This template has no placeholder.");
    const tsv = "Date\tClub\tShot #";
    const result = assemblePrompt(prompt, tsv);
    expect(result).toBe("This template has no placeholder.");
  });

  it("handles empty TSV data string", () => {
    const prompt = makePrompt("Data: {{DATA}}");
    const result = assemblePrompt(prompt, "");
    expect(result).toBe("Data: ");
    expect(result).not.toContain("{{DATA}}");
  });
});

describe("assemblePrompt: with metadata", () => {
  const metadata: PromptMetadata = {
    date: "2025-01-15",
    shotCount: 10,
    unitLabel: "mph + yards",
  };

  it("prepends metadata header before TSV data", () => {
    const prompt = makePrompt("{{DATA}}");
    const tsv = "Date\tClub";
    const result = assemblePrompt(prompt, tsv, metadata);
    expect(result).toContain("Session: 2025-01-15 | 10 shots | Units: mph + yards");
  });

  it("separates metadata header from TSV with blank line", () => {
    const prompt = makePrompt("{{DATA}}");
    const tsv = "Date\tClub\tShot #";
    const result = assemblePrompt(prompt, tsv, metadata);
    expect(result).toContain(
      "Session: 2025-01-15 | 10 shots | Units: mph + yards\n\nDate\tClub\tShot #"
    );
  });

  it("omits metadata header when metadata is undefined", () => {
    const prompt = makePrompt("{{DATA}}");
    const tsv = "Date\tClub\tShot #";
    const result = assemblePrompt(prompt, tsv);
    expect(result).not.toContain("Session:");
    expect(result).toBe("Date\tClub\tShot #");
  });
});

describe("assemblePrompt: integration with real prompts", () => {
  it("works with a BUILTIN_PROMPTS entry", () => {
    const prompt = BUILTIN_PROMPTS[0];
    const tsv = "Date\tClub\tShot #\n2025-01-15\t7 Iron\t1";
    const result = assemblePrompt(prompt, tsv);
    expect(result).toContain(tsv);
    expect(result.length).toBeGreaterThan(tsv.length);
  });

  it("assembled output contains no {{DATA}} placeholder", () => {
    const prompt = BUILTIN_PROMPTS[0];
    const tsv = "Date\tClub\tShot #\n2025-01-15\t7 Iron\t1";
    const result = assemblePrompt(prompt, tsv);
    expect(result).not.toContain("{{DATA}}");
  });
});

describe("buildUnitLabel", () => {
  it("returns 'mph + yards' for imperial", () => {
    expect(buildUnitLabel({ speed: "mph", distance: "yards" })).toBe("mph + yards");
  });

  it("returns 'm/s + meters' for metric", () => {
    expect(buildUnitLabel({ speed: "m/s", distance: "meters" })).toBe("m/s + meters");
  });

  it("returns 'mph + meters' for hybrid", () => {
    expect(buildUnitLabel({ speed: "mph", distance: "meters" })).toBe("mph + meters");
  });
});

describe("countSessionShots", () => {
  it("counts total shots across all clubs", () => {
    const session = {
      club_groups: [
        { shots: [{}, {}, {}] },
        { shots: [{}, {}] },
      ],
    };
    expect(countSessionShots(session)).toBe(5);
  });

  it("returns 0 for empty session", () => {
    const session = { club_groups: [] };
    expect(countSessionShots(session)).toBe(0);
  });
});
