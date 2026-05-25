import { NextRequest, NextResponse } from "next/server";
import { requireApiKey } from "@/lib/auth";
import {
  buildRunDueResponse,
  buildWatchRunFailedResponse,
  type RunDueRequestBody,
} from "@/lib/watch-run-due";

export async function GET() {
  return NextResponse.json({
    service: "lucient-evidence-mind",
    endpoint: "/api/watch/run-due",
    status: "ok",
    phase: "10",
  });
}

export async function POST(request: NextRequest) {
  try {
    const authError = requireApiKey(request);
    if (authError) {
      return authError;
    }

    let body: RunDueRequestBody = {};
    try {
      const parsed = await request.json();
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        body = parsed as RunDueRequestBody;
      }
    } catch {
      body = {};
    }

    const response = await buildRunDueResponse(body);
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(buildWatchRunFailedResponse(error), { status: 500 });
  }
}
