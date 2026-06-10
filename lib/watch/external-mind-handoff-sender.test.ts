import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const originalFetch = global.fetch;

function clearExternalMindSendEnv(): void {
  delete process.env.ENABLE_EXTERNAL_MIND_SEND;
  delete process.env.EXTERNAL_MIND_LIVE_SEND;
  delete process.env.EXTERNAL_MIND_ENDPOINT_URL;
  delete process.env.EXTERNAL_MIND_API_KEY;
  delete process.env.EXTERNAL_MIND_SEND_TIMEOUT_MS;
  delete process.env.EXTERNAL_MIND_ENDPOINT_ALLOWLIST;
}

function configureTierOneExternalSend(endpointUrl: string): void {
  process.env.ENABLE_EXTERNAL_MIND_SEND = "true";
  process.env.EXTERNAL_MIND_ENDPOINT_URL = endpointUrl;
  process.env.EXTERNAL_MIND_API_KEY = "secret-key-value";
}

function configureLiveExternalSend(endpointUrl: string): void {
  configureTierOneExternalSend(endpointUrl);
  process.env.EXTERNAL_MIND_LIVE_SEND = "true";
}

function expectNoSecretsInValue(value: unknown): void {
  const serialized = JSON.stringify(value);
  expect(serialized).not.toContain("secret-key-value");
  expect(serialized).not.toContain("user:pass");
  expect(serialized).not.toContain("https://user:pass@");
}

afterEach(() => {
  global.fetch = originalFetch;
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("external-mind-handoff-sender", () => {
  beforeEach(() => {
    clearExternalMindSendEnv();
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

  it("marks test_sink transport as sent without network regardless of env", async () => {
    configureLiveExternalSend("https://example.com/mind");

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
      expect(result.metadata).toEqual({ transport_mode: "test_sink" });
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("blocks animoca_mind transport when external send disabled", async () => {
    const fetchMock = vi.fn();
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

    expect(result).toEqual({
      kind: "blocked",
      error: "send_disabled",
      metadata: { transport_mode: "blocked" },
      sendResult: expect.objectContaining({
        result: "send_disabled",
        destination: "animoca_mind",
      }),
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fails safely when external send enabled but tier 1 config missing", async () => {
    process.env.ENABLE_EXTERNAL_MIND_SEND = "true";

    const fetchMock = vi.fn();
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

    expect(result.kind).toBe("blocked");
    if (result.kind === "blocked") {
      expect(result.sendResult.result).toBe("external_config_invalid");
      expect(result.metadata).toMatchObject({
        transport_mode: "blocked",
        error_class: "config",
      });
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns dry-run indication for tier 1 config when live send is disabled", async () => {
    configureTierOneExternalSend("https://mind.example.com/ingest");

    const fetchMock = vi.fn();
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

    expect(result.kind).toBe("blocked");
    if (result.kind === "blocked") {
      expect(result.error).toBe("send_disabled");
      expect(result.sendResult.result).toBe("external_dry_run_ok");
      expect(result.errorMessage).toBe(
        "Dry-run passed; set EXTERNAL_MIND_LIVE_SEND=true for live delivery."
      );
      expect(result.metadata).toEqual({
        transport_mode: "dry_run",
        dry_run_only: true,
        endpoint_host: "mind.example.com",
      });
    }
    expect(fetchMock).not.toHaveBeenCalled();
    expectNoSecretsInValue(result);
  });

  it("does not throw or call fetch for invalid endpoint URL", async () => {
    configureLiveExternalSend("not-a-valid-url");

    const fetchMock = vi.fn();
    global.fetch = fetchMock as typeof fetch;

    const { executeExternalMindHandoffTransport } = await import(
      "@/lib/watch/external-mind-handoff-sender"
    );

    await expect(
      executeExternalMindHandoffTransport({
        handoffId: "handoff-uuid-001",
        destination: "animoca_mind",
        payloadVersion: "mind_digest_payload_v1",
        payloadJson: { digest_id: "digest-uuid-001" },
      })
    ).resolves.toMatchObject({
      kind: "blocked",
      sendResult: {
        result: "external_config_invalid",
      },
      metadata: {
        transport_mode: "blocked",
        error_class: "config",
      },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("blocks live send for http endpoint without calling fetch", async () => {
    configureLiveExternalSend("http://mind.example.com/ingest");

    const fetchMock = vi.fn();
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

    expect(result).toMatchObject({
      kind: "blocked",
      sendResult: {
        result: "external_config_invalid",
      },
      metadata: {
        transport_mode: "blocked",
        error_class: "config",
        endpoint_host: "mind.example.com",
      },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("blocks live send when allowlist does not match", async () => {
    configureLiveExternalSend("https://mind.example.com/ingest");
    process.env.EXTERNAL_MIND_ENDPOINT_ALLOWLIST = "other.example.com";

    const fetchMock = vi.fn();
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

    expect(result).toMatchObject({
      kind: "blocked",
      sendResult: {
        result: "external_config_invalid",
      },
      metadata: {
        transport_mode: "blocked",
        error_class: "config",
        endpoint_host: "mind.example.com",
      },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("calls external endpoint once with expected live headers and JSON body", async () => {
    configureLiveExternalSend("https://mind.example.com/ingest");
    process.env.EXTERNAL_MIND_SEND_TIMEOUT_MS = "30000";

    const payloadJson = { digest_id: "digest-uuid-001" };
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
      payloadJson,
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://mind.example.com/ingest");
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify(payloadJson));
    expect(init.headers).toMatchObject({
      Authorization: "Bearer secret-key-value",
      "Content-Type": "application/json",
      "X-Evidence-Mind-Handoff-Id": "handoff-uuid-001",
      "X-Evidence-Mind-Payload-Version": "mind_digest_payload_v1",
      "X-Evidence-Mind-Destination": "animoca_mind",
      "User-Agent": "lucient-evidence-mind/37",
    });
    expect((init.headers as Record<string, string>)["X-Evidence-Mind-Sent-At"]).toBeTruthy();
    expect(init.signal).toBeTruthy();

    expect(result.kind).toBe("sent");
    if (result.kind === "sent") {
      expect(result.sendResult.result).toBe("external_sent");
      expect(result.sendResult.http_status).toBe(202);
      expect(result.metadata).toMatchObject({
        transport_mode: "live",
        http_status: 202,
        endpoint_host: "mind.example.com",
        timeout_ms: 30000,
      });
    }
    expectNoSecretsInValue(result);
  });

  it("returns external_send_failed for live non-2xx responses without raw body", async () => {
    configureLiveExternalSend("https://mind.example.com/ingest");

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => "internal upstream failure with secret-key-value",
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

    expect(result).toMatchObject({
      kind: "failed",
      error: "external_send_failed",
      errorMessage: "external_send_failed",
      sendResult: {
        result: "external_send_failed",
        http_status: 503,
      },
      metadata: {
        transport_mode: "live",
        error_class: "http",
        http_status: 503,
        endpoint_host: "mind.example.com",
      },
    });
    expectNoSecretsInValue(result);
  });

  it("returns timeout failure for aborted live fetch", async () => {
    configureLiveExternalSend("https://mind.example.com/ingest");
    process.env.EXTERNAL_MIND_SEND_TIMEOUT_MS = "10";

    const fetchMock = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          const error = new Error("The operation was aborted");
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
      destination: "animoca_mind",
      payloadVersion: "mind_digest_payload_v1",
      payloadJson: { digest_id: "digest-uuid-001" },
    });

    expect(result).toMatchObject({
      kind: "failed",
      error: "external_send_failed",
      metadata: {
        transport_mode: "live",
        error_class: "timeout",
      },
    });
    expectNoSecretsInValue(result);
  });

  it("returns network failure for live fetch throws", async () => {
    configureLiveExternalSend("https://mind.example.com/ingest");

    const fetchMock = vi.fn().mockRejectedValue(new Error("network unreachable secret-key-value"));
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

    expect(result).toMatchObject({
      kind: "failed",
      error: "external_send_failed",
      metadata: {
        transport_mode: "live",
        error_class: "network",
      },
    });
    expectNoSecretsInValue(result);
  });

  it("does not leak credential-bearing endpoint URLs in transport output", async () => {
    configureLiveExternalSend("https://user:pass@mind.example.com/ingest");

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
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

    expect(result.kind).toBe("sent");
    if (result.kind === "sent") {
      expect(result.metadata).toMatchObject({
        endpoint_host: "mind.example.com",
      });
    }
    expectNoSecretsInValue(result);
    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe("https://user:pass@mind.example.com/ingest");
    expect(JSON.stringify(result)).not.toContain(url);
  });
});
