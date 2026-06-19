import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { authenticateApiKeyFromRequest } from "@/lib/api-key";
import { canAccessDigestDate } from "@/lib/access";
import {
  serializeArchivePaywallMarkdown,
  serializeArticleToMarkdown,
} from "@/lib/article-markdown";
import { db } from "@/lib/db";
import { articles } from "@/lib/schema";

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.onedollardigest.com";
}

const MARKDOWN_HEADERS = {
  "Content-Type": "text/markdown; charset=utf-8",
} as const;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

  const session = await auth();
  const apiKeyUser = await authenticateApiKeyFromRequest(request);
  const baseUrl = getBaseUrl();

  if (!canAccessDigestDate(article.digestDate, session, apiKeyUser)) {
    return new NextResponse(serializeArchivePaywallMarkdown(!!session?.user, baseUrl), {
      status: 403,
      headers: MARKDOWN_HEADERS,
    });
  }

  return new NextResponse(serializeArticleToMarkdown(article, baseUrl), {
    headers: MARKDOWN_HEADERS,
  });
}
