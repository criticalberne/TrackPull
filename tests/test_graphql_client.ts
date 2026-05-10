import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  executeQuery,
  classifyAuthResult,
  HEALTH_CHECK_QUERY,
  GRAPHQL_ENDPOINT,
  type GraphQLResponse,
} from "../src/shared/graphql_client";

// Helper to create a mock Response object
function mockResponse(
  body: unknown,
  ok: boolean = true,
  status: number = 200
): Response {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

describe("graphql_client", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // --- executeQuery tests ---

  it("Test 1: executeQuery calls fetch with POST, credentials include, Content-Type application/json, and JSON body", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      mockResponse({ data: { me: { id: "abc" } } })
    );
    vi.stubGlobal("fetch", mockFetch);

    await executeQuery("{ me { id } }", { foo: "bar" });

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(GRAPHQL_ENDPOINT);
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("include");
    expect(init.headers["Content-Type"]).toBe("application/json");
    const body = JSON.parse(init.body as string);
    expect(body.query).toBe("{ me { id } }");
    expect(body.variables).toEqual({ foo: "bar" });
  });

  it("Test 2: GRAPHQL_ENDPOINT equals https://api.trackmangolf.com/graphql", () => {
    expect(GRAPHQL_ENDPOINT).toBe("https://api.trackmangolf.com/graphql");
  });

  it("Test 3: executeQuery returns parsed JSON when fetch resolves successfully", async () => {
    const responseBody = { data: { me: { id: "abc" } } };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(mockResponse(responseBody))
    );

    const result = await executeQuery<{ me: { id: string } }>("{ me { id } }");
    expect(result).toEqual(responseBody);
  });

  it("Test 4: executeQuery throws Error with 'HTTP 500' when response.ok is false with status 500", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(mockResponse({}, false, 500))
    );

    await expect(executeQuery("{ me { id } }")).rejects.toThrow("HTTP 500");
  });

  it("Test 5: executeQuery returns response with unexpected extra fields without throwing", async () => {
    const responseBody = {
      data: { me: { id: "x", unknownField: 42 } },
      extensions: { tracing: {} },
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(mockResponse(responseBody))
    );

    const result = await executeQuery("{ me { id } }");
    expect(result).toEqual(responseBody);
  });

  // --- classifyAuthResult tests ---

  it("Test 6: classifyAuthResult returns authenticated when data.me.__typename is truthy and no errors", () => {
    const result: GraphQLResponse<{ me: { __typename: string } | null }> = {
      data: { me: { __typename: "Me" } },
    };
    expect(classifyAuthResult(result)).toEqual({ kind: "authenticated" });
  });

  it("Test 7: classifyAuthResult returns unauthenticated when errors[0].extensions.code is UNAUTHENTICATED", () => {
    const result: GraphQLResponse<{ me: { __typename: string } | null }> = {
      data: null,
      errors: [
        {
          message: "Not authenticated",
          extensions: { code: "UNAUTHENTICATED" },
        },
      ],
    };
    expect(classifyAuthResult(result)).toEqual({ kind: "unauthenticated" });
  });

  it("Test 8: classifyAuthResult returns unauthenticated when errors[0].message contains 'unauthorized' (case-insensitive)", () => {
    const result: GraphQLResponse<{ me: { __typename: string } | null }> = {
      data: null,
      errors: [{ message: "User is Unauthorized to access this resource" }],
    };
    expect(classifyAuthResult(result)).toEqual({ kind: "unauthenticated" });
  });

  it("returns unauthenticated when errors[0].message contains 'not authorized'", () => {
    const result: GraphQLResponse<{ me: { __typename: string } | null }> = {
      data: null,
      errors: [{ message: "The current user is not authorized to access this resource." }],
    };
    expect(classifyAuthResult(result)).toEqual({ kind: "unauthenticated" });
  });

  it("Test 9: classifyAuthResult returns unauthenticated when errors[0].message contains 'not logged in' (case-insensitive)", () => {
    const result: GraphQLResponse<{ me: { __typename: string } | null }> = {
      data: null,
      errors: [{ message: "You are Not Logged In" }],
    };
    expect(classifyAuthResult(result)).toEqual({ kind: "unauthenticated" });
  });

  it("Test 10: classifyAuthResult returns unauthenticated when data is null and errors is undefined", () => {
    const result: GraphQLResponse<{ me: { __typename: string } | null }> = {
      data: null,
    };
    expect(classifyAuthResult(result)).toEqual({ kind: "unauthenticated" });
  });

  it("Test 11: classifyAuthResult returns unauthenticated when data.me is null", () => {
    const result: GraphQLResponse<{ me: { __typename: string } | null }> = {
      data: { me: null },
    };
    expect(classifyAuthResult(result)).toEqual({ kind: "unauthenticated" });
  });

  it("Test 12: classifyAuthResult returns unauthenticated when data.me.__typename is empty string", () => {
    const result: GraphQLResponse<{ me: { __typename: string } | null }> = {
      data: { me: { __typename: "" } },
    };
    expect(classifyAuthResult(result)).toEqual({ kind: "unauthenticated" });
  });

  it("Test 13: classifyAuthResult returns error with user-friendly message for non-auth error code", () => {
    const result: GraphQLResponse<{ me: { __typename: string } | null }> = {
      data: null,
      errors: [
        {
          message: "Something went wrong",
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        },
      ],
    };
    expect(classifyAuthResult(result)).toEqual({
      kind: "error",
      message: "Unable to reach Trackman — try again later",
    });
  });

  it("Test 14: classifyAuthResult does not throw when errors is empty array — returns unauthenticated (data is null)", () => {
    const result: GraphQLResponse<{ me: { __typename: string } | null }> = {
      data: null,
      errors: [],
    };
    expect(() => classifyAuthResult(result)).not.toThrow();
    expect(classifyAuthResult(result)).toEqual({ kind: "unauthenticated" });
  });

  it("Test 15: classifyAuthResult does not throw when errors[0] has no extensions property", () => {
    const result: GraphQLResponse<{ me: { __typename: string } | null }> = {
      data: null,
      errors: [{ message: "some error without extensions" }],
    };
    expect(() => classifyAuthResult(result)).not.toThrow();
    // message doesn't match auth keywords, code is missing → should return error
    expect(classifyAuthResult(result)).toEqual({
      kind: "error",
      message: "Unable to reach Trackman — try again later",
    });
  });

  it("Test 16: HEALTH_CHECK_QUERY contains 'me' and '__typename' substrings", () => {
    expect(HEALTH_CHECK_QUERY).toContain("me");
    expect(HEALTH_CHECK_QUERY).toContain("__typename");
  });
});
