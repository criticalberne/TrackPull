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
        if (stroke.isDeleted === true || stroke.isSimulated === true) continue;
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
        ballSpin: "SpinRate",
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
  var FETCH_ACTIVITIES_QUERY, STROKE_FIELDS, IMPORT_SESSION_QUERY;
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
      STROKE_FIELDS = `
  club
  time
  targetDistance
  measurement {
    clubSpeed ballSpeed smashFactor attackAngle clubPath faceAngle
    faceToPath swingDirection swingPlane dynamicLoft spinRate spinAxis spinLoft
    launchAngle launchDirection carry total carrySide totalSide
    maxHeight landingAngle hangTime
  }
`;
      IMPORT_SESSION_QUERY = `
  query FetchActivityById($id: ID!) {
    node(id: $id) {
      ... on SessionActivity {
        id time strokeCount strokes { ${STROKE_FIELDS} }
      }
      ... on VirtualRangeSessionActivity {
        id time strokeCount strokes { ${STROKE_FIELDS} }
      }
      ... on ShotAnalysisSessionActivity {
        id time strokeCount strokes { ${STROKE_FIELDS} }
      }
      ... on CombineTestActivity {
        id time strokes { ${STROKE_FIELDS} }
      }
      ... on RangeFindMyDistanceActivity {
        id time strokes {
          club
          isDeleted
          isSimulated
          measurement(measurementType: PRO_BALL_MEASUREMENT) {
            ballSpeed ballSpin spinAxis
            carry carrySide total totalSide
            landingAngle launchAngle launchDirection maxHeight
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL3NoYXJlZC9jb25zdGFudHMudHMiLCAiLi4vc3JjL3NoYXJlZC91bml0X25vcm1hbGl6YXRpb24udHMiLCAiLi4vc3JjL3NoYXJlZC9jc3Zfd3JpdGVyLnRzIiwgIi4uL3NyYy9zaGFyZWQvaGlzdG9yeS50cyIsICIuLi9zcmMvc2hhcmVkL3BvcnRhbFBlcm1pc3Npb25zLnRzIiwgIi4uL3NyYy9zaGFyZWQvZ3JhcGhxbF9jbGllbnQudHMiLCAiLi4vc3JjL3NoYXJlZC9wb3J0YWxfcGFyc2VyLnRzIiwgIi4uL3NyYy9zaGFyZWQvaW1wb3J0X3R5cGVzLnRzIiwgIi4uL3NyYy9iYWNrZ3JvdW5kL3NlcnZpY2VXb3JrZXIudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbIi8qKlxyXG4gKiBTaGFyZWQgY29uc3RhbnRzIGluY2x1ZGluZyBDU1Mgc2VsZWN0b3JzIGFuZCBjb25maWd1cmF0aW9uLlxyXG4gKiBCYXNlZCBvbiBQeXRob24gc2NyYXBlciBjb25zdGFudHMucHkgaW1wbGVtZW50YXRpb24uXHJcbiAqL1xyXG5cclxuLy8gQ29tcGxldGUgbGlzdCBvZiBhbGwga25vd24gVHJhY2ttYW4gbWV0cmljcyAoVVJMIHBhcmFtZXRlciBuYW1lcylcclxuZXhwb3J0IGNvbnN0IEFMTF9NRVRSSUNTID0gW1xyXG4gIFwiQ2x1YlNwZWVkXCIsXHJcbiAgXCJCYWxsU3BlZWRcIixcclxuICBcIlNtYXNoRmFjdG9yXCIsXHJcbiAgXCJBdHRhY2tBbmdsZVwiLFxyXG4gIFwiQ2x1YlBhdGhcIixcclxuICBcIkZhY2VBbmdsZVwiLFxyXG4gIFwiRmFjZVRvUGF0aFwiLFxyXG4gIFwiU3dpbmdEaXJlY3Rpb25cIixcclxuICBcIkR5bmFtaWNMb2Z0XCIsXHJcbiAgXCJTcGluUmF0ZVwiLFxyXG4gIFwiU3BpbkF4aXNcIixcclxuICBcIlNwaW5Mb2Z0XCIsXHJcbiAgXCJMYXVuY2hBbmdsZVwiLFxyXG4gIFwiTGF1bmNoRGlyZWN0aW9uXCIsXHJcbiAgXCJDYXJyeVwiLFxyXG4gIFwiVG90YWxcIixcclxuICBcIlNpZGVcIixcclxuICBcIlNpZGVUb3RhbFwiLFxyXG4gIFwiQ2FycnlTaWRlXCIsXHJcbiAgXCJUb3RhbFNpZGVcIixcclxuICBcIkhlaWdodFwiLFxyXG4gIFwiTWF4SGVpZ2h0XCIsXHJcbiAgXCJDdXJ2ZVwiLFxyXG4gIFwiTGFuZGluZ0FuZ2xlXCIsXHJcbiAgXCJIYW5nVGltZVwiLFxyXG4gIFwiTG93UG9pbnREaXN0YW5jZVwiLFxyXG4gIFwiSW1wYWN0SGVpZ2h0XCIsXHJcbiAgXCJJbXBhY3RPZmZzZXRcIixcclxuICBcIlRlbXBvXCIsXHJcbl0gYXMgY29uc3Q7XHJcblxyXG4vLyBNZXRyaWNzIHNwbGl0IGludG8gZ3JvdXBzIGZvciBtdWx0aS1wYWdlLWxvYWQgSFRNTCBmYWxsYmFja1xyXG5leHBvcnQgY29uc3QgTUVUUklDX0dST1VQUyA9IFtcclxuICBbXHJcbiAgICBcIkNsdWJTcGVlZFwiLFxyXG4gICAgXCJCYWxsU3BlZWRcIixcclxuICAgIFwiU21hc2hGYWN0b3JcIixcclxuICAgIFwiQXR0YWNrQW5nbGVcIixcclxuICAgIFwiQ2x1YlBhdGhcIixcclxuICAgIFwiRmFjZUFuZ2xlXCIsXHJcbiAgICBcIkZhY2VUb1BhdGhcIixcclxuICAgIFwiU3dpbmdEaXJlY3Rpb25cIixcclxuICAgIFwiRHluYW1pY0xvZnRcIixcclxuICAgIFwiU3BpbkxvZnRcIixcclxuICBdLFxyXG4gIFtcclxuICAgIFwiU3BpblJhdGVcIixcclxuICAgIFwiU3BpbkF4aXNcIixcclxuICAgIFwiTGF1bmNoQW5nbGVcIixcclxuICAgIFwiTGF1bmNoRGlyZWN0aW9uXCIsXHJcbiAgICBcIkNhcnJ5XCIsXHJcbiAgICBcIlRvdGFsXCIsXHJcbiAgICBcIlNpZGVcIixcclxuICAgIFwiU2lkZVRvdGFsXCIsXHJcbiAgICBcIkNhcnJ5U2lkZVwiLFxyXG4gICAgXCJUb3RhbFNpZGVcIixcclxuICAgIFwiSGVpZ2h0XCIsXHJcbiAgICBcIk1heEhlaWdodFwiLFxyXG4gICAgXCJDdXJ2ZVwiLFxyXG4gICAgXCJMYW5kaW5nQW5nbGVcIixcclxuICAgIFwiSGFuZ1RpbWVcIixcclxuICAgIFwiTG93UG9pbnREaXN0YW5jZVwiLFxyXG4gICAgXCJJbXBhY3RIZWlnaHRcIixcclxuICAgIFwiSW1wYWN0T2Zmc2V0XCIsXHJcbiAgICBcIlRlbXBvXCIsXHJcbiAgXSxcclxuXSBhcyBjb25zdDtcclxuXHJcbi8vIERpc3BsYXkgbmFtZXM6IFVSTCBwYXJhbSBuYW1lIC0+IGh1bWFuLXJlYWRhYmxlIENTViBoZWFkZXJcclxuZXhwb3J0IGNvbnN0IE1FVFJJQ19ESVNQTEFZX05BTUVTOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xyXG4gIENsdWJTcGVlZDogXCJDbHViIFNwZWVkXCIsXHJcbiAgQmFsbFNwZWVkOiBcIkJhbGwgU3BlZWRcIixcclxuICBTbWFzaEZhY3RvcjogXCJTbWFzaCBGYWN0b3JcIixcclxuICBBdHRhY2tBbmdsZTogXCJBdHRhY2sgQW5nbGVcIixcclxuICBDbHViUGF0aDogXCJDbHViIFBhdGhcIixcclxuICBGYWNlQW5nbGU6IFwiRmFjZSBBbmdsZVwiLFxyXG4gIEZhY2VUb1BhdGg6IFwiRmFjZSBUbyBQYXRoXCIsXHJcbiAgU3dpbmdEaXJlY3Rpb246IFwiU3dpbmcgRGlyZWN0aW9uXCIsXHJcbiAgRHluYW1pY0xvZnQ6IFwiRHluYW1pYyBMb2Z0XCIsXHJcbiAgU3BpblJhdGU6IFwiU3BpbiBSYXRlXCIsXHJcbiAgU3BpbkF4aXM6IFwiU3BpbiBBeGlzXCIsXHJcbiAgU3BpbkxvZnQ6IFwiU3BpbiBMb2Z0XCIsXHJcbiAgTGF1bmNoQW5nbGU6IFwiTGF1bmNoIEFuZ2xlXCIsXHJcbiAgTGF1bmNoRGlyZWN0aW9uOiBcIkxhdW5jaCBEaXJlY3Rpb25cIixcclxuICBDYXJyeTogXCJDYXJyeVwiLFxyXG4gIFRvdGFsOiBcIlRvdGFsXCIsXHJcbiAgU2lkZTogXCJTaWRlXCIsXHJcbiAgU2lkZVRvdGFsOiBcIlNpZGUgVG90YWxcIixcclxuICBDYXJyeVNpZGU6IFwiQ2FycnkgU2lkZVwiLFxyXG4gIFRvdGFsU2lkZTogXCJUb3RhbCBTaWRlXCIsXHJcbiAgSGVpZ2h0OiBcIkhlaWdodFwiLFxyXG4gIE1heEhlaWdodDogXCJNYXggSGVpZ2h0XCIsXHJcbiAgQ3VydmU6IFwiQ3VydmVcIixcclxuICBMYW5kaW5nQW5nbGU6IFwiTGFuZGluZyBBbmdsZVwiLFxyXG4gIEhhbmdUaW1lOiBcIkhhbmcgVGltZVwiLFxyXG4gIExvd1BvaW50RGlzdGFuY2U6IFwiTG93IFBvaW50XCIsXHJcbiAgSW1wYWN0SGVpZ2h0OiBcIkltcGFjdCBIZWlnaHRcIixcclxuICBJbXBhY3RPZmZzZXQ6IFwiSW1wYWN0IE9mZnNldFwiLFxyXG4gIFRlbXBvOiBcIlRlbXBvXCIsXHJcbn07XHJcblxyXG4vLyBDU1MgY2xhc3Mgc2VsZWN0b3JzIChmcm9tIFRyYWNrbWFuJ3MgcmVuZGVyZWQgSFRNTClcclxuZXhwb3J0IGNvbnN0IENTU19EQVRFID0gXCJkYXRlXCI7XHJcbmV4cG9ydCBjb25zdCBDU1NfUkVTVUxUU19XUkFQUEVSID0gXCJwbGF5ZXItYW5kLXJlc3VsdHMtdGFibGUtd3JhcHBlclwiO1xyXG5leHBvcnQgY29uc3QgQ1NTX1JFU1VMVFNfVEFCTEUgPSBcIlJlc3VsdHNUYWJsZVwiO1xyXG5leHBvcnQgY29uc3QgQ1NTX0NMVUJfVEFHID0gXCJncm91cC10YWdcIjtcclxuZXhwb3J0IGNvbnN0IENTU19QQVJBTV9OQU1FU19ST1cgPSBcInBhcmFtZXRlci1uYW1lcy1yb3dcIjtcclxuZXhwb3J0IGNvbnN0IENTU19QQVJBTV9OQU1FID0gXCJwYXJhbWV0ZXItbmFtZVwiO1xyXG5leHBvcnQgY29uc3QgQ1NTX1NIT1RfREVUQUlMX1JPVyA9IFwicm93LXdpdGgtc2hvdC1kZXRhaWxzXCI7XHJcbmV4cG9ydCBjb25zdCBDU1NfQVZFUkFHRV9WQUxVRVMgPSBcImF2ZXJhZ2UtdmFsdWVzXCI7XHJcbmV4cG9ydCBjb25zdCBDU1NfQ09OU0lTVEVOQ1lfVkFMVUVTID0gXCJjb25zaXN0ZW5jeS12YWx1ZXNcIjtcclxuXHJcbi8vIEFQSSBVUkwgcGF0dGVybnMgdGhhdCBsaWtlbHkgaW5kaWNhdGUgYW4gQVBJIGRhdGEgcmVzcG9uc2VcclxuZXhwb3J0IGNvbnN0IEFQSV9VUkxfUEFUVEVSTlMgPSBbXHJcbiAgXCJhcGkudHJhY2ttYW5nb2xmLmNvbVwiLFxyXG4gIFwidHJhY2ttYW5nb2xmLmNvbS9hcGlcIixcclxuICBcIi9hcGkvXCIsXHJcbiAgXCIvcmVwb3J0cy9cIixcclxuICBcIi9hY3Rpdml0aWVzL1wiLFxyXG4gIFwiL3Nob3RzL1wiLFxyXG4gIFwiZ3JhcGhxbFwiLFxyXG5dO1xyXG5cclxuLy8gVGltZW91dHMgKG1pbGxpc2Vjb25kcylcclxuZXhwb3J0IGNvbnN0IFBBR0VfTE9BRF9USU1FT1VUID0gMzBfMDAwO1xyXG5leHBvcnQgY29uc3QgREFUQV9MT0FEX1RJTUVPVVQgPSAxNV8wMDA7XHJcblxyXG4vLyBUcmFja21hbiBiYXNlIFVSTFxyXG5leHBvcnQgY29uc3QgQkFTRV9VUkwgPSBcImh0dHBzOi8vd2ViLWR5bmFtaWMtcmVwb3J0cy50cmFja21hbmdvbGYuY29tL1wiO1xyXG5cclxuLy8gQ3VzdG9tIHByb21wdCBzdG9yYWdlIGtleXNcclxuZXhwb3J0IGNvbnN0IENVU1RPTV9QUk9NUFRfS0VZX1BSRUZJWCA9IFwiY3VzdG9tUHJvbXB0X1wiIGFzIGNvbnN0O1xyXG5leHBvcnQgY29uc3QgQ1VTVE9NX1BST01QVF9JRFNfS0VZID0gXCJjdXN0b21Qcm9tcHRJZHNcIiBhcyBjb25zdDtcclxuXHJcbi8vIFN0b3JhZ2Uga2V5cyBmb3IgQ2hyb21lIGV4dGVuc2lvbiAoYWxpZ25lZCBiZXR3ZWVuIGJhY2tncm91bmQgYW5kIHBvcHVwKVxyXG5leHBvcnQgY29uc3QgU1RPUkFHRV9LRVlTID0ge1xyXG4gIFRSQUNLTUFOX0RBVEE6IFwidHJhY2ttYW5EYXRhXCIsXHJcbiAgU1BFRURfVU5JVDogXCJzcGVlZFVuaXRcIixcclxuICBESVNUQU5DRV9VTklUOiBcImRpc3RhbmNlVW5pdFwiLFxyXG4gIFNFTEVDVEVEX1BST01QVF9JRDogXCJzZWxlY3RlZFByb21wdElkXCIsXHJcbiAgQUlfU0VSVklDRTogXCJhaVNlcnZpY2VcIixcclxuICBISVRUSU5HX1NVUkZBQ0U6IFwiaGl0dGluZ1N1cmZhY2VcIixcclxuICBJTkNMVURFX0FWRVJBR0VTOiBcImluY2x1ZGVBdmVyYWdlc1wiLFxyXG4gIFNFU1NJT05fSElTVE9SWTogXCJzZXNzaW9uSGlzdG9yeVwiLFxyXG4gIElNUE9SVF9TVEFUVVM6IFwiaW1wb3J0U3RhdHVzXCIsXHJcbn0gYXMgY29uc3Q7XHJcbiIsICIvKipcclxuICogVW5pdCBub3JtYWxpemF0aW9uIHV0aWxpdGllcyBmb3IgVHJhY2ttYW4gbWVhc3VyZW1lbnRzLlxyXG4gKiBcclxuICogVHJhY2ttYW4gdXNlcyBuZF8qIHBhcmFtZXRlcnMgdG8gc3BlY2lmeSB1bml0czpcclxuICogLSBuZF8wMDEsIG5kXzAwMiwgZXRjLiBkZWZpbmUgdW5pdCBzeXN0ZW1zIGZvciBkaWZmZXJlbnQgbWVhc3VyZW1lbnQgZ3JvdXBzXHJcbiAqIC0gQ29tbW9uIHZhbHVlczogNzg5MDEyID0geWFyZHMvZGVncmVlcywgNzg5MDEzID0gbWV0ZXJzL3JhZGlhbnNcclxuICovXHJcblxyXG5leHBvcnQgdHlwZSBVbml0U3lzdGVtSWQgPSBcIjc4OTAxMlwiIHwgXCI3ODkwMTNcIiB8IFwiNzg5MDE0XCIgfCBzdHJpbmc7XHJcblxyXG5leHBvcnQgdHlwZSBTcGVlZFVuaXQgPSBcIm1waFwiIHwgXCJtL3NcIjtcclxuZXhwb3J0IHR5cGUgRGlzdGFuY2VVbml0ID0gXCJ5YXJkc1wiIHwgXCJtZXRlcnNcIjtcclxuZXhwb3J0IHR5cGUgU21hbGxEaXN0YW5jZVVuaXQgPSBcImluY2hlc1wiIHwgXCJjbVwiO1xyXG5leHBvcnQgaW50ZXJmYWNlIFVuaXRDaG9pY2UgeyBzcGVlZDogU3BlZWRVbml0OyBkaXN0YW5jZTogRGlzdGFuY2VVbml0IH1cclxuZXhwb3J0IGNvbnN0IERFRkFVTFRfVU5JVF9DSE9JQ0U6IFVuaXRDaG9pY2UgPSB7IHNwZWVkOiBcIm1waFwiLCBkaXN0YW5jZTogXCJ5YXJkc1wiIH07XHJcblxyXG4vKipcclxuICogVHJhY2ttYW4gdW5pdCBzeXN0ZW0gZGVmaW5pdGlvbnMuXHJcbiAqIE1hcHMgbmRfKiBwYXJhbWV0ZXIgdmFsdWVzIHRvIGFjdHVhbCB1bml0cyBmb3IgZWFjaCBtZXRyaWMuXHJcbiAqL1xyXG5leHBvcnQgY29uc3QgVU5JVF9TWVNURU1TOiBSZWNvcmQ8VW5pdFN5c3RlbUlkLCBVbml0U3lzdGVtPiA9IHtcclxuICAvLyBJbXBlcmlhbCAoeWFyZHMsIGRlZ3JlZXMpIC0gbW9zdCBjb21tb25cclxuICBcIjc4OTAxMlwiOiB7XHJcbiAgICBpZDogXCI3ODkwMTJcIixcclxuICAgIG5hbWU6IFwiSW1wZXJpYWxcIixcclxuICAgIGRpc3RhbmNlVW5pdDogXCJ5YXJkc1wiLFxyXG4gICAgYW5nbGVVbml0OiBcImRlZ3JlZXNcIixcclxuICAgIHNwZWVkVW5pdDogXCJtcGhcIixcclxuICB9LFxyXG4gIC8vIE1ldHJpYyAobWV0ZXJzLCByYWRpYW5zKVxyXG4gIFwiNzg5MDEzXCI6IHtcclxuICAgIGlkOiBcIjc4OTAxM1wiLFxyXG4gICAgbmFtZTogXCJNZXRyaWMgKHJhZClcIixcclxuICAgIGRpc3RhbmNlVW5pdDogXCJtZXRlcnNcIixcclxuICAgIGFuZ2xlVW5pdDogXCJyYWRpYW5zXCIsXHJcbiAgICBzcGVlZFVuaXQ6IFwia20vaFwiLFxyXG4gIH0sXHJcbiAgLy8gTWV0cmljIChtZXRlcnMsIGRlZ3JlZXMpIC0gbGVzcyBjb21tb25cclxuICBcIjc4OTAxNFwiOiB7XHJcbiAgICBpZDogXCI3ODkwMTRcIixcclxuICAgIG5hbWU6IFwiTWV0cmljIChkZWcpXCIsXHJcbiAgICBkaXN0YW5jZVVuaXQ6IFwibWV0ZXJzXCIsXHJcbiAgICBhbmdsZVVuaXQ6IFwiZGVncmVlc1wiLFxyXG4gICAgc3BlZWRVbml0OiBcImttL2hcIixcclxuICB9LFxyXG59O1xyXG5cclxuLyoqXHJcbiAqIFVuaXQgc3lzdGVtIGNvbmZpZ3VyYXRpb24uXHJcbiAqL1xyXG5leHBvcnQgaW50ZXJmYWNlIFVuaXRTeXN0ZW0ge1xyXG4gIGlkOiBVbml0U3lzdGVtSWQ7XHJcbiAgbmFtZTogc3RyaW5nO1xyXG4gIGRpc3RhbmNlVW5pdDogXCJ5YXJkc1wiIHwgXCJtZXRlcnNcIjtcclxuICBhbmdsZVVuaXQ6IFwiZGVncmVlc1wiIHwgXCJyYWRpYW5zXCI7XHJcbiAgc3BlZWRVbml0OiBcIm1waFwiIHwgXCJrbS9oXCIgfCBcIm0vc1wiO1xyXG59XHJcblxyXG4vKipcclxuICogTWV0cmljcyB0aGF0IHVzZSBkaXN0YW5jZSB1bml0cy5cclxuICovXHJcbmV4cG9ydCBjb25zdCBESVNUQU5DRV9NRVRSSUNTID0gbmV3IFNldChbXHJcbiAgXCJDYXJyeVwiLFxyXG4gIFwiVG90YWxcIixcclxuICBcIlNpZGVcIixcclxuICBcIlNpZGVUb3RhbFwiLFxyXG4gIFwiQ2FycnlTaWRlXCIsXHJcbiAgXCJUb3RhbFNpZGVcIixcclxuICBcIkhlaWdodFwiLFxyXG4gIFwiTWF4SGVpZ2h0XCIsXHJcbiAgXCJDdXJ2ZVwiLFxyXG5dKTtcclxuXHJcbi8qKlxyXG4gKiBNZXRyaWNzIHRoYXQgdXNlIHNtYWxsIGRpc3RhbmNlIHVuaXRzIChpbmNoZXMvY20pLlxyXG4gKiBUaGVzZSB2YWx1ZXMgY29tZSBmcm9tIHRoZSBBUEkgaW4gbWV0ZXJzIGJ1dCBhcmUgdG9vIHNtYWxsIGZvciB5YXJkcy9tZXRlcnMuXHJcbiAqL1xyXG5leHBvcnQgY29uc3QgU01BTExfRElTVEFOQ0VfTUVUUklDUyA9IG5ldyBTZXQoW1xyXG4gIFwiTG93UG9pbnREaXN0YW5jZVwiLFxyXG5dKTtcclxuXHJcbi8qKlxyXG4gKiBUcmFja21hbiBpbXBhY3QgbG9jYXRpb24gbWV0cmljcyBhcmUgYWx3YXlzIGRpc3BsYXllZCBpbiBtaWxsaW1ldGVycy5cclxuICogVGhlIEFQSSByZXR1cm5zIHRoZXNlIHZhbHVlcyBpbiBtZXRlcnMuXHJcbiAqL1xyXG5leHBvcnQgY29uc3QgTUlMTElNRVRFUl9NRVRSSUNTID0gbmV3IFNldChbXHJcbiAgXCJJbXBhY3RIZWlnaHRcIixcclxuICBcIkltcGFjdE9mZnNldFwiLFxyXG5dKTtcclxuXHJcbi8qKlxyXG4gKiBNZXRyaWNzIHRoYXQgdXNlIGFuZ2xlIHVuaXRzLlxyXG4gKi9cclxuZXhwb3J0IGNvbnN0IEFOR0xFX01FVFJJQ1MgPSBuZXcgU2V0KFtcclxuICBcIkF0dGFja0FuZ2xlXCIsXHJcbiAgXCJDbHViUGF0aFwiLFxyXG4gIFwiRmFjZUFuZ2xlXCIsXHJcbiAgXCJGYWNlVG9QYXRoXCIsXHJcbiAgXCJEeW5hbWljTG9mdFwiLFxyXG4gIFwiTGF1bmNoQW5nbGVcIixcclxuICBcIkxhdW5jaERpcmVjdGlvblwiLFxyXG4gIFwiTGFuZGluZ0FuZ2xlXCIsXHJcbl0pO1xyXG5cclxuLyoqXHJcbiAqIE1ldHJpY3MgdGhhdCB1c2Ugc3BlZWQgdW5pdHMuXHJcbiAqL1xyXG5leHBvcnQgY29uc3QgU1BFRURfTUVUUklDUyA9IG5ldyBTZXQoW1xyXG4gIFwiQ2x1YlNwZWVkXCIsXHJcbiAgXCJCYWxsU3BlZWRcIixcclxuXSk7XHJcblxyXG4vKipcclxuICogRGVmYXVsdCB1bml0IHN5c3RlbSAoSW1wZXJpYWwgLSB5YXJkcy9kZWdyZWVzKS5cclxuICovXHJcbmV4cG9ydCBjb25zdCBERUZBVUxUX1VOSVRfU1lTVEVNOiBVbml0U3lzdGVtID0gVU5JVF9TWVNURU1TW1wiNzg5MDEyXCJdO1xyXG5cclxuLyoqXHJcbiAqIFNwZWVkIHVuaXQgZGlzcGxheSBsYWJlbHMgZm9yIENTViBoZWFkZXJzLlxyXG4gKi9cclxuZXhwb3J0IGNvbnN0IFNQRUVEX0xBQkVMUzogUmVjb3JkPFNwZWVkVW5pdCwgc3RyaW5nPiA9IHtcclxuICBcIm1waFwiOiBcIm1waFwiLFxyXG4gIFwibS9zXCI6IFwibS9zXCIsXHJcbn07XHJcblxyXG4vKipcclxuICogRGlzdGFuY2UgdW5pdCBkaXNwbGF5IGxhYmVscyBmb3IgQ1NWIGhlYWRlcnMuXHJcbiAqL1xyXG5leHBvcnQgY29uc3QgRElTVEFOQ0VfTEFCRUxTOiBSZWNvcmQ8RGlzdGFuY2VVbml0LCBzdHJpbmc+ID0ge1xyXG4gIFwieWFyZHNcIjogXCJ5ZHNcIixcclxuICBcIm1ldGVyc1wiOiBcIm1cIixcclxufTtcclxuXHJcbi8qKlxyXG4gKiBTbWFsbCBkaXN0YW5jZSB1bml0IGRpc3BsYXkgbGFiZWxzIGZvciBDU1YgaGVhZGVycy5cclxuICovXHJcbmV4cG9ydCBjb25zdCBTTUFMTF9ESVNUQU5DRV9MQUJFTFM6IFJlY29yZDxTbWFsbERpc3RhbmNlVW5pdCwgc3RyaW5nPiA9IHtcclxuICBcImluY2hlc1wiOiBcImluXCIsXHJcbiAgXCJjbVwiOiBcImNtXCIsXHJcbn07XHJcblxyXG4vKipcclxuICogTWlncmF0ZSBhIGxlZ2FjeSB1bml0UHJlZmVyZW5jZSBzdHJpbmcgdG8gYSBVbml0Q2hvaWNlIG9iamVjdC5cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBtaWdyYXRlTGVnYWN5UHJlZihzdG9yZWQ6IHN0cmluZyB8IHVuZGVmaW5lZCk6IFVuaXRDaG9pY2Uge1xyXG4gIHN3aXRjaCAoc3RvcmVkKSB7XHJcbiAgICBjYXNlIFwibWV0cmljXCI6XHJcbiAgICAgIHJldHVybiB7IHNwZWVkOiBcIm0vc1wiLCBkaXN0YW5jZTogXCJtZXRlcnNcIiB9O1xyXG4gICAgY2FzZSBcImh5YnJpZFwiOlxyXG4gICAgICByZXR1cm4geyBzcGVlZDogXCJtcGhcIiwgZGlzdGFuY2U6IFwibWV0ZXJzXCIgfTtcclxuICAgIGNhc2UgXCJpbXBlcmlhbFwiOlxyXG4gICAgZGVmYXVsdDpcclxuICAgICAgcmV0dXJuIHsgc3BlZWQ6IFwibXBoXCIsIGRpc3RhbmNlOiBcInlhcmRzXCIgfTtcclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBGaXhlZCB1bml0IGxhYmVscyBmb3IgbWV0cmljcyB3aG9zZSB1bml0cyBkb24ndCB2YXJ5IGJ5IHByZWZlcmVuY2UuXHJcbiAqL1xyXG5leHBvcnQgY29uc3QgRklYRURfVU5JVF9MQUJFTFM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XHJcbiAgU3BpblJhdGU6IFwicnBtXCIsXHJcbiAgSGFuZ1RpbWU6IFwic1wiLFxyXG4gIFRlbXBvOiBcInNcIixcclxuICBJbXBhY3RIZWlnaHQ6IFwibW1cIixcclxuICBJbXBhY3RPZmZzZXQ6IFwibW1cIixcclxufTtcclxuXHJcbi8qKlxyXG4gKiBFeHRyYWN0IG5kXyogcGFyYW1ldGVycyBmcm9tIG1ldGFkYXRhX3BhcmFtcy5cclxuICogXHJcbiAqIEBwYXJhbSBtZXRhZGF0YVBhcmFtcyAtIFRoZSBtZXRhZGF0YV9wYXJhbXMgb2JqZWN0IGZyb20gU2Vzc2lvbkRhdGFcclxuICogQHJldHVybnMgT2JqZWN0IG1hcHBpbmcgbWV0cmljIGdyb3VwIElEcyB0byB1bml0IHN5c3RlbSBJRHNcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBleHRyYWN0VW5pdFBhcmFtcyhcclxuICBtZXRhZGF0YVBhcmFtczogUmVjb3JkPHN0cmluZywgc3RyaW5nPlxyXG4pOiBSZWNvcmQ8c3RyaW5nLCBVbml0U3lzdGVtSWQ+IHtcclxuICBjb25zdCByZXN1bHQ6IFJlY29yZDxzdHJpbmcsIFVuaXRTeXN0ZW1JZD4gPSB7fTtcclxuXHJcbiAgZm9yIChjb25zdCBba2V5LCB2YWx1ZV0gb2YgT2JqZWN0LmVudHJpZXMobWV0YWRhdGFQYXJhbXMpKSB7XHJcbiAgICBjb25zdCBtYXRjaCA9IGtleS5tYXRjaCgvXm5kXyhbYS16MC05XSspJC9pKTtcclxuICAgIGlmIChtYXRjaCkge1xyXG4gICAgICBjb25zdCBncm91cEtleSA9IG1hdGNoWzFdLnRvTG93ZXJDYXNlKCk7XHJcbiAgICAgIHJlc3VsdFtncm91cEtleV0gPSB2YWx1ZSBhcyBVbml0U3lzdGVtSWQ7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICByZXR1cm4gcmVzdWx0O1xyXG59XHJcblxyXG4vKipcclxuICogRGV0ZXJtaW5lIHRoZSB1bml0IHN5c3RlbSBJRCBmcm9tIG1ldGFkYXRhIHBhcmFtcy5cclxuICogVXNlcyBuZF8wMDEgYXMgcHJpbWFyeSwgZmFsbHMgYmFjayB0byBkZWZhdWx0LlxyXG4gKiBcclxuICogQHBhcmFtIG1ldGFkYXRhUGFyYW1zIC0gVGhlIG1ldGFkYXRhX3BhcmFtcyBvYmplY3RcclxuICogQHJldHVybnMgVGhlIHVuaXQgc3lzdGVtIElEIHN0cmluZ1xyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGdldFVuaXRTeXN0ZW1JZChcclxuICBtZXRhZGF0YVBhcmFtczogUmVjb3JkPHN0cmluZywgc3RyaW5nPlxyXG4pOiBVbml0U3lzdGVtSWQge1xyXG4gIGNvbnN0IHVuaXRQYXJhbXMgPSBleHRyYWN0VW5pdFBhcmFtcyhtZXRhZGF0YVBhcmFtcyk7XHJcbiAgcmV0dXJuIHVuaXRQYXJhbXNbXCIwMDFcIl0gfHwgXCI3ODkwMTJcIjsgLy8gRGVmYXVsdCB0byBJbXBlcmlhbFxyXG59XHJcblxyXG4vKipcclxuICogR2V0IHRoZSBmdWxsIHVuaXQgc3lzdGVtIGNvbmZpZ3VyYXRpb24uXHJcbiAqIFxyXG4gKiBAcGFyYW0gbWV0YWRhdGFQYXJhbXMgLSBUaGUgbWV0YWRhdGFfcGFyYW1zIG9iamVjdFxyXG4gKiBAcmV0dXJucyBUaGUgVW5pdFN5c3RlbSBjb25maWd1cmF0aW9uXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZ2V0VW5pdFN5c3RlbShcclxuICBtZXRhZGF0YVBhcmFtczogUmVjb3JkPHN0cmluZywgc3RyaW5nPlxyXG4pOiBVbml0U3lzdGVtIHtcclxuICBjb25zdCBpZCA9IGdldFVuaXRTeXN0ZW1JZChtZXRhZGF0YVBhcmFtcyk7XHJcbiAgcmV0dXJuIFVOSVRfU1lTVEVNU1tpZF0gfHwgREVGQVVMVF9VTklUX1NZU1RFTTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEdldCB0aGUgdW5pdCBzeXN0ZW0gcmVwcmVzZW50aW5nIHdoYXQgdGhlIEFQSSBhY3R1YWxseSByZXR1cm5zLlxyXG4gKiBUaGUgQVBJIGFsd2F5cyByZXR1cm5zIHNwZWVkIGluIG0vcyBhbmQgZGlzdGFuY2UgaW4gbWV0ZXJzLFxyXG4gKiBidXQgdGhlIGFuZ2xlIHVuaXQgZGVwZW5kcyBvbiB0aGUgcmVwb3J0J3MgbmRfMDAxIHBhcmFtZXRlci5cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRBcGlTb3VyY2VVbml0U3lzdGVtKFxyXG4gIG1ldGFkYXRhUGFyYW1zOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+XHJcbik6IFVuaXRTeXN0ZW0ge1xyXG4gIGNvbnN0IHJlcG9ydFN5c3RlbSA9IGdldFVuaXRTeXN0ZW0obWV0YWRhdGFQYXJhbXMpO1xyXG4gIHJldHVybiB7XHJcbiAgICBpZDogXCJhcGlcIiBhcyBVbml0U3lzdGVtSWQsXHJcbiAgICBuYW1lOiBcIkFQSSBTb3VyY2VcIixcclxuICAgIGRpc3RhbmNlVW5pdDogXCJtZXRlcnNcIixcclxuICAgIGFuZ2xlVW5pdDogcmVwb3J0U3lzdGVtLmFuZ2xlVW5pdCxcclxuICAgIHNwZWVkVW5pdDogXCJtL3NcIixcclxuICB9O1xyXG59XHJcblxyXG4vKipcclxuICogR2V0IHRoZSB1bml0IGxhYmVsIGZvciBhIG1ldHJpYyBiYXNlZCBvbiB1c2VyJ3MgdW5pdCBjaG9pY2UuXHJcbiAqIFJldHVybnMgZW1wdHkgc3RyaW5nIGZvciBkaW1lbnNpb25sZXNzIG1ldHJpY3MgKGUuZy4gU21hc2hGYWN0b3IsIFNwaW5SYXRlKS5cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRNZXRyaWNVbml0TGFiZWwoXHJcbiAgbWV0cmljTmFtZTogc3RyaW5nLFxyXG4gIHVuaXRDaG9pY2U6IFVuaXRDaG9pY2UgPSBERUZBVUxUX1VOSVRfQ0hPSUNFXHJcbik6IHN0cmluZyB7XHJcbiAgaWYgKG1ldHJpY05hbWUgaW4gRklYRURfVU5JVF9MQUJFTFMpIHJldHVybiBGSVhFRF9VTklUX0xBQkVMU1ttZXRyaWNOYW1lXTtcclxuICBpZiAoU1BFRURfTUVUUklDUy5oYXMobWV0cmljTmFtZSkpIHJldHVybiBTUEVFRF9MQUJFTFNbdW5pdENob2ljZS5zcGVlZF07XHJcbiAgaWYgKFNNQUxMX0RJU1RBTkNFX01FVFJJQ1MuaGFzKG1ldHJpY05hbWUpKSByZXR1cm4gU01BTExfRElTVEFOQ0VfTEFCRUxTW2dldFNtYWxsRGlzdGFuY2VVbml0KHVuaXRDaG9pY2UpXTtcclxuICBpZiAoRElTVEFOQ0VfTUVUUklDUy5oYXMobWV0cmljTmFtZSkpIHJldHVybiBESVNUQU5DRV9MQUJFTFNbdW5pdENob2ljZS5kaXN0YW5jZV07XHJcbiAgaWYgKEFOR0xFX01FVFJJQ1MuaGFzKG1ldHJpY05hbWUpKSByZXR1cm4gXCJcdTAwQjBcIjtcclxuICByZXR1cm4gXCJcIjtcclxufVxyXG5cclxuLyoqXHJcbiAqIENvbnZlcnQgYSBkaXN0YW5jZSB2YWx1ZSBiZXR3ZWVuIHVuaXRzLlxyXG4gKiBcclxuICogQHBhcmFtIHZhbHVlIC0gVGhlIHZhbHVlIHRvIGNvbnZlcnRcclxuICogQHBhcmFtIGZyb21Vbml0IC0gU291cmNlIHVuaXQgKFwieWFyZHNcIiBvciBcIm1ldGVyc1wiKVxyXG4gKiBAcGFyYW0gdG9Vbml0IC0gVGFyZ2V0IHVuaXQgKFwieWFyZHNcIiBvciBcIm1ldGVyc1wiKVxyXG4gKiBAcmV0dXJucyBDb252ZXJ0ZWQgdmFsdWUsIG9yIG9yaWdpbmFsIGlmIHVuaXRzIG1hdGNoXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gY29udmVydERpc3RhbmNlKFxyXG4gIHZhbHVlOiBudW1iZXIgfCBzdHJpbmcgfCBudWxsLFxyXG4gIGZyb21Vbml0OiBcInlhcmRzXCIgfCBcIm1ldGVyc1wiLFxyXG4gIHRvVW5pdDogXCJ5YXJkc1wiIHwgXCJtZXRlcnNcIlxyXG4pOiBudW1iZXIgfCBzdHJpbmcgfCBudWxsIHtcclxuICBpZiAodmFsdWUgPT09IG51bGwgfHwgdmFsdWUgPT09IFwiXCIpIHJldHVybiB2YWx1ZTtcclxuXHJcbiAgY29uc3QgbnVtVmFsdWUgPSB0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCIgPyBwYXJzZUZsb2F0KHZhbHVlKSA6IHZhbHVlO1xyXG4gIGlmIChpc05hTihudW1WYWx1ZSkpIHJldHVybiB2YWx1ZTtcclxuXHJcbiAgaWYgKGZyb21Vbml0ID09PSB0b1VuaXQpIHJldHVybiBudW1WYWx1ZTtcclxuXHJcbiAgLy8gQ29udmVydCB0byBtZXRlcnMgZmlyc3QsIHRoZW4gdG8gdGFyZ2V0IHVuaXRcclxuICBjb25zdCBpbk1ldGVycyA9IGZyb21Vbml0ID09PSBcInlhcmRzXCIgPyBudW1WYWx1ZSAqIDAuOTE0NCA6IG51bVZhbHVlO1xyXG4gIHJldHVybiB0b1VuaXQgPT09IFwieWFyZHNcIiA/IGluTWV0ZXJzIC8gMC45MTQ0IDogaW5NZXRlcnM7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDb252ZXJ0IGFuIGFuZ2xlIHZhbHVlIGJldHdlZW4gdW5pdHMuXHJcbiAqIFxyXG4gKiBAcGFyYW0gdmFsdWUgLSBUaGUgdmFsdWUgdG8gY29udmVydFxyXG4gKiBAcGFyYW0gZnJvbVVuaXQgLSBTb3VyY2UgdW5pdCAoXCJkZWdyZWVzXCIgb3IgXCJyYWRpYW5zXCIpXHJcbiAqIEBwYXJhbSB0b1VuaXQgLSBUYXJnZXQgdW5pdCAoXCJkZWdyZWVzXCIgb3IgXCJyYWRpYW5zXCIpXHJcbiAqIEByZXR1cm5zIENvbnZlcnRlZCB2YWx1ZSwgb3Igb3JpZ2luYWwgaWYgdW5pdHMgbWF0Y2hcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBjb252ZXJ0QW5nbGUoXHJcbiAgdmFsdWU6IG51bWJlciB8IHN0cmluZyB8IG51bGwsXHJcbiAgZnJvbVVuaXQ6IFwiZGVncmVlc1wiIHwgXCJyYWRpYW5zXCIsXHJcbiAgdG9Vbml0OiBcImRlZ3JlZXNcIiB8IFwicmFkaWFuc1wiXHJcbik6IG51bWJlciB8IHN0cmluZyB8IG51bGwge1xyXG4gIGlmICh2YWx1ZSA9PT0gbnVsbCB8fCB2YWx1ZSA9PT0gXCJcIikgcmV0dXJuIHZhbHVlO1xyXG5cclxuICBjb25zdCBudW1WYWx1ZSA9IHR5cGVvZiB2YWx1ZSA9PT0gXCJzdHJpbmdcIiA/IHBhcnNlRmxvYXQodmFsdWUpIDogdmFsdWU7XHJcbiAgaWYgKGlzTmFOKG51bVZhbHVlKSkgcmV0dXJuIHZhbHVlO1xyXG5cclxuICBpZiAoZnJvbVVuaXQgPT09IHRvVW5pdCkgcmV0dXJuIG51bVZhbHVlO1xyXG5cclxuICAvLyBDb252ZXJ0IHRvIGRlZ3JlZXMgZmlyc3QsIHRoZW4gdG8gdGFyZ2V0IHVuaXRcclxuICBjb25zdCBpbkRlZ3JlZXMgPSBmcm9tVW5pdCA9PT0gXCJkZWdyZWVzXCIgPyBudW1WYWx1ZSA6IChudW1WYWx1ZSAqIDE4MCAvIE1hdGguUEkpO1xyXG4gIHJldHVybiB0b1VuaXQgPT09IFwiZGVncmVlc1wiID8gaW5EZWdyZWVzIDogKGluRGVncmVlcyAqIE1hdGguUEkgLyAxODApO1xyXG59XHJcblxyXG4vKipcclxuICogQ29udmVydCBhIHNwZWVkIHZhbHVlIGJldHdlZW4gdW5pdHMuXHJcbiAqXHJcbiAqIEBwYXJhbSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byBjb252ZXJ0XHJcbiAqIEBwYXJhbSBmcm9tVW5pdCAtIFNvdXJjZSB1bml0IChcIm1waFwiLCBcImttL2hcIiwgb3IgXCJtL3NcIilcclxuICogQHBhcmFtIHRvVW5pdCAtIFRhcmdldCB1bml0IChcIm1waFwiLCBcImttL2hcIiwgb3IgXCJtL3NcIilcclxuICogQHJldHVybnMgQ29udmVydGVkIHZhbHVlLCBvciBvcmlnaW5hbCBpZiB1bml0cyBtYXRjaFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGNvbnZlcnRTcGVlZChcclxuICB2YWx1ZTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbCxcclxuICBmcm9tVW5pdDogXCJtcGhcIiB8IFwia20vaFwiIHwgXCJtL3NcIixcclxuICB0b1VuaXQ6IFwibXBoXCIgfCBcImttL2hcIiB8IFwibS9zXCJcclxuKTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbCB7XHJcbiAgaWYgKHZhbHVlID09PSBudWxsIHx8IHZhbHVlID09PSBcIlwiKSByZXR1cm4gdmFsdWU7XHJcblxyXG4gIGNvbnN0IG51bVZhbHVlID0gdHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiID8gcGFyc2VGbG9hdCh2YWx1ZSkgOiB2YWx1ZTtcclxuICBpZiAoaXNOYU4obnVtVmFsdWUpKSByZXR1cm4gdmFsdWU7XHJcblxyXG4gIGlmIChmcm9tVW5pdCA9PT0gdG9Vbml0KSByZXR1cm4gbnVtVmFsdWU7XHJcblxyXG4gIC8vIENvbnZlcnQgdG8gbXBoIGZpcnN0LCB0aGVuIHRvIHRhcmdldCB1bml0XHJcbiAgbGV0IGluTXBoOiBudW1iZXI7XHJcbiAgaWYgKGZyb21Vbml0ID09PSBcIm1waFwiKSBpbk1waCA9IG51bVZhbHVlO1xyXG4gIGVsc2UgaWYgKGZyb21Vbml0ID09PSBcImttL2hcIikgaW5NcGggPSBudW1WYWx1ZSAvIDEuNjA5MzQ0O1xyXG4gIGVsc2UgaW5NcGggPSBudW1WYWx1ZSAqIDIuMjM2OTQ7IC8vIG0vcyB0byBtcGhcclxuXHJcbiAgaWYgKHRvVW5pdCA9PT0gXCJtcGhcIikgcmV0dXJuIGluTXBoO1xyXG4gIGlmICh0b1VuaXQgPT09IFwia20vaFwiKSByZXR1cm4gaW5NcGggKiAxLjYwOTM0NDtcclxuICByZXR1cm4gaW5NcGggLyAyLjIzNjk0OyAvLyBtcGggdG8gbS9zXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBHZXQgdGhlIHNtYWxsIGRpc3RhbmNlIHVuaXQgYmFzZWQgb24gdGhlIHVzZXIncyBkaXN0YW5jZSBjaG9pY2UuXHJcbiAqIFlhcmRzIHVzZXJzIHNlZSBpbmNoZXM7IG1ldGVycyB1c2VycyBzZWUgY20uXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZ2V0U21hbGxEaXN0YW5jZVVuaXQodW5pdENob2ljZTogVW5pdENob2ljZSA9IERFRkFVTFRfVU5JVF9DSE9JQ0UpOiBTbWFsbERpc3RhbmNlVW5pdCB7XHJcbiAgcmV0dXJuIHVuaXRDaG9pY2UuZGlzdGFuY2UgPT09IFwieWFyZHNcIiA/IFwiaW5jaGVzXCIgOiBcImNtXCI7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDb252ZXJ0IGEgZGlzdGFuY2UgdmFsdWUgZnJvbSBtZXRlcnMgdG8gYSBzbWFsbCBkaXN0YW5jZSB1bml0IChpbmNoZXMgb3IgY20pLlxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGNvbnZlcnRTbWFsbERpc3RhbmNlKFxyXG4gIHZhbHVlOiBudW1iZXIgfCBzdHJpbmcgfCBudWxsLFxyXG4gIHRvU21hbGxVbml0OiBTbWFsbERpc3RhbmNlVW5pdFxyXG4pOiBudW1iZXIgfCBzdHJpbmcgfCBudWxsIHtcclxuICBpZiAodmFsdWUgPT09IG51bGwgfHwgdmFsdWUgPT09IFwiXCIpIHJldHVybiB2YWx1ZTtcclxuXHJcbiAgY29uc3QgbnVtVmFsdWUgPSB0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCIgPyBwYXJzZUZsb2F0KHZhbHVlKSA6IHZhbHVlO1xyXG4gIGlmIChpc05hTihudW1WYWx1ZSkpIHJldHVybiB2YWx1ZTtcclxuXHJcbiAgcmV0dXJuIHRvU21hbGxVbml0ID09PSBcImluY2hlc1wiID8gbnVtVmFsdWUgKiAzOS4zNzAxIDogbnVtVmFsdWUgKiAxMDA7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDb252ZXJ0IGEgZGlzdGFuY2UgdmFsdWUgZnJvbSBtZXRlcnMgdG8gbWlsbGltZXRlcnMuXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gY29udmVydE1pbGxpbWV0ZXJzKFxyXG4gIHZhbHVlOiBudW1iZXIgfCBzdHJpbmcgfCBudWxsXHJcbik6IG51bWJlciB8IHN0cmluZyB8IG51bGwge1xyXG4gIGlmICh2YWx1ZSA9PT0gbnVsbCB8fCB2YWx1ZSA9PT0gXCJcIikgcmV0dXJuIHZhbHVlO1xyXG5cclxuICBjb25zdCBudW1WYWx1ZSA9IHR5cGVvZiB2YWx1ZSA9PT0gXCJzdHJpbmdcIiA/IHBhcnNlRmxvYXQodmFsdWUpIDogdmFsdWU7XHJcbiAgaWYgKGlzTmFOKG51bVZhbHVlKSkgcmV0dXJuIHZhbHVlO1xyXG5cclxuICByZXR1cm4gbnVtVmFsdWUgKiAxMDAwO1xyXG59XHJcblxyXG4vKipcclxuICogTm9ybWFsaXplIGEgbWV0cmljIHZhbHVlIGJhc2VkIG9uIHVuaXQgc3lzdGVtIGFsaWdubWVudCBhbmQgdXNlcidzIHVuaXQgY2hvaWNlLlxyXG4gKlxyXG4gKiBDb252ZXJ0cyB2YWx1ZXMgZnJvbSB0aGUgc291cmNlIHVuaXRzIHRvIHRhcmdldCBvdXRwdXQgdW5pdHM6XHJcbiAqIC0gRGlzdGFuY2U6IHlhcmRzIG9yIG1ldGVycyAocGVyIHVuaXRDaG9pY2UuZGlzdGFuY2UpXHJcbiAqIC0gQW5nbGVzOiBhbHdheXMgZGVncmVlc1xyXG4gKiAtIFNwZWVkOiBtcGggb3IgbS9zIChwZXIgdW5pdENob2ljZS5zcGVlZClcclxuICpcclxuICogQHBhcmFtIHZhbHVlIC0gVGhlIHJhdyBtZXRyaWMgdmFsdWVcclxuICogQHBhcmFtIG1ldHJpY05hbWUgLSBUaGUgbmFtZSBvZiB0aGUgbWV0cmljIGJlaW5nIG5vcm1hbGl6ZWRcclxuICogQHBhcmFtIHJlcG9ydFVuaXRTeXN0ZW0gLSBUaGUgdW5pdCBzeXN0ZW0gdXNlZCBpbiB0aGUgc291cmNlIGRhdGFcclxuICogQHBhcmFtIHVuaXRDaG9pY2UgLSBVc2VyJ3MgdW5pdCBjaG9pY2UgKGRlZmF1bHRzIHRvIG1waCArIHlhcmRzKVxyXG4gKiBAcmV0dXJucyBOb3JtYWxpemVkIHZhbHVlIGFzIG51bWJlciBvciBzdHJpbmcgKG51bGwgaWYgaW52YWxpZClcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBub3JtYWxpemVNZXRyaWNWYWx1ZShcclxuICB2YWx1ZTogTWV0cmljVmFsdWUsXHJcbiAgbWV0cmljTmFtZTogc3RyaW5nLFxyXG4gIHJlcG9ydFVuaXRTeXN0ZW06IFVuaXRTeXN0ZW0sXHJcbiAgdW5pdENob2ljZTogVW5pdENob2ljZSA9IERFRkFVTFRfVU5JVF9DSE9JQ0VcclxuKTogTWV0cmljVmFsdWUge1xyXG4gIGNvbnN0IG51bVZhbHVlID0gcGFyc2VOdW1lcmljVmFsdWUodmFsdWUpO1xyXG4gIGlmIChudW1WYWx1ZSA9PT0gbnVsbCkgcmV0dXJuIHZhbHVlO1xyXG5cclxuICBsZXQgY29udmVydGVkOiBudW1iZXI7XHJcblxyXG4gIGlmIChNSUxMSU1FVEVSX01FVFJJQ1MuaGFzKG1ldHJpY05hbWUpKSB7XHJcbiAgICBjb252ZXJ0ZWQgPSBjb252ZXJ0TWlsbGltZXRlcnMobnVtVmFsdWUpIGFzIG51bWJlcjtcclxuICB9IGVsc2UgaWYgKFNNQUxMX0RJU1RBTkNFX01FVFJJQ1MuaGFzKG1ldHJpY05hbWUpKSB7XHJcbiAgICBjb252ZXJ0ZWQgPSBjb252ZXJ0U21hbGxEaXN0YW5jZShcclxuICAgICAgbnVtVmFsdWUsXHJcbiAgICAgIGdldFNtYWxsRGlzdGFuY2VVbml0KHVuaXRDaG9pY2UpXHJcbiAgICApIGFzIG51bWJlcjtcclxuICB9IGVsc2UgaWYgKERJU1RBTkNFX01FVFJJQ1MuaGFzKG1ldHJpY05hbWUpKSB7XHJcbiAgICBjb252ZXJ0ZWQgPSBjb252ZXJ0RGlzdGFuY2UoXHJcbiAgICAgIG51bVZhbHVlLFxyXG4gICAgICByZXBvcnRVbml0U3lzdGVtLmRpc3RhbmNlVW5pdCxcclxuICAgICAgdW5pdENob2ljZS5kaXN0YW5jZVxyXG4gICAgKSBhcyBudW1iZXI7XHJcbiAgfSBlbHNlIGlmIChBTkdMRV9NRVRSSUNTLmhhcyhtZXRyaWNOYW1lKSkge1xyXG4gICAgY29udmVydGVkID0gY29udmVydEFuZ2xlKFxyXG4gICAgICBudW1WYWx1ZSxcclxuICAgICAgcmVwb3J0VW5pdFN5c3RlbS5hbmdsZVVuaXQsXHJcbiAgICAgIFwiZGVncmVlc1wiXHJcbiAgICApIGFzIG51bWJlcjtcclxuICB9IGVsc2UgaWYgKFNQRUVEX01FVFJJQ1MuaGFzKG1ldHJpY05hbWUpKSB7XHJcbiAgICBjb252ZXJ0ZWQgPSBjb252ZXJ0U3BlZWQoXHJcbiAgICAgIG51bVZhbHVlLFxyXG4gICAgICByZXBvcnRVbml0U3lzdGVtLnNwZWVkVW5pdCxcclxuICAgICAgdW5pdENob2ljZS5zcGVlZFxyXG4gICAgKSBhcyBudW1iZXI7XHJcbiAgfSBlbHNlIHtcclxuICAgIGNvbnZlcnRlZCA9IG51bVZhbHVlO1xyXG4gIH1cclxuXHJcbiAgLy8gU3BpblJhdGU6IHJvdW5kIHRvIHdob2xlIG51bWJlcnNcclxuICBpZiAobWV0cmljTmFtZSA9PT0gXCJTcGluUmF0ZVwiKSByZXR1cm4gTWF0aC5yb3VuZChjb252ZXJ0ZWQpO1xyXG5cclxuICAvLyBJbXBhY3QgbG9jYXRpb24gbWV0cmljcyBhcmUgZGlzcGxheWVkIGFzIHdob2xlIG1pbGxpbWV0ZXJzLlxyXG4gIGlmIChNSUxMSU1FVEVSX01FVFJJQ1MuaGFzKG1ldHJpY05hbWUpKSByZXR1cm4gTWF0aC5yb3VuZChjb252ZXJ0ZWQpO1xyXG5cclxuICAvLyBTbWFzaEZhY3RvciAvIFRlbXBvOiByb3VuZCB0byAyIGRlY2ltYWwgcGxhY2VzXHJcbiAgaWYgKG1ldHJpY05hbWUgPT09IFwiU21hc2hGYWN0b3JcIiB8fCBtZXRyaWNOYW1lID09PSBcIlRlbXBvXCIpXHJcbiAgICByZXR1cm4gTWF0aC5yb3VuZChjb252ZXJ0ZWQgKiAxMDApIC8gMTAwO1xyXG5cclxuICAvLyBSb3VuZCB0byAxIGRlY2ltYWwgcGxhY2UgZm9yIGNvbnNpc3RlbmN5XHJcbiAgcmV0dXJuIE1hdGgucm91bmQoY29udmVydGVkICogMTApIC8gMTA7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBQYXJzZSBhIG51bWVyaWMgdmFsdWUgZnJvbSBNZXRyaWNWYWx1ZSB0eXBlLlxyXG4gKi9cclxuZnVuY3Rpb24gcGFyc2VOdW1lcmljVmFsdWUodmFsdWU6IE1ldHJpY1ZhbHVlKTogbnVtYmVyIHwgbnVsbCB7XHJcbiAgaWYgKHZhbHVlID09PSBudWxsIHx8IHZhbHVlID09PSBcIlwiKSByZXR1cm4gbnVsbDtcclxuICBpZiAodHlwZW9mIHZhbHVlID09PSBcIm51bWJlclwiKSByZXR1cm4gaXNOYU4odmFsdWUpID8gbnVsbCA6IHZhbHVlO1xyXG4gIFxyXG4gIGNvbnN0IHBhcnNlZCA9IHBhcnNlRmxvYXQodmFsdWUpO1xyXG4gIHJldHVybiBpc05hTihwYXJzZWQpID8gbnVsbCA6IHBhcnNlZDtcclxufVxyXG5cclxuZXhwb3J0IHR5cGUgTWV0cmljVmFsdWUgPSBzdHJpbmcgfCBudW1iZXIgfCBudWxsO1xyXG4iLCAiLyoqXHJcbiAqIENTViB3cml0ZXIgZm9yIFRyYWNrUHVsbCBzZXNzaW9uIGRhdGEuXHJcbiAqIEltcGxlbWVudHMgY29yZSBjb2x1bW5zOiBEYXRlLCBDbHViLCBTaG90ICMsIFR5cGVcclxuICovXHJcblxyXG5pbXBvcnQgdHlwZSB7IFNlc3Npb25EYXRhLCBDbHViR3JvdXAsIFNob3QgfSBmcm9tIFwiLi4vbW9kZWxzL3R5cGVzXCI7XHJcbmltcG9ydCB7XHJcbiAgZ2V0QXBpU291cmNlVW5pdFN5c3RlbSxcclxuICBnZXRNZXRyaWNVbml0TGFiZWwsXHJcbiAgbm9ybWFsaXplTWV0cmljVmFsdWUsXHJcbiAgREVGQVVMVF9VTklUX0NIT0lDRSxcclxuICB0eXBlIFVuaXRDaG9pY2UsXHJcbn0gZnJvbSBcIi4vdW5pdF9ub3JtYWxpemF0aW9uXCI7XHJcbmltcG9ydCB7IE1FVFJJQ19ESVNQTEFZX05BTUVTIH0gZnJvbSBcIi4vY29uc3RhbnRzXCI7XHJcblxyXG5jb25zdCBNRVRSSUNfQ09MVU1OX09SREVSOiBzdHJpbmdbXSA9IFtcclxuICAvLyBTcGVlZCAmIEVmZmljaWVuY3lcclxuICBcIkNsdWJTcGVlZFwiLCBcIkJhbGxTcGVlZFwiLCBcIlNtYXNoRmFjdG9yXCIsXHJcbiAgLy8gQ2x1YiBEZWxpdmVyeVxyXG4gIFwiQXR0YWNrQW5nbGVcIiwgXCJDbHViUGF0aFwiLCBcIkZhY2VBbmdsZVwiLCBcIkZhY2VUb1BhdGhcIiwgXCJTd2luZ0RpcmVjdGlvblwiLCBcIkR5bmFtaWNMb2Z0XCIsXHJcbiAgLy8gTGF1bmNoICYgU3BpblxyXG4gIFwiTGF1bmNoQW5nbGVcIiwgXCJMYXVuY2hEaXJlY3Rpb25cIiwgXCJTcGluUmF0ZVwiLCBcIlNwaW5BeGlzXCIsIFwiU3BpbkxvZnRcIixcclxuICAvLyBEaXN0YW5jZVxyXG4gIFwiQ2FycnlcIiwgXCJUb3RhbFwiLFxyXG4gIC8vIERpc3BlcnNpb25cclxuICBcIlNpZGVcIiwgXCJTaWRlVG90YWxcIiwgXCJDYXJyeVNpZGVcIiwgXCJUb3RhbFNpZGVcIiwgXCJDdXJ2ZVwiLFxyXG4gIC8vIEJhbGwgRmxpZ2h0XHJcbiAgXCJIZWlnaHRcIiwgXCJNYXhIZWlnaHRcIiwgXCJMYW5kaW5nQW5nbGVcIiwgXCJIYW5nVGltZVwiLFxyXG4gIC8vIEltcGFjdFxyXG4gIFwiTG93UG9pbnREaXN0YW5jZVwiLCBcIkltcGFjdEhlaWdodFwiLCBcIkltcGFjdE9mZnNldFwiLFxyXG4gIC8vIE90aGVyXHJcbiAgXCJUZW1wb1wiLFxyXG5dO1xyXG5cclxuZnVuY3Rpb24gZ2V0RGlzcGxheU5hbWUobWV0cmljOiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gIHJldHVybiBNRVRSSUNfRElTUExBWV9OQU1FU1ttZXRyaWNdID8/IG1ldHJpYztcclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0Q29sdW1uTmFtZShtZXRyaWM6IHN0cmluZywgdW5pdENob2ljZTogVW5pdENob2ljZSk6IHN0cmluZyB7XHJcbiAgY29uc3QgZGlzcGxheU5hbWUgPSBnZXREaXNwbGF5TmFtZShtZXRyaWMpO1xyXG4gIGNvbnN0IHVuaXRMYWJlbCA9IGdldE1ldHJpY1VuaXRMYWJlbChtZXRyaWMsIHVuaXRDaG9pY2UpO1xyXG4gIHJldHVybiB1bml0TGFiZWwgPyBgJHtkaXNwbGF5TmFtZX0gKCR7dW5pdExhYmVsfSlgIDogZGlzcGxheU5hbWU7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdlbmVyYXRlRmlsZW5hbWUoc2Vzc2lvbjogU2Vzc2lvbkRhdGEpOiBzdHJpbmcge1xyXG4gIHJldHVybiBgU2hvdERhdGFfJHtzZXNzaW9uLmRhdGV9LmNzdmA7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG9yZGVyTWV0cmljc0J5UHJpb3JpdHkoXHJcbiAgYWxsTWV0cmljczogc3RyaW5nW10sXHJcbiAgcHJpb3JpdHlPcmRlcjogc3RyaW5nW11cclxuKTogc3RyaW5nW10ge1xyXG4gIGNvbnN0IHJlc3VsdDogc3RyaW5nW10gPSBbXTtcclxuICBjb25zdCBzZWVuID0gbmV3IFNldDxzdHJpbmc+KCk7XHJcblxyXG4gIGZvciAoY29uc3QgbWV0cmljIG9mIHByaW9yaXR5T3JkZXIpIHtcclxuICAgIGlmIChhbGxNZXRyaWNzLmluY2x1ZGVzKG1ldHJpYykgJiYgIXNlZW4uaGFzKG1ldHJpYykpIHtcclxuICAgICAgcmVzdWx0LnB1c2gobWV0cmljKTtcclxuICAgICAgc2Vlbi5hZGQobWV0cmljKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGZvciAoY29uc3QgbWV0cmljIG9mIGFsbE1ldHJpY3MpIHtcclxuICAgIGlmICghc2Vlbi5oYXMobWV0cmljKSkge1xyXG4gICAgICByZXN1bHQucHVzaChtZXRyaWMpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHJlc3VsdDtcclxufVxyXG5cclxuZnVuY3Rpb24gaGFzVGFncyhzZXNzaW9uOiBTZXNzaW9uRGF0YSk6IGJvb2xlYW4ge1xyXG4gIHJldHVybiBzZXNzaW9uLmNsdWJfZ3JvdXBzLnNvbWUoKGNsdWIpID0+XHJcbiAgICBjbHViLnNob3RzLnNvbWUoKHNob3QpID0+IHNob3QudGFnICE9PSB1bmRlZmluZWQgJiYgc2hvdC50YWcgIT09IFwiXCIpXHJcbiAgKTtcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHdyaXRlQ3N2KFxyXG4gIHNlc3Npb246IFNlc3Npb25EYXRhLFxyXG4gIGluY2x1ZGVBdmVyYWdlcyA9IHRydWUsXHJcbiAgbWV0cmljT3JkZXI/OiBzdHJpbmdbXSxcclxuICB1bml0Q2hvaWNlOiBVbml0Q2hvaWNlID0gREVGQVVMVF9VTklUX0NIT0lDRSxcclxuICBoaXR0aW5nU3VyZmFjZT86IFwiR3Jhc3NcIiB8IFwiTWF0XCJcclxuKTogc3RyaW5nIHtcclxuICBjb25zdCBvcmRlcmVkTWV0cmljcyA9IG9yZGVyTWV0cmljc0J5UHJpb3JpdHkoXHJcbiAgICBzZXNzaW9uLm1ldHJpY19uYW1lcyxcclxuICAgIG1ldHJpY09yZGVyID8/IE1FVFJJQ19DT0xVTU5fT1JERVJcclxuICApO1xyXG5cclxuICBjb25zdCBoZWFkZXJSb3c6IHN0cmluZ1tdID0gW1wiRGF0ZVwiLCBcIkNsdWJcIl07XHJcblxyXG4gIGlmIChoYXNUYWdzKHNlc3Npb24pKSB7XHJcbiAgICBoZWFkZXJSb3cucHVzaChcIlRhZ1wiKTtcclxuICB9XHJcblxyXG4gIGhlYWRlclJvdy5wdXNoKFwiU2hvdCAjXCIsIFwiVHlwZVwiKTtcclxuXHJcbiAgZm9yIChjb25zdCBtZXRyaWMgb2Ygb3JkZXJlZE1ldHJpY3MpIHtcclxuICAgIGhlYWRlclJvdy5wdXNoKGdldENvbHVtbk5hbWUobWV0cmljLCB1bml0Q2hvaWNlKSk7XHJcbiAgfVxyXG5cclxuICBjb25zdCByb3dzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+W10gPSBbXTtcclxuXHJcbiAgLy8gU291cmNlIHVuaXQgc3lzdGVtOiBBUEkgYWx3YXlzIHJldHVybnMgbS9zICsgbWV0ZXJzLCBhbmdsZSB1bml0IGZyb20gcmVwb3J0XHJcbiAgY29uc3QgdW5pdFN5c3RlbSA9IGdldEFwaVNvdXJjZVVuaXRTeXN0ZW0oc2Vzc2lvbi5tZXRhZGF0YV9wYXJhbXMpO1xyXG5cclxuICBmb3IgKGNvbnN0IGNsdWIgb2Ygc2Vzc2lvbi5jbHViX2dyb3Vwcykge1xyXG4gICAgZm9yIChjb25zdCBzaG90IG9mIGNsdWIuc2hvdHMpIHtcclxuICAgICAgY29uc3Qgcm93OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xyXG4gICAgICAgIERhdGU6IHNlc3Npb24uZGF0ZSxcclxuICAgICAgICBDbHViOiBjbHViLmNsdWJfbmFtZSxcclxuICAgICAgICBcIlNob3QgI1wiOiBTdHJpbmcoc2hvdC5zaG90X251bWJlciArIDEpLFxyXG4gICAgICAgIFR5cGU6IFwiU2hvdFwiLFxyXG4gICAgICB9O1xyXG5cclxuICAgICAgaWYgKGhhc1RhZ3Moc2Vzc2lvbikpIHtcclxuICAgICAgICByb3cuVGFnID0gc2hvdC50YWcgPz8gXCJcIjtcclxuICAgICAgfVxyXG5cclxuICAgICAgZm9yIChjb25zdCBtZXRyaWMgb2Ygb3JkZXJlZE1ldHJpY3MpIHtcclxuICAgICAgICBjb25zdCBjb2xOYW1lID0gZ2V0Q29sdW1uTmFtZShtZXRyaWMsIHVuaXRDaG9pY2UpO1xyXG4gICAgICAgIGNvbnN0IHJhd1ZhbHVlID0gc2hvdC5tZXRyaWNzW21ldHJpY10gPz8gXCJcIjtcclxuXHJcbiAgICAgICAgaWYgKHR5cGVvZiByYXdWYWx1ZSA9PT0gXCJzdHJpbmdcIiB8fCB0eXBlb2YgcmF3VmFsdWUgPT09IFwibnVtYmVyXCIpIHtcclxuICAgICAgICAgIHJvd1tjb2xOYW1lXSA9IFN0cmluZyhub3JtYWxpemVNZXRyaWNWYWx1ZShyYXdWYWx1ZSwgbWV0cmljLCB1bml0U3lzdGVtLCB1bml0Q2hvaWNlKSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIHJvd1tjb2xOYW1lXSA9IFwiXCI7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcblxyXG4gICAgICByb3dzLnB1c2gocm93KTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoaW5jbHVkZUF2ZXJhZ2VzKSB7XHJcbiAgICAgIC8vIEdyb3VwIHNob3RzIGJ5IHRhZ1xyXG4gICAgICBjb25zdCB0YWdHcm91cHMgPSBuZXcgTWFwPHN0cmluZywgU2hvdFtdPigpO1xyXG4gICAgICBmb3IgKGNvbnN0IHNob3Qgb2YgY2x1Yi5zaG90cykge1xyXG4gICAgICAgIGNvbnN0IHRhZyA9IHNob3QudGFnID8/IFwiXCI7XHJcbiAgICAgICAgaWYgKCF0YWdHcm91cHMuaGFzKHRhZykpIHRhZ0dyb3Vwcy5zZXQodGFnLCBbXSk7XHJcbiAgICAgICAgdGFnR3JvdXBzLmdldCh0YWcpIS5wdXNoKHNob3QpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBmb3IgKGNvbnN0IFt0YWcsIHNob3RzXSBvZiB0YWdHcm91cHMpIHtcclxuICAgICAgICAvLyBPbmx5IHdyaXRlIGF2ZXJhZ2Ugcm93IGlmIGdyb3VwIGhhcyAyKyBzaG90c1xyXG4gICAgICAgIGlmIChzaG90cy5sZW5ndGggPCAyKSBjb250aW51ZTtcclxuXHJcbiAgICAgICAgY29uc3QgYXZnUm93OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xyXG4gICAgICAgICAgRGF0ZTogc2Vzc2lvbi5kYXRlLFxyXG4gICAgICAgICAgQ2x1YjogY2x1Yi5jbHViX25hbWUsXHJcbiAgICAgICAgICBcIlNob3QgI1wiOiBcIlwiLFxyXG4gICAgICAgICAgVHlwZTogXCJBdmVyYWdlXCIsXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgaWYgKGhhc1RhZ3Moc2Vzc2lvbikpIHtcclxuICAgICAgICAgIGF2Z1Jvdy5UYWcgPSB0YWc7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmb3IgKGNvbnN0IG1ldHJpYyBvZiBvcmRlcmVkTWV0cmljcykge1xyXG4gICAgICAgICAgY29uc3QgY29sTmFtZSA9IGdldENvbHVtbk5hbWUobWV0cmljLCB1bml0Q2hvaWNlKTtcclxuICAgICAgICAgIGNvbnN0IHZhbHVlcyA9IHNob3RzXHJcbiAgICAgICAgICAgIC5tYXAoKHMpID0+IHMubWV0cmljc1ttZXRyaWNdKVxyXG4gICAgICAgICAgICAuZmlsdGVyKCh2KSA9PiB2ICE9PSB1bmRlZmluZWQgJiYgdiAhPT0gXCJcIilcclxuICAgICAgICAgICAgLm1hcCgodikgPT4gcGFyc2VGbG9hdChTdHJpbmcodikpKTtcclxuICAgICAgICAgIGNvbnN0IG51bWVyaWNWYWx1ZXMgPSB2YWx1ZXMuZmlsdGVyKCh2KSA9PiAhaXNOYU4odikpO1xyXG5cclxuICAgICAgICAgIGlmIChudW1lcmljVmFsdWVzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgY29uc3QgYXZnID0gbnVtZXJpY1ZhbHVlcy5yZWR1Y2UoKGEsIGIpID0+IGEgKyBiLCAwKSAvIG51bWVyaWNWYWx1ZXMubGVuZ3RoO1xyXG4gICAgICAgICAgICBjb25zdCByb3VuZGVkID0gKG1ldHJpYyA9PT0gXCJTbWFzaEZhY3RvclwiIHx8IG1ldHJpYyA9PT0gXCJUZW1wb1wiKVxyXG4gICAgICAgICAgICAgID8gTWF0aC5yb3VuZChhdmcgKiAxMDApIC8gMTAwXHJcbiAgICAgICAgICAgICAgOiBNYXRoLnJvdW5kKGF2ZyAqIDEwKSAvIDEwO1xyXG4gICAgICAgICAgICBhdmdSb3dbY29sTmFtZV0gPSBTdHJpbmcobm9ybWFsaXplTWV0cmljVmFsdWUocm91bmRlZCwgbWV0cmljLCB1bml0U3lzdGVtLCB1bml0Q2hvaWNlKSk7XHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBhdmdSb3dbY29sTmFtZV0gPSBcIlwiO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcm93cy5wdXNoKGF2Z1Jvdyk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIGNvbnN0IGxpbmVzOiBzdHJpbmdbXSA9IFtdO1xyXG5cclxuICBpZiAoaGl0dGluZ1N1cmZhY2UgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgbGluZXMucHVzaChgSGl0dGluZyBTdXJmYWNlOiAke2hpdHRpbmdTdXJmYWNlfWApO1xyXG4gIH1cclxuXHJcbiAgbGluZXMucHVzaChoZWFkZXJSb3cuam9pbihcIixcIikpO1xyXG4gIGZvciAoY29uc3Qgcm93IG9mIHJvd3MpIHtcclxuICAgIGxpbmVzLnB1c2goXHJcbiAgICAgIGhlYWRlclJvd1xyXG4gICAgICAgIC5tYXAoKGNvbCkgPT4ge1xyXG4gICAgICAgICAgY29uc3QgdmFsdWUgPSByb3dbY29sXSA/PyBcIlwiO1xyXG4gICAgICAgICAgaWYgKHZhbHVlLmluY2x1ZGVzKFwiLFwiKSB8fCB2YWx1ZS5pbmNsdWRlcygnXCInKSB8fCB2YWx1ZS5pbmNsdWRlcyhcIlxcblwiKSkge1xyXG4gICAgICAgICAgICByZXR1cm4gYFwiJHt2YWx1ZS5yZXBsYWNlKC9cIi9nLCAnXCJcIicpfVwiYDtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIHJldHVybiB2YWx1ZTtcclxuICAgICAgICB9KVxyXG4gICAgICAgIC5qb2luKFwiLFwiKVxyXG4gICAgKTtcclxuICB9XHJcblxyXG4gIHJldHVybiBsaW5lcy5qb2luKFwiXFxuXCIpO1xyXG59XHJcbiIsICIvKipcclxuICogU2Vzc2lvbiBoaXN0b3J5IHN0b3JhZ2UgbW9kdWxlLlxyXG4gKiBTYXZlcywgZGVkdXBsaWNhdGVzIChieSByZXBvcnRfaWQpLCBhbmQgZXZpY3RzIHNlc3Npb25zIGZyb20gY2hyb21lLnN0b3JhZ2UubG9jYWwuXHJcbiAqL1xyXG5cclxuaW1wb3J0IHR5cGUgeyBTZXNzaW9uRGF0YSwgU2Vzc2lvblNuYXBzaG90LCBIaXN0b3J5RW50cnkgfSBmcm9tIFwiLi4vbW9kZWxzL3R5cGVzXCI7XHJcbmltcG9ydCB7IFNUT1JBR0VfS0VZUyB9IGZyb20gXCIuL2NvbnN0YW50c1wiO1xyXG5cclxuY29uc3QgTUFYX1NFU1NJT05TID0gMjA7XHJcblxyXG4vKiogU3RyaXAgcmF3X2FwaV9kYXRhIGZyb20gYSBTZXNzaW9uRGF0YSB0byBjcmVhdGUgYSBsaWdodHdlaWdodCBzbmFwc2hvdC4gKi9cclxuZnVuY3Rpb24gY3JlYXRlU25hcHNob3Qoc2Vzc2lvbjogU2Vzc2lvbkRhdGEpOiBTZXNzaW9uU25hcHNob3Qge1xyXG4gIC8vIERlc3RydWN0dXJlIHRvIGV4Y2x1ZGUgcmF3X2FwaV9kYXRhXHJcbiAgY29uc3QgeyByYXdfYXBpX2RhdGE6IF8sIC4uLnNuYXBzaG90IH0gPSBzZXNzaW9uO1xyXG4gIHJldHVybiBzbmFwc2hvdDtcclxufVxyXG5cclxuLyoqXHJcbiAqIFNhdmUgYSBzZXNzaW9uIHRvIHRoZSByb2xsaW5nIGhpc3RvcnkgaW4gY2hyb21lLnN0b3JhZ2UubG9jYWwuXHJcbiAqIC0gRGVkdXBsaWNhdGVzIGJ5IHJlcG9ydF9pZCAocmVwbGFjZXMgZXhpc3RpbmcgZW50cnksIHJlZnJlc2hlcyBjYXB0dXJlZF9hdCkuXHJcbiAqIC0gRXZpY3RzIG9sZGVzdCBlbnRyeSB3aGVuIHRoZSAyMC1zZXNzaW9uIGNhcCBpcyByZWFjaGVkLlxyXG4gKiAtIFN0b3JlcyBlbnRyaWVzIHNvcnRlZCBuZXdlc3QtZmlyc3QgKGRlc2NlbmRpbmcgY2FwdHVyZWRfYXQpLlxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIHNhdmVTZXNzaW9uVG9IaXN0b3J5KHNlc3Npb246IFNlc3Npb25EYXRhKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgIGNocm9tZS5zdG9yYWdlLmxvY2FsLmdldChcclxuICAgICAgW1NUT1JBR0VfS0VZUy5TRVNTSU9OX0hJU1RPUlldLFxyXG4gICAgICAocmVzdWx0OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPikgPT4ge1xyXG4gICAgICAgIGlmIChjaHJvbWUucnVudGltZS5sYXN0RXJyb3IpIHtcclxuICAgICAgICAgIHJldHVybiByZWplY3QobmV3IEVycm9yKGNocm9tZS5ydW50aW1lLmxhc3RFcnJvci5tZXNzYWdlKSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBleGlzdGluZyA9IChyZXN1bHRbU1RPUkFHRV9LRVlTLlNFU1NJT05fSElTVE9SWV0gYXMgSGlzdG9yeUVudHJ5W10gfCB1bmRlZmluZWQpID8/IFtdO1xyXG5cclxuICAgICAgICAvLyBSZW1vdmUgYW55IGV4aXN0aW5nIGVudHJ5IHdpdGggdGhlIHNhbWUgcmVwb3J0X2lkIChkZWR1cClcclxuICAgICAgICBjb25zdCBmaWx0ZXJlZCA9IGV4aXN0aW5nLmZpbHRlcihcclxuICAgICAgICAgIChlbnRyeSkgPT4gZW50cnkuc25hcHNob3QucmVwb3J0X2lkICE9PSBzZXNzaW9uLnJlcG9ydF9pZFxyXG4gICAgICAgICk7XHJcblxyXG4gICAgICAgIC8vIENyZWF0ZSBuZXcgZW50cnlcclxuICAgICAgICBjb25zdCBuZXdFbnRyeTogSGlzdG9yeUVudHJ5ID0ge1xyXG4gICAgICAgICAgY2FwdHVyZWRfYXQ6IERhdGUubm93KCksXHJcbiAgICAgICAgICBzbmFwc2hvdDogY3JlYXRlU25hcHNob3Qoc2Vzc2lvbiksXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgZmlsdGVyZWQucHVzaChuZXdFbnRyeSk7XHJcblxyXG4gICAgICAgIC8vIFNvcnQgbmV3ZXN0LWZpcnN0IChkZXNjZW5kaW5nIGNhcHR1cmVkX2F0KVxyXG4gICAgICAgIGZpbHRlcmVkLnNvcnQoKGEsIGIpID0+IGIuY2FwdHVyZWRfYXQgLSBhLmNhcHR1cmVkX2F0KTtcclxuXHJcbiAgICAgICAgLy8gRW5mb3JjZSBjYXAgXHUyMDE0IHNsaWNlIGtlZXBzIHRoZSBuZXdlc3QgTUFYX1NFU1NJT05TIGVudHJpZXNcclxuICAgICAgICBjb25zdCBjYXBwZWQgPSBmaWx0ZXJlZC5zbGljZSgwLCBNQVhfU0VTU0lPTlMpO1xyXG5cclxuICAgICAgICBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoXHJcbiAgICAgICAgICB7IFtTVE9SQUdFX0tFWVMuU0VTU0lPTl9ISVNUT1JZXTogY2FwcGVkIH0sXHJcbiAgICAgICAgICAoKSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChjaHJvbWUucnVudGltZS5sYXN0RXJyb3IpIHtcclxuICAgICAgICAgICAgICByZXR1cm4gcmVqZWN0KG5ldyBFcnJvcihjaHJvbWUucnVudGltZS5sYXN0RXJyb3IubWVzc2FnZSkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJlc29sdmUoKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICApO1xyXG4gICAgICB9XHJcbiAgICApO1xyXG4gIH0pO1xyXG59XHJcblxyXG4vKipcclxuICogTWFwIHN0b3JhZ2UgZXJyb3Igc3RyaW5ncyB0byB1c2VyLWZyaWVuZGx5IG1lc3NhZ2VzLlxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGdldEhpc3RvcnlFcnJvck1lc3NhZ2UoZXJyb3I6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgaWYgKC9RVU9UQV9CWVRFU3xxdW90YS9pLnRlc3QoZXJyb3IpKSB7XHJcbiAgICByZXR1cm4gXCJTdG9yYWdlIGZ1bGwgLS0gb2xkZXN0IHNlc3Npb25zIHdpbGwgYmUgY2xlYXJlZFwiO1xyXG4gIH1cclxuICByZXR1cm4gXCJDb3VsZCBub3Qgc2F2ZSB0byBzZXNzaW9uIGhpc3RvcnlcIjtcclxufVxyXG4iLCAiLyoqXHJcbiAqIFBvcnRhbCBwZXJtaXNzaW9uIGhlbHBlcnMgZm9yIFRyYWNrbWFuIEFQSSBhY2Nlc3MuXHJcbiAqIFNoYXJlZCBieSBwb3B1cCAocmVxdWVzdCArIGNoZWNrKSBhbmQgc2VydmljZSB3b3JrZXIgKGNoZWNrIG9ubHkpLlxyXG4gKi9cclxuXHJcbmV4cG9ydCBjb25zdCBQT1JUQUxfT1JJR0lOUzogcmVhZG9ubHkgc3RyaW5nW10gPSBbXHJcbiAgXCJodHRwczovL2FwaS50cmFja21hbmdvbGYuY29tLypcIixcclxuICBcImh0dHBzOi8vcG9ydGFsLnRyYWNrbWFuZ29sZi5jb20vKlwiLFxyXG5dIGFzIGNvbnN0O1xyXG5cclxuLyoqIFJldHVybnMgdHJ1ZSBpZiBwb3J0YWwgaG9zdCBwZXJtaXNzaW9ucyBhcmUgY3VycmVudGx5IGdyYW50ZWQuICovXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBoYXNQb3J0YWxQZXJtaXNzaW9uKCk6IFByb21pc2U8Ym9vbGVhbj4ge1xyXG4gIHJldHVybiBjaHJvbWUucGVybWlzc2lvbnMuY29udGFpbnMoeyBvcmlnaW5zOiBbLi4uUE9SVEFMX09SSUdJTlNdIH0pO1xyXG59XHJcblxyXG4vKipcclxuICogUmVxdWVzdHMgcG9ydGFsIGhvc3QgcGVybWlzc2lvbnMgZnJvbSB0aGUgdXNlci5cclxuICogTVVTVCBiZSBjYWxsZWQgZnJvbSBhIHVzZXIgZ2VzdHVyZSAoYnV0dG9uIGNsaWNrIGhhbmRsZXIpLlxyXG4gKiBSZXR1cm5zIHRydWUgaWYgZ3JhbnRlZCwgZmFsc2UgaWYgZGVuaWVkLlxyXG4gKi9cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlcXVlc3RQb3J0YWxQZXJtaXNzaW9uKCk6IFByb21pc2U8Ym9vbGVhbj4ge1xyXG4gIHJldHVybiBjaHJvbWUucGVybWlzc2lvbnMucmVxdWVzdCh7IG9yaWdpbnM6IFsuLi5QT1JUQUxfT1JJR0lOU10gfSk7XHJcbn1cclxuIiwgIi8qKlxyXG4gKiBHcmFwaFFMIGNsaWVudCBmb3IgVHJhY2ttYW4gQVBJLlxyXG4gKiBTZW5kcyBhdXRoZW50aWNhdGVkIHJlcXVlc3RzIHVzaW5nIGJyb3dzZXIgc2Vzc2lvbiBjb29raWVzIChjcmVkZW50aWFsczogaW5jbHVkZSkuXHJcbiAqIFNoYXJlZCBieSBzZXJ2aWNlIHdvcmtlciBhbmQgcG9wdXAuXHJcbiAqL1xyXG5cclxuZXhwb3J0IGNvbnN0IEdSQVBIUUxfRU5EUE9JTlQgPSBcImh0dHBzOi8vYXBpLnRyYWNrbWFuZ29sZi5jb20vZ3JhcGhxbFwiO1xyXG5cclxuZXhwb3J0IGNvbnN0IEhFQUxUSF9DSEVDS19RVUVSWSA9IGBxdWVyeSBIZWFsdGhDaGVjayB7IG1lIHsgX190eXBlbmFtZSB9IH1gO1xyXG5cclxuLyoqIFN0YW5kYXJkIEdyYXBoUUwgcmVzcG9uc2UgZW52ZWxvcGUuICovXHJcbmV4cG9ydCBpbnRlcmZhY2UgR3JhcGhRTFJlc3BvbnNlPFQ+IHtcclxuICBkYXRhOiBUIHwgbnVsbDtcclxuICBlcnJvcnM/OiBBcnJheTx7XHJcbiAgICBtZXNzYWdlOiBzdHJpbmc7XHJcbiAgICBleHRlbnNpb25zPzogeyBjb2RlPzogc3RyaW5nIH07XHJcbiAgfT47XHJcbn1cclxuXHJcbi8qKiBBdXRoIGNsYXNzaWZpY2F0aW9uIHJlc3VsdCByZXR1cm5lZCBieSBjbGFzc2lmeUF1dGhSZXN1bHQuICovXHJcbmV4cG9ydCB0eXBlIEF1dGhTdGF0dXMgPVxyXG4gIHwgeyBraW5kOiBcImF1dGhlbnRpY2F0ZWRcIiB9XHJcbiAgfCB7IGtpbmQ6IFwidW5hdXRoZW50aWNhdGVkXCIgfVxyXG4gIHwgeyBraW5kOiBcImVycm9yXCI7IG1lc3NhZ2U6IHN0cmluZyB9O1xyXG5cclxuLyoqXHJcbiAqIEV4ZWN1dGVzIGEgR3JhcGhRTCBxdWVyeSBhZ2FpbnN0IHRoZSBUcmFja21hbiBBUEkuXHJcbiAqIFVzZXMgY3JlZGVudGlhbHM6IFwiaW5jbHVkZVwiIHNvIHRoZSBicm93c2VyIHNlbmRzIGV4aXN0aW5nIHNlc3Npb24gY29va2llcy5cclxuICogVGhyb3dzIGlmIHRoZSBIVFRQIHJlc3BvbnNlIGlzIG5vdCAyeHguXHJcbiAqL1xyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZXhlY3V0ZVF1ZXJ5PFQ+KFxyXG4gIHF1ZXJ5OiBzdHJpbmcsXHJcbiAgdmFyaWFibGVzPzogUmVjb3JkPHN0cmluZywgdW5rbm93bj5cclxuKTogUHJvbWlzZTxHcmFwaFFMUmVzcG9uc2U8VD4+IHtcclxuICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKEdSQVBIUUxfRU5EUE9JTlQsIHtcclxuICAgIG1ldGhvZDogXCJQT1NUXCIsXHJcbiAgICBjcmVkZW50aWFsczogXCJpbmNsdWRlXCIsXHJcbiAgICBoZWFkZXJzOiB7IFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiIH0sXHJcbiAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IHF1ZXJ5LCB2YXJpYWJsZXMgfSksXHJcbiAgfSk7XHJcblxyXG4gIGlmICghcmVzcG9uc2Uub2spIHtcclxuICAgIGNvbnN0IGJvZHkgPSBhd2FpdCByZXNwb25zZS50ZXh0KCkuY2F0Y2goKCkgPT4gXCIobm8gYm9keSlcIik7XHJcbiAgICBjb25zb2xlLmVycm9yKGBUcmFja1B1bGw6IEdyYXBoUUwgJHtyZXNwb25zZS5zdGF0dXN9IHJlc3BvbnNlOmAsIGJvZHkpO1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKGBIVFRQICR7cmVzcG9uc2Uuc3RhdHVzfTogJHtib2R5LnNsaWNlKDAsIDIwMCl9YCk7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gcmVzcG9uc2UuanNvbigpIGFzIFByb21pc2U8R3JhcGhRTFJlc3BvbnNlPFQ+PjtcclxufVxyXG5cclxuLyoqXHJcbiAqIENsYXNzaWZpZXMgYSBHcmFwaFFMIHJlc3BvbnNlIGZyb20gdGhlIGhlYWx0aC1jaGVjayBxdWVyeSBpbnRvIGFuIEF1dGhTdGF0dXMuXHJcbiAqXHJcbiAqIENsYXNzaWZpY2F0aW9uIHByaW9yaXR5OlxyXG4gKiAxLiBFcnJvcnMgcHJlc2VudCBhbmQgbm9uLWVtcHR5IFx1MjE5MiBjaGVjayBmb3IgYXV0aCBlcnJvciBwYXR0ZXJucyBcdTIxOTIgZWxzZSBnZW5lcmljIGVycm9yXHJcbiAqIDIuIE5vIGVycm9ycyBidXQgZGF0YS5tZSBpcyBmYWxzeSBcdTIxOTIgdW5hdXRoZW50aWNhdGVkXHJcbiAqIDMuIGRhdGEubWUgaXMgdHJ1dGh5IChoYXMgX190eXBlbmFtZSkgXHUyMTkyIGF1dGhlbnRpY2F0ZWRcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBjbGFzc2lmeUF1dGhSZXN1bHQoXHJcbiAgcmVzdWx0OiBHcmFwaFFMUmVzcG9uc2U8eyBtZTogeyBfX3R5cGVuYW1lOiBzdHJpbmcgfSB8IG51bGwgfT5cclxuKTogQXV0aFN0YXR1cyB7XHJcbiAgaWYgKHJlc3VsdC5lcnJvcnMgJiYgcmVzdWx0LmVycm9ycy5sZW5ndGggPiAwKSB7XHJcbiAgICBjb25zdCBjb2RlID0gcmVzdWx0LmVycm9yc1swXS5leHRlbnNpb25zPy5jb2RlID8/IFwiXCI7XHJcbiAgICBjb25zdCBtc2cgPSByZXN1bHQuZXJyb3JzWzBdLm1lc3NhZ2UgPz8gXCJcIjtcclxuICAgIGNvbnN0IG1zZ0xvd2VyID0gbXNnLnRvTG93ZXJDYXNlKCk7XHJcblxyXG4gICAgaWYgKFxyXG4gICAgICBjb2RlID09PSBcIlVOQVVUSEVOVElDQVRFRFwiIHx8XHJcbiAgICAgIG1zZ0xvd2VyLmluY2x1ZGVzKFwidW5hdXRob3JpemVkXCIpIHx8XHJcbiAgICAgIG1zZ0xvd2VyLmluY2x1ZGVzKFwidW5hdXRoZW50aWNhdGVkXCIpIHx8XHJcbiAgICAgIG1zZ0xvd2VyLmluY2x1ZGVzKFwibm90IGxvZ2dlZCBpblwiKVxyXG4gICAgKSB7XHJcbiAgICAgIHJldHVybiB7IGtpbmQ6IFwidW5hdXRoZW50aWNhdGVkXCIgfTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4geyBraW5kOiBcImVycm9yXCIsIG1lc3NhZ2U6IFwiVW5hYmxlIHRvIHJlYWNoIFRyYWNrbWFuIFx1MjAxNCB0cnkgYWdhaW4gbGF0ZXJcIiB9O1xyXG4gIH1cclxuXHJcbiAgaWYgKCFyZXN1bHQuZGF0YT8ubWU/Ll9fdHlwZW5hbWUpIHtcclxuICAgIHJldHVybiB7IGtpbmQ6IFwidW5hdXRoZW50aWNhdGVkXCIgfTtcclxuICB9XHJcblxyXG4gIHJldHVybiB7IGtpbmQ6IFwiYXV0aGVudGljYXRlZFwiIH07XHJcbn1cclxuIiwgIi8qKlxuICogUG9ydGFsIEdyYXBoUUwgYWN0aXZpdHkgcGFyc2VyLlxuICpcbiAqIENvbnZlcnRzIEdyYXBoUUwgYWN0aXZpdHkgcmVzcG9uc2VzIChmcm9tIFBoYXNlIDIyIGdyYXBocWxfY2xpZW50KSBpbnRvIHRoZVxuICogZXhpc3RpbmcgU2Vzc2lvbkRhdGEgZm9ybWF0LCBlbmFibGluZyBwb3J0YWwtZmV0Y2hlZCBkYXRhIHRvIGZsb3cgaW50byB0aGVcbiAqIENTViBleHBvcnQsIEFJIGFuYWx5c2lzLCBhbmQgc2Vzc2lvbiBoaXN0b3J5IHBpcGVsaW5lLlxuICpcbiAqIEtleSBkZXNpZ24gZGVjaXNpb25zOlxuICogLSBHUkFQSFFMX01FVFJJQ19BTElBUyBtYXBzIGFsbCAyOSBrbm93biBjYW1lbENhc2UgR3JhcGhRTCBmaWVsZCBuYW1lcyB0b1xuICogICBQYXNjYWxDYXNlIE1FVFJJQ19LRVlTIG5hbWVzLiBVbmtub3duIGZpZWxkcyBhcmUgbm9ybWFsaXplZCB2aWEgdG9QYXNjYWxDYXNlLlxuICogLSBEb2VzIE5PVCBpbXBvcnQgTUVUUklDX0tFWVMgZnJvbSBpbnRlcmNlcHRvci50cyB0byBhdm9pZCBhY2NpZGVudGFsbHlcbiAqICAgZmlsdGVyaW5nIHVua25vd24gZnV0dXJlIGZpZWxkcyAoRC0wMSBhbnRpLXBhdHRlcm4pLlxuICogLSBOdWxsL3VuZGVmaW5lZC9OYU4gdmFsdWVzIGFyZSBvbWl0dGVkIFx1MjAxNCBubyBwaGFudG9tIGVtcHR5IG1ldHJpY3MuXG4gKiAtIE1ldHJpYyB2YWx1ZXMgYXJlIHN0b3JlZCBhcyBzdHJpbmdzIGZvciBjb25zaXN0ZW5jeSB3aXRoIGludGVyY2VwdG9yIG91dHB1dC5cbiAqIC0gcmVwb3J0X2lkIGlzIHRoZSBVVUlEIGRlY29kZWQgZnJvbSB0aGUgYmFzZTY0IGFjdGl2aXR5IElEIChQSVBFLTAzIGRlZHVwKS5cbiAqL1xuXG5pbXBvcnQgdHlwZSB7IFNlc3Npb25EYXRhLCBTaG90LCBDbHViR3JvdXAgfSBmcm9tIFwiLi4vbW9kZWxzL3R5cGVzXCI7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gRXhwb3J0ZWQgdHlwZXMgKHVzZWQgYnkgUGhhc2UgMjQgaW50ZWdyYXRpb24pXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuZXhwb3J0IGludGVyZmFjZSBTdHJva2VNZWFzdXJlbWVudCB7XG4gIFtrZXk6IHN0cmluZ106IG51bWJlciB8IG51bGwgfCB1bmRlZmluZWQ7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgR3JhcGhRTFN0cm9rZSB7XG4gIGNsdWI/OiBzdHJpbmcgfCBudWxsO1xuICB0aW1lPzogc3RyaW5nIHwgbnVsbDtcbiAgdGFyZ2V0RGlzdGFuY2U/OiBudW1iZXIgfCBudWxsO1xuICBpc0RlbGV0ZWQ/OiBib29sZWFuIHwgbnVsbDtcbiAgaXNTaW11bGF0ZWQ/OiBib29sZWFuIHwgbnVsbDtcbiAgbWVhc3VyZW1lbnQ/OiBTdHJva2VNZWFzdXJlbWVudCB8IG51bGw7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgR3JhcGhRTEFjdGl2aXR5IHtcbiAgaWQ6IHN0cmluZztcbiAgdGltZT86IHN0cmluZyB8IG51bGw7XG4gIHN0cm9rZUNvdW50PzogbnVtYmVyIHwgbnVsbDtcbiAgc3Ryb2tlcz86IEdyYXBoUUxTdHJva2VbXSB8IG51bGw7XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gR1JBUEhRTF9NRVRSSUNfQUxJQVMgXHUyMDE0IGFsbCAyOSBNRVRSSUNfS0VZUyBmcm9tIGNhbWVsQ2FzZSB0byBQYXNjYWxDYXNlXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuY29uc3QgR1JBUEhRTF9NRVRSSUNfQUxJQVM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XG4gIGNsdWJTcGVlZDogXCJDbHViU3BlZWRcIixcbiAgYmFsbFNwZWVkOiBcIkJhbGxTcGVlZFwiLFxuICBzbWFzaEZhY3RvcjogXCJTbWFzaEZhY3RvclwiLFxuICBhdHRhY2tBbmdsZTogXCJBdHRhY2tBbmdsZVwiLFxuICBjbHViUGF0aDogXCJDbHViUGF0aFwiLFxuICBmYWNlQW5nbGU6IFwiRmFjZUFuZ2xlXCIsXG4gIGZhY2VUb1BhdGg6IFwiRmFjZVRvUGF0aFwiLFxuICBzd2luZ0RpcmVjdGlvbjogXCJTd2luZ0RpcmVjdGlvblwiLFxuICBzd2luZ1BsYW5lOiBcIlN3aW5nUGxhbmVcIixcbiAgZHluYW1pY0xvZnQ6IFwiRHluYW1pY0xvZnRcIixcbiAgc3BpblJhdGU6IFwiU3BpblJhdGVcIixcbiAgYmFsbFNwaW46IFwiU3BpblJhdGVcIixcbiAgc3BpbkF4aXM6IFwiU3BpbkF4aXNcIixcbiAgc3BpbkxvZnQ6IFwiU3BpbkxvZnRcIixcbiAgbGF1bmNoQW5nbGU6IFwiTGF1bmNoQW5nbGVcIixcbiAgbGF1bmNoRGlyZWN0aW9uOiBcIkxhdW5jaERpcmVjdGlvblwiLFxuICBjYXJyeTogXCJDYXJyeVwiLFxuICB0b3RhbDogXCJUb3RhbFwiLFxuICBzaWRlOiBcIlNpZGVcIixcbiAgc2lkZVRvdGFsOiBcIlNpZGVUb3RhbFwiLFxuICBjYXJyeVNpZGU6IFwiQ2FycnlTaWRlXCIsXG4gIHRvdGFsU2lkZTogXCJUb3RhbFNpZGVcIixcbiAgaGVpZ2h0OiBcIkhlaWdodFwiLFxuICBtYXhIZWlnaHQ6IFwiTWF4SGVpZ2h0XCIsXG4gIGN1cnZlOiBcIkN1cnZlXCIsXG4gIGxhbmRpbmdBbmdsZTogXCJMYW5kaW5nQW5nbGVcIixcbiAgaGFuZ1RpbWU6IFwiSGFuZ1RpbWVcIixcbiAgbG93UG9pbnREaXN0YW5jZTogXCJMb3dQb2ludERpc3RhbmNlXCIsXG4gIGltcGFjdEhlaWdodDogXCJJbXBhY3RIZWlnaHRcIixcbiAgaW1wYWN0T2Zmc2V0OiBcIkltcGFjdE9mZnNldFwiLFxuICB0ZW1wbzogXCJUZW1wb1wiLFxufTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBIZWxwZXIgZnVuY3Rpb25zXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuLyoqIENvbnZlcnQgZmlyc3QgY2hhcmFjdGVyIHRvIHVwcGVyY2FzZSBcdTIwMTQgdXNlZCBmb3IgdW5rbm93biBmaWVsZHMgYmV5b25kIE1FVFJJQ19LRVlTLiAqL1xuZnVuY3Rpb24gdG9QYXNjYWxDYXNlKGtleTogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGtleS5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIGtleS5zbGljZSgxKTtcbn1cblxuLyoqIFJlc29sdmUgYSBHcmFwaFFMIGNhbWVsQ2FzZSBmaWVsZCBuYW1lIHRvIGl0cyBjYW5vbmljYWwgUGFzY2FsQ2FzZSBtZXRyaWMga2V5LiAqL1xuZnVuY3Rpb24gbm9ybWFsaXplTWV0cmljS2V5KGdyYXBocWxLZXk6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBHUkFQSFFMX01FVFJJQ19BTElBU1tncmFwaHFsS2V5XSA/PyB0b1Bhc2NhbENhc2UoZ3JhcGhxbEtleSk7XG59XG5cbi8qKlxuICogRGVjb2RlIGEgVHJhY2ttYW4gYmFzZTY0IGFjdGl2aXR5IElEIHRvIGV4dHJhY3QgdGhlIFVVSUQgcG9ydGlvbi5cbiAqXG4gKiBUcmFja21hbiBlbmNvZGVzIGFjdGl2aXR5IElEcyBhczogYnRvYShcIlNlc3Npb25BY3Rpdml0eVxcbjx1dWlkPlwiKVxuICogUmV0dXJucyB0aGUgcmF3IGlucHV0IHN0cmluZyBpZiBkZWNvZGluZyBmYWlscyBvciBubyBuZXdsaW5lIGlzIGZvdW5kLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZXh0cmFjdEFjdGl2aXR5VXVpZChiYXNlNjRJZDogc3RyaW5nKTogc3RyaW5nIHtcbiAgdHJ5IHtcbiAgICBjb25zdCBkZWNvZGVkID0gYXRvYihiYXNlNjRJZCk7XG4gICAgY29uc3QgcGFydHMgPSBkZWNvZGVkLnNwbGl0KFwiXFxuXCIpO1xuICAgIGNvbnN0IHV1aWQgPSBwYXJ0c1sxXT8udHJpbSgpO1xuICAgIGlmICghdXVpZCkgcmV0dXJuIGJhc2U2NElkO1xuICAgIHJldHVybiB1dWlkO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gYmFzZTY0SWQ7XG4gIH1cbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBNYWluIGV4cG9ydGVkIHBhcnNlclxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbi8qKlxuICogQ29udmVydCBhIEdyYXBoUUwgYWN0aXZpdHkgcmVzcG9uc2UgaW50byB0aGUgU2Vzc2lvbkRhdGEgZm9ybWF0LlxuICpcbiAqIFJldHVybnMgbnVsbCBpZiB0aGUgYWN0aXZpdHkgaXMgbWFsZm9ybWVkLCBtaXNzaW5nIGFuIElELCBvciBwcm9kdWNlcyBub1xuICogdmFsaWQgY2x1YiBncm91cHMgYWZ0ZXIgZmlsdGVyaW5nIGVtcHR5L251bGwgc3Ryb2tlcy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlUG9ydGFsQWN0aXZpdHkoXG4gIGFjdGl2aXR5OiBHcmFwaFFMQWN0aXZpdHksXG4pOiBTZXNzaW9uRGF0YSB8IG51bGwge1xuICB0cnkge1xuICAgIGlmICghYWN0aXZpdHk/LmlkKSByZXR1cm4gbnVsbDtcblxuICAgIGNvbnN0IHJlcG9ydElkID0gZXh0cmFjdEFjdGl2aXR5VXVpZChhY3Rpdml0eS5pZCk7XG4gICAgY29uc3QgZGF0ZSA9IGFjdGl2aXR5LnRpbWUgPz8gXCJVbmtub3duXCI7XG4gICAgY29uc3QgYWxsTWV0cmljTmFtZXMgPSBuZXcgU2V0PHN0cmluZz4oKTtcblxuICAgIC8vIEdyb3VwIGZsYXQgc3Ryb2tlcyBieSBjbHViIG5hbWVcbiAgICBjb25zdCBjbHViTWFwID0gbmV3IE1hcDxzdHJpbmcsIFNob3RbXT4oKTtcblxuICAgIGZvciAoY29uc3Qgc3Ryb2tlIG9mIGFjdGl2aXR5LnN0cm9rZXMgPz8gW10pIHtcbiAgICAgIGlmICghc3Ryb2tlPy5tZWFzdXJlbWVudCkgY29udGludWU7XG4gICAgICBpZiAoc3Ryb2tlLmlzRGVsZXRlZCA9PT0gdHJ1ZSB8fCBzdHJva2UuaXNTaW11bGF0ZWQgPT09IHRydWUpIGNvbnRpbnVlO1xuXG4gICAgICBjb25zdCBjbHViTmFtZSA9IHN0cm9rZS5jbHViIHx8IFwiVW5rbm93blwiO1xuICAgICAgY29uc3Qgc2hvdE1ldHJpY3M6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7fTtcblxuICAgICAgZm9yIChjb25zdCBba2V5LCB2YWx1ZV0gb2YgT2JqZWN0LmVudHJpZXMoc3Ryb2tlLm1lYXN1cmVtZW50KSkge1xuICAgICAgICBpZiAodmFsdWUgPT09IG51bGwgfHwgdmFsdWUgPT09IHVuZGVmaW5lZCkgY29udGludWU7XG5cbiAgICAgICAgY29uc3QgbnVtVmFsdWUgPVxuICAgICAgICAgIHR5cGVvZiB2YWx1ZSA9PT0gXCJudW1iZXJcIiA/IHZhbHVlIDogcGFyc2VGbG9hdChTdHJpbmcodmFsdWUpKTtcbiAgICAgICAgaWYgKGlzTmFOKG51bVZhbHVlKSkgY29udGludWU7XG5cbiAgICAgICAgY29uc3Qgbm9ybWFsaXplZEtleSA9IG5vcm1hbGl6ZU1ldHJpY0tleShrZXkpO1xuICAgICAgICBzaG90TWV0cmljc1tub3JtYWxpemVkS2V5XSA9IGAke251bVZhbHVlfWA7XG4gICAgICAgIGFsbE1ldHJpY05hbWVzLmFkZChub3JtYWxpemVkS2V5KTtcbiAgICAgIH1cblxuICAgICAgaWYgKE9iamVjdC5rZXlzKHNob3RNZXRyaWNzKS5sZW5ndGggPiAwKSB7XG4gICAgICAgIGNvbnN0IHNob3RzID0gY2x1Yk1hcC5nZXQoY2x1Yk5hbWUpID8/IFtdO1xuICAgICAgICBzaG90cy5wdXNoKHtcbiAgICAgICAgICBzaG90X251bWJlcjogc2hvdHMubGVuZ3RoICsgMSxcbiAgICAgICAgICBtZXRyaWNzOiBzaG90TWV0cmljcyxcbiAgICAgICAgfSk7XG4gICAgICAgIGNsdWJNYXAuc2V0KGNsdWJOYW1lLCBzaG90cyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGNsdWJNYXAuc2l6ZSA9PT0gMCkgcmV0dXJuIG51bGw7XG5cbiAgICBjb25zdCBjbHViX2dyb3VwczogQ2x1Ykdyb3VwW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IFtjbHViTmFtZSwgc2hvdHNdIG9mIGNsdWJNYXApIHtcbiAgICAgIGNsdWJfZ3JvdXBzLnB1c2goe1xuICAgICAgICBjbHViX25hbWU6IGNsdWJOYW1lLFxuICAgICAgICBzaG90cyxcbiAgICAgICAgYXZlcmFnZXM6IHt9LFxuICAgICAgICBjb25zaXN0ZW5jeToge30sXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBjb25zdCBzZXNzaW9uOiBTZXNzaW9uRGF0YSA9IHtcbiAgICAgIGRhdGUsXG4gICAgICByZXBvcnRfaWQ6IHJlcG9ydElkLFxuICAgICAgdXJsX3R5cGU6IFwiYWN0aXZpdHlcIixcbiAgICAgIGNsdWJfZ3JvdXBzLFxuICAgICAgbWV0cmljX25hbWVzOiBBcnJheS5mcm9tKGFsbE1ldHJpY05hbWVzKS5zb3J0KCksXG4gICAgICBtZXRhZGF0YV9wYXJhbXM6IHsgYWN0aXZpdHlfaWQ6IGFjdGl2aXR5LmlkIH0sXG4gICAgfTtcblxuICAgIHJldHVybiBzZXNzaW9uO1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICBjb25zb2xlLmVycm9yKFwiW3BvcnRhbF9wYXJzZXJdIEZhaWxlZCB0byBwYXJzZSBhY3Rpdml0eTpcIiwgZXJyKTtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuIiwgIi8qKlxuICogSW1wb3J0IHN0YXR1cyB0eXBlcyBhbmQgR3JhcGhRTCBxdWVyaWVzIGZvciBwb3J0YWwgc2Vzc2lvbiBpbXBvcnQuXG4gKiBQZXIgRC0wMTogc2ltcGxlIHJlc3VsdC1vbmx5IHN0YXR1cyBcdTIwMTQgaWRsZS9pbXBvcnRpbmcvc3VjY2Vzcy9lcnJvci5cbiAqL1xuXG4vKiogSW1wb3J0IHN0YXR1cyBzdG9yZWQgaW4gY2hyb21lLnN0b3JhZ2UubG9jYWwgdW5kZXIgU1RPUkFHRV9LRVlTLklNUE9SVF9TVEFUVVMuIFBlciBELTAxLiAqL1xuZXhwb3J0IHR5cGUgSW1wb3J0U3RhdHVzID1cbiAgfCB7IHN0YXRlOiBcImlkbGVcIiB9XG4gIHwgeyBzdGF0ZTogXCJpbXBvcnRpbmdcIiB9XG4gIHwgeyBzdGF0ZTogXCJzdWNjZXNzXCIgfVxuICB8IHsgc3RhdGU6IFwiZXJyb3JcIjsgbWVzc2FnZTogc3RyaW5nIH07XG5cbi8qKiBBY3Rpdml0eSBzdW1tYXJ5IHJldHVybmVkIGJ5IEZFVENIX0FDVElWSVRJRVMgaGFuZGxlci4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQWN0aXZpdHlTdW1tYXJ5IHtcbiAgaWQ6IHN0cmluZztcbiAgZGF0ZTogc3RyaW5nO1xuICBzdHJva2VDb3VudDogbnVtYmVyIHwgbnVsbDsgLy8gbnVsbCBpZiBmaWVsZCB1bmF2YWlsYWJsZSBmcm9tIEFQSVxuICB0eXBlOiBzdHJpbmcgfCBudWxsOyAvLyBudWxsIGlmIGZpZWxkIHVuYXZhaWxhYmxlIGZyb20gQVBJXG59XG5cbi8qKlxuICogRmV0Y2ggcmVjZW50IGFjdGl2aXRpZXMgdmlhIG1lLmFjdGl2aXRpZXMuXG4gKiBBUEkgZmllbGQgbmFtZXM6IHRpbWUgKElTTyBkYXRlKSwga2luZCAoYWN0aXZpdHkgdHlwZSksIHN0cm9rZUNvdW50LlxuICogU2VydmljZSB3b3JrZXIgbWFwcyB0aW1lXHUyMTkyZGF0ZSwga2luZFx1MjE5MnR5cGUgZm9yIEFjdGl2aXR5U3VtbWFyeS5cbiAqL1xuZXhwb3J0IGNvbnN0IEZFVENIX0FDVElWSVRJRVNfUVVFUlkgPSBgXG4gIHF1ZXJ5IEdldFBsYXllckFjdGl2aXRpZXMge1xuICAgIG1lIHtcbiAgICAgIGFjdGl2aXRpZXMge1xuICAgICAgICBpZFxuICAgICAgICB0aW1lXG4gICAgICAgIHN0cm9rZUNvdW50XG4gICAgICAgIGtpbmRcbiAgICAgIH1cbiAgICB9XG4gIH1cbmA7XG5cbi8qKlxuICogRmV0Y2ggYSBzaW5nbGUgYWN0aXZpdHkgYnkgSUQgd2l0aCBmdWxsIHN0cm9rZSBkYXRhLlxuICogVGhlIG5vZGUoaWQ6KSBxdWVyeSBvbiBiYXNlNjQtZW5jb2RlZCBTZXNzaW9uQWN0aXZpdHkgSURzIHdhcyBjb25maXJtZWRcbiAqIHdvcmtpbmcgZHVyaW5nIFBoYXNlIDIyIHJlc2VhcmNoLlxuICogQVBJIHVzZXMgZmxhdCBzdHJva2VzIChlYWNoIHN0cm9rZSBoYXMgaXRzIG93biBjbHViIGZpZWxkKS5cbiAqL1xuLyoqXG4gKiBGcmFnbWVudCBmb3Igc3Ryb2tlIG1lYXN1cmVtZW50IGZpZWxkcyBzaGFyZWQgYWNyb3NzIGFsbCBhY3Rpdml0eSB0eXBlcy5cbiAqL1xuY29uc3QgU1RST0tFX0ZJRUxEUyA9IGBcbiAgY2x1YlxuICB0aW1lXG4gIHRhcmdldERpc3RhbmNlXG4gIG1lYXN1cmVtZW50IHtcbiAgICBjbHViU3BlZWQgYmFsbFNwZWVkIHNtYXNoRmFjdG9yIGF0dGFja0FuZ2xlIGNsdWJQYXRoIGZhY2VBbmdsZVxuICAgIGZhY2VUb1BhdGggc3dpbmdEaXJlY3Rpb24gc3dpbmdQbGFuZSBkeW5hbWljTG9mdCBzcGluUmF0ZSBzcGluQXhpcyBzcGluTG9mdFxuICAgIGxhdW5jaEFuZ2xlIGxhdW5jaERpcmVjdGlvbiBjYXJyeSB0b3RhbCBjYXJyeVNpZGUgdG90YWxTaWRlXG4gICAgbWF4SGVpZ2h0IGxhbmRpbmdBbmdsZSBoYW5nVGltZVxuICB9XG5gO1xuXG5leHBvcnQgY29uc3QgSU1QT1JUX1NFU1NJT05fUVVFUlkgPSBgXG4gIHF1ZXJ5IEZldGNoQWN0aXZpdHlCeUlkKCRpZDogSUQhKSB7XG4gICAgbm9kZShpZDogJGlkKSB7XG4gICAgICAuLi4gb24gU2Vzc2lvbkFjdGl2aXR5IHtcbiAgICAgICAgaWQgdGltZSBzdHJva2VDb3VudCBzdHJva2VzIHsgJHtTVFJPS0VfRklFTERTfSB9XG4gICAgICB9XG4gICAgICAuLi4gb24gVmlydHVhbFJhbmdlU2Vzc2lvbkFjdGl2aXR5IHtcbiAgICAgICAgaWQgdGltZSBzdHJva2VDb3VudCBzdHJva2VzIHsgJHtTVFJPS0VfRklFTERTfSB9XG4gICAgICB9XG4gICAgICAuLi4gb24gU2hvdEFuYWx5c2lzU2Vzc2lvbkFjdGl2aXR5IHtcbiAgICAgICAgaWQgdGltZSBzdHJva2VDb3VudCBzdHJva2VzIHsgJHtTVFJPS0VfRklFTERTfSB9XG4gICAgICB9XG4gICAgICAuLi4gb24gQ29tYmluZVRlc3RBY3Rpdml0eSB7XG4gICAgICAgIGlkIHRpbWUgc3Ryb2tlcyB7ICR7U1RST0tFX0ZJRUxEU30gfVxuICAgICAgfVxuICAgICAgLi4uIG9uIFJhbmdlRmluZE15RGlzdGFuY2VBY3Rpdml0eSB7XG4gICAgICAgIGlkIHRpbWUgc3Ryb2tlcyB7XG4gICAgICAgICAgY2x1YlxuICAgICAgICAgIGlzRGVsZXRlZFxuICAgICAgICAgIGlzU2ltdWxhdGVkXG4gICAgICAgICAgbWVhc3VyZW1lbnQobWVhc3VyZW1lbnRUeXBlOiBQUk9fQkFMTF9NRUFTVVJFTUVOVCkge1xuICAgICAgICAgICAgYmFsbFNwZWVkIGJhbGxTcGluIHNwaW5BeGlzXG4gICAgICAgICAgICBjYXJyeSBjYXJyeVNpZGUgdG90YWwgdG90YWxTaWRlXG4gICAgICAgICAgICBsYW5kaW5nQW5nbGUgbGF1bmNoQW5nbGUgbGF1bmNoRGlyZWN0aW9uIG1heEhlaWdodFxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuYDtcbiIsICIvKipcclxuICogU2VydmljZSBXb3JrZXIgZm9yIFRyYWNrUHVsbCBDaHJvbWUgRXh0ZW5zaW9uXHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgU1RPUkFHRV9LRVlTIH0gZnJvbSBcIi4uL3NoYXJlZC9jb25zdGFudHNcIjtcclxuaW1wb3J0IHsgd3JpdGVDc3YgfSBmcm9tIFwiLi4vc2hhcmVkL2Nzdl93cml0ZXJcIjtcclxuaW1wb3J0IHR5cGUgeyBTZXNzaW9uRGF0YSB9IGZyb20gXCIuLi9tb2RlbHMvdHlwZXNcIjtcclxuaW1wb3J0IHsgbWlncmF0ZUxlZ2FjeVByZWYsIERFRkFVTFRfVU5JVF9DSE9JQ0UsIHR5cGUgVW5pdENob2ljZSwgdHlwZSBTcGVlZFVuaXQsIHR5cGUgRGlzdGFuY2VVbml0IH0gZnJvbSBcIi4uL3NoYXJlZC91bml0X25vcm1hbGl6YXRpb25cIjtcclxuaW1wb3J0IHsgc2F2ZVNlc3Npb25Ub0hpc3RvcnksIGdldEhpc3RvcnlFcnJvck1lc3NhZ2UgfSBmcm9tIFwiLi4vc2hhcmVkL2hpc3RvcnlcIjtcclxuaW1wb3J0IHsgaGFzUG9ydGFsUGVybWlzc2lvbiB9IGZyb20gXCIuLi9zaGFyZWQvcG9ydGFsUGVybWlzc2lvbnNcIjtcclxuaW1wb3J0IHsgZXhlY3V0ZVF1ZXJ5LCBjbGFzc2lmeUF1dGhSZXN1bHQsIEhFQUxUSF9DSEVDS19RVUVSWSB9IGZyb20gXCIuLi9zaGFyZWQvZ3JhcGhxbF9jbGllbnRcIjtcclxuaW1wb3J0IHsgcGFyc2VQb3J0YWxBY3Rpdml0eSB9IGZyb20gXCIuLi9zaGFyZWQvcG9ydGFsX3BhcnNlclwiO1xyXG5pbXBvcnQgdHlwZSB7IEdyYXBoUUxBY3Rpdml0eSB9IGZyb20gXCIuLi9zaGFyZWQvcG9ydGFsX3BhcnNlclwiO1xyXG5pbXBvcnQgdHlwZSB7IEltcG9ydFN0YXR1cywgQWN0aXZpdHlTdW1tYXJ5IH0gZnJvbSBcIi4uL3NoYXJlZC9pbXBvcnRfdHlwZXNcIjtcclxuaW1wb3J0IHsgRkVUQ0hfQUNUSVZJVElFU19RVUVSWSwgSU1QT1JUX1NFU1NJT05fUVVFUlkgfSBmcm9tIFwiLi4vc2hhcmVkL2ltcG9ydF90eXBlc1wiO1xyXG5cclxuY2hyb21lLnJ1bnRpbWUub25JbnN0YWxsZWQuYWRkTGlzdGVuZXIoKCkgPT4ge1xyXG4gIGNvbnNvbGUubG9nKFwiVHJhY2tQdWxsIGV4dGVuc2lvbiBpbnN0YWxsZWRcIik7XHJcbn0pO1xyXG5cclxuaW50ZXJmYWNlIFNhdmVEYXRhUmVxdWVzdCB7XHJcbiAgdHlwZTogXCJTQVZFX0RBVEFcIjtcclxuICBkYXRhOiBTZXNzaW9uRGF0YTtcclxufVxyXG5cclxuaW50ZXJmYWNlIEV4cG9ydENzdlJlcXVlc3Qge1xyXG4gIHR5cGU6IFwiRVhQT1JUX0NTVl9SRVFVRVNUXCI7XHJcbn1cclxuXHJcbmludGVyZmFjZSBHZXREYXRhUmVxdWVzdCB7XHJcbiAgdHlwZTogXCJHRVRfREFUQVwiO1xyXG59XHJcblxyXG5pbnRlcmZhY2UgRmV0Y2hBY3Rpdml0aWVzUmVxdWVzdCB7XHJcbiAgdHlwZTogXCJGRVRDSF9BQ1RJVklUSUVTXCI7XHJcbn1cclxuXHJcbmludGVyZmFjZSBJbXBvcnRTZXNzaW9uUmVxdWVzdCB7XHJcbiAgdHlwZTogXCJJTVBPUlRfU0VTU0lPTlwiO1xyXG4gIGFjdGl2aXR5SWQ6IHN0cmluZztcclxufVxyXG5cclxuaW50ZXJmYWNlIFBvcnRhbEF1dGhDaGVja1JlcXVlc3Qge1xyXG4gIHR5cGU6IFwiUE9SVEFMX0FVVEhfQ0hFQ0tcIjtcclxufVxyXG5cclxuZnVuY3Rpb24gaXNBdXRoRXJyb3IoZXJyb3JzOiBBcnJheTx7IG1lc3NhZ2U6IHN0cmluZzsgZXh0ZW5zaW9ucz86IHsgY29kZT86IHN0cmluZyB9IH0+KTogYm9vbGVhbiB7XHJcbiAgaWYgKGVycm9ycy5sZW5ndGggPT09IDApIHJldHVybiBmYWxzZTtcclxuICBjb25zdCBjb2RlID0gZXJyb3JzWzBdLmV4dGVuc2lvbnM/LmNvZGUgPz8gXCJcIjtcclxuICBjb25zdCBtc2cgPSBlcnJvcnNbMF0ubWVzc2FnZT8udG9Mb3dlckNhc2UoKSA/PyBcIlwiO1xyXG4gIHJldHVybiBjb2RlID09PSBcIlVOQVVUSEVOVElDQVRFRFwiIHx8IG1zZy5pbmNsdWRlcyhcInVuYXV0aG9yaXplZFwiKSB8fCBtc2cuaW5jbHVkZXMoXCJ1bmF1dGhlbnRpY2F0ZWRcIikgfHwgbXNnLmluY2x1ZGVzKFwibm90IGxvZ2dlZCBpblwiKTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0RG93bmxvYWRFcnJvck1lc3NhZ2Uob3JpZ2luYWxFcnJvcjogc3RyaW5nKTogc3RyaW5nIHtcclxuICBpZiAob3JpZ2luYWxFcnJvci5pbmNsdWRlcyhcImludmFsaWRcIikpIHtcclxuICAgIHJldHVybiBcIkludmFsaWQgZG93bmxvYWQgZm9ybWF0XCI7XHJcbiAgfVxyXG4gIGlmIChvcmlnaW5hbEVycm9yLmluY2x1ZGVzKFwicXVvdGFcIikgfHwgb3JpZ2luYWxFcnJvci5pbmNsdWRlcyhcInNwYWNlXCIpKSB7XHJcbiAgICByZXR1cm4gXCJJbnN1ZmZpY2llbnQgc3RvcmFnZSBzcGFjZVwiO1xyXG4gIH1cclxuICBpZiAob3JpZ2luYWxFcnJvci5pbmNsdWRlcyhcImJsb2NrZWRcIikgfHwgb3JpZ2luYWxFcnJvci5pbmNsdWRlcyhcInBvbGljeVwiKSkge1xyXG4gICAgcmV0dXJuIFwiRG93bmxvYWQgYmxvY2tlZCBieSBicm93c2VyIHNldHRpbmdzXCI7XHJcbiAgfVxyXG4gIHJldHVybiBvcmlnaW5hbEVycm9yO1xyXG59XHJcblxyXG50eXBlIFJlcXVlc3RNZXNzYWdlID0gU2F2ZURhdGFSZXF1ZXN0IHwgRXhwb3J0Q3N2UmVxdWVzdCB8IEdldERhdGFSZXF1ZXN0IHwgRmV0Y2hBY3Rpdml0aWVzUmVxdWVzdCB8IEltcG9ydFNlc3Npb25SZXF1ZXN0IHwgUG9ydGFsQXV0aENoZWNrUmVxdWVzdDtcclxuXHJcbmNocm9tZS5ydW50aW1lLm9uTWVzc2FnZS5hZGRMaXN0ZW5lcigobWVzc2FnZTogUmVxdWVzdE1lc3NhZ2UsIHNlbmRlciwgc2VuZFJlc3BvbnNlKSA9PiB7XHJcbiAgaWYgKG1lc3NhZ2UudHlwZSA9PT0gXCJHRVRfREFUQVwiKSB7XHJcbiAgICBjaHJvbWUuc3RvcmFnZS5sb2NhbC5nZXQoW1NUT1JBR0VfS0VZUy5UUkFDS01BTl9EQVRBXSwgKHJlc3VsdCkgPT4ge1xyXG4gICAgICBzZW5kUmVzcG9uc2UocmVzdWx0W1NUT1JBR0VfS0VZUy5UUkFDS01BTl9EQVRBXSB8fCBudWxsKTtcclxuICAgIH0pO1xyXG4gICAgcmV0dXJuIHRydWU7XHJcbiAgfVxyXG5cclxuICBpZiAobWVzc2FnZS50eXBlID09PSBcIlNBVkVfREFUQVwiKSB7XHJcbiAgICBjb25zdCBzZXNzaW9uRGF0YSA9IChtZXNzYWdlIGFzIFNhdmVEYXRhUmVxdWVzdCkuZGF0YTtcclxuICAgIGNocm9tZS5zdG9yYWdlLmxvY2FsLnNldCh7IFtTVE9SQUdFX0tFWVMuVFJBQ0tNQU5fREFUQV06IHNlc3Npb25EYXRhIH0sICgpID0+IHtcclxuICAgICAgaWYgKGNocm9tZS5ydW50aW1lLmxhc3RFcnJvcikge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXCJUcmFja1B1bGw6IEZhaWxlZCB0byBzYXZlIGRhdGE6XCIsIGNocm9tZS5ydW50aW1lLmxhc3RFcnJvcik7XHJcbiAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBjaHJvbWUucnVudGltZS5sYXN0RXJyb3IubWVzc2FnZSB9KTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhcIlRyYWNrUHVsbDogU2Vzc2lvbiBkYXRhIHNhdmVkIHRvIHN0b3JhZ2VcIik7XHJcbiAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogdHJ1ZSB9KTtcclxuXHJcbiAgICAgICAgLy8gSGlzdG9yeSBzYXZlIC0tIGZpcmUgYW5kIGZvcmdldCwgbmV2ZXIgYmxvY2tzIHByaW1hcnkgZmxvd1xyXG4gICAgICAgIHNhdmVTZXNzaW9uVG9IaXN0b3J5KHNlc3Npb25EYXRhKS5jYXRjaCgoZXJyKSA9PiB7XHJcbiAgICAgICAgICBjb25zb2xlLmVycm9yKFwiVHJhY2tQdWxsOiBIaXN0b3J5IHNhdmUgZmFpbGVkOlwiLCBlcnIpO1xyXG4gICAgICAgICAgY29uc3QgbXNnID0gZ2V0SGlzdG9yeUVycm9yTWVzc2FnZShlcnIubWVzc2FnZSk7XHJcbiAgICAgICAgICBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZSh7IHR5cGU6IFwiSElTVE9SWV9FUlJPUlwiLCBlcnJvcjogbXNnIH0pLmNhdGNoKCgpID0+IHtcclxuICAgICAgICAgICAgLy8gUG9wdXAgbm90IG9wZW4gLS0gYWxyZWFkeSBsb2dnZWQgdG8gY29uc29sZVxyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gICAgcmV0dXJuIHRydWU7XHJcbiAgfVxyXG5cclxuICBpZiAobWVzc2FnZS50eXBlID09PSBcIkVYUE9SVF9DU1ZfUkVRVUVTVFwiKSB7XHJcbiAgICBjaHJvbWUuc3RvcmFnZS5sb2NhbC5nZXQoW1NUT1JBR0VfS0VZUy5UUkFDS01BTl9EQVRBLCBTVE9SQUdFX0tFWVMuU1BFRURfVU5JVCwgU1RPUkFHRV9LRVlTLkRJU1RBTkNFX1VOSVQsIFNUT1JBR0VfS0VZUy5ISVRUSU5HX1NVUkZBQ0UsIFNUT1JBR0VfS0VZUy5JTkNMVURFX0FWRVJBR0VTLCBcInVuaXRQcmVmZXJlbmNlXCJdLCAocmVzdWx0KSA9PiB7XHJcbiAgICAgIGNvbnN0IGRhdGEgPSByZXN1bHRbU1RPUkFHRV9LRVlTLlRSQUNLTUFOX0RBVEFdIGFzIFNlc3Npb25EYXRhIHwgdW5kZWZpbmVkO1xyXG4gICAgICBpZiAoIWRhdGEgfHwgIWRhdGEuY2x1Yl9ncm91cHMgfHwgZGF0YS5jbHViX2dyb3Vwcy5sZW5ndGggPT09IDApIHtcclxuICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFwiTm8gZGF0YSB0byBleHBvcnRcIiB9KTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgbGV0IHVuaXRDaG9pY2U6IFVuaXRDaG9pY2U7XHJcbiAgICAgICAgaWYgKHJlc3VsdFtTVE9SQUdFX0tFWVMuU1BFRURfVU5JVF0gJiYgcmVzdWx0W1NUT1JBR0VfS0VZUy5ESVNUQU5DRV9VTklUXSkge1xyXG4gICAgICAgICAgdW5pdENob2ljZSA9IHtcclxuICAgICAgICAgICAgc3BlZWQ6IHJlc3VsdFtTVE9SQUdFX0tFWVMuU1BFRURfVU5JVF0gYXMgU3BlZWRVbml0LFxyXG4gICAgICAgICAgICBkaXN0YW5jZTogcmVzdWx0W1NUT1JBR0VfS0VZUy5ESVNUQU5DRV9VTklUXSBhcyBEaXN0YW5jZVVuaXQsXHJcbiAgICAgICAgICB9O1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICB1bml0Q2hvaWNlID0gbWlncmF0ZUxlZ2FjeVByZWYocmVzdWx0W1widW5pdFByZWZlcmVuY2VcIl0gYXMgc3RyaW5nIHwgdW5kZWZpbmVkKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY29uc3Qgc3VyZmFjZSA9IChyZXN1bHRbU1RPUkFHRV9LRVlTLkhJVFRJTkdfU1VSRkFDRV0gYXMgXCJHcmFzc1wiIHwgXCJNYXRcIikgPz8gXCJNYXRcIjtcclxuICAgICAgICBjb25zdCBpbmNsdWRlQXZlcmFnZXMgPSByZXN1bHRbU1RPUkFHRV9LRVlTLklOQ0xVREVfQVZFUkFHRVNdID09PSB1bmRlZmluZWRcclxuICAgICAgICAgID8gdHJ1ZVxyXG4gICAgICAgICAgOiBCb29sZWFuKHJlc3VsdFtTVE9SQUdFX0tFWVMuSU5DTFVERV9BVkVSQUdFU10pO1xyXG4gICAgICAgIGNvbnN0IGNzdkNvbnRlbnQgPSB3cml0ZUNzdihkYXRhLCBpbmNsdWRlQXZlcmFnZXMsIHVuZGVmaW5lZCwgdW5pdENob2ljZSwgc3VyZmFjZSk7XHJcbiAgICAgICAgY29uc3QgcmF3RGF0ZSA9IGRhdGEuZGF0ZSB8fCBcInVua25vd25cIjtcclxuICAgICAgICAvLyBTYW5pdGl6ZSBkYXRlIGZvciBmaWxlbmFtZSBcdTIwMTQgcmVtb3ZlIGNvbG9ucyBhbmQgY2hhcmFjdGVycyBpbnZhbGlkIGluIGZpbGVuYW1lc1xyXG4gICAgICAgIGNvbnN0IHNhZmVEYXRlID0gcmF3RGF0ZS5yZXBsYWNlKC9bOi5dL2csIFwiLVwiKS5yZXBsYWNlKC9bL1xcXFw/JSp8XCI8Pl0vZywgXCJcIik7XHJcbiAgICAgICAgY29uc3QgZmlsZW5hbWUgPSBgU2hvdERhdGFfJHtzYWZlRGF0ZX0uY3N2YDtcclxuXHJcbiAgICAgICAgY2hyb21lLmRvd25sb2Fkcy5kb3dubG9hZChcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgdXJsOiBgZGF0YTp0ZXh0L2NzdjtjaGFyc2V0PXV0Zi04LCR7ZW5jb2RlVVJJQ29tcG9uZW50KGNzdkNvbnRlbnQpfWAsXHJcbiAgICAgICAgICAgIGZpbGVuYW1lOiBmaWxlbmFtZSxcclxuICAgICAgICAgICAgc2F2ZUFzOiBmYWxzZSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICAoZG93bmxvYWRJZCkgPT4ge1xyXG4gICAgICAgICAgICBpZiAoY2hyb21lLnJ1bnRpbWUubGFzdEVycm9yKSB7XHJcbiAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIlRyYWNrUHVsbDogRG93bmxvYWQgZmFpbGVkOlwiLCBjaHJvbWUucnVudGltZS5sYXN0RXJyb3IpO1xyXG4gICAgICAgICAgICAgIGNvbnN0IGVycm9yTWVzc2FnZSA9IGdldERvd25sb2FkRXJyb3JNZXNzYWdlKGNocm9tZS5ydW50aW1lLmxhc3RFcnJvci5tZXNzYWdlKTtcclxuICAgICAgICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yTWVzc2FnZSB9KTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgVHJhY2tQdWxsOiBDU1YgZXhwb3J0ZWQgd2l0aCBkb3dubG9hZCBJRCAke2Rvd25sb2FkSWR9YCk7XHJcbiAgICAgICAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogdHJ1ZSwgZG93bmxvYWRJZCwgZmlsZW5hbWUgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICApO1xyXG4gICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXCJUcmFja1B1bGw6IENTViBnZW5lcmF0aW9uIGZhaWxlZDpcIiwgZXJyb3IpO1xyXG4gICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpIH0pO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICAgIHJldHVybiB0cnVlO1xyXG4gIH1cclxuXHJcbiAgaWYgKG1lc3NhZ2UudHlwZSA9PT0gXCJQT1JUQUxfQVVUSF9DSEVDS1wiKSB7XHJcbiAgICAoYXN5bmMgKCkgPT4ge1xyXG4gICAgICBjb25zdCBncmFudGVkID0gYXdhaXQgaGFzUG9ydGFsUGVybWlzc2lvbigpO1xyXG4gICAgICBpZiAoIWdyYW50ZWQpIHtcclxuICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiB0cnVlLCBzdGF0dXM6IFwiZGVuaWVkXCIgfSk7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZXhlY3V0ZVF1ZXJ5PHsgbWU6IHsgX190eXBlbmFtZTogc3RyaW5nIH0gfCBudWxsIH0+KEhFQUxUSF9DSEVDS19RVUVSWSk7XHJcbiAgICAgICAgY29uc3QgYXV0aFN0YXR1cyA9IGNsYXNzaWZ5QXV0aFJlc3VsdChyZXN1bHQpO1xyXG4gICAgICAgIGlmIChhdXRoU3RhdHVzLmtpbmQgPT09IFwiZXJyb3JcIikge1xyXG4gICAgICAgICAgY29uc29sZS5lcnJvcihcIlRyYWNrUHVsbDogR3JhcGhRTCBoZWFsdGggY2hlY2sgZXJyb3I6XCIsIGF1dGhTdGF0dXMubWVzc2FnZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHNlbmRSZXNwb25zZSh7XHJcbiAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgc3RhdHVzOiBhdXRoU3RhdHVzLmtpbmQsXHJcbiAgICAgICAgICBtZXNzYWdlOiBhdXRoU3RhdHVzLmtpbmQgPT09IFwiZXJyb3JcIiA/IGF1dGhTdGF0dXMubWVzc2FnZSA6IHVuZGVmaW5lZCxcclxuICAgICAgICB9KTtcclxuICAgICAgfSBjYXRjaCAoZXJyKSB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcihcIlRyYWNrUHVsbDogR3JhcGhRTCBoZWFsdGggY2hlY2sgZmFpbGVkOlwiLCBlcnIpO1xyXG4gICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IHRydWUsIHN0YXR1czogXCJlcnJvclwiLCBtZXNzYWdlOiBcIlVuYWJsZSB0byByZWFjaCBUcmFja21hbiBcdTIwMTQgdHJ5IGFnYWluIGxhdGVyXCIgfSk7XHJcbiAgICAgIH1cclxuICAgIH0pKCk7XHJcbiAgICByZXR1cm4gdHJ1ZTtcclxuICB9XHJcblxyXG4gIGlmIChtZXNzYWdlLnR5cGUgPT09IFwiRkVUQ0hfQUNUSVZJVElFU1wiKSB7XHJcbiAgICAoYXN5bmMgKCkgPT4ge1xyXG4gICAgICBjb25zdCBncmFudGVkID0gYXdhaXQgaGFzUG9ydGFsUGVybWlzc2lvbigpO1xyXG4gICAgICBpZiAoIWdyYW50ZWQpIHtcclxuICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFwiUG9ydGFsIHBlcm1pc3Npb24gbm90IGdyYW50ZWRcIiB9KTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuICAgICAgdHJ5IHtcclxuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBleGVjdXRlUXVlcnk8e1xyXG4gICAgICAgICAgbWU6IHtcclxuICAgICAgICAgICAgYWN0aXZpdGllczogQXJyYXk8e1xyXG4gICAgICAgICAgICAgIGlkOiBzdHJpbmc7IHRpbWU6IHN0cmluZzsgc3Ryb2tlQ291bnQ/OiBudW1iZXI7IGtpbmQ/OiBzdHJpbmc7XHJcbiAgICAgICAgICAgIH0+O1xyXG4gICAgICAgICAgfTtcclxuICAgICAgICB9PihGRVRDSF9BQ1RJVklUSUVTX1FVRVJZKTtcclxuICAgICAgICBpZiAocmVzdWx0LmVycm9ycyAmJiByZXN1bHQuZXJyb3JzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgIGlmIChpc0F1dGhFcnJvcihyZXN1bHQuZXJyb3JzKSkge1xyXG4gICAgICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFwiU2Vzc2lvbiBleHBpcmVkIFx1MjAxNCBsb2cgaW50byBwb3J0YWwudHJhY2ttYW5nb2xmLmNvbVwiIH0pO1xyXG4gICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBcIlVuYWJsZSB0byBmZXRjaCBhY3Rpdml0aWVzIFx1MjAxNCB0cnkgYWdhaW4gbGF0ZXJcIiB9KTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgY29uc3QgcmF3QWN0aXZpdGllcyA9IHJlc3VsdC5kYXRhPy5tZT8uYWN0aXZpdGllcyA/PyBbXTtcclxuICAgICAgICBjb25zdCBhY3Rpdml0aWVzOiBBY3Rpdml0eVN1bW1hcnlbXSA9IHJhd0FjdGl2aXRpZXMuc2xpY2UoMCwgMjApLm1hcCgoYSkgPT4gKHtcclxuICAgICAgICAgIGlkOiBhLmlkLFxyXG4gICAgICAgICAgZGF0ZTogYS50aW1lLFxyXG4gICAgICAgICAgc3Ryb2tlQ291bnQ6IGEuc3Ryb2tlQ291bnQgPz8gbnVsbCxcclxuICAgICAgICAgIHR5cGU6IGEua2luZCA/PyBudWxsLFxyXG4gICAgICAgIH0pKTtcclxuICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiB0cnVlLCBhY3Rpdml0aWVzIH0pO1xyXG4gICAgICB9IGNhdGNoIChlcnIpIHtcclxuICAgICAgICBjb25zb2xlLmVycm9yKFwiVHJhY2tQdWxsOiBGZXRjaCBhY3Rpdml0aWVzIGZhaWxlZDpcIiwgZXJyKTtcclxuICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFwiVW5hYmxlIHRvIGZldGNoIGFjdGl2aXRpZXMgXHUyMDE0IHRyeSBhZ2FpbiBsYXRlclwiIH0pO1xyXG4gICAgICB9XHJcbiAgICB9KSgpO1xyXG4gICAgcmV0dXJuIHRydWU7XHJcbiAgfVxyXG5cclxuICBpZiAobWVzc2FnZS50eXBlID09PSBcIklNUE9SVF9TRVNTSU9OXCIpIHtcclxuICAgIGNvbnN0IHsgYWN0aXZpdHlJZCB9ID0gbWVzc2FnZSBhcyBJbXBvcnRTZXNzaW9uUmVxdWVzdDtcclxuICAgIChhc3luYyAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IGdyYW50ZWQgPSBhd2FpdCBoYXNQb3J0YWxQZXJtaXNzaW9uKCk7XHJcbiAgICAgIGlmICghZ3JhbnRlZCkge1xyXG4gICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogXCJQb3J0YWwgcGVybWlzc2lvbiBub3QgZ3JhbnRlZFwiIH0pO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG4gICAgICBhd2FpdCBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoeyBbU1RPUkFHRV9LRVlTLklNUE9SVF9TVEFUVVNdOiB7IHN0YXRlOiBcImltcG9ydGluZ1wiIH0gYXMgSW1wb3J0U3RhdHVzIH0pO1xyXG4gICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiB0cnVlIH0pO1xyXG5cclxuICAgICAgdHJ5IHtcclxuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBleGVjdXRlUXVlcnk8eyBub2RlOiBHcmFwaFFMQWN0aXZpdHkgfT4oXHJcbiAgICAgICAgICBJTVBPUlRfU0VTU0lPTl9RVUVSWSxcclxuICAgICAgICAgIHsgaWQ6IGFjdGl2aXR5SWQgfVxyXG4gICAgICAgICk7XHJcbiAgICAgICAgaWYgKHJlc3VsdC5lcnJvcnMgJiYgcmVzdWx0LmVycm9ycy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICBpZiAoaXNBdXRoRXJyb3IocmVzdWx0LmVycm9ycykpIHtcclxuICAgICAgICAgICAgYXdhaXQgY2hyb21lLnN0b3JhZ2UubG9jYWwuc2V0KHsgW1NUT1JBR0VfS0VZUy5JTVBPUlRfU1RBVFVTXTogeyBzdGF0ZTogXCJlcnJvclwiLCBtZXNzYWdlOiBcIlNlc3Npb24gZXhwaXJlZCBcdTIwMTQgbG9nIGludG8gcG9ydGFsLnRyYWNrbWFuZ29sZi5jb21cIiB9IGFzIEltcG9ydFN0YXR1cyB9KTtcclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGF3YWl0IGNocm9tZS5zdG9yYWdlLmxvY2FsLnNldCh7IFtTVE9SQUdFX0tFWVMuSU1QT1JUX1NUQVRVU106IHsgc3RhdGU6IFwiZXJyb3JcIiwgbWVzc2FnZTogXCJVbmFibGUgdG8gcmVhY2ggVHJhY2ttYW4gXHUyMDE0IHRyeSBhZ2FpbiBsYXRlclwiIH0gYXMgSW1wb3J0U3RhdHVzIH0pO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjb25zdCBhY3Rpdml0eSA9IHJlc3VsdC5kYXRhPy5ub2RlO1xyXG4gICAgICAgIGNvbnN0IHNlc3Npb24gPSBhY3Rpdml0eSA/IHBhcnNlUG9ydGFsQWN0aXZpdHkoYWN0aXZpdHkpIDogbnVsbDtcclxuICAgICAgICBpZiAoIXNlc3Npb24pIHtcclxuICAgICAgICAgIGF3YWl0IGNocm9tZS5zdG9yYWdlLmxvY2FsLnNldCh7IFtTVE9SQUdFX0tFWVMuSU1QT1JUX1NUQVRVU106IHsgc3RhdGU6IFwiZXJyb3JcIiwgbWVzc2FnZTogXCJObyBzaG90IGRhdGEgZm91bmQgZm9yIHRoaXMgYWN0aXZpdHlcIiB9IGFzIEltcG9ydFN0YXR1cyB9KTtcclxuICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgYXdhaXQgY2hyb21lLnN0b3JhZ2UubG9jYWwuc2V0KHsgW1NUT1JBR0VfS0VZUy5UUkFDS01BTl9EQVRBXTogc2Vzc2lvbiB9KTtcclxuICAgICAgICBhd2FpdCBzYXZlU2Vzc2lvblRvSGlzdG9yeShzZXNzaW9uKTtcclxuICAgICAgICBhd2FpdCBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoeyBbU1RPUkFHRV9LRVlTLklNUE9SVF9TVEFUVVNdOiB7IHN0YXRlOiBcInN1Y2Nlc3NcIiB9IGFzIEltcG9ydFN0YXR1cyB9KTtcclxuICAgICAgICBjb25zb2xlLmxvZyhcIlRyYWNrUHVsbDogU2Vzc2lvbiBpbXBvcnRlZCBzdWNjZXNzZnVsbHk6XCIsIHNlc3Npb24ucmVwb3J0X2lkKTtcclxuICAgICAgfSBjYXRjaCAoZXJyKSB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcihcIlRyYWNrUHVsbDogSW1wb3J0IGZhaWxlZDpcIiwgZXJyKTtcclxuICAgICAgICBhd2FpdCBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoeyBbU1RPUkFHRV9LRVlTLklNUE9SVF9TVEFUVVNdOiB7IHN0YXRlOiBcImVycm9yXCIsIG1lc3NhZ2U6IFwiSW1wb3J0IGZhaWxlZCBcdTIwMTQgdHJ5IGFnYWluXCIgfSBhcyBJbXBvcnRTdGF0dXMgfSk7XHJcbiAgICAgIH1cclxuICAgIH0pKCk7XHJcbiAgICByZXR1cm4gdHJ1ZTtcclxuICB9XHJcblxyXG4gIC8vIFJlY2VpdmVzIHByZS1mZXRjaGVkIEdyYXBoUUwgZGF0YSBmcm9tIHBvcHVwIChmZXRjaGVkIHZpYSBjb250ZW50IHNjcmlwdCBvbiBwb3J0YWwgcGFnZSlcclxuICBpZiAobWVzc2FnZS50eXBlID09PSBcIlNBVkVfSU1QT1JURURfU0VTU0lPTlwiKSB7XHJcbiAgICBjb25zdCB7IGdyYXBocWxEYXRhIH0gPSBtZXNzYWdlIGFzIHsgdHlwZTogc3RyaW5nOyBncmFwaHFsRGF0YTogeyBkYXRhPzogeyBub2RlPzogR3JhcGhRTEFjdGl2aXR5IH07IGVycm9ycz86IEFycmF5PHsgbWVzc2FnZTogc3RyaW5nIH0+IH07IGFjdGl2aXR5SWQ6IHN0cmluZyB9O1xyXG4gICAgKGFzeW5jICgpID0+IHtcclxuICAgICAgYXdhaXQgY2hyb21lLnN0b3JhZ2UubG9jYWwuc2V0KHsgW1NUT1JBR0VfS0VZUy5JTVBPUlRfU1RBVFVTXTogeyBzdGF0ZTogXCJpbXBvcnRpbmdcIiB9IGFzIEltcG9ydFN0YXR1cyB9KTtcclxuXHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgaWYgKGdyYXBocWxEYXRhLmVycm9ycyAmJiBncmFwaHFsRGF0YS5lcnJvcnMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgYXdhaXQgY2hyb21lLnN0b3JhZ2UubG9jYWwuc2V0KHsgW1NUT1JBR0VfS0VZUy5JTVBPUlRfU1RBVFVTXTogeyBzdGF0ZTogXCJlcnJvclwiLCBtZXNzYWdlOiBncmFwaHFsRGF0YS5lcnJvcnNbMF0ubWVzc2FnZSB9IGFzIEltcG9ydFN0YXR1cyB9KTtcclxuICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgY29uc3QgYWN0aXZpdHkgPSBncmFwaHFsRGF0YS5kYXRhPy5ub2RlO1xyXG4gICAgICAgIGNvbnN0IHNlc3Npb24gPSBhY3Rpdml0eSA/IHBhcnNlUG9ydGFsQWN0aXZpdHkoYWN0aXZpdHkpIDogbnVsbDtcclxuICAgICAgICBpZiAoIXNlc3Npb24pIHtcclxuICAgICAgICAgIGF3YWl0IGNocm9tZS5zdG9yYWdlLmxvY2FsLnNldCh7IFtTVE9SQUdFX0tFWVMuSU1QT1JUX1NUQVRVU106IHsgc3RhdGU6IFwiZXJyb3JcIiwgbWVzc2FnZTogXCJObyBzaG90IGRhdGEgZm91bmQgZm9yIHRoaXMgYWN0aXZpdHlcIiB9IGFzIEltcG9ydFN0YXR1cyB9KTtcclxuICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgYXdhaXQgY2hyb21lLnN0b3JhZ2UubG9jYWwuc2V0KHsgW1NUT1JBR0VfS0VZUy5UUkFDS01BTl9EQVRBXTogc2Vzc2lvbiB9KTtcclxuICAgICAgICBhd2FpdCBzYXZlU2Vzc2lvblRvSGlzdG9yeShzZXNzaW9uKTtcclxuICAgICAgICBhd2FpdCBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoeyBbU1RPUkFHRV9LRVlTLklNUE9SVF9TVEFUVVNdOiB7IHN0YXRlOiBcInN1Y2Nlc3NcIiB9IGFzIEltcG9ydFN0YXR1cyB9KTtcclxuICAgICAgICBjb25zb2xlLmxvZyhcIlRyYWNrUHVsbDogU2Vzc2lvbiBpbXBvcnRlZCBzdWNjZXNzZnVsbHk6XCIsIHNlc3Npb24ucmVwb3J0X2lkKTtcclxuICAgICAgfSBjYXRjaCAoZXJyKSB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcihcIlRyYWNrUHVsbDogSW1wb3J0IGZhaWxlZDpcIiwgZXJyKTtcclxuICAgICAgICBhd2FpdCBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoeyBbU1RPUkFHRV9LRVlTLklNUE9SVF9TVEFUVVNdOiB7IHN0YXRlOiBcImVycm9yXCIsIG1lc3NhZ2U6IFwiSW1wb3J0IGZhaWxlZCBcdTIwMTQgdHJ5IGFnYWluXCIgfSBhcyBJbXBvcnRTdGF0dXMgfSk7XHJcbiAgICAgIH1cclxuICAgIH0pKCk7XHJcbiAgICByZXR1cm4gdHJ1ZTtcclxuICB9XHJcbn0pO1xyXG5cclxuY2hyb21lLnN0b3JhZ2Uub25DaGFuZ2VkLmFkZExpc3RlbmVyKChjaGFuZ2VzLCBuYW1lc3BhY2UpID0+IHtcclxuICBpZiAobmFtZXNwYWNlID09PSBcImxvY2FsXCIgJiYgY2hhbmdlc1tTVE9SQUdFX0tFWVMuVFJBQ0tNQU5fREFUQV0pIHtcclxuICAgIGNvbnN0IG5ld1ZhbHVlID0gY2hhbmdlc1tTVE9SQUdFX0tFWVMuVFJBQ0tNQU5fREFUQV0ubmV3VmFsdWU7XHJcbiAgICBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZSh7IHR5cGU6IFwiREFUQV9VUERBVEVEXCIsIGRhdGE6IG5ld1ZhbHVlIH0pLmNhdGNoKCgpID0+IHtcclxuICAgICAgLy8gSWdub3JlIGVycm9ycyB3aGVuIG5vIHBvcHVwIGlzIGxpc3RlbmluZ1xyXG4gICAgfSk7XHJcbiAgfVxyXG59KTtcclxuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7OztBQUFBLE1BNEVhLHNCQWtFQTtBQTlJYjtBQUFBO0FBNEVPLE1BQU0sdUJBQStDO0FBQUEsUUFDMUQsV0FBVztBQUFBLFFBQ1gsV0FBVztBQUFBLFFBQ1gsYUFBYTtBQUFBLFFBQ2IsYUFBYTtBQUFBLFFBQ2IsVUFBVTtBQUFBLFFBQ1YsV0FBVztBQUFBLFFBQ1gsWUFBWTtB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
