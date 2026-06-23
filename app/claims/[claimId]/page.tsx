import { redirect } from "next/navigation";

import { resolveReviewQueuePageAccess } from "@/lib/operator-auth";
import { buildClaimDetailPageData } from "@/lib/review/claims-detail-page";
import { buildReviewQueueAuthPanelData } from "@/lib/review/review-queue-auth-status";
import { getSupabaseAuthUser } from "@/lib/supabase/auth-server";

import { ReviewItemsAccessBlocked } from "../../review-items/review-items-access-blocked";
import { ClaimDetailView } from "./claim-detail-view";

export const dynamic = "force-dynamic";

type ClaimDetailPageProps = {
  params: Promise<{ claimId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ClaimDetailPage({ params, searchParams }: ClaimDetailPageProps) {
  const { claimId } = await params;
  const queryParams = await searchParams;
  const access = await resolveReviewQueuePageAccess(queryParams);

  if (access.status === "redirect") {
    redirect(access.path);
  }

  if (access.status === "blocked") {
    return <ReviewItemsAccessBlocked showLoginLink={access.showLoginLink} />;
  }

  const pageData = await buildClaimDetailPageData(claimId, access.access);
  const operatorEmail =
    access.access.mode === "operator" ? (await getSupabaseAuthUser())?.email : null;
  const authStatus = buildReviewQueueAuthPanelData(access.access, operatorEmail);

  return <ClaimDetailView pageData={pageData} authStatus={authStatus} />;
}
