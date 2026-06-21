import type { SessionData, SessionSnapshot } from "../models/types";

const DB_NAME = "trackpull-bulk-import";
const DB_VERSION = 1;
const SESSION_STORE = "sessions";
const JOB_INDEX = "jobId";

export interface StoredBulkImportSession {
  key: string;
  jobId: string;
  activityId: string;
  reportId: string;
  capturedAt: number;
  snapshot: SessionSnapshot;
}

function createSnapshot(session: SessionData): SessionSnapshot {
  const { raw_api_data: _, ...snapshot } = session;
  return snapshot;
}

function getSessionKey(jobId: string, reportId: string): string {
  return `${jobId}:${reportId}`;
}

function openBulkImportDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(SESSION_STORE)) {
        const store = db.createObjectStore(SESSION_STORE, { keyPath: "key" });
        store.createIndex(JOB_INDEX, JOB_INDEX, { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open bulk import store"));
    request.onblocked = () => reject(new Error("Bulk import store is blocked by another tab"));
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Bulk import store request failed"));
  });
}

export async function putBulkImportedSession(
  jobId: string,
  activityId: string,
  session: SessionData,
  now = Date.now()
): Promise<void> {
  const db = await openBulkImportDb();
  try {
    const tx = db.transaction(SESSION_STORE, "readwrite");
    const store = tx.objectStore(SESSION_STORE);
    const record: StoredBulkImportSession = {
      key: getSessionKey(jobId, session.report_id),
      jobId,
      activityId,
      reportId: session.report_id,
      capturedAt: now,
      snapshot: createSnapshot(session),
    };
    store.put(record);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Could not save imported session"));
      tx.onabort = () => reject(tx.error ?? new Error("Could not save imported session"));
    });
  } finally {
    db.close();
  }
}

export async function getBulkImportedSessions(jobId: string): Promise<SessionSnapshot[]> {
  const db = await openBulkImportDb();
  try {
    const tx = db.transaction(SESSION_STORE, "readonly");
    const index = tx.objectStore(SESSION_STORE).index(JOB_INDEX);
    const sessions = await requestToPromise(index.getAll(jobId));
    return (sessions as StoredBulkImportSession[])
      .sort((a, b) => a.capturedAt - b.capturedAt)
      .map((record) => record.snapshot);
  } finally {
    db.close();
  }
}

export async function clearBulkImportedSessions(jobId: string): Promise<void> {
  const db = await openBulkImportDb();
  try {
    const tx = db.transaction(SESSION_STORE, "readwrite");
    const index = tx.objectStore(SESSION_STORE).index(JOB_INDEX);
    const transactionDone = new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Could not clear bulk import store"));
      tx.onabort = () => reject(tx.error ?? new Error("Could not clear bulk import store"));
    });
    const records = await requestToPromise(index.getAllKeys(jobId));
    for (const key of records) {
      tx.objectStore(SESSION_STORE).delete(key);
    }
    await transactionDone;
  } finally {
    db.close();
  }
}
