import { NextRequest, NextResponse } from "next/server";

import {
  authorizeReviewQueueApiRequest,
  isReviewQueueAccessContext,
} from "@/lib/operator-auth";
import {
  buildClaimsExtractionsListApiResponse,
  parseClaimsExtractListFilters,
} from "@/lib/review/claims-extract-api";

export const runtime = "nodejs";

/**
 * Phase 44A — list recent claim extraction runs for a workspace.
 */
export async function GET(request: NextRequest) {
  const auth = await authorizeReviewQueueApiRequest(
    {
      authorization: request.headers.get("authorization"),
    },
    "/api/claims/extractions"
  );

  if (!isReviewQueueAccessContext(auth)) {
    return NextResponse.json(auth.body ?? { ok: false, error: "unauthorized" }, {
      status: auth.status,
    });
  }

  const filters = parseClaimsExtractListFilters(request.nextUrl.searchParams);
  const body = await buildClaimsExtractionsListApiResponse(filters, auth);

  return NextResponse.json(body);
}
