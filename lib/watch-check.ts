import type { EvidenceSource } from "./evidence-stubs";
import type {
  EvidenceChangeAlertType,
  EvidenceChangeLevel,
  EvidenceDeltaDirection,
} from "./evidence-monitoring";
import { isObviouslyIrrelevant, type SourceAppraisal } from "./pubmed-appraisal";
import {
  fetchPubMedSourcesForPmids,
  searchPubMedPmids,
  shouldUsePubMed,
  type PubMedFetchFilters,
} from "./pubmed-retrieval";
import { resolveMaxSources } from "./evidence-stubs";

export type WatchCheckBaseline = {
  last_checked_date: string;
  known_pmids: string[];
  baseline_evidence_grade: string;
  baseline_policy: string;
};

export type WatchCheckRequestBody = {
  workspace_id?: string;
  watch_topic_id?: string;
  claim_family?: string;
  query?: string;
  baseline?: WatchCheckBaseline;
  filters?: PubMedFetchFilters;
  context?: string;
};

export type PubMedCheckStatus = "success" | "error" | "skipped";

export type WatchCheckResponse = {
  watch_check_id: string;
  generated_at: string;
  workspace_id: string;
  watch_topic_id: string;
  claim_family: string;
  query_used: string;
  baseline: WatchCheckBaseline;
  pubmed_check: {
    status: PubMedCheckStatus;
    records_found: number;
    known_records_found: number;
    new_records_found: number;
    new_pmids: string[];
  };
  new_sources: EvidenceSource[];
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
  privacy_boundary: {
    mind_receives: string[];
    mind_does_not_receive: string[];
    app_maps_back_to_clients: true;
  };
  limitations: string[];
};

const WATCH_CHECK_LIMITATIONS = [
  "POC manual endpoint only",
  "No persistent watchlist database yet",
  "No scheduler yet",
  "PubMed query construction is still basic",
  "Automated appraisal is conservative and not final evidence grading",
];

const WATCH_CHECK_PRIVACY_BOUNDARY: WatchCheckResponse["privacy_boundary"] = {
  mind_receives: [
    "watch topic",
    "claim family",
    "baseline PMID list",
    "source metadata",
    "appraisal summary",
  ],
  mind_does_not_receive: [
    "client exact wording",
    "client IDs",
    "brand confidential copy",
    "private legal notes",
  ],
  app_maps_back_to_clients: true,
};

function normalizeKnownPmids(knownPmids: string[]): string[] {
  return [...new Set(knownPmids.map((pmid) => pmid.trim()).filter(Boolean))];
}

function isStrongStudyDesign(
  design: SourceAppraisal["study_design_detected"]
): boolean {
  return design === "systematic_review" || design === "randomized_controlled_trial";
}

function isMaterialNewSource(appraisal: SourceAppraisal): boolean {
  if (isObviouslyIrrelevant(appraisal)) {
    return false;
  }

  const humanRelevant =
    appraisal.species_relevance === "human" || appraisal.species_relevance === "mixed";
  const interventionRelevant =
    appraisal.intervention_match === "direct" || appraisal.intervention_match === "partial";
  const outcomeRelevant =
    appraisal.outcome_match === "direct" || appraisal.outcome_match === "partial";

  return (
    isStrongStudyDesign(appraisal.study_design_detected) &&
    humanRelevant &&
    interventionRelevant &&
    outcomeRelevant
  );
}

function hasMaterialNewSource(sources: EvidenceSource[]): boolean {
  return sources.some(
    (source) => source.appraisal && isMaterialNewSource(source.appraisal)
  );
}

function assessWatchCheckOutcome(
  claimFamily: string,
  baselinePolicy: string,
  newPmids: string[],
  newSources: EvidenceSource[]
): Pick<
  WatchCheckResponse,
  "evidence_delta" | "policy_impact" | "evidence_change_alert"
> {
  const basePolicyImpact = {
    policy_change_recommended: false,
    previous_policy: baselinePolicy,
    recommended_policy: baselinePolicy,
    policy_reason: "No policy change recommended based on this check.",
  };

  const baseAlert = {
    alert_required: false,
    alert_type: "none" as EvidenceChangeAlertType,
    affected_claim_family_id: claimFamily,
    affected_workspace_ids_visible_to_mind: false as const,
    app_should_map_to_private_workspaces: true as const,
    alert_summary: "No alert required; no new PubMed records detected since baseline.",
  };

  if (newPmids.length === 0) {
    return {
      evidence_delta: {
        change_level: "none",
        direction: "no_change",
        delta_summary:
          "No new PubMed records found since baseline; evidence profile unchanged.",
        delta_confidence: 0.9,
      },
      policy_impact: {
        ...basePolicyImpact,
        policy_reason: "Baseline PMID set covers all records returned by the current search.",
      },
      evidence_change_alert: baseAlert,
    };
  }

  if (hasMaterialNewSource(newSources)) {
    const materialSource = newSources.find(
      (source) => source.appraisal && isMaterialNewSource(source.appraisal)
    );
    const direction: EvidenceDeltaDirection =
      materialSource?.appraisal?.intervention_match === "direct" &&
      materialSource.appraisal.outcome_match === "direct"
        ? "strengthens_support"
        : "unclear";

    return {
      evidence_delta: {
        change_level: "possible_material",
        direction,
        delta_summary:
          "New human RCT or systematic review with relevant intervention/outcome signals detected; human review recommended.",
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
          "New potentially material PubMed evidence detected for this claim family. Affected client claims should be re-reviewed by humans; Mind does not receive private client wording.",
      },
    };
  }

  return {
    evidence_delta: {
      change_level: "minor",
      direction: "unclear",
      delta_summary:
        "New PubMed records found, but automated appraisal flags them as indirect, weak, or not directly relevant.",
      delta_confidence: 0.35,
    },
    policy_impact: {
      ...basePolicyImpact,
      policy_reason:
        "New sources appear weak or indirect; current cautious policy remains appropriate.",
    },
    evidence_change_alert: {
      alert_required: false,
      alert_type: "monitor",
      affected_claim_family_id: claimFamily,
      affected_workspace_ids_visible_to_mind: false,
      app_should_map_to_private_workspaces: true,
      alert_summary:
        "Continue routine monitoring; new records do not yet warrant human re-review.",
    },
  };
}

export async function buildWatchCheckResponse(
  workspaceId: string,
  watchTopicId: string,
  claimFamily: string,
  query: string,
  baseline: WatchCheckBaseline,
  filters?: PubMedFetchFilters
): Promise<WatchCheckResponse> {
  const now = new Date().toISOString();
  const watchCheckId = `${workspaceId}-watch-${Date.now()}`;
  const knownPmids = normalizeKnownPmids(baseline.known_pmids);
  const knownPmidSet = new Set(knownPmids);

  let pubmedStatus: PubMedCheckStatus = "skipped";
  let recordsFound = 0;
  let knownRecordsFound = 0;
  let newPmids: string[] = [];
  let newSources: EvidenceSource[] = [];

  if (shouldUsePubMed(filters)) {
    try {
      const limit = resolveMaxSources(filters?.max_sources);
      const foundPmids = await searchPubMedPmids(
        query,
        limit,
        filters?.recency_years
      );
      recordsFound = foundPmids.length;
      knownRecordsFound = foundPmids.filter((pmid) => knownPmidSet.has(pmid)).length;
      newPmids = foundPmids.filter((pmid) => !knownPmidSet.has(pmid));
      pubmedStatus = "success";

      if (newPmids.length > 0) {
        newSources = await fetchPubMedSourcesForPmids(query, newPmids);
      }
    } catch {
      pubmedStatus = "error";
    }
  }

  const assessment =
    pubmedStatus === "error"
      ? {
          evidence_delta: {
            change_level: "none" as EvidenceChangeLevel,
            direction: "unclear" as EvidenceDeltaDirection,
            delta_summary:
              "PubMed check failed; unable to compare against baseline PMID list.",
            delta_confidence: 0.2,
          },
          policy_impact: {
            policy_change_recommended: false,
            previous_policy: baseline.baseline_policy,
            recommended_policy: baseline.baseline_policy,
            policy_reason: "PubMed retrieval error; policy unchanged pending retry.",
          },
          evidence_change_alert: {
            alert_required: false,
            alert_type: "none" as EvidenceChangeAlertType,
            affected_claim_family_id: claimFamily,
            affected_workspace_ids_visible_to_mind: false as const,
            app_should_map_to_private_workspaces: true as const,
            alert_summary:
              "Watch check could not complete PubMed retrieval; retry manually.",
          },
        }
      : pubmedStatus === "skipped"
        ? {
            evidence_delta: {
              change_level: "none" as EvidenceChangeLevel,
              direction: "no_change" as EvidenceDeltaDirection,
              delta_summary:
                "PubMed check skipped; set filters.use_real_pubmed=true and filters.source_types=[\"pubmed\"] to run a live check.",
              delta_confidence: 0.5,
            },
            policy_impact: {
              policy_change_recommended: false,
              previous_policy: baseline.baseline_policy,
              recommended_policy: baseline.baseline_policy,
              policy_reason: "Live PubMed check was not requested.",
            },
            evidence_change_alert: {
              alert_required: false,
              alert_type: "none" as EvidenceChangeAlertType,
              affected_claim_family_id: claimFamily,
              affected_workspace_ids_visible_to_mind: false as const,
              app_should_map_to_private_workspaces: true as const,
              alert_summary: "No live PubMed check performed.",
            },
          }
        : assessWatchCheckOutcome(
            claimFamily,
            baseline.baseline_policy,
            newPmids,
            newSources
          );

  return {
    watch_check_id: watchCheckId,
    generated_at: now,
    workspace_id: workspaceId,
    watch_topic_id: watchTopicId,
    claim_family: claimFamily,
    query_used: query,
    baseline: {
      ...baseline,
      known_pmids: knownPmids,
    },
    pubmed_check: {
      status: pubmedStatus,
      records_found: recordsFound,
      known_records_found: knownRecordsFound,
      new_records_found: newPmids.length,
      new_pmids: newPmids,
    },
    new_sources: newSources,
    ...assessment,
    privacy_boundary: WATCH_CHECK_PRIVACY_BOUNDARY,
    limitations: WATCH_CHECK_LIMITATIONS,
  };
}
