import { beforeEach, describe, expect, it, vi } from "vitest";
import { indexedDB } from "fake-indexeddb";
import type { SessionData } from "../src/models/types";
import {
  clearBulkImportedSessions,
  getBulkImportedSessions,
  putBulkImportedSession,
} from "../src/shared/bulk_import_store";

vi.stubGlobal("indexedDB", indexedDB);

function deleteDb(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("delete blocked"));
  });
}

function makeSession(reportId: string, raw = true): SessionData {
  return {
    date: "2026-01-01",
    report_id: reportId,
    url_type: "activity",
    club_groups: [],
    raw_api_data: raw ? { large: "payload" } : undefined,
    metric_names: ["ClubSpeed"],
    metadata_params: { activity_id: `activity-${reportId}` },
  };
}

describe("bulk import IndexedDB store", () => {
  beforeEach(async () => {
    await deleteDb("trackpull-bulk-import").catch(() => undefined);
  });

  it("stores imported sessions by job and strips raw API data", async () => {
    await putBulkImportedSession("job-1", "activity-1", makeSession("report-1"), 1000);
    await putBulkImportedSession("job-1", "activity-2", makeSession("report-2"), 1100);
    await putBulkImportedSession("job-2", "activity-3", makeSession("report-3"), 1200);

    const sessions = await getBulkImportedSessions("job-1");

    expect(sessions.map((session) => session.report_id)).toEqual(["report-1", "report-2"]);
    expect(sessions[0]).not.toHaveProperty("raw_api_data");
  });

  it("deduplicates within a job by report_id", async () => {
    await putBulkImportedSession("job-1", "activity-1", makeSession("report-1"), 1000);
    await putBulkImportedSession("job-1", "activity-1b", {
      ...makeSession("report-1"),
      date: "2026-02-01",
    }, 1100);

    const sessions = await getBulkImportedSessions("job-1");

    expect(sessions).toHaveLength(1);
    expect(sessions[0].date).toBe("2026-02-01");
  });

  it("clears only the requested job", async () => {
    await putBulkImportedSession("job-1", "activity-1", makeSession("report-1"), 1000);
    await putBulkImportedSession("job-2", "activity-2", makeSession("report-2"), 1100);

    await clearBulkImportedSessions("job-1");

    expect(await getBulkImportedSessions("job-1")).toEqual([]);
    expect((await getBulkImportedSessions("job-2")).map((session) => session.report_id)).toEqual(["report-2"]);
  });
});
