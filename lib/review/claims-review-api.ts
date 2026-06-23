/**
 * Phase 44B — claim registry and candidate review API aggregation.
 *
 * SAFETY: Claim review and registry only.
 * Must not start evidence research, create evidence briefs, send Mind digests,
 * or call HelloMinds send/live-send/retry paths.
 */
import { applyWorkspaceScopeToListFilters, type ReviewQueueAccessContext } from "@/lib/operator-auth";
import {
  CANDIDATE_CLAIM_STRENGTHS,
  CANDIDATE_EVIDENCE_SENSITIVITIES,
  isSupportedCandidateClaimStrength,
  isSupportedCandidateEvidenceSensitivity,
} from "@/lib/review/claim-extraction-constants";
import {
  WELLNESS_CLAIM_RESEARCH_STATUSES,
  isSupportedWellnessClaimResearchStatus,
} from "@/lib/review/claim-registry-constants";
import { CURRENT_WATCH_PHASE } from "@/lib/watch/watch-phase";
import {
  acceptCandidateWellnessClaim,
  getWellnessClaimById,
  isPrivacySafeWellnessClaimPayload,
  isWellnessClaimsPersistenceConfigured,
  listWellnessClaims,
  rejectCandidateWellnessClaim,
  updateCandidateWellnessClaim,
  WELLNESS_CLAIM_PRIVATE_FIELDS,
  type CandidateClaimUpdateInput,
  type WellnessClaimListFilters,
  type PrivacySafeWellnessClaim,
} from "@/lib/watch/wellness-claims-store";

export const CLAIMS_REGISTRY_API_ROUTE = "/api/claims" as const;
export const claimsRegistryDetailApiRoute = (claimId: string) =>
  `/api/claims/${encodeURIComponent(claimId)}` as const;
export const claimsCandidateApiRoute = (candidateClaimId: string) =>
  `/api/claims/candidates/${encodeURIComponent(candidateClaimId)}` as const;
export const claimsCandidateAcceptApiRoute = (candidateClaimId: string) =>
  `/api/claims/candidates/${encodeURIComponent(candidateClaimId)}/accept` as const;
export const claimsCandidateRejectApiRoute = (candidateClaimId: string) =>
  `/api/claims/candidates/${encodeURIComponent(candidateClaimId)}/reject` as const;

export type ClaimsRegistryListFilters = WellnessClaimListFilters;

export type CandidateClaimPatchBody = CandidateClaimUpdateInput;

export function parseClaimsRegistryListFilters(
  searchParams: URLSearchParams
): ClaimsRegistryListFilters {
  const limitParam = searchParams.get("limit");
  const parsedLimit =
    limitParam && !Number.isNaN(Number(limitParam)) ? Number(limitParam) : undefined;
  const researchStatus = searchParams.get("research_status");

  return {
    workspace_id: searchParams.get("workspace_id") ?? undefined,
    claim_family: searchParams.get("claim_family") ?? undefined,
    research_status:
      researchStatus && isSupportedWellnessClaimResearchStatus(researchStatus)
        ? researchStatus
        : undefined,
    evidence_sensitivity: searchParams.get("evidence_sensitivity") ?? undefined,
    limit: parsedLimit,
  };
}

function parseCandidatePatchBody(body: Record<string, unknown>): {
  input: CandidateClaimPatchBody;
  error?: { status: number; body: Record<string, unknown> };
} {
  const input: CandidateClaimPatchBody = {};

  if ("claim_text" in body) {
    if (typeof body.claim_text !== "string") {
      return {
        input,
        error: {
          status: 400,
          body: {
            ok: false,
            error: "invalid_claim_text",
            message: "claim_text must be a string.",
          },
        },
      };
    }

    input.claim_text = body.claim_text;
  }

  if ("claim_type" in body) {
    input.claim_type =
      body.claim_type === null || typeof body.claim_type === "string" ? body.claim_type : undefined;
    if (body.claim_type !== null && typeof body.claim_type !== "string") {
      return {
        input,
        error: {
          status: 400,
          body: { ok: false, error: "invalid_claim_type", message: "claim_type must be a string." },
        },
      };
    }
  }

  if ("claim_family" in body) {
    if (body.claim_family !== null && typeof body.claim_family !== "string") {
      return {
        input,
        error: {
          status: 400,
          body: { ok: false, error: "invalid_claim_family", message: "claim_family must be a string." },
        },
      };
    }

    input.claim_family =
      body.claim_family === null || typeof body.claim_family === "string"
        ? body.claim_family
        : undefined;
  }

  if ("subject" in body) {
    if (body.subject !== null && typeof body.subject !== "string") {
      return {
        input,
        error: {
          status: 400,
          body: { ok: false, error: "invalid_subject", message: "subject must be a string." },
        },
      };
    }

    input.subject = body.subject === null || typeof body.subject === "string" ? body.subject : undefined;
  }

  if ("predicate" in body) {
    if (body.predicate !== null && typeof body.predicate !== "string") {
      return {
        input,
        error: {
          status: 400,
          body: { ok: false, error: "invalid_predicate", message: "predicate must be a string." },
        },
      };
    }

    input.predicate =
      body.predicate === null || typeof body.predicate === "string" ? body.predicate : undefined;
  }

  if ("object" in body) {
    if (body.object !== null && typeof body.object !== "string") {
      return {
        input,
        error: {
          status: 400,
          body: { ok: false, error: "invalid_object", message: "object must be a string." },
        },
      };
    }

    input.object = body.object === null || typeof body.object === "string" ? body.object : undefined;
  }

  if ("claim_strength" in body) {
    if (typeof body.claim_strength !== "string" || !isSupportedCandidateClaimStrength(body.claim_strength)) {
      return {
        input,
        error: {
          status: 400,
          body: {
            ok: false,
            error: "unsupported_claim_strength",
            message: `claim_strength must be one of: ${CANDIDATE_CLAIM_STRENGTHS.join(", ")}.`,
          },
        },
      };
    }

    input.claim_strength = body.claim_strength;
  }

  if ("evidence_sensitivity" in body) {
    if (
      typeof body.evidence_sensitivity !== "string" ||
      !isSupportedCandidateEvidenceSensitivity(body.evidence_sensitivity)
    ) {
      return {
        input,
        error: {
          status: 400,
          body: {
            ok: false,
            error: "unsupported_evidence_sensitivity",
            message: `evidence_sensitivity must be one of: ${CANDIDATE_EVIDENCE_SENSITIVITIES.join(", ")}.`,
          },
        },
      };
    }

    input.evidence_sensitivity = body.evidence_sensitivity;
  }

  if ("is_direct_claim" in body) {
    if (typeof body.is_direct_claim !== "boolean") {
      return {
        input,
        error: {
          status: 400,
          body: {
            ok: false,
            error: "invalid_is_direct_claim",
            message: "is_direct_claim must be a boolean.",
          },
        },
      };
    }

    input.is_direct_claim = body.is_direct_claim;
  }

  if ("needs_research" in body) {
    if (typeof body.needs_research !== "boolean") {
      return {
        input,
        error: {
          status: 400,
          body: {
            ok: false,
            error: "invalid_needs_research",
            message: "needs_research must be a boolean.",
          },
        },
      };
    }

    input.needs_research = body.needs_research;
  }

  return { input };
}

function mapCandidateReviewError(
  error: string,
  route: string
): { status: number; body: Record<string, unknown> } {
  switch (error) {
    case "forbidden":
      return {
        status: 403,
        body: { ok: false, error: "forbidden", phase: CURRENT_WATCH_PHASE, route },
      };
    case "candidate_claim_not_found":
      return {
        status: 404,
        body: {
          ok: false,
          error: "candidate_claim_not_found",
          phase: CURRENT_WATCH_PHASE,
          route,
        },
      };
    case "candidate_claim_not_editable":
      return {
        status: 409,
        body: {
          ok: false,
          error: "candidate_claim_not_editable",
          phase: CURRENT_WATCH_PHASE,
          route,
          message: "Only candidate-status claims can be edited.",
        },
      };
    case "candidate_claim_rejected":
      return {
        status: 409,
        body: {
          ok: false,
          error: "candidate_claim_rejected",
          phase: CURRENT_WATCH_PHASE,
          route,
          message: "Rejected candidates cannot be accepted.",
        },
      };
    case "candidate_claim_already_accepted":
      return {
        status: 409,
        body: {
          ok: false,
          error: "candidate_claim_already_accepted",
          phase: CURRENT_WATCH_PHASE,
          route,
          message: "Accepted candidates cannot be rejected.",
        },
      };
    case "claim_text_required":
      return {
        status: 400,
        body: {
          ok: false,
          error: "claim_text_required",
          phase: CURRENT_WATCH_PHASE,
          route,
          message: "claim_text cannot be empty.",
        },
      };
    case "no_candidate_fields_to_update":
      return {
        status: 400,
        body: {
          ok: false,
          error: "no_candidate_fields_to_update",
          phase: CURRENT_WATCH_PHASE,
          route,
          message: "Provide at least one editable candidate field.",
        },
      };
    default:
      return {
        status: 500,
        body: { ok: false, error, phase: CURRENT_WATCH_PHASE, route },
      };
  }
}

export async function buildClaimsRegistryListApiResponse(
  filters: ClaimsRegistryListFilters,
  access: ReviewQueueAccessContext
): Promise<Record<string, unknown>> {
  const scopedFilters = applyWorkspaceScopeToListFilters(filters, access);
  const listResult = await listWellnessClaims(access, scopedFilters);

  return {
    ok: true,
    phase: CURRENT_WATCH_PHASE,
    route: CLAIMS_REGISTRY_API_ROUTE,
    configured: isWellnessClaimsPersistenceConfigured(),
    count: listResult.claims.length,
    claims: listResult.claims,
    list_error: listResult.error ?? null,
    supported_research_statuses: WELLNESS_CLAIM_RESEARCH_STATUSES,
  };
}

export async function buildClaimRegistryDetailApiResponse(
  claimId: string,
  access: ReviewQueueAccessContext
): Promise<{ status: number; body: Record<string, unknown> }> {
  const route = claimsRegistryDetailApiRoute(claimId);
  const lookup = await getWellnessClaimById(claimId, access);

  if (lookup.error === "forbidden") {
    return {
      status: 403,
      body: { ok: false, error: "forbidden", phase: CURRENT_WATCH_PHASE, route },
    };
  }

  if (!lookup.claim) {
    return {
      status: 404,
      body: { ok: false, error: "claim_not_found", phase: CURRENT_WATCH_PHASE, route },
    };
  }

  return {
    status: 200,
    body: {
      ok: true,
      phase: CURRENT_WATCH_PHASE,
      route,
      configured: isWellnessClaimsPersistenceConfigured(),
      claim: lookup.claim,
      detail_error: lookup.error ?? null,
    },
  };
}

export async function buildCandidateClaimPatchApiResponse(
  candidateClaimId: string,
  body: Record<string, unknown>,
  access: ReviewQueueAccessContext
): Promise<{ status: number; body: Record<string, unknown> }> {
  const route = claimsCandidateApiRoute(candidateClaimId);
  const parsed = parseCandidatePatchBody(body);

  if (parsed.error) {
    return {
      status: parsed.error.status,
      body: {
        ...parsed.error.body,
        phase: CURRENT_WATCH_PHASE,
        route,
      },
    };
  }

  const result = await updateCandidateWellnessClaim(candidateClaimId, parsed.input, access);
  if (!result.ok) {
    return mapCandidateReviewError(result.error, route);
  }

  return {
    status: 200,
    body: {
      ok: true,
      phase: CURRENT_WATCH_PHASE,
      route,
      configured: isWellnessClaimsPersistenceConfigured(),
      candidate: result.candidate,
    },
  };
}

export async function buildCandidateClaimAcceptApiResponse(
  candidateClaimId: string,
  access: ReviewQueueAccessContext
): Promise<{ status: number; body: Record<string, unknown> }> {
  const route = claimsCandidateAcceptApiRoute(candidateClaimId);
  const result = await acceptCandidateWellnessClaim(candidateClaimId, access);

  if (!result.ok) {
    return mapCandidateReviewError(result.error, route);
  }

  return {
    status: result.already_accepted ? 200 : 201,
    body: {
      ok: true,
      phase: CURRENT_WATCH_PHASE,
      route,
      configured: isWellnessClaimsPersistenceConfigured(),
      claim: result.claim,
      candidate: result.candidate,
      already_accepted: result.already_accepted,
      research_status: result.claim.research_status,
    },
  };
}

export async function buildCandidateClaimRejectApiResponse(
  candidateClaimId: string,
  access: ReviewQueueAccessContext
): Promise<{ status: number; body: Record<string, unknown> }> {
  const route = claimsCandidateRejectApiRoute(candidateClaimId);
  const result = await rejectCandidateWellnessClaim(candidateClaimId, access);

  if (!result.ok) {
    return mapCandidateReviewError(result.error, route);
  }

  return {
    status: 200,
    body: {
      ok: true,
      phase: CURRENT_WATCH_PHASE,
      route,
      configured: isWellnessClaimsPersistenceConfigured(),
      candidate: result.candidate,
      already_rejected: result.already_rejected,
    },
  };
}

export function assertPrivacySafeClaimRegistryResponse(payload: Record<string, unknown>): boolean {
  if (!isPrivacySafeWellnessClaimPayload(payload)) {
    return false;
  }

  const forbiddenValues = [
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.INTERNAL_REVIEW_ACCESS_TOKEN,
    process.env.EXTERNAL_MIND_HELLOMINDS_BEARER_TOKEN,
  ].filter(Boolean);

  const serialized = JSON.stringify(payload);
  for (const secret of forbiddenValues) {
    if (secret && serialized.includes(secret)) {
      return false;
    }
  }

  for (const field of WELLNESS_CLAIM_PRIVATE_FIELDS) {
    if (serialized.includes(`"${field}"`)) {
      return false;
    }
  }

  return true;
}

export type { PrivacySafeWellnessClaim };
