/**
 * Tests for CSS selector-based HTML table parsing utilities.
 */

import { describe, it, expect } from "vitest";
import {
  TableCell,
  TableRow,
  TableData,
  TableExtractionResult,
} from "../src/shared/html_table_parser";

describe("TableCell", () => {
  it("stores row index, col index, and text", () => {
    const cell = new TableCell(0, 1, "Driver");
    expect(cell.row_index).toBe(0);
    expect(cell.col_index).toBe(1);
    expect(cell.text).toBe("Driver");
  });

  it("stores optional element handle", () => {
    const mockElement = {} as any;
    const cell = new TableCell(2, 3, "250.5", mockElement);
    expect(cell.row_index).toBe(2);
    expect(cell.col_index).toBe(3);
    expect(cell.text).toBe("250.5");
    expect(cell.element).toBe(mockElement);
  });
});

describe("TableRow", () => {
  it("creates empty row", () => {
    const row = new TableRow(0);
    expect(row.row_index).toBe(0);
    expect(row.cells.length).toBe(0);
  });

  it("creates row with cells and retrieves text", () => {
    const cell1 = new TableCell(0, 0, "Driver");
    const cell2 = new TableCell(0, 1, "250.5");
    const row = new TableRow(0, [cell1, cell2]);

    expect(row.row_index).toBe(0);
    expect(row.cells.length).toBe(2);
    expect(row.get_cell_text(0)).toBe("Driver");
    expect(row.get_cell_text(1)).toBe("250.5");
  });

  it("returns empty string for out of range cell", () => {
    const row = new TableRow(0, [new TableCell(0, 0, "test")]);
    expect(row.get_cell_text(5)).toBe("");
  });
});

describe("TableData", () => {
  it("creates empty table", () => {
    const table = new TableData();
    expect(table.rows.length).toBe(0);
    expect(table.header_row).toBeUndefined();
    expect(table.footer_rows.length).toBe(0);
  });

  it("creates table with rows and header", () => {
    const row1 = new TableRow(0, [new TableCell(0, 0, "Header")]);
    const row2 = new TableRow(1, [new TableCell(1, 0, "Data")]);
    const table = new TableData([row1, row2], 0);

    expect(table.rows.length).toBe(2);
    expect(table.header_row).toBe(0);
  });
});

describe("TableExtractionResult", () => {
  it("creates result with all fields", () => {
    const result = new TableExtractionResult(
      "Driver",
      ["Club Speed", "Ball Speed"],
      [{ "Club Speed": "105.2" }, { "Club Speed": "106.1" }]
    );

    expect(result.club_name).toBe("Driver");
    expect(result.metric_headers.length).toBe(2);
    expect(result.shot_rows.length).toBe(2);
  });

  it("creates empty result", () => {
    const emptyResult = new TableExtractionResult("Unknown", [], []);
    expect(emptyResult.club_name).toBe("Unknown");
    expect(emptyResult.metric_headers).toEqual([]);
    expect(emptyResult.shot_rows).toEqual([]);
  });

  it("creates result with averages and consistency", () => {
    const result = new TableExtractionResult(
      "Driver",
      ["Club Speed"],
      [],
      { ClubSpeed: "105.2" },
      { ClubSpeed: "+1.2" }
    );

    expect(result.club_name).toBe("Driver");
    expect(result.averages.ClubSpeed).toBe("105.2");
    expect(result.consistency.ClubSpeed).toBe("+1.2");
  });
});
