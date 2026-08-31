const ACCEPTED_CONTENT_TYPES =
  /^(text\/html|application\/xhtml\+xml|application\/pdf)\b/i;
const SOFT_404_PATH = /\/(?:404|not-found)(?:\/|$)/i;

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/**
 * Resolves a publisher link to the final page a reader will receive. A source
 * is usable only when redirects finish at a 2xx HTML/PDF document rather than
 * a dead link, download, or obvious soft-404 route.
 */
export async function resolvePermanentSourceUrl(
  url: string,
  fetcher: FetchLike = fetch,
): Promise<string | null> {
  try {
    const response = await fetcher(url, {
      redirect: "follow",
      headers: {
        Accept: "text/html,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.1",
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok || SOFT_404_PATH.test(new URL(response.url).pathname)) return null;

    const contentType = response.headers.get("content-type");
    if (contentType && !ACCEPTED_CONTENT_TYPES.test(contentType)) return null;

    return response.url;
  } catch {
    return null;
  }
}

export async function resolvePermanentSourceUrls(
  urls: readonly string[],
  fetcher: FetchLike = fetch,
): Promise<Map<string, string>> {
  const uniqueUrls = [...new Set(urls)];
  const resolved = new Map<string, string>();
  const concurrency = 6;

  for (let start = 0; start < uniqueUrls.length; start += concurrency) {
    const batch = uniqueUrls.slice(start, start + concurrency);
    const results = await Promise.all(
      batch.map(
        async (url) => [url, await resolvePermanentSourceUrl(url, fetcher)] as const,
      ),
    );
    for (const [url, finalUrl] of results) {
      if (finalUrl) resolved.set(url, finalUrl);
    }
  }

  return resolved;
}
