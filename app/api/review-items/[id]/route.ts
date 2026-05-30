import { NextRequest, NextResponse } from "next/server";

import {
  authorizeReviewQueueApiRequest,
  isReviewQueueAccessContext,
} from "@/lib/operator-auth";
import { buildReviewItemGetApiResponse } from "@/lib/review/review-items-api";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function reviewItemGetStatus(body: Awaited<ReturnType<typeof buildReviewItemGetApiResponse>>) {
  if (body.ok) {
    return 200;
  }

  if ("status" in body && typeof body.status === "number") {
    return body.status;
  }

  return 404;
}

/**
 * Phase 18/21/23A review queue — fetch one evidence review item by ID.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await authorizeReviewQueueApiRequest(
    {
      authorization: request.headers.get("authorization"),
    },
    "/api/review-items/[id]"
  );

  if (!isReviewQueueAccessContext(auth)) {
    return NextResponse.json(auth.body ?? { ok: false, error: "unauthorized" }, {
      status: auth.status,
    });
  }

  const { id } = await context.params;
  const body = await buildReviewItemGetApiResponse(id, auth);

  return NextResponse.json(body, { status: reviewItemGetStatus(body) });
}
