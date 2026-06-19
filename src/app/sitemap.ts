import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { articles } from "@/lib/schema";
import { desc } from "drizzle-orm";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.onedollardigest.com";

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/tech`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/politics`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/feed.xml`, changeFrequency: "hourly", priority: 0.8 },
    { url: `${base}/llms.txt`, changeFrequency: "daily", priority: 0.5 },
  ];

  try {
    const rows = await db
      .select({ id: articles.id, publishedAt: articles.publishedAt })
      .from(articles)
      .orderBy(desc(articles.publishedAt));

    const articleRoutes: MetadataRoute.Sitemap = rows.map((row) => ({
      url: `${base}/article/${row.id}`,
      lastModified: new Date(row.publishedAt),
      changeFrequency: "never",
      priority: 0.7,
    }));

    return [...staticRoutes, ...articleRoutes];
  } catch {
    return staticRoutes;
  }
}
