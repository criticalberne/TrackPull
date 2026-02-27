(() => {
  // src/shared/constants.ts
  var METRIC_DISPLAY_NAMES = {
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
  var STORAGE_KEYS = {
    TRACKMAN_DATA: "trackmanData",
    UNIT_PREF: "unitPreference"
  };

  // src/shared/unit_normalization.ts
  var UNIT_SYSTEMS = {
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
  var DISTANCE_METRICS = /* @__PURE__ */ new Set([
    "Carry",
    "Total",
    "Side",
    "SideTotal",
    "Height",
    "LowPointDistance"
  ]);
  var ANGLE_METRICS = /* @__PURE__ */ new Set([
    "AttackAngle",
    "ClubPath",
    "FaceAngle",
    "FaceToPath",
    "DynamicLoft",
    "LaunchAngle",
    "LaunchDirection"
  ]);
  var SPEED_METRICS = /* @__PURE__ */ new Set([
    "ClubSpeed",
    "BallSpeed",
    "Tempo"
  ]);
  var DEFAULT_UNIT_SYSTEM = UNIT_SYSTEMS["789012"];
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
    const inMs = fromUnit === "m/s" ? numValue : fromUnit === "mph" ? numValue * 0.44704 : numValue / 3.6;
    return toUnit === "m/s" ? inMs : toUnit === "mph" ? inMs / 0.44704 : inMs * 3.6;
  }
  var TARGET_UNITS = {
    imperial: { distance: "yards", speed: "mph", angle: "degrees" },
    metric: { distance: "meters", speed: "m/s", angle: "degrees" }
  };
  var UNIT_LABELS = {
    mph: "mph",
    "km/h": "km/h",
    "m/s": "m/s",
    yards: "yds",
    meters: "m",
    degrees: "\xB0",
    radians: "rad"
  };
  function getMetricUnitLabel(metricName, unitPref = "imperial") {
    const target = TARGET_UNITS[unitPref];
    if (DISTANCE_METRICS.has(metricName)) return UNIT_LABELS[target.distance];
    if (SPEED_METRICS.has(metricName)) return UNIT_LABELS[target.speed];
    if (ANGLE_METRICS.has(metricName)) return UNIT_LABELS[target.angle];
    return "";
  }
  function getApiSourceUnitSystem(metadataParams) {
    const reportSystem = getUnitSystem(metadataParams);
    return {
      ...reportSystem,
      speedUnit: "m/s",
      distanceUnit: "meters"
    };
  }
  function normalizeMetricValue(value, metricName, reportUnitSystem, unitPref = "imperial") {
    const numValue = parseNumericValue(value);
    if (numValue === null) return value;
    const target = TARGET_UNITS[unitPref];
    let converted;
    if (DISTANCE_METRICS.has(metricName)) {
      converted = convertDistance(
        numValue,
        reportUnitSystem.distanceUnit,
        target.distance
      );
    } else if (ANGLE_METRICS.has(metricName)) {
      converted = convertAngle(
        numValue,
        reportUnitSystem.angleUnit,
        target.angle
      );
    } else if (SPEED_METRICS.has(metricName)) {
      converted = convertSpeed(
        numValue,
        reportUnitSystem.speedUnit,
        target.speed
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

  // src/shared/csv_writer.ts
  var METRIC_COLUMN_ORDER = [
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
  function getDisplayName(metric) {
    return METRIC_DISPLAY_NAMES[metric] ?? metric;
  }
  function getColumnName(metric, unitPref) {
    const name = getDisplayName(metric);
    const unit = getMetricUnitLabel(metric, unitPref);
    return unit ? `${name} (${unit})` : name;
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
  function writeCsv(session, includeAverages = true, metricOrder, unitPref = "imperial") {
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
      headerRow.push(getColumnName(metric, unitPref));
    }
    const rows = [];
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
        const unitSystem2 = getApiSourceUnitSystem(session.metadata_params);
        for (const metric of orderedMetrics) {
          const colName = getColumnName(metric, unitPref);
          let rawValue = shot.metrics[metric] ?? "";
          if (typeof rawValue === "string" || typeof rawValue === "number") {
            row[colName] = String(normalizeMetricValue(rawValue, metric, unitSystem2, unitPref));
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
          const colName = getColumnName(metric, unitPref);
          let rawValue = club.averages[metric] ?? "";
          if (typeof rawValue === "string" || typeof rawValue === "number") {
            avgRow[colName] = String(normalizeMetricValue(rawValue, metric, unitSystem, unitPref));
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
          const colName = getColumnName(metric, unitPref);
          let rawValue = club.consistency[metric] ?? "";
          if (typeof rawValue === "string" || typeof rawValue === "number") {
            consRow[colName] = String(normalizeMetricValue(rawValue, metric, unitSystem, unitPref));
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

  // src/background/serviceWorker.ts
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
      chrome.storage.local.get([STORAGE_KEYS.TRACKMAN_DATA, STORAGE_KEYS.UNIT_PREF], (result) => {
        const data = result[STORAGE_KEYS.TRACKMAN_DATA];
        if (!data || !data.club_groups || data.club_groups.length === 0) {
          sendResponse({ success: false, error: "No data to export" });
          return;
        }
        try {
          const unitPref = result[STORAGE_KEYS.UNIT_PREF] || "imperial";
          const csvContent = writeCsv(data, true, void 0, unitPref);
          const filename = `ShotData_${data.date || "unknown"}_bhn.csv`;
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
})();
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL3NoYXJlZC9jb25zdGFudHMudHMiLCAiLi4vc3JjL3NoYXJlZC91bml0X25vcm1hbGl6YXRpb24udHMiLCAiLi4vc3JjL3NoYXJlZC9jc3Zfd3JpdGVyLnRzIiwgIi4uL3NyYy9iYWNrZ3JvdW5kL3NlcnZpY2VXb3JrZXIudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbIi8qKlxuICogU2hhcmVkIGNvbnN0YW50cyBpbmNsdWRpbmcgQ1NTIHNlbGVjdG9ycyBhbmQgY29uZmlndXJhdGlvbi5cbiAqIEJhc2VkIG9uIFB5dGhvbiBzY3JhcGVyIGNvbnN0YW50cy5weSBpbXBsZW1lbnRhdGlvbi5cbiAqL1xuXG4vLyBDb21wbGV0ZSBsaXN0IG9mIGFsbCBrbm93biBUcmFja21hbiBtZXRyaWNzIChVUkwgcGFyYW1ldGVyIG5hbWVzKVxuZXhwb3J0IGNvbnN0IEFMTF9NRVRSSUNTID0gW1xuICBcIkNsdWJTcGVlZFwiLFxuICBcIkJhbGxTcGVlZFwiLFxuICBcIlNtYXNoRmFjdG9yXCIsXG4gIFwiQXR0YWNrQW5nbGVcIixcbiAgXCJDbHViUGF0aFwiLFxuICBcIkZhY2VBbmdsZVwiLFxuICBcIkZhY2VUb1BhdGhcIixcbiAgXCJTd2luZ0RpcmVjdGlvblwiLFxuICBcIkR5bmFtaWNMb2Z0XCIsXG4gIFwiU3BpblJhdGVcIixcbiAgXCJTcGluQXhpc1wiLFxuICBcIlNwaW5Mb2Z0XCIsXG4gIFwiTGF1bmNoQW5nbGVcIixcbiAgXCJMYXVuY2hEaXJlY3Rpb25cIixcbiAgXCJDYXJyeVwiLFxuICBcIlRvdGFsXCIsXG4gIFwiU2lkZVwiLFxuICBcIlNpZGVUb3RhbFwiLFxuICBcIkNhcnJ5U2lkZVwiLFxuICBcIlRvdGFsU2lkZVwiLFxuICBcIkhlaWdodFwiLFxuICBcIk1heEhlaWdodFwiLFxuICBcIkN1cnZlXCIsXG4gIFwiTGFuZGluZ0FuZ2xlXCIsXG4gIFwiSGFuZ1RpbWVcIixcbiAgXCJMb3dQb2ludERpc3RhbmNlXCIsXG4gIFwiSW1wYWN0SGVpZ2h0XCIsXG4gIFwiSW1wYWN0T2Zmc2V0XCIsXG4gIFwiVGVtcG9cIixcbl0gYXMgY29uc3Q7XG5cbi8vIE1ldHJpY3Mgc3BsaXQgaW50byBncm91cHMgZm9yIG11bHRpLXBhZ2UtbG9hZCBIVE1MIGZhbGxiYWNrXG5leHBvcnQgY29uc3QgTUVUUklDX0dST1VQUyA9IFtcbiAgW1xuICAgIFwiQ2x1YlNwZWVkXCIsXG4gICAgXCJCYWxsU3BlZWRcIixcbiAgICBcIlNtYXNoRmFjdG9yXCIsXG4gICAgXCJBdHRhY2tBbmdsZVwiLFxuICAgIFwiQ2x1YlBhdGhcIixcbiAgICBcIkZhY2VBbmdsZVwiLFxuICAgIFwiRmFjZVRvUGF0aFwiLFxuICAgIFwiU3dpbmdEaXJlY3Rpb25cIixcbiAgICBcIkR5bmFtaWNMb2Z0XCIsXG4gICAgXCJTcGluTG9mdFwiLFxuICBdLFxuICBbXG4gICAgXCJTcGluUmF0ZVwiLFxuICAgIFwiU3BpbkF4aXNcIixcbiAgICBcIkxhdW5jaEFuZ2xlXCIsXG4gICAgXCJMYXVuY2hEaXJlY3Rpb25cIixcbiAgICBcIkNhcnJ5XCIsXG4gICAgXCJUb3RhbFwiLFxuICAgIFwiU2lkZVwiLFxuICAgIFwiU2lkZVRvdGFsXCIsXG4gICAgXCJDYXJyeVNpZGVcIixcbiAgICBcIlRvdGFsU2lkZVwiLFxuICAgIFwiSGVpZ2h0XCIsXG4gICAgXCJNYXhIZWlnaHRcIixcbiAgICBcIkN1cnZlXCIsXG4gICAgXCJMYW5kaW5nQW5nbGVcIixcbiAgICBcIkhhbmdUaW1lXCIsXG4gICAgXCJMb3dQb2ludERpc3RhbmNlXCIsXG4gICAgXCJJbXBhY3RIZWlnaHRcIixcbiAgICBcIkltcGFjdE9mZnNldFwiLFxuICAgIFwiVGVtcG9cIixcbiAgXSxcbl0gYXMgY29uc3Q7XG5cbi8vIERpc3BsYXkgbmFtZXM6IFVSTCBwYXJhbSBuYW1lIC0+IGh1bWFuLXJlYWRhYmxlIENTViBoZWFkZXJcbmV4cG9ydCBjb25zdCBNRVRSSUNfRElTUExBWV9OQU1FUzogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcbiAgQ2x1YlNwZWVkOiBcIkNsdWIgU3BlZWRcIixcbiAgQmFsbFNwZWVkOiBcIkJhbGwgU3BlZWRcIixcbiAgU21hc2hGYWN0b3I6IFwiU21hc2ggRmFjdG9yXCIsXG4gIEF0dGFja0FuZ2xlOiBcIkF0dGFjayBBbmdsZVwiLFxuICBDbHViUGF0aDogXCJDbHViIFBhdGhcIixcbiAgRmFjZUFuZ2xlOiBcIkZhY2UgQW5nbGVcIixcbiAgRmFjZVRvUGF0aDogXCJGYWNlIFRvIFBhdGhcIixcbiAgU3dpbmdEaXJlY3Rpb246IFwiU3dpbmcgRGlyZWN0aW9uXCIsXG4gIER5bmFtaWNMb2Z0OiBcIkR5bmFtaWMgTG9mdFwiLFxuICBTcGluUmF0ZTogXCJTcGluIFJhdGVcIixcbiAgU3BpbkF4aXM6IFwiU3BpbiBBeGlzXCIsXG4gIFNwaW5Mb2Z0OiBcIlNwaW4gTG9mdFwiLFxuICBMYXVuY2hBbmdsZTogXCJMYXVuY2ggQW5nbGVcIixcbiAgTGF1bmNoRGlyZWN0aW9uOiBcIkxhdW5jaCBEaXJlY3Rpb25cIixcbiAgQ2Fycnk6IFwiQ2FycnlcIixcbiAgVG90YWw6IFwiVG90YWxcIixcbiAgU2lkZTogXCJTaWRlXCIsXG4gIFNpZGVUb3RhbDogXCJTaWRlIFRvdGFsXCIsXG4gIENhcnJ5U2lkZTogXCJDYXJyeSBTaWRlXCIsXG4gIFRvdGFsU2lkZTogXCJUb3RhbCBTaWRlXCIsXG4gIEhlaWdodDogXCJIZWlnaHRcIixcbiAgTWF4SGVpZ2h0OiBcIk1heCBIZWlnaHRcIixcbiAgQ3VydmU6IFwiQ3VydmVcIixcbiAgTGFuZGluZ0FuZ2xlOiBcIkxhbmRpbmcgQW5nbGVcIixcbiAgSGFuZ1RpbWU6IFwiSGFuZyBUaW1lXCIsXG4gIExvd1BvaW50RGlzdGFuY2U6IFwiTG93IFBvaW50XCIsXG4gIEltcGFjdEhlaWdodDogXCJJbXBhY3QgSGVpZ2h0XCIsXG4gIEltcGFjdE9mZnNldDogXCJJbXBhY3QgT2Zmc2V0XCIsXG4gIFRlbXBvOiBcIlRlbXBvXCIsXG59O1xuXG4vLyBDU1MgY2xhc3Mgc2VsZWN0b3JzIChmcm9tIFRyYWNrbWFuJ3MgcmVuZGVyZWQgSFRNTClcbmV4cG9ydCBjb25zdCBDU1NfREFURSA9IFwiZGF0ZVwiO1xuZXhwb3J0IGNvbnN0IENTU19SRVNVTFRTX1dSQVBQRVIgPSBcInBsYXllci1hbmQtcmVzdWx0cy10YWJsZS13cmFwcGVyXCI7XG5leHBvcnQgY29uc3QgQ1NTX1JFU1VMVFNfVEFCTEUgPSBcIlJlc3VsdHNUYWJsZVwiO1xuZXhwb3J0IGNvbnN0IENTU19DTFVCX1RBRyA9IFwiZ3JvdXAtdGFnXCI7XG5leHBvcnQgY29uc3QgQ1NTX1BBUkFNX05BTUVTX1JPVyA9IFwicGFyYW1ldGVyLW5hbWVzLXJvd1wiO1xuZXhwb3J0IGNvbnN0IENTU19QQVJBTV9OQU1FID0gXCJwYXJhbWV0ZXItbmFtZVwiO1xuZXhwb3J0IGNvbnN0IENTU19TSE9UX0RFVEFJTF9ST1cgPSBcInJvdy13aXRoLXNob3QtZGV0YWlsc1wiO1xuZXhwb3J0IGNvbnN0IENTU19BVkVSQUdFX1ZBTFVFUyA9IFwiYXZlcmFnZS12YWx1ZXNcIjtcbmV4cG9ydCBjb25zdCBDU1NfQ09OU0lTVEVOQ1lfVkFMVUVTID0gXCJjb25zaXN0ZW5jeS12YWx1ZXNcIjtcblxuLy8gQVBJIFVSTCBwYXR0ZXJucyB0aGF0IGxpa2VseSBpbmRpY2F0ZSBhbiBBUEkgZGF0YSByZXNwb25zZVxuZXhwb3J0IGNvbnN0IEFQSV9VUkxfUEFUVEVSTlMgPSBbXG4gIFwiYXBpLnRyYWNrbWFuZ29sZi5jb21cIixcbiAgXCJ0cmFja21hbmdvbGYuY29tL2FwaVwiLFxuICBcIi9hcGkvXCIsXG4gIFwiL3JlcG9ydHMvXCIsXG4gIFwiL2FjdGl2aXRpZXMvXCIsXG4gIFwiL3Nob3RzL1wiLFxuICBcImdyYXBocWxcIixcbl07XG5cbi8vIFRpbWVvdXRzIChtaWxsaXNlY29uZHMpXG5leHBvcnQgY29uc3QgUEFHRV9MT0FEX1RJTUVPVVQgPSAzMF8wMDA7XG5leHBvcnQgY29uc3QgREFUQV9MT0FEX1RJTUVPVVQgPSAxNV8wMDA7XG5cbi8vIFRyYWNrbWFuIGJhc2UgVVJMXG5leHBvcnQgY29uc3QgQkFTRV9VUkwgPSBcImh0dHBzOi8vd2ViLWR5bmFtaWMtcmVwb3J0cy50cmFja21hbmdvbGYuY29tL1wiO1xuXG4vLyBTdG9yYWdlIGtleXMgZm9yIENocm9tZSBleHRlbnNpb24gKGFsaWduZWQgYmV0d2VlbiBiYWNrZ3JvdW5kIGFuZCBwb3B1cClcbmV4cG9ydCBjb25zdCBTVE9SQUdFX0tFWVMgPSB7XG4gIFRSQUNLTUFOX0RBVEE6IFwidHJhY2ttYW5EYXRhXCIsXG4gIFVOSVRfUFJFRjogXCJ1bml0UHJlZmVyZW5jZVwiLFxufSBhcyBjb25zdDtcbiIsICIvKipcbiAqIFVuaXQgbm9ybWFsaXphdGlvbiB1dGlsaXRpZXMgZm9yIFRyYWNrbWFuIG1lYXN1cmVtZW50cy5cbiAqIFxuICogVHJhY2ttYW4gdXNlcyBuZF8qIHBhcmFtZXRlcnMgdG8gc3BlY2lmeSB1bml0czpcbiAqIC0gbmRfMDAxLCBuZF8wMDIsIGV0Yy4gZGVmaW5lIHVuaXQgc3lzdGVtcyBmb3IgZGlmZmVyZW50IG1lYXN1cmVtZW50IGdyb3Vwc1xuICogLSBDb21tb24gdmFsdWVzOiA3ODkwMTIgPSB5YXJkcy9kZWdyZWVzLCA3ODkwMTMgPSBtZXRlcnMvcmFkaWFuc1xuICovXG5cbmV4cG9ydCB0eXBlIFVuaXRTeXN0ZW1JZCA9IFwiNzg5MDEyXCIgfCBcIjc4OTAxM1wiIHwgXCI3ODkwMTRcIiB8IHN0cmluZztcblxuZXhwb3J0IHR5cGUgVW5pdFByZWZlcmVuY2UgPSBcImltcGVyaWFsXCIgfCBcIm1ldHJpY1wiO1xuXG4vKipcbiAqIFRyYWNrbWFuIHVuaXQgc3lzdGVtIGRlZmluaXRpb25zLlxuICogTWFwcyBuZF8qIHBhcmFtZXRlciB2YWx1ZXMgdG8gYWN0dWFsIHVuaXRzIGZvciBlYWNoIG1ldHJpYy5cbiAqL1xuZXhwb3J0IGNvbnN0IFVOSVRfU1lTVEVNUzogUmVjb3JkPFVuaXRTeXN0ZW1JZCwgVW5pdFN5c3RlbT4gPSB7XG4gIC8vIEltcGVyaWFsICh5YXJkcywgZGVncmVlcykgLSBtb3N0IGNvbW1vblxuICBcIjc4OTAxMlwiOiB7XG4gICAgaWQ6IFwiNzg5MDEyXCIsXG4gICAgbmFtZTogXCJJbXBlcmlhbFwiLFxuICAgIGRpc3RhbmNlVW5pdDogXCJ5YXJkc1wiLFxuICAgIGFuZ2xlVW5pdDogXCJkZWdyZWVzXCIsXG4gICAgc3BlZWRVbml0OiBcIm1waFwiLFxuICB9LFxuICAvLyBNZXRyaWMgKG1ldGVycywgcmFkaWFucylcbiAgXCI3ODkwMTNcIjoge1xuICAgIGlkOiBcIjc4OTAxM1wiLFxuICAgIG5hbWU6IFwiTWV0cmljIChyYWQpXCIsXG4gICAgZGlzdGFuY2VVbml0OiBcIm1ldGVyc1wiLFxuICAgIGFuZ2xlVW5pdDogXCJyYWRpYW5zXCIsXG4gICAgc3BlZWRVbml0OiBcImttL2hcIixcbiAgfSxcbiAgLy8gTWV0cmljIChtZXRlcnMsIGRlZ3JlZXMpIC0gbGVzcyBjb21tb25cbiAgXCI3ODkwMTRcIjoge1xuICAgIGlkOiBcIjc4OTAxNFwiLFxuICAgIG5hbWU6IFwiTWV0cmljIChkZWcpXCIsXG4gICAgZGlzdGFuY2VVbml0OiBcIm1ldGVyc1wiLFxuICAgIGFuZ2xlVW5pdDogXCJkZWdyZWVzXCIsXG4gICAgc3BlZWRVbml0OiBcImttL2hcIixcbiAgfSxcbn07XG5cbi8qKlxuICogVW5pdCBzeXN0ZW0gY29uZmlndXJhdGlvbi5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBVbml0U3lzdGVtIHtcbiAgaWQ6IFVuaXRTeXN0ZW1JZDtcbiAgbmFtZTogc3RyaW5nO1xuICBkaXN0YW5jZVVuaXQ6IFwieWFyZHNcIiB8IFwibWV0ZXJzXCI7XG4gIGFuZ2xlVW5pdDogXCJkZWdyZWVzXCIgfCBcInJhZGlhbnNcIjtcbiAgc3BlZWRVbml0OiBcIm1waFwiIHwgXCJrbS9oXCIgfCBcIm0vc1wiO1xufVxuXG4vKipcbiAqIE1ldHJpY3MgdGhhdCB1c2UgZGlzdGFuY2UgdW5pdHMuXG4gKi9cbmV4cG9ydCBjb25zdCBESVNUQU5DRV9NRVRSSUNTID0gbmV3IFNldChbXG4gIFwiQ2FycnlcIixcbiAgXCJUb3RhbFwiLFxuICBcIlNpZGVcIixcbiAgXCJTaWRlVG90YWxcIixcbiAgXCJIZWlnaHRcIixcbiAgXCJMb3dQb2ludERpc3RhbmNlXCIsXG5dKTtcblxuLyoqXG4gKiBNZXRyaWNzIHRoYXQgdXNlIGFuZ2xlIHVuaXRzLlxuICovXG5leHBvcnQgY29uc3QgQU5HTEVfTUVUUklDUyA9IG5ldyBTZXQoW1xuICBcIkF0dGFja0FuZ2xlXCIsXG4gIFwiQ2x1YlBhdGhcIixcbiAgXCJGYWNlQW5nbGVcIixcbiAgXCJGYWNlVG9QYXRoXCIsXG4gIFwiRHluYW1pY0xvZnRcIixcbiAgXCJMYXVuY2hBbmdsZVwiLFxuICBcIkxhdW5jaERpcmVjdGlvblwiLFxuXSk7XG5cbi8qKlxuICogTWV0cmljcyB0aGF0IHVzZSBzcGVlZCB1bml0cy5cbiAqL1xuZXhwb3J0IGNvbnN0IFNQRUVEX01FVFJJQ1MgPSBuZXcgU2V0KFtcbiAgXCJDbHViU3BlZWRcIixcbiAgXCJCYWxsU3BlZWRcIixcbiAgXCJUZW1wb1wiLFxuXSk7XG5cbi8qKlxuICogRGVmYXVsdCB1bml0IHN5c3RlbSAoSW1wZXJpYWwgLSB5YXJkcy9kZWdyZWVzKS5cbiAqL1xuZXhwb3J0IGNvbnN0IERFRkFVTFRfVU5JVF9TWVNURU06IFVuaXRTeXN0ZW0gPSBVTklUX1NZU1RFTVNbXCI3ODkwMTJcIl07XG5cbi8qKlxuICogRXh0cmFjdCBuZF8qIHBhcmFtZXRlcnMgZnJvbSBtZXRhZGF0YV9wYXJhbXMuXG4gKiBcbiAqIEBwYXJhbSBtZXRhZGF0YVBhcmFtcyAtIFRoZSBtZXRhZGF0YV9wYXJhbXMgb2JqZWN0IGZyb20gU2Vzc2lvbkRhdGFcbiAqIEByZXR1cm5zIE9iamVjdCBtYXBwaW5nIG1ldHJpYyBncm91cCBJRHMgdG8gdW5pdCBzeXN0ZW0gSURzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBleHRyYWN0VW5pdFBhcmFtcyhcbiAgbWV0YWRhdGFQYXJhbXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz5cbik6IFJlY29yZDxzdHJpbmcsIFVuaXRTeXN0ZW1JZD4ge1xuICBjb25zdCByZXN1bHQ6IFJlY29yZDxzdHJpbmcsIFVuaXRTeXN0ZW1JZD4gPSB7fTtcblxuICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyhtZXRhZGF0YVBhcmFtcykpIHtcbiAgICBjb25zdCBtYXRjaCA9IGtleS5tYXRjaCgvXm5kXyhbYS16MC05XSspJC9pKTtcbiAgICBpZiAobWF0Y2gpIHtcbiAgICAgIGNvbnN0IGdyb3VwS2V5ID0gbWF0Y2hbMV0udG9Mb3dlckNhc2UoKTtcbiAgICAgIHJlc3VsdFtncm91cEtleV0gPSB2YWx1ZSBhcyBVbml0U3lzdGVtSWQ7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmUgdGhlIHVuaXQgc3lzdGVtIElEIGZyb20gbWV0YWRhdGEgcGFyYW1zLlxuICogVXNlcyBuZF8wMDEgYXMgcHJpbWFyeSwgZmFsbHMgYmFjayB0byBkZWZhdWx0LlxuICogXG4gKiBAcGFyYW0gbWV0YWRhdGFQYXJhbXMgLSBUaGUgbWV0YWRhdGFfcGFyYW1zIG9iamVjdFxuICogQHJldHVybnMgVGhlIHVuaXQgc3lzdGVtIElEIHN0cmluZ1xuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0VW5pdFN5c3RlbUlkKFxuICBtZXRhZGF0YVBhcmFtczogUmVjb3JkPHN0cmluZywgc3RyaW5nPlxuKTogVW5pdFN5c3RlbUlkIHtcbiAgY29uc3QgdW5pdFBhcmFtcyA9IGV4dHJhY3RVbml0UGFyYW1zKG1ldGFkYXRhUGFyYW1zKTtcbiAgcmV0dXJuIHVuaXRQYXJhbXNbXCIwMDFcIl0gfHwgXCI3ODkwMTJcIjsgLy8gRGVmYXVsdCB0byBJbXBlcmlhbFxufVxuXG4vKipcbiAqIEdldCB0aGUgZnVsbCB1bml0IHN5c3RlbSBjb25maWd1cmF0aW9uLlxuICogXG4gKiBAcGFyYW0gbWV0YWRhdGFQYXJhbXMgLSBUaGUgbWV0YWRhdGFfcGFyYW1zIG9iamVjdFxuICogQHJldHVybnMgVGhlIFVuaXRTeXN0ZW0gY29uZmlndXJhdGlvblxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0VW5pdFN5c3RlbShcbiAgbWV0YWRhdGFQYXJhbXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz5cbik6IFVuaXRTeXN0ZW0ge1xuICBjb25zdCBpZCA9IGdldFVuaXRTeXN0ZW1JZChtZXRhZGF0YVBhcmFtcyk7XG4gIHJldHVybiBVTklUX1NZU1RFTVNbaWRdIHx8IERFRkFVTFRfVU5JVF9TWVNURU07XG59XG5cbi8qKlxuICogQ29udmVydCBhIGRpc3RhbmNlIHZhbHVlIGJldHdlZW4gdW5pdHMuXG4gKiBcbiAqIEBwYXJhbSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byBjb252ZXJ0XG4gKiBAcGFyYW0gZnJvbVVuaXQgLSBTb3VyY2UgdW5pdCAoXCJ5YXJkc1wiIG9yIFwibWV0ZXJzXCIpXG4gKiBAcGFyYW0gdG9Vbml0IC0gVGFyZ2V0IHVuaXQgKFwieWFyZHNcIiBvciBcIm1ldGVyc1wiKVxuICogQHJldHVybnMgQ29udmVydGVkIHZhbHVlLCBvciBvcmlnaW5hbCBpZiB1bml0cyBtYXRjaFxuICovXG5leHBvcnQgZnVuY3Rpb24gY29udmVydERpc3RhbmNlKFxuICB2YWx1ZTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbCxcbiAgZnJvbVVuaXQ6IFwieWFyZHNcIiB8IFwibWV0ZXJzXCIsXG4gIHRvVW5pdDogXCJ5YXJkc1wiIHwgXCJtZXRlcnNcIlxuKTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbCB7XG4gIGlmICh2YWx1ZSA9PT0gbnVsbCB8fCB2YWx1ZSA9PT0gXCJcIikgcmV0dXJuIHZhbHVlO1xuXG4gIGNvbnN0IG51bVZhbHVlID0gdHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiID8gcGFyc2VGbG9hdCh2YWx1ZSkgOiB2YWx1ZTtcbiAgaWYgKGlzTmFOKG51bVZhbHVlKSkgcmV0dXJuIHZhbHVlO1xuXG4gIGlmIChmcm9tVW5pdCA9PT0gdG9Vbml0KSByZXR1cm4gbnVtVmFsdWU7XG5cbiAgLy8gQ29udmVydCB0byBtZXRlcnMgZmlyc3QsIHRoZW4gdG8gdGFyZ2V0IHVuaXRcbiAgY29uc3QgaW5NZXRlcnMgPSBmcm9tVW5pdCA9PT0gXCJ5YXJkc1wiID8gbnVtVmFsdWUgKiAwLjkxNDQgOiBudW1WYWx1ZTtcbiAgcmV0dXJuIHRvVW5pdCA9PT0gXCJ5YXJkc1wiID8gaW5NZXRlcnMgLyAwLjkxNDQgOiBpbk1ldGVycztcbn1cblxuLyoqXG4gKiBDb252ZXJ0IGFuIGFuZ2xlIHZhbHVlIGJldHdlZW4gdW5pdHMuXG4gKiBcbiAqIEBwYXJhbSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byBjb252ZXJ0XG4gKiBAcGFyYW0gZnJvbVVuaXQgLSBTb3VyY2UgdW5pdCAoXCJkZWdyZWVzXCIgb3IgXCJyYWRpYW5zXCIpXG4gKiBAcGFyYW0gdG9Vbml0IC0gVGFyZ2V0IHVuaXQgKFwiZGVncmVlc1wiIG9yIFwicmFkaWFuc1wiKVxuICogQHJldHVybnMgQ29udmVydGVkIHZhbHVlLCBvciBvcmlnaW5hbCBpZiB1bml0cyBtYXRjaFxuICovXG5leHBvcnQgZnVuY3Rpb24gY29udmVydEFuZ2xlKFxuICB2YWx1ZTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbCxcbiAgZnJvbVVuaXQ6IFwiZGVncmVlc1wiIHwgXCJyYWRpYW5zXCIsXG4gIHRvVW5pdDogXCJkZWdyZWVzXCIgfCBcInJhZGlhbnNcIlxuKTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbCB7XG4gIGlmICh2YWx1ZSA9PT0gbnVsbCB8fCB2YWx1ZSA9PT0gXCJcIikgcmV0dXJuIHZhbHVlO1xuXG4gIGNvbnN0IG51bVZhbHVlID0gdHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiID8gcGFyc2VGbG9hdCh2YWx1ZSkgOiB2YWx1ZTtcbiAgaWYgKGlzTmFOKG51bVZhbHVlKSkgcmV0dXJuIHZhbHVlO1xuXG4gIGlmIChmcm9tVW5pdCA9PT0gdG9Vbml0KSByZXR1cm4gbnVtVmFsdWU7XG5cbiAgLy8gQ29udmVydCB0byBkZWdyZWVzIGZpcnN0LCB0aGVuIHRvIHRhcmdldCB1bml0XG4gIGNvbnN0IGluRGVncmVlcyA9IGZyb21Vbml0ID09PSBcImRlZ3JlZXNcIiA/IG51bVZhbHVlIDogKG51bVZhbHVlICogMTgwIC8gTWF0aC5QSSk7XG4gIHJldHVybiB0b1VuaXQgPT09IFwiZGVncmVlc1wiID8gaW5EZWdyZWVzIDogKGluRGVncmVlcyAqIE1hdGguUEkgLyAxODApO1xufVxuXG4vKipcbiAqIENvbnZlcnQgYSBzcGVlZCB2YWx1ZSBiZXR3ZWVuIHVuaXRzLlxuICogXG4gKiBAcGFyYW0gdmFsdWUgLSBUaGUgdmFsdWUgdG8gY29udmVydFxuICogQHBhcmFtIGZyb21Vbml0IC0gU291cmNlIHVuaXQgKFwibXBoXCIgb3IgXCJrbS9oXCIpXG4gKiBAcGFyYW0gdG9Vbml0IC0gVGFyZ2V0IHVuaXQgKFwibXBoXCIgb3IgXCJrbS9oXCIpXG4gKiBAcmV0dXJucyBDb252ZXJ0ZWQgdmFsdWUsIG9yIG9yaWdpbmFsIGlmIHVuaXRzIG1hdGNoXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb252ZXJ0U3BlZWQoXG4gIHZhbHVlOiBudW1iZXIgfCBzdHJpbmcgfCBudWxsLFxuICBmcm9tVW5pdDogXCJtcGhcIiB8IFwia20vaFwiIHwgXCJtL3NcIixcbiAgdG9Vbml0OiBcIm1waFwiIHwgXCJrbS9oXCIgfCBcIm0vc1wiXG4pOiBudW1iZXIgfCBzdHJpbmcgfCBudWxsIHtcbiAgaWYgKHZhbHVlID09PSBudWxsIHx8IHZhbHVlID09PSBcIlwiKSByZXR1cm4gdmFsdWU7XG5cbiAgY29uc3QgbnVtVmFsdWUgPSB0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCIgPyBwYXJzZUZsb2F0KHZhbHVlKSA6IHZhbHVlO1xuICBpZiAoaXNOYU4obnVtVmFsdWUpKSByZXR1cm4gdmFsdWU7XG5cbiAgaWYgKGZyb21Vbml0ID09PSB0b1VuaXQpIHJldHVybiBudW1WYWx1ZTtcblxuICAvLyBDb252ZXJ0IHRvIG0vcyBmaXJzdCwgdGhlbiB0byB0YXJnZXQgdW5pdFxuICBjb25zdCBpbk1zID0gZnJvbVVuaXQgPT09IFwibS9zXCIgPyBudW1WYWx1ZVxuICAgIDogZnJvbVVuaXQgPT09IFwibXBoXCIgPyBudW1WYWx1ZSAqIDAuNDQ3MDRcbiAgICA6IG51bVZhbHVlIC8gMy42O1xuICByZXR1cm4gdG9Vbml0ID09PSBcIm0vc1wiID8gaW5Nc1xuICAgIDogdG9Vbml0ID09PSBcIm1waFwiID8gaW5NcyAvIDAuNDQ3MDRcbiAgICA6IGluTXMgKiAzLjY7XG59XG5cbi8qKlxuICogVGFyZ2V0IHVuaXQgc3lzdGVtcyBmb3IgZWFjaCBwcmVmZXJlbmNlLlxuICovXG5jb25zdCBUQVJHRVRfVU5JVFM6IFJlY29yZDxVbml0UHJlZmVyZW5jZSwgeyBkaXN0YW5jZTogXCJ5YXJkc1wiIHwgXCJtZXRlcnNcIjsgc3BlZWQ6IFwibXBoXCIgfCBcImttL2hcIiB8IFwibS9zXCI7IGFuZ2xlOiBcImRlZ3JlZXNcIiB8IFwicmFkaWFuc1wiIH0+ID0ge1xuICBpbXBlcmlhbDogeyBkaXN0YW5jZTogXCJ5YXJkc1wiLCBzcGVlZDogXCJtcGhcIiwgYW5nbGU6IFwiZGVncmVlc1wiIH0sXG4gIG1ldHJpYzogICB7IGRpc3RhbmNlOiBcIm1ldGVyc1wiLCBzcGVlZDogXCJtL3NcIiwgYW5nbGU6IFwiZGVncmVlc1wiIH0sXG59O1xuXG5jb25zdCBVTklUX0xBQkVMUzogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcbiAgbXBoOiBcIm1waFwiLFxuICBcImttL2hcIjogXCJrbS9oXCIsXG4gIFwibS9zXCI6IFwibS9zXCIsXG4gIHlhcmRzOiBcInlkc1wiLFxuICBtZXRlcnM6IFwibVwiLFxuICBkZWdyZWVzOiBcIlx1MDBCMFwiLFxuICByYWRpYW5zOiBcInJhZFwiLFxufTtcblxuLyoqXG4gKiBHZXQgdGhlIHVuaXQgbGFiZWwgZm9yIGEgbWV0cmljIHVuZGVyIHRoZSBnaXZlbiB1bml0IHByZWZlcmVuY2UuXG4gKiBSZXR1cm5zIGVtcHR5IHN0cmluZyBmb3IgbWV0cmljcyB3aXRoIG5vIHVuaXQgY29udmVyc2lvbiAoZS5nLiBTbWFzaEZhY3RvcikuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRNZXRyaWNVbml0TGFiZWwoXG4gIG1ldHJpY05hbWU6IHN0cmluZyxcbiAgdW5pdFByZWY6IFVuaXRQcmVmZXJlbmNlID0gXCJpbXBlcmlhbFwiXG4pOiBzdHJpbmcge1xuICBjb25zdCB0YXJnZXQgPSBUQVJHRVRfVU5JVFNbdW5pdFByZWZdO1xuICBpZiAoRElTVEFOQ0VfTUVUUklDUy5oYXMobWV0cmljTmFtZSkpIHJldHVybiBVTklUX0xBQkVMU1t0YXJnZXQuZGlzdGFuY2VdO1xuICBpZiAoU1BFRURfTUVUUklDUy5oYXMobWV0cmljTmFtZSkpIHJldHVybiBVTklUX0xBQkVMU1t0YXJnZXQuc3BlZWRdO1xuICBpZiAoQU5HTEVfTUVUUklDUy5oYXMobWV0cmljTmFtZSkpIHJldHVybiBVTklUX0xBQkVMU1t0YXJnZXQuYW5nbGVdO1xuICByZXR1cm4gXCJcIjtcbn1cblxuLyoqXG4gKiBCdWlsZCB0aGUgc291cmNlIHVuaXQgc3lzdGVtIGZvciBBUEktaW50ZXJjZXB0ZWQgZGF0YS5cbiAqXG4gKiBUaGUgVHJhY2ttYW4gQVBJIGFsd2F5cyByZXR1cm5zIHNwZWVkcyBpbiBtL3MgYW5kIGRpc3RhbmNlcyBpbiBtZXRlcnMsXG4gKiByZWdhcmRsZXNzIG9mIHRoZSByZXBvcnQncyBkaXNwbGF5IHNldHRpbmdzLiBBbmdsZXMgZm9sbG93IHRoZSByZXBvcnQnc1xuICogZGlzcGxheSB1bml0IChkZWdyZWVzIG9yIHJhZGlhbnMgZnJvbSBuZF8qIHBhcmFtcykuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRBcGlTb3VyY2VVbml0U3lzdGVtKFxuICBtZXRhZGF0YVBhcmFtczogUmVjb3JkPHN0cmluZywgc3RyaW5nPlxuKTogVW5pdFN5c3RlbSB7XG4gIGNvbnN0IHJlcG9ydFN5c3RlbSA9IGdldFVuaXRTeXN0ZW0obWV0YWRhdGFQYXJhbXMpO1xuICByZXR1cm4ge1xuICAgIC4uLnJlcG9ydFN5c3RlbSxcbiAgICBzcGVlZFVuaXQ6IFwibS9zXCIsXG4gICAgZGlzdGFuY2VVbml0OiBcIm1ldGVyc1wiLFxuICB9O1xufVxuXG4vKipcbiAqIE5vcm1hbGl6ZSBhIG1ldHJpYyB2YWx1ZSBmcm9tIHRoZSByZXBvcnQncyBuYXRpdmUgdW5pdHMgdG8gdGhlIHRhcmdldCB1bml0IHByZWZlcmVuY2UuXG4gKlxuICogQHBhcmFtIHZhbHVlIC0gVGhlIHJhdyBtZXRyaWMgdmFsdWVcbiAqIEBwYXJhbSBtZXRyaWNOYW1lIC0gVGhlIG5hbWUgb2YgdGhlIG1ldHJpYyBiZWluZyBub3JtYWxpemVkXG4gKiBAcGFyYW0gcmVwb3J0VW5pdFN5c3RlbSAtIFRoZSB1bml0IHN5c3RlbSB1c2VkIGluIHRoZSBzb3VyY2UgcmVwb3J0XG4gKiBAcGFyYW0gdW5pdFByZWYgLSBUYXJnZXQgdW5pdCBwcmVmZXJlbmNlIChkZWZhdWx0IFwiaW1wZXJpYWxcIilcbiAqIEByZXR1cm5zIE5vcm1hbGl6ZWQgdmFsdWUgYXMgbnVtYmVyIG9yIHN0cmluZyAobnVsbCBpZiBpbnZhbGlkKVxuICovXG5leHBvcnQgZnVuY3Rpb24gbm9ybWFsaXplTWV0cmljVmFsdWUoXG4gIHZhbHVlOiBNZXRyaWNWYWx1ZSxcbiAgbWV0cmljTmFtZTogc3RyaW5nLFxuICByZXBvcnRVbml0U3lzdGVtOiBVbml0U3lzdGVtLFxuICB1bml0UHJlZjogVW5pdFByZWZlcmVuY2UgPSBcImltcGVyaWFsXCJcbik6IE1ldHJpY1ZhbHVlIHtcbiAgY29uc3QgbnVtVmFsdWUgPSBwYXJzZU51bWVyaWNWYWx1ZSh2YWx1ZSk7XG4gIGlmIChudW1WYWx1ZSA9PT0gbnVsbCkgcmV0dXJuIHZhbHVlO1xuXG4gIGNvbnN0IHRhcmdldCA9IFRBUkdFVF9VTklUU1t1bml0UHJlZl07XG4gIGxldCBjb252ZXJ0ZWQ6IG51bWJlcjtcblxuICBpZiAoRElTVEFOQ0VfTUVUUklDUy5oYXMobWV0cmljTmFtZSkpIHtcbiAgICBjb252ZXJ0ZWQgPSBjb252ZXJ0RGlzdGFuY2UoXG4gICAgICBudW1WYWx1ZSxcbiAgICAgIHJlcG9ydFVuaXRTeXN0ZW0uZGlzdGFuY2VVbml0LFxuICAgICAgdGFyZ2V0LmRpc3RhbmNlXG4gICAgKSBhcyBudW1iZXI7XG4gIH0gZWxzZSBpZiAoQU5HTEVfTUVUUklDUy5oYXMobWV0cmljTmFtZSkpIHtcbiAgICBjb252ZXJ0ZWQgPSBjb252ZXJ0QW5nbGUoXG4gICAgICBudW1WYWx1ZSxcbiAgICAgIHJlcG9ydFVuaXRTeXN0ZW0uYW5nbGVVbml0LFxuICAgICAgdGFyZ2V0LmFuZ2xlXG4gICAgKSBhcyBudW1iZXI7XG4gIH0gZWxzZSBpZiAoU1BFRURfTUVUUklDUy5oYXMobWV0cmljTmFtZSkpIHtcbiAgICBjb252ZXJ0ZWQgPSBjb252ZXJ0U3BlZWQoXG4gICAgICBudW1WYWx1ZSxcbiAgICAgIHJlcG9ydFVuaXRTeXN0ZW0uc3BlZWRVbml0LFxuICAgICAgdGFyZ2V0LnNwZWVkXG4gICAgKSBhcyBudW1iZXI7XG4gIH0gZWxzZSB7XG4gICAgLy8gTm8gY29udmVyc2lvbiBuZWVkZWQgZm9yIHRoaXMgbWV0cmljIHR5cGVcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cblxuICAvLyBSb3VuZCB0byAxIGRlY2ltYWwgcGxhY2UgZm9yIGNvbnNpc3RlbmN5XG4gIHJldHVybiBNYXRoLnJvdW5kKGNvbnZlcnRlZCAqIDEwKSAvIDEwO1xufVxuXG4vKipcbiAqIFBhcnNlIGEgbnVtZXJpYyB2YWx1ZSBmcm9tIE1ldHJpY1ZhbHVlIHR5cGUuXG4gKi9cbmZ1bmN0aW9uIHBhcnNlTnVtZXJpY1ZhbHVlKHZhbHVlOiBNZXRyaWNWYWx1ZSk6IG51bWJlciB8IG51bGwge1xuICBpZiAodmFsdWUgPT09IG51bGwgfHwgdmFsdWUgPT09IFwiXCIpIHJldHVybiBudWxsO1xuICBpZiAodHlwZW9mIHZhbHVlID09PSBcIm51bWJlclwiKSByZXR1cm4gaXNOYU4odmFsdWUpID8gbnVsbCA6IHZhbHVlO1xuICBcbiAgY29uc3QgcGFyc2VkID0gcGFyc2VGbG9hdCh2YWx1ZSk7XG4gIHJldHVybiBpc05hTihwYXJzZWQpID8gbnVsbCA6IHBhcnNlZDtcbn1cblxuZXhwb3J0IHR5cGUgTWV0cmljVmFsdWUgPSBzdHJpbmcgfCBudW1iZXIgfCBudWxsO1xuIiwgIi8qKlxuICogQ1NWIHdyaXRlciBmb3IgVHJhY2tQdWxsIHNlc3Npb24gZGF0YS5cbiAqIEltcGxlbWVudHMgY29yZSBjb2x1bW5zOiBEYXRlLCBDbHViLCBTaG90ICMsIFR5cGVcbiAqL1xuXG5pbXBvcnQgdHlwZSB7IFNlc3Npb25EYXRhLCBDbHViR3JvdXAsIFNob3QgfSBmcm9tIFwiLi4vbW9kZWxzL3R5cGVzXCI7XG5pbXBvcnQge1xuICBnZXRBcGlTb3VyY2VVbml0U3lzdGVtLFxuICBnZXRNZXRyaWNVbml0TGFiZWwsXG4gIG5vcm1hbGl6ZU1ldHJpY1ZhbHVlLFxuICB0eXBlIFVuaXRQcmVmZXJlbmNlLFxufSBmcm9tIFwiLi91bml0X25vcm1hbGl6YXRpb25cIjtcbmltcG9ydCB7IE1FVFJJQ19ESVNQTEFZX05BTUVTIH0gZnJvbSBcIi4vY29uc3RhbnRzXCI7XG5cbmNvbnN0IE1FVFJJQ19DT0xVTU5fT1JERVI6IHN0cmluZ1tdID0gW1xuICAvLyBTcGVlZCAmIEVmZmljaWVuY3lcbiAgXCJDbHViU3BlZWRcIiwgXCJCYWxsU3BlZWRcIiwgXCJTbWFzaEZhY3RvclwiLFxuICAvLyBDbHViIERlbGl2ZXJ5XG4gIFwiQXR0YWNrQW5nbGVcIiwgXCJDbHViUGF0aFwiLCBcIkZhY2VBbmdsZVwiLCBcIkZhY2VUb1BhdGhcIiwgXCJTd2luZ0RpcmVjdGlvblwiLCBcIkR5bmFtaWNMb2Z0XCIsXG4gIC8vIExhdW5jaCAmIFNwaW5cbiAgXCJMYXVuY2hBbmdsZVwiLCBcIkxhdW5jaERpcmVjdGlvblwiLCBcIlNwaW5SYXRlXCIsIFwiU3BpbkF4aXNcIiwgXCJTcGluTG9mdFwiLFxuICAvLyBEaXN0YW5jZVxuICBcIkNhcnJ5XCIsIFwiVG90YWxcIixcbiAgLy8gRGlzcGVyc2lvblxuICBcIlNpZGVcIiwgXCJTaWRlVG90YWxcIiwgXCJDYXJyeVNpZGVcIiwgXCJUb3RhbFNpZGVcIiwgXCJDdXJ2ZVwiLFxuICAvLyBCYWxsIEZsaWdodFxuICBcIkhlaWdodFwiLCBcIk1heEhlaWdodFwiLCBcIkxhbmRpbmdBbmdsZVwiLCBcIkhhbmdUaW1lXCIsXG4gIC8vIEltcGFjdFxuICBcIkxvd1BvaW50RGlzdGFuY2VcIiwgXCJJbXBhY3RIZWlnaHRcIiwgXCJJbXBhY3RPZmZzZXRcIixcbiAgLy8gT3RoZXJcbiAgXCJUZW1wb1wiLFxuXTtcblxuZnVuY3Rpb24gZ2V0RGlzcGxheU5hbWUobWV0cmljOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gTUVUUklDX0RJU1BMQVlfTkFNRVNbbWV0cmljXSA/PyBtZXRyaWM7XG59XG5cbmZ1bmN0aW9uIGdldENvbHVtbk5hbWUobWV0cmljOiBzdHJpbmcsIHVuaXRQcmVmOiBVbml0UHJlZmVyZW5jZSk6IHN0cmluZyB7XG4gIGNvbnN0IG5hbWUgPSBnZXREaXNwbGF5TmFtZShtZXRyaWMpO1xuICBjb25zdCB1bml0ID0gZ2V0TWV0cmljVW5pdExhYmVsKG1ldHJpYywgdW5pdFByZWYpO1xuICByZXR1cm4gdW5pdCA/IGAke25hbWV9ICgke3VuaXR9KWAgOiBuYW1lO1xufVxuXG5mdW5jdGlvbiBnZW5lcmF0ZUZpbGVuYW1lKHNlc3Npb246IFNlc3Npb25EYXRhKTogc3RyaW5nIHtcbiAgcmV0dXJuIGBTaG90RGF0YV8ke3Nlc3Npb24uZGF0ZX0uY3N2YDtcbn1cblxuZnVuY3Rpb24gb3JkZXJNZXRyaWNzQnlQcmlvcml0eShcbiAgYWxsTWV0cmljczogc3RyaW5nW10sXG4gIHByaW9yaXR5T3JkZXI6IHN0cmluZ1tdXG4pOiBzdHJpbmdbXSB7XG4gIGNvbnN0IHJlc3VsdDogc3RyaW5nW10gPSBbXTtcbiAgY29uc3Qgc2VlbiA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuXG4gIGZvciAoY29uc3QgbWV0cmljIG9mIHByaW9yaXR5T3JkZXIpIHtcbiAgICBpZiAoYWxsTWV0cmljcy5pbmNsdWRlcyhtZXRyaWMpICYmICFzZWVuLmhhcyhtZXRyaWMpKSB7XG4gICAgICByZXN1bHQucHVzaChtZXRyaWMpO1xuICAgICAgc2Vlbi5hZGQobWV0cmljKTtcbiAgICB9XG4gIH1cblxuICBmb3IgKGNvbnN0IG1ldHJpYyBvZiBhbGxNZXRyaWNzKSB7XG4gICAgaWYgKCFzZWVuLmhhcyhtZXRyaWMpKSB7XG4gICAgICByZXN1bHQucHVzaChtZXRyaWMpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIGhhc1RhZ3Moc2Vzc2lvbjogU2Vzc2lvbkRhdGEpOiBib29sZWFuIHtcbiAgcmV0dXJuIHNlc3Npb24uY2x1Yl9ncm91cHMuc29tZSgoY2x1YikgPT5cbiAgICBjbHViLnNob3RzLnNvbWUoKHNob3QpID0+IHNob3QudGFnICE9PSB1bmRlZmluZWQgJiYgc2hvdC50YWcgIT09IFwiXCIpXG4gICk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB3cml0ZUNzdihcbiAgc2Vzc2lvbjogU2Vzc2lvbkRhdGEsXG4gIGluY2x1ZGVBdmVyYWdlcyA9IHRydWUsXG4gIG1ldHJpY09yZGVyPzogc3RyaW5nW10sXG4gIHVuaXRQcmVmOiBVbml0UHJlZmVyZW5jZSA9IFwiaW1wZXJpYWxcIlxuKTogc3RyaW5nIHtcbiAgY29uc3Qgb3JkZXJlZE1ldHJpY3MgPSBvcmRlck1ldHJpY3NCeVByaW9yaXR5KFxuICAgIHNlc3Npb24ubWV0cmljX25hbWVzLFxuICAgIG1ldHJpY09yZGVyID8/IE1FVFJJQ19DT0xVTU5fT1JERVJcbiAgKTtcblxuICBjb25zdCBoZWFkZXJSb3c6IHN0cmluZ1tdID0gW1wiRGF0ZVwiLCBcIkNsdWJcIl07XG4gIFxuICBpZiAoaGFzVGFncyhzZXNzaW9uKSkge1xuICAgIGhlYWRlclJvdy5wdXNoKFwiVGFnXCIpO1xuICB9XG4gIFxuICBoZWFkZXJSb3cucHVzaChcIlNob3QgI1wiLCBcIlR5cGVcIik7XG4gIFxuICBmb3IgKGNvbnN0IG1ldHJpYyBvZiBvcmRlcmVkTWV0cmljcykge1xuICAgIGhlYWRlclJvdy5wdXNoKGdldENvbHVtbk5hbWUobWV0cmljLCB1bml0UHJlZikpO1xuICB9XG5cbiAgY29uc3Qgcm93czogUmVjb3JkPHN0cmluZywgc3RyaW5nPltdID0gW107XG5cbiAgZm9yIChjb25zdCBjbHViIG9mIHNlc3Npb24uY2x1Yl9ncm91cHMpIHtcbiAgICBmb3IgKGNvbnN0IHNob3Qgb2YgY2x1Yi5zaG90cykge1xuICAgICAgY29uc3Qgcm93OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xuICAgICAgICBEYXRlOiBzZXNzaW9uLmRhdGUsXG4gICAgICAgIENsdWI6IGNsdWIuY2x1Yl9uYW1lLFxuICAgICAgICBcIlNob3QgI1wiOiBTdHJpbmcoc2hvdC5zaG90X251bWJlciArIDEpLFxuICAgICAgICBUeXBlOiBcIlNob3RcIixcbiAgICAgIH07XG5cbiAgICAgIGlmIChoYXNUYWdzKHNlc3Npb24pKSB7XG4gICAgICAgIHJvdy5UYWcgPSBzaG90LnRhZyA/PyBcIlwiO1xuICAgICAgfVxuXG4gICAgICAvLyBBUEkgZGF0YSBhcnJpdmVzIGluIG0vcyBhbmQgbWV0ZXJzOyBhbmdsZXMgZm9sbG93IHRoZSByZXBvcnQncyBkaXNwbGF5IHVuaXRcbiAgICAgIGNvbnN0IHVuaXRTeXN0ZW0gPSBnZXRBcGlTb3VyY2VVbml0U3lzdGVtKHNlc3Npb24ubWV0YWRhdGFfcGFyYW1zKTtcblxuICAgICAgZm9yIChjb25zdCBtZXRyaWMgb2Ygb3JkZXJlZE1ldHJpY3MpIHtcbiAgICAgICAgY29uc3QgY29sTmFtZSA9IGdldENvbHVtbk5hbWUobWV0cmljLCB1bml0UHJlZik7XG4gICAgICAgIGxldCByYXdWYWx1ZSA9IHNob3QubWV0cmljc1ttZXRyaWNdID8/IFwiXCI7XG5cbiAgICAgICAgLy8gTm9ybWFsaXplIHZhbHVlIGJhc2VkIG9uIHJlcG9ydCB1bml0cy9ub3JtYWxpemF0aW9uIHBhcmFtc1xuICAgICAgICBpZiAodHlwZW9mIHJhd1ZhbHVlID09PSBcInN0cmluZ1wiIHx8IHR5cGVvZiByYXdWYWx1ZSA9PT0gXCJudW1iZXJcIikge1xuICAgICAgICAgIHJvd1tjb2xOYW1lXSA9IFN0cmluZyhub3JtYWxpemVNZXRyaWNWYWx1ZShyYXdWYWx1ZSwgbWV0cmljLCB1bml0U3lzdGVtLCB1bml0UHJlZikpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJvd1tjb2xOYW1lXSA9IFwiXCI7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcm93cy5wdXNoKHJvdyk7XG4gICAgfVxuXG4gICAgaWYgKGluY2x1ZGVBdmVyYWdlcyAmJiBPYmplY3Qua2V5cyhjbHViLmF2ZXJhZ2VzKS5sZW5ndGggPiAwKSB7XG4gICAgICBjb25zdCBhdmdSb3c6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XG4gICAgICAgIERhdGU6IHNlc3Npb24uZGF0ZSxcbiAgICAgICAgQ2x1YjogY2x1Yi5jbHViX25hbWUsXG4gICAgICAgIFwiU2hvdCAjXCI6IFwiXCIsXG4gICAgICAgIFR5cGU6IFwiQXZlcmFnZVwiLFxuICAgICAgfTtcblxuICAgICAgaWYgKGhhc1RhZ3Moc2Vzc2lvbikpIHtcbiAgICAgICAgYXZnUm93LlRhZyA9IFwiXCI7XG4gICAgICB9XG5cbiAgICAgIC8vIE5vcm1hbGl6ZSBhdmVyYWdlIHZhbHVlcyBiYXNlZCBvbiByZXBvcnQgdW5pdHMvbm9ybWFsaXphdGlvbiBwYXJhbXNcbiAgICAgIGZvciAoY29uc3QgbWV0cmljIG9mIG9yZGVyZWRNZXRyaWNzKSB7XG4gICAgICAgIGNvbnN0IGNvbE5hbWUgPSBnZXRDb2x1bW5OYW1lKG1ldHJpYywgdW5pdFByZWYpO1xuICAgICAgICBsZXQgcmF3VmFsdWUgPSBjbHViLmF2ZXJhZ2VzW21ldHJpY10gPz8gXCJcIjtcblxuICAgICAgICBpZiAodHlwZW9mIHJhd1ZhbHVlID09PSBcInN0cmluZ1wiIHx8IHR5cGVvZiByYXdWYWx1ZSA9PT0gXCJudW1iZXJcIikge1xuICAgICAgICAgIGF2Z1Jvd1tjb2xOYW1lXSA9IFN0cmluZyhub3JtYWxpemVNZXRyaWNWYWx1ZShyYXdWYWx1ZSwgbWV0cmljLCB1bml0U3lzdGVtLCB1bml0UHJlZikpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGF2Z1Jvd1tjb2xOYW1lXSA9IFwiXCI7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcm93cy5wdXNoKGF2Z1Jvdyk7XG4gICAgfVxuXG4gICAgaWYgKGluY2x1ZGVBdmVyYWdlcyAmJiBPYmplY3Qua2V5cyhjbHViLmNvbnNpc3RlbmN5KS5sZW5ndGggPiAwKSB7XG4gICAgICBjb25zdCBjb25zUm93OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xuICAgICAgICBEYXRlOiBzZXNzaW9uLmRhdGUsXG4gICAgICAgIENsdWI6IGNsdWIuY2x1Yl9uYW1lLFxuICAgICAgICBcIlNob3QgI1wiOiBcIlwiLFxuICAgICAgICBUeXBlOiBcIkNvbnNpc3RlbmN5XCIsXG4gICAgICB9O1xuXG4gICAgICBpZiAoaGFzVGFncyhzZXNzaW9uKSkge1xuICAgICAgICBjb25zUm93LlRhZyA9IFwiXCI7XG4gICAgICB9XG5cbiAgICAgIC8vIE5vcm1hbGl6ZSBjb25zaXN0ZW5jeSB2YWx1ZXMgYmFzZWQgb24gcmVwb3J0IHVuaXRzL25vcm1hbGl6YXRpb24gcGFyYW1zXG4gICAgICBmb3IgKGNvbnN0IG1ldHJpYyBvZiBvcmRlcmVkTWV0cmljcykge1xuICAgICAgICBjb25zdCBjb2xOYW1lID0gZ2V0Q29sdW1uTmFtZShtZXRyaWMsIHVuaXRQcmVmKTtcbiAgICAgICAgbGV0IHJhd1ZhbHVlID0gY2x1Yi5jb25zaXN0ZW5jeVttZXRyaWNdID8/IFwiXCI7XG5cbiAgICAgICAgaWYgKHR5cGVvZiByYXdWYWx1ZSA9PT0gXCJzdHJpbmdcIiB8fCB0eXBlb2YgcmF3VmFsdWUgPT09IFwibnVtYmVyXCIpIHtcbiAgICAgICAgICBjb25zUm93W2NvbE5hbWVdID0gU3RyaW5nKG5vcm1hbGl6ZU1ldHJpY1ZhbHVlKHJhd1ZhbHVlLCBtZXRyaWMsIHVuaXRTeXN0ZW0sIHVuaXRQcmVmKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc1Jvd1tjb2xOYW1lXSA9IFwiXCI7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcm93cy5wdXNoKGNvbnNSb3cpO1xuICAgIH1cbiAgfVxuXG4gIGNvbnN0IGNzdkNvbnRlbnQgPSBbXG4gICAgaGVhZGVyUm93LmpvaW4oXCIsXCIpLFxuICAgIC4uLnJvd3MubWFwKChyb3cpID0+IHtcbiAgICAgIHJldHVybiBoZWFkZXJSb3dcbiAgICAgICAgLm1hcCgoY29sKSA9PiB7XG4gICAgICAgICAgY29uc3QgdmFsdWUgPSByb3dbY29sXSA/PyBcIlwiO1xuICAgICAgICAgIGlmICh2YWx1ZS5pbmNsdWRlcyhcIixcIikgfHwgdmFsdWUuaW5jbHVkZXMoJ1wiJykgfHwgdmFsdWUuaW5jbHVkZXMoXCJcXG5cIikpIHtcbiAgICAgICAgICAgIHJldHVybiBgXCIke3ZhbHVlLnJlcGxhY2UoL1wiL2csICdcIlwiJyl9XCJgO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgIH0pXG4gICAgICAgIC5qb2luKFwiLFwiKTtcbiAgICB9KSxcbiAgXS5qb2luKFwiXFxuXCIpO1xuXG4gIHJldHVybiBjc3ZDb250ZW50O1xufVxuIiwgIi8qKlxuICogU2VydmljZSBXb3JrZXIgZm9yIFRyYWNrUHVsbCBDaHJvbWUgRXh0ZW5zaW9uXG4gKi9cblxuaW1wb3J0IHsgU1RPUkFHRV9LRVlTIH0gZnJvbSBcIi4uL3NoYXJlZC9jb25zdGFudHNcIjtcbmltcG9ydCB7IHdyaXRlQ3N2IH0gZnJvbSBcIi4uL3NoYXJlZC9jc3Zfd3JpdGVyXCI7XG5pbXBvcnQgdHlwZSB7IFVuaXRQcmVmZXJlbmNlIH0gZnJvbSBcIi4uL3NoYXJlZC91bml0X25vcm1hbGl6YXRpb25cIjtcbmltcG9ydCB0eXBlIHsgU2Vzc2lvbkRhdGEgfSBmcm9tIFwiLi4vbW9kZWxzL3R5cGVzXCI7XG5cbmNocm9tZS5ydW50aW1lLm9uSW5zdGFsbGVkLmFkZExpc3RlbmVyKCgpID0+IHtcbiAgY29uc29sZS5sb2coXCJUcmFja1B1bGwgZXh0ZW5zaW9uIGluc3RhbGxlZFwiKTtcbn0pO1xuXG5pbnRlcmZhY2UgU2F2ZURhdGFSZXF1ZXN0IHtcbiAgdHlwZTogXCJTQVZFX0RBVEFcIjtcbiAgZGF0YTogU2Vzc2lvbkRhdGE7XG59XG5cbmludGVyZmFjZSBFeHBvcnRDc3ZSZXF1ZXN0IHtcbiAgdHlwZTogXCJFWFBPUlRfQ1NWX1JFUVVFU1RcIjtcbn1cblxuaW50ZXJmYWNlIEdldERhdGFSZXF1ZXN0IHtcbiAgdHlwZTogXCJHRVRfREFUQVwiO1xufVxuXG5mdW5jdGlvbiBnZXREb3dubG9hZEVycm9yTWVzc2FnZShvcmlnaW5hbEVycm9yOiBzdHJpbmcpOiBzdHJpbmcge1xuICBpZiAob3JpZ2luYWxFcnJvci5pbmNsdWRlcyhcImludmFsaWRcIikpIHtcbiAgICByZXR1cm4gXCJJbnZhbGlkIGRvd25sb2FkIGZvcm1hdFwiO1xuICB9XG4gIGlmIChvcmlnaW5hbEVycm9yLmluY2x1ZGVzKFwicXVvdGFcIikgfHwgb3JpZ2luYWxFcnJvci5pbmNsdWRlcyhcInNwYWNlXCIpKSB7XG4gICAgcmV0dXJuIFwiSW5zdWZmaWNpZW50IHN0b3JhZ2Ugc3BhY2VcIjtcbiAgfVxuICBpZiAob3JpZ2luYWxFcnJvci5pbmNsdWRlcyhcImJsb2NrZWRcIikgfHwgb3JpZ2luYWxFcnJvci5pbmNsdWRlcyhcInBvbGljeVwiKSkge1xuICAgIHJldHVybiBcIkRvd25sb2FkIGJsb2NrZWQgYnkgYnJvd3NlciBzZXR0aW5nc1wiO1xuICB9XG4gIHJldHVybiBvcmlnaW5hbEVycm9yO1xufVxuXG50eXBlIFJlcXVlc3RNZXNzYWdlID0gU2F2ZURhdGFSZXF1ZXN0IHwgRXhwb3J0Q3N2UmVxdWVzdCB8IEdldERhdGFSZXF1ZXN0O1xuXG5jaHJvbWUucnVudGltZS5vbk1lc3NhZ2UuYWRkTGlzdGVuZXIoKG1lc3NhZ2U6IFJlcXVlc3RNZXNzYWdlLCBzZW5kZXIsIHNlbmRSZXNwb25zZSkgPT4ge1xuICBpZiAobWVzc2FnZS50eXBlID09PSBcIkdFVF9EQVRBXCIpIHtcbiAgICBjaHJvbWUuc3RvcmFnZS5sb2NhbC5nZXQoW1NUT1JBR0VfS0VZUy5UUkFDS01BTl9EQVRBXSwgKHJlc3VsdCkgPT4ge1xuICAgICAgc2VuZFJlc3BvbnNlKHJlc3VsdFtTVE9SQUdFX0tFWVMuVFJBQ0tNQU5fREFUQV0gfHwgbnVsbCk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBpZiAobWVzc2FnZS50eXBlID09PSBcIlNBVkVfREFUQVwiKSB7XG4gICAgY29uc3Qgc2Vzc2lvbkRhdGEgPSAobWVzc2FnZSBhcyBTYXZlRGF0YVJlcXVlc3QpLmRhdGE7XG4gICAgY2hyb21lLnN0b3JhZ2UubG9jYWwuc2V0KHsgW1NUT1JBR0VfS0VZUy5UUkFDS01BTl9EQVRBXTogc2Vzc2lvbkRhdGEgfSwgKCkgPT4ge1xuICAgICAgaWYgKGNocm9tZS5ydW50aW1lLmxhc3RFcnJvcikge1xuICAgICAgICBjb25zb2xlLmVycm9yKFwiVHJhY2tQdWxsOiBGYWlsZWQgdG8gc2F2ZSBkYXRhOlwiLCBjaHJvbWUucnVudGltZS5sYXN0RXJyb3IpO1xuICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGNocm9tZS5ydW50aW1lLmxhc3RFcnJvci5tZXNzYWdlIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJUcmFja1B1bGw6IFNlc3Npb24gZGF0YSBzYXZlZCB0byBzdG9yYWdlXCIpO1xuICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiB0cnVlIH0pO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgaWYgKG1lc3NhZ2UudHlwZSA9PT0gXCJFWFBPUlRfQ1NWX1JFUVVFU1RcIikge1xuICAgIGNocm9tZS5zdG9yYWdlLmxvY2FsLmdldChbU1RPUkFHRV9LRVlTLlRSQUNLTUFOX0RBVEEsIFNUT1JBR0VfS0VZUy5VTklUX1BSRUZdLCAocmVzdWx0KSA9PiB7XG4gICAgICBjb25zdCBkYXRhID0gcmVzdWx0W1NUT1JBR0VfS0VZUy5UUkFDS01BTl9EQVRBXSBhcyBTZXNzaW9uRGF0YSB8IHVuZGVmaW5lZDtcbiAgICAgIGlmICghZGF0YSB8fCAhZGF0YS5jbHViX2dyb3VwcyB8fCBkYXRhLmNsdWJfZ3JvdXBzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFwiTm8gZGF0YSB0byBleHBvcnRcIiB9KTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCB1bml0UHJlZiA9ICgocmVzdWx0W1NUT1JBR0VfS0VZUy5VTklUX1BSRUZdIGFzIHN0cmluZykgfHwgXCJpbXBlcmlhbFwiKSBhcyBVbml0UHJlZmVyZW5jZTtcbiAgICAgICAgY29uc3QgY3N2Q29udGVudCA9IHdyaXRlQ3N2KGRhdGEsIHRydWUsIHVuZGVmaW5lZCwgdW5pdFByZWYpO1xuICAgICAgICBjb25zdCBmaWxlbmFtZSA9IGBTaG90RGF0YV8ke2RhdGEuZGF0ZSB8fCBcInVua25vd25cIn1fYmhuLmNzdmA7XG5cbiAgICAgICAgY2hyb21lLmRvd25sb2Fkcy5kb3dubG9hZChcbiAgICAgICAgICB7XG4gICAgICAgICAgICB1cmw6IGBkYXRhOnRleHQvY3N2O2NoYXJzZXQ9dXRmLTgsJHtlbmNvZGVVUklDb21wb25lbnQoY3N2Q29udGVudCl9YCxcbiAgICAgICAgICAgIGZpbGVuYW1lOiBmaWxlbmFtZSxcbiAgICAgICAgICAgIHNhdmVBczogZmFsc2UsXG4gICAgICAgICAgfSxcbiAgICAgICAgICAoZG93bmxvYWRJZCkgPT4ge1xuICAgICAgICAgICAgaWYgKGNocm9tZS5ydW50aW1lLmxhc3RFcnJvcikge1xuICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiVHJhY2tQdWxsOiBEb3dubG9hZCBmYWlsZWQ6XCIsIGNocm9tZS5ydW50aW1lLmxhc3RFcnJvcik7XG4gICAgICAgICAgICAgIGNvbnN0IGVycm9yTWVzc2FnZSA9IGdldERvd25sb2FkRXJyb3JNZXNzYWdlKGNocm9tZS5ydW50aW1lLmxhc3RFcnJvci5tZXNzYWdlKTtcbiAgICAgICAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvck1lc3NhZ2UgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgVHJhY2tQdWxsOiBDU1YgZXhwb3J0ZWQgd2l0aCBkb3dubG9hZCBJRCAke2Rvd25sb2FkSWR9YCk7XG4gICAgICAgICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IHRydWUsIGRvd25sb2FkSWQsIGZpbGVuYW1lIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXCJUcmFja1B1bGw6IENTViBnZW5lcmF0aW9uIGZhaWxlZDpcIiwgZXJyb3IpO1xuICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKSB9KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxufSk7XG5cbmNocm9tZS5zdG9yYWdlLm9uQ2hhbmdlZC5hZGRMaXN0ZW5lcigoY2hhbmdlcywgbmFtZXNwYWNlKSA9PiB7XG4gIGlmIChuYW1lc3BhY2UgPT09IFwibG9jYWxcIiAmJiBjaGFuZ2VzW1NUT1JBR0VfS0VZUy5UUkFDS01BTl9EQVRBXSkge1xuICAgIGNvbnN0IG5ld1ZhbHVlID0gY2hhbmdlc1tTVE9SQUdFX0tFWVMuVFJBQ0tNQU5fREFUQV0ubmV3VmFsdWU7XG4gICAgY2hyb21lLnJ1bnRpbWUuc2VuZE1lc3NhZ2UoeyB0eXBlOiBcIkRBVEFfVVBEQVRFRFwiLCBkYXRhOiBuZXdWYWx1ZSB9KS5jYXRjaCgoKSA9PiB7XG4gICAgICAvLyBJZ25vcmUgZXJyb3JzIHdoZW4gbm8gcG9wdXAgaXMgbGlzdGVuaW5nXG4gICAgfSk7XG4gIH1cbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjs7QUE0RU8sTUFBTSx1QkFBK0M7QUFBQSxJQUMxRCxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxhQUFhO0FBQUEsSUFDYixhQUFhO0FBQUEsSUFDYixVQUFVO0FBQUEsSUFDVixXQUFXO0FBQUEsSUFDWCxZQUFZO0FBQUEsSUFDWixnQkFBZ0I7QUFBQSxJQUNoQixhQUFhO0FBQUEsSUFDYixVQUFVO0FBQUEsSUFDVixVQUFVO0FBQUEsSUFDVixVQUFVO0FBQUEsSUFDVixhQUFhO0FBQUEsSUFDYixpQkFBaUI7QUFBQSxJQUNqQixPQUFPO0FBQUEsSUFDUCxPQUFPO0FBQUEsSUFDUCxNQUFNO0FBQUEsSUFDTixXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxRQUFRO0FBQUEsSUFDUixXQUFXO0FBQUEsSUFDWCxPQUFPO0FBQUEsSUFDUCxjQUFjO0FBQUEsSUFDZCxVQUFVO0FBQUEsSUFDVixrQkFBa0I7QUFBQSxJQUNsQixjQUFjO0FBQUEsSUFDZCxjQUFjO0FBQUEsSUFDZCxPQUFPO0FBQUEsRUFDVDtBQWdDTyxNQUFNLGVBQWU7QUFBQSxJQUMxQixlQUFlO0FBQUEsSUFDZixXQUFXO0FBQUEsRUFDYjs7O0FDN0hPLE1BQU0sZUFBaUQ7QUFBQTtBQUFBLElBRTVELFVBQVU7QUFBQSxNQUNSLElBQUk7QUFBQSxNQUNKLE1BQU07QUFBQSxNQUNOLGNBQWM7QUFBQSxNQUNkLFdBQVc7QUFBQSxNQUNYLFdBQVc7QUFBQSxJQUNiO0FBQUE7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QUN6QyxhQUFPLFFBQVEsTUFBTSxJQUFJLENBQUMsYUFBYSxlQUFlLGFBQWEsU0FBUyxHQUFHLENBQUMsV0FBVztBQUN6RixjQUFNLE9BQU8sT0FBTyxhQUFhLGFBQWE7QUFDOUMsWUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLGVBQWUsS0FBSyxZQUFZLFdBQVcsR0FBRztBQUMvRCx1QkFBYSxFQUFFLFNBQVMsT0FBTyxPQUFPLG9CQUFvQixDQUFDO0FBQzNEO0FBQUEsUUFDRjtBQUVBLFlBQUk7QUFDRixnQkFBTSxXQUFhLE9BQU8sYUFBYSxTQUFTLEtBQWdCO0FBQ2hFLGdCQUFNLGFBQWEsU0FBUyxNQUFNLE1BQU0sUUFBVyxRQUFRO0FBQzNELGdCQUFNLFdBQVcsWUFBWSxLQUFLLFFBQVEsU0FBUztBQUVuRCxpQkFBTyxVQUFVO0FBQUEsWUFDZjtBQUFBLGNBQ0UsS0FBSywrQkFBK0IsbUJBQW1CLFVBQVUsQ0FBQztBQUFBLGNBQ2xFO0FBQUEsY0FDQSxRQUFRO0FBQUEsWUFDVjtBQUFBLFlBQ0EsQ0FBQyxlQUFlO0FBQ2Qsa0JBQUksT0FBTyxRQUFRLFdBQVc7QUFDNUIsd0JBQVEsTUFBTSwrQkFBK0IsT0FBTyxRQUFRLFNBQVM7QUFDckUsc0JBQU0sZUFBZSx3QkFBd0IsT0FBTyxRQUFRLFVBQVUsT0FBTztBQUM3RSw2QkFBYSxFQUFFLFNBQVMsT0FBTyxPQUFPLGFBQWEsQ0FBQztBQUFBLGNBQ3RELE9BQU87QUFDTCx3QkFBUSxJQUFJLDRDQUE0QyxVQUFVLEVBQUU7QUFDcEUsNkJBQWEsRUFBRSxTQUFTLE1BQU0sWUFBWSxTQUFTLENBQUM7QUFBQSxjQUN0RDtBQUFBLFlBQ0Y7QUFBQSxVQUNGO0FBQUEsUUFDRixTQUFTLE9BQU87QUFDZCxrQkFBUSxNQUFNLHFDQUFxQyxLQUFLO0FBQ3hELHVCQUFhLEVBQUUsU0FBUyxPQUFPLE9BQU8saUJBQWlCLFFBQVEsTUFBTSxVQUFVLE9BQU8sS0FBSyxFQUFFLENBQUM7QUFBQSxRQUNoRztBQUFBLE1BQ0YsQ0FBQztBQUNELGFBQU87QUFBQSxJQUNUO0FBQUEsRUFDRixDQUFDO0FBRUQsU0FBTyxRQUFRLFVBQVUsWUFBWSxDQUFDLFNBQVMsY0FBYztBQUMzRCxRQUFJLGNBQWMsV0FBVyxRQUFRLGFBQWEsYUFBYSxHQUFHO0FBQ2hFLFlBQU0sV0FBVyxRQUFRLGFBQWEsYUFBYSxFQUFFO0FBQ3JELGFBQU8sUUFBUSxZQUFZLEVBQUUsTUFBTSxnQkFBZ0IsTUFBTSxTQUFTLENBQUMsRUFBRSxNQUFNLE1BQU07QUFBQSxNQUVqRixDQUFDO0FBQUEsSUFDSDtBQUFBLEVBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFsidW5pdFN5c3RlbSJdCn0K
