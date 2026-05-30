import {
  createSupabaseServerClient,
  EVIDENCE_REVIEW_ITEM_NOTES_TABLE,
  getSupabaseEnvConfig,
} from "@/engine/watchlist/supabase-client";
import type { ReviewQueueAccessContext } from "@/lib/operator-auth";
import {
  formatReviewItemAuditActorLabel,
  type ReviewItemAuditAccessMode,
  type ReviewItemAuditActorType,
} from "@/lib/review/evidence-review-item-audit-store";
import { sanitizeWatchRunErrorMessage } from "@/lib/watch/watch-run-logger";

export type ReviewItemNoteRow = {
  id: string;
  workspace_id: string;
  review_item_id: string;
  note_text: string;
  decision_type: string | null;
  actor_type: string;
  actor_email: string | null;
  access_mode: string;
  created_at: string;
};

export type PrivacySafeReviewItemNote = {
  created_at: string;
  note_text: string;
  decision_type: string | null;
  actor_label: string;
  access_mode: ReviewItemAuditAccessMode;
};

export type ReviewItemNoteInsertInput = {
  workspace_id: string;
  review_item_id: string;
  note_text: string;
  decision_type: string | null;
  actor_type: ReviewItemAuditActorType;
  actor_email: string | null;
  access_mode: ReviewItemAuditAccessMode;
};

export type ReviewItemNoteInsertResult = {
  ok: boolean;
  note?: PrivacySafeReviewItemNote;
  error?: string;
};

export type ReviewItemNoteListResult = {
  notes: PrivacySafeReviewItemNote[];
  error?: string;
};

export const REVIEW_ITEM_NOTE_PRIVATE_FIELDS = [
  "id",
  "workspace_id",
  "review_item_id",
  "actor_email",
  "actor_type",
] as const;

export const REVIEW_ITEM_NOTE_DISPLAY_FIELDS = [
  "created_at",
  "note_text",
  "decision_type",
  "actor_label",
  "access_mode",
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
    return "evidence_review_item_notes_table_missing";
  }

  return sanitized;
}

export function isReviewItemNotesPersistenceConfigured(): boolean {
  const { hasSupabaseUrl, hasSupabaseServiceRoleKey } = getSupabaseEnvConfig();
  return hasSupabaseUrl && hasSupabaseServiceRoleKey;
}

export function toPrivacySafeReviewItemNote(row: ReviewItemNoteRow): PrivacySafeReviewItemNote {
  const accessMode = row.access_mode as ReviewItemAuditAccessMode;

  return {
    created_at: row.created_at,
    note_text: row.note_text,
    decision_type: row.decision_type,
    actor_label: formatReviewItemAuditActorLabel(accessMode, row.actor_email),
    access_mode: accessMode,
  };
}

export function isPrivacySafeReviewItemNotePayload(note: Record<string, unknown>): boolean {
  for (const field of REVIEW_ITEM_NOTE_PRIVATE_FIELDS) {
    if (field in note) {
      return false;
    }
  }

  return REVIEW_ITEM_NOTE_DISPLAY_FIELDS.every((field) => field in note);
}

export async function insertReviewItemNote(
  input: ReviewItemNoteInsertInput
): Promise<ReviewItemNoteInsertResult> {
  if (!isReviewItemNotesPersistenceConfigured()) {
    return {
      ok: false,
      error: "supabase_not_configured",
    };
  }

  try {
    const client = createSupabaseServerClient();
    const { data, error } = await client
      .from(EVIDENCE_REVIEW_ITEM_NOTES_TABLE)
      .insert({
        workspace_id: input.workspace_id,
        review_item_id: input.review_item_id,
        note_text: input.note_text,
        decision_type: input.decision_type,
        actor_type: input.actor_type,
        actor_email: input.actor_email,
        access_mode: input.access_mode,
      })
      .select("*")
      .single();

    if (error) {
      return {
        ok: false,
        error: normalizeStoreError(error),
      };
    }

    return {
      ok: true,
      note: toPrivacySafeReviewItemNote(data as ReviewItemNoteRow),
    };
  } catch (error) {
    return {
      ok: false,
      error: normalizeStoreError(error),
    };
  }
}

export async function listReviewItemNotes(
  reviewItemId: string,
  access: ReviewQueueAccessContext
): Promise<ReviewItemNoteListResult> {
  if (!isReviewItemNotesPersistenceConfigured()) {
    return {
      notes: [],
      error: "supabase_not_configured",
    };
  }

  try {
    const client = createSupabaseServerClient();
    let query = client
      .from(EVIDENCE_REVIEW_ITEM_NOTES_TABLE)
      .select("*")
      .eq("review_item_id", reviewItemId);

    if (access.mode === "operator") {
      if (access.workspaceIds.length === 0) {
        return { notes: [] };
      }

      query = query.in("workspace_id", access.workspaceIds);
    }

    const { data, error } = await query.order("created_at", { ascending: false }).limit(50);

    if (error) {
      return {
        notes: [],
        error: normalizeStoreError(error),
      };
    }

    const rows = (data ?? []) as ReviewItemNoteRow[];

    return {
      notes: rows.map(toPrivacySafeReviewItemNote),
    };
  } catch (error) {
    return {
      notes: [],
      error: normalizeStoreError(error),
    };
  }
}
