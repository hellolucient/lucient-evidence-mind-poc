import {
  EXTERNAL_MIND_HANDOFF_SEND_EVENTS_TABLE,
  createSupabaseServerClient,
  getSupabaseEnvConfig,
} from "@/engine/watchlist/supabase-client";
import {
  isSupportedExternalMindHandoffSendEventResult,
  isSupportedExternalMindHandoffSendEventType,
  type ExternalMindHandoffSendAccessMode,
  type ExternalMindHandoffSendActorType,
  type ExternalMindHandoffSendEventResult,
  type ExternalMindHandoffSendEventType,
} from "@/lib/review/external-mind-handoff-send-event-constants";
import { canAccessReviewItemWorkspace, type ReviewQueueAccessContext } from "@/lib/operator-auth";
import { containsSensitiveEnvValue } from "@/lib/watch/external-mind-handoff-send-config";
import { sanitizeWatchRunErrorMessage } from "@/lib/watch/watch-run-logger";

export type ExternalMindHandoffSendEventRow = {
  id: string;
  workspace_id: string;
  handoff_id: string;
  digest_id: string | null;
  event_type: string;
  destination: string;
  payload_version: string | null;
  actor_type: string;
  actor_email: string | null;
  access_mode: string | null;
  result: string | null;
  status_before: string | null;
  status_after: string | null;
  attempted_at: string;
  completed_at: string | null;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type PrivacySafeExternalMindHandoffSendEvent = {
  event_type: ExternalMindHandoffSendEventType;
  result: ExternalMindHandoffSendEventResult | null;
  destination: string;
  actor_type: ExternalMindHandoffSendActorType;
  access_mode: ExternalMindHandoffSendAccessMode | null;
  attempted_at: string;
  completed_at: string | null;
  error_message: string | null;
};

export type ExternalMindHandoffSendEventInsertInput = {
  workspace_id: string;
  handoff_id: string;
  digest_id?: string | null;
  event_type: ExternalMindHandoffSendEventType;
  destination: string;
  payload_version?: string | null;
  actor_type: ExternalMindHandoffSendActorType;
  actor_email?: string | null;
  access_mode?: ExternalMindHandoffSendAccessMode | null;
  result?: ExternalMindHandoffSendEventResult | null;
  status_before?: string | null;
  status_after?: string | null;
  attempted_at?: string;
  completed_at?: string | null;
  error_message?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type ExternalMindHandoffSendEventInsertResult =
  | { ok: true; event: PrivacySafeExternalMindHandoffSendEvent }
  | { ok: false; error: string };

export type ExternalMindHandoffSendEventListResult = {
  events: PrivacySafeExternalMindHandoffSendEvent[];
  error?: string;
};

export type ExternalMindHandoffSendEventListFilters = {
  handoff_id?: string;
  digest_id?: string;
};

export type ExternalMindHandoffSendReceiptMetadata = {
  provider?: string;
  transport_mode?: string;
  transport_kind?: string;
  endpoint_host?: string;
  http_status?: number;
  conversation_id_suffix?: string;
  message_id_suffix?: string;
};

export const SEND_EVENT_PRIVATE_FIELDS = [
  "id",
  "workspace_id",
  "handoff_id",
  "digest_id",
  "payload_version",
  "actor_email",
  "metadata",
] as const;

export const SEND_EVENT_DISPLAY_FIELDS = [
  "event_type",
  "result",
  "destination",
  "actor_type",
  "access_mode",
  "attempted_at",
  "completed_at",
  "error_message",
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

function normalizeStoreError(error: unknown): string {
  const sanitized = sanitizeWatchRunErrorMessage(error);

  if (
    typeof error === "object" &&
    error !== null &&
    isMissingTableError(error as { code?: string; message?: string })
  ) {
    return "external_mind_handoff_send_events_table_missing";
  }

  return sanitized;
}

export function isExternalMindHandoffSendEventPersistenceConfigured(): boolean {
  const { hasSupabaseUrl, hasSupabaseServiceRoleKey } = getSupabaseEnvConfig();
  return hasSupabaseUrl && hasSupabaseServiceRoleKey;
}

export function isPrivacySafeExternalMindHandoffSendEventMetadata(
  metadata: Record<string, unknown> | null | undefined
): boolean {
  if (!metadata) {
    return true;
  }

  for (const value of Object.values(metadata)) {
    if (typeof value === "string" && containsSensitiveEnvValue(value)) {
      return false;
    }
  }

  return true;
}

export function toPrivacySafeExternalMindHandoffSendEvent(
  row: ExternalMindHandoffSendEventRow
): PrivacySafeExternalMindHandoffSendEvent {
  return {
    event_type: row.event_type as ExternalMindHandoffSendEventType,
    result: row.result as ExternalMindHandoffSendEventResult | null,
    destination: row.destination,
    actor_type: row.actor_type as ExternalMindHandoffSendActorType,
    access_mode: (row.access_mode as ExternalMindHandoffSendAccessMode | null) ?? null,
    attempted_at: row.attempted_at,
    completed_at: row.completed_at,
    error_message: row.error_message,
  };
}

export function isPrivacySafeExternalMindHandoffSendEventPayload(
  event: Record<string, unknown>
): boolean {
  for (const field of SEND_EVENT_PRIVATE_FIELDS) {
    if (field in event) {
      return false;
    }
  }

  return SEND_EVENT_DISPLAY_FIELDS.every((field) => field in event);
}

function applyAccessToListFilters(
  filters: ExternalMindHandoffSendEventListFilters,
  access: ReviewQueueAccessContext
): ExternalMindHandoffSendEventListFilters & { workspace_ids?: string[] } {
  if (access.mode === "break_glass") {
    return filters;
  }

  const allowed = access.workspaceIds;
  if (allowed.length === 0) {
    return { ...filters, workspace_ids: ["__no_workspace_access__"] };
  }

  return { ...filters, workspace_ids: allowed };
}

export async function insertExternalMindHandoffSendEvent(
  input: ExternalMindHandoffSendEventInsertInput
): Promise<ExternalMindHandoffSendEventInsertResult> {
  if (
    !input.workspace_id.trim() ||
    !input.handoff_id.trim() ||
    !input.destination.trim() ||
    !isSupportedExternalMindHandoffSendEventType(input.event_type)
  ) {
    return { ok: false, error: "required_fields_missing" };
  }

  if (input.result && !isSupportedExternalMindHandoffSendEventResult(input.result)) {
    return { ok: false, error: "unsupported_send_event_result" };
  }

  if (input.metadata && !isPrivacySafeExternalMindHandoffSendEventMetadata(input.metadata)) {
    return { ok: false, error: "metadata_not_privacy_safe" };
  }

  if (!isExternalMindHandoffSendEventPersistenceConfigured()) {
    return { ok: false, error: "supabase_not_configured" };
  }

  const attemptedAt = input.attempted_at ?? new Date().toISOString();

  try {
    const client = createSupabaseServerClient();
    const { data, error } = await client
      .from(EXTERNAL_MIND_HANDOFF_SEND_EVENTS_TABLE)
      .insert({
        workspace_id: input.workspace_id.trim(),
        handoff_id: input.handoff_id.trim(),
        digest_id: input.digest_id ?? null,
        event_type: input.event_type,
        destination: input.destination,
        payload_version: input.payload_version ?? null,
        actor_type: input.actor_type,
        actor_email: input.actor_email ?? null,
        access_mode: input.access_mode ?? null,
        result: input.result ?? null,
        status_before: input.status_before ?? null,
        status_after: input.status_after ?? null,
        attempted_at: attemptedAt,
        completed_at: input.completed_at ?? null,
        error_message: input.error_message ?? null,
        metadata: input.metadata ?? null,
      })
      .select("*")
      .single();

    if (error) {
      return { ok: false, error: normalizeStoreError(error) };
    }

    return {
      ok: true,
      event: toPrivacySafeExternalMindHandoffSendEvent(data as ExternalMindHandoffSendEventRow),
    };
  } catch (error) {
    return { ok: false, error: normalizeStoreError(error) };
  }
}

export async function listExternalMindHandoffSendEvents(
  access: ReviewQueueAccessContext,
  filters: ExternalMindHandoffSendEventListFilters = {}
): Promise<ExternalMindHandoffSendEventListResult> {
  if (!isExternalMindHandoffSendEventPersistenceConfigured()) {
    return { events: [], error: "supabase_not_configured" };
  }

  try {
    const client = createSupabaseServerClient();
    const scopedFilters = applyAccessToListFilters(filters, access);
    let query = client.from(EXTERNAL_MIND_HANDOFF_SEND_EVENTS_TABLE).select(
      "id, workspace_id, handoff_id, digest_id, event_type, destination, payload_version, actor_type, actor_email, access_mode, result, status_before, status_after, attempted_at, completed_at, error_message, metadata, created_at"
    );

    if (scopedFilters.workspace_ids) {
      query = query.in("workspace_id", scopedFilters.workspace_ids);
    }

    if (scopedFilters.handoff_id) {
      query = query.eq("handoff_id", scopedFilters.handoff_id);
    }

    if (scopedFilters.digest_id) {
      query = query.eq("digest_id", scopedFilters.digest_id);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      return { events: [], error: normalizeStoreError(error) };
    }

    const events = ((data ?? []) as ExternalMindHandoffSendEventRow[])
      .filter((row) => canAccessReviewItemWorkspace(access, row.workspace_id))
      .map(toPrivacySafeExternalMindHandoffSendEvent);

    return { events };
  } catch (error) {
    return { events: [], error: normalizeStoreError(error) };
  }
}

export async function listExternalMindHandoffSendEventsForHandoff(
  handoffId: string,
  access: ReviewQueueAccessContext
): Promise<ExternalMindHandoffSendEventListResult> {
  if (!handoffId.trim()) {
    return { events: [], error: "required_fields_missing" };
  }

  return listExternalMindHandoffSendEvents(access, { handoff_id: handoffId });
}

export async function listExternalMindHandoffSendEventsForDigest(
  digestId: string,
  access: ReviewQueueAccessContext
): Promise<ExternalMindHandoffSendEventListResult> {
  if (!digestId.trim()) {
    return { events: [], error: "required_fields_missing" };
  }

  return listExternalMindHandoffSendEvents(access, { digest_id: digestId });
}

function pickReceiptMetadata(
  metadata: Record<string, unknown> | null | undefined
): ExternalMindHandoffSendReceiptMetadata | null {
  if (!metadata) {
    return null;
  }

  const picked: ExternalMindHandoffSendReceiptMetadata = {};
  const getString = (key: string): string | undefined =>
    typeof metadata[key] === "string" ? (metadata[key] as string) : undefined;
  const getNumber = (key: string): number | undefined =>
    typeof metadata[key] === "number" ? (metadata[key] as number) : undefined;

  picked.provider = getString("provider");
  picked.transport_mode = getString("transport_mode");
  picked.transport_kind = getString("transport_kind");
  picked.endpoint_host = getString("endpoint_host");
  picked.http_status = getNumber("http_status");
  picked.conversation_id_suffix = getString("conversation_id_suffix");
  picked.message_id_suffix = getString("message_id_suffix");

  return Object.values(picked).some((value) => value !== undefined) ? picked : null;
}

export async function getLatestExternalMindHandoffSendReceiptMetadataForHandoff(
  handoffId: string,
  access: ReviewQueueAccessContext
): Promise<{ metadata: ExternalMindHandoffSendReceiptMetadata | null; error?: string }> {
  if (!handoffId.trim()) {
    return { metadata: null, error: "required_fields_missing" };
  }

  if (!isExternalMindHandoffSendEventPersistenceConfigured()) {
    return { metadata: null, error: "supabase_not_configured" };
  }

  try {
    const client = createSupabaseServerClient();
    const { data, error } = await client
      .from(EXTERNAL_MIND_HANDOFF_SEND_EVENTS_TABLE)
      .select("workspace_id, event_type, result, metadata, created_at")
      .eq("handoff_id", handoffId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      return { metadata: null, error: normalizeStoreError(error) };
    }

    const rows = (data ?? []) as Pick<
      ExternalMindHandoffSendEventRow,
      "workspace_id" | "event_type" | "result" | "metadata" | "created_at"
    >[];

    const allowed = rows.filter((row) => canAccessReviewItemWorkspace(access, row.workspace_id));
    const succeeded = allowed.find(
      (row) => row.event_type === "send_succeeded" && row.result === "external_sent"
    );
    const candidate = succeeded ?? allowed[0];
    const raw = candidate?.metadata ?? null;

    if (raw && !isPrivacySafeExternalMindHandoffSendEventMetadata(raw)) {
      return { metadata: null, error: "metadata_not_privacy_safe" };
    }

    return { metadata: pickReceiptMetadata(raw) };
  } catch (err) {
    return { metadata: null, error: normalizeStoreError(err) };
  }
}
