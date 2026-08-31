import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import Link from "next/link";
import { cache } from "react";
import { db } from "@/lib/db";
import { articles, bookmarks } from "@/lib/schema";
import type { Article } from "@/lib/schema";
import { ReadingProgress } from "@/components/ReadingProgress";
import { ArchivePaywall } from "@/components/ArchivePaywall";
import { BookmarkButton } from "@/components/BookmarkButton";
import { auth } from "@/auth";
import { canAccessDigestDate, canAccessArchive } from "@/lib/access";
import { parseArticleSources, parseJsonStringArray } from "@/lib/parse-article-metadata";
import { and, eq } from "drizzle-orm";

async function isArticleBookmarked(articleId: number, userId: string): Promise<boolean> {
  try {
    const rows = await db
      .select()
      .from(bookmarks)
      .where(and(eq(bookmarks.userId, userId), eq(bookmarks.articleId, articleId)))
      .limit(1);
    return rows.length > 0;
  } catch {
    return false;
  }
}

const getArticle = cache(async (id: string): Promise<Article | null> => {
  try {
    const rows = await db
      .select()
      .from(articles)
      .where(eq(articles.id, parseInt(id, 10)))
      .limit(1);
    return rows[0] ?? null;
  } catch {
    return null;
  }
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const article = await getArticle(id);

  if (!article) return { title: "Article Not Found", robots: { index: false } };

  const session = await auth();
  if (!canAccessDigestDate(article.digestDate, session)) {
    return {
      title: "Premium archive article",
      description: "Subscribe to The One Dollar Digest to read archived articles.",
      robots: { index: false },
    };
  }

  const articleSources = parseArticleSources(article.sources, {
    name: article.source,
    bias: article.bias,
  });

  const images = [
    {
      url: `/article/${id}/opengraph-image`,
      width: 1200,
      height: 630,
      alt: article.title,
    },
  ];

  return {
    title: article.title,
    description: article.summary.slice(0, 160),
    alternates: { canonical: `/article/${id}` },
    openGraph: {
      title: article.title,
      description: article.summary.slice(0, 160),
      type: "article",
      publishedTime: article.publishedAt,
      section: getArticleSection(article),
      authors: articleSources.map((source) => source.name),
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.summary.slice(0, 160),
      images,
    },
  };
}

const BIAS_LABELS: Record<string, string> = {
  "far-left": "Far Left",
  left: "Left-Leaning",
  center: "Center",
  right: "Right-Leaning",
  "far-right": "Far Right",
};

const BIAS_COLOR: Record<string, string> = {
  "far-left": "var(--color-bias-far-left)",
  left: "var(--color-bias-left)",
  center: "var(--color-bias-center)",
  right: "var(--color-bias-right)",
  "far-right": "var(--color-bias-far-right)",
};

const SUB_COLOR: Record<string, string> = {
  AI: "var(--color-sub-ai)",
  VC: "var(--color-sub-vc)",
  Research: "var(--color-sub-research)",
  Startup: "var(--color-sub-startup)",
  Product: "var(--color-sub-product)",
  Security: "var(--color-sub-security)",
};

function getArticleSection(article: Article): string {
  if (article.category === "politics") return "Politics";
  if (article.category === "finance") return "Finance";
  return article.subcategory ?? "Technology";
}

function getTagColor(article: Article): string | undefined {
  if (article.category === "politics") {
    return article.bias ? BIAS_COLOR[article.bias] : "var(--ink-muted)";
  }

  if (article.subcategory) {
    return SUB_COLOR[article.subcategory] ?? "var(--color-sub-product)";
  }

  return "var(--ink-muted)";
}

function getTagLabel(article: Article): string | null {
  if (article.category === "politics") {
    return article.bias ? (BIAS_LABELS[article.bias] ?? null) : null;
  }

  return article.subcategory ?? null;
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const article = await getArticle(id);

  if (!article) notFound();

  const session = await auth();

  if (!canAccessDigestDate(article.digestDate, session)) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "var(--bg)",
          color: "var(--ink)",
        }}
      >
        <div className="max-w-[680px] mx-auto px-6 pt-14">
          <Link
            href="/"
            className="font-ui text-[0.6rem] tracking-widest uppercase transition-colors duration-150 inline-block mb-14"
            style={{ color: "var(--ink-muted)" }}
          >
            ← Today's Digest
          </Link>
        </div>
        <ArchivePaywall isSignedIn={!!session?.user} />
      </div>
    );
  }

  const tagColor = getTagColor(article);
  const tagLabel = getTagLabel(article);

  const articleTags = parseJsonStringArray(article.tags);
  const articleRegions =
    article.category === "politics" ? parseJsonStringArray(article.regions) : [];
  const primaryRegionLabel =
    article.category === "politics" && article.primaryRegion?.trim()
      ? article.primaryRegion.trim()
      : null;
  const articleSources = parseArticleSources(article.sources, {
    name: article.source,
    bias: article.bias,
  });
  const primarySourceUrl = articleSources.find((source) => source.url)?.url;
  const sourceLabel =
    articleSources.length > 1
      ? articleSources.map((source) => source.name).join(" · ")
      : (articleSources[0]?.name ?? article.source);

  const userId = session?.user?.id;
  const saved = userId ? await isArticleBookmarked(article.id, userId) : false;

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.onedollardigest.com";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: article.summary.slice(0, 160),
    datePublished: article.publishedAt,
    author: articleSources.map((source) => ({
      "@type": "Organization",
      name: source.name,
    })),
    publisher: {
      "@type": "Organization",
      name: "The One Dollar Digest",
      logo: { "@type": "ImageObject", url: `${base}/android-chrome-512x512.png` },
    },
    url: `${base}/article/${id}`,
    ...(article.imageUrl ? { image: article.imageUrl } : {}),
    ...(primarySourceUrl ? { mainEntityOfPage: primarySourceUrl } : {}),
    articleSection: getArticleSection(article),
    isAccessibleForFree: true,
  };

  return (
    <div
      style={{ minHeight: "100vh", backgroundColor: "var(--bg)", color: "var(--ink)" }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ReadingProgress />

      <article className="mx-auto min-w-0 max-w-[680px] px-6 pt-14 pb-24">
        <div className="flex items-center justify-between mb-14">
          <Link
            href="/"
            className="font-ui text-[0.6rem] tracking-widest uppercase transition-colors duration-150"
            style={{ color: "var(--ink-muted)" }}
          >
            ← Today's Digest
          </Link>
          <BookmarkButton
            articleId={article.id}
            initialSaved={saved}
            isLoggedIn={!!session?.user}
            canBookmark={canAccessArchive(session)}
          />
        </div>

        <div className="flex items-center gap-3 mb-5">
          {tagLabel && (
            <span
              className="font-ui text-[0.6rem] tracking-widest uppercase"
              style={{ color: tagColor }}
            >
              {tagLabel}
            </span>
          )}
          {article.readingTimeMinutes != null && (
            <span
              className="font-ui text-[0.575rem] tracking-[0.06em]"
              style={{ color: "var(--ink-faint)" }}
            >
              {article.readingTimeMinutes} min read
            </span>
          )}
        </div>

        <h1
          className="wrap-break-word font-display italic text-[clamp(2rem,5vw,3.25rem)] leading-[1.06] tracking-[-0.02em] mb-7"
          style={{ color: "var(--ink)" }}
        >
          {article.title}
        </h1>

        {(primaryRegionLabel || articleTags.length > 0 || articleRegions.length > 0) && (
          <div
            className="font-ui text-[0.65rem] leading-relaxed tracking-wider mb-7 -mt-4 flex flex-wrap items-baseline gap-x-8 gap-y-2"
            style={{ color: "var(--ink-muted)" }}
          >
            {primaryRegionLabel && (
              <p className="m-0">
                <span className="text-(--ink-faint) uppercase tracking-widest">
                  Primary region
                </span>{" "}
                {primaryRegionLabel}
              </p>
            )}
            {articleTags.length > 0 && (
              <p className="m-0">
                <span className="text-(--ink-faint) uppercase tracking-widest">Tags</span>{" "}
                {articleTags.join(" · ")}
              </p>
            )}
            {articleRegions.length > 0 && (
              <p className="m-0">
                <span className="text-(--ink-faint) uppercase tracking-widest">
                  Regions
                </span>{" "}
                {articleRegions.join(" · ")}
              </p>
            )}
          </div>
        )}

        <div
          className="flex items-center gap-2 font-ui text-[0.6rem] tracking-[0.08em] uppercase mb-10"
          style={{ color: "var(--ink-muted)" }}
        >
          <span style={{ color: "var(--ink-mid)", fontWeight: 500 }}>{sourceLabel}</span>
          <span style={{ color: "var(--border-strong)" }}>·</span>
          <time dateTime={article.publishedAt}>
            {new Date(article.publishedAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </time>
        </div>

        <div className="h-px mb-10" style={{ backgroundColor: "var(--border)" }} />

        {article.imageUrl && (
          <div className="w-full aspect-video overflow-hidden mb-10">
            <Image
              src={article.imageUrl}
              alt={article.title}
              width={1360}
              height={765}
              sizes="(max-width: 768px) 100vw, 680px"
              className="w-full h-full object-cover"
              priority
            />
          </div>
        )}

        <p
          className="font-body text-[1.0625rem] leading-[1.9]"
          style={{ color: "var(--ink-mid)" }}
        >
          {article.summary}
        </p>

        {article.category === "politics" && article.strategicInterpretation && (
          <section
            className="mt-10 border-l pl-5"
            style={{ borderColor: "var(--border-strong)" }}
          >
            <h2
              className="font-ui text-[0.65rem] tracking-widest uppercase mb-3"
              style={{ color: "var(--ink-faint)" }}
            >
              Strategic interpretation
            </h2>
            <div
              className="font-body text-[0.98rem] leading-[1.8] space-y-4"
              style={{ color: "var(--ink-mid)" }}
            >
              {article.strategicInterpretation.split(/\n\s*\n/).map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </section>
        )}

        {(article.category === "tech" || article.category === "finance") &&
          article.technicalSignificance && (
            <section
              className="mt-10 border-l pl-5"
              style={{ borderColor: "var(--border-strong)" }}
            >
              <h2
                className="font-ui text-[0.65rem] tracking-widest uppercase mb-3"
                style={{ color: "var(--ink-faint)" }}
              >
                Technical significance
              </h2>
              <div
                className="font-body text-[0.98rem] leading-[1.8] space-y-4"
                style={{ color: "var(--ink-mid)" }}
              >
                {article.technicalSignificance.split(/\n\s*\n/).map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          )}

        {articleSources.some((source) => source.url) && (
          <div className="mt-14 pt-10 border-t" style={{ borderColor: "var(--border)" }}>
            <h2
              className="font-ui text-[0.65rem] tracking-widest uppercase mb-4"
              style={{ color: "var(--ink-faint)" }}
            >
              Sources
            </h2>
            <div className="flex flex-col gap-3">
              {articleSources.map((source) =>
                source.url ? (
                  <a
                    key={`${source.name}-${source.url}`}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="source-link inline-flex min-w-0 max-w-full flex-wrap items-center justify-between gap-x-4 gap-y-1 border px-5 py-3 font-ui text-[0.6875rem] tracking-[0.08em] uppercase"
                    style={{
                      borderColor: "var(--border)",
                      color: "var(--ink-mid)",
                    }}
                  >
                    <span className="min-w-0 wrap-break-word">{source.name}</span>
                    {source.bias && (
                      <span style={{ color: "var(--ink-faint)" }}>
                        {BIAS_LABELS[source.bias] ?? source.bias}
                      </span>
                    )}
                  </a>
                ) : null,
              )}
            </div>
          </div>
        )}

        <div
          className="mt-16 pt-8 border-t flex items-center justify-between"
          style={{ borderColor: "var(--border)" }}
        >
          <Link
            href="/"
            className="font-ui text-[0.575rem] tracking-widest uppercase transition-opacity duration-150 hover:opacity-50"
            style={{ color: "var(--ink-muted)" }}
          >
            ← Today&apos;s Digest
          </Link>
          <span
            className="font-display italic select-none"
            style={{ color: "var(--ink-faint)", fontSize: "1.125rem" }}
            aria-hidden
          >
            ✦
          </span>
        </div>
      </article>
    </div>
  );
}
