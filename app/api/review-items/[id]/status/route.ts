import { NextRequest, NextResponse } from "next/server";

import {
  authorizeReviewQueueApiRequest,
  buildReviewForbiddenApiBody,
  isReviewQueueAccessContext,
} from "@/lib/operator-auth";
import { buildReviewItemStatusUpdateApiResponse } from "@/lib/review/review-items-api";
import { getSupabaseAuthUser } from "@/lib/supabase/auth-server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * Phase 18/21/23A review queue — update review item status for operator actions.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await authorizeReviewQueueApiRequest(
    {
      authorization: request.headers.get("authorization"),
    },
    "/api/review-items/[id]/status"
  );

  if (!isReviewQueueAccessContext(auth)) {
    return NextResponse.json(auth.body ?? { ok: false, error: "unauthorized" }, {
      status: auth.status,
    });
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

  const operatorEmail =
    auth.mode === "operator" ? (await getSupabaseAuthUser())?.email : null;
  const responseBody = await buildReviewItemStatusUpdateApiResponse(
    id,
    body,
    auth,
    operatorEmail
  );

  if (!responseBody.ok && responseBody.error === "forbidden") {
    return NextResponse.json(
      buildReviewForbiddenApiBody(
        "/api/review-items/[id]/status",
        "Review item is outside your workspace scope."
      ),
      { status: 403 }
    );
  }

  return NextResponse.json(responseBody, {
    status: "status" in responseBody ? responseBody.status : 200,
  });
}
