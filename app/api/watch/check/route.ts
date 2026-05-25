import { NextRequest, NextResponse } from "next/server";
import { requireApiKey } from "@/lib/auth";
import {
  buildWatchCheckResponse,
  type WatchCheckBaseline,
  type WatchCheckRequestBody,
} from "@/lib/watch-check";

function isValidBaseline(value: unknown): value is WatchCheckBaseline {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const baseline = value as Record<string, unknown>;

  return (
    typeof baseline.last_checked_date === "string" &&
    baseline.last_checked_date.trim().length > 0 &&
    Array.isArray(baseline.known_pmids) &&
    baseline.known_pmids.every((pmid) => typeof pmid === "string") &&
    typeof baseline.baseline_evidence_grade === "string" &&
    baseline.baseline_evidence_grade.trim().length > 0 &&
    typeof baseline.baseline_policy === "string" &&
    baseline.baseline_policy.trim().length > 0
  );
}

export async function POST(request: NextRequest) {
  const authError = requireApiKey(request);
  if (authError) {
    return authError;
  }

  let body: WatchCheckRequestBody;
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

  const watchTopicId = body.watch_topic_id?.trim();
  if (!watchTopicId) {
    return NextResponse.json(
      { error: "Validation error: watch_topic_id is required." },
      { status: 400 }
    );
  }

  const claimFamily = body.claim_family?.trim();
  if (!claimFamily) {
    return NextResponse.json(
      { error: "Validation error: claim_family is required." },
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

  if (!isValidBaseline(body.baseline)) {
    return NextResponse.json(
      {
        error:
          "Validation error: baseline requires last_checked_date, known_pmids (array), baseline_evidence_grade, and baseline_policy.",
      },
      { status: 400 }
    );
  }

  const response = await buildWatchCheckResponse(
    workspaceId,
    watchTopicId,
    claimFamily,
    query,
    body.baseline,
    body.filters
  );

  return NextResponse.json(response);
}
