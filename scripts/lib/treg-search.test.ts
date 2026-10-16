import { describe, expect, test } from "bun:test";

import { buildQueries, mergeLeads, normalizeRow, parsePublishedAt } from "./treg-search";

const now = new Date("2026-10-16T12:00:00Z");

describe("parsePublishedAt", () => {
  test("reads ISO and human dates", () => {
    expect(parsePublishedAt("2026-10-12", now)).toBe("2026-10-12");
    expect(parsePublishedAt("Jul 23, 2026", now)).toBe("2026-07-23");
  });

  test("resolves relative dates against now", () => {
    expect(parsePublishedAt("5 hours ago", now)).toBe("2026-10-16");
    expect(parsePublishedAt("2 days ago", now)).toBe("2026-10-14");
    expect(parsePublishedAt("1 week ago", now)).toBe("2026-10-09");
  });

  test("leaves unknown dates out", () => {
    expect(parsePublishedAt("recently", now)).toBeUndefined();
    expect(parsePublishedAt(undefined, now)).toBeUndefined();
  });
});

describe("normalizeRow", () => {
  test("maps each provider's field names onto one lead", () => {
    expect(
      normalizeRow(
        {
          title: "Patch Tuesday",
          link: "https://a.test",
          snippet: "s",
          published_date: "2026-10-12",
        },
        "cve",
        now,
      ),
    ).toEqual({
      title: "Patch Tuesday",
      url: "https://a.test",
      snippet: "s",
      publishedAt: "2026-10-12",
      sourceName: undefined,
      query: "cve",
    });
    expect(
      normalizeRow(
        {
          title: "Wall St",
          url: "https://b.test",
          date: "5 hours ago",
          publisher: "Reuters",
        },
        "q",
        now,
      ),
    ).toMatchObject({ publishedAt: "2026-10-16", sourceName: "Reuters", snippet: "" });
  });

  test("drops rows without a url or title", () => {
    expect(normalizeRow({ title: "no url" }, "q", now)).toBeUndefined();
    expect(normalizeRow({ url: "https://c.test" }, "q", now)).toBeUndefined();
  });
});

describe("buildQueries", () => {
  test("prefers short phrases and caps them at five", () => {
    expect(
      buildQueries({
        query: "goal",
        searchQueries: ["a", " b ", "", "a", "c", "d", "e", "f"],
      }),
    ).toEqual(["a", "b", "c", "d", "e"]);
  });

  test("falls back to the query", () => {
    expect(buildQueries({ query: " goal " })).toEqual(["goal"]);
  });
});

describe("mergeLeads", () => {
  const lead = (url: string, publishedAt?: string) => ({
    title: url,
    url,
    snippet: "",
    publishedAt,
    query: "q",
  });

  test("dedupes by url and drops dated leads before fromDate, keeping undated ones", () => {
    const merged = mergeLeads(
      [
        lead("https://a", "2026-10-15"),
        lead("https://a", "2026-10-15"),
        lead("https://b", "2026-10-01"),
        lead("https://c"),
      ],
      "2026-10-14",
    );
    expect(merged.results.map((result) => result.url)).toEqual([
      "https://a",
      "https://c",
    ]);
    expect(merged.droppedBeforeFromDate).toBe(1);
  });
});
