(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // src/shared/constants.ts
  var STORAGE_KEYS;
  var init_constants = __esm({
    "src/shared/constants.ts"() {
      STORAGE_KEYS = {
        TRACKMAN_DATA: "trackmanData",
        SPEED_UNIT: "speedUnit",
        DISTANCE_UNIT: "distanceUnit"
      };
    }
  });

  // src/shared/unit_normalization.ts
  function migrateLegacyPref(stored) {
    switch (stored) {
      case "metric":
        return { speed: "m/s", distance: "meters" };
      case "hybrid":
        return { speed: "mph", distance: "meters" };
      case "imperial":
      default:
        return { speed: "mph", distance: "yards" };
    }
  }
  var UNIT_SYSTEMS, DEFAULT_UNIT_SYSTEM;
  var init_unit_normalization = __esm({
    "src/shared/unit_normalization.ts"() {
      UNIT_SYSTEMS = {
        // Imperial (yards, degrees) - most common
        "789012": {
          id: "789012",
          name: "Imperial",
          distanceUnit: "yards",
          angleUnit: "degrees",
          speedUnit: "mph"
        },
        // Metric (meters, radians)
        "789013": {
          id: "789013",
          name: "Metric (rad)",
          distanceUnit: "meters",
          angleUnit: "radians",
          speedUnit: "km/h"
        },
        // Metric (meters, degrees) - less common
        "789014": {
          id: "789014",
          name: "Metric (deg)",
          distanceUnit: "meters",
          angleUnit: "degrees",
          speedUnit: "km/h"
        }
      };
      DEFAULT_UNIT_SYSTEM = UNIT_SYSTEMS["789012"];
    }
  });

  // src/popup/popup.ts
  var require_popup = __commonJS({
    "src/popup/popup.ts"() {
      init_constants();
      init_unit_normalization();
      document.addEventListener("DOMContentLoaded", async () => {
        console.log("TrackPull popup initialized");
        try {
          const result = await new Promise((resolve) => {
            chrome.storage.local.get([STORAGE_KEYS.TRACKMAN_DATA], resolve);
          });
          const data = result[STORAGE_KEYS.TRACKMAN_DATA];
          console.log("Popup loaded data:", data ? "has data" : "no data");
          updateShotCount(data);
          updateExportButtonVisibility(data);
          const unitResult = await new Promise((resolve) => {
            chrome.storage.local.get([STORAGE_KEYS.SPEED_UNIT, STORAGE_KEYS.DISTANCE_UNIT, "unitPreference"], resolve);
          });
          let speedUnit = unitResult[STORAGE_KEYS.SPEED_UNIT];
          let distanceUnit = unitResult[STORAGE_KEYS.DISTANCE_UNIT];
          if (!speedUnit || !distanceUnit) {
            const migrated = migrateLegacyPref(unitResult["unitPreference"]);
            speedUnit = migrated.speed;
            distanceUnit = migrated.distance;
            chrome.storage.local.set({
              [STORAGE_KEYS.SPEED_UNIT]: speedUnit,
              [STORAGE_KEYS.DISTANCE_UNIT]: distanceUnit
            });
            chrome.storage.local.remove("unitPreference");
          }
          const speedSelect = document.getElementById("speed-unit");
          const distanceSelect = document.getElementById("distance-unit");
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
          chrome.runtime.onMessage.addListener((message) => {
            if (message.type === "DATA_UPDATED") {
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
      function updateShotCount(data) {
        const shotCountElement = document.getElementById("shot-count");
        if (!shotCountElement) return;
        if (!data || typeof data !== "object") {
          shotCountElement.textContent = "0";
          return;
        }
        const sessionData = data;
        const clubGroups = sessionData["club_groups"];
        if (!clubGroups || !Array.isArray(clubGroups)) {
          shotCountElement.textContent = "0";
          return;
        }
        let totalShots = 0;
        for (const club of clubGroups) {
          const shots = club["shots"];
          if (shots && Array.isArray(shots)) {
            totalShots += shots.length;
          }
        }
        shotCountElement.textContent = totalShots.toString();
      }
      function updateExportButtonVisibility(data) {
        const exportBtn = document.getElementById("export-btn");
        if (!exportBtn) return;
        const hasValidData = data && typeof data === "object" && data["club_groups"];
        exportBtn.style.display = hasValidData ? "block" : "none";
      }
      async function handleExportClick() {
        const exportBtn = document.getElementById("export-btn");
        if (!exportBtn) return;
        showStatusMessage("Preparing CSV...", false);
        exportBtn.disabled = true;
        try {
          const response = await new Promise((resolve) => {
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
      function showToast(message, type) {
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
        }, type === "error" ? 5e3 : 3e3);
      }
      function showStatusMessage(message, isError = false) {
        const statusElement = document.getElementById("status-message");
        if (!statusElement) return;
        statusElement.textContent = message;
        statusElement.style.color = isError ? "#d32f2f" : "#388e3c";
      }
      async function handleClearClick() {
        const clearBtn = document.getElementById("clear-btn");
        if (!clearBtn) return;
        showStatusMessage("Clearing session data...", false);
        clearBtn.disabled = true;
        try {
          await new Promise((resolve, reject) => {
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
    }
  });
  require_popup();
})();
