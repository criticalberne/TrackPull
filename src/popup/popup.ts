/**
 * Popup UI logic for Trackman Scraper Extension
 */

import { STORAGE_KEYS } from "../shared/constants";

document.addEventListener("DOMContentLoaded", async () => {
  console.log("Trackman Scraper popup initialized");

  try {
    const result = await new Promise<Record<string, unknown>>((resolve) => {
      chrome.storage.local.get([STORAGE_KEYS.TRACKMAN_DATA], resolve);
    });

    const data = result[STORAGE_KEYS.TRACKMAN_DATA];
    console.log("Popup loaded data:", data ? "has data" : "no data");

    updateShotCount(data);
    updateExportButtonVisibility(data);

    chrome.runtime.onMessage.addListener((message: { type: string; data?: unknown }) => {
      if (message.type === 'DATA_UPDATED') {
        updateShotCount(message.data);
        updateExportButtonVisibility(message.data);
      }
      return true;
    });

    const exportBtn = document.getElementById("export-btn");
    if (exportBtn) {
      exportBtn.addEventListener("click", handleExportClick);
    }

    const clearBtn = document.getElementById("clear-btn");
    if (clearBtn) {
      clearBtn.addEventListener("click", handleClearClick);
    }
  } catch (error) {
    console.error("Error loading popup data:", error);
    showStatusMessage("Error loading shot count", true);
  }
});

function updateShotCount(data: unknown): void {
  const shotCountElement = document.getElementById("shot-count");
  if (!shotCountElement) return;

  if (!data || typeof data !== "object") {
    shotCountElement.textContent = "0";
    return;
  }

  const sessionData = data as Record<string, unknown>;
  const clubGroups = sessionData["club_groups"] as Array<Record<string, unknown>> | undefined;

  if (!clubGroups || !Array.isArray(clubGroups)) {
    shotCountElement.textContent = "0";
    return;
  }

  let totalShots = 0;
  for (const club of clubGroups) {
    const shots = club["shots"] as Array<Record<string, unknown>> | undefined;
    if (shots && Array.isArray(shots)) {
      totalShots += shots.length;
    }
  }

  shotCountElement.textContent = totalShots.toString();
}

function updateExportButtonVisibility(data: unknown): void {
  const exportBtn = document.getElementById("export-btn");
  if (!exportBtn) return;

  const hasValidData = data && typeof data === "object" && 
    (data as Record<string, unknown>)["club_groups"];
  
  exportBtn.style.display = hasValidData ? "block" : "none";
}

async function handleExportClick(): Promise<void> {
  const exportBtn = document.getElementById("export-btn");
  if (!exportBtn) return;

  showStatusMessage("Preparing CSV...", false);
  exportBtn.disabled = true;

  try {
    const result = await new Promise<Record<string, unknown>>((resolve) => {
      chrome.storage.local.get([STORAGE_KEYS.TRACKMAN_DATA], resolve);
    });

    const data = result[STORAGE_KEYS.TRACKMAN_DATA];
    
    if (!data || typeof data !== "object") {
      showStatusMessage("No data to export", true);
      exportBtn.disabled = false;
      return;
    }

    const sessionData = data as Record<string, unknown>;
    const clubGroups = sessionData["club_groups"] as Array<Record<string, unknown>> | undefined;

    if (!clubGroups || !Array.isArray(clubGroups)) {
      showStatusMessage("No valid data to export", true);
      exportBtn.disabled = false;
      return;
    }

    const message = await new Promise<{ type: string; csvContent: string; filename: string }>((resolve) => {
      chrome.runtime.sendMessage({ type: 'EXPORT_CSV_REQUEST' }, (response) => {
        resolve(response);
      });
    });

    if (!message || !message.csvContent) {
      showStatusMessage("Failed to generate CSV", true);
      exportBtn.disabled = false;
      return;
    }

    await new Promise<void>((resolve) => {
      chrome.runtime.sendMessage({ type: 'EXPORT_CSV', csvContent: message.csvContent, filename: message.filename }, (response) => {
        if (response && response.success) {
          showStatusMessage(`Exported successfully: ${message.filename}`, false);
        } else {
          const errorMsg = response?.error || "Download failed";
          showStatusMessage(errorMsg, true);
        }
        exportBtn.disabled = false;
        resolve();
      });
    });

  } catch (error) {
    console.error("Error during export:", error);
    showStatusMessage("Export failed", true);
    exportBtn.disabled = false;
  }
}

function showStatusMessage(message: string, isError: boolean = false): void {
  const statusElement = document.getElementById("status-message");
  if (!statusElement) return;

  statusElement.textContent = message;
  statusElement.style.color = isError ? "#d32f2f" : "#388e3c";
}

async function handleClearClick(): Promise<void> {
  const clearBtn = document.getElementById("clear-btn");
  if (!clearBtn) return;

  showStatusMessage("Clearing session data...", false);
  clearBtn.disabled = true;

  try {
    await new Promise<void>((resolve, reject) => {
      chrome.storage.local.remove(STORAGE_KEYS.TRACKMAN_DATA, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });

    updateShotCount(null);
    updateExportButtonVisibility(null);
    showStatusMessage("Session data cleared", false);
  } catch (error) {
    console.error("Error clearing session data:", error);
    showStatusMessage("Failed to clear data", true);
  } finally {
    clearBtn.disabled = false;
  }
}
