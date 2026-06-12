import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockGetExternalMindHandoffById = vi.fn();
const mockRecordExternalMindHandoffSendAttempt = vi.fn();
const mockRecordExternalMindHandoffSendAttempted = vi.fn();
const mockRecordExternalMindHandoffSendOutcome = vi.fn();

vi.mock("@/lib/watch/external-mind-handoff-store", () => ({
  getExternalMindHandoffById: (...args: unknown[]) => mockGetExternalMindHandoffById(...args),
  recordExternalMindHandoffSendAttempt: (...args: unknown[]) =>
    mockRecordExternalMindHandoffSendAttempt(...args),
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

import { buildPrivacySafeHelloMindsMessageText } from "@/lib/watch/external-mind-handoff-message-text";
import { buildHelloMindsConversationAlias } from "@/lib/watch/external-mind-hellominds-conversation-alias";
import { sendExternalMindHandoff } from "@/lib/watch/external-mind-handoff-send";

const originalFetch = global.fetch;

function clearHelloMindsEnv(): void {
  delete process.env.ENABLE_EXTERNAL_MIND_SEND;
  delete process.env.EXTERNAL_MIND_LIVE_SEND;
  delete process.env.EXTERNAL_MIND_HELLOMINDS_BASE_URL;
  delete process.env.EXTERNAL_MIND_HELLOMINDS_ACCESS_KEY;
  delete process.env.EXTERNAL_MIND_HELLOMINDS_TARGET_MIND_ID;
  delete process.env.EXTERNAL_MIND_HELLOMINDS_CONVERSATION_ALIAS_PREFIX;
  delete process.env.EXTERNAL_MIND_HELLOMINDS_ENDPOINT_ALLOWLIST;
  delete process.env.EXTERNAL_MIND_HELLOMINDS_SEND_TIMEOUT_MS;
  delete process.env.EXTERNAL_MIND_ENDPOINT_URL;
  delete process.env.EXTERNAL_MIND_API_KEY;
}

function configureHelloMindsDryRun(): void {
  process.env.ENABLE_EXTERNAL_MIND_SEND = "true";
  process.env.EXTERNAL_MIND_LIVE_SEND = "false";
  process.env.EXTERNAL_MIND_HELLOMINDS_BASE_URL = "https://api.build.hellominds.ai";
  process.env.EXTERNAL_MIND_HELLOMINDS_ACCESS_KEY = "hellominds-secret-key";
  process.env.EXTERNAL_MIND_HELLOMINDS_TARGET_MIND_ID = "mind-id-df11";
}

function configureHelloMindsLive(): void {
  configureHelloMindsDryRun();
  process.env.EXTERNAL_MIND_LIVE_SEND = "true";
}

const operatorAccess = {
  authorized: true,
  mode: "operator" as const,
  userId: "user-123",
  workspaceIds: ["demo-workspace-spa-menu"],
};

const payload = {
  payload_version: "mind_digest_payload_v1",
  workspace_id: "demo-workspace-spa-menu",
  digest_id: "digest-uuid-001",
  handoff_type: "digest_summary",
  destination: "hellominds",
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

const readyHelloMindsHandoff = {
  id: "handoff-uuid-001",
  workspace_id: "demo-workspace-spa-menu",
  digest_id: "digest-uuid-001",
  handoff_type: "digest_summary",
  destination: "hellominds",
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
  expect(serialized).not.toContain("hellominds-secret-key");
  expect(serialized).not.toContain("Bearer");
  expect(serialized).not.toContain("lucient-em-ho-handoff-uuid-001");
  expect(serialized).not.toContain("conv-full-id-ab12");
  expect(serialized).not.toContain("msg-full-id-cd34");
}

function mockJsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

function getFetchHeaders(call: unknown[]): Record<string, string> {
  const init = call[1] as RequestInit | undefined;
  if (!init?.headers) {
    return {};
  }

  if (init.headers instanceof Headers) {
    return Object.fromEntries(init.headers.entries());
  }

  return init.headers as Record<string, string>;
}

function getFetchBody(call: unknown[]): Record<string, unknown> {
  const init = call[1] as RequestInit | undefined;
  return JSON.parse(String(init?.body)) as Record<string, unknown>;
}

afterEach(() => {
  global.fetch = originalFetch;
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("external-mind-transport-hellominds", () => {
  beforeEach(() => {
    clearHelloMindsEnv();
  });

  it("returns hellominds dry-run without fetch and never sends raw payload_json", async () => {
    configureHelloMindsDryRun();

    const fetchMock = vi.fn();
    global.fetch = fetchMock as typeof fetch;

    const { executeExternalMindHandoffTransport } = await import(
      "@/lib/watch/external-mind-handoff-sender"
    );

    const result = await executeExternalMindHandoffTransport({
      handoffId: "handoff-uuid-001",
      destination: "hellominds",
      payloadVersion: "mind_digest_payload_v1",
      payloadJson: payload,
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.kind).toBe("blocked");
    if (result.kind === "blocked") {
      expect(result.sendResult.result).toBe("external_dry_run_ok");
      expect(result.metadata).toMatchObject({
        transport_mode: "dry_run",
        dry_run_only: true,
        provider: "hellominds",
        endpoint_host: "api.build.hellominds.ai",
      });
      expect(result.metadata?.message_text_char_count).toBeGreaterThan(0);
    }
    expectNoSecretsInValue(result);
  });

  it("returns external_config_invalid when HelloMinds config is missing", async () => {
    process.env.ENABLE_EXTERNAL_MIND_SEND = "true";

    const fetchMock = vi.fn();
    global.fetch = fetchMock as typeof fetch;

    const { executeExternalMindHandoffTransport } = await import(
      "@/lib/watch/external-mind-handoff-sender"
    );

    const result = await executeExternalMindHandoffTransport({
      handoffId: "handoff-uuid-001",
      destination: "hellominds",
      payloadVersion: "mind_digest_payload_v1",
      payloadJson: payload,
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      kind: "blocked",
      sendResult: {
        result: "external_config_invalid",
      },
      metadata: {
        transport_mode: "blocked",
        error_class: "config",
        provider: "hellominds",
      },
    });
  });

  it("blocks live send when EXTERNAL_MIND_LIVE_SEND is false even with full config", async () => {
    configureHelloMindsDryRun();

    const fetchMock = vi.fn();
    global.fetch = fetchMock as typeof fetch;

    const { executeExternalMindHandoffTransport } = await import(
      "@/lib/watch/external-mind-handoff-sender"
    );

    const result = await executeExternalMindHandoffTransport({
      handoffId: "handoff-uuid-001",
      destination: "hellominds",
      payloadVersion: "mind_digest_payload_v1",
      payloadJson: payload,
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.kind).toBe("blocked");
    if (result.kind === "blocked") {
      expect(result.sendResult.result).toBe("external_dry_run_ok");
    }
  });

  it("performs successful live HelloMinds send with conversation then message fetch", async () => {
    configureHelloMindsLive();

    const expectedAlias = buildHelloMindsConversationAlias("handoff-uuid-001");
    const expectedMessageText = buildPrivacySafeHelloMindsMessageText(payload);

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        mockJsonResponse(200, {
          conversationId: "conv-full-id-ab12",
          alias: expectedAlias,
        })
      )
      .mockResolvedValueOnce(
        mockJsonResponse(200, {
          conversationId: "conv-full-id-ab12",
          messageId: "msg-full-id-cd34",
          artifactIds: [],
          alias: expectedAlias,
        })
      );
    global.fetch = fetchMock as typeof fetch;

    const { executeExternalMindHandoffTransport } = await import(
      "@/lib/watch/external-mind-handoff-sender"
    );

    const result = await executeExternalMindHandoffTransport({
      handoffId: "handoff-uuid-001",
      destination: "hellominds",
      payloadVersion: "mind_digest_payload_v1",
      payloadJson: payload,
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://api.build.hellominds.ai/v1/messaging/conversation"
    );
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      "https://api.build.hellominds.ai/v1/messaging/message"
    );

    expect(getFetchBody(fetchMock.mock.calls[0]!)).toEqual({
      alias: expectedAlias,
      mindId: "mind-id-df11",
    });
    expect(getFetchBody(fetchMock.mock.calls[1]!)).toEqual({
      alias: expectedAlias,
      messageText: expectedMessageText,
      attachments: [],
    });

    expect(result.kind).toBe("sent");
    if (result.kind === "sent") {
      expect(result.sendResult.result).toBe("external_sent");
      expect(result.sendResult.http_status).toBe(200);
      expect(result.metadata).toMatchObject({
        transport_mode: "live",
        provider: "hellominds",
        endpoint_host: "api.build.hellominds.ai",
        http_status: 200,
        conversation_id_suffix: "ab12",
        message_id_suffix: "cd34",
        artifact_count: 0,
      });
    }

    for (const call of fetchMock.mock.calls) {
      const headers = getFetchHeaders(call);
      expect(headers.Authorization).toBeUndefined();
      expect(headers["X-Access-Key"]).toBe("hellominds-secret-key");
    }

    const serializedBodies = fetchMock.mock.calls.map((call) => JSON.stringify(getFetchBody(call)));
    expect(serializedBodies.join("")).not.toContain("digest-uuid-001");
    expect(serializedBodies.join("")).not.toContain("demo-workspace-spa-menu");
    expect(serializedBodies.join("")).not.toContain("payload_version");

    expectNoSecretsInValue(result);
  });

  it("returns failed on conversation HTTP error without attempting message POST", async () => {
    configureHelloMindsLive();

    const fetchMock = vi.fn().mockResolvedValueOnce(mockJsonResponse(400, { type: "BAD_INPUT" }));
    global.fetch = fetchMock as typeof fetch;

    const { executeExternalMindHandoffTransport } = await import(
      "@/lib/watch/external-mind-handoff-sender"
    );

    const result = await executeExternalMindHandoffTransport({
      handoffId: "handoff-uuid-001",
      destination: "hellominds",
      payloadVersion: "mind_digest_payload_v1",
      payloadJson: payload,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.kind).toBe("failed");
    if (result.kind === "failed") {
      expect(result.error).toBe("external_send_failed");
      expect(result.sendResult.result).toBe("external_send_failed");
      expect(result.metadata).toMatchObject({
        transport_mode: "live",
        provider: "hellominds",
        error_class: "http",
        http_status: 400,
        endpoint_host: "api.build.hellominds.ai",
      });
    }
    expectNoSecretsInValue(result);
  });

  it("returns failed on message HTTP error after successful conversation POST", async () => {
    configureHelloMindsLive();

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        mockJsonResponse(200, {
          conversationId: "conv-full-id-ab12",
          alias: buildHelloMindsConversationAlias("handoff-uuid-001"),
        })
      )
      .mockResolvedValueOnce(mockJsonResponse(502, { type: "SERVER_ERROR" }));
    global.fetch = fetchMock as typeof fetch;

    const { executeExternalMindHandoffTransport } = await import(
      "@/lib/watch/external-mind-handoff-sender"
    );

    const result = await executeExternalMindHandoffTransport({
      handoffId: "handoff-uuid-001",
      destination: "hellominds",
      payloadVersion: "mind_digest_payload_v1",
      payloadJson: payload,
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.kind).toBe("failed");
    if (result.kind === "failed") {
      expect(result.sendResult.result).toBe("external_send_failed");
      expect(result.metadata).toMatchObject({
        transport_mode: "live",
        provider: "hellominds",
        error_class: "http",
        http_status: 502,
      });
    }
    expectNoSecretsInValue(result);
  });

  it("returns failed on timeout without attempting message POST when conversation times out", async () => {
    configureHelloMindsLive();
    process.env.EXTERNAL_MIND_HELLOMINDS_SEND_TIMEOUT_MS = "50";

    const fetchMock = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          const error = new Error("Aborted");
          error.name = "AbortError";
          reject(error);
        });
      });
    });
    global.fetch = fetchMock as typeof fetch;

    const { executeExternalMindHandoffTransport } = await import(
      "@/lib/watch/external-mind-handoff-sender"
    );

    const result = await executeExternalMindHandoffTransport({
      handoffId: "handoff-uuid-001",
      destination: "hellominds",
      payloadVersion: "mind_digest_payload_v1",
      payloadJson: payload,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.kind).toBe("failed");
    if (result.kind === "failed") {
      expect(result.metadata).toMatchObject({
        transport_mode: "live",
        provider: "hellominds",
        error_class: "timeout",
      });
    }
    expectNoSecretsInValue(result);
  });

  it("returns failed on network error", async () => {
    configureHelloMindsLive();

    const fetchMock = vi.fn().mockRejectedValue(new Error("network unreachable"));
    global.fetch = fetchMock as typeof fetch;

    const { executeExternalMindHandoffTransport } = await import(
      "@/lib/watch/external-mind-handoff-sender"
    );

    const result = await executeExternalMindHandoffTransport({
      handoffId: "handoff-uuid-001",
      destination: "hellominds",
      payloadVersion: "mind_digest_payload_v1",
      payloadJson: payload,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.kind).toBe("failed");
    if (result.kind === "failed") {
      expect(result.metadata).toMatchObject({
        transport_mode: "live",
        provider: "hellominds",
        error_class: "network",
      });
    }
    expectNoSecretsInValue(result);
  });

  it("never uses Authorization Bearer on HelloMinds live fetches", async () => {
    configureHelloMindsLive();

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        mockJsonResponse(200, {
          conversationId: "conv-full-id-ab12",
          alias: buildHelloMindsConversationAlias("handoff-uuid-001"),
        })
      )
      .mockResolvedValueOnce(
        mockJsonResponse(200, {
          conversationId: "conv-full-id-ab12",
          messageId: "msg-full-id-cd34",
          artifactIds: [],
          alias: buildHelloMindsConversationAlias("handoff-uuid-001"),
        })
      );
    global.fetch = fetchMock as typeof fetch;

    const { executeExternalMindHandoffTransport } = await import(
      "@/lib/watch/external-mind-handoff-sender"
    );

    await executeExternalMindHandoffTransport({
      handoffId: "handoff-uuid-001",
      destination: "hellominds",
      payloadVersion: "mind_digest_payload_v1",
      payloadJson: payload,
    });

    for (const call of fetchMock.mock.calls) {
      const headers = getFetchHeaders(call);
      expect(headers.Authorization).toBeUndefined();
      expect(headers["X-Access-Key"]).toBe("hellominds-secret-key");
    }
  });
});

describe("sendExternalMindHandoff hellominds dry-run orchestration", () => {
  beforeEach(() => {
    clearHelloMindsEnv();
    configureHelloMindsDryRun();
    vi.clearAllMocks();

    mockGetExternalMindHandoffById.mockResolvedValue({ handoff: readyHelloMindsHandoff });
    mockRecordExternalMindHandoffSendAttempt.mockResolvedValue({
      ok: true,
      handoff: {
        ...readyHelloMindsHandoff,
        status: "ready",
        send_attempted_at: "2026-05-31T13:00:00.000Z",
        send_result_json: {
          result: "external_dry_run_ok",
          destination: "hellominds",
          payload_version: "mind_digest_payload_v1",
          timestamp: "2026-05-31T13:00:00.000Z",
        },
      },
    });
  });

  it("keeps handoff ready and records Phase 38C dry-run audit semantics", async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock as typeof fetch;

    const result = await sendExternalMindHandoff("handoff-uuid-001", operatorAccess);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("external_dry_run_ok");
      expect(result.sendResult?.result).toBe("external_dry_run_ok");
    }

    expect(mockRecordExternalMindHandoffSendAttempt).toHaveBeenCalledWith(
      "handoff-uuid-001",
      operatorAccess,
      expect.objectContaining({
        status: "ready",
        send_result_json: expect.objectContaining({
          result: "external_dry_run_ok",
          destination: "hellominds",
        }),
      })
    );

    expect(mockRecordExternalMindHandoffSendOutcome).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "send_blocked",
        result: "external_dry_run_ok",
        statusBefore: "ready",
        statusAfter: "ready",
        metadata: expect.objectContaining({
          transport_kind: "blocked",
          transport_mode: "dry_run",
          dry_run_only: true,
          endpoint_host: "api.build.hellominds.ai",
        }),
      })
    );
    expectNoSecretsInValue(result);
  });
});

describe("sendExternalMindHandoff hellominds live orchestration", () => {
  beforeEach(() => {
    clearHelloMindsEnv();
    configureHelloMindsLive();
    vi.clearAllMocks();

    mockGetExternalMindHandoffById.mockResolvedValue({ handoff: readyHelloMindsHandoff });
    mockRecordExternalMindHandoffSendAttempt.mockResolvedValue({
      ok: true,
      handoff: {
        ...readyHelloMindsHandoff,
        status: "sent",
        sent_at: "2026-05-31T13:00:00.000Z",
        send_attempted_at: "2026-05-31T13:00:00.000Z",
        send_result_json: {
          result: "external_sent",
          destination: "hellominds",
          payload_version: "mind_digest_payload_v1",
          timestamp: "2026-05-31T13:00:00.000Z",
          http_status: 200,
        },
      },
    });
  });

  it("records send_succeeded with privacy-safe HelloMinds metadata", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        mockJsonResponse(200, {
          conversationId: "conv-full-id-ab12",
          alias: buildHelloMindsConversationAlias("handoff-uuid-001"),
        })
      )
      .mockResolvedValueOnce(
        mockJsonResponse(200, {
          conversationId: "conv-full-id-ab12",
          messageId: "msg-full-id-cd34",
          artifactIds: [],
          alias: buildHelloMindsConversationAlias("handoff-uuid-001"),
        })
      );
    global.fetch = fetchMock as typeof fetch;

    const result = await sendExternalMindHandoff("handoff-uuid-001", operatorAccess);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.sendResult.result).toBe("external_sent");
    }

    expect(mockRecordExternalMindHandoffSendOutcome).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "send_succeeded",
        result: "external_sent",
        statusBefore: "ready",
        statusAfter: "sent",
        metadata: expect.objectContaining({
          transport_kind: "sent",
          transport_mode: "live",
          provider: "hellominds",
          endpoint_host: "api.build.hellominds.ai",
          conversation_id_suffix: "ab12",
          message_id_suffix: "cd34",
          artifact_count: 0,
        }),
      })
    );

    expectNoSecretsInValue(result);
    expectNoSecretsInValue(mockRecordExternalMindHandoffSendOutcome.mock.calls);
  });
});
