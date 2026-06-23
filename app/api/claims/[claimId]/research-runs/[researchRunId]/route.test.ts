import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockAuthorizeReviewQueueApiRequest = vi.fn();
const mockBuildClaimResearchRunDetailApiResponse = vi.fn();

vi.mock("@/lib/operator-auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/operator-auth")>();
  return {
    ...actual,
    authorizeReviewQueueApiRequest: (...args: unknown[]) =>
      mockAuthorizeReviewQueueApiRequest(...args),
  };
});

vi.mock("@/lib/review/claims-research-api", () => ({
  buildClaimResearchRunDetailApiResponse: (...args: unknown[]) =>
    mockBuildClaimResearchRunDetailApiResponse(...args),
}));

import { NextRequest } from "next/server";

import { GET } from "@/app/api/claims/[claimId]/research-runs/[researchRunId]/route";

const breakGlassAccess = {
  authorized: true,
  mode: "break_glass",
  workspaceIds: null,
} as const;

beforeEach(() => {
  mockBuildClaimResearchRunDetailApiResponse.mockResolvedValue({
    status: 200,
    body: { ok: true, research_run: { research_run_id: "run-001" } },
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/claims/[claimId]/research-runs/[researchRunId]", () => {
  it("returns research run detail when authorized", async () => {
    mockAuthorizeReviewQueueApiRequest.mockResolvedValue(breakGlassAccess);

    const response = await GET(
      new NextRequest("http://localhost/api/claims/claim-001/research-runs/run-001"),
      { params: Promise.resolve({ claimId: "claim-001", researchRunId: "run-001" }) }
    );

    expect(response.status).toBe(200);
    expect(mockBuildClaimResearchRunDetailApiResponse).toHaveBeenCalledWith(
      "claim-001",
      "run-001",
      breakGlassAccess
    );
  });
});
