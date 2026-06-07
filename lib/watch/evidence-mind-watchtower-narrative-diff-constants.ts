export const WATCHTOWER_NARRATIVE_DIFF_VERSIONS = ["watchtower_narrative_diff_v1"] as const;

export type WatchtowerNarrativeDiffVersion = (typeof WATCHTOWER_NARRATIVE_DIFF_VERSIONS)[number];

export const WATCHTOWER_NARRATIVE_COMPARISON_SCOPES = ["workspace_digest_sequence"] as const;

export type WatchtowerNarrativeComparisonScope =
  (typeof WATCHTOWER_NARRATIVE_COMPARISON_SCOPES)[number];

export const WATCHTOWER_NARRATIVE_DIFF_METHODS = ["deterministic_template"] as const;

export type WatchtowerNarrativeDiffMethod = (typeof WATCHTOWER_NARRATIVE_DIFF_METHODS)[number];

export const WATCHTOWER_NARRATIVE_INTERPRETATION_CHANGE_LEVELS = [
  "none",
  "low",
  "medium",
  "high",
] as const;

export type WatchtowerNarrativeInterpretationChangeLevel =
  (typeof WATCHTOWER_NARRATIVE_INTERPRETATION_CHANGE_LEVELS)[number];

export const WATCHTOWER_NARRATIVE_RISK_POSTURE_CHANGES = [
  "unchanged",
  "increased",
  "decreased",
  "unknown_to_known",
  "known_to_unknown",
  "not_applicable",
] as const;

export type WatchtowerNarrativeRiskPostureChange =
  (typeof WATCHTOWER_NARRATIVE_RISK_POSTURE_CHANGES)[number];

export const WATCHTOWER_NARRATIVE_OPERATOR_FOCUS_CHANGES = [
  "unchanged",
  "changed",
  "not_applicable",
] as const;

export type WatchtowerNarrativeOperatorFocusChange =
  (typeof WATCHTOWER_NARRATIVE_OPERATOR_FOCUS_CHANGES)[number];

export const WATCHTOWER_NARRATIVE_RECOMMENDED_ACTION_CHANGES = [
  "unchanged",
  "changed",
  "not_applicable",
] as const;

export type WatchtowerNarrativeRecommendedActionChange =
  (typeof WATCHTOWER_NARRATIVE_RECOMMENDED_ACTION_CHANGES)[number];

export const WATCHTOWER_NARRATIVE_URGENCY_CHANGES = [
  "unchanged",
  "increased",
  "decreased",
  "unknown",
] as const;

export type WatchtowerNarrativeUrgencyChange =
  (typeof WATCHTOWER_NARRATIVE_URGENCY_CHANGES)[number];

export const WATCHTOWER_NARRATIVE_DIFF_SIGNALS = [
  "no_prior_narrative",
  "no_material_change",
  "wording_changed_only",
  "evidence_count_changed",
  "claim_family_scope_changed",
  "risk_posture_increased",
  "risk_posture_decreased",
  "recommended_action_changed",
  "operator_focus_changed",
  "operator_attention_required",
  "confidence_increased",
  "confidence_decreased",
] as const;

export type WatchtowerNarrativeDiffSignal = (typeof WATCHTOWER_NARRATIVE_DIFF_SIGNALS)[number];

export const DEFAULT_WATCHTOWER_NARRATIVE_DIFF_VERSION = "watchtower_narrative_diff_v1" as const;

export const DEFAULT_WATCHTOWER_NARRATIVE_COMPARISON_SCOPE =
  "workspace_digest_sequence" as const;

export const DEFAULT_WATCHTOWER_NARRATIVE_DIFF_METHOD = "deterministic_template" as const;

export function isSupportedWatchtowerNarrativeDiffVersion(
  value: string
): value is WatchtowerNarrativeDiffVersion {
  return (WATCHTOWER_NARRATIVE_DIFF_VERSIONS as readonly string[]).includes(value);
}

export function isSupportedWatchtowerNarrativeComparisonScope(
  value: string
): value is WatchtowerNarrativeComparisonScope {
  return (WATCHTOWER_NARRATIVE_COMPARISON_SCOPES as readonly string[]).includes(value);
}

export function isSupportedWatchtowerNarrativeDiffMethod(
  value: string
): value is WatchtowerNarrativeDiffMethod {
  return (WATCHTOWER_NARRATIVE_DIFF_METHODS as readonly string[]).includes(value);
}

export function isSupportedWatchtowerNarrativeInterpretationChangeLevel(
  value: string
): value is WatchtowerNarrativeInterpretationChangeLevel {
  return (WATCHTOWER_NARRATIVE_INTERPRETATION_CHANGE_LEVELS as readonly string[]).includes(value);
}

export function isSupportedWatchtowerNarrativeDiffSignal(
  value: string
): value is WatchtowerNarrativeDiffSignal {
  return (WATCHTOWER_NARRATIVE_DIFF_SIGNALS as readonly string[]).includes(value);
}
