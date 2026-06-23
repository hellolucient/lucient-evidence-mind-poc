import type { ReviewQueueAccessContext } from "@/lib/operator-auth";
import {
  WELLNESS_CLAIM_RESEARCH_STATUSES,
  isSupportedWellnessClaimResearchStatus,
} from "@/lib/review/claim-registry-constants";
import { CANDIDATE_EVIDENCE_SENSITIVITIES } from "@/lib/review/claim-extraction-constants";
import {
  isWellnessClaimsPersistenceConfigured,
  listWellnessClaims,
  type WellnessClaimListEntry,
  type WellnessClaimListFilters,
} from "@/lib/watch/wellness-claims-store";

export type ClaimsRegistryPageFilters = WellnessClaimListFilters;

export type ClaimsRegistryPageData = {
  configured: boolean;
  defaultWorkspaceId: string;
  filters: ClaimsRegistryPageFilters;
  claims: WellnessClaimListEntry[];
  listError: string | null;
  listErrorMessage: string | null;
  researchStatusOptions: readonly string[];
  evidenceSensitivityOptions: readonly string[];
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

export function parseClaimsRegistryPageWorkspaceId(
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

export function parseClaimsRegistryPageFilters(
  params: Record<string, string | string[] | undefined>
): ClaimsRegistryPageFilters {
  const researchStatus = readParam(params, "research_status");

  return {
    workspace_id: readParam(params, "workspace_id") || undefined,
    claim_family: readParam(params, "claim_family") || undefined,
    research_status:
      researchStatus && isSupportedWellnessClaimResearchStatus(researchStatus)
        ? researchStatus
        : undefined,
    evidence_sensitivity: readParam(params, "evidence_sensitivity") || undefined,
  };
}

export async function buildClaimsRegistryPageData(
  params: Record<string, string | string[] | undefined>,
  access: ReviewQueueAccessContext
): Promise<ClaimsRegistryPageData> {
  const filters = parseClaimsRegistryPageFilters(params);
  const workspaceId = parseClaimsRegistryPageWorkspaceId(params, access);
  const configured = isWellnessClaimsPersistenceConfigured();

  const listFilters: ClaimsRegistryPageFilters = {
    ...filters,
    workspace_id: filters.workspace_id ?? workspaceId,
    limit: 50,
  };

  const listResult = configured
    ? await listWellnessClaims(access, listFilters)
    : { claims: [], error: "supabase_not_configured" as const };

  return {
    configured,
    defaultWorkspaceId: workspaceId,
    filters: listFilters,
    claims: listResult.claims,
    listError: listResult.error ?? null,
    listErrorMessage:
      listResult.error === "supabase_not_configured"
        ? "Claim registry persistence is not configured."
        : listResult.error
          ? "Unable to load registered claims."
          : null,
    researchStatusOptions: WELLNESS_CLAIM_RESEARCH_STATUSES,
    evidenceSensitivityOptions: CANDIDATE_EVIDENCE_SENSITIVITIES,
  };
}
