import { NextResponse } from "next/server";
import {
  apiAccessDeniedResponse,
  apiResponseHeaders,
  requireApiKey,
} from "@/lib/api-access";
import { digestTodayIso } from "@/lib/digest-day";
import { db } from "@/lib/db";
import { articles } from "@/lib/schema";
import { desc, eq } from "drizzle-orm";

function resolveDigestDateParam(date: string | null): string | null {
  if (!date) return digestTodayIso();
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
    return NextResponse.json({ error: "Invalid date parameter" }, { status: 400 });
  }

  const denied = apiAccessDeniedResponse(digestDate, authentication.apiKeyUser);
  if (denied) return denied;

  try {
    const rows = await db
      .select()
      .from(articles)
      .where(eq(articles.digestDate, digestDate))
      .orderBy(desc(articles.importanceScore));

    return NextResponse.json(rows, { headers: apiResponseHeaders() });
  } catch {
    return NextResponse.json([], { headers: apiResponseHeaders() });
  }
}
