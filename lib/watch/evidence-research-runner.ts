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
import { buildPubMedQueryForClaim } from "@/lib/review/claim-pubmed-query";
import { fetchPubMedCitationMetadata } from "@/lib/pubmed-retrieval";
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

function isPubMedLiveEnabled(): boolean {
  // Explicit enable only. Avoid accidental network calls in test/CI.
  return process.env.PUBMED_LIVE_ENABLED === "true";
}

function inferEvidenceTypeFromTitle(title: string): ClaimCitationEvidenceType | null {
  const normalized = title.toLowerCase();
  if (normalized.includes("systematic review") || normalized.includes("meta-analysis")) {
    return "systematic_review";
  }
  if (normalized.includes("randomized") || normalized.includes("randomised")) {
    return "rct";
  }
  if (normalized.includes("clinical trial")) {
    return "clinical_trial";
  }
  if (normalized.includes("review")) {
    return "review";
  }
  return "unknown";
}

function relevanceForRank(rank: number): ClaimCitationRelevance {
  if (rank <= 2) {
    return "high";
  }
  if (rank <= 5) {
    return "medium";
  }
  return "low";
}

function classifyEvidenceFromCitations(
  claim: PrivacySafeWellnessClaim,
  citations: ControlledResearchCitation[]
): Pick<
  ControlledResearchResult,
  "evidence_posture" | "evidence_strength" | "risk_level" | "risk_score"
> {
  if (citations.length === 0) {
    return {
      evidence_posture: "not_found",
      evidence_strength: "very_low",
      risk_level: claim.evidence_sensitivity === "high" ? "high" : "medium",
      risk_score: claim.evidence_sensitivity === "high" ? 85 : 70,
    };
  }

  const hasHighRelevance = citations.some((c) => c.relevance === "high");
  const hasSystematic = citations.some((c) => c.evidence_type === "systematic_review");
  const hasRct = citations.some((c) => c.evidence_type === "rct" || c.evidence_type === "clinical_trial");
  const posture: ClaimEvidencePosture =
    hasSystematic || hasRct ? (hasHighRelevance ? "mixed" : "weak") : "insufficient";

  const strength: ClaimEvidenceStrength =
    hasSystematic && hasHighRelevance
      ? "moderate"
      : hasRct
        ? "low"
        : "very_low";

  // Conservative risk defaults: higher risk for high-sensitivity physiological claims unless strong direct evidence.
  const baseRisk =
    claim.evidence_sensitivity === "high"
      ? 80
      : claim.evidence_sensitivity === "medium"
        ? 60
        : 40;
  const riskDelta = hasSystematic && hasHighRelevance ? -15 : hasRct ? -8 : 0;
  const score = Math.max(15, Math.min(95, baseRisk + riskDelta));
  const risk_level: ClaimResearchRiskLevel = score >= 75 ? "high" : score >= 45 ? "medium" : "low";

  return {
    evidence_posture: posture,
    evidence_strength: strength,
    risk_level,
    risk_score: score,
  };
}

function buildSaferWording(claim: PrivacySafeWellnessClaim): string {
  switch (claim.claim_family) {
    case "sleep_support":
      return "May support relaxation and healthy sleep routines.";
    case "stress_reduction":
    case "nervous_system_calm":
      return "May support relaxation as part of a healthy routine.";
    case "stress_hormone_balance":
    case "cortisol":
      return "May help support stress management as part of a healthy routine.";
    case "inflammation":
      return "May support overall wellness as part of a healthy lifestyle.";
    case "immunity":
      return "May support overall wellness and healthy immune function.";
    case "circulation":
      return "May support comfort and overall wellness as part of a healthy routine.";
    case "recovery":
      return "May support recovery and comfort after exercise as part of a healthy routine.";
    case "pain_relief":
      return "May help support comfort as part of a healthy routine.";
    case "skin_barrier":
      return "May support healthy-looking skin and skin barrier comfort.";
    case "collagen_support":
      return "May support healthy-looking skin as part of a healthy routine.";
    default:
      return `Consider softer wording around "${claim.claim_text}".`;
  }
}

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

export async function runControlledClaimResearch(
  claim: PrivacySafeWellnessClaim
): Promise<ControlledResearchOutput> {
  if (!claim.claim_text?.trim()) {
    return { ok: false, error_message: "claim_text_missing" };
  }

  if (isPubMedLiveEnabled()) {
    const query = buildPubMedQueryForClaim(claim);

    try {
      const metadata = await fetchPubMedCitationMetadata(query.query_text, {
        maxResults: 7,
        recencyYears: 10,
      });

      const citations: ControlledResearchCitation[] = metadata.map((item, index) => ({
        title: item.title,
        source: item.journal ?? "PubMed",
        url: item.url,
        publication_year: item.publication_year,
        evidence_type: inferEvidenceTypeFromTitle(item.title),
        relevance: relevanceForRank(index + 1),
        summary: null,
      }));

      const classification = classifyEvidenceFromCitations(claim, citations);
      const safer_wording = buildSaferWording(claim);

      return {
        ok: true,
        research_mode: "pubmed_live_v1",
        query_text: query.query_text,
        ...classification,
        summary:
          citations.length === 0
            ? "No relevant PubMed results were found for this claim query. Avoid strong physiological wording until a targeted review can be performed."
            : "PubMed citations were retrieved and conservatively summarized. Evidence may be population-specific or mixed; avoid overstating effects or attributing ingredient evidence to a branded spa treatment.",
        safer_wording,
        research_notes:
          citations.length === 0
            ? "PubMed live mode (pubmed_live_v1): search executed but returned no results."
            : "PubMed live mode (pubmed_live_v1): bounded esearch + esummary retrieval; stored citations are summarized metadata only (no raw payloads).",
        citations,
      };
    } catch {
      const fallback = isSupportsDeepSleepDemoClaim(claim)
        ? buildSleepSupportDemoResearch(claim)
        : buildGenericDemoResearch(claim);

      return {
        ...fallback,
        research_notes:
          "PubMed live mode (pubmed_live_v1) failed; fell back to controlled demo mode (mock_evidence_v1). Not live PubMed retrieval.",
      };
    }
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
