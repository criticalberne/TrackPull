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
      if (code === "UNAUTHENTICATED" || msgLower.includes("unauthorized") || msgLower.includes("not authorized") || msgLower.includes("unauthenticated") || msgLower.includes("not logged in")) {
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
  function isRecord(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }
  function pickClubName(value) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (!isRecord(value)) return null;
    const candidate = value.name ?? value.Name ?? value.displayName ?? value.shortName ?? value.id;
    return typeof candidate === "string" && candidate.trim() ? candidate.trim() : null;
  }
  function getContainerClubName(container) {
    return pickClubName(container.club) ?? pickClubName(container.Club) ?? pickClubName(container.clubName) ?? pickClubName(container.name);
  }
  function getStrokeMeasurement(stroke) {
    const normalized = isRecord(stroke.NormalizedMeasurement) ? stroke.NormalizedMeasurement : null;
    const measurement = isRecord(stroke.measurement) ? stroke.measurement : isRecord(stroke.Measurement) ? stroke.Measurement : null;
    if (measurement && normalized) {
      return { ...measurement, ...normalized };
    }
    return normalized ?? measurement;
  }
  function appendStroke(stroke, fallbackClub, clubMap, allMetricNames) {
    if (stroke.isDeleted === true || stroke.isSimulated === true) return;
    const measurement = getStrokeMeasurement(stroke);
    if (!measurement) return;
    const clubName = getContainerClubName(stroke) ?? fallbackClub ?? "Unknown";
    const shotMetrics = {};
    for (const [key, value] of Object.entries(measurement)) {
      if (value === null || value === void 0) continue;
      const numValue = typeof value === "number" ? value : parseFloat(String(value));
      if (isNaN(numValue)) continue;
      const normalizedKey = normalizeMetricKey(key);
      shotMetrics[normalizedKey] = `${numValue}`;
      allMetricNames.add(normalizedKey);
    }
    if (Object.keys(shotMetrics).length === 0) return;
    const shots = clubMap.get(clubName) ?? [];
    shots.push({
      shot_number: shots.length,
      metrics: shotMetrics
    });
    clubMap.set(clubName, shots);
  }
  function collectStrokes(value, fallbackClub, clubMap, allMetricNames) {
    if (Array.isArray(value)) {
      for (const item of value) {
        collectStrokes(item, fallbackClub, clubMap, allMetricNames);
      }
      return;
    }
    if (!isRecord(value)) return;
    const containerClub = getContainerClubName(value) ?? fallbackClub;
    if (getStrokeMeasurement(value)) {
      appendStroke(value, containerClub, clubMap, allMetricNames);
      return;
    }
    for (const [key, nested] of Object.entries(value)) {
      if (key === "measurement" || key === "Measurement" || key === "NormalizedMeasurement") {
        continue;
      }
      if (Array.isArray(nested) || isRecord(nested)) {
        collectStrokes(nested, containerClub, clubMap, allMetricNames);
      }
    }
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
      const date = activity.time ?? activity.date ?? "Unknown";
      const allMetricNames = /* @__PURE__ */ new Set();
      const clubMap = /* @__PURE__ */ new Map();
      collectStrokes(activity, null, clubMap, allMetricNames);
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
        metadata_params: {
          activity_id: activity.id,
          ...activity.__typename ? { activity_type: activity.__typename } : {},
          ...activity.kind ? { activity_kind: activity.kind } : {}
        }
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
  function isSupportedPortalActivityType(type) {
    return type !== null && SUPPORTED_ACTIVITY_TYPES.has(type);
  }
  function getActivityType(record) {
    if (typeof record.__typename === "string") return record.__typename;
    if (typeof record.type === "string") return record.type;
    if (typeof record.kind === "string") return record.kind;
    return null;
  }
  function getCourseName(record) {
    const course = record.course;
    if (!course || typeof course !== "object") return null;
    const courseRecord = course;
    if (typeof courseRecord.displayName === "string" && courseRecord.displayName.trim()) {
      return courseRecord.displayName;
    }
    if (typeof courseRecord.name === "string" && courseRecord.name.trim()) {
      return courseRecord.name;
    }
    return null;
  }
  function normalizeActivityRecord(value) {
    if (!value || typeof value !== "object") return null;
    const record = value;
    if (typeof record.id !== "string") return null;
    const rawDate = record.time ?? record.date;
    const rawType = getActivityType(record);
    const rawKind = typeof record.kind === "string" ? record.kind : null;
    const type = isSupportedPortalActivityType(rawType) ? rawType : isSupportedPortalActivityType(rawKind) ? rawKind : null;
    if (!type) return null;
    return {
      id: record.id,
      date: typeof rawDate === "string" ? rawDate : "",
      strokeCount: typeof record.strokeCount === "number" ? record.strokeCount : null,
      type,
      courseName: getCourseName(record)
    };
  }
  function normalizeActivitySummaryPage(data) {
    const emptyPage = {
      activities: [],
      itemCount: 0,
      totalCount: null,
      hasNextPage: null
    };
    if (!data || typeof data !== "object") return emptyPage;
    const record = data;
    const me = record.me && typeof record.me === "object" ? record.me : void 0;
    const roots = [me?.activities, record.activities];
    for (const root of roots) {
      let candidates = [];
      let totalCount = null;
      let hasNextPage = null;
      if (Array.isArray(root)) {
        candidates = root;
      } else if (root && typeof root === "object") {
        const rootRecord = root;
        totalCount = typeof rootRecord.totalCount === "number" ? rootRecord.totalCount : null;
        const pageInfo = rootRecord.pageInfo;
        if (pageInfo && typeof pageInfo === "object") {
          const pageInfoRecord = pageInfo;
          hasNextPage = typeof pageInfoRecord.hasNextPage === "boolean" ? pageInfoRecord.hasNextPage : null;
        }
        if (Array.isArray(rootRecord.items)) {
          candidates = rootRecord.items;
        } else if (Array.isArray(rootRecord.nodes)) {
          candidates = rootRecord.nodes;
        } else if (Array.isArray(rootRecord.edges)) {
          candidates = rootRecord.edges.map((edge) => edge && typeof edge === "object" ? edge.node : null);
        }
      }
      const activities = candidates.map(normalizeActivityRecord).filter((activity) => Boolean(activity));
      if (candidates.length > 0 || totalCount !== null || hasNextPage !== null) {
        return {
          activities,
          itemCount: candidates.length,
          totalCount,
          hasNextPage
        };
      }
    }
    return emptyPage;
  }
  function normalizeActivitySummaries(data) {
    return normalizeActivitySummaryPage(data).activities;
  }
  function flatStrokeActivityQuery(typeName) {
    return {
      label: `${typeName}:strokes`,
      query: `
      query FetchActivityById($id: ID!) {
        node(id: $id) {
          __typename
          ... on ${typeName} {
            id time
            strokes { ${STROKE_FIELDS} }
          }
        }
      }
    `
    };
  }
  function groupedStrokeActivityQuery(typeName) {
    return {
      label: `${typeName}:strokeGroups`,
      query: `
      query FetchActivityById($id: ID!) {
        node(id: $id) {
          __typename
          ... on ${typeName} {
            id time
            strokeGroups {
              club
              name
              strokes { ${STROKE_FIELDS} }
            }
          }
        }
      }
    `
    };
  }
  function proBallActivityQuery(typeName) {
    return {
      label: `${typeName}:PRO_BALL_MEASUREMENT`,
      query: `
      query FetchActivityById($id: ID!) {
        node(id: $id) {
          __typename
          ... on ${typeName} {
            id time
            strokes {
              club
              time
              targetDistance
              measurement(measurementType: PRO_BALL_MEASUREMENT) {
                ballSpeed ballSpin spinAxis
                carry carrySide total totalSide
                landingAngle launchAngle launchDirection maxHeight
              }
            }
          }
        }
      }
    `
    };
  }
  function groupedProBallActivityQuery(typeName) {
    return {
      label: `${typeName}:strokeGroups:PRO_BALL_MEASUREMENT`,
      query: `
      query FetchActivityById($id: ID!) {
        node(id: $id) {
          __typename
          ... on ${typeName} {
            id time
            strokeGroups {
              club
              name
              strokes {
                club
                time
                targetDistance
                measurement(measurementType: PRO_BALL_MEASUREMENT) {
                  ballSpeed ballSpin spinAxis
                  carry carrySide total totalSide
                  landingAngle launchAngle launchDirection maxHeight
                }
              }
            }
          }
        }
      }
    `
    };
  }
  function scorecardShotActivityQuery(typeName, measurementKind) {
    return {
      label: `${typeName}:scorecard.shots:${measurementKind}`,
      query: `
      query FetchActivityById($id: ID!) {
        node(id: $id) {
          __typename
          ... on ${typeName} {
            id time kind
            scorecard {
              holes {
                holeNumber
                shots {
                  id
                  shotNumber
                  club
                  launchTime
                  total
                  measurement(shotMeasurementKind: ${measurementKind}) {
                    ${SCORECARD_SHOT_MEASUREMENT_FIELDS}
                  }
                }
              }
            }
          }
        }
      }
    `
    };
  }
  var FETCH_ACTIVITIES_PAGE_SIZE, FETCH_ACTIVITIES_MAX_PAGES, ACTIVITY_SUMMARY_FIELDS, ACTIVITY_COURSE_SUMMARY_FIELDS, ACTIVITY_MINIMAL_TIME_FIELDS, ACTIVITY_MINIMAL_DATE_FIELDS, FETCH_ACTIVITIES_QUERY, FETCH_ACTIVITIES_QUERY_CANDIDATES, SUPPORTED_ACTIVITY_TYPES, STROKE_MEASUREMENT_FIELDS, SCORECARD_SHOT_MEASUREMENT_FIELDS, STROKE_FIELDS, IMPORT_SESSION_QUERY, IMPORT_SESSION_FALLBACK_QUERIES, IMPORT_SESSION_QUERY_CANDIDATES;
  var init_import_types = __esm({
    "src/shared/import_types.ts"() {
      FETCH_ACTIVITIES_PAGE_SIZE = 100;
      FETCH_ACTIVITIES_MAX_PAGES = 100;
      ACTIVITY_SUMMARY_FIELDS = `
  id
  time
  kind
  __typename
  ... on CoursePlayActivity {
    course {
      displayName
    }
  }
  ... on MapMyBagSessionActivity {
    strokeCount
  }
`;
      ACTIVITY_COURSE_SUMMARY_FIELDS = `
  id
  time
  __typename
  ... on CoursePlayActivity {
    course {
      displayName
    }
  }
`;
      ACTIVITY_MINIMAL_TIME_FIELDS = `
  id
  time
  __typename
`;
      ACTIVITY_MINIMAL_DATE_FIELDS = `
  id
  date
  __typename
`;
      FETCH_ACTIVITIES_QUERY = `
  query GetPlayerActivities($skip: Int!, $take: Int!) {
    me {
      activities(kinds: [COURSE_PLAY, MAP_MY_BAG], skip: $skip, take: $take) {
        totalCount
        pageInfo {
          hasNextPage
        }
        items {
          ${ACTIVITY_SUMMARY_FIELDS}
        }
      }
    }
  }
`;
      FETCH_ACTIVITIES_QUERY_CANDIDATES = [
        { label: "me.activities.items:kinds-page", query: FETCH_ACTIVITIES_QUERY, paginated: true },
        {
          label: "me.activities.items:all-page",
          paginated: true,
          query: `
      query GetPlayerActivities($skip: Int!, $take: Int!) {
        me {
          activities(skip: $skip, take: $take) {
            totalCount
            pageInfo {
              hasNextPage
            }
            items {
              ${ACTIVITY_SUMMARY_FIELDS}
            }
          }
        }
      }
    `
        },
        {
          label: "me.activities.items:course-time",
          query: `
      query GetPlayerActivities {
        me {
          activities {
            items {
              ${ACTIVITY_COURSE_SUMMARY_FIELDS}
            }
          }
        }
      }
    `
        },
        {
          label: "me.activities.items:date",
          query: `
      query GetPlayerActivities {
        me {
          activities {
            items {
              ${ACTIVITY_MINIMAL_DATE_FIELDS}
            }
          }
        }
      }
    `
        },
        {
          label: "me.activities.nodes:time",
          query: `
      query GetPlayerActivities {
        me {
          activities {
            nodes {
              ${ACTIVITY_MINIMAL_TIME_FIELDS}
            }
          }
        }
      }
    `
        },
        {
          label: "me.activities.nodes:date",
          query: `
      query GetPlayerActivities {
        me {
          activities {
            nodes {
              ${ACTIVITY_MINIMAL_DATE_FIELDS}
            }
          }
        }
      }
    `
        },
        {
          label: "me.activities.connection:time",
          query: `
      query GetPlayerActivities {
        me {
          activities(first: 20) {
            edges {
              node {
                id
                time
                __typename
              }
            }
          }
        }
      }
    `
        },
        {
          label: "me.activities.connection:date",
          query: `
      query GetPlayerActivities {
        me {
          activities(first: 20) {
            edges {
              node {
                id
                date
                __typename
              }
            }
          }
        }
      }
    `
        }
      ];
      SUPPORTED_ACTIVITY_TYPES = /* @__PURE__ */ new Set([
        "CoursePlayActivity",
        "CourseSessionActivity",
        "COURSE_PLAY",
        "MapMyBagActivity",
        "MapMyBagSessionActivity",
        "BagMappingActivity",
        "MAP_MY_BAG"
      ]);
      STROKE_MEASUREMENT_FIELDS = `
  clubSpeed ballSpeed smashFactor attackAngle clubPath faceAngle
  faceToPath swingDirection swingPlane dynamicLoft spinRate spinAxis spinLoft
  launchAngle launchDirection carry total carrySide totalSide
  maxHeight landingAngle hangTime
`;
      SCORECARD_SHOT_MEASUREMENT_FIELDS = `
  ballSpeed carrySideActual carryActual launchDirection maxHeight carry total
  carrySide launchAngle spinRate spinAxis backswingTime forwardswingTime tempo
  strokeLength dynamicLie impactOffset impactHeight skidDistance rollPercentage
  rollSpeed speedDrop rollDeceleration effectiveStimp flatStimp break bounces
  entrySpeedDistance elevation slopePercentageSide slopePercentageRise
  totalBreak attackAngle clubPath clubSpeed dynamicLoft faceAngle faceToPath
  smashFactor gyroSpinAngle spinLoft swingDirection swingPlane swingRadius
`;
      STROKE_FIELDS = `
  club
  time
  targetDistance
  measurement {
    ${STROKE_MEASUREMENT_FIELDS}
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
      IMPORT_SESSION_FALLBACK_QUERIES = [
        scorecardShotActivityQuery("CoursePlayActivity", "NORMALIZED_MEASUREMENT"),
        scorecardShotActivityQuery("CoursePlayActivity", "MEASUREMENT"),
        scorecardShotActivityQuery("CoursePlayActivity", "PRO_BALL_MEASUREMENT"),
        flatStrokeActivityQuery("CoursePlayActivity"),
        groupedStrokeActivityQuery("CoursePlayActivity"),
        scorecardShotActivityQuery("CourseSessionActivity", "NORMALIZED_MEASUREMENT"),
        scorecardShotActivityQuery("CourseSessionActivity", "MEASUREMENT"),
        scorecardShotActivityQuery("CourseSessionActivity", "PRO_BALL_MEASUREMENT"),
        flatStrokeActivityQuery("CourseSessionActivity"),
        groupedStrokeActivityQuery("CourseSessionActivity"),
        flatStrokeActivityQuery("VirtualGolfActivity"),
        groupedStrokeActivityQuery("VirtualGolfActivity"),
        flatStrokeActivityQuery("VirtualGolfSessionActivity"),
        groupedStrokeActivityQuery("VirtualGolfSessionActivity"),
        flatStrokeActivityQuery("MapMyBagActivity"),
        groupedStrokeActivityQuery("MapMyBagActivity"),
        flatStrokeActivityQuery("MapMyBagSessionActivity"),
        groupedStrokeActivityQuery("MapMyBagSessionActivity"),
        flatStrokeActivityQuery("BagMappingActivity"),
        groupedStrokeActivityQuery("BagMappingActivity"),
        proBallActivityQuery("MapMyBagActivity"),
        groupedProBallActivityQuery("MapMyBagActivity"),
        proBallActivityQuery("MapMyBagSessionActivity"),
        groupedProBallActivityQuery("MapMyBagSessionActivity")
      ];
      IMPORT_SESSION_QUERY_CANDIDATES = [
        { label: "default", query: IMPORT_SESSION_QUERY },
        ...IMPORT_SESSION_FALLBACK_QUERIES
      ];
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
        return code === "UNAUTHENTICATED" || msg.includes("unauthorized") || msg.includes("not authorized") || msg.includes("unauthenticated") || msg.includes("not logged in");
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
      function parseImportedSession(payloads) {
        for (const payload of payloads) {
          if (payload.errors && payload.errors.length > 0) continue;
          const activity = payload.data?.node;
          const session = activity ? parsePortalActivity(activity) : null;
          if (session) return session;
        }
        return null;
      }
      function appendUniqueActivities(target, seenIds, activities) {
        for (const activity of activities) {
          if (seenIds.has(activity.id)) continue;
          seenIds.add(activity.id);
          target.push(activity);
        }
      }
      async function fetchActivitiesForCandidate(candidate) {
        if (!candidate.paginated) {
          const result = await executeQuery(candidate.query);
          if (result.errors && result.errors.length > 0) {
            return { errors: result.errors };
          }
          return { activities: normalizeActivitySummaries(result.data) };
        }
        const activities = [];
        const seenIds = /* @__PURE__ */ new Set();
        let skip = 0;
        for (let page = 0; page < FETCH_ACTIVITIES_MAX_PAGES; page += 1) {
          const result = await executeQuery(
            candidate.query,
            { skip, take: FETCH_ACTIVITIES_PAGE_SIZE }
          );
          if (result.errors && result.errors.length > 0) {
            return { errors: result.errors };
          }
          const summaryPage = normalizeActivitySummaryPage(result.data);
          appendUniqueActivities(activities, seenIds, summaryPage.activities);
          const consumedCount = skip + summaryPage.itemCount;
          if (summaryPage.hasNextPage === false || summaryPage.itemCount === 0 || summaryPage.hasNextPage === null && summaryPage.itemCount < FETCH_ACTIVITIES_PAGE_SIZE || summaryPage.totalCount !== null && consumedCount >= summaryPage.totalCount) {
            return { activities };
          }
          skip = consumedCount;
        }
        return { activities };
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
              let firstError;
              for (const candidate of FETCH_ACTIVITIES_QUERY_CANDIDATES) {
                const result = await fetchActivitiesForCandidate(candidate);
                if (result.errors && result.errors.length > 0) {
                  firstError = firstError ?? result.errors;
                  continue;
                }
                sendResponse({ success: true, activities: result.activities ?? [] });
                return;
              }
              if (firstError && isAuthError(firstError)) {
                sendResponse({ success: false, error: "Session expired \u2014 log into portal.trackmangolf.com" });
              } else {
                sendResponse({ success: false, error: "Unable to fetch activities \u2014 try again later" });
              }
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
              let session = null;
              for (const candidate of IMPORT_SESSION_QUERY_CANDIDATES) {
                const result = await executeQuery(
                  candidate.query,
                  { id: activityId }
                );
                if (result.errors && result.errors.length > 0) {
                  if (isAuthError(result.errors)) {
                    await chrome.storage.local.set({ [STORAGE_KEYS.IMPORT_STATUS]: { state: "error", message: "Session expired \u2014 log into portal.trackmangolf.com" } });
                    return;
                  }
                  if (candidate.label === "default") {
                    await chrome.storage.local.set({ [STORAGE_KEYS.IMPORT_STATUS]: { state: "error", message: "Unable to reach Trackman \u2014 try again later" } });
                    return;
                  }
                  console.warn("TrackPull: Import query candidate failed:", candidate.label, result.errors[0].message);
                  continue;
                }
                const activity = result.data?.node;
                session = activity ? parsePortalActivity(activity) : null;
                if (session) break;
              }
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
          const { graphqlData, graphqlPayloads } = message;
          sendResponse({ success: true });
          (async () => {
            await chrome.storage.local.set({ [STORAGE_KEYS.IMPORT_STATUS]: { state: "importing" } });
            try {
              const payloads = graphqlPayloads ?? (graphqlData ? [graphqlData] : []);
              const firstError = payloads.find((payload) => payload.errors && payload.errors.length > 0)?.errors?.[0];
              const hasPayloadWithoutErrors = payloads.some((payload) => !payload.errors || payload.errors.length === 0);
              if (firstError && !hasPayloadWithoutErrors) {
                await chrome.storage.local.set({ [STORAGE_KEYS.IMPORT_STATUS]: { state: "error", message: firstError.message } });
                return;
              }
              const session = parseImportedSession(payloads);
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
          return false;
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL3NoYXJlZC9jb25zdGFudHMudHMiLCAiLi4vc3JjL3NoYXJlZC91bml0X25vcm1hbGl6YXRpb24udHMiLCAiLi4vc3JjL3NoYXJlZC9jc3Zfd3JpdGVyLnRzIiwgIi4uL3NyYy9zaGFyZWQvaGlzdG9yeS50cyIsICIuLi9zcmMvc2hhcmVkL3BvcnRhbFBlcm1pc3Npb25zLnRzIiwgIi4uL3NyYy9zaGFyZWQvZ3JhcGhxbF9jbGllbnQudHMiLCAiLi4vc3JjL3NoYXJlZC9wb3J0YWxfcGFyc2VyLnRzIiwgIi4uL3NyYy9zaGFyZWQvaW1wb3J0X3R5cGVzLnRzIiwgIi4uL3NyYy9iYWNrZ3JvdW5kL3NlcnZpY2VXb3JrZXIudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbIi8qKlxuICogU2hhcmVkIGNvbnN0YW50cyBpbmNsdWRpbmcgQ1NTIHNlbGVjdG9ycyBhbmQgY29uZmlndXJhdGlvbi5cbiAqIEJhc2VkIG9uIFB5dGhvbiBzY3JhcGVyIGNvbnN0YW50cy5weSBpbXBsZW1lbnRhdGlvbi5cbiAqL1xuXG4vLyBDb21wbGV0ZSBsaXN0IG9mIGFsbCBrbm93biBUcmFja21hbiBtZXRyaWNzIChVUkwgcGFyYW1ldGVyIG5hbWVzKVxuZXhwb3J0IGNvbnN0IEFMTF9NRVRSSUNTID0gW1xuICBcIkNsdWJTcGVlZFwiLFxuICBcIkJhbGxTcGVlZFwiLFxuICBcIlNtYXNoRmFjdG9yXCIsXG4gIFwiQXR0YWNrQW5nbGVcIixcbiAgXCJDbHViUGF0aFwiLFxuICBcIkZhY2VBbmdsZVwiLFxuICBcIkZhY2VUb1BhdGhcIixcbiAgXCJTd2luZ0RpcmVjdGlvblwiLFxuICBcIkR5bmFtaWNMb2Z0XCIsXG4gIFwiU3BpblJhdGVcIixcbiAgXCJTcGluQXhpc1wiLFxuICBcIlNwaW5Mb2Z0XCIsXG4gIFwiTGF1bmNoQW5nbGVcIixcbiAgXCJMYXVuY2hEaXJlY3Rpb25cIixcbiAgXCJDYXJyeVwiLFxuICBcIlRvdGFsXCIsXG4gIFwiU2lkZVwiLFxuICBcIlNpZGVUb3RhbFwiLFxuICBcIkNhcnJ5U2lkZVwiLFxuICBcIlRvdGFsU2lkZVwiLFxuICBcIkhlaWdodFwiLFxuICBcIk1heEhlaWdodFwiLFxuICBcIkN1cnZlXCIsXG4gIFwiTGFuZGluZ0FuZ2xlXCIsXG4gIFwiSGFuZ1RpbWVcIixcbiAgXCJMb3dQb2ludERpc3RhbmNlXCIsXG4gIFwiSW1wYWN0SGVpZ2h0XCIsXG4gIFwiSW1wYWN0T2Zmc2V0XCIsXG4gIFwiVGVtcG9cIixcbl0gYXMgY29uc3Q7XG5cbi8vIE1ldHJpY3Mgc3BsaXQgaW50byBncm91cHMgZm9yIG11bHRpLXBhZ2UtbG9hZCBIVE1MIGZhbGxiYWNrXG5leHBvcnQgY29uc3QgTUVUUklDX0dST1VQUyA9IFtcbiAgW1xuICAgIFwiQ2x1YlNwZWVkXCIsXG4gICAgXCJCYWxsU3BlZWRcIixcbiAgICBcIlNtYXNoRmFjdG9yXCIsXG4gICAgXCJBdHRhY2tBbmdsZVwiLFxuICAgIFwiQ2x1YlBhdGhcIixcbiAgICBcIkZhY2VBbmdsZVwiLFxuICAgIFwiRmFjZVRvUGF0aFwiLFxuICAgIFwiU3dpbmdEaXJlY3Rpb25cIixcbiAgICBcIkR5bmFtaWNMb2Z0XCIsXG4gICAgXCJTcGluTG9mdFwiLFxuICBdLFxuICBbXG4gICAgXCJTcGluUmF0ZVwiLFxuICAgIFwiU3BpbkF4aXNcIixcbiAgICBcIkxhdW5jaEFuZ2xlXCIsXG4gICAgXCJMYXVuY2hEaXJlY3Rpb25cIixcbiAgICBcIkNhcnJ5XCIsXG4gICAgXCJUb3RhbFwiLFxuICAgIFwiU2lkZVwiLFxuICAgIFwiU2lkZVRvdGFsXCIsXG4gICAgXCJDYXJyeVNpZGVcIixcbiAgICBcIlRvdGFsU2lkZVwiLFxuICAgIFwiSGVpZ2h0XCIsXG4gICAgXCJNYXhIZWlnaHRcIixcbiAgICBcIkN1cnZlXCIsXG4gICAgXCJMYW5kaW5nQW5nbGVcIixcbiAgICBcIkhhbmdUaW1lXCIsXG4gICAgXCJMb3dQb2ludERpc3RhbmNlXCIsXG4gICAgXCJJbXBhY3RIZWlnaHRcIixcbiAgICBcIkltcGFjdE9mZnNldFwiLFxuICAgIFwiVGVtcG9cIixcbiAgXSxcbl0gYXMgY29uc3Q7XG5cbi8vIERpc3BsYXkgbmFtZXM6IFVSTCBwYXJhbSBuYW1lIC0+IGh1bWFuLXJlYWRhYmxlIENTViBoZWFkZXJcbmV4cG9ydCBjb25zdCBNRVRSSUNfRElTUExBWV9OQU1FUzogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcbiAgQ2x1YlNwZWVkOiBcIkNsdWIgU3BlZWRcIixcbiAgQmFsbFNwZWVkOiBcIkJhbGwgU3BlZWRcIixcbiAgU21hc2hGYWN0b3I6IFwiU21hc2ggRmFjdG9yXCIsXG4gIEF0dGFja0FuZ2xlOiBcIkF0dGFjayBBbmdsZVwiLFxuICBDbHViUGF0aDogXCJDbHViIFBhdGhcIixcbiAgRmFjZUFuZ2xlOiBcIkZhY2UgQW5nbGVcIixcbiAgRmFjZVRvUGF0aDogXCJGYWNlIFRvIFBhdGhcIixcbiAgU3dpbmdEaXJlY3Rpb246IFwiU3dpbmcgRGlyZWN0aW9uXCIsXG4gIER5bmFtaWNMb2Z0OiBcIkR5bmFtaWMgTG9mdFwiLFxuICBTcGluUmF0ZTogXCJTcGluIFJhdGVcIixcbiAgU3BpbkF4aXM6IFwiU3BpbiBBeGlzXCIsXG4gIFNwaW5Mb2Z0OiBcIlNwaW4gTG9mdFwiLFxuICBMYXVuY2hBbmdsZTogXCJMYXVuY2ggQW5nbGVcIixcbiAgTGF1bmNoRGlyZWN0aW9uOiBcIkxhdW5jaCBEaXJlY3Rpb25cIixcbiAgQ2Fycnk6IFwiQ2FycnlcIixcbiAgVG90YWw6IFwiVG90YWxcIixcbiAgU2lkZTogXCJTaWRlXCIsXG4gIFNpZGVUb3RhbDogXCJTaWRlIFRvdGFsXCIsXG4gIENhcnJ5U2lkZTogXCJDYXJyeSBTaWRlXCIsXG4gIFRvdGFsU2lkZTogXCJUb3RhbCBTaWRlXCIsXG4gIEhlaWdodDogXCJIZWlnaHRcIixcbiAgTWF4SGVpZ2h0OiBcIk1heCBIZWlnaHRcIixcbiAgQ3VydmU6IFwiQ3VydmVcIixcbiAgTGFuZGluZ0FuZ2xlOiBcIkxhbmRpbmcgQW5nbGVcIixcbiAgSGFuZ1RpbWU6IFwiSGFuZyBUaW1lXCIsXG4gIExvd1BvaW50RGlzdGFuY2U6IFwiTG93IFBvaW50XCIsXG4gIEltcGFjdEhlaWdodDogXCJJbXBhY3QgSGVpZ2h0XCIsXG4gIEltcGFjdE9mZnNldDogXCJJbXBhY3QgT2Zmc2V0XCIsXG4gIFRlbXBvOiBcIlRlbXBvXCIsXG59O1xuXG4vLyBDU1MgY2xhc3Mgc2VsZWN0b3JzIChmcm9tIFRyYWNrbWFuJ3MgcmVuZGVyZWQgSFRNTClcbmV4cG9ydCBjb25zdCBDU1NfREFURSA9IFwiZGF0ZVwiO1xuZXhwb3J0IGNvbnN0IENTU19SRVNVTFRTX1dSQVBQRVIgPSBcInBsYXllci1hbmQtcmVzdWx0cy10YWJsZS13cmFwcGVyXCI7XG5leHBvcnQgY29uc3QgQ1NTX1JFU1VMVFNfVEFCTEUgPSBcIlJlc3VsdHNUYWJsZVwiO1xuZXhwb3J0IGNvbnN0IENTU19DTFVCX1RBRyA9IFwiZ3JvdXAtdGFnXCI7XG5leHBvcnQgY29uc3QgQ1NTX1BBUkFNX05BTUVTX1JPVyA9IFwicGFyYW1ldGVyLW5hbWVzLXJvd1wiO1xuZXhwb3J0IGNvbnN0IENTU19QQVJBTV9OQU1FID0gXCJwYXJhbWV0ZXItbmFtZVwiO1xuZXhwb3J0IGNvbnN0IENTU19TSE9UX0RFVEFJTF9ST1cgPSBcInJvdy13aXRoLXNob3QtZGV0YWlsc1wiO1xuZXhwb3J0IGNvbnN0IENTU19BVkVSQUdFX1ZBTFVFUyA9IFwiYXZlcmFnZS12YWx1ZXNcIjtcbmV4cG9ydCBjb25zdCBDU1NfQ09OU0lTVEVOQ1lfVkFMVUVTID0gXCJjb25zaXN0ZW5jeS12YWx1ZXNcIjtcblxuLy8gQVBJIFVSTCBwYXR0ZXJucyB0aGF0IGxpa2VseSBpbmRpY2F0ZSBhbiBBUEkgZGF0YSByZXNwb25zZVxuZXhwb3J0IGNvbnN0IEFQSV9VUkxfUEFUVEVSTlMgPSBbXG4gIFwiYXBpLnRyYWNrbWFuZ29sZi5jb21cIixcbiAgXCJ0cmFja21hbmdvbGYuY29tL2FwaVwiLFxuICBcIi9hcGkvXCIsXG4gIFwiL3JlcG9ydHMvXCIsXG4gIFwiL2FjdGl2aXRpZXMvXCIsXG4gIFwiL3Nob3RzL1wiLFxuICBcImdyYXBocWxcIixcbl07XG5cbi8vIFRpbWVvdXRzIChtaWxsaXNlY29uZHMpXG5leHBvcnQgY29uc3QgUEFHRV9MT0FEX1RJTUVPVVQgPSAzMF8wMDA7XG5leHBvcnQgY29uc3QgREFUQV9MT0FEX1RJTUVPVVQgPSAxNV8wMDA7XG5cbi8vIFRyYWNrbWFuIGJhc2UgVVJMXG5leHBvcnQgY29uc3QgQkFTRV9VUkwgPSBcImh0dHBzOi8vd2ViLWR5bmFtaWMtcmVwb3J0cy50cmFja21hbmdvbGYuY29tL1wiO1xuXG4vLyBDdXN0b20gcHJvbXB0IHN0b3JhZ2Uga2V5c1xuZXhwb3J0IGNvbnN0IENVU1RPTV9QUk9NUFRfS0VZX1BSRUZJWCA9IFwiY3VzdG9tUHJvbXB0X1wiIGFzIGNvbnN0O1xuZXhwb3J0IGNvbnN0IENVU1RPTV9QUk9NUFRfSURTX0tFWSA9IFwiY3VzdG9tUHJvbXB0SWRzXCIgYXMgY29uc3Q7XG5cbi8vIFN0b3JhZ2Uga2V5cyBmb3IgQ2hyb21lIGV4dGVuc2lvbiAoYWxpZ25lZCBiZXR3ZWVuIGJhY2tncm91bmQgYW5kIHBvcHVwKVxuZXhwb3J0IGNvbnN0IFNUT1JBR0VfS0VZUyA9IHtcbiAgVFJBQ0tNQU5fREFUQTogXCJ0cmFja21hbkRhdGFcIixcbiAgU1BFRURfVU5JVDogXCJzcGVlZFVuaXRcIixcbiAgRElTVEFOQ0VfVU5JVDogXCJkaXN0YW5jZVVuaXRcIixcbiAgU0VMRUNURURfUFJPTVBUX0lEOiBcInNlbGVjdGVkUHJvbXB0SWRcIixcbiAgQUlfU0VSVklDRTogXCJhaVNlcnZpY2VcIixcbiAgSElUVElOR19TVVJGQUNFOiBcImhpdHRpbmdTdXJmYWNlXCIsXG4gIElOQ0xVREVfQVZFUkFHRVM6IFwiaW5jbHVkZUF2ZXJhZ2VzXCIsXG4gIFNFU1NJT05fSElTVE9SWTogXCJzZXNzaW9uSGlzdG9yeVwiLFxuICBJTVBPUlRfU1RBVFVTOiBcImltcG9ydFN0YXR1c1wiLFxufSBhcyBjb25zdDtcbiIsICIvKipcbiAqIFVuaXQgbm9ybWFsaXphdGlvbiB1dGlsaXRpZXMgZm9yIFRyYWNrbWFuIG1lYXN1cmVtZW50cy5cbiAqIFxuICogVHJhY2ttYW4gdXNlcyBuZF8qIHBhcmFtZXRlcnMgdG8gc3BlY2lmeSB1bml0czpcbiAqIC0gbmRfMDAxLCBuZF8wMDIsIGV0Yy4gZGVmaW5lIHVuaXQgc3lzdGVtcyBmb3IgZGlmZmVyZW50IG1lYXN1cmVtZW50IGdyb3Vwc1xuICogLSBDb21tb24gdmFsdWVzOiA3ODkwMTIgPSB5YXJkcy9kZWdyZWVzLCA3ODkwMTMgPSBtZXRlcnMvcmFkaWFuc1xuICovXG5cbmV4cG9ydCB0eXBlIFVuaXRTeXN0ZW1JZCA9IFwiNzg5MDEyXCIgfCBcIjc4OTAxM1wiIHwgXCI3ODkwMTRcIiB8IHN0cmluZztcblxuZXhwb3J0IHR5cGUgU3BlZWRVbml0ID0gXCJtcGhcIiB8IFwibS9zXCI7XG5leHBvcnQgdHlwZSBEaXN0YW5jZVVuaXQgPSBcInlhcmRzXCIgfCBcIm1ldGVyc1wiO1xuZXhwb3J0IHR5cGUgU21hbGxEaXN0YW5jZVVuaXQgPSBcImluY2hlc1wiIHwgXCJjbVwiO1xuZXhwb3J0IGludGVyZmFjZSBVbml0Q2hvaWNlIHsgc3BlZWQ6IFNwZWVkVW5pdDsgZGlzdGFuY2U6IERpc3RhbmNlVW5pdCB9XG5leHBvcnQgY29uc3QgREVGQVVMVF9VTklUX0NIT0lDRTogVW5pdENob2ljZSA9IHsgc3BlZWQ6IFwibXBoXCIsIGRpc3RhbmNlOiBcInlhcmRzXCIgfTtcblxuLyoqXG4gKiBUcmFja21hbiB1bml0IHN5c3RlbSBkZWZpbml0aW9ucy5cbiAqIE1hcHMgbmRfKiBwYXJhbWV0ZXIgdmFsdWVzIHRvIGFjdHVhbCB1bml0cyBmb3IgZWFjaCBtZXRyaWMuXG4gKi9cbmV4cG9ydCBjb25zdCBVTklUX1NZU1RFTVM6IFJlY29yZDxVbml0U3lzdGVtSWQsIFVuaXRTeXN0ZW0+ID0ge1xuICAvLyBJbXBlcmlhbCAoeWFyZHMsIGRlZ3JlZXMpIC0gbW9zdCBjb21tb25cbiAgXCI3ODkwMTJcIjoge1xuICAgIGlkOiBcIjc4OTAxMlwiLFxuICAgIG5hbWU6IFwiSW1wZXJpYWxcIixcbiAgICBkaXN0YW5jZVVuaXQ6IFwieWFyZHNcIixcbiAgICBhbmdsZVVuaXQ6IFwiZGVncmVlc1wiLFxuICAgIHNwZWVkVW5pdDogXCJtcGhcIixcbiAgfSxcbiAgLy8gTWV0cmljIChtZXRlcnMsIHJhZGlhbnMpXG4gIFwiNzg5MDEzXCI6IHtcbiAgICBpZDogXCI3ODkwMTNcIixcbiAgICBuYW1lOiBcIk1ldHJpYyAocmFkKVwiLFxuICAgIGRpc3RhbmNlVW5pdDogXCJtZXRlcnNcIixcbiAgICBhbmdsZVVuaXQ6IFwicmFkaWFuc1wiLFxuICAgIHNwZWVkVW5pdDogXCJrbS9oXCIsXG4gIH0sXG4gIC8vIE1ldHJpYyAobWV0ZXJzLCBkZWdyZWVzKSAtIGxlc3MgY29tbW9uXG4gIFwiNzg5MDE0XCI6IHtcbiAgICBpZDogXCI3ODkwMTRcIixcbiAgICBuYW1lOiBcIk1ldHJpYyAoZGVnKVwiLFxuICAgIGRpc3RhbmNlVW5pdDogXCJtZXRlcnNcIixcbiAgICBhbmdsZVVuaXQ6IFwiZGVncmVlc1wiLFxuICAgIHNwZWVkVW5pdDogXCJrbS9oXCIsXG4gIH0sXG59O1xuXG4vKipcbiAqIFVuaXQgc3lzdGVtIGNvbmZpZ3VyYXRpb24uXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVW5pdFN5c3RlbSB7XG4gIGlkOiBVbml0U3lzdGVtSWQ7XG4gIG5hbWU6IHN0cmluZztcbiAgZGlzdGFuY2VVbml0OiBcInlhcmRzXCIgfCBcIm1ldGVyc1wiO1xuICBhbmdsZVVuaXQ6IFwiZGVncmVlc1wiIHwgXCJyYWRpYW5zXCI7XG4gIHNwZWVkVW5pdDogXCJtcGhcIiB8IFwia20vaFwiIHwgXCJtL3NcIjtcbn1cblxuLyoqXG4gKiBNZXRyaWNzIHRoYXQgdXNlIGRpc3RhbmNlIHVuaXRzLlxuICovXG5leHBvcnQgY29uc3QgRElTVEFOQ0VfTUVUUklDUyA9IG5ldyBTZXQoW1xuICBcIkNhcnJ5XCIsXG4gIFwiVG90YWxcIixcbiAgXCJTaWRlXCIsXG4gIFwiU2lkZVRvdGFsXCIsXG4gIFwiQ2FycnlTaWRlXCIsXG4gIFwiVG90YWxTaWRlXCIsXG4gIFwiSGVpZ2h0XCIsXG4gIFwiTWF4SGVpZ2h0XCIsXG4gIFwiQ3VydmVcIixcbl0pO1xuXG4vKipcbiAqIE1ldHJpY3MgdGhhdCB1c2Ugc21hbGwgZGlzdGFuY2UgdW5pdHMgKGluY2hlcy9jbSkuXG4gKiBUaGVzZSB2YWx1ZXMgY29tZSBmcm9tIHRoZSBBUEkgaW4gbWV0ZXJzIGJ1dCBhcmUgdG9vIHNtYWxsIGZvciB5YXJkcy9tZXRlcnMuXG4gKi9cbmV4cG9ydCBjb25zdCBTTUFMTF9ESVNUQU5DRV9NRVRSSUNTID0gbmV3IFNldChbXG4gIFwiTG93UG9pbnREaXN0YW5jZVwiLFxuXSk7XG5cbi8qKlxuICogVHJhY2ttYW4gaW1wYWN0IGxvY2F0aW9uIG1ldHJpY3MgYXJlIGFsd2F5cyBkaXNwbGF5ZWQgaW4gbWlsbGltZXRlcnMuXG4gKiBUaGUgQVBJIHJldHVybnMgdGhlc2UgdmFsdWVzIGluIG1ldGVycy5cbiAqL1xuZXhwb3J0IGNvbnN0IE1JTExJTUVURVJfTUVUUklDUyA9IG5ldyBTZXQoW1xuICBcIkltcGFjdEhlaWdodFwiLFxuICBcIkltcGFjdE9mZnNldFwiLFxuXSk7XG5cbi8qKlxuICogTWV0cmljcyB0aGF0IHVzZSBhbmdsZSB1bml0cy5cbiAqL1xuZXhwb3J0IGNvbnN0IEFOR0xFX01FVFJJQ1MgPSBuZXcgU2V0KFtcbiAgXCJBdHRhY2tBbmdsZVwiLFxuICBcIkNsdWJQYXRoXCIsXG4gIFwiRmFjZUFuZ2xlXCIsXG4gIFwiRmFjZVRvUGF0aFwiLFxuICBcIkR5bmFtaWNMb2Z0XCIsXG4gIFwiTGF1bmNoQW5nbGVcIixcbiAgXCJMYXVuY2hEaXJlY3Rpb25cIixcbiAgXCJMYW5kaW5nQW5nbGVcIixcbl0pO1xuXG4vKipcbiAqIE1ldHJpY3MgdGhhdCB1c2Ugc3BlZWQgdW5pdHMuXG4gKi9cbmV4cG9ydCBjb25zdCBTUEVFRF9NRVRSSUNTID0gbmV3IFNldChbXG4gIFwiQ2x1YlNwZWVkXCIsXG4gIFwiQmFsbFNwZWVkXCIsXG5dKTtcblxuLyoqXG4gKiBEZWZhdWx0IHVuaXQgc3lzdGVtIChJbXBlcmlhbCAtIHlhcmRzL2RlZ3JlZXMpLlxuICovXG5leHBvcnQgY29uc3QgREVGQVVMVF9VTklUX1NZU1RFTTogVW5pdFN5c3RlbSA9IFVOSVRfU1lTVEVNU1tcIjc4OTAxMlwiXTtcblxuLyoqXG4gKiBTcGVlZCB1bml0IGRpc3BsYXkgbGFiZWxzIGZvciBDU1YgaGVhZGVycy5cbiAqL1xuZXhwb3J0IGNvbnN0IFNQRUVEX0xBQkVMUzogUmVjb3JkPFNwZWVkVW5pdCwgc3RyaW5nPiA9IHtcbiAgXCJtcGhcIjogXCJtcGhcIixcbiAgXCJtL3NcIjogXCJtL3NcIixcbn07XG5cbi8qKlxuICogRGlzdGFuY2UgdW5pdCBkaXNwbGF5IGxhYmVscyBmb3IgQ1NWIGhlYWRlcnMuXG4gKi9cbmV4cG9ydCBjb25zdCBESVNUQU5DRV9MQUJFTFM6IFJlY29yZDxEaXN0YW5jZVVuaXQsIHN0cmluZz4gPSB7XG4gIFwieWFyZHNcIjogXCJ5ZHNcIixcbiAgXCJtZXRlcnNcIjogXCJtXCIsXG59O1xuXG4vKipcbiAqIFNtYWxsIGRpc3RhbmNlIHVuaXQgZGlzcGxheSBsYWJlbHMgZm9yIENTViBoZWFkZXJzLlxuICovXG5leHBvcnQgY29uc3QgU01BTExfRElTVEFOQ0VfTEFCRUxTOiBSZWNvcmQ8U21hbGxEaXN0YW5jZVVuaXQsIHN0cmluZz4gPSB7XG4gIFwiaW5jaGVzXCI6IFwiaW5cIixcbiAgXCJjbVwiOiBcImNtXCIsXG59O1xuXG4vKipcbiAqIE1pZ3JhdGUgYSBsZWdhY3kgdW5pdFByZWZlcmVuY2Ugc3RyaW5nIHRvIGEgVW5pdENob2ljZSBvYmplY3QuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtaWdyYXRlTGVnYWN5UHJlZihzdG9yZWQ6IHN0cmluZyB8IHVuZGVmaW5lZCk6IFVuaXRDaG9pY2Uge1xuICBzd2l0Y2ggKHN0b3JlZCkge1xuICAgIGNhc2UgXCJtZXRyaWNcIjpcbiAgICAgIHJldHVybiB7IHNwZWVkOiBcIm0vc1wiLCBkaXN0YW5jZTogXCJtZXRlcnNcIiB9O1xuICAgIGNhc2UgXCJoeWJyaWRcIjpcbiAgICAgIHJldHVybiB7IHNwZWVkOiBcIm1waFwiLCBkaXN0YW5jZTogXCJtZXRlcnNcIiB9O1xuICAgIGNhc2UgXCJpbXBlcmlhbFwiOlxuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4geyBzcGVlZDogXCJtcGhcIiwgZGlzdGFuY2U6IFwieWFyZHNcIiB9O1xuICB9XG59XG5cbi8qKlxuICogRml4ZWQgdW5pdCBsYWJlbHMgZm9yIG1ldHJpY3Mgd2hvc2UgdW5pdHMgZG9uJ3QgdmFyeSBieSBwcmVmZXJlbmNlLlxuICovXG5leHBvcnQgY29uc3QgRklYRURfVU5JVF9MQUJFTFM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XG4gIFNwaW5SYXRlOiBcInJwbVwiLFxuICBIYW5nVGltZTogXCJzXCIsXG4gIFRlbXBvOiBcInNcIixcbiAgSW1wYWN0SGVpZ2h0OiBcIm1tXCIsXG4gIEltcGFjdE9mZnNldDogXCJtbVwiLFxufTtcblxuLyoqXG4gKiBFeHRyYWN0IG5kXyogcGFyYW1ldGVycyBmcm9tIG1ldGFkYXRhX3BhcmFtcy5cbiAqIFxuICogQHBhcmFtIG1ldGFkYXRhUGFyYW1zIC0gVGhlIG1ldGFkYXRhX3BhcmFtcyBvYmplY3QgZnJvbSBTZXNzaW9uRGF0YVxuICogQHJldHVybnMgT2JqZWN0IG1hcHBpbmcgbWV0cmljIGdyb3VwIElEcyB0byB1bml0IHN5c3RlbSBJRHNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV4dHJhY3RVbml0UGFyYW1zKFxuICBtZXRhZGF0YVBhcmFtczogUmVjb3JkPHN0cmluZywgc3RyaW5nPlxuKTogUmVjb3JkPHN0cmluZywgVW5pdFN5c3RlbUlkPiB7XG4gIGNvbnN0IHJlc3VsdDogUmVjb3JkPHN0cmluZywgVW5pdFN5c3RlbUlkPiA9IHt9O1xuXG4gIGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKG1ldGFkYXRhUGFyYW1zKSkge1xuICAgIGNvbnN0IG1hdGNoID0ga2V5Lm1hdGNoKC9ebmRfKFthLXowLTldKykkL2kpO1xuICAgIGlmIChtYXRjaCkge1xuICAgICAgY29uc3QgZ3JvdXBLZXkgPSBtYXRjaFsxXS50b0xvd2VyQ2FzZSgpO1xuICAgICAgcmVzdWx0W2dyb3VwS2V5XSA9IHZhbHVlIGFzIFVuaXRTeXN0ZW1JZDtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufVxuXG4vKipcbiAqIERldGVybWluZSB0aGUgdW5pdCBzeXN0ZW0gSUQgZnJvbSBtZXRhZGF0YSBwYXJhbXMuXG4gKiBVc2VzIG5kXzAwMSBhcyBwcmltYXJ5LCBmYWxscyBiYWNrIHRvIGRlZmF1bHQuXG4gKiBcbiAqIEBwYXJhbSBtZXRhZGF0YVBhcmFtcyAtIFRoZSBtZXRhZGF0YV9wYXJhbXMgb2JqZWN0XG4gKiBAcmV0dXJucyBUaGUgdW5pdCBzeXN0ZW0gSUQgc3RyaW5nXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRVbml0U3lzdGVtSWQoXG4gIG1ldGFkYXRhUGFyYW1zOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+XG4pOiBVbml0U3lzdGVtSWQge1xuICBjb25zdCB1bml0UGFyYW1zID0gZXh0cmFjdFVuaXRQYXJhbXMobWV0YWRhdGFQYXJhbXMpO1xuICByZXR1cm4gdW5pdFBhcmFtc1tcIjAwMVwiXSB8fCBcIjc4OTAxMlwiOyAvLyBEZWZhdWx0IHRvIEltcGVyaWFsXG59XG5cbi8qKlxuICogR2V0IHRoZSBmdWxsIHVuaXQgc3lzdGVtIGNvbmZpZ3VyYXRpb24uXG4gKiBcbiAqIEBwYXJhbSBtZXRhZGF0YVBhcmFtcyAtIFRoZSBtZXRhZGF0YV9wYXJhbXMgb2JqZWN0XG4gKiBAcmV0dXJucyBUaGUgVW5pdFN5c3RlbSBjb25maWd1cmF0aW9uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRVbml0U3lzdGVtKFxuICBtZXRhZGF0YVBhcmFtczogUmVjb3JkPHN0cmluZywgc3RyaW5nPlxuKTogVW5pdFN5c3RlbSB7XG4gIGNvbnN0IGlkID0gZ2V0VW5pdFN5c3RlbUlkKG1ldGFkYXRhUGFyYW1zKTtcbiAgcmV0dXJuIFVOSVRfU1lTVEVNU1tpZF0gfHwgREVGQVVMVF9VTklUX1NZU1RFTTtcbn1cblxuLyoqXG4gKiBHZXQgdGhlIHVuaXQgc3lzdGVtIHJlcHJlc2VudGluZyB3aGF0IHRoZSBBUEkgYWN0dWFsbHkgcmV0dXJucy5cbiAqIFRoZSBBUEkgYWx3YXlzIHJldHVybnMgc3BlZWQgaW4gbS9zIGFuZCBkaXN0YW5jZSBpbiBtZXRlcnMsXG4gKiBidXQgdGhlIGFuZ2xlIHVuaXQgZGVwZW5kcyBvbiB0aGUgcmVwb3J0J3MgbmRfMDAxIHBhcmFtZXRlci5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEFwaVNvdXJjZVVuaXRTeXN0ZW0oXG4gIG1ldGFkYXRhUGFyYW1zOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+XG4pOiBVbml0U3lzdGVtIHtcbiAgY29uc3QgcmVwb3J0U3lzdGVtID0gZ2V0VW5pdFN5c3RlbShtZXRhZGF0YVBhcmFtcyk7XG4gIHJldHVybiB7XG4gICAgaWQ6IFwiYXBpXCIgYXMgVW5pdFN5c3RlbUlkLFxuICAgIG5hbWU6IFwiQVBJIFNvdXJjZVwiLFxuICAgIGRpc3RhbmNlVW5pdDogXCJtZXRlcnNcIixcbiAgICBhbmdsZVVuaXQ6IHJlcG9ydFN5c3RlbS5hbmdsZVVuaXQsXG4gICAgc3BlZWRVbml0OiBcIm0vc1wiLFxuICB9O1xufVxuXG4vKipcbiAqIEdldCB0aGUgdW5pdCBsYWJlbCBmb3IgYSBtZXRyaWMgYmFzZWQgb24gdXNlcidzIHVuaXQgY2hvaWNlLlxuICogUmV0dXJucyBlbXB0eSBzdHJpbmcgZm9yIGRpbWVuc2lvbmxlc3MgbWV0cmljcyAoZS5nLiBTbWFzaEZhY3RvciwgU3BpblJhdGUpLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0TWV0cmljVW5pdExhYmVsKFxuICBtZXRyaWNOYW1lOiBzdHJpbmcsXG4gIHVuaXRDaG9pY2U6IFVuaXRDaG9pY2UgPSBERUZBVUxUX1VOSVRfQ0hPSUNFXG4pOiBzdHJpbmcge1xuICBpZiAobWV0cmljTmFtZSBpbiBGSVhFRF9VTklUX0xBQkVMUykgcmV0dXJuIEZJWEVEX1VOSVRfTEFCRUxTW21ldHJpY05hbWVdO1xuICBpZiAoU1BFRURfTUVUUklDUy5oYXMobWV0cmljTmFtZSkpIHJldHVybiBTUEVFRF9MQUJFTFNbdW5pdENob2ljZS5zcGVlZF07XG4gIGlmIChTTUFMTF9ESVNUQU5DRV9NRVRSSUNTLmhhcyhtZXRyaWNOYW1lKSkgcmV0dXJuIFNNQUxMX0RJU1RBTkNFX0xBQkVMU1tnZXRTbWFsbERpc3RhbmNlVW5pdCh1bml0Q2hvaWNlKV07XG4gIGlmIChESVNUQU5DRV9NRVRSSUNTLmhhcyhtZXRyaWNOYW1lKSkgcmV0dXJuIERJU1RBTkNFX0xBQkVMU1t1bml0Q2hvaWNlLmRpc3RhbmNlXTtcbiAgaWYgKEFOR0xFX01FVFJJQ1MuaGFzKG1ldHJpY05hbWUpKSByZXR1cm4gXCJcdTAwQjBcIjtcbiAgcmV0dXJuIFwiXCI7XG59XG5cbi8qKlxuICogQ29udmVydCBhIGRpc3RhbmNlIHZhbHVlIGJldHdlZW4gdW5pdHMuXG4gKiBcbiAqIEBwYXJhbSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byBjb252ZXJ0XG4gKiBAcGFyYW0gZnJvbVVuaXQgLSBTb3VyY2UgdW5pdCAoXCJ5YXJkc1wiIG9yIFwibWV0ZXJzXCIpXG4gKiBAcGFyYW0gdG9Vbml0IC0gVGFyZ2V0IHVuaXQgKFwieWFyZHNcIiBvciBcIm1ldGVyc1wiKVxuICogQHJldHVybnMgQ29udmVydGVkIHZhbHVlLCBvciBvcmlnaW5hbCBpZiB1bml0cyBtYXRjaFxuICovXG5leHBvcnQgZnVuY3Rpb24gY29udmVydERpc3RhbmNlKFxuICB2YWx1ZTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbCxcbiAgZnJvbVVuaXQ6IFwieWFyZHNcIiB8IFwibWV0ZXJzXCIsXG4gIHRvVW5pdDogXCJ5YXJkc1wiIHwgXCJtZXRlcnNcIlxuKTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbCB7XG4gIGlmICh2YWx1ZSA9PT0gbnVsbCB8fCB2YWx1ZSA9PT0gXCJcIikgcmV0dXJuIHZhbHVlO1xuXG4gIGNvbnN0IG51bVZhbHVlID0gdHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiID8gcGFyc2VGbG9hdCh2YWx1ZSkgOiB2YWx1ZTtcbiAgaWYgKGlzTmFOKG51bVZhbHVlKSkgcmV0dXJuIHZhbHVlO1xuXG4gIGlmIChmcm9tVW5pdCA9PT0gdG9Vbml0KSByZXR1cm4gbnVtVmFsdWU7XG5cbiAgLy8gQ29udmVydCB0byBtZXRlcnMgZmlyc3QsIHRoZW4gdG8gdGFyZ2V0IHVuaXRcbiAgY29uc3QgaW5NZXRlcnMgPSBmcm9tVW5pdCA9PT0gXCJ5YXJkc1wiID8gbnVtVmFsdWUgKiAwLjkxNDQgOiBudW1WYWx1ZTtcbiAgcmV0dXJuIHRvVW5pdCA9PT0gXCJ5YXJkc1wiID8gaW5NZXRlcnMgLyAwLjkxNDQgOiBpbk1ldGVycztcbn1cblxuLyoqXG4gKiBDb252ZXJ0IGFuIGFuZ2xlIHZhbHVlIGJldHdlZW4gdW5pdHMuXG4gKiBcbiAqIEBwYXJhbSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byBjb252ZXJ0XG4gKiBAcGFyYW0gZnJvbVVuaXQgLSBTb3VyY2UgdW5pdCAoXCJkZWdyZWVzXCIgb3IgXCJyYWRpYW5zXCIpXG4gKiBAcGFyYW0gdG9Vbml0IC0gVGFyZ2V0IHVuaXQgKFwiZGVncmVlc1wiIG9yIFwicmFkaWFuc1wiKVxuICogQHJldHVybnMgQ29udmVydGVkIHZhbHVlLCBvciBvcmlnaW5hbCBpZiB1bml0cyBtYXRjaFxuICovXG5leHBvcnQgZnVuY3Rpb24gY29udmVydEFuZ2xlKFxuICB2YWx1ZTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbCxcbiAgZnJvbVVuaXQ6IFwiZGVncmVlc1wiIHwgXCJyYWRpYW5zXCIsXG4gIHRvVW5pdDogXCJkZWdyZWVzXCIgfCBcInJhZGlhbnNcIlxuKTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbCB7XG4gIGlmICh2YWx1ZSA9PT0gbnVsbCB8fCB2YWx1ZSA9PT0gXCJcIikgcmV0dXJuIHZhbHVlO1xuXG4gIGNvbnN0IG51bVZhbHVlID0gdHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiID8gcGFyc2VGbG9hdCh2YWx1ZSkgOiB2YWx1ZTtcbiAgaWYgKGlzTmFOKG51bVZhbHVlKSkgcmV0dXJuIHZhbHVlO1xuXG4gIGlmIChmcm9tVW5pdCA9PT0gdG9Vbml0KSByZXR1cm4gbnVtVmFsdWU7XG5cbiAgLy8gQ29udmVydCB0byBkZWdyZWVzIGZpcnN0LCB0aGVuIHRvIHRhcmdldCB1bml0XG4gIGNvbnN0IGluRGVncmVlcyA9IGZyb21Vbml0ID09PSBcImRlZ3JlZXNcIiA/IG51bVZhbHVlIDogKG51bVZhbHVlICogMTgwIC8gTWF0aC5QSSk7XG4gIHJldHVybiB0b1VuaXQgPT09IFwiZGVncmVlc1wiID8gaW5EZWdyZWVzIDogKGluRGVncmVlcyAqIE1hdGguUEkgLyAxODApO1xufVxuXG4vKipcbiAqIENvbnZlcnQgYSBzcGVlZCB2YWx1ZSBiZXR3ZWVuIHVuaXRzLlxuICpcbiAqIEBwYXJhbSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byBjb252ZXJ0XG4gKiBAcGFyYW0gZnJvbVVuaXQgLSBTb3VyY2UgdW5pdCAoXCJtcGhcIiwgXCJrbS9oXCIsIG9yIFwibS9zXCIpXG4gKiBAcGFyYW0gdG9Vbml0IC0gVGFyZ2V0IHVuaXQgKFwibXBoXCIsIFwia20vaFwiLCBvciBcIm0vc1wiKVxuICogQHJldHVybnMgQ29udmVydGVkIHZhbHVlLCBvciBvcmlnaW5hbCBpZiB1bml0cyBtYXRjaFxuICovXG5leHBvcnQgZnVuY3Rpb24gY29udmVydFNwZWVkKFxuICB2YWx1ZTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbCxcbiAgZnJvbVVuaXQ6IFwibXBoXCIgfCBcImttL2hcIiB8IFwibS9zXCIsXG4gIHRvVW5pdDogXCJtcGhcIiB8IFwia20vaFwiIHwgXCJtL3NcIlxuKTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbCB7XG4gIGlmICh2YWx1ZSA9PT0gbnVsbCB8fCB2YWx1ZSA9PT0gXCJcIikgcmV0dXJuIHZhbHVlO1xuXG4gIGNvbnN0IG51bVZhbHVlID0gdHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiID8gcGFyc2VGbG9hdCh2YWx1ZSkgOiB2YWx1ZTtcbiAgaWYgKGlzTmFOKG51bVZhbHVlKSkgcmV0dXJuIHZhbHVlO1xuXG4gIGlmIChmcm9tVW5pdCA9PT0gdG9Vbml0KSByZXR1cm4gbnVtVmFsdWU7XG5cbiAgLy8gQ29udmVydCB0byBtcGggZmlyc3QsIHRoZW4gdG8gdGFyZ2V0IHVuaXRcbiAgbGV0IGluTXBoOiBudW1iZXI7XG4gIGlmIChmcm9tVW5pdCA9PT0gXCJtcGhcIikgaW5NcGggPSBudW1WYWx1ZTtcbiAgZWxzZSBpZiAoZnJvbVVuaXQgPT09IFwia20vaFwiKSBpbk1waCA9IG51bVZhbHVlIC8gMS42MDkzNDQ7XG4gIGVsc2UgaW5NcGggPSBudW1WYWx1ZSAqIDIuMjM2OTQ7IC8vIG0vcyB0byBtcGhcblxuICBpZiAodG9Vbml0ID09PSBcIm1waFwiKSByZXR1cm4gaW5NcGg7XG4gIGlmICh0b1VuaXQgPT09IFwia20vaFwiKSByZXR1cm4gaW5NcGggKiAxLjYwOTM0NDtcbiAgcmV0dXJuIGluTXBoIC8gMi4yMzY5NDsgLy8gbXBoIHRvIG0vc1xufVxuXG4vKipcbiAqIEdldCB0aGUgc21hbGwgZGlzdGFuY2UgdW5pdCBiYXNlZCBvbiB0aGUgdXNlcidzIGRpc3RhbmNlIGNob2ljZS5cbiAqIFlhcmRzIHVzZXJzIHNlZSBpbmNoZXM7IG1ldGVycyB1c2VycyBzZWUgY20uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRTbWFsbERpc3RhbmNlVW5pdCh1bml0Q2hvaWNlOiBVbml0Q2hvaWNlID0gREVGQVVMVF9VTklUX0NIT0lDRSk6IFNtYWxsRGlzdGFuY2VVbml0IHtcbiAgcmV0dXJuIHVuaXRDaG9pY2UuZGlzdGFuY2UgPT09IFwieWFyZHNcIiA/IFwiaW5jaGVzXCIgOiBcImNtXCI7XG59XG5cbi8qKlxuICogQ29udmVydCBhIGRpc3RhbmNlIHZhbHVlIGZyb20gbWV0ZXJzIHRvIGEgc21hbGwgZGlzdGFuY2UgdW5pdCAoaW5jaGVzIG9yIGNtKS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbnZlcnRTbWFsbERpc3RhbmNlKFxuICB2YWx1ZTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbCxcbiAgdG9TbWFsbFVuaXQ6IFNtYWxsRGlzdGFuY2VVbml0XG4pOiBudW1iZXIgfCBzdHJpbmcgfCBudWxsIHtcbiAgaWYgKHZhbHVlID09PSBudWxsIHx8IHZhbHVlID09PSBcIlwiKSByZXR1cm4gdmFsdWU7XG5cbiAgY29uc3QgbnVtVmFsdWUgPSB0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCIgPyBwYXJzZUZsb2F0KHZhbHVlKSA6IHZhbHVlO1xuICBpZiAoaXNOYU4obnVtVmFsdWUpKSByZXR1cm4gdmFsdWU7XG5cbiAgcmV0dXJuIHRvU21hbGxVbml0ID09PSBcImluY2hlc1wiID8gbnVtVmFsdWUgKiAzOS4zNzAxIDogbnVtVmFsdWUgKiAxMDA7XG59XG5cbi8qKlxuICogQ29udmVydCBhIGRpc3RhbmNlIHZhbHVlIGZyb20gbWV0ZXJzIHRvIG1pbGxpbWV0ZXJzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gY29udmVydE1pbGxpbWV0ZXJzKFxuICB2YWx1ZTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbFxuKTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbCB7XG4gIGlmICh2YWx1ZSA9PT0gbnVsbCB8fCB2YWx1ZSA9PT0gXCJcIikgcmV0dXJuIHZhbHVlO1xuXG4gIGNvbnN0IG51bVZhbHVlID0gdHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiID8gcGFyc2VGbG9hdCh2YWx1ZSkgOiB2YWx1ZTtcbiAgaWYgKGlzTmFOKG51bVZhbHVlKSkgcmV0dXJuIHZhbHVlO1xuXG4gIHJldHVybiBudW1WYWx1ZSAqIDEwMDA7XG59XG5cbi8qKlxuICogTm9ybWFsaXplIGEgbWV0cmljIHZhbHVlIGJhc2VkIG9uIHVuaXQgc3lzdGVtIGFsaWdubWVudCBhbmQgdXNlcidzIHVuaXQgY2hvaWNlLlxuICpcbiAqIENvbnZlcnRzIHZhbHVlcyBmcm9tIHRoZSBzb3VyY2UgdW5pdHMgdG8gdGFyZ2V0IG91dHB1dCB1bml0czpcbiAqIC0gRGlzdGFuY2U6IHlhcmRzIG9yIG1ldGVycyAocGVyIHVuaXRDaG9pY2UuZGlzdGFuY2UpXG4gKiAtIEFuZ2xlczogYWx3YXlzIGRlZ3JlZXNcbiAqIC0gU3BlZWQ6IG1waCBvciBtL3MgKHBlciB1bml0Q2hvaWNlLnNwZWVkKVxuICpcbiAqIEBwYXJhbSB2YWx1ZSAtIFRoZSByYXcgbWV0cmljIHZhbHVlXG4gKiBAcGFyYW0gbWV0cmljTmFtZSAtIFRoZSBuYW1lIG9mIHRoZSBtZXRyaWMgYmVpbmcgbm9ybWFsaXplZFxuICogQHBhcmFtIHJlcG9ydFVuaXRTeXN0ZW0gLSBUaGUgdW5pdCBzeXN0ZW0gdXNlZCBpbiB0aGUgc291cmNlIGRhdGFcbiAqIEBwYXJhbSB1bml0Q2hvaWNlIC0gVXNlcidzIHVuaXQgY2hvaWNlIChkZWZhdWx0cyB0byBtcGggKyB5YXJkcylcbiAqIEByZXR1cm5zIE5vcm1hbGl6ZWQgdmFsdWUgYXMgbnVtYmVyIG9yIHN0cmluZyAobnVsbCBpZiBpbnZhbGlkKVxuICovXG5leHBvcnQgZnVuY3Rpb24gbm9ybWFsaXplTWV0cmljVmFsdWUoXG4gIHZhbHVlOiBNZXRyaWNWYWx1ZSxcbiAgbWV0cmljTmFtZTogc3RyaW5nLFxuICByZXBvcnRVbml0U3lzdGVtOiBVbml0U3lzdGVtLFxuICB1bml0Q2hvaWNlOiBVbml0Q2hvaWNlID0gREVGQVVMVF9VTklUX0NIT0lDRVxuKTogTWV0cmljVmFsdWUge1xuICBjb25zdCBudW1WYWx1ZSA9IHBhcnNlTnVtZXJpY1ZhbHVlKHZhbHVlKTtcbiAgaWYgKG51bVZhbHVlID09PSBudWxsKSByZXR1cm4gdmFsdWU7XG5cbiAgbGV0IGNvbnZlcnRlZDogbnVtYmVyO1xuXG4gIGlmIChNSUxMSU1FVEVSX01FVFJJQ1MuaGFzKG1ldHJpY05hbWUpKSB7XG4gICAgY29udmVydGVkID0gY29udmVydE1pbGxpbWV0ZXJzKG51bVZhbHVlKSBhcyBudW1iZXI7XG4gIH0gZWxzZSBpZiAoU01BTExfRElTVEFOQ0VfTUVUUklDUy5oYXMobWV0cmljTmFtZSkpIHtcbiAgICBjb252ZXJ0ZWQgPSBjb252ZXJ0U21hbGxEaXN0YW5jZShcbiAgICAgIG51bVZhbHVlLFxuICAgICAgZ2V0U21hbGxEaXN0YW5jZVVuaXQodW5pdENob2ljZSlcbiAgICApIGFzIG51bWJlcjtcbiAgfSBlbHNlIGlmIChESVNUQU5DRV9NRVRSSUNTLmhhcyhtZXRyaWNOYW1lKSkge1xuICAgIGNvbnZlcnRlZCA9IGNvbnZlcnREaXN0YW5jZShcbiAgICAgIG51bVZhbHVlLFxuICAgICAgcmVwb3J0VW5pdFN5c3RlbS5kaXN0YW5jZVVuaXQsXG4gICAgICB1bml0Q2hvaWNlLmRpc3RhbmNlXG4gICAgKSBhcyBudW1iZXI7XG4gIH0gZWxzZSBpZiAoQU5HTEVfTUVUUklDUy5oYXMobWV0cmljTmFtZSkpIHtcbiAgICBjb252ZXJ0ZWQgPSBjb252ZXJ0QW5nbGUoXG4gICAgICBudW1WYWx1ZSxcbiAgICAgIHJlcG9ydFVuaXRTeXN0ZW0uYW5nbGVVbml0LFxuICAgICAgXCJkZWdyZWVzXCJcbiAgICApIGFzIG51bWJlcjtcbiAgfSBlbHNlIGlmIChTUEVFRF9NRVRSSUNTLmhhcyhtZXRyaWNOYW1lKSkge1xuICAgIGNvbnZlcnRlZCA9IGNvbnZlcnRTcGVlZChcbiAgICAgIG51bVZhbHVlLFxuICAgICAgcmVwb3J0VW5pdFN5c3RlbS5zcGVlZFVuaXQsXG4gICAgICB1bml0Q2hvaWNlLnNwZWVkXG4gICAgKSBhcyBudW1iZXI7XG4gIH0gZWxzZSB7XG4gICAgY29udmVydGVkID0gbnVtVmFsdWU7XG4gIH1cblxuICAvLyBTcGluUmF0ZTogcm91bmQgdG8gd2hvbGUgbnVtYmVyc1xuICBpZiAobWV0cmljTmFtZSA9PT0gXCJTcGluUmF0ZVwiKSByZXR1cm4gTWF0aC5yb3VuZChjb252ZXJ0ZWQpO1xuXG4gIC8vIEltcGFjdCBsb2NhdGlvbiBtZXRyaWNzIGFyZSBkaXNwbGF5ZWQgYXMgd2hvbGUgbWlsbGltZXRlcnMuXG4gIGlmIChNSUxMSU1FVEVSX01FVFJJQ1MuaGFzKG1ldHJpY05hbWUpKSByZXR1cm4gTWF0aC5yb3VuZChjb252ZXJ0ZWQpO1xuXG4gIC8vIFNtYXNoRmFjdG9yIC8gVGVtcG86IHJvdW5kIHRvIDIgZGVjaW1hbCBwbGFjZXNcbiAgaWYgKG1ldHJpY05hbWUgPT09IFwiU21hc2hGYWN0b3JcIiB8fCBtZXRyaWNOYW1lID09PSBcIlRlbXBvXCIpXG4gICAgcmV0dXJuIE1hdGgucm91bmQoY29udmVydGVkICogMTAwKSAvIDEwMDtcblxuICAvLyBSb3VuZCB0byAxIGRlY2ltYWwgcGxhY2UgZm9yIGNvbnNpc3RlbmN5XG4gIHJldHVybiBNYXRoLnJvdW5kKGNvbnZlcnRlZCAqIDEwKSAvIDEwO1xufVxuXG4vKipcbiAqIFBhcnNlIGEgbnVtZXJpYyB2YWx1ZSBmcm9tIE1ldHJpY1ZhbHVlIHR5cGUuXG4gKi9cbmZ1bmN0aW9uIHBhcnNlTnVtZXJpY1ZhbHVlKHZhbHVlOiBNZXRyaWNWYWx1ZSk6IG51bWJlciB8IG51bGwge1xuICBpZiAodmFsdWUgPT09IG51bGwgfHwgdmFsdWUgPT09IFwiXCIpIHJldHVybiBudWxsO1xuICBpZiAodHlwZW9mIHZhbHVlID09PSBcIm51bWJlclwiKSByZXR1cm4gaXNOYU4odmFsdWUpID8gbnVsbCA6IHZhbHVlO1xuICBcbiAgY29uc3QgcGFyc2VkID0gcGFyc2VGbG9hdCh2YWx1ZSk7XG4gIHJldHVybiBpc05hTihwYXJzZWQpID8gbnVsbCA6IHBhcnNlZDtcbn1cblxuZXhwb3J0IHR5cGUgTWV0cmljVmFsdWUgPSBzdHJpbmcgfCBudW1iZXIgfCBudWxsO1xuIiwgIi8qKlxuICogQ1NWIHdyaXRlciBmb3IgVHJhY2tQdWxsIHNlc3Npb24gZGF0YS5cbiAqIEltcGxlbWVudHMgY29yZSBjb2x1bW5zOiBEYXRlLCBDbHViLCBTaG90ICMsIFR5cGVcbiAqL1xuXG5pbXBvcnQgdHlwZSB7IFNlc3Npb25EYXRhLCBDbHViR3JvdXAsIFNob3QgfSBmcm9tIFwiLi4vbW9kZWxzL3R5cGVzXCI7XG5pbXBvcnQge1xuICBnZXRBcGlTb3VyY2VVbml0U3lzdGVtLFxuICBnZXRNZXRyaWNVbml0TGFiZWwsXG4gIG5vcm1hbGl6ZU1ldHJpY1ZhbHVlLFxuICBERUZBVUxUX1VOSVRfQ0hPSUNFLFxuICB0eXBlIFVuaXRDaG9pY2UsXG59IGZyb20gXCIuL3VuaXRfbm9ybWFsaXphdGlvblwiO1xuaW1wb3J0IHsgTUVUUklDX0RJU1BMQVlfTkFNRVMgfSBmcm9tIFwiLi9jb25zdGFudHNcIjtcblxuY29uc3QgTUVUUklDX0NPTFVNTl9PUkRFUjogc3RyaW5nW10gPSBbXG4gIC8vIFNwZWVkICYgRWZmaWNpZW5jeVxuICBcIkNsdWJTcGVlZFwiLCBcIkJhbGxTcGVlZFwiLCBcIlNtYXNoRmFjdG9yXCIsXG4gIC8vIENsdWIgRGVsaXZlcnlcbiAgXCJBdHRhY2tBbmdsZVwiLCBcIkNsdWJQYXRoXCIsIFwiRmFjZUFuZ2xlXCIsIFwiRmFjZVRvUGF0aFwiLCBcIlN3aW5nRGlyZWN0aW9uXCIsIFwiRHluYW1pY0xvZnRcIixcbiAgLy8gTGF1bmNoICYgU3BpblxuICBcIkxhdW5jaEFuZ2xlXCIsIFwiTGF1bmNoRGlyZWN0aW9uXCIsIFwiU3BpblJhdGVcIiwgXCJTcGluQXhpc1wiLCBcIlNwaW5Mb2Z0XCIsXG4gIC8vIERpc3RhbmNlXG4gIFwiQ2FycnlcIiwgXCJUb3RhbFwiLFxuICAvLyBEaXNwZXJzaW9uXG4gIFwiU2lkZVwiLCBcIlNpZGVUb3RhbFwiLCBcIkNhcnJ5U2lkZVwiLCBcIlRvdGFsU2lkZVwiLCBcIkN1cnZlXCIsXG4gIC8vIEJhbGwgRmxpZ2h0XG4gIFwiSGVpZ2h0XCIsIFwiTWF4SGVpZ2h0XCIsIFwiTGFuZGluZ0FuZ2xlXCIsIFwiSGFuZ1RpbWVcIixcbiAgLy8gSW1wYWN0XG4gIFwiTG93UG9pbnREaXN0YW5jZVwiLCBcIkltcGFjdEhlaWdodFwiLCBcIkltcGFjdE9mZnNldFwiLFxuICAvLyBPdGhlclxuICBcIlRlbXBvXCIsXG5dO1xuXG5mdW5jdGlvbiBnZXREaXNwbGF5TmFtZShtZXRyaWM6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBNRVRSSUNfRElTUExBWV9OQU1FU1ttZXRyaWNdID8/IG1ldHJpYztcbn1cblxuZnVuY3Rpb24gZ2V0Q29sdW1uTmFtZShtZXRyaWM6IHN0cmluZywgdW5pdENob2ljZTogVW5pdENob2ljZSk6IHN0cmluZyB7XG4gIGNvbnN0IGRpc3BsYXlOYW1lID0gZ2V0RGlzcGxheU5hbWUobWV0cmljKTtcbiAgY29uc3QgdW5pdExhYmVsID0gZ2V0TWV0cmljVW5pdExhYmVsKG1ldHJpYywgdW5pdENob2ljZSk7XG4gIHJldHVybiB1bml0TGFiZWwgPyBgJHtkaXNwbGF5TmFtZX0gKCR7dW5pdExhYmVsfSlgIDogZGlzcGxheU5hbWU7XG59XG5cbmZ1bmN0aW9uIGdlbmVyYXRlRmlsZW5hbWUoc2Vzc2lvbjogU2Vzc2lvbkRhdGEpOiBzdHJpbmcge1xuICByZXR1cm4gYFNob3REYXRhXyR7c2Vzc2lvbi5kYXRlfS5jc3ZgO1xufVxuXG5mdW5jdGlvbiBvcmRlck1ldHJpY3NCeVByaW9yaXR5KFxuICBhbGxNZXRyaWNzOiBzdHJpbmdbXSxcbiAgcHJpb3JpdHlPcmRlcjogc3RyaW5nW11cbik6IHN0cmluZ1tdIHtcbiAgY29uc3QgcmVzdWx0OiBzdHJpbmdbXSA9IFtdO1xuICBjb25zdCBzZWVuID0gbmV3IFNldDxzdHJpbmc+KCk7XG5cbiAgZm9yIChjb25zdCBtZXRyaWMgb2YgcHJpb3JpdHlPcmRlcikge1xuICAgIGlmIChhbGxNZXRyaWNzLmluY2x1ZGVzKG1ldHJpYykgJiYgIXNlZW4uaGFzKG1ldHJpYykpIHtcbiAgICAgIHJlc3VsdC5wdXNoKG1ldHJpYyk7XG4gICAgICBzZWVuLmFkZChtZXRyaWMpO1xuICAgIH1cbiAgfVxuXG4gIGZvciAoY29uc3QgbWV0cmljIG9mIGFsbE1ldHJpY3MpIHtcbiAgICBpZiAoIXNlZW4uaGFzKG1ldHJpYykpIHtcbiAgICAgIHJlc3VsdC5wdXNoKG1ldHJpYyk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gaGFzVGFncyhzZXNzaW9uOiBTZXNzaW9uRGF0YSk6IGJvb2xlYW4ge1xuICByZXR1cm4gc2Vzc2lvbi5jbHViX2dyb3Vwcy5zb21lKChjbHViKSA9PlxuICAgIGNsdWIuc2hvdHMuc29tZSgoc2hvdCkgPT4gc2hvdC50YWcgIT09IHVuZGVmaW5lZCAmJiBzaG90LnRhZyAhPT0gXCJcIilcbiAgKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHdyaXRlQ3N2KFxuICBzZXNzaW9uOiBTZXNzaW9uRGF0YSxcbiAgaW5jbHVkZUF2ZXJhZ2VzID0gdHJ1ZSxcbiAgbWV0cmljT3JkZXI/OiBzdHJpbmdbXSxcbiAgdW5pdENob2ljZTogVW5pdENob2ljZSA9IERFRkFVTFRfVU5JVF9DSE9JQ0UsXG4gIGhpdHRpbmdTdXJmYWNlPzogXCJHcmFzc1wiIHwgXCJNYXRcIlxuKTogc3RyaW5nIHtcbiAgY29uc3Qgb3JkZXJlZE1ldHJpY3MgPSBvcmRlck1ldHJpY3NCeVByaW9yaXR5KFxuICAgIHNlc3Npb24ubWV0cmljX25hbWVzLFxuICAgIG1ldHJpY09yZGVyID8/IE1FVFJJQ19DT0xVTU5fT1JERVJcbiAgKTtcblxuICBjb25zdCBoZWFkZXJSb3c6IHN0cmluZ1tdID0gW1wiRGF0ZVwiLCBcIkNsdWJcIl07XG5cbiAgaWYgKGhhc1RhZ3Moc2Vzc2lvbikpIHtcbiAgICBoZWFkZXJSb3cucHVzaChcIlRhZ1wiKTtcbiAgfVxuXG4gIGhlYWRlclJvdy5wdXNoKFwiU2hvdCAjXCIsIFwiVHlwZVwiKTtcblxuICBmb3IgKGNvbnN0IG1ldHJpYyBvZiBvcmRlcmVkTWV0cmljcykge1xuICAgIGhlYWRlclJvdy5wdXNoKGdldENvbHVtbk5hbWUobWV0cmljLCB1bml0Q2hvaWNlKSk7XG4gIH1cblxuICBjb25zdCByb3dzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+W10gPSBbXTtcblxuICAvLyBTb3VyY2UgdW5pdCBzeXN0ZW06IEFQSSBhbHdheXMgcmV0dXJucyBtL3MgKyBtZXRlcnMsIGFuZ2xlIHVuaXQgZnJvbSByZXBvcnRcbiAgY29uc3QgdW5pdFN5c3RlbSA9IGdldEFwaVNvdXJjZVVuaXRTeXN0ZW0oc2Vzc2lvbi5tZXRhZGF0YV9wYXJhbXMpO1xuXG4gIGZvciAoY29uc3QgY2x1YiBvZiBzZXNzaW9uLmNsdWJfZ3JvdXBzKSB7XG4gICAgZm9yIChjb25zdCBzaG90IG9mIGNsdWIuc2hvdHMpIHtcbiAgICAgIGNvbnN0IHJvdzogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcbiAgICAgICAgRGF0ZTogc2Vzc2lvbi5kYXRlLFxuICAgICAgICBDbHViOiBjbHViLmNsdWJfbmFtZSxcbiAgICAgICAgXCJTaG90ICNcIjogU3RyaW5nKHNob3Quc2hvdF9udW1iZXIgKyAxKSxcbiAgICAgICAgVHlwZTogXCJTaG90XCIsXG4gICAgICB9O1xuXG4gICAgICBpZiAoaGFzVGFncyhzZXNzaW9uKSkge1xuICAgICAgICByb3cuVGFnID0gc2hvdC50YWcgPz8gXCJcIjtcbiAgICAgIH1cblxuICAgICAgZm9yIChjb25zdCBtZXRyaWMgb2Ygb3JkZXJlZE1ldHJpY3MpIHtcbiAgICAgICAgY29uc3QgY29sTmFtZSA9IGdldENvbHVtbk5hbWUobWV0cmljLCB1bml0Q2hvaWNlKTtcbiAgICAgICAgY29uc3QgcmF3VmFsdWUgPSBzaG90Lm1ldHJpY3NbbWV0cmljXSA/PyBcIlwiO1xuXG4gICAgICAgIGlmICh0eXBlb2YgcmF3VmFsdWUgPT09IFwic3RyaW5nXCIgfHwgdHlwZW9mIHJhd1ZhbHVlID09PSBcIm51bWJlclwiKSB7XG4gICAgICAgICAgcm93W2NvbE5hbWVdID0gU3RyaW5nKG5vcm1hbGl6ZU1ldHJpY1ZhbHVlKHJhd1ZhbHVlLCBtZXRyaWMsIHVuaXRTeXN0ZW0sIHVuaXRDaG9pY2UpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByb3dbY29sTmFtZV0gPSBcIlwiO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJvd3MucHVzaChyb3cpO1xuICAgIH1cblxuICAgIGlmIChpbmNsdWRlQXZlcmFnZXMpIHtcbiAgICAgIC8vIEdyb3VwIHNob3RzIGJ5IHRhZ1xuICAgICAgY29uc3QgdGFnR3JvdXBzID0gbmV3IE1hcDxzdHJpbmcsIFNob3RbXT4oKTtcbiAgICAgIGZvciAoY29uc3Qgc2hvdCBvZiBjbHViLnNob3RzKSB7XG4gICAgICAgIGNvbnN0IHRhZyA9IHNob3QudGFnID8/IFwiXCI7XG4gICAgICAgIGlmICghdGFnR3JvdXBzLmhhcyh0YWcpKSB0YWdHcm91cHMuc2V0KHRhZywgW10pO1xuICAgICAgICB0YWdHcm91cHMuZ2V0KHRhZykhLnB1c2goc2hvdCk7XG4gICAgICB9XG5cbiAgICAgIGZvciAoY29uc3QgW3RhZywgc2hvdHNdIG9mIHRhZ0dyb3Vwcykge1xuICAgICAgICAvLyBPbmx5IHdyaXRlIGF2ZXJhZ2Ugcm93IGlmIGdyb3VwIGhhcyAyKyBzaG90c1xuICAgICAgICBpZiAoc2hvdHMubGVuZ3RoIDwgMikgY29udGludWU7XG5cbiAgICAgICAgY29uc3QgYXZnUm93OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xuICAgICAgICAgIERhdGU6IHNlc3Npb24uZGF0ZSxcbiAgICAgICAgICBDbHViOiBjbHViLmNsdWJfbmFtZSxcbiAgICAgICAgICBcIlNob3QgI1wiOiBcIlwiLFxuICAgICAgICAgIFR5cGU6IFwiQXZlcmFnZVwiLFxuICAgICAgICB9O1xuXG4gICAgICAgIGlmIChoYXNUYWdzKHNlc3Npb24pKSB7XG4gICAgICAgICAgYXZnUm93LlRhZyA9IHRhZztcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAoY29uc3QgbWV0cmljIG9mIG9yZGVyZWRNZXRyaWNzKSB7XG4gICAgICAgICAgY29uc3QgY29sTmFtZSA9IGdldENvbHVtbk5hbWUobWV0cmljLCB1bml0Q2hvaWNlKTtcbiAgICAgICAgICBjb25zdCB2YWx1ZXMgPSBzaG90c1xuICAgICAgICAgICAgLm1hcCgocykgPT4gcy5tZXRyaWNzW21ldHJpY10pXG4gICAgICAgICAgICAuZmlsdGVyKCh2KSA9PiB2ICE9PSB1bmRlZmluZWQgJiYgdiAhPT0gXCJcIilcbiAgICAgICAgICAgIC5tYXAoKHYpID0+IHBhcnNlRmxvYXQoU3RyaW5nKHYpKSk7XG4gICAgICAgICAgY29uc3QgbnVtZXJpY1ZhbHVlcyA9IHZhbHVlcy5maWx0ZXIoKHYpID0+ICFpc05hTih2KSk7XG5cbiAgICAgICAgICBpZiAobnVtZXJpY1ZhbHVlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBhdmcgPSBudW1lcmljVmFsdWVzLnJlZHVjZSgoYSwgYikgPT4gYSArIGIsIDApIC8gbnVtZXJpY1ZhbHVlcy5sZW5ndGg7XG4gICAgICAgICAgICBjb25zdCByb3VuZGVkID0gKG1ldHJpYyA9PT0gXCJTbWFzaEZhY3RvclwiIHx8IG1ldHJpYyA9PT0gXCJUZW1wb1wiKVxuICAgICAgICAgICAgICA/IE1hdGgucm91bmQoYXZnICogMTAwKSAvIDEwMFxuICAgICAgICAgICAgICA6IE1hdGgucm91bmQoYXZnICogMTApIC8gMTA7XG4gICAgICAgICAgICBhdmdSb3dbY29sTmFtZV0gPSBTdHJpbmcobm9ybWFsaXplTWV0cmljVmFsdWUocm91bmRlZCwgbWV0cmljLCB1bml0U3lzdGVtLCB1bml0Q2hvaWNlKSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGF2Z1Jvd1tjb2xOYW1lXSA9IFwiXCI7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcm93cy5wdXNoKGF2Z1Jvdyk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgY29uc3QgbGluZXM6IHN0cmluZ1tdID0gW107XG5cbiAgaWYgKGhpdHRpbmdTdXJmYWNlICE9PSB1bmRlZmluZWQpIHtcbiAgICBsaW5lcy5wdXNoKGBIaXR0aW5nIFN1cmZhY2U6ICR7aGl0dGluZ1N1cmZhY2V9YCk7XG4gIH1cblxuICBsaW5lcy5wdXNoKGhlYWRlclJvdy5qb2luKFwiLFwiKSk7XG4gIGZvciAoY29uc3Qgcm93IG9mIHJvd3MpIHtcbiAgICBsaW5lcy5wdXNoKFxuICAgICAgaGVhZGVyUm93XG4gICAgICAgIC5tYXAoKGNvbCkgPT4ge1xuICAgICAgICAgIGNvbnN0IHZhbHVlID0gcm93W2NvbF0gPz8gXCJcIjtcbiAgICAgICAgICBpZiAodmFsdWUuaW5jbHVkZXMoXCIsXCIpIHx8IHZhbHVlLmluY2x1ZGVzKCdcIicpIHx8IHZhbHVlLmluY2x1ZGVzKFwiXFxuXCIpKSB7XG4gICAgICAgICAgICByZXR1cm4gYFwiJHt2YWx1ZS5yZXBsYWNlKC9cIi9nLCAnXCJcIicpfVwiYDtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICB9KVxuICAgICAgICAuam9pbihcIixcIilcbiAgICApO1xuICB9XG5cbiAgcmV0dXJuIGxpbmVzLmpvaW4oXCJcXG5cIik7XG59XG4iLCAiLyoqXG4gKiBTZXNzaW9uIGhpc3Rvcnkgc3RvcmFnZSBtb2R1bGUuXG4gKiBTYXZlcywgZGVkdXBsaWNhdGVzIChieSByZXBvcnRfaWQpLCBhbmQgZXZpY3RzIHNlc3Npb25zIGZyb20gY2hyb21lLnN0b3JhZ2UubG9jYWwuXG4gKi9cblxuaW1wb3J0IHR5cGUgeyBTZXNzaW9uRGF0YSwgU2Vzc2lvblNuYXBzaG90LCBIaXN0b3J5RW50cnkgfSBmcm9tIFwiLi4vbW9kZWxzL3R5cGVzXCI7XG5pbXBvcnQgeyBTVE9SQUdFX0tFWVMgfSBmcm9tIFwiLi9jb25zdGFudHNcIjtcblxuY29uc3QgTUFYX1NFU1NJT05TID0gMjA7XG5cbi8qKiBTdHJpcCByYXdfYXBpX2RhdGEgZnJvbSBhIFNlc3Npb25EYXRhIHRvIGNyZWF0ZSBhIGxpZ2h0d2VpZ2h0IHNuYXBzaG90LiAqL1xuZnVuY3Rpb24gY3JlYXRlU25hcHNob3Qoc2Vzc2lvbjogU2Vzc2lvbkRhdGEpOiBTZXNzaW9uU25hcHNob3Qge1xuICAvLyBEZXN0cnVjdHVyZSB0byBleGNsdWRlIHJhd19hcGlfZGF0YVxuICBjb25zdCB7IHJhd19hcGlfZGF0YTogXywgLi4uc25hcHNob3QgfSA9IHNlc3Npb247XG4gIHJldHVybiBzbmFwc2hvdDtcbn1cblxuLyoqXG4gKiBTYXZlIGEgc2Vzc2lvbiB0byB0aGUgcm9sbGluZyBoaXN0b3J5IGluIGNocm9tZS5zdG9yYWdlLmxvY2FsLlxuICogLSBEZWR1cGxpY2F0ZXMgYnkgcmVwb3J0X2lkIChyZXBsYWNlcyBleGlzdGluZyBlbnRyeSwgcmVmcmVzaGVzIGNhcHR1cmVkX2F0KS5cbiAqIC0gRXZpY3RzIG9sZGVzdCBlbnRyeSB3aGVuIHRoZSAyMC1zZXNzaW9uIGNhcCBpcyByZWFjaGVkLlxuICogLSBTdG9yZXMgZW50cmllcyBzb3J0ZWQgbmV3ZXN0LWZpcnN0IChkZXNjZW5kaW5nIGNhcHR1cmVkX2F0KS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNhdmVTZXNzaW9uVG9IaXN0b3J5KHNlc3Npb246IFNlc3Npb25EYXRhKTogUHJvbWlzZTx2b2lkPiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgY2hyb21lLnN0b3JhZ2UubG9jYWwuZ2V0KFxuICAgICAgW1NUT1JBR0VfS0VZUy5TRVNTSU9OX0hJU1RPUlldLFxuICAgICAgKHJlc3VsdDogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pID0+IHtcbiAgICAgICAgaWYgKGNocm9tZS5ydW50aW1lLmxhc3RFcnJvcikge1xuICAgICAgICAgIHJldHVybiByZWplY3QobmV3IEVycm9yKGNocm9tZS5ydW50aW1lLmxhc3RFcnJvci5tZXNzYWdlKSk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBleGlzdGluZyA9IChyZXN1bHRbU1RPUkFHRV9LRVlTLlNFU1NJT05fSElTVE9SWV0gYXMgSGlzdG9yeUVudHJ5W10gfCB1bmRlZmluZWQpID8/IFtdO1xuXG4gICAgICAgIC8vIFJlbW92ZSBhbnkgZXhpc3RpbmcgZW50cnkgd2l0aCB0aGUgc2FtZSByZXBvcnRfaWQgKGRlZHVwKVxuICAgICAgICBjb25zdCBmaWx0ZXJlZCA9IGV4aXN0aW5nLmZpbHRlcihcbiAgICAgICAgICAoZW50cnkpID0+IGVudHJ5LnNuYXBzaG90LnJlcG9ydF9pZCAhPT0gc2Vzc2lvbi5yZXBvcnRfaWRcbiAgICAgICAgKTtcblxuICAgICAgICAvLyBDcmVhdGUgbmV3IGVudHJ5XG4gICAgICAgIGNvbnN0IG5ld0VudHJ5OiBIaXN0b3J5RW50cnkgPSB7XG4gICAgICAgICAgY2FwdHVyZWRfYXQ6IERhdGUubm93KCksXG4gICAgICAgICAgc25hcHNob3Q6IGNyZWF0ZVNuYXBzaG90KHNlc3Npb24pLFxuICAgICAgICB9O1xuXG4gICAgICAgIGZpbHRlcmVkLnB1c2gobmV3RW50cnkpO1xuXG4gICAgICAgIC8vIFNvcnQgbmV3ZXN0LWZpcnN0IChkZXNjZW5kaW5nIGNhcHR1cmVkX2F0KVxuICAgICAgICBmaWx0ZXJlZC5zb3J0KChhLCBiKSA9PiBiLmNhcHR1cmVkX2F0IC0gYS5jYXB0dXJlZF9hdCk7XG5cbiAgICAgICAgLy8gRW5mb3JjZSBjYXAgXHUyMDE0IHNsaWNlIGtlZXBzIHRoZSBuZXdlc3QgTUFYX1NFU1NJT05TIGVudHJpZXNcbiAgICAgICAgY29uc3QgY2FwcGVkID0gZmlsdGVyZWQuc2xpY2UoMCwgTUFYX1NFU1NJT05TKTtcblxuICAgICAgICBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoXG4gICAgICAgICAgeyBbU1RPUkFHRV9LRVlTLlNFU1NJT05fSElTVE9SWV06IGNhcHBlZCB9LFxuICAgICAgICAgICgpID0+IHtcbiAgICAgICAgICAgIGlmIChjaHJvbWUucnVudGltZS5sYXN0RXJyb3IpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHJlamVjdChuZXcgRXJyb3IoY2hyb21lLnJ1bnRpbWUubGFzdEVycm9yLm1lc3NhZ2UpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgICB9XG4gICAgKTtcbiAgfSk7XG59XG5cbi8qKlxuICogTWFwIHN0b3JhZ2UgZXJyb3Igc3RyaW5ncyB0byB1c2VyLWZyaWVuZGx5IG1lc3NhZ2VzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0SGlzdG9yeUVycm9yTWVzc2FnZShlcnJvcjogc3RyaW5nKTogc3RyaW5nIHtcbiAgaWYgKC9RVU9UQV9CWVRFU3xxdW90YS9pLnRlc3QoZXJyb3IpKSB7XG4gICAgcmV0dXJuIFwiU3RvcmFnZSBmdWxsIC0tIG9sZGVzdCBzZXNzaW9ucyB3aWxsIGJlIGNsZWFyZWRcIjtcbiAgfVxuICByZXR1cm4gXCJDb3VsZCBub3Qgc2F2ZSB0byBzZXNzaW9uIGhpc3RvcnlcIjtcbn1cbiIsICIvKipcbiAqIFBvcnRhbCBwZXJtaXNzaW9uIGhlbHBlcnMgZm9yIFRyYWNrbWFuIEFQSSBhY2Nlc3MuXG4gKiBTaGFyZWQgYnkgcG9wdXAgKHJlcXVlc3QgKyBjaGVjaykgYW5kIHNlcnZpY2Ugd29ya2VyIChjaGVjayBvbmx5KS5cbiAqL1xuXG5leHBvcnQgY29uc3QgUE9SVEFMX09SSUdJTlM6IHJlYWRvbmx5IHN0cmluZ1tdID0gW1xuICBcImh0dHBzOi8vYXBpLnRyYWNrbWFuZ29sZi5jb20vKlwiLFxuICBcImh0dHBzOi8vcG9ydGFsLnRyYWNrbWFuZ29sZi5jb20vKlwiLFxuXSBhcyBjb25zdDtcblxuLyoqIFJldHVybnMgdHJ1ZSBpZiBwb3J0YWwgaG9zdCBwZXJtaXNzaW9ucyBhcmUgY3VycmVudGx5IGdyYW50ZWQuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaGFzUG9ydGFsUGVybWlzc2lvbigpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgcmV0dXJuIGNocm9tZS5wZXJtaXNzaW9ucy5jb250YWlucyh7IG9yaWdpbnM6IFsuLi5QT1JUQUxfT1JJR0lOU10gfSk7XG59XG5cbi8qKlxuICogUmVxdWVzdHMgcG9ydGFsIGhvc3QgcGVybWlzc2lvbnMgZnJvbSB0aGUgdXNlci5cbiAqIE1VU1QgYmUgY2FsbGVkIGZyb20gYSB1c2VyIGdlc3R1cmUgKGJ1dHRvbiBjbGljayBoYW5kbGVyKS5cbiAqIFJldHVybnMgdHJ1ZSBpZiBncmFudGVkLCBmYWxzZSBpZiBkZW5pZWQuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZXF1ZXN0UG9ydGFsUGVybWlzc2lvbigpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgcmV0dXJuIGNocm9tZS5wZXJtaXNzaW9ucy5yZXF1ZXN0KHsgb3JpZ2luczogWy4uLlBPUlRBTF9PUklHSU5TXSB9KTtcbn1cbiIsICIvKipcbiAqIEdyYXBoUUwgY2xpZW50IGZvciBUcmFja21hbiBBUEkuXG4gKiBTZW5kcyBhdXRoZW50aWNhdGVkIHJlcXVlc3RzIHVzaW5nIGJyb3dzZXIgc2Vzc2lvbiBjb29raWVzIChjcmVkZW50aWFsczogaW5jbHVkZSkuXG4gKiBTaGFyZWQgYnkgc2VydmljZSB3b3JrZXIgYW5kIHBvcHVwLlxuICovXG5cbmV4cG9ydCBjb25zdCBHUkFQSFFMX0VORFBPSU5UID0gXCJodHRwczovL2FwaS50cmFja21hbmdvbGYuY29tL2dyYXBocWxcIjtcblxuZXhwb3J0IGNvbnN0IEhFQUxUSF9DSEVDS19RVUVSWSA9IGBxdWVyeSBIZWFsdGhDaGVjayB7IG1lIHsgX190eXBlbmFtZSB9IH1gO1xuXG4vKiogU3RhbmRhcmQgR3JhcGhRTCByZXNwb25zZSBlbnZlbG9wZS4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgR3JhcGhRTFJlc3BvbnNlPFQ+IHtcbiAgZGF0YTogVCB8IG51bGw7XG4gIGVycm9ycz86IEFycmF5PHtcbiAgICBtZXNzYWdlOiBzdHJpbmc7XG4gICAgZXh0ZW5zaW9ucz86IHsgY29kZT86IHN0cmluZyB9O1xuICB9Pjtcbn1cblxuLyoqIEF1dGggY2xhc3NpZmljYXRpb24gcmVzdWx0IHJldHVybmVkIGJ5IGNsYXNzaWZ5QXV0aFJlc3VsdC4gKi9cbmV4cG9ydCB0eXBlIEF1dGhTdGF0dXMgPVxuICB8IHsga2luZDogXCJhdXRoZW50aWNhdGVkXCIgfVxuICB8IHsga2luZDogXCJ1bmF1dGhlbnRpY2F0ZWRcIiB9XG4gIHwgeyBraW5kOiBcImVycm9yXCI7IG1lc3NhZ2U6IHN0cmluZyB9O1xuXG4vKipcbiAqIEV4ZWN1dGVzIGEgR3JhcGhRTCBxdWVyeSBhZ2FpbnN0IHRoZSBUcmFja21hbiBBUEkuXG4gKiBVc2VzIGNyZWRlbnRpYWxzOiBcImluY2x1ZGVcIiBzbyB0aGUgYnJvd3NlciBzZW5kcyBleGlzdGluZyBzZXNzaW9uIGNvb2tpZXMuXG4gKiBUaHJvd3MgaWYgdGhlIEhUVFAgcmVzcG9uc2UgaXMgbm90IDJ4eC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGV4ZWN1dGVRdWVyeTxUPihcbiAgcXVlcnk6IHN0cmluZyxcbiAgdmFyaWFibGVzPzogUmVjb3JkPHN0cmluZywgdW5rbm93bj5cbik6IFByb21pc2U8R3JhcGhRTFJlc3BvbnNlPFQ+PiB7XG4gIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goR1JBUEhRTF9FTkRQT0lOVCwge1xuICAgIG1ldGhvZDogXCJQT1NUXCIsXG4gICAgY3JlZGVudGlhbHM6IFwiaW5jbHVkZVwiLFxuICAgIGhlYWRlcnM6IHsgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIgfSxcbiAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IHF1ZXJ5LCB2YXJpYWJsZXMgfSksXG4gIH0pO1xuXG4gIGlmICghcmVzcG9uc2Uub2spIHtcbiAgICBjb25zdCBib2R5ID0gYXdhaXQgcmVzcG9uc2UudGV4dCgpLmNhdGNoKCgpID0+IFwiKG5vIGJvZHkpXCIpO1xuICAgIGNvbnNvbGUuZXJyb3IoYFRyYWNrUHVsbDogR3JhcGhRTCAke3Jlc3BvbnNlLnN0YXR1c30gcmVzcG9uc2U6YCwgYm9keSk7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBIVFRQICR7cmVzcG9uc2Uuc3RhdHVzfTogJHtib2R5LnNsaWNlKDAsIDIwMCl9YCk7XG4gIH1cblxuICByZXR1cm4gcmVzcG9uc2UuanNvbigpIGFzIFByb21pc2U8R3JhcGhRTFJlc3BvbnNlPFQ+Pjtcbn1cblxuLyoqXG4gKiBDbGFzc2lmaWVzIGEgR3JhcGhRTCByZXNwb25zZSBmcm9tIHRoZSBoZWFsdGgtY2hlY2sgcXVlcnkgaW50byBhbiBBdXRoU3RhdHVzLlxuICpcbiAqIENsYXNzaWZpY2F0aW9uIHByaW9yaXR5OlxuICogMS4gRXJyb3JzIHByZXNlbnQgYW5kIG5vbi1lbXB0eSBcdTIxOTIgY2hlY2sgZm9yIGF1dGggZXJyb3IgcGF0dGVybnMgXHUyMTkyIGVsc2UgZ2VuZXJpYyBlcnJvclxuICogMi4gTm8gZXJyb3JzIGJ1dCBkYXRhLm1lIGlzIGZhbHN5IFx1MjE5MiB1bmF1dGhlbnRpY2F0ZWRcbiAqIDMuIGRhdGEubWUgaXMgdHJ1dGh5IChoYXMgX190eXBlbmFtZSkgXHUyMTkyIGF1dGhlbnRpY2F0ZWRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNsYXNzaWZ5QXV0aFJlc3VsdChcbiAgcmVzdWx0OiBHcmFwaFFMUmVzcG9uc2U8eyBtZTogeyBfX3R5cGVuYW1lOiBzdHJpbmcgfSB8IG51bGwgfT5cbik6IEF1dGhTdGF0dXMge1xuICBpZiAocmVzdWx0LmVycm9ycyAmJiByZXN1bHQuZXJyb3JzLmxlbmd0aCA+IDApIHtcbiAgICBjb25zdCBjb2RlID0gcmVzdWx0LmVycm9yc1swXS5leHRlbnNpb25zPy5jb2RlID8/IFwiXCI7XG4gICAgY29uc3QgbXNnID0gcmVzdWx0LmVycm9yc1swXS5tZXNzYWdlID8/IFwiXCI7XG4gICAgY29uc3QgbXNnTG93ZXIgPSBtc2cudG9Mb3dlckNhc2UoKTtcblxuICAgIGlmIChcbiAgICAgIGNvZGUgPT09IFwiVU5BVVRIRU5USUNBVEVEXCIgfHxcbiAgICAgIG1zZ0xvd2VyLmluY2x1ZGVzKFwidW5hdXRob3JpemVkXCIpIHx8XG4gICAgICBtc2dMb3dlci5pbmNsdWRlcyhcIm5vdCBhdXRob3JpemVkXCIpIHx8XG4gICAgICBtc2dMb3dlci5pbmNsdWRlcyhcInVuYXV0aGVudGljYXRlZFwiKSB8fFxuICAgICAgbXNnTG93ZXIuaW5jbHVkZXMoXCJub3QgbG9nZ2VkIGluXCIpXG4gICAgKSB7XG4gICAgICByZXR1cm4geyBraW5kOiBcInVuYXV0aGVudGljYXRlZFwiIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIHsga2luZDogXCJlcnJvclwiLCBtZXNzYWdlOiBcIlVuYWJsZSB0byByZWFjaCBUcmFja21hbiBcdTIwMTQgdHJ5IGFnYWluIGxhdGVyXCIgfTtcbiAgfVxuXG4gIGlmICghcmVzdWx0LmRhdGE/Lm1lPy5fX3R5cGVuYW1lKSB7XG4gICAgcmV0dXJuIHsga2luZDogXCJ1bmF1dGhlbnRpY2F0ZWRcIiB9O1xuICB9XG5cbiAgcmV0dXJuIHsga2luZDogXCJhdXRoZW50aWNhdGVkXCIgfTtcbn1cbiIsICIvKipcbiAqIFBvcnRhbCBHcmFwaFFMIGFjdGl2aXR5IHBhcnNlci5cbiAqXG4gKiBDb252ZXJ0cyBHcmFwaFFMIGFjdGl2aXR5IHJlc3BvbnNlcyAoZnJvbSBQaGFzZSAyMiBncmFwaHFsX2NsaWVudCkgaW50byB0aGVcbiAqIGV4aXN0aW5nIFNlc3Npb25EYXRhIGZvcm1hdCwgZW5hYmxpbmcgcG9ydGFsLWZldGNoZWQgZGF0YSB0byBmbG93IGludG8gdGhlXG4gKiBDU1YgZXhwb3J0LCBBSSBhbmFseXNpcywgYW5kIHNlc3Npb24gaGlzdG9yeSBwaXBlbGluZS5cbiAqXG4gKiBLZXkgZGVzaWduIGRlY2lzaW9uczpcbiAqIC0gR1JBUEhRTF9NRVRSSUNfQUxJQVMgbWFwcyBhbGwgMjkga25vd24gY2FtZWxDYXNlIEdyYXBoUUwgZmllbGQgbmFtZXMgdG9cbiAqICAgUGFzY2FsQ2FzZSBNRVRSSUNfS0VZUyBuYW1lcy4gVW5rbm93biBmaWVsZHMgYXJlIG5vcm1hbGl6ZWQgdmlhIHRvUGFzY2FsQ2FzZS5cbiAqIC0gRG9lcyBOT1QgaW1wb3J0IE1FVFJJQ19LRVlTIGZyb20gaW50ZXJjZXB0b3IudHMgdG8gYXZvaWQgYWNjaWRlbnRhbGx5XG4gKiAgIGZpbHRlcmluZyB1bmtub3duIGZ1dHVyZSBmaWVsZHMgKEQtMDEgYW50aS1wYXR0ZXJuKS5cbiAqIC0gTnVsbC91bmRlZmluZWQvTmFOIHZhbHVlcyBhcmUgb21pdHRlZCBcdTIwMTQgbm8gcGhhbnRvbSBlbXB0eSBtZXRyaWNzLlxuICogLSBNZXRyaWMgdmFsdWVzIGFyZSBzdG9yZWQgYXMgc3RyaW5ncyBmb3IgY29uc2lzdGVuY3kgd2l0aCBpbnRlcmNlcHRvciBvdXRwdXQuXG4gKiAtIHJlcG9ydF9pZCBpcyB0aGUgVVVJRCBkZWNvZGVkIGZyb20gdGhlIGJhc2U2NCBhY3Rpdml0eSBJRCAoUElQRS0wMyBkZWR1cCkuXG4gKi9cblxuaW1wb3J0IHR5cGUgeyBTZXNzaW9uRGF0YSwgU2hvdCwgQ2x1Ykdyb3VwIH0gZnJvbSBcIi4uL21vZGVscy90eXBlc1wiO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIEV4cG9ydGVkIHR5cGVzICh1c2VkIGJ5IFBoYXNlIDI0IGludGVncmF0aW9uKVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmV4cG9ydCBpbnRlcmZhY2UgU3Ryb2tlTWVhc3VyZW1lbnQge1xuICBba2V5OiBzdHJpbmddOiB1bmtub3duO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEdyYXBoUUxTdHJva2Uge1xuICBjbHViPzogc3RyaW5nIHwgbnVsbDtcbiAgQ2x1Yj86IHN0cmluZyB8IG51bGw7XG4gIHRpbWU/OiBzdHJpbmcgfCBudWxsO1xuICB0YXJnZXREaXN0YW5jZT86IG51bWJlciB8IG51bGw7XG4gIGlzRGVsZXRlZD86IGJvb2xlYW4gfCBudWxsO1xuICBpc1NpbXVsYXRlZD86IGJvb2xlYW4gfCBudWxsO1xuICBtZWFzdXJlbWVudD86IFN0cm9rZU1lYXN1cmVtZW50IHwgbnVsbDtcbiAgTWVhc3VyZW1lbnQ/OiBTdHJva2VNZWFzdXJlbWVudCB8IG51bGw7XG4gIE5vcm1hbGl6ZWRNZWFzdXJlbWVudD86IFN0cm9rZU1lYXN1cmVtZW50IHwgbnVsbDtcbiAgW2tleTogc3RyaW5nXTogdW5rbm93bjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBHcmFwaFFMU3Ryb2tlR3JvdXAge1xuICBjbHViPzogc3RyaW5nIHwgbnVsbDtcbiAgQ2x1Yj86IHN0cmluZyB8IG51bGw7XG4gIG5hbWU/OiBzdHJpbmcgfCBudWxsO1xuICBzdHJva2VzPzogR3JhcGhRTFN0cm9rZVtdIHwgbnVsbDtcbiAgU3Ryb2tlcz86IEdyYXBoUUxTdHJva2VbXSB8IG51bGw7XG4gIFtrZXk6IHN0cmluZ106IHVua25vd247XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgR3JhcGhRTEFjdGl2aXR5IHtcbiAgaWQ6IHN0cmluZztcbiAgX190eXBlbmFtZT86IHN0cmluZyB8IG51bGw7XG4gIGtpbmQ/OiBzdHJpbmcgfCBudWxsO1xuICB0aW1lPzogc3RyaW5nIHwgbnVsbDtcbiAgZGF0ZT86IHN0cmluZyB8IG51bGw7XG4gIHN0cm9rZUNvdW50PzogbnVtYmVyIHwgbnVsbDtcbiAgc3Ryb2tlcz86IEdyYXBoUUxTdHJva2VbXSB8IG51bGw7XG4gIHN0cm9rZUdyb3Vwcz86IEdyYXBoUUxTdHJva2VHcm91cFtdIHwgbnVsbDtcbiAgU3Ryb2tlR3JvdXBzPzogR3JhcGhRTFN0cm9rZUdyb3VwW10gfCBudWxsO1xuICBba2V5OiBzdHJpbmddOiB1bmtub3duO1xufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIEdSQVBIUUxfTUVUUklDX0FMSUFTIFx1MjAxNCBhbGwgMjkgTUVUUklDX0tFWVMgZnJvbSBjYW1lbENhc2UgdG8gUGFzY2FsQ2FzZVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmNvbnN0IEdSQVBIUUxfTUVUUklDX0FMSUFTOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xuICBjbHViU3BlZWQ6IFwiQ2x1YlNwZWVkXCIsXG4gIGJhbGxTcGVlZDogXCJCYWxsU3BlZWRcIixcbiAgc21hc2hGYWN0b3I6IFwiU21hc2hGYWN0b3JcIixcbiAgYXR0YWNrQW5nbGU6IFwiQXR0YWNrQW5nbGVcIixcbiAgY2x1YlBhdGg6IFwiQ2x1YlBhdGhcIixcbiAgZmFjZUFuZ2xlOiBcIkZhY2VBbmdsZVwiLFxuICBmYWNlVG9QYXRoOiBcIkZhY2VUb1BhdGhcIixcbiAgc3dpbmdEaXJlY3Rpb246IFwiU3dpbmdEaXJlY3Rpb25cIixcbiAgc3dpbmdQbGFuZTogXCJTd2luZ1BsYW5lXCIsXG4gIGR5bmFtaWNMb2Z0OiBcIkR5bmFtaWNMb2Z0XCIsXG4gIHNwaW5SYXRlOiBcIlNwaW5SYXRlXCIsXG4gIGJhbGxTcGluOiBcIlNwaW5SYXRlXCIsXG4gIHNwaW5BeGlzOiBcIlNwaW5BeGlzXCIsXG4gIHNwaW5Mb2Z0OiBcIlNwaW5Mb2Z0XCIsXG4gIGxhdW5jaEFuZ2xlOiBcIkxhdW5jaEFuZ2xlXCIsXG4gIGxhdW5jaERpcmVjdGlvbjogXCJMYXVuY2hEaXJlY3Rpb25cIixcbiAgY2Fycnk6IFwiQ2FycnlcIixcbiAgdG90YWw6IFwiVG90YWxcIixcbiAgc2lkZTogXCJTaWRlXCIsXG4gIHNpZGVUb3RhbDogXCJTaWRlVG90YWxcIixcbiAgY2FycnlTaWRlOiBcIkNhcnJ5U2lkZVwiLFxuICB0b3RhbFNpZGU6IFwiVG90YWxTaWRlXCIsXG4gIGhlaWdodDogXCJIZWlnaHRcIixcbiAgbWF4SGVpZ2h0OiBcIk1heEhlaWdodFwiLFxuICBjdXJ2ZTogXCJDdXJ2ZVwiLFxuICBsYW5kaW5nQW5nbGU6IFwiTGFuZGluZ0FuZ2xlXCIsXG4gIGhhbmdUaW1lOiBcIkhhbmdUaW1lXCIsXG4gIGxvd1BvaW50RGlzdGFuY2U6IFwiTG93UG9pbnREaXN0YW5jZVwiLFxuICBpbXBhY3RIZWlnaHQ6IFwiSW1wYWN0SGVpZ2h0XCIsXG4gIGltcGFjdE9mZnNldDogXCJJbXBhY3RPZmZzZXRcIixcbiAgdGVtcG86IFwiVGVtcG9cIixcbn07XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gSGVscGVyIGZ1bmN0aW9uc1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbi8qKiBDb252ZXJ0IGZpcnN0IGNoYXJhY3RlciB0byB1cHBlcmNhc2UgXHUyMDE0IHVzZWQgZm9yIHVua25vd24gZmllbGRzIGJleW9uZCBNRVRSSUNfS0VZUy4gKi9cbmZ1bmN0aW9uIHRvUGFzY2FsQ2FzZShrZXk6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBrZXkuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBrZXkuc2xpY2UoMSk7XG59XG5cbi8qKiBSZXNvbHZlIGEgR3JhcGhRTCBjYW1lbENhc2UgZmllbGQgbmFtZSB0byBpdHMgY2Fub25pY2FsIFBhc2NhbENhc2UgbWV0cmljIGtleS4gKi9cbmZ1bmN0aW9uIG5vcm1hbGl6ZU1ldHJpY0tleShncmFwaHFsS2V5OiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gR1JBUEhRTF9NRVRSSUNfQUxJQVNbZ3JhcGhxbEtleV0gPz8gdG9QYXNjYWxDYXNlKGdyYXBocWxLZXkpO1xufVxuXG5mdW5jdGlvbiBpc1JlY29yZCh2YWx1ZTogdW5rbm93bik6IHZhbHVlIGlzIFJlY29yZDxzdHJpbmcsIHVua25vd24+IHtcbiAgcmV0dXJuIEJvb2xlYW4odmFsdWUpICYmIHR5cGVvZiB2YWx1ZSA9PT0gXCJvYmplY3RcIiAmJiAhQXJyYXkuaXNBcnJheSh2YWx1ZSk7XG59XG5cbmZ1bmN0aW9uIHBpY2tDbHViTmFtZSh2YWx1ZTogdW5rbm93bik6IHN0cmluZyB8IG51bGwge1xuICBpZiAodHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiICYmIHZhbHVlLnRyaW0oKSkgcmV0dXJuIHZhbHVlLnRyaW0oKTtcbiAgaWYgKCFpc1JlY29yZCh2YWx1ZSkpIHJldHVybiBudWxsO1xuICBjb25zdCBjYW5kaWRhdGUgPVxuICAgIHZhbHVlLm5hbWUgPz9cbiAgICB2YWx1ZS5OYW1lID8/XG4gICAgdmFsdWUuZGlzcGxheU5hbWUgPz9cbiAgICB2YWx1ZS5zaG9ydE5hbWUgPz9cbiAgICB2YWx1ZS5pZDtcbiAgcmV0dXJuIHR5cGVvZiBjYW5kaWRhdGUgPT09IFwic3RyaW5nXCIgJiYgY2FuZGlkYXRlLnRyaW0oKVxuICAgID8gY2FuZGlkYXRlLnRyaW0oKVxuICAgIDogbnVsbDtcbn1cblxuZnVuY3Rpb24gZ2V0Q29udGFpbmVyQ2x1Yk5hbWUoY29udGFpbmVyOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IHN0cmluZyB8IG51bGwge1xuICByZXR1cm4gKFxuICAgIHBpY2tDbHViTmFtZShjb250YWluZXIuY2x1YikgPz9cbiAgICBwaWNrQ2x1Yk5hbWUoY29udGFpbmVyLkNsdWIpID8/XG4gICAgcGlja0NsdWJOYW1lKGNvbnRhaW5lci5jbHViTmFtZSkgPz9cbiAgICBwaWNrQ2x1Yk5hbWUoY29udGFpbmVyLm5hbWUpXG4gICk7XG59XG5cbmZ1bmN0aW9uIGdldFN0cm9rZU1lYXN1cmVtZW50KHN0cm9rZTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiBTdHJva2VNZWFzdXJlbWVudCB8IG51bGwge1xuICBjb25zdCBub3JtYWxpemVkID0gaXNSZWNvcmQoc3Ryb2tlLk5vcm1hbGl6ZWRNZWFzdXJlbWVudClcbiAgICA/IHN0cm9rZS5Ob3JtYWxpemVkTWVhc3VyZW1lbnRcbiAgICA6IG51bGw7XG4gIGNvbnN0IG1lYXN1cmVtZW50ID0gaXNSZWNvcmQoc3Ryb2tlLm1lYXN1cmVtZW50KVxuICAgID8gc3Ryb2tlLm1lYXN1cmVtZW50XG4gICAgOiBpc1JlY29yZChzdHJva2UuTWVhc3VyZW1lbnQpXG4gICAgICA/IHN0cm9rZS5NZWFzdXJlbWVudFxuICAgICAgOiBudWxsO1xuXG4gIGlmIChtZWFzdXJlbWVudCAmJiBub3JtYWxpemVkKSB7XG4gICAgcmV0dXJuIHsgLi4ubWVhc3VyZW1lbnQsIC4uLm5vcm1hbGl6ZWQgfTtcbiAgfVxuICByZXR1cm4gKG5vcm1hbGl6ZWQgPz8gbWVhc3VyZW1lbnQpIGFzIFN0cm9rZU1lYXN1cmVtZW50IHwgbnVsbDtcbn1cblxuZnVuY3Rpb24gYXBwZW5kU3Ryb2tlKFxuICBzdHJva2U6IFJlY29yZDxzdHJpbmcsIHVua25vd24+LFxuICBmYWxsYmFja0NsdWI6IHN0cmluZyB8IG51bGwsXG4gIGNsdWJNYXA6IE1hcDxzdHJpbmcsIFNob3RbXT4sXG4gIGFsbE1ldHJpY05hbWVzOiBTZXQ8c3RyaW5nPlxuKTogdm9pZCB7XG4gIGlmIChzdHJva2UuaXNEZWxldGVkID09PSB0cnVlIHx8IHN0cm9rZS5pc1NpbXVsYXRlZCA9PT0gdHJ1ZSkgcmV0dXJuO1xuXG4gIGNvbnN0IG1lYXN1cmVtZW50ID0gZ2V0U3Ryb2tlTWVhc3VyZW1lbnQoc3Ryb2tlKTtcbiAgaWYgKCFtZWFzdXJlbWVudCkgcmV0dXJuO1xuXG4gIGNvbnN0IGNsdWJOYW1lID0gZ2V0Q29udGFpbmVyQ2x1Yk5hbWUoc3Ryb2tlKSA/PyBmYWxsYmFja0NsdWIgPz8gXCJVbmtub3duXCI7XG4gIGNvbnN0IHNob3RNZXRyaWNzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge307XG5cbiAgZm9yIChjb25zdCBba2V5LCB2YWx1ZV0gb2YgT2JqZWN0LmVudHJpZXMobWVhc3VyZW1lbnQpKSB7XG4gICAgaWYgKHZhbHVlID09PSBudWxsIHx8IHZhbHVlID09PSB1bmRlZmluZWQpIGNvbnRpbnVlO1xuXG4gICAgY29uc3QgbnVtVmFsdWUgPVxuICAgICAgdHlwZW9mIHZhbHVlID09PSBcIm51bWJlclwiID8gdmFsdWUgOiBwYXJzZUZsb2F0KFN0cmluZyh2YWx1ZSkpO1xuICAgIGlmIChpc05hTihudW1WYWx1ZSkpIGNvbnRpbnVlO1xuXG4gICAgY29uc3Qgbm9ybWFsaXplZEtleSA9IG5vcm1hbGl6ZU1ldHJpY0tleShrZXkpO1xuICAgIHNob3RNZXRyaWNzW25vcm1hbGl6ZWRLZXldID0gYCR7bnVtVmFsdWV9YDtcbiAgICBhbGxNZXRyaWNOYW1lcy5hZGQobm9ybWFsaXplZEtleSk7XG4gIH1cblxuICBpZiAoT2JqZWN0LmtleXMoc2hvdE1ldHJpY3MpLmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xuXG4gIGNvbnN0IHNob3RzID0gY2x1Yk1hcC5nZXQoY2x1Yk5hbWUpID8/IFtdO1xuICBzaG90cy5wdXNoKHtcbiAgICBzaG90X251bWJlcjogc2hvdHMubGVuZ3RoLFxuICAgIG1ldHJpY3M6IHNob3RNZXRyaWNzLFxuICB9KTtcbiAgY2x1Yk1hcC5zZXQoY2x1Yk5hbWUsIHNob3RzKTtcbn1cblxuZnVuY3Rpb24gY29sbGVjdFN0cm9rZXMoXG4gIHZhbHVlOiB1bmtub3duLFxuICBmYWxsYmFja0NsdWI6IHN0cmluZyB8IG51bGwsXG4gIGNsdWJNYXA6IE1hcDxzdHJpbmcsIFNob3RbXT4sXG4gIGFsbE1ldHJpY05hbWVzOiBTZXQ8c3RyaW5nPlxuKTogdm9pZCB7XG4gIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgIGZvciAoY29uc3QgaXRlbSBvZiB2YWx1ZSkge1xuICAgICAgY29sbGVjdFN0cm9rZXMoaXRlbSwgZmFsbGJhY2tDbHViLCBjbHViTWFwLCBhbGxNZXRyaWNOYW1lcyk7XG4gICAgfVxuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmICghaXNSZWNvcmQodmFsdWUpKSByZXR1cm47XG5cbiAgY29uc3QgY29udGFpbmVyQ2x1YiA9IGdldENvbnRhaW5lckNsdWJOYW1lKHZhbHVlKSA/PyBmYWxsYmFja0NsdWI7XG4gIGlmIChnZXRTdHJva2VNZWFzdXJlbWVudCh2YWx1ZSkpIHtcbiAgICBhcHBlbmRTdHJva2UodmFsdWUsIGNvbnRhaW5lckNsdWIsIGNsdWJNYXAsIGFsbE1ldHJpY05hbWVzKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBmb3IgKGNvbnN0IFtrZXksIG5lc3RlZF0gb2YgT2JqZWN0LmVudHJpZXModmFsdWUpKSB7XG4gICAgaWYgKGtleSA9PT0gXCJtZWFzdXJlbWVudFwiIHx8IGtleSA9PT0gXCJNZWFzdXJlbWVudFwiIHx8IGtleSA9PT0gXCJOb3JtYWxpemVkTWVhc3VyZW1lbnRcIikge1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGlmIChBcnJheS5pc0FycmF5KG5lc3RlZCkgfHwgaXNSZWNvcmQobmVzdGVkKSkge1xuICAgICAgY29sbGVjdFN0cm9rZXMobmVzdGVkLCBjb250YWluZXJDbHViLCBjbHViTWFwLCBhbGxNZXRyaWNOYW1lcyk7XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogRGVjb2RlIGEgVHJhY2ttYW4gYmFzZTY0IGFjdGl2aXR5IElEIHRvIGV4dHJhY3QgdGhlIFVVSUQgcG9ydGlvbi5cbiAqXG4gKiBUcmFja21hbiBlbmNvZGVzIGFjdGl2aXR5IElEcyBhczogYnRvYShcIlNlc3Npb25BY3Rpdml0eVxcbjx1dWlkPlwiKVxuICogUmV0dXJucyB0aGUgcmF3IGlucHV0IHN0cmluZyBpZiBkZWNvZGluZyBmYWlscyBvciBubyBuZXdsaW5lIGlzIGZvdW5kLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZXh0cmFjdEFjdGl2aXR5VXVpZChiYXNlNjRJZDogc3RyaW5nKTogc3RyaW5nIHtcbiAgdHJ5IHtcbiAgICBjb25zdCBkZWNvZGVkID0gYXRvYihiYXNlNjRJZCk7XG4gICAgY29uc3QgcGFydHMgPSBkZWNvZGVkLnNwbGl0KFwiXFxuXCIpO1xuICAgIGNvbnN0IHV1aWQgPSBwYXJ0c1sxXT8udHJpbSgpO1xuICAgIGlmICghdXVpZCkgcmV0dXJuIGJhc2U2NElkO1xuICAgIHJldHVybiB1dWlkO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gYmFzZTY0SWQ7XG4gIH1cbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBNYWluIGV4cG9ydGVkIHBhcnNlclxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbi8qKlxuICogQ29udmVydCBhIEdyYXBoUUwgYWN0aXZpdHkgcmVzcG9uc2UgaW50byB0aGUgU2Vzc2lvbkRhdGEgZm9ybWF0LlxuICpcbiAqIFJldHVybnMgbnVsbCBpZiB0aGUgYWN0aXZpdHkgaXMgbWFsZm9ybWVkLCBtaXNzaW5nIGFuIElELCBvciBwcm9kdWNlcyBub1xuICogdmFsaWQgY2x1YiBncm91cHMgYWZ0ZXIgZmlsdGVyaW5nIGVtcHR5L251bGwgc3Ryb2tlcy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlUG9ydGFsQWN0aXZpdHkoXG4gIGFjdGl2aXR5OiBHcmFwaFFMQWN0aXZpdHlcbik6IFNlc3Npb25EYXRhIHwgbnVsbCB7XG4gIHRyeSB7XG4gICAgaWYgKCFhY3Rpdml0eT8uaWQpIHJldHVybiBudWxsO1xuXG4gICAgY29uc3QgcmVwb3J0SWQgPSBleHRyYWN0QWN0aXZpdHlVdWlkKGFjdGl2aXR5LmlkKTtcbiAgICBjb25zdCBkYXRlID0gYWN0aXZpdHkudGltZSA/PyBhY3Rpdml0eS5kYXRlID8/IFwiVW5rbm93blwiO1xuICAgIGNvbnN0IGFsbE1ldHJpY05hbWVzID0gbmV3IFNldDxzdHJpbmc+KCk7XG5cbiAgICBjb25zdCBjbHViTWFwID0gbmV3IE1hcDxzdHJpbmcsIFNob3RbXT4oKTtcbiAgICBjb2xsZWN0U3Ryb2tlcyhhY3Rpdml0eSwgbnVsbCwgY2x1Yk1hcCwgYWxsTWV0cmljTmFtZXMpO1xuXG4gICAgaWYgKGNsdWJNYXAuc2l6ZSA9PT0gMCkgcmV0dXJuIG51bGw7XG5cbiAgICBjb25zdCBjbHViX2dyb3VwczogQ2x1Ykdyb3VwW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IFtjbHViTmFtZSwgc2hvdHNdIG9mIGNsdWJNYXApIHtcbiAgICAgIGNsdWJfZ3JvdXBzLnB1c2goe1xuICAgICAgICBjbHViX25hbWU6IGNsdWJOYW1lLFxuICAgICAgICBzaG90cyxcbiAgICAgICAgYXZlcmFnZXM6IHt9LFxuICAgICAgICBjb25zaXN0ZW5jeToge30sXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBjb25zdCBzZXNzaW9uOiBTZXNzaW9uRGF0YSA9IHtcbiAgICAgIGRhdGUsXG4gICAgICByZXBvcnRfaWQ6IHJlcG9ydElkLFxuICAgICAgdXJsX3R5cGU6IFwiYWN0aXZpdHlcIixcbiAgICAgIGNsdWJfZ3JvdXBzLFxuICAgICAgbWV0cmljX25hbWVzOiBBcnJheS5mcm9tKGFsbE1ldHJpY05hbWVzKS5zb3J0KCksXG4gICAgICBtZXRhZGF0YV9wYXJhbXM6IHtcbiAgICAgICAgYWN0aXZpdHlfaWQ6IGFjdGl2aXR5LmlkLFxuICAgICAgICAuLi4oYWN0aXZpdHkuX190eXBlbmFtZSA/IHsgYWN0aXZpdHlfdHlwZTogYWN0aXZpdHkuX190eXBlbmFtZSB9IDoge30pLFxuICAgICAgICAuLi4oYWN0aXZpdHkua2luZCA/IHsgYWN0aXZpdHlfa2luZDogYWN0aXZpdHkua2luZCB9IDoge30pLFxuICAgICAgfSxcbiAgICB9O1xuXG4gICAgcmV0dXJuIHNlc3Npb247XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIGNvbnNvbGUuZXJyb3IoXCJbcG9ydGFsX3BhcnNlcl0gRmFpbGVkIHRvIHBhcnNlIGFjdGl2aXR5OlwiLCBlcnIpO1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG4iLCAiLyoqXG4gKiBJbXBvcnQgc3RhdHVzIHR5cGVzIGFuZCBHcmFwaFFMIHF1ZXJpZXMgZm9yIHBvcnRhbCBzZXNzaW9uIGltcG9ydC5cbiAqIFBlciBELTAxOiBzaW1wbGUgcmVzdWx0LW9ubHkgc3RhdHVzIFx1MjAxNCBpZGxlL2ltcG9ydGluZy9zdWNjZXNzL2Vycm9yLlxuICovXG5cbi8qKiBJbXBvcnQgc3RhdHVzIHN0b3JlZCBpbiBjaHJvbWUuc3RvcmFnZS5sb2NhbCB1bmRlciBTVE9SQUdFX0tFWVMuSU1QT1JUX1NUQVRVUy4gUGVyIEQtMDEuICovXG5leHBvcnQgdHlwZSBJbXBvcnRTdGF0dXMgPVxuICB8IHsgc3RhdGU6IFwiaWRsZVwiIH1cbiAgfCB7IHN0YXRlOiBcImltcG9ydGluZ1wiIH1cbiAgfCB7IHN0YXRlOiBcInN1Y2Nlc3NcIiB9XG4gIHwgeyBzdGF0ZTogXCJlcnJvclwiOyBtZXNzYWdlOiBzdHJpbmcgfTtcblxuLyoqIEFjdGl2aXR5IHN1bW1hcnkgcmV0dXJuZWQgYnkgRkVUQ0hfQUNUSVZJVElFUyBoYW5kbGVyLiAqL1xuZXhwb3J0IGludGVyZmFjZSBBY3Rpdml0eVN1bW1hcnkge1xuICBpZDogc3RyaW5nO1xuICBkYXRlOiBzdHJpbmc7XG4gIHN0cm9rZUNvdW50OiBudW1iZXIgfCBudWxsOyAgLy8gbnVsbCBpZiBmaWVsZCB1bmF2YWlsYWJsZSBmcm9tIEFQSVxuICB0eXBlOiBzdHJpbmcgfCBudWxsOyAgICAgICAgIC8vIG51bGwgaWYgZmllbGQgdW5hdmFpbGFibGUgZnJvbSBBUElcbiAgY291cnNlTmFtZT86IHN0cmluZyB8IG51bGw7ICAvLyBDb3Vyc2UuZGlzcGxheU5hbWUgd2hlbiBhdmFpbGFibGVcbn1cblxuZXhwb3J0IGludGVyZmFjZSBJbXBvcnRTZXNzaW9uUXVlcnlDYW5kaWRhdGUge1xuICBsYWJlbDogc3RyaW5nO1xuICBxdWVyeTogc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEZldGNoQWN0aXZpdGllc1F1ZXJ5Q2FuZGlkYXRlIHtcbiAgbGFiZWw6IHN0cmluZztcbiAgcXVlcnk6IHN0cmluZztcbiAgcGFnaW5hdGVkPzogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGNvbnN0IEZFVENIX0FDVElWSVRJRVNfUEFHRV9TSVpFID0gMTAwO1xuZXhwb3J0IGNvbnN0IEZFVENIX0FDVElWSVRJRVNfTUFYX1BBR0VTID0gMTAwO1xuXG5jb25zdCBBQ1RJVklUWV9TVU1NQVJZX0ZJRUxEUyA9IGBcbiAgaWRcbiAgdGltZVxuICBraW5kXG4gIF9fdHlwZW5hbWVcbiAgLi4uIG9uIENvdXJzZVBsYXlBY3Rpdml0eSB7XG4gICAgY291cnNlIHtcbiAgICAgIGRpc3BsYXlOYW1lXG4gICAgfVxuICB9XG4gIC4uLiBvbiBNYXBNeUJhZ1Nlc3Npb25BY3Rpdml0eSB7XG4gICAgc3Ryb2tlQ291bnRcbiAgfVxuYDtcblxuY29uc3QgQUNUSVZJVFlfQ09VUlNFX1NVTU1BUllfRklFTERTID0gYFxuICBpZFxuICB0aW1lXG4gIF9fdHlwZW5hbWVcbiAgLi4uIG9uIENvdXJzZVBsYXlBY3Rpdml0eSB7XG4gICAgY291cnNlIHtcbiAgICAgIGRpc3BsYXlOYW1lXG4gICAgfVxuICB9XG5gO1xuXG5jb25zdCBBQ1RJVklUWV9NSU5JTUFMX1RJTUVfRklFTERTID0gYFxuICBpZFxuICB0aW1lXG4gIF9fdHlwZW5hbWVcbmA7XG5cbmNvbnN0IEFDVElWSVRZX01JTklNQUxfREFURV9GSUVMRFMgPSBgXG4gIGlkXG4gIGRhdGVcbiAgX190eXBlbmFtZVxuYDtcblxuLyoqXG4gKiBGZXRjaCBDb3Vyc2UgUGxheSBhbmQgTWFwIE15IEJhZyBhY3Rpdml0aWVzIHZpYSBtZS5hY3Rpdml0aWVzLiBUaGUgbGl2ZSBBUElcbiAqIHJldHVybnMgYSBjb2xsZWN0aW9uIHNlZ21lbnQsIHNvIGFjdGl2aXR5IGZpZWxkcyBhcmUgdW5kZXIgaXRlbXMuXG4gKi9cbmV4cG9ydCBjb25zdCBGRVRDSF9BQ1RJVklUSUVTX1FVRVJZID0gYFxuICBxdWVyeSBHZXRQbGF5ZXJBY3Rpdml0aWVzKCRza2lwOiBJbnQhLCAkdGFrZTogSW50ISkge1xuICAgIG1lIHtcbiAgICAgIGFjdGl2aXRpZXMoa2luZHM6IFtDT1VSU0VfUExBWSwgTUFQX01ZX0JBR10sIHNraXA6ICRza2lwLCB0YWtlOiAkdGFrZSkge1xuICAgICAgICB0b3RhbENvdW50XG4gICAgICAgIHBhZ2VJbmZvIHtcbiAgICAgICAgICBoYXNOZXh0UGFnZVxuICAgICAgICB9XG4gICAgICAgIGl0ZW1zIHtcbiAgICAgICAgICAke0FDVElWSVRZX1NVTU1BUllfRklFTERTfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5gO1xuXG4vKipcbiAqIFRyYWNrbWFuJ3MgbGl2ZSBwb3J0YWwgZXhwb3NlcyB0aGUgdXNlcidzIGFjdGl2aXR5IGxpc3QgdW5kZXIgbWUuYWN0aXZpdGllcy5cbiAqIEF2b2lkIGJyb2FkZXIgcm9vdC1sZXZlbCBhY3Rpdml0eSBxdWVyaWVzIGJlY2F1c2UgdGhleSBjYW4gZmFpbCBhdXRob3JpemF0aW9uLlxuICovXG5leHBvcnQgY29uc3QgRkVUQ0hfQUNUSVZJVElFU19RVUVSWV9DQU5ESURBVEVTOiBGZXRjaEFjdGl2aXRpZXNRdWVyeUNhbmRpZGF0ZVtdID0gW1xuICB7IGxhYmVsOiBcIm1lLmFjdGl2aXRpZXMuaXRlbXM6a2luZHMtcGFnZVwiLCBxdWVyeTogRkVUQ0hfQUNUSVZJVElFU19RVUVSWSwgcGFnaW5hdGVkOiB0cnVlIH0sXG4gIHtcbiAgICBsYWJlbDogXCJtZS5hY3Rpdml0aWVzLml0ZW1zOmFsbC1wYWdlXCIsXG4gICAgcGFnaW5hdGVkOiB0cnVlLFxuICAgIHF1ZXJ5OiBgXG4gICAgICBxdWVyeSBHZXRQbGF5ZXJBY3Rpdml0aWVzKCRza2lwOiBJbnQhLCAkdGFrZTogSW50ISkge1xuICAgICAgICBtZSB7XG4gICAgICAgICAgYWN0aXZpdGllcyhza2lwOiAkc2tpcCwgdGFrZTogJHRha2UpIHtcbiAgICAgICAgICAgIHRvdGFsQ291bnRcbiAgICAgICAgICAgIHBhZ2VJbmZvIHtcbiAgICAgICAgICAgICAgaGFzTmV4dFBhZ2VcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGl0ZW1zIHtcbiAgICAgICAgICAgICAgJHtBQ1RJVklUWV9TVU1NQVJZX0ZJRUxEU31cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICBgLFxuICB9LFxuICB7XG4gICAgbGFiZWw6IFwibWUuYWN0aXZpdGllcy5pdGVtczpjb3Vyc2UtdGltZVwiLFxuICAgIHF1ZXJ5OiBgXG4gICAgICBxdWVyeSBHZXRQbGF5ZXJBY3Rpdml0aWVzIHtcbiAgICAgICAgbWUge1xuICAgICAgICAgIGFjdGl2aXRpZXMge1xuICAgICAgICAgICAgaXRlbXMge1xuICAgICAgICAgICAgICAke0FDVElWSVRZX0NPVVJTRV9TVU1NQVJZX0ZJRUxEU31cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICBgLFxuICB9LFxuICB7XG4gICAgbGFiZWw6IFwibWUuYWN0aXZpdGllcy5pdGVtczpkYXRlXCIsXG4gICAgcXVlcnk6IGBcbiAgICAgIHF1ZXJ5IEdldFBsYXllckFjdGl2aXRpZXMge1xuICAgICAgICBtZSB7XG4gICAgICAgICAgYWN0aXZpdGllcyB7XG4gICAgICAgICAgICBpdGVtcyB7XG4gICAgICAgICAgICAgICR7QUNUSVZJVFlfTUlOSU1BTF9EQVRFX0ZJRUxEU31cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICBgLFxuICB9LFxuICB7XG4gICAgbGFiZWw6IFwibWUuYWN0aXZpdGllcy5ub2Rlczp0aW1lXCIsXG4gICAgcXVlcnk6IGBcbiAgICAgIHF1ZXJ5IEdldFBsYXllckFjdGl2aXRpZXMge1xuICAgICAgICBtZSB7XG4gICAgICAgICAgYWN0aXZpdGllcyB7XG4gICAgICAgICAgICBub2RlcyB7XG4gICAgICAgICAgICAgICR7QUNUSVZJVFlfTUlOSU1BTF9USU1FX0ZJRUxEU31cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICBgLFxuICB9LFxuICB7XG4gICAgbGFiZWw6IFwibWUuYWN0aXZpdGllcy5ub2RlczpkYXRlXCIsXG4gICAgcXVlcnk6IGBcbiAgICAgIHF1ZXJ5IEdldFBsYXllckFjdGl2aXRpZXMge1xuICAgICAgICBtZSB7XG4gICAgICAgICAgYWN0aXZpdGllcyB7XG4gICAgICAgICAgICBub2RlcyB7XG4gICAgICAgICAgICAgICR7QUNUSVZJVFlfTUlOSU1BTF9EQVRFX0ZJRUxEU31cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICBgLFxuICB9LFxuICB7XG4gICAgbGFiZWw6IFwibWUuYWN0aXZpdGllcy5jb25uZWN0aW9uOnRpbWVcIixcbiAgICBxdWVyeTogYFxuICAgICAgcXVlcnkgR2V0UGxheWVyQWN0aXZpdGllcyB7XG4gICAgICAgIG1lIHtcbiAgICAgICAgICBhY3Rpdml0aWVzKGZpcnN0OiAyMCkge1xuICAgICAgICAgICAgZWRnZXMge1xuICAgICAgICAgICAgICBub2RlIHtcbiAgICAgICAgICAgICAgICBpZFxuICAgICAgICAgICAgICAgIHRpbWVcbiAgICAgICAgICAgICAgICBfX3R5cGVuYW1lXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICBgLFxuICB9LFxuICB7XG4gICAgbGFiZWw6IFwibWUuYWN0aXZpdGllcy5jb25uZWN0aW9uOmRhdGVcIixcbiAgICBxdWVyeTogYFxuICAgICAgcXVlcnkgR2V0UGxheWVyQWN0aXZpdGllcyB7XG4gICAgICAgIG1lIHtcbiAgICAgICAgICBhY3Rpdml0aWVzKGZpcnN0OiAyMCkge1xuICAgICAgICAgICAgZWRnZXMge1xuICAgICAgICAgICAgICBub2RlIHtcbiAgICAgICAgICAgICAgICBpZFxuICAgICAgICAgICAgICAgIGRhdGVcbiAgICAgICAgICAgICAgICBfX3R5cGVuYW1lXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICBgLFxuICB9LFxuXTtcblxuY29uc3QgU1VQUE9SVEVEX0FDVElWSVRZX1RZUEVTID0gbmV3IFNldChbXG4gIFwiQ291cnNlUGxheUFjdGl2aXR5XCIsXG4gIFwiQ291cnNlU2Vzc2lvbkFjdGl2aXR5XCIsXG4gIFwiQ09VUlNFX1BMQVlcIixcbiAgXCJNYXBNeUJhZ0FjdGl2aXR5XCIsXG4gIFwiTWFwTXlCYWdTZXNzaW9uQWN0aXZpdHlcIixcbiAgXCJCYWdNYXBwaW5nQWN0aXZpdHlcIixcbiAgXCJNQVBfTVlfQkFHXCIsXG5dKTtcblxuZXhwb3J0IGZ1bmN0aW9uIGlzU3VwcG9ydGVkUG9ydGFsQWN0aXZpdHlUeXBlKHR5cGU6IHN0cmluZyB8IG51bGwpOiBib29sZWFuIHtcbiAgcmV0dXJuIHR5cGUgIT09IG51bGwgJiYgU1VQUE9SVEVEX0FDVElWSVRZX1RZUEVTLmhhcyh0eXBlKTtcbn1cblxuZnVuY3Rpb24gZ2V0QWN0aXZpdHlUeXBlKHJlY29yZDogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiBzdHJpbmcgfCBudWxsIHtcbiAgaWYgKHR5cGVvZiByZWNvcmQuX190eXBlbmFtZSA9PT0gXCJzdHJpbmdcIikgcmV0dXJuIHJlY29yZC5fX3R5cGVuYW1lO1xuICBpZiAodHlwZW9mIHJlY29yZC50eXBlID09PSBcInN0cmluZ1wiKSByZXR1cm4gcmVjb3JkLnR5cGU7XG4gIGlmICh0eXBlb2YgcmVjb3JkLmtpbmQgPT09IFwic3RyaW5nXCIpIHJldHVybiByZWNvcmQua2luZDtcbiAgcmV0dXJuIG51bGw7XG59XG5cbmZ1bmN0aW9uIGdldENvdXJzZU5hbWUocmVjb3JkOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IHN0cmluZyB8IG51bGwge1xuICBjb25zdCBjb3Vyc2UgPSByZWNvcmQuY291cnNlO1xuICBpZiAoIWNvdXJzZSB8fCB0eXBlb2YgY291cnNlICE9PSBcIm9iamVjdFwiKSByZXR1cm4gbnVsbDtcbiAgY29uc3QgY291cnNlUmVjb3JkID0gY291cnNlIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xuICBpZiAodHlwZW9mIGNvdXJzZVJlY29yZC5kaXNwbGF5TmFtZSA9PT0gXCJzdHJpbmdcIiAmJiBjb3Vyc2VSZWNvcmQuZGlzcGxheU5hbWUudHJpbSgpKSB7XG4gICAgcmV0dXJuIGNvdXJzZVJlY29yZC5kaXNwbGF5TmFtZTtcbiAgfVxuICBpZiAodHlwZW9mIGNvdXJzZVJlY29yZC5uYW1lID09PSBcInN0cmluZ1wiICYmIGNvdXJzZVJlY29yZC5uYW1lLnRyaW0oKSkge1xuICAgIHJldHVybiBjb3Vyc2VSZWNvcmQubmFtZTtcbiAgfVxuICByZXR1cm4gbnVsbDtcbn1cblxuZnVuY3Rpb24gbm9ybWFsaXplQWN0aXZpdHlSZWNvcmQodmFsdWU6IHVua25vd24pOiBBY3Rpdml0eVN1bW1hcnkgfCBudWxsIHtcbiAgaWYgKCF2YWx1ZSB8fCB0eXBlb2YgdmFsdWUgIT09IFwib2JqZWN0XCIpIHJldHVybiBudWxsO1xuICBjb25zdCByZWNvcmQgPSB2YWx1ZSBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcbiAgaWYgKHR5cGVvZiByZWNvcmQuaWQgIT09IFwic3RyaW5nXCIpIHJldHVybiBudWxsO1xuXG4gIGNvbnN0IHJhd0RhdGUgPSByZWNvcmQudGltZSA/PyByZWNvcmQuZGF0ZTtcbiAgY29uc3QgcmF3VHlwZSA9IGdldEFjdGl2aXR5VHlwZShyZWNvcmQpO1xuICBjb25zdCByYXdLaW5kID0gdHlwZW9mIHJlY29yZC5raW5kID09PSBcInN0cmluZ1wiID8gcmVjb3JkLmtpbmQgOiBudWxsO1xuICBjb25zdCB0eXBlID0gaXNTdXBwb3J0ZWRQb3J0YWxBY3Rpdml0eVR5cGUocmF3VHlwZSlcbiAgICA/IHJhd1R5cGVcbiAgICA6IGlzU3VwcG9ydGVkUG9ydGFsQWN0aXZpdHlUeXBlKHJhd0tpbmQpXG4gICAgICA/IHJhd0tpbmRcbiAgICAgIDogbnVsbDtcbiAgaWYgKCF0eXBlKSByZXR1cm4gbnVsbDtcblxuICByZXR1cm4ge1xuICAgIGlkOiByZWNvcmQuaWQsXG4gICAgZGF0ZTogdHlwZW9mIHJhd0RhdGUgPT09IFwic3RyaW5nXCIgPyByYXdEYXRlIDogXCJcIixcbiAgICBzdHJva2VDb3VudDogdHlwZW9mIHJlY29yZC5zdHJva2VDb3VudCA9PT0gXCJudW1iZXJcIiA/IHJlY29yZC5zdHJva2VDb3VudCA6IG51bGwsXG4gICAgdHlwZSxcbiAgICBjb3Vyc2VOYW1lOiBnZXRDb3Vyc2VOYW1lKHJlY29yZCksXG4gIH07XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQWN0aXZpdHlTdW1tYXJ5UGFnZSB7XG4gIGFjdGl2aXRpZXM6IEFjdGl2aXR5U3VtbWFyeVtdO1xuICBpdGVtQ291bnQ6IG51bWJlcjtcbiAgdG90YWxDb3VudDogbnVtYmVyIHwgbnVsbDtcbiAgaGFzTmV4dFBhZ2U6IGJvb2xlYW4gfCBudWxsO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbm9ybWFsaXplQWN0aXZpdHlTdW1tYXJ5UGFnZShkYXRhOiB1bmtub3duKTogQWN0aXZpdHlTdW1tYXJ5UGFnZSB7XG4gIGNvbnN0IGVtcHR5UGFnZTogQWN0aXZpdHlTdW1tYXJ5UGFnZSA9IHtcbiAgICBhY3Rpdml0aWVzOiBbXSxcbiAgICBpdGVtQ291bnQ6IDAsXG4gICAgdG90YWxDb3VudDogbnVsbCxcbiAgICBoYXNOZXh0UGFnZTogbnVsbCxcbiAgfTtcbiAgaWYgKCFkYXRhIHx8IHR5cGVvZiBkYXRhICE9PSBcIm9iamVjdFwiKSByZXR1cm4gZW1wdHlQYWdlO1xuICBjb25zdCByZWNvcmQgPSBkYXRhIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xuICBjb25zdCBtZSA9IHJlY29yZC5tZSAmJiB0eXBlb2YgcmVjb3JkLm1lID09PSBcIm9iamVjdFwiXG4gICAgPyByZWNvcmQubWUgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj5cbiAgICA6IHVuZGVmaW5lZDtcbiAgY29uc3Qgcm9vdHMgPSBbbWU/LmFjdGl2aXRpZXMsIHJlY29yZC5hY3Rpdml0aWVzXTtcblxuICBmb3IgKGNvbnN0IHJvb3Qgb2Ygcm9vdHMpIHtcbiAgICBsZXQgY2FuZGlkYXRlczogdW5rbm93bltdID0gW107XG4gICAgbGV0IHRvdGFsQ291bnQ6IG51bWJlciB8IG51bGwgPSBudWxsO1xuICAgIGxldCBoYXNOZXh0UGFnZTogYm9vbGVhbiB8IG51bGwgPSBudWxsO1xuICAgIGlmIChBcnJheS5pc0FycmF5KHJvb3QpKSB7XG4gICAgICBjYW5kaWRhdGVzID0gcm9vdDtcbiAgICB9IGVsc2UgaWYgKHJvb3QgJiYgdHlwZW9mIHJvb3QgPT09IFwib2JqZWN0XCIpIHtcbiAgICAgIGNvbnN0IHJvb3RSZWNvcmQgPSByb290IGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xuICAgICAgdG90YWxDb3VudCA9IHR5cGVvZiByb290UmVjb3JkLnRvdGFsQ291bnQgPT09IFwibnVtYmVyXCIgPyByb290UmVjb3JkLnRvdGFsQ291bnQgOiBudWxsO1xuICAgICAgY29uc3QgcGFnZUluZm8gPSByb290UmVjb3JkLnBhZ2VJbmZvO1xuICAgICAgaWYgKHBhZ2VJbmZvICYmIHR5cGVvZiBwYWdlSW5mbyA9PT0gXCJvYmplY3RcIikge1xuICAgICAgICBjb25zdCBwYWdlSW5mb1JlY29yZCA9IHBhZ2VJbmZvIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xuICAgICAgICBoYXNOZXh0UGFnZSA9IHR5cGVvZiBwYWdlSW5mb1JlY29yZC5oYXNOZXh0UGFnZSA9PT0gXCJib29sZWFuXCJcbiAgICAgICAgICA/IHBhZ2VJbmZvUmVjb3JkLmhhc05leHRQYWdlXG4gICAgICAgICAgOiBudWxsO1xuICAgICAgfVxuICAgICAgaWYgKEFycmF5LmlzQXJyYXkocm9vdFJlY29yZC5pdGVtcykpIHtcbiAgICAgICAgY2FuZGlkYXRlcyA9IHJvb3RSZWNvcmQuaXRlbXM7XG4gICAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkocm9vdFJlY29yZC5ub2RlcykpIHtcbiAgICAgICAgY2FuZGlkYXRlcyA9IHJvb3RSZWNvcmQubm9kZXM7XG4gICAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkocm9vdFJlY29yZC5lZGdlcykpIHtcbiAgICAgICAgY2FuZGlkYXRlcyA9IHJvb3RSZWNvcmQuZWRnZXMubWFwKChlZGdlKSA9PiAoXG4gICAgICAgICAgZWRnZSAmJiB0eXBlb2YgZWRnZSA9PT0gXCJvYmplY3RcIlxuICAgICAgICAgICAgPyAoZWRnZSBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPikubm9kZVxuICAgICAgICAgICAgOiBudWxsXG4gICAgICAgICkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IGFjdGl2aXRpZXMgPSBjYW5kaWRhdGVzXG4gICAgICAubWFwKG5vcm1hbGl6ZUFjdGl2aXR5UmVjb3JkKVxuICAgICAgLmZpbHRlcigoYWN0aXZpdHkpOiBhY3Rpdml0eSBpcyBBY3Rpdml0eVN1bW1hcnkgPT4gQm9vbGVhbihhY3Rpdml0eSkpO1xuICAgIGlmIChjYW5kaWRhdGVzLmxlbmd0aCA+IDAgfHwgdG90YWxDb3VudCAhPT0gbnVsbCB8fCBoYXNOZXh0UGFnZSAhPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgYWN0aXZpdGllcyxcbiAgICAgICAgaXRlbUNvdW50OiBjYW5kaWRhdGVzLmxlbmd0aCxcbiAgICAgICAgdG90YWxDb3VudCxcbiAgICAgICAgaGFzTmV4dFBhZ2UsXG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBlbXB0eVBhZ2U7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBub3JtYWxpemVBY3Rpdml0eVN1bW1hcmllcyhkYXRhOiB1bmtub3duKTogQWN0aXZpdHlTdW1tYXJ5W10ge1xuICByZXR1cm4gbm9ybWFsaXplQWN0aXZpdHlTdW1tYXJ5UGFnZShkYXRhKS5hY3Rpdml0aWVzO1xufVxuXG4vKipcbiAqIEZldGNoIGEgc2luZ2xlIGFjdGl2aXR5IGJ5IElEIHdpdGggZnVsbCBzdHJva2UgZGF0YS5cbiAqIFRoZSBub2RlKGlkOikgcXVlcnkgb24gYmFzZTY0LWVuY29kZWQgU2Vzc2lvbkFjdGl2aXR5IElEcyB3YXMgY29uZmlybWVkXG4gKiB3b3JraW5nIGR1cmluZyBQaGFzZSAyMiByZXNlYXJjaC5cbiAqIEFQSSB1c2VzIGZsYXQgc3Ryb2tlcyAoZWFjaCBzdHJva2UgaGFzIGl0cyBvd24gY2x1YiBmaWVsZCkuXG4gKi9cbi8qKlxuICogRnJhZ21lbnQgZm9yIHN0cm9rZSBtZWFzdXJlbWVudCBmaWVsZHMgc2hhcmVkIGFjcm9zcyBhbGwgYWN0aXZpdHkgdHlwZXMuXG4gKiBOb3RlOiBpc0RlbGV0ZWQvaXNTaW11bGF0ZWQgb25seSBleGlzdCBvbiBSYW5nZUZpbmRNeURpc3RhbmNlQWN0aXZpdHkgc3Ryb2tlcyxcbiAqIG5vdCBvbiB0aGUgU3Ryb2tlIHR5cGUgdXNlZCBieSBTZXNzaW9uQWN0aXZpdHkgYW5kIGZyaWVuZHMuXG4gKi9cbmNvbnN0IFNUUk9LRV9NRUFTVVJFTUVOVF9GSUVMRFMgPSBgXG4gIGNsdWJTcGVlZCBiYWxsU3BlZWQgc21hc2hGYWN0b3IgYXR0YWNrQW5nbGUgY2x1YlBhdGggZmFjZUFuZ2xlXG4gIGZhY2VUb1BhdGggc3dpbmdEaXJlY3Rpb24gc3dpbmdQbGFuZSBkeW5hbWljTG9mdCBzcGluUmF0ZSBzcGluQXhpcyBzcGluTG9mdFxuICBsYXVuY2hBbmdsZSBsYXVuY2hEaXJlY3Rpb24gY2FycnkgdG90YWwgY2FycnlTaWRlIHRvdGFsU2lkZVxuICBtYXhIZWlnaHQgbGFuZGluZ0FuZ2xlIGhhbmdUaW1lXG5gO1xuXG5jb25zdCBTQ09SRUNBUkRfU0hPVF9NRUFTVVJFTUVOVF9GSUVMRFMgPSBgXG4gIGJhbGxTcGVlZCBjYXJyeVNpZGVBY3R1YWwgY2FycnlBY3R1YWwgbGF1bmNoRGlyZWN0aW9uIG1heEhlaWdodCBjYXJyeSB0b3RhbFxuICBjYXJyeVNpZGUgbGF1bmNoQW5nbGUgc3BpblJhdGUgc3BpbkF4aXMgYmFja3N3aW5nVGltZSBmb3J3YXJkc3dpbmdUaW1lIHRlbXBvXG4gIHN0cm9rZUxlbmd0aCBkeW5hbWljTGllIGltcGFjdE9mZnNldCBpbXBhY3RIZWlnaHQgc2tpZERpc3RhbmNlIHJvbGxQZXJjZW50YWdlXG4gIHJvbGxTcGVlZCBzcGVlZERyb3Agcm9sbERlY2VsZXJhdGlvbiBlZmZlY3RpdmVTdGltcCBmbGF0U3RpbXAgYnJlYWsgYm91bmNlc1xuICBlbnRyeVNwZWVkRGlzdGFuY2UgZWxldmF0aW9uIHNsb3BlUGVyY2VudGFnZVNpZGUgc2xvcGVQZXJjZW50YWdlUmlzZVxuICB0b3RhbEJyZWFrIGF0dGFja0FuZ2xlIGNsdWJQYXRoIGNsdWJTcGVlZCBkeW5hbWljTG9mdCBmYWNlQW5nbGUgZmFjZVRvUGF0aFxuICBzbWFzaEZhY3RvciBneXJvU3BpbkFuZ2xlIHNwaW5Mb2Z0IHN3aW5nRGlyZWN0aW9uIHN3aW5nUGxhbmUgc3dpbmdSYWRpdXNcbmA7XG5cbmNvbnN0IFNUUk9LRV9GSUVMRFMgPSBgXG4gIGNsdWJcbiAgdGltZVxuICB0YXJnZXREaXN0YW5jZVxuICBtZWFzdXJlbWVudCB7XG4gICAgJHtTVFJPS0VfTUVBU1VSRU1FTlRfRklFTERTfVxuICB9XG5gO1xuXG5leHBvcnQgY29uc3QgSU1QT1JUX1NFU1NJT05fUVVFUlkgPSBgXG4gIHF1ZXJ5IEZldGNoQWN0aXZpdHlCeUlkKCRpZDogSUQhKSB7XG4gICAgbm9kZShpZDogJGlkKSB7XG4gICAgICAuLi4gb24gU2Vzc2lvbkFjdGl2aXR5IHtcbiAgICAgICAgaWQgdGltZSBzdHJva2VDb3VudCBzdHJva2VzIHsgJHtTVFJPS0VfRklFTERTfSB9XG4gICAgICB9XG4gICAgICAuLi4gb24gVmlydHVhbFJhbmdlU2Vzc2lvbkFjdGl2aXR5IHtcbiAgICAgICAgaWQgdGltZSBzdHJva2VDb3VudCBzdHJva2VzIHsgJHtTVFJPS0VfRklFTERTfSB9XG4gICAgICB9XG4gICAgICAuLi4gb24gU2hvdEFuYWx5c2lzU2Vzc2lvbkFjdGl2aXR5IHtcbiAgICAgICAgaWQgdGltZSBzdHJva2VDb3VudCBzdHJva2VzIHsgJHtTVFJPS0VfRklFTERTfSB9XG4gICAgICB9XG4gICAgICAuLi4gb24gQ29tYmluZVRlc3RBY3Rpdml0eSB7XG4gICAgICAgIGlkIHRpbWUgc3Ryb2tlcyB7ICR7U1RST0tFX0ZJRUxEU30gfVxuICAgICAgfVxuICAgICAgLi4uIG9uIFJhbmdlRmluZE15RGlzdGFuY2VBY3Rpdml0eSB7XG4gICAgICAgIGlkIHRpbWUgc3Ryb2tlcyB7XG4gICAgICAgICAgY2x1YlxuICAgICAgICAgIGlzRGVsZXRlZFxuICAgICAgICAgIGlzU2ltdWxhdGVkXG4gICAgICAgICAgbWVhc3VyZW1lbnQobWVhc3VyZW1lbnRUeXBlOiBQUk9fQkFMTF9NRUFTVVJFTUVOVCkge1xuICAgICAgICAgICAgYmFsbFNwZWVkIGJhbGxTcGluIHNwaW5BeGlzXG4gICAgICAgICAgICBjYXJyeSBjYXJyeVNpZGUgdG90YWwgdG90YWxTaWRlXG4gICAgICAgICAgICBsYW5kaW5nQW5nbGUgbGF1bmNoQW5nbGUgbGF1bmNoRGlyZWN0aW9uIG1heEhlaWdodFxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuYDtcblxuZnVuY3Rpb24gZmxhdFN0cm9rZUFjdGl2aXR5UXVlcnkodHlwZU5hbWU6IHN0cmluZyk6IEltcG9ydFNlc3Npb25RdWVyeUNhbmRpZGF0ZSB7XG4gIHJldHVybiB7XG4gICAgbGFiZWw6IGAke3R5cGVOYW1lfTpzdHJva2VzYCxcbiAgICBxdWVyeTogYFxuICAgICAgcXVlcnkgRmV0Y2hBY3Rpdml0eUJ5SWQoJGlkOiBJRCEpIHtcbiAgICAgICAgbm9kZShpZDogJGlkKSB7XG4gICAgICAgICAgX190eXBlbmFtZVxuICAgICAgICAgIC4uLiBvbiAke3R5cGVOYW1lfSB7XG4gICAgICAgICAgICBpZCB0aW1lXG4gICAgICAgICAgICBzdHJva2VzIHsgJHtTVFJPS0VfRklFTERTfSB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgYCxcbiAgfTtcbn1cblxuZnVuY3Rpb24gZ3JvdXBlZFN0cm9rZUFjdGl2aXR5UXVlcnkodHlwZU5hbWU6IHN0cmluZyk6IEltcG9ydFNlc3Npb25RdWVyeUNhbmRpZGF0ZSB7XG4gIHJldHVybiB7XG4gICAgbGFiZWw6IGAke3R5cGVOYW1lfTpzdHJva2VHcm91cHNgLFxuICAgIHF1ZXJ5OiBgXG4gICAgICBxdWVyeSBGZXRjaEFjdGl2aXR5QnlJZCgkaWQ6IElEISkge1xuICAgICAgICBub2RlKGlkOiAkaWQpIHtcbiAgICAgICAgICBfX3R5cGVuYW1lXG4gICAgICAgICAgLi4uIG9uICR7dHlwZU5hbWV9IHtcbiAgICAgICAgICAgIGlkIHRpbWVcbiAgICAgICAgICAgIHN0cm9rZUdyb3VwcyB7XG4gICAgICAgICAgICAgIGNsdWJcbiAgICAgICAgICAgICAgbmFtZVxuICAgICAgICAgICAgICBzdHJva2VzIHsgJHtTVFJPS0VfRklFTERTfSB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgYCxcbiAgfTtcbn1cblxuZnVuY3Rpb24gcHJvQmFsbEFjdGl2aXR5UXVlcnkodHlwZU5hbWU6IHN0cmluZyk6IEltcG9ydFNlc3Npb25RdWVyeUNhbmRpZGF0ZSB7XG4gIHJldHVybiB7XG4gICAgbGFiZWw6IGAke3R5cGVOYW1lfTpQUk9fQkFMTF9NRUFTVVJFTUVOVGAsXG4gICAgcXVlcnk6IGBcbiAgICAgIHF1ZXJ5IEZldGNoQWN0aXZpdHlCeUlkKCRpZDogSUQhKSB7XG4gICAgICAgIG5vZGUoaWQ6ICRpZCkge1xuICAgICAgICAgIF9fdHlwZW5hbWVcbiAgICAgICAgICAuLi4gb24gJHt0eXBlTmFtZX0ge1xuICAgICAgICAgICAgaWQgdGltZVxuICAgICAgICAgICAgc3Ryb2tlcyB7XG4gICAgICAgICAgICAgIGNsdWJcbiAgICAgICAgICAgICAgdGltZVxuICAgICAgICAgICAgICB0YXJnZXREaXN0YW5jZVxuICAgICAgICAgICAgICBtZWFzdXJlbWVudChtZWFzdXJlbWVudFR5cGU6IFBST19CQUxMX01FQVNVUkVNRU5UKSB7XG4gICAgICAgICAgICAgICAgYmFsbFNwZWVkIGJhbGxTcGluIHNwaW5BeGlzXG4gICAgICAgICAgICAgICAgY2FycnkgY2FycnlTaWRlIHRvdGFsIHRvdGFsU2lkZVxuICAgICAgICAgICAgICAgIGxhbmRpbmdBbmdsZSBsYXVuY2hBbmdsZSBsYXVuY2hEaXJlY3Rpb24gbWF4SGVpZ2h0XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICBgLFxuICB9O1xufVxuXG5mdW5jdGlvbiBncm91cGVkUHJvQmFsbEFjdGl2aXR5UXVlcnkodHlwZU5hbWU6IHN0cmluZyk6IEltcG9ydFNlc3Npb25RdWVyeUNhbmRpZGF0ZSB7XG4gIHJldHVybiB7XG4gICAgbGFiZWw6IGAke3R5cGVOYW1lfTpzdHJva2VHcm91cHM6UFJPX0JBTExfTUVBU1VSRU1FTlRgLFxuICAgIHF1ZXJ5OiBgXG4gICAgICBxdWVyeSBGZXRjaEFjdGl2aXR5QnlJZCgkaWQ6IElEISkge1xuICAgICAgICBub2RlKGlkOiAkaWQpIHtcbiAgICAgICAgICBfX3R5cGVuYW1lXG4gICAgICAgICAgLi4uIG9uICR7dHlwZU5hbWV9IHtcbiAgICAgICAgICAgIGlkIHRpbWVcbiAgICAgICAgICAgIHN0cm9rZUdyb3VwcyB7XG4gICAgICAgICAgICAgIGNsdWJcbiAgICAgICAgICAgICAgbmFtZVxuICAgICAgICAgICAgICBzdHJva2VzIHtcbiAgICAgICAgICAgICAgICBjbHViXG4gICAgICAgICAgICAgICAgdGltZVxuICAgICAgICAgICAgICAgIHRhcmdldERpc3RhbmNlXG4gICAgICAgICAgICAgICAgbWVhc3VyZW1lbnQobWVhc3VyZW1lbnRUeXBlOiBQUk9fQkFMTF9NRUFTVVJFTUVOVCkge1xuICAgICAgICAgICAgICAgICAgYmFsbFNwZWVkIGJhbGxTcGluIHNwaW5BeGlzXG4gICAgICAgICAgICAgICAgICBjYXJyeSBjYXJyeVNpZGUgdG90YWwgdG90YWxTaWRlXG4gICAgICAgICAgICAgICAgICBsYW5kaW5nQW5nbGUgbGF1bmNoQW5nbGUgbGF1bmNoRGlyZWN0aW9uIG1heEhlaWdodFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIGAsXG4gIH07XG59XG5cbmZ1bmN0aW9uIHNjb3JlY2FyZFNob3RBY3Rpdml0eVF1ZXJ5KFxuICB0eXBlTmFtZTogc3RyaW5nLFxuICBtZWFzdXJlbWVudEtpbmQ6IFwiTk9STUFMSVpFRF9NRUFTVVJFTUVOVFwiIHwgXCJNRUFTVVJFTUVOVFwiIHwgXCJQUk9fQkFMTF9NRUFTVVJFTUVOVFwiXG4pOiBJbXBvcnRTZXNzaW9uUXVlcnlDYW5kaWRhdGUge1xuICByZXR1cm4ge1xuICAgIGxhYmVsOiBgJHt0eXBlTmFtZX06c2NvcmVjYXJkLnNob3RzOiR7bWVhc3VyZW1lbnRLaW5kfWAsXG4gICAgcXVlcnk6IGBcbiAgICAgIHF1ZXJ5IEZldGNoQWN0aXZpdHlCeUlkKCRpZDogSUQhKSB7XG4gICAgICAgIG5vZGUoaWQ6ICRpZCkge1xuICAgICAgICAgIF9fdHlwZW5hbWVcbiAgICAgICAgICAuLi4gb24gJHt0eXBlTmFtZX0ge1xuICAgICAgICAgICAgaWQgdGltZSBraW5kXG4gICAgICAgICAgICBzY29yZWNhcmQge1xuICAgICAgICAgICAgICBob2xlcyB7XG4gICAgICAgICAgICAgICAgaG9sZU51bWJlclxuICAgICAgICAgICAgICAgIHNob3RzIHtcbiAgICAgICAgICAgICAgICAgIGlkXG4gICAgICAgICAgICAgICAgICBzaG90TnVtYmVyXG4gICAgICAgICAgICAgICAgICBjbHViXG4gICAgICAgICAgICAgICAgICBsYXVuY2hUaW1lXG4gICAgICAgICAgICAgICAgICB0b3RhbFxuICAgICAgICAgICAgICAgICAgbWVhc3VyZW1lbnQoc2hvdE1lYXN1cmVtZW50S2luZDogJHttZWFzdXJlbWVudEtpbmR9KSB7XG4gICAgICAgICAgICAgICAgICAgICR7U0NPUkVDQVJEX1NIT1RfTUVBU1VSRU1FTlRfRklFTERTfVxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIGAsXG4gIH07XG59XG5cbi8qKlxuICogQWRkaXRpb25hbCBhY3Rpdml0eS1zcGVjaWZpYyBxdWVyaWVzIHRyaWVkIG9ubHkgYWZ0ZXIgdGhlIHN0YWJsZSBiYXNlIHF1ZXJ5XG4gKiBkb2VzIG5vdCBwcm9kdWNlIHBhcnNhYmxlIHNob3RzLiBFYWNoIGNhbmRpZGF0ZSBjb250YWlucyBvbmUgaW5saW5lIGZyYWdtZW50XG4gKiBzbyBhbiB1bmtub3duIFRyYWNrbWFuIHR5cGUgb25seSBpbnZhbGlkYXRlcyB0aGF0IGNhbmRpZGF0ZSwgbm90IHRoZSB3aG9sZVxuICogaW1wb3J0IGZsb3cuXG4gKi9cbmV4cG9ydCBjb25zdCBJTVBPUlRfU0VTU0lPTl9GQUxMQkFDS19RVUVSSUVTOiBJbXBvcnRTZXNzaW9uUXVlcnlDYW5kaWRhdGVbXSA9IFtcbiAgc2NvcmVjYXJkU2hvdEFjdGl2aXR5UXVlcnkoXCJDb3Vyc2VQbGF5QWN0aXZpdHlcIiwgXCJOT1JNQUxJWkVEX01FQVNVUkVNRU5UXCIpLFxuICBzY29yZWNhcmRTaG90QWN0aXZpdHlRdWVyeShcIkNvdXJzZVBsYXlBY3Rpdml0eVwiLCBcIk1FQVNVUkVNRU5UXCIpLFxuICBzY29yZWNhcmRTaG90QWN0aXZpdHlRdWVyeShcIkNvdXJzZVBsYXlBY3Rpdml0eVwiLCBcIlBST19CQUxMX01FQVNVUkVNRU5UXCIpLFxuICBmbGF0U3Ryb2tlQWN0aXZpdHlRdWVyeShcIkNvdXJzZVBsYXlBY3Rpdml0eVwiKSxcbiAgZ3JvdXBlZFN0cm9rZUFjdGl2aXR5UXVlcnkoXCJDb3Vyc2VQbGF5QWN0aXZpdHlcIiksXG4gIHNjb3JlY2FyZFNob3RBY3Rpdml0eVF1ZXJ5KFwiQ291cnNlU2Vzc2lvbkFjdGl2aXR5XCIsIFwiTk9STUFMSVpFRF9NRUFTVVJFTUVOVFwiKSxcbiAgc2NvcmVjYXJkU2hvdEFjdGl2aXR5UXVlcnkoXCJDb3Vyc2VTZXNzaW9uQWN0aXZpdHlcIiwgXCJNRUFTVVJFTUVOVFwiKSxcbiAgc2NvcmVjYXJkU2hvdEFjdGl2aXR5UXVlcnkoXCJDb3Vyc2VTZXNzaW9uQWN0aXZpdHlcIiwgXCJQUk9fQkFMTF9NRUFTVVJFTUVOVFwiKSxcbiAgZmxhdFN0cm9rZUFjdGl2aXR5UXVlcnkoXCJDb3Vyc2VTZXNzaW9uQWN0aXZpdHlcIiksXG4gIGdyb3VwZWRTdHJva2VBY3Rpdml0eVF1ZXJ5KFwiQ291cnNlU2Vzc2lvbkFjdGl2aXR5XCIpLFxuICBmbGF0U3Ryb2tlQWN0aXZpdHlRdWVyeShcIlZpcnR1YWxHb2xmQWN0aXZpdHlcIiksXG4gIGdyb3VwZWRTdHJva2VBY3Rpdml0eVF1ZXJ5KFwiVmlydHVhbEdvbGZBY3Rpdml0eVwiKSxcbiAgZmxhdFN0cm9rZUFjdGl2aXR5UXVlcnkoXCJWaXJ0dWFsR29sZlNlc3Npb25BY3Rpdml0eVwiKSxcbiAgZ3JvdXBlZFN0cm9rZUFjdGl2aXR5UXVlcnkoXCJWaXJ0dWFsR29sZlNlc3Npb25BY3Rpdml0eVwiKSxcbiAgZmxhdFN0cm9rZUFjdGl2aXR5UXVlcnkoXCJNYXBNeUJhZ0FjdGl2aXR5XCIpLFxuICBncm91cGVkU3Ryb2tlQWN0aXZpdHlRdWVyeShcIk1hcE15QmFnQWN0aXZpdHlcIiksXG4gIGZsYXRTdHJva2VBY3Rpdml0eVF1ZXJ5KFwiTWFwTXlCYWdTZXNzaW9uQWN0aXZpdHlcIiksXG4gIGdyb3VwZWRTdHJva2VBY3Rpdml0eVF1ZXJ5KFwiTWFwTXlCYWdTZXNzaW9uQWN0aXZpdHlcIiksXG4gIGZsYXRTdHJva2VBY3Rpdml0eVF1ZXJ5KFwiQmFnTWFwcGluZ0FjdGl2aXR5XCIpLFxuICBncm91cGVkU3Ryb2tlQWN0aXZpdHlRdWVyeShcIkJhZ01hcHBpbmdBY3Rpdml0eVwiKSxcbiAgcHJvQmFsbEFjdGl2aXR5UXVlcnkoXCJNYXBNeUJhZ0FjdGl2aXR5XCIpLFxuICBncm91cGVkUHJvQmFsbEFjdGl2aXR5UXVlcnkoXCJNYXBNeUJhZ0FjdGl2aXR5XCIpLFxuICBwcm9CYWxsQWN0aXZpdHlRdWVyeShcIk1hcE15QmFnU2Vzc2lvbkFjdGl2aXR5XCIpLFxuICBncm91cGVkUHJvQmFsbEFjdGl2aXR5UXVlcnkoXCJNYXBNeUJhZ1Nlc3Npb25BY3Rpdml0eVwiKSxcbl07XG5cbmV4cG9ydCBjb25zdCBJTVBPUlRfU0VTU0lPTl9RVUVSWV9DQU5ESURBVEVTOiBJbXBvcnRTZXNzaW9uUXVlcnlDYW5kaWRhdGVbXSA9IFtcbiAgeyBsYWJlbDogXCJkZWZhdWx0XCIsIHF1ZXJ5OiBJTVBPUlRfU0VTU0lPTl9RVUVSWSB9LFxuICAuLi5JTVBPUlRfU0VTU0lPTl9GQUxMQkFDS19RVUVSSUVTLFxuXTtcbiIsICIvKipcbiAqIFNlcnZpY2UgV29ya2VyIGZvciBUcmFja1B1bGwgQ2hyb21lIEV4dGVuc2lvblxuICovXG5cbmltcG9ydCB7IFNUT1JBR0VfS0VZUyB9IGZyb20gXCIuLi9zaGFyZWQvY29uc3RhbnRzXCI7XG5pbXBvcnQgeyB3cml0ZUNzdiB9IGZyb20gXCIuLi9zaGFyZWQvY3N2X3dyaXRlclwiO1xuaW1wb3J0IHR5cGUgeyBTZXNzaW9uRGF0YSB9IGZyb20gXCIuLi9tb2RlbHMvdHlwZXNcIjtcbmltcG9ydCB7IG1pZ3JhdGVMZWdhY3lQcmVmLCBERUZBVUxUX1VOSVRfQ0hPSUNFLCB0eXBlIFVuaXRDaG9pY2UsIHR5cGUgU3BlZWRVbml0LCB0eXBlIERpc3RhbmNlVW5pdCB9IGZyb20gXCIuLi9zaGFyZWQvdW5pdF9ub3JtYWxpemF0aW9uXCI7XG5pbXBvcnQgeyBzYXZlU2Vzc2lvblRvSGlzdG9yeSwgZ2V0SGlzdG9yeUVycm9yTWVzc2FnZSB9IGZyb20gXCIuLi9zaGFyZWQvaGlzdG9yeVwiO1xuaW1wb3J0IHsgaGFzUG9ydGFsUGVybWlzc2lvbiB9IGZyb20gXCIuLi9zaGFyZWQvcG9ydGFsUGVybWlzc2lvbnNcIjtcbmltcG9ydCB7IGV4ZWN1dGVRdWVyeSwgY2xhc3NpZnlBdXRoUmVzdWx0LCBIRUFMVEhfQ0hFQ0tfUVVFUlkgfSBmcm9tIFwiLi4vc2hhcmVkL2dyYXBocWxfY2xpZW50XCI7XG5pbXBvcnQgeyBwYXJzZVBvcnRhbEFjdGl2aXR5IH0gZnJvbSBcIi4uL3NoYXJlZC9wb3J0YWxfcGFyc2VyXCI7XG5pbXBvcnQgdHlwZSB7IEdyYXBoUUxBY3Rpdml0eSB9IGZyb20gXCIuLi9zaGFyZWQvcG9ydGFsX3BhcnNlclwiO1xuaW1wb3J0IHR5cGUgeyBGZXRjaEFjdGl2aXRpZXNRdWVyeUNhbmRpZGF0ZSwgSW1wb3J0U3RhdHVzLCBBY3Rpdml0eVN1bW1hcnkgfSBmcm9tIFwiLi4vc2hhcmVkL2ltcG9ydF90eXBlc1wiO1xuaW1wb3J0IHtcbiAgRkVUQ0hfQUNUSVZJVElFU19NQVhfUEFHRVMsXG4gIEZFVENIX0FDVElWSVRJRVNfUEFHRV9TSVpFLFxuICBGRVRDSF9BQ1RJVklUSUVTX1FVRVJZX0NBTkRJREFURVMsXG4gIElNUE9SVF9TRVNTSU9OX1FVRVJZX0NBTkRJREFURVMsXG4gIG5vcm1hbGl6ZUFjdGl2aXR5U3VtbWFyaWVzLFxuICBub3JtYWxpemVBY3Rpdml0eVN1bW1hcnlQYWdlLFxufSBmcm9tIFwiLi4vc2hhcmVkL2ltcG9ydF90eXBlc1wiO1xuXG5pbnRlcmZhY2UgSW1wb3J0ZWRTZXNzaW9uR3JhcGhRTERhdGEge1xuICBkYXRhPzogeyBub2RlPzogR3JhcGhRTEFjdGl2aXR5IH07XG4gIGVycm9ycz86IEFycmF5PHsgbWVzc2FnZTogc3RyaW5nOyBleHRlbnNpb25zPzogeyBjb2RlPzogc3RyaW5nIH0gfT47XG59XG5cbmNocm9tZS5ydW50aW1lLm9uSW5zdGFsbGVkLmFkZExpc3RlbmVyKCgpID0+IHtcbiAgY29uc29sZS5sb2coXCJUcmFja1B1bGwgZXh0ZW5zaW9uIGluc3RhbGxlZFwiKTtcbn0pO1xuXG5pbnRlcmZhY2UgU2F2ZURhdGFSZXF1ZXN0IHtcbiAgdHlwZTogXCJTQVZFX0RBVEFcIjtcbiAgZGF0YTogU2Vzc2lvbkRhdGE7XG59XG5cbmludGVyZmFjZSBFeHBvcnRDc3ZSZXF1ZXN0IHtcbiAgdHlwZTogXCJFWFBPUlRfQ1NWX1JFUVVFU1RcIjtcbn1cblxuaW50ZXJmYWNlIEdldERhdGFSZXF1ZXN0IHtcbiAgdHlwZTogXCJHRVRfREFUQVwiO1xufVxuXG5pbnRlcmZhY2UgRmV0Y2hBY3Rpdml0aWVzUmVxdWVzdCB7XG4gIHR5cGU6IFwiRkVUQ0hfQUNUSVZJVElFU1wiO1xufVxuXG5pbnRlcmZhY2UgSW1wb3J0U2Vzc2lvblJlcXVlc3Qge1xuICB0eXBlOiBcIklNUE9SVF9TRVNTSU9OXCI7XG4gIGFjdGl2aXR5SWQ6IHN0cmluZztcbn1cblxuaW50ZXJmYWNlIFBvcnRhbEF1dGhDaGVja1JlcXVlc3Qge1xuICB0eXBlOiBcIlBPUlRBTF9BVVRIX0NIRUNLXCI7XG59XG5cbmludGVyZmFjZSBTYXZlSW1wb3J0ZWRTZXNzaW9uUmVxdWVzdCB7XG4gIHR5cGU6IFwiU0FWRV9JTVBPUlRFRF9TRVNTSU9OXCI7XG4gIGdyYXBocWxEYXRhPzogSW1wb3J0ZWRTZXNzaW9uR3JhcGhRTERhdGE7XG4gIGdyYXBocWxQYXlsb2Fkcz86IEltcG9ydGVkU2Vzc2lvbkdyYXBoUUxEYXRhW107XG4gIGFjdGl2aXR5SWQ6IHN0cmluZztcbn1cblxuZnVuY3Rpb24gaXNBdXRoRXJyb3IoZXJyb3JzOiBBcnJheTx7IG1lc3NhZ2U6IHN0cmluZzsgZXh0ZW5zaW9ucz86IHsgY29kZT86IHN0cmluZyB9IH0+KTogYm9vbGVhbiB7XG4gIGlmIChlcnJvcnMubGVuZ3RoID09PSAwKSByZXR1cm4gZmFsc2U7XG4gIGNvbnN0IGNvZGUgPSBlcnJvcnNbMF0uZXh0ZW5zaW9ucz8uY29kZSA/PyBcIlwiO1xuICBjb25zdCBtc2cgPSBlcnJvcnNbMF0ubWVzc2FnZT8udG9Mb3dlckNhc2UoKSA/PyBcIlwiO1xuICByZXR1cm4gY29kZSA9PT0gXCJVTkFVVEhFTlRJQ0FURURcIiB8fCBtc2cuaW5jbHVkZXMoXCJ1bmF1dGhvcml6ZWRcIikgfHwgbXNnLmluY2x1ZGVzKFwibm90IGF1dGhvcml6ZWRcIikgfHwgbXNnLmluY2x1ZGVzKFwidW5hdXRoZW50aWNhdGVkXCIpIHx8IG1zZy5pbmNsdWRlcyhcIm5vdCBsb2dnZWQgaW5cIik7XG59XG5cbmZ1bmN0aW9uIGdldERvd25sb2FkRXJyb3JNZXNzYWdlKG9yaWdpbmFsRXJyb3I6IHN0cmluZyk6IHN0cmluZyB7XG4gIGlmIChvcmlnaW5hbEVycm9yLmluY2x1ZGVzKFwiaW52YWxpZFwiKSkge1xuICAgIHJldHVybiBcIkludmFsaWQgZG93bmxvYWQgZm9ybWF0XCI7XG4gIH1cbiAgaWYgKG9yaWdpbmFsRXJyb3IuaW5jbHVkZXMoXCJxdW90YVwiKSB8fCBvcmlnaW5hbEVycm9yLmluY2x1ZGVzKFwic3BhY2VcIikpIHtcbiAgICByZXR1cm4gXCJJbnN1ZmZpY2llbnQgc3RvcmFnZSBzcGFjZVwiO1xuICB9XG4gIGlmIChvcmlnaW5hbEVycm9yLmluY2x1ZGVzKFwiYmxvY2tlZFwiKSB8fCBvcmlnaW5hbEVycm9yLmluY2x1ZGVzKFwicG9saWN5XCIpKSB7XG4gICAgcmV0dXJuIFwiRG93bmxvYWQgYmxvY2tlZCBieSBicm93c2VyIHNldHRpbmdzXCI7XG4gIH1cbiAgcmV0dXJuIG9yaWdpbmFsRXJyb3I7XG59XG5cbnR5cGUgUmVxdWVzdE1lc3NhZ2UgPVxuICB8IFNhdmVEYXRhUmVxdWVzdFxuICB8IEV4cG9ydENzdlJlcXVlc3RcbiAgfCBHZXREYXRhUmVxdWVzdFxuICB8IEZldGNoQWN0aXZpdGllc1JlcXVlc3RcbiAgfCBJbXBvcnRTZXNzaW9uUmVxdWVzdFxuICB8IFBvcnRhbEF1dGhDaGVja1JlcXVlc3RcbiAgfCBTYXZlSW1wb3J0ZWRTZXNzaW9uUmVxdWVzdDtcblxuZnVuY3Rpb24gcGFyc2VJbXBvcnRlZFNlc3Npb24oXG4gIHBheWxvYWRzOiBJbXBvcnRlZFNlc3Npb25HcmFwaFFMRGF0YVtdXG4pOiBTZXNzaW9uRGF0YSB8IG51bGwge1xuICBmb3IgKGNvbnN0IHBheWxvYWQgb2YgcGF5bG9hZHMpIHtcbiAgICBpZiAocGF5bG9hZC5lcnJvcnMgJiYgcGF5bG9hZC5lcnJvcnMubGVuZ3RoID4gMCkgY29udGludWU7XG4gICAgY29uc3QgYWN0aXZpdHkgPSBwYXlsb2FkLmRhdGE/Lm5vZGU7XG4gICAgY29uc3Qgc2Vzc2lvbiA9IGFjdGl2aXR5ID8gcGFyc2VQb3J0YWxBY3Rpdml0eShhY3Rpdml0eSkgOiBudWxsO1xuICAgIGlmIChzZXNzaW9uKSByZXR1cm4gc2Vzc2lvbjtcbiAgfVxuICByZXR1cm4gbnVsbDtcbn1cblxuZnVuY3Rpb24gYXBwZW5kVW5pcXVlQWN0aXZpdGllcyhcbiAgdGFyZ2V0OiBBY3Rpdml0eVN1bW1hcnlbXSxcbiAgc2VlbklkczogU2V0PHN0cmluZz4sXG4gIGFjdGl2aXRpZXM6IEFjdGl2aXR5U3VtbWFyeVtdXG4pOiB2b2lkIHtcbiAgZm9yIChjb25zdCBhY3Rpdml0eSBvZiBhY3Rpdml0aWVzKSB7XG4gICAgaWYgKHNlZW5JZHMuaGFzKGFjdGl2aXR5LmlkKSkgY29udGludWU7XG4gICAgc2Vlbklkcy5hZGQoYWN0aXZpdHkuaWQpO1xuICAgIHRhcmdldC5wdXNoKGFjdGl2aXR5KTtcbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBmZXRjaEFjdGl2aXRpZXNGb3JDYW5kaWRhdGUoXG4gIGNhbmRpZGF0ZTogRmV0Y2hBY3Rpdml0aWVzUXVlcnlDYW5kaWRhdGVcbik6IFByb21pc2U8e1xuICBhY3Rpdml0aWVzPzogQWN0aXZpdHlTdW1tYXJ5W107XG4gIGVycm9ycz86IEFycmF5PHsgbWVzc2FnZTogc3RyaW5nOyBleHRlbnNpb25zPzogeyBjb2RlPzogc3RyaW5nIH0gfT47XG59PiB7XG4gIGlmICghY2FuZGlkYXRlLnBhZ2luYXRlZCkge1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGV4ZWN1dGVRdWVyeTxSZWNvcmQ8c3RyaW5nLCB1bmtub3duPj4oY2FuZGlkYXRlLnF1ZXJ5KTtcbiAgICBpZiAocmVzdWx0LmVycm9ycyAmJiByZXN1bHQuZXJyb3JzLmxlbmd0aCA+IDApIHtcbiAgICAgIHJldHVybiB7IGVycm9yczogcmVzdWx0LmVycm9ycyB9O1xuICAgIH1cbiAgICByZXR1cm4geyBhY3Rpdml0aWVzOiBub3JtYWxpemVBY3Rpdml0eVN1bW1hcmllcyhyZXN1bHQuZGF0YSkgfTtcbiAgfVxuXG4gIGNvbnN0IGFjdGl2aXRpZXM6IEFjdGl2aXR5U3VtbWFyeVtdID0gW107XG4gIGNvbnN0IHNlZW5JZHMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgbGV0IHNraXAgPSAwO1xuXG4gIGZvciAobGV0IHBhZ2UgPSAwOyBwYWdlIDwgRkVUQ0hfQUNUSVZJVElFU19NQVhfUEFHRVM7IHBhZ2UgKz0gMSkge1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGV4ZWN1dGVRdWVyeTxSZWNvcmQ8c3RyaW5nLCB1bmtub3duPj4oXG4gICAgICBjYW5kaWRhdGUucXVlcnksXG4gICAgICB7IHNraXAsIHRha2U6IEZFVENIX0FDVElWSVRJRVNfUEFHRV9TSVpFIH1cbiAgICApO1xuICAgIGlmIChyZXN1bHQuZXJyb3JzICYmIHJlc3VsdC5lcnJvcnMubGVuZ3RoID4gMCkge1xuICAgICAgcmV0dXJuIHsgZXJyb3JzOiByZXN1bHQuZXJyb3JzIH07XG4gICAgfVxuXG4gICAgY29uc3Qgc3VtbWFyeVBhZ2UgPSBub3JtYWxpemVBY3Rpdml0eVN1bW1hcnlQYWdlKHJlc3VsdC5kYXRhKTtcbiAgICBhcHBlbmRVbmlxdWVBY3Rpdml0aWVzKGFjdGl2aXRpZXMsIHNlZW5JZHMsIHN1bW1hcnlQYWdlLmFjdGl2aXRpZXMpO1xuXG4gICAgY29uc3QgY29uc3VtZWRDb3VudCA9IHNraXAgKyBzdW1tYXJ5UGFnZS5pdGVtQ291bnQ7XG4gICAgaWYgKFxuICAgICAgc3VtbWFyeVBhZ2UuaGFzTmV4dFBhZ2UgPT09IGZhbHNlIHx8XG4gICAgICBzdW1tYXJ5UGFnZS5pdGVtQ291bnQgPT09IDAgfHxcbiAgICAgIChzdW1tYXJ5UGFnZS5oYXNOZXh0UGFnZSA9PT0gbnVsbCAmJiBzdW1tYXJ5UGFnZS5pdGVtQ291bnQgPCBGRVRDSF9BQ1RJVklUSUVTX1BBR0VfU0laRSkgfHxcbiAgICAgIChzdW1tYXJ5UGFnZS50b3RhbENvdW50ICE9PSBudWxsICYmIGNvbnN1bWVkQ291bnQgPj0gc3VtbWFyeVBhZ2UudG90YWxDb3VudClcbiAgICApIHtcbiAgICAgIHJldHVybiB7IGFjdGl2aXRpZXMgfTtcbiAgICB9XG4gICAgc2tpcCA9IGNvbnN1bWVkQ291bnQ7XG4gIH1cblxuICByZXR1cm4geyBhY3Rpdml0aWVzIH07XG59XG5cbmNocm9tZS5ydW50aW1lLm9uTWVzc2FnZS5hZGRMaXN0ZW5lcigobWVzc2FnZTogUmVxdWVzdE1lc3NhZ2UsIHNlbmRlciwgc2VuZFJlc3BvbnNlKSA9PiB7XG4gIGlmIChtZXNzYWdlLnR5cGUgPT09IFwiR0VUX0RBVEFcIikge1xuICAgIGNocm9tZS5zdG9yYWdlLmxvY2FsLmdldChbU1RPUkFHRV9LRVlTLlRSQUNLTUFOX0RBVEFdLCAocmVzdWx0KSA9PiB7XG4gICAgICBzZW5kUmVzcG9uc2UocmVzdWx0W1NUT1JBR0VfS0VZUy5UUkFDS01BTl9EQVRBXSB8fCBudWxsKTtcbiAgICB9KTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGlmIChtZXNzYWdlLnR5cGUgPT09IFwiU0FWRV9EQVRBXCIpIHtcbiAgICBjb25zdCBzZXNzaW9uRGF0YSA9IChtZXNzYWdlIGFzIFNhdmVEYXRhUmVxdWVzdCkuZGF0YTtcbiAgICBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoeyBbU1RPUkFHRV9LRVlTLlRSQUNLTUFOX0RBVEFdOiBzZXNzaW9uRGF0YSB9LCAoKSA9PiB7XG4gICAgICBpZiAoY2hyb21lLnJ1bnRpbWUubGFzdEVycm9yKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXCJUcmFja1B1bGw6IEZhaWxlZCB0byBzYXZlIGRhdGE6XCIsIGNocm9tZS5ydW50aW1lLmxhc3RFcnJvcik7XG4gICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogY2hyb21lLnJ1bnRpbWUubGFzdEVycm9yLm1lc3NhZ2UgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLmxvZyhcIlRyYWNrUHVsbDogU2Vzc2lvbiBkYXRhIHNhdmVkIHRvIHN0b3JhZ2VcIik7XG4gICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IHRydWUgfSk7XG5cbiAgICAgICAgLy8gSGlzdG9yeSBzYXZlIC0tIGZpcmUgYW5kIGZvcmdldCwgbmV2ZXIgYmxvY2tzIHByaW1hcnkgZmxvd1xuICAgICAgICBzYXZlU2Vzc2lvblRvSGlzdG9yeShzZXNzaW9uRGF0YSkuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJUcmFja1B1bGw6IEhpc3Rvcnkgc2F2ZSBmYWlsZWQ6XCIsIGVycik7XG4gICAgICAgICAgY29uc3QgbXNnID0gZ2V0SGlzdG9yeUVycm9yTWVzc2FnZShlcnIubWVzc2FnZSk7XG4gICAgICAgICAgY2hyb21lLnJ1bnRpbWUuc2VuZE1lc3NhZ2UoeyB0eXBlOiBcIkhJU1RPUllfRVJST1JcIiwgZXJyb3I6IG1zZyB9KS5jYXRjaCgoKSA9PiB7XG4gICAgICAgICAgICAvLyBQb3B1cCBub3Qgb3BlbiAtLSBhbHJlYWR5IGxvZ2dlZCB0byBjb25zb2xlXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgaWYgKG1lc3NhZ2UudHlwZSA9PT0gXCJFWFBPUlRfQ1NWX1JFUVVFU1RcIikge1xuICAgIGNocm9tZS5zdG9yYWdlLmxvY2FsLmdldChbU1RPUkFHRV9LRVlTLlRSQUNLTUFOX0RBVEEsIFNUT1JBR0VfS0VZUy5TUEVFRF9VTklULCBTVE9SQUdFX0tFWVMuRElTVEFOQ0VfVU5JVCwgU1RPUkFHRV9LRVlTLkhJVFRJTkdfU1VSRkFDRSwgU1RPUkFHRV9LRVlTLklOQ0xVREVfQVZFUkFHRVMsIFwidW5pdFByZWZlcmVuY2VcIl0sIChyZXN1bHQpID0+IHtcbiAgICAgIGNvbnN0IGRhdGEgPSByZXN1bHRbU1RPUkFHRV9LRVlTLlRSQUNLTUFOX0RBVEFdIGFzIFNlc3Npb25EYXRhIHwgdW5kZWZpbmVkO1xuICAgICAgaWYgKCFkYXRhIHx8ICFkYXRhLmNsdWJfZ3JvdXBzIHx8IGRhdGEuY2x1Yl9ncm91cHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogXCJObyBkYXRhIHRvIGV4cG9ydFwiIH0pO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIGxldCB1bml0Q2hvaWNlOiBVbml0Q2hvaWNlO1xuICAgICAgICBpZiAocmVzdWx0W1NUT1JBR0VfS0VZUy5TUEVFRF9VTklUXSAmJiByZXN1bHRbU1RPUkFHRV9LRVlTLkRJU1RBTkNFX1VOSVRdKSB7XG4gICAgICAgICAgdW5pdENob2ljZSA9IHtcbiAgICAgICAgICAgIHNwZWVkOiByZXN1bHRbU1RPUkFHRV9LRVlTLlNQRUVEX1VOSVRdIGFzIFNwZWVkVW5pdCxcbiAgICAgICAgICAgIGRpc3RhbmNlOiByZXN1bHRbU1RPUkFHRV9LRVlTLkRJU1RBTkNFX1VOSVRdIGFzIERpc3RhbmNlVW5pdCxcbiAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHVuaXRDaG9pY2UgPSBtaWdyYXRlTGVnYWN5UHJlZihyZXN1bHRbXCJ1bml0UHJlZmVyZW5jZVwiXSBhcyBzdHJpbmcgfCB1bmRlZmluZWQpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHN1cmZhY2UgPSAocmVzdWx0W1NUT1JBR0VfS0VZUy5ISVRUSU5HX1NVUkZBQ0VdIGFzIFwiR3Jhc3NcIiB8IFwiTWF0XCIpID8/IFwiTWF0XCI7XG4gICAgICAgIGNvbnN0IGluY2x1ZGVBdmVyYWdlcyA9IHJlc3VsdFtTVE9SQUdFX0tFWVMuSU5DTFVERV9BVkVSQUdFU10gPT09IHVuZGVmaW5lZFxuICAgICAgICAgID8gdHJ1ZVxuICAgICAgICAgIDogQm9vbGVhbihyZXN1bHRbU1RPUkFHRV9LRVlTLklOQ0xVREVfQVZFUkFHRVNdKTtcbiAgICAgICAgY29uc3QgY3N2Q29udGVudCA9IHdyaXRlQ3N2KGRhdGEsIGluY2x1ZGVBdmVyYWdlcywgdW5kZWZpbmVkLCB1bml0Q2hvaWNlLCBzdXJmYWNlKTtcbiAgICAgICAgY29uc3QgcmF3RGF0ZSA9IGRhdGEuZGF0ZSB8fCBcInVua25vd25cIjtcbiAgICAgICAgLy8gU2FuaXRpemUgZGF0ZSBmb3IgZmlsZW5hbWUgXHUyMDE0IHJlbW92ZSBjb2xvbnMgYW5kIGNoYXJhY3RlcnMgaW52YWxpZCBpbiBmaWxlbmFtZXNcbiAgICAgICAgY29uc3Qgc2FmZURhdGUgPSByYXdEYXRlLnJlcGxhY2UoL1s6Ll0vZywgXCItXCIpLnJlcGxhY2UoL1svXFxcXD8lKnxcIjw+XS9nLCBcIlwiKTtcbiAgICAgICAgY29uc3QgZmlsZW5hbWUgPSBgU2hvdERhdGFfJHtzYWZlRGF0ZX0uY3N2YDtcblxuICAgICAgICBjaHJvbWUuZG93bmxvYWRzLmRvd25sb2FkKFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHVybDogYGRhdGE6dGV4dC9jc3Y7Y2hhcnNldD11dGYtOCwke2VuY29kZVVSSUNvbXBvbmVudChjc3ZDb250ZW50KX1gLFxuICAgICAgICAgICAgZmlsZW5hbWU6IGZpbGVuYW1lLFxuICAgICAgICAgICAgc2F2ZUFzOiBmYWxzZSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIChkb3dubG9hZElkKSA9PiB7XG4gICAgICAgICAgICBpZiAoY2hyb21lLnJ1bnRpbWUubGFzdEVycm9yKSB7XG4gICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJUcmFja1B1bGw6IERvd25sb2FkIGZhaWxlZDpcIiwgY2hyb21lLnJ1bnRpbWUubGFzdEVycm9yKTtcbiAgICAgICAgICAgICAgY29uc3QgZXJyb3JNZXNzYWdlID0gZ2V0RG93bmxvYWRFcnJvck1lc3NhZ2UoY2hyb21lLnJ1bnRpbWUubGFzdEVycm9yLm1lc3NhZ2UpO1xuICAgICAgICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yTWVzc2FnZSB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBUcmFja1B1bGw6IENTViBleHBvcnRlZCB3aXRoIGRvd25sb2FkIElEICR7ZG93bmxvYWRJZH1gKTtcbiAgICAgICAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogdHJ1ZSwgZG93bmxvYWRJZCwgZmlsZW5hbWUgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICApO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIlRyYWNrUHVsbDogQ1NWIGdlbmVyYXRpb24gZmFpbGVkOlwiLCBlcnJvcik7XG4gICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpIH0pO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgaWYgKG1lc3NhZ2UudHlwZSA9PT0gXCJQT1JUQUxfQVVUSF9DSEVDS1wiKSB7XG4gICAgKGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGdyYW50ZWQgPSBhd2FpdCBoYXNQb3J0YWxQZXJtaXNzaW9uKCk7XG4gICAgICBpZiAoIWdyYW50ZWQpIHtcbiAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogdHJ1ZSwgc3RhdHVzOiBcImRlbmllZFwiIH0pO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBleGVjdXRlUXVlcnk8eyBtZTogeyBfX3R5cGVuYW1lOiBzdHJpbmcgfSB8IG51bGwgfT4oSEVBTFRIX0NIRUNLX1FVRVJZKTtcbiAgICAgICAgY29uc3QgYXV0aFN0YXR1cyA9IGNsYXNzaWZ5QXV0aFJlc3VsdChyZXN1bHQpO1xuICAgICAgICBpZiAoYXV0aFN0YXR1cy5raW5kID09PSBcImVycm9yXCIpIHtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKFwiVHJhY2tQdWxsOiBHcmFwaFFMIGhlYWx0aCBjaGVjayBlcnJvcjpcIiwgYXV0aFN0YXR1cy5tZXNzYWdlKTtcbiAgICAgICAgfVxuICAgICAgICBzZW5kUmVzcG9uc2Uoe1xuICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgc3RhdHVzOiBhdXRoU3RhdHVzLmtpbmQsXG4gICAgICAgICAgbWVzc2FnZTogYXV0aFN0YXR1cy5raW5kID09PSBcImVycm9yXCIgPyBhdXRoU3RhdHVzLm1lc3NhZ2UgOiB1bmRlZmluZWQsXG4gICAgICAgIH0pO1xuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXCJUcmFja1B1bGw6IEdyYXBoUUwgaGVhbHRoIGNoZWNrIGZhaWxlZDpcIiwgZXJyKTtcbiAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogdHJ1ZSwgc3RhdHVzOiBcImVycm9yXCIsIG1lc3NhZ2U6IFwiVW5hYmxlIHRvIHJlYWNoIFRyYWNrbWFuIFx1MjAxNCB0cnkgYWdhaW4gbGF0ZXJcIiB9KTtcbiAgICAgIH1cbiAgICB9KSgpO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgaWYgKG1lc3NhZ2UudHlwZSA9PT0gXCJGRVRDSF9BQ1RJVklUSUVTXCIpIHtcbiAgICAoYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgZ3JhbnRlZCA9IGF3YWl0IGhhc1BvcnRhbFBlcm1pc3Npb24oKTtcbiAgICAgIGlmICghZ3JhbnRlZCkge1xuICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFwiUG9ydGFsIHBlcm1pc3Npb24gbm90IGdyYW50ZWRcIiB9KTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdHJ5IHtcbiAgICAgICAgbGV0IGZpcnN0RXJyb3I6IEFycmF5PHsgbWVzc2FnZTogc3RyaW5nOyBleHRlbnNpb25zPzogeyBjb2RlPzogc3RyaW5nIH0gfT4gfCB1bmRlZmluZWQ7XG4gICAgICAgIGZvciAoY29uc3QgY2FuZGlkYXRlIG9mIEZFVENIX0FDVElWSVRJRVNfUVVFUllfQ0FORElEQVRFUykge1xuICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGZldGNoQWN0aXZpdGllc0ZvckNhbmRpZGF0ZShjYW5kaWRhdGUpO1xuICAgICAgICAgIGlmIChyZXN1bHQuZXJyb3JzICYmIHJlc3VsdC5lcnJvcnMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgZmlyc3RFcnJvciA9IGZpcnN0RXJyb3IgPz8gcmVzdWx0LmVycm9ycztcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiB0cnVlLCBhY3Rpdml0aWVzOiByZXN1bHQuYWN0aXZpdGllcyA/PyBbXSB9KTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGZpcnN0RXJyb3IgJiYgaXNBdXRoRXJyb3IoZmlyc3RFcnJvcikpIHtcbiAgICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFwiU2Vzc2lvbiBleHBpcmVkIFx1MjAxNCBsb2cgaW50byBwb3J0YWwudHJhY2ttYW5nb2xmLmNvbVwiIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogXCJVbmFibGUgdG8gZmV0Y2ggYWN0aXZpdGllcyBcdTIwMTQgdHJ5IGFnYWluIGxhdGVyXCIgfSk7XG4gICAgICAgIH1cbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICBjb25zb2xlLmVycm9yKFwiVHJhY2tQdWxsOiBGZXRjaCBhY3Rpdml0aWVzIGZhaWxlZDpcIiwgZXJyKTtcbiAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBcIlVuYWJsZSB0byBmZXRjaCBhY3Rpdml0aWVzIFx1MjAxNCB0cnkgYWdhaW4gbGF0ZXJcIiB9KTtcbiAgICAgIH1cbiAgICB9KSgpO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgaWYgKG1lc3NhZ2UudHlwZSA9PT0gXCJJTVBPUlRfU0VTU0lPTlwiKSB7XG4gICAgY29uc3QgeyBhY3Rpdml0eUlkIH0gPSBtZXNzYWdlIGFzIEltcG9ydFNlc3Npb25SZXF1ZXN0O1xuICAgIChhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBncmFudGVkID0gYXdhaXQgaGFzUG9ydGFsUGVybWlzc2lvbigpO1xuICAgICAgaWYgKCFncmFudGVkKSB7XG4gICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogXCJQb3J0YWwgcGVybWlzc2lvbiBub3QgZ3JhbnRlZFwiIH0pO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBhd2FpdCBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoeyBbU1RPUkFHRV9LRVlTLklNUE9SVF9TVEFUVVNdOiB7IHN0YXRlOiBcImltcG9ydGluZ1wiIH0gYXMgSW1wb3J0U3RhdHVzIH0pO1xuICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogdHJ1ZSB9KTtcblxuICAgICAgdHJ5IHtcbiAgICAgICAgbGV0IHNlc3Npb246IFNlc3Npb25EYXRhIHwgbnVsbCA9IG51bGw7XG4gICAgICAgIGZvciAoY29uc3QgY2FuZGlkYXRlIG9mIElNUE9SVF9TRVNTSU9OX1FVRVJZX0NBTkRJREFURVMpIHtcbiAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBleGVjdXRlUXVlcnk8eyBub2RlOiBHcmFwaFFMQWN0aXZpdHkgfT4oXG4gICAgICAgICAgICBjYW5kaWRhdGUucXVlcnksXG4gICAgICAgICAgICB7IGlkOiBhY3Rpdml0eUlkIH1cbiAgICAgICAgICApO1xuICAgICAgICAgIGlmIChyZXN1bHQuZXJyb3JzICYmIHJlc3VsdC5lcnJvcnMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgaWYgKGlzQXV0aEVycm9yKHJlc3VsdC5lcnJvcnMpKSB7XG4gICAgICAgICAgICAgIGF3YWl0IGNocm9tZS5zdG9yYWdlLmxvY2FsLnNldCh7IFtTVE9SQUdFX0tFWVMuSU1QT1JUX1NUQVRVU106IHsgc3RhdGU6IFwiZXJyb3JcIiwgbWVzc2FnZTogXCJTZXNzaW9uIGV4cGlyZWQgXHUyMDE0IGxvZyBpbnRvIHBvcnRhbC50cmFja21hbmdvbGYuY29tXCIgfSBhcyBJbXBvcnRTdGF0dXMgfSk7XG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChjYW5kaWRhdGUubGFiZWwgPT09IFwiZGVmYXVsdFwiKSB7XG4gICAgICAgICAgICAgIGF3YWl0IGNocm9tZS5zdG9yYWdlLmxvY2FsLnNldCh7IFtTVE9SQUdFX0tFWVMuSU1QT1JUX1NUQVRVU106IHsgc3RhdGU6IFwiZXJyb3JcIiwgbWVzc2FnZTogXCJVbmFibGUgdG8gcmVhY2ggVHJhY2ttYW4gXHUyMDE0IHRyeSBhZ2FpbiBsYXRlclwiIH0gYXMgSW1wb3J0U3RhdHVzIH0pO1xuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oXCJUcmFja1B1bGw6IEltcG9ydCBxdWVyeSBjYW5kaWRhdGUgZmFpbGVkOlwiLCBjYW5kaWRhdGUubGFiZWwsIHJlc3VsdC5lcnJvcnNbMF0ubWVzc2FnZSk7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBjb25zdCBhY3Rpdml0eSA9IHJlc3VsdC5kYXRhPy5ub2RlO1xuICAgICAgICAgIHNlc3Npb24gPSBhY3Rpdml0eSA/IHBhcnNlUG9ydGFsQWN0aXZpdHkoYWN0aXZpdHkpIDogbnVsbDtcbiAgICAgICAgICBpZiAoc2Vzc2lvbikgYnJlYWs7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIXNlc3Npb24pIHtcbiAgICAgICAgICBhd2FpdCBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoeyBbU1RPUkFHRV9LRVlTLklNUE9SVF9TVEFUVVNdOiB7IHN0YXRlOiBcImVycm9yXCIsIG1lc3NhZ2U6IFwiTm8gc2hvdCBkYXRhIGZvdW5kIGZvciB0aGlzIGFjdGl2aXR5XCIgfSBhcyBJbXBvcnRTdGF0dXMgfSk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGF3YWl0IGNocm9tZS5zdG9yYWdlLmxvY2FsLnNldCh7IFtTVE9SQUdFX0tFWVMuVFJBQ0tNQU5fREFUQV06IHNlc3Npb24gfSk7XG4gICAgICAgIGF3YWl0IHNhdmVTZXNzaW9uVG9IaXN0b3J5KHNlc3Npb24pO1xuICAgICAgICBhd2FpdCBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoeyBbU1RPUkFHRV9LRVlTLklNUE9SVF9TVEFUVVNdOiB7IHN0YXRlOiBcInN1Y2Nlc3NcIiB9IGFzIEltcG9ydFN0YXR1cyB9KTtcbiAgICAgICAgY29uc29sZS5sb2coXCJUcmFja1B1bGw6IFNlc3Npb24gaW1wb3J0ZWQgc3VjY2Vzc2Z1bGx5OlwiLCBzZXNzaW9uLnJlcG9ydF9pZCk7XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIlRyYWNrUHVsbDogSW1wb3J0IGZhaWxlZDpcIiwgZXJyKTtcbiAgICAgICAgYXdhaXQgY2hyb21lLnN0b3JhZ2UubG9jYWwuc2V0KHsgW1NUT1JBR0VfS0VZUy5JTVBPUlRfU1RBVFVTXTogeyBzdGF0ZTogXCJlcnJvclwiLCBtZXNzYWdlOiBcIkltcG9ydCBmYWlsZWQgXHUyMDE0IHRyeSBhZ2FpblwiIH0gYXMgSW1wb3J0U3RhdHVzIH0pO1xuICAgICAgfVxuICAgIH0pKCk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICAvLyBSZWNlaXZlcyBwcmUtZmV0Y2hlZCBHcmFwaFFMIGRhdGEgZnJvbSBwb3B1cCAoZmV0Y2hlZCB2aWEgY29udGVudCBzY3JpcHQgb24gcG9ydGFsIHBhZ2UpXG4gIGlmIChtZXNzYWdlLnR5cGUgPT09IFwiU0FWRV9JTVBPUlRFRF9TRVNTSU9OXCIpIHtcbiAgICBjb25zdCB7IGdyYXBocWxEYXRhLCBncmFwaHFsUGF5bG9hZHMgfSA9IG1lc3NhZ2U7XG4gICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogdHJ1ZSB9KTtcblxuICAgIChhc3luYyAoKSA9PiB7XG4gICAgICBhd2FpdCBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoeyBbU1RPUkFHRV9LRVlTLklNUE9SVF9TVEFUVVNdOiB7IHN0YXRlOiBcImltcG9ydGluZ1wiIH0gYXMgSW1wb3J0U3RhdHVzIH0pO1xuXG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBwYXlsb2FkcyA9IGdyYXBocWxQYXlsb2FkcyA/PyAoZ3JhcGhxbERhdGEgPyBbZ3JhcGhxbERhdGFdIDogW10pO1xuICAgICAgICBjb25zdCBmaXJzdEVycm9yID0gcGF5bG9hZHMuZmluZCgocGF5bG9hZCkgPT4gcGF5bG9hZC5lcnJvcnMgJiYgcGF5bG9hZC5lcnJvcnMubGVuZ3RoID4gMCk/LmVycm9ycz8uWzBdO1xuICAgICAgICBjb25zdCBoYXNQYXlsb2FkV2l0aG91dEVycm9ycyA9IHBheWxvYWRzLnNvbWUoKHBheWxvYWQpID0+ICFwYXlsb2FkLmVycm9ycyB8fCBwYXlsb2FkLmVycm9ycy5sZW5ndGggPT09IDApO1xuXG4gICAgICAgIGlmIChmaXJzdEVycm9yICYmICFoYXNQYXlsb2FkV2l0aG91dEVycm9ycykge1xuICAgICAgICAgIGF3YWl0IGNocm9tZS5zdG9yYWdlLmxvY2FsLnNldCh7IFtTVE9SQUdFX0tFWVMuSU1QT1JUX1NUQVRVU106IHsgc3RhdGU6IFwiZXJyb3JcIiwgbWVzc2FnZTogZmlyc3RFcnJvci5tZXNzYWdlIH0gYXMgSW1wb3J0U3RhdHVzIH0pO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHNlc3Npb24gPSBwYXJzZUltcG9ydGVkU2Vzc2lvbihwYXlsb2Fkcyk7XG4gICAgICAgIGlmICghc2Vzc2lvbikge1xuICAgICAgICAgIGF3YWl0IGNocm9tZS5zdG9yYWdlLmxvY2FsLnNldCh7IFtTVE9SQUdFX0tFWVMuSU1QT1JUX1NUQVRVU106IHsgc3RhdGU6IFwiZXJyb3JcIiwgbWVzc2FnZTogXCJObyBzaG90IGRhdGEgZm91bmQgZm9yIHRoaXMgYWN0aXZpdHlcIiB9IGFzIEltcG9ydFN0YXR1cyB9KTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgYXdhaXQgY2hyb21lLnN0b3JhZ2UubG9jYWwuc2V0KHsgW1NUT1JBR0VfS0VZUy5UUkFDS01BTl9EQVRBXTogc2Vzc2lvbiB9KTtcbiAgICAgICAgYXdhaXQgc2F2ZVNlc3Npb25Ub0hpc3Rvcnkoc2Vzc2lvbik7XG4gICAgICAgIGF3YWl0IGNocm9tZS5zdG9yYWdlLmxvY2FsLnNldCh7IFtTVE9SQUdFX0tFWVMuSU1QT1JUX1NUQVRVU106IHsgc3RhdGU6IFwic3VjY2Vzc1wiIH0gYXMgSW1wb3J0U3RhdHVzIH0pO1xuICAgICAgICBjb25zb2xlLmxvZyhcIlRyYWNrUHVsbDogU2Vzc2lvbiBpbXBvcnRlZCBzdWNjZXNzZnVsbHk6XCIsIHNlc3Npb24ucmVwb3J0X2lkKTtcbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICBjb25zb2xlLmVycm9yKFwiVHJhY2tQdWxsOiBJbXBvcnQgZmFpbGVkOlwiLCBlcnIpO1xuICAgICAgICBhd2FpdCBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoeyBbU1RPUkFHRV9LRVlTLklNUE9SVF9TVEFUVVNdOiB7IHN0YXRlOiBcImVycm9yXCIsIG1lc3NhZ2U6IFwiSW1wb3J0IGZhaWxlZCBcdTIwMTQgdHJ5IGFnYWluXCIgfSBhcyBJbXBvcnRTdGF0dXMgfSk7XG4gICAgICB9XG4gICAgfSkoKTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn0pO1xuXG5jaHJvbWUuc3RvcmFnZS5vbkNoYW5nZWQuYWRkTGlzdGVuZXIoKGNoYW5nZXMsIG5hbWVzcGFjZSkgPT4ge1xuICBpZiAobmFtZXNwYWNlID09PSBcImxvY2FsXCIgJiYgY2hhbmdlc1tTVE9SQUdFX0tFWVMuVFJBQ0tNQU5fREFUQV0pIHtcbiAgICBjb25zdCBuZXdWYWx1ZSA9IGNoYW5nZXNbU1RPUkFHRV9LRVlTLlRSQUNLTUFOX0RBVEFdLm5ld1ZhbHVlO1xuICAgIGNocm9tZS5ydW50aW1lLnNlbmRNZXNzYWdlKHsgdHlwZTogXCJEQVRBX1VQREFURURcIiwgZGF0YTogbmV3VmFsdWUgfSkuY2F0Y2goKCkgPT4ge1xuICAgICAgLy8gSWdub3JlIGVycm9ycyB3aGVuIG5vIHBvcHVwIGlzIGxpc3RlbmluZ1xuICAgIH0pO1xuICB9XG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7QUFBQSxNQTRFYSxzQkFrRUE7QUE5SWI7QUFBQTtBQTRFTyxNQUFNLHVCQUErQztBQUFBLFFBQzFELFdBQVc7QUFBQSxRQUNYLFdBQVc7QUFBQSxRQUNYLGFBQWE7QUFBQSxRQUNiLGFBQWE7QUFBQSxRQUNiLFVBQVU7QUFBQSxRQUNWLFdBQVc7QUFBQSxRQUNYLFlBQVk7QUFBQSxRQUNaLGdCQUFnQjtBQUFBLFFBQ2hCLGFBQWE7QUFBQSxRQUNiLFVBQVU7QUFBQSxRQUNWLFVBQVU7QUFBQSxRQUNWLFVBQVU7QUFBQSxRQUNWLGFBQWE7QUFBQSxRQUNiLGlCQUFpQjtBQUFBLFFBQ2pCLE9BQU87QUFBQSxRQUNQLE9BQU87QUFBQSxRQUNQLE1BQU07QUFBQSxRQUNOLFdBQVc7QUFBQSxRQUNYLFdBQVc7QUFBQSxRQUNYLFdBQVc7QUFBQSxRQUNYLFFBQVE7QUFBQSxRQUNSLFdBQVc7QUFBQSxRQUNYLE9BQU87QUFBQSxRQUNQLGNBQWM7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
