/**
 * Popup UI logic for TrackPull Extension
 */

import { STORAGE_KEYS } from "../shared/constants";
import { migrateLegacyPref, getApiSourceUnitSystem, normalizeMetricValue, DISTANCE_LABELS, SPEED_LABELS, DEFAULT_UNIT_CHOICE } from "../shared/unit_normalization";
import type { SessionData, Shot } from "../models/types";
import type { UnitChoice } from "../shared/unit_normalization";
import { writeTsv } from "../shared/tsv_writer";
import { BUILTIN_PROMPTS } from "../shared/prompt_types";
import type { CustomPrompt, PromptItem } from "../shared/prompt_types";
import { assemblePrompt, buildUnitLabel, countSessionShots } from "../shared/prompt_builder";
import { loadCustomPrompts } from "../shared/custom_prompts";

export function computeClubAverage(
  shots: Shot[],
  metricName: string
): number | null {
  const values = shots
    .map(s => s.metrics[metricName])
    .filter(v => v !== undefined && v !== "")
    .map(v => parseFloat(String(v)));
  const numericValues = values.filter(v => !isNaN(v));
  if (numericValues.length === 0) return null;
  const avg = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
  return Math.round(avg * 10) / 10;
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// Pre-fetched data for synchronous clipboard access (avoids focus-loss errors)
let cachedData: SessionData | null = null;
let cachedUnitChoice: UnitChoice = DEFAULT_UNIT_CHOICE;
let cachedSurface: "Grass" | "Mat" = "Mat";
let cachedCustomPrompts: CustomPrompt[] = [];

const AI_URLS: Record<string, string> = {
  "ChatGPT": "https://chatgpt.com",
  "Claude": "https://claude.ai",
  "Gemini": "https://gemini.google.com",
};

function renderStatCard(): void {
  const container = document.getElementById("stat-card") as HTMLDetailsElement | null;
  if (!container) return;

  const hasData = cachedData?.club_groups && cachedData.club_groups.length > 0;
  container.style.display = hasData ? "" : "none";
  if (!hasData) return;

  const unitSystem = getApiSourceUnitSystem(cachedData!.metadata_params);
  const contentEl = document.getElementById("stat-card-content")!;

  // Build header row
  const carryHeader = `Carry(${DISTANCE_LABELS[cachedUnitChoice.distance]})`;
  const speedHeader = `Speed(${SPEED_LABELS[cachedUnitChoice.speed]})`;

  let html = `<div class="stat-card-row stat-card-header">
    <span>Club</span>
    <span>Shots</span>
    <span>${carryHeader}</span>
    <span>${speedHeader}</span>
  </div>`;

  // Build club rows -- club order follows SessionData.club_groups order (Trackman report order)
  for (const club of cachedData!.club_groups) {
    const shotCount = club.shots.length;
    const rawCarry = computeClubAverage(club.shots, "Carry");
    const rawSpeed = computeClubAverage(club.shots, "ClubSpeed");

    const carry = rawCarry !== null
      ? String(normalizeMetricValue(rawCarry, "Carry", unitSystem, cachedUnitChoice))
      : "\u2014";
    const speed = rawSpeed !== null
      ? String(normalizeMetricValue(rawSpeed, "ClubSpeed", unitSystem, cachedUnitChoice))
      : "\u2014";

    html += `<div class="stat-card-row">
      <span class="stat-card-club">${escapeHtml(club.club_name)}</span>
      <span class="stat-card-value">${shotCount}</span>
      <span class="stat-card-value">${carry}</span>
      <span class="stat-card-value">${speed}</span>
    </div>`;
  }

  contentEl.innerHTML = html;
}

async function renderPromptSelect(select: HTMLSelectElement): Promise<void> {
  const customPrompts = await loadCustomPrompts();
  cachedCustomPrompts = customPrompts;

  select.innerHTML = "";

  // "My Prompts" group at top (only if custom prompts exist) -- per user decision
  if (customPrompts.length > 0) {
    const myGroup = document.createElement("optgroup");
    myGroup.label = "My Prompts";
    for (const cp of customPrompts) {
      const opt = document.createElement("option");
      opt.value = cp.id;
      opt.textContent = cp.name;
      myGroup.appendChild(opt);
    }
    select.appendChild(myGroup);
  }

  // Built-in groups by tier
  const tiers: Array<{ label: string; value: "beginner" | "intermediate" | "advanced" }> = [
    { label: "Beginner", value: "beginner" },
    { label: "Intermediate", value: "intermediate" },
    { label: "Advanced", value: "advanced" },
  ];
  for (const tier of tiers) {
    const group = document.createElement("optgroup");
    group.label = tier.label;
    for (const p of BUILTIN_PROMPTS.filter(b => b.tier === tier.value)) {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = p.name;
      group.appendChild(opt);
    }
    select.appendChild(group);
  }
}

function findPromptById(id: string): PromptItem | undefined {
  const builtIn = BUILTIN_PROMPTS.find(p => p.id === id);
  if (builtIn) return builtIn;
  return cachedCustomPrompts.find(p => p.id === id);
}

function updatePreview(): void {
  const previewEl = document.getElementById("prompt-preview-content") as HTMLPreElement | null;
  const promptSelect = document.getElementById("prompt-select") as HTMLSelectElement | null;
  if (!previewEl || !promptSelect) return;

  if (!cachedData) {
    previewEl.textContent = "(No shot data captured yet)";
    return;
  }

  const prompt = findPromptById(promptSelect.value);
  if (!prompt) {
    previewEl.textContent = "";
    return;
  }

  const tsvData = writeTsv(cachedData, cachedUnitChoice, cachedSurface);
  const metadata = {
    date: cachedData.date,
    shotCount: countSessionShots(cachedData),
    unitLabel: buildUnitLabel(cachedUnitChoice),
    hittingSurface: cachedSurface,
  };

  previewEl.textContent = assemblePrompt(prompt, tsvData, metadata);
}

document.addEventListener("DOMContentLoaded", async () => {
  console.log("TrackPull popup initialized");

  try {
    const result = await new Promise<Record<string, unknown>>((resolve) => {
      chrome.storage.local.get([STORAGE_KEYS.TRACKMAN_DATA], resolve);
    });

    const data = result[STORAGE_KEYS.TRACKMAN_DATA];
    console.log("Popup loaded data:", data ? "has data" : "no data");

    cachedData = (data as SessionData) ?? null;

    updateShotCount(data);
    updateExportButtonVisibility(data);

    // Unit dropdowns: read saved values, migrate from legacy key if needed
    const unitResult = await new Promise<Record<string, unknown>>((resolve) => {
      chrome.storage.local.get([STORAGE_KEYS.SPEED_UNIT, STORAGE_KEYS.DISTANCE_UNIT, STORAGE_KEYS.HITTING_SURFACE, STORAGE_KEYS.INCLUDE_AVERAGES, "unitPreference"], resolve);
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

    // Cache the unit choice after migration/resolution
    cachedUnitChoice = {
      speed: speedUnit as "mph" | "m/s",
      distance: distanceUnit as "yards" | "meters",
    };

    // Resolve surface preference with Mat default
    const surface = (unitResult[STORAGE_KEYS.HITTING_SURFACE] as "Grass" | "Mat") ?? "Mat";
    cachedSurface = surface;

    const speedSelect = document.getElementById("speed-unit") as HTMLSelectElement | null;
    const distanceSelect = document.getElementById("distance-unit") as HTMLSelectElement | null;

    if (speedSelect) {
      speedSelect.value = speedUnit;
      speedSelect.addEventListener("change", () => {
        chrome.storage.local.set({ [STORAGE_KEYS.SPEED_UNIT]: speedSelect.value });
        cachedUnitChoice = { ...cachedUnitChoice, speed: speedSelect.value as "mph" | "m/s" };
        renderStatCard();
      });
    }

    if (distanceSelect) {
      distanceSelect.value = distanceUnit;
      distanceSelect.addEventListener("change", () => {
        chrome.storage.local.set({ [STORAGE_KEYS.DISTANCE_UNIT]: distanceSelect.value });
        cachedUnitChoice = { ...cachedUnitChoice, distance: distanceSelect.value as "yards" | "meters" };
        renderStatCard();
      });
    }

    const surfaceSelect = document.getElementById("surface-select") as HTMLSelectElement | null;
    if (surfaceSelect) {
      surfaceSelect.value = surface;
      surfaceSelect.addEventListener("change", () => {
        chrome.storage.local.set({ [STORAGE_KEYS.HITTING_SURFACE]: surfaceSelect.value });
        cachedSurface = surfaceSelect.value as "Grass" | "Mat";
      });
    }

    const includeAveragesCheckbox = document.getElementById("include-averages-checkbox") as HTMLInputElement | null;
    if (includeAveragesCheckbox) {
      const stored = unitResult[STORAGE_KEYS.INCLUDE_AVERAGES];
      includeAveragesCheckbox.checked = stored === undefined ? true : Boolean(stored);
      includeAveragesCheckbox.addEventListener("change", () => {
        chrome.storage.local.set({ [STORAGE_KEYS.INCLUDE_AVERAGES]: includeAveragesCheckbox.checked });
      });
    }

    chrome.runtime.onMessage.addListener((message: { type: string; data?: unknown; error?: string }) => {
      if (message.type === 'DATA_UPDATED') {
        cachedData = (message.data as SessionData) ?? null;
        updateShotCount(message.data);
        updateExportButtonVisibility(message.data);
        updatePreview();
        renderStatCard();
      }
      if (message.type === 'HISTORY_ERROR') {
        showToast((message as { type: string; error: string }).error, "error");
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

    const settingsBtn = document.getElementById("settings-btn");
    if (settingsBtn) {
      settingsBtn.addEventListener("click", () => {
        chrome.runtime.openOptionsPage();
      });
    }

    const promptSelect = document.getElementById("prompt-select") as HTMLSelectElement | null;
    if (promptSelect) {
      await renderPromptSelect(promptSelect);

      // Restore last-selected prompt
      const promptResult = await new Promise<Record<string, unknown>>((resolve) => {
        chrome.storage.local.get([STORAGE_KEYS.SELECTED_PROMPT_ID], resolve);
      });
      const savedPromptId = promptResult[STORAGE_KEYS.SELECTED_PROMPT_ID] as string | undefined;
      if (savedPromptId) {
        promptSelect.value = savedPromptId;
        // If the saved ID doesn't match any option (deleted custom prompt), fall back
        if (promptSelect.value !== savedPromptId) {
          promptSelect.value = "quick-summary-beginner";
          chrome.storage.local.set({ [STORAGE_KEYS.SELECTED_PROMPT_ID]: "quick-summary-beginner" });
        }
      }

      // Auto-save on change
      promptSelect.addEventListener("change", () => {
        chrome.storage.local.set({ [STORAGE_KEYS.SELECTED_PROMPT_ID]: promptSelect.value });
        updatePreview();
      });
    }

    // Restore AI service preference (from sync storage for cross-device)
    const aiServiceSelect = document.getElementById("ai-service-select") as HTMLSelectElement | null;
    if (aiServiceSelect) {
      const syncResult = await new Promise<Record<string, unknown>>((resolve) => {
        chrome.storage.sync.get([STORAGE_KEYS.AI_SERVICE], resolve);
      });
      const savedService = syncResult[STORAGE_KEYS.AI_SERVICE] as string | undefined;
      if (savedService) {
        aiServiceSelect.value = savedService;
      }
      // Auto-save on change
      aiServiceSelect.addEventListener("change", () => {
        chrome.storage.sync.set({ [STORAGE_KEYS.AI_SERVICE]: aiServiceSelect.value });
        updatePreview();
      });
    }

    // Initial preview render (after both selects have their saved values restored)
    updatePreview();
    renderStatCard();

    // Copy TSV button handler (CLIP-01, CLIP-02, CLIP-03)
    const copyTsvBtn = document.getElementById("copy-tsv-btn");
    if (copyTsvBtn) {
      copyTsvBtn.addEventListener("click", async () => {
        if (!cachedData) return;
        const tsvText = writeTsv(cachedData, cachedUnitChoice, cachedSurface);
        try {
          await navigator.clipboard.writeText(tsvText);
          showToast("Shot data copied!", "success");
        } catch (err) {
          console.error("Clipboard write failed:", err);
          showToast("Failed to copy data", "error");
        }
      });
    }

    // Open in AI button handler (AILN-01, AILN-02, AILN-03)
    const openAiBtn = document.getElementById("open-ai-btn");
    if (openAiBtn) {
      openAiBtn.addEventListener("click", async () => {
        if (!cachedData || !promptSelect || !aiServiceSelect) return;

        const selectedPromptId = promptSelect.value;
        const selectedService = aiServiceSelect.value;
        const prompt = findPromptById(selectedPromptId);
        if (!prompt) return;

        const tsvData = writeTsv(cachedData, cachedUnitChoice, cachedSurface);
        const metadata = {
          date: cachedData.date,
          shotCount: countSessionShots(cachedData),
          unitLabel: buildUnitLabel(cachedUnitChoice),
          hittingSurface: cachedSurface,
        };
        const assembled = assemblePrompt(prompt, tsvData, metadata);

        try {
          await navigator.clipboard.writeText(assembled);
          // Fire-and-forget tab creation -- do not await
          chrome.tabs.create({ url: AI_URLS[selectedService] });
          showToast(`Prompt + data copied \u2014 paste into ${selectedService}`, "success");
        } catch (err) {
          console.error("AI launch failed:", err);
          showToast("Failed to copy prompt", "error");
        }
      });
    }

    // Copy Prompt + Data button handler (AILN-04)
    const copyPromptBtn = document.getElementById("copy-prompt-btn");
    if (copyPromptBtn) {
      copyPromptBtn.addEventListener("click", async () => {
        if (!cachedData || !promptSelect) return;

        const selectedPromptId = promptSelect.value;
        const prompt = findPromptById(selectedPromptId);
        if (!prompt) return;

        const tsvData = writeTsv(cachedData, cachedUnitChoice, cachedSurface);
        const metadata = {
          date: cachedData.date,
          shotCount: countSessionShots(cachedData),
          unitLabel: buildUnitLabel(cachedUnitChoice),
          hittingSurface: cachedSurface,
        };
        const assembled = assemblePrompt(prompt, tsvData, metadata);

        try {
          await navigator.clipboard.writeText(assembled);
          showToast("Prompt + data copied!", "success");
        } catch (err) {
          console.error("Clipboard write failed:", err);
          showToast("Failed to copy prompt", "error");
        }
      });
    }

  } catch (error) {
    console.error("Error loading popup data:", error);
    showToast("Error loading shot count", "error");
  }
});

function updateShotCount(data: unknown): void {
  const container = document.getElementById("shot-count-container");
  const shotCountElement = document.getElementById("shot-count");
  if (!container || !shotCountElement) return;

  if (!data || typeof data !== "object") {
    container.classList.add("empty-state");
    return;
  }

  const sessionData = data as Record<string, unknown>;
  const clubGroups = sessionData["club_groups"] as Array<Record<string, unknown>> | undefined;

  if (!clubGroups || !Array.isArray(clubGroups)) {
    container.classList.add("empty-state");
    return;
  }

  let totalShots = 0;
  for (const club of clubGroups) {
    const shots = club["shots"] as Array<Record<string, unknown>> | undefined;
    if (shots && Array.isArray(shots)) {
      totalShots += shots.length;
    }
  }

  container.classList.remove("empty-state");
  shotCountElement.textContent = totalShots.toString();
}

function updateExportButtonVisibility(data: unknown): void {
  const exportRow = document.getElementById("export-row");
  const aiSection = document.getElementById("ai-section");
  const clearBtn = document.getElementById("clear-btn");

  const hasValidData = data && typeof data === "object" &&
    (data as Record<string, unknown>)["club_groups"];

  if (exportRow) exportRow.style.display = hasValidData ? "flex" : "none";
  if (aiSection) aiSection.style.display = hasValidData ? "block" : "none";
  if (clearBtn) clearBtn.style.display = hasValidData ? "block" : "none";
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
  statusElement.classList.remove("status-error", "status-success");
  statusElement.classList.add(isError ? "status-error" : "status-success");
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

    cachedData = null;
    updateShotCount(null);
    updateExportButtonVisibility(null);
    renderStatCard();
    showToast("Session data cleared", "success");
  } catch (error) {
    console.error("Error clearing session data:", error);
    showToast("Failed to clear data", "error");
  } finally {
    clearBtn.disabled = false;
  }
}
