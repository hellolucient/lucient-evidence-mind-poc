import { NextRequest, NextResponse } from "next/server";

import {
  authorizeReviewQueueApiRequest,
  isReviewQueueAccessContext,
} from "@/lib/operator-auth";
import { buildClaimsExtractApiResponse } from "@/lib/review/claims-extract-api";

export const runtime = "nodejs";

/**
 * Phase 44A — wellness claim extraction from source material.
 *
 * SAFETY: Source intake and candidate claim extraction only.
 * Must not start evidence research, create evidence briefs, send Mind digests,
 * or call HelloMinds send/live-send/retry paths.
 */
export async function POST(request: NextRequest) {
  const auth = await authorizeReviewQueueApiRequest(
    {
      authorization: request.headers.get("authorization"),
    },
    "/api/claims/extract"
  );

  if (!isReviewQueueAccessContext(auth)) {
    return NextResponse.json(auth.body ?? { ok: false, error: "unauthorized" }, {
      status: auth.status,
    });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_json_body",
        route: "/api/claims/extract",
      },
      { status: 400 }
    );
  }

  const response = await buildClaimsExtractApiResponse(
    {
      workspace_id: typeof body.workspace_id === "string" ? body.workspace_id : undefined,
      title: typeof body.title === "string" ? body.title : undefined,
      source_type: typeof body.source_type === "string" ? body.source_type : undefined,
      source_text: typeof body.source_text === "string" ? body.source_text : undefined,
      source_url:
        typeof body.source_url === "string" || body.source_url === null
          ? body.source_url
          : undefined,
    },
    auth
  );

  return NextResponse.json(response.body, { status: response.status });
}
