import { NextRequest, NextResponse } from "next/server";

import { authorizeInternalReviewApiRequest } from "@/lib/internal-review-access";
import { buildReviewItemGetApiResponse } from "@/lib/review/review-items-api";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * Phase 18/21 review queue — fetch one evidence review item by ID.
 *
 * Auth: internal review session cookie or Bearer INTERNAL_REVIEW_ACCESS_TOKEN.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await authorizeInternalReviewApiRequest(
    {
      authorization: request.headers.get("authorization"),
    },
    "/api/review-items/[id]"
  );

  if (!auth.authorized) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  const { id } = await context.params;
  const body = await buildReviewItemGetApiResponse(id);

  return NextResponse.json(body, { status: body.ok ? 200 : 404 });
}
