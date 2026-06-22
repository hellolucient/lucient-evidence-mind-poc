import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import {
  isReviewQueueAccessContext,
  resolveReviewQueueAccess,
} from "@/lib/operator-auth";
import { processMindHandoffSendSubmission } from "@/lib/review/mind-digests-page";
import { isSupportedExternalMindHandoffDestination } from "@/lib/review/external-mind-handoff-constants";
import { getSupabaseAuthUser } from "@/lib/supabase/auth-server";

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
      new URL("/mind-digests?send_error=required_fields_missing", request.url),
      303
    );
  }

  const submission = await processMindHandoffSendSubmission(
    auth,
    handoffId,
    digestId || undefined,
    auth.mode === "operator" ? (await getSupabaseAuthUser())?.email : null,
    handoffDestination
  );

  if (submission.result.ok) {
    revalidatePath("/mind-digests");
  }

  return NextResponse.redirect(new URL(submission.redirectPath, request.url), 303);
}
