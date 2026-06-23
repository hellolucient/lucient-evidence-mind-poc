import { NextRequest, NextResponse } from "next/server";

import {
  authorizeReviewQueueApiRequest,
  isReviewQueueAccessContext,
} from "@/lib/operator-auth";
import { buildClaimsExtractionDetailApiResponse } from "@/lib/review/claims-extract-api";

export const runtime = "nodejs";

type ExtractionDetailRouteContext = {
  params: Promise<{ extractionId: string }>;
};

/**
 * Phase 44A — return one extraction run with source document and candidate claims.
 */
export async function GET(request: NextRequest, context: ExtractionDetailRouteContext) {
  const { extractionId } = await context.params;

  const auth = await authorizeReviewQueueApiRequest(
    {
      authorization: request.headers.get("authorization"),
    },
    `/api/claims/extractions/${extractionId}`
  );

  if (!isReviewQueueAccessContext(auth)) {
    return NextResponse.json(auth.body ?? { ok: false, error: "unauthorized" }, {
      status: auth.status,
    });
  }

  const response = await buildClaimsExtractionDetailApiResponse(extractionId, auth);
  return NextResponse.json(response.body, { status: response.status });
}
