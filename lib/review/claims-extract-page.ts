import type { ReviewQueueAccessContext } from "@/lib/operator-auth";
import { CLAIM_SOURCE_TYPES } from "@/lib/review/claim-extraction-constants";
import {
  isClaimExtractionPersistenceConfigured,
  listClaimExtractions,
  type PrivacySafeCandidateWellnessClaim,
} from "@/lib/watch/claim-extraction-store";

export type ClaimsExtractPageData = {
  configured: boolean;
  defaultWorkspaceId: string;
  sourceTypeOptions: readonly string[];
  recentExtractions: Array<{
    extraction_id: string;
    source_title: string;
    source_type: string;
    candidate_claim_count: number;
    status: string;
    created_at: string;
  }>;
  listError: string | null;
  listErrorMessage: string | null;
};

export type ClaimsExtractResultData = {
  extraction_id: string;
  candidate_claim_count: number;
  candidate_claims: PrivacySafeCandidateWellnessClaim[];
};

function readParam(
  params: Record<string, string | string[] | undefined>,
  key: string
): string | undefined {
  const value = params[key];
  if (Array.isArray(value)) {
    return value[0] ?? undefined;
  }

  return value ?? undefined;
}

export function parseClaimsExtractPageWorkspaceId(
  params: Record<string, string | string[] | undefined>,
  access: ReviewQueueAccessContext
): string {
  const fromQuery = readParam(params, "workspace_id");
  if (fromQuery?.trim()) {
    return fromQuery.trim();
  }

  if (access.mode === "operator") {
    return access.workspaceIds[0] ?? "demo-workspace-spa-menu";
  }

  return "demo-workspace-spa-menu";
}

export async function buildClaimsExtractPageData(
  params: Record<string, string | string[] | undefined>,
  access: ReviewQueueAccessContext
): Promise<ClaimsExtractPageData> {
  const workspaceId = parseClaimsExtractPageWorkspaceId(params, access);
  const configured = isClaimExtractionPersistenceConfigured();
  const listResult = configured
    ? await listClaimExtractions(access, { workspace_id: workspaceId, limit: 20 })
    : { extractions: [], error: "supabase_not_configured" as const };

  return {
    configured,
    defaultWorkspaceId: workspaceId,
    sourceTypeOptions: CLAIM_SOURCE_TYPES,
    recentExtractions: listResult.extractions.map((entry) => ({
      extraction_id: entry.extraction_id,
      source_title: entry.source_title,
      source_type: entry.source_type,
      candidate_claim_count: entry.candidate_claim_count,
      status: entry.status,
      created_at: entry.created_at,
    })),
    listError: listResult.error ?? null,
    listErrorMessage:
      listResult.error === "supabase_not_configured"
        ? "Claim extraction persistence is not configured."
        : listResult.error
          ? "Unable to load recent extractions."
          : null,
  };
}
