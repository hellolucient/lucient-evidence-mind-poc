import { NextRequest, NextResponse } from "next/server";

import {
  authorizeReviewQueueApiRequest,
  isReviewQueueAccessContext,
} from "@/lib/operator-auth";
import { buildClaimResearchRunsListApiResponse } from "@/lib/review/claims-research-api";

export const runtime = "nodejs";

type ClaimResearchRunsRouteContext = {
  params: Promise<{ claimId: string }>;
};

/**
 * Phase 44C — list safe research runs for one registered claim.
 */
export async function GET(request: NextRequest, context: ClaimResearchRunsRouteContext) {
  const auth = await authorizeReviewQueueApiRequest(
    {
      authorization: request.headers.get("authorization"),
    },
    "/api/claims/[claimId]/research-runs"
  );

  if (!isReviewQueueAccessContext(auth)) {
    return NextResponse.json(auth.body ?? { ok: false, error: "unauthorized" }, {
      status: auth.status,
    });
  }

  const { claimId } = await context.params;
  const response = await buildClaimResearchRunsListApiResponse(claimId, auth);

  return NextResponse.json(response.body, { status: response.status });
}
