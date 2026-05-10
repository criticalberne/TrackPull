/**
 * Service Worker for TrackPull Chrome Extension
 */

import { STORAGE_KEYS } from "../shared/constants";
import { writeCsv } from "../shared/csv_writer";
import type { SessionData } from "../models/types";
import { migrateLegacyPref, DEFAULT_UNIT_CHOICE, type UnitChoice, type SpeedUnit, type DistanceUnit } from "../shared/unit_normalization";
import { saveSessionToHistory, getHistoryErrorMessage } from "../shared/history";
import { hasPortalPermission } from "../shared/portalPermissions";
import { executeQuery, classifyAuthResult, HEALTH_CHECK_QUERY } from "../shared/graphql_client";
import { parsePortalActivity } from "../shared/portal_parser";
import type { GraphQLActivity } from "../shared/portal_parser";
import type { FetchActivitiesQueryCandidate, ImportStatus, ActivitySummary } from "../shared/import_types";
import {
  FETCH_ACTIVITIES_MAX_PAGES,
  FETCH_ACTIVITIES_PAGE_SIZE,
  FETCH_ACTIVITIES_QUERY_CANDIDATES,
  IMPORT_SESSION_QUERY_CANDIDATES,
  normalizeActivitySummaries,
  normalizeActivitySummaryPage,
} from "../shared/import_types";

interface ImportedSessionGraphQLData {
  data?: { node?: GraphQLActivity };
  errors?: Array<{ message: string; extensions?: { code?: string } }>;
}

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

interface FetchActivitiesRequest {
  type: "FETCH_ACTIVITIES";
}

interface ImportSessionRequest {
  type: "IMPORT_SESSION";
  activityId: string;
}

interface PortalAuthCheckRequest {
  type: "PORTAL_AUTH_CHECK";
}

interface SaveImportedSessionRequest {
  type: "SAVE_IMPORTED_SESSION";
  graphqlData?: ImportedSessionGraphQLData;
  graphqlPayloads?: ImportedSessionGraphQLData[];
  activityId: string;
}

function isAuthError(errors: Array<{ message: string; extensions?: { code?: string } }>): boolean {
  if (errors.length === 0) return false;
  const code = errors[0].extensions?.code ?? "";
  const msg = errors[0].message?.toLowerCase() ?? "";
  return code === "UNAUTHENTICATED" || msg.includes("unauthorized") || msg.includes("not authorized") || msg.includes("unauthenticated") || msg.includes("not logged in");
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

type RequestMessage =
  | SaveDataRequest
  | ExportCsvRequest
  | GetDataRequest
  | FetchActivitiesRequest
  | ImportSessionRequest
  | PortalAuthCheckRequest
  | SaveImportedSessionRequest;

function parseImportedSession(
  payloads: ImportedSessionGraphQLData[]
): SessionData | null {
  for (const payload of payloads) {
    if (payload.errors && payload.errors.length > 0) continue;
    const activity = payload.data?.node;
    const session = activity ? parsePortalActivity(activity) : null;
    if (session) return session;
  }
  return null;
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

async function fetchActivitiesForCandidate(
  candidate: FetchActivitiesQueryCandidate
): Promise<{
  activities?: ActivitySummary[];
  errors?: Array<{ message: string; extensions?: { code?: string } }>;
}> {
  if (!candidate.paginated) {
    const result = await executeQuery<Record<string, unknown>>(candidate.query);
    if (result.errors && result.errors.length > 0) {
      return { errors: result.errors };
    }
    return { activities: normalizeActivitySummaries(result.data) };
  }

  const activities: ActivitySummary[] = [];
  const seenIds = new Set<string>();
  let skip = 0;

  for (let page = 0; page < FETCH_ACTIVITIES_MAX_PAGES; page += 1) {
    const result = await executeQuery<Record<string, unknown>>(
      candidate.query,
      { skip, take: FETCH_ACTIVITIES_PAGE_SIZE }
    );
    if (result.errors && result.errors.length > 0) {
      return { errors: result.errors };
    }

    const summaryPage = normalizeActivitySummaryPage(result.data);
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
        const rawDate = data.date || "unknown";
        // Sanitize date for filename — remove colons and characters invalid in filenames
        const safeDate = rawDate.replace(/[:.]/g, "-").replace(/[/\\?%*|"<>]/g, "");
        const filename = `ShotData_${safeDate}.csv`;

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

  if (message.type === "PORTAL_AUTH_CHECK") {
    (async () => {
      const granted = await hasPortalPermission();
      if (!granted) {
        sendResponse({ success: true, status: "denied" });
        return;
      }
      try {
        const result = await executeQuery<{ me: { __typename: string } | null }>(HEALTH_CHECK_QUERY);
        const authStatus = classifyAuthResult(result);
        if (authStatus.kind === "error") {
          console.error("TrackPull: GraphQL health check error:", authStatus.message);
        }
        sendResponse({
          success: true,
          status: authStatus.kind,
          message: authStatus.kind === "error" ? authStatus.message : undefined,
        });
      } catch (err) {
        console.error("TrackPull: GraphQL health check failed:", err);
        sendResponse({ success: true, status: "error", message: "Unable to reach Trackman — try again later" });
      }
    })();
    return true;
  }

  if (message.type === "FETCH_ACTIVITIES") {
    (async () => {
      const granted = await hasPortalPermission();
      if (!granted) {
        sendResponse({ success: false, error: "Portal permission not granted" });
        return;
      }
      try {
        let firstError: Array<{ message: string; extensions?: { code?: string } }> | undefined;
        for (const candidate of FETCH_ACTIVITIES_QUERY_CANDIDATES) {
          const result = await fetchActivitiesForCandidate(candidate);
          if (result.errors && result.errors.length > 0) {
            firstError = firstError ?? result.errors;
            continue;
          }
          sendResponse({ success: true, activities: result.activities ?? [] });
          return;
        }
        if (firstError && isAuthError(firstError)) {
          sendResponse({ success: false, error: "Session expired — log into portal.trackmangolf.com" });
        } else {
          sendResponse({ success: false, error: "Unable to fetch activities — try again later" });
        }
      } catch (err) {
        console.error("TrackPull: Fetch activities failed:", err);
        sendResponse({ success: false, error: "Unable to fetch activities — try again later" });
      }
    })();
    return true;
  }

  if (message.type === "IMPORT_SESSION") {
    const { activityId } = message as ImportSessionRequest;
    (async () => {
      const granted = await hasPortalPermission();
      if (!granted) {
        sendResponse({ success: false, error: "Portal permission not granted" });
        return;
      }
      await chrome.storage.local.set({ [STORAGE_KEYS.IMPORT_STATUS]: { state: "importing" } as ImportStatus });
      sendResponse({ success: true });

      try {
        let session: SessionData | null = null;
        for (const candidate of IMPORT_SESSION_QUERY_CANDIDATES) {
          const result = await executeQuery<{ node: GraphQLActivity }>(
            candidate.query,
            { id: activityId }
          );
          if (result.errors && result.errors.length > 0) {
            if (isAuthError(result.errors)) {
              await chrome.storage.local.set({ [STORAGE_KEYS.IMPORT_STATUS]: { state: "error", message: "Session expired — log into portal.trackmangolf.com" } as ImportStatus });
              return;
            }
            if (candidate.label === "default") {
              await chrome.storage.local.set({ [STORAGE_KEYS.IMPORT_STATUS]: { state: "error", message: "Unable to reach Trackman — try again later" } as ImportStatus });
              return;
            }
            console.warn("TrackPull: Import query candidate failed:", candidate.label, result.errors[0].message);
            continue;
          }

          const activity = result.data?.node;
          session = activity ? parsePortalActivity(activity) : null;
          if (session) break;
        }

        if (!session) {
          await chrome.storage.local.set({ [STORAGE_KEYS.IMPORT_STATUS]: { state: "error", message: "No shot data found for this activity" } as ImportStatus });
          return;
        }
        await chrome.storage.local.set({ [STORAGE_KEYS.TRACKMAN_DATA]: session });
        await saveSessionToHistory(session);
        await chrome.storage.local.set({ [STORAGE_KEYS.IMPORT_STATUS]: { state: "success" } as ImportStatus });
        console.log("TrackPull: Session imported successfully:", session.report_id);
      } catch (err) {
        console.error("TrackPull: Import failed:", err);
        await chrome.storage.local.set({ [STORAGE_KEYS.IMPORT_STATUS]: { state: "error", message: "Import failed — try again" } as ImportStatus });
      }
    })();
    return true;
  }

  // Receives pre-fetched GraphQL data from popup (fetched via content script on portal page)
  if (message.type === "SAVE_IMPORTED_SESSION") {
    const { graphqlData, graphqlPayloads } = message;
    sendResponse({ success: true });

    (async () => {
      await chrome.storage.local.set({ [STORAGE_KEYS.IMPORT_STATUS]: { state: "importing" } as ImportStatus });

      try {
        const payloads = graphqlPayloads ?? (graphqlData ? [graphqlData] : []);
        const firstError = payloads.find((payload) => payload.errors && payload.errors.length > 0)?.errors?.[0];
        const hasPayloadWithoutErrors = payloads.some((payload) => !payload.errors || payload.errors.length === 0);

        if (firstError && !hasPayloadWithoutErrors) {
          await chrome.storage.local.set({ [STORAGE_KEYS.IMPORT_STATUS]: { state: "error", message: firstError.message } as ImportStatus });
          return;
        }

        const session = parseImportedSession(payloads);
        if (!session) {
          await chrome.storage.local.set({ [STORAGE_KEYS.IMPORT_STATUS]: { state: "error", message: "No shot data found for this activity" } as ImportStatus });
          return;
        }
        await chrome.storage.local.set({ [STORAGE_KEYS.TRACKMAN_DATA]: session });
        await saveSessionToHistory(session);
        await chrome.storage.local.set({ [STORAGE_KEYS.IMPORT_STATUS]: { state: "success" } as ImportStatus });
        console.log("TrackPull: Session imported successfully:", session.report_id);
      } catch (err) {
        console.error("TrackPull: Import failed:", err);
        await chrome.storage.local.set({ [STORAGE_KEYS.IMPORT_STATUS]: { state: "error", message: "Import failed — try again" } as ImportStatus });
      }
    })();
    return false;
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
