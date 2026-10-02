import { describe, expect, test } from "bun:test";

import {
  routeTriage,
  semanticDepthNeedsMoreResearch,
  triagePriority,
} from "./jev-research";

describe("routeTriage", () => {
  test("keeps a highly relevant lead", () => {
    expect(
      routeTriage({
        relevanceScore: 3.1,
        relevanceConfidence: 0.8,
        contextPotential: 0.3,
        primarySourceLead: 0.2,
      }),
    ).toBe("keep");
  });

  test("keeps an authoritative lead even when the snippet is vague", () => {
    expect(
      routeTriage({
        relevanceScore: 1.2,
        relevanceConfidence: 0.4,
        contextPotential: 0.2,
        primarySourceLead: 0.91,
      }),
    ).toBe("keep");
  });

  test("routes ambiguous leads to review instead of silently dropping them", () => {
    expect(
      routeTriage({
        relevanceScore: 1.8,
        relevanceConfidence: 0.3,
        contextPotential: 0.4,
        primarySourceLead: 0.2,
      }),
    ).toBe("review");
  });

  test("drops a consistently weak lead", () => {
    expect(
      routeTriage({
        relevanceScore: 0.4,
        relevanceConfidence: 0.9,
        contextPotential: 0.1,
        primarySourceLead: 0.08,
      }),
    ).toBe("drop");
  });
});

describe("triagePriority", () => {
  test("prioritizes direct relevance over secondary signals", () => {
    const relevant = triagePriority({
      relevanceScore: 4,
      relevanceConfidence: 0.9,
      contextPotential: 0,
      primarySourceLead: 0,
    });
    const indirect = triagePriority({
      relevanceScore: 0,
      relevanceConfidence: 0.9,
      contextPotential: 1,
      primarySourceLead: 1,
    });

    expect(relevant).toBeGreaterThan(indirect);
  });
});

describe("semanticDepthNeedsMoreResearch", () => {
  test("continues when a material causal branch is missing", () => {
    expect(
      semanticDepthNeedsMoreResearch({
        understandingScore: 3.7,
        understandingConfidence: 0.8,
        missingOrigin: 0.8,
        missingPriorDecision: 0.1,
        missingInstitutionalResponse: 0.1,
        missingConsequences: 0.2,
        unresolvedContradiction: 0.1,
      }),
    ).toBe(true);
  });

  test("stops when the sourced chain is complete and gaps are low", () => {
    expect(
      semanticDepthNeedsMoreResearch({
        understandingScore: 3.8,
        understandingConfidence: 0.85,
        missingOrigin: 0.1,
        missingPriorDecision: 0.2,
        missingInstitutionalResponse: 0.15,
        missingConsequences: 0.2,
        unresolvedContradiction: 0.1,
      }),
    ).toBe(false);
  });
});
