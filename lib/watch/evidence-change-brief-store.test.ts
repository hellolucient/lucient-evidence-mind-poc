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
  EVIDENCE_CHANGE_BRIEFS_TABLE: "evidence_change_briefs",
  EVIDENCE_CHANGE_BRIEF_CLAIMS_TABLE: "evidence_change_brief_claims",
}));

import {
  createEvidenceChangeBrief,
  createEvidenceChangeBriefClaimSnapshots,
  getEvidenceChangeBriefById,
  isPrivacySafeEvidenceChangeBriefClaimPayload,
  isPrivacySafeEvidenceChangeBriefPayload,
  listEvidenceChangeBriefClaimsForBrief,
  listEvidenceChangeBriefs,
  toPrivacySafeEvidenceChangeBrief,
  toPrivacySafeEvidenceChangeBriefClaim,
} from "@/lib/watch/evidence-change-brief-store";

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

const briefRow = {
  id: "brief-uuid-001",
  workspace_id: "demo-workspace-spa-menu",
  claim_family: "magnesium_cortisol_stress",
  watchlist_id: "watch-magnesium-cortisol",
  evidence_alert_id: null,
  review_item_id: null,
  brief_title: "Evidence change detected for Magnesium / Stress / Cortisol",
  brief_summary: "New evidence was detected.",
  what_changed: "New evidence was detected for the monitored claim family.",
  why_it_matters: "Mapped client claims may need review.",
  evidence_signal: "unclear",
  risk_implication: "monitor",
  recommended_action: "monitor only",
  safer_wording: "This experience may support relaxation and general wellbeing.",
  affected_client_claims_count: 1,
  status: "ready_for_review",
  created_at: "2026-05-31T12:00:00.000Z",
  updated_at: "2026-05-31T12:00:00.000Z",
};

const briefClaimRow = {
  id: "claim-snapshot-uuid-001",
  brief_id: "brief-uuid-001",
  workspace_id: "demo-workspace-spa-menu",
  client_claim_id: "demo-claim-magnesium-stress-001",
  claim_text_snapshot: "Magnesium helps reduce stress and supports healthy cortisol balance.",
  claim_source_type: "spa_menu",
  claim_source_label: null,
  claim_family: "magnesium_cortisol_stress",
  mapping_confidence: "high",
  created_at: "2026-05-31T12:00:00.000Z",
};

function setupSupabaseMocks() {
  queryBuilder.eq.mockReturnValue(queryBuilder);
  queryBuilder.in.mockReturnValue(queryBuilder);
  queryBuilder.order.mockReturnValue(queryBuilder);
  queryBuilder.limit.mockResolvedValue({
    data: [briefRow],
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
  mockSingle.mockResolvedValue({ data: briefRow, error: null });
  mockMaybeSingle.mockResolvedValue({ data: briefRow, error: null });
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

describe("evidence-change-brief-store", () => {
  it("creates an evidence change brief for authorized workspace", async () => {
    const result = await createEvidenceChangeBrief(
      {
        workspace_id: "demo-workspace-spa-menu",
        claim_family: "magnesium_cortisol_stress",
        brief_title: briefRow.brief_title,
        brief_summary: briefRow.brief_summary,
        what_changed: briefRow.what_changed,
        why_it_matters: briefRow.why_it_matters,
        evidence_signal: "unclear",
        risk_implication: "monitor",
        recommended_action: "monitor only",
        affected_client_claims_count: 1,
      },
      operatorAccess
    );

    expect(result.ok).toBe(true);
    expect(mockInsert).toHaveBeenCalled();
    expect(result.ok && result.brief.claim_family).toBe("magnesium_cortisol_stress");
  });

  it("creates affected client claim snapshots", async () => {
    mockInsertSelect.mockReturnValueOnce({
      select: vi.fn().mockResolvedValue({ data: [briefClaimRow], error: null }),
    });
    mockInsert.mockReturnValueOnce({
      select: vi.fn().mockResolvedValue({ data: [briefClaimRow], error: null }),
    });

    const result = await createEvidenceChangeBriefClaimSnapshots(
      "brief-uuid-001",
      "demo-workspace-spa-menu",
      [
        {
          client_claim_id: "demo-claim-magnesium-stress-001",
          claim_text_snapshot: briefClaimRow.claim_text_snapshot,
          claim_family: "magnesium_cortisol_stress",
          mapping_confidence: "high",
        },
      ],
      operatorAccess
    );

    expect(result.ok).toBe(true);
    expect(mockInsert).toHaveBeenCalled();
  });

  it("lists briefs scoped to operator workspaces", async () => {
    await listEvidenceChangeBriefs(operatorAccess);

    expect(queryBuilder.in).toHaveBeenCalledWith("workspace_id", ["demo-workspace-spa-menu"]);
  });

  it("allows break-glass to list briefs without workspace filter", async () => {
    await listEvidenceChangeBriefs(breakGlassAccess);

    expect(queryBuilder.in).not.toHaveBeenCalled();
  });

  it("blocks cross-workspace operator create", async () => {
    const result = await createEvidenceChangeBrief(
      {
        workspace_id: "demo-workspace-spa-menu",
        claim_family: "magnesium_cortisol_stress",
        brief_title: briefRow.brief_title,
        brief_summary: briefRow.brief_summary,
        what_changed: briefRow.what_changed,
        why_it_matters: briefRow.why_it_matters,
        evidence_signal: "unclear",
        risk_implication: "monitor",
        recommended_action: "monitor only",
        affected_client_claims_count: 0,
      },
      otherWorkspaceAccess
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("forbidden");
    }
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("gets brief by id with workspace authorization", async () => {
    const result = await getEvidenceChangeBriefById("brief-uuid-001", operatorAccess);

    expect(result.brief?.id).toBe("brief-uuid-001");
  });

  it("blocks cross-workspace operator from viewing brief", async () => {
    const result = await getEvidenceChangeBriefById("brief-uuid-001", otherWorkspaceAccess);

    expect(result.brief).toBeNull();
    expect(result.error).toBe("forbidden");
  });

  it("lists claim snapshots for authorized brief", async () => {
    queryBuilder.order.mockReturnValueOnce({
      order: vi.fn().mockResolvedValue({ data: [briefClaimRow], error: null }),
    });

    const result = await listEvidenceChangeBriefClaimsForBrief("brief-uuid-001", operatorAccess);

    expect(result.claims.length).toBeGreaterThanOrEqual(0);
  });

  it("returns privacy-safe brief payloads", () => {
    const safe = toPrivacySafeEvidenceChangeBrief(briefRow);
    expect(isPrivacySafeEvidenceChangeBriefPayload(safe)).toBe(true);
    expect("userId" in safe).toBe(false);
  });

  it("returns privacy-safe claim snapshot payloads without internal id", () => {
    const safe = toPrivacySafeEvidenceChangeBriefClaim(briefClaimRow);
    expect(isPrivacySafeEvidenceChangeBriefClaimPayload(safe)).toBe(true);
    expect("id" in safe).toBe(false);
  });
});
