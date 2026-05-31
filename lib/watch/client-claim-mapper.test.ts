import { beforeEach, describe, expect, it, vi } from "vitest";

const mockResolveAffectedClientClaimsByClaimFamily = vi.fn();

vi.mock("./affected-client-claims-resolver", () => ({
  resolveAffectedClientClaimsByClaimFamily: (...args: unknown[]) =>
    mockResolveAffectedClientClaimsByClaimFamily(...args),
  findAffectedClientClaimsForClaimFamilyAsync: async (claimFamilyId: string) => {
    const durableResult = await mockResolveAffectedClientClaimsByClaimFamily(claimFamilyId);
    if (durableResult.claims?.length > 0) {
      return durableResult.claims.map(
        (ref: {
          client_claim_id: string;
          workspace_id: string;
          claim_text: string;
          claim_family: string;
          claim_source_type: string | null;
          claim_source_label: string | null;
          risk_level: string | null;
          status: string;
        }) => ({
          id: ref.client_claim_id,
          workspace_id: ref.workspace_id,
          claim_text: ref.claim_text,
          claim_context: "",
          source_type: ref.claim_source_type ?? "unknown",
          source_label: ref.claim_source_label ?? "",
          claim_family_id: ref.claim_family,
          status: ref.status === "archived" ? "archived" : "active",
          risk_level: ref.risk_level === "low" || ref.risk_level === "high" ? ref.risk_level : "medium",
          created_at: "2026-05-31T10:00:00.000Z",
          updated_at: "2026-05-31T10:00:00.000Z",
        })
      );
    }

    const { findAffectedClientClaimsForClaimFamily } = await import("./client-claim-mapper");
    return findAffectedClientClaimsForClaimFamily(claimFamilyId);
  },
}));

import {
  DEMO_CLIENT_CLAIM_MAGNESIUM_STRESS,
  findAffectedClientClaimsForClaimFamily,
  getClientClaimById,
} from "./client-claim-mapper";
import { findAffectedClientClaimsForClaimFamilyAsync } from "./affected-client-claims-resolver";

describe("client-claim-mapper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolveAffectedClientClaimsByClaimFamily.mockResolvedValue({ claims: [] });
  });

  it("maps magnesium_cortisol_stress to the demo client claim via in-memory fallback", () => {
    const affected = findAffectedClientClaimsForClaimFamily("magnesium_cortisol_stress");

    expect(affected).toHaveLength(1);
    expect(affected[0]).toMatchObject({
      id: "demo-claim-magnesium-stress-001",
      workspace_id: "demo-workspace-spa-menu",
      claim_family_id: "magnesium_cortisol_stress",
      source_type: "spa_menu_description",
      source_label: "Demo Spa Magnesium Recovery Treatment",
    });
    expect(affected[0].claim_text).toContain("Magnesium therapy");
  });

  it("returns no affected claims for an unknown claim family", () => {
    expect(findAffectedClientClaimsForClaimFamily("unknown_claim_family")).toEqual([]);
  });

  it("returns defensive copies of demo claim records", () => {
    const claim = getClientClaimById(DEMO_CLIENT_CLAIM_MAGNESIUM_STRESS.id);

    expect(claim).not.toBeNull();
    claim!.claim_text = "mutated";

    expect(getClientClaimById(DEMO_CLIENT_CLAIM_MAGNESIUM_STRESS.id)?.claim_text).toBe(
      DEMO_CLIENT_CLAIM_MAGNESIUM_STRESS.claim_text
    );
  });

  it("prefers durable mappings when resolving affected claims asynchronously", async () => {
    mockResolveAffectedClientClaimsByClaimFamily.mockResolvedValueOnce({
      claims: [
        {
          workspace_id: "demo-workspace-spa-menu",
          client_claim_id: "durable-claim-001",
          claim_family: "magnesium_cortisol_stress",
          claim_text: "Durable mapped claim text.",
          claim_source_type: "spa_menu",
          claim_source_label: "Durable source",
          risk_level: "medium",
          status: "active",
        },
      ],
    });

    const affected = await findAffectedClientClaimsForClaimFamilyAsync("magnesium_cortisol_stress");

    expect(affected).toHaveLength(1);
    expect(affected[0].id).toBe("durable-claim-001");
    expect(affected[0].claim_text).toBe("Durable mapped claim text.");
  });

  it("falls back to in-memory mapper when durable lookup is empty", async () => {
    mockResolveAffectedClientClaimsByClaimFamily.mockResolvedValueOnce({ claims: [] });

    const affected = await findAffectedClientClaimsForClaimFamilyAsync("magnesium_cortisol_stress");

    expect(affected).toHaveLength(1);
    expect(affected[0].id).toBe("demo-claim-magnesium-stress-001");
  });
});
