# Coding Conventions

**Analysis Date:** 2026-03-02

## Naming Patterns

**Files:**
- TypeScript source files: camelCase with `.ts` extension
- Model/type files: `types.ts` for data structures and interfaces
- Utility files: descriptive names like `csv_writer.ts`, `unit_normalization.ts`, `html_table_parser.ts`
- Content scripts: `bridge.ts`, `interceptor.ts` in `src/content/`
- Service workers: `serviceWorker.ts` in `src/background/`
- Popup logic: `popup.ts` in `src/popup/`

**Functions:**
- camelCase for regular functions: `writeCsv`, `normalizeMetricValue`, `convertDistance`, `migrateLegacyPref`
- snake_case for methods that mirror Python equivalents: `get_cell_text()`, `get_cell_text()`, `extract_club_and_metrics()`
- Helper functions use descriptive verbs: `getApiSourceUnitSystem`, `getMetricUnitLabel`, `getDownloadErrorMessage`
- Error checking functions are prefixes with `is` or `has`: `hasTags()`, `hasValidData`

**Variables:**
- camelCase for locals and parameters: `unitChoice`, `sessionData`, `metricNames`, `clubGroups`
- snake_case for data fields matching API/storage schema: `shot_number`, `club_name`, `club_groups`, `metric_names`, `report_id`, `url_type`
- Uppercase for constants: `ALL_METRICS`, `METRIC_DISPLAY_NAMES`, `CSS_DATE`, `API_URL_PATTERNS`, `PAGE_LOAD_TIMEOUT`
- Exported type definitions use camelCase: `UnitChoice`, `SpeedUnit`, `DistanceUnit`, `SessionData`

**Types & Interfaces:**
- PascalCase for type names: `SessionData`, `ClubGroup`, `Shot`, `CaptureInfo`, `TableCell`, `TableRow`, `TableData`
- Union type exports: `type SpeedUnit = "mph" | "m/s"` (literal unions are preferred)
- Export `type` for type-only exports, `interface` for extensible contracts
- Generic constraint parameters: `Record<string, unknown>` for flexible object typing

## Code Style

**Formatting:**
- No explicit formatter configured (.prettierrc not present)
- 2-space indentation observed throughout codebase
- Lines wrapped to ~80-100 characters for readability
- Trailing commas used in objects/arrays for multi-line structures

**Linting:**
- No .eslintrc or eslint config detected
- Manual style consistency through code review
- TypeScript strict mode implied (type annotations are mandatory)

## Import Organization

**Order:**
1. External libraries first (`vitest` imports)
2. Type imports using `import type`
3. Relative imports grouped by category (models, shared utilities)
4. Constants and utility functions last

**Example pattern:**
```typescript
import { describe, it, expect } from "vitest";
import type { SessionData, ClubGroup } from "../src/models/types";
import { writeCsv } from "../src/shared/csv_writer";
import { METRIC_DISPLAY_NAMES } from "../src/shared/constants";
```

**Path Aliases:**
- No path aliases configured (all imports use relative paths)
- Test files import from `../src/` pattern

## Error Handling

**Patterns:**
- Try/catch blocks around async operations and network calls: `src/background/serviceWorker.ts` lines 102-105
- Runtime error checks use type guards: `typeof data === "object"`, `Array.isArray(clubGroups)`
- Chrome API errors checked via `chrome.runtime.lastError`: `src/background/serviceWorker.ts` line 53-55
- Null/undefined checks before property access: `if (!data || typeof data !== "object")` `src/popup/popup.ts` line 85
- Parse errors wrapped: `error instanceof Error ? error.message : String(error)` in `src/background/serviceWorker.ts` line 104

**Error Messages:**
- User-facing messages are meaningful: "Export failed", "Failed to clear data", "Invalid download format"
- Debug messages logged via `console.log` and `console.error`
- Error message transformation: `getDownloadErrorMessage()` provides context-specific messages `src/background/serviceWorker.ts` lines 27-38

## Logging

**Framework:** Native `console` object (no external logging library)

**Patterns:**
- Initialization logs: `console.log("TrackPull popup initialized")`
- State changes: `console.log("TrackPull extension installed")`, `console.log("TrackPull: Session data saved to storage")`
- Error logs: `console.error("Error loading popup data:", error)`, `console.error("TrackPull: Failed to save data:")`
- Debug data: `console.log("Popup loaded data:", data ? "has data" : "no data")`
- Log format includes feature prefix: "TrackPull: " prefix used in service worker

## Comments

**When to Comment:**
- Block comments at top of file explain purpose and related modules: `src/models/types.ts` lines 1-3, `src/shared/constants.ts` lines 1-4
- Inline comments explain algorithm or business logic: `src/models/types.ts` lines 45-46 ("Create map of club_name -> ClubGroup")
- Comments document assumptions: `src/shared/unit_normalization.ts` lines 18-20 describe Trackman parameter system
- Edge cases noted: `src/shared/html_table_parser.ts` line 16 documents HTMLElementHandle interface expectations

**JSDoc/TSDoc:**
- Minimal use; focus on exported public functions
- Type documentation via TypeScript interfaces rather than comments
- Example in `src/models/types.ts` line 38-39 for `mergeSessionData` function
- No @param/@return style docs, relying on type annotations

## Function Design

**Size:** Functions kept to single responsibility
- Data transformation functions: 10-50 lines
- UI event handlers: 15-40 lines
- Utility converters: 5-20 lines
- Complex algorithms use intermediate helper functions (e.g., `mergeSessionData` at 69 lines is decomposed logically by action)

**Parameters:**
- Explicit typed parameters always: `function normalizeMetricValue(rawValue: string | number, metric: string, unitSystem: UnitSystem, unitChoice: UnitChoice)`
- Optional parameters for configuration: `writeCsv(session: SessionData, includeAverages = true, metricOrder?: string[], unitChoice: UnitChoice = DEFAULT_UNIT_CHOICE)` in `src/shared/csv_writer.ts`
- Default values used for optional configs: `includeAverages = true`, `unitChoice: UnitChoice = DEFAULT_UNIT_CHOICE`
- Union types for polymorphic functions: `function normalizeMetricValue(rawValue: string | number | null, ...)`

**Return Values:**
- Explicit return types always: `function writeCsv(...): string`
- Union returns for success/failure patterns: `function convertDistance(value: number | string | null, ...): number | string | null`
- Nullable returns documented in code: `return null;` for invalid input, empty strings preserved from input
- Data classes returned for complex results: `TableExtractionResult` class wraps club name, headers, and rows

## Module Design

**Exports:**
- Named exports for utility functions: `export function writeCsv`, `export function normalizeMetricValue`
- Type exports separate: `export type UnitChoice`, `export interface SessionData`
- Constants exported: `export const ALL_METRICS`, `export const DEFAULT_UNIT_SYSTEM`
- Class exports for structured data: `export class TableCell`, `export class TableRow`
- Default exports never used

**Barrel Files:**
- No barrel files / index.ts re-exports (each module imports directly from source)
- Flat import structure preferred: `import { writeCsv } from "../shared/csv_writer"`

## Data Structures

**Interfaces for external data:**
- API responses and storage: `SessionData`, `ClubGroup`, `Shot`
- HTML parsing results: `TableCell`, `TableRow`, `TableData`, `TableExtractionResult`
- Type unions for literal values: `url_type: "report" | "activity"` in `SessionData`

**Records for maps:**
- `Record<string, MetricValue>` for dynamic metric storage
- `Record<string, string>` for lookup tables like `METRIC_DISPLAY_NAMES`
- `Map<string, ClubGroup>` used internally for efficient lookup in `mergeSessionData()`

---

*Convention analysis: 2026-03-02*
