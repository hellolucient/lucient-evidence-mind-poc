import { beforeEach, describe, expect, it, vi } from "vitest";

const mockInsertReviewItemAuditEvent = vi.fn();
const mockUpdateReviewItemStatus = vi.fn();

vi.mock("@/lib/review/evidence-review-item-audit-store", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/review/evidence-review-item-audit-store")>();
  return {
    ...actual,
    insertReviewItemAuditEvent: (...args: unknown[]) => mockInsertReviewItemAuditEvent(...args),
  };
});

vi.mock("@/lib/watch/evidence-review-item-store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/watch/evidence-review-item-store")>();
  return {
    ...actual,
    updateReviewItemStatus: (...args: unknown[]) => mockUpdateReviewItemStatus(...args),
  };
});

import {
  mapReviewQueueAccessToAuditFields,
  recordReviewItemStatusChangeAudit,
} from "@/lib/review/review-item-status-audit";
import { performReviewItemStatusUpdate } from "@/lib/review/review-item-status-update";
import {
  formatReviewItemAuditActorLabel,
  isPrivacySafeReviewItemAuditEventPayload,
  toPrivacySafeReviewItemAuditEvent,
} from "@/lib/review/evidence-review-item-audit-store";

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

beforeEach(() => {
  vi.clearAllMocks();
  mockInsertReviewItemAuditEvent.mockResolvedValue({ ok: true });
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
});

describe("review-item status audit", () => {
  it("maps operator access to supabase_operator audit fields", () => {
    expect(mapReviewQueueAccessToAuditFields(operatorAccess)).toEqual({
      access_mode: "supabase_operator",
      actor_type: "supabase_operator",
    });
  });

  it("maps break-glass access to break_glass audit fields", () => {
    expect(mapReviewQueueAccessToAuditFields(breakGlassAccess)).toEqual({
      access_mode: "break_glass",
      actor_type: "break_glass",
    });
  });

  it("records operator status change audit with email and old/new status", async () => {
    await recordReviewItemStatusChangeAudit({
      reviewItemId: "bb192f23-b028-4b17-bbd7-749ae5748932",
      workspaceId: "demo-workspace-spa-menu",
      oldStatus: "open",
      newStatus: "resolved",
      access: operatorAccess,
      operatorEmail: "operator@example.com",
    });

    expect(mockInsertReviewItemAuditEvent).toHaveBeenCalledWith({
      workspace_id: "demo-workspace-spa-menu",
      review_item_id: "bb192f23-b028-4b17-bbd7-749ae5748932",
      event_type: "status_changed",
      old_status: "open",
      new_status: "resolved",
      actor_type: "supabase_operator",
      actor_email: "operator@example.com",
      access_mode: "supabase_operator",
      metadata: null,
    });
  });

  it("records break-glass status change audit without operator email", async () => {
    await recordReviewItemStatusChangeAudit({
      reviewItemId: "bb192f23-b028-4b17-bbd7-749ae5748932",
      workspaceId: "demo-workspace-spa-menu",
      oldStatus: "open",
      newStatus: "acknowledged",
      access: breakGlassAccess,
      operatorEmail: "should-not-store@example.com",
    });

    expect(mockInsertReviewItemAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actor_type: "break_glass",
        actor_email: null,
        access_mode: "break_glass",
        old_status: "open",
        new_status: "acknowledged",
      })
    );
  });

  it("performReviewItemStatusUpdate records audit after successful operator update", async () => {
    const result = await performReviewItemStatusUpdate({
      id: "bb192f23-b028-4b17-bbd7-749ae5748932",
      status: "resolved",
      access: operatorAccess,
      operatorEmail: "operator@example.com",
      existingItem: {
        workspace_id: "demo-workspace-spa-menu",
        status: "open",
      },
    });

    expect(result.ok).toBe(true);
    expect(mockUpdateReviewItemStatus).toHaveBeenCalledWith(
      "bb192f23-b028-4b17-bbd7-749ae5748932",
      "resolved"
    );
    expect(mockInsertReviewItemAuditEvent).toHaveBeenCalled();
  });

  it("performReviewItemStatusUpdate records audit after successful break-glass update", async () => {
    await performReviewItemStatusUpdate({
      id: "bb192f23-b028-4b17-bbd7-749ae5748932",
      status: "resolved",
      access: breakGlassAccess,
      existingItem: {
        workspace_id: "demo-workspace-spa-menu",
        status: "open",
      },
    });

    expect(mockInsertReviewItemAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        access_mode: "break_glass",
        actor_email: null,
      })
    );
  });

  it("does not record audit when status update fails", async () => {
    mockUpdateReviewItemStatus.mockResolvedValueOnce({
      item: null,
      not_found: true,
      error: "review_item_not_found",
    });

    const result = await performReviewItemStatusUpdate({
      id: "missing-item",
      status: "resolved",
      access: operatorAccess,
      existingItem: {
        workspace_id: "demo-workspace-spa-menu",
        status: "open",
      },
    });

    expect(result.ok).toBe(false);
    expect(mockInsertReviewItemAuditEvent).not.toHaveBeenCalled();
  });

  it("privacy-safe audit payloads omit secrets, UUID actor ids, metadata, and tokens", () => {
    const safeEvent = toPrivacySafeReviewItemAuditEvent({
      id: "audit-event-id",
      workspace_id: "demo-workspace-spa-menu",
      review_item_id: "bb192f23-b028-4b17-bbd7-749ae5748932",
      event_type: "status_changed",
      old_status: "open",
      new_status: "resolved",
      actor_type: "supabase_operator",
      actor_email: "operator@example.com",
      access_mode: "supabase_operator",
      created_at: "2026-05-31T12:00:00.000Z",
      metadata: {
        token: "secret-token",
        user_id: "user-123",
      },
    });

    expect(isPrivacySafeReviewItemAuditEventPayload(safeEvent as Record<string, unknown>)).toBe(
      true
    );
    expect(safeEvent).not.toHaveProperty("metadata");
    expect(safeEvent).not.toHaveProperty("actor_email");
    expect(safeEvent).not.toHaveProperty("actor_type");
    expect(safeEvent.actor_label).toBe("operator@example.com");
    expect(formatReviewItemAuditActorLabel("break_glass", null)).toBe(
      "Break-glass internal access"
    );
    expect(JSON.stringify(safeEvent).toLowerCase()).not.toContain("secret-token");
    expect(JSON.stringify(safeEvent).toLowerCase()).not.toContain("user-123");
  });
});
