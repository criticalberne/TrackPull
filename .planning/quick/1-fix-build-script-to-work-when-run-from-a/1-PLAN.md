---
phase: quick
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - scripts/build-extension.sh
autonomous: true
requirements: []
must_haves:
  truths:
    - "Build script succeeds when run from the project root"
    - "Build script succeeds when run from any other directory (e.g., ~ or /tmp)"
    - "All output files land in the project's dist/ directory, not a dist/ relative to cwd"
  artifacts:
    - path: "scripts/build-extension.sh"
      provides: "Directory-independent build script"
      contains: "SCRIPT_DIR"
  key_links: []
---

<objective>
Fix the build script so it works correctly regardless of the caller's working directory.

Purpose: Currently `scripts/build-extension.sh` uses relative paths (`dist`, `src/...`) which resolve relative to the caller's cwd, not the project root. Running the script from any directory other than the project root causes it to create dist/ in the wrong place, fail to find source files, or both.

Output: A build script that resolves all paths relative to its own location (the project root).
</objective>

<execution_context>
@/Users/kylelunter/.claude/get-shit-done/workflows/execute-plan.md
@/Users/kylelunter/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@scripts/build-extension.sh
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add project root resolution and fix all relative paths</name>
  <files>scripts/build-extension.sh</files>
  <action>
At the top of the script (after `set -e`), add a `SCRIPT_DIR` / `PROJECT_ROOT` variable that resolves to the directory containing the script, then cd to it. Use the standard portable idiom:

```bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"
```

This makes all existing relative paths (like `dist`, `src/manifest.json`, `src/icons/*.png`, etc.) resolve correctly because the script's cwd is now always the project root. No other lines need to change since they already use relative paths — the fix is entirely in setting the correct cwd before they execute.

Do NOT change any of the existing esbuild commands, cp commands, or validation logic — only add the three lines above after `set -e`.
  </action>
  <verify>
    <automated>cd /tmp && bash /Users/kylelunter/claudeprojects/trackv3/scripts/build-extension.sh && ls /Users/kylelunter/claudeprojects/trackv3/dist/background.js /Users/kylelunter/claudeprojects/trackv3/dist/popup.js /Users/kylelunter/claudeprojects/trackv3/dist/manifest.json && echo "SUCCESS: Build from /tmp produced correct output"</automated>
  </verify>
  <done>Running `bash scripts/build-extension.sh` from /tmp (or any non-project directory) produces the same dist/ output as running it from the project root. All dist/ files land in the project's dist/ directory.</done>
</task>

</tasks>

<verification>
1. Run from project root: `bash scripts/build-extension.sh` succeeds
2. Run from /tmp: `cd /tmp && bash /Users/kylelunter/claudeprojects/trackv3/scripts/build-extension.sh` succeeds
3. Both produce identical dist/ contents in the project directory
</verification>

<success_criteria>
- Build script works from any working directory
- dist/ output always lands in the project root's dist/ folder
- No regression when run from the project root (existing behavior preserved)
</success_criteria>

<output>
After completion, create `.planning/quick/1-fix-build-script-to-work-when-run-from-a/1-SUMMARY.md`
</output>
