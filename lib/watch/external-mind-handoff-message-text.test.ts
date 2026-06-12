import { describe, expect, it } from "vitest";

import type { MindDigestHandoffPayloadV1 } from "@/lib/watch/external-mind-handoff-payload-builder";
import {
  buildHelloMindsMessageText,
  buildPrivacySafeHelloMindsMessageText,
  isPrivacySafeHelloMindsMessageText,
} from "@/lib/watch/external-mind-handoff-message-text";

const basePayload: MindDigestHandoffPayloadV1 = {
  payload_version: "mind_digest_payload_v1",
  workspace_id: "demo-workspace-spa-menu",
  digest_id: "digest-uuid-001",
  handoff_type: "digest_summary",
  destination: "hellominds",
  period_start: "2026-05-25T00:00:00.000Z",
  period_end: "2026-05-31T23:59:59.999Z",
  digest_title: "Evidence Mind Digest",
  digest_summary: "Summary text",
  highest_risk_implication: "monitor",
  recommended_focus: "Continue monitoring.",
  counts: {
    watchlists_checked_count: 2,
    new_alerts_count: 1,
    review_items_count: 1,
    briefs_count: 1,
    affected_claim_families_count: 1,
    affected_client_claims_count: 1,
  },
  items: [
    {
      item_type: "client_claim",
      claim_family: "magnesium_cortisol_stress",
      client_claim_id: "demo-claim-magnesium-stress-001",
      title_snapshot: "Magnesium stress claim",
      summary_snapshot: "Magnesium helps reduce stress.",
      risk_implication: "monitor",
      recommended_action: "monitor only",
    },
  ],
  affected_claim_families: ["magnesium_cortisol_stress"],
  affected_client_claims: ["demo-claim-magnesium-stress-001"],
  referenced_evidence_briefs: [],
  referenced_review_items: [],
  generated_at: "2026-05-31T12:00:00.000Z",
  source_system: "lucient_evidence_mind",
  phase: "37",
};

describe("external-mind-handoff-message-text", () => {
  it("includes approved summary fields and counts", () => {
    const messageText = buildHelloMindsMessageText(basePayload);

    expect(messageText).toContain("Payload version: mind_digest_payload_v1");
    expect(messageText).toContain("Handoff type: digest_summary");
    expect(messageText).toContain("2026-05-25T00:00:00.000Z");
    expect(messageText).toContain("Evidence Mind Digest");
    expect(messageText).toContain("Summary text");
    expect(messageText).toContain("Watchlists checked: 2");
    expect(messageText).toContain("Affected client claims (count): 1");
  });

  it("includes item titles summaries and actions without client claim ids", () => {
    const messageText = buildHelloMindsMessageText(basePayload);

    expect(messageText).toContain("Magnesium stress claim");
    expect(messageText).toContain("Magnesium helps reduce stress.");
    expect(messageText).toContain("monitor only");
    expect(messageText).not.toContain("demo-claim-magnesium-stress-001");
    expect(messageText).not.toContain("client_claim_id");
  });

  it("defaults to counts rather than listing claim-family names", () => {
    const messageText = buildHelloMindsMessageText(basePayload);

    expect(messageText).toContain("Affected claim families (count): 1");
    expect(messageText).not.toContain("magnesium_cortisol_stress");
  });

  it("includes watchtower narrative and diff only when present", () => {
    const withSections = buildHelloMindsMessageText({
      ...basePayload,
      watchtower_narrative: {
        narrative_id: "narrative-uuid-001",
        narrative_version: "watchtower_narrative_v1",
        title: "Watchtower Narrative",
        risk_posture: "monitor",
        summary_text: "Deterministic summary.",
        what_changed_text: "One alert recorded.",
        why_it_matters_text: "Monitor posture.",
        operator_focus_text: "Continue monitoring.",
        recommended_next_action_text: "Continue monitoring affected families.",
        generated_at: "2026-05-31T12:30:00.000Z",
      },
      watchtower_narrative_diff: {
        diff_id: "diff-uuid-001",
        diff_version: "watchtower_narrative_diff_v1",
        comparison_scope: "digest_narrative",
        interpretation_change_level: "minor",
        risk_posture_change: "unchanged",
        operator_focus_change: "unchanged",
        recommended_action_change: "unchanged",
        urgency_change: "unchanged",
        change_signals: ["risk_posture_unchanged"],
        deterministic_summary: "No material interpretation change.",
        previous_narrative_id: "narrative-uuid-000",
        compared_at: "2026-05-31T12:35:00.000Z",
      },
    });

    expect(withSections).toContain("--- Watchtower narrative ---");
    expect(withSections).toContain("Deterministic summary.");
    expect(withSections).toContain("--- Watchtower narrative diff (deterministic) ---");
    expect(withSections).toContain("No material interpretation change.");

    const withoutSections = buildHelloMindsMessageText(basePayload);
    expect(withoutSections).not.toContain("--- Watchtower narrative ---");
    expect(withoutSections).not.toContain("--- Watchtower narrative diff");
  });

  it("excludes raw JSON dumps and forbidden internal field names", () => {
    const messageText = buildHelloMindsMessageText(basePayload);

    expect(messageText).not.toContain('"payload_version"');
    expect(messageText).not.toContain("metadata_json");
    expect(messageText).not.toContain("source_counts_json");
    expect(messageText).not.toContain("referenced_entities_json");
    expect(messageText).not.toContain("affected_client_claims");
    expect(messageText).not.toContain("affected_claim_families");
    expect(isPrivacySafeHelloMindsMessageText(messageText)).toBe(true);
  });

  it("returns null from privacy-safe builder when output would be unsafe", () => {
    const unsafePayload = {
      ...basePayload,
      digest_summary: '{"metadata_json":"leak"}',
    };

    expect(buildPrivacySafeHelloMindsMessageText(unsafePayload)).toBeNull();
  });

  it("is deterministic for the same payload", () => {
    const first = buildHelloMindsMessageText(basePayload);
    const second = buildHelloMindsMessageText(basePayload);

    expect(first).toBe(second);
  });
});
