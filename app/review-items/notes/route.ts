import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import {
  isReviewQueueAccessContext,
  resolveReviewQueueAccess,
} from "@/lib/operator-auth";
import { processReviewItemNoteSubmission } from "@/lib/review/review-queue-ui";
import { getSupabaseAuthUser } from "@/lib/supabase/auth-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await resolveReviewQueueAccess(request.headers.get("authorization"));

  if (!isReviewQueueAccessContext(auth)) {
    return NextResponse.redirect(new URL("/review-items", request.url), 303);
  }

  const formData = await request.formData();
  const operatorEmail =
    auth.mode === "operator" ? (await getSupabaseAuthUser())?.email : null;
  const submission = await processReviewItemNoteSubmission(formData, auth, operatorEmail);

  if (submission.result.ok) {
    revalidatePath("/review-items");
  }

  return NextResponse.redirect(new URL(submission.redirectPath, request.url), 303);
}
