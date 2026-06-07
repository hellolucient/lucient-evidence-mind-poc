import type { ReviewQueueAccessContext } from "@/lib/operator-auth";
import { compareWatchtowerNarrativesForDiff } from "@/lib/watch/evidence-mind-watchtower-narrative-diff-comparator";
import { createWatchtowerNarrativeDiff } from "@/lib/watch/evidence-mind-watchtower-narrative-diff-store";
import type { PrivacySafeWatchtowerNarrativeDiff } from "@/lib/watch/evidence-mind-watchtower-narrative-diff-store";
import {
  findPreviousWatchtowerNarrativeInWorkspace,
  type PrivacySafeWatchtowerNarrative,
} from "@/lib/watch/evidence-mind-watchtower-narrative-store";

export type GenerateAndStoreWatchtowerNarrativeDiffInput = {
  currentNarrative: PrivacySafeWatchtowerNarrative;
  access: ReviewQueueAccessContext;
  comparedAt?: string;
};

export type WatchtowerNarrativeDiffGenerationResult =
  | { ok: true; diff: PrivacySafeWatchtowerNarrativeDiff; duplicate_skipped?: boolean }
  | { ok: false; error: string };

export function watchtowerNarrativeDiffGenerationErrorMessage(error: string): string {
  switch (error) {
    case "supabase_not_configured":
      return "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.";
    case "evidence_mind_watchtower_narrative_diffs_table_missing":
      return "The evidence_mind_watchtower_narrative_diffs table is missing. Apply the Phase 36 migration in Supabase.";
    case "forbidden":
      return "You do not have access to store watchtower narrative diffs in this workspace.";
    case "required_fields_missing":
      return "Required watchtower narrative diff fields are missing.";
    default:
      return `Unable to generate watchtower narrative diff: ${error}`;
  }
}

export async function generateAndStoreWatchtowerNarrativeDiffForNarrative(
  input: GenerateAndStoreWatchtowerNarrativeDiffInput
): Promise<WatchtowerNarrativeDiffGenerationResult> {
  const comparedAt = input.comparedAt ?? new Date().toISOString();
  const { currentNarrative, access } = input;

  const previousResult = await findPreviousWatchtowerNarrativeInWorkspace(
    {
      workspace_id: currentNarrative.workspace_id,
      current_narrative_id: currentNarrative.id,
      narrative_type: currentNarrative.narrative_type,
      narrative_version: currentNarrative.narrative_version,
      generated_at: currentNarrative.generated_at,
    },
    access
  );

  if (previousResult.error) {
    return { ok: false, error: previousResult.error };
  }

  const comparison = compareWatchtowerNarrativesForDiff({
    currentNarrative,
    previousNarrative: previousResult.narrative,
    comparedAt,
  });

  const createResult = await createWatchtowerNarrativeDiff(
    {
      workspace_id: currentNarrative.workspace_id,
      current_narrative_id: currentNarrative.id,
      previous_narrative_id: previousResult.narrative?.id ?? null,
      current_digest_id: currentNarrative.digest_id,
      previous_digest_id: previousResult.narrative?.digest_id ?? null,
      comparison_scope: comparison.comparison_scope,
      diff_version: comparison.diff_version,
      interpretation_change_level: comparison.interpretation_change_level,
      risk_posture_change: comparison.risk_posture_change,
      operator_focus_change: comparison.operator_focus_change,
      recommended_action_change: comparison.recommended_action_change,
      urgency_change: comparison.urgency_change,
      change_signals_json: comparison.change_signals,
      deterministic_summary: comparison.deterministic_summary,
      comparison_method: comparison.comparison_method,
      metadata_json: comparison.metadata_json,
      compared_at: comparedAt,
    },
    access
  );

  if (!createResult.ok) {
    return { ok: false, error: createResult.error };
  }

  return {
    ok: true,
    diff: createResult.diff,
    ...(createResult.duplicate_skipped ? { duplicate_skipped: true } : {}),
  };
}
