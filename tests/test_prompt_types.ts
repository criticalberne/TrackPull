import { describe, it, expect } from "vitest";
import { BUILTIN_PROMPTS, BuiltInPrompt, SkillTier } from "../src/shared/prompt_types";

describe("Prompt Library: structure", () => {
  it("has at least 7 built-in prompts", () => {
    expect(BUILTIN_PROMPTS.length).toBeGreaterThanOrEqual(7);
  });

  it("every prompt has a unique id", () => {
    const ids = BUILTIN_PROMPTS.map((p) => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(BUILTIN_PROMPTS.length);
  });

  it("every prompt has a non-empty name", () => {
    for (const prompt of BUILTIN_PROMPTS) {
      expect(prompt.name).toBeTruthy();
      expect(typeof prompt.name).toBe("string");
    }
  });

  it("every prompt has a valid tier", () => {
    const validTiers: SkillTier[] = ["beginner", "intermediate", "advanced"];
    for (const prompt of BUILTIN_PROMPTS) {
      expect(validTiers).toContain(prompt.tier);
    }
  });

  it("every prompt has a non-empty topic", () => {
    for (const prompt of BUILTIN_PROMPTS) {
      expect(prompt.topic).toBeTruthy();
      expect(typeof prompt.topic).toBe("string");
    }
  });

  it("every prompt template contains {{DATA}} placeholder", () => {
    for (const prompt of BUILTIN_PROMPTS) {
      expect(prompt.template).toContain("{{DATA}}");
    }
  });
});

describe("Prompt Library: tier distribution", () => {
  it("includes at least one beginner prompt", () => {
    const beginnerPrompts = BUILTIN_PROMPTS.filter((p) => p.tier === "beginner");
    expect(beginnerPrompts.length).toBeGreaterThanOrEqual(1);
  });

  it("includes at least one intermediate prompt", () => {
    const intermediatePrompts = BUILTIN_PROMPTS.filter((p) => p.tier === "intermediate");
    expect(intermediatePrompts.length).toBeGreaterThanOrEqual(1);
  });

  it("includes at least one advanced prompt", () => {
    const advancedPrompts = BUILTIN_PROMPTS.filter((p) => p.tier === "advanced");
    expect(advancedPrompts.length).toBeGreaterThanOrEqual(1);
  });
});

describe("Prompt Library: required topics", () => {
  it("includes a session overview prompt", () => {
    const overviewPrompts = BUILTIN_PROMPTS.filter((p) => p.topic === "overview");
    expect(overviewPrompts.length).toBeGreaterThanOrEqual(1);
  });

  it("includes a club breakdown prompt", () => {
    const clubBreakdownPrompts = BUILTIN_PROMPTS.filter((p) => p.topic === "club-breakdown");
    expect(clubBreakdownPrompts.length).toBeGreaterThanOrEqual(1);
  });

  it("includes a consistency analysis prompt", () => {
    const consistencyPrompts = BUILTIN_PROMPTS.filter((p) => p.topic === "consistency");
    expect(consistencyPrompts.length).toBeGreaterThanOrEqual(1);
  });
});

describe("Prompt Library: template quality", () => {
  it("every template is at least 50 characters", () => {
    for (const prompt of BUILTIN_PROMPTS) {
      expect(prompt.template.length).toBeGreaterThanOrEqual(50);
    }
  });

  it("no template exceeds 2000 characters", () => {
    for (const prompt of BUILTIN_PROMPTS) {
      expect(prompt.template.length).toBeLessThanOrEqual(2000);
    }
  });
});
