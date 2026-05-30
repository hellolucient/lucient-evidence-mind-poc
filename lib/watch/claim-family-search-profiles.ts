export type PublicationTypePreferences = {
  preferred: string[];
  lower_priority: string[];
};

export type PubMedQuerySpec = {
  /** Terms joined with OR in Title/Abstract for intervention/exposure. */
  intervention_title_abstract: string[];
  /** Terms joined with OR in Title/Abstract for outcome/stress physiology. */
  outcome_title_abstract: string[];
  /** MeSH Terms included in the human/study filter group. */
  mesh_inclusions: string[];
  /** Publication types included in the human/study filter group. */
  publication_type_inclusions: string[];
  /** Applies NOT ("animals"[MeSH Terms] NOT "humans"[MeSH Terms]). */
  exclude_animals_without_humans: boolean;
  /** Title/Abstract terms excluded with NOT (...). Supports PubMed wildcards such as goat*. */
  title_abstract_exclusions: string[];
};

export type ClaimFamilySearchProfile = {
  claim_family_id: string;
  display_name: string;
  description: string;
  watch_topic_ids: string[];
  intervention_terms: string[];
  intervention_synonyms: string[];
  outcome_terms: string[];
  outcome_synonyms: string[];
  mechanism_terms: string[];
  included_concepts: string[];
  excluded_concepts: string[];
  publication_type_preferences: PublicationTypePreferences;
  human_study_filters: string[];
  animal_exclusion_filters: string[];
  noise_exclusion_terms: string[];
  source_priority: string[];
  query_version: string;
  query_intent: string;
  pubmed_query_spec: PubMedQuerySpec;
  relevance_notes: string[];
  appraisal_notes: string[];
};

/** Canonical v1 PubMed query preserved from pre-Phase-15 structured search behavior. */
export const MAGNESIUM_CORTISOL_STRESS_V1_PUBMED_QUERY = `(("magnesium"[Title/Abstract] OR "magnesium supplementation"[Title/Abstract]) AND ("cortisol"[Title/Abstract] OR "hypothalamic-pituitary-adrenal"[Title/Abstract] OR "HPA axis"[Title/Abstract] OR "stress physiology"[Title/Abstract]) AND ("humans"[MeSH Terms] OR "adult"[MeSH Terms] OR "clinical trial"[Publication Type] OR "randomized controlled trial"[Publication Type] OR "systematic review"[Publication Type] OR "meta-analysis"[Publication Type]) NOT ("animals"[MeSH Terms] NOT "humans"[MeSH Terms]) NOT (goat*[Title/Abstract] OR cow*[Title/Abstract] OR buffalo*[Title/Abstract] OR bovine[Title/Abstract] OR veterinary[Title/Abstract]))`;

export const MAGNESIUM_CORTISOL_STRESS_PROFILE: ClaimFamilySearchProfile = {
  claim_family_id: "magnesium_cortisol_stress",
  display_name: "Magnesium, cortisol, and stress physiology",
  description:
    "Tracks evidence related to whether magnesium or magnesium supplementation is associated with cortisol, HPA-axis activity, stress physiology, anxiety, relaxation, or related human stress outcomes.",
  watch_topic_ids: ["watch-magnesium-cortisol"],
  intervention_terms: [
    "magnesium",
    "magnesium supplementation",
    "magnesium deficiency",
    "dietary magnesium",
    "serum magnesium",
  ],
  intervention_synonyms: ["Mg supplementation", "oral magnesium", "magnesium intake"],
  outcome_terms: [
    "cortisol",
    "stress",
    "psychological stress",
    "physiological stress",
    "HPA axis",
    "hypothalamic-pituitary-adrenal",
    "anxiety",
    "sleep quality",
    "relaxation",
  ],
  outcome_synonyms: ["salivary cortisol", "stress response", "stress hormones"],
  mechanism_terms: [
    "hypothalamic-pituitary-adrenal axis",
    "neuroendocrine stress response",
    "stress hormones",
  ],
  included_concepts: [
    "human magnesium supplementation",
    "cortisol regulation",
    "HPA-axis activity",
    "stress physiology",
    "anxiety and relaxation outcomes tied to magnesium",
  ],
  excluded_concepts: [
    "animal-only studies",
    "veterinary studies",
    "bovine, goat, cow, buffalo livestock contexts",
    "general electrolyte papers unless magnesium and stress/cortisol are central",
    "sweat biomarker papers unless directly relevant to magnesium and cortisol/stress",
    "incidental co-mentions of magnesium and cortisol without a stress physiology focus",
  ],
  publication_type_preferences: {
    preferred: [
      "systematic review",
      "meta-analysis",
      "randomized controlled trial",
      "clinical trial",
      "human study",
    ],
    lower_priority: [
      "observational study",
      "narrative review",
      "mechanistic review",
      "biomarker study",
    ],
  },
  human_study_filters: [
    "humans",
    "adult",
    "clinical trial",
    "randomized controlled trial",
    "systematic review",
    "meta-analysis",
  ],
  animal_exclusion_filters: [
    "animals without humans",
    "animal-only studies",
    "veterinary studies",
  ],
  noise_exclusion_terms: [
    "animals without humans",
    "goat*",
    "cow*",
    "buffalo*",
    "bovine",
    "veterinary",
  ],
  source_priority: [
    "PubMed first",
    "PMC/full text (future)",
    "guidelines (future)",
    "regulatory/advertising guidance (future)",
    "clinical trial registries (future)",
  ],
  query_version: "magnesium_cortisol_stress@v1",
  query_intent:
    "Human-focused magnesium supplementation and cortisol/stress physiology evidence for wellness claim monitoring.",
  pubmed_query_spec: {
    intervention_title_abstract: ["magnesium", "magnesium supplementation"],
    outcome_title_abstract: [
      "cortisol",
      "hypothalamic-pituitary-adrenal",
      "HPA axis",
      "stress physiology",
    ],
    mesh_inclusions: ["humans", "adult"],
    publication_type_inclusions: [
      "clinical trial",
      "randomized controlled trial",
      "systematic review",
      "meta-analysis",
    ],
    exclude_animals_without_humans: true,
    title_abstract_exclusions: ["goat*", "cow*", "buffalo*", "bovine", "veterinary"],
  },
  relevance_notes: [
    "Phase 15 v1 PubMed query intentionally uses a conservative subset of outcome terms (cortisol/HPA/stress physiology) to preserve existing watch behavior.",
    "Additional outcome terms such as anxiety, sleep quality, and relaxation are profile metadata for review and future query versions.",
  ],
  appraisal_notes: [
    "Material alerts still depend on contextual appraisal and human RCT/systematic review thresholds from Phase 7–9.6.",
    "Profile metadata does not yet drive automated strengthens/weakens/contradicts classification (Phase 16).",
  ],
};

const CLAIM_FAMILY_SEARCH_PROFILES: Record<string, ClaimFamilySearchProfile> = {
  [MAGNESIUM_CORTISOL_STRESS_PROFILE.claim_family_id]: MAGNESIUM_CORTISOL_STRESS_PROFILE,
};

const WATCH_TOPIC_TO_CLAIM_FAMILY = Object.values(CLAIM_FAMILY_SEARCH_PROFILES).reduce<
  Record<string, string>
>((index, profile) => {
  for (const watchTopicId of profile.watch_topic_ids) {
    index[watchTopicId] = profile.claim_family_id;
  }
  return index;
}, {});

function pubmedFieldGroup(terms: string[], field: string): string {
  return `(${terms.map((term) => `"${term}"[${field}]`).join(" OR ")})`;
}

function pubmedUnquotedFieldGroup(terms: string[], field: string): string {
  return `(${terms.map((term) => `${term}[${field}]`).join(" OR ")})`;
}

export function buildPubMedQueryFromProfile(profile: ClaimFamilySearchProfile): string {
  const spec = profile.pubmed_query_spec;
  const intervention = pubmedFieldGroup(spec.intervention_title_abstract, "Title/Abstract");
  const outcome = pubmedFieldGroup(spec.outcome_title_abstract, "Title/Abstract");
  const meshInclusions = spec.mesh_inclusions.map((term) => `"${term}"[MeSH Terms]`);
  const publicationTypes = spec.publication_type_inclusions.map(
    (term) => `"${term}"[Publication Type]`
  );
  const inclusion = `(${[...meshInclusions, ...publicationTypes].join(" OR ")})`;

  let query = `(${intervention} AND ${outcome} AND ${inclusion}`;

  if (spec.exclude_animals_without_humans) {
    query += ` NOT ("animals"[MeSH Terms] NOT "humans"[MeSH Terms])`;
  }

  if (spec.title_abstract_exclusions.length > 0) {
    query += ` NOT ${pubmedUnquotedFieldGroup(spec.title_abstract_exclusions, "Title/Abstract")}`;
  }

  return `${query})`;
}

export function getClaimFamilySearchProfile(
  claimFamilyId: string | null | undefined
): ClaimFamilySearchProfile | null {
  if (!claimFamilyId) {
    return null;
  }

  return CLAIM_FAMILY_SEARCH_PROFILES[claimFamilyId] ?? null;
}

export function getClaimFamilySearchProfileByWatchTopic(
  watchTopicId: string | null | undefined
): ClaimFamilySearchProfile | null {
  if (!watchTopicId) {
    return null;
  }

  const claimFamilyId = WATCH_TOPIC_TO_CLAIM_FAMILY[watchTopicId];
  return claimFamilyId ? getClaimFamilySearchProfile(claimFamilyId) : null;
}

export function resolveClaimFamilySearchProfile(options: {
  claimFamily?: string | null;
  watchTopicId?: string | null;
}): ClaimFamilySearchProfile | null {
  return (
    getClaimFamilySearchProfile(options.claimFamily) ??
    getClaimFamilySearchProfileByWatchTopic(options.watchTopicId)
  );
}

export function listClaimFamilySearchProfiles(): ClaimFamilySearchProfile[] {
  return Object.values(CLAIM_FAMILY_SEARCH_PROFILES);
}

export function hasClaimFamilySearchProfile(
  claimFamilyId: string | null | undefined
): boolean {
  return Boolean(getClaimFamilySearchProfile(claimFamilyId));
}

export function getProfileQueryIntent(profile: ClaimFamilySearchProfile): string {
  return profile.query_intent;
}

/** Stable export used by watchlist seed data and structured query strategy. */
export const MAGNESIUM_CORTISOL_QUERY_VERSION =
  MAGNESIUM_CORTISOL_STRESS_PROFILE.query_version;

export const MAGNESIUM_CORTISOL_GENERATED_QUERY = buildPubMedQueryFromProfile(
  MAGNESIUM_CORTISOL_STRESS_PROFILE
);
