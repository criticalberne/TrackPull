/**
 * GraphQL client for Trackman API.
 * Sends authenticated requests using browser session cookies (credentials: include).
 * Shared by service worker and popup.
 */

export const GRAPHQL_ENDPOINT = "https://api.trackmangolf.com/graphql";

export const HEALTH_CHECK_QUERY = `query HealthCheck { me { __typename } }`;

/** Standard GraphQL response envelope. */
export interface GraphQLResponse<T> {
  data: T | null;
  errors?: Array<{
    message: string;
    extensions?: { code?: string };
  }>;
}

/** Auth classification result returned by classifyAuthResult. */
export type AuthStatus =
  | { kind: "authenticated" }
  | { kind: "unauthenticated" }
  | { kind: "error"; message: string };

/**
 * Executes a GraphQL query against the Trackman API.
 * Uses credentials: "include" so the browser sends existing session cookies.
 * Throws if the HTTP response is not 2xx.
 */
export async function executeQuery<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<GraphQLResponse<T>> {
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "(no body)");
    console.error(`TrackPull: GraphQL ${response.status} response:`, body);
    throw new Error(`HTTP ${response.status}: ${body.slice(0, 200)}`);
  }

  return response.json() as Promise<GraphQLResponse<T>>;
}

/**
 * Classifies a GraphQL response from the health-check query into an AuthStatus.
 *
 * Classification priority:
 * 1. Errors present and non-empty → check for auth error patterns → else generic error
 * 2. No errors but data.me is falsy → unauthenticated
 * 3. data.me is truthy (has __typename) → authenticated
 */
export function classifyAuthResult(
  result: GraphQLResponse<{ me: { __typename: string } | null }>
): AuthStatus {
  if (result.errors && result.errors.length > 0) {
    const code = result.errors[0].extensions?.code ?? "";
    const msg = result.errors[0].message ?? "";
    const msgLower = msg.toLowerCase();

    if (
      code === "UNAUTHENTICATED" ||
      msgLower.includes("unauthorized") ||
      msgLower.includes("unauthenticated") ||
      msgLower.includes("not logged in")
    ) {
      return { kind: "unauthenticated" };
    }

    return { kind: "error", message: "Unable to reach Trackman — try again later" };
  }

  if (!result.data?.me?.__typename) {
    return { kind: "unauthenticated" };
  }

  return { kind: "authenticated" };
}
