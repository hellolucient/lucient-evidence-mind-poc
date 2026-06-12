import { afterEach, describe, expect, it } from "vitest";

import {
  containsHelloMindsSensitiveEnvValue,
  describeHelloMindsSendReadiness,
  getHelloMindsConversationAliasPrefix,
  getHelloMindsSendConfig,
  getHelloMindsSendTimeoutMs,
  isHelloMindsHandoffCreationReady,
  isHelloMindsSendFullyConfigured,
} from "@/lib/watch/external-mind-hellominds-send-config";

const originalEnv = { ...process.env };

function clearHelloMindsEnv(): void {
  delete process.env.ENABLE_EXTERNAL_MIND_SEND;
  delete process.env.EXTERNAL_MIND_LIVE_SEND;
  delete process.env.EXTERNAL_MIND_HELLOMINDS_BASE_URL;
  delete process.env.EXTERNAL_MIND_HELLOMINDS_ACCESS_KEY;
  delete process.env.EXTERNAL_MIND_HELLOMINDS_TARGET_MIND_ID;
  delete process.env.EXTERNAL_MIND_HELLOMINDS_CONVERSATION_ALIAS_PREFIX;
  delete process.env.EXTERNAL_MIND_HELLOMINDS_ENDPOINT_ALLOWLIST;
  delete process.env.EXTERNAL_MIND_HELLOMINDS_SEND_TIMEOUT_MS;
  delete process.env.EXTERNAL_MIND_SEND_TIMEOUT_MS;
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

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("external-mind-hellominds-send-config", () => {
  it("defaults to not ready without HelloMinds configuration", () => {
    clearHelloMindsEnv();

    expect(getHelloMindsSendConfig()).toEqual({
      enabled: false,
      baseUrlConfigured: false,
      accessKeyConfigured: false,
      targetMindIdConfigured: false,
    });
    expect(describeHelloMindsSendReadiness()).toMatchObject({
      readyForExternalSend: false,
      readyForLiveExternalSend: false,
      dryRunOnly: false,
    });
  });

  it("does not use generic EXTERNAL_MIND endpoint vars for HelloMinds readiness", () => {
    clearHelloMindsEnv();
    process.env.ENABLE_EXTERNAL_MIND_SEND = "true";
    process.env.EXTERNAL_MIND_ENDPOINT_URL = "https://example.com/mind";
    process.env.EXTERNAL_MIND_API_KEY = "generic-secret";

    expect(isHelloMindsSendFullyConfigured()).toBe(false);
    expect(describeHelloMindsSendReadiness().readyForExternalSend).toBe(false);
  });

  it("marks dryRunOnly when HelloMinds vars are configured and live send is false", () => {
    configureHelloMindsDryRun();

    expect(describeHelloMindsSendReadiness()).toMatchObject({
      enabled: true,
      baseUrlConfigured: true,
      accessKeyConfigured: true,
      targetMindIdConfigured: true,
      liveSendEnabled: false,
      dryRunOnly: true,
      readyForExternalSend: true,
      readyForLiveExternalSend: false,
      endpointHostConfigured: true,
      endpointAllowed: true,
      httpsValidForLive: false,
    });
  });

  it("marks readyForLiveExternalSend only with https and live send enabled", () => {
    configureHelloMindsDryRun();
    process.env.EXTERNAL_MIND_LIVE_SEND = "true";

    expect(describeHelloMindsSendReadiness()).toMatchObject({
      liveSendEnabled: true,
      dryRunOnly: false,
      readyForExternalSend: true,
      readyForLiveExternalSend: true,
      httpsValidForLive: true,
    });
  });

  it("rejects http HelloMinds base URL for live readiness", () => {
    configureHelloMindsDryRun();
    process.env.EXTERNAL_MIND_HELLOMINDS_BASE_URL = "http://api.build.hellominds.ai";
    process.env.EXTERNAL_MIND_LIVE_SEND = "true";

    expect(describeHelloMindsSendReadiness()).toMatchObject({
      readyForExternalSend: true,
      readyForLiveExternalSend: false,
      httpsValidForLive: false,
    });
  });

  it("blocks endpoint host when HelloMinds allowlist does not match", () => {
    configureHelloMindsDryRun();
    process.env.EXTERNAL_MIND_LIVE_SEND = "true";
    process.env.EXTERNAL_MIND_HELLOMINDS_ENDPOINT_ALLOWLIST = "other.example.com";

    expect(describeHelloMindsSendReadiness()).toMatchObject({
      allowlistConfigured: true,
      endpointAllowed: false,
      readyForLiveExternalSend: false,
    });
  });

  it("defaults conversation alias prefix to lucient-em", () => {
    clearHelloMindsEnv();
    expect(getHelloMindsConversationAliasPrefix()).toBe("lucient-em");
  });

  it("uses HelloMinds timeout override when configured", () => {
    clearHelloMindsEnv();
    process.env.EXTERNAL_MIND_SEND_TIMEOUT_MS = "15000";
    process.env.EXTERNAL_MIND_HELLOMINDS_SEND_TIMEOUT_MS = "25000";

    expect(getHelloMindsSendTimeoutMs()).toBe(25000);
  });

  it("does not expose HelloMinds access key in readiness output", () => {
    configureHelloMindsDryRun();

    const readiness = describeHelloMindsSendReadiness();
    const serialized = JSON.stringify(readiness);

    expect(serialized).not.toContain("hellominds-secret-key");
  });

  it("detects HelloMinds sensitive env values in arbitrary strings", () => {
    process.env.EXTERNAL_MIND_HELLOMINDS_ACCESS_KEY = "hellominds-secret-key";
    expect(containsHelloMindsSensitiveEnvValue("prefix hellominds-secret-key suffix")).toBe(true);
    expect(containsHelloMindsSensitiveEnvValue("safe message only")).toBe(false);
  });

  it("marks HelloMinds handoff creation ready in dry-run https configuration", () => {
    configureHelloMindsDryRun();
    expect(isHelloMindsHandoffCreationReady()).toBe(true);
  });
});
