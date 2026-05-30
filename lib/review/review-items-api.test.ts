import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockPerformReviewItemStatusUpdate = vi.fn();
const mockListReviewItems = vi.fn();
const mockGetReviewItemById = vi.fn();

vi.mock("@/lib/review/review-item-status-update", () => ({
  performReviewItemStatusUpdate: (...args: unknown[]) => mockPerformReviewItemStatusUpdate(...args),
}));

vi.mock("@/lib/watch/evidence-review-item-store", () => ({
  listReviewItems: (...args: unknown[]) => mockListReviewItems(...args),
  getReviewItemById: (...args: unknown[]) => mockGetReviewItemById(...args),
}));

import { CURRENT_WATCH_PHASE } from "@/lib/watch/watch-phase";
import {
  buildReviewItemGetApiResponse,
  buildReviewItemsListApiResponse,
  buildReviewItemStatusUpdateApiResponse,
  isPrivacySafeReviewItemPayload,
  parseReviewItemListFilters,
} from "./review-items-api";

const demoItem = {
  id: "demo-review-item-001",
  evidence_alert_id: "demo-alert-001",
  watch_run_id: "demo-run-001",
  workspace_id: "demo-workspace-spa-menu",
  client_claim_id: "demo-claim-magnesium-stress-001",
  claim_family: "magnesium_cortisol_stress",
  signal: "human_review_required",
  severity: "medium",
  status: "open" as const,
  summary: "Evidence alert may affect workspace claim demo-claim-magnesium-stress-001.",
  created_at: "2026-05-30T21:00:00.000Z",
  updated_at: "2026-05-30T21:00:00.000Z",
};

beforeEach(() => {
  mockListReviewItems.mockResolvedValue({
    items: [demoItem],
    count: 1,
  });
  mockGetReviewItemById.mockResolvedValue({
    item: demoItem,
  });
  mockPerformReviewItemStatusUpdate.mockResolvedValue({
    ok: true,
    item: {
      ...demoItem,
      status: "acknowledged",
      updated_at: "2026-05-31T12:00:00.000Z",
    },
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

const breakGlassAccess = {
  authorized: true,
  mode: "break_glass" as const,
  workspaceIds: null,
};

describe("review-items-api", () => {
  it("parseReviewItemListFilters reads query params", () => {
    const filters = parseReviewItemListFilters(
      new URLSearchParams(
        "workspace_id=demo-workspace-spa-menu&status=open&claim_family=magnesium_cortisol_stress&signal=human_review_required&limit=5"
      )
    );

    expect(filters).toEqual({
      workspace_id: "demo-workspace-spa-menu",
      status: "open",
      claim_family: "magnesium_cortisol_stress",
      signal: "human_review_required",
      limit: 5,
    });
  });

  it("buildReviewItemsListApiResponse returns privacy-safe fields", async () => {
    const response = await buildReviewItemsListApiResponse({ status: "open" }, breakGlassAccess);

    expect(response.ok).toBe(true);
    expect(response.phase).toBe(CURRENT_WATCH_PHASE);
    expect(response.items).toHaveLength(1);
    expect(isPrivacySafeReviewItemPayload(response.items[0] as Record<string, unknown>)).toBe(
      true
    );
    expect(response.items[0]).not.toHaveProperty("raw_payload");
    expect(response.items[0]).not.toHaveProperty("claim_text");
    expect(JSON.stringify(response).toLowerCase()).not.toContain(
      "magnesium therapy helps reduce cortisol"
    );
  });

  it("buildReviewItemGetApiResponse returns one item", async () => {
    const response = await buildReviewItemGetApiResponse(demoItem.id, breakGlassAccess);

    expect(response.ok).toBe(true);
    if (response.ok) {
      expect(response.item.id).toBe(demoItem.id);
      expect(response.item).not.toHaveProperty("raw_payload");
    }
  });

  it("buildReviewItemStatusUpdateApiResponse updates status correctly", async () => {
    const response = await buildReviewItemStatusUpdateApiResponse(
      demoItem.id,
      {
      status: "acknowledged",
      },
      breakGlassAccess
    );

    expect(response.ok).toBe(true);
    if (response.ok) {
      expect(response.item.status).toBe("acknowledged");
      expect(response.status).toBe(200);
    }
    expect(mockPerformReviewItemStatusUpdate).toHaveBeenCalledWith({
      id: demoItem.id,
      status: "acknowledged",
      access: breakGlassAccess,
      operatorEmail: undefined,
      existingItem: demoItem,
    });
  });

  it("buildReviewItemStatusUpdateApiResponse rejects invalid status", async () => {
    mockPerformReviewItemStatusUpdate.mockResolvedValueOnce({
      ok: false,
      error: "unsupported_review_item_status",
      message: "Unsupported review item status.",
    });

    const response = await buildReviewItemStatusUpdateApiResponse(
      demoItem.id,
      {
      status: "invalid",
      },
      breakGlassAccess
    );

    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error).toBe("unsupported_review_item_status");
      expect(response.status).toBe(400);
    }
  });

  it("buildReviewItemGetApiResponse returns forbidden for cross-workspace operator access", async () => {
    mockGetReviewItemById.mockResolvedValueOnce({
      item: {
        ...demoItem,
        workspace_id: "other-workspace",
      },
    });

    const response = await buildReviewItemGetApiResponse(demoItem.id, {
      authorized: true,
      mode: "operator",
      userId: "user-123",
      workspaceIds: ["demo-workspace-spa-menu"],
    });

    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error).toBe("forbidden");
      expect(response.status).toBe(403);
    }
  });

  it("buildReviewItemStatusUpdateApiResponse blocks cross-workspace operator updates without audit", async () => {
    mockGetReviewItemById.mockResolvedValueOnce({
      item: {
        ...demoItem,
        workspace_id: "other-workspace",
      },
    });

    const response = await buildReviewItemStatusUpdateApiResponse(
      demoItem.id,
      { status: "acknowledged" },
      {
        authorized: true,
        mode: "operator",
        userId: "user-123",
        workspaceIds: ["demo-workspace-spa-menu"],
      }
    );

    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error).toBe("forbidden");
      expect(response.status).toBe(403);
    }
    expect(mockPerformReviewItemStatusUpdate).not.toHaveBeenCalled();
  });
});
