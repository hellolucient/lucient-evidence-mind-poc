import { redirect } from "next/navigation";

import { resolveReviewQueuePageAccess } from "@/lib/operator-auth";
import { buildClaimsRegistryPageData } from "@/lib/review/claims-registry-page";
import { buildReviewQueueAuthPanelData } from "@/lib/review/review-queue-auth-status";
import { getSupabaseAuthUser } from "@/lib/supabase/auth-server";

import { ReviewItemsAccessBlocked } from "../review-items/review-items-access-blocked";
import { ClaimsRegistryView } from "./claims-registry-view";

export const dynamic = "force-dynamic";

type ClaimsRegistryPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ClaimsRegistryPage({ searchParams }: ClaimsRegistryPageProps) {
  const params = await searchParams;
  const access = await resolveReviewQueuePageAccess(params);

  if (access.status === "redirect") {
    redirect(access.path);
  }

  if (access.status === "blocked") {
    return <ReviewItemsAccessBlocked showLoginLink={access.showLoginLink} />;
  }

  const pageData = await buildClaimsRegistryPageData(params, access.access);
  const operatorEmail =
    access.access.mode === "operator" ? (await getSupabaseAuthUser())?.email : null;
  const authStatus = buildReviewQueueAuthPanelData(access.access, operatorEmail);

  return <ClaimsRegistryView pageData={pageData} authStatus={authStatus} />;
}
