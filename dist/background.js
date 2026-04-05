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
  isDeleted
  isSimulated
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL3NoYXJlZC9jb25zdGFudHMudHMiLCAiLi4vc3JjL3NoYXJlZC91bml0X25vcm1hbGl6YXRpb24udHMiLCAiLi4vc3JjL3NoYXJlZC9jc3Zfd3JpdGVyLnRzIiwgIi4uL3NyYy9zaGFyZWQvaGlzdG9yeS50cyIsICIuLi9zcmMvc2hhcmVkL3BvcnRhbFBlcm1pc3Npb25zLnRzIiwgIi4uL3NyYy9zaGFyZWQvZ3JhcGhxbF9jbGllbnQudHMiLCAiLi4vc3JjL3NoYXJlZC9wb3J0YWxfcGFyc2VyLnRzIiwgIi4uL3NyYy9zaGFyZWQvaW1wb3J0X3R5cGVzLnRzIiwgIi4uL3NyYy9iYWNrZ3JvdW5kL3NlcnZpY2VXb3JrZXIudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbIi8qKlxuICogU2hhcmVkIGNvbnN0YW50cyBpbmNsdWRpbmcgQ1NTIHNlbGVjdG9ycyBhbmQgY29uZmlndXJhdGlvbi5cbiAqIEJhc2VkIG9uIFB5dGhvbiBzY3JhcGVyIGNvbnN0YW50cy5weSBpbXBsZW1lbnRhdGlvbi5cbiAqL1xuXG4vLyBDb21wbGV0ZSBsaXN0IG9mIGFsbCBrbm93biBUcmFja21hbiBtZXRyaWNzIChVUkwgcGFyYW1ldGVyIG5hbWVzKVxuZXhwb3J0IGNvbnN0IEFMTF9NRVRSSUNTID0gW1xuICBcIkNsdWJTcGVlZFwiLFxuICBcIkJhbGxTcGVlZFwiLFxuICBcIlNtYXNoRmFjdG9yXCIsXG4gIFwiQXR0YWNrQW5nbGVcIixcbiAgXCJDbHViUGF0aFwiLFxuICBcIkZhY2VBbmdsZVwiLFxuICBcIkZhY2VUb1BhdGhcIixcbiAgXCJTd2luZ0RpcmVjdGlvblwiLFxuICBcIkR5bmFtaWNMb2Z0XCIsXG4gIFwiU3BpblJhdGVcIixcbiAgXCJTcGluQXhpc1wiLFxuICBcIlNwaW5Mb2Z0XCIsXG4gIFwiTGF1bmNoQW5nbGVcIixcbiAgXCJMYXVuY2hEaXJlY3Rpb25cIixcbiAgXCJDYXJyeVwiLFxuICBcIlRvdGFsXCIsXG4gIFwiU2lkZVwiLFxuICBcIlNpZGVUb3RhbFwiLFxuICBcIkNhcnJ5U2lkZVwiLFxuICBcIlRvdGFsU2lkZVwiLFxuICBcIkhlaWdodFwiLFxuICBcIk1heEhlaWdodFwiLFxuICBcIkN1cnZlXCIsXG4gIFwiTGFuZGluZ0FuZ2xlXCIsXG4gIFwiSGFuZ1RpbWVcIixcbiAgXCJMb3dQb2ludERpc3RhbmNlXCIsXG4gIFwiSW1wYWN0SGVpZ2h0XCIsXG4gIFwiSW1wYWN0T2Zmc2V0XCIsXG4gIFwiVGVtcG9cIixcbl0gYXMgY29uc3Q7XG5cbi8vIE1ldHJpY3Mgc3BsaXQgaW50byBncm91cHMgZm9yIG11bHRpLXBhZ2UtbG9hZCBIVE1MIGZhbGxiYWNrXG5leHBvcnQgY29uc3QgTUVUUklDX0dST1VQUyA9IFtcbiAgW1xuICAgIFwiQ2x1YlNwZWVkXCIsXG4gICAgXCJCYWxsU3BlZWRcIixcbiAgICBcIlNtYXNoRmFjdG9yXCIsXG4gICAgXCJBdHRhY2tBbmdsZVwiLFxuICAgIFwiQ2x1YlBhdGhcIixcbiAgICBcIkZhY2VBbmdsZVwiLFxuICAgIFwiRmFjZVRvUGF0aFwiLFxuICAgIFwiU3dpbmdEaXJlY3Rpb25cIixcbiAgICBcIkR5bmFtaWNMb2Z0XCIsXG4gICAgXCJTcGluTG9mdFwiLFxuICBdLFxuICBbXG4gICAgXCJTcGluUmF0ZVwiLFxuICAgIFwiU3BpbkF4aXNcIixcbiAgICBcIkxhdW5jaEFuZ2xlXCIsXG4gICAgXCJMYXVuY2hEaXJlY3Rpb25cIixcbiAgICBcIkNhcnJ5XCIsXG4gICAgXCJUb3RhbFwiLFxuICAgIFwiU2lkZVwiLFxuICAgIFwiU2lkZVRvdGFsXCIsXG4gICAgXCJDYXJyeVNpZGVcIixcbiAgICBcIlRvdGFsU2lkZVwiLFxuICAgIFwiSGVpZ2h0XCIsXG4gICAgXCJNYXhIZWlnaHRcIixcbiAgICBcIkN1cnZlXCIsXG4gICAgXCJMYW5kaW5nQW5nbGVcIixcbiAgICBcIkhhbmdUaW1lXCIsXG4gICAgXCJMb3dQb2ludERpc3RhbmNlXCIsXG4gICAgXCJJbXBhY3RIZWlnaHRcIixcbiAgICBcIkltcGFjdE9mZnNldFwiLFxuICAgIFwiVGVtcG9cIixcbiAgXSxcbl0gYXMgY29uc3Q7XG5cbi8vIERpc3BsYXkgbmFtZXM6IFVSTCBwYXJhbSBuYW1lIC0+IGh1bWFuLXJlYWRhYmxlIENTViBoZWFkZXJcbmV4cG9ydCBjb25zdCBNRVRSSUNfRElTUExBWV9OQU1FUzogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcbiAgQ2x1YlNwZWVkOiBcIkNsdWIgU3BlZWRcIixcbiAgQmFsbFNwZWVkOiBcIkJhbGwgU3BlZWRcIixcbiAgU21hc2hGYWN0b3I6IFwiU21hc2ggRmFjdG9yXCIsXG4gIEF0dGFja0FuZ2xlOiBcIkF0dGFjayBBbmdsZVwiLFxuICBDbHViUGF0aDogXCJDbHViIFBhdGhcIixcbiAgRmFjZUFuZ2xlOiBcIkZhY2UgQW5nbGVcIixcbiAgRmFjZVRvUGF0aDogXCJGYWNlIFRvIFBhdGhcIixcbiAgU3dpbmdEaXJlY3Rpb246IFwiU3dpbmcgRGlyZWN0aW9uXCIsXG4gIER5bmFtaWNMb2Z0OiBcIkR5bmFtaWMgTG9mdFwiLFxuICBTcGluUmF0ZTogXCJTcGluIFJhdGVcIixcbiAgU3BpbkF4aXM6IFwiU3BpbiBBeGlzXCIsXG4gIFNwaW5Mb2Z0OiBcIlNwaW4gTG9mdFwiLFxuICBMYXVuY2hBbmdsZTogXCJMYXVuY2ggQW5nbGVcIixcbiAgTGF1bmNoRGlyZWN0aW9uOiBcIkxhdW5jaCBEaXJlY3Rpb25cIixcbiAgQ2Fycnk6IFwiQ2FycnlcIixcbiAgVG90YWw6IFwiVG90YWxcIixcbiAgU2lkZTogXCJTaWRlXCIsXG4gIFNpZGVUb3RhbDogXCJTaWRlIFRvdGFsXCIsXG4gIENhcnJ5U2lkZTogXCJDYXJyeSBTaWRlXCIsXG4gIFRvdGFsU2lkZTogXCJUb3RhbCBTaWRlXCIsXG4gIEhlaWdodDogXCJIZWlnaHRcIixcbiAgTWF4SGVpZ2h0OiBcIk1heCBIZWlnaHRcIixcbiAgQ3VydmU6IFwiQ3VydmVcIixcbiAgTGFuZGluZ0FuZ2xlOiBcIkxhbmRpbmcgQW5nbGVcIixcbiAgSGFuZ1RpbWU6IFwiSGFuZyBUaW1lXCIsXG4gIExvd1BvaW50RGlzdGFuY2U6IFwiTG93IFBvaW50XCIsXG4gIEltcGFjdEhlaWdodDogXCJJbXBhY3QgSGVpZ2h0XCIsXG4gIEltcGFjdE9mZnNldDogXCJJbXBhY3QgT2Zmc2V0XCIsXG4gIFRlbXBvOiBcIlRlbXBvXCIsXG59O1xuXG4vLyBDU1MgY2xhc3Mgc2VsZWN0b3JzIChmcm9tIFRyYWNrbWFuJ3MgcmVuZGVyZWQgSFRNTClcbmV4cG9ydCBjb25zdCBDU1NfREFURSA9IFwiZGF0ZVwiO1xuZXhwb3J0IGNvbnN0IENTU19SRVNVTFRTX1dSQVBQRVIgPSBcInBsYXllci1hbmQtcmVzdWx0cy10YWJsZS13cmFwcGVyXCI7XG5leHBvcnQgY29uc3QgQ1NTX1JFU1VMVFNfVEFCTEUgPSBcIlJlc3VsdHNUYWJsZVwiO1xuZXhwb3J0IGNvbnN0IENTU19DTFVCX1RBRyA9IFwiZ3JvdXAtdGFnXCI7XG5leHBvcnQgY29uc3QgQ1NTX1BBUkFNX05BTUVTX1JPVyA9IFwicGFyYW1ldGVyLW5hbWVzLXJvd1wiO1xuZXhwb3J0IGNvbnN0IENTU19QQVJBTV9OQU1FID0gXCJwYXJhbWV0ZXItbmFtZVwiO1xuZXhwb3J0IGNvbnN0IENTU19TSE9UX0RFVEFJTF9ST1cgPSBcInJvdy13aXRoLXNob3QtZGV0YWlsc1wiO1xuZXhwb3J0IGNvbnN0IENTU19BVkVSQUdFX1ZBTFVFUyA9IFwiYXZlcmFnZS12YWx1ZXNcIjtcbmV4cG9ydCBjb25zdCBDU1NfQ09OU0lTVEVOQ1lfVkFMVUVTID0gXCJjb25zaXN0ZW5jeS12YWx1ZXNcIjtcblxuLy8gQVBJIFVSTCBwYXR0ZXJucyB0aGF0IGxpa2VseSBpbmRpY2F0ZSBhbiBBUEkgZGF0YSByZXNwb25zZVxuZXhwb3J0IGNvbnN0IEFQSV9VUkxfUEFUVEVSTlMgPSBbXG4gIFwiYXBpLnRyYWNrbWFuZ29sZi5jb21cIixcbiAgXCJ0cmFja21hbmdvbGYuY29tL2FwaVwiLFxuICBcIi9hcGkvXCIsXG4gIFwiL3JlcG9ydHMvXCIsXG4gIFwiL2FjdGl2aXRpZXMvXCIsXG4gIFwiL3Nob3RzL1wiLFxuICBcImdyYXBocWxcIixcbl07XG5cbi8vIFRpbWVvdXRzIChtaWxsaXNlY29uZHMpXG5leHBvcnQgY29uc3QgUEFHRV9MT0FEX1RJTUVPVVQgPSAzMF8wMDA7XG5leHBvcnQgY29uc3QgREFUQV9MT0FEX1RJTUVPVVQgPSAxNV8wMDA7XG5cbi8vIFRyYWNrbWFuIGJhc2UgVVJMXG5leHBvcnQgY29uc3QgQkFTRV9VUkwgPSBcImh0dHBzOi8vd2ViLWR5bmFtaWMtcmVwb3J0cy50cmFja21hbmdvbGYuY29tL1wiO1xuXG4vLyBDdXN0b20gcHJvbXB0IHN0b3JhZ2Uga2V5c1xuZXhwb3J0IGNvbnN0IENVU1RPTV9QUk9NUFRfS0VZX1BSRUZJWCA9IFwiY3VzdG9tUHJvbXB0X1wiIGFzIGNvbnN0O1xuZXhwb3J0IGNvbnN0IENVU1RPTV9QUk9NUFRfSURTX0tFWSA9IFwiY3VzdG9tUHJvbXB0SWRzXCIgYXMgY29uc3Q7XG5cbi8vIFN0b3JhZ2Uga2V5cyBmb3IgQ2hyb21lIGV4dGVuc2lvbiAoYWxpZ25lZCBiZXR3ZWVuIGJhY2tncm91bmQgYW5kIHBvcHVwKVxuZXhwb3J0IGNvbnN0IFNUT1JBR0VfS0VZUyA9IHtcbiAgVFJBQ0tNQU5fREFUQTogXCJ0cmFja21hbkRhdGFcIixcbiAgU1BFRURfVU5JVDogXCJzcGVlZFVuaXRcIixcbiAgRElTVEFOQ0VfVU5JVDogXCJkaXN0YW5jZVVuaXRcIixcbiAgU0VMRUNURURfUFJPTVBUX0lEOiBcInNlbGVjdGVkUHJvbXB0SWRcIixcbiAgQUlfU0VSVklDRTogXCJhaVNlcnZpY2VcIixcbiAgSElUVElOR19TVVJGQUNFOiBcImhpdHRpbmdTdXJmYWNlXCIsXG4gIElOQ0xVREVfQVZFUkFHRVM6IFwiaW5jbHVkZUF2ZXJhZ2VzXCIsXG4gIFNFU1NJT05fSElTVE9SWTogXCJzZXNzaW9uSGlzdG9yeVwiLFxuICBJTVBPUlRfU1RBVFVTOiBcImltcG9ydFN0YXR1c1wiLFxufSBhcyBjb25zdDtcbiIsICIvKipcbiAqIFVuaXQgbm9ybWFsaXphdGlvbiB1dGlsaXRpZXMgZm9yIFRyYWNrbWFuIG1lYXN1cmVtZW50cy5cbiAqIFxuICogVHJhY2ttYW4gdXNlcyBuZF8qIHBhcmFtZXRlcnMgdG8gc3BlY2lmeSB1bml0czpcbiAqIC0gbmRfMDAxLCBuZF8wMDIsIGV0Yy4gZGVmaW5lIHVuaXQgc3lzdGVtcyBmb3IgZGlmZmVyZW50IG1lYXN1cmVtZW50IGdyb3Vwc1xuICogLSBDb21tb24gdmFsdWVzOiA3ODkwMTIgPSB5YXJkcy9kZWdyZWVzLCA3ODkwMTMgPSBtZXRlcnMvcmFkaWFuc1xuICovXG5cbmV4cG9ydCB0eXBlIFVuaXRTeXN0ZW1JZCA9IFwiNzg5MDEyXCIgfCBcIjc4OTAxM1wiIHwgXCI3ODkwMTRcIiB8IHN0cmluZztcblxuZXhwb3J0IHR5cGUgU3BlZWRVbml0ID0gXCJtcGhcIiB8IFwibS9zXCI7XG5leHBvcnQgdHlwZSBEaXN0YW5jZVVuaXQgPSBcInlhcmRzXCIgfCBcIm1ldGVyc1wiO1xuZXhwb3J0IHR5cGUgU21hbGxEaXN0YW5jZVVuaXQgPSBcImluY2hlc1wiIHwgXCJjbVwiO1xuZXhwb3J0IGludGVyZmFjZSBVbml0Q2hvaWNlIHsgc3BlZWQ6IFNwZWVkVW5pdDsgZGlzdGFuY2U6IERpc3RhbmNlVW5pdCB9XG5leHBvcnQgY29uc3QgREVGQVVMVF9VTklUX0NIT0lDRTogVW5pdENob2ljZSA9IHsgc3BlZWQ6IFwibXBoXCIsIGRpc3RhbmNlOiBcInlhcmRzXCIgfTtcblxuLyoqXG4gKiBUcmFja21hbiB1bml0IHN5c3RlbSBkZWZpbml0aW9ucy5cbiAqIE1hcHMgbmRfKiBwYXJhbWV0ZXIgdmFsdWVzIHRvIGFjdHVhbCB1bml0cyBmb3IgZWFjaCBtZXRyaWMuXG4gKi9cbmV4cG9ydCBjb25zdCBVTklUX1NZU1RFTVM6IFJlY29yZDxVbml0U3lzdGVtSWQsIFVuaXRTeXN0ZW0+ID0ge1xuICAvLyBJbXBlcmlhbCAoeWFyZHMsIGRlZ3JlZXMpIC0gbW9zdCBjb21tb25cbiAgXCI3ODkwMTJcIjoge1xuICAgIGlkOiBcIjc4OTAxMlwiLFxuICAgIG5hbWU6IFwiSW1wZXJpYWxcIixcbiAgICBkaXN0YW5jZVVuaXQ6IFwieWFyZHNcIixcbiAgICBhbmdsZVVuaXQ6IFwiZGVncmVlc1wiLFxuICAgIHNwZWVkVW5pdDogXCJtcGhcIixcbiAgfSxcbiAgLy8gTWV0cmljIChtZXRlcnMsIHJhZGlhbnMpXG4gIFwiNzg5MDEzXCI6IHtcbiAgICBpZDogXCI3ODkwMTNcIixcbiAgICBuYW1lOiBcIk1ldHJpYyAocmFkKVwiLFxuICAgIGRpc3RhbmNlVW5pdDogXCJtZXRlcnNcIixcbiAgICBhbmdsZVVuaXQ6IFwicmFkaWFuc1wiLFxuICAgIHNwZWVkVW5pdDogXCJrbS9oXCIsXG4gIH0sXG4gIC8vIE1ldHJpYyAobWV0ZXJzLCBkZWdyZWVzKSAtIGxlc3MgY29tbW9uXG4gIFwiNzg5MDE0XCI6IHtcbiAgICBpZDogXCI3ODkwMTRcIixcbiAgICBuYW1lOiBcIk1ldHJpYyAoZGVnKVwiLFxuICAgIGRpc3RhbmNlVW5pdDogXCJtZXRlcnNcIixcbiAgICBhbmdsZVVuaXQ6IFwiZGVncmVlc1wiLFxuICAgIHNwZWVkVW5pdDogXCJrbS9oXCIsXG4gIH0sXG59O1xuXG4vKipcbiAqIFVuaXQgc3lzdGVtIGNvbmZpZ3VyYXRpb24uXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVW5pdFN5c3RlbSB7XG4gIGlkOiBVbml0U3lzdGVtSWQ7XG4gIG5hbWU6IHN0cmluZztcbiAgZGlzdGFuY2VVbml0OiBcInlhcmRzXCIgfCBcIm1ldGVyc1wiO1xuICBhbmdsZVVuaXQ6IFwiZGVncmVlc1wiIHwgXCJyYWRpYW5zXCI7XG4gIHNwZWVkVW5pdDogXCJtcGhcIiB8IFwia20vaFwiIHwgXCJtL3NcIjtcbn1cblxuLyoqXG4gKiBNZXRyaWNzIHRoYXQgdXNlIGRpc3RhbmNlIHVuaXRzLlxuICovXG5leHBvcnQgY29uc3QgRElTVEFOQ0VfTUVUUklDUyA9IG5ldyBTZXQoW1xuICBcIkNhcnJ5XCIsXG4gIFwiVG90YWxcIixcbiAgXCJTaWRlXCIsXG4gIFwiU2lkZVRvdGFsXCIsXG4gIFwiQ2FycnlTaWRlXCIsXG4gIFwiVG90YWxTaWRlXCIsXG4gIFwiSGVpZ2h0XCIsXG4gIFwiTWF4SGVpZ2h0XCIsXG4gIFwiQ3VydmVcIixcbl0pO1xuXG4vKipcbiAqIE1ldHJpY3MgdGhhdCB1c2Ugc21hbGwgZGlzdGFuY2UgdW5pdHMgKGluY2hlcy9jbSkuXG4gKiBUaGVzZSB2YWx1ZXMgY29tZSBmcm9tIHRoZSBBUEkgaW4gbWV0ZXJzIGJ1dCBhcmUgdG9vIHNtYWxsIGZvciB5YXJkcy9tZXRlcnMuXG4gKi9cbmV4cG9ydCBjb25zdCBTTUFMTF9ESVNUQU5DRV9NRVRSSUNTID0gbmV3IFNldChbXG4gIFwiTG93UG9pbnREaXN0YW5jZVwiLFxuXSk7XG5cbi8qKlxuICogVHJhY2ttYW4gaW1wYWN0IGxvY2F0aW9uIG1ldHJpY3MgYXJlIGFsd2F5cyBkaXNwbGF5ZWQgaW4gbWlsbGltZXRlcnMuXG4gKiBUaGUgQVBJIHJldHVybnMgdGhlc2UgdmFsdWVzIGluIG1ldGVycy5cbiAqL1xuZXhwb3J0IGNvbnN0IE1JTExJTUVURVJfTUVUUklDUyA9IG5ldyBTZXQoW1xuICBcIkltcGFjdEhlaWdodFwiLFxuICBcIkltcGFjdE9mZnNldFwiLFxuXSk7XG5cbi8qKlxuICogTWV0cmljcyB0aGF0IHVzZSBhbmdsZSB1bml0cy5cbiAqL1xuZXhwb3J0IGNvbnN0IEFOR0xFX01FVFJJQ1MgPSBuZXcgU2V0KFtcbiAgXCJBdHRhY2tBbmdsZVwiLFxuICBcIkNsdWJQYXRoXCIsXG4gIFwiRmFjZUFuZ2xlXCIsXG4gIFwiRmFjZVRvUGF0aFwiLFxuICBcIkR5bmFtaWNMb2Z0XCIsXG4gIFwiTGF1bmNoQW5nbGVcIixcbiAgXCJMYXVuY2hEaXJlY3Rpb25cIixcbiAgXCJMYW5kaW5nQW5nbGVcIixcbl0pO1xuXG4vKipcbiAqIE1ldHJpY3MgdGhhdCB1c2Ugc3BlZWQgdW5pdHMuXG4gKi9cbmV4cG9ydCBjb25zdCBTUEVFRF9NRVRSSUNTID0gbmV3IFNldChbXG4gIFwiQ2x1YlNwZWVkXCIsXG4gIFwiQmFsbFNwZWVkXCIsXG5dKTtcblxuLyoqXG4gKiBEZWZhdWx0IHVuaXQgc3lzdGVtIChJbXBlcmlhbCAtIHlhcmRzL2RlZ3JlZXMpLlxuICovXG5leHBvcnQgY29uc3QgREVGQVVMVF9VTklUX1NZU1RFTTogVW5pdFN5c3RlbSA9IFVOSVRfU1lTVEVNU1tcIjc4OTAxMlwiXTtcblxuLyoqXG4gKiBTcGVlZCB1bml0IGRpc3BsYXkgbGFiZWxzIGZvciBDU1YgaGVhZGVycy5cbiAqL1xuZXhwb3J0IGNvbnN0IFNQRUVEX0xBQkVMUzogUmVjb3JkPFNwZWVkVW5pdCwgc3RyaW5nPiA9IHtcbiAgXCJtcGhcIjogXCJtcGhcIixcbiAgXCJtL3NcIjogXCJtL3NcIixcbn07XG5cbi8qKlxuICogRGlzdGFuY2UgdW5pdCBkaXNwbGF5IGxhYmVscyBmb3IgQ1NWIGhlYWRlcnMuXG4gKi9cbmV4cG9ydCBjb25zdCBESVNUQU5DRV9MQUJFTFM6IFJlY29yZDxEaXN0YW5jZVVuaXQsIHN0cmluZz4gPSB7XG4gIFwieWFyZHNcIjogXCJ5ZHNcIixcbiAgXCJtZXRlcnNcIjogXCJtXCIsXG59O1xuXG4vKipcbiAqIFNtYWxsIGRpc3RhbmNlIHVuaXQgZGlzcGxheSBsYWJlbHMgZm9yIENTViBoZWFkZXJzLlxuICovXG5leHBvcnQgY29uc3QgU01BTExfRElTVEFOQ0VfTEFCRUxTOiBSZWNvcmQ8U21hbGxEaXN0YW5jZVVuaXQsIHN0cmluZz4gPSB7XG4gIFwiaW5jaGVzXCI6IFwiaW5cIixcbiAgXCJjbVwiOiBcImNtXCIsXG59O1xuXG4vKipcbiAqIE1pZ3JhdGUgYSBsZWdhY3kgdW5pdFByZWZlcmVuY2Ugc3RyaW5nIHRvIGEgVW5pdENob2ljZSBvYmplY3QuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtaWdyYXRlTGVnYWN5UHJlZihzdG9yZWQ6IHN0cmluZyB8IHVuZGVmaW5lZCk6IFVuaXRDaG9pY2Uge1xuICBzd2l0Y2ggKHN0b3JlZCkge1xuICAgIGNhc2UgXCJtZXRyaWNcIjpcbiAgICAgIHJldHVybiB7IHNwZWVkOiBcIm0vc1wiLCBkaXN0YW5jZTogXCJtZXRlcnNcIiB9O1xuICAgIGNhc2UgXCJoeWJyaWRcIjpcbiAgICAgIHJldHVybiB7IHNwZWVkOiBcIm1waFwiLCBkaXN0YW5jZTogXCJtZXRlcnNcIiB9O1xuICAgIGNhc2UgXCJpbXBlcmlhbFwiOlxuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4geyBzcGVlZDogXCJtcGhcIiwgZGlzdGFuY2U6IFwieWFyZHNcIiB9O1xuICB9XG59XG5cbi8qKlxuICogRml4ZWQgdW5pdCBsYWJlbHMgZm9yIG1ldHJpY3Mgd2hvc2UgdW5pdHMgZG9uJ3QgdmFyeSBieSBwcmVmZXJlbmNlLlxuICovXG5leHBvcnQgY29uc3QgRklYRURfVU5JVF9MQUJFTFM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XG4gIFNwaW5SYXRlOiBcInJwbVwiLFxuICBIYW5nVGltZTogXCJzXCIsXG4gIFRlbXBvOiBcInNcIixcbiAgSW1wYWN0SGVpZ2h0OiBcIm1tXCIsXG4gIEltcGFjdE9mZnNldDogXCJtbVwiLFxufTtcblxuLyoqXG4gKiBFeHRyYWN0IG5kXyogcGFyYW1ldGVycyBmcm9tIG1ldGFkYXRhX3BhcmFtcy5cbiAqIFxuICogQHBhcmFtIG1ldGFkYXRhUGFyYW1zIC0gVGhlIG1ldGFkYXRhX3BhcmFtcyBvYmplY3QgZnJvbSBTZXNzaW9uRGF0YVxuICogQHJldHVybnMgT2JqZWN0IG1hcHBpbmcgbWV0cmljIGdyb3VwIElEcyB0byB1bml0IHN5c3RlbSBJRHNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV4dHJhY3RVbml0UGFyYW1zKFxuICBtZXRhZGF0YVBhcmFtczogUmVjb3JkPHN0cmluZywgc3RyaW5nPlxuKTogUmVjb3JkPHN0cmluZywgVW5pdFN5c3RlbUlkPiB7XG4gIGNvbnN0IHJlc3VsdDogUmVjb3JkPHN0cmluZywgVW5pdFN5c3RlbUlkPiA9IHt9O1xuXG4gIGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKG1ldGFkYXRhUGFyYW1zKSkge1xuICAgIGNvbnN0IG1hdGNoID0ga2V5Lm1hdGNoKC9ebmRfKFthLXowLTldKykkL2kpO1xuICAgIGlmIChtYXRjaCkge1xuICAgICAgY29uc3QgZ3JvdXBLZXkgPSBtYXRjaFsxXS50b0xvd2VyQ2FzZSgpO1xuICAgICAgcmVzdWx0W2dyb3VwS2V5XSA9IHZhbHVlIGFzIFVuaXRTeXN0ZW1JZDtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufVxuXG4vKipcbiAqIERldGVybWluZSB0aGUgdW5pdCBzeXN0ZW0gSUQgZnJvbSBtZXRhZGF0YSBwYXJhbXMuXG4gKiBVc2VzIG5kXzAwMSBhcyBwcmltYXJ5LCBmYWxscyBiYWNrIHRvIGRlZmF1bHQuXG4gKiBcbiAqIEBwYXJhbSBtZXRhZGF0YVBhcmFtcyAtIFRoZSBtZXRhZGF0YV9wYXJhbXMgb2JqZWN0XG4gKiBAcmV0dXJucyBUaGUgdW5pdCBzeXN0ZW0gSUQgc3RyaW5nXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRVbml0U3lzdGVtSWQoXG4gIG1ldGFkYXRhUGFyYW1zOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+XG4pOiBVbml0U3lzdGVtSWQge1xuICBjb25zdCB1bml0UGFyYW1zID0gZXh0cmFjdFVuaXRQYXJhbXMobWV0YWRhdGFQYXJhbXMpO1xuICByZXR1cm4gdW5pdFBhcmFtc1tcIjAwMVwiXSB8fCBcIjc4OTAxMlwiOyAvLyBEZWZhdWx0IHRvIEltcGVyaWFsXG59XG5cbi8qKlxuICogR2V0IHRoZSBmdWxsIHVuaXQgc3lzdGVtIGNvbmZpZ3VyYXRpb24uXG4gKiBcbiAqIEBwYXJhbSBtZXRhZGF0YVBhcmFtcyAtIFRoZSBtZXRhZGF0YV9wYXJhbXMgb2JqZWN0XG4gKiBAcmV0dXJucyBUaGUgVW5pdFN5c3RlbSBjb25maWd1cmF0aW9uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRVbml0U3lzdGVtKFxuICBtZXRhZGF0YVBhcmFtczogUmVjb3JkPHN0cmluZywgc3RyaW5nPlxuKTogVW5pdFN5c3RlbSB7XG4gIGNvbnN0IGlkID0gZ2V0VW5pdFN5c3RlbUlkKG1ldGFkYXRhUGFyYW1zKTtcbiAgcmV0dXJuIFVOSVRfU1lTVEVNU1tpZF0gfHwgREVGQVVMVF9VTklUX1NZU1RFTTtcbn1cblxuLyoqXG4gKiBHZXQgdGhlIHVuaXQgc3lzdGVtIHJlcHJlc2VudGluZyB3aGF0IHRoZSBBUEkgYWN0dWFsbHkgcmV0dXJucy5cbiAqIFRoZSBBUEkgYWx3YXlzIHJldHVybnMgc3BlZWQgaW4gbS9zIGFuZCBkaXN0YW5jZSBpbiBtZXRlcnMsXG4gKiBidXQgdGhlIGFuZ2xlIHVuaXQgZGVwZW5kcyBvbiB0aGUgcmVwb3J0J3MgbmRfMDAxIHBhcmFtZXRlci5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEFwaVNvdXJjZVVuaXRTeXN0ZW0oXG4gIG1ldGFkYXRhUGFyYW1zOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+XG4pOiBVbml0U3lzdGVtIHtcbiAgY29uc3QgcmVwb3J0U3lzdGVtID0gZ2V0VW5pdFN5c3RlbShtZXRhZGF0YVBhcmFtcyk7XG4gIHJldHVybiB7XG4gICAgaWQ6IFwiYXBpXCIgYXMgVW5pdFN5c3RlbUlkLFxuICAgIG5hbWU6IFwiQVBJIFNvdXJjZVwiLFxuICAgIGRpc3RhbmNlVW5pdDogXCJtZXRlcnNcIixcbiAgICBhbmdsZVVuaXQ6IHJlcG9ydFN5c3RlbS5hbmdsZVVuaXQsXG4gICAgc3BlZWRVbml0OiBcIm0vc1wiLFxuICB9O1xufVxuXG4vKipcbiAqIEdldCB0aGUgdW5pdCBsYWJlbCBmb3IgYSBtZXRyaWMgYmFzZWQgb24gdXNlcidzIHVuaXQgY2hvaWNlLlxuICogUmV0dXJucyBlbXB0eSBzdHJpbmcgZm9yIGRpbWVuc2lvbmxlc3MgbWV0cmljcyAoZS5nLiBTbWFzaEZhY3RvciwgU3BpblJhdGUpLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0TWV0cmljVW5pdExhYmVsKFxuICBtZXRyaWNOYW1lOiBzdHJpbmcsXG4gIHVuaXRDaG9pY2U6IFVuaXRDaG9pY2UgPSBERUZBVUxUX1VOSVRfQ0hPSUNFXG4pOiBzdHJpbmcge1xuICBpZiAobWV0cmljTmFtZSBpbiBGSVhFRF9VTklUX0xBQkVMUykgcmV0dXJuIEZJWEVEX1VOSVRfTEFCRUxTW21ldHJpY05hbWVdO1xuICBpZiAoU1BFRURfTUVUUklDUy5oYXMobWV0cmljTmFtZSkpIHJldHVybiBTUEVFRF9MQUJFTFNbdW5pdENob2ljZS5zcGVlZF07XG4gIGlmIChTTUFMTF9ESVNUQU5DRV9NRVRSSUNTLmhhcyhtZXRyaWNOYW1lKSkgcmV0dXJuIFNNQUxMX0RJU1RBTkNFX0xBQkVMU1tnZXRTbWFsbERpc3RhbmNlVW5pdCh1bml0Q2hvaWNlKV07XG4gIGlmIChESVNUQU5DRV9NRVRSSUNTLmhhcyhtZXRyaWNOYW1lKSkgcmV0dXJuIERJU1RBTkNFX0xBQkVMU1t1bml0Q2hvaWNlLmRpc3RhbmNlXTtcbiAgaWYgKEFOR0xFX01FVFJJQ1MuaGFzKG1ldHJpY05hbWUpKSByZXR1cm4gXCJcdTAwQjBcIjtcbiAgcmV0dXJuIFwiXCI7XG59XG5cbi8qKlxuICogQ29udmVydCBhIGRpc3RhbmNlIHZhbHVlIGJldHdlZW4gdW5pdHMuXG4gKiBcbiAqIEBwYXJhbSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byBjb252ZXJ0XG4gKiBAcGFyYW0gZnJvbVVuaXQgLSBTb3VyY2UgdW5pdCAoXCJ5YXJkc1wiIG9yIFwibWV0ZXJzXCIpXG4gKiBAcGFyYW0gdG9Vbml0IC0gVGFyZ2V0IHVuaXQgKFwieWFyZHNcIiBvciBcIm1ldGVyc1wiKVxuICogQHJldHVybnMgQ29udmVydGVkIHZhbHVlLCBvciBvcmlnaW5hbCBpZiB1bml0cyBtYXRjaFxuICovXG5leHBvcnQgZnVuY3Rpb24gY29udmVydERpc3RhbmNlKFxuICB2YWx1ZTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbCxcbiAgZnJvbVVuaXQ6IFwieWFyZHNcIiB8IFwibWV0ZXJzXCIsXG4gIHRvVW5pdDogXCJ5YXJkc1wiIHwgXCJtZXRlcnNcIlxuKTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbCB7XG4gIGlmICh2YWx1ZSA9PT0gbnVsbCB8fCB2YWx1ZSA9PT0gXCJcIikgcmV0dXJuIHZhbHVlO1xuXG4gIGNvbnN0IG51bVZhbHVlID0gdHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiID8gcGFyc2VGbG9hdCh2YWx1ZSkgOiB2YWx1ZTtcbiAgaWYgKGlzTmFOKG51bVZhbHVlKSkgcmV0dXJuIHZhbHVlO1xuXG4gIGlmIChmcm9tVW5pdCA9PT0gdG9Vbml0KSByZXR1cm4gbnVtVmFsdWU7XG5cbiAgLy8gQ29udmVydCB0byBtZXRlcnMgZmlyc3QsIHRoZW4gdG8gdGFyZ2V0IHVuaXRcbiAgY29uc3QgaW5NZXRlcnMgPSBmcm9tVW5pdCA9PT0gXCJ5YXJkc1wiID8gbnVtVmFsdWUgKiAwLjkxNDQgOiBudW1WYWx1ZTtcbiAgcmV0dXJuIHRvVW5pdCA9PT0gXCJ5YXJkc1wiID8gaW5NZXRlcnMgLyAwLjkxNDQgOiBpbk1ldGVycztcbn1cblxuLyoqXG4gKiBDb252ZXJ0IGFuIGFuZ2xlIHZhbHVlIGJldHdlZW4gdW5pdHMuXG4gKiBcbiAqIEBwYXJhbSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byBjb252ZXJ0XG4gKiBAcGFyYW0gZnJvbVVuaXQgLSBTb3VyY2UgdW5pdCAoXCJkZWdyZWVzXCIgb3IgXCJyYWRpYW5zXCIpXG4gKiBAcGFyYW0gdG9Vbml0IC0gVGFyZ2V0IHVuaXQgKFwiZGVncmVlc1wiIG9yIFwicmFkaWFuc1wiKVxuICogQHJldHVybnMgQ29udmVydGVkIHZhbHVlLCBvciBvcmlnaW5hbCBpZiB1bml0cyBtYXRjaFxuICovXG5leHBvcnQgZnVuY3Rpb24gY29udmVydEFuZ2xlKFxuICB2YWx1ZTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbCxcbiAgZnJvbVVuaXQ6IFwiZGVncmVlc1wiIHwgXCJyYWRpYW5zXCIsXG4gIHRvVW5pdDogXCJkZWdyZWVzXCIgfCBcInJhZGlhbnNcIlxuKTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbCB7XG4gIGlmICh2YWx1ZSA9PT0gbnVsbCB8fCB2YWx1ZSA9PT0gXCJcIikgcmV0dXJuIHZhbHVlO1xuXG4gIGNvbnN0IG51bVZhbHVlID0gdHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiID8gcGFyc2VGbG9hdCh2YWx1ZSkgOiB2YWx1ZTtcbiAgaWYgKGlzTmFOKG51bVZhbHVlKSkgcmV0dXJuIHZhbHVlO1xuXG4gIGlmIChmcm9tVW5pdCA9PT0gdG9Vbml0KSByZXR1cm4gbnVtVmFsdWU7XG5cbiAgLy8gQ29udmVydCB0byBkZWdyZWVzIGZpcnN0LCB0aGVuIHRvIHRhcmdldCB1bml0XG4gIGNvbnN0IGluRGVncmVlcyA9IGZyb21Vbml0ID09PSBcImRlZ3JlZXNcIiA/IG51bVZhbHVlIDogKG51bVZhbHVlICogMTgwIC8gTWF0aC5QSSk7XG4gIHJldHVybiB0b1VuaXQgPT09IFwiZGVncmVlc1wiID8gaW5EZWdyZWVzIDogKGluRGVncmVlcyAqIE1hdGguUEkgLyAxODApO1xufVxuXG4vKipcbiAqIENvbnZlcnQgYSBzcGVlZCB2YWx1ZSBiZXR3ZWVuIHVuaXRzLlxuICpcbiAqIEBwYXJhbSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byBjb252ZXJ0XG4gKiBAcGFyYW0gZnJvbVVuaXQgLSBTb3VyY2UgdW5pdCAoXCJtcGhcIiwgXCJrbS9oXCIsIG9yIFwibS9zXCIpXG4gKiBAcGFyYW0gdG9Vbml0IC0gVGFyZ2V0IHVuaXQgKFwibXBoXCIsIFwia20vaFwiLCBvciBcIm0vc1wiKVxuICogQHJldHVybnMgQ29udmVydGVkIHZhbHVlLCBvciBvcmlnaW5hbCBpZiB1bml0cyBtYXRjaFxuICovXG5leHBvcnQgZnVuY3Rpb24gY29udmVydFNwZWVkKFxuICB2YWx1ZTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbCxcbiAgZnJvbVVuaXQ6IFwibXBoXCIgfCBcImttL2hcIiB8IFwibS9zXCIsXG4gIHRvVW5pdDogXCJtcGhcIiB8IFwia20vaFwiIHwgXCJtL3NcIlxuKTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbCB7XG4gIGlmICh2YWx1ZSA9PT0gbnVsbCB8fCB2YWx1ZSA9PT0gXCJcIikgcmV0dXJuIHZhbHVlO1xuXG4gIGNvbnN0IG51bVZhbHVlID0gdHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiID8gcGFyc2VGbG9hdCh2YWx1ZSkgOiB2YWx1ZTtcbiAgaWYgKGlzTmFOKG51bVZhbHVlKSkgcmV0dXJuIHZhbHVlO1xuXG4gIGlmIChmcm9tVW5pdCA9PT0gdG9Vbml0KSByZXR1cm4gbnVtVmFsdWU7XG5cbiAgLy8gQ29udmVydCB0byBtcGggZmlyc3QsIHRoZW4gdG8gdGFyZ2V0IHVuaXRcbiAgbGV0IGluTXBoOiBudW1iZXI7XG4gIGlmIChmcm9tVW5pdCA9PT0gXCJtcGhcIikgaW5NcGggPSBudW1WYWx1ZTtcbiAgZWxzZSBpZiAoZnJvbVVuaXQgPT09IFwia20vaFwiKSBpbk1waCA9IG51bVZhbHVlIC8gMS42MDkzNDQ7XG4gIGVsc2UgaW5NcGggPSBudW1WYWx1ZSAqIDIuMjM2OTQ7IC8vIG0vcyB0byBtcGhcblxuICBpZiAodG9Vbml0ID09PSBcIm1waFwiKSByZXR1cm4gaW5NcGg7XG4gIGlmICh0b1VuaXQgPT09IFwia20vaFwiKSByZXR1cm4gaW5NcGggKiAxLjYwOTM0NDtcbiAgcmV0dXJuIGluTXBoIC8gMi4yMzY5NDsgLy8gbXBoIHRvIG0vc1xufVxuXG4vKipcbiAqIEdldCB0aGUgc21hbGwgZGlzdGFuY2UgdW5pdCBiYXNlZCBvbiB0aGUgdXNlcidzIGRpc3RhbmNlIGNob2ljZS5cbiAqIFlhcmRzIHVzZXJzIHNlZSBpbmNoZXM7IG1ldGVycyB1c2VycyBzZWUgY20uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRTbWFsbERpc3RhbmNlVW5pdCh1bml0Q2hvaWNlOiBVbml0Q2hvaWNlID0gREVGQVVMVF9VTklUX0NIT0lDRSk6IFNtYWxsRGlzdGFuY2VVbml0IHtcbiAgcmV0dXJuIHVuaXRDaG9pY2UuZGlzdGFuY2UgPT09IFwieWFyZHNcIiA/IFwiaW5jaGVzXCIgOiBcImNtXCI7XG59XG5cbi8qKlxuICogQ29udmVydCBhIGRpc3RhbmNlIHZhbHVlIGZyb20gbWV0ZXJzIHRvIGEgc21hbGwgZGlzdGFuY2UgdW5pdCAoaW5jaGVzIG9yIGNtKS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbnZlcnRTbWFsbERpc3RhbmNlKFxuICB2YWx1ZTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbCxcbiAgdG9TbWFsbFVuaXQ6IFNtYWxsRGlzdGFuY2VVbml0XG4pOiBudW1iZXIgfCBzdHJpbmcgfCBudWxsIHtcbiAgaWYgKHZhbHVlID09PSBudWxsIHx8IHZhbHVlID09PSBcIlwiKSByZXR1cm4gdmFsdWU7XG5cbiAgY29uc3QgbnVtVmFsdWUgPSB0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCIgPyBwYXJzZUZsb2F0KHZhbHVlKSA6IHZhbHVlO1xuICBpZiAoaXNOYU4obnVtVmFsdWUpKSByZXR1cm4gdmFsdWU7XG5cbiAgcmV0dXJuIHRvU21hbGxVbml0ID09PSBcImluY2hlc1wiID8gbnVtVmFsdWUgKiAzOS4zNzAxIDogbnVtVmFsdWUgKiAxMDA7XG59XG5cbi8qKlxuICogQ29udmVydCBhIGRpc3RhbmNlIHZhbHVlIGZyb20gbWV0ZXJzIHRvIG1pbGxpbWV0ZXJzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gY29udmVydE1pbGxpbWV0ZXJzKFxuICB2YWx1ZTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbFxuKTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbCB7XG4gIGlmICh2YWx1ZSA9PT0gbnVsbCB8fCB2YWx1ZSA9PT0gXCJcIikgcmV0dXJuIHZhbHVlO1xuXG4gIGNvbnN0IG51bVZhbHVlID0gdHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiID8gcGFyc2VGbG9hdCh2YWx1ZSkgOiB2YWx1ZTtcbiAgaWYgKGlzTmFOKG51bVZhbHVlKSkgcmV0dXJuIHZhbHVlO1xuXG4gIHJldHVybiBudW1WYWx1ZSAqIDEwMDA7XG59XG5cbi8qKlxuICogTm9ybWFsaXplIGEgbWV0cmljIHZhbHVlIGJhc2VkIG9uIHVuaXQgc3lzdGVtIGFsaWdubWVudCBhbmQgdXNlcidzIHVuaXQgY2hvaWNlLlxuICpcbiAqIENvbnZlcnRzIHZhbHVlcyBmcm9tIHRoZSBzb3VyY2UgdW5pdHMgdG8gdGFyZ2V0IG91dHB1dCB1bml0czpcbiAqIC0gRGlzdGFuY2U6IHlhcmRzIG9yIG1ldGVycyAocGVyIHVuaXRDaG9pY2UuZGlzdGFuY2UpXG4gKiAtIEFuZ2xlczogYWx3YXlzIGRlZ3JlZXNcbiAqIC0gU3BlZWQ6IG1waCBvciBtL3MgKHBlciB1bml0Q2hvaWNlLnNwZWVkKVxuICpcbiAqIEBwYXJhbSB2YWx1ZSAtIFRoZSByYXcgbWV0cmljIHZhbHVlXG4gKiBAcGFyYW0gbWV0cmljTmFtZSAtIFRoZSBuYW1lIG9mIHRoZSBtZXRyaWMgYmVpbmcgbm9ybWFsaXplZFxuICogQHBhcmFtIHJlcG9ydFVuaXRTeXN0ZW0gLSBUaGUgdW5pdCBzeXN0ZW0gdXNlZCBpbiB0aGUgc291cmNlIGRhdGFcbiAqIEBwYXJhbSB1bml0Q2hvaWNlIC0gVXNlcidzIHVuaXQgY2hvaWNlIChkZWZhdWx0cyB0byBtcGggKyB5YXJkcylcbiAqIEByZXR1cm5zIE5vcm1hbGl6ZWQgdmFsdWUgYXMgbnVtYmVyIG9yIHN0cmluZyAobnVsbCBpZiBpbnZhbGlkKVxuICovXG5leHBvcnQgZnVuY3Rpb24gbm9ybWFsaXplTWV0cmljVmFsdWUoXG4gIHZhbHVlOiBNZXRyaWNWYWx1ZSxcbiAgbWV0cmljTmFtZTogc3RyaW5nLFxuICByZXBvcnRVbml0U3lzdGVtOiBVbml0U3lzdGVtLFxuICB1bml0Q2hvaWNlOiBVbml0Q2hvaWNlID0gREVGQVVMVF9VTklUX0NIT0lDRVxuKTogTWV0cmljVmFsdWUge1xuICBjb25zdCBudW1WYWx1ZSA9IHBhcnNlTnVtZXJpY1ZhbHVlKHZhbHVlKTtcbiAgaWYgKG51bVZhbHVlID09PSBudWxsKSByZXR1cm4gdmFsdWU7XG5cbiAgbGV0IGNvbnZlcnRlZDogbnVtYmVyO1xuXG4gIGlmIChNSUxMSU1FVEVSX01FVFJJQ1MuaGFzKG1ldHJpY05hbWUpKSB7XG4gICAgY29udmVydGVkID0gY29udmVydE1pbGxpbWV0ZXJzKG51bVZhbHVlKSBhcyBudW1iZXI7XG4gIH0gZWxzZSBpZiAoU01BTExfRElTVEFOQ0VfTUVUUklDUy5oYXMobWV0cmljTmFtZSkpIHtcbiAgICBjb252ZXJ0ZWQgPSBjb252ZXJ0U21hbGxEaXN0YW5jZShcbiAgICAgIG51bVZhbHVlLFxuICAgICAgZ2V0U21hbGxEaXN0YW5jZVVuaXQodW5pdENob2ljZSlcbiAgICApIGFzIG51bWJlcjtcbiAgfSBlbHNlIGlmIChESVNUQU5DRV9NRVRSSUNTLmhhcyhtZXRyaWNOYW1lKSkge1xuICAgIGNvbnZlcnRlZCA9IGNvbnZlcnREaXN0YW5jZShcbiAgICAgIG51bVZhbHVlLFxuICAgICAgcmVwb3J0VW5pdFN5c3RlbS5kaXN0YW5jZVVuaXQsXG4gICAgICB1bml0Q2hvaWNlLmRpc3RhbmNlXG4gICAgKSBhcyBudW1iZXI7XG4gIH0gZWxzZSBpZiAoQU5HTEVfTUVUUklDUy5oYXMobWV0cmljTmFtZSkpIHtcbiAgICBjb252ZXJ0ZWQgPSBjb252ZXJ0QW5nbGUoXG4gICAgICBudW1WYWx1ZSxcbiAgICAgIHJlcG9ydFVuaXRTeXN0ZW0uYW5nbGVVbml0LFxuICAgICAgXCJkZWdyZWVzXCJcbiAgICApIGFzIG51bWJlcjtcbiAgfSBlbHNlIGlmIChTUEVFRF9NRVRSSUNTLmhhcyhtZXRyaWNOYW1lKSkge1xuICAgIGNvbnZlcnRlZCA9IGNvbnZlcnRTcGVlZChcbiAgICAgIG51bVZhbHVlLFxuICAgICAgcmVwb3J0VW5pdFN5c3RlbS5zcGVlZFVuaXQsXG4gICAgICB1bml0Q2hvaWNlLnNwZWVkXG4gICAgKSBhcyBudW1iZXI7XG4gIH0gZWxzZSB7XG4gICAgY29udmVydGVkID0gbnVtVmFsdWU7XG4gIH1cblxuICAvLyBTcGluUmF0ZTogcm91bmQgdG8gd2hvbGUgbnVtYmVyc1xuICBpZiAobWV0cmljTmFtZSA9PT0gXCJTcGluUmF0ZVwiKSByZXR1cm4gTWF0aC5yb3VuZChjb252ZXJ0ZWQpO1xuXG4gIC8vIEltcGFjdCBsb2NhdGlvbiBtZXRyaWNzIGFyZSBkaXNwbGF5ZWQgYXMgd2hvbGUgbWlsbGltZXRlcnMuXG4gIGlmIChNSUxMSU1FVEVSX01FVFJJQ1MuaGFzKG1ldHJpY05hbWUpKSByZXR1cm4gTWF0aC5yb3VuZChjb252ZXJ0ZWQpO1xuXG4gIC8vIFNtYXNoRmFjdG9yIC8gVGVtcG86IHJvdW5kIHRvIDIgZGVjaW1hbCBwbGFjZXNcbiAgaWYgKG1ldHJpY05hbWUgPT09IFwiU21hc2hGYWN0b3JcIiB8fCBtZXRyaWNOYW1lID09PSBcIlRlbXBvXCIpXG4gICAgcmV0dXJuIE1hdGgucm91bmQoY29udmVydGVkICogMTAwKSAvIDEwMDtcblxuICAvLyBSb3VuZCB0byAxIGRlY2ltYWwgcGxhY2UgZm9yIGNvbnNpc3RlbmN5XG4gIHJldHVybiBNYXRoLnJvdW5kKGNvbnZlcnRlZCAqIDEwKSAvIDEwO1xufVxuXG4vKipcbiAqIFBhcnNlIGEgbnVtZXJpYyB2YWx1ZSBmcm9tIE1ldHJpY1ZhbHVlIHR5cGUuXG4gKi9cbmZ1bmN0aW9uIHBhcnNlTnVtZXJpY1ZhbHVlKHZhbHVlOiBNZXRyaWNWYWx1ZSk6IG51bWJlciB8IG51bGwge1xuICBpZiAodmFsdWUgPT09IG51bGwgfHwgdmFsdWUgPT09IFwiXCIpIHJldHVybiBudWxsO1xuICBpZiAodHlwZW9mIHZhbHVlID09PSBcIm51bWJlclwiKSByZXR1cm4gaXNOYU4odmFsdWUpID8gbnVsbCA6IHZhbHVlO1xuICBcbiAgY29uc3QgcGFyc2VkID0gcGFyc2VGbG9hdCh2YWx1ZSk7XG4gIHJldHVybiBpc05hTihwYXJzZWQpID8gbnVsbCA6IHBhcnNlZDtcbn1cblxuZXhwb3J0IHR5cGUgTWV0cmljVmFsdWUgPSBzdHJpbmcgfCBudW1iZXIgfCBudWxsO1xuIiwgIi8qKlxuICogQ1NWIHdyaXRlciBmb3IgVHJhY2tQdWxsIHNlc3Npb24gZGF0YS5cbiAqIEltcGxlbWVudHMgY29yZSBjb2x1bW5zOiBEYXRlLCBDbHViLCBTaG90ICMsIFR5cGVcbiAqL1xuXG5pbXBvcnQgdHlwZSB7IFNlc3Npb25EYXRhLCBDbHViR3JvdXAsIFNob3QgfSBmcm9tIFwiLi4vbW9kZWxzL3R5cGVzXCI7XG5pbXBvcnQge1xuICBnZXRBcGlTb3VyY2VVbml0U3lzdGVtLFxuICBnZXRNZXRyaWNVbml0TGFiZWwsXG4gIG5vcm1hbGl6ZU1ldHJpY1ZhbHVlLFxuICBERUZBVUxUX1VOSVRfQ0hPSUNFLFxuICB0eXBlIFVuaXRDaG9pY2UsXG59IGZyb20gXCIuL3VuaXRfbm9ybWFsaXphdGlvblwiO1xuaW1wb3J0IHsgTUVUUklDX0RJU1BMQVlfTkFNRVMgfSBmcm9tIFwiLi9jb25zdGFudHNcIjtcblxuY29uc3QgTUVUUklDX0NPTFVNTl9PUkRFUjogc3RyaW5nW10gPSBbXG4gIC8vIFNwZWVkICYgRWZmaWNpZW5jeVxuICBcIkNsdWJTcGVlZFwiLCBcIkJhbGxTcGVlZFwiLCBcIlNtYXNoRmFjdG9yXCIsXG4gIC8vIENsdWIgRGVsaXZlcnlcbiAgXCJBdHRhY2tBbmdsZVwiLCBcIkNsdWJQYXRoXCIsIFwiRmFjZUFuZ2xlXCIsIFwiRmFjZVRvUGF0aFwiLCBcIlN3aW5nRGlyZWN0aW9uXCIsIFwiRHluYW1pY0xvZnRcIixcbiAgLy8gTGF1bmNoICYgU3BpblxuICBcIkxhdW5jaEFuZ2xlXCIsIFwiTGF1bmNoRGlyZWN0aW9uXCIsIFwiU3BpblJhdGVcIiwgXCJTcGluQXhpc1wiLCBcIlNwaW5Mb2Z0XCIsXG4gIC8vIERpc3RhbmNlXG4gIFwiQ2FycnlcIiwgXCJUb3RhbFwiLFxuICAvLyBEaXNwZXJzaW9uXG4gIFwiU2lkZVwiLCBcIlNpZGVUb3RhbFwiLCBcIkNhcnJ5U2lkZVwiLCBcIlRvdGFsU2lkZVwiLCBcIkN1cnZlXCIsXG4gIC8vIEJhbGwgRmxpZ2h0XG4gIFwiSGVpZ2h0XCIsIFwiTWF4SGVpZ2h0XCIsIFwiTGFuZGluZ0FuZ2xlXCIsIFwiSGFuZ1RpbWVcIixcbiAgLy8gSW1wYWN0XG4gIFwiTG93UG9pbnREaXN0YW5jZVwiLCBcIkltcGFjdEhlaWdodFwiLCBcIkltcGFjdE9mZnNldFwiLFxuICAvLyBPdGhlclxuICBcIlRlbXBvXCIsXG5dO1xuXG5mdW5jdGlvbiBnZXREaXNwbGF5TmFtZShtZXRyaWM6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBNRVRSSUNfRElTUExBWV9OQU1FU1ttZXRyaWNdID8/IG1ldHJpYztcbn1cblxuZnVuY3Rpb24gZ2V0Q29sdW1uTmFtZShtZXRyaWM6IHN0cmluZywgdW5pdENob2ljZTogVW5pdENob2ljZSk6IHN0cmluZyB7XG4gIGNvbnN0IGRpc3BsYXlOYW1lID0gZ2V0RGlzcGxheU5hbWUobWV0cmljKTtcbiAgY29uc3QgdW5pdExhYmVsID0gZ2V0TWV0cmljVW5pdExhYmVsKG1ldHJpYywgdW5pdENob2ljZSk7XG4gIHJldHVybiB1bml0TGFiZWwgPyBgJHtkaXNwbGF5TmFtZX0gKCR7dW5pdExhYmVsfSlgIDogZGlzcGxheU5hbWU7XG59XG5cbmZ1bmN0aW9uIGdlbmVyYXRlRmlsZW5hbWUoc2Vzc2lvbjogU2Vzc2lvbkRhdGEpOiBzdHJpbmcge1xuICByZXR1cm4gYFNob3REYXRhXyR7c2Vzc2lvbi5kYXRlfS5jc3ZgO1xufVxuXG5mdW5jdGlvbiBvcmRlck1ldHJpY3NCeVByaW9yaXR5KFxuICBhbGxNZXRyaWNzOiBzdHJpbmdbXSxcbiAgcHJpb3JpdHlPcmRlcjogc3RyaW5nW11cbik6IHN0cmluZ1tdIHtcbiAgY29uc3QgcmVzdWx0OiBzdHJpbmdbXSA9IFtdO1xuICBjb25zdCBzZWVuID0gbmV3IFNldDxzdHJpbmc+KCk7XG5cbiAgZm9yIChjb25zdCBtZXRyaWMgb2YgcHJpb3JpdHlPcmRlcikge1xuICAgIGlmIChhbGxNZXRyaWNzLmluY2x1ZGVzKG1ldHJpYykgJiYgIXNlZW4uaGFzKG1ldHJpYykpIHtcbiAgICAgIHJlc3VsdC5wdXNoKG1ldHJpYyk7XG4gICAgICBzZWVuLmFkZChtZXRyaWMpO1xuICAgIH1cbiAgfVxuXG4gIGZvciAoY29uc3QgbWV0cmljIG9mIGFsbE1ldHJpY3MpIHtcbiAgICBpZiAoIXNlZW4uaGFzKG1ldHJpYykpIHtcbiAgICAgIHJlc3VsdC5wdXNoKG1ldHJpYyk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gaGFzVGFncyhzZXNzaW9uOiBTZXNzaW9uRGF0YSk6IGJvb2xlYW4ge1xuICByZXR1cm4gc2Vzc2lvbi5jbHViX2dyb3Vwcy5zb21lKChjbHViKSA9PlxuICAgIGNsdWIuc2hvdHMuc29tZSgoc2hvdCkgPT4gc2hvdC50YWcgIT09IHVuZGVmaW5lZCAmJiBzaG90LnRhZyAhPT0gXCJcIilcbiAgKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHdyaXRlQ3N2KFxuICBzZXNzaW9uOiBTZXNzaW9uRGF0YSxcbiAgaW5jbHVkZUF2ZXJhZ2VzID0gdHJ1ZSxcbiAgbWV0cmljT3JkZXI/OiBzdHJpbmdbXSxcbiAgdW5pdENob2ljZTogVW5pdENob2ljZSA9IERFRkFVTFRfVU5JVF9DSE9JQ0UsXG4gIGhpdHRpbmdTdXJmYWNlPzogXCJHcmFzc1wiIHwgXCJNYXRcIlxuKTogc3RyaW5nIHtcbiAgY29uc3Qgb3JkZXJlZE1ldHJpY3MgPSBvcmRlck1ldHJpY3NCeVByaW9yaXR5KFxuICAgIHNlc3Npb24ubWV0cmljX25hbWVzLFxuICAgIG1ldHJpY09yZGVyID8/IE1FVFJJQ19DT0xVTU5fT1JERVJcbiAgKTtcblxuICBjb25zdCBoZWFkZXJSb3c6IHN0cmluZ1tdID0gW1wiRGF0ZVwiLCBcIkNsdWJcIl07XG5cbiAgaWYgKGhhc1RhZ3Moc2Vzc2lvbikpIHtcbiAgICBoZWFkZXJSb3cucHVzaChcIlRhZ1wiKTtcbiAgfVxuXG4gIGhlYWRlclJvdy5wdXNoKFwiU2hvdCAjXCIsIFwiVHlwZVwiKTtcblxuICBmb3IgKGNvbnN0IG1ldHJpYyBvZiBvcmRlcmVkTWV0cmljcykge1xuICAgIGhlYWRlclJvdy5wdXNoKGdldENvbHVtbk5hbWUobWV0cmljLCB1bml0Q2hvaWNlKSk7XG4gIH1cblxuICBjb25zdCByb3dzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+W10gPSBbXTtcblxuICAvLyBTb3VyY2UgdW5pdCBzeXN0ZW06IEFQSSBhbHdheXMgcmV0dXJucyBtL3MgKyBtZXRlcnMsIGFuZ2xlIHVuaXQgZnJvbSByZXBvcnRcbiAgY29uc3QgdW5pdFN5c3RlbSA9IGdldEFwaVNvdXJjZVVuaXRTeXN0ZW0oc2Vzc2lvbi5tZXRhZGF0YV9wYXJhbXMpO1xuXG4gIGZvciAoY29uc3QgY2x1YiBvZiBzZXNzaW9uLmNsdWJfZ3JvdXBzKSB7XG4gICAgZm9yIChjb25zdCBzaG90IG9mIGNsdWIuc2hvdHMpIHtcbiAgICAgIGNvbnN0IHJvdzogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcbiAgICAgICAgRGF0ZTogc2Vzc2lvbi5kYXRlLFxuICAgICAgICBDbHViOiBjbHViLmNsdWJfbmFtZSxcbiAgICAgICAgXCJTaG90ICNcIjogU3RyaW5nKHNob3Quc2hvdF9udW1iZXIgKyAxKSxcbiAgICAgICAgVHlwZTogXCJTaG90XCIsXG4gICAgICB9O1xuXG4gICAgICBpZiAoaGFzVGFncyhzZXNzaW9uKSkge1xuICAgICAgICByb3cuVGFnID0gc2hvdC50YWcgPz8gXCJcIjtcbiAgICAgIH1cblxuICAgICAgZm9yIChjb25zdCBtZXRyaWMgb2Ygb3JkZXJlZE1ldHJpY3MpIHtcbiAgICAgICAgY29uc3QgY29sTmFtZSA9IGdldENvbHVtbk5hbWUobWV0cmljLCB1bml0Q2hvaWNlKTtcbiAgICAgICAgY29uc3QgcmF3VmFsdWUgPSBzaG90Lm1ldHJpY3NbbWV0cmljXSA/PyBcIlwiO1xuXG4gICAgICAgIGlmICh0eXBlb2YgcmF3VmFsdWUgPT09IFwic3RyaW5nXCIgfHwgdHlwZW9mIHJhd1ZhbHVlID09PSBcIm51bWJlclwiKSB7XG4gICAgICAgICAgcm93W2NvbE5hbWVdID0gU3RyaW5nKG5vcm1hbGl6ZU1ldHJpY1ZhbHVlKHJhd1ZhbHVlLCBtZXRyaWMsIHVuaXRTeXN0ZW0sIHVuaXRDaG9pY2UpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByb3dbY29sTmFtZV0gPSBcIlwiO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJvd3MucHVzaChyb3cpO1xuICAgIH1cblxuICAgIGlmIChpbmNsdWRlQXZlcmFnZXMpIHtcbiAgICAgIC8vIEdyb3VwIHNob3RzIGJ5IHRhZ1xuICAgICAgY29uc3QgdGFnR3JvdXBzID0gbmV3IE1hcDxzdHJpbmcsIFNob3RbXT4oKTtcbiAgICAgIGZvciAoY29uc3Qgc2hvdCBvZiBjbHViLnNob3RzKSB7XG4gICAgICAgIGNvbnN0IHRhZyA9IHNob3QudGFnID8/IFwiXCI7XG4gICAgICAgIGlmICghdGFnR3JvdXBzLmhhcyh0YWcpKSB0YWdHcm91cHMuc2V0KHRhZywgW10pO1xuICAgICAgICB0YWdHcm91cHMuZ2V0KHRhZykhLnB1c2goc2hvdCk7XG4gICAgICB9XG5cbiAgICAgIGZvciAoY29uc3QgW3RhZywgc2hvdHNdIG9mIHRhZ0dyb3Vwcykge1xuICAgICAgICAvLyBPbmx5IHdyaXRlIGF2ZXJhZ2Ugcm93IGlmIGdyb3VwIGhhcyAyKyBzaG90c1xuICAgICAgICBpZiAoc2hvdHMubGVuZ3RoIDwgMikgY29udGludWU7XG5cbiAgICAgICAgY29uc3QgYXZnUm93OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xuICAgICAgICAgIERhdGU6IHNlc3Npb24uZGF0ZSxcbiAgICAgICAgICBDbHViOiBjbHViLmNsdWJfbmFtZSxcbiAgICAgICAgICBcIlNob3QgI1wiOiBcIlwiLFxuICAgICAgICAgIFR5cGU6IFwiQXZlcmFnZVwiLFxuICAgICAgICB9O1xuXG4gICAgICAgIGlmIChoYXNUYWdzKHNlc3Npb24pKSB7XG4gICAgICAgICAgYXZnUm93LlRhZyA9IHRhZztcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAoY29uc3QgbWV0cmljIG9mIG9yZGVyZWRNZXRyaWNzKSB7XG4gICAgICAgICAgY29uc3QgY29sTmFtZSA9IGdldENvbHVtbk5hbWUobWV0cmljLCB1bml0Q2hvaWNlKTtcbiAgICAgICAgICBjb25zdCB2YWx1ZXMgPSBzaG90c1xuICAgICAgICAgICAgLm1hcCgocykgPT4gcy5tZXRyaWNzW21ldHJpY10pXG4gICAgICAgICAgICAuZmlsdGVyKCh2KSA9PiB2ICE9PSB1bmRlZmluZWQgJiYgdiAhPT0gXCJcIilcbiAgICAgICAgICAgIC5tYXAoKHYpID0+IHBhcnNlRmxvYXQoU3RyaW5nKHYpKSk7XG4gICAgICAgICAgY29uc3QgbnVtZXJpY1ZhbHVlcyA9IHZhbHVlcy5maWx0ZXIoKHYpID0+ICFpc05hTih2KSk7XG5cbiAgICAgICAgICBpZiAobnVtZXJpY1ZhbHVlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBhdmcgPSBudW1lcmljVmFsdWVzLnJlZHVjZSgoYSwgYikgPT4gYSArIGIsIDApIC8gbnVtZXJpY1ZhbHVlcy5sZW5ndGg7XG4gICAgICAgICAgICBjb25zdCByb3VuZGVkID0gKG1ldHJpYyA9PT0gXCJTbWFzaEZhY3RvclwiIHx8IG1ldHJpYyA9PT0gXCJUZW1wb1wiKVxuICAgICAgICAgICAgICA/IE1hdGgucm91bmQoYXZnICogMTAwKSAvIDEwMFxuICAgICAgICAgICAgICA6IE1hdGgucm91bmQoYXZnICogMTApIC8gMTA7XG4gICAgICAgICAgICBhdmdSb3dbY29sTmFtZV0gPSBTdHJpbmcobm9ybWFsaXplTWV0cmljVmFsdWUocm91bmRlZCwgbWV0cmljLCB1bml0U3lzdGVtLCB1bml0Q2hvaWNlKSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGF2Z1Jvd1tjb2xOYW1lXSA9IFwiXCI7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcm93cy5wdXNoKGF2Z1Jvdyk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgY29uc3QgbGluZXM6IHN0cmluZ1tdID0gW107XG5cbiAgaWYgKGhpdHRpbmdTdXJmYWNlICE9PSB1bmRlZmluZWQpIHtcbiAgICBsaW5lcy5wdXNoKGBIaXR0aW5nIFN1cmZhY2U6ICR7aGl0dGluZ1N1cmZhY2V9YCk7XG4gIH1cblxuICBsaW5lcy5wdXNoKGhlYWRlclJvdy5qb2luKFwiLFwiKSk7XG4gIGZvciAoY29uc3Qgcm93IG9mIHJvd3MpIHtcbiAgICBsaW5lcy5wdXNoKFxuICAgICAgaGVhZGVyUm93XG4gICAgICAgIC5tYXAoKGNvbCkgPT4ge1xuICAgICAgICAgIGNvbnN0IHZhbHVlID0gcm93W2NvbF0gPz8gXCJcIjtcbiAgICAgICAgICBpZiAodmFsdWUuaW5jbHVkZXMoXCIsXCIpIHx8IHZhbHVlLmluY2x1ZGVzKCdcIicpIHx8IHZhbHVlLmluY2x1ZGVzKFwiXFxuXCIpKSB7XG4gICAgICAgICAgICByZXR1cm4gYFwiJHt2YWx1ZS5yZXBsYWNlKC9cIi9nLCAnXCJcIicpfVwiYDtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICB9KVxuICAgICAgICAuam9pbihcIixcIilcbiAgICApO1xuICB9XG5cbiAgcmV0dXJuIGxpbmVzLmpvaW4oXCJcXG5cIik7XG59XG4iLCAiLyoqXG4gKiBTZXNzaW9uIGhpc3Rvcnkgc3RvcmFnZSBtb2R1bGUuXG4gKiBTYXZlcywgZGVkdXBsaWNhdGVzIChieSByZXBvcnRfaWQpLCBhbmQgZXZpY3RzIHNlc3Npb25zIGZyb20gY2hyb21lLnN0b3JhZ2UubG9jYWwuXG4gKi9cblxuaW1wb3J0IHR5cGUgeyBTZXNzaW9uRGF0YSwgU2Vzc2lvblNuYXBzaG90LCBIaXN0b3J5RW50cnkgfSBmcm9tIFwiLi4vbW9kZWxzL3R5cGVzXCI7XG5pbXBvcnQgeyBTVE9SQUdFX0tFWVMgfSBmcm9tIFwiLi9jb25zdGFudHNcIjtcblxuY29uc3QgTUFYX1NFU1NJT05TID0gMjA7XG5cbi8qKiBTdHJpcCByYXdfYXBpX2RhdGEgZnJvbSBhIFNlc3Npb25EYXRhIHRvIGNyZWF0ZSBhIGxpZ2h0d2VpZ2h0IHNuYXBzaG90LiAqL1xuZnVuY3Rpb24gY3JlYXRlU25hcHNob3Qoc2Vzc2lvbjogU2Vzc2lvbkRhdGEpOiBTZXNzaW9uU25hcHNob3Qge1xuICAvLyBEZXN0cnVjdHVyZSB0byBleGNsdWRlIHJhd19hcGlfZGF0YVxuICBjb25zdCB7IHJhd19hcGlfZGF0YTogXywgLi4uc25hcHNob3QgfSA9IHNlc3Npb247XG4gIHJldHVybiBzbmFwc2hvdDtcbn1cblxuLyoqXG4gKiBTYXZlIGEgc2Vzc2lvbiB0byB0aGUgcm9sbGluZyBoaXN0b3J5IGluIGNocm9tZS5zdG9yYWdlLmxvY2FsLlxuICogLSBEZWR1cGxpY2F0ZXMgYnkgcmVwb3J0X2lkIChyZXBsYWNlcyBleGlzdGluZyBlbnRyeSwgcmVmcmVzaGVzIGNhcHR1cmVkX2F0KS5cbiAqIC0gRXZpY3RzIG9sZGVzdCBlbnRyeSB3aGVuIHRoZSAyMC1zZXNzaW9uIGNhcCBpcyByZWFjaGVkLlxuICogLSBTdG9yZXMgZW50cmllcyBzb3J0ZWQgbmV3ZXN0LWZpcnN0IChkZXNjZW5kaW5nIGNhcHR1cmVkX2F0KS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNhdmVTZXNzaW9uVG9IaXN0b3J5KHNlc3Npb246IFNlc3Npb25EYXRhKTogUHJvbWlzZTx2b2lkPiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgY2hyb21lLnN0b3JhZ2UubG9jYWwuZ2V0KFxuICAgICAgW1NUT1JBR0VfS0VZUy5TRVNTSU9OX0hJU1RPUlldLFxuICAgICAgKHJlc3VsdDogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pID0+IHtcbiAgICAgICAgaWYgKGNocm9tZS5ydW50aW1lLmxhc3RFcnJvcikge1xuICAgICAgICAgIHJldHVybiByZWplY3QobmV3IEVycm9yKGNocm9tZS5ydW50aW1lLmxhc3RFcnJvci5tZXNzYWdlKSk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBleGlzdGluZyA9IChyZXN1bHRbU1RPUkFHRV9LRVlTLlNFU1NJT05fSElTVE9SWV0gYXMgSGlzdG9yeUVudHJ5W10gfCB1bmRlZmluZWQpID8/IFtdO1xuXG4gICAgICAgIC8vIFJlbW92ZSBhbnkgZXhpc3RpbmcgZW50cnkgd2l0aCB0aGUgc2FtZSByZXBvcnRfaWQgKGRlZHVwKVxuICAgICAgICBjb25zdCBmaWx0ZXJlZCA9IGV4aXN0aW5nLmZpbHRlcihcbiAgICAgICAgICAoZW50cnkpID0+IGVudHJ5LnNuYXBzaG90LnJlcG9ydF9pZCAhPT0gc2Vzc2lvbi5yZXBvcnRfaWRcbiAgICAgICAgKTtcblxuICAgICAgICAvLyBDcmVhdGUgbmV3IGVudHJ5XG4gICAgICAgIGNvbnN0IG5ld0VudHJ5OiBIaXN0b3J5RW50cnkgPSB7XG4gICAgICAgICAgY2FwdHVyZWRfYXQ6IERhdGUubm93KCksXG4gICAgICAgICAgc25hcHNob3Q6IGNyZWF0ZVNuYXBzaG90KHNlc3Npb24pLFxuICAgICAgICB9O1xuXG4gICAgICAgIGZpbHRlcmVkLnB1c2gobmV3RW50cnkpO1xuXG4gICAgICAgIC8vIFNvcnQgbmV3ZXN0LWZpcnN0IChkZXNjZW5kaW5nIGNhcHR1cmVkX2F0KVxuICAgICAgICBmaWx0ZXJlZC5zb3J0KChhLCBiKSA9PiBiLmNhcHR1cmVkX2F0IC0gYS5jYXB0dXJlZF9hdCk7XG5cbiAgICAgICAgLy8gRW5mb3JjZSBjYXAgXHUyMDE0IHNsaWNlIGtlZXBzIHRoZSBuZXdlc3QgTUFYX1NFU1NJT05TIGVudHJpZXNcbiAgICAgICAgY29uc3QgY2FwcGVkID0gZmlsdGVyZWQuc2xpY2UoMCwgTUFYX1NFU1NJT05TKTtcblxuICAgICAgICBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoXG4gICAgICAgICAgeyBbU1RPUkFHRV9LRVlTLlNFU1NJT05fSElTVE9SWV06IGNhcHBlZCB9LFxuICAgICAgICAgICgpID0+IHtcbiAgICAgICAgICAgIGlmIChjaHJvbWUucnVudGltZS5sYXN0RXJyb3IpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHJlamVjdChuZXcgRXJyb3IoY2hyb21lLnJ1bnRpbWUubGFzdEVycm9yLm1lc3NhZ2UpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgICB9XG4gICAgKTtcbiAgfSk7XG59XG5cbi8qKlxuICogTWFwIHN0b3JhZ2UgZXJyb3Igc3RyaW5ncyB0byB1c2VyLWZyaWVuZGx5IG1lc3NhZ2VzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0SGlzdG9yeUVycm9yTWVzc2FnZShlcnJvcjogc3RyaW5nKTogc3RyaW5nIHtcbiAgaWYgKC9RVU9UQV9CWVRFU3xxdW90YS9pLnRlc3QoZXJyb3IpKSB7XG4gICAgcmV0dXJuIFwiU3RvcmFnZSBmdWxsIC0tIG9sZGVzdCBzZXNzaW9ucyB3aWxsIGJlIGNsZWFyZWRcIjtcbiAgfVxuICByZXR1cm4gXCJDb3VsZCBub3Qgc2F2ZSB0byBzZXNzaW9uIGhpc3RvcnlcIjtcbn1cbiIsICIvKipcbiAqIFBvcnRhbCBwZXJtaXNzaW9uIGhlbHBlcnMgZm9yIFRyYWNrbWFuIEFQSSBhY2Nlc3MuXG4gKiBTaGFyZWQgYnkgcG9wdXAgKHJlcXVlc3QgKyBjaGVjaykgYW5kIHNlcnZpY2Ugd29ya2VyIChjaGVjayBvbmx5KS5cbiAqL1xuXG5leHBvcnQgY29uc3QgUE9SVEFMX09SSUdJTlM6IHJlYWRvbmx5IHN0cmluZ1tdID0gW1xuICBcImh0dHBzOi8vYXBpLnRyYWNrbWFuZ29sZi5jb20vKlwiLFxuICBcImh0dHBzOi8vcG9ydGFsLnRyYWNrbWFuZ29sZi5jb20vKlwiLFxuXSBhcyBjb25zdDtcblxuLyoqIFJldHVybnMgdHJ1ZSBpZiBwb3J0YWwgaG9zdCBwZXJtaXNzaW9ucyBhcmUgY3VycmVudGx5IGdyYW50ZWQuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaGFzUG9ydGFsUGVybWlzc2lvbigpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgcmV0dXJuIGNocm9tZS5wZXJtaXNzaW9ucy5jb250YWlucyh7IG9yaWdpbnM6IFsuLi5QT1JUQUxfT1JJR0lOU10gfSk7XG59XG5cbi8qKlxuICogUmVxdWVzdHMgcG9ydGFsIGhvc3QgcGVybWlzc2lvbnMgZnJvbSB0aGUgdXNlci5cbiAqIE1VU1QgYmUgY2FsbGVkIGZyb20gYSB1c2VyIGdlc3R1cmUgKGJ1dHRvbiBjbGljayBoYW5kbGVyKS5cbiAqIFJldHVybnMgdHJ1ZSBpZiBncmFudGVkLCBmYWxzZSBpZiBkZW5pZWQuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZXF1ZXN0UG9ydGFsUGVybWlzc2lvbigpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgcmV0dXJuIGNocm9tZS5wZXJtaXNzaW9ucy5yZXF1ZXN0KHsgb3JpZ2luczogWy4uLlBPUlRBTF9PUklHSU5TXSB9KTtcbn1cbiIsICIvKipcbiAqIEdyYXBoUUwgY2xpZW50IGZvciBUcmFja21hbiBBUEkuXG4gKiBTZW5kcyBhdXRoZW50aWNhdGVkIHJlcXVlc3RzIHVzaW5nIGJyb3dzZXIgc2Vzc2lvbiBjb29raWVzIChjcmVkZW50aWFsczogaW5jbHVkZSkuXG4gKiBTaGFyZWQgYnkgc2VydmljZSB3b3JrZXIgYW5kIHBvcHVwLlxuICovXG5cbmV4cG9ydCBjb25zdCBHUkFQSFFMX0VORFBPSU5UID0gXCJodHRwczovL2FwaS50cmFja21hbmdvbGYuY29tL2dyYXBocWxcIjtcblxuZXhwb3J0IGNvbnN0IEhFQUxUSF9DSEVDS19RVUVSWSA9IGBxdWVyeSBIZWFsdGhDaGVjayB7IG1lIHsgX190eXBlbmFtZSB9IH1gO1xuXG4vKiogU3RhbmRhcmQgR3JhcGhRTCByZXNwb25zZSBlbnZlbG9wZS4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgR3JhcGhRTFJlc3BvbnNlPFQ+IHtcbiAgZGF0YTogVCB8IG51bGw7XG4gIGVycm9ycz86IEFycmF5PHtcbiAgICBtZXNzYWdlOiBzdHJpbmc7XG4gICAgZXh0ZW5zaW9ucz86IHsgY29kZT86IHN0cmluZyB9O1xuICB9Pjtcbn1cblxuLyoqIEF1dGggY2xhc3NpZmljYXRpb24gcmVzdWx0IHJldHVybmVkIGJ5IGNsYXNzaWZ5QXV0aFJlc3VsdC4gKi9cbmV4cG9ydCB0eXBlIEF1dGhTdGF0dXMgPVxuICB8IHsga2luZDogXCJhdXRoZW50aWNhdGVkXCIgfVxuICB8IHsga2luZDogXCJ1bmF1dGhlbnRpY2F0ZWRcIiB9XG4gIHwgeyBraW5kOiBcImVycm9yXCI7IG1lc3NhZ2U6IHN0cmluZyB9O1xuXG4vKipcbiAqIEV4ZWN1dGVzIGEgR3JhcGhRTCBxdWVyeSBhZ2FpbnN0IHRoZSBUcmFja21hbiBBUEkuXG4gKiBVc2VzIGNyZWRlbnRpYWxzOiBcImluY2x1ZGVcIiBzbyB0aGUgYnJvd3NlciBzZW5kcyBleGlzdGluZyBzZXNzaW9uIGNvb2tpZXMuXG4gKiBUaHJvd3MgaWYgdGhlIEhUVFAgcmVzcG9uc2UgaXMgbm90IDJ4eC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGV4ZWN1dGVRdWVyeTxUPihcbiAgcXVlcnk6IHN0cmluZyxcbiAgdmFyaWFibGVzPzogUmVjb3JkPHN0cmluZywgdW5rbm93bj5cbik6IFByb21pc2U8R3JhcGhRTFJlc3BvbnNlPFQ+PiB7XG4gIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goR1JBUEhRTF9FTkRQT0lOVCwge1xuICAgIG1ldGhvZDogXCJQT1NUXCIsXG4gICAgY3JlZGVudGlhbHM6IFwiaW5jbHVkZVwiLFxuICAgIGhlYWRlcnM6IHsgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIgfSxcbiAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IHF1ZXJ5LCB2YXJpYWJsZXMgfSksXG4gIH0pO1xuXG4gIGlmICghcmVzcG9uc2Uub2spIHtcbiAgICBjb25zdCBib2R5ID0gYXdhaXQgcmVzcG9uc2UudGV4dCgpLmNhdGNoKCgpID0+IFwiKG5vIGJvZHkpXCIpO1xuICAgIGNvbnNvbGUuZXJyb3IoYFRyYWNrUHVsbDogR3JhcGhRTCAke3Jlc3BvbnNlLnN0YXR1c30gcmVzcG9uc2U6YCwgYm9keSk7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBIVFRQICR7cmVzcG9uc2Uuc3RhdHVzfTogJHtib2R5LnNsaWNlKDAsIDIwMCl9YCk7XG4gIH1cblxuICByZXR1cm4gcmVzcG9uc2UuanNvbigpIGFzIFByb21pc2U8R3JhcGhRTFJlc3BvbnNlPFQ+Pjtcbn1cblxuLyoqXG4gKiBDbGFzc2lmaWVzIGEgR3JhcGhRTCByZXNwb25zZSBmcm9tIHRoZSBoZWFsdGgtY2hlY2sgcXVlcnkgaW50byBhbiBBdXRoU3RhdHVzLlxuICpcbiAqIENsYXNzaWZpY2F0aW9uIHByaW9yaXR5OlxuICogMS4gRXJyb3JzIHByZXNlbnQgYW5kIG5vbi1lbXB0eSBcdTIxOTIgY2hlY2sgZm9yIGF1dGggZXJyb3IgcGF0dGVybnMgXHUyMTkyIGVsc2UgZ2VuZXJpYyBlcnJvclxuICogMi4gTm8gZXJyb3JzIGJ1dCBkYXRhLm1lIGlzIGZhbHN5IFx1MjE5MiB1bmF1dGhlbnRpY2F0ZWRcbiAqIDMuIGRhdGEubWUgaXMgdHJ1dGh5IChoYXMgX190eXBlbmFtZSkgXHUyMTkyIGF1dGhlbnRpY2F0ZWRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNsYXNzaWZ5QXV0aFJlc3VsdChcbiAgcmVzdWx0OiBHcmFwaFFMUmVzcG9uc2U8eyBtZTogeyBfX3R5cGVuYW1lOiBzdHJpbmcgfSB8IG51bGwgfT5cbik6IEF1dGhTdGF0dXMge1xuICBpZiAocmVzdWx0LmVycm9ycyAmJiByZXN1bHQuZXJyb3JzLmxlbmd0aCA+IDApIHtcbiAgICBjb25zdCBjb2RlID0gcmVzdWx0LmVycm9yc1swXS5leHRlbnNpb25zPy5jb2RlID8/IFwiXCI7XG4gICAgY29uc3QgbXNnID0gcmVzdWx0LmVycm9yc1swXS5tZXNzYWdlID8/IFwiXCI7XG4gICAgY29uc3QgbXNnTG93ZXIgPSBtc2cudG9Mb3dlckNhc2UoKTtcblxuICAgIGlmIChcbiAgICAgIGNvZGUgPT09IFwiVU5BVVRIRU5USUNBVEVEXCIgfHxcbiAgICAgIG1zZ0xvd2VyLmluY2x1ZGVzKFwidW5hdXRob3JpemVkXCIpIHx8XG4gICAgICBtc2dMb3dlci5pbmNsdWRlcyhcInVuYXV0aGVudGljYXRlZFwiKSB8fFxuICAgICAgbXNnTG93ZXIuaW5jbHVkZXMoXCJub3QgbG9nZ2VkIGluXCIpXG4gICAgKSB7XG4gICAgICByZXR1cm4geyBraW5kOiBcInVuYXV0aGVudGljYXRlZFwiIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIHsga2luZDogXCJlcnJvclwiLCBtZXNzYWdlOiBcIlVuYWJsZSB0byByZWFjaCBUcmFja21hbiBcdTIwMTQgdHJ5IGFnYWluIGxhdGVyXCIgfTtcbiAgfVxuXG4gIGlmICghcmVzdWx0LmRhdGE/Lm1lPy5fX3R5cGVuYW1lKSB7XG4gICAgcmV0dXJuIHsga2luZDogXCJ1bmF1dGhlbnRpY2F0ZWRcIiB9O1xuICB9XG5cbiAgcmV0dXJuIHsga2luZDogXCJhdXRoZW50aWNhdGVkXCIgfTtcbn1cbiIsICIvKipcbiAqIFBvcnRhbCBHcmFwaFFMIGFjdGl2aXR5IHBhcnNlci5cbiAqXG4gKiBDb252ZXJ0cyBHcmFwaFFMIGFjdGl2aXR5IHJlc3BvbnNlcyAoZnJvbSBQaGFzZSAyMiBncmFwaHFsX2NsaWVudCkgaW50byB0aGVcbiAqIGV4aXN0aW5nIFNlc3Npb25EYXRhIGZvcm1hdCwgZW5hYmxpbmcgcG9ydGFsLWZldGNoZWQgZGF0YSB0byBmbG93IGludG8gdGhlXG4gKiBDU1YgZXhwb3J0LCBBSSBhbmFseXNpcywgYW5kIHNlc3Npb24gaGlzdG9yeSBwaXBlbGluZS5cbiAqXG4gKiBLZXkgZGVzaWduIGRlY2lzaW9uczpcbiAqIC0gR1JBUEhRTF9NRVRSSUNfQUxJQVMgbWFwcyBhbGwgMjkga25vd24gY2FtZWxDYXNlIEdyYXBoUUwgZmllbGQgbmFtZXMgdG9cbiAqICAgUGFzY2FsQ2FzZSBNRVRSSUNfS0VZUyBuYW1lcy4gVW5rbm93biBmaWVsZHMgYXJlIG5vcm1hbGl6ZWQgdmlhIHRvUGFzY2FsQ2FzZS5cbiAqIC0gRG9lcyBOT1QgaW1wb3J0IE1FVFJJQ19LRVlTIGZyb20gaW50ZXJjZXB0b3IudHMgdG8gYXZvaWQgYWNjaWRlbnRhbGx5XG4gKiAgIGZpbHRlcmluZyB1bmtub3duIGZ1dHVyZSBmaWVsZHMgKEQtMDEgYW50aS1wYXR0ZXJuKS5cbiAqIC0gTnVsbC91bmRlZmluZWQvTmFOIHZhbHVlcyBhcmUgb21pdHRlZCBcdTIwMTQgbm8gcGhhbnRvbSBlbXB0eSBtZXRyaWNzLlxuICogLSBNZXRyaWMgdmFsdWVzIGFyZSBzdG9yZWQgYXMgc3RyaW5ncyBmb3IgY29uc2lzdGVuY3kgd2l0aCBpbnRlcmNlcHRvciBvdXRwdXQuXG4gKiAtIHJlcG9ydF9pZCBpcyB0aGUgVVVJRCBkZWNvZGVkIGZyb20gdGhlIGJhc2U2NCBhY3Rpdml0eSBJRCAoUElQRS0wMyBkZWR1cCkuXG4gKi9cblxuaW1wb3J0IHR5cGUgeyBTZXNzaW9uRGF0YSwgU2hvdCwgQ2x1Ykdyb3VwIH0gZnJvbSBcIi4uL21vZGVscy90eXBlc1wiO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIEV4cG9ydGVkIHR5cGVzICh1c2VkIGJ5IFBoYXNlIDI0IGludGVncmF0aW9uKVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmV4cG9ydCBpbnRlcmZhY2UgU3Ryb2tlTWVhc3VyZW1lbnQge1xuICBba2V5OiBzdHJpbmddOiBudW1iZXIgfCBudWxsIHwgdW5kZWZpbmVkO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEdyYXBoUUxTdHJva2Uge1xuICBjbHViPzogc3RyaW5nIHwgbnVsbDtcbiAgdGltZT86IHN0cmluZyB8IG51bGw7XG4gIHRhcmdldERpc3RhbmNlPzogbnVtYmVyIHwgbnVsbDtcbiAgaXNEZWxldGVkPzogYm9vbGVhbiB8IG51bGw7XG4gIGlzU2ltdWxhdGVkPzogYm9vbGVhbiB8IG51bGw7XG4gIG1lYXN1cmVtZW50PzogU3Ryb2tlTWVhc3VyZW1lbnQgfCBudWxsO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEdyYXBoUUxBY3Rpdml0eSB7XG4gIGlkOiBzdHJpbmc7XG4gIHRpbWU/OiBzdHJpbmcgfCBudWxsO1xuICBzdHJva2VDb3VudD86IG51bWJlciB8IG51bGw7XG4gIHN0cm9rZXM/OiBHcmFwaFFMU3Ryb2tlW10gfCBudWxsO1xufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIEdSQVBIUUxfTUVUUklDX0FMSUFTIFx1MjAxNCBhbGwgMjkgTUVUUklDX0tFWVMgZnJvbSBjYW1lbENhc2UgdG8gUGFzY2FsQ2FzZVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmNvbnN0IEdSQVBIUUxfTUVUUklDX0FMSUFTOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xuICBjbHViU3BlZWQ6IFwiQ2x1YlNwZWVkXCIsXG4gIGJhbGxTcGVlZDogXCJCYWxsU3BlZWRcIixcbiAgc21hc2hGYWN0b3I6IFwiU21hc2hGYWN0b3JcIixcbiAgYXR0YWNrQW5nbGU6IFwiQXR0YWNrQW5nbGVcIixcbiAgY2x1YlBhdGg6IFwiQ2x1YlBhdGhcIixcbiAgZmFjZUFuZ2xlOiBcIkZhY2VBbmdsZVwiLFxuICBmYWNlVG9QYXRoOiBcIkZhY2VUb1BhdGhcIixcbiAgc3dpbmdEaXJlY3Rpb246IFwiU3dpbmdEaXJlY3Rpb25cIixcbiAgc3dpbmdQbGFuZTogXCJTd2luZ1BsYW5lXCIsXG4gIGR5bmFtaWNMb2Z0OiBcIkR5bmFtaWNMb2Z0XCIsXG4gIHNwaW5SYXRlOiBcIlNwaW5SYXRlXCIsXG4gIGJhbGxTcGluOiBcIlNwaW5SYXRlXCIsXG4gIHNwaW5BeGlzOiBcIlNwaW5BeGlzXCIsXG4gIHNwaW5Mb2Z0OiBcIlNwaW5Mb2Z0XCIsXG4gIGxhdW5jaEFuZ2xlOiBcIkxhdW5jaEFuZ2xlXCIsXG4gIGxhdW5jaERpcmVjdGlvbjogXCJMYXVuY2hEaXJlY3Rpb25cIixcbiAgY2Fycnk6IFwiQ2FycnlcIixcbiAgdG90YWw6IFwiVG90YWxcIixcbiAgc2lkZTogXCJTaWRlXCIsXG4gIHNpZGVUb3RhbDogXCJTaWRlVG90YWxcIixcbiAgY2FycnlTaWRlOiBcIkNhcnJ5U2lkZVwiLFxuICB0b3RhbFNpZGU6IFwiVG90YWxTaWRlXCIsXG4gIGhlaWdodDogXCJIZWlnaHRcIixcbiAgbWF4SGVpZ2h0OiBcIk1heEhlaWdodFwiLFxuICBjdXJ2ZTogXCJDdXJ2ZVwiLFxuICBsYW5kaW5nQW5nbGU6IFwiTGFuZGluZ0FuZ2xlXCIsXG4gIGhhbmdUaW1lOiBcIkhhbmdUaW1lXCIsXG4gIGxvd1BvaW50RGlzdGFuY2U6IFwiTG93UG9pbnREaXN0YW5jZVwiLFxuICBpbXBhY3RIZWlnaHQ6IFwiSW1wYWN0SGVpZ2h0XCIsXG4gIGltcGFjdE9mZnNldDogXCJJbXBhY3RPZmZzZXRcIixcbiAgdGVtcG86IFwiVGVtcG9cIixcbn07XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gSGVscGVyIGZ1bmN0aW9uc1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbi8qKiBDb252ZXJ0IGZpcnN0IGNoYXJhY3RlciB0byB1cHBlcmNhc2UgXHUyMDE0IHVzZWQgZm9yIHVua25vd24gZmllbGRzIGJleW9uZCBNRVRSSUNfS0VZUy4gKi9cbmZ1bmN0aW9uIHRvUGFzY2FsQ2FzZShrZXk6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBrZXkuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBrZXkuc2xpY2UoMSk7XG59XG5cbi8qKiBSZXNvbHZlIGEgR3JhcGhRTCBjYW1lbENhc2UgZmllbGQgbmFtZSB0byBpdHMgY2Fub25pY2FsIFBhc2NhbENhc2UgbWV0cmljIGtleS4gKi9cbmZ1bmN0aW9uIG5vcm1hbGl6ZU1ldHJpY0tleShncmFwaHFsS2V5OiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gR1JBUEhRTF9NRVRSSUNfQUxJQVNbZ3JhcGhxbEtleV0gPz8gdG9QYXNjYWxDYXNlKGdyYXBocWxLZXkpO1xufVxuXG4vKipcbiAqIERlY29kZSBhIFRyYWNrbWFuIGJhc2U2NCBhY3Rpdml0eSBJRCB0byBleHRyYWN0IHRoZSBVVUlEIHBvcnRpb24uXG4gKlxuICogVHJhY2ttYW4gZW5jb2RlcyBhY3Rpdml0eSBJRHMgYXM6IGJ0b2EoXCJTZXNzaW9uQWN0aXZpdHlcXG48dXVpZD5cIilcbiAqIFJldHVybnMgdGhlIHJhdyBpbnB1dCBzdHJpbmcgaWYgZGVjb2RpbmcgZmFpbHMgb3Igbm8gbmV3bGluZSBpcyBmb3VuZC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV4dHJhY3RBY3Rpdml0eVV1aWQoYmFzZTY0SWQ6IHN0cmluZyk6IHN0cmluZyB7XG4gIHRyeSB7XG4gICAgY29uc3QgZGVjb2RlZCA9IGF0b2IoYmFzZTY0SWQpO1xuICAgIGNvbnN0IHBhcnRzID0gZGVjb2RlZC5zcGxpdChcIlxcblwiKTtcbiAgICBjb25zdCB1dWlkID0gcGFydHNbMV0/LnRyaW0oKTtcbiAgICBpZiAoIXV1aWQpIHJldHVybiBiYXNlNjRJZDtcbiAgICByZXR1cm4gdXVpZDtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIGJhc2U2NElkO1xuICB9XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gTWFpbiBleHBvcnRlZCBwYXJzZXJcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4vKipcbiAqIENvbnZlcnQgYSBHcmFwaFFMIGFjdGl2aXR5IHJlc3BvbnNlIGludG8gdGhlIFNlc3Npb25EYXRhIGZvcm1hdC5cbiAqXG4gKiBSZXR1cm5zIG51bGwgaWYgdGhlIGFjdGl2aXR5IGlzIG1hbGZvcm1lZCwgbWlzc2luZyBhbiBJRCwgb3IgcHJvZHVjZXMgbm9cbiAqIHZhbGlkIGNsdWIgZ3JvdXBzIGFmdGVyIGZpbHRlcmluZyBlbXB0eS9udWxsIHN0cm9rZXMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZVBvcnRhbEFjdGl2aXR5KFxuICBhY3Rpdml0eTogR3JhcGhRTEFjdGl2aXR5XG4pOiBTZXNzaW9uRGF0YSB8IG51bGwge1xuICB0cnkge1xuICAgIGlmICghYWN0aXZpdHk/LmlkKSByZXR1cm4gbnVsbDtcblxuICAgIGNvbnN0IHJlcG9ydElkID0gZXh0cmFjdEFjdGl2aXR5VXVpZChhY3Rpdml0eS5pZCk7XG4gICAgY29uc3QgZGF0ZSA9IGFjdGl2aXR5LnRpbWUgPz8gXCJVbmtub3duXCI7XG4gICAgY29uc3QgYWxsTWV0cmljTmFtZXMgPSBuZXcgU2V0PHN0cmluZz4oKTtcblxuICAgIC8vIEdyb3VwIGZsYXQgc3Ryb2tlcyBieSBjbHViIG5hbWVcbiAgICBjb25zdCBjbHViTWFwID0gbmV3IE1hcDxzdHJpbmcsIFNob3RbXT4oKTtcblxuICAgIGZvciAoY29uc3Qgc3Ryb2tlIG9mIGFjdGl2aXR5LnN0cm9rZXMgPz8gW10pIHtcbiAgICAgIGlmICghc3Ryb2tlPy5tZWFzdXJlbWVudCkgY29udGludWU7XG4gICAgICBpZiAoc3Ryb2tlLmlzRGVsZXRlZCA9PT0gdHJ1ZSB8fCBzdHJva2UuaXNTaW11bGF0ZWQgPT09IHRydWUpIGNvbnRpbnVlO1xuXG4gICAgICBjb25zdCBjbHViTmFtZSA9IHN0cm9rZS5jbHViIHx8IFwiVW5rbm93blwiO1xuICAgICAgY29uc3Qgc2hvdE1ldHJpY3M6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7fTtcblxuICAgICAgZm9yIChjb25zdCBba2V5LCB2YWx1ZV0gb2YgT2JqZWN0LmVudHJpZXMoc3Ryb2tlLm1lYXN1cmVtZW50KSkge1xuICAgICAgICBpZiAodmFsdWUgPT09IG51bGwgfHwgdmFsdWUgPT09IHVuZGVmaW5lZCkgY29udGludWU7XG5cbiAgICAgICAgY29uc3QgbnVtVmFsdWUgPVxuICAgICAgICAgIHR5cGVvZiB2YWx1ZSA9PT0gXCJudW1iZXJcIiA/IHZhbHVlIDogcGFyc2VGbG9hdChTdHJpbmcodmFsdWUpKTtcbiAgICAgICAgaWYgKGlzTmFOKG51bVZhbHVlKSkgY29udGludWU7XG5cbiAgICAgICAgY29uc3Qgbm9ybWFsaXplZEtleSA9IG5vcm1hbGl6ZU1ldHJpY0tleShrZXkpO1xuICAgICAgICBzaG90TWV0cmljc1tub3JtYWxpemVkS2V5XSA9IGAke251bVZhbHVlfWA7XG4gICAgICAgIGFsbE1ldHJpY05hbWVzLmFkZChub3JtYWxpemVkS2V5KTtcbiAgICAgIH1cblxuICAgICAgaWYgKE9iamVjdC5rZXlzKHNob3RNZXRyaWNzKS5sZW5ndGggPiAwKSB7XG4gICAgICAgIGNvbnN0IHNob3RzID0gY2x1Yk1hcC5nZXQoY2x1Yk5hbWUpID8/IFtdO1xuICAgICAgICBzaG90cy5wdXNoKHtcbiAgICAgICAgICBzaG90X251bWJlcjogc2hvdHMubGVuZ3RoICsgMSxcbiAgICAgICAgICBtZXRyaWNzOiBzaG90TWV0cmljcyxcbiAgICAgICAgfSk7XG4gICAgICAgIGNsdWJNYXAuc2V0KGNsdWJOYW1lLCBzaG90cyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGNsdWJNYXAuc2l6ZSA9PT0gMCkgcmV0dXJuIG51bGw7XG5cbiAgICBjb25zdCBjbHViX2dyb3VwczogQ2x1Ykdyb3VwW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IFtjbHViTmFtZSwgc2hvdHNdIG9mIGNsdWJNYXApIHtcbiAgICAgIGNsdWJfZ3JvdXBzLnB1c2goe1xuICAgICAgICBjbHViX25hbWU6IGNsdWJOYW1lLFxuICAgICAgICBzaG90cyxcbiAgICAgICAgYXZlcmFnZXM6IHt9LFxuICAgICAgICBjb25zaXN0ZW5jeToge30sXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBjb25zdCBzZXNzaW9uOiBTZXNzaW9uRGF0YSA9IHtcbiAgICAgIGRhdGUsXG4gICAgICByZXBvcnRfaWQ6IHJlcG9ydElkLFxuICAgICAgdXJsX3R5cGU6IFwiYWN0aXZpdHlcIixcbiAgICAgIGNsdWJfZ3JvdXBzLFxuICAgICAgbWV0cmljX25hbWVzOiBBcnJheS5mcm9tKGFsbE1ldHJpY05hbWVzKS5zb3J0KCksXG4gICAgICBtZXRhZGF0YV9wYXJhbXM6IHsgYWN0aXZpdHlfaWQ6IGFjdGl2aXR5LmlkIH0sXG4gICAgfTtcblxuICAgIHJldHVybiBzZXNzaW9uO1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICBjb25zb2xlLmVycm9yKFwiW3BvcnRhbF9wYXJzZXJdIEZhaWxlZCB0byBwYXJzZSBhY3Rpdml0eTpcIiwgZXJyKTtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuIiwgIi8qKlxuICogSW1wb3J0IHN0YXR1cyB0eXBlcyBhbmQgR3JhcGhRTCBxdWVyaWVzIGZvciBwb3J0YWwgc2Vzc2lvbiBpbXBvcnQuXG4gKiBQZXIgRC0wMTogc2ltcGxlIHJlc3VsdC1vbmx5IHN0YXR1cyBcdTIwMTQgaWRsZS9pbXBvcnRpbmcvc3VjY2Vzcy9lcnJvci5cbiAqL1xuXG4vKiogSW1wb3J0IHN0YXR1cyBzdG9yZWQgaW4gY2hyb21lLnN0b3JhZ2UubG9jYWwgdW5kZXIgU1RPUkFHRV9LRVlTLklNUE9SVF9TVEFUVVMuIFBlciBELTAxLiAqL1xuZXhwb3J0IHR5cGUgSW1wb3J0U3RhdHVzID1cbiAgfCB7IHN0YXRlOiBcImlkbGVcIiB9XG4gIHwgeyBzdGF0ZTogXCJpbXBvcnRpbmdcIiB9XG4gIHwgeyBzdGF0ZTogXCJzdWNjZXNzXCIgfVxuICB8IHsgc3RhdGU6IFwiZXJyb3JcIjsgbWVzc2FnZTogc3RyaW5nIH07XG5cbi8qKiBBY3Rpdml0eSBzdW1tYXJ5IHJldHVybmVkIGJ5IEZFVENIX0FDVElWSVRJRVMgaGFuZGxlci4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQWN0aXZpdHlTdW1tYXJ5IHtcbiAgaWQ6IHN0cmluZztcbiAgZGF0ZTogc3RyaW5nO1xuICBzdHJva2VDb3VudDogbnVtYmVyIHwgbnVsbDsgIC8vIG51bGwgaWYgZmllbGQgdW5hdmFpbGFibGUgZnJvbSBBUElcbiAgdHlwZTogc3RyaW5nIHwgbnVsbDsgICAgICAgICAvLyBudWxsIGlmIGZpZWxkIHVuYXZhaWxhYmxlIGZyb20gQVBJXG59XG5cbi8qKlxuICogRmV0Y2ggcmVjZW50IGFjdGl2aXRpZXMgdmlhIG1lLmFjdGl2aXRpZXMuXG4gKiBBUEkgZmllbGQgbmFtZXM6IHRpbWUgKElTTyBkYXRlKSwga2luZCAoYWN0aXZpdHkgdHlwZSksIHN0cm9rZUNvdW50LlxuICogU2VydmljZSB3b3JrZXIgbWFwcyB0aW1lXHUyMTkyZGF0ZSwga2luZFx1MjE5MnR5cGUgZm9yIEFjdGl2aXR5U3VtbWFyeS5cbiAqL1xuZXhwb3J0IGNvbnN0IEZFVENIX0FDVElWSVRJRVNfUVVFUlkgPSBgXG4gIHF1ZXJ5IEdldFBsYXllckFjdGl2aXRpZXMge1xuICAgIG1lIHtcbiAgICAgIGFjdGl2aXRpZXMge1xuICAgICAgICBpZFxuICAgICAgICB0aW1lXG4gICAgICAgIHN0cm9rZUNvdW50XG4gICAgICAgIGtpbmRcbiAgICAgIH1cbiAgICB9XG4gIH1cbmA7XG5cbi8qKlxuICogRmV0Y2ggYSBzaW5nbGUgYWN0aXZpdHkgYnkgSUQgd2l0aCBmdWxsIHN0cm9rZSBkYXRhLlxuICogVGhlIG5vZGUoaWQ6KSBxdWVyeSBvbiBiYXNlNjQtZW5jb2RlZCBTZXNzaW9uQWN0aXZpdHkgSURzIHdhcyBjb25maXJtZWRcbiAqIHdvcmtpbmcgZHVyaW5nIFBoYXNlIDIyIHJlc2VhcmNoLlxuICogQVBJIHVzZXMgZmxhdCBzdHJva2VzIChlYWNoIHN0cm9rZSBoYXMgaXRzIG93biBjbHViIGZpZWxkKS5cbiAqL1xuLyoqXG4gKiBGcmFnbWVudCBmb3Igc3Ryb2tlIG1lYXN1cmVtZW50IGZpZWxkcyBzaGFyZWQgYWNyb3NzIGFsbCBhY3Rpdml0eSB0eXBlcy5cbiAqL1xuY29uc3QgU1RST0tFX0ZJRUxEUyA9IGBcbiAgY2x1YlxuICB0aW1lXG4gIHRhcmdldERpc3RhbmNlXG4gIGlzRGVsZXRlZFxuICBpc1NpbXVsYXRlZFxuICBtZWFzdXJlbWVudCB7XG4gICAgY2x1YlNwZWVkIGJhbGxTcGVlZCBzbWFzaEZhY3RvciBhdHRhY2tBbmdsZSBjbHViUGF0aCBmYWNlQW5nbGVcbiAgICBmYWNlVG9QYXRoIHN3aW5nRGlyZWN0aW9uIHN3aW5nUGxhbmUgZHluYW1pY0xvZnQgc3BpblJhdGUgc3BpbkF4aXMgc3BpbkxvZnRcbiAgICBsYXVuY2hBbmdsZSBsYXVuY2hEaXJlY3Rpb24gY2FycnkgdG90YWwgY2FycnlTaWRlIHRvdGFsU2lkZVxuICAgIG1heEhlaWdodCBsYW5kaW5nQW5nbGUgaGFuZ1RpbWVcbiAgfVxuYDtcblxuZXhwb3J0IGNvbnN0IElNUE9SVF9TRVNTSU9OX1FVRVJZID0gYFxuICBxdWVyeSBGZXRjaEFjdGl2aXR5QnlJZCgkaWQ6IElEISkge1xuICAgIG5vZGUoaWQ6ICRpZCkge1xuICAgICAgLi4uIG9uIFNlc3Npb25BY3Rpdml0eSB7XG4gICAgICAgIGlkIHRpbWUgc3Ryb2tlQ291bnQgc3Ryb2tlcyB7ICR7U1RST0tFX0ZJRUxEU30gfVxuICAgICAgfVxuICAgICAgLi4uIG9uIFZpcnR1YWxSYW5nZVNlc3Npb25BY3Rpdml0eSB7XG4gICAgICAgIGlkIHRpbWUgc3Ryb2tlQ291bnQgc3Ryb2tlcyB7ICR7U1RST0tFX0ZJRUxEU30gfVxuICAgICAgfVxuICAgICAgLi4uIG9uIFNob3RBbmFseXNpc1Nlc3Npb25BY3Rpdml0eSB7XG4gICAgICAgIGlkIHRpbWUgc3Ryb2tlQ291bnQgc3Ryb2tlcyB7ICR7U1RST0tFX0ZJRUxEU30gfVxuICAgICAgfVxuICAgICAgLi4uIG9uIENvbWJpbmVUZXN0QWN0aXZpdHkge1xuICAgICAgICBpZCB0aW1lIHN0cm9rZXMgeyAke1NUUk9LRV9GSUVMRFN9IH1cbiAgICAgIH1cbiAgICAgIC4uLiBvbiBSYW5nZUZpbmRNeURpc3RhbmNlQWN0aXZpdHkge1xuICAgICAgICBpZCB0aW1lIHN0cm9rZXMge1xuICAgICAgICAgIGNsdWJcbiAgICAgICAgICBpc0RlbGV0ZWRcbiAgICAgICAgICBpc1NpbXVsYXRlZFxuICAgICAgICAgIG1lYXN1cmVtZW50KG1lYXN1cmVtZW50VHlwZTogUFJPX0JBTExfTUVBU1VSRU1FTlQpIHtcbiAgICAgICAgICAgIGJhbGxTcGVlZCBiYWxsU3BpbiBzcGluQXhpc1xuICAgICAgICAgICAgY2FycnkgY2FycnlTaWRlIHRvdGFsIHRvdGFsU2lkZVxuICAgICAgICAgICAgbGFuZGluZ0FuZ2xlIGxhdW5jaEFuZ2xlIGxhdW5jaERpcmVjdGlvbiBtYXhIZWlnaHRcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbmA7XG4iLCAiLyoqXG4gKiBTZXJ2aWNlIFdvcmtlciBmb3IgVHJhY2tQdWxsIENocm9tZSBFeHRlbnNpb25cbiAqL1xuXG5pbXBvcnQgeyBTVE9SQUdFX0tFWVMgfSBmcm9tIFwiLi4vc2hhcmVkL2NvbnN0YW50c1wiO1xuaW1wb3J0IHsgd3JpdGVDc3YgfSBmcm9tIFwiLi4vc2hhcmVkL2Nzdl93cml0ZXJcIjtcbmltcG9ydCB0eXBlIHsgU2Vzc2lvbkRhdGEgfSBmcm9tIFwiLi4vbW9kZWxzL3R5cGVzXCI7XG5pbXBvcnQgeyBtaWdyYXRlTGVnYWN5UHJlZiwgREVGQVVMVF9VTklUX0NIT0lDRSwgdHlwZSBVbml0Q2hvaWNlLCB0eXBlIFNwZWVkVW5pdCwgdHlwZSBEaXN0YW5jZVVuaXQgfSBmcm9tIFwiLi4vc2hhcmVkL3VuaXRfbm9ybWFsaXphdGlvblwiO1xuaW1wb3J0IHsgc2F2ZVNlc3Npb25Ub0hpc3RvcnksIGdldEhpc3RvcnlFcnJvck1lc3NhZ2UgfSBmcm9tIFwiLi4vc2hhcmVkL2hpc3RvcnlcIjtcbmltcG9ydCB7IGhhc1BvcnRhbFBlcm1pc3Npb24gfSBmcm9tIFwiLi4vc2hhcmVkL3BvcnRhbFBlcm1pc3Npb25zXCI7XG5pbXBvcnQgeyBleGVjdXRlUXVlcnksIGNsYXNzaWZ5QXV0aFJlc3VsdCwgSEVBTFRIX0NIRUNLX1FVRVJZIH0gZnJvbSBcIi4uL3NoYXJlZC9ncmFwaHFsX2NsaWVudFwiO1xuaW1wb3J0IHsgcGFyc2VQb3J0YWxBY3Rpdml0eSB9IGZyb20gXCIuLi9zaGFyZWQvcG9ydGFsX3BhcnNlclwiO1xuaW1wb3J0IHR5cGUgeyBHcmFwaFFMQWN0aXZpdHkgfSBmcm9tIFwiLi4vc2hhcmVkL3BvcnRhbF9wYXJzZXJcIjtcbmltcG9ydCB0eXBlIHsgSW1wb3J0U3RhdHVzLCBBY3Rpdml0eVN1bW1hcnkgfSBmcm9tIFwiLi4vc2hhcmVkL2ltcG9ydF90eXBlc1wiO1xuaW1wb3J0IHsgRkVUQ0hfQUNUSVZJVElFU19RVUVSWSwgSU1QT1JUX1NFU1NJT05fUVVFUlkgfSBmcm9tIFwiLi4vc2hhcmVkL2ltcG9ydF90eXBlc1wiO1xuXG5jaHJvbWUucnVudGltZS5vbkluc3RhbGxlZC5hZGRMaXN0ZW5lcigoKSA9PiB7XG4gIGNvbnNvbGUubG9nKFwiVHJhY2tQdWxsIGV4dGVuc2lvbiBpbnN0YWxsZWRcIik7XG59KTtcblxuaW50ZXJmYWNlIFNhdmVEYXRhUmVxdWVzdCB7XG4gIHR5cGU6IFwiU0FWRV9EQVRBXCI7XG4gIGRhdGE6IFNlc3Npb25EYXRhO1xufVxuXG5pbnRlcmZhY2UgRXhwb3J0Q3N2UmVxdWVzdCB7XG4gIHR5cGU6IFwiRVhQT1JUX0NTVl9SRVFVRVNUXCI7XG59XG5cbmludGVyZmFjZSBHZXREYXRhUmVxdWVzdCB7XG4gIHR5cGU6IFwiR0VUX0RBVEFcIjtcbn1cblxuaW50ZXJmYWNlIEZldGNoQWN0aXZpdGllc1JlcXVlc3Qge1xuICB0eXBlOiBcIkZFVENIX0FDVElWSVRJRVNcIjtcbn1cblxuaW50ZXJmYWNlIEltcG9ydFNlc3Npb25SZXF1ZXN0IHtcbiAgdHlwZTogXCJJTVBPUlRfU0VTU0lPTlwiO1xuICBhY3Rpdml0eUlkOiBzdHJpbmc7XG59XG5cbmludGVyZmFjZSBQb3J0YWxBdXRoQ2hlY2tSZXF1ZXN0IHtcbiAgdHlwZTogXCJQT1JUQUxfQVVUSF9DSEVDS1wiO1xufVxuXG5mdW5jdGlvbiBpc0F1dGhFcnJvcihlcnJvcnM6IEFycmF5PHsgbWVzc2FnZTogc3RyaW5nOyBleHRlbnNpb25zPzogeyBjb2RlPzogc3RyaW5nIH0gfT4pOiBib29sZWFuIHtcbiAgaWYgKGVycm9ycy5sZW5ndGggPT09IDApIHJldHVybiBmYWxzZTtcbiAgY29uc3QgY29kZSA9IGVycm9yc1swXS5leHRlbnNpb25zPy5jb2RlID8/IFwiXCI7XG4gIGNvbnN0IG1zZyA9IGVycm9yc1swXS5tZXNzYWdlPy50b0xvd2VyQ2FzZSgpID8/IFwiXCI7XG4gIHJldHVybiBjb2RlID09PSBcIlVOQVVUSEVOVElDQVRFRFwiIHx8IG1zZy5pbmNsdWRlcyhcInVuYXV0aG9yaXplZFwiKSB8fCBtc2cuaW5jbHVkZXMoXCJ1bmF1dGhlbnRpY2F0ZWRcIikgfHwgbXNnLmluY2x1ZGVzKFwibm90IGxvZ2dlZCBpblwiKTtcbn1cblxuZnVuY3Rpb24gZ2V0RG93bmxvYWRFcnJvck1lc3NhZ2Uob3JpZ2luYWxFcnJvcjogc3RyaW5nKTogc3RyaW5nIHtcbiAgaWYgKG9yaWdpbmFsRXJyb3IuaW5jbHVkZXMoXCJpbnZhbGlkXCIpKSB7XG4gICAgcmV0dXJuIFwiSW52YWxpZCBkb3dubG9hZCBmb3JtYXRcIjtcbiAgfVxuICBpZiAob3JpZ2luYWxFcnJvci5pbmNsdWRlcyhcInF1b3RhXCIpIHx8IG9yaWdpbmFsRXJyb3IuaW5jbHVkZXMoXCJzcGFjZVwiKSkge1xuICAgIHJldHVybiBcIkluc3VmZmljaWVudCBzdG9yYWdlIHNwYWNlXCI7XG4gIH1cbiAgaWYgKG9yaWdpbmFsRXJyb3IuaW5jbHVkZXMoXCJibG9ja2VkXCIpIHx8IG9yaWdpbmFsRXJyb3IuaW5jbHVkZXMoXCJwb2xpY3lcIikpIHtcbiAgICByZXR1cm4gXCJEb3dubG9hZCBibG9ja2VkIGJ5IGJyb3dzZXIgc2V0dGluZ3NcIjtcbiAgfVxuICByZXR1cm4gb3JpZ2luYWxFcnJvcjtcbn1cblxudHlwZSBSZXF1ZXN0TWVzc2FnZSA9IFNhdmVEYXRhUmVxdWVzdCB8IEV4cG9ydENzdlJlcXVlc3QgfCBHZXREYXRhUmVxdWVzdCB8IEZldGNoQWN0aXZpdGllc1JlcXVlc3QgfCBJbXBvcnRTZXNzaW9uUmVxdWVzdCB8IFBvcnRhbEF1dGhDaGVja1JlcXVlc3Q7XG5cbmNocm9tZS5ydW50aW1lLm9uTWVzc2FnZS5hZGRMaXN0ZW5lcigobWVzc2FnZTogUmVxdWVzdE1lc3NhZ2UsIHNlbmRlciwgc2VuZFJlc3BvbnNlKSA9PiB7XG4gIGlmIChtZXNzYWdlLnR5cGUgPT09IFwiR0VUX0RBVEFcIikge1xuICAgIGNocm9tZS5zdG9yYWdlLmxvY2FsLmdldChbU1RPUkFHRV9LRVlTLlRSQUNLTUFOX0RBVEFdLCAocmVzdWx0KSA9PiB7XG4gICAgICBzZW5kUmVzcG9uc2UocmVzdWx0W1NUT1JBR0VfS0VZUy5UUkFDS01BTl9EQVRBXSB8fCBudWxsKTtcbiAgICB9KTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGlmIChtZXNzYWdlLnR5cGUgPT09IFwiU0FWRV9EQVRBXCIpIHtcbiAgICBjb25zdCBzZXNzaW9uRGF0YSA9IChtZXNzYWdlIGFzIFNhdmVEYXRhUmVxdWVzdCkuZGF0YTtcbiAgICBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoeyBbU1RPUkFHRV9LRVlTLlRSQUNLTUFOX0RBVEFdOiBzZXNzaW9uRGF0YSB9LCAoKSA9PiB7XG4gICAgICBpZiAoY2hyb21lLnJ1bnRpbWUubGFzdEVycm9yKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXCJUcmFja1B1bGw6IEZhaWxlZCB0byBzYXZlIGRhdGE6XCIsIGNocm9tZS5ydW50aW1lLmxhc3RFcnJvcik7XG4gICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogY2hyb21lLnJ1bnRpbWUubGFzdEVycm9yLm1lc3NhZ2UgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLmxvZyhcIlRyYWNrUHVsbDogU2Vzc2lvbiBkYXRhIHNhdmVkIHRvIHN0b3JhZ2VcIik7XG4gICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IHRydWUgfSk7XG5cbiAgICAgICAgLy8gSGlzdG9yeSBzYXZlIC0tIGZpcmUgYW5kIGZvcmdldCwgbmV2ZXIgYmxvY2tzIHByaW1hcnkgZmxvd1xuICAgICAgICBzYXZlU2Vzc2lvblRvSGlzdG9yeShzZXNzaW9uRGF0YSkuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJUcmFja1B1bGw6IEhpc3Rvcnkgc2F2ZSBmYWlsZWQ6XCIsIGVycik7XG4gICAgICAgICAgY29uc3QgbXNnID0gZ2V0SGlzdG9yeUVycm9yTWVzc2FnZShlcnIubWVzc2FnZSk7XG4gICAgICAgICAgY2hyb21lLnJ1bnRpbWUuc2VuZE1lc3NhZ2UoeyB0eXBlOiBcIkhJU1RPUllfRVJST1JcIiwgZXJyb3I6IG1zZyB9KS5jYXRjaCgoKSA9PiB7XG4gICAgICAgICAgICAvLyBQb3B1cCBub3Qgb3BlbiAtLSBhbHJlYWR5IGxvZ2dlZCB0byBjb25zb2xlXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgaWYgKG1lc3NhZ2UudHlwZSA9PT0gXCJFWFBPUlRfQ1NWX1JFUVVFU1RcIikge1xuICAgIGNocm9tZS5zdG9yYWdlLmxvY2FsLmdldChbU1RPUkFHRV9LRVlTLlRSQUNLTUFOX0RBVEEsIFNUT1JBR0VfS0VZUy5TUEVFRF9VTklULCBTVE9SQUdFX0tFWVMuRElTVEFOQ0VfVU5JVCwgU1RPUkFHRV9LRVlTLkhJVFRJTkdfU1VSRkFDRSwgU1RPUkFHRV9LRVlTLklOQ0xVREVfQVZFUkFHRVMsIFwidW5pdFByZWZlcmVuY2VcIl0sIChyZXN1bHQpID0+IHtcbiAgICAgIGNvbnN0IGRhdGEgPSByZXN1bHRbU1RPUkFHRV9LRVlTLlRSQUNLTUFOX0RBVEFdIGFzIFNlc3Npb25EYXRhIHwgdW5kZWZpbmVkO1xuICAgICAgaWYgKCFkYXRhIHx8ICFkYXRhLmNsdWJfZ3JvdXBzIHx8IGRhdGEuY2x1Yl9ncm91cHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogXCJObyBkYXRhIHRvIGV4cG9ydFwiIH0pO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIGxldCB1bml0Q2hvaWNlOiBVbml0Q2hvaWNlO1xuICAgICAgICBpZiAocmVzdWx0W1NUT1JBR0VfS0VZUy5TUEVFRF9VTklUXSAmJiByZXN1bHRbU1RPUkFHRV9LRVlTLkRJU1RBTkNFX1VOSVRdKSB7XG4gICAgICAgICAgdW5pdENob2ljZSA9IHtcbiAgICAgICAgICAgIHNwZWVkOiByZXN1bHRbU1RPUkFHRV9LRVlTLlNQRUVEX1VOSVRdIGFzIFNwZWVkVW5pdCxcbiAgICAgICAgICAgIGRpc3RhbmNlOiByZXN1bHRbU1RPUkFHRV9LRVlTLkRJU1RBTkNFX1VOSVRdIGFzIERpc3RhbmNlVW5pdCxcbiAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHVuaXRDaG9pY2UgPSBtaWdyYXRlTGVnYWN5UHJlZihyZXN1bHRbXCJ1bml0UHJlZmVyZW5jZVwiXSBhcyBzdHJpbmcgfCB1bmRlZmluZWQpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHN1cmZhY2UgPSAocmVzdWx0W1NUT1JBR0VfS0VZUy5ISVRUSU5HX1NVUkZBQ0VdIGFzIFwiR3Jhc3NcIiB8IFwiTWF0XCIpID8/IFwiTWF0XCI7XG4gICAgICAgIGNvbnN0IGluY2x1ZGVBdmVyYWdlcyA9IHJlc3VsdFtTVE9SQUdFX0tFWVMuSU5DTFVERV9BVkVSQUdFU10gPT09IHVuZGVmaW5lZFxuICAgICAgICAgID8gdHJ1ZVxuICAgICAgICAgIDogQm9vbGVhbihyZXN1bHRbU1RPUkFHRV9LRVlTLklOQ0xVREVfQVZFUkFHRVNdKTtcbiAgICAgICAgY29uc3QgY3N2Q29udGVudCA9IHdyaXRlQ3N2KGRhdGEsIGluY2x1ZGVBdmVyYWdlcywgdW5kZWZpbmVkLCB1bml0Q2hvaWNlLCBzdXJmYWNlKTtcbiAgICAgICAgY29uc3QgcmF3RGF0ZSA9IGRhdGEuZGF0ZSB8fCBcInVua25vd25cIjtcbiAgICAgICAgLy8gU2FuaXRpemUgZGF0ZSBmb3IgZmlsZW5hbWUgXHUyMDE0IHJlbW92ZSBjb2xvbnMgYW5kIGNoYXJhY3RlcnMgaW52YWxpZCBpbiBmaWxlbmFtZXNcbiAgICAgICAgY29uc3Qgc2FmZURhdGUgPSByYXdEYXRlLnJlcGxhY2UoL1s6Ll0vZywgXCItXCIpLnJlcGxhY2UoL1svXFxcXD8lKnxcIjw+XS9nLCBcIlwiKTtcbiAgICAgICAgY29uc3QgZmlsZW5hbWUgPSBgU2hvdERhdGFfJHtzYWZlRGF0ZX0uY3N2YDtcblxuICAgICAgICBjaHJvbWUuZG93bmxvYWRzLmRvd25sb2FkKFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHVybDogYGRhdGE6dGV4dC9jc3Y7Y2hhcnNldD11dGYtOCwke2VuY29kZVVSSUNvbXBvbmVudChjc3ZDb250ZW50KX1gLFxuICAgICAgICAgICAgZmlsZW5hbWU6IGZpbGVuYW1lLFxuICAgICAgICAgICAgc2F2ZUFzOiBmYWxzZSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIChkb3dubG9hZElkKSA9PiB7XG4gICAgICAgICAgICBpZiAoY2hyb21lLnJ1bnRpbWUubGFzdEVycm9yKSB7XG4gICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJUcmFja1B1bGw6IERvd25sb2FkIGZhaWxlZDpcIiwgY2hyb21lLnJ1bnRpbWUubGFzdEVycm9yKTtcbiAgICAgICAgICAgICAgY29uc3QgZXJyb3JNZXNzYWdlID0gZ2V0RG93bmxvYWRFcnJvck1lc3NhZ2UoY2hyb21lLnJ1bnRpbWUubGFzdEVycm9yLm1lc3NhZ2UpO1xuICAgICAgICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yTWVzc2FnZSB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBUcmFja1B1bGw6IENTViBleHBvcnRlZCB3aXRoIGRvd25sb2FkIElEICR7ZG93bmxvYWRJZH1gKTtcbiAgICAgICAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogdHJ1ZSwgZG93bmxvYWRJZCwgZmlsZW5hbWUgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICApO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIlRyYWNrUHVsbDogQ1NWIGdlbmVyYXRpb24gZmFpbGVkOlwiLCBlcnJvcik7XG4gICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpIH0pO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgaWYgKG1lc3NhZ2UudHlwZSA9PT0gXCJQT1JUQUxfQVVUSF9DSEVDS1wiKSB7XG4gICAgKGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGdyYW50ZWQgPSBhd2FpdCBoYXNQb3J0YWxQZXJtaXNzaW9uKCk7XG4gICAgICBpZiAoIWdyYW50ZWQpIHtcbiAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogdHJ1ZSwgc3RhdHVzOiBcImRlbmllZFwiIH0pO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBleGVjdXRlUXVlcnk8eyBtZTogeyBfX3R5cGVuYW1lOiBzdHJpbmcgfSB8IG51bGwgfT4oSEVBTFRIX0NIRUNLX1FVRVJZKTtcbiAgICAgICAgY29uc3QgYXV0aFN0YXR1cyA9IGNsYXNzaWZ5QXV0aFJlc3VsdChyZXN1bHQpO1xuICAgICAgICBpZiAoYXV0aFN0YXR1cy5raW5kID09PSBcImVycm9yXCIpIHtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKFwiVHJhY2tQdWxsOiBHcmFwaFFMIGhlYWx0aCBjaGVjayBlcnJvcjpcIiwgYXV0aFN0YXR1cy5tZXNzYWdlKTtcbiAgICAgICAgfVxuICAgICAgICBzZW5kUmVzcG9uc2Uoe1xuICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgc3RhdHVzOiBhdXRoU3RhdHVzLmtpbmQsXG4gICAgICAgICAgbWVzc2FnZTogYXV0aFN0YXR1cy5raW5kID09PSBcImVycm9yXCIgPyBhdXRoU3RhdHVzLm1lc3NhZ2UgOiB1bmRlZmluZWQsXG4gICAgICAgIH0pO1xuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXCJUcmFja1B1bGw6IEdyYXBoUUwgaGVhbHRoIGNoZWNrIGZhaWxlZDpcIiwgZXJyKTtcbiAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogdHJ1ZSwgc3RhdHVzOiBcImVycm9yXCIsIG1lc3NhZ2U6IFwiVW5hYmxlIHRvIHJlYWNoIFRyYWNrbWFuIFx1MjAxNCB0cnkgYWdhaW4gbGF0ZXJcIiB9KTtcbiAgICAgIH1cbiAgICB9KSgpO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgaWYgKG1lc3NhZ2UudHlwZSA9PT0gXCJGRVRDSF9BQ1RJVklUSUVTXCIpIHtcbiAgICAoYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgZ3JhbnRlZCA9IGF3YWl0IGhhc1BvcnRhbFBlcm1pc3Npb24oKTtcbiAgICAgIGlmICghZ3JhbnRlZCkge1xuICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFwiUG9ydGFsIHBlcm1pc3Npb24gbm90IGdyYW50ZWRcIiB9KTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZXhlY3V0ZVF1ZXJ5PHtcbiAgICAgICAgICBtZToge1xuICAgICAgICAgICAgYWN0aXZpdGllczogQXJyYXk8e1xuICAgICAgICAgICAgICBpZDogc3RyaW5nOyB0aW1lOiBzdHJpbmc7IHN0cm9rZUNvdW50PzogbnVtYmVyOyBraW5kPzogc3RyaW5nO1xuICAgICAgICAgICAgfT47XG4gICAgICAgICAgfTtcbiAgICAgICAgfT4oRkVUQ0hfQUNUSVZJVElFU19RVUVSWSk7XG4gICAgICAgIGlmIChyZXN1bHQuZXJyb3JzICYmIHJlc3VsdC5lcnJvcnMubGVuZ3RoID4gMCkge1xuICAgICAgICAgIGlmIChpc0F1dGhFcnJvcihyZXN1bHQuZXJyb3JzKSkge1xuICAgICAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBcIlNlc3Npb24gZXhwaXJlZCBcdTIwMTQgbG9nIGludG8gcG9ydGFsLnRyYWNrbWFuZ29sZi5jb21cIiB9KTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBcIlVuYWJsZSB0byBmZXRjaCBhY3Rpdml0aWVzIFx1MjAxNCB0cnkgYWdhaW4gbGF0ZXJcIiB9KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJhd0FjdGl2aXRpZXMgPSByZXN1bHQuZGF0YT8ubWU/LmFjdGl2aXRpZXMgPz8gW107XG4gICAgICAgIGNvbnN0IGFjdGl2aXRpZXM6IEFjdGl2aXR5U3VtbWFyeVtdID0gcmF3QWN0aXZpdGllcy5zbGljZSgwLCAyMCkubWFwKChhKSA9PiAoe1xuICAgICAgICAgIGlkOiBhLmlkLFxuICAgICAgICAgIGRhdGU6IGEudGltZSxcbiAgICAgICAgICBzdHJva2VDb3VudDogYS5zdHJva2VDb3VudCA/PyBudWxsLFxuICAgICAgICAgIHR5cGU6IGEua2luZCA/PyBudWxsLFxuICAgICAgICB9KSk7XG4gICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IHRydWUsIGFjdGl2aXRpZXMgfSk7XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIlRyYWNrUHVsbDogRmV0Y2ggYWN0aXZpdGllcyBmYWlsZWQ6XCIsIGVycik7XG4gICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogXCJVbmFibGUgdG8gZmV0Y2ggYWN0aXZpdGllcyBcdTIwMTQgdHJ5IGFnYWluIGxhdGVyXCIgfSk7XG4gICAgICB9XG4gICAgfSkoKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGlmIChtZXNzYWdlLnR5cGUgPT09IFwiSU1QT1JUX1NFU1NJT05cIikge1xuICAgIGNvbnN0IHsgYWN0aXZpdHlJZCB9ID0gbWVzc2FnZSBhcyBJbXBvcnRTZXNzaW9uUmVxdWVzdDtcbiAgICAoYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgZ3JhbnRlZCA9IGF3YWl0IGhhc1BvcnRhbFBlcm1pc3Npb24oKTtcbiAgICAgIGlmICghZ3JhbnRlZCkge1xuICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFwiUG9ydGFsIHBlcm1pc3Npb24gbm90IGdyYW50ZWRcIiB9KTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgYXdhaXQgY2hyb21lLnN0b3JhZ2UubG9jYWwuc2V0KHsgW1NUT1JBR0VfS0VZUy5JTVBPUlRfU1RBVFVTXTogeyBzdGF0ZTogXCJpbXBvcnRpbmdcIiB9IGFzIEltcG9ydFN0YXR1cyB9KTtcbiAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IHRydWUgfSk7XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGV4ZWN1dGVRdWVyeTx7IG5vZGU6IEdyYXBoUUxBY3Rpdml0eSB9PihcbiAgICAgICAgICBJTVBPUlRfU0VTU0lPTl9RVUVSWSxcbiAgICAgICAgICB7IGlkOiBhY3Rpdml0eUlkIH1cbiAgICAgICAgKTtcbiAgICAgICAgaWYgKHJlc3VsdC5lcnJvcnMgJiYgcmVzdWx0LmVycm9ycy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgaWYgKGlzQXV0aEVycm9yKHJlc3VsdC5lcnJvcnMpKSB7XG4gICAgICAgICAgICBhd2FpdCBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoeyBbU1RPUkFHRV9LRVlTLklNUE9SVF9TVEFUVVNdOiB7IHN0YXRlOiBcImVycm9yXCIsIG1lc3NhZ2U6IFwiU2Vzc2lvbiBleHBpcmVkIFx1MjAxNCBsb2cgaW50byBwb3J0YWwudHJhY2ttYW5nb2xmLmNvbVwiIH0gYXMgSW1wb3J0U3RhdHVzIH0pO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhd2FpdCBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoeyBbU1RPUkFHRV9LRVlTLklNUE9SVF9TVEFUVVNdOiB7IHN0YXRlOiBcImVycm9yXCIsIG1lc3NhZ2U6IFwiVW5hYmxlIHRvIHJlYWNoIFRyYWNrbWFuIFx1MjAxNCB0cnkgYWdhaW4gbGF0ZXJcIiB9IGFzIEltcG9ydFN0YXR1cyB9KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGFjdGl2aXR5ID0gcmVzdWx0LmRhdGE/Lm5vZGU7XG4gICAgICAgIGNvbnN0IHNlc3Npb24gPSBhY3Rpdml0eSA/IHBhcnNlUG9ydGFsQWN0aXZpdHkoYWN0aXZpdHkpIDogbnVsbDtcbiAgICAgICAgaWYgKCFzZXNzaW9uKSB7XG4gICAgICAgICAgYXdhaXQgY2hyb21lLnN0b3JhZ2UubG9jYWwuc2V0KHsgW1NUT1JBR0VfS0VZUy5JTVBPUlRfU1RBVFVTXTogeyBzdGF0ZTogXCJlcnJvclwiLCBtZXNzYWdlOiBcIk5vIHNob3QgZGF0YSBmb3VuZCBmb3IgdGhpcyBhY3Rpdml0eVwiIH0gYXMgSW1wb3J0U3RhdHVzIH0pO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBhd2FpdCBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoeyBbU1RPUkFHRV9LRVlTLlRSQUNLTUFOX0RBVEFdOiBzZXNzaW9uIH0pO1xuICAgICAgICBhd2FpdCBzYXZlU2Vzc2lvblRvSGlzdG9yeShzZXNzaW9uKTtcbiAgICAgICAgYXdhaXQgY2hyb21lLnN0b3JhZ2UubG9jYWwuc2V0KHsgW1NUT1JBR0VfS0VZUy5JTVBPUlRfU1RBVFVTXTogeyBzdGF0ZTogXCJzdWNjZXNzXCIgfSBhcyBJbXBvcnRTdGF0dXMgfSk7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiVHJhY2tQdWxsOiBTZXNzaW9uIGltcG9ydGVkIHN1Y2Nlc3NmdWxseTpcIiwgc2Vzc2lvbi5yZXBvcnRfaWQpO1xuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXCJUcmFja1B1bGw6IEltcG9ydCBmYWlsZWQ6XCIsIGVycik7XG4gICAgICAgIGF3YWl0IGNocm9tZS5zdG9yYWdlLmxvY2FsLnNldCh7IFtTVE9SQUdFX0tFWVMuSU1QT1JUX1NUQVRVU106IHsgc3RhdGU6IFwiZXJyb3JcIiwgbWVzc2FnZTogXCJJbXBvcnQgZmFpbGVkIFx1MjAxNCB0cnkgYWdhaW5cIiB9IGFzIEltcG9ydFN0YXR1cyB9KTtcbiAgICAgIH1cbiAgICB9KSgpO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLy8gUmVjZWl2ZXMgcHJlLWZldGNoZWQgR3JhcGhRTCBkYXRhIGZyb20gcG9wdXAgKGZldGNoZWQgdmlhIGNvbnRlbnQgc2NyaXB0IG9uIHBvcnRhbCBwYWdlKVxuICBpZiAobWVzc2FnZS50eXBlID09PSBcIlNBVkVfSU1QT1JURURfU0VTU0lPTlwiKSB7XG4gICAgY29uc3QgeyBncmFwaHFsRGF0YSB9ID0gbWVzc2FnZSBhcyB7IHR5cGU6IHN0cmluZzsgZ3JhcGhxbERhdGE6IHsgZGF0YT86IHsgbm9kZT86IEdyYXBoUUxBY3Rpdml0eSB9OyBlcnJvcnM/OiBBcnJheTx7IG1lc3NhZ2U6IHN0cmluZyB9PiB9OyBhY3Rpdml0eUlkOiBzdHJpbmcgfTtcbiAgICAoYXN5bmMgKCkgPT4ge1xuICAgICAgYXdhaXQgY2hyb21lLnN0b3JhZ2UubG9jYWwuc2V0KHsgW1NUT1JBR0VfS0VZUy5JTVBPUlRfU1RBVFVTXTogeyBzdGF0ZTogXCJpbXBvcnRpbmdcIiB9IGFzIEltcG9ydFN0YXR1cyB9KTtcblxuICAgICAgdHJ5IHtcbiAgICAgICAgaWYgKGdyYXBocWxEYXRhLmVycm9ycyAmJiBncmFwaHFsRGF0YS5lcnJvcnMubGVuZ3RoID4gMCkge1xuICAgICAgICAgIGF3YWl0IGNocm9tZS5zdG9yYWdlLmxvY2FsLnNldCh7IFtTVE9SQUdFX0tFWVMuSU1QT1JUX1NUQVRVU106IHsgc3RhdGU6IFwiZXJyb3JcIiwgbWVzc2FnZTogZ3JhcGhxbERhdGEuZXJyb3JzWzBdLm1lc3NhZ2UgfSBhcyBJbXBvcnRTdGF0dXMgfSk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGFjdGl2aXR5ID0gZ3JhcGhxbERhdGEuZGF0YT8ubm9kZTtcbiAgICAgICAgY29uc3Qgc2Vzc2lvbiA9IGFjdGl2aXR5ID8gcGFyc2VQb3J0YWxBY3Rpdml0eShhY3Rpdml0eSkgOiBudWxsO1xuICAgICAgICBpZiAoIXNlc3Npb24pIHtcbiAgICAgICAgICBhd2FpdCBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoeyBbU1RPUkFHRV9LRVlTLklNUE9SVF9TVEFUVVNdOiB7IHN0YXRlOiBcImVycm9yXCIsIG1lc3NhZ2U6IFwiTm8gc2hvdCBkYXRhIGZvdW5kIGZvciB0aGlzIGFjdGl2aXR5XCIgfSBhcyBJbXBvcnRTdGF0dXMgfSk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGF3YWl0IGNocm9tZS5zdG9yYWdlLmxvY2FsLnNldCh7IFtTVE9SQUdFX0tFWVMuVFJBQ0tNQU5fREFUQV06IHNlc3Npb24gfSk7XG4gICAgICAgIGF3YWl0IHNhdmVTZXNzaW9uVG9IaXN0b3J5KHNlc3Npb24pO1xuICAgICAgICBhd2FpdCBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoeyBbU1RPUkFHRV9LRVlTLklNUE9SVF9TVEFUVVNdOiB7IHN0YXRlOiBcInN1Y2Nlc3NcIiB9IGFzIEltcG9ydFN0YXR1cyB9KTtcbiAgICAgICAgY29uc29sZS5sb2coXCJUcmFja1B1bGw6IFNlc3Npb24gaW1wb3J0ZWQgc3VjY2Vzc2Z1bGx5OlwiLCBzZXNzaW9uLnJlcG9ydF9pZCk7XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIlRyYWNrUHVsbDogSW1wb3J0IGZhaWxlZDpcIiwgZXJyKTtcbiAgICAgICAgYXdhaXQgY2hyb21lLnN0b3JhZ2UubG9jYWwuc2V0KHsgW1NUT1JBR0VfS0VZUy5JTVBPUlRfU1RBVFVTXTogeyBzdGF0ZTogXCJlcnJvclwiLCBtZXNzYWdlOiBcIkltcG9ydCBmYWlsZWQgXHUyMDE0IHRyeSBhZ2FpblwiIH0gYXMgSW1wb3J0U3RhdHVzIH0pO1xuICAgICAgfVxuICAgIH0pKCk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbn0pO1xuXG5jaHJvbWUuc3RvcmFnZS5vbkNoYW5nZWQuYWRkTGlzdGVuZXIoKGNoYW5nZXMsIG5hbWVzcGFjZSkgPT4ge1xuICBpZiAobmFtZXNwYWNlID09PSBcImxvY2FsXCIgJiYgY2hhbmdlc1tTVE9SQUdFX0tFWVMuVFJBQ0tNQU5fREFUQV0pIHtcbiAgICBjb25zdCBuZXdWYWx1ZSA9IGNoYW5nZXNbU1RPUkFHRV9LRVlTLlRSQUNLTUFOX0RBVEFdLm5ld1ZhbHVlO1xuICAgIGNocm9tZS5ydW50aW1lLnNlbmRNZXNzYWdlKHsgdHlwZTogXCJEQVRBX1VQREFURURcIiwgZGF0YTogbmV3VmFsdWUgfSkuY2F0Y2goKCkgPT4ge1xuICAgICAgLy8gSWdub3JlIGVycm9ycyB3aGVuIG5vIHBvcHVwIGlzIGxpc3RlbmluZ1xuICAgIH0pO1xuICB9XG59KTtcbiJdLAogICJtYXBwaW5ncyI6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
