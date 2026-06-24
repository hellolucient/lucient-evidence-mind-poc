import { NextRequest, NextResponse } from "next/server";

import {
  authorizeReviewQueueApiRequest,
  isReviewQueueAccessContext,
} from "@/lib/operator-auth";
import { buildCreateMindRiskBriefJobApiResponse } from "@/lib/review/mind-risk-brief-jobs-api";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const route = `/api/client-claims/${id}/mind-risk-brief-jobs`;

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

  const response = await buildCreateMindRiskBriefJobApiResponse(
    id,
    { created_by: typeof body.created_by === "string" ? body.created_by : undefined },
    auth
  );

  return NextResponse.json(response.body, { status: response.status });
}
