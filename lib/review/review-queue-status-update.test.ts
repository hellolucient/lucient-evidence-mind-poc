import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUpdateReviewItemStatus = vi.fn();

vi.mock("@/lib/watch/evidence-review-item-store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/watch/evidence-review-item-store")>();
  return {
    ...actual,
    updateReviewItemStatus: (...args: unknown[]) => mockUpdateReviewItemStatus(...args),
  };
});

import { processReviewItemStatusUpdateSubmission } from "@/lib/review/review-queue-ui";

beforeEach(() => {
  vi.clearAllMocks();
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

    const submission = await processReviewItemStatusUpdateSubmission(formData);

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
});
