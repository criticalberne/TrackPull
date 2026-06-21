import { describe, it, expect } from "vitest";
import type { ActivitySummary } from "../src/shared/import_types";
import {
  completeBulkImportJob,
  createBulkImportJob,
  failBulkImportItem,
  getBulkImportProgressLabel,
  getNextBulkImportItem,
  pauseBulkImportJob,
  recoverInterruptedBulkImportJob,
  resetFailedBulkImportItems,
  startBulkImportJob,
  updateBulkImportItem,
} from "../src/shared/bulk_import";

const activities: ActivitySummary[] = [
  {
    id: "activity-1",
    date: "2026-01-01",
    strokeCount: 24,
    type: "CoursePlayActivity",
    courseName: "Pebble Beach",
  },
  {
    id: "activity-2",
    date: "2026-01-02",
    strokeCount: null,
    type: "MapMyBagSessionActivity",
  },
  {
    id: "activity-1",
    date: "2026-01-01",
    strokeCount: 24,
    type: "CoursePlayActivity",
  },
];

describe("bulk import job state", () => {
  it("creates a deduplicated pending job from activity summaries", () => {
    const job = createBulkImportJob(activities, 1000);

    expect(job.id).toBe("bulk-rs");
    expect(job.total).toBe(2);
    expect(job.items.map((item) => item.activityId)).toEqual(["activity-1", "activity-2"]);
    expect(job.items[0].detail).toBe("Pebble Beach");
    expect(job.items[1].detail).toBe("");
    expect(job.items.every((item) => item.status === "pending")).toBe(true);
  });

  it("tracks imported and failed counts from item transitions", () => {
    let job = startBulkImportJob(createBulkImportJob(activities, 1000), 1100);
    job = updateBulkImportItem(job, "activity-1", {
      status: "imported",
      reportId: "report-1",
      shotCount: 24,
    }, 1200);
    job = failBulkImportItem(job, "activity-2", "No shot data found", 1300);

    expect(job.imported).toBe(1);
    expect(job.failed).toBe(1);
    expect(getNextBulkImportItem(job)).toBeNull();
    expect(getBulkImportProgressLabel(job)).toBe("2 / 2 | 1 imported | 1 failed");
  });

  it("recovers an interrupted running job by pausing and re-queueing importing item", () => {
    let job = startBulkImportJob(createBulkImportJob(activities, 1000), 1100);
    job = updateBulkImportItem(job, "activity-1", { status: "importing" }, 1200);

    const recovered = recoverInterruptedBulkImportJob(job, 1300);

    expect(recovered.state).toBe("paused");
    expect(recovered.currentActivityId).toBeUndefined();
    expect(recovered.items[0].status).toBe("pending");
  });

  it("resets only failed items for retry", () => {
    let job = createBulkImportJob(activities, 1000);
    job = updateBulkImportItem(job, "activity-1", { status: "imported", reportId: "report-1" }, 1100);
    job = failBulkImportItem(job, "activity-2", "Temporary failure", 1200);

    const retry = resetFailedBulkImportItems(job, 1300);

    expect(retry.imported).toBe(1);
    expect(retry.failed).toBe(0);
    expect(retry.items[0].status).toBe("imported");
    expect(retry.items[1].status).toBe("pending");
    expect(retry.items[1].error).toBeUndefined();
  });

  it("preserves imported items when pausing and completing", () => {
    let job = startBulkImportJob(createBulkImportJob(activities, 1000), 1100);
    job = updateBulkImportItem(job, "activity-1", { status: "imported", reportId: "report-1" }, 1200);
    job = pauseBulkImportJob(job, 1300);

    expect(job.state).toBe("paused");
    expect(job.imported).toBe(1);

    const complete = completeBulkImportJob(job, 1400);
    expect(complete.state).toBe("complete");
    expect(complete.imported).toBe(1);
  });
});
