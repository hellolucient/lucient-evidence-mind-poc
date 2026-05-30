import {
  MAGNESIUM_CORTISOL_GENERATED_QUERY,
  MAGNESIUM_CORTISOL_QUERY_VERSION,
  MAGNESIUM_CORTISOL_STRESS_PROFILE,
  buildPubMedQueryFromProfile,
  getProfileQueryIntent,
  resolveClaimFamilySearchProfile,
} from "./watch/claim-family-search-profiles";

export type QueryStrategyMode = "raw" | "structured";

export type QueryStrategy = {
  mode: QueryStrategyMode;
  raw_query: string;
  structured_query: string | null;
  watch_topic_id: string | null;
  query_intent: string;
  exclusion_terms_applied: string[];
  fallback_used?: boolean;
  fallback_reason?: string | null;
};

export const WATCH_MAGNESIUM_CORTISOL_TOPIC_ID = "watch-magnesium-cortisol";
export const MAGNESIUM_CORTISOL_CLAIM_FAMILY =
  MAGNESIUM_CORTISOL_STRESS_PROFILE.claim_family_id;

export { MAGNESIUM_CORTISOL_QUERY_VERSION };

export const MAGNESIUM_CORTISOL_EXCLUSION_TERMS = [
  ...MAGNESIUM_CORTISOL_STRESS_PROFILE.noise_exclusion_terms,
];

/** Generated from the magnesium_cortisol_stress search profile (v1). */
export const MAGNESIUM_CORTISOL_STRUCTURED_QUERY = MAGNESIUM_CORTISOL_GENERATED_QUERY;

export function supportsStructuredQuery(
  watchTopicId?: string | null,
  claimFamily?: string | null
): boolean {
  return Boolean(resolveClaimFamilySearchProfile({ watchTopicId, claimFamily }));
}

export function resolveUseStructuredQuery(
  filters: { use_structured_query?: boolean } | undefined,
  defaultWhenUnset: boolean
): boolean {
  if (filters?.use_structured_query === true) {
    return true;
  }
  if (filters?.use_structured_query === false) {
    return false;
  }
  return defaultWhenUnset;
}

export function buildQueryStrategy(
  rawQuery: string,
  watchTopicId: string | null,
  claimFamily: string | null,
  useStructuredQuery: boolean
): QueryStrategy {
  const base: QueryStrategy = {
    mode: "raw",
    raw_query: rawQuery,
    structured_query: null,
    watch_topic_id: watchTopicId,
    query_intent: "Keyword search using the provided query text.",
    exclusion_terms_applied: [],
  };

  const profile = resolveClaimFamilySearchProfile({ watchTopicId, claimFamily });

  if (!useStructuredQuery || !profile) {
    return base;
  }

  return {
    mode: "structured",
    raw_query: rawQuery,
    structured_query: buildPubMedQueryFromProfile(profile),
    watch_topic_id: watchTopicId,
    query_intent: getProfileQueryIntent(profile),
    exclusion_terms_applied: [...profile.noise_exclusion_terms],
  };
}

export function effectiveSearchQuery(strategy: QueryStrategy): string {
  if (strategy.mode === "structured" && strategy.structured_query) {
    return strategy.structured_query;
  }
  return strategy.raw_query;
}
