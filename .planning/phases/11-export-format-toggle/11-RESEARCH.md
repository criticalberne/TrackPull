# Phase 11: Export Format Toggle - Research

**Researched:** 2026-03-03
**Domain:** Chrome extension storage, popup UI checkbox, service worker CSV generation
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| EXP-01 | User can toggle whether exports include averages and consistency rows | `writeCsv` already has `includeAverages` boolean param; service worker hardcodes `true`; adding storage key + checkbox + reading preference in service worker enables this end-to-end |
</phase_requirements>

---

## Summary

Phase 11 adds a checkbox to the popup that controls whether CSV exports include Average and Consistency summary rows. The backend already supports this: `writeCsv` in `src/shared/csv_writer.ts` accepts `includeAverages: boolean` as its second parameter (default `true`), and both Average and Consistency rows are gated behind that single flag. The only hardcoded call is in `serviceWorker.ts` line 83: `writeCsv(data, true, ...)` — that `true` must become a read from storage.

The implementation pattern is identical to how the hitting surface preference works: popup reads storage on DOMContentLoaded, writes on change, service worker reads the same key in its existing `chrome.storage.local.get()` call during `EXPORT_CSV_REQUEST`. No new message types, no new service worker handlers, no new shared modules — just a new storage key, one new checkbox element in `popup.html`, and minor additions to `popup.ts` and `serviceWorker.ts`.

Persistence across popup closes and browser restarts is automatic with `chrome.storage.local`. New users (no key stored) default to `true` (averages included), which is the correct backward-compatible behavior matching the `writeCsv` default parameter.

**Primary recommendation:** Add `INCLUDE_AVERAGES` to `STORAGE_KEYS` in `constants.ts`, add a checkbox in `popup.html`, wire it in `popup.ts` (read + save on change), and read the key in `serviceWorker.ts`'s existing `chrome.storage.local.get()` call, defaulting to `true` when absent.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `chrome.storage.local` | MV3 built-in | Persist checkbox state across popup closes and browser restarts | Already used for all other popup preferences (speed unit, distance unit, hitting surface) |
| `chrome.runtime.onMessage` | MV3 built-in | Service worker receives EXPORT_CSV_REQUEST and reads storage | Already wired; just extend the existing `get()` call |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `vitest` | 1.1.1 | Unit test `writeCsv` with `includeAverages=false` | Already used; add tests for the toggle's effect on CSV output |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `chrome.storage.local` | `chrome.storage.sync` | sync would roam across devices but is overkill — surface preference and unit prefs use local; consistency favors local |
| Checkbox in popup | Checkbox in options page | Options page is for customization not workflow; this is a per-export decision the user needs in-flow |

**Installation:** No new packages needed.

---

## Architecture Patterns

### Recommended Project Structure

No new files required. Changes touch:

```
src/
├── shared/
│   └── constants.ts          # Add INCLUDE_AVERAGES storage key
├── popup/
│   ├── popup.html            # Add checkbox + label element + CSS
│   └── popup.ts              # Read/write includeAverages preference
└── background/
    └── serviceWorker.ts      # Read includeAverages from storage in EXPORT_CSV_REQUEST
```

### Pattern 1: Storage Key → Popup Read/Write → Service Worker Read

**What:** All per-export preferences (unit system, hitting surface) follow this three-point pattern — a constant storage key, popup reads on load and writes on UI change, service worker reads same key inside the existing `chrome.storage.local.get()` during export.

**When to use:** Whenever popup UI controls an aspect of export behavior.

**Example (existing surface pattern to mirror):**

```typescript
// popup.ts — read on load
const surface = (unitResult[STORAGE_KEYS.HITTING_SURFACE] as "Grass" | "Mat") ?? "Mat";
cachedSurface = surface;
surfaceSelect.value = surface;

// popup.ts — save on change
surfaceSelect.addEventListener("change", () => {
  chrome.storage.local.set({ [STORAGE_KEYS.HITTING_SURFACE]: surfaceSelect.value });
  cachedSurface = surfaceSelect.value as "Grass" | "Mat";
});

// serviceWorker.ts — read during EXPORT_CSV_REQUEST
chrome.storage.local.get([..., STORAGE_KEYS.HITTING_SURFACE], (result) => {
  const surface = (result[STORAGE_KEYS.HITTING_SURFACE] as "Grass" | "Mat") ?? "Mat";
  const csvContent = writeCsv(data, true, undefined, unitChoice, surface);
});
```

**For Phase 11, the same pattern:**

```typescript
// constants.ts — add to STORAGE_KEYS
INCLUDE_AVERAGES: "includeAverages",

// popup.ts — read on load (defaults to true = checked by default)
const storedInclude = result[STORAGE_KEYS.INCLUDE_AVERAGES];
const includeAverages = storedInclude === undefined ? true : Boolean(storedInclude);
includeAveragesCheckbox.checked = includeAverages;

// popup.ts — save on change
includeAveragesCheckbox.addEventListener("change", () => {
  chrome.storage.local.set({ [STORAGE_KEYS.INCLUDE_AVERAGES]: includeAveragesCheckbox.checked });
});

// serviceWorker.ts — add key to existing get(), read with default true
chrome.storage.local.get([..., STORAGE_KEYS.INCLUDE_AVERAGES], (result) => {
  const includeAverages = result[STORAGE_KEYS.INCLUDE_AVERAGES] === undefined
    ? true
    : Boolean(result[STORAGE_KEYS.INCLUDE_AVERAGES]);
  const csvContent = writeCsv(data, includeAverages, undefined, unitChoice, surface);
});
```

### Pattern 2: Checkbox Default Behavior (backward compatibility)

**What:** `chrome.storage.local.get()` returns `undefined` for keys that have never been written. Defaulting to `true` when the key is absent guarantees existing users (who have never seen the toggle) continue to get averages in their exports — identical to before.

**Key insight:** The absence of a stored value (`undefined`) must be treated as `true`, not `false`. Use `result[key] === undefined ? true : Boolean(result[key])` rather than `result[key] ?? true` because `false` is falsy and `?? true` would evaluate to `true` for `false` (though in this specific case `??` would work correctly since `false` is not nullish, but being explicit avoids confusion).

### Anti-Patterns to Avoid

- **Reading includeAverages from a popup message field:** The STATE.md decision explicitly locks this — service worker reads from storage directly, same as other preferences. Do NOT pass it via the `EXPORT_CSV_REQUEST` message body.
- **Wiring the checkbox inside the export-row div:** That div is hidden when no data is present. The checkbox should be visible at all times (or at least independent of data presence) so users can set their preference before data arrives.
- **Setting `checked` attribute in HTML as default:** HTML `checked` attribute is not connected to storage. Always set `checkbox.checked` from the storage read result.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Persisting checkbox state | Custom localStorage or cookie-based storage | `chrome.storage.local` | MV3 standard; already in use for all other prefs; auto-syncs; available to service workers |
| Toggling averages rows | Custom filtering logic in a new module | `writeCsv`'s existing `includeAverages` param | The param already exists and gates both Average and Consistency rows — nothing to build |

**Key insight:** Phase 11 is almost entirely wiring, not building. The CSV logic is done. The storage infrastructure is done. The UI pattern is established. This is a three-file change: one new constant, one new HTML element, three code locations updated.

---

## Common Pitfalls

### Pitfall 1: Missing Key in `chrome.storage.local.get()` Array

**What goes wrong:** `serviceWorker.ts` line 65 explicitly lists storage keys to fetch. If `STORAGE_KEYS.INCLUDE_AVERAGES` is not added to that array, `result[STORAGE_KEYS.INCLUDE_AVERAGES]` will be `undefined` for every export — which defaults to `true`, so averages are always included regardless of the user's preference.

**Why it happens:** `chrome.storage.local.get([...keys], cb)` only returns values for explicitly listed keys.

**How to avoid:** Add `STORAGE_KEYS.INCLUDE_AVERAGES` to the array in the existing `chrome.storage.local.get()` call in `serviceWorker.ts`.

**Warning signs:** Unchecking the checkbox and exporting still produces averages.

### Pitfall 2: Popup Reads Preference in Wrong Storage Block

**What goes wrong:** `popup.ts` has two separate `chrome.storage.local.get()` calls — one for `TRACKMAN_DATA` (line 76) and one for unit/surface prefs (line 90). The `includeAverages` key must be read in the second block (the unit/surface block), where all other export preferences are loaded. Adding it to the first block would require an additional state variable and additional wiring.

**Why it happens:** The popup separates data loading from preference loading across two async calls.

**How to avoid:** Add `STORAGE_KEYS.INCLUDE_AVERAGES` to the existing array on line 90 in `popup.ts` (the block that already loads `SPEED_UNIT`, `DISTANCE_UNIT`, `HITTING_SURFACE`).

**Warning signs:** Checkbox doesn't reflect saved value on popup open.

### Pitfall 3: Checkbox Placement Conflicts With Empty-State Visibility

**What goes wrong:** If the checkbox is placed inside `#export-row` or `#ai-section`, it gets hidden when no data is present (because those elements use `style.display = "none"`). The user can't set their preference before capturing shots.

**Why it happens:** Phase 10 added visibility logic that hides those sections with no data.

**How to avoid:** Place the checkbox in the `.unit-selectors` area or as its own row below the unit selectors — outside any conditionally-hidden container. Alternatively, place it inside `#export-row` if the UX decision is that the toggle only needs to be accessible when export is available (this is a discretion area).

**Warning signs:** Checkbox disappears when popup has no data loaded.

### Pitfall 4: Boolean Storage Value vs. String

**What goes wrong:** `chrome.storage.local` stores JavaScript values as-is (JSON-serialized). A boolean `false` stored and retrieved stays boolean. But if any code path accidentally stores `"false"` (a string), the truthiness check breaks.

**Why it happens:** TypeScript `HTMLInputElement.checked` is a boolean, so `checkbox.checked` is always a real boolean — this pitfall only occurs if the value is stored via a string conversion path.

**How to avoid:** Always use `checkbox.checked` (boolean) directly in `chrome.storage.local.set()`. When reading, always cast with `Boolean(result[key])` and handle the `undefined` case explicitly.

---

## Code Examples

Verified patterns from the existing codebase:

### Current `writeCsv` Signature (source: `src/shared/csv_writer.ts` line 78)

```typescript
export function writeCsv(
  session: SessionData,
  includeAverages = true,        // ← already exists, just hardcoded to true in service worker
  metricOrder?: string[],
  unitChoice: UnitChoice = DEFAULT_UNIT_CHOICE,
  hittingSurface?: "Grass" | "Mat"
): string
```

### Current `writeCsv` Call in Service Worker (source: `serviceWorker.ts` line 83)

```typescript
const csvContent = writeCsv(data, true, undefined, unitChoice, surface);
//                                ^^^^
//                           Change to: includeAverages (read from storage)
```

### Existing Storage Key Pattern (source: `src/shared/constants.ts` lines 143-150)

```typescript
export const STORAGE_KEYS = {
  TRACKMAN_DATA: "trackmanData",
  SPEED_UNIT: "speedUnit",
  DISTANCE_UNIT: "distanceUnit",
  SELECTED_PROMPT_ID: "selectedPromptId",
  AI_SERVICE: "aiService",
  HITTING_SURFACE: "hittingSurface",
  // Add: INCLUDE_AVERAGES: "includeAverages",
} as const;
```

### Existing Checkbox Pattern (HTML — mirrors unit selector pattern in `popup.html`)

```html
<!-- Place below .unit-selectors or as its own row -->
<div class="toggle-row">
  <label>
    <input type="checkbox" id="include-averages-checkbox" checked>
    Include averages and consistency rows in CSV export
  </label>
</div>
```

### Popup Read Pattern (mirrors hitting surface read, `popup.ts` ~line 114)

```typescript
const includeAveragesCheckbox = document.getElementById("include-averages-checkbox") as HTMLInputElement | null;
if (includeAveragesCheckbox) {
  const stored = unitResult[STORAGE_KEYS.INCLUDE_AVERAGES];
  includeAveragesCheckbox.checked = stored === undefined ? true : Boolean(stored);
  includeAveragesCheckbox.addEventListener("change", () => {
    chrome.storage.local.set({ [STORAGE_KEYS.INCLUDE_AVERAGES]: includeAveragesCheckbox.checked });
  });
}
```

### Service Worker Read Pattern (extend existing `get()` call, `serviceWorker.ts` ~line 65)

```typescript
chrome.storage.local.get(
  [STORAGE_KEYS.TRACKMAN_DATA, STORAGE_KEYS.SPEED_UNIT, STORAGE_KEYS.DISTANCE_UNIT,
   STORAGE_KEYS.HITTING_SURFACE, STORAGE_KEYS.INCLUDE_AVERAGES, "unitPreference"],
  (result) => {
    // ... existing unit/surface logic ...
    const includeAverages = result[STORAGE_KEYS.INCLUDE_AVERAGES] === undefined
      ? true
      : Boolean(result[STORAGE_KEYS.INCLUDE_AVERAGES]);
    const csvContent = writeCsv(data, includeAverages, undefined, unitChoice, surface);
  }
);
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `writeCsv(data, true, ...)` hardcoded | `writeCsv(data, includeAverages, ...)` from storage | Phase 11 | Users control whether Average/Consistency rows appear |

**Note:** The `includeAverages` parameter has always existed in `writeCsv` with `= true` default — this phase wires storage to it for the first time.

---

## Open Questions

1. **Checkbox placement: always-visible vs. only when data exists**
   - What we know: Other per-export settings (unit dropdowns) are always visible regardless of data state.
   - What's unclear: Whether the toggle should be always visible (consistent with unit dropdowns) or only show when export is available (inside export row area).
   - Recommendation: Mirror the unit selectors pattern — always visible. The user may want to set their preference before capturing data. The checkbox does not need data to function.

2. **Checkbox label copy**
   - What we know: Success criteria says "labeled to indicate averages and consistency rows are included."
   - What's unclear: Exact wording.
   - Recommendation: "Include averages and consistency in export" — concise, describes exactly what rows are controlled.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 1.1.1 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EXP-01 | `writeCsv(session, false, ...)` produces no Average/Consistency rows | unit | `npx vitest run tests/test_csv_writer_averages_toggle.ts` | ❌ Wave 0 |
| EXP-01 | `writeCsv(session, true, ...)` produces Average rows when club has averages | unit | `npx vitest run tests/test_csv_writer_averages_toggle.ts` | ❌ Wave 0 |
| EXP-01 | `writeCsv(session, true, ...)` produces Consistency rows when club has consistency | unit | `npx vitest run tests/test_csv_writer_averages_toggle.ts` | ❌ Wave 0 |
| EXP-01 | Storage key `INCLUDE_AVERAGES` exists in STORAGE_KEYS | unit | `npx vitest run tests/test_storage_keys.ts` | ✅ (extend existing) |

**Note:** The popup checkbox's read/write behavior and the service worker's storage read are not directly unit-testable (require Chrome API mocks). The critical logic path — `writeCsv` respecting the `includeAverages` param — is fully testable.

### Sampling Rate

- **Per task commit:** `npx vitest run`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/test_csv_writer_averages_toggle.ts` — covers EXP-01: tests `writeCsv` with `includeAverages=true` and `false`, verifying Average/Consistency row presence/absence

*(Existing `test_storage_keys.ts` can be extended to assert `INCLUDE_AVERAGES` key exists — minor addition, no new file needed for that check.)*

---

## Sources

### Primary (HIGH confidence)

- `src/shared/csv_writer.ts` — verified `writeCsv` signature and `includeAverages` param behavior (lines 78-84, 134-184)
- `src/background/serviceWorker.ts` — verified hardcoded `true` at line 83; verified existing `chrome.storage.local.get()` pattern at lines 65-109
- `src/popup/popup.ts` — verified two-block storage read pattern; unit/surface preference wiring (lines 89-143)
- `src/shared/constants.ts` — verified `STORAGE_KEYS` shape (lines 143-150)
- `.planning/STATE.md` — locked decision: "Export toggle reads includeAverages from storage in the service worker directly (not passed via message)"

### Secondary (MEDIUM confidence)

- Existing test in `tests/test_csv_writer_units.ts` — confirms test pattern for `writeCsv` with `includeAverages=false` (tests already pass `false` to verify unit behavior without averages rows)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; all existing Chrome storage APIs and build tooling
- Architecture: HIGH — implementation pattern is directly derived from hitting surface preference (same three-point pattern)
- Pitfalls: HIGH — all pitfalls derived from reading actual source code, not speculation
- Test gaps: HIGH — vitest infrastructure confirmed running (247 tests pass); new test file needed for toggle behavior

**Research date:** 2026-03-03
**Valid until:** 2026-04-03 (stable — no external dependencies)
