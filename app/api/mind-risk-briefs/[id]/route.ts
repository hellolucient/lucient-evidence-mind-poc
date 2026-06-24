import { NextRequest, NextResponse } from "next/server";

import {
  authorizeReviewQueueApiRequest,
  isReviewQueueAccessContext,
} from "@/lib/operator-auth";
import { buildMindRiskBriefDetailApiResponse, mindRiskBriefsApiRoute } from "@/lib/review/mind-risk-brief-jobs-api";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const auth = await authorizeReviewQueueApiRequest(
    { authorization: request.headers.get("authorization") },
    mindRiskBriefsApiRoute(id)
  );

  if (!isReviewQueueAccessContext(auth)) {
    return NextResponse.json(auth.body ?? { ok: false, error: "unauthorized" }, {
      status: auth.status,
    });
  }

  const response = await buildMindRiskBriefDetailApiResponse(id, auth);
  return NextResponse.json(response.body, { status: response.status });
}
