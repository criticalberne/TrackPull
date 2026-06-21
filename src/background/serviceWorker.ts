/**
 * Service Worker for TrackPull Chrome Extension
 */

import { STORAGE_KEYS } from "../shared/constants";
import { writeCsv } from "../shared/csv_writer";
import type { SessionData } from "../models/types";
import { migrateLegacyPref, type UnitChoice, type SpeedUnit, type DistanceUnit } from "../shared/unit_normalization";
import { saveSessionToHistory, getHistoryErrorMessage } from "../shared/history";
import { parsePortalActivity } from "../shared/portal_parser";
import type { GraphQLActivity } from "../shared/portal_parser";
import type { ImportStatus } from "../shared/import_types";
import { putBulkImportedSession } from "../shared/bulk_import_store";

interface ImportedSessionGraphQLData {
  data?: { node?: GraphQLActivity };
  errors?: Array<{ message: string; extensions?: { code?: string } }>;
}

chrome.runtime.onInstalled.addListener(() => {
  console.log("TrackPull extension installed");
});

interface SaveDataRequest {
  type: "SAVE_DATA";
  data: SessionData;
}

interface ExportCsvRequest {
  type: "EXPORT_CSV_REQUEST";
}

interface SaveImportedSessionRequest {
  type: "SAVE_IMPORTED_SESSION";
  graphqlData?: ImportedSessionGraphQLData;
  graphqlPayloads?: ImportedSessionGraphQLData[];
  activityId: string;
}

interface SaveBulkImportedSessionRequest {
  type: "SAVE_BULK_IMPORTED_SESSION";
  jobId: string;
  graphqlPayloads: ImportedSessionGraphQLData[];
  activityId: string;
}

function getDownloadErrorMessage(originalError: string): string {
  if (originalError.includes("invalid")) {
    return "Invalid download format";
  }
  if (originalError.includes("quota") || originalError.includes("space")) {
    return "Insufficient storage space";
  }
  if (originalError.includes("blocked") || originalError.includes("policy")) {
    return "Download blocked by browser settings";
  }
  return originalError;
}

type RequestMessage =
  | SaveDataRequest
  | ExportCsvRequest
  | SaveImportedSessionRequest
  | SaveBulkImportedSessionRequest;

function parseImportedSession(
  payloads: ImportedSessionGraphQLData[]
): SessionData | null {
  for (const payload of payloads) {
    if (payload.errors && payload.errors.length > 0) continue;
    const activity = payload.data?.node;
    const session = activity ? parsePortalActivity(activity) : null;
    if (session) return session;
  }
  return null;
}

chrome.runtime.onMessage.addListener((message: RequestMessage, sender, sendResponse) => {
  if (message.type === "SAVE_DATA") {
    const sessionData = (message as SaveDataRequest).data;
    chrome.storage.local.set({ [STORAGE_KEYS.TRACKMAN_DATA]: sessionData }, () => {
      if (chrome.runtime.lastError) {
        console.error("TrackPull: Failed to save data:", chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        console.log("TrackPull: Session data saved to storage");
        sendResponse({ success: true });

        // History save -- fire and forget, never blocks primary flow
        saveSessionToHistory(sessionData).catch((err) => {
          console.error("TrackPull: History save failed:", err);
          const msg = getHistoryErrorMessage(err.message);
          chrome.runtime.sendMessage({ type: "HISTORY_ERROR", error: msg }).catch(() => {
            // Popup not open -- already logged to console
          });
        });
      }
    });
    return true;
  }

  if (message.type === "EXPORT_CSV_REQUEST") {
    chrome.storage.local.get([STORAGE_KEYS.TRACKMAN_DATA, STORAGE_KEYS.SPEED_UNIT, STORAGE_KEYS.DISTANCE_UNIT, STORAGE_KEYS.HITTING_SURFACE, STORAGE_KEYS.INCLUDE_AVERAGES, "unitPreference"], (result) => {
      const data = result[STORAGE_KEYS.TRACKMAN_DATA] as SessionData | undefined;
      if (!data || !data.club_groups || data.club_groups.length === 0) {
        sendResponse({ success: false, error: "No data to export" });
        return;
      }

      try {
        let unitChoice: UnitChoice;
        if (result[STORAGE_KEYS.SPEED_UNIT] && result[STORAGE_KEYS.DISTANCE_UNIT]) {
          unitChoice = {
            speed: result[STORAGE_KEYS.SPEED_UNIT] as SpeedUnit,
            distance: result[STORAGE_KEYS.DISTANCE_UNIT] as DistanceUnit,
          };
        } else {
          unitChoice = migrateLegacyPref(result["unitPreference"] as string | undefined);
        }
        const surface = (result[STORAGE_KEYS.HITTING_SURFACE] as "Grass" | "Mat") ?? "Mat";
        const includeAverages = result[STORAGE_KEYS.INCLUDE_AVERAGES] === undefined
          ? true
          : Boolean(result[STORAGE_KEYS.INCLUDE_AVERAGES]);
        const csvContent = writeCsv(data, includeAverages, undefined, unitChoice, surface);
        const rawDate = data.date || "unknown";
        // Sanitize date for filename — remove colons and characters invalid in filenames
        const safeDate = rawDate.replace(/[:.]/g, "-").replace(/[/\\?%*|"<>]/g, "");
        const filename = `ShotData_${safeDate}.csv`;

        chrome.downloads.download(
          {
            url: `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`,
            filename: filename,
            saveAs: false,
          },
          (downloadId) => {
            if (chrome.runtime.lastError) {
              console.error("TrackPull: Download failed:", chrome.runtime.lastError);
              const errorMessage = getDownloadErrorMessage(chrome.runtime.lastError.message);
              sendResponse({ success: false, error: errorMessage });
            } else {
              console.log(`TrackPull: CSV exported with download ID ${downloadId}`);
              sendResponse({ success: true, downloadId, filename });
            }
          }
        );
      } catch (error) {
        console.error("TrackPull: CSV generation failed:", error);
        sendResponse({ success: false, error: error instanceof Error ? error.message : String(error) });
      }
    });
    return true;
  }

  // Receives pre-fetched GraphQL data from popup (fetched via content script on portal page)
  if (message.type === "SAVE_IMPORTED_SESSION") {
    const { graphqlData, graphqlPayloads } = message;
    sendResponse({ success: true });

    (async () => {
      await chrome.storage.local.set({ [STORAGE_KEYS.IMPORT_STATUS]: { state: "importing" } as ImportStatus });

      try {
        const payloads = graphqlPayloads ?? (graphqlData ? [graphqlData] : []);
        const firstError = payloads.find((payload) => payload.errors && payload.errors.length > 0)?.errors?.[0];
        const hasPayloadWithoutErrors = payloads.some((payload) => !payload.errors || payload.errors.length === 0);

        if (firstError && !hasPayloadWithoutErrors) {
          await chrome.storage.local.set({ [STORAGE_KEYS.IMPORT_STATUS]: { state: "error", message: firstError.message } as ImportStatus });
          return;
        }

        const session = parseImportedSession(payloads);
        if (!session) {
          await chrome.storage.local.set({ [STORAGE_KEYS.IMPORT_STATUS]: { state: "error", message: "No shot data found for this activity" } as ImportStatus });
          return;
        }
        await chrome.storage.local.set({ [STORAGE_KEYS.TRACKMAN_DATA]: session });
        await saveSessionToHistory(session);
        await chrome.storage.local.set({ [STORAGE_KEYS.IMPORT_STATUS]: { state: "success" } as ImportStatus });
        console.log("TrackPull: Session imported successfully:", session.report_id);
      } catch (err) {
        console.error("TrackPull: Import failed:", err);
        await chrome.storage.local.set({ [STORAGE_KEYS.IMPORT_STATUS]: { state: "error", message: "Import failed — try again" } as ImportStatus });
      }
    })();
    return false;
  }

  if (message.type === "SAVE_BULK_IMPORTED_SESSION") {
    const { jobId, activityId, graphqlPayloads } = message;

    (async () => {
      try {
        const firstError = graphqlPayloads.find((payload) => payload.errors && payload.errors.length > 0)?.errors?.[0];
        const hasPayloadWithoutErrors = graphqlPayloads.some((payload) => !payload.errors || payload.errors.length === 0);

        if (firstError && !hasPayloadWithoutErrors) {
          sendResponse({ success: false, error: firstError.message });
          return;
        }

        const session = parseImportedSession(graphqlPayloads);
        if (!session) {
          sendResponse({ success: false, error: "No shot data found for this activity" });
          return;
        }

        await chrome.storage.local.set({ [STORAGE_KEYS.TRACKMAN_DATA]: session });
        await saveSessionToHistory(session);
        await putBulkImportedSession(jobId, activityId, session);

        const shotCount = session.club_groups.reduce(
          (total, club) => total + club.shots.length,
          0
        );
        sendResponse({
          success: true,
          reportId: session.report_id,
          shotCount,
        });
      } catch (err) {
        console.error("TrackPull: Bulk import item failed:", err);
        sendResponse({ success: false, error: "Import failed — try again" });
      }
    })();

    return true;
  }
});

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === "local" && changes[STORAGE_KEYS.TRACKMAN_DATA]) {
    const newValue = changes[STORAGE_KEYS.TRACKMAN_DATA].newValue;
    chrome.runtime.sendMessage({ type: "DATA_UPDATED", data: newValue }).catch(() => {
      // Ignore errors when no popup is listening
    });
  }
});
