import { NextRequest, NextResponse } from "next/server";

import {
  authorizeReviewQueueApiRequest,
  isReviewQueueAccessContext,
} from "@/lib/operator-auth";
import { buildCandidateClaimPatchApiResponse } from "@/lib/review/claims-review-api";

export const runtime = "nodejs";

type CandidateClaimRouteContext = {
  params: Promise<{ candidateClaimId: string }>;
};

/**
 * Phase 44B — update editable candidate claim fields before acceptance.
 *
 * SAFETY: Claim review and registry only.
 */
export async function PATCH(request: NextRequest, context: CandidateClaimRouteContext) {
  const auth = await authorizeReviewQueueApiRequest(
    {
      authorization: request.headers.get("authorization"),
    },
    "/api/claims/candidates/[candidateClaimId]"
  );

  if (!isReviewQueueAccessContext(auth)) {
    return NextResponse.json(auth.body ?? { ok: false, error: "unauthorized" }, {
      status: auth.status,
    });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_json_body",
        route: "/api/claims/candidates/[candidateClaimId]",
      },
      { status: 400 }
    );
  }

  const { candidateClaimId } = await context.params;
  const response = await buildCandidateClaimPatchApiResponse(candidateClaimId, body, auth);

  return NextResponse.json(response.body, { status: response.status });
}
