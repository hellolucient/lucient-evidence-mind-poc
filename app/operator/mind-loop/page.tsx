import { redirect } from "next/navigation";

import { resolveReviewQueuePageAccess } from "@/lib/operator-auth";
import { buildMindLoopPageData } from "@/lib/review/mind-loop-page";
import { buildReviewQueueAuthPanelData } from "@/lib/review/review-queue-auth-status";
import { getSupabaseAuthUser } from "@/lib/supabase/auth-server";

import { ReviewItemsAccessBlocked } from "../../review-items/review-items-access-blocked";
import { MindLoopDashboard } from "./mind-loop-dashboard";

export const dynamic = "force-dynamic";

type MindLoopPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Phase 42A — read-only Mind Loop operator dashboard.
 *
 * SAFETY: This page displays durable loop status only. It must not trigger send,
 * auto-send, retry, or live HelloMinds fetch. EXTERNAL_MIND_LIVE_SEND is not required.
 */
export default async function MindLoopPage({ searchParams }: MindLoopPageProps) {
  const params = await searchParams;
  const access = await resolveReviewQueuePageAccess(params);

  if (access.status === "redirect") {
    redirect(access.path);
  }

  if (access.status === "blocked") {
    return <ReviewItemsAccessBlocked showLoginLink={access.showLoginLink} />;
  }

  const pageData = await buildMindLoopPageData(params, access.access);
  const operatorEmail =
    access.access.mode === "operator" ? (await getSupabaseAuthUser())?.email : null;
  const authStatus = buildReviewQueueAuthPanelData(access.access, operatorEmail);

  return <MindLoopDashboard pageData={pageData} authStatus={authStatus} />;
}
