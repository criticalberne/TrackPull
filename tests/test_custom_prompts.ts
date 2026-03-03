/**
 * Unit tests for custom prompt storage CRUD functions.
 * Uses a mocked chrome.storage.sync to avoid browser dependency.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  loadCustomPrompts,
  saveCustomPrompt,
  deleteCustomPrompt,
} from "../src/shared/custom_prompts";
import type { CustomPrompt } from "../src/shared/prompt_types";

// In-memory store used by the chrome mock
const store: Record<string, unknown> = {};

const chromeMock = {
  storage: {
    sync: {
      get: vi.fn((keys: string[]) => {
        const result: Record<string, unknown> = {};
        for (const k of keys) {
          if (k in store) result[k] = store[k];
        }
        return Promise.resolve(result);
      }),
      set: vi.fn((items: Record<string, unknown>) => {
        Object.assign(store, items);
        return Promise.resolve();
      }),
      remove: vi.fn((key: string) => {
        delete store[key];
        return Promise.resolve();
      }),
    },
  },
};

vi.stubGlobal("chrome", chromeMock);

beforeEach(() => {
  // Clear the in-memory store and reset mock call counts
  for (const key of Object.keys(store)) {
    delete store[key];
  }
  vi.clearAllMocks();
});

describe("loadCustomPrompts", () => {
  it("returns empty array when no custom prompts exist", async () => {
    const result = await loadCustomPrompts();
    expect(result).toEqual([]);
  });

  it("returns saved prompts in insertion order", async () => {
    const promptA: CustomPrompt = {
      id: "prompt-a",
      name: "Prompt A",
      template: "Template A {{DATA}}",
    };
    const promptB: CustomPrompt = {
      id: "prompt-b",
      name: "Prompt B",
      template: "Template B {{DATA}}",
    };
    await saveCustomPrompt(promptA);
    await saveCustomPrompt(promptB);

    const result = await loadCustomPrompts();
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(promptA);
    expect(result[1]).toEqual(promptB);
  });
});

describe("saveCustomPrompt", () => {
  it("stores a prompt and updates the IDs index", async () => {
    const prompt: CustomPrompt = {
      id: "my-prompt",
      name: "My Prompt",
      template: "Analyze this: {{DATA}}",
    };

    await saveCustomPrompt(prompt);

    const loaded = await loadCustomPrompts();
    expect(loaded).toHaveLength(1);
    expect(loaded[0]).toEqual(prompt);
  });

  it("updating an existing ID does not duplicate it in the index", async () => {
    const original: CustomPrompt = {
      id: "dup-test",
      name: "Original Name",
      template: "Original template {{DATA}}",
    };
    const updated: CustomPrompt = {
      id: "dup-test",
      name: "Updated Name",
      template: "Updated template {{DATA}}",
    };

    await saveCustomPrompt(original);
    await saveCustomPrompt(updated);

    const loaded = await loadCustomPrompts();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].name).toBe("Updated Name");
    expect(loaded[0].template).toBe("Updated template {{DATA}}");
  });
});

describe("deleteCustomPrompt", () => {
  it("removes a prompt and updates the index", async () => {
    const prompt: CustomPrompt = {
      id: "to-delete",
      name: "Delete Me",
      template: "{{DATA}}",
    };
    await saveCustomPrompt(prompt);

    await deleteCustomPrompt("to-delete");

    const loaded = await loadCustomPrompts();
    expect(loaded).toHaveLength(0);
  });

  it("is a no-op when the id does not exist in the index", async () => {
    const prompt: CustomPrompt = {
      id: "keeper",
      name: "Keeper",
      template: "Keep this {{DATA}}",
    };
    await saveCustomPrompt(prompt);

    // Deleting a non-existent id should not throw or affect other prompts
    await deleteCustomPrompt("non-existent-id");

    const loaded = await loadCustomPrompts();
    expect(loaded).toHaveLength(1);
    expect(loaded[0]).toEqual(prompt);
  });

  it("removes only the targeted prompt when multiple exist", async () => {
    const promptA: CustomPrompt = {
      id: "keep-a",
      name: "Keep A",
      template: "{{DATA}}",
    };
    const promptB: CustomPrompt = {
      id: "delete-b",
      name: "Delete B",
      template: "{{DATA}}",
    };
    await saveCustomPrompt(promptA);
    await saveCustomPrompt(promptB);

    await deleteCustomPrompt("delete-b");

    const loaded = await loadCustomPrompts();
    expect(loaded).toHaveLength(1);
    expect(loaded[0]).toEqual(promptA);
  });
});

describe("save/load round-trip", () => {
  it("preserves all prompt fields through save and load", async () => {
    const prompt: CustomPrompt = {
      id: "round-trip-test",
      name: "Round Trip Prompt",
      template: "This is a full template with {{DATA}} placeholder",
    };

    await saveCustomPrompt(prompt);
    const loaded = await loadCustomPrompts();

    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe(prompt.id);
    expect(loaded[0].name).toBe(prompt.name);
    expect(loaded[0].template).toBe(prompt.template);
  });
});
