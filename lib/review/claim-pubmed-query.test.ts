import { describe, expect, it } from "vitest";

import { buildPubMedQueryForClaim } from "@/lib/review/claim-pubmed-query";
import type { PrivacySafeWellnessClaim } from "@/lib/watch/wellness-claims-store";

const baseClaim: PrivacySafeWellnessClaim = {
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

describe("claim pubmed query builder", () => {
  it("builds a sleep_support query that focuses on evidence concept, not spa treatment name", () => {
    const result = buildPubMedQueryForClaim(baseClaim);

    expect(result.query_text.toLowerCase()).toContain("magnesium");
    expect(result.query_text.toLowerCase()).toContain("sleep quality");
    expect(result.query_text.toLowerCase()).not.toContain("ritual");
    expect(result.debug.excluded_terms.join(" ").toLowerCase()).toContain("magnesium calm ritual");
  });

  it("supports simple family mappings (stress_hormone_balance -> cortisol)", () => {
    const result = buildPubMedQueryForClaim({
      ...baseClaim,
      claim_text: "reduces stress hormones",
      normalized_claim_text: "reduces stress hormones",
      claim_family: "stress_hormone_balance",
      subject: "Cortisol Balance Signature Treatment",
      predicate: "reduces cortisol",
      object: "cortisol",
    });

    expect(result.query_text.toLowerCase()).toContain("cortisol");
    expect(result.query_text.toLowerCase()).not.toContain("signature");
  });
});

