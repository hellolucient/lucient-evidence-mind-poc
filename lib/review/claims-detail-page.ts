import type { ReviewQueueAccessContext } from "@/lib/operator-auth";
import {
  getClaimResearchRunById,
  isClaimResearchPersistenceConfigured,
  listClaimResearchRuns,
  type PrivacySafeClaimResearchRun,
} from "@/lib/watch/claim-research-store";
import {
  getWellnessClaimById,
  isWellnessClaimsPersistenceConfigured,
  type PrivacySafeWellnessClaim,
} from "@/lib/watch/wellness-claims-store";

export type ClaimDetailPageData = {
  configured: boolean;
  claimId: string;
  claim: PrivacySafeWellnessClaim | null;
  latestResearchRun: PrivacySafeClaimResearchRun | null;
  researchRuns: PrivacySafeClaimResearchRun[];
  detailError: string | null;
  detailErrorMessage: string | null;
};

export async function buildClaimDetailPageData(
  claimId: string,
  access: ReviewQueueAccessContext
): Promise<ClaimDetailPageData> {
  const configured =
    isWellnessClaimsPersistenceConfigured() && isClaimResearchPersistenceConfigured();

  const claimLookup = configured
    ? await getWellnessClaimById(claimId, access)
    : { claim: null, error: "supabase_not_configured" as const };

  const runsResult =
    configured && claimLookup.claim
      ? await listClaimResearchRuns(claimId, access)
      : { runs: [], error: claimLookup.claim ? undefined : claimLookup.error };

  let latestResearchRun: PrivacySafeClaimResearchRun | null = null;
  if (configured && runsResult.runs.length > 0) {
    const latest = runsResult.runs[0];
    const detail = await getClaimResearchRunById(claimId, latest.research_run_id, access);
    latestResearchRun = detail.run ?? latest;
  }

  const detailError =
    claimLookup.error ?? (claimLookup.claim ? null : "claim_not_found");

  return {
    configured,
    claimId,
    claim: claimLookup.claim,
    latestResearchRun,
    researchRuns: runsResult.runs,
    detailError,
    detailErrorMessage:
      claimLookup.error === "supabase_not_configured"
        ? "Claim registry persistence is not configured."
        : claimLookup.error === "forbidden"
          ? "You do not have access to this claim."
          : !claimLookup.claim
            ? "Claim not found."
            : claimLookup.error
              ? "Unable to load claim detail."
              : null,
  };
}
