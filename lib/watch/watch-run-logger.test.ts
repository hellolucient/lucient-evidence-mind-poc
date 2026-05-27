import { afterEach, describe, expect, it, vi } from "vitest";

const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockSingle = vi.fn();
const mockFrom = vi.fn();
const mockGetSupabaseEnvConfig = vi.fn();
const mockCreateSupabaseServerClient = vi.fn();

vi.mock("@/engine/watchlist/supabase-client", () => ({
  getSupabaseEnvConfig: (...args: unknown[]) => mockGetSupabaseEnvConfig(...args),
  createSupabaseServerClient: (...args: unknown[]) =>
    mockCreateSupabaseServerClient(...args),
  WATCH_RUNS_TABLE: "watch_runs",
}));

import {
  buildRunDueWatchRunInput,
  isWatchRunLoggingConfigured,
  logWatchRun,
  logWatchRunFailure,
  sanitizeWatchRunErrorMessage,
} from "./watch-run-logger";
import type { RunDueResponse } from "@/lib/watch-run-due";

const sampleRunDue = {
  run_id: "demo-run-1",
  generated_at: "2026-05-27T21:00:00.000Z",
  mode: "scheduled_watch_simulation",
  force: false,
  dry_run: false,
  watches_found: 1,
  watches_run: 0,
  watches_skipped: 1,
  results: [
    {
      watch_topic_id: "watch-1",
      claim_family: "claim-1",
      status: "skipped",
      previous_known_pmids_count: 1,
      current_known_pmids_count: 1,
      new_pmids: [],
      query_hash: "hash",
      query_version: "v1",
      evidence_delta: {
        change_level: "none",
        direction: "no_change",
        delta_summary: "skipped",
        delta_confidence: 1,
        contributing_sources_to_delta: [],
        non_contributing_sources: [],
        alert_reason_codes: [],
        alert_threshold_explanation: "skipped",
      },
      evidence_change_alert: {
        alert_required: false,
        alert_type: "none",
        affected_claim_family_id: "claim-1",
        affected_workspace_ids_visible_to_mind: false,
        app_should_map_to_private_workspaces: true,
        alert_summary: "none",
      },
      heartbeat: {
        emitted: false,
        summary: "skipped",
        no_material_change: true,
      },
      state_update: {
        updated: false,
        last_checked_utc: null,
        next_check_utc: null,
        baseline_pmids_added: [],
      },
    },
  ],
  privacy_boundary: {
    scheduled_runner_receives: [],
    scheduled_runner_does_not_receive: [],
    app_maps_back_to_clients: true,
  },
  persistence_status: {
    durable: true,
    store: "supabase",
    adapter: "SupabaseWatchlistStore",
    state_survives_cold_start: true,
    suitable_for_production_monitoring: true,
  },
  persistence_warning: {
    durable: true,
    reason: "persisted",
    next_step: "done",
  },
  limitations: [],
} satisfies RunDueResponse;

afterEach(() => {
  vi.clearAllMocks();
  mockFrom.mockReturnValue({
    insert: mockInsert,
  });
  mockInsert.mockReturnValue({
    select: mockSelect,
  });
  mockSelect.mockReturnValue({
    single: mockSingle,
  });
  mockCreateSupabaseServerClient.mockReturnValue({
    from: mockFrom,
  });
});

describe("watch-run-logger", () => {
  it("skips logging when dry_run is true", async () => {
    mockGetSupabaseEnvConfig.mockReturnValue({
      hasSupabaseUrl: true,
      hasSupabaseServiceRoleKey: true,
    });

    const result = await logWatchRun(
      buildRunDueWatchRunInput({
        route: "/api/watch/cron",
        trigger: "manual_authorized",
        source: "vercel_cron",
        phase: "13",
        startedAt: "2026-05-27T21:00:00.000Z",
        finishedAt: "2026-05-27T21:00:01.000Z",
        runDue: { ...sampleRunDue, dry_run: true },
      })
    );

    expect(result).toEqual({
      logged: false,
      watch_run_id: null,
      reason: "dry_run_skipped",
    });
    expect(mockCreateSupabaseServerClient).not.toHaveBeenCalled();
  });

  it("writes a successful watch_runs row when Supabase is configured", async () => {
    mockGetSupabaseEnvConfig.mockReturnValue({
      hasSupabaseUrl: true,
      hasSupabaseServiceRoleKey: true,
    });
    mockSingle.mockResolvedValue({
      data: { id: "run-uuid-123" },
      error: null,
    });

    const result = await logWatchRun(
      buildRunDueWatchRunInput({
        route: "/api/watch/cron",
        trigger: "vercel_cron",
        source: "vercel_cron",
        phase: "13",
        startedAt: "2026-05-27T21:00:00.000Z",
        finishedAt: "2026-05-27T21:00:01.000Z",
        runDue: sampleRunDue,
      })
    );

    expect(result).toEqual({
      logged: true,
      watch_run_id: "run-uuid-123",
    });
    expect(mockFrom).toHaveBeenCalledWith("watch_runs");
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        trigger: "vercel_cron",
        source: "vercel_cron",
        phase: "13",
        status: "success",
        checked_count: 0,
        skipped_count: 1,
        dry_run: false,
      })
    );
  });

  it("writes an error row for failed runs", async () => {
    mockGetSupabaseEnvConfig.mockReturnValue({
      hasSupabaseUrl: true,
      hasSupabaseServiceRoleKey: true,
    });
    mockSingle.mockResolvedValue({
      data: { id: "run-error-uuid" },
      error: null,
    });

    const result = await logWatchRunFailure({
      startedAt: "2026-05-27T21:00:00.000Z",
      finishedAt: "2026-05-27T21:00:01.000Z",
      trigger: "vercel_cron",
      source: "vercel_cron",
      phase: "13",
      route: "/api/watch/cron",
      error: new Error("PubMed check failed"),
    });

    expect(result.logged).toBe(true);
    expect(result.watch_run_id).toBe("run-error-uuid");
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "error",
        errors_count: 1,
        error_message: "PubMed check failed",
      })
    );
  });

  it("redacts secret-like content from error messages", () => {
    expect(
      sanitizeWatchRunErrorMessage(
        new Error("Unauthorized Bearer super-secret-token-value")
      )
    ).toContain("[redacted]");
  });

  it("reports when Supabase is not configured", () => {
    mockGetSupabaseEnvConfig.mockReturnValue({
      hasSupabaseUrl: false,
      hasSupabaseServiceRoleKey: false,
    });

    expect(isWatchRunLoggingConfigured()).toBe(false);
  });
});
