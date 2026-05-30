import { describe, expect, it } from "vitest";

import {
  MAGNESIUM_CORTISOL_GENERATED_QUERY,
  MAGNESIUM_CORTISOL_QUERY_VERSION,
  MAGNESIUM_CORTISOL_STRESS_PROFILE,
  MAGNESIUM_CORTISOL_STRESS_V1_PUBMED_QUERY,
  buildPubMedQueryFromProfile,
  getClaimFamilySearchProfile,
  getClaimFamilySearchProfileByWatchTopic,
  resolveClaimFamilySearchProfile,
} from "./claim-family-search-profiles";

describe("claim-family-search-profiles", () => {
  it("includes a profile for magnesium_cortisol_stress", () => {
    const profile = getClaimFamilySearchProfile("magnesium_cortisol_stress");

    expect(profile).not.toBeNull();
    expect(profile?.display_name).toBe("Magnesium, cortisol, and stress physiology");
    expect(profile?.intervention_terms).toContain("magnesium");
    expect(profile?.outcome_terms).toContain("cortisol");
    expect(profile?.mechanism_terms.length).toBeGreaterThan(0);
    expect(profile?.source_priority[0]).toBe("PubMed first");
  });

  it("resolves profile by watch topic id", () => {
    const profile = getClaimFamilySearchProfileByWatchTopic("watch-magnesium-cortisol");

    expect(profile?.claim_family_id).toBe("magnesium_cortisol_stress");
    expect(
      resolveClaimFamilySearchProfile({
        watchTopicId: "watch-magnesium-cortisol",
      })
    ).toEqual(profile);
  });

  it("generates a PubMed query that includes magnesium intervention terms", () => {
    const query = buildPubMedQueryFromProfile(MAGNESIUM_CORTISOL_STRESS_PROFILE);

    expect(query).toContain('"magnesium"[Title/Abstract]');
    expect(query).toContain('"magnesium supplementation"[Title/Abstract]');
  });

  it("generates a PubMed query that includes cortisol, stress, and HPA terms", () => {
    const query = buildPubMedQueryFromProfile(MAGNESIUM_CORTISOL_STRESS_PROFILE);

    expect(query).toContain('"cortisol"[Title/Abstract]');
    expect(query).toContain('"hypothalamic-pituitary-adrenal"[Title/Abstract]');
    expect(query).toContain('"HPA axis"[Title/Abstract]');
    expect(query).toContain('"stress physiology"[Title/Abstract]');
  });

  it("generates a PubMed query that excludes animal-only and veterinary noise", () => {
    const query = buildPubMedQueryFromProfile(MAGNESIUM_CORTISOL_STRESS_PROFILE);

    expect(query).toContain('NOT ("animals"[MeSH Terms] NOT "humans"[MeSH Terms])');
    expect(query).toContain("goat*[Title/Abstract]");
    expect(query).toContain("veterinary[Title/Abstract]");
  });

  it("keeps the v1 query stable and identical to the pre-Phase-15 production query", () => {
    expect(MAGNESIUM_CORTISOL_GENERATED_QUERY).toBe(MAGNESIUM_CORTISOL_STRESS_V1_PUBMED_QUERY);
    expect(MAGNESIUM_CORTISOL_QUERY_VERSION).toBe("magnesium_cortisol_stress@v1");
  });
});
