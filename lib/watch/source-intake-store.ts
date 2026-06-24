import {
  SOURCE_INTAKE_DOCUMENTS_TABLE,
  createSupabaseServerClient,
  getSupabaseEnvConfig,
} from "@/engine/watchlist/supabase-client";
import { canAccessReviewItemWorkspace, type ReviewQueueAccessContext } from "@/lib/operator-auth";
import {
  isSupportedSourceIntakeSourceType,
  type SourceIntakeSourceType,
} from "@/lib/review/mind-claim-intelligence-constants";
import { sanitizeWatchRunErrorMessage } from "@/lib/watch/watch-run-logger";

export type SourceIntakeDocumentRow = {
  id: string;
  workspace_id: string;
  title: string | null;
  source_text: string;
  source_type: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type PrivacySafeSourceIntakeDocument = {
  source_document_id: string;
  workspace_id: string;
  title: string | null;
  source_text: string;
  source_type: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type SourceIntakeDocumentInsertInput = {
  workspace_id: string;
  title?: string | null;
  source_text: string;
  source_type?: SourceIntakeSourceType;
  created_by?: string | null;
};

export type SourceIntakeDocumentListFilters = {
  workspace_id?: string;
  limit?: number;
};

export const SOURCE_INTAKE_DOCUMENT_PRIVATE_FIELDS = ["id"] as const;

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
    return "source_intake_documents_table_missing";
  }

  return sanitized;
}

export function isSourceIntakePersistenceConfigured(): boolean {
  const { hasSupabaseUrl, hasSupabaseServiceRoleKey } = getSupabaseEnvConfig();
  return hasSupabaseUrl && hasSupabaseServiceRoleKey;
}

export function toPrivacySafeSourceIntakeDocument(
  row: SourceIntakeDocumentRow
): PrivacySafeSourceIntakeDocument {
  return {
    source_document_id: row.id,
    workspace_id: row.workspace_id,
    title: row.title,
    source_text: row.source_text,
    source_type: row.source_type,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function applyAccessToListFilters(
  filters: SourceIntakeDocumentListFilters,
  access: ReviewQueueAccessContext
): SourceIntakeDocumentListFilters & { workspace_ids?: string[] } {
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

export async function createSourceIntakeDocument(
  input: SourceIntakeDocumentInsertInput,
  access: ReviewQueueAccessContext
): Promise<
  | { ok: true; document: PrivacySafeSourceIntakeDocument }
  | { ok: false; error: string }
> {
  if (!canAccessReviewItemWorkspace(access, input.workspace_id)) {
    return { ok: false, error: "forbidden" };
  }

  if (!input.source_text.trim()) {
    return { ok: false, error: "source_text_required" };
  }

  const sourceType = input.source_type ?? "spa_wellness_copy";
  if (!isSupportedSourceIntakeSourceType(sourceType)) {
    return { ok: false, error: "unsupported_source_type" };
  }

  if (!isSourceIntakePersistenceConfigured()) {
    return { ok: false, error: "supabase_not_configured" };
  }

  try {
    const client = createSupabaseServerClient();
    const now = new Date().toISOString();
    const { data, error } = await client
      .from(SOURCE_INTAKE_DOCUMENTS_TABLE)
      .insert({
        workspace_id: input.workspace_id,
        title: input.title?.trim() || null,
        source_text: input.source_text.trim(),
        source_type: sourceType,
        created_by: input.created_by?.trim() || null,
        created_at: now,
        updated_at: now,
      })
      .select("*")
      .single();

    if (error) {
      return { ok: false, error: normalizeStoreError(error) };
    }

    return {
      ok: true,
      document: toPrivacySafeSourceIntakeDocument(data as SourceIntakeDocumentRow),
    };
  } catch (error) {
    return { ok: false, error: normalizeStoreError(error) };
  }
}

export async function listSourceIntakeDocuments(
  access: ReviewQueueAccessContext,
  filters: SourceIntakeDocumentListFilters = {}
): Promise<{ documents: PrivacySafeSourceIntakeDocument[]; error?: string }> {
  if (!isSourceIntakePersistenceConfigured()) {
    return { documents: [], error: "supabase_not_configured" };
  }

  try {
    const scopedFilters = applyAccessToListFilters(filters, access);
    const client = createSupabaseServerClient();
    let query = client.from(SOURCE_INTAKE_DOCUMENTS_TABLE).select("*");

    if (scopedFilters.workspace_ids) {
      query = query.in("workspace_id", scopedFilters.workspace_ids);
    } else if (scopedFilters.workspace_id) {
      query = query.eq("workspace_id", scopedFilters.workspace_id);
    }

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(filters.limit ?? 50);

    if (error) {
      return { documents: [], error: normalizeStoreError(error) };
    }

    return {
      documents: ((data ?? []) as SourceIntakeDocumentRow[]).map(toPrivacySafeSourceIntakeDocument),
    };
  } catch (error) {
    return { documents: [], error: normalizeStoreError(error) };
  }
}

export async function getSourceIntakeDocumentById(
  documentId: string,
  access: ReviewQueueAccessContext
): Promise<{ document: PrivacySafeSourceIntakeDocument | null; error?: string }> {
  if (!isSourceIntakePersistenceConfigured()) {
    return { document: null, error: "supabase_not_configured" };
  }

  try {
    const client = createSupabaseServerClient();
    const { data, error } = await client
      .from(SOURCE_INTAKE_DOCUMENTS_TABLE)
      .select("*")
      .eq("id", documentId)
      .maybeSingle();

    if (error) {
      return { document: null, error: normalizeStoreError(error) };
    }

    if (!data) {
      return { document: null, error: "source_document_not_found" };
    }

    const row = data as SourceIntakeDocumentRow;
    if (!canAccessReviewItemWorkspace(access, row.workspace_id)) {
      return { document: null, error: "forbidden" };
    }

    return { document: toPrivacySafeSourceIntakeDocument(row) };
  } catch (error) {
    return { document: null, error: normalizeStoreError(error) };
  }
}
