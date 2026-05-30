import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockAuthorizeReviewQueueApiRequest = vi.fn();
const mockBuildReviewItemsListApiResponse = vi.fn();
const mockBuildReviewItemGetApiResponse = vi.fn();
const mockBuildReviewItemStatusUpdateApiResponse = vi.fn();

vi.mock("@/lib/operator-auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/operator-auth")>();
  return {
    ...actual,
    authorizeReviewQueueApiRequest: (...args: unknown[]) =>
      mockAuthorizeReviewQueueApiRequest(...args),
  };
});

vi.mock("@/lib/review/review-items-api", () => ({
  parseReviewItemListFilters: (searchParams: URLSearchParams) => ({
    status: searchParams.get("status") ?? undefined,
  }),
  buildReviewItemsListApiResponse: (...args: unknown[]) =>
    mockBuildReviewItemsListApiResponse(...args),
  buildReviewItemGetApiResponse: (...args: unknown[]) =>
    mockBuildReviewItemGetApiResponse(...args),
  buildReviewItemStatusUpdateApiResponse: (...args: unknown[]) =>
    mockBuildReviewItemStatusUpdateApiResponse(...args),
}));

import { NextRequest } from "next/server";

import { GET as listReviewItems } from "@/app/api/review-items/route";
import { GET as getReviewItem } from "@/app/api/review-items/[id]/route";
import { POST as updateReviewItemStatus } from "@/app/api/review-items/[id]/status/route";
import { CURRENT_WATCH_PHASE } from "@/lib/watch/watch-phase";

const breakGlassAccess = {
  authorized: true,
  mode: "break_glass",
  workspaceIds: null,
} as const;

beforeEach(() => {
  mockBuildReviewItemsListApiResponse.mockResolvedValue({
    ok: true,
    phase: CURRENT_WATCH_PHASE,
    route: "/api/review-items",
    count: 0,
    limit: 20,
    items: [],
    list_error: null,
  });
  mockBuildReviewItemGetApiResponse.mockResolvedValue({
    ok: true,
    phase: CURRENT_WATCH_PHASE,
    route: "/api/review-items/[id]",
    item: { id: "demo-review-item-001", status: "open" },
  });
  mockBuildReviewItemStatusUpdateApiResponse.mockResolvedValue({
    ok: true,
    phase: CURRENT_WATCH_PHASE,
    route: "/api/review-items/[id]/status",
    item: { id: "demo-review-item-001", status: "acknowledged" },
    status: 200,
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("review queue API route auth", () => {
  it("GET /api/review-items returns 401 when review auth fails", async () => {
    mockAuthorizeReviewQueueApiRequest.mockResolvedValue({
      authorized: false,
      status: 401,
      reason: "Unauthorized review queue request.",
      body: {
        ok: false,
        error: "unauthorized",
        phase: CURRENT_WATCH_PHASE,
        route: "/api/review-items",
      },
    });

    const response = await listReviewItems(
      new NextRequest("https://example.com/api/review-items?status=open")
    );

    expect(response.status).toBe(401);
    expect(mockBuildReviewItemsListApiResponse).not.toHaveBeenCalled();
  });

  it("GET /api/review-items returns data when authorized", async () => {
    mockAuthorizeReviewQueueApiRequest.mockResolvedValue(breakGlassAccess);

    const response = await listReviewItems(
      new NextRequest("https://example.com/api/review-items?status=open")
    );

    expect(response.status).toBe(200);
    expect(mockBuildReviewItemsListApiResponse).toHaveBeenCalledWith(
      { status: "open" },
      breakGlassAccess
    );
  });

  it("GET /api/review-items/[id] returns 401 when review auth fails", async () => {
    mockAuthorizeReviewQueueApiRequest.mockResolvedValue({
      authorized: false,
      status: 401,
      body: { ok: false, error: "unauthorized" },
    });

    const response = await getReviewItem(
      new NextRequest("https://example.com/api/review-items/demo-review-item-001"),
      { params: Promise.resolve({ id: "demo-review-item-001" }) }
    );

    expect(response.status).toBe(401);
    expect(mockBuildReviewItemGetApiResponse).not.toHaveBeenCalled();
  });

  it("POST /api/review-items/[id]/status returns 401 when review auth fails", async () => {
    mockAuthorizeReviewQueueApiRequest.mockResolvedValue({
      authorized: false,
      status: 401,
      body: { ok: false, error: "unauthorized" },
    });

    const response = await updateReviewItemStatus(
      new NextRequest("https://example.com/api/review-items/demo-review-item-001/status", {
        method: "POST",
        body: JSON.stringify({ status: "acknowledged" }),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ id: "demo-review-item-001" }) }
    );

    expect(response.status).toBe(401);
    expect(mockBuildReviewItemStatusUpdateApiResponse).not.toHaveBeenCalled();
  });
});
