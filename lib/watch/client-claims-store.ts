import {
  CLIENT_CLAIMS_TABLE,
  createSupabaseServerClient,
  getSupabaseEnvConfig,
} from "@/engine/watchlist/supabase-client";
import {
  isSupportedClientClaimRiskLevel,
  isSupportedClientClaimSourceType,
  isSupportedClientClaimStatus,
  type ClientClaimRiskLevel,
  type ClientClaimSourceType,
  type ClientClaimStatus,
} from "@/lib/review/client-claims-constants";
import { canAccessReviewItemWorkspace, type ReviewQueueAccessContext } from "@/lib/operator-auth";
import { sanitizeWatchRunErrorMessage } from "@/lib/watch/watch-run-logger";

export type ClientClaimRow = {
  id: string;
  workspace_id: string;
  client_claim_id: string;
  claim_text: string;
  claim_source_type: string | null;
  claim_source_label: string | null;
  source_url: string | null;
  claim_family: string | null;
  risk_level: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type PrivacySafeClientClaim = {
  workspace_id: string;
  client_claim_id: string;
  claim_text: string;
  claim_source_type: string | null;
  claim_source_label: string | null;
  source_url: string | null;
  claim_family: string | null;
  risk_level: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type ClientClaimInsertInput = {
  workspace_id: string;
  client_claim_id: string;
  claim_text: string;
  claim_source_type: ClientClaimSourceType | null;
  claim_source_label: string | null;
  source_url: string | null;
  claim_family: string | null;
  risk_level: ClientClaimRiskLevel | null;
  status: ClientClaimStatus;
};

export type ClientClaimInsertResult =
  | { ok: true; claim: PrivacySafeClientClaim }
  | { ok: false; error: string };

export type ClientClaimListResult = {
  claims: PrivacySafeClientClaim[];
  error?: string;
};

export type ClientClaimLookupResult = {
  claim: PrivacySafeClientClaim | null;
  error?: string;
};

export type ClientClaimStatusUpdateResult =
  | { ok: true; claim: PrivacySafeClientClaim }
  | { ok: false; error: string };

export type ClientClaimListFilters = {
  workspace_id?: string;
  status?: ClientClaimStatus;
  claim_family?: string;
};

export const CLIENT_CLAIM_PRIVATE_FIELDS = ["id"] as const;

export const CLIENT_CLAIM_DISPLAY_FIELDS = [
  "workspace_id",
  "client_claim_id",
  "claim_text",
  "claim_source_type",
  "claim_source_label",
  "source_url",
  "claim_family",
  "risk_level",
  "status",
  "created_at",
  "updated_at",
] as const;

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

function isDuplicateClaimError(error: { code?: string; message?: string }): boolean {
  return error.code === "23505" || (error.message?.toLowerCase().includes("duplicate") ?? false);
}

function normalizeStoreError(error: unknown): string {
  const sanitized = sanitizeWatchRunErrorMessage(error);

  if (
    typeof error === "object" &&
    error !== null &&
    isMissingTableError(error as { code?: string; message?: string })
  ) {
    return "client_claims_table_missing";
  }

  if (typeof error === "object" && error !== null && isDuplicateClaimError(error)) {
    return "duplicate_client_claim_id";
  }

  return sanitized;
}

export function isClientClaimsPersistenceConfigured(): boolean {
  const { hasSupabaseUrl, hasSupabaseServiceRoleKey } = getSupabaseEnvConfig();
  return hasSupabaseUrl && hasSupabaseServiceRoleKey;
}

export function toPrivacySafeClientClaim(row: ClientClaimRow): PrivacySafeClientClaim {
  return {
    workspace_id: row.workspace_id,
    client_claim_id: row.client_claim_id,
    claim_text: row.claim_text,
    claim_source_type: row.claim_source_type,
    claim_source_label: row.claim_source_label,
    source_url: row.source_url,
    claim_family: row.claim_family,
    risk_level: row.risk_level,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function isPrivacySafeClientClaimPayload(claim: Record<string, unknown>): boolean {
  for (const field of CLIENT_CLAIM_PRIVATE_FIELDS) {
    if (field in claim) {
      return false;
    }
  }

  return CLIENT_CLAIM_DISPLAY_FIELDS.every((field) => field in claim);
}

function applyAccessToListFilters(
  filters: ClientClaimListFilters,
  access: ReviewQueueAccessContext
): ClientClaimListFilters & { workspace_ids?: string[] } {
  if (access.mode === "break_glass") {
    return filters;
  }

  const allowed = access.workspaceIds;
  if (allowed.length === 0) {
    return { ...filters, workspace_ids: ["__no_workspace_access__"] };
  }

  if (filters.workspace_id) {
    if (!allowed.includes(filters.workspace_id)) {
      return { ...filters, workspace_ids: ["__no_workspace_access__"] };
    }

    return { ...filters, workspace_ids: [filters.workspace_id] };
  }

  return { ...filters, workspace_ids: allowed };
}

export async function createClientClaim(
  input: ClientClaimInsertInput,
  access: ReviewQueueAccessContext
): Promise<ClientClaimInsertResult> {
  if (!canAccessReviewItemWorkspace(access, input.workspace_id)) {
    return { ok: false, error: "forbidden" };
  }

  if (!input.client_claim_id.trim() || !input.claim_text.trim()) {
    return { ok: false, error: "required_fields_missing" };
  }

  if (!isSupportedClientClaimStatus(input.status)) {
    return { ok: false, error: "unsupported_client_claim_status" };
  }

  if (!isSupportedClientClaimSourceType(input.claim_source_type)) {
    return { ok: false, error: "unsupported_client_claim_source_type" };
  }

  if (!isSupportedClientClaimRiskLevel(input.risk_level)) {
    return { ok: false, error: "unsupported_client_claim_risk_level" };
  }

  if (!isClientClaimsPersistenceConfigured()) {
    return { ok: false, error: "supabase_not_configured" };
  }

  try {
    const client = createSupabaseServerClient();
    const { data, error } = await client
      .from(CLIENT_CLAIMS_TABLE)
      .insert({
        workspace_id: input.workspace_id,
        client_claim_id: input.client_claim_id.trim(),
        claim_text: input.claim_text.trim(),
        claim_source_type: input.claim_source_type,
        claim_source_label: input.claim_source_label?.trim() || null,
        source_url: input.source_url?.trim() || null,
        claim_family: input.claim_family?.trim() || null,
        risk_level: input.risk_level,
        status: input.status,
      })
      .select("*")
      .single();

    if (error) {
      return { ok: false, error: normalizeStoreError(error) };
    }

    return {
      ok: true,
      claim: toPrivacySafeClientClaim(data as ClientClaimRow),
    };
  } catch (error) {
    return { ok: false, error: normalizeStoreError(error) };
  }
}

export async function listClientClaims(
  access: ReviewQueueAccessContext,
  filters: ClientClaimListFilters = {}
): Promise<ClientClaimListResult> {
  if (!isClientClaimsPersistenceConfigured()) {
    return { claims: [], error: "supabase_not_configured" };
  }

  try {
    const scopedFilters = applyAccessToListFilters(filters, access);
    const client = createSupabaseServerClient();
    let query = client.from(CLIENT_CLAIMS_TABLE).select("*");

    if (scopedFilters.workspace_ids) {
      query = query.in("workspace_id", scopedFilters.workspace_ids);
    } else if (scopedFilters.workspace_id) {
      query = query.eq("workspace_id", scopedFilters.workspace_id);
    }

    if (scopedFilters.status) {
      query = query.eq("status", scopedFilters.status);
    }

    if (scopedFilters.claim_family) {
      query = query.eq("claim_family", scopedFilters.claim_family);
    }

    const { data, error } = await query
      .order("updated_at", { ascending: false })
      .limit(100);

    if (error) {
      return { claims: [], error: normalizeStoreError(error) };
    }

    return {
      claims: ((data ?? []) as ClientClaimRow[]).map(toPrivacySafeClientClaim),
    };
  } catch (error) {
    return { claims: [], error: normalizeStoreError(error) };
  }
}

export async function getClientClaimByClientClaimId(
  workspaceId: string,
  clientClaimId: string,
  access: ReviewQueueAccessContext
): Promise<ClientClaimLookupResult> {
  if (!canAccessReviewItemWorkspace(access, workspaceId)) {
    return { claim: null, error: "forbidden" };
  }

  if (!isClientClaimsPersistenceConfigured()) {
    return { claim: null, error: "supabase_not_configured" };
  }

  try {
    const client = createSupabaseServerClient();
    const { data, error } = await client
      .from(CLIENT_CLAIMS_TABLE)
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("client_claim_id", clientClaimId)
      .maybeSingle();

    if (error) {
      return { claim: null, error: normalizeStoreError(error) };
    }

    if (!data) {
      return { claim: null };
    }

    return {
      claim: toPrivacySafeClientClaim(data as ClientClaimRow),
    };
  } catch (error) {
    return { claim: null, error: normalizeStoreError(error) };
  }
}

export async function updateClientClaimStatus(
  workspaceId: string,
  clientClaimId: string,
  status: ClientClaimStatus,
  access: ReviewQueueAccessContext
): Promise<ClientClaimStatusUpdateResult> {
  if (!canAccessReviewItemWorkspace(access, workspaceId)) {
    return { ok: false, error: "forbidden" };
  }

  if (!isSupportedClientClaimStatus(status)) {
    return { ok: false, error: "unsupported_client_claim_status" };
  }

  if (!isClientClaimsPersistenceConfigured()) {
    return { ok: false, error: "supabase_not_configured" };
  }

  try {
    const client = createSupabaseServerClient();
    const { data, error } = await client
      .from(CLIENT_CLAIMS_TABLE)
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("workspace_id", workspaceId)
      .eq("client_claim_id", clientClaimId)
      .select("*")
      .maybeSingle();

    if (error) {
      return { ok: false, error: normalizeStoreError(error) };
    }

    if (!data) {
      return { ok: false, error: "client_claim_not_found" };
    }

    return {
      ok: true,
      claim: toPrivacySafeClientClaim(data as ClientClaimRow),
    };
  } catch (error) {
    return { ok: false, error: normalizeStoreError(error) };
  }
}

export async function resolveLinkedClientClaimForReviewItem(
  reviewItem: { workspace_id: string; client_claim_id: string },
  access: ReviewQueueAccessContext
): Promise<PrivacySafeClientClaim | null> {
  const result = await getClientClaimByClientClaimId(
    reviewItem.workspace_id,
    reviewItem.client_claim_id,
    access
  );

  if (result.error && result.error !== "supabase_not_configured") {
    return null;
  }

  return result.claim;
}
