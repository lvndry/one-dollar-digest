import { evaluateResearchDepth, triageLeads } from "./lib/jev-research";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

type Request =
  | {
      mode: "triage";
      dimension: string;
      digestDate: string;
      leads: Array<{
        id: string;
        title: string;
        snippet: string;
        sourceName?: string;
        sourceType?: string;
        publishedAt?: string;
      }>;
    }
  | {
      mode: "depth";
      dimension: string;
      event: JsonValue;
      knowledgeTree: JsonValue;
    };

async function main() {
  if (!process.env.TYPESAFE_API_KEY?.trim()) {
    throw new Error("TYPESAFE_API_KEY is required");
  }

  const raw = await Bun.stdin.text();
  const request = JSON.parse(raw) as Request;

  if (request.mode === "triage") {
    if (!Array.isArray(request.leads) || request.leads.length === 0) {
      throw new Error("triage mode requires at least one lead");
    }
    if (request.leads.length > 20) {
      throw new Error("triage mode accepts at most 20 leads per request");
    }
    console.log(JSON.stringify(await triageLeads(request), null, 2));
    return;
  }

  if (request.mode === "depth") {
    console.log(JSON.stringify(await evaluateResearchDepth(request), null, 2));
    return;
  }

  throw new Error("mode must be triage or depth");
}

await main();
