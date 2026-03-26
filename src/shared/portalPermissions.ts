/**
 * Portal permission helpers for Trackman API access.
 * Shared by popup (request + check) and service worker (check only).
 */

export const PORTAL_ORIGINS: readonly string[] = [
  "https://api.trackmangolf.com/*",
  "https://portal.trackmangolf.com/*",
] as const;

/** Returns true if portal host permissions are currently granted. */
export async function hasPortalPermission(): Promise<boolean> {
  return chrome.permissions.contains({ origins: [...PORTAL_ORIGINS] });
}

/**
 * Requests portal host permissions from the user.
 * MUST be called from a user gesture (button click handler).
 * Returns true if granted, false if denied.
 */
export async function requestPortalPermission(): Promise<boolean> {
  return chrome.permissions.request({ origins: [...PORTAL_ORIGINS] });
}
