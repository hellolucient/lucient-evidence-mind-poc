import {
  createSupabaseServerClient,
  EVIDENCE_REVIEW_ITEM_AUDIT_EVENTS_TABLE,
  getSupabaseEnvConfig,
} from "@/engine/watchlist/supabase-client";
import type { ReviewQueueAccessContext } from "@/lib/operator-auth";
import { sanitizeWatchRunErrorMessage } from "@/lib/watch/watch-run-logger";

export type ReviewItemAuditAccessMode = "supabase_operator" | "break_glass";
export type ReviewItemAuditActorType = "supabase_operator" | "break_glass";
export type ReviewItemAuditEventType = "status_changed";

export type ReviewItemAuditEventRow = {
  id: string;
  workspace_id: string;
  review_item_id: string;
  event_type: string;
  old_status: string | null;
  new_status: string;
  actor_type: string;
  actor_email: string | null;
  access_mode: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
};

export type PrivacySafeReviewItemAuditEvent = {
  created_at: string;
  event_type: ReviewItemAuditEventType;
  old_status: string | null;
  new_status: string;
  actor_label: string;
  access_mode: ReviewItemAuditAccessMode;
};

export type ReviewItemAuditInsertInput = {
  workspace_id: string;
  review_item_id: string;
  event_type: ReviewItemAuditEventType;
  old_status: string | null;
  new_status: string;
  actor_type: ReviewItemAuditActorType;
  actor_email: string | null;
  access_mode: ReviewItemAuditAccessMode;
  metadata?: Record<string, unknown> | null;
};

export type ReviewItemAuditInsertResult = {
  ok: boolean;
  error?: string;
};

export type ReviewItemAuditListResult = {
  events: PrivacySafeReviewItemAuditEvent[];
  error?: string;
};

export const REVIEW_ITEM_AUDIT_PRIVATE_FIELDS = [
  "metadata",
  "actor_email",
  "actor_type",
  "workspace_id",
  "review_item_id",
  "id",
] as const;

export const REVIEW_ITEM_AUDIT_DISPLAY_FIELDS = [
  "created_at",
  "event_type",
  "old_status",
  "new_status",
  "actor_label",
  "access_mode",
] as const;

const BREAK_GLASS_ACTOR_LABEL = "Break-glass internal access";

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
    return "evidence_review_item_audit_events_table_missing";
  }

  return sanitized;
}

export function isReviewItemAuditPersistenceConfigured(): boolean {
  const { hasSupabaseUrl, hasSupabaseServiceRoleKey } = getSupabaseEnvConfig();
  return hasSupabaseUrl && hasSupabaseServiceRoleKey;
}

export function formatReviewItemAuditActorLabel(
  accessMode: ReviewItemAuditAccessMode,
  actorEmail: string | null
): string {
  if (accessMode === "break_glass") {
    return BREAK_GLASS_ACTOR_LABEL;
  }

  return actorEmail ?? "Supabase operator";
}

export function toPrivacySafeReviewItemAuditEvent(
  row: ReviewItemAuditEventRow
): PrivacySafeReviewItemAuditEvent {
  const accessMode = row.access_mode as ReviewItemAuditAccessMode;

  return {
    created_at: row.created_at,
    event_type: row.event_type as ReviewItemAuditEventType,
    old_status: row.old_status,
    new_status: row.new_status,
    actor_label: formatReviewItemAuditActorLabel(accessMode, row.actor_email),
    access_mode: accessMode,
  };
}

export function isPrivacySafeReviewItemAuditEventPayload(
  event: Record<string, unknown>
): boolean {
  for (const field of REVIEW_ITEM_AUDIT_PRIVATE_FIELDS) {
    if (field in event) {
      return false;
    }
  }

  return REVIEW_ITEM_AUDIT_DISPLAY_FIELDS.every((field) => field in event);
}

export async function insertReviewItemAuditEvent(
  input: ReviewItemAuditInsertInput
): Promise<ReviewItemAuditInsertResult> {
  if (!isReviewItemAuditPersistenceConfigured()) {
    return {
      ok: false,
      error: "supabase_not_configured",
    };
  }

  try {
    const client = createSupabaseServerClient();
    const { error } = await client.from(EVIDENCE_REVIEW_ITEM_AUDIT_EVENTS_TABLE).insert({
      workspace_id: input.workspace_id,
      review_item_id: input.review_item_id,
      event_type: input.event_type,
      old_status: input.old_status,
      new_status: input.new_status,
      actor_type: input.actor_type,
      actor_email: input.actor_email,
      access_mode: input.access_mode,
      metadata: input.metadata ?? null,
    });

    if (error) {
      return {
        ok: false,
        error: normalizeStoreError(error),
      };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: normalizeStoreError(error),
    };
  }
}

export async function listReviewItemAuditEvents(
  reviewItemId: string,
  access: ReviewQueueAccessContext
): Promise<ReviewItemAuditListResult> {
  if (!isReviewItemAuditPersistenceConfigured()) {
    return {
      events: [],
      error: "supabase_not_configured",
    };
  }

  try {
    const client = createSupabaseServerClient();
    let query = client
      .from(EVIDENCE_REVIEW_ITEM_AUDIT_EVENTS_TABLE)
      .select("*")
      .eq("review_item_id", reviewItemId);

    if (access.mode === "operator") {
      if (access.workspaceIds.length === 0) {
        return { events: [] };
      }

      query = query.in("workspace_id", access.workspaceIds);
    }

    const { data, error } = await query.order("created_at", { ascending: false }).limit(50);

    if (error) {
      return {
        events: [],
        error: normalizeStoreError(error),
      };
    }

    const rows = (data ?? []) as ReviewItemAuditEventRow[];

    return {
      events: rows.map(toPrivacySafeReviewItemAuditEvent),
    };
  } catch (error) {
    return {
      events: [],
      error: normalizeStoreError(error),
    };
  }
}
