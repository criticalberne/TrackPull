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

function showStatusMessage(message: string, isError: boolean = false): void {
  const statusElement = document.getElementById("status-message");
  if (!statusElement) return;

  statusElement.textContent = message;
  statusElement.style.color = isError ? "#d32f2f" : "#388e3c";
}
