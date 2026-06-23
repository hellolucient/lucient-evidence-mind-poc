import { redirect } from "next/navigation";

import { resolveReviewQueuePageAccess } from "@/lib/operator-auth";
import { buildClaimsExtractionReviewPageData } from "@/lib/review/claims-extraction-review-page";
import { buildReviewQueueAuthPanelData } from "@/lib/review/review-queue-auth-status";
import { getSupabaseAuthUser } from "@/lib/supabase/auth-server";

import { ReviewItemsAccessBlocked } from "../../../review-items/review-items-access-blocked";
import { ClaimsExtractionReviewView } from "./claims-extraction-review-view";

export const dynamic = "force-dynamic";

type ClaimsExtractionReviewPageProps = {
  params: Promise<{ extractionId: string }>;
};

export default async function ClaimsExtractionReviewPage({
  params,
}: ClaimsExtractionReviewPageProps) {
  const routeParams = await params;
  const access = await resolveReviewQueuePageAccess({});

  if (access.status === "redirect") {
    redirect(access.path);
  }

  if (access.status === "blocked") {
    return <ReviewItemsAccessBlocked showLoginLink={access.showLoginLink} />;
  }

  const pageData = await buildClaimsExtractionReviewPageData(
    routeParams.extractionId,
    access.access
  );
  const operatorEmail =
    access.access.mode === "operator" ? (await getSupabaseAuthUser())?.email : null;
  const authStatus = buildReviewQueueAuthPanelData(access.access, operatorEmail);

  return <ClaimsExtractionReviewView pageData={pageData} authStatus={authStatus} />;
}
