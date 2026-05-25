import { NextRequest, NextResponse } from "next/server";
import { requireApiKey } from "@/lib/auth";

export const runtime = "nodejs";

function buildRouteErrorResponse(error: unknown, stage: string) {
  return {
    error: "watch_run_failed" as const,
    message:
      error instanceof Error ? error.message : "Unknown error during watch run.",
    generated_at: new Date().toISOString(),
    debug: {
      route: "/api/watch/run-due" as const,
      phase: "11" as const,
      stage,
    },
  };
}

export async function GET() {
  return NextResponse.json({
    service: "lucient-evidence-mind",
    endpoint: "/api/watch/run-due",
    status: "ok",
    phase: "11",
  });
}

export async function POST(request: NextRequest) {
  let stage = "init";

  try {
    stage = "auth";
    const authError = requireApiKey(request);
    if (authError) {
      return authError;
    }

    stage = "parse_body";
    let body: Record<string, unknown> = {};
    try {
      const parsed = await request.json();
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        body = parsed as Record<string, unknown>;
      }
    } catch {
      body = {};
    }

    if (body.debug_only === true) {
      stage = "debug_only";
      const { buildPersistenceStatus, resolveWatchlistStore } = await import(
        "@/engine/watchlist"
      );
      const selection = await resolveWatchlistStore();
      const persistenceStatus = buildPersistenceStatus(selection);

      return NextResponse.json({
        service: "lucient-evidence-mind",
        endpoint: "/api/watch/run-due",
        status: "post_ok",
        phase: "11",
        persistence_status: {
          durable: persistenceStatus.durable,
          store: persistenceStatus.store,
          adapter: persistenceStatus.adapter,
          state_survives_cold_start: persistenceStatus.state_survives_cold_start,
          suitable_for_production_monitoring:
            persistenceStatus.suitable_for_production_monitoring,
        },
        env_debug: selection.env_debug,
      });
    }

    stage = "import_run_due";
    const { buildRunDueResponse } = await import("@/lib/watch-run-due");

    stage = "run_due";
    const response = await buildRunDueResponse(body);
    return NextResponse.json(response);
  } catch (error) {
    try {
      const { buildWatchRunFailedResponse } = await import("@/lib/watch-run-due");
      return NextResponse.json(buildWatchRunFailedResponse(error, stage), {
        status: 500,
      });
    } catch {
      return NextResponse.json(buildRouteErrorResponse(error, stage), {
        status: 500,
      });
    }
  }
}
