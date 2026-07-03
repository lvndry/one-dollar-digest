import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import type { NewArticle } from "@/lib/schema";
import { normalizeArticleSources } from "@/lib/parse-article-metadata";
import { parseCategory } from "@/lib/category";
import { db } from "@/lib/db";
import { articles } from "@/lib/schema";

function optionalString(value: unknown): string | null {
  return value ? String(value) : null;
}

function serializeStringArray(value: unknown): string | null {
  if (!Array.isArray(value)) return null;
  const strings = value.filter((item): item is string => typeof item === "string");
  return strings.length > 0 ? JSON.stringify(strings) : null;
}

function serializeMetadataField(value: unknown): string | null {
  return serializeStringArray(value) ?? optionalString(value);
}

function normalizeUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    parsed.protocol = "https:";
    parsed.hostname = parsed.hostname.replace(/^www\./, "");
    for (const key of [...parsed.searchParams.keys()]) {
      if (/^utm_|^fbclid$|^gclid$|^ref$/.test(key)) parsed.searchParams.delete(key);
    }
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return url;
  }
}

export async function POST(request: NextRequest) {
  const ingestSecret = process.env.INGEST_SECRET;
  if (!ingestSecret) {
    return NextResponse.json(
      { error: "Ingest endpoint not configured" },
      { status: 503 },
    );
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${ingestSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let rows: Record<string, unknown>[];
  try {
    rows = (await request.json()) as Record<string, unknown>[];
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "Expected a non-empty array" }, { status: 400 });
  }

  const invalidCategoryIndex = rows.findIndex(
    (row) => parseCategory(row.category) === null,
  );
  if (invalidCategoryIndex !== -1) {
    return NextResponse.json(
      {
        error: `Invalid category at row ${invalidCategoryIndex}; expected "tech", "politics", or "finance"`,
      },
      { status: 400 },
    );
  }

  const invalidSourcesIndex = rows.findIndex((row) =>
    normalizeArticleSources(row).every((source) => !normalizeUrl(source.url ?? null)),
  );
  if (invalidSourcesIndex !== -1) {
    return NextResponse.json(
      {
        error: `Invalid sources at row ${invalidSourcesIndex}; provide at least one source with a valid URL`,
      },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();
  const today = now.split("T")[0];

  const prepared: NewArticle[] = rows.flatMap((row) => {
    const digestDate = optionalString(row.digestDate) ?? today;
    const category = parseCategory(row.category) ?? "tech";
    const whyItMatters = optionalString(row.whyItMatters);
    const technicalSignificance =
      optionalString(row.technicalSignificance) ??
      (category === "tech" || category === "finance" ? whyItMatters : null);
    const strategicInterpretation =
      optionalString(row.strategicInterpretation) ??
      (category === "politics" ? whyItMatters : null);

    const sources = normalizeArticleSources(row);
    const canonicalSources = sources.flatMap((source) => {
      const url = normalizeUrl(source.url ?? null);
      if (!url) return [];
      return [{ ...source, url }];
    });
    const primarySource = canonicalSources[0];

    if (!primarySource?.url) return [];

    return [
      {
        title: String(row.title ?? ""),
        summary: String(row.summary ?? ""),
        source: optionalString(row.source) ?? primarySource?.name ?? "",
        sources: canonicalSources.length > 0 ? JSON.stringify(canonicalSources) : null,
        category,
        subcategory: optionalString(row.subcategory),
        bias: ((row.bias ?? primarySource?.bias) as NewArticle["bias"]) ?? null,
        publishedAt: optionalString(row.publishedAt) ?? today,
        readingTimeMinutes: row.readingTimeMinutes
          ? Number(row.readingTimeMinutes)
          : null,
        importanceScore: row.importanceScore ? Number(row.importanceScore) : null,
        imageUrl: optionalString(row.imageUrl),
        tags: serializeMetadataField(row.tags),
        regions: serializeMetadataField(row.regions),
        primaryRegion: optionalString(row.primaryRegion),
        strategicInterpretation,
        technicalSignificance,
        digestDate,
        createdAt: optionalString(row.createdAt) ?? now,
      },
    ];
  });

  const seenTitles = new Set<string>();
  const deduped = prepared.filter((row) => {
    const key = row.title.toLowerCase().trim();
    if (seenTitles.has(key)) return false;
    seenTitles.add(key);
    return true;
  });

  await db.insert(articles).values(deduped).onConflictDoNothing();

  revalidateTag("articles", "default");

  return NextResponse.json({ inserted: deduped.length });
}
