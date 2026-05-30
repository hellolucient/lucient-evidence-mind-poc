"use server";

import { revalidatePath } from "next/cache";

import {
  parseReviewItemStatusFormData,
  updateReviewQueueItemStatus,
} from "@/lib/review/review-queue-ui";
import type { ReviewQueueStatusUpdateResult } from "@/lib/review/review-queue-types";

export async function updateReviewItemStatusFormAction(
  _previousState: ReviewQueueStatusUpdateResult | null,
  formData: FormData
): Promise<ReviewQueueStatusUpdateResult> {
  const parsed = parseReviewItemStatusFormData(formData);

  if (!parsed.id) {
    return {
      ok: false,
      error: "review_item_id_required",
      message: "Review item ID is required.",
    };
  }

  if (!parsed.status) {
    return {
      ok: false,
      error: "status_required",
      message: "Status is required.",
    };
  }

  const result = await updateReviewQueueItemStatus(parsed.id, parsed.status);

  if (result.ok) {
    revalidatePath("/review-items");
  }

  return result;
}
