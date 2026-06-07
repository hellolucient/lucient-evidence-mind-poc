import { describe, expect, it } from "vitest";

import { compareWatchtowerNarrativesForDiff } from "@/lib/watch/evidence-mind-watchtower-narrative-diff-comparator";
import type { PrivacySafeWatchtowerNarrative } from "@/lib/watch/evidence-mind-watchtower-narrative-store";

const COMPARED_AT = "2026-06-07T12:00:00.000Z";

function buildNarrative(
  overrides: Partial<PrivacySafeWatchtowerNarrative> = {}
): PrivacySafeWatchtowerNarrative {
  return {
    id: "narrative-current-001",
    workspace_id: "demo-workspace-spa-menu",
    digest_id: "digest-current-001",
    claim_family: null,
    narrative_type: "digest_interpretation",
    narrative_version: "watchtower_narrative_v1",
    title: "Watchtower Narrative — Evidence Mind Digest",
    summary_text: "Evidence-constrained summary for current digest.",
    what_changed_text: "One evidence alert was recorded.",
    why_it_matters_text: "Monitor posture based on stored snapshots.",
    operator_focus_text: "Continue monitoring affected claim families.",
    recommended_next_action_text:
      "Continue monitoring affected claim families and re-check after the next watch cycle.",
    risk_posture: "monitor",
    confidence_level: "medium",
    source_counts_json: {
      watchlists_checked_count: 2,
      new_alerts_count: 1,
      review_items_count: 1,
      briefs_count: 1,
      affected_claim_families_count: 1,
      affected_client_claims_count: 1,
    },
    referenced_entities_json: {
      claim_families: ["magnesium_cortisol_stress"],
    },
    generation_method: "deterministic_template",
    generated_at: "2026-06-07T12:00:00.000Z",
    created_at: "2026-06-07T12:00:00.000Z",
    updated_at: "2026-06-07T12:00:00.000Z",
    ...overrides,
  };
}

describe("evidence-mind-watchtower-narrative-diff-comparator", () => {
  it("returns no_prior_narrative when previousNarrative is null", () => {
    const result = compareWatchtowerNarrativesForDiff({
      currentNarrative: buildNarrative(),
      previousNarrative: null,
      comparedAt: COMPARED_AT,
    });

    expect(result.change_signals).toEqual(["no_prior_narrative"]);
    expect(result.interpretation_change_level).toBe("none");
    expect(result.risk_posture_change).toBe("not_applicable");
    expect(result.operator_focus_change).toBe("not_applicable");
    expect(result.recommended_action_change).toBe("not_applicable");
    expect(result.urgency_change).toBe("unchanged");
    expect(result.deterministic_summary).toContain("No prior watchtower narrative exists");
  });

  it("returns no_material_change for identical narratives", () => {
    const narrative = buildNarrative();
    const previous = buildNarrative({
      id: "narrative-previous-001",
      digest_id: "digest-previous-001",
      generated_at: "2026-06-06T12:00:00.000Z",
    });

    const result = compareWatchtowerNarrativesForDiff({
      currentNarrative: narrative,
      previousNarrative: previous,
      comparedAt: COMPARED_AT,
    });

    expect(result.change_signals).toEqual(["no_material_change"]);
    expect(result.interpretation_change_level).toBe("none");
    expect(result.risk_posture_change).toBe("unchanged");
    expect(result.urgency_change).toBe("unchanged");
  });

  it("returns high severity when risk posture increases from monitor to elevated", () => {
    const previous = buildNarrative({
      id: "narrative-previous-001",
      digest_id: "digest-previous-001",
      risk_posture: "monitor",
      generated_at: "2026-06-06T12:00:00.000Z",
    });
    const current = buildNarrative({
      risk_posture: "elevated",
    });

    const result = compareWatchtowerNarrativesForDiff({
      currentNarrative: current,
      previousNarrative: previous,
      comparedAt: COMPARED_AT,
    });

    expect(result.change_signals).toContain("risk_posture_increased");
    expect(result.change_signals).toContain("operator_attention_required");
    expect(result.interpretation_change_level).toBe("high");
    expect(result.risk_posture_change).toBe("increased");
    expect(result.urgency_change).toBe("increased");
  });

  it("returns decreased urgency when risk posture decreases from elevated to monitor", () => {
    const previous = buildNarrative({
      id: "narrative-previous-001",
      digest_id: "digest-previous-001",
      risk_posture: "elevated",
      generated_at: "2026-06-06T12:00:00.000Z",
    });
    const current = buildNarrative({
      risk_posture: "monitor",
    });

    const result = compareWatchtowerNarrativesForDiff({
      currentNarrative: current,
      previousNarrative: previous,
      comparedAt: COMPARED_AT,
    });

    expect(result.change_signals).toContain("risk_posture_decreased");
    expect(result.risk_posture_change).toBe("decreased");
    expect(result.urgency_change).toBe("decreased");
  });

  it("returns recommended_action_changed with at least medium severity", () => {
    const previous = buildNarrative({
      id: "narrative-previous-001",
      digest_id: "digest-previous-001",
      generated_at: "2026-06-06T12:00:00.000Z",
    });
    const current = buildNarrative({
      recommended_next_action_text:
        "Prioritize review of affected claim families and confirm whether wording updates are required.",
    });

    const result = compareWatchtowerNarrativesForDiff({
      currentNarrative: current,
      previousNarrative: previous,
      comparedAt: COMPARED_AT,
    });

    expect(result.change_signals).toContain("recommended_action_changed");
    expect(result.recommended_action_change).toBe("changed");
    expect(["medium", "high"]).toContain(result.interpretation_change_level);
  });

  it("returns operator_focus_changed with at least medium severity", () => {
    const previous = buildNarrative({
      id: "narrative-previous-001",
      digest_id: "digest-previous-001",
      generated_at: "2026-06-06T12:00:00.000Z",
    });
    const current = buildNarrative({
      operator_focus_text: "Review affected claim families immediately.",
    });

    const result = compareWatchtowerNarrativesForDiff({
      currentNarrative: current,
      previousNarrative: previous,
      comparedAt: COMPARED_AT,
    });

    expect(result.change_signals).toContain("operator_focus_changed");
    expect(result.operator_focus_change).toBe("changed");
    expect(["medium", "high"]).toContain(result.interpretation_change_level);
  });

  it("returns evidence_count_changed with at least medium severity", () => {
    const previous = buildNarrative({
      id: "narrative-previous-001",
      digest_id: "digest-previous-001",
      generated_at: "2026-06-06T12:00:00.000Z",
    });
    const current = buildNarrative({
      source_counts_json: {
        watchlists_checked_count: 2,
        new_alerts_count: 2,
        review_items_count: 1,
        briefs_count: 1,
        affected_claim_families_count: 1,
        affected_client_claims_count: 1,
      },
    });

    const result = compareWatchtowerNarrativesForDiff({
      currentNarrative: current,
      previousNarrative: previous,
      comparedAt: COMPARED_AT,
    });

    expect(result.change_signals).toContain("evidence_count_changed");
    expect(["medium", "high"]).toContain(result.interpretation_change_level);
    expect(result.metadata_json.source_count_deltas).toEqual({
      new_alerts_count: 1,
    });
  });

  it("returns wording_changed_only with low severity for text-only changes", () => {
    const previous = buildNarrative({
      id: "narrative-previous-001",
      digest_id: "digest-previous-001",
      generated_at: "2026-06-06T12:00:00.000Z",
    });
    const current = buildNarrative({
      summary_text: "Updated evidence-constrained summary wording only.",
    });

    const result = compareWatchtowerNarrativesForDiff({
      currentNarrative: current,
      previousNarrative: previous,
      comparedAt: COMPARED_AT,
    });

    expect(result.change_signals).toEqual(["wording_changed_only"]);
    expect(result.interpretation_change_level).toBe("low");
    expect(result.risk_posture_change).toBe("unchanged");
    expect(result.operator_focus_change).toBe("unchanged");
    expect(result.recommended_action_change).toBe("unchanged");
  });

  it("produces deterministic output for the same inputs", () => {
    const previous = buildNarrative({
      id: "narrative-previous-001",
      digest_id: "digest-previous-001",
      generated_at: "2026-06-06T12:00:00.000Z",
    });
    const current = buildNarrative({
      risk_posture: "elevated",
      recommended_next_action_text:
        "Prioritize review of affected claim families and confirm whether wording updates are required.",
    });

    const first = compareWatchtowerNarrativesForDiff({
      currentNarrative: current,
      previousNarrative: previous,
      comparedAt: COMPARED_AT,
    });
    const second = compareWatchtowerNarrativesForDiff({
      currentNarrative: current,
      previousNarrative: previous,
      comparedAt: COMPARED_AT,
    });

    expect(second).toEqual(first);
  });
});
