import { redirect } from "next/navigation";

import { resolveReviewQueuePageAccess } from "@/lib/operator-auth";
import { buildClientClaimsPageData } from "@/lib/review/client-claims-page";
import { buildReviewQueueAuthPanelData } from "@/lib/review/review-queue-auth-status";
import { getSupabaseAuthUser } from "@/lib/supabase/auth-server";

import { ReviewItemsAccessBlocked } from "../review-items/review-items-access-blocked";
import { ClientClaimsView } from "./client-claims-view";

export const dynamic = "force-dynamic";

type ClientClaimsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ClientClaimsPage({ searchParams }: ClientClaimsPageProps) {
  const params = await searchParams;
  const access = await resolveReviewQueuePageAccess(params);

  if (access.status === "redirect") {
    redirect(access.path);
  }

  if (access.status === "blocked") {
    return <ReviewItemsAccessBlocked showLoginLink={access.showLoginLink} />;
  }

  const pageData = await buildClientClaimsPageData(params, access.access);
  const operatorEmail =
    access.access.mode === "operator" ? (await getSupabaseAuthUser())?.email : null;
  const authStatus = buildReviewQueueAuthPanelData(access.access, operatorEmail);

  return <ClientClaimsView pageData={pageData} authStatus={authStatus} />;
}
