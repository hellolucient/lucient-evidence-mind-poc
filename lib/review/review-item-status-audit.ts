import type { ReviewQueueAccessContext } from "@/lib/operator-auth";
import { sanitizeOperatorEmail } from "@/lib/review/review-queue-auth-status";
import {
  insertReviewItemAuditEvent,
  type ReviewItemAuditAccessMode,
  type ReviewItemAuditActorType,
} from "@/lib/review/evidence-review-item-audit-store";

export function mapReviewQueueAccessToAuditFields(access: ReviewQueueAccessContext): {
  access_mode: ReviewItemAuditAccessMode;
  actor_type: ReviewItemAuditActorType;
} {
  if (access.mode === "break_glass") {
    return {
      access_mode: "break_glass",
      actor_type: "break_glass",
    };
  }

  return {
    access_mode: "supabase_operator",
    actor_type: "supabase_operator",
  };
}

export async function recordReviewItemStatusChangeAudit(options: {
  reviewItemId: string;
  workspaceId: string;
  oldStatus: string;
  newStatus: string;
  access: ReviewQueueAccessContext;
  operatorEmail?: string | null;
}): Promise<void> {
  const auditFields = mapReviewQueueAccessToAuditFields(options.access);
  const actorEmail =
    auditFields.access_mode === "supabase_operator"
      ? sanitizeOperatorEmail(options.operatorEmail)
      : null;

  await insertReviewItemAuditEvent({
    workspace_id: options.workspaceId,
    review_item_id: options.reviewItemId,
    event_type: "status_changed",
    old_status: options.oldStatus,
    new_status: options.newStatus,
    actor_type: auditFields.actor_type,
    actor_email: actorEmail,
    access_mode: auditFields.access_mode,
    metadata: null,
  });
}
