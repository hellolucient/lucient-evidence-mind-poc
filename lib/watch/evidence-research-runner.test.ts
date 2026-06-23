import { describe, expect, it } from "vitest";

import { runControlledClaimResearch } from "@/lib/watch/evidence-research-runner";
import type { PrivacySafeWellnessClaim } from "@/lib/watch/wellness-claims-store";

const supportsDeepSleepClaim: PrivacySafeWellnessClaim = {
  claim_id: "claim-001",
  workspace_id: "demo-workspace-spa-menu",
  source_document_id: "doc-001",
  source_candidate_claim_id: "candidate-001",
  claim_text: "supports deep sleep",
  normalized_claim_text: "supports deep sleep",
  claim_type: "sleep",
  claim_family: "sleep_support",
  subject: "Magnesium Calm Ritual",
  predicate: "supports sleep",
  object: "sleep",
  claim_strength: "moderate",
  evidence_sensitivity: "medium",
  source_excerpt: "support deep sleep",
  source_location: "line 1",
  status: "active",
  review_status: "accepted",
  research_status: "not_started",
  created_at: "2026-06-23T10:05:00.000Z",
  updated_at: "2026-06-23T10:05:00.000Z",
};

describe("evidence-research-runner", () => {
  it("produces controlled demo output for supports deep sleep", () => {
    const result = runControlledClaimResearch(supportsDeepSleepClaim);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.research_mode).toBe("mock_evidence_v1");
    expect(result.evidence_posture).toBe("mixed");
    expect(result.evidence_strength).toBe("low");
    expect(result.risk_level).toBe("medium");
    expect(result.summary).toContain("Magnesium may have some evidence related to sleep quality");
    expect(result.safer_wording).toBe("May support relaxation and healthy sleep routines.");
    expect(result.citations.length).toBeGreaterThan(0);
    expect(result.research_notes).toContain("mock_evidence_v1");
  });

  it("returns generic insufficient demo output for unknown claims", () => {
    const result = runControlledClaimResearch({
      ...supportsDeepSleepClaim,
      claim_text: "boosts immunity overnight",
      normalized_claim_text: "boosts immunity overnight",
      claim_family: "immune_support",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.evidence_posture).toBe("insufficient");
    expect(result.evidence_strength).toBe("very_low");
    expect(result.citations).toEqual([]);
  });
});
