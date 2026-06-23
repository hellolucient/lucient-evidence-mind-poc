/**
 * Phase 42A/43A — read-only Mind Loop operator dashboard API aggregation.
 *
 * SAFETY: This module is read-only. It must not call live send, auto-send, or retry paths.
 * It must not require EXTERNAL_MIND_LIVE_SEND. HelloMinds data is read from durable
 * receipt records only (Phase 41A/41B), never fetched live from this endpoint.
 */
import { applyWorkspaceScopeToListFilters, type ReviewQueueAccessContext } from "@/lib/operator-auth";
import type { ExternalMindHandoffDestination } from "@/lib/review/external-mind-handoff-constants";
import {
  buildMindLoopAttentionView,
  matchesMindLoopAttentionFilter,
  parseMindLoopAttentionFilter,
  type MindLoopAttentionFilter,
  type MindLoopAttentionView,
} from "@/lib/review/mind-loop-attention";
import {
  extractMindLoopActionRecommendation,
  formatMindLoopApprovalStatusLabel,
  formatMindLoopDeliveryStatusLabel,
  formatMindLoopDigestPeriod,
  formatMindLoopHandoffDestinationLabel,
  formatMindLoopMindResponseStatusLabel,
  formatMindLoopRiskPosture,
  formatMindLoopSendStatusLabel,
  formatMindLoopStageLabel,
  matchesMindLoopLoopStatusFilter,
  parseHelloMindsCostReportSummary,
  resolveMindLoopMindReplyDisplay,
  resolveMindLoopStage,
  resolveMindLoopTaskCostStatus,
  computeMindLoopSummaryTiles,
  type MindLoopLoopStatusFilter,
  type MindLoopStage,
  type MindLoopSummaryTiles,
  type MindLoopTaskCostStatus,
  truncateMindLoopExcerpt,
} from "@/lib/review/mind-loop-ui";
import { CURRENT_WATCH_PHASE } from "@/lib/watch/watch-phase";
import {
  listEvidenceMindDigests,
  type EvidenceMindDigestListFilters,
  type PrivacySafeEvidenceMindDigest,
} from "@/lib/watch/evidence-mind-digest-store";
import { getExternalMindHandoffReceiptForHandoff } from "@/lib/watch/external-mind-handoff-receipt-store";
import {
  listExternalMindHandoffs,
  type PrivacySafeExternalMindHandoff,
} from "@/lib/watch/external-mind-handoff-store";

export const MIND_LOOP_API_ROUTE = "/api/operator/mind-loop" as const;

export type MindLoopListFilters = EvidenceMindDigestListFilters & {
  destination?: ExternalMindHandoffDestination;
  limit?: number;
  loop_status?: MindLoopLoopStatusFilter;
  attention?: MindLoopAttentionFilter;
};

export type { MindLoopAttentionView };

export type MindLoopCostReportView = {
  total_credits: number | null;
  major_cost_lines: string[];
  remaining_balance: string | null;
};

export type MindLoopListItem = {
  digest_id: string;
  workspace_id: string;
  digest_period_label: string;
  period_start: string;
  period_end: string;
  risk_posture: string;
  review_items_count: number;
  evidence_briefs_count: number;
  handoff_destination: string | null;
  handoff_destination_label: string | null;
  handoff_id: string | null;
  approval_status: string | null;
  approval_status_label: string;
  send_status: string | null;
  send_status_label: string;
  delivery_status: string | null;
  delivery_status_label: string;
  mind_response_status: string | null;
  mind_response_status_label: string;
  mind_reply_state: string | null;
  latest_action: string | null;
  latest_mind_reply_excerpt: string | null;
  task_cost: MindLoopCostReportView | null;
  task_cost_status: MindLoopTaskCostStatus;
  loop_stage: MindLoopStage;
  loop_stage_label: string;
  needs_attention: boolean;
  attention: MindLoopAttentionView;
  last_updated_at: string;
  retrieval_timestamp: string | null;
};

export const MIND_LOOP_PRIVATE_FIELDS = [
  "payload_json",
  "metadata",
  "send_result_json",
  "response_excerpt",
  "actor_email",
  "reviewed_by_actor_email",
  "approved_by_actor_email",
  "bearer",
  "authorization",
  "raw_payload",
] as const;

export function parseMindLoopListFilters(searchParams: URLSearchParams): MindLoopListFilters {
  const limitParam = searchParams.get("limit");
  const parsedLimit =
    limitParam && !Number.isNaN(Number(limitParam)) ? Number(limitParam) : undefined;
  const destination = searchParams.get("destination");
  const loopStatus = searchParams.get("loop_status");
  const attention = searchParams.get("attention");

  return {
    workspace_id: searchParams.get("workspace_id") ?? undefined,
    status: (searchParams.get("status") as EvidenceMindDigestListFilters["status"]) ?? undefined,
    destination:
      destination === "hellominds" ||
      destination === "test_sink" ||
      destination === "animoca_mind" ||
      destination === "internal_export"
        ? destination
        : "hellominds",
    limit: parsedLimit,
    loop_status:
      loopStatus === "needs_attention" ||
      loopStatus === "sent" ||
      loopStatus === "retrieved"
        ? loopStatus
        : undefined,
    attention: parseMindLoopAttentionFilter(attention),
  };
}

function pickLatestHandoffByDigest(
  handoffs: PrivacySafeExternalMindHandoff[]
): Map<string, PrivacySafeExternalMindHandoff> {
  const byDigest = new Map<string, PrivacySafeExternalMindHandoff>();
  for (const handoff of handoffs) {
    if (!byDigest.has(handoff.digest_id)) {
      byDigest.set(handoff.digest_id, handoff);
    }
  }

  return byDigest;
}

function resolveLastUpdatedAt(input: {
  digest: PrivacySafeEvidenceMindDigest;
  handoff: PrivacySafeExternalMindHandoff | null;
  receiptUpdatedAt: string | null;
  retrievalTimestamp: string | null;
}): string {
  const candidates = [
    input.digest.updated_at,
    input.handoff?.updated_at ?? null,
    input.receiptUpdatedAt,
    input.retrievalTimestamp,
  ].filter((value): value is string => Boolean(value));

  if (candidates.length === 0) {
    return input.digest.updated_at;
  }

  return candidates.sort((left, right) => right.localeCompare(left))[0];
}

export function buildMindLoopListItem(input: {
  digest: PrivacySafeEvidenceMindDigest;
  handoff: PrivacySafeExternalMindHandoff | null;
  receipt: {
    receipt_status: string;
    response_excerpt: string | null;
    metadata: Record<string, unknown> | null;
    updated_at: string;
  } | null;
}): MindLoopListItem {
  const mindReplyDisplay = input.receipt
    ? resolveMindLoopMindReplyDisplay({
        response_excerpt: input.receipt.response_excerpt,
        metadata: input.receipt.metadata,
      })
    : null;

  const mindReplyState =
    typeof input.receipt?.metadata?.mind_reply_state === "string"
      ? input.receipt.metadata.mind_reply_state
      : null;

  const retrievalTimestamp =
    typeof input.receipt?.metadata?.retrieval_timestamp === "string"
      ? input.receipt.metadata.retrieval_timestamp
      : null;

  const costSummary = mindReplyDisplay?.cost_report_present
    ? parseHelloMindsCostReportSummary(mindReplyDisplay.cost_report)
    : null;

  const taskCostStatus = resolveMindLoopTaskCostStatus({
    costReportPresent: mindReplyDisplay?.cost_report_present === true,
    costSummary,
  });

  const latestAction = extractMindLoopActionRecommendation({
    mindReplyMain: mindReplyDisplay?.main_reply,
    recommendedFocus: input.digest.recommended_focus,
  });

  const approvalStatus = input.handoff?.review_status ?? null;
  const sendStatus = input.handoff?.status ?? null;
  const receiptStatus = input.receipt?.receipt_status ?? null;
  const deliveryStatusLabel = formatMindLoopDeliveryStatusLabel(receiptStatus, sendStatus);
  const mindResponseStatusLabel = formatMindLoopMindResponseStatusLabel({
    receiptStatus,
    mindReplyState,
  });

  const loopStage = resolveMindLoopStage({
    handoff_id: input.handoff?.id ?? null,
    approval_status: approvalStatus,
    send_status: sendStatus,
    delivery_status_label: deliveryStatusLabel,
    mind_response_status_label: mindResponseStatusLabel,
  });

  const latestMindReplyExcerpt = truncateMindLoopExcerpt(mindReplyDisplay?.main_reply ?? null);

  const attention = buildMindLoopAttentionView({
    handoff_id: input.handoff?.id ?? null,
    approval_status: approvalStatus,
    send_status: sendStatus,
    delivery_status: receiptStatus,
    delivery_status_label: deliveryStatusLabel,
    mind_response_status_label: mindResponseStatusLabel,
    task_cost_status: taskCostStatus,
    loop_stage: loopStage,
    latest_action: latestAction,
    latest_mind_reply_excerpt: latestMindReplyExcerpt,
  });

  return {
    digest_id: input.digest.id,
    workspace_id: input.digest.workspace_id,
    digest_period_label: formatMindLoopDigestPeriod(
      input.digest.period_start,
      input.digest.period_end
    ),
    period_start: input.digest.period_start,
    period_end: input.digest.period_end,
    risk_posture: formatMindLoopRiskPosture(input.digest.highest_risk_implication),
    review_items_count: input.digest.review_items_count,
    evidence_briefs_count: input.digest.briefs_count,
    handoff_destination: input.handoff?.destination ?? null,
    handoff_destination_label: formatMindLoopHandoffDestinationLabel(
      input.handoff?.destination ?? null
    ),
    handoff_id: input.handoff?.id ?? null,
    approval_status: approvalStatus,
    approval_status_label: formatMindLoopApprovalStatusLabel(approvalStatus),
    send_status: sendStatus,
    send_status_label: formatMindLoopSendStatusLabel(sendStatus),
    delivery_status: receiptStatus,
    delivery_status_label: deliveryStatusLabel,
    mind_response_status:
      input.receipt?.receipt_status === "fetched_from_hellominds"
        ? "fetched_from_hellominds"
        : mindReplyState,
    mind_response_status_label: mindResponseStatusLabel,
    mind_reply_state: mindReplyState,
    latest_action: latestAction,
    latest_mind_reply_excerpt: latestMindReplyExcerpt,
    task_cost: costSummary,
    task_cost_status: taskCostStatus,
    loop_stage: loopStage,
    loop_stage_label: formatMindLoopStageLabel(loopStage),
    needs_attention: attention.needs_attention,
    attention,
    last_updated_at: resolveLastUpdatedAt({
      digest: input.digest,
      handoff: input.handoff,
      receiptUpdatedAt: input.receipt?.updated_at ?? null,
      retrievalTimestamp,
    }),
    retrieval_timestamp: retrievalTimestamp,
  };
}

export async function buildMindLoopListApiResponse(
  filters: MindLoopListFilters,
  access: ReviewQueueAccessContext
) {
  const limit = Math.min(Math.max(filters.limit ?? 20, 1), 100);
  const destination = filters.destination ?? "hellominds";
  const scopedDigestFilters = applyWorkspaceScopeToListFilters(
    {
      workspace_id: filters.workspace_id,
      status: filters.status,
    },
    access
  );

  const digestResult = await listEvidenceMindDigests(access, scopedDigestFilters);
  const digests = digestResult.digests.slice(0, limit);

  const handoffResult = await listExternalMindHandoffs(access, {
    workspace_id: scopedDigestFilters.workspace_id,
    destination,
  });

  const handoffsByDigest = pickLatestHandoffByDigest(handoffResult.handoffs);

  const items: MindLoopListItem[] = [];
  for (const digest of digests) {
    const handoff = handoffsByDigest.get(digest.id) ?? null;
    const receiptResult = handoff
      ? await getExternalMindHandoffReceiptForHandoff(handoff.id, access)
      : { receipt: null };

    items.push(
      buildMindLoopListItem({
        digest,
        handoff,
        receipt: receiptResult.receipt,
      })
    );
  }

  let filteredItems = filters.loop_status
    ? items.filter((item) => matchesMindLoopLoopStatusFilter(item, filters.loop_status!))
    : items;

  if (filters.attention && filters.attention !== "all") {
    filteredItems = filteredItems.filter((item) =>
      matchesMindLoopAttentionFilter(item, filters.attention)
    );
  }

  const summary: MindLoopSummaryTiles = computeMindLoopSummaryTiles(items);

  return {
    ok: true as const,
    phase: CURRENT_WATCH_PHASE,
    route: MIND_LOOP_API_ROUTE,
    count: filteredItems.length,
    total_before_filter: items.length,
    limit,
    destination,
    loop_status: filters.loop_status ?? null,
    attention: filters.attention ?? "all",
    summary,
    items: filteredItems,
    list_error: digestResult.error ?? handoffResult.error ?? null,
  };
}

export function isPrivacySafeMindLoopListPayload(payload: Record<string, unknown>): boolean {
  for (const field of MIND_LOOP_PRIVATE_FIELDS) {
    if (field in payload) {
      return false;
    }
  }

  return true;
}
