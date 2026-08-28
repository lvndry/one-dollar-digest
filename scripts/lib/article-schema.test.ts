import { describe, expect, test } from "bun:test";
import { ArticleArraySchema, ArticleSchema } from "./article-schema";

const validArticle = {
  title: "OpenAI Releases GPT-5",
  summary: "OpenAI announced the release of GPT-5 with improved reasoning capabilities.",
  source: "TechCrunch",
  sources: [
    {
      name: "TechCrunch",
      url: "https://techcrunch.com/2026/05/08/openai-gpt5",
    },
  ],
  category: "tech" as const,
  publishedAt: "2026-05-08",
};

describe("ArticleSchema", () => {
  test("accepts a valid article", () => {
    const result = ArticleSchema.safeParse(validArticle);
    expect(result.success).toBe(true);
  });

  test("rejects empty title", () => {
    const result = ArticleSchema.safeParse({ ...validArticle, title: "" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toContain("title");
  });

  test("rejects missing sources", () => {
    const result = ArticleSchema.safeParse({ ...validArticle, sources: undefined });
    expect(result.success).toBe(false);
  });

  test("rejects invalid category", () => {
    const result = ArticleSchema.safeParse({ ...validArticle, category: "sports" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toContain("category");
  });

  test("accepts finance category", () => {
    const result = ArticleSchema.safeParse({ ...validArticle, category: "finance" });
    expect(result.success).toBe(true);
  });

  test("rejects invalid bias value", () => {
    const result = ArticleSchema.safeParse({ ...validArticle, bias: "moderate" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toContain("bias");
  });

  test("accepts null bias", () => {
    const result = ArticleSchema.safeParse({ ...validArticle, bias: null });
    expect(result.success).toBe(true);
  });

  test("rejects importanceScore > 1", () => {
    const result = ArticleSchema.safeParse({ ...validArticle, importanceScore: 1.5 });
    expect(result.success).toBe(false);
  });

  test("rejects invalid date format", () => {
    const result = ArticleSchema.safeParse({
      ...validArticle,
      publishedAt: "May 8 2026",
    });
    expect(result.success).toBe(false);
  });

  test("ArticleArraySchema rejects empty array", () => {
    const result = ArticleArraySchema.safeParse([]);
    expect(result.success).toBe(false);
  });
});
