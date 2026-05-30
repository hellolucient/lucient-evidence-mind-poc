import { NextRequest, NextResponse } from "next/server";
import { authorizeWatchCronRequest } from "@/lib/watch-cron";
import { buildReviewItemStatusUpdateApiResponse } from "@/lib/review/review-items-api";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * Phase 18 review queue — update review item status for operator actions.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const auth = authorizeWatchCronRequest({
    authorization: request.headers.get("authorization"),
    userAgent: request.headers.get("user-agent"),
  });

  if (!auth.authorized) {
    return NextResponse.json(auth.body, { status: 401 });
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
