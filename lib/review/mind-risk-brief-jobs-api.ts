/**
 * Phase 45 — Mind claim risk brief jobs API aggregation.
 *
 * SAFETY: Operator-gated Mind risk brief workflow only.
 * Send respects EXTERNAL_MIND_LIVE_SEND=false (dry-run default).
 * No auto-send, retry, batch send, or scheduled polling.
 */
import type { ReviewQueueAccessContext } from "@/lib/operator-auth";
import { MIND_CLAIM_INTELLIGENCE_PHASE } from "@/lib/review/mind-claim-intelligence-constants";
import { CURRENT_WATCH_PHASE } from "@/lib/watch/watch-phase";
import { getClientClaimUuidById } from "@/lib/watch/candidate-claim-accept-service";
import {
  approveMindClaimRiskBriefJob,
  fetchMindClaimRiskBriefJobResponse,
  loadMindClaimRiskBriefDemoFixtureResponse,
  parseMindClaimRiskBriefJobResponse,
  sendMindClaimRiskBriefJob,
} from "@/lib/watch/mind-claim-risk-brief-job-service";
import {
  createMindClaimRiskBriefJob,
  getMindClaimRiskBriefById,
  getMindClaimRiskBriefJobById,
  getLatestMindClaimRiskBriefJobByClientClaim,
  isMindClaimRiskBriefPersistenceConfigured,
  listMindClaimRiskBriefsByClientClaim,
} from "@/lib/watch/mind-claim-risk-brief-store";
import { listMindClaimIntelligenceAuditEvents } from "@/lib/watch/mind-claim-intelligence-audit-store";
import { recordMindClaimIntelligenceAuditEvent } from "@/lib/watch/mind-claim-intelligence-audit-store";

export const mindRiskBriefJobsApiRoute = (jobId: string) =>
  `/api/mind-risk-brief-jobs/${encodeURIComponent(jobId)}` as const;

export const mindRiskBriefsApiRoute = (briefId: string) =>
  `/api/mind-risk-briefs/${encodeURIComponent(briefId)}` as const;

export async function buildCreateMindRiskBriefJobApiResponse(
  clientClaimUuid: string,
  body: { created_by?: string | null },
  access: ReviewQueueAccessContext
): Promise<{ status: number; body: Record<string, unknown> }> {
  const claim = await getClientClaimUuidById(clientClaimUuid, access);
  if (claim.error === "forbidden") {
    return { status: 403, body: { ok: false, error: "forbidden", mind_phase: MIND_CLAIM_INTELLIGENCE_PHASE } };
  }

  if (!claim.claim) {
    return {
      status: 404,
      body: {
        ok: false,
        error: claim.error ?? "client_claim_not_found",
        mind_phase: MIND_CLAIM_INTELLIGENCE_PHASE,
      },
    };
  }

  const result = await createMindClaimRiskBriefJob(
    {
      workspace_id: claim.claim.workspace_id,
      client_claim_id: clientClaimUuid,
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
      entity_type: "mind_claim_risk_brief_job",
      entity_id: result.job.risk_brief_job_id,
      event_type: "created",
      event_summary: "Mind claim risk brief job created (pending approval).",
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
      configured: isMindClaimRiskBriefPersistenceConfigured(),
      job: result.job,
    },
  };
}

async function mapRiskBriefJobActionResult(
  result: Awaited<ReturnType<typeof approveMindClaimRiskBriefJob>>,
  extra?: Record<string, unknown>
): Promise<{ status: number; body: Record<string, unknown> }> {
  if (!result.ok) {
    const status =
      result.error === "forbidden"
        ? 403
        : result.error === "approval_required"
          ? 409
          : result.error === "fixture_blocked_live_external_ids"
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
      ...(typeof (result as { fetch_notice?: unknown }).fetch_notice === "string"
        ? { fetch_notice: (result as { fetch_notice: string }).fetch_notice }
        : {}),
      ...(typeof (result as { fetch_diagnostics?: unknown }).fetch_diagnostics === "object" &&
      (result as { fetch_diagnostics?: unknown }).fetch_diagnostics
        ? { fetch_diagnostics: (result as { fetch_diagnostics: unknown }).fetch_diagnostics }
        : {}),
      ...extra,
    },
  };
}

export async function buildApproveMindRiskBriefJobApiResponse(
  jobId: string,
  body: { operator_email?: string | null },
  access: ReviewQueueAccessContext
) {
  return mapRiskBriefJobActionResult(
    await approveMindClaimRiskBriefJob(jobId, access, { operatorEmail: body.operator_email })
  );
}

export async function buildSendMindRiskBriefJobApiResponse(
  jobId: string,
  body: { operator_email?: string | null },
  access: ReviewQueueAccessContext
) {
  return mapRiskBriefJobActionResult(
    await sendMindClaimRiskBriefJob(jobId, access, { operatorEmail: body.operator_email })
  );
}

export async function buildFetchMindRiskBriefJobResponseApiResponse(
  jobId: string,
  body: { operator_email?: string | null },
  access: ReviewQueueAccessContext
) {
  return mapRiskBriefJobActionResult(
    await fetchMindClaimRiskBriefJobResponse(jobId, access, { operatorEmail: body.operator_email })
  );
}

export async function buildLoadMindRiskBriefDemoFixtureResponseApiResponse(
  jobId: string,
  body: { operator_email?: string | null },
  access: ReviewQueueAccessContext
) {
  return mapRiskBriefJobActionResult(
    await loadMindClaimRiskBriefDemoFixtureResponse(jobId, access, {
      operatorEmail: body.operator_email,
    })
  );
}

export async function buildParseMindRiskBriefJobApiResponse(
  jobId: string,
  body: { operator_email?: string | null },
  access: ReviewQueueAccessContext
) {
  const result = await parseMindClaimRiskBriefJobResponse(jobId, access, {
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
      risk_brief_id: result.risk_brief_id,
      idempotent: result.idempotent,
      message: result.message,
    },
  };
}

export async function buildListMindRiskBriefsApiResponse(
  clientClaimUuid: string,
  access: ReviewQueueAccessContext
): Promise<{ status: number; body: Record<string, unknown> }> {
  const claim = await getClientClaimUuidById(clientClaimUuid, access);
  if (claim.error === "forbidden") {
    return { status: 403, body: { ok: false, error: "forbidden", mind_phase: MIND_CLAIM_INTELLIGENCE_PHASE } };
  }

  if (!claim.claim) {
    return {
      status: 404,
      body: {
        ok: false,
        error: claim.error ?? "client_claim_not_found",
        mind_phase: MIND_CLAIM_INTELLIGENCE_PHASE,
      },
    };
  }

  const briefs = await listMindClaimRiskBriefsByClientClaim(clientClaimUuid, access);
  const latestJob = await getLatestMindClaimRiskBriefJobByClientClaim(clientClaimUuid, access);
  const audit = await listMindClaimIntelligenceAuditEvents(access, {
    workspace_id: claim.claim.workspace_id,
    entity_type: "mind_claim_risk_brief",
    limit: 20,
  });

  return {
    status: 200,
    body: {
      ok: true,
      phase: CURRENT_WATCH_PHASE,
      mind_phase: MIND_CLAIM_INTELLIGENCE_PHASE,
      configured: isMindClaimRiskBriefPersistenceConfigured(),
      latest_job: latestJob.job,
      latest_job_error: latestJob.error ?? null,
      count: briefs.briefs.length,
      risk_briefs: briefs.briefs,
      audit_events: audit.events,
      list_error: briefs.error ?? null,
    },
  };
}

export async function buildMindRiskBriefDetailApiResponse(
  briefId: string,
  access: ReviewQueueAccessContext
): Promise<{ status: number; body: Record<string, unknown> }> {
  const lookup = await getMindClaimRiskBriefById(briefId, access);

  if (lookup.error === "forbidden") {
    return { status: 403, body: { ok: false, error: "forbidden", mind_phase: MIND_CLAIM_INTELLIGENCE_PHASE } };
  }

  if (!lookup.brief) {
    return {
      status: 404,
      body: {
        ok: false,
        error: lookup.error ?? "risk_brief_not_found",
        mind_phase: MIND_CLAIM_INTELLIGENCE_PHASE,
      },
    };
  }

  const audit = await listMindClaimIntelligenceAuditEvents(access, {
    workspace_id: lookup.brief.workspace_id,
    entity_id: briefId,
    limit: 20,
  });

  return {
    status: 200,
    body: {
      ok: true,
      phase: CURRENT_WATCH_PHASE,
      mind_phase: MIND_CLAIM_INTELLIGENCE_PHASE,
      risk_brief: lookup.brief,
      audit_events: audit.events,
    },
  };
}

export async function buildMindRiskBriefJobDetailApiResponse(
  jobId: string,
  access: ReviewQueueAccessContext
): Promise<{ status: number; body: Record<string, unknown> }> {
  const lookup = await getMindClaimRiskBriefJobById(jobId, access);

  if (lookup.error === "forbidden") {
    return { status: 403, body: { ok: false, error: "forbidden", mind_phase: MIND_CLAIM_INTELLIGENCE_PHASE } };
  }

  if (!lookup.job) {
    return {
      status: 404,
      body: {
        ok: false,
        error: lookup.error ?? "risk_brief_job_not_found",
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
      job: lookup.job,
    },
  };
}
