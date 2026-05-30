import type { EvidenceSource } from "@/lib/evidence-stubs";
import type { EvidenceDeltaDirection } from "@/lib/evidence-monitoring";
import { getClaimFamilySearchProfile } from "./claim-family-search-profiles";

export type EvidenceSignalCategory =
  | "strengthens_claim"
  | "weakens_claim"
  | "contradicts_claim"
  | "no_material_change"
  | "irrelevant_noise"
  | "monitor_only"
  | "human_review_required"
  | "client_claim_re_review_required";

export type EvidenceSignalSeverity = "low" | "medium" | "high";

export type EvidenceRelevanceGate = "pass" | "caution" | "fail";

export type EvidenceSignalClassification = {
  signal: EvidenceSignalCategory;
  confidence: number;
  severity: EvidenceSignalSeverity;
  reason_codes: string[];
  explanation: string;
  human_review_required: boolean;
  client_claim_re_review_required: boolean;
  contributes_to_evidence_delta: boolean;
  relevance_gate: EvidenceRelevanceGate;
  evidence_direction: EvidenceDeltaDirection;
  external_id?: string;
  title?: string | null;
};

export type TopicSignalClassificationSummary = {
  signal_classification: EvidenceSignalClassification;
  signal: EvidenceSignalCategory;
  evidence_direction: EvidenceDeltaDirection;
  reason_codes: string[];
  human_review_required: boolean;
  client_claim_re_review_required: boolean;
  confidence: number;
  explanation: string;
};

export type ClassifyEvidenceCandidateInput = {
  claim_family_id: string;
  external_id?: string;
  title?: string | null;
  abstract?: string | null;
  publication_type?: string | null;
  journal?: string | null;
  source?: EvidenceSource | null;
};

const VETERINARY_PATTERN =
  /\b(goat|goats|cow|cows|buffalo|bovine|veterinary|livestock|caprine|porcine|sheep|lambs?)\b/i;
const ANIMAL_ONLY_PATTERN =
  /\b(rats?|mice|mouse|murine|rodent|animal model|animal study|in vivo animal)\b/i;
const SWEAT_BIOMARKER_PATTERN =
  /\b(sweat|perspiration|eccrine|sweating)\b/i;
const MAGNESIUM_INTERVENTION_PATTERN =
  /\b(magnesium supplementation|magnesium supplement|supplementation with magnesium|oral magnesium|magnesium treatment|magnesium therapy|administered magnesium|received magnesium)\b/i;
const MAGNESIUM_MENTION_PATTERN = /\bmagnesium\b/i;
const CORTISOL_OUTCOME_PATTERN =
  /\b(cortisol|hydrocortisone|hpa axis|hypothalamic-pituitary-adrenal|stress hormone|glucocorticoid|salivary cortisol|plasma cortisol)\b/i;
const STRESS_OUTCOME_PATTERN =
  /\b(stress physiology|psychological stress|physiological stress|stress response)\b/i;
const POSITIVE_EFFECT_PATTERN =
  /\b(reduced|lowered|decreased|attenuated|improved|beneficial|favorable|significant reduction|lower cortisol|stress reduction)\b/i;
const NULL_EFFECT_PATTERN =
  /\b(no significant (difference|effect|change)|did not reduce|failed to (reduce|lower)|no effect on|null finding|not significant|unchanged cortisol|similar cortisol)\b/i;
const CONTRADICT_EFFECT_PATTERN =
  /\b(increased cortisol|elevated cortisol|worsened|adverse effect|opposite effect|contradict|higher cortisol|impaired|aggravated)\b/i;
const NARRATIVE_REVIEW_PATTERN = /\b(narrative review|this review discusses|overview of)\b/i;
const HUMAN_STUDY_PATTERN =
  /\b(humans?|participants?|patients?|volunteers|randomized|placebo-controlled|double-blind|clinical trial|systematic review|meta-analysis)\b/i;
const RCT_PATTERN =
  /\b(randomized|randomised|placebo-controlled|double-blind|clinical trial)\b/i;
const SYSTEMATIC_REVIEW_PATTERN = /\b(systematic review|meta-analysis)\b/i;

function combinedText(input: ClassifyEvidenceCandidateInput): string {
  return `${input.title ?? ""} ${input.abstract ?? ""}`.trim();
}

function sortReasonCodes(codes: string[]): string[] {
  return [...new Set(codes)].sort();
}

function roundConfidence(value: number): number {
  return Math.round(Math.min(Math.max(value, 0.1), 0.95) * 100) / 100;
}

function buildClassification(
  input: ClassifyEvidenceCandidateInput,
  partial: Omit<EvidenceSignalClassification, "external_id" | "title"> &
    Partial<Pick<EvidenceSignalClassification, "external_id" | "title">>
): EvidenceSignalClassification {
  const reason_codes = sortReasonCodes(partial.reason_codes);
  const human_review_required =
    partial.human_review_required ||
    partial.signal === "human_review_required" ||
    partial.signal === "contradicts_claim" ||
    (partial.signal === "strengthens_claim" && partial.confidence >= 0.7);
  const client_claim_re_review_required =
    partial.client_claim_re_review_required ||
    (human_review_required &&
      (partial.signal === "strengthens_claim" ||
        partial.signal === "contradicts_claim" ||
        partial.signal === "human_review_required"));

  return {
    external_id: input.external_id,
    title: input.title ?? null,
    signal: partial.signal,
    confidence: roundConfidence(partial.confidence),
    severity: partial.severity,
    reason_codes,
    explanation: partial.explanation,
    human_review_required,
    client_claim_re_review_required,
    contributes_to_evidence_delta: partial.contributes_to_evidence_delta,
    relevance_gate: partial.relevance_gate,
    evidence_direction: partial.evidence_direction,
  };
}

function classifyMagnesiumCortisolStressCandidate(
  input: ClassifyEvidenceCandidateInput
): EvidenceSignalClassification {
  const text = combinedText(input);
  const appraisal = input.source?.appraisal;
  const reasonCodes: string[] = ["MAGNESIUM_CORTISOL_V1_RULES"];

  if (
    appraisal?.species_relevance === "animal" ||
    appraisal?.context_gate === "fail" ||
    appraisal?.exclusion_flags?.includes("animal_only") ||
    appraisal?.domain_context === "veterinary" ||
    (VETERINARY_PATTERN.test(text) && !HUMAN_STUDY_PATTERN.test(text)) ||
    (ANIMAL_ONLY_PATTERN.test(text) && !HUMAN_STUDY_PATTERN.test(text))
  ) {
    return buildClassification(input, {
      signal: "irrelevant_noise",
      confidence: 0.9,
      severity: "low",
      reason_codes: [...reasonCodes, "ANIMAL_OR_VETERINARY_NOISE"],
      explanation:
        "Animal or veterinary-focused record; excluded from human wellness claim appraisal.",
      human_review_required: false,
      client_claim_re_review_required: false,
      contributes_to_evidence_delta: false,
      relevance_gate: "fail",
      evidence_direction: "unclear",
    });
  }

  if (
    SWEAT_BIOMARKER_PATTERN.test(text) &&
    CORTISOL_OUTCOME_PATTERN.test(text) &&
    !MAGNESIUM_INTERVENTION_PATTERN.test(text)
  ) {
    return buildClassification(input, {
      signal: "monitor_only",
      confidence: 0.82,
      severity: "low",
      reason_codes: [...reasonCodes, "SWEAT_BIOMARKER_WITHOUT_MG_INTERVENTION"],
      explanation:
        "Sweat or perspiration biomarker context without a magnesium intervention focus; monitor only.",
      human_review_required: false,
      client_claim_re_review_required: false,
      contributes_to_evidence_delta: false,
      relevance_gate: "caution",
      evidence_direction: "unclear",
    });
  }

  const hasMagnesiumIntervention =
    MAGNESIUM_INTERVENTION_PATTERN.test(text) ||
    appraisal?.exposure_role === "tested_intervention" ||
    appraisal?.intervention_match === "direct";
  const hasMagnesiumMention = MAGNESIUM_MENTION_PATTERN.test(text);
  const hasCortisolOutcome =
    CORTISOL_OUTCOME_PATTERN.test(text) ||
    appraisal?.outcome_match === "direct" ||
    appraisal?.outcome_role === "primary_outcome" ||
    appraisal?.outcome_role === "secondary_outcome";
  const hasStressOutcome = STRESS_OUTCOME_PATTERN.test(text);
  const directRelationship = hasMagnesiumIntervention && (hasCortisolOutcome || hasStressOutcome);
  const incidentalMention =
    hasMagnesiumMention &&
    (hasCortisolOutcome || hasStressOutcome) &&
    !hasMagnesiumIntervention &&
    (appraisal?.exposure_role === "background_mention" ||
      appraisal?.outcome_role === "background_mention" ||
      appraisal?.contextual_relevance === "weak" ||
      appraisal?.contextual_relevance === "irrelevant" ||
      appraisal?.directness_to_claim === "indirect" ||
      appraisal?.directness_to_claim === "irrelevant");

  if (incidentalMention || (!directRelationship && hasMagnesiumMention && !hasMagnesiumIntervention)) {
    return buildClassification(input, {
      signal: "irrelevant_noise",
      confidence: 0.78,
      severity: "low",
      reason_codes: [...reasonCodes, "INCIDENTAL_MAGNESIUM_CORTISOL_MENTION"],
      explanation:
        "Magnesium and cortisol/stress are mentioned incidentally without a direct intervention-outcome relationship.",
      human_review_required: false,
      client_claim_re_review_required: false,
      contributes_to_evidence_delta: false,
      relevance_gate: "fail",
      evidence_direction: "no_change",
    });
  }

  if (appraisal?.exclusion_flags?.includes("context_gate_fail")) {
    return buildClassification(input, {
      signal: "irrelevant_noise",
      confidence: 0.84,
      severity: "low",
      reason_codes: [...reasonCodes, "CONTEXT_GATE_FAIL"],
      explanation: "Record failed contextual integrity gates and is treated as retrieval noise.",
      human_review_required: false,
      client_claim_re_review_required: false,
      contributes_to_evidence_delta: false,
      relevance_gate: "fail",
      evidence_direction: "unclear",
    });
  }

  const humanFocused =
    appraisal?.species_relevance === "human" ||
    appraisal?.population_type === "human" ||
    HUMAN_STUDY_PATTERN.test(text);
  const isRct = RCT_PATTERN.test(text) || appraisal?.study_design_detected === "randomized_controlled_trial";
  const isSystematicReview =
    SYSTEMATIC_REVIEW_PATTERN.test(text) ||
    appraisal?.study_design_detected === "systematic_review";
  const isNarrativeReview =
    NARRATIVE_REVIEW_PATTERN.test(text) ||
    (appraisal?.study_design_detected === "review" && !isSystematicReview);

  if (CONTRADICT_EFFECT_PATTERN.test(text) && directRelationship) {
    return buildClassification(input, {
      signal: "contradicts_claim",
      confidence: 0.76,
      severity: "high",
      reason_codes: [...reasonCodes, "DIRECT_CONTRADICTORY_FINDING"],
      explanation:
        "Abstract language suggests magnesium/stress findings that may oppose the monitored claim relationship.",
      human_review_required: true,
      client_claim_re_review_required: true,
      contributes_to_evidence_delta: true,
      relevance_gate: humanFocused ? "pass" : "caution",
      evidence_direction: "increases_risk",
    });
  }

  if (NULL_EFFECT_PATTERN.test(text) && directRelationship) {
    return buildClassification(input, {
      signal: isRct || isSystematicReview ? "weakens_claim" : "monitor_only",
      confidence: isRct ? 0.72 : 0.58,
      severity: "medium",
      reason_codes: [...reasonCodes, "NULL_OR_MIXED_EFFECT"],
      explanation: isRct
        ? "Direct human study language suggests null or mixed findings on cortisol/stress outcomes."
        : "Possible null or mixed findings, but study directness is limited; continue monitoring.",
      human_review_required: false,
      client_claim_re_review_required: false,
      contributes_to_evidence_delta: isRct || isSystematicReview,
      relevance_gate: humanFocused ? "pass" : "caution",
      evidence_direction: "weakens_support",
    });
  }

  if (
    POSITIVE_EFFECT_PATTERN.test(text) &&
    directRelationship &&
    humanFocused &&
    (isRct || isSystematicReview) &&
    !isNarrativeReview
  ) {
    const highQualityDirect = isRct || isSystematicReview;
    return buildClassification(input, {
      signal: highQualityDirect ? "human_review_required" : "monitor_only",
      confidence: highQualityDirect ? 0.74 : 0.55,
      severity: highQualityDirect ? "high" : "medium",
      reason_codes: [...reasonCodes, "DIRECT_POSITIVE_HUMAN_EVIDENCE"],
      explanation: highQualityDirect
        ? "Human RCT or systematic review language directly evaluates magnesium and cortisol/stress with supportive findings; conservative human review recommended."
        : "Supportive language detected but study type is not strong enough for automatic strengthening.",
      human_review_required: highQualityDirect,
      client_claim_re_review_required: highQualityDirect,
      contributes_to_evidence_delta: true,
      relevance_gate: "pass",
      evidence_direction: "strengthens_support",
    });
  }

  if (
    POSITIVE_EFFECT_PATTERN.test(text) &&
    directRelationship &&
    humanFocused &&
    isRct &&
    appraisal?.context_gate === "pass"
  ) {
    return buildClassification(input, {
      signal: "strengthens_claim",
      confidence: 0.7,
      severity: "medium",
      reason_codes: [...reasonCodes, "STRENGTHENS_CLAIM_CONSERVATIVE"],
      explanation:
        "Conservative strengthen signal: direct human RCT with context-gate pass and supportive cortisol/stress language.",
      human_review_required: true,
      client_claim_re_review_required: true,
      contributes_to_evidence_delta: true,
      relevance_gate: "pass",
      evidence_direction: "strengthens_support",
    });
  }

  if (directRelationship) {
    return buildClassification(input, {
      signal: "monitor_only",
      confidence: 0.52,
      severity: "low",
      reason_codes: [...reasonCodes, "DIRECTNESS_UNCLEAR"],
      explanation:
        "Some magnesium and cortisol/stress relevance detected, but effect direction or study quality is unclear.",
      human_review_required: false,
      client_claim_re_review_required: false,
      contributes_to_evidence_delta: false,
      relevance_gate: "caution",
      evidence_direction: "unclear",
    });
  }

  return buildClassification(input, {
    signal: "monitor_only",
    confidence: 0.45,
    severity: "low",
    reason_codes: [...reasonCodes, "LOW_RELEVANCE_DEFAULT"],
    explanation:
      "Record does not clearly evaluate the magnesium and cortisol/stress relationship; routine monitoring only.",
    human_review_required: false,
    client_claim_re_review_required: false,
    contributes_to_evidence_delta: false,
    relevance_gate: "caution",
    evidence_direction: "unclear",
  });
}

const SIGNAL_PRIORITY: EvidenceSignalCategory[] = [
  "contradicts_claim",
  "human_review_required",
  "client_claim_re_review_required",
  "strengthens_claim",
  "weakens_claim",
  "monitor_only",
  "irrelevant_noise",
  "no_material_change",
];

export function classifyEvidenceCandidate(
  input: ClassifyEvidenceCandidateInput
): EvidenceSignalClassification {
  if (!input.title && !input.abstract && !input.source) {
    return buildClassification(input, {
      signal: "no_material_change",
      confidence: 0.5,
      severity: "low",
      reason_codes: ["MISSING_SOURCE_TEXT"],
      explanation: "Insufficient metadata for signal classification.",
      human_review_required: false,
      client_claim_re_review_required: false,
      contributes_to_evidence_delta: false,
      relevance_gate: "caution",
      evidence_direction: "unclear",
    });
  }

  const profile = getClaimFamilySearchProfile(input.claim_family_id);
  if (!profile) {
    return buildClassification(input, {
      signal: "monitor_only",
      confidence: 0.4,
      severity: "low",
      reason_codes: ["UNKNOWN_CLAIM_FAMILY_PROFILE"],
      explanation: "No claim family search profile available; defaulting to monitor only.",
      human_review_required: false,
      client_claim_re_review_required: false,
      contributes_to_evidence_delta: false,
      relevance_gate: "caution",
      evidence_direction: "unclear",
    });
  }

  if (input.claim_family_id === "magnesium_cortisol_stress") {
    return classifyMagnesiumCortisolStressCandidate(input);
  }

  return buildClassification(input, {
    signal: "monitor_only",
    confidence: 0.4,
    severity: "low",
    reason_codes: ["DEFAULT_MONITOR_ONLY"],
    explanation: "Claim family profile exists but no Phase 16 v1 rules are defined yet.",
    human_review_required: false,
    client_claim_re_review_required: false,
    contributes_to_evidence_delta: false,
    relevance_gate: "caution",
    evidence_direction: "unclear",
  });
}

export function classifyEvidenceSources(
  claimFamilyId: string,
  sources: EvidenceSource[]
): EvidenceSignalClassification[] {
  return sources.map((source) =>
    classifyEvidenceCandidate({
      claim_family_id: claimFamilyId,
      external_id: source.meta?.pmid ?? source.source_id,
      title: source.title,
      abstract: source.abstract?.text ?? source.summary,
      publication_type: source.methodology?.study_design ?? null,
      journal: source.meta?.journal,
      source,
    })
  );
}

export function aggregateSignalClassifications(
  classifications: EvidenceSignalClassification[]
): TopicSignalClassificationSummary | null {
  if (classifications.length === 0) {
    return null;
  }

  const primary =
    classifications
      .slice()
      .sort(
        (left, right) =>
          SIGNAL_PRIORITY.indexOf(left.signal) - SIGNAL_PRIORITY.indexOf(right.signal)
      )[0] ?? classifications[0];

  const reason_codes = sortReasonCodes(
    classifications.flatMap((classification) => classification.reason_codes)
  );

  return {
    signal_classification: primary,
    signal: primary.signal,
    evidence_direction: primary.evidence_direction,
    reason_codes,
    human_review_required: classifications.some(
      (classification) => classification.human_review_required
    ),
    client_claim_re_review_required: classifications.some(
      (classification) => classification.client_claim_re_review_required
    ),
    confidence: primary.confidence,
    explanation: primary.explanation,
  };
}

export function buildNoMaterialChangeSignalClassification(): EvidenceSignalClassification {
  return {
    signal: "no_material_change",
    confidence: 0.9,
    severity: "low",
    reason_codes: ["NO_NEW_EVIDENCE"],
    explanation: "No new evidence candidates to classify.",
    human_review_required: false,
    client_claim_re_review_required: false,
    contributes_to_evidence_delta: false,
    relevance_gate: "pass",
    evidence_direction: "no_change",
  };
}
