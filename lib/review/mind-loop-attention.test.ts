import { describe, expect, it } from "vitest";

import {
  buildMindLoopAttentionView,
  deriveMindLoopAttentionReasons,
  matchesMindLoopAttentionFilter,
  MIND_LOOP_ATTENTION_REASON_META,
  mindLoopAttentionReasonsNeedAttention,
} from "./mind-loop-attention";

const completeNoActionInput = {
  handoff_id: "handoff-001",
  approval_status: "approved",
  send_status: "sent",
  delivery_status: "fetched_from_hellominds",
  delivery_status_label: "Verified",
  mind_response_status_label: "Retrieved",
  task_cost_status: "available" as const,
  loop_stage: "mind_response_retrieved" as const,
  latest_action: "No immediate action required",
  latest_mind_reply_excerpt: "No immediate action required. Continuing routine monitoring.",
};

describe("mind-loop-attention", () => {
  it("derives each attention reason", () => {
    expect(
      deriveMindLoopAttentionReasons({
        handoff_id: null,
        approval_status: null,
        send_status: null,
        delivery_status: null,
        delivery_status_label: "Not available",
        mind_response_status_label: "Not available",
        task_cost_status: "unavailable",
        loop_stage: "no_handoff",
        latest_action: null,
        latest_mind_reply_excerpt: null,
      })
    ).toContain("no_handoff");

    expect(
      deriveMindLoopAttentionReasons({
        handoff_id: "h1",
        approval_status: "pending_review",
        send_status: "ready",
        delivery_status: null,
        delivery_status_label: "Not available",
        mind_response_status_label: "Not available",
        task_cost_status: "unavailable",
        loop_stage: "pending_approval",
        latest_action: null,
        latest_mind_reply_excerpt: null,
      })
    ).toContain("pending_approval");

    expect(
      deriveMindLoopAttentionReasons({
        handoff_id: "h1",
        approval_status: "approved",
        send_status: "ready",
        delivery_status: null,
        delivery_status_label: "Not available",
        mind_response_status_label: "Not available",
        task_cost_status: "unavailable",
        loop_stage: "ready_to_send",
        latest_action: null,
        latest_mind_reply_excerpt: null,
      })
    ).toContain("approved_not_sent");

    expect(
      deriveMindLoopAttentionReasons({
        handoff_id: "h1",
        approval_status: "approved",
        send_status: "sent",
        delivery_status: null,
        delivery_status_label: "Pending",
        mind_response_status_label: "Not available",
        task_cost_status: "unavailable",
        loop_stage: "sent_awaiting_receipt",
        latest_action: null,
        latest_mind_reply_excerpt: null,
      })
    ).toContain("sent_no_delivery_receipt");

    expect(
      deriveMindLoopAttentionReasons({
        handoff_id: "h1",
        approval_status: "approved",
        send_status: "sent",
        delivery_status: "unknown_status",
        delivery_status_label: "Not available",
        mind_response_status_label: "Not available",
        task_cost_status: "unavailable",
        loop_stage: "sent_awaiting_receipt",
        latest_action: null,
        latest_mind_reply_excerpt: null,
      })
    ).toContain("delivery_not_verified");

    expect(
      deriveMindLoopAttentionReasons({
        handoff_id: "h1",
        approval_status: "approved",
        send_status: "sent",
        delivery_status: "delivery_confirmed_from_send_event",
        delivery_status_label: "Verified",
        mind_response_status_label: "Pending",
        task_cost_status: "unavailable",
        loop_stage: "delivery_verified_awaiting_response",
        latest_action: null,
        latest_mind_reply_excerpt: null,
      })
    ).toContain("mind_response_missing");

    expect(deriveMindLoopAttentionReasons(completeNoActionInput)).toContain(
      "loop_complete_no_action"
    );

    expect(
      deriveMindLoopAttentionReasons({
        ...completeNoActionInput,
        latest_action: "Review recommended for claim wording",
        latest_mind_reply_excerpt: "Review recommended for claim wording.",
      })
    ).toContain("loop_complete_action_recommended");

    expect(
      deriveMindLoopAttentionReasons({
        ...completeNoActionInput,
        task_cost_status: "unavailable",
      })
    ).toContain("cost_report_unavailable");

    expect(
      deriveMindLoopAttentionReasons({
        ...completeNoActionInput,
        task_cost_status: "malformed",
      })
    ).toContain("cost_report_malformed");
  });

  it("orders attention reasons by stable priority", () => {
    const reasons = deriveMindLoopAttentionReasons({
      handoff_id: "h1",
      approval_status: "pending_review",
      send_status: "ready",
      delivery_status: null,
      delivery_status_label: "Not available",
      mind_response_status_label: "Not available",
      task_cost_status: "unavailable",
      loop_stage: "pending_approval",
      latest_action: null,
      latest_mind_reply_excerpt: null,
    });

    expect(reasons[0]).toBe("pending_approval");
    expect(reasons).toHaveLength(1);
  });

  it("complete loop with no action does not need attention", () => {
    const view = buildMindLoopAttentionView(completeNoActionInput);

    expect(view.primary_reason).toBe("loop_complete_no_action");
    expect(view.needs_attention).toBe(false);
    expect(mindLoopAttentionReasonsNeedAttention(view.reason_codes)).toBe(false);
  });

  it("complete loop with action recommendation needs attention", () => {
    const view = buildMindLoopAttentionView({
      ...completeNoActionInput,
      latest_action: "Review recommended",
      latest_mind_reply_excerpt: "Claim wording update recommended for monitored family.",
    });

    expect(view.primary_reason).toBe("loop_complete_action_recommended");
    expect(view.needs_attention).toBe(true);
    expect(view.operator_hint).toBe("Review Mind recommendation");
  });

  it("exposes human-readable labels and operator hints", () => {
    const view = buildMindLoopAttentionView({
      handoff_id: null,
      approval_status: null,
      send_status: null,
      delivery_status: null,
      delivery_status_label: "Not available",
      mind_response_status_label: "Not available",
      task_cost_status: "unavailable",
      loop_stage: "no_handoff",
      latest_action: null,
      latest_mind_reply_excerpt: null,
    });

    expect(view.primary_label).toBe(MIND_LOOP_ATTENTION_REASON_META.no_handoff.label);
    expect(view.operator_hint).toBe("Review digest and create handoff");
  });

  it("filters attention rows", () => {
    expect(matchesMindLoopAttentionFilter({ needs_attention: true }, "needs_attention")).toBe(
      true
    );
    expect(matchesMindLoopAttentionFilter({ needs_attention: false }, "no_attention")).toBe(true);
    expect(matchesMindLoopAttentionFilter({ needs_attention: true }, "no_attention")).toBe(false);
    expect(matchesMindLoopAttentionFilter({ needs_attention: true }, "all")).toBe(true);
  });
});
