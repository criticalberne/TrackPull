# Phase 8: Gemini Launch and Keyboard Shortcut - Context

**Gathered:** 2026-03-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can launch Gemini as an AI target using the existing clipboard-first flow and open the extension popup via Cmd+Shift+G (Mac) / Ctrl+Shift+G (Windows) keyboard shortcut. Existing ChatGPT and Claude flows remain unaffected. No host_permissions changes.

</domain>

<decisions>
## Implementation Decisions

### Gemini Launch
- Gemini URL and dropdown option already exist in codebase (popup.ts:25, popup.html:346) — no popup changes needed
- Toast message stays consistent with existing pattern ("Prompt + data copied — paste into Gemini")
- Dropdown order unchanged: ChatGPT → Claude → Gemini
- No host_permissions added — clipboard-first flow doesn't require page access, avoids triggering Chrome permission re-approval for all users
- User will manually verify Gemini landing URL works before shipping (30-second check)

### Keyboard Shortcut
- Shortcut: Cmd+Shift+G (Mac) / Ctrl+Shift+G (Windows) via manifest `commands` section
- Global scope — works from any tab, not restricted to Trackman pages
- Silent availability — no UI hints, tooltips, or popup text about the shortcut
- Chrome's native chrome://extensions/shortcuts handles user rebinding

### Release
- Version bump to 1.5.0 in manifest.json and package.json
- Ship as isolated release (Phase 8 only, no bundling with Phase 9+)
- Full GitHub release with changelog notes and production.zip attached
- Rebuild dist/ and commit after source changes

### Claude's Discretion
- Best Gemini landing URL (gemini.google.com vs gemini.google.com/app — whichever lands on chat input)
- Manifest `commands` configuration details (suggested_key format)
- Shortcut description text in Chrome's extension shortcuts page

</decisions>

<specifics>
## Specific Ideas

No specific requirements — straightforward manifest-only changes using existing patterns.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AI_URLS` map in `src/popup/popup.ts:22-26`: Already has Gemini URL entry
- AI service dropdown in `src/popup/popup.html:343-347`: Already has Gemini option
- Clipboard-first flow in `src/popup/popup.ts:230-257`: Works for any service in AI_URLS
- Build script: `scripts/build-extension.sh` handles manifest copy and validation

### Established Patterns
- Manifest changes flow through `src/manifest.json` → build script → `dist/manifest.json`
- Version tracked in both `src/manifest.json` and `package.json`
- Release process: version bump → rebuild → commit dist/ → gh release create

### Integration Points
- `src/manifest.json`: Add `commands` section for keyboard shortcut
- `src/manifest.json` + `package.json`: Version bump to 1.5.0
- No popup.ts or popup.html changes needed

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 08-gemini-launch-and-keyboard-shortcut*
*Context gathered: 2026-03-02*
