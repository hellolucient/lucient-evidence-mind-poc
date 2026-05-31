import { beforeEach, describe, expect, it, vi } from "vitest";

const mockListEvidenceChangeBriefs = vi.fn();
const mockGetEvidenceChangeBriefById = vi.fn();
const mockListEvidenceChangeBriefClaimsForBrief = vi.fn();
const mockListClaimFamilyProfiles = vi.fn();
const mockGenerateDemoMagnesiumBrief = vi.fn();
const mockIsEvidenceChangeBriefPersistenceConfigured = vi.fn();

vi.mock("@/lib/watch/evidence-change-brief-store", () => ({
  listEvidenceChangeBriefs: (...args: unknown[]) => mockListEvidenceChangeBriefs(...args),
  getEvidenceChangeBriefById: (...args: unknown[]) => mockGetEvidenceChangeBriefById(...args),
  listEvidenceChangeBriefClaimsForBrief: (...args: unknown[]) =>
    mockListEvidenceChangeBriefClaimsForBrief(...args),
  isEvidenceChangeBriefPersistenceConfigured: (...args: unknown[]) =>
    mockIsEvidenceChangeBriefPersistenceConfigured(...args),
}));

vi.mock("@/lib/watch/claim-family-profile-store", () => ({
  listClaimFamilyProfiles: (...args: unknown[]) => mockListClaimFamilyProfiles(...args),
}));

vi.mock("@/lib/watch/evidence-change-brief-generator", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/watch/evidence-change-brief-generator")>();
  return {
    ...actual,
    generateDemoMagnesiumBrief: (...args: unknown[]) => mockGenerateDemoMagnesiumBrief(...args),
  };
});

import {
  buildEvidenceBriefsPageData,
  processDemoBriefGenerationSubmission,
} from "@/lib/review/evidence-briefs-page";

const operatorAccess = {
  authorized: true,
  mode: "operator" as const,
  userId: "user-123",
  workspaceIds: ["demo-workspace-spa-menu"],
};

const briefRow = {
  id: "brief-uuid-001",
  workspace_id: "demo-workspace-spa-menu",
  claim_family: "magnesium_cortisol_stress",
  watchlist_id: "watch-magnesium-cortisol",
  evidence_alert_id: null,
  review_item_id: null,
  brief_title: "Evidence change detected for Magnesium / Stress / Cortisol",
  brief_summary: "Summary",
  what_changed: "What changed",
  why_it_matters: "Why it matters",
  evidence_signal: "unclear",
  risk_implication: "monitor",
  recommended_action: "monitor only",
  safer_wording: null,
  affected_client_claims_count: 1,
  status: "ready_for_review",
  created_at: "2026-05-31T12:00:00.000Z",
  updated_at: "2026-05-31T12:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockIsEvidenceChangeBriefPersistenceConfigured.mockReturnValue(true);
  mockListEvidenceChangeBriefs.mockResolvedValue({ briefs: [briefRow] });
  mockGetEvidenceChangeBriefById.mockResolvedValue({ brief: briefRow });
  mockListEvidenceChangeBriefClaimsForBrief.mockResolvedValue({
    claims: [
      {
        brief_id: "brief-uuid-001",
        workspace_id: "demo-workspace-spa-menu",
        client_claim_id: "demo-claim-magnesium-stress-001",
        claim_text_snapshot: "Magnesium helps reduce stress.",
        claim_source_type: "spa_menu",
        claim_source_label: null,
        claim_family: "magnesium_cortisol_stress",
        mapping_confidence: "high",
        created_at: "2026-05-31T12:00:00.000Z",
      },
    ],
  });
  mockListClaimFamilyProfiles.mockResolvedValue({
    profiles: [
      {
        claim_family: "magnesium_cortisol_stress",
        display_name: "Magnesium / Stress / Cortisol",
        default_watchlist_id: "watch-magnesium-cortisol",
        status: "active",
      },
    ],
  });
  mockGenerateDemoMagnesiumBrief.mockResolvedValue({ ok: true, brief: briefRow });
});

describe("evidence-briefs-page", () => {
  it("builds page data with brief list and selected detail", async () => {
    const pageData = await buildEvidenceBriefsPageData(
      { brief_id: "brief-uuid-001" },
      operatorAccess
    );

    expect(pageData.briefs).toHaveLength(1);
    expect(pageData.briefs[0].brief_title).toContain("Evidence change detected");
    expect(pageData.briefs[0].risk_implication).toBe("monitor");
    expect(pageData.selectedBrief?.id).toBe("brief-uuid-001");
    expect(pageData.selectedBrief?.recommended_action).toBeTruthy();
    expect(pageData.selectedBriefClaims).toHaveLength(1);
    expect(pageData.selectedBriefClaims[0].client_claim_id).toBe("demo-claim-magnesium-stress-001");
    expect(pageData.selectedBriefClaims[0].claim_text_snapshot).toContain("Magnesium");
  });

  it("redirects after successful demo generation", async () => {
    const submission = await processDemoBriefGenerationSubmission(operatorAccess);

    expect(submission.result.ok).toBe(true);
    expect(submission.redirectPath).toContain("/evidence-briefs");
    expect(submission.redirectPath).toContain("generate_ok=1");
  });
});
