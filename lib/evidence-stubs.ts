import type { ClaimType } from "./claim-classifier";

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
  relevance_score: number;
};

export type RegulatoryFlag = {
  flag: string;
  severity: RegulatorySeverity;
  note: string;
};

export type EvidenceSource = {
  source_id: string;
  source_type: "evidence_stub";
  title: string;
  url: string;
  publication_year: number;
  evidence_level: EvidenceLevel;
  relevance_to_claim: RelevanceToClaim;
  supports_claim: SupportsClaim;
  summary: string;
  meta: EvidenceSourceMeta;
  methodology: EvidenceSourceMethodology;
  analysis: EvidenceSourceAnalysis;
  regulatory_flags: RegulatoryFlag[];
};

export type EvidenceNotes = {
  source_quality_note: string;
  citation_status: "placeholder";
  next_step_for_real_evidence: string;
  real_evidence_fields_needed: string[];
};

const POC_CITATION = "POC placeholder, not a real citation.";

export const EVIDENCE_NOTES: EvidenceNotes = {
  source_quality_note:
    "These are structured POC evidence objects, not real citations.",
  citation_status: "placeholder",
  next_step_for_real_evidence:
    "Replace evidence stubs with retrieved sources from PubMed, Cochrane, clinical guidelines, or curated evidence databases.",
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
  ],
};

const STUB_BASE_URL = "https://example.com/poc-evidence-stub";

type StubFields = Omit<EvidenceSource, "source_id" | "source_type" | "url">;

function placeholderMeta(journal: string | null = null): EvidenceSourceMeta {
  return {
    pmid: null,
    doi: null,
    journal,
    publication_date: null,
    citation: POC_CITATION,
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
      analysis: {
        outcomes: ["toxin elimination", "subjective refreshment"],
        effect_summary:
          "No stub evidence supports measurable body detoxification from spa or wellness treatments.",
        claim_alignment: "contradicts",
        relevance_score: 0.35,
      },
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
      analysis: {
        outcomes: ["immune function", "general wellbeing"],
        effect_summary:
          "Stub review finds insufficient support for direct immune-boosting claims from generic wellness treatments.",
        claim_alignment: "insufficient",
        relevance_score: 0.4,
      },
      regulatory_flags: [
        {
          flag: "immune_claim",
          severity: "medium",
          note: "Immunity claims may be treated as physiological health claims.",
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
      analysis: {
        outcomes: ["inflammatory markers", "subjective comfort"],
        effect_summary:
          "Some wellness contexts show mixed indirect associations, but stub data does not confirm anti-inflammatory effects for this claim.",
        claim_alignment: "mixed",
        relevance_score: 0.45,
      },
      regulatory_flags: [
        {
          flag: "inflammation_claim",
          severity: "medium",
          note: "Anti-inflammatory wording implies measurable biological change.",
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
      analysis: {
        outcomes: ["cortisol levels", "subjective stress", "relaxation"],
        effect_summary:
          "Stub review finds unclear support for direct hormone regulation claims; relaxation associations are more defensible.",
        claim_alignment: "insufficient",
        relevance_score: 0.42,
      },
      regulatory_flags: [
        {
          flag: "physiological_claim",
          severity: "medium",
          note: "Hormone regulation claims require specific substantiation.",
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
      analysis: {
        outcomes: ["biological age", "subjective vitality", "appearance"],
        effect_summary:
          "Stub review does not support claims of reversing biological age from wellness treatments.",
        claim_alignment: "contradicts",
        relevance_score: 0.3,
      },
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
      analysis: {
        outcomes: ["pain intensity", "comfort", "functional ease"],
        effect_summary:
          "Some interventions show mixed comfort benefits, but stub data does not substantiate therapeutic pain relief for this claim.",
        claim_alignment: "mixed",
        relevance_score: 0.5,
      },
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
      analysis: {
        outcomes: ["sleep quality", "relaxation", "bedtime routine adherence"],
        effect_summary:
          "Relaxation-focused wording may align with sleep-support contexts, but treating sleep disorders is not supported by this stub.",
        claim_alignment: "mixed",
        relevance_score: 0.48,
      },
      regulatory_flags: [
        {
          flag: "sleep_claim",
          severity: "medium",
          note: "Distinguish relaxation support from insomnia or disorder treatment claims.",
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
      analysis: {
        outcomes: ["subjective relaxation", "restored feeling"],
        effect_summary:
          "Stub review supports cautious experiential relaxation language when biomarker or therapeutic claims are avoided.",
        claim_alignment: "background",
        relevance_score: 0.75,
      },
      regulatory_flags: [
        {
          flag: "wording_boundary",
          severity: "low",
          note: "Avoid upgrading to stress-hormone or therapeutic outcome claims.",
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
      analysis: {
        outcomes: ["subjective wellbeing", "sense of calm", "feeling restored"],
        effect_summary:
          "Stub review supports low-risk experiential phrasing focused on how guests may feel.",
        claim_alignment: "background",
        relevance_score: 0.82,
      },
      regulatory_flags: [],
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
      analysis: {
        outcomes: ["claim clarity", "regulatory risk"],
        effect_summary:
          "Stub review recommends cautious experiential wording pending real evidence retrieval.",
        claim_alignment: "insufficient",
        relevance_score: 0.4,
      },
      regulatory_flags: [
        {
          flag: "unclassified_claim",
          severity: "medium",
          note: "Review wording manually when no specific pattern is detected.",
        },
      ],
    }),
  ],
};

export function getEvidenceStubs(claimType: ClaimType): EvidenceSource[] {
  return EVIDENCE_STUBS[claimType];
}
