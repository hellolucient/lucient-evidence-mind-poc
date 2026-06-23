import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockAuthorizeReviewQueueApiRequest = vi.fn();
const mockBuildClaimsExtractionDetailApiResponse = vi.fn();

vi.mock("@/lib/operator-auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/operator-auth")>();
  return {
    ...actual,
    authorizeReviewQueueApiRequest: (...args: unknown[]) =>
      mockAuthorizeReviewQueueApiRequest(...args),
  };
});

vi.mock("@/lib/review/claims-extract-api", () => ({
  buildClaimsExtractionDetailApiResponse: (...args: unknown[]) =>
    mockBuildClaimsExtractionDetailApiResponse(...args),
}));

import { NextRequest } from "next/server";

import { GET } from "@/app/api/claims/extractions/[extractionId]/route";
import { CURRENT_WATCH_PHASE } from "@/lib/watch/watch-phase";

const breakGlassAccess = {
  authorized: true,
  mode: "break_glass",
  workspaceIds: null,
} as const;

beforeEach(() => {
  mockBuildClaimsExtractionDetailApiResponse.mockResolvedValue({
    status: 200,
    body: {
      ok: true,
      phase: CURRENT_WATCH_PHASE,
      route: "/api/claims/extractions/run-001",
      extraction: { extraction_id: "run-001" },
      candidate_claims: [],
    },
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/claims/extractions/[extractionId]", () => {
  it("returns 401 when review auth fails", async () => {
    mockAuthorizeReviewQueueApiRequest.mockResolvedValue({
      authorized: false,
      status: 401,
      reason: "Unauthorized review queue request.",
      body: {
        ok: false,
        error: "unauthorized",
        phase: CURRENT_WATCH_PHASE,
      },
    });

    const response = await GET(
      new NextRequest("http://localhost/api/claims/extractions/run-001"),
      { params: Promise.resolve({ extractionId: "run-001" }) }
    );

    expect(response.status).toBe(401);
    expect(mockBuildClaimsExtractionDetailApiResponse).not.toHaveBeenCalled();
  });

  it("returns extraction detail when authorized", async () => {
    mockAuthorizeReviewQueueApiRequest.mockResolvedValue(breakGlassAccess);

    const response = await GET(
      new NextRequest("http://localhost/api/claims/extractions/run-001"),
      { params: Promise.resolve({ extractionId: "run-001" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(mockBuildClaimsExtractionDetailApiResponse).toHaveBeenCalledWith(
      "run-001",
      breakGlassAccess
    );
  });
});
