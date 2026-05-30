import type { ReviewQueueAccessContext } from "@/lib/operator-auth";
import { recordReviewItemStatusChangeAudit } from "@/lib/review/review-item-status-audit";
import type { ReviewQueueStatusUpdateResult } from "@/lib/review/review-queue-types";
import {
  isSupportedReviewItemStatus,
  updateReviewItemStatus,
  type PrivacySafeReviewItem,
} from "@/lib/watch/evidence-review-item-store";

function reviewQueueErrorMessage(error: string | null | undefined): string | null {
  if (!error) {
    return null;
  }

  switch (error) {
    case "supabase_not_configured":
      return "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.";
    case "evidence_review_items_table_missing":
      return "The evidence_review_items table is missing. Apply the Phase 18 migration in Supabase.";
    case "review_item_not_found":
      return "Review item not found.";
    case "unsupported_review_item_status":
      return "Unsupported review item status.";
    default:
      return `Server error: ${error}`;
  }
}

function shapeReviewQueueDetailView(item: PrivacySafeReviewItem) {
  return { ...item };
}

export async function performReviewItemStatusUpdate(options: {
  id: string;
  status: string;
  access: ReviewQueueAccessContext;
  operatorEmail?: string | null;
  existingItem?: Pick<PrivacySafeReviewItem, "workspace_id" | "status"> | null;
}): Promise<ReviewQueueStatusUpdateResult> {
  if (!isSupportedReviewItemStatus(options.status)) {
    return {
      ok: false,
      error: "unsupported_review_item_status",
      message:
        reviewQueueErrorMessage("unsupported_review_item_status") ?? "Invalid status.",
    };
  }

  const oldStatus = options.existingItem?.status;
  const workspaceId = options.existingItem?.workspace_id;

  const result = await updateReviewItemStatus(options.id, options.status);

  if (result.invalid_status) {
    return {
      ok: false,
      error: result.error ?? "unsupported_review_item_status",
      message:
        reviewQueueErrorMessage(result.error ?? "unsupported_review_item_status") ??
        "Invalid status.",
    };
  }

  if (result.not_found) {
    return {
      ok: false,
      error: result.error ?? "review_item_not_found",
      message: reviewQueueErrorMessage(result.error ?? "review_item_not_found") ?? "Not found.",
    };
  }

  if (result.error || !result.item) {
    return {
      ok: false,
      error: result.error ?? "server_error",
      message: reviewQueueErrorMessage(result.error ?? "server_error") ?? "Update failed.",
    };
  }

  if (oldStatus && workspaceId) {
    await recordReviewItemStatusChangeAudit({
      reviewItemId: options.id,
      workspaceId,
      oldStatus,
      newStatus: result.item.status,
      access: options.access,
      operatorEmail: options.operatorEmail,
    });
  }

  return {
    ok: true,
    item: shapeReviewQueueDetailView(result.item),
  };
}
