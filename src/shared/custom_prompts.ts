/**
 * Custom Prompt Storage: CRUD helpers for user-created prompt templates.
 *
 * Uses a per-key chrome.storage.sync strategy:
 * - Each prompt is stored under key: CUSTOM_PROMPT_KEY_PREFIX + id
 * - An ID index is stored under CUSTOM_PROMPT_IDS_KEY to allow listing all prompts
 *
 * All functions are async and return Promises.
 */

import { CUSTOM_PROMPT_KEY_PREFIX, CUSTOM_PROMPT_IDS_KEY } from "./constants";
import type { CustomPrompt } from "./prompt_types";

/**
 * Loads all custom prompts from chrome.storage.sync.
 * Returns an empty array if no custom prompts have been saved.
 */
export async function loadCustomPrompts(): Promise<CustomPrompt[]> {
  const idsResult = await chrome.storage.sync.get([CUSTOM_PROMPT_IDS_KEY]);
  const ids: string[] = (idsResult[CUSTOM_PROMPT_IDS_KEY] as string[]) ?? [];
  if (ids.length === 0) return [];
  const keys = ids.map((id) => CUSTOM_PROMPT_KEY_PREFIX + id);
  const promptsResult = await chrome.storage.sync.get(keys);
  return ids
    .map((id) => promptsResult[CUSTOM_PROMPT_KEY_PREFIX + id] as CustomPrompt | undefined)
    .filter((p): p is CustomPrompt => p !== undefined);
}

/**
 * Saves a custom prompt to chrome.storage.sync.
 * If a prompt with the same id already exists, it is overwritten.
 * Updates the ID index to include this prompt's id.
 */
export async function saveCustomPrompt(prompt: CustomPrompt): Promise<void> {
  const key = CUSTOM_PROMPT_KEY_PREFIX + prompt.id;
  const result = await chrome.storage.sync.get([CUSTOM_PROMPT_IDS_KEY]);
  const ids: string[] = (result[CUSTOM_PROMPT_IDS_KEY] as string[]) ?? [];
  if (!ids.includes(prompt.id)) {
    ids.push(prompt.id);
  }
  await chrome.storage.sync.set({
    [key]: prompt,
    [CUSTOM_PROMPT_IDS_KEY]: ids,
  });
}

/**
 * Deletes a custom prompt from chrome.storage.sync by id.
 * If the id does not exist in the index, this function is a no-op.
 * Updates the ID index to remove this prompt's id.
 */
export async function deleteCustomPrompt(id: string): Promise<void> {
  const key = CUSTOM_PROMPT_KEY_PREFIX + id;
  const idsResult = await chrome.storage.sync.get([CUSTOM_PROMPT_IDS_KEY]);
  const ids: string[] = (idsResult[CUSTOM_PROMPT_IDS_KEY] as string[]) ?? [];
  const newIds = ids.filter((i) => i !== id);
  await chrome.storage.sync.remove(key);
  await chrome.storage.sync.set({ [CUSTOM_PROMPT_IDS_KEY]: newIds });
}
