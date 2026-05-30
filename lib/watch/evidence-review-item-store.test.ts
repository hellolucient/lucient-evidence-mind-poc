import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockSingle = vi.fn();
const mockFrom = vi.fn();
const mockGetSupabaseEnvConfig = vi.fn();
const mockCreateSupabaseServerClient = vi.fn();

vi.mock("@/engine/watchlist/supabase-client", () => ({
  getSupabaseEnvConfig: (...args: unknown[]) => mockGetSupabaseEnvConfig(...args),
  createSupabaseServerClient: (...args: unknown[]) =>
    mockCreateSupabaseServerClient(...args),
  EVIDENCE_REVIEW_ITEMS_TABLE: "evidence_review_items",
}));

import { buildReviewItemsForEvidenceAlert } from "./evidence-review-handoff";
import {
  persistReviewHandoffItems,
  persistReviewHandoffsForAlertCandidates,
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
  mockFrom.mockReturnValue({
    insert: mockInsert,
  });
  mockInsert.mockReturnValue({
    select: mockSelect,
  });
  mockSelect.mockReturnValue({
    single: mockSingle,
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

describe("evidence-review-item-store", () => {
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
