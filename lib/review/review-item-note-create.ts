import type { ReviewQueueAccessContext } from "@/lib/operator-auth";
import { insertReviewItemNote } from "@/lib/review/evidence-review-item-notes-store";
import { recordReviewItemNoteAddedAudit } from "@/lib/review/review-item-note-audit";
import { mapReviewQueueAccessToAuditFields } from "@/lib/review/review-item-status-audit";
import {
  isSupportedReviewItemDecisionType,
  type ReviewItemDecisionType,
} from "@/lib/review/review-queue-note-constants";
import type { ReviewQueueNoteAddResult } from "@/lib/review/review-queue-types";
import { sanitizeOperatorEmail } from "@/lib/review/review-queue-auth-status";
import type { PrivacySafeReviewItem } from "@/lib/watch/evidence-review-item-store";

function reviewQueueNoteErrorMessage(error: string | null | undefined): string | null {
  if (!error) {
    return null;
  }

  switch (error) {
    case "supabase_not_configured":
      return "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.";
    case "evidence_review_item_notes_table_missing":
      return "The evidence_review_item_notes table is missing. Apply the Phase 25 migration in Supabase.";
    case "note_text_required":
      return "Note text is required.";
    case "unsupported_decision_type":
      return "Unsupported decision type.";
    case "review_item_not_found":
      return "Review item not found.";
    default:
      return `Server error: ${error}`;
  }
}

export async function performReviewItemNoteCreate(options: {
  reviewItemId: string;
  noteText: string;
  decisionType?: string | null;
  access: ReviewQueueAccessContext;
  operatorEmail?: string | null;
  existingItem?: Pick<PrivacySafeReviewItem, "workspace_id"> | null;
}): Promise<ReviewQueueNoteAddResult> {
  const trimmedNote = options.noteText.trim();
  if (!trimmedNote) {
    return {
      ok: false,
      error: "note_text_required",
      message: reviewQueueNoteErrorMessage("note_text_required") ?? "Note text is required.",
    };
  }

  const normalizedDecisionType = options.decisionType?.trim() ?? "";
  let decisionType: ReviewItemDecisionType | null = null;
  if (normalizedDecisionType) {
    if (!isSupportedReviewItemDecisionType(normalizedDecisionType)) {
      return {
        ok: false,
        error: "unsupported_decision_type",
        message:
          reviewQueueNoteErrorMessage("unsupported_decision_type") ?? "Unsupported decision type.",
      };
    }
    decisionType = normalizedDecisionType;
  }

  const workspaceId = options.existingItem?.workspace_id;
  if (!workspaceId) {
    return {
      ok: false,
      error: "review_item_not_found",
      message: reviewQueueNoteErrorMessage("review_item_not_found") ?? "Review item not found.",
    };
  }

  const auditFields = mapReviewQueueAccessToAuditFields(options.access);
  const actorEmail =
    auditFields.access_mode === "supabase_operator"
      ? sanitizeOperatorEmail(options.operatorEmail)
      : null;

  const insertResult = await insertReviewItemNote({
    workspace_id: workspaceId,
    review_item_id: options.reviewItemId,
    note_text: trimmedNote,
    decision_type: decisionType,
    actor_type: auditFields.actor_type,
    actor_email: actorEmail,
    access_mode: auditFields.access_mode,
  });

  if (!insertResult.ok || !insertResult.note) {
    return {
      ok: false,
      error: insertResult.error ?? "server_error",
      message: reviewQueueNoteErrorMessage(insertResult.error ?? "server_error") ?? "Note save failed.",
    };
  }

  await recordReviewItemNoteAddedAudit({
    reviewItemId: options.reviewItemId,
    workspaceId,
    access: options.access,
    operatorEmail: options.operatorEmail,
  });

  return {
    ok: true,
    note: insertResult.note,
  };
}
