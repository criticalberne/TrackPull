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
        INCLUDE_AVERAGES: "includeAverages"
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

  // src/background/serviceWorker.ts
  var require_serviceWorker = __commonJS({
    "src/background/serviceWorker.ts"() {
      init_constants();
      init_csv_writer();
      init_unit_normalization();
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL3NoYXJlZC9jb25zdGFudHMudHMiLCAiLi4vc3JjL3NoYXJlZC91bml0X25vcm1hbGl6YXRpb24udHMiLCAiLi4vc3JjL3NoYXJlZC9jc3Zfd3JpdGVyLnRzIiwgIi4uL3NyYy9iYWNrZ3JvdW5kL3NlcnZpY2VXb3JrZXIudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbIi8qKlxuICogU2hhcmVkIGNvbnN0YW50cyBpbmNsdWRpbmcgQ1NTIHNlbGVjdG9ycyBhbmQgY29uZmlndXJhdGlvbi5cbiAqIEJhc2VkIG9uIFB5dGhvbiBzY3JhcGVyIGNvbnN0YW50cy5weSBpbXBsZW1lbnRhdGlvbi5cbiAqL1xuXG4vLyBDb21wbGV0ZSBsaXN0IG9mIGFsbCBrbm93biBUcmFja21hbiBtZXRyaWNzIChVUkwgcGFyYW1ldGVyIG5hbWVzKVxuZXhwb3J0IGNvbnN0IEFMTF9NRVRSSUNTID0gW1xuICBcIkNsdWJTcGVlZFwiLFxuICBcIkJhbGxTcGVlZFwiLFxuICBcIlNtYXNoRmFjdG9yXCIsXG4gIFwiQXR0YWNrQW5nbGVcIixcbiAgXCJDbHViUGF0aFwiLFxuICBcIkZhY2VBbmdsZVwiLFxuICBcIkZhY2VUb1BhdGhcIixcbiAgXCJTd2luZ0RpcmVjdGlvblwiLFxuICBcIkR5bmFtaWNMb2Z0XCIsXG4gIFwiU3BpblJhdGVcIixcbiAgXCJTcGluQXhpc1wiLFxuICBcIlNwaW5Mb2Z0XCIsXG4gIFwiTGF1bmNoQW5nbGVcIixcbiAgXCJMYXVuY2hEaXJlY3Rpb25cIixcbiAgXCJDYXJyeVwiLFxuICBcIlRvdGFsXCIsXG4gIFwiU2lkZVwiLFxuICBcIlNpZGVUb3RhbFwiLFxuICBcIkNhcnJ5U2lkZVwiLFxuICBcIlRvdGFsU2lkZVwiLFxuICBcIkhlaWdodFwiLFxuICBcIk1heEhlaWdodFwiLFxuICBcIkN1cnZlXCIsXG4gIFwiTGFuZGluZ0FuZ2xlXCIsXG4gIFwiSGFuZ1RpbWVcIixcbiAgXCJMb3dQb2ludERpc3RhbmNlXCIsXG4gIFwiSW1wYWN0SGVpZ2h0XCIsXG4gIFwiSW1wYWN0T2Zmc2V0XCIsXG4gIFwiVGVtcG9cIixcbl0gYXMgY29uc3Q7XG5cbi8vIE1ldHJpY3Mgc3BsaXQgaW50byBncm91cHMgZm9yIG11bHRpLXBhZ2UtbG9hZCBIVE1MIGZhbGxiYWNrXG5leHBvcnQgY29uc3QgTUVUUklDX0dST1VQUyA9IFtcbiAgW1xuICAgIFwiQ2x1YlNwZWVkXCIsXG4gICAgXCJCYWxsU3BlZWRcIixcbiAgICBcIlNtYXNoRmFjdG9yXCIsXG4gICAgXCJBdHRhY2tBbmdsZVwiLFxuICAgIFwiQ2x1YlBhdGhcIixcbiAgICBcIkZhY2VBbmdsZVwiLFxuICAgIFwiRmFjZVRvUGF0aFwiLFxuICAgIFwiU3dpbmdEaXJlY3Rpb25cIixcbiAgICBcIkR5bmFtaWNMb2Z0XCIsXG4gICAgXCJTcGluTG9mdFwiLFxuICBdLFxuICBbXG4gICAgXCJTcGluUmF0ZVwiLFxuICAgIFwiU3BpbkF4aXNcIixcbiAgICBcIkxhdW5jaEFuZ2xlXCIsXG4gICAgXCJMYXVuY2hEaXJlY3Rpb25cIixcbiAgICBcIkNhcnJ5XCIsXG4gICAgXCJUb3RhbFwiLFxuICAgIFwiU2lkZVwiLFxuICAgIFwiU2lkZVRvdGFsXCIsXG4gICAgXCJDYXJyeVNpZGVcIixcbiAgICBcIlRvdGFsU2lkZVwiLFxuICAgIFwiSGVpZ2h0XCIsXG4gICAgXCJNYXhIZWlnaHRcIixcbiAgICBcIkN1cnZlXCIsXG4gICAgXCJMYW5kaW5nQW5nbGVcIixcbiAgICBcIkhhbmdUaW1lXCIsXG4gICAgXCJMb3dQb2ludERpc3RhbmNlXCIsXG4gICAgXCJJbXBhY3RIZWlnaHRcIixcbiAgICBcIkltcGFjdE9mZnNldFwiLFxuICAgIFwiVGVtcG9cIixcbiAgXSxcbl0gYXMgY29uc3Q7XG5cbi8vIERpc3BsYXkgbmFtZXM6IFVSTCBwYXJhbSBuYW1lIC0+IGh1bWFuLXJlYWRhYmxlIENTViBoZWFkZXJcbmV4cG9ydCBjb25zdCBNRVRSSUNfRElTUExBWV9OQU1FUzogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcbiAgQ2x1YlNwZWVkOiBcIkNsdWIgU3BlZWRcIixcbiAgQmFsbFNwZWVkOiBcIkJhbGwgU3BlZWRcIixcbiAgU21hc2hGYWN0b3I6IFwiU21hc2ggRmFjdG9yXCIsXG4gIEF0dGFja0FuZ2xlOiBcIkF0dGFjayBBbmdsZVwiLFxuICBDbHViUGF0aDogXCJDbHViIFBhdGhcIixcbiAgRmFjZUFuZ2xlOiBcIkZhY2UgQW5nbGVcIixcbiAgRmFjZVRvUGF0aDogXCJGYWNlIFRvIFBhdGhcIixcbiAgU3dpbmdEaXJlY3Rpb246IFwiU3dpbmcgRGlyZWN0aW9uXCIsXG4gIER5bmFtaWNMb2Z0OiBcIkR5bmFtaWMgTG9mdFwiLFxuICBTcGluUmF0ZTogXCJTcGluIFJhdGVcIixcbiAgU3BpbkF4aXM6IFwiU3BpbiBBeGlzXCIsXG4gIFNwaW5Mb2Z0OiBcIlNwaW4gTG9mdFwiLFxuICBMYXVuY2hBbmdsZTogXCJMYXVuY2ggQW5nbGVcIixcbiAgTGF1bmNoRGlyZWN0aW9uOiBcIkxhdW5jaCBEaXJlY3Rpb25cIixcbiAgQ2Fycnk6IFwiQ2FycnlcIixcbiAgVG90YWw6IFwiVG90YWxcIixcbiAgU2lkZTogXCJTaWRlXCIsXG4gIFNpZGVUb3RhbDogXCJTaWRlIFRvdGFsXCIsXG4gIENhcnJ5U2lkZTogXCJDYXJyeSBTaWRlXCIsXG4gIFRvdGFsU2lkZTogXCJUb3RhbCBTaWRlXCIsXG4gIEhlaWdodDogXCJIZWlnaHRcIixcbiAgTWF4SGVpZ2h0OiBcIk1heCBIZWlnaHRcIixcbiAgQ3VydmU6IFwiQ3VydmVcIixcbiAgTGFuZGluZ0FuZ2xlOiBcIkxhbmRpbmcgQW5nbGVcIixcbiAgSGFuZ1RpbWU6IFwiSGFuZyBUaW1lXCIsXG4gIExvd1BvaW50RGlzdGFuY2U6IFwiTG93IFBvaW50XCIsXG4gIEltcGFjdEhlaWdodDogXCJJbXBhY3QgSGVpZ2h0XCIsXG4gIEltcGFjdE9mZnNldDogXCJJbXBhY3QgT2Zmc2V0XCIsXG4gIFRlbXBvOiBcIlRlbXBvXCIsXG59O1xuXG4vLyBDU1MgY2xhc3Mgc2VsZWN0b3JzIChmcm9tIFRyYWNrbWFuJ3MgcmVuZGVyZWQgSFRNTClcbmV4cG9ydCBjb25zdCBDU1NfREFURSA9IFwiZGF0ZVwiO1xuZXhwb3J0IGNvbnN0IENTU19SRVNVTFRTX1dSQVBQRVIgPSBcInBsYXllci1hbmQtcmVzdWx0cy10YWJsZS13cmFwcGVyXCI7XG5leHBvcnQgY29uc3QgQ1NTX1JFU1VMVFNfVEFCTEUgPSBcIlJlc3VsdHNUYWJsZVwiO1xuZXhwb3J0IGNvbnN0IENTU19DTFVCX1RBRyA9IFwiZ3JvdXAtdGFnXCI7XG5leHBvcnQgY29uc3QgQ1NTX1BBUkFNX05BTUVTX1JPVyA9IFwicGFyYW1ldGVyLW5hbWVzLXJvd1wiO1xuZXhwb3J0IGNvbnN0IENTU19QQVJBTV9OQU1FID0gXCJwYXJhbWV0ZXItbmFtZVwiO1xuZXhwb3J0IGNvbnN0IENTU19TSE9UX0RFVEFJTF9ST1cgPSBcInJvdy13aXRoLXNob3QtZGV0YWlsc1wiO1xuZXhwb3J0IGNvbnN0IENTU19BVkVSQUdFX1ZBTFVFUyA9IFwiYXZlcmFnZS12YWx1ZXNcIjtcbmV4cG9ydCBjb25zdCBDU1NfQ09OU0lTVEVOQ1lfVkFMVUVTID0gXCJjb25zaXN0ZW5jeS12YWx1ZXNcIjtcblxuLy8gQVBJIFVSTCBwYXR0ZXJucyB0aGF0IGxpa2VseSBpbmRpY2F0ZSBhbiBBUEkgZGF0YSByZXNwb25zZVxuZXhwb3J0IGNvbnN0IEFQSV9VUkxfUEFUVEVSTlMgPSBbXG4gIFwiYXBpLnRyYWNrbWFuZ29sZi5jb21cIixcbiAgXCJ0cmFja21hbmdvbGYuY29tL2FwaVwiLFxuICBcIi9hcGkvXCIsXG4gIFwiL3JlcG9ydHMvXCIsXG4gIFwiL2FjdGl2aXRpZXMvXCIsXG4gIFwiL3Nob3RzL1wiLFxuICBcImdyYXBocWxcIixcbl07XG5cbi8vIFRpbWVvdXRzIChtaWxsaXNlY29uZHMpXG5leHBvcnQgY29uc3QgUEFHRV9MT0FEX1RJTUVPVVQgPSAzMF8wMDA7XG5leHBvcnQgY29uc3QgREFUQV9MT0FEX1RJTUVPVVQgPSAxNV8wMDA7XG5cbi8vIFRyYWNrbWFuIGJhc2UgVVJMXG5leHBvcnQgY29uc3QgQkFTRV9VUkwgPSBcImh0dHBzOi8vd2ViLWR5bmFtaWMtcmVwb3J0cy50cmFja21hbmdvbGYuY29tL1wiO1xuXG4vLyBDdXN0b20gcHJvbXB0IHN0b3JhZ2Uga2V5c1xuZXhwb3J0IGNvbnN0IENVU1RPTV9QUk9NUFRfS0VZX1BSRUZJWCA9IFwiY3VzdG9tUHJvbXB0X1wiIGFzIGNvbnN0O1xuZXhwb3J0IGNvbnN0IENVU1RPTV9QUk9NUFRfSURTX0tFWSA9IFwiY3VzdG9tUHJvbXB0SWRzXCIgYXMgY29uc3Q7XG5cbi8vIFN0b3JhZ2Uga2V5cyBmb3IgQ2hyb21lIGV4dGVuc2lvbiAoYWxpZ25lZCBiZXR3ZWVuIGJhY2tncm91bmQgYW5kIHBvcHVwKVxuZXhwb3J0IGNvbnN0IFNUT1JBR0VfS0VZUyA9IHtcbiAgVFJBQ0tNQU5fREFUQTogXCJ0cmFja21hbkRhdGFcIixcbiAgU1BFRURfVU5JVDogXCJzcGVlZFVuaXRcIixcbiAgRElTVEFOQ0VfVU5JVDogXCJkaXN0YW5jZVVuaXRcIixcbiAgU0VMRUNURURfUFJPTVBUX0lEOiBcInNlbGVjdGVkUHJvbXB0SWRcIixcbiAgQUlfU0VSVklDRTogXCJhaVNlcnZpY2VcIixcbiAgSElUVElOR19TVVJGQUNFOiBcImhpdHRpbmdTdXJmYWNlXCIsXG4gIElOQ0xVREVfQVZFUkFHRVM6IFwiaW5jbHVkZUF2ZXJhZ2VzXCIsXG59IGFzIGNvbnN0O1xuIiwgIi8qKlxuICogVW5pdCBub3JtYWxpemF0aW9uIHV0aWxpdGllcyBmb3IgVHJhY2ttYW4gbWVhc3VyZW1lbnRzLlxuICogXG4gKiBUcmFja21hbiB1c2VzIG5kXyogcGFyYW1ldGVycyB0byBzcGVjaWZ5IHVuaXRzOlxuICogLSBuZF8wMDEsIG5kXzAwMiwgZXRjLiBkZWZpbmUgdW5pdCBzeXN0ZW1zIGZvciBkaWZmZXJlbnQgbWVhc3VyZW1lbnQgZ3JvdXBzXG4gKiAtIENvbW1vbiB2YWx1ZXM6IDc4OTAxMiA9IHlhcmRzL2RlZ3JlZXMsIDc4OTAxMyA9IG1ldGVycy9yYWRpYW5zXG4gKi9cblxuZXhwb3J0IHR5cGUgVW5pdFN5c3RlbUlkID0gXCI3ODkwMTJcIiB8IFwiNzg5MDEzXCIgfCBcIjc4OTAxNFwiIHwgc3RyaW5nO1xuXG5leHBvcnQgdHlwZSBTcGVlZFVuaXQgPSBcIm1waFwiIHwgXCJtL3NcIjtcbmV4cG9ydCB0eXBlIERpc3RhbmNlVW5pdCA9IFwieWFyZHNcIiB8IFwibWV0ZXJzXCI7XG5leHBvcnQgdHlwZSBTbWFsbERpc3RhbmNlVW5pdCA9IFwiaW5jaGVzXCIgfCBcImNtXCI7XG5leHBvcnQgaW50ZXJmYWNlIFVuaXRDaG9pY2UgeyBzcGVlZDogU3BlZWRVbml0OyBkaXN0YW5jZTogRGlzdGFuY2VVbml0IH1cbmV4cG9ydCBjb25zdCBERUZBVUxUX1VOSVRfQ0hPSUNFOiBVbml0Q2hvaWNlID0geyBzcGVlZDogXCJtcGhcIiwgZGlzdGFuY2U6IFwieWFyZHNcIiB9O1xuXG4vKipcbiAqIFRyYWNrbWFuIHVuaXQgc3lzdGVtIGRlZmluaXRpb25zLlxuICogTWFwcyBuZF8qIHBhcmFtZXRlciB2YWx1ZXMgdG8gYWN0dWFsIHVuaXRzIGZvciBlYWNoIG1ldHJpYy5cbiAqL1xuZXhwb3J0IGNvbnN0IFVOSVRfU1lTVEVNUzogUmVjb3JkPFVuaXRTeXN0ZW1JZCwgVW5pdFN5c3RlbT4gPSB7XG4gIC8vIEltcGVyaWFsICh5YXJkcywgZGVncmVlcykgLSBtb3N0IGNvbW1vblxuICBcIjc4OTAxMlwiOiB7XG4gICAgaWQ6IFwiNzg5MDEyXCIsXG4gICAgbmFtZTogXCJJbXBlcmlhbFwiLFxuICAgIGRpc3RhbmNlVW5pdDogXCJ5YXJkc1wiLFxuICAgIGFuZ2xlVW5pdDogXCJkZWdyZWVzXCIsXG4gICAgc3BlZWRVbml0OiBcIm1waFwiLFxuICB9LFxuICAvLyBNZXRyaWMgKG1ldGVycywgcmFkaWFucylcbiAgXCI3ODkwMTNcIjoge1xuICAgIGlkOiBcIjc4OTAxM1wiLFxuICAgIG5hbWU6IFwiTWV0cmljIChyYWQpXCIsXG4gICAgZGlzdGFuY2VVbml0OiBcIm1ldGVyc1wiLFxuICAgIGFuZ2xlVW5pdDogXCJyYWRpYW5zXCIsXG4gICAgc3BlZWRVbml0OiBcImttL2hcIixcbiAgfSxcbiAgLy8gTWV0cmljIChtZXRlcnMsIGRlZ3JlZXMpIC0gbGVzcyBjb21tb25cbiAgXCI3ODkwMTRcIjoge1xuICAgIGlkOiBcIjc4OTAxNFwiLFxuICAgIG5hbWU6IFwiTWV0cmljIChkZWcpXCIsXG4gICAgZGlzdGFuY2VVbml0OiBcIm1ldGVyc1wiLFxuICAgIGFuZ2xlVW5pdDogXCJkZWdyZWVzXCIsXG4gICAgc3BlZWRVbml0OiBcImttL2hcIixcbiAgfSxcbn07XG5cbi8qKlxuICogVW5pdCBzeXN0ZW0gY29uZmlndXJhdGlvbi5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBVbml0U3lzdGVtIHtcbiAgaWQ6IFVuaXRTeXN0ZW1JZDtcbiAgbmFtZTogc3RyaW5nO1xuICBkaXN0YW5jZVVuaXQ6IFwieWFyZHNcIiB8IFwibWV0ZXJzXCI7XG4gIGFuZ2xlVW5pdDogXCJkZWdyZWVzXCIgfCBcInJhZGlhbnNcIjtcbiAgc3BlZWRVbml0OiBcIm1waFwiIHwgXCJrbS9oXCIgfCBcIm0vc1wiO1xufVxuXG4vKipcbiAqIE1ldHJpY3MgdGhhdCB1c2UgZGlzdGFuY2UgdW5pdHMuXG4gKi9cbmV4cG9ydCBjb25zdCBESVNUQU5DRV9NRVRSSUNTID0gbmV3IFNldChbXG4gIFwiQ2FycnlcIixcbiAgXCJUb3RhbFwiLFxuICBcIlNpZGVcIixcbiAgXCJTaWRlVG90YWxcIixcbiAgXCJDYXJyeVNpZGVcIixcbiAgXCJUb3RhbFNpZGVcIixcbiAgXCJIZWlnaHRcIixcbiAgXCJNYXhIZWlnaHRcIixcbiAgXCJDdXJ2ZVwiLFxuXSk7XG5cbi8qKlxuICogTWV0cmljcyB0aGF0IHVzZSBzbWFsbCBkaXN0YW5jZSB1bml0cyAoaW5jaGVzL2NtKS5cbiAqIFRoZXNlIHZhbHVlcyBjb21lIGZyb20gdGhlIEFQSSBpbiBtZXRlcnMgYnV0IGFyZSB0b28gc21hbGwgZm9yIHlhcmRzL21ldGVycy5cbiAqL1xuZXhwb3J0IGNvbnN0IFNNQUxMX0RJU1RBTkNFX01FVFJJQ1MgPSBuZXcgU2V0KFtcbiAgXCJMb3dQb2ludERpc3RhbmNlXCIsXG5dKTtcblxuLyoqXG4gKiBNZXRyaWNzIHRoYXQgdXNlIGFuZ2xlIHVuaXRzLlxuICovXG5leHBvcnQgY29uc3QgQU5HTEVfTUVUUklDUyA9IG5ldyBTZXQoW1xuICBcIkF0dGFja0FuZ2xlXCIsXG4gIFwiQ2x1YlBhdGhcIixcbiAgXCJGYWNlQW5nbGVcIixcbiAgXCJGYWNlVG9QYXRoXCIsXG4gIFwiRHluYW1pY0xvZnRcIixcbiAgXCJMYXVuY2hBbmdsZVwiLFxuICBcIkxhdW5jaERpcmVjdGlvblwiLFxuICBcIkxhbmRpbmdBbmdsZVwiLFxuXSk7XG5cbi8qKlxuICogTWV0cmljcyB0aGF0IHVzZSBzcGVlZCB1bml0cy5cbiAqL1xuZXhwb3J0IGNvbnN0IFNQRUVEX01FVFJJQ1MgPSBuZXcgU2V0KFtcbiAgXCJDbHViU3BlZWRcIixcbiAgXCJCYWxsU3BlZWRcIixcbiAgXCJUZW1wb1wiLFxuXSk7XG5cbi8qKlxuICogRGVmYXVsdCB1bml0IHN5c3RlbSAoSW1wZXJpYWwgLSB5YXJkcy9kZWdyZWVzKS5cbiAqL1xuZXhwb3J0IGNvbnN0IERFRkFVTFRfVU5JVF9TWVNURU06IFVuaXRTeXN0ZW0gPSBVTklUX1NZU1RFTVNbXCI3ODkwMTJcIl07XG5cbi8qKlxuICogU3BlZWQgdW5pdCBkaXNwbGF5IGxhYmVscyBmb3IgQ1NWIGhlYWRlcnMuXG4gKi9cbmV4cG9ydCBjb25zdCBTUEVFRF9MQUJFTFM6IFJlY29yZDxTcGVlZFVuaXQsIHN0cmluZz4gPSB7XG4gIFwibXBoXCI6IFwibXBoXCIsXG4gIFwibS9zXCI6IFwibS9zXCIsXG59O1xuXG4vKipcbiAqIERpc3RhbmNlIHVuaXQgZGlzcGxheSBsYWJlbHMgZm9yIENTViBoZWFkZXJzLlxuICovXG5leHBvcnQgY29uc3QgRElTVEFOQ0VfTEFCRUxTOiBSZWNvcmQ8RGlzdGFuY2VVbml0LCBzdHJpbmc+ID0ge1xuICBcInlhcmRzXCI6IFwieWRzXCIsXG4gIFwibWV0ZXJzXCI6IFwibVwiLFxufTtcblxuLyoqXG4gKiBTbWFsbCBkaXN0YW5jZSB1bml0IGRpc3BsYXkgbGFiZWxzIGZvciBDU1YgaGVhZGVycy5cbiAqL1xuZXhwb3J0IGNvbnN0IFNNQUxMX0RJU1RBTkNFX0xBQkVMUzogUmVjb3JkPFNtYWxsRGlzdGFuY2VVbml0LCBzdHJpbmc+ID0ge1xuICBcImluY2hlc1wiOiBcImluXCIsXG4gIFwiY21cIjogXCJjbVwiLFxufTtcblxuLyoqXG4gKiBNaWdyYXRlIGEgbGVnYWN5IHVuaXRQcmVmZXJlbmNlIHN0cmluZyB0byBhIFVuaXRDaG9pY2Ugb2JqZWN0LlxuICovXG5leHBvcnQgZnVuY3Rpb24gbWlncmF0ZUxlZ2FjeVByZWYoc3RvcmVkOiBzdHJpbmcgfCB1bmRlZmluZWQpOiBVbml0Q2hvaWNlIHtcbiAgc3dpdGNoIChzdG9yZWQpIHtcbiAgICBjYXNlIFwibWV0cmljXCI6XG4gICAgICByZXR1cm4geyBzcGVlZDogXCJtL3NcIiwgZGlzdGFuY2U6IFwibWV0ZXJzXCIgfTtcbiAgICBjYXNlIFwiaHlicmlkXCI6XG4gICAgICByZXR1cm4geyBzcGVlZDogXCJtcGhcIiwgZGlzdGFuY2U6IFwibWV0ZXJzXCIgfTtcbiAgICBjYXNlIFwiaW1wZXJpYWxcIjpcbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuIHsgc3BlZWQ6IFwibXBoXCIsIGRpc3RhbmNlOiBcInlhcmRzXCIgfTtcbiAgfVxufVxuXG4vKipcbiAqIEZpeGVkIHVuaXQgbGFiZWxzIGZvciBtZXRyaWNzIHdob3NlIHVuaXRzIGRvbid0IHZhcnkgYnkgcHJlZmVyZW5jZS5cbiAqL1xuZXhwb3J0IGNvbnN0IEZJWEVEX1VOSVRfTEFCRUxTOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xuICBTcGluUmF0ZTogXCJycG1cIixcbiAgSGFuZ1RpbWU6IFwic1wiLFxufTtcblxuLyoqXG4gKiBFeHRyYWN0IG5kXyogcGFyYW1ldGVycyBmcm9tIG1ldGFkYXRhX3BhcmFtcy5cbiAqIFxuICogQHBhcmFtIG1ldGFkYXRhUGFyYW1zIC0gVGhlIG1ldGFkYXRhX3BhcmFtcyBvYmplY3QgZnJvbSBTZXNzaW9uRGF0YVxuICogQHJldHVybnMgT2JqZWN0IG1hcHBpbmcgbWV0cmljIGdyb3VwIElEcyB0byB1bml0IHN5c3RlbSBJRHNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV4dHJhY3RVbml0UGFyYW1zKFxuICBtZXRhZGF0YVBhcmFtczogUmVjb3JkPHN0cmluZywgc3RyaW5nPlxuKTogUmVjb3JkPHN0cmluZywgVW5pdFN5c3RlbUlkPiB7XG4gIGNvbnN0IHJlc3VsdDogUmVjb3JkPHN0cmluZywgVW5pdFN5c3RlbUlkPiA9IHt9O1xuXG4gIGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKG1ldGFkYXRhUGFyYW1zKSkge1xuICAgIGNvbnN0IG1hdGNoID0ga2V5Lm1hdGNoKC9ebmRfKFthLXowLTldKykkL2kpO1xuICAgIGlmIChtYXRjaCkge1xuICAgICAgY29uc3QgZ3JvdXBLZXkgPSBtYXRjaFsxXS50b0xvd2VyQ2FzZSgpO1xuICAgICAgcmVzdWx0W2dyb3VwS2V5XSA9IHZhbHVlIGFzIFVuaXRTeXN0ZW1JZDtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufVxuXG4vKipcbiAqIERldGVybWluZSB0aGUgdW5pdCBzeXN0ZW0gSUQgZnJvbSBtZXRhZGF0YSBwYXJhbXMuXG4gKiBVc2VzIG5kXzAwMSBhcyBwcmltYXJ5LCBmYWxscyBiYWNrIHRvIGRlZmF1bHQuXG4gKiBcbiAqIEBwYXJhbSBtZXRhZGF0YVBhcmFtcyAtIFRoZSBtZXRhZGF0YV9wYXJhbXMgb2JqZWN0XG4gKiBAcmV0dXJucyBUaGUgdW5pdCBzeXN0ZW0gSUQgc3RyaW5nXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRVbml0U3lzdGVtSWQoXG4gIG1ldGFkYXRhUGFyYW1zOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+XG4pOiBVbml0U3lzdGVtSWQge1xuICBjb25zdCB1bml0UGFyYW1zID0gZXh0cmFjdFVuaXRQYXJhbXMobWV0YWRhdGFQYXJhbXMpO1xuICByZXR1cm4gdW5pdFBhcmFtc1tcIjAwMVwiXSB8fCBcIjc4OTAxMlwiOyAvLyBEZWZhdWx0IHRvIEltcGVyaWFsXG59XG5cbi8qKlxuICogR2V0IHRoZSBmdWxsIHVuaXQgc3lzdGVtIGNvbmZpZ3VyYXRpb24uXG4gKiBcbiAqIEBwYXJhbSBtZXRhZGF0YVBhcmFtcyAtIFRoZSBtZXRhZGF0YV9wYXJhbXMgb2JqZWN0XG4gKiBAcmV0dXJucyBUaGUgVW5pdFN5c3RlbSBjb25maWd1cmF0aW9uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRVbml0U3lzdGVtKFxuICBtZXRhZGF0YVBhcmFtczogUmVjb3JkPHN0cmluZywgc3RyaW5nPlxuKTogVW5pdFN5c3RlbSB7XG4gIGNvbnN0IGlkID0gZ2V0VW5pdFN5c3RlbUlkKG1ldGFkYXRhUGFyYW1zKTtcbiAgcmV0dXJuIFVOSVRfU1lTVEVNU1tpZF0gfHwgREVGQVVMVF9VTklUX1NZU1RFTTtcbn1cblxuLyoqXG4gKiBHZXQgdGhlIHVuaXQgc3lzdGVtIHJlcHJlc2VudGluZyB3aGF0IHRoZSBBUEkgYWN0dWFsbHkgcmV0dXJucy5cbiAqIFRoZSBBUEkgYWx3YXlzIHJldHVybnMgc3BlZWQgaW4gbS9zIGFuZCBkaXN0YW5jZSBpbiBtZXRlcnMsXG4gKiBidXQgdGhlIGFuZ2xlIHVuaXQgZGVwZW5kcyBvbiB0aGUgcmVwb3J0J3MgbmRfMDAxIHBhcmFtZXRlci5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEFwaVNvdXJjZVVuaXRTeXN0ZW0oXG4gIG1ldGFkYXRhUGFyYW1zOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+XG4pOiBVbml0U3lzdGVtIHtcbiAgY29uc3QgcmVwb3J0U3lzdGVtID0gZ2V0VW5pdFN5c3RlbShtZXRhZGF0YVBhcmFtcyk7XG4gIHJldHVybiB7XG4gICAgaWQ6IFwiYXBpXCIgYXMgVW5pdFN5c3RlbUlkLFxuICAgIG5hbWU6IFwiQVBJIFNvdXJjZVwiLFxuICAgIGRpc3RhbmNlVW5pdDogXCJtZXRlcnNcIixcbiAgICBhbmdsZVVuaXQ6IHJlcG9ydFN5c3RlbS5hbmdsZVVuaXQsXG4gICAgc3BlZWRVbml0OiBcIm0vc1wiLFxuICB9O1xufVxuXG4vKipcbiAqIEdldCB0aGUgdW5pdCBsYWJlbCBmb3IgYSBtZXRyaWMgYmFzZWQgb24gdXNlcidzIHVuaXQgY2hvaWNlLlxuICogUmV0dXJucyBlbXB0eSBzdHJpbmcgZm9yIGRpbWVuc2lvbmxlc3MgbWV0cmljcyAoZS5nLiBTbWFzaEZhY3RvciwgU3BpblJhdGUpLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0TWV0cmljVW5pdExhYmVsKFxuICBtZXRyaWNOYW1lOiBzdHJpbmcsXG4gIHVuaXRDaG9pY2U6IFVuaXRDaG9pY2UgPSBERUZBVUxUX1VOSVRfQ0hPSUNFXG4pOiBzdHJpbmcge1xuICBpZiAobWV0cmljTmFtZSBpbiBGSVhFRF9VTklUX0xBQkVMUykgcmV0dXJuIEZJWEVEX1VOSVRfTEFCRUxTW21ldHJpY05hbWVdO1xuICBpZiAoU1BFRURfTUVUUklDUy5oYXMobWV0cmljTmFtZSkpIHJldHVybiBTUEVFRF9MQUJFTFNbdW5pdENob2ljZS5zcGVlZF07XG4gIGlmIChTTUFMTF9ESVNUQU5DRV9NRVRSSUNTLmhhcyhtZXRyaWNOYW1lKSkgcmV0dXJuIFNNQUxMX0RJU1RBTkNFX0xBQkVMU1tnZXRTbWFsbERpc3RhbmNlVW5pdCh1bml0Q2hvaWNlKV07XG4gIGlmIChESVNUQU5DRV9NRVRSSUNTLmhhcyhtZXRyaWNOYW1lKSkgcmV0dXJuIERJU1RBTkNFX0xBQkVMU1t1bml0Q2hvaWNlLmRpc3RhbmNlXTtcbiAgaWYgKEFOR0xFX01FVFJJQ1MuaGFzKG1ldHJpY05hbWUpKSByZXR1cm4gXCJcdTAwQjBcIjtcbiAgcmV0dXJuIFwiXCI7XG59XG5cbi8qKlxuICogQ29udmVydCBhIGRpc3RhbmNlIHZhbHVlIGJldHdlZW4gdW5pdHMuXG4gKiBcbiAqIEBwYXJhbSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byBjb252ZXJ0XG4gKiBAcGFyYW0gZnJvbVVuaXQgLSBTb3VyY2UgdW5pdCAoXCJ5YXJkc1wiIG9yIFwibWV0ZXJzXCIpXG4gKiBAcGFyYW0gdG9Vbml0IC0gVGFyZ2V0IHVuaXQgKFwieWFyZHNcIiBvciBcIm1ldGVyc1wiKVxuICogQHJldHVybnMgQ29udmVydGVkIHZhbHVlLCBvciBvcmlnaW5hbCBpZiB1bml0cyBtYXRjaFxuICovXG5leHBvcnQgZnVuY3Rpb24gY29udmVydERpc3RhbmNlKFxuICB2YWx1ZTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbCxcbiAgZnJvbVVuaXQ6IFwieWFyZHNcIiB8IFwibWV0ZXJzXCIsXG4gIHRvVW5pdDogXCJ5YXJkc1wiIHwgXCJtZXRlcnNcIlxuKTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbCB7XG4gIGlmICh2YWx1ZSA9PT0gbnVsbCB8fCB2YWx1ZSA9PT0gXCJcIikgcmV0dXJuIHZhbHVlO1xuXG4gIGNvbnN0IG51bVZhbHVlID0gdHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiID8gcGFyc2VGbG9hdCh2YWx1ZSkgOiB2YWx1ZTtcbiAgaWYgKGlzTmFOKG51bVZhbHVlKSkgcmV0dXJuIHZhbHVlO1xuXG4gIGlmIChmcm9tVW5pdCA9PT0gdG9Vbml0KSByZXR1cm4gbnVtVmFsdWU7XG5cbiAgLy8gQ29udmVydCB0byBtZXRlcnMgZmlyc3QsIHRoZW4gdG8gdGFyZ2V0IHVuaXRcbiAgY29uc3QgaW5NZXRlcnMgPSBmcm9tVW5pdCA9PT0gXCJ5YXJkc1wiID8gbnVtVmFsdWUgKiAwLjkxNDQgOiBudW1WYWx1ZTtcbiAgcmV0dXJuIHRvVW5pdCA9PT0gXCJ5YXJkc1wiID8gaW5NZXRlcnMgLyAwLjkxNDQgOiBpbk1ldGVycztcbn1cblxuLyoqXG4gKiBDb252ZXJ0IGFuIGFuZ2xlIHZhbHVlIGJldHdlZW4gdW5pdHMuXG4gKiBcbiAqIEBwYXJhbSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byBjb252ZXJ0XG4gKiBAcGFyYW0gZnJvbVVuaXQgLSBTb3VyY2UgdW5pdCAoXCJkZWdyZWVzXCIgb3IgXCJyYWRpYW5zXCIpXG4gKiBAcGFyYW0gdG9Vbml0IC0gVGFyZ2V0IHVuaXQgKFwiZGVncmVlc1wiIG9yIFwicmFkaWFuc1wiKVxuICogQHJldHVybnMgQ29udmVydGVkIHZhbHVlLCBvciBvcmlnaW5hbCBpZiB1bml0cyBtYXRjaFxuICovXG5leHBvcnQgZnVuY3Rpb24gY29udmVydEFuZ2xlKFxuICB2YWx1ZTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbCxcbiAgZnJvbVVuaXQ6IFwiZGVncmVlc1wiIHwgXCJyYWRpYW5zXCIsXG4gIHRvVW5pdDogXCJkZWdyZWVzXCIgfCBcInJhZGlhbnNcIlxuKTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbCB7XG4gIGlmICh2YWx1ZSA9PT0gbnVsbCB8fCB2YWx1ZSA9PT0gXCJcIikgcmV0dXJuIHZhbHVlO1xuXG4gIGNvbnN0IG51bVZhbHVlID0gdHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiID8gcGFyc2VGbG9hdCh2YWx1ZSkgOiB2YWx1ZTtcbiAgaWYgKGlzTmFOKG51bVZhbHVlKSkgcmV0dXJuIHZhbHVlO1xuXG4gIGlmIChmcm9tVW5pdCA9PT0gdG9Vbml0KSByZXR1cm4gbnVtVmFsdWU7XG5cbiAgLy8gQ29udmVydCB0byBkZWdyZWVzIGZpcnN0LCB0aGVuIHRvIHRhcmdldCB1bml0XG4gIGNvbnN0IGluRGVncmVlcyA9IGZyb21Vbml0ID09PSBcImRlZ3JlZXNcIiA/IG51bVZhbHVlIDogKG51bVZhbHVlICogMTgwIC8gTWF0aC5QSSk7XG4gIHJldHVybiB0b1VuaXQgPT09IFwiZGVncmVlc1wiID8gaW5EZWdyZWVzIDogKGluRGVncmVlcyAqIE1hdGguUEkgLyAxODApO1xufVxuXG4vKipcbiAqIENvbnZlcnQgYSBzcGVlZCB2YWx1ZSBiZXR3ZWVuIHVuaXRzLlxuICpcbiAqIEBwYXJhbSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byBjb252ZXJ0XG4gKiBAcGFyYW0gZnJvbVVuaXQgLSBTb3VyY2UgdW5pdCAoXCJtcGhcIiwgXCJrbS9oXCIsIG9yIFwibS9zXCIpXG4gKiBAcGFyYW0gdG9Vbml0IC0gVGFyZ2V0IHVuaXQgKFwibXBoXCIsIFwia20vaFwiLCBvciBcIm0vc1wiKVxuICogQHJldHVybnMgQ29udmVydGVkIHZhbHVlLCBvciBvcmlnaW5hbCBpZiB1bml0cyBtYXRjaFxuICovXG5leHBvcnQgZnVuY3Rpb24gY29udmVydFNwZWVkKFxuICB2YWx1ZTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbCxcbiAgZnJvbVVuaXQ6IFwibXBoXCIgfCBcImttL2hcIiB8IFwibS9zXCIsXG4gIHRvVW5pdDogXCJtcGhcIiB8IFwia20vaFwiIHwgXCJtL3NcIlxuKTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbCB7XG4gIGlmICh2YWx1ZSA9PT0gbnVsbCB8fCB2YWx1ZSA9PT0gXCJcIikgcmV0dXJuIHZhbHVlO1xuXG4gIGNvbnN0IG51bVZhbHVlID0gdHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiID8gcGFyc2VGbG9hdCh2YWx1ZSkgOiB2YWx1ZTtcbiAgaWYgKGlzTmFOKG51bVZhbHVlKSkgcmV0dXJuIHZhbHVlO1xuXG4gIGlmIChmcm9tVW5pdCA9PT0gdG9Vbml0KSByZXR1cm4gbnVtVmFsdWU7XG5cbiAgLy8gQ29udmVydCB0byBtcGggZmlyc3QsIHRoZW4gdG8gdGFyZ2V0IHVuaXRcbiAgbGV0IGluTXBoOiBudW1iZXI7XG4gIGlmIChmcm9tVW5pdCA9PT0gXCJtcGhcIikgaW5NcGggPSBudW1WYWx1ZTtcbiAgZWxzZSBpZiAoZnJvbVVuaXQgPT09IFwia20vaFwiKSBpbk1waCA9IG51bVZhbHVlIC8gMS42MDkzNDQ7XG4gIGVsc2UgaW5NcGggPSBudW1WYWx1ZSAqIDIuMjM2OTQ7IC8vIG0vcyB0byBtcGhcblxuICBpZiAodG9Vbml0ID09PSBcIm1waFwiKSByZXR1cm4gaW5NcGg7XG4gIGlmICh0b1VuaXQgPT09IFwia20vaFwiKSByZXR1cm4gaW5NcGggKiAxLjYwOTM0NDtcbiAgcmV0dXJuIGluTXBoIC8gMi4yMzY5NDsgLy8gbXBoIHRvIG0vc1xufVxuXG4vKipcbiAqIEdldCB0aGUgc21hbGwgZGlzdGFuY2UgdW5pdCBiYXNlZCBvbiB0aGUgdXNlcidzIGRpc3RhbmNlIGNob2ljZS5cbiAqIFlhcmRzIHVzZXJzIHNlZSBpbmNoZXM7IG1ldGVycyB1c2VycyBzZWUgY20uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRTbWFsbERpc3RhbmNlVW5pdCh1bml0Q2hvaWNlOiBVbml0Q2hvaWNlID0gREVGQVVMVF9VTklUX0NIT0lDRSk6IFNtYWxsRGlzdGFuY2VVbml0IHtcbiAgcmV0dXJuIHVuaXRDaG9pY2UuZGlzdGFuY2UgPT09IFwieWFyZHNcIiA/IFwiaW5jaGVzXCIgOiBcImNtXCI7XG59XG5cbi8qKlxuICogQ29udmVydCBhIGRpc3RhbmNlIHZhbHVlIGZyb20gbWV0ZXJzIHRvIGEgc21hbGwgZGlzdGFuY2UgdW5pdCAoaW5jaGVzIG9yIGNtKS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbnZlcnRTbWFsbERpc3RhbmNlKFxuICB2YWx1ZTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbCxcbiAgdG9TbWFsbFVuaXQ6IFNtYWxsRGlzdGFuY2VVbml0XG4pOiBudW1iZXIgfCBzdHJpbmcgfCBudWxsIHtcbiAgaWYgKHZhbHVlID09PSBudWxsIHx8IHZhbHVlID09PSBcIlwiKSByZXR1cm4gdmFsdWU7XG5cbiAgY29uc3QgbnVtVmFsdWUgPSB0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCIgPyBwYXJzZUZsb2F0KHZhbHVlKSA6IHZhbHVlO1xuICBpZiAoaXNOYU4obnVtVmFsdWUpKSByZXR1cm4gdmFsdWU7XG5cbiAgcmV0dXJuIHRvU21hbGxVbml0ID09PSBcImluY2hlc1wiID8gbnVtVmFsdWUgKiAzOS4zNzAxIDogbnVtVmFsdWUgKiAxMDA7XG59XG5cbi8qKlxuICogTm9ybWFsaXplIGEgbWV0cmljIHZhbHVlIGJhc2VkIG9uIHVuaXQgc3lzdGVtIGFsaWdubWVudCBhbmQgdXNlcidzIHVuaXQgY2hvaWNlLlxuICpcbiAqIENvbnZlcnRzIHZhbHVlcyBmcm9tIHRoZSBzb3VyY2UgdW5pdHMgdG8gdGFyZ2V0IG91dHB1dCB1bml0czpcbiAqIC0gRGlzdGFuY2U6IHlhcmRzIG9yIG1ldGVycyAocGVyIHVuaXRDaG9pY2UuZGlzdGFuY2UpXG4gKiAtIEFuZ2xlczogYWx3YXlzIGRlZ3JlZXNcbiAqIC0gU3BlZWQ6IG1waCBvciBtL3MgKHBlciB1bml0Q2hvaWNlLnNwZWVkKVxuICpcbiAqIEBwYXJhbSB2YWx1ZSAtIFRoZSByYXcgbWV0cmljIHZhbHVlXG4gKiBAcGFyYW0gbWV0cmljTmFtZSAtIFRoZSBuYW1lIG9mIHRoZSBtZXRyaWMgYmVpbmcgbm9ybWFsaXplZFxuICogQHBhcmFtIHJlcG9ydFVuaXRTeXN0ZW0gLSBUaGUgdW5pdCBzeXN0ZW0gdXNlZCBpbiB0aGUgc291cmNlIGRhdGFcbiAqIEBwYXJhbSB1bml0Q2hvaWNlIC0gVXNlcidzIHVuaXQgY2hvaWNlIChkZWZhdWx0cyB0byBtcGggKyB5YXJkcylcbiAqIEByZXR1cm5zIE5vcm1hbGl6ZWQgdmFsdWUgYXMgbnVtYmVyIG9yIHN0cmluZyAobnVsbCBpZiBpbnZhbGlkKVxuICovXG5leHBvcnQgZnVuY3Rpb24gbm9ybWFsaXplTWV0cmljVmFsdWUoXG4gIHZhbHVlOiBNZXRyaWNWYWx1ZSxcbiAgbWV0cmljTmFtZTogc3RyaW5nLFxuICByZXBvcnRVbml0U3lzdGVtOiBVbml0U3lzdGVtLFxuICB1bml0Q2hvaWNlOiBVbml0Q2hvaWNlID0gREVGQVVMVF9VTklUX0NIT0lDRVxuKTogTWV0cmljVmFsdWUge1xuICBjb25zdCBudW1WYWx1ZSA9IHBhcnNlTnVtZXJpY1ZhbHVlKHZhbHVlKTtcbiAgaWYgKG51bVZhbHVlID09PSBudWxsKSByZXR1cm4gdmFsdWU7XG5cbiAgbGV0IGNvbnZlcnRlZDogbnVtYmVyO1xuXG4gIGlmIChTTUFMTF9ESVNUQU5DRV9NRVRSSUNTLmhhcyhtZXRyaWNOYW1lKSkge1xuICAgIGNvbnZlcnRlZCA9IGNvbnZlcnRTbWFsbERpc3RhbmNlKFxuICAgICAgbnVtVmFsdWUsXG4gICAgICBnZXRTbWFsbERpc3RhbmNlVW5pdCh1bml0Q2hvaWNlKVxuICAgICkgYXMgbnVtYmVyO1xuICB9IGVsc2UgaWYgKERJU1RBTkNFX01FVFJJQ1MuaGFzKG1ldHJpY05hbWUpKSB7XG4gICAgY29udmVydGVkID0gY29udmVydERpc3RhbmNlKFxuICAgICAgbnVtVmFsdWUsXG4gICAgICByZXBvcnRVbml0U3lzdGVtLmRpc3RhbmNlVW5pdCxcbiAgICAgIHVuaXRDaG9pY2UuZGlzdGFuY2VcbiAgICApIGFzIG51bWJlcjtcbiAgfSBlbHNlIGlmIChBTkdMRV9NRVRSSUNTLmhhcyhtZXRyaWNOYW1lKSkge1xuICAgIGNvbnZlcnRlZCA9IGNvbnZlcnRBbmdsZShcbiAgICAgIG51bVZhbHVlLFxuICAgICAgcmVwb3J0VW5pdFN5c3RlbS5hbmdsZVVuaXQsXG4gICAgICBcImRlZ3JlZXNcIlxuICAgICkgYXMgbnVtYmVyO1xuICB9IGVsc2UgaWYgKFNQRUVEX01FVFJJQ1MuaGFzKG1ldHJpY05hbWUpKSB7XG4gICAgY29udmVydGVkID0gY29udmVydFNwZWVkKFxuICAgICAgbnVtVmFsdWUsXG4gICAgICByZXBvcnRVbml0U3lzdGVtLnNwZWVkVW5pdCxcbiAgICAgIHVuaXRDaG9pY2Uuc3BlZWRcbiAgICApIGFzIG51bWJlcjtcbiAgfSBlbHNlIHtcbiAgICBjb252ZXJ0ZWQgPSBudW1WYWx1ZTtcbiAgfVxuXG4gIC8vIFNwaW5SYXRlOiByb3VuZCB0byB3aG9sZSBudW1iZXJzXG4gIGlmIChtZXRyaWNOYW1lID09PSBcIlNwaW5SYXRlXCIpIHJldHVybiBNYXRoLnJvdW5kKGNvbnZlcnRlZCk7XG5cbiAgLy8gUm91bmQgdG8gMSBkZWNpbWFsIHBsYWNlIGZvciBjb25zaXN0ZW5jeVxuICByZXR1cm4gTWF0aC5yb3VuZChjb252ZXJ0ZWQgKiAxMCkgLyAxMDtcbn1cblxuLyoqXG4gKiBQYXJzZSBhIG51bWVyaWMgdmFsdWUgZnJvbSBNZXRyaWNWYWx1ZSB0eXBlLlxuICovXG5mdW5jdGlvbiBwYXJzZU51bWVyaWNWYWx1ZSh2YWx1ZTogTWV0cmljVmFsdWUpOiBudW1iZXIgfCBudWxsIHtcbiAgaWYgKHZhbHVlID09PSBudWxsIHx8IHZhbHVlID09PSBcIlwiKSByZXR1cm4gbnVsbDtcbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJudW1iZXJcIikgcmV0dXJuIGlzTmFOKHZhbHVlKSA/IG51bGwgOiB2YWx1ZTtcbiAgXG4gIGNvbnN0IHBhcnNlZCA9IHBhcnNlRmxvYXQodmFsdWUpO1xuICByZXR1cm4gaXNOYU4ocGFyc2VkKSA/IG51bGwgOiBwYXJzZWQ7XG59XG5cbmV4cG9ydCB0eXBlIE1ldHJpY1ZhbHVlID0gc3RyaW5nIHwgbnVtYmVyIHwgbnVsbDtcbiIsICIvKipcbiAqIENTViB3cml0ZXIgZm9yIFRyYWNrUHVsbCBzZXNzaW9uIGRhdGEuXG4gKiBJbXBsZW1lbnRzIGNvcmUgY29sdW1uczogRGF0ZSwgQ2x1YiwgU2hvdCAjLCBUeXBlXG4gKi9cblxuaW1wb3J0IHR5cGUgeyBTZXNzaW9uRGF0YSwgQ2x1Ykdyb3VwLCBTaG90IH0gZnJvbSBcIi4uL21vZGVscy90eXBlc1wiO1xuaW1wb3J0IHtcbiAgZ2V0QXBpU291cmNlVW5pdFN5c3RlbSxcbiAgZ2V0TWV0cmljVW5pdExhYmVsLFxuICBub3JtYWxpemVNZXRyaWNWYWx1ZSxcbiAgREVGQVVMVF9VTklUX0NIT0lDRSxcbiAgdHlwZSBVbml0Q2hvaWNlLFxufSBmcm9tIFwiLi91bml0X25vcm1hbGl6YXRpb25cIjtcbmltcG9ydCB7IE1FVFJJQ19ESVNQTEFZX05BTUVTIH0gZnJvbSBcIi4vY29uc3RhbnRzXCI7XG5cbmNvbnN0IE1FVFJJQ19DT0xVTU5fT1JERVI6IHN0cmluZ1tdID0gW1xuICAvLyBTcGVlZCAmIEVmZmljaWVuY3lcbiAgXCJDbHViU3BlZWRcIiwgXCJCYWxsU3BlZWRcIiwgXCJTbWFzaEZhY3RvclwiLFxuICAvLyBDbHViIERlbGl2ZXJ5XG4gIFwiQXR0YWNrQW5nbGVcIiwgXCJDbHViUGF0aFwiLCBcIkZhY2VBbmdsZVwiLCBcIkZhY2VUb1BhdGhcIiwgXCJTd2luZ0RpcmVjdGlvblwiLCBcIkR5bmFtaWNMb2Z0XCIsXG4gIC8vIExhdW5jaCAmIFNwaW5cbiAgXCJMYXVuY2hBbmdsZVwiLCBcIkxhdW5jaERpcmVjdGlvblwiLCBcIlNwaW5SYXRlXCIsIFwiU3BpbkF4aXNcIiwgXCJTcGluTG9mdFwiLFxuICAvLyBEaXN0YW5jZVxuICBcIkNhcnJ5XCIsIFwiVG90YWxcIixcbiAgLy8gRGlzcGVyc2lvblxuICBcIlNpZGVcIiwgXCJTaWRlVG90YWxcIiwgXCJDYXJyeVNpZGVcIiwgXCJUb3RhbFNpZGVcIiwgXCJDdXJ2ZVwiLFxuICAvLyBCYWxsIEZsaWdodFxuICBcIkhlaWdodFwiLCBcIk1heEhlaWdodFwiLCBcIkxhbmRpbmdBbmdsZVwiLCBcIkhhbmdUaW1lXCIsXG4gIC8vIEltcGFjdFxuICBcIkxvd1BvaW50RGlzdGFuY2VcIiwgXCJJbXBhY3RIZWlnaHRcIiwgXCJJbXBhY3RPZmZzZXRcIixcbiAgLy8gT3RoZXJcbiAgXCJUZW1wb1wiLFxuXTtcblxuZnVuY3Rpb24gZ2V0RGlzcGxheU5hbWUobWV0cmljOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gTUVUUklDX0RJU1BMQVlfTkFNRVNbbWV0cmljXSA/PyBtZXRyaWM7XG59XG5cbmZ1bmN0aW9uIGdldENvbHVtbk5hbWUobWV0cmljOiBzdHJpbmcsIHVuaXRDaG9pY2U6IFVuaXRDaG9pY2UpOiBzdHJpbmcge1xuICBjb25zdCBkaXNwbGF5TmFtZSA9IGdldERpc3BsYXlOYW1lKG1ldHJpYyk7XG4gIGNvbnN0IHVuaXRMYWJlbCA9IGdldE1ldHJpY1VuaXRMYWJlbChtZXRyaWMsIHVuaXRDaG9pY2UpO1xuICByZXR1cm4gdW5pdExhYmVsID8gYCR7ZGlzcGxheU5hbWV9ICgke3VuaXRMYWJlbH0pYCA6IGRpc3BsYXlOYW1lO1xufVxuXG5mdW5jdGlvbiBnZW5lcmF0ZUZpbGVuYW1lKHNlc3Npb246IFNlc3Npb25EYXRhKTogc3RyaW5nIHtcbiAgcmV0dXJuIGBTaG90RGF0YV8ke3Nlc3Npb24uZGF0ZX0uY3N2YDtcbn1cblxuZnVuY3Rpb24gb3JkZXJNZXRyaWNzQnlQcmlvcml0eShcbiAgYWxsTWV0cmljczogc3RyaW5nW10sXG4gIHByaW9yaXR5T3JkZXI6IHN0cmluZ1tdXG4pOiBzdHJpbmdbXSB7XG4gIGNvbnN0IHJlc3VsdDogc3RyaW5nW10gPSBbXTtcbiAgY29uc3Qgc2VlbiA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuXG4gIGZvciAoY29uc3QgbWV0cmljIG9mIHByaW9yaXR5T3JkZXIpIHtcbiAgICBpZiAoYWxsTWV0cmljcy5pbmNsdWRlcyhtZXRyaWMpICYmICFzZWVuLmhhcyhtZXRyaWMpKSB7XG4gICAgICByZXN1bHQucHVzaChtZXRyaWMpO1xuICAgICAgc2Vlbi5hZGQobWV0cmljKTtcbiAgICB9XG4gIH1cblxuICBmb3IgKGNvbnN0IG1ldHJpYyBvZiBhbGxNZXRyaWNzKSB7XG4gICAgaWYgKCFzZWVuLmhhcyhtZXRyaWMpKSB7XG4gICAgICByZXN1bHQucHVzaChtZXRyaWMpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIGhhc1RhZ3Moc2Vzc2lvbjogU2Vzc2lvbkRhdGEpOiBib29sZWFuIHtcbiAgcmV0dXJuIHNlc3Npb24uY2x1Yl9ncm91cHMuc29tZSgoY2x1YikgPT5cbiAgICBjbHViLnNob3RzLnNvbWUoKHNob3QpID0+IHNob3QudGFnICE9PSB1bmRlZmluZWQgJiYgc2hvdC50YWcgIT09IFwiXCIpXG4gICk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB3cml0ZUNzdihcbiAgc2Vzc2lvbjogU2Vzc2lvbkRhdGEsXG4gIGluY2x1ZGVBdmVyYWdlcyA9IHRydWUsXG4gIG1ldHJpY09yZGVyPzogc3RyaW5nW10sXG4gIHVuaXRDaG9pY2U6IFVuaXRDaG9pY2UgPSBERUZBVUxUX1VOSVRfQ0hPSUNFLFxuICBoaXR0aW5nU3VyZmFjZT86IFwiR3Jhc3NcIiB8IFwiTWF0XCJcbik6IHN0cmluZyB7XG4gIGNvbnN0IG9yZGVyZWRNZXRyaWNzID0gb3JkZXJNZXRyaWNzQnlQcmlvcml0eShcbiAgICBzZXNzaW9uLm1ldHJpY19uYW1lcyxcbiAgICBtZXRyaWNPcmRlciA/PyBNRVRSSUNfQ09MVU1OX09SREVSXG4gICk7XG5cbiAgY29uc3QgaGVhZGVyUm93OiBzdHJpbmdbXSA9IFtcIkRhdGVcIiwgXCJDbHViXCJdO1xuXG4gIGlmIChoYXNUYWdzKHNlc3Npb24pKSB7XG4gICAgaGVhZGVyUm93LnB1c2goXCJUYWdcIik7XG4gIH1cblxuICBoZWFkZXJSb3cucHVzaChcIlNob3QgI1wiLCBcIlR5cGVcIik7XG5cbiAgZm9yIChjb25zdCBtZXRyaWMgb2Ygb3JkZXJlZE1ldHJpY3MpIHtcbiAgICBoZWFkZXJSb3cucHVzaChnZXRDb2x1bW5OYW1lKG1ldHJpYywgdW5pdENob2ljZSkpO1xuICB9XG5cbiAgY29uc3Qgcm93czogUmVjb3JkPHN0cmluZywgc3RyaW5nPltdID0gW107XG5cbiAgLy8gU291cmNlIHVuaXQgc3lzdGVtOiBBUEkgYWx3YXlzIHJldHVybnMgbS9zICsgbWV0ZXJzLCBhbmdsZSB1bml0IGZyb20gcmVwb3J0XG4gIGNvbnN0IHVuaXRTeXN0ZW0gPSBnZXRBcGlTb3VyY2VVbml0U3lzdGVtKHNlc3Npb24ubWV0YWRhdGFfcGFyYW1zKTtcblxuICBmb3IgKGNvbnN0IGNsdWIgb2Ygc2Vzc2lvbi5jbHViX2dyb3Vwcykge1xuICAgIGZvciAoY29uc3Qgc2hvdCBvZiBjbHViLnNob3RzKSB7XG4gICAgICBjb25zdCByb3c6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XG4gICAgICAgIERhdGU6IHNlc3Npb24uZGF0ZSxcbiAgICAgICAgQ2x1YjogY2x1Yi5jbHViX25hbWUsXG4gICAgICAgIFwiU2hvdCAjXCI6IFN0cmluZyhzaG90LnNob3RfbnVtYmVyICsgMSksXG4gICAgICAgIFR5cGU6IFwiU2hvdFwiLFxuICAgICAgfTtcblxuICAgICAgaWYgKGhhc1RhZ3Moc2Vzc2lvbikpIHtcbiAgICAgICAgcm93LlRhZyA9IHNob3QudGFnID8/IFwiXCI7XG4gICAgICB9XG5cbiAgICAgIGZvciAoY29uc3QgbWV0cmljIG9mIG9yZGVyZWRNZXRyaWNzKSB7XG4gICAgICAgIGNvbnN0IGNvbE5hbWUgPSBnZXRDb2x1bW5OYW1lKG1ldHJpYywgdW5pdENob2ljZSk7XG4gICAgICAgIGNvbnN0IHJhd1ZhbHVlID0gc2hvdC5tZXRyaWNzW21ldHJpY10gPz8gXCJcIjtcblxuICAgICAgICBpZiAodHlwZW9mIHJhd1ZhbHVlID09PSBcInN0cmluZ1wiIHx8IHR5cGVvZiByYXdWYWx1ZSA9PT0gXCJudW1iZXJcIikge1xuICAgICAgICAgIHJvd1tjb2xOYW1lXSA9IFN0cmluZyhub3JtYWxpemVNZXRyaWNWYWx1ZShyYXdWYWx1ZSwgbWV0cmljLCB1bml0U3lzdGVtLCB1bml0Q2hvaWNlKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcm93W2NvbE5hbWVdID0gXCJcIjtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByb3dzLnB1c2gocm93KTtcbiAgICB9XG5cbiAgICBpZiAoaW5jbHVkZUF2ZXJhZ2VzKSB7XG4gICAgICAvLyBHcm91cCBzaG90cyBieSB0YWdcbiAgICAgIGNvbnN0IHRhZ0dyb3VwcyA9IG5ldyBNYXA8c3RyaW5nLCBTaG90W10+KCk7XG4gICAgICBmb3IgKGNvbnN0IHNob3Qgb2YgY2x1Yi5zaG90cykge1xuICAgICAgICBjb25zdCB0YWcgPSBzaG90LnRhZyA/PyBcIlwiO1xuICAgICAgICBpZiAoIXRhZ0dyb3Vwcy5oYXModGFnKSkgdGFnR3JvdXBzLnNldCh0YWcsIFtdKTtcbiAgICAgICAgdGFnR3JvdXBzLmdldCh0YWcpIS5wdXNoKHNob3QpO1xuICAgICAgfVxuXG4gICAgICBmb3IgKGNvbnN0IFt0YWcsIHNob3RzXSBvZiB0YWdHcm91cHMpIHtcbiAgICAgICAgLy8gT25seSB3cml0ZSBhdmVyYWdlIHJvdyBpZiBncm91cCBoYXMgMisgc2hvdHNcbiAgICAgICAgaWYgKHNob3RzLmxlbmd0aCA8IDIpIGNvbnRpbnVlO1xuXG4gICAgICAgIGNvbnN0IGF2Z1JvdzogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcbiAgICAgICAgICBEYXRlOiBzZXNzaW9uLmRhdGUsXG4gICAgICAgICAgQ2x1YjogY2x1Yi5jbHViX25hbWUsXG4gICAgICAgICAgXCJTaG90ICNcIjogXCJcIixcbiAgICAgICAgICBUeXBlOiBcIkF2ZXJhZ2VcIixcbiAgICAgICAgfTtcblxuICAgICAgICBpZiAoaGFzVGFncyhzZXNzaW9uKSkge1xuICAgICAgICAgIGF2Z1Jvdy5UYWcgPSB0YWc7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGNvbnN0IG1ldHJpYyBvZiBvcmRlcmVkTWV0cmljcykge1xuICAgICAgICAgIGNvbnN0IGNvbE5hbWUgPSBnZXRDb2x1bW5OYW1lKG1ldHJpYywgdW5pdENob2ljZSk7XG4gICAgICAgICAgY29uc3QgdmFsdWVzID0gc2hvdHNcbiAgICAgICAgICAgIC5tYXAoKHMpID0+IHMubWV0cmljc1ttZXRyaWNdKVxuICAgICAgICAgICAgLmZpbHRlcigodikgPT4gdiAhPT0gdW5kZWZpbmVkICYmIHYgIT09IFwiXCIpXG4gICAgICAgICAgICAubWFwKCh2KSA9PiBwYXJzZUZsb2F0KFN0cmluZyh2KSkpO1xuICAgICAgICAgIGNvbnN0IG51bWVyaWNWYWx1ZXMgPSB2YWx1ZXMuZmlsdGVyKCh2KSA9PiAhaXNOYU4odikpO1xuXG4gICAgICAgICAgaWYgKG51bWVyaWNWYWx1ZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3QgYXZnID0gbnVtZXJpY1ZhbHVlcy5yZWR1Y2UoKGEsIGIpID0+IGEgKyBiLCAwKSAvIG51bWVyaWNWYWx1ZXMubGVuZ3RoO1xuICAgICAgICAgICAgY29uc3Qgcm91bmRlZCA9IE1hdGgucm91bmQoYXZnICogMTApIC8gMTA7XG4gICAgICAgICAgICBhdmdSb3dbY29sTmFtZV0gPSBTdHJpbmcobm9ybWFsaXplTWV0cmljVmFsdWUocm91bmRlZCwgbWV0cmljLCB1bml0U3lzdGVtLCB1bml0Q2hvaWNlKSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGF2Z1Jvd1tjb2xOYW1lXSA9IFwiXCI7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcm93cy5wdXNoKGF2Z1Jvdyk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgY29uc3QgbGluZXM6IHN0cmluZ1tdID0gW107XG5cbiAgaWYgKGhpdHRpbmdTdXJmYWNlICE9PSB1bmRlZmluZWQpIHtcbiAgICBsaW5lcy5wdXNoKGBIaXR0aW5nIFN1cmZhY2U6ICR7aGl0dGluZ1N1cmZhY2V9YCk7XG4gIH1cblxuICBsaW5lcy5wdXNoKGhlYWRlclJvdy5qb2luKFwiLFwiKSk7XG4gIGZvciAoY29uc3Qgcm93IG9mIHJvd3MpIHtcbiAgICBsaW5lcy5wdXNoKFxuICAgICAgaGVhZGVyUm93XG4gICAgICAgIC5tYXAoKGNvbCkgPT4ge1xuICAgICAgICAgIGNvbnN0IHZhbHVlID0gcm93W2NvbF0gPz8gXCJcIjtcbiAgICAgICAgICBpZiAodmFsdWUuaW5jbHVkZXMoXCIsXCIpIHx8IHZhbHVlLmluY2x1ZGVzKCdcIicpIHx8IHZhbHVlLmluY2x1ZGVzKFwiXFxuXCIpKSB7XG4gICAgICAgICAgICByZXR1cm4gYFwiJHt2YWx1ZS5yZXBsYWNlKC9cIi9nLCAnXCJcIicpfVwiYDtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICB9KVxuICAgICAgICAuam9pbihcIixcIilcbiAgICApO1xuICB9XG5cbiAgcmV0dXJuIGxpbmVzLmpvaW4oXCJcXG5cIik7XG59XG4iLCAiLyoqXG4gKiBTZXJ2aWNlIFdvcmtlciBmb3IgVHJhY2tQdWxsIENocm9tZSBFeHRlbnNpb25cbiAqL1xuXG5pbXBvcnQgeyBTVE9SQUdFX0tFWVMgfSBmcm9tIFwiLi4vc2hhcmVkL2NvbnN0YW50c1wiO1xuaW1wb3J0IHsgd3JpdGVDc3YgfSBmcm9tIFwiLi4vc2hhcmVkL2Nzdl93cml0ZXJcIjtcbmltcG9ydCB0eXBlIHsgU2Vzc2lvbkRhdGEgfSBmcm9tIFwiLi4vbW9kZWxzL3R5cGVzXCI7XG5pbXBvcnQgeyBtaWdyYXRlTGVnYWN5UHJlZiwgREVGQVVMVF9VTklUX0NIT0lDRSwgdHlwZSBVbml0Q2hvaWNlLCB0eXBlIFNwZWVkVW5pdCwgdHlwZSBEaXN0YW5jZVVuaXQgfSBmcm9tIFwiLi4vc2hhcmVkL3VuaXRfbm9ybWFsaXphdGlvblwiO1xuXG5jaHJvbWUucnVudGltZS5vbkluc3RhbGxlZC5hZGRMaXN0ZW5lcigoKSA9PiB7XG4gIGNvbnNvbGUubG9nKFwiVHJhY2tQdWxsIGV4dGVuc2lvbiBpbnN0YWxsZWRcIik7XG59KTtcblxuaW50ZXJmYWNlIFNhdmVEYXRhUmVxdWVzdCB7XG4gIHR5cGU6IFwiU0FWRV9EQVRBXCI7XG4gIGRhdGE6IFNlc3Npb25EYXRhO1xufVxuXG5pbnRlcmZhY2UgRXhwb3J0Q3N2UmVxdWVzdCB7XG4gIHR5cGU6IFwiRVhQT1JUX0NTVl9SRVFVRVNUXCI7XG59XG5cbmludGVyZmFjZSBHZXREYXRhUmVxdWVzdCB7XG4gIHR5cGU6IFwiR0VUX0RBVEFcIjtcbn1cblxuZnVuY3Rpb24gZ2V0RG93bmxvYWRFcnJvck1lc3NhZ2Uob3JpZ2luYWxFcnJvcjogc3RyaW5nKTogc3RyaW5nIHtcbiAgaWYgKG9yaWdpbmFsRXJyb3IuaW5jbHVkZXMoXCJpbnZhbGlkXCIpKSB7XG4gICAgcmV0dXJuIFwiSW52YWxpZCBkb3dubG9hZCBmb3JtYXRcIjtcbiAgfVxuICBpZiAob3JpZ2luYWxFcnJvci5pbmNsdWRlcyhcInF1b3RhXCIpIHx8IG9yaWdpbmFsRXJyb3IuaW5jbHVkZXMoXCJzcGFjZVwiKSkge1xuICAgIHJldHVybiBcIkluc3VmZmljaWVudCBzdG9yYWdlIHNwYWNlXCI7XG4gIH1cbiAgaWYgKG9yaWdpbmFsRXJyb3IuaW5jbHVkZXMoXCJibG9ja2VkXCIpIHx8IG9yaWdpbmFsRXJyb3IuaW5jbHVkZXMoXCJwb2xpY3lcIikpIHtcbiAgICByZXR1cm4gXCJEb3dubG9hZCBibG9ja2VkIGJ5IGJyb3dzZXIgc2V0dGluZ3NcIjtcbiAgfVxuICByZXR1cm4gb3JpZ2luYWxFcnJvcjtcbn1cblxudHlwZSBSZXF1ZXN0TWVzc2FnZSA9IFNhdmVEYXRhUmVxdWVzdCB8IEV4cG9ydENzdlJlcXVlc3QgfCBHZXREYXRhUmVxdWVzdDtcblxuY2hyb21lLnJ1bnRpbWUub25NZXNzYWdlLmFkZExpc3RlbmVyKChtZXNzYWdlOiBSZXF1ZXN0TWVzc2FnZSwgc2VuZGVyLCBzZW5kUmVzcG9uc2UpID0+IHtcbiAgaWYgKG1lc3NhZ2UudHlwZSA9PT0gXCJHRVRfREFUQVwiKSB7XG4gICAgY2hyb21lLnN0b3JhZ2UubG9jYWwuZ2V0KFtTVE9SQUdFX0tFWVMuVFJBQ0tNQU5fREFUQV0sIChyZXN1bHQpID0+IHtcbiAgICAgIHNlbmRSZXNwb25zZShyZXN1bHRbU1RPUkFHRV9LRVlTLlRSQUNLTUFOX0RBVEFdIHx8IG51bGwpO1xuICAgIH0pO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgaWYgKG1lc3NhZ2UudHlwZSA9PT0gXCJTQVZFX0RBVEFcIikge1xuICAgIGNvbnN0IHNlc3Npb25EYXRhID0gKG1lc3NhZ2UgYXMgU2F2ZURhdGFSZXF1ZXN0KS5kYXRhO1xuICAgIGNocm9tZS5zdG9yYWdlLmxvY2FsLnNldCh7IFtTVE9SQUdFX0tFWVMuVFJBQ0tNQU5fREFUQV06IHNlc3Npb25EYXRhIH0sICgpID0+IHtcbiAgICAgIGlmIChjaHJvbWUucnVudGltZS5sYXN0RXJyb3IpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIlRyYWNrUHVsbDogRmFpbGVkIHRvIHNhdmUgZGF0YTpcIiwgY2hyb21lLnJ1bnRpbWUubGFzdEVycm9yKTtcbiAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBjaHJvbWUucnVudGltZS5sYXN0RXJyb3IubWVzc2FnZSB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiVHJhY2tQdWxsOiBTZXNzaW9uIGRhdGEgc2F2ZWQgdG8gc3RvcmFnZVwiKTtcbiAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogdHJ1ZSB9KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGlmIChtZXNzYWdlLnR5cGUgPT09IFwiRVhQT1JUX0NTVl9SRVFVRVNUXCIpIHtcbiAgICBjaHJvbWUuc3RvcmFnZS5sb2NhbC5nZXQoW1NUT1JBR0VfS0VZUy5UUkFDS01BTl9EQVRBLCBTVE9SQUdFX0tFWVMuU1BFRURfVU5JVCwgU1RPUkFHRV9LRVlTLkRJU1RBTkNFX1VOSVQsIFNUT1JBR0VfS0VZUy5ISVRUSU5HX1NVUkZBQ0UsIFNUT1JBR0VfS0VZUy5JTkNMVURFX0FWRVJBR0VTLCBcInVuaXRQcmVmZXJlbmNlXCJdLCAocmVzdWx0KSA9PiB7XG4gICAgICBjb25zdCBkYXRhID0gcmVzdWx0W1NUT1JBR0VfS0VZUy5UUkFDS01BTl9EQVRBXSBhcyBTZXNzaW9uRGF0YSB8IHVuZGVmaW5lZDtcbiAgICAgIGlmICghZGF0YSB8fCAhZGF0YS5jbHViX2dyb3VwcyB8fCBkYXRhLmNsdWJfZ3JvdXBzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFwiTm8gZGF0YSB0byBleHBvcnRcIiB9KTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB0cnkge1xuICAgICAgICBsZXQgdW5pdENob2ljZTogVW5pdENob2ljZTtcbiAgICAgICAgaWYgKHJlc3VsdFtTVE9SQUdFX0tFWVMuU1BFRURfVU5JVF0gJiYgcmVzdWx0W1NUT1JBR0VfS0VZUy5ESVNUQU5DRV9VTklUXSkge1xuICAgICAgICAgIHVuaXRDaG9pY2UgPSB7XG4gICAgICAgICAgICBzcGVlZDogcmVzdWx0W1NUT1JBR0VfS0VZUy5TUEVFRF9VTklUXSBhcyBTcGVlZFVuaXQsXG4gICAgICAgICAgICBkaXN0YW5jZTogcmVzdWx0W1NUT1JBR0VfS0VZUy5ESVNUQU5DRV9VTklUXSBhcyBEaXN0YW5jZVVuaXQsXG4gICAgICAgICAgfTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB1bml0Q2hvaWNlID0gbWlncmF0ZUxlZ2FjeVByZWYocmVzdWx0W1widW5pdFByZWZlcmVuY2VcIl0gYXMgc3RyaW5nIHwgdW5kZWZpbmVkKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBzdXJmYWNlID0gKHJlc3VsdFtTVE9SQUdFX0tFWVMuSElUVElOR19TVVJGQUNFXSBhcyBcIkdyYXNzXCIgfCBcIk1hdFwiKSA/PyBcIk1hdFwiO1xuICAgICAgICBjb25zdCBpbmNsdWRlQXZlcmFnZXMgPSByZXN1bHRbU1RPUkFHRV9LRVlTLklOQ0xVREVfQVZFUkFHRVNdID09PSB1bmRlZmluZWRcbiAgICAgICAgICA/IHRydWVcbiAgICAgICAgICA6IEJvb2xlYW4ocmVzdWx0W1NUT1JBR0VfS0VZUy5JTkNMVURFX0FWRVJBR0VTXSk7XG4gICAgICAgIGNvbnN0IGNzdkNvbnRlbnQgPSB3cml0ZUNzdihkYXRhLCBpbmNsdWRlQXZlcmFnZXMsIHVuZGVmaW5lZCwgdW5pdENob2ljZSwgc3VyZmFjZSk7XG4gICAgICAgIGNvbnN0IGZpbGVuYW1lID0gYFNob3REYXRhXyR7ZGF0YS5kYXRlIHx8IFwidW5rbm93blwifS5jc3ZgO1xuXG4gICAgICAgIGNocm9tZS5kb3dubG9hZHMuZG93bmxvYWQoXG4gICAgICAgICAge1xuICAgICAgICAgICAgdXJsOiBgZGF0YTp0ZXh0L2NzdjtjaGFyc2V0PXV0Zi04LCR7ZW5jb2RlVVJJQ29tcG9uZW50KGNzdkNvbnRlbnQpfWAsXG4gICAgICAgICAgICBmaWxlbmFtZTogZmlsZW5hbWUsXG4gICAgICAgICAgICBzYXZlQXM6IGZhbHNlLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgKGRvd25sb2FkSWQpID0+IHtcbiAgICAgICAgICAgIGlmIChjaHJvbWUucnVudGltZS5sYXN0RXJyb3IpIHtcbiAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIlRyYWNrUHVsbDogRG93bmxvYWQgZmFpbGVkOlwiLCBjaHJvbWUucnVudGltZS5sYXN0RXJyb3IpO1xuICAgICAgICAgICAgICBjb25zdCBlcnJvck1lc3NhZ2UgPSBnZXREb3dubG9hZEVycm9yTWVzc2FnZShjaHJvbWUucnVudGltZS5sYXN0RXJyb3IubWVzc2FnZSk7XG4gICAgICAgICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3JNZXNzYWdlIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coYFRyYWNrUHVsbDogQ1NWIGV4cG9ydGVkIHdpdGggZG93bmxvYWQgSUQgJHtkb3dubG9hZElkfWApO1xuICAgICAgICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiB0cnVlLCBkb3dubG9hZElkLCBmaWxlbmFtZSB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBjb25zb2xlLmVycm9yKFwiVHJhY2tQdWxsOiBDU1YgZ2VuZXJhdGlvbiBmYWlsZWQ6XCIsIGVycm9yKTtcbiAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcikgfSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbn0pO1xuXG5jaHJvbWUuc3RvcmFnZS5vbkNoYW5nZWQuYWRkTGlzdGVuZXIoKGNoYW5nZXMsIG5hbWVzcGFjZSkgPT4ge1xuICBpZiAobmFtZXNwYWNlID09PSBcImxvY2FsXCIgJiYgY2hhbmdlc1tTVE9SQUdFX0tFWVMuVFJBQ0tNQU5fREFUQV0pIHtcbiAgICBjb25zdCBuZXdWYWx1ZSA9IGNoYW5nZXNbU1RPUkFHRV9LRVlTLlRSQUNLTUFOX0RBVEFdLm5ld1ZhbHVlO1xuICAgIGNocm9tZS5ydW50aW1lLnNlbmRNZXNzYWdlKHsgdHlwZTogXCJEQVRBX1VQREFURURcIiwgZGF0YTogbmV3VmFsdWUgfSkuY2F0Y2goKCkgPT4ge1xuICAgICAgLy8gSWdub3JlIGVycm9ycyB3aGVuIG5vIHBvcHVwIGlzIGxpc3RlbmluZ1xuICAgIH0pO1xuICB9XG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7QUFBQSxNQTRFYSxzQkFrRUE7QUE5SWI7QUFBQTtBQTRFTyxNQUFNLHVCQUErQztBQUFBLFFBQzFELFdBQVc7QUFBQSxRQUNYLFdBQVc7QUFBQSxRQUNYLGFBQWE7QUFBQSxRQUNiLGFBQWE7QUFBQSxRQUNiLFVBQVU7QUFBQSxRQUNWLFdBQVc7QUFBQSxRQUNYLFlBQVk7QUFBQSxRQUNaLGdCQUFnQjtBQUFBLFFBQ2hCLGFBQWE7QUFBQSxRQUNiLFVBQVU7QUFBQSxRQUNWLFVBQVU7QUFBQSxRQUNWLFVBQVU7QUFBQSxRQUNWLGFBQWE7QUFBQSxRQUNiLGlCQUFpQjtBQUFBLFFBQ2pCLE9BQU87QUFBQSxRQUNQLE9BQU87QUFBQSxRQUNQLE1BQU07QUFBQSxRQUNOLFdBQVc7QUFBQSxRQUNYLFdBQVc7QUFBQSxRQUNYLFdBQVc7QUFBQSxRQUNYLFFBQVE7QUFBQSxRQUNSLFdBQVc7QUFBQSxRQUNYLE9BQU87QUFBQSxRQUNQLGNBQWM7QUFBQSxRQUNkLFVBQVU7QUFBQSxRQUNWLGtCQUFrQjtBQUFBLFFBQ2xCLGNBQWM7QUFBQSxRQUNkLGNBQWM7QUFBQSxRQUNkLE9BQU87QUFBQSxNQUNUO0FBb0NPLE1BQU0sZUFBZTtBQUFBLFFBQzFCLGVBQWU7QUFBQSxRQUNmLFlBQVk7QUFBQSxRQUNaLGVBQWU7QUFBQSxRQUNmLG9CQUFvQjtB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
