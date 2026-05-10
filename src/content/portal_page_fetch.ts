/**
 * MAIN-world portal GraphQL bridge.
 *
 * The isolated extension world cannot see auth state kept only in the portal
 * app runtime. This script runs in the page world, captures headers from the
 * portal app's own GraphQL traffic, and services GraphQL requests from the
 * isolated portal_fetch content script without exposing token values.
 */

import { findTrackmanAuthTokenFromStorage, type StorageLike } from "./portal_auth";
import {
  PORTAL_GRAPHQL_ENDPOINT,
  PORTAL_GRAPHQL_REQUEST_SOURCE,
  PORTAL_GRAPHQL_REQUEST_TYPE,
  PORTAL_GRAPHQL_RESPONSE_SOURCE,
  PORTAL_GRAPHQL_RESPONSE_TYPE,
  type PortalGraphQLRequestMessage,
  type PortalGraphQLResponseMessage,
} from "./portal_bridge_protocol";

type HeaderMap = Record<string, string>;

const WRAPPED_FETCH_MARKER = "__trackpullPortalFetchWrapped";
const FORBIDDEN_FORWARD_HEADERS = new Set([
  "connection",
  "content-length",
  "cookie",
  "host",
  "origin",
  "proxy-authorization",
  "referer",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "user-agent",
]);

let capturedGraphQLHeaders: HeaderMap = {};
let capturedGraphQLRequestCount = 0;
let pageFetch: typeof fetch | null = null;

export function isTrackmanGraphQLEndpoint(urlValue: string): boolean {
  try {
    const base = typeof window !== "undefined"
      ? window.location.href
      : "https://portal.trackmangolf.com/";
    const url = new URL(urlValue, base);
    return url.origin === "https://api.trackmangolf.com" && url.pathname === "/graphql";
  } catch {
    return false;
  }
}

function getRequestUrl(input: unknown): string | null {
  if (typeof input === "string") return input;
  if (typeof URL !== "undefined" && input instanceof URL) return input.href;
  if (typeof Request !== "undefined" && input instanceof Request) return input.url;
  return null;
}

function canonicalHeaderName(name: string): string {
  const lower = name.toLowerCase();
  if (lower === "authorization") return "Authorization";
  if (lower === "accept") return "Accept";
  if (lower === "content-type") return "Content-Type";
  return name;
}

function isForwardableHeader(name: string): boolean {
  const lower = name.toLowerCase();
  if (!lower || FORBIDDEN_FORWARD_HEADERS.has(lower)) return false;
  if (lower.startsWith("sec-") || lower.startsWith("proxy-")) return false;

  return lower === "authorization" ||
    lower === "accept" ||
    lower === "content-type" ||
    lower === "baggage" ||
    lower === "sentry-trace" ||
    lower === "traceparent" ||
    lower === "tracestate" ||
    lower.startsWith("x-") ||
    lower.startsWith("tm-") ||
    lower.startsWith("apollographql-") ||
    lower.includes("trackman");
}

function readHeaderMap(headers: unknown): HeaderMap {
  const result: HeaderMap = {};
  if (!headers) return result;

  if (typeof Headers !== "undefined" && headers instanceof Headers) {
    headers.forEach((value, name) => {
      result[name] = value;
    });
    return result;
  }

  if (Array.isArray(headers)) {
    for (const entry of headers) {
      if (!Array.isArray(entry) || entry.length < 2) continue;
      const [name, value] = entry;
      if (typeof name === "string" && value !== undefined) {
        result[name] = String(value);
      }
    }
    return result;
  }

  if (typeof headers === "object") {
    for (const [name, value] of Object.entries(headers as Record<string, unknown>)) {
      if (value !== undefined) result[name] = String(value);
    }
  }

  return result;
}

function mergeForwardableHeaders(headers: HeaderMap): void {
  let merged = false;
  for (const [name, value] of Object.entries(headers)) {
    if (!isForwardableHeader(name)) continue;
    capturedGraphQLHeaders[canonicalHeaderName(name)] = value;
    merged = true;
  }

  if (merged) {
    capturedGraphQLRequestCount += 1;
    console.log("TrackPull portal bridge: captured GraphQL auth context", {
      requests: capturedGraphQLRequestCount,
      hasAuthorization: Object.keys(capturedGraphQLHeaders).some((name) => name.toLowerCase() === "authorization"),
      headerCount: Object.keys(capturedGraphQLHeaders).length,
    });
  }
}

export function rememberPortalGraphQLHeaders(headers: HeaderMap): void {
  mergeForwardableHeaders(headers);
}

export function resetCapturedPortalGraphQLHeadersForTests(): void {
  capturedGraphQLHeaders = {};
  capturedGraphQLRequestCount = 0;
}

export function getCapturedPortalGraphQLHeadersForTests(): HeaderMap {
  return { ...capturedGraphQLHeaders };
}

function captureGraphQLFetchHeaders(input: unknown, init?: RequestInit): void {
  const url = getRequestUrl(input);
  if (!url || !isTrackmanGraphQLEndpoint(url)) return;

  const headers: HeaderMap = {};
  if (typeof Request !== "undefined" && input instanceof Request) {
    Object.assign(headers, readHeaderMap(input.headers));
  }
  Object.assign(headers, readHeaderMap(init?.headers));
  mergeForwardableHeaders(headers);
}

function hasHeader(headers: HeaderMap, headerName: string): boolean {
  const lower = headerName.toLowerCase();
  return Object.keys(headers).some((name) => name.toLowerCase() === lower);
}

function setHeaderIfAbsent(headers: HeaderMap, name: string, value: string): void {
  if (!hasHeader(headers, name)) headers[name] = value;
}

export function buildPageContextGraphQLHeaders(...stores: StorageLike[]): HeaderMap {
  const headers: HeaderMap = { ...capturedGraphQLHeaders };
  setHeaderIfAbsent(headers, "Accept", "application/json");
  setHeaderIfAbsent(headers, "Content-Type", "application/json");

  const token = findTrackmanAuthTokenFromStorage(...stores);
  if (token && !hasHeader(headers, "Authorization")) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

function getPageFetch(): typeof fetch {
  return pageFetch ?? window.fetch.bind(window);
}

function installFetchCapture(): void {
  const currentFetch = window.fetch;
  const markerRecord = currentFetch as unknown as Record<string, boolean | undefined>;
  if (markerRecord[WRAPPED_FETCH_MARKER]) return;

  pageFetch = currentFetch.bind(window);
  const fetchToCall = pageFetch;
  const wrappedFetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    captureGraphQLFetchHeaders(input, init);
    return fetchToCall(input, init);
  }) as typeof fetch;

  Object.defineProperty(wrappedFetch, WRAPPED_FETCH_MARKER, {
    value: true,
    configurable: false,
  });
  window.fetch = wrappedFetch;
}

function startFetchCaptureWatchdog(): void {
  installFetchCapture();

  let attempts = 0;
  const intervalId = window.setInterval(() => {
    attempts += 1;
    installFetchCapture();
    if (attempts >= 40) {
      window.clearInterval(intervalId);
    }
  }, 500);
}

type TrackPullXMLHttpRequest = XMLHttpRequest & {
  __trackpullPortalUrl?: string;
  __trackpullPortalHeaders?: HeaderMap;
};

function installXhrCapture(): void {
  const proto = XMLHttpRequest.prototype as XMLHttpRequest & Record<string, unknown>;
  if (proto.__trackpullPortalXhrWrapped) return;

  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function openWithTrackPullCapture(
    method: string,
    url: string | URL,
    async?: boolean,
    username?: string | null,
    password?: string | null
  ): void {
    const xhr = this as TrackPullXMLHttpRequest;
    xhr.__trackpullPortalUrl = String(url);
    xhr.__trackpullPortalHeaders = {};
    return originalOpen.call(this, method, url, async ?? true, username ?? null, password ?? null);
  };

  XMLHttpRequest.prototype.setRequestHeader = function setRequestHeaderWithTrackPullCapture(
    name: string,
    value: string
  ): void {
    const xhr = this as TrackPullXMLHttpRequest;
    if (xhr.__trackpullPortalHeaders) {
      xhr.__trackpullPortalHeaders[name] = value;
    }
    return originalSetRequestHeader.call(this, name, value);
  };

  XMLHttpRequest.prototype.send = function sendWithTrackPullCapture(body?: Document | XMLHttpRequestBodyInit | null): void {
    const xhr = this as TrackPullXMLHttpRequest;
    if (xhr.__trackpullPortalUrl && isTrackmanGraphQLEndpoint(xhr.__trackpullPortalUrl)) {
      mergeForwardableHeaders(xhr.__trackpullPortalHeaders ?? {});
    }
    return originalSend.call(this, body ?? null);
  };

  proto.__trackpullPortalXhrWrapped = true;
}

async function fetchGraphQLInPageContext(
  query: string,
  variables?: Record<string, unknown>
): Promise<PortalGraphQLResponseMessage> {
  try {
    installFetchCapture();
    const response = await getPageFetch()(PORTAL_GRAPHQL_ENDPOINT, {
      method: "POST",
      credentials: "include",
      headers: buildPageContextGraphQLHeaders(window.localStorage, window.sessionStorage),
      body: JSON.stringify({ query, variables }),
    });
    const text = await response.text();

    if (!response.ok) {
      return {
        source: PORTAL_GRAPHQL_RESPONSE_SOURCE,
        type: PORTAL_GRAPHQL_RESPONSE_TYPE,
        requestId: "",
        success: false,
        error: `HTTP ${response.status}: ${text.slice(0, 200)}`,
      };
    }

    const data = text ? JSON.parse(text) : null;

    return {
      source: PORTAL_GRAPHQL_RESPONSE_SOURCE,
      type: PORTAL_GRAPHQL_RESPONSE_TYPE,
      requestId: "",
      success: true,
      data,
    };
  } catch (err) {
    return {
      source: PORTAL_GRAPHQL_RESPONSE_SOURCE,
      type: PORTAL_GRAPHQL_RESPONSE_TYPE,
      requestId: "",
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function isPortalGraphQLRequestMessage(value: unknown): value is PortalGraphQLRequestMessage {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<PortalGraphQLRequestMessage>;
  return record.source === PORTAL_GRAPHQL_REQUEST_SOURCE &&
    record.type === PORTAL_GRAPHQL_REQUEST_TYPE &&
    typeof record.requestId === "string" &&
    typeof record.query === "string";
}

function registerPageBridge(): void {
  window.addEventListener("message", (event: MessageEvent) => {
    if (event.source !== window) return;
    if (!isPortalGraphQLRequestMessage(event.data)) return;

    const request = event.data;
    fetchGraphQLInPageContext(request.query, request.variables)
      .then((response) => {
        window.postMessage({ ...response, requestId: request.requestId }, window.location.origin);
      });
  });
}

if (typeof window !== "undefined" && window.location.hostname === "portal.trackmangolf.com") {
  startFetchCaptureWatchdog();
  installXhrCapture();
  registerPageBridge();
  console.log("TrackPull portal bridge: MAIN-world GraphQL bridge loaded");
}
