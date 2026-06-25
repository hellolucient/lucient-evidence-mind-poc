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

  it("parses v2 live research contract with verification fields and search URLs", () => {
    const result = parseMindClaimRiskBriefResponse(
      JSON.stringify({
        contract_version: "mind_claim_risk_brief_json_v2",
        claim_text: "Topical magnesium spa ritual reduces cortisol",
        source_context: "Spa marketing copy",
        search_capability_statement: "Live PubMed (NCBI E-utilities) search executed.",
        searches_performed: [
          {
            source: "NCBI E-utilities",
            query: "transdermal magnesium cortisol randomized",
            date_performed: "2026-06-25",
            result_count: 12,
            results_summary: "Limited direct evidence; mostly indirect.",
            search_url_or_endpoint:
              "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=transdermal+magnesium+cortisol",
          },
        ],
        evidence_found: [
          {
            title: "Magnesium and stress biomarkers: a systematic review",
            authors: "Example Author et al.",
            journal: "Example Journal",
            year: "2021",
            pmid: "35000001",
            doi: "10.1000/example.doi",
            url: "https://pubmed.ncbi.nlm.nih.gov/35000001/",
            verification_status: "verified",
            verification_note: "Resolved PubMed URL and title matched.",
            evidence_category: "ingredient",
            relevance_to_claim: "indirect",
            delivery_route: "oral",
            intervention_match: "magnesium supplementation (not topical)",
            outcome_type: "biomarker",
            summary: "Oral magnesium evidence does not validate topical ritual cortisol claims.",
          },
        ],
        evidence_not_found: [
          {
            gap: "No direct RCTs for branded spa ritual reducing cortisol.",
            importance: "Branded ritual evidence cannot be inferred.",
            searches_supporting_gap: ["transdermal magnesium cortisol randomized"],
          },
        ],
        evidence_posture: "unsupported",
        evidence_strength: "low",
        risk_level: "high",
        regulatory_sensitivity: "high",
        key_evidence_risk_insight: "Delivery-route mismatch is the key risk driver.",
        safer_wording: "Designed to support relaxation and perceived calm.",
        operator_recommendation: "soften",
        limitations: "Live search limited to PubMed; full-text not retrieved.",
        pmids: ["35000001"],
        dois: ["10.1000/example.doi"],
        urls: ["https://pubmed.ncbi.nlm.nih.gov/35000001/"],
        verification_summary: {
          total_pubmed_items_returned: 1,
          verified_pubmed_items: 1,
          unverified_items: 0,
          non_pubmed_items: 0,
          verification_method: "Resolved PubMed URLs and matched titles.",
        },
        cost_report: {
          reported_by_mind: true,
          summary: "1 PubMed search performed",
          search_count: 1,
          abstracts_fetched: 1,
          full_texts_fetched: 0,
        },
      })
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.contract_version).toBe("mind_claim_risk_brief_json_v2");
      expect(result.data.searches_performed[0]?.source).toBe("PubMed");
      expect(result.data.pmids).toContain("35000001");
      expect(result.data.verification_summary).toBeTruthy();
    }
  });
});

