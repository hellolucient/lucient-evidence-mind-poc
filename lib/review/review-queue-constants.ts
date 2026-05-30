import { REVIEW_ITEM_STATUSES } from "@/lib/watch/evidence-review-item-store";
import type { ReviewItemStatus } from "@/lib/watch/evidence-review-handoff";

export const REVIEW_QUEUE_STATUS_OPTIONS = [...REVIEW_ITEM_STATUSES] as ReviewItemStatus[];

export const REVIEW_QUEUE_PRIVATE_FIELDS = [
  "raw_payload",
  "claim_text",
  "human_review_required",
  "client_claim_re_review_required",
] as const;

export const REVIEW_QUEUE_DETAIL_FIELDS = [
  "id",
  "status",
  "signal",
  "severity",
  "workspace_id",
  "client_claim_id",
  "claim_family",
  "evidence_alert_id",
  "watch_run_id",
  "summary",
  "created_at",
  "updated_at",
] as const;
