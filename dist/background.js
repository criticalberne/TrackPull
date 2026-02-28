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
        DISTANCE_UNIT: "distanceUnit"
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
  function normalizeMetricValue(value, metricName, reportUnitSystem, unitChoice = DEFAULT_UNIT_CHOICE) {
    const numValue = parseNumericValue(value);
    if (numValue === null) return value;
    let converted;
    if (DISTANCE_METRICS.has(metricName)) {
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
      return value;
    }
    return Math.round(converted * 10) / 10;
  }
  function parseNumericValue(value) {
    if (value === null || value === "") return null;
    if (typeof value === "number") return isNaN(value) ? null : value;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? null : parsed;
  }
  var DEFAULT_UNIT_CHOICE, UNIT_SYSTEMS, DISTANCE_METRICS, ANGLE_METRICS, SPEED_METRICS, DEFAULT_UNIT_SYSTEM, SPEED_LABELS, DISTANCE_LABELS, FIXED_UNIT_LABELS;
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
        "Curve",
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
  function writeCsv(session, includeAverages = true, metricOrder, unitChoice = DEFAULT_UNIT_CHOICE) {
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
      if (includeAverages && Object.keys(club.averages).length > 0) {
        const avgRow = {
          Date: session.date,
          Club: club.club_name,
          "Shot #": "",
          Type: "Average"
        };
        if (hasTags(session)) {
          avgRow.Tag = "";
        }
        for (const metric of orderedMetrics) {
          const colName = getColumnName(metric, unitChoice);
          const rawValue = club.averages[metric] ?? "";
          if (typeof rawValue === "string" || typeof rawValue === "number") {
            avgRow[colName] = String(normalizeMetricValue(rawValue, metric, unitSystem, unitChoice));
          } else {
            avgRow[colName] = "";
          }
        }
        rows.push(avgRow);
      }
      if (includeAverages && Object.keys(club.consistency).length > 0) {
        const consRow = {
          Date: session.date,
          Club: club.club_name,
          "Shot #": "",
          Type: "Consistency"
        };
        if (hasTags(session)) {
          consRow.Tag = "";
        }
        for (const metric of orderedMetrics) {
          const colName = getColumnName(metric, unitChoice);
          const rawValue = club.consistency[metric] ?? "";
          if (typeof rawValue === "string" || typeof rawValue === "number") {
            consRow[colName] = String(normalizeMetricValue(rawValue, metric, unitSystem, unitChoice));
          } else {
            consRow[colName] = "";
          }
        }
        rows.push(consRow);
      }
    }
    const csvContent = [
      headerRow.join(","),
      ...rows.map((row) => {
        return headerRow.map((col) => {
          const value = row[col] ?? "";
          if (value.includes(",") || value.includes('"') || value.includes("\n")) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(",");
      })
    ].join("\n");
    return csvContent;
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
          chrome.storage.local.get([STORAGE_KEYS.TRACKMAN_DATA, STORAGE_KEYS.SPEED_UNIT, STORAGE_KEYS.DISTANCE_UNIT, "unitPreference"], (result) => {
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
              const csvContent = writeCsv(data, true, void 0, unitChoice);
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL3NoYXJlZC9jb25zdGFudHMudHMiLCAiLi4vc3JjL3NoYXJlZC91bml0X25vcm1hbGl6YXRpb24udHMiLCAiLi4vc3JjL3NoYXJlZC9jc3Zfd3JpdGVyLnRzIiwgIi4uL3NyYy9iYWNrZ3JvdW5kL3NlcnZpY2VXb3JrZXIudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbIi8qKlxuICogU2hhcmVkIGNvbnN0YW50cyBpbmNsdWRpbmcgQ1NTIHNlbGVjdG9ycyBhbmQgY29uZmlndXJhdGlvbi5cbiAqIEJhc2VkIG9uIFB5dGhvbiBzY3JhcGVyIGNvbnN0YW50cy5weSBpbXBsZW1lbnRhdGlvbi5cbiAqL1xuXG4vLyBDb21wbGV0ZSBsaXN0IG9mIGFsbCBrbm93biBUcmFja21hbiBtZXRyaWNzIChVUkwgcGFyYW1ldGVyIG5hbWVzKVxuZXhwb3J0IGNvbnN0IEFMTF9NRVRSSUNTID0gW1xuICBcIkNsdWJTcGVlZFwiLFxuICBcIkJhbGxTcGVlZFwiLFxuICBcIlNtYXNoRmFjdG9yXCIsXG4gIFwiQXR0YWNrQW5nbGVcIixcbiAgXCJDbHViUGF0aFwiLFxuICBcIkZhY2VBbmdsZVwiLFxuICBcIkZhY2VUb1BhdGhcIixcbiAgXCJTd2luZ0RpcmVjdGlvblwiLFxuICBcIkR5bmFtaWNMb2Z0XCIsXG4gIFwiU3BpblJhdGVcIixcbiAgXCJTcGluQXhpc1wiLFxuICBcIlNwaW5Mb2Z0XCIsXG4gIFwiTGF1bmNoQW5nbGVcIixcbiAgXCJMYXVuY2hEaXJlY3Rpb25cIixcbiAgXCJDYXJyeVwiLFxuICBcIlRvdGFsXCIsXG4gIFwiU2lkZVwiLFxuICBcIlNpZGVUb3RhbFwiLFxuICBcIkNhcnJ5U2lkZVwiLFxuICBcIlRvdGFsU2lkZVwiLFxuICBcIkhlaWdodFwiLFxuICBcIk1heEhlaWdodFwiLFxuICBcIkN1cnZlXCIsXG4gIFwiTGFuZGluZ0FuZ2xlXCIsXG4gIFwiSGFuZ1RpbWVcIixcbiAgXCJMb3dQb2ludERpc3RhbmNlXCIsXG4gIFwiSW1wYWN0SGVpZ2h0XCIsXG4gIFwiSW1wYWN0T2Zmc2V0XCIsXG4gIFwiVGVtcG9cIixcbl0gYXMgY29uc3Q7XG5cbi8vIE1ldHJpY3Mgc3BsaXQgaW50byBncm91cHMgZm9yIG11bHRpLXBhZ2UtbG9hZCBIVE1MIGZhbGxiYWNrXG5leHBvcnQgY29uc3QgTUVUUklDX0dST1VQUyA9IFtcbiAgW1xuICAgIFwiQ2x1YlNwZWVkXCIsXG4gICAgXCJCYWxsU3BlZWRcIixcbiAgICBcIlNtYXNoRmFjdG9yXCIsXG4gICAgXCJBdHRhY2tBbmdsZVwiLFxuICAgIFwiQ2x1YlBhdGhcIixcbiAgICBcIkZhY2VBbmdsZVwiLFxuICAgIFwiRmFjZVRvUGF0aFwiLFxuICAgIFwiU3dpbmdEaXJlY3Rpb25cIixcbiAgICBcIkR5bmFtaWNMb2Z0XCIsXG4gICAgXCJTcGluTG9mdFwiLFxuICBdLFxuICBbXG4gICAgXCJTcGluUmF0ZVwiLFxuICAgIFwiU3BpbkF4aXNcIixcbiAgICBcIkxhdW5jaEFuZ2xlXCIsXG4gICAgXCJMYXVuY2hEaXJlY3Rpb25cIixcbiAgICBcIkNhcnJ5XCIsXG4gICAgXCJUb3RhbFwiLFxuICAgIFwiU2lkZVwiLFxuICAgIFwiU2lkZVRvdGFsXCIsXG4gICAgXCJDYXJyeVNpZGVcIixcbiAgICBcIlRvdGFsU2lkZVwiLFxuICAgIFwiSGVpZ2h0XCIsXG4gICAgXCJNYXhIZWlnaHRcIixcbiAgICBcIkN1cnZlXCIsXG4gICAgXCJMYW5kaW5nQW5nbGVcIixcbiAgICBcIkhhbmdUaW1lXCIsXG4gICAgXCJMb3dQb2ludERpc3RhbmNlXCIsXG4gICAgXCJJbXBhY3RIZWlnaHRcIixcbiAgICBcIkltcGFjdE9mZnNldFwiLFxuICAgIFwiVGVtcG9cIixcbiAgXSxcbl0gYXMgY29uc3Q7XG5cbi8vIERpc3BsYXkgbmFtZXM6IFVSTCBwYXJhbSBuYW1lIC0+IGh1bWFuLXJlYWRhYmxlIENTViBoZWFkZXJcbmV4cG9ydCBjb25zdCBNRVRSSUNfRElTUExBWV9OQU1FUzogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcbiAgQ2x1YlNwZWVkOiBcIkNsdWIgU3BlZWRcIixcbiAgQmFsbFNwZWVkOiBcIkJhbGwgU3BlZWRcIixcbiAgU21hc2hGYWN0b3I6IFwiU21hc2ggRmFjdG9yXCIsXG4gIEF0dGFja0FuZ2xlOiBcIkF0dGFjayBBbmdsZVwiLFxuICBDbHViUGF0aDogXCJDbHViIFBhdGhcIixcbiAgRmFjZUFuZ2xlOiBcIkZhY2UgQW5nbGVcIixcbiAgRmFjZVRvUGF0aDogXCJGYWNlIFRvIFBhdGhcIixcbiAgU3dpbmdEaXJlY3Rpb246IFwiU3dpbmcgRGlyZWN0aW9uXCIsXG4gIER5bmFtaWNMb2Z0OiBcIkR5bmFtaWMgTG9mdFwiLFxuICBTcGluUmF0ZTogXCJTcGluIFJhdGVcIixcbiAgU3BpbkF4aXM6IFwiU3BpbiBBeGlzXCIsXG4gIFNwaW5Mb2Z0OiBcIlNwaW4gTG9mdFwiLFxuICBMYXVuY2hBbmdsZTogXCJMYXVuY2ggQW5nbGVcIixcbiAgTGF1bmNoRGlyZWN0aW9uOiBcIkxhdW5jaCBEaXJlY3Rpb25cIixcbiAgQ2Fycnk6IFwiQ2FycnlcIixcbiAgVG90YWw6IFwiVG90YWxcIixcbiAgU2lkZTogXCJTaWRlXCIsXG4gIFNpZGVUb3RhbDogXCJTaWRlIFRvdGFsXCIsXG4gIENhcnJ5U2lkZTogXCJDYXJyeSBTaWRlXCIsXG4gIFRvdGFsU2lkZTogXCJUb3RhbCBTaWRlXCIsXG4gIEhlaWdodDogXCJIZWlnaHRcIixcbiAgTWF4SGVpZ2h0OiBcIk1heCBIZWlnaHRcIixcbiAgQ3VydmU6IFwiQ3VydmVcIixcbiAgTGFuZGluZ0FuZ2xlOiBcIkxhbmRpbmcgQW5nbGVcIixcbiAgSGFuZ1RpbWU6IFwiSGFuZyBUaW1lXCIsXG4gIExvd1BvaW50RGlzdGFuY2U6IFwiTG93IFBvaW50XCIsXG4gIEltcGFjdEhlaWdodDogXCJJbXBhY3QgSGVpZ2h0XCIsXG4gIEltcGFjdE9mZnNldDogXCJJbXBhY3QgT2Zmc2V0XCIsXG4gIFRlbXBvOiBcIlRlbXBvXCIsXG59O1xuXG4vLyBDU1MgY2xhc3Mgc2VsZWN0b3JzIChmcm9tIFRyYWNrbWFuJ3MgcmVuZGVyZWQgSFRNTClcbmV4cG9ydCBjb25zdCBDU1NfREFURSA9IFwiZGF0ZVwiO1xuZXhwb3J0IGNvbnN0IENTU19SRVNVTFRTX1dSQVBQRVIgPSBcInBsYXllci1hbmQtcmVzdWx0cy10YWJsZS13cmFwcGVyXCI7XG5leHBvcnQgY29uc3QgQ1NTX1JFU1VMVFNfVEFCTEUgPSBcIlJlc3VsdHNUYWJsZVwiO1xuZXhwb3J0IGNvbnN0IENTU19DTFVCX1RBRyA9IFwiZ3JvdXAtdGFnXCI7XG5leHBvcnQgY29uc3QgQ1NTX1BBUkFNX05BTUVTX1JPVyA9IFwicGFyYW1ldGVyLW5hbWVzLXJvd1wiO1xuZXhwb3J0IGNvbnN0IENTU19QQVJBTV9OQU1FID0gXCJwYXJhbWV0ZXItbmFtZVwiO1xuZXhwb3J0IGNvbnN0IENTU19TSE9UX0RFVEFJTF9ST1cgPSBcInJvdy13aXRoLXNob3QtZGV0YWlsc1wiO1xuZXhwb3J0IGNvbnN0IENTU19BVkVSQUdFX1ZBTFVFUyA9IFwiYXZlcmFnZS12YWx1ZXNcIjtcbmV4cG9ydCBjb25zdCBDU1NfQ09OU0lTVEVOQ1lfVkFMVUVTID0gXCJjb25zaXN0ZW5jeS12YWx1ZXNcIjtcblxuLy8gQVBJIFVSTCBwYXR0ZXJucyB0aGF0IGxpa2VseSBpbmRpY2F0ZSBhbiBBUEkgZGF0YSByZXNwb25zZVxuZXhwb3J0IGNvbnN0IEFQSV9VUkxfUEFUVEVSTlMgPSBbXG4gIFwiYXBpLnRyYWNrbWFuZ29sZi5jb21cIixcbiAgXCJ0cmFja21hbmdvbGYuY29tL2FwaVwiLFxuICBcIi9hcGkvXCIsXG4gIFwiL3JlcG9ydHMvXCIsXG4gIFwiL2FjdGl2aXRpZXMvXCIsXG4gIFwiL3Nob3RzL1wiLFxuICBcImdyYXBocWxcIixcbl07XG5cbi8vIFRpbWVvdXRzIChtaWxsaXNlY29uZHMpXG5leHBvcnQgY29uc3QgUEFHRV9MT0FEX1RJTUVPVVQgPSAzMF8wMDA7XG5leHBvcnQgY29uc3QgREFUQV9MT0FEX1RJTUVPVVQgPSAxNV8wMDA7XG5cbi8vIFRyYWNrbWFuIGJhc2UgVVJMXG5leHBvcnQgY29uc3QgQkFTRV9VUkwgPSBcImh0dHBzOi8vd2ViLWR5bmFtaWMtcmVwb3J0cy50cmFja21hbmdvbGYuY29tL1wiO1xuXG4vLyBTdG9yYWdlIGtleXMgZm9yIENocm9tZSBleHRlbnNpb24gKGFsaWduZWQgYmV0d2VlbiBiYWNrZ3JvdW5kIGFuZCBwb3B1cClcbmV4cG9ydCBjb25zdCBTVE9SQUdFX0tFWVMgPSB7XG4gIFRSQUNLTUFOX0RBVEE6IFwidHJhY2ttYW5EYXRhXCIsXG4gIFNQRUVEX1VOSVQ6IFwic3BlZWRVbml0XCIsXG4gIERJU1RBTkNFX1VOSVQ6IFwiZGlzdGFuY2VVbml0XCIsXG59IGFzIGNvbnN0O1xuIiwgIi8qKlxuICogVW5pdCBub3JtYWxpemF0aW9uIHV0aWxpdGllcyBmb3IgVHJhY2ttYW4gbWVhc3VyZW1lbnRzLlxuICogXG4gKiBUcmFja21hbiB1c2VzIG5kXyogcGFyYW1ldGVycyB0byBzcGVjaWZ5IHVuaXRzOlxuICogLSBuZF8wMDEsIG5kXzAwMiwgZXRjLiBkZWZpbmUgdW5pdCBzeXN0ZW1zIGZvciBkaWZmZXJlbnQgbWVhc3VyZW1lbnQgZ3JvdXBzXG4gKiAtIENvbW1vbiB2YWx1ZXM6IDc4OTAxMiA9IHlhcmRzL2RlZ3JlZXMsIDc4OTAxMyA9IG1ldGVycy9yYWRpYW5zXG4gKi9cblxuZXhwb3J0IHR5cGUgVW5pdFN5c3RlbUlkID0gXCI3ODkwMTJcIiB8IFwiNzg5MDEzXCIgfCBcIjc4OTAxNFwiIHwgc3RyaW5nO1xuXG5leHBvcnQgdHlwZSBTcGVlZFVuaXQgPSBcIm1waFwiIHwgXCJtL3NcIjtcbmV4cG9ydCB0eXBlIERpc3RhbmNlVW5pdCA9IFwieWFyZHNcIiB8IFwibWV0ZXJzXCI7XG5leHBvcnQgaW50ZXJmYWNlIFVuaXRDaG9pY2UgeyBzcGVlZDogU3BlZWRVbml0OyBkaXN0YW5jZTogRGlzdGFuY2VVbml0IH1cbmV4cG9ydCBjb25zdCBERUZBVUxUX1VOSVRfQ0hPSUNFOiBVbml0Q2hvaWNlID0geyBzcGVlZDogXCJtcGhcIiwgZGlzdGFuY2U6IFwieWFyZHNcIiB9O1xuXG4vKipcbiAqIFRyYWNrbWFuIHVuaXQgc3lzdGVtIGRlZmluaXRpb25zLlxuICogTWFwcyBuZF8qIHBhcmFtZXRlciB2YWx1ZXMgdG8gYWN0dWFsIHVuaXRzIGZvciBlYWNoIG1ldHJpYy5cbiAqL1xuZXhwb3J0IGNvbnN0IFVOSVRfU1lTVEVNUzogUmVjb3JkPFVuaXRTeXN0ZW1JZCwgVW5pdFN5c3RlbT4gPSB7XG4gIC8vIEltcGVyaWFsICh5YXJkcywgZGVncmVlcykgLSBtb3N0IGNvbW1vblxuICBcIjc4OTAxMlwiOiB7XG4gICAgaWQ6IFwiNzg5MDEyXCIsXG4gICAgbmFtZTogXCJJbXBlcmlhbFwiLFxuICAgIGRpc3RhbmNlVW5pdDogXCJ5YXJkc1wiLFxuICAgIGFuZ2xlVW5pdDogXCJkZWdyZWVzXCIsXG4gICAgc3BlZWRVbml0OiBcIm1waFwiLFxuICB9LFxuICAvLyBNZXRyaWMgKG1ldGVycywgcmFkaWFucylcbiAgXCI3ODkwMTNcIjoge1xuICAgIGlkOiBcIjc4OTAxM1wiLFxuICAgIG5hbWU6IFwiTWV0cmljIChyYWQpXCIsXG4gICAgZGlzdGFuY2VVbml0OiBcIm1ldGVyc1wiLFxuICAgIGFuZ2xlVW5pdDogXCJyYWRpYW5zXCIsXG4gICAgc3BlZWRVbml0OiBcImttL2hcIixcbiAgfSxcbiAgLy8gTWV0cmljIChtZXRlcnMsIGRlZ3JlZXMpIC0gbGVzcyBjb21tb25cbiAgXCI3ODkwMTRcIjoge1xuICAgIGlkOiBcIjc4OTAxNFwiLFxuICAgIG5hbWU6IFwiTWV0cmljIChkZWcpXCIsXG4gICAgZGlzdGFuY2VVbml0OiBcIm1ldGVyc1wiLFxuICAgIGFuZ2xlVW5pdDogXCJkZWdyZWVzXCIsXG4gICAgc3BlZWRVbml0OiBcImttL2hcIixcbiAgfSxcbn07XG5cbi8qKlxuICogVW5pdCBzeXN0ZW0gY29uZmlndXJhdGlvbi5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBVbml0U3lzdGVtIHtcbiAgaWQ6IFVuaXRTeXN0ZW1JZDtcbiAgbmFtZTogc3RyaW5nO1xuICBkaXN0YW5jZVVuaXQ6IFwieWFyZHNcIiB8IFwibWV0ZXJzXCI7XG4gIGFuZ2xlVW5pdDogXCJkZWdyZWVzXCIgfCBcInJhZGlhbnNcIjtcbiAgc3BlZWRVbml0OiBcIm1waFwiIHwgXCJrbS9oXCIgfCBcIm0vc1wiO1xufVxuXG4vKipcbiAqIE1ldHJpY3MgdGhhdCB1c2UgZGlzdGFuY2UgdW5pdHMuXG4gKi9cbmV4cG9ydCBjb25zdCBESVNUQU5DRV9NRVRSSUNTID0gbmV3IFNldChbXG4gIFwiQ2FycnlcIixcbiAgXCJUb3RhbFwiLFxuICBcIlNpZGVcIixcbiAgXCJTaWRlVG90YWxcIixcbiAgXCJDYXJyeVNpZGVcIixcbiAgXCJUb3RhbFNpZGVcIixcbiAgXCJIZWlnaHRcIixcbiAgXCJNYXhIZWlnaHRcIixcbiAgXCJDdXJ2ZVwiLFxuICBcIkxvd1BvaW50RGlzdGFuY2VcIixcbl0pO1xuXG4vKipcbiAqIE1ldHJpY3MgdGhhdCB1c2UgYW5nbGUgdW5pdHMuXG4gKi9cbmV4cG9ydCBjb25zdCBBTkdMRV9NRVRSSUNTID0gbmV3IFNldChbXG4gIFwiQXR0YWNrQW5nbGVcIixcbiAgXCJDbHViUGF0aFwiLFxuICBcIkZhY2VBbmdsZVwiLFxuICBcIkZhY2VUb1BhdGhcIixcbiAgXCJEeW5hbWljTG9mdFwiLFxuICBcIkxhdW5jaEFuZ2xlXCIsXG4gIFwiTGF1bmNoRGlyZWN0aW9uXCIsXG4gIFwiTGFuZGluZ0FuZ2xlXCIsXG5dKTtcblxuLyoqXG4gKiBNZXRyaWNzIHRoYXQgdXNlIHNwZWVkIHVuaXRzLlxuICovXG5leHBvcnQgY29uc3QgU1BFRURfTUVUUklDUyA9IG5ldyBTZXQoW1xuICBcIkNsdWJTcGVlZFwiLFxuICBcIkJhbGxTcGVlZFwiLFxuICBcIlRlbXBvXCIsXG5dKTtcblxuLyoqXG4gKiBEZWZhdWx0IHVuaXQgc3lzdGVtIChJbXBlcmlhbCAtIHlhcmRzL2RlZ3JlZXMpLlxuICovXG5leHBvcnQgY29uc3QgREVGQVVMVF9VTklUX1NZU1RFTTogVW5pdFN5c3RlbSA9IFVOSVRfU1lTVEVNU1tcIjc4OTAxMlwiXTtcblxuLyoqXG4gKiBTcGVlZCB1bml0IGRpc3BsYXkgbGFiZWxzIGZvciBDU1YgaGVhZGVycy5cbiAqL1xuZXhwb3J0IGNvbnN0IFNQRUVEX0xBQkVMUzogUmVjb3JkPFNwZWVkVW5pdCwgc3RyaW5nPiA9IHtcbiAgXCJtcGhcIjogXCJtcGhcIixcbiAgXCJtL3NcIjogXCJtL3NcIixcbn07XG5cbi8qKlxuICogRGlzdGFuY2UgdW5pdCBkaXNwbGF5IGxhYmVscyBmb3IgQ1NWIGhlYWRlcnMuXG4gKi9cbmV4cG9ydCBjb25zdCBESVNUQU5DRV9MQUJFTFM6IFJlY29yZDxEaXN0YW5jZVVuaXQsIHN0cmluZz4gPSB7XG4gIFwieWFyZHNcIjogXCJ5ZHNcIixcbiAgXCJtZXRlcnNcIjogXCJtXCIsXG59O1xuXG4vKipcbiAqIE1pZ3JhdGUgYSBsZWdhY3kgdW5pdFByZWZlcmVuY2Ugc3RyaW5nIHRvIGEgVW5pdENob2ljZSBvYmplY3QuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtaWdyYXRlTGVnYWN5UHJlZihzdG9yZWQ6IHN0cmluZyB8IHVuZGVmaW5lZCk6IFVuaXRDaG9pY2Uge1xuICBzd2l0Y2ggKHN0b3JlZCkge1xuICAgIGNhc2UgXCJtZXRyaWNcIjpcbiAgICAgIHJldHVybiB7IHNwZWVkOiBcIm0vc1wiLCBkaXN0YW5jZTogXCJtZXRlcnNcIiB9O1xuICAgIGNhc2UgXCJoeWJyaWRcIjpcbiAgICAgIHJldHVybiB7IHNwZWVkOiBcIm1waFwiLCBkaXN0YW5jZTogXCJtZXRlcnNcIiB9O1xuICAgIGNhc2UgXCJpbXBlcmlhbFwiOlxuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4geyBzcGVlZDogXCJtcGhcIiwgZGlzdGFuY2U6IFwieWFyZHNcIiB9O1xuICB9XG59XG5cbi8qKlxuICogRml4ZWQgdW5pdCBsYWJlbHMgZm9yIG1ldHJpY3Mgd2hvc2UgdW5pdHMgZG9uJ3QgdmFyeSBieSBwcmVmZXJlbmNlLlxuICovXG5leHBvcnQgY29uc3QgRklYRURfVU5JVF9MQUJFTFM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XG4gIFNwaW5SYXRlOiBcInJwbVwiLFxuICBIYW5nVGltZTogXCJzXCIsXG59O1xuXG4vKipcbiAqIEV4dHJhY3QgbmRfKiBwYXJhbWV0ZXJzIGZyb20gbWV0YWRhdGFfcGFyYW1zLlxuICogXG4gKiBAcGFyYW0gbWV0YWRhdGFQYXJhbXMgLSBUaGUgbWV0YWRhdGFfcGFyYW1zIG9iamVjdCBmcm9tIFNlc3Npb25EYXRhXG4gKiBAcmV0dXJucyBPYmplY3QgbWFwcGluZyBtZXRyaWMgZ3JvdXAgSURzIHRvIHVuaXQgc3lzdGVtIElEc1xuICovXG5leHBvcnQgZnVuY3Rpb24gZXh0cmFjdFVuaXRQYXJhbXMoXG4gIG1ldGFkYXRhUGFyYW1zOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+XG4pOiBSZWNvcmQ8c3RyaW5nLCBVbml0U3lzdGVtSWQ+IHtcbiAgY29uc3QgcmVzdWx0OiBSZWNvcmQ8c3RyaW5nLCBVbml0U3lzdGVtSWQ+ID0ge307XG5cbiAgZm9yIChjb25zdCBba2V5LCB2YWx1ZV0gb2YgT2JqZWN0LmVudHJpZXMobWV0YWRhdGFQYXJhbXMpKSB7XG4gICAgY29uc3QgbWF0Y2ggPSBrZXkubWF0Y2goL15uZF8oW2EtejAtOV0rKSQvaSk7XG4gICAgaWYgKG1hdGNoKSB7XG4gICAgICBjb25zdCBncm91cEtleSA9IG1hdGNoWzFdLnRvTG93ZXJDYXNlKCk7XG4gICAgICByZXN1bHRbZ3JvdXBLZXldID0gdmFsdWUgYXMgVW5pdFN5c3RlbUlkO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZXN1bHQ7XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lIHRoZSB1bml0IHN5c3RlbSBJRCBmcm9tIG1ldGFkYXRhIHBhcmFtcy5cbiAqIFVzZXMgbmRfMDAxIGFzIHByaW1hcnksIGZhbGxzIGJhY2sgdG8gZGVmYXVsdC5cbiAqIFxuICogQHBhcmFtIG1ldGFkYXRhUGFyYW1zIC0gVGhlIG1ldGFkYXRhX3BhcmFtcyBvYmplY3RcbiAqIEByZXR1cm5zIFRoZSB1bml0IHN5c3RlbSBJRCBzdHJpbmdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFVuaXRTeXN0ZW1JZChcbiAgbWV0YWRhdGFQYXJhbXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz5cbik6IFVuaXRTeXN0ZW1JZCB7XG4gIGNvbnN0IHVuaXRQYXJhbXMgPSBleHRyYWN0VW5pdFBhcmFtcyhtZXRhZGF0YVBhcmFtcyk7XG4gIHJldHVybiB1bml0UGFyYW1zW1wiMDAxXCJdIHx8IFwiNzg5MDEyXCI7IC8vIERlZmF1bHQgdG8gSW1wZXJpYWxcbn1cblxuLyoqXG4gKiBHZXQgdGhlIGZ1bGwgdW5pdCBzeXN0ZW0gY29uZmlndXJhdGlvbi5cbiAqIFxuICogQHBhcmFtIG1ldGFkYXRhUGFyYW1zIC0gVGhlIG1ldGFkYXRhX3BhcmFtcyBvYmplY3RcbiAqIEByZXR1cm5zIFRoZSBVbml0U3lzdGVtIGNvbmZpZ3VyYXRpb25cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFVuaXRTeXN0ZW0oXG4gIG1ldGFkYXRhUGFyYW1zOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+XG4pOiBVbml0U3lzdGVtIHtcbiAgY29uc3QgaWQgPSBnZXRVbml0U3lzdGVtSWQobWV0YWRhdGFQYXJhbXMpO1xuICByZXR1cm4gVU5JVF9TWVNURU1TW2lkXSB8fCBERUZBVUxUX1VOSVRfU1lTVEVNO1xufVxuXG4vKipcbiAqIEdldCB0aGUgdW5pdCBzeXN0ZW0gcmVwcmVzZW50aW5nIHdoYXQgdGhlIEFQSSBhY3R1YWxseSByZXR1cm5zLlxuICogVGhlIEFQSSBhbHdheXMgcmV0dXJucyBzcGVlZCBpbiBtL3MgYW5kIGRpc3RhbmNlIGluIG1ldGVycyxcbiAqIGJ1dCB0aGUgYW5nbGUgdW5pdCBkZXBlbmRzIG9uIHRoZSByZXBvcnQncyBuZF8wMDEgcGFyYW1ldGVyLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0QXBpU291cmNlVW5pdFN5c3RlbShcbiAgbWV0YWRhdGFQYXJhbXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz5cbik6IFVuaXRTeXN0ZW0ge1xuICBjb25zdCByZXBvcnRTeXN0ZW0gPSBnZXRVbml0U3lzdGVtKG1ldGFkYXRhUGFyYW1zKTtcbiAgcmV0dXJuIHtcbiAgICBpZDogXCJhcGlcIiBhcyBVbml0U3lzdGVtSWQsXG4gICAgbmFtZTogXCJBUEkgU291cmNlXCIsXG4gICAgZGlzdGFuY2VVbml0OiBcIm1ldGVyc1wiLFxuICAgIGFuZ2xlVW5pdDogcmVwb3J0U3lzdGVtLmFuZ2xlVW5pdCxcbiAgICBzcGVlZFVuaXQ6IFwibS9zXCIsXG4gIH07XG59XG5cbi8qKlxuICogR2V0IHRoZSB1bml0IGxhYmVsIGZvciBhIG1ldHJpYyBiYXNlZCBvbiB1c2VyJ3MgdW5pdCBjaG9pY2UuXG4gKiBSZXR1cm5zIGVtcHR5IHN0cmluZyBmb3IgZGltZW5zaW9ubGVzcyBtZXRyaWNzIChlLmcuIFNtYXNoRmFjdG9yLCBTcGluUmF0ZSkuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRNZXRyaWNVbml0TGFiZWwoXG4gIG1ldHJpY05hbWU6IHN0cmluZyxcbiAgdW5pdENob2ljZTogVW5pdENob2ljZSA9IERFRkFVTFRfVU5JVF9DSE9JQ0Vcbik6IHN0cmluZyB7XG4gIGlmIChtZXRyaWNOYW1lIGluIEZJWEVEX1VOSVRfTEFCRUxTKSByZXR1cm4gRklYRURfVU5JVF9MQUJFTFNbbWV0cmljTmFtZV07XG4gIGlmIChTUEVFRF9NRVRSSUNTLmhhcyhtZXRyaWNOYW1lKSkgcmV0dXJuIFNQRUVEX0xBQkVMU1t1bml0Q2hvaWNlLnNwZWVkXTtcbiAgaWYgKERJU1RBTkNFX01FVFJJQ1MuaGFzKG1ldHJpY05hbWUpKSByZXR1cm4gRElTVEFOQ0VfTEFCRUxTW3VuaXRDaG9pY2UuZGlzdGFuY2VdO1xuICBpZiAoQU5HTEVfTUVUUklDUy5oYXMobWV0cmljTmFtZSkpIHJldHVybiBcIlx1MDBCMFwiO1xuICByZXR1cm4gXCJcIjtcbn1cblxuLyoqXG4gKiBDb252ZXJ0IGEgZGlzdGFuY2UgdmFsdWUgYmV0d2VlbiB1bml0cy5cbiAqIFxuICogQHBhcmFtIHZhbHVlIC0gVGhlIHZhbHVlIHRvIGNvbnZlcnRcbiAqIEBwYXJhbSBmcm9tVW5pdCAtIFNvdXJjZSB1bml0IChcInlhcmRzXCIgb3IgXCJtZXRlcnNcIilcbiAqIEBwYXJhbSB0b1VuaXQgLSBUYXJnZXQgdW5pdCAoXCJ5YXJkc1wiIG9yIFwibWV0ZXJzXCIpXG4gKiBAcmV0dXJucyBDb252ZXJ0ZWQgdmFsdWUsIG9yIG9yaWdpbmFsIGlmIHVuaXRzIG1hdGNoXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb252ZXJ0RGlzdGFuY2UoXG4gIHZhbHVlOiBudW1iZXIgfCBzdHJpbmcgfCBudWxsLFxuICBmcm9tVW5pdDogXCJ5YXJkc1wiIHwgXCJtZXRlcnNcIixcbiAgdG9Vbml0OiBcInlhcmRzXCIgfCBcIm1ldGVyc1wiXG4pOiBudW1iZXIgfCBzdHJpbmcgfCBudWxsIHtcbiAgaWYgKHZhbHVlID09PSBudWxsIHx8IHZhbHVlID09PSBcIlwiKSByZXR1cm4gdmFsdWU7XG5cbiAgY29uc3QgbnVtVmFsdWUgPSB0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCIgPyBwYXJzZUZsb2F0KHZhbHVlKSA6IHZhbHVlO1xuICBpZiAoaXNOYU4obnVtVmFsdWUpKSByZXR1cm4gdmFsdWU7XG5cbiAgaWYgKGZyb21Vbml0ID09PSB0b1VuaXQpIHJldHVybiBudW1WYWx1ZTtcblxuICAvLyBDb252ZXJ0IHRvIG1ldGVycyBmaXJzdCwgdGhlbiB0byB0YXJnZXQgdW5pdFxuICBjb25zdCBpbk1ldGVycyA9IGZyb21Vbml0ID09PSBcInlhcmRzXCIgPyBudW1WYWx1ZSAqIDAuOTE0NCA6IG51bVZhbHVlO1xuICByZXR1cm4gdG9Vbml0ID09PSBcInlhcmRzXCIgPyBpbk1ldGVycyAvIDAuOTE0NCA6IGluTWV0ZXJzO1xufVxuXG4vKipcbiAqIENvbnZlcnQgYW4gYW5nbGUgdmFsdWUgYmV0d2VlbiB1bml0cy5cbiAqIFxuICogQHBhcmFtIHZhbHVlIC0gVGhlIHZhbHVlIHRvIGNvbnZlcnRcbiAqIEBwYXJhbSBmcm9tVW5pdCAtIFNvdXJjZSB1bml0IChcImRlZ3JlZXNcIiBvciBcInJhZGlhbnNcIilcbiAqIEBwYXJhbSB0b1VuaXQgLSBUYXJnZXQgdW5pdCAoXCJkZWdyZWVzXCIgb3IgXCJyYWRpYW5zXCIpXG4gKiBAcmV0dXJucyBDb252ZXJ0ZWQgdmFsdWUsIG9yIG9yaWdpbmFsIGlmIHVuaXRzIG1hdGNoXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb252ZXJ0QW5nbGUoXG4gIHZhbHVlOiBudW1iZXIgfCBzdHJpbmcgfCBudWxsLFxuICBmcm9tVW5pdDogXCJkZWdyZWVzXCIgfCBcInJhZGlhbnNcIixcbiAgdG9Vbml0OiBcImRlZ3JlZXNcIiB8IFwicmFkaWFuc1wiXG4pOiBudW1iZXIgfCBzdHJpbmcgfCBudWxsIHtcbiAgaWYgKHZhbHVlID09PSBudWxsIHx8IHZhbHVlID09PSBcIlwiKSByZXR1cm4gdmFsdWU7XG5cbiAgY29uc3QgbnVtVmFsdWUgPSB0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCIgPyBwYXJzZUZsb2F0KHZhbHVlKSA6IHZhbHVlO1xuICBpZiAoaXNOYU4obnVtVmFsdWUpKSByZXR1cm4gdmFsdWU7XG5cbiAgaWYgKGZyb21Vbml0ID09PSB0b1VuaXQpIHJldHVybiBudW1WYWx1ZTtcblxuICAvLyBDb252ZXJ0IHRvIGRlZ3JlZXMgZmlyc3QsIHRoZW4gdG8gdGFyZ2V0IHVuaXRcbiAgY29uc3QgaW5EZWdyZWVzID0gZnJvbVVuaXQgPT09IFwiZGVncmVlc1wiID8gbnVtVmFsdWUgOiAobnVtVmFsdWUgKiAxODAgLyBNYXRoLlBJKTtcbiAgcmV0dXJuIHRvVW5pdCA9PT0gXCJkZWdyZWVzXCIgPyBpbkRlZ3JlZXMgOiAoaW5EZWdyZWVzICogTWF0aC5QSSAvIDE4MCk7XG59XG5cbi8qKlxuICogQ29udmVydCBhIHNwZWVkIHZhbHVlIGJldHdlZW4gdW5pdHMuXG4gKlxuICogQHBhcmFtIHZhbHVlIC0gVGhlIHZhbHVlIHRvIGNvbnZlcnRcbiAqIEBwYXJhbSBmcm9tVW5pdCAtIFNvdXJjZSB1bml0IChcIm1waFwiLCBcImttL2hcIiwgb3IgXCJtL3NcIilcbiAqIEBwYXJhbSB0b1VuaXQgLSBUYXJnZXQgdW5pdCAoXCJtcGhcIiwgXCJrbS9oXCIsIG9yIFwibS9zXCIpXG4gKiBAcmV0dXJucyBDb252ZXJ0ZWQgdmFsdWUsIG9yIG9yaWdpbmFsIGlmIHVuaXRzIG1hdGNoXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb252ZXJ0U3BlZWQoXG4gIHZhbHVlOiBudW1iZXIgfCBzdHJpbmcgfCBudWxsLFxuICBmcm9tVW5pdDogXCJtcGhcIiB8IFwia20vaFwiIHwgXCJtL3NcIixcbiAgdG9Vbml0OiBcIm1waFwiIHwgXCJrbS9oXCIgfCBcIm0vc1wiXG4pOiBudW1iZXIgfCBzdHJpbmcgfCBudWxsIHtcbiAgaWYgKHZhbHVlID09PSBudWxsIHx8IHZhbHVlID09PSBcIlwiKSByZXR1cm4gdmFsdWU7XG5cbiAgY29uc3QgbnVtVmFsdWUgPSB0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCIgPyBwYXJzZUZsb2F0KHZhbHVlKSA6IHZhbHVlO1xuICBpZiAoaXNOYU4obnVtVmFsdWUpKSByZXR1cm4gdmFsdWU7XG5cbiAgaWYgKGZyb21Vbml0ID09PSB0b1VuaXQpIHJldHVybiBudW1WYWx1ZTtcblxuICAvLyBDb252ZXJ0IHRvIG1waCBmaXJzdCwgdGhlbiB0byB0YXJnZXQgdW5pdFxuICBsZXQgaW5NcGg6IG51bWJlcjtcbiAgaWYgKGZyb21Vbml0ID09PSBcIm1waFwiKSBpbk1waCA9IG51bVZhbHVlO1xuICBlbHNlIGlmIChmcm9tVW5pdCA9PT0gXCJrbS9oXCIpIGluTXBoID0gbnVtVmFsdWUgLyAxLjYwOTM0NDtcbiAgZWxzZSBpbk1waCA9IG51bVZhbHVlICogMi4yMzY5NDsgLy8gbS9zIHRvIG1waFxuXG4gIGlmICh0b1VuaXQgPT09IFwibXBoXCIpIHJldHVybiBpbk1waDtcbiAgaWYgKHRvVW5pdCA9PT0gXCJrbS9oXCIpIHJldHVybiBpbk1waCAqIDEuNjA5MzQ0O1xuICByZXR1cm4gaW5NcGggLyAyLjIzNjk0OyAvLyBtcGggdG8gbS9zXG59XG5cbi8qKlxuICogTm9ybWFsaXplIGEgbWV0cmljIHZhbHVlIGJhc2VkIG9uIHVuaXQgc3lzdGVtIGFsaWdubWVudCBhbmQgdXNlcidzIHVuaXQgY2hvaWNlLlxuICpcbiAqIENvbnZlcnRzIHZhbHVlcyBmcm9tIHRoZSBzb3VyY2UgdW5pdHMgdG8gdGFyZ2V0IG91dHB1dCB1bml0czpcbiAqIC0gRGlzdGFuY2U6IHlhcmRzIG9yIG1ldGVycyAocGVyIHVuaXRDaG9pY2UuZGlzdGFuY2UpXG4gKiAtIEFuZ2xlczogYWx3YXlzIGRlZ3JlZXNcbiAqIC0gU3BlZWQ6IG1waCBvciBtL3MgKHBlciB1bml0Q2hvaWNlLnNwZWVkKVxuICpcbiAqIEBwYXJhbSB2YWx1ZSAtIFRoZSByYXcgbWV0cmljIHZhbHVlXG4gKiBAcGFyYW0gbWV0cmljTmFtZSAtIFRoZSBuYW1lIG9mIHRoZSBtZXRyaWMgYmVpbmcgbm9ybWFsaXplZFxuICogQHBhcmFtIHJlcG9ydFVuaXRTeXN0ZW0gLSBUaGUgdW5pdCBzeXN0ZW0gdXNlZCBpbiB0aGUgc291cmNlIGRhdGFcbiAqIEBwYXJhbSB1bml0Q2hvaWNlIC0gVXNlcidzIHVuaXQgY2hvaWNlIChkZWZhdWx0cyB0byBtcGggKyB5YXJkcylcbiAqIEByZXR1cm5zIE5vcm1hbGl6ZWQgdmFsdWUgYXMgbnVtYmVyIG9yIHN0cmluZyAobnVsbCBpZiBpbnZhbGlkKVxuICovXG5leHBvcnQgZnVuY3Rpb24gbm9ybWFsaXplTWV0cmljVmFsdWUoXG4gIHZhbHVlOiBNZXRyaWNWYWx1ZSxcbiAgbWV0cmljTmFtZTogc3RyaW5nLFxuICByZXBvcnRVbml0U3lzdGVtOiBVbml0U3lzdGVtLFxuICB1bml0Q2hvaWNlOiBVbml0Q2hvaWNlID0gREVGQVVMVF9VTklUX0NIT0lDRVxuKTogTWV0cmljVmFsdWUge1xuICBjb25zdCBudW1WYWx1ZSA9IHBhcnNlTnVtZXJpY1ZhbHVlKHZhbHVlKTtcbiAgaWYgKG51bVZhbHVlID09PSBudWxsKSByZXR1cm4gdmFsdWU7XG5cbiAgbGV0IGNvbnZlcnRlZDogbnVtYmVyO1xuXG4gIGlmIChESVNUQU5DRV9NRVRSSUNTLmhhcyhtZXRyaWNOYW1lKSkge1xuICAgIGNvbnZlcnRlZCA9IGNvbnZlcnREaXN0YW5jZShcbiAgICAgIG51bVZhbHVlLFxuICAgICAgcmVwb3J0VW5pdFN5c3RlbS5kaXN0YW5jZVVuaXQsXG4gICAgICB1bml0Q2hvaWNlLmRpc3RhbmNlXG4gICAgKSBhcyBudW1iZXI7XG4gIH0gZWxzZSBpZiAoQU5HTEVfTUVUUklDUy5oYXMobWV0cmljTmFtZSkpIHtcbiAgICBjb252ZXJ0ZWQgPSBjb252ZXJ0QW5nbGUoXG4gICAgICBudW1WYWx1ZSxcbiAgICAgIHJlcG9ydFVuaXRTeXN0ZW0uYW5nbGVVbml0LFxuICAgICAgXCJkZWdyZWVzXCJcbiAgICApIGFzIG51bWJlcjtcbiAgfSBlbHNlIGlmIChTUEVFRF9NRVRSSUNTLmhhcyhtZXRyaWNOYW1lKSkge1xuICAgIGNvbnZlcnRlZCA9IGNvbnZlcnRTcGVlZChcbiAgICAgIG51bVZhbHVlLFxuICAgICAgcmVwb3J0VW5pdFN5c3RlbS5zcGVlZFVuaXQsXG4gICAgICB1bml0Q2hvaWNlLnNwZWVkXG4gICAgKSBhcyBudW1iZXI7XG4gIH0gZWxzZSB7XG4gICAgLy8gTm8gY29udmVyc2lvbiBuZWVkZWQgZm9yIHRoaXMgbWV0cmljIHR5cGVcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cblxuICAvLyBSb3VuZCB0byAxIGRlY2ltYWwgcGxhY2UgZm9yIGNvbnNpc3RlbmN5XG4gIHJldHVybiBNYXRoLnJvdW5kKGNvbnZlcnRlZCAqIDEwKSAvIDEwO1xufVxuXG4vKipcbiAqIFBhcnNlIGEgbnVtZXJpYyB2YWx1ZSBmcm9tIE1ldHJpY1ZhbHVlIHR5cGUuXG4gKi9cbmZ1bmN0aW9uIHBhcnNlTnVtZXJpY1ZhbHVlKHZhbHVlOiBNZXRyaWNWYWx1ZSk6IG51bWJlciB8IG51bGwge1xuICBpZiAodmFsdWUgPT09IG51bGwgfHwgdmFsdWUgPT09IFwiXCIpIHJldHVybiBudWxsO1xuICBpZiAodHlwZW9mIHZhbHVlID09PSBcIm51bWJlclwiKSByZXR1cm4gaXNOYU4odmFsdWUpID8gbnVsbCA6IHZhbHVlO1xuICBcbiAgY29uc3QgcGFyc2VkID0gcGFyc2VGbG9hdCh2YWx1ZSk7XG4gIHJldHVybiBpc05hTihwYXJzZWQpID8gbnVsbCA6IHBhcnNlZDtcbn1cblxuZXhwb3J0IHR5cGUgTWV0cmljVmFsdWUgPSBzdHJpbmcgfCBudW1iZXIgfCBudWxsO1xuIiwgIi8qKlxuICogQ1NWIHdyaXRlciBmb3IgVHJhY2tQdWxsIHNlc3Npb24gZGF0YS5cbiAqIEltcGxlbWVudHMgY29yZSBjb2x1bW5zOiBEYXRlLCBDbHViLCBTaG90ICMsIFR5cGVcbiAqL1xuXG5pbXBvcnQgdHlwZSB7IFNlc3Npb25EYXRhLCBDbHViR3JvdXAsIFNob3QgfSBmcm9tIFwiLi4vbW9kZWxzL3R5cGVzXCI7XG5pbXBvcnQge1xuICBnZXRBcGlTb3VyY2VVbml0U3lzdGVtLFxuICBnZXRNZXRyaWNVbml0TGFiZWwsXG4gIG5vcm1hbGl6ZU1ldHJpY1ZhbHVlLFxuICBERUZBVUxUX1VOSVRfQ0hPSUNFLFxuICB0eXBlIFVuaXRDaG9pY2UsXG59IGZyb20gXCIuL3VuaXRfbm9ybWFsaXphdGlvblwiO1xuaW1wb3J0IHsgTUVUUklDX0RJU1BMQVlfTkFNRVMgfSBmcm9tIFwiLi9jb25zdGFudHNcIjtcblxuY29uc3QgTUVUUklDX0NPTFVNTl9PUkRFUjogc3RyaW5nW10gPSBbXG4gIC8vIFNwZWVkICYgRWZmaWNpZW5jeVxuICBcIkNsdWJTcGVlZFwiLCBcIkJhbGxTcGVlZFwiLCBcIlNtYXNoRmFjdG9yXCIsXG4gIC8vIENsdWIgRGVsaXZlcnlcbiAgXCJBdHRhY2tBbmdsZVwiLCBcIkNsdWJQYXRoXCIsIFwiRmFjZUFuZ2xlXCIsIFwiRmFjZVRvUGF0aFwiLCBcIlN3aW5nRGlyZWN0aW9uXCIsIFwiRHluYW1pY0xvZnRcIixcbiAgLy8gTGF1bmNoICYgU3BpblxuICBcIkxhdW5jaEFuZ2xlXCIsIFwiTGF1bmNoRGlyZWN0aW9uXCIsIFwiU3BpblJhdGVcIiwgXCJTcGluQXhpc1wiLCBcIlNwaW5Mb2Z0XCIsXG4gIC8vIERpc3RhbmNlXG4gIFwiQ2FycnlcIiwgXCJUb3RhbFwiLFxuICAvLyBEaXNwZXJzaW9uXG4gIFwiU2lkZVwiLCBcIlNpZGVUb3RhbFwiLCBcIkNhcnJ5U2lkZVwiLCBcIlRvdGFsU2lkZVwiLCBcIkN1cnZlXCIsXG4gIC8vIEJhbGwgRmxpZ2h0XG4gIFwiSGVpZ2h0XCIsIFwiTWF4SGVpZ2h0XCIsIFwiTGFuZGluZ0FuZ2xlXCIsIFwiSGFuZ1RpbWVcIixcbiAgLy8gSW1wYWN0XG4gIFwiTG93UG9pbnREaXN0YW5jZVwiLCBcIkltcGFjdEhlaWdodFwiLCBcIkltcGFjdE9mZnNldFwiLFxuICAvLyBPdGhlclxuICBcIlRlbXBvXCIsXG5dO1xuXG5mdW5jdGlvbiBnZXREaXNwbGF5TmFtZShtZXRyaWM6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBNRVRSSUNfRElTUExBWV9OQU1FU1ttZXRyaWNdID8/IG1ldHJpYztcbn1cblxuZnVuY3Rpb24gZ2V0Q29sdW1uTmFtZShtZXRyaWM6IHN0cmluZywgdW5pdENob2ljZTogVW5pdENob2ljZSk6IHN0cmluZyB7XG4gIGNvbnN0IGRpc3BsYXlOYW1lID0gZ2V0RGlzcGxheU5hbWUobWV0cmljKTtcbiAgY29uc3QgdW5pdExhYmVsID0gZ2V0TWV0cmljVW5pdExhYmVsKG1ldHJpYywgdW5pdENob2ljZSk7XG4gIHJldHVybiB1bml0TGFiZWwgPyBgJHtkaXNwbGF5TmFtZX0gKCR7dW5pdExhYmVsfSlgIDogZGlzcGxheU5hbWU7XG59XG5cbmZ1bmN0aW9uIGdlbmVyYXRlRmlsZW5hbWUoc2Vzc2lvbjogU2Vzc2lvbkRhdGEpOiBzdHJpbmcge1xuICByZXR1cm4gYFNob3REYXRhXyR7c2Vzc2lvbi5kYXRlfS5jc3ZgO1xufVxuXG5mdW5jdGlvbiBvcmRlck1ldHJpY3NCeVByaW9yaXR5KFxuICBhbGxNZXRyaWNzOiBzdHJpbmdbXSxcbiAgcHJpb3JpdHlPcmRlcjogc3RyaW5nW11cbik6IHN0cmluZ1tdIHtcbiAgY29uc3QgcmVzdWx0OiBzdHJpbmdbXSA9IFtdO1xuICBjb25zdCBzZWVuID0gbmV3IFNldDxzdHJpbmc+KCk7XG5cbiAgZm9yIChjb25zdCBtZXRyaWMgb2YgcHJpb3JpdHlPcmRlcikge1xuICAgIGlmIChhbGxNZXRyaWNzLmluY2x1ZGVzKG1ldHJpYykgJiYgIXNlZW4uaGFzKG1ldHJpYykpIHtcbiAgICAgIHJlc3VsdC5wdXNoKG1ldHJpYyk7XG4gICAgICBzZWVuLmFkZChtZXRyaWMpO1xuICAgIH1cbiAgfVxuXG4gIGZvciAoY29uc3QgbWV0cmljIG9mIGFsbE1ldHJpY3MpIHtcbiAgICBpZiAoIXNlZW4uaGFzKG1ldHJpYykpIHtcbiAgICAgIHJlc3VsdC5wdXNoKG1ldHJpYyk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gaGFzVGFncyhzZXNzaW9uOiBTZXNzaW9uRGF0YSk6IGJvb2xlYW4ge1xuICByZXR1cm4gc2Vzc2lvbi5jbHViX2dyb3Vwcy5zb21lKChjbHViKSA9PlxuICAgIGNsdWIuc2hvdHMuc29tZSgoc2hvdCkgPT4gc2hvdC50YWcgIT09IHVuZGVmaW5lZCAmJiBzaG90LnRhZyAhPT0gXCJcIilcbiAgKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHdyaXRlQ3N2KFxuICBzZXNzaW9uOiBTZXNzaW9uRGF0YSxcbiAgaW5jbHVkZUF2ZXJhZ2VzID0gdHJ1ZSxcbiAgbWV0cmljT3JkZXI/OiBzdHJpbmdbXSxcbiAgdW5pdENob2ljZTogVW5pdENob2ljZSA9IERFRkFVTFRfVU5JVF9DSE9JQ0Vcbik6IHN0cmluZyB7XG4gIGNvbnN0IG9yZGVyZWRNZXRyaWNzID0gb3JkZXJNZXRyaWNzQnlQcmlvcml0eShcbiAgICBzZXNzaW9uLm1ldHJpY19uYW1lcyxcbiAgICBtZXRyaWNPcmRlciA/PyBNRVRSSUNfQ09MVU1OX09SREVSXG4gICk7XG5cbiAgY29uc3QgaGVhZGVyUm93OiBzdHJpbmdbXSA9IFtcIkRhdGVcIiwgXCJDbHViXCJdO1xuXG4gIGlmIChoYXNUYWdzKHNlc3Npb24pKSB7XG4gICAgaGVhZGVyUm93LnB1c2goXCJUYWdcIik7XG4gIH1cblxuICBoZWFkZXJSb3cucHVzaChcIlNob3QgI1wiLCBcIlR5cGVcIik7XG5cbiAgZm9yIChjb25zdCBtZXRyaWMgb2Ygb3JkZXJlZE1ldHJpY3MpIHtcbiAgICBoZWFkZXJSb3cucHVzaChnZXRDb2x1bW5OYW1lKG1ldHJpYywgdW5pdENob2ljZSkpO1xuICB9XG5cbiAgY29uc3Qgcm93czogUmVjb3JkPHN0cmluZywgc3RyaW5nPltdID0gW107XG5cbiAgLy8gU291cmNlIHVuaXQgc3lzdGVtOiBBUEkgYWx3YXlzIHJldHVybnMgbS9zICsgbWV0ZXJzLCBhbmdsZSB1bml0IGZyb20gcmVwb3J0XG4gIGNvbnN0IHVuaXRTeXN0ZW0gPSBnZXRBcGlTb3VyY2VVbml0U3lzdGVtKHNlc3Npb24ubWV0YWRhdGFfcGFyYW1zKTtcblxuICBmb3IgKGNvbnN0IGNsdWIgb2Ygc2Vzc2lvbi5jbHViX2dyb3Vwcykge1xuICAgIGZvciAoY29uc3Qgc2hvdCBvZiBjbHViLnNob3RzKSB7XG4gICAgICBjb25zdCByb3c6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XG4gICAgICAgIERhdGU6IHNlc3Npb24uZGF0ZSxcbiAgICAgICAgQ2x1YjogY2x1Yi5jbHViX25hbWUsXG4gICAgICAgIFwiU2hvdCAjXCI6IFN0cmluZyhzaG90LnNob3RfbnVtYmVyICsgMSksXG4gICAgICAgIFR5cGU6IFwiU2hvdFwiLFxuICAgICAgfTtcblxuICAgICAgaWYgKGhhc1RhZ3Moc2Vzc2lvbikpIHtcbiAgICAgICAgcm93LlRhZyA9IHNob3QudGFnID8/IFwiXCI7XG4gICAgICB9XG5cbiAgICAgIGZvciAoY29uc3QgbWV0cmljIG9mIG9yZGVyZWRNZXRyaWNzKSB7XG4gICAgICAgIGNvbnN0IGNvbE5hbWUgPSBnZXRDb2x1bW5OYW1lKG1ldHJpYywgdW5pdENob2ljZSk7XG4gICAgICAgIGNvbnN0IHJhd1ZhbHVlID0gc2hvdC5tZXRyaWNzW21ldHJpY10gPz8gXCJcIjtcblxuICAgICAgICBpZiAodHlwZW9mIHJhd1ZhbHVlID09PSBcInN0cmluZ1wiIHx8IHR5cGVvZiByYXdWYWx1ZSA9PT0gXCJudW1iZXJcIikge1xuICAgICAgICAgIHJvd1tjb2xOYW1lXSA9IFN0cmluZyhub3JtYWxpemVNZXRyaWNWYWx1ZShyYXdWYWx1ZSwgbWV0cmljLCB1bml0U3lzdGVtLCB1bml0Q2hvaWNlKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcm93W2NvbE5hbWVdID0gXCJcIjtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByb3dzLnB1c2gocm93KTtcbiAgICB9XG5cbiAgICBpZiAoaW5jbHVkZUF2ZXJhZ2VzICYmIE9iamVjdC5rZXlzKGNsdWIuYXZlcmFnZXMpLmxlbmd0aCA+IDApIHtcbiAgICAgIGNvbnN0IGF2Z1JvdzogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcbiAgICAgICAgRGF0ZTogc2Vzc2lvbi5kYXRlLFxuICAgICAgICBDbHViOiBjbHViLmNsdWJfbmFtZSxcbiAgICAgICAgXCJTaG90ICNcIjogXCJcIixcbiAgICAgICAgVHlwZTogXCJBdmVyYWdlXCIsXG4gICAgICB9O1xuXG4gICAgICBpZiAoaGFzVGFncyhzZXNzaW9uKSkge1xuICAgICAgICBhdmdSb3cuVGFnID0gXCJcIjtcbiAgICAgIH1cblxuICAgICAgZm9yIChjb25zdCBtZXRyaWMgb2Ygb3JkZXJlZE1ldHJpY3MpIHtcbiAgICAgICAgY29uc3QgY29sTmFtZSA9IGdldENvbHVtbk5hbWUobWV0cmljLCB1bml0Q2hvaWNlKTtcbiAgICAgICAgY29uc3QgcmF3VmFsdWUgPSBjbHViLmF2ZXJhZ2VzW21ldHJpY10gPz8gXCJcIjtcblxuICAgICAgICBpZiAodHlwZW9mIHJhd1ZhbHVlID09PSBcInN0cmluZ1wiIHx8IHR5cGVvZiByYXdWYWx1ZSA9PT0gXCJudW1iZXJcIikge1xuICAgICAgICAgIGF2Z1Jvd1tjb2xOYW1lXSA9IFN0cmluZyhub3JtYWxpemVNZXRyaWNWYWx1ZShyYXdWYWx1ZSwgbWV0cmljLCB1bml0U3lzdGVtLCB1bml0Q2hvaWNlKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgYXZnUm93W2NvbE5hbWVdID0gXCJcIjtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByb3dzLnB1c2goYXZnUm93KTtcbiAgICB9XG5cbiAgICBpZiAoaW5jbHVkZUF2ZXJhZ2VzICYmIE9iamVjdC5rZXlzKGNsdWIuY29uc2lzdGVuY3kpLmxlbmd0aCA+IDApIHtcbiAgICAgIGNvbnN0IGNvbnNSb3c6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XG4gICAgICAgIERhdGU6IHNlc3Npb24uZGF0ZSxcbiAgICAgICAgQ2x1YjogY2x1Yi5jbHViX25hbWUsXG4gICAgICAgIFwiU2hvdCAjXCI6IFwiXCIsXG4gICAgICAgIFR5cGU6IFwiQ29uc2lzdGVuY3lcIixcbiAgICAgIH07XG5cbiAgICAgIGlmIChoYXNUYWdzKHNlc3Npb24pKSB7XG4gICAgICAgIGNvbnNSb3cuVGFnID0gXCJcIjtcbiAgICAgIH1cblxuICAgICAgZm9yIChjb25zdCBtZXRyaWMgb2Ygb3JkZXJlZE1ldHJpY3MpIHtcbiAgICAgICAgY29uc3QgY29sTmFtZSA9IGdldENvbHVtbk5hbWUobWV0cmljLCB1bml0Q2hvaWNlKTtcbiAgICAgICAgY29uc3QgcmF3VmFsdWUgPSBjbHViLmNvbnNpc3RlbmN5W21ldHJpY10gPz8gXCJcIjtcblxuICAgICAgICBpZiAodHlwZW9mIHJhd1ZhbHVlID09PSBcInN0cmluZ1wiIHx8IHR5cGVvZiByYXdWYWx1ZSA9PT0gXCJudW1iZXJcIikge1xuICAgICAgICAgIGNvbnNSb3dbY29sTmFtZV0gPSBTdHJpbmcobm9ybWFsaXplTWV0cmljVmFsdWUocmF3VmFsdWUsIG1ldHJpYywgdW5pdFN5c3RlbSwgdW5pdENob2ljZSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnNSb3dbY29sTmFtZV0gPSBcIlwiO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJvd3MucHVzaChjb25zUm93KTtcbiAgICB9XG4gIH1cblxuICBjb25zdCBjc3ZDb250ZW50ID0gW1xuICAgIGhlYWRlclJvdy5qb2luKFwiLFwiKSxcbiAgICAuLi5yb3dzLm1hcCgocm93KSA9PiB7XG4gICAgICByZXR1cm4gaGVhZGVyUm93XG4gICAgICAgIC5tYXAoKGNvbCkgPT4ge1xuICAgICAgICAgIGNvbnN0IHZhbHVlID0gcm93W2NvbF0gPz8gXCJcIjtcbiAgICAgICAgICBpZiAodmFsdWUuaW5jbHVkZXMoXCIsXCIpIHx8IHZhbHVlLmluY2x1ZGVzKCdcIicpIHx8IHZhbHVlLmluY2x1ZGVzKFwiXFxuXCIpKSB7XG4gICAgICAgICAgICByZXR1cm4gYFwiJHt2YWx1ZS5yZXBsYWNlKC9cIi9nLCAnXCJcIicpfVwiYDtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICB9KVxuICAgICAgICAuam9pbihcIixcIik7XG4gICAgfSksXG4gIF0uam9pbihcIlxcblwiKTtcblxuICByZXR1cm4gY3N2Q29udGVudDtcbn1cbiIsICIvKipcbiAqIFNlcnZpY2UgV29ya2VyIGZvciBUcmFja1B1bGwgQ2hyb21lIEV4dGVuc2lvblxuICovXG5cbmltcG9ydCB7IFNUT1JBR0VfS0VZUyB9IGZyb20gXCIuLi9zaGFyZWQvY29uc3RhbnRzXCI7XG5pbXBvcnQgeyB3cml0ZUNzdiB9IGZyb20gXCIuLi9zaGFyZWQvY3N2X3dyaXRlclwiO1xuaW1wb3J0IHR5cGUgeyBTZXNzaW9uRGF0YSB9IGZyb20gXCIuLi9tb2RlbHMvdHlwZXNcIjtcbmltcG9ydCB7IG1pZ3JhdGVMZWdhY3lQcmVmLCBERUZBVUxUX1VOSVRfQ0hPSUNFLCB0eXBlIFVuaXRDaG9pY2UsIHR5cGUgU3BlZWRVbml0LCB0eXBlIERpc3RhbmNlVW5pdCB9IGZyb20gXCIuLi9zaGFyZWQvdW5pdF9ub3JtYWxpemF0aW9uXCI7XG5cbmNocm9tZS5ydW50aW1lLm9uSW5zdGFsbGVkLmFkZExpc3RlbmVyKCgpID0+IHtcbiAgY29uc29sZS5sb2coXCJUcmFja1B1bGwgZXh0ZW5zaW9uIGluc3RhbGxlZFwiKTtcbn0pO1xuXG5pbnRlcmZhY2UgU2F2ZURhdGFSZXF1ZXN0IHtcbiAgdHlwZTogXCJTQVZFX0RBVEFcIjtcbiAgZGF0YTogU2Vzc2lvbkRhdGE7XG59XG5cbmludGVyZmFjZSBFeHBvcnRDc3ZSZXF1ZXN0IHtcbiAgdHlwZTogXCJFWFBPUlRfQ1NWX1JFUVVFU1RcIjtcbn1cblxuaW50ZXJmYWNlIEdldERhdGFSZXF1ZXN0IHtcbiAgdHlwZTogXCJHRVRfREFUQVwiO1xufVxuXG5mdW5jdGlvbiBnZXREb3dubG9hZEVycm9yTWVzc2FnZShvcmlnaW5hbEVycm9yOiBzdHJpbmcpOiBzdHJpbmcge1xuICBpZiAob3JpZ2luYWxFcnJvci5pbmNsdWRlcyhcImludmFsaWRcIikpIHtcbiAgICByZXR1cm4gXCJJbnZhbGlkIGRvd25sb2FkIGZvcm1hdFwiO1xuICB9XG4gIGlmIChvcmlnaW5hbEVycm9yLmluY2x1ZGVzKFwicXVvdGFcIikgfHwgb3JpZ2luYWxFcnJvci5pbmNsdWRlcyhcInNwYWNlXCIpKSB7XG4gICAgcmV0dXJuIFwiSW5zdWZmaWNpZW50IHN0b3JhZ2Ugc3BhY2VcIjtcbiAgfVxuICBpZiAob3JpZ2luYWxFcnJvci5pbmNsdWRlcyhcImJsb2NrZWRcIikgfHwgb3JpZ2luYWxFcnJvci5pbmNsdWRlcyhcInBvbGljeVwiKSkge1xuICAgIHJldHVybiBcIkRvd25sb2FkIGJsb2NrZWQgYnkgYnJvd3NlciBzZXR0aW5nc1wiO1xuICB9XG4gIHJldHVybiBvcmlnaW5hbEVycm9yO1xufVxuXG50eXBlIFJlcXVlc3RNZXNzYWdlID0gU2F2ZURhdGFSZXF1ZXN0IHwgRXhwb3J0Q3N2UmVxdWVzdCB8IEdldERhdGFSZXF1ZXN0O1xuXG5jaHJvbWUucnVudGltZS5vbk1lc3NhZ2UuYWRkTGlzdGVuZXIoKG1lc3NhZ2U6IFJlcXVlc3RNZXNzYWdlLCBzZW5kZXIsIHNlbmRSZXNwb25zZSkgPT4ge1xuICBpZiAobWVzc2FnZS50eXBlID09PSBcIkdFVF9EQVRBXCIpIHtcbiAgICBjaHJvbWUuc3RvcmFnZS5sb2NhbC5nZXQoW1NUT1JBR0VfS0VZUy5UUkFDS01BTl9EQVRBXSwgKHJlc3VsdCkgPT4ge1xuICAgICAgc2VuZFJlc3BvbnNlKHJlc3VsdFtTVE9SQUdFX0tFWVMuVFJBQ0tNQU5fREFUQV0gfHwgbnVsbCk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBpZiAobWVzc2FnZS50eXBlID09PSBcIlNBVkVfREFUQVwiKSB7XG4gICAgY29uc3Qgc2Vzc2lvbkRhdGEgPSAobWVzc2FnZSBhcyBTYXZlRGF0YVJlcXVlc3QpLmRhdGE7XG4gICAgY2hyb21lLnN0b3JhZ2UubG9jYWwuc2V0KHsgW1NUT1JBR0VfS0VZUy5UUkFDS01BTl9EQVRBXTogc2Vzc2lvbkRhdGEgfSwgKCkgPT4ge1xuICAgICAgaWYgKGNocm9tZS5ydW50aW1lLmxhc3RFcnJvcikge1xuICAgICAgICBjb25zb2xlLmVycm9yKFwiVHJhY2tQdWxsOiBGYWlsZWQgdG8gc2F2ZSBkYXRhOlwiLCBjaHJvbWUucnVudGltZS5sYXN0RXJyb3IpO1xuICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGNocm9tZS5ydW50aW1lLmxhc3RFcnJvci5tZXNzYWdlIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJUcmFja1B1bGw6IFNlc3Npb24gZGF0YSBzYXZlZCB0byBzdG9yYWdlXCIpO1xuICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiB0cnVlIH0pO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgaWYgKG1lc3NhZ2UudHlwZSA9PT0gXCJFWFBPUlRfQ1NWX1JFUVVFU1RcIikge1xuICAgIGNocm9tZS5zdG9yYWdlLmxvY2FsLmdldChbU1RPUkFHRV9LRVlTLlRSQUNLTUFOX0RBVEEsIFNUT1JBR0VfS0VZUy5TUEVFRF9VTklULCBTVE9SQUdFX0tFWVMuRElTVEFOQ0VfVU5JVCwgXCJ1bml0UHJlZmVyZW5jZVwiXSwgKHJlc3VsdCkgPT4ge1xuICAgICAgY29uc3QgZGF0YSA9IHJlc3VsdFtTVE9SQUdFX0tFWVMuVFJBQ0tNQU5fREFUQV0gYXMgU2Vzc2lvbkRhdGEgfCB1bmRlZmluZWQ7XG4gICAgICBpZiAoIWRhdGEgfHwgIWRhdGEuY2x1Yl9ncm91cHMgfHwgZGF0YS5jbHViX2dyb3Vwcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBcIk5vIGRhdGEgdG8gZXhwb3J0XCIgfSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdHJ5IHtcbiAgICAgICAgbGV0IHVuaXRDaG9pY2U6IFVuaXRDaG9pY2U7XG4gICAgICAgIGlmIChyZXN1bHRbU1RPUkFHRV9LRVlTLlNQRUVEX1VOSVRdICYmIHJlc3VsdFtTVE9SQUdFX0tFWVMuRElTVEFOQ0VfVU5JVF0pIHtcbiAgICAgICAgICB1bml0Q2hvaWNlID0ge1xuICAgICAgICAgICAgc3BlZWQ6IHJlc3VsdFtTVE9SQUdFX0tFWVMuU1BFRURfVU5JVF0gYXMgU3BlZWRVbml0LFxuICAgICAgICAgICAgZGlzdGFuY2U6IHJlc3VsdFtTVE9SQUdFX0tFWVMuRElTVEFOQ0VfVU5JVF0gYXMgRGlzdGFuY2VVbml0LFxuICAgICAgICAgIH07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdW5pdENob2ljZSA9IG1pZ3JhdGVMZWdhY3lQcmVmKHJlc3VsdFtcInVuaXRQcmVmZXJlbmNlXCJdIGFzIHN0cmluZyB8IHVuZGVmaW5lZCk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgY3N2Q29udGVudCA9IHdyaXRlQ3N2KGRhdGEsIHRydWUsIHVuZGVmaW5lZCwgdW5pdENob2ljZSk7XG4gICAgICAgIGNvbnN0IGZpbGVuYW1lID0gYFNob3REYXRhXyR7ZGF0YS5kYXRlIHx8IFwidW5rbm93blwifS5jc3ZgO1xuXG4gICAgICAgIGNocm9tZS5kb3dubG9hZHMuZG93bmxvYWQoXG4gICAgICAgICAge1xuICAgICAgICAgICAgdXJsOiBgZGF0YTp0ZXh0L2NzdjtjaGFyc2V0PXV0Zi04LCR7ZW5jb2RlVVJJQ29tcG9uZW50KGNzdkNvbnRlbnQpfWAsXG4gICAgICAgICAgICBmaWxlbmFtZTogZmlsZW5hbWUsXG4gICAgICAgICAgICBzYXZlQXM6IGZhbHNlLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgKGRvd25sb2FkSWQpID0+IHtcbiAgICAgICAgICAgIGlmIChjaHJvbWUucnVudGltZS5sYXN0RXJyb3IpIHtcbiAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIlRyYWNrUHVsbDogRG93bmxvYWQgZmFpbGVkOlwiLCBjaHJvbWUucnVudGltZS5sYXN0RXJyb3IpO1xuICAgICAgICAgICAgICBjb25zdCBlcnJvck1lc3NhZ2UgPSBnZXREb3dubG9hZEVycm9yTWVzc2FnZShjaHJvbWUucnVudGltZS5sYXN0RXJyb3IubWVzc2FnZSk7XG4gICAgICAgICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3JNZXNzYWdlIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coYFRyYWNrUHVsbDogQ1NWIGV4cG9ydGVkIHdpdGggZG93bmxvYWQgSUQgJHtkb3dubG9hZElkfWApO1xuICAgICAgICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiB0cnVlLCBkb3dubG9hZElkLCBmaWxlbmFtZSB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBjb25zb2xlLmVycm9yKFwiVHJhY2tQdWxsOiBDU1YgZ2VuZXJhdGlvbiBmYWlsZWQ6XCIsIGVycm9yKTtcbiAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcikgfSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbn0pO1xuXG5jaHJvbWUuc3RvcmFnZS5vbkNoYW5nZWQuYWRkTGlzdGVuZXIoKGNoYW5nZXMsIG5hbWVzcGFjZSkgPT4ge1xuICBpZiAobmFtZXNwYWNlID09PSBcImxvY2FsXCIgJiYgY2hhbmdlc1tTVE9SQUdFX0tFWVMuVFJBQ0tNQU5fREFUQV0pIHtcbiAgICBjb25zdCBuZXdWYWx1ZSA9IGNoYW5nZXNbU1RPUkFHRV9LRVlTLlRSQUNLTUFOX0RBVEFdLm5ld1ZhbHVlO1xuICAgIGNocm9tZS5ydW50aW1lLnNlbmRNZXNzYWdlKHsgdHlwZTogXCJEQVRBX1VQREFURURcIiwgZGF0YTogbmV3VmFsdWUgfSkuY2F0Y2goKCkgPT4ge1xuICAgICAgLy8gSWdub3JlIGVycm9ycyB3aGVuIG5vIHBvcHVwIGlzIGxpc3RlbmluZ1xuICAgIH0pO1xuICB9XG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7QUFBQSxNQTRFYSxzQkE4REE7QUExSWI7QUFBQTtBQTRFTyxNQUFNLHVCQUErQztBQUFBLFFBQzFELFdBQVc7QUFBQSxRQUNYLFdBQVc7QUFBQSxRQUNYLGFBQWE7QUFBQSxRQUNiLGFBQWE7QUFBQSxRQUNiLFVBQVU7QUFBQSxRQUNWLFdBQVc7QUFBQSxRQUNYLFlBQVk7QUFBQSxRQUNaLGdCQUFnQjtBQUFBLFFBQ2hCLGFBQWE7QUFBQSxRQUNiLFVBQVU7QUFBQSxRQUNWLFVBQVU7QUFBQSxRQUNWLFVB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
