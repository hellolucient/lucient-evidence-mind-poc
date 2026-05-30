import { beforeEach, describe, expect, it, vi } from "vitest";

const mockProcessReviewItemStatusUpdateSubmission = vi.fn();

vi.mock("@/lib/review/review-queue-ui", () => ({
  processReviewItemStatusUpdateSubmission: (...args: unknown[]) =>
    mockProcessReviewItemStatusUpdateSubmission(...args),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { POST } from "@/app/review-items/update/route";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /review-items/update", () => {
  it("persists status and redirects with success flash", async () => {
    mockProcessReviewItemStatusUpdateSubmission.mockResolvedValue({
      result: {
        ok: true,
        item: {
          id: "bb192f23-b028-4b17-bbd7-749ae5748932",
          status: "resolved",
        },
      },
      redirectPath:
        "/review-items?selected_id=bb192f23-b028-4b17-bbd7-749ae5748932&update_ok=resolved",
    });

    const formData = new FormData();
    formData.set("review_item_id", "bb192f23-b028-4b17-bbd7-749ae5748932");
    formData.set("status", "resolved");
    formData.set("return_query", "selected_id=bb192f23-b028-4b17-bbd7-749ae5748932");

    const request = new Request("https://example.com/review-items/update", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request);

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://example.com/review-items?selected_id=bb192f23-b028-4b17-bbd7-749ae5748932&update_ok=resolved"
    );
    expect(mockProcessReviewItemStatusUpdateSubmission).toHaveBeenCalledWith(formData);
  });

  it("redirects with error flash when status is missing", async () => {
    mockProcessReviewItemStatusUpdateSubmission.mockResolvedValue({
      result: {
        ok: false,
        error: "status_required",
        message: "Status is required.",
      },
      redirectPath:
        "/review-items?selected_id=bb192f23-b028-4b17-bbd7-749ae5748932&update_error=status_required&update_error_message=Status+is+required.",
    });

    const formData = new FormData();
    formData.set("review_item_id", "bb192f23-b028-4b17-bbd7-749ae5748932");
    formData.set("return_query", "selected_id=bb192f23-b028-4b17-bbd7-749ae5748932");

    const request = new Request("https://example.com/review-items/update", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request);

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("update_error=status_required");
  });
});
