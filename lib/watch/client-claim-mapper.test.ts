import { describe, expect, it } from "vitest";

import {
  DEMO_CLIENT_CLAIM_MAGNESIUM_STRESS,
  findAffectedClientClaimsForClaimFamily,
  getClientClaimById,
} from "./client-claim-mapper";

describe("client-claim-mapper", () => {
  it("maps magnesium_cortisol_stress to the demo client claim", () => {
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
});
