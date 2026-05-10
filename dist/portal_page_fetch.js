(() => {
  // src/content/portal_auth.ts
  function looksLikeJwt(value) {
    return /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value);
  }
  function keyPathLooksLikeAccessToken(keyPath) {
    const lower = keyPath.toLowerCase();
    return !lower.includes("refresh") && (lower.includes("accesstoken") || lower.includes("access_token") || lower.includes(".access.token") || lower.includes("access") && lower.includes("token"));
  }
  function looksLikeOpaqueAccessToken(value) {
    return value.length >= 24 && value.length <= 4096 && /^[A-Za-z0-9._~+/=-]+$/.test(value);
  }
  function cleanToken(value, keyPath) {
    const trimmed = value.trim();
    const bearerMatch = trimmed.match(/^Bearer\s+(.+)$/i);
    const token = bearerMatch ? bearerMatch[1].trim() : trimmed;
    if (looksLikeJwt(token)) return token;
    if (keyPathLooksLikeAccessToken(keyPath) && looksLikeOpaqueAccessToken(token)) {
      return token;
    }
    return null;
  }
  function scoreTokenKey(keyPath) {
    const lower = keyPath.toLowerCase();
    let score = 0;
    if (lower.includes("access")) score += 40;
    if (lower.includes("token")) score += 20;
    if (lower.includes("auth")) score += 10;
    if (lower.includes("idtoken") || lower.includes("id_token")) score += 5;
    if (lower.includes("refresh")) score -= 100;
    return score;
  }
  function collectTokenCandidates(value, keyPath, candidates) {
    if (typeof value === "string") {
      const direct = cleanToken(value, keyPath);
      if (direct) {
        candidates.push({ token: direct, score: scoreTokenKey(keyPath) });
        return;
      }
      const trimmed = value.trim();
      if (trimmed.startsWith("{") && trimmed.endsWith("}") || trimmed.startsWith("[") && trimmed.endsWith("]")) {
        try {
          collectTokenCandidates(JSON.parse(trimmed), keyPath, candidates);
        } catch {
        }
      }
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item, index) => collectTokenCandidates(item, `${keyPath}.${index}`, candidates));
      return;
    }
    if (value && typeof value === "object") {
      for (const [key, nested] of Object.entries(value)) {
        collectTokenCandidates(nested, `${keyPath}.${key}`, candidates);
      }
    }
  }
  function findTrackmanAuthTokenFromStorage(...stores) {
    const candidates = [];
    for (const store of stores) {
      for (let i = 0; i < store.length; i += 1) {
        const key = store.key(i);
        if (!key) continue;
        const value = store.getItem(key);
        if (value === null) continue;
        collectTokenCandidates(value, key, candidates);
      }
    }
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0]?.token ?? null;
  }

  // src/content/portal_bridge_protocol.ts
  var PORTAL_GRAPHQL_ENDPOINT = "https://api.trackmangolf.com/graphql";
  var PORTAL_GRAPHQL_REQUEST_SOURCE = "trackpull-portal-isolated";
  var PORTAL_GRAPHQL_RESPONSE_SOURCE = "trackpull-portal-main";
  var PORTAL_GRAPHQL_REQUEST_TYPE = "TRACKPULL_PORTAL_GRAPHQL_REQUEST";
  var PORTAL_GRAPHQL_RESPONSE_TYPE = "TRACKPULL_PORTAL_GRAPHQL_RESPONSE";

  // src/content/portal_page_fetch.ts
  var WRAPPED_FETCH_MARKER = "__trackpullPortalFetchWrapped";
  var FORBIDDEN_FORWARD_HEADERS = /* @__PURE__ */ new Set([
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
    "user-agent"
  ]);
  var capturedGraphQLHeaders = {};
  var capturedGraphQLRequestCount = 0;
  var pageFetch = null;
  function isTrackmanGraphQLEndpoint(urlValue) {
    try {
      const base = typeof window !== "undefined" ? window.location.href : "https://portal.trackmangolf.com/";
      const url = new URL(urlValue, base);
      return url.origin === "https://api.trackmangolf.com" && url.pathname === "/graphql";
    } catch {
      return false;
    }
  }
  function getRequestUrl(input) {
    if (typeof input === "string") return input;
    if (typeof URL !== "undefined" && input instanceof URL) return input.href;
    if (typeof Request !== "undefined" && input instanceof Request) return input.url;
    return null;
  }
  function canonicalHeaderName(name) {
    const lower = name.toLowerCase();
    if (lower === "authorization") return "Authorization";
    if (lower === "accept") return "Accept";
    if (lower === "content-type") return "Content-Type";
    return name;
  }
  function isForwardableHeader(name) {
    const lower = name.toLowerCase();
    if (!lower || FORBIDDEN_FORWARD_HEADERS.has(lower)) return false;
    if (lower.startsWith("sec-") || lower.startsWith("proxy-")) return false;
    return lower === "authorization" || lower === "accept" || lower === "content-type" || lower === "baggage" || lower === "sentry-trace" || lower === "traceparent" || lower === "tracestate" || lower.startsWith("x-") || lower.startsWith("tm-") || lower.startsWith("apollographql-") || lower.includes("trackman");
  }
  function readHeaderMap(headers) {
    const result = {};
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
        if (typeof name === "string" && value !== void 0) {
          result[name] = String(value);
        }
      }
      return result;
    }
    if (typeof headers === "object") {
      for (const [name, value] of Object.entries(headers)) {
        if (value !== void 0) result[name] = String(value);
      }
    }
    return result;
  }
  function mergeForwardableHeaders(headers) {
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
        headerCount: Object.keys(capturedGraphQLHeaders).length
      });
    }
  }
  function rememberPortalGraphQLHeaders(headers) {
    mergeForwardableHeaders(headers);
  }
  function resetCapturedPortalGraphQLHeadersForTests() {
    capturedGraphQLHeaders = {};
    capturedGraphQLRequestCount = 0;
  }
  function getCapturedPortalGraphQLHeadersForTests() {
    return { ...capturedGraphQLHeaders };
  }
  function captureGraphQLFetchHeaders(input, init) {
    const url = getRequestUrl(input);
    if (!url || !isTrackmanGraphQLEndpoint(url)) return;
    const headers = {};
    if (typeof Request !== "undefined" && input instanceof Request) {
      Object.assign(headers, readHeaderMap(input.headers));
    }
    Object.assign(headers, readHeaderMap(init?.headers));
    mergeForwardableHeaders(headers);
  }
  function hasHeader(headers, headerName) {
    const lower = headerName.toLowerCase();
    return Object.keys(headers).some((name) => name.toLowerCase() === lower);
  }
  function setHeaderIfAbsent(headers, name, value) {
    if (!hasHeader(headers, name)) headers[name] = value;
  }
  function buildPageContextGraphQLHeaders(...stores) {
    const headers = { ...capturedGraphQLHeaders };
    setHeaderIfAbsent(headers, "Accept", "application/json");
    setHeaderIfAbsent(headers, "Content-Type", "application/json");
    const token = findTrackmanAuthTokenFromStorage(...stores);
    if (token && !hasHeader(headers, "Authorization")) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  }
  function getPageFetch() {
    return pageFetch ?? window.fetch.bind(window);
  }
  function installFetchCapture() {
    const currentFetch = window.fetch;
    const markerRecord = currentFetch;
    if (markerRecord[WRAPPED_FETCH_MARKER]) return;
    pageFetch = currentFetch.bind(window);
    const fetchToCall = pageFetch;
    const wrappedFetch = ((input, init) => {
      captureGraphQLFetchHeaders(input, init);
      return fetchToCall(input, init);
    });
    Object.defineProperty(wrappedFetch, WRAPPED_FETCH_MARKER, {
      value: true,
      configurable: false
    });
    window.fetch = wrappedFetch;
  }
  function startFetchCaptureWatchdog() {
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
  function installXhrCapture() {
    const proto = XMLHttpRequest.prototype;
    if (proto.__trackpullPortalXhrWrapped) return;
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
    const originalSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function openWithTrackPullCapture(method, url, async, username, password) {
      const xhr = this;
      xhr.__trackpullPortalUrl = String(url);
      xhr.__trackpullPortalHeaders = {};
      return originalOpen.call(this, method, url, async ?? true, username ?? null, password ?? null);
    };
    XMLHttpRequest.prototype.setRequestHeader = function setRequestHeaderWithTrackPullCapture(name, value) {
      const xhr = this;
      if (xhr.__trackpullPortalHeaders) {
        xhr.__trackpullPortalHeaders[name] = value;
      }
      return originalSetRequestHeader.call(this, name, value);
    };
    XMLHttpRequest.prototype.send = function sendWithTrackPullCapture(body) {
      const xhr = this;
      if (xhr.__trackpullPortalUrl && isTrackmanGraphQLEndpoint(xhr.__trackpullPortalUrl)) {
        mergeForwardableHeaders(xhr.__trackpullPortalHeaders ?? {});
      }
      return originalSend.call(this, body ?? null);
    };
    proto.__trackpullPortalXhrWrapped = true;
  }
  async function fetchGraphQLInPageContext(query, variables) {
    try {
      installFetchCapture();
      const response = await getPageFetch()(PORTAL_GRAPHQL_ENDPOINT, {
        method: "POST",
        credentials: "include",
        headers: buildPageContextGraphQLHeaders(window.localStorage, window.sessionStorage),
        body: JSON.stringify({ query, variables })
      });
      const text = await response.text();
      if (!response.ok) {
        return {
          source: PORTAL_GRAPHQL_RESPONSE_SOURCE,
          type: PORTAL_GRAPHQL_RESPONSE_TYPE,
          requestId: "",
          success: false,
          error: `HTTP ${response.status}: ${text.slice(0, 200)}`
        };
      }
      const data = text ? JSON.parse(text) : null;
      return {
        source: PORTAL_GRAPHQL_RESPONSE_SOURCE,
        type: PORTAL_GRAPHQL_RESPONSE_TYPE,
        requestId: "",
        success: true,
        data
      };
    } catch (err) {
      return {
        source: PORTAL_GRAPHQL_RESPONSE_SOURCE,
        type: PORTAL_GRAPHQL_RESPONSE_TYPE,
        requestId: "",
        success: false,
        error: err instanceof Error ? err.message : String(err)
      };
    }
  }
  function isPortalGraphQLRequestMessage(value) {
    if (!value || typeof value !== "object") return false;
    const record = value;
    return record.source === PORTAL_GRAPHQL_REQUEST_SOURCE && record.type === PORTAL_GRAPHQL_REQUEST_TYPE && typeof record.requestId === "string" && typeof record.query === "string";
  }
  function registerPageBridge() {
    window.addEventListener("message", (event) => {
      if (event.source !== window) return;
      if (!isPortalGraphQLRequestMessage(event.data)) return;
      const request = event.data;
      fetchGraphQLInPageContext(request.query, request.variables).then((response) => {
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
})();
