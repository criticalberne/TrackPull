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
      throw new Error(`HTTP ${response.status}`);
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
    if (!result.data?.me?.id) {
      return { kind: "unauthenticated" };
    }
    return { kind: "authenticated" };
  }
  var GRAPHQL_ENDPOINT, HEALTH_CHECK_QUERY;
  var init_graphql_client = __esm({
    "src/shared/graphql_client.ts"() {
      GRAPHQL_ENDPOINT = "https://api.trackmangolf.com/graphql";
      HEALTH_CHECK_QUERY = `query HealthCheck { me { id } }`;
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
      const date = activity.date ?? "Unknown";
      const allMetricNames = /* @__PURE__ */ new Set();
      const club_groups = [];
      for (const group of activity.strokeGroups ?? []) {
        if (!group || typeof group !== "object") continue;
        const clubName = group.club || "Unknown";
        const shots = [];
        let shotNumber = 1;
        for (const stroke of group.strokes ?? []) {
          if (!stroke?.measurement) continue;
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
            shots.push({
              shot_number: shotNumber++,
              metrics: shotMetrics
            });
          }
        }
        if (shots.length > 0) {
          club_groups.push({
            club_name: clubName,
            shots,
            averages: {},
            consistency: {}
          });
        }
      }
      if (club_groups.length === 0) return null;
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
  query FetchActivities($first: Int!) {
    activities(first: $first) {
      edges {
        node {
          id
          date
        }
      }
    }
  }
`;
      IMPORT_SESSION_QUERY = `
  query FetchActivityById($id: ID!) {
    node(id: $id) {
      ... on SessionActivity {
        id
        date
        strokeGroups {
          club
          strokes {
            id
            measurement {
              clubSpeed ballSpeed smashFactor attackAngle clubPath faceAngle
              faceToPath swingDirection dynamicLoft spinRate spinAxis spinLoft
              launchAngle launchDirection carry total side sideTotal carrySide
              totalSide height maxHeight curve landingAngle hangTime
              lowPointDistance impactHeight impactOffset tempo
            }
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
              const filename = `ShotData_${data.date || "unknown"}.csv`;
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
              const result = await executeQuery(
                FETCH_ACTIVITIES_QUERY,
                { first: 20 }
              );
              if (result.errors && result.errors.length > 0) {
                if (isAuthError(result.errors)) {
                  sendResponse({ success: false, error: "Session expired \u2014 log into portal.trackmangolf.com" });
                } else {
                  sendResponse({ success: false, error: "Unable to fetch activities \u2014 try again later" });
                }
                return;
              }
              const activities = result.data?.activities?.edges?.map((e) => e.node) ?? [];
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL3NoYXJlZC9jb25zdGFudHMudHMiLCAiLi4vc3JjL3NoYXJlZC91bml0X25vcm1hbGl6YXRpb24udHMiLCAiLi4vc3JjL3NoYXJlZC9jc3Zfd3JpdGVyLnRzIiwgIi4uL3NyYy9zaGFyZWQvaGlzdG9yeS50cyIsICIuLi9zcmMvc2hhcmVkL3BvcnRhbFBlcm1pc3Npb25zLnRzIiwgIi4uL3NyYy9zaGFyZWQvZ3JhcGhxbF9jbGllbnQudHMiLCAiLi4vc3JjL3NoYXJlZC9wb3J0YWxfcGFyc2VyLnRzIiwgIi4uL3NyYy9zaGFyZWQvaW1wb3J0X3R5cGVzLnRzIiwgIi4uL3NyYy9iYWNrZ3JvdW5kL3NlcnZpY2VXb3JrZXIudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbIi8qKlxuICogU2hhcmVkIGNvbnN0YW50cyBpbmNsdWRpbmcgQ1NTIHNlbGVjdG9ycyBhbmQgY29uZmlndXJhdGlvbi5cbiAqIEJhc2VkIG9uIFB5dGhvbiBzY3JhcGVyIGNvbnN0YW50cy5weSBpbXBsZW1lbnRhdGlvbi5cbiAqL1xuXG4vLyBDb21wbGV0ZSBsaXN0IG9mIGFsbCBrbm93biBUcmFja21hbiBtZXRyaWNzIChVUkwgcGFyYW1ldGVyIG5hbWVzKVxuZXhwb3J0IGNvbnN0IEFMTF9NRVRSSUNTID0gW1xuICBcIkNsdWJTcGVlZFwiLFxuICBcIkJhbGxTcGVlZFwiLFxuICBcIlNtYXNoRmFjdG9yXCIsXG4gIFwiQXR0YWNrQW5nbGVcIixcbiAgXCJDbHViUGF0aFwiLFxuICBcIkZhY2VBbmdsZVwiLFxuICBcIkZhY2VUb1BhdGhcIixcbiAgXCJTd2luZ0RpcmVjdGlvblwiLFxuICBcIkR5bmFtaWNMb2Z0XCIsXG4gIFwiU3BpblJhdGVcIixcbiAgXCJTcGluQXhpc1wiLFxuICBcIlNwaW5Mb2Z0XCIsXG4gIFwiTGF1bmNoQW5nbGVcIixcbiAgXCJMYXVuY2hEaXJlY3Rpb25cIixcbiAgXCJDYXJyeVwiLFxuICBcIlRvdGFsXCIsXG4gIFwiU2lkZVwiLFxuICBcIlNpZGVUb3RhbFwiLFxuICBcIkNhcnJ5U2lkZVwiLFxuICBcIlRvdGFsU2lkZVwiLFxuICBcIkhlaWdodFwiLFxuICBcIk1heEhlaWdodFwiLFxuICBcIkN1cnZlXCIsXG4gIFwiTGFuZGluZ0FuZ2xlXCIsXG4gIFwiSGFuZ1RpbWVcIixcbiAgXCJMb3dQb2ludERpc3RhbmNlXCIsXG4gIFwiSW1wYWN0SGVpZ2h0XCIsXG4gIFwiSW1wYWN0T2Zmc2V0XCIsXG4gIFwiVGVtcG9cIixcbl0gYXMgY29uc3Q7XG5cbi8vIE1ldHJpY3Mgc3BsaXQgaW50byBncm91cHMgZm9yIG11bHRpLXBhZ2UtbG9hZCBIVE1MIGZhbGxiYWNrXG5leHBvcnQgY29uc3QgTUVUUklDX0dST1VQUyA9IFtcbiAgW1xuICAgIFwiQ2x1YlNwZWVkXCIsXG4gICAgXCJCYWxsU3BlZWRcIixcbiAgICBcIlNtYXNoRmFjdG9yXCIsXG4gICAgXCJBdHRhY2tBbmdsZVwiLFxuICAgIFwiQ2x1YlBhdGhcIixcbiAgICBcIkZhY2VBbmdsZVwiLFxuICAgIFwiRmFjZVRvUGF0aFwiLFxuICAgIFwiU3dpbmdEaXJlY3Rpb25cIixcbiAgICBcIkR5bmFtaWNMb2Z0XCIsXG4gICAgXCJTcGluTG9mdFwiLFxuICBdLFxuICBbXG4gICAgXCJTcGluUmF0ZVwiLFxuICAgIFwiU3BpbkF4aXNcIixcbiAgICBcIkxhdW5jaEFuZ2xlXCIsXG4gICAgXCJMYXVuY2hEaXJlY3Rpb25cIixcbiAgICBcIkNhcnJ5XCIsXG4gICAgXCJUb3RhbFwiLFxuICAgIFwiU2lkZVwiLFxuICAgIFwiU2lkZVRvdGFsXCIsXG4gICAgXCJDYXJyeVNpZGVcIixcbiAgICBcIlRvdGFsU2lkZVwiLFxuICAgIFwiSGVpZ2h0XCIsXG4gICAgXCJNYXhIZWlnaHRcIixcbiAgICBcIkN1cnZlXCIsXG4gICAgXCJMYW5kaW5nQW5nbGVcIixcbiAgICBcIkhhbmdUaW1lXCIsXG4gICAgXCJMb3dQb2ludERpc3RhbmNlXCIsXG4gICAgXCJJbXBhY3RIZWlnaHRcIixcbiAgICBcIkltcGFjdE9mZnNldFwiLFxuICAgIFwiVGVtcG9cIixcbiAgXSxcbl0gYXMgY29uc3Q7XG5cbi8vIERpc3BsYXkgbmFtZXM6IFVSTCBwYXJhbSBuYW1lIC0+IGh1bWFuLXJlYWRhYmxlIENTViBoZWFkZXJcbmV4cG9ydCBjb25zdCBNRVRSSUNfRElTUExBWV9OQU1FUzogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcbiAgQ2x1YlNwZWVkOiBcIkNsdWIgU3BlZWRcIixcbiAgQmFsbFNwZWVkOiBcIkJhbGwgU3BlZWRcIixcbiAgU21hc2hGYWN0b3I6IFwiU21hc2ggRmFjdG9yXCIsXG4gIEF0dGFja0FuZ2xlOiBcIkF0dGFjayBBbmdsZVwiLFxuICBDbHViUGF0aDogXCJDbHViIFBhdGhcIixcbiAgRmFjZUFuZ2xlOiBcIkZhY2UgQW5nbGVcIixcbiAgRmFjZVRvUGF0aDogXCJGYWNlIFRvIFBhdGhcIixcbiAgU3dpbmdEaXJlY3Rpb246IFwiU3dpbmcgRGlyZWN0aW9uXCIsXG4gIER5bmFtaWNMb2Z0OiBcIkR5bmFtaWMgTG9mdFwiLFxuICBTcGluUmF0ZTogXCJTcGluIFJhdGVcIixcbiAgU3BpbkF4aXM6IFwiU3BpbiBBeGlzXCIsXG4gIFNwaW5Mb2Z0OiBcIlNwaW4gTG9mdFwiLFxuICBMYXVuY2hBbmdsZTogXCJMYXVuY2ggQW5nbGVcIixcbiAgTGF1bmNoRGlyZWN0aW9uOiBcIkxhdW5jaCBEaXJlY3Rpb25cIixcbiAgQ2Fycnk6IFwiQ2FycnlcIixcbiAgVG90YWw6IFwiVG90YWxcIixcbiAgU2lkZTogXCJTaWRlXCIsXG4gIFNpZGVUb3RhbDogXCJTaWRlIFRvdGFsXCIsXG4gIENhcnJ5U2lkZTogXCJDYXJyeSBTaWRlXCIsXG4gIFRvdGFsU2lkZTogXCJUb3RhbCBTaWRlXCIsXG4gIEhlaWdodDogXCJIZWlnaHRcIixcbiAgTWF4SGVpZ2h0OiBcIk1heCBIZWlnaHRcIixcbiAgQ3VydmU6IFwiQ3VydmVcIixcbiAgTGFuZGluZ0FuZ2xlOiBcIkxhbmRpbmcgQW5nbGVcIixcbiAgSGFuZ1RpbWU6IFwiSGFuZyBUaW1lXCIsXG4gIExvd1BvaW50RGlzdGFuY2U6IFwiTG93IFBvaW50XCIsXG4gIEltcGFjdEhlaWdodDogXCJJbXBhY3QgSGVpZ2h0XCIsXG4gIEltcGFjdE9mZnNldDogXCJJbXBhY3QgT2Zmc2V0XCIsXG4gIFRlbXBvOiBcIlRlbXBvXCIsXG59O1xuXG4vLyBDU1MgY2xhc3Mgc2VsZWN0b3JzIChmcm9tIFRyYWNrbWFuJ3MgcmVuZGVyZWQgSFRNTClcbmV4cG9ydCBjb25zdCBDU1NfREFURSA9IFwiZGF0ZVwiO1xuZXhwb3J0IGNvbnN0IENTU19SRVNVTFRTX1dSQVBQRVIgPSBcInBsYXllci1hbmQtcmVzdWx0cy10YWJsZS13cmFwcGVyXCI7XG5leHBvcnQgY29uc3QgQ1NTX1JFU1VMVFNfVEFCTEUgPSBcIlJlc3VsdHNUYWJsZVwiO1xuZXhwb3J0IGNvbnN0IENTU19DTFVCX1RBRyA9IFwiZ3JvdXAtdGFnXCI7XG5leHBvcnQgY29uc3QgQ1NTX1BBUkFNX05BTUVTX1JPVyA9IFwicGFyYW1ldGVyLW5hbWVzLXJvd1wiO1xuZXhwb3J0IGNvbnN0IENTU19QQVJBTV9OQU1FID0gXCJwYXJhbWV0ZXItbmFtZVwiO1xuZXhwb3J0IGNvbnN0IENTU19TSE9UX0RFVEFJTF9ST1cgPSBcInJvdy13aXRoLXNob3QtZGV0YWlsc1wiO1xuZXhwb3J0IGNvbnN0IENTU19BVkVSQUdFX1ZBTFVFUyA9IFwiYXZlcmFnZS12YWx1ZXNcIjtcbmV4cG9ydCBjb25zdCBDU1NfQ09OU0lTVEVOQ1lfVkFMVUVTID0gXCJjb25zaXN0ZW5jeS12YWx1ZXNcIjtcblxuLy8gQVBJIFVSTCBwYXR0ZXJucyB0aGF0IGxpa2VseSBpbmRpY2F0ZSBhbiBBUEkgZGF0YSByZXNwb25zZVxuZXhwb3J0IGNvbnN0IEFQSV9VUkxfUEFUVEVSTlMgPSBbXG4gIFwiYXBpLnRyYWNrbWFuZ29sZi5jb21cIixcbiAgXCJ0cmFja21hbmdvbGYuY29tL2FwaVwiLFxuICBcIi9hcGkvXCIsXG4gIFwiL3JlcG9ydHMvXCIsXG4gIFwiL2FjdGl2aXRpZXMvXCIsXG4gIFwiL3Nob3RzL1wiLFxuICBcImdyYXBocWxcIixcbl07XG5cbi8vIFRpbWVvdXRzIChtaWxsaXNlY29uZHMpXG5leHBvcnQgY29uc3QgUEFHRV9MT0FEX1RJTUVPVVQgPSAzMF8wMDA7XG5leHBvcnQgY29uc3QgREFUQV9MT0FEX1RJTUVPVVQgPSAxNV8wMDA7XG5cbi8vIFRyYWNrbWFuIGJhc2UgVVJMXG5leHBvcnQgY29uc3QgQkFTRV9VUkwgPSBcImh0dHBzOi8vd2ViLWR5bmFtaWMtcmVwb3J0cy50cmFja21hbmdvbGYuY29tL1wiO1xuXG4vLyBDdXN0b20gcHJvbXB0IHN0b3JhZ2Uga2V5c1xuZXhwb3J0IGNvbnN0IENVU1RPTV9QUk9NUFRfS0VZX1BSRUZJWCA9IFwiY3VzdG9tUHJvbXB0X1wiIGFzIGNvbnN0O1xuZXhwb3J0IGNvbnN0IENVU1RPTV9QUk9NUFRfSURTX0tFWSA9IFwiY3VzdG9tUHJvbXB0SWRzXCIgYXMgY29uc3Q7XG5cbi8vIFN0b3JhZ2Uga2V5cyBmb3IgQ2hyb21lIGV4dGVuc2lvbiAoYWxpZ25lZCBiZXR3ZWVuIGJhY2tncm91bmQgYW5kIHBvcHVwKVxuZXhwb3J0IGNvbnN0IFNUT1JBR0VfS0VZUyA9IHtcbiAgVFJBQ0tNQU5fREFUQTogXCJ0cmFja21hbkRhdGFcIixcbiAgU1BFRURfVU5JVDogXCJzcGVlZFVuaXRcIixcbiAgRElTVEFOQ0VfVU5JVDogXCJkaXN0YW5jZVVuaXRcIixcbiAgU0VMRUNURURfUFJPTVBUX0lEOiBcInNlbGVjdGVkUHJvbXB0SWRcIixcbiAgQUlfU0VSVklDRTogXCJhaVNlcnZpY2VcIixcbiAgSElUVElOR19TVVJGQUNFOiBcImhpdHRpbmdTdXJmYWNlXCIsXG4gIElOQ0xVREVfQVZFUkFHRVM6IFwiaW5jbHVkZUF2ZXJhZ2VzXCIsXG4gIFNFU1NJT05fSElTVE9SWTogXCJzZXNzaW9uSGlzdG9yeVwiLFxuICBJTVBPUlRfU1RBVFVTOiBcImltcG9ydFN0YXR1c1wiLFxufSBhcyBjb25zdDtcbiIsICIvKipcbiAqIFVuaXQgbm9ybWFsaXphdGlvbiB1dGlsaXRpZXMgZm9yIFRyYWNrbWFuIG1lYXN1cmVtZW50cy5cbiAqIFxuICogVHJhY2ttYW4gdXNlcyBuZF8qIHBhcmFtZXRlcnMgdG8gc3BlY2lmeSB1bml0czpcbiAqIC0gbmRfMDAxLCBuZF8wMDIsIGV0Yy4gZGVmaW5lIHVuaXQgc3lzdGVtcyBmb3IgZGlmZmVyZW50IG1lYXN1cmVtZW50IGdyb3Vwc1xuICogLSBDb21tb24gdmFsdWVzOiA3ODkwMTIgPSB5YXJkcy9kZWdyZWVzLCA3ODkwMTMgPSBtZXRlcnMvcmFkaWFuc1xuICovXG5cbmV4cG9ydCB0eXBlIFVuaXRTeXN0ZW1JZCA9IFwiNzg5MDEyXCIgfCBcIjc4OTAxM1wiIHwgXCI3ODkwMTRcIiB8IHN0cmluZztcblxuZXhwb3J0IHR5cGUgU3BlZWRVbml0ID0gXCJtcGhcIiB8IFwibS9zXCI7XG5leHBvcnQgdHlwZSBEaXN0YW5jZVVuaXQgPSBcInlhcmRzXCIgfCBcIm1ldGVyc1wiO1xuZXhwb3J0IHR5cGUgU21hbGxEaXN0YW5jZVVuaXQgPSBcImluY2hlc1wiIHwgXCJjbVwiO1xuZXhwb3J0IGludGVyZmFjZSBVbml0Q2hvaWNlIHsgc3BlZWQ6IFNwZWVkVW5pdDsgZGlzdGFuY2U6IERpc3RhbmNlVW5pdCB9XG5leHBvcnQgY29uc3QgREVGQVVMVF9VTklUX0NIT0lDRTogVW5pdENob2ljZSA9IHsgc3BlZWQ6IFwibXBoXCIsIGRpc3RhbmNlOiBcInlhcmRzXCIgfTtcblxuLyoqXG4gKiBUcmFja21hbiB1bml0IHN5c3RlbSBkZWZpbml0aW9ucy5cbiAqIE1hcHMgbmRfKiBwYXJhbWV0ZXIgdmFsdWVzIHRvIGFjdHVhbCB1bml0cyBmb3IgZWFjaCBtZXRyaWMuXG4gKi9cbmV4cG9ydCBjb25zdCBVTklUX1NZU1RFTVM6IFJlY29yZDxVbml0U3lzdGVtSWQsIFVuaXRTeXN0ZW0+ID0ge1xuICAvLyBJbXBlcmlhbCAoeWFyZHMsIGRlZ3JlZXMpIC0gbW9zdCBjb21tb25cbiAgXCI3ODkwMTJcIjoge1xuICAgIGlkOiBcIjc4OTAxMlwiLFxuICAgIG5hbWU6IFwiSW1wZXJpYWxcIixcbiAgICBkaXN0YW5jZVVuaXQ6IFwieWFyZHNcIixcbiAgICBhbmdsZVVuaXQ6IFwiZGVncmVlc1wiLFxuICAgIHNwZWVkVW5pdDogXCJtcGhcIixcbiAgfSxcbiAgLy8gTWV0cmljIChtZXRlcnMsIHJhZGlhbnMpXG4gIFwiNzg5MDEzXCI6IHtcbiAgICBpZDogXCI3ODkwMTNcIixcbiAgICBuYW1lOiBcIk1ldHJpYyAocmFkKVwiLFxuICAgIGRpc3RhbmNlVW5pdDogXCJtZXRlcnNcIixcbiAgICBhbmdsZVVuaXQ6IFwicmFkaWFuc1wiLFxuICAgIHNwZWVkVW5pdDogXCJrbS9oXCIsXG4gIH0sXG4gIC8vIE1ldHJpYyAobWV0ZXJzLCBkZWdyZWVzKSAtIGxlc3MgY29tbW9uXG4gIFwiNzg5MDE0XCI6IHtcbiAgICBpZDogXCI3ODkwMTRcIixcbiAgICBuYW1lOiBcIk1ldHJpYyAoZGVnKVwiLFxuICAgIGRpc3RhbmNlVW5pdDogXCJtZXRlcnNcIixcbiAgICBhbmdsZVVuaXQ6IFwiZGVncmVlc1wiLFxuICAgIHNwZWVkVW5pdDogXCJrbS9oXCIsXG4gIH0sXG59O1xuXG4vKipcbiAqIFVuaXQgc3lzdGVtIGNvbmZpZ3VyYXRpb24uXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVW5pdFN5c3RlbSB7XG4gIGlkOiBVbml0U3lzdGVtSWQ7XG4gIG5hbWU6IHN0cmluZztcbiAgZGlzdGFuY2VVbml0OiBcInlhcmRzXCIgfCBcIm1ldGVyc1wiO1xuICBhbmdsZVVuaXQ6IFwiZGVncmVlc1wiIHwgXCJyYWRpYW5zXCI7XG4gIHNwZWVkVW5pdDogXCJtcGhcIiB8IFwia20vaFwiIHwgXCJtL3NcIjtcbn1cblxuLyoqXG4gKiBNZXRyaWNzIHRoYXQgdXNlIGRpc3RhbmNlIHVuaXRzLlxuICovXG5leHBvcnQgY29uc3QgRElTVEFOQ0VfTUVUUklDUyA9IG5ldyBTZXQoW1xuICBcIkNhcnJ5XCIsXG4gIFwiVG90YWxcIixcbiAgXCJTaWRlXCIsXG4gIFwiU2lkZVRvdGFsXCIsXG4gIFwiQ2FycnlTaWRlXCIsXG4gIFwiVG90YWxTaWRlXCIsXG4gIFwiSGVpZ2h0XCIsXG4gIFwiTWF4SGVpZ2h0XCIsXG4gIFwiQ3VydmVcIixcbl0pO1xuXG4vKipcbiAqIE1ldHJpY3MgdGhhdCB1c2Ugc21hbGwgZGlzdGFuY2UgdW5pdHMgKGluY2hlcy9jbSkuXG4gKiBUaGVzZSB2YWx1ZXMgY29tZSBmcm9tIHRoZSBBUEkgaW4gbWV0ZXJzIGJ1dCBhcmUgdG9vIHNtYWxsIGZvciB5YXJkcy9tZXRlcnMuXG4gKi9cbmV4cG9ydCBjb25zdCBTTUFMTF9ESVNUQU5DRV9NRVRSSUNTID0gbmV3IFNldChbXG4gIFwiTG93UG9pbnREaXN0YW5jZVwiLFxuXSk7XG5cbi8qKlxuICogVHJhY2ttYW4gaW1wYWN0IGxvY2F0aW9uIG1ldHJpY3MgYXJlIGFsd2F5cyBkaXNwbGF5ZWQgaW4gbWlsbGltZXRlcnMuXG4gKiBUaGUgQVBJIHJldHVybnMgdGhlc2UgdmFsdWVzIGluIG1ldGVycy5cbiAqL1xuZXhwb3J0IGNvbnN0IE1JTExJTUVURVJfTUVUUklDUyA9IG5ldyBTZXQoW1xuICBcIkltcGFjdEhlaWdodFwiLFxuICBcIkltcGFjdE9mZnNldFwiLFxuXSk7XG5cbi8qKlxuICogTWV0cmljcyB0aGF0IHVzZSBhbmdsZSB1bml0cy5cbiAqL1xuZXhwb3J0IGNvbnN0IEFOR0xFX01FVFJJQ1MgPSBuZXcgU2V0KFtcbiAgXCJBdHRhY2tBbmdsZVwiLFxuICBcIkNsdWJQYXRoXCIsXG4gIFwiRmFjZUFuZ2xlXCIsXG4gIFwiRmFjZVRvUGF0aFwiLFxuICBcIkR5bmFtaWNMb2Z0XCIsXG4gIFwiTGF1bmNoQW5nbGVcIixcbiAgXCJMYXVuY2hEaXJlY3Rpb25cIixcbiAgXCJMYW5kaW5nQW5nbGVcIixcbl0pO1xuXG4vKipcbiAqIE1ldHJpY3MgdGhhdCB1c2Ugc3BlZWQgdW5pdHMuXG4gKi9cbmV4cG9ydCBjb25zdCBTUEVFRF9NRVRSSUNTID0gbmV3IFNldChbXG4gIFwiQ2x1YlNwZWVkXCIsXG4gIFwiQmFsbFNwZWVkXCIsXG5dKTtcblxuLyoqXG4gKiBEZWZhdWx0IHVuaXQgc3lzdGVtIChJbXBlcmlhbCAtIHlhcmRzL2RlZ3JlZXMpLlxuICovXG5leHBvcnQgY29uc3QgREVGQVVMVF9VTklUX1NZU1RFTTogVW5pdFN5c3RlbSA9IFVOSVRfU1lTVEVNU1tcIjc4OTAxMlwiXTtcblxuLyoqXG4gKiBTcGVlZCB1bml0IGRpc3BsYXkgbGFiZWxzIGZvciBDU1YgaGVhZGVycy5cbiAqL1xuZXhwb3J0IGNvbnN0IFNQRUVEX0xBQkVMUzogUmVjb3JkPFNwZWVkVW5pdCwgc3RyaW5nPiA9IHtcbiAgXCJtcGhcIjogXCJtcGhcIixcbiAgXCJtL3NcIjogXCJtL3NcIixcbn07XG5cbi8qKlxuICogRGlzdGFuY2UgdW5pdCBkaXNwbGF5IGxhYmVscyBmb3IgQ1NWIGhlYWRlcnMuXG4gKi9cbmV4cG9ydCBjb25zdCBESVNUQU5DRV9MQUJFTFM6IFJlY29yZDxEaXN0YW5jZVVuaXQsIHN0cmluZz4gPSB7XG4gIFwieWFyZHNcIjogXCJ5ZHNcIixcbiAgXCJtZXRlcnNcIjogXCJtXCIsXG59O1xuXG4vKipcbiAqIFNtYWxsIGRpc3RhbmNlIHVuaXQgZGlzcGxheSBsYWJlbHMgZm9yIENTViBoZWFkZXJzLlxuICovXG5leHBvcnQgY29uc3QgU01BTExfRElTVEFOQ0VfTEFCRUxTOiBSZWNvcmQ8U21hbGxEaXN0YW5jZVVuaXQsIHN0cmluZz4gPSB7XG4gIFwiaW5jaGVzXCI6IFwiaW5cIixcbiAgXCJjbVwiOiBcImNtXCIsXG59O1xuXG4vKipcbiAqIE1pZ3JhdGUgYSBsZWdhY3kgdW5pdFByZWZlcmVuY2Ugc3RyaW5nIHRvIGEgVW5pdENob2ljZSBvYmplY3QuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtaWdyYXRlTGVnYWN5UHJlZihzdG9yZWQ6IHN0cmluZyB8IHVuZGVmaW5lZCk6IFVuaXRDaG9pY2Uge1xuICBzd2l0Y2ggKHN0b3JlZCkge1xuICAgIGNhc2UgXCJtZXRyaWNcIjpcbiAgICAgIHJldHVybiB7IHNwZWVkOiBcIm0vc1wiLCBkaXN0YW5jZTogXCJtZXRlcnNcIiB9O1xuICAgIGNhc2UgXCJoeWJyaWRcIjpcbiAgICAgIHJldHVybiB7IHNwZWVkOiBcIm1waFwiLCBkaXN0YW5jZTogXCJtZXRlcnNcIiB9O1xuICAgIGNhc2UgXCJpbXBlcmlhbFwiOlxuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4geyBzcGVlZDogXCJtcGhcIiwgZGlzdGFuY2U6IFwieWFyZHNcIiB9O1xuICB9XG59XG5cbi8qKlxuICogRml4ZWQgdW5pdCBsYWJlbHMgZm9yIG1ldHJpY3Mgd2hvc2UgdW5pdHMgZG9uJ3QgdmFyeSBieSBwcmVmZXJlbmNlLlxuICovXG5leHBvcnQgY29uc3QgRklYRURfVU5JVF9MQUJFTFM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XG4gIFNwaW5SYXRlOiBcInJwbVwiLFxuICBIYW5nVGltZTogXCJzXCIsXG4gIFRlbXBvOiBcInNcIixcbiAgSW1wYWN0SGVpZ2h0OiBcIm1tXCIsXG4gIEltcGFjdE9mZnNldDogXCJtbVwiLFxufTtcblxuLyoqXG4gKiBFeHRyYWN0IG5kXyogcGFyYW1ldGVycyBmcm9tIG1ldGFkYXRhX3BhcmFtcy5cbiAqIFxuICogQHBhcmFtIG1ldGFkYXRhUGFyYW1zIC0gVGhlIG1ldGFkYXRhX3BhcmFtcyBvYmplY3QgZnJvbSBTZXNzaW9uRGF0YVxuICogQHJldHVybnMgT2JqZWN0IG1hcHBpbmcgbWV0cmljIGdyb3VwIElEcyB0byB1bml0IHN5c3RlbSBJRHNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV4dHJhY3RVbml0UGFyYW1zKFxuICBtZXRhZGF0YVBhcmFtczogUmVjb3JkPHN0cmluZywgc3RyaW5nPlxuKTogUmVjb3JkPHN0cmluZywgVW5pdFN5c3RlbUlkPiB7XG4gIGNvbnN0IHJlc3VsdDogUmVjb3JkPHN0cmluZywgVW5pdFN5c3RlbUlkPiA9IHt9O1xuXG4gIGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKG1ldGFkYXRhUGFyYW1zKSkge1xuICAgIGNvbnN0IG1hdGNoID0ga2V5Lm1hdGNoKC9ebmRfKFthLXowLTldKykkL2kpO1xuICAgIGlmIChtYXRjaCkge1xuICAgICAgY29uc3QgZ3JvdXBLZXkgPSBtYXRjaFsxXS50b0xvd2VyQ2FzZSgpO1xuICAgICAgcmVzdWx0W2dyb3VwS2V5XSA9IHZhbHVlIGFzIFVuaXRTeXN0ZW1JZDtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufVxuXG4vKipcbiAqIERldGVybWluZSB0aGUgdW5pdCBzeXN0ZW0gSUQgZnJvbSBtZXRhZGF0YSBwYXJhbXMuXG4gKiBVc2VzIG5kXzAwMSBhcyBwcmltYXJ5LCBmYWxscyBiYWNrIHRvIGRlZmF1bHQuXG4gKiBcbiAqIEBwYXJhbSBtZXRhZGF0YVBhcmFtcyAtIFRoZSBtZXRhZGF0YV9wYXJhbXMgb2JqZWN0XG4gKiBAcmV0dXJucyBUaGUgdW5pdCBzeXN0ZW0gSUQgc3RyaW5nXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRVbml0U3lzdGVtSWQoXG4gIG1ldGFkYXRhUGFyYW1zOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+XG4pOiBVbml0U3lzdGVtSWQge1xuICBjb25zdCB1bml0UGFyYW1zID0gZXh0cmFjdFVuaXRQYXJhbXMobWV0YWRhdGFQYXJhbXMpO1xuICByZXR1cm4gdW5pdFBhcmFtc1tcIjAwMVwiXSB8fCBcIjc4OTAxMlwiOyAvLyBEZWZhdWx0IHRvIEltcGVyaWFsXG59XG5cbi8qKlxuICogR2V0IHRoZSBmdWxsIHVuaXQgc3lzdGVtIGNvbmZpZ3VyYXRpb24uXG4gKiBcbiAqIEBwYXJhbSBtZXRhZGF0YVBhcmFtcyAtIFRoZSBtZXRhZGF0YV9wYXJhbXMgb2JqZWN0XG4gKiBAcmV0dXJucyBUaGUgVW5pdFN5c3RlbSBjb25maWd1cmF0aW9uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRVbml0U3lzdGVtKFxuICBtZXRhZGF0YVBhcmFtczogUmVjb3JkPHN0cmluZywgc3RyaW5nPlxuKTogVW5pdFN5c3RlbSB7XG4gIGNvbnN0IGlkID0gZ2V0VW5pdFN5c3RlbUlkKG1ldGFkYXRhUGFyYW1zKTtcbiAgcmV0dXJuIFVOSVRfU1lTVEVNU1tpZF0gfHwgREVGQVVMVF9VTklUX1NZU1RFTTtcbn1cblxuLyoqXG4gKiBHZXQgdGhlIHVuaXQgc3lzdGVtIHJlcHJlc2VudGluZyB3aGF0IHRoZSBBUEkgYWN0dWFsbHkgcmV0dXJucy5cbiAqIFRoZSBBUEkgYWx3YXlzIHJldHVybnMgc3BlZWQgaW4gbS9zIGFuZCBkaXN0YW5jZSBpbiBtZXRlcnMsXG4gKiBidXQgdGhlIGFuZ2xlIHVuaXQgZGVwZW5kcyBvbiB0aGUgcmVwb3J0J3MgbmRfMDAxIHBhcmFtZXRlci5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEFwaVNvdXJjZVVuaXRTeXN0ZW0oXG4gIG1ldGFkYXRhUGFyYW1zOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+XG4pOiBVbml0U3lzdGVtIHtcbiAgY29uc3QgcmVwb3J0U3lzdGVtID0gZ2V0VW5pdFN5c3RlbShtZXRhZGF0YVBhcmFtcyk7XG4gIHJldHVybiB7XG4gICAgaWQ6IFwiYXBpXCIgYXMgVW5pdFN5c3RlbUlkLFxuICAgIG5hbWU6IFwiQVBJIFNvdXJjZVwiLFxuICAgIGRpc3RhbmNlVW5pdDogXCJtZXRlcnNcIixcbiAgICBhbmdsZVVuaXQ6IHJlcG9ydFN5c3RlbS5hbmdsZVVuaXQsXG4gICAgc3BlZWRVbml0OiBcIm0vc1wiLFxuICB9O1xufVxuXG4vKipcbiAqIEdldCB0aGUgdW5pdCBsYWJlbCBmb3IgYSBtZXRyaWMgYmFzZWQgb24gdXNlcidzIHVuaXQgY2hvaWNlLlxuICogUmV0dXJucyBlbXB0eSBzdHJpbmcgZm9yIGRpbWVuc2lvbmxlc3MgbWV0cmljcyAoZS5nLiBTbWFzaEZhY3RvciwgU3BpblJhdGUpLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0TWV0cmljVW5pdExhYmVsKFxuICBtZXRyaWNOYW1lOiBzdHJpbmcsXG4gIHVuaXRDaG9pY2U6IFVuaXRDaG9pY2UgPSBERUZBVUxUX1VOSVRfQ0hPSUNFXG4pOiBzdHJpbmcge1xuICBpZiAobWV0cmljTmFtZSBpbiBGSVhFRF9VTklUX0xBQkVMUykgcmV0dXJuIEZJWEVEX1VOSVRfTEFCRUxTW21ldHJpY05hbWVdO1xuICBpZiAoU1BFRURfTUVUUklDUy5oYXMobWV0cmljTmFtZSkpIHJldHVybiBTUEVFRF9MQUJFTFNbdW5pdENob2ljZS5zcGVlZF07XG4gIGlmIChTTUFMTF9ESVNUQU5DRV9NRVRSSUNTLmhhcyhtZXRyaWNOYW1lKSkgcmV0dXJuIFNNQUxMX0RJU1RBTkNFX0xBQkVMU1tnZXRTbWFsbERpc3RhbmNlVW5pdCh1bml0Q2hvaWNlKV07XG4gIGlmIChESVNUQU5DRV9NRVRSSUNTLmhhcyhtZXRyaWNOYW1lKSkgcmV0dXJuIERJU1RBTkNFX0xBQkVMU1t1bml0Q2hvaWNlLmRpc3RhbmNlXTtcbiAgaWYgKEFOR0xFX01FVFJJQ1MuaGFzKG1ldHJpY05hbWUpKSByZXR1cm4gXCJcdTAwQjBcIjtcbiAgcmV0dXJuIFwiXCI7XG59XG5cbi8qKlxuICogQ29udmVydCBhIGRpc3RhbmNlIHZhbHVlIGJldHdlZW4gdW5pdHMuXG4gKiBcbiAqIEBwYXJhbSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byBjb252ZXJ0XG4gKiBAcGFyYW0gZnJvbVVuaXQgLSBTb3VyY2UgdW5pdCAoXCJ5YXJkc1wiIG9yIFwibWV0ZXJzXCIpXG4gKiBAcGFyYW0gdG9Vbml0IC0gVGFyZ2V0IHVuaXQgKFwieWFyZHNcIiBvciBcIm1ldGVyc1wiKVxuICogQHJldHVybnMgQ29udmVydGVkIHZhbHVlLCBvciBvcmlnaW5hbCBpZiB1bml0cyBtYXRjaFxuICovXG5leHBvcnQgZnVuY3Rpb24gY29udmVydERpc3RhbmNlKFxuICB2YWx1ZTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbCxcbiAgZnJvbVVuaXQ6IFwieWFyZHNcIiB8IFwibWV0ZXJzXCIsXG4gIHRvVW5pdDogXCJ5YXJkc1wiIHwgXCJtZXRlcnNcIlxuKTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbCB7XG4gIGlmICh2YWx1ZSA9PT0gbnVsbCB8fCB2YWx1ZSA9PT0gXCJcIikgcmV0dXJuIHZhbHVlO1xuXG4gIGNvbnN0IG51bVZhbHVlID0gdHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiID8gcGFyc2VGbG9hdCh2YWx1ZSkgOiB2YWx1ZTtcbiAgaWYgKGlzTmFOKG51bVZhbHVlKSkgcmV0dXJuIHZhbHVlO1xuXG4gIGlmIChmcm9tVW5pdCA9PT0gdG9Vbml0KSByZXR1cm4gbnVtVmFsdWU7XG5cbiAgLy8gQ29udmVydCB0byBtZXRlcnMgZmlyc3QsIHRoZW4gdG8gdGFyZ2V0IHVuaXRcbiAgY29uc3QgaW5NZXRlcnMgPSBmcm9tVW5pdCA9PT0gXCJ5YXJkc1wiID8gbnVtVmFsdWUgKiAwLjkxNDQgOiBudW1WYWx1ZTtcbiAgcmV0dXJuIHRvVW5pdCA9PT0gXCJ5YXJkc1wiID8gaW5NZXRlcnMgLyAwLjkxNDQgOiBpbk1ldGVycztcbn1cblxuLyoqXG4gKiBDb252ZXJ0IGFuIGFuZ2xlIHZhbHVlIGJldHdlZW4gdW5pdHMuXG4gKiBcbiAqIEBwYXJhbSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byBjb252ZXJ0XG4gKiBAcGFyYW0gZnJvbVVuaXQgLSBTb3VyY2UgdW5pdCAoXCJkZWdyZWVzXCIgb3IgXCJyYWRpYW5zXCIpXG4gKiBAcGFyYW0gdG9Vbml0IC0gVGFyZ2V0IHVuaXQgKFwiZGVncmVlc1wiIG9yIFwicmFkaWFuc1wiKVxuICogQHJldHVybnMgQ29udmVydGVkIHZhbHVlLCBvciBvcmlnaW5hbCBpZiB1bml0cyBtYXRjaFxuICovXG5leHBvcnQgZnVuY3Rpb24gY29udmVydEFuZ2xlKFxuICB2YWx1ZTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbCxcbiAgZnJvbVVuaXQ6IFwiZGVncmVlc1wiIHwgXCJyYWRpYW5zXCIsXG4gIHRvVW5pdDogXCJkZWdyZWVzXCIgfCBcInJhZGlhbnNcIlxuKTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbCB7XG4gIGlmICh2YWx1ZSA9PT0gbnVsbCB8fCB2YWx1ZSA9PT0gXCJcIikgcmV0dXJuIHZhbHVlO1xuXG4gIGNvbnN0IG51bVZhbHVlID0gdHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiID8gcGFyc2VGbG9hdCh2YWx1ZSkgOiB2YWx1ZTtcbiAgaWYgKGlzTmFOKG51bVZhbHVlKSkgcmV0dXJuIHZhbHVlO1xuXG4gIGlmIChmcm9tVW5pdCA9PT0gdG9Vbml0KSByZXR1cm4gbnVtVmFsdWU7XG5cbiAgLy8gQ29udmVydCB0byBkZWdyZWVzIGZpcnN0LCB0aGVuIHRvIHRhcmdldCB1bml0XG4gIGNvbnN0IGluRGVncmVlcyA9IGZyb21Vbml0ID09PSBcImRlZ3JlZXNcIiA/IG51bVZhbHVlIDogKG51bVZhbHVlICogMTgwIC8gTWF0aC5QSSk7XG4gIHJldHVybiB0b1VuaXQgPT09IFwiZGVncmVlc1wiID8gaW5EZWdyZWVzIDogKGluRGVncmVlcyAqIE1hdGguUEkgLyAxODApO1xufVxuXG4vKipcbiAqIENvbnZlcnQgYSBzcGVlZCB2YWx1ZSBiZXR3ZWVuIHVuaXRzLlxuICpcbiAqIEBwYXJhbSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byBjb252ZXJ0XG4gKiBAcGFyYW0gZnJvbVVuaXQgLSBTb3VyY2UgdW5pdCAoXCJtcGhcIiwgXCJrbS9oXCIsIG9yIFwibS9zXCIpXG4gKiBAcGFyYW0gdG9Vbml0IC0gVGFyZ2V0IHVuaXQgKFwibXBoXCIsIFwia20vaFwiLCBvciBcIm0vc1wiKVxuICogQHJldHVybnMgQ29udmVydGVkIHZhbHVlLCBvciBvcmlnaW5hbCBpZiB1bml0cyBtYXRjaFxuICovXG5leHBvcnQgZnVuY3Rpb24gY29udmVydFNwZWVkKFxuICB2YWx1ZTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbCxcbiAgZnJvbVVuaXQ6IFwibXBoXCIgfCBcImttL2hcIiB8IFwibS9zXCIsXG4gIHRvVW5pdDogXCJtcGhcIiB8IFwia20vaFwiIHwgXCJtL3NcIlxuKTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbCB7XG4gIGlmICh2YWx1ZSA9PT0gbnVsbCB8fCB2YWx1ZSA9PT0gXCJcIikgcmV0dXJuIHZhbHVlO1xuXG4gIGNvbnN0IG51bVZhbHVlID0gdHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiID8gcGFyc2VGbG9hdCh2YWx1ZSkgOiB2YWx1ZTtcbiAgaWYgKGlzTmFOKG51bVZhbHVlKSkgcmV0dXJuIHZhbHVlO1xuXG4gIGlmIChmcm9tVW5pdCA9PT0gdG9Vbml0KSByZXR1cm4gbnVtVmFsdWU7XG5cbiAgLy8gQ29udmVydCB0byBtcGggZmlyc3QsIHRoZW4gdG8gdGFyZ2V0IHVuaXRcbiAgbGV0IGluTXBoOiBudW1iZXI7XG4gIGlmIChmcm9tVW5pdCA9PT0gXCJtcGhcIikgaW5NcGggPSBudW1WYWx1ZTtcbiAgZWxzZSBpZiAoZnJvbVVuaXQgPT09IFwia20vaFwiKSBpbk1waCA9IG51bVZhbHVlIC8gMS42MDkzNDQ7XG4gIGVsc2UgaW5NcGggPSBudW1WYWx1ZSAqIDIuMjM2OTQ7IC8vIG0vcyB0byBtcGhcblxuICBpZiAodG9Vbml0ID09PSBcIm1waFwiKSByZXR1cm4gaW5NcGg7XG4gIGlmICh0b1VuaXQgPT09IFwia20vaFwiKSByZXR1cm4gaW5NcGggKiAxLjYwOTM0NDtcbiAgcmV0dXJuIGluTXBoIC8gMi4yMzY5NDsgLy8gbXBoIHRvIG0vc1xufVxuXG4vKipcbiAqIEdldCB0aGUgc21hbGwgZGlzdGFuY2UgdW5pdCBiYXNlZCBvbiB0aGUgdXNlcidzIGRpc3RhbmNlIGNob2ljZS5cbiAqIFlhcmRzIHVzZXJzIHNlZSBpbmNoZXM7IG1ldGVycyB1c2VycyBzZWUgY20uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRTbWFsbERpc3RhbmNlVW5pdCh1bml0Q2hvaWNlOiBVbml0Q2hvaWNlID0gREVGQVVMVF9VTklUX0NIT0lDRSk6IFNtYWxsRGlzdGFuY2VVbml0IHtcbiAgcmV0dXJuIHVuaXRDaG9pY2UuZGlzdGFuY2UgPT09IFwieWFyZHNcIiA/IFwiaW5jaGVzXCIgOiBcImNtXCI7XG59XG5cbi8qKlxuICogQ29udmVydCBhIGRpc3RhbmNlIHZhbHVlIGZyb20gbWV0ZXJzIHRvIGEgc21hbGwgZGlzdGFuY2UgdW5pdCAoaW5jaGVzIG9yIGNtKS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbnZlcnRTbWFsbERpc3RhbmNlKFxuICB2YWx1ZTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbCxcbiAgdG9TbWFsbFVuaXQ6IFNtYWxsRGlzdGFuY2VVbml0XG4pOiBudW1iZXIgfCBzdHJpbmcgfCBudWxsIHtcbiAgaWYgKHZhbHVlID09PSBudWxsIHx8IHZhbHVlID09PSBcIlwiKSByZXR1cm4gdmFsdWU7XG5cbiAgY29uc3QgbnVtVmFsdWUgPSB0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCIgPyBwYXJzZUZsb2F0KHZhbHVlKSA6IHZhbHVlO1xuICBpZiAoaXNOYU4obnVtVmFsdWUpKSByZXR1cm4gdmFsdWU7XG5cbiAgcmV0dXJuIHRvU21hbGxVbml0ID09PSBcImluY2hlc1wiID8gbnVtVmFsdWUgKiAzOS4zNzAxIDogbnVtVmFsdWUgKiAxMDA7XG59XG5cbi8qKlxuICogQ29udmVydCBhIGRpc3RhbmNlIHZhbHVlIGZyb20gbWV0ZXJzIHRvIG1pbGxpbWV0ZXJzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gY29udmVydE1pbGxpbWV0ZXJzKFxuICB2YWx1ZTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbFxuKTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbCB7XG4gIGlmICh2YWx1ZSA9PT0gbnVsbCB8fCB2YWx1ZSA9PT0gXCJcIikgcmV0dXJuIHZhbHVlO1xuXG4gIGNvbnN0IG51bVZhbHVlID0gdHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiID8gcGFyc2VGbG9hdCh2YWx1ZSkgOiB2YWx1ZTtcbiAgaWYgKGlzTmFOKG51bVZhbHVlKSkgcmV0dXJuIHZhbHVlO1xuXG4gIHJldHVybiBudW1WYWx1ZSAqIDEwMDA7XG59XG5cbi8qKlxuICogTm9ybWFsaXplIGEgbWV0cmljIHZhbHVlIGJhc2VkIG9uIHVuaXQgc3lzdGVtIGFsaWdubWVudCBhbmQgdXNlcidzIHVuaXQgY2hvaWNlLlxuICpcbiAqIENvbnZlcnRzIHZhbHVlcyBmcm9tIHRoZSBzb3VyY2UgdW5pdHMgdG8gdGFyZ2V0IG91dHB1dCB1bml0czpcbiAqIC0gRGlzdGFuY2U6IHlhcmRzIG9yIG1ldGVycyAocGVyIHVuaXRDaG9pY2UuZGlzdGFuY2UpXG4gKiAtIEFuZ2xlczogYWx3YXlzIGRlZ3JlZXNcbiAqIC0gU3BlZWQ6IG1waCBvciBtL3MgKHBlciB1bml0Q2hvaWNlLnNwZWVkKVxuICpcbiAqIEBwYXJhbSB2YWx1ZSAtIFRoZSByYXcgbWV0cmljIHZhbHVlXG4gKiBAcGFyYW0gbWV0cmljTmFtZSAtIFRoZSBuYW1lIG9mIHRoZSBtZXRyaWMgYmVpbmcgbm9ybWFsaXplZFxuICogQHBhcmFtIHJlcG9ydFVuaXRTeXN0ZW0gLSBUaGUgdW5pdCBzeXN0ZW0gdXNlZCBpbiB0aGUgc291cmNlIGRhdGFcbiAqIEBwYXJhbSB1bml0Q2hvaWNlIC0gVXNlcidzIHVuaXQgY2hvaWNlIChkZWZhdWx0cyB0byBtcGggKyB5YXJkcylcbiAqIEByZXR1cm5zIE5vcm1hbGl6ZWQgdmFsdWUgYXMgbnVtYmVyIG9yIHN0cmluZyAobnVsbCBpZiBpbnZhbGlkKVxuICovXG5leHBvcnQgZnVuY3Rpb24gbm9ybWFsaXplTWV0cmljVmFsdWUoXG4gIHZhbHVlOiBNZXRyaWNWYWx1ZSxcbiAgbWV0cmljTmFtZTogc3RyaW5nLFxuICByZXBvcnRVbml0U3lzdGVtOiBVbml0U3lzdGVtLFxuICB1bml0Q2hvaWNlOiBVbml0Q2hvaWNlID0gREVGQVVMVF9VTklUX0NIT0lDRVxuKTogTWV0cmljVmFsdWUge1xuICBjb25zdCBudW1WYWx1ZSA9IHBhcnNlTnVtZXJpY1ZhbHVlKHZhbHVlKTtcbiAgaWYgKG51bVZhbHVlID09PSBudWxsKSByZXR1cm4gdmFsdWU7XG5cbiAgbGV0IGNvbnZlcnRlZDogbnVtYmVyO1xuXG4gIGlmIChNSUxMSU1FVEVSX01FVFJJQ1MuaGFzKG1ldHJpY05hbWUpKSB7XG4gICAgY29udmVydGVkID0gY29udmVydE1pbGxpbWV0ZXJzKG51bVZhbHVlKSBhcyBudW1iZXI7XG4gIH0gZWxzZSBpZiAoU01BTExfRElTVEFOQ0VfTUVUUklDUy5oYXMobWV0cmljTmFtZSkpIHtcbiAgICBjb252ZXJ0ZWQgPSBjb252ZXJ0U21hbGxEaXN0YW5jZShcbiAgICAgIG51bVZhbHVlLFxuICAgICAgZ2V0U21hbGxEaXN0YW5jZVVuaXQodW5pdENob2ljZSlcbiAgICApIGFzIG51bWJlcjtcbiAgfSBlbHNlIGlmIChESVNUQU5DRV9NRVRSSUNTLmhhcyhtZXRyaWNOYW1lKSkge1xuICAgIGNvbnZlcnRlZCA9IGNvbnZlcnREaXN0YW5jZShcbiAgICAgIG51bVZhbHVlLFxuICAgICAgcmVwb3J0VW5pdFN5c3RlbS5kaXN0YW5jZVVuaXQsXG4gICAgICB1bml0Q2hvaWNlLmRpc3RhbmNlXG4gICAgKSBhcyBudW1iZXI7XG4gIH0gZWxzZSBpZiAoQU5HTEVfTUVUUklDUy5oYXMobWV0cmljTmFtZSkpIHtcbiAgICBjb252ZXJ0ZWQgPSBjb252ZXJ0QW5nbGUoXG4gICAgICBudW1WYWx1ZSxcbiAgICAgIHJlcG9ydFVuaXRTeXN0ZW0uYW5nbGVVbml0LFxuICAgICAgXCJkZWdyZWVzXCJcbiAgICApIGFzIG51bWJlcjtcbiAgfSBlbHNlIGlmIChTUEVFRF9NRVRSSUNTLmhhcyhtZXRyaWNOYW1lKSkge1xuICAgIGNvbnZlcnRlZCA9IGNvbnZlcnRTcGVlZChcbiAgICAgIG51bVZhbHVlLFxuICAgICAgcmVwb3J0VW5pdFN5c3RlbS5zcGVlZFVuaXQsXG4gICAgICB1bml0Q2hvaWNlLnNwZWVkXG4gICAgKSBhcyBudW1iZXI7XG4gIH0gZWxzZSB7XG4gICAgY29udmVydGVkID0gbnVtVmFsdWU7XG4gIH1cblxuICAvLyBTcGluUmF0ZTogcm91bmQgdG8gd2hvbGUgbnVtYmVyc1xuICBpZiAobWV0cmljTmFtZSA9PT0gXCJTcGluUmF0ZVwiKSByZXR1cm4gTWF0aC5yb3VuZChjb252ZXJ0ZWQpO1xuXG4gIC8vIEltcGFjdCBsb2NhdGlvbiBtZXRyaWNzIGFyZSBkaXNwbGF5ZWQgYXMgd2hvbGUgbWlsbGltZXRlcnMuXG4gIGlmIChNSUxMSU1FVEVSX01FVFJJQ1MuaGFzKG1ldHJpY05hbWUpKSByZXR1cm4gTWF0aC5yb3VuZChjb252ZXJ0ZWQpO1xuXG4gIC8vIFNtYXNoRmFjdG9yIC8gVGVtcG86IHJvdW5kIHRvIDIgZGVjaW1hbCBwbGFjZXNcbiAgaWYgKG1ldHJpY05hbWUgPT09IFwiU21hc2hGYWN0b3JcIiB8fCBtZXRyaWNOYW1lID09PSBcIlRlbXBvXCIpXG4gICAgcmV0dXJuIE1hdGgucm91bmQoY29udmVydGVkICogMTAwKSAvIDEwMDtcblxuICAvLyBSb3VuZCB0byAxIGRlY2ltYWwgcGxhY2UgZm9yIGNvbnNpc3RlbmN5XG4gIHJldHVybiBNYXRoLnJvdW5kKGNvbnZlcnRlZCAqIDEwKSAvIDEwO1xufVxuXG4vKipcbiAqIFBhcnNlIGEgbnVtZXJpYyB2YWx1ZSBmcm9tIE1ldHJpY1ZhbHVlIHR5cGUuXG4gKi9cbmZ1bmN0aW9uIHBhcnNlTnVtZXJpY1ZhbHVlKHZhbHVlOiBNZXRyaWNWYWx1ZSk6IG51bWJlciB8IG51bGwge1xuICBpZiAodmFsdWUgPT09IG51bGwgfHwgdmFsdWUgPT09IFwiXCIpIHJldHVybiBudWxsO1xuICBpZiAodHlwZW9mIHZhbHVlID09PSBcIm51bWJlclwiKSByZXR1cm4gaXNOYU4odmFsdWUpID8gbnVsbCA6IHZhbHVlO1xuICBcbiAgY29uc3QgcGFyc2VkID0gcGFyc2VGbG9hdCh2YWx1ZSk7XG4gIHJldHVybiBpc05hTihwYXJzZWQpID8gbnVsbCA6IHBhcnNlZDtcbn1cblxuZXhwb3J0IHR5cGUgTWV0cmljVmFsdWUgPSBzdHJpbmcgfCBudW1iZXIgfCBudWxsO1xuIiwgIi8qKlxuICogQ1NWIHdyaXRlciBmb3IgVHJhY2tQdWxsIHNlc3Npb24gZGF0YS5cbiAqIEltcGxlbWVudHMgY29yZSBjb2x1bW5zOiBEYXRlLCBDbHViLCBTaG90ICMsIFR5cGVcbiAqL1xuXG5pbXBvcnQgdHlwZSB7IFNlc3Npb25EYXRhLCBDbHViR3JvdXAsIFNob3QgfSBmcm9tIFwiLi4vbW9kZWxzL3R5cGVzXCI7XG5pbXBvcnQge1xuICBnZXRBcGlTb3VyY2VVbml0U3lzdGVtLFxuICBnZXRNZXRyaWNVbml0TGFiZWwsXG4gIG5vcm1hbGl6ZU1ldHJpY1ZhbHVlLFxuICBERUZBVUxUX1VOSVRfQ0hPSUNFLFxuICB0eXBlIFVuaXRDaG9pY2UsXG59IGZyb20gXCIuL3VuaXRfbm9ybWFsaXphdGlvblwiO1xuaW1wb3J0IHsgTUVUUklDX0RJU1BMQVlfTkFNRVMgfSBmcm9tIFwiLi9jb25zdGFudHNcIjtcblxuY29uc3QgTUVUUklDX0NPTFVNTl9PUkRFUjogc3RyaW5nW10gPSBbXG4gIC8vIFNwZWVkICYgRWZmaWNpZW5jeVxuICBcIkNsdWJTcGVlZFwiLCBcIkJhbGxTcGVlZFwiLCBcIlNtYXNoRmFjdG9yXCIsXG4gIC8vIENsdWIgRGVsaXZlcnlcbiAgXCJBdHRhY2tBbmdsZVwiLCBcIkNsdWJQYXRoXCIsIFwiRmFjZUFuZ2xlXCIsIFwiRmFjZVRvUGF0aFwiLCBcIlN3aW5nRGlyZWN0aW9uXCIsIFwiRHluYW1pY0xvZnRcIixcbiAgLy8gTGF1bmNoICYgU3BpblxuICBcIkxhdW5jaEFuZ2xlXCIsIFwiTGF1bmNoRGlyZWN0aW9uXCIsIFwiU3BpblJhdGVcIiwgXCJTcGluQXhpc1wiLCBcIlNwaW5Mb2Z0XCIsXG4gIC8vIERpc3RhbmNlXG4gIFwiQ2FycnlcIiwgXCJUb3RhbFwiLFxuICAvLyBEaXNwZXJzaW9uXG4gIFwiU2lkZVwiLCBcIlNpZGVUb3RhbFwiLCBcIkNhcnJ5U2lkZVwiLCBcIlRvdGFsU2lkZVwiLCBcIkN1cnZlXCIsXG4gIC8vIEJhbGwgRmxpZ2h0XG4gIFwiSGVpZ2h0XCIsIFwiTWF4SGVpZ2h0XCIsIFwiTGFuZGluZ0FuZ2xlXCIsIFwiSGFuZ1RpbWVcIixcbiAgLy8gSW1wYWN0XG4gIFwiTG93UG9pbnREaXN0YW5jZVwiLCBcIkltcGFjdEhlaWdodFwiLCBcIkltcGFjdE9mZnNldFwiLFxuICAvLyBPdGhlclxuICBcIlRlbXBvXCIsXG5dO1xuXG5mdW5jdGlvbiBnZXREaXNwbGF5TmFtZShtZXRyaWM6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBNRVRSSUNfRElTUExBWV9OQU1FU1ttZXRyaWNdID8/IG1ldHJpYztcbn1cblxuZnVuY3Rpb24gZ2V0Q29sdW1uTmFtZShtZXRyaWM6IHN0cmluZywgdW5pdENob2ljZTogVW5pdENob2ljZSk6IHN0cmluZyB7XG4gIGNvbnN0IGRpc3BsYXlOYW1lID0gZ2V0RGlzcGxheU5hbWUobWV0cmljKTtcbiAgY29uc3QgdW5pdExhYmVsID0gZ2V0TWV0cmljVW5pdExhYmVsKG1ldHJpYywgdW5pdENob2ljZSk7XG4gIHJldHVybiB1bml0TGFiZWwgPyBgJHtkaXNwbGF5TmFtZX0gKCR7dW5pdExhYmVsfSlgIDogZGlzcGxheU5hbWU7XG59XG5cbmZ1bmN0aW9uIGdlbmVyYXRlRmlsZW5hbWUoc2Vzc2lvbjogU2Vzc2lvbkRhdGEpOiBzdHJpbmcge1xuICByZXR1cm4gYFNob3REYXRhXyR7c2Vzc2lvbi5kYXRlfS5jc3ZgO1xufVxuXG5mdW5jdGlvbiBvcmRlck1ldHJpY3NCeVByaW9yaXR5KFxuICBhbGxNZXRyaWNzOiBzdHJpbmdbXSxcbiAgcHJpb3JpdHlPcmRlcjogc3RyaW5nW11cbik6IHN0cmluZ1tdIHtcbiAgY29uc3QgcmVzdWx0OiBzdHJpbmdbXSA9IFtdO1xuICBjb25zdCBzZWVuID0gbmV3IFNldDxzdHJpbmc+KCk7XG5cbiAgZm9yIChjb25zdCBtZXRyaWMgb2YgcHJpb3JpdHlPcmRlcikge1xuICAgIGlmIChhbGxNZXRyaWNzLmluY2x1ZGVzKG1ldHJpYykgJiYgIXNlZW4uaGFzKG1ldHJpYykpIHtcbiAgICAgIHJlc3VsdC5wdXNoKG1ldHJpYyk7XG4gICAgICBzZWVuLmFkZChtZXRyaWMpO1xuICAgIH1cbiAgfVxuXG4gIGZvciAoY29uc3QgbWV0cmljIG9mIGFsbE1ldHJpY3MpIHtcbiAgICBpZiAoIXNlZW4uaGFzKG1ldHJpYykpIHtcbiAgICAgIHJlc3VsdC5wdXNoKG1ldHJpYyk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gaGFzVGFncyhzZXNzaW9uOiBTZXNzaW9uRGF0YSk6IGJvb2xlYW4ge1xuICByZXR1cm4gc2Vzc2lvbi5jbHViX2dyb3Vwcy5zb21lKChjbHViKSA9PlxuICAgIGNsdWIuc2hvdHMuc29tZSgoc2hvdCkgPT4gc2hvdC50YWcgIT09IHVuZGVmaW5lZCAmJiBzaG90LnRhZyAhPT0gXCJcIilcbiAgKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHdyaXRlQ3N2KFxuICBzZXNzaW9uOiBTZXNzaW9uRGF0YSxcbiAgaW5jbHVkZUF2ZXJhZ2VzID0gdHJ1ZSxcbiAgbWV0cmljT3JkZXI/OiBzdHJpbmdbXSxcbiAgdW5pdENob2ljZTogVW5pdENob2ljZSA9IERFRkFVTFRfVU5JVF9DSE9JQ0UsXG4gIGhpdHRpbmdTdXJmYWNlPzogXCJHcmFzc1wiIHwgXCJNYXRcIlxuKTogc3RyaW5nIHtcbiAgY29uc3Qgb3JkZXJlZE1ldHJpY3MgPSBvcmRlck1ldHJpY3NCeVByaW9yaXR5KFxuICAgIHNlc3Npb24ubWV0cmljX25hbWVzLFxuICAgIG1ldHJpY09yZGVyID8/IE1FVFJJQ19DT0xVTU5fT1JERVJcbiAgKTtcblxuICBjb25zdCBoZWFkZXJSb3c6IHN0cmluZ1tdID0gW1wiRGF0ZVwiLCBcIkNsdWJcIl07XG5cbiAgaWYgKGhhc1RhZ3Moc2Vzc2lvbikpIHtcbiAgICBoZWFkZXJSb3cucHVzaChcIlRhZ1wiKTtcbiAgfVxuXG4gIGhlYWRlclJvdy5wdXNoKFwiU2hvdCAjXCIsIFwiVHlwZVwiKTtcblxuICBmb3IgKGNvbnN0IG1ldHJpYyBvZiBvcmRlcmVkTWV0cmljcykge1xuICAgIGhlYWRlclJvdy5wdXNoKGdldENvbHVtbk5hbWUobWV0cmljLCB1bml0Q2hvaWNlKSk7XG4gIH1cblxuICBjb25zdCByb3dzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+W10gPSBbXTtcblxuICAvLyBTb3VyY2UgdW5pdCBzeXN0ZW06IEFQSSBhbHdheXMgcmV0dXJucyBtL3MgKyBtZXRlcnMsIGFuZ2xlIHVuaXQgZnJvbSByZXBvcnRcbiAgY29uc3QgdW5pdFN5c3RlbSA9IGdldEFwaVNvdXJjZVVuaXRTeXN0ZW0oc2Vzc2lvbi5tZXRhZGF0YV9wYXJhbXMpO1xuXG4gIGZvciAoY29uc3QgY2x1YiBvZiBzZXNzaW9uLmNsdWJfZ3JvdXBzKSB7XG4gICAgZm9yIChjb25zdCBzaG90IG9mIGNsdWIuc2hvdHMpIHtcbiAgICAgIGNvbnN0IHJvdzogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcbiAgICAgICAgRGF0ZTogc2Vzc2lvbi5kYXRlLFxuICAgICAgICBDbHViOiBjbHViLmNsdWJfbmFtZSxcbiAgICAgICAgXCJTaG90ICNcIjogU3RyaW5nKHNob3Quc2hvdF9udW1iZXIgKyAxKSxcbiAgICAgICAgVHlwZTogXCJTaG90XCIsXG4gICAgICB9O1xuXG4gICAgICBpZiAoaGFzVGFncyhzZXNzaW9uKSkge1xuICAgICAgICByb3cuVGFnID0gc2hvdC50YWcgPz8gXCJcIjtcbiAgICAgIH1cblxuICAgICAgZm9yIChjb25zdCBtZXRyaWMgb2Ygb3JkZXJlZE1ldHJpY3MpIHtcbiAgICAgICAgY29uc3QgY29sTmFtZSA9IGdldENvbHVtbk5hbWUobWV0cmljLCB1bml0Q2hvaWNlKTtcbiAgICAgICAgY29uc3QgcmF3VmFsdWUgPSBzaG90Lm1ldHJpY3NbbWV0cmljXSA/PyBcIlwiO1xuXG4gICAgICAgIGlmICh0eXBlb2YgcmF3VmFsdWUgPT09IFwic3RyaW5nXCIgfHwgdHlwZW9mIHJhd1ZhbHVlID09PSBcIm51bWJlclwiKSB7XG4gICAgICAgICAgcm93W2NvbE5hbWVdID0gU3RyaW5nKG5vcm1hbGl6ZU1ldHJpY1ZhbHVlKHJhd1ZhbHVlLCBtZXRyaWMsIHVuaXRTeXN0ZW0sIHVuaXRDaG9pY2UpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByb3dbY29sTmFtZV0gPSBcIlwiO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJvd3MucHVzaChyb3cpO1xuICAgIH1cblxuICAgIGlmIChpbmNsdWRlQXZlcmFnZXMpIHtcbiAgICAgIC8vIEdyb3VwIHNob3RzIGJ5IHRhZ1xuICAgICAgY29uc3QgdGFnR3JvdXBzID0gbmV3IE1hcDxzdHJpbmcsIFNob3RbXT4oKTtcbiAgICAgIGZvciAoY29uc3Qgc2hvdCBvZiBjbHViLnNob3RzKSB7XG4gICAgICAgIGNvbnN0IHRhZyA9IHNob3QudGFnID8/IFwiXCI7XG4gICAgICAgIGlmICghdGFnR3JvdXBzLmhhcyh0YWcpKSB0YWdHcm91cHMuc2V0KHRhZywgW10pO1xuICAgICAgICB0YWdHcm91cHMuZ2V0KHRhZykhLnB1c2goc2hvdCk7XG4gICAgICB9XG5cbiAgICAgIGZvciAoY29uc3QgW3RhZywgc2hvdHNdIG9mIHRhZ0dyb3Vwcykge1xuICAgICAgICAvLyBPbmx5IHdyaXRlIGF2ZXJhZ2Ugcm93IGlmIGdyb3VwIGhhcyAyKyBzaG90c1xuICAgICAgICBpZiAoc2hvdHMubGVuZ3RoIDwgMikgY29udGludWU7XG5cbiAgICAgICAgY29uc3QgYXZnUm93OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xuICAgICAgICAgIERhdGU6IHNlc3Npb24uZGF0ZSxcbiAgICAgICAgICBDbHViOiBjbHViLmNsdWJfbmFtZSxcbiAgICAgICAgICBcIlNob3QgI1wiOiBcIlwiLFxuICAgICAgICAgIFR5cGU6IFwiQXZlcmFnZVwiLFxuICAgICAgICB9O1xuXG4gICAgICAgIGlmIChoYXNUYWdzKHNlc3Npb24pKSB7XG4gICAgICAgICAgYXZnUm93LlRhZyA9IHRhZztcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAoY29uc3QgbWV0cmljIG9mIG9yZGVyZWRNZXRyaWNzKSB7XG4gICAgICAgICAgY29uc3QgY29sTmFtZSA9IGdldENvbHVtbk5hbWUobWV0cmljLCB1bml0Q2hvaWNlKTtcbiAgICAgICAgICBjb25zdCB2YWx1ZXMgPSBzaG90c1xuICAgICAgICAgICAgLm1hcCgocykgPT4gcy5tZXRyaWNzW21ldHJpY10pXG4gICAgICAgICAgICAuZmlsdGVyKCh2KSA9PiB2ICE9PSB1bmRlZmluZWQgJiYgdiAhPT0gXCJcIilcbiAgICAgICAgICAgIC5tYXAoKHYpID0+IHBhcnNlRmxvYXQoU3RyaW5nKHYpKSk7XG4gICAgICAgICAgY29uc3QgbnVtZXJpY1ZhbHVlcyA9IHZhbHVlcy5maWx0ZXIoKHYpID0+ICFpc05hTih2KSk7XG5cbiAgICAgICAgICBpZiAobnVtZXJpY1ZhbHVlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBhdmcgPSBudW1lcmljVmFsdWVzLnJlZHVjZSgoYSwgYikgPT4gYSArIGIsIDApIC8gbnVtZXJpY1ZhbHVlcy5sZW5ndGg7XG4gICAgICAgICAgICBjb25zdCByb3VuZGVkID0gKG1ldHJpYyA9PT0gXCJTbWFzaEZhY3RvclwiIHx8IG1ldHJpYyA9PT0gXCJUZW1wb1wiKVxuICAgICAgICAgICAgICA/IE1hdGgucm91bmQoYXZnICogMTAwKSAvIDEwMFxuICAgICAgICAgICAgICA6IE1hdGgucm91bmQoYXZnICogMTApIC8gMTA7XG4gICAgICAgICAgICBhdmdSb3dbY29sTmFtZV0gPSBTdHJpbmcobm9ybWFsaXplTWV0cmljVmFsdWUocm91bmRlZCwgbWV0cmljLCB1bml0U3lzdGVtLCB1bml0Q2hvaWNlKSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGF2Z1Jvd1tjb2xOYW1lXSA9IFwiXCI7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcm93cy5wdXNoKGF2Z1Jvdyk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgY29uc3QgbGluZXM6IHN0cmluZ1tdID0gW107XG5cbiAgaWYgKGhpdHRpbmdTdXJmYWNlICE9PSB1bmRlZmluZWQpIHtcbiAgICBsaW5lcy5wdXNoKGBIaXR0aW5nIFN1cmZhY2U6ICR7aGl0dGluZ1N1cmZhY2V9YCk7XG4gIH1cblxuICBsaW5lcy5wdXNoKGhlYWRlclJvdy5qb2luKFwiLFwiKSk7XG4gIGZvciAoY29uc3Qgcm93IG9mIHJvd3MpIHtcbiAgICBsaW5lcy5wdXNoKFxuICAgICAgaGVhZGVyUm93XG4gICAgICAgIC5tYXAoKGNvbCkgPT4ge1xuICAgICAgICAgIGNvbnN0IHZhbHVlID0gcm93W2NvbF0gPz8gXCJcIjtcbiAgICAgICAgICBpZiAodmFsdWUuaW5jbHVkZXMoXCIsXCIpIHx8IHZhbHVlLmluY2x1ZGVzKCdcIicpIHx8IHZhbHVlLmluY2x1ZGVzKFwiXFxuXCIpKSB7XG4gICAgICAgICAgICByZXR1cm4gYFwiJHt2YWx1ZS5yZXBsYWNlKC9cIi9nLCAnXCJcIicpfVwiYDtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICB9KVxuICAgICAgICAuam9pbihcIixcIilcbiAgICApO1xuICB9XG5cbiAgcmV0dXJuIGxpbmVzLmpvaW4oXCJcXG5cIik7XG59XG4iLCAiLyoqXG4gKiBTZXNzaW9uIGhpc3Rvcnkgc3RvcmFnZSBtb2R1bGUuXG4gKiBTYXZlcywgZGVkdXBsaWNhdGVzIChieSByZXBvcnRfaWQpLCBhbmQgZXZpY3RzIHNlc3Npb25zIGZyb20gY2hyb21lLnN0b3JhZ2UubG9jYWwuXG4gKi9cblxuaW1wb3J0IHR5cGUgeyBTZXNzaW9uRGF0YSwgU2Vzc2lvblNuYXBzaG90LCBIaXN0b3J5RW50cnkgfSBmcm9tIFwiLi4vbW9kZWxzL3R5cGVzXCI7XG5pbXBvcnQgeyBTVE9SQUdFX0tFWVMgfSBmcm9tIFwiLi9jb25zdGFudHNcIjtcblxuY29uc3QgTUFYX1NFU1NJT05TID0gMjA7XG5cbi8qKiBTdHJpcCByYXdfYXBpX2RhdGEgZnJvbSBhIFNlc3Npb25EYXRhIHRvIGNyZWF0ZSBhIGxpZ2h0d2VpZ2h0IHNuYXBzaG90LiAqL1xuZnVuY3Rpb24gY3JlYXRlU25hcHNob3Qoc2Vzc2lvbjogU2Vzc2lvbkRhdGEpOiBTZXNzaW9uU25hcHNob3Qge1xuICAvLyBEZXN0cnVjdHVyZSB0byBleGNsdWRlIHJhd19hcGlfZGF0YVxuICBjb25zdCB7IHJhd19hcGlfZGF0YTogXywgLi4uc25hcHNob3QgfSA9IHNlc3Npb247XG4gIHJldHVybiBzbmFwc2hvdDtcbn1cblxuLyoqXG4gKiBTYXZlIGEgc2Vzc2lvbiB0byB0aGUgcm9sbGluZyBoaXN0b3J5IGluIGNocm9tZS5zdG9yYWdlLmxvY2FsLlxuICogLSBEZWR1cGxpY2F0ZXMgYnkgcmVwb3J0X2lkIChyZXBsYWNlcyBleGlzdGluZyBlbnRyeSwgcmVmcmVzaGVzIGNhcHR1cmVkX2F0KS5cbiAqIC0gRXZpY3RzIG9sZGVzdCBlbnRyeSB3aGVuIHRoZSAyMC1zZXNzaW9uIGNhcCBpcyByZWFjaGVkLlxuICogLSBTdG9yZXMgZW50cmllcyBzb3J0ZWQgbmV3ZXN0LWZpcnN0IChkZXNjZW5kaW5nIGNhcHR1cmVkX2F0KS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNhdmVTZXNzaW9uVG9IaXN0b3J5KHNlc3Npb246IFNlc3Npb25EYXRhKTogUHJvbWlzZTx2b2lkPiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgY2hyb21lLnN0b3JhZ2UubG9jYWwuZ2V0KFxuICAgICAgW1NUT1JBR0VfS0VZUy5TRVNTSU9OX0hJU1RPUlldLFxuICAgICAgKHJlc3VsdDogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pID0+IHtcbiAgICAgICAgaWYgKGNocm9tZS5ydW50aW1lLmxhc3RFcnJvcikge1xuICAgICAgICAgIHJldHVybiByZWplY3QobmV3IEVycm9yKGNocm9tZS5ydW50aW1lLmxhc3RFcnJvci5tZXNzYWdlKSk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBleGlzdGluZyA9IChyZXN1bHRbU1RPUkFHRV9LRVlTLlNFU1NJT05fSElTVE9SWV0gYXMgSGlzdG9yeUVudHJ5W10gfCB1bmRlZmluZWQpID8/IFtdO1xuXG4gICAgICAgIC8vIFJlbW92ZSBhbnkgZXhpc3RpbmcgZW50cnkgd2l0aCB0aGUgc2FtZSByZXBvcnRfaWQgKGRlZHVwKVxuICAgICAgICBjb25zdCBmaWx0ZXJlZCA9IGV4aXN0aW5nLmZpbHRlcihcbiAgICAgICAgICAoZW50cnkpID0+IGVudHJ5LnNuYXBzaG90LnJlcG9ydF9pZCAhPT0gc2Vzc2lvbi5yZXBvcnRfaWRcbiAgICAgICAgKTtcblxuICAgICAgICAvLyBDcmVhdGUgbmV3IGVudHJ5XG4gICAgICAgIGNvbnN0IG5ld0VudHJ5OiBIaXN0b3J5RW50cnkgPSB7XG4gICAgICAgICAgY2FwdHVyZWRfYXQ6IERhdGUubm93KCksXG4gICAgICAgICAgc25hcHNob3Q6IGNyZWF0ZVNuYXBzaG90KHNlc3Npb24pLFxuICAgICAgICB9O1xuXG4gICAgICAgIGZpbHRlcmVkLnB1c2gobmV3RW50cnkpO1xuXG4gICAgICAgIC8vIFNvcnQgbmV3ZXN0LWZpcnN0IChkZXNjZW5kaW5nIGNhcHR1cmVkX2F0KVxuICAgICAgICBmaWx0ZXJlZC5zb3J0KChhLCBiKSA9PiBiLmNhcHR1cmVkX2F0IC0gYS5jYXB0dXJlZF9hdCk7XG5cbiAgICAgICAgLy8gRW5mb3JjZSBjYXAgXHUyMDE0IHNsaWNlIGtlZXBzIHRoZSBuZXdlc3QgTUFYX1NFU1NJT05TIGVudHJpZXNcbiAgICAgICAgY29uc3QgY2FwcGVkID0gZmlsdGVyZWQuc2xpY2UoMCwgTUFYX1NFU1NJT05TKTtcblxuICAgICAgICBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoXG4gICAgICAgICAgeyBbU1RPUkFHRV9LRVlTLlNFU1NJT05fSElTVE9SWV06IGNhcHBlZCB9LFxuICAgICAgICAgICgpID0+IHtcbiAgICAgICAgICAgIGlmIChjaHJvbWUucnVudGltZS5sYXN0RXJyb3IpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHJlamVjdChuZXcgRXJyb3IoY2hyb21lLnJ1bnRpbWUubGFzdEVycm9yLm1lc3NhZ2UpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgICB9XG4gICAgKTtcbiAgfSk7XG59XG5cbi8qKlxuICogTWFwIHN0b3JhZ2UgZXJyb3Igc3RyaW5ncyB0byB1c2VyLWZyaWVuZGx5IG1lc3NhZ2VzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0SGlzdG9yeUVycm9yTWVzc2FnZShlcnJvcjogc3RyaW5nKTogc3RyaW5nIHtcbiAgaWYgKC9RVU9UQV9CWVRFU3xxdW90YS9pLnRlc3QoZXJyb3IpKSB7XG4gICAgcmV0dXJuIFwiU3RvcmFnZSBmdWxsIC0tIG9sZGVzdCBzZXNzaW9ucyB3aWxsIGJlIGNsZWFyZWRcIjtcbiAgfVxuICByZXR1cm4gXCJDb3VsZCBub3Qgc2F2ZSB0byBzZXNzaW9uIGhpc3RvcnlcIjtcbn1cbiIsICIvKipcbiAqIFBvcnRhbCBwZXJtaXNzaW9uIGhlbHBlcnMgZm9yIFRyYWNrbWFuIEFQSSBhY2Nlc3MuXG4gKiBTaGFyZWQgYnkgcG9wdXAgKHJlcXVlc3QgKyBjaGVjaykgYW5kIHNlcnZpY2Ugd29ya2VyIChjaGVjayBvbmx5KS5cbiAqL1xuXG5leHBvcnQgY29uc3QgUE9SVEFMX09SSUdJTlM6IHJlYWRvbmx5IHN0cmluZ1tdID0gW1xuICBcImh0dHBzOi8vYXBpLnRyYWNrbWFuZ29sZi5jb20vKlwiLFxuICBcImh0dHBzOi8vcG9ydGFsLnRyYWNrbWFuZ29sZi5jb20vKlwiLFxuXSBhcyBjb25zdDtcblxuLyoqIFJldHVybnMgdHJ1ZSBpZiBwb3J0YWwgaG9zdCBwZXJtaXNzaW9ucyBhcmUgY3VycmVudGx5IGdyYW50ZWQuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaGFzUG9ydGFsUGVybWlzc2lvbigpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgcmV0dXJuIGNocm9tZS5wZXJtaXNzaW9ucy5jb250YWlucyh7IG9yaWdpbnM6IFsuLi5QT1JUQUxfT1JJR0lOU10gfSk7XG59XG5cbi8qKlxuICogUmVxdWVzdHMgcG9ydGFsIGhvc3QgcGVybWlzc2lvbnMgZnJvbSB0aGUgdXNlci5cbiAqIE1VU1QgYmUgY2FsbGVkIGZyb20gYSB1c2VyIGdlc3R1cmUgKGJ1dHRvbiBjbGljayBoYW5kbGVyKS5cbiAqIFJldHVybnMgdHJ1ZSBpZiBncmFudGVkLCBmYWxzZSBpZiBkZW5pZWQuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZXF1ZXN0UG9ydGFsUGVybWlzc2lvbigpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgcmV0dXJuIGNocm9tZS5wZXJtaXNzaW9ucy5yZXF1ZXN0KHsgb3JpZ2luczogWy4uLlBPUlRBTF9PUklHSU5TXSB9KTtcbn1cbiIsICIvKipcbiAqIEdyYXBoUUwgY2xpZW50IGZvciBUcmFja21hbiBBUEkuXG4gKiBTZW5kcyBhdXRoZW50aWNhdGVkIHJlcXVlc3RzIHVzaW5nIGJyb3dzZXIgc2Vzc2lvbiBjb29raWVzIChjcmVkZW50aWFsczogaW5jbHVkZSkuXG4gKiBTaGFyZWQgYnkgc2VydmljZSB3b3JrZXIgYW5kIHBvcHVwLlxuICovXG5cbmV4cG9ydCBjb25zdCBHUkFQSFFMX0VORFBPSU5UID0gXCJodHRwczovL2FwaS50cmFja21hbmdvbGYuY29tL2dyYXBocWxcIjtcblxuZXhwb3J0IGNvbnN0IEhFQUxUSF9DSEVDS19RVUVSWSA9IGBxdWVyeSBIZWFsdGhDaGVjayB7IG1lIHsgaWQgfSB9YDtcblxuLyoqIFN0YW5kYXJkIEdyYXBoUUwgcmVzcG9uc2UgZW52ZWxvcGUuICovXG5leHBvcnQgaW50ZXJmYWNlIEdyYXBoUUxSZXNwb25zZTxUPiB7XG4gIGRhdGE6IFQgfCBudWxsO1xuICBlcnJvcnM/OiBBcnJheTx7XG4gICAgbWVzc2FnZTogc3RyaW5nO1xuICAgIGV4dGVuc2lvbnM/OiB7IGNvZGU/OiBzdHJpbmcgfTtcbiAgfT47XG59XG5cbi8qKiBBdXRoIGNsYXNzaWZpY2F0aW9uIHJlc3VsdCByZXR1cm5lZCBieSBjbGFzc2lmeUF1dGhSZXN1bHQuICovXG5leHBvcnQgdHlwZSBBdXRoU3RhdHVzID1cbiAgfCB7IGtpbmQ6IFwiYXV0aGVudGljYXRlZFwiIH1cbiAgfCB7IGtpbmQ6IFwidW5hdXRoZW50aWNhdGVkXCIgfVxuICB8IHsga2luZDogXCJlcnJvclwiOyBtZXNzYWdlOiBzdHJpbmcgfTtcblxuLyoqXG4gKiBFeGVjdXRlcyBhIEdyYXBoUUwgcXVlcnkgYWdhaW5zdCB0aGUgVHJhY2ttYW4gQVBJLlxuICogVXNlcyBjcmVkZW50aWFsczogXCJpbmNsdWRlXCIgc28gdGhlIGJyb3dzZXIgc2VuZHMgZXhpc3Rpbmcgc2Vzc2lvbiBjb29raWVzLlxuICogVGhyb3dzIGlmIHRoZSBIVFRQIHJlc3BvbnNlIGlzIG5vdCAyeHguXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBleGVjdXRlUXVlcnk8VD4oXG4gIHF1ZXJ5OiBzdHJpbmcsXG4gIHZhcmlhYmxlcz86IFJlY29yZDxzdHJpbmcsIHVua25vd24+XG4pOiBQcm9taXNlPEdyYXBoUUxSZXNwb25zZTxUPj4ge1xuICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKEdSQVBIUUxfRU5EUE9JTlQsIHtcbiAgICBtZXRob2Q6IFwiUE9TVFwiLFxuICAgIGNyZWRlbnRpYWxzOiBcImluY2x1ZGVcIixcbiAgICBoZWFkZXJzOiB7IFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiIH0sXG4gICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBxdWVyeSwgdmFyaWFibGVzIH0pLFxuICB9KTtcblxuICBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBIVFRQICR7cmVzcG9uc2Uuc3RhdHVzfWApO1xuICB9XG5cbiAgcmV0dXJuIHJlc3BvbnNlLmpzb24oKSBhcyBQcm9taXNlPEdyYXBoUUxSZXNwb25zZTxUPj47XG59XG5cbi8qKlxuICogQ2xhc3NpZmllcyBhIEdyYXBoUUwgcmVzcG9uc2UgZnJvbSB0aGUgaGVhbHRoLWNoZWNrIHF1ZXJ5IGludG8gYW4gQXV0aFN0YXR1cy5cbiAqXG4gKiBDbGFzc2lmaWNhdGlvbiBwcmlvcml0eTpcbiAqIDEuIEVycm9ycyBwcmVzZW50IGFuZCBub24tZW1wdHkgXHUyMTkyIGNoZWNrIGZvciBhdXRoIGVycm9yIHBhdHRlcm5zIFx1MjE5MiBlbHNlIGdlbmVyaWMgZXJyb3JcbiAqIDIuIE5vIGVycm9ycyBidXQgZGF0YS5tZS5pZCBpcyBmYWxzeSBcdTIxOTIgdW5hdXRoZW50aWNhdGVkXG4gKiAzLiBkYXRhLm1lLmlkIGlzIHRydXRoeSBcdTIxOTIgYXV0aGVudGljYXRlZFxuICovXG5leHBvcnQgZnVuY3Rpb24gY2xhc3NpZnlBdXRoUmVzdWx0KFxuICByZXN1bHQ6IEdyYXBoUUxSZXNwb25zZTx7IG1lOiB7IGlkOiBzdHJpbmcgfSB8IG51bGwgfT5cbik6IEF1dGhTdGF0dXMge1xuICBpZiAocmVzdWx0LmVycm9ycyAmJiByZXN1bHQuZXJyb3JzLmxlbmd0aCA+IDApIHtcbiAgICBjb25zdCBjb2RlID0gcmVzdWx0LmVycm9yc1swXS5leHRlbnNpb25zPy5jb2RlID8/IFwiXCI7XG4gICAgY29uc3QgbXNnID0gcmVzdWx0LmVycm9yc1swXS5tZXNzYWdlID8/IFwiXCI7XG4gICAgY29uc3QgbXNnTG93ZXIgPSBtc2cudG9Mb3dlckNhc2UoKTtcblxuICAgIGlmIChcbiAgICAgIGNvZGUgPT09IFwiVU5BVVRIRU5USUNBVEVEXCIgfHxcbiAgICAgIG1zZ0xvd2VyLmluY2x1ZGVzKFwidW5hdXRob3JpemVkXCIpIHx8XG4gICAgICBtc2dMb3dlci5pbmNsdWRlcyhcInVuYXV0aGVudGljYXRlZFwiKSB8fFxuICAgICAgbXNnTG93ZXIuaW5jbHVkZXMoXCJub3QgbG9nZ2VkIGluXCIpXG4gICAgKSB7XG4gICAgICByZXR1cm4geyBraW5kOiBcInVuYXV0aGVudGljYXRlZFwiIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIHsga2luZDogXCJlcnJvclwiLCBtZXNzYWdlOiBcIlVuYWJsZSB0byByZWFjaCBUcmFja21hbiBcdTIwMTQgdHJ5IGFnYWluIGxhdGVyXCIgfTtcbiAgfVxuXG4gIGlmICghcmVzdWx0LmRhdGE/Lm1lPy5pZCkge1xuICAgIHJldHVybiB7IGtpbmQ6IFwidW5hdXRoZW50aWNhdGVkXCIgfTtcbiAgfVxuXG4gIHJldHVybiB7IGtpbmQ6IFwiYXV0aGVudGljYXRlZFwiIH07XG59XG4iLCAiLyoqXG4gKiBQb3J0YWwgR3JhcGhRTCBhY3Rpdml0eSBwYXJzZXIuXG4gKlxuICogQ29udmVydHMgR3JhcGhRTCBhY3Rpdml0eSByZXNwb25zZXMgKGZyb20gUGhhc2UgMjIgZ3JhcGhxbF9jbGllbnQpIGludG8gdGhlXG4gKiBleGlzdGluZyBTZXNzaW9uRGF0YSBmb3JtYXQsIGVuYWJsaW5nIHBvcnRhbC1mZXRjaGVkIGRhdGEgdG8gZmxvdyBpbnRvIHRoZVxuICogQ1NWIGV4cG9ydCwgQUkgYW5hbHlzaXMsIGFuZCBzZXNzaW9uIGhpc3RvcnkgcGlwZWxpbmUuXG4gKlxuICogS2V5IGRlc2lnbiBkZWNpc2lvbnM6XG4gKiAtIEdSQVBIUUxfTUVUUklDX0FMSUFTIG1hcHMgYWxsIDI5IGtub3duIGNhbWVsQ2FzZSBHcmFwaFFMIGZpZWxkIG5hbWVzIHRvXG4gKiAgIFBhc2NhbENhc2UgTUVUUklDX0tFWVMgbmFtZXMuIFVua25vd24gZmllbGRzIGFyZSBub3JtYWxpemVkIHZpYSB0b1Bhc2NhbENhc2UuXG4gKiAtIERvZXMgTk9UIGltcG9ydCBNRVRSSUNfS0VZUyBmcm9tIGludGVyY2VwdG9yLnRzIHRvIGF2b2lkIGFjY2lkZW50YWxseVxuICogICBmaWx0ZXJpbmcgdW5rbm93biBmdXR1cmUgZmllbGRzIChELTAxIGFudGktcGF0dGVybikuXG4gKiAtIE51bGwvdW5kZWZpbmVkL05hTiB2YWx1ZXMgYXJlIG9taXR0ZWQgXHUyMDE0IG5vIHBoYW50b20gZW1wdHkgbWV0cmljcy5cbiAqIC0gTWV0cmljIHZhbHVlcyBhcmUgc3RvcmVkIGFzIHN0cmluZ3MgZm9yIGNvbnNpc3RlbmN5IHdpdGggaW50ZXJjZXB0b3Igb3V0cHV0LlxuICogLSByZXBvcnRfaWQgaXMgdGhlIFVVSUQgZGVjb2RlZCBmcm9tIHRoZSBiYXNlNjQgYWN0aXZpdHkgSUQgKFBJUEUtMDMgZGVkdXApLlxuICovXG5cbmltcG9ydCB0eXBlIHsgU2Vzc2lvbkRhdGEsIFNob3QsIENsdWJHcm91cCB9IGZyb20gXCIuLi9tb2RlbHMvdHlwZXNcIjtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBFeHBvcnRlZCB0eXBlcyAodXNlZCBieSBQaGFzZSAyNCBpbnRlZ3JhdGlvbilcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5leHBvcnQgaW50ZXJmYWNlIFN0cm9rZU1lYXN1cmVtZW50IHtcbiAgW2tleTogc3RyaW5nXTogbnVtYmVyIHwgbnVsbCB8IHVuZGVmaW5lZDtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBHcmFwaFFMU3Ryb2tlIHtcbiAgaWQ/OiBzdHJpbmcgfCBudWxsO1xuICBtZWFzdXJlbWVudD86IFN0cm9rZU1lYXN1cmVtZW50IHwgbnVsbDtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBHcmFwaFFMU3Ryb2tlR3JvdXAge1xuICBjbHViPzogc3RyaW5nIHwgbnVsbDtcbiAgc3Ryb2tlcz86IEdyYXBoUUxTdHJva2VbXSB8IG51bGw7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgR3JhcGhRTEFjdGl2aXR5IHtcbiAgaWQ6IHN0cmluZztcbiAgZGF0ZT86IHN0cmluZyB8IG51bGw7XG4gIHN0cm9rZUdyb3Vwcz86IEdyYXBoUUxTdHJva2VHcm91cFtdIHwgbnVsbDtcbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBHUkFQSFFMX01FVFJJQ19BTElBUyBcdTIwMTQgYWxsIDI5IE1FVFJJQ19LRVlTIGZyb20gY2FtZWxDYXNlIHRvIFBhc2NhbENhc2Vcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5jb25zdCBHUkFQSFFMX01FVFJJQ19BTElBUzogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcbiAgY2x1YlNwZWVkOiBcIkNsdWJTcGVlZFwiLFxuICBiYWxsU3BlZWQ6IFwiQmFsbFNwZWVkXCIsXG4gIHNtYXNoRmFjdG9yOiBcIlNtYXNoRmFjdG9yXCIsXG4gIGF0dGFja0FuZ2xlOiBcIkF0dGFja0FuZ2xlXCIsXG4gIGNsdWJQYXRoOiBcIkNsdWJQYXRoXCIsXG4gIGZhY2VBbmdsZTogXCJGYWNlQW5nbGVcIixcbiAgZmFjZVRvUGF0aDogXCJGYWNlVG9QYXRoXCIsXG4gIHN3aW5nRGlyZWN0aW9uOiBcIlN3aW5nRGlyZWN0aW9uXCIsXG4gIGR5bmFtaWNMb2Z0OiBcIkR5bmFtaWNMb2Z0XCIsXG4gIHNwaW5SYXRlOiBcIlNwaW5SYXRlXCIsXG4gIHNwaW5BeGlzOiBcIlNwaW5BeGlzXCIsXG4gIHNwaW5Mb2Z0OiBcIlNwaW5Mb2Z0XCIsXG4gIGxhdW5jaEFuZ2xlOiBcIkxhdW5jaEFuZ2xlXCIsXG4gIGxhdW5jaERpcmVjdGlvbjogXCJMYXVuY2hEaXJlY3Rpb25cIixcbiAgY2Fycnk6IFwiQ2FycnlcIixcbiAgdG90YWw6IFwiVG90YWxcIixcbiAgc2lkZTogXCJTaWRlXCIsXG4gIHNpZGVUb3RhbDogXCJTaWRlVG90YWxcIixcbiAgY2FycnlTaWRlOiBcIkNhcnJ5U2lkZVwiLFxuICB0b3RhbFNpZGU6IFwiVG90YWxTaWRlXCIsXG4gIGhlaWdodDogXCJIZWlnaHRcIixcbiAgbWF4SGVpZ2h0OiBcIk1heEhlaWdodFwiLFxuICBjdXJ2ZTogXCJDdXJ2ZVwiLFxuICBsYW5kaW5nQW5nbGU6IFwiTGFuZGluZ0FuZ2xlXCIsXG4gIGhhbmdUaW1lOiBcIkhhbmdUaW1lXCIsXG4gIGxvd1BvaW50RGlzdGFuY2U6IFwiTG93UG9pbnREaXN0YW5jZVwiLFxuICBpbXBhY3RIZWlnaHQ6IFwiSW1wYWN0SGVpZ2h0XCIsXG4gIGltcGFjdE9mZnNldDogXCJJbXBhY3RPZmZzZXRcIixcbiAgdGVtcG86IFwiVGVtcG9cIixcbn07XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gSGVscGVyIGZ1bmN0aW9uc1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbi8qKiBDb252ZXJ0IGZpcnN0IGNoYXJhY3RlciB0byB1cHBlcmNhc2UgXHUyMDE0IHVzZWQgZm9yIHVua25vd24gZmllbGRzIGJleW9uZCBNRVRSSUNfS0VZUy4gKi9cbmZ1bmN0aW9uIHRvUGFzY2FsQ2FzZShrZXk6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBrZXkuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBrZXkuc2xpY2UoMSk7XG59XG5cbi8qKiBSZXNvbHZlIGEgR3JhcGhRTCBjYW1lbENhc2UgZmllbGQgbmFtZSB0byBpdHMgY2Fub25pY2FsIFBhc2NhbENhc2UgbWV0cmljIGtleS4gKi9cbmZ1bmN0aW9uIG5vcm1hbGl6ZU1ldHJpY0tleShncmFwaHFsS2V5OiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gR1JBUEhRTF9NRVRSSUNfQUxJQVNbZ3JhcGhxbEtleV0gPz8gdG9QYXNjYWxDYXNlKGdyYXBocWxLZXkpO1xufVxuXG4vKipcbiAqIERlY29kZSBhIFRyYWNrbWFuIGJhc2U2NCBhY3Rpdml0eSBJRCB0byBleHRyYWN0IHRoZSBVVUlEIHBvcnRpb24uXG4gKlxuICogVHJhY2ttYW4gZW5jb2RlcyBhY3Rpdml0eSBJRHMgYXM6IGJ0b2EoXCJTZXNzaW9uQWN0aXZpdHlcXG48dXVpZD5cIilcbiAqIFJldHVybnMgdGhlIHJhdyBpbnB1dCBzdHJpbmcgaWYgZGVjb2RpbmcgZmFpbHMgb3Igbm8gbmV3bGluZSBpcyBmb3VuZC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV4dHJhY3RBY3Rpdml0eVV1aWQoYmFzZTY0SWQ6IHN0cmluZyk6IHN0cmluZyB7XG4gIHRyeSB7XG4gICAgY29uc3QgZGVjb2RlZCA9IGF0b2IoYmFzZTY0SWQpO1xuICAgIGNvbnN0IHBhcnRzID0gZGVjb2RlZC5zcGxpdChcIlxcblwiKTtcbiAgICBjb25zdCB1dWlkID0gcGFydHNbMV0/LnRyaW0oKTtcbiAgICBpZiAoIXV1aWQpIHJldHVybiBiYXNlNjRJZDtcbiAgICByZXR1cm4gdXVpZDtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIGJhc2U2NElkO1xuICB9XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gTWFpbiBleHBvcnRlZCBwYXJzZXJcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4vKipcbiAqIENvbnZlcnQgYSBHcmFwaFFMIGFjdGl2aXR5IHJlc3BvbnNlIGludG8gdGhlIFNlc3Npb25EYXRhIGZvcm1hdC5cbiAqXG4gKiBSZXR1cm5zIG51bGwgaWYgdGhlIGFjdGl2aXR5IGlzIG1hbGZvcm1lZCwgbWlzc2luZyBhbiBJRCwgb3IgcHJvZHVjZXMgbm9cbiAqIHZhbGlkIGNsdWIgZ3JvdXBzIGFmdGVyIGZpbHRlcmluZyBlbXB0eS9udWxsIHN0cm9rZXMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZVBvcnRhbEFjdGl2aXR5KFxuICBhY3Rpdml0eTogR3JhcGhRTEFjdGl2aXR5XG4pOiBTZXNzaW9uRGF0YSB8IG51bGwge1xuICB0cnkge1xuICAgIGlmICghYWN0aXZpdHk/LmlkKSByZXR1cm4gbnVsbDtcblxuICAgIGNvbnN0IHJlcG9ydElkID0gZXh0cmFjdEFjdGl2aXR5VXVpZChhY3Rpdml0eS5pZCk7XG4gICAgY29uc3QgZGF0ZSA9IGFjdGl2aXR5LmRhdGUgPz8gXCJVbmtub3duXCI7XG4gICAgY29uc3QgYWxsTWV0cmljTmFtZXMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICBjb25zdCBjbHViX2dyb3VwczogQ2x1Ykdyb3VwW10gPSBbXTtcblxuICAgIGZvciAoY29uc3QgZ3JvdXAgb2YgYWN0aXZpdHkuc3Ryb2tlR3JvdXBzID8/IFtdKSB7XG4gICAgICBpZiAoIWdyb3VwIHx8IHR5cGVvZiBncm91cCAhPT0gXCJvYmplY3RcIikgY29udGludWU7XG5cbiAgICAgIGNvbnN0IGNsdWJOYW1lID0gZ3JvdXAuY2x1YiB8fCBcIlVua25vd25cIjtcbiAgICAgIGNvbnN0IHNob3RzOiBTaG90W10gPSBbXTtcbiAgICAgIGxldCBzaG90TnVtYmVyID0gMTtcblxuICAgICAgZm9yIChjb25zdCBzdHJva2Ugb2YgZ3JvdXAuc3Ryb2tlcyA/PyBbXSkge1xuICAgICAgICBpZiAoIXN0cm9rZT8ubWVhc3VyZW1lbnQpIGNvbnRpbnVlO1xuXG4gICAgICAgIGNvbnN0IHNob3RNZXRyaWNzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge307XG5cbiAgICAgICAgZm9yIChjb25zdCBba2V5LCB2YWx1ZV0gb2YgT2JqZWN0LmVudHJpZXMoc3Ryb2tlLm1lYXN1cmVtZW50KSkge1xuICAgICAgICAgIC8vIFNraXAgbnVsbC91bmRlZmluZWRcbiAgICAgICAgICBpZiAodmFsdWUgPT09IG51bGwgfHwgdmFsdWUgPT09IHVuZGVmaW5lZCkgY29udGludWU7XG5cbiAgICAgICAgICAvLyBSZXNvbHZlIG51bWVyaWMgdmFsdWUgXHUyMDE0IHNraXAgTmFOLXByb2R1Y2luZyBzdHJpbmdzXG4gICAgICAgICAgY29uc3QgbnVtVmFsdWUgPVxuICAgICAgICAgICAgdHlwZW9mIHZhbHVlID09PSBcIm51bWJlclwiID8gdmFsdWUgOiBwYXJzZUZsb2F0KFN0cmluZyh2YWx1ZSkpO1xuICAgICAgICAgIGlmIChpc05hTihudW1WYWx1ZSkpIGNvbnRpbnVlO1xuXG4gICAgICAgICAgY29uc3Qgbm9ybWFsaXplZEtleSA9IG5vcm1hbGl6ZU1ldHJpY0tleShrZXkpO1xuICAgICAgICAgIHNob3RNZXRyaWNzW25vcm1hbGl6ZWRLZXldID0gYCR7bnVtVmFsdWV9YDtcbiAgICAgICAgICBhbGxNZXRyaWNOYW1lcy5hZGQobm9ybWFsaXplZEtleSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBPbmx5IGFkZCB0aGUgc2hvdCBpZiBpdCBoYXMgYXQgbGVhc3Qgb25lIHZhbGlkIG1ldHJpY1xuICAgICAgICBpZiAoT2JqZWN0LmtleXMoc2hvdE1ldHJpY3MpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICBzaG90cy5wdXNoKHtcbiAgICAgICAgICAgIHNob3RfbnVtYmVyOiBzaG90TnVtYmVyKyssXG4gICAgICAgICAgICBtZXRyaWNzOiBzaG90TWV0cmljcyxcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBPbmx5IGFkZCB0aGUgY2x1YiBncm91cCBpZiBpdCBoYXMgYXQgbGVhc3Qgb25lIHZhbGlkIHNob3RcbiAgICAgIGlmIChzaG90cy5sZW5ndGggPiAwKSB7XG4gICAgICAgIGNsdWJfZ3JvdXBzLnB1c2goe1xuICAgICAgICAgIGNsdWJfbmFtZTogY2x1Yk5hbWUsXG4gICAgICAgICAgc2hvdHMsXG4gICAgICAgICAgYXZlcmFnZXM6IHt9LFxuICAgICAgICAgIGNvbnNpc3RlbmN5OiB7fSxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGNsdWJfZ3JvdXBzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIG51bGw7XG5cbiAgICBjb25zdCBzZXNzaW9uOiBTZXNzaW9uRGF0YSA9IHtcbiAgICAgIGRhdGUsXG4gICAgICByZXBvcnRfaWQ6IHJlcG9ydElkLFxuICAgICAgdXJsX3R5cGU6IFwiYWN0aXZpdHlcIixcbiAgICAgIGNsdWJfZ3JvdXBzLFxuICAgICAgbWV0cmljX25hbWVzOiBBcnJheS5mcm9tKGFsbE1ldHJpY05hbWVzKS5zb3J0KCksXG4gICAgICBtZXRhZGF0YV9wYXJhbXM6IHsgYWN0aXZpdHlfaWQ6IGFjdGl2aXR5LmlkIH0sXG4gICAgfTtcblxuICAgIHJldHVybiBzZXNzaW9uO1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICBjb25zb2xlLmVycm9yKFwiW3BvcnRhbF9wYXJzZXJdIEZhaWxlZCB0byBwYXJzZSBhY3Rpdml0eTpcIiwgZXJyKTtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuIiwgIi8qKlxuICogSW1wb3J0IHN0YXR1cyB0eXBlcyBhbmQgR3JhcGhRTCBxdWVyaWVzIGZvciBwb3J0YWwgc2Vzc2lvbiBpbXBvcnQuXG4gKiBQZXIgRC0wMTogc2ltcGxlIHJlc3VsdC1vbmx5IHN0YXR1cyBcdTIwMTQgaWRsZS9pbXBvcnRpbmcvc3VjY2Vzcy9lcnJvci5cbiAqL1xuXG4vKiogSW1wb3J0IHN0YXR1cyBzdG9yZWQgaW4gY2hyb21lLnN0b3JhZ2UubG9jYWwgdW5kZXIgU1RPUkFHRV9LRVlTLklNUE9SVF9TVEFUVVMuIFBlciBELTAxLiAqL1xuZXhwb3J0IHR5cGUgSW1wb3J0U3RhdHVzID1cbiAgfCB7IHN0YXRlOiBcImlkbGVcIiB9XG4gIHwgeyBzdGF0ZTogXCJpbXBvcnRpbmdcIiB9XG4gIHwgeyBzdGF0ZTogXCJzdWNjZXNzXCIgfVxuICB8IHsgc3RhdGU6IFwiZXJyb3JcIjsgbWVzc2FnZTogc3RyaW5nIH07XG5cbi8qKiBBY3Rpdml0eSBzdW1tYXJ5IHJldHVybmVkIGJ5IEZFVENIX0FDVElWSVRJRVMgaGFuZGxlci4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQWN0aXZpdHlTdW1tYXJ5IHtcbiAgaWQ6IHN0cmluZztcbiAgZGF0ZTogc3RyaW5nO1xufVxuXG4vKipcbiAqIEZldGNoIHJlY2VudCBhY3Rpdml0aWVzLiBQZXIgRC0wNjogcGFnZSBzaXplIDIwIG1hdGNoZXMgTUFYX1NFU1NJT05TIGhpc3RvcnkgY2FwLlxuICogUXVlcnkgc2hhcGUgZm9sbG93cyBSZWxheSBjb25uZWN0aW9uIGNvbnZlbnRpb24uIElmIHRoZSBUcmFja21hbiBzY2hlbWEgdXNlc1xuICogYSBkaWZmZXJlbnQgcm9vdCBmaWVsZCwgdGhlIGhhbmRsZXIgd2lsbCBzdXJmYWNlIHRoZSBHcmFwaFFMIGVycm9yIGZvciBhZGp1c3RtZW50LlxuICovXG5leHBvcnQgY29uc3QgRkVUQ0hfQUNUSVZJVElFU19RVUVSWSA9IGBcbiAgcXVlcnkgRmV0Y2hBY3Rpdml0aWVzKCRmaXJzdDogSW50ISkge1xuICAgIGFjdGl2aXRpZXMoZmlyc3Q6ICRmaXJzdCkge1xuICAgICAgZWRnZXMge1xuICAgICAgICBub2RlIHtcbiAgICAgICAgICBpZFxuICAgICAgICAgIGRhdGVcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuYDtcblxuLyoqXG4gKiBGZXRjaCBhIHNpbmdsZSBhY3Rpdml0eSBieSBJRCB3aXRoIGZ1bGwgc3Ryb2tlIGRhdGEuXG4gKiBUaGUgbm9kZShpZDopIHF1ZXJ5IG9uIGJhc2U2NC1lbmNvZGVkIFNlc3Npb25BY3Rpdml0eSBJRHMgd2FzIGNvbmZpcm1lZFxuICogd29ya2luZyBkdXJpbmcgUGhhc2UgMjIgcmVzZWFyY2guXG4gKi9cbmV4cG9ydCBjb25zdCBJTVBPUlRfU0VTU0lPTl9RVUVSWSA9IGBcbiAgcXVlcnkgRmV0Y2hBY3Rpdml0eUJ5SWQoJGlkOiBJRCEpIHtcbiAgICBub2RlKGlkOiAkaWQpIHtcbiAgICAgIC4uLiBvbiBTZXNzaW9uQWN0aXZpdHkge1xuICAgICAgICBpZFxuICAgICAgICBkYXRlXG4gICAgICAgIHN0cm9rZUdyb3VwcyB7XG4gICAgICAgICAgY2x1YlxuICAgICAgICAgIHN0cm9rZXMge1xuICAgICAgICAgICAgaWRcbiAgICAgICAgICAgIG1lYXN1cmVtZW50IHtcbiAgICAgICAgICAgICAgY2x1YlNwZWVkIGJhbGxTcGVlZCBzbWFzaEZhY3RvciBhdHRhY2tBbmdsZSBjbHViUGF0aCBmYWNlQW5nbGVcbiAgICAgICAgICAgICAgZmFjZVRvUGF0aCBzd2luZ0RpcmVjdGlvbiBkeW5hbWljTG9mdCBzcGluUmF0ZSBzcGluQXhpcyBzcGluTG9mdFxuICAgICAgICAgICAgICBsYXVuY2hBbmdsZSBsYXVuY2hEaXJlY3Rpb24gY2FycnkgdG90YWwgc2lkZSBzaWRlVG90YWwgY2FycnlTaWRlXG4gICAgICAgICAgICAgIHRvdGFsU2lkZSBoZWlnaHQgbWF4SGVpZ2h0IGN1cnZlIGxhbmRpbmdBbmdsZSBoYW5nVGltZVxuICAgICAgICAgICAgICBsb3dQb2ludERpc3RhbmNlIGltcGFjdEhlaWdodCBpbXBhY3RPZmZzZXQgdGVtcG9cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbmA7XG4iLCAiLyoqXG4gKiBTZXJ2aWNlIFdvcmtlciBmb3IgVHJhY2tQdWxsIENocm9tZSBFeHRlbnNpb25cbiAqL1xuXG5pbXBvcnQgeyBTVE9SQUdFX0tFWVMgfSBmcm9tIFwiLi4vc2hhcmVkL2NvbnN0YW50c1wiO1xuaW1wb3J0IHsgd3JpdGVDc3YgfSBmcm9tIFwiLi4vc2hhcmVkL2Nzdl93cml0ZXJcIjtcbmltcG9ydCB0eXBlIHsgU2Vzc2lvbkRhdGEgfSBmcm9tIFwiLi4vbW9kZWxzL3R5cGVzXCI7XG5pbXBvcnQgeyBtaWdyYXRlTGVnYWN5UHJlZiwgREVGQVVMVF9VTklUX0NIT0lDRSwgdHlwZSBVbml0Q2hvaWNlLCB0eXBlIFNwZWVkVW5pdCwgdHlwZSBEaXN0YW5jZVVuaXQgfSBmcm9tIFwiLi4vc2hhcmVkL3VuaXRfbm9ybWFsaXphdGlvblwiO1xuaW1wb3J0IHsgc2F2ZVNlc3Npb25Ub0hpc3RvcnksIGdldEhpc3RvcnlFcnJvck1lc3NhZ2UgfSBmcm9tIFwiLi4vc2hhcmVkL2hpc3RvcnlcIjtcbmltcG9ydCB7IGhhc1BvcnRhbFBlcm1pc3Npb24gfSBmcm9tIFwiLi4vc2hhcmVkL3BvcnRhbFBlcm1pc3Npb25zXCI7XG5pbXBvcnQgeyBleGVjdXRlUXVlcnksIGNsYXNzaWZ5QXV0aFJlc3VsdCwgSEVBTFRIX0NIRUNLX1FVRVJZIH0gZnJvbSBcIi4uL3NoYXJlZC9ncmFwaHFsX2NsaWVudFwiO1xuaW1wb3J0IHsgcGFyc2VQb3J0YWxBY3Rpdml0eSB9IGZyb20gXCIuLi9zaGFyZWQvcG9ydGFsX3BhcnNlclwiO1xuaW1wb3J0IHR5cGUgeyBHcmFwaFFMQWN0aXZpdHkgfSBmcm9tIFwiLi4vc2hhcmVkL3BvcnRhbF9wYXJzZXJcIjtcbmltcG9ydCB0eXBlIHsgSW1wb3J0U3RhdHVzLCBBY3Rpdml0eVN1bW1hcnkgfSBmcm9tIFwiLi4vc2hhcmVkL2ltcG9ydF90eXBlc1wiO1xuaW1wb3J0IHsgRkVUQ0hfQUNUSVZJVElFU19RVUVSWSwgSU1QT1JUX1NFU1NJT05fUVVFUlkgfSBmcm9tIFwiLi4vc2hhcmVkL2ltcG9ydF90eXBlc1wiO1xuXG5jaHJvbWUucnVudGltZS5vbkluc3RhbGxlZC5hZGRMaXN0ZW5lcigoKSA9PiB7XG4gIGNvbnNvbGUubG9nKFwiVHJhY2tQdWxsIGV4dGVuc2lvbiBpbnN0YWxsZWRcIik7XG59KTtcblxuaW50ZXJmYWNlIFNhdmVEYXRhUmVxdWVzdCB7XG4gIHR5cGU6IFwiU0FWRV9EQVRBXCI7XG4gIGRhdGE6IFNlc3Npb25EYXRhO1xufVxuXG5pbnRlcmZhY2UgRXhwb3J0Q3N2UmVxdWVzdCB7XG4gIHR5cGU6IFwiRVhQT1JUX0NTVl9SRVFVRVNUXCI7XG59XG5cbmludGVyZmFjZSBHZXREYXRhUmVxdWVzdCB7XG4gIHR5cGU6IFwiR0VUX0RBVEFcIjtcbn1cblxuaW50ZXJmYWNlIEZldGNoQWN0aXZpdGllc1JlcXVlc3Qge1xuICB0eXBlOiBcIkZFVENIX0FDVElWSVRJRVNcIjtcbn1cblxuaW50ZXJmYWNlIEltcG9ydFNlc3Npb25SZXF1ZXN0IHtcbiAgdHlwZTogXCJJTVBPUlRfU0VTU0lPTlwiO1xuICBhY3Rpdml0eUlkOiBzdHJpbmc7XG59XG5cbmludGVyZmFjZSBQb3J0YWxBdXRoQ2hlY2tSZXF1ZXN0IHtcbiAgdHlwZTogXCJQT1JUQUxfQVVUSF9DSEVDS1wiO1xufVxuXG5mdW5jdGlvbiBpc0F1dGhFcnJvcihlcnJvcnM6IEFycmF5PHsgbWVzc2FnZTogc3RyaW5nOyBleHRlbnNpb25zPzogeyBjb2RlPzogc3RyaW5nIH0gfT4pOiBib29sZWFuIHtcbiAgaWYgKGVycm9ycy5sZW5ndGggPT09IDApIHJldHVybiBmYWxzZTtcbiAgY29uc3QgY29kZSA9IGVycm9yc1swXS5leHRlbnNpb25zPy5jb2RlID8/IFwiXCI7XG4gIGNvbnN0IG1zZyA9IGVycm9yc1swXS5tZXNzYWdlPy50b0xvd2VyQ2FzZSgpID8/IFwiXCI7XG4gIHJldHVybiBjb2RlID09PSBcIlVOQVVUSEVOVElDQVRFRFwiIHx8IG1zZy5pbmNsdWRlcyhcInVuYXV0aG9yaXplZFwiKSB8fCBtc2cuaW5jbHVkZXMoXCJ1bmF1dGhlbnRpY2F0ZWRcIikgfHwgbXNnLmluY2x1ZGVzKFwibm90IGxvZ2dlZCBpblwiKTtcbn1cblxuZnVuY3Rpb24gZ2V0RG93bmxvYWRFcnJvck1lc3NhZ2Uob3JpZ2luYWxFcnJvcjogc3RyaW5nKTogc3RyaW5nIHtcbiAgaWYgKG9yaWdpbmFsRXJyb3IuaW5jbHVkZXMoXCJpbnZhbGlkXCIpKSB7XG4gICAgcmV0dXJuIFwiSW52YWxpZCBkb3dubG9hZCBmb3JtYXRcIjtcbiAgfVxuICBpZiAob3JpZ2luYWxFcnJvci5pbmNsdWRlcyhcInF1b3RhXCIpIHx8IG9yaWdpbmFsRXJyb3IuaW5jbHVkZXMoXCJzcGFjZVwiKSkge1xuICAgIHJldHVybiBcIkluc3VmZmljaWVudCBzdG9yYWdlIHNwYWNlXCI7XG4gIH1cbiAgaWYgKG9yaWdpbmFsRXJyb3IuaW5jbHVkZXMoXCJibG9ja2VkXCIpIHx8IG9yaWdpbmFsRXJyb3IuaW5jbHVkZXMoXCJwb2xpY3lcIikpIHtcbiAgICByZXR1cm4gXCJEb3dubG9hZCBibG9ja2VkIGJ5IGJyb3dzZXIgc2V0dGluZ3NcIjtcbiAgfVxuICByZXR1cm4gb3JpZ2luYWxFcnJvcjtcbn1cblxudHlwZSBSZXF1ZXN0TWVzc2FnZSA9IFNhdmVEYXRhUmVxdWVzdCB8IEV4cG9ydENzdlJlcXVlc3QgfCBHZXREYXRhUmVxdWVzdCB8IEZldGNoQWN0aXZpdGllc1JlcXVlc3QgfCBJbXBvcnRTZXNzaW9uUmVxdWVzdCB8IFBvcnRhbEF1dGhDaGVja1JlcXVlc3Q7XG5cbmNocm9tZS5ydW50aW1lLm9uTWVzc2FnZS5hZGRMaXN0ZW5lcigobWVzc2FnZTogUmVxdWVzdE1lc3NhZ2UsIHNlbmRlciwgc2VuZFJlc3BvbnNlKSA9PiB7XG4gIGlmIChtZXNzYWdlLnR5cGUgPT09IFwiR0VUX0RBVEFcIikge1xuICAgIGNocm9tZS5zdG9yYWdlLmxvY2FsLmdldChbU1RPUkFHRV9LRVlTLlRSQUNLTUFOX0RBVEFdLCAocmVzdWx0KSA9PiB7XG4gICAgICBzZW5kUmVzcG9uc2UocmVzdWx0W1NUT1JBR0VfS0VZUy5UUkFDS01BTl9EQVRBXSB8fCBudWxsKTtcbiAgICB9KTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGlmIChtZXNzYWdlLnR5cGUgPT09IFwiU0FWRV9EQVRBXCIpIHtcbiAgICBjb25zdCBzZXNzaW9uRGF0YSA9IChtZXNzYWdlIGFzIFNhdmVEYXRhUmVxdWVzdCkuZGF0YTtcbiAgICBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoeyBbU1RPUkFHRV9LRVlTLlRSQUNLTUFOX0RBVEFdOiBzZXNzaW9uRGF0YSB9LCAoKSA9PiB7XG4gICAgICBpZiAoY2hyb21lLnJ1bnRpbWUubGFzdEVycm9yKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXCJUcmFja1B1bGw6IEZhaWxlZCB0byBzYXZlIGRhdGE6XCIsIGNocm9tZS5ydW50aW1lLmxhc3RFcnJvcik7XG4gICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogY2hyb21lLnJ1bnRpbWUubGFzdEVycm9yLm1lc3NhZ2UgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLmxvZyhcIlRyYWNrUHVsbDogU2Vzc2lvbiBkYXRhIHNhdmVkIHRvIHN0b3JhZ2VcIik7XG4gICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IHRydWUgfSk7XG5cbiAgICAgICAgLy8gSGlzdG9yeSBzYXZlIC0tIGZpcmUgYW5kIGZvcmdldCwgbmV2ZXIgYmxvY2tzIHByaW1hcnkgZmxvd1xuICAgICAgICBzYXZlU2Vzc2lvblRvSGlzdG9yeShzZXNzaW9uRGF0YSkuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJUcmFja1B1bGw6IEhpc3Rvcnkgc2F2ZSBmYWlsZWQ6XCIsIGVycik7XG4gICAgICAgICAgY29uc3QgbXNnID0gZ2V0SGlzdG9yeUVycm9yTWVzc2FnZShlcnIubWVzc2FnZSk7XG4gICAgICAgICAgY2hyb21lLnJ1bnRpbWUuc2VuZE1lc3NhZ2UoeyB0eXBlOiBcIkhJU1RPUllfRVJST1JcIiwgZXJyb3I6IG1zZyB9KS5jYXRjaCgoKSA9PiB7XG4gICAgICAgICAgICAvLyBQb3B1cCBub3Qgb3BlbiAtLSBhbHJlYWR5IGxvZ2dlZCB0byBjb25zb2xlXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgaWYgKG1lc3NhZ2UudHlwZSA9PT0gXCJFWFBPUlRfQ1NWX1JFUVVFU1RcIikge1xuICAgIGNocm9tZS5zdG9yYWdlLmxvY2FsLmdldChbU1RPUkFHRV9LRVlTLlRSQUNLTUFOX0RBVEEsIFNUT1JBR0VfS0VZUy5TUEVFRF9VTklULCBTVE9SQUdFX0tFWVMuRElTVEFOQ0VfVU5JVCwgU1RPUkFHRV9LRVlTLkhJVFRJTkdfU1VSRkFDRSwgU1RPUkFHRV9LRVlTLklOQ0xVREVfQVZFUkFHRVMsIFwidW5pdFByZWZlcmVuY2VcIl0sIChyZXN1bHQpID0+IHtcbiAgICAgIGNvbnN0IGRhdGEgPSByZXN1bHRbU1RPUkFHRV9LRVlTLlRSQUNLTUFOX0RBVEFdIGFzIFNlc3Npb25EYXRhIHwgdW5kZWZpbmVkO1xuICAgICAgaWYgKCFkYXRhIHx8ICFkYXRhLmNsdWJfZ3JvdXBzIHx8IGRhdGEuY2x1Yl9ncm91cHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogXCJObyBkYXRhIHRvIGV4cG9ydFwiIH0pO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIGxldCB1bml0Q2hvaWNlOiBVbml0Q2hvaWNlO1xuICAgICAgICBpZiAocmVzdWx0W1NUT1JBR0VfS0VZUy5TUEVFRF9VTklUXSAmJiByZXN1bHRbU1RPUkFHRV9LRVlTLkRJU1RBTkNFX1VOSVRdKSB7XG4gICAgICAgICAgdW5pdENob2ljZSA9IHtcbiAgICAgICAgICAgIHNwZWVkOiByZXN1bHRbU1RPUkFHRV9LRVlTLlNQRUVEX1VOSVRdIGFzIFNwZWVkVW5pdCxcbiAgICAgICAgICAgIGRpc3RhbmNlOiByZXN1bHRbU1RPUkFHRV9LRVlTLkRJU1RBTkNFX1VOSVRdIGFzIERpc3RhbmNlVW5pdCxcbiAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHVuaXRDaG9pY2UgPSBtaWdyYXRlTGVnYWN5UHJlZihyZXN1bHRbXCJ1bml0UHJlZmVyZW5jZVwiXSBhcyBzdHJpbmcgfCB1bmRlZmluZWQpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHN1cmZhY2UgPSAocmVzdWx0W1NUT1JBR0VfS0VZUy5ISVRUSU5HX1NVUkZBQ0VdIGFzIFwiR3Jhc3NcIiB8IFwiTWF0XCIpID8/IFwiTWF0XCI7XG4gICAgICAgIGNvbnN0IGluY2x1ZGVBdmVyYWdlcyA9IHJlc3VsdFtTVE9SQUdFX0tFWVMuSU5DTFVERV9BVkVSQUdFU10gPT09IHVuZGVmaW5lZFxuICAgICAgICAgID8gdHJ1ZVxuICAgICAgICAgIDogQm9vbGVhbihyZXN1bHRbU1RPUkFHRV9LRVlTLklOQ0xVREVfQVZFUkFHRVNdKTtcbiAgICAgICAgY29uc3QgY3N2Q29udGVudCA9IHdyaXRlQ3N2KGRhdGEsIGluY2x1ZGVBdmVyYWdlcywgdW5kZWZpbmVkLCB1bml0Q2hvaWNlLCBzdXJmYWNlKTtcbiAgICAgICAgY29uc3QgZmlsZW5hbWUgPSBgU2hvdERhdGFfJHtkYXRhLmRhdGUgfHwgXCJ1bmtub3duXCJ9LmNzdmA7XG5cbiAgICAgICAgY2hyb21lLmRvd25sb2Fkcy5kb3dubG9hZChcbiAgICAgICAgICB7XG4gICAgICAgICAgICB1cmw6IGBkYXRhOnRleHQvY3N2O2NoYXJzZXQ9dXRmLTgsJHtlbmNvZGVVUklDb21wb25lbnQoY3N2Q29udGVudCl9YCxcbiAgICAgICAgICAgIGZpbGVuYW1lOiBmaWxlbmFtZSxcbiAgICAgICAgICAgIHNhdmVBczogZmFsc2UsXG4gICAgICAgICAgfSxcbiAgICAgICAgICAoZG93bmxvYWRJZCkgPT4ge1xuICAgICAgICAgICAgaWYgKGNocm9tZS5ydW50aW1lLmxhc3RFcnJvcikge1xuICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiVHJhY2tQdWxsOiBEb3dubG9hZCBmYWlsZWQ6XCIsIGNocm9tZS5ydW50aW1lLmxhc3RFcnJvcik7XG4gICAgICAgICAgICAgIGNvbnN0IGVycm9yTWVzc2FnZSA9IGdldERvd25sb2FkRXJyb3JNZXNzYWdlKGNocm9tZS5ydW50aW1lLmxhc3RFcnJvci5tZXNzYWdlKTtcbiAgICAgICAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvck1lc3NhZ2UgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgVHJhY2tQdWxsOiBDU1YgZXhwb3J0ZWQgd2l0aCBkb3dubG9hZCBJRCAke2Rvd25sb2FkSWR9YCk7XG4gICAgICAgICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IHRydWUsIGRvd25sb2FkSWQsIGZpbGVuYW1lIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXCJUcmFja1B1bGw6IENTViBnZW5lcmF0aW9uIGZhaWxlZDpcIiwgZXJyb3IpO1xuICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKSB9KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGlmIChtZXNzYWdlLnR5cGUgPT09IFwiUE9SVEFMX0FVVEhfQ0hFQ0tcIikge1xuICAgIChhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBncmFudGVkID0gYXdhaXQgaGFzUG9ydGFsUGVybWlzc2lvbigpO1xuICAgICAgaWYgKCFncmFudGVkKSB7XG4gICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IHRydWUsIHN0YXR1czogXCJkZW5pZWRcIiB9KTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZXhlY3V0ZVF1ZXJ5PHsgbWU6IHsgaWQ6IHN0cmluZyB9IHwgbnVsbCB9PihIRUFMVEhfQ0hFQ0tfUVVFUlkpO1xuICAgICAgICBjb25zdCBhdXRoU3RhdHVzID0gY2xhc3NpZnlBdXRoUmVzdWx0KHJlc3VsdCk7XG4gICAgICAgIGlmIChhdXRoU3RhdHVzLmtpbmQgPT09IFwiZXJyb3JcIikge1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJUcmFja1B1bGw6IEdyYXBoUUwgaGVhbHRoIGNoZWNrIGVycm9yOlwiLCBhdXRoU3RhdHVzLm1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgICAgIHNlbmRSZXNwb25zZSh7XG4gICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICBzdGF0dXM6IGF1dGhTdGF0dXMua2luZCxcbiAgICAgICAgICBtZXNzYWdlOiBhdXRoU3RhdHVzLmtpbmQgPT09IFwiZXJyb3JcIiA/IGF1dGhTdGF0dXMubWVzc2FnZSA6IHVuZGVmaW5lZCxcbiAgICAgICAgfSk7XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIlRyYWNrUHVsbDogR3JhcGhRTCBoZWFsdGggY2hlY2sgZmFpbGVkOlwiLCBlcnIpO1xuICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiB0cnVlLCBzdGF0dXM6IFwiZXJyb3JcIiwgbWVzc2FnZTogXCJVbmFibGUgdG8gcmVhY2ggVHJhY2ttYW4gXHUyMDE0IHRyeSBhZ2FpbiBsYXRlclwiIH0pO1xuICAgICAgfVxuICAgIH0pKCk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBpZiAobWVzc2FnZS50eXBlID09PSBcIkZFVENIX0FDVElWSVRJRVNcIikge1xuICAgIChhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBncmFudGVkID0gYXdhaXQgaGFzUG9ydGFsUGVybWlzc2lvbigpO1xuICAgICAgaWYgKCFncmFudGVkKSB7XG4gICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogXCJQb3J0YWwgcGVybWlzc2lvbiBub3QgZ3JhbnRlZFwiIH0pO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBleGVjdXRlUXVlcnk8eyBhY3Rpdml0aWVzOiB7IGVkZ2VzOiBBcnJheTx7IG5vZGU6IHsgaWQ6IHN0cmluZzsgZGF0ZTogc3RyaW5nIH0gfT4gfSB9PihcbiAgICAgICAgICBGRVRDSF9BQ1RJVklUSUVTX1FVRVJZLFxuICAgICAgICAgIHsgZmlyc3Q6IDIwIH1cbiAgICAgICAgKTtcbiAgICAgICAgaWYgKHJlc3VsdC5lcnJvcnMgJiYgcmVzdWx0LmVycm9ycy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgaWYgKGlzQXV0aEVycm9yKHJlc3VsdC5lcnJvcnMpKSB7XG4gICAgICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFwiU2Vzc2lvbiBleHBpcmVkIFx1MjAxNCBsb2cgaW50byBwb3J0YWwudHJhY2ttYW5nb2xmLmNvbVwiIH0pO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFwiVW5hYmxlIHRvIGZldGNoIGFjdGl2aXRpZXMgXHUyMDE0IHRyeSBhZ2FpbiBsYXRlclwiIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgYWN0aXZpdGllczogQWN0aXZpdHlTdW1tYXJ5W10gPSByZXN1bHQuZGF0YT8uYWN0aXZpdGllcz8uZWRnZXM/Lm1hcChlID0+IGUubm9kZSkgPz8gW107XG4gICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IHRydWUsIGFjdGl2aXRpZXMgfSk7XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIlRyYWNrUHVsbDogRmV0Y2ggYWN0aXZpdGllcyBmYWlsZWQ6XCIsIGVycik7XG4gICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogXCJVbmFibGUgdG8gZmV0Y2ggYWN0aXZpdGllcyBcdTIwMTQgdHJ5IGFnYWluIGxhdGVyXCIgfSk7XG4gICAgICB9XG4gICAgfSkoKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGlmIChtZXNzYWdlLnR5cGUgPT09IFwiSU1QT1JUX1NFU1NJT05cIikge1xuICAgIGNvbnN0IHsgYWN0aXZpdHlJZCB9ID0gbWVzc2FnZSBhcyBJbXBvcnRTZXNzaW9uUmVxdWVzdDtcbiAgICAoYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgZ3JhbnRlZCA9IGF3YWl0IGhhc1BvcnRhbFBlcm1pc3Npb24oKTtcbiAgICAgIGlmICghZ3JhbnRlZCkge1xuICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFwiUG9ydGFsIHBlcm1pc3Npb24gbm90IGdyYW50ZWRcIiB9KTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgLy8gV3JpdGUgaW1wb3J0aW5nIHN0YXR1cyBCRUZPUkUgcmVzcG9uZGluZyBcdTIwMTQgUkVTSUwtMDE6IHBvcHVwIGNhbiBjbG9zZSB3aXRob3V0IGJyZWFraW5nIGltcG9ydFxuICAgICAgYXdhaXQgY2hyb21lLnN0b3JhZ2UubG9jYWwuc2V0KHsgW1NUT1JBR0VfS0VZUy5JTVBPUlRfU1RBVFVTXTogeyBzdGF0ZTogXCJpbXBvcnRpbmdcIiB9IGFzIEltcG9ydFN0YXR1cyB9KTtcbiAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IHRydWUgfSk7XG5cbiAgICAgIC8vIEltcG9ydCBjb250aW51ZXMgaW4gc2VydmljZSB3b3JrZXIgcmVnYXJkbGVzcyBvZiBwb3B1cCBzdGF0ZVxuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZXhlY3V0ZVF1ZXJ5PHsgbm9kZTogR3JhcGhRTEFjdGl2aXR5IH0+KFxuICAgICAgICAgIElNUE9SVF9TRVNTSU9OX1FVRVJZLFxuICAgICAgICAgIHsgaWQ6IGFjdGl2aXR5SWQgfVxuICAgICAgICApO1xuICAgICAgICBpZiAocmVzdWx0LmVycm9ycyAmJiByZXN1bHQuZXJyb3JzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICBpZiAoaXNBdXRoRXJyb3IocmVzdWx0LmVycm9ycykpIHtcbiAgICAgICAgICAgIGF3YWl0IGNocm9tZS5zdG9yYWdlLmxvY2FsLnNldCh7IFtTVE9SQUdFX0tFWVMuSU1QT1JUX1NUQVRVU106IHsgc3RhdGU6IFwiZXJyb3JcIiwgbWVzc2FnZTogXCJTZXNzaW9uIGV4cGlyZWQgXHUyMDE0IGxvZyBpbnRvIHBvcnRhbC50cmFja21hbmdvbGYuY29tXCIgfSBhcyBJbXBvcnRTdGF0dXMgfSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGF3YWl0IGNocm9tZS5zdG9yYWdlLmxvY2FsLnNldCh7IFtTVE9SQUdFX0tFWVMuSU1QT1JUX1NUQVRVU106IHsgc3RhdGU6IFwiZXJyb3JcIiwgbWVzc2FnZTogXCJVbmFibGUgdG8gcmVhY2ggVHJhY2ttYW4gXHUyMDE0IHRyeSBhZ2FpbiBsYXRlclwiIH0gYXMgSW1wb3J0U3RhdHVzIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgYWN0aXZpdHkgPSByZXN1bHQuZGF0YT8ubm9kZTtcbiAgICAgICAgY29uc3Qgc2Vzc2lvbiA9IGFjdGl2aXR5ID8gcGFyc2VQb3J0YWxBY3Rpdml0eShhY3Rpdml0eSkgOiBudWxsO1xuICAgICAgICBpZiAoIXNlc3Npb24pIHtcbiAgICAgICAgICAvLyBELTA5OiBlbXB0eSBhY3Rpdml0eSBcdTIwMTQgbm8gc3Ryb2tlc1xuICAgICAgICAgIGF3YWl0IGNocm9tZS5zdG9yYWdlLmxvY2FsLnNldCh7IFtTVE9SQUdFX0tFWVMuSU1QT1JUX1NUQVRVU106IHsgc3RhdGU6IFwiZXJyb3JcIiwgbWVzc2FnZTogXCJObyBzaG90IGRhdGEgZm91bmQgZm9yIHRoaXMgYWN0aXZpdHlcIiB9IGFzIEltcG9ydFN0YXR1cyB9KTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgLy8gUElQRS0wMjogd3JpdGUgdG8gVFJBQ0tNQU5fREFUQSBzbyBhbGwgZXhwb3J0L0FJL2hpc3RvcnkgcGF0aHMgc2VlIHRoZSBpbXBvcnRlZCBzZXNzaW9uXG4gICAgICAgIGF3YWl0IGNocm9tZS5zdG9yYWdlLmxvY2FsLnNldCh7IFtTVE9SQUdFX0tFWVMuVFJBQ0tNQU5fREFUQV06IHNlc3Npb24gfSk7XG4gICAgICAgIGF3YWl0IHNhdmVTZXNzaW9uVG9IaXN0b3J5KHNlc3Npb24pO1xuICAgICAgICBhd2FpdCBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoeyBbU1RPUkFHRV9LRVlTLklNUE9SVF9TVEFUVVNdOiB7IHN0YXRlOiBcInN1Y2Nlc3NcIiB9IGFzIEltcG9ydFN0YXR1cyB9KTtcbiAgICAgICAgY29uc29sZS5sb2coXCJUcmFja1B1bGw6IFNlc3Npb24gaW1wb3J0ZWQgc3VjY2Vzc2Z1bGx5OlwiLCBzZXNzaW9uLnJlcG9ydF9pZCk7XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIlRyYWNrUHVsbDogSW1wb3J0IGZhaWxlZDpcIiwgZXJyKTtcbiAgICAgICAgYXdhaXQgY2hyb21lLnN0b3JhZ2UubG9jYWwuc2V0KHsgW1NUT1JBR0VfS0VZUy5JTVBPUlRfU1RBVFVTXTogeyBzdGF0ZTogXCJlcnJvclwiLCBtZXNzYWdlOiBcIkltcG9ydCBmYWlsZWQgXHUyMDE0IHRyeSBhZ2FpblwiIH0gYXMgSW1wb3J0U3RhdHVzIH0pO1xuICAgICAgfVxuICAgIH0pKCk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbn0pO1xuXG5jaHJvbWUuc3RvcmFnZS5vbkNoYW5nZWQuYWRkTGlzdGVuZXIoKGNoYW5nZXMsIG5hbWVzcGFjZSkgPT4ge1xuICBpZiAobmFtZXNwYWNlID09PSBcImxvY2FsXCIgJiYgY2hhbmdlc1tTVE9SQUdFX0tFWVMuVFJBQ0tNQU5fREFUQV0pIHtcbiAgICBjb25zdCBuZXdWYWx1ZSA9IGNoYW5nZXNbU1RPUkFHRV9LRVlTLlRSQUNLTUFOX0RBVEFdLm5ld1ZhbHVlO1xuICAgIGNocm9tZS5ydW50aW1lLnNlbmRNZXNzYWdlKHsgdHlwZTogXCJEQVRBX1VQREFURURcIiwgZGF0YTogbmV3VmFsdWUgfSkuY2F0Y2goKCkgPT4ge1xuICAgICAgLy8gSWdub3JlIGVycm9ycyB3aGVuIG5vIHBvcHVwIGlzIGxpc3RlbmluZ1xuICAgIH0pO1xuICB9XG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7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
