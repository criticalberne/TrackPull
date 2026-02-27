/**
 * CSS selector-based HTML table parsing utilities for Trackman reports.
 * Based on Python scraper table_parser.py implementation.
 */

import {
  CSS_PARAM_NAME,
  CSS_PARAM_NAMES_ROW,
  CSS_AVERAGE_VALUES,
  CSS_CONSISTENCY_VALUES,
  CSS_RESULTS_TABLE,
  CSS_RESULTS_WRAPPER,
  CSS_SHOT_DETAIL_ROW,
} from "./constants";

interface HTMLElementHandle {
  innerText: string;
  querySelector(selector: string): HTMLElement | null;
  querySelectorAll(selector: string): NodeListOf<HTMLElement>;
}

/**
 * Represents a single cell in an HTML table.
 */
export class TableCell {
  row_index: number;
  col_index: number;
  text: string;
  element?: HTMLElementHandle;

  constructor(
    row_index: number,
    col_index: number,
    text: string,
    element?: HTMLElementHandle
  ) {
    this.row_index = row_index;
    this.col_index = col_index;
    this.text = text;
    this.element = element;
  }
}

/**
 * Represents a row in an HTML table.
 */
export class TableRow {
  row_index: number;
  cells: TableCell[] = [];

  constructor(row_index: number, cells?: TableCell[]) {
    this.row_index = row_index;
    if (cells) {
      this.cells.push(...cells);
    }
  }

  get_cell_text(col_index: number): string {
    if (col_index >= 0 && col_index < this.cells.length) {
      return this.cells[col_index].text;
    }
    return "";
  }
}

/**
 * Parsed table data with metadata.
 */
export class TableData {
  rows: TableRow[] = [];
  header_row?: number | null;
  footer_rows: number[] = [];

  constructor(rows?: TableRow[], header_row?: number | null) {
    if (rows) {
      this.rows.push(...rows);
    }
    this.header_row = header_row;
  }
}

/**
 * Structured result of extracting club name, headers, and rows from a table.
 */
export class TableExtractionResult {
  club_name: string;
  metric_headers: string[];
  shot_rows: Record<string, string>[];
  averages: Record<string, string> = {};
  consistency: Record<string, string> = {};

  constructor(
    club_name: string,
    metric_headers: string[],
    shot_rows: Record<string, string>[],
    averages?: Record<string, string>,
    consistency?: Record<string, string>
  ) {
    this.club_name = club_name;
    this.metric_headers = metric_headers;
    this.shot_rows = shot_rows;
    if (averages) Object.assign(this.averages, averages);
    if (consistency) Object.assign(this.consistency, consistency);
  }
}

/**
 * CSS selector-based HTML table parser.
 */
export class TableParser {
  private document: Document;

  constructor(document: Document) {
    this.document = document;
  }

  /**
   * Find an element using a CSS selector.
   */
  find_element_by_css(css_selector: string): HTMLElement | null {
    try {
      return this.document.querySelector(css_selector);
    } catch (e) {
      console.error(`Error finding element with selector '${css_selector}':`, e);
      return null;
    }
  }

  /**
   * Find multiple elements using a CSS selector.
   */
  find_elements_by_css(css_selector: string): HTMLElement[] {
    try {
      const elements = this.document.querySelectorAll(css_selector);
      if (Array.isArray(elements)) {
        return elements;
      }
      return Array.from(elements as unknown as Iterable<HTMLElement>);
    } catch (e) {
      console.error(`Error finding elements with selector '${css_selector}':`, e);
      return [];
    }
  }

  /**
   * Extract data from multiple tables on a page.
   */
  async extract_table_data(
    wrapper_selector: string,
    table_selector: string,
    row_selector: string,
    cell_selector: string = "td"
  ): Promise<TableData[]> {
    const tables_data: TableData[] = [];

    const wrapper = this.find_element_by_css(wrapper_selector);
    if (!wrapper) {
      console.warn(`Wrapper element not found: ${wrapper_selector}`);
      return tables_data;
    }

    const tables = wrapper.querySelectorAll(table_selector);
    if (tables.length === 0) {
      console.warn(`No tables found in wrapper: ${table_selector}`);
      return tables_data;
    }

    for (let table_idx = 0; table_idx < tables.length; table_idx++) {
      try {
        const table_element = tables[table_idx];
        const table_data = await this._parse_table(
          table_element,
          row_selector,
          cell_selector
        );
        if (table_data.rows.length > 0) {
          tables_data.push(table_data);
        }
      } catch (e) {
        console.error(`Error parsing table ${table_idx}:`, e);
      }
    }

    return tables_data;
  }

  /**
   * Parse a single table element into structured data.
   */
  private async _parse_table(
    table_element: HTMLElement,
    row_selector: string,
    cell_selector: string
  ): Promise<TableData> {
    const table_data = new TableData();
    const rows = table_element.querySelectorAll(row_selector);

    for (let row_idx = 0; row_idx < rows.length; row_idx++) {
      try {
        const row = rows[row_idx];
        const cell_elements = row.querySelectorAll(cell_selector);
        const cells: TableCell[] = [];

        for (let col_idx = 0; col_idx < cell_elements.length; col_idx++) {
          const cell_elem = cell_elements[col_idx] as HTMLElement;
          const text = cell_elem.innerText.trim();
          cells.push(
            new TableCell(row_idx, col_idx, text, {
              innerText: text,
              querySelector: (sel) => cell_elem.querySelector(sel),
              querySelectorAll: (sel) => cell_elem.querySelectorAll(sel),
            })
          );
        }

        if (cells.length > 0) {
          table_data.rows.push(new TableRow(row_idx, cells));
        }
      } catch (e) {
        console.error(`Error parsing row ${row_idx}:`, e);
      }
    }

    return table_data;
  }

  /**
   * Extract text values from a row's cells.
   */
  async extract_row_values(
    row_element: HTMLElement,
    skip_first_n: number = 0
  ): Promise<string[]> {
    const tds = row_element.querySelectorAll("td");
    const values: string[] = [];

    for (let i = 0; i < tds.length; i++) {
      if (i >= skip_first_n) {
        const value = tds[i].innerText.trim();
        values.push(value);
      }
    }

    return values;
  }

  /**
   * Extract metric/column names from a header row.
   */
  async extract_metric_names(
    row_element: HTMLElement,
    name_selector: string = CSS_PARAM_NAME
  ): Promise<string[]> {
    const name_elements = row_element.querySelectorAll(name_selector);
    const names: string[] = [];

    for (const elem of Array.from(name_elements) as HTMLElement[]) {
      const name = elem.innerText.trim();
      if (name) {
        names.push(name);
      }
    }

    return names;
  }

  /**
   * Extract average values from an averages row.
   */
  async extract_averages(
    row_element: HTMLElement,
    metric_headers: string[]
  ): Promise<Record<string, string>> {
    const averages: Record<string, string> = {};
    const values = await this._extract_row_values(
      row_element,
      metric_headers.length,
      2
    );

    for (let i = 0; i < metric_headers.length; i++) {
      if (i < values.length && values[i]) {
        averages[metric_headers[i]] = values[i];
      }
    }

    return averages;
  }

  /**
   * Extract consistency values from a consistency row.
   */
  async extract_consistency(
    row_element: HTMLElement,
    metric_headers: string[]
  ): Promise<Record<string, string>> {
    const consistency: Record<string, string> = {};
    const values = await this._extract_row_values(
      row_element,
      metric_headers.length,
      2
    );

    for (let i = 0; i < metric_headers.length; i++) {
      if (i < values.length && values[i]) {
        consistency[metric_headers[i]] = values[i];
      }
    }

    return consistency;
  }

  /**
   * Extract text values from a row's cells with count limit.
   */
  private async _extract_row_values(
    row_element: HTMLElement,
    num_columns: number,
    skip_first: number = 0
  ): Promise<string[]> {
    const tds = row_element.querySelectorAll("td");
    const values: string[] = [];

    for (let i = 0; i < tds.length; i++) {
      if (i >= skip_first && values.length < num_columns) {
        const value = tds[i].innerText.trim();
        values.push(value);
      }
    }

    return values;
  }

  /**
   * Extract club name, metric headers, and shot rows from a table.
   */
  async extract_club_and_metrics(
    wrapper_selector: string = `.${CSS_RESULTS_WRAPPER}`,
    table_selector: string = `.${CSS_RESULTS_TABLE}`,
    row_selector: string = `.${CSS_SHOT_DETAIL_ROW}`,
    cell_selector: string = "td",
    param_names_row_selector?: string,
    param_name_selector?: string,
    averages_row_selector?: string,
    consistency_row_selector?: string
  ): Promise<TableExtractionResult> {
    const wrapper = this.find_element_by_css(wrapper_selector);
    if (!wrapper) {
      console.warn(`Wrapper element not found: ${wrapper_selector}`);
      return new TableExtractionResult("Unknown", [], []);
    }

    const tablesRaw = wrapper.querySelectorAll(table_selector);
    let tables: HTMLElement[];
    if (Array.isArray(tablesRaw)) {
      tables = tablesRaw;
    } else {
      tables = Array.from(tablesRaw as unknown as Iterable<HTMLElement>);
    }
    
    if (!tables || tables.length === 0) {
      console.warn(`No tables found in wrapper: ${table_selector}`);
      return new TableExtractionResult("Unknown", [], []);
    }

    const table = tables[0];
    const rawRows = table.querySelectorAll(row_selector);
    let rows: HTMLElement[];
    if (Array.isArray(rawRows)) {
      rows = rawRows;
    } else {
      rows = Array.from(rawRows as unknown as Iterable<HTMLElement>);
    }

    if (!rows || rows.length === 0) {
      console.warn("No rows found in table");
      return new TableExtractionResult("Unknown", [], []);
    }

    // Extract club name from first cell of first row
    const first_row_cells = rows[0].querySelectorAll(cell_selector);
    let club_name = "Unknown";
    if (first_row_cells.length > 0) {
      club_name = (first_row_cells[0] as HTMLElement).innerText.trim();
    }

    // Extract metric headers from parameter names row if provided
    const metric_headers: string[] = [];
    if (param_names_row_selector && param_name_selector) {
      const param_row = this.find_element_by_css(param_names_row_selector);
      if (param_row) {
        const names = await this.extract_metric_names(
          param_row,
          param_name_selector
        );
        metric_headers.push(...names);
      }
    }

    // Extract shot rows
    const shot_rows: Record<string, string>[] = [];
    let averages_row_idx: number | null = null;
    let consistency_row_idx: number | null = null;

    const start_row_idx = metric_headers.length > 0 ? 1 : 0;

    for (let i = start_row_idx; i < rows.length; i++) {
      const row = rows[i];
      const rawCells = row.querySelectorAll(cell_selector);
      const cells: HTMLElement[] = Array.isArray(rawCells) 
        ? rawCells 
        : Array.from(rawCells as unknown as Iterable<HTMLElement>);

      if (cells.length === 0) continue;

      // Check if this is an averages or consistency row
      const first_cell_text = cells[0].innerText.trim();

      if (averages_row_selector && first_cell_text) {
        const averages_el = this.find_element_by_css(averages_row_selector);
        if (averages_el && i === start_row_idx) {
          averages_row_idx = i;
        }
      }

      if (consistency_row_selector && first_cell_text) {
        const consistency_el = this.find_element_by_css(consistency_row_selector);
        if (consistency_el && i > (averages_row_idx ?? 0)) {
          consistency_row_idx = i;
        }
      }

      // Skip averages and consistency rows for shot data
      if (i === averages_row_idx || i === consistency_row_idx) continue;

      // Create dict mapping headers to cell values
      const row_data: Record<string, string> = {};
      for (let j = 0; j < metric_headers.length && j < cells.length; j++) {
        const value = cells[j].innerText.trim();
        row_data[metric_headers[j]] = value;
      }

      if (Object.keys(row_data).length > 0 || metric_headers.length > 0) {
        shot_rows.push(row_data);
      }
    }

    // Extract averages and consistency data if found
    let averages: Record<string, string> = {};
    let consistency: Record<string, string> = {};

    if (averages_row_idx !== null && averages_row_selector) {
      const avg_row = rows[averages_row_idx];
      if (avg_row) {
        averages = await this.extract_averages(avg_row, metric_headers);
      }
    }

    if (consistency_row_idx !== null && consistency_row_selector) {
      const cons_row = rows[consistency_row_idx];
      if (cons_row) {
        consistency = await this.extract_consistency(cons_row, metric_headers);
      }
    }

    return new TableExtractionResult(
      club_name,
      metric_headers,
      shot_rows,
      averages,
      consistency
    );
  }
}

/**
 * Safely extract inner text from an element.
 */
export async function extract_text(element: HTMLElement | null): Promise<string> {
  if (element === null) return "";
  return element.innerText.trim();
}
