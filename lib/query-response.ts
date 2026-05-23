export type QueryRequestBody = {
  workspace_id?: string;
  query?: string;
  mode?: string;
  filters?: {
    source_types?: string[];
    recency_years?: number;
  };
  context?: string;
};

export type QueryResponse = {
  report_id: string;
  generated_at: string;
  report_status: "preliminary";
  workspace_id: string;
  query: string;
  evidence_summary: {
    overall_conclusion: string;
    effect_direction: "mixed";
  };
  evidence_grade: {
    overall: "low";
    rationale: string;
  };
  risk_assessment: {
    overall_risk_score: number;
    risk_level: "medium";
    risk_flags: Array<{
      flag: string;
      severity: "medium";
      trigger: string;
    }>;
  };
  sources: Array<{
    source_id: string;
    type: string;
    title: string;
    url: string;
    publication_year: number;
  }>;
  recommended_wording: {
    safer_claim: string;
    avoid: string;
  };
  lucient_meta: {
    cached: false;
    last_updated: string;
    engine: string;
    privacy_note: string;
  };
};

export function buildQueryResponse(
  workspaceId: string,
  query: string
): QueryResponse {
  const now = new Date().toISOString();
  const reportId = `${workspaceId}-${Date.now()}`;

  return {
    report_id: reportId,
    generated_at: now,
    report_status: "preliminary",
    workspace_id: workspaceId,
    query,
    evidence_summary: {
      overall_conclusion:
        "Preliminary evidence suggests magnesium may be associated with stress physiology and sleep-related outcomes, but claims about direct cortisol regulation should be worded cautiously unless supported by specific evidence.",
      effect_direction: "mixed",
    },
    evidence_grade: {
      overall: "low",
      rationale:
        "This is a preliminary integration-test response, not a full systematic review.",
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
    sources: [
      {
        source_id: "placeholder-001",
        type: "placeholder",
        title: "Placeholder source for integration test",
        url: "https://example.com",
        publication_year: 2026,
      },
    ],
    recommended_wording: {
      safer_claim:
        "Magnesium may support relaxation and general wellbeing as part of a balanced wellness routine.",
      avoid: "Magnesium regulates cortisol.",
    },
    lucient_meta: {
      cached: false,
      last_updated: now,
      engine: "Lucient EIE POC",
      privacy_note: "Demo workspace only. No real client-private data.",
    },
  };
}
