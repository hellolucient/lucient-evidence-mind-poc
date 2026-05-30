import { NextRequest, NextResponse } from "next/server";

import { authorizeInternalReviewApiRequest } from "@/lib/internal-review-access";
import { buildReviewItemStatusUpdateApiResponse } from "@/lib/review/review-items-api";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * Phase 18/21 review queue — update review item status for operator actions.
 *
 * Auth: internal review session cookie or Bearer INTERNAL_REVIEW_ACCESS_TOKEN.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await authorizeInternalReviewApiRequest(
    {
      authorization: request.headers.get("authorization"),
    },
    "/api/review-items/[id]/status"
  );

  if (!auth.authorized) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  const { id } = await context.params;
  let body: { status?: unknown };

  try {
    body = (await request.json()) as { status?: unknown };
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_json_body",
      },
      { status: 400 }
    );
  }

  const responseBody = await buildReviewItemStatusUpdateApiResponse(id, body);

  return NextResponse.json(responseBody, {
    status: "status" in responseBody ? responseBody.status : 200,
  });
}
