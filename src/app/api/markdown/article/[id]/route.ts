import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import {
  apiAccessDeniedResponse,
  apiResponseHeaders,
  requireApiKey,
} from "@/lib/api-access";
import { serializeArticleToMarkdown } from "@/lib/article-markdown";
import { db } from "@/lib/db";
import { articles } from "@/lib/schema";

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.onedollardigest.com";
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authentication = await requireApiKey(request);
  if ("response" in authentication) return authentication.response;

  const { id } = await params;
  const articleId = parseInt(id, 10);
  if (Number.isNaN(articleId)) {
    return new NextResponse("Not found", { status: 404 });
  }

  let article;
  try {
    const rows = await db
      .select()
      .from(articles)
      .where(eq(articles.id, articleId))
      .limit(1);
    article = rows[0];
  } catch {
    return new NextResponse("Internal Server Error", { status: 500 });
  }

  if (!article) {
    return new NextResponse("Not found", { status: 404 });
  }

  const denied = apiAccessDeniedResponse(article.digestDate, authentication.apiKeyUser);
  if (denied) return denied;

  return new NextResponse(serializeArticleToMarkdown(article, getBaseUrl()), {
    headers: apiResponseHeaders("text/markdown; charset=utf-8"),
  });
}
