/**
 * Popup UI logic for TrackPull Extension
 */

import { STORAGE_KEYS } from "../shared/constants";
import { migrateLegacyPref, getApiSourceUnitSystem, normalizeMetricValue, DISTANCE_LABELS, SPEED_LABELS, DEFAULT_UNIT_CHOICE } from "../shared/unit_normalization";
import type { SessionData, Shot } from "../models/types";
import type { UnitChoice } from "../shared/unit_normalization";
import type { ActivitySummary, ImportStatus } from "../shared/import_types";
import { writeTsv } from "../shared/tsv_writer";
import { BUILTIN_PROMPTS } from "../shared/prompt_types";
import type { CustomPrompt, PromptItem } from "../shared/prompt_types";
import { assemblePrompt, buildUnitLabel, countSessionShots } from "../shared/prompt_builder";
import { loadCustomPrompts } from "../shared/custom_prompts";
import { hasPortalPermission, requestPortalPermission, PORTAL_ORIGINS } from "../shared/portalPermissions";
import { formatActivityDate, getTimePeriod, filterActivities, getUniqueTypes } from "../shared/activity_helpers";
import type { TimePeriod } from "../shared/activity_helpers";
import { extractActivityUuid } from "../shared/portal_parser";

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

/** Cached activities from the last FETCH_ACTIVITIES response. */
let cachedActivities: ActivitySummary[] = [];
/** Set of report_id UUIDs already in session history (for "Imported" badge). */
let importedReportIds: Set<string> = new Set();

const AI_URLS: Record<string, string> = {
  "ChatGPT": "https://chatgpt.com",
  "Claude": "https://claude.ai",
  "Gemini": "https://gemini.google.com",
};

/**
 * Read session history from storage and return the set of report_id values.
 * Used to detect already-imported activities (D-06).
 * report_id in history is the UUID extracted from the base64 activity ID.
 */
async function fetchImportedIds(): Promise<Set<string>> {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEYS.SESSION_HISTORY], (result) => {
      const history = (result[STORAGE_KEYS.SESSION_HISTORY] as Array<{ snapshot: { report_id: string } }>) ?? [];
      resolve(new Set(history.map((e) => e.snapshot.report_id)));
    });
  });
}

/**
 * Render the activity list grouped by time period with filter applied.
 * Per D-04: compact single-line rows. Per D-07: flat section headers.
 * Per D-08: empty periods hidden. Per D-06: "Imported" label for already-imported.
 */
function renderActivityBrowser(
  activities: ActivitySummary[],
  importedIds: Set<string>,
  typeFilter: string
): void {
  const container = document.getElementById("activity-list-container");
  if (!container) return;

  const filtered = filterActivities(activities, typeFilter);

  if (filtered.length === 0) {
    container.innerHTML = `<div class="activity-list-empty">${
      activities.length === 0 ? "No activities found" : "No activities match this filter"
    }</div>`;
    return;
  }

  const periods: TimePeriod[] = ["Today", "This Week", "This Month", "Older"];

  let html = "";
  for (const period of periods) {
    const group = filtered.filter((a) => getTimePeriod(a.date) === period);
    if (group.length === 0) continue;
    html += `<div class="activity-period-header">${escapeHtml(period)}</div>`;
    for (const activity of group) {
      // Compare UUID (report_id in history) against decoded activity.id
      const isImported = importedIds.has(extractActivityUuid(activity.id));
      const dateStr = formatActivityDate(activity.date);
      const typeStr = activity.type ? escapeHtml(activity.type) : "\u2014";
      const countStr = activity.strokeCount !== null ? String(activity.strokeCount) : "\u2014";
      const actionHtml = isImported
        ? `<span class="activity-imported-label">Imported</span>`
        : `<button class="activity-import-btn" data-activity-id="${escapeHtml(activity.id)}">Import</button>`;
      html += `<div class="activity-row">
        <span class="activity-date">${dateStr}</span>
        <span class="activity-type">${typeStr}</span>
        <span class="activity-stroke-count">${countStr}</span>
        ${actionHtml}
      </div>`;
    }
  }
  container.innerHTML = html;

  // Attach import button click handlers
  container.querySelectorAll<HTMLButtonElement>(".activity-import-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const activityId = btn.dataset.activityId;
      if (!activityId) return;
      btn.disabled = true;
      btn.textContent = "Importing...";
      chrome.runtime.sendMessage({ type: "IMPORT_SESSION", activityId });
      // Import result is displayed via showImportStatus (storage.onChanged listener from Phase 24)
    });
  });
}

/**
 * Populate the type filter dropdown with unique types from fetched activities.
 * Per D-10: dynamically populated. Per D-09: "All Types" default.
 */
function populateTypeFilter(activities: ActivitySummary[]): void {
  const select = document.getElementById("activity-type-filter") as HTMLSelectElement | null;
  if (!select) return;

  const types = getUniqueTypes(activities);
  // Reset to just "All Types"
  select.innerHTML = `<option value="">All Types</option>`;
  for (const type of types) {
    const opt = document.createElement("option");
    opt.value = type;
    opt.textContent = type;
    select.appendChild(opt);
  }
}

/**
 * Fetch activities from service worker and render the browser.
 * Called when portal state is "ready". Per D-01: auto-load on open.
 * Per D-12: shows loading/loaded/error states.
 */
async function loadActivityBrowser(): Promise<void> {
  const container = document.getElementById("activity-list-container");
  if (container) {
    container.innerHTML = `<div class="activity-loading">Loading activities...</div>`;
  }

  try {
    // Fetch imported IDs and activities in parallel
    const [ids, response] = await Promise.all([
      fetchImportedIds(),
      new Promise<{ success: boolean; activities?: ActivitySummary[]; error?: string }>((resolve) => {
        chrome.runtime.sendMessage({ type: "FETCH_ACTIVITIES" }, resolve);
      }),
    ]);

    importedReportIds = ids;

    if (!response || !response.success) {
      if (container) {
        container.innerHTML = `<div class="activity-list-empty">${escapeHtml(response?.error ?? "Unable to fetch activities")}</div>`;
      }
      return;
    }

    cachedActivities = response.activities ?? [];
    populateTypeFilter(cachedActivities);

    const select = document.getElementById("activity-type-filter") as HTMLSelectElement | null;
    const typeFilter = select?.value ?? "";
    renderActivityBrowser(cachedActivities, importedReportIds, typeFilter);
  } catch {
    if (container) {
      container.innerHTML = `<div class="activity-list-empty">Unable to fetch activities \u2014 try again later</div>`;
    }
  }
}

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

/**
 * Display import result using the existing toast system (RESIL-02).
 * For success: show a brief success toast.
 * For error: show the error message as an error toast.
 * For importing: show an in-progress success-styled toast.
 * For idle/absent: no-op.
 */
function showImportStatus(status: ImportStatus): void {
  if (status.state === "success") {
    showToast("Session imported successfully", "success");
  } else if (status.state === "error") {
    showToast(status.message, "error");
  } else if (status.state === "importing") {
    showToast("Importing session...", "success");
  }
  // idle: no-op
}

type PortalState = "denied" | "not-logged-in" | "ready" | "error";

function renderPortalSection(state: PortalState, errorMsg?: string): void {
  const section = document.getElementById("portal-section");
  const denied = document.getElementById("portal-denied");
  const notLoggedIn = document.getElementById("portal-not-logged-in");
  const ready = document.getElementById("portal-ready");
  const errorDiv = document.getElementById("portal-error");
  if (!section || !denied || !notLoggedIn || !ready || !errorDiv) return;

  section.style.display = "block";
  denied.style.display = state === "denied" ? "block" : "none";
  notLoggedIn.style.display = state === "not-logged-in" ? "block" : "none";
  ready.style.display = state === "ready" ? "block" : "none";
  errorDiv.style.display = state === "error" ? "block" : "none";

  if (state === "error" && errorMsg) {
    const errorMsgEl = document.getElementById("portal-error-msg");
    if (errorMsgEl) errorMsgEl.textContent = errorMsg;
  }
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

    // RESIL-02: Read and display import status on popup open
    const statusResult = await new Promise<Record<string, unknown>>((resolve) => {
      chrome.storage.local.get([STORAGE_KEYS.IMPORT_STATUS], resolve);
    });
    const importStatus = statusResult[STORAGE_KEYS.IMPORT_STATUS] as ImportStatus | undefined;
    if (importStatus && importStatus.state !== "idle") {
      showImportStatus(importStatus);
      // D-02: Auto-clear on read — clear success and error states after display
      if (importStatus.state === "success" || importStatus.state === "error") {
        chrome.storage.local.remove(STORAGE_KEYS.IMPORT_STATUS);
      }
    }

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

    // Listen for import status changes while popup is open (RESIL-02 real-time updates)
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === "local" && changes[STORAGE_KEYS.IMPORT_STATUS]) {
        const newStatus = changes[STORAGE_KEYS.IMPORT_STATUS].newValue as ImportStatus | undefined;
        if (newStatus && newStatus.state !== "idle") {
          showImportStatus(newStatus);
          // D-02: Auto-clear completed states
          if (newStatus.state === "success" || newStatus.state === "error") {
            chrome.storage.local.remove(STORAGE_KEYS.IMPORT_STATUS);
          }
        }
      }
    });

    // Refresh imported IDs when history changes (new import completed)
    chrome.storage.onChanged.addListener((changes) => {
      if (changes[STORAGE_KEYS.SESSION_HISTORY]) {
        fetchImportedIds().then((ids) => {
          importedReportIds = ids;
          const select = document.getElementById("activity-type-filter") as HTMLSelectElement | null;
          renderActivityBrowser(cachedActivities, importedReportIds, select?.value ?? "");
        });
      }
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

    // Portal auth check on every popup open (D-01, D-03)
    try {
      const authResponse = await new Promise<{ success: boolean; status?: string; message?: string }>((resolve) => {
        chrome.runtime.sendMessage({ type: "PORTAL_AUTH_CHECK" }, resolve);
      });
      if (authResponse.success && authResponse.status) {
        const stateMap: Record<string, PortalState> = {
          denied: "denied",
          unauthenticated: "not-logged-in",
          authenticated: "ready",
          error: "error",
        };
        renderPortalSection(stateMap[authResponse.status] ?? "error", authResponse.message);
        if (stateMap[authResponse.status] === "ready") {
          loadActivityBrowser();
        }
      } else {
        renderPortalSection("error", "Unable to check portal status");
      }
    } catch {
      renderPortalSection("error", "Unable to check portal status");
    }

    // Activity type filter change handler (D-09, D-11)
    const activityTypeFilter = document.getElementById("activity-type-filter") as HTMLSelectElement | null;
    if (activityTypeFilter) {
      activityTypeFilter.addEventListener("change", () => {
        renderActivityBrowser(cachedActivities, importedReportIds, activityTypeFilter.value);
      });
    }

    // Grant Access button — re-trigger permission request (D-03)
    const portalGrantBtn = document.getElementById("portal-grant-btn");
    if (portalGrantBtn) {
      portalGrantBtn.addEventListener("click", async () => {
        const granted = await requestPortalPermission();
        renderPortalSection(granted ? "ready" : "denied");
        if (granted) {
          loadActivityBrowser();
        }
      });
    }

    // Portal login link — opens portal in new tab (D-02)
    const portalLoginLink = document.getElementById("portal-login-link");
    if (portalLoginLink) {
      portalLoginLink.addEventListener("click", (e) => {
        e.preventDefault();
        chrome.tabs.create({ url: "https://portal.trackmangolf.com" });
      });
    }

    // Reactive UI update when permission granted/revoked externally
    chrome.permissions.onAdded.addListener((permissions) => {
      const portalOriginsGranted = PORTAL_ORIGINS.some(
        (origin) => permissions.origins?.includes(origin)
      );
      if (portalOriginsGranted) {
        renderPortalSection("ready");
        loadActivityBrowser();
      }
    });

    chrome.permissions.onRemoved.addListener((permissions) => {
      const portalOriginsRemoved = PORTAL_ORIGINS.some(
        (origin) => permissions.origins?.includes(origin)
      );
      if (portalOriginsRemoved) {
        renderPortalSection("denied");
      }
    });

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
