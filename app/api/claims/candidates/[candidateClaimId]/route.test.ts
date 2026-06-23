import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockAuthorizeReviewQueueApiRequest = vi.fn();
const mockBuildCandidateClaimPatchApiResponse = vi.fn();
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
  buildCandidateClaimPatchApiResponse: (...args: unknown[]) =>
    mockBuildCandidateClaimPatchApiResponse(...args),
}));

vi.mock("@/lib/watch/external-mind-handoff-send", () => ({
  sendExternalMindHandoff: (...args: unknown[]) => mockSendExternalMindHandoff(...args),
}));

import { NextRequest } from "next/server";

import { PATCH } from "@/app/api/claims/candidates/[candidateClaimId]/route";
import { CURRENT_WATCH_PHASE } from "@/lib/watch/watch-phase";

const breakGlassAccess = {
  authorized: true,
  mode: "break_glass",
  workspaceIds: null,
} as const;

beforeEach(() => {
  mockBuildCandidateClaimPatchApiResponse.mockResolvedValue({
    status: 200,
    body: {
      ok: true,
      phase: CURRENT_WATCH_PHASE,
      candidate: { candidate_claim_id: "candidate-001", status: "candidate" },
    },
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("PATCH /api/claims/candidates/[candidateClaimId]", () => {
  it("returns 401 when review auth fails", async () => {
    mockAuthorizeReviewQueueApiRequest.mockResolvedValue({
      authorized: false,
      status: 401,
      body: { ok: false, error: "unauthorized" },
    });

    const response = await PATCH(
      new NextRequest("http://localhost/api/claims/candidates/candidate-001", {
        method: "PATCH",
        body: JSON.stringify({ claim_text: "supports restorative sleep" }),
      }),
      { params: Promise.resolve({ candidateClaimId: "candidate-001" }) }
    );

    expect(response.status).toBe(401);
    expect(mockBuildCandidateClaimPatchApiResponse).not.toHaveBeenCalled();
    expect(mockSendExternalMindHandoff).not.toHaveBeenCalled();
  });

  it("updates candidate when authorized", async () => {
    mockAuthorizeReviewQueueApiRequest.mockResolvedValue(breakGlassAccess);

    const response = await PATCH(
      new NextRequest("http://localhost/api/claims/candidates/candidate-001", {
        method: "PATCH",
        body: JSON.stringify({ claim_text: "supports restorative sleep" }),
      }),
      { params: Promise.resolve({ candidateClaimId: "candidate-001" }) }
    );

    expect(response.status).toBe(200);
    expect(mockBuildCandidateClaimPatchApiResponse).toHaveBeenCalled();
    expect(mockSendExternalMindHandoff).not.toHaveBeenCalled();
  });
});
