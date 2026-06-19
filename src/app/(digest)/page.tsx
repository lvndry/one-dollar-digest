import type { Metadata } from "next";
import Link from "next/link";
import { DigestGrid } from "@/components/DigestGrid";
import { DigestFeedWrapper } from "@/components/DigestFeedWrapper";
import { NextDigestCountdown } from "@/components/NextDigestCountdown";
import { ArchivePaywall } from "@/components/ArchivePaywall";
import { SiteFooter } from "@/components/SiteFooter";
import { countDigestArticlesForCategory, loadDigestDay } from "@/lib/digest-day";

export const metadata: Metadata = {
  description:
    "Today's most important tech and political stories, AI-curated and clearly sourced.",
  alternates: { canonical: "/" },
  openGraph: {
    description:
      "Today's most important tech and political stories, AI-curated and clearly sourced.",
    images: [
      { url: "/opengraph-image", width: 1200, height: 630, alt: "The One Dollar Digest" },
    ],
  },
};

interface HomePageProps {
  searchParams: Promise<{ date?: string }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const { session, isToday, hasAccess, articles, displayDate, dateQuerySuffix } =
    await loadDigestDay(searchParams);

  const techCount = countDigestArticlesForCategory(articles, "tech");
  const politicsCount = countDigestArticlesForCategory(articles, "politics");
  const hasAnySection = techCount > 0 || politicsCount > 0;

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.onedollardigest.com";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "The One Dollar Digest",
    url: base,
    description:
      "AI-curated daily news digest. Technology and politics, clearly sourced, for $1/month.",
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${base}/?date={date}` },
      "query-input": "required name=date",
    },
  };

  return (
    <DigestFeedWrapper>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Masthead */}
      <div className="max-w-5xl mx-auto px-6 pt-12 pb-10 text-center">
        <p
          className="font-ui text-[0.575rem] tracking-[0.24em] uppercase mb-2 fade-in"
          style={{ color: "var(--ink-muted)", animationDelay: "0ms" }}
        >
          {isToday ? `Today · ${displayDate}` : displayDate}
        </p>

        <div
          className="flex justify-center mb-8 min-h-11 fade-in"
          style={{ animationDelay: "20ms" }}
        >
          <NextDigestCountdown />
        </div>

        <h1
          className="font-display italic leading-[0.86] mb-10 fade-up"
          style={{
            color: "var(--ink)",
            fontSize: "clamp(3rem, 9vw, 6rem)",
            letterSpacing: "-0.035em",
            animationDelay: "50ms",
          }}
        >
          The One Dollar
          <br />
          Digest
        </h1>

        <p
          className="font-body leading-relaxed max-w-xs mx-auto mb-10 fade-in"
          style={{
            color: "var(--ink-muted)",
            fontSize: "1rem",
            animationDelay: "130ms",
          }}
        >
          Tech and politics, clearly sourced.
          <br />
          One dollar a month.
        </p>

        {!session?.user && (
          <div className="mb-10 fade-in" style={{ animationDelay: "190ms" }}>
            <Link
              href="/login"
              className="inline-block font-ui text-[0.65rem] tracking-[0.12em] uppercase px-6 py-3 transition-opacity duration-150 hover:opacity-75"
              style={{
                color: "var(--bg)",
                backgroundColor: "var(--ink)",
              }}
            >
              Start free — 3 day trial
            </Link>
          </div>
        )}

        <div
          className="mt-12 h-px fade-in"
          style={{ backgroundColor: "var(--border)", animationDelay: "260ms" }}
        />
      </div>

      {/* Article grids */}
      <main className="mx-auto min-w-0 max-w-5xl px-6 pb-24">
        {!hasAccess ? (
          <ArchivePaywall isSignedIn={!!session?.user} />
        ) : !hasAnySection ? (
          <p
            className="text-center font-ui text-[0.6875rem] tracking-[0.06em] py-20"
            style={{ color: "var(--ink-muted)" }}
          >
            Nothing was published for this date.
          </p>
        ) : (
          <>
            {techCount > 0 && (
              <DigestGrid
                articles={articles}
                category="tech"
                label="Technology"
                articleLimit={7}
                titleHref={`/tech${dateQuerySuffix}`}
              />
            )}
            {politicsCount > 0 && (
              <DigestGrid
                articles={articles}
                category="politics"
                label="Politics"
                articleLimit={7}
                titleHref={`/politics${dateQuerySuffix}`}
              />
            )}
          </>
        )}
      </main>

      <SiteFooter />
    </DigestFeedWrapper>
  );
}
