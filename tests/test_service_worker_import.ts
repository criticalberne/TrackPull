/**
 * Tests for FETCH_ACTIVITIES and IMPORT_SESSION service worker handlers.
 * Covers all behavior cases from 24-01-PLAN.md.
 *
 * Testing approach:
 * serviceWorker.ts calls chrome.runtime.onInstalled.addListener() at module
 * evaluation time, before any beforeAll/beforeEach can run. We use vi.hoisted()
 * to inject the chrome global BEFORE vi.mock() and static imports are processed.
 * The hoisted block captures the onMessage handler so tests can invoke it directly.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.hoisted runs BEFORE vi.mock and BEFORE static imports are evaluated.
// This is the only place we can set globalThis.chrome before serviceWorker.ts loads.
const { mockStorageSet, getHandler } = vi.hoisted(() => {
  const mockStorageSet = vi.fn();
  const mockStorageGet = vi.fn();
  const mockStorageRemove = vi.fn();
  const mockRuntimeSendMessage = vi.fn();
  const mockDownload = vi.fn();

  type MsgHandler = (message: unknown, sender: unknown, sendResponse: (r: unknown) => void) => boolean | undefined;
  let _handler: MsgHandler | null = null;

  // Install chrome global before any imports run
  (globalThis as Record<string, unknown>).chrome = {
    runtime: {
      onInstalled: { addListener: vi.fn() },
      onMessage: {
        addListener: (fn: MsgHandler) => { _handler = fn; },
      },
      sendMessage: mockRuntimeSendMessage,
      lastError: undefined,
    },
    storage: {
      local: {
        get: mockStorageGet,
        set: mockStorageSet,
        remove: mockStorageRemove,
      },
      onChanged: { addListener: vi.fn() },
    },
    downloads: { download: mockDownload },
  };

  return {
    mockStorageSet,
    mockStorageGet,
    getHandler: () => {
      if (!_handler) throw new Error("onMessage handler not registered");
      return _handler;
    },
  };
});

// Module mocks — vi.mock is hoisted above static imports automatically by vitest
vi.mock("../src/shared/portalPermissions", () => ({
  hasPortalPermission: vi.fn(),
}));

vi.mock("../src/shared/graphql_client", () => ({
  executeQuery: vi.fn(),
  classifyAuthResult: vi.fn(),
  HEALTH_CHECK_QUERY: "query HealthCheck { me { __typename } }",
}));

vi.mock("../src/shared/portal_parser", () => ({
  parsePortalActivity: vi.fn(),
  extractActivityUuid: vi.fn((id: string) => id),
}));

vi.mock("../src/shared/history", () => ({
  saveSessionToHistory: vi.fn(),
  getHistoryErrorMessage: vi.fn((msg: string) => msg),
}));

// Static imports — these run after vi.hoisted and vi.mock (vitest hoisting order)
import { hasPortalPermission } from "../src/shared/portalPermissions";
import { executeQuery } from "../src/shared/graphql_client";
import { parsePortalActivity } from "../src/shared/portal_parser";
import { saveSessionToHistory } from "../src/shared/history";
import { STORAGE_KEYS } from "../src/shared/constants";
import type { ImportStatus } from "../src/shared/import_types";
import { FETCH_ACTIVITIES_QUERY, IMPORT_SESSION_QUERY } from "../src/shared/import_types";

// This import triggers serviceWorker.ts evaluation — chrome must already exist (set in vi.hoisted above)
import "../src/background/serviceWorker";

// Helper to invoke the captured message handler
function callHandler(
  message: unknown,
  sendResponse: (r: unknown) => void
): boolean | undefined {
  return getHandler()(message, {}, sendResponse);
}

// ─── import_types module ─────────────────────────────────────────────────────

describe("import_types module", () => {
  it("ImportStatus idle variant shape is valid", () => {
    const status: ImportStatus = { state: "idle" };
    expect(status.state).toBe("idle");
  });

  it("ImportStatus importing variant shape is valid", () => {
    const status: ImportStatus = { state: "importing" };
    expect(status.state).toBe("importing");
  });

  it("ImportStatus success variant shape is valid", () => {
    const status: ImportStatus = { state: "success" };
    expect(status.state).toBe("success");
  });

  it("ImportStatus error variant has message field", () => {
    const status: ImportStatus = { state: "error", message: "something went wrong" };
    expect(status.state).toBe("error");
    expect((status as Extract<ImportStatus, { state: "error" }>).message).toBe("something went wrong");
  });

  it("FETCH_ACTIVITIES_QUERY contains 'me' and 'activities'", () => {
    expect(FETCH_ACTIVITIES_QUERY).toContain("me");
    expect(FETCH_ACTIVITIES_QUERY).toContain("activities");
  });

  it("IMPORT_SESSION_QUERY contains 'node(id: $id)' and 'strokes'", () => {
    expect(IMPORT_SESSION_QUERY).toContain("node(id: $id)");
    expect(IMPORT_SESSION_QUERY).toContain("strokes");
  });
});

// ─── STORAGE_KEYS ────────────────────────────────────────────────────────────

describe("STORAGE_KEYS.IMPORT_STATUS", () => {
  it("IMPORT_STATUS key equals 'importStatus'", () => {
    expect(STORAGE_KEYS.IMPORT_STATUS).toBe("importStatus");
  });
});

// ─── FETCH_ACTIVITIES handler ────────────────────────────────────────────────

describe("FETCH_ACTIVITIES handler", () => {
  let sendResponse: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStorageSet.mockResolvedValue(undefined);
    sendResponse = vi.fn();
  });

  it("returns {success: false, error: 'Portal permission not granted'} and does not call executeQuery when permission denied", async () => {
    vi.mocked(hasPortalPermission).mockResolvedValue(false);

    const returnValue = callHandler({ type: "FETCH_ACTIVITIES" }, sendResponse);
    expect(returnValue).toBe(true);

    await vi.waitUntil(() => sendResponse.mock.calls.length > 0);
    expect(sendResponse).toHaveBeenCalledWith({ success: false, error: "Portal permission not granted" });
    expect(executeQuery).not.toHaveBeenCalled();
  });

  it("returns session-expired error when GraphQL returns UNAUTHENTICATED error code", async () => {
    vi.mocked(hasPortalPermission).mockResolvedValue(true);
    vi.mocked(executeQuery).mockResolvedValue({
      data: null,
      errors: [{ message: "Not authenticated", extensions: { code: "UNAUTHENTICATED" } }],
    });

    callHandler({ type: "FETCH_ACTIVITIES" }, sendResponse);
    await vi.waitUntil(() => sendResponse.mock.calls.length > 0);

    expect(sendResponse).toHaveBeenCalledWith({
      success: false,
      error: "Session expired — log into portal.trackmangolf.com",
    });
  });

  it("returns session-expired error when GraphQL error message contains 'unauthorized'", async () => {
    vi.mocked(hasPortalPermission).mockResolvedValue(true);
    vi.mocked(executeQuery).mockResolvedValue({
      data: null,
      errors: [{ message: "unauthorized access" }],
    });

    callHandler({ type: "FETCH_ACTIVITIES" }, sendResponse);
    await vi.waitUntil(() => sendResponse.mock.calls.length > 0);

    expect(sendResponse).toHaveBeenCalledWith({
      success: false,
      error: "Session expired — log into portal.trackmangolf.com",
    });
  });

  it("returns generic error when non-auth GraphQL error occurs", async () => {
    vi.mocked(hasPortalPermission).mockResolvedValue(true);
    vi.mocked(executeQuery).mockResolvedValue({
      data: null,
      errors: [{ message: "Some server error" }],
    });

    callHandler({ type: "FETCH_ACTIVITIES" }, sendResponse);
    await vi.waitUntil(() => sendResponse.mock.calls.length > 0);

    expect(sendResponse).toHaveBeenCalledWith({
      success: false,
      error: "Unable to fetch activities — try again later",
    });
  });

  it("returns {success: true, activities} with id, date, strokeCount, and type on success", async () => {
    vi.mocked(hasPortalPermission).mockResolvedValue(true);
    vi.mocked(executeQuery).mockResolvedValue({
      data: {
        me: {
          activities: [
            { id: "act-001", time: "2026-01-15", strokeCount: 18, kind: "Session" },
            { id: "act-002", time: "2026-01-10" },
          ],
        },
      },
    });

    callHandler({ type: "FETCH_ACTIVITIES" }, sendResponse);
    await vi.waitUntil(() => sendResponse.mock.calls.length > 0);

    expect(sendResponse).toHaveBeenCalledWith({
      success: true,
      activities: [
        { id: "act-001", date: "2026-01-15", strokeCount: 18, type: "Session" },
        { id: "act-002", date: "2026-01-10", strokeCount: null, type: null },
      ],
    });
  });

  it("returns empty activities array when data has no activities", async () => {
    vi.mocked(hasPortalPermission).mockResolvedValue(true);
    vi.mocked(executeQuery).mockResolvedValue({
      data: { me: { activities: [] } },
    });

    callHandler({ type: "FETCH_ACTIVITIES" }, sendResponse);
    await vi.waitUntil(() => sendResponse.mock.calls.length > 0);

    expect(sendResponse).toHaveBeenCalledWith({ success: true, activities: [] });
  });

  it("returns generic error on network exception", async () => {
    vi.mocked(hasPortalPermission).mockResolvedValue(true);
    vi.mocked(executeQuery).mockRejectedValue(new Error("Network failure"));

    callHandler({ type: "FETCH_ACTIVITIES" }, sendResponse);
    await vi.waitUntil(() => sendResponse.mock.calls.length > 0);

    expect(sendResponse).toHaveBeenCalledWith({
      success: false,
      error: "Unable to fetch activities — try again later",
    });
  });
});

// ─── IMPORT_SESSION handler ──────────────────────────────────────────────────

describe("IMPORT_SESSION handler", () => {
  let sendResponse: ReturnType<typeof vi.fn>;

  const mockSession = {
    report_id: "session-abc",
    date: "2026-01-15",
    club_groups: [{ club: "Driver", shots: [{ ClubSpeed: "105" }] }],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockStorageSet.mockResolvedValue(undefined);
    vi.mocked(saveSessionToHistory).mockResolvedValue(undefined);
    sendResponse = vi.fn();
  });

  it("handler returns true (async response flag)", async () => {
    vi.mocked(hasPortalPermission).mockResolvedValue(false);
    const returnValue = callHandler({ type: "IMPORT_SESSION", activityId: "act-001" }, sendResponse);
    expect(returnValue).toBe(true);
  });

  it("returns {success: false, error: 'Portal permission not granted'} and does NOT write IMPORT_STATUS when permission denied", async () => {
    vi.mocked(hasPortalPermission).mockResolvedValue(false);

    callHandler({ type: "IMPORT_SESSION", activityId: "act-001" }, sendResponse);
    await vi.waitUntil(() => sendResponse.mock.calls.length > 0);

    expect(sendResponse).toHaveBeenCalledWith({ success: false, error: "Portal permission not granted" });
    const statusWrites = mockStorageSet.mock.calls.filter((call: unknown[]) => {
      const arg = call[0] as Record<string, unknown>;
      return STORAGE_KEYS.IMPORT_STATUS in arg;
    });
    expect(statusWrites).toHaveLength(0);
  });

  it("sets IMPORT_STATUS to {state: 'importing'} BEFORE calling sendResponse (RESIL-01 order guarantee)", async () => {
    const callOrder: string[] = [];
    vi.mocked(hasPortalPermission).mockResolvedValue(true);

    mockStorageSet.mockImplementation(async () => { callOrder.push("storage.set"); });
    sendResponse.mockImplementation(() => { callOrder.push("sendResponse"); });

    vi.mocked(executeQuery).mockImplementation(async () => {
      callOrder.push("executeQuery");
      return { data: { node: { id: "act-001", date: "2026-01-15", strokeGroups: [] } } };
    });
    vi.mocked(parsePortalActivity).mockReturnValue(null);

    callHandler({ type: "IMPORT_SESSION", activityId: "act-001" }, sendResponse);

    await vi.waitUntil(() => callOrder.includes("executeQuery"));

    const firstSetIdx = callOrder.indexOf("storage.set");
    const respondIdx = callOrder.indexOf("sendResponse");
    const queryIdx = callOrder.indexOf("executeQuery");

    expect(firstSetIdx).toBeLessThan(respondIdx);
    expect(respondIdx).toBeLessThan(queryIdx);
  });

  it("calls sendResponse({success: true}) BEFORE the async GraphQL query resolves", async () => {
    let resolveQuery!: (v: unknown) => void;
    const queryPromise = new Promise((resolve) => { resolveQuery = resolve; });
    const callOrder: string[] = [];

    vi.mocked(hasPortalPermission).mockResolvedValue(true);
    mockStorageSet.mockResolvedValue(undefined);
    vi.mocked(executeQuery).mockReturnValue(queryPromise as ReturnType<typeof executeQuery>);
    sendResponse.mockImplementation(() => { callOrder.push("sendResponse"); });

    callHandler({ type: "IMPORT_SESSION", activityId: "act-001" }, sendResponse);

    await vi.waitUntil(() => sendResponse.mock.calls.length > 0);
    callOrder.push("queryPending");
    resolveQuery({ data: null });

    expect(callOrder[0]).toBe("sendResponse");
    expect(sendResponse).toHaveBeenCalledWith({ success: true });
  });

  it("on success writes session to TRACKMAN_DATA, calls saveSessionToHistory, and sets IMPORT_STATUS to success", async () => {
    vi.mocked(hasPortalPermission).mockResolvedValue(true);
    vi.mocked(executeQuery).mockResolvedValue({
      data: { node: { id: "act-001", date: "2026-01-15", strokeGroups: [] } },
    });
    vi.mocked(parsePortalActivity).mockReturnValue(mockSession as any);

    callHandler({ type: "IMPORT_SESSION", activityId: "act-001" }, sendResponse);

    await vi.waitUntil(() =>
      mockStorageSet.mock.calls.some((call: unknown[]) => {
        const status = (call[0] as Record<string, unknown>)[STORAGE_KEYS.IMPORT_STATUS] as ImportStatus | undefined;
        return status?.state === "success";
      })
    );

    expect(mockStorageSet).toHaveBeenCalledWith(
      expect.objectContaining({ [STORAGE_KEYS.TRACKMAN_DATA]: mockSession })
    );
    expect(saveSessionToHistory).toHaveBeenCalledWith(mockSession);
    expect(mockStorageSet).toHaveBeenCalledWith(
      expect.objectContaining({ [STORAGE_KEYS.IMPORT_STATUS]: { state: "success" } })
    );
  });

  it("empty activity (parsePortalActivity returns null) sets error status 'No shot data found for this activity' (D-09)", async () => {
    vi.mocked(hasPortalPermission).mockResolvedValue(true);
    vi.mocked(executeQuery).mockResolvedValue({
      data: { node: { id: "act-001", date: "2026-01-15", strokeGroups: [] } },
    });
    vi.mocked(parsePortalActivity).mockReturnValue(null);

    callHandler({ type: "IMPORT_SESSION", activityId: "act-001" }, sendResponse);

    await vi.waitUntil(() =>
      mockStorageSet.mock.calls.some((call: unknown[]) => {
        const status = (call[0] as Record<string, unknown>)[STORAGE_KEYS.IMPORT_STATUS] as ImportStatus | undefined;
        return status?.state === "error";
      })
    );

    expect(mockStorageSet).toHaveBeenCalledWith({
      [STORAGE_KEYS.IMPORT_STATUS]: { state: "error", message: "No shot data found for this activity" },
    });
    expect(saveSessionToHistory).not.toHaveBeenCalled();
  });

  it("auth error in GraphQL response sets IMPORT_STATUS error with session-expired message (D-08)", async () => {
    vi.mocked(hasPortalPermission).mockResolvedValue(true);
    vi.mocked(executeQuery).mockResolvedValue({
      data: null,
      errors: [{ message: "Unauthenticated", extensions: { code: "UNAUTHENTICATED" } }],
    });

    callHandler({ type: "IMPORT_SESSION", activityId: "act-001" }, sendResponse);

    await vi.waitUntil(() =>
      mockStorageSet.mock.calls.some((call: unknown[]) => {
        const status = (call[0] as Record<string, unknown>)[STORAGE_KEYS.IMPORT_STATUS] as ImportStatus | undefined;
        return status?.state === "error";
      })
    );

    expect(mockStorageSet).toHaveBeenCalledWith({
      [STORAGE_KEYS.IMPORT_STATUS]: {
        state: "error",
        message: "Session expired — log into portal.trackmangolf.com",
      },
    });
  });

  it("generic GraphQL server error sets IMPORT_STATUS error with 'Unable to reach Trackman' message", async () => {
    vi.mocked(hasPortalPermission).mockResolvedValue(true);
    vi.mocked(executeQuery).mockResolvedValue({
      data: null,
      errors: [{ message: "Some server error" }],
    });

    callHandler({ type: "IMPORT_SESSION", activityId: "act-001" }, sendResponse);

    await vi.waitUntil(() =>
      mockStorageSet.mock.calls.some((call: unknown[]) => {
        const status = (call[0] as Record<string, unknown>)[STORAGE_KEYS.IMPORT_STATUS] as ImportStatus | undefined;
        return status?.state === "error";
      })
    );

    expect(mockStorageSet).toHaveBeenCalledWith({
      [STORAGE_KEYS.IMPORT_STATUS]: {
        state: "error",
        message: "Unable to reach Trackman — try again later",
      },
    });
  });

  it("network exception sets IMPORT_STATUS error with 'Import failed — try again' message", async () => {
    vi.mocked(hasPortalPermission).mockResolvedValue(true);
    vi.mocked(executeQuery).mockRejectedValue(new Error("Network down"));

    callHandler({ type: "IMPORT_SESSION", activityId: "act-001" }, sendResponse);

    await vi.waitUntil(() =>
      mockStorageSet.mock.calls.some((call: unknown[]) => {
        const status = (call[0] as Record<string, unknown>)[STORAGE_KEYS.IMPORT_STATUS] as ImportStatus | undefined;
        return status?.state === "error";
      })
    );

    expect(mockStorageSet).toHaveBeenCalledWith({
      [STORAGE_KEYS.IMPORT_STATUS]: {
        state: "error",
        message: "Import failed — try again",
      },
    });
  });
});
