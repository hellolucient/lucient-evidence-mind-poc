import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCreateEvidenceChangeBrief = vi.fn();
const mockCreateEvidenceChangeBriefClaimSnapshots = vi.fn();
const mockFindActiveBriefForClaimFamily = vi.fn();
const mockGetClaimFamilyProfile = vi.fn();
const mockResolveAffectedClientClaimsByClaimFamily = vi.fn();

vi.mock("@/lib/watch/evidence-change-brief-store", () => ({
  createEvidenceChangeBrief: (...args: unknown[]) => mockCreateEvidenceChangeBrief(...args),
  createEvidenceChangeBriefClaimSnapshots: (...args: unknown[]) =>
    mockCreateEvidenceChangeBriefClaimSnapshots(...args),
  findActiveBriefForClaimFamily: (...args: unknown[]) =>
    mockFindActiveBriefForClaimFamily(...args),
}));

vi.mock("@/lib/watch/claim-family-profile-store", () => ({
  getClaimFamilyProfile: (...args: unknown[]) => mockGetClaimFamilyProfile(...args),
}));

vi.mock("@/lib/watch/affected-client-claims-resolver", () => ({
  resolveAffectedClientClaimsByClaimFamily: (...args: unknown[]) =>
    mockResolveAffectedClientClaimsByClaimFamily(...args),
}));

import {
  generateDemoMagnesiumBrief,
  generateEvidenceChangeBriefContent,
  mapReviewSignalToEvidenceSignal,
  mapToRiskImplication,
} from "@/lib/watch/evidence-change-brief-generator";

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

const briefRow = {
  id: "brief-uuid-001",
  workspace_id: "demo-workspace-spa-menu",
  claim_family: "magnesium_cortisol_stress",
  watchlist_id: "watch-magnesium-cortisol",
  evidence_alert_id: null,
  review_item_id: null,
  brief_title: "Evidence change detected for Magnesium / Stress / Cortisol",
  brief_summary: "New evidence was detected for the Magnesium / Stress / Cortisol claim family. 1 mapped client claim may require operator review.",
  what_changed: "New evidence was detected for the monitored Magnesium / Stress / Cortisol claim family watchlist (watch-magnesium-cortisol).",
  why_it_matters: "Client claims mapped to Magnesium / Stress / Cortisol may depend on this evidence area.",
  evidence_signal: "unclear",
  risk_implication: "monitor",
  recommended_action: "monitor only",
  safer_wording: "This experience may support relaxation and general wellbeing as part of a balanced wellness routine.",
  affected_client_claims_count: 1,
  status: "ready_for_review",
  created_at: "2026-05-31T12:00:00.000Z",
  updated_at: "2026-05-31T12:00:00.000Z",
};

const affectedClaim = {
  workspace_id: "demo-workspace-spa-menu",
  client_claim_id: "demo-claim-magnesium-stress-001",
  claim_family: "magnesium_cortisol_stress",
  claim_text: "Magnesium helps reduce stress and supports healthy cortisol balance.",
  claim_source_type: "spa_menu",
  claim_source_label: null,
  risk_level: "medium",
  status: "active",
  mapping_confidence: "high",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockFindActiveBriefForClaimFamily.mockResolvedValue({ brief: null });
  mockGetClaimFamilyProfile.mockResolvedValue({
    profile: {
      claim_family: "magnesium_cortisol_stress",
      display_name: "Magnesium / Stress / Cortisol",
      default_watchlist_id: "watch-magnesium-cortisol",
      status: "active",
    },
  });
  mockResolveAffectedClientClaimsByClaimFamily.mockResolvedValue({ claims: [affectedClaim] });
  mockCreateEvidenceChangeBrief.mockResolvedValue({ ok: true, brief: briefRow });
  mockCreateEvidenceChangeBriefClaimSnapshots.mockResolvedValue({ ok: true, claims: [] });
});

describe("evidence-change-brief-generator", () => {
  it("generates deterministic brief content from claim family context", () => {
    const content = generateEvidenceChangeBriefContent({
      claim_family: "magnesium_cortisol_stress",
      claim_family_display_name: "Magnesium / Stress / Cortisol",
      watchlist_id: "watch-magnesium-cortisol",
      affected_claims: [affectedClaim],
    });

    expect(content.brief_title).toBe("Evidence change detected for Magnesium / Stress / Cortisol");
    expect(content.affected_client_claims_count).toBe(1);
    expect(content.safer_wording).toContain("relaxation");
    expect(content.recommended_action).toBe("monitor only");
  });

  it("maps review signals to evidence signal values", () => {
    expect(mapReviewSignalToEvidenceSignal("strengthens_claim")).toBe("supportive");
    expect(mapReviewSignalToEvidenceSignal("contradicts_claim")).toBe("contradictory");
    expect(mapReviewSignalToEvidenceSignal(null)).toBe("unclear");
  });

  it("maps evidence signals to risk implications", () => {
    expect(mapToRiskImplication("contradictory", "contradicts_claim", "high")).toBe(
      "claim_not_supported"
    );
    expect(mapToRiskImplication("weak", "weakens_claim", "medium")).toBe(
      "wording_review_recommended"
    );
  });

  it("generates demo magnesium brief using durable mappings", async () => {
    const result = await generateDemoMagnesiumBrief(operatorAccess);

    expect(result.ok).toBe(true);
    expect(mockResolveAffectedClientClaimsByClaimFamily).toHaveBeenCalledWith(
      "magnesium_cortisol_stress",
      "demo-workspace-spa-menu"
    );
    expect(mockCreateEvidenceChangeBrief).toHaveBeenCalled();
    expect(mockCreateEvidenceChangeBriefClaimSnapshots).toHaveBeenCalled();
  });

  it("creates zero affected claims without crashing when mappings are missing", async () => {
    mockResolveAffectedClientClaimsByClaimFamily.mockResolvedValueOnce({ claims: [] });

    const result = await generateDemoMagnesiumBrief(operatorAccess);

    expect(result.ok).toBe(true);
    expect(mockCreateEvidenceChangeBriefClaimSnapshots).toHaveBeenCalledWith(
      "brief-uuid-001",
      "demo-workspace-spa-menu",
      [],
      operatorAccess
    );
  });

  it("skips duplicate active brief for same claim family", async () => {
    mockFindActiveBriefForClaimFamily.mockResolvedValueOnce({ brief: briefRow });

    const result = await generateDemoMagnesiumBrief(operatorAccess);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.duplicate_skipped).toBe(true);
    }
    expect(mockCreateEvidenceChangeBrief).not.toHaveBeenCalled();
  });

  it("blocks cross-workspace operator demo generation", async () => {
    const result = await generateDemoMagnesiumBrief(otherWorkspaceAccess);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("forbidden");
    }
  });

  it("allows break-glass demo generation", async () => {
    const result = await generateDemoMagnesiumBrief(breakGlassAccess);

    expect(result.ok).toBe(true);
  });
});
