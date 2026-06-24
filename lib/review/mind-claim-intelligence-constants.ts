export const MIND_CLAIM_INTELLIGENCE_PHASE = "45" as const;

export const SOURCE_INTAKE_SOURCE_TYPES = ["spa_wellness_copy"] as const;
export type SourceIntakeSourceType = (typeof SOURCE_INTAKE_SOURCE_TYPES)[number];

export const MIND_CLAIM_JOB_STATUSES = [
  "draft",
  "pending_approval",
  "approved",
  "sent",
  "response_fetched",
  "parsed",
  "parse_failed",
  "failed",
  "cancelled",
] as const;
export type MindClaimJobStatus = (typeof MIND_CLAIM_JOB_STATUSES)[number];

export const MIND_CLAIM_JOB_REVIEW_STATUSES = ["pending", "approved", "rejected"] as const;
export type MindClaimJobReviewStatus = (typeof MIND_CLAIM_JOB_REVIEW_STATUSES)[number];

export const MIND_CLAIM_JOB_DESTINATIONS = ["hellominds"] as const;
export type MindClaimJobDestination = (typeof MIND_CLAIM_JOB_DESTINATIONS)[number];

export const MIND_CLAIM_EXTRACTION_PROMPT_VERSION = "mind_claim_extraction_v1" as const;
export const MIND_CLAIM_EXTRACTION_CONTRACT_VERSION = "mind_claim_extraction_json_v1" as const;

export const MIND_CLAIM_RISK_BRIEF_PROMPT_VERSION = "mind_claim_risk_brief_v1" as const;
export const MIND_CLAIM_RISK_BRIEF_CONTRACT_VERSION = "mind_claim_risk_brief_json_v1" as const;

export const CANDIDATE_CLAIM_REVIEW_STATUSES = ["pending", "accepted", "rejected", "edited"] as const;
export type CandidateClaimReviewStatus = (typeof CANDIDATE_CLAIM_REVIEW_STATUSES)[number];

export const MIND_CLAIM_TYPES = [
  "experiential",
  "structure_function",
  "physiological",
  "disease_related",
  "general_wellness",
  "other",
] as const;
export type MindClaimType = (typeof MIND_CLAIM_TYPES)[number];

export const MIND_SENSITIVITY_LEVELS = ["low", "medium", "high"] as const;
export type MindSensitivityLevel = (typeof MIND_SENSITIVITY_LEVELS)[number];

export const MIND_SUGGESTED_REVIEW_STATUSES = [
  "accept",
  "edit",
  "reject",
  "operator_review",
] as const;

export const MIND_EVIDENCE_POSTURES = [
  "supported",
  "partially_supported",
  "weak_indirect",
  "unsupported",
  "contradicted",
  "unclear",
] as const;

export const MIND_EVIDENCE_STRENGTHS = ["low", "moderate", "high"] as const;

export const MIND_OPERATOR_RECOMMENDATIONS = [
  "accept",
  "soften",
  "reject",
  "escalate",
  "needs_more_review",
] as const;

export const MIND_CLAIM_INTELLIGENCE_AUDIT_ENTITY_TYPES = [
  "source_intake_document",
  "mind_claim_extraction_job",
  "candidate_claim",
  "mind_claim_risk_brief_job",
  "mind_claim_risk_brief",
] as const;

export type MindClaimIntelligenceAuditEntityType =
  (typeof MIND_CLAIM_INTELLIGENCE_AUDIT_ENTITY_TYPES)[number];

export function isSupportedSourceIntakeSourceType(value: string): value is SourceIntakeSourceType {
  return (SOURCE_INTAKE_SOURCE_TYPES as readonly string[]).includes(value);
}

export function isSupportedMindClaimJobStatus(value: string): value is MindClaimJobStatus {
  return (MIND_CLAIM_JOB_STATUSES as readonly string[]).includes(value);
}

export function isSupportedMindClaimJobReviewStatus(
  value: string
): value is MindClaimJobReviewStatus {
  return (MIND_CLAIM_JOB_REVIEW_STATUSES as readonly string[]).includes(value);
}

export function isSupportedCandidateClaimReviewStatus(
  value: string
): value is CandidateClaimReviewStatus {
  return (CANDIDATE_CLAIM_REVIEW_STATUSES as readonly string[]).includes(value);
}
