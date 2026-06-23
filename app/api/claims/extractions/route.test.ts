import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockAuthorizeReviewQueueApiRequest = vi.fn();
const mockBuildClaimsExtractionsListApiResponse = vi.fn();

vi.mock("@/lib/operator-auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/operator-auth")>();
  return {
    ...actual,
    authorizeReviewQueueApiRequest: (...args: unknown[]) =>
      mockAuthorizeReviewQueueApiRequest(...args),
  };
});

vi.mock("@/lib/review/claims-extract-api", () => ({
  parseClaimsExtractListFilters: (searchParams: URLSearchParams) => ({
    workspace_id: searchParams.get("workspace_id") ?? undefined,
  }),
  buildClaimsExtractionsListApiResponse: (...args: unknown[]) =>
    mockBuildClaimsExtractionsListApiResponse(...args),
}));

import { NextRequest } from "next/server";

import { GET } from "@/app/api/claims/extractions/route";
import { CURRENT_WATCH_PHASE } from "@/lib/watch/watch-phase";

const breakGlassAccess = {
  authorized: true,
  mode: "break_glass",
  workspaceIds: null,
} as const;

beforeEach(() => {
  mockBuildClaimsExtractionsListApiResponse.mockResolvedValue({
    ok: true,
    phase: CURRENT_WATCH_PHASE,
    route: "/api/claims/extractions",
    count: 1,
    extractions: [],
    list_error: null,
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/claims/extractions", () => {
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
      new NextRequest("http://localhost/api/claims/extractions")
    );

    expect(response.status).toBe(401);
    expect(mockBuildClaimsExtractionsListApiResponse).not.toHaveBeenCalled();
  });

  it("returns extraction list when authorized", async () => {
    mockAuthorizeReviewQueueApiRequest.mockResolvedValue(breakGlassAccess);

    const response = await GET(
      new NextRequest(
        "http://localhost/api/claims/extractions?workspace_id=demo-workspace-spa-menu"
      )
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(mockBuildClaimsExtractionsListApiResponse).toHaveBeenCalledWith(
      expect.objectContaining({ workspace_id: "demo-workspace-spa-menu" }),
      breakGlassAccess
    );
  });
});
