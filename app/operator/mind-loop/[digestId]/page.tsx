import { redirect } from "next/navigation";

import { resolveReviewQueuePageAccess } from "@/lib/operator-auth";
import { buildMindLoopDetailPageData } from "@/lib/review/mind-loop-detail-page";
import { buildReviewQueueAuthPanelData } from "@/lib/review/review-queue-auth-status";
import { getSupabaseAuthUser } from "@/lib/supabase/auth-server";

import { ReviewItemsAccessBlocked } from "../../../review-items/review-items-access-blocked";
import { MindLoopDetail } from "../mind-loop-detail";

export const dynamic = "force-dynamic";

type MindLoopDetailPageProps = {
  params: Promise<{ digestId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Phase 43B — read-only Mind Loop operator detail view.
 *
 * SAFETY: This page displays durable loop status only. It must not trigger send,
 * auto-send, retry, or live HelloMinds fetch. EXTERNAL_MIND_LIVE_SEND is not required.
 */
export default async function MindLoopDetailPage({
  params,
  searchParams,
}: MindLoopDetailPageProps) {
  const { digestId } = await params;
  const queryParams = await searchParams;
  const access = await resolveReviewQueuePageAccess(queryParams);

  if (access.status === "redirect") {
    redirect(access.path);
  }

  if (access.status === "blocked") {
    return <ReviewItemsAccessBlocked showLoginLink={access.showLoginLink} />;
  }

  const pageData = await buildMindLoopDetailPageData(digestId, queryParams, access.access);
  const operatorEmail =
    access.access.mode === "operator" ? (await getSupabaseAuthUser())?.email : null;
  const authStatus = buildReviewQueueAuthPanelData(access.access, operatorEmail);

  return <MindLoopDetail pageData={pageData} authStatus={authStatus} />;
}
