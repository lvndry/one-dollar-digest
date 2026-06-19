import { cacheLife, cacheTag } from "next/cache";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { authenticateApiKeyFromRequest } from "@/lib/api-key";
import { canAccessDigestDate } from "@/lib/access";
import { digestTodayIso, getCachedArticlesForDigestDate } from "@/lib/digest-day";
import { buildRssFeed } from "@/lib/rss";

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.onedollardigest.com";
}

async function getCachedTodayRss(): Promise<string> {
  "use cache";
  cacheLife("hours");
  cacheTag("articles");

  const today = digestTodayIso();
  const articles = await getCachedArticlesForDigestDate(today);
  return buildRssFeed(articles, getBaseUrl());
}

function resolveDigestDateParam(date: string | null): string | null {
  if (!date) return null;
  if (date === "today") return digestTodayIso();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return date;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const digestDate = resolveDigestDateParam(url.searchParams.get("date"));

  if (!digestDate) {
    const xml = await getCachedTodayRss();
    return new NextResponse(xml, {
      headers: {
        "Content-Type": "application/rss+xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  const session = await auth();
  const apiKeyUser = await authenticateApiKeyFromRequest(request);

  if (!canAccessDigestDate(digestDate, session, apiKeyUser)) {
    return new NextResponse("Archive access requires a subscription or API key.", {
      status: 403,
    });
  }

  const rows = await getCachedArticlesForDigestDate(digestDate);
  const xml = buildRssFeed(rows, getBaseUrl());

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "private, no-store",
    },
  });
}
