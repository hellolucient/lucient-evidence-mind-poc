import { NextRequest, NextResponse } from "next/server";

import {
  authorizeReviewQueueApiRequest,
  isReviewQueueAccessContext,
} from "@/lib/operator-auth";
import { buildListCandidateClaimsApiResponse } from "@/lib/review/candidate-claims-api";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const route = `/api/source-documents/${id}/candidate-claims`;

  const auth = await authorizeReviewQueueApiRequest(
    { authorization: request.headers.get("authorization") },
    route
  );

  if (!isReviewQueueAccessContext(auth)) {
    return NextResponse.json(auth.body ?? { ok: false, error: "unauthorized" }, {
      status: auth.status,
    });
  }

  const response = await buildListCandidateClaimsApiResponse(id, auth);
  return NextResponse.json(response.body, { status: response.status });
}
