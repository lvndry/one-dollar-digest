import { db } from "@/lib/db";
import { normalizeArticleSources } from "@/lib/parse-article-metadata";
import { parseCategory } from "@/lib/category";
import { articles } from "@/lib/schema";
import { buildImageSourceCandidates } from "./lib/image-source-candidates";
import { fetchOgImages } from "./lib/og-image";
import { ArticleArraySchema } from "./lib/article-schema";
import { resolvePermanentSourceUrls } from "./lib/source-links";
import { readFileSync, writeFileSync } from "fs";
import { jsonrepair } from "jsonrepair";
import { sql } from "drizzle-orm";

function normalizeUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    // Normalize protocol and drop tracking params
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

const filePath = process.argv[2];
if (!filePath) {
  console.error("Usage: bun ./scripts/insert-articles.ts <file.json>");
  process.exit(1);
}

const raw = readFileSync(filePath, "utf-8");
let parsed: Record<string, unknown>[];
try {
  parsed = JSON.parse(raw) as Record<string, unknown>[];
} catch {
  console.warn("[insert] JSON parse failed, attempting repair…");
  try {
    parsed = JSON.parse(jsonrepair(raw)) as Record<string, unknown>[];
  } catch {
    console.error("[insert] JSON is unrecoverable even after repair");
    process.exit(1);
  }
}

const validation = ArticleArraySchema.safeParse(parsed);
if (!validation.success) {
  const errors = validation.error.issues.map(
    (issue) => `[${issue.path.join(".")}] ${issue.message}`,
  );
  console.error(`[insert] Schema validation failed — ${errors.length} issue(s):`);
  errors.forEach((err) => console.error(`  • ${err}`));
  const errorsFile = filePath.replace(/\.json$/i, "") + ".errors.json";
  writeFileSync(errorsFile, JSON.stringify({ file: filePath, errors }, null, 2));
  console.error(`[insert] Errors written to ${errorsFile}`);
  process.exit(1);
}
// Ensure the articles_digest_date_primary_source_url_unique index exists before inserts.
// Migration 0010 created the index but may have failed to record it properly in
// __drizzle_migrations, causing "ON CONFLICT does not match UNIQUE constraint" errors.
try {
  await db.run(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS articles_digest_date_primary_source_url_unique
    ON articles (digest_date, primary_source_url)
  `);
} catch (e) {
  console.warn("[insert] Index repair skipped (non-fatal):", e);
}

console.log(`[insert] Schema validation passed (${parsed.length} articles)`);

const dateMatch = filePath.match(/(\d{4}-\d{2}-\d{2})(?:\.json)?$/i);
const digestDate = dateMatch?.[1] ?? new Date().toISOString().split("T")[0]!;

function optionalString(value: unknown): string | null {
  return value ? String(value) : null;
}

function serializeMetadataField(value: unknown): string | null {
  if (Array.isArray(value)) return JSON.stringify(value);
  return value != null ? String(value) : null;
}

const normalizedSources = parsed.map((item) => normalizeArticleSources(item));
const sourceUrls = normalizedSources.flatMap((sources) =>
  sources.flatMap((source) => {
    const url = normalizeUrl(source.url ?? null);
    return url ? [url] : [];
  }),
);
console.log(`[insert] Validating ${new Set(sourceUrls).size} source links…`);
const resolvedSourceUrls = await resolvePermanentSourceUrls(sourceUrls);
const validatedSources = normalizedSources.map((sources) =>
  sources.flatMap((source) => {
    const requestedUrl = normalizeUrl(source.url ?? null);
    const resolvedUrl = requestedUrl ? resolvedSourceUrls.get(requestedUrl) : null;
    if (!resolvedUrl) return [];
    const url = normalizeUrl(resolvedUrl);
    if (!url) return [];
    return [
      {
        ...source,
        url,
        sourceStatus: url === requestedUrl ? "2xx" : "redirected-to-2xx",
      },
    ];
  }),
);
const imageSourceCandidates = validatedSources.map((sources) =>
  buildImageSourceCandidates({
    sources,
  }),
);

console.log(`[insert] Fetching OG images for ${parsed.length} articles…`);
const imageUrls: (string | null)[] = new Array(parsed.length).fill(null);
const maxCandidateDepth = imageSourceCandidates.reduce(
  (max, candidates) => Math.max(max, candidates.length),
  0,
);

for (let candidateDepth = 0; candidateDepth < maxCandidateDepth; candidateDepth++) {
  const urlsForPass = imageSourceCandidates.map((candidates, index) =>
    imageUrls[index] ? null : (candidates[candidateDepth] ?? null),
  );
  if (!urlsForPass.some(Boolean)) continue;

  const passResults = await fetchOgImages(urlsForPass);
  for (const [index, imageUrl] of passResults.entries()) {
    if (!imageUrls[index] && imageUrl) imageUrls[index] = imageUrl;
  }
}

console.log(`[insert] Got ${imageUrls.filter(Boolean).length}/${parsed.length} images`);

const now = new Date().toISOString();

let skippedNoUrl = 0;
const rows = parsed.flatMap((item, i) => {
  const canonicalSources = validatedSources[i] ?? [];
  const primarySource = canonicalSources[0];
  const parsedCategory = parseCategory(item.category);
  if (!parsedCategory)
    console.warn(
      `[insert] Unknown category "${item.category}" at index ${i}, defaulting to "tech"`,
    );
  const category = parsedCategory ?? "tech";
  const whyItMatters = optionalString(item.whyItMatters);
  const technicalSignificance =
    optionalString(item.technicalSignificance) ??
    (category === "tech" ? whyItMatters : null);
  const strategicInterpretation =
    optionalString(item.strategicInterpretation) ??
    (category === "politics" ? whyItMatters : null);
  if (!primarySource?.url) {
    skippedNoUrl++;
    return [];
  }

  return [
    {
      title: String(item.title ?? ""),
      summary: String(item.summary ?? ""),
      source: optionalString(item.source) ?? primarySource?.name ?? "",
      sources: canonicalSources.length > 0 ? JSON.stringify(canonicalSources) : null,
      category,
      subcategory: item.subcategory ? String(item.subcategory) : null,
      bias:
        ((item.bias ?? primarySource?.bias) as
          | "far-left"
          | "left"
          | "center"
          | "right"
          | "far-right") ?? null,
      publishedAt: item.publishedAt ? String(item.publishedAt) : digestDate,
      readingTimeMinutes: item.readingTimeMinutes
        ? Number(item.readingTimeMinutes)
        : null,
      importanceScore: item.importanceScore ? Number(item.importanceScore) : null,
      imageUrl: imageUrls[i] ?? null,
      tags: serializeMetadataField(item.tags),
      regions: serializeMetadataField(item.regions),
      primaryRegion: item.primaryRegion ? String(item.primaryRegion) : null,
      strategicInterpretation,
      technicalSignificance,
      primarySourceUrl: primarySource?.url ?? null,
      digestDate,
      createdAt: now,
    },
  ];
});

if (skippedNoUrl > 0)
  console.log(`[insert] Skipped ${skippedNoUrl} articles with no canonical source URLs`);

// Deduplicate within the batch by normalized title before hitting the DB
const seenTitles = new Set<string>();
const dedupedRows = rows.filter((row) => {
  const key = row.title.toLowerCase().trim();
  if (seenTitles.has(key)) return false;
  seenTitles.add(key);
  return true;
});

const skippedDuplicates = rows.length - dedupedRows.length;
if (skippedDuplicates > 0) {
  console.log(`[insert] Dropped ${skippedDuplicates} in-batch duplicates`);
}

if (dedupedRows.length === 0) {
  console.log(`[insert] No articles to insert for ${digestDate} — all duplicates`);
  writeFileSync(
    "/tmp/insert-stats.json",
    JSON.stringify({ inserted: 0, skippedNoUrl, skippedDuplicates }),
  );
  process.exit(0);
}

const result = await db
  .insert(articles)
  .values(dedupedRows)
  .onConflictDoNothing({
    target: [articles.digestDate, articles.primarySourceUrl],
  });
const inserted = result.rowsAffected;
const skippedConflicts = dedupedRows.length - inserted;
if (skippedConflicts > 0)
  console.log(`[insert] Skipped ${skippedConflicts} already-stored articles`);
console.log(
  `[insert] Inserted ${inserted} / ${dedupedRows.length} articles for ${digestDate} ✓`,
);
writeFileSync(
  "/tmp/insert-stats.json",
  JSON.stringify({ inserted, skippedNoUrl, skippedDuplicates }),
);

const revalidateUrl = process.env.REVALIDATE_URL;
const ingestSecret = process.env.INGEST_SECRET;
if (revalidateUrl && ingestSecret) {
  try {
    await fetch(revalidateUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${ingestSecret}` },
    });
    console.log("[insert] Cache revalidated ✓");
  } catch (err) {
    console.warn("[insert] Cache revalidation failed (non-fatal):", err);
  }
}
