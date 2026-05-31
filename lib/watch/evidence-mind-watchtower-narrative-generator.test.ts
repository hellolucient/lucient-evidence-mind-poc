import { describe, expect, it } from "vitest";

import {
  generateWatchtowerNarrativeContent,
  isPrivacySafeWatchtowerNarrativeContent,
  mapDigestRiskToNarrativePosture,
} from "@/lib/watch/evidence-mind-watchtower-narrative-generator";

const digest = {
  id: "digest-uuid-001",
  workspace_id: "demo-workspace-spa-menu",
  period_start: "2026-05-25T00:00:00.000Z",
  period_end: "2026-05-31T23:59:59.999Z",
  digest_title: "Evidence Mind Digest",
  digest_summary: "During the period, one alert and one brief were recorded.",
  watchlists_checked_count: 2,
  new_alerts_count: 1,
  review_items_count: 1,
  briefs_count: 1,
  affected_claim_families_count: 1,
  affected_client_claims_count: 1,
  highest_risk_implication: "monitor",
  recommended_focus: "No immediate action required. Continue monitoring.",
  status: "ready_for_review",
  generation_source: "manual",
  created_at: "2026-05-31T12:00:00.000Z",
  updated_at: "2026-05-31T12:00:00.000Z",
};

const items = [
  {
    digest_id: "digest-uuid-001",
    workspace_id: "demo-workspace-spa-menu",
    item_type: "evidence_brief",
    item_ref_id: "brief-uuid-001",
    claim_family: "magnesium_cortisol_stress",
    client_claim_id: null,
    title_snapshot: "Evidence change detected",
    summary_snapshot: "Brief summary",
    risk_implication: "monitor",
    recommended_action: "monitor only",
    created_at: "2026-05-31T12:00:00.000Z",
  },
  {
    digest_id: "digest-uuid-001",
    workspace_id: "demo-workspace-spa-menu",
    item_type: "client_claim",
    item_ref_id: "brief-uuid-001",
    claim_family: "magnesium_cortisol_stress",
    client_claim_id: "demo-claim-magnesium-stress-001",
    title_snapshot: "demo-claim-magnesium-stress-001",
    summary_snapshot: "Magnesium helps reduce stress.",
    risk_implication: null,
    recommended_action: null,
    created_at: "2026-05-31T12:00:00.000Z",
  },
];

describe("evidence-mind-watchtower-narrative-generator", () => {
  it("maps digest risk to narrative posture", () => {
    expect(mapDigestRiskToNarrativePosture("none")).toBe("stable");
    expect(mapDigestRiskToNarrativePosture("monitor")).toBe("monitor");
    expect(mapDigestRiskToNarrativePosture("wording_review_recommended")).toBe("elevated");
    expect(mapDigestRiskToNarrativePosture("claim_not_supported")).toBe("material_change");
  });

  it("generates required narrative fields from digest snapshots", () => {
    const content = generateWatchtowerNarrativeContent(digest, items, {
      generatedAt: "2026-05-31T12:30:00.000Z",
    });

    expect(content.narrative_type).toBe("digest_interpretation");
    expect(content.narrative_version).toBe("watchtower_narrative_v1");
    expect(content.title).toContain("Watchtower Narrative");
    expect(content.summary_text).toContain("evidence-constrained");
    expect(content.what_changed_text).toContain("evidence alert");
    expect(content.why_it_matters_text).toContain("proven or disproven");
    expect(content.operator_focus_text).toBe(digest.recommended_focus);
    expect(content.recommended_next_action_text).toBeTruthy();
    expect(content.risk_posture).toBe("monitor");
    expect(content.confidence_level).toBeTruthy();
    expect(content.source_counts_json?.briefs_count).toBe(1);
    expect(content.referenced_entities_json?.claim_families).toContain(
      "magnesium_cortisol_stress"
    );
    expect(content.generation_method).toBe("deterministic_template");
  });

  it("uses cautious language and excludes secrets from generated content", () => {
    const content = generateWatchtowerNarrativeContent(digest, items);
    const candidate = {
      ...content,
      workspace_id: digest.workspace_id,
      digest_id: digest.id,
      claim_family: null,
    };

    expect(content.summary_text.toLowerCase()).toContain("evidence-constrained");
    expect(content.why_it_matters_text?.toLowerCase()).toContain("proven or disproven");
    expect(isPrivacySafeWatchtowerNarrativeContent(candidate as unknown as Record<string, unknown>)).toBe(
      true
    );
    expect(JSON.stringify(candidate).toLowerCase()).not.toContain("operator_email");
    expect(JSON.stringify(candidate).toLowerCase()).not.toContain("cron_secret");
  });
});
