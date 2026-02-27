// src/models/types.ts
function mergeSessionData(baseSession, newSession) {
  const clubsMap = /* @__PURE__ */ new Map();
  for (const club of baseSession.club_groups) {
    clubsMap.set(club.club_name, { ...club });
  }
  for (const newClub of newSession.club_groups) {
    const existingClub = clubsMap.get(newClub.club_name);
    if (!existingClub) {
      clubsMap.set(newClub.club_name, { ...newClub });
    } else {
      const mergedClub = {
        ...existingClub,
        averages: { ...existingClub.averages, ...newClub.averages },
        consistency: { ...existingClub.consistency, ...newClub.consistency }
      };
      for (let i = 0; i < newClub.shots.length; i++) {
        const newShot = newClub.shots[i];
        if (i < mergedClub.shots.length) {
          mergedClub.shots[i] = {
            ...mergedClub.shots[i],
            metrics: {
              ...mergedClub.shots[i].metrics,
              ...newShot.metrics
            }
          };
        } else {
          mergedClub.shots.push({ ...newShot });
        }
      }
      clubsMap.set(newClub.club_name, mergedClub);
    }
  }
  const allMetricNames = /* @__PURE__ */ new Set();
  for (const club of clubsMap.values()) {
    for (const shot of club.shots) {
      Object.keys(shot.metrics).forEach((k) => allMetricNames.add(k));
    }
    Object.keys(club.averages).forEach((k) => allMetricNames.add(k));
    Object.keys(club.consistency).forEach((k) => allMetricNames.add(k));
  }
  const mergedSession = {
    ...baseSession,
    club_groups: Array.from(clubsMap.values()),
    metric_names: Array.from(allMetricNames).sort()
  };
  return mergedSession;
}

// src/content/interceptor.ts
var API_URL_PATTERNS = [
  "api.trackmangolf.com",
  "trackmangolf.com/api",
  "/api/",
  "/reports/",
  "/activities/",
  "/shots/",
  "graphql"
];
var METRIC_KEYS = /* @__PURE__ */ new Set([
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
  "Tempo"
]);
function containsStrokegroups(data) {
  if (!data || typeof data !== "object") return false;
  const obj = data;
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
      "measurement"
    ];
    return indicators.filter((ind) => text.includes(ind)).length >= 3;
  } catch {
    return false;
  }
}
var APIInterceptor = class {
  capturedResponses = [];
  reportJsonCaptures = {};
  dataFound = new Promise((resolve) => {
    this.resolveDataFound = resolve;
  });
  resolveDataFound;
  get captured_responses() {
    return this.capturedResponses;
  }
  async handleResponse(response) {
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
          this.resolveDataFound = void 0;
        }
      }
    } catch (e) {
    }
  }
  captureReportJson(url, status, body) {
    const isApi = API_URL_PATTERNS.some((pat) => url.includes(pat));
    if (!isApi) return;
    try {
      const parsedUrl = new URL(url);
      const cacheKey = `${parsedUrl.pathname}?${parsedUrl.search}`;
      this.reportJsonCaptures[cacheKey] = {
        url,
        status,
        body,
        is_api: true
      };
    } catch (e) {
    }
  }
  looksLikeShotData(data) {
    if (!data || typeof data !== "object") return false;
    const obj = data;
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
        "measurement"
      ];
      return indicators.filter((ind) => text.includes(ind)).length >= 3;
    } catch {
      return false;
    }
  }
  getReportJson(url) {
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
    }
    return null;
  }
  parseSessionData(url) {
    const captures = this.getReportJson(url);
    if (!captures || !containsStrokegroups(captures.body)) {
      return null;
    }
    const data = captures.body;
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
  parseAndMergeSessions(url, existingSession) {
    const captures = this.getReportJson(url);
    if (captures && containsStrokegroups(captures.body)) {
      const data = captures.body;
      try {
        const parsedUrl = new URL(captures.url);
        const session = this._parseTrackmanActivity(data, parsedUrl);
        if (session) {
          session.raw_api_data = data;
          if (existingSession && existingSession.club_groups.length > 0) {
            return mergeSessionData(existingSession, session);
          }
          return session;
        }
      } catch (error) {
        console.error("Trackman Scraper: Parsing failed:", error);
      }
    }
    return existingSession || null;
  }
  _parseTrackmanActivity(data, parsedUrl) {
    if (!("StrokeGroups" in data)) return null;
    const strokeGroups = data["StrokeGroups"];
    if (!Array.isArray(strokeGroups) || strokeGroups.length === 0) {
      return null;
    }
    let dateStr = "Unknown";
    const timeInfo = data["Time"];
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
    const session = {
      date: dateStr,
      report_id: reportId,
      url_type: urlType,
      club_groups: [],
      metric_names: [],
      metadata_params: {}
    };
    for (const [key, value] of parsedUrl.searchParams) {
      session.metadata_params[key] = value;
    }
    const allMetricNames = /* @__PURE__ */ new Set();
    for (const group of strokeGroups) {
      if (!group || typeof group !== "object") continue;
      const clubName = String(group["Club"] || "Unknown");
      const shots = [];
      const strokes = group["Strokes"];
      if (Array.isArray(strokes)) {
        for (let i = 0; i < strokes.length; i++) {
          const stroke = strokes[i];
          if (!stroke || typeof stroke !== "object") continue;
          const normalized = stroke["NormalizedMeasurement"] || {};
          const raw = stroke["Measurement"] || {};
          const merged = { ...raw };
          Object.assign(merged, normalized);
          for (const [key, value] of Object.entries(merged)) {
            if (!METRIC_KEYS.has(key)) continue;
            let numValue = null;
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
                metrics: { [key]: `${Math.round(numValue * 10) / 10}` }
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
          consistency: {}
        });
      }
    }
    session.metric_names = Array.from(allMetricNames).sort();
    return session.club_groups.length > 0 ? session : null;
  }
  _extractReportId(parsedUrl) {
    const reportId = parsedUrl.searchParams.get("r") || parsedUrl.searchParams.get("a") || parsedUrl.searchParams.get("ReportId");
    return reportId || "unknown";
  }
  _determineUrlType(parsedUrl, data) {
    if ("StrokeGroups" in data) return "activity";
    if (parsedUrl.pathname.includes("/activities/")) return "activity";
    if (parsedUrl.pathname.includes("/reports/")) return "report";
    const path = parsedUrl.pathname.toLowerCase();
    if (path.includes("activity") || path.includes("session")) {
      return "activity";
    }
    return "report";
  }
  async intercept(page, url) {
    const handler = this.handleResponse.bind(this);
    page.on("response", handler);
    try {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      await Promise.race([
        this.dataFound,
        new Promise((resolve) => setTimeout(resolve, 15e3))
      ]);
      await new Promise((resolve) => setTimeout(resolve, 1e3));
    } catch (error) {
      console.error("Trackman Scraper: Capture failed:", error);
      chrome.runtime?.sendMessage({ type: "CAPTURE_ERROR", message: "Failed to capture data from page" });
    } finally {
      page.off("response", handler);
    }
    const captures = this.getReportJson();
    return captures || null;
  }
};
console.log("Trackman Scraper interceptor loaded");
export {
  APIInterceptor
};
