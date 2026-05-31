import {
  EVIDENCE_CHANGE_BRIEF_CLAIMS_TABLE,
  EVIDENCE_CHANGE_BRIEFS_TABLE,
  createSupabaseServerClient,
  getSupabaseEnvConfig,
} from "@/engine/watchlist/supabase-client";
import {
  isSupportedEvidenceChangeBriefStatus,
  isSupportedEvidenceSignalValue,
  isSupportedRiskImplicationValue,
  type EvidenceChangeBriefStatus,
  type EvidenceSignalValue,
  type RiskImplicationValue,
} from "@/lib/review/evidence-change-brief-constants";
import { canAccessReviewItemWorkspace, type ReviewQueueAccessContext } from "@/lib/operator-auth";
import { sanitizeWatchRunErrorMessage } from "@/lib/watch/watch-run-logger";

export type EvidenceChangeBriefRow = {
  id: string;
  workspace_id: string;
  claim_family: string;
  watchlist_id: string | null;
  evidence_alert_id: string | null;
  review_item_id: string | null;
  brief_title: string;
  brief_summary: string;
  what_changed: string;
  why_it_matters: string;
  evidence_signal: string;
  risk_implication: string;
  recommended_action: string;
  safer_wording: string | null;
  affected_client_claims_count: number;
  status: string;
  created_at: string;
  updated_at: string;
};

export type PrivacySafeEvidenceChangeBrief = {
  id: string;
  workspace_id: string;
  claim_family: string;
  watchlist_id: string | null;
  evidence_alert_id: string | null;
  review_item_id: string | null;
  brief_title: string;
  brief_summary: string;
  what_changed: string;
  why_it_matters: string;
  evidence_signal: string;
  risk_implication: string;
  recommended_action: string;
  safer_wording: string | null;
  affected_client_claims_count: number;
  status: string;
  created_at: string;
  updated_at: string;
};

export type EvidenceChangeBriefClaimRow = {
  id: string;
  brief_id: string;
  workspace_id: string;
  client_claim_id: string;
  claim_text_snapshot: string;
  claim_source_type: string | null;
  claim_source_label: string | null;
  claim_family: string;
  mapping_confidence: string | null;
  created_at: string;
};

export type PrivacySafeEvidenceChangeBriefClaim = {
  brief_id: string;
  workspace_id: string;
  client_claim_id: string;
  claim_text_snapshot: string;
  claim_source_type: string | null;
  claim_source_label: string | null;
  claim_family: string;
  mapping_confidence: string | null;
  created_at: string;
};

export type EvidenceChangeBriefInsertInput = {
  workspace_id: string;
  claim_family: string;
  watchlist_id?: string | null;
  evidence_alert_id?: string | null;
  review_item_id?: string | null;
  brief_title: string;
  brief_summary: string;
  what_changed: string;
  why_it_matters: string;
  evidence_signal: EvidenceSignalValue;
  risk_implication: RiskImplicationValue;
  recommended_action: string;
  safer_wording?: string | null;
  affected_client_claims_count: number;
  status?: EvidenceChangeBriefStatus;
};

export type EvidenceChangeBriefClaimSnapshotInput = {
  client_claim_id: string;
  claim_text_snapshot: string;
  claim_source_type?: string | null;
  claim_source_label?: string | null;
  claim_family: string;
  mapping_confidence?: string | null;
};

export type EvidenceChangeBriefInsertResult =
  | { ok: true; brief: PrivacySafeEvidenceChangeBrief }
  | { ok: false; error: string };

export type EvidenceChangeBriefClaimSnapshotsResult =
  | { ok: true; claims: PrivacySafeEvidenceChangeBriefClaim[] }
  | { ok: false; error: string };

export type EvidenceChangeBriefListResult = {
  briefs: PrivacySafeEvidenceChangeBrief[];
  error?: string;
};

export type EvidenceChangeBriefLookupResult = {
  brief: PrivacySafeEvidenceChangeBrief | null;
  error?: string;
};

export type EvidenceChangeBriefClaimsListResult = {
  claims: PrivacySafeEvidenceChangeBriefClaim[];
  error?: string;
};

export type EvidenceChangeBriefListFilters = {
  workspace_id?: string;
  claim_family?: string;
  status?: EvidenceChangeBriefStatus;
};

export const BRIEF_CLAIM_PRIVATE_FIELDS = ["id"] as const;

export const BRIEF_DISPLAY_FIELDS = [
  "id",
  "workspace_id",
  "claim_family",
  "watchlist_id",
  "evidence_alert_id",
  "review_item_id",
  "brief_title",
  "brief_summary",
  "what_changed",
  "why_it_matters",
  "evidence_signal",
  "risk_implication",
  "recommended_action",
  "safer_wording",
  "affected_client_claims_count",
  "status",
  "created_at",
  "updated_at",
] as const;

export const BRIEF_CLAIM_DISPLAY_FIELDS = [
  "brief_id",
  "workspace_id",
  "client_claim_id",
  "claim_text_snapshot",
  "claim_source_type",
  "claim_source_label",
  "claim_family",
  "mapping_confidence",
  "created_at",
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

function normalizeStoreError(error: unknown, tableKind: "briefs" | "brief_claims"): string {
  const sanitized = sanitizeWatchRunErrorMessage(error);

  if (
    typeof error === "object" &&
    error !== null &&
    isMissingTableError(error as { code?: string; message?: string })
  ) {
    return tableKind === "briefs"
      ? "evidence_change_briefs_table_missing"
      : "evidence_change_brief_claims_table_missing";
  }

  return sanitized;
}

export function isEvidenceChangeBriefPersistenceConfigured(): boolean {
  const { hasSupabaseUrl, hasSupabaseServiceRoleKey } = getSupabaseEnvConfig();
  return hasSupabaseUrl && hasSupabaseServiceRoleKey;
}

export function toPrivacySafeEvidenceChangeBrief(
  row: EvidenceChangeBriefRow
): PrivacySafeEvidenceChangeBrief {
  return {
    id: row.id,
    workspace_id: row.workspace_id,
    claim_family: row.claim_family,
    watchlist_id: row.watchlist_id,
    evidence_alert_id: row.evidence_alert_id,
    review_item_id: row.review_item_id,
    brief_title: row.brief_title,
    brief_summary: row.brief_summary,
    what_changed: row.what_changed,
    why_it_matters: row.why_it_matters,
    evidence_signal: row.evidence_signal,
    risk_implication: row.risk_implication,
    recommended_action: row.recommended_action,
    safer_wording: row.safer_wording,
    affected_client_claims_count: row.affected_client_claims_count,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function toPrivacySafeEvidenceChangeBriefClaim(
  row: EvidenceChangeBriefClaimRow
): PrivacySafeEvidenceChangeBriefClaim {
  return {
    brief_id: row.brief_id,
    workspace_id: row.workspace_id,
    client_claim_id: row.client_claim_id,
    claim_text_snapshot: row.claim_text_snapshot,
    claim_source_type: row.claim_source_type,
    claim_source_label: row.claim_source_label,
    claim_family: row.claim_family,
    mapping_confidence: row.mapping_confidence,
    created_at: row.created_at,
  };
}

export function isPrivacySafeEvidenceChangeBriefPayload(brief: Record<string, unknown>): boolean {
  return BRIEF_DISPLAY_FIELDS.every((field) => field in brief);
}

export function isPrivacySafeEvidenceChangeBriefClaimPayload(
  claim: Record<string, unknown>
): boolean {
  for (const field of BRIEF_CLAIM_PRIVATE_FIELDS) {
    if (field in claim) {
      return false;
    }
  }

  return BRIEF_CLAIM_DISPLAY_FIELDS.every((field) => field in claim);
}

function applyAccessToListFilters(
  filters: EvidenceChangeBriefListFilters,
  access: ReviewQueueAccessContext
): EvidenceChangeBriefListFilters & { workspace_ids?: string[] } {
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

export async function createEvidenceChangeBrief(
  input: EvidenceChangeBriefInsertInput,
  access: ReviewQueueAccessContext
): Promise<EvidenceChangeBriefInsertResult> {
  if (!canAccessReviewItemWorkspace(access, input.workspace_id)) {
    return { ok: false, error: "forbidden" };
  }

  if (!input.claim_family.trim() || !input.brief_title.trim() || !input.brief_summary.trim()) {
    return { ok: false, error: "required_fields_missing" };
  }

  const status = input.status ?? "ready_for_review";
  if (!isSupportedEvidenceChangeBriefStatus(status)) {
    return { ok: false, error: "unsupported_brief_status" };
  }

  if (!isSupportedEvidenceSignalValue(input.evidence_signal)) {
    return { ok: false, error: "unsupported_evidence_signal" };
  }

  if (!isSupportedRiskImplicationValue(input.risk_implication)) {
    return { ok: false, error: "unsupported_risk_implication" };
  }

  if (!input.recommended_action.trim()) {
    return { ok: false, error: "required_fields_missing" };
  }

  if (!isEvidenceChangeBriefPersistenceConfigured()) {
    return { ok: false, error: "supabase_not_configured" };
  }

  try {
    const client = createSupabaseServerClient();
    const { data, error } = await client
      .from(EVIDENCE_CHANGE_BRIEFS_TABLE)
      .insert({
        workspace_id: input.workspace_id.trim(),
        claim_family: input.claim_family.trim(),
        watchlist_id: input.watchlist_id?.trim() || null,
        evidence_alert_id: input.evidence_alert_id?.trim() || null,
        review_item_id: input.review_item_id ?? null,
        brief_title: input.brief_title.trim(),
        brief_summary: input.brief_summary.trim(),
        what_changed: input.what_changed.trim(),
        why_it_matters: input.why_it_matters.trim(),
        evidence_signal: input.evidence_signal,
        risk_implication: input.risk_implication,
        recommended_action: input.recommended_action.trim(),
        safer_wording: input.safer_wording?.trim() || null,
        affected_client_claims_count: input.affected_client_claims_count,
        status,
      })
      .select("*")
      .single();

    if (error) {
      return { ok: false, error: normalizeStoreError(error, "briefs") };
    }

    return {
      ok: true,
      brief: toPrivacySafeEvidenceChangeBrief(data as EvidenceChangeBriefRow),
    };
  } catch (error) {
    return { ok: false, error: normalizeStoreError(error, "briefs") };
  }
}

export async function createEvidenceChangeBriefClaimSnapshots(
  briefId: string,
  workspaceId: string,
  snapshots: EvidenceChangeBriefClaimSnapshotInput[],
  access: ReviewQueueAccessContext
): Promise<EvidenceChangeBriefClaimSnapshotsResult> {
  if (!canAccessReviewItemWorkspace(access, workspaceId)) {
    return { ok: false, error: "forbidden" };
  }

  if (!briefId.trim()) {
    return { ok: false, error: "required_fields_missing" };
  }

  if (!isEvidenceChangeBriefPersistenceConfigured()) {
    return { ok: false, error: "supabase_not_configured" };
  }

  if (snapshots.length === 0) {
    return { ok: true, claims: [] };
  }

  try {
    const client = createSupabaseServerClient();
    const rows = snapshots.map((snapshot) => ({
      brief_id: briefId,
      workspace_id: workspaceId,
      client_claim_id: snapshot.client_claim_id.trim(),
      claim_text_snapshot: snapshot.claim_text_snapshot.trim(),
      claim_source_type: snapshot.claim_source_type ?? null,
      claim_source_label: snapshot.claim_source_label?.trim() || null,
      claim_family: snapshot.claim_family.trim(),
      mapping_confidence: snapshot.mapping_confidence ?? null,
    }));

    const { data, error } = await client
      .from(EVIDENCE_CHANGE_BRIEF_CLAIMS_TABLE)
      .insert(rows)
      .select("*");

    if (error) {
      return { ok: false, error: normalizeStoreError(error, "brief_claims") };
    }

    return {
      ok: true,
      claims: ((data ?? []) as EvidenceChangeBriefClaimRow[]).map(
        toPrivacySafeEvidenceChangeBriefClaim
      ),
    };
  } catch (error) {
    return { ok: false, error: normalizeStoreError(error, "brief_claims") };
  }
}

export async function listEvidenceChangeBriefs(
  access: ReviewQueueAccessContext,
  filters: EvidenceChangeBriefListFilters = {}
): Promise<EvidenceChangeBriefListResult> {
  if (!isEvidenceChangeBriefPersistenceConfigured()) {
    return { briefs: [], error: "supabase_not_configured" };
  }

  try {
    const scopedFilters = applyAccessToListFilters(filters, access);
    const client = createSupabaseServerClient();
    let query = client.from(EVIDENCE_CHANGE_BRIEFS_TABLE).select("*");

    if ("workspace_ids" in scopedFilters && scopedFilters.workspace_ids) {
      query = query.in("workspace_id", scopedFilters.workspace_ids);
    } else if (scopedFilters.workspace_id) {
      query = query.eq("workspace_id", scopedFilters.workspace_id);
    }

    if (scopedFilters.claim_family) {
      query = query.eq("claim_family", scopedFilters.claim_family);
    }

    if (scopedFilters.status) {
      query = query.eq("status", scopedFilters.status);
    }

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      return { briefs: [], error: normalizeStoreError(error, "briefs") };
    }

    return {
      briefs: ((data ?? []) as EvidenceChangeBriefRow[]).map(toPrivacySafeEvidenceChangeBrief),
    };
  } catch (error) {
    return { briefs: [], error: normalizeStoreError(error, "briefs") };
  }
}

export async function getEvidenceChangeBriefById(
  briefId: string,
  access: ReviewQueueAccessContext
): Promise<EvidenceChangeBriefLookupResult> {
  if (!briefId.trim()) {
    return { brief: null, error: "required_fields_missing" };
  }

  if (!isEvidenceChangeBriefPersistenceConfigured()) {
    return { brief: null, error: "supabase_not_configured" };
  }

  try {
    const client = createSupabaseServerClient();
    const { data, error } = await client
      .from(EVIDENCE_CHANGE_BRIEFS_TABLE)
      .select("*")
      .eq("id", briefId)
      .maybeSingle();

    if (error) {
      return { brief: null, error: normalizeStoreError(error, "briefs") };
    }

    if (!data) {
      return { brief: null };
    }

    const brief = toPrivacySafeEvidenceChangeBrief(data as EvidenceChangeBriefRow);
    if (!canAccessReviewItemWorkspace(access, brief.workspace_id)) {
      return { brief: null, error: "forbidden" };
    }

    return { brief };
  } catch (error) {
    return { brief: null, error: normalizeStoreError(error, "briefs") };
  }
}

export async function listEvidenceChangeBriefClaimsForBrief(
  briefId: string,
  access: ReviewQueueAccessContext
): Promise<EvidenceChangeBriefClaimsListResult> {
  const briefResult = await getEvidenceChangeBriefById(briefId, access);
  if (briefResult.error === "forbidden") {
    return { claims: [], error: "forbidden" };
  }

  if (!briefResult.brief) {
    return { claims: [], error: briefResult.error ?? "brief_not_found" };
  }

  if (!isEvidenceChangeBriefPersistenceConfigured()) {
    return { claims: [], error: "supabase_not_configured" };
  }

  try {
    const client = createSupabaseServerClient();
    const { data, error } = await client
      .from(EVIDENCE_CHANGE_BRIEF_CLAIMS_TABLE)
      .select("*")
      .eq("brief_id", briefId)
      .order("created_at", { ascending: true });

    if (error) {
      return { claims: [], error: normalizeStoreError(error, "brief_claims") };
    }

    return {
      claims: ((data ?? []) as EvidenceChangeBriefClaimRow[]).map(
        toPrivacySafeEvidenceChangeBriefClaim
      ),
    };
  } catch (error) {
    return { claims: [], error: normalizeStoreError(error, "brief_claims") };
  }
}

export async function findActiveBriefForClaimFamily(
  workspaceId: string,
  claimFamily: string,
  access: ReviewQueueAccessContext
): Promise<EvidenceChangeBriefLookupResult> {
  if (!canAccessReviewItemWorkspace(access, workspaceId)) {
    return { brief: null, error: "forbidden" };
  }

  const listResult = await listEvidenceChangeBriefs(access, {
    workspace_id: workspaceId,
    claim_family: claimFamily,
  });

  if (listResult.error) {
    return { brief: null, error: listResult.error };
  }

  const activeBrief = listResult.briefs.find(
    (brief) => brief.status === "draft" || brief.status === "ready_for_review"
  );

  return { brief: activeBrief ?? null };
}
