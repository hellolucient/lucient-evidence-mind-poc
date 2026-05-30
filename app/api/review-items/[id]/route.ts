import { NextRequest, NextResponse } from "next/server";
import { authorizeWatchCronRequest } from "@/lib/watch-cron";
import { buildReviewItemGetApiResponse } from "@/lib/review/review-items-api";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * Phase 18 review queue — fetch one evidence review item by ID.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const auth = authorizeWatchCronRequest({
    authorization: request.headers.get("authorization"),
    userAgent: request.headers.get("user-agent"),
  });

  if (!auth.authorized) {
    return NextResponse.json(auth.body, { status: 401 });
  }

  const { id } = await context.params;
  const body = await buildReviewItemGetApiResponse(id);

  return NextResponse.json(body, { status: body.ok ? 200 : 404 });
}
