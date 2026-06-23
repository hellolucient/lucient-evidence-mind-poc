import { describe, expect, it } from "vitest";

import { extractWellnessClaimsFromSourceText } from "@/lib/review/wellness-claims-extractor";

const SPA_MENU_FIXTURE =
  "Magnesium Calm Ritual: A deeply relaxing treatment designed to calm the nervous system, support deep sleep, reduce stress hormones, and restore balance.";

const PRODUCT_DESCRIPTION_FIXTURE =
  "Recovery Magnesium Serum helps reduce inflammation, regulate cortisol, boost immunity, and improve skin barrier function after exercise.";

const NO_CLAIM_FIXTURE =
  "Our spa welcomes guests with warm towels, herbal tea, and a quiet waiting area. Appointments begin on the hour.";

describe("wellness claims extractor", () => {
  it("extracts spa menu claims from magnesium calm ritual copy", () => {
    const claims = extractWellnessClaimsFromSourceText(SPA_MENU_FIXTURE);

    const claimTexts = claims.map((claim) => claim.claim_text);
    expect(claimTexts).toContain("calms the nervous system");
    expect(claimTexts).toContain("supports deep sleep");
    expect(claimTexts).toContain("reduces stress hormones");
    expect(claimTexts).toContain("restores balance");
    expect(claims.length).toBeGreaterThanOrEqual(4);
  });

  it("extracts product description claims", () => {
    const claims = extractWellnessClaimsFromSourceText(PRODUCT_DESCRIPTION_FIXTURE);
    const claimTexts = claims.map((claim) => claim.claim_text);

    expect(claimTexts).toContain("reduces inflammation");
    expect(claimTexts).toContain("regulates cortisol");
    expect(claimTexts).toContain("boosts immunity");
    expect(claimTexts).toContain("improves skin barrier");
  });

  it("returns zero candidates for no-claim text", () => {
    const claims = extractWellnessClaimsFromSourceText(NO_CLAIM_FIXTURE);
    expect(claims).toHaveLength(0);
  });

  it("returns zero candidates for empty source text", () => {
    expect(extractWellnessClaimsFromSourceText("")).toHaveLength(0);
    expect(extractWellnessClaimsFromSourceText("   ")).toHaveLength(0);
  });

  it("populates structured candidate claim fields", () => {
    const claims = extractWellnessClaimsFromSourceText(SPA_MENU_FIXTURE);
    const sleepClaim = claims.find((claim) => claim.claim_text === "supports deep sleep");

    expect(sleepClaim).toBeDefined();
    expect(sleepClaim?.source_excerpt.length).toBeGreaterThan(0);
    expect(sleepClaim?.claim_type).toBe("sleep");
    expect(sleepClaim?.claim_family).toBe("sleep_support");
    expect(sleepClaim?.subject).toBe("Magnesium Calm Ritual");
    expect(sleepClaim?.predicate).toBe("supports sleep");
    expect(sleepClaim?.object).toBe("sleep");
    expect(sleepClaim?.claim_strength).toBe("moderate");
    expect(sleepClaim?.evidence_sensitivity).toBe("medium");
    expect(sleepClaim?.is_direct_claim).toBe(true);
    expect(sleepClaim?.needs_research).toBe(true);
    expect(sleepClaim?.normalized_claim_text).toBe("supports deep sleep");
  });
});
