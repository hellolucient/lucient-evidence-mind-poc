import {
  EXTERNAL_MIND_HANDOFFS_TABLE,
  createSupabaseServerClient,
  getSupabaseEnvConfig,
} from "@/engine/watchlist/supabase-client";
import {
  ACTIVE_EXTERNAL_MIND_HANDOFF_STATUSES,
  DEFAULT_EXTERNAL_MIND_HANDOFF_REVIEW_STATUS,
  DEFAULT_MIND_DIGEST_HANDOFF_DESTINATION,
  DEFAULT_MIND_DIGEST_HANDOFF_TYPE,
  MIND_DIGEST_HANDOFF_PAYLOAD_VERSION,
  isSupportedExternalMindHandoffDestination,
  isSupportedExternalMindHandoffReviewStatus,
  isSupportedExternalMindHandoffStatus,
  isSupportedExternalMindHandoffType,
  type ExternalMindHandoffDestination,
  type ExternalMindHandoffReviewStatus,
  type ExternalMindHandoffStatus,
  type ExternalMindHandoffType,
} from "@/lib/review/external-mind-handoff-constants";
import { canAccessReviewItemWorkspace, type ReviewQueueAccessContext } from "@/lib/operator-auth";
import type { MindDigestHandoffPayloadV1 } from "@/lib/watch/external-mind-handoff-payload-builder";
import type { PrivacySafeExternalMindHandoffSendResult } from "@/lib/review/external-mind-handoff-send-result";
import { sanitizeWatchRunErrorMessage } from "@/lib/watch/watch-run-logger";

export type ExternalMindHandoffRow = {
  id: string;
  workspace_id: string;
  digest_id: string;
  handoff_type: string;
  destination: string;
  payload_version: string;
  payload_json: MindDigestHandoffPayloadV1;
  status: string;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
  error_message: string | null;
  send_attempted_at: string | null;
  send_result_json: PrivacySafeExternalMindHandoffSendResult | null;
  review_status: string;
  reviewed_at: string | null;
  reviewed_by_actor_type: string | null;
  reviewed_by_actor_email: string | null;
  review_note: string | null;
  approved_at: string | null;
  approved_by_actor_type: string | null;
  approved_by_actor_email: string | null;
  approval_note: string | null;
};

export type PrivacySafeExternalMindHandoff = {
  id: string;
  workspace_id: string;
  digest_id: string;
  handoff_type: string;
  destination: string;
  payload_version: string;
  status: string;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
  send_attempted_at: string | null;
  send_result_json: PrivacySafeExternalMindHandoffSendResult | null;
  review_status: ExternalMindHandoffReviewStatus;
  reviewed_at: string | null;
  reviewed_by_actor_type: string | null;
  reviewed_by_actor_email: string | null;
  review_note: string | null;
  approved_at: string | null;
  approved_by_actor_type: string | null;
  approved_by_actor_email: string | null;
  approval_note: string | null;
};

export type PrivacySafeExternalMindHandoffWithPayload = PrivacySafeExternalMindHandoff & {
  payload_json: MindDigestHandoffPayloadV1;
};

export type ExternalMindHandoffInsertInput = {
  workspace_id: string;
  digest_id: string;
  handoff_type: ExternalMindHandoffType;
  destination: ExternalMindHandoffDestination;
  payload_version: string;
  payload_json: MindDigestHandoffPayloadV1;
  status?: ExternalMindHandoffStatus;
};

export type ExternalMindHandoffInsertResult =
  | { ok: true; handoff: PrivacySafeExternalMindHandoffWithPayload }
  | { ok: false; error: string };

export type ExternalMindHandoffLookupResult = {
  handoff: PrivacySafeExternalMindHandoffWithPayload | null;
  error?: string;
};

export type ExternalMindHandoffListResult = {
  handoffs: PrivacySafeExternalMindHandoff[];
  error?: string;
};

export type ExternalMindHandoffArchiveResult =
  | { ok: true; handoff: PrivacySafeExternalMindHandoff }
  | { ok: false; error: string };

export type ExternalMindHandoffSendRecordInput = {
  status: ExternalMindHandoffStatus;
  sent_at?: string | null;
  send_attempted_at: string;
  send_result_json: PrivacySafeExternalMindHandoffSendResult;
  error_message?: string | null;
};

export type ExternalMindHandoffReviewUpdateInput = {
  review_status: ExternalMindHandoffReviewStatus;
  reviewed_at?: string | null;
  reviewed_by_actor_type?: string | null;
  reviewed_by_actor_email?: string | null;
  review_note?: string | null;
  approved_at?: string | null;
  approved_by_actor_type?: string | null;
  approved_by_actor_email?: string | null;
  approval_note?: string | null;
};

export type ExternalMindHandoffReviewUpdateResult =
  | { ok: true; handoff: PrivacySafeExternalMindHandoffWithPayload }
  | { ok: false; error: string };

export type ExternalMindHandoffSendRecordResult =
  | { ok: true; handoff: PrivacySafeExternalMindHandoffWithPayload }
  | { ok: false; error: string };

export type ExternalMindHandoffListFilters = {
  workspace_id?: string;
  digest_id?: string;
  destination?: ExternalMindHandoffDestination;
  status?: ExternalMindHandoffStatus;
};

export const HANDOFF_PRIVATE_FIELDS = ["payload_json", "error_message"] as const;

export const HANDOFF_DISPLAY_FIELDS = [
  "id",
  "workspace_id",
  "digest_id",
  "handoff_type",
  "destination",
  "payload_version",
  "status",
  "created_at",
  "updated_at",
  "sent_at",
  "send_attempted_at",
  "send_result_json",
  "review_status",
  "reviewed_at",
  "reviewed_by_actor_type",
  "approved_at",
  "approved_by_actor_type",
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

function isDuplicateActiveHandoffError(error: { code?: string; message?: string }): boolean {
  const message = error.message?.toLowerCase() ?? "";
  return (
    error.code === "23505" &&
    (message.includes("external_mind_handoffs_active_digest_destination_version_idx") ||
      message.includes("duplicate key") ||
      message.includes("unique constraint"))
  );
}

function normalizeStoreError(error: unknown): string {
  const sanitized = sanitizeWatchRunErrorMessage(error);

  if (
    typeof error === "object" &&
    error !== null &&
    isMissingTableError(error as { code?: string; message?: string })
  ) {
    return "external_mind_handoffs_table_missing";
  }

  if (
    typeof error === "object" &&
    error !== null &&
    isDuplicateActiveHandoffError(error as { code?: string; message?: string })
  ) {
    return "duplicate_active_handoff";
  }

  return sanitized;
}

export function isExternalMindHandoffPersistenceConfigured(): boolean {
  const { hasSupabaseUrl, hasSupabaseServiceRoleKey } = getSupabaseEnvConfig();
  return hasSupabaseUrl && hasSupabaseServiceRoleKey;
}

export function toPrivacySafeExternalMindHandoff(
  row: ExternalMindHandoffRow
): PrivacySafeExternalMindHandoff {
  return {
    id: row.id,
    workspace_id: row.workspace_id,
    digest_id: row.digest_id,
    handoff_type: row.handoff_type,
    destination: row.destination,
    payload_version: row.payload_version,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    sent_at: row.sent_at,
    send_attempted_at: row.send_attempted_at,
    send_result_json: row.send_result_json,
    review_status: isSupportedExternalMindHandoffReviewStatus(row.review_status)
      ? row.review_status
      : DEFAULT_EXTERNAL_MIND_HANDOFF_REVIEW_STATUS,
    reviewed_at: row.reviewed_at,
    reviewed_by_actor_type: row.reviewed_by_actor_type,
    reviewed_by_actor_email: row.reviewed_by_actor_email,
    review_note: row.review_note,
    approved_at: row.approved_at,
    approved_by_actor_type: row.approved_by_actor_type,
    approved_by_actor_email: row.approved_by_actor_email,
    approval_note: row.approval_note,
  };
}

export function toPrivacySafeExternalMindHandoffWithPayload(
  row: ExternalMindHandoffRow
): PrivacySafeExternalMindHandoffWithPayload {
  return {
    ...toPrivacySafeExternalMindHandoff(row),
    payload_json: row.payload_json,
  };
}

export function isPrivacySafeExternalMindHandoffPayload(
  handoff: Record<string, unknown>
): boolean {
  for (const field of HANDOFF_PRIVATE_FIELDS) {
    if (field in handoff) {
      return false;
    }
  }

  return HANDOFF_DISPLAY_FIELDS.every((field) => field in handoff);
}

function applyAccessToListFilters(
  filters: ExternalMindHandoffListFilters,
  access: ReviewQueueAccessContext
): ExternalMindHandoffListFilters & { workspace_ids?: string[] } {
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

export async function createExternalMindHandoff(
  input: ExternalMindHandoffInsertInput,
  access: ReviewQueueAccessContext
): Promise<ExternalMindHandoffInsertResult> {
  if (!canAccessReviewItemWorkspace(access, input.workspace_id)) {
    return { ok: false, error: "forbidden" };
  }

  if (
    !input.workspace_id.trim() ||
    !input.digest_id.trim() ||
    !input.payload_version.trim() ||
    !input.payload_json
  ) {
    return { ok: false, error: "required_fields_missing" };
  }

  if (!isSupportedExternalMindHandoffType(input.handoff_type)) {
    return { ok: false, error: "unsupported_handoff_type" };
  }

  if (!isSupportedExternalMindHandoffDestination(input.destination)) {
    return { ok: false, error: "unsupported_handoff_destination" };
  }

  const status = input.status ?? "ready";
  if (!isSupportedExternalMindHandoffStatus(status)) {
    return { ok: false, error: "unsupported_handoff_status" };
  }

  if (!isExternalMindHandoffPersistenceConfigured()) {
    return { ok: false, error: "supabase_not_configured" };
  }

  try {
    const client = createSupabaseServerClient();
    const { data, error } = await client
      .from(EXTERNAL_MIND_HANDOFFS_TABLE)
      .insert({
        workspace_id: input.workspace_id.trim(),
        digest_id: input.digest_id.trim(),
        handoff_type: input.handoff_type,
        destination: input.destination,
        payload_version: input.payload_version.trim(),
        payload_json: input.payload_json,
        status,
        review_status: DEFAULT_EXTERNAL_MIND_HANDOFF_REVIEW_STATUS,
      })
      .select("*")
      .single();

    if (error) {
      return { ok: false, error: normalizeStoreError(error) };
    }

    return {
      ok: true,
      handoff: toPrivacySafeExternalMindHandoffWithPayload(data as ExternalMindHandoffRow),
    };
  } catch (error) {
    return { ok: false, error: normalizeStoreError(error) };
  }
}

export async function listExternalMindHandoffs(
  access: ReviewQueueAccessContext,
  filters: ExternalMindHandoffListFilters = {}
): Promise<ExternalMindHandoffListResult> {
  if (!isExternalMindHandoffPersistenceConfigured()) {
    return { handoffs: [], error: "supabase_not_configured" };
  }

  try {
    const client = createSupabaseServerClient();
    const scopedFilters = applyAccessToListFilters(filters, access);
    let query = client.from(EXTERNAL_MIND_HANDOFFS_TABLE).select(
      "id, workspace_id, digest_id, handoff_type, destination, payload_version, status, created_at, updated_at, sent_at, send_attempted_at, send_result_json, review_status, reviewed_at, reviewed_by_actor_type, approved_at, approved_by_actor_type"
    );

    if (scopedFilters.workspace_ids) {
      query = query.in("workspace_id", scopedFilters.workspace_ids);
    }

    if (scopedFilters.digest_id) {
      query = query.eq("digest_id", scopedFilters.digest_id);
    }

    if (scopedFilters.destination) {
      query = query.eq("destination", scopedFilters.destination);
    }

    if (scopedFilters.status) {
      query = query.eq("status", scopedFilters.status);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      return { handoffs: [], error: normalizeStoreError(error) };
    }

    return {
      handoffs: ((data ?? []) as ExternalMindHandoffRow[]).map(toPrivacySafeExternalMindHandoff),
    };
  } catch (error) {
    return { handoffs: [], error: normalizeStoreError(error) };
  }
}

export async function getExternalMindHandoffById(
  handoffId: string,
  access: ReviewQueueAccessContext
): Promise<ExternalMindHandoffLookupResult> {
  if (!handoffId.trim()) {
    return { handoff: null, error: "required_fields_missing" };
  }

  if (!isExternalMindHandoffPersistenceConfigured()) {
    return { handoff: null, error: "supabase_not_configured" };
  }

  try {
    const client = createSupabaseServerClient();
    const { data, error } = await client
      .from(EXTERNAL_MIND_HANDOFFS_TABLE)
      .select("*")
      .eq("id", handoffId)
      .maybeSingle();

    if (error) {
      return { handoff: null, error: normalizeStoreError(error) };
    }

    if (!data) {
      return { handoff: null };
    }

    const handoff = toPrivacySafeExternalMindHandoffWithPayload(data as ExternalMindHandoffRow);
    if (!canAccessReviewItemWorkspace(access, handoff.workspace_id)) {
      return { handoff: null, error: "forbidden" };
    }

    return { handoff };
  } catch (error) {
    return { handoff: null, error: normalizeStoreError(error) };
  }
}

export async function getExternalMindHandoffPayload(
  handoffId: string,
  access: ReviewQueueAccessContext
): Promise<ExternalMindHandoffLookupResult> {
  return getExternalMindHandoffById(handoffId, access);
}

export async function findActiveHandoffForDigest(
  digestId: string,
  destination: ExternalMindHandoffDestination,
  payloadVersion: string,
  access: ReviewQueueAccessContext
): Promise<ExternalMindHandoffLookupResult> {
  if (!digestId.trim()) {
    return { handoff: null, error: "required_fields_missing" };
  }

  if (!isExternalMindHandoffPersistenceConfigured()) {
    return { handoff: null, error: "supabase_not_configured" };
  }

  try {
    const client = createSupabaseServerClient();
    const { data, error } = await client
      .from(EXTERNAL_MIND_HANDOFFS_TABLE)
      .select("*")
      .eq("digest_id", digestId)
      .eq("destination", destination)
      .eq("payload_version", payloadVersion)
      .in("status", [...ACTIVE_EXTERNAL_MIND_HANDOFF_STATUSES])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return { handoff: null, error: normalizeStoreError(error) };
    }

    if (!data) {
      return { handoff: null };
    }

    const handoff = toPrivacySafeExternalMindHandoffWithPayload(data as ExternalMindHandoffRow);
    if (!canAccessReviewItemWorkspace(access, handoff.workspace_id)) {
      return { handoff: null, error: "forbidden" };
    }

    return { handoff };
  } catch (error) {
    return { handoff: null, error: normalizeStoreError(error) };
  }
}

export async function archiveExternalMindHandoff(
  handoffId: string,
  access: ReviewQueueAccessContext
): Promise<ExternalMindHandoffArchiveResult> {
  const lookup = await getExternalMindHandoffById(handoffId, access);
  if (lookup.error === "forbidden") {
    return { ok: false, error: "forbidden" };
  }

  if (!lookup.handoff) {
    return { ok: false, error: lookup.error ?? "handoff_not_found" };
  }

  if (!isExternalMindHandoffPersistenceConfigured()) {
    return { ok: false, error: "supabase_not_configured" };
  }

  try {
    const client = createSupabaseServerClient();
    const { data, error } = await client
      .from(EXTERNAL_MIND_HANDOFFS_TABLE)
      .update({
        status: "archived",
        updated_at: new Date().toISOString(),
      })
      .eq("id", handoffId)
      .select("id, workspace_id, digest_id, handoff_type, destination, payload_version, status, created_at, updated_at, sent_at, payload_json, error_message, send_attempted_at, send_result_json")
      .single();

    if (error) {
      return { ok: false, error: normalizeStoreError(error) };
    }

    return {
      ok: true,
      handoff: toPrivacySafeExternalMindHandoff(data as ExternalMindHandoffRow),
    };
  } catch (error) {
    return { ok: false, error: normalizeStoreError(error) };
  }
}

export async function recordExternalMindHandoffSendAttempt(
  handoffId: string,
  access: ReviewQueueAccessContext,
  input: ExternalMindHandoffSendRecordInput
): Promise<ExternalMindHandoffSendRecordResult> {
  const lookup = await getExternalMindHandoffById(handoffId, access);
  if (lookup.error === "forbidden") {
    return { ok: false, error: "forbidden" };
  }

  if (!lookup.handoff) {
    return { ok: false, error: lookup.error ?? "handoff_not_found" };
  }

  if (!isSupportedExternalMindHandoffStatus(input.status)) {
    return { ok: false, error: "unsupported_handoff_status" };
  }

  if (!isExternalMindHandoffPersistenceConfigured()) {
    return { ok: false, error: "supabase_not_configured" };
  }

  try {
    const client = createSupabaseServerClient();
    const { data, error } = await client
      .from(EXTERNAL_MIND_HANDOFFS_TABLE)
      .update({
        status: input.status,
        sent_at: input.sent_at ?? null,
        send_attempted_at: input.send_attempted_at,
        send_result_json: input.send_result_json,
        error_message: input.error_message ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", handoffId)
      .select("*")
      .single();

    if (error) {
      return { ok: false, error: normalizeStoreError(error) };
    }

    return {
      ok: true,
      handoff: toPrivacySafeExternalMindHandoffWithPayload(data as ExternalMindHandoffRow),
    };
  } catch (error) {
    return { ok: false, error: normalizeStoreError(error) };
  }
}

export async function updateExternalMindHandoffReview(
  handoffId: string,
  access: ReviewQueueAccessContext,
  input: ExternalMindHandoffReviewUpdateInput
): Promise<ExternalMindHandoffReviewUpdateResult> {
  const lookup = await getExternalMindHandoffById(handoffId, access);
  if (lookup.error === "forbidden") {
    return { ok: false, error: "forbidden" };
  }

  if (!lookup.handoff) {
    return { ok: false, error: lookup.error ?? "handoff_not_found" };
  }

  if (lookup.handoff.status === "sent" || lookup.handoff.status === "archived") {
    return { ok: false, error: "handoff_not_reviewable" };
  }

  if (!isSupportedExternalMindHandoffReviewStatus(input.review_status)) {
    return { ok: false, error: "unsupported_review_status" };
  }

  if (!isExternalMindHandoffPersistenceConfigured()) {
    return { ok: false, error: "supabase_not_configured" };
  }

  try {
    const client = createSupabaseServerClient();
    const { data, error } = await client
      .from(EXTERNAL_MIND_HANDOFFS_TABLE)
      .update({
        review_status: input.review_status,
        reviewed_at: input.reviewed_at ?? null,
        reviewed_by_actor_type: input.reviewed_by_actor_type ?? null,
        reviewed_by_actor_email: input.reviewed_by_actor_email ?? null,
        review_note: input.review_note ?? null,
        approved_at: input.approved_at ?? null,
        approved_by_actor_type: input.approved_by_actor_type ?? null,
        approved_by_actor_email: input.approved_by_actor_email ?? null,
        approval_note: input.approval_note ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", handoffId)
      .select("*")
      .single();

    if (error) {
      return { ok: false, error: normalizeStoreError(error) };
    }

    return {
      ok: true,
      handoff: toPrivacySafeExternalMindHandoffWithPayload(data as ExternalMindHandoffRow),
    };
  } catch (error) {
    return { ok: false, error: normalizeStoreError(error) };
  }
}

export {
  DEFAULT_MIND_DIGEST_HANDOFF_DESTINATION,
  DEFAULT_MIND_DIGEST_HANDOFF_TYPE,
  MIND_DIGEST_HANDOFF_PAYLOAD_VERSION,
};
