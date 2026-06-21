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
  var CUSTOM_PROMPT_KEY_PREFIX = "customPrompt_";
  var CUSTOM_PROMPT_IDS_KEY = "customPromptIds";
  var STORAGE_KEYS = {
    TRACKMAN_DATA: "trackmanData",
    SPEED_UNIT: "speedUnit",
    DISTANCE_UNIT: "distanceUnit",
    SELECTED_PROMPT_ID: "selectedPromptId",
    AI_SERVICE: "aiService",
    HITTING_SURFACE: "hittingSurface",
    INCLUDE_AVERAGES: "includeAverages",
    SESSION_HISTORY: "sessionHistory",
    IMPORT_STATUS: "importStatus",
    BULK_IMPORT_STATUS: "bulkImportStatus"
  };

  // src/shared/unit_normalization.ts
  var DEFAULT_UNIT_CHOICE = { speed: "mph", distance: "yards" };
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
    "CarrySide",
    "TotalSide",
    "Height",
    "MaxHeight",
    "Curve"
  ]);
  var SMALL_DISTANCE_METRICS = /* @__PURE__ */ new Set([
    "LowPointDistance"
  ]);
  var MILLIMETER_METRICS = /* @__PURE__ */ new Set([
    "ImpactHeight",
    "ImpactOffset"
  ]);
  var ANGLE_METRICS = /* @__PURE__ */ new Set([
    "AttackAngle",
    "ClubPath",
    "FaceAngle",
    "FaceToPath",
    "DynamicLoft",
    "LaunchAngle",
    "LaunchDirection",
    "LandingAngle"
  ]);
  var SPEED_METRICS = /* @__PURE__ */ new Set([
    "ClubSpeed",
    "BallSpeed"
  ]);
  var DEFAULT_UNIT_SYSTEM = UNIT_SYSTEMS["789012"];
  var SPEED_LABELS = {
    "mph": "mph",
    "m/s": "m/s"
  };
  var DISTANCE_LABELS = {
    "yards": "yds",
    "meters": "m"
  };
  var SMALL_DISTANCE_LABELS = {
    "inches": "in",
    "cm": "cm"
  };
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
  var FIXED_UNIT_LABELS = {
    SpinRate: "rpm",
    HangTime: "s",
    Tempo: "s",
    ImpactHeight: "mm",
    ImpactOffset: "mm"
  };
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

  // src/shared/import_types.ts
  var FETCH_ACTIVITIES_PAGE_SIZE = 100;
  var FETCH_ACTIVITIES_MAX_PAGES = 100;
  var ACTIVITY_SUMMARY_FIELDS = `
  id
  time
  kind
  __typename
  ... on CoursePlayActivity {
    course {
      displayName
    }
  }
  ... on MapMyBagSessionActivity {
    strokeCount
  }
`;
  var ACTIVITY_COURSE_SUMMARY_FIELDS = `
  id
  time
  __typename
  ... on CoursePlayActivity {
    course {
      displayName
    }
  }
`;
  var ACTIVITY_MINIMAL_TIME_FIELDS = `
  id
  time
  __typename
`;
  var ACTIVITY_MINIMAL_DATE_FIELDS = `
  id
  date
  __typename
`;
  var FETCH_ACTIVITIES_QUERY = `
  query GetPlayerActivities($skip: Int!, $take: Int!) {
    me {
      activities(kinds: [COURSE_PLAY, MAP_MY_BAG], skip: $skip, take: $take) {
        totalCount
        pageInfo {
          hasNextPage
        }
        items {
          ${ACTIVITY_SUMMARY_FIELDS}
        }
      }
    }
  }
`;
  var FETCH_ACTIVITIES_QUERY_CANDIDATES = [
    { label: "me.activities.items:kinds-page", query: FETCH_ACTIVITIES_QUERY, paginated: true },
    {
      label: "me.activities.items:all-page",
      paginated: true,
      query: `
      query GetPlayerActivities($skip: Int!, $take: Int!) {
        me {
          activities(skip: $skip, take: $take) {
            totalCount
            pageInfo {
              hasNextPage
            }
            items {
              ${ACTIVITY_SUMMARY_FIELDS}
            }
          }
        }
      }
    `
    },
    {
      label: "me.activities.items:course-time",
      query: `
      query GetPlayerActivities {
        me {
          activities {
            items {
              ${ACTIVITY_COURSE_SUMMARY_FIELDS}
            }
          }
        }
      }
    `
    },
    {
      label: "me.activities.items:date",
      query: `
      query GetPlayerActivities {
        me {
          activities {
            items {
              ${ACTIVITY_MINIMAL_DATE_FIELDS}
            }
          }
        }
      }
    `
    },
    {
      label: "me.activities.nodes:time",
      query: `
      query GetPlayerActivities {
        me {
          activities {
            nodes {
              ${ACTIVITY_MINIMAL_TIME_FIELDS}
            }
          }
        }
      }
    `
    },
    {
      label: "me.activities.nodes:date",
      query: `
      query GetPlayerActivities {
        me {
          activities {
            nodes {
              ${ACTIVITY_MINIMAL_DATE_FIELDS}
            }
          }
        }
      }
    `
    },
    {
      label: "me.activities.connection:time",
      query: `
      query GetPlayerActivities {
        me {
          activities(first: 20) {
            edges {
              node {
                id
                time
                __typename
              }
            }
          }
        }
      }
    `
    },
    {
      label: "me.activities.connection:date",
      query: `
      query GetPlayerActivities {
        me {
          activities(first: 20) {
            edges {
              node {
                id
                date
                __typename
              }
            }
          }
        }
      }
    `
    }
  ];
  var SUPPORTED_ACTIVITY_TYPES = /* @__PURE__ */ new Set([
    "CoursePlayActivity",
    "CourseSessionActivity",
    "COURSE_PLAY",
    "MapMyBagActivity",
    "MapMyBagSessionActivity",
    "BagMappingActivity",
    "MAP_MY_BAG"
  ]);
  function isSupportedPortalActivityType(type) {
    return type !== null && SUPPORTED_ACTIVITY_TYPES.has(type);
  }
  function getActivityType(record) {
    if (typeof record.__typename === "string") return record.__typename;
    if (typeof record.type === "string") return record.type;
    if (typeof record.kind === "string") return record.kind;
    return null;
  }
  function getCourseName(record) {
    const course = record.course;
    if (!course || typeof course !== "object") return null;
    const courseRecord = course;
    if (typeof courseRecord.displayName === "string" && courseRecord.displayName.trim()) {
      return courseRecord.displayName;
    }
    if (typeof courseRecord.name === "string" && courseRecord.name.trim()) {
      return courseRecord.name;
    }
    return null;
  }
  function normalizeActivityRecord(value) {
    if (!value || typeof value !== "object") return null;
    const record = value;
    if (typeof record.id !== "string") return null;
    const rawDate = record.time ?? record.date;
    const rawType = getActivityType(record);
    const rawKind = typeof record.kind === "string" ? record.kind : null;
    const type = isSupportedPortalActivityType(rawType) ? rawType : isSupportedPortalActivityType(rawKind) ? rawKind : null;
    if (!type) return null;
    return {
      id: record.id,
      date: typeof rawDate === "string" ? rawDate : "",
      strokeCount: typeof record.strokeCount === "number" ? record.strokeCount : null,
      type,
      courseName: getCourseName(record)
    };
  }
  function normalizeActivitySummaryPage(data) {
    const emptyPage = {
      activities: [],
      itemCount: 0,
      totalCount: null,
      hasNextPage: null
    };
    if (!data || typeof data !== "object") return emptyPage;
    const record = data;
    const me = record.me && typeof record.me === "object" ? record.me : void 0;
    const roots = [me?.activities, record.activities];
    for (const root of roots) {
      let candidates = [];
      let totalCount = null;
      let hasNextPage = null;
      if (Array.isArray(root)) {
        candidates = root;
      } else if (root && typeof root === "object") {
        const rootRecord = root;
        totalCount = typeof rootRecord.totalCount === "number" ? rootRecord.totalCount : null;
        const pageInfo = rootRecord.pageInfo;
        if (pageInfo && typeof pageInfo === "object") {
          const pageInfoRecord = pageInfo;
          hasNextPage = typeof pageInfoRecord.hasNextPage === "boolean" ? pageInfoRecord.hasNextPage : null;
        }
        if (Array.isArray(rootRecord.items)) {
          candidates = rootRecord.items;
        } else if (Array.isArray(rootRecord.nodes)) {
          candidates = rootRecord.nodes;
        } else if (Array.isArray(rootRecord.edges)) {
          candidates = rootRecord.edges.map((edge) => edge && typeof edge === "object" ? edge.node : null);
        }
      }
      const activities = candidates.map(normalizeActivityRecord).filter((activity) => Boolean(activity));
      if (candidates.length > 0 || totalCount !== null || hasNextPage !== null) {
        return {
          activities,
          itemCount: candidates.length,
          totalCount,
          hasNextPage
        };
      }
    }
    return emptyPage;
  }
  function normalizeActivitySummaries(data) {
    return normalizeActivitySummaryPage(data).activities;
  }
  var STROKE_MEASUREMENT_FIELDS = `
  clubSpeed ballSpeed smashFactor attackAngle clubPath faceAngle
  faceToPath swingDirection swingPlane dynamicLoft spinRate spinAxis spinLoft
  launchAngle launchDirection carry total carrySide totalSide
  maxHeight landingAngle hangTime
`;
  var SCORECARD_SHOT_MEASUREMENT_FIELDS = `
  ballSpeed carrySideActual carryActual launchDirection maxHeight carry total
  carrySide launchAngle spinRate spinAxis backswingTime forwardswingTime tempo
  strokeLength dynamicLie impactOffset impactHeight skidDistance rollPercentage
  rollSpeed speedDrop rollDeceleration effectiveStimp flatStimp break bounces
  entrySpeedDistance elevation slopePercentageSide slopePercentageRise
  totalBreak attackAngle clubPath clubSpeed dynamicLoft faceAngle faceToPath
  smashFactor gyroSpinAngle spinLoft swingDirection swingPlane swingRadius
`;
  var STROKE_FIELDS = `
  club
  time
  targetDistance
  measurement {
    ${STROKE_MEASUREMENT_FIELDS}
  }
`;
  var IMPORT_SESSION_QUERY = `
  query FetchActivityById($id: ID!) {
    node(id: $id) {
      ... on SessionActivity {
        id time strokeCount strokes { ${STROKE_FIELDS} }
      }
      ... on VirtualRangeSessionActivity {
        id time strokeCount strokes { ${STROKE_FIELDS} }
      }
      ... on ShotAnalysisSessionActivity {
        id time strokeCount strokes { ${STROKE_FIELDS} }
      }
      ... on CombineTestActivity {
        id time strokes { ${STROKE_FIELDS} }
      }
      ... on RangeFindMyDistanceActivity {
        id time strokes {
          club
          isDeleted
          isSimulated
          measurement(measurementType: PRO_BALL_MEASUREMENT) {
            ballSpeed ballSpin spinAxis
            carry carrySide total totalSide
            landingAngle launchAngle launchDirection maxHeight
          }
        }
      }
    }
  }
`;
  function flatStrokeActivityQuery(typeName) {
    return {
      label: `${typeName}:strokes`,
      query: `
      query FetchActivityById($id: ID!) {
        node(id: $id) {
          __typename
          ... on ${typeName} {
            id time
            strokes { ${STROKE_FIELDS} }
          }
        }
      }
    `
    };
  }
  function groupedStrokeActivityQuery(typeName) {
    return {
      label: `${typeName}:strokeGroups`,
      query: `
      query FetchActivityById($id: ID!) {
        node(id: $id) {
          __typename
          ... on ${typeName} {
            id time
            strokeGroups {
              club
              name
              strokes { ${STROKE_FIELDS} }
            }
          }
        }
      }
    `
    };
  }
  function proBallActivityQuery(typeName) {
    return {
      label: `${typeName}:PRO_BALL_MEASUREMENT`,
      query: `
      query FetchActivityById($id: ID!) {
        node(id: $id) {
          __typename
          ... on ${typeName} {
            id time
            strokes {
              club
              time
              targetDistance
              measurement(measurementType: PRO_BALL_MEASUREMENT) {
                ballSpeed ballSpin spinAxis
                carry carrySide total totalSide
                landingAngle launchAngle launchDirection maxHeight
              }
            }
          }
        }
      }
    `
    };
  }
  function groupedProBallActivityQuery(typeName) {
    return {
      label: `${typeName}:strokeGroups:PRO_BALL_MEASUREMENT`,
      query: `
      query FetchActivityById($id: ID!) {
        node(id: $id) {
          __typename
          ... on ${typeName} {
            id time
            strokeGroups {
              club
              name
              strokes {
                club
                time
                targetDistance
                measurement(measurementType: PRO_BALL_MEASUREMENT) {
                  ballSpeed ballSpin spinAxis
                  carry carrySide total totalSide
                  landingAngle launchAngle launchDirection maxHeight
                }
              }
            }
          }
        }
      }
    `
    };
  }
  function scorecardShotActivityQuery(typeName, measurementKind) {
    return {
      label: `${typeName}:scorecard.shots:${measurementKind}`,
      query: `
      query FetchActivityById($id: ID!) {
        node(id: $id) {
          __typename
          ... on ${typeName} {
            id time kind
            scorecard {
              holes {
                holeNumber
                shots {
                  id
                  shotNumber
                  club
                  launchTime
                  total
                  measurement(shotMeasurementKind: ${measurementKind}) {
                    ${SCORECARD_SHOT_MEASUREMENT_FIELDS}
                  }
                }
              }
            }
          }
        }
      }
    `
    };
  }
  var IMPORT_SESSION_FALLBACK_QUERIES = [
    scorecardShotActivityQuery("CoursePlayActivity", "NORMALIZED_MEASUREMENT"),
    scorecardShotActivityQuery("CoursePlayActivity", "MEASUREMENT"),
    scorecardShotActivityQuery("CoursePlayActivity", "PRO_BALL_MEASUREMENT"),
    flatStrokeActivityQuery("CoursePlayActivity"),
    groupedStrokeActivityQuery("CoursePlayActivity"),
    scorecardShotActivityQuery("CourseSessionActivity", "NORMALIZED_MEASUREMENT"),
    scorecardShotActivityQuery("CourseSessionActivity", "MEASUREMENT"),
    scorecardShotActivityQuery("CourseSessionActivity", "PRO_BALL_MEASUREMENT"),
    flatStrokeActivityQuery("CourseSessionActivity"),
    groupedStrokeActivityQuery("CourseSessionActivity"),
    flatStrokeActivityQuery("VirtualGolfActivity"),
    groupedStrokeActivityQuery("VirtualGolfActivity"),
    flatStrokeActivityQuery("VirtualGolfSessionActivity"),
    groupedStrokeActivityQuery("VirtualGolfSessionActivity"),
    flatStrokeActivityQuery("MapMyBagActivity"),
    groupedStrokeActivityQuery("MapMyBagActivity"),
    flatStrokeActivityQuery("MapMyBagSessionActivity"),
    groupedStrokeActivityQuery("MapMyBagSessionActivity"),
    flatStrokeActivityQuery("BagMappingActivity"),
    groupedStrokeActivityQuery("BagMappingActivity"),
    proBallActivityQuery("MapMyBagActivity"),
    groupedProBallActivityQuery("MapMyBagActivity"),
    proBallActivityQuery("MapMyBagSessionActivity"),
    groupedProBallActivityQuery("MapMyBagSessionActivity")
  ];
  var IMPORT_SESSION_QUERY_CANDIDATES = [
    { label: "default", query: IMPORT_SESSION_QUERY },
    ...IMPORT_SESSION_FALLBACK_QUERIES
  ];

  // src/shared/bulk_import.ts
  function createJobId(now) {
    return `bulk-${now.toString(36)}`;
  }
  function getActivityDetail(activity) {
    if (activity.courseName?.trim()) return activity.courseName.trim();
    return activity.strokeCount === null ? "" : `${activity.strokeCount} shots`;
  }
  function countStatus(items, status) {
    return items.filter((item) => item.status === status).length;
  }
  function recalculateJob(job, now) {
    return {
      ...job,
      updatedAt: now,
      total: job.items.length,
      imported: countStatus(job.items, "imported"),
      failed: countStatus(job.items, "failed")
    };
  }
  function createBulkImportJob(activities, now = Date.now()) {
    const seenIds = /* @__PURE__ */ new Set();
    const items = [];
    for (const activity of activities) {
      if (seenIds.has(activity.id)) continue;
      seenIds.add(activity.id);
      items.push({
        activityId: activity.id,
        date: activity.date,
        type: activity.type,
        detail: getActivityDetail(activity),
        status: "pending"
      });
    }
    return {
      id: createJobId(now),
      createdAt: now,
      updatedAt: now,
      state: "idle",
      total: items.length,
      imported: 0,
      failed: 0,
      items
    };
  }
  function startBulkImportJob(job, now = Date.now()) {
    return recalculateJob({
      ...job,
      state: "running",
      lastError: void 0
    }, now);
  }
  function pauseBulkImportJob(job, now = Date.now()) {
    return recalculateJob({
      ...job,
      state: "paused",
      currentActivityId: void 0,
      items: job.items.map(
        (item) => item.status === "importing" ? { ...item, status: "pending", updatedAt: now } : item
      )
    }, now);
  }
  function completeBulkImportJob(job, now = Date.now()) {
    return recalculateJob({
      ...job,
      state: "complete",
      currentActivityId: void 0
    }, now);
  }
  function recoverInterruptedBulkImportJob(job, now = Date.now()) {
    if (job.state !== "running" && !job.items.some((item) => item.status === "importing")) {
      return job;
    }
    return pauseBulkImportJob(job, now);
  }
  function resetFailedBulkImportItems(job, now = Date.now()) {
    return recalculateJob({
      ...job,
      state: "idle",
      lastError: void 0,
      items: job.items.map(
        (item) => item.status === "failed" ? { ...item, status: "pending", error: void 0, updatedAt: now } : item
      )
    }, now);
  }
  function getNextBulkImportItem(job) {
    return job.items.find((item) => item.status === "pending") ?? null;
  }
  function updateBulkImportItem(job, activityId, patch, now = Date.now()) {
    const items = job.items.map(
      (item) => item.activityId === activityId ? { ...item, ...patch, updatedAt: now } : item
    );
    const nextJob = recalculateJob({
      ...job,
      items,
      currentActivityId: patch.status === "importing" ? activityId : job.currentActivityId
    }, now);
    if (patch.status && patch.status !== "importing" && nextJob.currentActivityId === activityId) {
      return { ...nextJob, currentActivityId: void 0 };
    }
    return nextJob;
  }
  function failBulkImportItem(job, activityId, error, now = Date.now()) {
    return {
      ...updateBulkImportItem(job, activityId, {
        status: "failed",
        error
      }, now),
      lastError: error
    };
  }
  function getBulkImportCompletedCount(job) {
    return job.imported + job.failed;
  }
  function getBulkImportProgressLabel(job) {
    const completed = getBulkImportCompletedCount(job);
    if (job.total === 0) return "No sessions selected";
    const parts = [`${completed} / ${job.total}`];
    if (job.imported > 0) parts.push(`${job.imported} imported`);
    if (job.failed > 0) parts.push(`${job.failed} failed`);
    return parts.join(" | ");
  }

  // src/shared/bulk_import_store.ts
  var DB_NAME = "trackpull-bulk-import";
  var DB_VERSION = 1;
  var SESSION_STORE = "sessions";
  var JOB_INDEX = "jobId";
  function openBulkImportDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(SESSION_STORE)) {
          const store = db.createObjectStore(SESSION_STORE, { keyPath: "key" });
          store.createIndex(JOB_INDEX, JOB_INDEX, { unique: false });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("Could not open bulk import store"));
      request.onblocked = () => reject(new Error("Bulk import store is blocked by another tab"));
    });
  }
  function requestToPromise(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("Bulk import store request failed"));
    });
  }
  async function getBulkImportedSessions(jobId) {
    const db = await openBulkImportDb();
    try {
      const tx = db.transaction(SESSION_STORE, "readonly");
      const index = tx.objectStore(SESSION_STORE).index(JOB_INDEX);
      const sessions = await requestToPromise(index.getAll(jobId));
      return sessions.sort((a, b) => a.capturedAt - b.capturedAt).map((record) => record.snapshot);
    } finally {
      db.close();
    }
  }
  async function clearBulkImportedSessions(jobId) {
    const db = await openBulkImportDb();
    try {
      const tx = db.transaction(SESSION_STORE, "readwrite");
      const index = tx.objectStore(SESSION_STORE).index(JOB_INDEX);
      const transactionDone = new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error("Could not clear bulk import store"));
        tx.onabort = () => reject(tx.error ?? new Error("Could not clear bulk import store"));
      });
      const records = await requestToPromise(index.getAllKeys(jobId));
      for (const key of records) {
        tx.objectStore(SESSION_STORE).delete(key);
      }
      await transactionDone;
    } finally {
      db.close();
    }
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
  function hasAnyTags(sessions) {
    return sessions.some(hasTags);
  }
  function escapeCsvValue(value) {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
  function createCsvLines(headerRow, rows, hittingSurface) {
    const lines = [];
    if (hittingSurface !== void 0) {
      lines.push(`Hitting Surface: ${hittingSurface}`);
    }
    lines.push(headerRow.join(","));
    for (const row of rows) {
      lines.push(
        headerRow.map((col) => escapeCsvValue(row[col] ?? "")).join(",")
      );
    }
    return lines.join("\n");
  }
  function writeBulkCsv(sessions, includeAverages = true, metricOrder, unitChoice = DEFAULT_UNIT_CHOICE, hittingSurface) {
    const allMetricNames = Array.from(
      new Set(sessions.flatMap((session) => session.metric_names))
    );
    const orderedMetrics = orderMetricsByPriority(
      allMetricNames,
      metricOrder ?? METRIC_COLUMN_ORDER
    );
    const headerRow = ["Session Date", "Report ID", "Activity Type", "Club"];
    const includeTagColumn = hasAnyTags(sessions);
    if (includeTagColumn) {
      headerRow.push("Tag");
    }
    headerRow.push("Shot #", "Type");
    for (const metric of orderedMetrics) {
      headerRow.push(getColumnName(metric, unitChoice));
    }
    const rows = [];
    for (const session of sessions) {
      const unitSystem = getApiSourceUnitSystem(session.metadata_params);
      const activityType = session.metadata_params.activity_type ?? session.metadata_params.activity_kind ?? "";
      for (const club of session.club_groups) {
        for (const shot of club.shots) {
          const row = {
            "Session Date": session.date,
            "Report ID": session.report_id,
            "Activity Type": activityType,
            Club: club.club_name,
            "Shot #": String(shot.shot_number + 1),
            Type: "Shot"
          };
          if (includeTagColumn) {
            row.Tag = shot.tag ?? "";
          }
          for (const metric of orderedMetrics) {
            const colName = getColumnName(metric, unitChoice);
            const rawValue = shot.metrics[metric] ?? "";
            row[colName] = typeof rawValue === "string" || typeof rawValue === "number" ? String(normalizeMetricValue(rawValue, metric, unitSystem, unitChoice)) : "";
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
              "Session Date": session.date,
              "Report ID": session.report_id,
              "Activity Type": activityType,
              Club: club.club_name,
              "Shot #": "",
              Type: "Average"
            };
            if (includeTagColumn) {
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
    }
    return createCsvLines(headerRow, rows, hittingSurface);
  }

  // src/shared/tsv_writer.ts
  var METRIC_COLUMN_ORDER2 = [
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
  function escapeTsvField(value) {
    return value.replace(/\t/g, " ").replace(/[\n\r]/g, " ");
  }
  function getDisplayName2(metric) {
    return METRIC_DISPLAY_NAMES[metric] ?? metric;
  }
  function getColumnName2(metric, unitChoice) {
    const displayName = getDisplayName2(metric);
    const unitLabel = getMetricUnitLabel(metric, unitChoice);
    return unitLabel ? `${displayName} (${unitLabel})` : displayName;
  }
  function orderMetricsByPriority2(allMetrics, priorityOrder) {
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
  function hasTags2(session) {
    return session.club_groups.some(
      (club) => club.shots.some((shot) => shot.tag !== void 0 && shot.tag !== "")
    );
  }
  function writeTsv(session, unitChoice = DEFAULT_UNIT_CHOICE, hittingSurface) {
    const orderedMetrics = orderMetricsByPriority2(
      session.metric_names,
      METRIC_COLUMN_ORDER2
    );
    const includeTag = hasTags2(session);
    const headerFields = ["Date", "Club"];
    if (includeTag) {
      headerFields.push("Tag");
    }
    headerFields.push("Shot #");
    for (const metric of orderedMetrics) {
      headerFields.push(getColumnName2(metric, unitChoice));
    }
    const unitSystem = getApiSourceUnitSystem(session.metadata_params);
    const rows = [];
    for (const club of session.club_groups) {
      for (const shot of club.shots) {
        const fields = [
          escapeTsvField(session.date),
          escapeTsvField(club.club_name)
        ];
        if (includeTag) {
          fields.push(escapeTsvField(shot.tag ?? ""));
        }
        fields.push(escapeTsvField(String(shot.shot_number + 1)));
        for (const metric of orderedMetrics) {
          const rawValue = shot.metrics[metric] ?? "";
          let fieldValue;
          if (typeof rawValue === "string" || typeof rawValue === "number") {
            fieldValue = String(normalizeMetricValue(rawValue, metric, unitSystem, unitChoice));
          } else {
            fieldValue = "";
          }
          fields.push(escapeTsvField(fieldValue));
        }
        rows.push(fields.join("	"));
      }
    }
    const headerRow = headerFields.map(escapeTsvField).join("	");
    const parts = [];
    if (hittingSurface !== void 0) {
      parts.push(`Hitting Surface: ${hittingSurface}`);
    }
    parts.push(headerRow, ...rows);
    return parts.join("\n");
  }

  // src/shared/prompt_types.ts
  var BUILTIN_PROMPTS = [
    {
      id: "session-overview-beginner",
      name: "Session Overview",
      tier: "beginner",
      topic: "overview",
      template: `You are a friendly golf coach reviewing a player's Trackman session. Your job is to encourage them and help them improve.

Here is the tab-separated Trackman golf session data from their session today:

{{DATA}}

Please review this data and give the player a warm, encouraging summary. Include:
- 2 to 3 things they did well today (be specific, mention clubs or metrics if they stand out)
- 1 to 2 things to focus on for next time (keep it simple and actionable)
- A short encouraging closing message

Set aside any obvious mishits when judging the session. Use simple language. Avoid heavy technical jargon. Speak directly to the player like a supportive coach.`
    },
    {
      id: "club-breakdown-intermediate",
      name: "Club-by-Club Breakdown",
      tier: "intermediate",
      topic: "club-breakdown",
      template: `You are a golf performance analyst reviewing a player's Trackman session data.

Here is the tab-separated Trackman golf session data:

{{DATA}}

Before analyzing, note how many shots each club has. Treat any club with fewer than 5 shots as low-confidence, and exclude obvious mishits from averages (mention any shots you exclude). If a Tag column is present, break results down by tag within each club.

Please provide a club-by-club breakdown of this session. For each club represented in the data:
- Summarize average carry distance and ball speed
- Note the player's strengths with that club
- Identify weaknesses or areas for improvement

Then provide an overall summary:
- Which clubs are performing the strongest?
- Where are the biggest distance gaps between clubs? Are those gaps appropriate?
- What 1 to 2 adjustments would most improve overall performance?

If any suggested adjustment involves equipment (a different club, shaft, or loft), do not guess my current setup. Ask me short questions about the clubs and shafts I play now, and refine that recommendation after I answer.

Use moderate technical depth. Briefly explain what metrics mean when you reference them.`
    },
    {
      id: "consistency-analysis-advanced",
      name: "Consistency Analysis",
      tier: "advanced",
      topic: "consistency",
      template: `You are a technical golf data analyst. Analyze the following Trackman session data with a numbers-first approach.

Tab-separated Trackman golf session data:

{{DATA}}

If you have a code execution or data analysis tool available, use it for the statistics below; otherwise present them as estimates and say so.

Perform a consistency analysis across all shots and clubs:
- Calculate or estimate standard deviation ranges for key metrics (club speed, ball speed, launch angle, spin rate, carry)
- Identify which clubs show the tightest dispersion and which are most variable
- Analyze shot-to-shot repeatability patterns: is the player consistent in face angle, club path, and dynamic loft?
- Identify any outlier shots (significant deviations from the mean) and note which metrics are responsible
- Provide a consistency rating summary per club and overall

Ground rules:
- Report the shot count per club and treat clubs with fewer than 5 shots as low-confidence
- Exclude obvious mishits from averages and standard deviations, but list them as outliers
- The data header notes the hitting surface; mat strikes can mask fat contact, so factor that into strike-quality judgments
- If a metric referenced above is not present in the data, say so rather than estimating it

Reference specific metric values and numbers throughout. Prioritize data over general advice.`
    },
    {
      id: "launch-spin-intermediate",
      name: "Launch & Spin Optimization",
      tier: "intermediate",
      topic: "launch-spin",
      template: `You are a golf performance analyst specializing in launch conditions and spin optimization.

Here is the tab-separated Trackman golf session data:

{{DATA}}

Analyze the player's launch and spin data:
- Review launch angle and spin rate combinations per club
- Compare them to typical optimal windows for each club type (e.g., driver: ~12-15 deg launch, ~2200-2700 rpm spin). These windows shift with ball speed: faster ball speeds favor lower spin and launch, slower ball speeds need more of both
- Use spin axis to describe curve tendencies. For a right-handed player, a positive spin axis means the ball curves right (fade/slice) and a negative spin axis means it curves left (draw/hook); this is reversed for left-handers
- Identify which clubs are closest to optimal and which are farthest

For clubs that are outside optimal windows:
- Explain what the current numbers mean in terms of ball flight (too high, too low, too much spin, etc.)
- Suggest specific adjustments to move toward optimal conditions

Before recommending any loft or shaft change, interview me briefly: ask whether I am right- or left-handed, what loft and shaft (flex and weight) I currently play in the relevant clubs, and whether this session used range balls or premium balls. Give your preliminary read from the data first, then refine the recommendations after I answer.

If a metric referenced above is not in the data, say so rather than estimating it. Use moderate technical depth and explain what metrics mean for players who are learning.`
    },
    {
      id: "distance-gapping-beginner",
      name: "Distance Gapping Report",
      tier: "beginner",
      topic: "distance-gapping",
      template: `You are a friendly golf coach helping a player understand their distance gapping.

Here is the tab-separated Trackman golf session data:

{{DATA}}

Please review the carry and total distances for each club in this session. Then:
- List the average carry distance for each club in a simple, easy-to-read format
- Look at the gaps between consecutive clubs -- are there any big jumps or clubs that overlap?
- Let the player know if their gapping looks good or if there are clubs that might be missing or overlapping
- Give 1 to 2 friendly suggestions for the player's bag setup or club selection

Keep a few things in mind:
- Ignore obvious mishits when working out averages, and mention how many shots each club has
- If it looks like some clubs are missing from the data, ask me what else is in my bag before judging coverage
- One session is a starting point, not a final verdict -- say so if the data is thin

Keep it simple and encouraging. Focus on practical take-aways the player can use on the course.`
    },
    {
      id: "shot-shape-intermediate",
      name: "Shot Shape & Dispersion",
      tier: "intermediate",
      topic: "shot-shape",
      template: `You are a golf performance analyst reviewing a player's shot shape and dispersion patterns.

Here is the tab-separated Trackman golf session data:

{{DATA}}

First: if I have not said whether I am right- or left-handed, ask me, because every direction below flips for left-handers. You may give a preliminary read assuming right-handed, clearly labeled as such.

Analyze the player's shot shape and miss patterns:
- Review face angle, club path, face-to-path, and curve values to characterize their typical shot shape per club. For a right-handed player, positive club path = in-to-out (draw-biased) and positive face angle = open to the target (starts right)
- Identify if they play a consistent shot shape (draw, fade, straight) or if the pattern varies
- Review the Side and CarrySide data to understand lateral dispersion -- how far off-center do shots typically land? State the sign convention you assume for these columns
- Identify their most common miss direction and the likely technical cause (face angle, path, or both)

Provide:
- A shot shape profile for each club (e.g., "mild fade", "variable with occasional hook")
- An overall assessment of dispersion consistency
- 1 to 2 actionable suggestions to tighten their pattern

Exclude obvious mishits from the pattern read (note them separately), and if a metric referenced above is not in the data, say so rather than estimating it.

Use moderate technical depth. Briefly explain what each metric means.`
    },
    {
      id: "club-delivery-advanced",
      name: "Club Delivery Analysis",
      tier: "advanced",
      topic: "club-delivery",
      template: `You are a technical golf analyst conducting a detailed club delivery analysis.

Tab-separated Trackman golf session data:

{{DATA}}

Assume a right-handed player unless I have said otherwise; state that assumption and ask me to confirm. If you have a code execution or data analysis tool, use it for the statistics below; otherwise keep the analysis qualitative and label any numbers as estimates.

Analyze club delivery metrics across all clubs and shots. Focus on:
- Attack Angle: positive (ascending) vs negative (descending) and its effect on spin and launch
- Club Path (in/out vs out/in) and how it correlates to curve and spin axis
- Face Angle at impact and the face-to-path relationship as the primary driver of curvature
- Dynamic Loft per club compared to expected values. If your conclusions depend on my actual club lofts, ask me for them rather than assuming stock lofts
- Which delivery metrics most strongly relate to carry distance, spin rate, and side error for this player

For each major club category (driver, irons, wedges):
- Report average delivery numbers along with the shot count behind them
- Identify the most impactful delivery variable affecting performance
- Flag any delivery patterns that suggest mechanical inefficiency

The data header notes the hitting surface; mat strikes can mask fat contact, so factor that into strike-quality judgments. Exclude obvious mishits from averages and list them separately. If a metric referenced above is not present in the data, say so rather than estimating it.

Prioritize numbers and specific metric values. Provide a ranked list of delivery improvements by expected performance impact.`
    },
    {
      id: "quick-summary-beginner",
      name: "Quick Session Summary",
      tier: "beginner",
      topic: "quick-summary",
      template: `You are a friendly golf coach. Give the player a fast, upbeat summary of their Trackman session.

Here is the tab-separated Trackman golf session data from their session:

{{DATA}}

Provide a very short, friendly summary in 3 to 4 bullet points only. Cover:
- Their best performing club today
- Their longest carry shot (club and distance)
- Their most consistent club (tightest results)
- One quick positive takeaway to leave them feeling good

Skip obvious mishits when picking the highlights. Keep it brief and encouraging. No heavy analysis needed -- just the headlines.`
    }
  ];

  // src/shared/prompt_builder.ts
  function assemblePrompt(prompt, tsvData, metadata) {
    let dataBlock;
    if (metadata !== void 0) {
      let contextHeader = `Session: ${metadata.date} | ${metadata.shotCount} shots | Units: ${metadata.unitLabel}`;
      if (metadata.hittingSurface !== void 0) {
        contextHeader += ` | Surface: ${metadata.hittingSurface}`;
      }
      dataBlock = contextHeader + "\n\n" + tsvData;
    } else {
      dataBlock = tsvData;
    }
    return prompt.template.replace("{{DATA}}", dataBlock);
  }
  function buildUnitLabel(unitChoice) {
    return `${unitChoice.speed} + ${unitChoice.distance}`;
  }
  function countSessionShots(session) {
    return session.club_groups.reduce((total, club) => total + club.shots.length, 0);
  }

  // src/shared/custom_prompts.ts
  async function loadCustomPrompts() {
    const idsResult = await chrome.storage.sync.get([CUSTOM_PROMPT_IDS_KEY]);
    const ids = idsResult[CUSTOM_PROMPT_IDS_KEY] ?? [];
    if (ids.length === 0) return [];
    const keys = ids.map((id) => CUSTOM_PROMPT_KEY_PREFIX + id);
    const promptsResult = await chrome.storage.sync.get(keys);
    return ids.map((id) => promptsResult[CUSTOM_PROMPT_KEY_PREFIX + id]).filter((p) => p !== void 0);
  }

  // src/shared/portalPermissions.ts
  var PORTAL_ORIGINS = [
    "https://api.trackmangolf.com/*",
    "https://portal.trackmangolf.com/*"
  ];
  async function hasPortalPermission() {
    return chrome.permissions.contains({ origins: [...PORTAL_ORIGINS] });
  }
  async function requestPortalPermission() {
    return chrome.permissions.request({ origins: [...PORTAL_ORIGINS] });
  }

  // src/shared/activity_helpers.ts
  function parseActivityLocalDate(isoDate) {
    const dateOnly = isoDate.includes("T") ? isoDate.slice(0, 10) : isoDate;
    return /* @__PURE__ */ new Date(dateOnly + "T00:00:00");
  }
  function formatActivityDate(isoDate, now) {
    const d = parseActivityLocalDate(isoDate);
    if (isNaN(d.getTime())) return isoDate || "Unknown";
    const ref = now ?? /* @__PURE__ */ new Date();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const formatted = `${monthNames[d.getMonth()]} ${d.getDate()}`;
    if (d.getFullYear() !== ref.getFullYear()) {
      return `${formatted}, ${d.getFullYear()}`;
    }
    return formatted;
  }
  function getPortalActivityDisplayLabel(type) {
    switch (type) {
      case "CoursePlayActivity":
      case "CourseSessionActivity":
      case "COURSE_PLAY":
        return "Course play";
      case "MapMyBagActivity":
      case "MapMyBagSessionActivity":
      case "BagMappingActivity":
      case "MAP_MY_BAG":
        return "Map My Bag";
      default:
        return type ?? "Activity";
    }
  }

  // src/popup/popup.ts
  function computeClubAverage(shots, metricName) {
    const values = shots.map((s) => s.metrics[metricName]).filter((v) => v !== void 0 && v !== "").map((v) => parseFloat(String(v)));
    const numericValues = values.filter((v) => !isNaN(v));
    if (numericValues.length === 0) return null;
    const avg = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
    return Math.round(avg * 10) / 10;
  }
  function escapeHtml(value) {
    return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
  }
  var cachedData = null;
  var cachedUnitChoice = DEFAULT_UNIT_CHOICE;
  var cachedSurface = "Mat";
  var cachedCustomPrompts = [];
  var cachedPortalActivities = [];
  var activeBulkImportJob = null;
  var bulkImportRunning = false;
  var bulkImportPauseRequested = false;
  var AI_URLS = {
    "ChatGPT": "https://chatgpt.com",
    "Claude": "https://claude.ai",
    "Gemini": "https://gemini.google.com"
  };
  var PORTAL_ACTIVITY_PATTERN = /^https:\/\/portal\.trackmangolf\.com\/player\/activities\/([A-Za-z0-9+/=]+)$/;
  var PORTAL_ACTIVITIES_LIST_PATTERN = /^https:\/\/portal\.trackmangolf\.com\/player\/activities\/?$/;
  function isPortalAuthMessage(message) {
    const normalized = message.toLowerCase();
    return normalized.includes("unauthorized") || normalized.includes("not authorized") || normalized.includes("unauthenticated") || normalized.includes("not logged in");
  }
  function isPortalBridgeUnavailableMessage(message) {
    const normalized = message.toLowerCase();
    return normalized.includes("could not establish connection") || normalized.includes("receiving end does not exist");
  }
  function formatPortalFetchError(message) {
    if (isPortalBridgeUnavailableMessage(message)) {
      return "Refresh the Trackman portal tab, then reopen TrackPull";
    }
    return isPortalAuthMessage(message) ? "Session expired \u2014 log into portal.trackmangolf.com" : message;
  }
  async function fetchPortalGraphQL(tabId, candidate, variables) {
    return chrome.tabs.sendMessage(tabId, {
      type: "PORTAL_GRAPHQL_FETCH",
      query: candidate.query,
      variables
    });
  }
  function appendUniqueActivities(target, seenIds, activities) {
    for (const activity of activities) {
      if (seenIds.has(activity.id)) continue;
      seenIds.add(activity.id);
      target.push(activity);
    }
  }
  async function fetchPortalActivitiesForCandidate(tabId, candidate) {
    if (!candidate.paginated) {
      const fetchResponse = await fetchPortalGraphQL(tabId, candidate);
      if (!fetchResponse?.success) {
        return { error: fetchResponse?.error ?? "Failed to fetch activities" };
      }
      const graphQLErrors = fetchResponse.data?.errors ?? [];
      if (graphQLErrors.length > 0) {
        return { error: graphQLErrors[0].message };
      }
      return { activities: normalizeActivitySummaries(fetchResponse.data?.data) };
    }
    const activities = [];
    const seenIds = /* @__PURE__ */ new Set();
    let skip = 0;
    for (let page = 0; page < FETCH_ACTIVITIES_MAX_PAGES; page += 1) {
      const fetchResponse = await fetchPortalGraphQL(tabId, candidate, {
        skip,
        take: FETCH_ACTIVITIES_PAGE_SIZE
      });
      if (!fetchResponse?.success) {
        return { error: fetchResponse?.error ?? "Failed to fetch activities" };
      }
      const graphQLErrors = fetchResponse.data?.errors ?? [];
      if (graphQLErrors.length > 0) {
        return { error: graphQLErrors[0].message };
      }
      const summaryPage = normalizeActivitySummaryPage(fetchResponse.data?.data);
      appendUniqueActivities(activities, seenIds, summaryPage.activities);
      const consumedCount = skip + summaryPage.itemCount;
      if (summaryPage.hasNextPage === false || summaryPage.itemCount === 0 || summaryPage.hasNextPage === null && summaryPage.itemCount < FETCH_ACTIVITIES_PAGE_SIZE || summaryPage.totalCount !== null && consumedCount >= summaryPage.totalCount) {
        return { activities };
      }
      skip = consumedCount;
    }
    return { activities };
  }
  async function fetchPortalActivities(tabId) {
    let firstError;
    for (const candidate of FETCH_ACTIVITIES_QUERY_CANDIDATES) {
      const result = await fetchPortalActivitiesForCandidate(tabId, candidate);
      if (result.error) {
        firstError = firstError ?? result.error;
        continue;
      }
      return result.activities ?? [];
    }
    throw new Error(formatPortalFetchError(firstError ?? "No activities found"));
  }
  function responseContainsMeasurement(value) {
    if (Array.isArray(value)) {
      return value.some(responseContainsMeasurement);
    }
    if (!value || typeof value !== "object") return false;
    const record = value;
    if (record.measurement || record.Measurement || record.NormalizedMeasurement) {
      return true;
    }
    return Object.entries(record).some(([key, nested]) => {
      if (key === "measurement" || key === "Measurement" || key === "NormalizedMeasurement") {
        return false;
      }
      return responseContainsMeasurement(nested);
    });
  }
  async function fetchPortalActivityCandidates(tabId, activityId) {
    const payloads = [];
    let firstError;
    for (const candidate of IMPORT_SESSION_QUERY_CANDIDATES) {
      const fetchResponse = await chrome.tabs.sendMessage(tabId, {
        type: "PORTAL_GRAPHQL_FETCH",
        query: candidate.query,
        variables: { id: activityId }
      });
      if (!fetchResponse?.success) {
        firstError = firstError ?? fetchResponse?.error ?? "Failed to fetch activity";
        continue;
      }
      const graphQLErrors = fetchResponse.data?.errors ?? [];
      if (graphQLErrors.length > 0) {
        firstError = firstError ?? graphQLErrors[0].message;
        continue;
      }
      if (fetchResponse.data) {
        payloads.push(fetchResponse.data);
        if (responseContainsMeasurement(fetchResponse.data.data?.node)) {
          break;
        }
      }
    }
    if (payloads.length === 0) {
      throw new Error(formatPortalFetchError(firstError ?? "Failed to fetch activity"));
    }
    return payloads;
  }
  function installImportStatusButtonReset(button) {
    const statusListener = (changes) => {
      if (changes[STORAGE_KEYS.IMPORT_STATUS]) {
        const status = changes[STORAGE_KEYS.IMPORT_STATUS].newValue;
        if (status && (status.state === "success" || status.state === "error")) {
          chrome.storage.onChanged.removeListener(statusListener);
          button.disabled = false;
          button.textContent = status.state === "success" ? "Imported!" : "Import";
        }
      }
    };
    chrome.storage.onChanged.addListener(statusListener);
  }
  async function importPortalActivityFromTab(tabId, activityId, button) {
    button.disabled = true;
    button.textContent = "Importing...";
    try {
      const graphqlPayloads = await fetchPortalActivityCandidates(tabId, activityId);
      installImportStatusButtonReset(button);
      void chrome.runtime.sendMessage({
        type: "SAVE_IMPORTED_SESSION",
        graphqlPayloads,
        activityId
      }).catch(() => {
        showToast("Import failed \u2014 try again", "error");
        button.disabled = false;
        button.textContent = "Import";
      });
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : "Unable to fetch activity";
      showToast(formatPortalFetchError(message), "error");
      button.disabled = false;
      button.textContent = "Import";
    }
  }
  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  function loadStoredBulkImportJob() {
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEYS.BULK_IMPORT_STATUS], (result) => {
        resolve(result[STORAGE_KEYS.BULK_IMPORT_STATUS] ?? null);
      });
    });
  }
  async function saveBulkImportJob(job) {
    activeBulkImportJob = job;
    await chrome.storage.local.set({ [STORAGE_KEYS.BULK_IMPORT_STATUS]: job });
    renderBulkImportJob(job);
  }
  function getBulkImportItem(job, activityId) {
    return job?.items.find((item) => item.activityId === activityId) ?? null;
  }
  function getActivityRow(activityId) {
    const rows = Array.from(document.querySelectorAll(".activity-row"));
    return rows.find((row) => row.dataset.activityId === activityId) ?? null;
  }
  function getSelectedPortalActivities() {
    const selectedIds = new Set(
      Array.from(document.querySelectorAll(".activity-select")).filter((input) => input.checked && !input.disabled).map((input) => input.value)
    );
    return cachedPortalActivities.filter((activity) => selectedIds.has(activity.id));
  }
  function getIncludeAveragesChoice() {
    const checkbox = document.getElementById("include-averages-checkbox");
    return checkbox?.checked ?? true;
  }
  function getSafeBulkFilename() {
    const date = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    return `TrackPull_BulkImport_${date}.csv`;
  }
  function updateBulkSelectedCount() {
    const selectedCountEl = document.getElementById("bulk-selected-count");
    const importSelectedBtn = document.getElementById("bulk-import-selected-btn");
    const selectAll = document.getElementById("bulk-select-all");
    const selectableBoxes = Array.from(document.querySelectorAll(".activity-select")).filter((input) => !input.disabled);
    const selectedCount = selectableBoxes.filter((input) => input.checked).length;
    if (selectedCountEl) {
      selectedCountEl.textContent = `${selectedCount} selected`;
    }
    if (importSelectedBtn) {
      importSelectedBtn.disabled = selectedCount === 0 || bulkImportRunning;
    }
    if (selectAll) {
      selectAll.checked = selectableBoxes.length > 0 && selectedCount === selectableBoxes.length;
      selectAll.indeterminate = selectedCount > 0 && selectedCount < selectableBoxes.length;
    }
  }
  function renderBulkImportJob(job = activeBulkImportJob) {
    activeBulkImportJob = job;
    const progressEl = document.getElementById("bulk-import-progress");
    const pauseBtn = document.getElementById("bulk-import-pause-btn");
    const resumeBtn = document.getElementById("bulk-import-resume-btn");
    const retryBtn = document.getElementById("bulk-import-retry-btn");
    const exportBtn = document.getElementById("bulk-export-csv-btn");
    const importAllBtn = document.getElementById("bulk-import-all-btn");
    if (progressEl) {
      if (job) {
        progressEl.textContent = job.lastError ? `${getBulkImportProgressLabel(job)} | ${job.lastError}` : getBulkImportProgressLabel(job);
        progressEl.style.display = "block";
      } else {
        progressEl.textContent = "";
        progressEl.style.display = "none";
      }
    }
    if (pauseBtn) pauseBtn.disabled = !job || job.state !== "running" || !bulkImportRunning;
    if (resumeBtn) resumeBtn.disabled = !job || job.state !== "paused" || bulkImportRunning;
    if (retryBtn) retryBtn.disabled = !job || job.failed === 0 || bulkImportRunning;
    if (exportBtn) exportBtn.disabled = !job || job.imported === 0;
    if (importAllBtn) importAllBtn.disabled = cachedPortalActivities.length === 0 || bulkImportRunning;
    for (const activity of cachedPortalActivities) {
      const row = getActivityRow(activity.id);
      if (!row) continue;
      const button = row.querySelector(".activity-import-btn");
      const checkbox = row.querySelector(".activity-select");
      const item = getBulkImportItem(job, activity.id);
      if (!button || !checkbox) continue;
      if (!item) {
        button.disabled = bulkImportRunning;
        button.textContent = "Import";
        checkbox.disabled = bulkImportRunning;
        continue;
      }
      if (item.status === "imported") {
        button.disabled = true;
        button.textContent = "Imported";
        checkbox.checked = false;
        checkbox.disabled = true;
      } else if (item.status === "importing") {
        button.disabled = true;
        button.textContent = "Importing...";
        checkbox.disabled = true;
      } else if (item.status === "failed") {
        button.disabled = bulkImportRunning;
        button.textContent = "Failed";
        checkbox.disabled = bulkImportRunning;
      } else {
        button.disabled = bulkImportRunning;
        button.textContent = "Queued";
        checkbox.disabled = bulkImportRunning;
      }
    }
    updateBulkSelectedCount();
  }
  async function hydrateBulkImportJobControls() {
    const storedJob = await loadStoredBulkImportJob();
    if (!storedJob) {
      renderBulkImportJob(null);
      return;
    }
    const recoveredJob = recoverInterruptedBulkImportJob(storedJob);
    activeBulkImportJob = recoveredJob;
    renderBulkImportJob(recoveredJob);
    if (recoveredJob !== storedJob) {
      await saveBulkImportJob(recoveredJob);
    }
  }
  function saveBulkImportedSession(jobId, activityId, graphqlPayloads) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({
        type: "SAVE_BULK_IMPORTED_SESSION",
        jobId,
        activityId,
        graphqlPayloads
      }, (response) => {
        if (chrome.runtime.lastError) {
          resolve({ success: false, error: chrome.runtime.lastError.message });
          return;
        }
        resolve(response ?? { success: false, error: "No response from service worker" });
      });
    });
  }
  async function runBulkImportJob(tabId, startingJob) {
    if (bulkImportRunning) return;
    bulkImportRunning = true;
    bulkImportPauseRequested = false;
    let job = startBulkImportJob(startingJob);
    await saveBulkImportJob(job);
    try {
      while (true) {
        if (bulkImportPauseRequested) {
          job = pauseBulkImportJob(job);
          await saveBulkImportJob(job);
          showToast("Bulk import paused", "success");
          break;
        }
        const nextItem = getNextBulkImportItem(job);
        if (!nextItem) {
          job = completeBulkImportJob(job);
          await saveBulkImportJob(job);
          showToast(`Bulk import complete: ${job.imported} imported, ${job.failed} failed`, job.failed ? "error" : "success");
          break;
        }
        job = updateBulkImportItem(job, nextItem.activityId, {
          status: "importing",
          error: void 0
        });
        await saveBulkImportJob(job);
        try {
          const graphqlPayloads = await fetchPortalActivityCandidates(tabId, nextItem.activityId);
          const result = await saveBulkImportedSession(job.id, nextItem.activityId, graphqlPayloads);
          if (result.success && result.reportId) {
            job = updateBulkImportItem(job, nextItem.activityId, {
              status: "imported",
              reportId: result.reportId,
              shotCount: result.shotCount,
              error: void 0
            });
          } else {
            const message = result.error ?? "Import failed";
            job = failBulkImportItem(job, nextItem.activityId, message);
            if (isPortalAuthMessage(message)) {
              job = { ...pauseBulkImportJob(job), lastError: message };
              await saveBulkImportJob(job);
              showToast(message, "error");
              break;
            }
          }
        } catch (err) {
          const message = err instanceof Error && err.message ? err.message : "Unable to fetch activity";
          job = failBulkImportItem(job, nextItem.activityId, message);
          if (isPortalAuthMessage(message)) {
            job = { ...pauseBulkImportJob(job), lastError: message };
            await saveBulkImportJob(job);
            showToast(message, "error");
            break;
          }
        }
        await saveBulkImportJob(job);
        await delay(250);
      }
    } finally {
      bulkImportRunning = false;
      renderBulkImportJob(job);
    }
  }
  async function startNewBulkImport(tabId, activities) {
    if (activities.length === 0) {
      showToast("Select at least one session", "error");
      return;
    }
    if (bulkImportRunning) return;
    const previousJob = activeBulkImportJob;
    const job = createBulkImportJob(activities);
    if (previousJob) {
      await clearBulkImportedSessions(previousJob.id).catch((err) => {
        console.warn("Could not clear previous bulk import archive:", err);
      });
    }
    await clearBulkImportedSessions(job.id).catch(() => void 0);
    await runBulkImportJob(tabId, job);
  }
  async function resumeBulkImport(tabId) {
    if (!activeBulkImportJob || bulkImportRunning) return;
    await runBulkImportJob(tabId, activeBulkImportJob);
  }
  async function retryFailedBulkImport(tabId) {
    if (!activeBulkImportJob || bulkImportRunning) return;
    const retryJob = resetFailedBulkImportItems(activeBulkImportJob);
    await saveBulkImportJob(retryJob);
    await runBulkImportJob(tabId, retryJob);
  }
  async function exportBulkImportedCsv() {
    if (!activeBulkImportJob || activeBulkImportJob.imported === 0) {
      showToast("No imported sessions to export", "error");
      return;
    }
    const exportBtn = document.getElementById("bulk-export-csv-btn");
    if (exportBtn) exportBtn.disabled = true;
    try {
      const sessions = await getBulkImportedSessions(activeBulkImportJob.id);
      if (sessions.length === 0) {
        showToast("No imported sessions to export", "error");
        return;
      }
      const csvContent = writeBulkCsv(
        sessions,
        getIncludeAveragesChoice(),
        void 0,
        cachedUnitChoice,
        cachedSurface
      );
      const filename = getSafeBulkFilename();
      await new Promise((resolve, reject) => {
        chrome.downloads.download({
          url: `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`,
          filename,
          saveAs: false
        }, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      });
      showToast(`Exported successfully: ${filename}`, "success");
    } catch (err) {
      console.error("Bulk CSV export failed:", err);
      showToast("Bulk CSV export failed", "error");
    } finally {
      if (exportBtn) exportBtn.disabled = false;
      renderBulkImportJob(activeBulkImportJob);
    }
  }
  function renderBulkImportControls(tabId, activities) {
    const controls = document.createElement("div");
    controls.id = "bulk-import-controls";
    controls.className = "bulk-import-controls";
    const topRow = document.createElement("div");
    topRow.className = "bulk-import-row";
    const selectLabel = document.createElement("label");
    selectLabel.className = "bulk-select-label";
    const selectAll = document.createElement("input");
    selectAll.id = "bulk-select-all";
    selectAll.type = "checkbox";
    selectAll.addEventListener("change", () => {
      const boxes = Array.from(document.querySelectorAll(".activity-select")).filter((input) => !input.disabled);
      for (const box of boxes) {
        box.checked = selectAll.checked;
      }
      updateBulkSelectedCount();
    });
    const selectedCount = document.createElement("span");
    selectedCount.id = "bulk-selected-count";
    selectedCount.textContent = "0 selected";
    selectLabel.append(selectAll, selectedCount);
    const importSelectedBtn = document.createElement("button");
    importSelectedBtn.id = "bulk-import-selected-btn";
    importSelectedBtn.className = "bulk-action-btn";
    importSelectedBtn.textContent = "Import selected";
    importSelectedBtn.disabled = true;
    importSelectedBtn.addEventListener("click", () => {
      void startNewBulkImport(tabId, getSelectedPortalActivities());
    });
    const importAllBtn = document.createElement("button");
    importAllBtn.id = "bulk-import-all-btn";
    importAllBtn.className = "bulk-action-btn";
    importAllBtn.textContent = "Import all";
    importAllBtn.disabled = activities.length === 0;
    importAllBtn.addEventListener("click", () => {
      void startNewBulkImport(tabId, activities);
    });
    topRow.append(selectLabel, importSelectedBtn, importAllBtn);
    const bottomRow = document.createElement("div");
    bottomRow.className = "bulk-import-row";
    const pauseBtn = document.createElement("button");
    pauseBtn.id = "bulk-import-pause-btn";
    pauseBtn.className = "bulk-action-btn";
    pauseBtn.textContent = "Pause";
    pauseBtn.disabled = true;
    pauseBtn.addEventListener("click", () => {
      bulkImportPauseRequested = true;
    });
    const resumeBtn = document.createElement("button");
    resumeBtn.id = "bulk-import-resume-btn";
    resumeBtn.className = "bulk-action-btn";
    resumeBtn.textContent = "Resume";
    resumeBtn.disabled = true;
    resumeBtn.addEventListener("click", () => {
      void resumeBulkImport(tabId);
    });
    const retryBtn = document.createElement("button");
    retryBtn.id = "bulk-import-retry-btn";
    retryBtn.className = "bulk-action-btn";
    retryBtn.textContent = "Retry failed";
    retryBtn.disabled = true;
    retryBtn.addEventListener("click", () => {
      void retryFailedBulkImport(tabId);
    });
    const exportBtn = document.createElement("button");
    exportBtn.id = "bulk-export-csv-btn";
    exportBtn.className = "bulk-action-btn";
    exportBtn.textContent = "Export CSV";
    exportBtn.disabled = true;
    exportBtn.addEventListener("click", () => {
      void exportBulkImportedCsv();
    });
    bottomRow.append(pauseBtn, resumeBtn, retryBtn, exportBtn);
    const progress = document.createElement("div");
    progress.id = "bulk-import-progress";
    progress.className = "bulk-import-progress";
    progress.style.display = "none";
    controls.append(topRow, bottomRow, progress);
    return controls;
  }
  function renderPortalActivityBrowser(activities, tabId) {
    const browser = document.getElementById("portal-activity-browser");
    const list = document.getElementById("portal-activity-list");
    if (!browser || !list) return;
    cachedPortalActivities = activities;
    browser.style.display = "block";
    document.getElementById("bulk-import-controls")?.remove();
    if (activities.length === 0) {
      list.innerHTML = `<div class="activity-list-empty">No Course Play or Map My Bag sessions found</div>`;
      renderBulkImportJob(null);
      return;
    }
    list.before(renderBulkImportControls(tabId, activities));
    list.innerHTML = "";
    const fragment = document.createDocumentFragment();
    for (const activity of activities) {
      const row = document.createElement("div");
      row.className = "activity-row";
      row.dataset.activityId = activity.id;
      const selectBox = document.createElement("input");
      selectBox.className = "activity-select";
      selectBox.type = "checkbox";
      selectBox.value = activity.id;
      selectBox.setAttribute("aria-label", `Select ${formatActivityDate(activity.date)}`);
      selectBox.addEventListener("change", updateBulkSelectedCount);
      const dateEl = document.createElement("span");
      dateEl.className = "activity-date";
      dateEl.textContent = formatActivityDate(activity.date);
      const mainEl = document.createElement("span");
      mainEl.className = "activity-main";
      const typeEl = document.createElement("span");
      typeEl.className = "activity-type";
      typeEl.textContent = getPortalActivityDisplayLabel(activity.type);
      const detailEl = document.createElement("span");
      detailEl.className = "activity-detail";
      detailEl.textContent = activity.courseName ?? (activity.strokeCount === null ? "" : `${activity.strokeCount} shots`);
      if (detailEl.textContent) {
        detailEl.title = detailEl.textContent;
      }
      mainEl.append(typeEl, detailEl);
      const importBtn = document.createElement("button");
      importBtn.className = "activity-import-btn";
      importBtn.textContent = "Import";
      importBtn.addEventListener("click", () => {
        importPortalActivityFromTab(tabId, activity.id, importBtn);
      });
      row.append(selectBox, dateEl, mainEl, importBtn);
      fragment.appendChild(row);
    }
    list.appendChild(fragment);
    updateBulkSelectedCount();
    void hydrateBulkImportJobControls();
  }
  async function checkActiveTabForActivity() {
    const detected = document.getElementById("portal-activity-detected");
    const noActivity = document.getElementById("portal-no-activity");
    const browser = document.getElementById("portal-activity-browser");
    if (!detected || !noActivity) return;
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const match = tab?.url?.match(PORTAL_ACTIVITY_PATTERN);
      if (match && tab.id) {
        const activityId = match[1];
        const tabId = tab.id;
        detected.style.display = "";
        noActivity.style.display = "none";
        if (browser) browser.style.display = "none";
        const importBtn = document.getElementById("portal-import-btn");
        if (importBtn) {
          importBtn.addEventListener("click", async () => {
            await importPortalActivityFromTab(tabId, activityId, importBtn);
          });
        }
      } else if (tab?.url?.match(PORTAL_ACTIVITIES_LIST_PATTERN) && tab.id) {
        detected.style.display = "none";
        noActivity.style.display = "none";
        if (browser) {
          browser.style.display = "block";
          const list = document.getElementById("portal-activity-list");
          if (list) list.innerHTML = `<div class="activity-loading">Loading activities...</div>`;
        }
        const activities = await fetchPortalActivities(tab.id);
        renderPortalActivityBrowser(activities, tab.id);
      } else {
        detected.style.display = "none";
        noActivity.style.display = "";
        if (browser) browser.style.display = "none";
      }
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : "Unable to fetch activities";
      const formattedMessage = formatPortalFetchError(message);
      detected.style.display = "none";
      noActivity.style.display = "none";
      if (browser) {
        browser.style.display = "block";
        const list = document.getElementById("portal-activity-list");
        if (list) list.innerHTML = `<div class="activity-list-empty">${escapeHtml(formattedMessage)}</div>`;
      }
      showToast(formattedMessage, "error");
    }
  }
  function renderStatCard() {
    const container = document.getElementById("stat-card");
    if (!container) return;
    const hasData = cachedData?.club_groups && cachedData.club_groups.length > 0;
    container.style.display = hasData ? "" : "none";
    if (!hasData) return;
    const unitSystem = getApiSourceUnitSystem(cachedData.metadata_params);
    const contentEl = document.getElementById("stat-card-content");
    const carryHeader = `Carry(${DISTANCE_LABELS[cachedUnitChoice.distance]})`;
    const speedHeader = `Speed(${SPEED_LABELS[cachedUnitChoice.speed]})`;
    let html = `<div class="stat-card-row stat-card-header">
    <span>Club</span>
    <span>Shots</span>
    <span>${carryHeader}</span>
    <span>${speedHeader}</span>
  </div>`;
    for (const club of cachedData.club_groups) {
      const shotCount = club.shots.length;
      const rawCarry = computeClubAverage(club.shots, "Carry");
      const rawSpeed = computeClubAverage(club.shots, "ClubSpeed");
      const carry = rawCarry !== null ? String(normalizeMetricValue(rawCarry, "Carry", unitSystem, cachedUnitChoice)) : "\u2014";
      const speed = rawSpeed !== null ? String(normalizeMetricValue(rawSpeed, "ClubSpeed", unitSystem, cachedUnitChoice)) : "\u2014";
      html += `<div class="stat-card-row">
      <span class="stat-card-club">${escapeHtml(club.club_name)}</span>
      <span class="stat-card-value">${shotCount}</span>
      <span class="stat-card-value">${carry}</span>
      <span class="stat-card-value">${speed}</span>
    </div>`;
    }
    contentEl.innerHTML = html;
  }
  async function renderPromptSelect(select) {
    const customPrompts = await loadCustomPrompts();
    cachedCustomPrompts = customPrompts;
    select.innerHTML = "";
    if (customPrompts.length > 0) {
      const myGroup = document.createElement("optgroup");
      myGroup.label = "My Prompts";
      for (const cp of customPrompts) {
        const opt = document.createElement("option");
        opt.value = cp.id;
        opt.textContent = cp.name;
        myGroup.appendChild(opt);
      }
      select.appendChild(myGroup);
    }
    const tiers = [
      { label: "Beginner", value: "beginner" },
      { label: "Intermediate", value: "intermediate" },
      { label: "Advanced", value: "advanced" }
    ];
    for (const tier of tiers) {
      const group = document.createElement("optgroup");
      group.label = tier.label;
      for (const p of BUILTIN_PROMPTS.filter((b) => b.tier === tier.value)) {
        const opt = document.createElement("option");
        opt.value = p.id;
        opt.textContent = p.name;
        group.appendChild(opt);
      }
      select.appendChild(group);
    }
  }
  function findPromptById(id) {
    const builtIn = BUILTIN_PROMPTS.find((p) => p.id === id);
    if (builtIn) return builtIn;
    return cachedCustomPrompts.find((p) => p.id === id);
  }
  function updatePreview() {
    const previewEl = document.getElementById("prompt-preview-content");
    const promptSelect = document.getElementById("prompt-select");
    if (!previewEl || !promptSelect) return;
    if (!cachedData) {
      previewEl.textContent = "(No shot data captured yet)";
      return;
    }
    const prompt = findPromptById(promptSelect.value);
    if (!prompt) {
      previewEl.textContent = "";
      return;
    }
    const tsvData = writeTsv(cachedData, cachedUnitChoice, cachedSurface);
    const metadata = {
      date: cachedData.date,
      shotCount: countSessionShots(cachedData),
      unitLabel: buildUnitLabel(cachedUnitChoice),
      hittingSurface: cachedSurface
    };
    previewEl.textContent = assemblePrompt(prompt, tsvData, metadata);
  }
  function showImportStatus(status) {
    if (status.state === "success") {
      showToast("Session imported successfully", "success");
    } else if (status.state === "error") {
      showToast(status.message, "error");
    } else if (status.state === "importing") {
      showToast("Importing session...", "success");
    }
  }
  function renderPortalSection(state, errorMsg) {
    const section = document.getElementById("portal-section");
    const denied = document.getElementById("portal-denied");
    const notLoggedIn = document.getElementById("portal-not-logged-in");
    const ready = document.getElementById("portal-ready");
    const errorDiv = document.getElementById("portal-error");
    if (!section || !denied || !notLoggedIn || !ready || !errorDiv) return;
    section.style.display = "block";
    denied.style.display = state === "denied" ? "block" : "none";
    notLoggedIn.style.display = state === "not-logged-in" ? "block" : "none";
    ready.style.display = state === "ready" ? "block" : "none";
    errorDiv.style.display = state === "error" ? "block" : "none";
    if (state === "error" && errorMsg) {
      const errorMsgEl = document.getElementById("portal-error-msg");
      if (errorMsgEl) errorMsgEl.textContent = errorMsg;
    }
  }
  document.addEventListener("DOMContentLoaded", async () => {
    console.log("TrackPull popup initialized");
    try {
      const result = await new Promise((resolve) => {
        chrome.storage.local.get([STORAGE_KEYS.TRACKMAN_DATA], resolve);
      });
      const data = result[STORAGE_KEYS.TRACKMAN_DATA];
      console.log("Popup loaded data:", data ? "has data" : "no data");
      cachedData = data ?? null;
      updateShotCount(data);
      updateExportButtonVisibility(data);
      const statusResult = await new Promise((resolve) => {
        chrome.storage.local.get([STORAGE_KEYS.IMPORT_STATUS], resolve);
      });
      const importStatus = statusResult[STORAGE_KEYS.IMPORT_STATUS];
      if (importStatus && importStatus.state !== "idle") {
        showImportStatus(importStatus);
        if (importStatus.state === "success" || importStatus.state === "error") {
          chrome.storage.local.remove(STORAGE_KEYS.IMPORT_STATUS);
        }
      }
      const unitResult = await new Promise((resolve) => {
        chrome.storage.local.get([STORAGE_KEYS.SPEED_UNIT, STORAGE_KEYS.DISTANCE_UNIT, STORAGE_KEYS.HITTING_SURFACE, STORAGE_KEYS.INCLUDE_AVERAGES, "unitPreference"], resolve);
      });
      let speedUnit = unitResult[STORAGE_KEYS.SPEED_UNIT];
      let distanceUnit = unitResult[STORAGE_KEYS.DISTANCE_UNIT];
      if (!speedUnit || !distanceUnit) {
        const migrated = migrateLegacyPref(unitResult["unitPreference"]);
        speedUnit = migrated.speed;
        distanceUnit = migrated.distance;
        chrome.storage.local.set({
          [STORAGE_KEYS.SPEED_UNIT]: speedUnit,
          [STORAGE_KEYS.DISTANCE_UNIT]: distanceUnit
        });
        chrome.storage.local.remove("unitPreference");
      }
      cachedUnitChoice = {
        speed: speedUnit,
        distance: distanceUnit
      };
      const surface = unitResult[STORAGE_KEYS.HITTING_SURFACE] ?? "Mat";
      cachedSurface = surface;
      const speedSelect = document.getElementById("speed-unit");
      const distanceSelect = document.getElementById("distance-unit");
      if (speedSelect) {
        speedSelect.value = speedUnit;
        speedSelect.addEventListener("change", () => {
          chrome.storage.local.set({ [STORAGE_KEYS.SPEED_UNIT]: speedSelect.value });
          cachedUnitChoice = { ...cachedUnitChoice, speed: speedSelect.value };
          renderStatCard();
        });
      }
      if (distanceSelect) {
        distanceSelect.value = distanceUnit;
        distanceSelect.addEventListener("change", () => {
          chrome.storage.local.set({ [STORAGE_KEYS.DISTANCE_UNIT]: distanceSelect.value });
          cachedUnitChoice = { ...cachedUnitChoice, distance: distanceSelect.value };
          renderStatCard();
        });
      }
      const surfaceSelect = document.getElementById("surface-select");
      if (surfaceSelect) {
        surfaceSelect.value = surface;
        surfaceSelect.addEventListener("change", () => {
          chrome.storage.local.set({ [STORAGE_KEYS.HITTING_SURFACE]: surfaceSelect.value });
          cachedSurface = surfaceSelect.value;
        });
      }
      const includeAveragesCheckbox = document.getElementById("include-averages-checkbox");
      if (includeAveragesCheckbox) {
        const stored = unitResult[STORAGE_KEYS.INCLUDE_AVERAGES];
        includeAveragesCheckbox.checked = stored === void 0 ? true : Boolean(stored);
        includeAveragesCheckbox.addEventListener("change", () => {
          chrome.storage.local.set({ [STORAGE_KEYS.INCLUDE_AVERAGES]: includeAveragesCheckbox.checked });
        });
      }
      chrome.runtime.onMessage.addListener((message) => {
        if (message.type === "DATA_UPDATED") {
          cachedData = message.data ?? null;
          updateShotCount(message.data);
          updateExportButtonVisibility(message.data);
          updatePreview();
          renderStatCard();
        }
        if (message.type === "HISTORY_ERROR") {
          showToast(message.error, "error");
        }
      });
      chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === "local" && changes[STORAGE_KEYS.IMPORT_STATUS]) {
          const newStatus = changes[STORAGE_KEYS.IMPORT_STATUS].newValue;
          if (newStatus && newStatus.state !== "idle") {
            showImportStatus(newStatus);
            if (newStatus.state === "success" || newStatus.state === "error") {
              chrome.storage.local.remove(STORAGE_KEYS.IMPORT_STATUS);
            }
          }
        }
        if (namespace === "local" && changes[STORAGE_KEYS.BULK_IMPORT_STATUS]) {
          const newJob = changes[STORAGE_KEYS.BULK_IMPORT_STATUS].newValue;
          renderBulkImportJob(newJob ?? null);
        }
      });
      const exportBtn = document.getElementById("export-btn");
      if (exportBtn) {
        exportBtn.addEventListener("click", handleExportClick);
      }
      const clearBtn = document.getElementById("clear-btn");
      if (clearBtn) {
        clearBtn.addEventListener("click", handleClearClick);
      }
      const settingsBtn = document.getElementById("settings-btn");
      if (settingsBtn) {
        settingsBtn.addEventListener("click", () => {
          chrome.runtime.openOptionsPage();
        });
      }
      const promptSelect = document.getElementById("prompt-select");
      if (promptSelect) {
        await renderPromptSelect(promptSelect);
        const promptResult = await new Promise((resolve) => {
          chrome.storage.local.get([STORAGE_KEYS.SELECTED_PROMPT_ID], resolve);
        });
        const savedPromptId = promptResult[STORAGE_KEYS.SELECTED_PROMPT_ID];
        if (savedPromptId) {
          promptSelect.value = savedPromptId;
          if (promptSelect.value !== savedPromptId) {
            promptSelect.value = "quick-summary-beginner";
            chrome.storage.local.set({ [STORAGE_KEYS.SELECTED_PROMPT_ID]: "quick-summary-beginner" });
          }
        }
        promptSelect.addEventListener("change", () => {
          chrome.storage.local.set({ [STORAGE_KEYS.SELECTED_PROMPT_ID]: promptSelect.value });
          updatePreview();
        });
      }
      const aiServiceSelect = document.getElementById("ai-service-select");
      if (aiServiceSelect) {
        const syncResult = await new Promise((resolve) => {
          chrome.storage.sync.get([STORAGE_KEYS.AI_SERVICE], resolve);
        });
        const savedService = syncResult[STORAGE_KEYS.AI_SERVICE];
        if (savedService) {
          aiServiceSelect.value = savedService;
        }
        aiServiceSelect.addEventListener("change", () => {
          chrome.storage.sync.set({ [STORAGE_KEYS.AI_SERVICE]: aiServiceSelect.value });
          updatePreview();
        });
      }
      updatePreview();
      renderStatCard();
      const portalGranted = await hasPortalPermission();
      if (portalGranted) {
        renderPortalSection("ready");
        checkActiveTabForActivity();
      } else {
        renderPortalSection("denied");
      }
      const portalGrantBtn = document.getElementById("portal-grant-btn");
      if (portalGrantBtn) {
        portalGrantBtn.addEventListener("click", async () => {
          const granted = await requestPortalPermission();
          renderPortalSection(granted ? "ready" : "denied");
          if (granted) {
            checkActiveTabForActivity();
          }
        });
      }
      const portalLoginLink = document.getElementById("portal-login-link");
      if (portalLoginLink) {
        portalLoginLink.addEventListener("click", (e) => {
          e.preventDefault();
          chrome.tabs.create({ url: "https://portal.trackmangolf.com" });
        });
      }
      const portalOpenLink = document.getElementById("portal-open-link");
      if (portalOpenLink) {
        portalOpenLink.addEventListener("click", (e) => {
          e.preventDefault();
          chrome.tabs.create({ url: "https://portal.trackmangolf.com" });
        });
      }
      chrome.permissions.onAdded.addListener((permissions) => {
        const portalOriginsGranted = PORTAL_ORIGINS.some(
          (origin) => permissions.origins?.includes(origin)
        );
        if (portalOriginsGranted) {
          renderPortalSection("ready");
          checkActiveTabForActivity();
        }
      });
      chrome.permissions.onRemoved.addListener((permissions) => {
        const portalOriginsRemoved = PORTAL_ORIGINS.some(
          (origin) => permissions.origins?.includes(origin)
        );
        if (portalOriginsRemoved) {
          renderPortalSection("denied");
        }
      });
      const copyTsvBtn = document.getElementById("copy-tsv-btn");
      if (copyTsvBtn) {
        copyTsvBtn.addEventListener("click", async () => {
          if (!cachedData) return;
          const tsvText = writeTsv(cachedData, cachedUnitChoice, cachedSurface);
          try {
            await navigator.clipboard.writeText(tsvText);
            showToast("Shot data copied!", "success");
          } catch (err) {
            console.error("Clipboard write failed:", err);
            showToast("Failed to copy data", "error");
          }
        });
      }
      const openAiBtn = document.getElementById("open-ai-btn");
      if (openAiBtn) {
        openAiBtn.addEventListener("click", async () => {
          if (!cachedData || !promptSelect || !aiServiceSelect) return;
          const selectedPromptId = promptSelect.value;
          const selectedService = aiServiceSelect.value;
          const prompt = findPromptById(selectedPromptId);
          if (!prompt) return;
          const tsvData = writeTsv(cachedData, cachedUnitChoice, cachedSurface);
          const metadata = {
            date: cachedData.date,
            shotCount: countSessionShots(cachedData),
            unitLabel: buildUnitLabel(cachedUnitChoice),
            hittingSurface: cachedSurface
          };
          const assembled = assemblePrompt(prompt, tsvData, metadata);
          try {
            await navigator.clipboard.writeText(assembled);
            chrome.tabs.create({ url: AI_URLS[selectedService] });
            showToast(`Prompt + data copied \u2014 paste into ${selectedService}`, "success");
          } catch (err) {
            console.error("AI launch failed:", err);
            showToast("Failed to copy prompt", "error");
          }
        });
      }
      const copyPromptBtn = document.getElementById("copy-prompt-btn");
      if (copyPromptBtn) {
        copyPromptBtn.addEventListener("click", async () => {
          if (!cachedData || !promptSelect) return;
          const selectedPromptId = promptSelect.value;
          const prompt = findPromptById(selectedPromptId);
          if (!prompt) return;
          const tsvData = writeTsv(cachedData, cachedUnitChoice, cachedSurface);
          const metadata = {
            date: cachedData.date,
            shotCount: countSessionShots(cachedData),
            unitLabel: buildUnitLabel(cachedUnitChoice),
            hittingSurface: cachedSurface
          };
          const assembled = assemblePrompt(prompt, tsvData, metadata);
          try {
            await navigator.clipboard.writeText(assembled);
            showToast("Prompt + data copied!", "success");
          } catch (err) {
            console.error("Clipboard write failed:", err);
            showToast("Failed to copy prompt", "error");
          }
        });
      }
    } catch (error) {
      console.error("Error loading popup data:", error);
      showToast("Error loading shot count", "error");
    }
  });
  function updateShotCount(data) {
    const container = document.getElementById("shot-count-container");
    const shotCountElement = document.getElementById("shot-count");
    if (!container || !shotCountElement) return;
    if (!data || typeof data !== "object") {
      container.classList.add("empty-state");
      return;
    }
    const sessionData = data;
    const clubGroups = sessionData["club_groups"];
    if (!clubGroups || !Array.isArray(clubGroups)) {
      container.classList.add("empty-state");
      return;
    }
    let totalShots = 0;
    for (const club of clubGroups) {
      const shots = club["shots"];
      if (shots && Array.isArray(shots)) {
        totalShots += shots.length;
      }
    }
    container.classList.remove("empty-state");
    shotCountElement.textContent = totalShots.toString();
  }
  function updateExportButtonVisibility(data) {
    const exportRow = document.getElementById("export-row");
    const aiSection = document.getElementById("ai-section");
    const clearBtn = document.getElementById("clear-btn");
    const hasValidData = data && typeof data === "object" && data["club_groups"];
    if (exportRow) exportRow.style.display = hasValidData ? "flex" : "none";
    if (aiSection) aiSection.style.display = hasValidData ? "block" : "none";
    if (clearBtn) clearBtn.style.display = hasValidData ? "block" : "none";
  }
  async function handleExportClick() {
    const exportBtn = document.getElementById("export-btn");
    if (!exportBtn) return;
    showStatusMessage("Preparing CSV...", false);
    exportBtn.disabled = true;
    try {
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: "EXPORT_CSV_REQUEST" }, (resp) => {
          resolve(resp || { success: false, error: "No response from service worker" });
        });
      });
      if (response.success) {
        showToast(`Exported successfully: ${response.filename || "ShotData.csv"}`, "success");
      } else {
        showToast(response.error || "Export failed", "error");
      }
    } catch (error) {
      console.error("Error during export:", error);
      showToast("Export failed", "error");
    } finally {
      exportBtn.disabled = false;
    }
  }
  function showToast(message, type) {
    const container = document.getElementById("toast-container");
    if (!container) return;
    const existingToast = container.querySelector(".toast");
    if (existingToast) {
      existingToast.remove();
    }
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toast.setAttribute("role", type === "error" ? "alert" : "status");
    container.appendChild(toast);
    setTimeout(() => {
      if (toast.parentNode) {
        toast.classList.add("hiding");
        setTimeout(() => {
          toast.remove();
        }, 300);
      }
    }, type === "error" ? 5e3 : 3e3);
  }
  function showStatusMessage(message, isError = false) {
    const statusElement = document.getElementById("status-message");
    if (!statusElement) return;
    statusElement.textContent = message;
    statusElement.classList.remove("status-error", "status-success");
    statusElement.classList.add(isError ? "status-error" : "status-success");
  }
  async function handleClearClick() {
    const clearBtn = document.getElementById("clear-btn");
    if (!clearBtn) return;
    showStatusMessage("Clearing session data...", false);
    clearBtn.disabled = true;
    try {
      await new Promise((resolve, reject) => {
        chrome.storage.local.remove(STORAGE_KEYS.TRACKMAN_DATA, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      });
      cachedData = null;
      updateShotCount(null);
      updateExportButtonVisibility(null);
      renderStatCard();
      showToast("Session data cleared", "success");
    } catch (error) {
      console.error("Error clearing session data:", error);
      showToast("Failed to clear data", "error");
    } finally {
      clearBtn.disabled = false;
    }
  }
})();
