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
        SESSION_HISTORY: "sessionHistory"
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

  // src/background/serviceWorker.ts
  var require_serviceWorker = __commonJS({
    "src/background/serviceWorker.ts"() {
      init_constants();
      init_csv_writer();
      init_unit_normalization();
      init_history();
      init_portalPermissions();
      init_graphql_client();
      chrome.runtime.onInstalled.addListener(() => {
        console.log("TrackPull extension installed");
      });
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
        if (message.type === "PORTAL_IMPORT_REQUEST") {
          (async () => {
            const granted = await hasPortalPermission();
            if (!granted) {
              sendResponse({ success: false, error: "Portal permission not granted" });
              return;
            }
            sendResponse({ success: false, error: "Not implemented" });
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL3NoYXJlZC9jb25zdGFudHMudHMiLCAiLi4vc3JjL3NoYXJlZC91bml0X25vcm1hbGl6YXRpb24udHMiLCAiLi4vc3JjL3NoYXJlZC9jc3Zfd3JpdGVyLnRzIiwgIi4uL3NyYy9zaGFyZWQvaGlzdG9yeS50cyIsICIuLi9zcmMvc2hhcmVkL3BvcnRhbFBlcm1pc3Npb25zLnRzIiwgIi4uL3NyYy9zaGFyZWQvZ3JhcGhxbF9jbGllbnQudHMiLCAiLi4vc3JjL2JhY2tncm91bmQvc2VydmljZVdvcmtlci50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiLyoqXG4gKiBTaGFyZWQgY29uc3RhbnRzIGluY2x1ZGluZyBDU1Mgc2VsZWN0b3JzIGFuZCBjb25maWd1cmF0aW9uLlxuICogQmFzZWQgb24gUHl0aG9uIHNjcmFwZXIgY29uc3RhbnRzLnB5IGltcGxlbWVudGF0aW9uLlxuICovXG5cbi8vIENvbXBsZXRlIGxpc3Qgb2YgYWxsIGtub3duIFRyYWNrbWFuIG1ldHJpY3MgKFVSTCBwYXJhbWV0ZXIgbmFtZXMpXG5leHBvcnQgY29uc3QgQUxMX01FVFJJQ1MgPSBbXG4gIFwiQ2x1YlNwZWVkXCIsXG4gIFwiQmFsbFNwZWVkXCIsXG4gIFwiU21hc2hGYWN0b3JcIixcbiAgXCJBdHRhY2tBbmdsZVwiLFxuICBcIkNsdWJQYXRoXCIsXG4gIFwiRmFjZUFuZ2xlXCIsXG4gIFwiRmFjZVRvUGF0aFwiLFxuICBcIlN3aW5nRGlyZWN0aW9uXCIsXG4gIFwiRHluYW1pY0xvZnRcIixcbiAgXCJTcGluUmF0ZVwiLFxuICBcIlNwaW5BeGlzXCIsXG4gIFwiU3BpbkxvZnRcIixcbiAgXCJMYXVuY2hBbmdsZVwiLFxuICBcIkxhdW5jaERpcmVjdGlvblwiLFxuICBcIkNhcnJ5XCIsXG4gIFwiVG90YWxcIixcbiAgXCJTaWRlXCIsXG4gIFwiU2lkZVRvdGFsXCIsXG4gIFwiQ2FycnlTaWRlXCIsXG4gIFwiVG90YWxTaWRlXCIsXG4gIFwiSGVpZ2h0XCIsXG4gIFwiTWF4SGVpZ2h0XCIsXG4gIFwiQ3VydmVcIixcbiAgXCJMYW5kaW5nQW5nbGVcIixcbiAgXCJIYW5nVGltZVwiLFxuICBcIkxvd1BvaW50RGlzdGFuY2VcIixcbiAgXCJJbXBhY3RIZWlnaHRcIixcbiAgXCJJbXBhY3RPZmZzZXRcIixcbiAgXCJUZW1wb1wiLFxuXSBhcyBjb25zdDtcblxuLy8gTWV0cmljcyBzcGxpdCBpbnRvIGdyb3VwcyBmb3IgbXVsdGktcGFnZS1sb2FkIEhUTUwgZmFsbGJhY2tcbmV4cG9ydCBjb25zdCBNRVRSSUNfR1JPVVBTID0gW1xuICBbXG4gICAgXCJDbHViU3BlZWRcIixcbiAgICBcIkJhbGxTcGVlZFwiLFxuICAgIFwiU21hc2hGYWN0b3JcIixcbiAgICBcIkF0dGFja0FuZ2xlXCIsXG4gICAgXCJDbHViUGF0aFwiLFxuICAgIFwiRmFjZUFuZ2xlXCIsXG4gICAgXCJGYWNlVG9QYXRoXCIsXG4gICAgXCJTd2luZ0RpcmVjdGlvblwiLFxuICAgIFwiRHluYW1pY0xvZnRcIixcbiAgICBcIlNwaW5Mb2Z0XCIsXG4gIF0sXG4gIFtcbiAgICBcIlNwaW5SYXRlXCIsXG4gICAgXCJTcGluQXhpc1wiLFxuICAgIFwiTGF1bmNoQW5nbGVcIixcbiAgICBcIkxhdW5jaERpcmVjdGlvblwiLFxuICAgIFwiQ2FycnlcIixcbiAgICBcIlRvdGFsXCIsXG4gICAgXCJTaWRlXCIsXG4gICAgXCJTaWRlVG90YWxcIixcbiAgICBcIkNhcnJ5U2lkZVwiLFxuICAgIFwiVG90YWxTaWRlXCIsXG4gICAgXCJIZWlnaHRcIixcbiAgICBcIk1heEhlaWdodFwiLFxuICAgIFwiQ3VydmVcIixcbiAgICBcIkxhbmRpbmdBbmdsZVwiLFxuICAgIFwiSGFuZ1RpbWVcIixcbiAgICBcIkxvd1BvaW50RGlzdGFuY2VcIixcbiAgICBcIkltcGFjdEhlaWdodFwiLFxuICAgIFwiSW1wYWN0T2Zmc2V0XCIsXG4gICAgXCJUZW1wb1wiLFxuICBdLFxuXSBhcyBjb25zdDtcblxuLy8gRGlzcGxheSBuYW1lczogVVJMIHBhcmFtIG5hbWUgLT4gaHVtYW4tcmVhZGFibGUgQ1NWIGhlYWRlclxuZXhwb3J0IGNvbnN0IE1FVFJJQ19ESVNQTEFZX05BTUVTOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xuICBDbHViU3BlZWQ6IFwiQ2x1YiBTcGVlZFwiLFxuICBCYWxsU3BlZWQ6IFwiQmFsbCBTcGVlZFwiLFxuICBTbWFzaEZhY3RvcjogXCJTbWFzaCBGYWN0b3JcIixcbiAgQXR0YWNrQW5nbGU6IFwiQXR0YWNrIEFuZ2xlXCIsXG4gIENsdWJQYXRoOiBcIkNsdWIgUGF0aFwiLFxuICBGYWNlQW5nbGU6IFwiRmFjZSBBbmdsZVwiLFxuICBGYWNlVG9QYXRoOiBcIkZhY2UgVG8gUGF0aFwiLFxuICBTd2luZ0RpcmVjdGlvbjogXCJTd2luZyBEaXJlY3Rpb25cIixcbiAgRHluYW1pY0xvZnQ6IFwiRHluYW1pYyBMb2Z0XCIsXG4gIFNwaW5SYXRlOiBcIlNwaW4gUmF0ZVwiLFxuICBTcGluQXhpczogXCJTcGluIEF4aXNcIixcbiAgU3BpbkxvZnQ6IFwiU3BpbiBMb2Z0XCIsXG4gIExhdW5jaEFuZ2xlOiBcIkxhdW5jaCBBbmdsZVwiLFxuICBMYXVuY2hEaXJlY3Rpb246IFwiTGF1bmNoIERpcmVjdGlvblwiLFxuICBDYXJyeTogXCJDYXJyeVwiLFxuICBUb3RhbDogXCJUb3RhbFwiLFxuICBTaWRlOiBcIlNpZGVcIixcbiAgU2lkZVRvdGFsOiBcIlNpZGUgVG90YWxcIixcbiAgQ2FycnlTaWRlOiBcIkNhcnJ5IFNpZGVcIixcbiAgVG90YWxTaWRlOiBcIlRvdGFsIFNpZGVcIixcbiAgSGVpZ2h0OiBcIkhlaWdodFwiLFxuICBNYXhIZWlnaHQ6IFwiTWF4IEhlaWdodFwiLFxuICBDdXJ2ZTogXCJDdXJ2ZVwiLFxuICBMYW5kaW5nQW5nbGU6IFwiTGFuZGluZyBBbmdsZVwiLFxuICBIYW5nVGltZTogXCJIYW5nIFRpbWVcIixcbiAgTG93UG9pbnREaXN0YW5jZTogXCJMb3cgUG9pbnRcIixcbiAgSW1wYWN0SGVpZ2h0OiBcIkltcGFjdCBIZWlnaHRcIixcbiAgSW1wYWN0T2Zmc2V0OiBcIkltcGFjdCBPZmZzZXRcIixcbiAgVGVtcG86IFwiVGVtcG9cIixcbn07XG5cbi8vIENTUyBjbGFzcyBzZWxlY3RvcnMgKGZyb20gVHJhY2ttYW4ncyByZW5kZXJlZCBIVE1MKVxuZXhwb3J0IGNvbnN0IENTU19EQVRFID0gXCJkYXRlXCI7XG5leHBvcnQgY29uc3QgQ1NTX1JFU1VMVFNfV1JBUFBFUiA9IFwicGxheWVyLWFuZC1yZXN1bHRzLXRhYmxlLXdyYXBwZXJcIjtcbmV4cG9ydCBjb25zdCBDU1NfUkVTVUxUU19UQUJMRSA9IFwiUmVzdWx0c1RhYmxlXCI7XG5leHBvcnQgY29uc3QgQ1NTX0NMVUJfVEFHID0gXCJncm91cC10YWdcIjtcbmV4cG9ydCBjb25zdCBDU1NfUEFSQU1fTkFNRVNfUk9XID0gXCJwYXJhbWV0ZXItbmFtZXMtcm93XCI7XG5leHBvcnQgY29uc3QgQ1NTX1BBUkFNX05BTUUgPSBcInBhcmFtZXRlci1uYW1lXCI7XG5leHBvcnQgY29uc3QgQ1NTX1NIT1RfREVUQUlMX1JPVyA9IFwicm93LXdpdGgtc2hvdC1kZXRhaWxzXCI7XG5leHBvcnQgY29uc3QgQ1NTX0FWRVJBR0VfVkFMVUVTID0gXCJhdmVyYWdlLXZhbHVlc1wiO1xuZXhwb3J0IGNvbnN0IENTU19DT05TSVNURU5DWV9WQUxVRVMgPSBcImNvbnNpc3RlbmN5LXZhbHVlc1wiO1xuXG4vLyBBUEkgVVJMIHBhdHRlcm5zIHRoYXQgbGlrZWx5IGluZGljYXRlIGFuIEFQSSBkYXRhIHJlc3BvbnNlXG5leHBvcnQgY29uc3QgQVBJX1VSTF9QQVRURVJOUyA9IFtcbiAgXCJhcGkudHJhY2ttYW5nb2xmLmNvbVwiLFxuICBcInRyYWNrbWFuZ29sZi5jb20vYXBpXCIsXG4gIFwiL2FwaS9cIixcbiAgXCIvcmVwb3J0cy9cIixcbiAgXCIvYWN0aXZpdGllcy9cIixcbiAgXCIvc2hvdHMvXCIsXG4gIFwiZ3JhcGhxbFwiLFxuXTtcblxuLy8gVGltZW91dHMgKG1pbGxpc2Vjb25kcylcbmV4cG9ydCBjb25zdCBQQUdFX0xPQURfVElNRU9VVCA9IDMwXzAwMDtcbmV4cG9ydCBjb25zdCBEQVRBX0xPQURfVElNRU9VVCA9IDE1XzAwMDtcblxuLy8gVHJhY2ttYW4gYmFzZSBVUkxcbmV4cG9ydCBjb25zdCBCQVNFX1VSTCA9IFwiaHR0cHM6Ly93ZWItZHluYW1pYy1yZXBvcnRzLnRyYWNrbWFuZ29sZi5jb20vXCI7XG5cbi8vIEN1c3RvbSBwcm9tcHQgc3RvcmFnZSBrZXlzXG5leHBvcnQgY29uc3QgQ1VTVE9NX1BST01QVF9LRVlfUFJFRklYID0gXCJjdXN0b21Qcm9tcHRfXCIgYXMgY29uc3Q7XG5leHBvcnQgY29uc3QgQ1VTVE9NX1BST01QVF9JRFNfS0VZID0gXCJjdXN0b21Qcm9tcHRJZHNcIiBhcyBjb25zdDtcblxuLy8gU3RvcmFnZSBrZXlzIGZvciBDaHJvbWUgZXh0ZW5zaW9uIChhbGlnbmVkIGJldHdlZW4gYmFja2dyb3VuZCBhbmQgcG9wdXApXG5leHBvcnQgY29uc3QgU1RPUkFHRV9LRVlTID0ge1xuICBUUkFDS01BTl9EQVRBOiBcInRyYWNrbWFuRGF0YVwiLFxuICBTUEVFRF9VTklUOiBcInNwZWVkVW5pdFwiLFxuICBESVNUQU5DRV9VTklUOiBcImRpc3RhbmNlVW5pdFwiLFxuICBTRUxFQ1RFRF9QUk9NUFRfSUQ6IFwic2VsZWN0ZWRQcm9tcHRJZFwiLFxuICBBSV9TRVJWSUNFOiBcImFpU2VydmljZVwiLFxuICBISVRUSU5HX1NVUkZBQ0U6IFwiaGl0dGluZ1N1cmZhY2VcIixcbiAgSU5DTFVERV9BVkVSQUdFUzogXCJpbmNsdWRlQXZlcmFnZXNcIixcbiAgU0VTU0lPTl9ISVNUT1JZOiBcInNlc3Npb25IaXN0b3J5XCIsXG59IGFzIGNvbnN0O1xuIiwgIi8qKlxuICogVW5pdCBub3JtYWxpemF0aW9uIHV0aWxpdGllcyBmb3IgVHJhY2ttYW4gbWVhc3VyZW1lbnRzLlxuICogXG4gKiBUcmFja21hbiB1c2VzIG5kXyogcGFyYW1ldGVycyB0byBzcGVjaWZ5IHVuaXRzOlxuICogLSBuZF8wMDEsIG5kXzAwMiwgZXRjLiBkZWZpbmUgdW5pdCBzeXN0ZW1zIGZvciBkaWZmZXJlbnQgbWVhc3VyZW1lbnQgZ3JvdXBzXG4gKiAtIENvbW1vbiB2YWx1ZXM6IDc4OTAxMiA9IHlhcmRzL2RlZ3JlZXMsIDc4OTAxMyA9IG1ldGVycy9yYWRpYW5zXG4gKi9cblxuZXhwb3J0IHR5cGUgVW5pdFN5c3RlbUlkID0gXCI3ODkwMTJcIiB8IFwiNzg5MDEzXCIgfCBcIjc4OTAxNFwiIHwgc3RyaW5nO1xuXG5leHBvcnQgdHlwZSBTcGVlZFVuaXQgPSBcIm1waFwiIHwgXCJtL3NcIjtcbmV4cG9ydCB0eXBlIERpc3RhbmNlVW5pdCA9IFwieWFyZHNcIiB8IFwibWV0ZXJzXCI7XG5leHBvcnQgdHlwZSBTbWFsbERpc3RhbmNlVW5pdCA9IFwiaW5jaGVzXCIgfCBcImNtXCI7XG5leHBvcnQgaW50ZXJmYWNlIFVuaXRDaG9pY2UgeyBzcGVlZDogU3BlZWRVbml0OyBkaXN0YW5jZTogRGlzdGFuY2VVbml0IH1cbmV4cG9ydCBjb25zdCBERUZBVUxUX1VOSVRfQ0hPSUNFOiBVbml0Q2hvaWNlID0geyBzcGVlZDogXCJtcGhcIiwgZGlzdGFuY2U6IFwieWFyZHNcIiB9O1xuXG4vKipcbiAqIFRyYWNrbWFuIHVuaXQgc3lzdGVtIGRlZmluaXRpb25zLlxuICogTWFwcyBuZF8qIHBhcmFtZXRlciB2YWx1ZXMgdG8gYWN0dWFsIHVuaXRzIGZvciBlYWNoIG1ldHJpYy5cbiAqL1xuZXhwb3J0IGNvbnN0IFVOSVRfU1lTVEVNUzogUmVjb3JkPFVuaXRTeXN0ZW1JZCwgVW5pdFN5c3RlbT4gPSB7XG4gIC8vIEltcGVyaWFsICh5YXJkcywgZGVncmVlcykgLSBtb3N0IGNvbW1vblxuICBcIjc4OTAxMlwiOiB7XG4gICAgaWQ6IFwiNzg5MDEyXCIsXG4gICAgbmFtZTogXCJJbXBlcmlhbFwiLFxuICAgIGRpc3RhbmNlVW5pdDogXCJ5YXJkc1wiLFxuICAgIGFuZ2xlVW5pdDogXCJkZWdyZWVzXCIsXG4gICAgc3BlZWRVbml0OiBcIm1waFwiLFxuICB9LFxuICAvLyBNZXRyaWMgKG1ldGVycywgcmFkaWFucylcbiAgXCI3ODkwMTNcIjoge1xuICAgIGlkOiBcIjc4OTAxM1wiLFxuICAgIG5hbWU6IFwiTWV0cmljIChyYWQpXCIsXG4gICAgZGlzdGFuY2VVbml0OiBcIm1ldGVyc1wiLFxuICAgIGFuZ2xlVW5pdDogXCJyYWRpYW5zXCIsXG4gICAgc3BlZWRVbml0OiBcImttL2hcIixcbiAgfSxcbiAgLy8gTWV0cmljIChtZXRlcnMsIGRlZ3JlZXMpIC0gbGVzcyBjb21tb25cbiAgXCI3ODkwMTRcIjoge1xuICAgIGlkOiBcIjc4OTAxNFwiLFxuICAgIG5hbWU6IFwiTWV0cmljIChkZWcpXCIsXG4gICAgZGlzdGFuY2VVbml0OiBcIm1ldGVyc1wiLFxuICAgIGFuZ2xlVW5pdDogXCJkZWdyZWVzXCIsXG4gICAgc3BlZWRVbml0OiBcImttL2hcIixcbiAgfSxcbn07XG5cbi8qKlxuICogVW5pdCBzeXN0ZW0gY29uZmlndXJhdGlvbi5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBVbml0U3lzdGVtIHtcbiAgaWQ6IFVuaXRTeXN0ZW1JZDtcbiAgbmFtZTogc3RyaW5nO1xuICBkaXN0YW5jZVVuaXQ6IFwieWFyZHNcIiB8IFwibWV0ZXJzXCI7XG4gIGFuZ2xlVW5pdDogXCJkZWdyZWVzXCIgfCBcInJhZGlhbnNcIjtcbiAgc3BlZWRVbml0OiBcIm1waFwiIHwgXCJrbS9oXCIgfCBcIm0vc1wiO1xufVxuXG4vKipcbiAqIE1ldHJpY3MgdGhhdCB1c2UgZGlzdGFuY2UgdW5pdHMuXG4gKi9cbmV4cG9ydCBjb25zdCBESVNUQU5DRV9NRVRSSUNTID0gbmV3IFNldChbXG4gIFwiQ2FycnlcIixcbiAgXCJUb3RhbFwiLFxuICBcIlNpZGVcIixcbiAgXCJTaWRlVG90YWxcIixcbiAgXCJDYXJyeVNpZGVcIixcbiAgXCJUb3RhbFNpZGVcIixcbiAgXCJIZWlnaHRcIixcbiAgXCJNYXhIZWlnaHRcIixcbiAgXCJDdXJ2ZVwiLFxuXSk7XG5cbi8qKlxuICogTWV0cmljcyB0aGF0IHVzZSBzbWFsbCBkaXN0YW5jZSB1bml0cyAoaW5jaGVzL2NtKS5cbiAqIFRoZXNlIHZhbHVlcyBjb21lIGZyb20gdGhlIEFQSSBpbiBtZXRlcnMgYnV0IGFyZSB0b28gc21hbGwgZm9yIHlhcmRzL21ldGVycy5cbiAqL1xuZXhwb3J0IGNvbnN0IFNNQUxMX0RJU1RBTkNFX01FVFJJQ1MgPSBuZXcgU2V0KFtcbiAgXCJMb3dQb2ludERpc3RhbmNlXCIsXG5dKTtcblxuLyoqXG4gKiBUcmFja21hbiBpbXBhY3QgbG9jYXRpb24gbWV0cmljcyBhcmUgYWx3YXlzIGRpc3BsYXllZCBpbiBtaWxsaW1ldGVycy5cbiAqIFRoZSBBUEkgcmV0dXJucyB0aGVzZSB2YWx1ZXMgaW4gbWV0ZXJzLlxuICovXG5leHBvcnQgY29uc3QgTUlMTElNRVRFUl9NRVRSSUNTID0gbmV3IFNldChbXG4gIFwiSW1wYWN0SGVpZ2h0XCIsXG4gIFwiSW1wYWN0T2Zmc2V0XCIsXG5dKTtcblxuLyoqXG4gKiBNZXRyaWNzIHRoYXQgdXNlIGFuZ2xlIHVuaXRzLlxuICovXG5leHBvcnQgY29uc3QgQU5HTEVfTUVUUklDUyA9IG5ldyBTZXQoW1xuICBcIkF0dGFja0FuZ2xlXCIsXG4gIFwiQ2x1YlBhdGhcIixcbiAgXCJGYWNlQW5nbGVcIixcbiAgXCJGYWNlVG9QYXRoXCIsXG4gIFwiRHluYW1pY0xvZnRcIixcbiAgXCJMYXVuY2hBbmdsZVwiLFxuICBcIkxhdW5jaERpcmVjdGlvblwiLFxuICBcIkxhbmRpbmdBbmdsZVwiLFxuXSk7XG5cbi8qKlxuICogTWV0cmljcyB0aGF0IHVzZSBzcGVlZCB1bml0cy5cbiAqL1xuZXhwb3J0IGNvbnN0IFNQRUVEX01FVFJJQ1MgPSBuZXcgU2V0KFtcbiAgXCJDbHViU3BlZWRcIixcbiAgXCJCYWxsU3BlZWRcIixcbl0pO1xuXG4vKipcbiAqIERlZmF1bHQgdW5pdCBzeXN0ZW0gKEltcGVyaWFsIC0geWFyZHMvZGVncmVlcykuXG4gKi9cbmV4cG9ydCBjb25zdCBERUZBVUxUX1VOSVRfU1lTVEVNOiBVbml0U3lzdGVtID0gVU5JVF9TWVNURU1TW1wiNzg5MDEyXCJdO1xuXG4vKipcbiAqIFNwZWVkIHVuaXQgZGlzcGxheSBsYWJlbHMgZm9yIENTViBoZWFkZXJzLlxuICovXG5leHBvcnQgY29uc3QgU1BFRURfTEFCRUxTOiBSZWNvcmQ8U3BlZWRVbml0LCBzdHJpbmc+ID0ge1xuICBcIm1waFwiOiBcIm1waFwiLFxuICBcIm0vc1wiOiBcIm0vc1wiLFxufTtcblxuLyoqXG4gKiBEaXN0YW5jZSB1bml0IGRpc3BsYXkgbGFiZWxzIGZvciBDU1YgaGVhZGVycy5cbiAqL1xuZXhwb3J0IGNvbnN0IERJU1RBTkNFX0xBQkVMUzogUmVjb3JkPERpc3RhbmNlVW5pdCwgc3RyaW5nPiA9IHtcbiAgXCJ5YXJkc1wiOiBcInlkc1wiLFxuICBcIm1ldGVyc1wiOiBcIm1cIixcbn07XG5cbi8qKlxuICogU21hbGwgZGlzdGFuY2UgdW5pdCBkaXNwbGF5IGxhYmVscyBmb3IgQ1NWIGhlYWRlcnMuXG4gKi9cbmV4cG9ydCBjb25zdCBTTUFMTF9ESVNUQU5DRV9MQUJFTFM6IFJlY29yZDxTbWFsbERpc3RhbmNlVW5pdCwgc3RyaW5nPiA9IHtcbiAgXCJpbmNoZXNcIjogXCJpblwiLFxuICBcImNtXCI6IFwiY21cIixcbn07XG5cbi8qKlxuICogTWlncmF0ZSBhIGxlZ2FjeSB1bml0UHJlZmVyZW5jZSBzdHJpbmcgdG8gYSBVbml0Q2hvaWNlIG9iamVjdC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG1pZ3JhdGVMZWdhY3lQcmVmKHN0b3JlZDogc3RyaW5nIHwgdW5kZWZpbmVkKTogVW5pdENob2ljZSB7XG4gIHN3aXRjaCAoc3RvcmVkKSB7XG4gICAgY2FzZSBcIm1ldHJpY1wiOlxuICAgICAgcmV0dXJuIHsgc3BlZWQ6IFwibS9zXCIsIGRpc3RhbmNlOiBcIm1ldGVyc1wiIH07XG4gICAgY2FzZSBcImh5YnJpZFwiOlxuICAgICAgcmV0dXJuIHsgc3BlZWQ6IFwibXBoXCIsIGRpc3RhbmNlOiBcIm1ldGVyc1wiIH07XG4gICAgY2FzZSBcImltcGVyaWFsXCI6XG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiB7IHNwZWVkOiBcIm1waFwiLCBkaXN0YW5jZTogXCJ5YXJkc1wiIH07XG4gIH1cbn1cblxuLyoqXG4gKiBGaXhlZCB1bml0IGxhYmVscyBmb3IgbWV0cmljcyB3aG9zZSB1bml0cyBkb24ndCB2YXJ5IGJ5IHByZWZlcmVuY2UuXG4gKi9cbmV4cG9ydCBjb25zdCBGSVhFRF9VTklUX0xBQkVMUzogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcbiAgU3BpblJhdGU6IFwicnBtXCIsXG4gIEhhbmdUaW1lOiBcInNcIixcbiAgVGVtcG86IFwic1wiLFxuICBJbXBhY3RIZWlnaHQ6IFwibW1cIixcbiAgSW1wYWN0T2Zmc2V0OiBcIm1tXCIsXG59O1xuXG4vKipcbiAqIEV4dHJhY3QgbmRfKiBwYXJhbWV0ZXJzIGZyb20gbWV0YWRhdGFfcGFyYW1zLlxuICogXG4gKiBAcGFyYW0gbWV0YWRhdGFQYXJhbXMgLSBUaGUgbWV0YWRhdGFfcGFyYW1zIG9iamVjdCBmcm9tIFNlc3Npb25EYXRhXG4gKiBAcmV0dXJucyBPYmplY3QgbWFwcGluZyBtZXRyaWMgZ3JvdXAgSURzIHRvIHVuaXQgc3lzdGVtIElEc1xuICovXG5leHBvcnQgZnVuY3Rpb24gZXh0cmFjdFVuaXRQYXJhbXMoXG4gIG1ldGFkYXRhUGFyYW1zOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+XG4pOiBSZWNvcmQ8c3RyaW5nLCBVbml0U3lzdGVtSWQ+IHtcbiAgY29uc3QgcmVzdWx0OiBSZWNvcmQ8c3RyaW5nLCBVbml0U3lzdGVtSWQ+ID0ge307XG5cbiAgZm9yIChjb25zdCBba2V5LCB2YWx1ZV0gb2YgT2JqZWN0LmVudHJpZXMobWV0YWRhdGFQYXJhbXMpKSB7XG4gICAgY29uc3QgbWF0Y2ggPSBrZXkubWF0Y2goL15uZF8oW2EtejAtOV0rKSQvaSk7XG4gICAgaWYgKG1hdGNoKSB7XG4gICAgICBjb25zdCBncm91cEtleSA9IG1hdGNoWzFdLnRvTG93ZXJDYXNlKCk7XG4gICAgICByZXN1bHRbZ3JvdXBLZXldID0gdmFsdWUgYXMgVW5pdFN5c3RlbUlkO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZXN1bHQ7XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lIHRoZSB1bml0IHN5c3RlbSBJRCBmcm9tIG1ldGFkYXRhIHBhcmFtcy5cbiAqIFVzZXMgbmRfMDAxIGFzIHByaW1hcnksIGZhbGxzIGJhY2sgdG8gZGVmYXVsdC5cbiAqIFxuICogQHBhcmFtIG1ldGFkYXRhUGFyYW1zIC0gVGhlIG1ldGFkYXRhX3BhcmFtcyBvYmplY3RcbiAqIEByZXR1cm5zIFRoZSB1bml0IHN5c3RlbSBJRCBzdHJpbmdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFVuaXRTeXN0ZW1JZChcbiAgbWV0YWRhdGFQYXJhbXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz5cbik6IFVuaXRTeXN0ZW1JZCB7XG4gIGNvbnN0IHVuaXRQYXJhbXMgPSBleHRyYWN0VW5pdFBhcmFtcyhtZXRhZGF0YVBhcmFtcyk7XG4gIHJldHVybiB1bml0UGFyYW1zW1wiMDAxXCJdIHx8IFwiNzg5MDEyXCI7IC8vIERlZmF1bHQgdG8gSW1wZXJpYWxcbn1cblxuLyoqXG4gKiBHZXQgdGhlIGZ1bGwgdW5pdCBzeXN0ZW0gY29uZmlndXJhdGlvbi5cbiAqIFxuICogQHBhcmFtIG1ldGFkYXRhUGFyYW1zIC0gVGhlIG1ldGFkYXRhX3BhcmFtcyBvYmplY3RcbiAqIEByZXR1cm5zIFRoZSBVbml0U3lzdGVtIGNvbmZpZ3VyYXRpb25cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFVuaXRTeXN0ZW0oXG4gIG1ldGFkYXRhUGFyYW1zOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+XG4pOiBVbml0U3lzdGVtIHtcbiAgY29uc3QgaWQgPSBnZXRVbml0U3lzdGVtSWQobWV0YWRhdGFQYXJhbXMpO1xuICByZXR1cm4gVU5JVF9TWVNURU1TW2lkXSB8fCBERUZBVUxUX1VOSVRfU1lTVEVNO1xufVxuXG4vKipcbiAqIEdldCB0aGUgdW5pdCBzeXN0ZW0gcmVwcmVzZW50aW5nIHdoYXQgdGhlIEFQSSBhY3R1YWxseSByZXR1cm5zLlxuICogVGhlIEFQSSBhbHdheXMgcmV0dXJucyBzcGVlZCBpbiBtL3MgYW5kIGRpc3RhbmNlIGluIG1ldGVycyxcbiAqIGJ1dCB0aGUgYW5nbGUgdW5pdCBkZXBlbmRzIG9uIHRoZSByZXBvcnQncyBuZF8wMDEgcGFyYW1ldGVyLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0QXBpU291cmNlVW5pdFN5c3RlbShcbiAgbWV0YWRhdGFQYXJhbXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz5cbik6IFVuaXRTeXN0ZW0ge1xuICBjb25zdCByZXBvcnRTeXN0ZW0gPSBnZXRVbml0U3lzdGVtKG1ldGFkYXRhUGFyYW1zKTtcbiAgcmV0dXJuIHtcbiAgICBpZDogXCJhcGlcIiBhcyBVbml0U3lzdGVtSWQsXG4gICAgbmFtZTogXCJBUEkgU291cmNlXCIsXG4gICAgZGlzdGFuY2VVbml0OiBcIm1ldGVyc1wiLFxuICAgIGFuZ2xlVW5pdDogcmVwb3J0U3lzdGVtLmFuZ2xlVW5pdCxcbiAgICBzcGVlZFVuaXQ6IFwibS9zXCIsXG4gIH07XG59XG5cbi8qKlxuICogR2V0IHRoZSB1bml0IGxhYmVsIGZvciBhIG1ldHJpYyBiYXNlZCBvbiB1c2VyJ3MgdW5pdCBjaG9pY2UuXG4gKiBSZXR1cm5zIGVtcHR5IHN0cmluZyBmb3IgZGltZW5zaW9ubGVzcyBtZXRyaWNzIChlLmcuIFNtYXNoRmFjdG9yLCBTcGluUmF0ZSkuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRNZXRyaWNVbml0TGFiZWwoXG4gIG1ldHJpY05hbWU6IHN0cmluZyxcbiAgdW5pdENob2ljZTogVW5pdENob2ljZSA9IERFRkFVTFRfVU5JVF9DSE9JQ0Vcbik6IHN0cmluZyB7XG4gIGlmIChtZXRyaWNOYW1lIGluIEZJWEVEX1VOSVRfTEFCRUxTKSByZXR1cm4gRklYRURfVU5JVF9MQUJFTFNbbWV0cmljTmFtZV07XG4gIGlmIChTUEVFRF9NRVRSSUNTLmhhcyhtZXRyaWNOYW1lKSkgcmV0dXJuIFNQRUVEX0xBQkVMU1t1bml0Q2hvaWNlLnNwZWVkXTtcbiAgaWYgKFNNQUxMX0RJU1RBTkNFX01FVFJJQ1MuaGFzKG1ldHJpY05hbWUpKSByZXR1cm4gU01BTExfRElTVEFOQ0VfTEFCRUxTW2dldFNtYWxsRGlzdGFuY2VVbml0KHVuaXRDaG9pY2UpXTtcbiAgaWYgKERJU1RBTkNFX01FVFJJQ1MuaGFzKG1ldHJpY05hbWUpKSByZXR1cm4gRElTVEFOQ0VfTEFCRUxTW3VuaXRDaG9pY2UuZGlzdGFuY2VdO1xuICBpZiAoQU5HTEVfTUVUUklDUy5oYXMobWV0cmljTmFtZSkpIHJldHVybiBcIlx1MDBCMFwiO1xuICByZXR1cm4gXCJcIjtcbn1cblxuLyoqXG4gKiBDb252ZXJ0IGEgZGlzdGFuY2UgdmFsdWUgYmV0d2VlbiB1bml0cy5cbiAqIFxuICogQHBhcmFtIHZhbHVlIC0gVGhlIHZhbHVlIHRvIGNvbnZlcnRcbiAqIEBwYXJhbSBmcm9tVW5pdCAtIFNvdXJjZSB1bml0IChcInlhcmRzXCIgb3IgXCJtZXRlcnNcIilcbiAqIEBwYXJhbSB0b1VuaXQgLSBUYXJnZXQgdW5pdCAoXCJ5YXJkc1wiIG9yIFwibWV0ZXJzXCIpXG4gKiBAcmV0dXJucyBDb252ZXJ0ZWQgdmFsdWUsIG9yIG9yaWdpbmFsIGlmIHVuaXRzIG1hdGNoXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb252ZXJ0RGlzdGFuY2UoXG4gIHZhbHVlOiBudW1iZXIgfCBzdHJpbmcgfCBudWxsLFxuICBmcm9tVW5pdDogXCJ5YXJkc1wiIHwgXCJtZXRlcnNcIixcbiAgdG9Vbml0OiBcInlhcmRzXCIgfCBcIm1ldGVyc1wiXG4pOiBudW1iZXIgfCBzdHJpbmcgfCBudWxsIHtcbiAgaWYgKHZhbHVlID09PSBudWxsIHx8IHZhbHVlID09PSBcIlwiKSByZXR1cm4gdmFsdWU7XG5cbiAgY29uc3QgbnVtVmFsdWUgPSB0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCIgPyBwYXJzZUZsb2F0KHZhbHVlKSA6IHZhbHVlO1xuICBpZiAoaXNOYU4obnVtVmFsdWUpKSByZXR1cm4gdmFsdWU7XG5cbiAgaWYgKGZyb21Vbml0ID09PSB0b1VuaXQpIHJldHVybiBudW1WYWx1ZTtcblxuICAvLyBDb252ZXJ0IHRvIG1ldGVycyBmaXJzdCwgdGhlbiB0byB0YXJnZXQgdW5pdFxuICBjb25zdCBpbk1ldGVycyA9IGZyb21Vbml0ID09PSBcInlhcmRzXCIgPyBudW1WYWx1ZSAqIDAuOTE0NCA6IG51bVZhbHVlO1xuICByZXR1cm4gdG9Vbml0ID09PSBcInlhcmRzXCIgPyBpbk1ldGVycyAvIDAuOTE0NCA6IGluTWV0ZXJzO1xufVxuXG4vKipcbiAqIENvbnZlcnQgYW4gYW5nbGUgdmFsdWUgYmV0d2VlbiB1bml0cy5cbiAqIFxuICogQHBhcmFtIHZhbHVlIC0gVGhlIHZhbHVlIHRvIGNvbnZlcnRcbiAqIEBwYXJhbSBmcm9tVW5pdCAtIFNvdXJjZSB1bml0IChcImRlZ3JlZXNcIiBvciBcInJhZGlhbnNcIilcbiAqIEBwYXJhbSB0b1VuaXQgLSBUYXJnZXQgdW5pdCAoXCJkZWdyZWVzXCIgb3IgXCJyYWRpYW5zXCIpXG4gKiBAcmV0dXJucyBDb252ZXJ0ZWQgdmFsdWUsIG9yIG9yaWdpbmFsIGlmIHVuaXRzIG1hdGNoXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb252ZXJ0QW5nbGUoXG4gIHZhbHVlOiBudW1iZXIgfCBzdHJpbmcgfCBudWxsLFxuICBmcm9tVW5pdDogXCJkZWdyZWVzXCIgfCBcInJhZGlhbnNcIixcbiAgdG9Vbml0OiBcImRlZ3JlZXNcIiB8IFwicmFkaWFuc1wiXG4pOiBudW1iZXIgfCBzdHJpbmcgfCBudWxsIHtcbiAgaWYgKHZhbHVlID09PSBudWxsIHx8IHZhbHVlID09PSBcIlwiKSByZXR1cm4gdmFsdWU7XG5cbiAgY29uc3QgbnVtVmFsdWUgPSB0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCIgPyBwYXJzZUZsb2F0KHZhbHVlKSA6IHZhbHVlO1xuICBpZiAoaXNOYU4obnVtVmFsdWUpKSByZXR1cm4gdmFsdWU7XG5cbiAgaWYgKGZyb21Vbml0ID09PSB0b1VuaXQpIHJldHVybiBudW1WYWx1ZTtcblxuICAvLyBDb252ZXJ0IHRvIGRlZ3JlZXMgZmlyc3QsIHRoZW4gdG8gdGFyZ2V0IHVuaXRcbiAgY29uc3QgaW5EZWdyZWVzID0gZnJvbVVuaXQgPT09IFwiZGVncmVlc1wiID8gbnVtVmFsdWUgOiAobnVtVmFsdWUgKiAxODAgLyBNYXRoLlBJKTtcbiAgcmV0dXJuIHRvVW5pdCA9PT0gXCJkZWdyZWVzXCIgPyBpbkRlZ3JlZXMgOiAoaW5EZWdyZWVzICogTWF0aC5QSSAvIDE4MCk7XG59XG5cbi8qKlxuICogQ29udmVydCBhIHNwZWVkIHZhbHVlIGJldHdlZW4gdW5pdHMuXG4gKlxuICogQHBhcmFtIHZhbHVlIC0gVGhlIHZhbHVlIHRvIGNvbnZlcnRcbiAqIEBwYXJhbSBmcm9tVW5pdCAtIFNvdXJjZSB1bml0IChcIm1waFwiLCBcImttL2hcIiwgb3IgXCJtL3NcIilcbiAqIEBwYXJhbSB0b1VuaXQgLSBUYXJnZXQgdW5pdCAoXCJtcGhcIiwgXCJrbS9oXCIsIG9yIFwibS9zXCIpXG4gKiBAcmV0dXJucyBDb252ZXJ0ZWQgdmFsdWUsIG9yIG9yaWdpbmFsIGlmIHVuaXRzIG1hdGNoXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb252ZXJ0U3BlZWQoXG4gIHZhbHVlOiBudW1iZXIgfCBzdHJpbmcgfCBudWxsLFxuICBmcm9tVW5pdDogXCJtcGhcIiB8IFwia20vaFwiIHwgXCJtL3NcIixcbiAgdG9Vbml0OiBcIm1waFwiIHwgXCJrbS9oXCIgfCBcIm0vc1wiXG4pOiBudW1iZXIgfCBzdHJpbmcgfCBudWxsIHtcbiAgaWYgKHZhbHVlID09PSBudWxsIHx8IHZhbHVlID09PSBcIlwiKSByZXR1cm4gdmFsdWU7XG5cbiAgY29uc3QgbnVtVmFsdWUgPSB0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCIgPyBwYXJzZUZsb2F0KHZhbHVlKSA6IHZhbHVlO1xuICBpZiAoaXNOYU4obnVtVmFsdWUpKSByZXR1cm4gdmFsdWU7XG5cbiAgaWYgKGZyb21Vbml0ID09PSB0b1VuaXQpIHJldHVybiBudW1WYWx1ZTtcblxuICAvLyBDb252ZXJ0IHRvIG1waCBmaXJzdCwgdGhlbiB0byB0YXJnZXQgdW5pdFxuICBsZXQgaW5NcGg6IG51bWJlcjtcbiAgaWYgKGZyb21Vbml0ID09PSBcIm1waFwiKSBpbk1waCA9IG51bVZhbHVlO1xuICBlbHNlIGlmIChmcm9tVW5pdCA9PT0gXCJrbS9oXCIpIGluTXBoID0gbnVtVmFsdWUgLyAxLjYwOTM0NDtcbiAgZWxzZSBpbk1waCA9IG51bVZhbHVlICogMi4yMzY5NDsgLy8gbS9zIHRvIG1waFxuXG4gIGlmICh0b1VuaXQgPT09IFwibXBoXCIpIHJldHVybiBpbk1waDtcbiAgaWYgKHRvVW5pdCA9PT0gXCJrbS9oXCIpIHJldHVybiBpbk1waCAqIDEuNjA5MzQ0O1xuICByZXR1cm4gaW5NcGggLyAyLjIzNjk0OyAvLyBtcGggdG8gbS9zXG59XG5cbi8qKlxuICogR2V0IHRoZSBzbWFsbCBkaXN0YW5jZSB1bml0IGJhc2VkIG9uIHRoZSB1c2VyJ3MgZGlzdGFuY2UgY2hvaWNlLlxuICogWWFyZHMgdXNlcnMgc2VlIGluY2hlczsgbWV0ZXJzIHVzZXJzIHNlZSBjbS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFNtYWxsRGlzdGFuY2VVbml0KHVuaXRDaG9pY2U6IFVuaXRDaG9pY2UgPSBERUZBVUxUX1VOSVRfQ0hPSUNFKTogU21hbGxEaXN0YW5jZVVuaXQge1xuICByZXR1cm4gdW5pdENob2ljZS5kaXN0YW5jZSA9PT0gXCJ5YXJkc1wiID8gXCJpbmNoZXNcIiA6IFwiY21cIjtcbn1cblxuLyoqXG4gKiBDb252ZXJ0IGEgZGlzdGFuY2UgdmFsdWUgZnJvbSBtZXRlcnMgdG8gYSBzbWFsbCBkaXN0YW5jZSB1bml0IChpbmNoZXMgb3IgY20pLlxuICovXG5leHBvcnQgZnVuY3Rpb24gY29udmVydFNtYWxsRGlzdGFuY2UoXG4gIHZhbHVlOiBudW1iZXIgfCBzdHJpbmcgfCBudWxsLFxuICB0b1NtYWxsVW5pdDogU21hbGxEaXN0YW5jZVVuaXRcbik6IG51bWJlciB8IHN0cmluZyB8IG51bGwge1xuICBpZiAodmFsdWUgPT09IG51bGwgfHwgdmFsdWUgPT09IFwiXCIpIHJldHVybiB2YWx1ZTtcblxuICBjb25zdCBudW1WYWx1ZSA9IHR5cGVvZiB2YWx1ZSA9PT0gXCJzdHJpbmdcIiA/IHBhcnNlRmxvYXQodmFsdWUpIDogdmFsdWU7XG4gIGlmIChpc05hTihudW1WYWx1ZSkpIHJldHVybiB2YWx1ZTtcblxuICByZXR1cm4gdG9TbWFsbFVuaXQgPT09IFwiaW5jaGVzXCIgPyBudW1WYWx1ZSAqIDM5LjM3MDEgOiBudW1WYWx1ZSAqIDEwMDtcbn1cblxuLyoqXG4gKiBDb252ZXJ0IGEgZGlzdGFuY2UgdmFsdWUgZnJvbSBtZXRlcnMgdG8gbWlsbGltZXRlcnMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb252ZXJ0TWlsbGltZXRlcnMoXG4gIHZhbHVlOiBudW1iZXIgfCBzdHJpbmcgfCBudWxsXG4pOiBudW1iZXIgfCBzdHJpbmcgfCBudWxsIHtcbiAgaWYgKHZhbHVlID09PSBudWxsIHx8IHZhbHVlID09PSBcIlwiKSByZXR1cm4gdmFsdWU7XG5cbiAgY29uc3QgbnVtVmFsdWUgPSB0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCIgPyBwYXJzZUZsb2F0KHZhbHVlKSA6IHZhbHVlO1xuICBpZiAoaXNOYU4obnVtVmFsdWUpKSByZXR1cm4gdmFsdWU7XG5cbiAgcmV0dXJuIG51bVZhbHVlICogMTAwMDtcbn1cblxuLyoqXG4gKiBOb3JtYWxpemUgYSBtZXRyaWMgdmFsdWUgYmFzZWQgb24gdW5pdCBzeXN0ZW0gYWxpZ25tZW50IGFuZCB1c2VyJ3MgdW5pdCBjaG9pY2UuXG4gKlxuICogQ29udmVydHMgdmFsdWVzIGZyb20gdGhlIHNvdXJjZSB1bml0cyB0byB0YXJnZXQgb3V0cHV0IHVuaXRzOlxuICogLSBEaXN0YW5jZTogeWFyZHMgb3IgbWV0ZXJzIChwZXIgdW5pdENob2ljZS5kaXN0YW5jZSlcbiAqIC0gQW5nbGVzOiBhbHdheXMgZGVncmVlc1xuICogLSBTcGVlZDogbXBoIG9yIG0vcyAocGVyIHVuaXRDaG9pY2Uuc3BlZWQpXG4gKlxuICogQHBhcmFtIHZhbHVlIC0gVGhlIHJhdyBtZXRyaWMgdmFsdWVcbiAqIEBwYXJhbSBtZXRyaWNOYW1lIC0gVGhlIG5hbWUgb2YgdGhlIG1ldHJpYyBiZWluZyBub3JtYWxpemVkXG4gKiBAcGFyYW0gcmVwb3J0VW5pdFN5c3RlbSAtIFRoZSB1bml0IHN5c3RlbSB1c2VkIGluIHRoZSBzb3VyY2UgZGF0YVxuICogQHBhcmFtIHVuaXRDaG9pY2UgLSBVc2VyJ3MgdW5pdCBjaG9pY2UgKGRlZmF1bHRzIHRvIG1waCArIHlhcmRzKVxuICogQHJldHVybnMgTm9ybWFsaXplZCB2YWx1ZSBhcyBudW1iZXIgb3Igc3RyaW5nIChudWxsIGlmIGludmFsaWQpXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBub3JtYWxpemVNZXRyaWNWYWx1ZShcbiAgdmFsdWU6IE1ldHJpY1ZhbHVlLFxuICBtZXRyaWNOYW1lOiBzdHJpbmcsXG4gIHJlcG9ydFVuaXRTeXN0ZW06IFVuaXRTeXN0ZW0sXG4gIHVuaXRDaG9pY2U6IFVuaXRDaG9pY2UgPSBERUZBVUxUX1VOSVRfQ0hPSUNFXG4pOiBNZXRyaWNWYWx1ZSB7XG4gIGNvbnN0IG51bVZhbHVlID0gcGFyc2VOdW1lcmljVmFsdWUodmFsdWUpO1xuICBpZiAobnVtVmFsdWUgPT09IG51bGwpIHJldHVybiB2YWx1ZTtcblxuICBsZXQgY29udmVydGVkOiBudW1iZXI7XG5cbiAgaWYgKE1JTExJTUVURVJfTUVUUklDUy5oYXMobWV0cmljTmFtZSkpIHtcbiAgICBjb252ZXJ0ZWQgPSBjb252ZXJ0TWlsbGltZXRlcnMobnVtVmFsdWUpIGFzIG51bWJlcjtcbiAgfSBlbHNlIGlmIChTTUFMTF9ESVNUQU5DRV9NRVRSSUNTLmhhcyhtZXRyaWNOYW1lKSkge1xuICAgIGNvbnZlcnRlZCA9IGNvbnZlcnRTbWFsbERpc3RhbmNlKFxuICAgICAgbnVtVmFsdWUsXG4gICAgICBnZXRTbWFsbERpc3RhbmNlVW5pdCh1bml0Q2hvaWNlKVxuICAgICkgYXMgbnVtYmVyO1xuICB9IGVsc2UgaWYgKERJU1RBTkNFX01FVFJJQ1MuaGFzKG1ldHJpY05hbWUpKSB7XG4gICAgY29udmVydGVkID0gY29udmVydERpc3RhbmNlKFxuICAgICAgbnVtVmFsdWUsXG4gICAgICByZXBvcnRVbml0U3lzdGVtLmRpc3RhbmNlVW5pdCxcbiAgICAgIHVuaXRDaG9pY2UuZGlzdGFuY2VcbiAgICApIGFzIG51bWJlcjtcbiAgfSBlbHNlIGlmIChBTkdMRV9NRVRSSUNTLmhhcyhtZXRyaWNOYW1lKSkge1xuICAgIGNvbnZlcnRlZCA9IGNvbnZlcnRBbmdsZShcbiAgICAgIG51bVZhbHVlLFxuICAgICAgcmVwb3J0VW5pdFN5c3RlbS5hbmdsZVVuaXQsXG4gICAgICBcImRlZ3JlZXNcIlxuICAgICkgYXMgbnVtYmVyO1xuICB9IGVsc2UgaWYgKFNQRUVEX01FVFJJQ1MuaGFzKG1ldHJpY05hbWUpKSB7XG4gICAgY29udmVydGVkID0gY29udmVydFNwZWVkKFxuICAgICAgbnVtVmFsdWUsXG4gICAgICByZXBvcnRVbml0U3lzdGVtLnNwZWVkVW5pdCxcbiAgICAgIHVuaXRDaG9pY2Uuc3BlZWRcbiAgICApIGFzIG51bWJlcjtcbiAgfSBlbHNlIHtcbiAgICBjb252ZXJ0ZWQgPSBudW1WYWx1ZTtcbiAgfVxuXG4gIC8vIFNwaW5SYXRlOiByb3VuZCB0byB3aG9sZSBudW1iZXJzXG4gIGlmIChtZXRyaWNOYW1lID09PSBcIlNwaW5SYXRlXCIpIHJldHVybiBNYXRoLnJvdW5kKGNvbnZlcnRlZCk7XG5cbiAgLy8gSW1wYWN0IGxvY2F0aW9uIG1ldHJpY3MgYXJlIGRpc3BsYXllZCBhcyB3aG9sZSBtaWxsaW1ldGVycy5cbiAgaWYgKE1JTExJTUVURVJfTUVUUklDUy5oYXMobWV0cmljTmFtZSkpIHJldHVybiBNYXRoLnJvdW5kKGNvbnZlcnRlZCk7XG5cbiAgLy8gU21hc2hGYWN0b3IgLyBUZW1wbzogcm91bmQgdG8gMiBkZWNpbWFsIHBsYWNlc1xuICBpZiAobWV0cmljTmFtZSA9PT0gXCJTbWFzaEZhY3RvclwiIHx8IG1ldHJpY05hbWUgPT09IFwiVGVtcG9cIilcbiAgICByZXR1cm4gTWF0aC5yb3VuZChjb252ZXJ0ZWQgKiAxMDApIC8gMTAwO1xuXG4gIC8vIFJvdW5kIHRvIDEgZGVjaW1hbCBwbGFjZSBmb3IgY29uc2lzdGVuY3lcbiAgcmV0dXJuIE1hdGgucm91bmQoY29udmVydGVkICogMTApIC8gMTA7XG59XG5cbi8qKlxuICogUGFyc2UgYSBudW1lcmljIHZhbHVlIGZyb20gTWV0cmljVmFsdWUgdHlwZS5cbiAqL1xuZnVuY3Rpb24gcGFyc2VOdW1lcmljVmFsdWUodmFsdWU6IE1ldHJpY1ZhbHVlKTogbnVtYmVyIHwgbnVsbCB7XG4gIGlmICh2YWx1ZSA9PT0gbnVsbCB8fCB2YWx1ZSA9PT0gXCJcIikgcmV0dXJuIG51bGw7XG4gIGlmICh0eXBlb2YgdmFsdWUgPT09IFwibnVtYmVyXCIpIHJldHVybiBpc05hTih2YWx1ZSkgPyBudWxsIDogdmFsdWU7XG4gIFxuICBjb25zdCBwYXJzZWQgPSBwYXJzZUZsb2F0KHZhbHVlKTtcbiAgcmV0dXJuIGlzTmFOKHBhcnNlZCkgPyBudWxsIDogcGFyc2VkO1xufVxuXG5leHBvcnQgdHlwZSBNZXRyaWNWYWx1ZSA9IHN0cmluZyB8IG51bWJlciB8IG51bGw7XG4iLCAiLyoqXG4gKiBDU1Ygd3JpdGVyIGZvciBUcmFja1B1bGwgc2Vzc2lvbiBkYXRhLlxuICogSW1wbGVtZW50cyBjb3JlIGNvbHVtbnM6IERhdGUsIENsdWIsIFNob3QgIywgVHlwZVxuICovXG5cbmltcG9ydCB0eXBlIHsgU2Vzc2lvbkRhdGEsIENsdWJHcm91cCwgU2hvdCB9IGZyb20gXCIuLi9tb2RlbHMvdHlwZXNcIjtcbmltcG9ydCB7XG4gIGdldEFwaVNvdXJjZVVuaXRTeXN0ZW0sXG4gIGdldE1ldHJpY1VuaXRMYWJlbCxcbiAgbm9ybWFsaXplTWV0cmljVmFsdWUsXG4gIERFRkFVTFRfVU5JVF9DSE9JQ0UsXG4gIHR5cGUgVW5pdENob2ljZSxcbn0gZnJvbSBcIi4vdW5pdF9ub3JtYWxpemF0aW9uXCI7XG5pbXBvcnQgeyBNRVRSSUNfRElTUExBWV9OQU1FUyB9IGZyb20gXCIuL2NvbnN0YW50c1wiO1xuXG5jb25zdCBNRVRSSUNfQ09MVU1OX09SREVSOiBzdHJpbmdbXSA9IFtcbiAgLy8gU3BlZWQgJiBFZmZpY2llbmN5XG4gIFwiQ2x1YlNwZWVkXCIsIFwiQmFsbFNwZWVkXCIsIFwiU21hc2hGYWN0b3JcIixcbiAgLy8gQ2x1YiBEZWxpdmVyeVxuICBcIkF0dGFja0FuZ2xlXCIsIFwiQ2x1YlBhdGhcIiwgXCJGYWNlQW5nbGVcIiwgXCJGYWNlVG9QYXRoXCIsIFwiU3dpbmdEaXJlY3Rpb25cIiwgXCJEeW5hbWljTG9mdFwiLFxuICAvLyBMYXVuY2ggJiBTcGluXG4gIFwiTGF1bmNoQW5nbGVcIiwgXCJMYXVuY2hEaXJlY3Rpb25cIiwgXCJTcGluUmF0ZVwiLCBcIlNwaW5BeGlzXCIsIFwiU3BpbkxvZnRcIixcbiAgLy8gRGlzdGFuY2VcbiAgXCJDYXJyeVwiLCBcIlRvdGFsXCIsXG4gIC8vIERpc3BlcnNpb25cbiAgXCJTaWRlXCIsIFwiU2lkZVRvdGFsXCIsIFwiQ2FycnlTaWRlXCIsIFwiVG90YWxTaWRlXCIsIFwiQ3VydmVcIixcbiAgLy8gQmFsbCBGbGlnaHRcbiAgXCJIZWlnaHRcIiwgXCJNYXhIZWlnaHRcIiwgXCJMYW5kaW5nQW5nbGVcIiwgXCJIYW5nVGltZVwiLFxuICAvLyBJbXBhY3RcbiAgXCJMb3dQb2ludERpc3RhbmNlXCIsIFwiSW1wYWN0SGVpZ2h0XCIsIFwiSW1wYWN0T2Zmc2V0XCIsXG4gIC8vIE90aGVyXG4gIFwiVGVtcG9cIixcbl07XG5cbmZ1bmN0aW9uIGdldERpc3BsYXlOYW1lKG1ldHJpYzogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIE1FVFJJQ19ESVNQTEFZX05BTUVTW21ldHJpY10gPz8gbWV0cmljO1xufVxuXG5mdW5jdGlvbiBnZXRDb2x1bW5OYW1lKG1ldHJpYzogc3RyaW5nLCB1bml0Q2hvaWNlOiBVbml0Q2hvaWNlKTogc3RyaW5nIHtcbiAgY29uc3QgZGlzcGxheU5hbWUgPSBnZXREaXNwbGF5TmFtZShtZXRyaWMpO1xuICBjb25zdCB1bml0TGFiZWwgPSBnZXRNZXRyaWNVbml0TGFiZWwobWV0cmljLCB1bml0Q2hvaWNlKTtcbiAgcmV0dXJuIHVuaXRMYWJlbCA/IGAke2Rpc3BsYXlOYW1lfSAoJHt1bml0TGFiZWx9KWAgOiBkaXNwbGF5TmFtZTtcbn1cblxuZnVuY3Rpb24gZ2VuZXJhdGVGaWxlbmFtZShzZXNzaW9uOiBTZXNzaW9uRGF0YSk6IHN0cmluZyB7XG4gIHJldHVybiBgU2hvdERhdGFfJHtzZXNzaW9uLmRhdGV9LmNzdmA7XG59XG5cbmZ1bmN0aW9uIG9yZGVyTWV0cmljc0J5UHJpb3JpdHkoXG4gIGFsbE1ldHJpY3M6IHN0cmluZ1tdLFxuICBwcmlvcml0eU9yZGVyOiBzdHJpbmdbXVxuKTogc3RyaW5nW10ge1xuICBjb25zdCByZXN1bHQ6IHN0cmluZ1tdID0gW107XG4gIGNvbnN0IHNlZW4gPSBuZXcgU2V0PHN0cmluZz4oKTtcblxuICBmb3IgKGNvbnN0IG1ldHJpYyBvZiBwcmlvcml0eU9yZGVyKSB7XG4gICAgaWYgKGFsbE1ldHJpY3MuaW5jbHVkZXMobWV0cmljKSAmJiAhc2Vlbi5oYXMobWV0cmljKSkge1xuICAgICAgcmVzdWx0LnB1c2gobWV0cmljKTtcbiAgICAgIHNlZW4uYWRkKG1ldHJpYyk7XG4gICAgfVxuICB9XG5cbiAgZm9yIChjb25zdCBtZXRyaWMgb2YgYWxsTWV0cmljcykge1xuICAgIGlmICghc2Vlbi5oYXMobWV0cmljKSkge1xuICAgICAgcmVzdWx0LnB1c2gobWV0cmljKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiBoYXNUYWdzKHNlc3Npb246IFNlc3Npb25EYXRhKTogYm9vbGVhbiB7XG4gIHJldHVybiBzZXNzaW9uLmNsdWJfZ3JvdXBzLnNvbWUoKGNsdWIpID0+XG4gICAgY2x1Yi5zaG90cy5zb21lKChzaG90KSA9PiBzaG90LnRhZyAhPT0gdW5kZWZpbmVkICYmIHNob3QudGFnICE9PSBcIlwiKVxuICApO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gd3JpdGVDc3YoXG4gIHNlc3Npb246IFNlc3Npb25EYXRhLFxuICBpbmNsdWRlQXZlcmFnZXMgPSB0cnVlLFxuICBtZXRyaWNPcmRlcj86IHN0cmluZ1tdLFxuICB1bml0Q2hvaWNlOiBVbml0Q2hvaWNlID0gREVGQVVMVF9VTklUX0NIT0lDRSxcbiAgaGl0dGluZ1N1cmZhY2U/OiBcIkdyYXNzXCIgfCBcIk1hdFwiXG4pOiBzdHJpbmcge1xuICBjb25zdCBvcmRlcmVkTWV0cmljcyA9IG9yZGVyTWV0cmljc0J5UHJpb3JpdHkoXG4gICAgc2Vzc2lvbi5tZXRyaWNfbmFtZXMsXG4gICAgbWV0cmljT3JkZXIgPz8gTUVUUklDX0NPTFVNTl9PUkRFUlxuICApO1xuXG4gIGNvbnN0IGhlYWRlclJvdzogc3RyaW5nW10gPSBbXCJEYXRlXCIsIFwiQ2x1YlwiXTtcblxuICBpZiAoaGFzVGFncyhzZXNzaW9uKSkge1xuICAgIGhlYWRlclJvdy5wdXNoKFwiVGFnXCIpO1xuICB9XG5cbiAgaGVhZGVyUm93LnB1c2goXCJTaG90ICNcIiwgXCJUeXBlXCIpO1xuXG4gIGZvciAoY29uc3QgbWV0cmljIG9mIG9yZGVyZWRNZXRyaWNzKSB7XG4gICAgaGVhZGVyUm93LnB1c2goZ2V0Q29sdW1uTmFtZShtZXRyaWMsIHVuaXRDaG9pY2UpKTtcbiAgfVxuXG4gIGNvbnN0IHJvd3M6IFJlY29yZDxzdHJpbmcsIHN0cmluZz5bXSA9IFtdO1xuXG4gIC8vIFNvdXJjZSB1bml0IHN5c3RlbTogQVBJIGFsd2F5cyByZXR1cm5zIG0vcyArIG1ldGVycywgYW5nbGUgdW5pdCBmcm9tIHJlcG9ydFxuICBjb25zdCB1bml0U3lzdGVtID0gZ2V0QXBpU291cmNlVW5pdFN5c3RlbShzZXNzaW9uLm1ldGFkYXRhX3BhcmFtcyk7XG5cbiAgZm9yIChjb25zdCBjbHViIG9mIHNlc3Npb24uY2x1Yl9ncm91cHMpIHtcbiAgICBmb3IgKGNvbnN0IHNob3Qgb2YgY2x1Yi5zaG90cykge1xuICAgICAgY29uc3Qgcm93OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xuICAgICAgICBEYXRlOiBzZXNzaW9uLmRhdGUsXG4gICAgICAgIENsdWI6IGNsdWIuY2x1Yl9uYW1lLFxuICAgICAgICBcIlNob3QgI1wiOiBTdHJpbmcoc2hvdC5zaG90X251bWJlciArIDEpLFxuICAgICAgICBUeXBlOiBcIlNob3RcIixcbiAgICAgIH07XG5cbiAgICAgIGlmIChoYXNUYWdzKHNlc3Npb24pKSB7XG4gICAgICAgIHJvdy5UYWcgPSBzaG90LnRhZyA/PyBcIlwiO1xuICAgICAgfVxuXG4gICAgICBmb3IgKGNvbnN0IG1ldHJpYyBvZiBvcmRlcmVkTWV0cmljcykge1xuICAgICAgICBjb25zdCBjb2xOYW1lID0gZ2V0Q29sdW1uTmFtZShtZXRyaWMsIHVuaXRDaG9pY2UpO1xuICAgICAgICBjb25zdCByYXdWYWx1ZSA9IHNob3QubWV0cmljc1ttZXRyaWNdID8/IFwiXCI7XG5cbiAgICAgICAgaWYgKHR5cGVvZiByYXdWYWx1ZSA9PT0gXCJzdHJpbmdcIiB8fCB0eXBlb2YgcmF3VmFsdWUgPT09IFwibnVtYmVyXCIpIHtcbiAgICAgICAgICByb3dbY29sTmFtZV0gPSBTdHJpbmcobm9ybWFsaXplTWV0cmljVmFsdWUocmF3VmFsdWUsIG1ldHJpYywgdW5pdFN5c3RlbSwgdW5pdENob2ljZSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJvd1tjb2xOYW1lXSA9IFwiXCI7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcm93cy5wdXNoKHJvdyk7XG4gICAgfVxuXG4gICAgaWYgKGluY2x1ZGVBdmVyYWdlcykge1xuICAgICAgLy8gR3JvdXAgc2hvdHMgYnkgdGFnXG4gICAgICBjb25zdCB0YWdHcm91cHMgPSBuZXcgTWFwPHN0cmluZywgU2hvdFtdPigpO1xuICAgICAgZm9yIChjb25zdCBzaG90IG9mIGNsdWIuc2hvdHMpIHtcbiAgICAgICAgY29uc3QgdGFnID0gc2hvdC50YWcgPz8gXCJcIjtcbiAgICAgICAgaWYgKCF0YWdHcm91cHMuaGFzKHRhZykpIHRhZ0dyb3Vwcy5zZXQodGFnLCBbXSk7XG4gICAgICAgIHRhZ0dyb3Vwcy5nZXQodGFnKSEucHVzaChzaG90KTtcbiAgICAgIH1cblxuICAgICAgZm9yIChjb25zdCBbdGFnLCBzaG90c10gb2YgdGFnR3JvdXBzKSB7XG4gICAgICAgIC8vIE9ubHkgd3JpdGUgYXZlcmFnZSByb3cgaWYgZ3JvdXAgaGFzIDIrIHNob3RzXG4gICAgICAgIGlmIChzaG90cy5sZW5ndGggPCAyKSBjb250aW51ZTtcblxuICAgICAgICBjb25zdCBhdmdSb3c6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XG4gICAgICAgICAgRGF0ZTogc2Vzc2lvbi5kYXRlLFxuICAgICAgICAgIENsdWI6IGNsdWIuY2x1Yl9uYW1lLFxuICAgICAgICAgIFwiU2hvdCAjXCI6IFwiXCIsXG4gICAgICAgICAgVHlwZTogXCJBdmVyYWdlXCIsXG4gICAgICAgIH07XG5cbiAgICAgICAgaWYgKGhhc1RhZ3Moc2Vzc2lvbikpIHtcbiAgICAgICAgICBhdmdSb3cuVGFnID0gdGFnO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChjb25zdCBtZXRyaWMgb2Ygb3JkZXJlZE1ldHJpY3MpIHtcbiAgICAgICAgICBjb25zdCBjb2xOYW1lID0gZ2V0Q29sdW1uTmFtZShtZXRyaWMsIHVuaXRDaG9pY2UpO1xuICAgICAgICAgIGNvbnN0IHZhbHVlcyA9IHNob3RzXG4gICAgICAgICAgICAubWFwKChzKSA9PiBzLm1ldHJpY3NbbWV0cmljXSlcbiAgICAgICAgICAgIC5maWx0ZXIoKHYpID0+IHYgIT09IHVuZGVmaW5lZCAmJiB2ICE9PSBcIlwiKVxuICAgICAgICAgICAgLm1hcCgodikgPT4gcGFyc2VGbG9hdChTdHJpbmcodikpKTtcbiAgICAgICAgICBjb25zdCBudW1lcmljVmFsdWVzID0gdmFsdWVzLmZpbHRlcigodikgPT4gIWlzTmFOKHYpKTtcblxuICAgICAgICAgIGlmIChudW1lcmljVmFsdWVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGF2ZyA9IG51bWVyaWNWYWx1ZXMucmVkdWNlKChhLCBiKSA9PiBhICsgYiwgMCkgLyBudW1lcmljVmFsdWVzLmxlbmd0aDtcbiAgICAgICAgICAgIGNvbnN0IHJvdW5kZWQgPSAobWV0cmljID09PSBcIlNtYXNoRmFjdG9yXCIgfHwgbWV0cmljID09PSBcIlRlbXBvXCIpXG4gICAgICAgICAgICAgID8gTWF0aC5yb3VuZChhdmcgKiAxMDApIC8gMTAwXG4gICAgICAgICAgICAgIDogTWF0aC5yb3VuZChhdmcgKiAxMCkgLyAxMDtcbiAgICAgICAgICAgIGF2Z1Jvd1tjb2xOYW1lXSA9IFN0cmluZyhub3JtYWxpemVNZXRyaWNWYWx1ZShyb3VuZGVkLCBtZXRyaWMsIHVuaXRTeXN0ZW0sIHVuaXRDaG9pY2UpKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYXZnUm93W2NvbE5hbWVdID0gXCJcIjtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByb3dzLnB1c2goYXZnUm93KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBjb25zdCBsaW5lczogc3RyaW5nW10gPSBbXTtcblxuICBpZiAoaGl0dGluZ1N1cmZhY2UgIT09IHVuZGVmaW5lZCkge1xuICAgIGxpbmVzLnB1c2goYEhpdHRpbmcgU3VyZmFjZTogJHtoaXR0aW5nU3VyZmFjZX1gKTtcbiAgfVxuXG4gIGxpbmVzLnB1c2goaGVhZGVyUm93LmpvaW4oXCIsXCIpKTtcbiAgZm9yIChjb25zdCByb3cgb2Ygcm93cykge1xuICAgIGxpbmVzLnB1c2goXG4gICAgICBoZWFkZXJSb3dcbiAgICAgICAgLm1hcCgoY29sKSA9PiB7XG4gICAgICAgICAgY29uc3QgdmFsdWUgPSByb3dbY29sXSA/PyBcIlwiO1xuICAgICAgICAgIGlmICh2YWx1ZS5pbmNsdWRlcyhcIixcIikgfHwgdmFsdWUuaW5jbHVkZXMoJ1wiJykgfHwgdmFsdWUuaW5jbHVkZXMoXCJcXG5cIikpIHtcbiAgICAgICAgICAgIHJldHVybiBgXCIke3ZhbHVlLnJlcGxhY2UoL1wiL2csICdcIlwiJyl9XCJgO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgIH0pXG4gICAgICAgIC5qb2luKFwiLFwiKVxuICAgICk7XG4gIH1cblxuICByZXR1cm4gbGluZXMuam9pbihcIlxcblwiKTtcbn1cbiIsICIvKipcbiAqIFNlc3Npb24gaGlzdG9yeSBzdG9yYWdlIG1vZHVsZS5cbiAqIFNhdmVzLCBkZWR1cGxpY2F0ZXMgKGJ5IHJlcG9ydF9pZCksIGFuZCBldmljdHMgc2Vzc2lvbnMgZnJvbSBjaHJvbWUuc3RvcmFnZS5sb2NhbC5cbiAqL1xuXG5pbXBvcnQgdHlwZSB7IFNlc3Npb25EYXRhLCBTZXNzaW9uU25hcHNob3QsIEhpc3RvcnlFbnRyeSB9IGZyb20gXCIuLi9tb2RlbHMvdHlwZXNcIjtcbmltcG9ydCB7IFNUT1JBR0VfS0VZUyB9IGZyb20gXCIuL2NvbnN0YW50c1wiO1xuXG5jb25zdCBNQVhfU0VTU0lPTlMgPSAyMDtcblxuLyoqIFN0cmlwIHJhd19hcGlfZGF0YSBmcm9tIGEgU2Vzc2lvbkRhdGEgdG8gY3JlYXRlIGEgbGlnaHR3ZWlnaHQgc25hcHNob3QuICovXG5mdW5jdGlvbiBjcmVhdGVTbmFwc2hvdChzZXNzaW9uOiBTZXNzaW9uRGF0YSk6IFNlc3Npb25TbmFwc2hvdCB7XG4gIC8vIERlc3RydWN0dXJlIHRvIGV4Y2x1ZGUgcmF3X2FwaV9kYXRhXG4gIGNvbnN0IHsgcmF3X2FwaV9kYXRhOiBfLCAuLi5zbmFwc2hvdCB9ID0gc2Vzc2lvbjtcbiAgcmV0dXJuIHNuYXBzaG90O1xufVxuXG4vKipcbiAqIFNhdmUgYSBzZXNzaW9uIHRvIHRoZSByb2xsaW5nIGhpc3RvcnkgaW4gY2hyb21lLnN0b3JhZ2UubG9jYWwuXG4gKiAtIERlZHVwbGljYXRlcyBieSByZXBvcnRfaWQgKHJlcGxhY2VzIGV4aXN0aW5nIGVudHJ5LCByZWZyZXNoZXMgY2FwdHVyZWRfYXQpLlxuICogLSBFdmljdHMgb2xkZXN0IGVudHJ5IHdoZW4gdGhlIDIwLXNlc3Npb24gY2FwIGlzIHJlYWNoZWQuXG4gKiAtIFN0b3JlcyBlbnRyaWVzIHNvcnRlZCBuZXdlc3QtZmlyc3QgKGRlc2NlbmRpbmcgY2FwdHVyZWRfYXQpLlxuICovXG5leHBvcnQgZnVuY3Rpb24gc2F2ZVNlc3Npb25Ub0hpc3Rvcnkoc2Vzc2lvbjogU2Vzc2lvbkRhdGEpOiBQcm9taXNlPHZvaWQ+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBjaHJvbWUuc3RvcmFnZS5sb2NhbC5nZXQoXG4gICAgICBbU1RPUkFHRV9LRVlTLlNFU1NJT05fSElTVE9SWV0sXG4gICAgICAocmVzdWx0OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPikgPT4ge1xuICAgICAgICBpZiAoY2hyb21lLnJ1bnRpbWUubGFzdEVycm9yKSB7XG4gICAgICAgICAgcmV0dXJuIHJlamVjdChuZXcgRXJyb3IoY2hyb21lLnJ1bnRpbWUubGFzdEVycm9yLm1lc3NhZ2UpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGV4aXN0aW5nID0gKHJlc3VsdFtTVE9SQUdFX0tFWVMuU0VTU0lPTl9ISVNUT1JZXSBhcyBIaXN0b3J5RW50cnlbXSB8IHVuZGVmaW5lZCkgPz8gW107XG5cbiAgICAgICAgLy8gUmVtb3ZlIGFueSBleGlzdGluZyBlbnRyeSB3aXRoIHRoZSBzYW1lIHJlcG9ydF9pZCAoZGVkdXApXG4gICAgICAgIGNvbnN0IGZpbHRlcmVkID0gZXhpc3RpbmcuZmlsdGVyKFxuICAgICAgICAgIChlbnRyeSkgPT4gZW50cnkuc25hcHNob3QucmVwb3J0X2lkICE9PSBzZXNzaW9uLnJlcG9ydF9pZFxuICAgICAgICApO1xuXG4gICAgICAgIC8vIENyZWF0ZSBuZXcgZW50cnlcbiAgICAgICAgY29uc3QgbmV3RW50cnk6IEhpc3RvcnlFbnRyeSA9IHtcbiAgICAgICAgICBjYXB0dXJlZF9hdDogRGF0ZS5ub3coKSxcbiAgICAgICAgICBzbmFwc2hvdDogY3JlYXRlU25hcHNob3Qoc2Vzc2lvbiksXG4gICAgICAgIH07XG5cbiAgICAgICAgZmlsdGVyZWQucHVzaChuZXdFbnRyeSk7XG5cbiAgICAgICAgLy8gU29ydCBuZXdlc3QtZmlyc3QgKGRlc2NlbmRpbmcgY2FwdHVyZWRfYXQpXG4gICAgICAgIGZpbHRlcmVkLnNvcnQoKGEsIGIpID0+IGIuY2FwdHVyZWRfYXQgLSBhLmNhcHR1cmVkX2F0KTtcblxuICAgICAgICAvLyBFbmZvcmNlIGNhcCBcdTIwMTQgc2xpY2Uga2VlcHMgdGhlIG5ld2VzdCBNQVhfU0VTU0lPTlMgZW50cmllc1xuICAgICAgICBjb25zdCBjYXBwZWQgPSBmaWx0ZXJlZC5zbGljZSgwLCBNQVhfU0VTU0lPTlMpO1xuXG4gICAgICAgIGNocm9tZS5zdG9yYWdlLmxvY2FsLnNldChcbiAgICAgICAgICB7IFtTVE9SQUdFX0tFWVMuU0VTU0lPTl9ISVNUT1JZXTogY2FwcGVkIH0sXG4gICAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgaWYgKGNocm9tZS5ydW50aW1lLmxhc3RFcnJvcikge1xuICAgICAgICAgICAgICByZXR1cm4gcmVqZWN0KG5ldyBFcnJvcihjaHJvbWUucnVudGltZS5sYXN0RXJyb3IubWVzc2FnZSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICApO1xuICB9KTtcbn1cblxuLyoqXG4gKiBNYXAgc3RvcmFnZSBlcnJvciBzdHJpbmdzIHRvIHVzZXItZnJpZW5kbHkgbWVzc2FnZXMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRIaXN0b3J5RXJyb3JNZXNzYWdlKGVycm9yOiBzdHJpbmcpOiBzdHJpbmcge1xuICBpZiAoL1FVT1RBX0JZVEVTfHF1b3RhL2kudGVzdChlcnJvcikpIHtcbiAgICByZXR1cm4gXCJTdG9yYWdlIGZ1bGwgLS0gb2xkZXN0IHNlc3Npb25zIHdpbGwgYmUgY2xlYXJlZFwiO1xuICB9XG4gIHJldHVybiBcIkNvdWxkIG5vdCBzYXZlIHRvIHNlc3Npb24gaGlzdG9yeVwiO1xufVxuIiwgIi8qKlxuICogUG9ydGFsIHBlcm1pc3Npb24gaGVscGVycyBmb3IgVHJhY2ttYW4gQVBJIGFjY2Vzcy5cbiAqIFNoYXJlZCBieSBwb3B1cCAocmVxdWVzdCArIGNoZWNrKSBhbmQgc2VydmljZSB3b3JrZXIgKGNoZWNrIG9ubHkpLlxuICovXG5cbmV4cG9ydCBjb25zdCBQT1JUQUxfT1JJR0lOUzogcmVhZG9ubHkgc3RyaW5nW10gPSBbXG4gIFwiaHR0cHM6Ly9hcGkudHJhY2ttYW5nb2xmLmNvbS8qXCIsXG4gIFwiaHR0cHM6Ly9wb3J0YWwudHJhY2ttYW5nb2xmLmNvbS8qXCIsXG5dIGFzIGNvbnN0O1xuXG4vKiogUmV0dXJucyB0cnVlIGlmIHBvcnRhbCBob3N0IHBlcm1pc3Npb25zIGFyZSBjdXJyZW50bHkgZ3JhbnRlZC4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBoYXNQb3J0YWxQZXJtaXNzaW9uKCk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICByZXR1cm4gY2hyb21lLnBlcm1pc3Npb25zLmNvbnRhaW5zKHsgb3JpZ2luczogWy4uLlBPUlRBTF9PUklHSU5TXSB9KTtcbn1cblxuLyoqXG4gKiBSZXF1ZXN0cyBwb3J0YWwgaG9zdCBwZXJtaXNzaW9ucyBmcm9tIHRoZSB1c2VyLlxuICogTVVTVCBiZSBjYWxsZWQgZnJvbSBhIHVzZXIgZ2VzdHVyZSAoYnV0dG9uIGNsaWNrIGhhbmRsZXIpLlxuICogUmV0dXJucyB0cnVlIGlmIGdyYW50ZWQsIGZhbHNlIGlmIGRlbmllZC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlcXVlc3RQb3J0YWxQZXJtaXNzaW9uKCk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICByZXR1cm4gY2hyb21lLnBlcm1pc3Npb25zLnJlcXVlc3QoeyBvcmlnaW5zOiBbLi4uUE9SVEFMX09SSUdJTlNdIH0pO1xufVxuIiwgIi8qKlxuICogR3JhcGhRTCBjbGllbnQgZm9yIFRyYWNrbWFuIEFQSS5cbiAqIFNlbmRzIGF1dGhlbnRpY2F0ZWQgcmVxdWVzdHMgdXNpbmcgYnJvd3NlciBzZXNzaW9uIGNvb2tpZXMgKGNyZWRlbnRpYWxzOiBpbmNsdWRlKS5cbiAqIFNoYXJlZCBieSBzZXJ2aWNlIHdvcmtlciBhbmQgcG9wdXAuXG4gKi9cblxuZXhwb3J0IGNvbnN0IEdSQVBIUUxfRU5EUE9JTlQgPSBcImh0dHBzOi8vYXBpLnRyYWNrbWFuZ29sZi5jb20vZ3JhcGhxbFwiO1xuXG5leHBvcnQgY29uc3QgSEVBTFRIX0NIRUNLX1FVRVJZID0gYHF1ZXJ5IEhlYWx0aENoZWNrIHsgbWUgeyBpZCB9IH1gO1xuXG4vKiogU3RhbmRhcmQgR3JhcGhRTCByZXNwb25zZSBlbnZlbG9wZS4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgR3JhcGhRTFJlc3BvbnNlPFQ+IHtcbiAgZGF0YTogVCB8IG51bGw7XG4gIGVycm9ycz86IEFycmF5PHtcbiAgICBtZXNzYWdlOiBzdHJpbmc7XG4gICAgZXh0ZW5zaW9ucz86IHsgY29kZT86IHN0cmluZyB9O1xuICB9Pjtcbn1cblxuLyoqIEF1dGggY2xhc3NpZmljYXRpb24gcmVzdWx0IHJldHVybmVkIGJ5IGNsYXNzaWZ5QXV0aFJlc3VsdC4gKi9cbmV4cG9ydCB0eXBlIEF1dGhTdGF0dXMgPVxuICB8IHsga2luZDogXCJhdXRoZW50aWNhdGVkXCIgfVxuICB8IHsga2luZDogXCJ1bmF1dGhlbnRpY2F0ZWRcIiB9XG4gIHwgeyBraW5kOiBcImVycm9yXCI7IG1lc3NhZ2U6IHN0cmluZyB9O1xuXG4vKipcbiAqIEV4ZWN1dGVzIGEgR3JhcGhRTCBxdWVyeSBhZ2FpbnN0IHRoZSBUcmFja21hbiBBUEkuXG4gKiBVc2VzIGNyZWRlbnRpYWxzOiBcImluY2x1ZGVcIiBzbyB0aGUgYnJvd3NlciBzZW5kcyBleGlzdGluZyBzZXNzaW9uIGNvb2tpZXMuXG4gKiBUaHJvd3MgaWYgdGhlIEhUVFAgcmVzcG9uc2UgaXMgbm90IDJ4eC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGV4ZWN1dGVRdWVyeTxUPihcbiAgcXVlcnk6IHN0cmluZyxcbiAgdmFyaWFibGVzPzogUmVjb3JkPHN0cmluZywgdW5rbm93bj5cbik6IFByb21pc2U8R3JhcGhRTFJlc3BvbnNlPFQ+PiB7XG4gIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goR1JBUEhRTF9FTkRQT0lOVCwge1xuICAgIG1ldGhvZDogXCJQT1NUXCIsXG4gICAgY3JlZGVudGlhbHM6IFwiaW5jbHVkZVwiLFxuICAgIGhlYWRlcnM6IHsgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIgfSxcbiAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IHF1ZXJ5LCB2YXJpYWJsZXMgfSksXG4gIH0pO1xuXG4gIGlmICghcmVzcG9uc2Uub2spIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEhUVFAgJHtyZXNwb25zZS5zdGF0dXN9YCk7XG4gIH1cblxuICByZXR1cm4gcmVzcG9uc2UuanNvbigpIGFzIFByb21pc2U8R3JhcGhRTFJlc3BvbnNlPFQ+Pjtcbn1cblxuLyoqXG4gKiBDbGFzc2lmaWVzIGEgR3JhcGhRTCByZXNwb25zZSBmcm9tIHRoZSBoZWFsdGgtY2hlY2sgcXVlcnkgaW50byBhbiBBdXRoU3RhdHVzLlxuICpcbiAqIENsYXNzaWZpY2F0aW9uIHByaW9yaXR5OlxuICogMS4gRXJyb3JzIHByZXNlbnQgYW5kIG5vbi1lbXB0eSBcdTIxOTIgY2hlY2sgZm9yIGF1dGggZXJyb3IgcGF0dGVybnMgXHUyMTkyIGVsc2UgZ2VuZXJpYyBlcnJvclxuICogMi4gTm8gZXJyb3JzIGJ1dCBkYXRhLm1lLmlkIGlzIGZhbHN5IFx1MjE5MiB1bmF1dGhlbnRpY2F0ZWRcbiAqIDMuIGRhdGEubWUuaWQgaXMgdHJ1dGh5IFx1MjE5MiBhdXRoZW50aWNhdGVkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjbGFzc2lmeUF1dGhSZXN1bHQoXG4gIHJlc3VsdDogR3JhcGhRTFJlc3BvbnNlPHsgbWU6IHsgaWQ6IHN0cmluZyB9IHwgbnVsbCB9PlxuKTogQXV0aFN0YXR1cyB7XG4gIGlmIChyZXN1bHQuZXJyb3JzICYmIHJlc3VsdC5lcnJvcnMubGVuZ3RoID4gMCkge1xuICAgIGNvbnN0IGNvZGUgPSByZXN1bHQuZXJyb3JzWzBdLmV4dGVuc2lvbnM/LmNvZGUgPz8gXCJcIjtcbiAgICBjb25zdCBtc2cgPSByZXN1bHQuZXJyb3JzWzBdLm1lc3NhZ2UgPz8gXCJcIjtcbiAgICBjb25zdCBtc2dMb3dlciA9IG1zZy50b0xvd2VyQ2FzZSgpO1xuXG4gICAgaWYgKFxuICAgICAgY29kZSA9PT0gXCJVTkFVVEhFTlRJQ0FURURcIiB8fFxuICAgICAgbXNnTG93ZXIuaW5jbHVkZXMoXCJ1bmF1dGhvcml6ZWRcIikgfHxcbiAgICAgIG1zZ0xvd2VyLmluY2x1ZGVzKFwidW5hdXRoZW50aWNhdGVkXCIpIHx8XG4gICAgICBtc2dMb3dlci5pbmNsdWRlcyhcIm5vdCBsb2dnZWQgaW5cIilcbiAgICApIHtcbiAgICAgIHJldHVybiB7IGtpbmQ6IFwidW5hdXRoZW50aWNhdGVkXCIgfTtcbiAgICB9XG5cbiAgICByZXR1cm4geyBraW5kOiBcImVycm9yXCIsIG1lc3NhZ2U6IFwiVW5hYmxlIHRvIHJlYWNoIFRyYWNrbWFuIFx1MjAxNCB0cnkgYWdhaW4gbGF0ZXJcIiB9O1xuICB9XG5cbiAgaWYgKCFyZXN1bHQuZGF0YT8ubWU/LmlkKSB7XG4gICAgcmV0dXJuIHsga2luZDogXCJ1bmF1dGhlbnRpY2F0ZWRcIiB9O1xuICB9XG5cbiAgcmV0dXJuIHsga2luZDogXCJhdXRoZW50aWNhdGVkXCIgfTtcbn1cbiIsICIvKipcbiAqIFNlcnZpY2UgV29ya2VyIGZvciBUcmFja1B1bGwgQ2hyb21lIEV4dGVuc2lvblxuICovXG5cbmltcG9ydCB7IFNUT1JBR0VfS0VZUyB9IGZyb20gXCIuLi9zaGFyZWQvY29uc3RhbnRzXCI7XG5pbXBvcnQgeyB3cml0ZUNzdiB9IGZyb20gXCIuLi9zaGFyZWQvY3N2X3dyaXRlclwiO1xuaW1wb3J0IHR5cGUgeyBTZXNzaW9uRGF0YSB9IGZyb20gXCIuLi9tb2RlbHMvdHlwZXNcIjtcbmltcG9ydCB7IG1pZ3JhdGVMZWdhY3lQcmVmLCBERUZBVUxUX1VOSVRfQ0hPSUNFLCB0eXBlIFVuaXRDaG9pY2UsIHR5cGUgU3BlZWRVbml0LCB0eXBlIERpc3RhbmNlVW5pdCB9IGZyb20gXCIuLi9zaGFyZWQvdW5pdF9ub3JtYWxpemF0aW9uXCI7XG5pbXBvcnQgeyBzYXZlU2Vzc2lvblRvSGlzdG9yeSwgZ2V0SGlzdG9yeUVycm9yTWVzc2FnZSB9IGZyb20gXCIuLi9zaGFyZWQvaGlzdG9yeVwiO1xuaW1wb3J0IHsgaGFzUG9ydGFsUGVybWlzc2lvbiB9IGZyb20gXCIuLi9zaGFyZWQvcG9ydGFsUGVybWlzc2lvbnNcIjtcbmltcG9ydCB7IGV4ZWN1dGVRdWVyeSwgY2xhc3NpZnlBdXRoUmVzdWx0LCBIRUFMVEhfQ0hFQ0tfUVVFUlkgfSBmcm9tIFwiLi4vc2hhcmVkL2dyYXBocWxfY2xpZW50XCI7XG5cbmNocm9tZS5ydW50aW1lLm9uSW5zdGFsbGVkLmFkZExpc3RlbmVyKCgpID0+IHtcbiAgY29uc29sZS5sb2coXCJUcmFja1B1bGwgZXh0ZW5zaW9uIGluc3RhbGxlZFwiKTtcbn0pO1xuXG5pbnRlcmZhY2UgU2F2ZURhdGFSZXF1ZXN0IHtcbiAgdHlwZTogXCJTQVZFX0RBVEFcIjtcbiAgZGF0YTogU2Vzc2lvbkRhdGE7XG59XG5cbmludGVyZmFjZSBFeHBvcnRDc3ZSZXF1ZXN0IHtcbiAgdHlwZTogXCJFWFBPUlRfQ1NWX1JFUVVFU1RcIjtcbn1cblxuaW50ZXJmYWNlIEdldERhdGFSZXF1ZXN0IHtcbiAgdHlwZTogXCJHRVRfREFUQVwiO1xufVxuXG5pbnRlcmZhY2UgUG9ydGFsSW1wb3J0UmVxdWVzdCB7XG4gIHR5cGU6IFwiUE9SVEFMX0lNUE9SVF9SRVFVRVNUXCI7XG59XG5cbmludGVyZmFjZSBQb3J0YWxBdXRoQ2hlY2tSZXF1ZXN0IHtcbiAgdHlwZTogXCJQT1JUQUxfQVVUSF9DSEVDS1wiO1xufVxuXG5mdW5jdGlvbiBnZXREb3dubG9hZEVycm9yTWVzc2FnZShvcmlnaW5hbEVycm9yOiBzdHJpbmcpOiBzdHJpbmcge1xuICBpZiAob3JpZ2luYWxFcnJvci5pbmNsdWRlcyhcImludmFsaWRcIikpIHtcbiAgICByZXR1cm4gXCJJbnZhbGlkIGRvd25sb2FkIGZvcm1hdFwiO1xuICB9XG4gIGlmIChvcmlnaW5hbEVycm9yLmluY2x1ZGVzKFwicXVvdGFcIikgfHwgb3JpZ2luYWxFcnJvci5pbmNsdWRlcyhcInNwYWNlXCIpKSB7XG4gICAgcmV0dXJuIFwiSW5zdWZmaWNpZW50IHN0b3JhZ2Ugc3BhY2VcIjtcbiAgfVxuICBpZiAob3JpZ2luYWxFcnJvci5pbmNsdWRlcyhcImJsb2NrZWRcIikgfHwgb3JpZ2luYWxFcnJvci5pbmNsdWRlcyhcInBvbGljeVwiKSkge1xuICAgIHJldHVybiBcIkRvd25sb2FkIGJsb2NrZWQgYnkgYnJvd3NlciBzZXR0aW5nc1wiO1xuICB9XG4gIHJldHVybiBvcmlnaW5hbEVycm9yO1xufVxuXG50eXBlIFJlcXVlc3RNZXNzYWdlID0gU2F2ZURhdGFSZXF1ZXN0IHwgRXhwb3J0Q3N2UmVxdWVzdCB8IEdldERhdGFSZXF1ZXN0IHwgUG9ydGFsSW1wb3J0UmVxdWVzdCB8IFBvcnRhbEF1dGhDaGVja1JlcXVlc3Q7XG5cbmNocm9tZS5ydW50aW1lLm9uTWVzc2FnZS5hZGRMaXN0ZW5lcigobWVzc2FnZTogUmVxdWVzdE1lc3NhZ2UsIHNlbmRlciwgc2VuZFJlc3BvbnNlKSA9PiB7XG4gIGlmIChtZXNzYWdlLnR5cGUgPT09IFwiR0VUX0RBVEFcIikge1xuICAgIGNocm9tZS5zdG9yYWdlLmxvY2FsLmdldChbU1RPUkFHRV9LRVlTLlRSQUNLTUFOX0RBVEFdLCAocmVzdWx0KSA9PiB7XG4gICAgICBzZW5kUmVzcG9uc2UocmVzdWx0W1NUT1JBR0VfS0VZUy5UUkFDS01BTl9EQVRBXSB8fCBudWxsKTtcbiAgICB9KTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGlmIChtZXNzYWdlLnR5cGUgPT09IFwiU0FWRV9EQVRBXCIpIHtcbiAgICBjb25zdCBzZXNzaW9uRGF0YSA9IChtZXNzYWdlIGFzIFNhdmVEYXRhUmVxdWVzdCkuZGF0YTtcbiAgICBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoeyBbU1RPUkFHRV9LRVlTLlRSQUNLTUFOX0RBVEFdOiBzZXNzaW9uRGF0YSB9LCAoKSA9PiB7XG4gICAgICBpZiAoY2hyb21lLnJ1bnRpbWUubGFzdEVycm9yKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXCJUcmFja1B1bGw6IEZhaWxlZCB0byBzYXZlIGRhdGE6XCIsIGNocm9tZS5ydW50aW1lLmxhc3RFcnJvcik7XG4gICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogY2hyb21lLnJ1bnRpbWUubGFzdEVycm9yLm1lc3NhZ2UgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLmxvZyhcIlRyYWNrUHVsbDogU2Vzc2lvbiBkYXRhIHNhdmVkIHRvIHN0b3JhZ2VcIik7XG4gICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IHRydWUgfSk7XG5cbiAgICAgICAgLy8gSGlzdG9yeSBzYXZlIC0tIGZpcmUgYW5kIGZvcmdldCwgbmV2ZXIgYmxvY2tzIHByaW1hcnkgZmxvd1xuICAgICAgICBzYXZlU2Vzc2lvblRvSGlzdG9yeShzZXNzaW9uRGF0YSkuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJUcmFja1B1bGw6IEhpc3Rvcnkgc2F2ZSBmYWlsZWQ6XCIsIGVycik7XG4gICAgICAgICAgY29uc3QgbXNnID0gZ2V0SGlzdG9yeUVycm9yTWVzc2FnZShlcnIubWVzc2FnZSk7XG4gICAgICAgICAgY2hyb21lLnJ1bnRpbWUuc2VuZE1lc3NhZ2UoeyB0eXBlOiBcIkhJU1RPUllfRVJST1JcIiwgZXJyb3I6IG1zZyB9KS5jYXRjaCgoKSA9PiB7XG4gICAgICAgICAgICAvLyBQb3B1cCBub3Qgb3BlbiAtLSBhbHJlYWR5IGxvZ2dlZCB0byBjb25zb2xlXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgaWYgKG1lc3NhZ2UudHlwZSA9PT0gXCJFWFBPUlRfQ1NWX1JFUVVFU1RcIikge1xuICAgIGNocm9tZS5zdG9yYWdlLmxvY2FsLmdldChbU1RPUkFHRV9LRVlTLlRSQUNLTUFOX0RBVEEsIFNUT1JBR0VfS0VZUy5TUEVFRF9VTklULCBTVE9SQUdFX0tFWVMuRElTVEFOQ0VfVU5JVCwgU1RPUkFHRV9LRVlTLkhJVFRJTkdfU1VSRkFDRSwgU1RPUkFHRV9LRVlTLklOQ0xVREVfQVZFUkFHRVMsIFwidW5pdFByZWZlcmVuY2VcIl0sIChyZXN1bHQpID0+IHtcbiAgICAgIGNvbnN0IGRhdGEgPSByZXN1bHRbU1RPUkFHRV9LRVlTLlRSQUNLTUFOX0RBVEFdIGFzIFNlc3Npb25EYXRhIHwgdW5kZWZpbmVkO1xuICAgICAgaWYgKCFkYXRhIHx8ICFkYXRhLmNsdWJfZ3JvdXBzIHx8IGRhdGEuY2x1Yl9ncm91cHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogXCJObyBkYXRhIHRvIGV4cG9ydFwiIH0pO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIGxldCB1bml0Q2hvaWNlOiBVbml0Q2hvaWNlO1xuICAgICAgICBpZiAocmVzdWx0W1NUT1JBR0VfS0VZUy5TUEVFRF9VTklUXSAmJiByZXN1bHRbU1RPUkFHRV9LRVlTLkRJU1RBTkNFX1VOSVRdKSB7XG4gICAgICAgICAgdW5pdENob2ljZSA9IHtcbiAgICAgICAgICAgIHNwZWVkOiByZXN1bHRbU1RPUkFHRV9LRVlTLlNQRUVEX1VOSVRdIGFzIFNwZWVkVW5pdCxcbiAgICAgICAgICAgIGRpc3RhbmNlOiByZXN1bHRbU1RPUkFHRV9LRVlTLkRJU1RBTkNFX1VOSVRdIGFzIERpc3RhbmNlVW5pdCxcbiAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHVuaXRDaG9pY2UgPSBtaWdyYXRlTGVnYWN5UHJlZihyZXN1bHRbXCJ1bml0UHJlZmVyZW5jZVwiXSBhcyBzdHJpbmcgfCB1bmRlZmluZWQpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHN1cmZhY2UgPSAocmVzdWx0W1NUT1JBR0VfS0VZUy5ISVRUSU5HX1NVUkZBQ0VdIGFzIFwiR3Jhc3NcIiB8IFwiTWF0XCIpID8/IFwiTWF0XCI7XG4gICAgICAgIGNvbnN0IGluY2x1ZGVBdmVyYWdlcyA9IHJlc3VsdFtTVE9SQUdFX0tFWVMuSU5DTFVERV9BVkVSQUdFU10gPT09IHVuZGVmaW5lZFxuICAgICAgICAgID8gdHJ1ZVxuICAgICAgICAgIDogQm9vbGVhbihyZXN1bHRbU1RPUkFHRV9LRVlTLklOQ0xVREVfQVZFUkFHRVNdKTtcbiAgICAgICAgY29uc3QgY3N2Q29udGVudCA9IHdyaXRlQ3N2KGRhdGEsIGluY2x1ZGVBdmVyYWdlcywgdW5kZWZpbmVkLCB1bml0Q2hvaWNlLCBzdXJmYWNlKTtcbiAgICAgICAgY29uc3QgZmlsZW5hbWUgPSBgU2hvdERhdGFfJHtkYXRhLmRhdGUgfHwgXCJ1bmtub3duXCJ9LmNzdmA7XG5cbiAgICAgICAgY2hyb21lLmRvd25sb2Fkcy5kb3dubG9hZChcbiAgICAgICAgICB7XG4gICAgICAgICAgICB1cmw6IGBkYXRhOnRleHQvY3N2O2NoYXJzZXQ9dXRmLTgsJHtlbmNvZGVVUklDb21wb25lbnQoY3N2Q29udGVudCl9YCxcbiAgICAgICAgICAgIGZpbGVuYW1lOiBmaWxlbmFtZSxcbiAgICAgICAgICAgIHNhdmVBczogZmFsc2UsXG4gICAgICAgICAgfSxcbiAgICAgICAgICAoZG93bmxvYWRJZCkgPT4ge1xuICAgICAgICAgICAgaWYgKGNocm9tZS5ydW50aW1lLmxhc3RFcnJvcikge1xuICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiVHJhY2tQdWxsOiBEb3dubG9hZCBmYWlsZWQ6XCIsIGNocm9tZS5ydW50aW1lLmxhc3RFcnJvcik7XG4gICAgICAgICAgICAgIGNvbnN0IGVycm9yTWVzc2FnZSA9IGdldERvd25sb2FkRXJyb3JNZXNzYWdlKGNocm9tZS5ydW50aW1lLmxhc3RFcnJvci5tZXNzYWdlKTtcbiAgICAgICAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvck1lc3NhZ2UgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgVHJhY2tQdWxsOiBDU1YgZXhwb3J0ZWQgd2l0aCBkb3dubG9hZCBJRCAke2Rvd25sb2FkSWR9YCk7XG4gICAgICAgICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IHRydWUsIGRvd25sb2FkSWQsIGZpbGVuYW1lIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXCJUcmFja1B1bGw6IENTViBnZW5lcmF0aW9uIGZhaWxlZDpcIiwgZXJyb3IpO1xuICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKSB9KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGlmIChtZXNzYWdlLnR5cGUgPT09IFwiUE9SVEFMX0FVVEhfQ0hFQ0tcIikge1xuICAgIChhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBncmFudGVkID0gYXdhaXQgaGFzUG9ydGFsUGVybWlzc2lvbigpO1xuICAgICAgaWYgKCFncmFudGVkKSB7XG4gICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IHRydWUsIHN0YXR1czogXCJkZW5pZWRcIiB9KTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZXhlY3V0ZVF1ZXJ5PHsgbWU6IHsgaWQ6IHN0cmluZyB9IHwgbnVsbCB9PihIRUFMVEhfQ0hFQ0tfUVVFUlkpO1xuICAgICAgICBjb25zdCBhdXRoU3RhdHVzID0gY2xhc3NpZnlBdXRoUmVzdWx0KHJlc3VsdCk7XG4gICAgICAgIGlmIChhdXRoU3RhdHVzLmtpbmQgPT09IFwiZXJyb3JcIikge1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJUcmFja1B1bGw6IEdyYXBoUUwgaGVhbHRoIGNoZWNrIGVycm9yOlwiLCBhdXRoU3RhdHVzLm1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgICAgIHNlbmRSZXNwb25zZSh7XG4gICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICBzdGF0dXM6IGF1dGhTdGF0dXMua2luZCxcbiAgICAgICAgICBtZXNzYWdlOiBhdXRoU3RhdHVzLmtpbmQgPT09IFwiZXJyb3JcIiA/IGF1dGhTdGF0dXMubWVzc2FnZSA6IHVuZGVmaW5lZCxcbiAgICAgICAgfSk7XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIlRyYWNrUHVsbDogR3JhcGhRTCBoZWFsdGggY2hlY2sgZmFpbGVkOlwiLCBlcnIpO1xuICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiB0cnVlLCBzdGF0dXM6IFwiZXJyb3JcIiwgbWVzc2FnZTogXCJVbmFibGUgdG8gcmVhY2ggVHJhY2ttYW4gXHUyMDE0IHRyeSBhZ2FpbiBsYXRlclwiIH0pO1xuICAgICAgfVxuICAgIH0pKCk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBpZiAobWVzc2FnZS50eXBlID09PSBcIlBPUlRBTF9JTVBPUlRfUkVRVUVTVFwiKSB7XG4gICAgKGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGdyYW50ZWQgPSBhd2FpdCBoYXNQb3J0YWxQZXJtaXNzaW9uKCk7XG4gICAgICBpZiAoIWdyYW50ZWQpIHtcbiAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBcIlBvcnRhbCBwZXJtaXNzaW9uIG5vdCBncmFudGVkXCIgfSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIC8vIFBoYXNlIDIyIHdpbGwgaW1wbGVtZW50IEdyYXBoUUwgY2xpZW50IGFuZCBhY3R1YWwgaW1wb3J0XG4gICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFwiTm90IGltcGxlbWVudGVkXCIgfSk7XG4gICAgfSkoKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxufSk7XG5cbmNocm9tZS5zdG9yYWdlLm9uQ2hhbmdlZC5hZGRMaXN0ZW5lcigoY2hhbmdlcywgbmFtZXNwYWNlKSA9PiB7XG4gIGlmIChuYW1lc3BhY2UgPT09IFwibG9jYWxcIiAmJiBjaGFuZ2VzW1NUT1JBR0VfS0VZUy5UUkFDS01BTl9EQVRBXSkge1xuICAgIGNvbnN0IG5ld1ZhbHVlID0gY2hhbmdlc1tTVE9SQUdFX0tFWVMuVFJBQ0tNQU5fREFUQV0ubmV3VmFsdWU7XG4gICAgY2hyb21lLnJ1bnRpbWUuc2VuZE1lc3NhZ2UoeyB0eXBlOiBcIkRBVEFfVVBEQVRFRFwiLCBkYXRhOiBuZXdWYWx1ZSB9KS5jYXRjaCgoKSA9PiB7XG4gICAgICAvLyBJZ25vcmUgZXJyb3JzIHdoZW4gbm8gcG9wdXAgaXMgbGlzdGVuaW5nXG4gICAgfSk7XG4gIH1cbn0pO1xuIl0sCiAgIm1hcHBpbmdz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
