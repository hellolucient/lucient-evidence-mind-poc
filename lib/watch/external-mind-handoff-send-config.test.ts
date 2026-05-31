import { afterEach, describe, expect, it } from "vitest";

import {
  containsSensitiveEnvValue,
  describeExternalMindSendReadiness,
  getExternalMindSendConfig,
  isExternalMindSendEnabled,
  isExternalMindSendFullyConfigured,
} from "@/lib/watch/external-mind-handoff-send-config";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("external-mind-handoff-send-config", () => {
  it("disables external send by default", () => {
    delete process.env.ENABLE_EXTERNAL_MIND_SEND;
    expect(isExternalMindSendEnabled()).toBe(false);
    expect(getExternalMindSendConfig()).toEqual({
      enabled: false,
      endpointConfigured: false,
      apiKeyConfigured: false,
    });
  });

  it("requires exact true to enable external send", () => {
    process.env.ENABLE_EXTERNAL_MIND_SEND = "TRUE";
    expect(isExternalMindSendEnabled()).toBe(true);
  });

  it("reports readiness without exposing secret values", () => {
    process.env.ENABLE_EXTERNAL_MIND_SEND = "true";
    process.env.EXTERNAL_MIND_ENDPOINT_URL = "https://example.com/mind";
    process.env.EXTERNAL_MIND_API_KEY = "secret-key-value";

    expect(describeExternalMindSendReadiness()).toEqual({
      enabled: true,
      endpointConfigured: true,
      apiKeyConfigured: true,
      readyForExternalSend: true,
    });
    expect(isExternalMindSendFullyConfigured()).toBe(true);
  });

  it("detects sensitive env values in arbitrary strings", () => {
    process.env.EXTERNAL_MIND_API_KEY = "secret-key-value";
    expect(containsSensitiveEnvValue("prefix secret-key-value suffix")).toBe(true);
    expect(containsSensitiveEnvValue("safe message only")).toBe(false);
  });
});
