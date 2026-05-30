import { NextRequest, NextResponse } from "next/server";

import {
  authorizeReviewQueueApiRequest,
  isReviewQueueAccessContext,
} from "@/lib/operator-auth";
import {
  buildReviewItemsListApiResponse,
  parseReviewItemListFilters,
} from "@/lib/review/review-items-api";

export const runtime = "nodejs";

/**
 * Phase 18/21/23A review queue — list evidence review handoff items.
 *
 * Auth: Supabase operator session, break-glass internal review cookie/token.
 */
export async function GET(request: NextRequest) {
  const auth = await authorizeReviewQueueApiRequest(
    {
      authorization: request.headers.get("authorization"),
    },
    "/api/review-items"
  );

  if (!isReviewQueueAccessContext(auth)) {
    return NextResponse.json(auth.body ?? { ok: false, error: "unauthorized" }, {
      status: auth.status,
    });
  }

  const filters = parseReviewItemListFilters(request.nextUrl.searchParams);
  const body = await buildReviewItemsListApiResponse(filters, auth);

  return NextResponse.json(body);
}
