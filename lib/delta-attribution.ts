import type { EvidenceSource } from "./evidence-stubs";
import type { EvidenceChangeAlertType, EvidenceChangeLevel } from "./evidence-monitoring";
import {
  isContextuallyMaterialSource,
  type ContextGate,
} from "./contextual-appraisal";

export type ContributionLevel = "none" | "minor" | "possible_material" | "material";

export type ContributingSourceToDelta = {
  source_id: string;
  pmid: string;
  title: string;
  contribution_level: ContributionLevel;
  reason: string;
  context_gate: ContextGate;
  study_design_detected: string;
  exposure_role: string;
  outcome_role: string;
  relevance_score: number;
};

export type NonContributingSource = {
  source_id: string;
  pmid: string;
  title: string;
  reason: string;
  context_gate: ContextGate;
  exclusion_flags: string[];
};

export type DeltaAttribution = {
  contributing_sources_to_delta: ContributingSourceToDelta[];
  non_contributing_sources: NonContributingSource[];
  alert_reason_codes: string[];
  alert_threshold_explanation: string;
};

function sourcePmid(source: EvidenceSource): string {
  return source.meta.pmid ?? source.source_id.replace(/^pubmed-/, "");
}

function isWeakExposure(exposureRole: string | undefined): boolean {
  return (
    exposureRole === "background_mention" ||
    exposureRole === "biomarker" ||
    exposureRole === "unrelated" ||
    exposureRole === "unclear"
  );
}

function isWeakOutcome(outcomeRole: string | undefined): boolean {
  return (
    outcomeRole === "background_mention" ||
    outcomeRole === "biomarker_mention" ||
    outcomeRole === "unclear"
  );
}

function buildContributingEntry(
  source: EvidenceSource,
  contributionLevel: ContributionLevel,
  reason: string
): ContributingSourceToDelta {
  const appraisal = source.appraisal!;
  return {
    source_id: source.source_id,
    pmid: sourcePmid(source),
    title: source.title,
    contribution_level: contributionLevel,
    reason,
    context_gate: appraisal.context_gate ?? "caution",
    study_design_detected: appraisal.study_design_detected,
    exposure_role: appraisal.exposure_role ?? "unclear",
    outcome_role: appraisal.outcome_role ?? "unclear",
    relevance_score: source.analysis.relevance_score,
  };
}

function buildNonContributingEntry(
  source: EvidenceSource,
  reason: string
): NonContributingSource {
  const appraisal = source.appraisal!;
  return {
    source_id: source.source_id,
    pmid: sourcePmid(source),
    title: source.title,
    reason,
    context_gate: appraisal.context_gate ?? "fail",
    exclusion_flags: appraisal.exclusion_flags,
  };
}

function classifySource(
  source: EvidenceSource
): ContributingSourceToDelta | NonContributingSource | null {
  if (!source.appraisal) {
    return buildNonContributingEntry(
      source,
      "Missing appraisal metadata; cannot attribute contribution."
    );
  }

  const appraisal = source.appraisal;

  if (
    appraisal.context_gate === "fail" ||
    appraisal.exclusion_flags.includes("context_gate_fail")
  ) {
    return buildNonContributingEntry(
      source,
      "Failed context gate (animal/veterinary/pathological or irrelevant context)."
    );
  }

  if (isContextuallyMaterialSource(appraisal)) {
    return buildContributingEntry(
      source,
      "possible_material",
      "Human RCT or systematic review with context_gate pass, tested_intervention, and primary/secondary outcome role."
    );
  }

  if (appraisal.context_gate === "caution") {
    if (isWeakExposure(appraisal.exposure_role) || isWeakOutcome(appraisal.outcome_role)) {
      return buildNonContributingEntry(
        source,
        "Context gate caution with background or weak exposure/outcome; does not meet human_review threshold."
      );
    }

    return buildContributingEntry(
      source,
      "minor",
      "Context gate caution with partial relevance; contributes to minor/monitor signal only."
    );
  }

  return buildNonContributingEntry(
    source,
    "Context gate pass but study design or intervention/outcome roles insufficient for material contribution."
  );
}

function buildHumanReviewExplanation(
  contributors: ContributingSourceToDelta[]
): string {
  const material = contributors.filter(
    (source) => source.contribution_level === "possible_material"
  );

  if (material.length === 0) {
    return "human_review alert set but no possible_material contributor identified.";
  }

  const primary = material[0];
  const others =
    material.length > 1
      ? ` Additional contributors: ${material
          .slice(1)
          .map((source) => `PMID ${source.pmid}`)
          .join(", ")}.`
      : "";

  return `PMID ${primary.pmid} (${primary.study_design_detected}, context_gate ${primary.context_gate}, ${primary.exposure_role}, ${primary.outcome_role}) crossed the possible_material human_review threshold.${others}`;
}

function buildMonitorOrNoneExplanation(
  alertType: EvidenceChangeAlertType,
  changeLevel: EvidenceChangeLevel,
  contributing: ContributingSourceToDelta[],
  nonContributing: NonContributingSource[]
): string {
  if (changeLevel === "none" && nonContributing.length === 0 && contributing.length === 0) {
    return "No new PubMed records since baseline; no source could contribute to a delta.";
  }

  if (nonContributing.length > 0 && contributing.length === 0) {
    const gates = [...new Set(nonContributing.map((source) => source.context_gate))].join(
      "/"
    );
    return `No source crossed the human_review threshold. ${nonContributing.length} new record(s) were classified as non-contributing (context_gate ${gates} or weak background exposure/outcome).`;
  }

  const minorOnly = contributing.every(
    (source) => source.contribution_level === "minor"
  );
  if (minorOnly) {
    return `No source crossed the human_review threshold. ${contributing.length} source(s) contributed at minor level only (context_gate caution without strong RCT/systematic-review signal). Alert type: ${alertType}.`;
  }

  return `No source crossed the human_review threshold for this check. Alert type: ${alertType}.`;
}

function buildAlertReasonCodes(
  changeLevel: EvidenceChangeLevel,
  alertType: EvidenceChangeAlertType,
  contributing: ContributingSourceToDelta[],
  nonContributing: NonContributingSource[],
  newPmidCount: number
): string[] {
  const codes: string[] = [];

  if (newPmidCount === 0) {
    return ["NO_NEW_PMIDS"];
  }

  codes.push("NEW_PMIDS_FOUND");

  const material = contributing.filter(
    (source) => source.contribution_level === "possible_material"
  );
  if (material.length > 0) {
    codes.push("POSSIBLE_MATERIAL_EVIDENCE");
    codes.push("CONTEXT_GATE_PASS_HUMAN_RCT");
    if (
      material.some(
        (source) =>
          source.exposure_role === "tested_intervention" &&
          source.outcome_role === "primary_outcome"
      )
    ) {
      codes.push("TESTED_INTERVENTION_PRIMARY_OUTCOME");
    }
  }

  if (contributing.some((source) => source.contribution_level === "minor")) {
    codes.push("MINOR_CONTRIBUTION_ONLY");
  }

  if (
    nonContributing.length > 0 &&
    nonContributing.every((source) => source.context_gate === "fail")
  ) {
    codes.push("ALL_SOURCES_CONTEXT_GATE_FAIL");
  } else if (nonContributing.length > 0) {
    codes.push("NON_CONTRIBUTING_SOURCES_PRESENT");
  }

  if (alertType === "human_review") {
    codes.push("HUMAN_REVIEW_THRESHOLD_MET");
  } else if (alertType === "monitor") {
    codes.push("MONITOR_ONLY");
    codes.push("NO_HUMAN_REVIEW_THRESHOLD_MET");
  } else {
    codes.push("NO_HUMAN_REVIEW_THRESHOLD_MET");
  }

  if (changeLevel === "none" && newPmidCount > 0) {
    codes.push("DELTA_NONE_AFTER_GATING");
  }

  return [...new Set(codes)];
}

export function buildDeltaAttribution(
  newSources: EvidenceSource[],
  changeLevel: EvidenceChangeLevel,
  alertType: EvidenceChangeAlertType,
  newPmidCount: number
): DeltaAttribution {
  const contributing_sources_to_delta: ContributingSourceToDelta[] = [];
  const non_contributing_sources: NonContributingSource[] = [];

  for (const source of newSources) {
    const classified = classifySource(source);
    if (!classified) {
      continue;
    }

    if ("contribution_level" in classified) {
      contributing_sources_to_delta.push(classified);
    } else {
      non_contributing_sources.push(classified);
    }
  }

  contributing_sources_to_delta.sort((a, b) => {
    const levelRank: Record<ContributionLevel, number> = {
      material: 4,
      possible_material: 3,
      minor: 2,
      none: 1,
    };
    const levelDiff =
      levelRank[b.contribution_level] - levelRank[a.contribution_level];
    if (levelDiff !== 0) {
      return levelDiff;
    }
    return b.relevance_score - a.relevance_score;
  });

  const alert_reason_codes = buildAlertReasonCodes(
    changeLevel,
    alertType,
    contributing_sources_to_delta,
    non_contributing_sources,
    newPmidCount
  );

  const alert_threshold_explanation =
    alertType === "human_review"
      ? buildHumanReviewExplanation(contributing_sources_to_delta)
      : buildMonitorOrNoneExplanation(
          alertType,
          changeLevel,
          contributing_sources_to_delta,
          non_contributing_sources
        );

  return {
    contributing_sources_to_delta,
    non_contributing_sources,
    alert_reason_codes,
    alert_threshold_explanation,
  };
}

export function emptyDeltaAttribution(
  alertType: EvidenceChangeAlertType,
  explanation: string,
  reasonCodes: string[]
): DeltaAttribution {
  return {
    contributing_sources_to_delta: [],
    non_contributing_sources: [],
    alert_reason_codes: reasonCodes,
    alert_threshold_explanation: explanation,
  };
}
