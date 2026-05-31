import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockGetSupabaseEnvConfig = vi.fn();
const mockCreateSupabaseServerClient = vi.fn();

const queryBuilder = {
  eq: vi.fn(),
  order: vi.fn(),
  limit: vi.fn(),
};

vi.mock("@/engine/watchlist/supabase-client", () => ({
  getSupabaseEnvConfig: (...args: unknown[]) => mockGetSupabaseEnvConfig(...args),
  createSupabaseServerClient: (...args: unknown[]) => mockCreateSupabaseServerClient(...args),
  CLAIM_FAMILY_PROFILES_TABLE: "claim_family_profiles",
}));

import {
  getClaimFamilyProfile,
  isPrivacySafeClaimFamilyProfilePayload,
  listClaimFamilyProfiles,
  toPrivacySafeClaimFamilyProfile,
} from "@/lib/watch/claim-family-profile-store";

const magnesiumProfileRow = {
  claim_family: "magnesium_cortisol_stress",
  display_name: "Magnesium / Stress / Cortisol",
  description: "Claims linking magnesium with stress reduction, relaxation, or cortisol balance.",
  default_watchlist_id: "watch-magnesium-cortisol",
  status: "active",
  created_at: "2026-05-31T10:00:00.000Z",
  updated_at: "2026-05-31T10:00:00.000Z",
};

function setupSupabaseMocks() {
  queryBuilder.eq.mockReturnValue(queryBuilder);
  queryBuilder.order.mockReturnValue(queryBuilder);
  queryBuilder.limit.mockResolvedValue({
    data: [magnesiumProfileRow],
    error: null,
  });

  mockFrom.mockReturnValue({
    select: mockSelect,
  });
  mockSelect.mockReturnValue(queryBuilder);
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

describe("claim-family-profile-store", () => {
  it("lists active claim family profiles", async () => {
    const result = await listClaimFamilyProfiles();

    expect(result.profiles).toHaveLength(1);
    expect(result.profiles[0]).toMatchObject({
      claim_family: "magnesium_cortisol_stress",
      display_name: "Magnesium / Stress / Cortisol",
      status: "active",
    });
    expect(queryBuilder.eq).toHaveBeenCalledWith("status", "active");
  });

  it("returns seeded magnesium claim family profile", async () => {
    const profileQuery = {
      eq: vi.fn(),
      maybeSingle: vi.fn(),
    };
    profileQuery.eq.mockReturnValue(profileQuery);
    profileQuery.maybeSingle.mockResolvedValueOnce({
      data: magnesiumProfileRow,
      error: null,
    });

    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue(profileQuery),
    });

    const result = await getClaimFamilyProfile("magnesium_cortisol_stress");

    expect(result.profile).toMatchObject({
      claim_family: "magnesium_cortisol_stress",
      display_name: "Magnesium / Stress / Cortisol",
      default_watchlist_id: "watch-magnesium-cortisol",
    });
  });

  it("returns privacy-safe profile output", () => {
    const safe = toPrivacySafeClaimFamilyProfile(magnesiumProfileRow);

    expect(isPrivacySafeClaimFamilyProfilePayload(safe)).toBe(true);
    expect(safe.display_name).toBe("Magnesium / Stress / Cortisol");
  });

  it("returns empty list when supabase is not configured", async () => {
    mockGetSupabaseEnvConfig.mockReturnValueOnce({
      hasSupabaseUrl: false,
      hasSupabaseServiceRoleKey: false,
    });

    const result = await listClaimFamilyProfiles();

    expect(result.profiles).toEqual([]);
    expect(result.error).toBe("supabase_not_configured");
  });
});
