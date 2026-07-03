import { cacheLife, cacheTag } from "next/cache";
import { NextResponse } from "next/server";
import { digestTodayIso } from "@/lib/digest-day";

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.onedollardigest.com";
}

async function buildLlmsTxt(): Promise<string> {
  "use cache";
  cacheLife("hours");
  cacheTag("articles");

  const base = getBaseUrl();
  const today = digestTodayIso();

  return `# The One Dollar Digest

> AI-curated daily news covering technology, politics, and finance. Clearly sourced, $1/month for archive access.

## Feeds
- RSS: ${base}/feed.xml
- Today's digest (Markdown): ${base}/digest/today.md
- Articles API (JSON, today): ${base}/api/articles
- Sitemap: ${base}/sitemap.xml

## Pages
- Home: ${base}/
- Technology: ${base}/tech
- Politics: ${base}/politics
- Finance: ${base}/finance
- Archive navigation: append ?date=YYYY-MM-DD to any digest page

## Article URLs
- Markdown: ${base}/article/{id}.md
- HTML: ${base}/article/{id}

## Today's digest
- Markdown: ${base}/digest/${today}.md
- HTML: ${base}/?date=${today}

## Access
Today's digest is free. Historical digests require a subscription or trial.

Paid subscribers can generate an API key at ${base}/account for programmatic archive access.
Send the key with either header:
- Authorization: Bearer odd_...
- X-API-Key: odd_...

Archive endpoints (require key or logged-in access):
- Markdown digest: ${base}/digest/YYYY-MM-DD.md
- Markdown article: ${base}/article/{id}.md
- JSON articles: ${base}/api/articles?date=YYYY-MM-DD
- RSS archive: ${base}/feed.xml?date=YYYY-MM-DD
`;
}

export async function GET() {
  const text = await buildLlmsTxt();
  return new NextResponse(text, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
