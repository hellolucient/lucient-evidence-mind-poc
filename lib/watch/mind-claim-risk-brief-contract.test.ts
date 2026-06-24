import { describe, expect, it } from "vitest";

import { normalizeMindRiskBriefSearchSource } from "@/lib/watch/mind-claim-risk-brief-search-source";
import { parseMindClaimRiskBriefResponse } from "@/lib/watch/mind-claim-risk-brief-contract";

const BASE_RISK_BRIEF = {
  contract_version: "mind_claim_risk_brief_json_v1",
  claim_text: "Magnesium Calm Ritual helps reduce stress hormones",
  source_context: "Spa ritual copy",
  search_capability_statement: "Operator validation run",
  evidence_found: [],
  evidence_not_found: [],
  evidence_posture: "weak_indirect",
  evidence_strength: "low",
  risk_level: "high",
  regulatory_sensitivity: "high",
  key_evidence_risk_insight:
    "oral magnesium evidence ≠ topical magnesium evidence ≠ branded ritual evidence",
  safer_wording: "designed to support relaxation and a calmer state",
  operator_recommendation: "soften",
  limitations: "validation only",
  cost_report: { reported_by_mind: true, summary: "ok", search_count: 0, abstracts_fetched: 0 },
} as const;

describe("mind risk brief search source normalization", () => {
  it("normalizes extended PubMed source label to PubMed", () => {
    const result = normalizeMindRiskBriefSearchSource(
      "PubMed (via NCBI E-utilities, executed 2026-06-24 in prior cycle)"
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.source).toBe("PubMed");
    }
  });

  it("normalizes NCBI E-utilities to PubMed", () => {
    const result = normalizeMindRiskBriefSearchSource("NCBI E-utilities");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.source).toBe("PubMed");
    }
  });

  it("normalizes not searched to Not searched", () => {
    const result = normalizeMindRiskBriefSearchSource("not searched");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.source).toBe("Not searched");
    }
  });

  it("normalizes unknown non-empty source to Other when label-like", () => {
    const result = normalizeMindRiskBriefSearchSource("Google Scholar");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.source).toBe("Other");
    }
  });

  it("fails empty source with useful error", () => {
    const result = normalizeMindRiskBriefSearchSource("   ");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("empty string");
    }
  });
});

describe("mind risk brief parser diagnostics and normalization", () => {
  it("parse_error includes searches_performed index and field path", () => {
    const result = parseMindClaimRiskBriefResponse(
      JSON.stringify({
        ...BASE_RISK_BRIEF,
        searches_performed: [{ source: "", query: "x", date_performed: "2026-06-24", results_summary: "x" }],
      })
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("searches_performed[0].source");
    }
  });

  it("live-style risk brief with extended PubMed labels parses after normalization", () => {
    const result = parseMindClaimRiskBriefResponse(
      JSON.stringify({
        ...BASE_RISK_BRIEF,
        searches_performed: [
          {
            source: "PubMed (via NCBI E-utilities, executed 2026-06-24 in prior cycle)",
            query: "magnesium cortisol stress",
            date_performed: "2026-06-24",
            results_summary: "Representative results",
          },
          {
            source: "NCBI E-utilities",
            query: "transdermal magnesium absorption",
            date_performed: "2026-06-24",
            results_summary: "Representative results",
          },
          {
            source: "not searched",
            query: "brand name ritual evidence",
            date_performed: "2026-06-24",
            results_summary: "Not searched in this cycle",
          },
        ],
      })
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.searches_performed[0]?.source).toBe("PubMed");
      expect(result.data.searches_performed[1]?.source).toBe("PubMed");
      expect(result.data.searches_performed[2]?.source).toBe("Not searched");
    }
  });
});

