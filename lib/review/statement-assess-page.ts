import type { ReviewQueueAccessContext } from "@/lib/operator-auth";
import { parseClaimsExtractPageWorkspaceId } from "@/lib/review/claims-extract-page";
import { isClaimExtractionPersistenceConfigured } from "@/lib/watch/claim-extraction-store";
import { isClaimResearchPersistenceConfigured } from "@/lib/watch/claim-research-store";
import { isWellnessClaimsPersistenceConfigured } from "@/lib/watch/wellness-claims-store";

export type StatementAssessPageData = {
  configured: boolean;
  defaultWorkspaceId: string;
  persistenceErrorMessage: string | null;
};

export async function buildStatementAssessPageData(
  params: Record<string, string | string[] | undefined>,
  access: ReviewQueueAccessContext
): Promise<StatementAssessPageData> {
  const defaultWorkspaceId = parseClaimsExtractPageWorkspaceId(params, access);
  const configured =
    isClaimExtractionPersistenceConfigured() &&
    isWellnessClaimsPersistenceConfigured() &&
    isClaimResearchPersistenceConfigured();

  return {
    configured,
    defaultWorkspaceId,
    persistenceErrorMessage: configured
      ? null
      : "Claim assessment is not fully configured in this environment.",
  };
}
