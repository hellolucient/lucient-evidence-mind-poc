import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import {
  isReviewQueueAccessContext,
  resolveReviewQueueAccess,
} from "@/lib/operator-auth";
import type { ExternalMindHandoffDestination } from "@/lib/review/external-mind-handoff-constants";
import { processMindHandoffCreationSubmission } from "@/lib/review/mind-digests-page";
import { mindHandoffCreationErrorMessage } from "@/lib/watch/external-mind-handoff-creator";

export const runtime = "nodejs";

function parseCreateHandoffDestination(
  value: FormDataEntryValue | null
):
  | { ok: true; destination?: ExternalMindHandoffDestination }
  | { ok: false; error: string } {
  if (value === null) {
    return { ok: true };
  }

  const trimmed = value.toString().trim();
  if (!trimmed) {
    return { ok: true };
  }

  if (trimmed === "test_sink" || trimmed === "animoca_mind" || trimmed === "hellominds") {
    return { ok: true, destination: trimmed };
  }

  if (trimmed === "internal_export") {
    return { ok: false, error: "unsupported_handoff_destination_for_creation" };
  }

  return { ok: false, error: "invalid_handoff_destination" };
}

export async function POST(request: Request) {
  const auth = await resolveReviewQueueAccess(request.headers.get("authorization"));

  if (!isReviewQueueAccessContext(auth)) {
    return NextResponse.redirect(new URL("/mind-digests", request.url), 303);
  }

  const formData = await request.formData();
  const digestId = formData.get("digest_id")?.toString().trim();

  if (!digestId) {
    return NextResponse.redirect(
      new URL("/mind-digests?handoff_error=required_fields_missing", request.url),
      303
    );
  }

  const destinationResult = parseCreateHandoffDestination(formData.get("destination"));
  if (!destinationResult.ok) {
    return NextResponse.redirect(
      new URL(
        `/mind-digests?digest_id=${encodeURIComponent(digestId)}&handoff_error=${encodeURIComponent(destinationResult.error)}&handoff_message=${encodeURIComponent(mindHandoffCreationErrorMessage(destinationResult.error))}`,
        request.url
      ),
      303
    );
  }

  const submission = await processMindHandoffCreationSubmission(
    auth,
    digestId,
    destinationResult.destination
  );

  if (submission.result.ok) {
    revalidatePath("/mind-digests");
  }

  return NextResponse.redirect(new URL(submission.redirectPath, request.url), 303);
}
