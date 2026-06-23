import {
  EXTERNAL_MIND_HANDOFF_RECEIPTS_TABLE,
  createSupabaseServerClient,
  getSupabaseEnvConfig,
} from "@/engine/watchlist/supabase-client";
import { canAccessReviewItemWorkspace, type ReviewQueueAccessContext } from "@/lib/operator-auth";
import { containsSensitiveEnvValue } from "@/lib/watch/external-mind-handoff-send-config";
import { sanitizeWatchRunErrorMessage } from "@/lib/watch/watch-run-logger";

export type ExternalMindHandoffReceiptStatus =
  | "delivery_confirmed_from_send_event"
  | "fetched_from_hellominds";

export type ExternalMindHandoffReceiptSource = "send_event_metadata" | "hellominds_read_api";

export type ExternalMindHandoffReceiptRow = {
  id: string;
  workspace_id: string;
  handoff_id: string;
  digest_id: string | null;
  destination: string;
  provider: string;
  conversation_id_suffix: string | null;
  message_id_suffix: string | null;
  receipt_status: string;
  http_status: number | null;
  receipt_source: string;
  verified_at: string | null;
  response_excerpt: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type PrivacySafeExternalMindHandoffReceipt = {
  id: string;
  workspace_id: string;
  handoff_id: string;
  digest_id: string | null;
  destination: string;
  provider: string;
  conversation_id_suffix: string | null;
  message_id_suffix: string | null;
  receipt_status: ExternalMindHandoffReceiptStatus;
  http_status: number | null;
  receipt_source: ExternalMindHandoffReceiptSource;
  verified_at: string | null;
  response_excerpt: string | null;
  created_at: string;
  updated_at: string;
  metadata: Record<string, unknown> | null;
};

export type ExternalMindHandoffReceiptUpsertInput = {
  workspace_id: string;
  handoff_id: string;
  digest_id?: string | null;
  destination: string;
  provider: string;
  conversation_id_suffix?: string | null;
  message_id_suffix?: string | null;
  receipt_status: ExternalMindHandoffReceiptStatus;
  http_status?: number | null;
  receipt_source: ExternalMindHandoffReceiptSource;
  verified_at?: string | null;
  response_excerpt?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type ExternalMindHandoffReceiptUpsertResult =
  | { ok: true; receipt: PrivacySafeExternalMindHandoffReceipt }
  | { ok: false; error: string };

export type ExternalMindHandoffReceiptLookupResult = {
  receipt: PrivacySafeExternalMindHandoffReceipt | null;
  error?: string;
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
    return "external_mind_handoff_receipts_table_missing";
  }

  return sanitized;
}

export function isExternalMindHandoffReceiptPersistenceConfigured(): boolean {
  const { hasSupabaseUrl, hasSupabaseServiceRoleKey } = getSupabaseEnvConfig();
  return hasSupabaseUrl && hasSupabaseServiceRoleKey;
}

function isPrivacySafeReceiptMetadata(metadata: Record<string, unknown> | null | undefined): boolean {
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

function toPrivacySafeReceipt(row: ExternalMindHandoffReceiptRow): PrivacySafeExternalMindHandoffReceipt {
  return {
    id: row.id,
    workspace_id: row.workspace_id,
    handoff_id: row.handoff_id,
    digest_id: row.digest_id,
    destination: row.destination,
    provider: row.provider,
    conversation_id_suffix: row.conversation_id_suffix,
    message_id_suffix: row.message_id_suffix,
    receipt_status: row.receipt_status as ExternalMindHandoffReceiptStatus,
    http_status: row.http_status,
    receipt_source: row.receipt_source as ExternalMindHandoffReceiptSource,
    verified_at: row.verified_at,
    response_excerpt: row.response_excerpt,
    metadata: row.metadata,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function getExternalMindHandoffReceiptForHandoff(
  handoffId: string,
  access: ReviewQueueAccessContext
): Promise<ExternalMindHandoffReceiptLookupResult> {
  if (!handoffId.trim()) {
    return { receipt: null, error: "required_fields_missing" };
  }

  if (!isExternalMindHandoffReceiptPersistenceConfigured()) {
    return { receipt: null, error: "supabase_not_configured" };
  }

  try {
    const client = createSupabaseServerClient();
    const { data, error } = await client
      .from(EXTERNAL_MIND_HANDOFF_RECEIPTS_TABLE)
      .select("*")
      .eq("handoff_id", handoffId)
      .maybeSingle();

    if (error) {
      return { receipt: null, error: normalizeStoreError(error) };
    }

    if (!data) {
      return { receipt: null };
    }

    const receipt = toPrivacySafeReceipt(data as ExternalMindHandoffReceiptRow);
    if (!canAccessReviewItemWorkspace(access, receipt.workspace_id)) {
      return { receipt: null, error: "forbidden" };
    }

    return { receipt };
  } catch (error) {
    return { receipt: null, error: normalizeStoreError(error) };
  }
}

export async function upsertExternalMindHandoffReceipt(
  input: ExternalMindHandoffReceiptUpsertInput,
  access: ReviewQueueAccessContext
): Promise<ExternalMindHandoffReceiptUpsertResult> {
  if (!canAccessReviewItemWorkspace(access, input.workspace_id)) {
    return { ok: false, error: "forbidden" };
  }

  if (
    !input.workspace_id.trim() ||
    !input.handoff_id.trim() ||
    !input.destination.trim() ||
    !input.provider.trim()
  ) {
    return { ok: false, error: "required_fields_missing" };
  }

  if (input.metadata && !isPrivacySafeReceiptMetadata(input.metadata)) {
    return { ok: false, error: "metadata_not_privacy_safe" };
  }

  if (!isExternalMindHandoffReceiptPersistenceConfigured()) {
    return { ok: false, error: "supabase_not_configured" };
  }

  const now = new Date().toISOString();

  try {
    const client = createSupabaseServerClient();
    const { data, error } = await client
      .from(EXTERNAL_MIND_HANDOFF_RECEIPTS_TABLE)
      .upsert(
        {
          workspace_id: input.workspace_id.trim(),
          handoff_id: input.handoff_id.trim(),
          digest_id: input.digest_id ?? null,
          destination: input.destination,
          provider: input.provider,
          conversation_id_suffix: input.conversation_id_suffix ?? null,
          message_id_suffix: input.message_id_suffix ?? null,
          receipt_status: input.receipt_status,
          http_status: typeof input.http_status === "number" ? input.http_status : null,
          receipt_source: input.receipt_source,
          verified_at: input.verified_at ?? now,
          response_excerpt: input.response_excerpt ?? null,
          metadata: input.metadata ?? null,
          updated_at: now,
        },
        { onConflict: "handoff_id" }
      )
      .select("*")
      .single();

    if (error) {
      return { ok: false, error: normalizeStoreError(error) };
    }

    const receipt = toPrivacySafeReceipt(data as ExternalMindHandoffReceiptRow);
    return { ok: true, receipt };
  } catch (error) {
    return { ok: false, error: normalizeStoreError(error) };
  }
}

