import { beforeEach, describe, expect, it, vi } from "vitest";

const mockProcessReviewItemNoteSubmission = vi.fn();
const mockResolveReviewQueueAccess = vi.fn();

vi.mock("@/lib/operator-auth", () => ({
  resolveReviewQueueAccess: (...args: unknown[]) => mockResolveReviewQueueAccess(...args),
  isReviewQueueAccessContext: (access: { authorized: boolean }) => access.authorized,
}));

vi.mock("@/lib/review/review-queue-ui", () => ({
  processReviewItemNoteSubmission: (...args: unknown[]) =>
    mockProcessReviewItemNoteSubmission(...args),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { POST } from "@/app/review-items/notes/route";

const breakGlassAccess = {
  authorized: true,
  mode: "break_glass",
  workspaceIds: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockResolveReviewQueueAccess.mockResolvedValue(breakGlassAccess);
});

describe("POST /review-items/notes", () => {
  it("persists note and redirects with success flash", async () => {
    mockProcessReviewItemNoteSubmission.mockResolvedValue({
      result: { ok: true, note: { note_text: "Saved note." } },
      redirectPath: "/review-items?selected_id=bb192f23-b028-4b17-bbd7-749ae5748932&note_ok=1",
    });

    const formData = new FormData();
    formData.set("review_item_id", "bb192f23-b028-4b17-bbd7-749ae5748932");
    formData.set("note_text", "Saved note.");
    formData.set("return_query", "selected_id=bb192f23-b028-4b17-bbd7-749ae5748932");

    const request = new Request("https://example.com/review-items/notes", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request);

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("note_ok=1");
    expect(mockProcessReviewItemNoteSubmission).toHaveBeenCalledWith(
      formData,
      breakGlassAccess,
      null
    );
  });

  it("redirects to /review-items when note access is not authorized", async () => {
    mockResolveReviewQueueAccess.mockResolvedValue({
      authorized: false,
      status: 401,
      reason: "Unauthorized",
    });

    const formData = new FormData();
    formData.set("review_item_id", "bb192f23-b028-4b17-bbd7-749ae5748932");
    formData.set("note_text", "Saved note.");

    const request = new Request("https://example.com/review-items/notes", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request);

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://example.com/review-items");
    expect(mockProcessReviewItemNoteSubmission).not.toHaveBeenCalled();
  });
});
