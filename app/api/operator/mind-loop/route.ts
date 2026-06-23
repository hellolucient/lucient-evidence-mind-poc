import { NextRequest, NextResponse } from "next/server";

import {
  authorizeReviewQueueApiRequest,
  isReviewQueueAccessContext,
} from "@/lib/operator-auth";
import {
  buildMindLoopListApiResponse,
  parseMindLoopListFilters,
} from "@/lib/review/mind-loop-api";

export const runtime = "nodejs";

/**
 * Phase 42A — read-only Mind Loop operator dashboard API.
 *
 * SAFETY: This endpoint aggregates durable Phase 41A/41B records only.
 * It must not call live send, auto-send, retry, or HelloMinds send endpoints.
 * It must not require EXTERNAL_MIND_LIVE_SEND=true.
 */
export async function GET(request: NextRequest) {
  const auth = await authorizeReviewQueueApiRequest(
    {
      authorization: request.headers.get("authorization"),
    },
    "/api/operator/mind-loop"
  );

  if (!isReviewQueueAccessContext(auth)) {
    return NextResponse.json(auth.body ?? { ok: false, error: "unauthorized" }, {
      status: auth.status,
    });
  }

  const filters = parseMindLoopListFilters(request.nextUrl.searchParams);
  const body = await buildMindLoopListApiResponse(filters, auth);

  return NextResponse.json(body);
}
