import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockInsert = vi.fn();
const mockInsertSelect = vi.fn();
const mockSelect = vi.fn();
const mockSingle = vi.fn();
const mockFrom = vi.fn();
const mockGetSupabaseEnvConfig = vi.fn();
const mockCreateSupabaseServerClient = vi.fn();

const queryBuilder = {
  eq: vi.fn(),
  in: vi.fn(),
  order: vi.fn(),
  select: vi.fn(),
  single: mockSingle,
};

vi.mock("@/engine/watchlist/supabase-client", () => ({
  getSupabaseEnvConfig: (...args: unknown[]) => mockGetSupabaseEnvConfig(...args),
  createSupabaseServerClient: (...args: unknown[]) => mockCreateSupabaseServerClient(...args),
  EXTERNAL_MIND_HANDOFF_SEND_EVENTS_TABLE: "external_mind_handoff_send_events",
}));

import {
  insertExternalMindHandoffSendEvent,
  isPrivacySafeExternalMindHandoffSendEventPayload,
  listExternalMindHandoffSendEventsForHandoff,
  toPrivacySafeExternalMindHandoffSendEvent,
} from "@/lib/watch/external-mind-handoff-send-event-store";

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

const eventRow = {
  id: "event-uuid-001",
  workspace_id: "demo-workspace-spa-menu",
  handoff_id: "handoff-uuid-001",
  digest_id: "digest-uuid-001",
  event_type: "send_succeeded",
  destination: "test_sink",
  payload_version: "mind_digest_payload_v1",
  actor_type: "supabase_operator",
  actor_email: "operator@example.com",
  access_mode: "supabase_operator",
  result: "test_sink_sent",
  status_before: "ready",
  status_after: "sent",
  attempted_at: "2026-05-31T13:00:00.000Z",
  completed_at: "2026-05-31T13:00:00.000Z",
  error_message: null,
  metadata: { transport_kind: "sent" },
  created_at: "2026-05-31T13:00:00.000Z",
};

function setupSupabaseMocks() {
  queryBuilder.eq.mockReturnValue(queryBuilder);
  queryBuilder.in.mockReturnValue(queryBuilder);
  queryBuilder.order.mockReturnValue(queryBuilder);
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
  mockSingle.mockResolvedValue({ data: eventRow, error: null });
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

describe("external-mind-handoff-send-event-store", () => {
  it("creates a privacy-safe send event", async () => {
    const result = await insertExternalMindHandoffSendEvent({
      workspace_id: "demo-workspace-spa-menu",
      handoff_id: "handoff-uuid-001",
      digest_id: "digest-uuid-001",
      event_type: "send_succeeded",
      destination: "test_sink",
      payload_version: "mind_digest_payload_v1",
      actor_type: "supabase_operator",
      actor_email: "operator@example.com",
      access_mode: "supabase_operator",
      result: "test_sink_sent",
      status_before: "ready",
      status_after: "sent",
    });

    expect(result.ok).toBe(true);
    expect(mockInsert).toHaveBeenCalled();
  });

  it("accepts Phase 38C dry-run and config-invalid audit results", async () => {
    for (const resultCode of ["external_dry_run_ok", "external_config_invalid"] as const) {
      const result = await insertExternalMindHandoffSendEvent({
        workspace_id: "demo-workspace-spa-menu",
        handoff_id: "handoff-uuid-001",
        event_type: "send_blocked",
        destination: "animoca_mind",
        actor_type: "supabase_operator",
        access_mode: "supabase_operator",
        result: resultCode,
        status_before: "ready",
        status_after: "ready",
        metadata: {
          transport_mode: resultCode === "external_dry_run_ok" ? "dry_run" : "blocked",
          endpoint_host: "mind.example.com",
        },
      });

      expect(result.ok).toBe(true);
    }
  });

  it("rejects metadata containing sensitive env values", async () => {
    process.env.EXTERNAL_MIND_API_KEY = "secret-key-value";

    const result = await insertExternalMindHandoffSendEvent({
      workspace_id: "demo-workspace-spa-menu",
      handoff_id: "handoff-uuid-001",
      event_type: "send_failed",
      destination: "animoca_mind",
      actor_type: "supabase_operator",
      access_mode: "supabase_operator",
      result: "missing_config",
      metadata: { note: "secret-key-value" },
    });

    delete process.env.EXTERNAL_MIND_API_KEY;

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("metadata_not_privacy_safe");
    }
  });

  it("lists send events scoped to operator workspaces", async () => {
    queryBuilder.order.mockResolvedValueOnce({ data: [eventRow], error: null });

    await listExternalMindHandoffSendEventsForHandoff("handoff-uuid-001", operatorAccess);

    expect(queryBuilder.in).toHaveBeenCalledWith("workspace_id", ["demo-workspace-spa-menu"]);
    expect(queryBuilder.eq).toHaveBeenCalledWith("handoff_id", "handoff-uuid-001");
  });

  it("blocks cross-workspace send event reads", async () => {
    queryBuilder.order.mockResolvedValueOnce({ data: [eventRow], error: null });

    const result = await listExternalMindHandoffSendEventsForHandoff(
      "handoff-uuid-001",
      otherWorkspaceAccess
    );

    expect(result.events).toEqual([]);
  });

  it("returns privacy-safe send event payloads", () => {
    const safe = toPrivacySafeExternalMindHandoffSendEvent(eventRow);
    expect(isPrivacySafeExternalMindHandoffSendEventPayload(safe as unknown as Record<string, unknown>)).toBe(
      true
    );
    expect("actor_email" in safe).toBe(false);
  });
});
