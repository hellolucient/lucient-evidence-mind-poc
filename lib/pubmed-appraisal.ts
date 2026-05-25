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
  | "background"
  | "unclear";

export type OutcomeMatch = "direct" | "partial" | "missing" | "unclear";

export type ExclusionFlag =
  | "animal_only"
  | "wrong_intervention"
  | "case_report"
  | "no_cortisol_endpoint"
  | "not_magnesium_specific"
  | "not_human_wellness_context"
  | "context_gate_fail"
  | "pathological_context"
  | "outside_wellness_context";

export type AppraisalDebug = {
  intervention_terms_found: string[];
  outcome_terms_found: string[];
  study_design_terms_found: string[];
  downgrade_reasons: string[];
};

export type SourceAppraisal = {
  species_relevance: SpeciesRelevance;
  study_design_detected: StudyDesignDetected;
  directness_to_claim: DirectnessToClaim;
  intervention_match: InterventionMatch;
  outcome_match: OutcomeMatch;
  exclusion_flags: ExclusionFlag[];
  appraisal_summary: string;
  appraisal_debug: AppraisalDebug;
  population_type?: "human" | "animal" | "mixed" | "unclear";
  domain_context?:
    | "wellness"
    | "clinical"
    | "psychiatric"
    | "veterinary"
    | "unrelated"
    | "unclear";
  exposure_role?:
    | "tested_intervention"
    | "biomarker"
    | "background_mention"
    | "unrelated"
    | "unclear";
  outcome_role?:
    | "primary_outcome"
    | "secondary_outcome"
    | "biomarker_mention"
    | "background_mention"
    | "unclear";
  contextual_relevance?: "direct" | "partial" | "weak" | "irrelevant";
  context_gate?: "pass" | "caution" | "fail";
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

const ANIMAL_TERMS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bgoats?\b/i, label: "goat" },
  { pattern: /\b(rats?|mice|mouse|murine|rodent)\b/i, label: "rodent" },
  { pattern: /\b(bovine|cows?|porcine|pigs?|livestock|sheep|lambs?)\b/i, label: "livestock" },
  { pattern: /\b(canine|dogs?|feline|cats?|rabbits?|zebrafish)\b/i, label: "animal model" },
  { pattern: /\banimal (model|study)\b/i, label: "animal study" },
];

const HUMAN_TERMS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\b(human|humans|patient|patients)\b/i, label: "human/patient" },
  { pattern: /\b(adult|adults|women|men|participant|participants|volunteers)\b/i, label: "human participants" },
  { pattern: /\bhealthy subjects\b/i, label: "healthy subjects" },
];

const CORTISOL_OUTCOME_TERMS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bcortisol\b/i, label: "cortisol" },
  { pattern: /\bhydrocortisone\b/i, label: "hydrocortisone" },
  { pattern: /\bhpa axis\b/i, label: "HPA axis" },
  { pattern: /\bstress hormone\b/i, label: "stress hormone" },
  { pattern: /\bglucocorticoid\b/i, label: "glucocorticoid" },
  { pattern: /\bsalivary cortisol\b/i, label: "salivary cortisol" },
  { pattern: /\bplasma cortisol\b/i, label: "plasma cortisol" },
  { pattern: /\bhypothalamic-pituitary-adrenal\b/i, label: "HPA axis" },
];

const STRESS_PHYSIOLOGY_TERMS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bstress physiology\b/i, label: "stress physiology" },
  { pattern: /\bpsychological stress\b/i, label: "psychological stress" },
  { pattern: /\bstress response\b/i, label: "stress response" },
  { pattern: /\badrenal\b/i, label: "adrenal" },
];

const MAGNESIUM_INTERVENTION_TERMS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bmagnesium supplementation\b/i, label: "magnesium supplementation" },
  { pattern: /\bmagnesium supplement\b/i, label: "magnesium supplement" },
  { pattern: /\bsupplementation with magnesium\b/i, label: "supplementation with magnesium" },
  { pattern: /\bmagnesium intake\b/i, label: "magnesium intake" },
  { pattern: /\bmagnesium-deficient\b/i, label: "magnesium deficiency" },
  { pattern: /\bmagnesium deficiency\b/i, label: "magnesium deficiency" },
  { pattern: /\bmagnesium treatment\b/i, label: "magnesium treatment" },
  { pattern: /\bmagnesium intervention\b/i, label: "magnesium intervention" },
  { pattern: /\bmagnesium therapy\b/i, label: "magnesium therapy" },
  { pattern: /\bmagnesium replacement\b/i, label: "magnesium replacement" },
  { pattern: /\badministered magnesium\b/i, label: "administered magnesium" },
  { pattern: /\breceived magnesium\b/i, label: "received magnesium" },
  { pattern: /\boral magnesium\b/i, label: "oral magnesium" },
];

const MAGNESIUM_BIOMARKER_TERMS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bserum magnesium\b/i, label: "serum magnesium" },
  { pattern: /\bplasma magnesium\b/i, label: "plasma magnesium" },
  { pattern: /\bmagnesium levels\b/i, label: "magnesium levels" },
  { pattern: /\bmagnesium concentration\b/i, label: "magnesium concentration" },
  { pattern: /\bmagnesium status\b/i, label: "magnesium status" },
  { pattern: /\bmagnesium was measured\b/i, label: "magnesium measured" },
  { pattern: /\bmagnesium levels were\b/i, label: "magnesium levels measured" },
];

const WRONG_INTERVENTION_SUBJECTS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bchromium\b/i, label: "chromium" },
  { pattern: /\bvitamin d3?\b/i, label: "vitamin D" },
  { pattern: /\bcholecalciferol\b/i, label: "vitamin D" },
  { pattern: /\bzinc\b/i, label: "zinc" },
  { pattern: /\bexercise training\b/i, label: "exercise" },
  { pattern: /\bsauna\b/i, label: "sauna" },
  { pattern: /\balcohol abuse\b/i, label: "alcohol abuse" },
  { pattern: /\bpseudo-cushing\b/i, label: "pseudo-Cushing" },
  { pattern: /\bcushing syndrome\b/i, label: "Cushing syndrome" },
];

const PRIMARY_SUBJECT_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\beffects of chromium\b/i, label: "effects of chromium" },
  { pattern: /\bchromium supplementation\b/i, label: "chromium supplementation" },
  { pattern: /\beffects of (zinc|vitamin d|exercise|sauna)\b/i, label: "primary non-magnesium intervention" },
  { pattern: /\bwe studied (goats?|rats?|mice|rodents?)\b/i, label: "animal primary subject" },
  { pattern: /\b(patient was diagnosed|a case of|case report)\b/i, label: "single case focus" },
  { pattern: /\balcohol abuse was\b/i, label: "alcohol abuse focus" },
];

const STUDY_DESIGN_PATTERNS: Array<{ pattern: RegExp; design: StudyDesignDetected; label: string }> = [
  { pattern: /\bsystematic review\b/i, design: "systematic_review", label: "systematic review" },
  { pattern: /\bmeta-analysis\b/i, design: "systematic_review", label: "meta-analysis" },
  { pattern: /\bcase report\b/i, design: "case_report", label: "case report" },
  { pattern: /\ba case of\b/i, design: "case_report", label: "a case of" },
  { pattern: /\bpatient was diagnosed\b/i, design: "case_report", label: "patient was diagnosed" },
  { pattern: /\bsingle patient\b/i, design: "case_report", label: "single patient" },
  { pattern: /\brandomized\b/i, design: "randomized_controlled_trial", label: "randomized" },
  { pattern: /\bplacebo-controlled\b/i, design: "randomized_controlled_trial", label: "placebo-controlled" },
  { pattern: /\bdouble-blind\b/i, design: "randomized_controlled_trial", label: "double-blind" },
  { pattern: /\bclinical trial\b/i, design: "randomized_controlled_trial", label: "clinical trial" },
  { pattern: /\bthis review\b/i, design: "review", label: "this review" },
  { pattern: /\breview\b/i, design: "review", label: "review" },
  { pattern: /\bcohort\b/i, design: "observational", label: "cohort" },
  { pattern: /\bcross-sectional\b/i, design: "observational", label: "cross-sectional" },
  { pattern: /\bobservational\b/i, design: "observational", label: "observational" },
];

const PATHOLOGICAL_CONTEXT_TERMS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bpseudo-cushing\b/i, label: "pseudo-Cushing" },
  { pattern: /\bcushing syndrome\b/i, label: "Cushing syndrome" },
  { pattern: /\balcohol abuse\b/i, label: "alcohol abuse" },
  { pattern: /\bpatholog/i, label: "pathological context" },
];

const WELLNESS_CONTEXT_TERMS =
  /\b(spa|wellness|massage|relaxation|guests?|retreat|resort)\b/i;

function combinedText(title: string, abstract: string | null): string {
  return `${title} ${abstract ?? ""}`;
}

function findTerms(
  text: string,
  patterns: Array<{ pattern: RegExp; label: string }>
): string[] {
  return [
    ...new Set(
      patterns.filter(({ pattern }) => pattern.test(text)).map(({ label }) => label)
    ),
  ];
}

function queryMentionsMagnesium(query: string): boolean {
  return /\bmagnesium\b/i.test(query);
}

function queryMentionsCortisol(query: string): boolean {
  return /\b(cortisol|hydrocortisone|hpa axis|stress hormone|hormone regulation|glucocorticoid)\b/i.test(
    query
  );
}

function hasMagnesiumInterventionFocus(text: string): boolean {
  return MAGNESIUM_INTERVENTION_TERMS.some(({ pattern }) => pattern.test(text));
}

function hasMagnesiumBiomarkerOnly(text: string): boolean {
  const hasBiomarker = MAGNESIUM_BIOMARKER_TERMS.some(({ pattern }) => pattern.test(text));
  const hasIntervention = hasMagnesiumInterventionFocus(text);
  return hasBiomarker && !hasIntervention;
}

function isPathologicalCaseContext(text: string): boolean {
  return /\bcase report\b/i.test(text) && hasPathologicalContext(text);
}

function detectPrimaryWrongIntervention(
  text: string
): { wrong: boolean; labels: string[] } {
  const magnesiumIntervention = hasMagnesiumInterventionFocus(text);

  if (isPathologicalCaseContext(text) && !magnesiumIntervention) {
    return { wrong: false, labels: [] };
  }

  const primaryLabels = findTerms(text, PRIMARY_SUBJECT_PATTERNS);
  const wrongLabels = findTerms(text, WRONG_INTERVENTION_SUBJECTS);

  const title = text.split(".")[0] ?? text;
  const titleWrong = findTerms(title, WRONG_INTERVENTION_SUBJECTS);
  const titlePrimary = findTerms(title, PRIMARY_SUBJECT_PATTERNS);

  if (magnesiumIntervention && titleWrong.length === 0) {
    return { wrong: false, labels: [] };
  }

  if (
    titlePrimary.length > 0 &&
    titleWrong.length > 0 &&
    !magnesiumIntervention
  ) {
    return { wrong: true, labels: [...new Set([...titlePrimary, ...titleWrong])] };
  }

  if (
    wrongLabels.includes("chromium") &&
    /\bchromium (supplementation|supplement|picolinate)\b/i.test(text) &&
    !magnesiumIntervention
  ) {
    return { wrong: true, labels: ["chromium"] };
  }

  if (
    (wrongLabels.includes("alcohol abuse") || wrongLabels.includes("pseudo-Cushing")) &&
    !magnesiumIntervention
  ) {
    return { wrong: false, labels: wrongLabels };
  }

  if (titleWrong.length > 0 && !magnesiumIntervention && !/\bmagnesium\b/i.test(text)) {
    return { wrong: true, labels: titleWrong };
  }

  return { wrong: false, labels: primaryLabels };
}

function detectSpeciesRelevance(text: string): SpeciesRelevance {
  const animalFound = findTerms(text, ANIMAL_TERMS);
  const humanFound = findTerms(text, HUMAN_TERMS);

  if (animalFound.length > 0 && humanFound.length > 0) {
    return "mixed";
  }
  if (animalFound.length > 0) {
    return "animal";
  }
  if (humanFound.length > 0) {
    return "human";
  }
  return "unclear";
}

function detectStudyDesign(
  text: string,
  species: SpeciesRelevance
): { design: StudyDesignDetected; terms: string[] } {
  const terms: string[] = [];
  const matched: StudyDesignDetected[] = [];

  for (const entry of STUDY_DESIGN_PATTERNS) {
    if (entry.pattern.test(text)) {
      terms.push(entry.label);
      matched.push(entry.design);
    }
  }

  if (species === "animal") {
    matched.push("animal_study");
    if (!terms.includes("animal context")) {
      terms.push("animal context");
    }
  }

  const priority: StudyDesignDetected[] = [
    "systematic_review",
    "case_report",
    "randomized_controlled_trial",
    "review",
    "observational",
    "animal_study",
    "background",
    "unknown",
  ];

  const design =
    priority.find((candidate) => matched.includes(candidate)) ?? "unknown";

  return { design, terms: [...new Set(terms)] };
}

function assessInterventionMatch(
  query: string,
  text: string
): { match: InterventionMatch; terms: string[]; downgrade: string[] } {
  const terms: string[] = [];
  const downgrade: string[] = [];

  if (!queryMentionsMagnesium(query)) {
    return { match: "unclear", terms, downgrade };
  }

  const wrongCheck = detectPrimaryWrongIntervention(text);
  const interventionTerms = findTerms(text, MAGNESIUM_INTERVENTION_TERMS);
  const biomarkerTerms = findTerms(text, MAGNESIUM_BIOMARKER_TERMS);

  if (wrongCheck.wrong) {
    terms.push(...wrongCheck.labels, ...biomarkerTerms);
    downgrade.push("primary subject is not magnesium intervention");
    return { match: "wrong_intervention", terms, downgrade };
  }

  if (hasMagnesiumInterventionFocus(text)) {
    terms.push(...interventionTerms);
    return { match: "direct", terms, downgrade };
  }

  if (hasMagnesiumBiomarkerOnly(text) || (biomarkerTerms.length > 0 && interventionTerms.length === 0)) {
    terms.push(...biomarkerTerms);
    downgrade.push("magnesium appears as measured mineral/background only");
    return { match: "background", terms, downgrade };
  }

  if (
    /\breview\b/i.test(text) &&
    !hasMagnesiumInterventionFocus(text) &&
    /\bmagnesium\b/i.test(text)
  ) {
    terms.push("magnesium mention in review");
    downgrade.push("review-level mention without tested magnesium intervention");
    return { match: "background", terms, downgrade };
  }

  if (/\bmagnesium\b/i.test(text)) {
    terms.push("magnesium mention");
    downgrade.push("magnesium mentioned without clear intervention focus");
    return { match: "partial", terms, downgrade };
  }

  if (findTerms(text, WRONG_INTERVENTION_SUBJECTS).length > 0) {
    terms.push(...findTerms(text, WRONG_INTERVENTION_SUBJECTS));
    downgrade.push("non-magnesium intervention dominates");
    return { match: "wrong_intervention", terms, downgrade };
  }

  downgrade.push("no clear magnesium intervention focus");
  return { match: "unclear", terms, downgrade };
}

function assessOutcomeMatch(
  query: string,
  text: string
): { match: OutcomeMatch; terms: string[]; downgrade: string[] } {
  const terms: string[] = [];
  const downgrade: string[] = [];

  if (!queryMentionsCortisol(query)) {
    return { match: "unclear", terms, downgrade };
  }

  const cortisolTerms = findTerms(text, CORTISOL_OUTCOME_TERMS);
  if (cortisolTerms.length > 0) {
    terms.push(...cortisolTerms);
    return { match: "direct", terms, downgrade };
  }

  const stressTerms = findTerms(text, STRESS_PHYSIOLOGY_TERMS);
  if (stressTerms.length > 0) {
    terms.push(...stressTerms);
    downgrade.push("stress physiology discussed without clear cortisol endpoint");
    return { match: "partial", terms, downgrade };
  }

  downgrade.push("no cortisol or stress-hormone endpoint detected");
  return { match: "missing", terms, downgrade };
}

function hasPathologicalContext(text: string): boolean {
  return PATHOLOGICAL_CONTEXT_TERMS.some(({ pattern }) => pattern.test(text));
}

function computeDirectness(
  species: SpeciesRelevance,
  intervention: InterventionMatch,
  outcome: OutcomeMatch,
  studyDesign: StudyDesignDetected
): DirectnessToClaim {
  if (
    intervention === "wrong_intervention" ||
    species === "animal" ||
    (intervention === "background" && outcome !== "direct")
  ) {
    return "irrelevant";
  }

  if (
    intervention === "direct" &&
    outcome === "direct" &&
    (species === "human" || species === "mixed") &&
    studyDesign === "randomized_controlled_trial"
  ) {
    return "direct";
  }

  if (
    intervention === "direct" &&
    outcome === "direct" &&
    (species === "human" || species === "mixed")
  ) {
    return "partial";
  }

  if (intervention === "partial" || outcome === "partial" || outcome === "missing") {
    return "partial";
  }

  if (studyDesign === "review" || studyDesign === "systematic_review" || studyDesign === "background") {
    return "indirect";
  }

  return "indirect";
}

function applyRelevanceCaps(
  score: number,
  flags: ExclusionFlag[],
  studyDesign: StudyDesignDetected,
  intervention: InterventionMatch,
  outcome: OutcomeMatch,
  species: SpeciesRelevance,
  downgradeReasons: string[]
): number {
  let capped = score;

  if (flags.includes("animal_only") && flags.includes("wrong_intervention")) {
    capped = Math.min(capped, 0.25);
    downgradeReasons.push("cap: animal_only + wrong_intervention -> max 0.25");
  } else if (flags.includes("animal_only")) {
    capped = Math.min(capped, 0.3);
    downgradeReasons.push("cap: animal_only");
  }

  if (flags.includes("case_report") && hasPathologicalContextFlag(downgradeReasons, flags)) {
    capped = Math.min(capped, 0.35);
    downgradeReasons.push("cap: case_report + pathological context -> max 0.35");
  } else if (flags.includes("case_report")) {
    capped = Math.min(capped, 0.35);
    downgradeReasons.push("cap: case_report");
  }

  if (
    (studyDesign === "review" || studyDesign === "systematic_review" || intervention === "background") &&
    !(intervention === "direct" && outcome === "direct" && species === "human")
  ) {
    capped = Math.min(capped, 0.55);
    downgradeReasons.push("cap: review/background/indirect context -> max 0.55");
  }

  if (
    intervention === "direct" &&
    outcome === "direct" &&
    species === "human" &&
    studyDesign === "randomized_controlled_trial"
  ) {
    capped = Math.max(capped, 0.75);
    downgradeReasons.push("boost: direct human RCT with matching intervention and outcome");
  }

  return Math.max(0.08, Math.min(0.85, capped));
}

function hasPathologicalContextFlag(
  downgradeReasons: string[],
  flags: ExclusionFlag[]
): boolean {
  return (
    flags.includes("not_human_wellness_context") ||
    downgradeReasons.some((reason) => reason.includes("pathological"))
  );
}

function buildAppraisalSummary(
  flags: ExclusionFlag[],
  intervention: InterventionMatch,
  outcome: OutcomeMatch,
  studyDesign: StudyDesignDetected
): string {
  if (flags.includes("wrong_intervention")) {
    return "The primary intervention in this record does not appear to be magnesium; magnesium may be a background or measured variable only.";
  }
  if (flags.includes("animal_only")) {
    return "Animal-only evidence has limited direct relevance to human wellness marketing claims.";
  }
  if (flags.includes("case_report")) {
    return "Case report evidence is narrow and not generalizable to healthy wellness consumers.";
  }
  if (intervention === "background") {
    return "Magnesium appears as a background or measured variable rather than the tested intervention.";
  }
  if (studyDesign === "review" || studyDesign === "systematic_review") {
    return "Review-level evidence is indirect and does not by itself substantiate a specific intervention claim.";
  }
  if (flags.includes("no_cortisol_endpoint")) {
    return "No clear cortisol or stress-hormone endpoint was detected in the record text.";
  }
  if (intervention === "direct" && outcome === "direct") {
    return "Record may relate to the query intervention and outcome, but Phase 7 appraisal remains conservative and does not substantiate the claim.";
  }
  return "Phase 7 automated appraisal applied; record relevance to the claim remains uncertain.";
}

export function appraisePubMedRecord(
  query: string,
  title: string,
  abstractText: string | null,
  baseRelevanceScore: number
): { appraisal: SourceAppraisal; analysis: AppraisalAnalysis } {
  const text = combinedText(title, abstractText);
  const exclusion_flags: ExclusionFlag[] = [];
  const downgrade_reasons: string[] = [];

  const species_relevance = detectSpeciesRelevance(text);
  const { design: study_design_detected, terms: study_design_terms_found } =
    detectStudyDesign(text, species_relevance);

  const {
    match: intervention_match,
    terms: intervention_terms_found,
    downgrade: interventionDowngrades,
  } = assessInterventionMatch(query, text);

  const {
    match: outcome_match,
    terms: outcome_terms_found,
    downgrade: outcomeDowngrades,
  } = assessOutcomeMatch(query, text);

  downgrade_reasons.push(...interventionDowngrades, ...outcomeDowngrades);

  if (study_design_detected === "case_report") {
    exclusion_flags.push("case_report");
  }

  if (species_relevance === "animal") {
    exclusion_flags.push("animal_only");
    if (study_design_detected === "unknown") {
      // animal_study enforced via detectStudyDesign
    }
  }

  if (intervention_match === "wrong_intervention") {
    exclusion_flags.push("wrong_intervention");
  }

  if (
    intervention_match !== "direct" &&
    queryMentionsMagnesium(query) &&
    !exclusion_flags.includes("wrong_intervention")
  ) {
    exclusion_flags.push("not_magnesium_specific");
  }

  if (outcome_match === "missing") {
    exclusion_flags.push("no_cortisol_endpoint");
  }

  const pathological = hasPathologicalContext(text);
  if (
    pathological ||
    (WELLNESS_CONTEXT_TERMS.test(query) && !WELLNESS_CONTEXT_TERMS.test(text) && species_relevance === "human")
  ) {
    exclusion_flags.push("not_human_wellness_context");
    if (pathological) {
      downgrade_reasons.push("pathological or clinical case context, not general wellness population");
    }
  }

  const directness_to_claim = computeDirectness(
    species_relevance,
    intervention_match,
    outcome_match,
    study_design_detected
  );

  let relevance_score = baseRelevanceScore;
  if (exclusion_flags.includes("animal_only")) relevance_score -= 0.3;
  if (exclusion_flags.includes("wrong_intervention")) relevance_score -= 0.35;
  if (exclusion_flags.includes("case_report")) relevance_score -= 0.2;
  if (exclusion_flags.includes("no_cortisol_endpoint")) relevance_score -= 0.15;
  if (exclusion_flags.includes("not_magnesium_specific")) relevance_score -= 0.12;
  if (exclusion_flags.includes("not_human_wellness_context")) relevance_score -= 0.1;
  if (intervention_match === "background") relevance_score -= 0.15;

  if (
    intervention_match === "direct" &&
    outcome_match === "direct" &&
    species_relevance === "human" &&
    study_design_detected === "randomized_controlled_trial"
  ) {
    relevance_score += 0.2;
  }

  relevance_score = applyRelevanceCaps(
    relevance_score,
    exclusion_flags,
    study_design_detected,
    intervention_match,
    outcome_match,
    species_relevance,
    downgrade_reasons
  );

  let supports_claim: AppraisalAnalysis["supports_claim"] = "unclear";
  if (
    directness_to_claim === "irrelevant" ||
    intervention_match === "wrong_intervention" ||
    (species_relevance === "animal" && intervention_match !== "direct")
  ) {
    supports_claim = "no";
  } else if (
    intervention_match === "direct" &&
    outcome_match === "direct" &&
    species_relevance === "human" &&
    study_design_detected === "randomized_controlled_trial" &&
    !exclusion_flags.includes("case_report")
  ) {
    supports_claim = "unclear";
  }

  const claim_alignment: AppraisalAnalysis["claim_alignment"] = "insufficient";
  const alignment_confidence =
    directness_to_claim === "direct" && intervention_match === "direct" ? 0.38 : 0.2;

  const outcomes = [...new Set([...outcome_terms_found, ...intervention_terms_found])];

  const appraisal: SourceAppraisal = {
    species_relevance,
    study_design_detected,
    directness_to_claim,
    intervention_match,
    outcome_match,
    exclusion_flags: [...new Set(exclusion_flags)],
    appraisal_summary: buildAppraisalSummary(
      exclusion_flags,
      intervention_match,
      outcome_match,
      study_design_detected
    ),
    appraisal_debug: {
      intervention_terms_found,
      outcome_terms_found,
      study_design_terms_found,
      downgrade_reasons,
    },
  };

  return {
    appraisal,
    analysis: {
      relevance_score,
      alignment_confidence,
      claim_alignment,
      supports_claim,
      effect_summary:
        "Phase 7 automated appraisal applied; no effect-size extraction or final substantiation performed.",
      outcomes,
      study_design: study_design_detected,
    },
  };
}

export function isObviouslyIrrelevant(appraisal: SourceAppraisal): boolean {
  return (
    appraisal.context_gate === "fail" ||
    appraisal.exclusion_flags.includes("context_gate_fail") ||
    appraisal.directness_to_claim === "irrelevant" ||
    appraisal.exclusion_flags.includes("wrong_intervention") ||
    (appraisal.exclusion_flags.includes("animal_only") &&
      appraisal.intervention_match !== "direct")
  );
}
