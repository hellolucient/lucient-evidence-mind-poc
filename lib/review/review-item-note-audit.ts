import type { ReviewQueueAccessContext } from "@/lib/operator-auth";
import { mapReviewQueueAccessToAuditFields } from "@/lib/review/review-item-status-audit";
import { sanitizeOperatorEmail } from "@/lib/review/review-queue-auth-status";
import { insertReviewItemAuditEvent } from "@/lib/review/evidence-review-item-audit-store";

export async function recordReviewItemNoteAddedAudit(options: {
  reviewItemId: string;
  workspaceId: string;
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
    event_type: "note_added",
    old_status: null,
    new_status: "",
    actor_type: auditFields.actor_type,
    actor_email: actorEmail,
    access_mode: auditFields.access_mode,
    metadata: null,
  });
}
