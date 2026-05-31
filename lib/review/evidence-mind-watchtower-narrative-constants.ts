export const WATCHTOWER_NARRATIVE_TYPES = [
  "digest_interpretation",
  "claim_family_watch_update",
  "evidence_change_summary",
] as const;

export type WatchtowerNarrativeType = (typeof WATCHTOWER_NARRATIVE_TYPES)[number];

export const WATCHTOWER_NARRATIVE_RISK_POSTURES = [
  "stable",
  "monitor",
  "elevated",
  "material_change",
  "unknown",
] as const;

export type WatchtowerNarrativeRiskPosture = (typeof WATCHTOWER_NARRATIVE_RISK_POSTURES)[number];

export const WATCHTOWER_NARRATIVE_GENERATION_METHODS = [
  "deterministic_template",
  "llm_assisted",
] as const;

export type WatchtowerNarrativeGenerationMethod =
  (typeof WATCHTOWER_NARRATIVE_GENERATION_METHODS)[number];

export const WATCHTOWER_NARRATIVE_CONFIDENCE_LEVELS = ["high", "medium", "low"] as const;

export type WatchtowerNarrativeConfidenceLevel =
  (typeof WATCHTOWER_NARRATIVE_CONFIDENCE_LEVELS)[number];

export const DIGEST_WATCHTOWER_NARRATIVE_VERSION = "watchtower_narrative_v1" as const;

export const DEFAULT_DIGEST_WATCHTOWER_NARRATIVE_TYPE: WatchtowerNarrativeType =
  "digest_interpretation";

export const DEFAULT_WATCHTOWER_NARRATIVE_GENERATION_METHOD: WatchtowerNarrativeGenerationMethod =
  "deterministic_template";

export function isSupportedWatchtowerNarrativeType(
  value: string
): value is WatchtowerNarrativeType {
  return (WATCHTOWER_NARRATIVE_TYPES as readonly string[]).includes(value);
}

export function isSupportedWatchtowerNarrativeRiskPosture(
  value: string
): value is WatchtowerNarrativeRiskPosture {
  return (WATCHTOWER_NARRATIVE_RISK_POSTURES as readonly string[]).includes(value);
}

export function isSupportedWatchtowerNarrativeGenerationMethod(
  value: string
): value is WatchtowerNarrativeGenerationMethod {
  return (WATCHTOWER_NARRATIVE_GENERATION_METHODS as readonly string[]).includes(value);
}

export function isSupportedWatchtowerNarrativeConfidenceLevel(
  value: string
): value is WatchtowerNarrativeConfidenceLevel {
  return (WATCHTOWER_NARRATIVE_CONFIDENCE_LEVELS as readonly string[]).includes(value);
}
