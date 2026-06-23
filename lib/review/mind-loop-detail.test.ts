import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockGetEvidenceMindDigestById = vi.fn();
const mockListExternalMindHandoffs = vi.fn();
const mockGetExternalMindHandoffReceiptForHandoff = vi.fn();
const mockSendExternalMindHandoff = vi.fn();
const mockFetchHelloMindsHandoffResponsePhase41B = vi.fn();

vi.mock("@/lib/watch/evidence-mind-digest-store", () => ({
  getEvidenceMindDigestById: (...args: unknown[]) => mockGetEvidenceMindDigestById(...args),
  isEvidenceMindDigestPersistenceConfigured: () => true,
}));

vi.mock("@/lib/watch/external-mind-handoff-store", () => ({
  listExternalMindHandoffs: (...args: unknown[]) => mockListExternalMindHandoffs(...args),
  isExternalMindHandoffPersistenceConfigured: () => true,
}));

vi.mock("@/lib/watch/external-mind-handoff-receipt-store", () => ({
  getExternalMindHandoffReceiptForHandoff: (...args: unknown[]) =>
    mockGetExternalMindHandoffReceiptForHandoff(...args),
  isExternalMindHandoffReceiptPersistenceConfigured: () => true,
}));

vi.mock("@/lib/watch/external-mind-handoff-send", () => ({
  sendExternalMindHandoff: (...args: unknown[]) => mockSendExternalMindHandoff(...args),
}));

vi.mock("@/lib/watch/external-mind-handoff-receipt-fetch", () => ({
  fetchHelloMindsHandoffResponsePhase41B: (...args: unknown[]) =>
    mockFetchHelloMindsHandoffResponsePhase41B(...args),
}));

import { buildMindLoopDetailPageData } from "./mind-loop-detail-page";
import {
  buildMindLoopDetailApiResponse,
  MIND_LOOP_PRIVATE_FIELDS,
  mindLoopDetailApiRoute,
} from "./mind-loop-api";
import { buildMindLoopTimeline, formatMindLoopShortId } from "./mind-loop-ui";

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
    conversation_alias: "lucient-em-ho-0fd4ee13-740b-41cd-be4c-1139442bf082",
  },
  review_status: "approved",
  reviewed_at: "2026-06-22T12:00:00.000Z",
  reviewed_by_actor_type: "operator",
  approved_at: "2026-06-22T12:00:00.000Z",
  approved_by_actor_type: "operator",
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
    retrieval_timestamp: "2026-06-23T10:30:00.000Z",
    latest_fingerprint: "0001782125069185_f2157588-7bd9-428f-af74-cdb32d5e2d8b",
  },
  created_at: "2026-06-23T10:00:00.000Z",
  updated_at: "2026-06-23T10:30:00.000Z",
};

beforeEach(() => {
  delete process.env.EXTERNAL_MIND_LIVE_SEND;
  mockGetEvidenceMindDigestById.mockResolvedValue({ digest: validatedDigest });
  mockListExternalMindHandoffs.mockResolvedValue({ handoffs: [validatedHandoff] });
  mockGetExternalMindHandoffReceiptForHandoff.mockResolvedValue({ receipt: validatedReceipt });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("mind-loop detail", () => {
  it("formatMindLoopShortId shortens UUIDs for display", () => {
    expect(formatMindLoopShortId("bc2ea900-6004-4711-b879-33c7bad87a2c")).toBe(
      "bc2ea900…7a2c"
    );
    expect(formatMindLoopShortId(null)).toBeNull();
  });

  it("buildMindLoopDetailApiResponse returns validated production digest safely", async () => {
    const response = await buildMindLoopDetailApiResponse(
      validatedDigest.id,
      { destination: "hellominds" },
      breakGlassAccess
    );

    expect(response.ok).toBe(true);
    if (!response.ok) {
      return;
    }

    expect(response.route).toBe(mindLoopDetailApiRoute(validatedDigest.id));
    expect(response.item.digest_id).toBe(validatedDigest.id);
    expect(response.item.digest_id_short).toBe("bc2ea900…7a2c");
    expect(response.item.handoff_id_short).toBe("0fd4ee13…f082");
    expect(response.item.loop_stage).toBe("mind_response_retrieved");
    expect(response.item.needs_attention).toBe(false);
    expect(response.item.attention.primary_reason).toBe("loop_complete_no_action");
    expect(response.item.attention.operator_hint).toBe("No operator action required");
    expect(response.item.latest_action).toBe("No immediate action required");
    expect(response.item.task_cost?.total_credits).toBe(1.79);
    expect(response.item.task_cost_status).toBe("available");
  });

  it("buildMindLoopDetailApiResponse returns 404 for missing digest", async () => {
    mockGetEvidenceMindDigestById.mockResolvedValue({ digest: null });

    const response = await buildMindLoopDetailApiResponse(
      "missing-digest-id",
      {},
      breakGlassAccess
    );

    expect(response.ok).toBe(false);
    if (response.ok) {
      return;
    }

    expect(response.status).toBe(404);
    expect(response.error).toBe("digest_not_found");
  });

  it("timeline statuses are complete for validated production loop", async () => {
    const response = await buildMindLoopDetailApiResponse(
      validatedDigest.id,
      {},
      breakGlassAccess
    );

    expect(response.ok).toBe(true);
    if (!response.ok) {
      return;
    }

    const timeline = response.item.timeline;
    expect(timeline.find((e) => e.stage === "digest_created")?.status).toBe("complete");
    expect(timeline.find((e) => e.stage === "handoff_created")?.status).toBe("complete");
    expect(timeline.find((e) => e.stage === "approved")?.status).toBe("complete");
    expect(timeline.find((e) => e.stage === "sent")?.status).toBe("complete");
    expect(timeline.find((e) => e.stage === "delivery_verified")?.status).toBe("complete");
    expect(timeline.find((e) => e.stage === "mind_response_retrieved")?.status).toBe("complete");
    expect(timeline.find((e) => e.stage === "cost_report_parsed")?.status).toBe("complete");
  });

  it("timeline statuses reflect partial/missing loop", () => {
    const timeline = buildMindLoopTimeline({
      digest_created_at: validatedDigest.created_at,
      handoff: null,
      receipt: null,
      delivery_status_label: "Not available",
      mind_response_status_label: "Not available",
      task_cost_status: "unavailable",
      retrieval_timestamp: null,
    });

    expect(timeline.find((e) => e.stage === "digest_created")?.status).toBe("complete");
    expect(timeline.find((e) => e.stage === "handoff_created")?.status).toBe("unavailable");
    expect(timeline.find((e) => e.stage === "approved")?.status).toBe("unavailable");
    expect(timeline.find((e) => e.stage === "sent")?.status).toBe("unavailable");
  });

  it("timeline shows pending stages for sent handoff without receipt", () => {
    const timeline = buildMindLoopTimeline({
      digest_created_at: validatedDigest.created_at,
      handoff: {
        created_at: validatedHandoff.created_at,
        approved_at: validatedHandoff.approved_at,
        sent_at: validatedHandoff.sent_at,
        review_status: "approved",
        status: "sent",
      },
      receipt: null,
      delivery_status_label: "Pending",
      mind_response_status_label: "Not available",
      task_cost_status: "unavailable",
      retrieval_timestamp: null,
    });

    expect(timeline.find((e) => e.stage === "sent")?.status).toBe("complete");
    expect(timeline.find((e) => e.stage === "delivery_verified")?.status).toBe("pending");
    expect(timeline.find((e) => e.stage === "mind_response_retrieved")?.status).toBe("unavailable");
  });

  it("attention panel fields for no-action complete loop", async () => {
    const response = await buildMindLoopDetailApiResponse(
      validatedDigest.id,
      {},
      breakGlassAccess
    );

    expect(response.ok).toBe(true);
    if (!response.ok) {
      return;
    }

    expect(response.item.needs_attention).toBe(false);
    expect(response.item.attention.primary_reason).toBe("loop_complete_no_action");
    expect(response.item.attention.operator_hint).toBe("No operator action required");
  });

  it("attention panel fields for needs-attention loop", async () => {
    mockGetExternalMindHandoffReceiptForHandoff.mockResolvedValue({ receipt: null });

    const response = await buildMindLoopDetailApiResponse(
      validatedDigest.id,
      {},
      breakGlassAccess
    );

    expect(response.ok).toBe(true);
    if (!response.ok) {
      return;
    }

    expect(response.item.needs_attention).toBe(true);
    expect(response.item.attention.primary_reason).toBe("sent_no_delivery_receipt");
    expect(response.item.attention.primary_label).toBe("Sent, awaiting delivery verification");
  });

  it("cost summary for available, unavailable, and malformed cases", async () => {
    const available = await buildMindLoopDetailApiResponse(
      validatedDigest.id,
      {},
      breakGlassAccess
    );
    expect(available.ok).toBe(true);
    if (!available.ok) {
      return;
    }
    expect(available.item.task_cost_status).toBe("available");
    expect(available.item.task_cost?.total_credits).toBe(1.79);

    mockGetExternalMindHandoffReceiptForHandoff.mockResolvedValue({ receipt: null });
    const unavailable = await buildMindLoopDetailApiResponse(
      validatedDigest.id,
      {},
      breakGlassAccess
    );
    expect(unavailable.ok).toBe(true);
    if (!unavailable.ok) {
      return;
    }
    expect(unavailable.item.task_cost_status).toBe("unavailable");
    expect(unavailable.item.task_cost).toBeNull();

    mockGetExternalMindHandoffReceiptForHandoff.mockResolvedValue({
      receipt: {
        ...validatedReceipt,
        metadata: {
          ...validatedReceipt.metadata,
          cost_report_present: true,
          cost_report_excerpt: "corrupted billing blob",
        },
      },
    });
    const malformed = await buildMindLoopDetailApiResponse(
      validatedDigest.id,
      {},
      breakGlassAccess
    );
    expect(malformed.ok).toBe(true);
    if (!malformed.ok) {
      return;
    }
    expect(malformed.item.task_cost_status).toBe("malformed");
    expect(malformed.item.task_cost).toBeNull();
    expect(malformed.item.timeline.find((e) => e.stage === "cost_report_parsed")?.status).toBe(
      "unavailable"
    );
  });

  it("does not return raw payload_json, metadata blobs, secrets, or actor emails", async () => {
    const response = await buildMindLoopDetailApiResponse(
      validatedDigest.id,
      {},
      breakGlassAccess
    );

    const serialized = JSON.stringify(response);

    for (const field of MIND_LOOP_PRIVATE_FIELDS) {
      expect(serialized).not.toContain(`"${field}"`);
    }

    expect(serialized).not.toContain("conversation_alias");
    expect(serialized).not.toContain("latest_fingerprint");
    expect(serialized).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(serialized).not.toContain("bearer");
  });

  it("does not require EXTERNAL_MIND_LIVE_SEND or invoke send paths", async () => {
    process.env.EXTERNAL_MIND_LIVE_SEND = "false";

    await buildMindLoopDetailApiResponse(validatedDigest.id, {}, breakGlassAccess);

    expect(mockSendExternalMindHandoff).not.toHaveBeenCalled();
    expect(mockFetchHelloMindsHandoffResponsePhase41B).not.toHaveBeenCalled();
  });

  it("buildMindLoopDetailPageData maps fields correctly", async () => {
    const pageData = await buildMindLoopDetailPageData(
      validatedDigest.id,
      { destination: "hellominds" },
      breakGlassAccess
    );

    expect(pageData.configured).toBe(true);
    expect(pageData.notFound).toBe(false);
    expect(pageData.item?.digest_id).toBe(validatedDigest.id);
    expect(pageData.item?.timeline).toHaveLength(7);
    expect(pageData.destination).toBe("hellominds");
  });

  it("buildMindLoopDetailPageData sets notFound when digest missing", async () => {
    mockGetEvidenceMindDigestById.mockResolvedValue({ digest: null });

    const pageData = await buildMindLoopDetailPageData(
      "missing-id",
      {},
      breakGlassAccess
    );

    expect(pageData.notFound).toBe(true);
    expect(pageData.item).toBeNull();
  });
});
