import type { ReviewQueueAccessContext } from "@/lib/operator-auth";
import {
  buildMindLoopDetailApiResponse,
  type MindLoopDetailFilters,
  type MindLoopDetailItem,
} from "@/lib/review/mind-loop-api";
import {
  isEvidenceMindDigestPersistenceConfigured,
} from "@/lib/watch/evidence-mind-digest-store";
import {
  isExternalMindHandoffPersistenceConfigured,
} from "@/lib/watch/external-mind-handoff-store";
import {
  isExternalMindHandoffReceiptPersistenceConfigured,
} from "@/lib/watch/external-mind-handoff-receipt-store";

export type MindLoopDetailPageData = {
  configured: boolean;
  digestId: string;
  destination: string;
  item: MindLoopDetailItem | null;
  notFound: boolean;
  detailError: string | null;
};

function parseDestination(
  value: string | string[] | undefined
): MindLoopDetailFilters["destination"] {
  const destination = typeof value === "string" ? value : undefined;

  if (
    destination === "hellominds" ||
    destination === "test_sink" ||
    destination === "animoca_mind" ||
    destination === "internal_export"
  ) {
    return destination;
  }

  return "hellominds";
}

export function parseMindLoopDetailPageFilters(
  params: Record<string, string | string[] | undefined>
): MindLoopDetailFilters {
  return {
    destination: parseDestination(params.destination),
  };
}

export async function buildMindLoopDetailPageData(
  digestId: string,
  params: Record<string, string | string[] | undefined>,
  access: ReviewQueueAccessContext
): Promise<MindLoopDetailPageData> {
  const filters = parseMindLoopDetailPageFilters(params);
  const configured =
    isEvidenceMindDigestPersistenceConfigured() &&
    isExternalMindHandoffPersistenceConfigured() &&
    isExternalMindHandoffReceiptPersistenceConfigured();

  if (!configured) {
    return {
      configured: false,
      digestId,
      destination: filters.destination ?? "hellominds",
      item: null,
      notFound: false,
      detailError: "supabase_not_configured",
    };
  }

  const response = await buildMindLoopDetailApiResponse(digestId, filters, access);

  if (!response.ok) {
    return {
      configured: true,
      digestId,
      destination: filters.destination ?? "hellominds",
      item: null,
      notFound: true,
      detailError: response.error,
    };
  }

  return {
    configured: true,
    digestId,
    destination: response.destination,
    item: response.item,
    notFound: false,
    detailError: response.detail_error,
  };
}
