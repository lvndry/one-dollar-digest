import { cacheLife, cacheTag } from "next/cache";
import { NextResponse } from "next/server";
import {
  apiAccessDeniedResponse,
  apiResponseHeaders,
  requireApiKey,
} from "@/lib/api-access";
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
  const authentication = await requireApiKey(request);
  if ("response" in authentication) return authentication.response;

  const url = new URL(request.url);
  const digestDate = resolveDigestDateParam(url.searchParams.get("date"));

  if (!digestDate) {
    const denied = apiAccessDeniedResponse(digestTodayIso(), authentication.apiKeyUser);
    if (denied) return denied;
    const xml = await getCachedTodayRss();
    return new NextResponse(xml, {
      headers: apiResponseHeaders("application/rss+xml; charset=utf-8"),
    });
  }

  const denied = apiAccessDeniedResponse(digestDate, authentication.apiKeyUser);
  if (denied) return denied;

  const rows = await getCachedArticlesForDigestDate(digestDate);
  const xml = buildRssFeed(rows, getBaseUrl());

  return new NextResponse(xml, {
    headers: apiResponseHeaders("application/rss+xml; charset=utf-8"),
  });
}
