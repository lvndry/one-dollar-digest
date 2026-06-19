/// <reference types="bun-types" />
import { describe, expect, test } from "bun:test";
import {
  extractApiKeyFromRequest,
  generateApiKeyValue,
  getKeyDisplayPrefix,
  hashApiKey,
} from "./api-key";

describe("api-key helpers", () => {
  test("generateApiKeyValue uses odd_ prefix", () => {
    const key = generateApiKeyValue();
    expect(key.startsWith("odd_")).toBe(true);
    expect(key.length).toBeGreaterThan(20);
  });

  test("hashApiKey is deterministic", () => {
    const key = "odd_test_key_value";
    expect(hashApiKey(key)).toBe(hashApiKey(key));
  });

  test("getKeyDisplayPrefix truncates key", () => {
    expect(getKeyDisplayPrefix("odd_abcdefghijklmnop")).toBe("odd_abcdefgh...");
  });

  test("extractApiKeyFromRequest reads Authorization bearer token", () => {
    const request = new Request("https://example.com", {
      headers: { Authorization: "Bearer odd_secret" },
    });
    expect(extractApiKeyFromRequest(request)).toBe("odd_secret");
  });

  test("extractApiKeyFromRequest accepts lowercase bearer scheme", () => {
    const request = new Request("https://example.com", {
      headers: { Authorization: "bearer odd_secret" },
    });
    expect(extractApiKeyFromRequest(request)).toBe("odd_secret");
  });

  test("extractApiKeyFromRequest reads X-API-Key header", () => {
    const request = new Request("https://example.com", {
      headers: { "X-API-Key": "odd_secret" },
    });
    expect(extractApiKeyFromRequest(request)).toBe("odd_secret");
  });

  test("extractApiKeyFromRequest returns null when missing", () => {
    const request = new Request("https://example.com");
    expect(extractApiKeyFromRequest(request)).toBeNull();
  });
});
