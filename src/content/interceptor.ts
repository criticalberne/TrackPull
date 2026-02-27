/**
 * Content Script for API interception on Trackman report pages
 */

import type { Shot, ClubGroup, SessionData, CaptureInfo } from "../models/types";
import { mergeSessionData } from "../models/types";

type CaptureInfo = {
  url: string;
  status: number;
  body: unknown;
  is_api: boolean;
};

const API_URL_PATTERNS = [
  "api.trackmangolf.com",
  "trackmangolf.com/api",
  "/api/",
  "/reports/",
  "/activities/",
  "/shots/",
  "graphql",
];

// Metrics to extract from Trackman measurement data
const METRIC_KEYS = new Set([
  "ClubSpeed",
  "BallSpeed",
  "SmashFactor",
  "AttackAngle",
  "ClubPath",
  "FaceAngle",
  "FaceToPath",
  "SwingDirection",
  "DynamicLoft",
  "SpinRate",
  "SpinAxis",
  "Carry",
  "Total",
  "Side",
  "SideTotal",
  "Height",
  "LowPointDistance",
  "ImpactHeight",
  "ImpactOffset",
  "Tempo",
]);

function containsStrokegroups(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;

  if ("StrokeGroups" in obj) return true;

  try {
    const text = JSON.stringify(obj).toLowerCase();
    const indicators = [
      "ballspeed",
      "clubspeed",
      "carry",
      "spinrate",
      "strokegroups",
      "strokes",
      "measurement",
    ];
    return (
      indicators.filter((ind) => text.includes(ind)).length >= 3
    );
  } catch {
    return false;
  }
}

class APIInterceptor {
  private capturedResponses: CaptureInfo[] = [];
  private reportJsonCaptures: Record<string, CaptureInfo> = {};
  private dataFound = new Promise<void>((resolve) => {
    this.resolveDataFound = resolve;
  });
  private resolveDataFound?: () => void;

  get captured_responses(): CaptureInfo[] {
    return this.capturedResponses;
  }

  async handleResponse(response: Response): Promise<void> {
    const url = response.url;
    const contentType = (response.headers.get("content-type") || "").toLowerCase();

    if (!contentType.includes("json")) return;

    try {
      const body = await response.json();
      const status = response.status;
      const isApi = API_URL_PATTERNS.some((pat) => url.includes(pat));

      this.capturedResponses.push({ url, status, body, is_api: isApi });

      this.captureReportJson(url, status, body);

      if (containsStrokegroups(body)) {
        console.log("Trackman Scraper: Shot data detected in:", url);
        if (this.resolveDataFound) {
          this.resolveDataFound();
          this.resolveDataFound = undefined;
        }
      }
    } catch (e) {
      // Ignore parse errors
    }
  }

  private captureReportJson(
    url: string,
    status: number,
    body: unknown
  ): void {
    const isApi = API_URL_PATTERNS.some((pat) => url.includes(pat));
    if (!isApi) return;

    try {
      const parsedUrl = new URL(url);
      const cacheKey = `${parsedUrl.pathname}?${parsedUrl.search}`;
      this.reportJsonCaptures[cacheKey] = {
        url,
        status,
        body,
        is_api: true,
      };
    } catch (e) {
      // Ignore URL parsing errors
    }
  }

  private looksLikeShotData(data: unknown): boolean {
    if (!data || typeof data !== "object") return false;
    const obj = data as Record<string, unknown>;

    if ("StrokeGroups" in obj) return true;

    try {
      const text = JSON.stringify(obj).toLowerCase();
      const indicators = [
        "ballspeed",
        "clubspeed",
        "carry",
        "spinrate",
        "strokegroups",
        "strokes",
        "measurement",
      ];
      return (
        indicators.filter((ind) => text.includes(ind)).length >= 3
      );
    } catch {
      return false;
    }
  }

  getReportJson(url?: string): Record<string, CaptureInfo> | CaptureInfo | null {
    if (!url) {
      return this.reportJsonCaptures;
    }

    try {
      const parsedUrl = new URL(url);
      const cacheKey = `${parsedUrl.pathname}?${parsedUrl.search}`;

      if (this.reportJsonCaptures[cacheKey]) {
        return this.reportJsonCaptures[cacheKey];
      }

      const pathOnly = parsedUrl.pathname;
      for (const [key, value] of Object.entries(this.reportJsonCaptures)) {
        if (key.startsWith(pathOnly)) {
          return value;
        }
      }
    } catch {
      // Ignore URL parsing errors
    }

    return null;
  }

  public parseSessionData(url?: string): SessionData | null {
    const captures = this.getReportJson(url);
    if (!captures || !containsStrokegroups(captures.body)) {
      return null;
    }

    const data = captures.body as Record<string, unknown>;
    const parsedUrl = new URL(captures.url);

    try {
      const session = this._parseTrackmanActivity(data, parsedUrl);
      if (session) {
        session.raw_api_data = data;
      }
      return session;
    } catch (error) {
      console.error("Trackman Scraper: Parsing failed:", error);
      return null;
    }
  }

  /**
   * Parse and merge multiple API responses into a single session.
   * Handles multi-page loads where each page provides additional metric groups.
   */
  public parseAndMergeSessions(
    url?: string,
    existingSession?: SessionData | null
  ): SessionData {
    const captures = this.getReportJson(url);
    
    if (captures && containsStrokegroups(captures.body)) {
      const data = captures.body as Record<string, unknown>;
      
      try {
        const parsedUrl = new URL(captures.url);
        const session = this._parseTrackmanActivity(data, parsedUrl);
        
        if (session) {
          session.raw_api_data = data;
          
          // Merge with existing session data
          if (existingSession && existingSession.club_groups.length > 0) {
            return mergeSessionData(existingSession, session);
          }
          
          return session;
        }
      } catch (error) {
        console.error("Trackman Scraper: Parsing failed:", error);
      }
    }

    // Return existing session if no new data or parsing fails
    return existingSession || null as unknown as SessionData;
  }

  private _parseTrackmanActivity(
    data: Record<string, unknown>,
    parsedUrl: URL
  ): SessionData | null {
    if (!("StrokeGroups" in data)) return null;

    const strokeGroups = data["StrokeGroups"];
    if (!Array.isArray(strokeGroups) || strokeGroups.length === 0) {
      return null;
    }

    let dateStr = "Unknown";
    const timeInfo = data["Time"] as Record<string, unknown>;
    if (timeInfo && typeof timeInfo.Date !== "undefined") {
      dateStr = String(timeInfo.Date);
    } else if (typeof strokeGroups[0] === "object" && strokeGroups[0]) {
      const firstGroup = strokeGroups[0];
      if (firstGroup && typeof firstGroup.Date !== "undefined") {
        dateStr = String(firstGroup.Date);
      }
    }

    const reportId = this._extractReportId(parsedUrl);
    const urlType = this._determineUrlType(parsedUrl, data);

    const session: SessionData = {
      date: dateStr,
      report_id: reportId,
      url_type: urlType,
      club_groups: [],
      metric_names: [],
      metadata_params: {},
    };

    // Extract URL parameters as metadata
    for (const [key, value] of parsedUrl.searchParams) {
      session.metadata_params[key] = value;
    }

    const allMetricNames = new Set<string>();

    for (const group of strokeGroups) {
      if (!group || typeof group !== "object") continue;

      const clubName = String(group["Club"] || "Unknown");
      const shots: Shot[] = [];

      const strokes = group["Strokes"];
      if (Array.isArray(strokes)) {
        for (let i = 0; i < strokes.length; i++) {
          const stroke = strokes[i];
          if (!stroke || typeof stroke !== "object") continue;

          const normalized = (stroke["NormalizedMeasurement"] as Record<string, unknown>) || {};
          const raw = (stroke["Measurement"] as Record<string, unknown>) || {};

          const merged = { ...raw };
          Object.assign(merged, normalized);

          for (const [key, value] of Object.entries(merged)) {
            if (!METRIC_KEYS.has(key)) continue;

            let numValue: number | null = null;
            if (typeof value === "number") {
              numValue = value;
            } else if (typeof value === "string") {
              const trimmed = value.trim();
              numValue = isNaN(parseFloat(trimmed)) ? null : parseFloat(trimmed);
            }

            if (numValue !== null) {
              allMetricNames.add(key);
              shots.push({
                shot_number: i,
                metrics: { [key]: `${Math.round(numValue * 10) / 10}` },
              });
            }
          }
        }
      }

      if (shots.length > 0) {
        session.club_groups.push({
          club_name: clubName,
          shots,
          averages: {},
          consistency: {},
        });
      }
    }

    session.metric_names = Array.from(allMetricNames).sort();

    return session.club_groups.length > 0 ? session : null;
  }

  private _extractReportId(parsedUrl: URL): string {
    const reportId =
      parsedUrl.searchParams.get("r") ||
      parsedUrl.searchParams.get("a") ||
      parsedUrl.searchParams.get("ReportId");

    return reportId || "unknown";
  }

  private _determineUrlType(parsedUrl: URL, data: Record<string, unknown>): "report" | "activity" {
    if ("StrokeGroups" in data) return "activity";
    if (parsedUrl.pathname.includes("/activities/")) return "activity";
    if (parsedUrl.pathname.includes("/reports/")) return "report";

    const path = parsedUrl.pathname.toLowerCase();
    if (path.includes("activity") || path.includes("session")) {
      return "activity";
    }
    return "report";
  }

  async intercept(
    page: Page,
    url: string
  ): Promise<Record<string, CaptureInfo> | null> {
    const handler = this.handleResponse.bind(this);
    page.on("response", handler);

    try {
      await page.goto(url, { waitUntil: "domcontentloaded" });

      await Promise.race([
        this.dataFound,
        new Promise((resolve) => setTimeout(resolve, 15000)),
      ]);

      await new Promise((resolve) => setTimeout(resolve, 1000));
    } finally {
      page.off("response", handler);
    }

    const captures = this.getReportJson();
    return captures || null;
  }
}

export { APIInterceptor };

console.log("Trackman Scraper interceptor loaded");
