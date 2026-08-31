/// <reference types="bun-types" />
import { describe, expect, test } from "bun:test";
import { apiAccessDeniedResponse, requireApiKey } from "./api-access";

describe("agent API access", () => {
  test("rejects a request without an API key before content is fetched", async () => {
    const result = await requireApiKey(new Request("https://example.com/api/articles"));
    expect("response" in result).toBe(true);
    if (!("response" in result)) throw new Error("Expected an authentication response");

    expect(result.response.status).toBe(401);
    expect(result.response.headers.get("WWW-Authenticate")).toBe(
      'Bearer realm="onedollardigest-api"',
    );
    expect(await result.response.json()).toEqual({
      error: {
        code: "api_key_required",
        message:
          "A valid API key is required. Create a free key to access today's digest.",
      },
    });
  });

  test("returns a Premium upgrade response for archive requests from a free key", async () => {
    const response = apiAccessDeniedResponse("2024-01-01", { subscribed: false });
    expect(response?.status).toBe(403);
    expect((await response?.json()).error.code).toBe("premium_required");
  });

  test("does not deny archive requests from a Premium key", () => {
    expect(apiAccessDeniedResponse("2024-01-01", { subscribed: true })).toBeNull();
  });
});
