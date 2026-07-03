/// <reference types="bun-types" />
import { beforeEach, describe, expect, test, mock } from "bun:test";
import type { NextRequest } from "next/server";

let insertedRows: unknown[] = [];

mock.module("@/lib/db", () => ({
  db: {
    insert: () => ({
      values: (rows: unknown[]) => {
        insertedRows = rows;
        return {
          onConflictDoNothing: async () => undefined,
        };
      },
    }),
  },
}));

mock.module("next/cache", () => ({
  revalidateTag: () => undefined,
}));

const { POST } = await import("./route");

function ingestRequest(body: unknown): NextRequest {
  return new Request("http://localhost/api/articles/ingest", {
    method: "POST",
    headers: {
      authorization: "Bearer test-secret",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

describe("POST /api/articles/ingest", () => {
  beforeEach(() => {
    process.env.INGEST_SECRET = "test-secret";
    insertedRows = [];
  });

  test("deduplicates duplicate article titles before inserting", async () => {
    const response = await POST(
      ingestRequest([
        {
          title: "Same Story",
          summary: "First summary",
          source: "Example",
          sources: [{ name: "Example", url: "https://example.com/first" }],
          category: "tech",
          publishedAt: "2026-05-04",
          digestDate: "2026-05-04",
        },
        {
          title: " same story ",
          summary: "Duplicate summary",
          source: "Example",
          sources: [{ name: "Example", url: "https://example.com/duplicate" }],
          category: "tech",
          publishedAt: "2026-05-04",
          digestDate: "2026-05-04",
        },
      ]),
    );

    await expect(response.json()).resolves.toEqual({ inserted: 1 });
    expect(insertedRows).toHaveLength(1);
    expect(insertedRows[0]).toMatchObject({ title: "Same Story" });
  });

  test("rejects invalid category values", async () => {
    const response = await POST(
      ingestRequest([
        {
          title: "Bad Category Story",
          summary: "A valid enough summary for testing invalid category handling.",
          source: "Example",
          sources: [{ name: "Example", url: "https://example.com/bad-category" }],
          category: "economy",
          publishedAt: "2026-05-04",
          digestDate: "2026-05-04",
        },
      ]),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Invalid category at row 0; expected "tech", "politics", or "finance"',
    });
    expect(insertedRows).toHaveLength(0);
  });

  test("rejects missing source URLs in sources array", async () => {
    const response = await POST(
      ingestRequest([
        {
          title: "Missing URL Story",
          summary: "A valid enough summary for testing invalid source handling.",
          source: "Example",
          sources: [{ name: "Example", url: "" }],
          category: "tech",
          publishedAt: "2026-05-04",
          digestDate: "2026-05-04",
        },
      ]),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid sources at row 0; provide at least one source with a valid URL",
    });
    expect(insertedRows).toHaveLength(0);
  });
});
