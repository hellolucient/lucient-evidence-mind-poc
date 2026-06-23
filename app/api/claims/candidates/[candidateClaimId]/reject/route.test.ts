import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockAuthorizeReviewQueueApiRequest = vi.fn();
const mockBuildCandidateClaimRejectApiResponse = vi.fn();
const mockSendExternalMindHandoff = vi.fn();

vi.mock("@/lib/operator-auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/operator-auth")>();
  return {
    ...actual,
    authorizeReviewQueueApiRequest: (...args: unknown[]) =>
      mockAuthorizeReviewQueueApiRequest(...args),
  };
});

vi.mock("@/lib/review/claims-review-api", () => ({
  buildCandidateClaimRejectApiResponse: (...args: unknown[]) =>
    mockBuildCandidateClaimRejectApiResponse(...args),
}));

vi.mock("@/lib/watch/external-mind-handoff-send", () => ({
  sendExternalMindHandoff: (...args: unknown[]) => mockSendExternalMindHandoff(...args),
}));

import { NextRequest } from "next/server";

import { POST } from "@/app/api/claims/candidates/[candidateClaimId]/reject/route";
import { CURRENT_WATCH_PHASE } from "@/lib/watch/watch-phase";

const breakGlassAccess = {
  authorized: true,
  mode: "break_glass",
  workspaceIds: null,
} as const;

beforeEach(() => {
  mockBuildCandidateClaimRejectApiResponse.mockResolvedValue({
    status: 200,
    body: {
      ok: true,
      phase: CURRENT_WATCH_PHASE,
      candidate: { candidate_claim_id: "candidate-001", status: "rejected" },
      already_rejected: false,
    },
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/claims/candidates/[candidateClaimId]/reject", () => {
  it("returns 401 when review auth fails", async () => {
    mockAuthorizeReviewQueueApiRequest.mockResolvedValue({
      authorized: false,
      status: 401,
      body: { ok: false, error: "unauthorized" },
    });

    const response = await POST(
      new NextRequest("http://localhost/api/claims/candidates/candidate-001/reject", {
        method: "POST",
      }),
      { params: Promise.resolve({ candidateClaimId: "candidate-001" }) }
    );

    expect(response.status).toBe(401);
    expect(mockBuildCandidateClaimRejectApiResponse).not.toHaveBeenCalled();
    expect(mockSendExternalMindHandoff).not.toHaveBeenCalled();
  });

  it("rejects candidate when authorized", async () => {
    mockAuthorizeReviewQueueApiRequest.mockResolvedValue(breakGlassAccess);

    const response = await POST(
      new NextRequest("http://localhost/api/claims/candidates/candidate-001/reject", {
        method: "POST",
      }),
      { params: Promise.resolve({ candidateClaimId: "candidate-001" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.candidate.status).toBe("rejected");
    expect(body.claim).toBeUndefined();
    expect(mockBuildCandidateClaimRejectApiResponse).toHaveBeenCalledWith(
      "candidate-001",
      breakGlassAccess
    );
    expect(mockSendExternalMindHandoff).not.toHaveBeenCalled();
  });
});
