import { beforeEach, describe, expect, it, vi } from "vitest";

const mockProcessMindHandoffReceiptVerificationSubmission = vi.fn();
const mockResolveReviewQueueAccess = vi.fn();

vi.mock("@/lib/review/mind-digests-page", () => ({
  processMindHandoffReceiptVerificationSubmission: (...args: unknown[]) =>
    mockProcessMindHandoffReceiptVerificationSubmission(...args),
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

import { POST } from "@/app/mind-handoffs/verify-receipt/route";

const operatorAccess = {
  authorized: true,
  mode: "operator" as const,
  userId: "user-123",
  workspaceIds: ["demo-workspace-spa-menu"],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockResolveReviewQueueAccess.mockResolvedValue(operatorAccess);
  mockProcessMindHandoffReceiptVerificationSubmission.mockResolvedValue({
    redirectPath:
      "/mind-digests?digest_id=digest-uuid-001&handoff_destination=hellominds&receipt_ok=1&receipt_status=delivery_confirmed_from_send_event&receipt_source=send_event_metadata",
    result: { ok: true },
  });
});

describe("POST /mind-handoffs/verify-receipt", () => {
  it("redirects after successful receipt verification without calling send", async () => {
    const request = new Request("https://example.com/mind-handoffs/verify-receipt", {
      method: "POST",
      body: new URLSearchParams({
        handoff_id: "handoff-uuid-hellominds",
        digest_id: "digest-uuid-001",
        handoff_destination: "hellominds",
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://example.com/mind-digests?digest_id=digest-uuid-001&handoff_destination=hellominds&receipt_ok=1&receipt_status=delivery_confirmed_from_send_event&receipt_source=send_event_metadata"
    );
    expect(mockProcessMindHandoffReceiptVerificationSubmission).toHaveBeenCalled();
  });

  it("redirects without verifying when unauthorized", async () => {
    mockResolveReviewQueueAccess.mockResolvedValueOnce({
      authorized: false,
      status: 401,
      reason: "Unauthorized",
    });

    const request = new Request("https://example.com/mind-handoffs/verify-receipt", {
      method: "POST",
      body: new URLSearchParams({
        handoff_id: "handoff-uuid-hellominds",
      }),
    });

    const response = await POST(request);
    expect(response.headers.get("location")).toBe("https://example.com/mind-digests");
    expect(mockProcessMindHandoffReceiptVerificationSubmission).not.toHaveBeenCalled();
  });
});

