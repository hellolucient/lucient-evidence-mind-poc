import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockGetExternalMindHandoffById = vi.fn();
const mockGetExternalMindHandoffReceiptForHandoff = vi.fn();
const mockGetLatestExternalMindHandoffSendReceiptMetadataForHandoff = vi.fn();
const mockUpsertExternalMindHandoffReceipt = vi.fn();
const mockFetchHelloMindsConversationHistory = vi.fn();
const mockSendExternalMindHandoff = vi.fn();

vi.mock("@/lib/watch/external-mind-handoff-store", () => ({
  getExternalMindHandoffById: (...args: unknown[]) => mockGetExternalMindHandoffById(...args),
}));

vi.mock("@/lib/watch/external-mind-handoff-receipt-store", () => ({
  getExternalMindHandoffReceiptForHandoff: (...args: unknown[]) =>
    mockGetExternalMindHandoffReceiptForHandoff(...args),
  upsertExternalMindHandoffReceipt: (...args: unknown[]) =>
    mockUpsertExternalMindHandoffReceipt(...args),
}));

vi.mock("@/lib/watch/external-mind-handoff-send-event-store", () => ({
  getLatestExternalMindHandoffSendReceiptMetadataForHandoff: (...args: unknown[]) =>
    mockGetLatestExternalMindHandoffSendReceiptMetadataForHandoff(...args),
}));

vi.mock("@/lib/watch/external-mind-hellominds-history", async () => {
  const actual = await vi.importActual<typeof import("@/lib/watch/external-mind-hellominds-history")>(
    "@/lib/watch/external-mind-hellominds-history"
  );

  return {
    ...actual,
    fetchHelloMindsConversationHistory: (...args: unknown[]) =>
      mockFetchHelloMindsConversationHistory(...args),
  };
});

vi.mock("@/lib/watch/external-mind-handoff-send", () => ({
  sendExternalMindHandoff: (...args: unknown[]) => mockSendExternalMindHandoff(...args),
}));

import { fetchHelloMindsHandoffResponsePhase41B } from "@/lib/watch/external-mind-handoff-receipt-fetch";
import { HELLOMINDS_PARTY_TYPE_MIND } from "@/lib/watch/external-mind-hellominds-history";

const originalEnv = { ...process.env };

const operatorAccess = {
  authorized: true,
  mode: "operator" as const,
  userId: "user-123",
  workspaceIds: ["demo-workspace-spa-menu"],
};

const sentHandoff = {
  id: "0fd4ee13-740b-41cd-be4c-1139442bf082",
  workspace_id: "demo-workspace-spa-menu",
  digest_id: "digest-uuid-001",
  destination: "hellominds",
  payload_version: "mind_digest_payload_v1",
  payload_json: { payload_version: "mind_digest_payload_v1" },
  status: "sent",
  review_status: "approved",
  created_at: "2026-06-22T12:00:00.000Z",
  updated_at: "2026-06-22T13:00:00.000Z",
  sent_at: "2026-06-22T13:00:00.000Z",
  send_attempted_at: "2026-06-22T13:00:00.000Z",
  send_result_json: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.EXTERNAL_MIND_HELLOMINDS_CONVERSATION_ALIAS_PREFIX = "lucient-em";
  mockGetExternalMindHandoffById.mockResolvedValue({ handoff: sentHandoff });
  mockGetExternalMindHandoffReceiptForHandoff.mockResolvedValue({ receipt: null });
  mockGetLatestExternalMindHandoffSendReceiptMetadataForHandoff.mockResolvedValue({
    metadata: {
      provider: "hellominds",
      endpoint_host: "api.build.hellominds.ai",
      transport_mode: "live",
      conversation_id_suffix: "df11",
      message_id_suffix: "ab12",
    },
  });
  mockUpsertExternalMindHandoffReceipt.mockImplementation(async (input) => ({
    ok: true,
    receipt: {
      id: "receipt-uuid-001",
      ...input,
      created_at: "2026-06-23T10:00:00.000Z",
      updated_at: "2026-06-23T10:00:00.000Z",
    },
  }));
});

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("fetchHelloMindsHandoffResponsePhase41B", () => {
  it("stores Mind reply excerpt from history API using reconstructed alias", async () => {
    mockFetchHelloMindsConversationHistory.mockResolvedValue({
      ok: true,
      httpStatus: 200,
      messages: [
        {
          messageText: "Mind interpretation of the digest.",
          createdAt: "2026-06-23T10:05:00.000Z",
          fingerprint: "fp-mind-001",
          partyType: HELLOMINDS_PARTY_TYPE_MIND,
        },
      ],
    });

    const result = await fetchHelloMindsHandoffResponsePhase41B(sentHandoff.id, operatorAccess);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.conversation_alias).toBe(
        "lucient-em-ho-0fd4ee13-740b-41cd-be4c-1139442bf082"
      );
      expect(result.alias_source).toBe("reconstructed_from_handoff_id");
      expect(result.response_excerpt).toBe("Mind interpretation of the digest.");
      expect(result.mind_reply_state).toBe("mind_reply_found");
    }

    expect(mockFetchHelloMindsConversationHistory).toHaveBeenCalledWith({
      conversationAlias: "lucient-em-ho-0fd4ee13-740b-41cd-be4c-1139442bf082",
      limit: 50,
    });
    expect(mockSendExternalMindHandoff).not.toHaveBeenCalled();

    const upsertInput = mockUpsertExternalMindHandoffReceipt.mock.calls[0]?.[0];
    expect(upsertInput.receipt_status).toBe("fetched_from_hellominds");
    expect(upsertInput.receipt_source).toBe("hellominds_read_api");
    expect(upsertInput.metadata.conversation_alias).toBe(
      "lucient-em-ho-0fd4ee13-740b-41cd-be4c-1139442bf082"
    );
    expect(upsertInput.metadata.alias_source).toBe("reconstructed_from_handoff_id");
    expect(upsertInput.metadata.response_source).toBe("hellominds_history_api");
    expect(JSON.stringify(upsertInput)).not.toContain("hellominds-secret-key");
    expect(JSON.stringify(upsertInput)).not.toContain("YmFzZTY0");
  });

  it("stores no_reply_yet when history has only human rows", async () => {
    mockFetchHelloMindsConversationHistory.mockResolvedValue({
      ok: true,
      httpStatus: 200,
      messages: [
        {
          messageText: "Outbound builder line",
          createdAt: "2026-06-23T10:05:00.000Z",
          fingerprint: "fp-human-001",
          partyType: 1,
        },
      ],
    });

    const result = await fetchHelloMindsHandoffResponsePhase41B(sentHandoff.id, operatorAccess);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.mind_reply_state).toBe("no_reply_yet");
      expect(result.response_excerpt).toBeNull();
    }

    const upsertInput = mockUpsertExternalMindHandoffReceipt.mock.calls[0]?.[0];
    expect(upsertInput.response_excerpt).toBeNull();
    expect(upsertInput.metadata.mind_reply_state).toBe("no_reply_yet");
  });

  it("prefers stored conversation alias from send metadata", async () => {
    mockGetExternalMindHandoffById.mockResolvedValue({
      handoff: {
        ...sentHandoff,
        send_result_json: {
          result: "external_sent",
          destination: "hellominds",
          payload_version: "mind_digest_payload_v1",
          timestamp: "2026-06-22T13:00:00.000Z",
          conversation_alias: "stored-alias-ho-0fd4ee13-740b-41cd-be4c-1139442bf082",
        },
      },
    });
    mockFetchHelloMindsConversationHistory.mockResolvedValue({
      ok: true,
      httpStatus: 200,
      messages: [],
    });

    const result = await fetchHelloMindsHandoffResponsePhase41B(sentHandoff.id, operatorAccess);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.alias_source).toBe("stored_send_metadata");
      expect(result.conversation_alias).toBe(
        "stored-alias-ho-0fd4ee13-740b-41cd-be4c-1139442bf082"
      );
    }
  });

  it("returns prefix-not-configured error when alias cannot be resolved", async () => {
    delete process.env.EXTERNAL_MIND_HELLOMINDS_CONVERSATION_ALIAS_PREFIX;

    const result = await fetchHelloMindsHandoffResponsePhase41B(sentHandoff.id, operatorAccess);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("alias_prefix_not_configured");
      expect(result.message).toContain("alias prefix is not configured");
    }
    expect(mockFetchHelloMindsConversationHistory).not.toHaveBeenCalled();
  });

  it("surfaces conversation not found from history API", async () => {
    mockFetchHelloMindsConversationHistory.mockResolvedValue({
      ok: false,
      httpStatus: 404,
      error: "conversation_not_found",
      message: "Conversation not found.",
    });

    const result = await fetchHelloMindsHandoffResponsePhase41B(sentHandoff.id, operatorAccess);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("conversation_not_found");
      expect(result.message).toBe("Conversation not found.");
    }
  });

  it("surfaces auth error without exposing secrets", async () => {
    mockFetchHelloMindsConversationHistory.mockResolvedValue({
      ok: false,
      httpStatus: 401,
      error: "auth_failed",
      message: "HelloMinds read API authentication failed. Check HelloMinds access key configuration.",
    });

    const result = await fetchHelloMindsHandoffResponsePhase41B(sentHandoff.id, operatorAccess);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("auth_failed");
      expect(result.message).not.toContain("hellominds-secret-key");
    }
  });
});
