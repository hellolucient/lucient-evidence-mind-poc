import { redirect } from "next/navigation";

import { resolveInternalReviewPageAccess } from "@/lib/internal-review-access";
import { buildReviewQueuePageData } from "@/lib/review/review-queue-ui";

import { ReviewItemsAccessBlocked } from "./review-items-access-blocked";
import { ReviewQueueConsole } from "./review-queue-console";

export const dynamic = "force-dynamic";

type ReviewItemsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ReviewItemsPage({ searchParams }: ReviewItemsPageProps) {
  const params = await searchParams;
  const access = await resolveInternalReviewPageAccess(params);

  if (access.status === "redirect") {
    redirect(access.path);
  }

  if (access.status === "blocked") {
    return <ReviewItemsAccessBlocked />;
  }

  const pageData = await buildReviewQueuePageData(params);

  return <ReviewQueueConsole initialData={pageData} />;
}
