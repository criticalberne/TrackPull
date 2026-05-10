export const PORTAL_GRAPHQL_ENDPOINT = "https://api.trackmangolf.com/graphql";

export const PORTAL_GRAPHQL_REQUEST_SOURCE = "trackpull-portal-isolated";
export const PORTAL_GRAPHQL_RESPONSE_SOURCE = "trackpull-portal-main";
export const PORTAL_GRAPHQL_REQUEST_TYPE = "TRACKPULL_PORTAL_GRAPHQL_REQUEST";
export const PORTAL_GRAPHQL_RESPONSE_TYPE = "TRACKPULL_PORTAL_GRAPHQL_RESPONSE";

export interface PortalGraphQLRequestMessage {
  source: typeof PORTAL_GRAPHQL_REQUEST_SOURCE;
  type: typeof PORTAL_GRAPHQL_REQUEST_TYPE;
  requestId: string;
  query: string;
  variables?: Record<string, unknown>;
}

export interface PortalGraphQLResponseMessage {
  source: typeof PORTAL_GRAPHQL_RESPONSE_SOURCE;
  type: typeof PORTAL_GRAPHQL_RESPONSE_TYPE;
  requestId: string;
  success: boolean;
  data?: unknown;
  error?: string;
}
