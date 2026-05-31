import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import {
  isReviewQueueAccessContext,
  resolveReviewQueueAccess,
} from "@/lib/operator-auth";
import { processClientClaimMappingCreateSubmission } from "@/lib/review/client-claims-page";
import { listClaimFamilyProfiles } from "@/lib/watch/claim-family-profile-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await resolveReviewQueueAccess(request.headers.get("authorization"));

  if (!isReviewQueueAccessContext(auth)) {
    return NextResponse.redirect(new URL("/client-claims", request.url), 303);
  }

  const profileResult = await listClaimFamilyProfiles();
  const knownClaimFamilies = profileResult.profiles.map((profile) => profile.claim_family);

  const formData = await request.formData();
  const submission = await processClientClaimMappingCreateSubmission(
    formData,
    auth,
    knownClaimFamilies
  );

  if (submission.result.ok) {
    revalidatePath("/client-claims");
  }

  return NextResponse.redirect(new URL(submission.redirectPath, request.url), 303);
}
