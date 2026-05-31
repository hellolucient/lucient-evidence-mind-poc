import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import {
  isReviewQueueAccessContext,
  resolveReviewQueueAccess,
} from "@/lib/operator-auth";
import { processMindHandoffSendSubmission } from "@/lib/review/mind-digests-page";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await resolveReviewQueueAccess(request.headers.get("authorization"));

  if (!isReviewQueueAccessContext(auth)) {
    return NextResponse.redirect(new URL("/mind-digests", request.url), 303);
  }

  const formData = await request.formData();
  const handoffId = formData.get("handoff_id")?.toString().trim();
  const digestId = formData.get("digest_id")?.toString().trim();

  if (!handoffId) {
    return NextResponse.redirect(
      new URL("/mind-digests?send_error=required_fields_missing", request.url),
      303
    );
  }

  const submission = await processMindHandoffSendSubmission(auth, handoffId, digestId || undefined);

  if (submission.result.ok) {
    revalidatePath("/mind-digests");
  }

  return NextResponse.redirect(new URL(submission.redirectPath, request.url), 303);
}
