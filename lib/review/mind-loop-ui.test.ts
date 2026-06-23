import { describe, expect, it } from "vitest";

import {
  computeMindLoopSummaryTiles,
  extractMindLoopActionRecommendation,
  formatMindLoopApprovalStatusLabel,
  formatMindLoopDeliveryStatusLabel,
  formatMindLoopDigestPeriod,
  formatMindLoopMindResponseStatusLabel,
  formatMindLoopSendStatusLabel,
  formatMindLoopStageLabel,
  formatMindLoopTaskCostDisplay,
  formatMindLoopTimestamp,
  matchesMindLoopLoopStatusFilter,
  mindLoopItemNeedsAttention,
  parseHelloMindsCostReportSummary,
  resolveMindLoopStage,
  resolveMindLoopTaskCostStatus,
} from "./mind-loop-ui";

const baseItem = {
  handoff_id: "handoff-001",
  approval_status: "approved",
  send_status: "sent",
  delivery_status_label: "Verified",
  mind_response_status_label: "Retrieved",
};

describe("mind-loop-ui", () => {
  it("formats digest period using UTC calendar dates", () => {
    expect(
      formatMindLoopDigestPeriod("2026-06-15T00:00:00.000Z", "2026-06-21T23:59:59.999Z")
    ).toMatch(/Jun 15.*Jun 21.*2026/);
  });

  it("formats readable status labels", () => {
    expect(formatMindLoopApprovalStatusLabel("approved")).toBe("Approved");
    expect(formatMindLoopSendStatusLabel("sent")).toBe("Sent");
    expect(formatMindLoopDeliveryStatusLabel("delivery_confirmed_from_send_event", "sent")).toBe(
      "Verified"
    );
    expect(
      formatMindLoopMindResponseStatusLabel({
        receiptStatus: "fetched_from_hellominds",
        mindReplyState: "mind_reply_found",
      })
    ).toBe("Retrieved");
    expect(formatMindLoopApprovalStatusLabel(null)).toBe("Not available");
    expect(formatMindLoopDeliveryStatusLabel(null, null)).toBe("Not available");
    expect(
      formatMindLoopMindResponseStatusLabel({
        receiptStatus: null,
        mindReplyState: null,
      })
    ).toBe("Not available");
  });

  it("extracts action recommendation from Mind reply excerpt", () => {
    const reply = `Trent, I've received and processed the Evidence Mind Digest.

No immediate action required. Continuing routine monitoring.`;

    expect(
      extractMindLoopActionRecommendation({
        mindReplyMain: reply,
        recommendedFocus: "Fallback focus",
      })
    ).toBe("No immediate action required");
  });

  it("falls back to digest recommended focus when Mind reply is missing", () => {
    expect(
      extractMindLoopActionRecommendation({
        mindReplyMain: null,
        recommendedFocus: "No immediate action required. Continue monitoring.",
      })
    ).toBe("No immediate action required");
  });

  it("parses safe summarized cost report metadata", () => {
    const summary = parseHelloMindsCostReportSummary(
      "💡 LUCIENT TASK COST REPORT 📊\n• Category: Monitoring/Digest Processing\n• Total Credits: 1.79\n• Remaining Balance: 42.5 credits"
    );

    expect(summary).toEqual({
      total_credits: 1.79,
      major_cost_lines: ["Category: Monitoring/Digest Processing"],
      remaining_balance: "42.5 credits",
    });
  });

  it("returns null cost summary when no cost report is present", () => {
    expect(parseHelloMindsCostReportSummary(null)).toBeNull();
    expect(parseHelloMindsCostReportSummary("Plain reply without billing")).toBeNull();
  });

  it("handles malformed cost report excerpts without throwing", () => {
    expect(parseHelloMindsCostReportSummary("not-a-valid-cost-report")).toBeNull();
    expect(
      resolveMindLoopTaskCostStatus({
        costReportPresent: true,
        costSummary: null,
      })
    ).toBe("malformed");
    expect(
      formatMindLoopTaskCostDisplay({
        task_cost: null,
        task_cost_status: "malformed",
      })
    ).toBe("Unavailable");
    expect(
      formatMindLoopTaskCostDisplay({
        task_cost: null,
        task_cost_status: "unavailable",
      })
    ).toBe("—");
  });

  it("resolves loop stages for graceful operator states", () => {
    expect(
      resolveMindLoopStage({
        handoff_id: null,
        approval_status: null,
        send_status: null,
        delivery_status_label: "Not available",
        mind_response_status_label: "Not available",
      })
    ).toBe("no_handoff");

    expect(
      resolveMindLoopStage({
        handoff_id: "h1",
        approval_status: "pending_review",
        send_status: "ready",
        delivery_status_label: "Not available",
        mind_response_status_label: "Not available",
      })
    ).toBe("pending_approval");

    expect(
      resolveMindLoopStage({
        handoff_id: "h1",
        approval_status: "approved",
        send_status: "ready",
        delivery_status_label: "Not available",
        mind_response_status_label: "Not available",
      })
    ).toBe("ready_to_send");

    expect(
      resolveMindLoopStage({
        handoff_id: "h1",
        approval_status: "approved",
        send_status: "sent",
        delivery_status_label: "Pending",
        mind_response_status_label: "Not available",
      })
    ).toBe("sent_awaiting_receipt");

    expect(
      resolveMindLoopStage({
        handoff_id: "h1",
        approval_status: "approved",
        send_status: "sent",
        delivery_status_label: "Verified",
        mind_response_status_label: "Pending",
      })
    ).toBe("delivery_verified_awaiting_response");

    expect(resolveMindLoopStage(baseItem)).toBe("mind_response_retrieved");
    expect(formatMindLoopStageLabel("mind_response_retrieved")).toContain("retrieved");
  });

  it("computes summary tiles and attention filters", () => {
    const items = [
      {
        ...baseItem,
        loop_stage: "mind_response_retrieved" as const,
        needs_attention: false,
      },
      {
        handoff_id: "handoff-002",
        approval_status: "pending_review",
        send_status: "ready",
        delivery_status_label: "Not available",
        mind_response_status_label: "Not available",
        loop_stage: "pending_approval" as const,
        needs_attention: true,
      },
    ];

    expect(computeMindLoopSummaryTiles(items)).toEqual({
      total_digests: 2,
      complete_loops: 1,
      needs_attention: 1,
      pending_approval: 1,
      awaiting_delivery_verification: 0,
      awaiting_mind_response: 0,
    });

    expect(mindLoopItemNeedsAttention({ ...baseItem, needs_attention: false })).toBe(false);
    expect(
      matchesMindLoopLoopStatusFilter(
        { ...baseItem, send_status: "sent", mind_response_status_label: "Retrieved" },
        "retrieved"
      )
    ).toBe(true);
    expect(
      matchesMindLoopLoopStatusFilter(
        { ...baseItem, send_status: "sent", mind_response_status_label: "Retrieved" },
        "needs_attention"
      )
    ).toBe(false);
  });

  it("extracts common Mind reply action phrases", () => {
    expect(
      extractMindLoopActionRecommendation({
        mindReplyMain: "Evidence risk changed since the prior digest.",
        recommendedFocus: null,
      })
    ).toBe("Evidence risk changed");

    expect(
      extractMindLoopActionRecommendation({
        mindReplyMain: "New alerts detected in monitored claim families.",
        recommendedFocus: null,
      })
    ).toBe("New alerts detected");
  });

  it("formats timestamps readably", () => {
    const formatted = formatMindLoopTimestamp("2026-06-23T10:30:00.000Z");
    expect(formatted).not.toBe("—");
    expect(formatMindLoopTimestamp(null)).toBe("—");
    expect(formatMindLoopTimestamp("not-a-date")).toBe("not-a-date");
  });
});
