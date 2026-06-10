/**
 * Data models for Trackman session data.
 */

import { type MetricValue } from "../shared/unit_normalization";

export interface Shot {
  shot_number: number;
  metrics: Record<string, MetricValue>;
  tag?: string;
}

export interface ClubGroup {
  club_name: string;
  shots: Shot[];
  averages: Record<string, MetricValue>;
  consistency: Record<string, MetricValue>;
}

export interface SessionData {
  date: string;
  report_id: string;
  url_type: "report" | "activity";
  club_groups: ClubGroup[];
  raw_api_data?: unknown;
  metric_names: string[];
  metadata_params: Record<string, string>;
}

/** SessionData without raw_api_data — safe for persistent storage. */
export type SessionSnapshot = Omit<SessionData, "raw_api_data">;

/** A single entry in the session history array. */
export interface HistoryEntry {
  captured_at: number;
  snapshot: SessionSnapshot;
}

export interface CaptureInfo {
  url: string;
  status: number;
  body: unknown;
  is_api: boolean;
}
