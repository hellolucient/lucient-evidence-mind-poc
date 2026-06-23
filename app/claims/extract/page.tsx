import { redirect } from "next/navigation";

import { resolveReviewQueuePageAccess } from "@/lib/operator-auth";
import { buildClaimsExtractPageData } from "@/lib/review/claims-extract-page";
import { buildReviewQueueAuthPanelData } from "@/lib/review/review-queue-auth-status";
import { getSupabaseAuthUser } from "@/lib/supabase/auth-server";

import { ReviewItemsAccessBlocked } from "../../review-items/review-items-access-blocked";
import { ClaimsExtractView } from "./claims-extract-view";

export const dynamic = "force-dynamic";

type ClaimsExtractPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ClaimsExtractPage({ searchParams }: ClaimsExtractPageProps) {
  const params = await searchParams;
  const access = await resolveReviewQueuePageAccess(params);

  if (access.status === "redirect") {
    redirect(access.path);
  }

  if (access.status === "blocked") {
    return <ReviewItemsAccessBlocked showLoginLink={access.showLoginLink} />;
  }

  const pageData = await buildClaimsExtractPageData(params, access.access);
  const operatorEmail =
    access.access.mode === "operator" ? (await getSupabaseAuthUser())?.email : null;
  const authStatus = buildReviewQueueAuthPanelData(access.access, operatorEmail);

  return <ClaimsExtractView pageData={pageData} authStatus={authStatus} />;
}
