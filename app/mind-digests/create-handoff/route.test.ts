import { beforeEach, describe, expect, it, vi } from "vitest";

const mockProcessMindHandoffCreationSubmission = vi.fn();
const mockResolveReviewQueueAccess = vi.fn();

vi.mock("@/lib/review/mind-digests-page", () => ({
  processMindHandoffCreationSubmission: (...args: unknown[]) =>
    mockProcessMindHandoffCreationSubmission(...args),
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

import { POST } from "@/app/mind-digests/create-handoff/route";

const operatorAccess = {
  authorized: true,
  mode: "operator" as const,
  userId: "user-123",
  workspaceIds: ["demo-workspace-spa-menu"],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockResolveReviewQueueAccess.mockResolvedValue(operatorAccess);
  mockProcessMindHandoffCreationSubmission.mockResolvedValue({
    redirectPath: "/mind-digests?digest_id=digest-uuid-001&handoff_ok=1",
    result: { ok: true },
  });
});

describe("POST /mind-digests/create-handoff", () => {
  it("redirects after successful handoff creation", async () => {
    const formData = new FormData();
    formData.set("digest_id", "digest-uuid-001");

    const request = new Request("https://example.com/mind-digests/create-handoff", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request);

    expect(response.headers.get("location")).toBe(
      "https://example.com/mind-digests?digest_id=digest-uuid-001&handoff_ok=1"
    );
  });

  it("redirects without creating when unauthorized", async () => {
    mockResolveReviewQueueAccess.mockResolvedValueOnce({
      authorized: false,
      status: 401,
      reason: "Unauthorized",
    });

    const request = new Request("https://example.com/mind-digests/create-handoff", {
      method: "POST",
      body: new FormData(),
    });

    const response = await POST(request);

    expect(response.headers.get("location")).toBe("https://example.com/mind-digests");
    expect(mockProcessMindHandoffCreationSubmission).not.toHaveBeenCalled();
  });
});
