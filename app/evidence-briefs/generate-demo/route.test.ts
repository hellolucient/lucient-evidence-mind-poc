import { beforeEach, describe, expect, it, vi } from "vitest";

const mockProcessDemoBriefGenerationSubmission = vi.fn();
const mockResolveReviewQueueAccess = vi.fn();

vi.mock("@/lib/review/evidence-briefs-page", () => ({
  processDemoBriefGenerationSubmission: (...args: unknown[]) =>
    mockProcessDemoBriefGenerationSubmission(...args),
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

import { POST } from "@/app/evidence-briefs/generate-demo/route";

const operatorAccess = {
  authorized: true,
  mode: "operator" as const,
  userId: "user-123",
  workspaceIds: ["demo-workspace-spa-menu"],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockResolveReviewQueueAccess.mockResolvedValue(operatorAccess);
  mockProcessDemoBriefGenerationSubmission.mockResolvedValue({
    redirectPath: "/evidence-briefs?generate_ok=1",
    result: { ok: true },
  });
});

describe("POST /evidence-briefs/generate-demo", () => {
  it("redirects to evidence briefs page after successful generation", async () => {
    const formData = new FormData();
    formData.set("workspace_id", "demo-workspace-spa-menu");

    const request = new Request("https://example.com/evidence-briefs/generate-demo", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request);

    expect(response.headers.get("location")).toBe("https://example.com/evidence-briefs?generate_ok=1");
  });

  it("redirects without generating when unauthorized", async () => {
    mockResolveReviewQueueAccess.mockResolvedValueOnce({
      authorized: false,
      status: 401,
      reason: "Unauthorized",
    });

    const request = new Request("https://example.com/evidence-briefs/generate-demo", {
      method: "POST",
      body: new FormData(),
    });

    const response = await POST(request);

    expect(response.headers.get("location")).toBe("https://example.com/evidence-briefs");
    expect(mockProcessDemoBriefGenerationSubmission).not.toHaveBeenCalled();
  });
});
