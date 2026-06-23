import { NextRequest, NextResponse } from "next/server";

import {
  authorizeReviewQueueApiRequest,
  isReviewQueueAccessContext,
} from "@/lib/operator-auth";
import { buildClaimResearchPostApiResponse } from "@/lib/review/claims-research-api";

export const runtime = "nodejs";

type ClaimResearchRouteContext = {
  params: Promise<{ claimId: string }>;
};

/**
 * Phase 44C — run controlled single-claim evidence research.
 *
 * SAFETY: Internal research only. Not a Mind send endpoint.
 */
export async function POST(request: NextRequest, context: ClaimResearchRouteContext) {
  const auth = await authorizeReviewQueueApiRequest(
    {
      authorization: request.headers.get("authorization"),
    },
    "/api/claims/[claimId]/research"
  );

  if (!isReviewQueueAccessContext(auth)) {
    return NextResponse.json(auth.body ?? { ok: false, error: "unauthorized" }, {
      status: auth.status,
    });
  }

  const { claimId } = await context.params;
  const response = await buildClaimResearchPostApiResponse(claimId, auth);

  return NextResponse.json(response.body, { status: response.status });
}
