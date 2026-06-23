/**
 * Phase 44B — registered wellness claims registry and candidate review promotion.
 *
 * SAFETY: Claim review and registry only.
 * Must not start evidence research, create evidence briefs, send Mind digests,
 * or call HelloMinds send/live-send/retry paths.
 */
import {
  CANDIDATE_WELLNESS_CLAIMS_TABLE,
  createSupabaseServerClient,
  getSupabaseEnvConfig,
  WELLNESS_CLAIMS_TABLE,
} from "@/engine/watchlist/supabase-client";
import {
  DEFAULT_WELLNESS_CLAIM_RESEARCH_STATUS,
  DEFAULT_WELLNESS_CLAIM_REVIEW_STATUS,
  DEFAULT_WELLNESS_CLAIM_STATUS,
  isSupportedWellnessClaimResearchStatus,
  type WellnessClaimResearchStatus,
} from "@/lib/review/claim-registry-constants";
import {
  isSupportedCandidateClaimStrength,
  isSupportedCandidateEvidenceSensitivity,
  type CandidateClaimStatus,
} from "@/lib/review/claim-extraction-constants";
import { normalizeClaimText } from "@/lib/review/wellness-claims-extractor";
import { canAccessReviewItemWorkspace, type ReviewQueueAccessContext } from "@/lib/operator-auth";
import {
  CLAIM_EXTRACTION_PRIVATE_FIELDS,
  toPrivacySafeCandidateWellnessClaim,
  type CandidateWellnessClaimRow,
  type PrivacySafeCandidateWellnessClaim,
} from "@/lib/watch/claim-extraction-store";
import { sanitizeWatchRunErrorMessage } from "@/lib/watch/watch-run-logger";

export type WellnessClaimRow = {
  id: string;
  workspace_id: string;
  source_document_id: string | null;
  source_candidate_claim_id: string | null;
  claim_text: string;
  normalized_claim_text: string;
  claim_type: string | null;
  claim_family: string | null;
  subject: string | null;
  predicate: string | null;
  object: string | null;
  claim_strength: string;
  evidence_sensitivity: string;
  source_excerpt: string | null;
  source_location: string | null;
  status: string;
  review_status: string;
  research_status: string;
  created_at: string;
  updated_at: string;
};

export type PrivacySafeWellnessClaim = {
  claim_id: string;
  workspace_id: string;
  source_document_id: string | null;
  source_candidate_claim_id: string | null;
  claim_text: string;
  normalized_claim_text: string;
  claim_type: string | null;
  claim_family: string | null;
  subject: string | null;
  predicate: string | null;
  object: string | null;
  claim_strength: string;
  evidence_sensitivity: string;
  source_excerpt: string | null;
  source_location: string | null;
  status: string;
  review_status: string;
  research_status: string;
  created_at: string;
  updated_at: string;
};

export type WellnessClaimListEntry = PrivacySafeWellnessClaim & {
  extraction_run_id: string | null;
};

export type WellnessClaimListFilters = {
  workspace_id?: string;
  claim_family?: string;
  research_status?: WellnessClaimResearchStatus;
  evidence_sensitivity?: string;
  limit?: number;
};

export type WellnessClaimListResult = {
  claims: WellnessClaimListEntry[];
  error?: string;
};

export type WellnessClaimLookupResult = {
  claim: PrivacySafeWellnessClaim | null;
  error?: string;
};

export type CandidateClaimUpdateInput = {
  claim_text?: string;
  claim_type?: string | null;
  claim_family?: string | null;
  subject?: string | null;
  predicate?: string | null;
  object?: string | null;
  claim_strength?: string;
  evidence_sensitivity?: string;
  is_direct_claim?: boolean;
  needs_research?: boolean;
};

export type CandidateClaimUpdateResult =
  | { ok: true; candidate: PrivacySafeCandidateWellnessClaim }
  | { ok: false; error: string };

export type CandidateClaimAcceptResult =
  | { ok: true; claim: PrivacySafeWellnessClaim; candidate: PrivacySafeCandidateWellnessClaim; already_accepted: boolean }
  | { ok: false; error: string };

export type CandidateClaimRejectResult =
  | { ok: true; candidate: PrivacySafeCandidateWellnessClaim; already_rejected: boolean }
  | { ok: false; error: string };

export const WELLNESS_CLAIM_PRIVATE_FIELDS = CLAIM_EXTRACTION_PRIVATE_FIELDS;

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
    return "wellness_claims_tables_missing";
  }

  return sanitized;
}

function applyAccessToListFilters(
  filters: WellnessClaimListFilters,
  access: ReviewQueueAccessContext
): WellnessClaimListFilters & { workspace_ids?: string[] } {
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

export function isWellnessClaimsPersistenceConfigured(): boolean {
  const { hasSupabaseUrl, hasSupabaseServiceRoleKey } = getSupabaseEnvConfig();
  return hasSupabaseUrl && hasSupabaseServiceRoleKey;
}

export function toPrivacySafeWellnessClaim(row: WellnessClaimRow): PrivacySafeWellnessClaim {
  return {
    claim_id: row.id,
    workspace_id: row.workspace_id,
    source_document_id: row.source_document_id,
    source_candidate_claim_id: row.source_candidate_claim_id,
    claim_text: row.claim_text,
    normalized_claim_text: row.normalized_claim_text,
    claim_type: row.claim_type,
    claim_family: row.claim_family,
    subject: row.subject,
    predicate: row.predicate,
    object: row.object,
    claim_strength: row.claim_strength,
    evidence_sensitivity: row.evidence_sensitivity,
    source_excerpt: row.source_excerpt,
    source_location: row.source_location,
    status: row.status,
    review_status: row.review_status,
    research_status: row.research_status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function isPrivacySafeWellnessClaimPayload(payload: Record<string, unknown>): boolean {
  for (const field of WELLNESS_CLAIM_PRIVATE_FIELDS) {
    if (field in payload) {
      return false;
    }
  }

  return true;
}

async function loadCandidateRow(
  candidateClaimId: string
): Promise<{ row: CandidateWellnessClaimRow | null; error?: string }> {
  if (!isWellnessClaimsPersistenceConfigured()) {
    return { row: null, error: "supabase_not_configured" };
  }

  try {
    const client = createSupabaseServerClient();
    const { data, error } = await client
      .from(CANDIDATE_WELLNESS_CLAIMS_TABLE)
      .select("*")
      .eq("id", candidateClaimId)
      .maybeSingle();

    if (error) {
      return { row: null, error: normalizeStoreError(error) };
    }

    return { row: (data as CandidateWellnessClaimRow | null) ?? null };
  } catch (error) {
    return { row: null, error: normalizeStoreError(error) };
  }
}

async function loadWellnessClaimByCandidateId(
  candidateClaimId: string
): Promise<{ row: WellnessClaimRow | null; error?: string }> {
  if (!isWellnessClaimsPersistenceConfigured()) {
    return { row: null, error: "supabase_not_configured" };
  }

  try {
    const client = createSupabaseServerClient();
    const { data, error } = await client
      .from(WELLNESS_CLAIMS_TABLE)
      .select("*")
      .eq("source_candidate_claim_id", candidateClaimId)
      .maybeSingle();

    if (error) {
      return { row: null, error: normalizeStoreError(error) };
    }

    return { row: (data as WellnessClaimRow | null) ?? null };
  } catch (error) {
    return { row: null, error: normalizeStoreError(error) };
  }
}

export async function listWellnessClaims(
  access: ReviewQueueAccessContext,
  filters: WellnessClaimListFilters = {}
): Promise<WellnessClaimListResult> {
  if (!isWellnessClaimsPersistenceConfigured()) {
    return { claims: [], error: "supabase_not_configured" };
  }

  try {
    const scopedFilters = applyAccessToListFilters(filters, access);
    const client = createSupabaseServerClient();
    const limit = filters.limit ?? 50;

    let query = client.from(WELLNESS_CLAIMS_TABLE).select("*");

    if (scopedFilters.workspace_ids) {
      query = query.in("workspace_id", scopedFilters.workspace_ids);
    } else if (scopedFilters.workspace_id) {
      query = query.eq("workspace_id", scopedFilters.workspace_id);
    }

    if (filters.claim_family) {
      query = query.eq("claim_family", filters.claim_family);
    }

    if (filters.research_status && isSupportedWellnessClaimResearchStatus(filters.research_status)) {
      query = query.eq("research_status", filters.research_status);
    }

    if (filters.evidence_sensitivity) {
      query = query.eq("evidence_sensitivity", filters.evidence_sensitivity);
    }

    const { data, error } = await query.order("created_at", { ascending: false }).limit(limit);

    if (error) {
      return { claims: [], error: normalizeStoreError(error) };
    }

    const claimRows = (data ?? []) as WellnessClaimRow[];
    if (claimRows.length === 0) {
      return { claims: [] };
    }

    const candidateIds = claimRows
      .map((row) => row.source_candidate_claim_id)
      .filter((value): value is string => Boolean(value));

    const extractionRunByCandidateId = new Map<string, string>();
    if (candidateIds.length > 0) {
      const { data: candidates, error: candidatesError } = await client
        .from(CANDIDATE_WELLNESS_CLAIMS_TABLE)
        .select("id, extraction_run_id")
        .in("id", candidateIds);

      if (candidatesError) {
        return { claims: [], error: normalizeStoreError(candidatesError) };
      }

      for (const candidate of (candidates ?? []) as Array<{
        id: string;
        extraction_run_id: string;
      }>) {
        extractionRunByCandidateId.set(candidate.id, candidate.extraction_run_id);
      }
    }

    return {
      claims: claimRows.map((row) => ({
        ...toPrivacySafeWellnessClaim(row),
        extraction_run_id: row.source_candidate_claim_id
          ? extractionRunByCandidateId.get(row.source_candidate_claim_id) ?? null
          : null,
      })),
    };
  } catch (error) {
    return { claims: [], error: normalizeStoreError(error) };
  }
}

export async function getWellnessClaimById(
  claimId: string,
  access: ReviewQueueAccessContext
): Promise<WellnessClaimLookupResult> {
  if (!isWellnessClaimsPersistenceConfigured()) {
    return { claim: null, error: "supabase_not_configured" };
  }

  try {
    const client = createSupabaseServerClient();
    const { data, error } = await client
      .from(WELLNESS_CLAIMS_TABLE)
      .select("*")
      .eq("id", claimId)
      .maybeSingle();

    if (error) {
      return { claim: null, error: normalizeStoreError(error) };
    }

    if (!data) {
      return { claim: null };
    }

    const row = data as WellnessClaimRow;
    if (!canAccessReviewItemWorkspace(access, row.workspace_id)) {
      return { claim: null, error: "forbidden" };
    }

    return { claim: toPrivacySafeWellnessClaim(row) };
  } catch (error) {
    return { claim: null, error: normalizeStoreError(error) };
  }
}

export async function updateCandidateWellnessClaim(
  candidateClaimId: string,
  input: CandidateClaimUpdateInput,
  access: ReviewQueueAccessContext
): Promise<CandidateClaimUpdateResult> {
  const loaded = await loadCandidateRow(candidateClaimId);
  if (loaded.error) {
    return { ok: false, error: loaded.error };
  }

  if (!loaded.row) {
    return { ok: false, error: "candidate_claim_not_found" };
  }

  if (!canAccessReviewItemWorkspace(access, loaded.row.workspace_id)) {
    return { ok: false, error: "forbidden" };
  }

  if (loaded.row.status !== "candidate") {
    return { ok: false, error: "candidate_claim_not_editable" };
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.claim_text !== undefined) {
    const trimmed = input.claim_text.trim();
    if (!trimmed) {
      return { ok: false, error: "claim_text_required" };
    }

    updates.claim_text = trimmed;
    updates.normalized_claim_text = normalizeClaimText(trimmed);
  }

  if (input.claim_type !== undefined) {
    updates.claim_type = input.claim_type?.trim() || null;
  }

  if (input.claim_family !== undefined) {
    updates.claim_family = input.claim_family?.trim() || null;
  }

  if (input.subject !== undefined) {
    updates.subject = input.subject?.trim() || null;
  }

  if (input.predicate !== undefined) {
    updates.predicate = input.predicate?.trim() || null;
  }

  if (input.object !== undefined) {
    updates.object = input.object?.trim() || null;
  }

  if (input.claim_strength !== undefined) {
    if (!isSupportedCandidateClaimStrength(input.claim_strength)) {
      return { ok: false, error: "unsupported_claim_strength" };
    }

    updates.claim_strength = input.claim_strength;
  }

  if (input.evidence_sensitivity !== undefined) {
    if (!isSupportedCandidateEvidenceSensitivity(input.evidence_sensitivity)) {
      return { ok: false, error: "unsupported_evidence_sensitivity" };
    }

    updates.evidence_sensitivity = input.evidence_sensitivity;
  }

  if (input.is_direct_claim !== undefined) {
    updates.is_direct_claim = input.is_direct_claim;
  }

  if (input.needs_research !== undefined) {
    updates.needs_research = input.needs_research;
  }

  if (Object.keys(updates).length === 1) {
    return { ok: false, error: "no_candidate_fields_to_update" };
  }

  try {
    const client = createSupabaseServerClient();
    const { data, error } = await client
      .from(CANDIDATE_WELLNESS_CLAIMS_TABLE)
      .update(updates)
      .eq("id", candidateClaimId)
      .select("*")
      .single();

    if (error || !data) {
      return { ok: false, error: normalizeStoreError(error) };
    }

    return {
      ok: true,
      candidate: toPrivacySafeCandidateWellnessClaim(data as CandidateWellnessClaimRow),
    };
  } catch (error) {
    return { ok: false, error: normalizeStoreError(error) };
  }
}

export async function acceptCandidateWellnessClaim(
  candidateClaimId: string,
  access: ReviewQueueAccessContext
): Promise<CandidateClaimAcceptResult> {
  const loaded = await loadCandidateRow(candidateClaimId);
  if (loaded.error) {
    return { ok: false, error: loaded.error };
  }

  if (!loaded.row) {
    return { ok: false, error: "candidate_claim_not_found" };
  }

  const candidateRow = loaded.row;
  if (!canAccessReviewItemWorkspace(access, candidateRow.workspace_id)) {
    return { ok: false, error: "forbidden" };
  }

  if (candidateRow.status === "rejected") {
    return { ok: false, error: "candidate_claim_rejected" };
  }

  if (candidateRow.status === "accepted") {
    const existing = await loadWellnessClaimByCandidateId(candidateClaimId);
    if (existing.error) {
      return { ok: false, error: existing.error };
    }

    if (!existing.row) {
      return { ok: false, error: "registered_claim_missing_for_accepted_candidate" };
    }

    return {
      ok: true,
      claim: toPrivacySafeWellnessClaim(existing.row),
      candidate: toPrivacySafeCandidateWellnessClaim(candidateRow),
      already_accepted: true,
    };
  }

  const now = new Date().toISOString();
  const registeredClaimInsert = {
    workspace_id: candidateRow.workspace_id,
    source_document_id: candidateRow.source_document_id,
    source_candidate_claim_id: candidateRow.id,
    claim_text: candidateRow.claim_text,
    normalized_claim_text: candidateRow.normalized_claim_text,
    claim_type: candidateRow.claim_type,
    claim_family: candidateRow.claim_family,
    subject: candidateRow.subject,
    predicate: candidateRow.predicate,
    object: candidateRow.object,
    claim_strength: candidateRow.claim_strength,
    evidence_sensitivity: candidateRow.evidence_sensitivity,
    source_excerpt: candidateRow.source_excerpt,
    source_location: candidateRow.source_location,
    status: DEFAULT_WELLNESS_CLAIM_STATUS,
    review_status: DEFAULT_WELLNESS_CLAIM_REVIEW_STATUS,
    research_status: DEFAULT_WELLNESS_CLAIM_RESEARCH_STATUS,
    updated_at: now,
  };

  try {
    const client = createSupabaseServerClient();

    const { data: insertedClaim, error: insertError } = await client
      .from(WELLNESS_CLAIMS_TABLE)
      .insert(registeredClaimInsert)
      .select("*")
      .single();

    if (insertError || !insertedClaim) {
      if (insertError?.code === "23505") {
        const existing = await loadWellnessClaimByCandidateId(candidateClaimId);
        if (existing.row) {
          const { data: refreshedCandidate } = await client
            .from(CANDIDATE_WELLNESS_CLAIMS_TABLE)
            .select("*")
            .eq("id", candidateClaimId)
            .single();

          return {
            ok: true,
            claim: toPrivacySafeWellnessClaim(existing.row),
            candidate: toPrivacySafeCandidateWellnessClaim(
              (refreshedCandidate as CandidateWellnessClaimRow) ?? candidateRow
            ),
            already_accepted: true,
          };
        }
      }

      return { ok: false, error: normalizeStoreError(insertError) };
    }

    const acceptedStatus: CandidateClaimStatus = "accepted";
    const { data: updatedCandidate, error: updateError } = await client
      .from(CANDIDATE_WELLNESS_CLAIMS_TABLE)
      .update({ status: acceptedStatus, updated_at: now })
      .eq("id", candidateClaimId)
      .select("*")
      .single();

    if (updateError || !updatedCandidate) {
      return { ok: false, error: normalizeStoreError(updateError) };
    }

    return {
      ok: true,
      claim: toPrivacySafeWellnessClaim(insertedClaim as WellnessClaimRow),
      candidate: toPrivacySafeCandidateWellnessClaim(updatedCandidate as CandidateWellnessClaimRow),
      already_accepted: false,
    };
  } catch (error) {
    return { ok: false, error: normalizeStoreError(error) };
  }
}

export async function rejectCandidateWellnessClaim(
  candidateClaimId: string,
  access: ReviewQueueAccessContext
): Promise<CandidateClaimRejectResult> {
  const loaded = await loadCandidateRow(candidateClaimId);
  if (loaded.error) {
    return { ok: false, error: loaded.error };
  }

  if (!loaded.row) {
    return { ok: false, error: "candidate_claim_not_found" };
  }

  const candidateRow = loaded.row;
  if (!canAccessReviewItemWorkspace(access, candidateRow.workspace_id)) {
    return { ok: false, error: "forbidden" };
  }

  if (candidateRow.status === "accepted") {
    return { ok: false, error: "candidate_claim_already_accepted" };
  }

  if (candidateRow.status === "rejected") {
    return {
      ok: true,
      candidate: toPrivacySafeCandidateWellnessClaim(candidateRow),
      already_rejected: true,
    };
  }

  const rejectedStatus: CandidateClaimStatus = "rejected";
  const now = new Date().toISOString();

  try {
    const client = createSupabaseServerClient();
    const { data, error } = await client
      .from(CANDIDATE_WELLNESS_CLAIMS_TABLE)
      .update({ status: rejectedStatus, updated_at: now })
      .eq("id", candidateClaimId)
      .select("*")
      .single();

    if (error || !data) {
      return { ok: false, error: normalizeStoreError(error) };
    }

    return {
      ok: true,
      candidate: toPrivacySafeCandidateWellnessClaim(data as CandidateWellnessClaimRow),
      already_rejected: false,
    };
  } catch (error) {
    return { ok: false, error: normalizeStoreError(error) };
  }
}
