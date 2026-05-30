import { NextRequest, NextResponse } from "next/server";
import { authorizeWatchCronRequest } from "@/lib/watch-cron";
import {
  buildReviewItemsListApiResponse,
  parseReviewItemListFilters,
} from "@/lib/review/review-items-api";

export const runtime = "nodejs";

/**
 * Phase 18 review queue — list evidence review handoff items.
 *
 * Auth: same as /api/watch/cron (CRON_SECRET Bearer or vercel-cron user-agent).
 */
export async function GET(request: NextRequest) {
  const auth = authorizeWatchCronRequest({
    authorization: request.headers.get("authorization"),
    userAgent: request.headers.get("user-agent"),
  });

  if (!auth.authorized) {
    return NextResponse.json(auth.body, { status: 401 });
  }

  const filters = parseReviewItemListFilters(request.nextUrl.searchParams);
  const body = await buildReviewItemsListApiResponse(filters);

  return NextResponse.json(body);
}
