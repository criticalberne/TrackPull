/**
 * Session history storage module.
 * Saves, deduplicates (by report_id), and evicts sessions from chrome.storage.local.
 */

import type { SessionData, SessionSnapshot, HistoryEntry } from "../models/types";
import { STORAGE_KEYS } from "./constants";

const MAX_SESSIONS = 20;

/** Strip raw_api_data from a SessionData to create a lightweight snapshot. */
function createSnapshot(session: SessionData): SessionSnapshot {
  // Destructure to exclude raw_api_data
  const { raw_api_data: _, ...snapshot } = session;
  return snapshot;
}

/**
 * Save a session to the rolling history in chrome.storage.local.
 * - Deduplicates by report_id (replaces existing entry, refreshes captured_at).
 * - Evicts oldest entry when the 20-session cap is reached.
 * - Stores entries sorted newest-first (descending captured_at).
 */
export function saveSessionToHistory(session: SessionData): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(
      [STORAGE_KEYS.SESSION_HISTORY],
      (result: Record<string, unknown>) => {
        if (chrome.runtime.lastError) {
          return reject(new Error(chrome.runtime.lastError.message));
        }

        const existing = (result[STORAGE_KEYS.SESSION_HISTORY] as HistoryEntry[] | undefined) ?? [];

        // Remove any existing entry with the same report_id (dedup)
        const filtered = existing.filter(
          (entry) => entry.snapshot.report_id !== session.report_id
        );

        // Create new entry
        const newEntry: HistoryEntry = {
          captured_at: Date.now(),
          snapshot: createSnapshot(session),
        };

        filtered.push(newEntry);

        // Sort newest-first (descending captured_at)
        filtered.sort((a, b) => b.captured_at - a.captured_at);

        // Enforce cap — slice keeps the newest MAX_SESSIONS entries
        const capped = filtered.slice(0, MAX_SESSIONS);

        chrome.storage.local.set(
          { [STORAGE_KEYS.SESSION_HISTORY]: capped },
          () => {
            if (chrome.runtime.lastError) {
              return reject(new Error(chrome.runtime.lastError.message));
            }
            resolve();
          }
        );
      }
    );
  });
}

/**
 * Delete a single session from history by report_id.
 */
export function deleteSessionFromHistory(reportId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(
      [STORAGE_KEYS.SESSION_HISTORY],
      (result: Record<string, unknown>) => {
        if (chrome.runtime.lastError) {
          return reject(new Error(chrome.runtime.lastError.message));
        }

        const existing = (result[STORAGE_KEYS.SESSION_HISTORY] as HistoryEntry[] | undefined) ?? [];
        const filtered = existing.filter(
          (entry) => entry.snapshot.report_id !== reportId
        );

        chrome.storage.local.set(
          { [STORAGE_KEYS.SESSION_HISTORY]: filtered },
          () => {
            if (chrome.runtime.lastError) {
              return reject(new Error(chrome.runtime.lastError.message));
            }
            resolve();
          }
        );
      }
    );
  });
}

/**
 * Clear all session history.
 */
export function clearAllHistory(): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(
      { [STORAGE_KEYS.SESSION_HISTORY]: [] },
      () => {
        if (chrome.runtime.lastError) {
          return reject(new Error(chrome.runtime.lastError.message));
        }
        resolve();
      }
    );
  });
}

/**
 * Map storage error strings to user-friendly messages.
 */
export function getHistoryErrorMessage(error: string): string {
  if (/QUOTA_BYTES|quota/i.test(error)) {
    return "Storage full -- oldest sessions will be cleared";
  }
  return "Could not save to session history";
}
