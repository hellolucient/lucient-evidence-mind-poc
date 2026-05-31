import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetExternalMindHandoffById = vi.fn();
const mockUpdateExternalMindHandoffReview = vi.fn();

vi.mock("@/lib/watch/external-mind-handoff-store", () => ({
  getExternalMindHandoffById: (...args: unknown[]) => mockGetExternalMindHandoffById(...args),
  updateExternalMindHandoffReview: (...args: unknown[]) =>
    mockUpdateExternalMindHandoffReview(...args),
}));

import {
  approveExternalMindHandoff,
  rejectExternalMindHandoff,
  requestChangesExternalMindHandoff,
  reviewExternalMindHandoff,
} from "@/lib/watch/external-mind-handoff-review";

const operatorAccess = {
  authorized: true,
  mode: "operator" as const,
  userId: "user-123",
  workspaceIds: ["demo-workspace-spa-menu"],
};

const otherWorkspaceAccess = {
  authorized: true,
  mode: "operator" as const,
  userId: "user-456",
  workspaceIds: ["other-workspace"],
};

const breakGlassAccess = {
  authorized: true,
  mode: "break_glass" as const,
  workspaceIds: null,
};

const readyHandoff = {
  id: "handoff-uuid-001",
  workspace_id: "demo-workspace-spa-menu",
  digest_id: "digest-uuid-001",
  handoff_type: "digest_summary",
  destination: "test_sink",
  payload_version: "mind_digest_payload_v1",
  payload_json: { payload_version: "mind_digest_payload_v1" },
  status: "ready",
  review_status: "pending_review",
  created_at: "2026-05-31T12:00:00.000Z",
  updated_at: "2026-05-31T12:00:00.000Z",
  sent_at: null,
  send_attempted_at: null,
  send_result_json: null,
  reviewed_at: null,
  reviewed_by_actor_type: null,
  reviewed_by_actor_email: null,
  review_note: null,
  approved_at: null,
  approved_by_actor_type: null,
  approved_by_actor_email: null,
  approval_note: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetExternalMindHandoffById.mockResolvedValue({ handoff: readyHandoff });
  mockUpdateExternalMindHandoffReview.mockImplementation(async (_id, _access, input) => ({
    ok: true,
    handoff: {
      ...readyHandoff,
      review_status: input.review_status,
      approved_at: input.approved_at ?? null,
      reviewed_at: input.reviewed_at ?? null,
    },
  }));
});

describe("external-mind-handoff-review", () => {
  it("approves a pending handoff", async () => {
    const result = await approveExternalMindHandoff("handoff-uuid-001", operatorAccess, {
      operatorEmail: "operator@example.com",
    });

    expect(result.ok).toBe(true);
    expect(mockUpdateExternalMindHandoffReview).toHaveBeenCalledWith(
      "handoff-uuid-001",
      operatorAccess,
      expect.objectContaining({
        review_status: "approved",
        approved_by_actor_type: "supabase_operator",
        approved_by_actor_email: "operator@example.com",
      })
    );
  });

  it("rejects a pending handoff", async () => {
    const result = await rejectExternalMindHandoff("handoff-uuid-001", operatorAccess, {
      note: "Payload incomplete",
    });

    expect(result.ok).toBe(true);
    expect(mockUpdateExternalMindHandoffReview).toHaveBeenCalledWith(
      "handoff-uuid-001",
      operatorAccess,
      expect.objectContaining({
        review_status: "rejected",
        review_note: "Payload incomplete",
      })
    );
  });

  it("requests changes on a pending handoff", async () => {
    const result = await requestChangesExternalMindHandoff("handoff-uuid-001", operatorAccess, {
      note: "Update counts",
    });

    expect(result.ok).toBe(true);
    expect(mockUpdateExternalMindHandoffReview).toHaveBeenCalledWith(
      "handoff-uuid-001",
      operatorAccess,
      expect.objectContaining({
        review_status: "changes_requested",
        review_note: "Update counts",
      })
    );
  });

  it("blocks cross-workspace approval", async () => {
    mockGetExternalMindHandoffById.mockResolvedValueOnce({
      handoff: null,
      error: "forbidden",
    });

    const result = await reviewExternalMindHandoff("handoff-uuid-001", otherWorkspaceAccess, "approve");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("forbidden");
    }
  });

  it("allows break-glass approval", async () => {
    const result = await reviewExternalMindHandoff("handoff-uuid-001", breakGlassAccess, "approve");

    expect(result.ok).toBe(true);
    expect(mockUpdateExternalMindHandoffReview).toHaveBeenCalledWith(
      "handoff-uuid-001",
      breakGlassAccess,
      expect.objectContaining({
        review_status: "approved",
        approved_by_actor_type: "break_glass",
        approved_by_actor_email: null,
      })
    );
  });

  it("refuses review when handoff is not reviewable", async () => {
    mockUpdateExternalMindHandoffReview.mockResolvedValueOnce({
      ok: false,
      error: "handoff_not_reviewable",
    });

    const result = await approveExternalMindHandoff("handoff-uuid-001", operatorAccess);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("handoff_not_reviewable");
    }
  });
});
