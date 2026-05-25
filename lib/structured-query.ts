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
export const MAGNESIUM_CORTISOL_CLAIM_FAMILY = "magnesium_cortisol_stress";

export const MAGNESIUM_CORTISOL_EXCLUSION_TERMS = [
  "animals without humans",
  "goat*",
  "cow*",
  "buffalo*",
  "bovine",
  "veterinary",
];

export const MAGNESIUM_CORTISOL_STRUCTURED_QUERY = `(("magnesium"[Title/Abstract] OR "magnesium supplementation"[Title/Abstract]) AND ("cortisol"[Title/Abstract] OR "hypothalamic-pituitary-adrenal"[Title/Abstract] OR "HPA axis"[Title/Abstract] OR "stress physiology"[Title/Abstract]) AND ("humans"[MeSH Terms] OR "adult"[MeSH Terms] OR "clinical trial"[Publication Type] OR "randomized controlled trial"[Publication Type] OR "systematic review"[Publication Type] OR "meta-analysis"[Publication Type]) NOT ("animals"[MeSH Terms] NOT "humans"[MeSH Terms]) NOT (goat*[Title/Abstract] OR cow*[Title/Abstract] OR buffalo*[Title/Abstract] OR bovine[Title/Abstract] OR veterinary[Title/Abstract]))`;

const MAGNESIUM_CORTISOL_QUERY_INTENT =
  "Human-focused magnesium supplementation and cortisol/stress physiology evidence for wellness claim monitoring.";

export function supportsStructuredQuery(
  watchTopicId?: string | null,
  claimFamily?: string | null
): boolean {
  return (
    watchTopicId === WATCH_MAGNESIUM_CORTISOL_TOPIC_ID ||
    claimFamily === MAGNESIUM_CORTISOL_CLAIM_FAMILY
  );
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

  if (!useStructuredQuery || !supportsStructuredQuery(watchTopicId, claimFamily)) {
    return base;
  }

  return {
    mode: "structured",
    raw_query: rawQuery,
    structured_query: MAGNESIUM_CORTISOL_STRUCTURED_QUERY,
    watch_topic_id: watchTopicId,
    query_intent: MAGNESIUM_CORTISOL_QUERY_INTENT,
    exclusion_terms_applied: [...MAGNESIUM_CORTISOL_EXCLUSION_TERMS],
  };
}

export function effectiveSearchQuery(strategy: QueryStrategy): string {
  if (strategy.mode === "structured" && strategy.structured_query) {
    return strategy.structured_query;
  }
  return strategy.raw_query;
}
