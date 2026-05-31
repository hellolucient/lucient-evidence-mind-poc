import {
  EVIDENCE_MIND_DIGEST_ITEMS_TABLE,
  EVIDENCE_MIND_DIGESTS_TABLE,
  createSupabaseServerClient,
  getSupabaseEnvConfig,
} from "@/engine/watchlist/supabase-client";
import {
  isSupportedDigestHighestRiskImplication,
  isSupportedDigestItemType,
  isSupportedEvidenceMindDigestStatus,
  type DigestHighestRiskImplication,
  type DigestItemType,
  type EvidenceMindDigestStatus,
} from "@/lib/review/evidence-mind-digest-constants";
import {
  ACTIVE_EVIDENCE_MIND_DIGEST_STATUSES,
  canonicalDigestPeriodInstant,
  digestPeriodBoundsEqual,
} from "@/lib/review/evidence-mind-digest-period";
import { canAccessReviewItemWorkspace, type ReviewQueueAccessContext } from "@/lib/operator-auth";
import { sanitizeWatchRunErrorMessage } from "@/lib/watch/watch-run-logger";

export type EvidenceMindDigestRow = {
  id: string;
  workspace_id: string;
  period_start: string;
  period_end: string;
  digest_title: string;
  digest_summary: string;
  watchlists_checked_count: number;
  new_alerts_count: number;
  review_items_count: number;
  briefs_count: number;
  affected_claim_families_count: number;
  affected_client_claims_count: number;
  highest_risk_implication: string;
  recommended_focus: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type PrivacySafeEvidenceMindDigest = {
  id: string;
  workspace_id: string;
  period_start: string;
  period_end: string;
  digest_title: string;
  digest_summary: string;
  watchlists_checked_count: number;
  new_alerts_count: number;
  review_items_count: number;
  briefs_count: number;
  affected_claim_families_count: number;
  affected_client_claims_count: number;
  highest_risk_implication: string;
  recommended_focus: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type EvidenceMindDigestItemRow = {
  id: string;
  digest_id: string;
  workspace_id: string;
  item_type: string;
  item_ref_id: string | null;
  claim_family: string | null;
  client_claim_id: string | null;
  title_snapshot: string;
  summary_snapshot: string | null;
  risk_implication: string | null;
  recommended_action: string | null;
  created_at: string;
};

export type PrivacySafeEvidenceMindDigestItem = {
  digest_id: string;
  workspace_id: string;
  item_type: string;
  item_ref_id: string | null;
  claim_family: string | null;
  client_claim_id: string | null;
  title_snapshot: string;
  summary_snapshot: string | null;
  risk_implication: string | null;
  recommended_action: string | null;
  created_at: string;
};

export type EvidenceMindDigestInsertInput = {
  workspace_id: string;
  period_start: string;
  period_end: string;
  digest_title: string;
  digest_summary: string;
  watchlists_checked_count: number;
  new_alerts_count: number;
  review_items_count: number;
  briefs_count: number;
  affected_claim_families_count: number;
  affected_client_claims_count: number;
  highest_risk_implication: DigestHighestRiskImplication;
  recommended_focus: string;
  status?: EvidenceMindDigestStatus;
};

export type EvidenceMindDigestItemSnapshotInput = {
  item_type: DigestItemType;
  item_ref_id?: string | null;
  claim_family?: string | null;
  client_claim_id?: string | null;
  title_snapshot: string;
  summary_snapshot?: string | null;
  risk_implication?: string | null;
  recommended_action?: string | null;
};

export type EvidenceMindDigestInsertResult =
  | { ok: true; digest: PrivacySafeEvidenceMindDigest }
  | { ok: false; error: string };

export type EvidenceMindDigestItemSnapshotsResult =
  | { ok: true; items: PrivacySafeEvidenceMindDigestItem[] }
  | { ok: false; error: string };

export type EvidenceMindDigestListResult = {
  digests: PrivacySafeEvidenceMindDigest[];
  error?: string;
};

export type EvidenceMindDigestLookupResult = {
  digest: PrivacySafeEvidenceMindDigest | null;
  error?: string;
};

export type EvidenceMindDigestItemsListResult = {
  items: PrivacySafeEvidenceMindDigestItem[];
  error?: string;
};

export type EvidenceMindDigestListFilters = {
  workspace_id?: string;
  status?: EvidenceMindDigestStatus;
};

export const DIGEST_ITEM_PRIVATE_FIELDS = ["id"] as const;

export const DIGEST_DISPLAY_FIELDS = [
  "id",
  "workspace_id",
  "period_start",
  "period_end",
  "digest_title",
  "digest_summary",
  "watchlists_checked_count",
  "new_alerts_count",
  "review_items_count",
  "briefs_count",
  "affected_claim_families_count",
  "affected_client_claims_count",
  "highest_risk_implication",
  "recommended_focus",
  "status",
  "created_at",
  "updated_at",
] as const;

export const DIGEST_ITEM_DISPLAY_FIELDS = [
  "digest_id",
  "workspace_id",
  "item_type",
  "item_ref_id",
  "claim_family",
  "client_claim_id",
  "title_snapshot",
  "summary_snapshot",
  "risk_implication",
  "recommended_action",
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

function isDuplicateActiveDigestError(error: { code?: string; message?: string }): boolean {
  const message = error.message?.toLowerCase() ?? "";
  return (
    error.code === "23505" &&
    (message.includes("evidence_mind_digests_active_period_unique_idx") ||
      message.includes("duplicate key") ||
      message.includes("unique constraint"))
  );
}

function normalizeStoreError(error: unknown, tableKind: "digests" | "digest_items"): string {
  const sanitized = sanitizeWatchRunErrorMessage(error);

  if (
    typeof error === "object" &&
    error !== null &&
    isMissingTableError(error as { code?: string; message?: string })
  ) {
    return tableKind === "digests"
      ? "evidence_mind_digests_table_missing"
      : "evidence_mind_digest_items_table_missing";
  }

  if (
    typeof error === "object" &&
    error !== null &&
    tableKind === "digests" &&
    isDuplicateActiveDigestError(error as { code?: string; message?: string })
  ) {
    return "duplicate_active_digest";
  }

  return sanitized;
}

export function isEvidenceMindDigestPersistenceConfigured(): boolean {
  const { hasSupabaseUrl, hasSupabaseServiceRoleKey } = getSupabaseEnvConfig();
  return hasSupabaseUrl && hasSupabaseServiceRoleKey;
}

export function toPrivacySafeEvidenceMindDigest(
  row: EvidenceMindDigestRow
): PrivacySafeEvidenceMindDigest {
  return {
    id: row.id,
    workspace_id: row.workspace_id,
    period_start: row.period_start,
    period_end: row.period_end,
    digest_title: row.digest_title,
    digest_summary: row.digest_summary,
    watchlists_checked_count: row.watchlists_checked_count,
    new_alerts_count: row.new_alerts_count,
    review_items_count: row.review_items_count,
    briefs_count: row.briefs_count,
    affected_claim_families_count: row.affected_claim_families_count,
    affected_client_claims_count: row.affected_client_claims_count,
    highest_risk_implication: row.highest_risk_implication,
    recommended_focus: row.recommended_focus,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function toPrivacySafeEvidenceMindDigestItem(
  row: EvidenceMindDigestItemRow
): PrivacySafeEvidenceMindDigestItem {
  return {
    digest_id: row.digest_id,
    workspace_id: row.workspace_id,
    item_type: row.item_type,
    item_ref_id: row.item_ref_id,
    claim_family: row.claim_family,
    client_claim_id: row.client_claim_id,
    title_snapshot: row.title_snapshot,
    summary_snapshot: row.summary_snapshot,
    risk_implication: row.risk_implication,
    recommended_action: row.recommended_action,
    created_at: row.created_at,
  };
}

export function isPrivacySafeEvidenceMindDigestPayload(digest: Record<string, unknown>): boolean {
  return DIGEST_DISPLAY_FIELDS.every((field) => field in digest);
}

export function isPrivacySafeEvidenceMindDigestItemPayload(
  item: Record<string, unknown>
): boolean {
  for (const field of DIGEST_ITEM_PRIVATE_FIELDS) {
    if (field in item) {
      return false;
    }
  }

  return DIGEST_ITEM_DISPLAY_FIELDS.every((field) => field in item);
}

function applyAccessToListFilters(
  filters: EvidenceMindDigestListFilters,
  access: ReviewQueueAccessContext
): EvidenceMindDigestListFilters & { workspace_ids?: string[] } {
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

export async function createEvidenceMindDigest(
  input: EvidenceMindDigestInsertInput,
  access: ReviewQueueAccessContext
): Promise<EvidenceMindDigestInsertResult> {
  if (!canAccessReviewItemWorkspace(access, input.workspace_id)) {
    return { ok: false, error: "forbidden" };
  }

  if (
    !input.workspace_id.trim() ||
    !input.period_start.trim() ||
    !input.period_end.trim() ||
    !input.digest_title.trim() ||
    !input.digest_summary.trim() ||
    !input.recommended_focus.trim()
  ) {
    return { ok: false, error: "required_fields_missing" };
  }

  const status = input.status ?? "ready_for_review";
  if (!isSupportedEvidenceMindDigestStatus(status)) {
    return { ok: false, error: "unsupported_digest_status" };
  }

  if (!isSupportedDigestHighestRiskImplication(input.highest_risk_implication)) {
    return { ok: false, error: "unsupported_highest_risk_implication" };
  }

  if (!isEvidenceMindDigestPersistenceConfigured()) {
    return { ok: false, error: "supabase_not_configured" };
  }

  try {
    const client = createSupabaseServerClient();
    const { data, error } = await client
      .from(EVIDENCE_MIND_DIGESTS_TABLE)
      .insert({
        workspace_id: input.workspace_id.trim(),
        period_start: canonicalDigestPeriodInstant(input.period_start),
        period_end: canonicalDigestPeriodInstant(input.period_end),
        digest_title: input.digest_title.trim(),
        digest_summary: input.digest_summary.trim(),
        watchlists_checked_count: input.watchlists_checked_count,
        new_alerts_count: input.new_alerts_count,
        review_items_count: input.review_items_count,
        briefs_count: input.briefs_count,
        affected_claim_families_count: input.affected_claim_families_count,
        affected_client_claims_count: input.affected_client_claims_count,
        highest_risk_implication: input.highest_risk_implication,
        recommended_focus: input.recommended_focus.trim(),
        status,
      })
      .select("*")
      .single();

    if (error) {
      return { ok: false, error: normalizeStoreError(error, "digests") };
    }

    return {
      ok: true,
      digest: toPrivacySafeEvidenceMindDigest(data as EvidenceMindDigestRow),
    };
  } catch (error) {
    return { ok: false, error: normalizeStoreError(error, "digests") };
  }
}

export async function createEvidenceMindDigestItemSnapshots(
  digestId: string,
  workspaceId: string,
  snapshots: EvidenceMindDigestItemSnapshotInput[],
  access: ReviewQueueAccessContext
): Promise<EvidenceMindDigestItemSnapshotsResult> {
  if (!canAccessReviewItemWorkspace(access, workspaceId)) {
    return { ok: false, error: "forbidden" };
  }

  if (!digestId.trim()) {
    return { ok: false, error: "required_fields_missing" };
  }

  if (!isEvidenceMindDigestPersistenceConfigured()) {
    return { ok: false, error: "supabase_not_configured" };
  }

  if (snapshots.length === 0) {
    return { ok: true, items: [] };
  }

  for (const snapshot of snapshots) {
    if (!isSupportedDigestItemType(snapshot.item_type)) {
      return { ok: false, error: "unsupported_digest_item_type" };
    }
    if (!snapshot.title_snapshot.trim()) {
      return { ok: false, error: "required_fields_missing" };
    }
  }

  try {
    const client = createSupabaseServerClient();
    const rows = snapshots.map((snapshot) => ({
      digest_id: digestId,
      workspace_id: workspaceId,
      item_type: snapshot.item_type,
      item_ref_id: snapshot.item_ref_id?.trim() || null,
      claim_family: snapshot.claim_family?.trim() || null,
      client_claim_id: snapshot.client_claim_id?.trim() || null,
      title_snapshot: snapshot.title_snapshot.trim(),
      summary_snapshot: snapshot.summary_snapshot?.trim() || null,
      risk_implication: snapshot.risk_implication ?? null,
      recommended_action: snapshot.recommended_action ?? null,
    }));

    const { data, error } = await client
      .from(EVIDENCE_MIND_DIGEST_ITEMS_TABLE)
      .insert(rows)
      .select("*");

    if (error) {
      return { ok: false, error: normalizeStoreError(error, "digest_items") };
    }

    return {
      ok: true,
      items: ((data ?? []) as EvidenceMindDigestItemRow[]).map(
        toPrivacySafeEvidenceMindDigestItem
      ),
    };
  } catch (error) {
    return { ok: false, error: normalizeStoreError(error, "digest_items") };
  }
}

export async function listEvidenceMindDigests(
  access: ReviewQueueAccessContext,
  filters: EvidenceMindDigestListFilters = {}
): Promise<EvidenceMindDigestListResult> {
  if (!isEvidenceMindDigestPersistenceConfigured()) {
    return { digests: [], error: "supabase_not_configured" };
  }

  try {
    const scopedFilters = applyAccessToListFilters(filters, access);
    const client = createSupabaseServerClient();
    let query = client.from(EVIDENCE_MIND_DIGESTS_TABLE).select("*");

    if ("workspace_ids" in scopedFilters && scopedFilters.workspace_ids) {
      query = query.in("workspace_id", scopedFilters.workspace_ids);
    } else if (scopedFilters.workspace_id) {
      query = query.eq("workspace_id", scopedFilters.workspace_id);
    }

    if (scopedFilters.status) {
      query = query.eq("status", scopedFilters.status);
    }

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      return { digests: [], error: normalizeStoreError(error, "digests") };
    }

    return {
      digests: ((data ?? []) as EvidenceMindDigestRow[]).map(toPrivacySafeEvidenceMindDigest),
    };
  } catch (error) {
    return { digests: [], error: normalizeStoreError(error, "digests") };
  }
}

export async function getEvidenceMindDigestById(
  digestId: string,
  access: ReviewQueueAccessContext
): Promise<EvidenceMindDigestLookupResult> {
  if (!digestId.trim()) {
    return { digest: null, error: "required_fields_missing" };
  }

  if (!isEvidenceMindDigestPersistenceConfigured()) {
    return { digest: null, error: "supabase_not_configured" };
  }

  try {
    const client = createSupabaseServerClient();
    const { data, error } = await client
      .from(EVIDENCE_MIND_DIGESTS_TABLE)
      .select("*")
      .eq("id", digestId)
      .maybeSingle();

    if (error) {
      return { digest: null, error: normalizeStoreError(error, "digests") };
    }

    if (!data) {
      return { digest: null };
    }

    const digest = toPrivacySafeEvidenceMindDigest(data as EvidenceMindDigestRow);
    if (!canAccessReviewItemWorkspace(access, digest.workspace_id)) {
      return { digest: null, error: "forbidden" };
    }

    return { digest };
  } catch (error) {
    return { digest: null, error: normalizeStoreError(error, "digests") };
  }
}

export async function listEvidenceMindDigestItemsForDigest(
  digestId: string,
  access: ReviewQueueAccessContext
): Promise<EvidenceMindDigestItemsListResult> {
  const digestResult = await getEvidenceMindDigestById(digestId, access);
  if (digestResult.error === "forbidden") {
    return { items: [], error: "forbidden" };
  }

  if (!digestResult.digest) {
    return { items: [], error: digestResult.error ?? "digest_not_found" };
  }

  if (!isEvidenceMindDigestPersistenceConfigured()) {
    return { items: [], error: "supabase_not_configured" };
  }

  try {
    const client = createSupabaseServerClient();
    const { data, error } = await client
      .from(EVIDENCE_MIND_DIGEST_ITEMS_TABLE)
      .select("*")
      .eq("digest_id", digestId)
      .order("created_at", { ascending: true });

    if (error) {
      return { items: [], error: normalizeStoreError(error, "digest_items") };
    }

    return {
      items: ((data ?? []) as EvidenceMindDigestItemRow[]).map(
        toPrivacySafeEvidenceMindDigestItem
      ),
    };
  } catch (error) {
    return { items: [], error: normalizeStoreError(error, "digest_items") };
  }
}

export async function findActiveDigestForPeriod(
  workspaceId: string,
  periodStart: string,
  periodEnd: string,
  access: ReviewQueueAccessContext
): Promise<EvidenceMindDigestLookupResult> {
  if (!canAccessReviewItemWorkspace(access, workspaceId)) {
    return { digest: null, error: "forbidden" };
  }

  if (!isEvidenceMindDigestPersistenceConfigured()) {
    return { digest: null, error: "supabase_not_configured" };
  }

  try {
    const client = createSupabaseServerClient();
    const { data, error } = await client
      .from(EVIDENCE_MIND_DIGESTS_TABLE)
      .select("*")
      .eq("workspace_id", workspaceId)
      .in("status", [...ACTIVE_EVIDENCE_MIND_DIGEST_STATUSES])
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      return { digest: null, error: normalizeStoreError(error, "digests") };
    }

    const canonicalStart = canonicalDigestPeriodInstant(periodStart);
    const canonicalEnd = canonicalDigestPeriodInstant(periodEnd);

    const activeDigest = ((data ?? []) as EvidenceMindDigestRow[]).find((digest) =>
      digestPeriodBoundsEqual(
        digest.period_start,
        digest.period_end,
        canonicalStart,
        canonicalEnd
      )
    );

    return {
      digest: activeDigest ? toPrivacySafeEvidenceMindDigest(activeDigest) : null,
    };
  } catch (error) {
    return { digest: null, error: normalizeStoreError(error, "digests") };
  }
}
