import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockListEvidenceMindDigests = vi.fn();
const mockListExternalMindHandoffs = vi.fn();
const mockGetExternalMindHandoffReceiptForHandoff = vi.fn();
const mockSendExternalMindHandoff = vi.fn();
const mockFetchHelloMindsHandoffResponsePhase41B = vi.fn();

vi.mock("@/lib/watch/evidence-mind-digest-store", () => ({
  listEvidenceMindDigests: (...args: unknown[]) => mockListEvidenceMindDigests(...args),
}));

vi.mock("@/lib/watch/external-mind-handoff-store", () => ({
  listExternalMindHandoffs: (...args: unknown[]) => mockListExternalMindHandoffs(...args),
}));

vi.mock("@/lib/watch/external-mind-handoff-receipt-store", () => ({
  getExternalMindHandoffReceiptForHandoff: (...args: unknown[]) =>
    mockGetExternalMindHandoffReceiptForHandoff(...args),
}));

vi.mock("@/lib/watch/external-mind-handoff-send", () => ({
  sendExternalMindHandoff: (...args: unknown[]) => mockSendExternalMindHandoff(...args),
}));

vi.mock("@/lib/watch/external-mind-handoff-receipt-fetch", () => ({
  fetchHelloMindsHandoffResponsePhase41B: (...args: unknown[]) =>
    mockFetchHelloMindsHandoffResponsePhase41B(...args),
}));

import { CURRENT_WATCH_PHASE } from "@/lib/watch/watch-phase";
import {
  buildMindLoopListApiResponse,
  buildMindLoopListItem,
  isPrivacySafeMindLoopListPayload,
  MIND_LOOP_API_ROUTE,
  MIND_LOOP_PRIVATE_FIELDS,
  parseMindLoopListFilters,
} from "./mind-loop-api";

const breakGlassAccess = {
  authorized: true,
  mode: "break_glass" as const,
  workspaceIds: null,
} as const;

const validatedDigest = {
  id: "bc2ea900-6004-4711-b879-33c7bad87a2c",
  workspace_id: "demo-workspace-spa-menu",
  period_start: "2026-06-15T00:00:00.000Z",
  period_end: "2026-06-21T23:59:59.999Z",
  digest_title: "Evidence Mind Digest",
  digest_summary: "Weekly digest summary",
  watchlists_checked_count: 1,
  new_alerts_count: 0,
  review_items_count: 0,
  briefs_count: 0,
  affected_claim_families_count: 1,
  affected_client_claims_count: 2,
  highest_risk_implication: "none",
  recommended_focus: "No immediate action required. Continue monitoring.",
  status: "reviewed",
  generation_source: "manual",
  created_at: "2026-06-22T10:00:00.000Z",
  updated_at: "2026-06-23T10:00:00.000Z",
};

const validatedHandoff = {
  id: "0fd4ee13-740b-41cd-be4c-1139442bf082",
  workspace_id: "demo-workspace-spa-menu",
  digest_id: validatedDigest.id,
  handoff_type: "mind_digest",
  destination: "hellominds",
  payload_version: "mind_digest_payload_v1",
  status: "sent",
  created_at: "2026-06-22T11:00:00.000Z",
  updated_at: "2026-06-23T09:00:00.000Z",
  sent_at: "2026-06-22T13:00:00.000Z",
  send_attempted_at: "2026-06-22T13:00:00.000Z",
  send_result_json: {
    result: "external_sent",
    http_status: 200,
    conversation_alias: "lucient-em-ho-0fd4ee13-740b-41cd-be4c-1139442bf082",
  },
  review_status: "approved",
  reviewed_at: "2026-06-22T12:00:00.000Z",
  reviewed_by_actor_type: "operator",
  reviewed_by_actor_email: null,
  review_note: null,
  approved_at: "2026-06-22T12:00:00.000Z",
  approved_by_actor_type: "operator",
  approved_by_actor_email: null,
  approval_note: null,
};

const validatedReceipt = {
  id: "receipt-uuid-001",
  workspace_id: "demo-workspace-spa-menu",
  handoff_id: validatedHandoff.id,
  digest_id: validatedDigest.id,
  destination: "hellominds",
  provider: "hellominds",
  conversation_id_suffix: "df11",
  message_id_suffix: "ab12",
  receipt_status: "fetched_from_hellominds",
  http_status: 200,
  receipt_source: "hellominds_read_api",
  verified_at: "2026-06-23T10:00:00.000Z",
  response_excerpt:
    "Trent, I've received and processed the Evidence Mind Digest for Jun 15-21, 2026.\n\nNo immediate action required. Continuing routine monitoring.",
  metadata: {
    conversation_alias: "lucient-em-ho-0fd4ee13-740b-41cd-be4c-1139442bf082",
    mind_reply_state: "mind_reply_found",
    cost_report_present: true,
    cost_report_excerpt:
      "💡 LUCIENT TASK COST REPORT 📊\n• Category: Monitoring/Digest Processing\n• Total Credits: 1.79",
    cost_report_truncated: false,
    retrieval_timestamp: "2026-06-23T10:30:00.000Z",
    latest_fingerprint: "0001782125069185_f2157588-7bd9-428f-af74-cdb32d5e2d8b",
  },
  created_at: "2026-06-23T10:00:00.000Z",
  updated_at: "2026-06-23T10:30:00.000Z",
};

beforeEach(() => {
  delete process.env.EXTERNAL_MIND_LIVE_SEND;
  mockListEvidenceMindDigests.mockResolvedValue({ digests: [validatedDigest] });
  mockListExternalMindHandoffs.mockResolvedValue({ handoffs: [validatedHandoff] });
  mockGetExternalMindHandoffReceiptForHandoff.mockResolvedValue({ receipt: validatedReceipt });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("mind-loop-api", () => {
  it("parseMindLoopListFilters reads attention query param", () => {
    expect(
      parseMindLoopListFilters(
        new URLSearchParams("attention=needs_attention&workspace_id=demo-workspace-spa-menu")
      ).attention
    ).toBe("needs_attention");
  });

  it("parseMindLoopListFilters reads query params with hellominds default", () => {
    expect(
      parseMindLoopListFilters(
        new URLSearchParams(
          "workspace_id=demo-workspace-spa-menu&limit=10&loop_status=retrieved"
        )
      )
    ).toEqual({
      workspace_id: "demo-workspace-spa-menu",
      status: undefined,
      destination: "hellominds",
      limit: 10,
      loop_status: "retrieved",
      attention: undefined,
    });
  });

  it("buildMindLoopListApiResponse returns validated production digest with expected statuses", async () => {
    const response = await buildMindLoopListApiResponse(
      { workspace_id: "demo-workspace-spa-menu" },
      breakGlassAccess
    );

    expect(response.ok).toBe(true);
    expect(response.phase).toBe(CURRENT_WATCH_PHASE);
    expect(response.route).toBe(MIND_LOOP_API_ROUTE);
    expect(response.items).toHaveLength(1);
    expect(response.summary.total_digests).toBe(1);
    expect(response.summary.complete_loops).toBe(1);
    expect(response.summary.needs_attention).toBe(0);

    const item = response.items[0];
    expect(item.digest_id).toBe("bc2ea900-6004-4711-b879-33c7bad87a2c");
    expect(item.handoff_id).toBe("0fd4ee13-740b-41cd-be4c-1139442bf082");
    expect(item.workspace_id).toBe("demo-workspace-spa-menu");
    expect(item.handoff_destination).toBe("hellominds");
    expect(item.digest_period_label).toMatch(/Jun 15.*Jun 21.*2026/);
    expect(item.handoff_destination_label).toBe("HelloMinds");
    expect(item.approval_status_label).toBe("Approved");
    expect(item.send_status_label).toBe("Sent");
    expect(item.delivery_status_label).toBe("Verified");
    expect(item.mind_response_status_label).toBe("Retrieved");
    expect(item.latest_action).toBe("No immediate action required");
    expect(item.task_cost?.total_credits).toBe(1.79);
    expect(item.task_cost_status).toBe("available");
    expect(item.loop_stage).toBe("mind_response_retrieved");
    expect(item.needs_attention).toBe(false);
    expect(item.attention.primary_reason).toBe("loop_complete_no_action");
    expect(item.attention.operator_hint).toBe("No operator action required");
    expect(item.attention.reason_codes).toContain("loop_complete_no_action");
    expect(item.retrieval_timestamp).toBe("2026-06-23T10:30:00.000Z");
  });

  it("filters items by attention without invoking send paths", async () => {
    const needsAttention = await buildMindLoopListApiResponse(
      { attention: "needs_attention" },
      breakGlassAccess
    );
    expect(needsAttention.items).toHaveLength(0);

    const noAttention = await buildMindLoopListApiResponse(
      { attention: "no_attention" },
      breakGlassAccess
    );
    expect(noAttention.items).toHaveLength(1);
    expect(mockSendExternalMindHandoff).not.toHaveBeenCalled();
    expect(mockFetchHelloMindsHandoffResponsePhase41B).not.toHaveBeenCalled();
  });

  it("filters items by loop_status without invoking send paths", async () => {
    const response = await buildMindLoopListApiResponse(
      { loop_status: "retrieved" },
      breakGlassAccess
    );

    expect(response.items).toHaveLength(1);
    expect(response.loop_status).toBe("retrieved");

    const empty = await buildMindLoopListApiResponse(
      { loop_status: "needs_attention" },
      breakGlassAccess
    );
    expect(empty.items).toHaveLength(0);
    expect(mockSendExternalMindHandoff).not.toHaveBeenCalled();
  });

  it("does not require EXTERNAL_MIND_LIVE_SEND=true", async () => {
    process.env.EXTERNAL_MIND_LIVE_SEND = "false";

    const response = await buildMindLoopListApiResponse({}, breakGlassAccess);

    expect(response.ok).toBe(true);
    expect(response.items).toHaveLength(1);
    expect(mockSendExternalMindHandoff).not.toHaveBeenCalled();
    expect(mockFetchHelloMindsHandoffResponsePhase41B).not.toHaveBeenCalled();
  });

  it("does not return raw payload_json, metadata blobs, secrets, or actor emails", async () => {
    const response = await buildMindLoopListApiResponse({}, breakGlassAccess);
    const serialized = JSON.stringify(response);

    for (const field of MIND_LOOP_PRIVATE_FIELDS) {
      expect(serialized).not.toContain(`"${field}"`);
    }

    expect(serialized).not.toContain("payload_json");
    expect(serialized).not.toContain("bearer");
    expect(serialized).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(serialized).not.toContain("reviewed_by_actor_email");
    expect(serialized).not.toContain("approved_by_actor_email");
    expect(serialized).not.toContain("conversation_alias");
    expect(serialized).not.toContain("latest_fingerprint");
    expect(isPrivacySafeMindLoopListPayload(response.items[0] as Record<string, unknown>)).toBe(
      true
    );
  });

  it("returns safe summarized cost report metadata only", async () => {
    const response = await buildMindLoopListApiResponse({}, breakGlassAccess);
    const taskCost = response.items[0].task_cost;

    expect(taskCost).toEqual({
      total_credits: 1.79,
      major_cost_lines: ["Category: Monitoring/Digest Processing"],
      remaining_balance: null,
    });
    expect(JSON.stringify(taskCost)).not.toContain("LUCIENT TASK COST REPORT");
  });

  it("degrades gracefully when receipt and Mind response are missing", async () => {
    mockGetExternalMindHandoffReceiptForHandoff.mockResolvedValue({ receipt: null });

    const response = await buildMindLoopListApiResponse({}, breakGlassAccess);
    const item = response.items[0];

    expect(item.delivery_status_label).toBe("Pending");
    expect(item.mind_response_status_label).toBe("Not available");
    expect(item.latest_action).toBe("No immediate action required");
    expect(item.task_cost).toBeNull();
    expect(item.task_cost_status).toBe("unavailable");
    expect(item.latest_mind_reply_excerpt).toBeNull();
    expect(item.loop_stage).toBe("sent_awaiting_receipt");
    expect(item.needs_attention).toBe(true);
    expect(item.attention.primary_reason).toBe("sent_no_delivery_receipt");
  });

  it("degrades gracefully when digest has no handoff", () => {
    const item = buildMindLoopListItem({
      digest: validatedDigest,
      handoff: null,
      receipt: null,
    });

    expect(item.handoff_id).toBeNull();
    expect(item.approval_status_label).toBe("Not available");
    expect(item.send_status_label).toBe("Not available");
    expect(item.loop_stage).toBe("no_handoff");
    expect(item.needs_attention).toBe(true);
    expect(item.attention.primary_reason).toBe("no_handoff");
  });

  it("degrades gracefully for malformed cost report excerpt", () => {
    const item = buildMindLoopListItem({
      digest: validatedDigest,
      handoff: validatedHandoff,
      receipt: {
        ...validatedReceipt,
        metadata: {
          ...validatedReceipt.metadata,
          cost_report_present: true,
          cost_report_excerpt: "corrupted billing blob without credits",
        },
      },
    });

    expect(item.task_cost).toBeNull();
    expect(item.task_cost_status).toBe("malformed");
    expect(item.attention.reason_codes).toContain("cost_report_malformed");
  });

  it("buildMindLoopListItem omits private handoff fields", () => {
    const item = buildMindLoopListItem({
      digest: validatedDigest,
      handoff: validatedHandoff,
      receipt: validatedReceipt,
    });

    expect(item).not.toHaveProperty("payload_json");
    expect(item).not.toHaveProperty("metadata");
    expect(item).not.toHaveProperty("send_result_json");
    expect(isPrivacySafeMindLoopListPayload(item as Record<string, unknown>)).toBe(true);
  });
});
