import { beforeEach, describe, expect, it, vi } from "vitest";

const mockInsertReviewItemNote = vi.fn();
const mockInsertReviewItemAuditEvent = vi.fn();

vi.mock("@/lib/review/evidence-review-item-notes-store", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/review/evidence-review-item-notes-store")>();
  return {
    ...actual,
    insertReviewItemNote: (...args: unknown[]) => mockInsertReviewItemNote(...args),
  };
});

vi.mock("@/lib/review/evidence-review-item-audit-store", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/review/evidence-review-item-audit-store")>();
  return {
    ...actual,
    insertReviewItemAuditEvent: (...args: unknown[]) => mockInsertReviewItemAuditEvent(...args),
  };
});

import { recordReviewItemNoteAddedAudit } from "@/lib/review/review-item-note-audit";
import { performReviewItemNoteCreate } from "@/lib/review/review-item-note-create";
import {
  isPrivacySafeReviewItemNotePayload,
  toPrivacySafeReviewItemNote,
} from "@/lib/review/evidence-review-item-notes-store";

const operatorAccess = {
  authorized: true,
  mode: "operator" as const,
  userId: "user-123",
  workspaceIds: ["demo-workspace-spa-menu"],
};

const breakGlassAccess = {
  authorized: true,
  mode: "break_glass" as const,
  workspaceIds: null,
};

const createdNoteRow = {
  id: "note-id-001",
  workspace_id: "demo-workspace-spa-menu",
  review_item_id: "bb192f23-b028-4b17-bbd7-749ae5748932",
  note_text: "Recommend softer wording on spa menu claim.",
  decision_type: "wording_change_recommended",
  actor_type: "supabase_operator",
  actor_email: "operator@example.com",
  access_mode: "supabase_operator",
  created_at: "2026-05-31T14:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockInsertReviewItemNote.mockResolvedValue({
    ok: true,
    note: toPrivacySafeReviewItemNote(createdNoteRow),
  });
  mockInsertReviewItemAuditEvent.mockResolvedValue({ ok: true });
});

describe("review item note create", () => {
  it("allows Supabase operator to add note to in-workspace review item", async () => {
    const result = await performReviewItemNoteCreate({
      reviewItemId: "bb192f23-b028-4b17-bbd7-749ae5748932",
      noteText: "Recommend softer wording on spa menu claim.",
      decisionType: "wording_change_recommended",
      access: operatorAccess,
      operatorEmail: "operator@example.com",
      existingItem: { workspace_id: "demo-workspace-spa-menu" },
    });

    expect(result.ok).toBe(true);
    expect(mockInsertReviewItemNote).toHaveBeenCalledWith(
      expect.objectContaining({
        workspace_id: "demo-workspace-spa-menu",
        review_item_id: "bb192f23-b028-4b17-bbd7-749ae5748932",
        note_text: "Recommend softer wording on spa menu claim.",
        decision_type: "wording_change_recommended",
        actor_type: "supabase_operator",
        actor_email: "operator@example.com",
        access_mode: "supabase_operator",
      })
    );
    expect(mockInsertReviewItemAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: "note_added",
        metadata: null,
      })
    );
  });

  it("allows break-glass to add note without operator email", async () => {
    mockInsertReviewItemNote.mockResolvedValueOnce({
      ok: true,
      note: toPrivacySafeReviewItemNote({
        ...createdNoteRow,
        actor_type: "break_glass",
        actor_email: null,
        access_mode: "break_glass",
        decision_type: "monitor_only",
        note_text: "Monitor only for now.",
      }),
    });

    const result = await performReviewItemNoteCreate({
      reviewItemId: "bb192f23-b028-4b17-bbd7-749ae5748932",
      noteText: "Monitor only for now.",
      decisionType: "monitor_only",
      access: breakGlassAccess,
      operatorEmail: "should-not-store@example.com",
      existingItem: { workspace_id: "demo-workspace-spa-menu" },
    });

    expect(result.ok).toBe(true);
    expect(mockInsertReviewItemNote).toHaveBeenCalledWith(
      expect.objectContaining({
        access_mode: "break_glass",
        actor_email: null,
      })
    );
  });

  it("rejects empty note text", async () => {
    const result = await performReviewItemNoteCreate({
      reviewItemId: "bb192f23-b028-4b17-bbd7-749ae5748932",
      noteText: "   ",
      access: operatorAccess,
      existingItem: { workspace_id: "demo-workspace-spa-menu" },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("note_text_required");
    }
    expect(mockInsertReviewItemNote).not.toHaveBeenCalled();
    expect(mockInsertReviewItemAuditEvent).not.toHaveBeenCalled();
  });

  it("records note_added audit event with required fields and null metadata", async () => {
    await recordReviewItemNoteAddedAudit({
      reviewItemId: "bb192f23-b028-4b17-bbd7-749ae5748932",
      workspaceId: "demo-workspace-spa-menu",
      access: operatorAccess,
      operatorEmail: "operator@example.com",
    });

    expect(mockInsertReviewItemAuditEvent).toHaveBeenCalledWith({
      workspace_id: "demo-workspace-spa-menu",
      review_item_id: "bb192f23-b028-4b17-bbd7-749ae5748932",
      event_type: "note_added",
      old_status: null,
      new_status: "",
      actor_type: "supabase_operator",
      actor_email: "operator@example.com",
      access_mode: "supabase_operator",
      metadata: null,
    });
  });

  it("privacy-safe note payloads omit secrets, UUIDs, and actor email", () => {
    const safeNote = toPrivacySafeReviewItemNote({
      ...createdNoteRow,
      note_text: "Internal review rationale only.",
    });

    expect(isPrivacySafeReviewItemNotePayload(safeNote as Record<string, unknown>)).toBe(true);
    expect(safeNote).not.toHaveProperty("id");
    expect(safeNote).not.toHaveProperty("actor_email");
    expect(safeNote).not.toHaveProperty("actor_type");
    expect(JSON.stringify(safeNote).toLowerCase()).not.toContain("user-123");
    expect(JSON.stringify(safeNote).toLowerCase()).not.toContain("secret-token");
  });
});
