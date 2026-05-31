export const EXTERNAL_MIND_HANDOFF_TYPES = [
  "digest_summary",
  "evidence_change",
  "review_queue_summary",
] as const;

export type ExternalMindHandoffType = (typeof EXTERNAL_MIND_HANDOFF_TYPES)[number];

export const EXTERNAL_MIND_HANDOFF_DESTINATIONS = [
  "animoca_mind",
  "internal_export",
  "test_sink",
] as const;

export type ExternalMindHandoffDestination = (typeof EXTERNAL_MIND_HANDOFF_DESTINATIONS)[number];

export const EXTERNAL_MIND_HANDOFF_STATUSES = [
  "draft",
  "ready",
  "sent",
  "failed",
  "archived",
] as const;

export type ExternalMindHandoffStatus = (typeof EXTERNAL_MIND_HANDOFF_STATUSES)[number];

export const MIND_DIGEST_HANDOFF_PAYLOAD_VERSION = "mind_digest_payload_v1" as const;

export const DEFAULT_MIND_DIGEST_HANDOFF_TYPE: ExternalMindHandoffType = "digest_summary";
export const DEFAULT_MIND_DIGEST_HANDOFF_DESTINATION: ExternalMindHandoffDestination = "test_sink";

export const ACTIVE_EXTERNAL_MIND_HANDOFF_STATUSES: ExternalMindHandoffStatus[] = [
  "draft",
  "ready",
];

export const EXTERNAL_MIND_HANDOFF_REVIEW_STATUSES = [
  "pending_review",
  "approved",
  "rejected",
  "changes_requested",
] as const;

export type ExternalMindHandoffReviewStatus =
  (typeof EXTERNAL_MIND_HANDOFF_REVIEW_STATUSES)[number];

export const DEFAULT_EXTERNAL_MIND_HANDOFF_REVIEW_STATUS: ExternalMindHandoffReviewStatus =
  "pending_review";

export const EXTERNAL_MIND_HANDOFF_REVIEW_ACTOR_TYPES = [
  "supabase_operator",
  "break_glass",
  "system",
] as const;

export type ExternalMindHandoffReviewActorType =
  (typeof EXTERNAL_MIND_HANDOFF_REVIEW_ACTOR_TYPES)[number];

export function isSupportedExternalMindHandoffReviewStatus(
  value: string
): value is ExternalMindHandoffReviewStatus {
  return (EXTERNAL_MIND_HANDOFF_REVIEW_STATUSES as readonly string[]).includes(value);
}

export function isSupportedExternalMindHandoffReviewActorType(
  value: string
): value is ExternalMindHandoffReviewActorType {
  return (EXTERNAL_MIND_HANDOFF_REVIEW_ACTOR_TYPES as readonly string[]).includes(value);
}

export function isSupportedExternalMindHandoffType(
  value: string
): value is ExternalMindHandoffType {
  return (EXTERNAL_MIND_HANDOFF_TYPES as readonly string[]).includes(value);
}

export function isSupportedExternalMindHandoffDestination(
  value: string
): value is ExternalMindHandoffDestination {
  return (EXTERNAL_MIND_HANDOFF_DESTINATIONS as readonly string[]).includes(value);
}

export function isSupportedExternalMindHandoffStatus(
  value: string
): value is ExternalMindHandoffStatus {
  return (EXTERNAL_MIND_HANDOFF_STATUSES as readonly string[]).includes(value);
}
