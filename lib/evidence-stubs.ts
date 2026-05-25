import type { ClaimType } from "./claim-classifier";

import type { SourceAppraisal } from "./pubmed-appraisal";

export type EvidenceAbstract = {
  available: boolean;
  text: string | null;
  excerpt: string | null;
};

export type EvidenceLevel =
  | "systematic_review"
  | "clinical_trial"
  | "observational"
  | "guideline"
  | "background"
  | "unknown";

export type StudyDesign =
  | "systematic_review"
  | "randomized_controlled_trial"
  | "observational"
  | "guideline"
  | "background"
  | "unknown";

export type RelevanceToClaim = "direct" | "indirect" | "background";
export type SupportsClaim = "yes" | "no" | "mixed" | "unclear";
export type ClaimAlignment =
  | "supports"
  | "contradicts"
  | "mixed"
  | "insufficient"
  | "background";

export type RegulatorySeverity = "low" | "medium" | "high" | "critical";

export type Jurisdiction = "US" | "EU" | "UK" | "AU" | "TH" | "GLOBAL";

export type RegulatoryFramework =
  | "FTC"
  | "FDA"
  | "EFSA"
  | "ASA"
  | "TGA"
  | "Thai FDA"
  | "General marketing substantiation";

export type RegulatoryContextEntry = {
  jurisdiction: Jurisdiction;
  framework: RegulatoryFramework;
  risk_note: string;
  severity: RegulatorySeverity;
};

export type EvidenceSourceMeta = {
  pmid: string | null;
  doi: string | null;
  journal: string | null;
  publication_date: string | null;
  citation: string | null;
};

export type EvidenceSourceMethodology = {
  study_design: StudyDesign;
  sample_size: number | null;
  population: string | null;
  duration: string | null;
};

export type EvidenceSourceAnalysis = {
  outcomes: string[];
  effect_summary: string;
  claim_alignment: ClaimAlignment;
  alignment_confidence: number;
  relevance_score: number;
};

export type RegulatoryFlag = {
  flag: string;
  severity: RegulatorySeverity;
  note: string;
};

export type EvidenceSource = {
  source_id: string;
  source_type: "evidence_stub" | "pubmed";
  source_rank: number;
  title: string;
  url: string;
  publication_year: number | null;
  evidence_level: EvidenceLevel;
  relevance_to_claim: RelevanceToClaim;
  supports_claim: SupportsClaim;
  summary: string;
  meta: EvidenceSourceMeta;
  methodology: EvidenceSourceMethodology;
  analysis: EvidenceSourceAnalysis;
  study_limitations: string[];
  regulatory_flags: RegulatoryFlag[];
  regulatory_context: RegulatoryContextEntry[];
  abstract?: EvidenceAbstract;
  appraisal?: SourceAppraisal;
};

export type EvidenceNotes = {
  source_quality_note: string;
  citation_status:
    | "placeholder"
    | "metadata_retrieved_not_appraised"
    | "abstracts_retrieved_not_fully_appraised";
  next_step_for_real_evidence: string;
  real_evidence_fields_needed: string[];
  appraisal_note?: string;
  watchlist_note?: string;
};

export const WATCHLIST_NOTE =
  "Phase 7.5 introduces abstracted claim-family watch topics. These are designed for evidence monitoring without exposing client-private wording to the Mind.";

export const DEFAULT_MAX_SOURCES = 3;
export const HARD_MAX_SOURCES = 5;

const POC_CITATION = "POC placeholder, not a real citation.";

export const PUBMED_EVIDENCE_NOTES: EvidenceNotes = {
  source_quality_note:
    "Phase 7 retrieved PubMed metadata and abstracts where available. Conservative automated appraisal was applied; this is not final evidence grading.",
  citation_status: "abstracts_retrieved_not_fully_appraised",
  next_step_for_real_evidence:
    "Perform full critical appraisal, study design confirmation, outcome extraction, and claim substantiation review.",
  appraisal_note:
    "Phase 7 performs skeptical automated relevance/appraisal only. Mention of magnesium or cortisol in a paper does not mean the intervention was tested or substantiates the claim.",
  watchlist_note: WATCHLIST_NOTE,
  real_evidence_fields_needed: [
    "study_design",
    "sample_size",
    "population",
    "outcomes",
    "effect_summary",
    "claim_alignment",
    "alignment_confidence",
    "study_limitations",
    "regulatory_context",
  ],
};

export const EVIDENCE_NOTES: EvidenceNotes = {
  source_quality_note:
    "These are structured POC evidence objects, not real citations.",
  citation_status: "placeholder",
  next_step_for_real_evidence:
    "Replace evidence stubs with retrieved sources from PubMed, Cochrane, clinical guidelines, or curated evidence databases.",
  watchlist_note: WATCHLIST_NOTE,
  real_evidence_fields_needed: [
    "pmid",
    "doi",
    "journal",
    "publication_date",
    "study_design",
    "sample_size",
    "population",
    "outcomes",
    "effect_summary",
    "claim_alignment",
    "alignment_confidence",
    "study_limitations",
    "regulatory_context",
    "jurisdiction",
    "source_rank",
  ],
};

const STUB_BASE_URL = "https://example.com/poc-evidence-stub";

const BASE_POC_LIMITATIONS = [
  "POC placeholder — not a real citation",
  "No linked pmid or doi",
  "Not retrieved from PubMed, Cochrane, or curated databases",
];

type StubFields = Omit<
  EvidenceSource,
  "source_id" | "source_type" | "url" | "source_rank"
>;

function placeholderMeta(journal: string | null = null): EvidenceSourceMeta {
  return {
    pmid: null,
    doi: null,
    journal,
    publication_date: null,
    citation: POC_CITATION,
  };
}

function buildAnalysis(
  outcomes: string[],
  effect_summary: string,
  claim_alignment: ClaimAlignment,
  relevance_score: number,
  alignment_confidence: number
): EvidenceSourceAnalysis {
  return {
    outcomes,
    effect_summary,
    claim_alignment,
    alignment_confidence,
    relevance_score,
  };
}

function stub(
  claimType: ClaimType,
  suffix: string,
  source: StubFields
): EvidenceSource {
  return {
    source_id: `stub-${claimType}-${suffix}`,
    source_type: "evidence_stub",
    source_rank: 1,
    url: `${STUB_BASE_URL}/${claimType}/${suffix}`,
    ...source,
  };
}

const EVIDENCE_STUBS: Record<ClaimType, EvidenceSource[]> = {
  detox: [
    stub("detox", "001", {
      title: "POC stub: detoxification claim substantiation",
      publication_year: 2026,
      evidence_level: "background",
      relevance_to_claim: "indirect",
      supports_claim: "no",
      summary:
        "Claims about removing toxins from the body require specific substantiation. Safer wording should focus on refreshment, relaxation, or how guests may feel rather than measurable detoxification.",
      meta: placeholderMeta("POC Regulatory Review (placeholder)"),
      methodology: {
        study_design: "background",
        sample_size: null,
        population: "General wellness marketing context (POC stub)",
        duration: null,
      },
      analysis: buildAnalysis(
        ["toxin elimination", "subjective refreshment"],
        "No stub evidence supports measurable body detoxification from spa or wellness treatments.",
        "contradicts",
        0.35,
        0.88
      ),
      study_limitations: [
        ...BASE_POC_LIMITATIONS,
        "No clinical biomarker data for toxin elimination",
      ],
      regulatory_flags: [
        {
          flag: "detox_claim",
          severity: "high",
          note: "Detoxification claims imply measurable physiological effects and are high-scrutiny.",
        },
        {
          flag: "needs_substantiation",
          severity: "critical",
          note: "Replace with real evidence or soften to experiential refreshment language.",
        },
      ],
      regulatory_context: [
        {
          jurisdiction: "US",
          framework: "FTC",
          risk_note:
            "Detox claims require competent and reliable scientific evidence under FTC substantiation standards.",
          severity: "high",
        },
        {
          jurisdiction: "GLOBAL",
          framework: "General marketing substantiation",
          risk_note:
            "Claims implying toxin removal from the body are high-scrutiny in wellness marketing.",
          severity: "high",
        },
      ],
    }),
  ],
  immunity: [
    stub("immunity", "001", {
      title: "POC stub: immune-boosting claim review",
      publication_year: 2026,
      evidence_level: "background",
      relevance_to_claim: "indirect",
      supports_claim: "unclear",
      summary:
        "Immune-boosting claims are physiological health claims and need strong substantiation. Wellness treatments rarely support direct immunity enhancement without condition-specific evidence.",
      meta: placeholderMeta("POC Immunology Context (placeholder)"),
      methodology: {
        study_design: "background",
        sample_size: null,
        population: "Wellness treatment recipients (POC stub)",
        duration: null,
      },
      analysis: buildAnalysis(
        ["immune function", "general wellbeing"],
        "Stub review finds insufficient support for direct immune-boosting claims from generic wellness treatments.",
        "insufficient",
        0.4,
        0.62
      ),
      study_limitations: [
        ...BASE_POC_LIMITATIONS,
        "No immune biomarker or clinical outcome data",
      ],
      regulatory_flags: [
        {
          flag: "immune_claim",
          severity: "medium",
          note: "Immunity claims may be treated as physiological health claims.",
        },
      ],
      regulatory_context: [
        {
          jurisdiction: "US",
          framework: "FTC",
          risk_note:
            "Immune-boosting claims may be scrutinized as health-benefit claims requiring substantiation.",
          severity: "medium",
        },
        {
          jurisdiction: "EU",
          framework: "EFSA",
          risk_note:
            "Unauthorized health claims relating to the immune system require authorized wording.",
          severity: "medium",
        },
      ],
    }),
  ],
  inflammation: [
    stub("inflammation", "001", {
      title: "POC stub: anti-inflammatory claim review",
      publication_year: 2026,
      evidence_level: "observational",
      relevance_to_claim: "indirect",
      supports_claim: "mixed",
      summary:
        "Inflammation claims imply measurable biological effects. Without biomarker or clinical evidence tied to the specific treatment, wording should remain cautious and experiential.",
      meta: placeholderMeta("POC Clinical Context (placeholder)"),
      methodology: {
        study_design: "observational",
        sample_size: null,
        population: "Adults receiving wellness treatments (POC stub)",
        duration: "Not applicable (POC stub)",
      },
      analysis: buildAnalysis(
        ["inflammatory markers", "subjective comfort"],
        "Some wellness contexts show mixed indirect associations, but stub data does not confirm anti-inflammatory effects for this claim.",
        "mixed",
        0.45,
        0.55
      ),
      study_limitations: [
        ...BASE_POC_LIMITATIONS,
        "No inflammatory biomarker measurements in stub data",
      ],
      regulatory_flags: [
        {
          flag: "inflammation_claim",
          severity: "medium",
          note: "Anti-inflammatory wording implies measurable biological change.",
        },
      ],
      regulatory_context: [
        {
          jurisdiction: "US",
          framework: "FDA",
          risk_note:
            "Anti-inflammatory claims may imply drug-like effects if tied to disease treatment.",
          severity: "medium",
        },
        {
          jurisdiction: "GLOBAL",
          framework: "General marketing substantiation",
          risk_note:
            "Inflammation claims should be supported by condition-specific evidence.",
          severity: "medium",
        },
      ],
    }),
  ],
  cortisol_hormone: [
    stub("cortisol_hormone", "001", {
      title: "POC stub: hormone regulation claim review",
      publication_year: 2026,
      evidence_level: "observational",
      relevance_to_claim: "indirect",
      supports_claim: "unclear",
      summary:
        "Claims about cortisol or hormone regulation imply measurable physiological change. Safer wording focuses on relaxation and general wellbeing unless specific evidence is available.",
      meta: placeholderMeta("POC Endocrine Context (placeholder)"),
      methodology: {
        study_design: "observational",
        sample_size: null,
        population: "Adults under stress or seeking relaxation (POC stub)",
        duration: "Single session to multi-week (POC stub)",
      },
      analysis: buildAnalysis(
        ["cortisol levels", "subjective stress", "relaxation"],
        "Stub review finds unclear support for direct hormone regulation claims; relaxation associations are more defensible.",
        "insufficient",
        0.42,
        0.58
      ),
      study_limitations: [
        ...BASE_POC_LIMITATIONS,
        "No hormone assay data in stub record",
      ],
      regulatory_flags: [
        {
          flag: "physiological_claim",
          severity: "medium",
          note: "Hormone regulation claims require specific substantiation.",
        },
      ],
      regulatory_context: [
        {
          jurisdiction: "US",
          framework: "FTC",
          risk_note:
            "Claims about regulating cortisol or hormones imply measurable physiological effects.",
          severity: "medium",
        },
        {
          jurisdiction: "UK",
          framework: "ASA",
          risk_note:
            "Stress-hormone claims need robust evidence and should avoid implying medical outcomes.",
          severity: "medium",
        },
      ],
    }),
  ],
  anti_aging: [
    stub("anti_aging", "001", {
      title: "POC stub: biological age reversal claim review",
      publication_year: 2026,
      evidence_level: "background",
      relevance_to_claim: "indirect",
      supports_claim: "no",
      summary:
        "Reversing aging or biological age is a high-risk claim. Safer alternatives describe appearance, vitality, or a refreshed feeling rather than measurable age reversal.",
      meta: placeholderMeta("POC Longevity Context (placeholder)"),
      methodology: {
        study_design: "background",
        sample_size: null,
        population: "Wellness program participants (POC stub)",
        duration: null,
      },
      analysis: buildAnalysis(
        ["biological age", "subjective vitality", "appearance"],
        "Stub review does not support claims of reversing biological age from wellness treatments.",
        "contradicts",
        0.3,
        0.9
      ),
      study_limitations: [
        ...BASE_POC_LIMITATIONS,
        "No biological age or epigenetic clock data",
      ],
      regulatory_flags: [
        {
          flag: "anti_aging_claim",
          severity: "high",
          note: "Biological age reversal is a high-scrutiny claim category.",
        },
        {
          flag: "needs_substantiation",
          severity: "critical",
          note: "Soften to appearance, vitality, or refreshed feeling language.",
        },
      ],
      regulatory_context: [
        {
          jurisdiction: "US",
          framework: "FTC",
          risk_note:
            "Anti-aging and biological-age reversal claims require strong substantiation.",
          severity: "high",
        },
        {
          jurisdiction: "EU",
          framework: "EFSA",
          risk_note:
            "Age-reversal health claims are unlikely to meet authorized claim standards.",
          severity: "high",
        },
      ],
    }),
  ],
  pain_relief: [
    stub("pain_relief", "001", {
      title: "POC stub: pain relief claim review",
      publication_year: 2026,
      evidence_level: "clinical_trial",
      relevance_to_claim: "indirect",
      supports_claim: "mixed",
      summary:
        "Pain relief claims can imply therapeutic benefit and may require human or legal review. Comfort and ease language is generally safer without condition-specific evidence.",
      meta: placeholderMeta("POC Pain Research Context (placeholder)"),
      methodology: {
        study_design: "randomized_controlled_trial",
        sample_size: null,
        population: "Adults reporting discomfort (POC stub)",
        duration: "Variable by condition (POC stub)",
      },
      analysis: buildAnalysis(
        ["pain intensity", "comfort", "functional ease"],
        "Some interventions show mixed comfort benefits, but stub data does not substantiate therapeutic pain relief for this claim.",
        "mixed",
        0.5,
        0.52
      ),
      study_limitations: [
        ...BASE_POC_LIMITATIONS,
        "No condition-specific pain outcome data",
        "Sample size not reported in stub",
      ],
      regulatory_flags: [
        {
          flag: "pain_claim",
          severity: "medium",
          note: "Pain relief may imply therapeutic benefit requiring review.",
        },
        {
          flag: "human_review_recommended",
          severity: "medium",
          note: "Consider legal or clinical review before publishing pain-related claims.",
        },
      ],
      regulatory_context: [
        {
          jurisdiction: "US",
          framework: "FDA",
          risk_note:
            "Pain relief claims may imply therapeutic benefit and blur into medical device or drug claims.",
          severity: "medium",
        },
        {
          jurisdiction: "AU",
          framework: "TGA",
          risk_note:
            "Therapeutic pain claims may require TGA assessment depending on product context.",
          severity: "medium",
        },
      ],
    }),
  ],
  sleep: [
    stub("sleep", "001", {
      title: "POC stub: sleep support claim review",
      publication_year: 2026,
      evidence_level: "observational",
      relevance_to_claim: "indirect",
      supports_claim: "mixed",
      summary:
        "Sleep-support language is safer when framed around relaxation and bedtime routine. Claims to treat insomnia or sleep disorders need clinical substantiation.",
      meta: placeholderMeta("POC Sleep Research Context (placeholder)"),
      methodology: {
        study_design: "observational",
        sample_size: null,
        population: "Adults seeking better rest (POC stub)",
        duration: "1–4 weeks (POC stub)",
      },
      analysis: buildAnalysis(
        ["sleep quality", "relaxation", "bedtime routine adherence"],
        "Relaxation-focused wording may align with sleep-support contexts, but treating sleep disorders is not supported by this stub.",
        "mixed",
        0.48,
        0.5
      ),
      study_limitations: [
        ...BASE_POC_LIMITATIONS,
        "No polysomnography or validated sleep scale data",
      ],
      regulatory_flags: [
        {
          flag: "sleep_claim",
          severity: "medium",
          note: "Distinguish relaxation support from insomnia or disorder treatment claims.",
        },
      ],
      regulatory_context: [
        {
          jurisdiction: "US",
          framework: "FDA",
          risk_note:
            "Claims to treat insomnia or sleep disorders may be regulated as therapeutic claims.",
          severity: "medium",
        },
        {
          jurisdiction: "GLOBAL",
          framework: "General marketing substantiation",
          risk_note:
            "Sleep-support language should avoid implying treatment of sleep disorders.",
          severity: "low",
        },
      ],
    }),
  ],
  stress_relaxation: [
    stub("stress_relaxation", "001", {
      title: "POC stub: experiential relaxation wording",
      publication_year: 2026,
      evidence_level: "background",
      relevance_to_claim: "background",
      supports_claim: "yes",
      summary:
        "Experiential relaxation wording is generally lower risk than claims about stress hormones or biomarkers. Subjective feeling language is appropriate when health outcomes are not implied.",
      meta: placeholderMeta("POC Wellness Language Guide (placeholder)"),
      methodology: {
        study_design: "background",
        sample_size: null,
        population: "Spa and wellness guests (POC stub)",
        duration: null,
      },
      analysis: buildAnalysis(
        ["subjective relaxation", "restored feeling"],
        "Stub review supports cautious experiential relaxation language when biomarker or therapeutic claims are avoided.",
        "background",
        0.75,
        0.85
      ),
      study_limitations: [
        ...BASE_POC_LIMITATIONS,
        "Background guidance only; not a clinical study",
      ],
      regulatory_flags: [
        {
          flag: "wording_boundary",
          severity: "low",
          note: "Avoid upgrading to stress-hormone or therapeutic outcome claims.",
        },
      ],
      regulatory_context: [
        {
          jurisdiction: "GLOBAL",
          framework: "General marketing substantiation",
          risk_note:
            "Experiential relaxation language is lower risk when stress biomarkers or therapeutic outcomes are not implied.",
          severity: "low",
        },
        {
          jurisdiction: "UK",
          framework: "ASA",
          risk_note:
            "Subjective feeling claims are generally acceptable if not misleading.",
          severity: "low",
        },
      ],
    }),
  ],
  experiential_wellness: [
    stub("experiential_wellness", "001", {
      title: "POC stub: subjective wellness experience wording",
      publication_year: 2026,
      evidence_level: "background",
      relevance_to_claim: "background",
      supports_claim: "yes",
      summary:
        "Subjective experiential language describing how guests may feel is generally lower risk when it avoids measurable health outcomes or disease-related claims.",
      meta: placeholderMeta("POC Experiential Marketing Guide (placeholder)"),
      methodology: {
        study_design: "background",
        sample_size: null,
        population: "General wellness guests (POC stub)",
        duration: null,
      },
      analysis: buildAnalysis(
        ["subjective wellbeing", "sense of calm", "feeling restored"],
        "Stub review supports low-risk experiential phrasing focused on how guests may feel.",
        "background",
        0.82,
        0.92
      ),
      study_limitations: [
        ...BASE_POC_LIMITATIONS,
        "Background guidance only; not a clinical study",
      ],
      regulatory_flags: [],
      regulatory_context: [
        {
          jurisdiction: "GLOBAL",
          framework: "General marketing substantiation",
          risk_note:
            "Subjective experiential language is generally lower risk when therapeutic outcomes are not implied.",
          severity: "low",
        },
        {
          jurisdiction: "TH",
          framework: "Thai FDA",
          risk_note:
            "Wellness experience claims should avoid unauthorized health or therapeutic claims.",
          severity: "low",
        },
      ],
    }),
  ],
  general: [
    stub("general", "001", {
      title: "POC stub: general claim wording review",
      publication_year: 2026,
      evidence_level: "unknown",
      relevance_to_claim: "background",
      supports_claim: "unclear",
      summary:
        "When no specific high-risk pattern is detected, keep claims experiential and avoid implying measurable health outcomes without substantiation.",
      meta: placeholderMeta(null),
      methodology: {
        study_design: "unknown",
        sample_size: null,
        population: null,
        duration: null,
      },
      analysis: buildAnalysis(
        ["claim clarity", "regulatory risk"],
        "Stub review recommends cautious experiential wording pending real evidence retrieval.",
        "insufficient",
        0.4,
        0.45
      ),
      study_limitations: [...BASE_POC_LIMITATIONS],
      regulatory_flags: [
        {
          flag: "unclassified_claim",
          severity: "medium",
          note: "Review wording manually when no specific pattern is detected.",
        },
      ],
      regulatory_context: [
        {
          jurisdiction: "GLOBAL",
          framework: "General marketing substantiation",
          risk_note:
            "Unclassified claims should be reviewed for implied health outcomes.",
          severity: "medium",
        },
      ],
    }),
  ],
};

export function resolveMaxSources(maxSources?: number): number {
  if (typeof maxSources !== "number" || !Number.isFinite(maxSources)) {
    return DEFAULT_MAX_SOURCES;
  }

  const rounded = Math.floor(maxSources);
  if (rounded < 1) {
    return DEFAULT_MAX_SOURCES;
  }

  return Math.min(rounded, HARD_MAX_SOURCES);
}

export function getEvidenceStubs(
  claimType: ClaimType,
  maxSources?: number
): EvidenceSource[] {
  const limit = resolveMaxSources(maxSources);

  return EVIDENCE_STUBS[claimType].slice(0, limit).map((source, index) => ({
    ...source,
    source_rank: index + 1,
  }));
}
