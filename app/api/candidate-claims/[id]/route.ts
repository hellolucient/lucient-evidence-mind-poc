import { NextRequest, NextResponse } from "next/server";

import {
  authorizeReviewQueueApiRequest,
  isReviewQueueAccessContext,
} from "@/lib/operator-auth";
import {
  buildPatchCandidateClaimApiResponse,
  candidateClaimApiRoute,
} from "@/lib/review/candidate-claims-api";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const auth = await authorizeReviewQueueApiRequest(
    { authorization: request.headers.get("authorization") },
    candidateClaimApiRoute(id)
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
    return NextResponse.json({ ok: false, error: "invalid_json_body" }, { status: 400 });
  }

  const response = await buildPatchCandidateClaimApiResponse(
    id,
    {
      claim_text: typeof body.claim_text === "string" ? body.claim_text : undefined,
      operator_edited_claim_text:
        typeof body.operator_edited_claim_text === "string" || body.operator_edited_claim_text === null
          ? body.operator_edited_claim_text
          : undefined,
      operator_notes:
        typeof body.operator_notes === "string" || body.operator_notes === null
          ? body.operator_notes
          : undefined,
      review_status:
        typeof body.review_status === "string"
          ? (body.review_status as "pending" | "accepted" | "rejected" | "edited")
          : undefined,
    },
    auth
  );

  return NextResponse.json(response.body, { status: response.status });
}
