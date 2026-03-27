(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // src/shared/constants.ts
  var METRIC_DISPLAY_NAMES, STORAGE_KEYS;
  var init_constants = __esm({
    "src/shared/constants.ts"() {
      METRIC_DISPLAY_NAMES = {
        ClubSpeed: "Club Speed",
        BallSpeed: "Ball Speed",
        SmashFactor: "Smash Factor",
        AttackAngle: "Attack Angle",
        ClubPath: "Club Path",
        FaceAngle: "Face Angle",
        FaceToPath: "Face To Path",
        SwingDirection: "Swing Direction",
        DynamicLoft: "Dynamic Loft",
        SpinRate: "Spin Rate",
        SpinAxis: "Spin Axis",
        SpinLoft: "Spin Loft",
        LaunchAngle: "Launch Angle",
        LaunchDirection: "Launch Direction",
        Carry: "Carry",
        Total: "Total",
        Side: "Side",
        SideTotal: "Side Total",
        CarrySide: "Carry Side",
        TotalSide: "Total Side",
        Height: "Height",
        MaxHeight: "Max Height",
        Curve: "Curve",
        LandingAngle: "Landing Angle",
        HangTime: "Hang Time",
        LowPointDistance: "Low Point",
        ImpactHeight: "Impact Height",
        ImpactOffset: "Impact Offset",
        Tempo: "Tempo"
      };
      STORAGE_KEYS = {
        TRACKMAN_DATA: "trackmanData",
        SPEED_UNIT: "speedUnit",
        DISTANCE_UNIT: "distanceUnit",
        SELECTED_PROMPT_ID: "selectedPromptId",
        AI_SERVICE: "aiService",
        HITTING_SURFACE: "hittingSurface",
        INCLUDE_AVERAGES: "includeAverages",
        SESSION_HISTORY: "sessionHistory",
        IMPORT_STATUS: "importStatus"
      };
    }
  });

  // src/shared/unit_normalization.ts
  function migrateLegacyPref(stored) {
    switch (stored) {
      case "metric":
        return { speed: "m/s", distance: "meters" };
      case "hybrid":
        return { speed: "mph", distance: "meters" };
      case "imperial":
      default:
        return { speed: "mph", distance: "yards" };
    }
  }
  function extractUnitParams(metadataParams) {
    const result = {};
    for (const [key, value] of Object.entries(metadataParams)) {
      const match = key.match(/^nd_([a-z0-9]+)$/i);
      if (match) {
        const groupKey = match[1].toLowerCase();
        result[groupKey] = value;
      }
    }
    return result;
  }
  function getUnitSystemId(metadataParams) {
    const unitParams = extractUnitParams(metadataParams);
    return unitParams["001"] || "789012";
  }
  function getUnitSystem(metadataParams) {
    const id = getUnitSystemId(metadataParams);
    return UNIT_SYSTEMS[id] || DEFAULT_UNIT_SYSTEM;
  }
  function getApiSourceUnitSystem(metadataParams) {
    const reportSystem = getUnitSystem(metadataParams);
    return {
      id: "api",
      name: "API Source",
      distanceUnit: "meters",
      angleUnit: reportSystem.angleUnit,
      speedUnit: "m/s"
    };
  }
  function getMetricUnitLabel(metricName, unitChoice = DEFAULT_UNIT_CHOICE) {
    if (metricName in FIXED_UNIT_LABELS) return FIXED_UNIT_LABELS[metricName];
    if (SPEED_METRICS.has(metricName)) return SPEED_LABELS[unitChoice.speed];
    if (SMALL_DISTANCE_METRICS.has(metricName)) return SMALL_DISTANCE_LABELS[getSmallDistanceUnit(unitChoice)];
    if (DISTANCE_METRICS.has(metricName)) return DISTANCE_LABELS[unitChoice.distance];
    if (ANGLE_METRICS.has(metricName)) return "\xB0";
    return "";
  }
  function convertDistance(value, fromUnit, toUnit) {
    if (value === null || value === "") return value;
    const numValue = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(numValue)) return value;
    if (fromUnit === toUnit) return numValue;
    const inMeters = fromUnit === "yards" ? numValue * 0.9144 : numValue;
    return toUnit === "yards" ? inMeters / 0.9144 : inMeters;
  }
  function convertAngle(value, fromUnit, toUnit) {
    if (value === null || value === "") return value;
    const numValue = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(numValue)) return value;
    if (fromUnit === toUnit) return numValue;
    const inDegrees = fromUnit === "degrees" ? numValue : numValue * 180 / Math.PI;
    return toUnit === "degrees" ? inDegrees : inDegrees * Math.PI / 180;
  }
  function convertSpeed(value, fromUnit, toUnit) {
    if (value === null || value === "") return value;
    const numValue = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(numValue)) return value;
    if (fromUnit === toUnit) return numValue;
    let inMph;
    if (fromUnit === "mph") inMph = numValue;
    else if (fromUnit === "km/h") inMph = numValue / 1.609344;
    else inMph = numValue * 2.23694;
    if (toUnit === "mph") return inMph;
    if (toUnit === "km/h") return inMph * 1.609344;
    return inMph / 2.23694;
  }
  function getSmallDistanceUnit(unitChoice = DEFAULT_UNIT_CHOICE) {
    return unitChoice.distance === "yards" ? "inches" : "cm";
  }
  function convertSmallDistance(value, toSmallUnit) {
    if (value === null || value === "") return value;
    const numValue = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(numValue)) return value;
    return toSmallUnit === "inches" ? numValue * 39.3701 : numValue * 100;
  }
  function convertMillimeters(value) {
    if (value === null || value === "") return value;
    const numValue = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(numValue)) return value;
    return numValue * 1e3;
  }
  function normalizeMetricValue(value, metricName, reportUnitSystem, unitChoice = DEFAULT_UNIT_CHOICE) {
    const numValue = parseNumericValue(value);
    if (numValue === null) return value;
    let converted;
    if (MILLIMETER_METRICS.has(metricName)) {
      converted = convertMillimeters(numValue);
    } else if (SMALL_DISTANCE_METRICS.has(metricName)) {
      converted = convertSmallDistance(
        numValue,
        getSmallDistanceUnit(unitChoice)
      );
    } else if (DISTANCE_METRICS.has(metricName)) {
      converted = convertDistance(
        numValue,
        reportUnitSystem.distanceUnit,
        unitChoice.distance
      );
    } else if (ANGLE_METRICS.has(metricName)) {
      converted = convertAngle(
        numValue,
        reportUnitSystem.angleUnit,
        "degrees"
      );
    } else if (SPEED_METRICS.has(metricName)) {
      converted = convertSpeed(
        numValue,
        reportUnitSystem.speedUnit,
        unitChoice.speed
      );
    } else {
      converted = numValue;
    }
    if (metricName === "SpinRate") return Math.round(converted);
    if (MILLIMETER_METRICS.has(metricName)) return Math.round(converted);
    if (metricName === "SmashFactor" || metricName === "Tempo")
      return Math.round(converted * 100) / 100;
    return Math.round(converted * 10) / 10;
  }
  function parseNumericValue(value) {
    if (value === null || value === "") return null;
    if (typeof value === "number") return isNaN(value) ? null : value;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? null : parsed;
  }
  var DEFAULT_UNIT_CHOICE, UNIT_SYSTEMS, DISTANCE_METRICS, SMALL_DISTANCE_METRICS, MILLIMETER_METRICS, ANGLE_METRICS, SPEED_METRICS, DEFAULT_UNIT_SYSTEM, SPEED_LABELS, DISTANCE_LABELS, SMALL_DISTANCE_LABELS, FIXED_UNIT_LABELS;
  var init_unit_normalization = __esm({
    "src/shared/unit_normalization.ts"() {
      DEFAULT_UNIT_CHOICE = { speed: "mph", distance: "yards" };
      UNIT_SYSTEMS = {
        // Imperial (yards, degrees) - most common
        "789012": {
          id: "789012",
          name: "Imperial",
          distanceUnit: "yards",
          angleUnit: "degrees",
          speedUnit: "mph"
        },
        // Metric (meters, radians)
        "789013": {
          id: "789013",
          name: "Metric (rad)",
          distanceUnit: "meters",
          angleUnit: "radians",
          speedUnit: "km/h"
        },
        // Metric (meters, degrees) - less common
        "789014": {
          id: "789014",
          name: "Metric (deg)",
          distanceUnit: "meters",
          angleUnit: "degrees",
          speedUnit: "km/h"
        }
      };
      DISTANCE_METRICS = /* @__PURE__ */ new Set([
        "Carry",
        "Total",
        "Side",
        "SideTotal",
        "CarrySide",
        "TotalSide",
        "Height",
        "MaxHeight",
        "Curve"
      ]);
      SMALL_DISTANCE_METRICS = /* @__PURE__ */ new Set([
        "LowPointDistance"
      ]);
      MILLIMETER_METRICS = /* @__PURE__ */ new Set([
        "ImpactHeight",
        "ImpactOffset"
      ]);
      ANGLE_METRICS = /* @__PURE__ */ new Set([
        "AttackAngle",
        "ClubPath",
        "FaceAngle",
        "FaceToPath",
        "DynamicLoft",
        "LaunchAngle",
        "LaunchDirection",
        "LandingAngle"
      ]);
      SPEED_METRICS = /* @__PURE__ */ new Set([
        "ClubSpeed",
        "BallSpeed"
      ]);
      DEFAULT_UNIT_SYSTEM = UNIT_SYSTEMS["789012"];
      SPEED_LABELS = {
        "mph": "mph",
        "m/s": "m/s"
      };
      DISTANCE_LABELS = {
        "yards": "yds",
        "meters": "m"
      };
      SMALL_DISTANCE_LABELS = {
        "inches": "in",
        "cm": "cm"
      };
      FIXED_UNIT_LABELS = {
        SpinRate: "rpm",
        HangTime: "s",
        Tempo: "s",
        ImpactHeight: "mm",
        ImpactOffset: "mm"
      };
    }
  });

  // src/shared/csv_writer.ts
  function getDisplayName(metric) {
    return METRIC_DISPLAY_NAMES[metric] ?? metric;
  }
  function getColumnName(metric, unitChoice) {
    const displayName = getDisplayName(metric);
    const unitLabel = getMetricUnitLabel(metric, unitChoice);
    return unitLabel ? `${displayName} (${unitLabel})` : displayName;
  }
  function orderMetricsByPriority(allMetrics, priorityOrder) {
    const result = [];
    const seen = /* @__PURE__ */ new Set();
    for (const metric of priorityOrder) {
      if (allMetrics.includes(metric) && !seen.has(metric)) {
        result.push(metric);
        seen.add(metric);
      }
    }
    for (const metric of allMetrics) {
      if (!seen.has(metric)) {
        result.push(metric);
      }
    }
    return result;
  }
  function hasTags(session) {
    return session.club_groups.some(
      (club) => club.shots.some((shot) => shot.tag !== void 0 && shot.tag !== "")
    );
  }
  function writeCsv(session, includeAverages = true, metricOrder, unitChoice = DEFAULT_UNIT_CHOICE, hittingSurface) {
    const orderedMetrics = orderMetricsByPriority(
      session.metric_names,
      metricOrder ?? METRIC_COLUMN_ORDER
    );
    const headerRow = ["Date", "Club"];
    if (hasTags(session)) {
      headerRow.push("Tag");
    }
    headerRow.push("Shot #", "Type");
    for (const metric of orderedMetrics) {
      headerRow.push(getColumnName(metric, unitChoice));
    }
    const rows = [];
    const unitSystem = getApiSourceUnitSystem(session.metadata_params);
    for (const club of session.club_groups) {
      for (const shot of club.shots) {
        const row = {
          Date: session.date,
          Club: club.club_name,
          "Shot #": String(shot.shot_number + 1),
          Type: "Shot"
        };
        if (hasTags(session)) {
          row.Tag = shot.tag ?? "";
        }
        for (const metric of orderedMetrics) {
          const colName = getColumnName(metric, unitChoice);
          const rawValue = shot.metrics[metric] ?? "";
          if (typeof rawValue === "string" || typeof rawValue === "number") {
            row[colName] = String(normalizeMetricValue(rawValue, metric, unitSystem, unitChoice));
          } else {
            row[colName] = "";
          }
        }
        rows.push(row);
      }
      if (includeAverages) {
        const tagGroups = /* @__PURE__ */ new Map();
        for (const shot of club.shots) {
          const tag = shot.tag ?? "";
          if (!tagGroups.has(tag)) tagGroups.set(tag, []);
          tagGroups.get(tag).push(shot);
        }
        for (const [tag, shots] of tagGroups) {
          if (shots.length < 2) continue;
          const avgRow = {
            Date: session.date,
            Club: club.club_name,
            "Shot #": "",
            Type: "Average"
          };
          if (hasTags(session)) {
            avgRow.Tag = tag;
          }
          for (const metric of orderedMetrics) {
            const colName = getColumnName(metric, unitChoice);
            const values = shots.map((s) => s.metrics[metric]).filter((v) => v !== void 0 && v !== "").map((v) => parseFloat(String(v)));
            const numericValues = values.filter((v) => !isNaN(v));
            if (numericValues.length > 0) {
              const avg = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
              const rounded = metric === "SmashFactor" || metric === "Tempo" ? Math.round(avg * 100) / 100 : Math.round(avg * 10) / 10;
              avgRow[colName] = String(normalizeMetricValue(rounded, metric, unitSystem, unitChoice));
            } else {
              avgRow[colName] = "";
            }
          }
          rows.push(avgRow);
        }
      }
    }
    const lines = [];
    if (hittingSurface !== void 0) {
      lines.push(`Hitting Surface: ${hittingSurface}`);
    }
    lines.push(headerRow.join(","));
    for (const row of rows) {
      lines.push(
        headerRow.map((col) => {
          const value = row[col] ?? "";
          if (value.includes(",") || value.includes('"') || value.includes("\n")) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(",")
      );
    }
    return lines.join("\n");
  }
  var METRIC_COLUMN_ORDER;
  var init_csv_writer = __esm({
    "src/shared/csv_writer.ts"() {
      init_unit_normalization();
      init_constants();
      METRIC_COLUMN_ORDER = [
        // Speed & Efficiency
        "ClubSpeed",
        "BallSpeed",
        "SmashFactor",
        // Club Delivery
        "AttackAngle",
        "ClubPath",
        "FaceAngle",
        "FaceToPath",
        "SwingDirection",
        "DynamicLoft",
        // Launch & Spin
        "LaunchAngle",
        "LaunchDirection",
        "SpinRate",
        "SpinAxis",
        "SpinLoft",
        // Distance
        "Carry",
        "Total",
        // Dispersion
        "Side",
        "SideTotal",
        "CarrySide",
        "TotalSide",
        "Curve",
        // Ball Flight
        "Height",
        "MaxHeight",
        "LandingAngle",
        "HangTime",
        // Impact
        "LowPointDistance",
        "ImpactHeight",
        "ImpactOffset",
        // Other
        "Tempo"
      ];
    }
  });

  // src/shared/history.ts
  function createSnapshot(session) {
    const { raw_api_data: _, ...snapshot } = session;
    return snapshot;
  }
  function saveSessionToHistory(session) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(
        [STORAGE_KEYS.SESSION_HISTORY],
        (result) => {
          if (chrome.runtime.lastError) {
            return reject(new Error(chrome.runtime.lastError.message));
          }
          const existing = result[STORAGE_KEYS.SESSION_HISTORY] ?? [];
          const filtered = existing.filter(
            (entry) => entry.snapshot.report_id !== session.report_id
          );
          const newEntry = {
            captured_at: Date.now(),
            snapshot: createSnapshot(session)
          };
          filtered.push(newEntry);
          filtered.sort((a, b) => b.captured_at - a.captured_at);
          const capped = filtered.slice(0, MAX_SESSIONS);
          chrome.storage.local.set(
            { [STORAGE_KEYS.SESSION_HISTORY]: capped },
            () => {
              if (chrome.runtime.lastError) {
                return reject(new Error(chrome.runtime.lastError.message));
              }
              resolve();
            }
          );
        }
      );
    });
  }
  function getHistoryErrorMessage(error) {
    if (/QUOTA_BYTES|quota/i.test(error)) {
      return "Storage full -- oldest sessions will be cleared";
    }
    return "Could not save to session history";
  }
  var MAX_SESSIONS;
  var init_history = __esm({
    "src/shared/history.ts"() {
      init_constants();
      MAX_SESSIONS = 20;
    }
  });

  // src/shared/portalPermissions.ts
  async function hasPortalPermission() {
    return chrome.permissions.contains({ origins: [...PORTAL_ORIGINS] });
  }
  var PORTAL_ORIGINS;
  var init_portalPermissions = __esm({
    "src/shared/portalPermissions.ts"() {
      PORTAL_ORIGINS = [
        "https://api.trackmangolf.com/*",
        "https://portal.trackmangolf.com/*"
      ];
    }
  });

  // src/shared/graphql_client.ts
  async function executeQuery(query, variables) {
    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables })
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "(no body)");
      console.error(`TrackPull: GraphQL ${response.status} response:`, body);
      throw new Error(`HTTP ${response.status}: ${body.slice(0, 200)}`);
    }
    return response.json();
  }
  function classifyAuthResult(result) {
    if (result.errors && result.errors.length > 0) {
      const code = result.errors[0].extensions?.code ?? "";
      const msg = result.errors[0].message ?? "";
      const msgLower = msg.toLowerCase();
      if (code === "UNAUTHENTICATED" || msgLower.includes("unauthorized") || msgLower.includes("unauthenticated") || msgLower.includes("not logged in")) {
        return { kind: "unauthenticated" };
      }
      return { kind: "error", message: "Unable to reach Trackman \u2014 try again later" };
    }
    if (!result.data?.me?.__typename) {
      return { kind: "unauthenticated" };
    }
    return { kind: "authenticated" };
  }
  var GRAPHQL_ENDPOINT, HEALTH_CHECK_QUERY;
  var init_graphql_client = __esm({
    "src/shared/graphql_client.ts"() {
      GRAPHQL_ENDPOINT = "https://api.trackmangolf.com/graphql";
      HEALTH_CHECK_QUERY = `query HealthCheck { me { __typename } }`;
    }
  });

  // src/shared/portal_parser.ts
  function toPascalCase(key) {
    return key.charAt(0).toUpperCase() + key.slice(1);
  }
  function normalizeMetricKey(graphqlKey) {
    return GRAPHQL_METRIC_ALIAS[graphqlKey] ?? toPascalCase(graphqlKey);
  }
  function extractActivityUuid(base64Id) {
    try {
      const decoded = atob(base64Id);
      const parts = decoded.split("\n");
      const uuid = parts[1]?.trim();
      if (!uuid) return base64Id;
      return uuid;
    } catch {
      return base64Id;
    }
  }
  function parsePortalActivity(activity) {
    try {
      if (!activity?.id) return null;
      const reportId = extractActivityUuid(activity.id);
      const date = activity.time ?? "Unknown";
      const allMetricNames = /* @__PURE__ */ new Set();
      const clubMap = /* @__PURE__ */ new Map();
      for (const stroke of activity.strokes ?? []) {
        if (!stroke?.measurement) continue;
        const clubName = stroke.club || "Unknown";
        const shotMetrics = {};
        for (const [key, value] of Object.entries(stroke.measurement)) {
          if (value === null || value === void 0) continue;
          const numValue = typeof value === "number" ? value : parseFloat(String(value));
          if (isNaN(numValue)) continue;
          const normalizedKey = normalizeMetricKey(key);
          shotMetrics[normalizedKey] = `${numValue}`;
          allMetricNames.add(normalizedKey);
        }
        if (Object.keys(shotMetrics).length > 0) {
          const shots = clubMap.get(clubName) ?? [];
          shots.push({
            shot_number: shots.length + 1,
            metrics: shotMetrics
          });
          clubMap.set(clubName, shots);
        }
      }
      if (clubMap.size === 0) return null;
      const club_groups = [];
      for (const [clubName, shots] of clubMap) {
        club_groups.push({
          club_name: clubName,
          shots,
          averages: {},
          consistency: {}
        });
      }
      const session = {
        date,
        report_id: reportId,
        url_type: "activity",
        club_groups,
        metric_names: Array.from(allMetricNames).sort(),
        metadata_params: { activity_id: activity.id }
      };
      return session;
    } catch (err) {
      console.error("[portal_parser] Failed to parse activity:", err);
      return null;
    }
  }
  var GRAPHQL_METRIC_ALIAS;
  var init_portal_parser = __esm({
    "src/shared/portal_parser.ts"() {
      GRAPHQL_METRIC_ALIAS = {
        clubSpeed: "ClubSpeed",
        ballSpeed: "BallSpeed",
        smashFactor: "SmashFactor",
        attackAngle: "AttackAngle",
        clubPath: "ClubPath",
        faceAngle: "FaceAngle",
        faceToPath: "FaceToPath",
        swingDirection: "SwingDirection",
        swingPlane: "SwingPlane",
        dynamicLoft: "DynamicLoft",
        spinRate: "SpinRate",
        spinAxis: "SpinAxis",
        spinLoft: "SpinLoft",
        launchAngle: "LaunchAngle",
        launchDirection: "LaunchDirection",
        carry: "Carry",
        total: "Total",
        side: "Side",
        sideTotal: "SideTotal",
        carrySide: "CarrySide",
        totalSide: "TotalSide",
        height: "Height",
        maxHeight: "MaxHeight",
        curve: "Curve",
        landingAngle: "LandingAngle",
        hangTime: "HangTime",
        lowPointDistance: "LowPointDistance",
        impactHeight: "ImpactHeight",
        impactOffset: "ImpactOffset",
        tempo: "Tempo"
      };
    }
  });

  // src/shared/import_types.ts
  var FETCH_ACTIVITIES_QUERY, IMPORT_SESSION_QUERY;
  var init_import_types = __esm({
    "src/shared/import_types.ts"() {
      FETCH_ACTIVITIES_QUERY = `
  query GetPlayerActivities {
    me {
      activities {
        id
        time
        strokeCount
        kind
      }
    }
  }
`;
      IMPORT_SESSION_QUERY = `
  query FetchActivityById($id: ID!) {
    node(id: $id) {
      ... on SessionActivity {
        id
        time
        strokeCount
        strokes {
          club
          time
          targetDistance
          measurement {
            clubSpeed ballSpeed smashFactor attackAngle clubPath faceAngle
            faceToPath swingDirection swingPlane dynamicLoft spinRate spinAxis spinLoft
            launchAngle launchDirection carry total carrySide totalSide
            maxHeight landingAngle hangTime
          }
        }
      }
    }
  }
`;
    }
  });

  // src/background/serviceWorker.ts
  var require_serviceWorker = __commonJS({
    "src/background/serviceWorker.ts"() {
      init_constants();
      init_csv_writer();
      init_unit_normalization();
      init_history();
      init_portalPermissions();
      init_graphql_client();
      init_portal_parser();
      init_import_types();
      chrome.runtime.onInstalled.addListener(() => {
        console.log("TrackPull extension installed");
      });
      function isAuthError(errors) {
        if (errors.length === 0) return false;
        const code = errors[0].extensions?.code ?? "";
        const msg = errors[0].message?.toLowerCase() ?? "";
        return code === "UNAUTHENTICATED" || msg.includes("unauthorized") || msg.includes("unauthenticated") || msg.includes("not logged in");
      }
      function getDownloadErrorMessage(originalError) {
        if (originalError.includes("invalid")) {
          return "Invalid download format";
        }
        if (originalError.includes("quota") || originalError.includes("space")) {
          return "Insufficient storage space";
        }
        if (originalError.includes("blocked") || originalError.includes("policy")) {
          return "Download blocked by browser settings";
        }
        return originalError;
      }
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === "GET_DATA") {
          chrome.storage.local.get([STORAGE_KEYS.TRACKMAN_DATA], (result) => {
            sendResponse(result[STORAGE_KEYS.TRACKMAN_DATA] || null);
          });
          return true;
        }
        if (message.type === "SAVE_DATA") {
          const sessionData = message.data;
          chrome.storage.local.set({ [STORAGE_KEYS.TRACKMAN_DATA]: sessionData }, () => {
            if (chrome.runtime.lastError) {
              console.error("TrackPull: Failed to save data:", chrome.runtime.lastError);
              sendResponse({ success: false, error: chrome.runtime.lastError.message });
            } else {
              console.log("TrackPull: Session data saved to storage");
              sendResponse({ success: true });
              saveSessionToHistory(sessionData).catch((err) => {
                console.error("TrackPull: History save failed:", err);
                const msg = getHistoryErrorMessage(err.message);
                chrome.runtime.sendMessage({ type: "HISTORY_ERROR", error: msg }).catch(() => {
                });
              });
            }
          });
          return true;
        }
        if (message.type === "EXPORT_CSV_REQUEST") {
          chrome.storage.local.get([STORAGE_KEYS.TRACKMAN_DATA, STORAGE_KEYS.SPEED_UNIT, STORAGE_KEYS.DISTANCE_UNIT, STORAGE_KEYS.HITTING_SURFACE, STORAGE_KEYS.INCLUDE_AVERAGES, "unitPreference"], (result) => {
            const data = result[STORAGE_KEYS.TRACKMAN_DATA];
            if (!data || !data.club_groups || data.club_groups.length === 0) {
              sendResponse({ success: false, error: "No data to export" });
              return;
            }
            try {
              let unitChoice;
              if (result[STORAGE_KEYS.SPEED_UNIT] && result[STORAGE_KEYS.DISTANCE_UNIT]) {
                unitChoice = {
                  speed: result[STORAGE_KEYS.SPEED_UNIT],
                  distance: result[STORAGE_KEYS.DISTANCE_UNIT]
                };
              } else {
                unitChoice = migrateLegacyPref(result["unitPreference"]);
              }
              const surface = result[STORAGE_KEYS.HITTING_SURFACE] ?? "Mat";
              const includeAverages = result[STORAGE_KEYS.INCLUDE_AVERAGES] === void 0 ? true : Boolean(result[STORAGE_KEYS.INCLUDE_AVERAGES]);
              const csvContent = writeCsv(data, includeAverages, void 0, unitChoice, surface);
              const rawDate = data.date || "unknown";
              const safeDate = rawDate.replace(/[:.]/g, "-").replace(/[/\\?%*|"<>]/g, "");
              const filename = `ShotData_${safeDate}.csv`;
              chrome.downloads.download(
                {
                  url: `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`,
                  filename,
                  saveAs: false
                },
                (downloadId) => {
                  if (chrome.runtime.lastError) {
                    console.error("TrackPull: Download failed:", chrome.runtime.lastError);
                    const errorMessage = getDownloadErrorMessage(chrome.runtime.lastError.message);
                    sendResponse({ success: false, error: errorMessage });
                  } else {
                    console.log(`TrackPull: CSV exported with download ID ${downloadId}`);
                    sendResponse({ success: true, downloadId, filename });
                  }
                }
              );
            } catch (error) {
              console.error("TrackPull: CSV generation failed:", error);
              sendResponse({ success: false, error: error instanceof Error ? error.message : String(error) });
            }
          });
          return true;
        }
        if (message.type === "PORTAL_AUTH_CHECK") {
          (async () => {
            const granted = await hasPortalPermission();
            if (!granted) {
              sendResponse({ success: true, status: "denied" });
              return;
            }
            try {
              const result = await executeQuery(HEALTH_CHECK_QUERY);
              const authStatus = classifyAuthResult(result);
              if (authStatus.kind === "error") {
                console.error("TrackPull: GraphQL health check error:", authStatus.message);
              }
              sendResponse({
                success: true,
                status: authStatus.kind,
                message: authStatus.kind === "error" ? authStatus.message : void 0
              });
            } catch (err) {
              console.error("TrackPull: GraphQL health check failed:", err);
              sendResponse({ success: true, status: "error", message: "Unable to reach Trackman \u2014 try again later" });
            }
          })();
          return true;
        }
        if (message.type === "FETCH_ACTIVITIES") {
          (async () => {
            const granted = await hasPortalPermission();
            if (!granted) {
              sendResponse({ success: false, error: "Portal permission not granted" });
              return;
            }
            try {
              const result = await executeQuery(FETCH_ACTIVITIES_QUERY);
              if (result.errors && result.errors.length > 0) {
                if (isAuthError(result.errors)) {
                  sendResponse({ success: false, error: "Session expired \u2014 log into portal.trackmangolf.com" });
                } else {
                  sendResponse({ success: false, error: "Unable to fetch activities \u2014 try again later" });
                }
                return;
              }
              const rawActivities = result.data?.me?.activities ?? [];
              const activities = rawActivities.slice(0, 20).map((a) => ({
                id: a.id,
                date: a.time,
                strokeCount: a.strokeCount ?? null,
                type: a.kind ?? null
              }));
              sendResponse({ success: true, activities });
            } catch (err) {
              console.error("TrackPull: Fetch activities failed:", err);
              sendResponse({ success: false, error: "Unable to fetch activities \u2014 try again later" });
            }
          })();
          return true;
        }
        if (message.type === "IMPORT_SESSION") {
          const { activityId } = message;
          (async () => {
            const granted = await hasPortalPermission();
            if (!granted) {
              sendResponse({ success: false, error: "Portal permission not granted" });
              return;
            }
            await chrome.storage.local.set({ [STORAGE_KEYS.IMPORT_STATUS]: { state: "importing" } });
            sendResponse({ success: true });
            try {
              const result = await executeQuery(
                IMPORT_SESSION_QUERY,
                { id: activityId }
              );
              if (result.errors && result.errors.length > 0) {
                if (isAuthError(result.errors)) {
                  await chrome.storage.local.set({ [STORAGE_KEYS.IMPORT_STATUS]: { state: "error", message: "Session expired \u2014 log into portal.trackmangolf.com" } });
                } else {
                  await chrome.storage.local.set({ [STORAGE_KEYS.IMPORT_STATUS]: { state: "error", message: "Unable to reach Trackman \u2014 try again later" } });
                }
                return;
              }
              const activity = result.data?.node;
              const session = activity ? parsePortalActivity(activity) : null;
              if (!session) {
                await chrome.storage.local.set({ [STORAGE_KEYS.IMPORT_STATUS]: { state: "error", message: "No shot data found for this activity" } });
                return;
              }
              await chrome.storage.local.set({ [STORAGE_KEYS.TRACKMAN_DATA]: session });
              await saveSessionToHistory(session);
              await chrome.storage.local.set({ [STORAGE_KEYS.IMPORT_STATUS]: { state: "success" } });
              console.log("TrackPull: Session imported successfully:", session.report_id);
            } catch (err) {
              console.error("TrackPull: Import failed:", err);
              await chrome.storage.local.set({ [STORAGE_KEYS.IMPORT_STATUS]: { state: "error", message: "Import failed \u2014 try again" } });
            }
          })();
          return true;
        }
        if (message.type === "SAVE_IMPORTED_SESSION") {
          const { graphqlData } = message;
          (async () => {
            await chrome.storage.local.set({ [STORAGE_KEYS.IMPORT_STATUS]: { state: "importing" } });
            try {
              if (graphqlData.errors && graphqlData.errors.length > 0) {
                await chrome.storage.local.set({ [STORAGE_KEYS.IMPORT_STATUS]: { state: "error", message: graphqlData.errors[0].message } });
                return;
              }
              const activity = graphqlData.data?.node;
              const session = activity ? parsePortalActivity(activity) : null;
              if (!session) {
                await chrome.storage.local.set({ [STORAGE_KEYS.IMPORT_STATUS]: { state: "error", message: "No shot data found for this activity" } });
                return;
              }
              await chrome.storage.local.set({ [STORAGE_KEYS.TRACKMAN_DATA]: session });
              await saveSessionToHistory(session);
              await chrome.storage.local.set({ [STORAGE_KEYS.IMPORT_STATUS]: { state: "success" } });
              console.log("TrackPull: Session imported successfully:", session.report_id);
            } catch (err) {
              console.error("TrackPull: Import failed:", err);
              await chrome.storage.local.set({ [STORAGE_KEYS.IMPORT_STATUS]: { state: "error", message: "Import failed \u2014 try again" } });
            }
          })();
          return true;
        }
      });
      chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === "local" && changes[STORAGE_KEYS.TRACKMAN_DATA]) {
          const newValue = changes[STORAGE_KEYS.TRACKMAN_DATA].newValue;
          chrome.runtime.sendMessage({ type: "DATA_UPDATED", data: newValue }).catch(() => {
          });
        }
      });
    }
  });
  require_serviceWorker();
})();
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL3NoYXJlZC9jb25zdGFudHMudHMiLCAiLi4vc3JjL3NoYXJlZC91bml0X25vcm1hbGl6YXRpb24udHMiLCAiLi4vc3JjL3NoYXJlZC9jc3Zfd3JpdGVyLnRzIiwgIi4uL3NyYy9zaGFyZWQvaGlzdG9yeS50cyIsICIuLi9zcmMvc2hhcmVkL3BvcnRhbFBlcm1pc3Npb25zLnRzIiwgIi4uL3NyYy9zaGFyZWQvZ3JhcGhxbF9jbGllbnQudHMiLCAiLi4vc3JjL3NoYXJlZC9wb3J0YWxfcGFyc2VyLnRzIiwgIi4uL3NyYy9zaGFyZWQvaW1wb3J0X3R5cGVzLnRzIiwgIi4uL3NyYy9iYWNrZ3JvdW5kL3NlcnZpY2VXb3JrZXIudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbIi8qKlxuICogU2hhcmVkIGNvbnN0YW50cyBpbmNsdWRpbmcgQ1NTIHNlbGVjdG9ycyBhbmQgY29uZmlndXJhdGlvbi5cbiAqIEJhc2VkIG9uIFB5dGhvbiBzY3JhcGVyIGNvbnN0YW50cy5weSBpbXBsZW1lbnRhdGlvbi5cbiAqL1xuXG4vLyBDb21wbGV0ZSBsaXN0IG9mIGFsbCBrbm93biBUcmFja21hbiBtZXRyaWNzIChVUkwgcGFyYW1ldGVyIG5hbWVzKVxuZXhwb3J0IGNvbnN0IEFMTF9NRVRSSUNTID0gW1xuICBcIkNsdWJTcGVlZFwiLFxuICBcIkJhbGxTcGVlZFwiLFxuICBcIlNtYXNoRmFjdG9yXCIsXG4gIFwiQXR0YWNrQW5nbGVcIixcbiAgXCJDbHViUGF0aFwiLFxuICBcIkZhY2VBbmdsZVwiLFxuICBcIkZhY2VUb1BhdGhcIixcbiAgXCJTd2luZ0RpcmVjdGlvblwiLFxuICBcIkR5bmFtaWNMb2Z0XCIsXG4gIFwiU3BpblJhdGVcIixcbiAgXCJTcGluQXhpc1wiLFxuICBcIlNwaW5Mb2Z0XCIsXG4gIFwiTGF1bmNoQW5nbGVcIixcbiAgXCJMYXVuY2hEaXJlY3Rpb25cIixcbiAgXCJDYXJyeVwiLFxuICBcIlRvdGFsXCIsXG4gIFwiU2lkZVwiLFxuICBcIlNpZGVUb3RhbFwiLFxuICBcIkNhcnJ5U2lkZVwiLFxuICBcIlRvdGFsU2lkZVwiLFxuICBcIkhlaWdodFwiLFxuICBcIk1heEhlaWdodFwiLFxuICBcIkN1cnZlXCIsXG4gIFwiTGFuZGluZ0FuZ2xlXCIsXG4gIFwiSGFuZ1RpbWVcIixcbiAgXCJMb3dQb2ludERpc3RhbmNlXCIsXG4gIFwiSW1wYWN0SGVpZ2h0XCIsXG4gIFwiSW1wYWN0T2Zmc2V0XCIsXG4gIFwiVGVtcG9cIixcbl0gYXMgY29uc3Q7XG5cbi8vIE1ldHJpY3Mgc3BsaXQgaW50byBncm91cHMgZm9yIG11bHRpLXBhZ2UtbG9hZCBIVE1MIGZhbGxiYWNrXG5leHBvcnQgY29uc3QgTUVUUklDX0dST1VQUyA9IFtcbiAgW1xuICAgIFwiQ2x1YlNwZWVkXCIsXG4gICAgXCJCYWxsU3BlZWRcIixcbiAgICBcIlNtYXNoRmFjdG9yXCIsXG4gICAgXCJBdHRhY2tBbmdsZVwiLFxuICAgIFwiQ2x1YlBhdGhcIixcbiAgICBcIkZhY2VBbmdsZVwiLFxuICAgIFwiRmFjZVRvUGF0aFwiLFxuICAgIFwiU3dpbmdEaXJlY3Rpb25cIixcbiAgICBcIkR5bmFtaWNMb2Z0XCIsXG4gICAgXCJTcGluTG9mdFwiLFxuICBdLFxuICBbXG4gICAgXCJTcGluUmF0ZVwiLFxuICAgIFwiU3BpbkF4aXNcIixcbiAgICBcIkxhdW5jaEFuZ2xlXCIsXG4gICAgXCJMYXVuY2hEaXJlY3Rpb25cIixcbiAgICBcIkNhcnJ5XCIsXG4gICAgXCJUb3RhbFwiLFxuICAgIFwiU2lkZVwiLFxuICAgIFwiU2lkZVRvdGFsXCIsXG4gICAgXCJDYXJyeVNpZGVcIixcbiAgICBcIlRvdGFsU2lkZVwiLFxuICAgIFwiSGVpZ2h0XCIsXG4gICAgXCJNYXhIZWlnaHRcIixcbiAgICBcIkN1cnZlXCIsXG4gICAgXCJMYW5kaW5nQW5nbGVcIixcbiAgICBcIkhhbmdUaW1lXCIsXG4gICAgXCJMb3dQb2ludERpc3RhbmNlXCIsXG4gICAgXCJJbXBhY3RIZWlnaHRcIixcbiAgICBcIkltcGFjdE9mZnNldFwiLFxuICAgIFwiVGVtcG9cIixcbiAgXSxcbl0gYXMgY29uc3Q7XG5cbi8vIERpc3BsYXkgbmFtZXM6IFVSTCBwYXJhbSBuYW1lIC0+IGh1bWFuLXJlYWRhYmxlIENTViBoZWFkZXJcbmV4cG9ydCBjb25zdCBNRVRSSUNfRElTUExBWV9OQU1FUzogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcbiAgQ2x1YlNwZWVkOiBcIkNsdWIgU3BlZWRcIixcbiAgQmFsbFNwZWVkOiBcIkJhbGwgU3BlZWRcIixcbiAgU21hc2hGYWN0b3I6IFwiU21hc2ggRmFjdG9yXCIsXG4gIEF0dGFja0FuZ2xlOiBcIkF0dGFjayBBbmdsZVwiLFxuICBDbHViUGF0aDogXCJDbHViIFBhdGhcIixcbiAgRmFjZUFuZ2xlOiBcIkZhY2UgQW5nbGVcIixcbiAgRmFjZVRvUGF0aDogXCJGYWNlIFRvIFBhdGhcIixcbiAgU3dpbmdEaXJlY3Rpb246IFwiU3dpbmcgRGlyZWN0aW9uXCIsXG4gIER5bmFtaWNMb2Z0OiBcIkR5bmFtaWMgTG9mdFwiLFxuICBTcGluUmF0ZTogXCJTcGluIFJhdGVcIixcbiAgU3BpbkF4aXM6IFwiU3BpbiBBeGlzXCIsXG4gIFNwaW5Mb2Z0OiBcIlNwaW4gTG9mdFwiLFxuICBMYXVuY2hBbmdsZTogXCJMYXVuY2ggQW5nbGVcIixcbiAgTGF1bmNoRGlyZWN0aW9uOiBcIkxhdW5jaCBEaXJlY3Rpb25cIixcbiAgQ2Fycnk6IFwiQ2FycnlcIixcbiAgVG90YWw6IFwiVG90YWxcIixcbiAgU2lkZTogXCJTaWRlXCIsXG4gIFNpZGVUb3RhbDogXCJTaWRlIFRvdGFsXCIsXG4gIENhcnJ5U2lkZTogXCJDYXJyeSBTaWRlXCIsXG4gIFRvdGFsU2lkZTogXCJUb3RhbCBTaWRlXCIsXG4gIEhlaWdodDogXCJIZWlnaHRcIixcbiAgTWF4SGVpZ2h0OiBcIk1heCBIZWlnaHRcIixcbiAgQ3VydmU6IFwiQ3VydmVcIixcbiAgTGFuZGluZ0FuZ2xlOiBcIkxhbmRpbmcgQW5nbGVcIixcbiAgSGFuZ1RpbWU6IFwiSGFuZyBUaW1lXCIsXG4gIExvd1BvaW50RGlzdGFuY2U6IFwiTG93IFBvaW50XCIsXG4gIEltcGFjdEhlaWdodDogXCJJbXBhY3QgSGVpZ2h0XCIsXG4gIEltcGFjdE9mZnNldDogXCJJbXBhY3QgT2Zmc2V0XCIsXG4gIFRlbXBvOiBcIlRlbXBvXCIsXG59O1xuXG4vLyBDU1MgY2xhc3Mgc2VsZWN0b3JzIChmcm9tIFRyYWNrbWFuJ3MgcmVuZGVyZWQgSFRNTClcbmV4cG9ydCBjb25zdCBDU1NfREFURSA9IFwiZGF0ZVwiO1xuZXhwb3J0IGNvbnN0IENTU19SRVNVTFRTX1dSQVBQRVIgPSBcInBsYXllci1hbmQtcmVzdWx0cy10YWJsZS13cmFwcGVyXCI7XG5leHBvcnQgY29uc3QgQ1NTX1JFU1VMVFNfVEFCTEUgPSBcIlJlc3VsdHNUYWJsZVwiO1xuZXhwb3J0IGNvbnN0IENTU19DTFVCX1RBRyA9IFwiZ3JvdXAtdGFnXCI7XG5leHBvcnQgY29uc3QgQ1NTX1BBUkFNX05BTUVTX1JPVyA9IFwicGFyYW1ldGVyLW5hbWVzLXJvd1wiO1xuZXhwb3J0IGNvbnN0IENTU19QQVJBTV9OQU1FID0gXCJwYXJhbWV0ZXItbmFtZVwiO1xuZXhwb3J0IGNvbnN0IENTU19TSE9UX0RFVEFJTF9ST1cgPSBcInJvdy13aXRoLXNob3QtZGV0YWlsc1wiO1xuZXhwb3J0IGNvbnN0IENTU19BVkVSQUdFX1ZBTFVFUyA9IFwiYXZlcmFnZS12YWx1ZXNcIjtcbmV4cG9ydCBjb25zdCBDU1NfQ09OU0lTVEVOQ1lfVkFMVUVTID0gXCJjb25zaXN0ZW5jeS12YWx1ZXNcIjtcblxuLy8gQVBJIFVSTCBwYXR0ZXJucyB0aGF0IGxpa2VseSBpbmRpY2F0ZSBhbiBBUEkgZGF0YSByZXNwb25zZVxuZXhwb3J0IGNvbnN0IEFQSV9VUkxfUEFUVEVSTlMgPSBbXG4gIFwiYXBpLnRyYWNrbWFuZ29sZi5jb21cIixcbiAgXCJ0cmFja21hbmdvbGYuY29tL2FwaVwiLFxuICBcIi9hcGkvXCIsXG4gIFwiL3JlcG9ydHMvXCIsXG4gIFwiL2FjdGl2aXRpZXMvXCIsXG4gIFwiL3Nob3RzL1wiLFxuICBcImdyYXBocWxcIixcbl07XG5cbi8vIFRpbWVvdXRzIChtaWxsaXNlY29uZHMpXG5leHBvcnQgY29uc3QgUEFHRV9MT0FEX1RJTUVPVVQgPSAzMF8wMDA7XG5leHBvcnQgY29uc3QgREFUQV9MT0FEX1RJTUVPVVQgPSAxNV8wMDA7XG5cbi8vIFRyYWNrbWFuIGJhc2UgVVJMXG5leHBvcnQgY29uc3QgQkFTRV9VUkwgPSBcImh0dHBzOi8vd2ViLWR5bmFtaWMtcmVwb3J0cy50cmFja21hbmdvbGYuY29tL1wiO1xuXG4vLyBDdXN0b20gcHJvbXB0IHN0b3JhZ2Uga2V5c1xuZXhwb3J0IGNvbnN0IENVU1RPTV9QUk9NUFRfS0VZX1BSRUZJWCA9IFwiY3VzdG9tUHJvbXB0X1wiIGFzIGNvbnN0O1xuZXhwb3J0IGNvbnN0IENVU1RPTV9QUk9NUFRfSURTX0tFWSA9IFwiY3VzdG9tUHJvbXB0SWRzXCIgYXMgY29uc3Q7XG5cbi8vIFN0b3JhZ2Uga2V5cyBmb3IgQ2hyb21lIGV4dGVuc2lvbiAoYWxpZ25lZCBiZXR3ZWVuIGJhY2tncm91bmQgYW5kIHBvcHVwKVxuZXhwb3J0IGNvbnN0IFNUT1JBR0VfS0VZUyA9IHtcbiAgVFJBQ0tNQU5fREFUQTogXCJ0cmFja21hbkRhdGFcIixcbiAgU1BFRURfVU5JVDogXCJzcGVlZFVuaXRcIixcbiAgRElTVEFOQ0VfVU5JVDogXCJkaXN0YW5jZVVuaXRcIixcbiAgU0VMRUNURURfUFJPTVBUX0lEOiBcInNlbGVjdGVkUHJvbXB0SWRcIixcbiAgQUlfU0VSVklDRTogXCJhaVNlcnZpY2VcIixcbiAgSElUVElOR19TVVJGQUNFOiBcImhpdHRpbmdTdXJmYWNlXCIsXG4gIElOQ0xVREVfQVZFUkFHRVM6IFwiaW5jbHVkZUF2ZXJhZ2VzXCIsXG4gIFNFU1NJT05fSElTVE9SWTogXCJzZXNzaW9uSGlzdG9yeVwiLFxuICBJTVBPUlRfU1RBVFVTOiBcImltcG9ydFN0YXR1c1wiLFxufSBhcyBjb25zdDtcbiIsICIvKipcbiAqIFVuaXQgbm9ybWFsaXphdGlvbiB1dGlsaXRpZXMgZm9yIFRyYWNrbWFuIG1lYXN1cmVtZW50cy5cbiAqIFxuICogVHJhY2ttYW4gdXNlcyBuZF8qIHBhcmFtZXRlcnMgdG8gc3BlY2lmeSB1bml0czpcbiAqIC0gbmRfMDAxLCBuZF8wMDIsIGV0Yy4gZGVmaW5lIHVuaXQgc3lzdGVtcyBmb3IgZGlmZmVyZW50IG1lYXN1cmVtZW50IGdyb3Vwc1xuICogLSBDb21tb24gdmFsdWVzOiA3ODkwMTIgPSB5YXJkcy9kZWdyZWVzLCA3ODkwMTMgPSBtZXRlcnMvcmFkaWFuc1xuICovXG5cbmV4cG9ydCB0eXBlIFVuaXRTeXN0ZW1JZCA9IFwiNzg5MDEyXCIgfCBcIjc4OTAxM1wiIHwgXCI3ODkwMTRcIiB8IHN0cmluZztcblxuZXhwb3J0IHR5cGUgU3BlZWRVbml0ID0gXCJtcGhcIiB8IFwibS9zXCI7XG5leHBvcnQgdHlwZSBEaXN0YW5jZVVuaXQgPSBcInlhcmRzXCIgfCBcIm1ldGVyc1wiO1xuZXhwb3J0IHR5cGUgU21hbGxEaXN0YW5jZVVuaXQgPSBcImluY2hlc1wiIHwgXCJjbVwiO1xuZXhwb3J0IGludGVyZmFjZSBVbml0Q2hvaWNlIHsgc3BlZWQ6IFNwZWVkVW5pdDsgZGlzdGFuY2U6IERpc3RhbmNlVW5pdCB9XG5leHBvcnQgY29uc3QgREVGQVVMVF9VTklUX0NIT0lDRTogVW5pdENob2ljZSA9IHsgc3BlZWQ6IFwibXBoXCIsIGRpc3RhbmNlOiBcInlhcmRzXCIgfTtcblxuLyoqXG4gKiBUcmFja21hbiB1bml0IHN5c3RlbSBkZWZpbml0aW9ucy5cbiAqIE1hcHMgbmRfKiBwYXJhbWV0ZXIgdmFsdWVzIHRvIGFjdHVhbCB1bml0cyBmb3IgZWFjaCBtZXRyaWMuXG4gKi9cbmV4cG9ydCBjb25zdCBVTklUX1NZU1RFTVM6IFJlY29yZDxVbml0U3lzdGVtSWQsIFVuaXRTeXN0ZW0+ID0ge1xuICAvLyBJbXBlcmlhbCAoeWFyZHMsIGRlZ3JlZXMpIC0gbW9zdCBjb21tb25cbiAgXCI3ODkwMTJcIjoge1xuICAgIGlkOiBcIjc4OTAxMlwiLFxuICAgIG5hbWU6IFwiSW1wZXJpYWxcIixcbiAgICBkaXN0YW5jZVVuaXQ6IFwieWFyZHNcIixcbiAgICBhbmdsZVVuaXQ6IFwiZGVncmVlc1wiLFxuICAgIHNwZWVkVW5pdDogXCJtcGhcIixcbiAgfSxcbiAgLy8gTWV0cmljIChtZXRlcnMsIHJhZGlhbnMpXG4gIFwiNzg5MDEzXCI6IHtcbiAgICBpZDogXCI3ODkwMTNcIixcbiAgICBuYW1lOiBcIk1ldHJpYyAocmFkKVwiLFxuICAgIGRpc3RhbmNlVW5pdDogXCJtZXRlcnNcIixcbiAgICBhbmdsZVVuaXQ6IFwicmFkaWFuc1wiLFxuICAgIHNwZWVkVW5pdDogXCJrbS9oXCIsXG4gIH0sXG4gIC8vIE1ldHJpYyAobWV0ZXJzLCBkZWdyZWVzKSAtIGxlc3MgY29tbW9uXG4gIFwiNzg5MDE0XCI6IHtcbiAgICBpZDogXCI3ODkwMTRcIixcbiAgICBuYW1lOiBcIk1ldHJpYyAoZGVnKVwiLFxuICAgIGRpc3RhbmNlVW5pdDogXCJtZXRlcnNcIixcbiAgICBhbmdsZVVuaXQ6IFwiZGVncmVlc1wiLFxuICAgIHNwZWVkVW5pdDogXCJrbS9oXCIsXG4gIH0sXG59O1xuXG4vKipcbiAqIFVuaXQgc3lzdGVtIGNvbmZpZ3VyYXRpb24uXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVW5pdFN5c3RlbSB7XG4gIGlkOiBVbml0U3lzdGVtSWQ7XG4gIG5hbWU6IHN0cmluZztcbiAgZGlzdGFuY2VVbml0OiBcInlhcmRzXCIgfCBcIm1ldGVyc1wiO1xuICBhbmdsZVVuaXQ6IFwiZGVncmVlc1wiIHwgXCJyYWRpYW5zXCI7XG4gIHNwZWVkVW5pdDogXCJtcGhcIiB8IFwia20vaFwiIHwgXCJtL3NcIjtcbn1cblxuLyoqXG4gKiBNZXRyaWNzIHRoYXQgdXNlIGRpc3RhbmNlIHVuaXRzLlxuICovXG5leHBvcnQgY29uc3QgRElTVEFOQ0VfTUVUUklDUyA9IG5ldyBTZXQoW1xuICBcIkNhcnJ5XCIsXG4gIFwiVG90YWxcIixcbiAgXCJTaWRlXCIsXG4gIFwiU2lkZVRvdGFsXCIsXG4gIFwiQ2FycnlTaWRlXCIsXG4gIFwiVG90YWxTaWRlXCIsXG4gIFwiSGVpZ2h0XCIsXG4gIFwiTWF4SGVpZ2h0XCIsXG4gIFwiQ3VydmVcIixcbl0pO1xuXG4vKipcbiAqIE1ldHJpY3MgdGhhdCB1c2Ugc21hbGwgZGlzdGFuY2UgdW5pdHMgKGluY2hlcy9jbSkuXG4gKiBUaGVzZSB2YWx1ZXMgY29tZSBmcm9tIHRoZSBBUEkgaW4gbWV0ZXJzIGJ1dCBhcmUgdG9vIHNtYWxsIGZvciB5YXJkcy9tZXRlcnMuXG4gKi9cbmV4cG9ydCBjb25zdCBTTUFMTF9ESVNUQU5DRV9NRVRSSUNTID0gbmV3IFNldChbXG4gIFwiTG93UG9pbnREaXN0YW5jZVwiLFxuXSk7XG5cbi8qKlxuICogVHJhY2ttYW4gaW1wYWN0IGxvY2F0aW9uIG1ldHJpY3MgYXJlIGFsd2F5cyBkaXNwbGF5ZWQgaW4gbWlsbGltZXRlcnMuXG4gKiBUaGUgQVBJIHJldHVybnMgdGhlc2UgdmFsdWVzIGluIG1ldGVycy5cbiAqL1xuZXhwb3J0IGNvbnN0IE1JTExJTUVURVJfTUVUUklDUyA9IG5ldyBTZXQoW1xuICBcIkltcGFjdEhlaWdodFwiLFxuICBcIkltcGFjdE9mZnNldFwiLFxuXSk7XG5cbi8qKlxuICogTWV0cmljcyB0aGF0IHVzZSBhbmdsZSB1bml0cy5cbiAqL1xuZXhwb3J0IGNvbnN0IEFOR0xFX01FVFJJQ1MgPSBuZXcgU2V0KFtcbiAgXCJBdHRhY2tBbmdsZVwiLFxuICBcIkNsdWJQYXRoXCIsXG4gIFwiRmFjZUFuZ2xlXCIsXG4gIFwiRmFjZVRvUGF0aFwiLFxuICBcIkR5bmFtaWNMb2Z0XCIsXG4gIFwiTGF1bmNoQW5nbGVcIixcbiAgXCJMYXVuY2hEaXJlY3Rpb25cIixcbiAgXCJMYW5kaW5nQW5nbGVcIixcbl0pO1xuXG4vKipcbiAqIE1ldHJpY3MgdGhhdCB1c2Ugc3BlZWQgdW5pdHMuXG4gKi9cbmV4cG9ydCBjb25zdCBTUEVFRF9NRVRSSUNTID0gbmV3IFNldChbXG4gIFwiQ2x1YlNwZWVkXCIsXG4gIFwiQmFsbFNwZWVkXCIsXG5dKTtcblxuLyoqXG4gKiBEZWZhdWx0IHVuaXQgc3lzdGVtIChJbXBlcmlhbCAtIHlhcmRzL2RlZ3JlZXMpLlxuICovXG5leHBvcnQgY29uc3QgREVGQVVMVF9VTklUX1NZU1RFTTogVW5pdFN5c3RlbSA9IFVOSVRfU1lTVEVNU1tcIjc4OTAxMlwiXTtcblxuLyoqXG4gKiBTcGVlZCB1bml0IGRpc3BsYXkgbGFiZWxzIGZvciBDU1YgaGVhZGVycy5cbiAqL1xuZXhwb3J0IGNvbnN0IFNQRUVEX0xBQkVMUzogUmVjb3JkPFNwZWVkVW5pdCwgc3RyaW5nPiA9IHtcbiAgXCJtcGhcIjogXCJtcGhcIixcbiAgXCJtL3NcIjogXCJtL3NcIixcbn07XG5cbi8qKlxuICogRGlzdGFuY2UgdW5pdCBkaXNwbGF5IGxhYmVscyBmb3IgQ1NWIGhlYWRlcnMuXG4gKi9cbmV4cG9ydCBjb25zdCBESVNUQU5DRV9MQUJFTFM6IFJlY29yZDxEaXN0YW5jZVVuaXQsIHN0cmluZz4gPSB7XG4gIFwieWFyZHNcIjogXCJ5ZHNcIixcbiAgXCJtZXRlcnNcIjogXCJtXCIsXG59O1xuXG4vKipcbiAqIFNtYWxsIGRpc3RhbmNlIHVuaXQgZGlzcGxheSBsYWJlbHMgZm9yIENTViBoZWFkZXJzLlxuICovXG5leHBvcnQgY29uc3QgU01BTExfRElTVEFOQ0VfTEFCRUxTOiBSZWNvcmQ8U21hbGxEaXN0YW5jZVVuaXQsIHN0cmluZz4gPSB7XG4gIFwiaW5jaGVzXCI6IFwiaW5cIixcbiAgXCJjbVwiOiBcImNtXCIsXG59O1xuXG4vKipcbiAqIE1pZ3JhdGUgYSBsZWdhY3kgdW5pdFByZWZlcmVuY2Ugc3RyaW5nIHRvIGEgVW5pdENob2ljZSBvYmplY3QuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtaWdyYXRlTGVnYWN5UHJlZihzdG9yZWQ6IHN0cmluZyB8IHVuZGVmaW5lZCk6IFVuaXRDaG9pY2Uge1xuICBzd2l0Y2ggKHN0b3JlZCkge1xuICAgIGNhc2UgXCJtZXRyaWNcIjpcbiAgICAgIHJldHVybiB7IHNwZWVkOiBcIm0vc1wiLCBkaXN0YW5jZTogXCJtZXRlcnNcIiB9O1xuICAgIGNhc2UgXCJoeWJyaWRcIjpcbiAgICAgIHJldHVybiB7IHNwZWVkOiBcIm1waFwiLCBkaXN0YW5jZTogXCJtZXRlcnNcIiB9O1xuICAgIGNhc2UgXCJpbXBlcmlhbFwiOlxuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4geyBzcGVlZDogXCJtcGhcIiwgZGlzdGFuY2U6IFwieWFyZHNcIiB9O1xuICB9XG59XG5cbi8qKlxuICogRml4ZWQgdW5pdCBsYWJlbHMgZm9yIG1ldHJpY3Mgd2hvc2UgdW5pdHMgZG9uJ3QgdmFyeSBieSBwcmVmZXJlbmNlLlxuICovXG5leHBvcnQgY29uc3QgRklYRURfVU5JVF9MQUJFTFM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XG4gIFNwaW5SYXRlOiBcInJwbVwiLFxuICBIYW5nVGltZTogXCJzXCIsXG4gIFRlbXBvOiBcInNcIixcbiAgSW1wYWN0SGVpZ2h0OiBcIm1tXCIsXG4gIEltcGFjdE9mZnNldDogXCJtbVwiLFxufTtcblxuLyoqXG4gKiBFeHRyYWN0IG5kXyogcGFyYW1ldGVycyBmcm9tIG1ldGFkYXRhX3BhcmFtcy5cbiAqIFxuICogQHBhcmFtIG1ldGFkYXRhUGFyYW1zIC0gVGhlIG1ldGFkYXRhX3BhcmFtcyBvYmplY3QgZnJvbSBTZXNzaW9uRGF0YVxuICogQHJldHVybnMgT2JqZWN0IG1hcHBpbmcgbWV0cmljIGdyb3VwIElEcyB0byB1bml0IHN5c3RlbSBJRHNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV4dHJhY3RVbml0UGFyYW1zKFxuICBtZXRhZGF0YVBhcmFtczogUmVjb3JkPHN0cmluZywgc3RyaW5nPlxuKTogUmVjb3JkPHN0cmluZywgVW5pdFN5c3RlbUlkPiB7XG4gIGNvbnN0IHJlc3VsdDogUmVjb3JkPHN0cmluZywgVW5pdFN5c3RlbUlkPiA9IHt9O1xuXG4gIGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKG1ldGFkYXRhUGFyYW1zKSkge1xuICAgIGNvbnN0IG1hdGNoID0ga2V5Lm1hdGNoKC9ebmRfKFthLXowLTldKykkL2kpO1xuICAgIGlmIChtYXRjaCkge1xuICAgICAgY29uc3QgZ3JvdXBLZXkgPSBtYXRjaFsxXS50b0xvd2VyQ2FzZSgpO1xuICAgICAgcmVzdWx0W2dyb3VwS2V5XSA9IHZhbHVlIGFzIFVuaXRTeXN0ZW1JZDtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufVxuXG4vKipcbiAqIERldGVybWluZSB0aGUgdW5pdCBzeXN0ZW0gSUQgZnJvbSBtZXRhZGF0YSBwYXJhbXMuXG4gKiBVc2VzIG5kXzAwMSBhcyBwcmltYXJ5LCBmYWxscyBiYWNrIHRvIGRlZmF1bHQuXG4gKiBcbiAqIEBwYXJhbSBtZXRhZGF0YVBhcmFtcyAtIFRoZSBtZXRhZGF0YV9wYXJhbXMgb2JqZWN0XG4gKiBAcmV0dXJucyBUaGUgdW5pdCBzeXN0ZW0gSUQgc3RyaW5nXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRVbml0U3lzdGVtSWQoXG4gIG1ldGFkYXRhUGFyYW1zOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+XG4pOiBVbml0U3lzdGVtSWQge1xuICBjb25zdCB1bml0UGFyYW1zID0gZXh0cmFjdFVuaXRQYXJhbXMobWV0YWRhdGFQYXJhbXMpO1xuICByZXR1cm4gdW5pdFBhcmFtc1tcIjAwMVwiXSB8fCBcIjc4OTAxMlwiOyAvLyBEZWZhdWx0IHRvIEltcGVyaWFsXG59XG5cbi8qKlxuICogR2V0IHRoZSBmdWxsIHVuaXQgc3lzdGVtIGNvbmZpZ3VyYXRpb24uXG4gKiBcbiAqIEBwYXJhbSBtZXRhZGF0YVBhcmFtcyAtIFRoZSBtZXRhZGF0YV9wYXJhbXMgb2JqZWN0XG4gKiBAcmV0dXJucyBUaGUgVW5pdFN5c3RlbSBjb25maWd1cmF0aW9uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRVbml0U3lzdGVtKFxuICBtZXRhZGF0YVBhcmFtczogUmVjb3JkPHN0cmluZywgc3RyaW5nPlxuKTogVW5pdFN5c3RlbSB7XG4gIGNvbnN0IGlkID0gZ2V0VW5pdFN5c3RlbUlkKG1ldGFkYXRhUGFyYW1zKTtcbiAgcmV0dXJuIFVOSVRfU1lTVEVNU1tpZF0gfHwgREVGQVVMVF9VTklUX1NZU1RFTTtcbn1cblxuLyoqXG4gKiBHZXQgdGhlIHVuaXQgc3lzdGVtIHJlcHJlc2VudGluZyB3aGF0IHRoZSBBUEkgYWN0dWFsbHkgcmV0dXJucy5cbiAqIFRoZSBBUEkgYWx3YXlzIHJldHVybnMgc3BlZWQgaW4gbS9zIGFuZCBkaXN0YW5jZSBpbiBtZXRlcnMsXG4gKiBidXQgdGhlIGFuZ2xlIHVuaXQgZGVwZW5kcyBvbiB0aGUgcmVwb3J0J3MgbmRfMDAxIHBhcmFtZXRlci5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEFwaVNvdXJjZVVuaXRTeXN0ZW0oXG4gIG1ldGFkYXRhUGFyYW1zOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+XG4pOiBVbml0U3lzdGVtIHtcbiAgY29uc3QgcmVwb3J0U3lzdGVtID0gZ2V0VW5pdFN5c3RlbShtZXRhZGF0YVBhcmFtcyk7XG4gIHJldHVybiB7XG4gICAgaWQ6IFwiYXBpXCIgYXMgVW5pdFN5c3RlbUlkLFxuICAgIG5hbWU6IFwiQVBJIFNvdXJjZVwiLFxuICAgIGRpc3RhbmNlVW5pdDogXCJtZXRlcnNcIixcbiAgICBhbmdsZVVuaXQ6IHJlcG9ydFN5c3RlbS5hbmdsZVVuaXQsXG4gICAgc3BlZWRVbml0OiBcIm0vc1wiLFxuICB9O1xufVxuXG4vKipcbiAqIEdldCB0aGUgdW5pdCBsYWJlbCBmb3IgYSBtZXRyaWMgYmFzZWQgb24gdXNlcidzIHVuaXQgY2hvaWNlLlxuICogUmV0dXJucyBlbXB0eSBzdHJpbmcgZm9yIGRpbWVuc2lvbmxlc3MgbWV0cmljcyAoZS5nLiBTbWFzaEZhY3RvciwgU3BpblJhdGUpLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0TWV0cmljVW5pdExhYmVsKFxuICBtZXRyaWNOYW1lOiBzdHJpbmcsXG4gIHVuaXRDaG9pY2U6IFVuaXRDaG9pY2UgPSBERUZBVUxUX1VOSVRfQ0hPSUNFXG4pOiBzdHJpbmcge1xuICBpZiAobWV0cmljTmFtZSBpbiBGSVhFRF9VTklUX0xBQkVMUykgcmV0dXJuIEZJWEVEX1VOSVRfTEFCRUxTW21ldHJpY05hbWVdO1xuICBpZiAoU1BFRURfTUVUUklDUy5oYXMobWV0cmljTmFtZSkpIHJldHVybiBTUEVFRF9MQUJFTFNbdW5pdENob2ljZS5zcGVlZF07XG4gIGlmIChTTUFMTF9ESVNUQU5DRV9NRVRSSUNTLmhhcyhtZXRyaWNOYW1lKSkgcmV0dXJuIFNNQUxMX0RJU1RBTkNFX0xBQkVMU1tnZXRTbWFsbERpc3RhbmNlVW5pdCh1bml0Q2hvaWNlKV07XG4gIGlmIChESVNUQU5DRV9NRVRSSUNTLmhhcyhtZXRyaWNOYW1lKSkgcmV0dXJuIERJU1RBTkNFX0xBQkVMU1t1bml0Q2hvaWNlLmRpc3RhbmNlXTtcbiAgaWYgKEFOR0xFX01FVFJJQ1MuaGFzKG1ldHJpY05hbWUpKSByZXR1cm4gXCJcdTAwQjBcIjtcbiAgcmV0dXJuIFwiXCI7XG59XG5cbi8qKlxuICogQ29udmVydCBhIGRpc3RhbmNlIHZhbHVlIGJldHdlZW4gdW5pdHMuXG4gKiBcbiAqIEBwYXJhbSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byBjb252ZXJ0XG4gKiBAcGFyYW0gZnJvbVVuaXQgLSBTb3VyY2UgdW5pdCAoXCJ5YXJkc1wiIG9yIFwibWV0ZXJzXCIpXG4gKiBAcGFyYW0gdG9Vbml0IC0gVGFyZ2V0IHVuaXQgKFwieWFyZHNcIiBvciBcIm1ldGVyc1wiKVxuICogQHJldHVybnMgQ29udmVydGVkIHZhbHVlLCBvciBvcmlnaW5hbCBpZiB1bml0cyBtYXRjaFxuICovXG5leHBvcnQgZnVuY3Rpb24gY29udmVydERpc3RhbmNlKFxuICB2YWx1ZTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbCxcbiAgZnJvbVVuaXQ6IFwieWFyZHNcIiB8IFwibWV0ZXJzXCIsXG4gIHRvVW5pdDogXCJ5YXJkc1wiIHwgXCJtZXRlcnNcIlxuKTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbCB7XG4gIGlmICh2YWx1ZSA9PT0gbnVsbCB8fCB2YWx1ZSA9PT0gXCJcIikgcmV0dXJuIHZhbHVlO1xuXG4gIGNvbnN0IG51bVZhbHVlID0gdHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiID8gcGFyc2VGbG9hdCh2YWx1ZSkgOiB2YWx1ZTtcbiAgaWYgKGlzTmFOKG51bVZhbHVlKSkgcmV0dXJuIHZhbHVlO1xuXG4gIGlmIChmcm9tVW5pdCA9PT0gdG9Vbml0KSByZXR1cm4gbnVtVmFsdWU7XG5cbiAgLy8gQ29udmVydCB0byBtZXRlcnMgZmlyc3QsIHRoZW4gdG8gdGFyZ2V0IHVuaXRcbiAgY29uc3QgaW5NZXRlcnMgPSBmcm9tVW5pdCA9PT0gXCJ5YXJkc1wiID8gbnVtVmFsdWUgKiAwLjkxNDQgOiBudW1WYWx1ZTtcbiAgcmV0dXJuIHRvVW5pdCA9PT0gXCJ5YXJkc1wiID8gaW5NZXRlcnMgLyAwLjkxNDQgOiBpbk1ldGVycztcbn1cblxuLyoqXG4gKiBDb252ZXJ0IGFuIGFuZ2xlIHZhbHVlIGJldHdlZW4gdW5pdHMuXG4gKiBcbiAqIEBwYXJhbSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byBjb252ZXJ0XG4gKiBAcGFyYW0gZnJvbVVuaXQgLSBTb3VyY2UgdW5pdCAoXCJkZWdyZWVzXCIgb3IgXCJyYWRpYW5zXCIpXG4gKiBAcGFyYW0gdG9Vbml0IC0gVGFyZ2V0IHVuaXQgKFwiZGVncmVlc1wiIG9yIFwicmFkaWFuc1wiKVxuICogQHJldHVybnMgQ29udmVydGVkIHZhbHVlLCBvciBvcmlnaW5hbCBpZiB1bml0cyBtYXRjaFxuICovXG5leHBvcnQgZnVuY3Rpb24gY29udmVydEFuZ2xlKFxuICB2YWx1ZTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbCxcbiAgZnJvbVVuaXQ6IFwiZGVncmVlc1wiIHwgXCJyYWRpYW5zXCIsXG4gIHRvVW5pdDogXCJkZWdyZWVzXCIgfCBcInJhZGlhbnNcIlxuKTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbCB7XG4gIGlmICh2YWx1ZSA9PT0gbnVsbCB8fCB2YWx1ZSA9PT0gXCJcIikgcmV0dXJuIHZhbHVlO1xuXG4gIGNvbnN0IG51bVZhbHVlID0gdHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiID8gcGFyc2VGbG9hdCh2YWx1ZSkgOiB2YWx1ZTtcbiAgaWYgKGlzTmFOKG51bVZhbHVlKSkgcmV0dXJuIHZhbHVlO1xuXG4gIGlmIChmcm9tVW5pdCA9PT0gdG9Vbml0KSByZXR1cm4gbnVtVmFsdWU7XG5cbiAgLy8gQ29udmVydCB0byBkZWdyZWVzIGZpcnN0LCB0aGVuIHRvIHRhcmdldCB1bml0XG4gIGNvbnN0IGluRGVncmVlcyA9IGZyb21Vbml0ID09PSBcImRlZ3JlZXNcIiA/IG51bVZhbHVlIDogKG51bVZhbHVlICogMTgwIC8gTWF0aC5QSSk7XG4gIHJldHVybiB0b1VuaXQgPT09IFwiZGVncmVlc1wiID8gaW5EZWdyZWVzIDogKGluRGVncmVlcyAqIE1hdGguUEkgLyAxODApO1xufVxuXG4vKipcbiAqIENvbnZlcnQgYSBzcGVlZCB2YWx1ZSBiZXR3ZWVuIHVuaXRzLlxuICpcbiAqIEBwYXJhbSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byBjb252ZXJ0XG4gKiBAcGFyYW0gZnJvbVVuaXQgLSBTb3VyY2UgdW5pdCAoXCJtcGhcIiwgXCJrbS9oXCIsIG9yIFwibS9zXCIpXG4gKiBAcGFyYW0gdG9Vbml0IC0gVGFyZ2V0IHVuaXQgKFwibXBoXCIsIFwia20vaFwiLCBvciBcIm0vc1wiKVxuICogQHJldHVybnMgQ29udmVydGVkIHZhbHVlLCBvciBvcmlnaW5hbCBpZiB1bml0cyBtYXRjaFxuICovXG5leHBvcnQgZnVuY3Rpb24gY29udmVydFNwZWVkKFxuICB2YWx1ZTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbCxcbiAgZnJvbVVuaXQ6IFwibXBoXCIgfCBcImttL2hcIiB8IFwibS9zXCIsXG4gIHRvVW5pdDogXCJtcGhcIiB8IFwia20vaFwiIHwgXCJtL3NcIlxuKTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbCB7XG4gIGlmICh2YWx1ZSA9PT0gbnVsbCB8fCB2YWx1ZSA9PT0gXCJcIikgcmV0dXJuIHZhbHVlO1xuXG4gIGNvbnN0IG51bVZhbHVlID0gdHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiID8gcGFyc2VGbG9hdCh2YWx1ZSkgOiB2YWx1ZTtcbiAgaWYgKGlzTmFOKG51bVZhbHVlKSkgcmV0dXJuIHZhbHVlO1xuXG4gIGlmIChmcm9tVW5pdCA9PT0gdG9Vbml0KSByZXR1cm4gbnVtVmFsdWU7XG5cbiAgLy8gQ29udmVydCB0byBtcGggZmlyc3QsIHRoZW4gdG8gdGFyZ2V0IHVuaXRcbiAgbGV0IGluTXBoOiBudW1iZXI7XG4gIGlmIChmcm9tVW5pdCA9PT0gXCJtcGhcIikgaW5NcGggPSBudW1WYWx1ZTtcbiAgZWxzZSBpZiAoZnJvbVVuaXQgPT09IFwia20vaFwiKSBpbk1waCA9IG51bVZhbHVlIC8gMS42MDkzNDQ7XG4gIGVsc2UgaW5NcGggPSBudW1WYWx1ZSAqIDIuMjM2OTQ7IC8vIG0vcyB0byBtcGhcblxuICBpZiAodG9Vbml0ID09PSBcIm1waFwiKSByZXR1cm4gaW5NcGg7XG4gIGlmICh0b1VuaXQgPT09IFwia20vaFwiKSByZXR1cm4gaW5NcGggKiAxLjYwOTM0NDtcbiAgcmV0dXJuIGluTXBoIC8gMi4yMzY5NDsgLy8gbXBoIHRvIG0vc1xufVxuXG4vKipcbiAqIEdldCB0aGUgc21hbGwgZGlzdGFuY2UgdW5pdCBiYXNlZCBvbiB0aGUgdXNlcidzIGRpc3RhbmNlIGNob2ljZS5cbiAqIFlhcmRzIHVzZXJzIHNlZSBpbmNoZXM7IG1ldGVycyB1c2VycyBzZWUgY20uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRTbWFsbERpc3RhbmNlVW5pdCh1bml0Q2hvaWNlOiBVbml0Q2hvaWNlID0gREVGQVVMVF9VTklUX0NIT0lDRSk6IFNtYWxsRGlzdGFuY2VVbml0IHtcbiAgcmV0dXJuIHVuaXRDaG9pY2UuZGlzdGFuY2UgPT09IFwieWFyZHNcIiA/IFwiaW5jaGVzXCIgOiBcImNtXCI7XG59XG5cbi8qKlxuICogQ29udmVydCBhIGRpc3RhbmNlIHZhbHVlIGZyb20gbWV0ZXJzIHRvIGEgc21hbGwgZGlzdGFuY2UgdW5pdCAoaW5jaGVzIG9yIGNtKS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbnZlcnRTbWFsbERpc3RhbmNlKFxuICB2YWx1ZTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbCxcbiAgdG9TbWFsbFVuaXQ6IFNtYWxsRGlzdGFuY2VVbml0XG4pOiBudW1iZXIgfCBzdHJpbmcgfCBudWxsIHtcbiAgaWYgKHZhbHVlID09PSBudWxsIHx8IHZhbHVlID09PSBcIlwiKSByZXR1cm4gdmFsdWU7XG5cbiAgY29uc3QgbnVtVmFsdWUgPSB0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCIgPyBwYXJzZUZsb2F0KHZhbHVlKSA6IHZhbHVlO1xuICBpZiAoaXNOYU4obnVtVmFsdWUpKSByZXR1cm4gdmFsdWU7XG5cbiAgcmV0dXJuIHRvU21hbGxVbml0ID09PSBcImluY2hlc1wiID8gbnVtVmFsdWUgKiAzOS4zNzAxIDogbnVtVmFsdWUgKiAxMDA7XG59XG5cbi8qKlxuICogQ29udmVydCBhIGRpc3RhbmNlIHZhbHVlIGZyb20gbWV0ZXJzIHRvIG1pbGxpbWV0ZXJzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gY29udmVydE1pbGxpbWV0ZXJzKFxuICB2YWx1ZTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbFxuKTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbCB7XG4gIGlmICh2YWx1ZSA9PT0gbnVsbCB8fCB2YWx1ZSA9PT0gXCJcIikgcmV0dXJuIHZhbHVlO1xuXG4gIGNvbnN0IG51bVZhbHVlID0gdHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiID8gcGFyc2VGbG9hdCh2YWx1ZSkgOiB2YWx1ZTtcbiAgaWYgKGlzTmFOKG51bVZhbHVlKSkgcmV0dXJuIHZhbHVlO1xuXG4gIHJldHVybiBudW1WYWx1ZSAqIDEwMDA7XG59XG5cbi8qKlxuICogTm9ybWFsaXplIGEgbWV0cmljIHZhbHVlIGJhc2VkIG9uIHVuaXQgc3lzdGVtIGFsaWdubWVudCBhbmQgdXNlcidzIHVuaXQgY2hvaWNlLlxuICpcbiAqIENvbnZlcnRzIHZhbHVlcyBmcm9tIHRoZSBzb3VyY2UgdW5pdHMgdG8gdGFyZ2V0IG91dHB1dCB1bml0czpcbiAqIC0gRGlzdGFuY2U6IHlhcmRzIG9yIG1ldGVycyAocGVyIHVuaXRDaG9pY2UuZGlzdGFuY2UpXG4gKiAtIEFuZ2xlczogYWx3YXlzIGRlZ3JlZXNcbiAqIC0gU3BlZWQ6IG1waCBvciBtL3MgKHBlciB1bml0Q2hvaWNlLnNwZWVkKVxuICpcbiAqIEBwYXJhbSB2YWx1ZSAtIFRoZSByYXcgbWV0cmljIHZhbHVlXG4gKiBAcGFyYW0gbWV0cmljTmFtZSAtIFRoZSBuYW1lIG9mIHRoZSBtZXRyaWMgYmVpbmcgbm9ybWFsaXplZFxuICogQHBhcmFtIHJlcG9ydFVuaXRTeXN0ZW0gLSBUaGUgdW5pdCBzeXN0ZW0gdXNlZCBpbiB0aGUgc291cmNlIGRhdGFcbiAqIEBwYXJhbSB1bml0Q2hvaWNlIC0gVXNlcidzIHVuaXQgY2hvaWNlIChkZWZhdWx0cyB0byBtcGggKyB5YXJkcylcbiAqIEByZXR1cm5zIE5vcm1hbGl6ZWQgdmFsdWUgYXMgbnVtYmVyIG9yIHN0cmluZyAobnVsbCBpZiBpbnZhbGlkKVxuICovXG5leHBvcnQgZnVuY3Rpb24gbm9ybWFsaXplTWV0cmljVmFsdWUoXG4gIHZhbHVlOiBNZXRyaWNWYWx1ZSxcbiAgbWV0cmljTmFtZTogc3RyaW5nLFxuICByZXBvcnRVbml0U3lzdGVtOiBVbml0U3lzdGVtLFxuICB1bml0Q2hvaWNlOiBVbml0Q2hvaWNlID0gREVGQVVMVF9VTklUX0NIT0lDRVxuKTogTWV0cmljVmFsdWUge1xuICBjb25zdCBudW1WYWx1ZSA9IHBhcnNlTnVtZXJpY1ZhbHVlKHZhbHVlKTtcbiAgaWYgKG51bVZhbHVlID09PSBudWxsKSByZXR1cm4gdmFsdWU7XG5cbiAgbGV0IGNvbnZlcnRlZDogbnVtYmVyO1xuXG4gIGlmIChNSUxMSU1FVEVSX01FVFJJQ1MuaGFzKG1ldHJpY05hbWUpKSB7XG4gICAgY29udmVydGVkID0gY29udmVydE1pbGxpbWV0ZXJzKG51bVZhbHVlKSBhcyBudW1iZXI7XG4gIH0gZWxzZSBpZiAoU01BTExfRElTVEFOQ0VfTUVUUklDUy5oYXMobWV0cmljTmFtZSkpIHtcbiAgICBjb252ZXJ0ZWQgPSBjb252ZXJ0U21hbGxEaXN0YW5jZShcbiAgICAgIG51bVZhbHVlLFxuICAgICAgZ2V0U21hbGxEaXN0YW5jZVVuaXQodW5pdENob2ljZSlcbiAgICApIGFzIG51bWJlcjtcbiAgfSBlbHNlIGlmIChESVNUQU5DRV9NRVRSSUNTLmhhcyhtZXRyaWNOYW1lKSkge1xuICAgIGNvbnZlcnRlZCA9IGNvbnZlcnREaXN0YW5jZShcbiAgICAgIG51bVZhbHVlLFxuICAgICAgcmVwb3J0VW5pdFN5c3RlbS5kaXN0YW5jZVVuaXQsXG4gICAgICB1bml0Q2hvaWNlLmRpc3RhbmNlXG4gICAgKSBhcyBudW1iZXI7XG4gIH0gZWxzZSBpZiAoQU5HTEVfTUVUUklDUy5oYXMobWV0cmljTmFtZSkpIHtcbiAgICBjb252ZXJ0ZWQgPSBjb252ZXJ0QW5nbGUoXG4gICAgICBudW1WYWx1ZSxcbiAgICAgIHJlcG9ydFVuaXRTeXN0ZW0uYW5nbGVVbml0LFxuICAgICAgXCJkZWdyZWVzXCJcbiAgICApIGFzIG51bWJlcjtcbiAgfSBlbHNlIGlmIChTUEVFRF9NRVRSSUNTLmhhcyhtZXRyaWNOYW1lKSkge1xuICAgIGNvbnZlcnRlZCA9IGNvbnZlcnRTcGVlZChcbiAgICAgIG51bVZhbHVlLFxuICAgICAgcmVwb3J0VW5pdFN5c3RlbS5zcGVlZFVuaXQsXG4gICAgICB1bml0Q2hvaWNlLnNwZWVkXG4gICAgKSBhcyBudW1iZXI7XG4gIH0gZWxzZSB7XG4gICAgY29udmVydGVkID0gbnVtVmFsdWU7XG4gIH1cblxuICAvLyBTcGluUmF0ZTogcm91bmQgdG8gd2hvbGUgbnVtYmVyc1xuICBpZiAobWV0cmljTmFtZSA9PT0gXCJTcGluUmF0ZVwiKSByZXR1cm4gTWF0aC5yb3VuZChjb252ZXJ0ZWQpO1xuXG4gIC8vIEltcGFjdCBsb2NhdGlvbiBtZXRyaWNzIGFyZSBkaXNwbGF5ZWQgYXMgd2hvbGUgbWlsbGltZXRlcnMuXG4gIGlmIChNSUxMSU1FVEVSX01FVFJJQ1MuaGFzKG1ldHJpY05hbWUpKSByZXR1cm4gTWF0aC5yb3VuZChjb252ZXJ0ZWQpO1xuXG4gIC8vIFNtYXNoRmFjdG9yIC8gVGVtcG86IHJvdW5kIHRvIDIgZGVjaW1hbCBwbGFjZXNcbiAgaWYgKG1ldHJpY05hbWUgPT09IFwiU21hc2hGYWN0b3JcIiB8fCBtZXRyaWNOYW1lID09PSBcIlRlbXBvXCIpXG4gICAgcmV0dXJuIE1hdGgucm91bmQoY29udmVydGVkICogMTAwKSAvIDEwMDtcblxuICAvLyBSb3VuZCB0byAxIGRlY2ltYWwgcGxhY2UgZm9yIGNvbnNpc3RlbmN5XG4gIHJldHVybiBNYXRoLnJvdW5kKGNvbnZlcnRlZCAqIDEwKSAvIDEwO1xufVxuXG4vKipcbiAqIFBhcnNlIGEgbnVtZXJpYyB2YWx1ZSBmcm9tIE1ldHJpY1ZhbHVlIHR5cGUuXG4gKi9cbmZ1bmN0aW9uIHBhcnNlTnVtZXJpY1ZhbHVlKHZhbHVlOiBNZXRyaWNWYWx1ZSk6IG51bWJlciB8IG51bGwge1xuICBpZiAodmFsdWUgPT09IG51bGwgfHwgdmFsdWUgPT09IFwiXCIpIHJldHVybiBudWxsO1xuICBpZiAodHlwZW9mIHZhbHVlID09PSBcIm51bWJlclwiKSByZXR1cm4gaXNOYU4odmFsdWUpID8gbnVsbCA6IHZhbHVlO1xuICBcbiAgY29uc3QgcGFyc2VkID0gcGFyc2VGbG9hdCh2YWx1ZSk7XG4gIHJldHVybiBpc05hTihwYXJzZWQpID8gbnVsbCA6IHBhcnNlZDtcbn1cblxuZXhwb3J0IHR5cGUgTWV0cmljVmFsdWUgPSBzdHJpbmcgfCBudW1iZXIgfCBudWxsO1xuIiwgIi8qKlxuICogQ1NWIHdyaXRlciBmb3IgVHJhY2tQdWxsIHNlc3Npb24gZGF0YS5cbiAqIEltcGxlbWVudHMgY29yZSBjb2x1bW5zOiBEYXRlLCBDbHViLCBTaG90ICMsIFR5cGVcbiAqL1xuXG5pbXBvcnQgdHlwZSB7IFNlc3Npb25EYXRhLCBDbHViR3JvdXAsIFNob3QgfSBmcm9tIFwiLi4vbW9kZWxzL3R5cGVzXCI7XG5pbXBvcnQge1xuICBnZXRBcGlTb3VyY2VVbml0U3lzdGVtLFxuICBnZXRNZXRyaWNVbml0TGFiZWwsXG4gIG5vcm1hbGl6ZU1ldHJpY1ZhbHVlLFxuICBERUZBVUxUX1VOSVRfQ0hPSUNFLFxuICB0eXBlIFVuaXRDaG9pY2UsXG59IGZyb20gXCIuL3VuaXRfbm9ybWFsaXphdGlvblwiO1xuaW1wb3J0IHsgTUVUUklDX0RJU1BMQVlfTkFNRVMgfSBmcm9tIFwiLi9jb25zdGFudHNcIjtcblxuY29uc3QgTUVUUklDX0NPTFVNTl9PUkRFUjogc3RyaW5nW10gPSBbXG4gIC8vIFNwZWVkICYgRWZmaWNpZW5jeVxuICBcIkNsdWJTcGVlZFwiLCBcIkJhbGxTcGVlZFwiLCBcIlNtYXNoRmFjdG9yXCIsXG4gIC8vIENsdWIgRGVsaXZlcnlcbiAgXCJBdHRhY2tBbmdsZVwiLCBcIkNsdWJQYXRoXCIsIFwiRmFjZUFuZ2xlXCIsIFwiRmFjZVRvUGF0aFwiLCBcIlN3aW5nRGlyZWN0aW9uXCIsIFwiRHluYW1pY0xvZnRcIixcbiAgLy8gTGF1bmNoICYgU3BpblxuICBcIkxhdW5jaEFuZ2xlXCIsIFwiTGF1bmNoRGlyZWN0aW9uXCIsIFwiU3BpblJhdGVcIiwgXCJTcGluQXhpc1wiLCBcIlNwaW5Mb2Z0XCIsXG4gIC8vIERpc3RhbmNlXG4gIFwiQ2FycnlcIiwgXCJUb3RhbFwiLFxuICAvLyBEaXNwZXJzaW9uXG4gIFwiU2lkZVwiLCBcIlNpZGVUb3RhbFwiLCBcIkNhcnJ5U2lkZVwiLCBcIlRvdGFsU2lkZVwiLCBcIkN1cnZlXCIsXG4gIC8vIEJhbGwgRmxpZ2h0XG4gIFwiSGVpZ2h0XCIsIFwiTWF4SGVpZ2h0XCIsIFwiTGFuZGluZ0FuZ2xlXCIsIFwiSGFuZ1RpbWVcIixcbiAgLy8gSW1wYWN0XG4gIFwiTG93UG9pbnREaXN0YW5jZVwiLCBcIkltcGFjdEhlaWdodFwiLCBcIkltcGFjdE9mZnNldFwiLFxuICAvLyBPdGhlclxuICBcIlRlbXBvXCIsXG5dO1xuXG5mdW5jdGlvbiBnZXREaXNwbGF5TmFtZShtZXRyaWM6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBNRVRSSUNfRElTUExBWV9OQU1FU1ttZXRyaWNdID8/IG1ldHJpYztcbn1cblxuZnVuY3Rpb24gZ2V0Q29sdW1uTmFtZShtZXRyaWM6IHN0cmluZywgdW5pdENob2ljZTogVW5pdENob2ljZSk6IHN0cmluZyB7XG4gIGNvbnN0IGRpc3BsYXlOYW1lID0gZ2V0RGlzcGxheU5hbWUobWV0cmljKTtcbiAgY29uc3QgdW5pdExhYmVsID0gZ2V0TWV0cmljVW5pdExhYmVsKG1ldHJpYywgdW5pdENob2ljZSk7XG4gIHJldHVybiB1bml0TGFiZWwgPyBgJHtkaXNwbGF5TmFtZX0gKCR7dW5pdExhYmVsfSlgIDogZGlzcGxheU5hbWU7XG59XG5cbmZ1bmN0aW9uIGdlbmVyYXRlRmlsZW5hbWUoc2Vzc2lvbjogU2Vzc2lvbkRhdGEpOiBzdHJpbmcge1xuICByZXR1cm4gYFNob3REYXRhXyR7c2Vzc2lvbi5kYXRlfS5jc3ZgO1xufVxuXG5mdW5jdGlvbiBvcmRlck1ldHJpY3NCeVByaW9yaXR5KFxuICBhbGxNZXRyaWNzOiBzdHJpbmdbXSxcbiAgcHJpb3JpdHlPcmRlcjogc3RyaW5nW11cbik6IHN0cmluZ1tdIHtcbiAgY29uc3QgcmVzdWx0OiBzdHJpbmdbXSA9IFtdO1xuICBjb25zdCBzZWVuID0gbmV3IFNldDxzdHJpbmc+KCk7XG5cbiAgZm9yIChjb25zdCBtZXRyaWMgb2YgcHJpb3JpdHlPcmRlcikge1xuICAgIGlmIChhbGxNZXRyaWNzLmluY2x1ZGVzKG1ldHJpYykgJiYgIXNlZW4uaGFzKG1ldHJpYykpIHtcbiAgICAgIHJlc3VsdC5wdXNoKG1ldHJpYyk7XG4gICAgICBzZWVuLmFkZChtZXRyaWMpO1xuICAgIH1cbiAgfVxuXG4gIGZvciAoY29uc3QgbWV0cmljIG9mIGFsbE1ldHJpY3MpIHtcbiAgICBpZiAoIXNlZW4uaGFzKG1ldHJpYykpIHtcbiAgICAgIHJlc3VsdC5wdXNoKG1ldHJpYyk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gaGFzVGFncyhzZXNzaW9uOiBTZXNzaW9uRGF0YSk6IGJvb2xlYW4ge1xuICByZXR1cm4gc2Vzc2lvbi5jbHViX2dyb3Vwcy5zb21lKChjbHViKSA9PlxuICAgIGNsdWIuc2hvdHMuc29tZSgoc2hvdCkgPT4gc2hvdC50YWcgIT09IHVuZGVmaW5lZCAmJiBzaG90LnRhZyAhPT0gXCJcIilcbiAgKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHdyaXRlQ3N2KFxuICBzZXNzaW9uOiBTZXNzaW9uRGF0YSxcbiAgaW5jbHVkZUF2ZXJhZ2VzID0gdHJ1ZSxcbiAgbWV0cmljT3JkZXI/OiBzdHJpbmdbXSxcbiAgdW5pdENob2ljZTogVW5pdENob2ljZSA9IERFRkFVTFRfVU5JVF9DSE9JQ0UsXG4gIGhpdHRpbmdTdXJmYWNlPzogXCJHcmFzc1wiIHwgXCJNYXRcIlxuKTogc3RyaW5nIHtcbiAgY29uc3Qgb3JkZXJlZE1ldHJpY3MgPSBvcmRlck1ldHJpY3NCeVByaW9yaXR5KFxuICAgIHNlc3Npb24ubWV0cmljX25hbWVzLFxuICAgIG1ldHJpY09yZGVyID8/IE1FVFJJQ19DT0xVTU5fT1JERVJcbiAgKTtcblxuICBjb25zdCBoZWFkZXJSb3c6IHN0cmluZ1tdID0gW1wiRGF0ZVwiLCBcIkNsdWJcIl07XG5cbiAgaWYgKGhhc1RhZ3Moc2Vzc2lvbikpIHtcbiAgICBoZWFkZXJSb3cucHVzaChcIlRhZ1wiKTtcbiAgfVxuXG4gIGhlYWRlclJvdy5wdXNoKFwiU2hvdCAjXCIsIFwiVHlwZVwiKTtcblxuICBmb3IgKGNvbnN0IG1ldHJpYyBvZiBvcmRlcmVkTWV0cmljcykge1xuICAgIGhlYWRlclJvdy5wdXNoKGdldENvbHVtbk5hbWUobWV0cmljLCB1bml0Q2hvaWNlKSk7XG4gIH1cblxuICBjb25zdCByb3dzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+W10gPSBbXTtcblxuICAvLyBTb3VyY2UgdW5pdCBzeXN0ZW06IEFQSSBhbHdheXMgcmV0dXJucyBtL3MgKyBtZXRlcnMsIGFuZ2xlIHVuaXQgZnJvbSByZXBvcnRcbiAgY29uc3QgdW5pdFN5c3RlbSA9IGdldEFwaVNvdXJjZVVuaXRTeXN0ZW0oc2Vzc2lvbi5tZXRhZGF0YV9wYXJhbXMpO1xuXG4gIGZvciAoY29uc3QgY2x1YiBvZiBzZXNzaW9uLmNsdWJfZ3JvdXBzKSB7XG4gICAgZm9yIChjb25zdCBzaG90IG9mIGNsdWIuc2hvdHMpIHtcbiAgICAgIGNvbnN0IHJvdzogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcbiAgICAgICAgRGF0ZTogc2Vzc2lvbi5kYXRlLFxuICAgICAgICBDbHViOiBjbHViLmNsdWJfbmFtZSxcbiAgICAgICAgXCJTaG90ICNcIjogU3RyaW5nKHNob3Quc2hvdF9udW1iZXIgKyAxKSxcbiAgICAgICAgVHlwZTogXCJTaG90XCIsXG4gICAgICB9O1xuXG4gICAgICBpZiAoaGFzVGFncyhzZXNzaW9uKSkge1xuICAgICAgICByb3cuVGFnID0gc2hvdC50YWcgPz8gXCJcIjtcbiAgICAgIH1cblxuICAgICAgZm9yIChjb25zdCBtZXRyaWMgb2Ygb3JkZXJlZE1ldHJpY3MpIHtcbiAgICAgICAgY29uc3QgY29sTmFtZSA9IGdldENvbHVtbk5hbWUobWV0cmljLCB1bml0Q2hvaWNlKTtcbiAgICAgICAgY29uc3QgcmF3VmFsdWUgPSBzaG90Lm1ldHJpY3NbbWV0cmljXSA/PyBcIlwiO1xuXG4gICAgICAgIGlmICh0eXBlb2YgcmF3VmFsdWUgPT09IFwic3RyaW5nXCIgfHwgdHlwZW9mIHJhd1ZhbHVlID09PSBcIm51bWJlclwiKSB7XG4gICAgICAgICAgcm93W2NvbE5hbWVdID0gU3RyaW5nKG5vcm1hbGl6ZU1ldHJpY1ZhbHVlKHJhd1ZhbHVlLCBtZXRyaWMsIHVuaXRTeXN0ZW0sIHVuaXRDaG9pY2UpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByb3dbY29sTmFtZV0gPSBcIlwiO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJvd3MucHVzaChyb3cpO1xuICAgIH1cblxuICAgIGlmIChpbmNsdWRlQXZlcmFnZXMpIHtcbiAgICAgIC8vIEdyb3VwIHNob3RzIGJ5IHRhZ1xuICAgICAgY29uc3QgdGFnR3JvdXBzID0gbmV3IE1hcDxzdHJpbmcsIFNob3RbXT4oKTtcbiAgICAgIGZvciAoY29uc3Qgc2hvdCBvZiBjbHViLnNob3RzKSB7XG4gICAgICAgIGNvbnN0IHRhZyA9IHNob3QudGFnID8/IFwiXCI7XG4gICAgICAgIGlmICghdGFnR3JvdXBzLmhhcyh0YWcpKSB0YWdHcm91cHMuc2V0KHRhZywgW10pO1xuICAgICAgICB0YWdHcm91cHMuZ2V0KHRhZykhLnB1c2goc2hvdCk7XG4gICAgICB9XG5cbiAgICAgIGZvciAoY29uc3QgW3RhZywgc2hvdHNdIG9mIHRhZ0dyb3Vwcykge1xuICAgICAgICAvLyBPbmx5IHdyaXRlIGF2ZXJhZ2Ugcm93IGlmIGdyb3VwIGhhcyAyKyBzaG90c1xuICAgICAgICBpZiAoc2hvdHMubGVuZ3RoIDwgMikgY29udGludWU7XG5cbiAgICAgICAgY29uc3QgYXZnUm93OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xuICAgICAgICAgIERhdGU6IHNlc3Npb24uZGF0ZSxcbiAgICAgICAgICBDbHViOiBjbHViLmNsdWJfbmFtZSxcbiAgICAgICAgICBcIlNob3QgI1wiOiBcIlwiLFxuICAgICAgICAgIFR5cGU6IFwiQXZlcmFnZVwiLFxuICAgICAgICB9O1xuXG4gICAgICAgIGlmIChoYXNUYWdzKHNlc3Npb24pKSB7XG4gICAgICAgICAgYXZnUm93LlRhZyA9IHRhZztcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAoY29uc3QgbWV0cmljIG9mIG9yZGVyZWRNZXRyaWNzKSB7XG4gICAgICAgICAgY29uc3QgY29sTmFtZSA9IGdldENvbHVtbk5hbWUobWV0cmljLCB1bml0Q2hvaWNlKTtcbiAgICAgICAgICBjb25zdCB2YWx1ZXMgPSBzaG90c1xuICAgICAgICAgICAgLm1hcCgocykgPT4gcy5tZXRyaWNzW21ldHJpY10pXG4gICAgICAgICAgICAuZmlsdGVyKCh2KSA9PiB2ICE9PSB1bmRlZmluZWQgJiYgdiAhPT0gXCJcIilcbiAgICAgICAgICAgIC5tYXAoKHYpID0+IHBhcnNlRmxvYXQoU3RyaW5nKHYpKSk7XG4gICAgICAgICAgY29uc3QgbnVtZXJpY1ZhbHVlcyA9IHZhbHVlcy5maWx0ZXIoKHYpID0+ICFpc05hTih2KSk7XG5cbiAgICAgICAgICBpZiAobnVtZXJpY1ZhbHVlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBhdmcgPSBudW1lcmljVmFsdWVzLnJlZHVjZSgoYSwgYikgPT4gYSArIGIsIDApIC8gbnVtZXJpY1ZhbHVlcy5sZW5ndGg7XG4gICAgICAgICAgICBjb25zdCByb3VuZGVkID0gKG1ldHJpYyA9PT0gXCJTbWFzaEZhY3RvclwiIHx8IG1ldHJpYyA9PT0gXCJUZW1wb1wiKVxuICAgICAgICAgICAgICA/IE1hdGgucm91bmQoYXZnICogMTAwKSAvIDEwMFxuICAgICAgICAgICAgICA6IE1hdGgucm91bmQoYXZnICogMTApIC8gMTA7XG4gICAgICAgICAgICBhdmdSb3dbY29sTmFtZV0gPSBTdHJpbmcobm9ybWFsaXplTWV0cmljVmFsdWUocm91bmRlZCwgbWV0cmljLCB1bml0U3lzdGVtLCB1bml0Q2hvaWNlKSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGF2Z1Jvd1tjb2xOYW1lXSA9IFwiXCI7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcm93cy5wdXNoKGF2Z1Jvdyk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgY29uc3QgbGluZXM6IHN0cmluZ1tdID0gW107XG5cbiAgaWYgKGhpdHRpbmdTdXJmYWNlICE9PSB1bmRlZmluZWQpIHtcbiAgICBsaW5lcy5wdXNoKGBIaXR0aW5nIFN1cmZhY2U6ICR7aGl0dGluZ1N1cmZhY2V9YCk7XG4gIH1cblxuICBsaW5lcy5wdXNoKGhlYWRlclJvdy5qb2luKFwiLFwiKSk7XG4gIGZvciAoY29uc3Qgcm93IG9mIHJvd3MpIHtcbiAgICBsaW5lcy5wdXNoKFxuICAgICAgaGVhZGVyUm93XG4gICAgICAgIC5tYXAoKGNvbCkgPT4ge1xuICAgICAgICAgIGNvbnN0IHZhbHVlID0gcm93W2NvbF0gPz8gXCJcIjtcbiAgICAgICAgICBpZiAodmFsdWUuaW5jbHVkZXMoXCIsXCIpIHx8IHZhbHVlLmluY2x1ZGVzKCdcIicpIHx8IHZhbHVlLmluY2x1ZGVzKFwiXFxuXCIpKSB7XG4gICAgICAgICAgICByZXR1cm4gYFwiJHt2YWx1ZS5yZXBsYWNlKC9cIi9nLCAnXCJcIicpfVwiYDtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICB9KVxuICAgICAgICAuam9pbihcIixcIilcbiAgICApO1xuICB9XG5cbiAgcmV0dXJuIGxpbmVzLmpvaW4oXCJcXG5cIik7XG59XG4iLCAiLyoqXG4gKiBTZXNzaW9uIGhpc3Rvcnkgc3RvcmFnZSBtb2R1bGUuXG4gKiBTYXZlcywgZGVkdXBsaWNhdGVzIChieSByZXBvcnRfaWQpLCBhbmQgZXZpY3RzIHNlc3Npb25zIGZyb20gY2hyb21lLnN0b3JhZ2UubG9jYWwuXG4gKi9cblxuaW1wb3J0IHR5cGUgeyBTZXNzaW9uRGF0YSwgU2Vzc2lvblNuYXBzaG90LCBIaXN0b3J5RW50cnkgfSBmcm9tIFwiLi4vbW9kZWxzL3R5cGVzXCI7XG5pbXBvcnQgeyBTVE9SQUdFX0tFWVMgfSBmcm9tIFwiLi9jb25zdGFudHNcIjtcblxuY29uc3QgTUFYX1NFU1NJT05TID0gMjA7XG5cbi8qKiBTdHJpcCByYXdfYXBpX2RhdGEgZnJvbSBhIFNlc3Npb25EYXRhIHRvIGNyZWF0ZSBhIGxpZ2h0d2VpZ2h0IHNuYXBzaG90LiAqL1xuZnVuY3Rpb24gY3JlYXRlU25hcHNob3Qoc2Vzc2lvbjogU2Vzc2lvbkRhdGEpOiBTZXNzaW9uU25hcHNob3Qge1xuICAvLyBEZXN0cnVjdHVyZSB0byBleGNsdWRlIHJhd19hcGlfZGF0YVxuICBjb25zdCB7IHJhd19hcGlfZGF0YTogXywgLi4uc25hcHNob3QgfSA9IHNlc3Npb247XG4gIHJldHVybiBzbmFwc2hvdDtcbn1cblxuLyoqXG4gKiBTYXZlIGEgc2Vzc2lvbiB0byB0aGUgcm9sbGluZyBoaXN0b3J5IGluIGNocm9tZS5zdG9yYWdlLmxvY2FsLlxuICogLSBEZWR1cGxpY2F0ZXMgYnkgcmVwb3J0X2lkIChyZXBsYWNlcyBleGlzdGluZyBlbnRyeSwgcmVmcmVzaGVzIGNhcHR1cmVkX2F0KS5cbiAqIC0gRXZpY3RzIG9sZGVzdCBlbnRyeSB3aGVuIHRoZSAyMC1zZXNzaW9uIGNhcCBpcyByZWFjaGVkLlxuICogLSBTdG9yZXMgZW50cmllcyBzb3J0ZWQgbmV3ZXN0LWZpcnN0IChkZXNjZW5kaW5nIGNhcHR1cmVkX2F0KS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNhdmVTZXNzaW9uVG9IaXN0b3J5KHNlc3Npb246IFNlc3Npb25EYXRhKTogUHJvbWlzZTx2b2lkPiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgY2hyb21lLnN0b3JhZ2UubG9jYWwuZ2V0KFxuICAgICAgW1NUT1JBR0VfS0VZUy5TRVNTSU9OX0hJU1RPUlldLFxuICAgICAgKHJlc3VsdDogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pID0+IHtcbiAgICAgICAgaWYgKGNocm9tZS5ydW50aW1lLmxhc3RFcnJvcikge1xuICAgICAgICAgIHJldHVybiByZWplY3QobmV3IEVycm9yKGNocm9tZS5ydW50aW1lLmxhc3RFcnJvci5tZXNzYWdlKSk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBleGlzdGluZyA9IChyZXN1bHRbU1RPUkFHRV9LRVlTLlNFU1NJT05fSElTVE9SWV0gYXMgSGlzdG9yeUVudHJ5W10gfCB1bmRlZmluZWQpID8/IFtdO1xuXG4gICAgICAgIC8vIFJlbW92ZSBhbnkgZXhpc3RpbmcgZW50cnkgd2l0aCB0aGUgc2FtZSByZXBvcnRfaWQgKGRlZHVwKVxuICAgICAgICBjb25zdCBmaWx0ZXJlZCA9IGV4aXN0aW5nLmZpbHRlcihcbiAgICAgICAgICAoZW50cnkpID0+IGVudHJ5LnNuYXBzaG90LnJlcG9ydF9pZCAhPT0gc2Vzc2lvbi5yZXBvcnRfaWRcbiAgICAgICAgKTtcblxuICAgICAgICAvLyBDcmVhdGUgbmV3IGVudHJ5XG4gICAgICAgIGNvbnN0IG5ld0VudHJ5OiBIaXN0b3J5RW50cnkgPSB7XG4gICAgICAgICAgY2FwdHVyZWRfYXQ6IERhdGUubm93KCksXG4gICAgICAgICAgc25hcHNob3Q6IGNyZWF0ZVNuYXBzaG90KHNlc3Npb24pLFxuICAgICAgICB9O1xuXG4gICAgICAgIGZpbHRlcmVkLnB1c2gobmV3RW50cnkpO1xuXG4gICAgICAgIC8vIFNvcnQgbmV3ZXN0LWZpcnN0IChkZXNjZW5kaW5nIGNhcHR1cmVkX2F0KVxuICAgICAgICBmaWx0ZXJlZC5zb3J0KChhLCBiKSA9PiBiLmNhcHR1cmVkX2F0IC0gYS5jYXB0dXJlZF9hdCk7XG5cbiAgICAgICAgLy8gRW5mb3JjZSBjYXAgXHUyMDE0IHNsaWNlIGtlZXBzIHRoZSBuZXdlc3QgTUFYX1NFU1NJT05TIGVudHJpZXNcbiAgICAgICAgY29uc3QgY2FwcGVkID0gZmlsdGVyZWQuc2xpY2UoMCwgTUFYX1NFU1NJT05TKTtcblxuICAgICAgICBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoXG4gICAgICAgICAgeyBbU1RPUkFHRV9LRVlTLlNFU1NJT05fSElTVE9SWV06IGNhcHBlZCB9LFxuICAgICAgICAgICgpID0+IHtcbiAgICAgICAgICAgIGlmIChjaHJvbWUucnVudGltZS5sYXN0RXJyb3IpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHJlamVjdChuZXcgRXJyb3IoY2hyb21lLnJ1bnRpbWUubGFzdEVycm9yLm1lc3NhZ2UpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgICB9XG4gICAgKTtcbiAgfSk7XG59XG5cbi8qKlxuICogTWFwIHN0b3JhZ2UgZXJyb3Igc3RyaW5ncyB0byB1c2VyLWZyaWVuZGx5IG1lc3NhZ2VzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0SGlzdG9yeUVycm9yTWVzc2FnZShlcnJvcjogc3RyaW5nKTogc3RyaW5nIHtcbiAgaWYgKC9RVU9UQV9CWVRFU3xxdW90YS9pLnRlc3QoZXJyb3IpKSB7XG4gICAgcmV0dXJuIFwiU3RvcmFnZSBmdWxsIC0tIG9sZGVzdCBzZXNzaW9ucyB3aWxsIGJlIGNsZWFyZWRcIjtcbiAgfVxuICByZXR1cm4gXCJDb3VsZCBub3Qgc2F2ZSB0byBzZXNzaW9uIGhpc3RvcnlcIjtcbn1cbiIsICIvKipcbiAqIFBvcnRhbCBwZXJtaXNzaW9uIGhlbHBlcnMgZm9yIFRyYWNrbWFuIEFQSSBhY2Nlc3MuXG4gKiBTaGFyZWQgYnkgcG9wdXAgKHJlcXVlc3QgKyBjaGVjaykgYW5kIHNlcnZpY2Ugd29ya2VyIChjaGVjayBvbmx5KS5cbiAqL1xuXG5leHBvcnQgY29uc3QgUE9SVEFMX09SSUdJTlM6IHJlYWRvbmx5IHN0cmluZ1tdID0gW1xuICBcImh0dHBzOi8vYXBpLnRyYWNrbWFuZ29sZi5jb20vKlwiLFxuICBcImh0dHBzOi8vcG9ydGFsLnRyYWNrbWFuZ29sZi5jb20vKlwiLFxuXSBhcyBjb25zdDtcblxuLyoqIFJldHVybnMgdHJ1ZSBpZiBwb3J0YWwgaG9zdCBwZXJtaXNzaW9ucyBhcmUgY3VycmVudGx5IGdyYW50ZWQuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaGFzUG9ydGFsUGVybWlzc2lvbigpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgcmV0dXJuIGNocm9tZS5wZXJtaXNzaW9ucy5jb250YWlucyh7IG9yaWdpbnM6IFsuLi5QT1JUQUxfT1JJR0lOU10gfSk7XG59XG5cbi8qKlxuICogUmVxdWVzdHMgcG9ydGFsIGhvc3QgcGVybWlzc2lvbnMgZnJvbSB0aGUgdXNlci5cbiAqIE1VU1QgYmUgY2FsbGVkIGZyb20gYSB1c2VyIGdlc3R1cmUgKGJ1dHRvbiBjbGljayBoYW5kbGVyKS5cbiAqIFJldHVybnMgdHJ1ZSBpZiBncmFudGVkLCBmYWxzZSBpZiBkZW5pZWQuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZXF1ZXN0UG9ydGFsUGVybWlzc2lvbigpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgcmV0dXJuIGNocm9tZS5wZXJtaXNzaW9ucy5yZXF1ZXN0KHsgb3JpZ2luczogWy4uLlBPUlRBTF9PUklHSU5TXSB9KTtcbn1cbiIsICIvKipcbiAqIEdyYXBoUUwgY2xpZW50IGZvciBUcmFja21hbiBBUEkuXG4gKiBTZW5kcyBhdXRoZW50aWNhdGVkIHJlcXVlc3RzIHVzaW5nIGJyb3dzZXIgc2Vzc2lvbiBjb29raWVzIChjcmVkZW50aWFsczogaW5jbHVkZSkuXG4gKiBTaGFyZWQgYnkgc2VydmljZSB3b3JrZXIgYW5kIHBvcHVwLlxuICovXG5cbmV4cG9ydCBjb25zdCBHUkFQSFFMX0VORFBPSU5UID0gXCJodHRwczovL2FwaS50cmFja21hbmdvbGYuY29tL2dyYXBocWxcIjtcblxuZXhwb3J0IGNvbnN0IEhFQUxUSF9DSEVDS19RVUVSWSA9IGBxdWVyeSBIZWFsdGhDaGVjayB7IG1lIHsgX190eXBlbmFtZSB9IH1gO1xuXG4vKiogU3RhbmRhcmQgR3JhcGhRTCByZXNwb25zZSBlbnZlbG9wZS4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgR3JhcGhRTFJlc3BvbnNlPFQ+IHtcbiAgZGF0YTogVCB8IG51bGw7XG4gIGVycm9ycz86IEFycmF5PHtcbiAgICBtZXNzYWdlOiBzdHJpbmc7XG4gICAgZXh0ZW5zaW9ucz86IHsgY29kZT86IHN0cmluZyB9O1xuICB9Pjtcbn1cblxuLyoqIEF1dGggY2xhc3NpZmljYXRpb24gcmVzdWx0IHJldHVybmVkIGJ5IGNsYXNzaWZ5QXV0aFJlc3VsdC4gKi9cbmV4cG9ydCB0eXBlIEF1dGhTdGF0dXMgPVxuICB8IHsga2luZDogXCJhdXRoZW50aWNhdGVkXCIgfVxuICB8IHsga2luZDogXCJ1bmF1dGhlbnRpY2F0ZWRcIiB9XG4gIHwgeyBraW5kOiBcImVycm9yXCI7IG1lc3NhZ2U6IHN0cmluZyB9O1xuXG4vKipcbiAqIEV4ZWN1dGVzIGEgR3JhcGhRTCBxdWVyeSBhZ2FpbnN0IHRoZSBUcmFja21hbiBBUEkuXG4gKiBVc2VzIGNyZWRlbnRpYWxzOiBcImluY2x1ZGVcIiBzbyB0aGUgYnJvd3NlciBzZW5kcyBleGlzdGluZyBzZXNzaW9uIGNvb2tpZXMuXG4gKiBUaHJvd3MgaWYgdGhlIEhUVFAgcmVzcG9uc2UgaXMgbm90IDJ4eC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGV4ZWN1dGVRdWVyeTxUPihcbiAgcXVlcnk6IHN0cmluZyxcbiAgdmFyaWFibGVzPzogUmVjb3JkPHN0cmluZywgdW5rbm93bj5cbik6IFByb21pc2U8R3JhcGhRTFJlc3BvbnNlPFQ+PiB7XG4gIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goR1JBUEhRTF9FTkRQT0lOVCwge1xuICAgIG1ldGhvZDogXCJQT1NUXCIsXG4gICAgY3JlZGVudGlhbHM6IFwiaW5jbHVkZVwiLFxuICAgIGhlYWRlcnM6IHsgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIgfSxcbiAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IHF1ZXJ5LCB2YXJpYWJsZXMgfSksXG4gIH0pO1xuXG4gIGlmICghcmVzcG9uc2Uub2spIHtcbiAgICBjb25zdCBib2R5ID0gYXdhaXQgcmVzcG9uc2UudGV4dCgpLmNhdGNoKCgpID0+IFwiKG5vIGJvZHkpXCIpO1xuICAgIGNvbnNvbGUuZXJyb3IoYFRyYWNrUHVsbDogR3JhcGhRTCAke3Jlc3BvbnNlLnN0YXR1c30gcmVzcG9uc2U6YCwgYm9keSk7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBIVFRQICR7cmVzcG9uc2Uuc3RhdHVzfTogJHtib2R5LnNsaWNlKDAsIDIwMCl9YCk7XG4gIH1cblxuICByZXR1cm4gcmVzcG9uc2UuanNvbigpIGFzIFByb21pc2U8R3JhcGhRTFJlc3BvbnNlPFQ+Pjtcbn1cblxuLyoqXG4gKiBDbGFzc2lmaWVzIGEgR3JhcGhRTCByZXNwb25zZSBmcm9tIHRoZSBoZWFsdGgtY2hlY2sgcXVlcnkgaW50byBhbiBBdXRoU3RhdHVzLlxuICpcbiAqIENsYXNzaWZpY2F0aW9uIHByaW9yaXR5OlxuICogMS4gRXJyb3JzIHByZXNlbnQgYW5kIG5vbi1lbXB0eSBcdTIxOTIgY2hlY2sgZm9yIGF1dGggZXJyb3IgcGF0dGVybnMgXHUyMTkyIGVsc2UgZ2VuZXJpYyBlcnJvclxuICogMi4gTm8gZXJyb3JzIGJ1dCBkYXRhLm1lIGlzIGZhbHN5IFx1MjE5MiB1bmF1dGhlbnRpY2F0ZWRcbiAqIDMuIGRhdGEubWUgaXMgdHJ1dGh5IChoYXMgX190eXBlbmFtZSkgXHUyMTkyIGF1dGhlbnRpY2F0ZWRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNsYXNzaWZ5QXV0aFJlc3VsdChcbiAgcmVzdWx0OiBHcmFwaFFMUmVzcG9uc2U8eyBtZTogeyBfX3R5cGVuYW1lOiBzdHJpbmcgfSB8IG51bGwgfT5cbik6IEF1dGhTdGF0dXMge1xuICBpZiAocmVzdWx0LmVycm9ycyAmJiByZXN1bHQuZXJyb3JzLmxlbmd0aCA+IDApIHtcbiAgICBjb25zdCBjb2RlID0gcmVzdWx0LmVycm9yc1swXS5leHRlbnNpb25zPy5jb2RlID8/IFwiXCI7XG4gICAgY29uc3QgbXNnID0gcmVzdWx0LmVycm9yc1swXS5tZXNzYWdlID8/IFwiXCI7XG4gICAgY29uc3QgbXNnTG93ZXIgPSBtc2cudG9Mb3dlckNhc2UoKTtcblxuICAgIGlmIChcbiAgICAgIGNvZGUgPT09IFwiVU5BVVRIRU5USUNBVEVEXCIgfHxcbiAgICAgIG1zZ0xvd2VyLmluY2x1ZGVzKFwidW5hdXRob3JpemVkXCIpIHx8XG4gICAgICBtc2dMb3dlci5pbmNsdWRlcyhcInVuYXV0aGVudGljYXRlZFwiKSB8fFxuICAgICAgbXNnTG93ZXIuaW5jbHVkZXMoXCJub3QgbG9nZ2VkIGluXCIpXG4gICAgKSB7XG4gICAgICByZXR1cm4geyBraW5kOiBcInVuYXV0aGVudGljYXRlZFwiIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIHsga2luZDogXCJlcnJvclwiLCBtZXNzYWdlOiBcIlVuYWJsZSB0byByZWFjaCBUcmFja21hbiBcdTIwMTQgdHJ5IGFnYWluIGxhdGVyXCIgfTtcbiAgfVxuXG4gIGlmICghcmVzdWx0LmRhdGE/Lm1lPy5fX3R5cGVuYW1lKSB7XG4gICAgcmV0dXJuIHsga2luZDogXCJ1bmF1dGhlbnRpY2F0ZWRcIiB9O1xuICB9XG5cbiAgcmV0dXJuIHsga2luZDogXCJhdXRoZW50aWNhdGVkXCIgfTtcbn1cbiIsICIvKipcbiAqIFBvcnRhbCBHcmFwaFFMIGFjdGl2aXR5IHBhcnNlci5cbiAqXG4gKiBDb252ZXJ0cyBHcmFwaFFMIGFjdGl2aXR5IHJlc3BvbnNlcyAoZnJvbSBQaGFzZSAyMiBncmFwaHFsX2NsaWVudCkgaW50byB0aGVcbiAqIGV4aXN0aW5nIFNlc3Npb25EYXRhIGZvcm1hdCwgZW5hYmxpbmcgcG9ydGFsLWZldGNoZWQgZGF0YSB0byBmbG93IGludG8gdGhlXG4gKiBDU1YgZXhwb3J0LCBBSSBhbmFseXNpcywgYW5kIHNlc3Npb24gaGlzdG9yeSBwaXBlbGluZS5cbiAqXG4gKiBLZXkgZGVzaWduIGRlY2lzaW9uczpcbiAqIC0gR1JBUEhRTF9NRVRSSUNfQUxJQVMgbWFwcyBhbGwgMjkga25vd24gY2FtZWxDYXNlIEdyYXBoUUwgZmllbGQgbmFtZXMgdG9cbiAqICAgUGFzY2FsQ2FzZSBNRVRSSUNfS0VZUyBuYW1lcy4gVW5rbm93biBmaWVsZHMgYXJlIG5vcm1hbGl6ZWQgdmlhIHRvUGFzY2FsQ2FzZS5cbiAqIC0gRG9lcyBOT1QgaW1wb3J0IE1FVFJJQ19LRVlTIGZyb20gaW50ZXJjZXB0b3IudHMgdG8gYXZvaWQgYWNjaWRlbnRhbGx5XG4gKiAgIGZpbHRlcmluZyB1bmtub3duIGZ1dHVyZSBmaWVsZHMgKEQtMDEgYW50aS1wYXR0ZXJuKS5cbiAqIC0gTnVsbC91bmRlZmluZWQvTmFOIHZhbHVlcyBhcmUgb21pdHRlZCBcdTIwMTQgbm8gcGhhbnRvbSBlbXB0eSBtZXRyaWNzLlxuICogLSBNZXRyaWMgdmFsdWVzIGFyZSBzdG9yZWQgYXMgc3RyaW5ncyBmb3IgY29uc2lzdGVuY3kgd2l0aCBpbnRlcmNlcHRvciBvdXRwdXQuXG4gKiAtIHJlcG9ydF9pZCBpcyB0aGUgVVVJRCBkZWNvZGVkIGZyb20gdGhlIGJhc2U2NCBhY3Rpdml0eSBJRCAoUElQRS0wMyBkZWR1cCkuXG4gKi9cblxuaW1wb3J0IHR5cGUgeyBTZXNzaW9uRGF0YSwgU2hvdCwgQ2x1Ykdyb3VwIH0gZnJvbSBcIi4uL21vZGVscy90eXBlc1wiO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIEV4cG9ydGVkIHR5cGVzICh1c2VkIGJ5IFBoYXNlIDI0IGludGVncmF0aW9uKVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmV4cG9ydCBpbnRlcmZhY2UgU3Ryb2tlTWVhc3VyZW1lbnQge1xuICBba2V5OiBzdHJpbmddOiBudW1iZXIgfCBudWxsIHwgdW5kZWZpbmVkO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEdyYXBoUUxTdHJva2Uge1xuICBjbHViPzogc3RyaW5nIHwgbnVsbDtcbiAgdGltZT86IHN0cmluZyB8IG51bGw7XG4gIHRhcmdldERpc3RhbmNlPzogbnVtYmVyIHwgbnVsbDtcbiAgbWVhc3VyZW1lbnQ/OiBTdHJva2VNZWFzdXJlbWVudCB8IG51bGw7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgR3JhcGhRTEFjdGl2aXR5IHtcbiAgaWQ6IHN0cmluZztcbiAgdGltZT86IHN0cmluZyB8IG51bGw7XG4gIHN0cm9rZUNvdW50PzogbnVtYmVyIHwgbnVsbDtcbiAgc3Ryb2tlcz86IEdyYXBoUUxTdHJva2VbXSB8IG51bGw7XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gR1JBUEhRTF9NRVRSSUNfQUxJQVMgXHUyMDE0IGFsbCAyOSBNRVRSSUNfS0VZUyBmcm9tIGNhbWVsQ2FzZSB0byBQYXNjYWxDYXNlXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuY29uc3QgR1JBUEhRTF9NRVRSSUNfQUxJQVM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XG4gIGNsdWJTcGVlZDogXCJDbHViU3BlZWRcIixcbiAgYmFsbFNwZWVkOiBcIkJhbGxTcGVlZFwiLFxuICBzbWFzaEZhY3RvcjogXCJTbWFzaEZhY3RvclwiLFxuICBhdHRhY2tBbmdsZTogXCJBdHRhY2tBbmdsZVwiLFxuICBjbHViUGF0aDogXCJDbHViUGF0aFwiLFxuICBmYWNlQW5nbGU6IFwiRmFjZUFuZ2xlXCIsXG4gIGZhY2VUb1BhdGg6IFwiRmFjZVRvUGF0aFwiLFxuICBzd2luZ0RpcmVjdGlvbjogXCJTd2luZ0RpcmVjdGlvblwiLFxuICBzd2luZ1BsYW5lOiBcIlN3aW5nUGxhbmVcIixcbiAgZHluYW1pY0xvZnQ6IFwiRHluYW1pY0xvZnRcIixcbiAgc3BpblJhdGU6IFwiU3BpblJhdGVcIixcbiAgc3BpbkF4aXM6IFwiU3BpbkF4aXNcIixcbiAgc3BpbkxvZnQ6IFwiU3BpbkxvZnRcIixcbiAgbGF1bmNoQW5nbGU6IFwiTGF1bmNoQW5nbGVcIixcbiAgbGF1bmNoRGlyZWN0aW9uOiBcIkxhdW5jaERpcmVjdGlvblwiLFxuICBjYXJyeTogXCJDYXJyeVwiLFxuICB0b3RhbDogXCJUb3RhbFwiLFxuICBzaWRlOiBcIlNpZGVcIixcbiAgc2lkZVRvdGFsOiBcIlNpZGVUb3RhbFwiLFxuICBjYXJyeVNpZGU6IFwiQ2FycnlTaWRlXCIsXG4gIHRvdGFsU2lkZTogXCJUb3RhbFNpZGVcIixcbiAgaGVpZ2h0OiBcIkhlaWdodFwiLFxuICBtYXhIZWlnaHQ6IFwiTWF4SGVpZ2h0XCIsXG4gIGN1cnZlOiBcIkN1cnZlXCIsXG4gIGxhbmRpbmdBbmdsZTogXCJMYW5kaW5nQW5nbGVcIixcbiAgaGFuZ1RpbWU6IFwiSGFuZ1RpbWVcIixcbiAgbG93UG9pbnREaXN0YW5jZTogXCJMb3dQb2ludERpc3RhbmNlXCIsXG4gIGltcGFjdEhlaWdodDogXCJJbXBhY3RIZWlnaHRcIixcbiAgaW1wYWN0T2Zmc2V0OiBcIkltcGFjdE9mZnNldFwiLFxuICB0ZW1wbzogXCJUZW1wb1wiLFxufTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBIZWxwZXIgZnVuY3Rpb25zXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuLyoqIENvbnZlcnQgZmlyc3QgY2hhcmFjdGVyIHRvIHVwcGVyY2FzZSBcdTIwMTQgdXNlZCBmb3IgdW5rbm93biBmaWVsZHMgYmV5b25kIE1FVFJJQ19LRVlTLiAqL1xuZnVuY3Rpb24gdG9QYXNjYWxDYXNlKGtleTogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGtleS5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIGtleS5zbGljZSgxKTtcbn1cblxuLyoqIFJlc29sdmUgYSBHcmFwaFFMIGNhbWVsQ2FzZSBmaWVsZCBuYW1lIHRvIGl0cyBjYW5vbmljYWwgUGFzY2FsQ2FzZSBtZXRyaWMga2V5LiAqL1xuZnVuY3Rpb24gbm9ybWFsaXplTWV0cmljS2V5KGdyYXBocWxLZXk6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBHUkFQSFFMX01FVFJJQ19BTElBU1tncmFwaHFsS2V5XSA/PyB0b1Bhc2NhbENhc2UoZ3JhcGhxbEtleSk7XG59XG5cbi8qKlxuICogRGVjb2RlIGEgVHJhY2ttYW4gYmFzZTY0IGFjdGl2aXR5IElEIHRvIGV4dHJhY3QgdGhlIFVVSUQgcG9ydGlvbi5cbiAqXG4gKiBUcmFja21hbiBlbmNvZGVzIGFjdGl2aXR5IElEcyBhczogYnRvYShcIlNlc3Npb25BY3Rpdml0eVxcbjx1dWlkPlwiKVxuICogUmV0dXJucyB0aGUgcmF3IGlucHV0IHN0cmluZyBpZiBkZWNvZGluZyBmYWlscyBvciBubyBuZXdsaW5lIGlzIGZvdW5kLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZXh0cmFjdEFjdGl2aXR5VXVpZChiYXNlNjRJZDogc3RyaW5nKTogc3RyaW5nIHtcbiAgdHJ5IHtcbiAgICBjb25zdCBkZWNvZGVkID0gYXRvYihiYXNlNjRJZCk7XG4gICAgY29uc3QgcGFydHMgPSBkZWNvZGVkLnNwbGl0KFwiXFxuXCIpO1xuICAgIGNvbnN0IHV1aWQgPSBwYXJ0c1sxXT8udHJpbSgpO1xuICAgIGlmICghdXVpZCkgcmV0dXJuIGJhc2U2NElkO1xuICAgIHJldHVybiB1dWlkO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gYmFzZTY0SWQ7XG4gIH1cbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBNYWluIGV4cG9ydGVkIHBhcnNlclxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbi8qKlxuICogQ29udmVydCBhIEdyYXBoUUwgYWN0aXZpdHkgcmVzcG9uc2UgaW50byB0aGUgU2Vzc2lvbkRhdGEgZm9ybWF0LlxuICpcbiAqIFJldHVybnMgbnVsbCBpZiB0aGUgYWN0aXZpdHkgaXMgbWFsZm9ybWVkLCBtaXNzaW5nIGFuIElELCBvciBwcm9kdWNlcyBub1xuICogdmFsaWQgY2x1YiBncm91cHMgYWZ0ZXIgZmlsdGVyaW5nIGVtcHR5L251bGwgc3Ryb2tlcy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlUG9ydGFsQWN0aXZpdHkoXG4gIGFjdGl2aXR5OiBHcmFwaFFMQWN0aXZpdHlcbik6IFNlc3Npb25EYXRhIHwgbnVsbCB7XG4gIHRyeSB7XG4gICAgaWYgKCFhY3Rpdml0eT8uaWQpIHJldHVybiBudWxsO1xuXG4gICAgY29uc3QgcmVwb3J0SWQgPSBleHRyYWN0QWN0aXZpdHlVdWlkKGFjdGl2aXR5LmlkKTtcbiAgICBjb25zdCBkYXRlID0gYWN0aXZpdHkudGltZSA/PyBcIlVua25vd25cIjtcbiAgICBjb25zdCBhbGxNZXRyaWNOYW1lcyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuXG4gICAgLy8gR3JvdXAgZmxhdCBzdHJva2VzIGJ5IGNsdWIgbmFtZVxuICAgIGNvbnN0IGNsdWJNYXAgPSBuZXcgTWFwPHN0cmluZywgU2hvdFtdPigpO1xuXG4gICAgZm9yIChjb25zdCBzdHJva2Ugb2YgYWN0aXZpdHkuc3Ryb2tlcyA/PyBbXSkge1xuICAgICAgaWYgKCFzdHJva2U/Lm1lYXN1cmVtZW50KSBjb250aW51ZTtcblxuICAgICAgY29uc3QgY2x1Yk5hbWUgPSBzdHJva2UuY2x1YiB8fCBcIlVua25vd25cIjtcbiAgICAgIGNvbnN0IHNob3RNZXRyaWNzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge307XG5cbiAgICAgIGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKHN0cm9rZS5tZWFzdXJlbWVudCkpIHtcbiAgICAgICAgaWYgKHZhbHVlID09PSBudWxsIHx8IHZhbHVlID09PSB1bmRlZmluZWQpIGNvbnRpbnVlO1xuXG4gICAgICAgIGNvbnN0IG51bVZhbHVlID1cbiAgICAgICAgICB0eXBlb2YgdmFsdWUgPT09IFwibnVtYmVyXCIgPyB2YWx1ZSA6IHBhcnNlRmxvYXQoU3RyaW5nKHZhbHVlKSk7XG4gICAgICAgIGlmIChpc05hTihudW1WYWx1ZSkpIGNvbnRpbnVlO1xuXG4gICAgICAgIGNvbnN0IG5vcm1hbGl6ZWRLZXkgPSBub3JtYWxpemVNZXRyaWNLZXkoa2V5KTtcbiAgICAgICAgc2hvdE1ldHJpY3Nbbm9ybWFsaXplZEtleV0gPSBgJHtudW1WYWx1ZX1gO1xuICAgICAgICBhbGxNZXRyaWNOYW1lcy5hZGQobm9ybWFsaXplZEtleSk7XG4gICAgICB9XG5cbiAgICAgIGlmIChPYmplY3Qua2V5cyhzaG90TWV0cmljcykubGVuZ3RoID4gMCkge1xuICAgICAgICBjb25zdCBzaG90cyA9IGNsdWJNYXAuZ2V0KGNsdWJOYW1lKSA/PyBbXTtcbiAgICAgICAgc2hvdHMucHVzaCh7XG4gICAgICAgICAgc2hvdF9udW1iZXI6IHNob3RzLmxlbmd0aCArIDEsXG4gICAgICAgICAgbWV0cmljczogc2hvdE1ldHJpY3MsXG4gICAgICAgIH0pO1xuICAgICAgICBjbHViTWFwLnNldChjbHViTmFtZSwgc2hvdHMpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChjbHViTWFwLnNpemUgPT09IDApIHJldHVybiBudWxsO1xuXG4gICAgY29uc3QgY2x1Yl9ncm91cHM6IENsdWJHcm91cFtdID0gW107XG4gICAgZm9yIChjb25zdCBbY2x1Yk5hbWUsIHNob3RzXSBvZiBjbHViTWFwKSB7XG4gICAgICBjbHViX2dyb3Vwcy5wdXNoKHtcbiAgICAgICAgY2x1Yl9uYW1lOiBjbHViTmFtZSxcbiAgICAgICAgc2hvdHMsXG4gICAgICAgIGF2ZXJhZ2VzOiB7fSxcbiAgICAgICAgY29uc2lzdGVuY3k6IHt9LFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgY29uc3Qgc2Vzc2lvbjogU2Vzc2lvbkRhdGEgPSB7XG4gICAgICBkYXRlLFxuICAgICAgcmVwb3J0X2lkOiByZXBvcnRJZCxcbiAgICAgIHVybF90eXBlOiBcImFjdGl2aXR5XCIsXG4gICAgICBjbHViX2dyb3VwcyxcbiAgICAgIG1ldHJpY19uYW1lczogQXJyYXkuZnJvbShhbGxNZXRyaWNOYW1lcykuc29ydCgpLFxuICAgICAgbWV0YWRhdGFfcGFyYW1zOiB7IGFjdGl2aXR5X2lkOiBhY3Rpdml0eS5pZCB9LFxuICAgIH07XG5cbiAgICByZXR1cm4gc2Vzc2lvbjtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgY29uc29sZS5lcnJvcihcIltwb3J0YWxfcGFyc2VyXSBGYWlsZWQgdG8gcGFyc2UgYWN0aXZpdHk6XCIsIGVycik7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cbiIsICIvKipcbiAqIEltcG9ydCBzdGF0dXMgdHlwZXMgYW5kIEdyYXBoUUwgcXVlcmllcyBmb3IgcG9ydGFsIHNlc3Npb24gaW1wb3J0LlxuICogUGVyIEQtMDE6IHNpbXBsZSByZXN1bHQtb25seSBzdGF0dXMgXHUyMDE0IGlkbGUvaW1wb3J0aW5nL3N1Y2Nlc3MvZXJyb3IuXG4gKi9cblxuLyoqIEltcG9ydCBzdGF0dXMgc3RvcmVkIGluIGNocm9tZS5zdG9yYWdlLmxvY2FsIHVuZGVyIFNUT1JBR0VfS0VZUy5JTVBPUlRfU1RBVFVTLiBQZXIgRC0wMS4gKi9cbmV4cG9ydCB0eXBlIEltcG9ydFN0YXR1cyA9XG4gIHwgeyBzdGF0ZTogXCJpZGxlXCIgfVxuICB8IHsgc3RhdGU6IFwiaW1wb3J0aW5nXCIgfVxuICB8IHsgc3RhdGU6IFwic3VjY2Vzc1wiIH1cbiAgfCB7IHN0YXRlOiBcImVycm9yXCI7IG1lc3NhZ2U6IHN0cmluZyB9O1xuXG4vKiogQWN0aXZpdHkgc3VtbWFyeSByZXR1cm5lZCBieSBGRVRDSF9BQ1RJVklUSUVTIGhhbmRsZXIuICovXG5leHBvcnQgaW50ZXJmYWNlIEFjdGl2aXR5U3VtbWFyeSB7XG4gIGlkOiBzdHJpbmc7XG4gIGRhdGU6IHN0cmluZztcbiAgc3Ryb2tlQ291bnQ6IG51bWJlciB8IG51bGw7ICAvLyBudWxsIGlmIGZpZWxkIHVuYXZhaWxhYmxlIGZyb20gQVBJXG4gIHR5cGU6IHN0cmluZyB8IG51bGw7ICAgICAgICAgLy8gbnVsbCBpZiBmaWVsZCB1bmF2YWlsYWJsZSBmcm9tIEFQSVxufVxuXG4vKipcbiAqIEZldGNoIHJlY2VudCBhY3Rpdml0aWVzIHZpYSBtZS5hY3Rpdml0aWVzLlxuICogQVBJIGZpZWxkIG5hbWVzOiB0aW1lIChJU08gZGF0ZSksIGtpbmQgKGFjdGl2aXR5IHR5cGUpLCBzdHJva2VDb3VudC5cbiAqIFNlcnZpY2Ugd29ya2VyIG1hcHMgdGltZVx1MjE5MmRhdGUsIGtpbmRcdTIxOTJ0eXBlIGZvciBBY3Rpdml0eVN1bW1hcnkuXG4gKi9cbmV4cG9ydCBjb25zdCBGRVRDSF9BQ1RJVklUSUVTX1FVRVJZID0gYFxuICBxdWVyeSBHZXRQbGF5ZXJBY3Rpdml0aWVzIHtcbiAgICBtZSB7XG4gICAgICBhY3Rpdml0aWVzIHtcbiAgICAgICAgaWRcbiAgICAgICAgdGltZVxuICAgICAgICBzdHJva2VDb3VudFxuICAgICAgICBraW5kXG4gICAgICB9XG4gICAgfVxuICB9XG5gO1xuXG4vKipcbiAqIEZldGNoIGEgc2luZ2xlIGFjdGl2aXR5IGJ5IElEIHdpdGggZnVsbCBzdHJva2UgZGF0YS5cbiAqIFRoZSBub2RlKGlkOikgcXVlcnkgb24gYmFzZTY0LWVuY29kZWQgU2Vzc2lvbkFjdGl2aXR5IElEcyB3YXMgY29uZmlybWVkXG4gKiB3b3JraW5nIGR1cmluZyBQaGFzZSAyMiByZXNlYXJjaC5cbiAqIEFQSSB1c2VzIGZsYXQgc3Ryb2tlcyAoZWFjaCBzdHJva2UgaGFzIGl0cyBvd24gY2x1YiBmaWVsZCkuXG4gKi9cbmV4cG9ydCBjb25zdCBJTVBPUlRfU0VTU0lPTl9RVUVSWSA9IGBcbiAgcXVlcnkgRmV0Y2hBY3Rpdml0eUJ5SWQoJGlkOiBJRCEpIHtcbiAgICBub2RlKGlkOiAkaWQpIHtcbiAgICAgIC4uLiBvbiBTZXNzaW9uQWN0aXZpdHkge1xuICAgICAgICBpZFxuICAgICAgICB0aW1lXG4gICAgICAgIHN0cm9rZUNvdW50XG4gICAgICAgIHN0cm9rZXMge1xuICAgICAgICAgIGNsdWJcbiAgICAgICAgICB0aW1lXG4gICAgICAgICAgdGFyZ2V0RGlzdGFuY2VcbiAgICAgICAgICBtZWFzdXJlbWVudCB7XG4gICAgICAgICAgICBjbHViU3BlZWQgYmFsbFNwZWVkIHNtYXNoRmFjdG9yIGF0dGFja0FuZ2xlIGNsdWJQYXRoIGZhY2VBbmdsZVxuICAgICAgICAgICAgZmFjZVRvUGF0aCBzd2luZ0RpcmVjdGlvbiBzd2luZ1BsYW5lIGR5bmFtaWNMb2Z0IHNwaW5SYXRlIHNwaW5BeGlzIHNwaW5Mb2Z0XG4gICAgICAgICAgICBsYXVuY2hBbmdsZSBsYXVuY2hEaXJlY3Rpb24gY2FycnkgdG90YWwgY2FycnlTaWRlIHRvdGFsU2lkZVxuICAgICAgICAgICAgbWF4SGVpZ2h0IGxhbmRpbmdBbmdsZSBoYW5nVGltZVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuYDtcbiIsICIvKipcbiAqIFNlcnZpY2UgV29ya2VyIGZvciBUcmFja1B1bGwgQ2hyb21lIEV4dGVuc2lvblxuICovXG5cbmltcG9ydCB7IFNUT1JBR0VfS0VZUyB9IGZyb20gXCIuLi9zaGFyZWQvY29uc3RhbnRzXCI7XG5pbXBvcnQgeyB3cml0ZUNzdiB9IGZyb20gXCIuLi9zaGFyZWQvY3N2X3dyaXRlclwiO1xuaW1wb3J0IHR5cGUgeyBTZXNzaW9uRGF0YSB9IGZyb20gXCIuLi9tb2RlbHMvdHlwZXNcIjtcbmltcG9ydCB7IG1pZ3JhdGVMZWdhY3lQcmVmLCBERUZBVUxUX1VOSVRfQ0hPSUNFLCB0eXBlIFVuaXRDaG9pY2UsIHR5cGUgU3BlZWRVbml0LCB0eXBlIERpc3RhbmNlVW5pdCB9IGZyb20gXCIuLi9zaGFyZWQvdW5pdF9ub3JtYWxpemF0aW9uXCI7XG5pbXBvcnQgeyBzYXZlU2Vzc2lvblRvSGlzdG9yeSwgZ2V0SGlzdG9yeUVycm9yTWVzc2FnZSB9IGZyb20gXCIuLi9zaGFyZWQvaGlzdG9yeVwiO1xuaW1wb3J0IHsgaGFzUG9ydGFsUGVybWlzc2lvbiB9IGZyb20gXCIuLi9zaGFyZWQvcG9ydGFsUGVybWlzc2lvbnNcIjtcbmltcG9ydCB7IGV4ZWN1dGVRdWVyeSwgY2xhc3NpZnlBdXRoUmVzdWx0LCBIRUFMVEhfQ0hFQ0tfUVVFUlkgfSBmcm9tIFwiLi4vc2hhcmVkL2dyYXBocWxfY2xpZW50XCI7XG5pbXBvcnQgeyBwYXJzZVBvcnRhbEFjdGl2aXR5IH0gZnJvbSBcIi4uL3NoYXJlZC9wb3J0YWxfcGFyc2VyXCI7XG5pbXBvcnQgdHlwZSB7IEdyYXBoUUxBY3Rpdml0eSB9IGZyb20gXCIuLi9zaGFyZWQvcG9ydGFsX3BhcnNlclwiO1xuaW1wb3J0IHR5cGUgeyBJbXBvcnRTdGF0dXMsIEFjdGl2aXR5U3VtbWFyeSB9IGZyb20gXCIuLi9zaGFyZWQvaW1wb3J0X3R5cGVzXCI7XG5pbXBvcnQgeyBGRVRDSF9BQ1RJVklUSUVTX1FVRVJZLCBJTVBPUlRfU0VTU0lPTl9RVUVSWSB9IGZyb20gXCIuLi9zaGFyZWQvaW1wb3J0X3R5cGVzXCI7XG5cbmNocm9tZS5ydW50aW1lLm9uSW5zdGFsbGVkLmFkZExpc3RlbmVyKCgpID0+IHtcbiAgY29uc29sZS5sb2coXCJUcmFja1B1bGwgZXh0ZW5zaW9uIGluc3RhbGxlZFwiKTtcbn0pO1xuXG5pbnRlcmZhY2UgU2F2ZURhdGFSZXF1ZXN0IHtcbiAgdHlwZTogXCJTQVZFX0RBVEFcIjtcbiAgZGF0YTogU2Vzc2lvbkRhdGE7XG59XG5cbmludGVyZmFjZSBFeHBvcnRDc3ZSZXF1ZXN0IHtcbiAgdHlwZTogXCJFWFBPUlRfQ1NWX1JFUVVFU1RcIjtcbn1cblxuaW50ZXJmYWNlIEdldERhdGFSZXF1ZXN0IHtcbiAgdHlwZTogXCJHRVRfREFUQVwiO1xufVxuXG5pbnRlcmZhY2UgRmV0Y2hBY3Rpdml0aWVzUmVxdWVzdCB7XG4gIHR5cGU6IFwiRkVUQ0hfQUNUSVZJVElFU1wiO1xufVxuXG5pbnRlcmZhY2UgSW1wb3J0U2Vzc2lvblJlcXVlc3Qge1xuICB0eXBlOiBcIklNUE9SVF9TRVNTSU9OXCI7XG4gIGFjdGl2aXR5SWQ6IHN0cmluZztcbn1cblxuaW50ZXJmYWNlIFBvcnRhbEF1dGhDaGVja1JlcXVlc3Qge1xuICB0eXBlOiBcIlBPUlRBTF9BVVRIX0NIRUNLXCI7XG59XG5cbmZ1bmN0aW9uIGlzQXV0aEVycm9yKGVycm9yczogQXJyYXk8eyBtZXNzYWdlOiBzdHJpbmc7IGV4dGVuc2lvbnM/OiB7IGNvZGU/OiBzdHJpbmcgfSB9Pik6IGJvb2xlYW4ge1xuICBpZiAoZXJyb3JzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIGZhbHNlO1xuICBjb25zdCBjb2RlID0gZXJyb3JzWzBdLmV4dGVuc2lvbnM/LmNvZGUgPz8gXCJcIjtcbiAgY29uc3QgbXNnID0gZXJyb3JzWzBdLm1lc3NhZ2U/LnRvTG93ZXJDYXNlKCkgPz8gXCJcIjtcbiAgcmV0dXJuIGNvZGUgPT09IFwiVU5BVVRIRU5USUNBVEVEXCIgfHwgbXNnLmluY2x1ZGVzKFwidW5hdXRob3JpemVkXCIpIHx8IG1zZy5pbmNsdWRlcyhcInVuYXV0aGVudGljYXRlZFwiKSB8fCBtc2cuaW5jbHVkZXMoXCJub3QgbG9nZ2VkIGluXCIpO1xufVxuXG5mdW5jdGlvbiBnZXREb3dubG9hZEVycm9yTWVzc2FnZShvcmlnaW5hbEVycm9yOiBzdHJpbmcpOiBzdHJpbmcge1xuICBpZiAob3JpZ2luYWxFcnJvci5pbmNsdWRlcyhcImludmFsaWRcIikpIHtcbiAgICByZXR1cm4gXCJJbnZhbGlkIGRvd25sb2FkIGZvcm1hdFwiO1xuICB9XG4gIGlmIChvcmlnaW5hbEVycm9yLmluY2x1ZGVzKFwicXVvdGFcIikgfHwgb3JpZ2luYWxFcnJvci5pbmNsdWRlcyhcInNwYWNlXCIpKSB7XG4gICAgcmV0dXJuIFwiSW5zdWZmaWNpZW50IHN0b3JhZ2Ugc3BhY2VcIjtcbiAgfVxuICBpZiAob3JpZ2luYWxFcnJvci5pbmNsdWRlcyhcImJsb2NrZWRcIikgfHwgb3JpZ2luYWxFcnJvci5pbmNsdWRlcyhcInBvbGljeVwiKSkge1xuICAgIHJldHVybiBcIkRvd25sb2FkIGJsb2NrZWQgYnkgYnJvd3NlciBzZXR0aW5nc1wiO1xuICB9XG4gIHJldHVybiBvcmlnaW5hbEVycm9yO1xufVxuXG50eXBlIFJlcXVlc3RNZXNzYWdlID0gU2F2ZURhdGFSZXF1ZXN0IHwgRXhwb3J0Q3N2UmVxdWVzdCB8IEdldERhdGFSZXF1ZXN0IHwgRmV0Y2hBY3Rpdml0aWVzUmVxdWVzdCB8IEltcG9ydFNlc3Npb25SZXF1ZXN0IHwgUG9ydGFsQXV0aENoZWNrUmVxdWVzdDtcblxuY2hyb21lLnJ1bnRpbWUub25NZXNzYWdlLmFkZExpc3RlbmVyKChtZXNzYWdlOiBSZXF1ZXN0TWVzc2FnZSwgc2VuZGVyLCBzZW5kUmVzcG9uc2UpID0+IHtcbiAgaWYgKG1lc3NhZ2UudHlwZSA9PT0gXCJHRVRfREFUQVwiKSB7XG4gICAgY2hyb21lLnN0b3JhZ2UubG9jYWwuZ2V0KFtTVE9SQUdFX0tFWVMuVFJBQ0tNQU5fREFUQV0sIChyZXN1bHQpID0+IHtcbiAgICAgIHNlbmRSZXNwb25zZShyZXN1bHRbU1RPUkFHRV9LRVlTLlRSQUNLTUFOX0RBVEFdIHx8IG51bGwpO1xuICAgIH0pO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgaWYgKG1lc3NhZ2UudHlwZSA9PT0gXCJTQVZFX0RBVEFcIikge1xuICAgIGNvbnN0IHNlc3Npb25EYXRhID0gKG1lc3NhZ2UgYXMgU2F2ZURhdGFSZXF1ZXN0KS5kYXRhO1xuICAgIGNocm9tZS5zdG9yYWdlLmxvY2FsLnNldCh7IFtTVE9SQUdFX0tFWVMuVFJBQ0tNQU5fREFUQV06IHNlc3Npb25EYXRhIH0sICgpID0+IHtcbiAgICAgIGlmIChjaHJvbWUucnVudGltZS5sYXN0RXJyb3IpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIlRyYWNrUHVsbDogRmFpbGVkIHRvIHNhdmUgZGF0YTpcIiwgY2hyb21lLnJ1bnRpbWUubGFzdEVycm9yKTtcbiAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBjaHJvbWUucnVudGltZS5sYXN0RXJyb3IubWVzc2FnZSB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiVHJhY2tQdWxsOiBTZXNzaW9uIGRhdGEgc2F2ZWQgdG8gc3RvcmFnZVwiKTtcbiAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogdHJ1ZSB9KTtcblxuICAgICAgICAvLyBIaXN0b3J5IHNhdmUgLS0gZmlyZSBhbmQgZm9yZ2V0LCBuZXZlciBibG9ja3MgcHJpbWFyeSBmbG93XG4gICAgICAgIHNhdmVTZXNzaW9uVG9IaXN0b3J5KHNlc3Npb25EYXRhKS5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgICAgY29uc29sZS5lcnJvcihcIlRyYWNrUHVsbDogSGlzdG9yeSBzYXZlIGZhaWxlZDpcIiwgZXJyKTtcbiAgICAgICAgICBjb25zdCBtc2cgPSBnZXRIaXN0b3J5RXJyb3JNZXNzYWdlKGVyci5tZXNzYWdlKTtcbiAgICAgICAgICBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZSh7IHR5cGU6IFwiSElTVE9SWV9FUlJPUlwiLCBlcnJvcjogbXNnIH0pLmNhdGNoKCgpID0+IHtcbiAgICAgICAgICAgIC8vIFBvcHVwIG5vdCBvcGVuIC0tIGFscmVhZHkgbG9nZ2VkIHRvIGNvbnNvbGVcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBpZiAobWVzc2FnZS50eXBlID09PSBcIkVYUE9SVF9DU1ZfUkVRVUVTVFwiKSB7XG4gICAgY2hyb21lLnN0b3JhZ2UubG9jYWwuZ2V0KFtTVE9SQUdFX0tFWVMuVFJBQ0tNQU5fREFUQSwgU1RPUkFHRV9LRVlTLlNQRUVEX1VOSVQsIFNUT1JBR0VfS0VZUy5ESVNUQU5DRV9VTklULCBTVE9SQUdFX0tFWVMuSElUVElOR19TVVJGQUNFLCBTVE9SQUdFX0tFWVMuSU5DTFVERV9BVkVSQUdFUywgXCJ1bml0UHJlZmVyZW5jZVwiXSwgKHJlc3VsdCkgPT4ge1xuICAgICAgY29uc3QgZGF0YSA9IHJlc3VsdFtTVE9SQUdFX0tFWVMuVFJBQ0tNQU5fREFUQV0gYXMgU2Vzc2lvbkRhdGEgfCB1bmRlZmluZWQ7XG4gICAgICBpZiAoIWRhdGEgfHwgIWRhdGEuY2x1Yl9ncm91cHMgfHwgZGF0YS5jbHViX2dyb3Vwcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBcIk5vIGRhdGEgdG8gZXhwb3J0XCIgfSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdHJ5IHtcbiAgICAgICAgbGV0IHVuaXRDaG9pY2U6IFVuaXRDaG9pY2U7XG4gICAgICAgIGlmIChyZXN1bHRbU1RPUkFHRV9LRVlTLlNQRUVEX1VOSVRdICYmIHJlc3VsdFtTVE9SQUdFX0tFWVMuRElTVEFOQ0VfVU5JVF0pIHtcbiAgICAgICAgICB1bml0Q2hvaWNlID0ge1xuICAgICAgICAgICAgc3BlZWQ6IHJlc3VsdFtTVE9SQUdFX0tFWVMuU1BFRURfVU5JVF0gYXMgU3BlZWRVbml0LFxuICAgICAgICAgICAgZGlzdGFuY2U6IHJlc3VsdFtTVE9SQUdFX0tFWVMuRElTVEFOQ0VfVU5JVF0gYXMgRGlzdGFuY2VVbml0LFxuICAgICAgICAgIH07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdW5pdENob2ljZSA9IG1pZ3JhdGVMZWdhY3lQcmVmKHJlc3VsdFtcInVuaXRQcmVmZXJlbmNlXCJdIGFzIHN0cmluZyB8IHVuZGVmaW5lZCk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qgc3VyZmFjZSA9IChyZXN1bHRbU1RPUkFHRV9LRVlTLkhJVFRJTkdfU1VSRkFDRV0gYXMgXCJHcmFzc1wiIHwgXCJNYXRcIikgPz8gXCJNYXRcIjtcbiAgICAgICAgY29uc3QgaW5jbHVkZUF2ZXJhZ2VzID0gcmVzdWx0W1NUT1JBR0VfS0VZUy5JTkNMVURFX0FWRVJBR0VTXSA9PT0gdW5kZWZpbmVkXG4gICAgICAgICAgPyB0cnVlXG4gICAgICAgICAgOiBCb29sZWFuKHJlc3VsdFtTVE9SQUdFX0tFWVMuSU5DTFVERV9BVkVSQUdFU10pO1xuICAgICAgICBjb25zdCBjc3ZDb250ZW50ID0gd3JpdGVDc3YoZGF0YSwgaW5jbHVkZUF2ZXJhZ2VzLCB1bmRlZmluZWQsIHVuaXRDaG9pY2UsIHN1cmZhY2UpO1xuICAgICAgICBjb25zdCByYXdEYXRlID0gZGF0YS5kYXRlIHx8IFwidW5rbm93blwiO1xuICAgICAgICAvLyBTYW5pdGl6ZSBkYXRlIGZvciBmaWxlbmFtZSBcdTIwMTQgcmVtb3ZlIGNvbG9ucyBhbmQgY2hhcmFjdGVycyBpbnZhbGlkIGluIGZpbGVuYW1lc1xuICAgICAgICBjb25zdCBzYWZlRGF0ZSA9IHJhd0RhdGUucmVwbGFjZSgvWzouXS9nLCBcIi1cIikucmVwbGFjZSgvWy9cXFxcPyUqfFwiPD5dL2csIFwiXCIpO1xuICAgICAgICBjb25zdCBmaWxlbmFtZSA9IGBTaG90RGF0YV8ke3NhZmVEYXRlfS5jc3ZgO1xuXG4gICAgICAgIGNocm9tZS5kb3dubG9hZHMuZG93bmxvYWQoXG4gICAgICAgICAge1xuICAgICAgICAgICAgdXJsOiBgZGF0YTp0ZXh0L2NzdjtjaGFyc2V0PXV0Zi04LCR7ZW5jb2RlVVJJQ29tcG9uZW50KGNzdkNvbnRlbnQpfWAsXG4gICAgICAgICAgICBmaWxlbmFtZTogZmlsZW5hbWUsXG4gICAgICAgICAgICBzYXZlQXM6IGZhbHNlLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgKGRvd25sb2FkSWQpID0+IHtcbiAgICAgICAgICAgIGlmIChjaHJvbWUucnVudGltZS5sYXN0RXJyb3IpIHtcbiAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIlRyYWNrUHVsbDogRG93bmxvYWQgZmFpbGVkOlwiLCBjaHJvbWUucnVudGltZS5sYXN0RXJyb3IpO1xuICAgICAgICAgICAgICBjb25zdCBlcnJvck1lc3NhZ2UgPSBnZXREb3dubG9hZEVycm9yTWVzc2FnZShjaHJvbWUucnVudGltZS5sYXN0RXJyb3IubWVzc2FnZSk7XG4gICAgICAgICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3JNZXNzYWdlIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coYFRyYWNrUHVsbDogQ1NWIGV4cG9ydGVkIHdpdGggZG93bmxvYWQgSUQgJHtkb3dubG9hZElkfWApO1xuICAgICAgICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiB0cnVlLCBkb3dubG9hZElkLCBmaWxlbmFtZSB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBjb25zb2xlLmVycm9yKFwiVHJhY2tQdWxsOiBDU1YgZ2VuZXJhdGlvbiBmYWlsZWQ6XCIsIGVycm9yKTtcbiAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcikgfSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBpZiAobWVzc2FnZS50eXBlID09PSBcIlBPUlRBTF9BVVRIX0NIRUNLXCIpIHtcbiAgICAoYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgZ3JhbnRlZCA9IGF3YWl0IGhhc1BvcnRhbFBlcm1pc3Npb24oKTtcbiAgICAgIGlmICghZ3JhbnRlZCkge1xuICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiB0cnVlLCBzdGF0dXM6IFwiZGVuaWVkXCIgfSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGV4ZWN1dGVRdWVyeTx7IG1lOiB7IF9fdHlwZW5hbWU6IHN0cmluZyB9IHwgbnVsbCB9PihIRUFMVEhfQ0hFQ0tfUVVFUlkpO1xuICAgICAgICBjb25zdCBhdXRoU3RhdHVzID0gY2xhc3NpZnlBdXRoUmVzdWx0KHJlc3VsdCk7XG4gICAgICAgIGlmIChhdXRoU3RhdHVzLmtpbmQgPT09IFwiZXJyb3JcIikge1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJUcmFja1B1bGw6IEdyYXBoUUwgaGVhbHRoIGNoZWNrIGVycm9yOlwiLCBhdXRoU3RhdHVzLm1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgICAgIHNlbmRSZXNwb25zZSh7XG4gICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICBzdGF0dXM6IGF1dGhTdGF0dXMua2luZCxcbiAgICAgICAgICBtZXNzYWdlOiBhdXRoU3RhdHVzLmtpbmQgPT09IFwiZXJyb3JcIiA/IGF1dGhTdGF0dXMubWVzc2FnZSA6IHVuZGVmaW5lZCxcbiAgICAgICAgfSk7XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIlRyYWNrUHVsbDogR3JhcGhRTCBoZWFsdGggY2hlY2sgZmFpbGVkOlwiLCBlcnIpO1xuICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiB0cnVlLCBzdGF0dXM6IFwiZXJyb3JcIiwgbWVzc2FnZTogXCJVbmFibGUgdG8gcmVhY2ggVHJhY2ttYW4gXHUyMDE0IHRyeSBhZ2FpbiBsYXRlclwiIH0pO1xuICAgICAgfVxuICAgIH0pKCk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBpZiAobWVzc2FnZS50eXBlID09PSBcIkZFVENIX0FDVElWSVRJRVNcIikge1xuICAgIChhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBncmFudGVkID0gYXdhaXQgaGFzUG9ydGFsUGVybWlzc2lvbigpO1xuICAgICAgaWYgKCFncmFudGVkKSB7XG4gICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogXCJQb3J0YWwgcGVybWlzc2lvbiBub3QgZ3JhbnRlZFwiIH0pO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBleGVjdXRlUXVlcnk8e1xuICAgICAgICAgIG1lOiB7XG4gICAgICAgICAgICBhY3Rpdml0aWVzOiBBcnJheTx7XG4gICAgICAgICAgICAgIGlkOiBzdHJpbmc7IHRpbWU6IHN0cmluZzsgc3Ryb2tlQ291bnQ/OiBudW1iZXI7IGtpbmQ/OiBzdHJpbmc7XG4gICAgICAgICAgICB9PjtcbiAgICAgICAgICB9O1xuICAgICAgICB9PihGRVRDSF9BQ1RJVklUSUVTX1FVRVJZKTtcbiAgICAgICAgaWYgKHJlc3VsdC5lcnJvcnMgJiYgcmVzdWx0LmVycm9ycy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgaWYgKGlzQXV0aEVycm9yKHJlc3VsdC5lcnJvcnMpKSB7XG4gICAgICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFwiU2Vzc2lvbiBleHBpcmVkIFx1MjAxNCBsb2cgaW50byBwb3J0YWwudHJhY2ttYW5nb2xmLmNvbVwiIH0pO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFwiVW5hYmxlIHRvIGZldGNoIGFjdGl2aXRpZXMgXHUyMDE0IHRyeSBhZ2FpbiBsYXRlclwiIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcmF3QWN0aXZpdGllcyA9IHJlc3VsdC5kYXRhPy5tZT8uYWN0aXZpdGllcyA/PyBbXTtcbiAgICAgICAgY29uc3QgYWN0aXZpdGllczogQWN0aXZpdHlTdW1tYXJ5W10gPSByYXdBY3Rpdml0aWVzLnNsaWNlKDAsIDIwKS5tYXAoKGEpID0+ICh7XG4gICAgICAgICAgaWQ6IGEuaWQsXG4gICAgICAgICAgZGF0ZTogYS50aW1lLFxuICAgICAgICAgIHN0cm9rZUNvdW50OiBhLnN0cm9rZUNvdW50ID8/IG51bGwsXG4gICAgICAgICAgdHlwZTogYS5raW5kID8/IG51bGwsXG4gICAgICAgIH0pKTtcbiAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogdHJ1ZSwgYWN0aXZpdGllcyB9KTtcbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICBjb25zb2xlLmVycm9yKFwiVHJhY2tQdWxsOiBGZXRjaCBhY3Rpdml0aWVzIGZhaWxlZDpcIiwgZXJyKTtcbiAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBcIlVuYWJsZSB0byBmZXRjaCBhY3Rpdml0aWVzIFx1MjAxNCB0cnkgYWdhaW4gbGF0ZXJcIiB9KTtcbiAgICAgIH1cbiAgICB9KSgpO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgaWYgKG1lc3NhZ2UudHlwZSA9PT0gXCJJTVBPUlRfU0VTU0lPTlwiKSB7XG4gICAgY29uc3QgeyBhY3Rpdml0eUlkIH0gPSBtZXNzYWdlIGFzIEltcG9ydFNlc3Npb25SZXF1ZXN0O1xuICAgIChhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBncmFudGVkID0gYXdhaXQgaGFzUG9ydGFsUGVybWlzc2lvbigpO1xuICAgICAgaWYgKCFncmFudGVkKSB7XG4gICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogXCJQb3J0YWwgcGVybWlzc2lvbiBub3QgZ3JhbnRlZFwiIH0pO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBhd2FpdCBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoeyBbU1RPUkFHRV9LRVlTLklNUE9SVF9TVEFUVVNdOiB7IHN0YXRlOiBcImltcG9ydGluZ1wiIH0gYXMgSW1wb3J0U3RhdHVzIH0pO1xuICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogdHJ1ZSB9KTtcblxuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZXhlY3V0ZVF1ZXJ5PHsgbm9kZTogR3JhcGhRTEFjdGl2aXR5IH0+KFxuICAgICAgICAgIElNUE9SVF9TRVNTSU9OX1FVRVJZLFxuICAgICAgICAgIHsgaWQ6IGFjdGl2aXR5SWQgfVxuICAgICAgICApO1xuICAgICAgICBpZiAocmVzdWx0LmVycm9ycyAmJiByZXN1bHQuZXJyb3JzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICBpZiAoaXNBdXRoRXJyb3IocmVzdWx0LmVycm9ycykpIHtcbiAgICAgICAgICAgIGF3YWl0IGNocm9tZS5zdG9yYWdlLmxvY2FsLnNldCh7IFtTVE9SQUdFX0tFWVMuSU1QT1JUX1NUQVRVU106IHsgc3RhdGU6IFwiZXJyb3JcIiwgbWVzc2FnZTogXCJTZXNzaW9uIGV4cGlyZWQgXHUyMDE0IGxvZyBpbnRvIHBvcnRhbC50cmFja21hbmdvbGYuY29tXCIgfSBhcyBJbXBvcnRTdGF0dXMgfSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGF3YWl0IGNocm9tZS5zdG9yYWdlLmxvY2FsLnNldCh7IFtTVE9SQUdFX0tFWVMuSU1QT1JUX1NUQVRVU106IHsgc3RhdGU6IFwiZXJyb3JcIiwgbWVzc2FnZTogXCJVbmFibGUgdG8gcmVhY2ggVHJhY2ttYW4gXHUyMDE0IHRyeSBhZ2FpbiBsYXRlclwiIH0gYXMgSW1wb3J0U3RhdHVzIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgYWN0aXZpdHkgPSByZXN1bHQuZGF0YT8ubm9kZTtcbiAgICAgICAgY29uc3Qgc2Vzc2lvbiA9IGFjdGl2aXR5ID8gcGFyc2VQb3J0YWxBY3Rpdml0eShhY3Rpdml0eSkgOiBudWxsO1xuICAgICAgICBpZiAoIXNlc3Npb24pIHtcbiAgICAgICAgICBhd2FpdCBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoeyBbU1RPUkFHRV9LRVlTLklNUE9SVF9TVEFUVVNdOiB7IHN0YXRlOiBcImVycm9yXCIsIG1lc3NhZ2U6IFwiTm8gc2hvdCBkYXRhIGZvdW5kIGZvciB0aGlzIGFjdGl2aXR5XCIgfSBhcyBJbXBvcnRTdGF0dXMgfSk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGF3YWl0IGNocm9tZS5zdG9yYWdlLmxvY2FsLnNldCh7IFtTVE9SQUdFX0tFWVMuVFJBQ0tNQU5fREFUQV06IHNlc3Npb24gfSk7XG4gICAgICAgIGF3YWl0IHNhdmVTZXNzaW9uVG9IaXN0b3J5KHNlc3Npb24pO1xuICAgICAgICBhd2FpdCBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoeyBbU1RPUkFHRV9LRVlTLklNUE9SVF9TVEFUVVNdOiB7IHN0YXRlOiBcInN1Y2Nlc3NcIiB9IGFzIEltcG9ydFN0YXR1cyB9KTtcbiAgICAgICAgY29uc29sZS5sb2coXCJUcmFja1B1bGw6IFNlc3Npb24gaW1wb3J0ZWQgc3VjY2Vzc2Z1bGx5OlwiLCBzZXNzaW9uLnJlcG9ydF9pZCk7XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIlRyYWNrUHVsbDogSW1wb3J0IGZhaWxlZDpcIiwgZXJyKTtcbiAgICAgICAgYXdhaXQgY2hyb21lLnN0b3JhZ2UubG9jYWwuc2V0KHsgW1NUT1JBR0VfS0VZUy5JTVBPUlRfU1RBVFVTXTogeyBzdGF0ZTogXCJlcnJvclwiLCBtZXNzYWdlOiBcIkltcG9ydCBmYWlsZWQgXHUyMDE0IHRyeSBhZ2FpblwiIH0gYXMgSW1wb3J0U3RhdHVzIH0pO1xuICAgICAgfVxuICAgIH0pKCk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICAvLyBSZWNlaXZlcyBwcmUtZmV0Y2hlZCBHcmFwaFFMIGRhdGEgZnJvbSBwb3B1cCAoZmV0Y2hlZCB2aWEgY29udGVudCBzY3JpcHQgb24gcG9ydGFsIHBhZ2UpXG4gIGlmIChtZXNzYWdlLnR5cGUgPT09IFwiU0FWRV9JTVBPUlRFRF9TRVNTSU9OXCIpIHtcbiAgICBjb25zdCB7IGdyYXBocWxEYXRhIH0gPSBtZXNzYWdlIGFzIHsgdHlwZTogc3RyaW5nOyBncmFwaHFsRGF0YTogeyBkYXRhPzogeyBub2RlPzogR3JhcGhRTEFjdGl2aXR5IH07IGVycm9ycz86IEFycmF5PHsgbWVzc2FnZTogc3RyaW5nIH0+IH07IGFjdGl2aXR5SWQ6IHN0cmluZyB9O1xuICAgIChhc3luYyAoKSA9PiB7XG4gICAgICBhd2FpdCBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoeyBbU1RPUkFHRV9LRVlTLklNUE9SVF9TVEFUVVNdOiB7IHN0YXRlOiBcImltcG9ydGluZ1wiIH0gYXMgSW1wb3J0U3RhdHVzIH0pO1xuXG4gICAgICB0cnkge1xuICAgICAgICBpZiAoZ3JhcGhxbERhdGEuZXJyb3JzICYmIGdyYXBocWxEYXRhLmVycm9ycy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgYXdhaXQgY2hyb21lLnN0b3JhZ2UubG9jYWwuc2V0KHsgW1NUT1JBR0VfS0VZUy5JTVBPUlRfU1RBVFVTXTogeyBzdGF0ZTogXCJlcnJvclwiLCBtZXNzYWdlOiBncmFwaHFsRGF0YS5lcnJvcnNbMF0ubWVzc2FnZSB9IGFzIEltcG9ydFN0YXR1cyB9KTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgYWN0aXZpdHkgPSBncmFwaHFsRGF0YS5kYXRhPy5ub2RlO1xuICAgICAgICBjb25zdCBzZXNzaW9uID0gYWN0aXZpdHkgPyBwYXJzZVBvcnRhbEFjdGl2aXR5KGFjdGl2aXR5KSA6IG51bGw7XG4gICAgICAgIGlmICghc2Vzc2lvbikge1xuICAgICAgICAgIGF3YWl0IGNocm9tZS5zdG9yYWdlLmxvY2FsLnNldCh7IFtTVE9SQUdFX0tFWVMuSU1QT1JUX1NUQVRVU106IHsgc3RhdGU6IFwiZXJyb3JcIiwgbWVzc2FnZTogXCJObyBzaG90IGRhdGEgZm91bmQgZm9yIHRoaXMgYWN0aXZpdHlcIiB9IGFzIEltcG9ydFN0YXR1cyB9KTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgYXdhaXQgY2hyb21lLnN0b3JhZ2UubG9jYWwuc2V0KHsgW1NUT1JBR0VfS0VZUy5UUkFDS01BTl9EQVRBXTogc2Vzc2lvbiB9KTtcbiAgICAgICAgYXdhaXQgc2F2ZVNlc3Npb25Ub0hpc3Rvcnkoc2Vzc2lvbik7XG4gICAgICAgIGF3YWl0IGNocm9tZS5zdG9yYWdlLmxvY2FsLnNldCh7IFtTVE9SQUdFX0tFWVMuSU1QT1JUX1NUQVRVU106IHsgc3RhdGU6IFwic3VjY2Vzc1wiIH0gYXMgSW1wb3J0U3RhdHVzIH0pO1xuICAgICAgICBjb25zb2xlLmxvZyhcIlRyYWNrUHVsbDogU2Vzc2lvbiBpbXBvcnRlZCBzdWNjZXNzZnVsbHk6XCIsIHNlc3Npb24ucmVwb3J0X2lkKTtcbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICBjb25zb2xlLmVycm9yKFwiVHJhY2tQdWxsOiBJbXBvcnQgZmFpbGVkOlwiLCBlcnIpO1xuICAgICAgICBhd2FpdCBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoeyBbU1RPUkFHRV9LRVlTLklNUE9SVF9TVEFUVVNdOiB7IHN0YXRlOiBcImVycm9yXCIsIG1lc3NhZ2U6IFwiSW1wb3J0IGZhaWxlZCBcdTIwMTQgdHJ5IGFnYWluXCIgfSBhcyBJbXBvcnRTdGF0dXMgfSk7XG4gICAgICB9XG4gICAgfSkoKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxufSk7XG5cbmNocm9tZS5zdG9yYWdlLm9uQ2hhbmdlZC5hZGRMaXN0ZW5lcigoY2hhbmdlcywgbmFtZXNwYWNlKSA9PiB7XG4gIGlmIChuYW1lc3BhY2UgPT09IFwibG9jYWxcIiAmJiBjaGFuZ2VzW1NUT1JBR0VfS0VZUy5UUkFDS01BTl9EQVRBXSkge1xuICAgIGNvbnN0IG5ld1ZhbHVlID0gY2hhbmdlc1tTVE9SQUdFX0tFWVMuVFJBQ0tNQU5fREFUQV0ubmV3VmFsdWU7XG4gICAgY2hyb21lLnJ1bnRpbWUuc2VuZE1lc3NhZ2UoeyB0eXBlOiBcIkRBVEFfVVBEQVRFRFwiLCBkYXRhOiBuZXdWYWx1ZSB9KS5jYXRjaCgoKSA9PiB7XG4gICAgICAvLyBJZ25vcmUgZXJyb3JzIHdoZW4gbm8gcG9wdXAgaXMgbGlzdGVuaW5nXG4gICAgfSk7XG4gIH1cbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7OztBQUFB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
