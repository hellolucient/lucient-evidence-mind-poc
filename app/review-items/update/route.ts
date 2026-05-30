import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { processReviewItemStatusUpdateSubmission } from "@/lib/review/review-queue-ui";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const formData = await request.formData();
  const submission = await processReviewItemStatusUpdateSubmission(formData);

  if (submission.result.ok) {
    revalidatePath("/review-items");
  }

  return NextResponse.redirect(new URL(submission.redirectPath, request.url), 303);
}
