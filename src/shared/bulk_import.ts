import type { ActivitySummary } from "./import_types";

export type BulkImportItemStatus =
  | "pending"
  | "importing"
  | "imported"
  | "failed";

export type BulkImportState =
  | "idle"
  | "running"
  | "paused"
  | "complete";

export interface BulkImportItem {
  activityId: string;
  date: string;
  type: string | null;
  detail: string;
  status: BulkImportItemStatus;
  reportId?: string;
  shotCount?: number;
  error?: string;
  updatedAt?: number;
}

export interface BulkImportJob {
  id: string;
  createdAt: number;
  updatedAt: number;
  state: BulkImportState;
  total: number;
  imported: number;
  failed: number;
  currentActivityId?: string;
  lastError?: string;
  items: BulkImportItem[];
}

export interface BulkImportSaveResult {
  reportId: string;
  shotCount: number;
}

function createJobId(now: number): string {
  return `bulk-${now.toString(36)}`;
}

function getActivityDetail(activity: ActivitySummary): string {
  if (activity.courseName?.trim()) return activity.courseName.trim();
  return activity.strokeCount === null ? "" : `${activity.strokeCount} shots`;
}

function countStatus(items: BulkImportItem[], status: BulkImportItemStatus): number {
  return items.filter((item) => item.status === status).length;
}

function recalculateJob(job: BulkImportJob, now: number): BulkImportJob {
  return {
    ...job,
    updatedAt: now,
    total: job.items.length,
    imported: countStatus(job.items, "imported"),
    failed: countStatus(job.items, "failed"),
  };
}

export function createBulkImportJob(
  activities: ActivitySummary[],
  now = Date.now()
): BulkImportJob {
  const seenIds = new Set<string>();
  const items: BulkImportItem[] = [];

  for (const activity of activities) {
    if (seenIds.has(activity.id)) continue;
    seenIds.add(activity.id);
    items.push({
      activityId: activity.id,
      date: activity.date,
      type: activity.type,
      detail: getActivityDetail(activity),
      status: "pending",
    });
  }

  return {
    id: createJobId(now),
    createdAt: now,
    updatedAt: now,
    state: "idle",
    total: items.length,
    imported: 0,
    failed: 0,
    items,
  };
}

export function startBulkImportJob(job: BulkImportJob, now = Date.now()): BulkImportJob {
  return recalculateJob({
    ...job,
    state: "running",
    lastError: undefined,
  }, now);
}

export function pauseBulkImportJob(job: BulkImportJob, now = Date.now()): BulkImportJob {
  return recalculateJob({
    ...job,
    state: "paused",
    currentActivityId: undefined,
    items: job.items.map((item) => item.status === "importing"
      ? { ...item, status: "pending", updatedAt: now }
      : item
    ),
  }, now);
}

export function completeBulkImportJob(job: BulkImportJob, now = Date.now()): BulkImportJob {
  return recalculateJob({
    ...job,
    state: "complete",
    currentActivityId: undefined,
  }, now);
}

export function recoverInterruptedBulkImportJob(
  job: BulkImportJob,
  now = Date.now()
): BulkImportJob {
  if (job.state !== "running" && !job.items.some((item) => item.status === "importing")) {
    return job;
  }

  return pauseBulkImportJob(job, now);
}

export function resetFailedBulkImportItems(
  job: BulkImportJob,
  now = Date.now()
): BulkImportJob {
  return recalculateJob({
    ...job,
    state: "idle",
    lastError: undefined,
    items: job.items.map((item) => item.status === "failed"
      ? { ...item, status: "pending", error: undefined, updatedAt: now }
      : item
    ),
  }, now);
}

export function getNextBulkImportItem(job: BulkImportJob): BulkImportItem | null {
  return job.items.find((item) => item.status === "pending") ?? null;
}

export function updateBulkImportItem(
  job: BulkImportJob,
  activityId: string,
  patch: Partial<BulkImportItem>,
  now = Date.now()
): BulkImportJob {
  const items = job.items.map((item) => item.activityId === activityId
    ? { ...item, ...patch, updatedAt: now }
    : item
  );

  const nextJob = recalculateJob({
    ...job,
    items,
    currentActivityId: patch.status === "importing" ? activityId : job.currentActivityId,
  }, now);

  if (patch.status && patch.status !== "importing" && nextJob.currentActivityId === activityId) {
    return { ...nextJob, currentActivityId: undefined };
  }

  return nextJob;
}

export function failBulkImportItem(
  job: BulkImportJob,
  activityId: string,
  error: string,
  now = Date.now()
): BulkImportJob {
  return {
    ...updateBulkImportItem(job, activityId, {
      status: "failed",
      error,
    }, now),
    lastError: error,
  };
}

export function getBulkImportCompletedCount(job: BulkImportJob): number {
  return job.imported + job.failed;
}

export function getBulkImportProgressLabel(job: BulkImportJob): string {
  const completed = getBulkImportCompletedCount(job);
  if (job.total === 0) return "No sessions selected";

  const parts = [`${completed} / ${job.total}`];
  if (job.imported > 0) parts.push(`${job.imported} imported`);
  if (job.failed > 0) parts.push(`${job.failed} failed`);
  return parts.join(" | ");
}
