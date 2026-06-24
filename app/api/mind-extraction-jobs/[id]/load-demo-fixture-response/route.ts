import { NextRequest, NextResponse } from "next/server";

import {
  authorizeReviewQueueApiRequest,
  isReviewQueueAccessContext,
} from "@/lib/operator-auth";
import {
  buildLoadMindExtractionDemoFixtureResponseApiResponse,
  mindExtractionJobsApiRoute,
} from "@/lib/review/mind-extraction-jobs-api";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

async function parseBody(request: NextRequest): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** Explicit operator-triggered demo fixture load. No external Mind call. */
export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const route = `${mindExtractionJobsApiRoute(id)}/load-demo-fixture-response`;

  const auth = await authorizeReviewQueueApiRequest(
    { authorization: request.headers.get("authorization") },
    route
  );

  if (!isReviewQueueAccessContext(auth)) {
    return NextResponse.json(auth.body ?? { ok: false, error: "unauthorized" }, {
      status: auth.status,
    });
  }

  const body = await parseBody(request);
  const response = await buildLoadMindExtractionDemoFixtureResponseApiResponse(
    id,
    { operator_email: typeof body.operator_email === "string" ? body.operator_email : undefined },
    auth
  );

  return NextResponse.json(response.body, { status: response.status });
}
