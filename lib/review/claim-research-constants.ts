export const CLAIM_RESEARCH_RUN_STATUSES = ["completed", "failed"] as const;

export type ClaimResearchRunStatus = (typeof CLAIM_RESEARCH_RUN_STATUSES)[number];

export const CLAIM_RESEARCH_MODES = [
  "controlled_pubmed_v1",
  "pubmed_live_v1",
  "mock_evidence_v1",
  "existing_engine_v1",
] as const;

export type ClaimResearchMode = (typeof CLAIM_RESEARCH_MODES)[number];

export const CLAIM_EVIDENCE_POSTURES = [
  "supportive",
  "mixed",
  "weak",
  "insufficient",
  "not_found",
] as const;

export type ClaimEvidencePosture = (typeof CLAIM_EVIDENCE_POSTURES)[number];

export const CLAIM_EVIDENCE_STRENGTHS = ["high", "moderate", "low", "very_low"] as const;

export type ClaimEvidenceStrength = (typeof CLAIM_EVIDENCE_STRENGTHS)[number];

export const CLAIM_RESEARCH_RISK_LEVELS = ["low", "medium", "high"] as const;

export type ClaimResearchRiskLevel = (typeof CLAIM_RESEARCH_RISK_LEVELS)[number];

export const CLAIM_CITATION_EVIDENCE_TYPES = [
  "systematic_review",
  "rct",
  "clinical_trial",
  "review",
  "observational",
  "animal",
  "in_vitro",
  "unknown",
] as const;

export type ClaimCitationEvidenceType = (typeof CLAIM_CITATION_EVIDENCE_TYPES)[number];

export const CLAIM_CITATION_RELEVANCE_LEVELS = ["high", "medium", "low"] as const;

export type ClaimCitationRelevance = (typeof CLAIM_CITATION_RELEVANCE_LEVELS)[number];

export const DEFAULT_CLAIM_RESEARCH_MODE: ClaimResearchMode = "mock_evidence_v1";

export function isSupportedClaimResearchRunStatus(
  value: string | null | undefined
): value is ClaimResearchRunStatus {
  if (!value) {
    return false;
  }

  return CLAIM_RESEARCH_RUN_STATUSES.includes(value as ClaimResearchRunStatus);
}

export function isSupportedClaimResearchMode(
  value: string | null | undefined
): value is ClaimResearchMode {
  if (!value) {
    return false;
  }

  return CLAIM_RESEARCH_MODES.includes(value as ClaimResearchMode);
}

export function isSupportedClaimEvidencePosture(
  value: string | null | undefined
): value is ClaimEvidencePosture {
  if (!value) {
    return false;
  }

  return CLAIM_EVIDENCE_POSTURES.includes(value as ClaimEvidencePosture);
}

export function isSupportedClaimEvidenceStrength(
  value: string | null | undefined
): value is ClaimEvidenceStrength {
  if (!value) {
    return false;
  }

  return CLAIM_EVIDENCE_STRENGTHS.includes(value as ClaimEvidenceStrength);
}

export function isSupportedClaimResearchRiskLevel(
  value: string | null | undefined
): value is ClaimResearchRiskLevel {
  if (!value) {
    return false;
  }

  return CLAIM_RESEARCH_RISK_LEVELS.includes(value as ClaimResearchRiskLevel);
}
