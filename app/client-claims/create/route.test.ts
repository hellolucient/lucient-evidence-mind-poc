import { beforeEach, describe, expect, it, vi } from "vitest";

const mockProcessClientClaimCreateSubmission = vi.fn();
const mockResolveReviewQueueAccess = vi.fn();

vi.mock("@/lib/review/client-claims-page", () => ({
  processClientClaimCreateSubmission: (...args: unknown[]) =>
    mockProcessClientClaimCreateSubmission(...args),
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

import { POST } from "@/app/client-claims/create/route";

const operatorAccess = {
  authorized: true,
  mode: "operator" as const,
  userId: "user-123",
  workspaceIds: ["demo-workspace-spa-menu"],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockResolveReviewQueueAccess.mockResolvedValue(operatorAccess);
  mockProcessClientClaimCreateSubmission.mockResolvedValue({
    redirectPath: "/client-claims?create_ok=1",
    result: { ok: true },
  });
});

describe("POST /client-claims/create", () => {
  it("redirects to client claims page after successful create", async () => {
    const formData = new FormData();
    formData.set("workspace_id", "demo-workspace-spa-menu");
    formData.set("client_claim_id", "new-claim-001");
    formData.set("claim_text", "Supports healthy sleep.");

    const request = new Request("https://example.com/client-claims/create", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request);

    expect(response.headers.get("location")).toBe("https://example.com/client-claims?create_ok=1");
  });

  it("redirects without creating when unauthorized", async () => {
    mockResolveReviewQueueAccess.mockResolvedValueOnce({
      authorized: false,
      status: 401,
      reason: "Unauthorized",
    });

    const request = new Request("https://example.com/client-claims/create", {
      method: "POST",
      body: new FormData(),
    });

    const response = await POST(request);

    expect(response.headers.get("location")).toBe("https://example.com/client-claims");
    expect(mockProcessClientClaimCreateSubmission).not.toHaveBeenCalled();
  });
});
