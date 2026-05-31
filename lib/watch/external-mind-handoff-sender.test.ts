import { describe, expect, it } from "vitest";

import {
  isExternalMindSendEnabled,
  sendExternalMindHandoffIfEnabled,
} from "@/lib/watch/external-mind-handoff-sender";

describe("external-mind-handoff-sender", () => {
  it("disables external send by default", () => {
    delete process.env.ENABLE_EXTERNAL_MIND_SEND;
    expect(isExternalMindSendEnabled()).toBe(false);
  });

  it("does not send externally when disabled", async () => {
    delete process.env.ENABLE_EXTERNAL_MIND_SEND;

    const result = await sendExternalMindHandoffIfEnabled({
      handoffId: "handoff-uuid-001",
      destination: "test_sink",
      payloadVersion: "mind_digest_payload_v1",
    });

    expect(result).toEqual({ ok: true, sent: false, reason: "external_send_disabled" });
  });
});
