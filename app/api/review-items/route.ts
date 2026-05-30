import { NextRequest, NextResponse } from "next/server";

import { authorizeInternalReviewApiRequest } from "@/lib/internal-review-access";
import {
  buildReviewItemsListApiResponse,
  parseReviewItemListFilters,
} from "@/lib/review/review-items-api";

export const runtime = "nodejs";

/**
 * Phase 18/21 review queue — list evidence review handoff items.
 *
 * Auth: internal review session cookie or Bearer INTERNAL_REVIEW_ACCESS_TOKEN.
 */
export async function GET(request: NextRequest) {
  const auth = await authorizeInternalReviewApiRequest(
    {
      authorization: request.headers.get("authorization"),
    },
    "/api/review-items"
  );

  if (!auth.authorized) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  const filters = parseReviewItemListFilters(request.nextUrl.searchParams);
  const body = await buildReviewItemsListApiResponse(filters);

  return NextResponse.json(body);
}
