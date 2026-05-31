import { NextRequest, NextResponse } from "next/server";

import {
  authorizeMindDigestCronRequest,
  buildMindDigestCronResponse,
} from "@/lib/mind-digest-cron";

export const runtime = "nodejs";

/**
 * Phase 30 scheduled Mind digest generation entry point.
 *
 * Manual production smoke test (requires CRON_SECRET in Vercel env):
 *   curl -i \
 *     -H "Authorization: Bearer YOUR_CRON_SECRET" \
 *     https://lucient-evidence-mind-poc.vercel.app/api/mind-digests/run-due
 *
 * Unauthorized probe (expect 401):
 *   curl -i https://lucient-evidence-mind-poc.vercel.app/api/mind-digests/run-due
 */
export async function GET(request: NextRequest) {
  const auth = authorizeMindDigestCronRequest({
    authorization: request.headers.get("authorization"),
    userAgent: request.headers.get("user-agent"),
  });

  if (!auth.authorized) {
    return NextResponse.json(auth.body, { status: 401 });
  }

  try {
    const response = await buildMindDigestCronResponse(auth.trigger);
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "mind_digest_cron_failed",
        phase: "30",
        route: "/api/mind-digests/run-due",
        message: error instanceof Error ? error.message : "Scheduled digest generation failed.",
      },
      { status: 500 }
    );
  }
}
