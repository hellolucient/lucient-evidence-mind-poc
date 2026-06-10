import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetEvidenceMindDigestById = vi.fn();
const mockListEvidenceMindDigestItemsForDigest = vi.fn();
const mockFindActiveHandoffForDigest = vi.fn();
const mockCreateExternalMindHandoff = vi.fn();
const mockSendExternalMindHandoffIfEnabled = vi.fn();

const mockGetLatestWatchtowerNarrativeForDigest = vi.fn();
const mockGetLatestWatchtowerNarrativeDiffForNarrative = vi.fn();
const mockGenerateAndStoreWatchtowerNarrativeDiffForNarrative = vi.fn();

vi.mock("@/lib/watch/evidence-mind-watchtower-narrative-generator", () => ({
  getLatestWatchtowerNarrativeForDigest: (...args: unknown[]) =>
    mockGetLatestWatchtowerNarrativeForDigest(...args),
}));

vi.mock("@/lib/watch/evidence-mind-watchtower-narrative-diff-store", () => ({
  getLatestWatchtowerNarrativeDiffForNarrative: (...args: unknown[]) =>
    mockGetLatestWatchtowerNarrativeDiffForNarrative(...args),
}));

vi.mock("@/lib/watch/evidence-mind-watchtower-narrative-diff-generator", () => ({
  generateAndStoreWatchtowerNarrativeDiffForNarrative: (...args: unknown[]) =>
    mockGenerateAndStoreWatchtowerNarrativeDiffForNarrative(...args),
}));

vi.mock("@/lib/watch/evidence-mind-digest-store", () => ({
  getEvidenceMindDigestById: (...args: unknown[]) => mockGetEvidenceMindDigestById(...args),
  listEvidenceMindDigestItemsForDigest: (...args: unknown[]) =>
    mockListEvidenceMindDigestItemsForDigest(...args),
}));

vi.mock("@/lib/watch/external-mind-handoff-store", () => ({
  createExternalMindHandoff: (...args: unknown[]) => mockCreateExternalMindHandoff(...args),
  findActiveHandoffForDigest: (...args: unknown[]) => mockFindActiveHandoffForDigest(...args),
  getExternalMindHandoffById: vi.fn(),
  listExternalMindHandoffs: vi.fn(),
}));

vi.mock("@/lib/watch/external-mind-handoff-sender", () => ({
  sendExternalMindHandoffIfEnabled: (...args: unknown[]) =>
    mockSendExternalMindHandoffIfEnabled(...args),
}));

import { createMindHandoffFromDigest } from "@/lib/watch/external-mind-handoff-creator";

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

const digest = {
  id: "digest-uuid-001",
  workspace_id: "demo-workspace-spa-menu",
  period_start: "2026-05-25T00:00:00.000Z",
  period_end: "2026-05-31T23:59:59.999Z",
  digest_title: "Evidence Mind Digest",
  digest_summary: "Summary",
  watchlists_checked_count: 0,
  new_alerts_count: 0,
  review_items_count: 0,
  briefs_count: 0,
  affected_claim_families_count: 0,
  affected_client_claims_count: 0,
  highest_risk_implication: "none",
  recommended_focus: "Continue monitoring.",
  status: "ready_for_review",
  generation_source: "manual",
  created_at: "2026-05-31T12:00:00.000Z",
  updated_at: "2026-05-31T12:00:00.000Z",
};

const handoff = {
  id: "handoff-uuid-001",
  workspace_id: "demo-workspace-spa-menu",
  digest_id: "digest-uuid-001",
  handoff_type: "digest_summary",
  destination: "test_sink",
  payload_version: "mind_digest_payload_v1",
  status: "ready",
  review_status: "pending_review",
  created_at: "2026-05-31T12:00:00.000Z",
  updated_at: "2026-05-31T12:00:00.000Z",
  sent_at: null,
  payload_json: {
    payload_version: "mind_digest_payload_v1",
    workspace_id: "demo-workspace-spa-menu",
    digest_id: "digest-uuid-001",
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockFindActiveHandoffForDigest.mockResolvedValue({ handoff: null });
  mockGetEvidenceMindDigestById.mockResolvedValue({ digest });
  mockListEvidenceMindDigestItemsForDigest.mockResolvedValue({ items: [] });
  mockCreateExternalMindHandoff.mockResolvedValue({ ok: true, handoff });
  mockSendExternalMindHandoffIfEnabled.mockResolvedValue({
    ok: true,
    sent: false,
    reason: "external_send_disabled",
  });
  mockGetLatestWatchtowerNarrativeForDigest.mockResolvedValue(null);
  mockGetLatestWatchtowerNarrativeDiffForNarrative.mockResolvedValue({ diff: null });
});

const narrative = {
  id: "narrative-uuid-001",
  workspace_id: "demo-workspace-spa-menu",
  digest_id: "digest-uuid-001",
  claim_family: null,
  narrative_type: "digest_interpretation",
  narrative_version: "watchtower_narrative_v1",
  title: "Watchtower Narrative — Evidence Mind Digest",
  summary_text: "Evidence-constrained summary.",
  what_changed_text: "One alert recorded.",
  why_it_matters_text: "Monitor posture based on stored snapshots.",
  operator_focus_text: "Continue monitoring.",
  recommended_next_action_text: "Continue monitoring affected claim families.",
  risk_posture: "monitor",
  confidence_level: "medium",
  source_counts_json: { briefs_count: 1 },
  referenced_entities_json: { claim_families: ["magnesium_cortisol_stress"] },
  generation_method: "deterministic_template",
  generated_at: "2026-05-31T12:30:00.000Z",
  created_at: "2026-05-31T12:30:00.000Z",
  updated_at: "2026-05-31T12:30:00.000Z",
};

const narrativeDiff = {
  id: "diff-uuid-001",
  workspace_id: "demo-workspace-spa-menu",
  current_narrative_id: "narrative-uuid-001",
  previous_narrative_id: "narrative-uuid-000",
  current_digest_id: "digest-uuid-001",
  previous_digest_id: "digest-uuid-000",
  comparison_scope: "workspace_digest_sequence",
  diff_version: "watchtower_narrative_diff_v1",
  interpretation_change_level: "medium",
  risk_posture_change: "decreased",
  operator_focus_change: "changed",
  recommended_action_change: "changed",
  urgency_change: "unchanged",
  change_signals: ["risk_posture_decreased"],
  deterministic_summary: "Risk posture decreased.",
  comparison_method: "deterministic_template",
  metadata_json: { internal_only: true },
  compared_at: "2026-06-07T12:00:00.000Z",
  created_at: "2026-06-07T12:00:00.000Z",
  updated_at: "2026-06-07T12:00:00.000Z",
};

describe("external-mind-handoff-creator", () => {
  it("creates a handoff from digest", async () => {
    const result = await createMindHandoffFromDigest("digest-uuid-001", operatorAccess);

    expect(result.ok).toBe(true);
    expect(mockCreateExternalMindHandoff).toHaveBeenCalled();
    expect(mockSendExternalMindHandoffIfEnabled).toHaveBeenCalled();
    expect(mockGetLatestWatchtowerNarrativeForDigest).toHaveBeenCalled();
  });

  it("creates handoff with pending_review review status", async () => {
    await createMindHandoffFromDigest("digest-uuid-001", operatorAccess);

    expect(mockCreateExternalMindHandoff).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "ready",
      }),
      operatorAccess
    );
  });

  it("skips duplicate active handoff for same digest", async () => {
    mockFindActiveHandoffForDigest.mockResolvedValueOnce({ handoff });

    const result = await createMindHandoffFromDigest("digest-uuid-001", operatorAccess);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.duplicate_skipped).toBe(true);
    }
    expect(mockCreateExternalMindHandoff).not.toHaveBeenCalled();
  });

  it("blocks cross-workspace operator access via digest lookup", async () => {
    mockGetEvidenceMindDigestById.mockResolvedValueOnce({ digest: null, error: "forbidden" });

    const result = await createMindHandoffFromDigest("digest-uuid-001", otherWorkspaceAccess);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("forbidden");
    }
  });

  it("does not fetch diff when no watchtower narrative exists", async () => {
    await createMindHandoffFromDigest("digest-uuid-001", operatorAccess);

    expect(mockGetLatestWatchtowerNarrativeDiffForNarrative).not.toHaveBeenCalled();
    expect(mockGenerateAndStoreWatchtowerNarrativeDiffForNarrative).not.toHaveBeenCalled();
  });

  it("fetches diff only when watchtower narrative exists", async () => {
    mockGetLatestWatchtowerNarrativeForDigest.mockResolvedValueOnce(narrative);
    mockGetLatestWatchtowerNarrativeDiffForNarrative.mockResolvedValueOnce({ diff: narrativeDiff });

    await createMindHandoffFromDigest("digest-uuid-001", operatorAccess);

    expect(mockGetLatestWatchtowerNarrativeDiffForNarrative).toHaveBeenCalledWith(
      {
        current_narrative_id: "narrative-uuid-001",
        comparison_scope: "workspace_digest_sequence",
        diff_version: "watchtower_narrative_diff_v1",
      },
      operatorAccess
    );
    expect(mockGenerateAndStoreWatchtowerNarrativeDiffForNarrative).not.toHaveBeenCalled();
  });

  it("passes watchtowerNarrativeDiff into payload when diff exists", async () => {
    mockGetLatestWatchtowerNarrativeForDigest.mockResolvedValueOnce(narrative);
    mockGetLatestWatchtowerNarrativeDiffForNarrative.mockResolvedValueOnce({ diff: narrativeDiff });

    const result = await createMindHandoffFromDigest("digest-uuid-001", operatorAccess);

    expect(result.ok).toBe(true);
    expect(mockCreateExternalMindHandoff).toHaveBeenCalledWith(
      expect.objectContaining({
        payload_json: expect.objectContaining({
          watchtower_narrative_diff: expect.objectContaining({
            diff_id: "diff-uuid-001",
            deterministic_summary: "Risk posture decreased.",
          }),
        }),
      }),
      operatorAccess
    );
  });

  it("succeeds and omits diff when no diff exists", async () => {
    mockGetLatestWatchtowerNarrativeForDigest.mockResolvedValueOnce(narrative);
    mockGetLatestWatchtowerNarrativeDiffForNarrative.mockResolvedValueOnce({ diff: null });

    const result = await createMindHandoffFromDigest("digest-uuid-001", operatorAccess);

    expect(result.ok).toBe(true);
    const createCall = mockCreateExternalMindHandoff.mock.calls[0]?.[0];
    expect(createCall?.payload_json.watchtower_narrative_diff).toBeUndefined();
  });

  it("succeeds and omits diff when diff lookup errors", async () => {
    mockGetLatestWatchtowerNarrativeForDigest.mockResolvedValueOnce(narrative);
    mockGetLatestWatchtowerNarrativeDiffForNarrative.mockResolvedValueOnce({
      diff: null,
      error: "supabase_not_configured",
    });

    const result = await createMindHandoffFromDigest("digest-uuid-001", operatorAccess);

    expect(result.ok).toBe(true);
    const createCall = mockCreateExternalMindHandoff.mock.calls[0]?.[0];
    expect(createCall?.payload_json.watchtower_narrative_diff).toBeUndefined();
    expect(mockGenerateAndStoreWatchtowerNarrativeDiffForNarrative).not.toHaveBeenCalled();
  });
});
