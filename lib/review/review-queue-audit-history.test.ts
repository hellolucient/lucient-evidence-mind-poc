import { beforeEach, describe, expect, it, vi } from "vitest";

const mockListReviewItemAuditEvents = vi.fn();

vi.mock("@/lib/review/evidence-review-item-audit-store", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/review/evidence-review-item-audit-store")>();
  return {
    ...actual,
    listReviewItemAuditEvents: (...args: unknown[]) => mockListReviewItemAuditEvents(...args),
  };
});

const mockListReviewItems = vi.fn();
const mockGetReviewItemById = vi.fn();

vi.mock("@/lib/watch/evidence-review-item-store", () => ({
  listReviewItems: (...args: unknown[]) => mockListReviewItems(...args),
  getReviewItemById: (...args: unknown[]) => mockGetReviewItemById(...args),
  isReviewItemPersistenceConfigured: () => true,
  isSupportedReviewItemStatus: (status: string) =>
    ["open", "acknowledged", "in_review", "resolved", "dismissed"].includes(status),
  REVIEW_ITEM_STATUSES: ["open", "acknowledged", "in_review", "resolved", "dismissed"],
}));

import { buildReviewQueuePageData } from "@/lib/review/review-queue-ui";
import { isPrivacySafeReviewItemAuditEventPayload } from "@/lib/review/evidence-review-item-audit-store";

const demoItem = {
  id: "bb192f23-b028-4b17-bbd7-749ae5748932",
  evidence_alert_id: null,
  watch_run_id: null,
  workspace_id: "demo-workspace-spa-menu",
  client_claim_id: "demo-claim-magnesium-stress-001",
  claim_family: "magnesium_cortisol_stress",
  signal: "monitor_only",
  severity: "medium",
  status: "open" as const,
  summary: "Demo summary",
  created_at: "2026-05-30T21:00:00.000Z",
  updated_at: "2026-05-30T21:00:00.000Z",
};

const operatorAccess = {
  authorized: true,
  mode: "operator" as const,
  userId: "user-123",
  workspaceIds: ["demo-workspace-spa-menu"],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockListReviewItems.mockResolvedValue({ items: [demoItem], count: 1 });
  mockGetReviewItemById.mockResolvedValue({ item: demoItem });
  mockListReviewItemAuditEvents.mockResolvedValue({
    events: [
      {
        created_at: "2026-05-31T12:00:00.000Z",
        event_type: "status_changed",
        old_status: "open",
        new_status: "resolved",
        actor_label: "operator@example.com",
        access_mode: "supabase_operator",
      },
    ],
  });
});

describe("buildReviewQueuePageData audit history", () => {
  it("loads workspace-scoped audit history for selected item", async () => {
    const pageData = await buildReviewQueuePageData(
      { selected_id: demoItem.id },
      operatorAccess
    );

    expect(mockListReviewItemAuditEvents).toHaveBeenCalledWith(demoItem.id, operatorAccess);
    expect(pageData.auditHistory).toHaveLength(1);
    expect(
      isPrivacySafeReviewItemAuditEventPayload(
        pageData.auditHistory[0] as Record<string, unknown>
      )
    ).toBe(true);
  });

  it("does not load audit history when selected item is outside workspace scope", async () => {
    mockGetReviewItemById.mockResolvedValueOnce({
      item: {
        ...demoItem,
        workspace_id: "other-workspace",
      },
    });

    const pageData = await buildReviewQueuePageData(
      { selected_id: demoItem.id },
      operatorAccess
    );

    expect(pageData.selectedItem).toBeNull();
    expect(pageData.auditHistory).toEqual([]);
    expect(mockListReviewItemAuditEvents).not.toHaveBeenCalled();
  });
});
