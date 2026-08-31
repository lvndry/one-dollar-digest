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
2. **Fan out** — hand each dimension to one self-contained investigator that discovers the event, reads the sources, digs once for the surrounding story, and returns candidate JSON.
3. **Compose** — merge overlapping events, keep only what the date and score gates allow, and build an approved-claims ledger before anyone writes copy.
4. **Edit** — a fresh consolidation pass turns those ledgers into the final articles.

The coordinator is the editor-in-chief: it plans the assignments, waits for every desk, then merges and serializes. Each subagent is a full investigator for its beat — discovery through candidate payload — so the fan-out actually buys parallelism instead of a queue of half-finished notes.

Cost and time are hard-capped by the caller (Jazz `--timeout` + `--json` costUSD gate, and a GitHub job `timeout-minutes`). The strategy is to spend that budget once, in parallel, and return what the desks produced.

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
- The instruction: "Return candidate JSON only (array of objects). Investigate the dimension end to end: discovery, targeted queries, fetch-and-read, and ONE deepen pass aimed at the surrounding story (institutions, prior decisions, referenced primaries)."

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
          "needsDeepening"
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
          "needsDeepening": { "type": "boolean", "enum": [false] }
        }
      }
    }
  }
}
```

Discovery searches belong on the desks, so each dimension is researched against the live web rather than against the coordinator's first pass.

---

## Phase 2 — Run one researcher per dimension

Spawn **one subagent per dimension**, all in parallel. Each follows this sequence and returns a JSON array of candidates.

### 2a — Discover, then aim

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

### 2b — Fetch and read

Treat a search result URL as a **lead**, not as a source URL. For every promising result, fetch the full article with `web_fetch` or `http_request`, following redirects. Keep the final URL only when it returns a usable 2xx article page. Prefer the page's canonical URL when it is present, but fetch that canonical URL too before keeping it.

Do not keep search, feed, share, AMP, tracking, short-link, homepage, topic-list, or `/404` URLs. If the fetch redirects to a 404, a login wall, or a non-article page, find the publisher's stable permalink or a primary source; otherwise drop the candidate. Record the original fetched URL as `requestedUrl` and the verified permanent URL as `url`.

Then extract:

- The core claim or announcement (one sentence)
- Key facts with concrete evidence: numbers, names, dates, outcomes
- Who is affected and in what way — including the institutions that must now act, absorb, or decide
- The strategic decision this continues, reverses, or forces
- Prior context the announcement sits on, and any referenced primary sources not yet fetched
- Confidence: `high` | `medium` | `low`

### 2c — Deepen once, for understanding

Run **one** follow-up round when confidence is `low`, a primary source is cited but unfetched, or the surrounding story is still missing — which institution moved, which prior decision this sits on, who else is in the room. Fetch those sources. Update `keyFacts`, `sources`, and `confidence`. Then stop. If confidence is still `low`, hedge the summary or drop the candidate. The pass exists to gain understanding, not to collect more headlines.

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
      "needsDeepening": false
    }
  ]
}
```

Set `needsDeepening: false` before returning — the single deepen pass in 2c is the only one this workflow allows.

---

## Phase 3 — Merge and de-duplicate

Collect every subagent's candidate array. Run this pass in order:

1. Drop every candidate where `publishedAt` < `SELECT_FROM_DATE`.
2. Drop candidates with `publishedAt` > `DIGEST_DATE`, or with no verifiable `publishedAt` and no `sources` that returned 2xx.
3. Keep only sources whose `sourceStatus` is `2xx` or `redirected-to-2xx`; replace their `url` with the verified final canonical permalink, then normalize it (https scheme, strip leading `www.`, strip `utm_*`, `fbclid`, `gclid`, `ref`, trim trailing slash).
4. Merge rows that share a normalized source URL or clearly describe the same event into one entry with a combined `sources` array, sorted by source quality and confidence.
5. Leave no two final candidates sharing a normalized source URL.

The model still judges "same event"; this pass is the deterministic backbone.

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

Pass `resultName: "digest articles"` and a `resultSchema` whose root object has one required `articles` property: the exact category-specific article array schema. The child returns `{ "articles": [...] }` as its validated structured result. The coordinator writes `structuredResult.articles` to the output file and verifies with `jq . <output-file> >/dev/null` (must exit 0). Recover the array from the structured result, not from the child's text summary.

This is the one allowed extra round-trip and it counts against the time budget. A fresh, bounded editor improves synthesis without reopening research.

---

## Quality checklist

If you edit the output file while working through this list, restart from the top. The workflow is complete only when every item passes without a further change.

- [ ] Phase 0 ran and `DIGEST_DATE` is confirmed
- [ ] `SEARCH_FROM_DATE` is two calendar days before `DIGEST_DATE`
- [ ] One subagent was spawned per coverage dimension, all in parallel, with a `resultSchema`
- [ ] Every subagent did its own discovery and fetch-and-read
- [ ] Every candidate had at most one deepen pass, spent on the surrounding story rather than more headlines
- [ ] All candidates covering the same event were merged into one entry
- [ ] `SELECT_FROM_DATE <= publishedAt <= DIGEST_DATE` for every final entry
- [ ] No two final entries share a normalized source URL
- [ ] Every final `sources[].url` is a verified final canonical permalink, not a discovery or redirect URL
- [ ] Each story has concrete numbers or verifiable outcomes
- [ ] Summaries are factual, precise, and hype-free
- [ ] Every factual sentence came from the event's approved-claims ledger
- [ ] Strategic analysis is grounded, clearly hedged where interpretive, and no longer than two short paragraphs
- [ ] A consolidation editor received the approved-claims ledgers and returned the validated final article array
- [ ] Output file passes `jq . <output-file> >/dev/null` with exit code 0
- [ ] The output file was written to `output/<workflow-name>-<DIGEST_DATE>.json`
- [ ] The category-specific quality checklist from `WORKFLOW.md` is also satisfied
