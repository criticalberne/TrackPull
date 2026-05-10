/**
 * Import status types and GraphQL queries for portal session import.
 * Per D-01: simple result-only status — idle/importing/success/error.
 */

/** Import status stored in chrome.storage.local under STORAGE_KEYS.IMPORT_STATUS. Per D-01. */
export type ImportStatus =
  | { state: "idle" }
  | { state: "importing" }
  | { state: "success" }
  | { state: "error"; message: string };

/** Activity summary returned by FETCH_ACTIVITIES handler. */
export interface ActivitySummary {
  id: string;
  date: string;
  strokeCount: number | null;  // null if field unavailable from API
  type: string | null;         // null if field unavailable from API
  courseName?: string | null;  // Course.displayName when available
}

export interface ImportSessionQueryCandidate {
  label: string;
  query: string;
}

export interface FetchActivitiesQueryCandidate {
  label: string;
  query: string;
  paginated?: boolean;
}

export const FETCH_ACTIVITIES_PAGE_SIZE = 100;
export const FETCH_ACTIVITIES_MAX_PAGES = 100;

const ACTIVITY_SUMMARY_FIELDS = `
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

const ACTIVITY_COURSE_SUMMARY_FIELDS = `
  id
  time
  __typename
  ... on CoursePlayActivity {
    course {
      displayName
    }
  }
`;

const ACTIVITY_MINIMAL_TIME_FIELDS = `
  id
  time
  __typename
`;

const ACTIVITY_MINIMAL_DATE_FIELDS = `
  id
  date
  __typename
`;

/**
 * Fetch Course Play and Map My Bag activities via me.activities. The live API
 * returns a collection segment, so activity fields are under items.
 */
export const FETCH_ACTIVITIES_QUERY = `
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

/**
 * Trackman's live portal exposes the user's activity list under me.activities.
 * Avoid broader root-level activity queries because they can fail authorization.
 */
export const FETCH_ACTIVITIES_QUERY_CANDIDATES: FetchActivitiesQueryCandidate[] = [
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
    `,
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
    `,
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
    `,
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
    `,
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
    `,
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
    `,
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
    `,
  },
];

const SUPPORTED_ACTIVITY_TYPES = new Set([
  "CoursePlayActivity",
  "CourseSessionActivity",
  "COURSE_PLAY",
  "MapMyBagActivity",
  "MapMyBagSessionActivity",
  "BagMappingActivity",
  "MAP_MY_BAG",
]);

export function isSupportedPortalActivityType(type: string | null): boolean {
  return type !== null && SUPPORTED_ACTIVITY_TYPES.has(type);
}

function getActivityType(record: Record<string, unknown>): string | null {
  if (typeof record.__typename === "string") return record.__typename;
  if (typeof record.type === "string") return record.type;
  if (typeof record.kind === "string") return record.kind;
  return null;
}

function getCourseName(record: Record<string, unknown>): string | null {
  const course = record.course;
  if (!course || typeof course !== "object") return null;
  const courseRecord = course as Record<string, unknown>;
  if (typeof courseRecord.displayName === "string" && courseRecord.displayName.trim()) {
    return courseRecord.displayName;
  }
  if (typeof courseRecord.name === "string" && courseRecord.name.trim()) {
    return courseRecord.name;
  }
  return null;
}

function normalizeActivityRecord(value: unknown): ActivitySummary | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.id !== "string") return null;

  const rawDate = record.time ?? record.date;
  const rawType = getActivityType(record);
  const rawKind = typeof record.kind === "string" ? record.kind : null;
  const type = isSupportedPortalActivityType(rawType)
    ? rawType
    : isSupportedPortalActivityType(rawKind)
      ? rawKind
      : null;
  if (!type) return null;

  return {
    id: record.id,
    date: typeof rawDate === "string" ? rawDate : "",
    strokeCount: typeof record.strokeCount === "number" ? record.strokeCount : null,
    type,
    courseName: getCourseName(record),
  };
}

export interface ActivitySummaryPage {
  activities: ActivitySummary[];
  itemCount: number;
  totalCount: number | null;
  hasNextPage: boolean | null;
}

export function normalizeActivitySummaryPage(data: unknown): ActivitySummaryPage {
  const emptyPage: ActivitySummaryPage = {
    activities: [],
    itemCount: 0,
    totalCount: null,
    hasNextPage: null,
  };
  if (!data || typeof data !== "object") return emptyPage;
  const record = data as Record<string, unknown>;
  const me = record.me && typeof record.me === "object"
    ? record.me as Record<string, unknown>
    : undefined;
  const roots = [me?.activities, record.activities];

  for (const root of roots) {
    let candidates: unknown[] = [];
    let totalCount: number | null = null;
    let hasNextPage: boolean | null = null;
    if (Array.isArray(root)) {
      candidates = root;
    } else if (root && typeof root === "object") {
      const rootRecord = root as Record<string, unknown>;
      totalCount = typeof rootRecord.totalCount === "number" ? rootRecord.totalCount : null;
      const pageInfo = rootRecord.pageInfo;
      if (pageInfo && typeof pageInfo === "object") {
        const pageInfoRecord = pageInfo as Record<string, unknown>;
        hasNextPage = typeof pageInfoRecord.hasNextPage === "boolean"
          ? pageInfoRecord.hasNextPage
          : null;
      }
      if (Array.isArray(rootRecord.items)) {
        candidates = rootRecord.items;
      } else if (Array.isArray(rootRecord.nodes)) {
        candidates = rootRecord.nodes;
      } else if (Array.isArray(rootRecord.edges)) {
        candidates = rootRecord.edges.map((edge) => (
          edge && typeof edge === "object"
            ? (edge as Record<string, unknown>).node
            : null
        ));
      }
    }

    const activities = candidates
      .map(normalizeActivityRecord)
      .filter((activity): activity is ActivitySummary => Boolean(activity));
    if (candidates.length > 0 || totalCount !== null || hasNextPage !== null) {
      return {
        activities,
        itemCount: candidates.length,
        totalCount,
        hasNextPage,
      };
    }
  }

  return emptyPage;
}

export function normalizeActivitySummaries(data: unknown): ActivitySummary[] {
  return normalizeActivitySummaryPage(data).activities;
}

/**
 * Fetch a single activity by ID with full stroke data.
 * The node(id:) query on base64-encoded SessionActivity IDs was confirmed
 * working during Phase 22 research.
 * API uses flat strokes (each stroke has its own club field).
 */
/**
 * Fragment for stroke measurement fields shared across all activity types.
 * Note: isDeleted/isSimulated only exist on RangeFindMyDistanceActivity strokes,
 * not on the Stroke type used by SessionActivity and friends.
 */
const STROKE_MEASUREMENT_FIELDS = `
  clubSpeed ballSpeed smashFactor attackAngle clubPath faceAngle
  faceToPath swingDirection swingPlane dynamicLoft spinRate spinAxis spinLoft
  launchAngle launchDirection carry total carrySide totalSide
  maxHeight landingAngle hangTime
`;

const SCORECARD_SHOT_MEASUREMENT_FIELDS = `
  ballSpeed carrySideActual carryActual launchDirection maxHeight carry total
  carrySide launchAngle spinRate spinAxis backswingTime forwardswingTime tempo
  strokeLength dynamicLie impactOffset impactHeight skidDistance rollPercentage
  rollSpeed speedDrop rollDeceleration effectiveStimp flatStimp break bounces
  entrySpeedDistance elevation slopePercentageSide slopePercentageRise
  totalBreak attackAngle clubPath clubSpeed dynamicLoft faceAngle faceToPath
  smashFactor gyroSpinAngle spinLoft swingDirection swingPlane swingRadius
`;

const STROKE_FIELDS = `
  club
  time
  targetDistance
  measurement {
    ${STROKE_MEASUREMENT_FIELDS}
  }
`;

export const IMPORT_SESSION_QUERY = `
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

function flatStrokeActivityQuery(typeName: string): ImportSessionQueryCandidate {
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
    `,
  };
}

function groupedStrokeActivityQuery(typeName: string): ImportSessionQueryCandidate {
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
    `,
  };
}

function proBallActivityQuery(typeName: string): ImportSessionQueryCandidate {
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
    `,
  };
}

function groupedProBallActivityQuery(typeName: string): ImportSessionQueryCandidate {
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
    `,
  };
}

function scorecardShotActivityQuery(
  typeName: string,
  measurementKind: "NORMALIZED_MEASUREMENT" | "MEASUREMENT" | "PRO_BALL_MEASUREMENT"
): ImportSessionQueryCandidate {
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
    `,
  };
}

/**
 * Additional activity-specific queries tried only after the stable base query
 * does not produce parsable shots. Each candidate contains one inline fragment
 * so an unknown Trackman type only invalidates that candidate, not the whole
 * import flow.
 */
export const IMPORT_SESSION_FALLBACK_QUERIES: ImportSessionQueryCandidate[] = [
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
  groupedProBallActivityQuery("MapMyBagSessionActivity"),
];

export const IMPORT_SESSION_QUERY_CANDIDATES: ImportSessionQueryCandidate[] = [
  { label: "default", query: IMPORT_SESSION_QUERY },
  ...IMPORT_SESSION_FALLBACK_QUERIES,
];
