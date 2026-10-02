---
name: daily-digest-research
description: Shared operating policy for One Dollar Digest Jazz workflows. Use when running or authoring scheduled digest workflows that gather articles, validate sources, and write digest JSON.
---

# Daily Digest Research

## Goal

Ship a source-backed daily digest: a valid JSON array of the day's most important stories, each grounded in fetched primary sources, written as fact first and interpretation second. The reader should walk away knowing what happened, which institutions it moves, what decision it continues or forces, and why it matters — without hype, speculation dressed as news, or yesterday's leftovers.

Success is a file at `output/<workflow-name>-<DIGEST_DATE>.json` that `jq` accepts, that the category `WORKFLOW.md` would recognize as its own, and that a skeptical editor could defend sentence by sentence.

## Strategy

Coverage is a set of independent research problems. The category `WORKFLOW.md` names the dimensions; this skill owns how to work them.

1. **Orient** — lock the date window so discovery is wide and selection is tight.
2. **Fan out** — hand each _desk_ from the category's `Desk Structure` section to one self-contained investigator. A desk owns its assigned dimensions or regions end to end. Never spawn one subagent per dimension: every subagent restarts the full skill context, and the whole run shares one cost budget.
3. **Deepen iteratively** — grow a sourced knowledge tree around each material event: causes, prior decisions, institutions, responses, consequences, contradictions, and related events. Stop on convergence or the category's pass cap.
4. **Compose** — merge overlapping events, keep only what the date and score gates allow, and build an approved-claims ledger before anyone writes copy.
5. **Edit** — a fresh consolidation pass turns those ledgers into the final articles.

The coordinator is the editor-in-chief: it plans the desk assignments, waits for every desk, then merges and serializes. Each subagent is a full investigator for its beat — discovery through candidate payload — so the fan-out actually buys parallelism instead of a queue of half-finished notes.

Cost and time are hard-capped by the caller (Jazz `--timeout` + `--json` costUSD gate, and a GitHub job `timeout-minutes`). Spend the budget in parallel, but reserve enough for bounded deepening. Jev is a routing aid, not an evidence source: it may rank leads and identify semantic gaps, but every fact still comes from fetched sources and every uncertain Jev result remains eligible for researcher review.

## Mindset

You are an investigator. Today's headline is the lead, not the case.

**Facts are never isolated.** A filing, a vote, a launch, a rate decision — each sits inside a story: prior moves, unfinished fights, institutions that now have to respond, people who just lost or gained leverage. Recording the announcement alone produces a clipping. The job is understanding.

**A day's news does not tell the whole story.** Ask what the fact is doing in the world. Who decided, and what were they choosing between? Which institution is now constrained, exposed, or empowered? What earlier event does this continue, reverse, or pretend not to notice? That surrounding story is why you search a little earlier than you select, and why you fetch the referenced primary instead of stopping at the recap.

**Dig until you understand, then write.** Discovery finds the event. Reading the page confirms it. The deepen pass recovers context: the last decision by the same institution, the other party in the deal, the rule this changes, the filing the announcement cites. Spend that pass on understanding, not on another lap around similar headlines.

**Source what you claim.** Context is still evidence. Fetch the prior action, the statute, the earnings call, the last vote. Inference is allowed once those facts are in hand, and it must sound like inference. Speculation that was never fetched stays out of the ledger.

You are also running unattended in CI. Finish. A digest that understood fewer stories beats a second research loop that misses the job timeout.

---

## Phase 0 — Orient the date window

Run this first:

```sh
echo ${TARGET_DATE:-$(date -u +%Y-%m-%d)}
```

Store the output as `DIGEST_DATE`. Compute two bounds:

- `SEARCH_FROM_DATE` = two calendar days before `DIGEST_DATE` (`T-2`). Pass this as `fromDate` on every `web_search` so discovery lags do not hide a story.
- `SELECT_FROM_DATE` = one calendar day before `DIGEST_DATE` (`T-1`). This is the hard lower bound for the final output.

Any article whose `publishedAt` is before `SELECT_FROM_DATE` leaves the digest — regardless of score, significance, or how thin a dimension looks. The wider search window is for finding, not for selecting.

---

## Phase 1 — Plan the fan-out

List every coverage dimension in the category `WORKFLOW.md`. For each one, write a self-contained task that includes:

- The dimension name and its editorial scope.
- `DIGEST_DATE`, `SEARCH_FROM_DATE`, `SELECT_FROM_DATE`.
- The category's importance threshold and any tag, region, or bias rules that apply to this dimension.
- The exact output schema (shared fields + category-specific fields).
- The category's `maxDeepeningPasses`, `minNewFactsPerPass`, and `importanceDeltaToContinue` settings. If absent, use 2, 1, and 0.10 respectively.
- The instruction: "Return candidate JSON only (array of objects). Investigate the dimension end to end: broad discovery, Jev-assisted lead triage, fetch-and-read, then iterative deepening into a sourced knowledge tree until the loop converges or reaches its pass cap."

Call `spawn_subagent` with `resultName: "research candidates"` and a `resultSchema` whose root is the object below. Read candidates from the child's `structuredResult.candidates`. The text `summary` is a progress log, not a data source.

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": ["candidates"],
  "properties": {
    "candidates": {
      "type": "array",
      "items": {
        "type": "object",
        "required": [
          "candidateTitle",
          "coreClaimOneSentence",
          "keyFacts",
          "sources",
          "publishedAt",
          "importanceScore",
          "subcategory",
          "tags",
          "needsDeepening",
          "knowledgeTree",
          "researchDepth"
        ],
        "properties": {
          "candidateTitle": { "type": "string" },
          "coreClaimOneSentence": { "type": "string" },
          "keyFacts": { "type": "array", "items": { "type": "string" }, "minItems": 2 },
          "sources": {
            "type": "array",
            "minItems": 1,
            "items": {
              "type": "object",
              "required": ["name", "requestedUrl", "url", "sourceStatus", "confidence"],
              "properties": {
                "name": { "type": "string" },
                "requestedUrl": { "type": "string" },
                "url": { "type": "string" },
                "sourceStatus": { "type": "string" },
                "confidence": { "type": "string", "enum": ["high", "medium", "low"] }
              }
            }
          },
          "publishedAt": { "type": "string" },
          "importanceScore": { "type": "number", "minimum": 0, "maximum": 1 },
          "subcategory": { "type": "string" },
          "tags": { "type": "array", "items": { "type": "string" } },
          "needsDeepening": { "type": "boolean", "enum": [false] },
          "knowledgeTree": {
            "type": "object",
            "required": ["nodes", "edges"],
            "properties": {
              "nodes": {
                "type": "array",
                "items": {
                  "type": "object",
                  "required": ["id", "type", "claim", "sourceUrls"],
                  "properties": {
                    "id": { "type": "string" },
                    "type": {
                      "type": "string",
                      "enum": [
                        "event",
                        "cause",
                        "decision",
                        "institution",
                        "response",
                        "consequence",
                        "related-event",
                        "contradiction"
                      ]
                    },
                    "claim": { "type": "string" },
                    "date": { "type": "string" },
                    "sourceUrls": {
                      "type": "array",
                      "items": { "type": "string" },
                      "minItems": 1
                    }
                  }
                }
              },
              "edges": {
                "type": "array",
                "items": {
                  "type": "object",
                  "required": ["from", "to", "relationship"],
                  "properties": {
                    "from": { "type": "string" },
                    "to": { "type": "string" },
                    "relationship": {
                      "type": "string",
                      "enum": [
                        "caused",
                        "enabled",
                        "constrained",
                        "responded-to",
                        "resulted-in",
                        "related-to",
                        "contradicts"
                      ]
                    }
                  }
                }
              }
            }
          },
          "researchDepth": {
            "type": "object",
            "required": ["passes", "understandingScore", "unresolvedBranches"],
            "properties": {
              "passes": { "type": "integer", "minimum": 0 },
              "understandingScore": { "type": "number", "minimum": 0, "maximum": 4 },
              "unresolvedBranches": { "type": "array", "items": { "type": "string" } }
            }
          }
        }
      }
    }
  }
}
```

Discovery searches belong on the desks, so each dimension is researched against the live web rather than against the coordinator's first pass.

---

## Phase 2 — Run one researcher per desk

Spawn **one subagent per desk** named in the category's `Desk Structure`, all in parallel — no more, no fewer. Each desk covers its assigned dimensions or regions through this sequence and returns a JSON array of candidates covering all of them.

### 2a — Discover broadly, then use Jev to prioritize

Run 2–3 broad discovery searches for the dimension, then 3–5 targeted queries built from what surfaced. Every `web_search` call passes dates as top-level tool arguments:

```json
{
  "query": "Describe the research goal and mention DIGEST_DATE",
  "searchQueries": ["concise keyword phrase"],
  "fromDate": "SEARCH_FROM_DATE",
  "toDate": "DIGEST_DATE"
}
```

Dates in the query text are a hint. Dates in the tool arguments are the filter.

Build a pool of roughly 12–20 plausible leads per desk before deep reading (allocate across the desk's dimensions; a quiet dimension may contribute fewer). Search results are leads, not evidence. Send their ids, titles, snippets, source names, source types, and visible dates to the repository's Jev helper in one batch:

```sh
cat /tmp/<desk>-leads.json | bun scripts/jev-research.ts
```

The JSON request must use `mode: "triage"`, the desk's dimensions and digest date, and a `leads` array. The helper uses:

- a **Score** for direct research relevance,
- a **Noul** for potential to reveal causes, prior decisions, institutions, or consequences,
- a **Noul** for whether the lead is or points to a primary source.

Jev only prioritizes the queue. It does not establish facts and must not become a hard quality gate. Fetch every `keep` lead, manually inspect every `review` lead, and retain at least the top uncertain lead when its subject is materially different from the kept set. Drop only leads where the Jev signals and the researcher's own read both agree they are weak.

If Jev is unavailable, record the failure in the research log and continue with researcher judgment. The digest must degrade gracefully rather than fail closed.

### 2b — Fetch, read, and seed the knowledge tree

Treat a search result URL as a **lead**, not as a source URL. For every retained result, fetch the full article with `web_fetch` or `http_request`, following redirects, so you can read and extract from it. Record the URL you fetched as both `requestedUrl` and `url`, and set `sourceStatus` to whatever you honestly observed (`2xx`, `redirected-to-2xx`, `unverified`, or `failed`).

Final link validity is not your call to make: the pipeline resolves every source URL through its own deterministic redirect-follower before anything is stored, and that resolver — not your read of the fetch — decides what survives. Do not drop a candidate merely because a fetch looked uncertain; record it honestly. Skip only results that are clearly not readable articles or primary documents.

Extract the current event and create a knowledge-tree root. Every node must carry at least one fetched `sourceUrl`; Jev answers and search snippets can never be node evidence.

Required node types:

- `event` — the current action, decision, filing, release, vote, market move, or result
- `cause` — a sourced trigger or pressure that helps explain why it happened
- `decision` — an earlier law, vote, commitment, policy, filing, or strategy it continues or reverses
- `institution` — an institution whose authority, incentives, or constraints materially shape the story
- `response` — a sourced reaction from a counterparty, regulator, market, coalition, or affected group
- `consequence` — an observed immediate effect or a sourced expected consequence
- `related-event` — a distinct event needed to understand the chain
- `contradiction` — competing factual accounts that cannot yet be reconciled

Connect nodes with explicit edges: `caused`, `enabled`, `constrained`, `responded-to`, `resulted-in`, `related-to`, or `contradicts`.

### 2c — Iterative deepening loop

After the first read, evaluate the event and current knowledge tree with:

```sh
cat /tmp/<event>-depth.json | bun scripts/jev-research.ts
```

The request uses `mode: "depth"` and includes the dimension, current event, and full knowledge tree. Jev returns:

- an ordered **Score** from headline-only knowledge to a coherent sourced chain,
- independent **Nouls** for missing origin, prior decision, institutional response, consequences, and unresolved contradiction.

Use those values to choose the next targeted queries, not to invent the missing answer. Follow the highest-probability gap first and fetch the primary document or strongest independent source that can resolve it.

After every pass:

1. Add only genuinely new sourced nodes or edges.
2. Recompute `importanceScore` from the category rubric.
3. Run the depth evaluation again.
4. Continue only when `passes < maxDeepeningPasses` **and at least one** is true:
   - the pass added at least `minNewFactsPerPass` new sourced nodes,
   - `importanceScore` changed by at least `importanceDeltaToContinue`,
   - Jev still reports a material gap at `>= 0.65`,
   - the understanding Score remains below `3.25`.
5. Stop early when the tree converges: no material new nodes, importance is stable, and Jev reports no material gap. A low-confidence or unavailable Jev answer cannot force another pass by itself; use researcher judgment within the remaining budget.

The pass cap is a hard ceiling, not a target. Politics and finance normally use three passes because current events often sit inside policy, institutional, and market chains. Tech normally uses two unless its category workflow overrides the default.

### 2d — Return shape

Return this as the `result` field of Jazz's required JSON envelope. The coordinator uses the validated `result.candidates` data.

```json
{
  "candidates": [
    {
      "candidateTitle": "Working title",
      "coreClaimOneSentence": "The core fact in one sentence",
      "keyFacts": ["fact with who/what/where/outcome", "fact with evidence"],
      "sources": [
        {
          "name": "Publication or primary source",
          "requestedUrl": "Discovery or initially fetched URL",
          "url": "Verified final canonical permalink",
          "sourceStatus": "2xx | redirected-to-2xx | unverified | failed",
          "confidence": "high | medium | low"
        }
      ],
      "publishedAt": "YYYY-MM-DD",
      "importanceScore": 0.85,
      "subcategory": "the dimension / bucket this belongs to",
      "tags": ["..."],
      "needsDeepening": false,
      "knowledgeTree": {
        "nodes": [
          {
            "id": "event-current",
            "type": "event",
            "claim": "Sourced claim",
            "date": "YYYY-MM-DD",
            "sourceUrls": ["https://..."]
          }
        ],
        "edges": [
          { "from": "decision-prior", "to": "event-current", "relationship": "enabled" }
        ]
      },
      "researchDepth": {
        "passes": 2,
        "understandingScore": 3.5,
        "unresolvedBranches": []
      }
    }
  ]
}
```

Set `needsDeepening: false` before returning. This means the bounded loop finished or reached its cap; it does not claim omniscience. Keep unresolved but material branches in `researchDepth.unresolvedBranches` so the editor can hedge or omit unsupported consequences.

---

## Phase 3 — Merge and de-duplicate

Collect every subagent's candidate array. Run this pass in order:

1. Drop every candidate where `publishedAt` < `SELECT_FROM_DATE`, or where `publishedAt` is missing, empty, or not a real date read from a source. There is no exception for this — a candidate with no verified publication date is indistinguishable from a stale story wearing today's date, so it does not ship. Do not let the pipeline's own fallback (which stamps an undated article with `DIGEST_DATE`) do this check for you.
2. Drop candidates with `publishedAt` > `DIGEST_DATE`.
3. Normalize each source `url` (https scheme, strip leading `www.`, strip `utm_*`, `fbclid`, `gclid`, `ref`, trim trailing slash). Do not drop a source here for its `sourceStatus` — the pipeline's own link resolver, not this pass, is the final word on whether a URL is live.
4. Merge rows that share a normalized source URL or clearly describe the same event into one entry with a combined `sources` array, sorted by source quality and confidence.
5. Leave no two final candidates sharing a normalized source URL.

The model still judges "same event"; this pass is the deterministic backbone. Use the knowledge-tree nodes to avoid collapsing related-but-distinct steps in the same political or financial chain.

Then create an **approved-claims ledger** for every merged event before drafting. A claim is approved only when a fetched, successful source in that event's `sources` list directly supports it. Keep the source URL(s) beside each claim and separate:

- **verified facts** — events, figures, dates, quoted decisions, observed outcomes
- **contextual facts** — earlier events, institutional positions, and prior decisions only when fetched and directly relevant
- **interpretation** — a conditional inference based only on approved facts: who is now constrained or empowered, what the decision forces next

A source's speculation, a search snippet, or an unverified detail does not enter the ledger. The ledger is working data, not a final output field.

---

## Phase 4 — Select, score, and draft from the ledger

Apply the category's importance threshold: include every story at or above it. Re-verify:

- Each story has a non-empty `sources` array of verified permanent URLs (prefer primary sources).
- Each story has concrete numbers or verifiable outcomes.
- No two final entries describe the same underlying event.

Draft each kept event from its approved-claims ledger, not from the raw research transcript. The factual `summary` may use only approved verified or contextual facts. Category-specific analysis (`technicalSignificance` or `strategicInterpretation`) may connect those facts to the wider day's approved events; label causal or forward-looking reasoning as interpretation with words such as "may", "could", or "signals".

Subagents already fetched and validated URLs in 2b, so this phase does not re-fetch. If a source is `unverified` or `failed` and no working canonical source exists, drop the story.

---

## Phase 5 — Write the output file

Write the full JSON array to the category-specific path using the **resolved date**:

```text
output/<workflow-name>-<DIGEST_DATE>.json
```

Example: `output/tech-news-2026-08-29.json`. CI still accepts the legacy `output/tech-news-DIGEST_2026-08-29.json` name as a safety net; the correct name is the resolved date.

```json
{
  "title": "Concise, specific headline — no clickbait, no editorial spin",
  "summary": "Source-backed factual summary (3-5 sentences).",
  "source": "REQUIRED. Extract from sources[0].name. Must be a non-empty string.",
  "sources": [{ "name": "Publication name", "url": "https://..." }],
  "category": "tech | politics | finance",
  "publishedAt": "YYYY-MM-DD",
  "digestDate": "DIGEST_DATE",
  "importanceScore": 0.85,
  "readingTimeMinutes": 3
}
```

Write only a valid JSON array to the file.

`category` and `publishedAt` are mandatory on **every** final object, even when
the category-specific `WORKFLOW.md` example does not repeat them. Set
`category` to the workflow's exact value (`tech`, `politics`, or `finance`).
Set `publishedAt` only to the `YYYY-MM-DD` date read from that story's source;
never infer it from `DIGEST_DATE`, omit it, or use a prose date. Before writing,
run `jq -e 'all(.[]; (.category | IN("tech", "politics", "finance")) and (.publishedAt | test("^[0-9]{4}-[0-9]{2}-[0-9]{2}$")))' <output-file>`.

### Summary writing

The `summary` is the factual editorial payload. Adapt depth to story type (research paper, product launch, security incident, funding, policy, executive move, geopolitical decision):

- First sentence = the core fact (who did what, with what concrete result).
- Second sentence = the key number, consequence, or technical detail.
- Remaining sentences = source-backed context, affected parties, and anything uncertain resolved as fact or flagged unconfirmed.
- Skip opinion adjectives ("controversial", "surprising", "game-changing", "stunning").
- A claim that arrived with `confidence: low` stays hedged: "reportedly", "according to", or "unconfirmed".

The category-specific analysis is the strategic payload. It may be up to **two short paragraphs**: first the immediate strategic significance from approved facts; second, when useful, a clearly hedged inference about incentives, constraints, leverage, or second-order effects across the day's events. Omit the second paragraph when it would only restate the facts. Analysis does not carry unsupported factual claims.

---

## Phase 6 — Consolidate and serialize

After merging, scoring, and claim approval, call `spawn_subagent` with a focused **consolidation editor** task. Give it the selected events and their approved-claims ledgers. Its job is to synthesize the final factual summaries and category-specific strategic analysis, using the entire selected digest when that context is useful. It does not research or add factual claims.

Pass `resultName: "digest articles"` and a `resultSchema` whose root object has one required `articles` property: the exact category-specific article array schema. The schema must require `title`, `summary`, `sources`, `category`, and `publishedAt` on every article; constrain `category` to the current workflow's literal value and `publishedAt` to `^\\d{4}-\\d{2}-\\d{2}$`. The child returns `{ "articles": [...] }` as its validated structured result. The coordinator writes `structuredResult.articles` to the output file and verifies both `jq . <output-file> >/dev/null` and the required category/date check above. Recover the array from the structured result, not from the child's text summary.

This is the one allowed extra round-trip and it counts against the time budget. A fresh, bounded editor improves synthesis without reopening research.

---

## Quality checklist

If you edit the output file while working through this list, restart from the top. The workflow is complete only when every item passes without a further change.

- [ ] Phase 0 ran and `DIGEST_DATE` is confirmed
- [ ] `SEARCH_FROM_DATE` is two calendar days before `DIGEST_DATE`
- [ ] One subagent was spawned per coverage dimension, all in parallel, with a `resultSchema`
- [ ] Every subagent did its own discovery and fetch-and-read
- [ ] Every candidate used the category's bounded iterative deepening loop; the pass cap was treated as a ceiling, not a target
- [ ] Jev was used only for lead priority and semantic gap detection, never as evidence or a factual source
- [ ] Every knowledge-tree node cites at least one fetched source URL
- [ ] Politics and finance stories explain the relevant chain of causes, prior decisions, institutions, responses, and consequences, or explicitly record unresolved branches
- [ ] All candidates covering the same event were merged into one entry
- [ ] Every final entry's `publishedAt` was read from a source (byline, timestamp, or dated URL path), never guessed or left to default to `DIGEST_DATE`
- [ ] Every final entry has the exact workflow `category` and a `publishedAt` matching `YYYY-MM-DD`
- [ ] `SELECT_FROM_DATE <= publishedAt <= DIGEST_DATE` for every final entry
- [ ] No two final entries share a normalized source URL
- [ ] Every final `sources[].url` is the URL you actually fetched, normalized — canonicalization and final link validity are the pipeline's job, not this pass's
- [ ] Each story has concrete numbers or verifiable outcomes
- [ ] Summaries are factual, precise, and hype-free
- [ ] Every factual sentence came from the event's approved-claims ledger
- [ ] Strategic analysis is grounded, clearly hedged where interpretive, and no longer than two short paragraphs
- [ ] A consolidation editor received the approved-claims ledgers and returned the validated final article array
- [ ] Output file passes `jq . <output-file> >/dev/null` with exit code 0
- [ ] The output file was written to `output/<workflow-name>-<DIGEST_DATE>.json`
- [ ] The category-specific quality checklist from `WORKFLOW.md` is also satisfied
