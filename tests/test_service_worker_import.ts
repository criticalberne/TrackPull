/**
 * Tests for the SAVE_IMPORTED_SESSION service worker handler and the
 * import_types query/status contracts.
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
const { mockStorageSet, mockPutBulkImportedSession, getHandler } = vi.hoisted(() => {
  const mockStorageSet = vi.fn();
  const mockStorageGet = vi.fn();
  const mockStorageRemove = vi.fn();
  const mockRuntimeSendMessage = vi.fn();
  const mockDownload = vi.fn();
  const mockPutBulkImportedSession = vi.fn();

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
    mockPutBulkImportedSession,
    getHandler: () => {
      if (!_handler) throw new Error("onMessage handler not registered");
      return _handler;
    },
  };
});

// Module mocks — vi.mock is hoisted above static imports automatically by vitest
vi.mock("../src/shared/portal_parser", () => ({
  parsePortalActivity: vi.fn(),
  extractActivityUuid: vi.fn((id: string) => id),
}));

vi.mock("../src/shared/history", () => ({
  saveSessionToHistory: vi.fn(),
  getHistoryErrorMessage: vi.fn((msg: string) => msg),
}));

vi.mock("../src/shared/bulk_import_store", () => ({
  putBulkImportedSession: mockPutBulkImportedSession,
}));

// Static imports — these run after vi.hoisted and vi.mock (vitest hoisting order)
import { parsePortalActivity } from "../src/shared/portal_parser";
import { saveSessionToHistory } from "../src/shared/history";
import { putBulkImportedSession } from "../src/shared/bulk_import_store";
import { STORAGE_KEYS } from "../src/shared/constants";
import type { ImportStatus } from "../src/shared/import_types";
import {
  FETCH_ACTIVITIES_QUERY,
  IMPORT_SESSION_QUERY,
  IMPORT_SESSION_QUERY_CANDIDATES,
} from "../src/shared/import_types";

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

  it("FETCH_ACTIVITIES_QUERY requests Course Play course display names", () => {
    expect(FETCH_ACTIVITIES_QUERY).toContain("... on CoursePlayActivity");
    expect(FETCH_ACTIVITIES_QUERY).toContain("course");
    expect(FETCH_ACTIVITIES_QUERY).toContain("displayName");
  });

  it("FETCH_ACTIVITIES_QUERY filters and paginates Course Play and Map My Bag activity kinds", () => {
    expect(FETCH_ACTIVITIES_QUERY).toContain("kinds: [COURSE_PLAY, MAP_MY_BAG]");
    expect(FETCH_ACTIVITIES_QUERY).toContain("skip: $skip");
    expect(FETCH_ACTIVITIES_QUERY).toContain("take: $take");
    expect(FETCH_ACTIVITIES_QUERY).toContain("totalCount");
    expect(FETCH_ACTIVITIES_QUERY).toContain("hasNextPage");
  });

  it("IMPORT_SESSION_QUERY contains 'node(id: $id)' and 'strokes'", () => {
    expect(IMPORT_SESSION_QUERY).toContain("node(id: $id)");
    expect(IMPORT_SESSION_QUERY).toContain("strokes");
  });

  it("CoursePlayActivity fallback queries include scorecard hole shots", () => {
    const scorecardQuery = IMPORT_SESSION_QUERY_CANDIDATES.find(
      (candidate) => candidate.label === "CoursePlayActivity:scorecard.shots:NORMALIZED_MEASUREMENT"
    );
    expect(scorecardQuery?.query).toContain("scorecard");
    expect(scorecardQuery?.query).toContain("holes");
    expect(scorecardQuery?.query).toContain("shots");
    expect(scorecardQuery?.query).toContain("measurement(shotMeasurementKind: NORMALIZED_MEASUREMENT)");
  });
});

// ─── STORAGE_KEYS ────────────────────────────────────────────────────────────

describe("STORAGE_KEYS.IMPORT_STATUS", () => {
  it("IMPORT_STATUS key equals 'importStatus'", () => {
    expect(STORAGE_KEYS.IMPORT_STATUS).toBe("importStatus");
  });
});

describe("SAVE_IMPORTED_SESSION handler", () => {
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
    vi.mocked(putBulkImportedSession).mockResolvedValue(undefined);
    sendResponse = vi.fn();
  });

  it("acknowledges the popup message synchronously without holding the response channel open", async () => {
    vi.mocked(parsePortalActivity).mockReturnValue(mockSession as any);

    const returnValue = callHandler({
      type: "SAVE_IMPORTED_SESSION",
      activityId: "act-001",
      graphqlPayloads: [
        { data: { node: { id: "act-001", date: "2026-01-15", strokeGroups: [] } } },
      ],
    }, sendResponse);

    expect(returnValue).toBe(false);
    expect(sendResponse).toHaveBeenCalledWith({ success: true });

    await vi.waitUntil(() =>
      mockStorageSet.mock.calls.some((call: unknown[]) => {
        const status = (call[0] as Record<string, unknown>)[STORAGE_KEYS.IMPORT_STATUS] as ImportStatus | undefined;
        return status?.state === "success";
      })
    );

    expect(parsePortalActivity).toHaveBeenCalledWith({ id: "act-001", date: "2026-01-15", strokeGroups: [] });
    expect(mockStorageSet).toHaveBeenCalledWith(
      expect.objectContaining({ [STORAGE_KEYS.TRACKMAN_DATA]: mockSession })
    );
    expect(saveSessionToHistory).toHaveBeenCalledWith(mockSession);
  });

  it("saves a bulk imported session, archives it, and responds with item metadata", async () => {
    const bulkSession = {
      ...mockSession,
      report_id: "bulk-report-1",
      club_groups: [
        { club_name: "Driver", shots: [{ shot_number: 0, metrics: {} }, { shot_number: 1, metrics: {} }] },
      ],
    };
    vi.mocked(parsePortalActivity).mockReturnValue(bulkSession as any);

    const returnValue = callHandler({
      type: "SAVE_BULK_IMPORTED_SESSION",
      jobId: "job-1",
      activityId: "act-001",
      graphqlPayloads: [
        { data: { node: { id: "act-001", date: "2026-01-15", strokeGroups: [] } } },
      ],
    }, sendResponse);

    expect(returnValue).toBe(true);

    await vi.waitUntil(() => sendResponse.mock.calls.length > 0);

    expect(mockStorageSet).toHaveBeenCalledWith(
      expect.objectContaining({ [STORAGE_KEYS.TRACKMAN_DATA]: bulkSession })
    );
    expect(saveSessionToHistory).toHaveBeenCalledWith(bulkSession);
    expect(putBulkImportedSession).toHaveBeenCalledWith("job-1", "act-001", bulkSession);
    expect(sendResponse).toHaveBeenCalledWith({
      success: true,
      reportId: "bulk-report-1",
      shotCount: 2,
    });
  });

  it("returns a bulk import error when all GraphQL payloads have errors", async () => {
    const returnValue = callHandler({
      type: "SAVE_BULK_IMPORTED_SESSION",
      jobId: "job-1",
      activityId: "act-001",
      graphqlPayloads: [
        { errors: [{ message: "Unauthorized" }] },
      ],
    }, sendResponse);

    expect(returnValue).toBe(true);

    await vi.waitUntil(() => sendResponse.mock.calls.length > 0);

    expect(putBulkImportedSession).not.toHaveBeenCalled();
    expect(sendResponse).toHaveBeenCalledWith({
      success: false,
      error: "Unauthorized",
    });
  });
});
