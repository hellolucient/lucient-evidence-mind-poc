export type ClaimType =
  | "detox"
  | "immunity"
  | "inflammation"
  | "cortisol_hormone"
  | "anti_aging"
  | "pain_relief"
  | "sleep"
  | "experiential_wellness"
  | "stress_relaxation"
  | "general";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export type ClaimClassification = {
  claim_type: ClaimType;
  detected_terms: string[];
  is_measurable_health_claim: boolean;
};

export type ClaimAnalysis = ClaimClassification & {
  human_review_required: boolean;
};

type PatternDefinition = {
  claim_type: ClaimType;
  terms: string[];
  priority: number;
  is_measurable_health_claim: boolean;
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
  },
  {
    claim_type: "experiential_wellness",
    terms: [
      "supports relaxation",
      "helps guests feel restored",
      "promotes a sense of calm",
      "leaves guests feeling refreshed",
      "feel restored",
      "feel refreshed",
      "sense of calm",
      "restored",
      "wellbeing",
      "well-being",
      "rejuvenated",
      "revitalized",
      "supports wellness",
      "general wellness",
      "feel better",
      "relaxation",
      "relaxing",
    ],
    priority: 8,
    is_measurable_health_claim: false,
  },
  {
    claim_type: "stress_relaxation",
    terms: ["stress", "de-stress", "destress", "reduces stress"],
    priority: 9,
    is_measurable_health_claim: false,
  },
];

export function humanReviewRequired(riskLevel: RiskLevel): boolean {
  return riskLevel === "medium" || riskLevel === "high" || riskLevel === "critical";
}

function findMatchingTerms(normalizedQuery: string, terms: string[]): string[] {
  return terms.filter((term) => normalizedQuery.includes(term.toLowerCase()));
}

export function classifyClaim(query: string): ClaimClassification {
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
  };
}
