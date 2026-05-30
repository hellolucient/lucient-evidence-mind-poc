import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPerformReviewItemNoteCreate = vi.fn();
const mockGetReviewItemById = vi.fn();

vi.mock("@/lib/review/review-item-note-create", () => ({
  performReviewItemNoteCreate: (...args: unknown[]) => mockPerformReviewItemNoteCreate(...args),
}));

vi.mock("@/lib/watch/evidence-review-item-store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/watch/evidence-review-item-store")>();
  return {
    ...actual,
    getReviewItemById: (...args: unknown[]) => mockGetReviewItemById(...args),
  };
});

import { processReviewItemNoteSubmission } from "@/lib/review/review-queue-ui";

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
    },
  });
});

describe("processReviewItemNoteSubmission", () => {
  it("blocks cross-workspace note creation for scoped operators", async () => {
    mockGetReviewItemById.mockResolvedValueOnce({
      item: {
        id: "bb192f23-b028-4b17-bbd7-749ae5748932",
        workspace_id: "other-workspace",
      },
    });

    const formData = new FormData();
    formData.set("review_item_id", "bb192f23-b028-4b17-bbd7-749ae5748932");
    formData.set("note_text", "Should not save.");

    const submission = await processReviewItemNoteSubmission(formData, operatorAccess);

    expect(mockPerformReviewItemNoteCreate).not.toHaveBeenCalled();
    expect(submission.result.ok).toBe(false);
    if (!submission.result.ok) {
      expect(submission.result.error).toBe("forbidden");
    }
  });

  it("rejects empty note text before create", async () => {
    const formData = new FormData();
    formData.set("review_item_id", "bb192f23-b028-4b17-bbd7-749ae5748932");
    formData.set("note_text", "   ");

    const submission = await processReviewItemNoteSubmission(formData, operatorAccess);

    expect(mockPerformReviewItemNoteCreate).not.toHaveBeenCalled();
    expect(submission.result.ok).toBe(false);
    if (!submission.result.ok) {
      expect(submission.result.error).toBe("note_text_required");
    }
  });
});
