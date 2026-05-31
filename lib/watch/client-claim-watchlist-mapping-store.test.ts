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
  CLIENT_CLAIM_WATCHLIST_MAPPINGS_TABLE: "client_claim_watchlist_mappings",
}));

import {
  createClientClaimWatchlistMapping,
  isPrivacySafeClientClaimWatchlistMappingPayload,
  listClientClaimWatchlistMappings,
  toPrivacySafeClientClaimWatchlistMapping,
  updateClientClaimWatchlistMappingStatus,
} from "@/lib/watch/client-claim-watchlist-mapping-store";

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

const mappingRow = {
  id: "uuid-mapping-001",
  workspace_id: "demo-workspace-spa-menu",
  client_claim_id: "demo-claim-magnesium-stress-001",
  claim_family: "magnesium_cortisol_stress",
  watchlist_id: "watch-magnesium-cortisol",
  mapping_status: "active",
  mapping_confidence: "high",
  mapping_source: "seeded",
  created_at: "2026-05-31T10:00:00.000Z",
  updated_at: "2026-05-31T10:00:00.000Z",
};

function setupSupabaseMocks() {
  queryBuilder.eq.mockReturnValue(queryBuilder);
  queryBuilder.in.mockReturnValue(queryBuilder);
  queryBuilder.order.mockReturnValue(queryBuilder);
  queryBuilder.limit.mockResolvedValue({
    data: [mappingRow],
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
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            maybeSingle: mockMaybeSingle,
          }),
        }),
      }),
    }),
  });
  mockSingle.mockResolvedValue({ data: mappingRow, error: null });
  mockMaybeSingle.mockResolvedValue({ data: mappingRow, error: null });
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

describe("client-claim-watchlist-mapping-store", () => {
  it("creates mapping for in-workspace claim", async () => {
    const result = await createClientClaimWatchlistMapping(
      {
        workspace_id: "demo-workspace-spa-menu",
        client_claim_id: "demo-claim-magnesium-stress-001",
        claim_family: "magnesium_cortisol_stress",
        mapping_status: "active",
        mapping_confidence: "high",
        mapping_source: "manual",
      },
      operatorAccess
    );

    expect(result.ok).toBe(true);
    expect(mockInsert).toHaveBeenCalled();
  });

  it("rejects duplicate mapping safely", async () => {
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { code: "23505", message: "duplicate key value violates unique constraint" },
    });

    const result = await createClientClaimWatchlistMapping(
      {
        workspace_id: "demo-workspace-spa-menu",
        client_claim_id: "demo-claim-magnesium-stress-001",
        claim_family: "magnesium_cortisol_stress",
      },
      operatorAccess
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("duplicate_mapping");
    }
  });

  it("allows same client_claim_id and claim_family across different workspaces", async () => {
    const result = await createClientClaimWatchlistMapping(
      {
        workspace_id: "other-workspace",
        client_claim_id: "demo-claim-magnesium-stress-001",
        claim_family: "magnesium_cortisol_stress",
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

  it("lists mappings scoped to operator workspace", async () => {
    await listClientClaimWatchlistMappings(operatorAccess);

    expect(queryBuilder.in).toHaveBeenCalledWith("workspace_id", ["demo-workspace-spa-menu"]);
  });

  it("blocks cross-workspace operator create", async () => {
    const result = await createClientClaimWatchlistMapping(
      {
        workspace_id: "demo-workspace-spa-menu",
        client_claim_id: "demo-claim-magnesium-stress-001",
        claim_family: "magnesium_cortisol_stress",
      },
      otherWorkspaceAccess
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("forbidden");
    }
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("allows break-glass to list without workspace filter", async () => {
    await listClientClaimWatchlistMappings(breakGlassAccess);

    expect(queryBuilder.in).not.toHaveBeenCalled();
  });

  it("updates mapping status for authorized workspace", async () => {
    const result = await updateClientClaimWatchlistMappingStatus(
      "demo-workspace-spa-menu",
      "demo-claim-magnesium-stress-001",
      "magnesium_cortisol_stress",
      "paused",
      operatorAccess
    );

    expect(result.ok).toBe(true);
    expect(mockUpdate).toHaveBeenCalled();
  });

  it("returns privacy-safe mapping output without internal uuid", () => {
    const safe = toPrivacySafeClientClaimWatchlistMapping(mappingRow);

    expect(isPrivacySafeClientClaimWatchlistMappingPayload(safe)).toBe(true);
    expect(safe).not.toHaveProperty("id");
    expect(safe.claim_family).toBe("magnesium_cortisol_stress");
  });
});
