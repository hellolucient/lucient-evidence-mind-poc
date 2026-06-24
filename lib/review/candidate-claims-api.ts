/**
 * Phase 45 — candidate claims API aggregation.
 */
import type { ReviewQueueAccessContext } from "@/lib/operator-auth";
import { MIND_CLAIM_INTELLIGENCE_PHASE } from "@/lib/review/mind-claim-intelligence-constants";
import { CURRENT_WATCH_PHASE } from "@/lib/watch/watch-phase";
import {
  acceptCandidateClaimToClientRegistry,
  rejectCandidateClaimReview,
  undoCandidateClaimReviewDecision,
} from "@/lib/watch/candidate-claim-accept-service";
import {
  getCandidateClaimById,
  isCandidateClaimsPersistenceConfigured,
  listCandidateClaimsBySourceDocument,
  updateCandidateClaim,
  type CandidateClaimUpdateInput,
} from "@/lib/watch/candidate-claims-store";
import { getSourceIntakeDocumentById } from "@/lib/watch/source-intake-store";

export const candidateClaimApiRoute = (id: string) =>
  `/api/candidate-claims/${encodeURIComponent(id)}` as const;

export async function buildListCandidateClaimsApiResponse(
  sourceDocumentId: string,
  access: ReviewQueueAccessContext
): Promise<{ status: number; body: Record<string, unknown> }> {
  const source = await getSourceIntakeDocumentById(sourceDocumentId, access);
  if (source.error === "forbidden") {
    return { status: 403, body: { ok: false, error: "forbidden", mind_phase: MIND_CLAIM_INTELLIGENCE_PHASE } };
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

  const list = await listCandidateClaimsBySourceDocument(sourceDocumentId, access);

  return {
    status: 200,
    body: {
      ok: true,
      phase: CURRENT_WATCH_PHASE,
      mind_phase: MIND_CLAIM_INTELLIGENCE_PHASE,
      configured: isCandidateClaimsPersistenceConfigured(),
      count: list.claims.length,
      candidate_claims: list.claims,
      list_error: list.error ?? null,
    },
  };
}

export async function buildPatchCandidateClaimApiResponse(
  candidateClaimId: string,
  body: CandidateClaimUpdateInput,
  access: ReviewQueueAccessContext
): Promise<{ status: number; body: Record<string, unknown> }> {
  const result = await updateCandidateClaim(candidateClaimId, access, body);

  if (!result.ok) {
    return {
      status: result.error === "forbidden" ? 403 : 400,
      body: { ok: false, error: result.error, mind_phase: MIND_CLAIM_INTELLIGENCE_PHASE },
    };
  }

  return {
    status: 200,
    body: {
      ok: true,
      phase: CURRENT_WATCH_PHASE,
      mind_phase: MIND_CLAIM_INTELLIGENCE_PHASE,
      candidate_claim: result.claim,
    },
  };
}

export async function buildAcceptCandidateClaimApiResponse(
  candidateClaimId: string,
  body: { operator_email?: string | null },
  access: ReviewQueueAccessContext
): Promise<{ status: number; body: Record<string, unknown> }> {
  const result = await acceptCandidateClaimToClientRegistry(candidateClaimId, access, {
    operatorEmail: body.operator_email,
  });

  if (!result.ok) {
    const status =
      result.error === "forbidden"
        ? 403
        : result.error === "undo_required"
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
      candidate_claim_id: result.candidate_claim_id,
      client_claim: result.client_claim,
      idempotent: result.idempotent,
    },
  };
}

export async function buildRejectCandidateClaimApiResponse(
  candidateClaimId: string,
  body: { operator_email?: string | null; operator_notes?: string | null },
  access: ReviewQueueAccessContext
): Promise<{ status: number; body: Record<string, unknown> }> {
  const result = await rejectCandidateClaimReview(candidateClaimId, access, {
    operatorEmail: body.operator_email,
    operator_notes: body.operator_notes,
  });

  if (!result.ok) {
    const status =
      result.error === "forbidden"
        ? 403
        : result.error === "undo_acceptance_required"
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
      candidate_claim_id: result.candidate_claim_id,
      idempotent: result.idempotent,
    },
  };
}

export async function buildUndoCandidateClaimApiResponse(
  candidateClaimId: string,
  body: { operator_email?: string | null },
  access: ReviewQueueAccessContext
): Promise<{ status: number; body: Record<string, unknown> }> {
  const result = await undoCandidateClaimReviewDecision(candidateClaimId, access, {
    operatorEmail: body.operator_email,
  });

  if (!result.ok) {
    const status =
      result.error === "forbidden"
        ? 403
        : result.error === "nothing_to_undo"
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
      candidate_claim_id: result.candidate_claim_id,
      candidate_claim: result.candidate_claim,
      undo_type: result.undo_type,
      client_claim_status_updated: result.client_claim_status_updated,
    },
  };
}

export async function buildGetCandidateClaimApiResponse(
  candidateClaimId: string,
  access: ReviewQueueAccessContext
): Promise<{ status: number; body: Record<string, unknown> }> {
  const lookup = await getCandidateClaimById(candidateClaimId, access);

  if (lookup.error === "forbidden") {
    return { status: 403, body: { ok: false, error: "forbidden", mind_phase: MIND_CLAIM_INTELLIGENCE_PHASE } };
  }

  if (!lookup.claim) {
    return {
      status: 404,
      body: {
        ok: false,
        error: lookup.error ?? "candidate_claim_not_found",
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
      candidate_claim: lookup.claim,
    },
  };
}
