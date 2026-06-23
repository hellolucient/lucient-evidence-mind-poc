export const WELLNESS_CLAIM_STATUSES = ["active", "archived"] as const;

export type WellnessClaimStatus = (typeof WELLNESS_CLAIM_STATUSES)[number];

export const WELLNESS_CLAIM_REVIEW_STATUSES = ["accepted", "needs_edit", "rejected"] as const;

export type WellnessClaimReviewStatus = (typeof WELLNESS_CLAIM_REVIEW_STATUSES)[number];

export const WELLNESS_CLAIM_RESEARCH_STATUSES = ["not_started", "queued", "completed"] as const;

export type WellnessClaimResearchStatus = (typeof WELLNESS_CLAIM_RESEARCH_STATUSES)[number];

export const DEFAULT_WELLNESS_CLAIM_STATUS: WellnessClaimStatus = "active";

export const DEFAULT_WELLNESS_CLAIM_REVIEW_STATUS: WellnessClaimReviewStatus = "accepted";

export const DEFAULT_WELLNESS_CLAIM_RESEARCH_STATUS: WellnessClaimResearchStatus = "not_started";

export function isSupportedWellnessClaimStatus(
  value: string | null | undefined
): value is WellnessClaimStatus {
  if (!value) {
    return false;
  }

  return WELLNESS_CLAIM_STATUSES.includes(value as WellnessClaimStatus);
}

export function isSupportedWellnessClaimReviewStatus(
  value: string | null | undefined
): value is WellnessClaimReviewStatus {
  if (!value) {
    return false;
  }

  return WELLNESS_CLAIM_REVIEW_STATUSES.includes(value as WellnessClaimReviewStatus);
}

export function isSupportedWellnessClaimResearchStatus(
  value: string | null | undefined
): value is WellnessClaimResearchStatus {
  if (!value) {
    return false;
  }

  return WELLNESS_CLAIM_RESEARCH_STATUSES.includes(value as WellnessClaimResearchStatus);
}
