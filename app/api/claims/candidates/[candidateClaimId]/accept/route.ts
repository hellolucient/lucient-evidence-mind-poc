import { NextRequest, NextResponse } from "next/server";

import {
  authorizeReviewQueueApiRequest,
  isReviewQueueAccessContext,
} from "@/lib/operator-auth";
import { buildCandidateClaimAcceptApiResponse } from "@/lib/review/claims-review-api";

export const runtime = "nodejs";

type CandidateClaimAcceptRouteContext = {
  params: Promise<{ candidateClaimId: string }>;
};

/**
 * Phase 44B — accept a candidate claim into the registered wellness claims registry.
 *
 * SAFETY: Claim review and registry only.
 */
export async function POST(request: NextRequest, context: CandidateClaimAcceptRouteContext) {
  const auth = await authorizeReviewQueueApiRequest(
    {
      authorization: request.headers.get("authorization"),
    },
    "/api/claims/candidates/[candidateClaimId]/accept"
  );

  if (!isReviewQueueAccessContext(auth)) {
    return NextResponse.json(auth.body ?? { ok: false, error: "unauthorized" }, {
      status: auth.status,
    });
  }

  const { candidateClaimId } = await context.params;
  const response = await buildCandidateClaimAcceptApiResponse(candidateClaimId, auth);

  return NextResponse.json(response.body, { status: response.status });
}
