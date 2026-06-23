import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockAuthorizeReviewQueueApiRequest = vi.fn();
const mockBuildCandidateClaimAcceptApiResponse = vi.fn();
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
  buildCandidateClaimAcceptApiResponse: (...args: unknown[]) =>
    mockBuildCandidateClaimAcceptApiResponse(...args),
}));

vi.mock("@/lib/watch/external-mind-handoff-send", () => ({
  sendExternalMindHandoff: (...args: unknown[]) => mockSendExternalMindHandoff(...args),
}));

import { NextRequest } from "next/server";

import { POST } from "@/app/api/claims/candidates/[candidateClaimId]/accept/route";
import { CURRENT_WATCH_PHASE } from "@/lib/watch/watch-phase";

const breakGlassAccess = {
  authorized: true,
  mode: "break_glass",
  workspaceIds: null,
} as const;

beforeEach(() => {
  mockBuildCandidateClaimAcceptApiResponse.mockResolvedValue({
    status: 201,
    body: {
      ok: true,
      phase: CURRENT_WATCH_PHASE,
      claim: { claim_id: "claim-001", research_status: "not_started" },
      candidate: { candidate_claim_id: "candidate-001", status: "accepted" },
      already_accepted: false,
    },
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/claims/candidates/[candidateClaimId]/accept", () => {
  it("returns 401 when review auth fails", async () => {
    mockAuthorizeReviewQueueApiRequest.mockResolvedValue({
      authorized: false,
      status: 401,
      body: { ok: false, error: "unauthorized" },
    });

    const response = await POST(
      new NextRequest("http://localhost/api/claims/candidates/candidate-001/accept", {
        method: "POST",
      }),
      { params: Promise.resolve({ candidateClaimId: "candidate-001" }) }
    );

    expect(response.status).toBe(401);
    expect(mockBuildCandidateClaimAcceptApiResponse).not.toHaveBeenCalled();
    expect(mockSendExternalMindHandoff).not.toHaveBeenCalled();
  });

  it("accepts candidate when authorized", async () => {
    mockAuthorizeReviewQueueApiRequest.mockResolvedValue(breakGlassAccess);

    const response = await POST(
      new NextRequest("http://localhost/api/claims/candidates/candidate-001/accept", {
        method: "POST",
      }),
      { params: Promise.resolve({ candidateClaimId: "candidate-001" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.claim?.research_status).toBe("not_started");
    expect(mockBuildCandidateClaimAcceptApiResponse).toHaveBeenCalledWith(
      "candidate-001",
      breakGlassAccess
    );
    expect(mockSendExternalMindHandoff).not.toHaveBeenCalled();
  });
});
