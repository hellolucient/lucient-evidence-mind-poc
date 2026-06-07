import {
  EVIDENCE_MIND_WATCHTOWER_NARRATIVE_DIFFS_TABLE,
  createSupabaseServerClient,
  getSupabaseEnvConfig,
} from "@/engine/watchlist/supabase-client";
import {
  isSupportedWatchtowerNarrativeComparisonScope,
  isSupportedWatchtowerNarrativeDiffMethod,
  isSupportedWatchtowerNarrativeDiffSignal,
  isSupportedWatchtowerNarrativeDiffVersion,
  isSupportedWatchtowerNarrativeInterpretationChangeLevel,
  type WatchtowerNarrativeComparisonScope,
  type WatchtowerNarrativeDiffMethod,
  type WatchtowerNarrativeDiffSignal,
  type WatchtowerNarrativeDiffVersion,
  type WatchtowerNarrativeInterpretationChangeLevel,
  type WatchtowerNarrativeOperatorFocusChange,
  type WatchtowerNarrativeRecommendedActionChange,
  type WatchtowerNarrativeRiskPostureChange,
  type WatchtowerNarrativeUrgencyChange,
} from "@/lib/watch/evidence-mind-watchtower-narrative-diff-constants";
import { canAccessReviewItemWorkspace, type ReviewQueueAccessContext } from "@/lib/operator-auth";
import { sanitizeWatchRunErrorMessage } from "@/lib/watch/watch-run-logger";

export type WatchtowerNarrativeDiffRow = {
  id: string;
  workspace_id: string;
  current_narrative_id: string;
  previous_narrative_id: string | null;
  current_digest_id: string | null;
  previous_digest_id: string | null;
  comparison_scope: string;
  diff_version: string;
  interpretation_change_level: string;
  risk_posture_change: string;
  operator_focus_change: string;
  recommended_action_change: string;
  urgency_change: string;
  change_signals_json: unknown;
  deterministic_summary: string;
  comparison_method: string;
  metadata_json: Record<string, unknown> | null;
  compared_at: string;
  created_at: string;
  updated_at: string;
};

export type PrivacySafeWatchtowerNarrativeDiff = {
  id: string;
  workspace_id: string;
  current_narrative_id: string;
  previous_narrative_id: string | null;
  current_digest_id: string | null;
  previous_digest_id: string | null;
  comparison_scope: WatchtowerNarrativeComparisonScope;
  diff_version: WatchtowerNarrativeDiffVersion;
  interpretation_change_level: WatchtowerNarrativeInterpretationChangeLevel;
  risk_posture_change: WatchtowerNarrativeRiskPostureChange;
  operator_focus_change: WatchtowerNarrativeOperatorFocusChange;
  recommended_action_change: WatchtowerNarrativeRecommendedActionChange;
  urgency_change: WatchtowerNarrativeUrgencyChange;
  change_signals: WatchtowerNarrativeDiffSignal[];
  deterministic_summary: string;
  comparison_method: WatchtowerNarrativeDiffMethod;
  metadata_json: Record<string, unknown> | null;
  compared_at: string;
  created_at: string;
  updated_at: string;
};

export type WatchtowerNarrativeDiffInsertInput = {
  workspace_id: string;
  current_narrative_id: string;
  previous_narrative_id?: string | null;
  current_digest_id?: string | null;
  previous_digest_id?: string | null;
  comparison_scope: WatchtowerNarrativeComparisonScope;
  diff_version: WatchtowerNarrativeDiffVersion;
  interpretation_change_level: WatchtowerNarrativeInterpretationChangeLevel;
  risk_posture_change: WatchtowerNarrativeRiskPostureChange;
  operator_focus_change: WatchtowerNarrativeOperatorFocusChange;
  recommended_action_change: WatchtowerNarrativeRecommendedActionChange;
  urgency_change: WatchtowerNarrativeUrgencyChange;
  change_signals_json: WatchtowerNarrativeDiffSignal[];
  deterministic_summary: string;
  comparison_method: WatchtowerNarrativeDiffMethod;
  metadata_json?: Record<string, unknown> | null;
  compared_at?: string;
};

export type WatchtowerNarrativeDiffInsertResult =
  | { ok: true; diff: PrivacySafeWatchtowerNarrativeDiff; duplicate_skipped?: boolean }
  | { ok: false; error: string };

export type WatchtowerNarrativeDiffLookupInput = {
  current_narrative_id: string;
  comparison_scope: WatchtowerNarrativeComparisonScope;
  diff_version: WatchtowerNarrativeDiffVersion;
};

export type WatchtowerNarrativeDiffLookupResult = {
  diff: PrivacySafeWatchtowerNarrativeDiff | null;
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

function isDuplicateActiveDiffError(error: { code?: string; message?: string }): boolean {
  const message = error.message?.toLowerCase() ?? "";
  return (
    error.code === "23505" &&
    (message.includes("evidence_mind_watchtower_narrative_diffs_current_scope_version_idx") ||
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
    return "evidence_mind_watchtower_narrative_diffs_table_missing";
  }

  if (
    typeof error === "object" &&
    error !== null &&
    isDuplicateActiveDiffError(error as { code?: string; message?: string })
  ) {
    return "duplicate_active_diff";
  }

  return sanitized;
}

function parseChangeSignals(value: unknown): WatchtowerNarrativeDiffSignal[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (entry): entry is WatchtowerNarrativeDiffSignal =>
      typeof entry === "string" && isSupportedWatchtowerNarrativeDiffSignal(entry)
  );
}

export function isWatchtowerNarrativeDiffPersistenceConfigured(): boolean {
  const { hasSupabaseUrl, hasSupabaseServiceRoleKey } = getSupabaseEnvConfig();
  return hasSupabaseUrl && hasSupabaseServiceRoleKey;
}

export function toPrivacySafeWatchtowerNarrativeDiff(
  row: WatchtowerNarrativeDiffRow
): PrivacySafeWatchtowerNarrativeDiff {
  return {
    id: row.id,
    workspace_id: row.workspace_id,
    current_narrative_id: row.current_narrative_id,
    previous_narrative_id: row.previous_narrative_id,
    current_digest_id: row.current_digest_id,
    previous_digest_id: row.previous_digest_id,
    comparison_scope: isSupportedWatchtowerNarrativeComparisonScope(row.comparison_scope)
      ? row.comparison_scope
      : "workspace_digest_sequence",
    diff_version: isSupportedWatchtowerNarrativeDiffVersion(row.diff_version)
      ? row.diff_version
      : "watchtower_narrative_diff_v1",
    interpretation_change_level: isSupportedWatchtowerNarrativeInterpretationChangeLevel(
      row.interpretation_change_level
    )
      ? row.interpretation_change_level
      : "none",
    risk_posture_change: row.risk_posture_change as WatchtowerNarrativeRiskPostureChange,
    operator_focus_change: row.operator_focus_change as WatchtowerNarrativeOperatorFocusChange,
    recommended_action_change:
      row.recommended_action_change as WatchtowerNarrativeRecommendedActionChange,
    urgency_change: row.urgency_change as WatchtowerNarrativeUrgencyChange,
    change_signals: parseChangeSignals(row.change_signals_json),
    deterministic_summary: row.deterministic_summary,
    comparison_method: isSupportedWatchtowerNarrativeDiffMethod(row.comparison_method)
      ? row.comparison_method
      : "deterministic_template",
    metadata_json: row.metadata_json,
    compared_at: row.compared_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function validateDiffInsertInput(input: WatchtowerNarrativeDiffInsertInput): string | null {
  if (
    !input.workspace_id.trim() ||
    !input.current_narrative_id.trim() ||
    !input.deterministic_summary.trim()
  ) {
    return "required_fields_missing";
  }

  if (!isSupportedWatchtowerNarrativeComparisonScope(input.comparison_scope)) {
    return "unsupported_comparison_scope";
  }

  if (!isSupportedWatchtowerNarrativeDiffVersion(input.diff_version)) {
    return "unsupported_diff_version";
  }

  if (!isSupportedWatchtowerNarrativeInterpretationChangeLevel(input.interpretation_change_level)) {
    return "unsupported_interpretation_change_level";
  }

  if (!isSupportedWatchtowerNarrativeDiffMethod(input.comparison_method)) {
    return "unsupported_comparison_method";
  }

  if (!input.change_signals_json.every((signal) => isSupportedWatchtowerNarrativeDiffSignal(signal))) {
    return "unsupported_change_signal";
  }

  return null;
}

export async function findWatchtowerNarrativeDiffForCurrentNarrative(
  input: WatchtowerNarrativeDiffLookupInput,
  access: ReviewQueueAccessContext
): Promise<WatchtowerNarrativeDiffLookupResult> {
  if (
    !input.current_narrative_id.trim() ||
    !isSupportedWatchtowerNarrativeComparisonScope(input.comparison_scope) ||
    !isSupportedWatchtowerNarrativeDiffVersion(input.diff_version)
  ) {
    return { diff: null, error: "required_fields_missing" };
  }

  if (!isWatchtowerNarrativeDiffPersistenceConfigured()) {
    return { diff: null, error: "supabase_not_configured" };
  }

  try {
    const client = createSupabaseServerClient();
    const { data, error } = await client
      .from(EVIDENCE_MIND_WATCHTOWER_NARRATIVE_DIFFS_TABLE)
      .select("*")
      .eq("current_narrative_id", input.current_narrative_id.trim())
      .eq("comparison_scope", input.comparison_scope)
      .eq("diff_version", input.diff_version)
      .maybeSingle();

    if (error) {
      return { diff: null, error: normalizeStoreError(error) };
    }

    if (!data) {
      return { diff: null };
    }

    const diff = toPrivacySafeWatchtowerNarrativeDiff(data as WatchtowerNarrativeDiffRow);
    if (!canAccessReviewItemWorkspace(access, diff.workspace_id)) {
      return { diff: null, error: "forbidden" };
    }

    return { diff };
  } catch (error) {
    return { diff: null, error: normalizeStoreError(error) };
  }
}

export async function getLatestWatchtowerNarrativeDiffForNarrative(
  input: WatchtowerNarrativeDiffLookupInput,
  access: ReviewQueueAccessContext
): Promise<WatchtowerNarrativeDiffLookupResult> {
  if (
    !input.current_narrative_id.trim() ||
    !isSupportedWatchtowerNarrativeComparisonScope(input.comparison_scope) ||
    !isSupportedWatchtowerNarrativeDiffVersion(input.diff_version)
  ) {
    return { diff: null, error: "required_fields_missing" };
  }

  if (!isWatchtowerNarrativeDiffPersistenceConfigured()) {
    return { diff: null, error: "supabase_not_configured" };
  }

  try {
    const client = createSupabaseServerClient();
    const { data, error } = await client
      .from(EVIDENCE_MIND_WATCHTOWER_NARRATIVE_DIFFS_TABLE)
      .select("*")
      .eq("current_narrative_id", input.current_narrative_id.trim())
      .eq("comparison_scope", input.comparison_scope)
      .eq("diff_version", input.diff_version)
      .order("compared_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return { diff: null, error: normalizeStoreError(error) };
    }

    if (!data) {
      return { diff: null };
    }

    const diff = toPrivacySafeWatchtowerNarrativeDiff(data as WatchtowerNarrativeDiffRow);
    if (!canAccessReviewItemWorkspace(access, diff.workspace_id)) {
      return { diff: null, error: "forbidden" };
    }

    return { diff };
  } catch (error) {
    return { diff: null, error: normalizeStoreError(error) };
  }
}

export async function createWatchtowerNarrativeDiff(
  input: WatchtowerNarrativeDiffInsertInput,
  access: ReviewQueueAccessContext
): Promise<WatchtowerNarrativeDiffInsertResult> {
  if (!canAccessReviewItemWorkspace(access, input.workspace_id)) {
    return { ok: false, error: "forbidden" };
  }

  const validationError = validateDiffInsertInput(input);
  if (validationError) {
    return { ok: false, error: validationError };
  }

  if (!isWatchtowerNarrativeDiffPersistenceConfigured()) {
    return { ok: false, error: "supabase_not_configured" };
  }

  try {
    const client = createSupabaseServerClient();
    const { data, error } = await client
      .from(EVIDENCE_MIND_WATCHTOWER_NARRATIVE_DIFFS_TABLE)
      .insert({
        workspace_id: input.workspace_id.trim(),
        current_narrative_id: input.current_narrative_id.trim(),
        previous_narrative_id: input.previous_narrative_id ?? null,
        current_digest_id: input.current_digest_id ?? null,
        previous_digest_id: input.previous_digest_id ?? null,
        comparison_scope: input.comparison_scope,
        diff_version: input.diff_version,
        interpretation_change_level: input.interpretation_change_level,
        risk_posture_change: input.risk_posture_change,
        operator_focus_change: input.operator_focus_change,
        recommended_action_change: input.recommended_action_change,
        urgency_change: input.urgency_change,
        change_signals_json: input.change_signals_json,
        deterministic_summary: input.deterministic_summary.trim(),
        comparison_method: input.comparison_method,
        metadata_json: input.metadata_json ?? {},
        compared_at: input.compared_at ?? new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error) {
      if (isDuplicateActiveDiffError(error)) {
        const existing = await findWatchtowerNarrativeDiffForCurrentNarrative(
          {
            current_narrative_id: input.current_narrative_id,
            comparison_scope: input.comparison_scope,
            diff_version: input.diff_version,
          },
          access
        );

        if (existing.diff) {
          return { ok: true, diff: existing.diff, duplicate_skipped: true };
        }
      }

      return { ok: false, error: normalizeStoreError(error) };
    }

    const diff = toPrivacySafeWatchtowerNarrativeDiff(data as WatchtowerNarrativeDiffRow);
    if (!canAccessReviewItemWorkspace(access, diff.workspace_id)) {
      return { ok: false, error: "forbidden" };
    }

    return { ok: true, diff };
  } catch (error) {
    return { ok: false, error: normalizeStoreError(error) };
  }
}
