/**
 * Tests for CSS selector-based HTML table parsing utilities using Node.js assert.
 */

import { strict as assert } from "assert";
import {
  TableCell,
  TableRow,
  TableData,
  TableExtractionResult,
} from "../src/shared/html_table_parser";

function testTableCell() {
  console.log("Testing TableCell...\n");
  
  // Test basic construction
  const cell = new TableCell(0, 1, "Driver");
  assert.strictEqual(cell.row_index, 0, "row_index should be 0");
  assert.strictEqual(cell.col_index, 1, "col_index should be 1");
  assert.strictEqual(cell.text, "Driver", "text should be 'Driver'");
  
  // Test with element handle
  const mockElement = {} as any;
  const cell2 = new TableCell(2, 3, "250.5", mockElement);
  assert.strictEqual(cell2.row_index, 2, "row_index should be 2");
  assert.strictEqual(cell2.col_index, 3, "col_index should be 3");
  assert.strictEqual(cell2.text, "250.5", "text should be '250.5'");
  assert.strictEqual(cell2.element, mockElement, "element should match");
  
  console.log("✓ TableCell tests passed\n");
}

function testTableRow() {
  console.log("Testing TableRow...\n");
  
  // Test empty row
  const row = new TableRow(0);
  assert.strictEqual(row.row_index, 0, "row_index should be 0");
  assert.strictEqual(row.cells.length, 0, "should have no cells");
  
  // Test row with cells
  const cell1 = new TableCell(0, 0, "Driver");
  const cell2 = new TableCell(0, 1, "250.5");
  const row2 = new TableRow(0, [cell1, cell2]);
  
  assert.strictEqual(row2.row_index, 0, "row_index should be 0");
  assert.strictEqual(row2.cells.length, 2, "should have 2 cells");
  assert.strictEqual(row2.get_cell_text(0), "Driver", "get_cell_text(0) should return 'Driver'");
  assert.strictEqual(row2.get_cell_text(1), "250.5", "get_cell_text(1) should return '250.5'");
  
  // Test out of range cell
  const row3 = new TableRow(0, [new TableCell(0, 0, "test")]);
  assert.strictEqual(row3.get_cell_text(5), "", "out of range should return empty string");
  
  console.log("✓ TableRow tests passed\n");
}

function testTableData() {
  console.log("Testing TableData...\n");
  
  // Test empty table
  const table = new TableData();
  assert.strictEqual(table.rows.length, 0, "should have no rows");
  assert.strictEqual(table.header_row, undefined, "header_row should be undefined");
  assert.strictEqual(table.footer_rows.length, 0, "footer_rows should be empty");
  
  // Test table with rows
  const row1 = new TableRow(0, [new TableCell(0, 0, "Header")]);
  const row2 = new TableRow(1, [new TableCell(1, 0, "Data")]);
  const table2 = new TableData([row1, row2], 0);
  
  assert.strictEqual(table2.rows.length, 2, "should have 2 rows");
  assert.strictEqual(table2.header_row, 0, "header_row should be 0");
  
  console.log("✓ TableData tests passed\n");
}

function testTableExtractionResult() {
  console.log("Testing TableExtractionResult...\n");
  
  // Test creation with all fields
  const result = new TableExtractionResult(
    "Driver",
    ["Club Speed", "Ball Speed"],
    [{ "Club Speed": "105.2" }, { "Club Speed": "106.1" }]
  );
  
  assert.strictEqual(result.club_name, "Driver", "club_name should be 'Driver'");
  assert.strictEqual(result.metric_headers.length, 2, "should have 2 metric headers");
  assert.strictEqual(result.shot_rows.length, 2, "should have 2 shot rows");
  
  // Test empty result
  const emptyResult = new TableExtractionResult("Unknown", [], []);
  assert.strictEqual(emptyResult.club_name, "Unknown", "club_name should be 'Unknown'");
  assert.deepStrictEqual(emptyResult.metric_headers, [], "metric_headers should be empty array");
  assert.deepStrictEqual(emptyResult.shot_rows, [], "shot_rows should be empty array");
  
  // Test with averages and consistency
  const resultWithExtras = new TableExtractionResult(
    "Driver",
    ["Club Speed"],
    [],
    { ClubSpeed: "105.2" },
    { ClubSpeed: "+1.2" }
  );
  
  assert.strictEqual(resultWithExtras.club_name, "Driver", "club_name should be 'Driver'");
  assert.strictEqual(resultWithExtras.averages.ClubSpeed, "105.2", "averages.ClubSpeed should be '105.2'");
  assert.strictEqual(resultWithExtras.consistency.ClubSpeed, "+1.2", "consistency.ClubSpeed should be '+1.2'");
  
  console.log("✓ TableExtractionResult tests passed\n");
}

// Run all tests
try {
  testTableCell();
  testTableRow();
  testTableData();
  testTableExtractionResult();
  
  console.log("\n=========================================");
  console.log("All HTML table parser tests passed! ✓");
  console.log("=========================================\n");
} catch (error) {
  console.error("\n❌ Test failed:", error);
  process.exit(1);
}
