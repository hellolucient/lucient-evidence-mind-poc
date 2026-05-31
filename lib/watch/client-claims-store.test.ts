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
  in: vi.fn(),
  order: vi.fn(),
  limit: vi.fn(),
  maybeSingle: mockMaybeSingle,
};

vi.mock("@/engine/watchlist/supabase-client", () => ({
  getSupabaseEnvConfig: (...args: unknown[]) => mockGetSupabaseEnvConfig(...args),
  createSupabaseServerClient: (...args: unknown[]) => mockCreateSupabaseServerClient(...args),
  CLIENT_CLAIMS_TABLE: "client_claims",
}));

import {
  createClientClaim,
  getClientClaimByClientClaimId,
  isPrivacySafeClientClaimPayload,
  listClientClaims,
  toPrivacySafeClientClaim,
  updateClientClaimStatus,
} from "@/lib/watch/client-claims-store";

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

const claimRow = {
  id: "uuid-001",
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
};

function setupSupabaseMocks() {
  queryBuilder.eq.mockReturnValue(queryBuilder);
  queryBuilder.in.mockReturnValue(queryBuilder);
  queryBuilder.order.mockReturnValue(queryBuilder);
  queryBuilder.limit.mockResolvedValue({
    data: [claimRow],
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
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          maybeSingle: mockMaybeSingle,
        }),
      }),
    }),
  });
  mockSingle.mockResolvedValue({ data: claimRow, error: null });
  mockMaybeSingle.mockResolvedValue({ data: claimRow, error: null });
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

describe("client-claims-store", () => {
  it("creates a client claim for authorized workspace", async () => {
    const result = await createClientClaim(
      {
        workspace_id: "demo-workspace-spa-menu",
        client_claim_id: "demo-claim-magnesium-stress-001",
        claim_text: "Magnesium helps reduce stress and supports healthy cortisol balance.",
        claim_source_type: "spa_menu",
        claim_source_label: null,
        source_url: null,
        claim_family: "magnesium_cortisol_stress",
        risk_level: "medium",
        status: "active",
      },
      operatorAccess
    );

    expect(result.ok).toBe(true);
    expect(mockInsert).toHaveBeenCalled();
    expect(result.ok && result.claim.client_claim_id).toBe("demo-claim-magnesium-stress-001");
  });

  it("rejects duplicate client_claim_id in same workspace", async () => {
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { code: "23505", message: "duplicate key value violates unique constraint" },
    });

    const result = await createClientClaim(
      {
        workspace_id: "demo-workspace-spa-menu",
        client_claim_id: "demo-claim-magnesium-stress-001",
        claim_text: "Duplicate claim.",
        claim_source_type: null,
        claim_source_label: null,
        source_url: null,
        claim_family: null,
        risk_level: null,
        status: "active",
      },
      operatorAccess
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("duplicate_client_claim_id");
    }
  });

  it("blocks cross-workspace operator create", async () => {
    const result = await createClientClaim(
      {
        workspace_id: "demo-workspace-spa-menu",
        client_claim_id: "blocked-claim",
        claim_text: "Should not create.",
        claim_source_type: null,
        claim_source_label: null,
        source_url: null,
        claim_family: null,
        risk_level: null,
        status: "active",
      },
      otherWorkspaceAccess
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("forbidden");
    }
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("lists claims scoped to operator workspaces", async () => {
    await listClientClaims(operatorAccess);

    expect(queryBuilder.in).toHaveBeenCalledWith("workspace_id", ["demo-workspace-spa-menu"]);
  });

  it("allows break-glass to list without workspace filter", async () => {
    await listClientClaims(breakGlassAccess);

    expect(queryBuilder.in).not.toHaveBeenCalled();
  });

  it("looks up claim by workspace and client_claim_id", async () => {
    const result = await getClientClaimByClientClaimId(
      "demo-workspace-spa-menu",
      "demo-claim-magnesium-stress-001",
      operatorAccess
    );

    expect(result.claim?.client_claim_id).toBe("demo-claim-magnesium-stress-001");
  });

  it("allows the same client_claim_id in different workspaces", async () => {
    const result = await createClientClaim(
      {
        workspace_id: "other-workspace",
        client_claim_id: "demo-claim-magnesium-stress-001",
        claim_text: "Same ID, different workspace.",
        claim_source_type: null,
        claim_source_label: null,
        source_url: null,
        claim_family: null,
        risk_level: null,
        status: "active",
      },
      {
        authorized: true,
        mode: "operator",
        userId: "user-789",
        workspaceIds: ["other-workspace"],
      }
    );

    expect(result.ok).toBe(true);
  });

  it("updates claim status for authorized workspace", async () => {
    const result = await updateClientClaimStatus(
      "demo-workspace-spa-menu",
      "demo-claim-magnesium-stress-001",
      "paused",
      operatorAccess
    );

    expect(result.ok).toBe(true);
    expect(mockUpdate).toHaveBeenCalled();
  });

  it("returns privacy-safe claim output without internal uuid", () => {
    const safe = toPrivacySafeClientClaim(claimRow);

    expect(isPrivacySafeClientClaimPayload(safe)).toBe(true);
    expect(safe).not.toHaveProperty("id");
    expect(safe.claim_text).toContain("Magnesium");
  });
});
