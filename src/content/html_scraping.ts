/**
 * Content Script for HTML table scraping fallback on Trackman report pages.
 */

import { TableParser } from "../shared/html_table_parser";
import {
  CSS_RESULTS_WRAPPER,
  CSS_RESULTS_TABLE,
  CSS_SHOT_DETAIL_ROW,
  CSS_PARAM_NAMES_ROW,
  CSS_PARAM_NAME,
  CSS_AVERAGE_VALUES,
  CSS_CONSISTENCY_VALUES,
} from "../shared/constants";

interface ScrapedData {
  club_name: string;
  metric_headers: string[];
  shot_rows: Record<string, string>[];
  averages: Record<string, string>;
  consistency: Record<string, string>;
}

async function scrapeHTMLTable(): Promise<ScrapedData | null> {
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
      consistency: result.consistency,
    };
  } catch (error) {
    console.error("Error scraping HTML table:", error);
    return null;
  }
}

async function scrapeAllTables(): Promise<ScrapedData[]> {
  try {
    const parser = new TableParser(document);

    const tables = await parser.extract_table_data(
      `.${CSS_RESULTS_WRAPPER}`,
      `.${CSS_RESULTS_TABLE}`,
      `.${CSS_SHOT_DETAIL_ROW}`
    );

    const results: ScrapedData[] = [];
    for (const table of tables) {
      for (const row of table.rows) {
        if (row.cells.length > 0) {
          const club_name = row.cells[0].text;
          const metric_headers: string[] = [];
          const shot_rows: Record<string, string>[] = [];

          // Try to extract headers from parameter names row
          const paramRow = document.querySelector(`.${CSS_PARAM_NAMES_ROW}`) as HTMLElement;
          if (paramRow) {
            const paramNames = paramRow.querySelectorAll(`.${CSS_PARAM_NAME}`);
            for (const nameEl of Array.from(paramNames)) {
              metric_headers.push(nameEl.innerText.trim());
            }
          }

          // Extract shot data from rows
          const shotRows = document.querySelectorAll(`.${CSS_SHOT_DETAIL_ROW}`) as NodeListOf<HTMLElement>;
          for (const shotRow of Array.from(shotRows)) {
            const cells = shotRow.querySelectorAll("td") as NodeListOf<HTMLElement>;
            if (cells.length > 0 && cells[0].innerText.trim() === club_name) {
              const row_data: Record<string, string> = {};
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
            consistency: {},
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

// Export for use in other scripts
export { scrapeHTMLTable, scrapeAllTables };
