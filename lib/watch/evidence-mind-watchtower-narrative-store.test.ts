import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockInsert = vi.fn();
const mockInsertSelect = vi.fn();
const mockSelect = vi.fn();
const mockSingle = vi.fn();
const mockMaybeSingle = vi.fn();
const mockFrom = vi.fn();
const mockGetSupabaseEnvConfig = vi.fn();
const mockCreateSupabaseServerClient = vi.fn();

const queryBuilder = {
  eq: vi.fn(),
  order: vi.fn(),
  limit: vi.fn(),
  maybeSingle: mockMaybeSingle,
  single: mockSingle,
  select: vi.fn(),
};

vi.mock("@/engine/watchlist/supabase-client", () => ({
  getSupabaseEnvConfig: (...args: unknown[]) => mockGetSupabaseEnvConfig(...args),
  createSupabaseServerClient: (...args: unknown[]) => mockCreateSupabaseServerClient(...args),
  EVIDENCE_MIND_WATCHTOWER_NARRATIVES_TABLE: "evidence_mind_watchtower_narratives",
}));

import {
  createWatchtowerNarrative,
  findWatchtowerNarrativeForDigest,
  isPrivacySafeWatchtowerNarrativePayload,
  toPrivacySafeWatchtowerNarrative,
} from "@/lib/watch/evidence-mind-watchtower-narrative-store";

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

const narrativeRow = {
  id: "narrative-uuid-001",
  workspace_id: "demo-workspace-spa-menu",
  digest_id: "digest-uuid-001",
  claim_family: null,
  narrative_type: "digest_interpretation",
  narrative_version: "watchtower_narrative_v1",
  title: "Watchtower Narrative — Evidence Mind Digest",
  summary_text: "Summary",
  what_changed_text: "What changed",
  why_it_matters_text: "Why it matters",
  operator_focus_text: "Continue monitoring.",
  recommended_next_action_text: "Continue monitoring.",
  risk_posture: "monitor",
  confidence_level: "medium",
  source_counts_json: { briefs_count: 1 },
  referenced_entities_json: { claim_families: ["magnesium_cortisol_stress"] },
  generation_method: "deterministic_template",
  generated_at: "2026-05-31T12:30:00.000Z",
  created_at: "2026-05-31T12:30:00.000Z",
  updated_at: "2026-05-31T12:30:00.000Z",
};

function setupSupabaseMocks() {
  queryBuilder.eq.mockReturnValue(queryBuilder);
  queryBuilder.order.mockReturnValue(queryBuilder);
  queryBuilder.limit.mockReturnValue(queryBuilder);
  queryBuilder.select.mockReturnValue(queryBuilder);
  mockFrom.mockReturnValue({
    insert: mockInsert,
    select: mockSelect,
  });
  mockInsert.mockReturnValue({
    select: mockInsertSelect,
  });
  mockInsertSelect.mockReturnValue({
    single: mockSingle,
  });
  mockSelect.mockReturnValue(queryBuilder);
  mockSingle.mockResolvedValue({ data: narrativeRow, error: null });
  mockMaybeSingle.mockResolvedValue({ data: narrativeRow, error: null });
  mockCreateSupabaseServerClient.mockReturnValue({
    from: mockFrom,
  });
  mockGetSupabaseEnvConfig.mockReturnValue({
    hasSupabaseUrl: true,
    hasSupabaseServiceRoleKey: true,
  });
}

beforeEach(() => {
  setupSupabaseMocks();
});

afterEach(() => {
  vi.clearAllMocks();
  setupSupabaseMocks();
});

describe("evidence-mind-watchtower-narrative-store", () => {
  it("creates a watchtower narrative", async () => {
    const result = await createWatchtowerNarrative(
      {
        workspace_id: "demo-workspace-spa-menu",
        digest_id: "digest-uuid-001",
        narrative_type: "digest_interpretation",
        narrative_version: "watchtower_narrative_v1",
        title: "Watchtower Narrative — Evidence Mind Digest",
        summary_text: "Summary",
        what_changed_text: "What changed",
        why_it_matters_text: "Why it matters",
        operator_focus_text: "Continue monitoring.",
        recommended_next_action_text: "Continue monitoring.",
        risk_posture: "monitor",
        confidence_level: "medium",
        generation_method: "deterministic_template",
      },
      operatorAccess
    );

    expect(result.ok).toBe(true);
    expect(mockInsert).toHaveBeenCalled();
  });

  it("finds narrative for digest", async () => {
    const result = await findWatchtowerNarrativeForDigest(
      "digest-uuid-001",
      "digest_interpretation",
      "watchtower_narrative_v1",
      operatorAccess
    );

    expect(result.narrative?.id).toBe("narrative-uuid-001");
  });

  it("blocks cross-workspace create", async () => {
    const result = await createWatchtowerNarrative(
      {
        workspace_id: "demo-workspace-spa-menu",
        digest_id: "digest-uuid-001",
        narrative_type: "digest_interpretation",
        narrative_version: "watchtower_narrative_v1",
        title: "Watchtower Narrative",
        summary_text: "Summary",
        risk_posture: "monitor",
        generation_method: "deterministic_template",
      },
      otherWorkspaceAccess
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("forbidden");
    }
  });

  it("returns duplicate_active_narrative when unique index rejects insert", async () => {
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: {
        code: "23505",
        message:
          'duplicate key value violates unique constraint "evidence_mind_watchtower_narratives_digest_type_version_idx"',
      },
    });

    const result = await createWatchtowerNarrative(
      {
        workspace_id: "demo-workspace-spa-menu",
        digest_id: "digest-uuid-001",
        narrative_type: "digest_interpretation",
        narrative_version: "watchtower_narrative_v1",
        title: "Watchtower Narrative",
        summary_text: "Summary",
        risk_posture: "monitor",
        generation_method: "deterministic_template",
      },
      operatorAccess
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("duplicate_active_narrative");
    }
  });

  it("returns privacy-safe narrative payloads without json blobs", () => {
    const safe = toPrivacySafeWatchtowerNarrative(narrativeRow);
    const listSafe = { ...safe };
    delete (listSafe as { source_counts_json?: unknown }).source_counts_json;
    delete (listSafe as { referenced_entities_json?: unknown }).referenced_entities_json;

    expect(isPrivacySafeWatchtowerNarrativePayload(listSafe as unknown as Record<string, unknown>)).toBe(
      true
    );
  });
});
