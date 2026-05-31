import {
  CLIENT_CLAIMS_TABLE,
  CLIENT_CLAIM_WATCHLIST_MAPPINGS_TABLE,
  createSupabaseServerClient,
  getSupabaseEnvConfig,
} from "@/engine/watchlist/supabase-client";
import { sanitizeWatchRunErrorMessage } from "@/lib/watch/watch-run-logger";
import type { ClientClaimRecord, ClientClaimRiskLevel, ClientClaimStatus } from "./client-claim-mapper";

export type AffectedClientClaimRef = {
  workspace_id: string;
  client_claim_id: string;
  claim_family: string;
  claim_text: string;
  claim_source_type: string | null;
  claim_source_label: string | null;
  risk_level: string | null;
  status: string;
};

function isMissingTableError(error: { code?: string; message?: string }): boolean {
  const message = error.message?.toLowerCase() ?? "";
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    message.includes("does not exist") ||
    message.includes("schema cache") ||
    message.includes("could not find the table")
  );
}

function normalizeStoreError(error: unknown): string {
  const sanitized = sanitizeWatchRunErrorMessage(error);

  if (
    typeof error === "object" &&
    error !== null &&
    isMissingTableError(error as { code?: string; message?: string })
  ) {
    return "client_claim_watchlist_mappings_table_missing";
  }

  return sanitized;
}

function toClientClaimRecordFromAffectedRef(ref: AffectedClientClaimRef): ClientClaimRecord {
  const riskLevel = ref.risk_level;
  const normalizedRisk: ClientClaimRiskLevel =
    riskLevel === "low" || riskLevel === "medium" || riskLevel === "high"
      ? riskLevel
      : "medium";

  const status = ref.status;
  const normalizedStatus: ClientClaimStatus =
    status === "active" || status === "archived" ? status : "active";

  return {
    id: ref.client_claim_id,
    workspace_id: ref.workspace_id,
    claim_text: ref.claim_text,
    claim_context: "",
    source_type: ref.claim_source_type ?? "unknown",
    source_label: ref.claim_source_label ?? "",
    claim_family_id: ref.claim_family,
    status: normalizedStatus,
    risk_level: normalizedRisk,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export function isAffectedClientClaimResolutionConfigured(): boolean {
  const { hasSupabaseUrl, hasSupabaseServiceRoleKey } = getSupabaseEnvConfig();
  return hasSupabaseUrl && hasSupabaseServiceRoleKey;
}

export async function resolveAffectedClientClaimsByClaimFamily(
  claimFamily: string
): Promise<{ claims: AffectedClientClaimRef[]; error?: string }> {
  if (!claimFamily.trim()) {
    return { claims: [] };
  }

  if (!isAffectedClientClaimResolutionConfigured()) {
    return { claims: [], error: "supabase_not_configured" };
  }

  try {
    const client = createSupabaseServerClient();
    const { data: mappings, error: mappingError } = await client
      .from(CLIENT_CLAIM_WATCHLIST_MAPPINGS_TABLE)
      .select("workspace_id, client_claim_id, claim_family")
      .eq("claim_family", claimFamily.trim())
      .eq("mapping_status", "active");

    if (mappingError) {
      return { claims: [], error: normalizeStoreError(mappingError) };
    }

    if (!mappings?.length) {
      return { claims: [] };
    }

    const claims: AffectedClientClaimRef[] = [];

    for (const mapping of mappings) {
      const { data: claimRow, error: claimError } = await client
        .from(CLIENT_CLAIMS_TABLE)
        .select(
          "workspace_id, client_claim_id, claim_text, claim_source_type, claim_source_label, risk_level, status, claim_family"
        )
        .eq("workspace_id", mapping.workspace_id)
        .eq("client_claim_id", mapping.client_claim_id)
        .eq("status", "active")
        .maybeSingle();

      if (claimError) {
        return { claims: [], error: normalizeStoreError(claimError) };
      }

      if (claimRow) {
        claims.push({
          workspace_id: claimRow.workspace_id,
          client_claim_id: claimRow.client_claim_id,
          claim_family: mapping.claim_family,
          claim_text: claimRow.claim_text,
          claim_source_type: claimRow.claim_source_type,
          claim_source_label: claimRow.claim_source_label,
          risk_level: claimRow.risk_level,
          status: claimRow.status,
        });
      }
    }

    return { claims };
  } catch (error) {
    return { claims: [], error: normalizeStoreError(error) };
  }
}

export async function findAffectedClientClaimsForClaimFamilyAsync(
  claimFamilyId: string
): Promise<ClientClaimRecord[]> {
  const durableResult = await resolveAffectedClientClaimsByClaimFamily(claimFamilyId);

  if (durableResult.claims.length > 0) {
    return durableResult.claims.map(toClientClaimRecordFromAffectedRef);
  }

  const { findAffectedClientClaimsForClaimFamily } = await import("./client-claim-mapper");
  return findAffectedClientClaimsForClaimFamily(claimFamilyId);
}
