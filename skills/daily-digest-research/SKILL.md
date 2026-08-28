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

# Daily Digest Workflow — Deep Research

This skill is mandatory shared policy for every One Dollar Digest workflow. Category-specific `WORKFLOW.md` instructions extend this policy; they do not replace it.

## CI Operating Mode

You are running inside an automated CI pipeline. No user is present and no one will respond. Complete the workflow from start to finish without asking for confirmation or approval.

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

## Phase 1 — Research Planning

Before running any search, write a research plan.

The plan must contain:

### 1a — Coverage map

List every dimension that must be covered for the topic to be considered complete. Category-specific workflows define these dimensions; this policy requires that they are written down explicitly before any work begins. A dimension is a distinct angle, region, subcategory, or theme — not a query. Each dimension gets its own query bundle in Phase 2.

### 1b — Landscape Discovery

Before writing targeted queries, run a broad discovery sweep to understand what is actually in the news today. Run all dimensions **in parallel** — one or two broad searches per dimension using queries like "top [dimension] news today `DIGEST_DATE`" or "latest [dimension] developments `DIGEST_DATE`". Do not go deep; the goal is a topic map, not research.

For each dimension, extract:

- 3–5 headline events or stories that appear significant
- Key actors, institutions, or entities mentioned
- Any story that surfaces in two or more dimensions — mark it as a **cross-dimension signal**

If a dimension returns fewer than three distinct stories, flag it as **sparse** — Step 1c must add one broader fallback query for that dimension.

Output: an internal topic map listing discovered topics per dimension and any cross-dimension signals. Use this in Step 1c to write targeted queries.

### 1c — Targeted query set

Using the topic map from Step 1b, write at least 5 targeted search queries per dimension. Each query must:

- Name a specific actor, product, event, region, or technical term discovered in Step 1b
- Mention `DIGEST_DATE`, "today", or a concrete recent event
- Not be reused from a previous run without adapting it to the current news cycle

Additional rules:

- **Cross-dimension signals** get at least one query per involved dimension, framed through each dimension's lens
- **Sparse dimensions** get one broader fallback query (e.g. "political developments [region] this week") in addition to the targeted ones
- Write at least one "surprise" query per dimension — something that would catch a story the discovery sweep may have missed

### 1d — Depth signals

Define the conditions that trigger going deeper on a story. At minimum:

- Importance score ≥ 0.8
- A key fact is contested, vague, or sourced only from a secondary outlet
- The article references a document (paper, filing, ruling, press release) that has not yet been fetched
- The primary "source" is an aggregator, newsletter recap, or tweet rather than the originating publication

All `web_search` calls must pass date arguments as top-level tool arguments:

```json
{
  "query": "Describe the research goal and mention DIGEST_DATE",
  "searchQueries": ["concise keyword phrase"],
  "fromDate": "SEARCH_FROM_DATE",
  "toDate": "DIGEST_DATE"
  // add other params exposed by the tool as needed (e.g. sourceType, searchDepth)
}
```

Do not rely on putting dates only in query text.

---

## Phase 2 — Parallel Discovery

> **Budget allocation:** Phases 1–2 should consume at most 40% of your total iteration budget. If you are at 40% and discovery is incomplete, return what you have — consolidation and output are more important than exhaustive discovery.

Spawn one subagent per coverage dimension. Each subagent owns its assigned dimension and must not search outside it. Pass `DIGEST_DATE`, `SEARCH_FROM_DATE`, and the assigned query bundle explicitly to every subagent.

Each subagent follows this internal sequence:

### Step 2a — Search

Run the assigned queries. Collect all results within the date window. Note empty results but do not stop, adapt the queries and try again with different phrasing before giving up on a dimension.

### Step 2b — Fetch and read content

For every promising result, fetch the full article using `web_fetch` or `http_request`. **Do not rely on search result snippets.** Read the actual page. Extract:

- The core claim or announcement (one sentence)
- Key facts with concrete evidence: numbers, names, dates, outcomes
- Who is affected and in what way
- Any referenced primary sources not yet fetched (papers, filings, official statements, company blogs)
- Confidence level: `high` (primary source, wire service, official statement) | `medium` (reputable outlet, corroborated by a second source) | `low` (single secondary outlet, unverified claim)

### Step 2c — Generate follow-up queries

After reading each article, if confidence is `low` or a primary source is referenced but not yet fetched, generate targeted follow-up queries. Examples:

- `site:arxiv.org <paper title>` to reach the actual paper
- `site:sec.gov <company name> filing` to reach the regulatory document
- `"<exact quote or product name>" announcement` to find the canonical press release
- `<competitor or analyst name> response to <event>` to find corroboration or contradiction

Return these queries in the candidate payload. **Do not run them inside Phase 2** — context deepening happens in Phase 3.

### Step 2d — Return shape

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
          "url": "Fetched URL",
          "sourceStatus": "2xx | redirected-to-2xx | unverified | failed",
          "confidence": "high | medium | low"
        }
      ],
      "publishedAt": "YYYY-MM-DD",
      "needsDeepening": true,
      "deepeningReason": "Why this story needs more context",
      "followUpQueries": ["targeted follow-up query 1", "targeted follow-up query 2"]
    }
  ]
}
```

Set `needsDeepening: true` when any depth signal from Phase 1 applies to this candidate.

> **Checkpoint:** After all Phase 2 subagents return, write:
> `write_file("output/.checkpoint-{workflow-name}-{DIGEST_DATE}-phase2.json", JSON.stringify({ phase: 2, candidateCount: N, timestamp: new Date().toISOString() }))`

---

## Phase 3 — Context Deepening

After all discovery subagents return, collect the full candidate list. For each candidate where `needsDeepening: true`:

1. Run the `followUpQueries` using the same `fromDate`/`toDate` search shape
2. Fetch any referenced primary sources found
3. Update `keyFacts`, `sources`, and `confidence` with what was found
4. Set `needsDeepening: false` once confidence reaches `high` or `medium` with at least two independent sources, or once follow-up searches return no new information

**Repeat** until no candidates remain with `needsDeepening: true` and unrun queries, or until searches stop producing new information.

**Adaptive depth rules:**

| Importance | Depth behavior                                                  |
| ---------- | --------------------------------------------------------------- |
| ≥ 0.8      | Run all follow-up rounds until high confidence or no new signal |
| 0.5 – 0.8  | One follow-up round is sufficient                               |
| < 0.5      | Skip deepening entirely                                         |

When the candidate list is large, spawn deepening subagents in parallel — assign batches of candidates to separate subagents to stay within the iteration budget.

> **Checkpoint:** After all deepening is complete and before Phase 4, write:
> `write_file("output/.checkpoint-{workflow-name}-{DIGEST_DATE}-phase3.json", JSON.stringify({ phase: 3, finalCandidateCount: N, timestamp: new Date().toISOString() }))`

---

## Phase 4 — Candidate Consolidation

**Date gate (run first):** Before any merging or scoring, discard every candidate where `publishedAt` < `SELECT_FROM_DATE`. Do not attempt to keep them, adjust their score, or move them to a separate list. Delete them. A story from outside the `T-1` window is a search false positive — not a digest article.

**LLM dedup responsibility:** deduplication is the model's job before output.
Run this deterministic pass before scoring:

1. Normalize every `sources[].url` candidate using canonical URL rules (https scheme, remove leading `www.`, strip tracking params like `utm_*`, `fbclid`, `gclid`, `ref`, and trim trailing slash).
2. Build an event key using:
   - overlap in normalized source URLs, plus
   - same core event claim (who did what, with what concrete outcome) and near-identical publish window.
3. Merge any rows that match by source overlap or clearly represent the same event.
4. After merging, ensure each event appears once with one combined `sources` array sorted by source quality/confidence.
5. Ensure no two final candidates share the same normalized source URL.

Merge all candidates that describe the same event into one entry. Combine their `sources` arrays. Never keep two JSON objects for the same underlying event.

For each consolidated candidate, verify before moving to scoring:

- What exactly happened, who did it, and what was the concrete outcome?
- What is the highest-confidence source in the `sources` array?
- Is anything still uncertain that the final summary must not assert as fact?

If no source-backed answer is available after two attempts, skip the candidate. Never fabricate.

---

## Phase 5 — Select & Score

Apply the importance score defined by the category-specific workflow. Include every story that reaches the category's minimum threshold. Do not drop qualifying stories to hit a target count — the search engine already limits discovery.

---

## Phase 6 — Source Validation

Before writing final JSON, validate every `sources[].url`:

- Fetch redirects, aggregators, shortened URLs, and any link you are uncertain about
- Follow redirects to the final canonical URL
- Confirm the page returns a `2xx` response
- Confirm the page title and body match the story, publication, and date
- Replace invalid links with a working canonical source; if none can be verified, skip the story

Never output an unverified, failed, soft-404, homepage, search-result, or unrelated URL.

---

## Phase 7 — Output

Write the full JSON array to the category-specific output file:

```text
output/<workflow-name>-DIGEST_DATE.json
```

Final objects must include these shared fields:

```json
{
  "title": "Concise, specific headline — no clickbait, no editorial spin",
  "summary": "Source-backed factual summary. See summary writing rules below.",
  "source": "Primary publication name",
  "sources": [
    {
      "name": "Publication or primary source name",
      "url": "Canonical article URL"
    }
  ],
  "issueDate": "YYYY-MM-DD if known; omit if unavailable",
  "category": "tech | politics | category-specific value",
  "publishedAt": "YYYY-MM-DD",
  "digestDate": "DIGEST_DATE",
  "readingTimeMinutes": 3,
  "importanceScore": 0.85
}
```

Only output valid JSON arrays in files.

### Summary writing rules

The `summary` field is the primary analytical payload. Adapt its depth and focus to the story type:

| Story type                      | What the summary must answer                                            |
| ------------------------------- | ----------------------------------------------------------------------- |
| Research / academic paper       | What was found, how it was measured, and what it changes or enables     |
| Product launch / feature        | What shipped, for whom, and what concrete capability it adds or removes |
| Security vulnerability / breach | What was exposed, how, affected scope, and remediation status           |
| Funding / acquisition           | Who, how much, at what valuation, and what the capital is for           |
| Policy / regulation             | What rule was proposed or enacted, who it applies to, and when          |
| Executive / personnel           | Who moved where and what strategic shift the move signals               |
| Geopolitical / diplomatic       | What decision was made, by whom, and what the immediate consequence is  |

Shared rules across all types:

- First sentence = the core fact (who did what, with what concrete result)
- Second sentence = the key number, consequence, or technical detail that makes the story worth reading
- Remaining sentences = source-backed context, affected parties, and anything that was uncertain or contested during research — resolved as a fact, or flagged as unconfirmed
- No adjectives that express opinion ("controversial", "surprising", "game-changing", "stunning")
- Do not assert as fact anything that reached the final article with `confidence: low` — use "reportedly", "according to", or "unconfirmed"

---

## Phase 8 — JSON Serialization (Mandatory Final Step)

**Do not skip this phase. It runs after Phase 7 regardless of how the output was assembled.**

After all research and scoring is complete and you have a final list of articles in any intermediate format:

1. Call `spawn_subagent` and pass the following task:

   > "You are a JSON serializer. Your only job is to convert the article data below into a valid JSON array matching the exact schema. Do not research. Do not add information. Do not change any values. Output ONLY the JSON array — no markdown fences, no explanations, no prose.
   >
   > Required fields per article: `title` (string), `summary` (string), `source` (string), `sources` (non-empty array of {name, url}), `category` ("tech", "politics", or "finance"), `publishedAt` (YYYY-MM-DD).
   > Optional: `bias` (one of: far-left, left, center, right, far-right), `subcategory`, `importanceScore` (0.0–1.0), `tags` (array), `regions` (array), `primaryRegion`, `strategicInterpretation`, `technicalSignificance`.
   >
   > Article data: [paste all articles in any readable format]"

2. The formatting subagent writes the JSON to the output file.

3. Verify the output with: `jq . <output-file> >/dev/null` — must exit 0.

**Why a separate subagent:** The research phases accumulate a long context that creates formatting pressure. A fresh subagent with a short, focused context produces structurally correct JSON at near-100% reliability.

---

## Shared Quality Checklist

**Loop rule:** If you make any edit to the output file while working through this checklist, restart the checklist from the top immediately. Only declare the workflow complete when you can pass through every item below without making any changes to the file.

Before finishing, verify:

- [ ] Phase 0 ran and `DIGEST_DATE` is confirmed
- [ ] `SEARCH_FROM_DATE` is two calendar days before `DIGEST_DATE`
- [ ] A written coverage map was produced before any search (Phase 1a)
- [ ] Landscape discovery ran in parallel across all dimensions (Phase 1b)
- [ ] Cross-dimension signals identified and queried from each involved dimension's lens
- [ ] Sparse dimensions flagged and given broader fallback queries
- [ ] Every coverage dimension had at least five targeted queries, including a "surprise" query (Phase 1c)
- [ ] Every `web_search` call used `fromDate: SEARCH_FROM_DATE` and `toDate: DIGEST_DATE`
- [ ] Each discovery subagent fetched and read full article content — not just search snippets
- [ ] Every candidate with `needsDeepening: true` was processed in Phase 3
- [ ] No candidate with `confidence: low` reached the final output without a hedged summary
- [ ] All candidates covering the same event were merged into one entry with a combined `sources` array
- [ ] Mandatory LLM dedup pass ran on normalized `sources[].url` values before final scoring/output
- [ ] No two final entries share any normalized source URL
- [ ] Any story with a known `issueDate` has `issueDate === DIGEST_DATE`
- [ ] Every final `sources[].url` was fetched and validated
- [ ] `publishedAt` reflects the source article date
- [ ] Every story has `SELECT_FROM_DATE <= publishedAt <= DIGEST_DATE` (24–48 hour selection window) — no exceptions for importance score
- [ ] Summary depth matches the story type per the table above
- [ ] JSON is valid and complete
- [ ] Output file passes `jq . <output-file> >/dev/null` with exit code 0 (valid JSON syntax confirmed before declaring done)
- [ ] The output file was written to the category-specific path
- [ ] The category-specific quality checklist (from the loaded `WORKFLOW.md`) is also satisfied
