// src/shared/constants.ts
var CSS_RESULTS_WRAPPER = "player-and-results-table-wrapper";
var CSS_RESULTS_TABLE = "ResultsTable";
var CSS_PARAM_NAMES_ROW = "parameter-names-row";
var CSS_PARAM_NAME = "parameter-name";
var CSS_SHOT_DETAIL_ROW = "row-with-shot-details";
var CSS_AVERAGE_VALUES = "average-values";
var CSS_CONSISTENCY_VALUES = "consistency-values";

// src/shared/html_table_parser.ts
var TableCell = class {
  row_index;
  col_index;
  text;
  element;
  constructor(row_index, col_index, text, element) {
    this.row_index = row_index;
    this.col_index = col_index;
    this.text = text;
    this.element = element;
  }
};
var TableRow = class {
  row_index;
  cells = [];
  constructor(row_index, cells) {
    this.row_index = row_index;
    if (cells) {
      this.cells.push(...cells);
    }
  }
  get_cell_text(col_index) {
    if (col_index >= 0 && col_index < this.cells.length) {
      return this.cells[col_index].text;
    }
    return "";
  }
};
var TableData = class {
  rows = [];
  header_row;
  footer_rows = [];
  constructor(rows, header_row) {
    if (rows) {
      this.rows.push(...rows);
    }
    this.header_row = header_row;
  }
};
var TableExtractionResult = class {
  club_name;
  metric_headers;
  shot_rows;
  averages = {};
  consistency = {};
  constructor(club_name, metric_headers, shot_rows, averages, consistency) {
    this.club_name = club_name;
    this.metric_headers = metric_headers;
    this.shot_rows = shot_rows;
    if (averages) Object.assign(this.averages, averages);
    if (consistency) Object.assign(this.consistency, consistency);
  }
};
var TableParser = class {
  document;
  constructor(document2) {
    this.document = document2;
  }
  /**
   * Find an element using a CSS selector.
   */
  find_element_by_css(css_selector) {
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
  find_elements_by_css(css_selector) {
    try {
      const elements = this.document.querySelectorAll(css_selector);
      if (Array.isArray(elements)) {
        return elements;
      }
      return Array.from(elements);
    } catch (e) {
      console.error(`Error finding elements with selector '${css_selector}':`, e);
      return [];
    }
  }
  /**
   * Extract data from multiple tables on a page.
   */
  async extract_table_data(wrapper_selector, table_selector, row_selector, cell_selector = "td") {
    const tables_data = [];
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
  async _parse_table(table_element, row_selector, cell_selector) {
    const table_data = new TableData();
    const rows = table_element.querySelectorAll(row_selector);
    for (let row_idx = 0; row_idx < rows.length; row_idx++) {
      try {
        const row = rows[row_idx];
        const cell_elements = row.querySelectorAll(cell_selector);
        const cells = [];
        for (let col_idx = 0; col_idx < cell_elements.length; col_idx++) {
          const cell_elem = cell_elements[col_idx];
          const text = cell_elem.innerText.trim();
          cells.push(
            new TableCell(row_idx, col_idx, text, {
              innerText: text,
              querySelector: (sel) => cell_elem.querySelector(sel),
              querySelectorAll: (sel) => cell_elem.querySelectorAll(sel)
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
  async extract_row_values(row_element, skip_first_n = 0) {
    const tds = row_element.querySelectorAll("td");
    const values = [];
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
  async extract_metric_names(row_element, name_selector = CSS_PARAM_NAME) {
    const name_elements = row_element.querySelectorAll(name_selector);
    const names = [];
    for (const elem of Array.from(name_elements)) {
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
  async extract_averages(row_element, metric_headers) {
    const averages = {};
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
  async extract_consistency(row_element, metric_headers) {
    const consistency = {};
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
  async _extract_row_values(row_element, num_columns, skip_first = 0) {
    const tds = row_element.querySelectorAll("td");
    const values = [];
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
  async extract_club_and_metrics(wrapper_selector = `.${CSS_RESULTS_WRAPPER}`, table_selector = `.${CSS_RESULTS_TABLE}`, row_selector = `.${CSS_SHOT_DETAIL_ROW}`, cell_selector = "td", param_names_row_selector, param_name_selector, averages_row_selector, consistency_row_selector) {
    const wrapper = this.find_element_by_css(wrapper_selector);
    if (!wrapper) {
      console.warn(`Wrapper element not found: ${wrapper_selector}`);
      return new TableExtractionResult("Unknown", [], []);
    }
    const tablesRaw = wrapper.querySelectorAll(table_selector);
    let tables;
    if (Array.isArray(tablesRaw)) {
      tables = tablesRaw;
    } else {
      tables = Array.from(tablesRaw);
    }
    if (!tables || tables.length === 0) {
      console.warn(`No tables found in wrapper: ${table_selector}`);
      return new TableExtractionResult("Unknown", [], []);
    }
    const table = tables[0];
    const rawRows = table.querySelectorAll(row_selector);
    let rows;
    if (Array.isArray(rawRows)) {
      rows = rawRows;
    } else {
      rows = Array.from(rawRows);
    }
    if (!rows || rows.length === 0) {
      console.warn("No rows found in table");
      return new TableExtractionResult("Unknown", [], []);
    }
    const first_row_cells = rows[0].querySelectorAll(cell_selector);
    let club_name = "Unknown";
    if (first_row_cells.length > 0) {
      club_name = first_row_cells[0].innerText.trim();
    }
    const metric_headers = [];
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
    const shot_rows = [];
    let averages_row_idx = null;
    let consistency_row_idx = null;
    const start_row_idx = metric_headers.length > 0 ? 1 : 0;
    for (let i = start_row_idx; i < rows.length; i++) {
      const row = rows[i];
      const rawCells = row.querySelectorAll(cell_selector);
      const cells = Array.isArray(rawCells) ? rawCells : Array.from(rawCells);
      if (cells.length === 0) continue;
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
      if (i === averages_row_idx || i === consistency_row_idx) continue;
      const row_data = {};
      for (let j = 0; j < metric_headers.length && j < cells.length; j++) {
        const value = cells[j].innerText.trim();
        row_data[metric_headers[j]] = value;
      }
      if (Object.keys(row_data).length > 0 || metric_headers.length > 0) {
        shot_rows.push(row_data);
      }
    }
    let averages = {};
    let consistency = {};
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
};

// src/models/types.ts
function mergeSessionData(baseSession, newSession) {
  const clubsMap = /* @__PURE__ */ new Map();
  for (const club of baseSession.club_groups) {
    clubsMap.set(club.club_name, { ...club });
  }
  for (const newClub of newSession.club_groups) {
    const existingClub = clubsMap.get(newClub.club_name);
    if (!existingClub) {
      clubsMap.set(newClub.club_name, { ...newClub });
    } else {
      const mergedClub = {
        ...existingClub,
        averages: { ...existingClub.averages, ...newClub.averages },
        consistency: { ...existingClub.consistency, ...newClub.consistency }
      };
      for (let i = 0; i < newClub.shots.length; i++) {
        const newShot = newClub.shots[i];
        if (i < mergedClub.shots.length) {
          mergedClub.shots[i] = {
            ...mergedClub.shots[i],
            metrics: {
              ...mergedClub.shots[i].metrics,
              ...newShot.metrics
            }
          };
        } else {
          mergedClub.shots.push({ ...newShot });
        }
      }
      clubsMap.set(newClub.club_name, mergedClub);
    }
  }
  const allMetricNames = /* @__PURE__ */ new Set();
  for (const club of clubsMap.values()) {
    for (const shot of club.shots) {
      Object.keys(shot.metrics).forEach((k) => allMetricNames.add(k));
    }
    Object.keys(club.averages).forEach((k) => allMetricNames.add(k));
    Object.keys(club.consistency).forEach((k) => allMetricNames.add(k));
  }
  const mergedSession = {
    ...baseSession,
    club_groups: Array.from(clubsMap.values()),
    metric_names: Array.from(allMetricNames).sort()
  };
  return mergedSession;
}

// src/content/html_scraping.ts
async function scrapeHTMLTable() {
  try {
    const parser = new TableParser(document);
    const result = await parser.extract_club_and_metrics(
      `.${CSS_RESULTS_WRAPPER}`,
      `.${CSS_RESULTS_TABLE}`,
      `.${CSS_SHOT_DETAIL_ROW}`,
      "td",
      `.${CSS_PARAM_NAMES_ROW}`,
      `.${CSS_PARAM_NAME}`,
      `.${CSS_AVERAGE_VALUES}`,
      `.${CSS_CONSISTENCY_VALUES}`
    );
    return {
      club_name: result.club_name,
      metric_headers: result.metric_headers,
      shot_rows: result.shot_rows,
      averages: result.averages,
      consistency: result.consistency
    };
  } catch (error) {
    console.error("Error scraping HTML table:", error);
    return null;
  }
}
async function scrapeAllTables() {
  try {
    const parser = new TableParser(document);
    const tables = await parser.extract_table_data(
      `.${CSS_RESULTS_WRAPPER}`,
      `.${CSS_RESULTS_TABLE}`,
      `.${CSS_SHOT_DETAIL_ROW}`
    );
    const results = [];
    for (const table of tables) {
      for (const row of table.rows) {
        if (row.cells.length > 0) {
          const club_name = row.cells[0].text;
          const metric_headers = [];
          const shot_rows = [];
          const paramRow = document.querySelector(`.${CSS_PARAM_NAMES_ROW}`);
          if (paramRow) {
            const paramNames = paramRow.querySelectorAll(`.${CSS_PARAM_NAME}`);
            for (const nameEl of Array.from(paramNames)) {
              metric_headers.push(nameEl.innerText.trim());
            }
          }
          const shotRows = document.querySelectorAll(`.${CSS_SHOT_DETAIL_ROW}`);
          for (const shotRow of Array.from(shotRows)) {
            const cells = shotRow.querySelectorAll("td");
            if (cells.length > 0 && cells[0].innerText.trim() === club_name) {
              const row_data = {};
              for (let j = 0; j < metric_headers.length && j < cells.length; j++) {
                row_data[metric_headers[j]] = cells[j].innerText.trim();
              }
              shot_rows.push(row_data);
            }
          }
          results.push({
            club_name,
            metric_headers,
            shot_rows,
            averages: {},
            consistency: {}
          });
        }
      }
    }
    return results;
  } catch (error) {
    console.error("Error scraping all tables:", error);
    return [];
  }
}
async function scrapeAndMergeSessions(baseUrl, existingSession) {
  const parser = new TableParser(document);
  try {
    const result = await parser.extract_club_and_metrics(
      `.${CSS_RESULTS_WRAPPER}`,
      `.${CSS_RESULTS_TABLE}`,
      `.${CSS_SHOT_DETAIL_ROW}`,
      "td",
      `.${CSS_PARAM_NAMES_ROW}`,
      `.${CSS_PARAM_NAME}`,
      `.${CSS_AVERAGE_VALUES}`,
      `.${CSS_CONSISTENCY_VALUES}`
    );
    const newSession = {
      date: "Unknown",
      report_id: "unknown",
      url_type: "report",
      club_groups: [],
      metric_names: result.metric_headers,
      metadata_params: {}
    };
    for (const shotRow of result.shot_rows) {
      const metrics = {};
      for (const [key, value] of Object.entries(shotRow)) {
        if (!result.metric_headers.includes(key)) continue;
        metrics[key] = value;
      }
      if (Object.keys(metrics).length > 0) {
        newSession.club_groups.push({
          club_name: result.club_name,
          shots: [{ shot_number: 0, metrics }],
          averages: {},
          consistency: {}
        });
      }
    }
    if (existingSession && existingSession.club_groups.length > 0) {
      return mergeSessionData(existingSession, newSession);
    }
    return newSession;
  } catch (error) {
    console.error("Error in scrapeAndMergeSessions:", error);
    if (existingSession) {
      return existingSession;
    }
    return {
      date: "Unknown",
      report_id: "unknown",
      url_type: "report",
      club_groups: [],
      metric_names: [],
      metadata_params: {}
    };
  }
}
export {
  scrapeAllTables,
  scrapeAndMergeSessions,
  scrapeHTMLTable
};
