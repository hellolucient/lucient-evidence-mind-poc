export type SpeciesRelevance = "human" | "animal" | "mixed" | "unclear";

export type StudyDesignDetected =
  | "systematic_review"
  | "review"
  | "randomized_controlled_trial"
  | "observational"
  | "case_report"
  | "animal_study"
  | "background"
  | "unknown";

export type DirectnessToClaim = "direct" | "partial" | "indirect" | "irrelevant";

export type InterventionMatch =
  | "direct"
  | "partial"
  | "wrong_intervention"
  | "unclear";

export type OutcomeMatch = "direct" | "partial" | "missing" | "unclear";

export type ExclusionFlag =
  | "animal_only"
  | "wrong_intervention"
  | "case_report"
  | "no_cortisol_endpoint"
  | "not_magnesium_specific"
  | "not_human_wellness_context";

export type SourceAppraisal = {
  species_relevance: SpeciesRelevance;
  study_design_detected: StudyDesignDetected;
  directness_to_claim: DirectnessToClaim;
  intervention_match: InterventionMatch;
  outcome_match: OutcomeMatch;
  exclusion_flags: ExclusionFlag[];
  appraisal_summary: string;
};

export type AppraisalAnalysis = {
  relevance_score: number;
  alignment_confidence: number;
  claim_alignment: "insufficient" | "mixed" | "contradicts";
  supports_claim: "yes" | "no" | "mixed" | "unclear";
  effect_summary: string;
  outcomes: string[];
  study_design: StudyDesignDetected;
};

const ANIMAL_TERMS =
  /\b(goats?|rats?|mice|mouse|bovine|cows?|porcine|pigs?|canine|dogs?|feline|cats?|rabbits?|zebrafish|animal model|animal study|livestock|sheep|lambs?|murine|rodent)\b/i;

const HUMAN_TERMS =
  /\b(human|humans|patient|patients|adult|adults|women|men|participant|participants|clinical trial|volunteers|healthy subjects)\b/i;

const CORTISOL_QUERY_TERMS =
  /\b(cortisol|hydrocortisone|hpa axis|stress hormone|hormone regulation|glucocorticoid)\b/i;

const CORTISOL_TEXT_TERMS =
  /\b(cortisol|hydrocortisone|hpa axis|stress hormone|glucocorticoid|salivary cortisol|plasma cortisol|hypothalamic-pituitary-adrenal)\b/i;

const OTHER_NUTRIENT_TERMS =
  /\b(chromium|zinc|iron|calcium|selenium|copper|potassium)\b/i;

const WELLNESS_CONTEXT_TERMS =
  /\b(spa|wellness|massage|relaxation|guests?|retreat|resort)\b/i;

function combinedText(title: string, abstract: string | null): string {
  return `${title} ${abstract ?? ""}`;
}

function queryMentionsMagnesium(query: string): boolean {
  return /\bmagnesium\b/i.test(query);
}

function textMentionsMagnesium(text: string): boolean {
  if (!/\bmagnesium\b/i.test(text)) {
    return false;
  }

  if (/\b(no|without|lack of|not)\s+magnesium\b/i.test(text)) {
    return false;
  }

  return true;
}

function queryMentionsCortisol(query: string): boolean {
  return CORTISOL_QUERY_TERMS.test(query);
}

function textMentionsCortisol(text: string): boolean {
  return CORTISOL_TEXT_TERMS.test(text);
}

function detectSpeciesRelevance(text: string): SpeciesRelevance {
  const hasAnimal = ANIMAL_TERMS.test(text);
  const hasHuman = HUMAN_TERMS.test(text);

  if (hasAnimal && hasHuman) {
    return "mixed";
  }
  if (hasAnimal) {
    return "animal";
  }
  if (hasHuman) {
    return "human";
  }
  return "unclear";
}

function detectStudyDesign(text: string): StudyDesignDetected {
  if (/systematic review|meta-analysis/i.test(text)) {
    return "systematic_review";
  }
  if (/case report/i.test(text)) {
    return "case_report";
  }
  if (/\brandomized\b|\brct\b|randomised|controlled trial/i.test(text)) {
    return "randomized_controlled_trial";
  }
  if (/\breview\b/i.test(text)) {
    return "review";
  }
  if (/\bcohort\b|cross-sectional|observational|longitudinal study/i.test(text)) {
    return "observational";
  }
  if (ANIMAL_TERMS.test(text) && !HUMAN_TERMS.test(text)) {
    return "animal_study";
  }
  return "unknown";
}

function buildAppraisalSummary(
  flags: ExclusionFlag[],
  species: SpeciesRelevance,
  intervention: InterventionMatch,
  outcome: OutcomeMatch
): string {
  if (flags.includes("wrong_intervention")) {
    return "Automated appraisal flagged a likely intervention mismatch versus the query.";
  }
  if (flags.includes("animal_only")) {
    return "Automated appraisal flagged an animal-only study context with limited direct human claim relevance.";
  }
  if (flags.includes("case_report")) {
    return "Automated appraisal identified a case report, which is weak evidence for general claim support.";
  }
  if (flags.includes("no_cortisol_endpoint")) {
    return "Automated appraisal found no clear cortisol or stress-hormone endpoint in the record text.";
  }
  if (species === "human" && intervention === "direct" && outcome === "direct") {
    return "Record text appears plausibly related to the query intervention and outcome, but automated appraisal is not sufficient for substantiation.";
  }
  return "Basic automated appraisal applied; record relevance to the claim remains uncertain.";
}

export function appraisePubMedRecord(
  query: string,
  title: string,
  abstractText: string | null,
  baseRelevanceScore: number
): { appraisal: SourceAppraisal; analysis: AppraisalAnalysis } {
  const text = combinedText(title, abstractText);
  const exclusion_flags: ExclusionFlag[] = [];

  const species_relevance = detectSpeciesRelevance(text);
  let study_design_detected = detectStudyDesign(text);

  if (study_design_detected === "case_report") {
    exclusion_flags.push("case_report");
  }

  if (species_relevance === "animal") {
    exclusion_flags.push("animal_only");
    if (study_design_detected === "unknown") {
      study_design_detected = "animal_study";
    }
  }

  let intervention_match: InterventionMatch = "unclear";
  if (queryMentionsMagnesium(query)) {
    if (textMentionsMagnesium(text)) {
      intervention_match = "direct";
    } else if (OTHER_NUTRIENT_TERMS.test(text)) {
      intervention_match = "wrong_intervention";
      exclusion_flags.push("wrong_intervention");
      exclusion_flags.push("not_magnesium_specific");
    } else {
      intervention_match = "partial";
      exclusion_flags.push("not_magnesium_specific");
    }
  }

  let outcome_match: OutcomeMatch = "unclear";
  if (queryMentionsCortisol(query)) {
    if (textMentionsCortisol(text)) {
      outcome_match = "direct";
    } else {
      outcome_match = "missing";
      exclusion_flags.push("no_cortisol_endpoint");
    }
  }

  if (
    WELLNESS_CONTEXT_TERMS.test(query) &&
    !WELLNESS_CONTEXT_TERMS.test(text) &&
    species_relevance !== "human"
  ) {
    exclusion_flags.push("not_human_wellness_context");
  }

  let directness_to_claim: DirectnessToClaim = "indirect";
  if (
    intervention_match === "wrong_intervention" ||
    (species_relevance === "animal" && queryMentionsMagnesium(query))
  ) {
    directness_to_claim = "irrelevant";
  } else if (
    intervention_match === "direct" &&
    outcome_match === "direct" &&
    species_relevance === "human"
  ) {
    directness_to_claim = "partial";
  } else if (intervention_match === "partial" || outcome_match === "missing") {
    directness_to_claim = "partial";
  }

  let relevance_score = baseRelevanceScore;
  if (exclusion_flags.includes("animal_only")) relevance_score -= 0.25;
  if (exclusion_flags.includes("wrong_intervention")) relevance_score -= 0.3;
  if (exclusion_flags.includes("case_report")) relevance_score -= 0.15;
  if (exclusion_flags.includes("no_cortisol_endpoint")) relevance_score -= 0.2;
  if (exclusion_flags.includes("not_magnesium_specific")) relevance_score -= 0.1;

  if (
    textMentionsMagnesium(text) &&
    textMentionsCortisol(text) &&
    (species_relevance === "human" || species_relevance === "mixed")
  ) {
    relevance_score += 0.15;
  }

  relevance_score = Math.max(0.1, Math.min(0.85, relevance_score));

  let supports_claim: AppraisalAnalysis["supports_claim"] = "unclear";
  if (directness_to_claim === "irrelevant" || intervention_match === "wrong_intervention") {
    supports_claim = "no";
  }

  const claim_alignment: AppraisalAnalysis["claim_alignment"] = "insufficient";
  const alignment_confidence =
    directness_to_claim === "partial" && intervention_match === "direct" ? 0.35 : 0.22;

  const outcomes: string[] = [];
  if (textMentionsCortisol(text)) outcomes.push("cortisol/stress hormone");
  if (textMentionsMagnesium(text)) outcomes.push("magnesium");

  const appraisal: SourceAppraisal = {
    species_relevance,
    study_design_detected,
    directness_to_claim,
    intervention_match,
    outcome_match,
    exclusion_flags: [...new Set(exclusion_flags)],
    appraisal_summary: buildAppraisalSummary(
      exclusion_flags,
      species_relevance,
      intervention_match,
      outcome_match
    ),
  };

  return {
    appraisal,
    analysis: {
      relevance_score,
      alignment_confidence,
      claim_alignment,
      supports_claim,
      effect_summary:
        "Phase 6 basic automated appraisal applied; no effect-size extraction performed.",
      outcomes,
      study_design: study_design_detected,
    },
  };
}

export function isObviouslyIrrelevant(appraisal: SourceAppraisal): boolean {
  return (
    appraisal.directness_to_claim === "irrelevant" ||
    appraisal.exclusion_flags.includes("wrong_intervention") ||
    appraisal.exclusion_flags.includes("animal_only")
  );
}
