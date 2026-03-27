(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // src/content/portal_fetch.ts
  var require_portal_fetch = __commonJS({
    "src/content/portal_fetch.ts"() {
      var GRAPHQL_ENDPOINT = "https://api.trackmangolf.com/graphql";
      chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
        if (message.type === "PORTAL_GRAPHQL_FETCH") {
          const { query, variables } = message;
          fetch(GRAPHQL_ENDPOINT, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query, variables })
          }).then((r) => r.json()).then((data) => sendResponse({ success: true, data })).catch((err) => sendResponse({ success: false, error: err.message }));
          return true;
        }
      });
    }
  });
  require_portal_fetch();
})();
