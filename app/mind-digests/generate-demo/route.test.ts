import { beforeEach, describe, expect, it, vi } from "vitest";

const mockProcessDemoDigestGenerationSubmission = vi.fn();
const mockResolveReviewQueueAccess = vi.fn();

vi.mock("@/lib/review/mind-digests-page", () => ({
  processDemoDigestGenerationSubmission: (...args: unknown[]) =>
    mockProcessDemoDigestGenerationSubmission(...args),
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

import { POST } from "@/app/mind-digests/generate-demo/route";

const operatorAccess = {
  authorized: true,
  mode: "operator" as const,
  userId: "user-123",
  workspaceIds: ["demo-workspace-spa-menu"],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockResolveReviewQueueAccess.mockResolvedValue(operatorAccess);
  mockProcessDemoDigestGenerationSubmission.mockResolvedValue({
    redirectPath: "/mind-digests?generate_ok=1",
    result: { ok: true },
  });
});

describe("POST /mind-digests/generate-demo", () => {
  it("redirects to mind digests page after successful generation", async () => {
    const formData = new FormData();
    formData.set("workspace_id", "demo-workspace-spa-menu");

    const request = new Request("https://example.com/mind-digests/generate-demo", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request);

    expect(response.headers.get("location")).toBe("https://example.com/mind-digests?generate_ok=1");
  });

  it("redirects without generating when unauthorized", async () => {
    mockResolveReviewQueueAccess.mockResolvedValueOnce({
      authorized: false,
      status: 401,
      reason: "Unauthorized",
    });

    const request = new Request("https://example.com/mind-digests/generate-demo", {
      method: "POST",
      body: new FormData(),
    });

    const response = await POST(request);

    expect(response.headers.get("location")).toBe("https://example.com/mind-digests");
    expect(mockProcessDemoDigestGenerationSubmission).not.toHaveBeenCalled();
  });
});
