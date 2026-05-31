import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockFrom = vi.fn();
const mockGetSupabaseEnvConfig = vi.fn();
const mockCreateSupabaseServerClient = vi.fn();

vi.mock("@/engine/watchlist/supabase-client", () => ({
  getSupabaseEnvConfig: (...args: unknown[]) => mockGetSupabaseEnvConfig(...args),
  createSupabaseServerClient: (...args: unknown[]) => mockCreateSupabaseServerClient(...args),
  CLIENT_CLAIMS_TABLE: "client_claims",
  CLIENT_CLAIM_WATCHLIST_MAPPINGS_TABLE: "client_claim_watchlist_mappings",
}));

import {
  findAffectedClientClaimsForClaimFamilyAsync,
  resolveAffectedClientClaimsByClaimFamily,
} from "@/lib/watch/affected-client-claims-resolver";

const claimRow = {
  workspace_id: "demo-workspace-spa-menu",
  client_claim_id: "demo-claim-magnesium-stress-001",
  claim_text: "Magnesium helps reduce stress and supports healthy cortisol balance.",
  claim_source_type: "spa_menu",
  claim_source_label: null,
  risk_level: "medium",
  status: "active",
  claim_family: "magnesium_cortisol_stress",
};

function setupSupabaseMocks() {
  mockGetSupabaseEnvConfig.mockReturnValue({
    hasSupabaseUrl: true,
    hasSupabaseServiceRoleKey: true,
  });
  mockCreateSupabaseServerClient.mockReturnValue({
    from: mockFrom,
  });
}

beforeEach(() => {
  setupSupabaseMocks();
});

afterEach(() => {
  vi.clearAllMocks();
  setupSupabaseMocks();
});

describe("affected-client-claims-resolver", () => {
  it("resolves affected client claims by claim_family from durable mappings", async () => {
    const mappingQuery = {
      eq: vi.fn(),
    };
    mappingQuery.eq.mockReturnValue(mappingQuery);
    mappingQuery.eq.mockReturnValueOnce(mappingQuery);
    mappingQuery.eq.mockResolvedValueOnce({
      data: [
        {
          workspace_id: "demo-workspace-spa-menu",
          client_claim_id: "demo-claim-magnesium-stress-001",
          claim_family: "magnesium_cortisol_stress",
        },
      ],
      error: null,
    });

    const claimQuery = {
      eq: vi.fn(),
      maybeSingle: vi.fn(),
    };
    claimQuery.eq.mockReturnValue(claimQuery);
    claimQuery.eq.mockReturnValue(claimQuery);
    claimQuery.eq.mockReturnValue(claimQuery);
    claimQuery.maybeSingle.mockResolvedValueOnce({ data: claimRow, error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === "client_claim_watchlist_mappings") {
        return {
          select: vi.fn().mockReturnValue(mappingQuery),
        };
      }

      return {
        select: vi.fn().mockReturnValue(claimQuery),
      };
    });

    const result = await resolveAffectedClientClaimsByClaimFamily("magnesium_cortisol_stress");

    expect(result.claims).toHaveLength(1);
    expect(result.claims[0]).toMatchObject({
      workspace_id: "demo-workspace-spa-menu",
      client_claim_id: "demo-claim-magnesium-stress-001",
      claim_family: "magnesium_cortisol_stress",
    });
  });

  it("returns empty when no durable mappings exist", async () => {
    const mappingQuery = {
      eq: vi.fn(),
    };
    mappingQuery.eq.mockReturnValue(mappingQuery);
    mappingQuery.eq.mockReturnValueOnce(mappingQuery);
    mappingQuery.eq.mockResolvedValueOnce({ data: [], error: null });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue(mappingQuery),
    });

    const result = await resolveAffectedClientClaimsByClaimFamily("unknown_claim_family");

    expect(result.claims).toEqual([]);
  });

  it("falls back to in-memory mapper when durable lookup is empty", async () => {
    const mappingQuery = {
      eq: vi.fn(),
    };
    mappingQuery.eq.mockReturnValue(mappingQuery);
    mappingQuery.eq.mockReturnValueOnce(mappingQuery);
    mappingQuery.eq.mockResolvedValueOnce({ data: [], error: null });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue(mappingQuery),
    });

    const affected = await findAffectedClientClaimsForClaimFamilyAsync("magnesium_cortisol_stress");

    expect(affected).toHaveLength(1);
    expect(affected[0].id).toBe("demo-claim-magnesium-stress-001");
  });
});
