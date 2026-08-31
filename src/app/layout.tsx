import type { Metadata } from "next";
import { Suspense } from "react";
import { DM_Mono, Instrument_Serif, Source_Serif_4 } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { auth } from "@/auth";
import { canAccessArchive } from "@/lib/access";
import { getCachedAvailableDates } from "@/lib/available-digest-dates";
import { GlobalArchiveCalendar } from "@/components/GlobalArchiveCalendar";
import { SiteNav } from "@/components/SiteNav";
import "./globals.css";

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-instrument",
  weight: ["400"],
  style: ["normal", "italic"],
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-source-serif",
  weight: ["300", "400", "600"],
  display: "swap",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  variable: "--font-dm-mono",
  weight: ["400"],
  display: "swap",
});

export function generateMetadata(): Metadata {
  return {
    title: {
      default: "The One Dollar Digest",
      template: "%s | The One Dollar Digest",
    },
    description:
      "AI-curated daily news digest. Technology, politics, and finance, clearly sourced, for $1/month.",
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.onedollardigest.com",
    ),
    keywords: [
      "news digest",
      "AI news",
      "tech news",
      "political news",
      "finance news",
      "daily briefing",
      "technology",
      "startups",
      "AI",
      "politics",
      "finance",
    ],
    authors: [{ name: "The One Dollar Digest" }],
    creator: "The One Dollar Digest",
    openGraph: {
      siteName: "The One Dollar Digest",
      type: "website",
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      site: "@dollardigest",
      creator: "@dollardigest",
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large" },
    },
    category: "news",
  };
}

async function LayoutShell({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const availableDates = await getCachedAvailableDates().catch(() => [] as string[]);
  const archiveAccess = canAccessArchive(session);
  return (
    <SessionProvider>
      <SiteNav session={session} />
      <div className="max-w-5xl mx-auto px-6 text-center pb-2">
        <Suspense fallback={<div className="mt-6 h-[18px]" aria-hidden="true" />}>
          <GlobalArchiveCalendar
            availableDates={availableDates}
            canAccessArchive={archiveAccess}
          />
        </Suspense>
      </div>
      {children}
    </SessionProvider>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${instrumentSerif.variable} ${sourceSerif.variable} ${dmMono.variable}`}
    >
      <head>
        {/* Runs before React hydration to avoid theme flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t!=='light'){document.documentElement.classList.add('dark')}}catch(e){}})()`,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js')})}`,
          }}
        />
        <script
          defer
          src="https://cloud.umami.is/script.js"
          data-website-id="89afba01-12f7-410e-a589-458e5faaf18e"
        />
      </head>
      <body className="font-body">
        <Suspense
          fallback={
            <div
              className="sticky top-0 z-50 w-full h-14"
              style={{ borderBottom: "1px solid var(--border)" }}
            />
          }
        >
          <LayoutShell>{children}</LayoutShell>
        </Suspense>
      </body>
    </html>
  );
}
