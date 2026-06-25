import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getHelloMindsEmailChannelProbeIds,
  isHelloMindsMessagingHistoryAlias,
} from "@/lib/watch/external-mind-hellominds-conversations";
import {
  probeMindClaimHelloMindsResponses,
  resolveMindClaimHelloMindsHistoryKeys,
} from "@/lib/watch/mind-claim-hellominds-fetch";

const mockFetchHistory = vi.fn();
const mockGetConversation = vi.fn();
const mockListConversations = vi.fn();

vi.mock("@/lib/watch/external-mind-hellominds-history", () => ({
  fetchHelloMindsConversationHistoryWithDiagnostics: (...args: unknown[]) =>
    mockFetchHistory(...args),
  extractHelloMindsMessageTextLoose: (message: { messageText?: unknown }) =>
    typeof message?.messageText === "string" ? message.messageText : null,
}));

vi.mock("@/lib/watch/external-mind-hellominds-conversations", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/watch/external-mind-hellominds-conversations")>();
  return {
    ...actual,
    getHelloMindsConversationWithDiagnostics: (...args: unknown[]) => mockGetConversation(...args),
    listHelloMindsConversationsWithDiagnostics: (...args: unknown[]) =>
      mockListConversations(...args),
  };
});

function emptyHistoryDiagnostics(key: string) {
  return {
    key,
    url: `https://api.build.hellominds.ai/v1/messaging/history/${key}?limit=50`,
    http_status: 200,
    json_parsed: true,
    json_parse_error: null,
    raw_top_level_type: "array" as const,
    raw_top_level_keys: [],
    raw_message_count: 0,
    parsed_message_count: 0,
    raw_first_3_messages: [],
    raw_last_3_messages: [],
  };
}

describe("probeMindClaimHelloMindsResponses", () => {
  beforeEach(() => {
    mockFetchHistory.mockReset();
    mockGetConversation.mockReset();
    mockListConversations.mockReset();
    mockListConversations.mockResolvedValue({
      conversations: [],
      diagnostics: {
        url: "https://api.build.hellominds.ai/v1/messaging/conversations",
        http_status: 200,
        json_parsed: true,
        conversation_count: 0,
        conversations_sample: [],
      },
    });
  });

  it("probes history by discovered conversationId after alias history", async () => {
    const alias = "lucient-em-mrb-3abf5261-92c4-429f-9d66-f8975cbf9202";
    const conversationId = "29c3573e-f36b-1410-8464-00039ce7df11";

    mockFetchHistory.mockImplementation(async ({ conversationAlias }: { conversationAlias: string }) => {
      if (conversationAlias === alias) {
        return { ok: true, httpStatus: 200, messages: [], diagnostics: emptyHistoryDiagnostics(alias) };
      }
      if (conversationAlias === conversationId) {
        return {
          ok: true,
          httpStatus: 200,
          messages: [
            {
              messageId: "msg-1",
              createdAt: "2026-06-25T12:00:00.000Z",
              messageText: '{"mind_claim_risk_brief_json_v2":{}}',
            },
          ],
          diagnostics: {
            ...emptyHistoryDiagnostics(conversationId),
            raw_message_count: 1,
            parsed_message_count: 1,
          },
        };
      }
      throw new Error(`unexpected key ${conversationAlias}`);
    });

    mockGetConversation.mockResolvedValue({
      conversation: { alias, conversationId },
      diagnostics: {
        key: alias,
        url: `https://api.build.hellominds.ai/v1/messaging/conversations/${alias}`,
        http_status: 200,
        json_parsed: true,
        conversation: { alias, conversationId },
      },
    });

    const result = await probeMindClaimHelloMindsResponses({
      jobKind: "risk_brief",
      jobId: "3abf5261-92c4-429f-9d66-f8975cbf9202",
      storedExternalThreadId: alias,
      sentAt: "2026-06-25T00:00:00.000Z",
      contractMarker: "mind_claim_risk_brief_json_v2",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(mockFetchHistory).toHaveBeenCalledWith(
      expect.objectContaining({ conversationAlias: alias })
    );
    expect(mockFetchHistory).toHaveBeenCalledWith(
      expect.objectContaining({ conversationAlias: conversationId })
    );
    expect(result.candidates).toHaveLength(1);
    expect(result.diagnostics.history_probe_summary).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: alias,
          key_kind: "alias",
          raw_message_count: 0,
          matching_contract_version_messages: 0,
        }),
        expect.objectContaining({
          key: conversationId,
          key_kind: "conversation_id",
          source_alias: alias,
          raw_message_count: 1,
          matching_contract_version_messages: 1,
        }),
      ])
    );
  });
});

describe("external-mind-hellominds-conversations", () => {
  it("treats lucient deterministic aliases as retrievable history keys", () => {
    expect(
      isHelloMindsMessagingHistoryAlias(
        "lucient-em-mrb-3abf5261-92c4-429f-9d66-f8975cbf9202"
      )
    ).toBe(true);
    expect(isHelloMindsMessagingHistoryAlias("lucient-em-mce-job-1")).toBe(true);
    expect(isHelloMindsMessagingHistoryAlias("lucient-em-ho-handoff-1")).toBe(true);
  });

  it("rejects mind thread suffixes and email channel ids as history keys", () => {
    expect(isHelloMindsMessagingHistoryAlias("df11")).toBe(false);
    expect(isHelloMindsMessagingHistoryAlias("29C3573E")).toBe(false);
  });
});

describe("resolveMindClaimHelloMindsHistoryKeys", () => {
  it("uses deterministic alias and skips non-alias stored external_thread_id", () => {
    const resolved = resolveMindClaimHelloMindsHistoryKeys({
      jobKind: "risk_brief",
      jobId: "3abf5261-92c4-429f-9d66-f8975cbf9202",
      storedExternalThreadId: "df11",
    });

    expect(resolved.keys).toEqual([
      "lucient-em-mrb-3abf5261-92c4-429f-9d66-f8975cbf9202",
    ]);
    expect(resolved.notes.join(" ")).toContain('Skipped stored external_thread_id "df11"');
  });

  it("includes stored alias when it is retrievable", () => {
    const alias = "lucient-em-mrb-3abf5261-92c4-429f-9d66-f8975cbf9202";
    const resolved = resolveMindClaimHelloMindsHistoryKeys({
      jobKind: "risk_brief",
      jobId: "3abf5261-92c4-429f-9d66-f8975cbf9202",
      storedExternalThreadId: alias,
    });

    expect(resolved.keys).toEqual([alias]);
  });
});

describe("getHelloMindsEmailChannelProbeIds", () => {
  it("parses configured probe channel ids", () => {
    const original = process.env.EXTERNAL_MIND_HELLOMINDS_EMAIL_CHANNEL_ID;
    process.env.EXTERNAL_MIND_HELLOMINDS_EMAIL_CHANNEL_ID = "29C3573E,other";
    expect(getHelloMindsEmailChannelProbeIds()).toEqual(["29C3573E", "other"]);
    process.env.EXTERNAL_MIND_HELLOMINDS_EMAIL_CHANNEL_ID = original;
  });
});
