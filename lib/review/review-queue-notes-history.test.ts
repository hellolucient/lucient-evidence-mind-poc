import { beforeEach, describe, expect, it, vi } from "vitest";

const mockListReviewItemAuditEvents = vi.fn();
const mockListReviewItemNotes = vi.fn();
const mockResolveLinkedClientClaimForReviewItem = vi.fn();

vi.mock("@/lib/watch/client-claims-store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/watch/client-claims-store")>();
  return {
    ...actual,
    resolveLinkedClientClaimForReviewItem: (...args: unknown[]) =>
      mockResolveLinkedClientClaimForReviewItem(...args),
  };
});

vi.mock("@/lib/review/evidence-review-item-audit-store", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/review/evidence-review-item-audit-store")>();
  return {
    ...actual,
    listReviewItemAuditEvents: (...args: unknown[]) => mockListReviewItemAuditEvents(...args),
  };
});

vi.mock("@/lib/review/evidence-review-item-notes-store", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/review/evidence-review-item-notes-store")>();
  return {
    ...actual,
    listReviewItemNotes: (...args: unknown[]) => mockListReviewItemNotes(...args),
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
import { isPrivacySafeReviewItemNotePayload } from "@/lib/review/evidence-review-item-notes-store";
import { isPrivacySafeClientClaimPayload } from "@/lib/watch/client-claims-store";

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
  mockListReviewItemAuditEvents.mockResolvedValue({ events: [] });
  mockListReviewItemNotes.mockResolvedValue({
    notes: [
      {
        created_at: "2026-05-31T14:00:00.000Z",
        note_text: "Recommend softer wording.",
        decision_type: "wording_change_recommended",
        actor_label: "operator@example.com",
        access_mode: "supabase_operator",
      },
    ],
  });
  mockResolveLinkedClientClaimForReviewItem.mockResolvedValue({
    workspace_id: "demo-workspace-spa-menu",
    client_claim_id: "demo-claim-magnesium-stress-001",
    claim_text: "Magnesium helps reduce stress and supports healthy cortisol balance.",
    claim_source_type: "spa_menu",
    claim_source_label: null,
    source_url: null,
    claim_family: "magnesium_cortisol_stress",
    risk_level: "medium",
    status: "active",
    created_at: "2026-05-31T10:00:00.000Z",
    updated_at: "2026-05-31T10:00:00.000Z",
  });
});

describe("buildReviewQueuePageData notes history", () => {
  it("loads workspace-scoped notes history for selected item", async () => {
    const pageData = await buildReviewQueuePageData(
      { selected_id: demoItem.id },
      operatorAccess
    );

    expect(mockListReviewItemNotes).toHaveBeenCalledWith(demoItem.id, operatorAccess);
    expect(pageData.notesHistory).toHaveLength(1);
    expect(
      isPrivacySafeReviewItemNotePayload(pageData.notesHistory[0] as Record<string, unknown>)
    ).toBe(true);
  });

  it("does not load notes history when selected item is outside workspace scope", async () => {
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
    expect(pageData.notesHistory).toEqual([]);
    expect(mockListReviewItemNotes).not.toHaveBeenCalled();
  });
});

describe("buildReviewQueuePageData linked client claim", () => {
  it("resolves linked durable client claim for selected review item", async () => {
    const pageData = await buildReviewQueuePageData(
      { selected_id: demoItem.id },
      operatorAccess
    );

    expect(mockResolveLinkedClientClaimForReviewItem).toHaveBeenCalledWith(
      expect.objectContaining({
        workspace_id: demoItem.workspace_id,
        client_claim_id: demoItem.client_claim_id,
      }),
      operatorAccess
    );
    expect(pageData.linkedClientClaim?.client_claim_id).toBe("demo-claim-magnesium-stress-001");
    expect(
      isPrivacySafeClientClaimPayload(pageData.linkedClientClaim as Record<string, unknown>)
    ).toBe(true);
  });

  it("leaves linked client claim null when durable claim is missing", async () => {
    mockResolveLinkedClientClaimForReviewItem.mockResolvedValueOnce(null);

    const pageData = await buildReviewQueuePageData(
      { selected_id: demoItem.id },
      operatorAccess
    );

    expect(pageData.linkedClientClaim).toBeNull();
    expect(pageData.selectedItem?.client_claim_id).toBe("demo-claim-magnesium-stress-001");
  });
});
