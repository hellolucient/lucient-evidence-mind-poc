import type { ClaimType } from "./claim-classifier";

export type EvidenceLevel =
  | "systematic_review"
  | "clinical_trial"
  | "observational"
  | "guideline"
  | "background"
  | "unknown";

export type RelevanceToClaim = "direct" | "indirect" | "background";
export type SupportsClaim = "yes" | "no" | "mixed" | "unclear";

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
};

export type EvidenceNotes = {
  source_quality_note: string;
  citation_status: "placeholder";
  next_step_for_real_evidence: string;
};

export const EVIDENCE_NOTES: EvidenceNotes = {
  source_quality_note: "These are POC evidence stubs, not real citations.",
  citation_status: "placeholder",
  next_step_for_real_evidence:
    "Replace evidence stubs with retrieved sources from PubMed, Cochrane, clinical guidelines, or curated evidence databases.",
};

const STUB_BASE_URL = "https://example.com/poc-evidence-stub";

function stub(
  claimType: ClaimType,
  suffix: string,
  source: Omit<EvidenceSource, "source_id" | "source_type" | "url">
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
    }),
  ],
};

export function getEvidenceStubs(claimType: ClaimType): EvidenceSource[] {
  return EVIDENCE_STUBS[claimType];
}
