import { beforeEach, describe, expect, it, vi } from "vitest";

const mockProcessClientClaimMappingCreateSubmission = vi.fn();
const mockListClaimFamilyProfiles = vi.fn();
const mockResolveReviewQueueAccess = vi.fn();

vi.mock("@/lib/review/client-claims-page", () => ({
  processClientClaimMappingCreateSubmission: (...args: unknown[]) =>
    mockProcessClientClaimMappingCreateSubmission(...args),
}));

vi.mock("@/lib/watch/claim-family-profile-store", () => ({
  listClaimFamilyProfiles: (...args: unknown[]) => mockListClaimFamilyProfiles(...args),
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

import { POST } from "@/app/client-claims/create-mapping/route";

const operatorAccess = {
  authorized: true,
  mode: "operator" as const,
  userId: "user-123",
  workspaceIds: ["demo-workspace-spa-menu"],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockResolveReviewQueueAccess.mockResolvedValue(operatorAccess);
  mockListClaimFamilyProfiles.mockResolvedValue({
    profiles: [{ claim_family: "magnesium_cortisol_stress", display_name: "Magnesium / Stress / Cortisol" }],
  });
  mockProcessClientClaimMappingCreateSubmission.mockResolvedValue({
    redirectPath: "/client-claims?mapping_ok=1",
    result: { ok: true },
  });
});

describe("POST /client-claims/create-mapping", () => {
  it("redirects to client claims page after successful mapping create", async () => {
    const formData = new FormData();
    formData.set("workspace_id", "demo-workspace-spa-menu");
    formData.set("client_claim_id", "demo-claim-magnesium-stress-001");
    formData.set("claim_family", "magnesium_cortisol_stress");

    const request = new Request("https://example.com/client-claims/create-mapping", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request);

    expect(response.headers.get("location")).toBe("https://example.com/client-claims?mapping_ok=1");
    expect(mockProcessClientClaimMappingCreateSubmission).toHaveBeenCalledWith(
      expect.any(FormData),
      operatorAccess,
      ["magnesium_cortisol_stress"]
    );
  });

  it("redirects without creating when unauthorized", async () => {
    mockResolveReviewQueueAccess.mockResolvedValueOnce({
      authorized: false,
      status: 401,
      reason: "Unauthorized",
    });

    const request = new Request("https://example.com/client-claims/create-mapping", {
      method: "POST",
      body: new FormData(),
    });

    const response = await POST(request);

    expect(response.headers.get("location")).toBe("https://example.com/client-claims");
    expect(mockProcessClientClaimMappingCreateSubmission).not.toHaveBeenCalled();
  });
});
