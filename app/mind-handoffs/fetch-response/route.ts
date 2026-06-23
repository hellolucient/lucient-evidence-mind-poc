import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { isReviewQueueAccessContext, resolveReviewQueueAccess } from "@/lib/operator-auth";
import { processMindHandoffResponseFetchSubmission } from "@/lib/review/mind-digests-page";
import { isSupportedExternalMindHandoffDestination } from "@/lib/review/external-mind-handoff-constants";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await resolveReviewQueueAccess(request.headers.get("authorization"));

  if (!isReviewQueueAccessContext(auth)) {
    return NextResponse.redirect(new URL("/mind-digests", request.url), 303);
  }

  const formData = await request.formData();
  const handoffId = formData.get("handoff_id")?.toString().trim();
  const digestId = formData.get("digest_id")?.toString().trim();
  const handoffDestinationRaw = formData.get("handoff_destination")?.toString().trim();
  const handoffDestination =
    handoffDestinationRaw && isSupportedExternalMindHandoffDestination(handoffDestinationRaw)
      ? handoffDestinationRaw
      : undefined;

  if (!handoffId) {
    return NextResponse.redirect(
      new URL("/mind-digests?fetch_error=required_fields_missing", request.url),
      303
    );
  }

  const submission = await processMindHandoffResponseFetchSubmission(
    auth,
    handoffId,
    digestId || undefined,
    handoffDestination
  );

  if (submission.result.ok) {
    revalidatePath("/mind-digests");
  }

  return NextResponse.redirect(new URL(submission.redirectPath, request.url), 303);
}
