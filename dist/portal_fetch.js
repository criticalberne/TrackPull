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

  // src/content/portal_fetch.ts
  var MAIN_WORLD_TIMEOUT_MS = 15e3;
  var nextRequestId = 0;
  function buildGraphQLHeaders() {
    const headers = { "Content-Type": "application/json" };
    const token = findTrackmanAuthTokenFromStorage(window.localStorage, window.sessionStorage);
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  }
  async function fetchGraphQLFromIsolatedWorld(query, variables) {
    const response = await fetch(PORTAL_GRAPHQL_ENDPOINT, {
      method: "POST",
      credentials: "include",
      headers: buildGraphQLHeaders(),
      body: JSON.stringify({ query, variables })
    });
    return { success: true, data: await response.json() };
  }
  function fetchGraphQLFromMainWorld(query, variables) {
    const requestId = `trackpull-portal-${Date.now()}-${nextRequestId += 1}`;
    const request = {
      source: PORTAL_GRAPHQL_REQUEST_SOURCE,
      type: PORTAL_GRAPHQL_REQUEST_TYPE,
      requestId,
      query,
      variables
    };
    return new Promise((resolve) => {
      let settled = false;
      const cleanup = () => {
        window.removeEventListener("message", onMessage);
        clearTimeout(timeoutId);
      };
      const settle = (response) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(response);
      };
      const onMessage = (event) => {
        if (event.source !== window) return;
        const data = event.data;
        if (!data || data.source !== PORTAL_GRAPHQL_RESPONSE_SOURCE) return;
        if (data.type !== PORTAL_GRAPHQL_RESPONSE_TYPE || data.requestId !== requestId) return;
        settle({
          success: Boolean(data.success),
          data: data.data,
          error: typeof data.error === "string" ? data.error : void 0
        });
      };
      const timeoutId = window.setTimeout(() => {
        settle({ success: false, error: "Portal page bridge timed out" });
      }, MAIN_WORLD_TIMEOUT_MS);
      window.addEventListener("message", onMessage);
      window.postMessage(request, window.location.origin);
    });
  }
  async function fetchGraphQL(query, variables) {
    const mainWorldResponse = await fetchGraphQLFromMainWorld(query, variables);
    if (mainWorldResponse.success || mainWorldResponse.error !== "Portal page bridge timed out") {
      return mainWorldResponse;
    }
    return fetchGraphQLFromIsolatedWorld(query, variables);
  }
  function registerPortalFetchListener() {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message.type === "PORTAL_GRAPHQL_FETCH") {
        const { query, variables } = message;
        fetchGraphQL(query, variables).then((response) => sendResponse(response)).catch((err) => sendResponse({ success: false, error: err.message }));
        return true;
      }
    });
  }
  if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
    registerPortalFetchListener();
  }
})();
