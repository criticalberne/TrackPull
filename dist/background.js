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
    return `${session.date}_TrackmanData.csv`;
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
    console.log("Trackman Scraper extension installed");
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
          console.error("Trackman Scraper: Failed to save data:", chrome.runtime.lastError);
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          console.log("Trackman Scraper: Session data saved to storage");
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
          const filename = `${data.date || "unknown"}_TrackmanData.csv`;
          chrome.downloads.download(
            {
              url: `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`,
              filename,
              saveAs: false
            },
            (downloadId) => {
              if (chrome.runtime.lastError) {
                console.error("Trackman Scraper: Download failed:", chrome.runtime.lastError);
                const errorMessage = getDownloadErrorMessage(chrome.runtime.lastError.message);
                sendResponse({ success: false, error: errorMessage });
              } else {
                console.log(`Trackman Scraper: CSV exported with download ID ${downloadId}`);
                sendResponse({ success: true, downloadId, filename });
              }
            }
          );
        } catch (error) {
          console.error("Trackman Scraper: CSV generation failed:", error);
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL3NoYXJlZC9jb25zdGFudHMudHMiLCAiLi4vc3JjL3NoYXJlZC91bml0X25vcm1hbGl6YXRpb24udHMiLCAiLi4vc3JjL3NoYXJlZC9jc3Zfd3JpdGVyLnRzIiwgIi4uL3NyYy9iYWNrZ3JvdW5kL3NlcnZpY2VXb3JrZXIudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbIi8qKlxuICogU2hhcmVkIGNvbnN0YW50cyBpbmNsdWRpbmcgQ1NTIHNlbGVjdG9ycyBhbmQgY29uZmlndXJhdGlvbi5cbiAqIEJhc2VkIG9uIFB5dGhvbiBzY3JhcGVyIGNvbnN0YW50cy5weSBpbXBsZW1lbnRhdGlvbi5cbiAqL1xuXG4vLyBDb21wbGV0ZSBsaXN0IG9mIGFsbCBrbm93biBUcmFja21hbiBtZXRyaWNzIChVUkwgcGFyYW1ldGVyIG5hbWVzKVxuZXhwb3J0IGNvbnN0IEFMTF9NRVRSSUNTID0gW1xuICBcIkNsdWJTcGVlZFwiLFxuICBcIkJhbGxTcGVlZFwiLFxuICBcIlNtYXNoRmFjdG9yXCIsXG4gIFwiQXR0YWNrQW5nbGVcIixcbiAgXCJDbHViUGF0aFwiLFxuICBcIkZhY2VBbmdsZVwiLFxuICBcIkZhY2VUb1BhdGhcIixcbiAgXCJTd2luZ0RpcmVjdGlvblwiLFxuICBcIkR5bmFtaWNMb2Z0XCIsXG4gIFwiU3BpblJhdGVcIixcbiAgXCJTcGluQXhpc1wiLFxuICBcIlNwaW5Mb2Z0XCIsXG4gIFwiTGF1bmNoQW5nbGVcIixcbiAgXCJMYXVuY2hEaXJlY3Rpb25cIixcbiAgXCJDYXJyeVwiLFxuICBcIlRvdGFsXCIsXG4gIFwiU2lkZVwiLFxuICBcIlNpZGVUb3RhbFwiLFxuICBcIkNhcnJ5U2lkZVwiLFxuICBcIlRvdGFsU2lkZVwiLFxuICBcIkhlaWdodFwiLFxuICBcIk1heEhlaWdodFwiLFxuICBcIkN1cnZlXCIsXG4gIFwiTGFuZGluZ0FuZ2xlXCIsXG4gIFwiSGFuZ1RpbWVcIixcbiAgXCJMb3dQb2ludERpc3RhbmNlXCIsXG4gIFwiSW1wYWN0SGVpZ2h0XCIsXG4gIFwiSW1wYWN0T2Zmc2V0XCIsXG4gIFwiVGVtcG9cIixcbl0gYXMgY29uc3Q7XG5cbi8vIE1ldHJpY3Mgc3BsaXQgaW50byBncm91cHMgZm9yIG11bHRpLXBhZ2UtbG9hZCBIVE1MIGZhbGxiYWNrXG5leHBvcnQgY29uc3QgTUVUUklDX0dST1VQUyA9IFtcbiAgW1xuICAgIFwiQ2x1YlNwZWVkXCIsXG4gICAgXCJCYWxsU3BlZWRcIixcbiAgICBcIlNtYXNoRmFjdG9yXCIsXG4gICAgXCJBdHRhY2tBbmdsZVwiLFxuICAgIFwiQ2x1YlBhdGhcIixcbiAgICBcIkZhY2VBbmdsZVwiLFxuICAgIFwiRmFjZVRvUGF0aFwiLFxuICAgIFwiU3dpbmdEaXJlY3Rpb25cIixcbiAgICBcIkR5bmFtaWNMb2Z0XCIsXG4gICAgXCJTcGluTG9mdFwiLFxuICBdLFxuICBbXG4gICAgXCJTcGluUmF0ZVwiLFxuICAgIFwiU3BpbkF4aXNcIixcbiAgICBcIkxhdW5jaEFuZ2xlXCIsXG4gICAgXCJMYXVuY2hEaXJlY3Rpb25cIixcbiAgICBcIkNhcnJ5XCIsXG4gICAgXCJUb3RhbFwiLFxuICAgIFwiU2lkZVwiLFxuICAgIFwiU2lkZVRvdGFsXCIsXG4gICAgXCJDYXJyeVNpZGVcIixcbiAgICBcIlRvdGFsU2lkZVwiLFxuICAgIFwiSGVpZ2h0XCIsXG4gICAgXCJNYXhIZWlnaHRcIixcbiAgICBcIkN1cnZlXCIsXG4gICAgXCJMYW5kaW5nQW5nbGVcIixcbiAgICBcIkhhbmdUaW1lXCIsXG4gICAgXCJMb3dQb2ludERpc3RhbmNlXCIsXG4gICAgXCJJbXBhY3RIZWlnaHRcIixcbiAgICBcIkltcGFjdE9mZnNldFwiLFxuICAgIFwiVGVtcG9cIixcbiAgXSxcbl0gYXMgY29uc3Q7XG5cbi8vIERpc3BsYXkgbmFtZXM6IFVSTCBwYXJhbSBuYW1lIC0+IGh1bWFuLXJlYWRhYmxlIENTViBoZWFkZXJcbmV4cG9ydCBjb25zdCBNRVRSSUNfRElTUExBWV9OQU1FUzogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcbiAgQ2x1YlNwZWVkOiBcIkNsdWIgU3BlZWRcIixcbiAgQmFsbFNwZWVkOiBcIkJhbGwgU3BlZWRcIixcbiAgU21hc2hGYWN0b3I6IFwiU21hc2ggRmFjdG9yXCIsXG4gIEF0dGFja0FuZ2xlOiBcIkF0dGFjayBBbmdsZVwiLFxuICBDbHViUGF0aDogXCJDbHViIFBhdGhcIixcbiAgRmFjZUFuZ2xlOiBcIkZhY2UgQW5nbGVcIixcbiAgRmFjZVRvUGF0aDogXCJGYWNlIFRvIFBhdGhcIixcbiAgU3dpbmdEaXJlY3Rpb246IFwiU3dpbmcgRGlyZWN0aW9uXCIsXG4gIER5bmFtaWNMb2Z0OiBcIkR5bmFtaWMgTG9mdFwiLFxuICBTcGluUmF0ZTogXCJTcGluIFJhdGVcIixcbiAgU3BpbkF4aXM6IFwiU3BpbiBBeGlzXCIsXG4gIFNwaW5Mb2Z0OiBcIlNwaW4gTG9mdFwiLFxuICBMYXVuY2hBbmdsZTogXCJMYXVuY2ggQW5nbGVcIixcbiAgTGF1bmNoRGlyZWN0aW9uOiBcIkxhdW5jaCBEaXJlY3Rpb25cIixcbiAgQ2Fycnk6IFwiQ2FycnlcIixcbiAgVG90YWw6IFwiVG90YWxcIixcbiAgU2lkZTogXCJTaWRlXCIsXG4gIFNpZGVUb3RhbDogXCJTaWRlIFRvdGFsXCIsXG4gIENhcnJ5U2lkZTogXCJDYXJyeSBTaWRlXCIsXG4gIFRvdGFsU2lkZTogXCJUb3RhbCBTaWRlXCIsXG4gIEhlaWdodDogXCJIZWlnaHRcIixcbiAgTWF4SGVpZ2h0OiBcIk1heCBIZWlnaHRcIixcbiAgQ3VydmU6IFwiQ3VydmVcIixcbiAgTGFuZGluZ0FuZ2xlOiBcIkxhbmRpbmcgQW5nbGVcIixcbiAgSGFuZ1RpbWU6IFwiSGFuZyBUaW1lXCIsXG4gIExvd1BvaW50RGlzdGFuY2U6IFwiTG93IFBvaW50XCIsXG4gIEltcGFjdEhlaWdodDogXCJJbXBhY3QgSGVpZ2h0XCIsXG4gIEltcGFjdE9mZnNldDogXCJJbXBhY3QgT2Zmc2V0XCIsXG4gIFRlbXBvOiBcIlRlbXBvXCIsXG59O1xuXG4vLyBDU1MgY2xhc3Mgc2VsZWN0b3JzIChmcm9tIFRyYWNrbWFuJ3MgcmVuZGVyZWQgSFRNTClcbmV4cG9ydCBjb25zdCBDU1NfREFURSA9IFwiZGF0ZVwiO1xuZXhwb3J0IGNvbnN0IENTU19SRVNVTFRTX1dSQVBQRVIgPSBcInBsYXllci1hbmQtcmVzdWx0cy10YWJsZS13cmFwcGVyXCI7XG5leHBvcnQgY29uc3QgQ1NTX1JFU1VMVFNfVEFCTEUgPSBcIlJlc3VsdHNUYWJsZVwiO1xuZXhwb3J0IGNvbnN0IENTU19DTFVCX1RBRyA9IFwiZ3JvdXAtdGFnXCI7XG5leHBvcnQgY29uc3QgQ1NTX1BBUkFNX05BTUVTX1JPVyA9IFwicGFyYW1ldGVyLW5hbWVzLXJvd1wiO1xuZXhwb3J0IGNvbnN0IENTU19QQVJBTV9OQU1FID0gXCJwYXJhbWV0ZXItbmFtZVwiO1xuZXhwb3J0IGNvbnN0IENTU19TSE9UX0RFVEFJTF9ST1cgPSBcInJvdy13aXRoLXNob3QtZGV0YWlsc1wiO1xuZXhwb3J0IGNvbnN0IENTU19BVkVSQUdFX1ZBTFVFUyA9IFwiYXZlcmFnZS12YWx1ZXNcIjtcbmV4cG9ydCBjb25zdCBDU1NfQ09OU0lTVEVOQ1lfVkFMVUVTID0gXCJjb25zaXN0ZW5jeS12YWx1ZXNcIjtcblxuLy8gQVBJIFVSTCBwYXR0ZXJucyB0aGF0IGxpa2VseSBpbmRpY2F0ZSBhbiBBUEkgZGF0YSByZXNwb25zZVxuZXhwb3J0IGNvbnN0IEFQSV9VUkxfUEFUVEVSTlMgPSBbXG4gIFwiYXBpLnRyYWNrbWFuZ29sZi5jb21cIixcbiAgXCJ0cmFja21hbmdvbGYuY29tL2FwaVwiLFxuICBcIi9hcGkvXCIsXG4gIFwiL3JlcG9ydHMvXCIsXG4gIFwiL2FjdGl2aXRpZXMvXCIsXG4gIFwiL3Nob3RzL1wiLFxuICBcImdyYXBocWxcIixcbl07XG5cbi8vIFRpbWVvdXRzIChtaWxsaXNlY29uZHMpXG5leHBvcnQgY29uc3QgUEFHRV9MT0FEX1RJTUVPVVQgPSAzMF8wMDA7XG5leHBvcnQgY29uc3QgREFUQV9MT0FEX1RJTUVPVVQgPSAxNV8wMDA7XG5cbi8vIFRyYWNrbWFuIGJhc2UgVVJMXG5leHBvcnQgY29uc3QgQkFTRV9VUkwgPSBcImh0dHBzOi8vd2ViLWR5bmFtaWMtcmVwb3J0cy50cmFja21hbmdvbGYuY29tL1wiO1xuXG4vLyBTdG9yYWdlIGtleXMgZm9yIENocm9tZSBleHRlbnNpb24gKGFsaWduZWQgYmV0d2VlbiBiYWNrZ3JvdW5kIGFuZCBwb3B1cClcbmV4cG9ydCBjb25zdCBTVE9SQUdFX0tFWVMgPSB7XG4gIFRSQUNLTUFOX0RBVEE6IFwidHJhY2ttYW5EYXRhXCIsXG4gIFVOSVRfUFJFRjogXCJ1bml0UHJlZmVyZW5jZVwiLFxufSBhcyBjb25zdDtcbiIsICIvKipcbiAqIFVuaXQgbm9ybWFsaXphdGlvbiB1dGlsaXRpZXMgZm9yIFRyYWNrbWFuIG1lYXN1cmVtZW50cy5cbiAqIFxuICogVHJhY2ttYW4gdXNlcyBuZF8qIHBhcmFtZXRlcnMgdG8gc3BlY2lmeSB1bml0czpcbiAqIC0gbmRfMDAxLCBuZF8wMDIsIGV0Yy4gZGVmaW5lIHVuaXQgc3lzdGVtcyBmb3IgZGlmZmVyZW50IG1lYXN1cmVtZW50IGdyb3Vwc1xuICogLSBDb21tb24gdmFsdWVzOiA3ODkwMTIgPSB5YXJkcy9kZWdyZWVzLCA3ODkwMTMgPSBtZXRlcnMvcmFkaWFuc1xuICovXG5cbmV4cG9ydCB0eXBlIFVuaXRTeXN0ZW1JZCA9IFwiNzg5MDEyXCIgfCBcIjc4OTAxM1wiIHwgXCI3ODkwMTRcIiB8IHN0cmluZztcblxuLyoqXG4gKiBUcmFja21hbiB1bml0IHN5c3RlbSBkZWZpbml0aW9ucy5cbiAqIE1hcHMgbmRfKiBwYXJhbWV0ZXIgdmFsdWVzIHRvIGFjdHVhbCB1bml0cyBmb3IgZWFjaCBtZXRyaWMuXG4gKi9cbmV4cG9ydCBjb25zdCBVTklUX1NZU1RFTVM6IFJlY29yZDxVbml0U3lzdGVtSWQsIFVuaXRTeXN0ZW0+ID0ge1xuICAvLyBJbXBlcmlhbCAoeWFyZHMsIGRlZ3JlZXMpIC0gbW9zdCBjb21tb25cbiAgXCI3ODkwMTJcIjoge1xuICAgIGlkOiBcIjc4OTAxMlwiLFxuICAgIG5hbWU6IFwiSW1wZXJpYWxcIixcbiAgICBkaXN0YW5jZVVuaXQ6IFwieWFyZHNcIixcbiAgICBhbmdsZVVuaXQ6IFwiZGVncmVlc1wiLFxuICAgIHNwZWVkVW5pdDogXCJtcGhcIixcbiAgfSxcbiAgLy8gTWV0cmljIChtZXRlcnMsIHJhZGlhbnMpXG4gIFwiNzg5MDEzXCI6IHtcbiAgICBpZDogXCI3ODkwMTNcIixcbiAgICBuYW1lOiBcIk1ldHJpYyAocmFkKVwiLFxuICAgIGRpc3RhbmNlVW5pdDogXCJtZXRlcnNcIixcbiAgICBhbmdsZVVuaXQ6IFwicmFkaWFuc1wiLFxuICAgIHNwZWVkVW5pdDogXCJrbS9oXCIsXG4gIH0sXG4gIC8vIE1ldHJpYyAobWV0ZXJzLCBkZWdyZWVzKSAtIGxlc3MgY29tbW9uXG4gIFwiNzg5MDE0XCI6IHtcbiAgICBpZDogXCI3ODkwMTRcIixcbiAgICBuYW1lOiBcIk1ldHJpYyAoZGVnKVwiLFxuICAgIGRpc3RhbmNlVW5pdDogXCJtZXRlcnNcIixcbiAgICBhbmdsZVVuaXQ6IFwiZGVncmVlc1wiLFxuICAgIHNwZWVkVW5pdDogXCJrbS9oXCIsXG4gIH0sXG59O1xuXG4vKipcbiAqIFVuaXQgc3lzdGVtIGNvbmZpZ3VyYXRpb24uXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVW5pdFN5c3RlbSB7XG4gIGlkOiBVbml0U3lzdGVtSWQ7XG4gIG5hbWU6IHN0cmluZztcbiAgZGlzdGFuY2VVbml0OiBcInlhcmRzXCIgfCBcIm1ldGVyc1wiO1xuICBhbmdsZVVuaXQ6IFwiZGVncmVlc1wiIHwgXCJyYWRpYW5zXCI7XG4gIHNwZWVkVW5pdDogXCJtcGhcIiB8IFwia20vaFwiO1xufVxuXG4vKipcbiAqIE1ldHJpY3MgdGhhdCB1c2UgZGlzdGFuY2UgdW5pdHMuXG4gKi9cbmV4cG9ydCBjb25zdCBESVNUQU5DRV9NRVRSSUNTID0gbmV3IFNldChbXG4gIFwiQ2FycnlcIixcbiAgXCJUb3RhbFwiLFxuICBcIlNpZGVcIixcbiAgXCJTaWRlVG90YWxcIixcbiAgXCJIZWlnaHRcIixcbiAgXCJMb3dQb2ludERpc3RhbmNlXCIsXG5dKTtcblxuLyoqXG4gKiBNZXRyaWNzIHRoYXQgdXNlIGFuZ2xlIHVuaXRzLlxuICovXG5leHBvcnQgY29uc3QgQU5HTEVfTUVUUklDUyA9IG5ldyBTZXQoW1xuICBcIkF0dGFja0FuZ2xlXCIsXG4gIFwiQ2x1YlBhdGhcIixcbiAgXCJGYWNlQW5nbGVcIixcbiAgXCJGYWNlVG9QYXRoXCIsXG4gIFwiRHluYW1pY0xvZnRcIixcbiAgXCJMYXVuY2hBbmdsZVwiLFxuICBcIkxhdW5jaERpcmVjdGlvblwiLFxuXSk7XG5cbi8qKlxuICogTWV0cmljcyB0aGF0IHVzZSBzcGVlZCB1bml0cy5cbiAqL1xuZXhwb3J0IGNvbnN0IFNQRUVEX01FVFJJQ1MgPSBuZXcgU2V0KFtcbiAgXCJDbHViU3BlZWRcIixcbiAgXCJCYWxsU3BlZWRcIixcbiAgXCJUZW1wb1wiLFxuXSk7XG5cbi8qKlxuICogRGVmYXVsdCB1bml0IHN5c3RlbSAoSW1wZXJpYWwgLSB5YXJkcy9kZWdyZWVzKS5cbiAqL1xuZXhwb3J0IGNvbnN0IERFRkFVTFRfVU5JVF9TWVNURU06IFVuaXRTeXN0ZW0gPSBVTklUX1NZU1RFTVNbXCI3ODkwMTJcIl07XG5cbi8qKlxuICogRXh0cmFjdCBuZF8qIHBhcmFtZXRlcnMgZnJvbSBtZXRhZGF0YV9wYXJhbXMuXG4gKiBcbiAqIEBwYXJhbSBtZXRhZGF0YVBhcmFtcyAtIFRoZSBtZXRhZGF0YV9wYXJhbXMgb2JqZWN0IGZyb20gU2Vzc2lvbkRhdGFcbiAqIEByZXR1cm5zIE9iamVjdCBtYXBwaW5nIG1ldHJpYyBncm91cCBJRHMgdG8gdW5pdCBzeXN0ZW0gSURzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBleHRyYWN0VW5pdFBhcmFtcyhcbiAgbWV0YWRhdGFQYXJhbXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz5cbik6IFJlY29yZDxzdHJpbmcsIFVuaXRTeXN0ZW1JZD4ge1xuICBjb25zdCByZXN1bHQ6IFJlY29yZDxzdHJpbmcsIFVuaXRTeXN0ZW1JZD4gPSB7fTtcblxuICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyhtZXRhZGF0YVBhcmFtcykpIHtcbiAgICBjb25zdCBtYXRjaCA9IGtleS5tYXRjaCgvXm5kXyhbYS16MC05XSspJC9pKTtcbiAgICBpZiAobWF0Y2gpIHtcbiAgICAgIGNvbnN0IGdyb3VwS2V5ID0gbWF0Y2hbMV0udG9Mb3dlckNhc2UoKTtcbiAgICAgIHJlc3VsdFtncm91cEtleV0gPSB2YWx1ZSBhcyBVbml0U3lzdGVtSWQ7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmUgdGhlIHVuaXQgc3lzdGVtIElEIGZyb20gbWV0YWRhdGEgcGFyYW1zLlxuICogVXNlcyBuZF8wMDEgYXMgcHJpbWFyeSwgZmFsbHMgYmFjayB0byBkZWZhdWx0LlxuICogXG4gKiBAcGFyYW0gbWV0YWRhdGFQYXJhbXMgLSBUaGUgbWV0YWRhdGFfcGFyYW1zIG9iamVjdFxuICogQHJldHVybnMgVGhlIHVuaXQgc3lzdGVtIElEIHN0cmluZ1xuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0VW5pdFN5c3RlbUlkKFxuICBtZXRhZGF0YVBhcmFtczogUmVjb3JkPHN0cmluZywgc3RyaW5nPlxuKTogVW5pdFN5c3RlbUlkIHtcbiAgY29uc3QgdW5pdFBhcmFtcyA9IGV4dHJhY3RVbml0UGFyYW1zKG1ldGFkYXRhUGFyYW1zKTtcbiAgcmV0dXJuIHVuaXRQYXJhbXNbXCIwMDFcIl0gfHwgXCI3ODkwMTJcIjsgLy8gRGVmYXVsdCB0byBJbXBlcmlhbFxufVxuXG4vKipcbiAqIEdldCB0aGUgZnVsbCB1bml0IHN5c3RlbSBjb25maWd1cmF0aW9uLlxuICogXG4gKiBAcGFyYW0gbWV0YWRhdGFQYXJhbXMgLSBUaGUgbWV0YWRhdGFfcGFyYW1zIG9iamVjdFxuICogQHJldHVybnMgVGhlIFVuaXRTeXN0ZW0gY29uZmlndXJhdGlvblxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0VW5pdFN5c3RlbShcbiAgbWV0YWRhdGFQYXJhbXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz5cbik6IFVuaXRTeXN0ZW0ge1xuICBjb25zdCBpZCA9IGdldFVuaXRTeXN0ZW1JZChtZXRhZGF0YVBhcmFtcyk7XG4gIHJldHVybiBVTklUX1NZU1RFTVNbaWRdIHx8IERFRkFVTFRfVU5JVF9TWVNURU07XG59XG5cbi8qKlxuICogQ29udmVydCBhIGRpc3RhbmNlIHZhbHVlIGJldHdlZW4gdW5pdHMuXG4gKiBcbiAqIEBwYXJhbSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byBjb252ZXJ0XG4gKiBAcGFyYW0gZnJvbVVuaXQgLSBTb3VyY2UgdW5pdCAoXCJ5YXJkc1wiIG9yIFwibWV0ZXJzXCIpXG4gKiBAcGFyYW0gdG9Vbml0IC0gVGFyZ2V0IHVuaXQgKFwieWFyZHNcIiBvciBcIm1ldGVyc1wiKVxuICogQHJldHVybnMgQ29udmVydGVkIHZhbHVlLCBvciBvcmlnaW5hbCBpZiB1bml0cyBtYXRjaFxuICovXG5leHBvcnQgZnVuY3Rpb24gY29udmVydERpc3RhbmNlKFxuICB2YWx1ZTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbCxcbiAgZnJvbVVuaXQ6IFwieWFyZHNcIiB8IFwibWV0ZXJzXCIsXG4gIHRvVW5pdDogXCJ5YXJkc1wiIHwgXCJtZXRlcnNcIlxuKTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbCB7XG4gIGlmICh2YWx1ZSA9PT0gbnVsbCB8fCB2YWx1ZSA9PT0gXCJcIikgcmV0dXJuIHZhbHVlO1xuXG4gIGNvbnN0IG51bVZhbHVlID0gdHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiID8gcGFyc2VGbG9hdCh2YWx1ZSkgOiB2YWx1ZTtcbiAgaWYgKGlzTmFOKG51bVZhbHVlKSkgcmV0dXJuIHZhbHVlO1xuXG4gIGlmIChmcm9tVW5pdCA9PT0gdG9Vbml0KSByZXR1cm4gbnVtVmFsdWU7XG5cbiAgLy8gQ29udmVydCB0byBtZXRlcnMgZmlyc3QsIHRoZW4gdG8gdGFyZ2V0IHVuaXRcbiAgY29uc3QgaW5NZXRlcnMgPSBmcm9tVW5pdCA9PT0gXCJ5YXJkc1wiID8gbnVtVmFsdWUgKiAwLjkxNDQgOiBudW1WYWx1ZTtcbiAgcmV0dXJuIHRvVW5pdCA9PT0gXCJ5YXJkc1wiID8gaW5NZXRlcnMgLyAwLjkxNDQgOiBpbk1ldGVycztcbn1cblxuLyoqXG4gKiBDb252ZXJ0IGFuIGFuZ2xlIHZhbHVlIGJldHdlZW4gdW5pdHMuXG4gKiBcbiAqIEBwYXJhbSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byBjb252ZXJ0XG4gKiBAcGFyYW0gZnJvbVVuaXQgLSBTb3VyY2UgdW5pdCAoXCJkZWdyZWVzXCIgb3IgXCJyYWRpYW5zXCIpXG4gKiBAcGFyYW0gdG9Vbml0IC0gVGFyZ2V0IHVuaXQgKFwiZGVncmVlc1wiIG9yIFwicmFkaWFuc1wiKVxuICogQHJldHVybnMgQ29udmVydGVkIHZhbHVlLCBvciBvcmlnaW5hbCBpZiB1bml0cyBtYXRjaFxuICovXG5leHBvcnQgZnVuY3Rpb24gY29udmVydEFuZ2xlKFxuICB2YWx1ZTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbCxcbiAgZnJvbVVuaXQ6IFwiZGVncmVlc1wiIHwgXCJyYWRpYW5zXCIsXG4gIHRvVW5pdDogXCJkZWdyZWVzXCIgfCBcInJhZGlhbnNcIlxuKTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbCB7XG4gIGlmICh2YWx1ZSA9PT0gbnVsbCB8fCB2YWx1ZSA9PT0gXCJcIikgcmV0dXJuIHZhbHVlO1xuXG4gIGNvbnN0IG51bVZhbHVlID0gdHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiID8gcGFyc2VGbG9hdCh2YWx1ZSkgOiB2YWx1ZTtcbiAgaWYgKGlzTmFOKG51bVZhbHVlKSkgcmV0dXJuIHZhbHVlO1xuXG4gIGlmIChmcm9tVW5pdCA9PT0gdG9Vbml0KSByZXR1cm4gbnVtVmFsdWU7XG5cbiAgLy8gQ29udmVydCB0byBkZWdyZWVzIGZpcnN0LCB0aGVuIHRvIHRhcmdldCB1bml0XG4gIGNvbnN0IGluRGVncmVlcyA9IGZyb21Vbml0ID09PSBcImRlZ3JlZXNcIiA/IG51bVZhbHVlIDogKG51bVZhbHVlICogMTgwIC8gTWF0aC5QSSk7XG4gIHJldHVybiB0b1VuaXQgPT09IFwiZGVncmVlc1wiID8gaW5EZWdyZWVzIDogKGluRGVncmVlcyAqIE1hdGguUEkgLyAxODApO1xufVxuXG4vKipcbiAqIENvbnZlcnQgYSBzcGVlZCB2YWx1ZSBiZXR3ZWVuIHVuaXRzLlxuICogXG4gKiBAcGFyYW0gdmFsdWUgLSBUaGUgdmFsdWUgdG8gY29udmVydFxuICogQHBhcmFtIGZyb21Vbml0IC0gU291cmNlIHVuaXQgKFwibXBoXCIgb3IgXCJrbS9oXCIpXG4gKiBAcGFyYW0gdG9Vbml0IC0gVGFyZ2V0IHVuaXQgKFwibXBoXCIgb3IgXCJrbS9oXCIpXG4gKiBAcmV0dXJucyBDb252ZXJ0ZWQgdmFsdWUsIG9yIG9yaWdpbmFsIGlmIHVuaXRzIG1hdGNoXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb252ZXJ0U3BlZWQoXG4gIHZhbHVlOiBudW1iZXIgfCBzdHJpbmcgfCBudWxsLFxuICBmcm9tVW5pdDogXCJtcGhcIiB8IFwia20vaFwiLFxuICB0b1VuaXQ6IFwibXBoXCIgfCBcImttL2hcIlxuKTogbnVtYmVyIHwgc3RyaW5nIHwgbnVsbCB7XG4gIGlmICh2YWx1ZSA9PT0gbnVsbCB8fCB2YWx1ZSA9PT0gXCJcIikgcmV0dXJuIHZhbHVlO1xuXG4gIGNvbnN0IG51bVZhbHVlID0gdHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiID8gcGFyc2VGbG9hdCh2YWx1ZSkgOiB2YWx1ZTtcbiAgaWYgKGlzTmFOKG51bVZhbHVlKSkgcmV0dXJuIHZhbHVlO1xuXG4gIGlmIChmcm9tVW5pdCA9PT0gdG9Vbml0KSByZXR1cm4gbnVtVmFsdWU7XG5cbiAgLy8gQ29udmVydCB0byBtcGggZmlyc3QsIHRoZW4gdG8gdGFyZ2V0IHVuaXRcbiAgY29uc3QgaW5NcGggPSBmcm9tVW5pdCA9PT0gXCJtcGhcIiA/IG51bVZhbHVlIDogbnVtVmFsdWUgLyAxLjYwOTM0NDtcbiAgcmV0dXJuIHRvVW5pdCA9PT0gXCJtcGhcIiA/IGluTXBoIDogaW5NcGggKiAxLjYwOTM0NDtcbn1cblxuLyoqXG4gKiBOb3JtYWxpemUgYSBtZXRyaWMgdmFsdWUgYmFzZWQgb24gdW5pdCBzeXN0ZW0gYWxpZ25tZW50LlxuICogXG4gKiBDb252ZXJ0cyB2YWx1ZXMgZnJvbSB0aGUgcmVwb3J0J3MgbmF0aXZlIHVuaXRzIHRvIHN0YW5kYXJkIG91dHB1dCB1bml0czpcbiAqIC0gRGlzdGFuY2U6IGFsd2F5cyB5YXJkcyAoSW1wZXJpYWwpXG4gKiAtIEFuZ2xlczogYWx3YXlzIGRlZ3JlZXNcbiAqIC0gU3BlZWQ6IGFsd2F5cyBtcGhcbiAqIFxuICogQHBhcmFtIHZhbHVlIC0gVGhlIHJhdyBtZXRyaWMgdmFsdWVcbiAqIEBwYXJhbSBtZXRyaWNOYW1lIC0gVGhlIG5hbWUgb2YgdGhlIG1ldHJpYyBiZWluZyBub3JtYWxpemVkXG4gKiBAcGFyYW0gcmVwb3J0VW5pdFN5c3RlbSAtIFRoZSB1bml0IHN5c3RlbSB1c2VkIGluIHRoZSBzb3VyY2UgcmVwb3J0XG4gKiBAcmV0dXJucyBOb3JtYWxpemVkIHZhbHVlIGFzIG51bWJlciBvciBzdHJpbmcgKG51bGwgaWYgaW52YWxpZClcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG5vcm1hbGl6ZU1ldHJpY1ZhbHVlKFxuICB2YWx1ZTogTWV0cmljVmFsdWUsXG4gIG1ldHJpY05hbWU6IHN0cmluZyxcbiAgcmVwb3J0VW5pdFN5c3RlbTogVW5pdFN5c3RlbVxuKTogTWV0cmljVmFsdWUge1xuICBjb25zdCBudW1WYWx1ZSA9IHBhcnNlTnVtZXJpY1ZhbHVlKHZhbHVlKTtcbiAgaWYgKG51bVZhbHVlID09PSBudWxsKSByZXR1cm4gdmFsdWU7XG5cbiAgbGV0IGNvbnZlcnRlZDogbnVtYmVyO1xuXG4gIGlmIChESVNUQU5DRV9NRVRSSUNTLmhhcyhtZXRyaWNOYW1lKSkge1xuICAgIGNvbnZlcnRlZCA9IGNvbnZlcnREaXN0YW5jZShcbiAgICAgIG51bVZhbHVlLFxuICAgICAgcmVwb3J0VW5pdFN5c3RlbS5kaXN0YW5jZVVuaXQsXG4gICAgICBcInlhcmRzXCJcbiAgICApIGFzIG51bWJlcjtcbiAgfSBlbHNlIGlmIChBTkdMRV9NRVRSSUNTLmhhcyhtZXRyaWNOYW1lKSkge1xuICAgIGNvbnZlcnRlZCA9IGNvbnZlcnRBbmdsZShcbiAgICAgIG51bVZhbHVlLFxuICAgICAgcmVwb3J0VW5pdFN5c3RlbS5hbmdsZVVuaXQsXG4gICAgICBcImRlZ3JlZXNcIlxuICAgICkgYXMgbnVtYmVyO1xuICB9IGVsc2UgaWYgKFNQRUVEX01FVFJJQ1MuaGFzKG1ldHJpY05hbWUpKSB7XG4gICAgY29udmVydGVkID0gY29udmVydFNwZWVkKFxuICAgICAgbnVtVmFsdWUsXG4gICAgICByZXBvcnRVbml0U3lzdGVtLnNwZWVkVW5pdCxcbiAgICAgIFwibXBoXCJcbiAgICApIGFzIG51bWJlcjtcbiAgfSBlbHNlIHtcbiAgICAvLyBObyBjb252ZXJzaW9uIG5lZWRlZCBmb3IgdGhpcyBtZXRyaWMgdHlwZVxuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuXG4gIC8vIFJvdW5kIHRvIDEgZGVjaW1hbCBwbGFjZSBmb3IgY29uc2lzdGVuY3lcbiAgcmV0dXJuIE1hdGgucm91bmQoY29udmVydGVkICogMTApIC8gMTA7XG59XG5cbi8qKlxuICogUGFyc2UgYSBudW1lcmljIHZhbHVlIGZyb20gTWV0cmljVmFsdWUgdHlwZS5cbiAqL1xuZnVuY3Rpb24gcGFyc2VOdW1lcmljVmFsdWUodmFsdWU6IE1ldHJpY1ZhbHVlKTogbnVtYmVyIHwgbnVsbCB7XG4gIGlmICh2YWx1ZSA9PT0gbnVsbCB8fCB2YWx1ZSA9PT0gXCJcIikgcmV0dXJuIG51bGw7XG4gIGlmICh0eXBlb2YgdmFsdWUgPT09IFwibnVtYmVyXCIpIHJldHVybiBpc05hTih2YWx1ZSkgPyBudWxsIDogdmFsdWU7XG4gIFxuICBjb25zdCBwYXJzZWQgPSBwYXJzZUZsb2F0KHZhbHVlKTtcbiAgcmV0dXJuIGlzTmFOKHBhcnNlZCkgPyBudWxsIDogcGFyc2VkO1xufVxuXG5leHBvcnQgdHlwZSBNZXRyaWNWYWx1ZSA9IHN0cmluZyB8IG51bWJlciB8IG51bGw7XG4iLCAiLyoqXG4gKiBDU1Ygd3JpdGVyIGZvciBUcmFja21hbiBzZXNzaW9uIGRhdGEuXG4gKiBJbXBsZW1lbnRzIGNvcmUgY29sdW1uczogRGF0ZSwgQ2x1YiwgU2hvdCAjLCBUeXBlXG4gKi9cblxuaW1wb3J0IHR5cGUgeyBTZXNzaW9uRGF0YSwgQ2x1Ykdyb3VwLCBTaG90IH0gZnJvbSBcIi4uL21vZGVscy90eXBlc1wiO1xuaW1wb3J0IHtcbiAgZ2V0VW5pdFN5c3RlbSxcbiAgbm9ybWFsaXplTWV0cmljVmFsdWUsXG59IGZyb20gXCIuL3VuaXRfbm9ybWFsaXphdGlvblwiO1xuaW1wb3J0IHsgTUVUUklDX0RJU1BMQVlfTkFNRVMgfSBmcm9tIFwiLi9jb25zdGFudHNcIjtcblxuY29uc3QgTUVUUklDX0NPTFVNTl9PUkRFUjogc3RyaW5nW10gPSBbXG4gIC8vIFNwZWVkICYgRWZmaWNpZW5jeVxuICBcIkNsdWJTcGVlZFwiLCBcIkJhbGxTcGVlZFwiLCBcIlNtYXNoRmFjdG9yXCIsXG4gIC8vIENsdWIgRGVsaXZlcnlcbiAgXCJBdHRhY2tBbmdsZVwiLCBcIkNsdWJQYXRoXCIsIFwiRmFjZUFuZ2xlXCIsIFwiRmFjZVRvUGF0aFwiLCBcIlN3aW5nRGlyZWN0aW9uXCIsIFwiRHluYW1pY0xvZnRcIixcbiAgLy8gTGF1bmNoICYgU3BpblxuICBcIkxhdW5jaEFuZ2xlXCIsIFwiTGF1bmNoRGlyZWN0aW9uXCIsIFwiU3BpblJhdGVcIiwgXCJTcGluQXhpc1wiLCBcIlNwaW5Mb2Z0XCIsXG4gIC8vIERpc3RhbmNlXG4gIFwiQ2FycnlcIiwgXCJUb3RhbFwiLFxuICAvLyBEaXNwZXJzaW9uXG4gIFwiU2lkZVwiLCBcIlNpZGVUb3RhbFwiLCBcIkNhcnJ5U2lkZVwiLCBcIlRvdGFsU2lkZVwiLCBcIkN1cnZlXCIsXG4gIC8vIEJhbGwgRmxpZ2h0XG4gIFwiSGVpZ2h0XCIsIFwiTWF4SGVpZ2h0XCIsIFwiTGFuZGluZ0FuZ2xlXCIsIFwiSGFuZ1RpbWVcIixcbiAgLy8gSW1wYWN0XG4gIFwiTG93UG9pbnREaXN0YW5jZVwiLCBcIkltcGFjdEhlaWdodFwiLCBcIkltcGFjdE9mZnNldFwiLFxuICAvLyBPdGhlclxuICBcIlRlbXBvXCIsXG5dO1xuXG5mdW5jdGlvbiBnZXREaXNwbGF5TmFtZShtZXRyaWM6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBNRVRSSUNfRElTUExBWV9OQU1FU1ttZXRyaWNdID8/IG1ldHJpYztcbn1cblxuZnVuY3Rpb24gZ2VuZXJhdGVGaWxlbmFtZShzZXNzaW9uOiBTZXNzaW9uRGF0YSk6IHN0cmluZyB7XG4gIHJldHVybiBgJHtzZXNzaW9uLmRhdGV9X1RyYWNrbWFuRGF0YS5jc3ZgO1xufVxuXG5mdW5jdGlvbiBvcmRlck1ldHJpY3NCeVByaW9yaXR5KFxuICBhbGxNZXRyaWNzOiBzdHJpbmdbXSxcbiAgcHJpb3JpdHlPcmRlcjogc3RyaW5nW11cbik6IHN0cmluZ1tdIHtcbiAgY29uc3QgcmVzdWx0OiBzdHJpbmdbXSA9IFtdO1xuICBjb25zdCBzZWVuID0gbmV3IFNldDxzdHJpbmc+KCk7XG5cbiAgZm9yIChjb25zdCBtZXRyaWMgb2YgcHJpb3JpdHlPcmRlcikge1xuICAgIGlmIChhbGxNZXRyaWNzLmluY2x1ZGVzKG1ldHJpYykgJiYgIXNlZW4uaGFzKG1ldHJpYykpIHtcbiAgICAgIHJlc3VsdC5wdXNoKG1ldHJpYyk7XG4gICAgICBzZWVuLmFkZChtZXRyaWMpO1xuICAgIH1cbiAgfVxuXG4gIGZvciAoY29uc3QgbWV0cmljIG9mIGFsbE1ldHJpY3MpIHtcbiAgICBpZiAoIXNlZW4uaGFzKG1ldHJpYykpIHtcbiAgICAgIHJlc3VsdC5wdXNoKG1ldHJpYyk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gaGFzVGFncyhzZXNzaW9uOiBTZXNzaW9uRGF0YSk6IGJvb2xlYW4ge1xuICByZXR1cm4gc2Vzc2lvbi5jbHViX2dyb3Vwcy5zb21lKChjbHViKSA9PlxuICAgIGNsdWIuc2hvdHMuc29tZSgoc2hvdCkgPT4gc2hvdC50YWcgIT09IHVuZGVmaW5lZCAmJiBzaG90LnRhZyAhPT0gXCJcIilcbiAgKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHdyaXRlQ3N2KFxuICBzZXNzaW9uOiBTZXNzaW9uRGF0YSxcbiAgb3V0cHV0RmlsZW5hbWU/OiBzdHJpbmcsXG4gIGluY2x1ZGVBdmVyYWdlcyA9IHRydWUsXG4gIG1ldHJpY09yZGVyPzogc3RyaW5nW11cbik6IHN0cmluZyB7XG4gIGNvbnN0IGZpbGVuYW1lID0gb3V0cHV0RmlsZW5hbWUgPz8gZ2VuZXJhdGVGaWxlbmFtZShzZXNzaW9uKTtcblxuICBjb25zdCBvcmRlcmVkTWV0cmljcyA9IG9yZGVyTWV0cmljc0J5UHJpb3JpdHkoXG4gICAgc2Vzc2lvbi5tZXRyaWNfbmFtZXMsXG4gICAgbWV0cmljT3JkZXIgPz8gTUVUUklDX0NPTFVNTl9PUkRFUlxuICApO1xuXG4gIGNvbnN0IGhlYWRlclJvdzogc3RyaW5nW10gPSBbXCJEYXRlXCIsIFwiQ2x1YlwiXTtcbiAgXG4gIGlmIChoYXNUYWdzKHNlc3Npb24pKSB7XG4gICAgaGVhZGVyUm93LnB1c2goXCJUYWdcIik7XG4gIH1cbiAgXG4gIGhlYWRlclJvdy5wdXNoKFwiU2hvdCAjXCIsIFwiVHlwZVwiKTtcbiAgXG4gIGZvciAoY29uc3QgbWV0cmljIG9mIG9yZGVyZWRNZXRyaWNzKSB7XG4gICAgaGVhZGVyUm93LnB1c2goZ2V0RGlzcGxheU5hbWUobWV0cmljKSk7XG4gIH1cblxuICBjb25zdCByb3dzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+W10gPSBbXTtcblxuICBmb3IgKGNvbnN0IGNsdWIgb2Ygc2Vzc2lvbi5jbHViX2dyb3Vwcykge1xuICAgIGZvciAoY29uc3Qgc2hvdCBvZiBjbHViLnNob3RzKSB7XG4gICAgICBjb25zdCByb3c6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XG4gICAgICAgIERhdGU6IHNlc3Npb24uZGF0ZSxcbiAgICAgICAgQ2x1YjogY2x1Yi5jbHViX25hbWUsXG4gICAgICAgIFwiU2hvdCAjXCI6IFN0cmluZyhzaG90LnNob3RfbnVtYmVyICsgMSksXG4gICAgICAgIFR5cGU6IFwiU2hvdFwiLFxuICAgICAgfTtcblxuICAgICAgaWYgKGhhc1RhZ3Moc2Vzc2lvbikpIHtcbiAgICAgICAgcm93LlRhZyA9IHNob3QudGFnID8/IFwiXCI7XG4gICAgICB9XG5cbiAgICAgIC8vIEdldCB1bml0IHN5c3RlbSBmb3Igbm9ybWFsaXphdGlvblxuICAgICAgY29uc3QgdW5pdFN5c3RlbSA9IGdldFVuaXRTeXN0ZW0oc2Vzc2lvbi5tZXRhZGF0YV9wYXJhbXMpO1xuXG4gICAgICBmb3IgKGNvbnN0IG1ldHJpYyBvZiBvcmRlcmVkTWV0cmljcykge1xuICAgICAgICBjb25zdCBkaXNwbGF5TmFtZSA9IGdldERpc3BsYXlOYW1lKG1ldHJpYyk7XG4gICAgICAgIGxldCByYXdWYWx1ZSA9IHNob3QubWV0cmljc1ttZXRyaWNdID8/IFwiXCI7XG4gICAgICAgIFxuICAgICAgICAvLyBOb3JtYWxpemUgdmFsdWUgYmFzZWQgb24gcmVwb3J0IHVuaXRzL25vcm1hbGl6YXRpb24gcGFyYW1zXG4gICAgICAgIGlmICh0eXBlb2YgcmF3VmFsdWUgPT09IFwic3RyaW5nXCIgfHwgdHlwZW9mIHJhd1ZhbHVlID09PSBcIm51bWJlclwiKSB7XG4gICAgICAgICAgcm93W2Rpc3BsYXlOYW1lXSA9IFN0cmluZyhub3JtYWxpemVNZXRyaWNWYWx1ZShyYXdWYWx1ZSwgbWV0cmljLCB1bml0U3lzdGVtKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcm93W2Rpc3BsYXlOYW1lXSA9IFwiXCI7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcm93cy5wdXNoKHJvdyk7XG4gICAgfVxuXG4gICAgaWYgKGluY2x1ZGVBdmVyYWdlcyAmJiBPYmplY3Qua2V5cyhjbHViLmF2ZXJhZ2VzKS5sZW5ndGggPiAwKSB7XG4gICAgICBjb25zdCBhdmdSb3c6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XG4gICAgICAgIERhdGU6IHNlc3Npb24uZGF0ZSxcbiAgICAgICAgQ2x1YjogY2x1Yi5jbHViX25hbWUsXG4gICAgICAgIFwiU2hvdCAjXCI6IFwiXCIsXG4gICAgICAgIFR5cGU6IFwiQXZlcmFnZVwiLFxuICAgICAgfTtcblxuICAgICAgaWYgKGhhc1RhZ3Moc2Vzc2lvbikpIHtcbiAgICAgICAgYXZnUm93LlRhZyA9IFwiXCI7XG4gICAgICB9XG5cbiAgICAgIC8vIE5vcm1hbGl6ZSBhdmVyYWdlIHZhbHVlcyBiYXNlZCBvbiByZXBvcnQgdW5pdHMvbm9ybWFsaXphdGlvbiBwYXJhbXNcbiAgICAgIGZvciAoY29uc3QgbWV0cmljIG9mIG9yZGVyZWRNZXRyaWNzKSB7XG4gICAgICAgIGNvbnN0IGRpc3BsYXlOYW1lID0gZ2V0RGlzcGxheU5hbWUobWV0cmljKTtcbiAgICAgICAgbGV0IHJhd1ZhbHVlID0gY2x1Yi5hdmVyYWdlc1ttZXRyaWNdID8/IFwiXCI7XG4gICAgICAgIFxuICAgICAgICBpZiAodHlwZW9mIHJhd1ZhbHVlID09PSBcInN0cmluZ1wiIHx8IHR5cGVvZiByYXdWYWx1ZSA9PT0gXCJudW1iZXJcIikge1xuICAgICAgICAgIGF2Z1Jvd1tkaXNwbGF5TmFtZV0gPSBTdHJpbmcobm9ybWFsaXplTWV0cmljVmFsdWUocmF3VmFsdWUsIG1ldHJpYywgdW5pdFN5c3RlbSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGF2Z1Jvd1tkaXNwbGF5TmFtZV0gPSBcIlwiO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJvd3MucHVzaChhdmdSb3cpO1xuICAgIH1cblxuICAgIGlmIChpbmNsdWRlQXZlcmFnZXMgJiYgT2JqZWN0LmtleXMoY2x1Yi5jb25zaXN0ZW5jeSkubGVuZ3RoID4gMCkge1xuICAgICAgY29uc3QgY29uc1JvdzogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcbiAgICAgICAgRGF0ZTogc2Vzc2lvbi5kYXRlLFxuICAgICAgICBDbHViOiBjbHViLmNsdWJfbmFtZSxcbiAgICAgICAgXCJTaG90ICNcIjogXCJcIixcbiAgICAgICAgVHlwZTogXCJDb25zaXN0ZW5jeVwiLFxuICAgICAgfTtcblxuICAgICAgaWYgKGhhc1RhZ3Moc2Vzc2lvbikpIHtcbiAgICAgICAgY29uc1Jvdy5UYWcgPSBcIlwiO1xuICAgICAgfVxuXG4gICAgICAvLyBOb3JtYWxpemUgY29uc2lzdGVuY3kgdmFsdWVzIGJhc2VkIG9uIHJlcG9ydCB1bml0cy9ub3JtYWxpemF0aW9uIHBhcmFtc1xuICAgICAgZm9yIChjb25zdCBtZXRyaWMgb2Ygb3JkZXJlZE1ldHJpY3MpIHtcbiAgICAgICAgY29uc3QgZGlzcGxheU5hbWUgPSBnZXREaXNwbGF5TmFtZShtZXRyaWMpO1xuICAgICAgICBsZXQgcmF3VmFsdWUgPSBjbHViLmNvbnNpc3RlbmN5W21ldHJpY10gPz8gXCJcIjtcbiAgICAgICAgXG4gICAgICAgIGlmICh0eXBlb2YgcmF3VmFsdWUgPT09IFwic3RyaW5nXCIgfHwgdHlwZW9mIHJhd1ZhbHVlID09PSBcIm51bWJlclwiKSB7XG4gICAgICAgICAgY29uc1Jvd1tkaXNwbGF5TmFtZV0gPSBTdHJpbmcobm9ybWFsaXplTWV0cmljVmFsdWUocmF3VmFsdWUsIG1ldHJpYywgdW5pdFN5c3RlbSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnNSb3dbZGlzcGxheU5hbWVdID0gXCJcIjtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByb3dzLnB1c2goY29uc1Jvdyk7XG4gICAgfVxuICB9XG5cbiAgY29uc3QgY3N2Q29udGVudCA9IFtcbiAgICBoZWFkZXJSb3cuam9pbihcIixcIiksXG4gICAgLi4ucm93cy5tYXAoKHJvdykgPT4ge1xuICAgICAgcmV0dXJuIGhlYWRlclJvd1xuICAgICAgICAubWFwKChjb2wpID0+IHtcbiAgICAgICAgICBjb25zdCB2YWx1ZSA9IHJvd1tjb2xdID8/IFwiXCI7XG4gICAgICAgICAgaWYgKHZhbHVlLmluY2x1ZGVzKFwiLFwiKSB8fCB2YWx1ZS5pbmNsdWRlcygnXCInKSB8fCB2YWx1ZS5pbmNsdWRlcyhcIlxcblwiKSkge1xuICAgICAgICAgICAgcmV0dXJuIGBcIiR7dmFsdWUucmVwbGFjZSgvXCIvZywgJ1wiXCInKX1cImA7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgfSlcbiAgICAgICAgLmpvaW4oXCIsXCIpO1xuICAgIH0pLFxuICBdLmpvaW4oXCJcXG5cIik7XG5cbiAgcmV0dXJuIGNzdkNvbnRlbnQ7XG59XG4iLCAiLyoqXG4gKiBTZXJ2aWNlIFdvcmtlciBmb3IgVHJhY2ttYW4gU2NyYXBlciBDaHJvbWUgRXh0ZW5zaW9uXG4gKi9cblxuaW1wb3J0IHsgU1RPUkFHRV9LRVlTIH0gZnJvbSBcIi4uL3NoYXJlZC9jb25zdGFudHNcIjtcbmltcG9ydCB7IHdyaXRlQ3N2IH0gZnJvbSBcIi4uL3NoYXJlZC9jc3Zfd3JpdGVyXCI7XG5pbXBvcnQgdHlwZSB7IFNlc3Npb25EYXRhIH0gZnJvbSBcIi4uL21vZGVscy90eXBlc1wiO1xuXG5jaHJvbWUucnVudGltZS5vbkluc3RhbGxlZC5hZGRMaXN0ZW5lcigoKSA9PiB7XG4gIGNvbnNvbGUubG9nKFwiVHJhY2ttYW4gU2NyYXBlciBleHRlbnNpb24gaW5zdGFsbGVkXCIpO1xufSk7XG5cbmludGVyZmFjZSBTYXZlRGF0YVJlcXVlc3Qge1xuICB0eXBlOiBcIlNBVkVfREFUQVwiO1xuICBkYXRhOiBTZXNzaW9uRGF0YTtcbn1cblxuaW50ZXJmYWNlIEV4cG9ydENzdlJlcXVlc3Qge1xuICB0eXBlOiBcIkVYUE9SVF9DU1ZfUkVRVUVTVFwiO1xufVxuXG5pbnRlcmZhY2UgR2V0RGF0YVJlcXVlc3Qge1xuICB0eXBlOiBcIkdFVF9EQVRBXCI7XG59XG5cbmZ1bmN0aW9uIGdldERvd25sb2FkRXJyb3JNZXNzYWdlKG9yaWdpbmFsRXJyb3I6IHN0cmluZyk6IHN0cmluZyB7XG4gIGlmIChvcmlnaW5hbEVycm9yLmluY2x1ZGVzKFwiaW52YWxpZFwiKSkge1xuICAgIHJldHVybiBcIkludmFsaWQgZG93bmxvYWQgZm9ybWF0XCI7XG4gIH1cbiAgaWYgKG9yaWdpbmFsRXJyb3IuaW5jbHVkZXMoXCJxdW90YVwiKSB8fCBvcmlnaW5hbEVycm9yLmluY2x1ZGVzKFwic3BhY2VcIikpIHtcbiAgICByZXR1cm4gXCJJbnN1ZmZpY2llbnQgc3RvcmFnZSBzcGFjZVwiO1xuICB9XG4gIGlmIChvcmlnaW5hbEVycm9yLmluY2x1ZGVzKFwiYmxvY2tlZFwiKSB8fCBvcmlnaW5hbEVycm9yLmluY2x1ZGVzKFwicG9saWN5XCIpKSB7XG4gICAgcmV0dXJuIFwiRG93bmxvYWQgYmxvY2tlZCBieSBicm93c2VyIHNldHRpbmdzXCI7XG4gIH1cbiAgcmV0dXJuIG9yaWdpbmFsRXJyb3I7XG59XG5cbi8vIFVuaXQgY29udmVyc2lvbiBjb25zdGFudHMgKG1ldHJpYyBcdTIxOTIgaW1wZXJpYWwpXG5jb25zdCBNU19UT19NUEggPSAyLjIzNjk0O1xuY29uc3QgTUVURVJTX1RPX1lBUkRTID0gMS4wOTM2MTtcblxuY29uc3QgU1BFRURfTUVUUklDUyA9IG5ldyBTZXQoW1wiQ2x1YlNwZWVkXCIsIFwiQmFsbFNwZWVkXCJdKTtcbmNvbnN0IERJU1RBTkNFX01FVFJJQ1MgPSBuZXcgU2V0KFtcbiAgXCJDYXJyeVwiLCBcIlRvdGFsXCIsIFwiU2lkZVwiLCBcIlNpZGVUb3RhbFwiLCBcIkNhcnJ5U2lkZVwiLCBcIlRvdGFsU2lkZVwiLFxuICBcIkhlaWdodFwiLCBcIk1heEhlaWdodFwiLCBcIkN1cnZlXCIsIFwiTG93UG9pbnREaXN0YW5jZVwiLFxuXSk7XG5cbmZ1bmN0aW9uIGNvbnZlcnRNZXRyaWMoa2V5OiBzdHJpbmcsIHZhbHVlOiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCBudW0gPSBwYXJzZUZsb2F0KHZhbHVlKTtcbiAgaWYgKGlzTmFOKG51bSkpIHJldHVybiB2YWx1ZTtcbiAgaWYgKFNQRUVEX01FVFJJQ1MuaGFzKGtleSkpIHJldHVybiBgJHtNYXRoLnJvdW5kKG51bSAqIE1TX1RPX01QSCAqIDEwKSAvIDEwfWA7XG4gIGlmIChESVNUQU5DRV9NRVRSSUNTLmhhcyhrZXkpKSByZXR1cm4gYCR7TWF0aC5yb3VuZChudW0gKiBNRVRFUlNfVE9fWUFSRFMgKiAxMCkgLyAxMH1gO1xuICByZXR1cm4gdmFsdWU7XG59XG5cbmZ1bmN0aW9uIHRvSW1wZXJpYWxTZXNzaW9uKHNlc3Npb246IFNlc3Npb25EYXRhKTogU2Vzc2lvbkRhdGEge1xuICBjb25zdCBjb252ZXJ0ZWQ6IFNlc3Npb25EYXRhID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShzZXNzaW9uKSk7XG4gIGZvciAoY29uc3QgZ3JvdXAgb2YgY29udmVydGVkLmNsdWJfZ3JvdXBzKSB7XG4gICAgZm9yIChjb25zdCBzaG90IG9mIGdyb3VwLnNob3RzKSB7XG4gICAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhzaG90Lm1ldHJpY3MpKSB7XG4gICAgICAgIHNob3QubWV0cmljc1trZXldID0gY29udmVydE1ldHJpYyhrZXksIHNob3QubWV0cmljc1trZXldKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMoZ3JvdXAuYXZlcmFnZXMpKSB7XG4gICAgICBncm91cC5hdmVyYWdlc1trZXldID0gY29udmVydE1ldHJpYyhrZXksIGdyb3VwLmF2ZXJhZ2VzW2tleV0pO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhncm91cC5jb25zaXN0ZW5jeSkpIHtcbiAgICAgIGdyb3VwLmNvbnNpc3RlbmN5W2tleV0gPSBjb252ZXJ0TWV0cmljKGtleSwgZ3JvdXAuY29uc2lzdGVuY3lba2V5XSk7XG4gICAgfVxuICB9XG4gIHJldHVybiBjb252ZXJ0ZWQ7XG59XG5cbnR5cGUgUmVxdWVzdE1lc3NhZ2UgPSBTYXZlRGF0YVJlcXVlc3QgfCBFeHBvcnRDc3ZSZXF1ZXN0IHwgR2V0RGF0YVJlcXVlc3Q7XG5cbmNocm9tZS5ydW50aW1lLm9uTWVzc2FnZS5hZGRMaXN0ZW5lcigobWVzc2FnZTogUmVxdWVzdE1lc3NhZ2UsIHNlbmRlciwgc2VuZFJlc3BvbnNlKSA9PiB7XG4gIGlmIChtZXNzYWdlLnR5cGUgPT09IFwiR0VUX0RBVEFcIikge1xuICAgIGNocm9tZS5zdG9yYWdlLmxvY2FsLmdldChbU1RPUkFHRV9LRVlTLlRSQUNLTUFOX0RBVEFdLCAocmVzdWx0KSA9PiB7XG4gICAgICBzZW5kUmVzcG9uc2UocmVzdWx0W1NUT1JBR0VfS0VZUy5UUkFDS01BTl9EQVRBXSB8fCBudWxsKTtcbiAgICB9KTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGlmIChtZXNzYWdlLnR5cGUgPT09IFwiU0FWRV9EQVRBXCIpIHtcbiAgICBjb25zdCBzZXNzaW9uRGF0YSA9IChtZXNzYWdlIGFzIFNhdmVEYXRhUmVxdWVzdCkuZGF0YTtcbiAgICBjaHJvbWUuc3RvcmFnZS5sb2NhbC5zZXQoeyBbU1RPUkFHRV9LRVlTLlRSQUNLTUFOX0RBVEFdOiBzZXNzaW9uRGF0YSB9LCAoKSA9PiB7XG4gICAgICBpZiAoY2hyb21lLnJ1bnRpbWUubGFzdEVycm9yKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXCJUcmFja21hbiBTY3JhcGVyOiBGYWlsZWQgdG8gc2F2ZSBkYXRhOlwiLCBjaHJvbWUucnVudGltZS5sYXN0RXJyb3IpO1xuICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGNocm9tZS5ydW50aW1lLmxhc3RFcnJvci5tZXNzYWdlIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJUcmFja21hbiBTY3JhcGVyOiBTZXNzaW9uIGRhdGEgc2F2ZWQgdG8gc3RvcmFnZVwiKTtcbiAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogdHJ1ZSB9KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGlmIChtZXNzYWdlLnR5cGUgPT09IFwiRVhQT1JUX0NTVl9SRVFVRVNUXCIpIHtcbiAgICBjaHJvbWUuc3RvcmFnZS5sb2NhbC5nZXQoW1NUT1JBR0VfS0VZUy5UUkFDS01BTl9EQVRBLCBTVE9SQUdFX0tFWVMuVU5JVF9QUkVGXSwgKHJlc3VsdCkgPT4ge1xuICAgICAgY29uc3QgZGF0YSA9IHJlc3VsdFtTVE9SQUdFX0tFWVMuVFJBQ0tNQU5fREFUQV0gYXMgU2Vzc2lvbkRhdGEgfCB1bmRlZmluZWQ7XG4gICAgICBpZiAoIWRhdGEgfHwgIWRhdGEuY2x1Yl9ncm91cHMgfHwgZGF0YS5jbHViX2dyb3Vwcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBcIk5vIGRhdGEgdG8gZXhwb3J0XCIgfSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgdW5pdFByZWYgPSAocmVzdWx0W1NUT1JBR0VfS0VZUy5VTklUX1BSRUZdIGFzIHN0cmluZykgfHwgXCJpbXBlcmlhbFwiO1xuICAgICAgICBjb25zdCBleHBvcnREYXRhID0gdW5pdFByZWYgPT09IFwiaW1wZXJpYWxcIiA/IHRvSW1wZXJpYWxTZXNzaW9uKGRhdGEpIDogZGF0YTtcbiAgICAgICAgY29uc3QgY3N2Q29udGVudCA9IHdyaXRlQ3N2KGV4cG9ydERhdGEpO1xuICAgICAgICBjb25zdCBmaWxlbmFtZSA9IGAke2RhdGEuZGF0ZSB8fCBcInVua25vd25cIn1fVHJhY2ttYW5EYXRhLmNzdmA7XG5cbiAgICAgICAgY2hyb21lLmRvd25sb2Fkcy5kb3dubG9hZChcbiAgICAgICAgICB7XG4gICAgICAgICAgICB1cmw6IGBkYXRhOnRleHQvY3N2O2NoYXJzZXQ9dXRmLTgsJHtlbmNvZGVVUklDb21wb25lbnQoY3N2Q29udGVudCl9YCxcbiAgICAgICAgICAgIGZpbGVuYW1lOiBmaWxlbmFtZSxcbiAgICAgICAgICAgIHNhdmVBczogZmFsc2UsXG4gICAgICAgICAgfSxcbiAgICAgICAgICAoZG93bmxvYWRJZCkgPT4ge1xuICAgICAgICAgICAgaWYgKGNocm9tZS5ydW50aW1lLmxhc3RFcnJvcikge1xuICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiVHJhY2ttYW4gU2NyYXBlcjogRG93bmxvYWQgZmFpbGVkOlwiLCBjaHJvbWUucnVudGltZS5sYXN0RXJyb3IpO1xuICAgICAgICAgICAgICBjb25zdCBlcnJvck1lc3NhZ2UgPSBnZXREb3dubG9hZEVycm9yTWVzc2FnZShjaHJvbWUucnVudGltZS5sYXN0RXJyb3IubWVzc2FnZSk7XG4gICAgICAgICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3JNZXNzYWdlIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coYFRyYWNrbWFuIFNjcmFwZXI6IENTViBleHBvcnRlZCB3aXRoIGRvd25sb2FkIElEICR7ZG93bmxvYWRJZH1gKTtcbiAgICAgICAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogdHJ1ZSwgZG93bmxvYWRJZCwgZmlsZW5hbWUgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICApO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIlRyYWNrbWFuIFNjcmFwZXI6IENTViBnZW5lcmF0aW9uIGZhaWxlZDpcIiwgZXJyb3IpO1xuICAgICAgICBzZW5kUmVzcG9uc2UoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKSB9KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxufSk7XG5cbmNocm9tZS5zdG9yYWdlLm9uQ2hhbmdlZC5hZGRMaXN0ZW5lcigoY2hhbmdlcywgbmFtZXNwYWNlKSA9PiB7XG4gIGlmIChuYW1lc3BhY2UgPT09IFwibG9jYWxcIiAmJiBjaGFuZ2VzW1NUT1JBR0VfS0VZUy5UUkFDS01BTl9EQVRBXSkge1xuICAgIGNvbnN0IG5ld1ZhbHVlID0gY2hhbmdlc1tTVE9SQUdFX0tFWVMuVFJBQ0tNQU5fREFUQV0ubmV3VmFsdWU7XG4gICAgY2hyb21lLnJ1bnRpbWUuc2VuZE1lc3NhZ2UoeyB0eXBlOiBcIkRBVEFfVVBEQVRFRFwiLCBkYXRhOiBuZXdWYWx1ZSB9KS5jYXRjaCgoKSA9PiB7XG4gICAgICAvLyBJZ25vcmUgZXJyb3JzIHdoZW4gbm8gcG9wdXAgaXMgbGlzdGVuaW5nXG4gICAgfSk7XG4gIH1cbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjs7QUE0RU8sTUFBTSx1QkFBK0M7QUFBQSxJQUMxRCxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxhQUFhO0FBQUEsSUFDYixhQUFhO0FBQUEsSUFDYixVQUFVO0FBQUEsSUFDVixXQUFXO0FBQUEsSUFDWCxZQUFZO0FBQUEsSUFDWixnQkFBZ0I7QUFBQSxJQUNoQixhQUFhO0FBQUEsSUFDYixVQUFVO0FBQUEsSUFDVixVQUFVO0FBQUEsSUFDVixVQUFVO0FBQUEsSUFDVixhQUFhO0FBQUEsSUFDYixpQkFBaUI7QUFBQSxJQUNqQixPQUFPO0FBQUEsSUFDUCxPQUFPO0FBQUEsSUFDUCxNQUFNO0FBQUEsSUFDTixXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxXQUFXO0FBQUEsSUFDWCxRQUFRO0FBQUEsSUFDUixXQUFXO0FBQUEsSUFDWCxPQUFPO0FBQUEsSUFDUCxjQUFjO0FBQUEsSUFDZCxVQUFVO0FBQUEsSUFDVixrQkFBa0I7QUFBQSxJQUNsQixjQUFjO0FBQUEsSUFDZCxjQUFjO0FBQUEsSUFDZCxPQUFPO0FBQUEsRUFDVDtBQWdDTyxNQUFNLGVBQWU7QUFBQSxJQUMxQixlQUFlO0FBQUEsSUFDZixX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QXdCLE9BQU8sUUFBUSxVQUFVLE9BQU87QUFDN0UsNkJBQWEsRUFBRSxTQUFTLE9BQU8sT0FBTyxhQUFhLENBQUM7QUFBQSxjQUN0RCxPQUFPO0FBQ0wsd0JBQVEsSUFBSSxtREFBbUQsVUFBVSxFQUFFO0FBQzNFLDZCQUFhLEVBQUUsU0FBUyxNQUFNLFlBQVksU0FBUyxDQUFDO0FBQUEsY0FDdEQ7QUFBQSxZQUNGO0FBQUEsVUFDRjtBQUFBLFFBQ0YsU0FBUyxPQUFPO0FBQ2Qsa0JBQVEsTUFBTSw0Q0FBNEMsS0FBSztBQUMvRCx1QkFBYSxFQUFFLFNBQVMsT0FBTyxPQUFPLGlCQUFpQixRQUFRLE1BQU0sVUFBVSxPQUFPLEtBQUssRUFBRSxDQUFDO0FBQUEsUUFDaEc7QUFBQSxNQUNGLENBQUM7QUFDRCxhQUFPO0FBQUEsSUFDVDtBQUFBLEVBQ0YsQ0FBQztBQUVELFNBQU8sUUFBUSxVQUFVLFlBQVksQ0FBQyxTQUFTLGNBQWM7QUFDM0QsUUFBSSxjQUFjLFdBQVcsUUFBUSxhQUFhLGFBQWEsR0FBRztBQUNoRSxZQUFNLFdBQVcsUUFBUSxhQUFhLGFBQWEsRUFBRTtBQUNyRCxhQUFPLFFBQVEsWUFBWSxFQUFFLE1BQU0sZ0JBQWdCLE1BQU0sU0FBUyxDQUFDLEVBQUUsTUFBTSxNQUFNO0FBQUEsTUFFakYsQ0FBQztBQUFBLElBQ0g7QUFBQSxFQUNGLENBQUM7IiwKICAibmFtZXMiOiBbInVuaXRTeXN0ZW0iLCAiU1BFRURfTUVUUklDUyIsICJESVNUQU5DRV9NRVRSSUNTIl0KfQo=
