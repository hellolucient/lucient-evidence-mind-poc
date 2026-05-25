import type { EvidenceSource } from "./evidence-stubs";
import type {
  EvidenceChangeAlertType,
  EvidenceChangeLevel,
  EvidenceDeltaDirection,
} from "./evidence-monitoring";
import { isContextuallyMaterialSource } from "./contextual-appraisal";
import {
  buildDeltaAttribution,
  emptyDeltaAttribution,
  type ContributingSourceToDelta,
  type DeltaAttribution,
  type NonContributingSource,
} from "./delta-attribution";
import type { QueryStrategy } from "./structured-query";
import {
  fetchPubMedSourcesForPmids,
  searchPubMedWithStrategy,
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
  query_strategy: QueryStrategy;
  baseline: WatchCheckBaseline;
  pubmed_check: {
    status: PubMedCheckStatus;
    records_found: number;
    known_records_found: number;
    new_records_found: number;
    new_pmids: string[];
    found_pmids: string[];
  };
  new_sources: EvidenceSource[];
  evidence_delta: {
    change_level: EvidenceChangeLevel;
    direction: EvidenceDeltaDirection;
    delta_summary: string;
    delta_confidence: number;
    contributing_sources_to_delta: ContributingSourceToDelta[];
    non_contributing_sources: NonContributingSource[];
    alert_reason_codes: string[];
    alert_threshold_explanation: string;
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
  "Phase 9.5 structured queries and context gates reduce but do not eliminate retrieval noise",
  "Phase 9.6 delta attribution is computed per request and not persisted",
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

function hasMaterialNewSource(sources: EvidenceSource[]): boolean {
  return sources.some(
    (source) => source.appraisal && isContextuallyMaterialSource(source.appraisal)
  );
}

function withDeltaAttribution(
  evidenceDelta: Omit<
    WatchCheckResponse["evidence_delta"],
    keyof DeltaAttribution
  >,
  alertType: EvidenceChangeAlertType,
  newSources: EvidenceSource[],
  newPmidCount: number
): WatchCheckResponse["evidence_delta"] {
  return {
    ...evidenceDelta,
    ...buildDeltaAttribution(
      newSources,
      evidenceDelta.change_level,
      alertType,
      newPmidCount
    ),
  };
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
    const alertType = "none" as EvidenceChangeAlertType;
    return {
      evidence_delta: withDeltaAttribution(
        {
          change_level: "none",
          direction: "no_change",
          delta_summary:
            "No new PubMed records found since baseline; evidence profile unchanged.",
          delta_confidence: 0.9,
        },
        alertType,
        newSources,
        0
      ),
      policy_impact: {
        ...basePolicyImpact,
        policy_reason: "Baseline PMID set covers all records returned by the current search.",
      },
      evidence_change_alert: baseAlert,
    };
  }

  if (hasMaterialNewSource(newSources)) {
    const materialSource = newSources.find(
      (source) => source.appraisal && isContextuallyMaterialSource(source.appraisal)
    );
    const direction: EvidenceDeltaDirection =
      materialSource?.appraisal?.contextual_relevance === "direct"
        ? "strengthens_support"
        : "unclear";
    const alertType = "human_review" as EvidenceChangeAlertType;

    return {
      evidence_delta: withDeltaAttribution(
        {
          change_level: "possible_material",
          direction,
          delta_summary:
            "New human RCT or systematic review with context-gate pass and relevant intervention/outcome roles detected; human review recommended.",
          delta_confidence: 0.65,
        },
        alertType,
        newSources,
        newPmids.length
      ),
      policy_impact: {
        policy_change_recommended: false,
        previous_policy: baselinePolicy,
        recommended_policy: baselinePolicy,
        policy_reason:
          "Policy change is not auto-recommended; human review should assess whether new evidence substantiates stronger wording.",
      },
      evidence_change_alert: {
        alert_required: true,
        alert_type: alertType,
        affected_claim_family_id: claimFamily,
        affected_workspace_ids_visible_to_mind: false,
        app_should_map_to_private_workspaces: true,
        alert_summary:
          "New potentially material PubMed evidence detected for this claim family. Affected client claims should be re-reviewed by humans; Mind does not receive private client wording.",
      },
    };
  }

  const hasOnlyGatedNoise = newSources.every(
    (source) =>
      source.appraisal?.context_gate === "fail" ||
      source.appraisal?.exclusion_flags.includes("context_gate_fail")
  );
  const alertType: EvidenceChangeAlertType = hasOnlyGatedNoise ? "none" : "monitor";

  return {
    evidence_delta: withDeltaAttribution(
      {
        change_level: hasOnlyGatedNoise ? "none" : "minor",
        direction: "unclear",
        delta_summary: hasOnlyGatedNoise
          ? "New PubMed records were found but failed contextual integrity gates (animal/veterinary/pathological noise)."
          : "New PubMed records found, but contextual appraisal flags them as indirect, weak, or not directly relevant.",
        delta_confidence: hasOnlyGatedNoise ? 0.85 : 0.35,
      },
      alertType,
      newSources,
      newPmids.length
    ),
    policy_impact: {
      ...basePolicyImpact,
      policy_reason: hasOnlyGatedNoise
        ? "Context-gated noise does not change the current cautious policy."
        : "New sources appear weak or indirect; current cautious policy remains appropriate.",
    },
    evidence_change_alert: {
      alert_required: false,
      alert_type: alertType,
      affected_claim_family_id: claimFamily,
      affected_workspace_ids_visible_to_mind: false,
      app_should_map_to_private_workspaces: true,
      alert_summary: hasOnlyGatedNoise
        ? "No alert required; new records failed context gates and are treated as retrieval noise."
        : "Continue routine monitoring; new records do not yet warrant human re-review.",
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
  let foundPmids: string[] = [];
  let newSources: EvidenceSource[] = [];
  let queryStrategy: QueryStrategy = {
    mode: "raw",
    raw_query: query,
    structured_query: null,
    watch_topic_id: watchTopicId,
    query_intent: "Keyword search using the provided query text.",
    exclusion_terms_applied: [],
  };
  let queryUsed = query;

  if (shouldUsePubMed(filters)) {
    try {
      const limit = resolveMaxSources(filters?.max_sources);
      const searchResult = await searchPubMedWithStrategy(
        query,
        limit,
        filters?.recency_years,
        {
          watch_topic_id: watchTopicId,
          claim_family: claimFamily,
          use_structured_query: filters?.use_structured_query,
          default_structured_query_when_unset: true,
        }
      );

      queryStrategy = searchResult.query_strategy;
      queryUsed =
        queryStrategy.mode === "structured" &&
        queryStrategy.structured_query &&
        !queryStrategy.fallback_used
          ? queryStrategy.structured_query
          : query;

      const searchPmids = searchResult.pmids;
      foundPmids = searchPmids;
      recordsFound = searchPmids.length;
      knownRecordsFound = searchPmids.filter((pmid) => knownPmidSet.has(pmid)).length;
      newPmids = searchPmids.filter((pmid) => !knownPmidSet.has(pmid));
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
            ...emptyDeltaAttribution(
              "none",
              "PubMed retrieval failed; no source attribution available.",
              ["PUBMED_CHECK_ERROR"]
            ),
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
                'PubMed check skipped; set filters.use_real_pubmed=true and filters.source_types=["pubmed"] to run a live check.',
              delta_confidence: 0.5,
              ...emptyDeltaAttribution(
                "none",
                "Live PubMed check was not performed; no source attribution available.",
                ["PUBMED_CHECK_SKIPPED"]
              ),
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
    query_used: queryUsed,
    query_strategy: queryStrategy,
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
      found_pmids: foundPmids,
    },
    new_sources: newSources,
    ...assessment,
    privacy_boundary: WATCH_CHECK_PRIVACY_BOUNDARY,
    limitations: WATCH_CHECK_LIMITATIONS,
  };
}
