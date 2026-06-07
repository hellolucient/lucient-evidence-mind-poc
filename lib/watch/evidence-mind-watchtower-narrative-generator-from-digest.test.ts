import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetEvidenceMindDigestById = vi.fn();
const mockListEvidenceMindDigestItemsForDigest = vi.fn();
const mockFindWatchtowerNarrativeForDigest = vi.fn();
const mockCreateWatchtowerNarrative = vi.fn();
const mockGenerateAndStoreWatchtowerNarrativeDiffForNarrative = vi.fn();

vi.mock("@/lib/watch/evidence-mind-digest-store", () => ({
  getEvidenceMindDigestById: (...args: unknown[]) => mockGetEvidenceMindDigestById(...args),
  listEvidenceMindDigestItemsForDigest: (...args: unknown[]) =>
    mockListEvidenceMindDigestItemsForDigest(...args),
}));

vi.mock("@/lib/watch/evidence-mind-watchtower-narrative-store", () => ({
  createWatchtowerNarrative: (...args: unknown[]) => mockCreateWatchtowerNarrative(...args),
  findWatchtowerNarrativeForDigest: (...args: unknown[]) =>
    mockFindWatchtowerNarrativeForDigest(...args),
  findPreviousWatchtowerNarrativeInWorkspace: vi.fn(),
  getWatchtowerNarrativeById: vi.fn(),
}));

vi.mock("@/lib/watch/evidence-mind-watchtower-narrative-diff-generator", () => ({
  generateAndStoreWatchtowerNarrativeDiffForNarrative: (...args: unknown[]) =>
    mockGenerateAndStoreWatchtowerNarrativeDiffForNarrative(...args),
  watchtowerNarrativeDiffGenerationErrorMessage: (error: string) =>
    `Unable to generate watchtower narrative diff: ${error}`,
}));

import { generateWatchtowerNarrativeFromDigest } from "@/lib/watch/evidence-mind-watchtower-narrative-generator";

const operatorAccess = {
  authorized: true,
  mode: "operator" as const,
  userId: "user-123",
  workspaceIds: ["demo-workspace-spa-menu"],
};

const digest = {
  id: "digest-uuid-001",
  workspace_id: "demo-workspace-spa-menu",
  period_start: "2026-05-25T00:00:00.000Z",
  period_end: "2026-05-31T23:59:59.999Z",
  digest_title: "Evidence Mind Digest",
  digest_summary: "During the period, one alert and one brief were recorded.",
  watchlists_checked_count: 2,
  new_alerts_count: 1,
  review_items_count: 1,
  briefs_count: 1,
  affected_claim_families_count: 1,
  affected_client_claims_count: 1,
  highest_risk_implication: "monitor",
  recommended_focus: "No immediate action required. Continue monitoring.",
  status: "ready_for_review",
  generation_source: "manual",
  created_at: "2026-05-31T12:00:00.000Z",
  updated_at: "2026-05-31T12:00:00.000Z",
};

const items = [
  {
    digest_id: "digest-uuid-001",
    workspace_id: "demo-workspace-spa-menu",
    item_type: "evidence_brief",
    item_ref_id: "brief-uuid-001",
    claim_family: "magnesium_cortisol_stress",
    client_claim_id: null,
    title_snapshot: "Evidence change detected",
    summary_snapshot: "Brief summary",
    risk_implication: "monitor",
    recommended_action: "monitor only",
    created_at: "2026-05-31T12:00:00.000Z",
  },
];

const narrative = {
  id: "narrative-uuid-001",
  workspace_id: "demo-workspace-spa-menu",
  digest_id: "digest-uuid-001",
  claim_family: null,
  narrative_type: "digest_interpretation" as const,
  narrative_version: "watchtower_narrative_v1",
  title: "Watchtower Narrative — Evidence Mind Digest",
  summary_text: "Evidence-constrained summary.",
  what_changed_text: "One evidence alert was recorded.",
  why_it_matters_text: "Monitor posture based on stored snapshots.",
  operator_focus_text: digest.recommended_focus,
  recommended_next_action_text: "Continue monitoring affected claim families.",
  risk_posture: "monitor" as const,
  confidence_level: "medium" as const,
  source_counts_json: { briefs_count: 1 },
  referenced_entities_json: { claim_families: ["magnesium_cortisol_stress"] },
  generation_method: "deterministic_template" as const,
  generated_at: "2026-05-31T12:30:00.000Z",
  created_at: "2026-05-31T12:30:00.000Z",
  updated_at: "2026-05-31T12:30:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetEvidenceMindDigestById.mockResolvedValue({ digest });
  mockListEvidenceMindDigestItemsForDigest.mockResolvedValue({ items });
  mockFindWatchtowerNarrativeForDigest.mockResolvedValue({ narrative: null });
  mockCreateWatchtowerNarrative.mockResolvedValue({ ok: true, narrative });
  mockGenerateAndStoreWatchtowerNarrativeDiffForNarrative.mockResolvedValue({
    ok: true,
    diff: {
      id: "diff-uuid-001",
      change_signals: ["no_prior_narrative"],
    },
  });
});

describe("generateWatchtowerNarrativeFromDigest diff wiring", () => {
  it("invokes diff generator once after a new narrative is created", async () => {
    const result = await generateWatchtowerNarrativeFromDigest("digest-uuid-001", operatorAccess);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.narrative.id).toBe("narrative-uuid-001");
      expect(result.watchtower_narrative_diff_result?.diff_id).toBe("diff-uuid-001");
      expect(result.duplicate_skipped).toBeUndefined();
    }
    expect(mockGenerateAndStoreWatchtowerNarrativeDiffForNarrative).toHaveBeenCalledTimes(1);
    expect(mockGenerateAndStoreWatchtowerNarrativeDiffForNarrative).toHaveBeenCalledWith({
      currentNarrative: narrative,
      access: operatorAccess,
    });
  });

  it("does not invoke diff generator when duplicate narrative is skipped", async () => {
    mockFindWatchtowerNarrativeForDigest.mockResolvedValueOnce({ narrative });

    const result = await generateWatchtowerNarrativeFromDigest("digest-uuid-001", operatorAccess);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.duplicate_skipped).toBe(true);
      expect(result.watchtower_narrative_diff_result).toBeUndefined();
      expect(result.diff_warning).toBeUndefined();
    }
    expect(mockCreateWatchtowerNarrative).not.toHaveBeenCalled();
    expect(mockGenerateAndStoreWatchtowerNarrativeDiffForNarrative).not.toHaveBeenCalled();
  });

  it("does not invoke diff generator when create returns duplicate_skipped", async () => {
    mockCreateWatchtowerNarrative.mockResolvedValueOnce({
      ok: false,
      error: "duplicate_active_narrative",
    });
    mockFindWatchtowerNarrativeForDigest
      .mockResolvedValueOnce({ narrative: null })
      .mockResolvedValueOnce({ narrative });

    const result = await generateWatchtowerNarrativeFromDigest("digest-uuid-001", operatorAccess);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.duplicate_skipped).toBe(true);
    }
    expect(mockGenerateAndStoreWatchtowerNarrativeDiffForNarrative).not.toHaveBeenCalled();
  });

  it("still succeeds when diff generation fails", async () => {
    mockGenerateAndStoreWatchtowerNarrativeDiffForNarrative.mockResolvedValueOnce({
      ok: false,
      error: "evidence_mind_watchtower_narrative_diffs_table_missing",
    });

    const result = await generateWatchtowerNarrativeFromDigest("digest-uuid-001", operatorAccess);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.narrative.id).toBe("narrative-uuid-001");
      expect(result.watchtower_narrative_diff_result).toBeUndefined();
      expect(result.diff_warning?.error).toBe(
        "evidence_mind_watchtower_narrative_diffs_table_missing"
      );
    }
  });
});
