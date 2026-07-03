import type { Article, ArticleCategory } from "@/lib/schema";
import { formatDigestDisplayDate } from "@/lib/digest-day";
import { serializeArticleToMarkdown } from "@/lib/article-markdown";

const CATEGORY_ORDER: ArticleCategory[] = ["tech", "finance", "politics"];

const CATEGORY_LABELS: Record<ArticleCategory, string> = {
  tech: "Technology",
  finance: "Finance",
  politics: "Politics",
};

export function serializeDigestToMarkdown(
  articles: Article[],
  digestDate: string,
  baseUrl: string,
): string {
  const displayDate = formatDigestDisplayDate(digestDate);
  const lines: string[] = [
    `# The One Dollar Digest — ${displayDate}`,
    "",
    `- **Digest date:** ${digestDate}`,
    `- **HTML:** ${baseUrl}/?date=${digestDate}`,
    `- **Articles:** ${articles.length}`,
    "",
  ];

  for (const category of CATEGORY_ORDER) {
    const categoryArticles = articles.filter((a) => a.category === category);
    if (categoryArticles.length === 0) continue;

    lines.push(`## ${CATEGORY_LABELS[category]}`, "");
    for (const article of categoryArticles) {
      lines.push(serializeArticleToMarkdown(article, baseUrl));
      lines.push("---", "");
    }
  }

  return lines.join("\n").trimEnd() + "\n";
}
