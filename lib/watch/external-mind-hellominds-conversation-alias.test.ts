import { afterEach, describe, expect, it } from "vitest";

import { buildHelloMindsConversationAlias } from "@/lib/watch/external-mind-hellominds-conversation-alias";

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

  it("uses configured alias prefix", () => {
    process.env.EXTERNAL_MIND_HELLOMINDS_CONVERSATION_ALIAS_PREFIX = "staging-em";

    expect(buildHelloMindsConversationAlias("handoff-uuid-001")).toBe(
      "staging-em-ho-handoff-uuid-001"
    );
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
