export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const ACCEPTED_CONTENT_TYPES = /^(text\/html|application\/xhtml\+xml)\b/i;
const SOFT_404_PATH = /\/(?:404|not-found)(?:\/|$)/i;

const IMAGE_META_NAMES = [
  "og:image:secure_url",
  "og:image:url",
  "og:image",
  "twitter:image:src",
  "twitter:image",
];

function extractMetaTags(html: string): string[] {
  return html.match(/<meta\b[^>]*>/gi) ?? [];
}

function getAttr(tag: string, attr: string): string | null {
  return tag.match(new RegExp(`${attr}\\s*=\\s*["']([^"']*)["']`, "i"))?.[1] ?? null;
}

function extractImageFromMeta(html: string): string | null {
  const tags = extractMetaTags(html);
  for (const name of IMAGE_META_NAMES) {
    for (const tag of tags) {
      const property = (getAttr(tag, "property") ?? getAttr(tag, "name"))?.toLowerCase();
      if (property !== name) continue;
      const content = getAttr(tag, "content");
      if (content) return content.trim();
    }
  }
  return null;
}

function extractImageFromLinkTag(html: string): string | null {
  const match = html.match(/<link\b[^>]*>/gi)?.find((tag) => {
    const rel = getAttr(tag, "rel")?.toLowerCase();
    return rel === "image_src";
  });
  const href = match ? getAttr(match, "href") : null;
  return href?.trim() ?? null;
}

function extractImageFromJsonLd(html: string): string | null {
  const scriptPattern =
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = scriptPattern.exec(html))) {
    let data: unknown;
    try {
      data = JSON.parse(match[1] ?? "");
    } catch {
      continue;
    }

    for (const item of Array.isArray(data) ? data : [data]) {
      if (typeof item !== "object" || item === null) continue;
      const image = (item as Record<string, unknown>).image;
      if (typeof image === "string") return image.trim();
      if (Array.isArray(image) && typeof image[0] === "string") return image[0].trim();
      if (
        typeof image === "object" &&
        image !== null &&
        typeof (image as Record<string, unknown>).url === "string"
      ) {
        return ((image as Record<string, unknown>).url as string).trim();
      }
    }
  }

  return null;
}

function resolveImageUrl(candidate: string | null, baseUrl: string): string | null {
  if (!candidate) return null;
  try {
    const resolved = new URL(candidate, baseUrl);
    if (resolved.protocol !== "http:" && resolved.protocol !== "https:") return null;
    return resolved.toString();
  } catch {
    return null;
  }
}

// Reads only the head of the page — stops at </head> or the 64KB mark.
async function readHead(
  url: string,
  fetcher: FetchLike,
): Promise<{ html: string; finalUrl: string } | null> {
  const res = await fetcher(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; DollarDigest/1.0)",
      Accept: "text/html",
    },
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok || !res.body) return null;
  if (SOFT_404_PATH.test(new URL(res.url).pathname)) return null;

  const contentType = res.headers.get("content-type");
  if (contentType && !ACCEPTED_CONTENT_TYPES.test(contentType)) return null;

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let html = "";

  try {
    while (html.length < 64_000) {
      const { done, value } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });
      if (html.includes("</head>") || html.includes("<body")) break;
    }
  } finally {
    reader.cancel();
  }

  return { html, finalUrl: res.url };
}

export async function fetchOgImage(
  url: string,
  fetcher: FetchLike = fetch,
): Promise<string | null> {
  try {
    const page = await readHead(url, fetcher);
    if (!page) return null;

    const candidate =
      extractImageFromMeta(page.html) ??
      extractImageFromLinkTag(page.html) ??
      extractImageFromJsonLd(page.html);

    return resolveImageUrl(candidate, page.finalUrl);
  } catch {
    return null;
  }
}

// Fetches images with bounded concurrency to avoid hammering servers.
export async function fetchOgImages(
  urls: (string | null)[],
  concurrency = 6,
  fetcher: FetchLike = fetch,
): Promise<(string | null)[]> {
  const results: (string | null)[] = new Array(urls.length).fill(null);
  const queue = urls.map((url, index) => ({ url, index }));

  async function worker(): Promise<void> {
    while (true) {
      const item = queue.shift();
      if (!item) return;
      if (!item.url) continue;
      results[item.index] = await fetchOgImage(item.url, fetcher);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, urls.length) }, () => worker()),
  );

  return results;
}
