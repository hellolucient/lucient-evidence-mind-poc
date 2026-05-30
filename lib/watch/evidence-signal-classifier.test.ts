import { describe, expect, it } from "vitest";

import {
  classifyEvidenceCandidate,
  classifyEvidenceSources,
} from "./evidence-signal-classifier";

const CLAIM_FAMILY = "magnesium_cortisol_stress";

describe("evidence-signal-classifier", () => {
  it("classifies incidental magnesium mention as irrelevant noise or monitor only", () => {
    const result = classifyEvidenceCandidate({
      claim_family_id: CLAIM_FAMILY,
      external_id: "noise-1",
      title: "Electrolyte transport in endurance athletes",
      abstract:
        "Serum electrolytes including magnesium were reported alongside cortisol measurements in background analyses.",
    });

    expect(["irrelevant_noise", "monitor_only"]).toContain(result.signal);
    expect(result.contributes_to_evidence_delta).toBe(false);
    expect(result.reason_codes).toContain("MAGNESIUM_CORTISOL_V1_RULES");
  });

  it("classifies sweat biomarker cortisol without magnesium intervention as monitor only or irrelevant noise", () => {
    const result = classifyEvidenceCandidate({
      claim_family_id: CLAIM_FAMILY,
      external_id: "sweat-1",
      title: "Salivary cortisol in sweat during exercise",
      abstract:
        "We measured cortisol in sweat samples from athletes during prolonged exercise sessions.",
    });

    expect(["monitor_only", "irrelevant_noise"]).toContain(result.signal);
    expect(result.reason_codes).toContain("SWEAT_BIOMARKER_WITHOUT_MG_INTERVENTION");
    expect(result.human_review_required).toBe(false);
  });

  it("classifies direct human RCT-style supportive abstract as human review or strengthen signal", () => {
    const result = classifyEvidenceCandidate({
      claim_family_id: CLAIM_FAMILY,
      external_id: "rct-1",
      title: "Randomized trial of magnesium supplementation in stressed adults",
      abstract:
        "In a randomized, placebo-controlled trial, magnesium supplementation significantly reduced cortisol and improved stress response in human participants.",
    });

    expect(["human_review_required", "strengthens_claim"]).toContain(result.signal);
    expect(result.evidence_direction).toBe("strengthens_support");
    expect(result.reason_codes).toContain("DIRECT_POSITIVE_HUMAN_EVIDENCE");
  });

  it("classifies direct null-effect abstract as weakens claim or monitor only", () => {
    const result = classifyEvidenceCandidate({
      claim_family_id: CLAIM_FAMILY,
      external_id: "null-1",
      title: "Magnesium supplementation and cortisol in adults",
      abstract:
        "In a randomized placebo-controlled trial, magnesium supplementation did not reduce cortisol levels and showed no significant difference versus placebo in human volunteers.",
    });

    expect(["weakens_claim", "monitor_only"]).toContain(result.signal);
    expect(result.evidence_direction).toBe("weakens_support");
    expect(result.reason_codes).toContain("NULL_OR_MIXED_EFFECT");
  });

  it("classifies animal or veterinary-only article as irrelevant noise", () => {
    const result = classifyEvidenceCandidate({
      claim_family_id: CLAIM_FAMILY,
      external_id: "animal-1",
      title: "Serum magnesium and cortisol in dairy goats",
      abstract:
        "Goats in a veterinary herd were studied for magnesium deficiency effects on cortisol.",
    });

    expect(result.signal).toBe("irrelevant_noise");
    expect(result.relevance_gate).toBe("fail");
    expect(result.reason_codes).toContain("ANIMAL_OR_VETERINARY_NOISE");
  });

  it("returns stable reason_codes and confidence for repeated classification", () => {
    const input = {
      claim_family_id: CLAIM_FAMILY,
      external_id: "stable-1",
      title: "Magnesium supplementation reduced cortisol in a randomized human trial",
      abstract:
        "Magnesium supplementation significantly reduced cortisol in stressed human participants.",
    };

    const first = classifyEvidenceCandidate(input);
    const second = classifyEvidenceCandidate(input);

    expect(first.reason_codes).toEqual(second.reason_codes);
    expect(first.confidence).toBe(second.confidence);
    expect(first.signal).toBe(second.signal);
  });

  it("classifies multiple sources independently", () => {
    const results = classifyEvidenceSources(CLAIM_FAMILY, [
      {
        source_id: "pubmed-animal",
        source_type: "pubmed",
        source_rank: 1,
        title: "Cortisol in rats given magnesium",
        url: "https://example.com",
        publication_year: 2024,
        evidence_level: "unknown",
        relevance_to_claim: "indirect",
        supports_claim: "unclear",
        summary: "Rat study",
        meta: { pmid: "1", doi: null, journal: null, publication_date: null, citation: null },
        methodology: {
          study_design: "unknown",
          sample_size: null,
          population: null,
          duration: null,
        },
        analysis: {
          outcomes: [],
          effect_summary: "",
          claim_alignment: "insufficient",
          alignment_confidence: 0.2,
          relevance_score: 0.2,
        },
        study_limitations: [],
        regulatory_flags: [],
        regulatory_context: [],
        abstract: { available: true, text: "Rats were studied.", excerpt: null },
      },
    ]);

    expect(results).toHaveLength(1);
    expect(results[0]?.signal).toBe("irrelevant_noise");
  });
});
