import type { ReviewQueueAccessContext } from "@/lib/operator-auth";
import type { ExternalMindHandoffReviewStatus } from "@/lib/review/external-mind-handoff-constants";
import { sanitizeOperatorEmail } from "@/lib/review/review-queue-auth-status";
import { mapReviewQueueAccessToAuditFields } from "@/lib/review/review-item-status-audit";
import {
  getExternalMindHandoffById,
  updateExternalMindHandoffReview,
  type PrivacySafeExternalMindHandoffWithPayload,
} from "@/lib/watch/external-mind-handoff-store";

export type ExternalMindHandoffReviewAction = "approve" | "reject" | "request_changes";

export type ReviewExternalMindHandoffOptions = {
  operatorEmail?: string | null;
  note?: string | null;
};

export type ReviewExternalMindHandoffResult =
  | { ok: true; handoff: PrivacySafeExternalMindHandoffWithPayload; action: ExternalMindHandoffReviewAction }
  | { ok: false; error: string; message: string };

const MAX_REVIEW_NOTE_LENGTH = 500;

function sanitizeReviewNote(note?: string | null): string | null {
  if (!note) {
    return null;
  }

  const trimmed = note.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, MAX_REVIEW_NOTE_LENGTH);
}

function buildReviewActorFields(
  access: ReviewQueueAccessContext,
  operatorEmail?: string | null
): { actor_type: string; actor_email: string | null } {
  const auditFields = mapReviewQueueAccessToAuditFields(access);
  return {
    actor_type: auditFields.actor_type,
    actor_email:
      auditFields.access_mode === "supabase_operator"
        ? sanitizeOperatorEmail(operatorEmail)
        : null,
  };
}

export function externalMindHandoffReviewErrorMessage(error: string): string {
  switch (error) {
    case "supabase_not_configured":
      return "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.";
    case "external_mind_handoffs_table_missing":
      return "The external_mind_handoffs table is missing. Apply the Phase 31 migration in Supabase.";
    case "forbidden":
      return "You do not have access to review handoffs in this workspace.";
    case "handoff_not_found":
      return "External Mind handoff not found.";
    case "handoff_not_reviewable":
      return "Sent or archived handoffs cannot be reviewed.";
    case "unsupported_review_action":
      return "Unsupported handoff review action.";
    case "unsupported_review_status":
      return "Unsupported handoff review status.";
    case "required_fields_missing":
      return "Required handoff review fields are missing.";
    default:
      return `Unable to review Mind handoff: ${error}`;
  }
}

export async function reviewExternalMindHandoff(
  handoffId: string,
  access: ReviewQueueAccessContext,
  action: ExternalMindHandoffReviewAction,
  options?: ReviewExternalMindHandoffOptions
): Promise<ReviewExternalMindHandoffResult> {
  if (!handoffId.trim()) {
    return {
      ok: false,
      error: "required_fields_missing",
      message: externalMindHandoffReviewErrorMessage("required_fields_missing"),
    };
  }

  const lookup = await getExternalMindHandoffById(handoffId, access);
  if (lookup.error === "forbidden") {
    return {
      ok: false,
      error: "forbidden",
      message: externalMindHandoffReviewErrorMessage("forbidden"),
    };
  }

  if (!lookup.handoff) {
    return {
      ok: false,
      error: "handoff_not_found",
      message: externalMindHandoffReviewErrorMessage("handoff_not_found"),
    };
  }

  const actor = buildReviewActorFields(access, options?.operatorEmail);
  const note = sanitizeReviewNote(options?.note);
  const now = new Date().toISOString();

  let reviewStatus: ExternalMindHandoffReviewStatus;
  let updateInput: Parameters<typeof updateExternalMindHandoffReview>[2];

  switch (action) {
    case "approve":
      reviewStatus = "approved";
      updateInput = {
        review_status: reviewStatus,
        approved_at: now,
        approved_by_actor_type: actor.actor_type,
        approved_by_actor_email: actor.actor_email,
        approval_note: note,
      };
      break;
    case "reject":
      reviewStatus = "rejected";
      updateInput = {
        review_status: reviewStatus,
        reviewed_at: now,
        reviewed_by_actor_type: actor.actor_type,
        reviewed_by_actor_email: actor.actor_email,
        review_note: note,
        approved_at: null,
        approved_by_actor_type: null,
        approved_by_actor_email: null,
        approval_note: null,
      };
      break;
    case "request_changes":
      reviewStatus = "changes_requested";
      updateInput = {
        review_status: reviewStatus,
        reviewed_at: now,
        reviewed_by_actor_type: actor.actor_type,
        reviewed_by_actor_email: actor.actor_email,
        review_note: note,
        approved_at: null,
        approved_by_actor_type: null,
        approved_by_actor_email: null,
        approval_note: null,
      };
      break;
    default:
      return {
        ok: false,
        error: "unsupported_review_action",
        message: externalMindHandoffReviewErrorMessage("unsupported_review_action"),
      };
  }

  const updateResult = await updateExternalMindHandoffReview(handoffId, access, updateInput);
  if (!updateResult.ok) {
    return {
      ok: false,
      error: updateResult.error,
      message: externalMindHandoffReviewErrorMessage(updateResult.error),
    };
  }

  return { ok: true, handoff: updateResult.handoff, action };
}

export async function approveExternalMindHandoff(
  handoffId: string,
  access: ReviewQueueAccessContext,
  options?: ReviewExternalMindHandoffOptions
): Promise<ReviewExternalMindHandoffResult> {
  return reviewExternalMindHandoff(handoffId, access, "approve", options);
}

export async function rejectExternalMindHandoff(
  handoffId: string,
  access: ReviewQueueAccessContext,
  options?: ReviewExternalMindHandoffOptions
): Promise<ReviewExternalMindHandoffResult> {
  return reviewExternalMindHandoff(handoffId, access, "reject", options);
}

export async function requestChangesExternalMindHandoff(
  handoffId: string,
  access: ReviewQueueAccessContext,
  options?: ReviewExternalMindHandoffOptions
): Promise<ReviewExternalMindHandoffResult> {
  return reviewExternalMindHandoff(handoffId, access, "request_changes", options);
}
