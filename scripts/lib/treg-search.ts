export type SearchSourceType = "news" | "web";

export type TregSearchRequest = {
  query: string;
  searchQueries?: string[];
  sourceType?: SearchSourceType;
  fromDate?: string;
  maxResults?: number;
};

export type SearchLead = {
  title: string;
  url: string;
  snippet: string;
  publishedAt?: string;
  sourceName?: string;
  query: string;
};

export type TregSearchResponse = {
  results: SearchLead[];
  droppedBeforeFromDate: number;
  servedBy: string[];
  chargedMicro: number;
  errors: string[];
};

type ProviderRow = Record<string, unknown>;

type RoutedAnswer = {
  output?: { results?: ProviderRow[] };
  _treg?: { served_by?: string; charged_micro?: number };
  detail?: unknown;
};

const TREG_BASE_URL = "https://treg.to";
const MAX_QUERIES = 5;
const MAX_QUERY_LENGTH = 400;
const DEFAULT_MAX_RESULTS = 10;
const MAX_RESULTS_PER_QUERY = 20;
const ROUTE_MAX_COST_USD = "0.02";

const ENDPOINT_BY_SOURCE_TYPE: Record<SearchSourceType, string> = {
  news: "treg.web.search.news",
  web: "treg.web.search",
};

const RELATIVE_UNIT_MS: Record<string, number> = {
  minute: 60_000,
  hour: 3_600_000,
  day: 86_400_000,
  week: 7 * 86_400_000,
  month: 30 * 86_400_000,
  year: 365 * 86_400_000,
};

function firstString(row: ProviderRow, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

export function parsePublishedAt(raw: string | undefined, now: Date): string | undefined {
  if (!raw) return undefined;

  const relative = raw.match(/^(\d+)\s+(minute|hour|day|week|month|year)s?\s+ago$/i);
  if (relative) {
    const amount = Number(relative[1]);
    const unitMs = RELATIVE_UNIT_MS[relative[2].toLowerCase()];
    return new Date(now.getTime() - amount * unitMs).toISOString().slice(0, 10);
  }
  if (/^(yesterday)$/i.test(raw)) {
    return new Date(now.getTime() - RELATIVE_UNIT_MS.day).toISOString().slice(0, 10);
  }

  const parsed = Date.parse(raw);
  if (Number.isNaN(parsed)) return undefined;
  return new Date(parsed).toISOString().slice(0, 10);
}

export function normalizeRow(
  row: ProviderRow,
  query: string,
  now: Date,
): SearchLead | undefined {
  const url = firstString(row, ["url", "link"]);
  const title = firstString(row, ["title", "name"]);
  if (!url || !title) return undefined;

  return {
    title,
    url,
    snippet: firstString(row, ["snippet", "description", "text", "content"]) ?? "",
    publishedAt: parsePublishedAt(
      firstString(row, ["published_date", "publishedDate", "published_at", "date"]),
      now,
    ),
    sourceName: firstString(row, ["publisher", "source_name", "site_name"]),
    query,
  };
}

export function buildQueries(request: TregSearchRequest): string[] {
  const phrases = (request.searchQueries ?? [])
    .map((phrase) => phrase.trim())
    .filter(Boolean);
  const queries = phrases.length > 0 ? phrases : [request.query.trim()];
  return [...new Set(queries)]
    .slice(0, MAX_QUERIES)
    .map((query) => query.slice(0, MAX_QUERY_LENGTH));
}

export function mergeLeads(
  leads: SearchLead[],
  fromDate: string | undefined,
): { results: SearchLead[]; droppedBeforeFromDate: number } {
  const seenUrls = new Set<string>();
  const results: SearchLead[] = [];
  let droppedBeforeFromDate = 0;

  for (const lead of leads) {
    if (seenUrls.has(lead.url)) continue;
    seenUrls.add(lead.url);
    if (fromDate && lead.publishedAt && lead.publishedAt < fromDate) {
      droppedBeforeFromDate += 1;
      continue;
    }
    results.push(lead);
  }
  return { results, droppedBeforeFromDate };
}

async function searchOnce(
  endpoint: string,
  query: string,
  limit: number,
  token: string,
): Promise<RoutedAnswer> {
  const response = await fetch(`${TREG_BASE_URL}/call/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Treg-Token": token,
      "X-Treg-Route-Max-Cost": ROUTE_MAX_COST_USD,
    },
    body: JSON.stringify({ q: query, limit }),
    signal: AbortSignal.timeout(60_000),
  });
  const answer = (await response.json().catch(() => ({}))) as RoutedAnswer;
  if (!response.ok) {
    throw new Error(
      `${endpoint} ${response.status}: ${JSON.stringify(answer.detail ?? answer)}`,
    );
  }
  return answer;
}

export async function tregSearch(
  request: TregSearchRequest,
  token: string,
  now = new Date(),
): Promise<TregSearchResponse> {
  if (!request.query?.trim()) throw new Error("query is required");

  const endpoint = ENDPOINT_BY_SOURCE_TYPE[request.sourceType ?? "news"];
  if (!endpoint) throw new Error("sourceType must be news or web");

  const limit = Math.min(
    Math.max(request.maxResults ?? DEFAULT_MAX_RESULTS, 1),
    MAX_RESULTS_PER_QUERY,
  );
  const queries = buildQueries(request);
  const settled = await Promise.allSettled(
    queries.map((query) => searchOnce(endpoint, query, limit, token)),
  );

  const leads: SearchLead[] = [];
  const servedBy = new Set<string>();
  const errors: string[] = [];
  let chargedMicro = 0;

  settled.forEach((outcome, index) => {
    if (outcome.status === "rejected") {
      errors.push(
        String(outcome.reason instanceof Error ? outcome.reason.message : outcome.reason),
      );
      return;
    }
    const answer = outcome.value;
    if (answer._treg?.served_by) servedBy.add(answer._treg.served_by);
    chargedMicro += answer._treg?.charged_micro ?? 0;
    for (const row of answer.output?.results ?? []) {
      const lead = normalizeRow(row, queries[index], now);
      if (lead) leads.push(lead);
    }
  });

  if (errors.length === queries.length) {
    throw new Error(`every treg search failed: ${errors.join("; ")}`);
  }

  return {
    ...mergeLeads(leads, request.fromDate),
    servedBy: [...servedBy],
    chargedMicro,
    errors,
  };
}
