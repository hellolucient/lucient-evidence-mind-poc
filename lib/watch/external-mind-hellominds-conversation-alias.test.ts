import { afterEach, describe, expect, it } from "vitest";

import {
  buildHelloMindsConversationAlias,
  resolveHelloMindsConversationAlias,
  tryBuildHelloMindsConversationAlias,
} from "@/lib/watch/external-mind-hellominds-conversation-alias";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("external-mind-hellominds-conversation-alias", () => {
  it("builds deterministic alias from prefix and handoff id only", () => {
    delete process.env.EXTERNAL_MIND_HELLOMINDS_CONVERSATION_ALIAS_PREFIX;

    expect(buildHelloMindsConversationAlias("9fe12503-a900-46ed-a38d-488a9857db09")).toBe(
      "lucient-em-ho-9fe12503-a900-46ed-a38d-488a9857db09"
    );
  });

  it("uses configured alias prefix for sender helper", () => {
    process.env.EXTERNAL_MIND_HELLOMINDS_CONVERSATION_ALIAS_PREFIX = "staging-em";

    expect(buildHelloMindsConversationAlias("handoff-uuid-001")).toBe(
      "staging-em-ho-handoff-uuid-001"
    );
  });

  it("reconstructs alias only when prefix is explicitly configured", () => {
    delete process.env.EXTERNAL_MIND_HELLOMINDS_CONVERSATION_ALIAS_PREFIX;
    expect(tryBuildHelloMindsConversationAlias("handoff-uuid-001")).toBeNull();

    process.env.EXTERNAL_MIND_HELLOMINDS_CONVERSATION_ALIAS_PREFIX = "lucient-em";
    expect(tryBuildHelloMindsConversationAlias("0fd4ee13-740b-41cd-be4c-1139442bf082")).toBe(
      "lucient-em-ho-0fd4ee13-740b-41cd-be4c-1139442bf082"
    );
    expect(tryBuildHelloMindsConversationAlias("0fd4ee13-740b-41cd-be4c-1139442bf082")).toBe(
      buildHelloMindsConversationAlias("0fd4ee13-740b-41cd-be4c-1139442bf082")
    );
  });

  it("prefers stored conversation alias over reconstruction", () => {
    process.env.EXTERNAL_MIND_HELLOMINDS_CONVERSATION_ALIAS_PREFIX = "lucient-em";

    const resolved = resolveHelloMindsConversationAlias({
      destination: "hellominds",
      handoffId: "handoff-uuid-001",
      sendResultConversationAlias: "stored-alias-ho-handoff-uuid-001",
    });

    expect(resolved).toEqual({
      ok: true,
      conversation_alias: "stored-alias-ho-handoff-uuid-001",
      alias_source: "stored_send_metadata",
    });
  });

  it("reconstructs alias from handoff id when prefix is configured and nothing is stored", () => {
    process.env.EXTERNAL_MIND_HELLOMINDS_CONVERSATION_ALIAS_PREFIX = "lucient-em";

    const resolved = resolveHelloMindsConversationAlias({
      destination: "hellominds",
      handoffId: "0fd4ee13-740b-41cd-be4c-1139442bf082",
    });

    expect(resolved).toEqual({
      ok: true,
      conversation_alias: "lucient-em-ho-0fd4ee13-740b-41cd-be4c-1139442bf082",
      alias_source: "reconstructed_from_handoff_id",
    });
  });

  it("returns prefix-not-configured error when reconstruction is unavailable", () => {
    delete process.env.EXTERNAL_MIND_HELLOMINDS_CONVERSATION_ALIAS_PREFIX;

    const resolved = resolveHelloMindsConversationAlias({
      destination: "hellominds",
      handoffId: "0fd4ee13-740b-41cd-be4c-1139442bf082",
    });

    expect(resolved.ok).toBe(false);
    if (!resolved.ok) {
      expect(resolved.error).toBe("alias_prefix_not_configured");
      expect(resolved.message).toContain("alias prefix is not configured");
    }
  });

  it("does not include workspace, client, or claim identifiers in alias", () => {
    delete process.env.EXTERNAL_MIND_HELLOMINDS_CONVERSATION_ALIAS_PREFIX;

    const alias = buildHelloMindsConversationAlias("handoff-uuid-001");

    expect(alias).not.toContain("demo-workspace");
    expect(alias).not.toContain("magnesium");
    expect(alias).not.toContain("client");
    expect(alias).not.toContain("claim");
  });

  it("produces different aliases for different handoff ids", () => {
    delete process.env.EXTERNAL_MIND_HELLOMINDS_CONVERSATION_ALIAS_PREFIX;

    const first = buildHelloMindsConversationAlias("handoff-uuid-001");
    const second = buildHelloMindsConversationAlias("handoff-uuid-002");

    expect(first).not.toBe(second);
  });
});
