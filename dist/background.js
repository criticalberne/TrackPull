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
  function normalizeMetricValue(value, metricName, reportUnitSystem, unitChoice = DEFAULT_UNIT_CHOICE) {
    const numValue = parseNumericValue(value);
    if (numValue === null) return value;
    let converted;
    if (SMALL_DISTANCE_METRICS.has(metricName)) {
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
    return Math.round(converted * 10) / 10;
  }
  function parseNumericValue(value) {
    if (value === null || value === "") return null;
    if (typeof value === "number") return isNaN(value) ? null : value;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? null : parsed;
  }
  var DEFAULT_UNIT_CHOICE, UNIT_SYSTEMS, DISTANCE_METRICS, SMALL_DISTANCE_METRICS, ANGLE_METRICS, SPEED_METRICS, DEFAULT_UNIT_SYSTEM, SPEED_LABELS, DISTANCE_LABELS, SMALL_DISTANCE_LABELS, FIXED_UNIT_LABELS;
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
        "BallSpeed",
        "Tempo"
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
        HangTime: "s"
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
              const rounded = Math.round(avg * 10) / 10;
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

  // src/background/serviceWorker.ts
  var require_serviceWorker = __commonJS({
    "src/background/serviceWorker.ts"() {
      init_constants();
      init_csv_writer();
      init_unit_normalization();
      init_history();
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL3NoYXJlZC9jb25zdGFudHMudHMiLCAiLi4vc3JjL3NoYXJlZC91bml0X25vcm1hbGl6YXRpb24udHMiLCAiLi4vc3JjL3NoYXJlZC9jc3Zfd3JpdGVyLnRzIiwgIi4uL3NyYy9zaGFyZWQvaGlzdG9yeS50cyIsICIuLi9zcmMvYmFja2dyb3VuZC9zZXJ2aWNlV29ya2VyLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyIvKipcbiAqIFNoYXJlZCBjb25zdGFudHMgaW5jbHVkaW5nIENTUyBzZWxlY3RvcnMgYW5kIGNvbmZpZ3VyYXRpb24uXG4gKiBCYXNlZCBvbiBQeXRob24gc2NyYXBlciBjb25zdGFudHMucHkgaW1wbGVtZW50YXRpb24uXG4gKi9cblxuLy8gQ29tcGxldGUgbGlzdCBvZiBhbGwga25vd24gVHJhY2ttYW4gbWV0cmljcyAoVVJMIHBhcmFtZXRlciBuYW1lcylcbmV4cG9ydCBjb25zdCBBTExfTUVUUklDUyA9IFtcbiAgXCJDbHViU3BlZWRcIixcbiAgXCJCYWxsU3BlZWRcIixcbiAgXCJTbWFzaEZhY3RvclwiLFxuICBcIkF0dGFja0FuZ2xlXCIsXG4gIFwiQ2x1YlBhdGhcIixcbiAgXCJGYWNlQW5nbGVcIixcbiAgXCJGYWNlVG9QYXRoXCIsXG4gIFwiU3dpbmdEaXJlY3Rpb25cIixcbiAgXCJEeW5hbWljTG9mdFwiLFxuICBcIlNwaW5SYXRlXCIsXG4gIFwiU3BpbkF4aXNcIixcbiAgXCJTcGluTG9mdFwiLFxuICBcIkxhdW5jaEFuZ2xlXCIsXG4gIFwiTGF1bmNoRGlyZWN0aW9uXCIsXG4gIFwiQ2FycnlcIixcbiAgXCJUb3RhbFwiLFxuICBcIlNpZGVcIixcbiAgXCJTaWRlVG90YWxcIixcbiAgXCJDYXJyeVNpZGVcIixcbiAgXCJUb3RhbFNpZGVcIixcbiAgXCJIZWlnaHRcIixcbiAgXCJNYXhIZWlnaHRcIixcbiAgXCJDdXJ2ZVwiLFxuICBcIkxhbmRpbmdBbmdsZVwiLFxuICBcIkhhbmdUaW1lXCIsXG4gIFwiTG93UG9pbnREaXN0YW5jZVwiLFxuICBcIkltcGFjdEhlaWdodFwiLFxuICBcIkltcGFjdE9mZnNldFwiLFxuICBcIlRlbXBvXCIsXG5dIGFzIGNvbnN0O1xuXG4vLyBNZXRyaWNzIHNwbGl0IGludG8gZ3JvdXBzIGZvciBtdWx0aS1wYWdlLWxvYWQgSFRNTCBmYWxsYmFja1xuZXhwb3J0IGNvbnN0IE1FVFJJQ19HUk9VUFMgPSBbXG4gIFtcbiAgICBcIkNsdWJTcGVlZFwiLFxuICAgIFwiQmFsbFNwZWVkXCIsXG4gICAgXCJTbWFzaEZhY3RvclwiLFxuICAgIFwiQXR0YWNrQW5nbGVcIixcbiAgICBcIkNsdWJQYXRoXCIsXG4gICAgXCJGYWNlQW5nbGVcIixcbiAgICBcIkZhY2VUb1BhdGhcIixcbiAgICBcIlN3aW5nRGlyZWN0aW9uXCIsXG4gICAgXCJEeW5hbWljTG9mdFwiLFxuICAgIFwiU3BpbkxvZnRcIixcbiAgXSxcbiAgW1xuICAgIFwiU3BpblJhdGVcIixcbiAgICBcIlNwaW5BeGlzXCIsXG4gICAgXCJMYXVuY2hBbmdsZVwiLFxuICAgIFwiTGF1bmNoRGlyZWN0aW9uXCIsXG4gICAgXCJDYXJyeVwiLFxuICAgIFwiVG90YWxcIixcbiAgICBcIlNpZGVcIixcbiAgICBcIlNpZGVUb3RhbFwiLFxuICAgIFwiQ2FycnlTaWRlXCIsXG4gICAgXCJUb3RhbFNpZGVcIixcbiAgICBcIkhlaWdodFwiLFxuICAgIFwiTWF4SGVpZ2h0XCIsXG4gICAgXCJDdXJ2ZVwiLFxuICAgIFwiTGFuZGluZ0FuZ2xlXCIsXG4gICAgXCJIYW5nVGltZVwiLFxuICAgIFwiTG93UG9pbnREaXN0YW5jZVwiLFxuICAgIFwiSW1wYWN0SGVpZ2h0XCIsXG4gICAgXCJJbXBhY3RPZmZzZXRcIixcbiAgICBcIlRlbXBvXCIsXG4gIF0sXG5dIGFzIGNvbnN0O1xuXG4vLyBEaXNwbGF5IG5hbWVzOiBVUkwgcGFyYW0gbmFtZSAtPiBodW1hbi1yZWFkYWJsZSBDU1YgaGVhZGVyXG5leHBvcnQgY29uc3QgTUVUUklDX0RJU1BMQVlfTkFNRVM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XG4gIENsdWJTcGVlZDogXCJDbHViIFNwZWVkXCIsXG4gIEJhbGxTcGVlZDogXCJCYWxsIFNwZWVkXCIsXG4gIFNtYXNoRmFjdG9yOiBcIlNtYXNoIEZhY3RvclwiLFxuICBBdHRhY2tBbmdsZTogXCJBdHRhY2sgQW5nbGVcIixcbiAgQ2x1YlBhdGg6IFwiQ2x1YiBQYXRoXCIsXG4gIEZhY2VBbmdsZTogXCJGYWNlIEFuZ2xlXCIsXG4gIEZhY2VUb1BhdGg6IFwiRmFjZSBUbyBQYXRoXCIsXG4gIFN3aW5nRGlyZWN0aW9uOiBcIlN3aW5nIERpcmVjdGlvblwiLFxuICBEeW5hbWljTG9mdDogXCJEeW5hbWljIExvZnRcIixcbiAgU3BpblJhdGU6IFwiU3BpbiBSYXRlXCIsXG4gIFNwaW5BeGlzOiBcIlNwaW4gQXhpc1wiLFxuICBTcGluTG9mdDogXCJTcGluIExvZnRcIixcbiAgTGF1bmNoQW5nbGU6IFwiTGF1bmNoIEFuZ2xlXCIsXG4gIExhdW5jaERpcmVjdGlvbjogXCJMYXVuY2ggRGlyZWN0aW9uXCIsXG4gIENhcnJ5OiBcIkNhcnJ5XCIsXG4gIFRvdGFsOiBcIlRvdGFsXCIsXG4gIFNpZGU6IFwiU2lkZVwiLFxuICBTaWRlVG90YWw6IFwiU2lkZSBUb3RhbFwiLFxuICBDYXJyeVNpZGU6IFwiQ2FycnkgU2lkZVwiLFxuICBUb3RhbFNpZGU6IFwiVG90YWwgU2lkZVwiLFxuICBIZWlnaHQ6IFwiSGVpZ2h0XCIsXG4gIE1heEhlaWdodDogXCJNYXggSGVpZ2h0XCIsXG4gIEN1cnZlOiBcIkN1cnZlXCIsXG4gIExhbmRpbmdBbmdsZTogXCJMYW5kaW5nIEFuZ2xlXCIsXG4gIEhhbmdUaW1lOiBcIkhhbmcgVGltZVwiLFxuICBMb3dQb2ludERpc3RhbmNlOiBcIkxvdyBQb2ludFwiLFxuICBJbXBhY3RIZWlnaHQ6IFwiSW1wYWN0IEhlaWdodFwiLFxuICBJbXBhY3RPZmZzZXQ6IFwiSW1wYWN0IE9mZnNldFwiLFxuICBUZW1wbzogXCJUZW1wb1wiLFxufTtcblxuLy8gQ1NTIGNsYXNzIHNlbGVjdG9ycyAoZnJvbSBUcmFja21hbidzIHJlbmRlcmVkIEhUTUwpXG5leHBvcnQgY29uc3QgQ1NTX0RBVEUgPSBcImRhdGVcIjtcbmV4cG9ydCBjb25zdCBDU1NfUkVTVUxUU19XUkFQUEVSID0gXCJwbGF5ZXItYW5kLXJlc3VsdHMtdGFibGUtd3JhcHBlclwiO1xuZXhwb3J0IGNvbnN0IENTU19SRVNVTFRTX1RBQkxFID0gXCJSZXN1bHRzVGFibGVcIjtcbmV4cG9ydCBjb25zdCBDU1NfQ0xVQl9UQUcgPSBcImdyb3VwLXRhZ1wiO1xuZXhwb3J0IGNvbnN0IENTU19QQVJBTV9OQU1FU19ST1cgPSBcInBhcmFtZXRlci1uYW1lcy1yb3dcIjtcbmV4cG9ydCBjb25zdCBDU1NfUEFSQU1fTkFNRSA9IFwicGFyYW1ldGVyLW5hbWVcIjtcbmV4cG9ydCBjb25zdCBDU1NfU0hPVF9ERVRBSUxfUk9XID0gXCJyb3ctd2l0aC1zaG90LWRldGFpbHNcIjtcbmV4cG9ydCBjb25zdCBDU1NfQVZFUkFHRV9WQUxVRVMgPSBcImF2ZXJhZ2UtdmFsdWVzXCI7XG5leHBvcnQgY29uc3QgQ1NTX0NPTlNJU1RFTkNZX1ZBTFVFUyA9IFwiY29uc2lzdGVuY3ktdmFsdWVzXCI7XG5cbi8vIEFQSSBVUkwgcGF0dGVybnMgdGhhdCBsaWtlbHkgaW5kaWNhdGUgYW4gQVBJIGRhdGEgcmVzcG9uc2VcbmV4cG9ydCBjb25zdCBBUElfVVJMX1BBVFRFUk5TID0gW1xuICBcImFwaS50cmFja21hbmdvbGYuY29tXCIsXG4gIFwidHJhY2ttYW5nb2xmLmNvbS9hcGlcIixcbiAgXCIvYXBpL1wiLFxuICBcIi9yZXBvcnRzL1wiLFxuICBcIi9hY3Rpdml0aWVzL1wiLFxuICBcIi9zaG90cy9cIixcbiAgXCJncmFwaHFsXCIsXG5dO1xuXG4vLyBUaW1lb3V0cyAobWlsbGlzZWNvbmRzKVxuZXhwb3J0IGNvbnN0IFBBR0VfTE9BRF9USU1FT1VUID0gMzBfMDAwO1xuZXhwb3J0IGNvbnN0IERBVEFfTE9BRF9USU1FT1VUID0gMTVfMDAwO1xuXG4vLyBUcmFja21hbiBiYXNlIFVSTFxuZXhwb3J0IGNvbnN0IEJBU0VfVVJMID0gXCJodHRwczovL3dlYi1keW5hbWljLXJlcG9ydHMudHJhY2ttYW5nb2xmLmNvbS9cIjtcblxuLy8gQ3VzdG9tIHByb21wdCBzdG9yYWdlIGtleXNcbmV4cG9ydCBjb25zdCBDVVNUT01fUFJPTVBUX0tFWV9QUkVGSVggPSBcImN1c3RvbVByb21wdF9cIiBhcyBjb25zdDtcbmV4cG9ydCBjb25zdCBDVVNUT01fUFJPTVBUX0lEU19LRVkgPSBcImN1c3RvbVByb21wdElkc1wiIGFzIGNvbnN0O1xuXG4vLyBTdG9yYWdlIGtleXMgZm9yIENocm9tZSBleHRlbnNpb24gKGFsaWduZWQgYmV0d2VlbiBiYWNrZ3JvdW5kIGFuZCBwb3B1cClcbmV4cG9ydCBjb25zdCBTVE9SQUdFX0tFWVMgPSB7XG4gIFRSQUNLTUFOX0RBVEE6IFwidHJhY2ttYW5EYXRhXCIsXG4gIFNQRUVEX1VOSVQ6IFwic3BlZWRVbml0XCIsXG4gIERJU1RBTkNFX1VOSVQ6IFwiZGlzdGFuY2VVbml0XCIsXG4gIFNFTEVDVEVEX1BST01QVF9JRDogXCJzZWxlY3RlZFByb21wdElkXCIsXG4gIEFJX1NFUlZJQ0U6IFwiYWlTZXJ2aWNlXCIsXG4gIEhJVFRJTkdfU1VSRkFDRTogXCJoaXR0aW5nU3VyZmFjZVwiLFxuICBJTkNMVURFX0FWRVJBR0VTOiBcImluY2x1ZGVBdmVyYWdlc1wiLFxuICBTRVNTSU9OX0hJU1RPUlk6IFwic2Vzc2lvbkhpc3RvcnlcIixcbn0gYXMgY29uc3Q7XG4iLCAiLyoqXG4gKiBVbml0IG5vcm1hbGl6YXRpb24gdXRpbGl0aWVzIGZvciBUcmFja21hbiBtZWFzdXJlbWVudHMuXG4gKiBcbiAqIFRyYWNrbWFuIHVzZXMgbmRfKiBwYXJhbWV0ZXJzIHRvIHNwZWNpZnkgdW5pdHM6XG4gKiAtIG5kXzAwMSwgbmRfMDAyLCBldGMuIGRlZmluZSB1bml0IHN5c3RlbXMgZm9yIGRpZmZlcmVudCBtZWFzdXJlbWVudCBncm91cHNcbiAqIC0gQ29tbW9uIHZhbHVlczogNzg5MDEyID0geWFyZHMvZGVncmVlcywgNzg5MDEzID0gbWV0ZXJzL3JhZGlhbnNcbiAqL1xuXG5leHBvcnQgdHlwZSBVbml0U3lzdGVtSWQgPSBcIjc4OTAxMlwiIHwgXCI3ODkwMTNcIiB8IFwiNzg5MDE0XCIgfCBzdHJpbmc7XG5cbmV4cG9ydCB0eXBlIFNwZWVkVW5pdCA9IFwibXBoXCIgfCBcIm0vc1wiO1xuZXhwb3J0IHR5cGUgRGlzdGFuY2VVbml0ID0gXCJ5YXJkc1wiIHwgXCJtZXRlcnNcIjtcbmV4cG9ydCB0eXBlIFNtYWxsRGlzdGFuY2VVbml0ID0gXCJpbmNoZXNcIiB8IFwiY21cIjtcbmV4cG9ydCBpbnRlcmZhY2UgVW5pdENob2ljZSB7IHNwZWVkOiBTcGVlZFVuaXQ7IGRpc3RhbmNlOiBEaXN0YW5jZVVuaXQgfVxuZXhwb3J0IGNvbnN0IERFRkFVTFRfVU5JVF9DSE9JQ0U6IFVuaXRDaG9pY2UgPSB7IHNwZWVkOiBcIm1waFwiLCBkaXN0YW5jZTogXCJ5YXJkc1wiIH07XG5cbi8qKlxuICogVHJhY2ttYW4gdW5pdCBzeXN0ZW0gZGVmaW5pdGlvbnMuXG4gKiBNYXBzIG5kXyogcGFyYW1ldGVyIHZhbHVlcyB0byBhY3R1YWwgdW5pdHMgZm9yIGVhY2ggbWV0cmljLlxuICovXG5leHBvcnQgY29uc3QgVU5JVF9TWVNURU1TOiBSZWNvcmQ8VW5pdFN5c3RlbUlkLCBVbml0U3lzdGVtPiA9IHtcbiAgLy8gSW1wZXJpYWwgKHlhcmRzLCBkZWdyZWVzKSAtIG1vc3QgY29tbW9uXG4gIFwiNzg5MDEyXCI6IHtcbiAgICBpZDogXCI3ODkwMTJcIixcbiAgICBuYW1lOiBcIkltcGVyaWFsXCIsXG4gICAgZGlzdGFuY2VVbml0OiBcInlhcmRzXCIsXG4gICAgYW5nbGVVbml0OiBcImRlZ3JlZXNcIixcbiAgICBzcGVlZFVuaXQ6IFwibXBoXCIsXG4gIH0sXG4gIC8vIE1ldHJpYyAobWV0ZXJzLCByYWRpYW5zKVxuICBcIjc4OTAxM1wiOiB7XG4gICAgaWQ6IFwiNzg5MDEzXCIsXG4gICAgbmFtZTogXCJNZXRyaWMgKHJhZClcIixcbiAgICBkaXN0YW5jZVVuaXQ6IFwibWV0ZXJzXCIsXG4gICAgYW5nbGVVbml0OiBcInJhZGlhbnNcIixcbiAgICBzcGVlZFVuaXQ6IFwia20vaFwiLFxuICB9LFxuICAvLyBNZXRyaWMgKG1ldGVycywgZGVncmVlcykgLSBsZXNzIGNvbW1vblxuICBcIjc4OTAxNFwiOiB7XG4gICAgaWQ6IFwiNzg5MDE0XCIsXG4gICAgbmFtZTogXCJNZXRyaWMgKGRlZylcIixcbiAgICBkaXN0YW5jZVVuaXQ6IFwibWV0ZXJzXCIsXG4gICAgYW5nbGVVbml0OiBcImRlZ3JlZXNcIixcbiAgICBzcGVlZFVuaXQ6IFwia20vaFwiLFxuICB9LFxufTtcblxuLyoqXG4gKiBVbml0IHN5c3RlbSBjb25maWd1cmF0aW9uLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFVuaXRTeXN0ZW0ge1xuICBpZDogVW5pdFN5c3RlbUlkO1xuICBuYW1lOiBzdHJpbmc7XG4gIGRpc3RhbmNlVW5pdDogXCJ5YXJkc1wiIHwgXCJtZXRlcnNcIjtcbiAgYW5nbGVVbml0OiBcImRlZ3JlZXNcIiB8IFwicmFkaWFuc1wiO1xuICBzcGVlZFVuaXQ6IFwibXBoXCIgfCBcImttL2hcIiB8IFwibS9zXCI7XG59XG5cbi8qKlxuICogTWV0cmljcyB0aGF0IHVzZSBkaXN0YW5jZSB1bml0cy5cbiAqL1xuZXhwb3J0IGNvbnN0IERJU1RBTkNFX01FVFJJQ1MgPSBuZXcgU2V0KFtcbiAgXCJDYXJyeVwiLFxuICBcIlRvdGFsXCIsXG4gIFwiU2lkZVwiLFxuICBcIlNpZGVUb3RhbFwiLFxuICBcIkNhcnJ5U2lkZVwiLFxuICBcIlRvdGFsU2lkZVwiLFxuICBcIkhlaWdodFwiLFxuICBcIk1heEhlaWdodFwiLFxuICBcIkN1cnZlXCIsXG5dKTtcblxuLyoqXG4gKiBNZXRyaWNzIHRoYXQgdXNlIHNtYWxsIGRpc3RhbmNlIHVuaXRzIChpbmNoZXMvY20pLlxuICogVGhlc2UgdmFsdWVzIGNvbWUgZnJvbSB0aGUgQVBJIGluIG1ldGVycyBidXQgYXJlIHRvbyBzbWFsbCBmb3IgeWFyZHMvbWV0ZXJzLlxuICovXG5leHBvcnQgY29uc3QgU01BTExfRElTVEFOQ0VfTUVUUklDUyA9IG5ldyBTZXQoW1xuICBcIkxvd1BvaW50RGlzdGFuY2VcIixcbl0pO1xuXG4vKipcbiAqIE1ldHJpY3MgdGhhdCB1c2UgYW5nbGUgdW5pdHMuXG4gKi9cbmV4cG9ydCBjb25zdCBBTkdMRV9NRVRSSUNTID0gbmV3IFNldChbXG4gIFwiQXR0YWNrQW5nbGVcIixcbiAgXCJDbHViUGF0aFwiLFxuICBcIkZhY2VBbmdsZVwiLFxuICBcIkZhY2VUb1BhdGhcIixcbiAgXCJEeW5hbWljTG9mdFwiLFxuICBcIkxhdW5jaEFuZ2xlXCIsXG4gIFwiTGF1bmNoRGlyZWN0aW9uXCIsXG4gIFwiTGFuZGluZ0FuZ2xlXCIsXG5dKTtcblxuLyoqXG4gKiBNZXRyaWNzIHRoYXQgdXNlIHNwZWVkIHVuaXRzLlxuICovXG5leHBvcnQgY29uc3QgU1BFRURfTUVUUklDUyA9IG5ldyBTZXQoW1xuICBcIkNsdWJTcGVlZFwiLFxuICBcIkJhbGxTcGVlZFwiLFxuICBcIlRlbXBvXCIsXG5dKTtcblxuLyoqXG4gKiBEZWZhdWx0IHVuaXQgc3lzdGVtIChJbXBlcmlhbCAtIHlhcmRzL2RlZ3JlZXMpLlxuICovXG5leHBvcnQgY29uc3QgREVGQVVMVF9VTklUX1NZU1RFTTogVW5pdFN5c3RlbSA9IFVOSVRfU1lTVEVNU1tcIjc4OTAxMlwiXTtcblxuLyoqXG4gKiBTcGVlZCB1bml0IGRpc3BsYXkgbGFiZWxzIGZvciBDU1YgaGVhZGVycy5cbiAqL1xuZXhwb3J0IGNvbnN0IFNQRUVEX0xBQkVMUzogUmVjb3JkPFNwZWVkVW5pdCwgc3RyaW5nPiA9IHtcbiAgXCJtcGhcIjogXCJtcGhcIixcbiAgXCJtL3NcIjogXCJtL3NcIixcbn07XG5cbi8qKlxuICogRGlzdGFuY2UgdW5pdCBkaXNwbGF5IGxhYmVscyBmb3IgQ1NWIGhlYWRlcnMuXG4gKi9cbmV4cG9ydCBjb25zdCBESVNUQU5DRV9MQUJFTFM6IFJlY29yZDxEaXN0YW5jZVVuaXQsIHN0cmluZz4gPSB7XG4gIFwieWFyZHNcIjogXCJ5ZHNcIixcbiAgXCJtZXRlcnNcIjogXCJtXCIsXG59O1xuXG4vKipcbiAqIFNtYWxsIGRpc3RhbmNlIHVuaXQgZGlzcGxheSBsYWJlbHMgZm9yIENTViBoZWFkZXJzLlxuICovXG5leHBvcnQgY29uc3QgU01BTExfRElTVEFOQ0VfTEFCRUxTOiBSZWNvcmQ8U21hbGxEaXN0YW5jZVVuaXQsIHN0cmluZz4gPSB7XG4gIFwiaW5jaGVzXCI6IFwiaW5cIixcbiAgXCJjbVwiOiBcImNtXCIsXG59O1xuXG4vKipcbiAqIE1pZ3JhdGUgYSBsZWdhY3kgdW5pdFByZWZlcmVuY2Ugc3RyaW5nIHRvIGEgVW5pdENob2ljZSBvYmplY3QuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtaWdyYXRlTGVnYWN5UHJlZihzdG9yZWQ6IHN0cmluZyB8IHVuZGVmaW5lZCk6IFVuaXRDaG9pY2Uge1xuICBzd2l0Y2ggKHN0b3JlZCkge1xuICAgIGNhc2UgXCJtZXRyaWNcIjpcbiAgICAgIHJldHVybiB7IHNwZWVkOiBcIm0vc1wiLCBkaXN0YW5jZTogXCJtZXRlcnNcIiB9O1xuICAgIGNhc2UgXCJoeWJyaWRcIjpcbiAgICAgIHJldHVybiB7IHNwZWVkOiBcIm1waFwiLCBkaXN0YW5jZTogXCJtZXRlcnNcIiB9O1xuICAgIGNhc2UgXCJpbXBlcmlhbFwiOlxuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4geyBzcGVlZDogXCJtcGhcIiwgZGlzdGFuY2U6IFwieWFyZHNcIiB9O1xuICB9XG59XG5cbi8qKlxuICogRml4ZWQgdW5pdCBsYWJlbHMgZm9yIG1ldHJpY3Mgd2hvc2UgdW5pdHMgZG9uJ3QgdmFyeSBieSBwcmVmZXJlbmNlLlxuICovXG5leHBvcnQgY29uc3QgRklYRURfVU5JVF9MQUJFTFM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XG4gIFNwaW5SYXRlOiBcInJwbVwiLFxuICBIYW5nVGltZTogXCJzXCIsXG59O1xuXG4vKipcbiAqIEV4dHJhY3QgbmRfKiBwYXJhbWV0ZXJzIGZyb20gbWV0YWRhdGFfcGFyYW1zLlxuICogXG4gKiBAcGFyYW0gbWV0YWRhdGFQYXJhbXMgLSBUaGUgbWV0YWRhdGFfcGFyYW1zIG9iamVjdCBmcm9tIFNlc3Npb25EYXRhXG4gKiBAcmV0dXJucyBPYmplY3QgbWFwcGluZyBtZXRyaWMgZ3JvdXAgSURzIHRvIHVuaXQgc3lzdGVtIElEc1xuICovXG5leHBvcnQgZnVuY3Rpb24gZXh0cmFjdFVuaXRQYXJhbXMoXG4gIG1ldGFkYXRhUGFyYW1zOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+XG4pOiBSZWNvcmQ8c3RyaW5nLCBVbml0U3lzdGVtSWQ+IHtcbiAgY29uc3QgcmVzdWx0OiBSZWNvcmQ8c3RyaW5nLCBVbml0U3lzdGVtSWQ+ID0ge307XG5cbiAgZm9yIChjb25zdCBba2V5LCB2YWx1ZV0gb2YgT2JqZWN0LmVudHJpZXMobWV0YWRhdGFQYXJhbXMpKSB7XG4gICAgY29uc3QgbWF0Y2ggPSBrZXkubWF0Y2goL15uZF8oW2EtejAtOV0rKSQvaSk7XG4gICAgaWYgKG1hdGNoKSB7XG4gICAgICBjb25zdCBncm91cEtleSA9IG1hdGNoWzFdLnRvTG93ZXJDYXNlKCk7XG4gICAgICByZXN1bHRbZ3JvdXBLZXldID0gdmFsdWUgYXMgVW5pdFN5c3RlbUlkO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZXN1bHQ7XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lIHRoZSB1bml0IHN5c3RlbSBJRCBmcm9tIG1ldGFkYXRhIHBhcmFtcy5cbiAqIFVzZXMgbmRfMDAxIGFzIHByaW1hcnksIGZhbGxzIGJhY2sgdG8gZGVmYXVsdC5cbiAqIFxuICogQHBhcmFtIG1ldGFkYXRhUGFyYW1zIC0gVGhlIG1ldGFkYXRhX3BhcmFtcyBvYmplY3RcbiAqIEByZXR1cm5zIFRoZSB1bml0IHN5c3RlbSBJRCBzdHJpbmdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFVuaXRTeXN0ZW1JZChcbiAgbWV0YWRhdGFQYXJhbXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz5cbik6IFVuaXRTeXN0ZW1JZCB7XG4gIGNvbnN0IHVuaXRQYXJhbXMgPSBleHRyYWN0VW5pdFBhcmFtcyhtZXRhZGF0YVBhcmFtcyk7XG4gIHJldHVybiB1bml0UGFyYW1zW1wiMDAxXCJdIHx8IFwiNzg5MDEyXCI7IC8vIERlZmF1bHQgdG8gSW1wZXJpYWxcbn1cblxuLyoqXG4gKiBHZXQgdGhlIGZ1bGwgdW5pdCBzeXN0ZW0gY29uZmlndXJhdGlvbi5cbiAqIFxuICogQHBhcmFtIG1ldGFkYXRhUGFyYW1zIC0gVGhlIG1ldGFkYXRhX3BhcmFtcyBvYmplY3RcbiAqIEByZXR1cm5zIFRoZSBVbml0U3lzdGVtIGNvbmZpZ3VyYXRpb25cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFVuaXRTeXN0ZW0oXG4gIG1ldGFkYXRhUGFyYW1zOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+XG4pOiBVbml0U3lzdGVtIHtcbiAgY29uc3QgaWQgPSBnZXRVbml0U3lzdGVtSWQobWV0YWRhdGFQYXJhbXMpO1xuICByZXR1cm4gVU5JVF9TWVNURU1TW2lkXSB8fCBERUZBVUxUX1VOSVRfU1lTVEVNO1xufVxuXG4vKipcbiAqIEdldCB0aGUgdW5pdCBzeXN0ZW0gcmVwcmVzZW50aW5nIHdoYXQgdGhlIEFQSSBhY3R1YWxseSByZXR1cm5zLlxuICogVGhlIEFQSSBhbHdheXMgcmV0dXJucyBzcGVlZCBpbiBtL3MgYW5kIGRpc3RhbmNlIGluIG1ldGVycyxcbiAqIGJ1dCB0aGUgYW5nbGUgdW5pdCBkZXBlbmRzIG9uIHRoZSByZXBvcnQncyBuZF8wMDEgcGFyYW1ldGVyLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0QXBpU291cmNlVW5pdFN5c3RlbShcbiAgbWV0YWRhdGFQYXJhbXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz5cbik6IFVuaXRTeXN0ZW0ge1xuICBjb25zdCByZXBvcnRTeXN0ZW0gPSBnZXRVbml0U3lzdGVtKG1ldGFkYXRhUGFyYW1zKTtcbiAgcmV0dXJuIHtcbiAgICBpZDogXCJhcGlcIiBhcyBVbml0U3lzdGVtSWQsXG4gICAgbmFtZTogXCJBUEkgU291cmNlXCIsXG4gICAgZGlzdGFuY2VVbml0OiBcIm1ldGVyc1wiLFxuICAgIGFuZ2xlVW5pdDogcmVwb3J0U3lzdGVtLmFuZ2xlVW5pdCxcbiAgICBzcGVlZFVuaXQ6IFwibS9zXCIsXG4gIH07XG59XG5cbi8qKlxuICogR2V0IHRoZSB1bml0IGxhYmVsIGZvciBhIG1ldHJpYyBiYXNlZCBvbiB1c2VyJ3MgdW5pdCBjaG9pY2UuXG4gKiBSZXR1cm5zIGVtcHR5IHN0cmluZyBmb3IgZGltZW5zaW9ubGVzcyBtZXRyaWNzIChlLmcuIFNtYXNoRmFjdG9yLCBTcGluUmF0ZSkuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRNZXRyaWNVbml0TGFiZWwoXG4gIG1ldHJpY05hbWU6IHN0cmluZyxcbiAgdW5pdENob2ljZTogVW5pdENob2ljZSA9IERFRkFVTFRfVU5JVF9DSE9JQ0Vcbik6IHN0cmluZyB7XG4gIGlmIChtZXRyaWNOYW1lIGluIEZJWEVEX1VOSVRfTEFCRUxTKSByZXR1cm4gRklYRURfVU5JVF9MQUJFTFNbbWV0cmljTmFtZV07XG4gIGlmIChTUEVFRF9NRVRSSUNTLmhhcyhtZXRyaWNOYW1lKSkgcmV0dXJuIFNQRUVEX0xBQkVMU1t1bml0Q2hvaWNlLnNwZWVkXTtcbiAgaWYgKFNNQUxMX0RJU1RBTkNFX01FVFJJQ1MuaGFzKG1ldHJpY05hbWUpKSByZXR1cm4gU01BTExfRElTVEFOQ0VfTEFCRUxTW2dldFNtYWxsRGlzdGFuY2VVbml0KHVuaXRDaG9pY2UpXTtcbiAgaWYgKERJU1RBTkNFX01FVFJJQ1MuaGFzKG1ldHJpY05hbWUpKSByZXR1cm4gRElTVEFOQ0VfTEFCRUxTW3VuaXRDaG9pY2UuZGlzdGFuY2VdO1xuICBpZiAoQU5HTEVfTUVUUklDUy5oYXMobWV0cmljTmFtZSkpIHJldHVybiBcIlx1MDBCMFwiO1xuICByZXR1cm4gXCJcIjtcbn1cblxuLyoqXG4gKiBDb252ZXJ0IGEgZGlzdGFuY2UgdmFsdWUgYmV0d2VlbiB1bml0cy5cbiAqIFxuICogQHBhcmFtIHZhbHVlIC0gVGhlIHZhbHVlIHRvIGNvbnZlcnRcbiAqIEBwYXJhbSBmcm9tVW5pdCAtIFNvdXJjZSB1bml0IChcInlhcmRzXCIgb3IgXCJtZXRlcnNcIilcbiAqIEBwYXJhbSB0b1VuaXQgLSBUYXJnZXQgdW5pdCAoXCJ5YXJkc1wiIG9yIFwibWV0ZXJzXCIpXG4gKiBAcmV0dXJucyBDb252ZXJ0ZWQgdmFsdWUsIG9yIG9yaWdpbmFsIGlmIHVuaXRzIG1hdGNoXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb252ZXJ0RGlzdGFuY2UoXG4gIHZhbHVlOiBudW1iZXIgfCBzdHJpbmcgfCBudWxsLFxuICBmcm9tVW5pdDogXCJ5YXJkc1wiIHwgXCJtZXRlcnNcIixcbiAgdG9Vbml0OiBcInlhcmRzXCIgfCBcIm1ldGVyc1wiXG4pOiBudW1iZXIgfCBzdHJpbmcgfCBudWxsIHtcbiAgaWYgKHZhbHVlID09PSBudWxsIHx8IHZhbHVlID09PSBcIlwiKSByZXR1cm4gdmFsdWU7XG5cbiAgY29uc3QgbnVtVmFsdWUgPSB0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCIgPyBwYXJzZUZsb2F0KHZhbHVlKSA6IHZhbHVlO1xuICBpZiAoaXNOYU4obnVtVmFsdWUpKSByZXR1cm4gdmFsdWU7XG5cbiAgaWYgKGZyb21Vbml0ID09PSB0b1VuaXQpIHJldHVybiBudW1WYWx1ZTtcblxuICAvLyBDb252ZXJ0IHRvIG1ldGVycyBmaXJzdCwgdGhlbiB0byB0YXJnZXQgdW5pdFxuICBjb25zdCBpbk1ldGVycyA9IGZyb21Vbml0ID09PSBcInlhcmRzXCIgPyBudW1WYWx1ZSAqIDAuOTE0NCA6IG51bVZhbHVlO1xuICByZXR1cm4gdG9Vbml0ID09PSBcInlhcmRzXCIgPyBpbk1ldGVycyAvIDAuOTE0NCA6IGluTWV0ZXJzO1xufVxuXG4vKipcbiAqIENvbnZlcnQgYW4gYW5nbGUgdmFsdWUgYmV0d2VlbiB1bml0cy5cbiAqIFxuICogQHBhcmFtIHZhbHVlIC0gVGhlIHZhbHVlIHRvIGNvbnZlcnRcbiAqIEBwYXJhbSBmcm9tVW5pdCAtIFNvdXJjZSB1bml0IChcImRlZ3JlZXNcIiBvciBcInJhZGlhbnNcIilcbiAqIEBwYXJhbSB0b1VuaXQgLSBUYXJnZXQgdW5pdCAoXCJkZWdyZWVzXCIgb3IgXCJyYWRpYW5zXCIpXG4gKiBAcmV0dXJucyBDb252ZXJ0ZWQgdmFsdWUsIG9yIG9yaWdpbmFsIGlmIHVuaXRzIG1hdGNoXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb252ZXJ0QW5nbGUoXG4gIHZhbHVlOiBudW1iZXIgfCBzdHJpbmcgfCBudWxsLFxuICBmcm9tVW5pdDogXCJkZWdyZWVzXCIgfCBcInJhZGlhbnNcIixcbiAgdG9Vbml0OiBcImRlZ3JlZXNcIiB8IFwicmFkaWFuc1wiXG4pOiBudW1iZXIgfCBzdHJpbmcgfCBudWxsIHtcbiAgaWYgKHZhbHVlID09PSBudWxsIHx8IHZhbHVlID09PSBcIlwiKSByZXR1cm4gdmFsdWU7XG5cbiAgY29uc3QgbnVtVmFsdWUgPSB0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCIgPyBwYXJzZUZsb2F0KHZhbHVlKSA6IHZhbHVlO1xuICBpZiAoaXNOYU4obnVtVmFsdWUpKSByZXR1cm4gdmFsdWU7XG5cbiAgaWYgKGZyb21Vbml0ID09PSB0b1VuaXQpIHJldHVybiBudW1WYWx1ZTtcblxuICAvLyBDb252ZXJ0IHRvIGRlZ3JlZXMgZmlyc3QsIHRoZW4gdG8gdGFyZ2V0IHVuaXRcbiAgY29uc3QgaW5EZWdyZWVzID0gZnJvbVVuaXQgPT09IFwiZGVncmVlc1wiID8gbnVtVmFsdWUgOiAobnVtVmFsdWUgKiAxODAgLyBNYXRoLlBJKTtcbiAgcmV0dXJuIHRvVW5pdCA9PT0gXCJkZWdyZWVzXCIgPyBpbkRlZ3JlZXMgOiAoaW5EZWdyZWVzICogTWF0aC5QSSAvIDE4MCk7XG59XG5cbi8qKlxuICogQ29udmVydCBhIHNwZWVkIHZhbHVlIGJldHdlZW4gdW5pdHMuXG4gKlxuICogQHBhcmFtIHZhbHVlIC0gVGhlIHZhbHVlIHRvIGNvbnZlcnRcbiAqIEBwYXJhbSBmcm9tVW5pdCAtIFNvdXJjZSB1bml0IChcIm1waFwiLCBcImttL2hcIiwgb3IgXCJtL3NcIilcbiAqIEBwYXJhbSB0b1VuaXQgLSBUYXJnZXQgdW5pdCAoXCJtcGhcIiwgXCJrbS9oXCIsIG9yIFwibS9zXCIpXG4gKiBAcmV0dXJucyBDb252ZXJ0ZWQgdmFsdWUsIG9yIG9yaWdpbmFsIGlmIHVuaXRzIG1hdGNoXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb252ZXJ0U3BlZWQoXG4gIHZhbHVlOiBudW1iZXIgfCBzdHJpbmcgfCBudWxsLFxuICBmcm9tVW5pdDogXCJtcGhcIiB8IFwia20vaFwiIHwgXCJtL3NcIixcbiAgdG9Vbml0OiBcIm1waFwiIHwgXCJrbS9oXCIgfCBcIm0vc1wiXG4pOiBudW1iZXIgfCBzdHJpbmcgfCBudWxsIHtcbiAgaWYgKHZhbHVlID09PSBudWxsIHx8IHZhbHVlID09PSBcIlwiKSByZXR1cm4gdmFsdWU7XG5cbiAgY29uc3QgbnVtVmFsdWUgPSB0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCIgPyBwYXJzZUZsb2F0KHZhbHVlKSA6IHZhbHVlO1xuICBpZiAoaXNOYU4obnVtVmFsdWUpKSByZXR1cm4gdmFsdWU7XG5cbiAgaWYgKGZyb21Vbml0ID09PSB0b1VuaXQpIHJldHVybiBudW1WYWx1ZTtcblxuICAvLyBDb252ZXJ0IHRvIG1waCBmaXJzdCwgdGhlbiB0byB0YXJnZXQgdW5pdFxuICBsZXQgaW5NcGg6IG51bWJlcjtcbiAgaWYgKGZyb21Vbml0ID09PSBcIm1waFwiKSBpbk1waCA9IG51bVZhbHVlO1xuICBlbHNlIGlmIChmcm9tVW5pdCA9PT0gXCJrbS9oXCIpIGluTXBoID0gbnVtVmFsdWUgLyAxLjYwOTM0NDtcbiAgZWxzZSBpbk1waCA9IG51bVZhbHVlICogMi4yMzY5NDsgLy8gbS9zIHRvIG1waFxuXG4gIGlmICh0b1VuaXQgPT09IFwibXBoXCIpIHJldHVybiBpbk1waDtcbiAgaWYgKHRvVW5pdCA9PT0gXCJrbS9oXCIpIHJldHVybiBpbk1waCAqIDEuNjA5MzQ0O1xuICByZXR1cm4gaW5NcGggLyAyLjIzNjk0OyAvLyBtcGggdG8gbS9zXG59XG5cbi8qKlxuICogR2V0IHRoZSBzbWFsbCBkaXN0YW5jZSB1bml0IGJhc2VkIG9uIHRoZSB1c2VyJ3MgZGlzdGFuY2UgY2hvaWNlLlxuICogWWFyZHMgdXNlcnMgc2VlIGluY2hlczsgbWV0ZXJzIHVzZXJzIHNlZSBjbS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFNtYWxsRGlzdGFuY2VVbml0KHVuaXRDaG9pY2U6IFVuaXRDaG9pY2UgPSBERUZBVUxUX1VOSVRfQ0hPSUNFKTogU21hbGxEaXN0YW5jZVVuaXQge1xuICByZXR1cm4gdW5pdENob2ljZS5kaXN0YW5jZSA9PT0gXCJ5YXJkc1wiID8gXCJpbmNoZXNcIiA6IFwiY21cIjtcbn1cblxuLyoqXG4gKiBDb252ZXJ0IGEgZGlzdGFuY2UgdmFsdWUgZnJvbSBtZXRlcnMgdG8gYSBzbWFsbCBkaXN0YW5jZSB1bml0IChpbmNoZXMgb3IgY20pLlxuICovXG5leHBvcnQgZnVuY3Rpb24gY29udmVydFNtYWxsRGlzdGFuY2UoXG4gIHZhbHVlOiBudW1iZXIgfCBzdHJpbmcgfCBudWxsLFxuICB0b1NtYWxsVW5pdDogU21hbGxEaXN0YW5jZVVuaXRcbik6IG51bWJlciB8IHN0cmluZyB8IG51bGwge1xuICBpZiAodmFsdWUgPT09IG51bGwgfHwgdmFsdWUgPT09IFwiXCIpIHJldHVybiB2YWx1ZTtcblxuICBjb25zdCBudW1WYWx1ZSA9IHR5cGVvZiB2YWx1ZSA9PT0gXCJzdHJpbmdcIiA/IHBhcnNlRmxvYXQodmFsdWUpIDogdmFsdWU7XG4gIGlmIChpc05hTihudW1WYWx1ZSkpIHJldHVybiB2YWx1ZTtcblxuICByZXR1cm4gdG9TbWFsbFVuaXQgPT09IFwiaW5jaGVzXCIgPyBudW1WYWx1ZSAqIDM5LjM3MDEgOiBudW1WYWx1ZSAqIDEwMDtcbn1cblxuLyoqXG4gKiBOb3JtYWxpemUgYSBtZXRyaWMgdmFsdWUgYmFzZWQgb24gdW5pdCBzeXN0ZW0gYWxpZ25tZW50IGFuZCB1c2VyJ3MgdW5pdCBjaG9pY2UuXG4gKlxuICogQ29udmVydHMgdmFsdWVzIGZyb20gdGhlIHNvdXJjZSB1bml0cyB0byB0YXJnZXQgb3V0cHV0IHVuaXRzOlxuICogLSBEaXN0YW5jZTogeWFyZHMgb3IgbWV0ZXJzIChwZXIgdW5pdENob2ljZS5kaXN0YW5jZSlcbiAqIC0gQW5nbGVzOiBhbHdheXMgZGVncmVlc1xuICogLSBTcGVlZDogbXBoIG9yIG0vcyAocGVyIHVuaXRDaG9pY2Uuc3BlZWQpXG4gKlxuICogQHBhcmFtIHZhbHVlIC0gVGhlIHJhdyBtZXRyaWMgdmFsdWVcbiAqIEBwYXJhbSBtZXRyaWNOYW1lIC0gVGhlIG5hbWUgb2YgdGhlIG1ldHJpYyBiZWluZyBub3JtYWxpemVkXG4gKiBAcGFyYW0gcmVwb3J0VW5pdFN5c3RlbSAtIFRoZSB1bml0IHN5c3RlbSB1c2VkIGluIHRoZSBzb3VyY2UgZGF0YVxuICogQHBhcmFtIHVuaXRDaG9pY2UgLSBVc2VyJ3MgdW5pdCBjaG9pY2UgKGRlZmF1bHRzIHRvIG1waCArIHlhcmRzKVxuICogQHJldHVybnMgTm9ybWFsaXplZCB2YWx1ZSBhcyBudW1iZXIgb3Igc3RyaW5nIChudWxsIGlmIGludmFsaWQpXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBub3JtYWxpemVNZXRyaWNWYWx1ZShcbiAgdmFsdWU6IE1ldHJpY1ZhbHVlLFxuICBtZXRyaWNOYW1lOiBzdHJpbmcsXG4gIHJlcG9ydFVuaXRTeXN0ZW06IFVuaXRTeXN0ZW0sXG4gIHVuaXRDaG9pY2U6IFVuaXRDaG9pY2UgPSBERUZBVUxUX1VOSVRfQ0hPSUNFXG4pOiBNZXRyaWNWYWx1ZSB7XG4gIGNvbnN0IG51bVZhbHVlID0gcGFyc2VOdW1lcmljVmFsdWUodmFsdWUpO1xuICBpZiAobnVtVmFsdWUgPT09IG51bGwpIHJldHVybiB2YWx1ZTtcblxuICBsZXQgY29udmVydGVkOiBudW1iZXI7XG5cbiAgaWYgKFNNQUxMX0RJU1RBTkNFX01FVFJJQ1MuaGFzKG1ldHJpY05hbWUpKSB7XG4gICAgY29udmVydGVkID0gY29udmVydFNtYWxsRGlzdGFuY2UoXG4gICAgICBudW1WYWx1ZSxcbiAgICAgIGdldFNtYWxsRGlzdGFuY2VVbml0KHVuaXRDaG9pY2UpXG4gICAgKSBhcyBudW1iZXI7XG4gIH0gZWxzZSBpZiAoRElTVEFOQ0VfTUVUUklDUy5oYXMobWV0cmljTmFtZSkpIHtcbiAgICBjb252ZXJ0ZWQgPSBjb252ZXJ0RGlzdGFuY2UoXG4gICAgICBudW1WYWx1ZSxcbiAgICAgIHJlcG9ydFVuaXRTeXN0ZW0uZGlzdGFuY2VVbml0LFxuICAgICAgdW5pdENob2ljZS5kaXN0YW5jZVxuICAgICkgYXMgbnVtYmVyO1xuICB9IGVsc2UgaWYgKEFOR0xFX01FVFJJQ1MuaGFzKG1ldHJpY05hbWUpKSB7XG4gICAgY29udmVydGVkID0gY29udmVydEFuZ2xlKFxuICAgICAgbnVtVmFsdWUsXG4gICAgICByZXBvcnRVbml0U3lzdGVtLmFuZ2xlVW5pdCxcbiAgICAgIFwiZGVncmVlc1wiXG4gICAgKSBhcyBudW1iZXI7XG4gIH0gZWxzZSBpZiAoU1BFRURfTUVUUklDUy5oYXMobWV0cmljTmFtZSkpIHtcbiAgICBjb252ZXJ0ZWQgPSBjb252ZXJ0U3BlZWQoXG4gICAgICBudW1WYWx1ZSxcbiAgICAgIHJlcG9ydFVuaXRTeXN0ZW0uc3BlZWRVbml0LFxuICAgICAgdW5pdENob2ljZS5zcGVlZFxuICAgICkgYXMgbnVtYmVyO1xuICB9IGVsc2Uge1xuICAgIGNvbnZlcnRlZCA9IG51bVZhbHVlO1xuICB9XG5cbiAgLy8gU3BpblJhdGU6IHJvdW5kIHRvIHdob2xlIG51bWJlcnNcbiAgaWYgKG1ldHJpY05hbWUgPT09IFwiU3BpblJhdGVcIikgcmV0dXJuIE1hdGgucm91bmQoY29udmVydGVkKTtcblxuICAvLyBSb3VuZCB0byAxIGRlY2ltYWwgcGxhY2UgZm9yIGNvbnNpc3RlbmN5XG4gIHJldHVybiBNYXRoLnJvdW5kKGNvbnZlcnRlZCAqIDEwKSAvIDEwO1xufVxuXG4vKipcbiAqIFBhcnNlIGEgbnVtZXJpYyB2YWx1ZSBmcm9tIE1ldHJpY1ZhbHVlIHR5cGUuXG4gKi9cbmZ1bmN0aW9uIHBhcnNlTnVtZXJpY1ZhbHVlKHZhbHVlOiBNZXRyaWNWYWx1ZSk6IG51bWJlciB8IG51bGwge1xuICBpZiAodmFsdWUgPT09IG51bGwgfHwgdmFsdWUgPT09IFwiXCIpIHJldHVybiBudWxsO1xuICBpZiAodHlwZW9mIHZhbHVlID09PSBcIm51bWJlclwiKSByZXR1cm4gaXNOYU4odmFsdWUpID8gbnVsbCA6IHZhbHVlO1xuICBcbiAgY29uc3QgcGFyc2VkID0gcGFyc2VGbG9hdCh2YWx1ZSk7XG4gIHJldHVybiBpc05hTihwYXJzZWQpID8gbnVsbCA6IHBhcnNlZDtcbn1cblxuZXhwb3J0IHR5cGUgTWV0cmljVmFsdWUgPSBzdHJpbmcgfCBudW1iZXIgfCBudWxsO1xuIiwgIi8qKlxuICogQ1NWIHdyaXRlciBmb3IgVHJhY2tQdWxsIHNlc3Npb24gZGF0YS5cbiAqIEltcGxlbWVudHMgY29yZSBjb2x1bW5zOiBEYXRlLCBDbHViLCBTaG90ICMsIFR5cGVcbiAqL1xuXG5pbXBvcnQgdHlwZSB7IFNlc3Npb25EYXRhLCBDbHViR3JvdXAsIFNob3QgfSBmcm9tIFwiLi4vbW9kZWxzL3R5cGVzXCI7XG5pbXBvcnQge1xuICBnZXRBcGlTb3VyY2VVbml0U3lzdGVtLFxuICBnZXRNZXRyaWNVbml0TGFiZWwsXG4gIG5vcm1hbGl6ZU1ldHJpY1ZhbHVlLFxuICBERUZBVUxUX1VOSVRfQ0hPSUNFLFxuICB0eXBlIFVuaXRDaG9pY2UsXG59IGZyb20gXCIuL3VuaXRfbm9ybWFsaXphdGlvblwiO1xuaW1wb3J0IHsgTUVUUklDX0RJU1BMQVlfTkFNRVMgfSBmcm9tIFwiLi9jb25zdGFudHNcIjtcblxuY29uc3QgTUVUUklDX0NPTFVNTl9PUkRFUjogc3RyaW5nW10gPSBbXG4gIC8vIFNwZWVkICYgRWZmaWNpZW5jeVxuICBcIkNsdWJTcGVlZFwiLCBcIkJhbGxTcGVlZFwiLCBcIlNtYXNoRmFjdG9yXCIsXG4gIC8vIENsdWIgRGVsaXZlcnlcbiAgXCJBdHRhY2tBbmdsZVwiLCBcIkNsdWJQYXRoXCIsIFwiRmFjZUFuZ2xlXCIsIFwiRmFjZVRvUGF0aFwiLCBcIlN3aW5nRGlyZWN0aW9uXCIsIFwiRHluYW1pY0xvZnRcIixcbiAgLy8gTGF1bmNoICYgU3BpblxuICBcIkxhdW5jaEFuZ2xlXCIsIFwiTGF1bmNoRGlyZWN0aW9uXCIsIFwiU3BpblJhdGVcIiwgXCJTcGluQXhpc1wiLCBcIlNwaW5Mb2Z0XCIsXG4gIC8vIERpc3RhbmNlXG4gIFwiQ2FycnlcIiwgXCJUb3RhbFwiLFxuICAvLyBEaXNwZXJzaW9uXG4gIFwiU2lkZVwiLCBcIlNpZGVUb3RhbFwiLCBcIkNhcnJ5U2lkZVwiLCBcIlRvdGFsU2lkZVwiLCBcIkN1cnZlXCIsXG4gIC8vIEJhbGwgRmxpZ2h0XG4gIFwiSGVpZ2h0XCIsIFwiTWF4SGVpZ2h0XCIsIFwiTGFuZGluZ0FuZ2xlXCIsIFwiSGFuZ1RpbWVcIixcbiAgLy8gSW1wYWN0XG4gIFwiTG93UG9pbnREaXN0YW5jZVwiLCBcIkltcGFjdEhlaWdodFwiLCBcIkltcGFjdE9mZnNldFwiLFxuICAvLyBPdGhlclxuICBcIlRlbXBvXCIsXG5dO1xuXG5mdW5jdGlvbiBnZXREaXNwbGF5TmFtZShtZXRyaWM6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBNRVRSSUNfRElTUExBWV9OQU1FU1ttZXRyaWNdID8/IG1ldHJpYztcbn1cblxuZnVuY3Rpb24gZ2V0Q29sdW1uTmFtZShtZXRyaWM6IHN0cmluZywgdW5pdENob2ljZTogVW5pdENob2ljZSk6IHN0cmluZyB7XG4gIGNvbnN0IGRpc3BsYXlOYW1lID0gZ2V0RGlzcGxheU5hbWUobWV0cmljKTtcbiAgY29uc3QgdW5pdExhYmVsID0gZ2V0TWV0cmljVW5pdExhYmVsKG1ldHJpYywgdW5pdENob2ljZSk7XG4gIHJldHVybiB1bml0TGFiZWwgPyBgJHtkaXNwbGF5TmFtZX0gKCR7dW5pdExhYmVsfSlgIDogZGlzcGxheU5hbWU7XG59XG5cbmZ1bmN0aW9uIGdlbmVyYXRlRmlsZW5hbWUoc2Vzc2lvbjogU2Vzc2lvbkRhdGEpOiBzdHJpbmcge1xuICByZXR1cm4gYFNob3REYXRhXyR7c2Vzc2lvbi5kYXRlfS5jc3ZgO1xufVxuXG5mdW5jdGlvbiBvcmRlck1ldHJpY3NCeVByaW9yaXR5KFxuICBhbGxNZXRyaWNzOiBzdHJpbmdbXSxcbiAgcHJpb3JpdHlPcmRlcjogc3RyaW5nW11cbik6IHN0cmluZ1tdIHtcbiAgY29uc3QgcmVzdWx0OiBzdHJpbmdbXSA9IFtdO1xuICBjb25zdCBzZWVuID0gbmV3IFNldDxzdHJpbmc+KCk7XG5cbiAgZm9yIChjb25zdCBtZXRyaWMgb2YgcHJpb3JpdHlPcmRlcikge1xuICAgIGlmIChhbGxNZXRyaWNzLmluY2x1ZGVzKG1ldHJpYykgJiYgIXNlZW4uaGFzKG1ldHJpYykpIHtcbiAgICAgIHJlc3VsdC5wdXNoKG1ldHJpYyk7XG4gICAgICBzZWVuLmFkZChtZXRyaWMpO1xuICAgIH1cbiAgfVxuXG4gIGZvciAoY29uc3QgbWV0cmljIG9mIGFsbE1ldHJpY3MpIHtcbiAgICBpZiAoIXNlZW4uaGFzKG1ldHJpYykpIHtcbiAgICAgIHJlc3VsdC5wdXNoKG1ldHJpYyk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gaGFzVGFncyhzZXNzaW9uOiBTZXNzaW9uRGF0YSk6IGJvb2xlYW4ge1xuICByZXR1cm4gc2Vzc2lvbi5jbHViX2dyb3Vwcy5zb21lKChjbHViKSA9PlxuICAgIGNsdWIuc2hvdHMuc29tZSgoc2hvdCkgPT4gc2hvdC50YWcgIT09IHVuZGVmaW5lZCAmJiBzaG90LnRhZyAhPT0gXCJcIilcbiAgKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHdyaXRlQ3N2KFxuICBzZXNzaW9uOiBTZXNzaW9uRGF0YSxcbiAgaW5jbHVkZUF2ZXJhZ2VzID0gdHJ1ZSxcbiAgbWV0cmljT3JkZXI/OiBzdHJpbmdbXSxcbiAgdW5pdENob2ljZTogVW5pdENob2ljZSA9IERFRkFVTFRfVU5JVF9DSE9JQ0UsXG4gIGhpdHRpbmdTdXJmYWNlPzogXCJHcmFzc1wiIHwgXCJNYXRcIlxuKTogc3RyaW5nIHtcbiAgY29uc3Qgb3JkZXJlZE1ldHJpY3MgPSBvcmRlck1ldHJpY3NCeVByaW9yaXR5KFxuICAgIHNlc3Npb24ubWV0cmljX25hbWVzLFxuICAgIG1ldHJpY09yZGVyID8/IE1FVFJJQ19DT0xVTU5fT1JERVJcbiAgKTtcblxuICBjb25zdCBoZWFkZXJSb3c6IHN0cmluZ1tdID0gW1wiRGF0ZVwiLCBcIkNsdWJcIl07XG5cbiAgaWYgKGhhc1RhZ3Moc2Vzc2lvbikpIHtcbiAgICBoZWFkZXJSb3cucHVzaChcIlRhZ1wiKTtcbiAgfVxuXG4gIGhlYWRlclJvdy5wdXNoKFwiU2hvdCAjXCIsIFwiVHlwZVwiKTtcblxuICBmb3IgKGNvbnN0IG1ldHJpYyBvZiBvcmRlcmVkTWV0cmljcykge1xuICAgIGhlYWRlclJvdy5wdXNoKGdldENvbHVtbk5hbWUobWV0cmljLCB1bml0Q2hvaWNlKSk7XG4gIH1cblxuICBjb25zdCByb3dzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+W10gPSBbXTtcblxuICAvLyBTb3VyY2UgdW5pdCBzeXN0ZW06IEFQSSBhbHdheXMgcmV0dXJucyBtL3MgKyBtZXRlcnMsIGFuZ2xlIHVuaXQgZnJvbSByZXBvcnRcbiAgY29uc3QgdW5pdFN5c3RlbSA9IGdldEFwaVNvdXJjZVVuaXRTeXN0ZW0oc2Vzc2lvbi5tZXRhZGF0YV9wYXJhbXMpO1xuXG4gIGZvciAoY29uc3QgY2x1YiBvZiBzZXNzaW9uLmNsdWJfZ3JvdXBzKSB7XG4gICAgZm9yIChjb25zdCBzaG90IG9mIGNsdWIuc2hvdHMpIHtcbiAgICAgIGNvbnN0IHJvdzogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcbiAgICAgICAgRGF0ZTogc2Vzc2lvbi5kYXRlLFxuICAgICAgICBDbHViOiBjbHViLmNsdWJfbmFtZSxcbiAgICAgICAgXCJTaG90ICNcIjogU3RyaW5nKHNob3Quc2hvdF9udW1iZXIgKyAxKSxcbiAgICAgICAgVHlwZTogXCJTaG90XCIsXG4gICAgICB9O1xuXG4gICAgICBpZiAoaGFzVGFncyhzZXNzaW9uKSkge1xuICAgICAgICByb3cuVGFnID0gc2hvdC50YWcgPz8gXCJcIjtcbiAgICAgIH1cblxuICAgICAgZm9yIChjb25zdCBtZXRyaWMgb2Ygb3JkZXJlZE1ldHJpY3MpIHtcbiAgICAgICAgY29uc3QgY29sTmFtZSA9IGdldENvbHVtbk5hbWUobWV0cmljLCB1bml0Q2hvaWNlKTtcbiAgICAgICAgY29uc3QgcmF3VmFsdWUgPSBzaG90Lm1ldHJpY3NbbWV0cmljXSA/PyBcIlwiO1xuXG4gICAgICAgIGlmICh0eXBlb2YgcmF3VmFsdWUgPT09IFwic3RyaW5nXCIgfHwgdHlwZW9mIHJhd1ZhbHVlID09PSBcIm51bWJlclwiKSB7XG4gICAgICAgICAgcm93W2NvbE5hbWVdID0gU3RyaW5nKG5vcm1hbGl6ZU1ldHJpY1ZhbHVlKHJhd1ZhbHVlLCBtZXRyaWMsIHVuaXRTeXN0ZW0sIHVuaXRDaG9pY2UpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByb3dbY29sTmFtZV0gPSBcIlwiO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJvd3MucHVzaChyb3cpO1xuICAgIH1cblxuICAgIGlmIChpbmNsdWRlQXZlcmFnZXMpIHtcbiAgICAgIC8vIEdyb3VwIHNob3RzIGJ5IHRhZ1xuICAgICAgY29uc3QgdGFnR3JvdXBzID0gbmV3IE1hcDxzdHJpbmcsIFNob3RbXT4oKTtcbiAgICAgIGZvciAoY29uc3Qgc2hvdCBvZiBjbHViLnNob3RzKSB7XG4gICAgICAgIGNvbnN0IHRhZyA9IHNob3QudGFnID8/IFwiXCI7XG4gICAgICAgIGlmICghdGFnR3JvdXBzLmhhcyh0YWcpKSB0YWdHcm91cHMuc2V0KHRhZywgW10pO1xuICAgICAgICB0YWdHcm91cHMuZ2V0KHRhZykhLnB1c2goc2hvdCk7XG4gICAgICB9XG5cbiAgICAgIGZvciAoY29uc3QgW3RhZywgc2hvdHNdIG9mIHRhZ0dyb3Vwcykge1xuICAgICAgICAvLyBPbmx5IHdyaXRlIGF2ZXJhZ2Ugcm93IGlmIGdyb3VwIGhhcyAyKyBzaG90c1xuICAgICAgICBpZiAoc2hvdHMubGVuZ3RoIDwgMikgY29udGludWU7XG5cbiAgICAgICAgY29uc3QgYXZnUm93OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xuICAgICAgICAgIERhdGU6IHNlc3Npb24uZGF0ZSxcbiAgICAgICAgICBDbHViOiBjbHViLmNsdWJfbmFtZSxcbiAgICAgICAgICBcIlNob3QgI1wiOiBcIlwiLFxuICAgICAgICAgIFR5cGU6IFwiQXZlcmFnZVwiLFxuICAgICAgICB9O1xuXG4gICAgICAgIGlmIChoYXNUYWdzKHNlc3Npb24pKSB7XG4gICAgICAgICAgYXZnUm93LlRhZyA9IHRhZztcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAoY29uc3QgbWV0cmljIG9mIG9yZGVyZWRNZXRyaWNzKSB7XG4gICAgICAgICAgY29uc3QgY29sTmFtZSA9IGdldENvbHVtbk5hbWUobWV0cmljLCB1bml0Q2hvaWNlKTtcbiAgICAgICAgICBjb25zdCB2YWx1ZXMgPSBzaG90c1xuICAgICAgICAgICAgLm1hcCgocykgPT4gcy5tZXRyaWNzW21ldHJpY10pXG4gICAgICAgICAgICAuZmlsdGVyKCh2KSA9PiB2ICE9PSB1bmRlZmluZWQgJiYgdiAhPT0gXCJcIilcbiAgICAgICAgICAgIC5tYXAoKHYpID0+IHBhcnNlRmxvYXQoU3RyaW5nKHYpKSk7XG4gICAgICAgICAgY29uc3QgbnVtZXJpY1ZhbHVlcyA9IHZhbHVlcy5maWx0ZXIoKHYpID0+ICFpc05hTih2KSk7XG5cbiAgICAgICAgICBpZiAobnVtZXJpY1ZhbHVlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBhdmcgPSBudW1lcmljVmFsdWVzLnJlZHVjZSgoYSwgYikgPT4gYSArIGIsIDApIC8gbnVtZXJpY1ZhbHVlcy5sZW5ndGg7XG4gICAgICAgICAgICBjb25zdCByb3VuZGVkID0gTWF0aC5yb3VuZChhdmcgKiAxMCkgLyAxMDtcbiAgICAgICAgICAgIGF2Z1Jvd1tjb2xOYW1lXSA9IFN0cmluZyhub3JtYWxpemVNZXRyaWNWYWx1ZShyb3VuZGVkLCBtZXRyaWMsIHVuaXRTeXN0ZW0sIHVuaXRDaG9pY2UpKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYXZnUm93W2NvbE5hbWVdID0gXCJcIjtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByb3dzLnB1c2goYXZnUm93KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBjb25zdCBsaW5lczogc3RyaW5nW10gPSBbXTtcblxuICBpZiAoaGl0dGluZ1N1cmZhY2UgIT09IHVuZGVmaW5lZCkge1xuICAgIGxpbmVzLnB1c2goYEhpdHRpbmcgU3VyZmFjZTogJHtoaXR0aW5nU3VyZmFjZX1gKTtcbiAgfVxuXG4gIGxpbmVzLnB1c2goaGVhZGVyUm93LmpvaW4oXCIsXCIpKTtcbiAgZm9yIChjb25zdCByb3cgb2Ygcm93cykge1xuICAgIGxpbmVzLnB1c2goXG4gICAgICBoZWFkZXJSb3dcbiAgICAgICAgLm1hcCgoY29sKSA9PiB7XG4gICAgICAgICAgY29uc3QgdmFsdWUgPSByb3dbY29sXSA/PyBcIlwiO1xuICAgICAgICAgIGlmICh2YWx1ZS5pbmNsdWRlcyhcIixcIikgfHwgdmFsdWUuaW5jbHVkZXMoJ1wiJykgfHwgdmFsdWUuaW5jbHVkZXMoXCJcXG5cIikpIHtcbiAgICAgICAgICAgIHJldHVybiBgXCIke3ZhbHVlLnJlcGxhY2UoL1wiL2csICdcIlwiJyl9XCJgO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgIH0pXG4gICAgICAgIC5qb2luKFwiLFwiKVxuICAgICk7XG4gIH1cblxuICByZXR1cm4gbGluZXMuam9pbihcIlxcblwiKTtcbn1cbiIsICIvKipcbiAqIFNlc3Npb24gaGlzdG9yeSBzdG9yYWdlIG1vZHVsZS5cbiAqIFNhdmVzLCBkZWR1cGxpY2F0ZXMgKGJ5IHJlcG9ydF9pZCksIGFuZCBldmljdHMgc2Vzc2lvbnMgZnJvbSBjaHJvbWUuc3RvcmFnZS5sb2NhbC5cbiAqL1xuXG5pbXBvcnQgdHlwZSB7IFNlc3Npb25EYXRhLCBTZXNzaW9uU25hcHNob3QsIEhpc3RvcnlFbnRyeSB9IGZyb20gXCIuLi9tb2RlbHMvdHlwZXNcIjtcbmltcG9ydCB7IFNUT1JBR0VfS0VZUyB9IGZyb20gXCIuL2NvbnN0YW50c1wiO1xuXG5jb25zdCBNQVhfU0VTU0lPTlMgPSAyMDtcblxuLyoqIFN0cmlwIHJhd19hcGlfZGF0YSBmcm9tIGEgU2Vzc2lvbkRhdGEgdG8gY3JlYXRlIGEgbGlnaHR3ZWlnaHQgc25hcHNob3QuICovXG5mdW5jdGlvbiBjcmVhdGVTbmFwc2hvdChzZXNzaW9uOiBTZXNzaW9uRGF0YSk6IFNlc3Npb25TbmFwc2hvdCB7XG4gIC8vIERlc3RydWN0dXJlIHRvIGV4Y2x1ZGUgcmF3X2FwaV9kYXRhXG4gIGNvbnN0IHsgcmF3X2FwaV9kYXRhOiBfLCAuLi5zbmFwc2hvdCB9ID0gc2Vzc2lvbjtcbiAgcmV0dXJuIHNuYXBzaG90O1xufVxuXG4vKipcbiAqIFNhdmUgYSBzZXNzaW9uIHRvIHRoZSByb2xsaW5nIGhpc3RvcnkgaW4gY2hyb21lLnN0b3JhZ2UubG9jYWwuXG4gKiAtIERlZHVwbGljYXRlcyBieSByZXBvcnRfaWQgKHJlcGxhY2VzIGV4aXN0aW5nIGVudHJ5LCByZWZyZXNoZXMgY2FwdHVyZWRfYXQpLlxuICogLSBFdmljdHMgb2xkZXN0IGVudHJ5IHdoZW4gdGhlIDIwLXNlc3Npb24gY2FwIGlzIHJlYWNoZWQuXG4gKiAtIFN0b3JlcyBlbnRyaWVzIHNvcnRlZCBuZXdlc3QtZmlyc3QgKGRlc2NlbmRpbmcgY2FwdHVyZWRfYXQpLlxuICovXG5leHBvcnQgZnVuY3Rpb24gc2F2ZVNlc3Npb25Ub0hpc3Rvcnkoc2Vzc2lvbjogU2Vzc2lvbkRhdGEpOiBQcm9taXNlPHZvaWQ+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBjaHJvbWUuc3RvcmFnZS5sb2NhbC5nZXQoXG4gICAgICBbU1RPUkFHRV9LRVlTLlNFU1NJT05fSElTVE9SWV0sXG4gICAgICAocmVzdWx0OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPikgPT4ge1xuICAgICAgICBpZiAoY2hyb21lLnJ1bnRpbWUubGFzdEVycm9yKSB7XG4gICAgICAgICAgcmV0dXJuIHJlamVjdChuZXcgRXJyb3IoY2hyb21lLnJ1bnRpbWUubGFzdEVycm9yLm1lc3NhZ2UpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGV4aXN0aW5nID0gKHJlc3VsdFtTVE9SQUdFX0tFWVMuU0VTU0lPTl9ISVNUT1JZXSBhcyBIaXN0b3J5RW50cnlbXSB8IHVuZGVmaW5lZCkgPz8gW107XG5cbiAgICAgICAgLy8gUmVtb3ZlIGFueSBleGlzdGluZyBlbnRyeSB3aXRoIHRoZSBzYW1lIHJlcG9ydF9pZCAoZGVkdXApXG4gICAgICAgIGNvbnN0IGZpbHRlcmVkID0gZXhpc3RpbmcuZmlsdGVyKFxuICAgICAgICAgIChlbnRyeSkgPT4gZW50cnkuc25hcHNob3QucmVwb3J0X2lkICE9PSBzZXNzaW9uLnJlcG9ydF9pZFxuICAgICAgICApO1xuXG4gICAgICAgIC8vIENyZWF0ZSBuZXcgZW50cnlcbiAgICAgICAgY29uc3QgbmV3RW50cnk6IEhpc3RvcnlFbnRyeSA9IHtcbiAgICAgICAgICBjYXB0dXJlZF9hdDogRGF0ZS5ub3coKSxcbiAgICAgICAgICBzbmFwc2hvdDogY3JlYXRlU25hcHNob3Qoc2Vzc2lvbiksXG4gICAgICAgIH07XG5cbiAgICAgICAgZmlsdGVyZWQucHVzaChuZXdFbnRyeSk7XG5cbiAgICAgICAgLy8gU29ydCBuZXdlc3QtZmlyc3QgKGRlc2NlbmRpbmcgY2FwdHVyZWRfYXQpXG4gICAgICAgIGZpbHRlcmVkLnNvcnQoKGEsIGIpID0+IGIuY2FwdHVyZWRfYXQgLSBhLmNhcHR1cmVkX2F0KTtcblxuICAgICAgICAvLyBFbmZvcmNlIGNhcCBcdTIwMTQgc2xpY2Uga2VlcHMgdGhlIG5ld2VzdCBNQVhfU0VTU0lPTlMgZW50cmllc1xuICAgICAgICBjb25zdCBjYXBwZWQgPSBmaWx0ZXJlZC5zbGljZSgwLCBNQVhfU0VTU0lPTlMpO1xuXG4gICAgICAgIGNocm9tZS5zdG9yYWdlLmxvY2FsLnNldChcbiAgICAgICAgICB7IFtTVE9SQUdFX0tFWVMuU0VTU0lPTl9ISVNUT1JZXTogY2FwcGVkIH0sXG4gICAgICAgICAgKCkgPT4ge1xuICAgICAgICAgICAgaWYgKGNocm9tZS5ydW50aW1lLmxhc3RFcnJvcikge1xuICAgICAgICAgICAgICByZXR1cm4gcmVqZWN0KG5ldyBFcnJvcihjaHJvbWUucnVudGltZS5sYXN0RXJyb3IubWVzc2FnZSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICApO1xuICB9KTtcbn1cblxuLyoqXG4gKiBNYXAgc3RvcmFnZSBlcnJvciBzdHJpbmdzIHRvIHVzZXItZnJpZW5kbHkgbWVzc2FnZXMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRIaXN0b3J5RXJyb3JNZXNzYWdlKGVycm9yOiBzdHJpbmcpOiBzdHJpbmcge1xuICBpZiAoL1FVT1RBX0JZVEVTfHF1b3RhL2kudGVzdChlcnJvcikpIHtcbiAgICByZXR1cm4gXCJTdG9yYWdlIGZ1bGwgLS0gb2xkZXN0IHNlc3Npb25zIHdpbGwgYmUgY2xlYXJlZFwiO1xuICB9XG4gIHJldHVybiBcIkNvdWxkIG5vdCBzYXZlIHRvIHNlc3Npb24gaGlzdG9yeVwiO1xufVxuIiwgIi8qKlxuICogU2VydmljZSBXb3JrZXIgZm9yIFRyYWNrUHVsbCBDaHJvbWUgRXh0ZW5zaW9uXG4gKi9cblxuaW1wb3J0IHsgU1RPUkFHRV9LRVlTIH0gZnJvbSBcIi4uL3NoYXJlZC9jb25zdGFudHNcIjtcbmltcG9ydCB7IHdyaXRlQ3N2IH0gZnJvbSBcIi4uL3NoYXJlZC9jc3Zfd3JpdGVyXCI7XG5pbXBvcnQgdHlwZSB7IFNlc3Npb25EYXRhIH0gZnJvbSBcIi4uL21vZGVscy90eXBlc1wiO1xuaW1wb3J0IHsgbWlncmF0ZUxlZ2FjeVByZWYsIERFRkFVTFRfVU5JVF9DSE9JQ0UsIHR5cGUgVW5pdENob2ljZSwgdHlwZSBTcGVlZFVuaXQsIHR5cGUgRGlzdGFuY2VVbml0IH0gZnJvbSBcIi4uL3NoYXJlZC91bml0X25vcm1hbGl6YXRpb25cIjtcbmltcG9ydCB7IHNhdmVTZXNzaW9uVG9IaXN0b3J5LCBnZXRIaXN0b3J5RXJyb3JNZXNzYWdlIH0gZnJvbSBcIi4uL3NoYXJlZC9oaXN0b3J5XCI7XG5cbmNocm9tZS5ydW50aW1lLm9uSW5zdGFsbGVkLmFkZExpc3RlbmVyKCgpID0+IHtcbiAgY29uc29sZS5sb2coXCJUcmFja1B1bGwgZXh0ZW5zaW9uIGluc3RhbGxlZFwiKTtcbn0pO1xuXG5pbnRlcmZhY2UgU2F2ZURhdGFSZXF1ZXN0IHtcbiAgdHlwZTogXCJTQVZFX0RBVEFcIjtcbiAgZGF0YTogU2Vzc2lvbkRhdGE7XG59XG5cbmludGVyZmFjZSBFeHBvcnRDc3ZSZXF1ZXN0IHtcbiAgdHlwZTogXCJFWFBPUlRfQ1NWX1JFUVVFU1RcIjtcbn1cblxuaW50ZXJmYWNlIEdldERhdGFSZXF1ZXN0IHtcbiAgdHlwZTogXCJHRVRfREFUQVwiO1xufVxuXG5mdW5jdGlvbiBnZXREb3dubG9hZEVycm9yTWVzc2FnZShvcmlnaW5hbEVycm9yOiBzdHJpbmcpOiBzdHJpbmcge1xuICBpZiAob3JpZ2luYWxFcnJvci5pbmNsdWRlcyhcImludmFsaWRcIikpIHtcbiAgICByZXR1cm4gXCJJbnZhbGlkIGRvd25sb2FkIGZvcm1hdFwiO1xuICB9XG4gIGlmIChvcmlnaW5hbEVycm9yLmluY2x1ZGVzKFwicXVvdGFcIikgfHwgb3JpZ2luYWxFcnJvci5pbmNsdWRlcyhcInNwYWNlXCIpKSB7XG4gICAgcmV0dXJuIFwiSW5zdWZmaWNpZW50IHN0b3JhZ2Ugc3BhY2VcIjtcbiAgfVxuICBpZiAob3JpZ2luYWxFcnJvci5pbmNsdWRlcyhcImJsb2NrZWRcIikgfHwgb3JpZ2luYWxFcnJvci5pbmNsdWRlcyhcInBvbGljeVwiKSkge1xuICAgIHJldHVybiBcIkRvd25sb2FkIGJsb2NrZWQgYnkgYnJvd3NlciBzZXR0aW5nc1wiO1xuICB9XG4gIHJldHVybiBvcmlnaW5hbEVycm9yO1xufVxuXG50eXBlIFJlcXVlc3RNZXNzYWdlID0gU2F2ZURhdGFSZXF1ZXN0IHwgRXhwb3J0Q3N2UmVxdWVzdCB8IEdldERhdGFSZXF1ZXN0O1xuXG5jaHJvbWUucnVudGltZS5vbk1lc3NhZ2UuYWRkTGlzdGVuZXIoKG1lc3NhZ2U6IFJlcXVlc3RNZXNzYWdlLCBzZW5kZXIsIHNlbmRSZXNwb25zZSkgPT4ge1xuICBpZiAobWVzc2FnZS50eXBlID09PSBcIkdFVF9EQVRBXCIpIHtcbiAgICBjaHJvbWUuc3RvcmFnZS5sb2NhbC5nZXQoW1NUT1JBR0VfS0VZUy5UUkFDS01BTl9EQVRBXSwgKHJlc3VsdCkgPT4ge1xuICAgICAgc2VuZFJlc3BvbnNlKHJlc3VsdFtTVE9SQUdFX0tFWVMuVFJBQ0tNQU5fREFUQV0gfHwgbnVsbCk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBpZiAobWVzc2FnZS50eXBlID09PSBcIlNBVkVfREFUQVwiKSB7XG4gICAgY29uc3Qgc2Vzc2lvbkRhdGEgPSAobWVzc2FnZSBhcyBTYXZlRGF0YVJlcXVlc3QpLmRhdGE7XG4gICAgY2hyb21lLnN0b3JhZ2UubG9jYWwuc2V0KHsgW1NUT1JBR0VfS0VZUy5UUkFDS01BTl9EQVRBXTogc2Vzc2lvbkRhdGEgfSwgKCkgPT4ge1xuICAgICAgaWYgKGNocm9tZS5ydW50aW1lLmxhc3RFcnJvcikge1xuICAgICAgICBjb25zb2xlLmVycm9yKFwiVHJhY2tQdWxsOiBGYWlsZWQgdG8gc2F2ZSBkYXRhOlwiLCBjaHJvbWUucnVudGltZS5sYXN0RXJyb3IpO1xuICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGNocm9tZS5ydW50aW1lLmxhc3RFcnJvci5tZXNzYWdlIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJUcmFja1B1bGw6IFNlc3Npb24gZGF0YSBzYXZlZCB0byBzdG9yYWdlXCIpO1xuICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiB0cnVlIH0pO1xuXG4gICAgICAgIC8vIEhpc3Rvcnkgc2F2ZSAtLSBmaXJlIGFuZCBmb3JnZXQsIG5ldmVyIGJsb2NrcyBwcmltYXJ5IGZsb3dcbiAgICAgICAgc2F2ZVNlc3Npb25Ub0hpc3Rvcnkoc2Vzc2lvbkRhdGEpLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKFwiVHJhY2tQdWxsOiBIaXN0b3J5IHNhdmUgZmFpbGVkOlwiLCBlcnIpO1xuICAgICAgICAgIGNvbnN0IG1zZyA9IGdldEhpc3RvcnlFcnJvck1lc3NhZ2UoZXJyLm1lc3NhZ2UpO1xuICAgICAgICAgIGNocm9tZS5ydW50aW1lLnNlbmRNZXNzYWdlKHsgdHlwZTogXCJISVNUT1JZX0VSUk9SXCIsIGVycm9yOiBtc2cgfSkuY2F0Y2goKCkgPT4ge1xuICAgICAgICAgICAgLy8gUG9wdXAgbm90IG9wZW4gLS0gYWxyZWFkeSBsb2dnZWQgdG8gY29uc29sZVxuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGlmIChtZXNzYWdlLnR5cGUgPT09IFwiRVhQT1JUX0NTVl9SRVFVRVNUXCIpIHtcbiAgICBjaHJvbWUuc3RvcmFnZS5sb2NhbC5nZXQoW1NUT1JBR0VfS0VZUy5UUkFDS01BTl9EQVRBLCBTVE9SQUdFX0tFWVMuU1BFRURfVU5JVCwgU1RPUkFHRV9LRVlTLkRJU1RBTkNFX1VOSVQsIFNUT1JBR0VfS0VZUy5ISVRUSU5HX1NVUkZBQ0UsIFNUT1JBR0VfS0VZUy5JTkNMVURFX0FWRVJBR0VTLCBcInVuaXRQcmVmZXJlbmNlXCJdLCAocmVzdWx0KSA9PiB7XG4gICAgICBjb25zdCBkYXRhID0gcmVzdWx0W1NUT1JBR0VfS0VZUy5UUkFDS01BTl9EQVRBXSBhcyBTZXNzaW9uRGF0YSB8IHVuZGVmaW5lZDtcbiAgICAgIGlmICghZGF0YSB8fCAhZGF0YS5jbHViX2dyb3VwcyB8fCBkYXRhLmNsdWJfZ3JvdXBzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFwiTm8gZGF0YSB0byBleHBvcnRcIiB9KTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB0cnkge1xuICAgICAgICBsZXQgdW5pdENob2ljZTogVW5pdENob2ljZTtcbiAgICAgICAgaWYgKHJlc3VsdFtTVE9SQUdFX0tFWVMuU1BFRURfVU5JVF0gJiYgcmVzdWx0W1NUT1JBR0VfS0VZUy5ESVNUQU5DRV9VTklUXSkge1xuICAgICAgICAgIHVuaXRDaG9pY2UgPSB7XG4gICAgICAgICAgICBzcGVlZDogcmVzdWx0W1NUT1JBR0VfS0VZUy5TUEVFRF9VTklUXSBhcyBTcGVlZFVuaXQsXG4gICAgICAgICAgICBkaXN0YW5jZTogcmVzdWx0W1NUT1JBR0VfS0VZUy5ESVNUQU5DRV9VTklUXSBhcyBEaXN0YW5jZVVuaXQsXG4gICAgICAgICAgfTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB1bml0Q2hvaWNlID0gbWlncmF0ZUxlZ2FjeVByZWYocmVzdWx0W1widW5pdFByZWZlcmVuY2VcIl0gYXMgc3RyaW5nIHwgdW5kZWZpbmVkKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBzdXJmYWNlID0gKHJlc3VsdFtTVE9SQUdFX0tFWVMuSElUVElOR19TVVJGQUNFXSBhcyBcIkdyYXNzXCIgfCBcIk1hdFwiKSA/PyBcIk1hdFwiO1xuICAgICAgICBjb25zdCBpbmNsdWRlQXZlcmFnZXMgPSByZXN1bHRbU1RPUkFHRV9LRVlTLklOQ0xVREVfQVZFUkFHRVNdID09PSB1bmRlZmluZWRcbiAgICAgICAgICA/IHRydWVcbiAgICAgICAgICA6IEJvb2xlYW4ocmVzdWx0W1NUT1JBR0VfS0VZUy5JTkNMVURFX0FWRVJBR0VTXSk7XG4gICAgICAgIGNvbnN0IGNzdkNvbnRlbnQgPSB3cml0ZUNzdihkYXRhLCBpbmNsdWRlQXZlcmFnZXMsIHVuZGVmaW5lZCwgdW5pdENob2ljZSwgc3VyZmFjZSk7XG4gICAgICAgIGNvbnN0IGZpbGVuYW1lID0gYFNob3REYXRhXyR7ZGF0YS5kYXRlIHx8IFwidW5rbm93blwifS5jc3ZgO1xuXG4gICAgICAgIGNocm9tZS5kb3dubG9hZHMuZG93bmxvYWQoXG4gICAgICAgICAge1xuICAgICAgICAgICAgdXJsOiBgZGF0YTp0ZXh0L2NzdjtjaGFyc2V0PXV0Zi04LCR7ZW5jb2RlVVJJQ29tcG9uZW50KGNzdkNvbnRlbnQpfWAsXG4gICAgICAgICAgICBmaWxlbmFtZTogZmlsZW5hbWUsXG4gICAgICAgICAgICBzYXZlQXM6IGZhbHNlLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgKGRvd25sb2FkSWQpID0+IHtcbiAgICAgICAgICAgIGlmIChjaHJvbWUucnVudGltZS5sYXN0RXJyb3IpIHtcbiAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIlRyYWNrUHVsbDogRG93bmxvYWQgZmFpbGVkOlwiLCBjaHJvbWUucnVudGltZS5sYXN0RXJyb3IpO1xuICAgICAgICAgICAgICBjb25zdCBlcnJvck1lc3NhZ2UgPSBnZXREb3dubG9hZEVycm9yTWVzc2FnZShjaHJvbWUucnVudGltZS5sYXN0RXJyb3IubWVzc2FnZSk7XG4gICAgICAgICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3JNZXNzYWdlIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coYFRyYWNrUHVsbDogQ1NWIGV4cG9ydGVkIHdpdGggZG93bmxvYWQgSUQgJHtkb3dubG9hZElkfWApO1xuICAgICAgICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiB0cnVlLCBkb3dubG9hZElkLCBmaWxlbmFtZSB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBjb25zb2xlLmVycm9yKFwiVHJhY2tQdWxsOiBDU1YgZ2VuZXJhdGlvbiBmYWlsZWQ6XCIsIGVycm9yKTtcbiAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcikgfSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbn0pO1xuXG5jaHJvbWUuc3RvcmFnZS5vbkNoYW5nZWQuYWRkTGlzdGVuZXIoKGNoYW5nZXMsIG5hbWVzcGFjZSkgPT4ge1xuICBpZiAobmFtZXNwYWNlID09PSBcImxvY2FsXCIgJiYgY2hhbmdlc1tTVE9SQUdFX0tFWVMuVFJBQ0tNQU5fREFUQV0pIHtcbiAgICBjb25zdCBuZXdWYWx1ZSA9IGNoYW5nZXNbU1RPUkFHRV9LRVlTLlRSQUNLTUFOX0RBVEFdLm5ld1ZhbHVlO1xuICAgIGNocm9tZS5ydW50aW1lLnNlbmRNZXNzYWdlKHsgdHlwZTogXCJEQVRBX1VQREFURURcIiwgZGF0YTogbmV3VmFsdWUgfSkuY2F0Y2goKCkgPT4ge1xuICAgICAgLy8gSWdub3JlIGVycm9ycyB3aGVuIG5vIHBvcHVwIGlzIGxpc3RlbmluZ1xuICAgIH0pO1xuICB9XG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7QUFBQSxNQTRFYSxzQkFrRUE7QUE5SWI7QUFBQTtBQTRFTyxNQUFNLHVCQUErQztBQUFBLFFBQzFELFdBQVc7QUFBQSxRQUNYLFdBQVc7QUFBQSxRQUNYLGFB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
