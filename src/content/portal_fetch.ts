/**
 * Content script for portal.trackmangolf.com.
 * Proxies GraphQL requests from the extension using the page's cookies
 * (same-origin context). The service worker cannot send portal cookies
 * because it runs in the extension's origin.
 */

const GRAPHQL_ENDPOINT = "https://api.trackmangolf.com/graphql";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "PORTAL_GRAPHQL_FETCH") {
    const { query, variables } = message;
    fetch(GRAPHQL_ENDPOINT, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
    })
      .then((r) => r.json())
      .then((data) => sendResponse({ success: true, data }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // async response
  }
});
