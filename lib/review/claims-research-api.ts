/**
 * Phase 44C — single-claim evidence research API aggregation.
 *
 * SAFETY: Controlled internal research only.
 * Must not send Mind digests or call HelloMinds send/live-send/retry paths.
 */
import type { ReviewQueueAccessContext } from "@/lib/operator-auth";
import { CLAIM_RESEARCH_MODES } from "@/lib/review/claim-research-constants";
import { CURRENT_WATCH_PHASE } from "@/lib/watch/watch-phase";
import {
  CLAIM_RESEARCH_PRIVATE_FIELDS,
  getClaimResearchRunById,
  isClaimResearchPersistenceConfigured,
  isPrivacySafeClaimResearchPayload,
  listClaimResearchRuns,
  runControlledClaimResearchForClaim,
  type PrivacySafeClaimResearchRun,
} from "@/lib/watch/claim-research-store";

export const claimsResearchApiRoute = (claimId: string) =>
  `/api/claims/${encodeURIComponent(claimId)}/research` as const;

export const claimsResearchRunsApiRoute = (claimId: string) =>
  `/api/claims/${encodeURIComponent(claimId)}/research-runs` as const;

export const claimsResearchRunDetailApiRoute = (claimId: string, researchRunId: string) =>
  `/api/claims/${encodeURIComponent(claimId)}/research-runs/${encodeURIComponent(researchRunId)}` as const;

function mapResearchError(
  error: string,
  route: string
): { status: number; body: Record<string, unknown> } {
  switch (error) {
    case "forbidden":
      return {
        status: 403,
        body: { ok: false, error: "forbidden", phase: CURRENT_WATCH_PHASE, route },
      };
    case "claim_not_found":
      return {
        status: 404,
        body: { ok: false, error: "claim_not_found", phase: CURRENT_WATCH_PHASE, route },
      };
    case "claim_not_research_eligible":
      return {
        status: 409,
        body: {
          ok: false,
          error: "claim_not_research_eligible",
          phase: CURRENT_WATCH_PHASE,
          route,
          message: "Only active, accepted claims can be researched.",
        },
      };
  case "research_run_not_found":
      return {
        status: 404,
        body: {
          ok: false,
          error: "research_run_not_found",
          phase: CURRENT_WATCH_PHASE,
          route,
        },
      };
    default:
      return {
        status: 500,
        body: { ok: false, error, phase: CURRENT_WATCH_PHASE, route },
      };
  }
}

export async function buildClaimResearchPostApiResponse(
  claimId: string,
  access: ReviewQueueAccessContext
): Promise<{ status: number; body: Record<string, unknown> }> {
  const route = claimsResearchApiRoute(claimId);
  const result = await runControlledClaimResearchForClaim(claimId, access);

  if (!result.ok) {
    return mapResearchError(result.error, route);
  }

  return {
    status: 201,
    body: {
      ok: true,
      phase: CURRENT_WATCH_PHASE,
      route,
      configured: isClaimResearchPersistenceConfigured(),
      claim: result.claim,
      research_run: result.run,
      supported_research_modes: CLAIM_RESEARCH_MODES,
      controlled_mode: result.run.research_mode === "mock_evidence_v1",
    },
  };
}

export async function buildClaimResearchRunsListApiResponse(
  claimId: string,
  access: ReviewQueueAccessContext
): Promise<{ status: number; body: Record<string, unknown> }> {
  const route = claimsResearchRunsApiRoute(claimId);
  const listResult = await listClaimResearchRuns(claimId, access);

  if (listResult.error === "forbidden") {
    return mapResearchError("forbidden", route);
  }

  if (listResult.error === "claim_not_found") {
    return mapResearchError("claim_not_found", route);
  }

  return {
    status: 200,
    body: {
      ok: true,
      phase: CURRENT_WATCH_PHASE,
      route,
      configured: isClaimResearchPersistenceConfigured(),
      claim_id: claimId,
      count: listResult.runs.length,
      research_runs: listResult.runs,
      list_error: listResult.error ?? null,
    },
  };
}

export async function buildClaimResearchRunDetailApiResponse(
  claimId: string,
  researchRunId: string,
  access: ReviewQueueAccessContext
): Promise<{ status: number; body: Record<string, unknown> }> {
  const route = claimsResearchRunDetailApiRoute(claimId, researchRunId);
  const lookup = await getClaimResearchRunById(claimId, researchRunId, access);

  if (lookup.error === "forbidden") {
    return mapResearchError("forbidden", route);
  }

  if (lookup.error === "claim_not_found") {
    return mapResearchError("claim_not_found", route);
  }

  if (!lookup.run) {
    return mapResearchError("research_run_not_found", route);
  }

  return {
    status: 200,
    body: {
      ok: true,
      phase: CURRENT_WATCH_PHASE,
      route,
      configured: isClaimResearchPersistenceConfigured(),
      claim_id: claimId,
      research_run: lookup.run,
      detail_error: lookup.error ?? null,
    },
  };
}

export function assertPrivacySafeClaimResearchResponse(payload: Record<string, unknown>): boolean {
  if (!isPrivacySafeClaimResearchPayload(payload)) {
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

  for (const field of CLAIM_RESEARCH_PRIVATE_FIELDS) {
    if (serialized.includes(`"${field}"`)) {
      return false;
    }
  }

  return true;
}

export type { PrivacySafeClaimResearchRun };
