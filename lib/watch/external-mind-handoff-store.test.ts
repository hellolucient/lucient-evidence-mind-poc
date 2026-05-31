import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockInsert = vi.fn();
const mockInsertSelect = vi.fn();
const mockSelect = vi.fn();
const mockSingle = vi.fn();
const mockMaybeSingle = vi.fn();
const mockUpdate = vi.fn();
const mockFrom = vi.fn();
const mockGetSupabaseEnvConfig = vi.fn();
const mockCreateSupabaseServerClient = vi.fn();

const queryBuilder = {
  eq: vi.fn(),
  in: vi.fn(),
  order: vi.fn(),
  limit: vi.fn(),
  maybeSingle: mockMaybeSingle,
  single: mockSingle,
  select: vi.fn(),
  update: mockUpdate,
};

vi.mock("@/engine/watchlist/supabase-client", () => ({
  getSupabaseEnvConfig: (...args: unknown[]) => mockGetSupabaseEnvConfig(...args),
  createSupabaseServerClient: (...args: unknown[]) => mockCreateSupabaseServerClient(...args),
  EXTERNAL_MIND_HANDOFFS_TABLE: "external_mind_handoffs",
}));

import {
  archiveExternalMindHandoff,
  createExternalMindHandoff,
  findActiveHandoffForDigest,
  getExternalMindHandoffById,
  isPrivacySafeExternalMindHandoffPayload,
  listExternalMindHandoffs,
  recordExternalMindHandoffSendAttempt,
  toPrivacySafeExternalMindHandoff,
} from "@/lib/watch/external-mind-handoff-store";

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

const payload = {
  payload_version: "mind_digest_payload_v1",
  workspace_id: "demo-workspace-spa-menu",
  digest_id: "digest-uuid-001",
  handoff_type: "digest_summary",
  destination: "test_sink",
  period_start: "2026-05-25T00:00:00.000Z",
  period_end: "2026-05-31T23:59:59.999Z",
  digest_title: "Evidence Mind Digest",
  digest_summary: "Summary",
  highest_risk_implication: "monitor",
  recommended_focus: "Continue monitoring.",
  counts: {
    watchlists_checked_count: 0,
    new_alerts_count: 0,
    review_items_count: 0,
    briefs_count: 0,
    affected_claim_families_count: 0,
    affected_client_claims_count: 0,
  },
  items: [],
  affected_claim_families: [],
  affected_client_claims: [],
  referenced_evidence_briefs: [],
  referenced_review_items: [],
  generated_at: "2026-05-31T12:00:00.000Z",
  source_system: "lucient_evidence_mind",
  phase: "31",
};

const handoffRow = {
  id: "handoff-uuid-001",
  workspace_id: "demo-workspace-spa-menu",
  digest_id: "digest-uuid-001",
  handoff_type: "digest_summary",
  destination: "test_sink",
  payload_version: "mind_digest_payload_v1",
  payload_json: payload,
  status: "ready",
  created_at: "2026-05-31T12:00:00.000Z",
  updated_at: "2026-05-31T12:00:00.000Z",
  sent_at: null,
  error_message: null,
  send_attempted_at: null,
  send_result_json: null,
};

function setupSupabaseMocks() {
  queryBuilder.eq.mockReturnValue(queryBuilder);
  queryBuilder.in.mockReturnValue(queryBuilder);
  queryBuilder.order.mockReturnValue(queryBuilder);
  queryBuilder.limit.mockReturnValue(queryBuilder);
  queryBuilder.select.mockReturnValue(queryBuilder);
  mockUpdate.mockReturnValue(queryBuilder);
  mockFrom.mockReturnValue({
    insert: mockInsert,
    select: mockSelect,
    update: mockUpdate,
  });
  mockInsert.mockReturnValue({
    select: mockInsertSelect,
  });
  mockInsertSelect.mockReturnValue({
    single: mockSingle,
  });
  mockSelect.mockReturnValue(queryBuilder);
  mockSingle.mockResolvedValue({ data: handoffRow, error: null });
  mockMaybeSingle.mockResolvedValue({ data: handoffRow, error: null });
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

describe("external-mind-handoff-store", () => {
  it("creates an external Mind handoff", async () => {
    const result = await createExternalMindHandoff(
      {
        workspace_id: "demo-workspace-spa-menu",
        digest_id: "digest-uuid-001",
        handoff_type: "digest_summary",
        destination: "test_sink",
        payload_version: "mind_digest_payload_v1",
        payload_json: payload,
      },
      operatorAccess
    );

    expect(result.ok).toBe(true);
    expect(mockInsert).toHaveBeenCalled();
  });

  it("lists handoffs scoped to operator workspaces", async () => {
    queryBuilder.order.mockResolvedValueOnce({ data: [handoffRow], error: null });

    await listExternalMindHandoffs(operatorAccess);

    expect(queryBuilder.in).toHaveBeenCalledWith("workspace_id", ["demo-workspace-spa-menu"]);
  });

  it("blocks cross-workspace operator create", async () => {
    const result = await createExternalMindHandoff(
      {
        workspace_id: "demo-workspace-spa-menu",
        digest_id: "digest-uuid-001",
        handoff_type: "digest_summary",
        destination: "test_sink",
        payload_version: "mind_digest_payload_v1",
        payload_json: payload,
      },
      otherWorkspaceAccess
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("forbidden");
    }
  });

  it("gets handoff by id with payload", async () => {
    const result = await getExternalMindHandoffById("handoff-uuid-001", operatorAccess);

    expect(result.handoff?.payload_json.payload_version).toBe("mind_digest_payload_v1");
  });

  it("finds active handoff for digest", async () => {
    const result = await findActiveHandoffForDigest(
      "digest-uuid-001",
      "test_sink",
      "mind_digest_payload_v1",
      operatorAccess
    );

    expect(result.handoff?.id).toBe("handoff-uuid-001");
    expect(queryBuilder.in).toHaveBeenCalledWith("status", ["draft", "ready"]);
  });

  it("returns duplicate_active_handoff when unique index rejects insert", async () => {
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: {
        code: "23505",
        message:
          'duplicate key value violates unique constraint "external_mind_handoffs_active_digest_destination_version_idx"',
      },
    });

    const result = await createExternalMindHandoff(
      {
        workspace_id: "demo-workspace-spa-menu",
        digest_id: "digest-uuid-001",
        handoff_type: "digest_summary",
        destination: "test_sink",
        payload_version: "mind_digest_payload_v1",
        payload_json: payload,
      },
      operatorAccess
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("duplicate_active_handoff");
    }
  });

  it("archives a handoff", async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: handoffRow, error: null });
    mockSingle.mockResolvedValueOnce({ data: { ...handoffRow, status: "archived" }, error: null });

    const result = await archiveExternalMindHandoff("handoff-uuid-001", operatorAccess);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.handoff.status).toBe("archived");
    }
  });

  it("allows break-glass to list handoffs without workspace filter", async () => {
    queryBuilder.order.mockResolvedValueOnce({ data: [handoffRow], error: null });

    await listExternalMindHandoffs(breakGlassAccess);

    expect(queryBuilder.in).not.toHaveBeenCalled();
  });

  it("returns privacy-safe handoff payloads without payload_json", () => {
    const safe = toPrivacySafeExternalMindHandoff(handoffRow);
    expect(isPrivacySafeExternalMindHandoffPayload(safe as unknown as Record<string, unknown>)).toBe(
      true
    );
    expect("payload_json" in safe).toBe(false);
  });

  it("records test sink send attempt with sent status and send result metadata", async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: handoffRow, error: null });
    mockSingle.mockResolvedValueOnce({
      data: {
        ...handoffRow,
        status: "sent",
        sent_at: "2026-05-31T13:00:00.000Z",
        send_attempted_at: "2026-05-31T13:00:00.000Z",
        send_result_json: {
          result: "test_sink_sent",
          destination: "test_sink",
          payload_version: "mind_digest_payload_v1",
          timestamp: "2026-05-31T13:00:00.000Z",
          test_sink_only: true,
        },
      },
      error: null,
    });

    const result = await recordExternalMindHandoffSendAttempt("handoff-uuid-001", operatorAccess, {
      status: "sent",
      sent_at: "2026-05-31T13:00:00.000Z",
      send_attempted_at: "2026-05-31T13:00:00.000Z",
      send_result_json: {
        result: "test_sink_sent",
        destination: "test_sink",
        payload_version: "mind_digest_payload_v1",
        timestamp: "2026-05-31T13:00:00.000Z",
        test_sink_only: true,
      },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.handoff.status).toBe("sent");
      expect(result.handoff.sent_at).toBe("2026-05-31T13:00:00.000Z");
      expect(result.handoff.send_result_json?.result).toBe("test_sink_sent");
    }
  });
});
