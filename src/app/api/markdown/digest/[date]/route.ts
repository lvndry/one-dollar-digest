import { NextResponse } from "next/server";
import {
  apiAccessDeniedResponse,
  apiResponseHeaders,
  requireApiKey,
} from "@/lib/api-access";
import { digestTodayIso, getCachedArticlesForDigestDate } from "@/lib/digest-day";
import { serializeDigestToMarkdown } from "@/lib/digest-markdown";

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.onedollardigest.com";
}

function resolveDigestDateParam(date: string): string | null {
  if (date === "today") return digestTodayIso();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return date;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ date: string }> },
) {
  const authentication = await requireApiKey(request);
  if ("response" in authentication) return authentication.response;

  const { date: dateParam } = await params;
  const digestDate = resolveDigestDateParam(dateParam);

  if (!digestDate) {
    return new NextResponse("Not found", { status: 404 });
  }

  const denied = apiAccessDeniedResponse(digestDate, authentication.apiKeyUser);
  if (denied) return denied;

  const rows = await getCachedArticlesForDigestDate(digestDate);
  if (rows.length === 0) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(serializeDigestToMarkdown(rows, digestDate, getBaseUrl()), {
    headers: apiResponseHeaders("text/markdown; charset=utf-8"),
  });
}
