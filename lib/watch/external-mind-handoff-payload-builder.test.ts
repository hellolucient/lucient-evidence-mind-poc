import { describe, expect, it } from "vitest";

import { CURRENT_WATCH_PHASE } from "@/lib/watch/watch-phase";
import {
  buildMindDigestHandoffPayload,
  isPrivacySafeMindDigestHandoffPayload,
} from "@/lib/watch/external-mind-handoff-payload-builder";
import type { PrivacySafeWatchtowerNarrativeDiff } from "@/lib/watch/evidence-mind-watchtower-narrative-diff-store";
import type { PrivacySafeWatchtowerNarrative } from "@/lib/watch/evidence-mind-watchtower-narrative-store";

const digest = {
  id: "digest-uuid-001",
  workspace_id: "demo-workspace-spa-menu",
  period_start: "2026-05-25T00:00:00.000Z",
  period_end: "2026-05-31T23:59:59.999Z",
  digest_title: "Evidence Mind Digest",
  digest_summary: "Summary",
  watchlists_checked_count: 2,
  new_alerts_count: 1,
  review_items_count: 1,
  briefs_count: 1,
  affected_claim_families_count: 1,
  affected_client_claims_count: 1,
  highest_risk_implication: "monitor",
  recommended_focus: "Continue monitoring.",
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

const narrative: PrivacySafeWatchtowerNarrative = {
  id: "narrative-uuid-001",
  workspace_id: "demo-workspace-spa-menu",
  digest_id: "digest-uuid-001",
  claim_family: null,
  narrative_type: "digest_interpretation",
  narrative_version: "watchtower_narrative_v1",
  title: "Watchtower Narrative — Evidence Mind Digest",
  summary_text: "Evidence-constrained summary.",
  what_changed_text: "One alert recorded.",
  why_it_matters_text: "Monitor posture based on stored snapshots.",
  operator_focus_text: "Continue monitoring.",
  recommended_next_action_text: "Continue monitoring affected claim families.",
  risk_posture: "monitor",
  confidence_level: "medium",
  source_counts_json: { briefs_count: 1 },
  referenced_entities_json: { claim_families: ["magnesium_cortisol_stress"] },
  generation_method: "deterministic_template",
  generated_at: "2026-05-31T12:30:00.000Z",
  created_at: "2026-05-31T12:30:00.000Z",
  updated_at: "2026-05-31T12:30:00.000Z",
};

const narrativeDiff: PrivacySafeWatchtowerNarrativeDiff = {
  id: "diff-uuid-001",
  workspace_id: "demo-workspace-spa-menu",
  current_narrative_id: "narrative-uuid-001",
  previous_narrative_id: "narrative-uuid-000",
  current_digest_id: "digest-uuid-001",
  previous_digest_id: "digest-uuid-000",
  comparison_scope: "workspace_digest_sequence",
  diff_version: "watchtower_narrative_diff_v1",
  interpretation_change_level: "medium",
  risk_posture_change: "decreased",
  operator_focus_change: "changed",
  recommended_action_change: "changed",
  urgency_change: "unchanged",
  change_signals: ["risk_posture_decreased"],
  deterministic_summary: "Risk posture decreased.",
  comparison_method: "deterministic_template",
  metadata_json: { internal_only: true },
  compared_at: "2026-06-07T12:00:00.000Z",
  created_at: "2026-06-07T12:00:00.000Z",
  updated_at: "2026-06-07T12:00:00.000Z",
};

describe("external-mind-handoff-payload-builder", () => {
  it("builds a valid digest handoff payload", () => {
    const payload = buildMindDigestHandoffPayload(digest, items, {
      generatedAt: "2026-05-31T12:00:00.000Z",
    });

    expect(payload.payload_version).toBe("mind_digest_payload_v1");
    expect(payload.workspace_id).toBe("demo-workspace-spa-menu");
    expect(payload.digest_id).toBe("digest-uuid-001");
    expect(payload.counts.briefs_count).toBe(1);
    expect(payload.items).toHaveLength(2);
    expect(payload.affected_claim_families).toContain("magnesium_cortisol_stress");
    expect(payload.affected_client_claims).toContain("demo-claim-magnesium-stress-001");
    expect(payload.referenced_evidence_briefs).toHaveLength(1);
    expect(payload.source_system).toBe("lucient_evidence_mind");
    expect(payload.phase).toBe("36");
  });

  it("includes watchtower narrative section when provided", () => {
    const payload = buildMindDigestHandoffPayload(digest, items, {
      watchtowerNarrative: narrative,
    });

    expect(payload.watchtower_narrative?.narrative_id).toBe("narrative-uuid-001");
    expect(payload.watchtower_narrative?.title).toContain("Watchtower Narrative");
    expect(payload.watchtower_narrative?.risk_posture).toBe("monitor");
    expect(isPrivacySafeMindDigestHandoffPayload(payload as unknown as Record<string, unknown>)).toBe(
      true
    );
  });

  it("builds payload without watchtower narrative when none exists", () => {
    const payload = buildMindDigestHandoffPayload(digest, items);

    expect(payload.watchtower_narrative).toBeUndefined();
    expect(payload.payload_version).toBe("mind_digest_payload_v1");
  });

  it("excludes secrets and private auth metadata from payload", () => {
    const payload = buildMindDigestHandoffPayload(digest, items);
    const serialized = JSON.stringify(payload);

    expect(isPrivacySafeMindDigestHandoffPayload(payload as unknown as Record<string, unknown>)).toBe(
      true
    );
    expect(serialized.toLowerCase()).not.toContain("cron_secret");
    expect(serialized.toLowerCase()).not.toContain("service_role");
    expect(serialized.toLowerCase()).not.toContain("access_token");
    expect(serialized.toLowerCase()).not.toContain("operator_email");
  });

  it("includes watchtower_narrative_diff when supplied", () => {
    const payload = buildMindDigestHandoffPayload(digest, items, {
      watchtowerNarrativeDiff: narrativeDiff,
    });

    expect(payload.watchtower_narrative_diff?.diff_id).toBe("diff-uuid-001");
    expect(payload.watchtower_narrative_diff?.diff_version).toBe("watchtower_narrative_diff_v1");
    expect(payload.watchtower_narrative_diff?.comparison_scope).toBe("workspace_digest_sequence");
    expect(payload.watchtower_narrative_diff?.interpretation_change_level).toBe("medium");
    expect(payload.watchtower_narrative_diff?.risk_posture_change).toBe("decreased");
    expect(payload.watchtower_narrative_diff?.operator_focus_change).toBe("changed");
    expect(payload.watchtower_narrative_diff?.recommended_action_change).toBe("changed");
    expect(payload.watchtower_narrative_diff?.urgency_change).toBe("unchanged");
    expect(payload.watchtower_narrative_diff?.change_signals).toEqual(["risk_posture_decreased"]);
    expect(payload.watchtower_narrative_diff?.deterministic_summary).toBe("Risk posture decreased.");
    expect(payload.watchtower_narrative_diff?.previous_narrative_id).toBe("narrative-uuid-000");
    expect(payload.watchtower_narrative_diff?.compared_at).toBe("2026-06-07T12:00:00.000Z");
    expect(payload.payload_version).toBe("mind_digest_payload_v1");
    expect(payload.phase).toBe(CURRENT_WATCH_PHASE);
    expect(isPrivacySafeMindDigestHandoffPayload(payload as unknown as Record<string, unknown>)).toBe(
      true
    );
  });

  it("omits watchtower_narrative_diff when null or undefined", () => {
    const withoutDiff = buildMindDigestHandoffPayload(digest, items, {
      watchtowerNarrativeDiff: null,
    });
    const defaultPayload = buildMindDigestHandoffPayload(digest, items);

    expect(withoutDiff.watchtower_narrative_diff).toBeUndefined();
    expect(defaultPayload.watchtower_narrative_diff).toBeUndefined();
    expect(withoutDiff.payload_version).toBe("mind_digest_payload_v1");
  });

  it("maps diff_id from diff.id and excludes private diff fields from serialized payload", () => {
    const payload = buildMindDigestHandoffPayload(digest, items, {
      watchtowerNarrativeDiff: narrativeDiff,
    });
    const serialized = JSON.stringify(payload);

    expect(payload.watchtower_narrative_diff?.diff_id).toBe(narrativeDiff.id);
    expect(serialized).not.toContain("metadata_json");
    expect(serialized).not.toContain("source_counts_json");
    expect(serialized).not.toContain("referenced_entities_json");
    expect(serialized).not.toContain("workspace_id\":\"demo-workspace-spa-menu\",\"current_narrative_id");
    expect(payload.watchtower_narrative_diff).not.toHaveProperty("comparison_method");
    expect(payload.watchtower_narrative_diff).not.toHaveProperty("created_at");
    expect(payload.watchtower_narrative_diff).not.toHaveProperty("updated_at");
    expect(payload.watchtower_narrative_diff).not.toHaveProperty("current_digest_id");
    expect(payload.watchtower_narrative_diff).not.toHaveProperty("previous_digest_id");
    expect(payload.watchtower_narrative_diff).not.toHaveProperty("current_narrative_id");
  });
});
