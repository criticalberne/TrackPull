import { describe, expect, it } from "vitest";
import { findTrackmanAuthTokenFromStorage } from "../src/content/portal_fetch";

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

const ACCESS_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyIn0.signature";
const ID_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJwb3J0YWwifQ.signature";
const REFRESH_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJyZWZyZXNoIjp0cnVlfQ.signature";
const OPAQUE_ACCESS_TOKEN = "opaque-access-token-value-1234567890";

describe("portal_fetch auth token discovery", () => {
  it("finds a direct bearer access token", () => {
    const token = findTrackmanAuthTokenFromStorage(new MockStorage({
      access_token: `Bearer ${ACCESS_TOKEN}`,
    }));

    expect(token).toBe(ACCESS_TOKEN);
  });

  it("finds nested access tokens inside JSON auth payloads", () => {
    const token = findTrackmanAuthTokenFromStorage(new MockStorage({
      "trackman.auth": JSON.stringify({
        account: {
          accessToken: ACCESS_TOKEN,
        },
      }),
    }));

    expect(token).toBe(ACCESS_TOKEN);
  });

  it("prefers access tokens over id and refresh tokens", () => {
    const token = findTrackmanAuthTokenFromStorage(new MockStorage({
      id_token: ID_TOKEN,
      refresh_token: REFRESH_TOKEN,
      auth: JSON.stringify({ accessToken: ACCESS_TOKEN }),
    }));

    expect(token).toBe(ACCESS_TOKEN);
  });

  it("returns null when no JWT-shaped token exists", () => {
    const token = findTrackmanAuthTokenFromStorage(new MockStorage({
      auth: JSON.stringify({ token: "not-a-jwt" }),
    }));

    expect(token).toBeNull();
  });

  it("accepts opaque bearer values from explicit access token keys", () => {
    const token = findTrackmanAuthTokenFromStorage(new MockStorage({
      auth: JSON.stringify({ accessToken: OPAQUE_ACCESS_TOKEN }),
    }));

    expect(token).toBe(OPAQUE_ACCESS_TOKEN);
  });

  it("does not accept opaque refresh token values", () => {
    const token = findTrackmanAuthTokenFromStorage(new MockStorage({
      auth: JSON.stringify({ refreshToken: OPAQUE_ACCESS_TOKEN }),
    }));

    expect(token).toBeNull();
  });
});
