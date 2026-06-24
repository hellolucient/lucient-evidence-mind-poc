import { redirect } from "next/navigation";

import { resolveReviewQueuePageAccess } from "@/lib/operator-auth";
import { buildSourceIntakePageData } from "@/lib/review/source-intake-page";
import { buildReviewQueueAuthPanelData } from "@/lib/review/review-queue-auth-status";
import { getSupabaseAuthUser } from "@/lib/supabase/auth-server";

import { ReviewItemsAccessBlocked } from "../review-items/review-items-access-blocked";
import { SourceIntakeView } from "./source-intake-view";

export const dynamic = "force-dynamic";

type SourceIntakePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SourceIntakePage({ searchParams }: SourceIntakePageProps) {
  const params = await searchParams;
  const access = await resolveReviewQueuePageAccess(params);

  if (access.status === "redirect") {
    redirect(access.path);
  }

  if (access.status === "blocked") {
    return <ReviewItemsAccessBlocked showLoginLink={access.showLoginLink} />;
  }

  const pageData = await buildSourceIntakePageData(params, access.access);
  const operatorEmail =
    access.access.mode === "operator" ? (await getSupabaseAuthUser())?.email : null;
  const authStatus = buildReviewQueueAuthPanelData(access.access, operatorEmail);

  return <SourceIntakeView pageData={pageData} authStatus={authStatus} operatorEmail={operatorEmail} />;
}
