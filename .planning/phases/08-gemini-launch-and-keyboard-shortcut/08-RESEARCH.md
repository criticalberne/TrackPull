# Phase 8: Gemini Launch and Keyboard Shortcut - Research

**Researched:** 2026-03-02
**Domain:** Chrome Extension Manifest V3 — `commands` API, AI URL routing
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- Gemini URL and dropdown option already exist in codebase (popup.ts:25, popup.html:346) — no popup changes needed
- Toast message stays consistent with existing pattern ("Prompt + data copied — paste into Gemini")
- Dropdown order unchanged: ChatGPT → Claude → Gemini
- No host_permissions added — clipboard-first flow doesn't require page access, avoids triggering Chrome permission re-approval for all users
- User will manually verify Gemini landing URL works before shipping (30-second check)
- Shortcut: Cmd+Shift+G (Mac) / Ctrl+Shift+G (Windows) via manifest `commands` section
- Global scope — works from any tab, not restricted to Trackman pages
- Silent availability — no UI hints, tooltips, or popup text about the shortcut
- Chrome's native chrome://extensions/shortcuts handles user rebinding
- Version bump to 1.5.0 in manifest.json and package.json
- Ship as isolated release (Phase 8 only, no bundling with Phase 9+)
- Full GitHub release with changelog notes and production.zip attached
- Rebuild dist/ and commit after source changes

### Claude's Discretion

- Best Gemini landing URL (gemini.google.com vs gemini.google.com/app — whichever lands on chat input)
- Manifest `commands` configuration details (suggested_key format)
- Shortcut description text in Chrome's extension shortcuts page

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AI-01 | User can launch Gemini as an AI analysis target using the existing clipboard-first flow | Gemini entry already in AI_URLS map and dropdown — no new code needed; flow in popup.ts:247-256 handles any service in AI_URLS automatically |
| NAV-01 | User can open the popup with Cmd+Shift+G (Mac) / Ctrl+Shift+G (Windows) | `_execute_action` command with platform-specific `suggested_key` object in manifest.json — verified against official Chrome Commands API docs |
</phase_requirements>

## Summary

Phase 8 is a manifest-only release. Both requirements are satisfied by changes to `src/manifest.json` alone plus a version bump in `package.json`. The Gemini dropdown and `AI_URLS` map already exist in `popup.ts` and `popup.html` — confirmed by reading the actual files. No TypeScript changes are required for AI-01.

For NAV-01, the `_execute_action` reserved command name in the manifest `commands` section is the correct approach. `Ctrl+Shift+G` is a valid non-global command (letters A-Z are permitted, only `Ctrl+Shift+[0-9]` restriction applies to global commands, not non-global). The "works from any tab" behavior is the default for non-global commands — they activate when Chrome has focus, regardless of which tab is active. The `global: true` flag is not needed and cannot be set for `_execute_action`.

The primary risk area is the Gemini landing URL. `gemini.google.com` is already hardcoded in the codebase. Whether that URL surfaces a usable chat input vs redirects to `/app` is a runtime behavior that must be verified manually before shipping (as the user decided). The code change is already correct; the verification is a pre-ship checklist item.

**Primary recommendation:** Add a `commands` section to `src/manifest.json` with `_execute_action` using platform-specific `suggested_key`, bump versions to 1.5.0 in both manifest and package.json, rebuild, and ship. No TypeScript changes required.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Chrome Commands API (manifest key) | MV3 | Keyboard shortcut binding for extension popup | Native platform feature — no library needed |
| esbuild | via npx | Bundle TypeScript → JS for dist/ | Existing build tool in project |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| gh CLI | system | Create GitHub release with attached zip | Release step only |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `_execute_action` reserved command | Custom command + `onCommand` listener | `_execute_action` opens popup natively with no JS required; custom command needs background script handler |
| Platform-specific `suggested_key` object | Single string `suggested_key` | Single string with `Ctrl+Shift+G` auto-maps `Ctrl` to `Command` on Mac — but the platform-specific object is more explicit and clearer for changelog documentation |

**Installation:** No npm packages needed. This is a manifest-only change.

## Architecture Patterns

### Recommended Project Structure

No structural changes. All changes go to:

```
src/
├── manifest.json        # Add commands section, bump version to 1.5.0
package.json             # Bump version to 1.5.0
dist/                    # Rebuilt artifacts after source change (tracked in git)
```

### Pattern 1: _execute_action Command

**What:** The reserved command name `_execute_action` in the manifest `commands` section opens the extension popup when the shortcut is pressed. It requires no background script handler — Chrome handles it natively.

**When to use:** Whenever the goal is "keyboard shortcut opens the popup." Always prefer `_execute_action` over a custom command + `chrome.action.openPopup()` call, which requires additional permissions.

**Example:**
```json
// Source: https://developer.chrome.com/docs/extensions/reference/api/commands
"commands": {
  "_execute_action": {
    "suggested_key": {
      "default": "Ctrl+Shift+G",
      "mac": "Command+Shift+G"
    },
    "description": "Open TrackPull"
  }
}
```

Note: The `description` field is allowed but ignored by Chrome for `_execute_action` — it is visible in `chrome://extensions/shortcuts`. Including it improves UX on that page.

### Pattern 2: Platform-Specific suggested_key

**What:** The `suggested_key` field accepts either a plain string (all platforms) or an object with platform keys: `default`, `mac`, `windows`, `linux`, `chromeos`.

**When to use:** Whenever Mac and Windows shortcuts differ. `Ctrl` in a plain string auto-maps to `Command` on Mac, but an explicit object is preferred for clarity and to avoid any platform ambiguity.

```json
// Source: https://developer.chrome.com/docs/extensions/reference/api/commands
"suggested_key": {
  "default": "Ctrl+Shift+G",
  "mac": "Command+Shift+G"
}
```

The `default` entry covers Windows and Linux. The `mac` entry covers macOS. This produces exactly the desired behavior: Cmd+Shift+G on Mac, Ctrl+Shift+G on Windows/Linux.

### Pattern 3: Version Bump in Two Files

**What:** Both `src/manifest.json` and `package.json` must be updated to the same version string. The build script copies `src/manifest.json` to `dist/manifest.json` — so bumping `src/` automatically flows to `dist/` on next build.

**When to use:** Every release. The project tracks `dist/` in git, so a rebuild is required after the version bump in `src/manifest.json`.

### Anti-Patterns to Avoid

- **Using `global: true` for `_execute_action`:** The `global` flag cannot be applied to reserved commands like `_execute_action`. Adding it has no documented effect and may cause confusion. Do not add it.
- **Using `global: true` with `Ctrl+Shift+G`:** Global commands are restricted to `Ctrl+Shift+[0-9]`. `Ctrl+Shift+G` would silently fail as a global command suggestion. This is irrelevant since `_execute_action` doesn't use global, but worth noting.
- **Adding `description` with intent for popup UI:** The description field only appears in `chrome://extensions/shortcuts`. It does not render anywhere in the extension popup. The decision to keep the shortcut silent (no tooltip) is correct and requires no extra work.
- **Assuming `Ctrl` → `Command` mapping is sufficient:** While Chrome does auto-map `Ctrl` to `Command` on Mac for `suggested_key` strings, using an explicit `mac` platform key is clearer and avoids any edge-case behavior differences.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Keyboard shortcut binding | Custom JS event listener in popup | `_execute_action` manifest command | Popups can't listen for keys globally; manifest commands work from any tab |
| Popup open trigger | `chrome.action.openPopup()` in background.js | `_execute_action` | `openPopup()` requires `activeTab` or user gesture in some Chrome versions; `_execute_action` is the sanctioned zero-code path |
| User shortcut rebinding UI | Custom key picker in options page | `chrome://extensions/shortcuts` (native) | Already decided and out of scope |

**Key insight:** `_execute_action` is a zero-code solution. No background.js changes, no popup.ts changes. The manifest entry is the entire implementation.

## Common Pitfalls

### Pitfall 1: `suggested_key` Not Taking Effect Immediately

**What goes wrong:** After adding the `commands` section and reloading the extension in developer mode, the shortcut may not activate until Chrome is fully restarted (not just the extension reload).

**Why it happens:** Chrome registers extension commands at startup. Reloading an extension mid-session doesn't always re-register the shortcut bindings.

**How to avoid:** During testing, do a full Chrome restart after loading the updated extension, not just an extension reload. Document this in the release notes or verification checklist.

**Warning signs:** Shortcut appears in `chrome://extensions/shortcuts` but pressing it does nothing.

### Pitfall 2: Shortcut Conflict with Another Extension

**What goes wrong:** Chrome silently ignores a `suggested_key` if another extension already claims that combination. The shortcut shows in `chrome://extensions/shortcuts` as unassigned or overridden.

**Why it happens:** Chrome gives priority to whichever extension registered the shortcut first.

**How to avoid:** Manual verification step: after installing the test build, check `chrome://extensions/shortcuts` to confirm `Ctrl+Shift+G` / `Cmd+Shift+G` is actually assigned to TrackPull.

**Warning signs:** `chrome://extensions/shortcuts` shows TrackPull with an empty or different key.

### Pitfall 3: Editing dist/manifest.json Instead of src/manifest.json

**What goes wrong:** Changes made directly to `dist/manifest.json` are overwritten on the next build.

**Why it happens:** The build script `rm -rf dist` then copies `src/manifest.json` to `dist/`. Changes in `dist/` do not survive a rebuild.

**How to avoid:** Always edit `src/manifest.json`. The build step propagates it. The CLAUDE.md and project conventions explicitly state this pattern.

**Warning signs:** Build runs successfully but the `commands` section is missing from `dist/manifest.json`.

### Pitfall 4: Gemini URL Redirects Away From Chat Input

**What goes wrong:** `gemini.google.com` redirects users to a sign-in page or a landing page without a visible chat input, requiring extra navigation before they can paste.

**Why it happens:** Gemini's SPA routing can land users on different states depending on auth state.

**How to avoid:** Manual 30-second check as decided. If `gemini.google.com` doesn't land on a usable chat input for a signed-in user, switch to `gemini.google.com/app` in `AI_URLS`. This is a single character change in `popup.ts:25`.

**Warning signs:** After clicking "Open in AI" with Gemini selected, the new tab shows a welcome/marketing page rather than a conversation input.

## Code Examples

### Complete commands Section for manifest.json

```json
// Source: https://developer.chrome.com/docs/extensions/reference/api/commands
"commands": {
  "_execute_action": {
    "suggested_key": {
      "default": "Ctrl+Shift+G",
      "mac": "Command+Shift+G"
    },
    "description": "Open TrackPull"
  }
}
```

### Full manifest.json After Changes (src/manifest.json)

```json
{
  "manifest_version": 3,
  "name": "TrackPull",
  "version": "1.5.0",
  "description": "Pull shot data from Trackman reports",
  "permissions": ["storage", "downloads", "clipboardWrite"],
  "host_permissions": ["https://web-dynamic-reports.trackmangolf.com/*"],
  "commands": {
    "_execute_action": {
      "suggested_key": {
        "default": "Ctrl+Shift+G",
        "mac": "Command+Shift+G"
      },
      "description": "Open TrackPull"
    }
  },
  "background": {"service_worker": "background.js"},
  "content_scripts": [
    {
      "matches": ["https://web-dynamic-reports.trackmangolf.com/*"],
      "js": ["interceptor.js"],
      "run_at": "document_start",
      "all_frames": false,
      "world": "MAIN"
    },
    {
      "matches": ["https://web-dynamic-reports.trackmangolf.com/*"],
      "js": ["bridge.js"],
      "run_at": "document_start",
      "all_frames": false,
      "world": "ISOLATED"
    }
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {"16": "icons/icon16.png"}
  },
  "options_ui": {
    "page": "options.html",
    "open_in_tab": true
  },
  "icons": {"16": "icons/icon16.png"}
}
```

### Version Bump in package.json

```json
// Change "version": "1.4.0" to:
"version": "1.5.0"
```

### Existing AI_URLS Map (popup.ts:22-26) — Confirmed, No Changes Required

```typescript
// Source: src/popup/popup.ts lines 22-26 — Gemini already present
const AI_URLS: Record<string, string> = {
  "ChatGPT": "https://chatgpt.com",
  "Claude": "https://claude.ai",
  "Gemini": "https://gemini.google.com",
};
```

### Existing Dropdown (popup.html:343-347) — Confirmed, No Changes Required

```html
<!-- Source: src/popup/popup.html lines 343-347 — Gemini already present -->
<select id="ai-service-select">
  <option value="ChatGPT">ChatGPT</option>
  <option value="Claude">Claude</option>
  <option value="Gemini">Gemini</option>
</select>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `_execute_browser_action` (MV2) | `_execute_action` (MV3) | MV3 transition | Must use `_execute_action` — `_execute_browser_action` is deprecated |
| `suggested_key` as plain string | `suggested_key` as platform object | MV3 docs | Both work; object is preferred for explicit Mac/Windows differentiation |

**Deprecated/outdated:**
- `_execute_browser_action`: MV2 only. This project uses MV3 (`"manifest_version": 3` confirmed in `src/manifest.json`). Use `_execute_action` exclusively.

## Open Questions

1. **Gemini landing URL: gemini.google.com vs gemini.google.com/app**
   - What we know: `gemini.google.com` is already in the codebase. Both URLs exist. Which surfaces a usable chat input depends on auth state and SPA routing.
   - What's unclear: Whether `gemini.google.com` reliably lands signed-in users on the chat input vs a marketing/redirect page.
   - Recommendation: User decided on manual 30-second verification before shipping. If `gemini.google.com` does not surface chat input, change one line in `popup.ts:25` to `gemini.google.com/app`. This is the only discretionary code decision remaining.

2. **Shortcut conflict in test environment**
   - What we know: `Ctrl+Shift+G` / `Cmd+Shift+G` is a low-collision choice (no major browser or OS system shortcut uses it).
   - What's unclear: Whether any other extensions in the developer's Chrome profile claim this shortcut.
   - Recommendation: Verify at `chrome://extensions/shortcuts` after installing test build.

## Sources

### Primary (HIGH confidence)
- https://developer.chrome.com/docs/extensions/reference/api/commands — `_execute_action` name, `suggested_key` format, platform keys, global command restriction (`Ctrl+Shift+[0-9]` only), non-global scope behavior
- `src/manifest.json` (read directly) — confirmed MV3, confirmed no `commands` section, confirmed version 1.4.0
- `src/popup/popup.ts` lines 22-26 (read directly) — confirmed Gemini in `AI_URLS` map
- `src/popup/popup.html` lines 343-347 (read directly) — confirmed Gemini option in dropdown
- `src/popup/popup.ts` lines 230-257 (read directly) — confirmed clipboard-first flow handles any `AI_URLS` key

### Secondary (MEDIUM confidence)
- https://github.com/GoogleChrome/chrome-extensions-samples/issues/619 — confirmed `_execute_action` works in MV3; Chrome restart may be needed for shortcut to activate (community-confirmed, Google collaborator verified)
- WebSearch results — confirmed `Ctrl+Shift+G` is not a reserved Chrome or OS shortcut

### Tertiary (LOW confidence)
- Gemini landing URL behavior — gemini.google.com SPA routing is runtime-dependent; not verifiable without live browser test. Flagged as manual pre-ship check.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — `_execute_action` verified against official Chrome Commands API docs
- Architecture: HIGH — manifest.json changes are minimal, code is already in place for AI-01
- Pitfalls: HIGH (Pitfall 1-3) / MEDIUM (Pitfall 4, Gemini URL) — Pitfalls 1-3 verified by official docs and community confirmation; Pitfall 4 is runtime-dependent

**Research date:** 2026-03-02
**Valid until:** 2026-09-02 (Chrome Commands API is stable; Gemini URL is volatile — verify at ship time)
