import { redirect } from "next/navigation";

import {
  resolveReviewQueuePageAccess,
} from "@/lib/operator-auth";
import { buildReviewQueuePageData } from "@/lib/review/review-queue-ui";

import { ReviewItemsAccessBlocked } from "./review-items-access-blocked";
import { ReviewQueueConsole } from "./review-queue-console";

export const dynamic = "force-dynamic";

type ReviewItemsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ReviewItemsPage({ searchParams }: ReviewItemsPageProps) {
  const params = await searchParams;
  const access = await resolveReviewQueuePageAccess(params);

  if (access.status === "redirect") {
    redirect(access.path);
  }

  if (access.status === "blocked") {
    return <ReviewItemsAccessBlocked showLoginLink={access.showLoginLink} />;
  }

  const pageData = await buildReviewQueuePageData(params, access.access);

  return <ReviewQueueConsole initialData={pageData} />;
}
