import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockAuthorizeReviewQueueApiRequest = vi.fn();
const mockBuildMindLoopDetailApiResponse = vi.fn();

vi.mock("@/lib/operator-auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/operator-auth")>();
  return {
    ...actual,
    authorizeReviewQueueApiRequest: (...args: unknown[]) =>
      mockAuthorizeReviewQueueApiRequest(...args),
  };
});

vi.mock("@/lib/review/mind-loop-api", () => ({
  parseMindLoopDetailFilters: () => ({ destination: "hellominds" }),
  buildMindLoopDetailApiResponse: (...args: unknown[]) =>
    mockBuildMindLoopDetailApiResponse(...args),
}));

import { NextRequest } from "next/server";

import { GET as getMindLoopDetail } from "@/app/api/operator/mind-loop/[digestId]/route";
import { CURRENT_WATCH_PHASE } from "@/lib/watch/watch-phase";

const breakGlassAccess = {
  authorized: true,
  mode: "break_glass",
  workspaceIds: null,
} as const;

const digestId = "bc2ea900-6004-4711-b879-33c7bad87a2c";

beforeEach(() => {
  mockBuildMindLoopDetailApiResponse.mockResolvedValue({
    ok: true,
    phase: CURRENT_WATCH_PHASE,
    route: `/api/operator/mind-loop/${digestId}`,
    destination: "hellominds",
    item: { digest_id: digestId },
    detail_error: null,
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("mind loop detail API route auth", () => {
  it("GET /api/operator/mind-loop/[digestId] returns 401 when review auth fails", async () => {
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

    const response = await getMindLoopDetail(
      new NextRequest(`http://localhost/api/operator/mind-loop/${digestId}`),
      { params: Promise.resolve({ digestId }) }
    );

    expect(response.status).toBe(401);
    expect(mockBuildMindLoopDetailApiResponse).not.toHaveBeenCalled();
  });

  it("GET /api/operator/mind-loop/[digestId] returns detail item when authorized", async () => {
    mockAuthorizeReviewQueueApiRequest.mockResolvedValue(breakGlassAccess);

    const response = await getMindLoopDetail(
      new NextRequest(`http://localhost/api/operator/mind-loop/${digestId}`),
      { params: Promise.resolve({ digestId }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.item.digest_id).toBe(digestId);
    expect(mockBuildMindLoopDetailApiResponse).toHaveBeenCalledWith(
      digestId,
      expect.objectContaining({ destination: "hellominds" }),
      breakGlassAccess
    );
  });

  it("GET /api/operator/mind-loop/[digestId] returns 404 when digest not found", async () => {
    mockAuthorizeReviewQueueApiRequest.mockResolvedValue(breakGlassAccess);
    mockBuildMindLoopDetailApiResponse.mockResolvedValue({
      ok: false,
      error: "digest_not_found",
      status: 404,
    });

    const response = await getMindLoopDetail(
      new NextRequest(`http://localhost/api/operator/mind-loop/missing-id`),
      { params: Promise.resolve({ digestId: "missing-id" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.ok).toBe(false);
    expect(body.error).toBe("digest_not_found");
  });
});
