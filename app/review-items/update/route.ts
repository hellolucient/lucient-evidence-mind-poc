import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import {
  isReviewQueueAccessContext,
  resolveReviewQueueAccess,
} from "@/lib/operator-auth";
import { processReviewItemStatusUpdateSubmission } from "@/lib/review/review-queue-ui";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await resolveReviewQueueAccess(request.headers.get("authorization"));

  if (!isReviewQueueAccessContext(auth)) {
    return NextResponse.redirect(new URL("/review-items", request.url), 303);
  }

  const formData = await request.formData();
  const submission = await processReviewItemStatusUpdateSubmission(formData, auth);

  if (submission.result.ok) {
    revalidatePath("/review-items");
  }

  return NextResponse.redirect(new URL(submission.redirectPath, request.url), 303);
}
