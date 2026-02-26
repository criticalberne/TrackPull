/**
 * Content Script for API interception on Trackman report pages
 */

type CaptureInfo = {
  url: string;
  status: number;
  body: unknown;
  is_api: boolean;
};

const API_URL_PATTERNS = [
  "api.trackmangolf.com",
  "trackmangolf.com/api",
  "/api/",
  "/reports/",
  "/activities/",
  "/shots/",
  "graphql",
];

function containsStrokegroups(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;
  if (!("StrokeGroups" in obj)) return false;
  const groups = obj["StrokeGroups"];
  return Array.isArray(groups) && groups.length > 0;
}

class APIInterceptor {
  private capturedResponses: CaptureInfo[] = [];
  private reportJsonCaptures: Record<string, CaptureInfo> = {};
  private dataFound = new Promise<void>((resolve) => {
    this.resolveDataFound = resolve;
  });
  private resolveDataFound?: () => void;

  get captured_responses(): CaptureInfo[] {
    return this.capturedResponses;
  }

  async handleResponse(response: Response): Promise<void> {
    const url = response.url;
    const contentType = (response.headers.get("content-type") || "").toLowerCase();

    if (!contentType.includes("json")) return;

    try {
      const body = await response.json();
      const status = response.status;
      const isApi = API_URL_PATTERNS.some((pat) => url.includes(pat));

      this.capturedResponses.push({ url, status, body, is_api: isApi });

      this.captureReportJson(url, status, body);

      if (this.looksLikeShotData(body)) {
        console.log("Trackman Scraper: Shot data detected in:", url);
        if (this.resolveDataFound) {
          this.resolveDataFound();
          this.resolveDataFound = undefined;
        }
      }
    } catch (e) {
      // Ignore parse errors
    }
  }

  private captureReportJson(
    url: string,
    status: number,
    body: unknown
  ): void {
    const isApi = API_URL_PATTERNS.some((pat) => url.includes(pat));
    if (!isApi) return;

    try {
      const parsedUrl = new URL(url);
      const cacheKey = `${parsedUrl.pathname}?${parsedUrl.search}`;
      this.reportJsonCaptures[cacheKey] = {
        url,
        status,
        body,
        is_api: true,
      };
    } catch (e) {
      // Ignore URL parsing errors
    }
  }

  private looksLikeShotData(data: unknown): boolean {
    if (!data || typeof data !== "object") return false;
    const obj = data as Record<string, unknown>;

    if ("StrokeGroups" in obj) return true;

    try {
      const text = JSON.stringify(obj).toLowerCase();
      const indicators = [
        "ballspeed",
        "clubspeed",
        "carry",
        "spinrate",
        "strokegroups",
        "strokes",
        "measurement",
      ];
      return (
        indicators.filter((ind) => text.includes(ind)).length >= 3
      );
    } catch {
      return false;
    }
  }

  getReportJson(url?: string): Record<string, CaptureInfo> | CaptureInfo | null {
    if (!url) {
      return this.reportJsonCaptures;
    }

    try {
      const parsedUrl = new URL(url);
      const cacheKey = `${parsedUrl.pathname}?${parsedUrl.search}`;

      if (this.reportJsonCaptures[cacheKey]) {
        return this.reportJsonCaptures[cacheKey];
      }

      const pathOnly = parsedUrl.pathname;
      for (const [key, value] of Object.entries(this.reportJsonCaptures)) {
        if (key.startsWith(pathOnly)) {
          return value;
        }
      }
    } catch {
      // Ignore URL parsing errors
    }

    return null;
  }

  async intercept(
    page: Page,
    url: string
  ): Promise<Record<string, CaptureInfo> | null> {
    const handler = this.handleResponse.bind(this);
    page.on("response", handler);

    try {
      await page.goto(url, { waitUntil: "domcontentloaded" });

      await Promise.race([
        this.dataFound,
        new Promise((resolve) => setTimeout(resolve, 15000)),
      ]);

      await new Promise((resolve) => setTimeout(resolve, 1000));
    } finally {
      page.off("response", handler);
    }

    const captures = this.getReportJson();
    return captures || null;
  }
}

export { APIInterceptor };

console.log("Trackman Scraper interceptor loaded");
