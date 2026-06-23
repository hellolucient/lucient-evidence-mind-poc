import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockAuthorizeReviewQueueApiRequest = vi.fn();
const mockBuildClaimRegistryDetailApiResponse = vi.fn();

vi.mock("@/lib/operator-auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/operator-auth")>();
  return {
    ...actual,
    authorizeReviewQueueApiRequest: (...args: unknown[]) =>
      mockAuthorizeReviewQueueApiRequest(...args),
  };
});

vi.mock("@/lib/review/claims-review-api", () => ({
  buildClaimRegistryDetailApiResponse: (...args: unknown[]) =>
    mockBuildClaimRegistryDetailApiResponse(...args),
}));

import { NextRequest } from "next/server";

import { GET } from "@/app/api/claims/[claimId]/route";
import { CURRENT_WATCH_PHASE } from "@/lib/watch/watch-phase";

const breakGlassAccess = {
  authorized: true,
  mode: "break_glass",
  workspaceIds: null,
} as const;

beforeEach(() => {
  mockBuildClaimRegistryDetailApiResponse.mockResolvedValue({
    status: 200,
    body: {
      ok: true,
      phase: CURRENT_WATCH_PHASE,
      route: "/api/claims/claim-001",
      claim: { claim_id: "claim-001" },
    },
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/claims/[claimId]", () => {
  it("returns 401 when review auth fails", async () => {
    mockAuthorizeReviewQueueApiRequest.mockResolvedValue({
      authorized: false,
      status: 401,
      body: { ok: false, error: "unauthorized" },
    });

    const response = await GET(new NextRequest("http://localhost/api/claims/claim-001"), {
      params: Promise.resolve({ claimId: "claim-001" }),
    });

    expect(response.status).toBe(401);
    expect(mockBuildClaimRegistryDetailApiResponse).not.toHaveBeenCalled();
  });

  it("returns claim detail when authorized", async () => {
    mockAuthorizeReviewQueueApiRequest.mockResolvedValue(breakGlassAccess);

    const response = await GET(new NextRequest("http://localhost/api/claims/claim-001"), {
      params: Promise.resolve({ claimId: "claim-001" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.claim).toEqual({ claim_id: "claim-001" });
    expect(mockBuildClaimRegistryDetailApiResponse).toHaveBeenCalledWith(
      "claim-001",
      breakGlassAccess
    );
  });
});
