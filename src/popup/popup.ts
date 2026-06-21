/**
 * Popup UI logic for TrackPull Extension
 */

import { STORAGE_KEYS } from "../shared/constants";
import { migrateLegacyPref, getApiSourceUnitSystem, normalizeMetricValue, DISTANCE_LABELS, SPEED_LABELS, DEFAULT_UNIT_CHOICE } from "../shared/unit_normalization";
import type { SessionData, Shot } from "../models/types";
import type { UnitChoice } from "../shared/unit_normalization";
import type { ActivitySummary, FetchActivitiesQueryCandidate, ImportStatus } from "../shared/import_types";
import {
  FETCH_ACTIVITIES_MAX_PAGES,
  FETCH_ACTIVITIES_PAGE_SIZE,
  FETCH_ACTIVITIES_QUERY_CANDIDATES,
  IMPORT_SESSION_QUERY_CANDIDATES,
  normalizeActivitySummaries,
  normalizeActivitySummaryPage,
} from "../shared/import_types";
import {
  createBulkImportJob,
  completeBulkImportJob,
  failBulkImportItem,
  getBulkImportProgressLabel,
  getNextBulkImportItem,
  pauseBulkImportJob,
  recoverInterruptedBulkImportJob,
  resetFailedBulkImportItems,
  startBulkImportJob,
  updateBulkImportItem,
  type BulkImportJob,
  type BulkImportSaveResult,
} from "../shared/bulk_import";
import { getBulkImportedSessions, clearBulkImportedSessions } from "../shared/bulk_import_store";
import { writeBulkCsv } from "../shared/csv_writer";
import { writeTsv } from "../shared/tsv_writer";
import { BUILTIN_PROMPTS } from "../shared/prompt_types";
import type { CustomPrompt, PromptItem } from "../shared/prompt_types";
import { assemblePrompt, buildUnitLabel, countSessionShots } from "../shared/prompt_builder";
import { loadCustomPrompts } from "../shared/custom_prompts";
import { hasPortalPermission, requestPortalPermission, PORTAL_ORIGINS } from "../shared/portalPermissions";
import { formatActivityDate, getPortalActivityDisplayLabel } from "../shared/activity_helpers";

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
let cachedPortalActivities: ActivitySummary[] = [];
let activeBulkImportJob: BulkImportJob | null = null;
let bulkImportRunning = false;
let bulkImportPauseRequested = false;

const AI_URLS: Record<string, string> = {
  "ChatGPT": "https://chatgpt.com",
  "Claude": "https://claude.ai",
  "Gemini": "https://gemini.google.com",
};

/** URL pattern for portal activity pages. Captures the base64 activity ID. */
const PORTAL_ACTIVITY_PATTERN = /^https:\/\/portal\.trackmangolf\.com\/player\/activities\/([A-Za-z0-9+/=]+)$/;
const PORTAL_ACTIVITIES_LIST_PATTERN = /^https:\/\/portal\.trackmangolf\.com\/player\/activities\/?$/;

interface PortalGraphQLFetchResponse {
  success: boolean;
  data?: {
    data?: Record<string, unknown> & { node?: unknown };
    errors?: Array<{ message: string }>;
  };
  error?: string;
}

function isPortalAuthMessage(message: string): boolean {
  const normalized = message.toLowerCase();
  return normalized.includes("unauthorized") ||
    normalized.includes("not authorized") ||
    normalized.includes("unauthenticated") ||
    normalized.includes("not logged in");
}

function isPortalBridgeUnavailableMessage(message: string): boolean {
  const normalized = message.toLowerCase();
  return normalized.includes("could not establish connection") ||
    normalized.includes("receiving end does not exist");
}

function formatPortalFetchError(message: string): string {
  if (isPortalBridgeUnavailableMessage(message)) {
    return "Refresh the Trackman portal tab, then reopen TrackPull";
  }
  return isPortalAuthMessage(message)
    ? "Session expired — log into portal.trackmangolf.com"
    : message;
}

async function fetchPortalGraphQL(
  tabId: number,
  candidate: FetchActivitiesQueryCandidate,
  variables?: Record<string, unknown>
): Promise<PortalGraphQLFetchResponse> {
  return chrome.tabs.sendMessage(tabId, {
    type: "PORTAL_GRAPHQL_FETCH",
    query: candidate.query,
    variables,
  }) as Promise<PortalGraphQLFetchResponse>;
}

function appendUniqueActivities(
  target: ActivitySummary[],
  seenIds: Set<string>,
  activities: ActivitySummary[]
): void {
  for (const activity of activities) {
    if (seenIds.has(activity.id)) continue;
    seenIds.add(activity.id);
    target.push(activity);
  }
}

async function fetchPortalActivitiesForCandidate(
  tabId: number,
  candidate: FetchActivitiesQueryCandidate
): Promise<{ activities?: ActivitySummary[]; error?: string }> {
  if (!candidate.paginated) {
    const fetchResponse = await fetchPortalGraphQL(tabId, candidate);
    if (!fetchResponse?.success) {
      return { error: fetchResponse?.error ?? "Failed to fetch activities" };
    }

    const graphQLErrors = fetchResponse.data?.errors ?? [];
    if (graphQLErrors.length > 0) {
      return { error: graphQLErrors[0].message };
    }

    return { activities: normalizeActivitySummaries(fetchResponse.data?.data) };
  }

  const activities: ActivitySummary[] = [];
  const seenIds = new Set<string>();
  let skip = 0;

  for (let page = 0; page < FETCH_ACTIVITIES_MAX_PAGES; page += 1) {
    const fetchResponse = await fetchPortalGraphQL(tabId, candidate, {
      skip,
      take: FETCH_ACTIVITIES_PAGE_SIZE,
    });
    if (!fetchResponse?.success) {
      return { error: fetchResponse?.error ?? "Failed to fetch activities" };
    }

    const graphQLErrors = fetchResponse.data?.errors ?? [];
    if (graphQLErrors.length > 0) {
      return { error: graphQLErrors[0].message };
    }

    const summaryPage = normalizeActivitySummaryPage(fetchResponse.data?.data);
    appendUniqueActivities(activities, seenIds, summaryPage.activities);

    const consumedCount = skip + summaryPage.itemCount;
    if (
      summaryPage.hasNextPage === false ||
      summaryPage.itemCount === 0 ||
      (summaryPage.hasNextPage === null && summaryPage.itemCount < FETCH_ACTIVITIES_PAGE_SIZE) ||
      (summaryPage.totalCount !== null && consumedCount >= summaryPage.totalCount)
    ) {
      return { activities };
    }
    skip = consumedCount;
  }

  return { activities };
}

async function fetchPortalActivities(tabId: number): Promise<ActivitySummary[]> {
  let firstError: string | undefined;

  for (const candidate of FETCH_ACTIVITIES_QUERY_CANDIDATES) {
    const result = await fetchPortalActivitiesForCandidate(tabId, candidate);
    if (result.error) {
      firstError = firstError ?? result.error;
      continue;
    }

    return result.activities ?? [];
  }

  throw new Error(formatPortalFetchError(firstError ?? "No activities found"));
}

function responseContainsMeasurement(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some(responseContainsMeasurement);
  }
  if (!value || typeof value !== "object") return false;

  const record = value as Record<string, unknown>;
  if (
    record.measurement ||
    record.Measurement ||
    record.NormalizedMeasurement
  ) {
    return true;
  }

  return Object.entries(record).some(([key, nested]) => {
    if (key === "measurement" || key === "Measurement" || key === "NormalizedMeasurement") {
      return false;
    }
    return responseContainsMeasurement(nested);
  });
}

async function fetchPortalActivityCandidates(
  tabId: number,
  activityId: string
): Promise<Array<NonNullable<PortalGraphQLFetchResponse["data"]>>> {
  const payloads: Array<NonNullable<PortalGraphQLFetchResponse["data"]>> = [];
  let firstError: string | undefined;

  for (const candidate of IMPORT_SESSION_QUERY_CANDIDATES) {
    const fetchResponse = await chrome.tabs.sendMessage(tabId, {
      type: "PORTAL_GRAPHQL_FETCH",
      query: candidate.query,
      variables: { id: activityId },
    }) as PortalGraphQLFetchResponse;

    if (!fetchResponse?.success) {
      firstError = firstError ?? fetchResponse?.error ?? "Failed to fetch activity";
      continue;
    }

    const graphQLErrors = fetchResponse.data?.errors ?? [];
    if (graphQLErrors.length > 0) {
      firstError = firstError ?? graphQLErrors[0].message;
      continue;
    }

    if (fetchResponse.data) {
      payloads.push(fetchResponse.data);
      if (responseContainsMeasurement(fetchResponse.data.data?.node)) {
        break;
      }
    }
  }

  if (payloads.length === 0) {
    throw new Error(formatPortalFetchError(firstError ?? "Failed to fetch activity"));
  }

  return payloads;
}

function installImportStatusButtonReset(button: HTMLButtonElement): void {
  const statusListener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
    if (changes[STORAGE_KEYS.IMPORT_STATUS]) {
      const status = changes[STORAGE_KEYS.IMPORT_STATUS].newValue as ImportStatus | undefined;
      if (status && (status.state === "success" || status.state === "error")) {
        chrome.storage.onChanged.removeListener(statusListener);
        button.disabled = false;
        button.textContent = status.state === "success" ? "Imported!" : "Import";
      }
    }
  };
  chrome.storage.onChanged.addListener(statusListener);
}

async function importPortalActivityFromTab(
  tabId: number,
  activityId: string,
  button: HTMLButtonElement
): Promise<void> {
  button.disabled = true;
  button.textContent = "Importing...";

  try {
    const graphqlPayloads = await fetchPortalActivityCandidates(tabId, activityId);
    installImportStatusButtonReset(button);
    void chrome.runtime.sendMessage({
      type: "SAVE_IMPORTED_SESSION",
      graphqlPayloads,
      activityId,
    }).catch(() => {
      showToast("Import failed — try again", "error");
      button.disabled = false;
      button.textContent = "Import";
    });
  } catch (err) {
    const message = err instanceof Error && err.message
      ? err.message
      : "Unable to fetch activity";
    showToast(formatPortalFetchError(message), "error");
    button.disabled = false;
    button.textContent = "Import";
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadStoredBulkImportJob(): Promise<BulkImportJob | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEYS.BULK_IMPORT_STATUS], (result) => {
      resolve((result[STORAGE_KEYS.BULK_IMPORT_STATUS] as BulkImportJob | undefined) ?? null);
    });
  });
}

async function saveBulkImportJob(job: BulkImportJob): Promise<void> {
  activeBulkImportJob = job;
  await chrome.storage.local.set({ [STORAGE_KEYS.BULK_IMPORT_STATUS]: job });
  renderBulkImportJob(job);
}

function getBulkImportItem(job: BulkImportJob | null, activityId: string) {
  return job?.items.find((item) => item.activityId === activityId) ?? null;
}

function getActivityRow(activityId: string): HTMLElement | null {
  const rows = Array.from(document.querySelectorAll<HTMLElement>(".activity-row"));
  return rows.find((row) => row.dataset.activityId === activityId) ?? null;
}

function getSelectedPortalActivities(): ActivitySummary[] {
  const selectedIds = new Set(
    Array.from(document.querySelectorAll<HTMLInputElement>(".activity-select"))
      .filter((input) => input.checked && !input.disabled)
      .map((input) => input.value)
  );
  return cachedPortalActivities.filter((activity) => selectedIds.has(activity.id));
}

function getIncludeAveragesChoice(): boolean {
  const checkbox = document.getElementById("include-averages-checkbox") as HTMLInputElement | null;
  return checkbox?.checked ?? true;
}

function getSafeBulkFilename(): string {
  const date = new Date().toISOString().slice(0, 10);
  return `TrackPull_BulkImport_${date}.csv`;
}

function updateBulkSelectedCount(): void {
  const selectedCountEl = document.getElementById("bulk-selected-count");
  const importSelectedBtn = document.getElementById("bulk-import-selected-btn") as HTMLButtonElement | null;
  const selectAll = document.getElementById("bulk-select-all") as HTMLInputElement | null;
  const selectableBoxes = Array.from(document.querySelectorAll<HTMLInputElement>(".activity-select"))
    .filter((input) => !input.disabled);
  const selectedCount = selectableBoxes.filter((input) => input.checked).length;

  if (selectedCountEl) {
    selectedCountEl.textContent = `${selectedCount} selected`;
  }
  if (importSelectedBtn) {
    importSelectedBtn.disabled = selectedCount === 0 || bulkImportRunning;
  }
  if (selectAll) {
    selectAll.checked = selectableBoxes.length > 0 && selectedCount === selectableBoxes.length;
    selectAll.indeterminate = selectedCount > 0 && selectedCount < selectableBoxes.length;
  }
}

function renderBulkImportJob(job: BulkImportJob | null = activeBulkImportJob): void {
  activeBulkImportJob = job;

  const progressEl = document.getElementById("bulk-import-progress");
  const pauseBtn = document.getElementById("bulk-import-pause-btn") as HTMLButtonElement | null;
  const resumeBtn = document.getElementById("bulk-import-resume-btn") as HTMLButtonElement | null;
  const retryBtn = document.getElementById("bulk-import-retry-btn") as HTMLButtonElement | null;
  const exportBtn = document.getElementById("bulk-export-csv-btn") as HTMLButtonElement | null;
  const importAllBtn = document.getElementById("bulk-import-all-btn") as HTMLButtonElement | null;

  if (progressEl) {
    if (job) {
      progressEl.textContent = job.lastError
        ? `${getBulkImportProgressLabel(job)} | ${job.lastError}`
        : getBulkImportProgressLabel(job);
      progressEl.style.display = "block";
    } else {
      progressEl.textContent = "";
      progressEl.style.display = "none";
    }
  }

  if (pauseBtn) pauseBtn.disabled = !job || job.state !== "running" || !bulkImportRunning;
  if (resumeBtn) resumeBtn.disabled = !job || job.state !== "paused" || bulkImportRunning;
  if (retryBtn) retryBtn.disabled = !job || job.failed === 0 || bulkImportRunning;
  if (exportBtn) exportBtn.disabled = !job || job.imported === 0;
  if (importAllBtn) importAllBtn.disabled = cachedPortalActivities.length === 0 || bulkImportRunning;

  for (const activity of cachedPortalActivities) {
    const row = getActivityRow(activity.id);
    if (!row) continue;
    const button = row.querySelector<HTMLButtonElement>(".activity-import-btn");
    const checkbox = row.querySelector<HTMLInputElement>(".activity-select");
    const item = getBulkImportItem(job, activity.id);

    if (!button || !checkbox) continue;

    if (!item) {
      button.disabled = bulkImportRunning;
      button.textContent = "Import";
      checkbox.disabled = bulkImportRunning;
      continue;
    }

    if (item.status === "imported") {
      button.disabled = true;
      button.textContent = "Imported";
      checkbox.checked = false;
      checkbox.disabled = true;
    } else if (item.status === "importing") {
      button.disabled = true;
      button.textContent = "Importing...";
      checkbox.disabled = true;
    } else if (item.status === "failed") {
      button.disabled = bulkImportRunning;
      button.textContent = "Failed";
      checkbox.disabled = bulkImportRunning;
    } else {
      button.disabled = bulkImportRunning;
      button.textContent = "Queued";
      checkbox.disabled = bulkImportRunning;
    }
  }

  updateBulkSelectedCount();
}

async function hydrateBulkImportJobControls(): Promise<void> {
  const storedJob = await loadStoredBulkImportJob();
  if (!storedJob) {
    renderBulkImportJob(null);
    return;
  }

  const recoveredJob = recoverInterruptedBulkImportJob(storedJob);
  activeBulkImportJob = recoveredJob;
  renderBulkImportJob(recoveredJob);
  if (recoveredJob !== storedJob) {
    await saveBulkImportJob(recoveredJob);
  }
}

interface BulkImportResponse extends Partial<BulkImportSaveResult> {
  success: boolean;
  error?: string;
}

function saveBulkImportedSession(
  jobId: string,
  activityId: string,
  graphqlPayloads: Array<NonNullable<PortalGraphQLFetchResponse["data"]>>
): Promise<BulkImportResponse> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({
      type: "SAVE_BULK_IMPORTED_SESSION",
      jobId,
      activityId,
      graphqlPayloads,
    }, (response: BulkImportResponse | undefined) => {
      if (chrome.runtime.lastError) {
        resolve({ success: false, error: chrome.runtime.lastError.message });
        return;
      }
      resolve(response ?? { success: false, error: "No response from service worker" });
    });
  });
}

async function runBulkImportJob(tabId: number, startingJob: BulkImportJob): Promise<void> {
  if (bulkImportRunning) return;

  bulkImportRunning = true;
  bulkImportPauseRequested = false;
  let job = startBulkImportJob(startingJob);
  await saveBulkImportJob(job);

  try {
    while (true) {
      if (bulkImportPauseRequested) {
        job = pauseBulkImportJob(job);
        await saveBulkImportJob(job);
        showToast("Bulk import paused", "success");
        break;
      }

      const nextItem = getNextBulkImportItem(job);
      if (!nextItem) {
        job = completeBulkImportJob(job);
        await saveBulkImportJob(job);
        showToast(`Bulk import complete: ${job.imported} imported, ${job.failed} failed`, job.failed ? "error" : "success");
        break;
      }

      job = updateBulkImportItem(job, nextItem.activityId, {
        status: "importing",
        error: undefined,
      });
      await saveBulkImportJob(job);

      try {
        const graphqlPayloads = await fetchPortalActivityCandidates(tabId, nextItem.activityId);
        const result = await saveBulkImportedSession(job.id, nextItem.activityId, graphqlPayloads);

        if (result.success && result.reportId) {
          job = updateBulkImportItem(job, nextItem.activityId, {
            status: "imported",
            reportId: result.reportId,
            shotCount: result.shotCount,
            error: undefined,
          });
        } else {
          const message = result.error ?? "Import failed";
          job = failBulkImportItem(job, nextItem.activityId, message);
          if (isPortalAuthMessage(message)) {
            job = { ...pauseBulkImportJob(job), lastError: message };
            await saveBulkImportJob(job);
            showToast(message, "error");
            break;
          }
        }
      } catch (err) {
        const message = err instanceof Error && err.message
          ? err.message
          : "Unable to fetch activity";
        job = failBulkImportItem(job, nextItem.activityId, message);

        if (isPortalAuthMessage(message)) {
          job = { ...pauseBulkImportJob(job), lastError: message };
          await saveBulkImportJob(job);
          showToast(message, "error");
          break;
        }
      }

      await saveBulkImportJob(job);
      await delay(250);
    }
  } finally {
    bulkImportRunning = false;
    renderBulkImportJob(job);
  }
}

async function startNewBulkImport(tabId: number, activities: ActivitySummary[]): Promise<void> {
  if (activities.length === 0) {
    showToast("Select at least one session", "error");
    return;
  }
  if (bulkImportRunning) return;

  const previousJob = activeBulkImportJob;
  const job = createBulkImportJob(activities);
  if (previousJob) {
    await clearBulkImportedSessions(previousJob.id).catch((err) => {
      console.warn("Could not clear previous bulk import archive:", err);
    });
  }
  await clearBulkImportedSessions(job.id).catch(() => undefined);
  await runBulkImportJob(tabId, job);
}

async function resumeBulkImport(tabId: number): Promise<void> {
  if (!activeBulkImportJob || bulkImportRunning) return;
  await runBulkImportJob(tabId, activeBulkImportJob);
}

async function retryFailedBulkImport(tabId: number): Promise<void> {
  if (!activeBulkImportJob || bulkImportRunning) return;
  const retryJob = resetFailedBulkImportItems(activeBulkImportJob);
  await saveBulkImportJob(retryJob);
  await runBulkImportJob(tabId, retryJob);
}

async function exportBulkImportedCsv(): Promise<void> {
  if (!activeBulkImportJob || activeBulkImportJob.imported === 0) {
    showToast("No imported sessions to export", "error");
    return;
  }

  const exportBtn = document.getElementById("bulk-export-csv-btn") as HTMLButtonElement | null;
  if (exportBtn) exportBtn.disabled = true;

  try {
    const sessions = await getBulkImportedSessions(activeBulkImportJob.id);
    if (sessions.length === 0) {
      showToast("No imported sessions to export", "error");
      return;
    }

    const csvContent = writeBulkCsv(
      sessions,
      getIncludeAveragesChoice(),
      undefined,
      cachedUnitChoice,
      cachedSurface
    );
    const filename = getSafeBulkFilename();

    await new Promise<void>((resolve, reject) => {
      chrome.downloads.download({
        url: `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`,
        filename,
        saveAs: false,
      }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });

    showToast(`Exported successfully: ${filename}`, "success");
  } catch (err) {
    console.error("Bulk CSV export failed:", err);
    showToast("Bulk CSV export failed", "error");
  } finally {
    if (exportBtn) exportBtn.disabled = false;
    renderBulkImportJob(activeBulkImportJob);
  }
}

function renderBulkImportControls(tabId: number, activities: ActivitySummary[]): HTMLElement {
  const controls = document.createElement("div");
  controls.id = "bulk-import-controls";
  controls.className = "bulk-import-controls";

  const topRow = document.createElement("div");
  topRow.className = "bulk-import-row";

  const selectLabel = document.createElement("label");
  selectLabel.className = "bulk-select-label";

  const selectAll = document.createElement("input");
  selectAll.id = "bulk-select-all";
  selectAll.type = "checkbox";
  selectAll.addEventListener("change", () => {
    const boxes = Array.from(document.querySelectorAll<HTMLInputElement>(".activity-select"))
      .filter((input) => !input.disabled);
    for (const box of boxes) {
      box.checked = selectAll.checked;
    }
    updateBulkSelectedCount();
  });

  const selectedCount = document.createElement("span");
  selectedCount.id = "bulk-selected-count";
  selectedCount.textContent = "0 selected";
  selectLabel.append(selectAll, selectedCount);

  const importSelectedBtn = document.createElement("button");
  importSelectedBtn.id = "bulk-import-selected-btn";
  importSelectedBtn.className = "bulk-action-btn";
  importSelectedBtn.textContent = "Import selected";
  importSelectedBtn.disabled = true;
  importSelectedBtn.addEventListener("click", () => {
    void startNewBulkImport(tabId, getSelectedPortalActivities());
  });

  const importAllBtn = document.createElement("button");
  importAllBtn.id = "bulk-import-all-btn";
  importAllBtn.className = "bulk-action-btn";
  importAllBtn.textContent = "Import all";
  importAllBtn.disabled = activities.length === 0;
  importAllBtn.addEventListener("click", () => {
    void startNewBulkImport(tabId, activities);
  });

  topRow.append(selectLabel, importSelectedBtn, importAllBtn);

  const bottomRow = document.createElement("div");
  bottomRow.className = "bulk-import-row";

  const pauseBtn = document.createElement("button");
  pauseBtn.id = "bulk-import-pause-btn";
  pauseBtn.className = "bulk-action-btn";
  pauseBtn.textContent = "Pause";
  pauseBtn.disabled = true;
  pauseBtn.addEventListener("click", () => {
    bulkImportPauseRequested = true;
  });

  const resumeBtn = document.createElement("button");
  resumeBtn.id = "bulk-import-resume-btn";
  resumeBtn.className = "bulk-action-btn";
  resumeBtn.textContent = "Resume";
  resumeBtn.disabled = true;
  resumeBtn.addEventListener("click", () => {
    void resumeBulkImport(tabId);
  });

  const retryBtn = document.createElement("button");
  retryBtn.id = "bulk-import-retry-btn";
  retryBtn.className = "bulk-action-btn";
  retryBtn.textContent = "Retry failed";
  retryBtn.disabled = true;
  retryBtn.addEventListener("click", () => {
    void retryFailedBulkImport(tabId);
  });

  const exportBtn = document.createElement("button");
  exportBtn.id = "bulk-export-csv-btn";
  exportBtn.className = "bulk-action-btn";
  exportBtn.textContent = "Export CSV";
  exportBtn.disabled = true;
  exportBtn.addEventListener("click", () => {
    void exportBulkImportedCsv();
  });

  bottomRow.append(pauseBtn, resumeBtn, retryBtn, exportBtn);

  const progress = document.createElement("div");
  progress.id = "bulk-import-progress";
  progress.className = "bulk-import-progress";
  progress.style.display = "none";

  controls.append(topRow, bottomRow, progress);
  return controls;
}

function renderPortalActivityBrowser(
  activities: ActivitySummary[],
  tabId: number
): void {
  const browser = document.getElementById("portal-activity-browser");
  const list = document.getElementById("portal-activity-list");
  if (!browser || !list) return;

  cachedPortalActivities = activities;

  browser.style.display = "block";
  document.getElementById("bulk-import-controls")?.remove();

  if (activities.length === 0) {
    list.innerHTML = `<div class="activity-list-empty">No Course Play or Map My Bag sessions found</div>`;
    renderBulkImportJob(null);
    return;
  }

  list.before(renderBulkImportControls(tabId, activities));
  list.innerHTML = "";
  const fragment = document.createDocumentFragment();
  for (const activity of activities) {
    const row = document.createElement("div");
    row.className = "activity-row";
    row.dataset.activityId = activity.id;

    const selectBox = document.createElement("input");
    selectBox.className = "activity-select";
    selectBox.type = "checkbox";
    selectBox.value = activity.id;
    selectBox.setAttribute("aria-label", `Select ${formatActivityDate(activity.date)}`);
    selectBox.addEventListener("change", updateBulkSelectedCount);

    const dateEl = document.createElement("span");
    dateEl.className = "activity-date";
    dateEl.textContent = formatActivityDate(activity.date);

    const mainEl = document.createElement("span");
    mainEl.className = "activity-main";

    const typeEl = document.createElement("span");
    typeEl.className = "activity-type";
    typeEl.textContent = getPortalActivityDisplayLabel(activity.type);

    const detailEl = document.createElement("span");
    detailEl.className = "activity-detail";
    detailEl.textContent = activity.courseName ??
      (activity.strokeCount === null ? "" : `${activity.strokeCount} shots`);
    if (detailEl.textContent) {
      detailEl.title = detailEl.textContent;
    }
    mainEl.append(typeEl, detailEl);

    const importBtn = document.createElement("button");
    importBtn.className = "activity-import-btn";
    importBtn.textContent = "Import";
    importBtn.addEventListener("click", () => {
      importPortalActivityFromTab(tabId, activity.id, importBtn);
    });

    row.append(selectBox, dateEl, mainEl, importBtn);
    fragment.appendChild(row);
  }

  list.appendChild(fragment);
  updateBulkSelectedCount();
  void hydrateBulkImportJobControls();
}

/**
 * Check if the active tab is on a portal activity page.
 * If so, show the import button. Otherwise show instructions.
 */
async function checkActiveTabForActivity(): Promise<void> {
  const detected = document.getElementById("portal-activity-detected");
  const noActivity = document.getElementById("portal-no-activity");
  const browser = document.getElementById("portal-activity-browser");
  if (!detected || !noActivity) return;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const match = tab?.url?.match(PORTAL_ACTIVITY_PATTERN);

    if (match && tab.id) {
      const activityId = match[1];
      const tabId = tab.id;
      detected.style.display = "";
      noActivity.style.display = "none";
      if (browser) browser.style.display = "none";

      const importBtn = document.getElementById("portal-import-btn");
      if (importBtn) {
        importBtn.addEventListener("click", async () => {
          await importPortalActivityFromTab(tabId, activityId, importBtn as HTMLButtonElement);
        });
      }
    } else if (tab?.url?.match(PORTAL_ACTIVITIES_LIST_PATTERN) && tab.id) {
      detected.style.display = "none";
      noActivity.style.display = "none";
      if (browser) {
        browser.style.display = "block";
        const list = document.getElementById("portal-activity-list");
        if (list) list.innerHTML = `<div class="activity-loading">Loading activities...</div>`;
      }
      const activities = await fetchPortalActivities(tab.id);
      renderPortalActivityBrowser(activities, tab.id);
    } else {
      detected.style.display = "none";
      noActivity.style.display = "";
      if (browser) browser.style.display = "none";
    }
  } catch (err) {
    const message = err instanceof Error && err.message
      ? err.message
      : "Unable to fetch activities";
    const formattedMessage = formatPortalFetchError(message);
    detected.style.display = "none";
    noActivity.style.display = "none";
    if (browser) {
      browser.style.display = "block";
      const list = document.getElementById("portal-activity-list");
      if (list) list.innerHTML = `<div class="activity-list-empty">${escapeHtml(formattedMessage)}</div>`;
    }
    showToast(formattedMessage, "error");
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
      if (namespace === "local" && changes[STORAGE_KEYS.BULK_IMPORT_STATUS]) {
        const newJob = changes[STORAGE_KEYS.BULK_IMPORT_STATUS].newValue as BulkImportJob | undefined;
        renderBulkImportJob(newJob ?? null);
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

    // Portal permission check — skip GraphQL health check (cookies don't work from service worker)
    const portalGranted = await hasPortalPermission();
    if (portalGranted) {
      renderPortalSection("ready");
      checkActiveTabForActivity();
    } else {
      renderPortalSection("denied");
    }

    // Grant Access button — re-trigger permission request (D-03)
    const portalGrantBtn = document.getElementById("portal-grant-btn");
    if (portalGrantBtn) {
      portalGrantBtn.addEventListener("click", async () => {
        const granted = await requestPortalPermission();
        renderPortalSection(granted ? "ready" : "denied");
        if (granted) {
          checkActiveTabForActivity();
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

    const portalOpenLink = document.getElementById("portal-open-link");
    if (portalOpenLink) {
      portalOpenLink.addEventListener("click", (e) => {
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
        checkActiveTabForActivity();
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
