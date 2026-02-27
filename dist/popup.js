(() => {
  // src/shared/constants.ts
  var STORAGE_KEYS = {
    TRACKMAN_DATA: "trackmanData",
    UNIT_PREF: "unitPreference"
  };

  // src/popup/popup.ts
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
      const prefResult = await new Promise((resolve) => {
        chrome.storage.local.get([STORAGE_KEYS.UNIT_PREF], resolve);
      });
      const savedPref = prefResult[STORAGE_KEYS.UNIT_PREF] || "imperial";
      const unitToggle = document.getElementById("unit-toggle");
      if (unitToggle) {
        unitToggle.checked = savedPref === "imperial";
        updateToggleLabels(unitToggle.checked);
        unitToggle.addEventListener("change", () => {
          const pref = unitToggle.checked ? "imperial" : "metric";
          chrome.storage.local.set({ [STORAGE_KEYS.UNIT_PREF]: pref });
          updateToggleLabels(unitToggle.checked);
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
        showToast(`Exported successfully: ${response.filename || "trackman.csv"}`, "success");
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
  function updateToggleLabels(isImperial) {
    const metricLabel = document.getElementById("label-metric");
    const imperialLabel = document.getElementById("label-imperial");
    if (metricLabel) metricLabel.classList.toggle("active", !isImperial);
    if (imperialLabel) imperialLabel.classList.toggle("active", isImperial);
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
})();
