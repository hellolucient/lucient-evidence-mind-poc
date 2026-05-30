import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockInsert = vi.fn();
const mockInsertSelect = vi.fn();
const mockSelect = vi.fn();
const mockSingle = vi.fn();
const mockMaybeSingle = vi.fn();
const mockUpdate = vi.fn();
const mockFrom = vi.fn();
const mockGetSupabaseEnvConfig = vi.fn();
const mockCreateSupabaseServerClient = vi.fn();

const queryBuilder = {
  eq: vi.fn(),
  order: vi.fn(),
  limit: vi.fn(),
  maybeSingle: mockMaybeSingle,
};

vi.mock("@/engine/watchlist/supabase-client", () => ({
  getSupabaseEnvConfig: (...args: unknown[]) => mockGetSupabaseEnvConfig(...args),
  createSupabaseServerClient: (...args: unknown[]) =>
    mockCreateSupabaseServerClient(...args),
  EVIDENCE_REVIEW_ITEMS_TABLE: "evidence_review_items",
}));

import { buildReviewItemsForEvidenceAlert } from "./evidence-review-handoff";
import {
  createDemoReviewItem,
  DEMO_REVIEW_ITEM_ROW,
  getReviewItemById,
  listReviewItems,
  persistReviewHandoffItems,
  persistReviewHandoffsForAlertCandidates,
  toPrivacySafeReviewItem,
  updateReviewItemStatus,
} from "./evidence-review-item-store";
import type { EvidenceAlertCandidate } from "./evidence-alert-store";

const alertCandidate: EvidenceAlertCandidate = {
  watchlist_item_id: "watch-magnesium-cortisol",
  claim_family: "magnesium_cortisol_stress",
  source: "pubmed",
  external_id: "77766655",
  external_id_type: "pmid",
  alert_type: "human_review",
  severity: "medium",
  summary: "New evidence",
  raw_payload: {
    signal: "human_review_required",
    signal_classification: {
      signal: "human_review_required",
      human_review_required: true,
    },
  },
};

function setupSupabaseMocks() {
  queryBuilder.eq.mockReturnValue(queryBuilder);
  queryBuilder.order.mockReturnValue(queryBuilder);
  queryBuilder.limit.mockResolvedValue({
    data: [DEMO_REVIEW_ITEM_ROW],
    error: null,
  });

  mockFrom.mockReturnValue({
    insert: mockInsert,
    select: mockSelect,
    update: mockUpdate,
  });
  mockInsert.mockReturnValue({
    select: mockInsertSelect,
  });
  mockInsertSelect.mockReturnValue({
    single: mockSingle,
  });
  mockSelect.mockReturnValue(queryBuilder);
  mockUpdate.mockReturnValue({
    eq: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        maybeSingle: mockMaybeSingle,
      }),
    }),
  });
  mockCreateSupabaseServerClient.mockReturnValue({
    from: mockFrom,
  });
  mockGetSupabaseEnvConfig.mockReturnValue({
    hasSupabaseUrl: true,
    hasSupabaseServiceRoleKey: true,
  });
}

beforeEach(() => {
  setupSupabaseMocks();
});

afterEach(() => {
  vi.clearAllMocks();
  setupSupabaseMocks();
});

describe("evidence-review-item-store persistence", () => {
  it("persists review handoff items to evidence_review_items", async () => {
    mockSingle.mockResolvedValue({
      data: { id: "review-uuid-1" },
      error: null,
    });

    const { items } = buildReviewItemsForEvidenceAlert({
      evidence_alert_id: "alert-uuid-1",
      watch_run_id: "run-uuid-1",
      claim_family_id: "magnesium_cortisol_stress",
      raw_payload: alertCandidate.raw_payload,
    });

    const result = await persistReviewHandoffItems(items);

    expect(result.review_items_logged).toBe(1);
    expect(result.review_item_ids).toEqual(["review-uuid-1"]);
    expect(mockFrom).toHaveBeenCalledWith("evidence_review_items");
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        evidence_alert_id: "alert-uuid-1",
        client_claim_id: "demo-claim-magnesium-stress-001",
        claim_family: "magnesium_cortisol_stress",
      })
    );
  });

  it("skips duplicate review items for the same evidence_alert_id and client_claim_id", async () => {
    mockSingle
      .mockResolvedValueOnce({
        data: { id: "review-uuid-1" },
        error: null,
      })
      .mockResolvedValueOnce({
        data: null,
        error: { code: "23505", message: "duplicate key value" },
      });

    const { items } = buildReviewItemsForEvidenceAlert({
      evidence_alert_id: "alert-uuid-1",
      watch_run_id: null,
      claim_family_id: "magnesium_cortisol_stress",
      raw_payload: alertCandidate.raw_payload,
    });

    const first = await persistReviewHandoffItems(items);
    const second = await persistReviewHandoffItems(items);

    expect(first.review_items_logged).toBe(1);
    expect(second.review_items_logged).toBe(0);
    expect(second.review_items_duplicate_skipped).toBe(1);
  });

  it("builds review items from alert candidates before persistence", async () => {
    mockSingle.mockResolvedValue({
      data: { id: "review-uuid-2" },
      error: null,
    });

    const result = await persistReviewHandoffsForAlertCandidates({
      candidates: [{ candidate: alertCandidate, evidence_alert_id: "alert-uuid-2" }],
      watchRunId: "run-uuid-2",
    });

    expect(result.review_items_logged).toBe(1);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        watch_run_id: "run-uuid-2",
        signal: "human_review_required",
      })
    );
  });
});

describe("evidence-review-item-store review queue", () => {
  it("listReviewItems returns review items", async () => {
    const result = await listReviewItems();

    expect(result.count).toBe(1);
    expect(result.items[0]).toMatchObject({
      id: DEMO_REVIEW_ITEM_ROW.id,
      workspace_id: DEMO_REVIEW_ITEM_ROW.workspace_id,
      claim_family: DEMO_REVIEW_ITEM_ROW.claim_family,
      status: "open",
    });
    expect(result.items[0]).not.toHaveProperty("raw_payload");
  });

  it("listReviewItems filters by status", async () => {
    await listReviewItems({ status: "open" });

    expect(queryBuilder.eq).toHaveBeenCalledWith("status", "open");
  });

  it("listReviewItems filters by workspace_id", async () => {
    await listReviewItems({ workspace_id: "demo-workspace-spa-menu" });

    expect(queryBuilder.eq).toHaveBeenCalledWith(
      "workspace_id",
      "demo-workspace-spa-menu"
    );
  });

  it("getReviewItemById returns a single item", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: DEMO_REVIEW_ITEM_ROW,
      error: null,
    });

    const result = await getReviewItemById(DEMO_REVIEW_ITEM_ROW.id);

    expect(result.item).toMatchObject({
      id: DEMO_REVIEW_ITEM_ROW.id,
      client_claim_id: DEMO_REVIEW_ITEM_ROW.client_claim_id,
    });
    expect(result.error).toBeUndefined();
  });

  it("getReviewItemById handles missing item", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: null,
      error: null,
    });

    const result = await getReviewItemById("missing-review-item");

    expect(result.item).toBeNull();
    expect(result.not_found).toBe(true);
    expect(result.error).toBe("review_item_not_found");
  });

  it("updateReviewItemStatus accepts supported status", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        ...DEMO_REVIEW_ITEM_ROW,
        status: "acknowledged",
        updated_at: "2026-05-31T12:00:00.000Z",
      },
      error: null,
    });

    const result = await updateReviewItemStatus(
      DEMO_REVIEW_ITEM_ROW.id,
      "acknowledged"
    );

    expect(result.item?.status).toBe("acknowledged");
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "acknowledged",
        updated_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      })
    );
  });

  it("updateReviewItemStatus rejects invalid status", async () => {
    const result = await updateReviewItemStatus(DEMO_REVIEW_ITEM_ROW.id, "invalid");

    expect(result.item).toBeNull();
    expect(result.invalid_status).toBe(true);
    expect(result.error).toBe("unsupported_review_item_status");
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("createDemoReviewItem returns a privacy-safe demo item", () => {
    const item = createDemoReviewItem();

    expect(item).toEqual(toPrivacySafeReviewItem(DEMO_REVIEW_ITEM_ROW));
    expect(JSON.stringify(item).toLowerCase()).not.toContain("magnesium therapy helps");
  });
});
