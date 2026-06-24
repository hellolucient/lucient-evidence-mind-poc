import { describe, expect, it } from "vitest";

import { normalizeMindExtractionConfidence } from "@/lib/watch/mind-claim-extraction-confidence";
import { parseMindClaimExtractionResponse } from "@/lib/watch/mind-claim-extraction-contract";

const BASE_CLAIM = {
  claim_id: "C1",
  claim_text: "deeply relaxing treatment",
  exact_source_phrase: "A deeply relaxing treatment",
  subject: "Magnesium Calm Ritual treatment",
  predicate: "is",
  object_or_outcome: "deeply relaxing",
  claim_family: "spa_relaxation",
  claim_type: "experiential",
  evidence_sensitivity: "low",
  risk_level: "low",
  regulatory_sensitivity: "low",
  reason_for_extraction: "Explicit experiential treatment claim.",
  suggested_review_status: "accept",
} as const;

const MAGNESIUM_EXTRACTION_BASE = {
  contract_version: "mind_claim_extraction_json_v1",
  source_summary: "Spa magnesium ritual copy with relaxation and stress claims.",
  implied_claims_policy_applied: true,
  notes: "High-recall extraction applied.",
  cost_report: { reported_by_mind: true, summary: "Extraction complete." },
};

const LIVE_STYLE_MAGNESIUM_CLAIMS = [
  { ...BASE_CLAIM, claim_id: "C1", confidence: "high" },
  {
    ...BASE_CLAIM,
    claim_id: "C2",
    claim_text: "calm the nervous system",
    exact_source_phrase: "calm the nervous system",
    claim_type: "physiological",
    evidence_sensitivity: "medium",
    risk_level: "medium",
    regulatory_sensitivity: "medium",
    confidence: "high",
    suggested_review_status: "operator_review",
  },
  {
    ...BASE_CLAIM,
    claim_id: "C3",
    claim_text: "support deep sleep",
    exact_source_phrase: "support deep sleep",
    claim_type: "structure_function",
    evidence_sensitivity: "medium",
    risk_level: "medium",
    regulatory_sensitivity: "medium",
    confidence: "medium",
    suggested_review_status: "operator_review",
  },
  {
    ...BASE_CLAIM,
    claim_id: "C4",
    claim_text: "reduce stress hormones",
    exact_source_phrase: "reduce stress hormones",
    claim_type: "physiological",
    evidence_sensitivity: "high",
    risk_level: "high",
    regulatory_sensitivity: "high",
    confidence: "high",
    suggested_review_status: "edit",
  },
  {
    ...BASE_CLAIM,
    claim_id: "C5",
    claim_text: "restore balance",
    exact_source_phrase: "restore balance",
    claim_type: "general_wellness",
    confidence: "low",
    suggested_review_status: "accept",
  },
  {
    ...BASE_CLAIM,
    claim_id: "C6",
    claim_text: "reduces stress",
    exact_source_phrase: "reduce stress hormones",
    claim_type: "experiential",
    evidence_sensitivity: "medium",
    risk_level: "medium",
    regulatory_sensitivity: "medium",
    confidence: "moderate",
    suggested_review_status: "operator_review",
  },
];

describe("mind extraction confidence normalization", () => {
  it('normalizes confidence string "high" to 0.9', () => {
    const result = normalizeMindExtractionConfidence("high");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(0.9);
    }
  });

  it('normalizes confidence string "medium" to 0.6', () => {
    const result = normalizeMindExtractionConfidence("medium");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(0.6);
    }
  });

  it("fails unknown confidence string with useful path-oriented message", () => {
    const result = normalizeMindExtractionConfidence("uncertain");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain('received string "uncertain"');
    }
  });
});

describe("mind claim extraction parser diagnostics", () => {
  it("fails malformed enum with useful field path", () => {
    const result = parseMindClaimExtractionResponse(
      JSON.stringify({
        ...MAGNESIUM_EXTRACTION_BASE,
        claims: [
          {
            ...BASE_CLAIM,
            claim_type: "not_a_real_type",
            confidence: 0.9,
          },
        ],
      })
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("claims[0].claim_type");
      expect(result.message).toContain('received string "not_a_real_type"');
      expect(result.message).not.toBe("Invalid input");
    }
  });

  it("includes claim index and field path for unknown confidence labels", () => {
    const result = parseMindClaimExtractionResponse(
      JSON.stringify({
        ...MAGNESIUM_EXTRACTION_BASE,
        claims: [
          { ...BASE_CLAIM, confidence: 0.9 },
          { ...BASE_CLAIM, claim_id: "C2", confidence: "uncertain" },
        ],
      })
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain('claims[1].confidence');
      expect(result.message).toContain('received string "uncertain"');
    }
  });

  it("parses live-style Magnesium Calm Ritual response with string confidence labels", () => {
    const result = parseMindClaimExtractionResponse(
      JSON.stringify({
        ...MAGNESIUM_EXTRACTION_BASE,
        claims: LIVE_STYLE_MAGNESIUM_CLAIMS,
      })
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.claims).toHaveLength(6);
      expect(result.data.claims[0]?.confidence).toBe(0.9);
      expect(result.data.claims[2]?.confidence).toBe(0.6);
      expect(result.data.claims[5]?.confidence).toBe(0.6);
    }
  });
});
