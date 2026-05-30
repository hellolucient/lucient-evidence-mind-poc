import { buildReviewQueuePageData } from "@/lib/review/review-queue-ui";

import { ReviewQueueConsole } from "./review-queue-console";

export const dynamic = "force-dynamic";

type ReviewItemsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ReviewItemsPage({ searchParams }: ReviewItemsPageProps) {
  const params = await searchParams;
  const pageData = await buildReviewQueuePageData(params);

  return <ReviewQueueConsole initialData={pageData} />;
}
