import { NextRequest, NextResponse } from "next/server";
import {
  authorizeWatchCronRequest,
  buildWatchCronResponse,
} from "@/lib/watch-cron";
import { buildWatchRunFailedResponse } from "@/lib/watch-run-due";

export const runtime = "nodejs";

/**
 * Phase 12 Vercel Cron entry point.
 *
 * Manual production smoke test (requires CRON_SECRET in Vercel env):
 *   curl -i \
 *     -H "Authorization: Bearer YOUR_CRON_SECRET" \
 *     https://lucient-evidence-mind-poc.vercel.app/api/watch/cron
 *
 * Unauthorized probe (expect 401):
 *   curl -i https://lucient-evidence-mind-poc.vercel.app/api/watch/cron
 */
export async function GET(request: NextRequest) {
  const auth = authorizeWatchCronRequest({
    authorization: request.headers.get("authorization"),
    userAgent: request.headers.get("user-agent"),
  });

  if (!auth.authorized) {
    return NextResponse.json(auth.body, { status: 401 });
  }

  try {
    const response = await buildWatchCronResponse(auth.trigger);
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(buildWatchRunFailedResponse(error, "cron_run"), {
      status: 500,
    });
  }
}
