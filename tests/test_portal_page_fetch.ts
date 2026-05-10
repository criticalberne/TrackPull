import { beforeEach, describe, expect, it } from "vitest";
import {
  buildPageContextGraphQLHeaders,
  getCapturedPortalGraphQLHeadersForTests,
  isTrackmanGraphQLEndpoint,
  rememberPortalGraphQLHeaders,
  resetCapturedPortalGraphQLHeadersForTests,
} from "../src/content/portal_page_fetch";

class MockStorage {
  private readonly entries: Array<[string, string]>;

  constructor(values: Record<string, string>) {
    this.entries = Object.entries(values);
  }

  get length(): number {
    return this.entries.length;
  }

  key(index: number): string | null {
    return this.entries[index]?.[0] ?? null;
  }

  getItem(key: string): string | null {
    return this.entries.find(([entryKey]) => entryKey === key)?.[1] ?? null;
  }
}

const STORAGE_ACCESS_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJzdG9yYWdlIn0.signature";

describe("portal_page_fetch MAIN-world bridge helpers", () => {
  beforeEach(() => {
    resetCapturedPortalGraphQLHeadersForTests();
  });

  it("recognizes the Trackman GraphQL endpoint", () => {
    expect(isTrackmanGraphQLEndpoint("https://api.trackmangolf.com/graphql")).toBe(true);
    expect(isTrackmanGraphQLEndpoint("https://api.trackmangolf.com/graphql?operation=Activities")).toBe(true);
    expect(isTrackmanGraphQLEndpoint("https://portal.trackmangolf.com/graphql")).toBe(false);
  });

  it("captures forwardable portal GraphQL headers and drops forbidden browser headers", () => {
    rememberPortalGraphQLHeaders({
      Authorization: "Bearer captured-token",
      "Content-Type": "application/json",
      "x-trackman-client": "portal",
      Cookie: "session=secret",
      Origin: "https://portal.trackmangolf.com",
      "sec-fetch-site": "same-site",
    });

    expect(getCapturedPortalGraphQLHeadersForTests()).toEqual({
      Authorization: "Bearer captured-token",
      "Content-Type": "application/json",
      "x-trackman-client": "portal",
    });
  });

  it("uses a captured Authorization header before storage token fallback", () => {
    rememberPortalGraphQLHeaders({
      authorization: "Bearer captured-token",
    });

    const headers = buildPageContextGraphQLHeaders(new MockStorage({
      access_token: `Bearer ${STORAGE_ACCESS_TOKEN}`,
    }));

    expect(headers.Authorization).toBe("Bearer captured-token");
    expect(headers.Accept).toBe("application/json");
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("falls back to a storage access token when captured headers have no Authorization", () => {
    const headers = buildPageContextGraphQLHeaders(new MockStorage({
      access_token: `Bearer ${STORAGE_ACCESS_TOKEN}`,
    }));

    expect(headers.Authorization).toBe(`Bearer ${STORAGE_ACCESS_TOKEN}`);
  });
});
