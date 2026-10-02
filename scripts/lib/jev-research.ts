import { noul, score, TypeSafeClient } from "@typesafe-ai/sdk";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type ResearchLead = {
  id: string;
  title: string;
  snippet: string;
  sourceName?: string;
  sourceType?: string;
  publishedAt?: string;
};

export type TriageAnswers = {
  relevanceScore: number;
  relevanceConfidence: number;
  contextPotential: number;
  primarySourceLead: number;
};

export type TriageRoute = "keep" | "review" | "drop";

export function routeTriage(answers: TriageAnswers): TriageRoute {
  if (
    answers.relevanceScore >= 2.5 ||
    answers.contextPotential >= 0.7 ||
    answers.primarySourceLead >= 0.75
  ) {
    return "keep";
  }

  if (
    answers.relevanceScore >= 1.5 ||
    answers.contextPotential >= 0.45 ||
    answers.primarySourceLead >= 0.45
  ) {
    return "review";
  }

  return "drop";
}

export function triagePriority(answers: TriageAnswers): number {
  const relevance = answers.relevanceScore / 4;
  return (
    0.55 * relevance + 0.25 * answers.contextPotential + 0.2 * answers.primarySourceLead
  );
}

export type DepthAnswers = {
  understandingScore: number;
  understandingConfidence: number;
  missingOrigin: number;
  missingPriorDecision: number;
  missingInstitutionalResponse: number;
  missingConsequences: number;
  unresolvedContradiction: number;
};

export function semanticDepthNeedsMoreResearch(answers: DepthAnswers): boolean {
  const largestGap = Math.max(
    answers.missingOrigin,
    answers.missingPriorDecision,
    answers.missingInstitutionalResponse,
    answers.missingConsequences,
    answers.unresolvedContradiction,
  );

  return answers.understandingScore < 3.25 || largestGap >= 0.65;
}

const RELEVANCE_LEVELS = [
  "Unrelated to this coverage dimension or outside the digest date window",
  "Adjacent background with little direct value for understanding a current event",
  "Directly relevant current event, but mostly repeats already-known headline facts",
  "Strong lead with concrete facts or useful context that advances understanding",
  "Essential lead or authoritative primary source for a major current event",
] as const;

const UNDERSTANDING_LEVELS = [
  "Only the headline event is known",
  "The event and immediate actors are known, but the chain that produced it is mostly missing",
  "The main causes, actors, and prior decisions are known, but consequences or competing accounts remain thin",
  "A sourced chain connects prior decisions, institutions, the current event, and immediate consequences",
  "The sourced chain is coherent, contradictions are represented, and likely next constraints can be explained without inventing facts",
] as const;

export async function triageLeads(input: {
  dimension: string;
  digestDate: string;
  leads: ResearchLead[];
}) {
  const client = new TypeSafeClient();
  const questions: Record<string, ReturnType<typeof noul> | ReturnType<typeof score>> =
    {};

  input.leads.forEach((lead, index) => {
    const candidate = { index, ...lead };
    questions[`relevance_${index}`] = score(
      {
        question:
          "How useful is this candidate for researching the requested digest dimension?",
        dimension: input.dimension,
        digestDate: input.digestDate,
        candidate,
      },
      RELEVANCE_LEVELS,
    );
    questions[`context_${index}`] = noul({
      question:
        "Is this candidate likely to reveal causes, prior decisions, institutional constraints, or consequences beyond the isolated headline?",
      dimension: input.dimension,
      candidate,
    });
    questions[`primary_${index}`] = noul({
      question:
        "Is this candidate itself a primary source, or does it point to a specific primary source worth fetching?",
      candidate,
    });
  });

  const response = await client.systemOne({
    model: "jev-latest",
    state: {
      dimension: input.dimension,
      digestDate: input.digestDate,
      candidates: input.leads,
    },
    questions,
  });

  return input.leads
    .map((lead, index) => {
      const relevance = response.answers[`relevance_${index}`];
      const context = response.answers[`context_${index}`];
      const primary = response.answers[`primary_${index}`];

      if (
        relevance.type !== "score" ||
        context.type !== "noul" ||
        primary.type !== "noul"
      ) {
        throw new Error(`Unexpected Jev answer type for lead ${lead.id}`);
      }

      const answers: TriageAnswers = {
        relevanceScore: relevance.score,
        relevanceConfidence: relevance.confidence,
        contextPotential: context.noul,
        primarySourceLead: primary.noul,
      };

      return {
        id: lead.id,
        route: routeTriage(answers),
        priority: triagePriority(answers),
        answers,
      };
    })
    .sort((a, b) => b.priority - a.priority);
}

export async function evaluateResearchDepth(input: {
  dimension: string;
  event: JsonValue;
  knowledgeTree: JsonValue;
}) {
  const client = new TypeSafeClient();
  const response = await client.systemOne({
    model: "jev-latest",
    state: input,
    questions: {
      understanding: score(
        "How complete is the sourced understanding of this event?",
        UNDERSTANDING_LEVELS,
      ),
      missing_origin: noul(
        "Is the causal trigger or origin of the current event still materially missing?",
      ),
      missing_prior_decision: noul(
        "Is a prior decision, commitment, law, vote, filing, or policy needed to explain how this event became possible?",
      ),
      missing_institutional_response: noul(
        "Is a material institution or counterparty response still missing from the research?",
      ),
      missing_consequences: noul(
        "Are the immediate or second-order consequences still too weakly supported to explain why the event matters?",
      ),
      unresolved_contradiction: noul(
        "Do the fetched sources contain a material contradiction or competing account that still needs resolution or explicit representation?",
      ),
    },
  });

  const understanding = response.answers.understanding;
  if (understanding.type !== "score") {
    throw new Error("Unexpected Jev answer type for understanding");
  }

  const readNoul = (key: Exclude<keyof typeof response.answers, "understanding">) => {
    const answer = response.answers[key];
    if (answer.type !== "noul") {
      throw new Error(`Unexpected Jev answer type for ${key}`);
    }
    return answer.noul;
  };

  const answers: DepthAnswers = {
    understandingScore: understanding.score,
    understandingConfidence: understanding.confidence,
    missingOrigin: readNoul("missing_origin"),
    missingPriorDecision: readNoul("missing_prior_decision"),
    missingInstitutionalResponse: readNoul("missing_institutional_response"),
    missingConsequences: readNoul("missing_consequences"),
    unresolvedContradiction: readNoul("unresolved_contradiction"),
  };

  return {
    continueRecommended: semanticDepthNeedsMoreResearch(answers),
    answers,
  };
}
