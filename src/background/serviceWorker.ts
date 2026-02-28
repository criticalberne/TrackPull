/**
 * Service Worker for TrackPull Chrome Extension
 */

import { STORAGE_KEYS } from "../shared/constants";
import { writeCsv } from "../shared/csv_writer";
import type { SessionData } from "../models/types";
import type { UnitPreference } from "../shared/unit_normalization";

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

type RequestMessage = SaveDataRequest | ExportCsvRequest | GetDataRequest;

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
      }
    });
    return true;
  }

  if (message.type === "EXPORT_CSV_REQUEST") {
    chrome.storage.local.get([STORAGE_KEYS.TRACKMAN_DATA, STORAGE_KEYS.UNIT_PREF], (result) => {
      const data = result[STORAGE_KEYS.TRACKMAN_DATA] as SessionData | undefined;
      if (!data || !data.club_groups || data.club_groups.length === 0) {
        sendResponse({ success: false, error: "No data to export" });
        return;
      }

      try {
        const unitPref = ((result[STORAGE_KEYS.UNIT_PREF] as string) || "imperial") as UnitPreference;
        const csvContent = writeCsv(data, true, undefined, unitPref);
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
});

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === "local" && changes[STORAGE_KEYS.TRACKMAN_DATA]) {
    const newValue = changes[STORAGE_KEYS.TRACKMAN_DATA].newValue;
    chrome.runtime.sendMessage({ type: "DATA_UPDATED", data: newValue }).catch(() => {
      // Ignore errors when no popup is listening
    });
  }
});
