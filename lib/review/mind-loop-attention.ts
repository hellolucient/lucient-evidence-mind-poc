/**
 * Phase 43A — read-only operator attention workflow for the Mind Loop Dashboard.
 *
 * SAFETY: Derived UI/API fields only. Must not trigger send, auto-send, retry, or live fetch.
 */
import type { MindLoopStage, MindLoopTaskCostStatus } from "@/lib/review/mind-loop-ui";
import { mindLoopReplyRecommendsOperatorAction } from "@/lib/review/mind-loop-ui";

export type MindLoopAttentionReason =
  | "no_handoff"
  | "pending_approval"
  | "approved_not_sent"
  | "sent_no_delivery_receipt"
  | "delivery_not_verified"
  | "mind_response_missing"
  | "cost_report_unavailable"
  | "cost_report_malformed"
  | "loop_complete_no_action"
  | "loop_complete_action_recommended";

export type MindLoopAttentionFilter = "all" | "needs_attention" | "no_attention";

export type MindLoopAttentionReasonMeta = {
  label: string;
  helper_text: string;
  operator_hint: string;
};

export type MindLoopAttentionView = {
  needs_attention: boolean;
  primary_reason: MindLoopAttentionReason | null;
  primary_label: string | null;
  primary_helper_text: string | null;
  operator_hint: string | null;
  additional_reasons: MindLoopAttentionReason[];
  additional_labels: string[];
  reason_codes: MindLoopAttentionReason[];
};

export const MIND_LOOP_ATTENTION_REASON_PRIORITY: readonly MindLoopAttentionReason[] = [
  "pending_approval",
  "no_handoff",
  "approved_not_sent",
  "sent_no_delivery_receipt",
  "delivery_not_verified",
  "mind_response_missing",
  "loop_complete_action_recommended",
  "cost_report_malformed",
  "cost_report_unavailable",
  "loop_complete_no_action",
] as const;

export const MIND_LOOP_NON_ATTENTION_REASONS: ReadonlySet<MindLoopAttentionReason> = new Set([
  "loop_complete_no_action",
]);

export const MIND_LOOP_ATTENTION_REASON_META: Record<
  MindLoopAttentionReason,
  MindLoopAttentionReasonMeta
> = {
  no_handoff: {
    label: "No handoff yet",
    helper_text: "Digest exists but no external Mind handoff has been created.",
    operator_hint: "Review digest and create handoff",
  },
  pending_approval: {
    label: "Awaiting approval",
    helper_text: "Handoff exists but has not been approved for send.",
    operator_hint: "Approve handoff before sending",
  },
  approved_not_sent: {
    label: "Approved, not sent",
    helper_text: "Handoff is approved but has not been sent yet.",
    operator_hint: "Review approved handoff on digest page before sending",
  },
  sent_no_delivery_receipt: {
    label: "Sent, awaiting delivery verification",
    helper_text: "Handoff was sent but delivery receipt is not verified yet.",
    operator_hint: "Verify delivery receipt",
  },
  delivery_not_verified: {
    label: "Delivery not verified",
    helper_text: "A receipt record exists but delivery is not verified.",
    operator_hint: "Verify delivery receipt",
  },
  mind_response_missing: {
    label: "Delivery verified, awaiting Mind response",
    helper_text: "Delivery is verified but Mind response has not been retrieved.",
    operator_hint: "Fetch latest Mind response",
  },
  cost_report_unavailable: {
    label: "Cost report unavailable",
    helper_text: "Mind response is stored but no cost report summary is available.",
    operator_hint: "Review Mind response on digest page",
  },
  cost_report_malformed: {
    label: "Cost report could not be parsed",
    helper_text: "A cost report excerpt was stored but could not be parsed safely.",
    operator_hint: "Review Mind response on digest page",
  },
  loop_complete_action_recommended: {
    label: "Action recommended by Mind",
    helper_text: "Loop is complete but the Mind reply suggests operator review.",
    operator_hint: "Review Mind recommendation",
  },
  loop_complete_no_action: {
    label: "Loop complete",
    helper_text: "Mind loop is complete and no immediate operator action is required.",
    operator_hint: "No operator action required",
  },
};

export type MindLoopAttentionInput = {
  handoff_id: string | null;
  approval_status: string | null;
  send_status: string | null;
  delivery_status: string | null;
  delivery_status_label: string;
  mind_response_status_label: string;
  task_cost_status: MindLoopTaskCostStatus;
  loop_stage: MindLoopStage;
  latest_action: string | null;
  latest_mind_reply_excerpt: string | null;
};

function sortReasonsByPriority(
  reasons: MindLoopAttentionReason[]
): MindLoopAttentionReason[] {
  const unique = [...new Set(reasons)];
  return unique.sort(
    (left, right) =>
      MIND_LOOP_ATTENTION_REASON_PRIORITY.indexOf(left) -
      MIND_LOOP_ATTENTION_REASON_PRIORITY.indexOf(right)
  );
}

export function deriveMindLoopAttentionReasons(
  input: MindLoopAttentionInput
): MindLoopAttentionReason[] {
  const reasons: MindLoopAttentionReason[] = [];

  if (!input.handoff_id) {
    reasons.push("no_handoff");
  } else if (
    input.approval_status === "pending_review" ||
    input.approval_status === "changes_requested" ||
    input.approval_status === "rejected"
  ) {
    reasons.push("pending_approval");
  }

  if (
    input.handoff_id &&
    input.approval_status === "approved" &&
    (input.send_status === "ready" || input.send_status === "failed")
  ) {
    reasons.push("approved_not_sent");
  }

  if (input.send_status === "sent" && !input.delivery_status) {
    reasons.push("sent_no_delivery_receipt");
  } else if (input.send_status === "sent" && input.delivery_status_label === "Pending") {
    reasons.push("sent_no_delivery_receipt");
  } else if (
    input.send_status === "sent" &&
    input.delivery_status &&
    input.delivery_status !== "delivery_confirmed_from_send_event" &&
    input.delivery_status !== "fetched_from_hellominds"
  ) {
    reasons.push("delivery_not_verified");
  }

  if (
    input.delivery_status_label === "Verified" &&
    input.mind_response_status_label !== "Retrieved"
  ) {
    reasons.push("mind_response_missing");
  }

  if (input.loop_stage === "mind_response_retrieved") {
    if (
      mindLoopReplyRecommendsOperatorAction({
        latestAction: input.latest_action,
        mindReplyExcerpt: input.latest_mind_reply_excerpt,
      })
    ) {
      reasons.push("loop_complete_action_recommended");
    } else {
      reasons.push("loop_complete_no_action");
    }
  }

  if (input.task_cost_status === "malformed") {
    reasons.push("cost_report_malformed");
  } else if (
    input.task_cost_status === "unavailable" &&
    input.mind_response_status_label === "Retrieved"
  ) {
    reasons.push("cost_report_unavailable");
  }

  return sortReasonsByPriority(reasons);
}

export function mindLoopAttentionReasonsNeedAttention(
  reasons: MindLoopAttentionReason[]
): boolean {
  return reasons.some((reason) => !MIND_LOOP_NON_ATTENTION_REASONS.has(reason));
}

export function buildMindLoopAttentionView(input: MindLoopAttentionInput): MindLoopAttentionView {
  const reason_codes = deriveMindLoopAttentionReasons(input);
  const needs_attention = mindLoopAttentionReasonsNeedAttention(reason_codes);
  const primary_reason = reason_codes[0] ?? null;
  const additional_reasons = reason_codes.slice(1);
  const primaryMeta = primary_reason ? MIND_LOOP_ATTENTION_REASON_META[primary_reason] : null;

  return {
    needs_attention,
    primary_reason,
    primary_label: primaryMeta?.label ?? null,
    primary_helper_text: primaryMeta?.helper_text ?? null,
    operator_hint: primaryMeta?.operator_hint ?? null,
    additional_reasons,
    additional_labels: additional_reasons.map((reason) => MIND_LOOP_ATTENTION_REASON_META[reason].label),
    reason_codes,
  };
}

export function matchesMindLoopAttentionFilter(
  item: { needs_attention: boolean },
  filter: MindLoopAttentionFilter | undefined
): boolean {
  if (!filter || filter === "all") {
    return true;
  }

  if (filter === "needs_attention") {
    return item.needs_attention;
  }

  return !item.needs_attention;
}

export function parseMindLoopAttentionFilter(
  value: string | null | undefined
): MindLoopAttentionFilter | undefined {
  if (value === "needs_attention" || value === "no_attention" || value === "all") {
    return value;
  }

  return undefined;
}
