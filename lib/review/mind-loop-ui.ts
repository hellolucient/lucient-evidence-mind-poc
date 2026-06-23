import { mapDigestRiskToNarrativePosture } from "@/lib/watch/evidence-mind-watchtower-narrative-generator";
import {
  buildHelloMindsMindReplyDisplayFromStored,
  convertHelloMindsMessageTextToPlainText,
} from "@/lib/watch/external-mind-hellominds-message-format";

export type MindLoopStatusBadgeTone = "neutral" | "success" | "warning" | "danger" | "info";

export type MindLoopCostReportSummary = {
  total_credits: number | null;
  major_cost_lines: string[];
  remaining_balance: string | null;
};

export type MindLoopTaskCostStatus = "available" | "unavailable" | "malformed";

export type MindLoopStage =
  | "no_handoff"
  | "pending_approval"
  | "rejected"
  | "ready_to_send"
  | "send_failed"
  | "sent_awaiting_receipt"
  | "delivery_verified_awaiting_response"
  | "mind_response_retrieved"
  | "archived";

export type MindLoopLoopStatusFilter = "needs_attention" | "sent" | "retrieved";

export type MindLoopSummaryTiles = {
  total_digests: number;
  complete_loops: number;
  needs_attention: number;
  pending_approval: number;
  awaiting_delivery_verification: number;
  awaiting_mind_response: number;
};

export type MindLoopListItemViewInput = {
  handoff_id: string | null;
  approval_status: string | null;
  send_status: string | null;
  delivery_status_label: string;
  mind_response_status_label: string;
};

export function formatMindLoopDigestPeriod(periodStart: string, periodEnd: string): string {
  const startDate = new Date(periodStart);
  const endDate = new Date(periodEnd);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return `${periodStart} – ${periodEnd}`;
  }

  const utcDateOptions: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  };

  const sameYear = startDate.getUTCFullYear() === endDate.getUTCFullYear();
  const startLabel = startDate.toLocaleDateString(undefined, {
    ...utcDateOptions,
    ...(sameYear ? {} : { year: "numeric" }),
  });
  const endLabel = endDate.toLocaleDateString(undefined, {
    ...utcDateOptions,
    year: "numeric",
  });

  return `${startLabel} – ${endLabel}`;
}

export function formatMindLoopRiskPosture(highestRiskImplication: string): string {
  const posture = mapDigestRiskToNarrativePosture(highestRiskImplication);
  return posture.replaceAll("_", " ");
}

export function formatMindLoopHandoffDestinationLabel(destination: string | null): string | null {
  if (!destination) {
    return null;
  }

  switch (destination) {
    case "hellominds":
      return "HelloMinds";
    case "test_sink":
      return "Test sink";
    case "animoca_mind":
      return "Animoca Mind";
    case "internal_export":
      return "Internal export";
    default:
      return destination.replaceAll("_", " ");
  }
}

export function formatMindLoopApprovalStatusLabel(reviewStatus: string | null): string {
  if (!reviewStatus) {
    return "Not available";
  }

  switch (reviewStatus) {
    case "approved":
      return "Approved";
    case "pending_review":
      return "Pending";
    case "rejected":
      return "Rejected";
    case "changes_requested":
      return "Changes requested";
    default:
      return reviewStatus.replaceAll("_", " ");
  }
}

export function formatMindLoopSendStatusLabel(sendStatus: string | null): string {
  if (!sendStatus) {
    return "Not available";
  }

  switch (sendStatus) {
    case "sent":
      return "Sent";
    case "ready":
      return "Ready";
    case "failed":
      return "Failed";
    case "draft":
      return "Draft";
    case "archived":
      return "Archived";
    default:
      return sendStatus.replaceAll("_", " ");
  }
}

export function formatMindLoopDeliveryStatusLabel(
  receiptStatus: string | null,
  handoffSendStatus: string | null
): string {
  if (
    receiptStatus === "delivery_confirmed_from_send_event" ||
    receiptStatus === "fetched_from_hellominds"
  ) {
    return "Verified";
  }

  if (handoffSendStatus === "sent") {
    return "Pending";
  }

  return "Not available";
}

export function formatMindLoopMindResponseStatusLabel(input: {
  receiptStatus: string | null;
  mindReplyState: string | null;
}): string {
  if (input.receiptStatus === "fetched_from_hellominds") {
    if (input.mindReplyState === "no_reply_yet") {
      return "Pending";
    }

    return "Retrieved";
  }

  if (input.mindReplyState === "mind_reply_found") {
    return "Retrieved";
  }

  if (input.receiptStatus === "delivery_confirmed_from_send_event") {
    return "Pending";
  }

  return "Not available";
}

export function resolveMindLoopApprovalBadgeTone(reviewStatus: string | null): MindLoopStatusBadgeTone {
  switch (reviewStatus) {
    case "approved":
      return "success";
    case "rejected":
      return "danger";
    case "changes_requested":
      return "warning";
    case "pending_review":
      return "info";
    default:
      return "neutral";
  }
}

export function resolveMindLoopSendBadgeTone(sendStatus: string | null): MindLoopStatusBadgeTone {
  switch (sendStatus) {
    case "sent":
      return "success";
    case "failed":
      return "danger";
    case "ready":
      return "info";
    default:
      return "neutral";
  }
}

export function resolveMindLoopDeliveryBadgeTone(
  receiptStatus: string | null,
  handoffSendStatus: string | null
): MindLoopStatusBadgeTone {
  if (
    receiptStatus === "delivery_confirmed_from_send_event" ||
    receiptStatus === "fetched_from_hellominds"
  ) {
    return "success";
  }

  if (handoffSendStatus === "sent") {
    return "warning";
  }

  return "neutral";
}

export function resolveMindLoopMindResponseBadgeTone(input: {
  receiptStatus: string | null;
  mindReplyState: string | null;
}): MindLoopStatusBadgeTone {
  const label = formatMindLoopMindResponseStatusLabel(input);
  if (label === "Retrieved") {
    return "success";
  }

  if (label === "Pending") {
    return "warning";
  }

  return "neutral";
}

export function parseHelloMindsCostReportSummary(
  costReport: string | null | undefined
): MindLoopCostReportSummary | null {
  if (!costReport?.trim()) {
    return null;
  }

  const plain = convertHelloMindsMessageTextToPlainText(costReport);
  if (!plain) {
    return null;
  }

  const lines = plain
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const major_cost_lines: string[] = [];
  let total_credits: number | null = null;
  let remaining_balance: string | null = null;

  for (const line of lines) {
    const totalMatch = line.match(/Total Credits:\s*([\d.]+)/i);
    if (totalMatch) {
      const parsed = Number.parseFloat(totalMatch[1]);
      total_credits = Number.isFinite(parsed) ? parsed : null;
      continue;
    }

    const balanceMatch = line.match(/Remaining Balance:\s*(.+)/i);
    if (balanceMatch) {
      remaining_balance = balanceMatch[1].trim();
      continue;
    }

    if (/^LUCIENT TASK COST REPORT/i.test(line)) {
      continue;
    }

    if (line.startsWith("•") || line.startsWith("-")) {
      major_cost_lines.push(line.replace(/^[•-]\s*/, ""));
    }
  }

  if (total_credits === null && major_cost_lines.length === 0 && !remaining_balance) {
    return null;
  }

  return {
    total_credits,
    major_cost_lines: major_cost_lines.slice(0, 5),
    remaining_balance,
  };
}

const MIND_LOOP_ACTION_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /no immediate action required/i, label: "No immediate action required" },
  { pattern: /review recommended/i, label: "Review recommended" },
  { pattern: /wording update recommended/i, label: "Claim wording update recommended" },
  { pattern: /evidence risk changed/i, label: "Evidence risk changed" },
  { pattern: /new alerts? detected/i, label: "New alerts detected" },
  { pattern: /escalation recommended/i, label: "Escalation recommended" },
  { pattern: /operator attention/i, label: "Operator attention recommended" },
];

export function extractMindLoopActionRecommendation(input: {
  mindReplyMain: string | null | undefined;
  recommendedFocus: string | null | undefined;
}): string | null {
  const reply = input.mindReplyMain?.trim();
  const focus = input.recommendedFocus?.trim();
  const combined = reply || focus;

  if (combined) {
    for (const { pattern, label } of MIND_LOOP_ACTION_PATTERNS) {
      if (pattern.test(combined)) {
        const match = combined.match(pattern);
        if (match) {
          return match[0].replace(/\.\s*$/, "").trim();
        }
        return label;
      }
    }
  }

  if (reply) {
    const lines = reply
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const closingLine = lines[lines.length - 1];
    if (closingLine && closingLine.length <= 120) {
      return closingLine;
    }

    if (reply.length <= 120) {
      return reply;
    }

    return `${reply.slice(0, 117)}…`;
  }

  return focus || null;
}

export function mindLoopReplyRecommendsOperatorAction(input: {
  latestAction: string | null | undefined;
  mindReplyExcerpt: string | null | undefined;
}): boolean {
  const text = `${input.latestAction ?? ""} ${input.mindReplyExcerpt ?? ""}`.trim();
  if (!text) {
    return false;
  }

  if (/no immediate action required/i.test(text)) {
    return false;
  }

  return /review recommended|wording update recommended|evidence risk changed|new alerts? detected|escalation recommended|operator attention|action required|attention required/i.test(
    text
  );
}

export function resolveMindLoopMindReplyDisplay(input: {
  response_excerpt: string | null | undefined;
  metadata?: Record<string, unknown> | null;
}) {
  return buildHelloMindsMindReplyDisplayFromStored(input);
}

export function truncateMindLoopExcerpt(value: string | null, maxLength = 200): string | null {
  if (!value?.trim()) {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength - 1)}…`;
}

export function resolveMindLoopStage(item: MindLoopListItemViewInput): MindLoopStage {
  if (!item.handoff_id) {
    return "no_handoff";
  }

  if (item.send_status === "archived") {
    return "archived";
  }

  if (item.approval_status === "rejected") {
    return "rejected";
  }

  if (
    item.approval_status === "pending_review" ||
    item.approval_status === "changes_requested"
  ) {
    return "pending_approval";
  }

  if (item.send_status === "failed") {
    return "send_failed";
  }

  if (item.approval_status === "approved" && item.send_status === "ready") {
    return "ready_to_send";
  }

  if (item.mind_response_status_label === "Retrieved") {
    return "mind_response_retrieved";
  }

  if (item.delivery_status_label === "Verified" && item.mind_response_status_label === "Pending") {
    return "delivery_verified_awaiting_response";
  }

  if (item.send_status === "sent" && item.delivery_status_label === "Pending") {
    return "sent_awaiting_receipt";
  }

  return "no_handoff";
}

export function formatMindLoopStageLabel(stage: MindLoopStage): string {
  switch (stage) {
    case "no_handoff":
      return "No handoff created yet";
    case "pending_approval":
      return "Awaiting operator approval";
    case "rejected":
      return "Handoff rejected";
    case "ready_to_send":
      return "Approved — ready to send";
    case "send_failed":
      return "Send failed — operator review needed";
    case "sent_awaiting_receipt":
      return "Sent — delivery not verified yet";
    case "delivery_verified_awaiting_response":
      return "Delivery verified — Mind response not fetched";
    case "mind_response_retrieved":
      return "Loop complete — Mind response retrieved";
    case "archived":
      return "Archived";
    default:
      return "Status unavailable";
  }
}

export function mindLoopItemNeedsAttention(
  item: MindLoopListItemViewInput & { needs_attention?: boolean }
): boolean {
  if (typeof item.needs_attention === "boolean") {
    return item.needs_attention;
  }

  const stage = resolveMindLoopStage(item);
  return stage !== "mind_response_retrieved" && stage !== "archived";
}

export function matchesMindLoopLoopStatusFilter(
  item: MindLoopListItemViewInput & {
    send_status: string | null;
    mind_response_status_label: string;
  },
  filter: MindLoopLoopStatusFilter
): boolean {
  switch (filter) {
    case "needs_attention":
      return mindLoopItemNeedsAttention(item);
    case "sent":
      return item.send_status === "sent";
    case "retrieved":
      return item.mind_response_status_label === "Retrieved";
    default:
      return true;
  }
}

export function computeMindLoopSummaryTiles(
  items: Array<
    MindLoopListItemViewInput & {
      send_status: string | null;
      mind_response_status_label: string;
      approval_status: string | null;
      loop_stage: MindLoopStage;
      needs_attention: boolean;
    }
  >
): MindLoopSummaryTiles {
  return {
    total_digests: items.length,
    complete_loops: items.filter((item) => item.loop_stage === "mind_response_retrieved").length,
    needs_attention: items.filter((item) => item.needs_attention).length,
    pending_approval: items.filter(
      (item) =>
        item.approval_status === "pending_review" ||
        item.approval_status === "changes_requested" ||
        item.approval_status === "rejected"
    ).length,
    awaiting_delivery_verification: items.filter(
      (item) => item.send_status === "sent" && item.delivery_status_label === "Pending"
    ).length,
    awaiting_mind_response: items.filter(
      (item) =>
        item.delivery_status_label === "Verified" &&
        item.mind_response_status_label !== "Retrieved"
    ).length,
  };
}

export function resolveMindLoopTaskCostStatus(input: {
  costReportPresent: boolean;
  costSummary: MindLoopCostReportSummary | null;
}): MindLoopTaskCostStatus {
  if (!input.costReportPresent) {
    return "unavailable";
  }

  if (!input.costSummary) {
    return "malformed";
  }

  return "available";
}

export function formatMindLoopTaskCostDisplay(input: {
  task_cost: MindLoopCostReportSummary | null;
  task_cost_status: MindLoopTaskCostStatus;
}): string {
  if (input.task_cost_status === "malformed") {
    return "Unavailable";
  }

  if (input.task_cost_status === "unavailable") {
    return "—";
  }

  if (input.task_cost?.total_credits === null || input.task_cost?.total_credits === undefined) {
    return "—";
  }

  return `${input.task_cost.total_credits} credits`;
}

export function formatMindLoopTimestamp(value: string | null | undefined): string {
  if (!value?.trim()) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatMindLoopShortId(value: string | null | undefined): string | null {
  if (!value?.trim()) {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length <= 12) {
    return trimmed;
  }

  return `${trimmed.slice(0, 8)}…${trimmed.slice(-4)}`;
}

export type MindLoopTimelineStage =
  | "digest_created"
  | "handoff_created"
  | "approved"
  | "sent"
  | "delivery_verified"
  | "mind_response_retrieved"
  | "cost_report_parsed";

export type MindLoopTimelineStatus = "complete" | "pending" | "unavailable";

export type MindLoopTimelineEntry = {
  stage: MindLoopTimelineStage;
  label: string;
  status: MindLoopTimelineStatus;
  timestamp: string | null;
  description: string;
};

export type MindLoopTimelineInput = {
  digest_created_at: string;
  handoff: {
    created_at: string;
    approved_at: string | null;
    sent_at: string | null;
    review_status: string | null;
    status: string | null;
  } | null;
  receipt: {
    receipt_status: string | null;
    verified_at: string | null;
  } | null;
  delivery_status_label: string;
  mind_response_status_label: string;
  task_cost_status: MindLoopTaskCostStatus;
  retrieval_timestamp: string | null;
};

export function buildMindLoopTimeline(input: MindLoopTimelineInput): MindLoopTimelineEntry[] {
  const handoff = input.handoff;
  const isApproved = handoff?.review_status === "approved";
  const isSent = handoff?.status === "sent";
  const deliveryVerified = input.delivery_status_label === "Verified";
  const mindRetrieved = input.mind_response_status_label === "Retrieved";

  const entries: MindLoopTimelineEntry[] = [
    {
      stage: "digest_created",
      label: "Digest created",
      status: "complete",
      timestamp: input.digest_created_at,
      description: "Evidence Mind digest record created.",
    },
    {
      stage: "handoff_created",
      label: "Handoff created",
      status: handoff ? "complete" : "unavailable",
      timestamp: handoff?.created_at ?? null,
      description: handoff
        ? "External Mind handoff record created for this digest."
        : "No external Mind handoff created yet.",
    },
    {
      stage: "approved",
      label: "Approved",
      status: !handoff
        ? "unavailable"
        : isApproved
          ? "complete"
          : handoff.review_status === "pending_review" ||
              handoff.review_status === "changes_requested"
            ? "pending"
            : "unavailable",
      timestamp: isApproved ? (handoff?.approved_at ?? null) : null,
      description: !handoff
        ? "Approval is not applicable without a handoff."
        : isApproved
          ? "Handoff approved for send."
          : handoff.review_status === "pending_review" ||
              handoff.review_status === "changes_requested"
            ? "Handoff is awaiting operator approval."
            : "Handoff was not approved.",
    },
    {
      stage: "sent",
      label: "Sent",
      status: !handoff
        ? "unavailable"
        : isSent
          ? "complete"
          : isApproved
            ? "pending"
            : "unavailable",
      timestamp: isSent ? (handoff.sent_at ?? null) : null,
      description: !handoff
        ? "Send is not applicable without a handoff."
        : isSent
          ? "Handoff was sent to the external Mind destination."
          : isApproved
            ? "Approved handoff has not been sent yet."
            : "Handoff must be approved before send.",
    },
    {
      stage: "delivery_verified",
      label: "Delivery verified",
      status: !isSent
        ? "unavailable"
        : deliveryVerified
          ? "complete"
          : "pending",
      timestamp: deliveryVerified ? (input.receipt?.verified_at ?? null) : null,
      description: !isSent
        ? "Delivery verification requires a sent handoff."
        : deliveryVerified
          ? "Delivery receipt verified from durable records."
          : "Handoff was sent but delivery is not verified yet.",
    },
    {
      stage: "mind_response_retrieved",
      label: "Mind response retrieved",
      status: !deliveryVerified
        ? "unavailable"
        : mindRetrieved
          ? "complete"
          : "pending",
      timestamp: mindRetrieved ? input.retrieval_timestamp : null,
      description: !deliveryVerified
        ? "Mind response retrieval requires verified delivery."
        : mindRetrieved
          ? "Latest Mind reply stored from durable records."
          : "Delivery is verified but Mind response has not been retrieved.",
    },
    {
      stage: "cost_report_parsed",
      label: "Cost report parsed",
      status: !mindRetrieved
        ? "unavailable"
        : input.task_cost_status === "available"
          ? "complete"
          : input.task_cost_status === "malformed"
            ? "unavailable"
            : "pending",
      timestamp:
        input.task_cost_status === "available" ? input.retrieval_timestamp : null,
      description: !mindRetrieved
        ? "Cost summary requires a retrieved Mind response."
        : input.task_cost_status === "available"
          ? "Task cost summary parsed safely from stored excerpt."
          : input.task_cost_status === "malformed"
            ? "A cost report excerpt was stored but could not be parsed safely."
            : "Mind response is stored but no cost report summary is available.",
    },
  ];

  return entries;
}
