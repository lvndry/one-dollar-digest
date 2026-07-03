import type { Article } from "@/lib/schema";
import { parseArticleSources, parseJsonStringArray } from "@/lib/parse-article-metadata";

const BIAS_LABELS: Record<string, string> = {
  "far-left": "Far Left",
  left: "Left-Leaning",
  center: "Center",
  right: "Right-Leaning",
  "far-right": "Far Right",
};

function formatPublishedDate(publishedAt: string): string {
  return new Date(publishedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function getCategoryLabel(article: Article): string {
  if (article.category === "politics") return "Politics";
  if (article.category === "finance") return "Finance";
  return article.subcategory ? `Technology · ${article.subcategory}` : "Technology";
}

function getSourceLabels(article: Article): string {
  const sources = parseArticleSources(article.sources, {
    name: article.source,
    bias: article.bias,
  });
  return sources.map((s) => s.name).join(" · ");
}

export function serializeArticleToMarkdown(article: Article, baseUrl: string): string {
  const articleSources = parseArticleSources(article.sources, {
    name: article.source,
    bias: article.bias,
  });
  const tags = parseJsonStringArray(article.tags);
  const regions =
    article.category === "politics" ? parseJsonStringArray(article.regions) : [];
  const primaryRegion =
    article.category === "politics" && article.primaryRegion?.trim()
      ? article.primaryRegion.trim()
      : null;

  const lines: string[] = [`# ${article.title}`, ""];

  lines.push(`- **Category:** ${getCategoryLabel(article)}`);
  lines.push(`- **Published:** ${formatPublishedDate(article.publishedAt)}`);
  if (article.readingTimeMinutes != null) {
    lines.push(`- **Reading time:** ${article.readingTimeMinutes} min`);
  }
  lines.push(`- **Digest date:** ${article.digestDate}`);
  lines.push(`- **Sources:** ${getSourceLabels(article)}`);
  if (primaryRegion) lines.push(`- **Primary region:** ${primaryRegion}`);
  if (tags.length > 0) lines.push(`- **Tags:** ${tags.join(" · ")}`);
  if (regions.length > 0) lines.push(`- **Regions:** ${regions.join(" · ")}`);
  lines.push(`- **HTML:** ${baseUrl}/article/${article.id}`);

  lines.push("", "## Summary", "", article.summary);

  if (article.category === "politics" && article.strategicInterpretation) {
    lines.push("", "## Strategic interpretation", "", article.strategicInterpretation);
  }

  if (
    (article.category === "tech" || article.category === "finance") &&
    article.technicalSignificance
  ) {
    lines.push("", "## Technical significance", "", article.technicalSignificance);
  }

  const linkedSources = articleSources.filter((s) => s.url);
  if (linkedSources.length > 0) {
    lines.push("", "## Sources", "");
    for (const source of linkedSources) {
      const bias = source.bias ? ` (${BIAS_LABELS[source.bias] ?? source.bias})` : "";
      lines.push(`- [${source.name}](${source.url})${bias}`);
    }
  }

  lines.push("");
  return lines.join("\n");
}

export function serializeArchivePaywallMarkdown(
  isSignedIn: boolean,
  baseUrl: string,
): string {
  const lines = [
    "# Premium archive content",
    "",
    isSignedIn
      ? "Your free trial has ended. Subscribe for $1/month to access all previous digests."
      : "Read every digest, past and present. Sign in for a 3-day free trial, then just $1/month. Cancel anytime.",
    "",
    isSignedIn ? `Subscribe: ${baseUrl}/login` : `Start free trial: ${baseUrl}/login`,
    "",
    "Today's digest is always free. No credit card needed to sign in.",
    "",
  ];
  return lines.join("\n");
}
