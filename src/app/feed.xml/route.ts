import { cacheLife, cacheTag } from "next/cache";
import { NextResponse } from "next/server";
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

export async function GET() {
  const xml = await getCachedTodayRss();
  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
