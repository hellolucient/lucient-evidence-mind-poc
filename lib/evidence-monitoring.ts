import type { Watchlist } from "./evidence-watchlist";

export type SimulatedChangeType =
  | "none"
  | "weak_new_source"
  | "potentially_material_new_source"
  | "regulatory_warning";

export type EvidenceMonitoringFilters = {
  simulate_evidence_change?: boolean;
  simulated_change_type?: SimulatedChangeType;
};

export type BaselineEvidenceGrade = "low" | "moderate" | "high";

export type EvidenceSignalType =
  | "none"
  | "new_study"
  | "systematic_review"
  | "regulatory_warning"
  | "guideline_update";

export type EvidenceChangeLevel = "none" | "minor" | "possible_material" | "material";

export type EvidenceDeltaDirection =
  | "no_change"
  | "strengthens_support"
  | "weakens_support"
  | "increases_risk"
  | "unclear";

export type EvidenceChangeAlertType =
  | "none"
  | "monitor"
  | "human_review"
  | "notify_affected_clients";

export type EvidenceMonitoring = {
  claim_family: string;
  watch_topic_id: string;
  baseline_evidence_snapshot: {
    baseline_date: string;
    baseline_evidence_grade: BaselineEvidenceGrade;
    baseline_policy: string;
    baseline_summary: string;
    baseline_source_count: number;
  };
  current_evidence_summary: string;
  new_evidence_signal: {
    detected: boolean;
    signal_type: EvidenceSignalType;
    signal_summary: string | null;
    simulated: true;
  };
  evidence_delta: {
    change_level: EvidenceChangeLevel;
    direction: EvidenceDeltaDirection;
    delta_summary: string;
    delta_confidence: number;
  };
  policy_impact: {
    policy_change_recommended: boolean;
    previous_policy: string;
    recommended_policy: string;
    policy_reason: string;
  };
  evidence_change_alert: {
    alert_required: boolean;
    alert_type: EvidenceChangeAlertType;
    affected_claim_family_id: string;
    affected_workspace_ids_visible_to_mind: false;
    app_should_map_to_private_workspaces: true;
    alert_summary: string;
  };
  monitoring_dates: {
    last_checked_utc: string;
    last_policy_update_utc: string | null;
    last_material_update_date: string | null;
    next_recommended_check_utc: string | null;
  };
};

const BASELINE_DATE = "2026-05-25";

const MAGNESIUM_CORTISOL_BASELINE_SUMMARY =
  "Current evidence is largely indirect, with no substantiation for direct cortisol-regulation claims in healthy wellness consumers.";

const MAGNESIUM_CORTISOL_REGULATORY_POLICY =
  "Suspend direct cortisol-regulation and hormone-balancing claims; use relaxation and general wellbeing wording only until legal review.";

const VALID_SIMULATED_CHANGE_TYPES: SimulatedChangeType[] = [
  "none",
  "weak_new_source",
  "potentially_material_new_source",
  "regulatory_warning",
];

export function isValidSimulatedChangeType(
  value: unknown
): value is SimulatedChangeType {
  return (
    typeof value === "string" &&
    VALID_SIMULATED_CHANGE_TYPES.includes(value as SimulatedChangeType)
  );
}

export function shouldSimulateEvidenceChange(
  filters?: EvidenceMonitoringFilters
): boolean {
  return filters?.simulate_evidence_change === true;
}

export function resolveSimulatedChangeType(
  filters?: EvidenceMonitoringFilters
): SimulatedChangeType {
  if (filters?.simulated_change_type && isValidSimulatedChangeType(filters.simulated_change_type)) {
    return filters.simulated_change_type;
  }
  return "none";
}

function resolveBaselineSummary(claimFamily: string, currentPolicy: string): string {
  if (claimFamily === "magnesium_cortisol_stress") {
    return MAGNESIUM_CORTISOL_BASELINE_SUMMARY;
  }

  return `Baseline review supports cautious wording under current policy: ${currentPolicy}`;
}

function resolveBaselineGrade(claimFamily: string): BaselineEvidenceGrade {
  if (claimFamily === "magnesium_cortisol_stress") {
    return "low";
  }

  return "low";
}

function addDaysUtc(isoDate: string, days: number): string {
  const date = new Date(isoDate);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

function resolveNextCheckUtc(
  lastCheckedUtc: string,
  frequency: Watchlist["watch_topic"]["recommended_check_frequency"]
): string | null {
  switch (frequency) {
    case "weekly":
      return addDaysUtc(lastCheckedUtc, 7);
    case "monthly":
      return addDaysUtc(lastCheckedUtc, 30);
    case "quarterly":
      return addDaysUtc(lastCheckedUtc, 90);
    case "manual":
      return null;
  }
}

type SimulationScenario = Pick<
  EvidenceMonitoring,
  | "current_evidence_summary"
  | "new_evidence_signal"
  | "evidence_delta"
  | "policy_impact"
  | "evidence_change_alert"
  | "monitoring_dates"
>;

function buildScenario(
  changeType: SimulatedChangeType,
  watchlist: Watchlist,
  baselinePolicy: string,
  baselineSummary: string,
  sourceCount: number,
  lastCheckedUtc: string
): SimulationScenario {
  const claimFamily = watchlist.claim_family;
  const watchTopic = watchlist.watch_topic;
  const nextRecommendedCheck = resolveNextCheckUtc(
    lastCheckedUtc,
    watchTopic.recommended_check_frequency
  );

  const basePolicyImpact = {
    policy_change_recommended: false,
    previous_policy: baselinePolicy,
    recommended_policy: baselinePolicy,
    policy_reason: "No simulated evidence change affecting current policy.",
  };

  const baseAlert = {
    alert_required: false,
    alert_type: "none" as EvidenceChangeAlertType,
    affected_claim_family_id: claimFamily,
    affected_workspace_ids_visible_to_mind: false as const,
    app_should_map_to_private_workspaces: true as const,
    alert_summary: "No alert required; evidence profile unchanged from baseline.",
  };

  const baseMonitoringDates = {
    last_checked_utc: lastCheckedUtc,
    last_policy_update_utc: null as string | null,
    last_material_update_date: null as string | null,
    next_recommended_check_utc: nextRecommendedCheck,
  };

  switch (changeType) {
    case "none":
      return {
        current_evidence_summary: baselineSummary,
        new_evidence_signal: {
          detected: false,
          signal_type: "none",
          signal_summary: null,
          simulated: true,
        },
        evidence_delta: {
          change_level: "none",
          direction: "no_change",
          delta_summary: "No new evidence signals detected since baseline.",
          delta_confidence: 0.2,
        },
        policy_impact: basePolicyImpact,
        evidence_change_alert: baseAlert,
        monitoring_dates: baseMonitoringDates,
      };

    case "weak_new_source":
      return {
        current_evidence_summary:
          "One new low-relevance observational source mentions stress physiology in a background context; it does not test magnesium or cortisol endpoints directly.",
        new_evidence_signal: {
          detected: true,
          signal_type: "new_study",
          signal_summary:
            "Simulated new indirect study with background stress mentions and no direct intervention-outcome match.",
          simulated: true,
        },
        evidence_delta: {
          change_level: "minor",
          direction: "unclear",
          delta_summary:
            "Minor bibliographic activity detected; unlikely to change substantiation for direct claims.",
          delta_confidence: 0.35,
        },
        policy_impact: {
          ...basePolicyImpact,
          policy_reason:
            "New source is indirect and low quality; current cautious policy remains appropriate.",
        },
        evidence_change_alert: {
          ...baseAlert,
          alert_required: false,
          alert_type: "monitor",
          alert_summary:
            "Continue routine monitoring for this claim family; no human re-review required yet.",
        },
        monitoring_dates: baseMonitoringDates,
      };

    case "potentially_material_new_source":
      return {
        current_evidence_summary:
          "A newly indexed human RCT or systematic review may relate to magnesium and stress physiology; automated appraisal flags possible relevance pending human review.",
        new_evidence_signal: {
          detected: true,
          signal_type: "systematic_review",
          signal_summary:
            "Simulated new systematic review on magnesium supplementation and stress-related outcomes in adults.",
          simulated: true,
        },
        evidence_delta: {
          change_level: "possible_material",
          direction: claimFamily === "magnesium_cortisol_stress" ? "unclear" : "strengthens_support",
          delta_summary:
            "Possible material update: new human evidence may affect how strongly direct cortisol-regulation claims can be worded.",
          delta_confidence: 0.65,
        },
        policy_impact: {
          policy_change_recommended: false,
          previous_policy: baselinePolicy,
          recommended_policy: baselinePolicy,
          policy_reason:
            "Policy change is not auto-recommended; human review should assess whether new evidence substantiates stronger wording.",
        },
        evidence_change_alert: {
          alert_required: true,
          alert_type: "human_review",
          affected_claim_family_id: claimFamily,
          affected_workspace_ids_visible_to_mind: false,
          app_should_map_to_private_workspaces: true,
          alert_summary:
            "Affected client claims mapped to this claim family should be re-reviewed by humans. The Mind does not receive private client wording.",
        },
        monitoring_dates: {
          ...baseMonitoringDates,
          last_material_update_date: null,
        },
      };

    case "regulatory_warning":
      return {
        current_evidence_summary:
          "Simulated regulatory enforcement activity increases scrutiny on hormone-balancing and cortisol-regulation marketing claims.",
        new_evidence_signal: {
          detected: true,
          signal_type: "regulatory_warning",
          signal_summary:
            "Simulated FTC/FDA-style warning on cortisol-balancing or hormone-regulation claims in wellness marketing.",
          simulated: true,
        },
        evidence_delta: {
          change_level: "material",
          direction: "increases_risk",
          delta_summary:
            "Material regulatory risk increase: enforcement signal suggests tightening claim boundaries for this claim family.",
          delta_confidence: 0.8,
        },
        policy_impact: {
          policy_change_recommended: true,
          previous_policy: baselinePolicy,
          recommended_policy:
            claimFamily === "magnesium_cortisol_stress" ||
            claimFamily === "cortisol_hormone_regulation"
              ? MAGNESIUM_CORTISOL_REGULATORY_POLICY
              : `Adopt more conservative wording and pause high-scrutiny claims until legal review: ${baselinePolicy}`,
          policy_reason:
            "Simulated regulatory warning recommends immediate policy tightening for hormone-balancing and cortisol-regulation claims.",
        },
        evidence_change_alert: {
          alert_required: true,
          alert_type: "notify_affected_clients",
          affected_claim_family_id: claimFamily,
          affected_workspace_ids_visible_to_mind: false,
          app_should_map_to_private_workspaces: true,
          alert_summary:
            "Notify affected clients via the Lucient app. Map claim family to private workspaces locally; Mind routes the alert without seeing client copy.",
        },
        monitoring_dates: {
          ...baseMonitoringDates,
          last_policy_update_utc: lastCheckedUtc,
          last_material_update_date: lastCheckedUtc,
        },
      };
  }
}

export function buildEvidenceMonitoring(
  watchlist: Watchlist,
  changeType: SimulatedChangeType,
  sourceCount: number,
  lastCheckedUtc: string
): EvidenceMonitoring {
  const baselinePolicy = watchlist.watch_topic.current_policy;
  const baselineSummary = resolveBaselineSummary(watchlist.claim_family, baselinePolicy);
  const scenario = buildScenario(
    changeType,
    watchlist,
    baselinePolicy,
    baselineSummary,
    sourceCount,
    lastCheckedUtc
  );

  return {
    claim_family: watchlist.claim_family,
    watch_topic_id: watchlist.watch_topic.topic_id,
    baseline_evidence_snapshot: {
      baseline_date: BASELINE_DATE,
      baseline_evidence_grade: resolveBaselineGrade(watchlist.claim_family),
      baseline_policy: baselinePolicy,
      baseline_summary: baselineSummary,
      baseline_source_count: sourceCount,
    },
    current_evidence_summary: scenario.current_evidence_summary,
    new_evidence_signal: scenario.new_evidence_signal,
    evidence_delta: scenario.evidence_delta,
    policy_impact: scenario.policy_impact,
    evidence_change_alert: scenario.evidence_change_alert,
    monitoring_dates: scenario.monitoring_dates,
  };
}
