/**
 * Popup UI logic for TrackPull Extension
 */

import { STORAGE_KEYS } from "../shared/constants";
import { migrateLegacyPref } from "../shared/unit_normalization";

document.addEventListener("DOMContentLoaded", async () => {
  console.log("TrackPull popup initialized");

  try {
    const result = await new Promise<Record<string, unknown>>((resolve) => {
      chrome.storage.local.get([STORAGE_KEYS.TRACKMAN_DATA], resolve);
    });

    const data = result[STORAGE_KEYS.TRACKMAN_DATA];
    console.log("Popup loaded data:", data ? "has data" : "no data");

    updateShotCount(data);
    updateExportButtonVisibility(data);

    // Unit dropdowns: read saved values, migrate from legacy key if needed
    const unitResult = await new Promise<Record<string, unknown>>((resolve) => {
      chrome.storage.local.get([STORAGE_KEYS.SPEED_UNIT, STORAGE_KEYS.DISTANCE_UNIT, "unitPreference"], resolve);
    });

    let speedUnit = unitResult[STORAGE_KEYS.SPEED_UNIT] as string | undefined;
    let distanceUnit = unitResult[STORAGE_KEYS.DISTANCE_UNIT] as string | undefined;

    if (!speedUnit || !distanceUnit) {
      const migrated = migrateLegacyPref(unitResult["unitPreference"] as string | undefined);
      speedUnit = migrated.speed;
      distanceUnit = migrated.distance;
      chrome.storage.local.set({
        [STORAGE_KEYS.SPEED_UNIT]: speedUnit,
        [STORAGE_KEYS.DISTANCE_UNIT]: distanceUnit,
      });
      chrome.storage.local.remove("unitPreference");
    }

    const speedSelect = document.getElementById("speed-unit") as HTMLSelectElement | null;
    const distanceSelect = document.getElementById("distance-unit") as HTMLSelectElement | null;

    if (speedSelect) {
      speedSelect.value = speedUnit;
      speedSelect.addEventListener("change", () => {
        chrome.storage.local.set({ [STORAGE_KEYS.SPEED_UNIT]: speedSelect.value });
      });
    }

    if (distanceSelect) {
      distanceSelect.value = distanceUnit;
      distanceSelect.addEventListener("change", () => {
        chrome.storage.local.set({ [STORAGE_KEYS.DISTANCE_UNIT]: distanceSelect.value });
      });
    }

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
    showToast("Error loading shot count", "error");
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
  const exportBtn = document.getElementById("export-btn") as HTMLButtonElement | null;
  if (!exportBtn) return;

  showStatusMessage("Preparing CSV...", false);
  exportBtn.disabled = true;

  try {
    const response = await new Promise<{ success: boolean; error?: string; filename?: string }>((resolve) => {
      chrome.runtime.sendMessage({ type: "EXPORT_CSV_REQUEST" }, (resp) => {
        resolve(resp || { success: false, error: "No response from service worker" });
      });
    });

    if (response.success) {
      showToast(`Exported successfully: ${response.filename || "ShotData.csv"}`, "success");
    } else {
      showToast(response.error || "Export failed", "error");
    }
  } catch (error) {
    console.error("Error during export:", error);
    showToast("Export failed", "error");
  } finally {
    exportBtn.disabled = false;
  }
}

function showToast(message: string, type: "error" | "success"): void {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const existingToast = container.querySelector(".toast");
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toast.setAttribute("role", type === "error" ? "alert" : "status");

  container.appendChild(toast);

  setTimeout(() => {
    if (toast.parentNode) {
      toast.classList.add("hiding");
      setTimeout(() => {
        toast.remove();
      }, 300);
    }
  }, type === "error" ? 5000 : 3000);
}

function showStatusMessage(message: string, isError: boolean = false): void {
  const statusElement = document.getElementById("status-message");
  if (!statusElement) return;

  statusElement.textContent = message;
  statusElement.style.color = isError ? "#d32f2f" : "#388e3c";
}

async function handleClearClick(): Promise<void> {
  const clearBtn = document.getElementById("clear-btn") as HTMLButtonElement | null;
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
    showToast("Session data cleared", "success");
  } catch (error) {
    console.error("Error clearing session data:", error);
    showToast("Failed to clear data", "error");
  } finally {
    clearBtn.disabled = false;
  }
}
