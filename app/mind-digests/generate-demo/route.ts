import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import {
  isReviewQueueAccessContext,
  resolveReviewQueueAccess,
} from "@/lib/operator-auth";
import { processDemoDigestGenerationSubmission } from "@/lib/review/mind-digests-page";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await resolveReviewQueueAccess(request.headers.get("authorization"));

  if (!isReviewQueueAccessContext(auth)) {
    return NextResponse.redirect(new URL("/mind-digests", request.url), 303);
  }

  const formData = await request.formData();
  const workspaceId = formData.get("workspace_id")?.toString().trim() || undefined;
  const submission = await processDemoDigestGenerationSubmission(auth, workspaceId);

  if (submission.result.ok) {
    revalidatePath("/mind-digests");
  }

  return NextResponse.redirect(new URL(submission.redirectPath, request.url), 303);
}
