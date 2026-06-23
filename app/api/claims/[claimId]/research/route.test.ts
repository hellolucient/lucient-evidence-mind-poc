import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockAuthorizeReviewQueueApiRequest = vi.fn();
const mockBuildClaimResearchPostApiResponse = vi.fn();
const mockSendExternalMindHandoff = vi.fn();

vi.mock("@/lib/operator-auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/operator-auth")>();
  return {
    ...actual,
    authorizeReviewQueueApiRequest: (...args: unknown[]) =>
      mockAuthorizeReviewQueueApiRequest(...args),
  };
});

vi.mock("@/lib/review/claims-research-api", () => ({
  buildClaimResearchPostApiResponse: (...args: unknown[]) =>
    mockBuildClaimResearchPostApiResponse(...args),
}));

vi.mock("@/lib/watch/external-mind-handoff-send", () => ({
  sendExternalMindHandoff: (...args: unknown[]) => mockSendExternalMindHandoff(...args),
}));

import { NextRequest } from "next/server";

import { POST } from "@/app/api/claims/[claimId]/research/route";
import { CURRENT_WATCH_PHASE } from "@/lib/watch/watch-phase";

const breakGlassAccess = {
  authorized: true,
  mode: "break_glass",
  workspaceIds: null,
} as const;

beforeEach(() => {
  mockBuildClaimResearchPostApiResponse.mockResolvedValue({
    status: 201,
    body: {
      ok: true,
      phase: CURRENT_WATCH_PHASE,
      route: "/api/claims/claim-001/research",
      research_run: { research_mode: "mock_evidence_v1" },
    },
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/claims/[claimId]/research", () => {
  it("returns 401 when review auth fails", async () => {
    mockAuthorizeReviewQueueApiRequest.mockResolvedValue({
      authorized: false,
      status: 401,
      body: { ok: false, error: "unauthorized" },
    });

    const response = await POST(
      new NextRequest("http://localhost/api/claims/claim-001/research", { method: "POST" }),
      { params: Promise.resolve({ claimId: "claim-001" }) }
    );

    expect(response.status).toBe(401);
    expect(mockBuildClaimResearchPostApiResponse).not.toHaveBeenCalled();
  });

  it("runs controlled research when authorized", async () => {
    mockAuthorizeReviewQueueApiRequest.mockResolvedValue(breakGlassAccess);

    const response = await POST(
      new NextRequest("http://localhost/api/claims/claim-001/research", { method: "POST" }),
      { params: Promise.resolve({ claimId: "claim-001" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.ok).toBe(true);
    expect(mockBuildClaimResearchPostApiResponse).toHaveBeenCalledWith("claim-001", breakGlassAccess);
    expect(mockSendExternalMindHandoff).not.toHaveBeenCalled();
  });
});
