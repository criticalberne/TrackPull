(() => {
  // src/content/bridge.ts
  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    if (!event.data || event.data.source !== "trackpull-interceptor") return;
    if (event.data.type !== "TRACKMAN_SHOT_DATA") return;
    console.log("TrackPull bridge: forwarding shot data to service worker");
    chrome.runtime.sendMessage(
      { type: "SAVE_DATA", data: event.data.data },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error("TrackPull bridge: sendMessage failed:", chrome.runtime.lastError.message);
        } else {
          console.log("TrackPull bridge: data saved", response);
        }
      }
    );
  });
  console.log("TrackPull: bridge content script loaded");
})();
