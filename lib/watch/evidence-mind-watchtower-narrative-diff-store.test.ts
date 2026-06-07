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
  EVIDENCE_MIND_WATCHTOWER_NARRATIVE_DIFFS_TABLE: "evidence_mind_watchtower_narrative_diffs",
}));

import {
  createWatchtowerNarrativeDiff,
  findWatchtowerNarrativeDiffForCurrentNarrative,
  getLatestWatchtowerNarrativeDiffForNarrative,
} from "@/lib/watch/evidence-mind-watchtower-narrative-diff-store";

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

const diffRow = {
  id: "diff-uuid-001",
  workspace_id: "demo-workspace-spa-menu",
  current_narrative_id: "narrative-current-001",
  previous_narrative_id: "narrative-previous-001",
  current_digest_id: "digest-current-001",
  previous_digest_id: "digest-previous-001",
  comparison_scope: "workspace_digest_sequence",
  diff_version: "watchtower_narrative_diff_v1",
  interpretation_change_level: "medium",
  risk_posture_change: "unchanged",
  operator_focus_change: "changed",
  recommended_action_change: "unchanged",
  urgency_change: "unchanged",
  change_signals_json: ["operator_focus_changed"],
  deterministic_summary: "Operator focus changed since the prior digest narrative.",
  comparison_method: "deterministic_template",
  metadata_json: { compared_at: "2026-06-07T12:00:00.000Z" },
  compared_at: "2026-06-07T12:00:00.000Z",
  created_at: "2026-06-07T12:00:00.000Z",
  updated_at: "2026-06-07T12:00:00.000Z",
};

const diffInsertInput = {
  workspace_id: "demo-workspace-spa-menu",
  current_narrative_id: "narrative-current-001",
  previous_narrative_id: "narrative-previous-001",
  current_digest_id: "digest-current-001",
  previous_digest_id: "digest-previous-001",
  comparison_scope: "workspace_digest_sequence" as const,
  diff_version: "watchtower_narrative_diff_v1" as const,
  interpretation_change_level: "medium" as const,
  risk_posture_change: "unchanged" as const,
  operator_focus_change: "changed" as const,
  recommended_action_change: "unchanged" as const,
  urgency_change: "unchanged" as const,
  change_signals_json: ["operator_focus_changed" as const],
  deterministic_summary: "Operator focus changed since the prior digest narrative.",
  comparison_method: "deterministic_template" as const,
  metadata_json: { compared_at: "2026-06-07T12:00:00.000Z" },
  compared_at: "2026-06-07T12:00:00.000Z",
};

const lookupInput = {
  current_narrative_id: "narrative-current-001",
  comparison_scope: "workspace_digest_sequence" as const,
  diff_version: "watchtower_narrative_diff_v1" as const,
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
  mockSingle.mockResolvedValue({ data: diffRow, error: null });
  mockMaybeSingle.mockResolvedValue({ data: diffRow, error: null });
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

describe("evidence-mind-watchtower-narrative-diff-store", () => {
  it("creates a watchtower narrative diff", async () => {
    const result = await createWatchtowerNarrativeDiff(diffInsertInput, operatorAccess);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.diff.id).toBe("diff-uuid-001");
      expect(result.duplicate_skipped).toBeUndefined();
    }
    expect(mockInsert).toHaveBeenCalled();
  });

  it("returns duplicate_skipped when unique index rejects insert", async () => {
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: {
        code: "23505",
        message:
          'duplicate key value violates unique constraint "evidence_mind_watchtower_narrative_diffs_current_scope_version_idx"',
      },
    });

    const result = await createWatchtowerNarrativeDiff(diffInsertInput, operatorAccess);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.duplicate_skipped).toBe(true);
      expect(result.diff.id).toBe("diff-uuid-001");
    }
  });

  it("finds diff by current narrative id", async () => {
    const result = await findWatchtowerNarrativeDiffForCurrentNarrative(
      lookupInput,
      operatorAccess
    );

    expect(result.diff?.id).toBe("diff-uuid-001");
    expect(result.diff?.current_narrative_id).toBe("narrative-current-001");
  });

  it("returns latest diff ordered by compared_at and created_at", async () => {
    const latestRow = {
      ...diffRow,
      id: "diff-uuid-latest",
      compared_at: "2026-06-07T13:00:00.000Z",
    };
    mockMaybeSingle.mockResolvedValueOnce({ data: latestRow, error: null });

    const result = await getLatestWatchtowerNarrativeDiffForNarrative(
      lookupInput,
      operatorAccess
    );

    expect(result.diff?.id).toBe("diff-uuid-latest");
    expect(queryBuilder.order).toHaveBeenCalledWith("compared_at", { ascending: false });
    expect(queryBuilder.order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(queryBuilder.limit).toHaveBeenCalledWith(1);
  });

  it("blocks cross-workspace create", async () => {
    const result = await createWatchtowerNarrativeDiff(diffInsertInput, otherWorkspaceAccess);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("forbidden");
    }
  });

  it("returns forbidden for lookup in inaccessible workspace", async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: {
        ...diffRow,
        workspace_id: "demo-workspace-spa-menu",
      },
      error: null,
    });

    const result = await findWatchtowerNarrativeDiffForCurrentNarrative(
      lookupInput,
      otherWorkspaceAccess
    );

    expect(result.diff).toBeNull();
    expect(result.error).toBe("forbidden");
  });

  it("normalizes insert errors", async () => {
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: {
        code: "42P01",
        message: 'relation "evidence_mind_watchtower_narrative_diffs" does not exist',
      },
    });

    const result = await createWatchtowerNarrativeDiff(diffInsertInput, operatorAccess);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("evidence_mind_watchtower_narrative_diffs_table_missing");
    }
  });
});
