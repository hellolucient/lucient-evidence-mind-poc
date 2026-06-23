/**
 * Phase 44A — claim extraction API aggregation.
 *
 * SAFETY: Source intake and candidate claim extraction only.
 * Must not start evidence research, create evidence briefs, send Mind digests,
 * or call HelloMinds send/live-send/retry paths.
 */
import { applyWorkspaceScopeToListFilters, type ReviewQueueAccessContext } from "@/lib/operator-auth";
import {
  CLAIM_SOURCE_TYPES,
  isSupportedClaimSourceType,
} from "@/lib/review/claim-extraction-constants";
import { extractWellnessClaimsFromSourceText } from "@/lib/review/wellness-claims-extractor";
import { CURRENT_WATCH_PHASE } from "@/lib/watch/watch-phase";
import {
  CLAIM_EXTRACTION_PRIVATE_FIELDS,
  createClaimExtraction,
  getClaimExtractionById,
  isClaimExtractionPersistenceConfigured,
  isPrivacySafeClaimExtractionPayload,
  listClaimExtractions,
  type ClaimExtractionListFilters,
  type PrivacySafeCandidateWellnessClaim,
  type PrivacySafeClaimExtractionRun,
  type PrivacySafeClaimSourceDocument,
} from "@/lib/watch/claim-extraction-store";

export const CLAIMS_EXTRACT_API_ROUTE = "/api/claims/extract" as const;
export const CLAIMS_EXTRACTIONS_API_ROUTE = "/api/claims/extractions" as const;
export const claimsExtractionDetailApiRoute = (extractionId: string) =>
  `/api/claims/extractions/${encodeURIComponent(extractionId)}` as const;

export type ClaimsExtractRequestBody = {
  workspace_id?: string;
  title?: string;
  source_type?: string;
  source_text?: string;
  source_url?: string | null;
};

export type ClaimsExtractListFilters = ClaimExtractionListFilters;

export function parseClaimsExtractListFilters(searchParams: URLSearchParams): ClaimsExtractListFilters {
  const limitParam = searchParams.get("limit");
  const parsedLimit =
    limitParam && !Number.isNaN(Number(limitParam)) ? Number(limitParam) : undefined;

  return {
    workspace_id: searchParams.get("workspace_id") ?? undefined,
    limit: parsedLimit,
  };
}

function mapExtractionError(error: string): { status: number; body: Record<string, unknown> } {
  switch (error) {
    case "forbidden":
      return {
        status: 403,
        body: {
          ok: false,
          error: "forbidden",
          phase: CURRENT_WATCH_PHASE,
          route: CLAIMS_EXTRACT_API_ROUTE,
        },
      };
    case "source_text_required":
      return {
        status: 400,
        body: {
          ok: false,
          error: "source_text_required",
          phase: CURRENT_WATCH_PHASE,
          route: CLAIMS_EXTRACT_API_ROUTE,
          message: "Source text is required.",
        },
      };
    case "title_required":
      return {
        status: 400,
        body: {
          ok: false,
          error: "title_required",
          phase: CURRENT_WATCH_PHASE,
          route: CLAIMS_EXTRACT_API_ROUTE,
          message: "Source title is required.",
        },
      };
    case "unsupported_source_type":
      return {
        status: 400,
        body: {
          ok: false,
          error: "unsupported_source_type",
          phase: CURRENT_WATCH_PHASE,
          route: CLAIMS_EXTRACT_API_ROUTE,
          message: `Source type must be one of: ${CLAIM_SOURCE_TYPES.join(", ")}.`,
        },
      };
    default:
      return {
        status: 500,
        body: {
          ok: false,
          error,
          phase: CURRENT_WATCH_PHASE,
          route: CLAIMS_EXTRACT_API_ROUTE,
        },
      };
  }
}

export async function buildClaimsExtractApiResponse(
  body: ClaimsExtractRequestBody,
  access: ReviewQueueAccessContext
): Promise<{ status: number; body: Record<string, unknown> }> {
  const workspaceId = body.workspace_id?.trim();
  const title = body.title?.trim();
  const sourceType = body.source_type?.trim();
  const sourceText = body.source_text ?? "";
  const sourceUrl = body.source_url?.trim() || null;

  if (!workspaceId) {
    return {
      status: 400,
      body: {
        ok: false,
        error: "workspace_id_required",
        phase: CURRENT_WATCH_PHASE,
        route: CLAIMS_EXTRACT_API_ROUTE,
        message: "workspace_id is required.",
      },
    };
  }

  if (!title) {
    return mapExtractionError("title_required");
  }

  if (!sourceText.trim()) {
    return mapExtractionError("source_text_required");
  }

  if (!sourceType || !isSupportedClaimSourceType(sourceType)) {
    return mapExtractionError("unsupported_source_type");
  }

  const extractedClaims = extractWellnessClaimsFromSourceText(sourceText);
  const result = await createClaimExtraction(
    {
      workspace_id: workspaceId,
      title,
      source_type: sourceType,
      source_text: sourceText,
      source_url: sourceUrl,
    },
    extractedClaims,
    access
  );

  if (!result.ok) {
    return mapExtractionError(result.error);
  }

  return {
    status: 201,
    body: {
      ok: true,
      phase: CURRENT_WATCH_PHASE,
      route: CLAIMS_EXTRACT_API_ROUTE,
      configured: isClaimExtractionPersistenceConfigured(),
      extraction: result.extraction_run,
      source_document: result.source_document,
      candidate_claim_count: result.candidate_claims.length,
      candidate_claims: result.candidate_claims,
    },
  };
}

export async function buildClaimsExtractionsListApiResponse(
  filters: ClaimsExtractListFilters,
  access: ReviewQueueAccessContext
): Promise<Record<string, unknown>> {
  const scopedFilters = applyWorkspaceScopeToListFilters(filters, access);
  const listResult = await listClaimExtractions(access, scopedFilters);

  return {
    ok: true,
    phase: CURRENT_WATCH_PHASE,
    route: CLAIMS_EXTRACTIONS_API_ROUTE,
    configured: isClaimExtractionPersistenceConfigured(),
    count: listResult.extractions.length,
    extractions: listResult.extractions,
    list_error: listResult.error ?? null,
  };
}

export async function buildClaimsExtractionDetailApiResponse(
  extractionId: string,
  access: ReviewQueueAccessContext
): Promise<{ status: number; body: Record<string, unknown> }> {
  const detail = await getClaimExtractionById(extractionId, access);

  if (detail.error === "forbidden") {
    return {
      status: 403,
      body: {
        ok: false,
        error: "forbidden",
        phase: CURRENT_WATCH_PHASE,
        route: claimsExtractionDetailApiRoute(extractionId),
      },
    };
  }

  if (!detail.extraction) {
    return {
      status: 404,
      body: {
        ok: false,
        error: "extraction_not_found",
        phase: CURRENT_WATCH_PHASE,
        route: claimsExtractionDetailApiRoute(extractionId),
      },
    };
  }

  return {
    status: 200,
    body: {
      ok: true,
      phase: CURRENT_WATCH_PHASE,
      route: claimsExtractionDetailApiRoute(extractionId),
      configured: isClaimExtractionPersistenceConfigured(),
      extraction: detail.extraction,
      source_document: detail.source_document,
      candidate_claim_count: detail.candidate_claims.length,
      candidate_claims: detail.candidate_claims,
      detail_error: detail.error ?? null,
    },
  };
}

export function assertPrivacySafeClaimExtractionResponse(payload: Record<string, unknown>): boolean {
  if (!isPrivacySafeClaimExtractionPayload(payload)) {
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

  for (const field of CLAIM_EXTRACTION_PRIVATE_FIELDS) {
    if (serialized.includes(`"${field}"`)) {
      return false;
    }
  }

  return true;
}

export type {
  PrivacySafeCandidateWellnessClaim,
  PrivacySafeClaimExtractionRun,
  PrivacySafeClaimSourceDocument,
};
