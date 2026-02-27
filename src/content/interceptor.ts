/**
 * Content Script (MAIN world) for API interception on Trackman report pages.
 * Monkey-patches both window.fetch and XMLHttpRequest to capture JSON
 * responses containing shot data. After the page renders, scrapes
 * .group-tag elements from the DOM to get shot-group labels (e.g. "D1 SW").
 * Posts the tagged SessionData to the bridge via window.postMessage.
 */

import type { Shot, ClubGroup, SessionData, CaptureInfo } from "../models/types";

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
  "SpinLoft",
  "LaunchAngle",
  "LaunchDirection",
  "Carry",
  "Total",
  "Side",
  "SideTotal",
  "CarrySide",
  "TotalSide",
  "Height",
  "MaxHeight",
  "Curve",
  "LandingAngle",
  "HangTime",
  "LowPointDistance",
  "ImpactHeight",
  "ImpactOffset",
  "Tempo",
]);

function containsStrokegroups(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;

  if ("StrokeGroups" in obj && Array.isArray(obj["StrokeGroups"]) && obj["StrokeGroups"].length > 0) {
    return true;
  }

  try {
    const text = JSON.stringify(obj).toLowerCase();
    const indicators = [
      "ballspeed", "clubspeed", "carry", "spinrate",
      "strokegroups", "strokes", "measurement",
    ];
    return indicators.filter((ind) => text.includes(ind)).length >= 3;
  } catch {
    return false;
  }
}

function tryParseJson(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Parse API JSON → SessionData (no tags yet — those come from the DOM)
// ---------------------------------------------------------------------------

function parseSessionData(data: Record<string, unknown>, sourceUrl: string): SessionData | null {
  try {
    if (!("StrokeGroups" in data)) return null;

    const strokeGroups = data["StrokeGroups"];
    if (!Array.isArray(strokeGroups) || strokeGroups.length === 0) return null;

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(sourceUrl);
    } catch {
      parsedUrl = new URL("https://web-dynamic-reports.trackmangolf.com/");
    }

    let dateStr = "Unknown";
    const timeInfo = data["Time"] as Record<string, unknown>;
    if (timeInfo && typeof timeInfo.Date !== "undefined") {
      dateStr = String(timeInfo.Date);
    } else if (typeof strokeGroups[0] === "object" && strokeGroups[0]) {
      if (typeof strokeGroups[0].Date !== "undefined") {
        dateStr = String(strokeGroups[0].Date);
      }
    }

    const reportId =
      parsedUrl.searchParams.get("r") ||
      parsedUrl.searchParams.get("a") ||
      parsedUrl.searchParams.get("ReportId") ||
      "unknown";

    const session: SessionData = {
      date: dateStr,
      report_id: reportId,
      url_type: "StrokeGroups" in data ? "activity" : "report",
      club_groups: [],
      metric_names: [],
      metadata_params: {},
    };

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
          const merged = { ...raw, ...normalized };

          const shotMetrics: Record<string, string> = {};
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
              shotMetrics[key] = `${Math.round(numValue * 10) / 10}`;
            }
          }

          if (Object.keys(shotMetrics).length > 0) {
            shots.push({ shot_number: i, metrics: shotMetrics });
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
  } catch (error) {
    console.error("TrackPull: Parsing failed:", error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Scrape .group-tag elements from the rendered DOM and apply to SessionData
// ---------------------------------------------------------------------------

function scrapeGroupTags(): string[] {
  const tags: string[] = [];
  const elements = document.querySelectorAll(".group-tag");
  for (const el of Array.from(elements)) {
    const text = (el as HTMLElement).innerText?.trim() || (el as HTMLElement).textContent?.trim() || "";
    tags.push(text);
  }
  return tags;
}

function applyGroupTags(session: SessionData, tags: string[]): void {
  // Tags appear in the same order as StrokeGroups → club_groups
  for (let i = 0; i < session.club_groups.length && i < tags.length; i++) {
    const tag = tags[i];
    if (!tag) continue;
    for (const shot of session.club_groups[i].shots) {
      shot.tag = tag;
    }
  }
}

// ---------------------------------------------------------------------------
// Wait for .group-tag elements to appear, then post tagged SessionData
// ---------------------------------------------------------------------------

function postSession(session: SessionData): void {
  window.postMessage(
    {
      type: "TRACKMAN_SHOT_DATA",
      source: "trackpull-interceptor",
      data: session,
    },
    "*"
  );
  const totalShots = session.club_groups.reduce((n, g) => n + g.shots.length, 0);
  const taggedShots = session.club_groups.reduce(
    (n, g) => n + g.shots.filter(s => s.tag).length, 0
  );
  console.log("TrackPull: SessionData posted to bridge", {
    clubs: session.club_groups.length,
    metrics: session.metric_names.length,
    shots: totalShots,
    tagged: taggedShots,
  });
}

function waitForTagsThenPost(session: SessionData): void {
  const MAX_WAIT = 8000;   // max ms to wait for DOM tags
  const POLL_INTERVAL = 300;
  const expectedCount = session.club_groups.length;
  let elapsed = 0;

  function attempt(): void {
    const tags = scrapeGroupTags();

    if (tags.length >= expectedCount || elapsed >= MAX_WAIT) {
      if (tags.length > 0) {
        applyGroupTags(session, tags);
        console.log("TrackPull: Applied DOM group tags:", tags);
      } else {
        console.log("TrackPull: No .group-tag elements found in DOM, posting without tags");
      }
      postSession(session);
      return;
    }

    elapsed += POLL_INTERVAL;
    setTimeout(attempt, POLL_INTERVAL);
  }

  attempt();
}

// ---------------------------------------------------------------------------
// Intercept handler
// ---------------------------------------------------------------------------

function handleCapturedJson(body: unknown, url: string): void {
  if (!containsStrokegroups(body)) return;

  console.log("TrackPull: Shot data detected in:", url);
  const data = body as Record<string, unknown>;
  const session = parseSessionData(data, url);
  if (session) {
    // Wait for the page to render .group-tag elements, then apply and post
    waitForTagsThenPost(session);
  }
}

// ---------------------------------------------------------------------------
// Self-executing: monkey-patch both fetch and XMLHttpRequest
// ---------------------------------------------------------------------------

(function () {
  const originalFetch = window.fetch;
  window.fetch = async function (...args: Parameters<typeof fetch>): Promise<Response> {
    const response = await originalFetch.apply(this, args);
    try {
      const clone = response.clone();
      clone.text().then((text: string) => {
        const body = tryParseJson(text);
        if (body !== null) handleCapturedJson(body, response.url);
      }).catch(() => {});
    } catch {
      // Never break the original fetch
    }
    return response;
  };

  const XHRProto = XMLHttpRequest.prototype;
  const originalOpen = XHRProto.open;
  const originalSend = XHRProto.send;

  XHRProto.open = function (this: XMLHttpRequest, method: string, url: string | URL, ...rest: any[]) {
    (this as any).__trackman_url = String(url);
    return (originalOpen as any).apply(this, [method, url, ...rest]);
  };

  XHRProto.send = function (this: XMLHttpRequest, ...args: any[]) {
    this.addEventListener("load", function () {
      try {
        const text = this.responseText;
        if (!text) return;
        const body = tryParseJson(text);
        if (body !== null) {
          const url = (this as any).__trackman_url || this.responseURL || "";
          handleCapturedJson(body, url);
        }
      } catch {
        // Ignore errors
      }
    });
    return (originalSend as any).apply(this, args);
  };

  console.log("TrackPull: fetch interceptor active");
  console.log("TrackPull: XHR interceptor active");
})();
