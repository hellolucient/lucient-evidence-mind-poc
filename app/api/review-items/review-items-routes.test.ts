import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockAuthorizeInternalReviewApiRequest = vi.fn();
const mockBuildReviewItemsListApiResponse = vi.fn();
const mockBuildReviewItemGetApiResponse = vi.fn();
const mockBuildReviewItemStatusUpdateApiResponse = vi.fn();

vi.mock("@/lib/internal-review-access", () => ({
  authorizeInternalReviewApiRequest: (...args: unknown[]) =>
    mockAuthorizeInternalReviewApiRequest(...args),
}));

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
  it("GET /api/review-items returns 401 when internal review auth fails", async () => {
    mockAuthorizeInternalReviewApiRequest.mockResolvedValue({
      authorized: false,
      status: 401,
      body: {
        ok: false,
        error: "unauthorized",
        phase: CURRENT_WATCH_PHASE,
        route: "/api/review-items",
        internal_review_access_configured: true,
        message: "Unauthorized review queue API request.",
      },
    });

    const response = await listReviewItems(
      new NextRequest("https://example.com/api/review-items?status=open")
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: "unauthorized",
      route: "/api/review-items",
    });
    expect(mockBuildReviewItemsListApiResponse).not.toHaveBeenCalled();
  });

  it("GET /api/review-items returns data when internal review auth succeeds", async () => {
    mockAuthorizeInternalReviewApiRequest.mockResolvedValue({ authorized: true });

    const response = await listReviewItems(
      new NextRequest("https://example.com/api/review-items?status=open")
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true });
    expect(mockBuildReviewItemsListApiResponse).toHaveBeenCalled();
  });

  it("GET /api/review-items/[id] returns 401 when internal review auth fails", async () => {
    mockAuthorizeInternalReviewApiRequest.mockResolvedValue({
      authorized: false,
      status: 401,
      body: {
        ok: false,
        error: "unauthorized",
        route: "/api/review-items/[id]",
      },
    });

    const response = await getReviewItem(
      new NextRequest("https://example.com/api/review-items/demo-review-item-001"),
      { params: Promise.resolve({ id: "demo-review-item-001" }) }
    );

    expect(response.status).toBe(401);
    expect(mockBuildReviewItemGetApiResponse).not.toHaveBeenCalled();
  });

  it("POST /api/review-items/[id]/status returns 401 when internal review auth fails", async () => {
    mockAuthorizeInternalReviewApiRequest.mockResolvedValue({
      authorized: false,
      status: 401,
      body: {
        ok: false,
        error: "unauthorized",
        route: "/api/review-items/[id]/status",
      },
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
