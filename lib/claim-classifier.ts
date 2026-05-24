export type ClaimType =
  | "detox"
  | "immunity"
  | "inflammation"
  | "cortisol_hormone"
  | "anti_aging"
  | "pain_relief"
  | "sleep"
  | "stress_relaxation"
  | "experiential_wellness"
  | "general";

export type ClaimAnalysis = {
  claim_type: ClaimType;
  detected_terms: string[];
  is_measurable_health_claim: boolean;
  human_review_required: boolean;
};

type PatternDefinition = {
  claim_type: ClaimType;
  terms: string[];
  priority: number;
  is_measurable_health_claim: boolean;
  human_review_required: boolean;
};

const PATTERNS: PatternDefinition[] = [
  {
    claim_type: "detox",
    terms: [
      "detox",
      "detoxify",
      "detoxifies",
      "detoxification",
      "detoxifying",
    ],
    priority: 1,
    is_measurable_health_claim: true,
    human_review_required: true,
  },
  {
    claim_type: "anti_aging",
    terms: [
      "anti-aging",
      "anti aging",
      "reverse aging",
      "reverses aging",
      "reverses biological aging",
      "biological age",
      "reverse biological age",
    ],
    priority: 2,
    is_measurable_health_claim: true,
    human_review_required: true,
  },
  {
    claim_type: "cortisol_hormone",
    terms: [
      "cortisol",
      "hormone regulation",
      "regulates hormones",
      "hormone balance",
      "hormonal balance",
    ],
    priority: 3,
    is_measurable_health_claim: true,
    human_review_required: true,
  },
  {
    claim_type: "immunity",
    terms: [
      "immunity",
      "immune system",
      "immune",
      "boosts immunity",
      "boost immunity",
    ],
    priority: 4,
    is_measurable_health_claim: true,
    human_review_required: true,
  },
  {
    claim_type: "inflammation",
    terms: [
      "inflammation",
      "anti-inflammatory",
      "anti inflammatory",
      "inflammatory",
      "reduces inflammation",
    ],
    priority: 5,
    is_measurable_health_claim: true,
    human_review_required: true,
  },
  {
    claim_type: "pain_relief",
    terms: [
      "pain relief",
      "relieves pain",
      "reduce pain",
      "reduces pain",
      "alleviates pain",
      "pain management",
    ],
    priority: 6,
    is_measurable_health_claim: true,
    human_review_required: true,
  },
  {
    claim_type: "sleep",
    terms: [
      "sleep",
      "sleeping",
      "insomnia",
      "sleep quality",
      "better sleep",
    ],
    priority: 7,
    is_measurable_health_claim: true,
    human_review_required: true,
  },
  {
    claim_type: "stress_relaxation",
    terms: [
      "stress",
      "relaxation",
      "relax",
      "relaxing",
      "de-stress",
      "destress",
    ],
    priority: 8,
    is_measurable_health_claim: false,
    human_review_required: true,
  },
  {
    claim_type: "experiential_wellness",
    terms: [
      "restored",
      "feel restored",
      "wellbeing",
      "well-being",
      "feel refreshed",
      "rejuvenated",
      "revitalized",
      "supports wellness",
      "general wellness",
      "feel better",
    ],
    priority: 9,
    is_measurable_health_claim: false,
    human_review_required: false,
  },
];

function findMatchingTerms(normalizedQuery: string, terms: string[]): string[] {
  return terms.filter((term) => normalizedQuery.includes(term.toLowerCase()));
}

export function classifyClaim(query: string): ClaimAnalysis {
  const normalizedQuery = query.toLowerCase();

  const matches = PATTERNS.map((pattern) => ({
    pattern,
    detected_terms: findMatchingTerms(normalizedQuery, pattern.terms),
  })).filter((match) => match.detected_terms.length > 0);

  if (matches.length === 0) {
    return {
      claim_type: "general",
      detected_terms: [],
      is_measurable_health_claim: false,
      human_review_required: true,
    };
  }

  const primary = matches.sort(
    (a, b) => a.pattern.priority - b.pattern.priority
  )[0].pattern;

  const detected_terms = [
    ...new Set(matches.flatMap((match) => match.detected_terms)),
  ];

  return {
    claim_type: primary.claim_type,
    detected_terms,
    is_measurable_health_claim: primary.is_measurable_health_claim,
    human_review_required: primary.human_review_required,
  };
}
