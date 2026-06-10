import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetExternalMindHandoffById = vi.fn();
const mockRecordExternalMindHandoffSendAttempt = vi.fn();
const mockExecuteExternalMindHandoffTransport = vi.fn();
const mockRecordExternalMindHandoffSendAttempted = vi.fn();
const mockRecordExternalMindHandoffSendOutcome = vi.fn();

vi.mock("@/lib/watch/external-mind-handoff-store", () => ({
  getExternalMindHandoffById: (...args: unknown[]) => mockGetExternalMindHandoffById(...args),
  recordExternalMindHandoffSendAttempt: (...args: unknown[]) =>
    mockRecordExternalMindHandoffSendAttempt(...args),
}));

vi.mock("@/lib/watch/external-mind-handoff-sender", () => ({
  executeExternalMindHandoffTransport: (...args: unknown[]) =>
    mockExecuteExternalMindHandoffTransport(...args),
}));

vi.mock("@/lib/watch/external-mind-handoff-send-audit", async () => {
  const actual = await vi.importActual<typeof import("@/lib/watch/external-mind-handoff-send-audit")>(
    "@/lib/watch/external-mind-handoff-send-audit"
  );

  return {
    ...actual,
    recordExternalMindHandoffSendAttempted: (...args: unknown[]) =>
      mockRecordExternalMindHandoffSendAttempted(...args),
    recordExternalMindHandoffSendOutcome: (...args: unknown[]) =>
      mockRecordExternalMindHandoffSendOutcome(...args),
  };
});

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
  phase: "37",
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
  review_status: "approved",
  created_at: "2026-05-31T12:00:00.000Z",
  updated_at: "2026-05-31T12:00:00.000Z",
  sent_at: null,
  send_attempted_at: null,
  send_result_json: null,
};

function expectNoSecretsInValue(value: unknown): void {
  const serialized = JSON.stringify(value);
  expect(serialized).not.toContain("secret-key-value");
  expect(serialized).not.toContain("user:pass@");
}

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
    metadata: {
      transport_mode: "test_sink",
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

  it("refuses non-ready handoff and writes blocked audit events", async () => {
    mockGetExternalMindHandoffById.mockResolvedValueOnce({
      handoff: { ...readyHandoff, status: "draft" },
    });

    const result = await sendExternalMindHandoff("handoff-uuid-001", operatorAccess);

    expect(result.ok).toBe(false);
    expect(mockRecordExternalMindHandoffSendAttempted).toHaveBeenCalledOnce();
    expect(mockRecordExternalMindHandoffSendOutcome).toHaveBeenCalledOnce();
    expect(mockExecuteExternalMindHandoffTransport).not.toHaveBeenCalled();
  });

  it("refuses already sent handoff and writes already_sent audit events", async () => {
    mockGetExternalMindHandoffById.mockResolvedValueOnce({
      handoff: {
        ...readyHandoff,
        status: "sent",
        sent_at: "2026-05-31T13:00:00.000Z",
      },
    });

    const result = await sendExternalMindHandoff("handoff-uuid-001", operatorAccess);

    expect(result.ok).toBe(false);
    expect(mockRecordExternalMindHandoffSendAttempted).toHaveBeenCalledOnce();
    expect(mockRecordExternalMindHandoffSendOutcome).toHaveBeenCalledOnce();
    expect(mockExecuteExternalMindHandoffTransport).not.toHaveBeenCalled();
  });

  it("refuses pending_review handoff and writes not_approved audit events", async () => {
    mockGetExternalMindHandoffById.mockResolvedValueOnce({
      handoff: { ...readyHandoff, review_status: "pending_review" },
    });

    const result = await sendExternalMindHandoff("handoff-uuid-001", operatorAccess);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("not_approved");
    }
    expect(mockRecordExternalMindHandoffSendAttempted).toHaveBeenCalledOnce();
    expect(mockRecordExternalMindHandoffSendOutcome).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "send_blocked",
        result: "not_approved",
      })
    );
    expect(mockExecuteExternalMindHandoffTransport).not.toHaveBeenCalled();
  });

  it("refuses rejected handoff and writes not_approved audit events", async () => {
    mockGetExternalMindHandoffById.mockResolvedValueOnce({
      handoff: { ...readyHandoff, review_status: "rejected" },
    });

    const result = await sendExternalMindHandoff("handoff-uuid-001", operatorAccess);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("not_approved");
    }
  });

  it("marks test_sink handoff sent and writes attempted/succeeded audit events", async () => {
    const result = await sendExternalMindHandoff("handoff-uuid-001", operatorAccess);

    expect(result.ok).toBe(true);
    expect(mockRecordExternalMindHandoffSendAttempted).toHaveBeenCalledOnce();
    expect(mockRecordExternalMindHandoffSendOutcome).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "send_succeeded",
        result: "test_sink_sent",
        statusAfter: "sent",
        metadata: expect.objectContaining({
          transport_mode: "test_sink",
        }),
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
      metadata: {
        transport_mode: "blocked",
      },
    });
    mockRecordExternalMindHandoffSendAttempt.mockResolvedValueOnce({
      ok: true,
      handoff: {
        ...readyHandoff,
        destination: "animoca_mind",
        status: "ready",
      },
    });

    const result = await sendExternalMindHandoff("handoff-uuid-001", operatorAccess);

    expect(result.ok).toBe(false);
    expect(mockRecordExternalMindHandoffSendAttempt).toHaveBeenCalledWith(
      "handoff-uuid-001",
      operatorAccess,
      expect.objectContaining({ status: "ready" })
    );
    expect(mockRecordExternalMindHandoffSendOutcome).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "send_blocked",
        result: "send_disabled",
        statusAfter: "ready",
        metadata: expect.objectContaining({
          transport_mode: "blocked",
        }),
      })
    );
  });

  it("keeps handoff ready for external dry-run and records dry-run audit metadata", async () => {
    mockGetExternalMindHandoffById.mockResolvedValueOnce({
      handoff: { ...readyHandoff, destination: "animoca_mind" },
    });
    mockExecuteExternalMindHandoffTransport.mockResolvedValueOnce({
      kind: "blocked",
      error: "send_disabled",
      errorMessage:
        "Dry-run passed; set EXTERNAL_MIND_LIVE_SEND=true for live delivery.",
      sendResult: {
        result: "external_dry_run_ok",
        destination: "animoca_mind",
        payload_version: "mind_digest_payload_v1",
        timestamp: "2026-05-31T13:00:00.000Z",
      },
      metadata: {
        transport_mode: "dry_run",
        dry_run_only: true,
        endpoint_host: "mind.example.com",
      },
    });
    mockRecordExternalMindHandoffSendAttempt.mockResolvedValueOnce({
      ok: true,
      handoff: {
        ...readyHandoff,
        destination: "animoca_mind",
        status: "ready",
      },
    });

    const result = await sendExternalMindHandoff("handoff-uuid-001", operatorAccess);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("external_dry_run_ok");
    }
    expect(mockRecordExternalMindHandoffSendAttempt).toHaveBeenCalledWith(
      "handoff-uuid-001",
      operatorAccess,
      expect.objectContaining({ status: "ready" })
    );
    expect(mockRecordExternalMindHandoffSendOutcome).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "send_blocked",
        result: "external_dry_run_ok",
        statusAfter: "ready",
        metadata: expect.objectContaining({
          transport_mode: "dry_run",
          dry_run_only: true,
          endpoint_host: "mind.example.com",
        }),
      })
    );
    expectNoSecretsInValue(mockRecordExternalMindHandoffSendOutcome.mock.calls[0]?.[0]);
  });

  it("keeps handoff ready for external config invalid and records config audit metadata", async () => {
    mockGetExternalMindHandoffById.mockResolvedValueOnce({
      handoff: { ...readyHandoff, destination: "animoca_mind" },
    });
    mockExecuteExternalMindHandoffTransport.mockResolvedValueOnce({
      kind: "blocked",
      error: "send_disabled",
      errorMessage: "external_config_invalid",
      sendResult: {
        result: "external_config_invalid",
        destination: "animoca_mind",
        payload_version: "mind_digest_payload_v1",
        timestamp: "2026-05-31T13:00:00.000Z",
      },
      metadata: {
        transport_mode: "blocked",
        error_class: "config",
        endpoint_host: "mind.example.com",
      },
    });
    mockRecordExternalMindHandoffSendAttempt.mockResolvedValueOnce({
      ok: true,
      handoff: {
        ...readyHandoff,
        destination: "animoca_mind",
        status: "ready",
      },
    });

    const result = await sendExternalMindHandoff("handoff-uuid-001", operatorAccess);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("external_config_invalid");
    }
    expect(mockRecordExternalMindHandoffSendAttempt).toHaveBeenCalledWith(
      "handoff-uuid-001",
      operatorAccess,
      expect.objectContaining({ status: "ready" })
    );
    expect(mockRecordExternalMindHandoffSendOutcome).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "send_blocked",
        result: "external_config_invalid",
        statusAfter: "ready",
        metadata: expect.objectContaining({
          error_class: "config",
          endpoint_host: "mind.example.com",
        }),
      })
    );
    expectNoSecretsInValue(mockRecordExternalMindHandoffSendOutcome.mock.calls[0]?.[0]);
  });

  it("marks live external failure as failed and records failed audit metadata", async () => {
    mockGetExternalMindHandoffById.mockResolvedValueOnce({
      handoff: { ...readyHandoff, destination: "animoca_mind" },
    });
    mockExecuteExternalMindHandoffTransport.mockResolvedValueOnce({
      kind: "failed",
      error: "external_send_failed",
      errorMessage: "external_send_failed",
      sendResult: {
        result: "external_send_failed",
        destination: "animoca_mind",
        payload_version: "mind_digest_payload_v1",
        timestamp: "2026-05-31T13:00:00.000Z",
        http_status: 503,
      },
      metadata: {
        transport_mode: "live",
        error_class: "http",
        http_status: 503,
        endpoint_host: "mind.example.com",
        timeout_ms: 15000,
      },
    });
    mockRecordExternalMindHandoffSendAttempt.mockResolvedValueOnce({
      ok: true,
      handoff: {
        ...readyHandoff,
        destination: "animoca_mind",
        status: "failed",
      },
    });

    const result = await sendExternalMindHandoff("handoff-uuid-001", operatorAccess);

    expect(result.ok).toBe(false);
    expect(mockRecordExternalMindHandoffSendAttempt).toHaveBeenCalledWith(
      "handoff-uuid-001",
      operatorAccess,
      expect.objectContaining({ status: "failed" })
    );
    expect(mockRecordExternalMindHandoffSendOutcome).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "send_failed",
        result: "external_send_failed",
        statusAfter: "failed",
        metadata: expect.objectContaining({
          transport_mode: "live",
          error_class: "http",
          http_status: 503,
        }),
      })
    );
    expectNoSecretsInValue(mockRecordExternalMindHandoffSendOutcome.mock.calls[0]?.[0]);
  });

  it("marks live external success as sent", async () => {
    mockGetExternalMindHandoffById.mockResolvedValueOnce({
      handoff: { ...readyHandoff, destination: "animoca_mind" },
    });
    mockExecuteExternalMindHandoffTransport.mockResolvedValueOnce({
      kind: "sent",
      sentAt: "2026-05-31T13:00:00.000Z",
      sendResult: {
        result: "external_sent",
        destination: "animoca_mind",
        payload_version: "mind_digest_payload_v1",
        timestamp: "2026-05-31T13:00:00.000Z",
        http_status: 202,
      },
      metadata: {
        transport_mode: "live",
        http_status: 202,
        endpoint_host: "mind.example.com",
        timeout_ms: 15000,
      },
    });
    mockRecordExternalMindHandoffSendAttempt.mockResolvedValueOnce({
      ok: true,
      handoff: {
        ...readyHandoff,
        destination: "animoca_mind",
        status: "sent",
        sent_at: "2026-05-31T13:00:00.000Z",
        send_result_json: {
          result: "external_sent",
          destination: "animoca_mind",
          payload_version: "mind_digest_payload_v1",
          timestamp: "2026-05-31T13:00:00.000Z",
          http_status: 202,
        },
      },
    });

    const result = await sendExternalMindHandoff("handoff-uuid-001", operatorAccess);

    expect(result.ok).toBe(true);
    expect(mockRecordExternalMindHandoffSendOutcome).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "send_succeeded",
        result: "external_sent",
        statusAfter: "sent",
        metadata: expect.objectContaining({
          transport_mode: "live",
          http_status: 202,
        }),
      })
    );
  });
});
