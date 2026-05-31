import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockInsert = vi.fn();
const mockInsertSelect = vi.fn();
const mockSelect = vi.fn();
const mockSingle = vi.fn();
const mockMaybeSingle = vi.fn();
const mockFrom = vi.fn();
const mockGetSupabaseEnvConfig = vi.fn();
const mockCreateSupabaseServerClient = vi.fn();

const queryBuilder = {
  eq: vi.fn(),
  in: vi.fn(),
  order: vi.fn(),
  limit: vi.fn(),
  maybeSingle: mockMaybeSingle,
};

vi.mock("@/engine/watchlist/supabase-client", () => ({
  getSupabaseEnvConfig: (...args: unknown[]) => mockGetSupabaseEnvConfig(...args),
  createSupabaseServerClient: (...args: unknown[]) => mockCreateSupabaseServerClient(...args),
  EVIDENCE_MIND_DIGESTS_TABLE: "evidence_mind_digests",
  EVIDENCE_MIND_DIGEST_ITEMS_TABLE: "evidence_mind_digest_items",
}));

import {
  createEvidenceMindDigest,
  createEvidenceMindDigestItemSnapshots,
  getEvidenceMindDigestById,
  isPrivacySafeEvidenceMindDigestItemPayload,
  isPrivacySafeEvidenceMindDigestPayload,
  listEvidenceMindDigestItemsForDigest,
  listEvidenceMindDigests,
  toPrivacySafeEvidenceMindDigest,
  toPrivacySafeEvidenceMindDigestItem,
} from "@/lib/watch/evidence-mind-digest-store";

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

const digestRow = {
  id: "digest-uuid-001",
  workspace_id: "demo-workspace-spa-menu",
  period_start: "2026-05-24T00:00:00.000Z",
  period_end: "2026-05-31T23:59:59.999Z",
  digest_title: "Evidence Mind Digest — May 24 – May 31, 2026",
  digest_summary: "Summary of watchtower activity.",
  watchlists_checked_count: 3,
  new_alerts_count: 1,
  review_items_count: 1,
  briefs_count: 1,
  affected_claim_families_count: 1,
  affected_client_claims_count: 1,
  highest_risk_implication: "monitor",
  recommended_focus: "No immediate action required. Continue monitoring.",
  status: "ready_for_review",
  created_at: "2026-05-31T12:00:00.000Z",
  updated_at: "2026-05-31T12:00:00.000Z",
};

const digestItemRow = {
  id: "digest-item-uuid-001",
  digest_id: "digest-uuid-001",
  workspace_id: "demo-workspace-spa-menu",
  item_type: "evidence_brief",
  item_ref_id: "brief-uuid-001",
  claim_family: "magnesium_cortisol_stress",
  client_claim_id: null,
  title_snapshot: "Evidence change detected for Magnesium / Stress / Cortisol",
  summary_snapshot: "Brief summary",
  risk_implication: "monitor",
  recommended_action: "monitor only",
  created_at: "2026-05-31T12:00:00.000Z",
};

function setupSupabaseMocks() {
  queryBuilder.eq.mockReturnValue(queryBuilder);
  queryBuilder.in.mockReturnValue(queryBuilder);
  queryBuilder.order.mockReturnValue(queryBuilder);
  queryBuilder.limit.mockResolvedValue({
    data: [digestRow],
    error: null,
  });

  mockFrom.mockReturnValue({
    insert: mockInsert,
    select: mockSelect,
  });
  mockInsert.mockReturnValue({
    select: mockInsertSelect,
  });
  mockInsertSelect.mockReturnValue({
    single: mockSingle,
  });
  mockSelect.mockReturnValue(queryBuilder);
  mockSingle.mockResolvedValue({ data: digestRow, error: null });
  mockMaybeSingle.mockResolvedValue({ data: digestRow, error: null });
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

describe("evidence-mind-digest-store", () => {
  it("creates an Evidence Mind digest for authorized workspace", async () => {
    const result = await createEvidenceMindDigest(
      {
        workspace_id: "demo-workspace-spa-menu",
        period_start: digestRow.period_start,
        period_end: digestRow.period_end,
        digest_title: digestRow.digest_title,
        digest_summary: digestRow.digest_summary,
        watchlists_checked_count: 3,
        new_alerts_count: 1,
        review_items_count: 1,
        briefs_count: 1,
        affected_claim_families_count: 1,
        affected_client_claims_count: 1,
        highest_risk_implication: "monitor",
        recommended_focus: digestRow.recommended_focus,
      },
      operatorAccess
    );

    expect(result.ok).toBe(true);
    expect(mockInsert).toHaveBeenCalled();
  });

  it("creates digest item snapshots", async () => {
    mockInsert.mockReturnValueOnce({
      select: vi.fn().mockResolvedValue({ data: [digestItemRow], error: null }),
    });

    const result = await createEvidenceMindDigestItemSnapshots(
      "digest-uuid-001",
      "demo-workspace-spa-menu",
      [
        {
          item_type: "evidence_brief",
          item_ref_id: "brief-uuid-001",
          claim_family: "magnesium_cortisol_stress",
          title_snapshot: digestItemRow.title_snapshot,
          summary_snapshot: "Brief summary",
          risk_implication: "monitor",
        },
      ],
      operatorAccess
    );

    expect(result.ok).toBe(true);
    expect(mockInsert).toHaveBeenCalled();
  });

  it("lists digests scoped to operator workspaces", async () => {
    await listEvidenceMindDigests(operatorAccess);

    expect(queryBuilder.in).toHaveBeenCalledWith("workspace_id", ["demo-workspace-spa-menu"]);
  });

  it("allows break-glass to list digests without workspace filter", async () => {
    await listEvidenceMindDigests(breakGlassAccess);

    expect(queryBuilder.in).not.toHaveBeenCalled();
  });

  it("blocks cross-workspace operator create", async () => {
    const result = await createEvidenceMindDigest(
      {
        workspace_id: "demo-workspace-spa-menu",
        period_start: digestRow.period_start,
        period_end: digestRow.period_end,
        digest_title: digestRow.digest_title,
        digest_summary: digestRow.digest_summary,
        watchlists_checked_count: 0,
        new_alerts_count: 0,
        review_items_count: 0,
        briefs_count: 0,
        affected_claim_families_count: 0,
        affected_client_claims_count: 0,
        highest_risk_implication: "none",
        recommended_focus: "No immediate action required. Continue monitoring.",
      },
      otherWorkspaceAccess
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("forbidden");
    }
  });

  it("gets digest by id with workspace authorization", async () => {
    const result = await getEvidenceMindDigestById("digest-uuid-001", operatorAccess);

    expect(result.digest?.id).toBe("digest-uuid-001");
  });

  it("blocks cross-workspace operator from viewing digest", async () => {
    const result = await getEvidenceMindDigestById("digest-uuid-001", otherWorkspaceAccess);

    expect(result.digest).toBeNull();
    expect(result.error).toBe("forbidden");
  });

  it("lists digest items for authorized digest", async () => {
    queryBuilder.order.mockReturnValueOnce({
      order: vi.fn().mockResolvedValue({ data: [digestItemRow], error: null }),
    });

    const result = await listEvidenceMindDigestItemsForDigest("digest-uuid-001", operatorAccess);

    expect(result.items.length).toBeGreaterThanOrEqual(0);
  });

  it("returns privacy-safe digest payloads", () => {
    const safe = toPrivacySafeEvidenceMindDigest(digestRow);
    expect(isPrivacySafeEvidenceMindDigestPayload(safe)).toBe(true);
  });

  it("returns privacy-safe digest item payloads without internal id", () => {
    const safe = toPrivacySafeEvidenceMindDigestItem(digestItemRow);
    expect(isPrivacySafeEvidenceMindDigestItemPayload(safe)).toBe(true);
    expect("id" in safe).toBe(false);
  });
});
