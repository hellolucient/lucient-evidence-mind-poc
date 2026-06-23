import { NextRequest, NextResponse } from "next/server";

import {
  authorizeReviewQueueApiRequest,
  isReviewQueueAccessContext,
} from "@/lib/operator-auth";
import { buildClaimResearchRunDetailApiResponse } from "@/lib/review/claims-research-api";

export const runtime = "nodejs";

type ClaimResearchRunDetailRouteContext = {
  params: Promise<{ claimId: string; researchRunId: string }>;
};

/**
 * Phase 44C — return one safe research run and citations for a registered claim.
 */
export async function GET(request: NextRequest, context: ClaimResearchRunDetailRouteContext) {
  const auth = await authorizeReviewQueueApiRequest(
    {
      authorization: request.headers.get("authorization"),
    },
    "/api/claims/[claimId]/research-runs/[researchRunId]"
  );

  if (!isReviewQueueAccessContext(auth)) {
    return NextResponse.json(auth.body ?? { ok: false, error: "unauthorized" }, {
      status: auth.status,
    });
  }

  const { claimId, researchRunId } = await context.params;
  const response = await buildClaimResearchRunDetailApiResponse(claimId, researchRunId, auth);

  return NextResponse.json(response.body, { status: response.status });
}
