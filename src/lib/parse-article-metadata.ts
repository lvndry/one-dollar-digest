/** Parses JSON string array columns on articles (e.g. tags, regions). */
export function parseJsonStringArray(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

export interface ArticleSource {
  name: string;
  url: string | null;
  bias?: string | null;
  sourceStatus?: string | null;
  confidence?: string | null;
}

export interface ArticleSourceFallback {
  name: string;
  url?: string | null;
  bias?: string | null;
}

export function formatArticleSourceLabel(
  articleSources: ArticleSource[],
  fallbackName: string,
): string {
  const primarySourceName = articleSources[0]?.name ?? fallbackName;
  const additionalSourceCount = articleSources.length - 1;

  if (additionalSourceCount <= 0) return primarySourceName;

  return `${primarySourceName} + ${additionalSourceCount} ${
    additionalSourceCount === 1 ? "source" : "sources"
  }`;
}

function optionalString(value: unknown): string | null {
  return value ? String(value) : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function fallbackSources(fallback: ArticleSourceFallback): ArticleSource[] {
  return fallback.name
    ? [
        {
          name: fallback.name,
          url: fallback.url ?? null,
          bias: fallback.bias ?? null,
        },
      ]
    : [];
}

export function normalizeArticleSources(row: Record<string, unknown>): ArticleSource[] {
  if (Array.isArray(row.sources)) {
    const sources = row.sources.flatMap((source): ArticleSource[] => {
      if (!isRecord(source)) return [];
      const name = optionalString(source.name)?.trim();
      if (!name) return [];

      return [
        {
          name,
          url: optionalString(source.url),
          bias: optionalString(source.bias),
          sourceStatus: optionalString(source.sourceStatus),
          confidence: optionalString(source.confidence),
        },
      ];
    });

    if (sources.length > 0) return sources;
  }

  const name = optionalString(row.source)?.trim();
  if (!name) return [];

  return [
    {
      name,
      url: null,
      bias: optionalString(row.bias),
    },
  ];
}

export function parseArticleSources(
  raw: string | null,
  fallback: ArticleSourceFallback,
): ArticleSource[] {
  if (!raw) return fallbackSources(fallback);

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return fallbackSources(fallback);

    const sources = parsed.flatMap((item): ArticleSource[] => {
      if (!isRecord(item)) return [];

      const name = typeof item.name === "string" ? item.name.trim() : "";
      if (!name) return [];

      return [
        {
          name,
          url: typeof item.url === "string" && item.url.trim() ? item.url : null,
          bias: typeof item.bias === "string" && item.bias.trim() ? item.bias : null,
          sourceStatus:
            typeof item.sourceStatus === "string" && item.sourceStatus.trim()
              ? item.sourceStatus
              : null,
          confidence:
            typeof item.confidence === "string" && item.confidence.trim()
              ? item.confidence
              : null,
        },
      ];
    });

    return sources.length > 0 ? sources : fallbackSources(fallback);
  } catch {
    return fallbackSources(fallback);
  }
}
