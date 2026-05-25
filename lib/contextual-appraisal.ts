import type { AppraisalAnalysis } from "./pubmed-appraisal";
import type {
  InterventionMatch,
  OutcomeMatch,
  SourceAppraisal,
  SpeciesRelevance,
  StudyDesignDetected,
} from "./pubmed-appraisal";

export type PopulationType = "human" | "animal" | "mixed" | "unclear";
export type DomainContext =
  | "wellness"
  | "clinical"
  | "psychiatric"
  | "veterinary"
  | "unrelated"
  | "unclear";
export type ExposureRole =
  | "tested_intervention"
  | "biomarker"
  | "background_mention"
  | "unrelated"
  | "unclear";
export type OutcomeRole =
  | "primary_outcome"
  | "secondary_outcome"
  | "biomarker_mention"
  | "background_mention"
  | "unclear";
export type ContextualRelevance = "direct" | "partial" | "weak" | "irrelevant";
export type ContextGate = "pass" | "caution" | "fail";

export type ContextualAppraisalFields = {
  population_type: PopulationType;
  domain_context: DomainContext;
  exposure_role: ExposureRole;
  outcome_role: OutcomeRole;
  contextual_relevance: ContextualRelevance;
  context_gate: ContextGate;
};

const VETERINARY_TERMS =
  /\b(goat|goats|cow|cows|buffalo|buffaloes|bovine|veterinary|livestock|caprine|endometritis|porcine|sheep|lambs?)\b/i;

const PSYCHIATRIC_TERMS =
  /\b(adhd|attention-deficit|attention deficit|psychiatric|mental disorder|hyperactivity disorder)\b/i;

const PATHOLOGICAL_TERMS =
  /\b(alcohol abuse|pseudo-cushing|cushing syndrome|patholog|hypokalemia associated with)\b/i;

const WELLNESS_TERMS =
  /\b(spa|wellness|massage|relaxation|guests?|retreat|resort|healthy subjects|healthy adults)\b/i;

function mapPopulationType(species: SpeciesRelevance): PopulationType {
  switch (species) {
    case "human":
      return "human";
    case "animal":
      return "animal";
    case "mixed":
      return "mixed";
    default:
      return "unclear";
  }
}

function detectDomainContext(text: string, species: SpeciesRelevance): DomainContext {
  if (VETERINARY_TERMS.test(text) || (species === "animal" && !/\bhuman\b/i.test(text))) {
    return "veterinary";
  }
  if (PSYCHIATRIC_TERMS.test(text)) {
    return "psychiatric";
  }
  if (PATHOLOGICAL_TERMS.test(text) || /\bcase report\b/i.test(text)) {
    return "clinical";
  }
  if (WELLNESS_TERMS.test(text)) {
    return "wellness";
  }
  if (species === "human") {
    return "clinical";
  }
  return "unclear";
}

function detectExposureRole(
  intervention: InterventionMatch,
  text: string
): ExposureRole {
  if (intervention === "wrong_intervention") {
    return "unrelated";
  }
  if (intervention === "direct") {
    return "tested_intervention";
  }
  if (intervention === "partial") {
    return "tested_intervention";
  }
  if (intervention === "background") {
    return "background_mention";
  }
  if (/\bserum magnesium\b|\bplasma magnesium\b|\bmagnesium levels\b/i.test(text)) {
    return "biomarker";
  }
  return "unclear";
}

function detectOutcomeRole(
  outcome: OutcomeMatch,
  exposureRole: ExposureRole,
  text: string
): OutcomeRole {
  const cortisolMeasured =
    /\b(cortisol levels?|salivary cortisol|plasma cortisol|measured cortisol|cortisol concentration)\b/i.test(
      text
    );

  if (outcome === "direct") {
    if (exposureRole === "tested_intervention" && cortisolMeasured) {
      return "primary_outcome";
    }
    if (cortisolMeasured) {
      return "secondary_outcome";
    }
    return "biomarker_mention";
  }
  if (outcome === "partial") {
    return "secondary_outcome";
  }
  if (/\bcortisol\b/i.test(text)) {
    return "background_mention";
  }
  return "unclear";
}

function isStrongHumanEvidence(
  species: SpeciesRelevance,
  studyDesign: StudyDesignDetected,
  exposureRole: ExposureRole,
  outcomeRole: OutcomeRole
): boolean {
  const humanRelevant = species === "human" || species === "mixed";
  const strongDesign =
    studyDesign === "systematic_review" || studyDesign === "randomized_controlled_trial";
  const strongExposure = exposureRole === "tested_intervention";
  const strongOutcome =
    outcomeRole === "primary_outcome" || outcomeRole === "secondary_outcome";

  return humanRelevant && strongDesign && strongExposure && strongOutcome;
}

export function applyContextualAppraisal(
  title: string,
  abstractText: string | null,
  appraisal: SourceAppraisal,
  analysis: AppraisalAnalysis
): { appraisal: SourceAppraisal; analysis: AppraisalAnalysis } {
  const text = `${title} ${abstractText ?? ""}`;
  const population_type = mapPopulationType(appraisal.species_relevance);
  const domain_context = detectDomainContext(text, appraisal.species_relevance);
  const exposure_role = detectExposureRole(appraisal.intervention_match, text);
  const outcome_role = detectOutcomeRole(
    appraisal.outcome_match,
    exposure_role,
    text
  );

  const exclusion_flags = [...appraisal.exclusion_flags];
  const downgrade_reasons = [...appraisal.appraisal_debug.downgrade_reasons];
  let relevance_score = analysis.relevance_score;
  let context_gate: ContextGate = "pass";
  let contextual_relevance: ContextualRelevance = "partial";

  const isAnimalOrVeterinary =
    population_type === "animal" || domain_context === "veterinary";

  if (isAnimalOrVeterinary) {
    context_gate = "fail";
    contextual_relevance = "irrelevant";
    relevance_score = Math.min(relevance_score, 0.1);
    if (!exclusion_flags.includes("context_gate_fail")) {
      exclusion_flags.push("context_gate_fail");
    }
    downgrade_reasons.push("context gate fail: animal/veterinary population");
  } else if (
    population_type === "human" &&
    domain_context === "clinical" &&
    appraisal.study_design_detected === "case_report"
  ) {
    const directMatch =
      appraisal.intervention_match === "direct" && appraisal.outcome_match === "direct";
    context_gate = directMatch ? "caution" : "fail";
    contextual_relevance = directMatch ? "weak" : "irrelevant";
    relevance_score = Math.min(relevance_score, directMatch ? 0.2 : 0.15);
    if (!exclusion_flags.includes("pathological_context")) {
      exclusion_flags.push("pathological_context");
    }
    if (context_gate === "fail" && !exclusion_flags.includes("context_gate_fail")) {
      exclusion_flags.push("context_gate_fail");
    }
    downgrade_reasons.push("context gate: human pathological case report");
  } else if (domain_context === "psychiatric") {
    context_gate = "caution";
    contextual_relevance = "weak";
    relevance_score = Math.min(relevance_score, 0.35);
    if (exposure_role !== "tested_intervention") {
      if (!exclusion_flags.includes("outside_wellness_context")) {
        exclusion_flags.push("outside_wellness_context");
      }
    }
    downgrade_reasons.push("context gate caution: psychiatric/ADHD biomarker context");
  } else if (
    isStrongHumanEvidence(
      appraisal.species_relevance,
      appraisal.study_design_detected,
      exposure_role,
      outcome_role
    )
  ) {
    context_gate = "pass";
    contextual_relevance =
      outcome_role === "primary_outcome" && exposure_role === "tested_intervention"
        ? "direct"
        : "partial";
  } else if (domain_context === "wellness") {
    context_gate = "caution";
    contextual_relevance = "partial";
  } else {
    context_gate = "caution";
    contextual_relevance = "weak";
    relevance_score = Math.min(relevance_score, 0.45);
  }

  if (context_gate === "pass" && contextual_relevance === "direct") {
    // keep score from Phase 7
  } else if (context_gate === "caution" && domain_context !== "psychiatric") {
    relevance_score = Math.min(relevance_score, 0.45);
  }

  const updatedAppraisal: SourceAppraisal = {
    ...appraisal,
    exclusion_flags: [...new Set(exclusion_flags)],
    population_type,
    domain_context,
    exposure_role,
    outcome_role,
    contextual_relevance,
    context_gate,
    appraisal_debug: {
      ...appraisal.appraisal_debug,
      downgrade_reasons,
    },
  };

  return {
    appraisal: updatedAppraisal,
    analysis: {
      ...analysis,
      relevance_score: Math.max(0.08, relevance_score),
    },
  };
}

export function passesContextGateForMaterial(appraisal: SourceAppraisal): boolean {
  if (appraisal.context_gate === "fail") {
    return false;
  }
  if (appraisal.exclusion_flags.includes("context_gate_fail")) {
    return false;
  }
  return true;
}

export function isContextuallyMaterialSource(appraisal: SourceAppraisal): boolean {
  if (!passesContextGateForMaterial(appraisal)) {
    return false;
  }

  const strongDesign =
    appraisal.study_design_detected === "systematic_review" ||
    appraisal.study_design_detected === "randomized_controlled_trial";
  const humanRelevant =
    appraisal.population_type === "human" || appraisal.population_type === "mixed";
  const strongExposure = appraisal.exposure_role === "tested_intervention";
  const strongOutcome =
    appraisal.outcome_role === "primary_outcome" ||
    appraisal.outcome_role === "secondary_outcome";

  if (appraisal.context_gate === "pass") {
    return (
      strongDesign &&
      humanRelevant &&
      strongExposure &&
      strongOutcome &&
      (appraisal.contextual_relevance === "direct" ||
        appraisal.contextual_relevance === "partial")
    );
  }

  if (appraisal.context_gate === "caution") {
    return strongDesign && humanRelevant && strongExposure && strongOutcome;
  }

  return false;
}
