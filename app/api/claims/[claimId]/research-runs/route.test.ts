import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockAuthorizeReviewQueueApiRequest = vi.fn();
const mockBuildClaimResearchRunsListApiResponse = vi.fn();

vi.mock("@/lib/operator-auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/operator-auth")>();
  return {
    ...actual,
    authorizeReviewQueueApiRequest: (...args: unknown[]) =>
      mockAuthorizeReviewQueueApiRequest(...args),
  };
});

vi.mock("@/lib/review/claims-research-api", () => ({
  buildClaimResearchRunsListApiResponse: (...args: unknown[]) =>
    mockBuildClaimResearchRunsListApiResponse(...args),
}));

import { NextRequest } from "next/server";

import { GET } from "@/app/api/claims/[claimId]/research-runs/route";

const breakGlassAccess = {
  authorized: true,
  mode: "break_glass",
  workspaceIds: null,
} as const;

beforeEach(() => {
  mockBuildClaimResearchRunsListApiResponse.mockResolvedValue({
    status: 200,
    body: { ok: true, count: 1, research_runs: [] },
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/claims/[claimId]/research-runs", () => {
  it("returns 401 when review auth fails", async () => {
    mockAuthorizeReviewQueueApiRequest.mockResolvedValue({
      authorized: false,
      status: 401,
      body: { ok: false, error: "unauthorized" },
    });

    const response = await GET(
      new NextRequest("http://localhost/api/claims/claim-001/research-runs"),
      { params: Promise.resolve({ claimId: "claim-001" }) }
    );

    expect(response.status).toBe(401);
  });

  it("lists research runs when authorized", async () => {
    mockAuthorizeReviewQueueApiRequest.mockResolvedValue(breakGlassAccess);

    const response = await GET(
      new NextRequest("http://localhost/api/claims/claim-001/research-runs"),
      { params: Promise.resolve({ claimId: "claim-001" }) }
    );

    expect(response.status).toBe(200);
    expect(mockBuildClaimResearchRunsListApiResponse).toHaveBeenCalledWith(
      "claim-001",
      breakGlassAccess
    );
  });
});
