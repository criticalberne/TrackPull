# Stack Research

**Domain:** Golf data scraping Chrome extension (Manifest V3 / TypeScript / CSV export)
**Researched:** 2026-03-02
**Confidence:** HIGH for existing stack validation; MEDIUM for additive recommendations

---

## Context: What Already Exists

TrackPull v1.2.1 already has a well-chosen core stack:

- **TypeScript 5.9.3** — current latest, no upgrade needed
- **esbuild 0.27.x** (via `npx esbuild`) — current latest is 0.27.3
- **vitest 4.0.18** — current latest
- **Manifest V3** with MAIN world interceptor + ISOLATED world bridge
- **Zero production dependencies** — by design, Chrome APIs only

The research question is: what *additional* tooling or libraries would improve the extension for future milestones?

---

## Recommended Stack

### Core Technologies (Keep As-Is)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| TypeScript | 5.9.3 | Static typing, compile-time safety | Already at latest. TS 5.9 added import defer syntax and better init defaults. No upgrade needed. |
| esbuild | 0.27.3 | Multi-entry bundling to IIFE for each content script | Already at latest. Correct choice: one esbuild invocation per script, IIFE format required by MV3. Faster than webpack/Vite for this use case. |
| Manifest V3 | — | Extension platform | Already correct. MV2 is deprecated. The MAIN world + ISOLATED world bridge architecture is the canonical solution for API interception. |
| Chrome storage API | built-in | Persist session data and user preferences | Correct. 10 MB quota (Chrome 113+) is sufficient for golf session data (a session is typically a few KB). No additional storage library needed. |
| Chrome downloads API | built-in | CSV export | Correct. `data:text/csv;charset=utf-8,` URL approach with `encodeURIComponent` is the standard MV3 pattern — avoids needing `URL.createObjectURL` which requires DOM access unavailable in service workers. |

### Missing Dev Tooling (Should Add)

| Tool | Version | Purpose | Why Now |
|------|---------|---------|---------|
| tsconfig.json | — | TypeScript compiler configuration | No tsconfig.json exists in the project. esbuild works without one but uses defaults. Without tsconfig, the `tsc` type-checker cannot be run standalone, and vitest may silently ignore type errors. Add with `strict: true`, `isolatedModules: true` (required for esbuild single-file compilation), `lib: ["dom", "dom.iterable", "esnext"]`. |
| @types/chrome | 0.1.37 | TypeScript definitions for Chrome extension APIs | No Chrome API types exist. Without this, all `chrome.*` calls are untyped. Prefer `@types/chrome` over `chrome-types`: `@types/chrome` is updated more frequently (last updated 3 days ago at time of research) and is the DefinitelyTyped community standard. `chrome-types` (Google's auto-generated version) is also valid but has the same version cadence risk. |
| vitest-chrome | 0.1.0 | Mock Chrome API in vitest tests | Currently tests cannot mock `chrome.storage`, `chrome.downloads`, or `chrome.runtime`. This is a complete Chrome API mock compatible with vitest. Low star count (10) but the only purpose-built vitest option. Alternative: manually mock with `vi.stubGlobal('chrome', {...})` per test — simpler for small surface area. |

### Supporting Libraries (Do NOT Add Unless Specifically Needed)

| Library | Why Not Now | Use Instead |
|---------|-------------|-------------|
| Papa Parse | CSV generation is already custom and correct. Adding a library adds production dependency. | Keep hand-written CSV writer — it handles RFC4180 escaping correctly already. |
| webextension-polyfill | Not needed — extension targets Chrome only, not Firefox. Would add production dependency. | Chrome APIs directly |
| Plasmo / WXT / crxjs | Full extension frameworks that automate building and reloading. Overkill for a single-domain scraper with a working esbuild pipeline. | Keep current build script |
| Zod | Schema validation library. Useful if API response shape becomes complex or untrusted. | LOW priority — existing `containsStrokegroups()` heuristic is sufficient |
| React / Preact | UI framework for popup. Current popup is minimal vanilla HTML/JS. Unnecessary complexity. | Vanilla TypeScript DOM manipulation |

---

## Installation

For the recommended additions:

```bash
# TypeScript config base (optional, can write manually)
# No npm install needed — tsconfig.json is a file, not a package

# Chrome API types (dev dep — types only, no runtime code)
npm install -D @types/chrome

# Chrome API mock for tests (dev dep)
npm install -D vitest-chrome
```

---

## Alternatives Considered

| Category | Recommended | Alternative | When to Use Alternative |
|----------|-------------|-------------|-------------------------|
| Chrome types | `@types/chrome@0.1.37` | `chrome-types@0.1.420` | `chrome-types` if you want types auto-generated from Chromium source (more authoritative but can lag). For TypeScript IDE support, both work. |
| Chrome API mocking | `vitest-chrome@0.1.0` | `vi.stubGlobal('chrome', {...})` | Manual stubs when only testing 1-2 Chrome APIs. vitest-chrome when testing service worker message handling end-to-end. |
| TypeScript bundling | esbuild (current) | tsup | tsup wraps esbuild with zero-config defaults. Only useful if build script complexity grows. Current bash script is already simple. |
| Test environment | vitest default (node) | vitest + jsdom | Add jsdom (`npm install -D jsdom @vitest/browser`) only if popup UI tests are needed. Current tests are pure logic tests that don't need DOM. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| webpack | 5-10x slower builds than esbuild for this use case, complex config for multi-entry IIFE. The existing esbuild build is already correct and fast. | esbuild (current) |
| Vite + crxjs | Vite/crxjs adds hot module reload and full framework tooling. For a content-script-first extension with no UI framework, this is unnecessary complexity and can break MAIN world injection patterns. | esbuild (current) |
| `chrome-types` as primary | Auto-generated from Chromium IDL; can include unstable/internal APIs. @types/chrome is the community-vetted, DefinitelyTyped standard. | @types/chrome |
| `setInterval` polling in service worker | Service workers are terminated after 30s idle; timers are cancelled on termination. The current `waitForTagsThenPost()` polling in interceptor.ts (MAIN world, not service worker) is fine — this warning applies only to background service worker code. | `chrome.alarms` API for any background scheduling |
| `localStorage` in extension | Not accessible in service workers; not scoped to extension. | `chrome.storage.local` (already used) |
| Inline source maps in production | `--sourcemap=inline` is used in the current background.js build. Inline maps bloat JS file size. Acceptable for dev builds, but should be removed for production release ZIPs. | `--sourcemap=external` or no sourcemap for production builds |
| `unlimitedStorage` permission | Golf session data is KB-scale. Requesting this permission raises Chrome Web Store scrutiny and privacy red flags for users. | Current 10 MB default quota (more than sufficient) |

---

## Stack Patterns by Variant

**If adding popup UI complexity (e.g., settings page, multi-session history):**
- Use vanilla TypeScript with typed DOM queries — no React needed at current complexity
- If UI grows beyond ~200 lines, consider Preact (3 KB, JSX-compatible, no build change needed with esbuild)
- Do NOT use React — bundle size overhead is unjustified for a single popup

**If adding cross-browser support (Firefox):**
- Add `webextension-polyfill` as a production dependency
- Switch manifest to use `browser_specific_settings` for Firefox
- This is currently out of scope but the zero-production-dependency constraint would need revisiting

**If Trackman API changes structure significantly:**
- Add `zod` for runtime schema validation of API responses
- Wrap `parseSessionData()` with a Zod schema
- Keeps type safety at the runtime boundary without changing the overall architecture

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| typescript@5.9.3 | esbuild@0.27.3 | esbuild reads tsconfig but does not run tsc — type errors do not block builds. Run `tsc --noEmit` separately to catch type errors. |
| vitest@4.0.18 | typescript@5.9.3 | Compatible. Note: vitest 4.x has breaking changes vs vitest 1.x (removed `poolMatchGlobs`, `environmentMatchGlobs`). Current vitest.config.ts only uses `test.include` — unaffected. |
| @types/chrome@0.1.37 | typescript@5.9.3 | Compatible. Types declare global `chrome` namespace — no import needed. |
| vitest-chrome@0.1.0 | vitest@4.0.18 | LOW confidence — vitest-chrome was written for earlier vitest versions (10 stars, no releases tagged). May require manual `vi.stubGlobal` fallback if incompatible. Verify before using in CI. |

---

## Key Architecture Constraints That Affect Stack Choices

These are not library choices but platform realities that any future stack decision must respect:

1. **MAIN world scripts cannot import modules at runtime** — esbuild must bundle everything into a single IIFE. No dynamic imports.
2. **Service workers terminate after 30s idle** — no stateful singletons in `serviceWorker.ts`. All state must go through `chrome.storage`.
3. **Only `chrome.runtime` is available in offscreen documents** — if DOM access from the service worker is ever needed, an offscreen document can only message back via `chrome.runtime.sendMessage`.
4. **MV3 prohibits remotely-hosted code** — all JavaScript must be bundled into the extension at install time.

---

## Sources

- TypeScript 5.9 Release Notes — https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-9.html (HIGH confidence, official)
- Vitest 4.0 Blog — https://vitest.dev/blog/vitest-4 (HIGH confidence, official)
- Vitest 4.0 Migration Guide — https://vitest.dev/guide/migration.html (HIGH confidence, official)
- Chrome Storage API Reference — https://developer.chrome.com/docs/extensions/reference/api/storage (HIGH confidence, official; confirms 10 MB quota)
- Chrome MV3 Service Worker Limits — https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3 (HIGH confidence, official)
- Chrome Offscreen Documents — https://developer.chrome.com/docs/extensions/reference/api/offscreen (HIGH confidence, official)
- @types/chrome npm — https://www.npmjs.com/package/@types/chrome (HIGH confidence, official registry)
- chrome-types GitHub — https://github.com/GoogleChrome/chrome-types (HIGH confidence, official Google)
- vitest-chrome GitHub — https://github.com/probil/vitest-chrome (LOW confidence — minimal maintenance signals)
- esbuild npm — version 0.27.3 confirmed via `npm info esbuild version` (HIGH confidence)
- MutationObserver recommendation — https://developer.chrome.com/blog/detect-dom-changes-with-mutation-observers (HIGH confidence, official)

---

*Stack research for: TrackPull Chrome extension (golf data scraping / CSV export)*
*Researched: 2026-03-02*
