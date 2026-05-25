import type { ClaimType } from "./claim-classifier";

export type MonitoringPriority = "low" | "medium" | "high";
export type CheckFrequency = "weekly" | "monthly" | "quarterly" | "manual";
export type EvidenceChangeSensitivity = "low" | "moderate" | "high";
export type EvidenceChangeStatusValue =
  | "not_checked"
  | "no_material_change"
  | "possible_change"
  | "material_change";
export type RecommendedAction =
  | "none"
  | "monitor"
  | "human_review"
  | "notify_affected_clients";

export type WatchTopic = {
  topic_id: string;
  label: string;
  description: string;
  monitoring_priority: MonitoringPriority;
  recommended_check_frequency: CheckFrequency;
  evidence_change_sensitivity: EvidenceChangeSensitivity;
  current_policy: string;
  review_trigger_conditions: string[];
  client_private_data_required: false;
};

export type EvidenceChangeStatus = {
  status: EvidenceChangeStatusValue;
  last_checked: string | null;
  new_sources_since_last_check: string[];
  material_change_summary: string | null;
  recommended_action: RecommendedAction;
};

export type PrivacyBoundary = {
  mind_receives: string[];
  mind_does_not_receive: string[];
  app_maps_back_to_clients: true;
};

export type Watchlist = {
  claim_family: string;
  watch_topic: WatchTopic;
  evidence_change_status: EvidenceChangeStatus;
  privacy_boundary: PrivacyBoundary;
};

const PRIVACY_BOUNDARY: PrivacyBoundary = {
  mind_receives: [
    "abstracted claim family",
    "watch topic",
    "evidence status",
    "source metadata",
    "appraisal summary",
  ],
  mind_does_not_receive: [
    "client exact wording",
    "brand confidential copy",
    "private workspace notes",
    "commercial strategy",
  ],
  app_maps_back_to_clients: true,
};

const DEFAULT_EVIDENCE_CHANGE_STATUS: EvidenceChangeStatus = {
  status: "not_checked",
  last_checked: null,
  new_sources_since_last_check: [],
  material_change_summary: null,
  recommended_action: "none",
};

type WatchlistConfig = {
  claim_family: string;
  watch_topic: WatchTopic;
};

function queryMentionsMagnesium(query: string): boolean {
  return /\bmagnesium\b/i.test(query);
}

function queryMentionsCortisol(query: string): boolean {
  return /\bcortisol\b/i.test(query);
}

const MAGNESIUM_CORTISOL_CONFIG: WatchlistConfig = {
  claim_family: "magnesium_cortisol_stress",
  watch_topic: {
    topic_id: "watch-magnesium-cortisol",
    label: "Magnesium and cortisol/stress physiology",
    description:
      "Monitors emerging human evidence and regulatory guidance on magnesium supplementation and cortisol or stress-physiology outcomes.",
    monitoring_priority: "medium",
    recommended_check_frequency: "monthly",
    evidence_change_sensitivity: "moderate",
    current_policy:
      "Avoid direct cortisol-regulation claims; use relaxation/general wellbeing wording unless stronger direct human evidence emerges.",
    review_trigger_conditions: [
      "new human RCT involving magnesium and cortisol",
      "new systematic review or meta-analysis on magnesium and stress physiology",
      "new clinical guideline mentioning magnesium and cortisol/stress",
      "new regulatory warning about hormone-balancing or cortisol claims",
    ],
    client_private_data_required: false,
  },
};

const CORTISOL_HORMONE_CONFIG: WatchlistConfig = {
  claim_family: "cortisol_hormone_regulation",
  watch_topic: {
    topic_id: "watch-cortisol-hormone",
    label: "Cortisol and hormone regulation claims",
    description:
      "Monitors evidence and regulatory guidance on wellness claims implying cortisol or hormone regulation.",
    monitoring_priority: "medium",
    recommended_check_frequency: "monthly",
    evidence_change_sensitivity: "moderate",
    current_policy:
      "Avoid direct cortisol-regulation claims; use relaxation/general wellbeing wording unless stronger direct human evidence emerges.",
    review_trigger_conditions: [
      "new human RCT with cortisol or stress-hormone endpoints",
      "new systematic review on stress physiology interventions",
      "new clinical guideline mentioning cortisol or hormone balance",
      "new regulatory warning about hormone-balancing or cortisol claims",
    ],
    client_private_data_required: false,
  },
};

const WATCHLIST_BY_CLAIM_TYPE: Partial<Record<ClaimType, WatchlistConfig>> = {
  cortisol_hormone: CORTISOL_HORMONE_CONFIG,
  detox: {
    claim_family: "detoxification_claims",
    watch_topic: {
      topic_id: "watch-detox-claims",
      label: "Detoxification and toxin-removal claims",
      description:
        "Monitors clinical evidence and regulatory enforcement on detoxification and toxin-removal marketing claims.",
      monitoring_priority: "high",
      recommended_check_frequency: "monthly",
      evidence_change_sensitivity: "high",
      current_policy:
        "Avoid claims that a treatment detoxifies the body or removes toxins unless specific substantiation exists.",
      review_trigger_conditions: [
        "new human clinical evidence for a specific detox mechanism",
        "new regulatory guidance or enforcement action on detox claims",
        "new systematic review on detoxification interventions",
      ],
      client_private_data_required: false,
    },
  },
  inflammation: {
    claim_family: "inflammation_reduction",
    watch_topic: {
      topic_id: "watch-inflammation-claims",
      label: "Inflammation reduction claims",
      description:
        "Monitors clinical evidence and regulatory guidance on anti-inflammatory and inflammation-reduction marketing claims.",
      monitoring_priority: "high",
      recommended_check_frequency: "monthly",
      evidence_change_sensitivity: "high",
      current_policy:
        "Avoid claims that a treatment reduces inflammation unless condition-specific clinical substantiation exists.",
      review_trigger_conditions: [
        "new human RCT with inflammatory biomarker endpoints",
        "new systematic review on anti-inflammatory wellness interventions",
        "new regulatory guidance on inflammation or anti-inflammatory claims",
      ],
      client_private_data_required: false,
    },
  },
  sleep: {
    claim_family: "sleep_quality",
    watch_topic: {
      topic_id: "watch-sleep-quality",
      label: "Sleep quality and relaxation claims",
      description:
        "Monitors evidence on sleep-quality outcomes and regulatory boundaries for wellness sleep-support claims.",
      monitoring_priority: "medium",
      recommended_check_frequency: "monthly",
      evidence_change_sensitivity: "moderate",
      current_policy:
        "Frame sleep language around relaxation and bedtime routine; avoid claims to treat insomnia or sleep disorders without clinical substantiation.",
      review_trigger_conditions: [
        "new human RCT on sleep quality or duration outcomes",
        "new systematic review on sleep-support interventions",
        "new regulatory guidance distinguishing sleep support from disorder treatment",
      ],
      client_private_data_required: false,
    },
  },
  experiential_wellness: {
    claim_family: "experiential_wellness",
    watch_topic: {
      topic_id: "watch-experiential-wellness",
      label: "Subjective relaxation and wellbeing language",
      description:
        "Monitors regulatory guidance on experiential wellness wording and boundaries between subjective feeling claims and measurable health outcomes.",
      monitoring_priority: "low",
      recommended_check_frequency: "quarterly",
      evidence_change_sensitivity: "low",
      current_policy:
        "Experiential relaxation and wellbeing language is generally lower risk when it avoids measurable health outcomes or disease-related claims.",
      review_trigger_conditions: [
        "new regulatory guidance on experiential wellness marketing",
        "new enforcement action on subjective wellbeing claims crossing into health outcomes",
      ],
      client_private_data_required: false,
    },
  },
};

const FALLBACK_CONFIG: WatchlistConfig = {
  claim_family: "general_claim_review",
  watch_topic: {
    topic_id: "watch-general-claims",
    label: "General wellness claim review",
    description:
      "Monitors evidence and regulatory guidance for wellness claims not mapped to a specific watch topic.",
    monitoring_priority: "medium",
    recommended_check_frequency: "manual",
    evidence_change_sensitivity: "moderate",
    current_policy:
      "Review wording to ensure claims remain experiential and do not imply measurable health outcomes without substantiation.",
    review_trigger_conditions: [
      "new regulatory guidance relevant to the claim category",
      "new systematic review or clinical evidence for the intervention area",
    ],
    client_private_data_required: false,
  },
};

function resolveWatchlistConfig(
  claimType: ClaimType,
  query: string
): WatchlistConfig {
  if (claimType === "cortisol_hormone") {
    if (queryMentionsMagnesium(query) && queryMentionsCortisol(query)) {
      return MAGNESIUM_CORTISOL_CONFIG;
    }
    return CORTISOL_HORMONE_CONFIG;
  }

  return WATCHLIST_BY_CLAIM_TYPE[claimType] ?? FALLBACK_CONFIG;
}

export function buildWatchlist(claimType: ClaimType, query: string): Watchlist {
  const config = resolveWatchlistConfig(claimType, query);

  return {
    claim_family: config.claim_family,
    watch_topic: config.watch_topic,
    evidence_change_status: DEFAULT_EVIDENCE_CHANGE_STATUS,
    privacy_boundary: PRIVACY_BOUNDARY,
  };
}
