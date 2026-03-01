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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL3NoYXJlZC9jb25zdGFudHMudHMiLCAiLi4vc3JjL3NoYXJlZC91bml0X25vcm1hbGl6YXRpb24udHMiLCAiLi4vc3JjL3NoYXJlZC9jc3Zfd3JpdGVyLnRzIiwgIi4uL3NyYy9iYWNrZ3JvdW5kL3NlcnZpY2VXb3JrZXIudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbIi8qKlxuICogU2hhcmVkIGNvbnN0YW50cyBpbmNsdWRpbmcgQ1NTIHNlbGVjdG9ycyBhbmQgY29uZmlndXJhdGlvbi5cbiAqIEJhc2VkIG9uIFB5dGhvbiBzY3JhcGVyIGNvbnN0YW50cy5weSBpbXBsZW1lbnRhdGlvbi5cbiAqL1xuXG4vLyBDb21wbGV0ZSBsaXN0IG9mIGFsbCBrbm93biBUcmFja21hbiBtZXRyaWNzIChVUkwgcGFyYW1ldGVyIG5hbWVzKVxuZXhwb3J0IGNvbnN0IEFMTF9NRVRSSUNTID0gW1xuICBcIkNsdWJTcGVlZFwiLFxuICBcIkJhbGxTcGVlZFwiLFxuICBcIlNtYXNoRmFjdG9yXCIsXG4gIFwiQXR0YWNrQW5nbGVcIixcbiAgXCJDbHViUGF0aFwiLFxuICBcIkZhY2VBbmdsZVwiLFxuICBcIkZhY2VUb1BhdGhcIixcbiAgXCJTd2luZ0RpcmVjdGlvblwiLFxuICBcIkR5bmFtaWNMb2Z0XCIsXG4gIFwiU3BpblJhdGVcIixcbiAgXCJTcGluQXhpc1wiLFxuICBcIlNwaW5Mb2Z0XCIsXG4gIFwiTGF1bmNoQW5nbGVcIixcbiAgXCJMYXVuY2hEaXJlY3Rpb25cIixcbiAgXCJDYXJyeVwiLFxuICBcIlRvdGFsXCIsXG4gIFwiU2lkZVwiLFxuICBcIlNpZGVUb3RhbFwiLFxuICBcIkNhcnJ5U2lkZVwiLFxuICBcIlRvdGFsU2lkZVwiLFxuICBcIkhlaWdodFwiLFxuICBcIk1heEhlaWdodFwiLFxuICBcIkN1cnZlXCIsXG4gIFwiTGFuZGluZ0FuZ2xlXCIsXG4gIFwiSGFuZ1RpbWVcIixcbiAgXCJMb3dQb2ludERpc3RhbmNlXCIsXG4gIFwiSW1wYWN0SGVpZ2h0XCIsXG4gIFwiSW1wYWN0T2Zmc2V0XCIsXG4gIFwiVGVtcG9cIixcbl0gYXMgY29uc3Q7XG5cbi8vIE1ldHJpY3Mgc3BsaXQgaW50byBncm91cHMgZm9yIG11bHRpLXBhZ2UtbG9hZCBIVE1MIGZhbGxiYWNrXG5leHBvcnQgY29uc3QgTUVUUklDX0dST1VQUyA9IFtcbiAgW1xuICAgIFwiQ2x1YlNwZWVkXCIsXG4gICAgXCJCYWxsU3BlZWRcIixcbiAgICBcIlNtYXNoRmFjdG9yXCIsXG4gICAgXCJBdHRhY2tBbmdsZVwiLFxuICAgIFwiQ2x1YlBhdGhcIixcbiAgICBcIkZhY2VBbmdsZVwiLFxuICAgIFwiRmFjZVRvUGF0aFwiLFxuICAgIFwiU3dpbmdEaXJlY3Rpb25cIixcbiAgICBcIkR5bmFtaWNMb2Z0XCIsXG4gICAgXCJTcGluTG9mdFwiLFxuICBdLFxuICBbXG4gICAgXCJTcGluUmF0ZVwiLFxuICAgIFwiU3BpbkF4aXNcIixcbiAgICBcIkxhdW5jaEFuZ2xlXCIsXG4gICAgXCJMYXVuY2hEaXJlY3Rpb25cIixcbiAgICBcIkNhcnJ5XCIsXG4gICAgXCJUb3RhbFwiLFxuICAgIFwiU2lkZVwiLFxuICAgIFwiU2lkZVRvdGFsXCIsXG4gICAgXCJDYXJyeVNpZGVcIixcbiAgICBcIlRvdGFsU2lkZVwiLFxuICAgIFwiSGVpZ2h0XCIsXG4gICAgXCJNYXhIZWlnaHRcIixcbiAgICBcIkN1cnZlXCIsXG4gICAgXCJMYW5kaW5nQW5nbGVcIixcbiAgICBcIkhhbmdUaW1lXCIsXG4gICAgXCJMb3dQb2ludERpc3RhbmNlXCIsXG4gICAgXCJJbXBhY3RIZWlnaHRcIixcbiAgICBcIkltcGFjdE9mZnNldFwiLFxuICAgIFwiVGVtcG9cIixcbiAgXSxcbl0gYXMgY29uc3Q7XG5cbi8vIERpc3BsYXkgbmFtZXM6IFVSTCBwYXJhbSBuYW1lIC0+IGh1bWFuLXJlYWRhYmxlIENTViBoZWFkZXJcbmV4cG9ydCBjb25zdCBNRVRSSUNfRElTUExBWV9OQU1FUzogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcbiAgQ2x1YlNwZWVkOiBcIkNsdWIgU3BlZWRcIixcbiAgQmFsbFNwZWVkOiBcIkJhbGwgU3BlZWRcIixcbiAgU21hc2hGYWN0b3I6IFwiU21hc2ggRmFjdG9yXCIsXG4gIEF0dGFja0FuZ2xlOiBcIkF0dGFjayBBbmdsZVwiLFxuICBDbHViUGF0aDogXCJDbHViIFBhdGhcIixcbiAgRmFjZUFuZ2xlOiBcIkZhY2UgQW5nbGVcIixcbiAgRmFjZVRvUGF0aDogXCJGYWNlIFRvIFBhdGhcIixcbiAgU3dpbmdEaXJlY3Rpb246IFwiU3dpbmcgRGlyZWN0aW9uXCIsXG4gIER5bmFtaWNMb2Z0OiBcIkR5bmFtaWMgTG9mdFwiLFxuICBTcGluUmF0ZTogXCJTcGluIFJhdGVcIixcbiAgU3BpbkF4aXM6IFwiU3BpbiBBeGlzXCIsXG4gIFNwaW5Mb2Z0OiBcIlNwaW4gTG9mdFwiLFxuICBMYXVuY2hBbmdsZTogXCJMYXVuY2ggQW5nbGVcIixcbiAgTGF1bmNoRGlyZWN0aW9uOiBcIkxhdW5jaCBEaXJlY3Rpb25cIixcbiAgQ2Fycnk6IFwiQ2FycnlcIixcbiAgVG90YWw6IFwiVG90YWxcIixcbiAgU2lkZTogXCJTaWRlXCIsXG4gIFNpZGVUb3RhbDogXCJTaWRlIFRvdGFsXCIsXG4gIENhcnJ5U2lkZTogXCJDYXJyeSBTaWRlXCIsXG4gIFRvdGFsU2lkZTogXCJUb3RhbCBTaWRlXCIsXG4gIEhlaWdodDogXCJIZWlnaHRcIixcbiAgTWF4SGVpZ2h0OiBcIk1heCBIZWlnaHRcIixcbiAgQ3VydmU6IFwiQ3VydmVcIixcbiAgTGFuZGluZ0FuZ2xlOiBcIkxhbmRpbmcgQW5nbGVcIixcbiAgSGFuZ1RpbWU6IFwiSGFuZyBUaW1lXCIsXG4gIExvd1BvaW50RGlzdGFuY2U6IFwiTG93IFBvaW50XCIsXG4gIEltcGFjdEhlaWdodDogXCJJbXBhY3QgSGVpZ2h0XCIsXG4gIEltcGFjdE9mZnNldDogXCJJbXBhY3QgT2Zmc2V0XCIsXG4gIFRlbXBvOiBcIlRlbXBvXCIsXG59O1xuXG4vLyBDU1MgY2xhc3Mgc2VsZWN0b3JzIChmcm9tIFRyYWNrbWFuJ3MgcmVuZGVyZWQgSFRNTClcbmV4cG9ydCBjb25zdCBDU1NfREFURSA9IFwiZGF0ZVwiO1xuZXhwb3J0IGNvbnN0IENTU19SRVNVTFRTX1dSQVBQRVIgPSBcInBsYXllci1hbmQtcmVzdWx0cy10YWJsZS13cmFwcGVyXCI7XG5leHBvcnQgY29uc3QgQ1NTX1JFU1VMVFNfVEFCTEUgPSBcIlJlc3VsdHNUYWJsZVwiO1xuZXhwb3J0IGNvbnN0IENTU19DTFVCX1RBRyA9IFwiZ3JvdXAtdGFnXCI7XG5leHBvcnQgY29uc3QgQ1NTX1BBUkFNX05BTUVTX1JPVyA9IFwicGFyYW1ldGVyLW5hbWVzLXJvd1wiO1xuZXhwb3J0IGNvbnN0IENTU19QQVJBTV9OQU1FID0gXCJwYXJhbWV0ZXItbmFtZVwiO1xuZXhwb3J0IGNvbnN0IENTU19TSE9UX0RFVEFJTF9ST1cgPSBcInJvdy13aXRoLXNob3QtZGV0YWlsc1wiO1xuZXhwb3J0IGNvbnN0IENTU19BVkVSQUdFX1ZBTFVFUyA9IFwiYXZlcmFnZS12YWx1ZXNcIjtcbmV4cG9ydCBjb25zdCBDU1NfQ09OU0lTVEVOQ1lfVkFMVUVTID0gXCJjb25zaXN0ZW5jeS12YWx1ZXNcIjtcblxuLy8gQVBJIFVSTCBwYXR0ZXJucyB0aGF0IGxpa2VseSBpbmRpY2F0ZSBhbiBBUEkgZGF0YSByZXNwb25zZVxuZXhwb3J0IGNvbnN0IEFQSV9VUkxfUEFUVEVSTlMgPSBbXG4gIFwiYXBpLnRyYWNrbWFuZ29sZi5jb21cIixcbiAgXCJ0cmFja21hbmdvbGYuY29tL2FwaVwiLFxuICBcIi9hcGkvXCIsXG4gIFwiL3JlcG9ydHMvXCIsXG4gIFwiL2FjdGl2aXRpZXMvXCIsXG4gIFwiL3Nob3RzL1wiLFxuICBcImdyYXBocWxcIixcbl07XG5cbi8vIFRpbWVvdXRzIChtaWxsaXNlY29uZHMpXG5leHBvcnQgY29uc3QgUEFHRV9MT0FEX1RJTUVPVVQgPSAzMF8wMDA7XG5leHBvcnQgY29uc3QgREFUQV9MT0FEX1RJTUVPVVQgPSAxNV8wMDA7XG5cbi8vIFRyYWNrbWFuIGJhc2UgVVJMXG5leHBvcnQgY29uc3QgQkFTRV9VUkwgPSBcImh0dHBzOi8vd2ViLWR5bmFtaWMtcmVwb3J0cy50cmFja21hbmdvbGYuY29tL1wiO1xuXG4vLyBTdG9yYWdlIGtleXMgZm9yIENocm9tZSBleHRlbnNpb24gKGFsaWduZWQgYmV0d2VlbiBiYWNrZ3JvdW5kIGFuZCBwb3B1cClcbmV4cG9ydCBjb25zdCBTVE9SQUdFX0tFWVMgPSB7XG4gIFRSQUNLTUFOX0RBVEE6IFwidHJhY2ttYW5EYXRhXCIsXG4gIFNQRUVEX1VOSVQ6IFwic3BlZWRVbml0XCIsXG4gIERJU1RBTkNFX1VOSVQ6IFwiZGlzdGFuY2VVbml0XCIsXG59IGFzIGNvbnN0O1xuIiwgIi8qKlxuICogVW5pdCBub3JtYWxpemF0aW9uIHV0aWxpdGllcyBmb3IgVHJhY2ttYW4gbWVhc3VyZW1lbnRzLlxuICogXG4gKiBUcmFja21hbiB1c2VzIG5kXyogcGFyYW1ldGVycyB0byBzcGVjaWZ5IHVuaXRzOlxuICogLSBuZF8wMDEsIG5kXzAwMiwgZXRjLiBkZWZpbmUgdW5pdCBzeXN0ZW1zIGZvciBkaWZmZXJlbnQgbWVhc3VyZW1lbnQgZ3JvdXBzXG4gKiAtIENvbW1vbiB2YWx1ZXM6IDc4OTAxMiA9IHlhcmRzL2RlZ3JlZXMsIDc4OTAxMyA9IG1ldGVycy9yYWRpYW5zXG4gKi9cblxuZXhwb3J0IHR5cGUgVW5pdFN5c3RlbUlkID0gXCI3ODkwMTJcIiB8IFwiNzg5MDEzXCIgfCBcIjc4OTAxNFwiIHwgc3RyaW5nO1xuXG5leHBvcnQgdHlwZSBTcGVlZFVuaXQgPSBcIm1waFwiIHwgXCJtL3NcIjtcbmV4cG9ydCB0eXBlIERpc3RhbmNlVW5pdCA9IFwieWFyZHNcIiB8IFwibWV0ZXJzXCI7XG5leHBvcnQgdHlwZSBTbWFsbERpc3RhbmNlVW5pdCA9IFwiaW5jaGVzXCIgfCBcImNtXCI7XG5leHBvcnQgaW50ZXJmYWNlIFVuaXRDaG9pY2UgeyBzcGVlZDogU3BlZWRVbml0OyBkaXN0YW5jZTogRGlzdGFuY2VVbml0IH1cbmV4cG9ydCBjb25zdCBERUZBVUxUX1VOSVRfQ0hPSUNFOiBVbml0Q2hvaWNlID0geyBzcGVlZDogXCJtcGhcIiwgZGlzdGFuY2U6IFwieWFyZHNcIiB9O1xuXG4vKipcbiAqIFRyYWNrbWFuIHVuaXQgc3lzdGVtIGRlZmluaXRpb25zLlxuICogTWFwcyBuZF8qIHBhcmFtZXRlciB2YWx1ZXMgdG8gYWN0dWFsIHVuaXRzIGZvciBlYWNoIG1ldHJpYy5cbiAqL1xuZXhwb3J0IGNvbnN0IFVOSVRfU1lTVEVNUzogUmVjb3JkPFVuaXRTeXN0ZW1JZCwgVW5pdFN5c3RlbT4gPSB7XG4gIC8vIEltcGVyaWFsICh5YXJkcywgZGVncmVlcykgLSBtb3N0IGNvbW1vblxuICBcIjc4OTAxMlwiOiB7XG4gICAgaWQ6IFwiNzg5MDEyXCIsXG4gICAgbmFtZTogXCJJbXBlcmlhbFwiLFxuICAgIGRpc3RhbmNlVW5pdDogXCJ5YXJkc1wiLFxuICAgIGFuZ2xlVW5pdDogXCJkZWdyZWVzXCIsXG4gICAgc3BlZWRVbml0OiBcIm1waFwiLFxuICB9LFxuICAvLyBNZXRyaWMgKG1ldGVycywgcmFkaWFucylcbiAgXCI3ODkwMTNcIjoge1xuICAgIGlkOiBcIjc4OTAxM1wiLFxuICAgIG5hbWU6IFwiTWV0cmljIChyYWQpXCIsXG4gICAgZGlzdGFuY2VVbml0OiBcIm1ldGVyc1wiLFxuICAgIGFuZ2xlVW5pdDogXCJyYWRpYW5zXCIsXG4gICAgc3BlZWRVbml0OiBcImttL2hcIixcbiAgfSxcbiAgLy8gTWV0cmljIChtZXRlcnMsIGRlZ3JlZXMpIC0gbGVzcyBjb21tb25cbiAgXCI3ODkwMTRcIjoge1xuICAgIGlkOiBcIjc4OTAxNFwiLFxuICAgIG5hbWU6IFwiTWV0cmljIChkZWcpXCIsXG4gICAgZGlzdGFuY2VVbml0OiBcIm1ldGVyc1wiLFxuICAgIGFuZ2xlVW5pdDogXCJkZWdyZWVzXCIsXG4gICAgc3BlZWRVbml0OiBcImttL2hcIixcbiAgfSxcbn07XG5cbi8qKlxuICogVW5pdCBzeXN0ZW0gY29uZmlndXJhdGlvbi5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBVbml0U3lzdGVtIHtcbiAgaWQ6IFVuaXRTeXN0ZW1JZDtcbiAgbmFtZTogc3RyaW5nO1xuICBkaXN0YW5jZVVuaXQ6IFwieWFyZHNcIiB8IFwibWV0ZXJzXCI7XG4gIGFuZ2xlVW5pdDogXCJkZWdyZWVzXCIgfCBcInJhZGlhbnNcIjtcbiAgc3BlZWRVbml0OiBcIm1waFwiIHwgXCJrbS9oXCIgfCBcIm0vc1wiO1xufVxuXG4vKipcbiAqIE1ldHJpY3MgdGhhdCB1c2UgZGlzdGFuY2UgdW5pdHMuXG4gKi9cbmV4cG9ydCBjb25zdCBESVNUQU5DRV9NRVRSSUNTID0gbmV3IFNldChbXG4gIFwiQ2FycnlcIixcbiAgXCJUb3RhbFwiLFxuICBcIlNpZGVcIixcbiAgXCJTaWRlVG90YWxcIixcbiAgXCJDYXJyeVNpZGVcIixcbiAgXCJUb3RhbFNpZGVcIixcbiAgXCJIZWlnaHRcIixcbiAgXCJNYXhIZWlnaHRcIixcbiAgXCJDdXJ2ZVwiLFxuXSk7XG5cbi8qKlxuICogTWV0cmljcyB0aGF0IHVzZSBzbWFsbCBkaXN0YW5jZSB1bml0cyAoaW5jaGVzL2NtKS5cbiAqIFRoZXNlIHZhbHVlcyBjb21lIGZyb20gdGhlIEFQSSBpbiBtZXRlcnMgYnV0IGFyZSB0b28gc21hbGwgZm9yIHlhcmRzL21ldGVycy5cbiAqL1xuZXhwb3J0IGNvbnN0IFNNQUxMX0RJU1RBTkNFX01FVFJJQ1MgPSBuZXcgU2V0KFtcbiAgXCJMb3dQb2ludERpc3RhbmNlXCIsXG5dKTtcblxuLyoqXG4gKiBNZXRyaWNzIHRoYXQgdXNlIGFuZ2xlIHVuaXRzLlxuICovXG5leHBvcnQgY29uc3QgQU5HTEVfTUVUUklDUyA9IG5ldyBTZXQoW1xuICBcIkF0dGFja0FuZ2xlXCIsXG4gIFwiQ2x1YlBhdGhcIixcbiAgXCJGYWNlQW5nbGVcIixcbiAgXCJGYWNlVG9QYXRoXCIsXG4gIFwiRHluYW1pY0xvZnRcIixcbiAgXCJMYXVuY2hBbmdsZVwiLFxuICBcIkxhdW5jaERpcmVjdGlvblwiLFxuICBcIkxhbmRpbmdBbmdsZVwiLFxuXSk7XG5cbi8qKlxuICogTWV0cmljcyB0aGF0IHVzZSBzcGVlZCB1bml0cy5cbiAqL1xuZXhwb3J0IGNvbnN0IFNQRUVEX01FVFJJQ1MgPSBuZXcgU2V0KFtcbiAgXCJDbHViU3BlZWRcIixcbiAgXCJCYWxsU3BlZWRcIixcbiAgXCJUZW1wb1wiLFxuXSk7XG5cbi8qKlxuICogRGVmYXVsdCB1bml0IHN5c3RlbSAoSW1wZXJpYWwgLSB5YXJkcy9kZWdyZWVzKS5cbiAqL1xuZXhwb3J0IGNvbnN0IERFRkFVTFRfVU5JVF9TWVNURU06IFVuaXRTeXN0ZW0gPSBVTklUX1NZU1RFTVNbXCI3ODkwMTJcIl07XG5cbi8qKlxuICogU3BlZWQgdW5pdCBkaXNwbGF5IGxhYmVscyBmb3IgQ1NWIGhlYWRlcnMuXG4gKi9cbmV4cG9ydCBjb25zdCBTUEVFRF9MQUJFTFM6IFJlY29yZDxTcGVlZFVuaXQsIHN0cmluZz4gPSB7XG4gIFwibXBoXCI6IFwibXBoXCIsXG4gIFwibS9zXCI6IFwibS9zXCIsXG59O1xuXG4vKipcbiAqIERpc3RhbmNlIHVuaXQgZGlzcGxheSBsYWJlbHMgZm9yIENTViBoZWFkZXJzLlxuICovXG5leHBvcnQgY29uc3QgRElTVEFOQ0VfTEFCRUxTOiBSZWNvcmQ8RGlzdGFuY2VVbml0LCBzdHJpbmc+ID0ge1xuICBcInlhcmRzXCI6IFwieWRzXCIsXG4gIFwibWV0ZXJzXCI6IFwibVwiLFxufTtcblxuLyoqXG4gKiBTbWFsbCBkaXN0YW5jZSB1bml0IGRpc3BsYXkgbGFiZWxzIGZvciBDU1YgaGVhZGVycy5cbiAqL1xuZXhwb3J0IGNvbnN0IFNNQUxMX0RJU1RBTkNFX0xBQkVMUzogUmVjb3JkPFNtYWxsRGlzdGFuY2VVbml0LCBzdHJpbmc+ID0ge1xuICBcImluY2hlc1wiOiBcImluXCIsXG4gIFwiY21cIjogXCJjbVwiLFxufTtcblxuLyoqXG4gKiBNaWdyYXRlIGEgbGVnYWN5IHVuaXRQcmVmZXJlbmNlIHN0cmluZyB0byBhIFVuaXRDaG9pY2Ugb2JqZWN0LlxuICovXG5leHBvcnQgZnVuY3Rpb24gbWlncmF0ZUxlZ2FjeVByZWYoc3RvcmVkOiBzdHJpbmcgfCB1bmRlZmluZWQpOiBVbml0Q2hvaWNlIHtcbiAgc3dpdGNoIChzdG9yZWQpIHtcbiAgICBjYXNlIFwibWV0cmljXCI6XG4gICAgICByZXR1cm4geyBzcGVlZDogXCJtL3NcIiwgZGlzdGFuY2U6IFwibWV0ZXJzXCIgfTtcbiAgICBjYXNlIFwiaHlicmlkXCI6XG4gICAgICByZXR1cm4geyBzcGVlZDogXCJtcGhcIiwgZGlzdGFuY2U6IFwibWV0ZXJzXCIgfTtcbiAgICBjYXNlIFwiaW1wZXJpYWxcIjpcbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuIHsgc3BlZWQ6IFwibXBoXCIsIGRpc3RhbmNlOiBcInlhcmRzXCIgfTtcbiAgfVxufVxuXG4vKipcbiAqIEZpeGVkIHVuaXQgbGFiZWxzIGZvciBtZXRyaWNzIHdob3NlIHVuaXRzIGRvbid0IHZhcnkgYnkgcHJlZmVyZW5jZS5cbiAqL1xuZXhwb3J0IGNvbnN0IEZJWEVEX1VOSVRfTEFCRUxTOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xuICBTcGluUmF0ZTogXCJycG1cIixcbiAgSGFuZ1RpbWU6IFwic1wiLFxufTtcblxuLyoqXG4gKiBFeHRyYWN0IG5kXyogcGFyYW1ldGVycyBmcm9tIG1ldGFkYXRhX3BhcmFtcy5cbiAqIFxuICogQHBhcmFtIG1ldGFkYXRhUGFyYW1zIC0gVGhlIG1ldGFkYXRhX3BhcmFtcyBvYmplY3QgZnJvbSBTZXNzaW9uRGF0YVxuICogQHJldHVybnMgT2JqZWN0IG1hcHBpbmcgbWV0cmljIGdyb3VwIElEcyB0byB1bml0IHN5c3RlbSBJRHNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV4dHJhY3RVbml0UGFyYW1zKFxuICBtZXRhZGF0YVBhcmFtczogUmVjb3JkPHN0cmluZywgc3RyaW5nPlxuKTogUmVjb3JkPHN0cmluZywgVW5pdFN5c3RlbUlkPiB7XG4gIGNvbnN0IHJlc3VsdDogUmVjb3JkPHN0cmluZywgVW5pdFN5c3RlbUlkPiA9IHt9O1xuXG4gIGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKG1ldGFkYXRhUGFyYW1zKSkge1xuICAgIGNvbnN0IG1hdGNoID0ga2V5Lm1hdGNoKC9ebmRfKFthLXowLTldKykkL2kpO1xuICAgIGlmIChtYXRjaCkge1xuICAgICAgY29uc3QgZ3JvdXBLZXkgPSBtYXRjaFsxXS50b0xvd2VyQ2FzZSgpO1xuICAgICAgcmVzdWx0W2dyb3VwS2V5XSA9IHZhbHVlIGFzIFVuaXRTeXN0ZW1JZDtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufVxuXG4vKipcbiAqIERldGVybWluZSB0aGUgdW5pdCBzeXN0ZW0gSUQgZnJvbSBtZXRhZGF0YSBwYXJhbXMuXG4gKiBVc2VzIG5kXzAwMSBhcyBwcmltYXJ5LCBmYWxscyBiYWNrIHRvIGRlZmF1bHQuXG4gKiBcbiAqIEBwYXJhbSBtZXRhZGF0YVBhcmFtcyAtIFRoZSBtZXRhZGF0YV9wYXJhbXMgb2JqZWN0XG4gKiBAcmV0dXJucyBUaGUgdW5pdCBzeXN0ZW0gSUQgc3RyaW5nXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRVbml0U3lzdGVtSWQoXG4gIG1ldGFkYXRhUGFyYW1zOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+XG4pOiBVbml0U3lzdGVtSWQge1xuICBjb25zdCB1bml0UGFyYW1zID0gZXh0cmFjdFVuaXRQYXJhbXMobWV0YWRhdGFQYXJhbXMpO1xuICByZXR1cm4gdW5pdFBhcmFtc1tcIjAwMVwiXSB8fCBcIjc4OTAxMlwiOyAvLyBEZWZhdWx0IHRvIEltcGVyaWFsXG59XG5cbi8qKlxuICogR2V0IHRoZSBmdWxsIHVuaXQgc3lzdGVtIGNvbmZpZ3VyYXRpb24uXG4gKiBcbiAqIEBwYXJhbSBtZXRhZGF0YVBhcmFtcyAtIFRoZSBtZXRhZGF0YV9wYXJhbXMgb2JqZWN0XG4gKiBAcmV0dXJucyBUaGUgVW5pdFN5c3RlbSBjb25maWd1cmF0aW9uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRVbml0U3lzdGVtKFxuICBtZXRhZGF0YVBhcmFtczogUmVjb3JkPHN0cmluZywgc3RyaW5nPlxuKTogVW5pdFN5c3RlbSB7XG4gIGNvbnN0IGlkID0gZ2V0VW5pdFN5c3RlbUlkKG1ldGFkYXRhUGFyYW1zKTtcbiAgcmV0dXJuIFVOSVRfU1lTVEVNU1tpZF0gfHwgREVGQVVMVF9VTklUX1NZU1RFTTtcbn1cblxuLyoqXG4gKiBHZXQgdGhlIHVuaXQgc3lzdGVtIHJlcHJlc2VudGluZyB3aGF0IHRoZSBBUEkgYWN0dWFsbHkgcmV0dXJucy5cbiAqIFRoZSBBUEkgYWx3YXlzIHJldHVybnMgc3BlZWQgaW4gbS9zIGFuZCBkaXN0YW5jZSBpbiBtZXRlcnMsXG4gKiBidXQgdGhlIGFuZ2xlIHVuaXQgZGVwZW5kcyBvbiB0aGUgcmVwb3J0J3MgbmRfMDAxIHBhcmFtZXRlci5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEFwaVNvdXJjZVVuaXRTeXN0ZW0oXG4gIG1ldGFkYXRhUGFyYW1zOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+XG4pOiBVbml0U3lzdGVtIHtcbiAgY29uc3QgcmVwb3J0U3lzdGVtID0gZ2V0VW5pdFN5c3RlbShtZXRhZGF0YVBhcmFtcyk7XG4gIHJldHVybiB7XG4gICAgaWQ6IFwiYXBpXCIgYXMgVW5pdFN5c3RlbUlkLFxuICAgIG5hbWU6IFwiQVBJIFNvdXJjZVwiLFxuICAgIGRpc3RhbmNlVW5pdDogXCJtZXRlcnNcIixcbiAgICBhbmdsZVVuaXQ6IHJlcG9ydFN5c3RlbS5hbmdsZVVuaXQsXG4gICAgc3BlZWRVbml0OiBcIm0vc1wiLFxuICB9O1xufVxuXG4vKipcbiAqIEdldCB0aGUgdW5pdCBsYWJlbCBmb3IgYSBtZXRyaWMgYmFzZWQgb24gdXNlcidzIHVuaXQgY2hvaWNlLlxuICogUmV0dXJucyBlbXB0eSBzdHJpbmcgZm9yIGRpbWVuc2lvbmxlc3MgbWV0cmljcyAoZS5nLiBTbWFzaEZhY3RvciwgU3BpblJhdGUpLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0TWV0cmljVW5pdExhYmVsKFxuICBtZXRyaWNOYW1lOiBzdHJpbmcsXG4gIHVuaXRDaG9pY2U6IFVuaXRDaG9pY2UgPSBERUZBVUxUX1VOSVRfQ0hPSUNFXG4pOiBzdHJpbmcge1xuICBpZiAobWV0cmljTmFtZSBpbiBGSVhFRF9VTklUX0xBQkVMUykgcmV0dXJuIEZJWEVEX1VOSVRfTEFCRUxTW21ldHJpY05hbWVdO1xuICBpZiAoU1BFRURfTUVUUklDUy5oYXMobWV0cmljTmFtZSkpIHJldHVybiBTUEVFRF9MQUJFTFNbdW5pdENob2ljZS5zcGVlZF07XG4gIGlmIChTTUFMTF9ESVNUQU5DRV9NRVRSSUNTLmhhcyhtZXRyaWNOYW1lKSkgcmV0dXJuIFNNQUxMX0RJU1RBTkNFX0xBQkVMU1tnZXRTbWFsbERpc3RhbmNlVW5pdCh1bml0Q2hvaWNlKV07XG4gIGlmIChESVNUQU5DRV9NRVRSSUNTLmhhcyhtZXRyaWNOYW1lKSkgcmV0dXJuIERJU1RBTkNFX0xBQkVMU1t1bml0Q2hvaWNlLmRpc3RhbmNlXTtcbiAgaWYgKEFOR0xFX01FVFJJQ1MuaGFzKG1ldHJpY05hbWUpKSByZXR1cm4gXCJcdTAwQjBcIjtcbiAgcmV0dXJuIFwiXCI7XG59XG5cbi8qKlxuICogQ29udmVydCBhIGRpc3RhbmNlIHZhbHVlIGJldHdlZW4gdW5pdHMuXG4gKiBcbiAqIEBwYXJhbSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byBjb252ZXJ0XG4gKiBAcGFyYW0gZnJvbVVuaXQgLSBTb3VyY2UgdW5pdCAoXCJ5YXJkc1wiIG9yIFwibWV0ZXJzXCIpXG4gKiBAcGFyYW0gdG9Vbml0IC0gVGFyZ2V0IHVuaXQgKFwieWFyZHNcIiBvciBcIm1ldGVyc1wiKVxuICogQHJldHVybnMgQ29udmVydGVkIHZhbHVlLCBvciBvcmlnaW5hbCBpZiB1bml0cyBtYXRjaFxuICovXG5leHBvcnQgZnVuY3Rpb24gY29udmVydERpc3RhbmNlKFxuICB2YWx1ZTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbCxcbiAgZnJvbVVuaXQ6IFwieWFyZHNcIiB8IFwibWV0ZXJzXCIsXG4gIHRvVW5pdDogXCJ5YXJkc1wiIHwgXCJtZXRlcnNcIlxuKTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbCB7XG4gIGlmICh2YWx1ZSA9PT0gbnVsbCB8fCB2YWx1ZSA9PT0gXCJcIikgcmV0dXJuIHZhbHVlO1xuXG4gIGNvbnN0IG51bVZhbHVlID0gdHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiID8gcGFyc2VGbG9hdCh2YWx1ZSkgOiB2YWx1ZTtcbiAgaWYgKGlzTmFOKG51bVZhbHVlKSkgcmV0dXJuIHZhbHVlO1xuXG4gIGlmIChmcm9tVW5pdCA9PT0gdG9Vbml0KSByZXR1cm4gbnVtVmFsdWU7XG5cbiAgLy8gQ29udmVydCB0byBtZXRlcnMgZmlyc3QsIHRoZW4gdG8gdGFyZ2V0IHVuaXRcbiAgY29uc3QgaW5NZXRlcnMgPSBmcm9tVW5pdCA9PT0gXCJ5YXJkc1wiID8gbnVtVmFsdWUgKiAwLjkxNDQgOiBudW1WYWx1ZTtcbiAgcmV0dXJuIHRvVW5pdCA9PT0gXCJ5YXJkc1wiID8gaW5NZXRlcnMgLyAwLjkxNDQgOiBpbk1ldGVycztcbn1cblxuLyoqXG4gKiBDb252ZXJ0IGFuIGFuZ2xlIHZhbHVlIGJldHdlZW4gdW5pdHMuXG4gKiBcbiAqIEBwYXJhbSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byBjb252ZXJ0XG4gKiBAcGFyYW0gZnJvbVVuaXQgLSBTb3VyY2UgdW5pdCAoXCJkZWdyZWVzXCIgb3IgXCJyYWRpYW5zXCIpXG4gKiBAcGFyYW0gdG9Vbml0IC0gVGFyZ2V0IHVuaXQgKFwiZGVncmVlc1wiIG9yIFwicmFkaWFuc1wiKVxuICogQHJldHVybnMgQ29udmVydGVkIHZhbHVlLCBvciBvcmlnaW5hbCBpZiB1bml0cyBtYXRjaFxuICovXG5leHBvcnQgZnVuY3Rpb24gY29udmVydEFuZ2xlKFxuICB2YWx1ZTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbCxcbiAgZnJvbVVuaXQ6IFwiZGVncmVlc1wiIHwgXCJyYWRpYW5zXCIsXG4gIHRvVW5pdDogXCJkZWdyZWVzXCIgfCBcInJhZGlhbnNcIlxuKTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbCB7XG4gIGlmICh2YWx1ZSA9PT0gbnVsbCB8fCB2YWx1ZSA9PT0gXCJcIikgcmV0dXJuIHZhbHVlO1xuXG4gIGNvbnN0IG51bVZhbHVlID0gdHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiID8gcGFyc2VGbG9hdCh2YWx1ZSkgOiB2YWx1ZTtcbiAgaWYgKGlzTmFOKG51bVZhbHVlKSkgcmV0dXJuIHZhbHVlO1xuXG4gIGlmIChmcm9tVW5pdCA9PT0gdG9Vbml0KSByZXR1cm4gbnVtVmFsdWU7XG5cbiAgLy8gQ29udmVydCB0byBkZWdyZWVzIGZpcnN0LCB0aGVuIHRvIHRhcmdldCB1bml0XG4gIGNvbnN0IGluRGVncmVlcyA9IGZyb21Vbml0ID09PSBcImRlZ3JlZXNcIiA/IG51bVZhbHVlIDogKG51bVZhbHVlICogMTgwIC8gTWF0aC5QSSk7XG4gIHJldHVybiB0b1VuaXQgPT09IFwiZGVncmVlc1wiID8gaW5EZWdyZWVzIDogKGluRGVncmVlcyAqIE1hdGguUEkgLyAxODApO1xufVxuXG4vKipcbiAqIENvbnZlcnQgYSBzcGVlZCB2YWx1ZSBiZXR3ZWVuIHVuaXRzLlxuICpcbiAqIEBwYXJhbSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byBjb252ZXJ0XG4gKiBAcGFyYW0gZnJvbVVuaXQgLSBTb3VyY2UgdW5pdCAoXCJtcGhcIiwgXCJrbS9oXCIsIG9yIFwibS9zXCIpXG4gKiBAcGFyYW0gdG9Vbml0IC0gVGFyZ2V0IHVuaXQgKFwibXBoXCIsIFwia20vaFwiLCBvciBcIm0vc1wiKVxuICogQHJldHVybnMgQ29udmVydGVkIHZhbHVlLCBvciBvcmlnaW5hbCBpZiB1bml0cyBtYXRjaFxuICovXG5leHBvcnQgZnVuY3Rpb24gY29udmVydFNwZWVkKFxuICB2YWx1ZTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbCxcbiAgZnJvbVVuaXQ6IFwibXBoXCIgfCBcImttL2hcIiB8IFwibS9zXCIsXG4gIHRvVW5pdDogXCJtcGhcIiB8IFwia20vaFwiIHwgXCJtL3NcIlxuKTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbCB7XG4gIGlmICh2YWx1ZSA9PT0gbnVsbCB8fCB2YWx1ZSA9PT0gXCJcIikgcmV0dXJuIHZhbHVlO1xuXG4gIGNvbnN0IG51bVZhbHVlID0gdHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiID8gcGFyc2VGbG9hdCh2YWx1ZSkgOiB2YWx1ZTtcbiAgaWYgKGlzTmFOKG51bVZhbHVlKSkgcmV0dXJuIHZhbHVlO1xuXG4gIGlmIChmcm9tVW5pdCA9PT0gdG9Vbml0KSByZXR1cm4gbnVtVmFsdWU7XG5cbiAgLy8gQ29udmVydCB0byBtcGggZmlyc3QsIHRoZW4gdG8gdGFyZ2V0IHVuaXRcbiAgbGV0IGluTXBoOiBudW1iZXI7XG4gIGlmIChmcm9tVW5pdCA9PT0gXCJtcGhcIikgaW5NcGggPSBudW1WYWx1ZTtcbiAgZWxzZSBpZiAoZnJvbVVuaXQgPT09IFwia20vaFwiKSBpbk1waCA9IG51bVZhbHVlIC8gMS42MDkzNDQ7XG4gIGVsc2UgaW5NcGggPSBudW1WYWx1ZSAqIDIuMjM2OTQ7IC8vIG0vcyB0byBtcGhcblxuICBpZiAodG9Vbml0ID09PSBcIm1waFwiKSByZXR1cm4gaW5NcGg7XG4gIGlmICh0b1VuaXQgPT09IFwia20vaFwiKSByZXR1cm4gaW5NcGggKiAxLjYwOTM0NDtcbiAgcmV0dXJuIGluTXBoIC8gMi4yMzY5NDsgLy8gbXBoIHRvIG0vc1xufVxuXG4vKipcbiAqIEdldCB0aGUgc21hbGwgZGlzdGFuY2UgdW5pdCBiYXNlZCBvbiB0aGUgdXNlcidzIGRpc3RhbmNlIGNob2ljZS5cbiAqIFlhcmRzIHVzZXJzIHNlZSBpbmNoZXM7IG1ldGVycyB1c2VycyBzZWUgY20uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRTbWFsbERpc3RhbmNlVW5pdCh1bml0Q2hvaWNlOiBVbml0Q2hvaWNlID0gREVGQVVMVF9VTklUX0NIT0lDRSk6IFNtYWxsRGlzdGFuY2VVbml0IHtcbiAgcmV0dXJuIHVuaXRDaG9pY2UuZGlzdGFuY2UgPT09IFwieWFyZHNcIiA/IFwiaW5jaGVzXCIgOiBcImNtXCI7XG59XG5cbi8qKlxuICogQ29udmVydCBhIGRpc3RhbmNlIHZhbHVlIGZyb20gbWV0ZXJzIHRvIGEgc21hbGwgZGlzdGFuY2UgdW5pdCAoaW5jaGVzIG9yIGNtKS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbnZlcnRTbWFsbERpc3RhbmNlKFxuICB2YWx1ZTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbCxcbiAgdG9TbWFsbFVuaXQ6IFNtYWxsRGlzdGFuY2VVbml0XG4pOiBudW1iZXIgfCBzdHJpbmcgfCBudWxsIHtcbiAgaWYgKHZhbHVlID09PSBudWxsIHx8IHZhbHVlID09PSBcIlwiKSByZXR1cm4gdmFsdWU7XG5cbiAgY29uc3QgbnVtVmFsdWUgPSB0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCIgPyBwYXJzZUZsb2F0KHZhbHVlKSA6IHZhbHVlO1xuICBpZiAoaXNOYU4obnVtVmFsdWUpKSByZXR1cm4gdmFsdWU7XG5cbiAgcmV0dXJuIHRvU21hbGxVbml0ID09PSBcImluY2hlc1wiID8gbnVtVmFsdWUgKiAzOS4zNzAxIDogbnVtVmFsdWUgKiAxMDA7XG59XG5cbi8qKlxuICogTm9ybWFsaXplIGEgbWV0cmljIHZhbHVlIGJhc2VkIG9uIHVuaXQgc3lzdGVtIGFsaWdubWVudCBhbmQgdXNlcidzIHVuaXQgY2hvaWNlLlxuICpcbiAqIENvbnZlcnRzIHZhbHVlcyBmcm9tIHRoZSBzb3VyY2UgdW5pdHMgdG8gdGFyZ2V0IG91dHB1dCB1bml0czpcbiAqIC0gRGlzdGFuY2U6IHlhcmRzIG9yIG1ldGVycyAocGVyIHVuaXRDaG9pY2UuZGlzdGFuY2UpXG4gKiAtIEFuZ2xlczogYWx3YXlzIGRlZ3JlZXNcbiAqIC0gU3BlZWQ6IG1waCBvciBtL3MgKHBlciB1bml0Q2hvaWNlLnNwZWVkKVxuICpcbiAqIEBwYXJhbSB2YWx1ZSAtIFRoZSByYXcgbWV0cmljIHZhbHVlXG4gKiBAcGFyYW0gbWV0cmljTmFtZSAtIFRoZSBuYW1lIG9mIHRoZSBtZXRyaWMgYmVpbmcgbm9ybWFsaXplZFxuICogQHBhcmFtIHJlcG9ydFVuaXRTeXN0ZW0gLSBUaGUgdW5pdCBzeXN0ZW0gdXNlZCBpbiB0aGUgc291cmNlIGRhdGFcbiAqIEBwYXJhbSB1bml0Q2hvaWNlIC0gVXNlcidzIHVuaXQgY2hvaWNlIChkZWZhdWx0cyB0byBtcGggKyB5YXJkcylcbiAqIEByZXR1cm5zIE5vcm1hbGl6ZWQgdmFsdWUgYXMgbnVtYmVyIG9yIHN0cmluZyAobnVsbCBpZiBpbnZhbGlkKVxuICovXG5leHBvcnQgZnVuY3Rpb24gbm9ybWFsaXplTWV0cmljVmFsdWUoXG4gIHZhbHVlOiBNZXRyaWNWYWx1ZSxcbiAgbWV0cmljTmFtZTogc3RyaW5nLFxuICByZXBvcnRVbml0U3lzdGVtOiBVbml0U3lzdGVtLFxuICB1bml0Q2hvaWNlOiBVbml0Q2hvaWNlID0gREVGQVVMVF9VTklUX0NIT0lDRVxuKTogTWV0cmljVmFsdWUge1xuICBjb25zdCBudW1WYWx1ZSA9IHBhcnNlTnVtZXJpY1ZhbHVlKHZhbHVlKTtcbiAgaWYgKG51bVZhbHVlID09PSBudWxsKSByZXR1cm4gdmFsdWU7XG5cbiAgbGV0IGNvbnZlcnRlZDogbnVtYmVyO1xuXG4gIGlmIChTTUFMTF9ESVNUQU5DRV9NRVRSSUNTLmhhcyhtZXRyaWNOYW1lKSkge1xuICAgIGNvbnZlcnRlZCA9IGNvbnZlcnRTbWFsbERpc3RhbmNlKFxuICAgICAgbnVtVmFsdWUsXG4gICAgICBnZXRTbWFsbERpc3RhbmNlVW5pdCh1bml0Q2hvaWNlKVxuICAgICkgYXMgbnVtYmVyO1xuICB9IGVsc2UgaWYgKERJU1RBTkNFX01FVFJJQ1MuaGFzKG1ldHJpY05hbWUpKSB7XG4gICAgY29udmVydGVkID0gY29udmVydERpc3RhbmNlKFxuICAgICAgbnVtVmFsdWUsXG4gICAgICByZXBvcnRVbml0U3lzdGVtLmRpc3RhbmNlVW5pdCxcbiAgICAgIHVuaXRDaG9pY2UuZGlzdGFuY2VcbiAgICApIGFzIG51bWJlcjtcbiAgfSBlbHNlIGlmIChBTkdMRV9NRVRSSUNTLmhhcyhtZXRyaWNOYW1lKSkge1xuICAgIGNvbnZlcnRlZCA9IGNvbnZlcnRBbmdsZShcbiAgICAgIG51bVZhbHVlLFxuICAgICAgcmVwb3J0VW5pdFN5c3RlbS5hbmdsZVVuaXQsXG4gICAgICBcImRlZ3JlZXNcIlxuICAgICkgYXMgbnVtYmVyO1xuICB9IGVsc2UgaWYgKFNQRUVEX01FVFJJQ1MuaGFzKG1ldHJpY05hbWUpKSB7XG4gICAgY29udmVydGVkID0gY29udmVydFNwZWVkKFxuICAgICAgbnVtVmFsdWUsXG4gICAgICByZXBvcnRVbml0U3lzdGVtLnNwZWVkVW5pdCxcbiAgICAgIHVuaXRDaG9pY2Uuc3BlZWRcbiAgICApIGFzIG51bWJlcjtcbiAgfSBlbHNlIHtcbiAgICBjb252ZXJ0ZWQgPSBudW1WYWx1ZTtcbiAgfVxuXG4gIC8vIFNwaW5SYXRlOiByb3VuZCB0byB3aG9sZSBudW1iZXJzXG4gIGlmIChtZXRyaWNOYW1lID09PSBcIlNwaW5SYXRlXCIpIHJldHVybiBNYXRoLnJvdW5kKGNvbnZlcnRlZCk7XG5cbiAgLy8gUm91bmQgdG8gMSBkZWNpbWFsIHBsYWNlIGZvciBjb25zaXN0ZW5jeVxuICByZXR1cm4gTWF0aC5yb3VuZChjb252ZXJ0ZWQgKiAxMCkgLyAxMDtcbn1cblxuLyoqXG4gKiBQYXJzZSBhIG51bWVyaWMgdmFsdWUgZnJvbSBNZXRyaWNWYWx1ZSB0eXBlLlxuICovXG5mdW5jdGlvbiBwYXJzZU51bWVyaWNWYWx1ZSh2YWx1ZTogTWV0cmljVmFsdWUpOiBudW1iZXIgfCBudWxsIHtcbiAgaWYgKHZhbHVlID09PSBudWxsIHx8IHZhbHVlID09PSBcIlwiKSByZXR1cm4gbnVsbDtcbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJudW1iZXJcIikgcmV0dXJuIGlzTmFOKHZhbHVlKSA/IG51bGwgOiB2YWx1ZTtcbiAgXG4gIGNvbnN0IHBhcnNlZCA9IHBhcnNlRmxvYXQodmFsdWUpO1xuICByZXR1cm4gaXNOYU4ocGFyc2VkKSA/IG51bGwgOiBwYXJzZWQ7XG59XG5cbmV4cG9ydCB0eXBlIE1ldHJpY1ZhbHVlID0gc3RyaW5nIHwgbnVtYmVyIHwgbnVsbDtcbiIsICIvKipcbiAqIENTViB3cml0ZXIgZm9yIFRyYWNrUHVsbCBzZXNzaW9uIGRhdGEuXG4gKiBJbXBsZW1lbnRzIGNvcmUgY29sdW1uczogRGF0ZSwgQ2x1YiwgU2hvdCAjLCBUeXBlXG4gKi9cblxuaW1wb3J0IHR5cGUgeyBTZXNzaW9uRGF0YSwgQ2x1Ykdyb3VwLCBTaG90IH0gZnJvbSBcIi4uL21vZGVscy90eXBlc1wiO1xuaW1wb3J0IHtcbiAgZ2V0QXBpU291cmNlVW5pdFN5c3RlbSxcbiAgZ2V0TWV0cmljVW5pdExhYmVsLFxuICBub3JtYWxpemVNZXRyaWNWYWx1ZSxcbiAgREVGQVVMVF9VTklUX0NIT0lDRSxcbiAgdHlwZSBVbml0Q2hvaWNlLFxufSBmcm9tIFwiLi91bml0X25vcm1hbGl6YXRpb25cIjtcbmltcG9ydCB7IE1FVFJJQ19ESVNQTEFZX05BTUVTIH0gZnJvbSBcIi4vY29uc3RhbnRzXCI7XG5cbmNvbnN0IE1FVFJJQ19DT0xVTU5fT1JERVI6IHN0cmluZ1tdID0gW1xuICAvLyBTcGVlZCAmIEVmZmljaWVuY3lcbiAgXCJDbHViU3BlZWRcIiwgXCJCYWxsU3BlZWRcIiwgXCJTbWFzaEZhY3RvclwiLFxuICAvLyBDbHViIERlbGl2ZXJ5XG4gIFwiQXR0YWNrQW5nbGVcIiwgXCJDbHViUGF0aFwiLCBcIkZhY2VBbmdsZVwiLCBcIkZhY2VUb1BhdGhcIiwgXCJTd2luZ0RpcmVjdGlvblwiLCBcIkR5bmFtaWNMb2Z0XCIsXG4gIC8vIExhdW5jaCAmIFNwaW5cbiAgXCJMYXVuY2hBbmdsZVwiLCBcIkxhdW5jaERpcmVjdGlvblwiLCBcIlNwaW5SYXRlXCIsIFwiU3BpbkF4aXNcIiwgXCJTcGluTG9mdFwiLFxuICAvLyBEaXN0YW5jZVxuICBcIkNhcnJ5XCIsIFwiVG90YWxcIixcbiAgLy8gRGlzcGVyc2lvblxuICBcIlNpZGVcIiwgXCJTaWRlVG90YWxcIiwgXCJDYXJyeVNpZGVcIiwgXCJUb3RhbFNpZGVcIiwgXCJDdXJ2ZVwiLFxuICAvLyBCYWxsIEZsaWdodFxuICBcIkhlaWdodFwiLCBcIk1heEhlaWdodFwiLCBcIkxhbmRpbmdBbmdsZVwiLCBcIkhhbmdUaW1lXCIsXG4gIC8vIEltcGFjdFxuICBcIkxvd1BvaW50RGlzdGFuY2VcIiwgXCJJbXBhY3RIZWlnaHRcIiwgXCJJbXBhY3RPZmZzZXRcIixcbiAgLy8gT3RoZXJcbiAgXCJUZW1wb1wiLFxuXTtcblxuZnVuY3Rpb24gZ2V0RGlzcGxheU5hbWUobWV0cmljOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gTUVUUklDX0RJU1BMQVlfTkFNRVNbbWV0cmljXSA/PyBtZXRyaWM7XG59XG5cbmZ1bmN0aW9uIGdldENvbHVtbk5hbWUobWV0cmljOiBzdHJpbmcsIHVuaXRDaG9pY2U6IFVuaXRDaG9pY2UpOiBzdHJpbmcge1xuICBjb25zdCBkaXNwbGF5TmFtZSA9IGdldERpc3BsYXlOYW1lKG1ldHJpYyk7XG4gIGNvbnN0IHVuaXRMYWJlbCA9IGdldE1ldHJpY1VuaXRMYWJlbChtZXRyaWMsIHVuaXRDaG9pY2UpO1xuICByZXR1cm4gdW5pdExhYmVsID8gYCR7ZGlzcGxheU5hbWV9ICgke3VuaXRMYWJlbH0pYCA6IGRpc3BsYXlOYW1lO1xufVxuXG5mdW5jdGlvbiBnZW5lcmF0ZUZpbGVuYW1lKHNlc3Npb246IFNlc3Npb25EYXRhKTogc3RyaW5nIHtcbiAgcmV0dXJuIGBTaG90RGF0YV8ke3Nlc3Npb24uZGF0ZX0uY3N2YDtcbn1cblxuZnVuY3Rpb24gb3JkZXJNZXRyaWNzQnlQcmlvcml0eShcbiAgYWxsTWV0cmljczogc3RyaW5nW10sXG4gIHByaW9yaXR5T3JkZXI6IHN0cmluZ1tdXG4pOiBzdHJpbmdbXSB7XG4gIGNvbnN0IHJlc3VsdDogc3RyaW5nW10gPSBbXTtcbiAgY29uc3Qgc2VlbiA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuXG4gIGZvciAoY29uc3QgbWV0cmljIG9mIHByaW9yaXR5T3JkZXIpIHtcbiAgICBpZiAoYWxsTWV0cmljcy5pbmNsdWRlcyhtZXRyaWMpICYmICFzZWVuLmhhcyhtZXRyaWMpKSB7XG4gICAgICByZXN1bHQucHVzaChtZXRyaWMpO1xuICAgICAgc2Vlbi5hZGQobWV0cmljKTtcbiAgICB9XG4gIH1cblxuICBmb3IgKGNvbnN0IG1ldHJpYyBvZiBhbGxNZXRyaWNzKSB7XG4gICAgaWYgKCFzZWVuLmhhcyhtZXRyaWMpKSB7XG4gICAgICByZXN1bHQucHVzaChtZXRyaWMpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIGhhc1RhZ3Moc2Vzc2lvbjogU2Vzc2lvbkRhdGEpOiBib29sZWFuIHtcbiAgcmV0dXJuIHNlc3Npb24uY2x1Yl9ncm91cHMuc29tZSgoY2x1YikgPT5cbiAgICBjbHViLnNob3RzLnNvbWUoKHNob3QpID0+IHNob3QudGFnICE9PSB1bmRlZmluZWQgJiYgc2hvdC50YWcgIT09IFwiXCIpXG4gICk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB3cml0ZUNzdihcbiAgc2Vzc2lvbjogU2Vzc2lvbkRhdGEsXG4gIGluY2x1ZGVBdmVyYWdlcyA9IHRydWUsXG4gIG1ldHJpY09yZGVyPzogc3RyaW5nW10sXG4gIHVuaXRDaG9pY2U6IFVuaXRDaG9pY2UgPSBERUZBVUxUX1VOSVRfQ0hPSUNFXG4pOiBzdHJpbmcge1xuICBjb25zdCBvcmRlcmVkTWV0cmljcyA9IG9yZGVyTWV0cmljc0J5UHJpb3JpdHkoXG4gICAgc2Vzc2lvbi5tZXRyaWNfbmFtZXMsXG4gICAgbWV0cmljT3JkZXIgPz8gTUVUUklDX0NPTFVNTl9PUkRFUlxuICApO1xuXG4gIGNvbnN0IGhlYWRlclJvdzogc3RyaW5nW10gPSBbXCJEYXRlXCIsIFwiQ2x1YlwiXTtcblxuICBpZiAoaGFzVGFncyhzZXNzaW9uKSkge1xuICAgIGhlYWRlclJvdy5wdXNoKFwiVGFnXCIpO1xuICB9XG5cbiAgaGVhZGVyUm93LnB1c2goXCJTaG90ICNcIiwgXCJUeXBlXCIpO1xuXG4gIGZvciAoY29uc3QgbWV0cmljIG9mIG9yZGVyZWRNZXRyaWNzKSB7XG4gICAgaGVhZGVyUm93LnB1c2goZ2V0Q29sdW1uTmFtZShtZXRyaWMsIHVuaXRDaG9pY2UpKTtcbiAgfVxuXG4gIGNvbnN0IHJvd3M6IFJlY29yZDxzdHJpbmcsIHN0cmluZz5bXSA9IFtdO1xuXG4gIC8vIFNvdXJjZSB1bml0IHN5c3RlbTogQVBJIGFsd2F5cyByZXR1cm5zIG0vcyArIG1ldGVycywgYW5nbGUgdW5pdCBmcm9tIHJlcG9ydFxuICBjb25zdCB1bml0U3lzdGVtID0gZ2V0QXBpU291cmNlVW5pdFN5c3RlbShzZXNzaW9uLm1ldGFkYXRhX3BhcmFtcyk7XG5cbiAgZm9yIChjb25zdCBjbHViIG9mIHNlc3Npb24uY2x1Yl9ncm91cHMpIHtcbiAgICBmb3IgKGNvbnN0IHNob3Qgb2YgY2x1Yi5zaG90cykge1xuICAgICAgY29uc3Qgcm93OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xuICAgICAgICBEYXRlOiBzZXNzaW9uLmRhdGUsXG4gICAgICAgIENsdWI6IGNsdWIuY2x1Yl9uYW1lLFxuICAgICAgICBcIlNob3QgI1wiOiBTdHJpbmcoc2hvdC5zaG90X251bWJlciArIDEpLFxuICAgICAgICBUeXBlOiBcIlNob3RcIixcbiAgICAgIH07XG5cbiAgICAgIGlmIChoYXNUYWdzKHNlc3Npb24pKSB7XG4gICAgICAgIHJvdy5UYWcgPSBzaG90LnRhZyA/PyBcIlwiO1xuICAgICAgfVxuXG4gICAgICBmb3IgKGNvbnN0IG1ldHJpYyBvZiBvcmRlcmVkTWV0cmljcykge1xuICAgICAgICBjb25zdCBjb2xOYW1lID0gZ2V0Q29sdW1uTmFtZShtZXRyaWMsIHVuaXRDaG9pY2UpO1xuICAgICAgICBjb25zdCByYXdWYWx1ZSA9IHNob3QubWV0cmljc1ttZXRyaWNdID8/IFwiXCI7XG5cbiAgICAgICAgaWYgKHR5cGVvZiByYXdWYWx1ZSA9PT0gXCJzdHJpbmdcIiB8fCB0eXBlb2YgcmF3VmFsdWUgPT09IFwibnVtYmVyXCIpIHtcbiAgICAgICAgICByb3dbY29sTmFtZV0gPSBTdHJpbmcobm9ybWFsaXplTWV0cmljVmFsdWUocmF3VmFsdWUsIG1ldHJpYywgdW5pdFN5c3RlbSwgdW5pdENob2ljZSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJvd1tjb2xOYW1lXSA9IFwiXCI7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcm93cy5wdXNoKHJvdyk7XG4gICAgfVxuXG4gICAgaWYgKGluY2x1ZGVBdmVyYWdlcyAmJiBPYmplY3Qua2V5cyhjbHViLmF2ZXJhZ2VzKS5sZW5ndGggPiAwKSB7XG4gICAgICBjb25zdCBhdmdSb3c6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XG4gICAgICAgIERhdGU6IHNlc3Npb24uZGF0ZSxcbiAgICAgICAgQ2x1YjogY2x1Yi5jbHViX25hbWUsXG4gICAgICAgIFwiU2hvdCAjXCI6IFwiXCIsXG4gICAgICAgIFR5cGU6IFwiQXZlcmFnZVwiLFxuICAgICAgfTtcblxuICAgICAgaWYgKGhhc1RhZ3Moc2Vzc2lvbikpIHtcbiAgICAgICAgYXZnUm93LlRhZyA9IFwiXCI7XG4gICAgICB9XG5cbiAgICAgIGZvciAoY29uc3QgbWV0cmljIG9mIG9yZGVyZWRNZXRyaWNzKSB7XG4gICAgICAgIGNvbnN0IGNvbE5hbWUgPSBnZXRDb2x1bW5OYW1lKG1ldHJpYywgdW5pdENob2ljZSk7XG4gICAgICAgIGNvbnN0IHJhd1ZhbHVlID0gY2x1Yi5hdmVyYWdlc1ttZXRyaWNdID8/IFwiXCI7XG5cbiAgICAgICAgaWYgKHR5cGVvZiByYXdWYWx1ZSA9PT0gXCJzdHJpbmdcIiB8fCB0eXBlb2YgcmF3VmFsdWUgPT09IFwibnVtYmVyXCIpIHtcbiAgICAgICAgICBhdmdSb3dbY29sTmFtZV0gPSBTdHJpbmcobm9ybWFsaXplTWV0cmljVmFsdWUocmF3VmFsdWUsIG1ldHJpYywgdW5pdFN5c3RlbSwgdW5pdENob2ljZSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGF2Z1Jvd1tjb2xOYW1lXSA9IFwiXCI7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcm93cy5wdXNoKGF2Z1Jvdyk7XG4gICAgfVxuXG4gICAgaWYgKGluY2x1ZGVBdmVyYWdlcyAmJiBPYmplY3Qua2V5cyhjbHViLmNvbnNpc3RlbmN5KS5sZW5ndGggPiAwKSB7XG4gICAgICBjb25zdCBjb25zUm93OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xuICAgICAgICBEYXRlOiBzZXNzaW9uLmRhdGUsXG4gICAgICAgIENsdWI6IGNsdWIuY2x1Yl9uYW1lLFxuICAgICAgICBcIlNob3QgI1wiOiBcIlwiLFxuICAgICAgICBUeXBlOiBcIkNvbnNpc3RlbmN5XCIsXG4gICAgICB9O1xuXG4gICAgICBpZiAoaGFzVGFncyhzZXNzaW9uKSkge1xuICAgICAgICBjb25zUm93LlRhZyA9IFwiXCI7XG4gICAgICB9XG5cbiAgICAgIGZvciAoY29uc3QgbWV0cmljIG9mIG9yZGVyZWRNZXRyaWNzKSB7XG4gICAgICAgIGNvbnN0IGNvbE5hbWUgPSBnZXRDb2x1bW5OYW1lKG1ldHJpYywgdW5pdENob2ljZSk7XG4gICAgICAgIGNvbnN0IHJhd1ZhbHVlID0gY2x1Yi5jb25zaXN0ZW5jeVttZXRyaWNdID8/IFwiXCI7XG5cbiAgICAgICAgaWYgKHR5cGVvZiByYXdWYWx1ZSA9PT0gXCJzdHJpbmdcIiB8fCB0eXBlb2YgcmF3VmFsdWUgPT09IFwibnVtYmVyXCIpIHtcbiAgICAgICAgICBjb25zUm93W2NvbE5hbWVdID0gU3RyaW5nKG5vcm1hbGl6ZU1ldHJpY1ZhbHVlKHJhd1ZhbHVlLCBtZXRyaWMsIHVuaXRTeXN0ZW0sIHVuaXRDaG9pY2UpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zUm93W2NvbE5hbWVdID0gXCJcIjtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByb3dzLnB1c2goY29uc1Jvdyk7XG4gICAgfVxuICB9XG5cbiAgY29uc3QgY3N2Q29udGVudCA9IFtcbiAgICBoZWFkZXJSb3cuam9pbihcIixcIiksXG4gICAgLi4ucm93cy5tYXAoKHJvdykgPT4ge1xuICAgICAgcmV0dXJuIGhlYWRlclJvd1xuICAgICAgICAubWFwKChjb2wpID0+IHtcbiAgICAgICAgICBjb25zdCB2YWx1ZSA9IHJvd1tjb2xdID8/IFwiXCI7XG4gICAgICAgICAgaWYgKHZhbHVlLmluY2x1ZGVzKFwiLFwiKSB8fCB2YWx1ZS5pbmNsdWRlcygnXCInKSB8fCB2YWx1ZS5pbmNsdWRlcyhcIlxcblwiKSkge1xuICAgICAgICAgICAgcmV0dXJuIGBcIiR7dmFsdWUucmVwbGFjZSgvXCIvZywgJ1wiXCInKX1cImA7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgfSlcbiAgICAgICAgLmpvaW4oXCIsXCIpO1xuICAgIH0pLFxuICBdLmpvaW4oXCJcXG5cIik7XG5cbiAgcmV0dXJuIGNzdkNvbnRlbnQ7XG59XG4iLCAiLyoqXG4gKiBTZXJ2aWNlIFdvcmtlciBmb3IgVHJhY2tQdWxsIENocm9tZSBFeHRlbnNpb25cbiAqL1xuXG5pbXBvcnQgeyBTVE9SQUdFX0tFWVMgfSBmcm9tIFwiLi4vc2hhcmVkL2NvbnN0YW50c1wiO1xuaW1wb3J0IHsgd3JpdGVDc3YgfSBmcm9tIFwiLi4vc2hhcmVkL2Nzdl93cml0ZXJcIjtcbmltcG9ydCB0eXBlIHsgU2Vzc2lvbkRhdGEgfSBmcm9tIFwiLi4vbW9kZWxzL3R5cGVzXCI7XG5pbXBvcnQgeyBtaWdyYXRlTGVnYWN5UHJlZiwgREVGQVVMVF9VTklUX0NIT0lDRSwgdHlwZSBVbml0Q2hvaWNlLCB0eXBlIFNwZWVkVW5pdCwgdHlwZSBEaXN0YW5jZVVuaXQgfSBmcm9tIFwiLi4vc2hhcmVkL3VuaXRfbm9ybWFsaXphdGlvblwiO1xuXG5jaHJvbWUucnVudGltZS5vbkluc3RhbGxlZC5hZGRMaXN0ZW5lcigoKSA9PiB7XG4gIGNvbnNvbGUubG9nKFwiVHJhY2tQdWxsIGV4dGVuc2lvbiBpbnN0YWxsZWRcIik7XG59KTtcblxuaW50ZXJmYWNlIFNhdmVEYXRhUmVxdWVzdCB7XG4gIHR5cGU6IFwiU0FWRV9EQVRBXCI7XG4gIGRhdGE6IFNlc3Npb25EYXRhO1xufVxuXG5pbnRlcmZhY2UgRXhwb3J0Q3N2UmVxdWVzdCB7XG4gIHR5cGU6IFwiRVhQT1JUX0NTVl9SRVFVRVNUXCI7XG59XG5cbmludGVyZmFjZSBHZXREYXRhUmVxdWVzdCB7XG4gIHR5cGU6IFwiR0VUX0RBVEFcIjtcbn1cblxuZnVuY3Rpb24gZ2V0RG93bmxvYWRFcnJvck1lc3NhZ2Uob3JpZ2luYWxFcnJvcjogc3RyaW5nKTogc3RyaW5nIHtcbiAgaWYgKG9yaWdpbmFsRXJyb3IuaW5jbHVkZXMoXCJpbnZhbGlkXCIpKSB7XG4gICAgcmV0dXJuIFwiSW52YWxpZCBkb3dubG9hZCBmb3JtYXRcIjtcbiAgfVxuICBpZiAob3JpZ2luYWxFcnJvci5pbmNsdWRlcyhcInF1b3RhXCIpIHx8IG9yaWdpbmFsRXJyb3IuaW5jbHVkZXMoXCJzcGFjZVwiKSkge1xuICAgIHJldHVybiBcIkluc3VmZmljaWVudCBzdG9yYWdlIHNwYWNlXCI7XG4gIH1cbiAgaWYgKG9yaWdpbmFsRXJyb3IuaW5jbHVkZXMoXCJibG9ja2VkXCIpIHx8IG9yaWdpbmFsRXJyb3IuaW5jbHVkZXMoXCJwb2xpY3lcIikpIHtcbiAgICByZXR1cm4gXCJEb3dubG9hZCBibG9ja2VkIGJ5IGJyb3dzZXIgc2V0dGluZ3NcIjtcbiAgfVxuICByZXR1cm4gb3JpZ2luYWxFcnJvcjtcbn1cblxudHlwZSBSZXF1ZXN0TWVzc2FnZSA9IFNhdmVEYXRhUmVxdWVzdCB8IEV4cG9ydENzdlJlcXVlc3QgfCBHZXREYXRhUmVxdWVzdDtcblxuY2hyb21lLnJ1bnRpbWUub25NZXNzYWdlLmFkZExpc3RlbmVyKChtZXNzYWdlOiBSZXF1ZXN0TWVzc2FnZSwgc2VuZGVyLCBzZW5kUmVzcG9uc2UpID0+IHtcbiAgaWYgKG1lc3NhZ2UudHlwZSA9PT0gXCJHRVRfREFUQVwiKSB7XG4gICAgY2hyb21lLnN0b3JhZ2UubG9jYWwuZ2V0KFtTVE9SQUdFX0tFWVMuVFJBQ0tNQU5fREFUQV0sIChyZXN1bHQpID0+IHtcbiAgICAgIHNlbmRSZXNwb25zZShyZXN1bHRbU1RPUkFHRV9LRVlTLlRSQUNLTUFOX0RBVEFdIHx8IG51bGwpO1xuICAgIH0pO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgaWYgKG1lc3NhZ2UudHlwZSA9PT0gXCJTQVZFX0RBVEFcIikge1xuICAgIGNvbnN0IHNlc3Npb25EYXRhID0gKG1lc3NhZ2UgYXMgU2F2ZURhdGFSZXF1ZXN0KS5kYXRhO1xuICAgIGNocm9tZS5zdG9yYWdlLmxvY2FsLnNldCh7IFtTVE9SQUdFX0tFWVMuVFJBQ0tNQU5fREFUQV06IHNlc3Npb25EYXRhIH0sICgpID0+IHtcbiAgICAgIGlmIChjaHJvbWUucnVudGltZS5sYXN0RXJyb3IpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIlRyYWNrUHVsbDogRmFpbGVkIHRvIHNhdmUgZGF0YTpcIiwgY2hyb21lLnJ1bnRpbWUubGFzdEVycm9yKTtcbiAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBjaHJvbWUucnVudGltZS5sYXN0RXJyb3IubWVzc2FnZSB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiVHJhY2tQdWxsOiBTZXNzaW9uIGRhdGEgc2F2ZWQgdG8gc3RvcmFnZVwiKTtcbiAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogdHJ1ZSB9KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGlmIChtZXNzYWdlLnR5cGUgPT09IFwiRVhQT1JUX0NTVl9SRVFVRVNUXCIpIHtcbiAgICBjaHJvbWUuc3RvcmFnZS5sb2NhbC5nZXQoW1NUT1JBR0VfS0VZUy5UUkFDS01BTl9EQVRBLCBTVE9SQUdFX0tFWVMuU1BFRURfVU5JVCwgU1RPUkFHRV9LRVlTLkRJU1RBTkNFX1VOSVQsIFwidW5pdFByZWZlcmVuY2VcIl0sIChyZXN1bHQpID0+IHtcbiAgICAgIGNvbnN0IGRhdGEgPSByZXN1bHRbU1RPUkFHRV9LRVlTLlRSQUNLTUFOX0RBVEFdIGFzIFNlc3Npb25EYXRhIHwgdW5kZWZpbmVkO1xuICAgICAgaWYgKCFkYXRhIHx8ICFkYXRhLmNsdWJfZ3JvdXBzIHx8IGRhdGEuY2x1Yl9ncm91cHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogXCJObyBkYXRhIHRvIGV4cG9ydFwiIH0pO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIGxldCB1bml0Q2hvaWNlOiBVbml0Q2hvaWNlO1xuICAgICAgICBpZiAocmVzdWx0W1NUT1JBR0VfS0VZUy5TUEVFRF9VTklUXSAmJiByZXN1bHRbU1RPUkFHRV9LRVlTLkRJU1RBTkNFX1VOSVRdKSB7XG4gICAgICAgICAgdW5pdENob2ljZSA9IHtcbiAgICAgICAgICAgIHNwZWVkOiByZXN1bHRbU1RPUkFHRV9LRVlTLlNQRUVEX1VOSVRdIGFzIFNwZWVkVW5pdCxcbiAgICAgICAgICAgIGRpc3RhbmNlOiByZXN1bHRbU1RPUkFHRV9LRVlTLkRJU1RBTkNFX1VOSVRdIGFzIERpc3RhbmNlVW5pdCxcbiAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHVuaXRDaG9pY2UgPSBtaWdyYXRlTGVnYWN5UHJlZihyZXN1bHRbXCJ1bml0UHJlZmVyZW5jZVwiXSBhcyBzdHJpbmcgfCB1bmRlZmluZWQpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGNzdkNvbnRlbnQgPSB3cml0ZUNzdihkYXRhLCB0cnVlLCB1bmRlZmluZWQsIHVuaXRDaG9pY2UpO1xuICAgICAgICBjb25zdCBmaWxlbmFtZSA9IGBTaG90RGF0YV8ke2RhdGEuZGF0ZSB8fCBcInVua25vd25cIn0uY3N2YDtcblxuICAgICAgICBjaHJvbWUuZG93bmxvYWRzLmRvd25sb2FkKFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHVybDogYGRhdGE6dGV4dC9jc3Y7Y2hhcnNldD11dGYtOCwke2VuY29kZVVSSUNvbXBvbmVudChjc3ZDb250ZW50KX1gLFxuICAgICAgICAgICAgZmlsZW5hbWU6IGZpbGVuYW1lLFxuICAgICAgICAgICAgc2F2ZUFzOiBmYWxzZSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIChkb3dubG9hZElkKSA9PiB7XG4gICAgICAgICAgICBpZiAoY2hyb21lLnJ1bnRpbWUubGFzdEVycm9yKSB7XG4gICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJUcmFja1B1bGw6IERvd25sb2FkIGZhaWxlZDpcIiwgY2hyb21lLnJ1bnRpbWUubGFzdEVycm9yKTtcbiAgICAgICAgICAgICAgY29uc3QgZXJyb3JNZXNzYWdlID0gZ2V0RG93bmxvYWRFcnJvck1lc3NhZ2UoY2hyb21lLnJ1bnRpbWUubGFzdEVycm9yLm1lc3NhZ2UpO1xuICAgICAgICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yTWVzc2FnZSB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBUcmFja1B1bGw6IENTViBleHBvcnRlZCB3aXRoIGRvd25sb2FkIElEICR7ZG93bmxvYWRJZH1gKTtcbiAgICAgICAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogdHJ1ZSwgZG93bmxvYWRJZCwgZmlsZW5hbWUgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICApO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIlRyYWNrUHVsbDogQ1NWIGdlbmVyYXRpb24gZmFpbGVkOlwiLCBlcnJvcik7XG4gICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpIH0pO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG59KTtcblxuY2hyb21lLnN0b3JhZ2Uub25DaGFuZ2VkLmFkZExpc3RlbmVyKChjaGFuZ2VzLCBuYW1lc3BhY2UpID0+IHtcbiAgaWYgKG5hbWVzcGFjZSA9PT0gXCJsb2NhbFwiICYmIGNoYW5nZXNbU1RPUkFHRV9LRVlTLlRSQUNLTUFOX0RBVEFdKSB7XG4gICAgY29uc3QgbmV3VmFsdWUgPSBjaGFuZ2VzW1NUT1JBR0VfS0VZUy5UUkFDS01BTl9EQVRBXS5uZXdWYWx1ZTtcbiAgICBjaHJvbWUucnVudGltZS5zZW5kTWVzc2FnZSh7IHR5cGU6IFwiREFUQV9VUERBVEVEXCIsIGRhdGE6IG5ld1ZhbHVlIH0pLmNhdGNoKCgpID0+IHtcbiAgICAgIC8vIElnbm9yZSBlcnJvcnMgd2hlbiBubyBwb3B1cCBpcyBsaXN0ZW5pbmdcbiAgICB9KTtcbiAgfVxufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7O0FBQUEsTUE0RWEsc0JBOERBO0FBMUliO0FBQUE7QUE0RU8sTUFBTSx1QkFBK0M7QUFBQSxRQUMxRCxXQUFXO0FBQUEsUUFDWCxXQUFXO0FBQUEsUUFDWCxhQUFhO0FBQUEsUUFDYixhQUFhO0FBQUEsUUFDYixVQUFVO0FBQUEsUUFDVixXQUFXO0FBQUEsUUFDWCxZQUFZO0FBQUEsUUFDWixnQkFBZ0I7QUFBQSxRQUNoQixhQUFhO0FBQUEsUUFDYixVQUFVO0FBQUEsUUFDVixVQUFVO0FBQUEsUUFDVixVQUFVO0FBQUEsUUFDVixhQUFhO0FBQUEsUUFDYixpQkFBaUI7QUFBQSxRQUNqQixPQUFPO0FBQUEsUUFDUCxPQUFPO0FBQUEsUUFDUCxNQUFNO0FBQUEsUUFDTixXQUFXO0FBQUEsUUFDWCxXQUFXO0FBQUEsUUFDWCxXQUFXO0FBQUEsUUFDWCxRQUFRO0FBQUEsUUFDUixXQUFXO0FBQUEsUUFDWCxPQUFPO0FBQUEsUUFDUCxjQUFjO0FBQUEsUUFDZCxVQUFVO0FBQUEsUUFDVixrQkFBa0I7QUFB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
