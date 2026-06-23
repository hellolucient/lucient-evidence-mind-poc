import { NextRequest, NextResponse } from "next/server";

import {
  authorizeReviewQueueApiRequest,
  isReviewQueueAccessContext,
} from "@/lib/operator-auth";
import {
  buildClaimsRegistryListApiResponse,
  parseClaimsRegistryListFilters,
} from "@/lib/review/claims-review-api";

export const runtime = "nodejs";

/**
 * Phase 44B — registered wellness claims registry list.
 *
 * SAFETY: Claim review and registry only.
 * Must not start evidence research, create evidence briefs, send Mind digests,
 * or call HelloMinds send/live-send/retry paths.
 */
export async function GET(request: NextRequest) {
  const auth = await authorizeReviewQueueApiRequest(
    {
      authorization: request.headers.get("authorization"),
    },
    "/api/claims"
  );

  if (!isReviewQueueAccessContext(auth)) {
    return NextResponse.json(auth.body ?? { ok: false, error: "unauthorized" }, {
      status: auth.status,
    });
  }

  const filters = parseClaimsRegistryListFilters(request.nextUrl.searchParams);
  const body = await buildClaimsRegistryListApiResponse(filters, auth);

  return NextResponse.json(body);
}
