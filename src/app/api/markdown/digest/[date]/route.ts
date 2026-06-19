import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { canAccessDigestDate } from "@/lib/access";
import { serializeArchivePaywallMarkdown } from "@/lib/article-markdown";
import { digestTodayIso, getCachedArticlesForDigestDate } from "@/lib/digest-day";
import { serializeDigestToMarkdown } from "@/lib/digest-markdown";

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.onedollardigest.com";
}

const MARKDOWN_HEADERS = {
  "Content-Type": "text/markdown; charset=utf-8",
} as const;

function resolveDigestDateParam(date: string): string | null {
  if (date === "today") return digestTodayIso();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return date;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ date: string }> },
) {
  const { date: dateParam } = await params;
  const digestDate = resolveDigestDateParam(dateParam);

  if (!digestDate) {
    return new NextResponse("Not found", { status: 404 });
  }

  const session = await auth();
  const baseUrl = getBaseUrl();

  if (!canAccessDigestDate(digestDate, session)) {
    return new NextResponse(serializeArchivePaywallMarkdown(!!session?.user, baseUrl), {
      status: 403,
      headers: MARKDOWN_HEADERS,
    });
  }

  const rows = await getCachedArticlesForDigestDate(digestDate);
  return new NextResponse(serializeDigestToMarkdown(rows, digestDate, baseUrl), {
    headers: MARKDOWN_HEADERS,
  });
}
