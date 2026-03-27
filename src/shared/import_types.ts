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
}

/**
 * Fetch recent activities via me.activities.
 * API field names: time (ISO date), kind (activity type), strokeCount.
 * Service worker maps time→date, kind→type for ActivitySummary.
 */
export const FETCH_ACTIVITIES_QUERY = `
  query GetPlayerActivities {
    me {
      activities {
        id
        time
        strokeCount
        kind
      }
    }
  }
`;

/**
 * Fetch a single activity by ID with full stroke data.
 * The node(id:) query on base64-encoded SessionActivity IDs was confirmed
 * working during Phase 22 research.
 * API uses flat strokes (each stroke has its own club field).
 */
/**
 * Fragment for stroke measurement fields shared across all activity types.
 */
const STROKE_FIELDS = `
  club
  time
  targetDistance
  measurement {
    clubSpeed ballSpeed smashFactor attackAngle clubPath faceAngle
    faceToPath swingDirection swingPlane dynamicLoft spinRate spinAxis spinLoft
    launchAngle launchDirection carry total carrySide totalSide
    maxHeight landingAngle hangTime
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
    }
  }
`;
