/**
 * Phase 45 — Mind claim extraction jobs API aggregation.
 *
 * SAFETY: Operator-gated Mind extraction workflow only.
 * Send respects EXTERNAL_MIND_LIVE_SEND=false (dry-run default).
 * No auto-send, retry, batch send, or scheduled polling.
 */
import type { ReviewQueueAccessContext } from "@/lib/operator-auth";
import { MIND_CLAIM_INTELLIGENCE_PHASE } from "@/lib/review/mind-claim-intelligence-constants";
import { CURRENT_WATCH_PHASE } from "@/lib/watch/watch-phase";
import {
  approveMindClaimExtractionJob,
  fetchMindClaimExtractionJobResponse,
  parseMindClaimExtractionJobResponse,
  sendMindClaimExtractionJob,
} from "@/lib/watch/mind-claim-extraction-job-service";
import {
  createMindClaimExtractionJob,
  getMindClaimExtractionJobById,
  isMindClaimExtractionPersistenceConfigured,
} from "@/lib/watch/mind-claim-extraction-job-store";
import { getSourceIntakeDocumentById } from "@/lib/watch/source-intake-store";
import { recordMindClaimIntelligenceAuditEvent } from "@/lib/watch/mind-claim-intelligence-audit-store";

export const mindExtractionJobsApiRoute = (jobId: string) =>
  `/api/mind-extraction-jobs/${encodeURIComponent(jobId)}` as const;

export async function buildCreateMindExtractionJobApiResponse(
  sourceDocumentId: string,
  body: { created_by?: string | null },
  access: ReviewQueueAccessContext
): Promise<{ status: number; body: Record<string, unknown> }> {
  const source = await getSourceIntakeDocumentById(sourceDocumentId, access);
  if (source.error === "forbidden") {
    return {
      status: 403,
      body: { ok: false, error: "forbidden", mind_phase: MIND_CLAIM_INTELLIGENCE_PHASE },
    };
  }

  if (!source.document) {
    return {
      status: 404,
      body: {
        ok: false,
        error: source.error ?? "source_document_not_found",
        mind_phase: MIND_CLAIM_INTELLIGENCE_PHASE,
      },
    };
  }

  const result = await createMindClaimExtractionJob(
    {
      workspace_id: source.document.workspace_id,
      source_document_id: sourceDocumentId,
      created_by: body.created_by,
    },
    access
  );

  if (!result.ok) {
    return {
      status: result.error === "forbidden" ? 403 : 500,
      body: { ok: false, error: result.error, mind_phase: MIND_CLAIM_INTELLIGENCE_PHASE },
    };
  }

  await recordMindClaimIntelligenceAuditEvent(
    {
      workspace_id: result.job.workspace_id,
      entity_type: "mind_claim_extraction_job",
      entity_id: result.job.extraction_job_id,
      event_type: "created",
      event_summary: "Mind claim extraction job created (pending approval).",
      actor: body.created_by ?? null,
    },
    access
  );

  return {
    status: 201,
    body: {
      ok: true,
      phase: CURRENT_WATCH_PHASE,
      mind_phase: MIND_CLAIM_INTELLIGENCE_PHASE,
      configured: isMindClaimExtractionPersistenceConfigured(),
      job: result.job,
    },
  };
}

export async function buildMindExtractionJobDetailApiResponse(
  jobId: string,
  access: ReviewQueueAccessContext
): Promise<{ status: number; body: Record<string, unknown> }> {
  const lookup = await getMindClaimExtractionJobById(jobId, access);

  if (lookup.error === "forbidden") {
    return { status: 403, body: { ok: false, error: "forbidden", mind_phase: MIND_CLAIM_INTELLIGENCE_PHASE } };
  }

  if (!lookup.job) {
    return {
      status: 404,
      body: {
        ok: false,
        error: lookup.error ?? "extraction_job_not_found",
        mind_phase: MIND_CLAIM_INTELLIGENCE_PHASE,
      },
    };
  }

  return {
    status: 200,
    body: {
      ok: true,
      phase: CURRENT_WATCH_PHASE,
      mind_phase: MIND_CLAIM_INTELLIGENCE_PHASE,
      configured: isMindClaimExtractionPersistenceConfigured(),
      job: lookup.job,
    },
  };
}

async function mapJobActionResult(
  result: Awaited<ReturnType<typeof approveMindClaimExtractionJob>>,
  extra?: Record<string, unknown>
): Promise<{ status: number; body: Record<string, unknown> }> {
  if (!result.ok) {
    const status =
      result.error === "forbidden"
        ? 403
        : result.error === "approval_required"
          ? 409
          : 400;
    return {
      status,
      body: {
        ok: false,
        error: result.error,
        message: result.message,
        mind_phase: MIND_CLAIM_INTELLIGENCE_PHASE,
      },
    };
  }

  return {
    status: 200,
    body: {
      ok: true,
      phase: CURRENT_WATCH_PHASE,
      mind_phase: MIND_CLAIM_INTELLIGENCE_PHASE,
      job: result.job,
      ...extra,
    },
  };
}

export async function buildApproveMindExtractionJobApiResponse(
  jobId: string,
  body: { operator_email?: string | null },
  access: ReviewQueueAccessContext
) {
  return mapJobActionResult(
    await approveMindClaimExtractionJob(jobId, access, { operatorEmail: body.operator_email })
  );
}

export async function buildSendMindExtractionJobApiResponse(
  jobId: string,
  body: { operator_email?: string | null },
  access: ReviewQueueAccessContext
) {
  return mapJobActionResult(
    await sendMindClaimExtractionJob(jobId, access, { operatorEmail: body.operator_email })
  );
}

export async function buildFetchMindExtractionJobResponseApiResponse(
  jobId: string,
  body: { operator_email?: string | null },
  access: ReviewQueueAccessContext
) {
  return mapJobActionResult(
    await fetchMindClaimExtractionJobResponse(jobId, access, { operatorEmail: body.operator_email })
  );
}

export async function buildParseMindExtractionJobApiResponse(
  jobId: string,
  body: { operator_email?: string | null },
  access: ReviewQueueAccessContext
) {
  const result = await parseMindClaimExtractionJobResponse(jobId, access, {
    operatorEmail: body.operator_email,
  });

  if (!result.ok) {
    const status =
      result.error === "forbidden" ? 403 : result.error === "mind_response_missing" ? 409 : 400;
    return {
      status,
      body: {
        ok: false,
        error: result.error,
        message: result.message,
        mind_phase: MIND_CLAIM_INTELLIGENCE_PHASE,
      },
    };
  }

  return {
    status: 200,
    body: {
      ok: true,
      phase: CURRENT_WATCH_PHASE,
      mind_phase: MIND_CLAIM_INTELLIGENCE_PHASE,
      job: result.job,
      candidate_claim_count: result.candidate_claim_count,
      idempotent: result.idempotent,
    },
  };
}
