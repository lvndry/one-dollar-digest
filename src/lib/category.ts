import type { ArticleCategory } from "@/lib/schema";

export function parseCategory(value: unknown): ArticleCategory | null {
  if (value == null) return "tech";
  if (value === "tech" || value === "politics" || value === "finance") return value;
  return null;
}
