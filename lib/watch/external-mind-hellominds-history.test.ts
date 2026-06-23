import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildPrivacySafeHelloMindsMessageExcerpt,
  fetchHelloMindsConversationHistory,
  HELLOMINDS_PARTY_TYPE_HUMAN,
  HELLOMINDS_PARTY_TYPE_MIND,
  parseHelloMindsHistoryMessages,
  summarizeHelloMindsHistoryMessages,
} from "@/lib/watch/external-mind-hellominds-history";

const originalFetch = global.fetch;
const originalEnv = { ...process.env };

beforeEach(() => {
  process.env.EXTERNAL_MIND_HELLOMINDS_BASE_URL = "https://api.build.hellominds.ai";
  process.env.EXTERNAL_MIND_HELLOMINDS_ACCESS_KEY = "hellominds-secret-key";
});

afterEach(() => {
  global.fetch = originalFetch;
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
});

describe("external-mind-hellominds-history", () => {
  it("parses history messages and strips attachment bodies", () => {
    const messages = parseHelloMindsHistoryMessages([
      {
        alias: "lucient-em-ho-handoff-001",
        messageText: "Mind reply text",
        createdAt: "2026-06-23T10:00:00.000Z",
        fingerprint: "fp-mind-001",
        partyType: HELLOMINDS_PARTY_TYPE_MIND,
        attachments: [
          {
            artifactId: "artifact-001",
            mimeType: "application/pdf",
            extension: "pdf",
            body: "YmFzZTY0LWFydGlmYWN0LQ==",
          },
        ],
      },
    ]);

    expect(messages).toHaveLength(1);
    expect(messages[0]?.attachments?.[0]).toEqual({
      artifactId: "artifact-001",
      mimeType: "application/pdf",
      extension: "pdf",
    });
    expect(JSON.stringify(messages[0])).not.toContain("YmFzZTY0");
    expect(JSON.stringify(messages[0])).not.toContain("body");
  });

  it("prefers latest partyType=0 Mind reply and preserves latest fingerprint", () => {
    const summary = summarizeHelloMindsHistoryMessages([
      {
        messageText: "Builder outbound line",
        createdAt: "2026-06-23T11:00:00.000Z",
        fingerprint: "fp-human-002",
        partyType: HELLOMINDS_PARTY_TYPE_HUMAN,
      },
      {
        messageText: "Earlier Mind reply",
        createdAt: "2026-06-23T09:00:00.000Z",
        fingerprint: "fp-mind-001",
        partyType: HELLOMINDS_PARTY_TYPE_MIND,
      },
      {
        messageText: "Latest Mind reply with more detail",
        createdAt: "2026-06-23T10:00:00.000Z",
        fingerprint: "fp-mind-002",
        partyType: HELLOMINDS_PARTY_TYPE_MIND,
      },
    ]);

    expect(summary.mind_reply_state).toBe("mind_reply_found");
    expect(summary.latest_fingerprint).toBe("fp-human-002");
    expect(summary.latest_mind_reply?.messageText).toBe("Latest Mind reply with more detail");
    expect(summary.response_excerpt).toBe("Latest Mind reply with more detail");
  });

  it("returns no_reply_yet when only human or empty rows exist", () => {
    const summary = summarizeHelloMindsHistoryMessages([
      {
        messageText: "Builder outbound line",
        createdAt: "2026-06-23T11:00:00.000Z",
        fingerprint: "fp-human-002",
        partyType: HELLOMINDS_PARTY_TYPE_HUMAN,
      },
    ]);

    expect(summary.mind_reply_state).toBe("no_reply_yet");
    expect(summary.response_excerpt).toBeNull();
  });

  it("builds privacy-safe excerpts", () => {
    const excerpt = buildPrivacySafeHelloMindsMessageExcerpt("a".repeat(600), 100);
    expect(excerpt).toHaveLength(100);
    expect(excerpt?.endsWith("…")).toBe(true);
  });

  it("maps 404 to conversation not found", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    }) as unknown as typeof fetch;

    const result = await fetchHelloMindsConversationHistory({
      conversationAlias: "lucient-em-ho-handoff-001",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("conversation_not_found");
      expect(result.message).toBe("Conversation not found.");
    }
  });

  it("maps 401 to auth error without exposing the access key", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
    }) as unknown as typeof fetch;

    const result = await fetchHelloMindsConversationHistory({
      conversationAlias: "lucient-em-ho-handoff-001",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("auth_failed");
      expect(result.message).not.toContain("hellominds-secret-key");
    }
  });

  it("calls history endpoint only with GET", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [
        {
          messageText: "Mind reply",
          partyType: HELLOMINDS_PARTY_TYPE_MIND,
          fingerprint: "fp-001",
          createdAt: "2026-06-23T10:00:00.000Z",
        },
      ],
    }) as unknown as typeof fetch;

    const result = await fetchHelloMindsConversationHistory({
      conversationAlias: "lucient-em-ho-handoff-001",
      limit: 50,
    });

    expect(result.ok).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(url).toContain("/v1/messaging/history/lucient-em-ho-handoff-001");
    expect(url).toContain("limit=50");
    expect(init.method).toBe("GET");
    expect(init.headers).toMatchObject({
      "X-Access-Key": "hellominds-secret-key",
    });
  });
});
