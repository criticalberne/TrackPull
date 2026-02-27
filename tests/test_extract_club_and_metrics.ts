/**
 * Tests for extracting club name, metric headers, and shot rows.
 */

import * as assert from "node:assert";
import { TableParser } from "../src/shared/html_table_parser.ts";

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

interface MockDocument {
  querySelector: (selector: string) => MockElement | null;
  querySelectorAll: (selector: string) => MockNodeList;
}

async function testExtractClubAndMetrics_NoWrapper() {
  console.log("Testing extract_club_and_metrics with no wrapper...\n");
  const mockDocument: MockDocument = {
    querySelector: () => null,
    querySelectorAll: () => createMockNodeList([]),
  };
  const parser = new TableParser(mockDocument as any);
  const result = await parser.extract_club_and_metrics(".nonexistent", "table", "tr");
  assert.strictEqual(result.club_name, "Unknown");
  console.log("✓ No wrapper test passed\n");
}

async function testExtractClubAndMetrics_NoRows() {
  console.log("Testing extract_club_and_metrics with no rows...\n");
  const mockTable: MockElement = { innerText: "", querySelector: () => null, querySelectorAll: () => createMockNodeList([]) };
  const mockDocument: MockDocument = { querySelector: () => mockTable, querySelectorAll: () => createMockNodeList([mockTable]) };
  const parser = new TableParser(mockDocument as any);
  const result = await parser.extract_club_and_metrics(".wrapper", "table", "tr");
  assert.strictEqual(result.club_name, "Unknown");
  console.log("✓ No rows test passed\n");
}

async function testExtractClubAndMetrics_Basic() {
  console.log("Testing extract_club_and_metrics with basic data...\n");
  
  const mockClubCell: MockElement = { 
    innerText: "Driver", 
    querySelector: () => null, 
    querySelectorAll: () => createMockNodeList([]) 
  };

  // Row - returns cells when queried for td
  const mockRow: MockElement = {
    innerText: "",
    querySelector: () => null,
    querySelectorAll: (sel: string) => sel === "td" ? createMockNodeList([mockClubCell]) : createMockNodeList([]),
  };

  // Table - returns rows when queried for tr, and itself when queried for table (from wrapper context)
  const mockTable: MockElement = {
    innerText: "",
    querySelector: () => null,
    querySelectorAll: (sel: string) => {
      if (sel === "tr") return createMockNodeList([mockRow]);
      // When called from wrapper, table should find itself  
      if (sel === ".wrapper" || sel === "#wrapper") return createMockNodeList([mockTable]);
      return createMockNodeList([]);
    },
  };

  // Wrapper - same as table in this test (document.querySelector(".wrapper") returns it)
  const mockWrapper: MockElement = {
    innerText: "Results",
    querySelector: () => null,
    querySelectorAll: (sel: string) => sel === "table" ? createMockNodeList([mockTable]) : createMockNodeList([]),
  };

  const mockDocument: MockDocument = {
    querySelector: (sel: string) => sel === ".wrapper" ? mockWrapper : null,
    querySelectorAll: () => createMockNodeList([mockWrapper]),
  };

  const parser = new TableParser(mockDocument as any);
  const result = await parser.extract_club_and_metrics(".wrapper", "table", "tr");
  assert.strictEqual(result.club_name, "Driver");
  console.log("✓ Basic extraction test passed\n");
}

async function testExtractClubAndMetrics_WithMetricHeaders() {
  console.log("Testing extract_club_and_metrics with metric headers...\n");
  
  const mockParamName: MockElement = { innerText: "Club Speed", querySelector: () => null, querySelectorAll: () => createMockNodeList([]) };
  const mockParamRow: MockElement = {
    innerText: "",
    querySelector: () => null,
    querySelectorAll: (sel: string) => sel === ".parameter-name" ? createMockNodeList([mockParamName]) : createMockNodeList([]),
  };

  const mockClubCell: MockElement = { innerText: "Driver", querySelector: () => null, querySelectorAll: () => createMockNodeList([]) };
  
  // Row - returns cells when queried for td
  const mockRow2: MockElement = {
    innerText: "",
    querySelector: () => null,
    querySelectorAll: (sel: string) => sel === "td" ? createMockNodeList([mockClubCell]) : createMockNodeList([]),
  };

  // Table - returns rows when queried for tr  
  const mockTable2: MockElement = {
    innerText: "",
    querySelector: () => null,
    querySelectorAll: (sel: string) => sel === "tr" ? createMockNodeList([mockRow2]) : createMockNodeList([]),
  };

  // Wrapper - returns table when queried for table
  const mockWrapper2: MockElement = {
    innerText: "Results",
    querySelector: () => null,
    querySelectorAll: (sel: string) => sel === "table" ? createMockNodeList([mockTable2]) : createMockNodeList([]),
  };

  let paramQueryCalled = false;
  const mockDocument2: MockDocument = {
    querySelector: (sel: string) => {
      if (sel === ".wrapper") return mockWrapper2;
      if (sel === ".param-names-row") { paramQueryCalled = true; return mockParamRow; }
      return null;
    },
    querySelectorAll: () => createMockNodeList([mockWrapper2]),
  };
  
  const parser = new TableParser(mockDocument2 as any);
  const result = await parser.extract_club_and_metrics(".wrapper", "table", "tr", "td", ".param-names-row", ".parameter-name");
  assert.strictEqual(result.club_name, "Driver");
  assert.ok(paramQueryCalled);
  console.log("✓ Metric headers test passed\n");
}

async function testExtractClubAndMetrics_ShotRowsMapping() {
  console.log("Testing extract_club_and_metrics with shot rows mapping...\n");
  
  const mockParamName1: MockElement = { innerText: "Club Speed", querySelector: () => null, querySelectorAll: () => createMockNodeList([]) };
  const mockParamName2: MockElement = { innerText: "Ball Speed", querySelector: () => null, querySelectorAll: () => createMockNodeList([]) };
  
  const mockParamRow: MockElement = {
    innerText: "",
    querySelector: () => null,
    querySelectorAll: (sel: string) => sel === ".parameter-name" ? createMockNodeList([mockParamName1, mockParamName2]) : createMockNodeList([]),
  };

  // Header row - gets skipped because metric_headers exist
  const headerCells = [
    { innerText: "Driver", querySelector: () => null, querySelectorAll: () => createMockNodeList([]) },
    { innerText: "", querySelector: () => null, querySelectorAll: () => createMockNodeList([]) },
  ];
  
  const mockHeaderRow: MockElement = {
    innerText: "Header",
    querySelector: () => null,
    querySelectorAll: (sel: string) => sel === "td" ? createMockNodeList(headerCells as any) : createMockNodeList([]),
  };

  const shot1Cells = [
    { innerText: "Driver", querySelector: () => null, querySelectorAll: () => createMockNodeList([]) },
    { innerText: "105.2", querySelector: () => null, querySelectorAll: () => createMockNodeList([]) },
  ];
  
  const mockShot1: MockElement = {
    innerText: "",
    querySelector: () => null,
    querySelectorAll: (sel: string) => sel === "td" ? createMockNodeList(shot1Cells as any) : createMockNodeList([]),
  };

  const shot2Cells = [
    { innerText: "Driver", querySelector: () => null, querySelectorAll: () => createMockNodeList([]) },
    { innerText: "106.1", querySelector: () => null, querySelectorAll: () => createMockNodeList([]) },
  ];

  const mockShot2: MockElement = {
    innerText: "",
    querySelector: () => null,
    querySelectorAll: (sel: string) => sel === "td" ? createMockNodeList(shot2Cells as any) : createMockNodeList([]),
  };

  // Table - returns rows when queried for tr  
  const mockTable3: MockElement = {
    innerText: "",
    querySelector: () => null,
    querySelectorAll: (sel: string) => sel === "tr" ? createMockNodeList([mockHeaderRow, mockShot1, mockShot2]) : createMockNodeList([]),
  };

  // Wrapper - returns table when queried for table  
  const mockWrapper3: MockElement = {
    innerText: "Results",
    querySelector: () => null,
    querySelectorAll: (sel: string) => sel === "table" ? createMockNodeList([mockTable3]) : createMockNodeList([]),
  };

  const mockDocument3: MockDocument = {
    querySelector: (sel: string) => sel === ".wrapper" ? mockWrapper3 : (sel === ".param-names-row" ? mockParamRow : null),
    querySelectorAll: () => createMockNodeList([mockWrapper3]),
  };

  const parser = new TableParser(mockDocument3 as any);
  const result = await parser.extract_club_and_metrics(".wrapper", "table", "tr", "td", ".param-names-row", ".parameter-name");
  console.log("Result:", { club_name: result.club_name, metric_headers_count: result.metric_headers.length, shot_rows_count: result.shot_rows.length });
  assert.strictEqual(result.club_name, "Driver");
  assert.strictEqual(result.metric_headers.length, 2);
  assert.strictEqual(result.shot_rows.length, 2);
  console.log("✓ Shot rows mapping test passed\n");
}

async function runAllTests() {
  try {
    console.log("\n=== STARTING EXTRACTION TESTS ===\n");
    await testExtractClubAndMetrics_NoWrapper();
    await testExtractClubAndMetrics_NoRows();
    await testExtractClubAndMetrics_Basic();
    await testExtractClubAndMetrics_WithMetricHeaders();
    await testExtractClubAndMetrics_ShotRowsMapping();
    console.log("=========================================");
    console.log("All extraction tests passed! ✓");
    console.log("=========================================\n");
  } catch (error) {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  }
}

runAllTests();
