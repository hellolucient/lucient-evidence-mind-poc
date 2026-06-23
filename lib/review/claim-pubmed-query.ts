import type { PrivacySafeWellnessClaim } from "@/lib/watch/wellness-claims-store";

export type ClaimPubMedQuery = {
  query_text: string;
  debug: {
    included_terms: string[];
    excluded_terms: string[];
    claim_family: string | null;
  };
};

const CLAIM_FAMILY_TERMS: Record<string, { required: string[]; optional: string[] }> = {
  sleep_support: {
    required: ["sleep quality"],
    optional: ["insomnia", "randomized", "trial", "systematic review"],
  },
  stress_reduction: {
    required: ["stress", "anxiety"],
    optional: ["randomized", "trial", "systematic review"],
  },
  nervous_system_calm: {
    required: ["relaxation", "parasympathetic"],
    optional: ["heart rate variability", "randomized", "trial"],
  },
  stress_hormone_balance: {
    required: ["cortisol"],
    optional: ["stress", "randomized", "trial", "systematic review"],
  },
  cortisol: {
    required: ["cortisol"],
    optional: ["stress", "randomized", "trial", "systematic review"],
  },
  inflammation: {
    required: ["inflammation"],
    optional: ["CRP", "inflammatory markers", "randomized", "trial"],
  },
  immunity: {
    required: ["immune function"],
    optional: ["randomized", "trial", "systematic review"],
  },
  circulation: {
    required: ["blood flow", "circulation"],
    optional: ["randomized", "trial"],
  },
  recovery: {
    required: ["exercise recovery"],
    optional: ["muscle recovery", "randomized", "trial"],
  },
  pain_relief: {
    required: ["pain"],
    optional: ["randomized", "trial", "systematic review"],
  },
  skin_barrier: {
    required: ["skin barrier"],
    optional: ["transepidermal water loss", "randomized", "trial"],
  },
  collagen_support: {
    required: ["collagen"],
    optional: ["skin elasticity", "randomized", "trial", "systematic review"],
  },
};

const GENERIC_MARKETING_WORDS = [
  "ritual",
  "signature",
  "experience",
  "treatment",
  "spa",
  "menu",
  "luxury",
  "calm",
];

const KNOWN_EVIDENCE_SUBJECT_HINTS = ["magnesium", "collagen"] as const;

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function extractEvidenceSubjectTerms(claim: PrivacySafeWellnessClaim): {
  included: string[];
  excluded: string[];
} {
  const subject = claim.subject?.trim() ?? "";
  const subjectTokens = tokenize(subject);
  const included: string[] = [];
  const excluded: string[] = [];

  for (const hint of KNOWN_EVIDENCE_SUBJECT_HINTS) {
    if (subjectTokens.includes(hint)) {
      included.push(hint);
    }
  }

  // If the subject looks like a branded/treatment name, avoid using it directly in PubMed terms.
  const looksMarketingHeavy = subjectTokens.some((token) => GENERIC_MARKETING_WORDS.includes(token));
  if (looksMarketingHeavy && subject) {
    excluded.push(subject);
  } else if (subject && included.length === 0) {
    // If it's not marketing-heavy and we didn't find a known hint, include a softened subject token set.
    // Keep it conservative: only short tokens that are likely scientific nouns.
    const safeTokens = subjectTokens.filter((token) => token.length >= 4 && !GENERIC_MARKETING_WORDS.includes(token));
    if (safeTokens.length > 0) {
      included.push(safeTokens.slice(0, 2).join(" "));
    }
  }

  return { included, excluded };
}

export function buildPubMedQueryForClaim(claim: PrivacySafeWellnessClaim): ClaimPubMedQuery {
  const included_terms: string[] = [];
  const excluded_terms: string[] = [];

  const familyKey = claim.claim_family?.trim() ?? null;
  const familyTerms = familyKey ? CLAIM_FAMILY_TERMS[familyKey] : undefined;
  if (familyTerms) {
    included_terms.push(...familyTerms.required);
    included_terms.push(...familyTerms.optional.slice(0, 2));
  }

  const subjectTerms = extractEvidenceSubjectTerms(claim);
  included_terms.unshift(...subjectTerms.included);
  excluded_terms.push(...subjectTerms.excluded);

  // Always include the core claim concept words if they’re non-marketing.
  const predicate = claim.predicate?.trim() ?? "";
  const object = claim.object?.trim() ?? "";
  const conceptBits = [predicate, object]
    .join(" ")
    .trim();
  if (conceptBits) {
    const tokens = tokenize(conceptBits).filter((t) => !GENERIC_MARKETING_WORDS.includes(t));
    const compact = [...new Set(tokens)].slice(0, 4).join(" ");
    if (compact) {
      included_terms.push(compact);
    }
  }

  const query_text = [...new Set(included_terms)]
    .map((term) => term.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  return {
    query_text: query_text || claim.claim_text,
    debug: {
      included_terms: [...new Set(included_terms)].filter(Boolean),
      excluded_terms: [...new Set(excluded_terms)].filter(Boolean),
      claim_family: familyKey,
    },
  };
}

