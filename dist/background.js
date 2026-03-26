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

  // src/background/serviceWorker.ts
  var require_serviceWorker = __commonJS({
    "src/background/serviceWorker.ts"() {
      init_constants();
      init_csv_writer();
      init_unit_normalization();
      init_history();
      init_portalPermissions();
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL3NoYXJlZC9jb25zdGFudHMudHMiLCAiLi4vc3JjL3NoYXJlZC91bml0X25vcm1hbGl6YXRpb24udHMiLCAiLi4vc3JjL3NoYXJlZC9jc3Zfd3JpdGVyLnRzIiwgIi4uL3NyYy9zaGFyZWQvaGlzdG9yeS50cyIsICIuLi9zcmMvc2hhcmVkL3BvcnRhbFBlcm1pc3Npb25zLnRzIiwgIi4uL3NyYy9iYWNrZ3JvdW5kL3NlcnZpY2VXb3JrZXIudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbIi8qKlxuICogU2hhcmVkIGNvbnN0YW50cyBpbmNsdWRpbmcgQ1NTIHNlbGVjdG9ycyBhbmQgY29uZmlndXJhdGlvbi5cbiAqIEJhc2VkIG9uIFB5dGhvbiBzY3JhcGVyIGNvbnN0YW50cy5weSBpbXBsZW1lbnRhdGlvbi5cbiAqL1xuXG4vLyBDb21wbGV0ZSBsaXN0IG9mIGFsbCBrbm93biBUcmFja21hbiBtZXRyaWNzIChVUkwgcGFyYW1ldGVyIG5hbWVzKVxuZXhwb3J0IGNvbnN0IEFMTF9NRVRSSUNTID0gW1xuICBcIkNsdWJTcGVlZFwiLFxuICBcIkJhbGxTcGVlZFwiLFxuICBcIlNtYXNoRmFjdG9yXCIsXG4gIFwiQXR0YWNrQW5nbGVcIixcbiAgXCJDbHViUGF0aFwiLFxuICBcIkZhY2VBbmdsZVwiLFxuICBcIkZhY2VUb1BhdGhcIixcbiAgXCJTd2luZ0RpcmVjdGlvblwiLFxuICBcIkR5bmFtaWNMb2Z0XCIsXG4gIFwiU3BpblJhdGVcIixcbiAgXCJTcGluQXhpc1wiLFxuICBcIlNwaW5Mb2Z0XCIsXG4gIFwiTGF1bmNoQW5nbGVcIixcbiAgXCJMYXVuY2hEaXJlY3Rpb25cIixcbiAgXCJDYXJyeVwiLFxuICBcIlRvdGFsXCIsXG4gIFwiU2lkZVwiLFxuICBcIlNpZGVUb3RhbFwiLFxuICBcIkNhcnJ5U2lkZVwiLFxuICBcIlRvdGFsU2lkZVwiLFxuICBcIkhlaWdodFwiLFxuICBcIk1heEhlaWdodFwiLFxuICBcIkN1cnZlXCIsXG4gIFwiTGFuZGluZ0FuZ2xlXCIsXG4gIFwiSGFuZ1RpbWVcIixcbiAgXCJMb3dQb2ludERpc3RhbmNlXCIsXG4gIFwiSW1wYWN0SGVpZ2h0XCIsXG4gIFwiSW1wYWN0T2Zmc2V0XCIsXG4gIFwiVGVtcG9cIixcbl0gYXMgY29uc3Q7XG5cbi8vIE1ldHJpY3Mgc3BsaXQgaW50byBncm91cHMgZm9yIG11bHRpLXBhZ2UtbG9hZCBIVE1MIGZhbGxiYWNrXG5leHBvcnQgY29uc3QgTUVUUklDX0dST1VQUyA9IFtcbiAgW1xuICAgIFwiQ2x1YlNwZWVkXCIsXG4gICAgXCJCYWxsU3BlZWRcIixcbiAgICBcIlNtYXNoRmFjdG9yXCIsXG4gICAgXCJBdHRhY2tBbmdsZVwiLFxuICAgIFwiQ2x1YlBhdGhcIixcbiAgICBcIkZhY2VBbmdsZVwiLFxuICAgIFwiRmFjZVRvUGF0aFwiLFxuICAgIFwiU3dpbmdEaXJlY3Rpb25cIixcbiAgICBcIkR5bmFtaWNMb2Z0XCIsXG4gICAgXCJTcGluTG9mdFwiLFxuICBdLFxuICBbXG4gICAgXCJTcGluUmF0ZVwiLFxuICAgIFwiU3BpbkF4aXNcIixcbiAgICBcIkxhdW5jaEFuZ2xlXCIsXG4gICAgXCJMYXVuY2hEaXJlY3Rpb25cIixcbiAgICBcIkNhcnJ5XCIsXG4gICAgXCJUb3RhbFwiLFxuICAgIFwiU2lkZVwiLFxuICAgIFwiU2lkZVRvdGFsXCIsXG4gICAgXCJDYXJyeVNpZGVcIixcbiAgICBcIlRvdGFsU2lkZVwiLFxuICAgIFwiSGVpZ2h0XCIsXG4gICAgXCJNYXhIZWlnaHRcIixcbiAgICBcIkN1cnZlXCIsXG4gICAgXCJMYW5kaW5nQW5nbGVcIixcbiAgICBcIkhhbmdUaW1lXCIsXG4gICAgXCJMb3dQb2ludERpc3RhbmNlXCIsXG4gICAgXCJJbXBhY3RIZWlnaHRcIixcbiAgICBcIkltcGFjdE9mZnNldFwiLFxuICAgIFwiVGVtcG9cIixcbiAgXSxcbl0gYXMgY29uc3Q7XG5cbi8vIERpc3BsYXkgbmFtZXM6IFVSTCBwYXJhbSBuYW1lIC0+IGh1bWFuLXJlYWRhYmxlIENTViBoZWFkZXJcbmV4cG9ydCBjb25zdCBNRVRSSUNfRElTUExBWV9OQU1FUzogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcbiAgQ2x1YlNwZWVkOiBcIkNsdWIgU3BlZWRcIixcbiAgQmFsbFNwZWVkOiBcIkJhbGwgU3BlZWRcIixcbiAgU21hc2hGYWN0b3I6IFwiU21hc2ggRmFjdG9yXCIsXG4gIEF0dGFja0FuZ2xlOiBcIkF0dGFjayBBbmdsZVwiLFxuICBDbHViUGF0aDogXCJDbHViIFBhdGhcIixcbiAgRmFjZUFuZ2xlOiBcIkZhY2UgQW5nbGVcIixcbiAgRmFjZVRvUGF0aDogXCJGYWNlIFRvIFBhdGhcIixcbiAgU3dpbmdEaXJlY3Rpb246IFwiU3dpbmcgRGlyZWN0aW9uXCIsXG4gIER5bmFtaWNMb2Z0OiBcIkR5bmFtaWMgTG9mdFwiLFxuICBTcGluUmF0ZTogXCJTcGluIFJhdGVcIixcbiAgU3BpbkF4aXM6IFwiU3BpbiBBeGlzXCIsXG4gIFNwaW5Mb2Z0OiBcIlNwaW4gTG9mdFwiLFxuICBMYXVuY2hBbmdsZTogXCJMYXVuY2ggQW5nbGVcIixcbiAgTGF1bmNoRGlyZWN0aW9uOiBcIkxhdW5jaCBEaXJlY3Rpb25cIixcbiAgQ2Fycnk6IFwiQ2FycnlcIixcbiAgVG90YWw6IFwiVG90YWxcIixcbiAgU2lkZTogXCJTaWRlXCIsXG4gIFNpZGVUb3RhbDogXCJTaWRlIFRvdGFsXCIsXG4gIENhcnJ5U2lkZTogXCJDYXJyeSBTaWRlXCIsXG4gIFRvdGFsU2lkZTogXCJUb3RhbCBTaWRlXCIsXG4gIEhlaWdodDogXCJIZWlnaHRcIixcbiAgTWF4SGVpZ2h0OiBcIk1heCBIZWlnaHRcIixcbiAgQ3VydmU6IFwiQ3VydmVcIixcbiAgTGFuZGluZ0FuZ2xlOiBcIkxhbmRpbmcgQW5nbGVcIixcbiAgSGFuZ1RpbWU6IFwiSGFuZyBUaW1lXCIsXG4gIExvd1BvaW50RGlzdGFuY2U6IFwiTG93IFBvaW50XCIsXG4gIEltcGFjdEhlaWdodDogXCJJbXBhY3QgSGVpZ2h0XCIsXG4gIEltcGFjdE9mZnNldDogXCJJbXBhY3QgT2Zmc2V0XCIsXG4gIFRlbXBvOiBcIlRlbXBvXCIsXG59O1xuXG4vLyBDU1MgY2xhc3Mgc2VsZWN0b3JzIChmcm9tIFRyYWNrbWFuJ3MgcmVuZGVyZWQgSFRNTClcbmV4cG9ydCBjb25zdCBDU1NfREFURSA9IFwiZGF0ZVwiO1xuZXhwb3J0IGNvbnN0IENTU19SRVNVTFRTX1dSQVBQRVIgPSBcInBsYXllci1hbmQtcmVzdWx0cy10YWJsZS13cmFwcGVyXCI7XG5leHBvcnQgY29uc3QgQ1NTX1JFU1VMVFNfVEFCTEUgPSBcIlJlc3VsdHNUYWJsZVwiO1xuZXhwb3J0IGNvbnN0IENTU19DTFVCX1RBRyA9IFwiZ3JvdXAtdGFnXCI7XG5leHBvcnQgY29uc3QgQ1NTX1BBUkFNX05BTUVTX1JPVyA9IFwicGFyYW1ldGVyLW5hbWVzLXJvd1wiO1xuZXhwb3J0IGNvbnN0IENTU19QQVJBTV9OQU1FID0gXCJwYXJhbWV0ZXItbmFtZVwiO1xuZXhwb3J0IGNvbnN0IENTU19TSE9UX0RFVEFJTF9ST1cgPSBcInJvdy13aXRoLXNob3QtZGV0YWlsc1wiO1xuZXhwb3J0IGNvbnN0IENTU19BVkVSQUdFX1ZBTFVFUyA9IFwiYXZlcmFnZS12YWx1ZXNcIjtcbmV4cG9ydCBjb25zdCBDU1NfQ09OU0lTVEVOQ1lfVkFMVUVTID0gXCJjb25zaXN0ZW5jeS12YWx1ZXNcIjtcblxuLy8gQVBJIFVSTCBwYXR0ZXJucyB0aGF0IGxpa2VseSBpbmRpY2F0ZSBhbiBBUEkgZGF0YSByZXNwb25zZVxuZXhwb3J0IGNvbnN0IEFQSV9VUkxfUEFUVEVSTlMgPSBbXG4gIFwiYXBpLnRyYWNrbWFuZ29sZi5jb21cIixcbiAgXCJ0cmFja21hbmdvbGYuY29tL2FwaVwiLFxuICBcIi9hcGkvXCIsXG4gIFwiL3JlcG9ydHMvXCIsXG4gIFwiL2FjdGl2aXRpZXMvXCIsXG4gIFwiL3Nob3RzL1wiLFxuICBcImdyYXBocWxcIixcbl07XG5cbi8vIFRpbWVvdXRzIChtaWxsaXNlY29uZHMpXG5leHBvcnQgY29uc3QgUEFHRV9MT0FEX1RJTUVPVVQgPSAzMF8wMDA7XG5leHBvcnQgY29uc3QgREFUQV9MT0FEX1RJTUVPVVQgPSAxNV8wMDA7XG5cbi8vIFRyYWNrbWFuIGJhc2UgVVJMXG5leHBvcnQgY29uc3QgQkFTRV9VUkwgPSBcImh0dHBzOi8vd2ViLWR5bmFtaWMtcmVwb3J0cy50cmFja21hbmdvbGYuY29tL1wiO1xuXG4vLyBDdXN0b20gcHJvbXB0IHN0b3JhZ2Uga2V5c1xuZXhwb3J0IGNvbnN0IENVU1RPTV9QUk9NUFRfS0VZX1BSRUZJWCA9IFwiY3VzdG9tUHJvbXB0X1wiIGFzIGNvbnN0O1xuZXhwb3J0IGNvbnN0IENVU1RPTV9QUk9NUFRfSURTX0tFWSA9IFwiY3VzdG9tUHJvbXB0SWRzXCIgYXMgY29uc3Q7XG5cbi8vIFN0b3JhZ2Uga2V5cyBmb3IgQ2hyb21lIGV4dGVuc2lvbiAoYWxpZ25lZCBiZXR3ZWVuIGJhY2tncm91bmQgYW5kIHBvcHVwKVxuZXhwb3J0IGNvbnN0IFNUT1JBR0VfS0VZUyA9IHtcbiAgVFJBQ0tNQU5fREFUQTogXCJ0cmFja21hbkRhdGFcIixcbiAgU1BFRURfVU5JVDogXCJzcGVlZFVuaXRcIixcbiAgRElTVEFOQ0VfVU5JVDogXCJkaXN0YW5jZVVuaXRcIixcbiAgU0VMRUNURURfUFJPTVBUX0lEOiBcInNlbGVjdGVkUHJvbXB0SWRcIixcbiAgQUlfU0VSVklDRTogXCJhaVNlcnZpY2VcIixcbiAgSElUVElOR19TVVJGQUNFOiBcImhpdHRpbmdTdXJmYWNlXCIsXG4gIElOQ0xVREVfQVZFUkFHRVM6IFwiaW5jbHVkZUF2ZXJhZ2VzXCIsXG4gIFNFU1NJT05fSElTVE9SWTogXCJzZXNzaW9uSGlzdG9yeVwiLFxufSBhcyBjb25zdDtcbiIsICIvKipcbiAqIFVuaXQgbm9ybWFsaXphdGlvbiB1dGlsaXRpZXMgZm9yIFRyYWNrbWFuIG1lYXN1cmVtZW50cy5cbiAqIFxuICogVHJhY2ttYW4gdXNlcyBuZF8qIHBhcmFtZXRlcnMgdG8gc3BlY2lmeSB1bml0czpcbiAqIC0gbmRfMDAxLCBuZF8wMDIsIGV0Yy4gZGVmaW5lIHVuaXQgc3lzdGVtcyBmb3IgZGlmZmVyZW50IG1lYXN1cmVtZW50IGdyb3Vwc1xuICogLSBDb21tb24gdmFsdWVzOiA3ODkwMTIgPSB5YXJkcy9kZWdyZWVzLCA3ODkwMTMgPSBtZXRlcnMvcmFkaWFuc1xuICovXG5cbmV4cG9ydCB0eXBlIFVuaXRTeXN0ZW1JZCA9IFwiNzg5MDEyXCIgfCBcIjc4OTAxM1wiIHwgXCI3ODkwMTRcIiB8IHN0cmluZztcblxuZXhwb3J0IHR5cGUgU3BlZWRVbml0ID0gXCJtcGhcIiB8IFwibS9zXCI7XG5leHBvcnQgdHlwZSBEaXN0YW5jZVVuaXQgPSBcInlhcmRzXCIgfCBcIm1ldGVyc1wiO1xuZXhwb3J0IHR5cGUgU21hbGxEaXN0YW5jZVVuaXQgPSBcImluY2hlc1wiIHwgXCJjbVwiO1xuZXhwb3J0IGludGVyZmFjZSBVbml0Q2hvaWNlIHsgc3BlZWQ6IFNwZWVkVW5pdDsgZGlzdGFuY2U6IERpc3RhbmNlVW5pdCB9XG5leHBvcnQgY29uc3QgREVGQVVMVF9VTklUX0NIT0lDRTogVW5pdENob2ljZSA9IHsgc3BlZWQ6IFwibXBoXCIsIGRpc3RhbmNlOiBcInlhcmRzXCIgfTtcblxuLyoqXG4gKiBUcmFja21hbiB1bml0IHN5c3RlbSBkZWZpbml0aW9ucy5cbiAqIE1hcHMgbmRfKiBwYXJhbWV0ZXIgdmFsdWVzIHRvIGFjdHVhbCB1bml0cyBmb3IgZWFjaCBtZXRyaWMuXG4gKi9cbmV4cG9ydCBjb25zdCBVTklUX1NZU1RFTVM6IFJlY29yZDxVbml0U3lzdGVtSWQsIFVuaXRTeXN0ZW0+ID0ge1xuICAvLyBJbXBlcmlhbCAoeWFyZHMsIGRlZ3JlZXMpIC0gbW9zdCBjb21tb25cbiAgXCI3ODkwMTJcIjoge1xuICAgIGlkOiBcIjc4OTAxMlwiLFxuICAgIG5hbWU6IFwiSW1wZXJpYWxcIixcbiAgICBkaXN0YW5jZVVuaXQ6IFwieWFyZHNcIixcbiAgICBhbmdsZVVuaXQ6IFwiZGVncmVlc1wiLFxuICAgIHNwZWVkVW5pdDogXCJtcGhcIixcbiAgfSxcbiAgLy8gTWV0cmljIChtZXRlcnMsIHJhZGlhbnMpXG4gIFwiNzg5MDEzXCI6IHtcbiAgICBpZDogXCI3ODkwMTNcIixcbiAgICBuYW1lOiBcIk1ldHJpYyAocmFkKVwiLFxuICAgIGRpc3RhbmNlVW5pdDogXCJtZXRlcnNcIixcbiAgICBhbmdsZVVuaXQ6IFwicmFkaWFuc1wiLFxuICAgIHNwZWVkVW5pdDogXCJrbS9oXCIsXG4gIH0sXG4gIC8vIE1ldHJpYyAobWV0ZXJzLCBkZWdyZWVzKSAtIGxlc3MgY29tbW9uXG4gIFwiNzg5MDE0XCI6IHtcbiAgICBpZDogXCI3ODkwMTRcIixcbiAgICBuYW1lOiBcIk1ldHJpYyAoZGVnKVwiLFxuICAgIGRpc3RhbmNlVW5pdDogXCJtZXRlcnNcIixcbiAgICBhbmdsZVVuaXQ6IFwiZGVncmVlc1wiLFxuICAgIHNwZWVkVW5pdDogXCJrbS9oXCIsXG4gIH0sXG59O1xuXG4vKipcbiAqIFVuaXQgc3lzdGVtIGNvbmZpZ3VyYXRpb24uXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVW5pdFN5c3RlbSB7XG4gIGlkOiBVbml0U3lzdGVtSWQ7XG4gIG5hbWU6IHN0cmluZztcbiAgZGlzdGFuY2VVbml0OiBcInlhcmRzXCIgfCBcIm1ldGVyc1wiO1xuICBhbmdsZVVuaXQ6IFwiZGVncmVlc1wiIHwgXCJyYWRpYW5zXCI7XG4gIHNwZWVkVW5pdDogXCJtcGhcIiB8IFwia20vaFwiIHwgXCJtL3NcIjtcbn1cblxuLyoqXG4gKiBNZXRyaWNzIHRoYXQgdXNlIGRpc3RhbmNlIHVuaXRzLlxuICovXG5leHBvcnQgY29uc3QgRElTVEFOQ0VfTUVUUklDUyA9IG5ldyBTZXQoW1xuICBcIkNhcnJ5XCIsXG4gIFwiVG90YWxcIixcbiAgXCJTaWRlXCIsXG4gIFwiU2lkZVRvdGFsXCIsXG4gIFwiQ2FycnlTaWRlXCIsXG4gIFwiVG90YWxTaWRlXCIsXG4gIFwiSGVpZ2h0XCIsXG4gIFwiTWF4SGVpZ2h0XCIsXG4gIFwiQ3VydmVcIixcbl0pO1xuXG4vKipcbiAqIE1ldHJpY3MgdGhhdCB1c2Ugc21hbGwgZGlzdGFuY2UgdW5pdHMgKGluY2hlcy9jbSkuXG4gKiBUaGVzZSB2YWx1ZXMgY29tZSBmcm9tIHRoZSBBUEkgaW4gbWV0ZXJzIGJ1dCBhcmUgdG9vIHNtYWxsIGZvciB5YXJkcy9tZXRlcnMuXG4gKi9cbmV4cG9ydCBjb25zdCBTTUFMTF9ESVNUQU5DRV9NRVRSSUNTID0gbmV3IFNldChbXG4gIFwiTG93UG9pbnREaXN0YW5jZVwiLFxuXSk7XG5cbi8qKlxuICogVHJhY2ttYW4gaW1wYWN0IGxvY2F0aW9uIG1ldHJpY3MgYXJlIGFsd2F5cyBkaXNwbGF5ZWQgaW4gbWlsbGltZXRlcnMuXG4gKiBUaGUgQVBJIHJldHVybnMgdGhlc2UgdmFsdWVzIGluIG1ldGVycy5cbiAqL1xuZXhwb3J0IGNvbnN0IE1JTExJTUVURVJfTUVUUklDUyA9IG5ldyBTZXQoW1xuICBcIkltcGFjdEhlaWdodFwiLFxuICBcIkltcGFjdE9mZnNldFwiLFxuXSk7XG5cbi8qKlxuICogTWV0cmljcyB0aGF0IHVzZSBhbmdsZSB1bml0cy5cbiAqL1xuZXhwb3J0IGNvbnN0IEFOR0xFX01FVFJJQ1MgPSBuZXcgU2V0KFtcbiAgXCJBdHRhY2tBbmdsZVwiLFxuICBcIkNsdWJQYXRoXCIsXG4gIFwiRmFjZUFuZ2xlXCIsXG4gIFwiRmFjZVRvUGF0aFwiLFxuICBcIkR5bmFtaWNMb2Z0XCIsXG4gIFwiTGF1bmNoQW5nbGVcIixcbiAgXCJMYXVuY2hEaXJlY3Rpb25cIixcbiAgXCJMYW5kaW5nQW5nbGVcIixcbl0pO1xuXG4vKipcbiAqIE1ldHJpY3MgdGhhdCB1c2Ugc3BlZWQgdW5pdHMuXG4gKi9cbmV4cG9ydCBjb25zdCBTUEVFRF9NRVRSSUNTID0gbmV3IFNldChbXG4gIFwiQ2x1YlNwZWVkXCIsXG4gIFwiQmFsbFNwZWVkXCIsXG5dKTtcblxuLyoqXG4gKiBEZWZhdWx0IHVuaXQgc3lzdGVtIChJbXBlcmlhbCAtIHlhcmRzL2RlZ3JlZXMpLlxuICovXG5leHBvcnQgY29uc3QgREVGQVVMVF9VTklUX1NZU1RFTTogVW5pdFN5c3RlbSA9IFVOSVRfU1lTVEVNU1tcIjc4OTAxMlwiXTtcblxuLyoqXG4gKiBTcGVlZCB1bml0IGRpc3BsYXkgbGFiZWxzIGZvciBDU1YgaGVhZGVycy5cbiAqL1xuZXhwb3J0IGNvbnN0IFNQRUVEX0xBQkVMUzogUmVjb3JkPFNwZWVkVW5pdCwgc3RyaW5nPiA9IHtcbiAgXCJtcGhcIjogXCJtcGhcIixcbiAgXCJtL3NcIjogXCJtL3NcIixcbn07XG5cbi8qKlxuICogRGlzdGFuY2UgdW5pdCBkaXNwbGF5IGxhYmVscyBmb3IgQ1NWIGhlYWRlcnMuXG4gKi9cbmV4cG9ydCBjb25zdCBESVNUQU5DRV9MQUJFTFM6IFJlY29yZDxEaXN0YW5jZVVuaXQsIHN0cmluZz4gPSB7XG4gIFwieWFyZHNcIjogXCJ5ZHNcIixcbiAgXCJtZXRlcnNcIjogXCJtXCIsXG59O1xuXG4vKipcbiAqIFNtYWxsIGRpc3RhbmNlIHVuaXQgZGlzcGxheSBsYWJlbHMgZm9yIENTViBoZWFkZXJzLlxuICovXG5leHBvcnQgY29uc3QgU01BTExfRElTVEFOQ0VfTEFCRUxTOiBSZWNvcmQ8U21hbGxEaXN0YW5jZVVuaXQsIHN0cmluZz4gPSB7XG4gIFwiaW5jaGVzXCI6IFwiaW5cIixcbiAgXCJjbVwiOiBcImNtXCIsXG59O1xuXG4vKipcbiAqIE1pZ3JhdGUgYSBsZWdhY3kgdW5pdFByZWZlcmVuY2Ugc3RyaW5nIHRvIGEgVW5pdENob2ljZSBvYmplY3QuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtaWdyYXRlTGVnYWN5UHJlZihzdG9yZWQ6IHN0cmluZyB8IHVuZGVmaW5lZCk6IFVuaXRDaG9pY2Uge1xuICBzd2l0Y2ggKHN0b3JlZCkge1xuICAgIGNhc2UgXCJtZXRyaWNcIjpcbiAgICAgIHJldHVybiB7IHNwZWVkOiBcIm0vc1wiLCBkaXN0YW5jZTogXCJtZXRlcnNcIiB9O1xuICAgIGNhc2UgXCJoeWJyaWRcIjpcbiAgICAgIHJldHVybiB7IHNwZWVkOiBcIm1waFwiLCBkaXN0YW5jZTogXCJtZXRlcnNcIiB9O1xuICAgIGNhc2UgXCJpbXBlcmlhbFwiOlxuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4geyBzcGVlZDogXCJtcGhcIiwgZGlzdGFuY2U6IFwieWFyZHNcIiB9O1xuICB9XG59XG5cbi8qKlxuICogRml4ZWQgdW5pdCBsYWJlbHMgZm9yIG1ldHJpY3Mgd2hvc2UgdW5pdHMgZG9uJ3QgdmFyeSBieSBwcmVmZXJlbmNlLlxuICovXG5leHBvcnQgY29uc3QgRklYRURfVU5JVF9MQUJFTFM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XG4gIFNwaW5SYXRlOiBcInJwbVwiLFxuICBIYW5nVGltZTogXCJzXCIsXG4gIFRlbXBvOiBcInNcIixcbiAgSW1wYWN0SGVpZ2h0OiBcIm1tXCIsXG4gIEltcGFjdE9mZnNldDogXCJtbVwiLFxufTtcblxuLyoqXG4gKiBFeHRyYWN0IG5kXyogcGFyYW1ldGVycyBmcm9tIG1ldGFkYXRhX3BhcmFtcy5cbiAqIFxuICogQHBhcmFtIG1ldGFkYXRhUGFyYW1zIC0gVGhlIG1ldGFkYXRhX3BhcmFtcyBvYmplY3QgZnJvbSBTZXNzaW9uRGF0YVxuICogQHJldHVybnMgT2JqZWN0IG1hcHBpbmcgbWV0cmljIGdyb3VwIElEcyB0byB1bml0IHN5c3RlbSBJRHNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV4dHJhY3RVbml0UGFyYW1zKFxuICBtZXRhZGF0YVBhcmFtczogUmVjb3JkPHN0cmluZywgc3RyaW5nPlxuKTogUmVjb3JkPHN0cmluZywgVW5pdFN5c3RlbUlkPiB7XG4gIGNvbnN0IHJlc3VsdDogUmVjb3JkPHN0cmluZywgVW5pdFN5c3RlbUlkPiA9IHt9O1xuXG4gIGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKG1ldGFkYXRhUGFyYW1zKSkge1xuICAgIGNvbnN0IG1hdGNoID0ga2V5Lm1hdGNoKC9ebmRfKFthLXowLTldKykkL2kpO1xuICAgIGlmIChtYXRjaCkge1xuICAgICAgY29uc3QgZ3JvdXBLZXkgPSBtYXRjaFsxXS50b0xvd2VyQ2FzZSgpO1xuICAgICAgcmVzdWx0W2dyb3VwS2V5XSA9IHZhbHVlIGFzIFVuaXRTeXN0ZW1JZDtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufVxuXG4vKipcbiAqIERldGVybWluZSB0aGUgdW5pdCBzeXN0ZW0gSUQgZnJvbSBtZXRhZGF0YSBwYXJhbXMuXG4gKiBVc2VzIG5kXzAwMSBhcyBwcmltYXJ5LCBmYWxscyBiYWNrIHRvIGRlZmF1bHQuXG4gKiBcbiAqIEBwYXJhbSBtZXRhZGF0YVBhcmFtcyAtIFRoZSBtZXRhZGF0YV9wYXJhbXMgb2JqZWN0XG4gKiBAcmV0dXJucyBUaGUgdW5pdCBzeXN0ZW0gSUQgc3RyaW5nXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRVbml0U3lzdGVtSWQoXG4gIG1ldGFkYXRhUGFyYW1zOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+XG4pOiBVbml0U3lzdGVtSWQge1xuICBjb25zdCB1bml0UGFyYW1zID0gZXh0cmFjdFVuaXRQYXJhbXMobWV0YWRhdGFQYXJhbXMpO1xuICByZXR1cm4gdW5pdFBhcmFtc1tcIjAwMVwiXSB8fCBcIjc4OTAxMlwiOyAvLyBEZWZhdWx0IHRvIEltcGVyaWFsXG59XG5cbi8qKlxuICogR2V0IHRoZSBmdWxsIHVuaXQgc3lzdGVtIGNvbmZpZ3VyYXRpb24uXG4gKiBcbiAqIEBwYXJhbSBtZXRhZGF0YVBhcmFtcyAtIFRoZSBtZXRhZGF0YV9wYXJhbXMgb2JqZWN0XG4gKiBAcmV0dXJucyBUaGUgVW5pdFN5c3RlbSBjb25maWd1cmF0aW9uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRVbml0U3lzdGVtKFxuICBtZXRhZGF0YVBhcmFtczogUmVjb3JkPHN0cmluZywgc3RyaW5nPlxuKTogVW5pdFN5c3RlbSB7XG4gIGNvbnN0IGlkID0gZ2V0VW5pdFN5c3RlbUlkKG1ldGFkYXRhUGFyYW1zKTtcbiAgcmV0dXJuIFVOSVRfU1lTVEVNU1tpZF0gfHwgREVGQVVMVF9VTklUX1NZU1RFTTtcbn1cblxuLyoqXG4gKiBHZXQgdGhlIHVuaXQgc3lzdGVtIHJlcHJlc2VudGluZyB3aGF0IHRoZSBBUEkgYWN0dWFsbHkgcmV0dXJucy5cbiAqIFRoZSBBUEkgYWx3YXlzIHJldHVybnMgc3BlZWQgaW4gbS9zIGFuZCBkaXN0YW5jZSBpbiBtZXRlcnMsXG4gKiBidXQgdGhlIGFuZ2xlIHVuaXQgZGVwZW5kcyBvbiB0aGUgcmVwb3J0J3MgbmRfMDAxIHBhcmFtZXRlci5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEFwaVNvdXJjZVVuaXRTeXN0ZW0oXG4gIG1ldGFkYXRhUGFyYW1zOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+XG4pOiBVbml0U3lzdGVtIHtcbiAgY29uc3QgcmVwb3J0U3lzdGVtID0gZ2V0VW5pdFN5c3RlbShtZXRhZGF0YVBhcmFtcyk7XG4gIHJldHVybiB7XG4gICAgaWQ6IFwiYXBpXCIgYXMgVW5pdFN5c3RlbUlkLFxuICAgIG5hbWU6IFwiQVBJIFNvdXJjZVwiLFxuICAgIGRpc3RhbmNlVW5pdDogXCJtZXRlcnNcIixcbiAgICBhbmdsZVVuaXQ6IHJlcG9ydFN5c3RlbS5hbmdsZVVuaXQsXG4gICAgc3BlZWRVbml0OiBcIm0vc1wiLFxuICB9O1xufVxuXG4vKipcbiAqIEdldCB0aGUgdW5pdCBsYWJlbCBmb3IgYSBtZXRyaWMgYmFzZWQgb24gdXNlcidzIHVuaXQgY2hvaWNlLlxuICogUmV0dXJucyBlbXB0eSBzdHJpbmcgZm9yIGRpbWVuc2lvbmxlc3MgbWV0cmljcyAoZS5nLiBTbWFzaEZhY3RvciwgU3BpblJhdGUpLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0TWV0cmljVW5pdExhYmVsKFxuICBtZXRyaWNOYW1lOiBzdHJpbmcsXG4gIHVuaXRDaG9pY2U6IFVuaXRDaG9pY2UgPSBERUZBVUxUX1VOSVRfQ0hPSUNFXG4pOiBzdHJpbmcge1xuICBpZiAobWV0cmljTmFtZSBpbiBGSVhFRF9VTklUX0xBQkVMUykgcmV0dXJuIEZJWEVEX1VOSVRfTEFCRUxTW21ldHJpY05hbWVdO1xuICBpZiAoU1BFRURfTUVUUklDUy5oYXMobWV0cmljTmFtZSkpIHJldHVybiBTUEVFRF9MQUJFTFNbdW5pdENob2ljZS5zcGVlZF07XG4gIGlmIChTTUFMTF9ESVNUQU5DRV9NRVRSSUNTLmhhcyhtZXRyaWNOYW1lKSkgcmV0dXJuIFNNQUxMX0RJU1RBTkNFX0xBQkVMU1tnZXRTbWFsbERpc3RhbmNlVW5pdCh1bml0Q2hvaWNlKV07XG4gIGlmIChESVNUQU5DRV9NRVRSSUNTLmhhcyhtZXRyaWNOYW1lKSkgcmV0dXJuIERJU1RBTkNFX0xBQkVMU1t1bml0Q2hvaWNlLmRpc3RhbmNlXTtcbiAgaWYgKEFOR0xFX01FVFJJQ1MuaGFzKG1ldHJpY05hbWUpKSByZXR1cm4gXCJcdTAwQjBcIjtcbiAgcmV0dXJuIFwiXCI7XG59XG5cbi8qKlxuICogQ29udmVydCBhIGRpc3RhbmNlIHZhbHVlIGJldHdlZW4gdW5pdHMuXG4gKiBcbiAqIEBwYXJhbSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byBjb252ZXJ0XG4gKiBAcGFyYW0gZnJvbVVuaXQgLSBTb3VyY2UgdW5pdCAoXCJ5YXJkc1wiIG9yIFwibWV0ZXJzXCIpXG4gKiBAcGFyYW0gdG9Vbml0IC0gVGFyZ2V0IHVuaXQgKFwieWFyZHNcIiBvciBcIm1ldGVyc1wiKVxuICogQHJldHVybnMgQ29udmVydGVkIHZhbHVlLCBvciBvcmlnaW5hbCBpZiB1bml0cyBtYXRjaFxuICovXG5leHBvcnQgZnVuY3Rpb24gY29udmVydERpc3RhbmNlKFxuICB2YWx1ZTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbCxcbiAgZnJvbVVuaXQ6IFwieWFyZHNcIiB8IFwibWV0ZXJzXCIsXG4gIHRvVW5pdDogXCJ5YXJkc1wiIHwgXCJtZXRlcnNcIlxuKTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbCB7XG4gIGlmICh2YWx1ZSA9PT0gbnVsbCB8fCB2YWx1ZSA9PT0gXCJcIikgcmV0dXJuIHZhbHVlO1xuXG4gIGNvbnN0IG51bVZhbHVlID0gdHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiID8gcGFyc2VGbG9hdCh2YWx1ZSkgOiB2YWx1ZTtcbiAgaWYgKGlzTmFOKG51bVZhbHVlKSkgcmV0dXJuIHZhbHVlO1xuXG4gIGlmIChmcm9tVW5pdCA9PT0gdG9Vbml0KSByZXR1cm4gbnVtVmFsdWU7XG5cbiAgLy8gQ29udmVydCB0byBtZXRlcnMgZmlyc3QsIHRoZW4gdG8gdGFyZ2V0IHVuaXRcbiAgY29uc3QgaW5NZXRlcnMgPSBmcm9tVW5pdCA9PT0gXCJ5YXJkc1wiID8gbnVtVmFsdWUgKiAwLjkxNDQgOiBudW1WYWx1ZTtcbiAgcmV0dXJuIHRvVW5pdCA9PT0gXCJ5YXJkc1wiID8gaW5NZXRlcnMgLyAwLjkxNDQgOiBpbk1ldGVycztcbn1cblxuLyoqXG4gKiBDb252ZXJ0IGFuIGFuZ2xlIHZhbHVlIGJldHdlZW4gdW5pdHMuXG4gKiBcbiAqIEBwYXJhbSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byBjb252ZXJ0XG4gKiBAcGFyYW0gZnJvbVVuaXQgLSBTb3VyY2UgdW5pdCAoXCJkZWdyZWVzXCIgb3IgXCJyYWRpYW5zXCIpXG4gKiBAcGFyYW0gdG9Vbml0IC0gVGFyZ2V0IHVuaXQgKFwiZGVncmVlc1wiIG9yIFwicmFkaWFuc1wiKVxuICogQHJldHVybnMgQ29udmVydGVkIHZhbHVlLCBvciBvcmlnaW5hbCBpZiB1bml0cyBtYXRjaFxuICovXG5leHBvcnQgZnVuY3Rpb24gY29udmVydEFuZ2xlKFxuICB2YWx1ZTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbCxcbiAgZnJvbVVuaXQ6IFwiZGVncmVlc1wiIHwgXCJyYWRpYW5zXCIsXG4gIHRvVW5pdDogXCJkZWdyZWVzXCIgfCBcInJhZGlhbnNcIlxuKTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbCB7XG4gIGlmICh2YWx1ZSA9PT0gbnVsbCB8fCB2YWx1ZSA9PT0gXCJcIikgcmV0dXJuIHZhbHVlO1xuXG4gIGNvbnN0IG51bVZhbHVlID0gdHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiID8gcGFyc2VGbG9hdCh2YWx1ZSkgOiB2YWx1ZTtcbiAgaWYgKGlzTmFOKG51bVZhbHVlKSkgcmV0dXJuIHZhbHVlO1xuXG4gIGlmIChmcm9tVW5pdCA9PT0gdG9Vbml0KSByZXR1cm4gbnVtVmFsdWU7XG5cbiAgLy8gQ29udmVydCB0byBkZWdyZWVzIGZpcnN0LCB0aGVuIHRvIHRhcmdldCB1bml0XG4gIGNvbnN0IGluRGVncmVlcyA9IGZyb21Vbml0ID09PSBcImRlZ3JlZXNcIiA/IG51bVZhbHVlIDogKG51bVZhbHVlICogMTgwIC8gTWF0aC5QSSk7XG4gIHJldHVybiB0b1VuaXQgPT09IFwiZGVncmVlc1wiID8gaW5EZWdyZWVzIDogKGluRGVncmVlcyAqIE1hdGguUEkgLyAxODApO1xufVxuXG4vKipcbiAqIENvbnZlcnQgYSBzcGVlZCB2YWx1ZSBiZXR3ZWVuIHVuaXRzLlxuICpcbiAqIEBwYXJhbSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byBjb252ZXJ0XG4gKiBAcGFyYW0gZnJvbVVuaXQgLSBTb3VyY2UgdW5pdCAoXCJtcGhcIiwgXCJrbS9oXCIsIG9yIFwibS9zXCIpXG4gKiBAcGFyYW0gdG9Vbml0IC0gVGFyZ2V0IHVuaXQgKFwibXBoXCIsIFwia20vaFwiLCBvciBcIm0vc1wiKVxuICogQHJldHVybnMgQ29udmVydGVkIHZhbHVlLCBvciBvcmlnaW5hbCBpZiB1bml0cyBtYXRjaFxuICovXG5leHBvcnQgZnVuY3Rpb24gY29udmVydFNwZWVkKFxuICB2YWx1ZTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbCxcbiAgZnJvbVVuaXQ6IFwibXBoXCIgfCBcImttL2hcIiB8IFwibS9zXCIsXG4gIHRvVW5pdDogXCJtcGhcIiB8IFwia20vaFwiIHwgXCJtL3NcIlxuKTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbCB7XG4gIGlmICh2YWx1ZSA9PT0gbnVsbCB8fCB2YWx1ZSA9PT0gXCJcIikgcmV0dXJuIHZhbHVlO1xuXG4gIGNvbnN0IG51bVZhbHVlID0gdHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiID8gcGFyc2VGbG9hdCh2YWx1ZSkgOiB2YWx1ZTtcbiAgaWYgKGlzTmFOKG51bVZhbHVlKSkgcmV0dXJuIHZhbHVlO1xuXG4gIGlmIChmcm9tVW5pdCA9PT0gdG9Vbml0KSByZXR1cm4gbnVtVmFsdWU7XG5cbiAgLy8gQ29udmVydCB0byBtcGggZmlyc3QsIHRoZW4gdG8gdGFyZ2V0IHVuaXRcbiAgbGV0IGluTXBoOiBudW1iZXI7XG4gIGlmIChmcm9tVW5pdCA9PT0gXCJtcGhcIikgaW5NcGggPSBudW1WYWx1ZTtcbiAgZWxzZSBpZiAoZnJvbVVuaXQgPT09IFwia20vaFwiKSBpbk1waCA9IG51bVZhbHVlIC8gMS42MDkzNDQ7XG4gIGVsc2UgaW5NcGggPSBudW1WYWx1ZSAqIDIuMjM2OTQ7IC8vIG0vcyB0byBtcGhcblxuICBpZiAodG9Vbml0ID09PSBcIm1waFwiKSByZXR1cm4gaW5NcGg7XG4gIGlmICh0b1VuaXQgPT09IFwia20vaFwiKSByZXR1cm4gaW5NcGggKiAxLjYwOTM0NDtcbiAgcmV0dXJuIGluTXBoIC8gMi4yMzY5NDsgLy8gbXBoIHRvIG0vc1xufVxuXG4vKipcbiAqIEdldCB0aGUgc21hbGwgZGlzdGFuY2UgdW5pdCBiYXNlZCBvbiB0aGUgdXNlcidzIGRpc3RhbmNlIGNob2ljZS5cbiAqIFlhcmRzIHVzZXJzIHNlZSBpbmNoZXM7IG1ldGVycyB1c2VycyBzZWUgY20uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRTbWFsbERpc3RhbmNlVW5pdCh1bml0Q2hvaWNlOiBVbml0Q2hvaWNlID0gREVGQVVMVF9VTklUX0NIT0lDRSk6IFNtYWxsRGlzdGFuY2VVbml0IHtcbiAgcmV0dXJuIHVuaXRDaG9pY2UuZGlzdGFuY2UgPT09IFwieWFyZHNcIiA/IFwiaW5jaGVzXCIgOiBcImNtXCI7XG59XG5cbi8qKlxuICogQ29udmVydCBhIGRpc3RhbmNlIHZhbHVlIGZyb20gbWV0ZXJzIHRvIGEgc21hbGwgZGlzdGFuY2UgdW5pdCAoaW5jaGVzIG9yIGNtKS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbnZlcnRTbWFsbERpc3RhbmNlKFxuICB2YWx1ZTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbCxcbiAgdG9TbWFsbFVuaXQ6IFNtYWxsRGlzdGFuY2VVbml0XG4pOiBudW1iZXIgfCBzdHJpbmcgfCBudWxsIHtcbiAgaWYgKHZhbHVlID09PSBudWxsIHx8IHZhbHVlID09PSBcIlwiKSByZXR1cm4gdmFsdWU7XG5cbiAgY29uc3QgbnVtVmFsdWUgPSB0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCIgPyBwYXJzZUZsb2F0KHZhbHVlKSA6IHZhbHVlO1xuICBpZiAoaXNOYU4obnVtVmFsdWUpKSByZXR1cm4gdmFsdWU7XG5cbiAgcmV0dXJuIHRvU21hbGxVbml0ID09PSBcImluY2hlc1wiID8gbnVtVmFsdWUgKiAzOS4zNzAxIDogbnVtVmFsdWUgKiAxMDA7XG59XG5cbi8qKlxuICogQ29udmVydCBhIGRpc3RhbmNlIHZhbHVlIGZyb20gbWV0ZXJzIHRvIG1pbGxpbWV0ZXJzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gY29udmVydE1pbGxpbWV0ZXJzKFxuICB2YWx1ZTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbFxuKTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbCB7XG4gIGlmICh2YWx1ZSA9PT0gbnVsbCB8fCB2YWx1ZSA9PT0gXCJcIikgcmV0dXJuIHZhbHVlO1xuXG4gIGNvbnN0IG51bVZhbHVlID0gdHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiID8gcGFyc2VGbG9hdCh2YWx1ZSkgOiB2YWx1ZTtcbiAgaWYgKGlzTmFOKG51bVZhbHVlKSkgcmV0dXJuIHZhbHVlO1xuXG4gIHJldHVybiBudW1WYWx1ZSAqIDEwMDA7XG59XG5cbi8qKlxuICogTm9ybWFsaXplIGEgbWV0cmljIHZhbHVlIGJhc2VkIG9uIHVuaXQgc3lzdGVtIGFsaWdubWVudCBhbmQgdXNlcidzIHVuaXQgY2hvaWNlLlxuICpcbiAqIENvbnZlcnRzIHZhbHVlcyBmcm9tIHRoZSBzb3VyY2UgdW5pdHMgdG8gdGFyZ2V0IG91dHB1dCB1bml0czpcbiAqIC0gRGlzdGFuY2U6IHlhcmRzIG9yIG1ldGVycyAocGVyIHVuaXRDaG9pY2UuZGlzdGFuY2UpXG4gKiAtIEFuZ2xlczogYWx3YXlzIGRlZ3JlZXNcbiAqIC0gU3BlZWQ6IG1waCBvciBtL3MgKHBlciB1bml0Q2hvaWNlLnNwZWVkKVxuICpcbiAqIEBwYXJhbSB2YWx1ZSAtIFRoZSByYXcgbWV0cmljIHZhbHVlXG4gKiBAcGFyYW0gbWV0cmljTmFtZSAtIFRoZSBuYW1lIG9mIHRoZSBtZXRyaWMgYmVpbmcgbm9ybWFsaXplZFxuICogQHBhcmFtIHJlcG9ydFVuaXRTeXN0ZW0gLSBUaGUgdW5pdCBzeXN0ZW0gdXNlZCBpbiB0aGUgc291cmNlIGRhdGFcbiAqIEBwYXJhbSB1bml0Q2hvaWNlIC0gVXNlcidzIHVuaXQgY2hvaWNlIChkZWZhdWx0cyB0byBtcGggKyB5YXJkcylcbiAqIEByZXR1cm5zIE5vcm1hbGl6ZWQgdmFsdWUgYXMgbnVtYmVyIG9yIHN0cmluZyAobnVsbCBpZiBpbnZhbGlkKVxuICovXG5leHBvcnQgZnVuY3Rpb24gbm9ybWFsaXplTWV0cmljVmFsdWUoXG4gIHZhbHVlOiBNZXRyaWNWYWx1ZSxcbiAgbWV0cmljTmFtZTogc3RyaW5nLFxuICByZXBvcnRVbml0U3lzdGVtOiBVbml0U3lzdGVtLFxuICB1bml0Q2hvaWNlOiBVbml0Q2hvaWNlID0gREVGQVVMVF9VTklUX0NIT0lDRVxuKTogTWV0cmljVmFsdWUge1xuICBjb25zdCBudW1WYWx1ZSA9IHBhcnNlTnVtZXJpY1ZhbHVlKHZhbHVlKTtcbiAgaWYgKG51bVZhbHVlID09PSBudWxsKSByZXR1cm4gdmFsdWU7XG5cbiAgbGV0IGNvbnZlcnRlZDogbnVtYmVyO1xuXG4gIGlmIChNSUxMSU1FVEVSX01FVFJJQ1MuaGFzKG1ldHJpY05hbWUpKSB7XG4gICAgY29udmVydGVkID0gY29udmVydE1pbGxpbWV0ZXJzKG51bVZhbHVlKSBhcyBudW1iZXI7XG4gIH0gZWxzZSBpZiAoU01BTExfRElTVEFOQ0VfTUVUUklDUy5oYXMobWV0cmljTmFtZSkpIHtcbiAgICBjb252ZXJ0ZWQgPSBjb252ZXJ0U21hbGxEaXN0YW5jZShcbiAgICAgIG51bVZhbHVlLFxuICAgICAgZ2V0U21hbGxEaXN0YW5jZVVuaXQodW5pdENob2ljZSlcbiAgICApIGFzIG51bWJlcjtcbiAgfSBlbHNlIGlmIChESVNUQU5DRV9NRVRSSUNTLmhhcyhtZXRyaWNOYW1lKSkge1xuICAgIGNvbnZlcnRlZCA9IGNvbnZlcnREaXN0YW5jZShcbiAgICAgIG51bVZhbHVlLFxuICAgICAgcmVwb3J0VW5pdFN5c3RlbS5kaXN0YW5jZVVuaXQsXG4gICAgICB1bml0Q2hvaWNlLmRpc3RhbmNlXG4gICAgKSBhcyBudW1iZXI7XG4gIH0gZWxzZSBpZiAoQU5HTEVfTUVUUklDUy5oYXMobWV0cmljTmFtZSkpIHtcbiAgICBjb252ZXJ0ZWQgPSBjb252ZXJ0QW5nbGUoXG4gICAgICBudW1WYWx1ZSxcbiAgICAgIHJlcG9ydFVuaXRTeXN0ZW0uYW5nbGVVbml0LFxuICAgICAgXCJkZWdyZWVzXCJcbiAgICApIGFzIG51bWJlcjtcbiAgfSBlbHNlIGlmIChTUEVFRF9NRVRSSUNTLmhhcyhtZXRyaWNOYW1lKSkge1xuICAgIGNvbnZlcnRlZCA9IGNvbnZlcnRTcGVlZChcbiAgICAgIG51bVZhbHVlLFxuICAgICAgcmVwb3J0VW5pdFN5c3RlbS5zcGVlZFVuaXQsXG4gICAgICB1bml0Q2hvaWNlLnNwZWVkXG4gICAgKSBhcyBudW1iZXI7XG4gIH0gZWxzZSB7XG4gICAgY29udmVydGVkID0gbnVtVmFsdWU7XG4gIH1cblxuICAvLyBTcGluUmF0ZTogcm91bmQgdG8gd2hvbGUgbnVtYmVyc1xuICBpZiAobWV0cmljTmFtZSA9PT0gXCJTcGluUmF0ZVwiKSByZXR1cm4gTWF0aC5yb3VuZChjb252ZXJ0ZWQpO1xuXG4gIC8vIEltcGFjdCBsb2NhdGlvbiBtZXRyaWNzIGFyZSBkaXNwbGF5ZWQgYXMgd2hvbGUgbWlsbGltZXRlcnMuXG4gIGlmIChNSUxMSU1FVEVSX01FVFJJQ1MuaGFzKG1ldHJpY05hbWUpKSByZXR1cm4gTWF0aC5yb3VuZChjb252ZXJ0ZWQpO1xuXG4gIC8vIFNtYXNoRmFjdG9yIC8gVGVtcG86IHJvdW5kIHRvIDIgZGVjaW1hbCBwbGFjZXNcbiAgaWYgKG1ldHJpY05hbWUgPT09IFwiU21hc2hGYWN0b3JcIiB8fCBtZXRyaWNOYW1lID09PSBcIlRlbXBvXCIpXG4gICAgcmV0dXJuIE1hdGgucm91bmQoY29udmVydGVkICogMTAwKSAvIDEwMDtcblxuICAvLyBSb3VuZCB0byAxIGRlY2ltYWwgcGxhY2UgZm9yIGNvbnNpc3RlbmN5XG4gIHJldHVybiBNYXRoLnJvdW5kKGNvbnZlcnRlZCAqIDEwKSAvIDEwO1xufVxuXG4vKipcbiAqIFBhcnNlIGEgbnVtZXJpYyB2YWx1ZSBmcm9tIE1ldHJpY1ZhbHVlIHR5cGUuXG4gKi9cbmZ1bmN0aW9uIHBhcnNlTnVtZXJpY1ZhbHVlKHZhbHVlOiBNZXRyaWNWYWx1ZSk6IG51bWJlciB8IG51bGwge1xuICBpZiAodmFsdWUgPT09IG51bGwgfHwgdmFsdWUgPT09IFwiXCIpIHJldHVybiBudWxsO1xuICBpZiAodHlwZW9mIHZhbHVlID09PSBcIm51bWJlclwiKSByZXR1cm4gaXNOYU4odmFsdWUpID8gbnVsbCA6IHZhbHVlO1xuICBcbiAgY29uc3QgcGFyc2VkID0gcGFyc2VGbG9hdCh2YWx1ZSk7XG4gIHJldHVybiBpc05hTihwYXJzZWQpID8gbnVsbCA6IHBhcnNlZDtcbn1cblxuZXhwb3J0IHR5cGUgTWV0cmljVmFsdWUgPSBzdHJpbmcgfCBudW1iZXIgfCBudWxsO1xuIiwgIi8qKlxuICogQ1NWIHdyaXRlciBmb3IgVHJhY2tQdWxsIHNlc3Npb24gZGF0YS5cbiAqIEltcGxlbWVudHMgY29yZSBjb2x1bW5zOiBEYXRlLCBDbHViLCBTaG90ICMsIFR5cGVcbiAqL1xuXG5pbXBvcnQgdHlwZSB7IFNlc3Npb25EYXRhLCBDbHViR3JvdXAsIFNob3QgfSBmcm9tIFwiLi4vbW9kZWxzL3R5cGVzXCI7XG5pbXBvcnQge1xuICBnZXRBcGlTb3VyY2VVbml0U3lzdGVtLFxuICBnZXRNZXRyaWNVbml0TGFiZWwsXG4gIG5vcm1hbGl6ZU1ldHJpY1ZhbHVlLFxuICBERUZBVUxUX1VOSVRfQ0hPSUNFLFxuICB0eXBlIFVuaXRDaG9pY2UsXG59IGZyb20gXCIuL3VuaXRfbm9ybWFsaXphdGlvblwiO1xuaW1wb3J0IHsgTUVUUklDX0RJU1BMQVlfTkFNRVMgfSBmcm9tIFwiLi9jb25zdGFudHNcIjtcblxuY29uc3QgTUVUUklDX0NPTFVNTl9PUkRFUjogc3RyaW5nW10gPSBbXG4gIC8vIFNwZWVkICYgRWZmaWNpZW5jeVxuICBcIkNsdWJTcGVlZFwiLCBcIkJhbGxTcGVlZFwiLCBcIlNtYXNoRmFjdG9yXCIsXG4gIC8vIENsdWIgRGVsaXZlcnlcbiAgXCJBdHRhY2tBbmdsZVwiLCBcIkNsdWJQYXRoXCIsIFwiRmFjZUFuZ2xlXCIsIFwiRmFjZVRvUGF0aFwiLCBcIlN3aW5nRGlyZWN0aW9uXCIsIFwiRHluYW1pY0xvZnRcIixcbiAgLy8gTGF1bmNoICYgU3BpblxuICBcIkxhdW5jaEFuZ2xlXCIsIFwiTGF1bmNoRGlyZWN0aW9uXCIsIFwiU3BpblJhdGVcIiwgXCJTcGluQXhpc1wiLCBcIlNwaW5Mb2Z0XCIsXG4gIC8vIERpc3RhbmNlXG4gIFwiQ2FycnlcIiwgXCJUb3RhbFwiLFxuICAvLyBEaXNwZXJzaW9uXG4gIFwiU2lkZVwiLCBcIlNpZGVUb3RhbFwiLCBcIkNhcnJ5U2lkZVwiLCBcIlRvdGFsU2lkZVwiLCBcIkN1cnZlXCIsXG4gIC8vIEJhbGwgRmxpZ2h0XG4gIFwiSGVpZ2h0XCIsIFwiTWF4SGVpZ2h0XCIsIFwiTGFuZGluZ0FuZ2xlXCIsIFwiSGFuZ1RpbWVcIixcbiAgLy8gSW1wYWN0XG4gIFwiTG93UG9pbnREaXN0YW5jZVwiLCBcIkltcGFjdEhlaWdodFwiLCBcIkltcGFjdE9mZnNldFwiLFxuICAvLyBPdGhlclxuICBcIlRlbXBvXCIsXG5dO1xuXG5mdW5jdGlvbiBnZXREaXNwbGF5TmFtZShtZXRyaWM6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBNRVRSSUNfRElTUExBWV9OQU1FU1ttZXRyaWNdID8/IG1ldHJpYztcbn1cblxuZnVuY3Rpb24gZ2V0Q29sdW1uTmFtZShtZXRyaWM6IHN0cmluZywgdW5pdENob2ljZTogVW5pdENob2ljZSk6IHN0cmluZyB7XG4gIGNvbnN0IGRpc3BsYXlOYW1lID0gZ2V0RGlzcGxheU5hbWUobWV0cmljKTtcbiAgY29uc3QgdW5pdExhYmVsID0gZ2V0TWV0cmljVW5pdExhYmVsKG1ldHJpYywgdW5pdENob2ljZSk7XG4gIHJldHVybiB1bml0TGFiZWwgPyBgJHtkaXNwbGF5TmFtZX0gKCR7dW5pdExhYmVsfSlgIDogZGlzcGxheU5hbWU7XG59XG5cbmZ1bmN0aW9uIGdlbmVyYXRlRmlsZW5hbWUoc2Vzc2lvbjogU2Vzc2lvbkRhdGEpOiBzdHJpbmcge1xuICByZXR1cm4gYFNob3REYXRhXyR7c2Vzc2lvbi5kYXRlfS5jc3ZgO1xufVxuXG5mdW5jdGlvbiBvcmRlck1ldHJpY3NCeVByaW9yaXR5KFxuICBhbGxNZXRyaWNzOiBzdHJpbmdbXSxcbiAgcHJpb3JpdHlPcmRlcjogc3RyaW5nW11cbik6IHN0cmluZ1tdIHtcbiAgY29uc3QgcmVzdWx0OiBzdHJpbmdbXSA9IFtdO1xuICBjb25zdCBzZWVuID0gbmV3IFNldDxzdHJpbmc+KCk7XG5cbiAgZm9yIChjb25zdCBtZXRyaWMgb2YgcHJpb3JpdHlPcmRlcikge1xuICAgIGlmIChhbGxNZXRyaWNzLmluY2x1ZGVzKG1ldHJpYykgJiYgIXNlZW4uaGFzKG1ldHJpYykpIHtcbiAgICAgIHJlc3VsdC5wdXNoKG1ldHJpYyk7XG4gICAgICBzZWVuLmFkZChtZXRyaWMpO1xuICAgIH1cbiAgfVxuXG4gIGZvciAoY29uc3QgbWV0cmljIG9mIGFsbE1ldHJpY3MpIHtcbiAgICBpZiAoIXNlZW4uaGFzKG1ldHJpYykpIHtcbiAgICAgIHJlc3VsdC5wdXNoKG1ldHJpYyk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gaGFzVGFncyhzZXNzaW9uOiBTZXNzaW9uRGF0YSk6IGJvb2xlYW4ge1xuICByZXR1cm4gc2Vzc2lvbi5jbHViX2dyb3Vwcy5zb21lKChjbHViKSA9PlxuICAgIGNsdWIuc2hvdHMuc29tZSgoc2hvdCkgPT4gc2hvdC50YWcgIT09IHVuZGVmaW5lZCAmJiBzaG90LnRhZyAhPT0gXCJcIilcbiAgKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHdyaXRlQ3N2KFxuICBzZXNzaW9uOiBTZXNzaW9uRGF0YSxcbiAgaW5jbHVkZUF2ZXJhZ2VzID0gdHJ1ZSxcbiAgbWV0cmljT3JkZXI/OiBzdHJpbmdbXSxcbiAgdW5pdENob2ljZTogVW5pdENob2ljZSA9IERFRkFVTFRfVU5JVF9DSE9JQ0UsXG4gIGhpdHRpbmdTdXJmYWNlPzogXCJHcmFzc1wiIHwgXCJNYXRcIlxuKTogc3RyaW5nIHtcbiAgY29uc3Qgb3JkZXJlZE1ldHJpY3MgPSBvcmRlck1ldHJpY3NCeVByaW9yaXR5KFxuICAgIHNlc3Npb24ubWV0cmljX25hbWVzLFxuICAgIG1ldHJpY09yZGVyID8/IE1FVFJJQ19DT0xVTU5fT1JERVJcbiAgKTtcblxuICBjb25zdCBoZWFkZXJSb3c6IHN0cmluZ1tdID0gW1wiRGF0ZVwiLCBcIkNsdWJcIl07XG5cbiAgaWYgKGhhc1RhZ3Moc2Vzc2lvbikpIHtcbiAgICBoZWFkZXJSb3cucHVzaChcIlRhZ1wiKTtcbiAgfVxuXG4gIGhlYWRlclJvdy5wdXNoKFwiU2hvdCAjXCIsIFwiVHlwZVwiKTtcblxuICBmb3IgKGNvbnN0IG1ldHJpYyBvZiBvcmRlcmVkTWV0cmljcykge1xuICAgIGhlYWRlclJvdy5wdXNoKGdldENvbHVtbk5hbWUobWV0cmljLCB1bml0Q2hvaWNlKSk7XG4gIH1cblxuICBjb25zdCByb3dzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+W10gPSBbXTtcblxuICAvLyBTb3VyY2UgdW5pdCBzeXN0ZW06IEFQSSBhbHdheXMgcmV0dXJucyBtL3MgKyBtZXRlcnMsIGFuZ2xlIHVuaXQgZnJvbSByZXBvcnRcbiAgY29uc3QgdW5pdFN5c3RlbSA9IGdldEFwaVNvdXJjZVVuaXRTeXN0ZW0oc2Vzc2lvbi5tZXRhZGF0YV9wYXJhbXMpO1xuXG4gIGZvciAoY29uc3QgY2x1YiBvZiBzZXNzaW9uLmNsdWJfZ3JvdXBzKSB7XG4gICAgZm9yIChjb25zdCBzaG90IG9mIGNsdWIuc2hvdHMpIHtcbiAgICAgIGNvbnN0IHJvdzogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcbiAgICAgICAgRGF0ZTogc2Vzc2lvbi5kYXRlLFxuICAgICAgICBDbHViOiBjbHViLmNsdWJfbmFtZSxcbiAgICAgICAgXCJTaG90ICNcIjogU3RyaW5nKHNob3Quc2hvdF9udW1iZXIgKyAxKSxcbiAgICAgICAgVHlwZTogXCJTaG90XCIsXG4gICAgICB9O1xuXG4gICAgICBpZiAoaGFzVGFncyhzZXNzaW9uKSkge1xuICAgICAgICByb3cuVGFnID0gc2hvdC50YWcgPz8gXCJcIjtcbiAgICAgIH1cblxuICAgICAgZm9yIChjb25zdCBtZXRyaWMgb2Ygb3JkZXJlZE1ldHJpY3MpIHtcbiAgICAgICAgY29uc3QgY29sTmFtZSA9IGdldENvbHVtbk5hbWUobWV0cmljLCB1bml0Q2hvaWNlKTtcbiAgICAgICAgY29uc3QgcmF3VmFsdWUgPSBzaG90Lm1ldHJpY3NbbWV0cmljXSA/PyBcIlwiO1xuXG4gICAgICAgIGlmICh0eXBlb2YgcmF3VmFsdWUgPT09IFwic3RyaW5nXCIgfHwgdHlwZW9mIHJhd1ZhbHVlID09PSBcIm51bWJlclwiKSB7XG4gICAgICAgICAgcm93W2NvbE5hbWVdID0gU3RyaW5nKG5vcm1hbGl6ZU1ldHJpY1ZhbHVlKHJhd1ZhbHVlLCBtZXRyaWMsIHVuaXRTeXN0ZW0sIHVuaXRDaG9pY2UpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByb3dbY29sTmFtZV0gPSBcIlwiO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJvd3MucHVzaChyb3cpO1xuICAgIH1cblxuICAgIGlmIChpbmNsdWRlQXZlcmFnZXMpIHtcbiAgICAgIC8vIEdyb3VwIHNob3RzIGJ5IHRhZ1xuICAgICAgY29uc3QgdGFnR3JvdXBzID0gbmV3IE1hcDxzdHJpbmcsIFNob3RbXT4oKTtcbiAgICAgIGZvciAoY29uc3Qgc2hvdCBvZiBjbHViLnNob3RzKSB7XG4gICAgICAgIGNvbnN0IHRhZyA9IHNob3QudGFnID8/IFwiXCI7XG4gICAgICAgIGlmICghdGFnR3JvdXBzLmhhcyh0YWcpKSB0YWdHcm91cHMuc2V0KHRhZywgW10pO1xuICAgICAgICB0YWdHcm91cHMuZ2V0KHRhZykhLnB1c2goc2hvdCk7XG4gICAgICB9XG5cbiAgICAgIGZvciAoY29uc3QgW3RhZywgc2hvdHNdIG9mIHRhZ0dyb3Vwcykge1xuICAgICAgICAvLyBPbmx5IHdyaXRlIGF2ZXJhZ2Ugcm93IGlmIGdyb3VwIGhhcyAyKyBzaG90c1xuICAgICAgICBpZiAoc2hvdHMubGVuZ3RoIDwgMikgY29udGludWU7XG5cbiAgICAgICAgY29uc3QgYXZnUm93OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xuICAgICAgICAgIERhdGU6IHNlc3Npb24uZGF0ZSxcbiAgICAgICAgICBDbHViOiBjbHViLmNsdWJfbmFtZSxcbiAgICAgICAgICBcIlNob3QgI1wiOiBcIlwiLFxuICAgICAgICAgIFR5cGU6IFwiQXZlcmFnZVwiLFxuICAgICAgICB9O1xuXG4gICAgICAgIGlmIChoYXNUYWdzKHNlc3Npb24pKSB7XG4gICAgICAgICAgYXZnUm93LlRhZyA9IHRhZztcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAoY29uc3QgbWV0cmljIG9mIG9yZGVyZWRNZXRyaWNzKSB7XG4gICAgICAgICAgY29uc3QgY29sTmFtZSA9IGdldENvbHVtbk5hbWUobWV0cmljLCB1bml0Q2hvaWNlKTtcbiAgICAgICAgICBjb25zdCB2YWx1ZXMgPSBzaG90c1xuICAgICAgICAgICAgLm1hcCgocykgPT4gcy5tZXRyaWNzW21ldHJpY10pXG4gICAgICAgICAgICAuZmlsdGVyKCh2KSA9PiB2ICE9PSB1bmRlZmluZWQgJiYgdiAhPT0gXCJcIilcbiAgICAgICAgICAgIC5tYXAoKHYpID0+IHBhcnNlRmxvYXQoU3RyaW5nKHYpKSk7XG4gICAgICAgICAgY29uc3QgbnVtZXJpY1ZhbHVlcyA9IHZhbHVlcy5maWx0ZXIoKHYpID0+ICFpc05hTih2KSk7XG5cbiAgICAgICAgICBpZiAobnVtZXJpY1ZhbHVlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBhdmcgPSBudW1lcmljVmFsdWVzLnJlZHVjZSgoYSwgYikgPT4gYSArIGIsIDApIC8gbnVtZXJpY1ZhbHVlcy5sZW5ndGg7XG4gICAgICAgICAgICBjb25zdCByb3VuZGVkID0gKG1ldHJpYyA9PT0gXCJTbWFzaEZhY3RvclwiIHx8IG1ldHJpYyA9PT0gXCJUZW1wb1wiKVxuICAgICAgICAgICAgICA/IE1hdGgucm91bmQoYXZnICogMTAwKSAvIDEwMFxuICAgICAgICAgICAgICA6IE1hdGgucm91bmQoYXZnICogMTApIC8gMTA7XG4gICAgICAgICAgICBhdmdSb3dbY29sTmFtZV0gPSBTdHJpbmcobm9ybWFsaXplTWV0cmljVmFsdWUocm91bmRlZCwgbWV0cmljLCB1bml0U3lzdGVtLCB1bml0Q2hvaWNlKSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGF2Z1Jvd1tjb2xOYW1lXSA9IFwiXCI7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcm93cy5wdXNoKGF2Z1Jvdyk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgY29uc3QgbGluZXM6IHN0cmluZ1tdID0gW107XG5cbiAgaWYgKGhpdHRpbmdTdXJmYWNlICE9PSB1bmRlZmluZWQpIHtcbiAgICBsaW5lcy5wdXNoKGBIaXR0aW5nIFN1cmZhY2U6ICR7aGl0dGluZ1N1cmZhY2V9YCk7XG4gIH1cblxuICBsaW5lcy5wdXNoKGhlYWRlclJvdy5qb2luKFwiLFwiKSk7XG4gIGZvciAoY29uc3Qgcm93IG9mIHJvd3MpIHtcbiAgICBsaW5lcy5wdXNoKFxuICAgICAgaGVhZGVyUm93XG4gICAgICAgIC5tYXAoKGNvbCkgPT4ge1xuICAgICAgICAgIGNvbnN0IHZhbHVlID0gcm93W2NvbF0gPz8gXCJcIjtcbiAgICAgICAgICBpZiAodmFsdWUuaW5jbHVkZXMoXCIsXCIpIHx8IHZhbHVlLmluY2x1ZGVzKCdcIicpIHx8IHZhbHVlLmluY2x1ZGVzKFwiXFxuXCIpKSB7XG4gICAgICAgICAgICByZXR1cm4gYFwiJHt2YWx1ZS5yZXBsYWNlKC9cIi9nLCAnXCJcIicpfVwiYDtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICB9KVxuICAgICAgICAuam9pbihcIixcIilcbiAgICApO1xuICB9XG5cbiAgcmV0dXJuIGxpbmVzLmpvaW4oXCJcXG5cIik7XG59XG4iLCAiLyoqXG4gKiBTZXNzaW9uIGhpc3Rvcnkgc3RvcmFnZSBtb2R1bGUuXG4gKiBTYXZlcywgZGVkdXBsaWNhdGVzIChieSByZXBvcnRfaWQpLCBhbmQgZXZpY3RzIHNlc3Npb25zIGZyb20gY2hyb21lLnN0b3JhZ2UubG9jYWwuXG4gKi9cblxuaW1wb3J0IHR5cGUgeyBTZXNzaW9uRGF0YSwgU2Vzc2lvblNuYXBzaG90LCBIaXN0b3J5RW50cnkgfSBmcm9tIFwiLi4vbW9kZWxzL3R5cGVzXCI7XG5pbXBvcnQgeyBTVE9SQUdFX0tFWVMgfSBmcm9tIFwiLi9jb25zdGFudHNcIjtcblxuY29uc3QgTUFYX1NFU1NJT05TID0gMjA7XG5cbi8qKiBTdHJpcCByYXdfYXBpX2RhdGEgZnJvbSBhIFNlc3Npb25EYXRhIHRvIGNyZWF0ZSBhIGxpZ2h0d2VpZ2h0IHNuYXBzaG90LiAqL1xuZnVuY3Rpb24gY3JlYXRlU25hcHNob3Qoc2Vzc2lvbjogU2Vzc2lvbkRhdGEpOiBTZXNzaW9uU25hcHNob3Qge1xuICAvLyBEZXN0cnVjdHVyZSB0byBleGNsdWRlIHJhd19hcGlfZGF0YVxuICBjb25zdCB7IHJhd19hcGlfZGF0YTogXywgLi4uc25hcHNob3QgfSA9IHNlc3Npb247XG4gIHJldHVybiBzbmFwc2hvdDtcbn1cblxuLyoqXG4gKiBTYXZlIGEgc2Vzc2lvbiB0byB0aGUgcm9sbGluZyBoaXN0b3J5IGluIGNocm9tZS5zdG9yYWdlLmxvY2FsLlxuICogLSBEZWR1cGxpY2F0ZXMgYnkgcmVwb3J0X2lkIChyZXBsYWNlcyBleGlzdGluZyBlbnRyeSwgcmVmcmVzaGVzIGNhcHR1cmVkX2F0KS5cbiAqIC0gRXZpY3RzIG9sZGVzdCBlbnRyeSB3aGVuIHRoZSAyMC1zZXNzaW9uIGNhcCBpcyByZWFjaGVkLlxuICogLSBTdG9yZXMgZW50cmllcyBzb3J0ZWQgbmV3ZXN0LWZpcnN0IChkZXNjZW5kaW5nIGNhcHR1cmVkX2F0KS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNhdmVTZXNzaW9uVG9IaXN0b3J5KHNlc3Npb246IFNlc3Npb25EYXRhKTogUHJvbWlzZTx2b2lkPiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgY2hyb21lLnN0b3JhZ2UubG9jYWwuZ2V0KFxuICAgICAgW1NUT1JBR0VfS0VZUy5TRVNTSU9OX0hJU1RPUlldLFxuICAgICAgKHJlc3VsdDogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pID0+IHtcbiAgICAgICAgaWYgKGNocm9tZS5ydW50aW1lLmxhc3RFcnJvcikge1xuICAgICAgICAgIHJldHVybiByZWplY3QobmV3IEVycm9yKGNocm9tZS5ydW50aW1lLmxhc3RFcnJvci5tZXNzYWdlKSk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBleGlzdGluZyA9IChyZXN1bHRbU1RPUkFHRV9LRVlTLlNFU1NJT05fSElTVE9SWV0gYXMgSGlzdG9yeUVudHJ5W10gfCB1bmRlZmluZWQpID8/IFtdO1xuXG4gICAgICAgIC8vIFJlbW92ZSBhbnkgZXhpc3RpbmcgZW50cnkgd2l0aCB0aGUgc2FtZSByZXBvcnRfaWQgKGRlZHVwKVxuICAgICAgICBjb25zdCBmaWx0ZXJlZCA9IGV4aXN0aW5nLmZpbHRlcihcbiAgICAgICAgICAoZW50cnkpID0+IGVudHJ5LnNuYXBzaG90LnJlcG9ydF9pZCAhPT0gc2Vzc2lvbi5yZXBvcnRfaWRcbiAgICAgICAgKTtcblxuICAgICAgICAvLyBDcmVhdGUgbmV3IGVudHJ5XG4gICAgICAgIGNvbnN0IG5ld0VudHJ5OiBIaXN0b3J5RW50cnkgPSB7XG4gICAgICAgICAgY2FwdHVyZWRfYXQ6IERhdGUubm93KCksXG4gICAgICAgICAgc25hcHNob3Q6IGNyZWF0ZVNuYXBzaG90KHNlc3Npb24pLFxuICAgICAgICB9O1xuXG4gICAgICAgIGZpbHRlcmVkLnB1c2gobmV3RW50cnkpO1xuXG4gICAgICAgIC8vIFNvcnQgbmV3ZXN0LWZpcnN0IChkZXNjZW5kaW5nIGNhcHR1cmVkX2F0KVxuICAgICAgICBmaWx0ZXJlZC5zb3J0KChhLCBiKSA9PiBiLmNhcHR1cmVkX2F0IC0gYS5jYXB0dXJlZF9hdCk7XG5cbiAgICAgICAgLy8gRW5mb3JjZSBjYXAgXHUyMDE0IHNsaWNlIGtlZXBzIHRoZSBuZXdlc3QgTUFYX1NFU1NJT05TIGVudHJpZXNcbiAgICAgICAgY29uc3QgY2FwcGVkID0gZmlsdGVyZWQuc2xpY2UoMCwgTUFYX1NFU1NJT05TKTtcblxuICAgICAgICBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoXG4gICAgICAgICAgeyBbU1RPUkFHRV9LRVlTLlNFU1NJT05fSElTVE9SWV06IGNhcHBlZCB9LFxuICAgICAgICAgICgpID0+IHtcbiAgICAgICAgICAgIGlmIChjaHJvbWUucnVudGltZS5sYXN0RXJyb3IpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHJlamVjdChuZXcgRXJyb3IoY2hyb21lLnJ1bnRpbWUubGFzdEVycm9yLm1lc3NhZ2UpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgICB9XG4gICAgKTtcbiAgfSk7XG59XG5cbi8qKlxuICogTWFwIHN0b3JhZ2UgZXJyb3Igc3RyaW5ncyB0byB1c2VyLWZyaWVuZGx5IG1lc3NhZ2VzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0SGlzdG9yeUVycm9yTWVzc2FnZShlcnJvcjogc3RyaW5nKTogc3RyaW5nIHtcbiAgaWYgKC9RVU9UQV9CWVRFU3xxdW90YS9pLnRlc3QoZXJyb3IpKSB7XG4gICAgcmV0dXJuIFwiU3RvcmFnZSBmdWxsIC0tIG9sZGVzdCBzZXNzaW9ucyB3aWxsIGJlIGNsZWFyZWRcIjtcbiAgfVxuICByZXR1cm4gXCJDb3VsZCBub3Qgc2F2ZSB0byBzZXNzaW9uIGhpc3RvcnlcIjtcbn1cbiIsICIvKipcbiAqIFBvcnRhbCBwZXJtaXNzaW9uIGhlbHBlcnMgZm9yIFRyYWNrbWFuIEFQSSBhY2Nlc3MuXG4gKiBTaGFyZWQgYnkgcG9wdXAgKHJlcXVlc3QgKyBjaGVjaykgYW5kIHNlcnZpY2Ugd29ya2VyIChjaGVjayBvbmx5KS5cbiAqL1xuXG5leHBvcnQgY29uc3QgUE9SVEFMX09SSUdJTlM6IHJlYWRvbmx5IHN0cmluZ1tdID0gW1xuICBcImh0dHBzOi8vYXBpLnRyYWNrbWFuZ29sZi5jb20vKlwiLFxuICBcImh0dHBzOi8vcG9ydGFsLnRyYWNrbWFuZ29sZi5jb20vKlwiLFxuXSBhcyBjb25zdDtcblxuLyoqIFJldHVybnMgdHJ1ZSBpZiBwb3J0YWwgaG9zdCBwZXJtaXNzaW9ucyBhcmUgY3VycmVudGx5IGdyYW50ZWQuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaGFzUG9ydGFsUGVybWlzc2lvbigpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgcmV0dXJuIGNocm9tZS5wZXJtaXNzaW9ucy5jb250YWlucyh7IG9yaWdpbnM6IFsuLi5QT1JUQUxfT1JJR0lOU10gfSk7XG59XG5cbi8qKlxuICogUmVxdWVzdHMgcG9ydGFsIGhvc3QgcGVybWlzc2lvbnMgZnJvbSB0aGUgdXNlci5cbiAqIE1VU1QgYmUgY2FsbGVkIGZyb20gYSB1c2VyIGdlc3R1cmUgKGJ1dHRvbiBjbGljayBoYW5kbGVyKS5cbiAqIFJldHVybnMgdHJ1ZSBpZiBncmFudGVkLCBmYWxzZSBpZiBkZW5pZWQuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZXF1ZXN0UG9ydGFsUGVybWlzc2lvbigpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgcmV0dXJuIGNocm9tZS5wZXJtaXNzaW9ucy5yZXF1ZXN0KHsgb3JpZ2luczogWy4uLlBPUlRBTF9PUklHSU5TXSB9KTtcbn1cbiIsICIvKipcbiAqIFNlcnZpY2UgV29ya2VyIGZvciBUcmFja1B1bGwgQ2hyb21lIEV4dGVuc2lvblxuICovXG5cbmltcG9ydCB7IFNUT1JBR0VfS0VZUyB9IGZyb20gXCIuLi9zaGFyZWQvY29uc3RhbnRzXCI7XG5pbXBvcnQgeyB3cml0ZUNzdiB9IGZyb20gXCIuLi9zaGFyZWQvY3N2X3dyaXRlclwiO1xuaW1wb3J0IHR5cGUgeyBTZXNzaW9uRGF0YSB9IGZyb20gXCIuLi9tb2RlbHMvdHlwZXNcIjtcbmltcG9ydCB7IG1pZ3JhdGVMZWdhY3lQcmVmLCBERUZBVUxUX1VOSVRfQ0hPSUNFLCB0eXBlIFVuaXRDaG9pY2UsIHR5cGUgU3BlZWRVbml0LCB0eXBlIERpc3RhbmNlVW5pdCB9IGZyb20gXCIuLi9zaGFyZWQvdW5pdF9ub3JtYWxpemF0aW9uXCI7XG5pbXBvcnQgeyBzYXZlU2Vzc2lvblRvSGlzdG9yeSwgZ2V0SGlzdG9yeUVycm9yTWVzc2FnZSB9IGZyb20gXCIuLi9zaGFyZWQvaGlzdG9yeVwiO1xuaW1wb3J0IHsgaGFzUG9ydGFsUGVybWlzc2lvbiB9IGZyb20gXCIuLi9zaGFyZWQvcG9ydGFsUGVybWlzc2lvbnNcIjtcblxuY2hyb21lLnJ1bnRpbWUub25JbnN0YWxsZWQuYWRkTGlzdGVuZXIoKCkgPT4ge1xuICBjb25zb2xlLmxvZyhcIlRyYWNrUHVsbCBleHRlbnNpb24gaW5zdGFsbGVkXCIpO1xufSk7XG5cbmludGVyZmFjZSBTYXZlRGF0YVJlcXVlc3Qge1xuICB0eXBlOiBcIlNBVkVfREFUQVwiO1xuICBkYXRhOiBTZXNzaW9uRGF0YTtcbn1cblxuaW50ZXJmYWNlIEV4cG9ydENzdlJlcXVlc3Qge1xuICB0eXBlOiBcIkVYUE9SVF9DU1ZfUkVRVUVTVFwiO1xufVxuXG5pbnRlcmZhY2UgR2V0RGF0YVJlcXVlc3Qge1xuICB0eXBlOiBcIkdFVF9EQVRBXCI7XG59XG5cbmludGVyZmFjZSBQb3J0YWxJbXBvcnRSZXF1ZXN0IHtcbiAgdHlwZTogXCJQT1JUQUxfSU1QT1JUX1JFUVVFU1RcIjtcbn1cblxuZnVuY3Rpb24gZ2V0RG93bmxvYWRFcnJvck1lc3NhZ2Uob3JpZ2luYWxFcnJvcjogc3RyaW5nKTogc3RyaW5nIHtcbiAgaWYgKG9yaWdpbmFsRXJyb3IuaW5jbHVkZXMoXCJpbnZhbGlkXCIpKSB7XG4gICAgcmV0dXJuIFwiSW52YWxpZCBkb3dubG9hZCBmb3JtYXRcIjtcbiAgfVxuICBpZiAob3JpZ2luYWxFcnJvci5pbmNsdWRlcyhcInF1b3RhXCIpIHx8IG9yaWdpbmFsRXJyb3IuaW5jbHVkZXMoXCJzcGFjZVwiKSkge1xuICAgIHJldHVybiBcIkluc3VmZmljaWVudCBzdG9yYWdlIHNwYWNlXCI7XG4gIH1cbiAgaWYgKG9yaWdpbmFsRXJyb3IuaW5jbHVkZXMoXCJibG9ja2VkXCIpIHx8IG9yaWdpbmFsRXJyb3IuaW5jbHVkZXMoXCJwb2xpY3lcIikpIHtcbiAgICByZXR1cm4gXCJEb3dubG9hZCBibG9ja2VkIGJ5IGJyb3dzZXIgc2V0dGluZ3NcIjtcbiAgfVxuICByZXR1cm4gb3JpZ2luYWxFcnJvcjtcbn1cblxudHlwZSBSZXF1ZXN0TWVzc2FnZSA9IFNhdmVEYXRhUmVxdWVzdCB8IEV4cG9ydENzdlJlcXVlc3QgfCBHZXREYXRhUmVxdWVzdCB8IFBvcnRhbEltcG9ydFJlcXVlc3Q7XG5cbmNocm9tZS5ydW50aW1lLm9uTWVzc2FnZS5hZGRMaXN0ZW5lcigobWVzc2FnZTogUmVxdWVzdE1lc3NhZ2UsIHNlbmRlciwgc2VuZFJlc3BvbnNlKSA9PiB7XG4gIGlmIChtZXNzYWdlLnR5cGUgPT09IFwiR0VUX0RBVEFcIikge1xuICAgIGNocm9tZS5zdG9yYWdlLmxvY2FsLmdldChbU1RPUkFHRV9LRVlTLlRSQUNLTUFOX0RBVEFdLCAocmVzdWx0KSA9PiB7XG4gICAgICBzZW5kUmVzcG9uc2UocmVzdWx0W1NUT1JBR0VfS0VZUy5UUkFDS01BTl9EQVRBXSB8fCBudWxsKTtcbiAgICB9KTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGlmIChtZXNzYWdlLnR5cGUgPT09IFwiU0FWRV9EQVRBXCIpIHtcbiAgICBjb25zdCBzZXNzaW9uRGF0YSA9IChtZXNzYWdlIGFzIFNhdmVEYXRhUmVxdWVzdCkuZGF0YTtcbiAgICBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoeyBbU1RPUkFHRV9LRVlTLlRSQUNLTUFOX0RBVEFdOiBzZXNzaW9uRGF0YSB9LCAoKSA9PiB7XG4gICAgICBpZiAoY2hyb21lLnJ1bnRpbWUubGFzdEVycm9yKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXCJUcmFja1B1bGw6IEZhaWxlZCB0byBzYXZlIGRhdGE6XCIsIGNocm9tZS5ydW50aW1lLmxhc3RFcnJvcik7XG4gICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogY2hyb21lLnJ1bnRpbWUubGFzdEVycm9yLm1lc3NhZ2UgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLmxvZyhcIlRyYWNrUHVsbDogU2Vzc2lvbiBkYXRhIHNhdmVkIHRvIHN0b3JhZ2VcIik7XG4gICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IHRydWUgfSk7XG5cbiAgICAgICAgLy8gSGlzdG9yeSBzYXZlIC0tIGZpcmUgYW5kIGZvcmdldCwgbmV2ZXIgYmxvY2tzIHByaW1hcnkgZmxvd1xuICAgICAgICBzYXZlU2Vzc2lvblRvSGlzdG9yeShzZXNzaW9uRGF0YSkuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJUcmFja1B1bGw6IEhpc3Rvcnkgc2F2ZSBmYWlsZWQ6XCIsIGVycik7XG4gICAgICAgICAgY29uc3QgbXNnID0gZ2V0SGlzdG9yeUVycm9yTWVzc2FnZShlcnIubWVzc2FnZSk7XG4gICAgICAgICAgY2hyb21lLnJ1bnRpbWUuc2VuZE1lc3NhZ2UoeyB0eXBlOiBcIkhJU1RPUllfRVJST1JcIiwgZXJyb3I6IG1zZyB9KS5jYXRjaCgoKSA9PiB7XG4gICAgICAgICAgICAvLyBQb3B1cCBub3Qgb3BlbiAtLSBhbHJlYWR5IGxvZ2dlZCB0byBjb25zb2xlXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgaWYgKG1lc3NhZ2UudHlwZSA9PT0gXCJFWFBPUlRfQ1NWX1JFUVVFU1RcIikge1xuICAgIGNocm9tZS5zdG9yYWdlLmxvY2FsLmdldChbU1RPUkFHRV9LRVlTLlRSQUNLTUFOX0RBVEEsIFNUT1JBR0VfS0VZUy5TUEVFRF9VTklULCBTVE9SQUdFX0tFWVMuRElTVEFOQ0VfVU5JVCwgU1RPUkFHRV9LRVlTLkhJVFRJTkdfU1VSRkFDRSwgU1RPUkFHRV9LRVlTLklOQ0xVREVfQVZFUkFHRVMsIFwidW5pdFByZWZlcmVuY2VcIl0sIChyZXN1bHQpID0+IHtcbiAgICAgIGNvbnN0IGRhdGEgPSByZXN1bHRbU1RPUkFHRV9LRVlTLlRSQUNLTUFOX0RBVEFdIGFzIFNlc3Npb25EYXRhIHwgdW5kZWZpbmVkO1xuICAgICAgaWYgKCFkYXRhIHx8ICFkYXRhLmNsdWJfZ3JvdXBzIHx8IGRhdGEuY2x1Yl9ncm91cHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogXCJObyBkYXRhIHRvIGV4cG9ydFwiIH0pO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIGxldCB1bml0Q2hvaWNlOiBVbml0Q2hvaWNlO1xuICAgICAgICBpZiAocmVzdWx0W1NUT1JBR0VfS0VZUy5TUEVFRF9VTklUXSAmJiByZXN1bHRbU1RPUkFHRV9LRVlTLkRJU1RBTkNFX1VOSVRdKSB7XG4gICAgICAgICAgdW5pdENob2ljZSA9IHtcbiAgICAgICAgICAgIHNwZWVkOiByZXN1bHRbU1RPUkFHRV9LRVlTLlNQRUVEX1VOSVRdIGFzIFNwZWVkVW5pdCxcbiAgICAgICAgICAgIGRpc3RhbmNlOiByZXN1bHRbU1RPUkFHRV9LRVlTLkRJU1RBTkNFX1VOSVRdIGFzIERpc3RhbmNlVW5pdCxcbiAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHVuaXRDaG9pY2UgPSBtaWdyYXRlTGVnYWN5UHJlZihyZXN1bHRbXCJ1bml0UHJlZmVyZW5jZVwiXSBhcyBzdHJpbmcgfCB1bmRlZmluZWQpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHN1cmZhY2UgPSAocmVzdWx0W1NUT1JBR0VfS0VZUy5ISVRUSU5HX1NVUkZBQ0VdIGFzIFwiR3Jhc3NcIiB8IFwiTWF0XCIpID8/IFwiTWF0XCI7XG4gICAgICAgIGNvbnN0IGluY2x1ZGVBdmVyYWdlcyA9IHJlc3VsdFtTVE9SQUdFX0tFWVMuSU5DTFVERV9BVkVSQUdFU10gPT09IHVuZGVmaW5lZFxuICAgICAgICAgID8gdHJ1ZVxuICAgICAgICAgIDogQm9vbGVhbihyZXN1bHRbU1RPUkFHRV9LRVlTLklOQ0xVREVfQVZFUkFHRVNdKTtcbiAgICAgICAgY29uc3QgY3N2Q29udGVudCA9IHdyaXRlQ3N2KGRhdGEsIGluY2x1ZGVBdmVyYWdlcywgdW5kZWZpbmVkLCB1bml0Q2hvaWNlLCBzdXJmYWNlKTtcbiAgICAgICAgY29uc3QgZmlsZW5hbWUgPSBgU2hvdERhdGFfJHtkYXRhLmRhdGUgfHwgXCJ1bmtub3duXCJ9LmNzdmA7XG5cbiAgICAgICAgY2hyb21lLmRvd25sb2Fkcy5kb3dubG9hZChcbiAgICAgICAgICB7XG4gICAgICAgICAgICB1cmw6IGBkYXRhOnRleHQvY3N2O2NoYXJzZXQ9dXRmLTgsJHtlbmNvZGVVUklDb21wb25lbnQoY3N2Q29udGVudCl9YCxcbiAgICAgICAgICAgIGZpbGVuYW1lOiBmaWxlbmFtZSxcbiAgICAgICAgICAgIHNhdmVBczogZmFsc2UsXG4gICAgICAgICAgfSxcbiAgICAgICAgICAoZG93bmxvYWRJZCkgPT4ge1xuICAgICAgICAgICAgaWYgKGNocm9tZS5ydW50aW1lLmxhc3RFcnJvcikge1xuICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiVHJhY2tQdWxsOiBEb3dubG9hZCBmYWlsZWQ6XCIsIGNocm9tZS5ydW50aW1lLmxhc3RFcnJvcik7XG4gICAgICAgICAgICAgIGNvbnN0IGVycm9yTWVzc2FnZSA9IGdldERvd25sb2FkRXJyb3JNZXNzYWdlKGNocm9tZS5ydW50aW1lLmxhc3RFcnJvci5tZXNzYWdlKTtcbiAgICAgICAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvck1lc3NhZ2UgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgVHJhY2tQdWxsOiBDU1YgZXhwb3J0ZWQgd2l0aCBkb3dubG9hZCBJRCAke2Rvd25sb2FkSWR9YCk7XG4gICAgICAgICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IHRydWUsIGRvd25sb2FkSWQsIGZpbGVuYW1lIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXCJUcmFja1B1bGw6IENTViBnZW5lcmF0aW9uIGZhaWxlZDpcIiwgZXJyb3IpO1xuICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKSB9KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGlmIChtZXNzYWdlLnR5cGUgPT09IFwiUE9SVEFMX0lNUE9SVF9SRVFVRVNUXCIpIHtcbiAgICAoYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgZ3JhbnRlZCA9IGF3YWl0IGhhc1BvcnRhbFBlcm1pc3Npb24oKTtcbiAgICAgIGlmICghZ3JhbnRlZCkge1xuICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFwiUG9ydGFsIHBlcm1pc3Npb24gbm90IGdyYW50ZWRcIiB9KTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgLy8gUGhhc2UgMjIgd2lsbCBpbXBsZW1lbnQgR3JhcGhRTCBjbGllbnQgYW5kIGFjdHVhbCBpbXBvcnRcbiAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogXCJOb3QgaW1wbGVtZW50ZWRcIiB9KTtcbiAgICB9KSgpO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG59KTtcblxuY2hyb21lLnN0b3JhZ2Uub25DaGFuZ2VkLmFkZExpc3RlbmVyKChjaGFuZ2VzLCBuYW1lc3BhY2UpID0+IHtcbiAgaWYgKG5hbWVzcGFjZSA9PT0gXCJsb2NhbFwiICYmIGNoYW5nZXNbU1RPUkFHRV9LRVlTLlRSQUNLTUFOX0RBVEFdKSB7XG4gICAgY29uc3QgbmV3VmFsdWUgPSBjaGFuZ2VzW1NUT1JBR0VfS0VZUy5UUkFDS01BTl9EQVRBXS5uZXdWYWx1ZTtcbiAgICBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZSh7IHR5cGU6IFwiREFUQV9VUERBVEVEXCIsIGRhdGE6IG5ld1ZhbHVlIH0pLmNhdGNoKCgpID0+IHtcbiAgICAgIC8vIElnbm9yZSBlcnJvcnMgd2hlbiBubyBwb3B1cCBpcyBsaXN0ZW5pbmdcbiAgICB9KTtcbiAgfVxufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7O0FBQUEsTUE0RWEsc0JBa0VBO0FBOUliO0FBQUE7QUE0RU8sTUFBTSx1QkFBK0M7QUFBQSxRQUMxRCxXQUFXO0FBQUEsUUFDWCxXQUFXO0FBQUEsUUFDWCxhQUFhO0FBQUEsUUFDYixhQUFhO0FBQUEsUUFDYixVQUFVO0FBQUEsUUFDVixXQUFXO0FBQUEsUUFDWCxZQUFZO0FB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
