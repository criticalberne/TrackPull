# Testing Patterns

**Analysis Date:** 2026-03-02

## Test Framework

**Runner:**
- vitest ^4.0.18
- Config: `vitest.config.ts`

**Assertion Library:**
- vitest built-in `expect()` (from chai)

**Run Commands:**
```bash
npx vitest run              # Run all tests in src/test_*.ts files
npx vitest watch            # Watch mode (if supported)
npm test                    # Currently reports "no test specified" (scripts not configured)
```

## Test File Organization

**Location:**
- All tests co-located in `tests/` directory at project root
- NOT alongside source files (separate from `src/`)

**Naming:**
- Pattern: `test_*.ts` (e.g., `test_csv_writer_units.ts`, `test_unit_normalization.ts`)
- Configured via `vitest.config.ts` include pattern: `["tests/test_*.ts"]`
- File naming matches component: `test_csv_writer_units.ts` tests `src/shared/csv_writer.ts`

**Structure:**
```
tests/
├── test_csv_writer_units.ts       # CSV header labels and conversion
├── test_extract_club_and_metrics.ts # HTML table parsing
├── test_html_table_parser.ts       # Table data structure classes
├── test_multi_page_merge.ts        # SessionData merging
├── test_storage_keys.ts            # Storage key definitions
├── test_toast_error_handling.ts    # Error UI and toast patterns
└── test_unit_normalization.ts      # Unit conversion and system definitions
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, it, expect } from "vitest";

describe("Unit Parameter Extraction", () => {
  it("extracts nd_* parameters correctly", () => {
    const metadataParams = {
      nd_001: "789012",
      r: "12345",
      "mp[]": "Carry",
    };

    const result = extractUnitParams(metadataParams);

    expect(result).toEqual({
      "001": "789012",
    });
  });
});
```

**Patterns:**
- `describe()` blocks group related tests by functionality: "Unit Parameter Extraction", "Distance Conversion", "CSV Writer headers"
- Each `it()` tests a single behavior: "extracts nd_* parameters correctly", "converts meters to yards"
- Setup uses helper functions defined at module level: `makeSession()` in `test_csv_writer_units.ts`, `createMockSession()` in `test_multi_page_merge.ts`
- No teardown/cleanup needed (all tests are pure function calls with no side effects)

## Mocking

**Framework:** No external mocking library (vitest has built-in support)

**Patterns:**
```typescript
// Mock objects created manually
interface MockElement {
  innerText: string;
  querySelector: (selector: string) => MockElement | null;
  querySelectorAll: (selector: string) => MockNodeList;
}

interface MockNodeList {
  length: number;
  [index: number]: MockElement;
  item: (index: number) => MockElement | null;
}

function createMockNodeList(elements: MockElement[]): MockNodeList {
  const list = elements as unknown as MockNodeList;
  list.length = elements.length;
  list.item = (index: number) => elements[index] || null;
  return list;
}

// Usage in test
const mockDocument: MockDocument = {
  querySelector: () => null,
  querySelectorAll: () => createMockNodeList([]),
};
const parser = new TableParser(mockDocument as any);
```

**What to Mock:**
- HTML DOM elements and document methods (querySelector/querySelectorAll)
- Chrome API responses would be mocked if network/storage operations were tested
- Mock objects implement interfaces matching actual objects they replace

**What NOT to Mock:**
- Pure utility functions: always call real implementations (e.g., `convertDistance`, `normalizeMetricValue`)
- Data transformation functions: test with real data
- Class instantiation: create real instances with mock dependencies

## Fixtures and Factories

**Test Data:**
```typescript
// CSV Writer test helper
function makeSession(
  metrics: Record<string, string | number>,
  metricNames: string[],
  metadataParams: Record<string, string> = { nd_001: "789012" }
): SessionData {
  return {
    date: "2025-01-15",
    report_id: "test-123",
    url_type: "report",
    metric_names: metricNames,
    metadata_params: metadataParams,
    club_groups: [
      {
        club_name: "7 Iron",
        shots: [{ shot_number: 0, metrics }],
        averages: {},
        consistency: {},
      },
    ],
  };
}

// Usage
const session = makeSession({ ClubSpeed: "44.704" }, ["ClubSpeed"]);
```

**Location:**
- Factories defined at top of each test file
- Helper constants defined at module level:
  ```typescript
  const imperial: UnitChoice = { speed: "mph", distance: "yards" };
  const metric: UnitChoice = { speed: "m/s", distance: "meters" };
  const mphMeters: UnitChoice = { speed: "mph", distance: "meters" };
  ```
- File-scoped; shared fixtures would use module-level functions

## Coverage

**Requirements:** Not enforced (no coverage threshold in config)

**View Coverage:** Not configured in current setup

## Test Types

**Unit Tests:**
- Scope: Individual functions and utilities (majority of test suite)
- Approach: Pure function testing with inputs and expected outputs
- Examples:
  - `test_unit_normalization.ts`: Tests conversion functions `convertDistance`, `convertSpeed`, `convertAngle` with various unit combinations (781 lines of comprehensive coverage)
  - `test_csv_writer_units.ts`: Tests CSV header generation and metric conversion (332 lines, 10+ describe blocks)
  - `test_html_table_parser.ts`: Tests data structure classes `TableCell`, `TableRow`, `TableData`, `TableExtractionResult`

**Integration Tests:**
- Scope: Multi-component workflows and data flows
- Approach: Create realistic data scenarios and verify end-to-end behavior
- Examples:
  - `test_multi_page_merge.ts`: Tests `mergeSessionData` combining multiple session pages
  - `test_csv_writer_units.ts`: Tests full CSV generation with unit conversion (real data → CSV output)
  - `test_unit_normalization.ts` "Integration" suites: Full unit system conversion flows

**E2E Tests:**
- Not currently used
- Chrome extension UI interactions would require browser automation (not implemented)

## Common Patterns

**Async Testing:**
```typescript
// Chrome API mocking with promises
const result = await new Promise<Record<string, unknown>>((resolve) => {
  chrome.storage.local.get([STORAGE_KEYS.TRACKMAN_DATA], resolve);
});

// In tests - typically not async since utilities are synchronous
// UI event tests would need async/await if implemented
```

**Error Testing:**
```typescript
// Test for null handling
it("returns null for null input", () => {
  const result = convertDistance(null, "yards", "meters");
  expect(result).toBeNull();
});

// Test for invalid input handling
it("handles invalid numeric strings gracefully", () => {
  const result = convertDistance("abc", "yards", "meters");
  expect(result).toBe("abc"); // Returns original for invalid input
});

// Test for empty string preservation
it("returns empty string for empty string input", () => {
  const result = convertDistance("", "yards", "meters");
  expect(result).toBe("");
});
```

## Test Data Scenarios

**Unit Conversion Testing:**
- Comprehensive cross-unit conversion verification: meters ↔ yards, degrees ↔ radians, mph ↔ km/h ↔ m/s
- Boundary tests: 0, negative values, very large values
- Type flexibility: handles number, string, null inputs
- Example from `test_unit_normalization.ts` lines 147-195 (Distance Conversion describe block)

**CSV Generation Testing:**
- Tests multiple unit choice combinations: imperial (mph+yards), metric (m/s+meters), hybrid (mph+meters, m/s+yards)
- Header format verification with unit labels
- Value conversion correctness verification
- Example: `test_csv_writer_units.ts` tests all 4 unit combinations across speed, distance, angle metrics

**Data Merging Testing:**
- Tests session data from multiple pages being merged
- Verifies shot data consolidation and metric aggregation
- Example: `test_multi_page_merge.ts` creates 2-page sessions and verifies merged output

## Special Test Cases

**Rounding and Precision:**
- `test_unit_normalization.ts` lines 385-389: Tests that normalized values round to 1 decimal place
- `test_unit_normalization.ts` lines 763-780: Special handling for SpinRate (rounds to whole numbers, not 1 decimal)
- Floating point comparisons use `toBeCloseTo()` with precision argument

**Small Distance Metrics:**
- `test_unit_normalization.ts` lines 687-761: Tests for LowPointDistance (inches/cm conversion separate from regular distance)
- Special handling because values are too small for yards/meters

**Fixed Unit Labels:**
- `test_csv_writer_units.ts` lines 216-252: Tests metrics with fixed units regardless of user preference
  - SpinRate always has "rpm"
  - HangTime always has "s"
  - LandingAngle always has "°"

**Legacy Preference Migration:**
- `test_unit_normalization.ts` lines 632-648: Tests `migrateLegacyPref` converting old string preferences ("imperial", "metric", "hybrid") to new UnitChoice objects

## Known Test Characteristics

- **Stateless:** All tests are pure; no shared state between tests
- **Fast:** All unit conversions and CSV generation tested synchronously
- **Isolated:** Mock objects prevent DOM/Chrome API dependencies
- **Deterministic:** No random data; all values reproducible
- **Readable:** Test names clearly describe what is being tested and expected outcome

---

*Testing analysis: 2026-03-02*
