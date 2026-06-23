import { NextRequest, NextResponse } from "next/server";

import {
  authorizeReviewQueueApiRequest,
  isReviewQueueAccessContext,
} from "@/lib/operator-auth";
import { buildCandidateClaimRejectApiResponse } from "@/lib/review/claims-review-api";

export const runtime = "nodejs";

type CandidateClaimRejectRouteContext = {
  params: Promise<{ candidateClaimId: string }>;
};

/**
 * Phase 44B — reject a candidate wellness claim.
 *
 * SAFETY: Claim review and registry only.
 */
export async function POST(_request: NextRequest, context: CandidateClaimRejectRouteContext) {
  const auth = await authorizeReviewQueueApiRequest(
    {
      authorization: _request.headers.get("authorization"),
    },
    "/api/claims/candidates/[candidateClaimId]/reject"
  );

  if (!isReviewQueueAccessContext(auth)) {
    return NextResponse.json(auth.body ?? { ok: false, error: "unauthorized" }, {
      status: auth.status,
    });
  }

  const { candidateClaimId } = await context.params;
  const response = await buildCandidateClaimRejectApiResponse(candidateClaimId, auth);

  return NextResponse.json(response.body, { status: response.status });
}
