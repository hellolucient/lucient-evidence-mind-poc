export const REVIEW_ITEM_DECISION_TYPES = [
  "monitor_only",
  "wording_change_recommended",
  "escalate",
  "dismiss",
  "needs_more_review",
] as const;

export type ReviewItemDecisionType = (typeof REVIEW_ITEM_DECISION_TYPES)[number];

export const REVIEW_QUEUE_NOTE_DECISION_OPTIONS = [...REVIEW_ITEM_DECISION_TYPES] as ReviewItemDecisionType[];

export function isSupportedReviewItemDecisionType(
  value: string
): value is ReviewItemDecisionType {
  return REVIEW_ITEM_DECISION_TYPES.includes(value as ReviewItemDecisionType);
}
