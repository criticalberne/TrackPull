/**
 * Prompt Builder: assembles a final clipboard-ready string from a prompt template,
 * TSV data, and optional session metadata.
 *
 * All functions are pure -- no side effects, no storage access.
 */

import type { PromptItem } from "./prompt_types";

export interface PromptMetadata {
  /** Session date, e.g. "2025-01-15" */
  date: string;
  /** Total number of shots in the session */
  shotCount: number;
  /** Human-readable unit description, e.g. "mph + yards" or "m/s + meters" */
  unitLabel: string;
}

/**
 * Assembles a final prompt string by combining a prompt template with TSV data
 * and an optional metadata header.
 *
 * If metadata is provided, a context header line is prepended to the data block:
 *   "Session: {date} | {shotCount} shots | Units: {unitLabel}"
 *
 * The assembled data block replaces the {{DATA}} placeholder in the template.
 */
export function assemblePrompt(
  prompt: PromptItem,
  tsvData: string,
  metadata?: PromptMetadata
): string {
  let dataBlock: string;

  if (metadata !== undefined) {
    const contextHeader = `Session: ${metadata.date} | ${metadata.shotCount} shots | Units: ${metadata.unitLabel}`;
    dataBlock = contextHeader + "\n\n" + tsvData;
  } else {
    dataBlock = tsvData;
  }

  return prompt.template.replace("{{DATA}}", dataBlock);
}

/**
 * Returns a human-readable unit label for the given speed and distance unit choices.
 * Example: buildUnitLabel({ speed: "mph", distance: "yards" }) -> "mph + yards"
 */
export function buildUnitLabel(unitChoice: {
  speed: string;
  distance: string;
}): string {
  return `${unitChoice.speed} + ${unitChoice.distance}`;
}

/**
 * Sums the total number of shots across all club_groups.
 * Uses a minimal type signature to avoid importing the full SessionData type.
 */
export function countSessionShots(session: {
  club_groups: Array<{ shots: unknown[] }>;
}): number {
  return session.club_groups.reduce((total, club) => total + club.shots.length, 0);
}
