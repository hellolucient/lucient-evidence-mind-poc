import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCreateEvidenceMindDigest = vi.fn();
const mockCreateEvidenceMindDigestItemSnapshots = vi.fn();
const mockFindActiveDigestForPeriod = vi.fn();
const mockCollectDigestSourceData = vi.fn();

vi.mock("@/lib/watch/evidence-mind-digest-store", () => ({
  createEvidenceMindDigest: (...args: unknown[]) => mockCreateEvidenceMindDigest(...args),
  createEvidenceMindDigestItemSnapshots: (...args: unknown[]) =>
    mockCreateEvidenceMindDigestItemSnapshots(...args),
  findActiveDigestForPeriod: (...args: unknown[]) => mockFindActiveDigestForPeriod(...args),
}));

vi.mock("@/lib/watch/evidence-mind-digest-data-collector", () => ({
  collectDigestSourceData: (...args: unknown[]) => mockCollectDigestSourceData(...args),
}));

import {
  generateDemoEvidenceMindDigest,
  generateEvidenceMindDigestContent,
  rankHighestDigestRisk,
  recommendedFocusForHighestRisk,
} from "@/lib/watch/evidence-mind-digest-generator";

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

const digestRow = {
  id: "digest-uuid-001",
  workspace_id: "demo-workspace-spa-menu",
  period_start: "2026-05-24T00:00:00.000Z",
  period_end: "2026-05-31T23:59:59.999Z",
  digest_title: "Evidence Mind Digest — May 24 – May 31, 2026",
  digest_summary: "Summary",
  watchlists_checked_count: 3,
  new_alerts_count: 1,
  review_items_count: 1,
  briefs_count: 1,
  affected_claim_families_count: 1,
  affected_client_claims_count: 1,
  highest_risk_implication: "wording_review_recommended",
  recommended_focus: "Review wording for affected mapped claims.",
  status: "ready_for_review",
  created_at: "2026-05-31T12:00:00.000Z",
  updated_at: "2026-05-31T12:00:00.000Z",
};

const sourceWithBrief = {
  watchlists_checked_count: 2,
  alerts: [],
  review_items: [],
  briefs: [
    {
      id: "brief-uuid-001",
      workspace_id: "demo-workspace-spa-menu",
      claim_family: "magnesium_cortisol_stress",
      watchlist_id: "watch-magnesium-cortisol",
      evidence_alert_id: null,
      review_item_id: null,
      brief_title: "Evidence change detected for Magnesium / Stress / Cortisol",
      brief_summary: "Brief summary",
      what_changed: "What changed",
      why_it_matters: "Why it matters",
      evidence_signal: "unclear",
      risk_implication: "wording_review_recommended",
      recommended_action: "review wording",
      safer_wording: null,
      affected_client_claims_count: 1,
      status: "ready_for_review",
      created_at: "2026-05-31T12:00:00.000Z",
      updated_at: "2026-05-31T12:00:00.000Z",
    },
  ],
  brief_claims: [
    {
      brief_id: "brief-uuid-001",
      client_claim_id: "demo-claim-magnesium-stress-001",
      claim_family: "magnesium_cortisol_stress",
      claim_text_snapshot: "Magnesium helps reduce stress.",
    },
  ],
  mappings: [
    {
      client_claim_id: "demo-claim-magnesium-stress-001",
      claim_family: "magnesium_cortisol_stress",
      mapping_status: "active",
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockFindActiveDigestForPeriod.mockResolvedValue({ digest: null });
  mockCollectDigestSourceData.mockResolvedValue(sourceWithBrief);
  mockCreateEvidenceMindDigest.mockResolvedValue({ ok: true, digest: digestRow });
  mockCreateEvidenceMindDigestItemSnapshots.mockResolvedValue({ ok: true, items: [] });
});

describe("evidence-mind-digest-generator", () => {
  it("ranks highest risk implication correctly", () => {
    expect(rankHighestDigestRisk(["monitor", "escalation_recommended", "none"])).toBe(
      "escalation_recommended"
    );
    expect(rankHighestDigestRisk(["wording_review_recommended", "claim_not_supported"])).toBe(
      "claim_not_supported"
    );
  });

  it("maps recommended focus from highest risk", () => {
    expect(recommendedFocusForHighestRisk("claim_not_supported")).toContain("pause");
    expect(recommendedFocusForHighestRisk("none")).toContain("Continue monitoring");
  });

  it("generates digest content summarizing evidence briefs and claim snapshots", () => {
    const content = generateEvidenceMindDigestContent(sourceWithBrief, {
      period_start: "2026-05-24T00:00:00.000Z",
      period_end: "2026-05-31T23:59:59.999Z",
      period_label: "May 24 – May 31, 2026",
    });

    expect(content.digest_title).toContain("Evidence Mind Digest");
    expect(content.briefs_count).toBe(1);
    expect(content.affected_client_claims_count).toBe(1);
    expect(content.highest_risk_implication).toBe("wording_review_recommended");
    expect(content.item_snapshots.some((item) => item.item_type === "evidence_brief")).toBe(true);
    expect(content.item_snapshots.some((item) => item.item_type === "client_claim")).toBe(true);
  });

  it("handles no data without crashing", () => {
    const content = generateEvidenceMindDigestContent(
      {
        watchlists_checked_count: 0,
        alerts: [],
        review_items: [],
        briefs: [],
        brief_claims: [],
        mappings: [],
      },
      {
        period_start: "2026-05-24T00:00:00.000Z",
        period_end: "2026-05-31T23:59:59.999Z",
        period_label: "May 24 – May 31, 2026",
      }
    );

    expect(content.briefs_count).toBe(0);
    expect(content.highest_risk_implication).toBe("none");
    expect(content.digest_summary).toContain("no new watchtower activity");
  });

  it("generates demo digest using collected source data", async () => {
    const result = await generateDemoEvidenceMindDigest(operatorAccess);

    expect(result.ok).toBe(true);
    expect(mockCollectDigestSourceData).toHaveBeenCalled();
    expect(mockCreateEvidenceMindDigest).toHaveBeenCalled();
    expect(mockCreateEvidenceMindDigestItemSnapshots).toHaveBeenCalled();
  });

  it("skips duplicate active digest for same workspace and period", async () => {
    mockFindActiveDigestForPeriod.mockResolvedValueOnce({ digest: digestRow });

    const result = await generateDemoEvidenceMindDigest(operatorAccess);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.duplicate_skipped).toBe(true);
    }
    expect(mockCreateEvidenceMindDigest).not.toHaveBeenCalled();
    expect(mockCreateEvidenceMindDigestItemSnapshots).not.toHaveBeenCalled();
  });

  it("returns existing digest when insert hits duplicate_active_digest race", async () => {
    mockCreateEvidenceMindDigest.mockResolvedValueOnce({
      ok: false,
      error: "duplicate_active_digest",
    });
    mockFindActiveDigestForPeriod
      .mockResolvedValueOnce({ digest: null })
      .mockResolvedValueOnce({ digest: digestRow });

    const result = await generateDemoEvidenceMindDigest(operatorAccess);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.duplicate_skipped).toBe(true);
      expect(result.digest.id).toBe("digest-uuid-001");
    }
    expect(mockCreateEvidenceMindDigestItemSnapshots).not.toHaveBeenCalled();
  });

  it("blocks cross-workspace operator demo generation", async () => {
    const result = await generateDemoEvidenceMindDigest(otherWorkspaceAccess);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("forbidden");
    }
  });

  it("allows break-glass demo generation", async () => {
    const result = await generateDemoEvidenceMindDigest(breakGlassAccess);

    expect(result.ok).toBe(true);
  });
});
