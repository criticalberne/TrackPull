/**
 * Tests for extracting club name, metric headers, and shot rows.
 */

import { describe, it, expect } from "vitest";
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

describe("extract_club_and_metrics", () => {
  it("returns Unknown club when no wrapper found", async () => {
    const mockDocument: MockDocument = {
      querySelector: () => null,
      querySelectorAll: () => createMockNodeList([]),
    };
    const parser = new TableParser(mockDocument as any);
    const result = await parser.extract_club_and_metrics(".nonexistent", "table", "tr");
    expect(result.club_name).toBe("Unknown");
  });

  it("returns Unknown club when no rows found", async () => {
    const mockTable: MockElement = { innerText: "", querySelector: () => null, querySelectorAll: () => createMockNodeList([]) };
    const mockDocument: MockDocument = { querySelector: () => mockTable, querySelectorAll: () => createMockNodeList([mockTable]) };
    const parser = new TableParser(mockDocument as any);
    const result = await parser.extract_club_and_metrics(".wrapper", "table", "tr");
    expect(result.club_name).toBe("Unknown");
  });

  it("extracts club name from basic data", async () => {
    const mockClubCell: MockElement = {
      innerText: "Driver",
      querySelector: () => null,
      querySelectorAll: () => createMockNodeList([]),
    };

    const mockRow: MockElement = {
      innerText: "",
      querySelector: () => null,
      querySelectorAll: (sel: string) => sel === "td" ? createMockNodeList([mockClubCell]) : createMockNodeList([]),
    };

    const mockTable: MockElement = {
      innerText: "",
      querySelector: () => null,
      querySelectorAll: (sel: string) => {
        if (sel === "tr") return createMockNodeList([mockRow]);
        if (sel === ".wrapper" || sel === "#wrapper") return createMockNodeList([mockTable]);
        return createMockNodeList([]);
      },
    };

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
    expect(result.club_name).toBe("Driver");
  });

  it("extracts metric headers when param names row exists", async () => {
    const mockParamName: MockElement = { innerText: "Club Speed", querySelector: () => null, querySelectorAll: () => createMockNodeList([]) };
    const mockParamRow: MockElement = {
      innerText: "",
      querySelector: () => null,
      querySelectorAll: (sel: string) => sel === ".parameter-name" ? createMockNodeList([mockParamName]) : createMockNodeList([]),
    };

    const mockClubCell: MockElement = { innerText: "Driver", querySelector: () => null, querySelectorAll: () => createMockNodeList([]) };

    const mockRow: MockElement = {
      innerText: "",
      querySelector: () => null,
      querySelectorAll: (sel: string) => sel === "td" ? createMockNodeList([mockClubCell]) : createMockNodeList([]),
    };

    const mockTable: MockElement = {
      innerText: "",
      querySelector: () => null,
      querySelectorAll: (sel: string) => sel === "tr" ? createMockNodeList([mockRow]) : createMockNodeList([]),
    };

    const mockWrapper: MockElement = {
      innerText: "Results",
      querySelector: () => null,
      querySelectorAll: (sel: string) => sel === "table" ? createMockNodeList([mockTable]) : createMockNodeList([]),
    };

    let paramQueryCalled = false;
    const mockDocument: MockDocument = {
      querySelector: (sel: string) => {
        if (sel === ".wrapper") return mockWrapper;
        if (sel === ".param-names-row") { paramQueryCalled = true; return mockParamRow; }
        return null;
      },
      querySelectorAll: () => createMockNodeList([mockWrapper]),
    };

    const parser = new TableParser(mockDocument as any);
    const result = await parser.extract_club_and_metrics(".wrapper", "table", "tr", "td", ".param-names-row", ".parameter-name");
    expect(result.club_name).toBe("Driver");
    expect(paramQueryCalled).toBe(true);
  });

  it("maps shot rows with metric headers", async () => {
    const mockParamName1: MockElement = { innerText: "Club Speed", querySelector: () => null, querySelectorAll: () => createMockNodeList([]) };
    const mockParamName2: MockElement = { innerText: "Ball Speed", querySelector: () => null, querySelectorAll: () => createMockNodeList([]) };

    const mockParamRow: MockElement = {
      innerText: "",
      querySelector: () => null,
      querySelectorAll: (sel: string) => sel === ".parameter-name" ? createMockNodeList([mockParamName1, mockParamName2]) : createMockNodeList([]),
    };

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

    const mockTable: MockElement = {
      innerText: "",
      querySelector: () => null,
      querySelectorAll: (sel: string) => sel === "tr" ? createMockNodeList([mockHeaderRow, mockShot1, mockShot2]) : createMockNodeList([]),
    };

    const mockWrapper: MockElement = {
      innerText: "Results",
      querySelector: () => null,
      querySelectorAll: (sel: string) => sel === "table" ? createMockNodeList([mockTable]) : createMockNodeList([]),
    };

    const mockDocument: MockDocument = {
      querySelector: (sel: string) => sel === ".wrapper" ? mockWrapper : (sel === ".param-names-row" ? mockParamRow : null),
      querySelectorAll: () => createMockNodeList([mockWrapper]),
    };

    const parser = new TableParser(mockDocument as any);
    const result = await parser.extract_club_and_metrics(".wrapper", "table", "tr", "td", ".param-names-row", ".parameter-name");
    expect(result.club_name).toBe("Driver");
    expect(result.metric_headers.length).toBe(2);
    expect(result.shot_rows.length).toBe(2);
  });
});
