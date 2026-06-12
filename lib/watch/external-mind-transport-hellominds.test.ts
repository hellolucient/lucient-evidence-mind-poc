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

  it("never uses Authorization Bearer for HelloMinds even when live send is enabled", async () => {
    configureHelloMindsDryRun();
    process.env.EXTERNAL_MIND_LIVE_SEND = "true";

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
      expect(result.sendResult.result).toBe("external_config_invalid");
      expect(result.errorMessage).toContain("not available in this release");
    }

    for (const call of fetchMock.mock.calls) {
      const init = call[1] as RequestInit | undefined;
      const headers = init?.headers as Record<string, string> | undefined;
      expect(headers?.Authorization).toBeUndefined();
    }
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
