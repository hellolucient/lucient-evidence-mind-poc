import { NextRequest, NextResponse } from "next/server";

import {
  authorizeReviewQueueApiRequest,
  isReviewQueueAccessContext,
} from "@/lib/operator-auth";
import {
  buildCreateSourceDocumentApiResponse,
  buildListSourceDocumentsApiResponse,
  SOURCE_DOCUMENTS_API_ROUTE,
} from "@/lib/review/source-documents-api";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const auth = await authorizeReviewQueueApiRequest(
    { authorization: request.headers.get("authorization") },
    SOURCE_DOCUMENTS_API_ROUTE
  );

  if (!isReviewQueueAccessContext(auth)) {
    return NextResponse.json(auth.body ?? { ok: false, error: "unauthorized" }, {
      status: auth.status,
    });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json_body" }, { status: 400 });
  }

  const response = await buildCreateSourceDocumentApiResponse(
    {
      workspace_id: typeof body.workspace_id === "string" ? body.workspace_id : undefined,
      title: typeof body.title === "string" || body.title === null ? body.title : undefined,
      source_text: typeof body.source_text === "string" ? body.source_text : undefined,
      source_type: typeof body.source_type === "string" ? body.source_type : undefined,
      created_by: typeof body.created_by === "string" ? body.created_by : undefined,
    },
    auth
  );

  return NextResponse.json(response.body, { status: response.status });
}

export async function GET(request: NextRequest) {
  const auth = await authorizeReviewQueueApiRequest(
    { authorization: request.headers.get("authorization") },
    SOURCE_DOCUMENTS_API_ROUTE
  );

  if (!isReviewQueueAccessContext(auth)) {
    return NextResponse.json(auth.body ?? { ok: false, error: "unauthorized" }, {
      status: auth.status,
    });
  }

  const body = await buildListSourceDocumentsApiResponse(request.nextUrl.searchParams, auth);
  return NextResponse.json(body);
}
