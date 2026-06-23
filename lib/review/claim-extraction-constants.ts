export const CLAIM_SOURCE_TYPES = [
  "spa_menu",
  "treatment_description",
  "product_description",
  "website_copy",
  "brochure",
  "other",
] as const;

export type ClaimSourceType = (typeof CLAIM_SOURCE_TYPES)[number];

export const CLAIM_EXTRACTION_EXTRACTOR_TYPES = [
  "internal_llm_stub",
  "rule_based_v1",
  "manual_test",
] as const;

export type ClaimExtractionExtractorType = (typeof CLAIM_EXTRACTION_EXTRACTOR_TYPES)[number];

export const CLAIM_EXTRACTION_RUN_STATUSES = ["completed", "failed"] as const;

export type ClaimExtractionRunStatus = (typeof CLAIM_EXTRACTION_RUN_STATUSES)[number];

export const CANDIDATE_CLAIM_STRENGTHS = ["soft", "moderate", "strong"] as const;

export type CandidateClaimStrength = (typeof CANDIDATE_CLAIM_STRENGTHS)[number];

export const CANDIDATE_EVIDENCE_SENSITIVITIES = ["low", "medium", "high"] as const;

export type CandidateEvidenceSensitivity = (typeof CANDIDATE_EVIDENCE_SENSITIVITIES)[number];

export const CANDIDATE_CLAIM_STATUSES = ["candidate", "accepted", "rejected"] as const;

export type CandidateClaimStatus = (typeof CANDIDATE_CLAIM_STATUSES)[number];

export const DEFAULT_CLAIM_EXTRACTOR_TYPE: ClaimExtractionExtractorType = "rule_based_v1";

export function isSupportedClaimSourceType(value: string | null | undefined): value is ClaimSourceType {
  if (!value) {
    return false;
  }

  return CLAIM_SOURCE_TYPES.includes(value as ClaimSourceType);
}

export function isSupportedClaimExtractionExtractorType(
  value: string | null | undefined
): value is ClaimExtractionExtractorType {
  if (!value) {
    return false;
  }

  return CLAIM_EXTRACTION_EXTRACTOR_TYPES.includes(value as ClaimExtractionExtractorType);
}

export function isSupportedCandidateClaimStrength(
  value: string | null | undefined
): value is CandidateClaimStrength {
  if (!value) {
    return false;
  }

  return CANDIDATE_CLAIM_STRENGTHS.includes(value as CandidateClaimStrength);
}

export function isSupportedCandidateEvidenceSensitivity(
  value: string | null | undefined
): value is CandidateEvidenceSensitivity {
  if (!value) {
    return false;
  }

  return CANDIDATE_EVIDENCE_SENSITIVITIES.includes(value as CandidateEvidenceSensitivity);
}
