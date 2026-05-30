import { NextRequest, NextResponse } from "next/server";
import { authorizeWatchCronRequest } from "@/lib/watch-cron";
import { listWatchRuns } from "@/lib/watch/watch-run-logger";
import { CURRENT_WATCH_PHASE } from "@/lib/watch/watch-phase";

export const runtime = "nodejs";

/**
 * Phase 13 operational history — latest watch run records from Supabase.
 *
 * Auth: same as /api/watch/cron (CRON_SECRET Bearer or vercel-cron user-agent).
 *
 *   curl -s \
 *     -H "Authorization: Bearer YOUR_CRON_SECRET" \
 *     "https://lucient-evidence-mind-poc.vercel.app/api/watch/runs?limit=10"
 */
export async function GET(request: NextRequest) {
  const auth = authorizeWatchCronRequest({
    authorization: request.headers.get("authorization"),
    userAgent: request.headers.get("user-agent"),
  });

  if (!auth.authorized) {
    return NextResponse.json(auth.body, { status: 401 });
  }

  const limitParam = request.nextUrl.searchParams.get("limit");
  const parsedLimit =
    limitParam && !Number.isNaN(Number(limitParam))
      ? Number(limitParam)
      : 20;

  const { runs, error } = await listWatchRuns(parsedLimit);

  return NextResponse.json({
    ok: true,
    phase: CURRENT_WATCH_PHASE,
    route: "/api/watch/runs",
    count: runs.length,
    limit: parsedLimit,
    runs,
    list_error: error ?? null,
  });
}
