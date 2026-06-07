import type { PrivacySafeWatchtowerNarrativeDiff } from "@/lib/watch/evidence-mind-watchtower-narrative-diff-store";

export const WATCHTOWER_NARRATIVE_DIFF_PRIVATE_FIELDS = ["metadata_json"] as const;

export type MindDigestsWatchtowerNarrativeDiffView = Omit<
  PrivacySafeWatchtowerNarrativeDiff,
  "metadata_json"
>;

export function shapeMindDigestsWatchtowerNarrativeDiffView(
  diff: PrivacySafeWatchtowerNarrativeDiff
): MindDigestsWatchtowerNarrativeDiffView {
  const { metadata_json, ...view } = diff;
  void metadata_json;
  return view;
}

export function formatWatchtowerNarrativeDiffLabel(value: string): string {
  return value.replaceAll("_", " ");
}

export function formatWatchtowerNarrativeDiffSignalLabel(signal: string): string {
  return formatWatchtowerNarrativeDiffLabel(signal);
}

export function isMindDigestsWatchtowerNarrativeDiffView(
  value: Record<string, unknown>
): value is MindDigestsWatchtowerNarrativeDiffView {
  for (const field of WATCHTOWER_NARRATIVE_DIFF_PRIVATE_FIELDS) {
    if (field in value) {
      return false;
    }
  }

  return (
    typeof value.id === "string" &&
    typeof value.deterministic_summary === "string" &&
    typeof value.interpretation_change_level === "string" &&
    typeof value.risk_posture_change === "string" &&
    typeof value.urgency_change === "string" &&
    typeof value.operator_focus_change === "string" &&
    typeof value.recommended_action_change === "string" &&
    Array.isArray(value.change_signals) &&
    typeof value.compared_at === "string"
  );
}
