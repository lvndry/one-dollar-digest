import type { Metadata } from "next";
import { DigestGrid } from "@/components/DigestGrid";
import { FilterBar } from "@/components/FilterBar";
import { DigestFeedWrapper } from "@/components/DigestFeedWrapper";
import { ArchivePaywall } from "@/components/ArchivePaywall";
import { SiteFooter } from "@/components/SiteFooter";
import { countDigestArticlesForCategory, loadDigestDay } from "@/lib/digest-day";

export const metadata: Metadata = {
  title: "Technology",
  description:
    "Today's most important tech stories: AI, startups, research, security and more. Curated daily.",
  alternates: { canonical: "/tech" },
  keywords: [
    "tech news",
    "AI news",
    "startup funding",
    "cybersecurity",
    "research papers",
    "product launches",
  ],
  openGraph: {
    title: "Technology · The One Dollar Digest",
    description:
      "Today's most important tech stories: AI, startups, research, security and more.",
    images: [
      {
        url: "/tech/opengraph-image",
        width: 1200,
        height: 630,
        alt: "The One Dollar Digest: Technology",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: [{ url: "/tech/opengraph-image", alt: "The One Dollar Digest: Technology" }],
  },
};

interface TechPageProps {
  searchParams: Promise<{ date?: string; filter?: string }>;
}

export default async function TechPage({ searchParams }: TechPageProps) {
  const { session, isToday, hasAccess, articles, displayDate } =
    await loadDigestDay(searchParams);
  const { filter: currentFilter } = await searchParams;

  const categoryCount = countDigestArticlesForCategory(articles, "tech");

  const filterOptions = Array.from(
    new Set(
      articles
        .filter((a) => a.category === "tech" && a.subcategory)
        .map((a) => a.subcategory!.trim()),
    ),
  ).sort();

  const displayArticles = articles.filter(
    (a) =>
      a.category === "tech" &&
      (!currentFilter || a.subcategory?.trim() === currentFilter),
  );

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
          Technology
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
            <DigestGrid articles={displayArticles} category="tech" label="Technology" />
          </>
        )}
      </main>

      <SiteFooter />
    </DigestFeedWrapper>
  );
}
