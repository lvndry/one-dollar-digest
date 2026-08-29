---
name: daily-digest-research
description: Shared operating policy for One Dollar Digest Jazz workflows. Use when running or authoring scheduled digest workflows that gather articles, validate sources, and write digest JSON.
tagline: Deep research policy for scheduled One Dollar Digest workflows.
triggers:
  - daily digest
  - digest workflow
  - DIGEST_DATE
  - SEARCH_FROM_DATE
  - SELECT_FROM_DATE
---

# Daily Digest Workflow — Deep Research (Bounded Divide & Conquer)

This skill is mandatory shared policy for every One Dollar Digest workflow. Category-specific `WORKFLOW.md` instructions extend this policy; they do not replace it.

## Design principle: real divide & conquer

The coordinator does **not** research. It plans, fans out to **one fully-independent subagent per coverage dimension**, then merges. Each subagent owns its dimension **end to end** — discovery, targeted queries, fetch-and-read, one bounded deepen pass, and a final **candidate JSON** payload. Subagents run in parallel. The coordinator's only jobs are: merge, de-duplicate, score-gate, and serialize.

This keeps a single category run well under 30 minutes: N small parallel subagents (each a few minutes) instead of one agent doing N dimensions serially with an unbounded loop.

## CI Operating Mode

You are running inside an automated CI pipeline. No user is present and no one will respond. Complete the workflow from start to finish without asking for confirmation or approval.

Cost & time are hard-capped by the caller (Jazz `--timeout` + `--json` costUSD gate, and a GitHub job `timeout-minutes`). Respect them: do not re-run dimensions to chase completeness. Return what you have.

---

## Phase 0 — Environment Setup

Run this command first:

```sh
echo ${TARGET_DATE:-$(date -u +%Y-%m-%d)}
```

Store the output as `DIGEST_DATE`. Compute two date bounds:

- `SEARCH_FROM_DATE` = two calendar days before `DIGEST_DATE` (`T-2`). Used as `fromDate` in all `web_search` calls — this wider window ensures discovery lags don't cause stories to be missed.
- `SELECT_FROM_DATE` = one calendar day before `DIGEST_DATE` (`T-1`). This is the hard lower bound for the final output.

**Hard date rule:** Any article whose `publishedAt` is before `SELECT_FROM_DATE` must be discarded from the final output — regardless of importance score, significance, or how few articles a dimension produced. There are no exceptions. The wider `SEARCH_FROM_DATE` window is for search only; it never relaxes the selection cutoff.

---

## Phase 1 — Plan the fan-out (coordinator, cheap)

List every coverage dimension defined by the category `WORKFLOW.md`. For each dimension write **one self-contained task** to hand to a subagent. The task must include:

- The dimension name and its editorial scope.
- `DIGEST_DATE`, `SEARCH_FROM_DATE`, `SELECT_FROM_DATE`.
- The category's importance threshold and any tag/region/bias rules that apply to this dimension.
- The exact output schema (shared fields + category-specific fields).
- The instruction: "Return candidate JSON only (array of objects). Do your own discovery, targeted queries, fetch-and-read, and ONE bounded deepen pass. Do not ask the coordinator for more work."

Do **not** run discovery searches in the coordinator. Discovery belongs to the subagents.

---

## Phase 2 — Parallel per-dimension subagents

Spawn **one subagent per dimension**, all in parallel. Each subagent follows this internal sequence and returns a JSON array of candidates:

### Step 2a — Discovery + targeted queries

Run 2–3 broad discovery searches for the dimension, then 3–5 targeted queries built from what surfaced. Every `web_search` call must pass date arguments as top-level tool arguments:

```json
{
  "query": "Describe the research goal and mention DIGEST_DATE",
  "searchQueries": ["concise keyword phrase"],
  "fromDate": "SEARCH_FROM_DATE",
  "toDate": "DIGEST_DATE"
}
```

Do not rely on putting dates only in query text.

### Step 2b — Fetch and read content

For every promising result, fetch the full article using `web_fetch` or `http_request`. **Do not rely on search result snippets.** Read the actual page. Extract:

- The core claim or announcement (one sentence)
- Key facts with concrete evidence: numbers, names, dates, outcomes
- Who is affected and in what way
- Any referenced primary sources not yet fetched
- Confidence level: `high` | `medium` | `low`

### Step 2c — ONE bounded deepen pass (hard cap)

For candidates where confidence is `low` or a primary source is referenced but not fetched, run **at most one follow-up round** of queries and fetch the referenced primary source. Update `keyFacts`, `sources`, `confidence`.

**Stop after one round.** Do not loop. If confidence is still `low` after the single pass, either hedge the summary (use "reportedly", "according to") or drop the candidate — never loop again.

### Step 2d — Return shape

Return only a JSON array of candidates, each:

```json
{
  "candidateTitle": "Working title",
  "coreClaimOneSentence": "The core fact in one sentence",
  "keyFacts": ["fact with who/what/where/outcome", "fact with evidence"],
  "sources": [
    {
      "name": "Publication or primary source",
      "url": "Fetched URL",
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
```

Set `needsDeepening: false` before returning — the single deepen pass in 2c is the only one allowed.

---

## Phase 3 — Merge & de-duplicate (coordinator)

Collect all subagent candidate arrays. Run this deterministic pass:

1. Discard every candidate where `publishedAt` < `SELECT_FROM_DATE` (date gate — run first).
2. Discard candidates with `publishedAt` > `DIGEST_DATE` or no verifiable `publishedAt` and no `sources` with a 2xx status.
3. Normalize every `sources[].url` (https scheme, remove leading `www.`, strip `utm_*`, `fbclid`, `gclid`, `ref`, trim trailing slash).
4. Merge any rows that share a normalized source URL or clearly describe the same event into one entry with a combined `sources` array sorted by source quality/confidence.
5. Ensure no two final candidates share a normalized source URL.

The LLM dedup responsibility is the model's job before output; this pass is the deterministic backbone.

---

## Phase 4 — Select, score, validate (coordinator, light)

Apply the category's importance threshold (include every story ≥ threshold; do not drop qualifying stories to hit a count). Re-verify:

- Each story has a non-empty `sources` array with canonical URLs (prefer primary sources).
- Each story has concrete numbers or verifiable outcomes.
- No two final entries describe the same underlying event.

Do **not** re-fetch URLs here — subagents already fetched and validated them in 2b. If a source URL is `unverified`/`failed` and no working canonical source can be found, drop the story.

---

## Phase 5 — Output

Write the full JSON array to the category-specific output file using the **resolved date**, not the template token:

```text
output/<workflow-name>-<DIGEST_DATE>.json
```

Example: `output/tech-news-2026-08-29.json`. (The CI step tolerates the legacy `output/tech-news-DIGEST_2026-08-29.json` name as a safety net, but the correct name is the resolved date.)

Final objects must include the shared fields:

```json
{
  "title": "Concise, specific headline — no clickbait, no editorial spin",
  "summary": "Source-backed factual summary.",
  "source": "Primary publication name",
  "sources": [{ "name": "...", "url": "Canonical article URL" }],
  "issueDate": "YYYY-MM-DD if known; omit if unavailable",
  "category": "tech | politics | finance",
  "publishedAt": "YYYY-MM-DD",
  "digestDate": "DIGEST_DATE",
  "readingTimeMinutes": 3,
  "importanceScore": 0.85
}
```

Only output valid JSON arrays in files.

### Summary writing rules

The `summary` field is the primary analytical payload. Adapt depth to story type (research paper, product launch, security incident, funding, policy, executive move, geopolitical decision). Shared rules:

- First sentence = the core fact (who did what, with what concrete result).
- Second sentence = the key number, consequence, or technical detail.
- Remaining sentences = source-backed context, affected parties, and anything uncertain resolved as fact or flagged unconfirmed.
- No opinion adjectives ("controversial", "surprising", "game-changing", "stunning").
- Do not assert as fact anything that reached the final article with `confidence: low` — use "reportedly", "according to", or "unconfirmed".

---

## Phase 6 — JSON Serialization (final step)

After all merging and scoring, call `spawn_subagent` with a focused JSON-serializer task: convert the final article list into a valid JSON array matching the exact schema; output ONLY the JSON array (no markdown fences, no prose); write it to the output file; verify with `jq . <output-file> >/dev/null` (must exit 0).

A fresh subagent with short context produces structurally correct JSON at high reliability. This is the one allowed extra round-trip and is counted in the time budget.

---

## Shared Quality Checklist

**Loop rule:** If you make any edit to the output file while working through this checklist, restart the checklist from the top. Only declare the workflow complete when you pass every item without further changes.

Before finishing, verify:

- [ ] Phase 0 ran and `DIGEST_DATE` is confirmed
- [ ] `SEARCH_FROM_DATE` is two calendar days before `DIGEST_DATE`
- [ ] One subagent was spawned per coverage dimension, all in parallel
- [ ] Every subagent did its own discovery + fetch-and-read (not snippets)
- [ ] Every candidate had **at most one** deepen pass (no repeat loop)
- [ ] All candidates covering the same event were merged into one entry
- [ ] `SELECT_FROM_DATE <= publishedAt <= DIGEST_DATE` for every final entry (no exceptions)
- [ ] No two final entries share a normalized source URL
- [ ] Every final `sources[].url` was fetched and validated by its subagent
- [ ] Each story has concrete numbers or verifiable outcomes
- [ ] Summaries are factual, precise, hype-free
- [ ] Output file passes `jq . <output-file> >/dev/null` with exit code 0
- [ ] The output file was written to `output/<workflow-name>-<DIGEST_DATE>.json`
- [ ] The category-specific quality checklist (from `WORKFLOW.md`) is also satisfied
