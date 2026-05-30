"use server";

import {
  buildReviewQueuePageData,
  updateReviewQueueItemStatus,
  type ReviewQueuePageData,
  type ReviewQueueStatusUpdateResult,
} from "@/lib/review/review-queue-ui";

export async function loadReviewQueuePageData(
  params: Record<string, string | string[] | undefined>
): Promise<ReviewQueuePageData> {
  return buildReviewQueuePageData(params);
}

export async function updateReviewItemStatusAction(
  id: string,
  status: string
): Promise<ReviewQueueStatusUpdateResult> {
  return updateReviewQueueItemStatus(id, status);
}
