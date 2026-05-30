import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockListReviewItems = vi.fn();
const mockGetReviewItemById = vi.fn();
const mockUpdateReviewItemStatus = vi.fn();

vi.mock("@/lib/watch/evidence-review-item-store", () => ({
  listReviewItems: (...args: unknown[]) => mockListReviewItems(...args),
  getReviewItemById: (...args: unknown[]) => mockGetReviewItemById(...args),
  updateReviewItemStatus: (...args: unknown[]) => mockUpdateReviewItemStatus(...args),
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
  mockUpdateReviewItemStatus.mockResolvedValue({
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
    const response = await buildReviewItemsListApiResponse({ status: "open" });

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
    const response = await buildReviewItemGetApiResponse(demoItem.id);

    expect(response.ok).toBe(true);
    if (response.ok) {
      expect(response.item.id).toBe(demoItem.id);
      expect(response.item).not.toHaveProperty("raw_payload");
    }
  });

  it("buildReviewItemStatusUpdateApiResponse updates status correctly", async () => {
    const response = await buildReviewItemStatusUpdateApiResponse(demoItem.id, {
      status: "acknowledged",
    });

    expect(response.ok).toBe(true);
    if (response.ok) {
      expect(response.item.status).toBe("acknowledged");
      expect(response.status).toBe(200);
    }
    expect(mockUpdateReviewItemStatus).toHaveBeenCalledWith(
      demoItem.id,
      "acknowledged"
    );
  });

  it("buildReviewItemStatusUpdateApiResponse rejects invalid status", async () => {
    mockUpdateReviewItemStatus.mockResolvedValueOnce({
      item: null,
      invalid_status: true,
      error: "unsupported_review_item_status",
    });

    const response = await buildReviewItemStatusUpdateApiResponse(demoItem.id, {
      status: "invalid",
    });

    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error).toBe("unsupported_review_item_status");
      expect(response.status).toBe(400);
    }
  });
});
