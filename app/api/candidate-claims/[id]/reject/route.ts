import { NextRequest, NextResponse } from "next/server";

import {
  authorizeReviewQueueApiRequest,
  isReviewQueueAccessContext,
} from "@/lib/operator-auth";
import {
  buildRejectCandidateClaimApiResponse,
  candidateClaimApiRoute,
} from "@/lib/review/candidate-claims-api";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const route = `${candidateClaimApiRoute(id)}/reject`;

  const auth = await authorizeReviewQueueApiRequest(
    { authorization: request.headers.get("authorization") },
    route
  );

  if (!isReviewQueueAccessContext(auth)) {
    return NextResponse.json(auth.body ?? { ok: false, error: "unauthorized" }, {
      status: auth.status,
    });
  }

  let body: Record<string, unknown> = {};
  try {
    const parsed = await request.json();
    if (parsed && typeof parsed === "object") {
      body = parsed as Record<string, unknown>;
    }
  } catch {
    body = {};
  }

  const response = await buildRejectCandidateClaimApiResponse(
    id,
    {
      operator_email: typeof body.operator_email === "string" ? body.operator_email : undefined,
      operator_notes: typeof body.operator_notes === "string" ? body.operator_notes : undefined,
    },
    auth
  );

  return NextResponse.json(response.body, { status: response.status });
}
