import { afterEach, describe, expect, it } from "vitest";

import {
  containsSensitiveEnvValue,
  describeExternalMindSendReadiness,
  getExternalMindSendConfig,
  getExternalMindSendTimeoutMs,
  isExternalMindHandoffCreationReady,
  isExternalMindLiveSendEnabled,
  isExternalMindSendEnabled,
  isExternalMindSendFullyConfigured,
} from "@/lib/watch/external-mind-handoff-send-config";

const originalEnv = { ...process.env };

function clearExternalMindSendEnv(): void {
  delete process.env.ENABLE_EXTERNAL_MIND_SEND;
  delete process.env.EXTERNAL_MIND_LIVE_SEND;
  delete process.env.EXTERNAL_MIND_ENDPOINT_URL;
  delete process.env.EXTERNAL_MIND_API_KEY;
  delete process.env.EXTERNAL_MIND_SEND_TIMEOUT_MS;
  delete process.env.EXTERNAL_MIND_ENDPOINT_ALLOWLIST;
}

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("external-mind-handoff-send-config", () => {
  it("defaults to disabled with no dry-run or live readiness", () => {
    clearExternalMindSendEnv();

    expect(isExternalMindSendEnabled()).toBe(false);
    expect(isExternalMindLiveSendEnabled()).toBe(false);
    expect(getExternalMindSendConfig()).toEqual({
      enabled: false,
      endpointConfigured: false,
      apiKeyConfigured: false,
    });
    expect(describeExternalMindSendReadiness()).toEqual({
      enabled: false,
      endpointConfigured: false,
      apiKeyConfigured: false,
      liveSendEnabled: false,
      dryRunOnly: false,
      readyForExternalSend: false,
      readyForLiveExternalSend: false,
      timeoutMs: 15000,
      endpointHostConfigured: false,
      allowlistConfigured: false,
      endpointAllowed: false,
      httpsValidForLive: false,
    });
  });

  it("enables external send flag only without configuration readiness", () => {
    clearExternalMindSendEnv();
    process.env.ENABLE_EXTERNAL_MIND_SEND = "true";

    expect(describeExternalMindSendReadiness()).toMatchObject({
      enabled: true,
      endpointConfigured: false,
      apiKeyConfigured: false,
      liveSendEnabled: false,
      dryRunOnly: false,
      readyForExternalSend: false,
      readyForLiveExternalSend: false,
    });
  });

  it("requires exact true to enable external send", () => {
    process.env.ENABLE_EXTERNAL_MIND_SEND = "TRUE";
    expect(isExternalMindSendEnabled()).toBe(true);
  });

  it("marks dryRunOnly when enabled and configured but live send is false", () => {
    clearExternalMindSendEnv();
    process.env.ENABLE_EXTERNAL_MIND_SEND = "true";
    process.env.EXTERNAL_MIND_ENDPOINT_URL = "https://example.com/mind";
    process.env.EXTERNAL_MIND_API_KEY = "secret-key-value";
    process.env.EXTERNAL_MIND_LIVE_SEND = "false";

    expect(describeExternalMindSendReadiness()).toEqual({
      enabled: true,
      endpointConfigured: true,
      apiKeyConfigured: true,
      liveSendEnabled: false,
      dryRunOnly: true,
      readyForExternalSend: true,
      readyForLiveExternalSend: false,
      timeoutMs: 15000,
      endpointHostConfigured: true,
      allowlistConfigured: false,
      endpointAllowed: true,
      httpsValidForLive: false,
    });
    expect(isExternalMindSendFullyConfigured()).toBe(true);
  });

  it("marks readyForLiveExternalSend when fully configured with https and live send", () => {
    clearExternalMindSendEnv();
    process.env.ENABLE_EXTERNAL_MIND_SEND = "true";
    process.env.EXTERNAL_MIND_ENDPOINT_URL = "https://mind.example.com/ingest";
    process.env.EXTERNAL_MIND_API_KEY = "secret-key-value";
    process.env.EXTERNAL_MIND_LIVE_SEND = "true";

    expect(describeExternalMindSendReadiness()).toMatchObject({
      enabled: true,
      liveSendEnabled: true,
      dryRunOnly: false,
      readyForExternalSend: true,
      readyForLiveExternalSend: true,
      endpointHostConfigured: true,
      endpointAllowed: true,
      httpsValidForLive: true,
    });
  });

  it("rejects http endpoint for live external send readiness", () => {
    clearExternalMindSendEnv();
    process.env.ENABLE_EXTERNAL_MIND_SEND = "true";
    process.env.EXTERNAL_MIND_ENDPOINT_URL = "http://mind.example.com/ingest";
    process.env.EXTERNAL_MIND_API_KEY = "secret-key-value";
    process.env.EXTERNAL_MIND_LIVE_SEND = "true";

    expect(describeExternalMindSendReadiness()).toMatchObject({
      readyForExternalSend: true,
      readyForLiveExternalSend: false,
      httpsValidForLive: false,
    });
  });

  it("does not throw for invalid endpoint URL and reports live readiness false", () => {
    clearExternalMindSendEnv();
    process.env.ENABLE_EXTERNAL_MIND_SEND = "true";
    process.env.EXTERNAL_MIND_ENDPOINT_URL = "not-a-valid-url";
    process.env.EXTERNAL_MIND_API_KEY = "secret-key-value";
    process.env.EXTERNAL_MIND_LIVE_SEND = "true";

    expect(() => describeExternalMindSendReadiness()).not.toThrow();
    expect(describeExternalMindSendReadiness()).toMatchObject({
      endpointConfigured: true,
      endpointHostConfigured: false,
      endpointAllowed: false,
      readyForLiveExternalSend: false,
    });
  });

  it("parses timeout env and falls back to 15000 for invalid values", () => {
    clearExternalMindSendEnv();
    expect(getExternalMindSendTimeoutMs()).toBe(15000);

    process.env.EXTERNAL_MIND_SEND_TIMEOUT_MS = "30000";
    expect(getExternalMindSendTimeoutMs()).toBe(30000);

    process.env.EXTERNAL_MIND_SEND_TIMEOUT_MS = "not-a-number";
    expect(getExternalMindSendTimeoutMs()).toBe(15000);

    process.env.EXTERNAL_MIND_SEND_TIMEOUT_MS = "0";
    expect(getExternalMindSendTimeoutMs()).toBe(15000);
  });

  it("allows any parsed endpoint host when allowlist is empty", () => {
    clearExternalMindSendEnv();
    process.env.ENABLE_EXTERNAL_MIND_SEND = "true";
    process.env.EXTERNAL_MIND_ENDPOINT_URL = "https://mind.example.com/ingest";
    process.env.EXTERNAL_MIND_API_KEY = "secret-key-value";

    expect(describeExternalMindSendReadiness()).toMatchObject({
      allowlistConfigured: false,
      endpointAllowed: true,
    });
  });

  it("allows endpoint host when allowlist matches", () => {
    clearExternalMindSendEnv();
    process.env.ENABLE_EXTERNAL_MIND_SEND = "true";
    process.env.EXTERNAL_MIND_ENDPOINT_URL = "https://mind.example.com/ingest";
    process.env.EXTERNAL_MIND_API_KEY = "secret-key-value";
    process.env.EXTERNAL_MIND_LIVE_SEND = "true";
    process.env.EXTERNAL_MIND_ENDPOINT_ALLOWLIST = "mind.example.com,other.example.com";

    expect(describeExternalMindSendReadiness()).toMatchObject({
      allowlistConfigured: true,
      endpointAllowed: true,
      readyForLiveExternalSend: true,
    });
  });

  it("blocks endpoint host when allowlist does not match", () => {
    clearExternalMindSendEnv();
    process.env.ENABLE_EXTERNAL_MIND_SEND = "true";
    process.env.EXTERNAL_MIND_ENDPOINT_URL = "https://mind.example.com/ingest";
    process.env.EXTERNAL_MIND_API_KEY = "secret-key-value";
    process.env.EXTERNAL_MIND_LIVE_SEND = "true";
    process.env.EXTERNAL_MIND_ENDPOINT_ALLOWLIST = "other.example.com";

    expect(describeExternalMindSendReadiness()).toMatchObject({
      allowlistConfigured: true,
      endpointAllowed: false,
      readyForLiveExternalSend: false,
    });
  });

  it("does not expose API key or full endpoint URL in readiness output", () => {
    clearExternalMindSendEnv();
    process.env.ENABLE_EXTERNAL_MIND_SEND = "true";
    process.env.EXTERNAL_MIND_ENDPOINT_URL = "https://user:pass@mind.example.com/ingest";
    process.env.EXTERNAL_MIND_API_KEY = "secret-key-value";
    process.env.EXTERNAL_MIND_LIVE_SEND = "true";

    const readiness = describeExternalMindSendReadiness();
    const serialized = JSON.stringify(readiness);

    expect(serialized).not.toContain("secret-key-value");
    expect(serialized).not.toContain("user:pass");
    expect(serialized).not.toContain("https://user:pass@mind.example.com/ingest");
    expect(readiness).toMatchObject({
      endpointHostConfigured: true,
      endpointAllowed: true,
    });
  });

  it("detects sensitive env values in arbitrary strings", () => {
    process.env.EXTERNAL_MIND_API_KEY = "secret-key-value";
    expect(containsSensitiveEnvValue("prefix secret-key-value suffix")).toBe(true);
    expect(containsSensitiveEnvValue("safe message only")).toBe(false);
  });

  it("detects endpoint URLs with embedded credentials as sensitive", () => {
    process.env.EXTERNAL_MIND_ENDPOINT_URL = "https://user:pass@mind.example.com/ingest";
    expect(
      containsSensitiveEnvValue("failed at https://user:pass@mind.example.com/ingest")
    ).toBe(true);
    expect(containsSensitiveEnvValue("host mind.example.com only")).toBe(false);
  });

  it("marks handoff creation ready in dry-run https configuration", () => {
    clearExternalMindSendEnv();
    process.env.ENABLE_EXTERNAL_MIND_SEND = "true";
    process.env.EXTERNAL_MIND_ENDPOINT_URL = "https://example.test/mind";
    process.env.EXTERNAL_MIND_API_KEY = "dummy";
    process.env.EXTERNAL_MIND_LIVE_SEND = "false";

    expect(isExternalMindHandoffCreationReady()).toBe(true);
  });

  it("rejects handoff creation for http endpoints", () => {
    clearExternalMindSendEnv();
    process.env.ENABLE_EXTERNAL_MIND_SEND = "true";
    process.env.EXTERNAL_MIND_ENDPOINT_URL = "http://example.test/mind";
    process.env.EXTERNAL_MIND_API_KEY = "dummy";

    expect(isExternalMindHandoffCreationReady()).toBe(false);
  });
});
