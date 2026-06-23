import { NextRequest, NextResponse } from "next/server";

import {
  authorizeReviewQueueApiRequest,
  isReviewQueueAccessContext,
} from "@/lib/operator-auth";
import { buildClaimRegistryDetailApiResponse } from "@/lib/review/claims-review-api";

export const runtime = "nodejs";

type ClaimDetailRouteContext = {
  params: Promise<{ claimId: string }>;
};

/**
 * Phase 44B — registered wellness claim detail.
 *
 * SAFETY: Claim review and registry only.
 */
export async function GET(request: NextRequest, context: ClaimDetailRouteContext) {
  const auth = await authorizeReviewQueueApiRequest(
    {
      authorization: request.headers.get("authorization"),
    },
    "/api/claims/[claimId]"
  );

  if (!isReviewQueueAccessContext(auth)) {
    return NextResponse.json(auth.body ?? { ok: false, error: "unauthorized" }, {
      status: auth.status,
    });
  }

  const { claimId } = await context.params;
  const response = await buildClaimRegistryDetailApiResponse(claimId, auth);

  return NextResponse.json(response.body, { status: response.status });
}
