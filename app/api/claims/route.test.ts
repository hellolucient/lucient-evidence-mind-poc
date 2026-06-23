import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockAuthorizeReviewQueueApiRequest = vi.fn();
const mockBuildClaimsRegistryListApiResponse = vi.fn();

vi.mock("@/lib/operator-auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/operator-auth")>();
  return {
    ...actual,
    authorizeReviewQueueApiRequest: (...args: unknown[]) =>
      mockAuthorizeReviewQueueApiRequest(...args),
  };
});

vi.mock("@/lib/review/claims-review-api", () => ({
  buildClaimsRegistryListApiResponse: (...args: unknown[]) =>
    mockBuildClaimsRegistryListApiResponse(...args),
  parseClaimsRegistryListFilters: () => ({ workspace_id: "demo-workspace-spa-menu" }),
}));

import { NextRequest } from "next/server";

import { GET } from "@/app/api/claims/route";
import { CURRENT_WATCH_PHASE } from "@/lib/watch/watch-phase";

const breakGlassAccess = {
  authorized: true,
  mode: "break_glass",
  workspaceIds: null,
} as const;

beforeEach(() => {
  mockBuildClaimsRegistryListApiResponse.mockResolvedValue({
    ok: true,
    phase: CURRENT_WATCH_PHASE,
    route: "/api/claims",
    count: 0,
    claims: [],
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/claims", () => {
  it("returns 401 when review auth fails", async () => {
    mockAuthorizeReviewQueueApiRequest.mockResolvedValue({
      authorized: false,
      status: 401,
      body: { ok: false, error: "unauthorized" },
    });

    const response = await GET(new NextRequest("http://localhost/api/claims"));
    expect(response.status).toBe(401);
    expect(mockBuildClaimsRegistryListApiResponse).not.toHaveBeenCalled();
  });

  it("returns registered claims when authorized", async () => {
    mockAuthorizeReviewQueueApiRequest.mockResolvedValue(breakGlassAccess);

    const response = await GET(new NextRequest("http://localhost/api/claims"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(mockBuildClaimsRegistryListApiResponse).toHaveBeenCalledWith(
      { workspace_id: "demo-workspace-spa-menu" },
      breakGlassAccess
    );
  });
});
