import { NextRequest, NextResponse } from "next/server";

import {
  authorizeReviewQueueApiRequest,
  isReviewQueueAccessContext,
} from "@/lib/operator-auth";
import {
  buildMindLoopDetailApiResponse,
  parseMindLoopDetailFilters,
} from "@/lib/review/mind-loop-api";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ digestId: string }>;
};

/**
 * Phase 43B — read-only Mind Loop operator detail API.
 *
 * SAFETY: This endpoint aggregates durable Phase 41A/41B records only.
 * It must not call live send, auto-send, retry, or HelloMinds send endpoints.
 * It must not require EXTERNAL_MIND_LIVE_SEND=true.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await authorizeReviewQueueApiRequest(
    {
      authorization: request.headers.get("authorization"),
    },
    "/api/operator/mind-loop/[digestId]"
  );

  if (!isReviewQueueAccessContext(auth)) {
    return NextResponse.json(auth.body ?? { ok: false, error: "unauthorized" }, {
      status: auth.status,
    });
  }

  const { digestId } = await context.params;
  const filters = parseMindLoopDetailFilters(request.nextUrl.searchParams);
  const body = await buildMindLoopDetailApiResponse(digestId, filters, auth);

  if (!body.ok) {
    return NextResponse.json(body, { status: body.status ?? 404 });
  }

  return NextResponse.json(body);
}
