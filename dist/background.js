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
    const inMph = fromUnit === "mph" ? numValue : numValue / 1.609344;
    return toUnit === "mph" ? inMph : inMph * 1.609344;
  }
  function normalizeMetricValue(value, metricName, reportUnitSystem) {
    const numValue = parseNumericValue(value);
    if (numValue === null) return value;
    let converted;
    if (DISTANCE_METRICS.has(metricName)) {
      converted = convertDistance(
        numValue,
        reportUnitSystem.distanceUnit,
        "yards"
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
        "mph"
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
  function generateFilename(session) {
    return `ShotData_${session.date}.csv`;
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
  function writeCsv(session, outputFilename, includeAverages = true, metricOrder) {
    const filename = outputFilename ?? generateFilename(session);
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
      headerRow.push(getDisplayName(metric));
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
        const unitSystem2 = getUnitSystem(session.metadata_params);
        for (const metric of orderedMetrics) {
          const displayName = getDisplayName(metric);
          let rawValue = shot.metrics[metric] ?? "";
          if (typeof rawValue === "string" || typeof rawValue === "number") {
            row[displayName] = String(normalizeMetricValue(rawValue, metric, unitSystem2));
          } else {
            row[displayName] = "";
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
          const displayName = getDisplayName(metric);
          let rawValue = club.averages[metric] ?? "";
          if (typeof rawValue === "string" || typeof rawValue === "number") {
            avgRow[displayName] = String(normalizeMetricValue(rawValue, metric, unitSystem));
          } else {
            avgRow[displayName] = "";
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
          const displayName = getDisplayName(metric);
          let rawValue = club.consistency[metric] ?? "";
          if (typeof rawValue === "string" || typeof rawValue === "number") {
            consRow[displayName] = String(normalizeMetricValue(rawValue, metric, unitSystem));
          } else {
            consRow[displayName] = "";
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
  var MS_TO_MPH = 2.23694;
  var METERS_TO_YARDS = 1.09361;
  var SPEED_METRICS2 = /* @__PURE__ */ new Set(["ClubSpeed", "BallSpeed"]);
  var DISTANCE_METRICS2 = /* @__PURE__ */ new Set([
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
  function convertMetric(key, value) {
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    if (SPEED_METRICS2.has(key)) return `${Math.round(num * MS_TO_MPH * 10) / 10}`;
    if (DISTANCE_METRICS2.has(key)) return `${Math.round(num * METERS_TO_YARDS * 10) / 10}`;
    return value;
  }
  function toImperialSession(session) {
    const converted = JSON.parse(JSON.stringify(session));
    for (const group of converted.club_groups) {
      for (const shot of group.shots) {
        for (const key of Object.keys(shot.metrics)) {
          shot.metrics[key] = convertMetric(key, shot.metrics[key]);
        }
      }
      for (const key of Object.keys(group.averages)) {
        group.averages[key] = convertMetric(key, group.averages[key]);
      }
      for (const key of Object.keys(group.consistency)) {
        group.consistency[key] = convertMetric(key, group.consistency[key]);
      }
    }
    return converted;
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
          const exportData = unitPref === "imperial" ? toImperialSession(data) : data;
          const csvContent = writeCsv(exportData);
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
})();
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL3NoYXJlZC9jb25zdGFudHMudHMiLCAiLi4vc3JjL3NoYXJlZC91bml0X25vcm1hbGl6YXRpb24udHMiLCAiLi4vc3JjL3NoYXJlZC9jc3Zfd3JpdGVyLnRzIiwgIi4uL3NyYy9iYWNrZ3JvdW5kL3NlcnZpY2VXb3JrZXIudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbIi8qKlxuICogU2hhcmVkIGNvbnN0YW50cyBpbmNsdWRpbmcgQ1NTIHNlbGVjdG9ycyBhbmQgY29uZmlndXJhdGlvbi5cbiAqIEJhc2VkIG9uIFB5dGhvbiBzY3JhcGVyIGNvbnN0YW50cy5weSBpbXBsZW1lbnRhdGlvbi5cbiAqL1xuXG4vLyBDb21wbGV0ZSBsaXN0IG9mIGFsbCBrbm93biBUcmFja21hbiBtZXRyaWNzIChVUkwgcGFyYW1ldGVyIG5hbWVzKVxuZXhwb3J0IGNvbnN0IEFMTF9NRVRSSUNTID0gW1xuICBcIkNsdWJTcGVlZFwiLFxuICBcIkJhbGxTcGVlZFwiLFxuICBcIlNtYXNoRmFjdG9yXCIsXG4gIFwiQXR0YWNrQW5nbGVcIixcbiAgXCJDbHViUGF0aFwiLFxuICBcIkZhY2VBbmdsZVwiLFxuICBcIkZhY2VUb1BhdGhcIixcbiAgXCJTd2luZ0RpcmVjdGlvblwiLFxuICBcIkR5bmFtaWNMb2Z0XCIsXG4gIFwiU3BpblJhdGVcIixcbiAgXCJTcGluQXhpc1wiLFxuICBcIlNwaW5Mb2Z0XCIsXG4gIFwiTGF1bmNoQW5nbGVcIixcbiAgXCJMYXVuY2hEaXJlY3Rpb25cIixcbiAgXCJDYXJyeVwiLFxuICBcIlRvdGFsXCIsXG4gIFwiU2lkZVwiLFxuICBcIlNpZGVUb3RhbFwiLFxuICBcIkNhcnJ5U2lkZVwiLFxuICBcIlRvdGFsU2lkZVwiLFxuICBcIkhlaWdodFwiLFxuICBcIk1heEhlaWdodFwiLFxuICBcIkN1cnZlXCIsXG4gIFwiTGFuZGluZ0FuZ2xlXCIsXG4gIFwiSGFuZ1RpbWVcIixcbiAgXCJMb3dQb2ludERpc3RhbmNlXCIsXG4gIFwiSW1wYWN0SGVpZ2h0XCIsXG4gIFwiSW1wYWN0T2Zmc2V0XCIsXG4gIFwiVGVtcG9cIixcbl0gYXMgY29uc3Q7XG5cbi8vIE1ldHJpY3Mgc3BsaXQgaW50byBncm91cHMgZm9yIG11bHRpLXBhZ2UtbG9hZCBIVE1MIGZhbGxiYWNrXG5leHBvcnQgY29uc3QgTUVUUklDX0dST1VQUyA9IFtcbiAgW1xuICAgIFwiQ2x1YlNwZWVkXCIsXG4gICAgXCJCYWxsU3BlZWRcIixcbiAgICBcIlNtYXNoRmFjdG9yXCIsXG4gICAgXCJBdHRhY2tBbmdsZVwiLFxuICAgIFwiQ2x1YlBhdGhcIixcbiAgICBcIkZhY2VBbmdsZVwiLFxuICAgIFwiRmFjZVRvUGF0aFwiLFxuICAgIFwiU3dpbmdEaXJlY3Rpb25cIixcbiAgICBcIkR5bmFtaWNMb2Z0XCIsXG4gICAgXCJTcGluTG9mdFwiLFxuICBdLFxuICBbXG4gICAgXCJTcGluUmF0ZVwiLFxuICAgIFwiU3BpbkF4aXNcIixcbiAgICBcIkxhdW5jaEFuZ2xlXCIsXG4gICAgXCJMYXVuY2hEaXJlY3Rpb25cIixcbiAgICBcIkNhcnJ5XCIsXG4gICAgXCJUb3RhbFwiLFxuICAgIFwiU2lkZVwiLFxuICAgIFwiU2lkZVRvdGFsXCIsXG4gICAgXCJDYXJyeVNpZGVcIixcbiAgICBcIlRvdGFsU2lkZVwiLFxuICAgIFwiSGVpZ2h0XCIsXG4gICAgXCJNYXhIZWlnaHRcIixcbiAgICBcIkN1cnZlXCIsXG4gICAgXCJMYW5kaW5nQW5nbGVcIixcbiAgICBcIkhhbmdUaW1lXCIsXG4gICAgXCJMb3dQb2ludERpc3RhbmNlXCIsXG4gICAgXCJJbXBhY3RIZWlnaHRcIixcbiAgICBcIkltcGFjdE9mZnNldFwiLFxuICAgIFwiVGVtcG9cIixcbiAgXSxcbl0gYXMgY29uc3Q7XG5cbi8vIERpc3BsYXkgbmFtZXM6IFVSTCBwYXJhbSBuYW1lIC0+IGh1bWFuLXJlYWRhYmxlIENTViBoZWFkZXJcbmV4cG9ydCBjb25zdCBNRVRSSUNfRElTUExBWV9OQU1FUzogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcbiAgQ2x1YlNwZWVkOiBcIkNsdWIgU3BlZWRcIixcbiAgQmFsbFNwZWVkOiBcIkJhbGwgU3BlZWRcIixcbiAgU21hc2hGYWN0b3I6IFwiU21hc2ggRmFjdG9yXCIsXG4gIEF0dGFja0FuZ2xlOiBcIkF0dGFjayBBbmdsZVwiLFxuICBDbHViUGF0aDogXCJDbHViIFBhdGhcIixcbiAgRmFjZUFuZ2xlOiBcIkZhY2UgQW5nbGVcIixcbiAgRmFjZVRvUGF0aDogXCJGYWNlIFRvIFBhdGhcIixcbiAgU3dpbmdEaXJlY3Rpb246IFwiU3dpbmcgRGlyZWN0aW9uXCIsXG4gIER5bmFtaWNMb2Z0OiBcIkR5bmFtaWMgTG9mdFwiLFxuICBTcGluUmF0ZTogXCJTcGluIFJhdGVcIixcbiAgU3BpbkF4aXM6IFwiU3BpbiBBeGlzXCIsXG4gIFNwaW5Mb2Z0OiBcIlNwaW4gTG9mdFwiLFxuICBMYXVuY2hBbmdsZTogXCJMYXVuY2ggQW5nbGVcIixcbiAgTGF1bmNoRGlyZWN0aW9uOiBcIkxhdW5jaCBEaXJlY3Rpb25cIixcbiAgQ2Fycnk6IFwiQ2FycnlcIixcbiAgVG90YWw6IFwiVG90YWxcIixcbiAgU2lkZTogXCJTaWRlXCIsXG4gIFNpZGVUb3RhbDogXCJTaWRlIFRvdGFsXCIsXG4gIENhcnJ5U2lkZTogXCJDYXJyeSBTaWRlXCIsXG4gIFRvdGFsU2lkZTogXCJUb3RhbCBTaWRlXCIsXG4gIEhlaWdodDogXCJIZWlnaHRcIixcbiAgTWF4SGVpZ2h0OiBcIk1heCBIZWlnaHRcIixcbiAgQ3VydmU6IFwiQ3VydmVcIixcbiAgTGFuZGluZ0FuZ2xlOiBcIkxhbmRpbmcgQW5nbGVcIixcbiAgSGFuZ1RpbWU6IFwiSGFuZyBUaW1lXCIsXG4gIExvd1BvaW50RGlzdGFuY2U6IFwiTG93IFBvaW50XCIsXG4gIEltcGFjdEhlaWdodDogXCJJbXBhY3QgSGVpZ2h0XCIsXG4gIEltcGFjdE9mZnNldDogXCJJbXBhY3QgT2Zmc2V0XCIsXG4gIFRlbXBvOiBcIlRlbXBvXCIsXG59O1xuXG4vLyBDU1MgY2xhc3Mgc2VsZWN0b3JzIChmcm9tIFRyYWNrbWFuJ3MgcmVuZGVyZWQgSFRNTClcbmV4cG9ydCBjb25zdCBDU1NfREFURSA9IFwiZGF0ZVwiO1xuZXhwb3J0IGNvbnN0IENTU19SRVNVTFRTX1dSQVBQRVIgPSBcInBsYXllci1hbmQtcmVzdWx0cy10YWJsZS13cmFwcGVyXCI7XG5leHBvcnQgY29uc3QgQ1NTX1JFU1VMVFNfVEFCTEUgPSBcIlJlc3VsdHNUYWJsZVwiO1xuZXhwb3J0IGNvbnN0IENTU19DTFVCX1RBRyA9IFwiZ3JvdXAtdGFnXCI7XG5leHBvcnQgY29uc3QgQ1NTX1BBUkFNX05BTUVTX1JPVyA9IFwicGFyYW1ldGVyLW5hbWVzLXJvd1wiO1xuZXhwb3J0IGNvbnN0IENTU19QQVJBTV9OQU1FID0gXCJwYXJhbWV0ZXItbmFtZVwiO1xuZXhwb3J0IGNvbnN0IENTU19TSE9UX0RFVEFJTF9ST1cgPSBcInJvdy13aXRoLXNob3QtZGV0YWlsc1wiO1xuZXhwb3J0IGNvbnN0IENTU19BVkVSQUdFX1ZBTFVFUyA9IFwiYXZlcmFnZS12YWx1ZXNcIjtcbmV4cG9ydCBjb25zdCBDU1NfQ09OU0lTVEVOQ1lfVkFMVUVTID0gXCJjb25zaXN0ZW5jeS12YWx1ZXNcIjtcblxuLy8gQVBJIFVSTCBwYXR0ZXJucyB0aGF0IGxpa2VseSBpbmRpY2F0ZSBhbiBBUEkgZGF0YSByZXNwb25zZVxuZXhwb3J0IGNvbnN0IEFQSV9VUkxfUEFUVEVSTlMgPSBbXG4gIFwiYXBpLnRyYWNrbWFuZ29sZi5jb21cIixcbiAgXCJ0cmFja21hbmdvbGYuY29tL2FwaVwiLFxuICBcIi9hcGkvXCIsXG4gIFwiL3JlcG9ydHMvXCIsXG4gIFwiL2FjdGl2aXRpZXMvXCIsXG4gIFwiL3Nob3RzL1wiLFxuICBcImdyYXBocWxcIixcbl07XG5cbi8vIFRpbWVvdXRzIChtaWxsaXNlY29uZHMpXG5leHBvcnQgY29uc3QgUEFHRV9MT0FEX1RJTUVPVVQgPSAzMF8wMDA7XG5leHBvcnQgY29uc3QgREFUQV9MT0FEX1RJTUVPVVQgPSAxNV8wMDA7XG5cbi8vIFRyYWNrbWFuIGJhc2UgVVJMXG5leHBvcnQgY29uc3QgQkFTRV9VUkwgPSBcImh0dHBzOi8vd2ViLWR5bmFtaWMtcmVwb3J0cy50cmFja21hbmdvbGYuY29tL1wiO1xuXG4vLyBTdG9yYWdlIGtleXMgZm9yIENocm9tZSBleHRlbnNpb24gKGFsaWduZWQgYmV0d2VlbiBiYWNrZ3JvdW5kIGFuZCBwb3B1cClcbmV4cG9ydCBjb25zdCBTVE9SQUdFX0tFWVMgPSB7XG4gIFRSQUNLTUFOX0RBVEE6IFwidHJhY2ttYW5EYXRhXCIsXG4gIFVOSVRfUFJFRjogXCJ1bml0UHJlZmVyZW5jZVwiLFxufSBhcyBjb25zdDtcbiIsICIvKipcbiAqIFVuaXQgbm9ybWFsaXphdGlvbiB1dGlsaXRpZXMgZm9yIFRyYWNrbWFuIG1lYXN1cmVtZW50cy5cbiAqIFxuICogVHJhY2ttYW4gdXNlcyBuZF8qIHBhcmFtZXRlcnMgdG8gc3BlY2lmeSB1bml0czpcbiAqIC0gbmRfMDAxLCBuZF8wMDIsIGV0Yy4gZGVmaW5lIHVuaXQgc3lzdGVtcyBmb3IgZGlmZmVyZW50IG1lYXN1cmVtZW50IGdyb3Vwc1xuICogLSBDb21tb24gdmFsdWVzOiA3ODkwMTIgPSB5YXJkcy9kZWdyZWVzLCA3ODkwMTMgPSBtZXRlcnMvcmFkaWFuc1xuICovXG5cbmV4cG9ydCB0eXBlIFVuaXRTeXN0ZW1JZCA9IFwiNzg5MDEyXCIgfCBcIjc4OTAxM1wiIHwgXCI3ODkwMTRcIiB8IHN0cmluZztcblxuLyoqXG4gKiBUcmFja21hbiB1bml0IHN5c3RlbSBkZWZpbml0aW9ucy5cbiAqIE1hcHMgbmRfKiBwYXJhbWV0ZXIgdmFsdWVzIHRvIGFjdHVhbCB1bml0cyBmb3IgZWFjaCBtZXRyaWMuXG4gKi9cbmV4cG9ydCBjb25zdCBVTklUX1NZU1RFTVM6IFJlY29yZDxVbml0U3lzdGVtSWQsIFVuaXRTeXN0ZW0+ID0ge1xuICAvLyBJbXBlcmlhbCAoeWFyZHMsIGRlZ3JlZXMpIC0gbW9zdCBjb21tb25cbiAgXCI3ODkwMTJcIjoge1xuICAgIGlkOiBcIjc4OTAxMlwiLFxuICAgIG5hbWU6IFwiSW1wZXJpYWxcIixcbiAgICBkaXN0YW5jZVVuaXQ6IFwieWFyZHNcIixcbiAgICBhbmdsZVVuaXQ6IFwiZGVncmVlc1wiLFxuICAgIHNwZWVkVW5pdDogXCJtcGhcIixcbiAgfSxcbiAgLy8gTWV0cmljIChtZXRlcnMsIHJhZGlhbnMpXG4gIFwiNzg5MDEzXCI6IHtcbiAgICBpZDogXCI3ODkwMTNcIixcbiAgICBuYW1lOiBcIk1ldHJpYyAocmFkKVwiLFxuICAgIGRpc3RhbmNlVW5pdDogXCJtZXRlcnNcIixcbiAgICBhbmdsZVVuaXQ6IFwicmFkaWFuc1wiLFxuICAgIHNwZWVkVW5pdDogXCJrbS9oXCIsXG4gIH0sXG4gIC8vIE1ldHJpYyAobWV0ZXJzLCBkZWdyZWVzKSAtIGxlc3MgY29tbW9uXG4gIFwiNzg5MDE0XCI6IHtcbiAgICBpZDogXCI3ODkwMTRcIixcbiAgICBuYW1lOiBcIk1ldHJpYyAoZGVnKVwiLFxuICAgIGRpc3RhbmNlVW5pdDogXCJtZXRlcnNcIixcbiAgICBhbmdsZVVuaXQ6IFwiZGVncmVlc1wiLFxuICAgIHNwZWVkVW5pdDogXCJrbS9oXCIsXG4gIH0sXG59O1xuXG4vKipcbiAqIFVuaXQgc3lzdGVtIGNvbmZpZ3VyYXRpb24uXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVW5pdFN5c3RlbSB7XG4gIGlkOiBVbml0U3lzdGVtSWQ7XG4gIG5hbWU6IHN0cmluZztcbiAgZGlzdGFuY2VVbml0OiBcInlhcmRzXCIgfCBcIm1ldGVyc1wiO1xuICBhbmdsZVVuaXQ6IFwiZGVncmVlc1wiIHwgXCJyYWRpYW5zXCI7XG4gIHNwZWVkVW5pdDogXCJtcGhcIiB8IFwia20vaFwiO1xufVxuXG4vKipcbiAqIE1ldHJpY3MgdGhhdCB1c2UgZGlzdGFuY2UgdW5pdHMuXG4gKi9cbmV4cG9ydCBjb25zdCBESVNUQU5DRV9NRVRSSUNTID0gbmV3IFNldChbXG4gIFwiQ2FycnlcIixcbiAgXCJUb3RhbFwiLFxuICBcIlNpZGVcIixcbiAgXCJTaWRlVG90YWxcIixcbiAgXCJIZWlnaHRcIixcbiAgXCJMb3dQb2ludERpc3RhbmNlXCIsXG5dKTtcblxuLyoqXG4gKiBNZXRyaWNzIHRoYXQgdXNlIGFuZ2xlIHVuaXRzLlxuICovXG5leHBvcnQgY29uc3QgQU5HTEVfTUVUUklDUyA9IG5ldyBTZXQoW1xuICBcIkF0dGFja0FuZ2xlXCIsXG4gIFwiQ2x1YlBhdGhcIixcbiAgXCJGYWNlQW5nbGVcIixcbiAgXCJGYWNlVG9QYXRoXCIsXG4gIFwiRHluYW1pY0xvZnRcIixcbiAgXCJMYXVuY2hBbmdsZVwiLFxuICBcIkxhdW5jaERpcmVjdGlvblwiLFxuXSk7XG5cbi8qKlxuICogTWV0cmljcyB0aGF0IHVzZSBzcGVlZCB1bml0cy5cbiAqL1xuZXhwb3J0IGNvbnN0IFNQRUVEX01FVFJJQ1MgPSBuZXcgU2V0KFtcbiAgXCJDbHViU3BlZWRcIixcbiAgXCJCYWxsU3BlZWRcIixcbiAgXCJUZW1wb1wiLFxuXSk7XG5cbi8qKlxuICogRGVmYXVsdCB1bml0IHN5c3RlbSAoSW1wZXJpYWwgLSB5YXJkcy9kZWdyZWVzKS5cbiAqL1xuZXhwb3J0IGNvbnN0IERFRkFVTFRfVU5JVF9TWVNURU06IFVuaXRTeXN0ZW0gPSBVTklUX1NZU1RFTVNbXCI3ODkwMTJcIl07XG5cbi8qKlxuICogRXh0cmFjdCBuZF8qIHBhcmFtZXRlcnMgZnJvbSBtZXRhZGF0YV9wYXJhbXMuXG4gKiBcbiAqIEBwYXJhbSBtZXRhZGF0YVBhcmFtcyAtIFRoZSBtZXRhZGF0YV9wYXJhbXMgb2JqZWN0IGZyb20gU2Vzc2lvbkRhdGFcbiAqIEByZXR1cm5zIE9iamVjdCBtYXBwaW5nIG1ldHJpYyBncm91cCBJRHMgdG8gdW5pdCBzeXN0ZW0gSURzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBleHRyYWN0VW5pdFBhcmFtcyhcbiAgbWV0YWRhdGFQYXJhbXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz5cbik6IFJlY29yZDxzdHJpbmcsIFVuaXRTeXN0ZW1JZD4ge1xuICBjb25zdCByZXN1bHQ6IFJlY29yZDxzdHJpbmcsIFVuaXRTeXN0ZW1JZD4gPSB7fTtcblxuICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyhtZXRhZGF0YVBhcmFtcykpIHtcbiAgICBjb25zdCBtYXRjaCA9IGtleS5tYXRjaCgvXm5kXyhbYS16MC05XSspJC9pKTtcbiAgICBpZiAobWF0Y2gpIHtcbiAgICAgIGNvbnN0IGdyb3VwS2V5ID0gbWF0Y2hbMV0udG9Mb3dlckNhc2UoKTtcbiAgICAgIHJlc3VsdFtncm91cEtleV0gPSB2YWx1ZSBhcyBVbml0U3lzdGVtSWQ7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmUgdGhlIHVuaXQgc3lzdGVtIElEIGZyb20gbWV0YWRhdGEgcGFyYW1zLlxuICogVXNlcyBuZF8wMDEgYXMgcHJpbWFyeSwgZmFsbHMgYmFjayB0byBkZWZhdWx0LlxuICogXG4gKiBAcGFyYW0gbWV0YWRhdGFQYXJhbXMgLSBUaGUgbWV0YWRhdGFfcGFyYW1zIG9iamVjdFxuICogQHJldHVybnMgVGhlIHVuaXQgc3lzdGVtIElEIHN0cmluZ1xuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0VW5pdFN5c3RlbUlkKFxuICBtZXRhZGF0YVBhcmFtczogUmVjb3JkPHN0cmluZywgc3RyaW5nPlxuKTogVW5pdFN5c3RlbUlkIHtcbiAgY29uc3QgdW5pdFBhcmFtcyA9IGV4dHJhY3RVbml0UGFyYW1zKG1ldGFkYXRhUGFyYW1zKTtcbiAgcmV0dXJuIHVuaXRQYXJhbXNbXCIwMDFcIl0gfHwgXCI3ODkwMTJcIjsgLy8gRGVmYXVsdCB0byBJbXBlcmlhbFxufVxuXG4vKipcbiAqIEdldCB0aGUgZnVsbCB1bml0IHN5c3RlbSBjb25maWd1cmF0aW9uLlxuICogXG4gKiBAcGFyYW0gbWV0YWRhdGFQYXJhbXMgLSBUaGUgbWV0YWRhdGFfcGFyYW1zIG9iamVjdFxuICogQHJldHVybnMgVGhlIFVuaXRTeXN0ZW0gY29uZmlndXJhdGlvblxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0VW5pdFN5c3RlbShcbiAgbWV0YWRhdGFQYXJhbXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz5cbik6IFVuaXRTeXN0ZW0ge1xuICBjb25zdCBpZCA9IGdldFVuaXRTeXN0ZW1JZChtZXRhZGF0YVBhcmFtcyk7XG4gIHJldHVybiBVTklUX1NZU1RFTVNbaWRdIHx8IERFRkFVTFRfVU5JVF9TWVNURU07XG59XG5cbi8qKlxuICogQ29udmVydCBhIGRpc3RhbmNlIHZhbHVlIGJldHdlZW4gdW5pdHMuXG4gKiBcbiAqIEBwYXJhbSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byBjb252ZXJ0XG4gKiBAcGFyYW0gZnJvbVVuaXQgLSBTb3VyY2UgdW5pdCAoXCJ5YXJkc1wiIG9yIFwibWV0ZXJzXCIpXG4gKiBAcGFyYW0gdG9Vbml0IC0gVGFyZ2V0IHVuaXQgKFwieWFyZHNcIiBvciBcIm1ldGVyc1wiKVxuICogQHJldHVybnMgQ29udmVydGVkIHZhbHVlLCBvciBvcmlnaW5hbCBpZiB1bml0cyBtYXRjaFxuICovXG5leHBvcnQgZnVuY3Rpb24gY29udmVydERpc3RhbmNlKFxuICB2YWx1ZTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbCxcbiAgZnJvbVVuaXQ6IFwieWFyZHNcIiB8IFwibWV0ZXJzXCIsXG4gIHRvVW5pdDogXCJ5YXJkc1wiIHwgXCJtZXRlcnNcIlxuKTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbCB7XG4gIGlmICh2YWx1ZSA9PT0gbnVsbCB8fCB2YWx1ZSA9PT0gXCJcIikgcmV0dXJuIHZhbHVlO1xuXG4gIGNvbnN0IG51bVZhbHVlID0gdHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiID8gcGFyc2VGbG9hdCh2YWx1ZSkgOiB2YWx1ZTtcbiAgaWYgKGlzTmFOKG51bVZhbHVlKSkgcmV0dXJuIHZhbHVlO1xuXG4gIGlmIChmcm9tVW5pdCA9PT0gdG9Vbml0KSByZXR1cm4gbnVtVmFsdWU7XG5cbiAgLy8gQ29udmVydCB0byBtZXRlcnMgZmlyc3QsIHRoZW4gdG8gdGFyZ2V0IHVuaXRcbiAgY29uc3QgaW5NZXRlcnMgPSBmcm9tVW5pdCA9PT0gXCJ5YXJkc1wiID8gbnVtVmFsdWUgKiAwLjkxNDQgOiBudW1WYWx1ZTtcbiAgcmV0dXJuIHRvVW5pdCA9PT0gXCJ5YXJkc1wiID8gaW5NZXRlcnMgLyAwLjkxNDQgOiBpbk1ldGVycztcbn1cblxuLyoqXG4gKiBDb252ZXJ0IGFuIGFuZ2xlIHZhbHVlIGJldHdlZW4gdW5pdHMuXG4gKiBcbiAqIEBwYXJhbSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byBjb252ZXJ0XG4gKiBAcGFyYW0gZnJvbVVuaXQgLSBTb3VyY2UgdW5pdCAoXCJkZWdyZWVzXCIgb3IgXCJyYWRpYW5zXCIpXG4gKiBAcGFyYW0gdG9Vbml0IC0gVGFyZ2V0IHVuaXQgKFwiZGVncmVlc1wiIG9yIFwicmFkaWFuc1wiKVxuICogQHJldHVybnMgQ29udmVydGVkIHZhbHVlLCBvciBvcmlnaW5hbCBpZiB1bml0cyBtYXRjaFxuICovXG5leHBvcnQgZnVuY3Rpb24gY29udmVydEFuZ2xlKFxuICB2YWx1ZTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbCxcbiAgZnJvbVVuaXQ6IFwiZGVncmVlc1wiIHwgXCJyYWRpYW5zXCIsXG4gIHRvVW5pdDogXCJkZWdyZWVzXCIgfCBcInJhZGlhbnNcIlxuKTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbCB7XG4gIGlmICh2YWx1ZSA9PT0gbnVsbCB8fCB2YWx1ZSA9PT0gXCJcIikgcmV0dXJuIHZhbHVlO1xuXG4gIGNvbnN0IG51bVZhbHVlID0gdHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiID8gcGFyc2VGbG9hdCh2YWx1ZSkgOiB2YWx1ZTtcbiAgaWYgKGlzTmFOKG51bVZhbHVlKSkgcmV0dXJuIHZhbHVlO1xuXG4gIGlmIChmcm9tVW5pdCA9PT0gdG9Vbml0KSByZXR1cm4gbnVtVmFsdWU7XG5cbiAgLy8gQ29udmVydCB0byBkZWdyZWVzIGZpcnN0LCB0aGVuIHRvIHRhcmdldCB1bml0XG4gIGNvbnN0IGluRGVncmVlcyA9IGZyb21Vbml0ID09PSBcImRlZ3JlZXNcIiA/IG51bVZhbHVlIDogKG51bVZhbHVlICogMTgwIC8gTWF0aC5QSSk7XG4gIHJldHVybiB0b1VuaXQgPT09IFwiZGVncmVlc1wiID8gaW5EZWdyZWVzIDogKGluRGVncmVlcyAqIE1hdGguUEkgLyAxODApO1xufVxuXG4vKipcbiAqIENvbnZlcnQgYSBzcGVlZCB2YWx1ZSBiZXR3ZWVuIHVuaXRzLlxuICogXG4gKiBAcGFyYW0gdmFsdWUgLSBUaGUgdmFsdWUgdG8gY29udmVydFxuICogQHBhcmFtIGZyb21Vbml0IC0gU291cmNlIHVuaXQgKFwibXBoXCIgb3IgXCJrbS9oXCIpXG4gKiBAcGFyYW0gdG9Vbml0IC0gVGFyZ2V0IHVuaXQgKFwibXBoXCIgb3IgXCJrbS9oXCIpXG4gKiBAcmV0dXJucyBDb252ZXJ0ZWQgdmFsdWUsIG9yIG9yaWdpbmFsIGlmIHVuaXRzIG1hdGNoXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb252ZXJ0U3BlZWQoXG4gIHZhbHVlOiBudW1iZXIgfCBzdHJpbmcgfCBudWxsLFxuICBmcm9tVW5pdDogXCJtcGhcIiB8IFwia20vaFwiLFxuICB0b1VuaXQ6IFwibXBoXCIgfCBcImttL2hcIlxuKTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbCB7XG4gIGlmICh2YWx1ZSA9PT0gbnVsbCB8fCB2YWx1ZSA9PT0gXCJcIikgcmV0dXJuIHZhbHVlO1xuXG4gIGNvbnN0IG51bVZhbHVlID0gdHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiID8gcGFyc2VGbG9hdCh2YWx1ZSkgOiB2YWx1ZTtcbiAgaWYgKGlzTmFOKG51bVZhbHVlKSkgcmV0dXJuIHZhbHVlO1xuXG4gIGlmIChmcm9tVW5pdCA9PT0gdG9Vbml0KSByZXR1cm4gbnVtVmFsdWU7XG5cbiAgLy8gQ29udmVydCB0byBtcGggZmlyc3QsIHRoZW4gdG8gdGFyZ2V0IHVuaXRcbiAgY29uc3QgaW5NcGggPSBmcm9tVW5pdCA9PT0gXCJtcGhcIiA/IG51bVZhbHVlIDogbnVtVmFsdWUgLyAxLjYwOTM0NDtcbiAgcmV0dXJuIHRvVW5pdCA9PT0gXCJtcGhcIiA/IGluTXBoIDogaW5NcGggKiAxLjYwOTM0NDtcbn1cblxuLyoqXG4gKiBOb3JtYWxpemUgYSBtZXRyaWMgdmFsdWUgYmFzZWQgb24gdW5pdCBzeXN0ZW0gYWxpZ25tZW50LlxuICogXG4gKiBDb252ZXJ0cyB2YWx1ZXMgZnJvbSB0aGUgcmVwb3J0J3MgbmF0aXZlIHVuaXRzIHRvIHN0YW5kYXJkIG91dHB1dCB1bml0czpcbiAqIC0gRGlzdGFuY2U6IGFsd2F5cyB5YXJkcyAoSW1wZXJpYWwpXG4gKiAtIEFuZ2xlczogYWx3YXlzIGRlZ3JlZXNcbiAqIC0gU3BlZWQ6IGFsd2F5cyBtcGhcbiAqIFxuICogQHBhcmFtIHZhbHVlIC0gVGhlIHJhdyBtZXRyaWMgdmFsdWVcbiAqIEBwYXJhbSBtZXRyaWNOYW1lIC0gVGhlIG5hbWUgb2YgdGhlIG1ldHJpYyBiZWluZyBub3JtYWxpemVkXG4gKiBAcGFyYW0gcmVwb3J0VW5pdFN5c3RlbSAtIFRoZSB1bml0IHN5c3RlbSB1c2VkIGluIHRoZSBzb3VyY2UgcmVwb3J0XG4gKiBAcmV0dXJucyBOb3JtYWxpemVkIHZhbHVlIGFzIG51bWJlciBvciBzdHJpbmcgKG51bGwgaWYgaW52YWxpZClcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG5vcm1hbGl6ZU1ldHJpY1ZhbHVlKFxuICB2YWx1ZTogTWV0cmljVmFsdWUsXG4gIG1ldHJpY05hbWU6IHN0cmluZyxcbiAgcmVwb3J0VW5pdFN5c3RlbTogVW5pdFN5c3RlbVxuKTogTWV0cmljVmFsdWUge1xuICBjb25zdCBudW1WYWx1ZSA9IHBhcnNlTnVtZXJpY1ZhbHVlKHZhbHVlKTtcbiAgaWYgKG51bVZhbHVlID09PSBudWxsKSByZXR1cm4gdmFsdWU7XG5cbiAgbGV0IGNvbnZlcnRlZDogbnVtYmVyO1xuXG4gIGlmIChESVNUQU5DRV9NRVRSSUNTLmhhcyhtZXRyaWNOYW1lKSkge1xuICAgIGNvbnZlcnRlZCA9IGNvbnZlcnREaXN0YW5jZShcbiAgICAgIG51bVZhbHVlLFxuICAgICAgcmVwb3J0VW5pdFN5c3RlbS5kaXN0YW5jZVVuaXQsXG4gICAgICBcInlhcmRzXCJcbiAgICApIGFzIG51bWJlcjtcbiAgfSBlbHNlIGlmIChBTkdMRV9NRVRSSUNTLmhhcyhtZXRyaWNOYW1lKSkge1xuICAgIGNvbnZlcnRlZCA9IGNvbnZlcnRBbmdsZShcbiAgICAgIG51bVZhbHVlLFxuICAgICAgcmVwb3J0VW5pdFN5c3RlbS5hbmdsZVVuaXQsXG4gICAgICBcImRlZ3JlZXNcIlxuICAgICkgYXMgbnVtYmVyO1xuICB9IGVsc2UgaWYgKFNQRUVEX01FVFJJQ1MuaGFzKG1ldHJpY05hbWUpKSB7XG4gICAgY29udmVydGVkID0gY29udmVydFNwZWVkKFxuICAgICAgbnVtVmFsdWUsXG4gICAgICByZXBvcnRVbml0U3lzdGVtLnNwZWVkVW5pdCxcbiAgICAgIFwibXBoXCJcbiAgICApIGFzIG51bWJlcjtcbiAgfSBlbHNlIHtcbiAgICAvLyBObyBjb252ZXJzaW9uIG5lZWRlZCBmb3IgdGhpcyBtZXRyaWMgdHlwZVxuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuXG4gIC8vIFJvdW5kIHRvIDEgZGVjaW1hbCBwbGFjZSBmb3IgY29uc2lzdGVuY3lcbiAgcmV0dXJuIE1hdGgucm91bmQoY29udmVydGVkICogMTApIC8gMTA7XG59XG5cbi8qKlxuICogUGFyc2UgYSBudW1lcmljIHZhbHVlIGZyb20gTWV0cmljVmFsdWUgdHlwZS5cbiAqL1xuZnVuY3Rpb24gcGFyc2VOdW1lcmljVmFsdWUodmFsdWU6IE1ldHJpY1ZhbHVlKTogbnVtYmVyIHwgbnVsbCB7XG4gIGlmICh2YWx1ZSA9PT0gbnVsbCB8fCB2YWx1ZSA9PT0gXCJcIikgcmV0dXJuIG51bGw7XG4gIGlmICh0eXBlb2YgdmFsdWUgPT09IFwibnVtYmVyXCIpIHJldHVybiBpc05hTih2YWx1ZSkgPyBudWxsIDogdmFsdWU7XG4gIFxuICBjb25zdCBwYXJzZWQgPSBwYXJzZUZsb2F0KHZhbHVlKTtcbiAgcmV0dXJuIGlzTmFOKHBhcnNlZCkgPyBudWxsIDogcGFyc2VkO1xufVxuXG5leHBvcnQgdHlwZSBNZXRyaWNWYWx1ZSA9IHN0cmluZyB8IG51bWJlciB8IG51bGw7XG4iLCAiLyoqXG4gKiBDU1Ygd3JpdGVyIGZvciBUcmFja1B1bGwgc2Vzc2lvbiBkYXRhLlxuICogSW1wbGVtZW50cyBjb3JlIGNvbHVtbnM6IERhdGUsIENsdWIsIFNob3QgIywgVHlwZVxuICovXG5cbmltcG9ydCB0eXBlIHsgU2Vzc2lvbkRhdGEsIENsdWJHcm91cCwgU2hvdCB9IGZyb20gXCIuLi9tb2RlbHMvdHlwZXNcIjtcbmltcG9ydCB7XG4gIGdldFVuaXRTeXN0ZW0sXG4gIG5vcm1hbGl6ZU1ldHJpY1ZhbHVlLFxufSBmcm9tIFwiLi91bml0X25vcm1hbGl6YXRpb25cIjtcbmltcG9ydCB7IE1FVFJJQ19ESVNQTEFZX05BTUVTIH0gZnJvbSBcIi4vY29uc3RhbnRzXCI7XG5cbmNvbnN0IE1FVFJJQ19DT0xVTU5fT1JERVI6IHN0cmluZ1tdID0gW1xuICAvLyBTcGVlZCAmIEVmZmljaWVuY3lcbiAgXCJDbHViU3BlZWRcIiwgXCJCYWxsU3BlZWRcIiwgXCJTbWFzaEZhY3RvclwiLFxuICAvLyBDbHViIERlbGl2ZXJ5XG4gIFwiQXR0YWNrQW5nbGVcIiwgXCJDbHViUGF0aFwiLCBcIkZhY2VBbmdsZVwiLCBcIkZhY2VUb1BhdGhcIiwgXCJTd2luZ0RpcmVjdGlvblwiLCBcIkR5bmFtaWNMb2Z0XCIsXG4gIC8vIExhdW5jaCAmIFNwaW5cbiAgXCJMYXVuY2hBbmdsZVwiLCBcIkxhdW5jaERpcmVjdGlvblwiLCBcIlNwaW5SYXRlXCIsIFwiU3BpbkF4aXNcIiwgXCJTcGluTG9mdFwiLFxuICAvLyBEaXN0YW5jZVxuICBcIkNhcnJ5XCIsIFwiVG90YWxcIixcbiAgLy8gRGlzcGVyc2lvblxuICBcIlNpZGVcIiwgXCJTaWRlVG90YWxcIiwgXCJDYXJyeVNpZGVcIiwgXCJUb3RhbFNpZGVcIiwgXCJDdXJ2ZVwiLFxuICAvLyBCYWxsIEZsaWdodFxuICBcIkhlaWdodFwiLCBcIk1heEhlaWdodFwiLCBcIkxhbmRpbmdBbmdsZVwiLCBcIkhhbmdUaW1lXCIsXG4gIC8vIEltcGFjdFxuICBcIkxvd1BvaW50RGlzdGFuY2VcIiwgXCJJbXBhY3RIZWlnaHRcIiwgXCJJbXBhY3RPZmZzZXRcIixcbiAgLy8gT3RoZXJcbiAgXCJUZW1wb1wiLFxuXTtcblxuZnVuY3Rpb24gZ2V0RGlzcGxheU5hbWUobWV0cmljOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gTUVUUklDX0RJU1BMQVlfTkFNRVNbbWV0cmljXSA/PyBtZXRyaWM7XG59XG5cbmZ1bmN0aW9uIGdlbmVyYXRlRmlsZW5hbWUoc2Vzc2lvbjogU2Vzc2lvbkRhdGEpOiBzdHJpbmcge1xuICByZXR1cm4gYFNob3REYXRhXyR7c2Vzc2lvbi5kYXRlfS5jc3ZgO1xufVxuXG5mdW5jdGlvbiBvcmRlck1ldHJpY3NCeVByaW9yaXR5KFxuICBhbGxNZXRyaWNzOiBzdHJpbmdbXSxcbiAgcHJpb3JpdHlPcmRlcjogc3RyaW5nW11cbik6IHN0cmluZ1tdIHtcbiAgY29uc3QgcmVzdWx0OiBzdHJpbmdbXSA9IFtdO1xuICBjb25zdCBzZWVuID0gbmV3IFNldDxzdHJpbmc+KCk7XG5cbiAgZm9yIChjb25zdCBtZXRyaWMgb2YgcHJpb3JpdHlPcmRlcikge1xuICAgIGlmIChhbGxNZXRyaWNzLmluY2x1ZGVzKG1ldHJpYykgJiYgIXNlZW4uaGFzKG1ldHJpYykpIHtcbiAgICAgIHJlc3VsdC5wdXNoKG1ldHJpYyk7XG4gICAgICBzZWVuLmFkZChtZXRyaWMpO1xuICAgIH1cbiAgfVxuXG4gIGZvciAoY29uc3QgbWV0cmljIG9mIGFsbE1ldHJpY3MpIHtcbiAgICBpZiAoIXNlZW4uaGFzKG1ldHJpYykpIHtcbiAgICAgIHJlc3VsdC5wdXNoKG1ldHJpYyk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gaGFzVGFncyhzZXNzaW9uOiBTZXNzaW9uRGF0YSk6IGJvb2xlYW4ge1xuICByZXR1cm4gc2Vzc2lvbi5jbHViX2dyb3Vwcy5zb21lKChjbHViKSA9PlxuICAgIGNsdWIuc2hvdHMuc29tZSgoc2hvdCkgPT4gc2hvdC50YWcgIT09IHVuZGVmaW5lZCAmJiBzaG90LnRhZyAhPT0gXCJcIilcbiAgKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHdyaXRlQ3N2KFxuICBzZXNzaW9uOiBTZXNzaW9uRGF0YSxcbiAgb3V0cHV0RmlsZW5hbWU/OiBzdHJpbmcsXG4gIGluY2x1ZGVBdmVyYWdlcyA9IHRydWUsXG4gIG1ldHJpY09yZGVyPzogc3RyaW5nW11cbik6IHN0cmluZyB7XG4gIGNvbnN0IGZpbGVuYW1lID0gb3V0cHV0RmlsZW5hbWUgPz8gZ2VuZXJhdGVGaWxlbmFtZShzZXNzaW9uKTtcblxuICBjb25zdCBvcmRlcmVkTWV0cmljcyA9IG9yZGVyTWV0cmljc0J5UHJpb3JpdHkoXG4gICAgc2Vzc2lvbi5tZXRyaWNfbmFtZXMsXG4gICAgbWV0cmljT3JkZXIgPz8gTUVUUklDX0NPTFVNTl9PUkRFUlxuICApO1xuXG4gIGNvbnN0IGhlYWRlclJvdzogc3RyaW5nW10gPSBbXCJEYXRlXCIsIFwiQ2x1YlwiXTtcbiAgXG4gIGlmIChoYXNUYWdzKHNlc3Npb24pKSB7XG4gICAgaGVhZGVyUm93LnB1c2goXCJUYWdcIik7XG4gIH1cbiAgXG4gIGhlYWRlclJvdy5wdXNoKFwiU2hvdCAjXCIsIFwiVHlwZVwiKTtcbiAgXG4gIGZvciAoY29uc3QgbWV0cmljIG9mIG9yZGVyZWRNZXRyaWNzKSB7XG4gICAgaGVhZGVyUm93LnB1c2goZ2V0RGlzcGxheU5hbWUobWV0cmljKSk7XG4gIH1cblxuICBjb25zdCByb3dzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+W10gPSBbXTtcblxuICBmb3IgKGNvbnN0IGNsdWIgb2Ygc2Vzc2lvbi5jbHViX2dyb3Vwcykge1xuICAgIGZvciAoY29uc3Qgc2hvdCBvZiBjbHViLnNob3RzKSB7XG4gICAgICBjb25zdCByb3c6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XG4gICAgICAgIERhdGU6IHNlc3Npb24uZGF0ZSxcbiAgICAgICAgQ2x1YjogY2x1Yi5jbHViX25hbWUsXG4gICAgICAgIFwiU2hvdCAjXCI6IFN0cmluZyhzaG90LnNob3RfbnVtYmVyICsgMSksXG4gICAgICAgIFR5cGU6IFwiU2hvdFwiLFxuICAgICAgfTtcblxuICAgICAgaWYgKGhhc1RhZ3Moc2Vzc2lvbikpIHtcbiAgICAgICAgcm93LlRhZyA9IHNob3QudGFnID8/IFwiXCI7XG4gICAgICB9XG5cbiAgICAgIC8vIEdldCB1bml0IHN5c3RlbSBmb3Igbm9ybWFsaXphdGlvblxuICAgICAgY29uc3QgdW5pdFN5c3RlbSA9IGdldFVuaXRTeXN0ZW0oc2Vzc2lvbi5tZXRhZGF0YV9wYXJhbXMpO1xuXG4gICAgICBmb3IgKGNvbnN0IG1ldHJpYyBvZiBvcmRlcmVkTWV0cmljcykge1xuICAgICAgICBjb25zdCBkaXNwbGF5TmFtZSA9IGdldERpc3BsYXlOYW1lKG1ldHJpYyk7XG4gICAgICAgIGxldCByYXdWYWx1ZSA9IHNob3QubWV0cmljc1ttZXRyaWNdID8/IFwiXCI7XG4gICAgICAgIFxuICAgICAgICAvLyBOb3JtYWxpemUgdmFsdWUgYmFzZWQgb24gcmVwb3J0IHVuaXRzL25vcm1hbGl6YXRpb24gcGFyYW1zXG4gICAgICAgIGlmICh0eXBlb2YgcmF3VmFsdWUgPT09IFwic3RyaW5nXCIgfHwgdHlwZW9mIHJhd1ZhbHVlID09PSBcIm51bWJlclwiKSB7XG4gICAgICAgICAgcm93W2Rpc3BsYXlOYW1lXSA9IFN0cmluZyhub3JtYWxpemVNZXRyaWNWYWx1ZShyYXdWYWx1ZSwgbWV0cmljLCB1bml0U3lzdGVtKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcm93W2Rpc3BsYXlOYW1lXSA9IFwiXCI7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcm93cy5wdXNoKHJvdyk7XG4gICAgfVxuXG4gICAgaWYgKGluY2x1ZGVBdmVyYWdlcyAmJiBPYmplY3Qua2V5cyhjbHViLmF2ZXJhZ2VzKS5sZW5ndGggPiAwKSB7XG4gICAgICBjb25zdCBhdmdSb3c6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XG4gICAgICAgIERhdGU6IHNlc3Npb24uZGF0ZSxcbiAgICAgICAgQ2x1YjogY2x1Yi5jbHViX25hbWUsXG4gICAgICAgIFwiU2hvdCAjXCI6IFwiXCIsXG4gICAgICAgIFR5cGU6IFwiQXZlcmFnZVwiLFxuICAgICAgfTtcblxuICAgICAgaWYgKGhhc1RhZ3Moc2Vzc2lvbikpIHtcbiAgICAgICAgYXZnUm93LlRhZyA9IFwiXCI7XG4gICAgICB9XG5cbiAgICAgIC8vIE5vcm1hbGl6ZSBhdmVyYWdlIHZhbHVlcyBiYXNlZCBvbiByZXBvcnQgdW5pdHMvbm9ybWFsaXphdGlvbiBwYXJhbXNcbiAgICAgIGZvciAoY29uc3QgbWV0cmljIG9mIG9yZGVyZWRNZXRyaWNzKSB7XG4gICAgICAgIGNvbnN0IGRpc3BsYXlOYW1lID0gZ2V0RGlzcGxheU5hbWUobWV0cmljKTtcbiAgICAgICAgbGV0IHJhd1ZhbHVlID0gY2x1Yi5hdmVyYWdlc1ttZXRyaWNdID8/IFwiXCI7XG4gICAgICAgIFxuICAgICAgICBpZiAodHlwZW9mIHJhd1ZhbHVlID09PSBcInN0cmluZ1wiIHx8IHR5cGVvZiByYXdWYWx1ZSA9PT0gXCJudW1iZXJcIikge1xuICAgICAgICAgIGF2Z1Jvd1tkaXNwbGF5TmFtZV0gPSBTdHJpbmcobm9ybWFsaXplTWV0cmljVmFsdWUocmF3VmFsdWUsIG1ldHJpYywgdW5pdFN5c3RlbSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGF2Z1Jvd1tkaXNwbGF5TmFtZV0gPSBcIlwiO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJvd3MucHVzaChhdmdSb3cpO1xuICAgIH1cblxuICAgIGlmIChpbmNsdWRlQXZlcmFnZXMgJiYgT2JqZWN0LmtleXMoY2x1Yi5jb25zaXN0ZW5jeSkubGVuZ3RoID4gMCkge1xuICAgICAgY29uc3QgY29uc1JvdzogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcbiAgICAgICAgRGF0ZTogc2Vzc2lvbi5kYXRlLFxuICAgICAgICBDbHViOiBjbHViLmNsdWJfbmFtZSxcbiAgICAgICAgXCJTaG90ICNcIjogXCJcIixcbiAgICAgICAgVHlwZTogXCJDb25zaXN0ZW5jeVwiLFxuICAgICAgfTtcblxuICAgICAgaWYgKGhhc1RhZ3Moc2Vzc2lvbikpIHtcbiAgICAgICAgY29uc1Jvdy5UYWcgPSBcIlwiO1xuICAgICAgfVxuXG4gICAgICAvLyBOb3JtYWxpemUgY29uc2lzdGVuY3kgdmFsdWVzIGJhc2VkIG9uIHJlcG9ydCB1bml0cy9ub3JtYWxpemF0aW9uIHBhcmFtc1xuICAgICAgZm9yIChjb25zdCBtZXRyaWMgb2Ygb3JkZXJlZE1ldHJpY3MpIHtcbiAgICAgICAgY29uc3QgZGlzcGxheU5hbWUgPSBnZXREaXNwbGF5TmFtZShtZXRyaWMpO1xuICAgICAgICBsZXQgcmF3VmFsdWUgPSBjbHViLmNvbnNpc3RlbmN5W21ldHJpY10gPz8gXCJcIjtcbiAgICAgICAgXG4gICAgICAgIGlmICh0eXBlb2YgcmF3VmFsdWUgPT09IFwic3RyaW5nXCIgfHwgdHlwZW9mIHJhd1ZhbHVlID09PSBcIm51bWJlclwiKSB7XG4gICAgICAgICAgY29uc1Jvd1tkaXNwbGF5TmFtZV0gPSBTdHJpbmcobm9ybWFsaXplTWV0cmljVmFsdWUocmF3VmFsdWUsIG1ldHJpYywgdW5pdFN5c3RlbSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnNSb3dbZGlzcGxheU5hbWVdID0gXCJcIjtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByb3dzLnB1c2goY29uc1Jvdyk7XG4gICAgfVxuICB9XG5cbiAgY29uc3QgY3N2Q29udGVudCA9IFtcbiAgICBoZWFkZXJSb3cuam9pbihcIixcIiksXG4gICAgLi4ucm93cy5tYXAoKHJvdykgPT4ge1xuICAgICAgcmV0dXJuIGhlYWRlclJvd1xuICAgICAgICAubWFwKChjb2wpID0+IHtcbiAgICAgICAgICBjb25zdCB2YWx1ZSA9IHJvd1tjb2xdID8/IFwiXCI7XG4gICAgICAgICAgaWYgKHZhbHVlLmluY2x1ZGVzKFwiLFwiKSB8fCB2YWx1ZS5pbmNsdWRlcygnXCInKSB8fCB2YWx1ZS5pbmNsdWRlcyhcIlxcblwiKSkge1xuICAgICAgICAgICAgcmV0dXJuIGBcIiR7dmFsdWUucmVwbGFjZSgvXCIvZywgJ1wiXCInKX1cImA7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgfSlcbiAgICAgICAgLmpvaW4oXCIsXCIpO1xuICAgIH0pLFxuICBdLmpvaW4oXCJcXG5cIik7XG5cbiAgcmV0dXJuIGNzdkNvbnRlbnQ7XG59XG4iLCAiLyoqXG4gKiBTZXJ2aWNlIFdvcmtlciBmb3IgVHJhY2tQdWxsIENocm9tZSBFeHRlbnNpb25cbiAqL1xuXG5pbXBvcnQgeyBTVE9SQUdFX0tFWVMgfSBmcm9tIFwiLi4vc2hhcmVkL2NvbnN0YW50c1wiO1xuaW1wb3J0IHsgd3JpdGVDc3YgfSBmcm9tIFwiLi4vc2hhcmVkL2Nzdl93cml0ZXJcIjtcbmltcG9ydCB0eXBlIHsgU2Vzc2lvbkRhdGEgfSBmcm9tIFwiLi4vbW9kZWxzL3R5cGVzXCI7XG5cbmNocm9tZS5ydW50aW1lLm9uSW5zdGFsbGVkLmFkZExpc3RlbmVyKCgpID0+IHtcbiAgY29uc29sZS5sb2coXCJUcmFja1B1bGwgZXh0ZW5zaW9uIGluc3RhbGxlZFwiKTtcbn0pO1xuXG5pbnRlcmZhY2UgU2F2ZURhdGFSZXF1ZXN0IHtcbiAgdHlwZTogXCJTQVZFX0RBVEFcIjtcbiAgZGF0YTogU2Vzc2lvbkRhdGE7XG59XG5cbmludGVyZmFjZSBFeHBvcnRDc3ZSZXF1ZXN0IHtcbiAgdHlwZTogXCJFWFBPUlRfQ1NWX1JFUVVFU1RcIjtcbn1cblxuaW50ZXJmYWNlIEdldERhdGFSZXF1ZXN0IHtcbiAgdHlwZTogXCJHRVRfREFUQVwiO1xufVxuXG5mdW5jdGlvbiBnZXREb3dubG9hZEVycm9yTWVzc2FnZShvcmlnaW5hbEVycm9yOiBzdHJpbmcpOiBzdHJpbmcge1xuICBpZiAob3JpZ2luYWxFcnJvci5pbmNsdWRlcyhcImludmFsaWRcIikpIHtcbiAgICByZXR1cm4gXCJJbnZhbGlkIGRvd25sb2FkIGZvcm1hdFwiO1xuICB9XG4gIGlmIChvcmlnaW5hbEVycm9yLmluY2x1ZGVzKFwicXVvdGFcIikgfHwgb3JpZ2luYWxFcnJvci5pbmNsdWRlcyhcInNwYWNlXCIpKSB7XG4gICAgcmV0dXJuIFwiSW5zdWZmaWNpZW50IHN0b3JhZ2Ugc3BhY2VcIjtcbiAgfVxuICBpZiAob3JpZ2luYWxFcnJvci5pbmNsdWRlcyhcImJsb2NrZWRcIikgfHwgb3JpZ2luYWxFcnJvci5pbmNsdWRlcyhcInBvbGljeVwiKSkge1xuICAgIHJldHVybiBcIkRvd25sb2FkIGJsb2NrZWQgYnkgYnJvd3NlciBzZXR0aW5nc1wiO1xuICB9XG4gIHJldHVybiBvcmlnaW5hbEVycm9yO1xufVxuXG4vLyBVbml0IGNvbnZlcnNpb24gY29uc3RhbnRzIChtZXRyaWMgXHUyMTkyIGltcGVyaWFsKVxuY29uc3QgTVNfVE9fTVBIID0gMi4yMzY5NDtcbmNvbnN0IE1FVEVSU19UT19ZQVJEUyA9IDEuMDkzNjE7XG5cbmNvbnN0IFNQRUVEX01FVFJJQ1MgPSBuZXcgU2V0KFtcIkNsdWJTcGVlZFwiLCBcIkJhbGxTcGVlZFwiXSk7XG5jb25zdCBESVNUQU5DRV9NRVRSSUNTID0gbmV3IFNldChbXG4gIFwiQ2FycnlcIiwgXCJUb3RhbFwiLCBcIlNpZGVcIiwgXCJTaWRlVG90YWxcIiwgXCJDYXJyeVNpZGVcIiwgXCJUb3RhbFNpZGVcIixcbiAgXCJIZWlnaHRcIiwgXCJNYXhIZWlnaHRcIiwgXCJDdXJ2ZVwiLCBcIkxvd1BvaW50RGlzdGFuY2VcIixcbl0pO1xuXG5mdW5jdGlvbiBjb252ZXJ0TWV0cmljKGtleTogc3RyaW5nLCB2YWx1ZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgbnVtID0gcGFyc2VGbG9hdCh2YWx1ZSk7XG4gIGlmIChpc05hTihudW0pKSByZXR1cm4gdmFsdWU7XG4gIGlmIChTUEVFRF9NRVRSSUNTLmhhcyhrZXkpKSByZXR1cm4gYCR7TWF0aC5yb3VuZChudW0gKiBNU19UT19NUEggKiAxMCkgLyAxMH1gO1xuICBpZiAoRElTVEFOQ0VfTUVUUklDUy5oYXMoa2V5KSkgcmV0dXJuIGAke01hdGgucm91bmQobnVtICogTUVURVJTX1RPX1lBUkRTICogMTApIC8gMTB9YDtcbiAgcmV0dXJuIHZhbHVlO1xufVxuXG5mdW5jdGlvbiB0b0ltcGVyaWFsU2Vzc2lvbihzZXNzaW9uOiBTZXNzaW9uRGF0YSk6IFNlc3Npb25EYXRhIHtcbiAgY29uc3QgY29udmVydGVkOiBTZXNzaW9uRGF0YSA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoc2Vzc2lvbikpO1xuICBmb3IgKGNvbnN0IGdyb3VwIG9mIGNvbnZlcnRlZC5jbHViX2dyb3Vwcykge1xuICAgIGZvciAoY29uc3Qgc2hvdCBvZiBncm91cC5zaG90cykge1xuICAgICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMoc2hvdC5tZXRyaWNzKSkge1xuICAgICAgICBzaG90Lm1ldHJpY3Nba2V5XSA9IGNvbnZlcnRNZXRyaWMoa2V5LCBzaG90Lm1ldHJpY3Nba2V5XSk7XG4gICAgICB9XG4gICAgfVxuICAgIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKGdyb3VwLmF2ZXJhZ2VzKSkge1xuICAgICAgZ3JvdXAuYXZlcmFnZXNba2V5XSA9IGNvbnZlcnRNZXRyaWMoa2V5LCBncm91cC5hdmVyYWdlc1trZXldKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMoZ3JvdXAuY29uc2lzdGVuY3kpKSB7XG4gICAgICBncm91cC5jb25zaXN0ZW5jeVtrZXldID0gY29udmVydE1ldHJpYyhrZXksIGdyb3VwLmNvbnNpc3RlbmN5W2tleV0pO1xuICAgIH1cbiAgfVxuICByZXR1cm4gY29udmVydGVkO1xufVxuXG50eXBlIFJlcXVlc3RNZXNzYWdlID0gU2F2ZURhdGFSZXF1ZXN0IHwgRXhwb3J0Q3N2UmVxdWVzdCB8IEdldERhdGFSZXF1ZXN0O1xuXG5jaHJvbWUucnVudGltZS5vbk1lc3NhZ2UuYWRkTGlzdGVuZXIoKG1lc3NhZ2U6IFJlcXVlc3RNZXNzYWdlLCBzZW5kZXIsIHNlbmRSZXNwb25zZSkgPT4ge1xuICBpZiAobWVzc2FnZS50eXBlID09PSBcIkdFVF9EQVRBXCIpIHtcbiAgICBjaHJvbWUuc3RvcmFnZS5sb2NhbC5nZXQoW1NUT1JBR0VfS0VZUy5UUkFDS01BTl9EQVRBXSwgKHJlc3VsdCkgPT4ge1xuICAgICAgc2VuZFJlc3BvbnNlKHJlc3VsdFtTVE9SQUdFX0tFWVMuVFJBQ0tNQU5fREFUQV0gfHwgbnVsbCk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBpZiAobWVzc2FnZS50eXBlID09PSBcIlNBVkVfREFUQVwiKSB7XG4gICAgY29uc3Qgc2Vzc2lvbkRhdGEgPSAobWVzc2FnZSBhcyBTYXZlRGF0YVJlcXVlc3QpLmRhdGE7XG4gICAgY2hyb21lLnN0b3JhZ2UubG9jYWwuc2V0KHsgW1NUT1JBR0VfS0VZUy5UUkFDS01BTl9EQVRBXTogc2Vzc2lvbkRhdGEgfSwgKCkgPT4ge1xuICAgICAgaWYgKGNocm9tZS5ydW50aW1lLmxhc3RFcnJvcikge1xuICAgICAgICBjb25zb2xlLmVycm9yKFwiVHJhY2tQdWxsOiBGYWlsZWQgdG8gc2F2ZSBkYXRhOlwiLCBjaHJvbWUucnVudGltZS5sYXN0RXJyb3IpO1xuICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGNocm9tZS5ydW50aW1lLmxhc3RFcnJvci5tZXNzYWdlIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJUcmFja1B1bGw6IFNlc3Npb24gZGF0YSBzYXZlZCB0byBzdG9yYWdlXCIpO1xuICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiB0cnVlIH0pO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgaWYgKG1lc3NhZ2UudHlwZSA9PT0gXCJFWFBPUlRfQ1NWX1JFUVVFU1RcIikge1xuICAgIGNocm9tZS5zdG9yYWdlLmxvY2FsLmdldChbU1RPUkFHRV9LRVlTLlRSQUNLTUFOX0RBVEEsIFNUT1JBR0VfS0VZUy5VTklUX1BSRUZdLCAocmVzdWx0KSA9PiB7XG4gICAgICBjb25zdCBkYXRhID0gcmVzdWx0W1NUT1JBR0VfS0VZUy5UUkFDS01BTl9EQVRBXSBhcyBTZXNzaW9uRGF0YSB8IHVuZGVmaW5lZDtcbiAgICAgIGlmICghZGF0YSB8fCAhZGF0YS5jbHViX2dyb3VwcyB8fCBkYXRhLmNsdWJfZ3JvdXBzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFwiTm8gZGF0YSB0byBleHBvcnRcIiB9KTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCB1bml0UHJlZiA9IChyZXN1bHRbU1RPUkFHRV9LRVlTLlVOSVRfUFJFRl0gYXMgc3RyaW5nKSB8fCBcImltcGVyaWFsXCI7XG4gICAgICAgIGNvbnN0IGV4cG9ydERhdGEgPSB1bml0UHJlZiA9PT0gXCJpbXBlcmlhbFwiID8gdG9JbXBlcmlhbFNlc3Npb24oZGF0YSkgOiBkYXRhO1xuICAgICAgICBjb25zdCBjc3ZDb250ZW50ID0gd3JpdGVDc3YoZXhwb3J0RGF0YSk7XG4gICAgICAgIGNvbnN0IGZpbGVuYW1lID0gYFNob3REYXRhXyR7ZGF0YS5kYXRlIHx8IFwidW5rbm93blwifS5jc3ZgO1xuXG4gICAgICAgIGNocm9tZS5kb3dubG9hZHMuZG93bmxvYWQoXG4gICAgICAgICAge1xuICAgICAgICAgICAgdXJsOiBgZGF0YTp0ZXh0L2NzdjtjaGFyc2V0PXV0Zi04LCR7ZW5jb2RlVVJJQ29tcG9uZW50KGNzdkNvbnRlbnQpfWAsXG4gICAgICAgICAgICBmaWxlbmFtZTogZmlsZW5hbWUsXG4gICAgICAgICAgICBzYXZlQXM6IGZhbHNlLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgKGRvd25sb2FkSWQpID0+IHtcbiAgICAgICAgICAgIGlmIChjaHJvbWUucnVudGltZS5sYXN0RXJyb3IpIHtcbiAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIlRyYWNrUHVsbDogRG93bmxvYWQgZmFpbGVkOlwiLCBjaHJvbWUucnVudGltZS5sYXN0RXJyb3IpO1xuICAgICAgICAgICAgICBjb25zdCBlcnJvck1lc3NhZ2UgPSBnZXREb3dubG9hZEVycm9yTWVzc2FnZShjaHJvbWUucnVudGltZS5sYXN0RXJyb3IubWVzc2FnZSk7XG4gICAgICAgICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3JNZXNzYWdlIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coYFRyYWNrUHVsbDogQ1NWIGV4cG9ydGVkIHdpdGggZG93bmxvYWQgSUQgJHtkb3dubG9hZElkfWApO1xuICAgICAgICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiB0cnVlLCBkb3dubG9hZElkLCBmaWxlbmFtZSB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBjb25zb2xlLmVycm9yKFwiVHJhY2tQdWxsOiBDU1YgZ2VuZXJhdGlvbiBmYWlsZWQ6XCIsIGVycm9yKTtcbiAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcikgfSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbn0pO1xuXG5jaHJvbWUuc3RvcmFnZS5vbkNoYW5nZWQuYWRkTGlzdGVuZXIoKGNoYW5nZXMsIG5hbWVzcGFjZSkgPT4ge1xuICBpZiAobmFtZXNwYWNlID09PSBcImxvY2FsXCIgJiYgY2hhbmdlc1tTVE9SQUdFX0tFWVMuVFJBQ0tNQU5fREFUQV0pIHtcbiAgICBjb25zdCBuZXdWYWx1ZSA9IGNoYW5nZXNbU1RPUkFHRV9LRVlTLlRSQUNLTUFOX0RBVEFdLm5ld1ZhbHVlO1xuICAgIGNocm9tZS5ydW50aW1lLnNlbmRNZXNzYWdlKHsgdHlwZTogXCJEQVRBX1VQREFURURcIiwgZGF0YTogbmV3VmFsdWUgfSkuY2F0Y2goKCkgPT4ge1xuICAgICAgLy8gSWdub3JlIGVycm9ycyB3aGVuIG5vIHBvcHVwIGlzIGxpc3RlbmluZ1xuICAgIH0pO1xuICB9XG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7O0FBNEVPLE1BQU0sdUJBQStDO0FBQUEsSUFDMUQsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsYUFBYTtBQUFBLElBQ2IsYUFBYTtBQUFBLElBQ2IsVUFBVTtBQUFBLElBQ1YsV0FBVztBQUFBLElBQ1gsWUFBWTtBQUFBLElBQ1osZ0JBQWdCO0FBQUEsSUFDaEIsYUFBYTtBQUFBLElBQ2IsVUFBVTtBQUFBLElBQ1YsVUFBVTtBQUFBLElBQ1YsVUFBVTtBQUFBLElBQ1YsYUFBYTtBQUFBLElBQ2IsaUJBQWlCO0FBQUEsSUFDakIsT0FBTztBQUFBLElBQ1AsT0FBTztBQUFBLElBQ1AsTUFBTTtBQUFBLElBQ04sV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsV0FBVztBQUFBLElBQ1gsUUFBUTtBQUFBLElBQ1IsV0FBVztBQUFBLElBQ1gsT0FBTztBQUFBLElBQ1AsY0FBYztBQUFBLElBQ2QsVUFBVTtBQUFBLElBQ1Ysa0JBQWtCO0FBQUEsSUFDbEIsY0FBYztBQUFBLElBQ2QsY0FBYztBQUFBLElBQ2QsT0FBTztBQUFBLEVBQ1Q7QUFnQ08sTUFBTSxlQUFlO0FBQUEsSUFDMUIsZUFBZTtBQUFBLElBQ2YsV0FBVztBQUFBLEVBQ2I7OztBQy9ITyxNQUFNLGVBQWlEO0FBQUE7QUFBQSxJQUU1RCxVQUFVO0FB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YUFBYSxDQUFDO0FBQUEsY0FDdEQsT0FBTztBQUNMLHdCQUFRLElBQUksNENBQTRDLFVBQVUsRUFBRTtBQUNwRSw2QkFBYSxFQUFFLFNBQVMsTUFBTSxZQUFZLFNBQVMsQ0FBQztBQUFBLGNBQ3REO0FBQUEsWUFDRjtBQUFBLFVBQ0Y7QUFBQSxRQUNGLFNBQVMsT0FBTztBQUNkLGtCQUFRLE1BQU0scUNBQXFDLEtBQUs7QUFDeEQsdUJBQWEsRUFBRSxTQUFTLE9BQU8sT0FBTyxpQkFBaUIsUUFBUSxNQUFNLFVBQVUsT0FBTyxLQUFLLEVBQUUsQ0FBQztBQUFBLFFBQ2hHO0FBQUEsTUFDRixDQUFDO0FBQ0QsYUFBTztBQUFBLElBQ1Q7QUFBQSxFQUNGLENBQUM7QUFFRCxTQUFPLFFBQVEsVUFBVSxZQUFZLENBQUMsU0FBUyxjQUFjO0FBQzNELFFBQUksY0FBYyxXQUFXLFFBQVEsYUFBYSxhQUFhLEdBQUc7QUFDaEUsWUFBTSxXQUFXLFFBQVEsYUFBYSxhQUFhLEVBQUU7QUFDckQsYUFBTyxRQUFRLFlBQVksRUFBRSxNQUFNLGdCQUFnQixNQUFNLFNBQVMsQ0FBQyxFQUFFLE1BQU0sTUFBTTtBQUFBLE1BRWpGLENBQUM7QUFBQSxJQUNIO0FBQUEsRUFDRixDQUFDOyIsCiAgIm5hbWVzIjogWyJ1bml0U3lzdGVtIiwgIlNQRUVEX01FVFJJQ1MiLCAiRElTVEFOQ0VfTUVUUklDUyJdCn0K
