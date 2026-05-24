import {
  classifyClaim,
  humanReviewRequired,
  type ClaimAnalysis,
  type ClaimType,
} from "./claim-classifier";
import {
  EVIDENCE_NOTES,
  PUBMED_EVIDENCE_NOTES,
  getEvidenceStubs,
  type EvidenceNotes,
  type EvidenceSource,
} from "./evidence-stubs";
import { fetchPubMedSources, shouldUsePubMed, buildPubMedReportConfidence } from "./pubmed-retrieval";

export type QueryRequestBody = {
  workspace_id?: string;
  query?: string;
  mode?: string;
  filters?: {
    source_types?: string[];
    recency_years?: number;
    max_sources?: number;
    use_real_pubmed?: boolean;
  };
  context?: string;
};

export type QueryResponse = {
  report_id: string;
  generated_at: string;
  report_status: "preliminary";
  workspace_id: string;
  query: string;
  claim_analysis: ClaimAnalysis;
  evidence_summary: {
    overall_conclusion: string;
    effect_direction: "mixed" | "unclear" | "supportive";
  };
  evidence_grade: {
    overall: "low";
    rationale: string;
  };
  risk_assessment: {
    overall_risk_score: number;
    risk_level: "low" | "medium" | "high";
    risk_flags: Array<{
      flag: string;
      severity: "low" | "medium" | "high";
      trigger: string;
    }>;
  };
  sources: EvidenceSource[];
  evidence_notes: EvidenceNotes;
  report_confidence: ReportConfidence;
  recommended_wording: {
    safer_claim: string;
    avoid: string;
  };
  lucient_meta: {
    cached: false;
    last_updated: string;
    engine: string;
    privacy_note: string;
    pubmed_fetch_status: PubMedFetchStatus;
  };
};

export type ReportConfidence = {
  overall: "low" | "medium" | "high";
  score: number;
  rationale: string;
};

export type PubMedFetchStatus =
  | "success"
  | "failed_fallback_to_stub"
  | "not_requested";

const STUB_REPORT_CONFIDENCE: ReportConfidence = {
  overall: "low",
  score: 0.25,
  rationale:
    "POC evidence stubs only; no real PubMed retrieval was performed for this response.",
};

const FALLBACK_REPORT_CONFIDENCE: ReportConfidence = {
  overall: "low",
  score: 0.2,
  rationale:
    "PubMed retrieval was requested but failed or returned no records; response fell back to POC evidence stubs.",
};

type ClaimContent = {
  evidence_summary: QueryResponse["evidence_summary"];
  evidence_grade: QueryResponse["evidence_grade"];
  risk_assessment: QueryResponse["risk_assessment"];
  recommended_wording: QueryResponse["recommended_wording"];
};

const CLAIM_CONTENT: Record<ClaimType, ClaimContent> = {
  detox: {
    evidence_summary: {
      overall_conclusion:
        "Detoxification claims imply measurable removal of toxins from the body. Evidence for spa or wellness treatments achieving this is limited; such claims typically require specific substantiation.",
      effect_direction: "unclear",
    },
    evidence_grade: {
      overall: "low",
      rationale:
        "POC placeholder — detox claims are high-scrutiny and not supported by this demo output.",
    },
    risk_assessment: {
      overall_risk_score: 72,
      risk_level: "high",
      risk_flags: [
        {
          flag: "detox_claim",
          severity: "high",
          trigger: "detoxification",
        },
        {
          flag: "unverified_elimination_claim",
          severity: "high",
          trigger: "body detox",
        },
      ],
    },
    recommended_wording: {
      safer_claim:
        "This experience may support a sense of refreshment as part of a balanced wellness routine.",
      avoid: "This treatment detoxifies the body.",
    },
  },
  immunity: {
    evidence_summary: {
      overall_conclusion:
        "Immune-boosting claims suggest measurable changes to immune function. Wellness treatments rarely have direct clinical evidence for immunity enhancement without specific substantiation.",
      effect_direction: "unclear",
    },
    evidence_grade: {
      overall: "low",
      rationale:
        "POC placeholder — immunity claims require disease-prevention or health-outcome evidence not provided here.",
    },
    risk_assessment: {
      overall_risk_score: 58,
      risk_level: "medium",
      risk_flags: [
        {
          flag: "immune_claim",
          severity: "medium",
          trigger: "boosts immunity",
        },
        {
          flag: "needs_specific_substantiation",
          severity: "medium",
          trigger: "immune system enhancement",
        },
      ],
    },
    recommended_wording: {
      safer_claim:
        "This experience may contribute to general wellbeing as part of a healthy lifestyle.",
      avoid: "This massage boosts immunity.",
    },
  },
  inflammation: {
    evidence_summary: {
      overall_conclusion:
        "Anti-inflammatory claims imply measurable reduction in inflammation. Without clinical biomarker evidence tied to the specific treatment, such claims carry regulatory and substantiation risk.",
      effect_direction: "mixed",
    },
    evidence_grade: {
      overall: "low",
      rationale:
        "POC placeholder — inflammation outcomes require specific clinical evidence not simulated here.",
    },
    risk_assessment: {
      overall_risk_score: 55,
      risk_level: "medium",
      risk_flags: [
        {
          flag: "inflammation_claim",
          severity: "medium",
          trigger: "reduces inflammation",
        },
        {
          flag: "physiological_claim",
          severity: "medium",
          trigger: "anti-inflammatory effect",
        },
      ],
    },
    recommended_wording: {
      safer_claim:
        "This ritual may support a sense of comfort and relaxation as part of a wellness routine.",
      avoid: "This ritual reduces inflammation.",
    },
  },
  cortisol_hormone: {
    evidence_summary: {
      overall_conclusion:
        "Preliminary evidence suggests some wellness modalities may be associated with stress physiology, but claims about direct cortisol or hormone regulation should be worded cautiously unless supported by specific evidence.",
      effect_direction: "mixed",
    },
    evidence_grade: {
      overall: "low",
      rationale:
        "POC placeholder — hormone regulation claims require specific substantiation not provided here.",
    },
    risk_assessment: {
      overall_risk_score: 45,
      risk_level: "medium",
      risk_flags: [
        {
          flag: "physiological_claim",
          severity: "medium",
          trigger: "cortisol regulation",
        },
        {
          flag: "needs_specific_substantiation",
          severity: "medium",
          trigger: "direct hormone regulation claim",
        },
      ],
    },
    recommended_wording: {
      safer_claim:
        "This experience may support relaxation and general wellbeing as part of a balanced wellness routine.",
      avoid: "This treatment regulates cortisol.",
    },
  },
  anti_aging: {
    evidence_summary: {
      overall_conclusion:
        "Anti-aging and biological-age reversal claims imply measurable physiological change. Such claims are high-scrutiny and typically require robust clinical substantiation not available in this POC.",
      effect_direction: "unclear",
    },
    evidence_grade: {
      overall: "low",
      rationale:
        "POC placeholder — aging-reversal claims require strong clinical evidence not simulated here.",
    },
    risk_assessment: {
      overall_risk_score: 68,
      risk_level: "high",
      risk_flags: [
        {
          flag: "anti_aging_claim",
          severity: "high",
          trigger: "reverses biological aging",
        },
        {
          flag: "needs_specific_substantiation",
          severity: "high",
          trigger: "biological age reversal",
        },
      ],
    },
    recommended_wording: {
      safer_claim:
        "This program may support a refreshed appearance and sense of vitality as part of a wellness routine.",
      avoid: "This program reverses biological aging.",
    },
  },
  pain_relief: {
    evidence_summary: {
      overall_conclusion:
        "Pain relief claims imply measurable reduction in pain. Without condition-specific clinical evidence, such claims may require careful wording and substantiation.",
      effect_direction: "mixed",
    },
    evidence_grade: {
      overall: "low",
      rationale:
        "POC placeholder — pain outcomes require condition-specific evidence not provided here.",
    },
    risk_assessment: {
      overall_risk_score: 52,
      risk_level: "medium",
      risk_flags: [
        {
          flag: "pain_claim",
          severity: "medium",
          trigger: "pain relief",
        },
        {
          flag: "needs_specific_substantiation",
          severity: "medium",
          trigger: "therapeutic pain outcome",
        },
      ],
    },
    recommended_wording: {
      safer_claim:
        "This treatment may help guests feel more comfortable and at ease.",
      avoid: "This treatment relieves pain.",
    },
  },
  sleep: {
    evidence_summary: {
      overall_conclusion:
        "Sleep-related claims suggest measurable improvement in sleep quality or duration. Wellness treatments may support relaxation, but direct sleep outcome claims need specific evidence.",
      effect_direction: "mixed",
    },
    evidence_grade: {
      overall: "low",
      rationale:
        "POC placeholder — sleep outcome claims require specific substantiation not simulated here.",
    },
    risk_assessment: {
      overall_risk_score: 48,
      risk_level: "medium",
      risk_flags: [
        {
          flag: "sleep_claim",
          severity: "medium",
          trigger: "sleep quality",
        },
        {
          flag: "needs_specific_substantiation",
          severity: "medium",
          trigger: "sleep outcome claim",
        },
      ],
    },
    recommended_wording: {
      safer_claim:
        "This experience may support relaxation, which some guests find helpful as part of a bedtime routine.",
      avoid: "This treatment improves sleep.",
    },
  },
  stress_relaxation: {
    evidence_summary: {
      overall_conclusion:
        "Stress and relaxation claims are common in wellness contexts. Experiential language about feeling relaxed is generally lower risk than claims about measurable stress biomarkers.",
      effect_direction: "supportive",
    },
    evidence_grade: {
      overall: "low",
      rationale:
        "POC placeholder — experiential relaxation claims are lower risk but still benefit from careful wording.",
    },
    risk_assessment: {
      overall_risk_score: 32,
      risk_level: "low",
      risk_flags: [
        {
          flag: "stress_claim",
          severity: "low",
          trigger: "stress reduction",
        },
      ],
    },
    recommended_wording: {
      safer_claim:
        "This treatment supports relaxation and helps guests feel restored.",
      avoid: "This treatment reduces stress hormones.",
    },
  },
  experiential_wellness: {
    evidence_summary: {
      overall_conclusion:
        "Experiential wellness language describing how guests may feel is generally lower risk when it avoids measurable health outcomes or disease-related claims.",
      effect_direction: "supportive",
    },
    evidence_grade: {
      overall: "low",
      rationale:
        "POC placeholder — experiential wellbeing language is suitable for cautious marketing with minimal substantiation burden.",
    },
    risk_assessment: {
      overall_risk_score: 18,
      risk_level: "low",
      risk_flags: [],
    },
    recommended_wording: {
      safer_claim:
        "This treatment supports relaxation and helps guests feel restored.",
      avoid: "This treatment cures or treats any health condition.",
    },
  },
  general: {
    evidence_summary: {
      overall_conclusion:
        "No specific high-risk claim pattern was detected. Review wording to ensure claims remain experiential and do not imply measurable health outcomes without substantiation.",
      effect_direction: "unclear",
    },
    evidence_grade: {
      overall: "low",
      rationale:
        "POC placeholder — unclassified queries default to cautious general guidance.",
    },
    risk_assessment: {
      overall_risk_score: 35,
      risk_level: "medium",
      risk_flags: [
        {
          flag: "unclassified_claim",
          severity: "medium",
          trigger: "query text",
        },
      ],
    },
    recommended_wording: {
      safer_claim:
        "This experience may support general wellbeing as part of a balanced wellness routine.",
      avoid: "Making specific measurable health outcome claims without evidence.",
    },
  },
};

export async function buildQueryResponse(
  workspaceId: string,
  query: string,
  filters?: QueryRequestBody["filters"]
): Promise<QueryResponse> {
  const now = new Date().toISOString();
  const reportId = `${workspaceId}-${Date.now()}`;
  const classification = classifyClaim(query);
  const content = CLAIM_CONTENT[classification.claim_type];
  const claim_analysis: ClaimAnalysis = {
    ...classification,
    human_review_required: humanReviewRequired(content.risk_assessment.risk_level),
  };

  let sources = getEvidenceStubs(classification.claim_type, filters?.max_sources);
  let evidence_notes: EvidenceNotes = EVIDENCE_NOTES;
  let report_confidence: ReportConfidence = STUB_REPORT_CONFIDENCE;
  let pubmed_fetch_status: PubMedFetchStatus = "not_requested";

  if (shouldUsePubMed(filters)) {
    try {
      const pubmedSources = await fetchPubMedSources(
        query,
        filters?.max_sources,
        filters?.recency_years
      );

      if (pubmedSources.length > 0) {
        sources = pubmedSources;
        evidence_notes = PUBMED_EVIDENCE_NOTES;
        report_confidence = buildPubMedReportConfidence(pubmedSources);
        pubmed_fetch_status = "success";
      } else {
        pubmed_fetch_status = "failed_fallback_to_stub";
        report_confidence = FALLBACK_REPORT_CONFIDENCE;
      }
    } catch {
      pubmed_fetch_status = "failed_fallback_to_stub";
      report_confidence = FALLBACK_REPORT_CONFIDENCE;
    }
  }

  return {
    report_id: reportId,
    generated_at: now,
    report_status: "preliminary",
    workspace_id: workspaceId,
    query,
    claim_analysis,
    ...content,
    sources,
    evidence_notes,
    report_confidence,
    lucient_meta: {
      cached: false,
      last_updated: now,
      engine: "Lucient EIE POC",
      privacy_note: "Demo workspace only. No real client-private data.",
      pubmed_fetch_status,
    },
  };
}
