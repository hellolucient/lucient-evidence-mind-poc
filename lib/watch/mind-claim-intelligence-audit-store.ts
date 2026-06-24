import {
  MIND_CLAIM_INTELLIGENCE_AUDIT_EVENTS_TABLE,
  createSupabaseServerClient,
  getSupabaseEnvConfig,
} from "@/engine/watchlist/supabase-client";
import type { MindClaimIntelligenceAuditEntityType } from "@/lib/review/mind-claim-intelligence-constants";
import { canAccessReviewItemWorkspace, type ReviewQueueAccessContext } from "@/lib/operator-auth";
import { sanitizeWatchRunErrorMessage } from "@/lib/watch/watch-run-logger";

export type MindClaimIntelligenceAuditEventRow = {
  id: string;
  workspace_id: string;
  entity_type: string;
  entity_id: string;
  event_type: string;
  event_summary: string;
  actor: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type PrivacySafeMindClaimIntelligenceAuditEvent = {
  audit_event_id: string;
  workspace_id: string;
  entity_type: string;
  entity_id: string;
  event_type: string;
  event_summary: string;
  actor: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type MindClaimIntelligenceAuditInsertInput = {
  workspace_id: string;
  entity_type: MindClaimIntelligenceAuditEntityType;
  entity_id: string;
  event_type: string;
  event_summary: string;
  actor?: string | null;
  metadata?: Record<string, unknown>;
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
    return "mind_claim_intelligence_tables_missing";
  }

  return sanitized;
}

export function isMindClaimIntelligencePersistenceConfigured(): boolean {
  const { hasSupabaseUrl, hasSupabaseServiceRoleKey } = getSupabaseEnvConfig();
  return hasSupabaseUrl && hasSupabaseServiceRoleKey;
}

function toPrivacySafeAuditEvent(
  row: MindClaimIntelligenceAuditEventRow
): PrivacySafeMindClaimIntelligenceAuditEvent {
  return {
    audit_event_id: row.id,
    workspace_id: row.workspace_id,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    event_type: row.event_type,
    event_summary: row.event_summary,
    actor: row.actor,
    metadata: row.metadata ?? {},
    created_at: row.created_at,
  };
}

export async function recordMindClaimIntelligenceAuditEvent(
  input: MindClaimIntelligenceAuditInsertInput,
  access: ReviewQueueAccessContext
): Promise<{ ok: boolean; error?: string }> {
  if (!canAccessReviewItemWorkspace(access, input.workspace_id)) {
    return { ok: false, error: "forbidden" };
  }

  if (!isMindClaimIntelligencePersistenceConfigured()) {
    return { ok: false, error: "supabase_not_configured" };
  }

  try {
    const client = createSupabaseServerClient();
    const { error } = await client.from(MIND_CLAIM_INTELLIGENCE_AUDIT_EVENTS_TABLE).insert({
      workspace_id: input.workspace_id,
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      event_type: input.event_type,
      event_summary: input.event_summary.slice(0, 500),
      actor: input.actor?.trim() || null,
      metadata: input.metadata ?? {},
    });

    if (error) {
      return { ok: false, error: normalizeStoreError(error) };
    }

    return { ok: true };
  } catch (error) {
    return { ok: false, error: normalizeStoreError(error) };
  }
}

export async function listMindClaimIntelligenceAuditEvents(
  access: ReviewQueueAccessContext,
  filters: {
    workspace_id: string;
    entity_type?: string;
    entity_id?: string;
    limit?: number;
  }
): Promise<{ events: PrivacySafeMindClaimIntelligenceAuditEvent[]; error?: string }> {
  if (!canAccessReviewItemWorkspace(access, filters.workspace_id)) {
    return { events: [], error: "forbidden" };
  }

  if (!isMindClaimIntelligencePersistenceConfigured()) {
    return { events: [], error: "supabase_not_configured" };
  }

  try {
    const client = createSupabaseServerClient();
    let query = client
      .from(MIND_CLAIM_INTELLIGENCE_AUDIT_EVENTS_TABLE)
      .select("*")
      .eq("workspace_id", filters.workspace_id);

    if (filters.entity_type) {
      query = query.eq("entity_type", filters.entity_type);
    }

    if (filters.entity_id) {
      query = query.eq("entity_id", filters.entity_id);
    }

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(filters.limit ?? 50);

    if (error) {
      return { events: [], error: normalizeStoreError(error) };
    }

    return {
      events: ((data ?? []) as MindClaimIntelligenceAuditEventRow[]).map(toPrivacySafeAuditEvent),
    };
  } catch (error) {
    return { events: [], error: normalizeStoreError(error) };
  }
}
