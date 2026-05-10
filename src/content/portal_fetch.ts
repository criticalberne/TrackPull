/**
 * Content script for portal.trackmangolf.com.
 * Proxies GraphQL requests from the extension through the page-context bridge.
 * Falls back to an isolated-world fetch with browser credentials and any
 * discoverable bearer token when the MAIN-world bridge is unavailable.
 */

import { findTrackmanAuthTokenFromStorage } from "./portal_auth";
import {
  PORTAL_GRAPHQL_ENDPOINT,
  PORTAL_GRAPHQL_REQUEST_SOURCE,
  PORTAL_GRAPHQL_REQUEST_TYPE,
  PORTAL_GRAPHQL_RESPONSE_SOURCE,
  PORTAL_GRAPHQL_RESPONSE_TYPE,
  type PortalGraphQLRequestMessage,
  type PortalGraphQLResponseMessage,
} from "./portal_bridge_protocol";

export { findTrackmanAuthTokenFromStorage } from "./portal_auth";

const MAIN_WORLD_TIMEOUT_MS = 15000;
let nextRequestId = 0;

function buildGraphQLHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = findTrackmanAuthTokenFromStorage(window.localStorage, window.sessionStorage);
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function fetchGraphQLFromIsolatedWorld(
  query: string,
  variables?: Record<string, unknown>
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const response = await fetch(PORTAL_GRAPHQL_ENDPOINT, {
    method: "POST",
    credentials: "include",
    headers: buildGraphQLHeaders(),
    body: JSON.stringify({ query, variables }),
  });

  return { success: true, data: await response.json() };
}

function fetchGraphQLFromMainWorld(
  query: string,
  variables?: Record<string, unknown>
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const requestId = `trackpull-portal-${Date.now()}-${nextRequestId += 1}`;
  const request: PortalGraphQLRequestMessage = {
    source: PORTAL_GRAPHQL_REQUEST_SOURCE,
    type: PORTAL_GRAPHQL_REQUEST_TYPE,
    requestId,
    query,
    variables,
  };

  return new Promise((resolve) => {
    let settled = false;
    const cleanup = (): void => {
      window.removeEventListener("message", onMessage);
      clearTimeout(timeoutId);
    };
    const settle = (response: { success: boolean; data?: unknown; error?: string }): void => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(response);
    };
    const onMessage = (event: MessageEvent): void => {
      if (event.source !== window) return;
      const data = event.data as Partial<PortalGraphQLResponseMessage> | undefined;
      if (!data || data.source !== PORTAL_GRAPHQL_RESPONSE_SOURCE) return;
      if (data.type !== PORTAL_GRAPHQL_RESPONSE_TYPE || data.requestId !== requestId) return;
      settle({
        success: Boolean(data.success),
        data: data.data,
        error: typeof data.error === "string" ? data.error : undefined,
      });
    };
    const timeoutId = window.setTimeout(() => {
      settle({ success: false, error: "Portal page bridge timed out" });
    }, MAIN_WORLD_TIMEOUT_MS);

    window.addEventListener("message", onMessage);
    window.postMessage(request, window.location.origin);
  });
}

async function fetchGraphQL(
  query: string,
  variables?: Record<string, unknown>
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const mainWorldResponse = await fetchGraphQLFromMainWorld(query, variables);
  if (mainWorldResponse.success || mainWorldResponse.error !== "Portal page bridge timed out") {
    return mainWorldResponse;
  }

  return fetchGraphQLFromIsolatedWorld(query, variables);
}

function registerPortalFetchListener(): void {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === "PORTAL_GRAPHQL_FETCH") {
      const { query, variables } = message;
      fetchGraphQL(query, variables)
        .then((response) => sendResponse(response))
        .catch((err) => sendResponse({ success: false, error: err.message }));
      return true; // async response
    }
  });
}

if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
  registerPortalFetchListener();
}
