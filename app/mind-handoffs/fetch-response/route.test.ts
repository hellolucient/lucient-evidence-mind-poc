import { beforeEach, describe, expect, it, vi } from "vitest";

const mockProcessMindHandoffResponseFetchSubmission = vi.fn();
const mockResolveReviewQueueAccess = vi.fn();
const mockSendExternalMindHandoff = vi.fn();

vi.mock("@/lib/review/mind-digests-page", () => ({
  processMindHandoffResponseFetchSubmission: (...args: unknown[]) =>
    mockProcessMindHandoffResponseFetchSubmission(...args),
}));

vi.mock("@/lib/operator-auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/operator-auth")>();
  return {
    ...actual,
    resolveReviewQueueAccess: (...args: unknown[]) => mockResolveReviewQueueAccess(...args),
  };
});

vi.mock("@/lib/watch/external-mind-handoff-send", () => ({
  sendExternalMindHandoff: (...args: unknown[]) => mockSendExternalMindHandoff(...args),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { POST } from "@/app/mind-handoffs/fetch-response/route";

const operatorAccess = {
  authorized: true,
  mode: "operator" as const,
  userId: "user-123",
  workspaceIds: ["demo-workspace-spa-menu"],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockResolveReviewQueueAccess.mockResolvedValue(operatorAccess);
  mockProcessMindHandoffResponseFetchSubmission.mockResolvedValue({
    redirectPath:
      "/mind-digests?digest_id=digest-uuid-001&handoff_destination=hellominds&fetch_ok=1&mind_reply_state=mind_reply_found&alias_source=reconstructed_from_handoff_id&message_count=1",
    result: { ok: true },
  });
});

describe("POST /mind-handoffs/fetch-response", () => {
  it("redirects after successful response fetch without calling send", async () => {
    const request = new Request("https://example.com/mind-handoffs/fetch-response", {
      method: "POST",
      body: new URLSearchParams({
        handoff_id: "0fd4ee13-740b-41cd-be4c-1139442bf082",
        digest_id: "digest-uuid-001",
        handoff_destination: "hellominds",
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("fetch_ok=1");
    expect(mockProcessMindHandoffResponseFetchSubmission).toHaveBeenCalled();
    expect(mockSendExternalMindHandoff).not.toHaveBeenCalled();
  });

  it("redirects without fetching when unauthorized", async () => {
    mockResolveReviewQueueAccess.mockResolvedValueOnce({
      authorized: false,
      status: 401,
      reason: "Unauthorized",
    });

    const request = new Request("https://example.com/mind-handoffs/fetch-response", {
      method: "POST",
      body: new URLSearchParams({
        handoff_id: "0fd4ee13-740b-41cd-be4c-1139442bf082",
      }),
    });

    const response = await POST(request);
    expect(response.headers.get("location")).toBe("https://example.com/mind-digests");
    expect(mockProcessMindHandoffResponseFetchSubmission).not.toHaveBeenCalled();
  });
});
