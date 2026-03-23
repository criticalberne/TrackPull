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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL3NoYXJlZC9jb25zdGFudHMudHMiLCAiLi4vc3JjL3NoYXJlZC91bml0X25vcm1hbGl6YXRpb24udHMiLCAiLi4vc3JjL3NoYXJlZC9jc3Zfd3JpdGVyLnRzIiwgIi4uL3NyYy9zaGFyZWQvaGlzdG9yeS50cyIsICIuLi9zcmMvYmFja2dyb3VuZC9zZXJ2aWNlV29ya2VyLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyIvKipcbiAqIFNoYXJlZCBjb25zdGFudHMgaW5jbHVkaW5nIENTUyBzZWxlY3RvcnMgYW5kIGNvbmZpZ3VyYXRpb24uXG4gKiBCYXNlZCBvbiBQeXRob24gc2NyYXBlciBjb25zdGFudHMucHkgaW1wbGVtZW50YXRpb24uXG4gKi9cblxuLy8gQ29tcGxldGUgbGlzdCBvZiBhbGwga25vd24gVHJhY2ttYW4gbWV0cmljcyAoVVJMIHBhcmFtZXRlciBuYW1lcylcbmV4cG9ydCBjb25zdCBBTExfTUVUUklDUyA9IFtcbiAgXCJDbHViU3BlZWRcIixcbiAgXCJCYWxsU3BlZWRcIixcbiAgXCJTbWFzaEZhY3RvclwiLFxuICBcIkF0dGFja0FuZ2xlXCIsXG4gIFwiQ2x1YlBhdGhcIixcbiAgXCJGYWNlQW5nbGVcIixcbiAgXCJGYWNlVG9QYXRoXCIsXG4gIFwiU3dpbmdEaXJlY3Rpb25cIixcbiAgXCJEeW5hbWljTG9mdFwiLFxuICBcIlNwaW5SYXRlXCIsXG4gIFwiU3BpbkF4aXNcIixcbiAgXCJTcGluTG9mdFwiLFxuICBcIkxhdW5jaEFuZ2xlXCIsXG4gIFwiTGF1bmNoRGlyZWN0aW9uXCIsXG4gIFwiQ2FycnlcIixcbiAgXCJUb3RhbFwiLFxuICBcIlNpZGVcIixcbiAgXCJTaWRlVG90YWxcIixcbiAgXCJDYXJyeVNpZGVcIixcbiAgXCJUb3RhbFNpZGVcIixcbiAgXCJIZWlnaHRcIixcbiAgXCJNYXhIZWlnaHRcIixcbiAgXCJDdXJ2ZVwiLFxuICBcIkxhbmRpbmdBbmdsZVwiLFxuICBcIkhhbmdUaW1lXCIsXG4gIFwiTG93UG9pbnREaXN0YW5jZVwiLFxuICBcIkltcGFjdEhlaWdodFwiLFxuICBcIkltcGFjdE9mZnNldFwiLFxuICBcIlRlbXBvXCIsXG5dIGFzIGNvbnN0O1xuXG4vLyBNZXRyaWNzIHNwbGl0IGludG8gZ3JvdXBzIGZvciBtdWx0aS1wYWdlLWxvYWQgSFRNTCBmYWxsYmFja1xuZXhwb3J0IGNvbnN0IE1FVFJJQ19HUk9VUFMgPSBbXG4gIFtcbiAgICBcIkNsdWJTcGVlZFwiLFxuICAgIFwiQmFsbFNwZWVkXCIsXG4gICAgXCJTbWFzaEZhY3RvclwiLFxuICAgIFwiQXR0YWNrQW5nbGVcIixcbiAgICBcIkNsdWJQYXRoXCIsXG4gICAgXCJGYWNlQW5nbGVcIixcbiAgICBcIkZhY2VUb1BhdGhcIixcbiAgICBcIlN3aW5nRGlyZWN0aW9uXCIsXG4gICAgXCJEeW5hbWljTG9mdFwiLFxuICAgIFwiU3BpbkxvZnRcIixcbiAgXSxcbiAgW1xuICAgIFwiU3BpblJhdGVcIixcbiAgICBcIlNwaW5BeGlzXCIsXG4gICAgXCJMYXVuY2hBbmdsZVwiLFxuICAgIFwiTGF1bmNoRGlyZWN0aW9uXCIsXG4gICAgXCJDYXJyeVwiLFxuICAgIFwiVG90YWxcIixcbiAgICBcIlNpZGVcIixcbiAgICBcIlNpZGVUb3RhbFwiLFxuICAgIFwiQ2FycnlTaWRlXCIsXG4gICAgXCJUb3RhbFNpZGVcIixcbiAgICBcIkhlaWdodFwiLFxuICAgIFwiTWF4SGVpZ2h0XCIsXG4gICAgXCJDdXJ2ZVwiLFxuICAgIFwiTGFuZGluZ0FuZ2xlXCIsXG4gICAgXCJIYW5nVGltZVwiLFxuICAgIFwiTG93UG9pbnREaXN0YW5jZVwiLFxuICAgIFwiSW1wYWN0SGVpZ2h0XCIsXG4gICAgXCJJbXBhY3RPZmZzZXRcIixcbiAgICBcIlRlbXBvXCIsXG4gIF0sXG5dIGFzIGNvbnN0O1xuXG4vLyBEaXNwbGF5IG5hbWVzOiBVUkwgcGFyYW0gbmFtZSAtPiBodW1hbi1yZWFkYWJsZSBDU1YgaGVhZGVyXG5leHBvcnQgY29uc3QgTUVUUklDX0RJU1BMQVlfTkFNRVM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XG4gIENsdWJTcGVlZDogXCJDbHViIFNwZWVkXCIsXG4gIEJhbGxTcGVlZDogXCJCYWxsIFNwZWVkXCIsXG4gIFNtYXNoRmFjdG9yOiBcIlNtYXNoIEZhY3RvclwiLFxuICBBdHRhY2tBbmdsZTogXCJBdHRhY2sgQW5nbGVcIixcbiAgQ2x1YlBhdGg6IFwiQ2x1YiBQYXRoXCIsXG4gIEZhY2VBbmdsZTogXCJGYWNlIEFuZ2xlXCIsXG4gIEZhY2VUb1BhdGg6IFwiRmFjZSBUbyBQYXRoXCIsXG4gIFN3aW5nRGlyZWN0aW9uOiBcIlN3aW5nIERpcmVjdGlvblwiLFxuICBEeW5hbWljTG9mdDogXCJEeW5hbWljIExvZnRcIixcbiAgU3BpblJhdGU6IFwiU3BpbiBSYXRlXCIsXG4gIFNwaW5BeGlzOiBcIlNwaW4gQXhpc1wiLFxuICBTcGluTG9mdDogXCJTcGluIExvZnRcIixcbiAgTGF1bmNoQW5nbGU6IFwiTGF1bmNoIEFuZ2xlXCIsXG4gIExhdW5jaERpcmVjdGlvbjogXCJMYXVuY2ggRGlyZWN0aW9uXCIsXG4gIENhcnJ5OiBcIkNhcnJ5XCIsXG4gIFRvdGFsOiBcIlRvdGFsXCIsXG4gIFNpZGU6IFwiU2lkZVwiLFxuICBTaWRlVG90YWw6IFwiU2lkZSBUb3RhbFwiLFxuICBDYXJyeVNpZGU6IFwiQ2FycnkgU2lkZVwiLFxuICBUb3RhbFNpZGU6IFwiVG90YWwgU2lkZVwiLFxuICBIZWlnaHQ6IFwiSGVpZ2h0XCIsXG4gIE1heEhlaWdodDogXCJNYXggSGVpZ2h0XCIsXG4gIEN1cnZlOiBcIkN1cnZlXCIsXG4gIExhbmRpbmdBbmdsZTogXCJMYW5kaW5nIEFuZ2xlXCIsXG4gIEhhbmdUaW1lOiBcIkhhbmcgVGltZVwiLFxuICBMb3dQb2ludERpc3RhbmNlOiBcIkxvdyBQb2ludFwiLFxuICBJbXBhY3RIZWlnaHQ6IFwiSW1wYWN0IEhlaWdodFwiLFxuICBJbXBhY3RPZmZzZXQ6IFwiSW1wYWN0IE9mZnNldFwiLFxuICBUZW1wbzogXCJUZW1wb1wiLFxufTtcblxuLy8gQ1NTIGNsYXNzIHNlbGVjdG9ycyAoZnJvbSBUcmFja21hbidzIHJlbmRlcmVkIEhUTUwpXG5leHBvcnQgY29uc3QgQ1NTX0RBVEUgPSBcImRhdGVcIjtcbmV4cG9ydCBjb25zdCBDU1NfUkVTVUxUU19XUkFQUEVSID0gXCJwbGF5ZXItYW5kLXJlc3VsdHMtdGFibGUtd3JhcHBlclwiO1xuZXhwb3J0IGNvbnN0IENTU19SRVNVTFRTX1RBQkxFID0gXCJSZXN1bHRzVGFibGVcIjtcbmV4cG9ydCBjb25zdCBDU1NfQ0xVQl9UQUcgPSBcImdyb3VwLXRhZ1wiO1xuZXhwb3J0IGNvbnN0IENTU19QQVJBTV9OQU1FU19ST1cgPSBcInBhcmFtZXRlci1uYW1lcy1yb3dcIjtcbmV4cG9ydCBjb25zdCBDU1NfUEFSQU1fTkFNRSA9IFwicGFyYW1ldGVyLW5hbWVcIjtcbmV4cG9ydCBjb25zdCBDU1NfU0hPVF9ERVRBSUxfUk9XID0gXCJyb3ctd2l0aC1zaG90LWRldGFpbHNcIjtcbmV4cG9ydCBjb25zdCBDU1NfQVZFUkFHRV9WQUxVRVMgPSBcImF2ZXJhZ2UtdmFsdWVzXCI7XG5leHBvcnQgY29uc3QgQ1NTX0NPTlNJU1RFTkNZX1ZBTFVFUyA9IFwiY29uc2lzdGVuY3ktdmFsdWVzXCI7XG5cbi8vIEFQSSBVUkwgcGF0dGVybnMgdGhhdCBsaWtlbHkgaW5kaWNhdGUgYW4gQVBJIGRhdGEgcmVzcG9uc2VcbmV4cG9ydCBjb25zdCBBUElfVVJMX1BBVFRFUk5TID0gW1xuICBcImFwaS50cmFja21hbmdvbGYuY29tXCIsXG4gIFwidHJhY2ttYW5nb2xmLmNvbS9hcGlcIixcbiAgXCIvYXBpL1wiLFxuICBcIi9yZXBvcnRzL1wiLFxuICBcIi9hY3Rpdml0aWVzL1wiLFxuICBcIi9zaG90cy9cIixcbiAgXCJncmFwaHFsXCIsXG5dO1xuXG4vLyBUaW1lb3V0cyAobWlsbGlzZWNvbmRzKVxuZXhwb3J0IGNvbnN0IFBBR0VfTE9BRF9USU1FT1VUID0gMzBfMDAwO1xuZXhwb3J0IGNvbnN0IERBVEFfTE9BRF9USU1FT1VUID0gMTVfMDAwO1xuXG4vLyBUcmFja21hbiBiYXNlIFVSTFxuZXhwb3J0IGNvbnN0IEJBU0VfVVJMID0gXCJodHRwczovL3dlYi1keW5hbWljLXJlcG9ydHMudHJhY2ttYW5nb2xmLmNvbS9cIjtcblxuLy8gQ3VzdG9tIHByb21wdCBzdG9yYWdlIGtleXNcbmV4cG9ydCBjb25zdCBDVVNUT01fUFJPTVBUX0tFWV9QUkVGSVggPSBcImN1c3RvbVByb21wdF9cIiBhcyBjb25zdDtcbmV4cG9ydCBjb25zdCBDVVNUT01fUFJPTVBUX0lEU19LRVkgPSBcImN1c3RvbVByb21wdElkc1wiIGFzIGNvbnN0O1xuXG4vLyBTdG9yYWdlIGtleXMgZm9yIENocm9tZSBleHRlbnNpb24gKGFsaWduZWQgYmV0d2VlbiBiYWNrZ3JvdW5kIGFuZCBwb3B1cClcbmV4cG9ydCBjb25zdCBTVE9SQUdFX0tFWVMgPSB7XG4gIFRSQUNLTUFOX0RBVEE6IFwidHJhY2ttYW5EYXRhXCIsXG4gIFNQRUVEX1VOSVQ6IFwic3BlZWRVbml0XCIsXG4gIERJU1RBTkNFX1VOSVQ6IFwiZGlzdGFuY2VVbml0XCIsXG4gIFNFTEVDVEVEX1BST01QVF9JRDogXCJzZWxlY3RlZFByb21wdElkXCIsXG4gIEFJX1NFUlZJQ0U6IFwiYWlTZXJ2aWNlXCIsXG4gIEhJVFRJTkdfU1VSRkFDRTogXCJoaXR0aW5nU3VyZmFjZVwiLFxuICBJTkNMVURFX0FWRVJBR0VTOiBcImluY2x1ZGVBdmVyYWdlc1wiLFxuICBTRVNTSU9OX0hJU1RPUlk6IFwic2Vzc2lvbkhpc3RvcnlcIixcbn0gYXMgY29uc3Q7XG4iLCAiLyoqXG4gKiBVbml0IG5vcm1hbGl6YXRpb24gdXRpbGl0aWVzIGZvciBUcmFja21hbiBtZWFzdXJlbWVudHMuXG4gKiBcbiAqIFRyYWNrbWFuIHVzZXMgbmRfKiBwYXJhbWV0ZXJzIHRvIHNwZWNpZnkgdW5pdHM6XG4gKiAtIG5kXzAwMSwgbmRfMDAyLCBldGMuIGRlZmluZSB1bml0IHN5c3RlbXMgZm9yIGRpZmZlcmVudCBtZWFzdXJlbWVudCBncm91cHNcbiAqIC0gQ29tbW9uIHZhbHVlczogNzg5MDEyID0geWFyZHMvZGVncmVlcywgNzg5MDEzID0gbWV0ZXJzL3JhZGlhbnNcbiAqL1xuXG5leHBvcnQgdHlwZSBVbml0U3lzdGVtSWQgPSBcIjc4OTAxMlwiIHwgXCI3ODkwMTNcIiB8IFwiNzg5MDE0XCIgfCBzdHJpbmc7XG5cbmV4cG9ydCB0eXBlIFNwZWVkVW5pdCA9IFwibXBoXCIgfCBcIm0vc1wiO1xuZXhwb3J0IHR5cGUgRGlzdGFuY2VVbml0ID0gXCJ5YXJkc1wiIHwgXCJtZXRlcnNcIjtcbmV4cG9ydCB0eXBlIFNtYWxsRGlzdGFuY2VVbml0ID0gXCJpbmNoZXNcIiB8IFwiY21cIjtcbmV4cG9ydCBpbnRlcmZhY2UgVW5pdENob2ljZSB7IHNwZWVkOiBTcGVlZFVuaXQ7IGRpc3RhbmNlOiBEaXN0YW5jZVVuaXQgfVxuZXhwb3J0IGNvbnN0IERFRkFVTFRfVU5JVF9DSE9JQ0U6IFVuaXRDaG9pY2UgPSB7IHNwZWVkOiBcIm1waFwiLCBkaXN0YW5jZTogXCJ5YXJkc1wiIH07XG5cbi8qKlxuICogVHJhY2ttYW4gdW5pdCBzeXN0ZW0gZGVmaW5pdGlvbnMuXG4gKiBNYXBzIG5kXyogcGFyYW1ldGVyIHZhbHVlcyB0byBhY3R1YWwgdW5pdHMgZm9yIGVhY2ggbWV0cmljLlxuICovXG5leHBvcnQgY29uc3QgVU5JVF9TWVNURU1TOiBSZWNvcmQ8VW5pdFN5c3RlbUlkLCBVbml0U3lzdGVtPiA9IHtcbiAgLy8gSW1wZXJpYWwgKHlhcmRzLCBkZWdyZWVzKSAtIG1vc3QgY29tbW9uXG4gIFwiNzg5MDEyXCI6IHtcbiAgICBpZDogXCI3ODkwMTJcIixcbiAgICBuYW1lOiBcIkltcGVyaWFsXCIsXG4gICAgZGlzdGFuY2VVbml0OiBcInlhcmRzXCIsXG4gICAgYW5nbGVVbml0OiBcImRlZ3JlZXNcIixcbiAgICBzcGVlZFVuaXQ6IFwibXBoXCIsXG4gIH0sXG4gIC8vIE1ldHJpYyAobWV0ZXJzLCByYWRpYW5zKVxuICBcIjc4OTAxM1wiOiB7XG4gICAgaWQ6IFwiNzg5MDEzXCIsXG4gICAgbmFtZTogXCJNZXRyaWMgKHJhZClcIixcbiAgICBkaXN0YW5jZVVuaXQ6IFwibWV0ZXJzXCIsXG4gICAgYW5nbGVVbml0OiBcInJhZGlhbnNcIixcbiAgICBzcGVlZFVuaXQ6IFwia20vaFwiLFxuICB9LFxuICAvLyBNZXRyaWMgKG1ldGVycywgZGVncmVlcykgLSBsZXNzIGNvbW1vblxuICBcIjc4OTAxNFwiOiB7XG4gICAgaWQ6IFwiNzg5MDE0XCIsXG4gICAgbmFtZTogXCJNZXRyaWMgKGRlZylcIixcbiAgICBkaXN0YW5jZVVuaXQ6IFwibWV0ZXJzXCIsXG4gICAgYW5nbGVVbml0OiBcImRlZ3JlZXNcIixcbiAgICBzcGVlZFVuaXQ6IFwia20vaFwiLFxuICB9LFxufTtcblxuLyoqXG4gKiBVbml0IHN5c3RlbSBjb25maWd1cmF0aW9uLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFVuaXRTeXN0ZW0ge1xuICBpZDogVW5pdFN5c3RlbUlkO1xuICBuYW1lOiBzdHJpbmc7XG4gIGRpc3RhbmNlVW5pdDogXCJ5YXJkc1wiIHwgXCJtZXRlcnNcIjtcbiAgYW5nbGVVbml0OiBcImRlZ3JlZXNcIiB8IFwicmFkaWFuc1wiO1xuICBzcGVlZFVuaXQ6IFwibXBoXCIgfCBcImttL2hcIiB8IFwibS9zXCI7XG59XG5cbi8qKlxuICogTWV0cmljcyB0aGF0IHVzZSBkaXN0YW5jZSB1bml0cy5cbiAqL1xuZXhwb3J0IGNvbnN0IERJU1RBTkNFX01FVFJJQ1MgPSBuZXcgU2V0KFtcbiAgXCJDYXJyeVwiLFxuICBcIlRvdGFsXCIsXG4gIFwiU2lkZVwiLFxuICBcIlNpZGVUb3RhbFwiLFxuICBcIkNhcnJ5U2lkZVwiLFxuICBcIlRvdGFsU2lkZVwiLFxuICBcIkhlaWdodFwiLFxuICBcIk1heEhlaWdodFwiLFxuICBcIkN1cnZlXCIsXG5dKTtcblxuLyoqXG4gKiBNZXRyaWNzIHRoYXQgdXNlIHNtYWxsIGRpc3RhbmNlIHVuaXRzIChpbmNoZXMvY20pLlxuICogVGhlc2UgdmFsdWVzIGNvbWUgZnJvbSB0aGUgQVBJIGluIG1ldGVycyBidXQgYXJlIHRvbyBzbWFsbCBmb3IgeWFyZHMvbWV0ZXJzLlxuICovXG5leHBvcnQgY29uc3QgU01BTExfRElTVEFOQ0VfTUVUUklDUyA9IG5ldyBTZXQoW1xuICBcIkxvd1BvaW50RGlzdGFuY2VcIixcbl0pO1xuXG4vKipcbiAqIFRyYWNrbWFuIGltcGFjdCBsb2NhdGlvbiBtZXRyaWNzIGFyZSBhbHdheXMgZGlzcGxheWVkIGluIG1pbGxpbWV0ZXJzLlxuICogVGhlIEFQSSByZXR1cm5zIHRoZXNlIHZhbHVlcyBpbiBtZXRlcnMuXG4gKi9cbmV4cG9ydCBjb25zdCBNSUxMSU1FVEVSX01FVFJJQ1MgPSBuZXcgU2V0KFtcbiAgXCJJbXBhY3RIZWlnaHRcIixcbiAgXCJJbXBhY3RPZmZzZXRcIixcbl0pO1xuXG4vKipcbiAqIE1ldHJpY3MgdGhhdCB1c2UgYW5nbGUgdW5pdHMuXG4gKi9cbmV4cG9ydCBjb25zdCBBTkdMRV9NRVRSSUNTID0gbmV3IFNldChbXG4gIFwiQXR0YWNrQW5nbGVcIixcbiAgXCJDbHViUGF0aFwiLFxuICBcIkZhY2VBbmdsZVwiLFxuICBcIkZhY2VUb1BhdGhcIixcbiAgXCJEeW5hbWljTG9mdFwiLFxuICBcIkxhdW5jaEFuZ2xlXCIsXG4gIFwiTGF1bmNoRGlyZWN0aW9uXCIsXG4gIFwiTGFuZGluZ0FuZ2xlXCIsXG5dKTtcblxuLyoqXG4gKiBNZXRyaWNzIHRoYXQgdXNlIHNwZWVkIHVuaXRzLlxuICovXG5leHBvcnQgY29uc3QgU1BFRURfTUVUUklDUyA9IG5ldyBTZXQoW1xuICBcIkNsdWJTcGVlZFwiLFxuICBcIkJhbGxTcGVlZFwiLFxuXSk7XG5cbi8qKlxuICogRGVmYXVsdCB1bml0IHN5c3RlbSAoSW1wZXJpYWwgLSB5YXJkcy9kZWdyZWVzKS5cbiAqL1xuZXhwb3J0IGNvbnN0IERFRkFVTFRfVU5JVF9TWVNURU06IFVuaXRTeXN0ZW0gPSBVTklUX1NZU1RFTVNbXCI3ODkwMTJcIl07XG5cbi8qKlxuICogU3BlZWQgdW5pdCBkaXNwbGF5IGxhYmVscyBmb3IgQ1NWIGhlYWRlcnMuXG4gKi9cbmV4cG9ydCBjb25zdCBTUEVFRF9MQUJFTFM6IFJlY29yZDxTcGVlZFVuaXQsIHN0cmluZz4gPSB7XG4gIFwibXBoXCI6IFwibXBoXCIsXG4gIFwibS9zXCI6IFwibS9zXCIsXG59O1xuXG4vKipcbiAqIERpc3RhbmNlIHVuaXQgZGlzcGxheSBsYWJlbHMgZm9yIENTViBoZWFkZXJzLlxuICovXG5leHBvcnQgY29uc3QgRElTVEFOQ0VfTEFCRUxTOiBSZWNvcmQ8RGlzdGFuY2VVbml0LCBzdHJpbmc+ID0ge1xuICBcInlhcmRzXCI6IFwieWRzXCIsXG4gIFwibWV0ZXJzXCI6IFwibVwiLFxufTtcblxuLyoqXG4gKiBTbWFsbCBkaXN0YW5jZSB1bml0IGRpc3BsYXkgbGFiZWxzIGZvciBDU1YgaGVhZGVycy5cbiAqL1xuZXhwb3J0IGNvbnN0IFNNQUxMX0RJU1RBTkNFX0xBQkVMUzogUmVjb3JkPFNtYWxsRGlzdGFuY2VVbml0LCBzdHJpbmc+ID0ge1xuICBcImluY2hlc1wiOiBcImluXCIsXG4gIFwiY21cIjogXCJjbVwiLFxufTtcblxuLyoqXG4gKiBNaWdyYXRlIGEgbGVnYWN5IHVuaXRQcmVmZXJlbmNlIHN0cmluZyB0byBhIFVuaXRDaG9pY2Ugb2JqZWN0LlxuICovXG5leHBvcnQgZnVuY3Rpb24gbWlncmF0ZUxlZ2FjeVByZWYoc3RvcmVkOiBzdHJpbmcgfCB1bmRlZmluZWQpOiBVbml0Q2hvaWNlIHtcbiAgc3dpdGNoIChzdG9yZWQpIHtcbiAgICBjYXNlIFwibWV0cmljXCI6XG4gICAgICByZXR1cm4geyBzcGVlZDogXCJtL3NcIiwgZGlzdGFuY2U6IFwibWV0ZXJzXCIgfTtcbiAgICBjYXNlIFwiaHlicmlkXCI6XG4gICAgICByZXR1cm4geyBzcGVlZDogXCJtcGhcIiwgZGlzdGFuY2U6IFwibWV0ZXJzXCIgfTtcbiAgICBjYXNlIFwiaW1wZXJpYWxcIjpcbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuIHsgc3BlZWQ6IFwibXBoXCIsIGRpc3RhbmNlOiBcInlhcmRzXCIgfTtcbiAgfVxufVxuXG4vKipcbiAqIEZpeGVkIHVuaXQgbGFiZWxzIGZvciBtZXRyaWNzIHdob3NlIHVuaXRzIGRvbid0IHZhcnkgYnkgcHJlZmVyZW5jZS5cbiAqL1xuZXhwb3J0IGNvbnN0IEZJWEVEX1VOSVRfTEFCRUxTOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xuICBTcGluUmF0ZTogXCJycG1cIixcbiAgSGFuZ1RpbWU6IFwic1wiLFxuICBUZW1wbzogXCJzXCIsXG4gIEltcGFjdEhlaWdodDogXCJtbVwiLFxuICBJbXBhY3RPZmZzZXQ6IFwibW1cIixcbn07XG5cbi8qKlxuICogRXh0cmFjdCBuZF8qIHBhcmFtZXRlcnMgZnJvbSBtZXRhZGF0YV9wYXJhbXMuXG4gKiBcbiAqIEBwYXJhbSBtZXRhZGF0YVBhcmFtcyAtIFRoZSBtZXRhZGF0YV9wYXJhbXMgb2JqZWN0IGZyb20gU2Vzc2lvbkRhdGFcbiAqIEByZXR1cm5zIE9iamVjdCBtYXBwaW5nIG1ldHJpYyBncm91cCBJRHMgdG8gdW5pdCBzeXN0ZW0gSURzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBleHRyYWN0VW5pdFBhcmFtcyhcbiAgbWV0YWRhdGFQYXJhbXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz5cbik6IFJlY29yZDxzdHJpbmcsIFVuaXRTeXN0ZW1JZD4ge1xuICBjb25zdCByZXN1bHQ6IFJlY29yZDxzdHJpbmcsIFVuaXRTeXN0ZW1JZD4gPSB7fTtcblxuICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyhtZXRhZGF0YVBhcmFtcykpIHtcbiAgICBjb25zdCBtYXRjaCA9IGtleS5tYXRjaCgvXm5kXyhbYS16MC05XSspJC9pKTtcbiAgICBpZiAobWF0Y2gpIHtcbiAgICAgIGNvbnN0IGdyb3VwS2V5ID0gbWF0Y2hbMV0udG9Mb3dlckNhc2UoKTtcbiAgICAgIHJlc3VsdFtncm91cEtleV0gPSB2YWx1ZSBhcyBVbml0U3lzdGVtSWQ7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmUgdGhlIHVuaXQgc3lzdGVtIElEIGZyb20gbWV0YWRhdGEgcGFyYW1zLlxuICogVXNlcyBuZF8wMDEgYXMgcHJpbWFyeSwgZmFsbHMgYmFjayB0byBkZWZhdWx0LlxuICogXG4gKiBAcGFyYW0gbWV0YWRhdGFQYXJhbXMgLSBUaGUgbWV0YWRhdGFfcGFyYW1zIG9iamVjdFxuICogQHJldHVybnMgVGhlIHVuaXQgc3lzdGVtIElEIHN0cmluZ1xuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0VW5pdFN5c3RlbUlkKFxuICBtZXRhZGF0YVBhcmFtczogUmVjb3JkPHN0cmluZywgc3RyaW5nPlxuKTogVW5pdFN5c3RlbUlkIHtcbiAgY29uc3QgdW5pdFBhcmFtcyA9IGV4dHJhY3RVbml0UGFyYW1zKG1ldGFkYXRhUGFyYW1zKTtcbiAgcmV0dXJuIHVuaXRQYXJhbXNbXCIwMDFcIl0gfHwgXCI3ODkwMTJcIjsgLy8gRGVmYXVsdCB0byBJbXBlcmlhbFxufVxuXG4vKipcbiAqIEdldCB0aGUgZnVsbCB1bml0IHN5c3RlbSBjb25maWd1cmF0aW9uLlxuICogXG4gKiBAcGFyYW0gbWV0YWRhdGFQYXJhbXMgLSBUaGUgbWV0YWRhdGFfcGFyYW1zIG9iamVjdFxuICogQHJldHVybnMgVGhlIFVuaXRTeXN0ZW0gY29uZmlndXJhdGlvblxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0VW5pdFN5c3RlbShcbiAgbWV0YWRhdGFQYXJhbXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz5cbik6IFVuaXRTeXN0ZW0ge1xuICBjb25zdCBpZCA9IGdldFVuaXRTeXN0ZW1JZChtZXRhZGF0YVBhcmFtcyk7XG4gIHJldHVybiBVTklUX1NZU1RFTVNbaWRdIHx8IERFRkFVTFRfVU5JVF9TWVNURU07XG59XG5cbi8qKlxuICogR2V0IHRoZSB1bml0IHN5c3RlbSByZXByZXNlbnRpbmcgd2hhdCB0aGUgQVBJIGFjdHVhbGx5IHJldHVybnMuXG4gKiBUaGUgQVBJIGFsd2F5cyByZXR1cm5zIHNwZWVkIGluIG0vcyBhbmQgZGlzdGFuY2UgaW4gbWV0ZXJzLFxuICogYnV0IHRoZSBhbmdsZSB1bml0IGRlcGVuZHMgb24gdGhlIHJlcG9ydCdzIG5kXzAwMSBwYXJhbWV0ZXIuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRBcGlTb3VyY2VVbml0U3lzdGVtKFxuICBtZXRhZGF0YVBhcmFtczogUmVjb3JkPHN0cmluZywgc3RyaW5nPlxuKTogVW5pdFN5c3RlbSB7XG4gIGNvbnN0IHJlcG9ydFN5c3RlbSA9IGdldFVuaXRTeXN0ZW0obWV0YWRhdGFQYXJhbXMpO1xuICByZXR1cm4ge1xuICAgIGlkOiBcImFwaVwiIGFzIFVuaXRTeXN0ZW1JZCxcbiAgICBuYW1lOiBcIkFQSSBTb3VyY2VcIixcbiAgICBkaXN0YW5jZVVuaXQ6IFwibWV0ZXJzXCIsXG4gICAgYW5nbGVVbml0OiByZXBvcnRTeXN0ZW0uYW5nbGVVbml0LFxuICAgIHNwZWVkVW5pdDogXCJtL3NcIixcbiAgfTtcbn1cblxuLyoqXG4gKiBHZXQgdGhlIHVuaXQgbGFiZWwgZm9yIGEgbWV0cmljIGJhc2VkIG9uIHVzZXIncyB1bml0IGNob2ljZS5cbiAqIFJldHVybnMgZW1wdHkgc3RyaW5nIGZvciBkaW1lbnNpb25sZXNzIG1ldHJpY3MgKGUuZy4gU21hc2hGYWN0b3IsIFNwaW5SYXRlKS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldE1ldHJpY1VuaXRMYWJlbChcbiAgbWV0cmljTmFtZTogc3RyaW5nLFxuICB1bml0Q2hvaWNlOiBVbml0Q2hvaWNlID0gREVGQVVMVF9VTklUX0NIT0lDRVxuKTogc3RyaW5nIHtcbiAgaWYgKG1ldHJpY05hbWUgaW4gRklYRURfVU5JVF9MQUJFTFMpIHJldHVybiBGSVhFRF9VTklUX0xBQkVMU1ttZXRyaWNOYW1lXTtcbiAgaWYgKFNQRUVEX01FVFJJQ1MuaGFzKG1ldHJpY05hbWUpKSByZXR1cm4gU1BFRURfTEFCRUxTW3VuaXRDaG9pY2Uuc3BlZWRdO1xuICBpZiAoU01BTExfRElTVEFOQ0VfTUVUUklDUy5oYXMobWV0cmljTmFtZSkpIHJldHVybiBTTUFMTF9ESVNUQU5DRV9MQUJFTFNbZ2V0U21hbGxEaXN0YW5jZVVuaXQodW5pdENob2ljZSldO1xuICBpZiAoRElTVEFOQ0VfTUVUUklDUy5oYXMobWV0cmljTmFtZSkpIHJldHVybiBESVNUQU5DRV9MQUJFTFNbdW5pdENob2ljZS5kaXN0YW5jZV07XG4gIGlmIChBTkdMRV9NRVRSSUNTLmhhcyhtZXRyaWNOYW1lKSkgcmV0dXJuIFwiXHUwMEIwXCI7XG4gIHJldHVybiBcIlwiO1xufVxuXG4vKipcbiAqIENvbnZlcnQgYSBkaXN0YW5jZSB2YWx1ZSBiZXR3ZWVuIHVuaXRzLlxuICogXG4gKiBAcGFyYW0gdmFsdWUgLSBUaGUgdmFsdWUgdG8gY29udmVydFxuICogQHBhcmFtIGZyb21Vbml0IC0gU291cmNlIHVuaXQgKFwieWFyZHNcIiBvciBcIm1ldGVyc1wiKVxuICogQHBhcmFtIHRvVW5pdCAtIFRhcmdldCB1bml0IChcInlhcmRzXCIgb3IgXCJtZXRlcnNcIilcbiAqIEByZXR1cm5zIENvbnZlcnRlZCB2YWx1ZSwgb3Igb3JpZ2luYWwgaWYgdW5pdHMgbWF0Y2hcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbnZlcnREaXN0YW5jZShcbiAgdmFsdWU6IG51bWJlciB8IHN0cmluZyB8IG51bGwsXG4gIGZyb21Vbml0OiBcInlhcmRzXCIgfCBcIm1ldGVyc1wiLFxuICB0b1VuaXQ6IFwieWFyZHNcIiB8IFwibWV0ZXJzXCJcbik6IG51bWJlciB8IHN0cmluZyB8IG51bGwge1xuICBpZiAodmFsdWUgPT09IG51bGwgfHwgdmFsdWUgPT09IFwiXCIpIHJldHVybiB2YWx1ZTtcblxuICBjb25zdCBudW1WYWx1ZSA9IHR5cGVvZiB2YWx1ZSA9PT0gXCJzdHJpbmdcIiA/IHBhcnNlRmxvYXQodmFsdWUpIDogdmFsdWU7XG4gIGlmIChpc05hTihudW1WYWx1ZSkpIHJldHVybiB2YWx1ZTtcblxuICBpZiAoZnJvbVVuaXQgPT09IHRvVW5pdCkgcmV0dXJuIG51bVZhbHVlO1xuXG4gIC8vIENvbnZlcnQgdG8gbWV0ZXJzIGZpcnN0LCB0aGVuIHRvIHRhcmdldCB1bml0XG4gIGNvbnN0IGluTWV0ZXJzID0gZnJvbVVuaXQgPT09IFwieWFyZHNcIiA/IG51bVZhbHVlICogMC45MTQ0IDogbnVtVmFsdWU7XG4gIHJldHVybiB0b1VuaXQgPT09IFwieWFyZHNcIiA/IGluTWV0ZXJzIC8gMC45MTQ0IDogaW5NZXRlcnM7XG59XG5cbi8qKlxuICogQ29udmVydCBhbiBhbmdsZSB2YWx1ZSBiZXR3ZWVuIHVuaXRzLlxuICogXG4gKiBAcGFyYW0gdmFsdWUgLSBUaGUgdmFsdWUgdG8gY29udmVydFxuICogQHBhcmFtIGZyb21Vbml0IC0gU291cmNlIHVuaXQgKFwiZGVncmVlc1wiIG9yIFwicmFkaWFuc1wiKVxuICogQHBhcmFtIHRvVW5pdCAtIFRhcmdldCB1bml0IChcImRlZ3JlZXNcIiBvciBcInJhZGlhbnNcIilcbiAqIEByZXR1cm5zIENvbnZlcnRlZCB2YWx1ZSwgb3Igb3JpZ2luYWwgaWYgdW5pdHMgbWF0Y2hcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbnZlcnRBbmdsZShcbiAgdmFsdWU6IG51bWJlciB8IHN0cmluZyB8IG51bGwsXG4gIGZyb21Vbml0OiBcImRlZ3JlZXNcIiB8IFwicmFkaWFuc1wiLFxuICB0b1VuaXQ6IFwiZGVncmVlc1wiIHwgXCJyYWRpYW5zXCJcbik6IG51bWJlciB8IHN0cmluZyB8IG51bGwge1xuICBpZiAodmFsdWUgPT09IG51bGwgfHwgdmFsdWUgPT09IFwiXCIpIHJldHVybiB2YWx1ZTtcblxuICBjb25zdCBudW1WYWx1ZSA9IHR5cGVvZiB2YWx1ZSA9PT0gXCJzdHJpbmdcIiA/IHBhcnNlRmxvYXQodmFsdWUpIDogdmFsdWU7XG4gIGlmIChpc05hTihudW1WYWx1ZSkpIHJldHVybiB2YWx1ZTtcblxuICBpZiAoZnJvbVVuaXQgPT09IHRvVW5pdCkgcmV0dXJuIG51bVZhbHVlO1xuXG4gIC8vIENvbnZlcnQgdG8gZGVncmVlcyBmaXJzdCwgdGhlbiB0byB0YXJnZXQgdW5pdFxuICBjb25zdCBpbkRlZ3JlZXMgPSBmcm9tVW5pdCA9PT0gXCJkZWdyZWVzXCIgPyBudW1WYWx1ZSA6IChudW1WYWx1ZSAqIDE4MCAvIE1hdGguUEkpO1xuICByZXR1cm4gdG9Vbml0ID09PSBcImRlZ3JlZXNcIiA/IGluRGVncmVlcyA6IChpbkRlZ3JlZXMgKiBNYXRoLlBJIC8gMTgwKTtcbn1cblxuLyoqXG4gKiBDb252ZXJ0IGEgc3BlZWQgdmFsdWUgYmV0d2VlbiB1bml0cy5cbiAqXG4gKiBAcGFyYW0gdmFsdWUgLSBUaGUgdmFsdWUgdG8gY29udmVydFxuICogQHBhcmFtIGZyb21Vbml0IC0gU291cmNlIHVuaXQgKFwibXBoXCIsIFwia20vaFwiLCBvciBcIm0vc1wiKVxuICogQHBhcmFtIHRvVW5pdCAtIFRhcmdldCB1bml0IChcIm1waFwiLCBcImttL2hcIiwgb3IgXCJtL3NcIilcbiAqIEByZXR1cm5zIENvbnZlcnRlZCB2YWx1ZSwgb3Igb3JpZ2luYWwgaWYgdW5pdHMgbWF0Y2hcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbnZlcnRTcGVlZChcbiAgdmFsdWU6IG51bWJlciB8IHN0cmluZyB8IG51bGwsXG4gIGZyb21Vbml0OiBcIm1waFwiIHwgXCJrbS9oXCIgfCBcIm0vc1wiLFxuICB0b1VuaXQ6IFwibXBoXCIgfCBcImttL2hcIiB8IFwibS9zXCJcbik6IG51bWJlciB8IHN0cmluZyB8IG51bGwge1xuICBpZiAodmFsdWUgPT09IG51bGwgfHwgdmFsdWUgPT09IFwiXCIpIHJldHVybiB2YWx1ZTtcblxuICBjb25zdCBudW1WYWx1ZSA9IHR5cGVvZiB2YWx1ZSA9PT0gXCJzdHJpbmdcIiA/IHBhcnNlRmxvYXQodmFsdWUpIDogdmFsdWU7XG4gIGlmIChpc05hTihudW1WYWx1ZSkpIHJldHVybiB2YWx1ZTtcblxuICBpZiAoZnJvbVVuaXQgPT09IHRvVW5pdCkgcmV0dXJuIG51bVZhbHVlO1xuXG4gIC8vIENvbnZlcnQgdG8gbXBoIGZpcnN0LCB0aGVuIHRvIHRhcmdldCB1bml0XG4gIGxldCBpbk1waDogbnVtYmVyO1xuICBpZiAoZnJvbVVuaXQgPT09IFwibXBoXCIpIGluTXBoID0gbnVtVmFsdWU7XG4gIGVsc2UgaWYgKGZyb21Vbml0ID09PSBcImttL2hcIikgaW5NcGggPSBudW1WYWx1ZSAvIDEuNjA5MzQ0O1xuICBlbHNlIGluTXBoID0gbnVtVmFsdWUgKiAyLjIzNjk0OyAvLyBtL3MgdG8gbXBoXG5cbiAgaWYgKHRvVW5pdCA9PT0gXCJtcGhcIikgcmV0dXJuIGluTXBoO1xuICBpZiAodG9Vbml0ID09PSBcImttL2hcIikgcmV0dXJuIGluTXBoICogMS42MDkzNDQ7XG4gIHJldHVybiBpbk1waCAvIDIuMjM2OTQ7IC8vIG1waCB0byBtL3Ncbn1cblxuLyoqXG4gKiBHZXQgdGhlIHNtYWxsIGRpc3RhbmNlIHVuaXQgYmFzZWQgb24gdGhlIHVzZXIncyBkaXN0YW5jZSBjaG9pY2UuXG4gKiBZYXJkcyB1c2VycyBzZWUgaW5jaGVzOyBtZXRlcnMgdXNlcnMgc2VlIGNtLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0U21hbGxEaXN0YW5jZVVuaXQodW5pdENob2ljZTogVW5pdENob2ljZSA9IERFRkFVTFRfVU5JVF9DSE9JQ0UpOiBTbWFsbERpc3RhbmNlVW5pdCB7XG4gIHJldHVybiB1bml0Q2hvaWNlLmRpc3RhbmNlID09PSBcInlhcmRzXCIgPyBcImluY2hlc1wiIDogXCJjbVwiO1xufVxuXG4vKipcbiAqIENvbnZlcnQgYSBkaXN0YW5jZSB2YWx1ZSBmcm9tIG1ldGVycyB0byBhIHNtYWxsIGRpc3RhbmNlIHVuaXQgKGluY2hlcyBvciBjbSkuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb252ZXJ0U21hbGxEaXN0YW5jZShcbiAgdmFsdWU6IG51bWJlciB8IHN0cmluZyB8IG51bGwsXG4gIHRvU21hbGxVbml0OiBTbWFsbERpc3RhbmNlVW5pdFxuKTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbCB7XG4gIGlmICh2YWx1ZSA9PT0gbnVsbCB8fCB2YWx1ZSA9PT0gXCJcIikgcmV0dXJuIHZhbHVlO1xuXG4gIGNvbnN0IG51bVZhbHVlID0gdHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiID8gcGFyc2VGbG9hdCh2YWx1ZSkgOiB2YWx1ZTtcbiAgaWYgKGlzTmFOKG51bVZhbHVlKSkgcmV0dXJuIHZhbHVlO1xuXG4gIHJldHVybiB0b1NtYWxsVW5pdCA9PT0gXCJpbmNoZXNcIiA/IG51bVZhbHVlICogMzkuMzcwMSA6IG51bVZhbHVlICogMTAwO1xufVxuXG4vKipcbiAqIENvbnZlcnQgYSBkaXN0YW5jZSB2YWx1ZSBmcm9tIG1ldGVycyB0byBtaWxsaW1ldGVycy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbnZlcnRNaWxsaW1ldGVycyhcbiAgdmFsdWU6IG51bWJlciB8IHN0cmluZyB8IG51bGxcbik6IG51bWJlciB8IHN0cmluZyB8IG51bGwge1xuICBpZiAodmFsdWUgPT09IG51bGwgfHwgdmFsdWUgPT09IFwiXCIpIHJldHVybiB2YWx1ZTtcblxuICBjb25zdCBudW1WYWx1ZSA9IHR5cGVvZiB2YWx1ZSA9PT0gXCJzdHJpbmdcIiA/IHBhcnNlRmxvYXQodmFsdWUpIDogdmFsdWU7XG4gIGlmIChpc05hTihudW1WYWx1ZSkpIHJldHVybiB2YWx1ZTtcblxuICByZXR1cm4gbnVtVmFsdWUgKiAxMDAwO1xufVxuXG4vKipcbiAqIE5vcm1hbGl6ZSBhIG1ldHJpYyB2YWx1ZSBiYXNlZCBvbiB1bml0IHN5c3RlbSBhbGlnbm1lbnQgYW5kIHVzZXIncyB1bml0IGNob2ljZS5cbiAqXG4gKiBDb252ZXJ0cyB2YWx1ZXMgZnJvbSB0aGUgc291cmNlIHVuaXRzIHRvIHRhcmdldCBvdXRwdXQgdW5pdHM6XG4gKiAtIERpc3RhbmNlOiB5YXJkcyBvciBtZXRlcnMgKHBlciB1bml0Q2hvaWNlLmRpc3RhbmNlKVxuICogLSBBbmdsZXM6IGFsd2F5cyBkZWdyZWVzXG4gKiAtIFNwZWVkOiBtcGggb3IgbS9zIChwZXIgdW5pdENob2ljZS5zcGVlZClcbiAqXG4gKiBAcGFyYW0gdmFsdWUgLSBUaGUgcmF3IG1ldHJpYyB2YWx1ZVxuICogQHBhcmFtIG1ldHJpY05hbWUgLSBUaGUgbmFtZSBvZiB0aGUgbWV0cmljIGJlaW5nIG5vcm1hbGl6ZWRcbiAqIEBwYXJhbSByZXBvcnRVbml0U3lzdGVtIC0gVGhlIHVuaXQgc3lzdGVtIHVzZWQgaW4gdGhlIHNvdXJjZSBkYXRhXG4gKiBAcGFyYW0gdW5pdENob2ljZSAtIFVzZXIncyB1bml0IGNob2ljZSAoZGVmYXVsdHMgdG8gbXBoICsgeWFyZHMpXG4gKiBAcmV0dXJucyBOb3JtYWxpemVkIHZhbHVlIGFzIG51bWJlciBvciBzdHJpbmcgKG51bGwgaWYgaW52YWxpZClcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG5vcm1hbGl6ZU1ldHJpY1ZhbHVlKFxuICB2YWx1ZTogTWV0cmljVmFsdWUsXG4gIG1ldHJpY05hbWU6IHN0cmluZyxcbiAgcmVwb3J0VW5pdFN5c3RlbTogVW5pdFN5c3RlbSxcbiAgdW5pdENob2ljZTogVW5pdENob2ljZSA9IERFRkFVTFRfVU5JVF9DSE9JQ0Vcbik6IE1ldHJpY1ZhbHVlIHtcbiAgY29uc3QgbnVtVmFsdWUgPSBwYXJzZU51bWVyaWNWYWx1ZSh2YWx1ZSk7XG4gIGlmIChudW1WYWx1ZSA9PT0gbnVsbCkgcmV0dXJuIHZhbHVlO1xuXG4gIGxldCBjb252ZXJ0ZWQ6IG51bWJlcjtcblxuICBpZiAoTUlMTElNRVRFUl9NRVRSSUNTLmhhcyhtZXRyaWNOYW1lKSkge1xuICAgIGNvbnZlcnRlZCA9IGNvbnZlcnRNaWxsaW1ldGVycyhudW1WYWx1ZSkgYXMgbnVtYmVyO1xuICB9IGVsc2UgaWYgKFNNQUxMX0RJU1RBTkNFX01FVFJJQ1MuaGFzKG1ldHJpY05hbWUpKSB7XG4gICAgY29udmVydGVkID0gY29udmVydFNtYWxsRGlzdGFuY2UoXG4gICAgICBudW1WYWx1ZSxcbiAgICAgIGdldFNtYWxsRGlzdGFuY2VVbml0KHVuaXRDaG9pY2UpXG4gICAgKSBhcyBudW1iZXI7XG4gIH0gZWxzZSBpZiAoRElTVEFOQ0VfTUVUUklDUy5oYXMobWV0cmljTmFtZSkpIHtcbiAgICBjb252ZXJ0ZWQgPSBjb252ZXJ0RGlzdGFuY2UoXG4gICAgICBudW1WYWx1ZSxcbiAgICAgIHJlcG9ydFVuaXRTeXN0ZW0uZGlzdGFuY2VVbml0LFxuICAgICAgdW5pdENob2ljZS5kaXN0YW5jZVxuICAgICkgYXMgbnVtYmVyO1xuICB9IGVsc2UgaWYgKEFOR0xFX01FVFJJQ1MuaGFzKG1ldHJpY05hbWUpKSB7XG4gICAgY29udmVydGVkID0gY29udmVydEFuZ2xlKFxuICAgICAgbnVtVmFsdWUsXG4gICAgICByZXBvcnRVbml0U3lzdGVtLmFuZ2xlVW5pdCxcbiAgICAgIFwiZGVncmVlc1wiXG4gICAgKSBhcyBudW1iZXI7XG4gIH0gZWxzZSBpZiAoU1BFRURfTUVUUklDUy5oYXMobWV0cmljTmFtZSkpIHtcbiAgICBjb252ZXJ0ZWQgPSBjb252ZXJ0U3BlZWQoXG4gICAgICBudW1WYWx1ZSxcbiAgICAgIHJlcG9ydFVuaXRTeXN0ZW0uc3BlZWRVbml0LFxuICAgICAgdW5pdENob2ljZS5zcGVlZFxuICAgICkgYXMgbnVtYmVyO1xuICB9IGVsc2Uge1xuICAgIGNvbnZlcnRlZCA9IG51bVZhbHVlO1xuICB9XG5cbiAgLy8gU3BpblJhdGU6IHJvdW5kIHRvIHdob2xlIG51bWJlcnNcbiAgaWYgKG1ldHJpY05hbWUgPT09IFwiU3BpblJhdGVcIikgcmV0dXJuIE1hdGgucm91bmQoY29udmVydGVkKTtcblxuICAvLyBJbXBhY3QgbG9jYXRpb24gbWV0cmljcyBhcmUgZGlzcGxheWVkIGFzIHdob2xlIG1pbGxpbWV0ZXJzLlxuICBpZiAoTUlMTElNRVRFUl9NRVRSSUNTLmhhcyhtZXRyaWNOYW1lKSkgcmV0dXJuIE1hdGgucm91bmQoY29udmVydGVkKTtcblxuICAvLyBTbWFzaEZhY3RvciAvIFRlbXBvOiByb3VuZCB0byAyIGRlY2ltYWwgcGxhY2VzXG4gIGlmIChtZXRyaWNOYW1lID09PSBcIlNtYXNoRmFjdG9yXCIgfHwgbWV0cmljTmFtZSA9PT0gXCJUZW1wb1wiKVxuICAgIHJldHVybiBNYXRoLnJvdW5kKGNvbnZlcnRlZCAqIDEwMCkgLyAxMDA7XG5cbiAgLy8gUm91bmQgdG8gMSBkZWNpbWFsIHBsYWNlIGZvciBjb25zaXN0ZW5jeVxuICByZXR1cm4gTWF0aC5yb3VuZChjb252ZXJ0ZWQgKiAxMCkgLyAxMDtcbn1cblxuLyoqXG4gKiBQYXJzZSBhIG51bWVyaWMgdmFsdWUgZnJvbSBNZXRyaWNWYWx1ZSB0eXBlLlxuICovXG5mdW5jdGlvbiBwYXJzZU51bWVyaWNWYWx1ZSh2YWx1ZTogTWV0cmljVmFsdWUpOiBudW1iZXIgfCBudWxsIHtcbiAgaWYgKHZhbHVlID09PSBudWxsIHx8IHZhbHVlID09PSBcIlwiKSByZXR1cm4gbnVsbDtcbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJudW1iZXJcIikgcmV0dXJuIGlzTmFOKHZhbHVlKSA/IG51bGwgOiB2YWx1ZTtcbiAgXG4gIGNvbnN0IHBhcnNlZCA9IHBhcnNlRmxvYXQodmFsdWUpO1xuICByZXR1cm4gaXNOYU4ocGFyc2VkKSA/IG51bGwgOiBwYXJzZWQ7XG59XG5cbmV4cG9ydCB0eXBlIE1ldHJpY1ZhbHVlID0gc3RyaW5nIHwgbnVtYmVyIHwgbnVsbDtcbiIsICIvKipcbiAqIENTViB3cml0ZXIgZm9yIFRyYWNrUHVsbCBzZXNzaW9uIGRhdGEuXG4gKiBJbXBsZW1lbnRzIGNvcmUgY29sdW1uczogRGF0ZSwgQ2x1YiwgU2hvdCAjLCBUeXBlXG4gKi9cblxuaW1wb3J0IHR5cGUgeyBTZXNzaW9uRGF0YSwgQ2x1Ykdyb3VwLCBTaG90IH0gZnJvbSBcIi4uL21vZGVscy90eXBlc1wiO1xuaW1wb3J0IHtcbiAgZ2V0QXBpU291cmNlVW5pdFN5c3RlbSxcbiAgZ2V0TWV0cmljVW5pdExhYmVsLFxuICBub3JtYWxpemVNZXRyaWNWYWx1ZSxcbiAgREVGQVVMVF9VTklUX0NIT0lDRSxcbiAgdHlwZSBVbml0Q2hvaWNlLFxufSBmcm9tIFwiLi91bml0X25vcm1hbGl6YXRpb25cIjtcbmltcG9ydCB7IE1FVFJJQ19ESVNQTEFZX05BTUVTIH0gZnJvbSBcIi4vY29uc3RhbnRzXCI7XG5cbmNvbnN0IE1FVFJJQ19DT0xVTU5fT1JERVI6IHN0cmluZ1tdID0gW1xuICAvLyBTcGVlZCAmIEVmZmljaWVuY3lcbiAgXCJDbHViU3BlZWRcIiwgXCJCYWxsU3BlZWRcIiwgXCJTbWFzaEZhY3RvclwiLFxuICAvLyBDbHViIERlbGl2ZXJ5XG4gIFwiQXR0YWNrQW5nbGVcIiwgXCJDbHViUGF0aFwiLCBcIkZhY2VBbmdsZVwiLCBcIkZhY2VUb1BhdGhcIiwgXCJTd2luZ0RpcmVjdGlvblwiLCBcIkR5bmFtaWNMb2Z0XCIsXG4gIC8vIExhdW5jaCAmIFNwaW5cbiAgXCJMYXVuY2hBbmdsZVwiLCBcIkxhdW5jaERpcmVjdGlvblwiLCBcIlNwaW5SYXRlXCIsIFwiU3BpbkF4aXNcIiwgXCJTcGluTG9mdFwiLFxuICAvLyBEaXN0YW5jZVxuICBcIkNhcnJ5XCIsIFwiVG90YWxcIixcbiAgLy8gRGlzcGVyc2lvblxuICBcIlNpZGVcIiwgXCJTaWRlVG90YWxcIiwgXCJDYXJyeVNpZGVcIiwgXCJUb3RhbFNpZGVcIiwgXCJDdXJ2ZVwiLFxuICAvLyBCYWxsIEZsaWdodFxuICBcIkhlaWdodFwiLCBcIk1heEhlaWdodFwiLCBcIkxhbmRpbmdBbmdsZVwiLCBcIkhhbmdUaW1lXCIsXG4gIC8vIEltcGFjdFxuICBcIkxvd1BvaW50RGlzdGFuY2VcIiwgXCJJbXBhY3RIZWlnaHRcIiwgXCJJbXBhY3RPZmZzZXRcIixcbiAgLy8gT3RoZXJcbiAgXCJUZW1wb1wiLFxuXTtcblxuZnVuY3Rpb24gZ2V0RGlzcGxheU5hbWUobWV0cmljOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gTUVUUklDX0RJU1BMQVlfTkFNRVNbbWV0cmljXSA/PyBtZXRyaWM7XG59XG5cbmZ1bmN0aW9uIGdldENvbHVtbk5hbWUobWV0cmljOiBzdHJpbmcsIHVuaXRDaG9pY2U6IFVuaXRDaG9pY2UpOiBzdHJpbmcge1xuICBjb25zdCBkaXNwbGF5TmFtZSA9IGdldERpc3BsYXlOYW1lKG1ldHJpYyk7XG4gIGNvbnN0IHVuaXRMYWJlbCA9IGdldE1ldHJpY1VuaXRMYWJlbChtZXRyaWMsIHVuaXRDaG9pY2UpO1xuICByZXR1cm4gdW5pdExhYmVsID8gYCR7ZGlzcGxheU5hbWV9ICgke3VuaXRMYWJlbH0pYCA6IGRpc3BsYXlOYW1lO1xufVxuXG5mdW5jdGlvbiBnZW5lcmF0ZUZpbGVuYW1lKHNlc3Npb246IFNlc3Npb25EYXRhKTogc3RyaW5nIHtcbiAgcmV0dXJuIGBTaG90RGF0YV8ke3Nlc3Npb24uZGF0ZX0uY3N2YDtcbn1cblxuZnVuY3Rpb24gb3JkZXJNZXRyaWNzQnlQcmlvcml0eShcbiAgYWxsTWV0cmljczogc3RyaW5nW10sXG4gIHByaW9yaXR5T3JkZXI6IHN0cmluZ1tdXG4pOiBzdHJpbmdbXSB7XG4gIGNvbnN0IHJlc3VsdDogc3RyaW5nW10gPSBbXTtcbiAgY29uc3Qgc2VlbiA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuXG4gIGZvciAoY29uc3QgbWV0cmljIG9mIHByaW9yaXR5T3JkZXIpIHtcbiAgICBpZiAoYWxsTWV0cmljcy5pbmNsdWRlcyhtZXRyaWMpICYmICFzZWVuLmhhcyhtZXRyaWMpKSB7XG4gICAgICByZXN1bHQucHVzaChtZXRyaWMpO1xuICAgICAgc2Vlbi5hZGQobWV0cmljKTtcbiAgICB9XG4gIH1cblxuICBmb3IgKGNvbnN0IG1ldHJpYyBvZiBhbGxNZXRyaWNzKSB7XG4gICAgaWYgKCFzZWVuLmhhcyhtZXRyaWMpKSB7XG4gICAgICByZXN1bHQucHVzaChtZXRyaWMpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIGhhc1RhZ3Moc2Vzc2lvbjogU2Vzc2lvbkRhdGEpOiBib29sZWFuIHtcbiAgcmV0dXJuIHNlc3Npb24uY2x1Yl9ncm91cHMuc29tZSgoY2x1YikgPT5cbiAgICBjbHViLnNob3RzLnNvbWUoKHNob3QpID0+IHNob3QudGFnICE9PSB1bmRlZmluZWQgJiYgc2hvdC50YWcgIT09IFwiXCIpXG4gICk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB3cml0ZUNzdihcbiAgc2Vzc2lvbjogU2Vzc2lvbkRhdGEsXG4gIGluY2x1ZGVBdmVyYWdlcyA9IHRydWUsXG4gIG1ldHJpY09yZGVyPzogc3RyaW5nW10sXG4gIHVuaXRDaG9pY2U6IFVuaXRDaG9pY2UgPSBERUZBVUxUX1VOSVRfQ0hPSUNFLFxuICBoaXR0aW5nU3VyZmFjZT86IFwiR3Jhc3NcIiB8IFwiTWF0XCJcbik6IHN0cmluZyB7XG4gIGNvbnN0IG9yZGVyZWRNZXRyaWNzID0gb3JkZXJNZXRyaWNzQnlQcmlvcml0eShcbiAgICBzZXNzaW9uLm1ldHJpY19uYW1lcyxcbiAgICBtZXRyaWNPcmRlciA/PyBNRVRSSUNfQ09MVU1OX09SREVSXG4gICk7XG5cbiAgY29uc3QgaGVhZGVyUm93OiBzdHJpbmdbXSA9IFtcIkRhdGVcIiwgXCJDbHViXCJdO1xuXG4gIGlmIChoYXNUYWdzKHNlc3Npb24pKSB7XG4gICAgaGVhZGVyUm93LnB1c2goXCJUYWdcIik7XG4gIH1cblxuICBoZWFkZXJSb3cucHVzaChcIlNob3QgI1wiLCBcIlR5cGVcIik7XG5cbiAgZm9yIChjb25zdCBtZXRyaWMgb2Ygb3JkZXJlZE1ldHJpY3MpIHtcbiAgICBoZWFkZXJSb3cucHVzaChnZXRDb2x1bW5OYW1lKG1ldHJpYywgdW5pdENob2ljZSkpO1xuICB9XG5cbiAgY29uc3Qgcm93czogUmVjb3JkPHN0cmluZywgc3RyaW5nPltdID0gW107XG5cbiAgLy8gU291cmNlIHVuaXQgc3lzdGVtOiBBUEkgYWx3YXlzIHJldHVybnMgbS9zICsgbWV0ZXJzLCBhbmdsZSB1bml0IGZyb20gcmVwb3J0XG4gIGNvbnN0IHVuaXRTeXN0ZW0gPSBnZXRBcGlTb3VyY2VVbml0U3lzdGVtKHNlc3Npb24ubWV0YWRhdGFfcGFyYW1zKTtcblxuICBmb3IgKGNvbnN0IGNsdWIgb2Ygc2Vzc2lvbi5jbHViX2dyb3Vwcykge1xuICAgIGZvciAoY29uc3Qgc2hvdCBvZiBjbHViLnNob3RzKSB7XG4gICAgICBjb25zdCByb3c6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XG4gICAgICAgIERhdGU6IHNlc3Npb24uZGF0ZSxcbiAgICAgICAgQ2x1YjogY2x1Yi5jbHViX25hbWUsXG4gICAgICAgIFwiU2hvdCAjXCI6IFN0cmluZyhzaG90LnNob3RfbnVtYmVyICsgMSksXG4gICAgICAgIFR5cGU6IFwiU2hvdFwiLFxuICAgICAgfTtcblxuICAgICAgaWYgKGhhc1RhZ3Moc2Vzc2lvbikpIHtcbiAgICAgICAgcm93LlRhZyA9IHNob3QudGFnID8/IFwiXCI7XG4gICAgICB9XG5cbiAgICAgIGZvciAoY29uc3QgbWV0cmljIG9mIG9yZGVyZWRNZXRyaWNzKSB7XG4gICAgICAgIGNvbnN0IGNvbE5hbWUgPSBnZXRDb2x1bW5OYW1lKG1ldHJpYywgdW5pdENob2ljZSk7XG4gICAgICAgIGNvbnN0IHJhd1ZhbHVlID0gc2hvdC5tZXRyaWNzW21ldHJpY10gPz8gXCJcIjtcblxuICAgICAgICBpZiAodHlwZW9mIHJhd1ZhbHVlID09PSBcInN0cmluZ1wiIHx8IHR5cGVvZiByYXdWYWx1ZSA9PT0gXCJudW1iZXJcIikge1xuICAgICAgICAgIHJvd1tjb2xOYW1lXSA9IFN0cmluZyhub3JtYWxpemVNZXRyaWNWYWx1ZShyYXdWYWx1ZSwgbWV0cmljLCB1bml0U3lzdGVtLCB1bml0Q2hvaWNlKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcm93W2NvbE5hbWVdID0gXCJcIjtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByb3dzLnB1c2gocm93KTtcbiAgICB9XG5cbiAgICBpZiAoaW5jbHVkZUF2ZXJhZ2VzKSB7XG4gICAgICAvLyBHcm91cCBzaG90cyBieSB0YWdcbiAgICAgIGNvbnN0IHRhZ0dyb3VwcyA9IG5ldyBNYXA8c3RyaW5nLCBTaG90W10+KCk7XG4gICAgICBmb3IgKGNvbnN0IHNob3Qgb2YgY2x1Yi5zaG90cykge1xuICAgICAgICBjb25zdCB0YWcgPSBzaG90LnRhZyA/PyBcIlwiO1xuICAgICAgICBpZiAoIXRhZ0dyb3Vwcy5oYXModGFnKSkgdGFnR3JvdXBzLnNldCh0YWcsIFtdKTtcbiAgICAgICAgdGFnR3JvdXBzLmdldCh0YWcpIS5wdXNoKHNob3QpO1xuICAgICAgfVxuXG4gICAgICBmb3IgKGNvbnN0IFt0YWcsIHNob3RzXSBvZiB0YWdHcm91cHMpIHtcbiAgICAgICAgLy8gT25seSB3cml0ZSBhdmVyYWdlIHJvdyBpZiBncm91cCBoYXMgMisgc2hvdHNcbiAgICAgICAgaWYgKHNob3RzLmxlbmd0aCA8IDIpIGNvbnRpbnVlO1xuXG4gICAgICAgIGNvbnN0IGF2Z1JvdzogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcbiAgICAgICAgICBEYXRlOiBzZXNzaW9uLmRhdGUsXG4gICAgICAgICAgQ2x1YjogY2x1Yi5jbHViX25hbWUsXG4gICAgICAgICAgXCJTaG90ICNcIjogXCJcIixcbiAgICAgICAgICBUeXBlOiBcIkF2ZXJhZ2VcIixcbiAgICAgICAgfTtcblxuICAgICAgICBpZiAoaGFzVGFncyhzZXNzaW9uKSkge1xuICAgICAgICAgIGF2Z1Jvdy5UYWcgPSB0YWc7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGNvbnN0IG1ldHJpYyBvZiBvcmRlcmVkTWV0cmljcykge1xuICAgICAgICAgIGNvbnN0IGNvbE5hbWUgPSBnZXRDb2x1bW5OYW1lKG1ldHJpYywgdW5pdENob2ljZSk7XG4gICAgICAgICAgY29uc3QgdmFsdWVzID0gc2hvdHNcbiAgICAgICAgICAgIC5tYXAoKHMpID0+IHMubWV0cmljc1ttZXRyaWNdKVxuICAgICAgICAgICAgLmZpbHRlcigodikgPT4gdiAhPT0gdW5kZWZpbmVkICYmIHYgIT09IFwiXCIpXG4gICAgICAgICAgICAubWFwKCh2KSA9PiBwYXJzZUZsb2F0KFN0cmluZyh2KSkpO1xuICAgICAgICAgIGNvbnN0IG51bWVyaWNWYWx1ZXMgPSB2YWx1ZXMuZmlsdGVyKCh2KSA9PiAhaXNOYU4odikpO1xuXG4gICAgICAgICAgaWYgKG51bWVyaWNWYWx1ZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3QgYXZnID0gbnVtZXJpY1ZhbHVlcy5yZWR1Y2UoKGEsIGIpID0+IGEgKyBiLCAwKSAvIG51bWVyaWNWYWx1ZXMubGVuZ3RoO1xuICAgICAgICAgICAgY29uc3Qgcm91bmRlZCA9IChtZXRyaWMgPT09IFwiU21hc2hGYWN0b3JcIiB8fCBtZXRyaWMgPT09IFwiVGVtcG9cIilcbiAgICAgICAgICAgICAgPyBNYXRoLnJvdW5kKGF2ZyAqIDEwMCkgLyAxMDBcbiAgICAgICAgICAgICAgOiBNYXRoLnJvdW5kKGF2ZyAqIDEwKSAvIDEwO1xuICAgICAgICAgICAgYXZnUm93W2NvbE5hbWVdID0gU3RyaW5nKG5vcm1hbGl6ZU1ldHJpY1ZhbHVlKHJvdW5kZWQsIG1ldHJpYywgdW5pdFN5c3RlbSwgdW5pdENob2ljZSkpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhdmdSb3dbY29sTmFtZV0gPSBcIlwiO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJvd3MucHVzaChhdmdSb3cpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGNvbnN0IGxpbmVzOiBzdHJpbmdbXSA9IFtdO1xuXG4gIGlmIChoaXR0aW5nU3VyZmFjZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgbGluZXMucHVzaChgSGl0dGluZyBTdXJmYWNlOiAke2hpdHRpbmdTdXJmYWNlfWApO1xuICB9XG5cbiAgbGluZXMucHVzaChoZWFkZXJSb3cuam9pbihcIixcIikpO1xuICBmb3IgKGNvbnN0IHJvdyBvZiByb3dzKSB7XG4gICAgbGluZXMucHVzaChcbiAgICAgIGhlYWRlclJvd1xuICAgICAgICAubWFwKChjb2wpID0+IHtcbiAgICAgICAgICBjb25zdCB2YWx1ZSA9IHJvd1tjb2xdID8/IFwiXCI7XG4gICAgICAgICAgaWYgKHZhbHVlLmluY2x1ZGVzKFwiLFwiKSB8fCB2YWx1ZS5pbmNsdWRlcygnXCInKSB8fCB2YWx1ZS5pbmNsdWRlcyhcIlxcblwiKSkge1xuICAgICAgICAgICAgcmV0dXJuIGBcIiR7dmFsdWUucmVwbGFjZSgvXCIvZywgJ1wiXCInKX1cImA7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgfSlcbiAgICAgICAgLmpvaW4oXCIsXCIpXG4gICAgKTtcbiAgfVxuXG4gIHJldHVybiBsaW5lcy5qb2luKFwiXFxuXCIpO1xufVxuIiwgIi8qKlxuICogU2Vzc2lvbiBoaXN0b3J5IHN0b3JhZ2UgbW9kdWxlLlxuICogU2F2ZXMsIGRlZHVwbGljYXRlcyAoYnkgcmVwb3J0X2lkKSwgYW5kIGV2aWN0cyBzZXNzaW9ucyBmcm9tIGNocm9tZS5zdG9yYWdlLmxvY2FsLlxuICovXG5cbmltcG9ydCB0eXBlIHsgU2Vzc2lvbkRhdGEsIFNlc3Npb25TbmFwc2hvdCwgSGlzdG9yeUVudHJ5IH0gZnJvbSBcIi4uL21vZGVscy90eXBlc1wiO1xuaW1wb3J0IHsgU1RPUkFHRV9LRVlTIH0gZnJvbSBcIi4vY29uc3RhbnRzXCI7XG5cbmNvbnN0IE1BWF9TRVNTSU9OUyA9IDIwO1xuXG4vKiogU3RyaXAgcmF3X2FwaV9kYXRhIGZyb20gYSBTZXNzaW9uRGF0YSB0byBjcmVhdGUgYSBsaWdodHdlaWdodCBzbmFwc2hvdC4gKi9cbmZ1bmN0aW9uIGNyZWF0ZVNuYXBzaG90KHNlc3Npb246IFNlc3Npb25EYXRhKTogU2Vzc2lvblNuYXBzaG90IHtcbiAgLy8gRGVzdHJ1Y3R1cmUgdG8gZXhjbHVkZSByYXdfYXBpX2RhdGFcbiAgY29uc3QgeyByYXdfYXBpX2RhdGE6IF8sIC4uLnNuYXBzaG90IH0gPSBzZXNzaW9uO1xuICByZXR1cm4gc25hcHNob3Q7XG59XG5cbi8qKlxuICogU2F2ZSBhIHNlc3Npb24gdG8gdGhlIHJvbGxpbmcgaGlzdG9yeSBpbiBjaHJvbWUuc3RvcmFnZS5sb2NhbC5cbiAqIC0gRGVkdXBsaWNhdGVzIGJ5IHJlcG9ydF9pZCAocmVwbGFjZXMgZXhpc3RpbmcgZW50cnksIHJlZnJlc2hlcyBjYXB0dXJlZF9hdCkuXG4gKiAtIEV2aWN0cyBvbGRlc3QgZW50cnkgd2hlbiB0aGUgMjAtc2Vzc2lvbiBjYXAgaXMgcmVhY2hlZC5cbiAqIC0gU3RvcmVzIGVudHJpZXMgc29ydGVkIG5ld2VzdC1maXJzdCAoZGVzY2VuZGluZyBjYXB0dXJlZF9hdCkuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzYXZlU2Vzc2lvblRvSGlzdG9yeShzZXNzaW9uOiBTZXNzaW9uRGF0YSk6IFByb21pc2U8dm9pZD4ge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGNocm9tZS5zdG9yYWdlLmxvY2FsLmdldChcbiAgICAgIFtTVE9SQUdFX0tFWVMuU0VTU0lPTl9ISVNUT1JZXSxcbiAgICAgIChyZXN1bHQ6IFJlY29yZDxzdHJpbmcsIHVua25vd24+KSA9PiB7XG4gICAgICAgIGlmIChjaHJvbWUucnVudGltZS5sYXN0RXJyb3IpIHtcbiAgICAgICAgICByZXR1cm4gcmVqZWN0KG5ldyBFcnJvcihjaHJvbWUucnVudGltZS5sYXN0RXJyb3IubWVzc2FnZSkpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgZXhpc3RpbmcgPSAocmVzdWx0W1NUT1JBR0VfS0VZUy5TRVNTSU9OX0hJU1RPUlldIGFzIEhpc3RvcnlFbnRyeVtdIHwgdW5kZWZpbmVkKSA/PyBbXTtcblxuICAgICAgICAvLyBSZW1vdmUgYW55IGV4aXN0aW5nIGVudHJ5IHdpdGggdGhlIHNhbWUgcmVwb3J0X2lkIChkZWR1cClcbiAgICAgICAgY29uc3QgZmlsdGVyZWQgPSBleGlzdGluZy5maWx0ZXIoXG4gICAgICAgICAgKGVudHJ5KSA9PiBlbnRyeS5zbmFwc2hvdC5yZXBvcnRfaWQgIT09IHNlc3Npb24ucmVwb3J0X2lkXG4gICAgICAgICk7XG5cbiAgICAgICAgLy8gQ3JlYXRlIG5ldyBlbnRyeVxuICAgICAgICBjb25zdCBuZXdFbnRyeTogSGlzdG9yeUVudHJ5ID0ge1xuICAgICAgICAgIGNhcHR1cmVkX2F0OiBEYXRlLm5vdygpLFxuICAgICAgICAgIHNuYXBzaG90OiBjcmVhdGVTbmFwc2hvdChzZXNzaW9uKSxcbiAgICAgICAgfTtcblxuICAgICAgICBmaWx0ZXJlZC5wdXNoKG5ld0VudHJ5KTtcblxuICAgICAgICAvLyBTb3J0IG5ld2VzdC1maXJzdCAoZGVzY2VuZGluZyBjYXB0dXJlZF9hdClcbiAgICAgICAgZmlsdGVyZWQuc29ydCgoYSwgYikgPT4gYi5jYXB0dXJlZF9hdCAtIGEuY2FwdHVyZWRfYXQpO1xuXG4gICAgICAgIC8vIEVuZm9yY2UgY2FwIFx1MjAxNCBzbGljZSBrZWVwcyB0aGUgbmV3ZXN0IE1BWF9TRVNTSU9OUyBlbnRyaWVzXG4gICAgICAgIGNvbnN0IGNhcHBlZCA9IGZpbHRlcmVkLnNsaWNlKDAsIE1BWF9TRVNTSU9OUyk7XG5cbiAgICAgICAgY2hyb21lLnN0b3JhZ2UubG9jYWwuc2V0KFxuICAgICAgICAgIHsgW1NUT1JBR0VfS0VZUy5TRVNTSU9OX0hJU1RPUlldOiBjYXBwZWQgfSxcbiAgICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoY2hyb21lLnJ1bnRpbWUubGFzdEVycm9yKSB7XG4gICAgICAgICAgICAgIHJldHVybiByZWplY3QobmV3IEVycm9yKGNocm9tZS5ydW50aW1lLmxhc3RFcnJvci5tZXNzYWdlKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgfVxuICAgICAgICApO1xuICAgICAgfVxuICAgICk7XG4gIH0pO1xufVxuXG4vKipcbiAqIE1hcCBzdG9yYWdlIGVycm9yIHN0cmluZ3MgdG8gdXNlci1mcmllbmRseSBtZXNzYWdlcy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEhpc3RvcnlFcnJvck1lc3NhZ2UoZXJyb3I6IHN0cmluZyk6IHN0cmluZyB7XG4gIGlmICgvUVVPVEFfQllURVN8cXVvdGEvaS50ZXN0KGVycm9yKSkge1xuICAgIHJldHVybiBcIlN0b3JhZ2UgZnVsbCAtLSBvbGRlc3Qgc2Vzc2lvbnMgd2lsbCBiZSBjbGVhcmVkXCI7XG4gIH1cbiAgcmV0dXJuIFwiQ291bGQgbm90IHNhdmUgdG8gc2Vzc2lvbiBoaXN0b3J5XCI7XG59XG4iLCAiLyoqXG4gKiBTZXJ2aWNlIFdvcmtlciBmb3IgVHJhY2tQdWxsIENocm9tZSBFeHRlbnNpb25cbiAqL1xuXG5pbXBvcnQgeyBTVE9SQUdFX0tFWVMgfSBmcm9tIFwiLi4vc2hhcmVkL2NvbnN0YW50c1wiO1xuaW1wb3J0IHsgd3JpdGVDc3YgfSBmcm9tIFwiLi4vc2hhcmVkL2Nzdl93cml0ZXJcIjtcbmltcG9ydCB0eXBlIHsgU2Vzc2lvbkRhdGEgfSBmcm9tIFwiLi4vbW9kZWxzL3R5cGVzXCI7XG5pbXBvcnQgeyBtaWdyYXRlTGVnYWN5UHJlZiwgREVGQVVMVF9VTklUX0NIT0lDRSwgdHlwZSBVbml0Q2hvaWNlLCB0eXBlIFNwZWVkVW5pdCwgdHlwZSBEaXN0YW5jZVVuaXQgfSBmcm9tIFwiLi4vc2hhcmVkL3VuaXRfbm9ybWFsaXphdGlvblwiO1xuaW1wb3J0IHsgc2F2ZVNlc3Npb25Ub0hpc3RvcnksIGdldEhpc3RvcnlFcnJvck1lc3NhZ2UgfSBmcm9tIFwiLi4vc2hhcmVkL2hpc3RvcnlcIjtcblxuY2hyb21lLnJ1bnRpbWUub25JbnN0YWxsZWQuYWRkTGlzdGVuZXIoKCkgPT4ge1xuICBjb25zb2xlLmxvZyhcIlRyYWNrUHVsbCBleHRlbnNpb24gaW5zdGFsbGVkXCIpO1xufSk7XG5cbmludGVyZmFjZSBTYXZlRGF0YVJlcXVlc3Qge1xuICB0eXBlOiBcIlNBVkVfREFUQVwiO1xuICBkYXRhOiBTZXNzaW9uRGF0YTtcbn1cblxuaW50ZXJmYWNlIEV4cG9ydENzdlJlcXVlc3Qge1xuICB0eXBlOiBcIkVYUE9SVF9DU1ZfUkVRVUVTVFwiO1xufVxuXG5pbnRlcmZhY2UgR2V0RGF0YVJlcXVlc3Qge1xuICB0eXBlOiBcIkdFVF9EQVRBXCI7XG59XG5cbmZ1bmN0aW9uIGdldERvd25sb2FkRXJyb3JNZXNzYWdlKG9yaWdpbmFsRXJyb3I6IHN0cmluZyk6IHN0cmluZyB7XG4gIGlmIChvcmlnaW5hbEVycm9yLmluY2x1ZGVzKFwiaW52YWxpZFwiKSkge1xuICAgIHJldHVybiBcIkludmFsaWQgZG93bmxvYWQgZm9ybWF0XCI7XG4gIH1cbiAgaWYgKG9yaWdpbmFsRXJyb3IuaW5jbHVkZXMoXCJxdW90YVwiKSB8fCBvcmlnaW5hbEVycm9yLmluY2x1ZGVzKFwic3BhY2VcIikpIHtcbiAgICByZXR1cm4gXCJJbnN1ZmZpY2llbnQgc3RvcmFnZSBzcGFjZVwiO1xuICB9XG4gIGlmIChvcmlnaW5hbEVycm9yLmluY2x1ZGVzKFwiYmxvY2tlZFwiKSB8fCBvcmlnaW5hbEVycm9yLmluY2x1ZGVzKFwicG9saWN5XCIpKSB7XG4gICAgcmV0dXJuIFwiRG93bmxvYWQgYmxvY2tlZCBieSBicm93c2VyIHNldHRpbmdzXCI7XG4gIH1cbiAgcmV0dXJuIG9yaWdpbmFsRXJyb3I7XG59XG5cbnR5cGUgUmVxdWVzdE1lc3NhZ2UgPSBTYXZlRGF0YVJlcXVlc3QgfCBFeHBvcnRDc3ZSZXF1ZXN0IHwgR2V0RGF0YVJlcXVlc3Q7XG5cbmNocm9tZS5ydW50aW1lLm9uTWVzc2FnZS5hZGRMaXN0ZW5lcigobWVzc2FnZTogUmVxdWVzdE1lc3NhZ2UsIHNlbmRlciwgc2VuZFJlc3BvbnNlKSA9PiB7XG4gIGlmIChtZXNzYWdlLnR5cGUgPT09IFwiR0VUX0RBVEFcIikge1xuICAgIGNocm9tZS5zdG9yYWdlLmxvY2FsLmdldChbU1RPUkFHRV9LRVlTLlRSQUNLTUFOX0RBVEFdLCAocmVzdWx0KSA9PiB7XG4gICAgICBzZW5kUmVzcG9uc2UocmVzdWx0W1NUT1JBR0VfS0VZUy5UUkFDS01BTl9EQVRBXSB8fCBudWxsKTtcbiAgICB9KTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGlmIChtZXNzYWdlLnR5cGUgPT09IFwiU0FWRV9EQVRBXCIpIHtcbiAgICBjb25zdCBzZXNzaW9uRGF0YSA9IChtZXNzYWdlIGFzIFNhdmVEYXRhUmVxdWVzdCkuZGF0YTtcbiAgICBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoeyBbU1RPUkFHRV9LRVlTLlRSQUNLTUFOX0RBVEFdOiBzZXNzaW9uRGF0YSB9LCAoKSA9PiB7XG4gICAgICBpZiAoY2hyb21lLnJ1bnRpbWUubGFzdEVycm9yKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXCJUcmFja1B1bGw6IEZhaWxlZCB0byBzYXZlIGRhdGE6XCIsIGNocm9tZS5ydW50aW1lLmxhc3RFcnJvcik7XG4gICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogY2hyb21lLnJ1bnRpbWUubGFzdEVycm9yLm1lc3NhZ2UgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLmxvZyhcIlRyYWNrUHVsbDogU2Vzc2lvbiBkYXRhIHNhdmVkIHRvIHN0b3JhZ2VcIik7XG4gICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IHRydWUgfSk7XG5cbiAgICAgICAgLy8gSGlzdG9yeSBzYXZlIC0tIGZpcmUgYW5kIGZvcmdldCwgbmV2ZXIgYmxvY2tzIHByaW1hcnkgZmxvd1xuICAgICAgICBzYXZlU2Vzc2lvblRvSGlzdG9yeShzZXNzaW9uRGF0YSkuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJUcmFja1B1bGw6IEhpc3Rvcnkgc2F2ZSBmYWlsZWQ6XCIsIGVycik7XG4gICAgICAgICAgY29uc3QgbXNnID0gZ2V0SGlzdG9yeUVycm9yTWVzc2FnZShlcnIubWVzc2FnZSk7XG4gICAgICAgICAgY2hyb21lLnJ1bnRpbWUuc2VuZE1lc3NhZ2UoeyB0eXBlOiBcIkhJU1RPUllfRVJST1JcIiwgZXJyb3I6IG1zZyB9KS5jYXRjaCgoKSA9PiB7XG4gICAgICAgICAgICAvLyBQb3B1cCBub3Qgb3BlbiAtLSBhbHJlYWR5IGxvZ2dlZCB0byBjb25zb2xlXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgaWYgKG1lc3NhZ2UudHlwZSA9PT0gXCJFWFBPUlRfQ1NWX1JFUVVFU1RcIikge1xuICAgIGNocm9tZS5zdG9yYWdlLmxvY2FsLmdldChbU1RPUkFHRV9LRVlTLlRSQUNLTUFOX0RBVEEsIFNUT1JBR0VfS0VZUy5TUEVFRF9VTklULCBTVE9SQUdFX0tFWVMuRElTVEFOQ0VfVU5JVCwgU1RPUkFHRV9LRVlTLkhJVFRJTkdfU1VSRkFDRSwgU1RPUkFHRV9LRVlTLklOQ0xVREVfQVZFUkFHRVMsIFwidW5pdFByZWZlcmVuY2VcIl0sIChyZXN1bHQpID0+IHtcbiAgICAgIGNvbnN0IGRhdGEgPSByZXN1bHRbU1RPUkFHRV9LRVlTLlRSQUNLTUFOX0RBVEFdIGFzIFNlc3Npb25EYXRhIHwgdW5kZWZpbmVkO1xuICAgICAgaWYgKCFkYXRhIHx8ICFkYXRhLmNsdWJfZ3JvdXBzIHx8IGRhdGEuY2x1Yl9ncm91cHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogXCJObyBkYXRhIHRvIGV4cG9ydFwiIH0pO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIGxldCB1bml0Q2hvaWNlOiBVbml0Q2hvaWNlO1xuICAgICAgICBpZiAocmVzdWx0W1NUT1JBR0VfS0VZUy5TUEVFRF9VTklUXSAmJiByZXN1bHRbU1RPUkFHRV9LRVlTLkRJU1RBTkNFX1VOSVRdKSB7XG4gICAgICAgICAgdW5pdENob2ljZSA9IHtcbiAgICAgICAgICAgIHNwZWVkOiByZXN1bHRbU1RPUkFHRV9LRVlTLlNQRUVEX1VOSVRdIGFzIFNwZWVkVW5pdCxcbiAgICAgICAgICAgIGRpc3RhbmNlOiByZXN1bHRbU1RPUkFHRV9LRVlTLkRJU1RBTkNFX1VOSVRdIGFzIERpc3RhbmNlVW5pdCxcbiAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHVuaXRDaG9pY2UgPSBtaWdyYXRlTGVnYWN5UHJlZihyZXN1bHRbXCJ1bml0UHJlZmVyZW5jZVwiXSBhcyBzdHJpbmcgfCB1bmRlZmluZWQpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHN1cmZhY2UgPSAocmVzdWx0W1NUT1JBR0VfS0VZUy5ISVRUSU5HX1NVUkZBQ0VdIGFzIFwiR3Jhc3NcIiB8IFwiTWF0XCIpID8/IFwiTWF0XCI7XG4gICAgICAgIGNvbnN0IGluY2x1ZGVBdmVyYWdlcyA9IHJlc3VsdFtTVE9SQUdFX0tFWVMuSU5DTFVERV9BVkVSQUdFU10gPT09IHVuZGVmaW5lZFxuICAgICAgICAgID8gdHJ1ZVxuICAgICAgICAgIDogQm9vbGVhbihyZXN1bHRbU1RPUkFHRV9LRVlTLklOQ0xVREVfQVZFUkFHRVNdKTtcbiAgICAgICAgY29uc3QgY3N2Q29udGVudCA9IHdyaXRlQ3N2KGRhdGEsIGluY2x1ZGVBdmVyYWdlcywgdW5kZWZpbmVkLCB1bml0Q2hvaWNlLCBzdXJmYWNlKTtcbiAgICAgICAgY29uc3QgZmlsZW5hbWUgPSBgU2hvdERhdGFfJHtkYXRhLmRhdGUgfHwgXCJ1bmtub3duXCJ9LmNzdmA7XG5cbiAgICAgICAgY2hyb21lLmRvd25sb2Fkcy5kb3dubG9hZChcbiAgICAgICAgICB7XG4gICAgICAgICAgICB1cmw6IGBkYXRhOnRleHQvY3N2O2NoYXJzZXQ9dXRmLTgsJHtlbmNvZGVVUklDb21wb25lbnQoY3N2Q29udGVudCl9YCxcbiAgICAgICAgICAgIGZpbGVuYW1lOiBmaWxlbmFtZSxcbiAgICAgICAgICAgIHNhdmVBczogZmFsc2UsXG4gICAgICAgICAgfSxcbiAgICAgICAgICAoZG93bmxvYWRJZCkgPT4ge1xuICAgICAgICAgICAgaWYgKGNocm9tZS5ydW50aW1lLmxhc3RFcnJvcikge1xuICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiVHJhY2tQdWxsOiBEb3dubG9hZCBmYWlsZWQ6XCIsIGNocm9tZS5ydW50aW1lLmxhc3RFcnJvcik7XG4gICAgICAgICAgICAgIGNvbnN0IGVycm9yTWVzc2FnZSA9IGdldERvd25sb2FkRXJyb3JNZXNzYWdlKGNocm9tZS5ydW50aW1lLmxhc3RFcnJvci5tZXNzYWdlKTtcbiAgICAgICAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvck1lc3NhZ2UgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgVHJhY2tQdWxsOiBDU1YgZXhwb3J0ZWQgd2l0aCBkb3dubG9hZCBJRCAke2Rvd25sb2FkSWR9YCk7XG4gICAgICAgICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IHRydWUsIGRvd25sb2FkSWQsIGZpbGVuYW1lIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXCJUcmFja1B1bGw6IENTViBnZW5lcmF0aW9uIGZhaWxlZDpcIiwgZXJyb3IpO1xuICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKSB9KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxufSk7XG5cbmNocm9tZS5zdG9yYWdlLm9uQ2hhbmdlZC5hZGRMaXN0ZW5lcigoY2hhbmdlcywgbmFtZXNwYWNlKSA9PiB7XG4gIGlmIChuYW1lc3BhY2UgPT09IFwibG9jYWxcIiAmJiBjaGFuZ2VzW1NUT1JBR0VfS0VZUy5UUkFDS01BTl9EQVRBXSkge1xuICAgIGNvbnN0IG5ld1ZhbHVlID0gY2hhbmdlc1tTVE9SQUdFX0tFWVMuVFJBQ0tNQU5fREFUQV0ubmV3VmFsdWU7XG4gICAgY2hyb21lLnJ1bnRpbWUuc2VuZE1lc3NhZ2UoeyB0eXBlOiBcIkRBVEFfVVBEQVRFRFwiLCBkYXRhOiBuZXdWYWx1ZSB9KS5jYXRjaCgoKSA9PiB7XG4gICAgICAvLyBJZ25vcmUgZXJyb3JzIHdoZW4gbm8gcG9wdXAgaXMgbGlzdGVuaW5nXG4gICAgfSk7XG4gIH1cbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7OztBQUFBLE1BNEVhLHNCQWtFQTtBQTlJYjtBQUFBO0FBNEVPLE1BQU0sdUJBQStDO0FBQUEsUUFDMUQsV0FBVztBQUFBLFFBQ1gsV0FBVztBQUFBLFFBQ1gsYUFBYTtBQUFBLFFBQ2IsYUFBYTtBQUFBLFFBQ2IsVUFBVTtBQUFBLFFBQ1YsV0FBVztBQUFBLFFBQ1gsWUFBWTtBQUFBLFFBQ1osZ0JBQWdCO0FBQUEsUUFDaEIsYUFBYTtBQUFBLFFBQ2IsVUFBVTtBQUFBLFFBQ1YsVUFBVTtBQUFBLFFBQ1YsVUFBVTtBQUFBLFFBQ1YsYUFBYTtBQUFBLFFBQ2IsaUJBQWlCO0FBQUEsUUFDakIsT0FBTztBQUFBLFFBQ1AsT0FBTztBQUFBLFFBQ1AsTUFBTTtBQUFBLFFBQ04sV0FBVztBQUFBLFFBQ1gsV0FBVztBQUFBLFFBQ1gsV0FBVztBQUFBLFFBQ1gsUUFBUTtBQUFBLFFBQ1IsV0FBVztBQUFBLFFBQ1gsT0FBTztBQUFBLFFBQ1AsY0FBYztBQUFBLFFBQ2QsVUFBVTtBQUFBLFFBQ1Ysa0JBQWtCO0FBQUEsUUFDbEIsY0FBYztBQUFBLFFBQ2QsY0FBYztBQUFBLFFBQ2QsT0FBTztBQUFBLE1BQ1Q7QUFvQ08sTUFBTSxlQUFlO0FBQUEsUUFDMUIsZUFBZTtBQUFBLFFBQ2YsWUFBWTtBQUFBLFFBQ1osZUFBZTtBQUFBLFFBQ2Ysb0JBQW9CO0FBQUEsUUFDcEIsWUFBWTtBQUFBLFFBQ1osaUJBQWlCO0FBQUEsUUFDakIsa0JBQWtCO0FBQUEsUUFDbEIsaUJBQWlCO0FBQUEsTUFDbkI7QUFBQTtBQUFBOzs7QUNQTyxXQUFTLGtCQUFrQixRQUF3QztBQUN4RSxZQUFRLFFB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
