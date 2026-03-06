import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SessionData } from "../src/models/types";

// Mock chrome.storage.local and chrome.runtime
let mockStore: Record<string, unknown> = {};

vi.stubGlobal("chrome", {
  storage: {
    local: {
      get: vi.fn((keys: string[], cb: (result: Record<string, unknown>) => void) => {
        const result: Record<string, unknown> = {};
        for (const key of keys) {
          if (key in mockStore) {
            result[key] = mockStore[key];
          }
        }
        cb(result);
      }),
      set: vi.fn((data: Record<string, unknown>, cb: () => void) => {
        Object.assign(mockStore, data);
        cb();
      }),
    },
  },
  runtime: {
    lastError: null as { message: string } | null,
  },
});

import { saveSessionToHistory, getHistoryErrorMessage } from "../src/shared/history";

function makeSession(reportId: string, overrides?: Partial<SessionData>): SessionData {
  return {
    date: "2026-01-01",
    report_id: reportId,
    url_type: "report",
    club_groups: [],
    raw_api_data: { huge: "payload" },
    metric_names: ["ClubSpeed"],
    metadata_params: { foo: "bar" },
    ...overrides,
  };
}

describe("saveSessionToHistory", () => {
  beforeEach(() => {
    mockStore = {};
    vi.mocked(chrome.storage.local.get).mockImplementation(
      (keys: string[], cb: (result: Record<string, unknown>) => void) => {
        const result: Record<string, unknown> = {};
        for (const key of keys) {
          if (key in mockStore) {
            result[key] = mockStore[key];
          }
        }
        cb(result);
      }
    );
    vi.mocked(chrome.storage.local.set).mockImplementation(
      (data: Record<string, unknown>, cb: () => void) => {
        Object.assign(mockStore, data);
        cb();
      }
    );
    chrome.runtime.lastError = null;
  });

  it("saves new session with raw_api_data stripped", async () => {
    const session = makeSession("report-1");
    await saveSessionToHistory(session);

    const stored = mockStore["sessionHistory"] as Array<{ snapshot: Record<string, unknown> }>;
    expect(stored).toHaveLength(1);
    expect(stored[0].snapshot.report_id).toBe("report-1");
    expect(stored[0].snapshot).not.toHaveProperty("raw_api_data");
  });

  it("deduplicates by report_id and updates captured_at", async () => {
    // Save first time
    await saveSessionToHistory(makeSession("report-dup"));
    const firstSave = mockStore["sessionHistory"] as Array<{ captured_at: number }>;
    const firstTime = firstSave[0].captured_at;

    // Small delay to ensure different timestamp
    await new Promise((r) => setTimeout(r, 5));

    // Save again with same report_id
    await saveSessionToHistory(makeSession("report-dup"));
    const secondSave = mockStore["sessionHistory"] as Array<{ captured_at: number }>;
    expect(secondSave).toHaveLength(1);
    expect(secondSave[0].captured_at).toBeGreaterThanOrEqual(firstTime);
  });

  it("evicts oldest when at 20-session cap", async () => {
    // Fill with 20 sessions
    const entries = [];
    for (let i = 0; i < 20; i++) {
      entries.push({
        captured_at: 1000 + i, // oldest = 1000, newest = 1019
        snapshot: {
          date: "2026-01-01",
          report_id: `report-${i}`,
          url_type: "report",
          club_groups: [],
          metric_names: [],
          metadata_params: {},
        },
      });
    }
    mockStore["sessionHistory"] = entries;

    // Save 21st session
    await saveSessionToHistory(makeSession("report-new"));

    const stored = mockStore["sessionHistory"] as Array<{
      captured_at: number;
      snapshot: { report_id: string };
    }>;
    expect(stored).toHaveLength(20);
    // Oldest (report-0 with captured_at 1000) should be evicted
    const ids = stored.map((e) => e.snapshot.report_id);
    expect(ids).not.toContain("report-0");
    expect(ids).toContain("report-new");
  });

  it("re-captured report_id gets newest captured_at", async () => {
    const entries = [];
    for (let i = 0; i < 5; i++) {
      entries.push({
        captured_at: 1000 + i,
        snapshot: {
          date: "2026-01-01",
          report_id: `report-${i}`,
          url_type: "report",
          club_groups: [],
          metric_names: [],
          metadata_params: {},
        },
      });
    }
    mockStore["sessionHistory"] = entries;

    // Re-capture report-0 (the oldest)
    await saveSessionToHistory(makeSession("report-0"));

    const stored = mockStore["sessionHistory"] as Array<{
      captured_at: number;
      snapshot: { report_id: string };
    }>;
    // report-0 should now have the newest captured_at (first in array since sorted desc)
    const report0 = stored.find((e) => e.snapshot.report_id === "report-0");
    expect(report0).toBeDefined();
    expect(report0!.captured_at).toBeGreaterThan(1004);
  });

  it("rejects promise on chrome.runtime.lastError", async () => {
    vi.mocked(chrome.storage.local.get).mockImplementation(
      (_keys: string[], cb: (result: Record<string, unknown>) => void) => {
        chrome.runtime.lastError = { message: "Storage error" };
        cb({});
      }
    );

    await expect(saveSessionToHistory(makeSession("report-err"))).rejects.toThrow(
      "Storage error"
    );

    // Reset lastError for other tests
    chrome.runtime.lastError = null;
  });
});

describe("getHistoryErrorMessage", () => {
  it("maps quota errors correctly", () => {
    expect(getHistoryErrorMessage("QUOTA_BYTES exceeded")).toBe(
      "Storage full -- oldest sessions will be cleared"
    );
    expect(getHistoryErrorMessage("quota limit reached")).toBe(
      "Storage full -- oldest sessions will be cleared"
    );
  });

  it("returns fallback for unknown errors", () => {
    expect(getHistoryErrorMessage("something unexpected")).toBe(
      "Could not save to session history"
    );
  });
});
