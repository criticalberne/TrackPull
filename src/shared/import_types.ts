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
 * Fetch recent activities. Per D-06: page size 20 matches MAX_SESSIONS history cap.
 * Query shape follows Relay connection convention. If the Trackman schema uses
 * a different root field, the handler will surface the GraphQL error for adjustment.
 */
export const FETCH_ACTIVITIES_QUERY = `
  query FetchActivities($first: Int!) {
    activities(first: $first) {
      edges {
        node {
          id
          date
          strokeCount
          type
        }
      }
    }
  }
`;

/**
 * Fetch a single activity by ID with full stroke data.
 * The node(id:) query on base64-encoded SessionActivity IDs was confirmed
 * working during Phase 22 research.
 */
export const IMPORT_SESSION_QUERY = `
  query FetchActivityById($id: ID!) {
    node(id: $id) {
      ... on SessionActivity {
        id
        date
        strokeGroups {
          club
          strokes {
            id
            measurement {
              clubSpeed ballSpeed smashFactor attackAngle clubPath faceAngle
              faceToPath swingDirection dynamicLoft spinRate spinAxis spinLoft
              launchAngle launchDirection carry total side sideTotal carrySide
              totalSide height maxHeight curve landingAngle hangTime
              lowPointDistance impactHeight impactOffset tempo
            }
          }
        }
      }
    }
  }
`;
