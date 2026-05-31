import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import {
  isReviewQueueAccessContext,
  resolveReviewQueueAccess,
} from "@/lib/operator-auth";
import { processMindHandoffReviewSubmission } from "@/lib/review/mind-digests-page";
import type { ExternalMindHandoffReviewAction } from "@/lib/watch/external-mind-handoff-review";
import { getSupabaseAuthUser } from "@/lib/supabase/auth-server";

export const runtime = "nodejs";

function parseReviewAction(value: FormDataEntryValue | null): ExternalMindHandoffReviewAction | null {
  const action = value?.toString().trim();
  if (action === "approve" || action === "reject" || action === "request_changes") {
    return action;
  }

  return null;
}

export async function POST(request: Request) {
  const auth = await resolveReviewQueueAccess(request.headers.get("authorization"));

  if (!isReviewQueueAccessContext(auth)) {
    return NextResponse.redirect(new URL("/mind-digests", request.url), 303);
  }

  const formData = await request.formData();
  const handoffId = formData.get("handoff_id")?.toString().trim();
  const digestId = formData.get("digest_id")?.toString().trim();
  const action = parseReviewAction(formData.get("review_action"));
  const note = formData.get("review_note")?.toString() ?? null;

  if (!handoffId || !action) {
    return NextResponse.redirect(
      new URL("/mind-digests?review_error=required_fields_missing", request.url),
      303
    );
  }

  const submission = await processMindHandoffReviewSubmission(
    auth,
    handoffId,
    action,
    digestId || undefined,
    auth.mode === "operator" ? (await getSupabaseAuthUser())?.email : null,
    note
  );

  if (submission.result.ok) {
    revalidatePath("/mind-digests");
  }

  return NextResponse.redirect(new URL(submission.redirectPath, request.url), 303);
}
