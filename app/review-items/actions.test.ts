import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUpdateReviewQueueItemStatus = vi.fn();

vi.mock("@/lib/review/review-queue-ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/review/review-queue-ui")>();
  return {
    ...actual,
    updateReviewQueueItemStatus: (...args: unknown[]) =>
      mockUpdateReviewQueueItemStatus(...args),
  };
});

const mockRevalidatePath = vi.fn();

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

import { updateReviewItemStatusFormAction } from "@/app/review-items/actions";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("updateReviewItemStatusFormAction", () => {
  it("persists status via server-side update and revalidates the page", async () => {
    mockUpdateReviewQueueItemStatus.mockResolvedValue({
      ok: true,
      item: {
        id: "bb192f23-b028-4b17-bbd7-749ae5748932",
        status: "resolved",
      },
    });

    const formData = new FormData();
    formData.set("review_item_id", "bb192f23-b028-4b17-bbd7-749ae5748932");
    formData.set("status", "resolved");

    const result = await updateReviewItemStatusFormAction(null, formData);

    expect(result.ok).toBe(true);
    expect(mockUpdateReviewQueueItemStatus).toHaveBeenCalledWith(
      "bb192f23-b028-4b17-bbd7-749ae5748932",
      "resolved"
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/review-items");
  });

  it("returns a visible error when status is missing", async () => {
    const formData = new FormData();
    formData.set("review_item_id", "bb192f23-b028-4b17-bbd7-749ae5748932");

    const result = await updateReviewItemStatusFormAction(null, formData);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("status_required");
      expect(result.message).toContain("Status");
    }
    expect(mockUpdateReviewQueueItemStatus).not.toHaveBeenCalled();
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });
});
