import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockAuthorizeReviewQueueApiRequest = vi.fn();
const mockBuildMindLoopListApiResponse = vi.fn();

vi.mock("@/lib/operator-auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/operator-auth")>();
  return {
    ...actual,
    authorizeReviewQueueApiRequest: (...args: unknown[]) =>
      mockAuthorizeReviewQueueApiRequest(...args),
  };
});

vi.mock("@/lib/review/mind-loop-api", () => ({
  parseMindLoopListFilters: (searchParams: URLSearchParams) => ({
    workspace_id: searchParams.get("workspace_id") ?? undefined,
    destination: "hellominds",
  }),
  buildMindLoopListApiResponse: (...args: unknown[]) => mockBuildMindLoopListApiResponse(...args),
}));

import { NextRequest } from "next/server";

import { GET as getMindLoop } from "@/app/api/operator/mind-loop/route";
import { CURRENT_WATCH_PHASE } from "@/lib/watch/watch-phase";

const breakGlassAccess = {
  authorized: true,
  mode: "break_glass",
  workspaceIds: null,
} as const;

beforeEach(() => {
  mockBuildMindLoopListApiResponse.mockResolvedValue({
    ok: true,
    phase: CURRENT_WATCH_PHASE,
    route: "/api/operator/mind-loop",
    count: 0,
    total_before_filter: 0,
    limit: 20,
    destination: "hellominds",
    loop_status: null,
    summary: {
      total_digests: 0,
      complete_loops: 0,
      needs_attention: 0,
      pending_approval: 0,
      awaiting_delivery_verification: 0,
      awaiting_mind_response: 0,
    },
    attention: "all",
    items: [],
    list_error: null,
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("mind loop API route auth", () => {
  it("GET /api/operator/mind-loop returns 401 when review auth fails", async () => {
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

    const response = await getMindLoop(
      new NextRequest("http://localhost/api/operator/mind-loop")
    );

    expect(response.status).toBe(401);
    expect(mockBuildMindLoopListApiResponse).not.toHaveBeenCalled();
  });

  it("GET /api/operator/mind-loop returns aggregated items when authorized", async () => {
    mockAuthorizeReviewQueueApiRequest.mockResolvedValue(breakGlassAccess);

    const response = await getMindLoop(
      new NextRequest("http://localhost/api/operator/mind-loop?workspace_id=demo-workspace-spa-menu")
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.route).toBe("/api/operator/mind-loop");
    expect(mockBuildMindLoopListApiResponse).toHaveBeenCalledWith(
      expect.objectContaining({ workspace_id: "demo-workspace-spa-menu" }),
      breakGlassAccess
    );
  });
});
