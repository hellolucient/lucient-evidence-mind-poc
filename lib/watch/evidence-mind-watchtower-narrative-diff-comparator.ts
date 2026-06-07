import type { WatchtowerNarrativeConfidenceLevel } from "@/lib/review/evidence-mind-watchtower-narrative-constants";
import type { WatchtowerNarrativeRiskPosture } from "@/lib/review/evidence-mind-watchtower-narrative-constants";
import {
  DEFAULT_WATCHTOWER_NARRATIVE_COMPARISON_SCOPE,
  DEFAULT_WATCHTOWER_NARRATIVE_DIFF_METHOD,
  DEFAULT_WATCHTOWER_NARRATIVE_DIFF_VERSION,
  type WatchtowerNarrativeDiffSignal,
  type WatchtowerNarrativeInterpretationChangeLevel,
  type WatchtowerNarrativeOperatorFocusChange,
  type WatchtowerNarrativeRecommendedActionChange,
  type WatchtowerNarrativeRiskPostureChange,
  type WatchtowerNarrativeUrgencyChange,
} from "@/lib/watch/evidence-mind-watchtower-narrative-diff-constants";
import type { PrivacySafeWatchtowerNarrative } from "@/lib/watch/evidence-mind-watchtower-narrative-store";

export type WatchtowerNarrativeDiffComparisonInput = {
  currentNarrative: PrivacySafeWatchtowerNarrative;
  previousNarrative: PrivacySafeWatchtowerNarrative | null;
  comparedAt?: string;
};

export type WatchtowerNarrativeDiffComparisonResult = {
  comparison_scope: typeof DEFAULT_WATCHTOWER_NARRATIVE_COMPARISON_SCOPE;
  diff_version: typeof DEFAULT_WATCHTOWER_NARRATIVE_DIFF_VERSION;
  interpretation_change_level: WatchtowerNarrativeInterpretationChangeLevel;
  risk_posture_change: WatchtowerNarrativeRiskPostureChange;
  operator_focus_change: WatchtowerNarrativeOperatorFocusChange;
  recommended_action_change: WatchtowerNarrativeRecommendedActionChange;
  urgency_change: WatchtowerNarrativeUrgencyChange;
  change_signals: WatchtowerNarrativeDiffSignal[];
  deterministic_summary: string;
  comparison_method: typeof DEFAULT_WATCHTOWER_NARRATIVE_DIFF_METHOD;
  metadata_json: Record<string, unknown>;
};

const RISK_POSTURE_ORDINAL: Record<WatchtowerNarrativeRiskPosture, number | null> = {
  stable: 0,
  monitor: 1,
  elevated: 2,
  material_change: 3,
  unknown: null,
};

const CONFIDENCE_ORDINAL: Record<WatchtowerNarrativeConfidenceLevel, number> = {
  low: 0,
  medium: 1,
  high: 2,
};

const SOURCE_COUNT_KEYS = [
  "watchlists_checked_count",
  "new_alerts_count",
  "review_items_count",
  "briefs_count",
  "affected_claim_families_count",
  "affected_client_claims_count",
] as const;

const INTERPRETATION_LEVEL_RANK: Record<WatchtowerNarrativeInterpretationChangeLevel, number> = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
};

const SIGNAL_ORDER: WatchtowerNarrativeDiffSignal[] = [
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
];

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").trim().replace(/\s+/g, " ");
}

function compareRiskPosture(
  previous: WatchtowerNarrativeRiskPosture,
  current: WatchtowerNarrativeRiskPosture
): WatchtowerNarrativeRiskPostureChange {
  if (previous === current) {
    return "unchanged";
  }

  const previousOrdinal = RISK_POSTURE_ORDINAL[previous];
  const currentOrdinal = RISK_POSTURE_ORDINAL[current];

  if (previousOrdinal === null && currentOrdinal !== null) {
    return "unknown_to_known";
  }

  if (previousOrdinal !== null && currentOrdinal === null) {
    return "known_to_unknown";
  }

  if (previousOrdinal !== null && currentOrdinal !== null) {
    if (currentOrdinal > previousOrdinal) {
      return "increased";
    }

    if (currentOrdinal < previousOrdinal) {
      return "decreased";
    }
  }

  return "unchanged";
}

function extractSourceCounts(
  sourceCounts: Record<string, unknown> | null
): Record<(typeof SOURCE_COUNT_KEYS)[number], number> {
  const counts = {} as Record<(typeof SOURCE_COUNT_KEYS)[number], number>;

  for (const key of SOURCE_COUNT_KEYS) {
    const value = sourceCounts?.[key];
    counts[key] = typeof value === "number" && Number.isFinite(value) ? value : 0;
  }

  return counts;
}

function sourceCountsEqual(
  previous: Record<string, unknown> | null,
  current: Record<string, unknown> | null
): boolean {
  const previousCounts = extractSourceCounts(previous);
  const currentCounts = extractSourceCounts(current);

  return SOURCE_COUNT_KEYS.every((key) => previousCounts[key] === currentCounts[key]);
}

function sourceCountDeltas(
  previous: Record<string, unknown> | null,
  current: Record<string, unknown> | null
): Record<string, number> {
  const previousCounts = extractSourceCounts(previous);
  const currentCounts = extractSourceCounts(current);
  const deltas: Record<string, number> = {};

  for (const key of SOURCE_COUNT_KEYS) {
    const delta = currentCounts[key] - previousCounts[key];
    if (delta !== 0) {
      deltas[key] = delta;
    }
  }

  return deltas;
}

function extractClaimFamilies(referencedEntities: Record<string, unknown> | null): string[] {
  const claimFamilies = referencedEntities?.claim_families;
  if (!Array.isArray(claimFamilies)) {
    return [];
  }

  return claimFamilies.filter((value): value is string => typeof value === "string").sort();
}

function claimFamiliesEqual(
  previous: Record<string, unknown> | null,
  current: Record<string, unknown> | null
): boolean {
  const previousFamilies = extractClaimFamilies(previous);
  const currentFamilies = extractClaimFamilies(current);

  if (previousFamilies.length !== currentFamilies.length) {
    return false;
  }

  return previousFamilies.every((family, index) => family === currentFamilies[index]);
}

function textFieldsEqual(
  previous: PrivacySafeWatchtowerNarrative,
  current: PrivacySafeWatchtowerNarrative
): boolean {
  return (
    normalizeText(previous.summary_text) === normalizeText(current.summary_text) &&
    normalizeText(previous.what_changed_text) === normalizeText(current.what_changed_text) &&
    normalizeText(previous.why_it_matters_text) === normalizeText(current.why_it_matters_text)
  );
}

function structuredFieldsEqual(
  previous: PrivacySafeWatchtowerNarrative,
  current: PrivacySafeWatchtowerNarrative
): boolean {
  return (
    previous.risk_posture === current.risk_posture &&
    previous.confidence_level === current.confidence_level &&
    normalizeText(previous.operator_focus_text) === normalizeText(current.operator_focus_text) &&
    normalizeText(previous.recommended_next_action_text) ===
      normalizeText(current.recommended_next_action_text) &&
    sourceCountsEqual(previous.source_counts_json, current.source_counts_json) &&
    claimFamiliesEqual(previous.referenced_entities_json, current.referenced_entities_json)
  );
}

function narrativesFullyEqual(
  previous: PrivacySafeWatchtowerNarrative,
  current: PrivacySafeWatchtowerNarrative
): boolean {
  return structuredFieldsEqual(previous, current) && textFieldsEqual(previous, current);
}

function maxInterpretationLevel(
  current: WatchtowerNarrativeInterpretationChangeLevel,
  candidate: WatchtowerNarrativeInterpretationChangeLevel
): WatchtowerNarrativeInterpretationChangeLevel {
  return INTERPRETATION_LEVEL_RANK[candidate] > INTERPRETATION_LEVEL_RANK[current]
    ? candidate
    : current;
}

function sortSignals(signals: WatchtowerNarrativeDiffSignal[]): WatchtowerNarrativeDiffSignal[] {
  const unique = [...new Set(signals)];
  return SIGNAL_ORDER.filter((signal) => unique.includes(signal));
}

function humanizeRiskPosture(posture: WatchtowerNarrativeRiskPosture): string {
  return posture.replaceAll("_", " ");
}

function buildDeterministicSummary(input: {
  previousNarrative: PrivacySafeWatchtowerNarrative | null;
  currentNarrative: PrivacySafeWatchtowerNarrative;
  signals: WatchtowerNarrativeDiffSignal[];
  riskPostureChange: WatchtowerNarrativeRiskPostureChange;
}): string {
  if (!input.previousNarrative) {
    return "No prior watchtower narrative exists for this workspace. This is the first digest interpretation in the current sequence.";
  }

  if (input.signals.includes("no_material_change")) {
    return "Risk posture, operator focus, recommended action, evidence counts, and narrative wording are unchanged since the prior digest narrative.";
  }

  if (input.signals.includes("risk_posture_increased")) {
    return `Risk posture changed from ${humanizeRiskPosture(input.previousNarrative.risk_posture)} to ${humanizeRiskPosture(input.currentNarrative.risk_posture)} since the prior digest narrative. Operator attention may be required.`;
  }

  if (input.signals.includes("risk_posture_decreased")) {
    return `Risk posture decreased from ${humanizeRiskPosture(input.previousNarrative.risk_posture)} to ${humanizeRiskPosture(input.currentNarrative.risk_posture)} since the prior digest narrative.`;
  }

  if (input.signals.includes("evidence_count_changed")) {
    return "Evidence counts changed since the prior digest narrative based on stored narrative snapshots.";
  }

  if (input.signals.includes("operator_focus_changed")) {
    return "Operator focus changed since the prior digest narrative based on stored narrative snapshots.";
  }

  if (input.signals.includes("recommended_action_changed")) {
    return "Recommended next action changed since the prior digest narrative based on stored narrative snapshots.";
  }

  if (input.signals.includes("claim_family_scope_changed")) {
    return "Affected claim families changed since the prior digest narrative based on stored narrative snapshots.";
  }

  if (input.signals.includes("wording_changed_only")) {
    return "Narrative wording changed since the prior digest narrative, but risk posture, operator focus, recommended action, and evidence counts are unchanged.";
  }

  if (
    input.signals.includes("confidence_increased") ||
    input.signals.includes("confidence_decreased")
  ) {
    return "Confidence level changed since the prior digest narrative based on stored narrative snapshots.";
  }

  return "Watchtower narrative interpretation changed since the prior digest narrative based on stored narrative snapshots.";
}

export function compareWatchtowerNarrativesForDiff(
  input: WatchtowerNarrativeDiffComparisonInput
): WatchtowerNarrativeDiffComparisonResult {
  const comparedAt = input.comparedAt ?? new Date().toISOString();
  const { currentNarrative, previousNarrative } = input;

  if (!previousNarrative) {
    return {
      comparison_scope: DEFAULT_WATCHTOWER_NARRATIVE_COMPARISON_SCOPE,
      diff_version: DEFAULT_WATCHTOWER_NARRATIVE_DIFF_VERSION,
      interpretation_change_level: "none",
      risk_posture_change: "not_applicable",
      operator_focus_change: "not_applicable",
      recommended_action_change: "not_applicable",
      urgency_change: "unchanged",
      change_signals: ["no_prior_narrative"],
      deterministic_summary:
        "No prior watchtower narrative exists for this workspace. This is the first digest interpretation in the current sequence.",
      comparison_method: DEFAULT_WATCHTOWER_NARRATIVE_DIFF_METHOD,
      metadata_json: {
        compared_at: comparedAt,
        current_narrative_id: currentNarrative.id,
        current_digest_id: currentNarrative.digest_id,
        previous_narrative_id: null,
        previous_digest_id: null,
      },
    };
  }

  const signals: WatchtowerNarrativeDiffSignal[] = [];
  let interpretationChangeLevel: WatchtowerNarrativeInterpretationChangeLevel = "none";
  let urgencyChange: WatchtowerNarrativeUrgencyChange = "unchanged";

  const riskPostureChange = compareRiskPosture(
    previousNarrative.risk_posture,
    currentNarrative.risk_posture
  );
  let operatorFocusChange: WatchtowerNarrativeOperatorFocusChange = "unchanged";
  let recommendedActionChange: WatchtowerNarrativeRecommendedActionChange = "unchanged";

  const operatorFocusChanged =
    normalizeText(previousNarrative.operator_focus_text) !==
    normalizeText(currentNarrative.operator_focus_text);
  const recommendedActionChanged =
    normalizeText(previousNarrative.recommended_next_action_text) !==
    normalizeText(currentNarrative.recommended_next_action_text);
  const sourceCountsChanged = !sourceCountsEqual(
    previousNarrative.source_counts_json,
    currentNarrative.source_counts_json
  );
  const claimFamiliesChanged = !claimFamiliesEqual(
    previousNarrative.referenced_entities_json,
    currentNarrative.referenced_entities_json
  );
  const textChanged = !textFieldsEqual(previousNarrative, currentNarrative);

  if (narrativesFullyEqual(previousNarrative, currentNarrative)) {
    signals.push("no_material_change");
  } else {
    if (riskPostureChange === "increased" || riskPostureChange === "unknown_to_known") {
      signals.push("risk_posture_increased", "operator_attention_required");
      interpretationChangeLevel = "high";
      urgencyChange = "increased";
    } else if (riskPostureChange === "decreased") {
      signals.push("risk_posture_decreased");
      interpretationChangeLevel = maxInterpretationLevel(interpretationChangeLevel, "medium");
      urgencyChange = "decreased";
    } else if (riskPostureChange === "known_to_unknown") {
      urgencyChange = "unknown";
      interpretationChangeLevel = maxInterpretationLevel(interpretationChangeLevel, "medium");
    }

    if (sourceCountsChanged) {
      signals.push("evidence_count_changed");
      interpretationChangeLevel = maxInterpretationLevel(interpretationChangeLevel, "medium");
    }

    if (operatorFocusChanged) {
      operatorFocusChange = "changed";
      signals.push("operator_focus_changed");
      interpretationChangeLevel = maxInterpretationLevel(interpretationChangeLevel, "medium");
    }

    if (recommendedActionChanged) {
      recommendedActionChange = "changed";
      signals.push("recommended_action_changed");
      interpretationChangeLevel = maxInterpretationLevel(interpretationChangeLevel, "medium");
    }

    if (claimFamiliesChanged) {
      signals.push("claim_family_scope_changed");
      interpretationChangeLevel = maxInterpretationLevel(interpretationChangeLevel, "medium");
    }

    const previousConfidence = previousNarrative.confidence_level;
    const currentConfidence = currentNarrative.confidence_level;

    if (previousConfidence && currentConfidence && previousConfidence !== currentConfidence) {
      const previousRank = CONFIDENCE_ORDINAL[previousConfidence];
      const currentRank = CONFIDENCE_ORDINAL[currentConfidence];

      if (currentRank > previousRank) {
        signals.push("confidence_increased");
      } else {
        signals.push("confidence_decreased");
      }

      interpretationChangeLevel = maxInterpretationLevel(interpretationChangeLevel, "low");
    }

    const structuredChanged = !structuredFieldsEqual(previousNarrative, currentNarrative);
    if (
      textChanged &&
      !structuredChanged &&
      riskPostureChange === "unchanged" &&
      !sourceCountsChanged &&
      !operatorFocusChanged &&
      !recommendedActionChanged &&
      !claimFamiliesChanged
    ) {
      signals.push("wording_changed_only");
      interpretationChangeLevel = maxInterpretationLevel(interpretationChangeLevel, "low");
    }

    if (signals.length === 0) {
      signals.push("no_material_change");
    }
  }

  const sortedSignals = sortSignals(signals);

  return {
    comparison_scope: DEFAULT_WATCHTOWER_NARRATIVE_COMPARISON_SCOPE,
    diff_version: DEFAULT_WATCHTOWER_NARRATIVE_DIFF_VERSION,
    interpretation_change_level: interpretationChangeLevel,
    risk_posture_change: riskPostureChange,
    operator_focus_change: operatorFocusChange,
    recommended_action_change: recommendedActionChange,
    urgency_change: urgencyChange,
    change_signals: sortedSignals,
    deterministic_summary: buildDeterministicSummary({
      previousNarrative,
      currentNarrative,
      signals: sortedSignals,
      riskPostureChange,
    }),
    comparison_method: DEFAULT_WATCHTOWER_NARRATIVE_DIFF_METHOD,
    metadata_json: {
      compared_at: comparedAt,
      current_narrative_id: currentNarrative.id,
      current_digest_id: currentNarrative.digest_id,
      previous_narrative_id: previousNarrative.id,
      previous_digest_id: previousNarrative.digest_id,
      previous_risk_posture: previousNarrative.risk_posture,
      current_risk_posture: currentNarrative.risk_posture,
      previous_confidence_level: previousNarrative.confidence_level,
      current_confidence_level: currentNarrative.confidence_level,
      source_count_deltas: sourceCountDeltas(
        previousNarrative.source_counts_json,
        currentNarrative.source_counts_json
      ),
      previous_claim_families: extractClaimFamilies(previousNarrative.referenced_entities_json),
      current_claim_families: extractClaimFamilies(currentNarrative.referenced_entities_json),
    },
  };
}
