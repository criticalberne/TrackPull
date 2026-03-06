/**
 * Service Worker for TrackPull Chrome Extension
 */

import { STORAGE_KEYS } from "../shared/constants";
import { writeCsv } from "../shared/csv_writer";
import type { SessionData } from "../models/types";
import { migrateLegacyPref, DEFAULT_UNIT_CHOICE, type UnitChoice, type SpeedUnit, type DistanceUnit } from "../shared/unit_normalization";
import { saveSessionToHistory, getHistoryErrorMessage } from "../shared/history";

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

interface GetDataRequest {
  type: "GET_DATA";
}

interface ExportCsvFromDataRequest {
  type: "EXPORT_CSV_FROM_DATA";
  data: SessionData;
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

type RequestMessage = SaveDataRequest | ExportCsvRequest | GetDataRequest | ExportCsvFromDataRequest;

chrome.runtime.onMessage.addListener((message: RequestMessage, sender, sendResponse) => {
  if (message.type === "GET_DATA") {
    chrome.storage.local.get([STORAGE_KEYS.TRACKMAN_DATA], (result) => {
      sendResponse(result[STORAGE_KEYS.TRACKMAN_DATA] || null);
    });
    return true;
  }

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
        const filename = `ShotData_${data.date || "unknown"}.csv`;

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

  if (message.type === "EXPORT_CSV_FROM_DATA") {
    const data = (message as ExportCsvFromDataRequest).data;
    if (!data || !data.club_groups || data.club_groups.length === 0) {
      sendResponse({ success: false, error: "No data to export" });
      return true;
    }

    chrome.storage.local.get([STORAGE_KEYS.SPEED_UNIT, STORAGE_KEYS.DISTANCE_UNIT, STORAGE_KEYS.HITTING_SURFACE, STORAGE_KEYS.INCLUDE_AVERAGES, "unitPreference"], (result) => {
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
        const filename = `ShotData_${data.date || "unknown"}.csv`;

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
              console.log(`TrackPull: CSV exported from history with download ID ${downloadId}`);
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
});

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === "local" && changes[STORAGE_KEYS.TRACKMAN_DATA]) {
    const newValue = changes[STORAGE_KEYS.TRACKMAN_DATA].newValue;
    chrome.runtime.sendMessage({ type: "DATA_UPDATED", data: newValue }).catch(() => {
      // Ignore errors when no popup is listening
    });
  }
});
