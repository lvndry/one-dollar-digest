import type { Metadata } from "next";
import { DigestGrid } from "@/components/DigestGrid";
import { FilterBar } from "@/components/FilterBar";
import { DigestFeedWrapper } from "@/components/DigestFeedWrapper";
import { ArchivePaywall } from "@/components/ArchivePaywall";
import { SiteFooter } from "@/components/SiteFooter";
import { countDigestArticlesForCategory, loadDigestDay } from "@/lib/digest-day";
import { parseJsonStringArray } from "@/lib/parse-article-metadata";

export const metadata: Metadata = {
  title: "Politics",
  description:
    "Today's most important political stories, with balanced coverage and bias-labeled sources.",
  alternates: { canonical: "/politics" },
  keywords: [
    "political news",
    "US politics",
    "international news",
    "policy",
    "elections",
    "geopolitics",
  ],
  openGraph: {
    title: "Politics · The One Dollar Digest",
    description:
      "Today's most important political stories, with balanced coverage and bias-labeled sources.",
    images: [
      {
        url: "/politics/opengraph-image",
        width: 1200,
        height: 630,
        alt: "The One Dollar Digest: Politics",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: [
      { url: "/politics/opengraph-image", alt: "The One Dollar Digest: Politics" },
    ],
  },
};

interface PoliticsPageProps {
  searchParams: Promise<{ date?: string; filter?: string }>;
}

export default async function PoliticsPage({ searchParams }: PoliticsPageProps) {
  const { session, isToday, hasAccess, articles, displayDate } =
    await loadDigestDay(searchParams);
  const { filter: currentFilter } = await searchParams;

  const categoryCount = countDigestArticlesForCategory(articles, "politics");

  const filterOptions = Array.from(
    new Set(
      articles
        .filter((a) => a.category === "politics")
        .flatMap((a) => [
          ...(a.primaryRegion ? [a.primaryRegion] : []),
          ...parseJsonStringArray(a.regions),
        ])
        .map((v) => v.trim())
        .filter(Boolean),
    ),
  ).sort();

  const displayArticles = articles.filter((a) => {
    if (a.category !== "politics") return false;
    if (!currentFilter) return true;
    if (a.primaryRegion?.trim() === currentFilter) return true;
    return parseJsonStringArray(a.regions).some((r) => r.trim() === currentFilter);
  });

  return (
    <DigestFeedWrapper>
      <div className="max-w-5xl mx-auto px-6 pt-12 pb-10 text-center">
        <p
          className="font-ui text-[0.575rem] tracking-[0.24em] uppercase mb-10 fade-in"
          style={{ color: "var(--ink-muted)", animationDelay: "0ms" }}
        >
          {isToday ? `Today · ${displayDate}` : displayDate}
        </p>
        <h1
          className="font-display italic leading-[0.86] mb-12 fade-up"
          style={{
            color: "var(--ink)",
            fontSize: "clamp(3rem, 9vw, 6rem)",
            letterSpacing: "-0.035em",
            animationDelay: "50ms",
          }}
        >
          Politics
        </h1>
        <div
          className="h-px fade-in"
          style={{ backgroundColor: "var(--border)", animationDelay: "130ms" }}
        />
      </div>

      <main className="mx-auto min-w-0 max-w-5xl px-6 pb-24">
        {!hasAccess ? (
          <ArchivePaywall isSignedIn={!!session?.user} />
        ) : categoryCount === 0 ? (
          <p
            className="text-center font-ui text-[0.6875rem] tracking-[0.06em] py-20"
            style={{ color: "var(--ink-muted)" }}
          >
            Nothing was published for this date.
          </p>
        ) : (
          <>
            <FilterBar
              filterOptions={filterOptions}
              currentFilter={currentFilter ?? null}
            />
            <DigestGrid articles={displayArticles} category="politics" label="Politics" />
          </>
        )}
      </main>

      <SiteFooter />
    </DigestFeedWrapper>
  );
}
