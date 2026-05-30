import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUpdateReviewItemStatus = vi.fn();
const mockGetReviewItemById = vi.fn();

vi.mock("@/lib/watch/evidence-review-item-store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/watch/evidence-review-item-store")>();
  return {
    ...actual,
    updateReviewItemStatus: (...args: unknown[]) => mockUpdateReviewItemStatus(...args),
    getReviewItemById: (...args: unknown[]) => mockGetReviewItemById(...args),
  };
});

import { processReviewItemStatusUpdateSubmission } from "@/lib/review/review-queue-ui";

const breakGlassAccess = {
  authorized: true,
  mode: "break_glass" as const,
  workspaceIds: null,
};

const operatorAccess = {
  authorized: true,
  mode: "operator" as const,
  userId: "user-123",
  workspaceIds: ["demo-workspace-spa-menu"],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetReviewItemById.mockResolvedValue({
    item: {
      id: "bb192f23-b028-4b17-bbd7-749ae5748932",
      workspace_id: "demo-workspace-spa-menu",
      status: "open",
    },
  });
});

describe("processReviewItemStatusUpdateSubmission", () => {
  it("calls updateReviewItemStatus with submitted id and status", async () => {
    mockUpdateReviewItemStatus.mockResolvedValue({
      item: {
        id: "bb192f23-b028-4b17-bbd7-749ae5748932",
        evidence_alert_id: null,
        watch_run_id: null,
        workspace_id: "demo-workspace-spa-menu",
        client_claim_id: "demo-claim-magnesium-stress-001",
        claim_family: "magnesium_cortisol_stress",
        signal: "monitor_only",
        severity: "medium",
        status: "resolved",
        summary: "Demo summary",
        created_at: "2026-05-30T21:00:00.000Z",
        updated_at: "2026-05-31T12:00:00.000Z",
      },
    });

    const formData = new FormData();
    formData.set("review_item_id", "bb192f23-b028-4b17-bbd7-749ae5748932");
    formData.set("status", "resolved");
    formData.set("return_query", "selected_id=bb192f23-b028-4b17-bbd7-749ae5748932");

    const submission = await processReviewItemStatusUpdateSubmission(formData, breakGlassAccess);

    expect(mockUpdateReviewItemStatus).toHaveBeenCalledWith(
      "bb192f23-b028-4b17-bbd7-749ae5748932",
      "resolved"
    );
    expect(submission.result.ok).toBe(true);
    if (submission.result.ok) {
      expect(submission.result.item.status).toBe("resolved");
      expect(submission.result.item).not.toHaveProperty("raw_payload");
      expect(submission.result.item).not.toHaveProperty("claim_text");
    }
    expect(submission.redirectPath).toContain("update_ok=resolved");
  });

  it("blocks cross-workspace status updates for scoped operators", async () => {
    mockGetReviewItemById.mockResolvedValue({
      item: {
        id: "bb192f23-b028-4b17-bbd7-749ae5748932",
        workspace_id: "other-workspace",
        status: "open",
      },
    });

    const formData = new FormData();
    formData.set("review_item_id", "bb192f23-b028-4b17-bbd7-749ae5748932");
    formData.set("status", "resolved");

    const submission = await processReviewItemStatusUpdateSubmission(formData, operatorAccess);

    expect(mockUpdateReviewItemStatus).not.toHaveBeenCalled();
    expect(submission.result.ok).toBe(false);
    if (!submission.result.ok) {
      expect(submission.result.error).toBe("forbidden");
    }
  });
});
