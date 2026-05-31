import {
  CLIENT_CLAIM_WATCHLIST_MAPPINGS_TABLE,
  createSupabaseServerClient,
  getSupabaseEnvConfig,
} from "@/engine/watchlist/supabase-client";
import {
  isSupportedMappingConfidence,
  isSupportedMappingSource,
  isSupportedMappingStatus,
  type MappingConfidence,
  type MappingSource,
  type MappingStatus,
} from "@/lib/review/claim-mapping-constants";
import { canAccessReviewItemWorkspace, type ReviewQueueAccessContext } from "@/lib/operator-auth";
import { sanitizeWatchRunErrorMessage } from "@/lib/watch/watch-run-logger";

export type ClientClaimWatchlistMappingRow = {
  id: string;
  workspace_id: string;
  client_claim_id: string;
  claim_family: string;
  watchlist_id: string | null;
  mapping_status: string;
  mapping_confidence: string | null;
  mapping_source: string;
  created_at: string;
  updated_at: string;
};

export type PrivacySafeClientClaimWatchlistMapping = {
  workspace_id: string;
  client_claim_id: string;
  claim_family: string;
  watchlist_id: string | null;
  mapping_status: string;
  mapping_confidence: string | null;
  mapping_source: string;
  created_at: string;
  updated_at: string;
};

export type ClientClaimWatchlistMappingInsertInput = {
  workspace_id: string;
  client_claim_id: string;
  claim_family: string;
  watchlist_id?: string | null;
  mapping_status?: MappingStatus;
  mapping_confidence?: MappingConfidence | null;
  mapping_source?: MappingSource;
};

export type ClientClaimWatchlistMappingInsertResult =
  | { ok: true; mapping: PrivacySafeClientClaimWatchlistMapping }
  | { ok: false; error: string };

export type ClientClaimWatchlistMappingListResult = {
  mappings: PrivacySafeClientClaimWatchlistMapping[];
  error?: string;
};

export type ClientClaimWatchlistMappingStatusUpdateResult =
  | { ok: true; mapping: PrivacySafeClientClaimWatchlistMapping }
  | { ok: false; error: string };

export type ClientClaimWatchlistMappingListFilters = {
  workspace_id?: string;
  client_claim_id?: string;
  claim_family?: string;
  mapping_status?: MappingStatus;
};

export const MAPPING_PRIVATE_FIELDS = ["id"] as const;

export const MAPPING_DISPLAY_FIELDS = [
  "workspace_id",
  "client_claim_id",
  "claim_family",
  "watchlist_id",
  "mapping_status",
  "mapping_confidence",
  "mapping_source",
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

function isDuplicateMappingError(error: { code?: string; message?: string }): boolean {
  return error.code === "23505" || (error.message?.toLowerCase().includes("duplicate") ?? false);
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

  if (typeof error === "object" && error !== null && isDuplicateMappingError(error)) {
    return "duplicate_mapping";
  }

  return sanitized;
}

export function isClientClaimWatchlistMappingPersistenceConfigured(): boolean {
  const { hasSupabaseUrl, hasSupabaseServiceRoleKey } = getSupabaseEnvConfig();
  return hasSupabaseUrl && hasSupabaseServiceRoleKey;
}

export function toPrivacySafeClientClaimWatchlistMapping(
  row: ClientClaimWatchlistMappingRow
): PrivacySafeClientClaimWatchlistMapping {
  return {
    workspace_id: row.workspace_id,
    client_claim_id: row.client_claim_id,
    claim_family: row.claim_family,
    watchlist_id: row.watchlist_id,
    mapping_status: row.mapping_status,
    mapping_confidence: row.mapping_confidence,
    mapping_source: row.mapping_source,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function isPrivacySafeClientClaimWatchlistMappingPayload(
  mapping: Record<string, unknown>
): boolean {
  for (const field of MAPPING_PRIVATE_FIELDS) {
    if (field in mapping) {
      return false;
    }
  }

  return MAPPING_DISPLAY_FIELDS.every((field) => field in mapping);
}

function applyAccessToListFilters(
  filters: ClientClaimWatchlistMappingListFilters,
  access: ReviewQueueAccessContext
): ClientClaimWatchlistMappingListFilters & { workspace_ids?: string[] } {
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

export async function createClientClaimWatchlistMapping(
  input: ClientClaimWatchlistMappingInsertInput,
  access: ReviewQueueAccessContext
): Promise<ClientClaimWatchlistMappingInsertResult> {
  if (!canAccessReviewItemWorkspace(access, input.workspace_id)) {
    return { ok: false, error: "forbidden" };
  }

  if (!input.client_claim_id.trim() || !input.claim_family.trim()) {
    return { ok: false, error: "required_fields_missing" };
  }

  const mappingStatus = input.mapping_status ?? "active";
  if (!isSupportedMappingStatus(mappingStatus)) {
    return { ok: false, error: "unsupported_mapping_status" };
  }

  const mappingSource = input.mapping_source ?? "manual";
  if (!isSupportedMappingSource(mappingSource)) {
    return { ok: false, error: "unsupported_mapping_source" };
  }

  if (
    input.mapping_confidence !== undefined &&
    input.mapping_confidence !== null &&
    !isSupportedMappingConfidence(input.mapping_confidence)
  ) {
    return { ok: false, error: "unsupported_mapping_confidence" };
  }

  if (!isClientClaimWatchlistMappingPersistenceConfigured()) {
    return { ok: false, error: "supabase_not_configured" };
  }

  try {
    const client = createSupabaseServerClient();
    const { data, error } = await client
      .from(CLIENT_CLAIM_WATCHLIST_MAPPINGS_TABLE)
      .insert({
        workspace_id: input.workspace_id.trim(),
        client_claim_id: input.client_claim_id.trim(),
        claim_family: input.claim_family.trim(),
        watchlist_id: input.watchlist_id?.trim() || null,
        mapping_status: mappingStatus,
        mapping_confidence: input.mapping_confidence ?? null,
        mapping_source: mappingSource,
      })
      .select("*")
      .single();

    if (error) {
      return { ok: false, error: normalizeStoreError(error) };
    }

    return {
      ok: true,
      mapping: toPrivacySafeClientClaimWatchlistMapping(data as ClientClaimWatchlistMappingRow),
    };
  } catch (error) {
    return { ok: false, error: normalizeStoreError(error) };
  }
}

export async function listClientClaimWatchlistMappings(
  access: ReviewQueueAccessContext,
  filters: ClientClaimWatchlistMappingListFilters = {}
): Promise<ClientClaimWatchlistMappingListResult> {
  if (!isClientClaimWatchlistMappingPersistenceConfigured()) {
    return { mappings: [], error: "supabase_not_configured" };
  }

  try {
    const scopedFilters = applyAccessToListFilters(filters, access);
    const client = createSupabaseServerClient();
    let query = client.from(CLIENT_CLAIM_WATCHLIST_MAPPINGS_TABLE).select("*");

    if (scopedFilters.workspace_ids) {
      query = query.in("workspace_id", scopedFilters.workspace_ids);
    } else if (scopedFilters.workspace_id) {
      query = query.eq("workspace_id", scopedFilters.workspace_id);
    }

    if (scopedFilters.client_claim_id) {
      query = query.eq("client_claim_id", scopedFilters.client_claim_id);
    }

    if (scopedFilters.claim_family) {
      query = query.eq("claim_family", scopedFilters.claim_family);
    }

    if (scopedFilters.mapping_status) {
      query = query.eq("mapping_status", scopedFilters.mapping_status);
    }

    const { data, error } = await query
      .order("updated_at", { ascending: false })
      .limit(200);

    if (error) {
      return { mappings: [], error: normalizeStoreError(error) };
    }

    return {
      mappings: ((data ?? []) as ClientClaimWatchlistMappingRow[]).map(
        toPrivacySafeClientClaimWatchlistMapping
      ),
    };
  } catch (error) {
    return { mappings: [], error: normalizeStoreError(error) };
  }
}

export async function updateClientClaimWatchlistMappingStatus(
  workspaceId: string,
  clientClaimId: string,
  claimFamily: string,
  mappingStatus: MappingStatus,
  access: ReviewQueueAccessContext
): Promise<ClientClaimWatchlistMappingStatusUpdateResult> {
  if (!canAccessReviewItemWorkspace(access, workspaceId)) {
    return { ok: false, error: "forbidden" };
  }

  if (!isSupportedMappingStatus(mappingStatus)) {
    return { ok: false, error: "unsupported_mapping_status" };
  }

  if (!isClientClaimWatchlistMappingPersistenceConfigured()) {
    return { ok: false, error: "supabase_not_configured" };
  }

  try {
    const client = createSupabaseServerClient();
    const { data, error } = await client
      .from(CLIENT_CLAIM_WATCHLIST_MAPPINGS_TABLE)
      .update({
        mapping_status: mappingStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("workspace_id", workspaceId)
      .eq("client_claim_id", clientClaimId)
      .eq("claim_family", claimFamily)
      .select("*")
      .maybeSingle();

    if (error) {
      return { ok: false, error: normalizeStoreError(error) };
    }

    if (!data) {
      return { ok: false, error: "mapping_not_found" };
    }

    return {
      ok: true,
      mapping: toPrivacySafeClientClaimWatchlistMapping(data as ClientClaimWatchlistMappingRow),
    };
  } catch (error) {
    return { ok: false, error: normalizeStoreError(error) };
  }
}
