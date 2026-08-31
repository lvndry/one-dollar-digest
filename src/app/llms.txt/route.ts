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
- Sitemap: ${base}/sitemap.xml

## Pages
- Home: ${base}/
- Technology: ${base}/tech
- Politics: ${base}/politics
- Finance: ${base}/finance
- Archive navigation: append ?date=YYYY-MM-DD to any digest page

## Agent API
All programmatic content access requires an API key. Create a free key at ${base}/account.
Never place an API key in a URL or expose it in browser-side code.

Send it with this header:
- Authorization: Bearer odd_...

Free API keys can retrieve today's digest (${today}) only. Premium API keys can retrieve the full archive.

Endpoints:
- JSON articles: ${base}/api/articles?date=today
- Markdown digest: ${base}/digest/today.md
- Markdown article: ${base}/article/{id}.md
- RSS: ${base}/feed.xml?date=today

Replace today with YYYY-MM-DD to request a specific digest. A free key receives 403 for historical dates; upgrade at ${base}/account for archive access.
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
