import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetExternalMindHandoffById = vi.fn();
const mockRecordExternalMindHandoffSendAttempt = vi.fn();
const mockExecuteExternalMindHandoffTransport = vi.fn();

vi.mock("@/lib/watch/external-mind-handoff-store", () => ({
  getExternalMindHandoffById: (...args: unknown[]) => mockGetExternalMindHandoffById(...args),
  recordExternalMindHandoffSendAttempt: (...args: unknown[]) =>
    mockRecordExternalMindHandoffSendAttempt(...args),
}));

vi.mock("@/lib/watch/external-mind-handoff-sender", () => ({
  executeExternalMindHandoffTransport: (...args: unknown[]) =>
    mockExecuteExternalMindHandoffTransport(...args),
}));

import { sendExternalMindHandoff } from "@/lib/watch/external-mind-handoff-send";

const operatorAccess = {
  authorized: true,
  mode: "operator" as const,
  userId: "user-123",
  workspaceIds: ["demo-workspace-spa-menu"],
};

const otherWorkspaceAccess = {
  authorized: true,
  mode: "operator" as const,
  userId: "user-456",
  workspaceIds: ["other-workspace"],
};

const payload = {
  payload_version: "mind_digest_payload_v1",
  workspace_id: "demo-workspace-spa-menu",
  digest_id: "digest-uuid-001",
  handoff_type: "digest_summary",
  destination: "test_sink",
  period_start: "2026-05-25T00:00:00.000Z",
  period_end: "2026-05-31T23:59:59.999Z",
  digest_title: "Evidence Mind Digest",
  digest_summary: "Summary",
  highest_risk_implication: "monitor",
  recommended_focus: "Continue monitoring.",
  counts: {
    watchlists_checked_count: 0,
    new_alerts_count: 0,
    review_items_count: 0,
    briefs_count: 0,
    affected_claim_families_count: 0,
    affected_client_claims_count: 0,
  },
  items: [],
  affected_claim_families: [],
  affected_client_claims: [],
  referenced_evidence_briefs: [],
  referenced_review_items: [],
  generated_at: "2026-05-31T12:00:00.000Z",
  source_system: "lucient_evidence_mind",
  phase: "31",
};

const readyHandoff = {
  id: "handoff-uuid-001",
  workspace_id: "demo-workspace-spa-menu",
  digest_id: "digest-uuid-001",
  handoff_type: "digest_summary",
  destination: "test_sink",
  payload_version: "mind_digest_payload_v1",
  payload_json: payload,
  status: "ready",
  created_at: "2026-05-31T12:00:00.000Z",
  updated_at: "2026-05-31T12:00:00.000Z",
  sent_at: null,
  send_attempted_at: null,
  send_result_json: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetExternalMindHandoffById.mockResolvedValue({ handoff: readyHandoff });
  mockExecuteExternalMindHandoffTransport.mockResolvedValue({
    kind: "sent",
    sentAt: "2026-05-31T13:00:00.000Z",
    sendResult: {
      result: "test_sink_sent",
      destination: "test_sink",
      payload_version: "mind_digest_payload_v1",
      timestamp: "2026-05-31T13:00:00.000Z",
      test_sink_only: true,
    },
  });
  mockRecordExternalMindHandoffSendAttempt.mockResolvedValue({
    ok: true,
    handoff: {
      ...readyHandoff,
      status: "sent",
      sent_at: "2026-05-31T13:00:00.000Z",
      send_attempted_at: "2026-05-31T13:00:00.000Z",
      send_result_json: {
        result: "test_sink_sent",
        destination: "test_sink",
        payload_version: "mind_digest_payload_v1",
        timestamp: "2026-05-31T13:00:00.000Z",
        test_sink_only: true,
      },
    },
  });
});

describe("external-mind-handoff-send", () => {
  it("refuses missing handoff", async () => {
    mockGetExternalMindHandoffById.mockResolvedValueOnce({ handoff: null });

    const result = await sendExternalMindHandoff("missing-handoff", operatorAccess);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("handoff_not_found");
    }
  });

  it("refuses cross-workspace access", async () => {
    mockGetExternalMindHandoffById.mockResolvedValueOnce({
      handoff: null,
      error: "forbidden",
    });

    const result = await sendExternalMindHandoff("handoff-uuid-001", otherWorkspaceAccess);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("forbidden");
    }
  });

  it("refuses non-ready handoff", async () => {
    mockGetExternalMindHandoffById.mockResolvedValueOnce({
      handoff: { ...readyHandoff, status: "draft" },
    });

    const result = await sendExternalMindHandoff("handoff-uuid-001", operatorAccess);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("handoff_not_ready");
    }
  });

  it("refuses already sent handoff", async () => {
    mockGetExternalMindHandoffById.mockResolvedValueOnce({
      handoff: {
        ...readyHandoff,
        status: "sent",
        sent_at: "2026-05-31T13:00:00.000Z",
        send_result_json: {
          result: "test_sink_sent",
          destination: "test_sink",
          payload_version: "mind_digest_payload_v1",
          timestamp: "2026-05-31T13:00:00.000Z",
          test_sink_only: true,
        },
      },
    });

    const result = await sendExternalMindHandoff("handoff-uuid-001", operatorAccess);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("already_sent");
    }
  });

  it("marks test_sink handoff sent with privacy-safe send result", async () => {
    const result = await sendExternalMindHandoff("handoff-uuid-001", operatorAccess);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.handoff.status).toBe("sent");
      expect(result.handoff.sent_at).toBe("2026-05-31T13:00:00.000Z");
      expect(result.sendResult.result).toBe("test_sink_sent");
      expect(result.sendResult.test_sink_only).toBe(true);
    }

    expect(mockRecordExternalMindHandoffSendAttempt).toHaveBeenCalledWith(
      "handoff-uuid-001",
      operatorAccess,
      expect.objectContaining({
        status: "sent",
        send_result_json: expect.objectContaining({ result: "test_sink_sent" }),
      })
    );
  });

  it("records blocked external send without changing status to sent", async () => {
    mockGetExternalMindHandoffById.mockResolvedValueOnce({
      handoff: { ...readyHandoff, destination: "animoca_mind" },
    });
    mockExecuteExternalMindHandoffTransport.mockResolvedValueOnce({
      kind: "blocked",
      error: "send_disabled",
      sendResult: {
        result: "send_disabled",
        destination: "animoca_mind",
        payload_version: "mind_digest_payload_v1",
        timestamp: "2026-05-31T13:00:00.000Z",
      },
    });
    mockRecordExternalMindHandoffSendAttempt.mockResolvedValueOnce({
      ok: true,
      handoff: {
        ...readyHandoff,
        destination: "animoca_mind",
        send_attempted_at: "2026-05-31T13:00:00.000Z",
        send_result_json: {
          result: "send_disabled",
          destination: "animoca_mind",
          payload_version: "mind_digest_payload_v1",
          timestamp: "2026-05-31T13:00:00.000Z",
        },
      },
    });

    const result = await sendExternalMindHandoff("handoff-uuid-001", operatorAccess);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("send_disabled");
    }

    expect(mockRecordExternalMindHandoffSendAttempt).toHaveBeenCalledWith(
      "handoff-uuid-001",
      operatorAccess,
      expect.objectContaining({ status: "ready" })
    );
  });
});
