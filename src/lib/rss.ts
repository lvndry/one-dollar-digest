import type { Article } from "@/lib/schema";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatRssPubDate(publishedAt: string): string {
  return new Date(publishedAt).toUTCString();
}

export function buildRssFeed(articles: Article[], baseUrl: string): string {
  const lastBuildDate =
    articles.length > 0
      ? formatRssPubDate(articles[0]!.publishedAt)
      : new Date().toUTCString();

  const items = articles
    .map((article) => {
      const link = `${baseUrl}/article/${article.id}`;
      const description = escapeXml(article.summary.slice(0, 500));
      return [
        "    <item>",
        `      <title>${escapeXml(article.title)}</title>`,
        `      <link>${link}</link>`,
        `      <guid isPermaLink="true">${link}</guid>`,
        `      <pubDate>${formatRssPubDate(article.publishedAt)}</pubDate>`,
        `      <category>${escapeXml(article.category)}</category>`,
        `      <description>${description}</description>`,
        "    </item>",
      ].join("\n");
    })
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "  <channel>",
    "    <title>The One Dollar Digest</title>",
    `    <link>${baseUrl}</link>`,
    "    <description>AI-curated daily news digest. Technology and politics, clearly sourced.</description>",
    "    <language>en-us</language>",
    `    <lastBuildDate>${lastBuildDate}</lastBuildDate>`,
    `    <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml" />`,
    items,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");
}
