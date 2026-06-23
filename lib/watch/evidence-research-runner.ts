/**
 * Phase 44C — controlled single-claim evidence research helper.
 *
 * SAFETY: Internal controlled research only.
 * Must not send Mind digests, call HelloMinds send/live-send/retry paths,
 * or require EXTERNAL_MIND_LIVE_SEND.
 */
import type {
  ClaimCitationEvidenceType,
  ClaimCitationRelevance,
  ClaimEvidencePosture,
  ClaimEvidenceStrength,
  ClaimResearchMode,
  ClaimResearchRiskLevel,
} from "@/lib/review/claim-research-constants";
import { DEFAULT_CLAIM_RESEARCH_MODE } from "@/lib/review/claim-research-constants";
import type { PrivacySafeWellnessClaim } from "@/lib/watch/wellness-claims-store";

export type ControlledResearchCitation = {
  title: string;
  source: string;
  url: string | null;
  publication_year: number | null;
  evidence_type: ClaimCitationEvidenceType | null;
  relevance: ClaimCitationRelevance;
  summary: string | null;
};

export type ControlledResearchResult = {
  ok: true;
  research_mode: ClaimResearchMode;
  query_text: string;
  evidence_posture: ClaimEvidencePosture;
  evidence_strength: ClaimEvidenceStrength;
  risk_level: ClaimResearchRiskLevel;
  risk_score: number | null;
  summary: string;
  safer_wording: string;
  research_notes: string | null;
  citations: ControlledResearchCitation[];
};

export type ControlledResearchFailure = {
  ok: false;
  error_message: string;
};

export type ControlledResearchOutput = ControlledResearchResult | ControlledResearchFailure;

function buildSleepSupportDemoResearch(
  claim: PrivacySafeWellnessClaim
): ControlledResearchResult {
  const subject = claim.subject?.trim() || "this treatment";
  const queryText = `${subject} magnesium sleep quality`;

  return {
    ok: true,
    research_mode: "mock_evidence_v1",
    query_text: queryText,
    evidence_posture: "mixed",
    evidence_strength: "low",
    risk_level: "medium",
    risk_score: 55,
    summary:
      "Magnesium may have some evidence related to sleep quality in certain populations, but broad spa-treatment claims should be worded cautiously.",
    safer_wording: "May support relaxation and healthy sleep routines.",
    research_notes:
      "Controlled demo research mode (mock_evidence_v1). Not live PubMed retrieval.",
    citations: [
      {
        title: "Magnesium supplementation and sleep quality: a narrative review (demo placeholder)",
        source: "Demo literature summary",
        url: null,
        publication_year: 2021,
        evidence_type: "review",
        relevance: "medium",
        summary:
          "Reviews suggest magnesium may support sleep in some adults, but evidence quality varies and spa-context claims need careful wording.",
      },
      {
        title: "Dietary magnesium and sleep measures in adults (demo placeholder)",
        source: "Demo observational summary",
        url: null,
        publication_year: 2019,
        evidence_type: "observational",
        relevance: "low",
        summary:
          "Observational associations exist, but they do not directly validate broad treatment marketing claims.",
      },
    ],
  };
}

function buildGenericDemoResearch(claim: PrivacySafeWellnessClaim): ControlledResearchResult {
  const queryText = [claim.subject, claim.predicate, claim.object, claim.claim_text]
    .filter(Boolean)
    .join(" ")
    .trim();

  return {
    ok: true,
    research_mode: DEFAULT_CLAIM_RESEARCH_MODE,
    query_text: queryText || claim.claim_text,
    evidence_posture: "insufficient",
    evidence_strength: "very_low",
    risk_level: claim.evidence_sensitivity === "high" ? "high" : "medium",
    risk_score: claim.evidence_sensitivity === "high" ? 70 : 50,
    summary:
      "No controlled demo evidence profile is available for this claim. Treat marketing language cautiously until targeted literature review is performed.",
    safer_wording: `Consider softer wording around "${claim.claim_text}".`,
    research_notes:
      "Controlled demo research mode (mock_evidence_v1). Not live PubMed retrieval.",
    citations: [],
  };
}

function isSupportsDeepSleepDemoClaim(claim: PrivacySafeWellnessClaim): boolean {
  const normalized = claim.normalized_claim_text.trim().toLowerCase();
  return (
    normalized === "supports deep sleep" ||
    (claim.claim_family === "sleep_support" && normalized.includes("deep sleep"))
  );
}

export function runControlledClaimResearch(claim: PrivacySafeWellnessClaim): ControlledResearchOutput {
  if (!claim.claim_text?.trim()) {
    return { ok: false, error_message: "claim_text_missing" };
  }

  if (isSupportsDeepSleepDemoClaim(claim)) {
    return buildSleepSupportDemoResearch(claim);
  }

  return buildGenericDemoResearch(claim);
}

/**
 * @deprecated Use runControlledClaimResearch. Kept for test mock compatibility.
 */
export function startEvidenceResearchRun(): never {
  throw new Error("startEvidenceResearchRun is not implemented; use runControlledClaimResearch.");
}
