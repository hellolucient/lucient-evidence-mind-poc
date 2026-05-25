import { NextRequest, NextResponse } from "next/server";
import { requireApiKey } from "@/lib/auth";
import {
  buildQueryResponse,
  type QueryRequestBody,
} from "@/lib/query-response";
import { isValidSimulatedChangeType } from "@/lib/evidence-monitoring";

export async function POST(request: NextRequest) {
  const authError = requireApiKey(request);
  if (authError) {
    return authError;
  }

  let body: QueryRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body: expected JSON." },
      { status: 400 }
    );
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { error: "Invalid request body: expected a JSON object." },
      { status: 400 }
    );
  }

  const workspaceId = body.workspace_id?.trim();
  if (!workspaceId) {
    return NextResponse.json(
      { error: "Validation error: workspace_id is required." },
      { status: 400 }
    );
  }

  const query = body.query?.trim();
  if (!query) {
    return NextResponse.json(
      { error: "Validation error: query is required." },
      { status: 400 }
    );
  }

  if (body.mode !== undefined && body.mode !== "evidence_brief") {
    return NextResponse.json(
      { error: 'Validation error: mode must be "evidence_brief" when provided.' },
      { status: 400 }
    );
  }

  if (
    body.filters?.simulated_change_type !== undefined &&
    !isValidSimulatedChangeType(body.filters.simulated_change_type)
  ) {
    return NextResponse.json(
      {
        error:
          'Validation error: simulated_change_type must be "none", "weak_new_source", "potentially_material_new_source", or "regulatory_warning".',
      },
      { status: 400 }
    );
  }

  const response = await buildQueryResponse(workspaceId, query, body.filters);
  return NextResponse.json(response);
}
