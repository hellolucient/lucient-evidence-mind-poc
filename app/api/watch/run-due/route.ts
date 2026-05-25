import { NextRequest, NextResponse } from "next/server";
import { requireApiKey } from "@/lib/auth";
import {
  buildRunDueResponse,
  type RunDueRequestBody,
} from "@/lib/watch-run-due";

export async function POST(request: NextRequest) {
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
}
