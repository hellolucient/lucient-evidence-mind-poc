import { beforeEach, describe, expect, it, vi } from "vitest";

const mockProcessMindHandoffSendSubmission = vi.fn();
const mockResolveReviewQueueAccess = vi.fn();

vi.mock("@/lib/review/mind-digests-page", () => ({
  processMindHandoffSendSubmission: (...args: unknown[]) =>
    mockProcessMindHandoffSendSubmission(...args),
}));

vi.mock("@/lib/operator-auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/operator-auth")>();
  return {
    ...actual,
    resolveReviewQueueAccess: (...args: unknown[]) => mockResolveReviewQueueAccess(...args),
  };
});

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { POST } from "@/app/mind-handoffs/send/route";

const operatorAccess = {
  authorized: true,
  mode: "operator" as const,
  userId: "user-123",
  workspaceIds: ["demo-workspace-spa-menu"],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockResolveReviewQueueAccess.mockResolvedValue(operatorAccess);
  mockProcessMindHandoffSendSubmission.mockResolvedValue({
    redirectPath: "/mind-digests?digest_id=digest-uuid-001&send_ok=1&send_result=test_sink_sent",
    result: { ok: true },
  });
});

describe("POST /mind-handoffs/send", () => {
  it("redirects after successful test sink send", async () => {
    const formData = new FormData();
    formData.set("handoff_id", "handoff-uuid-001");
    formData.set("digest_id", "digest-uuid-001");

    const request = new Request("https://example.com/mind-handoffs/send", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request);

    expect(response.headers.get("location")).toBe(
      "https://example.com/mind-digests?digest_id=digest-uuid-001&send_ok=1&send_result=test_sink_sent"
    );
  });

  it("redirects without sending when unauthorized", async () => {
    mockResolveReviewQueueAccess.mockResolvedValueOnce({
      authorized: false,
      status: 401,
      reason: "Unauthorized",
    });

    const request = new Request("https://example.com/mind-handoffs/send", {
      method: "POST",
      body: new FormData(),
    });

    const response = await POST(request);

    expect(response.headers.get("location")).toBe("https://example.com/mind-digests");
    expect(mockProcessMindHandoffSendSubmission).not.toHaveBeenCalled();
  });
});
