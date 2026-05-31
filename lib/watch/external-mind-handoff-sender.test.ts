import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  vi.unstubAllEnvs();
});

describe("external-mind-handoff-sender", () => {
  beforeEach(() => {
    delete process.env.ENABLE_EXTERNAL_MIND_SEND;
    delete process.env.EXTERNAL_MIND_ENDPOINT_URL;
    delete process.env.EXTERNAL_MIND_API_KEY;
  });

  it("disables legacy external send helper by default", async () => {
    const { isExternalMindSendEnabled, sendExternalMindHandoffIfEnabled } = await import(
      "@/lib/watch/external-mind-handoff-sender"
    );

    expect(isExternalMindSendEnabled()).toBe(false);

    const result = await sendExternalMindHandoffIfEnabled({
      handoffId: "handoff-uuid-001",
      destination: "test_sink",
      payloadVersion: "mind_digest_payload_v1",
    });

    expect(result).toEqual({ ok: true, sent: false, reason: "external_send_disabled" });
  });

  it("marks test_sink transport as sent without network", async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock as typeof fetch;

    const { executeExternalMindHandoffTransport } = await import(
      "@/lib/watch/external-mind-handoff-sender"
    );

    const result = await executeExternalMindHandoffTransport({
      handoffId: "handoff-uuid-001",
      destination: "test_sink",
      payloadVersion: "mind_digest_payload_v1",
      payloadJson: { digest_id: "digest-uuid-001" },
    });

    expect(result.kind).toBe("sent");
    if (result.kind === "sent") {
      expect(result.sendResult.result).toBe("test_sink_sent");
      expect(result.sendResult.test_sink_only).toBe(true);
      expect(result.sentAt).toBeTruthy();
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("blocks animoca_mind transport when external send disabled", async () => {
    const { executeExternalMindHandoffTransport } = await import(
      "@/lib/watch/external-mind-handoff-sender"
    );

    const result = await executeExternalMindHandoffTransport({
      handoffId: "handoff-uuid-001",
      destination: "animoca_mind",
      payloadVersion: "mind_digest_payload_v1",
      payloadJson: { digest_id: "digest-uuid-001" },
    });

    expect(result).toEqual({
      kind: "blocked",
      error: "send_disabled",
      sendResult: expect.objectContaining({
        result: "send_disabled",
        destination: "animoca_mind",
      }),
    });
  });

  it("fails safely when external send enabled but config missing", async () => {
    process.env.ENABLE_EXTERNAL_MIND_SEND = "true";

    const { executeExternalMindHandoffTransport } = await import(
      "@/lib/watch/external-mind-handoff-sender"
    );

    const result = await executeExternalMindHandoffTransport({
      handoffId: "handoff-uuid-001",
      destination: "animoca_mind",
      payloadVersion: "mind_digest_payload_v1",
      payloadJson: { digest_id: "digest-uuid-001" },
    });

    expect(result.kind).toBe("failed");
    if (result.kind === "failed") {
      expect(result.error).toBe("missing_config");
      expect(result.sendResult.result).toBe("missing_config");
    }
  });

  it("calls external endpoint only when enabled and configured", async () => {
    process.env.ENABLE_EXTERNAL_MIND_SEND = "true";
    process.env.EXTERNAL_MIND_ENDPOINT_URL = "https://example.com/mind";
    process.env.EXTERNAL_MIND_API_KEY = "secret-key-value";

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 202,
    });
    global.fetch = fetchMock as typeof fetch;

    const { executeExternalMindHandoffTransport } = await import(
      "@/lib/watch/external-mind-handoff-sender"
    );

    const result = await executeExternalMindHandoffTransport({
      handoffId: "handoff-uuid-001",
      destination: "animoca_mind",
      payloadVersion: "mind_digest_payload_v1",
      payloadJson: { digest_id: "digest-uuid-001" },
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(result.kind).toBe("sent");
    if (result.kind === "sent") {
      expect(result.sendResult.result).toBe("external_sent");
      expect(result.sendResult.http_status).toBe(202);
    }
  });
});
