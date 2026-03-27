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
import type { ImportStatus, ActivitySummary } from "../shared/import_types";
import { FETCH_ACTIVITIES_QUERY, IMPORT_SESSION_QUERY } from "../shared/import_types";

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

function isAuthError(errors: Array<{ message: string; extensions?: { code?: string } }>): boolean {
  if (errors.length === 0) return false;
  const code = errors[0].extensions?.code ?? "";
  const msg = errors[0].message?.toLowerCase() ?? "";
  return code === "UNAUTHENTICATED" || msg.includes("unauthorized") || msg.includes("unauthenticated") || msg.includes("not logged in");
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

type RequestMessage = SaveDataRequest | ExportCsvRequest | GetDataRequest | FetchActivitiesRequest | ImportSessionRequest | PortalAuthCheckRequest;

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

  if (message.type === "PORTAL_AUTH_CHECK") {
    (async () => {
      const granted = await hasPortalPermission();
      if (!granted) {
        sendResponse({ success: true, status: "denied" });
        return;
      }
      try {
        const result = await executeQuery<{ me: { id: string } | null }>(HEALTH_CHECK_QUERY);
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
        const result = await executeQuery<{
          activities: {
            edges: Array<{
              node: { id: string; date: string; strokeCount?: number; type?: string };
            }>;
          };
        }>(FETCH_ACTIVITIES_QUERY, { first: 20 });
        if (result.errors && result.errors.length > 0) {
          if (isAuthError(result.errors)) {
            sendResponse({ success: false, error: "Session expired — log into portal.trackmangolf.com" });
          } else {
            sendResponse({ success: false, error: "Unable to fetch activities — try again later" });
          }
          return;
        }
        const activities: ActivitySummary[] =
          result.data?.activities?.edges?.map((e) => ({
            id: e.node.id,
            date: e.node.date,
            strokeCount: e.node.strokeCount ?? null,
            type: e.node.type ?? null,
          })) ?? [];
        sendResponse({ success: true, activities });
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
      // Write importing status BEFORE responding — RESIL-01: popup can close without breaking import
      await chrome.storage.local.set({ [STORAGE_KEYS.IMPORT_STATUS]: { state: "importing" } as ImportStatus });
      sendResponse({ success: true });

      // Import continues in service worker regardless of popup state
      try {
        const result = await executeQuery<{ node: GraphQLActivity }>(
          IMPORT_SESSION_QUERY,
          { id: activityId }
        );
        if (result.errors && result.errors.length > 0) {
          if (isAuthError(result.errors)) {
            await chrome.storage.local.set({ [STORAGE_KEYS.IMPORT_STATUS]: { state: "error", message: "Session expired — log into portal.trackmangolf.com" } as ImportStatus });
          } else {
            await chrome.storage.local.set({ [STORAGE_KEYS.IMPORT_STATUS]: { state: "error", message: "Unable to reach Trackman — try again later" } as ImportStatus });
          }
          return;
        }
        const activity = result.data?.node;
        const session = activity ? parsePortalActivity(activity) : null;
        if (!session) {
          // D-09: empty activity — no strokes
          await chrome.storage.local.set({ [STORAGE_KEYS.IMPORT_STATUS]: { state: "error", message: "No shot data found for this activity" } as ImportStatus });
          return;
        }
        // PIPE-02: write to TRACKMAN_DATA so all export/AI/history paths see the imported session
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
});

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === "local" && changes[STORAGE_KEYS.TRACKMAN_DATA]) {
    const newValue = changes[STORAGE_KEYS.TRACKMAN_DATA].newValue;
    chrome.runtime.sendMessage({ type: "DATA_UPDATED", data: newValue }).catch(() => {
      // Ignore errors when no popup is listening
    });
  }
});
