import type { ReviewQueueAccessContext } from "@/lib/operator-auth";
import {
  buildMindLoopListApiResponse,
  type MindLoopListFilters,
  type MindLoopListItem,
} from "@/lib/review/mind-loop-api";
import { parseMindLoopAttentionFilter, type MindLoopAttentionFilter } from "@/lib/review/mind-loop-attention";
import type { MindLoopLoopStatusFilter, MindLoopSummaryTiles } from "@/lib/review/mind-loop-ui";
import {
  isEvidenceMindDigestPersistenceConfigured,
} from "@/lib/watch/evidence-mind-digest-store";
import {
  isExternalMindHandoffPersistenceConfigured,
} from "@/lib/watch/external-mind-handoff-store";
import {
  isExternalMindHandoffReceiptPersistenceConfigured,
} from "@/lib/watch/external-mind-handoff-receipt-store";

export type MindLoopPageData = {
  configured: boolean;
  filters: MindLoopListFilters;
  items: MindLoopListItem[];
  summary: MindLoopSummaryTiles;
  totalBeforeFilter: number;
  listError: string | null;
  destination: string;
  loopStatus: MindLoopLoopStatusFilter | null;
  attention: MindLoopAttentionFilter;
};

function parseLoopStatusFilter(
  value: string | undefined
): MindLoopLoopStatusFilter | undefined {
  if (value === "needs_attention" || value === "sent" || value === "retrieved") {
    return value;
  }

  return undefined;
}

export function parseMindLoopPageFilters(
  params: Record<string, string | string[] | undefined>
): MindLoopListFilters {
  const workspaceId = typeof params.workspace_id === "string" ? params.workspace_id : undefined;
  const status = typeof params.status === "string" ? params.status : undefined;
  const destination =
    typeof params.destination === "string" ? params.destination : "hellominds";
  const limitParam = typeof params.limit === "string" ? params.limit : undefined;
  const parsedLimit =
    limitParam && !Number.isNaN(Number(limitParam)) ? Number(limitParam) : undefined;
  const loopStatus = parseLoopStatusFilter(
    typeof params.loop_status === "string" ? params.loop_status : undefined
  );
  const attention = parseMindLoopAttentionFilter(
    typeof params.attention === "string" ? params.attention : undefined
  );

  return {
    workspace_id: workspaceId,
    status: status as MindLoopListFilters["status"],
    destination:
      destination === "hellominds" ||
      destination === "test_sink" ||
      destination === "animoca_mind" ||
      destination === "internal_export"
        ? destination
        : "hellominds",
    limit: parsedLimit,
    loop_status: loopStatus,
    attention,
  };
}

const EMPTY_SUMMARY: MindLoopSummaryTiles = {
  total_digests: 0,
  complete_loops: 0,
  needs_attention: 0,
  pending_approval: 0,
  awaiting_delivery_verification: 0,
  awaiting_mind_response: 0,
};

export async function buildMindLoopPageData(
  params: Record<string, string | string[] | undefined>,
  access: ReviewQueueAccessContext
): Promise<MindLoopPageData> {
  const filters = parseMindLoopPageFilters(params);
  const configured =
    isEvidenceMindDigestPersistenceConfigured() &&
    isExternalMindHandoffPersistenceConfigured() &&
    isExternalMindHandoffReceiptPersistenceConfigured();

  if (!configured) {
    return {
      configured: false,
      filters,
      items: [],
      summary: EMPTY_SUMMARY,
      totalBeforeFilter: 0,
      listError: "supabase_not_configured",
      destination: filters.destination ?? "hellominds",
      loopStatus: filters.loop_status ?? null,
      attention: filters.attention ?? "all",
    };
  }

  const response = await buildMindLoopListApiResponse(filters, access);

  return {
    configured: true,
    filters,
    items: response.items,
    summary: response.summary,
    totalBeforeFilter: response.total_before_filter,
    listError: response.list_error,
    destination: response.destination,
    loopStatus: response.loop_status,
    attention: response.attention,
  };
}
