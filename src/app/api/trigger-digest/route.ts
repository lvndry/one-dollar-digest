import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const GITHUB_REPO = "lvndry/one-dollar-digest";
const VALID_CATEGORIES = ["both", "tech", "politics", "finance"] as const;
type Category = (typeof VALID_CATEGORIES)[number];

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const ghToken = process.env.GH_PAT;

  if (!cronSecret || !ghToken) {
    return NextResponse.json(
      { error: "Trigger endpoint is not configured" },
      { status: 500 },
    );
  }

  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) || {};

  let category: Category = "both";
  if (body.category && VALID_CATEGORIES.includes(body.category)) {
    category = body.category;
  }

  let date = "";
  if (typeof body.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
    date = body.date;
  }

  const inputs: Record<string, string> = { category };
  if (date) inputs.date = date;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  let response: Response;
  try {
    response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/daily-digest.yml/dispatches`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ghToken}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ref: "main", inputs }),
        signal: controller.signal,
      },
    );
  } catch {
    return NextResponse.json({ error: "GitHub API request timed out" }, { status: 504 });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const text = await response.text();
    console.error("GitHub dispatch failed:", response.status, text);
    return NextResponse.json({ error: "Failed to dispatch workflow" }, { status: 502 });
  }

  return NextResponse.json({ dispatched: true, category, date: date || null });
}
