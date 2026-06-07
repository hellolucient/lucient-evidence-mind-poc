import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFindPreviousWatchtowerNarrativeInWorkspace = vi.fn();
const mockCreateWatchtowerNarrativeDiff = vi.fn();

vi.mock("@/lib/watch/evidence-mind-watchtower-narrative-store", () => ({
  findPreviousWatchtowerNarrativeInWorkspace: (...args: unknown[]) =>
    mockFindPreviousWatchtowerNarrativeInWorkspace(...args),
}));

vi.mock("@/lib/watch/evidence-mind-watchtower-narrative-diff-store", () => ({
  createWatchtowerNarrativeDiff: (...args: unknown[]) =>
    mockCreateWatchtowerNarrativeDiff(...args),
}));

import { generateAndStoreWatchtowerNarrativeDiffForNarrative } from "@/lib/watch/evidence-mind-watchtower-narrative-diff-generator";
import type { PrivacySafeWatchtowerNarrative } from "@/lib/watch/evidence-mind-watchtower-narrative-store";

const operatorAccess = {
  authorized: true,
  mode: "operator" as const,
  userId: "user-123",
  workspaceIds: ["demo-workspace-spa-menu"],
};

const COMPARED_AT = "2026-06-07T12:00:00.000Z";

function buildNarrative(
  overrides: Partial<PrivacySafeWatchtowerNarrative> = {}
): PrivacySafeWatchtowerNarrative {
  return {
    id: "narrative-current-001",
    workspace_id: "demo-workspace-spa-menu",
    digest_id: "digest-current-001",
    claim_family: null,
    narrative_type: "digest_interpretation",
    narrative_version: "watchtower_narrative_v1",
    title: "Watchtower Narrative — Evidence Mind Digest",
    summary_text: "Evidence-constrained summary for current digest.",
    what_changed_text: "One evidence alert was recorded.",
    why_it_matters_text: "Monitor posture based on stored snapshots.",
    operator_focus_text: "Continue monitoring affected claim families.",
    recommended_next_action_text:
      "Continue monitoring affected claim families and re-check after the next watch cycle.",
    risk_posture: "monitor",
    confidence_level: "medium",
    source_counts_json: {
      watchlists_checked_count: 2,
      new_alerts_count: 1,
      review_items_count: 1,
      briefs_count: 1,
      affected_claim_families_count: 1,
      affected_client_claims_count: 1,
    },
    referenced_entities_json: {
      claim_families: ["magnesium_cortisol_stress"],
    },
    generation_method: "deterministic_template",
    generated_at: "2026-06-07T12:00:00.000Z",
    created_at: "2026-06-07T12:00:00.000Z",
    updated_at: "2026-06-07T12:00:00.000Z",
    ...overrides,
  };
}

const previousNarrative = buildNarrative({
  id: "narrative-previous-001",
  digest_id: "digest-previous-001",
  generated_at: "2026-06-06T12:00:00.000Z",
  created_at: "2026-06-06T12:00:00.000Z",
});

const diffRow = {
  id: "diff-uuid-001",
  workspace_id: "demo-workspace-spa-menu",
  current_narrative_id: "narrative-current-001",
  previous_narrative_id: null,
  current_digest_id: "digest-current-001",
  previous_digest_id: null,
  comparison_scope: "workspace_digest_sequence" as const,
  diff_version: "watchtower_narrative_diff_v1" as const,
  interpretation_change_level: "none" as const,
  risk_posture_change: "not_applicable" as const,
  operator_focus_change: "not_applicable" as const,
  recommended_action_change: "not_applicable" as const,
  urgency_change: "unchanged" as const,
  change_signals: ["no_prior_narrative" as const],
  deterministic_summary:
    "No prior watchtower narrative exists for this workspace. This is the first digest interpretation in the current sequence.",
  comparison_method: "deterministic_template" as const,
  metadata_json: { compared_at: COMPARED_AT },
  compared_at: COMPARED_AT,
  created_at: COMPARED_AT,
  updated_at: COMPARED_AT,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockFindPreviousWatchtowerNarrativeInWorkspace.mockResolvedValue({ narrative: null });
  mockCreateWatchtowerNarrativeDiff.mockResolvedValue({ ok: true, diff: diffRow });
});

describe("evidence-mind-watchtower-narrative-diff-generator", () => {
  it("creates a diff with no_prior_narrative for the first narrative", async () => {
    const currentNarrative = buildNarrative();

    const result = await generateAndStoreWatchtowerNarrativeDiffForNarrative({
      currentNarrative,
      access: operatorAccess,
      comparedAt: COMPARED_AT,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.diff.change_signals).toContain("no_prior_narrative");
    }

    expect(mockFindPreviousWatchtowerNarrativeInWorkspace).toHaveBeenCalledWith(
      {
        workspace_id: "demo-workspace-spa-menu",
        current_narrative_id: "narrative-current-001",
        narrative_type: "digest_interpretation",
        narrative_version: "watchtower_narrative_v1",
        generated_at: "2026-06-07T12:00:00.000Z",
      },
      operatorAccess
    );

    expect(mockCreateWatchtowerNarrativeDiff).toHaveBeenCalledWith(
      expect.objectContaining({
        workspace_id: "demo-workspace-spa-menu",
        current_narrative_id: "narrative-current-001",
        previous_narrative_id: null,
        current_digest_id: "digest-current-001",
        previous_digest_id: null,
        change_signals_json: ["no_prior_narrative"],
        compared_at: COMPARED_AT,
      }),
      operatorAccess
    );
  });

  it("finds previous narrative and stores comparison for second narrative", async () => {
    mockFindPreviousWatchtowerNarrativeInWorkspace.mockResolvedValueOnce({
      narrative: previousNarrative,
    });
    mockCreateWatchtowerNarrativeDiff.mockResolvedValueOnce({
      ok: true,
      diff: {
        ...diffRow,
        previous_narrative_id: "narrative-previous-001",
        previous_digest_id: "digest-previous-001",
        change_signals: ["no_material_change"],
        interpretation_change_level: "none",
        risk_posture_change: "unchanged",
        operator_focus_change: "unchanged",
        recommended_action_change: "unchanged",
      },
    });

    const currentNarrative = buildNarrative();
    const result = await generateAndStoreWatchtowerNarrativeDiffForNarrative({
      currentNarrative,
      access: operatorAccess,
      comparedAt: COMPARED_AT,
    });

    expect(result.ok).toBe(true);
    expect(mockCreateWatchtowerNarrativeDiff).toHaveBeenCalledWith(
      expect.objectContaining({
        previous_narrative_id: "narrative-previous-001",
        previous_digest_id: "digest-previous-001",
        change_signals_json: ["no_material_change"],
      }),
      operatorAccess
    );
  });

  it("returns duplicate_skipped when diff store reports duplicate", async () => {
    mockCreateWatchtowerNarrativeDiff.mockResolvedValueOnce({
      ok: true,
      diff: diffRow,
      duplicate_skipped: true,
    });

    const result = await generateAndStoreWatchtowerNarrativeDiffForNarrative({
      currentNarrative: buildNarrative(),
      access: operatorAccess,
      comparedAt: COMPARED_AT,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.duplicate_skipped).toBe(true);
    }
  });

  it("returns ok false when previous lookup fails", async () => {
    mockFindPreviousWatchtowerNarrativeInWorkspace.mockResolvedValueOnce({
      narrative: null,
      error: "forbidden",
    });

    const result = await generateAndStoreWatchtowerNarrativeDiffForNarrative({
      currentNarrative: buildNarrative(),
      access: operatorAccess,
      comparedAt: COMPARED_AT,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("forbidden");
    }
    expect(mockCreateWatchtowerNarrativeDiff).not.toHaveBeenCalled();
  });

  it("returns ok false when diff store fails", async () => {
    mockCreateWatchtowerNarrativeDiff.mockResolvedValueOnce({
      ok: false,
      error: "evidence_mind_watchtower_narrative_diffs_table_missing",
    });

    const result = await generateAndStoreWatchtowerNarrativeDiffForNarrative({
      currentNarrative: buildNarrative(),
      access: operatorAccess,
      comparedAt: COMPARED_AT,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("evidence_mind_watchtower_narrative_diffs_table_missing");
    }
  });

  it("scopes previous lookup to the current narrative workspace", async () => {
    await generateAndStoreWatchtowerNarrativeDiffForNarrative({
      currentNarrative: buildNarrative(),
      access: operatorAccess,
      comparedAt: COMPARED_AT,
    });

    expect(mockFindPreviousWatchtowerNarrativeInWorkspace).toHaveBeenCalledWith(
      expect.objectContaining({
        workspace_id: "demo-workspace-spa-menu",
      }),
      operatorAccess
    );
  });

  it("produces deterministic store input when comparedAt is fixed", async () => {
    mockFindPreviousWatchtowerNarrativeInWorkspace.mockResolvedValue({
      narrative: previousNarrative,
    });

    const currentNarrative = buildNarrative({
      recommended_next_action_text:
        "Prioritize review of affected claim families and confirm whether wording updates are required.",
    });

    await generateAndStoreWatchtowerNarrativeDiffForNarrative({
      currentNarrative,
      access: operatorAccess,
      comparedAt: COMPARED_AT,
    });
    await generateAndStoreWatchtowerNarrativeDiffForNarrative({
      currentNarrative,
      access: operatorAccess,
      comparedAt: COMPARED_AT,
    });

    expect(mockCreateWatchtowerNarrativeDiff.mock.calls[0]?.[0]).toEqual(
      mockCreateWatchtowerNarrativeDiff.mock.calls[1]?.[0]
    );
  });
});
