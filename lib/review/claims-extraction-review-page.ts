import type { ReviewQueueAccessContext } from "@/lib/operator-auth";
import { getClaimExtractionById, isClaimExtractionPersistenceConfigured } from "@/lib/watch/claim-extraction-store";
import type { PrivacySafeCandidateWellnessClaim } from "@/lib/watch/claim-extraction-store";

export type ClaimsExtractionReviewPageData = {
  configured: boolean;
  extractionId: string;
  sourceTitle: string | null;
  sourceType: string | null;
  extractionStatus: string | null;
  candidateCount: number;
  sourceText: string | null;
  candidateClaims: PrivacySafeCandidateWellnessClaim[];
  detailError: string | null;
  detailErrorMessage: string | null;
};

export async function buildClaimsExtractionReviewPageData(
  extractionId: string,
  access: ReviewQueueAccessContext
): Promise<ClaimsExtractionReviewPageData> {
  const configured = isClaimExtractionPersistenceConfigured();
  const detail = configured
    ? await getClaimExtractionById(extractionId, access)
    : {
        extraction: null,
        source_document: null,
        candidate_claims: [],
        error: "supabase_not_configured" as const,
      };

  const detailError = detail.error ?? (detail.extraction ? null : "extraction_not_found");

  return {
    configured,
    extractionId,
    sourceTitle: detail.source_document?.title ?? null,
    sourceType: detail.source_document?.source_type ?? null,
    extractionStatus: detail.extraction?.status ?? null,
    candidateCount: detail.candidate_claims.length,
    sourceText: detail.source_document?.source_text ?? null,
    candidateClaims: detail.candidate_claims,
    detailError,
    detailErrorMessage:
      detail.error === "supabase_not_configured"
        ? "Claim extraction persistence is not configured."
        : detail.error === "forbidden"
          ? "You do not have access to this extraction run."
          : !detail.extraction
            ? "Extraction run not found."
            : detail.error
              ? "Unable to load extraction review data."
              : null,
  };
}
