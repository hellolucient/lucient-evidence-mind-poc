import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCreateClientClaim = vi.fn();
const mockListClientClaims = vi.fn();
const mockListClientClaimWatchlistMappings = vi.fn();
const mockListClaimFamilyProfiles = vi.fn();

vi.mock("@/lib/watch/client-claims-store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/watch/client-claims-store")>();
  return {
    ...actual,
    createClientClaim: (...args: unknown[]) => mockCreateClientClaim(...args),
    listClientClaims: (...args: unknown[]) => mockListClientClaims(...args),
  };
});

vi.mock("@/lib/watch/client-claim-watchlist-mapping-store", () => ({
  listClientClaimWatchlistMappings: (...args: unknown[]) => mockListClientClaimWatchlistMappings(...args),
}));

vi.mock("@/lib/watch/claim-family-profile-store", () => ({
  listClaimFamilyProfiles: (...args: unknown[]) => mockListClaimFamilyProfiles(...args),
}));

import {
  buildClientClaimsCreateRedirectPath,
  buildClientClaimsMappingCreateRedirectPath,
  clientClaimsErrorMessage,
  processClientClaimCreateSubmission,
  processClientClaimMappingCreateSubmission,
} from "@/lib/review/client-claims-page";

const operatorAccess = {
  authorized: true,
  mode: "operator" as const,
  userId: "user-123",
  workspaceIds: ["demo-workspace-spa-menu"],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockListClientClaims.mockResolvedValue({ claims: [] });
  mockListClientClaimWatchlistMappings.mockResolvedValue({ mappings: [] });
  mockListClaimFamilyProfiles.mockResolvedValue({
    profiles: [
      {
        claim_family: "magnesium_cortisol_stress",
        display_name: "Magnesium / Stress / Cortisol",
        description: null,
        default_watchlist_id: "watch-magnesium-cortisol",
        status: "active",
        created_at: "2026-05-31T10:00:00.000Z",
        updated_at: "2026-05-31T10:00:00.000Z",
      },
    ],
  });
  mockCreateClientClaim.mockResolvedValue({
    ok: true,
    claim: {
      workspace_id: "demo-workspace-spa-menu",
      client_claim_id: "new-claim-001",
      claim_text: "Supports healthy sleep.",
      claim_source_type: "spa_menu",
      claim_source_label: null,
      source_url: null,
      claim_family: "sleep_support",
      risk_level: "low",
      status: "active",
      created_at: "2026-05-31T12:00:00.000Z",
      updated_at: "2026-05-31T12:00:00.000Z",
    },
  });
});

describe("client-claims-page submission", () => {
  it("redirects with success when claim is created", async () => {
    const formData = new FormData();
    formData.set("workspace_id", "demo-workspace-spa-menu");
    formData.set("client_claim_id", "new-claim-001");
    formData.set("claim_text", "Supports healthy sleep.");
    formData.set("status", "active");

    const submission = await processClientClaimCreateSubmission(formData, operatorAccess);

    expect(submission.result.ok).toBe(true);
    expect(submission.redirectPath).toContain("create_ok=1");
    expect(mockCreateClientClaim).toHaveBeenCalled();
  });

  it("maps duplicate claim errors to safe messages", () => {
    expect(clientClaimsErrorMessage("duplicate_client_claim_id")).toContain("already exists");
  });

  it("builds safe redirect path without secrets", () => {
    const path = buildClientClaimsCreateRedirectPath({
      returnQuery: "",
      result: {
        ok: false,
        error: "duplicate_client_claim_id",
        message: "A claim with this client_claim_id already exists in the workspace.",
      },
    });

    expect(path).toContain("create_error=duplicate_client_claim_id");
    expect(path).not.toContain("service_role");
  });

  it("rejects mapping create when claim family is not in controlled registry", async () => {
    const formData = new FormData();
    formData.set("workspace_id", "demo-workspace-spa-menu");
    formData.set("client_claim_id", "demo-claim-magnesium-stress-001");
    formData.set("claim_family", "free_text_family");

    const submission = await processClientClaimMappingCreateSubmission(formData, operatorAccess, [
      "magnesium_cortisol_stress",
    ]);

    expect(submission.result.ok).toBe(false);
    if (!submission.result.ok) {
      expect(submission.result.error).toBe("unsupported_claim_family");
    }
    expect(submission.redirectPath).toContain("mapping_error=unsupported_claim_family");
  });

  it("builds safe mapping redirect path without secrets", () => {
    const path = buildClientClaimsMappingCreateRedirectPath({
      returnQuery: "",
      result: {
        ok: false,
        error: "duplicate_mapping",
        message: "A mapping for this claim and claim family already exists in the workspace.",
      },
    });

    expect(path).toContain("mapping_error=duplicate_mapping");
    expect(path).not.toContain("service_role");
  });
});
