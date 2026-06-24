import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { escapeMindDisplayText, renderSafeMindTextBlock } from "@/lib/review/safe-mind-text";
import {
  buildMindClaimExtractionPrompt,
  parseMindClaimExtractionResponse,
} from "@/lib/watch/mind-claim-extraction-contract";
import {
  buildMindClaimRiskBriefPrompt,
  parseMindClaimRiskBriefResponse,
} from "@/lib/watch/mind-claim-risk-brief-contract";
import {
  extractFirstJsonObject,
  stripMarkdownJsonFences,
} from "@/lib/watch/mind-json-parser";

const MAGNESIUM_FIXTURE_TEXT =
  "Magnesium Calm Ritual: A deeply relaxing treatment designed to calm the nervous system, support deep sleep, reduce stress hormones, and restore balance.";

const MAGNESIUM_EXTRACTION_JSON = {
  contract_version: "mind_claim_extraction_json_v1",
  source_summary: "Spa magnesium ritual copy with relaxation and stress claims.",
  claims: [
    {
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
      confidence: 0.9,
      reason_for_extraction: "Explicit experiential treatment claim.",
      suggested_review_status: "accept",
    },
    {
      claim_id: "C2",
      claim_text: "calm the nervous system",
      exact_source_phrase: "calm the nervous system",
      subject: "treatment",
      predicate: "calms",
      object_or_outcome: "nervous system",
      claim_family: "nervous_system",
      claim_type: "physiological",
      evidence_sensitivity: "medium",
      risk_level: "medium",
      regulatory_sensitivity: "medium",
      confidence: 0.85,
      reason_for_extraction: "Physiological nervous system claim.",
      suggested_review_status: "operator_review",
    },
    {
      claim_id: "C3",
      claim_text: "support deep sleep",
      exact_source_phrase: "support deep sleep",
      subject: "treatment",
      predicate: "supports",
      object_or_outcome: "deep sleep",
      claim_family: "sleep",
      claim_type: "structure_function",
      evidence_sensitivity: "medium",
      risk_level: "medium",
      regulatory_sensitivity: "medium",
      confidence: 0.82,
      reason_for_extraction: "Sleep support structure/function claim.",
      suggested_review_status: "operator_review",
    },
    {
      claim_id: "C4",
      claim_text: "reduce stress hormones",
      exact_source_phrase: "reduce stress hormones",
      subject: "treatment",
      predicate: "reduces",
      object_or_outcome: "stress hormones",
      claim_family: "stress_hormones",
      claim_type: "physiological",
      evidence_sensitivity: "high",
      risk_level: "high",
      regulatory_sensitivity: "high",
      confidence: 0.8,
      reason_for_extraction: "Hormonal physiological claim.",
      suggested_review_status: "edit",
    },
    {
      claim_id: "C5",
      claim_text: "restore balance",
      exact_source_phrase: "restore balance",
      subject: "treatment",
      predicate: "restores",
      object_or_outcome: "balance",
      claim_family: "general_wellness",
      claim_type: "general_wellness",
      evidence_sensitivity: "low",
      risk_level: "low",
      regulatory_sensitivity: "low",
      confidence: 0.75,
      reason_for_extraction: "Soft balance/wellness claim.",
      suggested_review_status: "accept",
    },
    {
      claim_id: "C6",
      claim_text: "reduces stress",
      exact_source_phrase: "reduce stress hormones",
      subject: "treatment",
      predicate: "reduces",
      object_or_outcome: "stress",
      claim_family: "stress",
      claim_type: "experiential",
      evidence_sensitivity: "medium",
      risk_level: "medium",
      regulatory_sensitivity: "medium",
      confidence: 0.78,
      reason_for_extraction: "Implied softer experiential stress outcome from hormone wording.",
      suggested_review_status: "operator_review",
    },
  ],
  implied_claims_policy_applied: true,
  notes: "High-recall extraction applied.",
  cost_report: { reported_by_mind: true, summary: "Extraction complete." },
};

const RISK_BRIEF_JSON = {
  contract_version: "mind_claim_risk_brief_json_v1",
  claim_text: "Magnesium helps reduce stress",
  source_context: "Spa ritual copy",
  search_capability_statement: "PubMed search performed for magnesium evidence categories.",
  searches_performed: [
    {
      source: "PubMed",
      query: "magnesium stress oral",
      date_performed: "2026-06-24",
      results_summary: "Oral magnesium stress studies found.",
    },
  ],
  evidence_found: [
    {
      title: "Oral magnesium and stress",
      authors: "Smith et al.",
      journal: "Nutrients",
      year: "2020",
      pmid: "12345",
      doi: "10.1000/example",
      url: "https://example.com",
      evidence_category: "ingredient",
      relevance_to_claim: "indirect",
      summary: "Oral magnesium evidence.",
    },
  ],
  evidence_not_found: [
    {
      gap: "Topical/transdermal magnesium evidence for spa ritual",
      importance: "Delivery route mismatch risk.",
    },
  ],
  evidence_posture: "weak_indirect",
  evidence_strength: "low",
  risk_level: "medium",
  regulatory_sensitivity: "medium",
  key_evidence_risk_insight:
    "oral magnesium evidence ≠ topical magnesium evidence ≠ branded ritual evidence",
  safer_wording: "A relaxing spa ritual designed for calm and rest.",
  operator_recommendation: "soften",
  limitations: "Branded ritual evidence sparse.",
  cost_report: {
    reported_by_mind: true,
    summary: "1 search",
    search_count: 1,
    abstracts_fetched: 3,
  },
};

describe("mind-json-parser", () => {
  it("strips markdown JSON fences", () => {
    const fenced = "```json\n{\"a\":1}\n```";
    expect(stripMarkdownJsonFences(fenced)).toBe('{"a":1}');
  });

  it("extracts first valid JSON object", () => {
    const text = 'prefix {"contract_version":"x","ok":true} suffix';
    expect(extractFirstJsonObject(text)).toBe('{"contract_version":"x","ok":true}');
  });
});

describe("mind claim extraction contract", () => {
  it("parses extraction JSON success", () => {
    const result = parseMindClaimExtractionResponse(JSON.stringify(MAGNESIUM_EXTRACTION_JSON));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.claims).toHaveLength(6);
    }
  });

  it("rejects malformed JSON", () => {
    const result = parseMindClaimExtractionResponse('{ "contract_version": "x", "broken": }');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("malformed_json");
    }
  });

  it("parses markdown-fenced JSON", () => {
    const result = parseMindClaimExtractionResponse(
      "```json\n" + JSON.stringify(MAGNESIUM_EXTRACTION_JSON) + "\n```"
    );
    expect(result.ok).toBe(true);
  });

  it("rejects wrong contract_version", () => {
    const result = parseMindClaimExtractionResponse(
      JSON.stringify({ ...MAGNESIUM_EXTRACTION_JSON, contract_version: "wrong_v9" })
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("wrong_contract_version");
    }
  });

  it("parses C1-C6 magnesium extraction claims", () => {
    const result = parseMindClaimExtractionResponse(JSON.stringify(MAGNESIUM_EXTRACTION_JSON));
    expect(result.ok).toBe(true);
    if (result.ok) {
      const ids = result.data.claims.map((claim) => claim.external_claim_id);
      expect(ids).toEqual(["C1", "C2", "C3", "C4", "C5", "C6"]);
      expect(result.data.claims[0]?.claim_text).toBe("deeply relaxing treatment");
      expect(result.data.claims[5]?.claim_text).toBe("reduces stress");
    }
  });

  it("includes extraction doctrine in prompt", () => {
    const prompt = buildMindClaimExtractionPrompt({ sourceText: MAGNESIUM_FIXTURE_TEXT });
    expect(prompt).toContain("Mechanism test");
    expect(prompt).toContain("mind_claim_extraction_json_v1");
    expect(prompt).toContain(MAGNESIUM_FIXTURE_TEXT);
  });
});

describe("mind claim risk brief contract", () => {
  it("parses risk brief JSON success", () => {
    const result = parseMindClaimRiskBriefResponse(JSON.stringify(RISK_BRIEF_JSON));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.key_evidence_risk_insight).toContain(
        "oral magnesium evidence ≠ topical magnesium evidence"
      );
      expect(result.data.pmids).toEqual(["12345"]);
    }
  });

  it("rejects malformed risk brief JSON", () => {
    const result = parseMindClaimRiskBriefResponse("[]");
    expect(result.ok).toBe(false);
  });

  it("includes magnesium/spa evidence distinction in prompt", () => {
    const prompt = buildMindClaimRiskBriefPrompt({
      claimText: "Magnesium helps reduce stress",
      claimFamily: "magnesium_stress",
    });
    expect(prompt).toContain("oral magnesium evidence");
    expect(prompt).toContain("topical/transdermal magnesium evidence");
    expect(prompt).toContain("branded ritual evidence");
  });
});

describe("safe mind text rendering", () => {
  it("escapes HTML and script text safely", () => {
    const unsafe = '<script>alert("xss")</script><b>bold</b>';
    const rendered = renderSafeMindTextBlock(unsafe);
    expect(rendered).not.toContain("<script>");
    expect(rendered).not.toContain("</script>");
    expect(rendered).not.toContain("<b>");
    expect(rendered).toContain("alert");
    expect(escapeMindDisplayText("<")).toBe("&lt;");
  });
});

describe("phase 45 migration", () => {
  it("defines required Phase 45 tables and indexes", () => {
    const sql = readFileSync(
      resolve(
        process.cwd(),
        "supabase/migrations/20260624120000_create_mind_claim_intelligence_phase45.sql"
      ),
      "utf8"
    );

    expect(sql).toContain("source_intake_documents");
    expect(sql).toContain("mind_claim_extraction_jobs");
    expect(sql).toContain("candidate_claims");
    expect(sql).toContain("mind_claim_risk_brief_jobs");
    expect(sql).toContain("mind_claim_risk_briefs");
    expect(sql).toContain("mind_claim_intelligence_audit_events");
    expect(sql).toContain("mind_claim_extraction_jobs_review_status_check");
    expect(sql).toContain("candidate_claims_review_status_check");
  });
});
