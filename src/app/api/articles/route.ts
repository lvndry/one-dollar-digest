import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { canAccessDigestDate } from "@/lib/access";
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
  const url = new URL(request.url);
  const digestDate = resolveDigestDateParam(url.searchParams.get("date"));

  if (!digestDate) {
    return NextResponse.json({ error: "Invalid date parameter" }, { status: 400 });
  }

  const session = await auth();

  if (!canAccessDigestDate(digestDate, session)) {
    return NextResponse.json(
      { error: "Archive access requires a subscription." },
      { status: 403 },
    );
  }

  try {
    const rows = await db
      .select()
      .from(articles)
      .where(eq(articles.digestDate, digestDate))
      .orderBy(desc(articles.importanceScore));

    return NextResponse.json(rows);
  } catch {
    return NextResponse.json([]);
  }
}
